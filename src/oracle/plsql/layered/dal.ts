import { tab } from '../../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { bareName } from '../names.js';
import { OracleTableApiAnalyzer, type OracleTableApiModel } from '../table-model.js';

type DalRenderMode = 'absorbed' | 'package';

interface DalRenderProfile {
    prefix: string;
    idType: string;
    cursorType: string;
    notFoundError: string;
    lockedError: string;
    staleError: string;
    closedError: string;
}

/** Renders the package DAL and the equivalent DML absorbed by lower tiers. */
export class OracleDalRenderer {
    constructor(
        private ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
    ) {}

    private profile(model: OracleTableApiModel, mode: DalRenderMode): DalRenderProfile {
        const absorbed = mode === 'absorbed';
        return {
            prefix: absorbed ? 'p_' : '',
            idType: absorbed ? `${model.names.table}.${model.names.pk}%type` : 't_id',
            cursorType: absorbed ? 'sys_refcursor' : 't_cursor',
            notFoundError: absorbed ? '-20002' : 'c_err_not_found',
            lockedError: absorbed ? '-20003' : 'c_err_locked',
            staleError: absorbed ? '-20001' : 'c_err_stale_data',
            closedError: absorbed ? '-20057' : 'c_err_versioned_closed',
        };
    }

    private renderInsertRoutine(model: OracleTableApiModel, mode: DalRenderMode): string {
        const tbl = model.names.table;
        const pkName = model.names.pk;
        const { prefix } = this.profile(model, mode);
        const hasVer = model.features.versionColumn;
        const hasAudit = model.features.auditColumns;
        const synTenantId = model.features.syntheticTenantId;
        const tenantCtxPkg = model.names.tenantContext;
        const insCols = [
            ...(synTenantId ? ['tenant_id'] : []),
            ...model.columns.foreignKeys.map(name => name.toLowerCase()),
            ...model.columns.service.map(col => col.parseName().toLowerCase()),
        ];
        const insVals = [
            ...(synTenantId ? ['p_row.tenant_id'] : []),
            ...model.columns.foreignKeys.map(name => `p_row.${name.toLowerCase()}`),
            ...model.columns.service.map(col => `p_row.${col.parseName().toLowerCase()}`),
        ];

        let r = `${tab}procedure ${prefix}insert_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (synTenantId) r += `${tab}${tab}p_row.tenant_id := ${tenantCtxPkg}.get_id;\n`;
        // Preserve the package renderer's historical empty-list shape; absorbed DML
        // uses VALUES (DEFAULT) when a table has no writable columns.
        if (insCols.length > 0 || mode === 'package') {
            r += `${tab}${tab}insert into ${tbl} (\n`;
            r += `${tab}${tab}${tab}` + insCols.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab}) values (\n`;
            r += `${tab}${tab}${tab}` + insVals.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab})`;
        } else {
            r += `${tab}${tab}insert into ${tbl} values (default)`;
        }
        if (hasVer) {
            const createdCol = String(this.ctx.getOptionValue('createdcol') ?? 'created');
            const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
            const retCols = [pkName, 'row_version'];
            const intoCols = [`p_row.${pkName}`, 'p_row.row_version'];
            if (hasAudit) {
                retCols.push(createdCol, createdByCol);
                intoCols.push(`p_row.${createdCol}`, `p_row.${createdByCol}`);
            }
            r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
            r += `${tab}${tab}     into ${intoCols.join(', ')}`;
        } else {
            r += `\n${tab}${tab}returning ${pkName}\n`;
            r += `${tab}${tab}     into p_row.${pkName}`;
        }
        r += `;\n${tab}end ${prefix}insert_row;\n\n`;
        return r;
    }

    private renderNoRowsCheck(
        model: OracleTableApiModel,
        profile: DalRenderProfile,
        distinguishStale: boolean,
    ): string {
        const tbl = model.names.table;
        const pkName = model.names.pk;
        let r = `${tab}${tab}if sql%rowcount = 0 then\n`;
        if (distinguishStale) {
            r += `${tab}${tab}${tab}declare l_dummy pls_integer;\n`;
            r += `${tab}${tab}${tab}begin\n`;
            if (model.features.syntheticTenantId) {
                r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id and tenant_id = ${model.names.tenantContext}.get_id;\n`;
            } else {
                r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id;\n`;
            }
            r += `${tab}${tab}${tab}${tab}raise_application_error(${profile.staleError}, '[STALE_DATA] row modified by another session. reload and retry.');\n`;
            r += `${tab}${tab}${tab}exception\n`;
            r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(${profile.notFoundError}, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
            r += `${tab}${tab}${tab}end;\n`;
        } else {
            r += `${tab}${tab}${tab}raise_application_error(${profile.notFoundError}, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
        }
        r += `${tab}${tab}end if;\n`;
        return r;
    }

    /**
     * Same 0-rows-affected disambiguation as renderNoRowsCheck, plus a third
     * case ahead of it: the row exists but is already closed (<vtCol> is not
     * null) — the WHERE clause of the caller (close_row/update_row) always
     * includes "and <vtCol> is null", so 0 rows can now mean CLOSED as well as
     * STALE_DATA/NOT_FOUND. This is what used to be enforced by the
     * trg_<table>_versioned trigger (removed) — the TAPI is now the only place
     * this is checked, per the SmartDB principle: bypass protection is a GRANT
     * concern, not a trigger's job.
     */
    private renderVersionedNoRowsCheck(
        model: OracleTableApiModel,
        profile: DalRenderProfile,
        vtCol: string,
    ): string {
        const tbl = model.names.table;
        const pkName = model.names.pk;
        let r = `${tab}${tab}if sql%rowcount = 0 then\n`;
        r += `${tab}${tab}${tab}declare\n`;
        r += `${tab}${tab}${tab}${tab}l_${vtCol} ${tbl}.${vtCol}%type;\n`;
        r += `${tab}${tab}${tab}begin\n`;
        if (model.features.syntheticTenantId) {
            r += `${tab}${tab}${tab}${tab}select ${vtCol} into l_${vtCol} from ${tbl} where ${pkName} = l_id and tenant_id = ${model.names.tenantContext}.get_id;\n`;
        } else {
            r += `${tab}${tab}${tab}${tab}select ${vtCol} into l_${vtCol} from ${tbl} where ${pkName} = l_id;\n`;
        }
        r += `${tab}${tab}${tab}${tab}if l_${vtCol} is not null then\n`;
        r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(${profile.closedError}, '[VERSIONED] ${tbl}: this version row is already closed (${vtCol} is not null)');\n`;
        r += `${tab}${tab}${tab}${tab}else\n`;
        r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(${profile.staleError}, '[STALE_DATA] row modified by another session. reload and retry.');\n`;
        r += `${tab}${tab}${tab}${tab}end if;\n`;
        r += `${tab}${tab}${tab}exception\n`;
        r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(${profile.notFoundError}, '[NOT_FOUND] record ' || l_id || ' does not exist.');\n`;
        r += `${tab}${tab}${tab}end;\n`;
        r += `${tab}${tab}end if;\n`;
        return r;
    }

    private renderCloseRoutine(model: OracleTableApiModel, mode: DalRenderMode): string {
        if (!model.features.versioned) return '';

        const tbl = model.names.table;
        const pkName = model.names.pk;
        const vtCol = model.versionToColumn;
        const hasVer = model.features.versionColumn;
        const hasAudit = model.features.auditColumns;
        const synTenantId = model.features.syntheticTenantId;
        const tenantCtxPkg = model.names.tenantContext;
        const profile = this.profile(model, mode);
        const updatedCol = String(this.ctx.getOptionValue('updatedcol') ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');

        let r = `${tab}procedure ${profile.prefix}close_row (\n`;
        r += `${tab}${tab}p_id       in     ${profile.idType},\n`;
        r += `${tab}${tab}p_${vtCol.padEnd(10)} in     ${tbl}.${vtCol}%type default systimestamp,\n`;
        r += `${tab}${tab}p_row      in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is\n`;
        r += `${tab}${tab}l_id ${profile.idType} := p_id;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}update ${tbl} set\n`;
        r += `${tab}${tab}${tab}${vtCol} = p_${vtCol}\n`;
        r += `${tab}${tab}where ${pkName} = l_id`;
        r += `\n${tab}${tab}  and ${vtCol} is null`;
        if (synTenantId) r += `\n${tab}${tab}  and tenant_id = ${tenantCtxPkg}.get_id`;
        if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
        const retCols: string[] = [];
        const intoCols: string[] = [];
        if (hasVer) {
            retCols.push('row_version');
            intoCols.push('p_row.row_version');
        }
        if (hasAudit) {
            retCols.push(updatedCol, updatedByCol);
            intoCols.push(`p_row.${updatedCol}`, `p_row.${updatedByCol}`);
        }
        retCols.push(vtCol);
        intoCols.push(`p_row.${vtCol}`);
        r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
        r += `${tab}${tab}     into ${intoCols.join(', ')};\n`;
        r += this.renderVersionedNoRowsCheck(model, profile, vtCol);
        r += `${tab}end ${profile.prefix}close_row;\n\n`;
        return r;
    }

    private renderUpdateDeleteRoutines(model: OracleTableApiModel, mode: DalRenderMode): string {
        if (model.features.immutable) return '';

        const isVersioned = model.features.versioned;
        const vtCol = model.versionToColumn;
        const tbl = model.names.table;
        const pkName = model.names.pk;
        const hasVer = model.features.versionColumn;
        const synTenantId = model.features.syntheticTenantId;
        const tenantCtxPkg = model.names.tenantContext;
        const profile = this.profile(model, mode);
        const setCols = [
            ...model.columns.foreignKeys.map(name => `${name.toLowerCase()} = p_row.${name.toLowerCase()}`),
            ...model.columns.service.map(col => `${col.parseName().toLowerCase()} = p_row.${col.parseName().toLowerCase()}`),
        ];

        let r = `${tab}procedure ${profile.prefix}update_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
        r += `${tab}${tab}l_id ${profile.idType};\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}l_id := p_row.${pkName};\n`;
        // Preserve the public package's historical empty SET-list shape.
        if (setCols.length > 0 || mode === 'package') {
            r += `${tab}${tab}update ${tbl} set\n`;
            r += `${tab}${tab}${tab}` + setCols.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab}where ${pkName} = l_id`;
        } else {
            r += `${tab}${tab}update ${tbl} set ${pkName} = l_id where ${pkName} = l_id`;
        }
        // /versioned: free correction of any column (including <vtCol> itself,
        // i.e. this can also close the row) is permitted only while the row has
        // never been closed — once <vtCol> is set, it is permanent history. See
        // renderVersionedNoRowsCheck: this is what used to be a DB trigger.
        if (isVersioned) r += `\n${tab}${tab}  and ${vtCol} is null`;
        if (synTenantId) r += `\n${tab}${tab}  and tenant_id = ${tenantCtxPkg}.get_id`;
        if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
        r += `;\n`;
        if (isVersioned) r += this.renderVersionedNoRowsCheck(model, profile, vtCol);
        else if (hasVer) r += this.renderNoRowsCheck(model, profile, true);
        r += `${tab}end ${profile.prefix}update_row;\n\n`;

        r += `${tab}procedure ${profile.prefix}delete_row (p_id in ${profile.idType}) is\n`;
        r += `${tab}begin\n`;
        if (isVersioned) {
            // Same rule as update_row: deletable only while still open. Unlike
            // update_row/close_row this has no p_row to report the conflict onto,
            // and delete_row has never raised NOT_FOUND for a missing id (silent
            // no-op, preserved here) — so the only new, explicit error is the
            // "exists but already closed" case.
            const tenantWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';
            r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id and ${vtCol} is null${tenantWhere};\n`;
            r += `${tab}${tab}if sql%rowcount = 0 then\n`;
            r += `${tab}${tab}${tab}declare\n`;
            r += `${tab}${tab}${tab}${tab}l_${vtCol} ${tbl}.${vtCol}%type;\n`;
            r += `${tab}${tab}${tab}begin\n`;
            r += `${tab}${tab}${tab}${tab}select ${vtCol} into l_${vtCol} from ${tbl} where ${pkName} = p_id${tenantWhere};\n`;
            r += `${tab}${tab}${tab}${tab}if l_${vtCol} is not null then\n`;
            r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(${profile.closedError}, '[VERSIONED] ${tbl}: this version row is already closed (${vtCol} is not null), it cannot be deleted');\n`;
            r += `${tab}${tab}${tab}${tab}end if;\n`;
            r += `${tab}${tab}${tab}exception\n`;
            r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}${tab}${tab}null;\n`;
            r += `${tab}${tab}${tab}end;\n`;
            r += `${tab}${tab}end if;\n`;
        } else if (synTenantId) {
            r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id and tenant_id = ${tenantCtxPkg}.get_id;\n`;
        } else {
            r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id;\n`;
        }
        r += `${tab}end ${profile.prefix}delete_row;\n\n`;
        return r;
    }

    private renderReadRoutines(
        model: OracleTableApiModel,
        mode: DalRenderMode,
    ): string {
        const tbl = model.names.table;
        const pkName = model.names.pk;
        const { prefix, idType, cursorType, notFoundError, lockedError } = this.profile(model, mode);
        const synTenantId = model.features.syntheticTenantId;
        const tenantCtxPkg = model.names.tenantContext;
        const dimSource = `${tbl}_rls`;
        const tenantWhere = synTenantId ? ` and tenant_id = ${tenantCtxPkg}.get_id` : '';

        let r = `${tab}function ${prefix}get_by_id (p_id in ${idType}) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row from ${dimSource} where ${pkName} = p_id${tenantWhere};\n`;
        r += `${tab}${tab}return l_row;\n`;
        if (mode === 'absorbed') {
            r += `${tab}exception\n`;
            r += `${tab}${tab}when no_data_found then\n`;
            r += `${tab}${tab}${tab}raise_application_error(${notFoundError}, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        }
        r += `${tab}end ${prefix}get_by_id;\n\n`;

        r += `${tab}function ${prefix}lock_by_id (p_id in ${idType}) return ${tbl}%rowtype is\n`;
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
        r += `${tab}${tab}${tab}raise_application_error(${notFoundError}, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(${lockedError}, '[LOCKED] ${tbl}: record locked by another session');\n`;
        r += `${tab}end ${prefix}lock_by_id;\n\n`;

        r += `${tab}function ${prefix}lock_by_id_wait (p_id in ${idType}, p_timeout in number default 5) return ${tbl}%rowtype is\n`;
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
        r += `${tab}${tab}${tab}raise_application_error(${notFoundError}, '[NOT_FOUND] ${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(${lockedError}, '[LOCKED] ${tbl}: record locked by another session');\n`;
        r += `${tab}end ${prefix}lock_by_id_wait;\n\n`;

        for (const col of model.columns.unique) {
            const cn = col.parseName().toLowerCase();
            r += `${tab}function ${prefix}get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${dimSource} where ${cn} = p_${cn}${tenantWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            if (mode === 'absorbed') {
                r += `${tab}exception\n`;
                r += `${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}raise_application_error(${notFoundError}, '[NOT_FOUND] ${tbl}: record not found (${cn}=' || p_${cn} || ')');\n`;
            }
            r += `${tab}end ${prefix}get_by_${cn};\n\n`;
        }

        r += `${tab}function ${prefix}get_all return ${cursorType} is\n`;
        r += `${tab}${tab}l_cur ${cursorType};\n`;
        r += `${tab}begin\n`;
        const where = synTenantId ? ` where tenant_id = ${tenantCtxPkg}.get_id` : '';
        r += `${tab}${tab}open l_cur for select * from ${dimSource}${where};\n`;
        r += `${tab}${tab}return l_cur;\n`;
        r += `${tab}end ${prefix}get_all;\n\n`;
        return r;
    }

    private renderBusinessKeyReads(
        model: OracleTableApiModel,
        mode: DalRenderMode,
    ): string {
        const bkCol = model.businessKeyColumn;
        if (bkCol === '') return '';

        const tbl = model.names.table;
        const vtCol = model.versionToColumn;
        const { prefix, cursorType, notFoundError } = this.profile(model, mode);
        const tenantWhere = model.features.syntheticTenantId
            ? ` and tenant_id = ${model.names.tenantContext}.get_id`
            : '';
        const dimSource = `${tbl}_rls`;

        let r = `${tab}function ${prefix}get_current (p_${bkCol} in ${tbl}.${bkCol}%type) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row from ${dimSource} where ${bkCol} = p_${bkCol} and is_current = 1${tenantWhere};\n`;
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(${notFoundError}, '[NOT_FOUND] ${tbl}: no current version for ${bkCol}=' || p_${bkCol});\n`;
        r += `${tab}end ${prefix}get_current;\n\n`;

        r += `${tab}function ${prefix}get_as_of (p_${bkCol} in ${tbl}.${bkCol}%type, p_as_of in timestamp) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row from ${dimSource}\n`;
        r += `${tab}${tab}where  ${bkCol} = p_${bkCol}\n`;
        r += `${tab}${tab}and    valid_from <= p_as_of\n`;
        r += `${tab}${tab}and    (${vtCol} is null or ${vtCol} > p_as_of)${tenantWhere};\n`;
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(${notFoundError}, '[NOT_FOUND] ${tbl}: no version for ${bkCol}=' || p_${bkCol} || ' as of ' || p_as_of);\n`;
        r += `${tab}end ${prefix}get_as_of;\n\n`;

        r += `${tab}function ${prefix}history (p_${bkCol} in ${tbl}.${bkCol}%type) return ${cursorType} is\n`;
        r += `${tab}${tab}l_cur ${cursorType};\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}open l_cur for select * from ${dimSource} where ${bkCol} = p_${bkCol}${tenantWhere} order by valid_from;\n`;
        r += `${tab}${tab}return l_cur;\n`;
        r += `${tab}end ${prefix}history;\n\n`;
        return r;
    }

    private renderBridgeRoutines(
        model: OracleTableApiModel,
        mode: DalRenderMode,
    ): string {
        const bridge = model.bridge;
        if (bridge === null) return '';

        const tbl = model.names.table;
        const { prefix, cursorType } = this.profile(model, mode);
        const tenantWhere = model.features.syntheticTenantId
            ? ` and tenant_id = ${model.names.tenantContext}.get_id`
            : '';
        const dimSource = `${tbl}_rls`;

        let r = `${tab}procedure ${prefix}grant_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}${prefix}insert_row(p_row => p_row);\n`;
        r += `${tab}end ${prefix}grant_row;\n\n`;

        r += `${tab}procedure ${prefix}revoke_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}delete from ${tbl} where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right}${tenantWhere};\n`;
        r += `${tab}end ${prefix}revoke_row;\n\n`;

        r += `${tab}function ${prefix}has_row (p_${bridge.left} in ${tbl}.${bridge.left}%type, p_${bridge.right} in ${tbl}.${bridge.right}%type) return boolean is\n`;
        r += `${tab}${tab}l_cnt pls_integer;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select count(*) into l_cnt from ${dimSource} where ${bridge.left} = p_${bridge.left} and ${bridge.right} = p_${bridge.right}${tenantWhere};\n`;
        r += `${tab}${tab}return l_cnt > 0;\n`;
        r += `${tab}end ${prefix}has_row;\n\n`;

        r += `${tab}function ${prefix}list_row (p_${bridge.left} in ${tbl}.${bridge.left}%type) return ${cursorType} is\n`;
        r += `${tab}${tab}l_cur ${cursorType};\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}open l_cur for select * from ${dimSource} where ${bridge.left} = p_${bridge.left}${tenantWhere};\n`;
        r += `${tab}${tab}return l_cur;\n`;
        r += `${tab}end ${prefix}list_row;\n\n`;
        return r;
    }

    generatePrivateDml(node: IDdlNode): string {
        const model = this.analyzer.analyze(node);
        let r = `\n${tab}-- private DML (absorbed from absent _dal)\n\n`;
        r += `${tab}resource_busy exception;\n`;
        r += `${tab}pragma exception_init(resource_busy, -54);\n\n`;
        r += this.renderReadRoutines(model, 'absorbed');
        r += this.renderInsertRoutine(model, 'absorbed');
        r += this.renderCloseRoutine(model, 'absorbed');
        r += this.renderUpdateDeleteRoutines(model, 'absorbed');
        r += this.renderBusinessKeyReads(model, 'absorbed');
        r += this.renderBridgeRoutines(model, 'absorbed');
        return r;
    }

    generateSpec(node: IDdlNode): string {
        const model      = this.analyzer.analyze(node);
        const tbl        = model.names.table;
        const dal        = model.names.dal;
        const pkName      = (node.getPkName() ?? 'id').toLowerCase();
        const uniqueCols  = model.columns.unique;
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
        }
        if (isImmutable) {
            // No update_row/delete_row — append-only.
        } else {
            // /versioned: update_row/delete_row are additive alongside close_row
            // above, not a replacement — free correction (any column, including
            // <vtCol> itself) or deletion is permitted only while the row has
            // never been closed. Once closed it is permanent history, enforced
            // by the "and <vtCol> is null" guard these two now carry (see
            // renderUpdateDeleteRoutines) — no longer by a DB trigger.
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
        r += `${tab}c_err_locked     constant pls_integer := -20003;\n`;
        if (isVersioned) r += `${tab}c_err_versioned_closed constant pls_integer := -20057;\n`;
        r += `\n`;
        r += `end ${bareName(dal)};\n/\n`;
        return r;
    }

    generateBody(node: IDdlNode): string {
        const model = this.analyzer.analyze(node);
        const dal = model.names.dal;
        let r = `create or replace package body ${dal} as\n\n`;
        r += `${tab}resource_busy exception;\n`;
        r += `${tab}pragma exception_init(resource_busy, -54);\n\n`;
        r += this.renderReadRoutines(model, 'package');
        r += this.renderInsertRoutine(model, 'package');
        r += this.renderCloseRoutine(model, 'package');
        r += this.renderUpdateDeleteRoutines(model, 'package');
        r += this.renderBusinessKeyReads(model, 'package');
        r += this.renderBridgeRoutines(model, 'package');
        r += `end ${bareName(dal)};\n/\n`;
        return r;
    }
}
