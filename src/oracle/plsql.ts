import { tab } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode } from '../compiler/types.js';
import { OracleLegacyTapiBuilder } from './plsql/legacy-tapi.js';
import { generateRestEnable } from './plsql/ords.js';
import { OracleTableApiAnalyzer } from './plsql/table-model.js';
import {
    generateTenantBootstrapBody,
    generateTenantBootstrapSpec,
    generateTenantCtxBody,
    generateTenantCtxSpec,
} from './plsql/tenant-context.js';
import { OracleTriggerBuilder } from './plsql/triggers.js';

/**
 * Handles Oracle REST enable, trigger generation, and Table API (TAPI)
 * for OracleDDLGenerator.
 */
export class OraclePlsqlBuilder {
    private triggers:   OracleTriggerBuilder;
    private legacyTapi: OracleLegacyTapiBuilder;
    private tableApi:   OracleTableApiAnalyzer;

    constructor(
        private ctx: DdlContext,
        naming: Naming,
    ) {
        this.triggers   = new OracleTriggerBuilder(ctx, naming);
        this.legacyTapi = new OracleLegacyTapiBuilder(ctx);
        this.tableApi   = new OracleTableApiAnalyzer(ctx);
    }

    // Strip schema prefix from a qualified name — used in PL/SQL END clauses where
    // Oracle requires the simple identifier, not schema.name.
    private _bare(name: string): string {
        const dot = name.indexOf('.');
        return dot >= 0 ? name.slice(dot + 1) : name;
    }

    restEnable(node: IDdlNode): string              { return generateRestEnable(this.ctx, node); }
    generateTrigger(node: IDdlNode): string         { return this.triggers.generate(node); }
    generateImmutableTrigger(node: IDdlNode): string { return this.triggers.generateImmutable(node); }
    generateVersionedTrigger(node: IDdlNode): string { return this.triggers.generateVersioned(node); }

    // ── Table API (TAPI) ──────────────────────────────────────────────────────

    /**
     * Row-scope view for every table, generated once here instead of re-derived as a
     * WHERE-clause predicate in every read path: get_by_id/lock_by_id/get_all/
     * get_by_<unique> (in _dal, or the absorbed private DML when _dal is absent)
     * always read from this view, never from the base table — the presentation layer
     * must never read a table directly, only a view, even when there is no dimension
     * column to filter. With a configured dimension column, the view filters via the
     * project's own sec_pkg.secured_by_dimension macro (real column introspection,
     * the same one any APEX region/report reads through); without one, it is a plain
     * passthrough (select * from <table>) — same shape, same consumer, no
     * special-casing needed by callers.
     */
    private _generateDimensionRlsView(node: IDdlNode): string {
        const model = this.tableApi.analyze(node);
        const tbl = model.names.table;
        const dimCols = model.dimensionScopes;
        const source = dimCols.length > 0 ? `sec_pkg.secured_by_dimension(${tbl})` : tbl;
        return `create or replace view ${tbl}_rls as\nselect * from ${source};\n/\n`;
    }

    procDecl(node: IDdlNode, kind: string): string {
        return this.legacyTapi.procDecl(node, kind);
    }

    // ── Layered TAPI ─────────────────────────────────────────────────────────

    // /businesskey <col> — only meaningful alongside /versioned (enforced by
    // error-msgs.ts businesskey_checks). Returns '' when absent, invalid, or the
    // named column isn't actually declared on this table (same defensive stance
    // as an invalid /versioned custom column name would take: generate nothing
    // extra rather than reference a column that doesn't exist).
    private _businessKeyCol(node: IDdlNode): string {
        return this.tableApi.analyze(node).businessKeyColumn;
    }

    private _hasUniqueCol(node: IDdlNode): boolean {
        return this.tableApi.analyze(node).columns.unique.length > 0;
    }

    // /bridge — only meaningful with exactly 2 /fk columns (enforced by
    // error-msgs.ts bridge_checks; anything else generates nothing extra, same
    // defensive stance as an invalid /businesskey column). `left` is the first FK
    // declared, `right` the second (Object.keys preserves declaration order — the
    // same assumption every other FK-column loop in this file already relies on).
    // `rightLabel` is `right` with a trailing "_id" stripped for use in procedure
    // names (grant_role, not grant_role_id) — falls back to the bare column name
    // when it doesn't end in "_id" (not every FK column follows that convention).
    private _bridgeCols(node: IDdlNode): { left: string; right: string; rightLabel: string } | null {
        return this.tableApi.analyze(node).bridge;
    }

    // /aggregate — only meaningful with at least one nested detail table (enforced
    // by error-msgs.ts aggregate_checks; a table with /aggregate but no nested
    // children generates nothing extra). A "detail" is any DIRECT child that is
    // itself a table (children.length > 0 distinguishes a nested table from a
    // plain column — same test regularColumns() already relies on); one level
    // only, a detail's own nested children are not treated as the master's
    // details too. `fkCol` is whichever of the detail's own /fk columns points
    // back at this master (by target table name, case-insensitively) — a detail
    // with no such FK is skipped (defensive: shouldn't happen for a properly
    // nested child, mirrors the same stance as an invalid /businesskey column).
    private _aggregateDetails(node: IDdlNode): Array<{ detailNode: IDdlNode; detailTbl: string; fkCol: string }> {
        return this.tableApi.analyze(node).aggregateDetails;
    }

    // Tier flags for an arbitrary node (not necessarily the one plsql.ts's main
    // dispatch is currently generating for) — needed by generateAggregatePackage
    // to know which layer of the *detail* table (not the master) to call, since
    // /api tier is a per-table setting and the two can differ.
    private _tierInfo(node: IDdlNode): { hasDal: boolean; hasHks: boolean; hasSvc: boolean } {
        return this.tableApi.analyze(node).capabilities;
    }

    // Private DML procedures absorbed into a package body when _dal is absent.
    private _generatePrivateDml(node: IDdlNode): string {
        const model       = this.tableApi.analyze(node);
        const tbl         = model.names.table;
        const pkNm        = model.names.pk;
        const hasVer      = model.features.versionColumn;
        const hasAudit    = model.features.auditColumns;
        const svcCols     = model.columns.service;
        const fkCols      = model.columns.foreignKeys;
        const uniqueCols  = model.columns.unique;
        const synTenantId = model.features.syntheticTenantId;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;

        const tenantCtxPkg = model.names.tenantContext;
        // Read paths always select from <table>_rls, never from <table> — the view exists
        // unconditionally now (see _generateDimensionRlsView), filtering via
        // secured_by_dimension when there's a dimension column, a plain passthrough
        // otherwise. Never applies to insert/update/delete: chk_rls (or its absorbed
        // p_chk_rls form) stays the sole authority for writes.
        const dimSource = `${tbl}_rls`;

        let r = `\n${tab}-- private DML (absorbed from absent _dal)\n\n`;

        r += `${tab}resource_busy exception;\n`;
        r += `${tab}pragma exception_init(resource_busy, -54);\n\n`;

        r += `${tab}function p_get_by_id (p_id in ${tbl}.${pkNm}%type) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        {
            const extra = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${pkNm} = p_id${extra};\n`;
        }
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}end p_get_by_id;\n\n`;

        // p_lock_by_id — SELECT FOR UPDATE NOWAIT (pessimistic, fail-fast)
        r += `${tab}function p_lock_by_id (p_id in ${tbl}.${pkNm}%type) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row\n`;
        r += `${tab}${tab}from   ${dimSource}\n`;
        r += `${tab}${tab}where  ${pkNm} = p_id\n`;
        if (synTenantId) r += `${tab}${tab}  and  tenant_id = ${tenantCtxPkg}.get_id\n`;
        r += `${tab}${tab}for update nowait;\n`;
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(-20003, '[LOCKED] ${tbl}: record locked by another session');\n`;
        r += `${tab}end p_lock_by_id;\n\n`;

        // p_lock_by_id_wait — SELECT FOR UPDATE WAIT n (pessimistic, with timeout)
        // Dynamic SQL required because FOR UPDATE WAIT accepts only a static literal in embedded SQL.
        r += `${tab}function p_lock_by_id_wait (p_id in ${tbl}.${pkNm}%type, p_timeout in number default 5) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        if (synTenantId) {
            r += `${tab}${tab}execute immediate\n`;
            r += `${tab}${tab}${tab}'select * from ${dimSource} where ${pkNm} = :1 and tenant_id = :2 for update wait ' || trunc(greatest(0, p_timeout))\n`;
            r += `${tab}${tab}into l_row using p_id, ${tenantCtxPkg}.get_id;\n`;
        } else {
            r += `${tab}${tab}execute immediate\n`;
            r += `${tab}${tab}${tab}'select * from ${dimSource} where ${pkNm} = :1 for update wait ' || trunc(greatest(0, p_timeout))\n`;
            r += `${tab}${tab}into l_row using p_id;\n`;
        }
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(-20003, '[LOCKED] ${tbl}: record locked by another session');\n`;
        r += `${tab}end p_lock_by_id_wait;\n\n`;

        // p_get_by_<unique> — one per /unique column, absorbed the same way p_get_by_id
        // is: a natural-key read has no per-row business logic to gate on _svc/_hks.
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const extraWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}function p_get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${cn} = p_${cn}${extraWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${tbl}: record not found (${cn}=' || p_${cn} || ')');\n`;
            r += `${tab}end p_get_by_${cn};\n\n`;
        }

        // p_get_all — weak ref cursor (sys_refcursor): absorbed for the same reason as
        // p_get_by_id above; a bulk read has no per-row business logic to gate on _svc/_hks.
        r += `${tab}function p_get_all return sys_refcursor is\n`;
        r += `${tab}${tab}l_cur sys_refcursor;\n`;
        r += `${tab}begin\n`;
        {
            const where = synTenantId ? ` where tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}${tab}open l_cur for select * from ${dimSource}${where};\n`;
        }
        r += `${tab}${tab}return l_cur;\n`;
        r += `${tab}end p_get_all;\n\n`;

        const insCols = [...(synTenantId ? ['tenant_id'] : []),
                         ...fkCols.map(f => f.toLowerCase()),
                         ...svcCols.map(c => c.parseName().toLowerCase())];
        const insVals = [...(synTenantId ? ['p_row.tenant_id'] : []),
                         ...fkCols.map(f => `p_row.${f.toLowerCase()}`),
                         ...svcCols.map(c => `p_row.${c.parseName().toLowerCase()}`)];
        r += `${tab}procedure p_insert_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        // Overwrite caller-supplied tenant_id with the trusted context value.
        if (synTenantId) r += `${tab}${tab}p_row.tenant_id := ${tenantCtxPkg}.get_id;\n`;
        if (insCols.length > 0) {
            r += `${tab}${tab}insert into ${tbl} (\n`;
            r += `${tab}${tab}${tab}` + insCols.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab}) values (\n`;
            r += `${tab}${tab}${tab}` + insVals.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab})`;
        } else {
            r += `${tab}${tab}insert into ${tbl} values (default)`;
        }
        if (hasVer) {
            const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
            const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
            const retCols  = [pkNm, 'row_version'];
            const intoCols = [`p_row.${pkNm}`, 'p_row.row_version'];
            if (hasAudit) { retCols.push(createdCol, createdByCol); intoCols.push(`p_row.${createdCol}`, `p_row.${createdByCol}`); }
            r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
            r += `${tab}${tab}     into ${intoCols.join(', ')}`;
        } else {
            r += `\n${tab}${tab}returning ${pkNm}\n`;
            r += `${tab}${tab}     into p_row.${pkNm}`;
        }
        r += `;\n${tab}end p_insert_row;\n\n`;

        if (isVersioned) {
            // p_close_row — absorbed close_row: the only permitted mutation on a versioned
            // table, replacing p_update_row/p_delete_row for the same reason DAL's close_row
            // replaces update_row/delete_row when _dal is present.
            const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
            const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
            r += `${tab}procedure p_close_row (\n`;
            r += `${tab}${tab}p_id       in     ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}p_row      in out nocopy ${tbl}%rowtype\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_id ${tbl}.${pkNm}%type := p_id;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}update ${tbl} set\n`;
            r += `${tab}${tab}${tab}${vtCol} = p_${vtCol}\n`;
            r += `${tab}${tab}where ${pkNm} = l_id`;
            if (synTenantId) r += `\n${tab}${tab}  and tenant_id = ${tenantCtxPkg}.get_id`;
            if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
            const retCols: string[] = [];
            const intoCols: string[] = [];
            if (hasVer)  { retCols.push('row_version'); intoCols.push('p_row.row_version'); }
            if (hasAudit) { retCols.push(updatedCol, updatedByCol); intoCols.push(`p_row.${updatedCol}`, `p_row.${updatedByCol}`); }
            retCols.push(vtCol); intoCols.push(`p_row.${vtCol}`);
            r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
            r += `${tab}${tab}     into ${intoCols.join(', ')};\n`;
            if (hasVer) {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}declare l_dummy pls_integer;\n`;
                r += `${tab}${tab}${tab}begin\n`;
                if (synTenantId) {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkNm} = l_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
                } else {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkNm} = l_id;\n`;
                }
                r += `${tab}${tab}${tab}${tab}raise_application_error(-20001, '[STALE_DATA] row modified by another session. reload and retry.');\n`;
                r += `${tab}${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}${tab}end;\n`;
                r += `${tab}${tab}end if;\n`;
            } else {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}end if;\n`;
            }
            r += `${tab}end p_close_row;\n\n`;
        } else if (isImmutable) {
            // No p_update_row/p_delete_row at all — the same narrowing /versioned applies
            // to close_row, applied here to the append-only case: /immutable's DB-level
            // trigger already blocks update/delete, but leaving update_row/delete_row in
            // the TAPI would let a caller reach a guaranteed-to-fail statement instead of
            // never being offered the operation in the first place.
        } else {
            const setCols = [...fkCols.map(f => `${f.toLowerCase()} = p_row.${f.toLowerCase()}`),
                             ...svcCols.map(c => `${c.parseName().toLowerCase()} = p_row.${c.parseName().toLowerCase()}`)];
            r += `${tab}procedure p_update_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
            r += `${tab}${tab}l_id ${tbl}.${pkNm}%type;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_id := p_row.${pkNm};\n`;
            if (setCols.length > 0) {
                r += `${tab}${tab}update ${tbl} set\n`;
                r += `${tab}${tab}${tab}` + setCols.join(`,\n${tab}${tab}${tab}`) + '\n';
                r += `${tab}${tab}where ${pkNm} = l_id`;
            } else {
                r += `${tab}${tab}update ${tbl} set ${pkNm} = l_id where ${pkNm} = l_id`;
            }
            if (synTenantId) r += `\n${tab}${tab}  and tenant_id = ${tenantCtxPkg}.get_id`;
            if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
            r += `;\n`;
            if (hasVer) {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}declare l_dummy pls_integer;\n`;
                r += `${tab}${tab}${tab}begin\n`;
                if (synTenantId) {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkNm} = l_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
                } else {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkNm} = l_id;\n`;
                }
                r += `${tab}${tab}${tab}${tab}raise_application_error(-20001, '[STALE_DATA] row modified by another session. reload and retry.');\n`;
                r += `${tab}${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}${tab}end;\n`;
                r += `${tab}${tab}end if;\n`;
            }
            r += `${tab}end p_update_row;\n\n`;

            r += `${tab}procedure p_delete_row (p_id in ${tbl}.${pkNm}%type) is\n`;
            r += `${tab}begin\n`;
            if (synTenantId) {
                r += `${tab}${tab}delete from ${tbl} where ${pkNm} = p_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
            } else {
                r += `${tab}${tab}delete from ${tbl} where ${pkNm} = p_id;\n`;
            }
            r += `${tab}end p_delete_row;\n\n`;
        }

        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            const tenantWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';

            r += `${tab}function p_get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${bkCol} = p_${bkCol} and is_current = 1${tenantWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${tbl}: no current version for ${bkCol}=' || p_${bkCol});\n`;
            r += `${tab}end p_get_current;\n\n`;

            r += `${tab}function p_get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource}\n`;
            r += `${tab}${tab}where  ${bkCol} = p_${bkCol}\n`;
            r += `${tab}${tab}and    valid_from <= p_as_of\n`;
            r += `${tab}${tab}and    (${vtCol} is null or ${vtCol} > p_as_of)${tenantWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${tbl}: no version for ${bkCol}=' || p_${bkCol} || ' as of ' || p_as_of);\n`;
            r += `${tab}end p_get_as_of;\n\n`;

            r += `${tab}function p_history (p_${bkCol} in ${tbl}.${bkCol}%type) return sys_refcursor is\n`;
            r += `${tab}${tab}l_cur sys_refcursor;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}open l_cur for select * from ${dimSource} where ${bkCol} = p_${bkCol}${tenantWhere} order by valid_from;\n`;
            r += `${tab}${tab}return l_cur;\n`;
            r += `${tab}end p_history;\n\n`;
        }

        {
            const bridge = this._bridgeCols(node);
            if (bridge !== null) {
                const tenantWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';

                r += `${tab}procedure p_grant_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}p_insert_row(p_row => p_row);\n`;
                r += `${tab}end p_grant_row;\n\n`;

                r += `${tab}procedure p_revoke_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) is\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}delete from ${tbl} where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right}${tenantWhere};\n`;
                r += `${tab}end p_revoke_row;\n\n`;

                r += `${tab}function p_has_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean is\n`;
                r += `${tab}${tab}l_cnt pls_integer;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}select count(*) into l_cnt from ${dimSource} where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right}${tenantWhere};\n`;
                r += `${tab}${tab}return l_cnt > 0;\n`;
                r += `${tab}end p_has_row;\n\n`;

                r += `${tab}function p_list_row (p_${bridge.left} in ${tbl}.${bridge.left}%type) return sys_refcursor is\n`;
                r += `${tab}${tab}l_cur sys_refcursor;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}open l_cur for select * from ${dimSource} where ${bridge.left} = p_${bridge.left}${tenantWhere};\n`;
                r += `${tab}${tab}return l_cur;\n`;
                r += `${tab}end p_list_row;\n\n`;
            }
        }

        return r;
    }

    // Private no-op hook stubs — used inside a body when _hks is absent from the tier.
    private _generatePrivateHookStubs(node: IDdlNode): string {
        const model = this.tableApi.analyze(node);
        const tbl  = model.names.table;
        const pkNm = model.names.pk;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const dimCols     = model.dimensionScopes;
        let r = `\n${tab}-- private hook stubs (no external _hks)\n\n`;
        r += `${tab}procedure p_chk_rbac (p_operation in varchar2, p_row in ${tbl}%rowtype) is begin null; end p_chk_rbac;\n`;
        if (dimCols.length > 0) {
            r += `${tab}procedure p_chk_rls (p_row in ${tbl}%rowtype) is\n`;
            r += `${tab}begin\n`;
            for (const { col, dimType } of dimCols)
                r += `${tab}${tab}sec_pkg.require_dimension_scope(p_dimension_type => '${dimType}', p_code => to_char(p_row.${col}));\n`;
            r += `${tab}end p_chk_rls;\n`;
        }
        r += `${tab}procedure p_validate (p_operation in varchar2, p_row in out nocopy ${tbl}%rowtype) is begin null; end p_validate;\n`;
        r += `${tab}procedure p_before_insert (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
        if (isVersioned) {
            r += `${tab}procedure p_before_close (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n\n`;
            r += `${tab}procedure p_after_insert (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_close  (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        } else if (isImmutable) {
            // Insert-only: no before_update/before_delete/after_update/after_delete stubs.
            r += `${tab}procedure p_after_insert (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        } else {
            r += `${tab}procedure p_before_update (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_before_delete (p_id in ${tbl}.${pkNm}%type) is begin null; end;\n`;
            r += `${tab}procedure p_after_insert  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_update  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_delete  (p_id in ${tbl}.${pkNm}%type) is begin null; end;\n\n`;
        }
        if (this._bridgeCols(node) !== null) {
            // /bridge: additive hook pair, alongside whichever set the branch above
            // already produced — a bridge table keeps its generic CRUD hooks too.
            r += `${tab}procedure p_before_grant  (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_grant   (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_before_revoke (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure p_after_revoke  (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        }
        return r;
    }

    private _generateDalSpec(node: IDdlNode): string {
        const model      = this.tableApi.analyze(node);
        const tbl        = model.names.table;
        const dal        = model.names.dal;
        const pkName      = (node.getPkName() ?? 'id').toLowerCase();
        const uniqueCols = model.columns.unique;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;
        let r = `create or replace package ${dal} as\n\n`;
        r += `${tab}subtype t_id is ${tbl}.${pkName}%type;\n\n`;
        r += `${tab}function get_by_id       (p_id in t_id) return ${tbl}%rowtype;\n`;
        r += `${tab}function lock_by_id      (p_id in t_id) return ${tbl}%rowtype;\n`;
        r += `${tab}function lock_by_id_wait (p_id in t_id, p_timeout in number default 5) return ${tbl}%rowtype;\n\n`;
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype;\n\n`;
        }
        r += `${tab}type t_cursor is ref cursor return ${tbl}%rowtype;\n`;
        r += `${tab}function get_all return t_cursor;\n\n`;
        r += `${tab}procedure insert_row (p_row in out nocopy ${tbl}%rowtype);\n\n`;
        if (isVersioned) {
            r += `${tab}procedure close_row (\n`;
            r += `${tab}${tab}p_id       in     t_id,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}p_row      in out nocopy ${tbl}%rowtype\n`;
            r += `${tab});\n\n`;
        } else if (isImmutable) {
            // No update_row/delete_row — append-only.
        } else {
            r += `${tab}procedure update_row (p_row in out nocopy ${tbl}%rowtype);\n\n`;
            r += `${tab}procedure delete_row (p_id in t_id);\n\n`;
        }
        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            // /businesskey: navigate versions by business key instead of by the
            // surrogate PK of one specific version row.
            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return t_cursor;\n\n`;
        }
        const bridge = this._bridgeCols(node);
        if (bridge !== null) {
            // /bridge: additive, alongside the generic CRUD above (not a replacement —
            // unlike /versioned/close_row or /immutable's narrowing, a bridge row still
            // has a real, addressable surrogate id; grant/revoke/has/list are simply the
            // more natural-shaped API for the common case of managing one N:M pair).
            r += `${tab}procedure grant_row (p_row in out nocopy ${tbl}%rowtype);\n\n`;
            r += `${tab}procedure revoke_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type);\n\n`;
            r += `${tab}function has_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean;\n\n`;
            r += `${tab}function list_row (p_${bridge.left} in ${tbl}.${bridge.left}%type) return t_cursor;\n\n`;
        }
        r += `${tab}c_err_stale_data constant pls_integer := -20001;\n`;
        r += `${tab}c_err_not_found  constant pls_integer := -20002;\n`;
        r += `${tab}c_err_locked     constant pls_integer := -20003;\n\n`;
        r += `end ${this._bare(dal)};\n/\n`;
        return r;
    }

    private _generateDalBody(node: IDdlNode): string {
        const model      = this.tableApi.analyze(node);
        const tbl        = model.names.table;
        const dal        = model.names.dal;
        const pkName     = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer     = model.features.versionColumn;
        const hasAudit   = model.features.auditColumns;
        const svcCols    = model.columns.service;
        const fkCols     = model.columns.foreignKeys;
        const uniqueCols = model.columns.unique;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;

        let r = `create or replace package body ${dal} as\n\n`;

        // package-level: translates ORA-00054 (resource busy) to c_err_locked
        r += `${tab}resource_busy exception;\n`;
        r += `${tab}pragma exception_init(resource_busy, -54);\n\n`;

        // All tenant-aware queries delegate to the shared <prefix>tenant_ctx package
        // instead of duplicating a private function in every DAL — single point of configuration.
        const synTenantId  = model.features.syntheticTenantId;
        const tenantCtxPkg = model.names.tenantContext;
        // Read paths always select from <table>_rls, never from <table> — the view
        // exists unconditionally now (see _generateDimensionRlsView), filtering via
        // secured_by_dimension when there's a dimension column, a plain passthrough
        // otherwise. One relation name, defined once, shared with every other _rls
        // consumer (APEX regions included) — no conditional here to keep in sync.
        // Never applies to insert_row/update_row/delete_row/close_row, where the
        // explicit chk_rls check in _hks (or the absorbed p_chk_rls) stays
        // authoritative: an out-of-scope write raises, it never silently no-ops the
        // way a WHERE-clause filter would.
        const dimSource = `${tbl}_rls`;

        // get_by_id — NO_DATA_FOUND propagates to the caller; tenant-scoped when active.
        // Out-of-scope rows never enter l_row: they fail the same NO_DATA_FOUND path as a
        // genuinely missing id, indistinguishable from the caller's side (anti-IDOR).
        r += `${tab}function get_by_id (p_id in t_id) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        {
            const extra = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${pkName} = p_id${extra};\n`;
        }
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}end get_by_id;\n\n`;

        // lock_by_id — SELECT FOR UPDATE NOWAIT for check-then-act SVC procedures
        r += `${tab}function lock_by_id (p_id in t_id) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row\n`;
        r += `${tab}${tab}from   ${dimSource}\n`;
        r += `${tab}${tab}where  ${pkName} = p_id\n`;
        if (synTenantId) r += `${tab}${tab}  and  tenant_id = ${tenantCtxPkg}.get_id\n`;
        r += `${tab}${tab}for update nowait;\n`;
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_locked, '[LOCKED] ${tbl}: record locked by another session');\n`;
        r += `${tab}end lock_by_id;\n\n`;

        // lock_by_id_wait — SELECT FOR UPDATE WAIT n (pessimistic, with timeout)
        // Dynamic SQL required because FOR UPDATE WAIT accepts only a static literal in embedded SQL.
        r += `${tab}function lock_by_id_wait (p_id in t_id, p_timeout in number default 5) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        if (synTenantId) {
            r += `${tab}${tab}execute immediate\n`;
            r += `${tab}${tab}${tab}'select * from ${dimSource} where ${pkName} = :1 and tenant_id = :2 for update wait ' || trunc(greatest(0, p_timeout))\n`;
            r += `${tab}${tab}into l_row using p_id, ${tenantCtxPkg}.get_id;\n`;
        } else {
            r += `${tab}${tab}execute immediate\n`;
            r += `${tab}${tab}${tab}'select * from ${dimSource} where ${pkName} = :1 for update wait ' || trunc(greatest(0, p_timeout))\n`;
            r += `${tab}${tab}into l_row using p_id;\n`;
        }
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_locked, '[LOCKED] ${tbl}: record locked by another session');\n`;
        r += `${tab}end lock_by_id_wait;\n\n`;

        // get_by_<unique_col> — one function per /unique column; NO_DATA_FOUND propagates.
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const extraWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${cn} = p_${cn}${extraWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}end get_by_${cn};\n\n`;
        }

        // get_all — strong-typed ref cursor for PL/SQL bulk processing.
        r += `${tab}function get_all return t_cursor is\n`;
        r += `${tab}${tab}l_cur t_cursor;\n`;
        r += `${tab}begin\n`;
        {
            const where = synTenantId ? ` where tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}${tab}open l_cur for select * from ${dimSource}${where};\n`;
        }
        r += `${tab}${tab}return l_cur;\n`;
        r += `${tab}end get_all;\n\n`;

        // insert_row — no PK in INSERT column list; RETURNING populates p_row.id
        // and, when row_version and audit columns are present, those fields too.
        const insCols = [...(synTenantId ? ['tenant_id'] : []),
                         ...fkCols.map(f => f.toLowerCase()),
                         ...svcCols.map(c => c.parseName().toLowerCase())];
        const insVals = [...(synTenantId ? ['p_row.tenant_id'] : []),
                         ...fkCols.map(f => `p_row.${f.toLowerCase()}`),
                         ...svcCols.map(c => `p_row.${c.parseName().toLowerCase()}`)];
        r += `${tab}procedure insert_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        // Overwrite caller-supplied tenant_id with the trusted context value.
        if (synTenantId) r += `${tab}${tab}p_row.tenant_id := ${tenantCtxPkg}.get_id;\n`;
        r += `${tab}${tab}insert into ${tbl} (\n`;
        r += `${tab}${tab}${tab}` + insCols.join(`,\n${tab}${tab}${tab}`) + '\n';
        r += `${tab}${tab}) values (\n`;
        r += `${tab}${tab}${tab}` + insVals.join(`,\n${tab}${tab}${tab}`) + '\n';
        r += `${tab}${tab})`;
        if (hasVer) {
            const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
            const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
            const retCols  = [`${pkName}`, 'row_version'];
            const intoCols = [`p_row.${pkName}`, 'p_row.row_version'];
            if (hasAudit) { retCols.push(createdCol, createdByCol); intoCols.push(`p_row.${createdCol}`, `p_row.${createdByCol}`); }
            r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
            r += `${tab}${tab}     into ${intoCols.join(', ')}`;
        } else {
            r += `\n${tab}${tab}returning ${pkName}\n`;
            r += `${tab}${tab}     into p_row.${pkName}`;
        }
        r += `;\n`;
        r += `${tab}end insert_row;\n\n`;

        if (isVersioned) {
            // close_row — the only permitted mutation on a versioned table: set vtCol to close
            // this version. Same optimistic-locking shape as update_row, RETURNING adds vtCol.
            const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
            const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
            r += `${tab}procedure close_row (\n`;
            r += `${tab}${tab}p_id       in     t_id,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}p_row      in out nocopy ${tbl}%rowtype\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_id t_id := p_id;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}update ${tbl} set\n`;
            r += `${tab}${tab}${tab}${vtCol} = p_${vtCol}\n`;
            r += `${tab}${tab}where ${pkName} = l_id`;
            if (synTenantId) r += `\n${tab}${tab}  and tenant_id = ${tenantCtxPkg}.get_id`;
            if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
            const retCols: string[] = [];
            const intoCols: string[] = [];
            if (hasVer)  { retCols.push('row_version'); intoCols.push('p_row.row_version'); }
            if (hasAudit) { retCols.push(updatedCol, updatedByCol); intoCols.push(`p_row.${updatedCol}`, `p_row.${updatedByCol}`); }
            retCols.push(vtCol); intoCols.push(`p_row.${vtCol}`);
            r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
            r += `${tab}${tab}     into ${intoCols.join(', ')};\n`;
            if (hasVer) {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}declare l_dummy pls_integer;\n`;
                r += `${tab}${tab}${tab}begin\n`;
                if (synTenantId) {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
                } else {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id;\n`;
                }
                r += `${tab}${tab}${tab}${tab}raise_application_error(c_err_stale_data, '[STALE_DATA] row modified by another session. reload and retry.');\n`;
                r += `${tab}${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}${tab}end;\n`;
                r += `${tab}${tab}end if;\n`;
            } else {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}end if;\n`;
            }
            r += `${tab}end close_row;\n\n`;
        } else if (isImmutable) {
            // No update_row/delete_row — append-only (see _generatePrivateDml for the same
            // narrowing on degraded tiers).
        } else {
            // update_row — PK excluded from SET; optimistic locking when row_version present.
            // l_id is extracted before the UPDATE to avoid 'id = p_row.id' after the SET keyword,
            // which would incorrectly look like the flat-TAPI defect (arch spec §1.1).
            const setCols = [...fkCols.map(f => `${f.toLowerCase()} = p_row.${f.toLowerCase()}`),
                             ...svcCols.map(c => `${c.parseName().toLowerCase()} = p_row.${c.parseName().toLowerCase()}`)];
            r += `${tab}procedure update_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
            r += `${tab}${tab}l_id t_id;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_id := p_row.${pkName};\n`;
            r += `${tab}${tab}update ${tbl} set\n`;
            r += `${tab}${tab}${tab}` + setCols.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab}where ${pkName} = l_id`;
            if (synTenantId) r += `\n${tab}${tab}  and tenant_id = ${tenantCtxPkg}.get_id`;
            if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
            r += `;\n`;
            if (hasVer) {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}declare l_dummy pls_integer;\n`;
                r += `${tab}${tab}${tab}begin\n`;
                // Stale data check includes tenant_id so we never reveal existence of other-tenant records.
                if (synTenantId) {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
                } else {
                    r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id;\n`;
                }
                r += `${tab}${tab}${tab}${tab}raise_application_error(c_err_stale_data, '[STALE_DATA] row modified by another session. reload and retry.');\n`;
                r += `${tab}${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}${tab}end;\n`;
                r += `${tab}${tab}end if;\n`;
            }
            r += `${tab}end update_row;\n\n`;

            // delete_row — scoped to current tenant when tenantid is active; cross-tenant delete is a no-op.
            r += `${tab}procedure delete_row (p_id in t_id) is\n`;
            r += `${tab}begin\n`;
            if (synTenantId) {
                r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
            } else {
                r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id;\n`;
            }
            r += `${tab}end delete_row;\n\n`;
        }

        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            const tenantWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';

            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${bkCol} = p_${bkCol} and is_current = 1${tenantWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] ${tbl}: no current version for ${bkCol}=' || p_${bkCol});\n`;
            r += `${tab}end get_current;\n\n`;

            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource}\n`;
            r += `${tab}${tab}where  ${bkCol} = p_${bkCol}\n`;
            r += `${tab}${tab}and    valid_from <= p_as_of\n`;
            r += `${tab}${tab}and    (${vtCol} is null or ${vtCol} > p_as_of)${tenantWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '[NOT_FOUND] ${tbl}: no version for ${bkCol}=' || p_${bkCol} || ' as of ' || p_as_of);\n`;
            r += `${tab}end get_as_of;\n\n`;

            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return t_cursor is\n`;
            r += `${tab}${tab}l_cur t_cursor;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}open l_cur for select * from ${dimSource} where ${bkCol} = p_${bkCol}${tenantWhere} order by valid_from;\n`;
            r += `${tab}${tab}return l_cur;\n`;
            r += `${tab}end history;\n\n`;
        }

        {
            const bridge = this._bridgeCols(node);
            if (bridge !== null) {
                const tenantWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';

                // grant_row — same column list as insert_row (left/right FKs, plus any
                // other business columns the bridge table happens to carry, e.g.
                // granted_by/granted_at); reuses it directly rather than re-deriving.
                r += `${tab}procedure grant_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}insert_row(p_row => p_row);\n`;
                r += `${tab}end grant_row;\n\n`;

                r += `${tab}procedure revoke_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) is\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}delete from ${tbl} where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right}${tenantWhere};\n`;
                r += `${tab}end revoke_row;\n\n`;

                r += `${tab}function has_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean is\n`;
                r += `${tab}${tab}l_cnt pls_integer;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}select count(*) into l_cnt from ${dimSource} where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right}${tenantWhere};\n`;
                r += `${tab}${tab}return l_cnt > 0;\n`;
                r += `${tab}end has_row;\n\n`;

                r += `${tab}function list_row (p_${bridge.left} in ${tbl}.${bridge.left}%type) return t_cursor is\n`;
                r += `${tab}${tab}l_cur t_cursor;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}open l_cur for select * from ${dimSource} where ${bridge.left} = p_${bridge.left}${tenantWhere};\n`;
                r += `${tab}${tab}return l_cur;\n`;
                r += `${tab}end list_row;\n\n`;
            }
        }

        r += `end ${this._bare(dal)};\n/\n`;
        return r;
    }

    private _generateHksSpec(node: IDdlNode, hasDal: boolean): string {
        const model  = this.tableApi.analyze(node);
        const tbl    = model.names.table;
        const dal    = model.names.dal;
        const pkg    = model.names.hooks;
        const idType = hasDal ? `${dal}.t_id` : `${tbl}.id%type`;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const dimCols     = model.dimensionScopes;
        let r = `create or replace package ${pkg} as\n\n`;
        // chk_rbac — always declared, empty by default; a human fills it in with a
        // real sec_pkg.require_permission call only when a resource/action pair has
        // been curated for this table's write path (never auto-populated: RBAC is
        // selective by design).
        r += `${tab}procedure chk_rbac (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in ${tbl}%rowtype\n`;
        r += `${tab});\n\n`;
        // chk_rls — generated only when this table carries a configured dimension
        // scope column (dimensioncolumns setting); absent otherwise, never an
        // empty stub (there is nothing to ever check without a scope column).
        if (dimCols.length > 0) {
            r += `${tab}procedure chk_rls (p_row in ${tbl}%rowtype);\n\n`;
        }
        r += `${tab}procedure validate (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in out nocopy ${tbl}%rowtype\n`;
        r += `${tab});\n\n`;
        r += `${tab}procedure before_insert (p_row in out nocopy ${tbl}%rowtype);\n`;
        if (isVersioned) {
            r += `${tab}procedure before_close (p_row in out nocopy ${tbl}%rowtype);\n\n`;
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_close  (p_row in ${tbl}%rowtype);\n\n`;
        } else if (isImmutable) {
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n\n`;
        } else {
            r += `${tab}procedure before_update (p_row in out nocopy ${tbl}%rowtype);\n`;
            r += `${tab}procedure before_delete (p_id in ${idType});\n\n`;
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_update (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_delete (p_id in ${idType});\n\n`;
        }
        if (this._bridgeCols(node) !== null) {
            r += `${tab}procedure before_grant  (p_row in out nocopy ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_grant   (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure before_revoke (p_row in ${tbl}%rowtype);\n`;
            r += `${tab}procedure after_revoke  (p_row in ${tbl}%rowtype);\n\n`;
        }
        r += `end ${this._bare(pkg)};\n/\n`;
        return r;
    }

    private _generateHksBody(node: IDdlNode, hasDal: boolean): string {
        const model  = this.tableApi.analyze(node);
        const tbl    = model.names.table;
        const dal    = model.names.dal;
        const pkg    = model.names.hooks;
        const idType = hasDal ? `${dal}.t_id` : `${tbl}.id%type`;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const dimCols     = model.dimensionScopes;
        let r = `create or replace package body ${pkg} as\n`;
        r += `-- warning: this file is generated once and must not be overwritten\n\n`;
        r += `${tab}procedure chk_rbac (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in ${tbl}%rowtype\n`;
        r += `${tab}) is begin null; end chk_rbac;\n\n`;
        if (dimCols.length > 0) {
            r += `${tab}procedure chk_rls (p_row in ${tbl}%rowtype) is\n`;
            r += `${tab}begin\n`;
            for (const { col, dimType } of dimCols)
                r += `${tab}${tab}sec_pkg.require_dimension_scope(p_dimension_type => '${dimType}', p_code => to_char(p_row.${col}));\n`;
            r += `${tab}end chk_rls;\n\n`;
        }
        r += `${tab}procedure validate (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is begin null; end validate;\n\n`;
        r += `${tab}procedure before_insert (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
        if (isVersioned) {
            r += `${tab}procedure before_close (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n\n`;
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype)           is begin null; end;\n`;
            r += `${tab}procedure after_close  (p_row in ${tbl}%rowtype)           is begin null; end;\n\n`;
        } else if (isImmutable) {
            r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        } else {
            r += `${tab}procedure before_update (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure before_delete (p_id in ${idType}) is begin null; end;\n\n`;
            r += `${tab}procedure after_insert  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_update  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_delete  (p_id in ${idType})     is begin null; end;\n\n`;
        }
        if (this._bridgeCols(node) !== null) {
            r += `${tab}procedure before_grant  (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_grant   (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure before_revoke (p_row in ${tbl}%rowtype) is begin null; end;\n`;
            r += `${tab}procedure after_revoke  (p_row in ${tbl}%rowtype) is begin null; end;\n\n`;
        }
        r += `end ${this._bare(pkg)};\n/\n`;
        return r;
    }

    /**
     * Ordered list of t_rec / _app parameter descriptors: FK cols → regular cols.
     * Single source of truth for SVC t_rec fields and _app parameter lists.
     * tenant_id is intentionally excluded: the DAL (or absorbed private DML) enforces it
     * via tenant_ctx.get_id (trusted server-side context) — exposing it as a caller-supplied
     * parameter would let any caller forge it.
     */
    private _svcParamCols(node: IDdlNode): Array<{ name: string; nullable: boolean }> {
        return this.tableApi.analyze(node).columns.parameters;
    }

    /**
     * True when the user explicitly declared the PK column in the table definition
     * (pk: none / genpk: no with e.g. `id vc100 /pk /nn`) rather than relying on an
     * auto-generated key. _svcCols() does not exclude the PK by name — an explicit PK
     * column is a real child node like any other — so paramCols/t_rec already carry it.
     */
    private _pkIsUserDefined(node: IDdlNode): boolean {
        return this.tableApi.analyze(node).pkIsUserDefined;
    }

    private _generateSvcSpec(node: IDdlNode): string {
        const model       = this.tableApi.analyze(node);
        const tbl         = model.names.table;
        const svc         = model.names.service;
        const pkNm        = model.names.pk;
        const hasVer      = model.features.versionColumn;
        const paramCols   = model.columns.parameters;
        const uniqueCols  = model.columns.unique;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;
        const lockDef     = model.lockDefaults;

        let r = `create or replace package ${svc} as\n\n`;

        // t_rec: writable business columns only — excludes PK, row_version, audit cols (all trigger-managed).
        // Column width computed per table instead of a fixed padEnd(20): a long name (e.g.
        // workflow_correlation_id) would otherwise run directly into the %type anchor with no separator.
        const tRecWidth = Math.max(20, ...paramCols.map(({ name }) => name.length + 1));
        r += `${tab}type t_rec is record (\n`;
        r += paramCols.map(({ name }) => `${tab}${tab}${name.padEnd(tRecWidth)}${tbl}.${name}%type`).join(',\n') + '\n';
        r += `${tab});\n\n`;

        r += `${tab}function get (\n`;
        r += `${tab}${tab}p_id           in ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in number   default ${lockDef.timeout}\n`;
        r += `${tab}) return ${tbl}%rowtype;\n\n`;

        r += `${tab}function get_all return sys_refcursor;\n\n`;

        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype;\n\n`;
        }

        r += `${tab}procedure create_rec (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}x_id  out ${tbl}.${pkNm}%type\n`;
        r += `${tab});\n\n`;

        if (isVersioned) {
            r += `${tab}procedure close_version (\n`;
            r += `${tab}${tab}p_id       in     ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;
        } else if (isImmutable) {
            // No update_rec/delete_rec — append-only.
        } else {
            r += `${tab}procedure update_rec (\n`;
            r += `${tab}${tab}p_id  in ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_rec in t_rec`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;

            r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type);\n\n`;
        }
        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            // /businesskey: navigate by business key instead of by the surrogate PK of
            // one specific version row, and change_rec() atomically closes the current
            // version and opens the next one — the two-call sequence (close_version then
            // create_rec) a caller would otherwise have to orchestrate by hand.
            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return sys_refcursor;\n\n`;

            r += `${tab}procedure change_rec (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(10)} in     ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_rec         in     t_rec,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab});\n\n`;
        }
        const bridge = this._bridgeCols(node);
        if (bridge !== null) {
            // /bridge: grant_<rightLabel> is idempotent — granting an already-granted
            // pair succeeds and returns the existing row's id, it never raises
            // [DUPLICATE] (the unique constraint from generator.ts is what makes a
            // concurrent duplicate grant detectable at all, not just this check-first
            // path). All four names derive from the second /fk column (grant_role,
            // not grant_role_id) — see _bridgeCols.
            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(10)} in     ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(10)} in     ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}function has_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean;\n\n`;
            r += `${tab}function list_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type) return sys_refcursor;\n\n`;
        }
        r += `end ${this._bare(svc)};\n/\n`;
        return r;
    }

    private _generateSvcBody(node: IDdlNode, hasDal: boolean, hasHks: boolean): string {
        const model       = this.tableApi.analyze(node);
        const tbl         = model.names.table;
        const dal         = model.names.dal;
        const hk          = model.names.hooks;
        const svc         = model.names.service;
        const aud         = model.names.audit;
        const pkNm        = model.names.pk;
        const hasVer      = model.features.versionColumn;
        const hasUniq     = this._hasUniqueCol(node);
        const hasAuditLog = model.features.auditLog;
        const paramCols   = model.columns.parameters;
        const uniqueCols  = model.columns.unique;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        const vtCol       = model.versionToColumn;
        const dimCols     = model.dimensionScopes;
        const lockDef     = model.lockDefaults;

        const getById      = hasDal ? `${dal}.get_by_id`       : 'p_get_by_id';
        const lockById     = hasDal ? `${dal}.lock_by_id`      : 'p_lock_by_id';
        const lockByIdWait = hasDal ? `${dal}.lock_by_id_wait` : 'p_lock_by_id_wait';
        const getAll    = hasDal ? `${dal}.get_all`     : 'p_get_all';
        const insertRow = hasDal ? `${dal}.insert_row`  : 'p_insert_row';
        const updateRow = hasDal ? `${dal}.update_row`  : 'p_update_row';
        const deleteRow = hasDal ? `${dal}.delete_row`  : 'p_delete_row';
        const closeRow  = hasDal ? `${dal}.close_row`   : 'p_close_row';
        const getCurrentRow = hasDal ? `${dal}.get_current` : 'p_get_current';
        const getAsOfRow    = hasDal ? `${dal}.get_as_of`   : 'p_get_as_of';
        const historyCur    = hasDal ? `${dal}.history`     : 'p_history';
        const grantRow  = hasDal ? `${dal}.grant_row`  : 'p_grant_row';
        const revokeRow = hasDal ? `${dal}.revoke_row` : 'p_revoke_row';
        const hasRow    = hasDal ? `${dal}.has_row`    : 'p_has_row';
        const listRow   = hasDal ? `${dal}.list_row`   : 'p_list_row';
        const bridge    = this._bridgeCols(node);
        const hkCall    = (proc: string) => hasHks ? `${hk}.${proc}` : `p_${proc}`;

        let r = `create or replace package body ${svc} as\n`;

        if (!hasDal) r += this._generatePrivateDml(node);
        if (!hasHks) r += this._generatePrivateHookStubs(node);
        r += '\n';

        // get — routes to get_by_id / lock_by_id / lock_by_id_wait based on p_lock
        r += `${tab}function get (\n`;
        r += `${tab}${tab}p_id           in ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in number   default ${lockDef.timeout}\n`;
        r += `${tab}) return ${tbl}%rowtype is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_lock = 'nowait' then\n`;
        r += `${tab}${tab}${tab}return ${lockById}(p_id => p_id);\n`;
        r += `${tab}${tab}elsif p_lock = 'wait' then\n`;
        r += `${tab}${tab}${tab}return ${lockByIdWait}(p_id => p_id, p_timeout => p_lock_timeout);\n`;
        r += `${tab}${tab}else\n`;
        r += `${tab}${tab}${tab}return ${getById}(p_id => p_id);\n`;
        r += `${tab}${tab}end if;\n`;
        r += `${tab}end get;\n\n`;

        // get_all
        r += `${tab}function get_all return sys_refcursor is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}return ${getAll};\n`;
        r += `${tab}end get_all;\n\n`;

        // get_by_<unique> — one per /unique column; plain read, no locking variant
        // (DAL itself has none either — only the PK gets lock_by_id/lock_by_id_wait).
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const getByCol = hasDal ? `${dal}.get_by_${cn}` : `p_get_by_${cn}`;
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${getByCol}(p_${cn} => p_${cn});\n`;
            r += `${tab}end get_by_${cn};\n\n`;
        }

        // p_do_create — private
        r += `${tab}procedure p_do_create (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}l_row in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is\n`;
        r += `${tab}begin\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}l_row.${name} := p_rec.${name};\n`;
        r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
        if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
        r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
        r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
        r += `${tab}${tab}${insertRow}(p_row => l_row);\n`;
        r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
        if (hasAuditLog) r += `${tab}${tab}${aud}.log_insert(p_row => l_row);\n`;
        r += `${tab}end p_do_create;\n\n`;

        // create_rec — public
        r += `${tab}procedure create_rec (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}x_id  out ${tbl}.${pkNm}%type\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}p_do_create(p_rec => p_rec, l_row => l_row);\n`;
        r += `${tab}${tab}x_id := l_row.${pkNm};\n`;
        if (hasUniq) {
            r += `${tab}exception\n`;
            r += `${tab}${tab}when dup_val_on_index then\n`;
            r += `${tab}${tab}${tab}raise_application_error(-20010, '[DUPLICATE] duplicate value on unique constraint.');\n`;
        }
        r += `${tab}end create_rec;\n\n`;

        if (isVersioned) {
            // close_version — narrows the TAPI for temporally-versioned tables
            r += `${tab}procedure close_version (\n`;
            r += `${tab}${tab}p_id       in     ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getById}(p_id => p_id);\n`;
            r += `${tab}${tab}l_row.${vtCol} := p_${vtCol};\n`;
            if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_close')}(p_row => l_row);\n`;
            r += `${tab}${tab}${closeRow}(p_id => p_id, p_${vtCol} => l_row.${vtCol}, p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_close')}(p_row => l_row);\n`;
            r += `${tab}end close_version;\n\n`;
        } else if (isImmutable) {
            // No update_rec/delete_rec — append-only (see _generatePrivateDml/_generateDalBody
            // for the same narrowing at the layers below).
        } else {
            // update_rec
            r += `${tab}procedure update_rec (\n`;
            r += `${tab}${tab}p_id  in ${tbl}.${pkNm}%type,\n`;
            r += `${tab}${tab}p_rec in t_rec`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version in ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            if (hasAuditLog) r += `${tab}${tab}l_old_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getById}(p_id => p_id);\n`;
            if (hasAuditLog) r += `${tab}${tab}l_old_row := l_row;\n`;
            for (const { name } of paramCols)
                r += `${tab}${tab}l_row.${name} := p_rec.${name};\n`;
            if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'update', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'update', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_update')}(p_row => l_row);\n`;
            r += `${tab}${tab}${updateRow}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_update')}(p_row => l_row);\n`;
            if (hasAuditLog) r += `${tab}${tab}${aud}.log_update(p_old_row => l_old_row, p_new_row => l_row);\n`;
            r += `${tab}end update_rec;\n\n`;

            // delete_rec — the row is always fetched first (get_by_id) so that
            // validate('delete', ...) can finally run on delete too — until now the only
            // operation validate() never covered.
            r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getById}(p_id => p_id);\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'delete', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'delete', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_delete')}(p_id => p_id);\n`;
            r += `${tab}${tab}${deleteRow}(p_id => p_id);\n`;
            r += `${tab}${tab}${hkCall('after_delete')}(p_id => p_id);\n`;
            if (hasAuditLog) r += `${tab}${tab}${aud}.log_delete(p_old_row => l_row);\n`;
            r += `${tab}end delete_rec;\n\n`;
        }

        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${getCurrentRow}(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}end get_current;\n\n`;

            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${getAsOfRow}(p_${bkCol} => p_${bkCol}, p_as_of => p_as_of);\n`;
            r += `${tab}end get_as_of;\n\n`;

            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return sys_refcursor is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${historyCur}(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}end history;\n\n`;

            // change_rec — closes the current version as of p_<vtCol>, then opens the next
            // one via create_rec (so RBAC/validation/hooks/audit run exactly as they would
            // for a plain create). p_rec.<key> is overwritten with p_<key>, not read from
            // it: the business key is authoritative from the lookup argument, never from
            // whatever the caller happened to leave in p_rec.<key>. The two writes are not
            // wrapped in their own transaction control here (same rule as every other
            // _svc procedure in this project): the caller's transaction covers both, and a
            // failure between them rolls back the whole change_rec, not just half of it.
            r += `${tab}procedure change_rec (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(10)} in     ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_rec         in     t_rec,\n`;
            r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_current ${tbl}%rowtype;\n`;
            r += `${tab}${tab}l_rec     t_rec := p_rec;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_current := get_current(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}${tab}l_rec.${bkCol} := p_${bkCol};\n`;
            r += `${tab}${tab}close_version(\n`;
            r += `${tab}${tab}${tab}p_id       => l_current.${pkNm},\n`;
            r += `${tab}${tab}${tab}p_${vtCol} => p_${vtCol}`;
            if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => l_current.row_version`;
            r += `\n${tab}${tab});\n`;
            r += `${tab}${tab}create_rec(p_rec => l_rec, x_id => x_id);\n`;
            r += `${tab}end change_rec;\n\n`;
        }

        if (bridge !== null) {
            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(10)} in     ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(10)} in     ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}x_id          out    ${tbl}.${pkNm}%type\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
            r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'grant', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'grant', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_grant')}(p_row => l_row);\n`;
            r += `${tab}${tab}${grantRow}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_grant')}(p_row => l_row);\n`;
            r += `${tab}${tab}x_id := l_row.${pkNm};\n`;
            r += `${tab}exception\n`;
            r += `${tab}${tab}when dup_val_on_index then\n`;
            r += `${tab}${tab}${tab}select ${pkNm} into x_id from ${tbl}_rls where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right};\n`;
            r += `${tab}end grant_${bridge.rightLabel};\n\n`;

            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
            r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'revoke', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'revoke', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_revoke')}(p_row => l_row);\n`;
            r += `${tab}${tab}${revokeRow}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            r += `${tab}${tab}${hkCall('after_revoke')}(p_row => l_row);\n`;
            r += `${tab}end revoke_${bridge.rightLabel};\n\n`;

            r += `${tab}function has_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${hasRow}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            r += `${tab}end has_${bridge.rightLabel};\n\n`;

            r += `${tab}function list_${bridge.rightLabel} (p_${bridge.left} in ${tbl}.${bridge.left}%type) return sys_refcursor is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}return ${listRow}(p_${bridge.left} => p_${bridge.left});\n`;
            r += `${tab}end list_${bridge.rightLabel};\n\n`;
        }

        r += `end ${this._bare(svc)};\n/\n`;
        return r;
    }

    private _generateAppSpec(node: IDdlNode): string {
        const model           = this.tableApi.analyze(node);
        const tbl             = model.names.table;
        const app             = model.names.app;
        const pkNm            = model.names.pk;
        const hasVer          = model.features.versionColumn;
        const hasAudit        = model.features.auditColumns;
        const paramCols       = model.columns.parameters;
        const uniqueCols      = model.columns.unique;
        const pkIsUserDefined = model.pkIsUserDefined;
        const isVersioned     = model.features.versioned;
        const isImmutable     = model.features.immutable;
        const vtCol           = model.versionToColumn;
        // Flat parameter list excludes the PK — it is always handled via the explicit p_id
        // parameter below, never duplicated as p_<pkNm> too (would collide when pkNm is "id",
        // and is redundant information under two names otherwise).
        const appCols         = paramCols.filter(({ name }) => name !== pkNm);
        const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
        const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
        const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
        const lockDef      = model.lockDefaults;

        // Column width computed per table instead of a fixed padEnd(13): a long name would
        // otherwise run directly into the %type anchor with no separator.
        const auditCols  = hasAudit ? [createdCol, createdByCol, updatedCol, updatedByCol] : [];
        const appPadWidth = Math.max(13, ...appCols.map(({ name }) => name.length + 1),
                                          ...auditCols.map(n => n.length + 1));

        let r = `create or replace package ${app} as\n\n`;

        // get: loads one row into OUT params — APEX Invoke API maps them to page items
        r += `${tab}procedure get (\n`;
        r += `${tab}${tab}p_id           in  ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in  varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in  number   default ${lockDef.timeout}`;
        for (const { name } of appCols)
            r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
        if (hasVer)
            r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
        if (hasAudit) {
            r += `,\n${tab}${tab}p_${createdCol.padEnd(appPadWidth)} out ${tbl}.${createdCol}%type`;
            r += `,\n${tab}${tab}p_${createdByCol.padEnd(appPadWidth)} out ${tbl}.${createdByCol}%type`;
            r += `,\n${tab}${tab}p_${updatedCol.padEnd(appPadWidth)} out ${tbl}.${updatedCol}%type`;
            r += `,\n${tab}${tab}p_${updatedByCol.padEnd(appPadWidth)} out ${tbl}.${updatedByCol}%type`;
        }
        r += `\n${tab});\n\n`;

        // get_by_<unique>: same OUT shape as get(), but keyed by the unique column
        // instead of p_id — which is added to the OUT list (new information the caller
        // didn't have going in) and excluded from it under its own name (redundant,
        // it's already the IN argument).
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const otherCols = appCols.filter(({ name }) => name !== cn);
            r += `${tab}procedure get_by_${cn} (\n`;
            r += `${tab}${tab}p_${cn.padEnd(appPadWidth)} in  ${tbl}.${cn}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            for (const { name } of otherCols)
                r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            if (hasAudit) {
                r += `,\n${tab}${tab}p_${createdCol.padEnd(appPadWidth)} out ${tbl}.${createdCol}%type`;
                r += `,\n${tab}${tab}p_${createdByCol.padEnd(appPadWidth)} out ${tbl}.${createdByCol}%type`;
                r += `,\n${tab}${tab}p_${updatedCol.padEnd(appPadWidth)} out ${tbl}.${updatedCol}%type`;
                r += `,\n${tab}${tab}p_${updatedByCol.padEnd(appPadWidth)} out ${tbl}.${updatedByCol}%type`;
            }
            r += `\n${tab});\n\n`;
        }

        // ins: for a user-defined PK, p_id is IN (caller supplies the key); for an
        // auto-generated PK, p_id is OUT (server-generated key returned to the caller).
        r += `${tab}procedure ins (\n`;
        const insLines: string[] = [];
        if (pkIsUserDefined) insLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
        for (const { name, nullable } of appCols)
            insLines.push(`${tab}${tab}p_${name.padEnd(appPadWidth)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
        if (!pkIsUserDefined) insLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
        r += insLines.join(',\n') + `\n${tab});\n\n`;

        if (isVersioned) {
            // close: replaces upd + del for temporally-versioned tables
            r += `${tab}procedure close (\n`;
            const closeLines: string[] = [];
            closeLines.push(`${tab}${tab}p_id           in     ${tbl}.${pkNm}%type`);
            closeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in     ${tbl}.${vtCol}%type default systimestamp`);
            if (hasVer) closeLines.push(`${tab}${tab}p_row_version  in     ${tbl}.row_version%type`);
            r += closeLines.join(',\n') + `\n${tab});\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            // upd: p_row_version only when /rowversion is active
            r += `${tab}procedure upd (\n`;
            const updLines: string[] = [];
            updLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
            for (const { name, nullable } of appCols)
                updLines.push(`${tab}${tab}p_${name.padEnd(appPadWidth)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
            if (hasVer) updLines.push(`${tab}${tab}p_row_version  in  ${tbl}.row_version%type`);
            r += updLines.join(',\n') + `\n${tab});\n\n`;

            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type);\n\n`;
        }
        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            // get_current/get_as_of: same OUT shape as get() — the business key column
            // itself is excluded from the OUT list (it's already the IN lookup argument),
            // p_id is added to the OUT list (unlike get(), where it's the IN argument, here
            // it's new information the caller didn't have going in).
            const lookupCols = appCols.filter(({ name }) => name !== bkCol);
            r += `${tab}procedure get_current (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            for (const { name } of lookupCols)
                r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;

            r += `${tab}procedure get_as_of (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_as_of        in  timestamp,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            for (const { name } of lookupCols)
                r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab});\n\n`;

            // change_rec: same flat IN shape as ins() (appCols already include p_<key>
            // at its natural position) plus p_<vtCol> and the new version's p_id OUT.
            r += `${tab}procedure change_rec (\n`;
            const changeLines: string[] = [];
            for (const { name, nullable } of appCols)
                changeLines.push(`${tab}${tab}p_${name.padEnd(appPadWidth)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
            changeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in  ${tbl}.${vtCol}%type default systimestamp`);
            changeLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
            r += changeLines.join(',\n') + `\n${tab});\n\n`;
        }
        const bridge = this._bridgeCols(node);
        if (bridge !== null) {
            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(13)} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(13)} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab});\n\n`;
            r += `${tab}procedure has_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_result       out boolean\n`;
            r += `${tab});\n\n`;
            // No list_<rightLabel> here — a multi-row cursor has no honest shape as flat
            // OUT parameters (same reasoning as /businesskey's history, absent at _app).
        }
        r += `end ${this._bare(app)};\n/\n`;
        return r;
    }

    private _generateAppBody(node: IDdlNode, hasSvc: boolean, _hasDal: boolean, hasHks: boolean): string {
        const model           = this.tableApi.analyze(node);
        const tbl             = model.names.table;
        const svc             = model.names.service;
        const hk              = model.names.hooks;
        const app             = model.names.app;
        const pkNm            = model.names.pk;
        const hasVer          = model.features.versionColumn;
        const hasAudit        = model.features.auditColumns;
        const hasUniq   = this._hasUniqueCol(node);
        const paramCols       = model.columns.parameters;
        const uniqueCols      = model.columns.unique;
        const pkIsUserDefined = model.pkIsUserDefined;
        const isVersioned     = model.features.versioned;
        const isImmutable     = model.features.immutable;
        const vtCol           = model.versionToColumn;
        const dimCols         = model.dimensionScopes;
        const appCols         = paramCols.filter(({ name }) => name !== pkNm);
        const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
        const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
        const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
        const lockDef      = model.lockDefaults;
        const hkCall    = (proc: string) => hasHks ? `${hk}.${proc}` : `p_${proc}`;

        // Column width computed per table instead of a fixed padEnd(13) — same reasoning as _generateAppSpec.
        const auditColsBody = hasAudit ? [createdCol, createdByCol, updatedCol, updatedByCol] : [];
        const appPadWidth = Math.max(13, ...appCols.map(({ name }) => name.length + 1),
                                          ...auditColsBody.map(n => n.length + 1));

        let r = `create or replace package body ${app} as\n`;

        // Degraded: absorb private DML + (if !hasHks) private hook stubs
        if (!hasSvc) {
            r += this._generatePrivateDml(node);
            if (!hasHks) r += this._generatePrivateHookStubs(node);
            r += '\n';
        }

        // get — p_lock ('none'|'nowait'|'wait') controls optimistic vs pessimistic fetch
        r += `\n${tab}procedure get (\n`;
        r += `${tab}${tab}p_id           in  ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_lock         in  varchar2 default '${lockDef.lock}',\n`;
        r += `${tab}${tab}p_lock_timeout in  number   default ${lockDef.timeout}`;
        for (const { name } of appCols)
            r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
        if (hasVer)
            r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
        if (hasAudit) {
            r += `,\n${tab}${tab}p_${createdCol.padEnd(appPadWidth)} out ${tbl}.${createdCol}%type`;
            r += `,\n${tab}${tab}p_${createdByCol.padEnd(appPadWidth)} out ${tbl}.${createdByCol}%type`;
            r += `,\n${tab}${tab}p_${updatedCol.padEnd(appPadWidth)} out ${tbl}.${updatedCol}%type`;
            r += `,\n${tab}${tab}p_${updatedByCol.padEnd(appPadWidth)} out ${tbl}.${updatedByCol}%type`;
        }
        r += `\n${tab}) is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_id is null then return; end if;  -- INSERT mode: leave OUT params null\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_row := ${svc}.get(p_id => p_id, p_lock => p_lock, p_lock_timeout => p_lock_timeout);\n`;
        } else {
            r += `${tab}${tab}if p_lock = 'nowait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id(p_id => p_id);\n`;
            r += `${tab}${tab}elsif p_lock = 'wait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id_wait(p_id => p_id, p_timeout => p_lock_timeout);\n`;
            r += `${tab}${tab}else\n`;
            r += `${tab}${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
            r += `${tab}${tab}end if;\n`;
        }
        for (const { name } of appCols)
            r += `${tab}${tab}p_${name} := l_row.${name};\n`;
        if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
        if (hasAudit) {
            r += `${tab}${tab}p_${createdCol} := l_row.${createdCol};\n`;
            r += `${tab}${tab}p_${createdByCol} := l_row.${createdByCol};\n`;
            r += `${tab}${tab}p_${updatedCol} := l_row.${updatedCol};\n`;
            r += `${tab}${tab}p_${updatedByCol} := l_row.${updatedByCol};\n`;
        }
        r += `${tab}end get;\n\n`;

        // get_by_<unique> — same OUT shape as get(), keyed by the unique column;
        // p_id (new information) is OUT here instead of the IN argument it is in get().
        const getByColCall = (cn: string) => hasSvc ? `${svc}.get_by_${cn}` : `p_get_by_${cn}`;
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const otherCols = appCols.filter(({ name }) => name !== cn);
            r += `${tab}procedure get_by_${cn} (\n`;
            r += `${tab}${tab}p_${cn.padEnd(appPadWidth)} in  ${tbl}.${cn}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            for (const { name } of otherCols)
                r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            if (hasAudit) {
                r += `,\n${tab}${tab}p_${createdCol.padEnd(appPadWidth)} out ${tbl}.${createdCol}%type`;
                r += `,\n${tab}${tab}p_${createdByCol.padEnd(appPadWidth)} out ${tbl}.${createdByCol}%type`;
                r += `,\n${tab}${tab}p_${updatedCol.padEnd(appPadWidth)} out ${tbl}.${updatedCol}%type`;
                r += `,\n${tab}${tab}p_${updatedByCol.padEnd(appPadWidth)} out ${tbl}.${updatedByCol}%type`;
            }
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getByColCall(cn)}(p_${cn} => p_${cn});\n`;
            r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            for (const { name } of otherCols)
                r += `${tab}${tab}p_${name} := l_row.${name};\n`;
            if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
            if (hasAudit) {
                r += `${tab}${tab}p_${createdCol} := l_row.${createdCol};\n`;
                r += `${tab}${tab}p_${createdByCol} := l_row.${createdByCol};\n`;
                r += `${tab}${tab}p_${updatedCol} := l_row.${updatedCol};\n`;
                r += `${tab}${tab}p_${updatedByCol} := l_row.${updatedByCol};\n`;
            }
            r += `${tab}end get_by_${cn};\n\n`;
        }

        // ins — for a user-defined PK, p_id is IN (caller supplies the key);
        //       for an auto-generated PK, p_id is OUT (server-generated key returned to the caller)
        r += `${tab}procedure ins (\n`;
        const insLines: string[] = [];
        if (pkIsUserDefined) insLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
        for (const { name, nullable } of appCols)
            insLines.push(`${tab}${tab}p_${name.padEnd(appPadWidth)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
        if (!pkIsUserDefined) insLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
        r += insLines.join(',\n') + `\n${tab}) is\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_xid ${tbl}.${pkNm}%type;\n`;
            r += `${tab}begin\n`;
            for (const { name } of appCols)
                r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
            if (pkIsUserDefined) {
                r += `${tab}${tab}l_rec.${pkNm} := p_id;\n`;
                r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => l_xid);\n`;
            } else {
                r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => p_id);\n`;
            }
        } else {
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            for (const { name } of appCols)
                r += `${tab}${tab}l_row.${name} := p_${name};\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_row.${pkNm} := p_id;\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
            r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
            if (!pkIsUserDefined) r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            if (hasUniq) {
                r += `${tab}exception\n`;
                r += `${tab}${tab}when dup_val_on_index then\n`;
                r += `${tab}${tab}${tab}raise_application_error(-20010, '[DUPLICATE] duplicate value on unique constraint.');\n`;
            }
        }
        r += `${tab}end ins;\n\n`;

        if (isVersioned) {
            // close — narrows the APEX API for temporally-versioned tables
            r += `${tab}procedure close (\n`;
            const closeLines: string[] = [];
            closeLines.push(`${tab}${tab}p_id           in     ${tbl}.${pkNm}%type`);
            closeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in     ${tbl}.${vtCol}%type default systimestamp`);
            if (hasVer) closeLines.push(`${tab}${tab}p_row_version  in     ${tbl}.row_version%type`);
            r += closeLines.join(',\n') + `\n${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}begin\n`;
                r += `${tab}${tab}${svc}.close_version(\n`;
                r += `${tab}${tab}${tab}p_id => p_id,\n`;
                r += `${tab}${tab}${tab}p_${vtCol} => p_${vtCol}`;
                if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => p_row_version`;
                r += `\n${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
                r += `${tab}${tab}l_row.${vtCol} := p_${vtCol};\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_close')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_close_row(p_id => p_id, p_${vtCol} => l_row.${vtCol}, p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_close')}(p_row => l_row);\n`;
            }
            r += `${tab}end close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            // upd
            r += `${tab}procedure upd (\n`;
            const updLines: string[] = [];
            updLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
            for (const { name, nullable } of appCols)
                updLines.push(`${tab}${tab}p_${name.padEnd(appPadWidth)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
            if (hasVer) updLines.push(`${tab}${tab}p_row_version  in  ${tbl}.row_version%type`);
            r += updLines.join(',\n') + `\n${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
                r += `${tab}begin\n`;
                for (const { name } of appCols)
                    r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
                r += `${tab}${tab}${svc}.update_rec(\n`;
                r += `${tab}${tab}${tab}p_id  => p_id,\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec`;
                if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => p_row_version`;
                r += `\n${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
                for (const { name } of appCols)
                    r += `${tab}${tab}l_row.${name} := p_${name};\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'update', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'update', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_update')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_update_row(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_update')}(p_row => l_row);\n`;
                if (hasUniq) {
                    r += `${tab}exception\n`;
                    r += `${tab}${tab}when dup_val_on_index then\n`;
                    r += `${tab}${tab}${tab}raise_application_error(-20010, '[DUPLICATE] duplicate value on unique constraint.');\n`;
                }
            }
            r += `${tab}end upd;\n\n`;

            // del
            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type) is\n`;
            if (!hasSvc) r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            if (hasSvc) {
                r += `${tab}${tab}${svc}.delete_rec(p_id => p_id);\n`;
            } else {
                r += `${tab}${tab}l_row := p_get_by_id(p_id => p_id);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'delete', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'delete', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_delete')}(p_id => p_id);\n`;
                r += `${tab}${tab}p_delete_row(p_id => p_id);\n`;
                r += `${tab}${tab}${hkCall('after_delete')}(p_id => p_id);\n`;
            }
            r += `${tab}end del;\n\n`;
        }

        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            const lookupCols = appCols.filter(({ name }) => name !== bkCol);
            const getCurrentCall = hasSvc ? `${svc}.get_current` : 'p_get_current';
            const getAsOfCall    = hasSvc ? `${svc}.get_as_of`   : 'p_get_as_of';

            r += `${tab}procedure get_current (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            for (const { name } of lookupCols)
                r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getCurrentCall}(p_${bkCol} => p_${bkCol});\n`;
            r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            for (const { name } of lookupCols)
                r += `${tab}${tab}p_${name} := l_row.${name};\n`;
            if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
            r += `${tab}end get_current;\n\n`;

            r += `${tab}procedure get_as_of (\n`;
            r += `${tab}${tab}p_${bkCol.padEnd(appPadWidth)} in  ${tbl}.${bkCol}%type,\n`;
            r += `${tab}${tab}p_as_of        in  timestamp,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type`;
            for (const { name } of lookupCols)
                r += `,\n${tab}${tab}p_${name.padEnd(appPadWidth)} out ${tbl}.${name}%type`;
            if (hasVer) r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
            r += `\n${tab}) is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getAsOfCall}(p_${bkCol} => p_${bkCol}, p_as_of => p_as_of);\n`;
            r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            for (const { name } of lookupCols)
                r += `${tab}${tab}p_${name} := l_row.${name};\n`;
            if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
            r += `${tab}end get_as_of;\n\n`;

            r += `${tab}procedure change_rec (\n`;
            const changeLines: string[] = [];
            for (const { name, nullable } of appCols)
                changeLines.push(`${tab}${tab}p_${name.padEnd(appPadWidth)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
            changeLines.push(`${tab}${tab}p_${vtCol.padEnd(appPadWidth)} in  ${tbl}.${vtCol}%type default systimestamp`);
            changeLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
            r += changeLines.join(',\n') + `\n${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
                r += `${tab}begin\n`;
                for (const { name } of appCols)
                    r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
                r += `${tab}${tab}${svc}.change_rec(\n`;
                r += `${tab}${tab}${tab}p_${bkCol} => p_${bkCol},\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec,\n`;
                r += `${tab}${tab}${tab}p_${vtCol} => p_${vtCol},\n`;
                r += `${tab}${tab}${tab}x_id => p_id\n`;
                r += `${tab}${tab});\n`;
            } else {
                // No _svc to delegate to (lookup/lookup+hks tier): inline the same two
                // steps change_rec always does — close the current version, then insert
                // the next one — through the same private DML/hooks every other absorbed
                // operation on this tier already goes through.
                r += `${tab}${tab}l_current ${tbl}%rowtype;\n`;
                r += `${tab}${tab}l_row     ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_current := p_get_current(p_${bkCol} => p_${bkCol});\n`;
                r += `${tab}${tab}l_current.${vtCol} := p_${vtCol};\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_current);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('before_close')}(p_row => l_current);\n`;
                r += `${tab}${tab}p_close_row(p_id => l_current.${pkNm}, p_${vtCol} => l_current.${vtCol}, p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('after_close')}(p_row => l_current);\n`;
                for (const { name } of appCols)
                    r += `${tab}${tab}l_row.${name} := p_${name};\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
            }
            r += `${tab}end change_rec;\n\n`;
        }

        const bridge = this._bridgeCols(node);
        if (bridge !== null) {
            const grantCall  = hasSvc ? `${svc}.grant_${bridge.rightLabel}`  : `p_grant_row`;
            const revokeCall = hasSvc ? `${svc}.revoke_${bridge.rightLabel}` : `p_revoke_row`;
            const hasCall    = hasSvc ? `${svc}.has_${bridge.rightLabel}`    : `p_has_row`;

            r += `${tab}procedure grant_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left.padEnd(13)} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right.padEnd(13)} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_id           out ${tbl}.${pkNm}%type\n`;
            r += `${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}begin\n`;
                r += `${tab}${tab}${grantCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right}, x_id => p_id);\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
                r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'grant', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'grant', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_grant')}(p_row => l_row);\n`;
                r += `${tab}${tab}${grantCall}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_grant')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_id := l_row.${pkNm};\n`;
                r += `${tab}exception\n`;
                r += `${tab}${tab}when dup_val_on_index then\n`;
                r += `${tab}${tab}${tab}select ${pkNm} into p_id from ${tbl}_rls where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right};\n`;
            }
            r += `${tab}end grant_${bridge.rightLabel};\n\n`;

            r += `${tab}procedure revoke_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in ${tbl}.${bridge.right}%type\n`;
            r += `${tab}) is\n`;
            if (hasSvc) {
                r += `${tab}begin\n`;
                r += `${tab}${tab}${revokeCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            } else {
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row.${bridge.left} := p_${bridge.left};\n`;
                r += `${tab}${tab}l_row.${bridge.right} := p_${bridge.right};\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'revoke', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'revoke', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_revoke')}(p_row => l_row);\n`;
                r += `${tab}${tab}${revokeCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
                r += `${tab}${tab}${hkCall('after_revoke')}(p_row => l_row);\n`;
            }
            r += `${tab}end revoke_${bridge.rightLabel};\n\n`;

            r += `${tab}procedure has_${bridge.rightLabel} (\n`;
            r += `${tab}${tab}p_${bridge.left} in  ${tbl}.${bridge.left}%type,\n`;
            r += `${tab}${tab}p_${bridge.right} in  ${tbl}.${bridge.right}%type,\n`;
            r += `${tab}${tab}p_result       out boolean\n`;
            r += `${tab}) is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}p_result := ${hasCall}(p_${bridge.left} => p_${bridge.left}, p_${bridge.right} => p_${bridge.right});\n`;
            r += `${tab}end has_${bridge.rightLabel};\n\n`;
        }

        r += `end ${this._bare(app)};\n/\n`;
        return r;
    }

    private _generateRstSpec(node: IDdlNode): string {
        const model = this.tableApi.analyze(node);
        const rst = model.names.rest;
        const isVersioned = model.features.versioned;
        const isImmutable = model.features.immutable;
        let r = `create or replace package ${rst} as\n\n`;
        r += `${tab}procedure get;\n`;
        r += `${tab}procedure get_all;\n`;
        for (const col of node.children.filter(c => c.isOption('unique')))
            r += `${tab}procedure get_by_${col.parseName().toLowerCase()};\n`;
        r += `${tab}procedure ins;\n`;
        if (isVersioned) {
            r += `${tab}procedure close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            r += `${tab}procedure upd;\n`;
            r += `${tab}procedure del;\n\n`;
        }
        if (this._businessKeyCol(node) !== '') {
            r += `${tab}procedure get_current;\n`;
            r += `${tab}procedure get_as_of;\n`;
            r += `${tab}procedure history;\n`;
            r += `${tab}procedure change_rec;\n\n`;
        }
        {
            const bridge = this._bridgeCols(node);
            if (bridge !== null) {
                r += `${tab}procedure grant_${bridge.rightLabel};\n`;
                r += `${tab}procedure revoke_${bridge.rightLabel};\n`;
                r += `${tab}procedure has_${bridge.rightLabel};\n`;
                r += `${tab}procedure list_${bridge.rightLabel};\n\n`;
            }
        }
        r += `end ${this._bare(rst)};\n/\n`;
        return r;
    }

    private _generateRstBody(node: IDdlNode, hasSvc: boolean, _hasDal: boolean, hasHks: boolean): string {
        const model           = this.tableApi.analyze(node);
        const tbl             = model.names.table;
        const svc             = model.names.service;
        const hk              = model.names.hooks;
        const rst             = model.names.rest;
        const pkNm            = model.names.pk;
        const hasVer          = model.features.versionColumn;
        const lockDef         = model.lockDefaults;
        const paramCols       = model.columns.parameters;
        const pkIsUserDefined = model.pkIsUserDefined;
        const isVersioned     = model.features.versioned;
        const isImmutable     = model.features.immutable;
        const vtCol           = model.versionToColumn;
        const dimCols         = model.dimensionScopes;
        // jsonCols/rstCols exclude the PK from the generic loop — it is always the first
        // json_object key (below) and, for ins, extracted from the body explicitly when
        // user-defined; for upd it is deliberately NOT re-extracted from the body (immutable,
        // comes only from :p_id — see the pkIsUserDefined branch in ins below).
        const rstCols   = paramCols.filter(({ name }) => name !== pkNm);
        const hkCall    = (proc: string) => hasHks ? `${hk}.${proc}` : `p_${proc}`;

        const jsonCols = [pkNm, ...rstCols.map(p => p.name)];
        if (hasVer) jsonCols.push('row_version');

        const excTail =
            `${tab}exception\n` +
            `${tab}${tab}when others then\n` +
            `${tab}${tab}${tab}rollback;\n` +
            `${tab}${tab}${tab}:status := case sqlcode\n` +
            `${tab}${tab}${tab}${tab}when -20001 then 409\n` +
            `${tab}${tab}${tab}${tab}when -20002 then 404\n` +
            `${tab}${tab}${tab}${tab}when -20003 then 409\n` +
            `${tab}${tab}${tab}${tab}else              500\n` +
            `${tab}${tab}${tab}end;\n` +
            `${tab}${tab}${tab}htp.p(json_object('error_code' value sqlcode, 'message' value sqlerrm, 'detail' value dbms_utility.format_error_backtrace));\n`;

        let r = `create or replace package body ${rst} as\n`;

        if (!hasSvc) {
            r += this._generatePrivateDml(node);
            if (!hasHks) r += this._generatePrivateHookStubs(node);
            r += '\n';
        }

        // get — optional ?lock=nowait|wait and ?lock_timeout=n ORDS bind params
        r += `\n${tab}procedure get is\n`;
        r += `${tab}${tab}l_row          ${tbl}%rowtype;\n`;
        r += `${tab}${tab}l_lock         varchar2(10) := nvl(:lock, '${lockDef.lock}');\n`;
        r += `${tab}${tab}l_lock_timeout number       := nvl(to_number(:lock_timeout), ${lockDef.timeout});\n`;
        r += `${tab}begin\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_row := ${svc}.get(p_id => :p_id, p_lock => l_lock, p_lock_timeout => l_lock_timeout);\n`;
        } else {
            r += `${tab}${tab}if l_lock = 'nowait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id(p_id => :p_id);\n`;
            r += `${tab}${tab}elsif l_lock = 'wait' then\n`;
            r += `${tab}${tab}${tab}l_row := p_lock_by_id_wait(p_id => :p_id, p_timeout => l_lock_timeout);\n`;
            r += `${tab}${tab}else\n`;
            r += `${tab}${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
            r += `${tab}${tab}end if;\n`;
        }
        r += `${tab}${tab}:status := 200;\n`;
        r += `${tab}${tab}htp.p(json_object(\n`;
        r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
        r += `${tab}${tab}${tab}returning clob\n`;
        r += `${tab}${tab}));\n`;
        r += excTail + `${tab}end get;\n\n`;

        // get_all
        r += `${tab}procedure get_all is\n`;
        r += `${tab}${tab}l_cur sys_refcursor;\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}${tab}l_sep varchar2(1) := '';\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}l_cur := ${hasSvc ? `${svc}.get_all` : 'p_get_all'};\n`;
        r += `${tab}${tab}htp.p('[');\n`;
        r += `${tab}${tab}loop\n`;
        r += `${tab}${tab}${tab}fetch l_cur into l_row;\n`;
        r += `${tab}${tab}${tab}exit when l_cur%notfound;\n`;
        r += `${tab}${tab}${tab}htp.p(l_sep || json_object(\n`;
        r += jsonCols.map(c => `${tab}${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
        r += `${tab}${tab}${tab}${tab}returning clob\n`;
        r += `${tab}${tab}${tab}));\n`;
        r += `${tab}${tab}${tab}l_sep := ',';\n`;
        r += `${tab}${tab}end loop;\n`;
        r += `${tab}${tab}close l_cur;\n`;
        r += `${tab}${tab}htp.p(']');\n`;
        r += `${tab}${tab}:status := 200;\n`;
        r += excTail + `${tab}end get_all;\n\n`;

        // get_by_<unique> — same JSON shape as get(), looked up by :p_<col> instead of :p_id
        for (const col of node.children.filter(c => c.isOption('unique'))) {
            const cn = col.parseName().toLowerCase();
            const getByColCall = hasSvc ? `${svc}.get_by_${cn}` : `p_get_by_${cn}`;
            r += `${tab}procedure get_by_${cn} is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getByColCall}(p_${cn} => :p_${cn});\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}));\n`;
            r += excTail + `${tab}end get_by_${cn};\n\n`;
        }

        // ins
        r += `${tab}procedure ins is\n`;
        r += `${tab}${tab}l_body clob := :body_text;\n`;
        if (hasSvc) {
            r += `${tab}${tab}l_rec  ${svc}.t_rec;\n`;
        } else {
            r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
        }
        r += `${tab}${tab}l_id   ${tbl}.${pkNm}%type;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
        r += `${tab}${tab}${tab}:status := 400;\n`;
        r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
        r += `${tab}${tab}${tab}return;\n`;
        r += `${tab}${tab}end if;\n`;
        if (hasSvc) {
            for (const { name } of rstCols)
                r += `${tab}${tab}l_rec.${name} := json_value(l_body, '$.${name}');\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_rec.${pkNm} := json_value(l_body, '$.${pkNm}');\n`;
            r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => l_id);\n`;
        } else {
            for (const { name } of rstCols)
                r += `${tab}${tab}l_row.${name} := json_value(l_body, '$.${name}');\n`;
            if (pkIsUserDefined) r += `${tab}${tab}l_row.${pkNm} := json_value(l_body, '$.${pkNm}');\n`;
            r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
            if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
            r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
            r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
            r += `${tab}${tab}l_id := l_row.${pkNm};\n`;
        }
        r += `${tab}${tab}:status := 201;\n`;
        r += `${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
        r += excTail + `${tab}end ins;\n\n`;

        if (isVersioned) {
            // close — close :p_id with valid_to from body (or systimestamp)
            r += `${tab}procedure close is\n`;
            r += `${tab}${tab}l_body clob := :body_text;\n`;
            if (hasSvc) {
                if (hasVer) r += `${tab}${tab}l_rv   ${tbl}.row_version%type;\n`;
                r += `${tab}begin\n`;
                if (hasVer) {
                    r += `${tab}${tab}l_rv := json_value(l_body, '$.row_version' returning ${tbl}.row_version%type);\n`;
                    r += `${tab}${tab}${svc}.close_version(\n`;
                    r += `${tab}${tab}${tab}p_id          => :p_id,\n`;
                    r += `${tab}${tab}${tab}p_${vtCol}     => coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp),\n`;
                    r += `${tab}${tab}${tab}p_row_version => l_rv\n`;
                    r += `${tab}${tab});\n`;
                } else {
                    r += `${tab}${tab}${svc}.close_version(\n`;
                    r += `${tab}${tab}${tab}p_id   => :p_id,\n`;
                    r += `${tab}${tab}${tab}p_${vtCol} => coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp)\n`;
                    r += `${tab}${tab});\n`;
                }
            } else {
                r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
                r += `${tab}${tab}l_row.${vtCol} := coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp);\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := json_value(l_body, '$.row_version' returning ${tbl}.row_version%type);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_close')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_close_row(p_id => :p_id, p_${vtCol} => l_row.${vtCol}, p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_close')}(p_row => l_row);\n`;
            }
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value :p_id));\n`;
            r += excTail;
            r += `${tab}end close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            // upd
            r += `${tab}procedure upd is\n`;
            r += `${tab}${tab}l_body clob := :body_text;\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec  ${svc}.t_rec;\n`;
            } else {
                r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
            }
            r += `${tab}begin\n`;
            r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
            r += `${tab}${tab}${tab}:status := 400;\n`;
            r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
            r += `${tab}${tab}${tab}return;\n`;
            r += `${tab}${tab}end if;\n`;
            if (hasSvc) {
                for (const { name } of rstCols)
                    r += `${tab}${tab}l_rec.${name} := json_value(l_body, '$.${name}');\n`;
                r += `${tab}${tab}${svc}.update_rec(\n`;
                r += `${tab}${tab}${tab}p_id  => :p_id,\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec`;
                if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => json_value(l_body, '$.row_version' returning ${tbl}.row_version%type)`;
                r += `\n${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
                for (const { name } of rstCols)
                    r += `${tab}${tab}l_row.${name} := json_value(l_body, '$.${name}');\n`;
                if (hasVer) r += `${tab}${tab}l_row.row_version := json_value(l_body, '$.row_version' returning ${tbl}.row_version%type);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'update', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'update', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_update')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_update_row(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_update')}(p_row => l_row);\n`;
            }
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value :p_id));\n`;
            r += excTail + `${tab}end upd;\n\n`;

            // del
            r += `${tab}procedure del is\n`;
            if (!hasSvc) r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            if (hasSvc) {
                r += `${tab}${tab}${svc}.delete_rec(p_id => :p_id);\n`;
            } else {
                r += `${tab}${tab}l_row := p_get_by_id(p_id => :p_id);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'delete', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'delete', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_delete')}(p_id => :p_id);\n`;
                r += `${tab}${tab}p_delete_row(p_id => :p_id);\n`;
                r += `${tab}${tab}${hkCall('after_delete')}(p_id => :p_id);\n`;
            }
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value :p_id));\n`;
            r += excTail + `${tab}end del;\n\n`;
        }

        const bkCol = this._businessKeyCol(node);
        if (bkCol !== '') {
            const getCurrentCall = hasSvc ? `${svc}.get_current` : 'p_get_current';
            const getAsOfCall    = hasSvc ? `${svc}.get_as_of`   : 'p_get_as_of';
            const historyCall    = hasSvc ? `${svc}.history`     : 'p_history';
            const changeCols     = rstCols.filter(({ name }) => name !== bkCol);

            // get_current — same JSON shape as get(), looked up by :p_<key> instead of :p_id
            r += `${tab}procedure get_current is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getCurrentCall}(p_${bkCol} => :p_${bkCol});\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}));\n`;
            r += excTail + `${tab}end get_current;\n\n`;

            // get_as_of — :as_of is an ORDS query-param bind, ISO-8601-ish
            // ('YYYY-MM-DDTHH24:MI:SS[.FF3]'); same JSON shape as get_current.
            r += `${tab}procedure get_as_of is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_row := ${getAsOfCall}(p_${bkCol} => :p_${bkCol}, p_as_of => to_timestamp(:as_of, 'YYYY-MM-DD"T"HH24:MI:SS.FF3'));\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += `${tab}${tab}htp.p(json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}));\n`;
            r += excTail + `${tab}end get_as_of;\n\n`;

            // history — JSON array of every version for :p_<key>, oldest first (same
            // fetch-loop shape as get_all).
            r += `${tab}procedure history is\n`;
            r += `${tab}${tab}l_cur sys_refcursor;\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}${tab}l_sep varchar2(1) := '';\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_cur := ${historyCall}(p_${bkCol} => :p_${bkCol});\n`;
            r += `${tab}${tab}htp.p('[');\n`;
            r += `${tab}${tab}loop\n`;
            r += `${tab}${tab}${tab}fetch l_cur into l_row;\n`;
            r += `${tab}${tab}${tab}exit when l_cur%notfound;\n`;
            r += `${tab}${tab}${tab}htp.p(l_sep || json_object(\n`;
            r += jsonCols.map(c => `${tab}${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
            r += `${tab}${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}${tab}));\n`;
            r += `${tab}${tab}${tab}l_sep := ',';\n`;
            r += `${tab}${tab}end loop;\n`;
            r += `${tab}${tab}close l_cur;\n`;
            r += `${tab}${tab}htp.p(']');\n`;
            r += `${tab}${tab}:status := 200;\n`;
            r += excTail + `${tab}end history;\n\n`;

            // change_rec — :p_<key> (bind) identifies the row to close; the body carries
            // the next version's attributes (key excluded — always :p_<key>, never the
            // body's own copy of it) and an optional close instant (defaults to now).
            r += `${tab}procedure change_rec is\n`;
            r += `${tab}${tab}l_body clob := :body_text;\n`;
            if (hasSvc) {
                r += `${tab}${tab}l_rec  ${svc}.t_rec;\n`;
            } else {
                r += `${tab}${tab}l_current ${tbl}%rowtype;\n`;
                r += `${tab}${tab}l_row     ${tbl}%rowtype;\n`;
            }
            r += `${tab}${tab}l_id   ${tbl}.${pkNm}%type;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
            r += `${tab}${tab}${tab}:status := 400;\n`;
            r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
            r += `${tab}${tab}${tab}return;\n`;
            r += `${tab}${tab}end if;\n`;
            if (hasSvc) {
                for (const { name } of changeCols)
                    r += `${tab}${tab}l_rec.${name} := json_value(l_body, '$.${name}');\n`;
                r += `${tab}${tab}${svc}.change_rec(\n`;
                r += `${tab}${tab}${tab}p_${bkCol} => :p_${bkCol},\n`;
                r += `${tab}${tab}${tab}p_rec => l_rec,\n`;
                r += `${tab}${tab}${tab}p_${vtCol} => coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp),\n`;
                r += `${tab}${tab}${tab}x_id => l_id\n`;
                r += `${tab}${tab});\n`;
            } else {
                r += `${tab}${tab}l_current := p_get_current(p_${bkCol} => :p_${bkCol});\n`;
                r += `${tab}${tab}l_current.${vtCol} := coalesce(json_value(l_body, '$.${vtCol}' returning ${tbl}.${vtCol}%type), systimestamp);\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'close', p_row => l_current);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'close', p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('before_close')}(p_row => l_current);\n`;
                r += `${tab}${tab}p_close_row(p_id => l_current.${pkNm}, p_${vtCol} => l_current.${vtCol}, p_row => l_current);\n`;
                r += `${tab}${tab}${hkCall('after_close')}(p_row => l_current);\n`;
                for (const { name } of changeCols)
                    r += `${tab}${tab}l_row.${name} := json_value(l_body, '$.${name}');\n`;
                r += `${tab}${tab}l_row.${bkCol} := :p_${bkCol};\n`;
                r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'insert', p_row => l_row);\n`;
                if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('validate')}(p_operation => 'insert', p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('before_insert')}(p_row => l_row);\n`;
                r += `${tab}${tab}p_insert_row(p_row => l_row);\n`;
                r += `${tab}${tab}${hkCall('after_insert')}(p_row => l_row);\n`;
                r += `${tab}${tab}l_id := l_row.${pkNm};\n`;
            }
            r += `${tab}${tab}:status := 201;\n`;
            r += `${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
            r += excTail + `${tab}end change_rec;\n\n`;
        }

        {
            const bridge = this._bridgeCols(node);
            if (bridge !== null) {
                const grantCall  = hasSvc ? `${svc}.grant_${bridge.rightLabel}`  : 'p_grant_row';
                const revokeCall = hasSvc ? `${svc}.revoke_${bridge.rightLabel}` : 'p_revoke_row';
                const hasCall    = hasSvc ? `${svc}.has_${bridge.rightLabel}`    : 'p_has_row';
                const listCall   = hasSvc ? `${svc}.list_${bridge.rightLabel}`   : 'p_list_row';

                // grant/revoke read both key columns from :body_text, same convention as
                // ins/upd — not from URI binds, so the two /fk values are never split
                // across path and body depending on which side is "the resource".
                r += `${tab}procedure grant_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_body clob := :body_text;\n`;
                r += `${tab}${tab}l_id   ${tbl}.${pkNm}%type;\n`;
                if (!hasSvc) r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
                r += `${tab}${tab}${tab}:status := 400;\n`;
                r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
                r += `${tab}${tab}${tab}return;\n`;
                r += `${tab}${tab}end if;\n`;
                if (hasSvc) {
                    r += `${tab}${tab}${grantCall}(\n`;
                    r += `${tab}${tab}${tab}p_${bridge.left} => json_value(l_body, '$.${bridge.left}'),\n`;
                    r += `${tab}${tab}${tab}p_${bridge.right} => json_value(l_body, '$.${bridge.right}'),\n`;
                    r += `${tab}${tab}${tab}x_id => l_id\n`;
                    r += `${tab}${tab});\n`;
                } else {
                    r += `${tab}${tab}l_row.${bridge.left} := json_value(l_body, '$.${bridge.left}');\n`;
                    r += `${tab}${tab}l_row.${bridge.right} := json_value(l_body, '$.${bridge.right}');\n`;
                    r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'grant', p_row => l_row);\n`;
                    if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('validate')}(p_operation => 'grant', p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('before_grant')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${grantCall}(p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('after_grant')}(p_row => l_row);\n`;
                    r += `${tab}${tab}l_id := l_row.${pkNm};\n`;
                }
                r += `${tab}${tab}:status := 201;\n`;
                r += `${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
                if (!hasSvc) {
                    r += `${tab}exception\n`;
                    r += `${tab}${tab}when dup_val_on_index then\n`;
                    r += `${tab}${tab}${tab}select ${pkNm} into l_id from ${tbl}_rls where ${bridge.left} = l_row.${bridge.left} and ${bridge.right} = l_row.${bridge.right};\n`;
                    r += `${tab}${tab}${tab}:status := 201;\n`;
                    r += `${tab}${tab}${tab}htp.p(json_object('${pkNm}' value l_id));\n`;
                    r += excTail.replace(`${tab}exception\n`, '');
                } else {
                    r += excTail;
                }
                r += `${tab}end grant_${bridge.rightLabel};\n\n`;

                r += `${tab}procedure revoke_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_body clob := :body_text;\n`;
                if (!hasSvc) r += `${tab}${tab}l_row  ${tbl}%rowtype;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}if l_body is null or not json_exists(l_body, '$') then\n`;
                r += `${tab}${tab}${tab}:status := 400;\n`;
                r += `${tab}${tab}${tab}htp.p(json_object('message' value 'request body must be valid json'));\n`;
                r += `${tab}${tab}${tab}return;\n`;
                r += `${tab}${tab}end if;\n`;
                if (hasSvc) {
                    r += `${tab}${tab}${revokeCall}(\n`;
                    r += `${tab}${tab}${tab}p_${bridge.left} => json_value(l_body, '$.${bridge.left}'),\n`;
                    r += `${tab}${tab}${tab}p_${bridge.right} => json_value(l_body, '$.${bridge.right}')\n`;
                    r += `${tab}${tab});\n`;
                } else {
                    r += `${tab}${tab}l_row.${bridge.left} := json_value(l_body, '$.${bridge.left}');\n`;
                    r += `${tab}${tab}l_row.${bridge.right} := json_value(l_body, '$.${bridge.right}');\n`;
                    r += `${tab}${tab}${hkCall('chk_rbac')}(p_operation => 'revoke', p_row => l_row);\n`;
                    if (dimCols.length > 0) r += `${tab}${tab}${hkCall('chk_rls')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('validate')}(p_operation => 'revoke', p_row => l_row);\n`;
                    r += `${tab}${tab}${hkCall('before_revoke')}(p_row => l_row);\n`;
                    r += `${tab}${tab}${revokeCall}(p_${bridge.left} => l_row.${bridge.left}, p_${bridge.right} => l_row.${bridge.right});\n`;
                    r += `${tab}${tab}${hkCall('after_revoke')}(p_row => l_row);\n`;
                }
                r += `${tab}${tab}:status := 200;\n`;
                r += `${tab}${tab}htp.p(json_object('status' value 'revoked'));\n`;
                r += excTail + `${tab}end revoke_${bridge.rightLabel};\n\n`;

                // has/list are GET-style reads — :p_<left>/:p_<right> binds, like get_by_<col>.
                r += `${tab}procedure has_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_result boolean;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_result := ${hasCall}(p_${bridge.left} => :p_${bridge.left}, p_${bridge.right} => :p_${bridge.right});\n`;
                r += `${tab}${tab}:status := 200;\n`;
                r += `${tab}${tab}htp.p(json_object('has' value (case when l_result then 1 else 0 end)));\n`;
                r += excTail + `${tab}end has_${bridge.rightLabel};\n\n`;

                r += `${tab}procedure list_${bridge.rightLabel} is\n`;
                r += `${tab}${tab}l_cur sys_refcursor;\n`;
                r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
                r += `${tab}${tab}l_sep varchar2(1) := '';\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}l_cur := ${listCall}(p_${bridge.left} => :p_${bridge.left});\n`;
                r += `${tab}${tab}htp.p('[');\n`;
                r += `${tab}${tab}loop\n`;
                r += `${tab}${tab}${tab}fetch l_cur into l_row;\n`;
                r += `${tab}${tab}${tab}exit when l_cur%notfound;\n`;
                r += `${tab}${tab}${tab}htp.p(l_sep || json_object(\n`;
                r += jsonCols.map(c => `${tab}${tab}${tab}${tab}'${c}' value l_row.${c}`).join(',\n') + '\n';
                r += `${tab}${tab}${tab}${tab}returning clob\n`;
                r += `${tab}${tab}${tab}));\n`;
                r += `${tab}${tab}${tab}l_sep := ',';\n`;
                r += `${tab}${tab}end loop;\n`;
                r += `${tab}${tab}close l_cur;\n`;
                r += `${tab}${tab}htp.p(']');\n`;
                r += `${tab}${tab}:status := 200;\n`;
                r += excTail + `${tab}end list_${bridge.rightLabel};\n\n`;
            }
        }

        r += `end ${this._bare(rst)};\n/\n`;
        return r;
    }

    private _generateAuditSpec(node: IDdlNode): string {
        const model = this.tableApi.analyze(node);
        const tbl = model.names.table;
        const aud = model.names.audit;
        let r = `create or replace package ${aud} as\n\n`;
        r += `${tab}g_enabled boolean := true;\n\n`;
        r += `${tab}procedure log_insert (p_row     in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype);\n\n`;
        r += `end ${this._bare(aud)};\n/\n`;
        return r;
    }

    private _generateAuditBody(node: IDdlNode, hasDal: boolean): string {
        const model    = this.tableApi.analyze(node);
        const tbl      = model.names.table;
        const dal      = model.names.dal;
        const aud      = model.names.audit;
        const pkName   = (node.getPkName() ?? 'id').toLowerCase();
        const auditLogName = String(node.getOptionValue('auditlog') || '').trim() || 'app_audit_log';
        const auditTbl = (this.ctx.objPrefix() + auditLogName).toLowerCase();
        const auditSvc = auditTbl + '_svc';
        const hasVer   = model.features.versionColumn;
        const fkCols   = model.columns.foreignKeys.map(f => f.toLowerCase());
        const svcCols  = model.columns.service.map(c => c.parseName().toLowerCase());

        // Detect whether the log table has old_values/new_values columns (Level 2 CDC).
        // Audit cols (DATE type: created/updated) are deliberately excluded from f_to_json
        // to avoid PLS-00684 — json_object does not handle DATE natively on all 19c versions.
        const auditLogNode = this.ctx.find(auditLogName);
        const hasCdcCols   = (auditLogNode?.children ?? [])
            .some(c => c.parseName().toLowerCase() === 'old_values');
        // Build the column list for f_to_json: pk + tenant_id + fks + business cols + row_version.
        // Audit metadata cols (created/updated) are excluded — they are DATE and not business state.
        const synTenantId = model.features.syntheticTenantId;
        const jsonCols = [pkName, ...(synTenantId ? ['tenant_id'] : []), ...fkCols, ...svcCols];
        if (hasVer) jsonCols.push('row_version');

        let r = `create or replace package body ${aud} as\n\n`;

        if (hasCdcCols) {
            // f_to_json — private; serialises a %rowtype snapshot to JSON for CDC logging
            const jsonPairs = jsonCols.map(c => `${tab}${tab}${tab}'${c}' value p_row.${c}`);
            r += `${tab}function f_to_json (p_row in ${tbl}%rowtype) return clob is\n`;
            r += `${tab}${tab}l_result clob;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select json_object(\n`;
            r += jsonPairs.join(',\n') + '\n';
            r += `${tab}${tab}${tab}returning clob\n`;
            r += `${tab}${tab}) into l_result from dual;\n`;
            r += `${tab}${tab}return l_result;\n`;
            r += `${tab}end f_to_json;\n\n`;
        }

        // p_log — private; autonomous transaction so audit survives caller rollback
        const audIdType = hasDal ? `${dal}.t_id` : `${tbl}.${pkName}%type`;
        r += `${tab}procedure p_log (\n`;
        r += `${tab}${tab}p_operation  in varchar2,\n`;
        r += `${tab}${tab}p_id         in ${audIdType}`;
        if (hasCdcCols) {
            r += `,\n${tab}${tab}p_old_values in clob default null,\n`;
            r += `${tab}${tab}p_new_values in clob default null\n`;
        } else {
            r += '\n';
        }
        r += `${tab}) is\n`;
        r += `${tab}${tab}pragma autonomous_transaction;\n`;
        r += `${tab}${tab}l_rec ${auditSvc}.t_rec;\n`;
        r += `${tab}${tab}l_id ${auditTbl}.id%type;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if not g_enabled then return; end if;\n`;
        r += `${tab}${tab}l_rec.entity    := '${tbl}';\n`;
        r += `${tab}${tab}l_rec.entity_id := p_id;\n`;
        r += `${tab}${tab}l_rec.operation := p_operation;\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}l_rec.old_values := p_old_values;\n`;
            r += `${tab}${tab}l_rec.new_values := p_new_values;\n`;
        }
        r += `${tab}${tab}${auditSvc}.create_rec(p_rec => l_rec, x_id => l_id);\n`;
        r += `${tab}${tab}-- l_id holds the generated audit record id.\n`;
        r += `${tab}${tab}-- use it here if needed, e.g. to notify, correlate, or route downstream:\n`;
        r += `${tab}${tab}-- your_pkg.on_audit(p_audit_id => l_id, p_entity => '${tbl}', p_operation => p_operation);\n`;
        r += `${tab}${tab}commit;\n`;
        r += `${tab}end p_log;\n\n`;

        r += `${tab}procedure log_insert (p_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'INSERT', p_id => p_row.${pkName}, p_new_values => f_to_json(p_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'INSERT', p_id => p_row.${pkName});\n`;
        }
        r += `${tab}end log_insert;\n\n`;

        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'UPDATE', p_id => p_new_row.${pkName}, p_old_values => f_to_json(p_old_row), p_new_values => f_to_json(p_new_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'UPDATE', p_id => p_new_row.${pkName});\n`;
        }
        r += `${tab}end log_update;\n\n`;

        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'DELETE', p_id => p_old_row.${pkName}, p_old_values => f_to_json(p_old_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'DELETE', p_id => p_old_row.${pkName});\n`;
        }
        r += `${tab}end log_delete;\n\n`;

        r += `end ${this._bare(aud)};\n/\n`;
        return r;
    }

    generateLayeredTAPI(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (node.children.length === 0) return '';

        const model = this.tableApi.analyze(node);
        const { hasDal, hasHks, hasSvc } = model.capabilities;
        const hasAudit = model.features.auditLog;
        const genApp = model.interfaces.app;
        const genRst = model.interfaces.rest;

        let r = '';
        // Emitted once, ahead of every package, unconditionally (every table gets its
        // _rls view now, not just dimension-scoped ones) and tier-independently:
        // whether reads live in _dal or are absorbed into whichever package sits
        // above the missing _dal, they need this view either way (see
        // _generateDimensionRlsView).
        const rlsView = this._generateDimensionRlsView(node);
        if (rlsView) r += rlsView + '\n';
        if (hasDal) r += this._generateDalSpec(node) + '\n' + this._generateDalBody(node) + '\n';
        if (hasHks) r += this._generateHksSpec(node, hasDal) + '\n' + this._generateHksBody(node, hasDal) + '\n';
        if (hasSvc) {
            r += this._generateSvcSpec(node) + '\n';
            // Audit spec must precede SVC body: SVC body references the audit package
            if (hasAudit) r += this._generateAuditSpec(node) + '\n';
            r += this._generateSvcBody(node, hasDal, hasHks) + '\n';
            if (hasAudit) r += this._generateAuditBody(node, hasDal) + '\n';
        }
        if (genApp) r += this._generateAppSpec(node) + '\n' + this._generateAppBody(node, hasSvc, hasDal, hasHks);
        if (genRst) {
            if (genApp) r += '\n';
            r += this._generateRstSpec(node) + '\n' + this._generateRstBody(node, hasSvc, hasDal, hasHks);
        }
        return r;
    }

    /**
     * /aggregate — a standalone `<master>_agg` package exposing add_/remove_/list_
     * per nested detail table, generated as an isolated SECOND PASS after every
     * table's own layered TAPI (see generator.ts's caller): each detail's own
     * _svc/_app package must already exist in the compiled script by the time this
     * one references it, and tree pre-order means a detail is only ever emitted
     * strictly after its parent — so this cannot be folded into generateLayeredTAPI
     * without either reordering the whole main loop or duplicating detail logic.
     *
     * Deliberately NOT wired into the master's own _app/_rst: this package is meant
     * to be called directly (same as any _svc package already is), keeping the
     * master's existing generation functions completely untouched — the lowest-risk
     * option for a feature that otherwise touches parent-child plumbing used
     * everywhere in the generator. Bulk/replace-style operations and multi-level
     * nesting (a detail that is itself a master) are out of scope for this cut.
     */
    generateAggregatePackage(node: IDdlNode): string {
        if (!node.isOption('aggregate')) return '';
        const details = this._aggregateDetails(node);
        if (details.length === 0) return '';

        const model = this.tableApi.analyze(node);
        const mTbl  = model.names.table;
        const mPkNm = model.names.pk;
        const agg   = mTbl + '_agg';
        const genApp = model.interfaces.app;

        type Detail = {
            detailNode: IDdlNode; detailTbl: string; fkCol: string;
            dPkNm: string; dSvc: string; dApp: string; dRls: string;
            cols: Array<{ name: string; nullable: boolean }>;
            pkIsUserDefined: boolean;
            hasSvc: boolean;
            canWrite: boolean;   // some flat-param create target exists (_svc or _app)
            canDelete: boolean;  // canWrite AND not /versioned or /immutable
        };
        const ds: Detail[] = details.map(({ detailNode, detailTbl, fkCol }) => {
            const { hasSvc } = this._tierInfo(detailNode);
            const canWrite = hasSvc || genApp;
            const narrowed = detailNode.isOption('versioned') || detailNode.isOption('immutable');
            return {
                detailNode, detailTbl, fkCol,
                dPkNm: (detailNode.getPkName() ?? 'id').toLowerCase(),
                dSvc: detailTbl + '_svc',
                dApp: detailTbl + '_app',
                dRls: detailTbl + '_rls',
                cols: this._svcParamCols(detailNode).filter(({ name }) => name !== fkCol),
                pkIsUserDefined: this._pkIsUserDefined(detailNode),
                hasSvc,
                canWrite,
                canDelete: canWrite && !narrowed,
            };
        });

        // Builds the padded IN/OUT parameter list shared by add_<detail>'s spec
        // and body declarations — same shape as _generateAppSpec's ins(), with
        // p_master_id standing in for the FK column (fixed by this package, never
        // caller-supplied for the FK field itself).
        const addParams = (d: Detail): string[] => {
            const names = ['master_id', ...(d.pkIsUserDefined ? [d.dPkNm] : []), ...d.cols.map(c => c.name)];
            const w = Math.max(13, ...names.map(n => n.length + 1));
            const lines: string[] = [`${tab}${tab}p_master_id`.padEnd(tab.length * 2 + 2 + w) + `in  ${mTbl}.${mPkNm}%type`];
            if (d.pkIsUserDefined)
                lines.push(`${tab}${tab}p_${d.dPkNm}`.padEnd(tab.length * 2 + 2 + w) + `in  ${d.detailTbl}.${d.dPkNm}%type`);
            for (const { name, nullable } of d.cols)
                lines.push(`${tab}${tab}p_${name}`.padEnd(tab.length * 2 + 2 + w) + `in  ${d.detailTbl}.${name}%type${nullable ? ' default null' : ''}`);
            if (!d.pkIsUserDefined)
                lines.push(`${tab}${tab}x_id`.padEnd(tab.length * 2 + 2 + w) + `out ${d.detailTbl}.${d.dPkNm}%type`);
            return lines;
        };

        // ── spec ─────────────────────────────────────────────────────────────
        let r = `create or replace package ${agg} as\n\n`;
        for (const d of ds) {
            if (!d.canWrite) {
                // No PL/SQL-callable create target: detail's tier has no _svc, and
                // interface is rest-only so it has no _app either — only its _rst
                // (JSON-based, not flat-param callable) exists. add_/remove_ are
                // skipped for this detail; list_ still works (plain select).
                r += `${tab}-- ${d.detailTbl}: no add_/remove_ (no _svc and no _app to call — rest-only interface + lookup-family tier)\n\n`;
            }
            if (d.canWrite) {
                r += `${tab}procedure add_${d.detailTbl} (\n`;
                r += addParams(d).join(',\n') + `\n${tab});\n\n`;
            }
            if (d.canDelete) {
                r += `${tab}procedure remove_${d.detailTbl} (\n`;
                r += `${tab}${tab}p_master_id in ${mTbl}.${mPkNm}%type,\n`;
                r += `${tab}${tab}p_${d.dPkNm} in ${d.detailTbl}.${d.dPkNm}%type\n`;
                r += `${tab});\n\n`;
            }
            r += `${tab}function list_${d.detailTbl} (p_master_id in ${mTbl}.${mPkNm}%type) return sys_refcursor;\n\n`;
        }
        r += `end ${this._bare(agg)};\n/\n`;

        // ── body ─────────────────────────────────────────────────────────────
        r += `\ncreate or replace package body ${agg} as\n`;
        for (const d of ds) {
            if (d.canWrite) {
                r += `\n${tab}procedure add_${d.detailTbl} (\n`;
                r += addParams(d).join(',\n') + `\n${tab}) is\n`;
                if (d.hasSvc) {
                    r += `${tab}${tab}l_rec ${d.dSvc}.t_rec;\n`;
                    r += `${tab}begin\n`;
                    r += `${tab}${tab}l_rec.${d.fkCol} := p_master_id;\n`;
                    for (const { name } of d.cols)
                        r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
                    if (d.pkIsUserDefined) {
                        r += `${tab}${tab}l_rec.${d.dPkNm} := p_${d.dPkNm};\n`;
                        r += `${tab}${tab}${d.dSvc}.create_rec(p_rec => l_rec, x_id => l_rec.${d.dPkNm});\n`;
                    } else {
                        r += `${tab}${tab}${d.dSvc}.create_rec(p_rec => l_rec, x_id => x_id);\n`;
                    }
                } else {
                    r += `${tab}begin\n`;
                    r += `${tab}${tab}${d.dApp}.ins(\n`;
                    const callLines: string[] = [`${tab}${tab}${tab}p_${d.fkCol} => p_master_id`];
                    if (d.pkIsUserDefined) callLines.push(`${tab}${tab}${tab}p_${d.dPkNm} => p_${d.dPkNm}`);
                    for (const { name } of d.cols)
                        callLines.push(`${tab}${tab}${tab}p_${name} => p_${name}`);
                    if (!d.pkIsUserDefined) callLines.push(`${tab}${tab}${tab}p_${d.dPkNm} => x_id`);
                    r += callLines.join(',\n') + `\n${tab}${tab});\n`;
                }
                r += `${tab}end add_${d.detailTbl};\n`;
            }
            if (d.canDelete) {
                r += `\n${tab}procedure remove_${d.detailTbl} (\n`;
                r += `${tab}${tab}p_master_id in ${mTbl}.${mPkNm}%type,\n`;
                r += `${tab}${tab}p_${d.dPkNm} in ${d.detailTbl}.${d.dPkNm}%type\n`;
                r += `${tab}) is\n`;
                r += `${tab}${tab}l_owner ${d.detailTbl}.${d.fkCol}%type;\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}begin\n`;
                r += `${tab}${tab}${tab}select ${d.fkCol} into l_owner from ${d.dRls} where ${d.dPkNm} = p_${d.dPkNm};\n`;
                r += `${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${d.detailTbl}: record not found (${d.dPkNm}=' || p_${d.dPkNm} || ')');\n`;
                r += `${tab}${tab}end;\n`;
                r += `${tab}${tab}if l_owner is null or l_owner != p_master_id then\n`;
                r += `${tab}${tab}${tab}raise_application_error(-20002, '[NOT_FOUND] ${d.detailTbl}: ${d.dPkNm}=' || p_${d.dPkNm} || ' does not belong to ${mTbl} ' || p_master_id);\n`;
                r += `${tab}${tab}end if;\n`;
                r += d.hasSvc
                    ? `${tab}${tab}${d.dSvc}.delete_rec(p_id => p_${d.dPkNm});\n`
                    : `${tab}${tab}${d.dApp}.del(p_id => p_${d.dPkNm});\n`;
                r += `${tab}end remove_${d.detailTbl};\n`;
            }
            r += `\n${tab}function list_${d.detailTbl} (p_master_id in ${mTbl}.${mPkNm}%type) return sys_refcursor is\n`;
            r += `${tab}${tab}l_cur sys_refcursor;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}open l_cur for select * from ${d.dRls} where ${d.fkCol} = p_master_id;\n`;
            r += `${tab}${tab}return l_cur;\n`;
            r += `${tab}end list_${d.detailTbl};\n`;
        }
        r += `\nend ${this._bare(agg)};\n/\n`;
        return r;
    }

    generateTAPI(node: IDdlNode): string {
        return this.legacyTapi.generate(node);
    }

    /**
     * Spec for the shared tenant-context package (layered TAPI, tenantid: yes; read-only side).
     * Emitted once before any DAL/absorbed-DML that references <prefix>tenant_ctx.get_id —
     * single point of configuration instead of a private function duplicated per table.
     * Contains ONLY get_id: a pure SYS_CONTEXT read has no privilege restriction, so this
     * package is safe to grant broadly to application/APEX runtime roles. Mutating the
     * context (set_id/clear_id) lives in the separate, more tightly-granted
     * generateTenantBootstrapSpec/Body package — see its doc comment for why.
     */
    generateTenantCtxSpec(prefix: string): string {
        return generateTenantCtxSpec(prefix);
    }

    /** Body for the shared tenant-context package (read-only side). */
    generateTenantCtxBody(prefix: string): string {
        return generateTenantCtxBody(prefix);
    }

    /**
     * Spec for the tenant-bootstrap package (mutating side: set_id/clear_id).
     * This is the package that must be named in `CREATE CONTEXT <ns> USING <this pkg>` — Oracle
     * restricts DBMS_SESSION.SET_CONTEXT/CLEAR_CONTEXT for a given namespace to callers compiled
     * inside that exact trusted package (ORA-01031 otherwise), so set_id and clear_id cannot live
     * in the general-purpose <prefix>tenant_ctx package if that one is meant to be granted broadly
     * to application/APEX runtime roles. Grant EXECUTE on this package ONLY to a trusted bootstrap
     * principal (a logon trigger's owning schema, or a dedicated auth handler) — never to the
     * general application role, which should only get EXECUTE on <prefix>tenant_ctx (get_id).
     */
    generateTenantBootstrapSpec(prefix: string): string {
        return generateTenantBootstrapSpec(prefix);
    }

    /** Body for the tenant-bootstrap package (mutating side: set_id/clear_id). */
    generateTenantBootstrapBody(prefix: string): string {
        return generateTenantBootstrapBody(prefix);
    }
}
