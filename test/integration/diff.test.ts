/**
 * Integration tests for toDiff() — Oracle diff/migration generator (EX-10).
 * All assertions are string/structure-based; no Oracle runtime required.
 */
import { describe, test, expect } from 'vitest';
import { toDiff } from '../../src/ddl.js';
import type { DiffResult } from '../../src/ddl.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function diff(oldQsql: string, newQsql: string, opts?: Record<string, unknown>): DiffResult {
    return toDiff(oldQsql, newQsql, opts);
}

function kindSeq(r: DiffResult) {
    return r.statements.map(s => s.kind);
}

function sqlAll(r: DiffResult) {
    return r.statements.map(s => s.sql).join('\n');
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE = `\
employees
  name vc100 /nn
  email vc200`;

const BASE_LAYERED = `\
employees /api
  name vc100 /nn
  email vc200
# settings = {"api": "layered"}`;

// ── Identity (no changes) ─────────────────────────────────────────────────────

describe('identity', () => {
    test('identical old and new produces no statements and no warnings', () => {
        const r = diff(BASE, BASE);
        expect(r.statements).toHaveLength(0);
        expect(r.warnings).toHaveLength(0);
        expect(r.summary.statementsRequiringIntervention).toBe(0);
    });
});

// ── Add column ────────────────────────────────────────────────────────────────

describe('add column', () => {
    test('add nullable column — single add_column statement, no warnings', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc200\n  phone vc50`;
        const r = diff(BASE, newQsql);
        const adds = r.statements.filter(s => s.kind === 'add_column');
        expect(adds).toHaveLength(1);
        expect(adds[0].sql).toContain('alter table employees add');
        expect(adds[0].sql).toContain('phone');
        expect(adds[0].requiresManualIntervention).toBe(false);
        expect(r.warnings).toHaveLength(0);
    });

    test('add NOT NULL column — three steps, step 2 is manual intervention', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc200\n  phone vc50 /nn`;
        const r = diff(BASE, newQsql);
        const rmiStmts = r.statements.filter(s => s.requiresManualIntervention);
        expect(rmiStmts).toHaveLength(1);
        expect(rmiStmts[0].sql).toContain('-- ⚠ MANUAL INTERVENTION REQUIRED');
        expect(rmiStmts[0].sql).not.toMatch(/^alter /m); // must be a comment, not runnable DDL
        expect(r.summary.statementsRequiringIntervention).toBe(1);
        // Should also have the ADD (nullable) and MODIFY NOT NULL
        const adds = r.statements.filter(s => s.kind === 'add_column' && !s.requiresManualIntervention);
        expect(adds.some(s => s.sql.includes('phone'))).toBe(true);
        const mods = r.statements.filter(s => s.kind === 'modify_column' && s.sql.includes('not null'));
        expect(mods.some(s => s.sql.includes('phone'))).toBe(true);
    });
});

// ── Drop column ───────────────────────────────────────────────────────────────

describe('drop column', () => {
    test('drop column — set_unused + drop_unused_columns + DESTRUCTIVE warning', () => {
        const newQsql = `employees\n  name vc100 /nn`;
        const r = diff(BASE, newQsql);
        expect(r.statements.some(s => s.kind === 'set_unused' && s.sql.includes('email'))).toBe(true);
        expect(r.statements.some(s => s.kind === 'drop_unused_columns')).toBe(true);
        expect(r.warnings.some(w => w.level === 'DESTRUCTIVE' && w.message.includes('column dropped'))).toBe(true);
    });
});

// ── Modify column ─────────────────────────────────────────────────────────────

describe('modify column', () => {
    test('size increase — MODIFY present, no LOSSY warning', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc500`;
        const r = diff(BASE, newQsql);
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('email'))).toBe(true);
        expect(r.warnings.some(w => w.level === 'LOSSY')).toBe(false);
    });

    test('size decrease — MODIFY present, LOSSY warning', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc50`;
        const r = diff(BASE, newQsql);
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('email'))).toBe(true);
        expect(r.warnings.some(w => w.level === 'LOSSY')).toBe(true);
    });

    test('nullable → NOT NULL — MODIFY + DESTRUCTIVE + requiresManualIntervention', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc200 /nn`;
        const r = diff(BASE, newQsql);
        const rmiStmts = r.statements.filter(s => s.requiresManualIntervention);
        expect(rmiStmts).toHaveLength(1);
        expect(rmiStmts[0].sql).toContain('-- ⚠ MANUAL INTERVENTION REQUIRED');
        expect(r.warnings.some(w => w.level === 'DESTRUCTIVE' && w.requiresManualIntervention)).toBe(true);
    });

    test('NOT NULL → nullable — MODIFY NULL, no warning', () => {
        const base = `employees\n  name vc100 /nn\n  email vc200 /nn`;
        const newQsql = `employees\n  name vc100 /nn\n  email vc200`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('null'))).toBe(true);
        expect(r.warnings).toHaveLength(0);
    });

    test('base type change — MODIFY + LOSSY warning', () => {
        const base    = `employees\n  name vc100 /nn\n  code vc20`;
        const newQsql = `employees\n  name vc100 /nn\n  code num`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'modify_column')).toBe(true);
        expect(r.warnings.some(w => w.level === 'LOSSY')).toBe(true);
    });

    test('type + nullability change combined into single MODIFY statement', () => {
        const base    = `employees\n  name vc100 /nn\n  code vc20`;
        const newQsql = `employees\n  name vc100 /nn\n  code vc50 /nn`;
        const r = diff(base, newQsql);
        // The modify should combine both changes; step 2 is the rmi comment
        const modStmts = r.statements.filter(s => s.kind === 'modify_column');
        expect(modStmts).toHaveLength(1);
        expect(modStmts[0].requiresManualIntervention).toBe(true);
    });
});

// ── Rename detection ──────────────────────────────────────────────────────────

describe('rename detection', () => {
    test('unambiguous rename — rename_hint emitted, no SET UNUSED / ADD DDL, INFO warning', () => {
        const base    = `employees\n  name vc100 /nn\n  old_email vc200`;
        const newQsql = `employees\n  name vc100 /nn\n  new_email vc200`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'rename_hint')).toBe(true);
        expect(r.statements.some(s => s.kind === 'set_unused' && s.sql.includes('old_email'))).toBe(false);
        expect(r.statements.some(s => s.kind === 'add_column' && s.sql.includes('new_email'))).toBe(false);
        expect(r.warnings.some(w => w.level === 'INFO')).toBe(true);
        // rename_hint sql should contain the RENAME COLUMN statement
        const hint = r.statements.find(s => s.kind === 'rename_hint')!;
        expect(hint.sql).toContain('rename column');
    });

    test('same base type but different size — NOT a rename, DROP+ADD + DESTRUCTIVE', () => {
        const base    = `employees\n  name vc100 /nn\n  old_email vc200`;
        const newQsql = `employees\n  name vc100 /nn\n  new_email vc500`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'rename_hint')).toBe(false);
        expect(r.statements.some(s => s.kind === 'set_unused')).toBe(true);
        expect(r.statements.some(s => s.kind === 'add_column')).toBe(true);
        expect(r.warnings.some(w => w.level === 'DESTRUCTIVE')).toBe(true);
    });

    test('ambiguous rename — normal DROP+ADD emitted, DESTRUCTIVE warning', () => {
        const base    = `employees\n  name vc100 /nn\n  col_a vc200\n  col_b vc200`;
        const newQsql = `employees\n  name vc100 /nn\n  col_x vc200\n  col_y vc200`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'set_unused')).toBe(true);
        expect(r.statements.some(s => s.kind === 'add_column')).toBe(true);
        expect(r.warnings.some(w => w.level === 'DESTRUCTIVE')).toBe(true);
        // No rename hint
        expect(r.statements.some(s => s.kind === 'rename_hint')).toBe(false);
    });
});

// ── Add / drop table ──────────────────────────────────────────────────────────

describe('add table', () => {
    test('new table — create_table statement present', () => {
        const newQsql = `${BASE}\n\ndepartments\n  dept_name vc100`;
        const r = diff(BASE, newQsql);
        expect(r.statements.some(s => s.kind === 'create_table' && s.table === 'departments')).toBe(true);
        expect(r.summary.tablesAdded).toBe(1);
    });
});

describe('drop table', () => {
    test('dropped table — drop_table statement + DESTRUCTIVE warning', () => {
        const base    = `${BASE}\n\ndepartments\n  dept_name vc100`;
        const newQsql = BASE;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'drop_table' && s.table === 'departments')).toBe(true);
        expect(r.warnings.some(w => w.level === 'DESTRUCTIVE' && w.message.includes('departments'))).toBe(true);
        expect(r.summary.tablesDropped).toBe(1);
    });
});

// ── Add / drop FK ─────────────────────────────────────────────────────────────

describe('FK changes', () => {
    test('add FK — add_column + add_fk with idempotency wrapper', () => {
        const base = `\
departments
  dept_name vc100

employees
  name vc100 /nn`;
        const newQsql = `\
departments
  dept_name vc100

employees
  name vc100 /nn
  dept_id /fk departments`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'add_fk')).toBe(true);
        const fkStmt = r.statements.find(s => s.kind === 'add_fk')!;
        expect(fkStmt.sql).toContain('_fk');
    });

    test('drop FK — drop_fk before set_unused (ordering)', () => {
        const base = `\
departments
  dept_name vc100

employees
  name vc100 /nn
  dept_id /fk departments`;
        const newQsql = `\
departments
  dept_name vc100

employees
  name vc100 /nn`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'drop_fk')).toBe(true);
        const dropFkIdx    = r.statements.findIndex(s => s.kind === 'drop_fk');
        const setUnusedIdx = r.statements.findIndex(s => s.kind === 'set_unused');
        expect(dropFkIdx).toBeGreaterThanOrEqual(0);
        expect(setUnusedIdx).toBeGreaterThanOrEqual(0);
        expect(dropFkIdx).toBeLessThan(setUnusedIdx);
    });
});

// ── Index changes ─────────────────────────────────────────────────────────────

describe('index changes', () => {
    test('add /idx — add_index statement with idempotency wrapper', () => {
        const base    = `employees\n  name vc100 /nn\n  email vc200`;
        const newQsql = `employees\n  name vc100 /nn\n  email vc200 /idx`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'add_index')).toBe(true);
        const idx = r.statements.find(s => s.kind === 'add_index')!;
        // Idempotency wrapper (< 23c default)
        expect(idx.sql).toContain('execute immediate');
    });

    test('add /idx — 23c uses IF NOT EXISTS without wrapper', () => {
        const db23 = '\n# settings = {"db": "23c"}';
        const base    = `employees\n  name vc100 /nn\n  email vc200${db23}`;
        const newQsql = `employees\n  name vc100 /nn\n  email vc200 /idx${db23}`;
        const r = diff(base, newQsql);
        const idx = r.statements.find(s => s.kind === 'add_index')!;
        expect(idx.sql).toContain('if not exists');
        expect(idx.sql).not.toContain('execute immediate');
    });

    test('drop /idx — drop_index statement', () => {
        const base    = `employees\n  name vc100 /nn\n  email vc200 /idx`;
        const newQsql = `employees\n  name vc100 /nn\n  email vc200`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'drop_index')).toBe(true);
    });
});

// ── Layered TAPI changes ──────────────────────────────────────────────────────

describe('layered TAPI', () => {
    test('add /api layered — five CREATE OR REPLACE packages (specs + bodies)', () => {
        const base    = `employees\n  name vc100 /nn`;
        const newQsql = `employees /api\n  name vc100 /nn\n# settings = {"api": "layered"}`;
        const r = diff(base, newQsql);
        const pkgs = r.statements.filter(s => s.kind === 'create_package');
        // Should have specs and bodies
        const specs  = pkgs.filter(s => !s.sql.toLowerCase().includes('package body'));
        const bodies = pkgs.filter(s =>  s.sql.toLowerCase().includes('package body'));
        expect(specs.length).toBeGreaterThan(0);
        expect(bodies.length).toBeGreaterThan(0);
    });

    test('remove /api layered — DROP PACKAGE for each layered package', () => {
        const base    = `employees /api\n  name vc100 /nn\n# settings = {"api": "layered"}`;
        const newQsql = `employees\n  name vc100 /nn`;
        const r = diff(base, newQsql);
        const drops = r.statements.filter(s => s.kind === 'drop_package');
        expect(drops.length).toBeGreaterThanOrEqual(4); // at least _dal _hks _svc _apx
    });

    test('column change on layered table — CREATE OR REPLACE all packages, no DROP', () => {
        const base    = `employees /api\n  name vc100 /nn\n  email vc200\n# settings = {"api": "layered"}`;
        const newQsql = `employees /api\n  name vc100 /nn\n  email vc500\n# settings = {"api": "layered"}`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'drop_package')).toBe(false);
        expect(r.statements.some(s => s.kind === 'create_package')).toBe(true);
    });

    test('package replacement has no DROP when package exists in both old and new', () => {
        // Same QSQL: packages unchanged — no create_package emitted at all
        const r = diff(BASE_LAYERED, BASE_LAYERED);
        expect(r.statements.some(s => s.kind === 'drop_package')).toBe(false);
        expect(r.statements.some(s => s.kind === 'create_package')).toBe(false);
    });
});

// ── View changes ──────────────────────────────────────────────────────────────

describe('view changes', () => {
    test('view content changed — CREATE OR REPLACE VIEW emitted', () => {
        const base    = `employees\n  name vc100\ndepartments\n  dept_name vc100\nview emp_v employees`;
        const newQsql = `employees\n  name vc100\ndepartments\n  dept_name vc100\nview emp_v employees departments`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'create_view')).toBe(true);
    });

    test('view removed — drop_view emitted', () => {
        const base    = `employees\n  name vc100\nview emp_v employees name`;
        const newQsql = `employees\n  name vc100`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'drop_view')).toBe(true);
    });
});

// ── Ordering invariants ───────────────────────────────────────────────────────

describe('ordering', () => {
    test('drop_fk before set_unused', () => {
        const base = `\
departments
  dept_name vc100

employees
  name vc100
  dept_id /fk departments`;
        const newQsql = `\
departments
  dept_name vc100

employees
  name vc100`;
        const r = diff(base, newQsql);
        const idxDropFk  = r.statements.findIndex(s => s.kind === 'drop_fk');
        const idxUnused  = r.statements.findIndex(s => s.kind === 'set_unused');
        expect(idxDropFk).toBeGreaterThanOrEqual(0);
        expect(idxUnused).toBeGreaterThanOrEqual(0);
        expect(idxDropFk).toBeLessThan(idxUnused);
    });

    test('create_package specs before create_view', () => {
        const base    = `employees /api\n  name vc100\n# settings = {"api": "layered"}`;
        const newQsql = `employees /api\n  name vc100\n  email vc200\nview emp_v employees\n# settings = {"api": "layered"}`;
        const r = diff(base, newQsql);
        const specIdx = r.statements.findIndex(
            s => s.kind === 'create_package' && !s.sql.toLowerCase().includes('package body'));
        const viewIdx = r.statements.findIndex(s => s.kind === 'create_view');
        if (specIdx >= 0 && viewIdx >= 0)
            expect(specIdx).toBeLessThan(viewIdx);
    });

    test('create_view before create_package bodies', () => {
        const base    = `employees /api\n  name vc100\n# settings = {"api": "layered"}`;
        const newQsql = `employees /api\n  name vc100\n  email vc200\nview emp_v employees\n# settings = {"api": "layered"}`;
        const r = diff(base, newQsql);
        const viewIdx = r.statements.findIndex(s => s.kind === 'create_view');
        const bodyIdx = r.statements.findIndex(
            s => s.kind === 'create_package' && s.sql.toLowerCase().includes('package body'));
        if (viewIdx >= 0 && bodyIdx >= 0)
            expect(viewIdx).toBeLessThan(bodyIdx);
    });

    test('children before parents on DROP (reverse topo)', () => {
        const base = `\
departments
  dept_name vc100

employees
  name vc100
  departments`;
        // Drop both
        const r = diff(base, '');
        const drops = r.statements.filter(s => s.kind === 'drop_table');
        const empIdx  = drops.findIndex(s => s.table === 'employees');
        const deptIdx = drops.findIndex(s => s.table === 'departments');
        if (empIdx >= 0 && deptIdx >= 0)
            expect(empIdx).toBeLessThan(deptIdx);
    });
});

// ── 23c syntax ────────────────────────────────────────────────────────────────

describe('db 23c', () => {
    test('drop table uses IF EXISTS in 23c', () => {
        const db23    = '\n# settings = {"db": "23c"}';
        const base    = `${BASE}\n\ndepartments\n  dept_name vc100${db23}`;
        const newQsql = `${BASE}${db23}`;
        const r = diff(base, newQsql);
        const drop = r.statements.find(s => s.kind === 'drop_table' && s.table === 'departments');
        expect(drop?.sql).toContain('if exists');
    });

    test('drop package uses IF EXISTS in 23c', () => {
        const base    = `employees /api\n  name vc100 /nn\n# settings = {"api": "layered", "db": "23c"}`;
        const newQsql = `employees\n  name vc100 /nn\n# settings = {"db": "23c"}`;
        const r = diff(base, newQsql);
        const drop = r.statements.find(s => s.kind === 'drop_package');
        expect(drop?.sql).toContain('if exists');
    });
});

// ── Preamble ──────────────────────────────────────────────────────────────────

describe('preamble', () => {
    test('preamble present for any non-empty diff', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc200\n  phone vc50`;
        const r = diff(BASE, newQsql);
        expect(r.sql).toContain('QuickSQL Migration Script');
        expect(r.sql).toContain('Generated :');
    });

    test('MANUAL STEPS block present when statementsRequiringIntervention > 0', () => {
        const newQsql = `employees\n  name vc100 /nn\n  email vc200\n  phone vc50 /nn`;
        const r = diff(BASE, newQsql);
        expect(r.sql).toContain('⚠ MANUAL STEPS REQUIRED');
    });

    test('POSSIBLE RENAMES block present when rename_hint warning exists', () => {
        const base    = `employees\n  name vc100 /nn\n  old_email vc200`;
        const newQsql = `employees\n  name vc100 /nn\n  new_email vc200`;
        const r = diff(base, newQsql);
        expect(r.sql).toContain('⚠ POSSIBLE RENAMES');
    });

    test('DESTRUCTIVE OPERATIONS block present when tables/columns dropped', () => {
        const newQsql = `employees\n  name vc100 /nn`;
        const r = diff(BASE, newQsql);
        expect(r.sql).toContain('⚠ DESTRUCTIVE OPERATIONS');
    });
});

// ── Summary ───────────────────────────────────────────────────────────────────

describe('summary', () => {
    test('summary correctly counts tables added / dropped', () => {
        const base    = `${BASE}\n\ndepartments\n  dept_name vc100`;
        const newQsql = `${BASE}\n\nprojects\n  proj_name vc100`;
        const r = diff(base, newQsql);
        expect(r.summary.tablesAdded).toBe(1);
        expect(r.summary.tablesDropped).toBe(1);
    });
});

// ── Empty schemas ─────────────────────────────────────────────────────────────

describe('empty schemas', () => {
    test('empty → schema: pure CREATE, no warnings', () => {
        const r = diff('', 'employees\n  name vc100 /nn\n  email vc200');
        expect(r.statements.some(s => s.kind === 'create_table')).toBe(true);
        expect(r.warnings).toHaveLength(0);
        expect(r.summary.tablesAdded).toBe(1);
        expect(r.summary.tablesDropped).toBe(0);
    });

    test('schema → empty: pure DROP, DESTRUCTIVE warning for every table', () => {
        const base = `employees\n  name vc100\n\ndepartments\n  dept_name vc100`;
        const r = diff(base, '');
        expect(r.statements.filter(s => s.kind === 'drop_table')).toHaveLength(2);
        expect(r.warnings.every(w => w.level === 'DESTRUCTIVE')).toBe(true);
        expect(r.summary.tablesDropped).toBe(2);
    });

    test('both empty: no statements, no warnings', () => {
        const r = diff('', '');
        expect(r.statements).toHaveLength(0);
        expect(r.warnings).toHaveLength(0);
    });
});

// ── Unique constraint ─────────────────────────────────────────────────────────

describe('unique constraint', () => {
    test('add /unique — generates add_index with UNIQUE', () => {
        const base    = `employees\n  name vc100 /nn\n  email vc200`;
        const newQsql = `employees\n  name vc100 /nn\n  email vc200 /unique`;
        const r = diff(base, newQsql);
        const idx = r.statements.find(s => s.kind === 'add_index');
        expect(idx).toBeDefined();
        expect(idx!.sql.toLowerCase()).toContain('unique');
    });

    test('remove /unique — generates drop_index', () => {
        const base    = `employees\n  name vc100 /nn\n  email vc200 /unique`;
        const newQsql = `employees\n  name vc100 /nn\n  email vc200`;
        const r = diff(base, newQsql);
        expect(r.statements.some(s => s.kind === 'drop_index')).toBe(true);
    });
});

// ── Settings propagation ──────────────────────────────────────────────────────

describe('settings propagation', () => {
    test('prefix in v2 settings applied to new CREATE TABLE', () => {
        const v1 = `employees\n  name vc100`;
        const v2 = `employees\n  name vc100\ndepartments\n  dept_name vc100\n# settings = {"prefix": "hr_"}`;
        const r = diff(v1, v2);
        const create = r.statements.find(s => s.kind === 'create_table' && s.table === 'departments');
        expect(create).toBeDefined();
        expect(create!.sql).toContain('hr_departments');
    });

    test('prefix applied to FK reference in CREATE TABLE of a new table', () => {
        const settings = '\n# settings = {"prefix": "app_"}';
        const v1 = `departments\n  dept_name vc100${settings}`;
        const v2 = `departments\n  dept_name vc100\nemployees\n  name vc100\n  dept_id /fk departments${settings}`;
        const r = diff(v1, v2);
        // FK for a new table is embedded in CREATE TABLE, not a separate add_fk
        const create = r.statements.find(s => s.kind === 'create_table' && s.table === 'employees');
        expect(create).toBeDefined();
        expect(create!.sql).toContain('app_departments');
    });
});

// ── Parent-child hierarchy ────────────────────────────────────────────────────

describe('parent-child hierarchy', () => {
    test('adding table with explicit FK — create_table contains REFERENCES', () => {
        const v1 = `departments\n  dept_name vc100 /nn`;
        const v2 = `departments\n  dept_name vc100 /nn\nemployees\n  name vc100 /nn\n  dept_id /fk departments`;
        const r = diff(v1, v2);
        expect(r.statements.some(s => s.kind === 'create_table' && s.table === 'employees')).toBe(true);
        const create = r.statements.find(s => s.kind === 'create_table' && s.table === 'employees');
        expect(create!.sql.toLowerCase()).toContain('references');
    });

    test('removing table with FK — drop_table + DESTRUCTIVE warning', () => {
        const v1 = `departments\n  dept_name vc100 /nn\nemployees\n  name vc100 /nn\n  dept_id /fk departments`;
        const v2 = `departments\n  dept_name vc100 /nn`;
        const r = diff(v1, v2);
        expect(r.statements.some(s => s.kind === 'drop_table' && s.table === 'employees')).toBe(true);
        expect(r.warnings.some(w => w.level === 'DESTRUCTIVE' && w.table === 'employees')).toBe(true);
    });
});

// ── Multi-table realistic scenario ────────────────────────────────────────────

describe('realistic scenario', () => {
    test('e-commerce v1→v2: add table, add column, NOT NULL on existing column', () => {
        const v1 = `\
customers
  name vc100 /nn
  email vc200

orders
  total num(10,2)`;

        const v2 = `\
customers
  name vc100 /nn
  email vc200 /nn
  phone vc50

orders
  total num(10,2) /nn

products
  name vc100 /nn
  price num(10,2) /nn`;

        const r = diff(v1, v2);

        // New table
        expect(r.statements.some(s => s.kind === 'create_table' && s.table === 'products')).toBe(true);
        // New column on customers
        expect(r.statements.some(s => s.kind === 'add_column' && s.table === 'customers' && s.sql.includes('phone'))).toBe(true);
        // NOT NULL on email and total → 2 manual intervention steps
        expect(r.summary.statementsRequiringIntervention).toBe(2);
        // DESTRUCTIVE warnings for both NOT NULL additions
        expect(r.warnings.filter(w => w.level === 'DESTRUCTIVE')).toHaveLength(2);
        // Summary
        expect(r.summary.tablesAdded).toBe(1);
        expect(r.summary.tablesModified).toBe(2);
    });
});

// ── Check / between constraints ───────────────────────────────────────────────

describe('check / between constraints', () => {
    test('add /check on existing column — generates ADD CONSTRAINT', () => {
        const r = diff('orders\n   status vc10\n', 'orders\n   status vc10 /check OPEN,CLOSED\n');
        const s = r.statements.find(s => s.kind === 'modify_column' && s.sql.includes('add constraint'));
        expect(s).toBeDefined();
        expect(s!.sql).toContain("check (status in ('OPEN','CLOSED'))");
        expect(s!.sql).toContain('orders_status_ck');
    });

    test('change /check values — drop old + add new constraint', () => {
        const r = diff(
            'orders\n   status vc10 /check OPEN,CLOSED\n',
            'orders\n   status vc10 /check OPEN,CLOSED,PENDING\n',
        );
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('drop constraint'))).toBe(true);
        const add = r.statements.find(s => s.kind === 'modify_column' && s.sql.includes('add constraint'));
        expect(add!.sql).toContain("'OPEN','CLOSED','PENDING'");
    });

    test('remove /check — generates DROP CONSTRAINT', () => {
        const r = diff('orders\n   status vc10 /check OPEN,CLOSED\n', 'orders\n   status vc10\n');
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('drop constraint orders_status_ck'))).toBe(true);
    });

    test('add /between on existing column — generates ADD CONSTRAINT', () => {
        const r = diff('orders\n   qty num\n', 'orders\n   qty num /between 1 and 100\n');
        const s = r.statements.find(s => s.kind === 'modify_column' && s.sql.includes('add constraint'));
        expect(s).toBeDefined();
        expect(s!.sql).toContain('between 1 and 100');
        expect(s!.sql).toContain('orders_qty_bet');
    });

    test('new column with /check includes ADD CONSTRAINT', () => {
        const r = diff('orders\n   qty num\n', 'orders\n   qty num\n   status vc10 /check OPEN,CLOSED\n');
        const add = r.statements.find(s => s.kind === 'add_column' && s.sql.includes('add constraint'));
        expect(add).toBeDefined();
        expect(add!.sql).toContain("check (status in ('OPEN','CLOSED'))");
    });
});

// ── Indexes on new columns ────────────────────────────────────────────────────

describe('indexes on new columns', () => {
    test('new column with /unique generates add_index with prefix', () => {
        const v1 = 'employees\n   name vc100 /nn\n';
        const v2 = 'employees\n   name vc100 /nn\n   surname vc100 /unique\n# settings = { prefix: "a01" }\n';
        const r = diff(v1, v2);
        const idx = r.statements.find(s => s.kind === 'add_index');
        expect(idx).toBeDefined();
        expect(idx!.sql).toContain('a01_employees_surname_unq');
        expect(idx!.sql.toLowerCase()).toContain('unique');
    });

    test('new column with /idx generates add_index', () => {
        const r = diff('orders\n   qty num\n', 'orders\n   qty num\n   code vc20 /idx\n');
        const idx = r.statements.find(s => s.kind === 'add_index');
        expect(idx).toBeDefined();
        expect(idx!.sql).toContain('orders_code_i');
    });

    test('new column with /default includes DEFAULT ON NULL in ADD', () => {
        const r = diff('t\n   a vc10\n', 't\n   a vc10\n   b vc10 /default X\n');
        const add = r.statements.find(s => s.kind === 'add_column' && s.sql.includes('add (b'));
        expect(add!.sql).toContain("default on null 'X'");
    });

    test('new column /default /nn — populate step uses known default value', () => {
        const r = diff('t\n   a vc10\n', 't\n   a vc10\n   b vc10 /default X /nn\n');
        const manual = r.statements.find(s => s.requiresManualIntervention && s.column === 'b');
        expect(manual!.sql).toContain("set b = 'X'");
        expect(manual!.sql).not.toContain('???');
    });

    test('new column with /hidden includes INVISIBLE in ADD', () => {
        const r = diff('t\n   a vc10\n', 't\n   a vc10\n   b vc10 /hidden\n');
        const add = r.statements.find(s => s.kind === 'add_column' && s.sql.includes('add (b'));
        expect(add!.sql).toContain('invisible');
    });
});

// ── Default / hidden ──────────────────────────────────────────────────────────

describe('default / hidden', () => {
    test('add /default on existing column — generates MODIFY DEFAULT', () => {
        const r = diff('orders\n   status vc10\n', 'orders\n   status vc10 /default ACTIVE\n');
        const s = r.statements.find(s => s.kind === 'modify_column' && s.sql.includes('default on null'));
        expect(s).toBeDefined();
        expect(s!.sql).toContain("default on null 'ACTIVE'");
    });

    test('remove /default — generates MODIFY DEFAULT NULL', () => {
        const r = diff('orders\n   status vc10 /default ACTIVE\n', 'orders\n   status vc10\n');
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('default null'))).toBe(true);
    });

    test('add /hidden on existing column — generates MODIFY INVISIBLE', () => {
        const r = diff('employees\n   name vc100\n', 'employees\n   name vc100 /hidden\n');
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('invisible'))).toBe(true);
    });

    test('remove /hidden — generates MODIFY VISIBLE', () => {
        const r = diff('employees\n   name vc100 /hidden\n', 'employees\n   name vc100\n');
        expect(r.statements.some(s => s.kind === 'modify_column' && s.sql.includes('visible'))).toBe(true);
    });
});

// ── Triggers (lower / upper / rowversion) ─────────────────────────────────────

describe('triggers', () => {
    test('add /lower on existing column — creates BI and BU triggers', () => {
        const r = diff('employees\n   email vc255\n', 'employees\n   email vc255 /lower\n');
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('employees_bi'))).toBe(true);
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('employees_bu'))).toBe(true);
    });

    test('remove /lower — drops triggers', () => {
        const r = diff('employees\n   email vc255 /lower\n', 'employees\n   email vc255\n');
        expect(r.statements.some(s => s.kind === 'drop_trigger' && s.sql.includes('employees_bi'))).toBe(true);
        expect(r.statements.some(s => s.kind === 'drop_trigger' && s.sql.includes('employees_bu'))).toBe(true);
    });

    test('add /rowversion — creates triggers + manual column intervention', () => {
        const r = diff('employees\n   name vc100\n', 'employees /rowversion\n   name vc100\n');
        expect(r.statements.some(s => s.kind === 'add_column' && s.requiresManualIntervention && s.sql.includes('row_version'))).toBe(true);
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('row_version := 1'))).toBe(true);
        expect(r.warnings.some(w => w.level === 'INFO' && w.column === 'row_version')).toBe(true);
    });

    test('remove /rowversion — drops triggers + sets column unused', () => {
        const r = diff('employees /rowversion\n   name vc100\n', 'employees\n   name vc100\n');
        expect(r.statements.some(s => s.kind === 'set_unused' && s.column === 'row_version')).toBe(true);
        expect(r.statements.some(s => s.kind === 'drop_trigger')).toBe(true);
    });

    test('new table with /rowversion — creates table AND triggers', () => {
        const r = diff('', 'employees /rowversion\n   name vc100\n');
        expect(r.statements.some(s => s.kind === 'create_table' && s.table === 'employees')).toBe(true);
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('employees_bi'))).toBe(true);
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('employees_bu'))).toBe(true);
    });

    test('new table with /lower column — creates table AND triggers', () => {
        const r = diff('', 'employees\n   email vc255 /lower\n');
        expect(r.statements.some(s => s.kind === 'create_table' && s.table === 'employees')).toBe(true);
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('employees_bi'))).toBe(true);
        expect(r.statements.some(s => s.kind === 'create_trigger' && s.sql.includes('employees_bu'))).toBe(true);
    });
});

// ── Nested tables ────────────────────────────────────────────────────────────

describe('nested tables', () => {
    const oldNested =
        'departments /insert 2\n' +
        '   country\n' +
        '   employees /insert 4\n' +
        '      name /nn vc50\n' +
        '      date hired\n' +
        '      job vc255\n';
    const newNested =
        'departments /insert 2\n' +
        '   country\n' +
        '   employees /insert 4\n' +
        '      name /nn vc50\n' +
        '      pippo num\n';

    test('add column in nested table — detected as add_column', () => {
        const r = diff(oldNested, newNested);
        expect(r.statements.some(s => s.kind === 'add_column' && s.table === 'employees' && s.column === 'pippo')).toBe(true);
    });

    test('drop columns in nested table — detected as set_unused or drop', () => {
        const r = diff(oldNested, newNested);
        expect(r.statements.some(s => s.table === 'employees' && (s.kind === 'set_unused' || s.kind === 'modify_column') && s.column === 'date_hired')).toBe(true);
        expect(r.statements.some(s => s.table === 'employees' && (s.kind === 'set_unused' || s.kind === 'modify_column') && s.column === 'job')).toBe(true);
    });

    test('unchanged parent table columns produce no statements for departments', () => {
        const r = diff(oldNested, newNested);
        expect(r.statements.some(s => s.table === 'departments' && s.kind === 'add_column')).toBe(false);
        expect(r.statements.some(s => s.table === 'departments' && s.kind === 'set_unused')).toBe(false);
    });
});

// ── Table-level composite unique ─────────────────────────────────────────────

describe('table-level composite unique', () => {
    test('add table-level /unique — generates ADD CONSTRAINT UK', () => {
        const old = 'employees\n   name vc100 /nn\n   surname vc100\n';
        const nw  = 'employees /unique name,surname\n   name vc100 /nn\n   surname vc100\n';
        const r = diff(old, nw);
        const s = r.statements.find(s => s.kind === 'add_index');
        expect(s).toBeDefined();
        expect(s!.sql).toContain('employees_uk');
        expect(s!.sql.toLowerCase()).toContain('unique');
        expect(s!.sql).toContain('name');
        expect(s!.sql).toContain('surname');
    });

    test('column-level /unique → table-level composite /unique with prefix', () => {
        const old = 'employees\n   name vc100 /nn /unique\n# settings = { prefix: "a01" }\n';
        const nw  = 'employees /unique name,surname\n   name vc100 /nn\n   surname vc100\n# settings = { prefix: "a01" }\n';
        const r = diff(old, nw);
        // Old column-level unique index dropped
        expect(r.statements.some(s => s.kind === 'drop_index' && s.sql.includes('a01_employees_name_unq'))).toBe(true);
        // New table-level UK constraint added
        const add = r.statements.find(s => s.kind === 'add_index' && s.sql.includes('a01_employees_uk'));
        expect(add).toBeDefined();
        expect(add!.sql).toContain('name');
        expect(add!.sql).toContain('surname');
    });

    test('remove table-level /unique — generates DROP CONSTRAINT', () => {
        const old = 'employees /unique name,surname\n   name vc100 /nn\n   surname vc100\n';
        const nw  = 'employees\n   name vc100 /nn\n   surname vc100\n';
        const r = diff(old, nw);
        expect(r.statements.some(s => s.kind === 'drop_index' && s.sql.includes('employees_uk'))).toBe(true);
    });

    test('change columns in table-level /unique — DROP + re-create', () => {
        const old = 'employees /unique name,email\n   name vc100 /nn\n   email vc200\n';
        const nw  = 'employees /unique name,surname\n   name vc100 /nn\n   email vc200\n   surname vc100\n';
        const r = diff(old, nw);
        expect(r.statements.some(s => s.kind === 'drop_index' && s.sql.includes('employees_uk'))).toBe(true);
        const add = r.statements.find(s => s.kind === 'add_index' && s.sql.includes('employees_uk'));
        expect(add).toBeDefined();
        expect(add!.sql).toContain('surname');
    });

    test('identical table-level /unique — no statements emitted', () => {
        const q = 'employees /unique name,surname\n   name vc100 /nn\n   surname vc100\n';
        const r = diff(q, q);
        expect(r.statements).toHaveLength(0);
    });
});

// ── PK changes ────────────────────────────────────────────────────────────────

describe('PK changes', () => {
    test('7.1 — identical surrogate PK emits no PK statements', () => {
        const r = diff('orders\n   amount num\n', 'orders\n   amount num\n');
        expect(r.statements.every(s => s.kind !== 'add_fk')).toBe(true);
        expect(r.warnings.every(w => !w.message.includes('Primary key change'))).toBe(true);
    });

    test('7.2 — identical composite PK emits no PK statements', () => {
        const old = 'keys /pk a, b\n   a vc10 /nn\n   b vc10 /nn\n';
        const r = diff(old, old);
        expect(r.statements).toHaveLength(0);
        expect(r.warnings).toHaveLength(0);
    });

    test('7.3 — surrogate → single business PK: DESTRUCTIVE warning + manual steps', () => {
        const old = 'orders\n   amount num\n';
        const nw  = 'orders\n   order_no vc20 /pk /nn\n   amount num\n';
        const r = diff(old, nw);
        // DESTRUCTIVE warning about PK change
        expect(r.warnings.some(w =>
            w.level === 'DESTRUCTIVE' && w.message.includes('Primary key change')
        )).toBe(true);
        // Manual ADD new PK constraint
        const addPk = r.statements.find(s => s.kind === 'add_fk' && s.requiresManualIntervention);
        expect(addPk).toBeDefined();
        expect(addPk!.sql).toContain('orders_order_no_pk');
        expect(addPk!.sql).toContain('primary key (order_no)');
        // Automatic SET UNUSED for old surrogate id
        expect(r.statements.some(s => s.kind === 'set_unused' && s.column === 'id')).toBe(true);
        // Manual DROP old PK
        expect(r.statements.some(s =>
            s.requiresManualIntervention && s.sql.includes('drop constraint') && s.sql.includes('orders_pk')
        )).toBe(true);
    });

    test('7.4 — surrogate → composite business PK: manual steps for both new columns', () => {
        const old = 'order_lines\n   product_id\n';
        const nw  = 'order_lines /pk order_no, line_no\n   order_no vc20 /nn\n   line_no num /nn\n   product_id\n';
        const r = diff(old, nw);
        expect(r.warnings.some(w =>
            w.level === 'DESTRUCTIVE' && w.message.includes('Primary key change')
        )).toBe(true);
        // Manual composite PK add
        const addPk = r.statements.find(s => s.kind === 'add_fk' && s.requiresManualIntervention);
        expect(addPk).toBeDefined();
        expect(addPk!.sql).toContain('order_lines_pk');
        expect(addPk!.sql).toContain('primary key (order_no, line_no)');
        // Surrogate id is set unused
        expect(r.statements.some(s => s.kind === 'set_unused' && s.column === 'id')).toBe(true);
    });

    test('7.5 — add column to composite PK: DROP + re-create with manual steps', () => {
        const old = 'keys /pk a, b\n   a vc10 /nn\n   b vc10 /nn\n';
        const nw  = 'keys /pk a, b, c\n   a vc10 /nn\n   b vc10 /nn\n   c vc10 /nn\n';
        const r = diff(old, nw);
        // Manual DROP old composite PK
        expect(r.statements.some(s =>
            s.requiresManualIntervention && s.sql.includes('drop constraint') && s.sql.includes('keys_pk')
        )).toBe(true);
        // Manual ADD new composite PK with 3 columns
        const addPk = r.statements.find(s => s.kind === 'add_fk' && s.requiresManualIntervention);
        expect(addPk).toBeDefined();
        expect(addPk!.sql).toContain('primary key (a, b, c)');
    });

    test('7.6 — remove column from composite PK: DROP + re-create, no column drop', () => {
        const old = 'keys /pk a, b\n   a vc10 /nn\n   b vc10 /nn\n';
        const nw  = 'keys /pk a\n   a vc10 /nn\n   b vc10 /nn\n';
        const r = diff(old, nw);
        // Manual DROP old composite PK
        expect(r.statements.some(s =>
            s.requiresManualIntervention && s.sql.includes('drop constraint') && s.sql.includes('keys_pk')
        )).toBe(true);
        // Manual ADD new single-col PK
        const addPk = r.statements.find(s => s.kind === 'add_fk' && s.requiresManualIntervention);
        expect(addPk).toBeDefined();
        expect(addPk!.sql).toContain('primary key (a)');
        // Column b is NOT dropped (stays in table)
        expect(r.statements.every(s => !(s.kind === 'set_unused' && s.column === 'b'))).toBe(true);
    });

    test('7.7 — reorder composite PK columns: DROP + re-create', () => {
        const old = 'keys /pk a, b\n   a vc10 /nn\n   b vc10 /nn\n';
        const nw  = 'keys /pk b, a\n   a vc10 /nn\n   b vc10 /nn\n';
        const r = diff(old, nw);
        expect(r.warnings.some(w => w.message.includes('Primary key change'))).toBe(true);
        const addPk = r.statements.find(s => s.kind === 'add_fk' && s.requiresManualIntervention);
        expect(addPk).toBeDefined();
        expect(addPk!.sql).toContain('primary key (b, a)');
    });

    test('7.9 — genpk:no then add composite PK: only ADD constraint, no SET UNUSED', () => {
        const old = '# settings = {genpk:no}\nkeys\n   a vc10 /nn\n   b vc10 /nn\n';
        const nw  = 'keys /pk a, b\n   a vc10 /nn\n   b vc10 /nn\n';
        const r = diff(old, nw);
        // ADD constraint manual step present
        const addPk = r.statements.find(s => s.kind === 'add_fk' && s.requiresManualIntervention);
        expect(addPk).toBeDefined();
        expect(addPk!.sql).toContain('primary key (a, b)');
        // No surrogate column drop (there was no surrogate)
        expect(r.statements.every(s => s.kind !== 'set_unused')).toBe(true);
    });

    test('7.10 — composite PK same columns, only nullability change: no PK statements', () => {
        const old = 'keys /pk a, b\n   a vc10\n   b vc10\n';
        const nw  = 'keys /pk a, b\n   a vc10 /nn\n   b vc10 /nn\n';
        const r = diff(old, nw);
        // No PK constraint change
        expect(r.statements.every(s => !(s.kind === 'add_fk' && s.sql.includes('primary key')))).toBe(true);
        // But nullability changes are emitted
        expect(r.statements.some(s => s.kind === 'modify_column' || s.requiresManualIntervention)).toBe(true);
    });
});
