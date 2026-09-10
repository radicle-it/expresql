/**
 * Tests for the `dimensioncolumns` setting and the `chk_rbac`/`chk_rls` HKS hooks.
 *
 * `dimensioncolumns` is a map of column name → dimension type (e.g.
 * `{ company_id: "COMPANY" }`), generalizing row-level scope beyond the existing
 * `tenantid` mechanism for the case where scope is membership in a set derived
 * from role/group (`sec_my_scope`) rather than equality to a single
 * session-bound value. Unlike `tenantid`, these columns are never synthesized —
 * they must already exist on the table (typically an explicit `/fk` column) —
 * this only detects which of a table's own columns are configured to carry
 * row-level scope, and wires the generated TAPI accordingly:
 *
 *  1. `chk_rbac(p_operation, p_row)` is generated ALWAYS, on every table,
 *     empty by default (`begin null; end;`) — a human fills it in with a
 *     real permission check only when curated for that table/operation.
 *  2. `chk_rls(p_row)` is generated ONLY when the table has at least one
 *     column configured in `dimensioncolumns` — absent otherwise, never an
 *     empty stub.
 *  3. `_svc` (or the absorbed private-hook form on tiers without `_svc`/`_hks`)
 *     calls `chk_rbac` then `chk_rls` (when present) before `validate`, for
 *     insert/update/delete (and close, for `/versioned` tables) — same
 *     ordering for every operation, on every tier.
 *  4. A table with at least one configured dimension column also gets a
 *     `<table>_rls` view (`select * from sec_pkg.secured_by_dimension(<table>)`)
 *     — the same view any APEX region/report would read from. Read paths
 *     (`get_by_id`, `lock_by_id`, `get_all`, `get_by_<unique>`, in `_dal` or
 *     the absorbed private DML on tiers without `_dal`) select FROM THAT VIEW
 *     instead of the base table, rather than re-deriving their own WHERE-
 *     clause filter: one filter, defined once, shared by every reader — an
 *     out-of-scope row never leaves the read path, same NO_DATA_FOUND path as
 *     a genuinely missing id.
 *  5. Write paths do NOT read from or filter through the view (unlike
 *     tenantid): the explicit `chk_rls` check stays authoritative, raising
 *     rather than silently affecting 0 rows.
 *  6. `validate('delete', ...)` fires on every table (previously never
 *     called from `delete_rec` at all) — independent of `dimensioncolumns`,
 *     see tapi-layered.test.ts for that coverage.
 *
 * Model: main commits c7e6c9b (chk_rbac/chk_rls, DAL/HKS/SVC-always world)
 * and 2c42616 (unify read-side filtering into the <table>_rls view — a real
 * duplication removed: the WHERE-clause text this generator built
 * independently had to keep re-deriving the same filter any project's own
 * secured_by_dimension-style macro already computes). tapi-ext's tier
 * system — an independent evolution main never had at either commit —
 * degrades the same mechanism the same way every other hook already does:
 * `p_chk_rbac`/`p_chk_rls` absorbed as private procedures when `_hks` is
 * absent, called directly by whichever package sits above it (`_svc`, or
 * `_app`/`_rst` on the `lookup` tier); the `_rls` view itself, and the read-
 * path redirection to it, is tier-independent — emitted once regardless of
 * whether `_dal` exists, since the absorbed private DML needs it exactly as
 * much as `_dal` does. Covered separately below, not in the model.
 */

import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

function ddl(qsql: string): string {
    return toDDL(qsql).toLowerCase();
}

function segment(out: string, startMarker: string, endMarker: string): string {
    const start = out.indexOf(startMarker);
    if (start === -1) return '';
    const end = out.indexOf(endMarker, start);
    return end === -1 ? out.slice(start) : out.slice(start, end + endMarker.length);
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

// ── 4. Read paths — WHERE-clause scope filter, write paths — none (explicit check instead) ──

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

    test('emitted once, ahead of every other layered package for that table', () => {
        const out = ddl(SCOPED_QSQL);
        const idxView = out.indexOf('create or replace view widgets_rls');
        const idxDal  = out.indexOf('create or replace package widgets_dal');
        expect(idxView).toBeGreaterThan(-1);
        expect(idxView).toBeLessThan(idxDal);
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

// ── 5. Multiple dimension columns on the same table ────────────────────────

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
        expect(out.match(/create or replace view projects_rls/g)?.length).toBe(1);
    });

    test('get_by_id reads from the single projects_rls view', () => {
        const out = ddl(qsql);
        const dalBody = segment(out, 'create or replace package body projects_dal', 'end projects_dal;');
        const fn = segment(dalBody, 'function get_by_id', 'end get_by_id;');
        expect(fn).toContain('select * into l_row from projects_rls where id = p_id;');
    });
});

// ── 6. Degraded tiers — absorbed p_chk_rbac/p_chk_rls, not in the model ────
// tapi-ext's own extension: the same principle applied to tiers without _hks (and, for
// lookup, without _svc either) — main never had this dimension since it predates the tier
// system entirely.

describe('service tier (no DAL, no HKS): SVC absorbs p_chk_rbac/p_chk_rls', () => {
    const qsql = `
companies /api
  name vc200 /nn

widgets /api service
  company_id /fk companies /nn
  name       vc200 /nn

# settings = { dimensioncolumns: { company_id: "COMPANY" } }`;

    test('p_chk_rbac always absorbed; p_chk_rls absorbed only because company_id is configured', () => {
        const out = ddl(qsql);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        expect(svcBody).toContain('procedure p_chk_rbac (p_operation in varchar2, p_row in widgets%rowtype) is begin null; end p_chk_rbac;');
        expect(svcBody).toContain('procedure p_chk_rls (p_row in widgets%rowtype) is');
        expect(svcBody).toContain("sec_pkg.require_dimension_scope(p_dimension_type => 'company', p_code => to_char(p_row.company_id));");
    });

    test('p_do_create calls p_chk_rbac then p_chk_rls then p_validate, no _hks reference', () => {
        const out = ddl(qsql);
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        const doCreate = segment(svcBody, 'procedure p_do_create', 'end p_do_create;');
        const idxRbac     = doCreate.indexOf('p_chk_rbac(');
        const idxRls      = doCreate.indexOf('p_chk_rls(');
        const idxValidate = doCreate.indexOf('p_validate(');
        expect(idxRbac).toBeGreaterThan(-1);
        expect(idxRbac).toBeLessThan(idxRls);
        expect(idxRls).toBeLessThan(idxValidate);
        expect(doCreate).not.toContain('widgets_hks');
    });

    test('absorbed p_get_by_id/p_get_all read from widgets_rls, same as _dal would', () => {
        const out = ddl(qsql);
        expect(out).toContain('create or replace view widgets_rls as\nselect * from sec_pkg.secured_by_dimension(widgets);');
        const svcBody = segment(out, 'create or replace package body widgets_svc', 'end widgets_svc;');
        const pGetById = segment(svcBody, 'function p_get_by_id', 'end p_get_by_id;');
        expect(pGetById).toContain('select * into l_row from widgets_rls where id = p_id;');
        const pGetAll = segment(svcBody, 'function p_get_all', 'end p_get_all;');
        expect(pGetAll).toContain('open l_cur for select * from widgets_rls;');
    });
});

describe('lookup tier (no DAL, no HKS, no SVC): _app absorbs p_chk_rbac/p_chk_rls directly', () => {
    const qsql = `
companies /api
  name vc200 /nn

widgets /api lookup
  company_id /fk companies /nn
  name       vc200 /nn

# settings = { dimensioncolumns: { company_id: "COMPANY" } }`;

    test('_app body declares and calls p_chk_rbac/p_chk_rls for insert, no _svc/_hks reference', () => {
        const out = ddl(qsql);
        const appBody = segment(out, 'create or replace package body widgets_app', 'end widgets_app;');
        expect(appBody).toContain('procedure p_chk_rbac');
        expect(appBody).toContain('procedure p_chk_rls');
        const insProc = segment(appBody, 'procedure ins (', 'end ins;');
        expect(insProc).toContain('p_chk_rbac(');
        expect(insProc).toContain('p_chk_rls(');
        expect(insProc.indexOf('p_chk_rbac(')).toBeLessThan(insProc.indexOf('p_validate('));
        expect(insProc).not.toContain('widgets_svc');
        expect(insProc).not.toContain('widgets_hks');
    });

    test('del fetches the row and calls p_chk_rbac/p_chk_rls/p_validate before deleting', () => {
        const out = ddl(qsql);
        const appBody = segment(out, 'create or replace package body widgets_app', 'end widgets_app;');
        const delProc = segment(appBody, 'procedure del (', 'end del;');
        expect(delProc).toContain('l_row := p_get_by_id(p_id => p_id);');
        expect(delProc.indexOf('p_chk_rbac(')).toBeLessThan(delProc.indexOf('p_validate('));
        expect(delProc.indexOf('p_validate(')).toBeLessThan(delProc.indexOf('p_delete_row('));
    });

    test('absorbed p_get_by_id (called from del/get) reads from widgets_rls, and the view precedes _app', () => {
        const out = ddl(qsql);
        const idxView = out.indexOf('create or replace view widgets_rls');
        const idxApp  = out.indexOf('create or replace package widgets_app');
        expect(idxView).toBeGreaterThan(-1);
        expect(idxView).toBeLessThan(idxApp);
        const appBody = segment(out, 'create or replace package body widgets_app', 'end widgets_app;');
        const pGetById = segment(appBody, 'function p_get_by_id', 'end p_get_by_id;');
        expect(pGetById).toContain('select * into l_row from widgets_rls where id = p_id;');
    });
});
