/**
 * /bulk (2.8.0, middleware-docs 82b): create_many, update_many, delete_many in the _svc.
 *
 * X1-2  generation per tier: the four service tiers generate the bulk API, lookup and a table without the layered
 *       TAPI are refused;
 * X1-2b compilation order: _svc spec → <t>_bulk_hks → _svc body;
 * X1-3  the combinations of 82b §3.8, alone and together.
 * X1-4 (hook order) is in test/integration/hook-order.test.ts, X1-5 (diff) in test/integration/diff.test.ts.
 */
import { describe, expect, test } from 'vitest';
import expresql from '../../src/ddl.js';
import { bulkSavepointName } from '../../src/oracle/plsql/layered/bulk.js';

function ddl(input: string): string {
    return new (expresql as any)(input).getDDL();
}

function errors(input: string): Array<{ message: string; severity: string }> {
    return new (expresql as any)(input).getErrors();
}

const TABLE = (tier: string, extra = '') => `elements /api ${tier} /bulk${extra}\n  code vc30 /nn /unique\n  name vc100\n`;

describe('X1-2 /bulk: generation per tier', () => {
    for (const tier of ['full+hks', 'full', 'service+hks', 'service']) {
        test(tier, () => {
            const out = ddl(TABLE(tier));
            const hasDal = tier.startsWith('full');
            const hasHks = tier.endsWith('+hks');
            expect(out).toContain('procedure create_many (');
            expect(out).toContain('procedure update_many (');
            expect(out).toContain('procedure delete_many (');
            expect(out).toContain('type t_tab     is table of t_rec;');
            expect(out).toContain('type t_id_tab  is table of elements.id%type;');
            // the DML: in the DAL, or absorbed into the _svc
            if (hasDal) {
                expect(out).toContain('procedure insert_rows (p_rows in out nocopy t_rows, x_errors in out nocopy t_err_tab);');
                expect(out).toContain('subtype t_row_view is elements_dal.t_rows;');
                expect(out).toContain('elements_dal.insert_rows(p_rows => l_new, x_errors => x_errors);');
            } else {
                expect(out).toContain('procedure p_insert_rows (p_rows in out nocopy t_row_view, x_errors in out nocopy t_err_tab) is');
                expect(out).toContain('type t_row_view is table of elements%rowtype index by pls_integer;');
                expect(out).toContain('p_insert_rows(p_rows => l_new, x_errors => x_errors);');
            }
            // the batch hooks: a package written by hand, or private stubs
            if (hasHks) {
                expect(out).toContain('create or replace package elements_bulk_hks as');
                expect(out).toContain('elements_bulk_hks.validate_many(p_operation => \'insert\', p_rows => l_new, x_errors => x_errors);');
                expect(out).toContain('elements_bulk_hks.after_many(p_operation => \'insert\', p_ids => x_ids);');
            } else {
                expect(out).not.toContain('elements_bulk_hks');
                expect(out).toContain('procedure p_validate_many (p_operation in varchar2, p_rows in t_row_view, x_errors in out nocopy t_err_tab) is begin null; end p_validate_many;');
                expect(out).toContain('p_after_many(p_operation => \'delete\', p_ids => p_ids);');
            }
            expect(out).toContain('forall i in 1 .. p_rows.count save exceptions');
            expect(out).not.toMatch(/\bcommit\b/);
        });
    }

    test('lookup and lookup+hks are refused (no _svc)', () => {
        expect(() => ddl(TABLE('lookup'))).toThrow(/\/bulk: elements has no service \(tier lookup\)/);
        expect(() => ddl(TABLE('lookup+hks'))).toThrow(/has no service/);
    });

    test('a table without the layered TAPI is refused', () => {
        expect(() => ddl('elements /bulk\n  code vc30\n')).toThrow(/\/bulk: elements has no layered TAPI/);
    });

    test('without /bulk nothing bulk is generated', () => {
        const out = ddl('elements /api full+hks\n  code vc30 /nn /unique\n');
        expect(out).not.toMatch(/_many|insert_rows|bulk_hks|t_row_view|forall/);
    });

    test('with row_version: update_many takes the versions and update_rows checks them per row', () => {
        const out = ddl(TABLE('full+hks', ' /rowversion'));
        expect(out).toContain('p_row_versions in  t_ver_tab,');
        expect(out).toContain('where id = p_rows(i).id and row_version = p_rows(i).row_version;');
        expect(out).toContain('l_count(i) := sql%bulk_rowcount(i);');
        expect(out).toContain("'[STALE_DATA] row modified by another session. reload and retry.'");
        // the RETURNING of the scalar insert: id and version back into the image handed to after_insert
        expect(out).toContain('returning id, row_version');
        expect(out).toContain('p_rows(i).row_version := l_ret_row_version(i);');
    });

    test('without row_version: update_many has no versions and no row-count check', () => {
        const out = ddl(TABLE('full+hks'));
        expect(out).not.toContain('t_ver_tab');
        expect(out).not.toContain('sql%bulk_rowcount');
    });

    test('the protocol is the scalar one per row, chk_rls included', () => {
        const out = ddl(TABLE('full+hks') + '# settings = { dimensioncolumns: { code: "ELEMENT" } }');
        expect(out).toMatch(/elements_hks\.validate\(p_operation => 'insert', p_row => l_new\(i\)\);\n\s*elements_hks\.chk_rls\(p_row => l_new\(i\)\);/);
        expect(out).toMatch(/elements_hks\.chk_rls\(p_row => l_old\(i\)\);/);
    });

    test('rows in place come from _rls in one query and go back to their input index', () => {
        const out = ddl(TABLE('full+hks'));
        expect(out).toContain('select * bulk collect into l_found from elements_rls');
        expect(out).toContain('where id in (select column_value from table(p_ids));');
        expect(out).toContain('x_old(l_pos(to_char(l_found(k).id))) := l_found(k);');
        expect(out).toContain("'[NOT_FOUND] elements: record not found (id=' || p_ids(i) || ')'");
        expect(out).toContain("' repeats row '");
    });

    test('a synthetic tenant: set before the FORALL and in every predicate', () => {
        const out = ddl(TABLE('full+hks') + '# settings = { tenantid: yes }');
        expect(out).toContain('l_tenant_id elements.tenant_id%type := tenant_ctx.get_id;');
        expect(out).toContain('p_rows(i).tenant_id := l_tenant_id;');
        expect(out).toContain('delete from elements where id = p_rows(i).id and tenant_id = tenant_ctx.get_id;');
        expect(out).toContain('where id in (select column_value from table(p_ids)) and tenant_id = tenant_ctx.get_id;');
    });

    test('the handler: guard before the savepoint, diagnosis saved before any SQL, original exception raised again', () => {
        const out = ddl(TABLE('full+hks'));
        const entry = out.slice(out.indexOf('    procedure create_many ('), out.indexOf('end create_many;'));
        const order = ['if g_bulk_busy then', '[BULK_REENTRANT]', 'g_bulk_busy := true;', 'savepoint sp_bulk_elements;',
            'p_create_many(', 'rollback to savepoint sp_bulk_elements;', 'x_ids := t_id_tab();', 'when others then',
            'l_code  := sqlcode;', 'l_trace := dbms_utility.format_error_backtrace;', 'g_bulk_busy := false;',
            'rollback to savepoint sp_bulk_elements;', '[BULK_ROLLBACK]', 'raise;', 'g_bulk_busy := false;',
            "if x_errors.count > 0 and p_mode = 'FAIL_FAST' then", 'p_bulk_raise(x_errors(1));'];
        let at = 0;
        for (const piece of order) {
            const next = entry.indexOf(piece, at);
            expect(next, piece).toBeGreaterThanOrEqual(at);
            at = next + piece.length;
        }
        // the same entry for the three operations: one generator
        for (const op of ['update_many', 'delete_many']) {
            const body = out.slice(out.indexOf(`    procedure ${op} (`, out.indexOf('end create_many;')), out.indexOf(`end ${op};`));
            expect(body).toContain('[BULK_REENTRANT]');
            expect(body).toContain('l_trace := dbms_utility.format_error_backtrace;');
        }
    });

    test('FORALL errors are copied from SQL%BULK_EXCEPTIONS; a unique violation is [DUPLICATE] -20010', () => {
        const out = ddl(TABLE('service'));
        expect(out).toContain('pragma exception_init(bulk_errors, -24381);');
        expect(out).toContain('l_failed(sql%bulk_exceptions(j).error_index) := sql%bulk_exceptions(j).error_code;');
        expect(out).toContain("p_bulk_error(x_errors, i, -20010, '[DUPLICATE] duplicate value on unique constraint.');");
        expect(out).toContain('p_bulk_error(x_errors, i, -l_failed(i), sqlerrm(-l_failed(i)));');
    });

    // codex-037 X1-DML-01: an exception of the FORALL must not hide the zero-row cases of the same statement
    test('ORA-24381 keeps the row counts: exceptions and zero rows unified by input index', () => {
        const out = ddl(TABLE('full', ' /rowversion'));
        const body = out.slice(out.indexOf('procedure update_rows (p_rows in out nocopy t_rows, x_errors in out nocopy t_err_tab) is'),
            out.indexOf('end update_rows;', out.indexOf('create or replace package body elements_dal')));
        const handler = body.slice(body.indexOf('when bulk_errors then'));
        // copied in the handler too, before any other SQL
        expect(handler.indexOf('sql%bulk_exceptions(j).error_code')).toBeLessThan(handler.indexOf('sql%bulk_rowcount(i)'));
        expect(handler.indexOf('sql%bulk_rowcount(i)')).toBeLessThan(handler.indexOf('select 1 into l_dummy'));
        expect(body.match(/l_count\(i\) := sql%bulk_rowcount\(i\)/g)?.length).toBe(2);
        // one loop over the input: an exception, else zero rows -- never both for one index
        expect(body).toMatch(/if l_failed\.exists\(i\) then[\s\S]*elsif l_count\(i\) = 0 then/);
        // the RETURNING goes back into the images only when no row failed
        const ins = out.slice(out.indexOf('procedure insert_rows (p_rows in out nocopy t_rows, x_errors in out nocopy t_err_tab) is'));
        expect(ins).toMatch(/if l_failed\.count = 0 then\n\s*for i in 1 \.\. p_rows\.count loop\n\s*p_rows\(i\)\.id := l_ret_id\(i\);/);
    });

    // codex-037 X1-COLLECT-01: a null or repeated id takes only its index out of the batch
    test('a bad id leaves the other indices in play', () => {
        const out = ddl(TABLE('full+hks'));
        const read = out.slice(out.indexOf('procedure p_bulk_read ('), out.indexOf('end p_bulk_read;'));
        expect(read.match(/l_bad\(i\) := true;/g)?.length).toBe(2);
        expect(read).not.toContain('if x_errors.count > 0 then return; end if;');
        expect(read).toContain("if x_errors.count > 0 and p_mode = 'FAIL_FAST' then return; end if;");
        expect(read).toContain('if not x_old.exists(i) and not l_bad.exists(i) then');
    });

    test('the scalar update_row and the bulk update_rows share the predicates and the zero-row diagnosis', () => {
        const out = ddl(TABLE('full', ' /rowversion') + '# settings = { tenantid: yes }');
        expect(out).toContain('where id = l_id\n          and tenant_id = tenant_ctx.get_id\n          and row_version = p_row.row_version;');
        expect(out).toContain('where id = p_rows(i).id and tenant_id = tenant_ctx.get_id and row_version = p_rows(i).row_version;');
        expect(out).toContain('select 1 into l_dummy from elements where id = l_id and tenant_id = tenant_ctx.get_id;');
        expect(out).toContain('select 1 into l_dummy from elements where id = p_rows(i).id and tenant_id = tenant_ctx.get_id;');
    });

    test('the savepoint name stays within 128 characters and distinct after shortening', () => {
        const a = 'x'.repeat(125) + 'a';
        const b = 'x'.repeat(125) + 'b';
        expect(bulkSavepointName('elements')).toBe('sp_bulk_elements');
        expect(bulkSavepointName(a).length).toBeLessThanOrEqual(128);
        expect(bulkSavepointName(a)).not.toBe(bulkSavepointName(b));
        expect(bulkSavepointName('app.elements')).toBe('sp_bulk_elements');
    });

    test('a virtual column is neither inserted nor updated', () => {
        const out = ddl('elements /api full+hks /bulk\n  code vc30 /nn\n  label vc40 /virtual (upper(code))\n');
        expect(out).toContain('insert into elements (code)');
        expect(out).toContain('update elements set code = p_rows(i).code');
        expect(out).not.toMatch(/insert into elements \([^)]*label/);
    });
});

// PL/SQL wants the declarations of a body (variables, exceptions, pragmas) before its first subprogram: PLS-00103
// otherwise. Found on the database by the X1 proof (job 20261111-192611).
describe('X1-2b /bulk: declarations before subprograms in every package body', () => {
    for (const tier of ['full+hks', 'full', 'service+hks', 'service']) {
        test(tier, () => {
            const out = ddl(TABLE(tier, ' /rowversion') + '# settings = { tenantid: yes }');
            const bodies = out.split(/\n\/\n/).filter(b => /create or replace package body/.test(b));
            expect(bodies.length).toBeGreaterThan(0);
            for (const body of bodies) {
                const first = body.search(/^    (procedure|function) /m);
                if (first < 0) continue;
                const late = /^    (\w+\s+(exception|boolean|pls_integer|number)\b.*;|pragma exception_init)/m.exec(body.slice(first));
                expect(late?.[0], body.slice(0, 60)).toBeUndefined();
            }
        });
    }
});

describe('X1-2b /bulk: compilation order', () => {
    test('_svc spec → <t>_bulk_hks spec → its body → _svc body', () => {
        const out = ddl(TABLE('full+hks'));
        const at = (s: string) => out.indexOf(s);
        expect(at('create or replace package elements_dal as')).toBeLessThan(at('create or replace package elements_svc as'));
        expect(at('create or replace package elements_svc as')).toBeLessThan(at('create or replace package elements_bulk_hks as'));
        expect(at('create or replace package elements_bulk_hks as')).toBeLessThan(at('create or replace package body elements_bulk_hks as'));
        expect(at('create or replace package body elements_bulk_hks as')).toBeLessThan(at('create or replace package body elements_svc as'));
        expect(out).toContain('procedure validate_many (p_operation in varchar2, p_rows in elements_svc.t_row_view, x_errors in out nocopy elements_svc.t_err_tab)');
        expect(out).toContain('-- warning: this file is generated once and must not be overwritten');
    });

    test('the drops name <t>_bulk_hks', () => {
        const out = new (expresql as any)(TABLE('full+hks') + '# settings = { "Include Drops": "yes" }').getDDL();
        expect(out).toContain('drop package elements_bulk_hks;');
    });
});

describe('X1-3 /bulk: the combinations of 82b §3.8', () => {
    const refused: Array<[string, string, RegExp]> = [
        ['/versioned', 'elements /api full+hks /bulk /versioned /businesskey code\n  code vc30 /nn\n', /is \/versioned/],
        ['/auditlog', 'elements /api full+hks /bulk /auditlog\n  code vc30\n', /has \/auditlog/],
        ['/bridge', 'roles\n  name vc30\nusers\n  name vc30\nuser_roles /api full+hks /bulk /bridge\n  user_id /fk users\n  role_id /fk roles\n', /is a \/bridge/],
        ['a detail of /aggregate', 'orders /api full+hks /aggregate\n  code vc20 /nn /unique\n  lines /api full+hks /bulk\n    qty num\n', /detail of an \/aggregate/],
        ['/soda', 'docs /api full+hks /bulk /soda\n  code vc30\n', /\/soda/],
        ['/flashback', 'docs /api full+hks /bulk /flashback\n  code vc30\n', /\/flashback/],
        ['/history', 'docs /api full+hks /bulk /history\n  code vc30\n', /\/history/],
        ['translated columns', 'docs /api full+hks /bulk\n  name vc100 /trans\n', /translated columns/],
    ];
    for (const [what, model, why] of refused) {
        test(`refused: ${what}`, () => {
            expect(() => ddl(model)).toThrow(why);
            // the editor says it before generating, from the same rules
            expect(errors(model).some(e => /^\/bulk: this table/.test(e.message) && e.severity === 'warning')).toBe(true);
        });
    }

    test('the master of an /aggregate is allowed, its details are not bulk', () => {
        const out = ddl('orders /api full+hks /aggregate /bulk\n  code vc20 /nn /unique\n  lines /api full+hks\n    qty num\n');
        expect(out).toContain('procedure create_many (');
        expect(out).toContain('create or replace package orders_bulk_hks as');
        expect(out).not.toContain('lines_bulk_hks');
    });

    test('/immutable: only create_many', () => {
        const out = ddl('events /api full+hks /bulk /immutable\n  code vc30 /nn\n');
        expect(out).toContain('procedure create_many (');
        expect(out).not.toMatch(/update_many|delete_many|update_rows|delete_rows|p_bulk_read/);
    });

    test('/immutable with a dimension column: chk_rls per row in create_many', () => {
        const out = ddl('events /api service+hks /bulk /immutable\n  site vc30 /nn\n# settings = { dimensioncolumns: { site: "SITE" } }');
        expect(out).toContain('events_hks.chk_rls(p_row => l_new(i));');
        expect(out).not.toContain('update_many');
    });

    test('the master of an /aggregate with /import: importer unchanged, bulk on the master', () => {
        const out = ddl('orders /api service+hks /aggregate /bulk /import\n  code vc20 /nn /unique\n  lines /api service+hks\n    qty num\n');
        expect(out).toContain('procedure create_many (');
        expect(out).toContain('create or replace package orders_imp');
        // the importer still writes one row at a time through create_rec
        expect(out).toMatch(/orders_svc\.create_rec\(/);
    });

    test('dimension columns and tenantid together', () => {
        const out = ddl(TABLE('full', '') + '# settings = { tenantid: yes, dimensioncolumns: { code: "ELEMENT" } }');
        expect(out).toContain('p_chk_rls(p_row => l_new(i));');
        expect(out).toContain('p_rows(i).tenant_id := l_tenant_id;');
    });

    test('no bulk operation in _app or _rst', () => {
        const out = ddl(TABLE('full+hks') + '# settings = { interface: both }');
        const app = out.slice(out.indexOf('create or replace package elements_app as'));
        expect(app).not.toMatch(/_many/);
    });

    test('the editor knows /bulk and /virtual', () => {
        expect(errors('elements /api full+hks /bulk\n  code vc30\n  label vc40 /virtual (upper(code))\n')
            .filter(e => /Unknown/.test(e.message))).toEqual([]);
    });
});
