/**
 * Tests for the `dimensioncolumns` setting and the `chk_rbac`/`chk_rls` HKS hooks.
 *
 * `dimensioncolumns` is a map of column name → dimension type (e.g.
 * `{ company_id: "COMPANY" }`). Unlike `tenantid`, these columns are never
 * synthesized — they must already exist on the table (typically an explicit
 * `/fk` column) — this only detects which of a table's own columns are
 * configured to carry row-level scope, and wires the generated TAPI
 * accordingly:
 *
 *  1. `chk_rbac(p_operation, p_row)` is generated ALWAYS, on every table,
 *     empty by default (`begin null; end;`) — a human fills it in with a
 *     real permission check only when curated for that table/operation.
 *  2. `chk_rls(p_row)` is generated ONLY when the table has at least one
 *     column configured in `dimensioncolumns` — absent otherwise, never an
 *     empty stub.
 *  3. `_svc` calls `chk_rbac` then `chk_rls` (when present) before
 *     `validate`, for insert/update/delete (and close, for /versioned
 *     tables) — same ordering for every operation.
 *  4. A table with at least one configured dimension column also gets a
 *     `<table>_rls` view (`select * from sec_pkg.secured_by_dimension(<table>)`)
 *     — the same view any APEX region/report would read from. Read paths
 *     (`get_by_id`, `lock_by_id`, `get_all`, `get_by_<unique>`) select FROM
 *     THAT VIEW instead of the base table, rather than re-deriving their own
 *     WHERE-clause filter: one filter, defined once, shared by every reader
 *     — an out-of-scope row never leaves the DAL, same NO_DATA_FOUND path as
 *     a genuinely missing id.
 *  5. Write paths do NOT read from or filter through the view (unlike
 *     tenantid): the explicit `chk_rls` check stays authoritative, raising
 *     rather than silently affecting 0 rows — matching this project's own
 *     already verified RLS behavior for company-scope writes.
 *  6. `validate('delete', ...)` now fires on every table (previously never
 *     called from delete_rec at all) — independent of dimensioncolumns.
 */

import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

function ddl(qsql: string): string {
    return toDDL(qsql).toLowerCase();
}

function segment(out: string, startMarker: string, endMarker: string): string {
    const start = out.indexOf(startMarker);
    const end   = out.indexOf(endMarker, start) + endMarker.length;
    return out.substring(start, end);
}

const SCOPED_QSQL = `
companies /api
  name vc200 /nn

widgets /api
  company_id /fk companies /nn
  name       vc200 /nn

# settings = { api: "layered", dimensioncolumns: { company_id: "COMPANY" } }`;

const UNSCOPED_QSQL = `
widgets /api
  name vc200 /nn

# settings = { api: "layered" }`;

// ── 1. chk_rbac — always generated, regardless of dimensioncolumns ─────────

describe('chk_rbac — always generated', () => {
    test('present on a table with no dimensioncolumns at all', () => {
        const out = ddl(UNSCOPED_QSQL);
        const hksBody = segment(out, 'create or replace package body widgets_hks', 'end widgets_hks;');
        expect(hksBody).toContain('procedure chk_rbac (');
        expect(hksBody).toContain(') is begin null; end chk_rbac;');
    });

    test('present, still empty, on a table that IS dimension-scoped', () => {
        const out = ddl(SCOPED_QSQL);
        const hksBody = segment(out, 'create or replace package body widgets_hks', 'end widgets_hks;');
        expect(hksBody).toContain('procedure chk_rbac (');
        expect(hksBody).toContain(') is begin null; end chk_rbac;');
    });

    test('spec declares chk_rbac with p_operation and p_row (in, not in out)', () => {
        const out = ddl(UNSCOPED_QSQL);
        const hksSpec = segment(out, 'create or replace package widgets_hks', 'end widgets_hks;');
        expect(hksSpec).toContain('procedure chk_rbac (');
        expect(hksSpec).toContain('p_operation in varchar2');
        expect(hksSpec).toContain('p_row       in widgets%rowtype');
    });
});

// ── 2. chk_rls — only when a configured dimension column is present ────────

describe('chk_rls — conditional on dimensioncolumns', () => {
    test('absent entirely when no dimension column is configured', () => {
        const out = ddl(UNSCOPED_QSQL);
        expect(out).not.toContain('chk_rls');
    });

    test('absent for companies itself (dimensioncolumns configured, but this table has no company_id column)', () => {
        const out = ddl(SCOPED_QSQL);
        const hksBody = segment(out, 'create or replace package body companies_hks', 'end companies_hks;');
        expect(hksBody).not.toContain('chk_rls');
    });

    test('present for widgets (has company_id, matching dimensioncolumns)', () => {
        const out = ddl(SCOPED_QSQL);
        const hksBody = segment(out, 'create or replace package body widgets_hks', 'end widgets_hks;');
        expect(hksBody).toContain('procedure chk_rls (p_row in widgets%rowtype) is');
        expect(hksBody).toContain(
            "sec_pkg.require_dimension_scope(p_dimension_type => 'company', p_code => to_char(p_row.company_id));"
        );
    });
});

// ── 3. _svc call ordering — chk_rbac, chk_rls, then validate ───────────────

describe('_svc — chk_rbac/chk_rls precede validate, for every operation', () => {
    test('insert (p_do_create)', () => {
        const out = ddl(SCOPED_QSQL);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        const idxRbac     = svcBody.indexOf("widgets_hks.chk_rbac(p_operation => 'insert'");
        const idxRls      = svcBody.indexOf('widgets_hks.chk_rls(p_row => l_row)');
        const idxValidate = svcBody.indexOf("widgets_hks.validate(p_operation => 'insert'");
        expect(idxRbac).toBeGreaterThan(-1);
        expect(idxRls).toBeGreaterThan(-1);
        expect(idxValidate).toBeGreaterThan(-1);
        expect(idxRbac).toBeLessThan(idxRls);
        expect(idxRls).toBeLessThan(idxValidate);
    });

    test('update', () => {
        const out = ddl(SCOPED_QSQL);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        const idxRbac     = svcBody.indexOf("widgets_hks.chk_rbac(p_operation => 'update'");
        const idxValidate = svcBody.indexOf("widgets_hks.validate(p_operation => 'update'");
        expect(idxRbac).toBeGreaterThan(-1);
        expect(idxRbac).toBeLessThan(idxValidate);
    });

    test('delete', () => {
        const out = ddl(SCOPED_QSQL);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        const idxRbac     = svcBody.indexOf("widgets_hks.chk_rbac(p_operation => 'delete'");
        const idxValidate = svcBody.indexOf("widgets_hks.validate(p_operation => 'delete'");
        const idxBefore   = svcBody.indexOf('widgets_hks.before_delete(p_id => p_id)');
        expect(idxRbac).toBeGreaterThan(-1);
        expect(idxRbac).toBeLessThan(idxValidate);
        expect(idxValidate).toBeLessThan(idxBefore);
    });

    test('no chk_rls call at all for a table without a configured dimension column', () => {
        const out = ddl(UNSCOPED_QSQL);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        expect(svcBody).not.toContain('chk_rls');
        expect(svcBody).toContain('widgets_hks.chk_rbac(');
    });
});

// ── 4. delete_rec fetches the row unconditionally, validate('delete', ...) now fires ──

describe('delete_rec — always fetches the row; validate(\'delete\') now fires (independent of dimensioncolumns)', () => {
    test('on an unscoped table too', () => {
        const out = ddl(UNSCOPED_QSQL);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        const deleteRec = segment(svcBody, 'procedure delete_rec', 'end delete_rec;');
        expect(deleteRec).toContain('l_row widgets%rowtype;');
        expect(deleteRec).toContain('l_row := widgets_dal.get_by_id(p_id => p_id);');
        expect(deleteRec).toContain("widgets_hks.validate(p_operation => 'delete', p_row => l_row);");
        const idxFetch    = deleteRec.indexOf('l_row := widgets_dal.get_by_id');
        const idxValidate = deleteRec.indexOf("validate(p_operation => 'delete'");
        const idxDelete   = deleteRec.indexOf('widgets_dal.delete_row');
        expect(idxFetch).toBeLessThan(idxValidate);
        expect(idxValidate).toBeLessThan(idxDelete);
    });
});

// ── 5. Dimension-scope view + read paths select from it; write paths do not ──

describe('<table>_rls view generated for a dimension-scoped table', () => {
    test('view created for widgets (has company_id, matching dimensioncolumns)', () => {
        const out = ddl(SCOPED_QSQL);
        expect(out).toContain('create or replace view widgets_rls as\nselect * from sec_pkg.secured_by_dimension(widgets);');
    });

    test('NOT created for companies itself (dimensioncolumns configured, but no matching column on this table)', () => {
        const out = ddl(SCOPED_QSQL);
        expect(out).not.toContain('view companies_rls');
    });

    test('NOT created at all when no dimension column is configured', () => {
        const out = ddl(UNSCOPED_QSQL);
        expect(out).not.toContain('_rls');
    });
});

describe('read paths select from <table>_rls; write paths do not', () => {
    const out = ddl(SCOPED_QSQL);

    test('get_by_id', () => {
        const dalBody = segment(out, 'create or replace package body widgets_dal', 'end widgets_dal;');
        const fn = segment(dalBody, 'function get_by_id', 'end get_by_id;');
        expect(fn).toContain('select * into l_row from widgets_rls where id = p_id;');
    });

    test('lock_by_id', () => {
        const dalBody = segment(out, 'create or replace package body widgets_dal', 'end widgets_dal;');
        const fn = segment(dalBody, 'function lock_by_id', 'end lock_by_id;');
        expect(fn).toContain('from   widgets_rls\n');
        expect(fn).toContain('where  id = p_id\n');
    });

    test('get_all', () => {
        const dalBody = segment(out, 'create or replace package body widgets_dal', 'end widgets_dal;');
        const fn = segment(dalBody, 'function get_all', 'end get_all;');
        expect(fn).toContain('open l_cur for select * from widgets_rls;');
    });

    test('unscoped table reads straight from the base table, no _rls involved', () => {
        const unscoped = ddl(UNSCOPED_QSQL);
        const dalBody = segment(unscoped, 'create or replace package body widgets_dal', 'end widgets_dal;');
        const fn = segment(dalBody, 'function get_by_id', 'end get_by_id;');
        expect(fn).toContain('select * into l_row from widgets where id = p_id;');
    });

    test('insert_row/update_row/delete_row do NOT read from _rls or reference sec_my_scope (chk_rls stays authoritative)', () => {
        const dalBody = segment(out, 'create or replace package body widgets_dal', 'end widgets_dal;');
        const insertRow = segment(dalBody, 'procedure insert_row', 'end insert_row;');
        const updateRow = segment(dalBody, 'procedure update_row', 'end update_row;');
        const deleteRow = segment(dalBody, 'procedure delete_row', 'end delete_row;');
        expect(insertRow).not.toContain('sec_my_scope');
        expect(insertRow).not.toContain('widgets_rls');
        expect(updateRow).not.toContain('sec_my_scope');
        expect(updateRow).not.toContain('widgets_rls');
        expect(deleteRow).not.toContain('sec_my_scope');
        expect(deleteRow).not.toContain('widgets_rls');
    });
});

// ── 6. Multiple dimension columns on the same table ────────────────────────

describe('a table with more than one configured dimension column', () => {
    const qsql = `
companies /api
  name vc200 /nn

regions /api
  name vc100 /nn

projects /api
  company_id /fk companies /nn
  region_id  /fk regions   /nn
  name       vc200 /nn

# settings = { api: "layered", dimensioncolumns: { company_id: "COMPANY", region_id: "REGION" } }`;

    test('chk_rls checks both dimensions', () => {
        const out = ddl(qsql);
        const hksBody = segment(out, 'create or replace package body projects_hks', 'end projects_hks;');
        expect(hksBody).toContain("require_dimension_scope(p_dimension_type => 'company', p_code => to_char(p_row.company_id))");
        expect(hksBody).toContain("require_dimension_scope(p_dimension_type => 'region', p_code => to_char(p_row.region_id))");
    });

    test('a single _rls view covers both dimensions — secured_by_dimension itself does the per-column introspection at the DB side, not ExpreSQL', () => {
        const out = ddl(qsql);
        expect(out).toContain('create or replace view projects_rls as\nselect * from sec_pkg.secured_by_dimension(projects);');
        // only ONE view for projects — ExpreSQL never emits a per-dimension predicate here
        expect(out.match(/create or replace view projects_rls/g)?.length).toBe(1);
    });

    test('get_by_id reads from the single projects_rls view', () => {
        const out = ddl(qsql);
        const dalBody = segment(out, 'create or replace package body projects_dal', 'end projects_dal;');
        const fn = segment(dalBody, 'function get_by_id', 'end get_by_id;');
        expect(fn).toContain('select * into l_row from projects_rls where id = p_id;');
    });
});
