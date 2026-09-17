import { tab } from '../../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer } from '../table-model.js';

/** Renders the package DAL and the equivalent DML absorbed by lower tiers. */
export class OracleDalRenderer {
    constructor(
        private ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
    ) {}

    generatePrivateDml(node: IDdlNode): string {
        const model       = this.analyzer.analyze(node);
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

        const bkCol = model.businessKeyColumn;
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
            const bridge = model.bridge;
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

    generateSpec(node: IDdlNode): string {
        const model      = this.analyzer.analyze(node);
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
        const bkCol = model.businessKeyColumn;
        if (bkCol !== '') {
            // /businesskey: navigate versions by business key instead of by the
            // surrogate PK of one specific version row.
            r += `${tab}function get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype;\n\n`;
            r += `${tab}function history (p_${bkCol} in ${tbl}.${bkCol}%type) return t_cursor;\n\n`;
        }
        const bridge = model.bridge;
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
        r += `end ${bareName(dal)};\n/\n`;
        return r;
    }


    generateBody(node: IDdlNode): string {
        const model      = this.analyzer.analyze(node);
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

        const bkCol = model.businessKeyColumn;
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
            const bridge = model.bridge;
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

        r += `end ${bareName(dal)};\n/\n`;
        return r;
    }


}
