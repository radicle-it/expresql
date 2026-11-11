import { tab } from '../../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer, writableColumns, type OracleTableApiModel } from '../table-model.js';
import { bulkRefusal } from './bulk-rules.js';
import { renderStaleOrNotFound, rowPredicates } from './dal.js';
import { renderRecordAssignments } from './rendering.js';
import {
    createHookNameResolver,
    renderAfterOperation,
    renderBeforeOperation,
    type OracleOperation,
} from './operation-hooks.js';

/**
 * /bulk (2.8.0, middleware-docs 82b): create_many, update_many and delete_many in the _svc.
 *
 * A bulk call keeps the scalar contract of every row -- chk_rbac, before_<op>, validate and chk_rls run per row, the
 * after hooks per row after the write -- and changes only the DML, one FORALL per batch instead of one statement per
 * row. Around it: validate_many (read only, invariants across rows) and after_many in <t>_bulk_hks, one savepoint per
 * call, a guard against a second bulk call on the same table while one runs, FAIL_FAST or COLLECT.
 *
 *     acquire the guard → savepoint → input checks → rows in place (update, delete) → per row: the scalar protocol
 *     → validate_many → FORALL ... SAVE EXCEPTIONS → per row: after_<op> → after_many
 *
 * A row error (one with an input index) rolls the batch back and, in COLLECT, returns normally with x_errors; in
 * FAIL_FAST it raises the first one. Any other error rolls back and propagates in both modes: never a normal return
 * after a rollback with an empty x_errors.
 */

export const BULK_ERRORS = {
    input:      -20005,
    reentrant:  -20006,
    row:        -20007,
    rollback:   -20008,
} as const;

type BulkMode = 'absorbed' | 'package';

/** Re-indents a rendered block by `extra` tabs (the hook protocol renders at two). */
function indent(block: string, extra: number): string {
    const pad = tab.repeat(extra);
    return block.split('\n').map(line => line === '' ? line : pad + line).join('\n');
}

/** FNV-1a, 32 bits: a short stable suffix for an identifier that has to be shortened. */
function hash8(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

/** The savepoint of a table's bulk calls: one per table, distinct even when the name has to be shortened. */
export function bulkSavepointName(table: string): string {
    const name = 'sp_bulk_' + bareName(table);
    return name.length <= 128 ? name : name.slice(0, 128 - 9) + '_' + hash8(name);
}

/** Refuses /bulk where 82b §3.7-3.8 does not allow it, with what to do instead. */
export function checkBulk(model: OracleTableApiModel): void {
    const why = bulkRefusal(model.node, true);
    if (why !== null) throw new Error(`/bulk: ${model.names.table} ${why}`);
}

/** Refuses /bulk on a table without the layered TAPI (called by the generator for every other table). */
export function checkBulkWithoutLayers(node: IDdlNode, table: string): void {
    if (node.inferType() === 'table' && node.isOption('bulk'))
        throw new Error(`/bulk: ${table} ${bulkRefusal(node, false)}`);
}

/** Renders the bulk pieces of the DAL, the _svc and <t>_bulk_hks. Only called for a model with features.bulk. */
export class OracleBulkRenderer {
    constructor(
        private ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
    ) {}

    private names(node: IDdlNode, hasDal: boolean) {
        const model = this.analyzer.analyze(node);
        const tbl = model.names.table;
        const dal = model.names.dal;
        return {
            model,
            tbl,
            pk: model.names.pk,
            svc: model.names.service,
            bulkHks: tbl + '_bulk_hks',
            errTabCtor: hasDal ? `${dal}.t_err_tab` : 't_err_tab',
            insertRows: hasDal ? `${dal}.insert_rows` : 'p_insert_rows',
            updateRows: hasDal ? `${dal}.update_rows` : 'p_update_rows',
            deleteRows: hasDal ? `${dal}.delete_rows` : 'p_delete_rows',
            hasVer: model.features.versionColumn,
            immutable: model.features.immutable,
            scoped: model.dimensionScopes.length > 0,
        };
    }

    // ── types ────────────────────────────────────────────────────────────────

    /** The row and error collections, declared once: in the DAL when there is one, else in the _svc spec. */
    private renderCollectionTypes(tbl: string, rowsType: string): string {
        let r = `${tab}type ${rowsType} is table of ${tbl}%rowtype index by pls_integer;\n`;
        r += `${tab}type t_err is record (idx pls_integer, code pls_integer, message varchar2(4000));\n`;
        r += `${tab}type t_err_tab is table of t_err;\n\n`;
        return r;
    }

    // ── DAL ──────────────────────────────────────────────────────────────────

    generateDalSpec(node: IDdlNode): string {
        const { tbl, immutable } = this.names(node, true);
        let r = `${tab}-- /bulk: one FORALL per batch; errors come back in x_errors by input index\n`;
        r += this.renderCollectionTypes(tbl, 't_rows');
        r += `${tab}procedure insert_rows (p_rows in out nocopy t_rows, x_errors in out nocopy t_err_tab);\n`;
        if (!immutable) {
            r += `${tab}procedure update_rows (p_rows in out nocopy t_rows, x_errors in out nocopy t_err_tab);\n`;
            r += `${tab}procedure delete_rows (p_rows in t_rows, x_errors in out nocopy t_err_tab);\n`;
        }
        return r + '\n';
    }

    /** The FORALL routines, in the DAL (`package`) or absorbed into the _svc body (`absorbed`). */
    generateDml(node: IDdlNode, mode: BulkMode): string {
        const model = this.analyzer.analyze(node);
        const absorbed = mode === 'absorbed';
        const prefix = absorbed ? 'p_' : '';
        const rowsType = absorbed ? 't_row_view' : 't_rows';
        const addError = absorbed ? 'p_bulk_error' : 'bulk_error';
        let r = this.renderErrorHelper(addError);
        r += this.renderInsertRows(model, prefix, rowsType, addError);
        if (!model.features.immutable) {
            r += this.renderUpdateRows(model, prefix, rowsType, addError);
            r += this.renderDeleteRows(model, prefix, rowsType, addError);
        }
        return r;
    }

    /**
     * The declarations of /bulk, which PL/SQL wants before any subprogram of a body: the exception of FORALL ... SAVE
     * EXCEPTIONS (in the DAL, or in the _svc with the absorbed DML) and, in the _svc, the guard.
     */
    generateDeclarations(inService: boolean, withDml: boolean): string {
        let r = '';
        if (inService) r += `${tab}g_bulk_busy boolean := false;  -- /bulk: one bulk call at a time on this table\n`;
        if (withDml) {
            r += `${tab}bulk_errors exception;\n`;
            r += `${tab}pragma exception_init(bulk_errors, -24381);\n`;
        }
        return r + '\n';
    }

    /** Appends one error; an application error keeps its text without the ORA-2xxxx: prefix. */
    private renderErrorHelper(name: string): string {
        let r = `${tab}procedure ${name} (\n`;
        r += `${tab}${tab}x_errors  in out nocopy t_err_tab,\n`;
        r += `${tab}${tab}p_idx     in pls_integer,\n`;
        r += `${tab}${tab}p_code    in pls_integer,\n`;
        r += `${tab}${tab}p_message in varchar2\n`;
        r += `${tab}) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}x_errors.extend;\n`;
        r += `${tab}${tab}x_errors(x_errors.last).idx  := p_idx;\n`;
        r += `${tab}${tab}x_errors(x_errors.last).code := p_code;\n`;
        r += `${tab}${tab}x_errors(x_errors.last).message := substr(case when p_code between -20999 and -20000\n`;
        r += `${tab}${tab}${tab}then regexp_replace(p_message, '^ORA-[0-9]{5}: ') else p_message end, 1, 4000);\n`;
        r += `${tab}end ${name};\n\n`;
        return r;
    }

    /**
     * One FORALL ... SAVE EXCEPTIONS and its outcome by input index, the same for the three operations (82b §3.3 step
     * 6). Right after the statement -- on the normal path and in the handler of ORA-24381, before any other SQL --
     * SQL%BULK_EXCEPTIONS and, when the write is checked for zero rows, SQL%BULK_ROWCOUNT are copied. Then one error
     * per index, in the order of the input: an exception of the DML ([DUPLICATE] -20010 for a unique violation, as the
     * scalar path; any other its Oracle code), or else zero rows touched ([STALE_DATA] / [NOT_FOUND], the scalar's
     * distinction). An index with an exception is never also a zero-row case. `after` runs only when no row failed.
     */
    private renderForall(
        model: OracleTableApiModel,
        name: string,
        rowsParam: string,
        dml: string,
        addError: string,
        { zeroRows = false, declare = '', before = '', after = '' }: { zeroRows?: boolean; declare?: string; before?: string; after?: string } = {},
    ): string {
        const pk = model.names.pk;
        let r = `${tab}procedure ${name} (${rowsParam}, x_errors in out nocopy t_err_tab) is\n`;
        r += `${tab}${tab}type t_codes is table of pls_integer index by pls_integer;\n`;
        r += `${tab}${tab}l_failed t_codes;     -- index -> the Oracle error of its DML\n`;
        if (zeroRows) r += `${tab}${tab}l_count  t_codes;     -- index -> the rows it touched\n`;
        r += declare;
        r += `${tab}begin\n`;
        r += before;
        const counts = zeroRows
            ? `${tab}${tab}${tab}for i in 1 .. p_rows.count loop l_count(i) := sql%bulk_rowcount(i); end loop;\n` : '';
        r += `${tab}${tab}begin\n`;
        r += `${tab}${tab}${tab}forall i in 1 .. p_rows.count save exceptions\n`;
        r += indent(dml, 2);
        r += counts;
        r += `${tab}${tab}exception\n`;
        r += `${tab}${tab}${tab}when bulk_errors then\n`;
        r += `${tab}${tab}${tab}${tab}for j in 1 .. sql%bulk_exceptions.count loop\n`;
        r += `${tab}${tab}${tab}${tab}${tab}l_failed(sql%bulk_exceptions(j).error_index) := sql%bulk_exceptions(j).error_code;\n`;
        r += `${tab}${tab}${tab}${tab}end loop;\n`;
        r += indent(counts, 1);
        r += `${tab}${tab}end;\n`;
        r += `${tab}${tab}for i in 1 .. p_rows.count loop\n`;
        r += `${tab}${tab}${tab}if l_failed.exists(i) then\n`;
        r += `${tab}${tab}${tab}${tab}if l_failed(i) = 1 then\n`;
        r += `${tab}${tab}${tab}${tab}${tab}${addError}(x_errors, i, -20010, '[DUPLICATE] duplicate value on unique constraint.');\n`;
        r += `${tab}${tab}${tab}${tab}else\n`;
        r += `${tab}${tab}${tab}${tab}${tab}${addError}(x_errors, i, -l_failed(i), sqlerrm(-l_failed(i)));\n`;
        r += `${tab}${tab}${tab}${tab}end if;\n`;
        if (zeroRows) {
            r += `${tab}${tab}${tab}elsif l_count(i) = 0 then\n`;
            r += indent(renderStaleOrNotFound(model, `p_rows(i).${pk}`,
                `${addError}(x_errors, i, -20001, '[STALE_DATA] row modified by another session. reload and retry.');`,
                `${addError}(x_errors, i, -20002, '[NOT_FOUND] record ' || p_rows(i).${pk} || ' does not exist.');`), 1);
        }
        r += `${tab}${tab}${tab}end if;\n`;
        r += `${tab}${tab}end loop;\n`;
        if (after) {
            r += `${tab}${tab}if l_failed.count = 0 then\n`;
            r += indent(after, 1);
            r += `${tab}${tab}end if;\n`;
        }
        r += `${tab}end ${name};\n\n`;
        return r;
    }

    private renderInsertRows(model: OracleTableApiModel, prefix: string, rowsType: string, addError: string): string {
        const tbl = model.names.table;
        const pk = model.names.pk;
        const synTenantId = model.features.syntheticTenantId;
        const cols = [...(synTenantId ? ['tenant_id'] : []), ...writableColumns(model)];
        // the same RETURNING as the scalar insert_row: the id, and with row_version the version and the creation audit
        const ret = [pk];
        if (model.features.versionColumn) {
            ret.push('row_version');
            if (model.features.auditColumns)
                ret.push(String(this.ctx.getOptionValue('createdcol') ?? 'created'), String(this.ctx.getOptionValue('createdbycol') ?? 'created_by'));
        }
        let declare = '';
        for (const c of ret) declare += `${tab}${tab}type t_ret_${c} is table of ${tbl}.${c}%type;\n${tab}${tab}l_ret_${c} t_ret_${c};\n`;
        let before = '';
        if (synTenantId) {
            declare += `${tab}${tab}l_tenant_id ${tbl}.tenant_id%type := ${model.names.tenantContext}.get_id;\n`;
            before = `${tab}${tab}for i in 1 .. p_rows.count loop\n${tab}${tab}${tab}p_rows(i).tenant_id := l_tenant_id;\n${tab}${tab}end loop;\n`;
        }
        let dml = cols.length > 0
            ? `${tab}${tab}insert into ${tbl} (${cols.join(', ')})\n${tab}${tab}values (${cols.map(c => `p_rows(i).${c}`).join(', ')})\n`
            : `${tab}${tab}insert into ${tbl} values (default)\n`;
        dml += `${tab}${tab}returning ${ret.join(', ')}\n${tab}${tab}bulk collect into ${ret.map(c => `l_ret_${c}`).join(', ')};\n`;
        // the values of the RETURNING go back into the images only when every row was written
        let after = `${tab}${tab}for i in 1 .. p_rows.count loop\n`;
        for (const c of ret) after += `${tab}${tab}${tab}p_rows(i).${c} := l_ret_${c}(i);\n`;
        after += `${tab}${tab}end loop;\n`;
        return this.renderForall(model, `${prefix}insert_rows`, `p_rows in out nocopy ${rowsType}`, dml, addError, { declare, before, after });
    }

    private renderUpdateRows(model: OracleTableApiModel, prefix: string, rowsType: string, addError: string): string {
        const pk = model.names.pk;
        const set = writableColumns(model);
        const assignments = set.length > 0 ? set.map(c => `${c} = p_rows(i).${c}`).join(', ') : `${pk} = p_rows(i).${pk}`;
        const where = rowPredicates(model, `p_rows(i).${pk}`, 'p_rows(i)', { rowVersion: true }).join(' and ');
        const dml = `${tab}${tab}update ${model.names.table} set ${assignments}\n${tab}${tab}where ${where};\n`;
        // zero rows is checked where the scalar update_row checks it: with row_version (82b §11)
        return this.renderForall(model, `${prefix}update_rows`, `p_rows in out nocopy ${rowsType}`, dml, addError,
            { zeroRows: model.features.versionColumn });
    }

    private renderDeleteRows(model: OracleTableApiModel, prefix: string, rowsType: string, addError: string): string {
        const where = rowPredicates(model, `p_rows(i).${model.names.pk}`, null).join(' and ');
        // a row gone after the read is not an error, as in the scalar delete_row
        const dml = `${tab}${tab}delete from ${model.names.table} where ${where};\n`;
        return this.renderForall(model, `${prefix}delete_rows`, `p_rows in ${rowsType}`, dml, addError);
    }

    // ── _svc spec ────────────────────────────────────────────────────────────

    generateServiceSpec(node: IDdlNode, hasDal: boolean): string {
        const { model, tbl, pk, hasVer, immutable } = this.names(node, hasDal);
        const dal = model.names.dal;
        let r = `${tab}-- /bulk (82b): input dense 1..n; x_ids and x_errors are defined only on a normal return\n`;
        r += `${tab}type t_tab     is table of t_rec;\n`;
        r += `${tab}type t_id_tab  is table of ${tbl}.${pk}%type;\n`;
        if (hasVer) r += `${tab}type t_ver_tab is table of ${tbl}.row_version%type;\n`;
        if (hasDal) {
            r += `${tab}subtype t_row_view is ${dal}.t_rows;\n`;
            r += `${tab}subtype t_err      is ${dal}.t_err;\n`;
            r += `${tab}subtype t_err_tab  is ${dal}.t_err_tab;\n\n`;
        } else {
            r += '\n' + this.renderCollectionTypes(tbl, 't_row_view');
        }
        r += `${tab}procedure create_many (\n`;
        r += `${tab}${tab}p_recs   in  t_tab,\n`;
        r += `${tab}${tab}x_ids    out t_id_tab,\n`;
        r += `${tab}${tab}p_mode   in  varchar2 default 'FAIL_FAST',\n`;
        r += `${tab}${tab}x_errors out t_err_tab\n`;
        r += `${tab});\n\n`;
        if (!immutable) {
            r += `${tab}procedure update_many (\n`;
            r += `${tab}${tab}p_ids          in  t_id_tab,\n`;
            r += `${tab}${tab}p_recs         in  t_tab,\n`;
            if (hasVer) r += `${tab}${tab}p_row_versions in  t_ver_tab,\n`;
            r += `${tab}${tab}p_mode         in  varchar2 default 'FAIL_FAST',\n`;
            r += `${tab}${tab}x_errors       out t_err_tab\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure delete_many (\n`;
            r += `${tab}${tab}p_ids    in  t_id_tab,\n`;
            r += `${tab}${tab}p_mode   in  varchar2 default 'FAIL_FAST',\n`;
            r += `${tab}${tab}x_errors out t_err_tab\n`;
            r += `${tab});\n\n`;
        }
        return r;
    }

    // ── <t>_bulk_hks ─────────────────────────────────────────────────────────

    private hookSignatures(svc: string, ownerPrefix: string): { validate: string; after: string } {
        return {
            validate: `procedure ${ownerPrefix}validate_many (p_operation in varchar2, p_rows in ${svc}t_row_view, x_errors in out nocopy ${svc}t_err_tab)`,
            after: `procedure ${ownerPrefix}after_many (p_operation in varchar2, p_ids in ${svc}t_id_tab)`,
        };
    }

    /** <t>_bulk_hks: the hooks of the whole batch; generated once, its body is written by hand. */
    generateHooksPackage(node: IDdlNode): string {
        const { svc, bulkHks } = this.names(node, false);
        const sig = this.hookSignatures(svc + '.', '');
        let r = `create or replace package ${bulkHks} as\n\n`;
        r += `${tab}-- after every row passed its own hooks, before the write: invariants across rows, read only;\n`;
        r += `${tab}-- a refused row is added to x_errors with its input index\n`;
        r += `${tab}${sig.validate};\n\n`;
        r += `${tab}-- after every row was written and its after_<op> ran\n`;
        r += `${tab}${sig.after};\n\n`;
        r += `end ${bareName(bulkHks)};\n/\n`;
        r += `\ncreate or replace package body ${bulkHks} as\n`;
        r += `-- warning: this file is generated once and must not be overwritten\n\n`;
        r += `${tab}${sig.validate} is begin null; end validate_many;\n\n`;
        r += `${tab}${sig.after} is begin null; end after_many;\n\n`;
        r += `end ${bareName(bulkHks)};\n/\n`;
        return r;
    }

    // ── _svc body ────────────────────────────────────────────────────────────

    /**
     * The private procedures the bulk procedures share, after the absorbed DML and the hook stubs of the _svc body:
     * the error helper (with a DAL; the absorbed DML brings its own), the input checks, the raise of FAIL_FAST and,
     * without +hks, the stubs of the batch hooks.
     */
    generateServicePrivate(node: IDdlNode, hasDal: boolean, hasHks: boolean): string {
        const { tbl } = this.names(node, hasDal);
        let r = `\n${tab}-- /bulk: private (savepoint ${bulkSavepointName(tbl)})\n\n`;
        // without a DAL the absorbed DML, emitted before, already has it
        if (hasDal) r += this.renderErrorHelper('p_bulk_error');
        r += `${tab}procedure p_bulk_input (p_message in varchar2) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}raise_application_error(${BULK_ERRORS.input}, '[BULK_INPUT] ${tbl}: ' || p_message);\n`;
        r += `${tab}end p_bulk_input;\n\n`;
        r += `${tab}procedure p_bulk_shape (p_name in varchar2, p_count in pls_integer, p_first in pls_integer, p_last in pls_integer, p_expected in pls_integer default null) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_count = 0 or p_first != 1 or p_last != p_count then\n`;
        r += `${tab}${tab}${tab}p_bulk_input(p_name || ' is empty or not dense (indices 1..n)');\n`;
        r += `${tab}${tab}elsif p_expected is not null and p_count != p_expected then\n`;
        r += `${tab}${tab}${tab}p_bulk_input(p_name || ' has ' || p_count || ' elements, expected ' || p_expected);\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}end p_bulk_shape;\n\n`;
        r += `${tab}procedure p_bulk_mode (p_mode in varchar2) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_mode is null or p_mode not in ('FAIL_FAST', 'COLLECT') then\n`;
        r += `${tab}${tab}${tab}p_bulk_input('the mode is FAIL_FAST or COLLECT');\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}end p_bulk_mode;\n\n`;
        r += `${tab}procedure p_bulk_raise (p_error in t_err) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_error.code between -20999 and -20000 then\n`;
        r += `${tab}${tab}${tab}raise_application_error(p_error.code, p_error.message || ' (row ' || p_error.idx || ')');\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}${tab}raise_application_error(${BULK_ERRORS.row}, '[BULK_ROW] ' || p_error.message || ' (row ' || p_error.idx || ')');\n`;
        r += `${tab}end p_bulk_raise;\n\n`;
        if (!hasHks) {
            const sig = this.hookSignatures('', 'p_');
            r += `${tab}${sig.validate} is begin null; end p_validate_many;\n`;
            r += `${tab}${sig.after} is begin null; end p_after_many;\n\n`;
        }
        return r;
    }

    /** The bulk procedures of the _svc body, emitted after the scalar ones. */
    generateServiceBody(node: IDdlNode, hasDal: boolean, hasHks: boolean): string {
        const n = this.names(node, hasDal);
        const hk = createHookNameResolver(n.model.names.hooks, hasHks);
        const bhk = createHookNameResolver(n.bulkHks, hasHks);
        let r = this.renderRead(n);
        r += this.renderCreate(n, hk, bhk);
        if (!n.immutable) {
            r += this.renderUpdate(n, hk, bhk);
            r += this.renderDelete(n, hk, bhk);
        }
        r += this.renderEntry(n, 'create_many', [
            ['p_recs', 'in  t_tab'], ['x_ids', 'out t_id_tab'],
        ], `${tab}${tab}${tab}${tab}x_ids := t_id_tab();\n`);
        if (!n.immutable) {
            r += this.renderEntry(n, 'update_many', [
                ['p_ids', 'in  t_id_tab'], ['p_recs', 'in  t_tab'],
                ...(n.hasVer ? [['p_row_versions', 'in  t_ver_tab'] as [string, string]] : []),
            ], '');
            r += this.renderEntry(n, 'delete_many', [['p_ids', 'in  t_id_tab']], '');
        }
        return r;
    }

    /**
     * Step 2 of update and delete: the rows in place, read from <t>_rls in one query and put back at their input
     * index (the query's order is not the input's). A null or repeated id is a row error and only its index leaves
     * the batch (codex-037 X1-COLLECT-01): the other indices are read and go on; an id the query does not return is
     * [NOT_FOUND] for its index, as get_by_id. In FAIL_FAST the caller stops at the first error anyway.
     */
    private renderRead(n: ReturnType<OracleBulkRenderer['names']>): string {
        const { model, tbl, pk } = n;
        const tenantWhere = model.features.syntheticTenantId ? ` and tenant_id = ${model.names.tenantContext}.get_id` : '';
        if (n.immutable) return '';
        let r = `${tab}procedure p_bulk_read (\n`;
        r += `${tab}${tab}p_ids    in t_id_tab,\n`;
        r += `${tab}${tab}p_mode   in varchar2,\n`;
        r += `${tab}${tab}x_old    in out nocopy t_row_view,\n`;
        r += `${tab}${tab}x_errors in out nocopy t_err_tab\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}type t_pos is table of pls_integer index by varchar2(4000);\n`;
        r += `${tab}${tab}type t_bad is table of boolean index by pls_integer;\n`;
        r += `${tab}${tab}l_pos   t_pos;        -- id -> its input index (the first one)\n`;
        r += `${tab}${tab}l_bad   t_bad;        -- the indices out of the batch: a null or repeated id\n`;
        r += `${tab}${tab}l_found t_row_view;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}for i in 1 .. p_ids.count loop\n`;
        r += `${tab}${tab}${tab}if p_ids(i) is null then\n`;
        r += `${tab}${tab}${tab}${tab}p_bulk_error(x_errors, i, ${BULK_ERRORS.input}, '[BULK_INPUT] ${tbl}: the id is null');\n`;
        r += `${tab}${tab}${tab}${tab}l_bad(i) := true;\n`;
        r += `${tab}${tab}${tab}elsif l_pos.exists(to_char(p_ids(i))) then\n`;
        r += `${tab}${tab}${tab}${tab}p_bulk_error(x_errors, i, ${BULK_ERRORS.input}, '[BULK_INPUT] ${tbl}: the id ' || p_ids(i) || ' repeats row ' || l_pos(to_char(p_ids(i))));\n`;
        r += `${tab}${tab}${tab}${tab}l_bad(i) := true;\n`;
        r += `${tab}${tab}${tab}else\n`;
        r += `${tab}${tab}${tab}${tab}l_pos(to_char(p_ids(i))) := i;\n`;
        r += `${tab}${tab}${tab}end if;\n`;
        r += `${tab}${tab}end loop;\n`;
        r += `${tab}${tab}if x_errors.count > 0 and p_mode = 'FAIL_FAST' then return; end if;\n`;
        r += `${tab}${tab}-- a null id matches nothing, a repeated one returns its row once: both already out of the batch\n`;
        r += `${tab}${tab}select * bulk collect into l_found from ${tbl}_rls\n`;
        r += `${tab}${tab}where ${pk} in (select column_value from table(p_ids))${tenantWhere};\n`;
        r += `${tab}${tab}for k in 1 .. l_found.count loop\n`;
        r += `${tab}${tab}${tab}x_old(l_pos(to_char(l_found(k).${pk}))) := l_found(k);\n`;
        r += `${tab}${tab}end loop;\n`;
        r += `${tab}${tab}for i in 1 .. p_ids.count loop\n`;
        r += `${tab}${tab}${tab}if not x_old.exists(i) and not l_bad.exists(i) then\n`;
        r += `${tab}${tab}${tab}${tab}p_bulk_error(x_errors, i, -20002, '[NOT_FOUND] ${tbl}: record not found (id=' || p_ids(i) || ')');\n`;
        r += `${tab}${tab}${tab}${tab}exit when p_mode = 'FAIL_FAST';\n`;
        r += `${tab}${tab}${tab}end if;\n`;
        r += `${tab}${tab}end loop;\n`;
        r += `${tab}end p_bulk_read;\n\n`;
        return r;
    }

    /**
     * Step 3 for one row: the scalar protocol, in its own block. A failure is a row error: the row leaves the batch
     * (deleted from the collection in play) and, in FAIL_FAST, the loop stops.
     */
    private renderRowStep(prepare: string, protocol: string, rows: string): string {
        let r = `${tab}${tab}${tab}begin\n`;
        r += indent(prepare + protocol, 2);
        r += `${tab}${tab}${tab}exception\n`;
        r += `${tab}${tab}${tab}${tab}when others then\n`;
        r += `${tab}${tab}${tab}${tab}${tab}p_bulk_error(x_errors, i, sqlcode, sqlerrm);\n`;
        r += `${tab}${tab}${tab}${tab}${tab}${rows}.delete(i);\n`;
        r += `${tab}${tab}${tab}${tab}${tab}l_stop := p_mode = 'FAIL_FAST';\n`;
        r += `${tab}${tab}${tab}end;\n`;
        r += `${tab}${tab}${tab}exit when l_stop;\n`;
        return r;
    }

    /** Steps 4-7: validate_many, the DML, the after hooks per row, after_many. Returns early on a row error. */
    private renderTail(
        operation: OracleOperation,
        rows: string,
        dml: string,
        after: string,
        ids: string,
        bhk: (p: string) => string,
    ): string {
        let r = `${tab}${tab}if x_errors.count > 0 and p_mode = 'FAIL_FAST' then return; end if;\n`;
        r += `${tab}${tab}if ${rows}.count > 0 then\n`;
        r += `${tab}${tab}${tab}${bhk('validate_many')}(p_operation => '${operation}', p_rows => ${rows}, x_errors => x_errors);\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}${tab}if x_errors.count > 0 then return; end if;\n`;
        r += `${tab}${tab}${dml}(p_rows => ${rows}, x_errors => x_errors);\n`;
        r += `${tab}${tab}if x_errors.count > 0 then return; end if;\n`;
        r += `${tab}${tab}for i in 1 .. ${rows}.count loop\n`;
        r += indent(after, 1);
        r += `${tab}${tab}end loop;\n`;
        r += `${tab}${tab}${bhk('after_many')}(p_operation => '${operation}', p_ids => ${ids});\n`;
        return r;
    }

    private renderCreate(n: ReturnType<OracleBulkRenderer['names']>, hk: (p: string) => string, bhk: (p: string) => string): string {
        const params = n.model.columns.parameters.map(({ name }) => name);
        let r = `${tab}procedure p_create_many (\n`;
        r += `${tab}${tab}p_recs   in  t_tab,\n`;
        r += `${tab}${tab}x_ids    in out nocopy t_id_tab,\n`;
        r += `${tab}${tab}p_mode   in  varchar2,\n`;
        r += `${tab}${tab}x_errors in out nocopy t_err_tab\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_new  t_row_view;\n`;
        r += `${tab}${tab}l_stop boolean := false;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}p_bulk_mode(p_mode);\n`;
        r += `${tab}${tab}if p_recs is null then p_bulk_input('p_recs is null'); end if;\n`;
        r += `${tab}${tab}p_bulk_shape('p_recs', p_recs.count, p_recs.first, p_recs.last);\n`;
        r += `${tab}${tab}for i in 1 .. p_recs.count loop\n`;
        r += this.renderRowStep(
            renderRecordAssignments(params, 'l_new(i)', name => `p_recs(i).${name}`),
            renderBeforeOperation('insert', 'l_new(i)', n.scoped, hk),
            'l_new');
        r += `${tab}${tab}end loop;\n`;
        const after = renderAfterOperation('insert', 'l_new(i)', hk) +
            `${tab}${tab}x_ids.extend;\n${tab}${tab}x_ids(i) := l_new(i).${n.pk};\n`;
        r += this.renderTail('insert', 'l_new', n.insertRows, after, 'x_ids', bhk);
        r += `${tab}end p_create_many;\n\n`;
        return r;
    }

    private renderUpdate(n: ReturnType<OracleBulkRenderer['names']>, hk: (p: string) => string, bhk: (p: string) => string): string {
        const params = n.model.columns.parameters.map(({ name }) => name);
        let r = `${tab}procedure p_update_many (\n`;
        r += `${tab}${tab}p_ids          in  t_id_tab,\n`;
        r += `${tab}${tab}p_recs         in  t_tab,\n`;
        if (n.hasVer) r += `${tab}${tab}p_row_versions in  t_ver_tab,\n`;
        r += `${tab}${tab}p_mode         in  varchar2,\n`;
        r += `${tab}${tab}x_errors       in out nocopy t_err_tab\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_old  t_row_view;\n`;
        r += `${tab}${tab}l_new  t_row_view;\n`;
        r += `${tab}${tab}l_stop boolean := false;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}p_bulk_mode(p_mode);\n`;
        r += `${tab}${tab}if p_ids is null then p_bulk_input('p_ids is null'); end if;\n`;
        r += `${tab}${tab}if p_recs is null then p_bulk_input('p_recs is null'); end if;\n`;
        if (n.hasVer) r += `${tab}${tab}if p_row_versions is null then p_bulk_input('p_row_versions is null'); end if;\n`;
        r += `${tab}${tab}p_bulk_shape('p_ids', p_ids.count, p_ids.first, p_ids.last);\n`;
        r += `${tab}${tab}p_bulk_shape('p_recs', p_recs.count, p_recs.first, p_recs.last, p_ids.count);\n`;
        if (n.hasVer) r += `${tab}${tab}p_bulk_shape('p_row_versions', p_row_versions.count, p_row_versions.first, p_row_versions.last, p_ids.count);\n`;
        r += `${tab}${tab}p_bulk_read(p_ids => p_ids, p_mode => p_mode, x_old => l_old, x_errors => x_errors);\n`;
        r += `${tab}${tab}if x_errors.count > 0 and p_mode = 'FAIL_FAST' then return; end if;\n`;
        r += `${tab}${tab}for i in 1 .. p_ids.count loop\n`;
        r += `${tab}${tab}${tab}continue when not l_old.exists(i);\n`;
        let prepare = `${tab}${tab}l_new(i) := l_old(i);\n`;
        prepare += renderRecordAssignments(params, 'l_new(i)', name => `p_recs(i).${name}`);
        if (n.hasVer) prepare += `${tab}${tab}l_new(i).row_version := p_row_versions(i);\n`;
        r += this.renderRowStep(prepare, renderBeforeOperation('update', 'l_new(i)', n.scoped, hk), 'l_new');
        r += `${tab}${tab}end loop;\n`;
        r += this.renderTail('update', 'l_new', n.updateRows, renderAfterOperation('update', 'l_new(i)', hk), 'p_ids', bhk);
        r += `${tab}end p_update_many;\n\n`;
        return r;
    }

    private renderDelete(n: ReturnType<OracleBulkRenderer['names']>, hk: (p: string) => string, bhk: (p: string) => string): string {
        let r = `${tab}procedure p_delete_many (\n`;
        r += `${tab}${tab}p_ids    in  t_id_tab,\n`;
        r += `${tab}${tab}p_mode   in  varchar2,\n`;
        r += `${tab}${tab}x_errors in out nocopy t_err_tab\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_old  t_row_view;\n`;
        r += `${tab}${tab}l_stop boolean := false;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}p_bulk_mode(p_mode);\n`;
        r += `${tab}${tab}if p_ids is null then p_bulk_input('p_ids is null'); end if;\n`;
        r += `${tab}${tab}p_bulk_shape('p_ids', p_ids.count, p_ids.first, p_ids.last);\n`;
        r += `${tab}${tab}p_bulk_read(p_ids => p_ids, p_mode => p_mode, x_old => l_old, x_errors => x_errors);\n`;
        r += `${tab}${tab}if x_errors.count > 0 and p_mode = 'FAIL_FAST' then return; end if;\n`;
        r += `${tab}${tab}for i in 1 .. p_ids.count loop\n`;
        r += `${tab}${tab}${tab}continue when not l_old.exists(i);\n`;
        r += this.renderRowStep('', renderBeforeOperation('delete', 'l_old(i)', n.scoped, hk, 'p_ids(i)'), 'l_old');
        r += `${tab}${tab}end loop;\n`;
        r += this.renderTail('delete', 'l_old', n.deleteRows, renderAfterOperation('delete', 'l_old(i)', hk, 'p_ids(i)'), 'p_ids', bhk);
        r += `${tab}end p_delete_many;\n\n`;
        return r;
    }

    /**
     * The public procedure, the same for the three operations: the guard (a second bulk call on this table is
     * refused before it touches the guard or the savepoint), the savepoint, the private step, then
     *   - row errors: rollback to the savepoint; COLLECT returns them, FAIL_FAST raises the first after the guard
     *     is released;
     *   - any exception (a call error): the diagnosis saved before any SQL, the guard released, rollback to the
     *     savepoint, the original exception raised again.
     */
    private renderEntry(
        n: ReturnType<OracleBulkRenderer['names']>,
        name: string,
        params: Array<[string, string]>,
        onRowErrors: string,
    ): string {
        const sp = bulkSavepointName(n.tbl);
        const all: Array<[string, string]> = [...params, ['p_mode', "in  varchar2 default 'FAIL_FAST'"], ['x_errors', 'out t_err_tab']];
        const width = Math.max(...all.map(([p]) => p.length));
        const call = all.map(([p]) => `${p} => ${p}`).join(', ');
        const outs = params.filter(([, t]) => t.startsWith('out')).map(([p]) => p);
        let r = `${tab}procedure ${name} (\n`;
        r += all.map(([p, t]) => `${tab}${tab}${p.padEnd(width)} ${t}`).join(',\n') + '\n';
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_code  pls_integer;\n`;
        r += `${tab}${tab}l_msg   varchar2(4000);\n`;
        r += `${tab}${tab}l_trace varchar2(4000);\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if g_bulk_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(${BULK_ERRORS.reentrant}, '[BULK_REENTRANT] ${n.tbl}: a bulk call on this table is already running');\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}${tab}g_bulk_busy := true;\n`;
        r += `${tab}${tab}begin\n`;
        r += `${tab}${tab}${tab}savepoint ${sp};\n`;
        r += `${tab}${tab}${tab}x_errors := ${n.errTabCtor}();\n`;
        for (const o of outs) r += `${tab}${tab}${tab}${o} := t_id_tab();\n`;
        r += `${tab}${tab}${tab}p_${name}(${call});\n`;
        r += `${tab}${tab}${tab}if x_errors.count > 0 then\n`;
        r += `${tab}${tab}${tab}${tab}rollback to savepoint ${sp};\n`;
        r += onRowErrors;
        r += `${tab}${tab}${tab}end if;\n`;
        r += `${tab}${tab}exception\n`;
        r += `${tab}${tab}${tab}when others then\n`;
        r += `${tab}${tab}${tab}${tab}l_code  := sqlcode;\n`;
        r += `${tab}${tab}${tab}${tab}l_msg   := sqlerrm;\n`;
        r += `${tab}${tab}${tab}${tab}l_trace := dbms_utility.format_error_backtrace;\n`;
        r += `${tab}${tab}${tab}${tab}g_bulk_busy := false;\n`;
        r += `${tab}${tab}${tab}${tab}begin\n`;
        r += `${tab}${tab}${tab}${tab}${tab}rollback to savepoint ${sp};\n`;
        r += `${tab}${tab}${tab}${tab}exception\n`;
        r += `${tab}${tab}${tab}${tab}${tab}when others then\n`;
        r += `${tab}${tab}${tab}${tab}${tab}${tab}raise_application_error(${BULK_ERRORS.rollback}, substr('[BULK_ROLLBACK] ${n.tbl}: the batch could not be rolled back after '\n`;
        r += `${tab}${tab}${tab}${tab}${tab}${tab}${tab}|| l_msg || ' (' || l_code || ') ' || l_trace, 1, 2000), true);\n`;
        r += `${tab}${tab}${tab}${tab}end;\n`;
        r += `${tab}${tab}${tab}${tab}raise;\n`;
        r += `${tab}${tab}end;\n`;
        r += `${tab}${tab}g_bulk_busy := false;\n`;
        r += `${tab}${tab}if x_errors.count > 0 and p_mode = 'FAIL_FAST' then\n`;
        r += `${tab}${tab}${tab}p_bulk_raise(x_errors(1));\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}end ${name};\n\n`;
        return r;
    }
}
