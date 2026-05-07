/**
 * Tests for the # --- inline delimiter and the editor-text → toDiff pipeline
 * that app.js implements. The splitting logic is replicated here so it can be
 * exercised in isolation without a browser.
 */
import { describe, test, expect } from 'vitest';
import { toDiff } from '../../src/ddl.js';

// ── Replicates web/app.js DIFF_DELIMITER + splitOnDelimiter ──────────────────

const DIFF_DELIMITER = /^#\s*-{2,}\s*$/m;

function splitOnDelimiter(src: string): { v1: string; v2: string } | null {
    const m = DIFF_DELIMITER.exec(src);
    if (!m) return null;
    return { v1: src.slice(0, m.index), v2: src.slice(m.index + m[0].length) };
}

function diffFromEditorText(src: string) {
    const parts = splitOnDelimiter(src);
    if (!parts) return null;
    return toDiff(parts.v1, parts.v2);
}

// ── Regex matching ────────────────────────────────────────────────────────────

describe('DIFF_DELIMITER regex variants', () => {
    const matches = [
        '#--',
        '# --',
        '# ---',
        '#---',
        '#----',
        '# ----',
        '#  ---',
        '# --  ',   // trailing spaces ok
        '#\t--',
        '# ----------',
    ];

    for (const v of matches) {
        test(`matches "${v}"`, () => {
            expect(DIFF_DELIMITER.test(v)).toBe(true);
        });
    }

    const nonMatches = [
        '# --- v2',           // text after dashes — not a pure separator
        '#-',                 // only 1 dash
        '# -',
        '# settings = { pk: seq }',
        '# just a comment',
        'prefix # ---',       // leading text
        '--',                 // SQL comment, no #
    ];

    for (const v of nonMatches) {
        test(`does not match "${v}"`, () => {
            expect(DIFF_DELIMITER.test(v)).toBe(false);
        });
    }
});

// ── Split logic ───────────────────────────────────────────────────────────────

describe('splitOnDelimiter', () => {
    test('no delimiter → returns null', () => {
        expect(splitOnDelimiter('employees\n  name vc100')).toBeNull();
    });

    test('empty string → returns null', () => {
        expect(splitOnDelimiter('')).toBeNull();
    });

    test('standard split — v1 before, v2 after', () => {
        const src = 'employees\n  name vc100\n\n# ---\n\nemployees\n  name vc100 /nn';
        const parts = splitOnDelimiter(src);
        expect(parts).not.toBeNull();
        expect(parts!.v1).toContain('employees');
        expect(parts!.v1).not.toContain('/nn');
        expect(parts!.v2).toContain('/nn');
    });

    test('only first delimiter splits — second one goes into v2', () => {
        const src = 'v1_stuff\n\n# ---\n\nv2_stuff\n\n# ---\n\nstill_v2';
        const parts = splitOnDelimiter(src);
        expect(parts!.v2).toContain('still_v2');
        expect(parts!.v2).toContain('# ---');
        expect(parts!.v1).not.toContain('still_v2');
    });

    test('delimiter at start → v1 is empty', () => {
        const src = '# ---\n\nemployees\n  name vc100';
        const parts = splitOnDelimiter(src);
        expect(parts!.v1.trim()).toBe('');
        expect(parts!.v2).toContain('employees');
    });

    test('delimiter at end → v2 is empty', () => {
        const src = 'employees\n  name vc100\n\n# ---';
        const parts = splitOnDelimiter(src);
        expect(parts!.v1).toContain('employees');
        expect(parts!.v2.trim()).toBe('');
    });

    test('settings in v1 stay in v1, settings in v2 stay in v2', () => {
        const src = `employees\n  name vc100\n# settings = {"prefix": "old_"}\n\n# ---\n\nemployees\n  name vc100\n# settings = {"prefix": "new_"}`;
        const parts = splitOnDelimiter(src);
        expect(parts!.v1).toContain('old_');
        expect(parts!.v1).not.toContain('new_');
        expect(parts!.v2).toContain('new_');
        expect(parts!.v2).not.toContain('old_');
    });
});

// ── End-to-end pipeline ───────────────────────────────────────────────────────

describe('diffFromEditorText — end-to-end', () => {
    test('no delimiter → returns null (normal DDL mode)', () => {
        const src = 'employees\n  name vc100 /nn\n  email vc200';
        expect(diffFromEditorText(src)).toBeNull();
    });

    test('add column — produces add_column statement', () => {
        const src = `employees
   name vc100 /nn
   email vc200

# ---

employees
   name vc100 /nn
   email vc200
   phone vc50`;
        const r = diffFromEditorText(src);
        expect(r).not.toBeNull();
        expect(r!.statements.some(s => s.kind === 'add_column' && s.sql.includes('phone'))).toBe(true);
    });

    test('add NOT NULL — produces manual intervention step', () => {
        const src = `employees
   name vc100 /nn
   email vc200

# ---

employees
   name vc100 /nn
   email vc200 /nn`;
        const r = diffFromEditorText(src);
        expect(r!.summary.statementsRequiringIntervention).toBe(1);
        expect(r!.warnings.some(w => w.level === 'DESTRUCTIVE')).toBe(true);
    });

    test('add new table — produces create_table', () => {
        const src = `employees
   name vc100 /nn

# ---

employees
   name vc100 /nn

departments
   dept_name vc100 /nn`;
        const r = diffFromEditorText(src);
        expect(r!.statements.some(s => s.kind === 'create_table' && s.table === 'departments')).toBe(true);
        expect(r!.summary.tablesAdded).toBe(1);
    });

    test('v1 empty (delimiter at start) — pure CREATE migration', () => {
        const src = `# ---

employees
   name vc100 /nn
   email vc200`;
        const r = diffFromEditorText(src);
        expect(r!.statements.some(s => s.kind === 'create_table')).toBe(true);
        expect(r!.summary.tablesAdded).toBe(1);
        expect(r!.warnings).toHaveLength(0);
    });

    test('v2 empty (delimiter at end) — pure DROP with DESTRUCTIVE warnings', () => {
        const src = `employees
   name vc100 /nn
   email vc200

# ---`;
        const r = diffFromEditorText(src);
        expect(r!.statements.some(s => s.kind === 'drop_table')).toBe(true);
        expect(r!.warnings.some(w => w.level === 'DESTRUCTIVE')).toBe(true);
    });

    test('settings in v2 part are applied — prefix on new tables', () => {
        const src = `employees
   name vc100

# ---

employees
   name vc100
departments
   dept_name vc100

# settings = {"prefix": "hr_"}`;
        const r = diffFromEditorText(src);
        const create = r!.statements.find(s => s.kind === 'create_table');
        expect(create?.sql).toContain('hr_departments');
    });

    test('any number of dashes works — #-- and #---- both split', () => {
        for (const delim of ['#--', '# ---', '#----', '# ----------']) {
            const src = `employees\n   name vc100\n\n${delim}\n\nemployees\n   name vc100\n   phone vc50`;
            const r = diffFromEditorText(src);
            expect(r).not.toBeNull();
            expect(r!.statements.some(s => s.kind === 'add_column')).toBe(true);
        }
    });

    test('second delimiter in v2 does not split again — treated as v2 content', () => {
        const src = `employees
   name vc100

# ---

employees
   name vc100
   phone vc50

# ---

departments
   dept_name vc100`;
        // The "departments" block comes after the second # ---,
        // which is inside v2 → treated as a regular QSQL comment line → ignored by parser
        const r = diffFromEditorText(src);
        // employees diff still works
        expect(r!.statements.some(s => s.kind === 'add_column' && s.sql.includes('phone'))).toBe(true);
    });

    test('identical schemas via delimiter — no statements, no warnings', () => {
        const schema = `employees\n   name vc100 /nn\n   email vc200`;
        const src = `${schema}\n\n# ---\n\n${schema}`;
        const r = diffFromEditorText(src);
        expect(r!.statements).toHaveLength(0);
        expect(r!.warnings).toHaveLength(0);
    });
});
