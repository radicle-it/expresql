import { getMajorVersion } from '../utils/naming.js';
import { tab } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode } from '../compiler/types.js';

// ── Module-level helpers ───────────────────────────────────────────────────────

function caseMethod(node: IDdlNode): string {
    if (node.isOption('lower')) return 'lower';
    if (node.isOption('upper')) return 'upper';
    return '';
}

function fkPlsqlType(refNode: IDdlNode): string | null {
    const pkName = refNode.getExplicitPkName();
    if (pkName == null || pkName.includes(',')) return null;
    const pkChild = refNode.findChild(pkName);
    return pkChild != null ? pkChild.getPlsqlType() : refNode.getPkType();
}

/**
 * Handles Oracle REST enable, trigger generation, and Table API (TAPI)
 * for OracleDDLGenerator.
 */
export class OraclePlsqlBuilder {
    constructor(
        private ctx:    DdlContext,
        private naming: Naming,
    ) {}

    // ── ORDS ──────────────────────────────────────────────────────────────────

    restEnable(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (!node.isOption('rest')) return '';
        const name     = node.parseName();
        const isQuoted = name.indexOf('"') === 0;
        let objName = this.ctx.objPrefix() + name;
        if (isQuoted) objName = this.ctx.objPrefix() + name.substring(1, name.length - 1);
        else objName = (this.ctx.objPrefix() + name).toUpperCase();
        return "begin\n" + tab + "ords.enable_object(p_enabled=>TRUE, p_object=>'" + objName + "');\nend;\n/\n";
    }

    // ── Triggers ──────────────────────────────────────────────────────────────

    generateTrigger(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (node.isOption('soda')) return '';
        return this._generateBITrigger(node) + this._generateBUTrigger(node);
    }

    private _generateBITrigger(node: IDdlNode): string {
        const editionable = this.ctx.optionEQvalue('editionable', 'yes') ? ' editionable' : '';
        const objName     = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        let ret = `create or replace${editionable} trigger ${objName}${this.naming.bi}\n`;
        ret += '    before insert\n';
        ret += '    on ' + objName + '\n';
        ret += '    for each row\n';

        if (node.hasRowKey()) {
            ret += `declare
    function compress_int (n in integer ) return varchar2
    as
        ret       varchar2(30);
        quotient  integer;
        remainder integer;
        digit     char(1);
    begin
        ret := null; quotient := n;
        <<compress_loop>>
        while quotient > 0
        loop
            remainder := mod(quotient, 10 + 26);
            quotient := floor(quotient  / (10 + 26));
            if remainder < 26 then
                digit := chr(ascii('A') + remainder);
            else
                digit := chr(ascii('0') + remainder - 26);
            end if;
            ret := digit || ret;
        end loop compress_loop;
        if length(ret) < 5 then ret := lpad(ret, 4, 'A'); end if ;
        return upper(ret);
    end compress_int;
`;
        }

        ret += 'begin\n';
        let OK  = false;
        const user = node.apexUser();
        if (node.hasRowKey()) { ret += '    :new.row_key := compress_int(row_key_seq.nextval);\n'; OK = true; }
        for (const child of node.children) {
            const method = caseMethod(child);
            if (method === '') continue;
            ret += '    :new.' + child.parseName().toLowerCase() + ' := ' + method + '(:new.' + child.parseName().toLowerCase() + ');\n';
            OK = true;
        }
        if (node.hasRowVersion()) { ret += '    :new.row_version := 1;\n'; OK = true; }
        if (node.hasAuditCols()) {
            const sysDateFn = node.auditSysDateFn();
            ret += '    :new.' + this.ctx.getOptionValue('createdcol')   + ' := ' + sysDateFn + ';\n';
            ret += '    :new.' + this.ctx.getOptionValue('createdbycol') + ' := ' + user + ';\n';
            ret += '    :new.' + this.ctx.getOptionValue('updatedcol')   + ' := ' + sysDateFn + ';\n';
            ret += '    :new.' + this.ctx.getOptionValue('updatedbycol') + ' := ' + user + ';\n';
            OK = true;
        }
        const cols = this.ctx.additionalColumns();
        for (const col in cols) {
            const type = cols[col];
            ret += '    if :new.' + col + ' is null then\n';
            if (type.startsWith('INT')) ret += '        ' + col + ' := 0;\n';
            else ret += "        " + col + " := 'N/A';\n";
            ret += '    end if;\n';
            OK = true;
        }
        if (!OK) return '';
        ret += 'end ' + objName + this.naming.bi + ';\n/\n\n';
        return ret;
    }

    private _generateBUTrigger(node: IDdlNode): string {
        if (node.isOption('immutable')) return '';
        let hasLowerUpper = false;
        for (const child of node.children) {
            if (child.isOption('lower') || child.isOption('upper')) { hasLowerUpper = true; break; }
        }
        const hasRowVersion = node.hasRowVersion();
        const hasAuditCols  = node.hasAuditCols();
        if (!hasLowerUpper && !hasRowVersion && !hasAuditCols) return '';
        const editionable = this.ctx.optionEQvalue('editionable', 'yes') ? ' editionable' : '';
        const objName     = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        let ret = `create or replace${editionable} trigger ${objName}${this.naming.bu}\n`;
        ret += '    before update\n    on ' + objName + '\n    for each row\nbegin\n';
        const user = node.apexUser();
        for (const child of node.children) {
            const method = caseMethod(child);
            if (method === '') continue;
            ret += '    :new.' + child.parseName().toLowerCase() + ' := ' + method + '(:new.' + child.parseName().toLowerCase() + ');\n';
        }
        if (hasRowVersion) ret += '    :new.row_version := nvl(:old.row_version, 0) + 1;\n';
        if (hasAuditCols) {
            const sysDateFn = node.auditSysDateFn();
            ret += '    :new.' + this.ctx.getOptionValue('updatedcol')   + ' := ' + sysDateFn + ';\n';
            ret += '    :new.' + this.ctx.getOptionValue('updatedbycol') + ' := ' + user + ';\n';
        }
        ret += 'end ' + objName + this.naming.bu + ';\n/\n\n';
        return ret;
    }

    generateImmutableTrigger(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (!node.isOption('immutable')) return '';
        const dbVer = this.ctx.getOptionValue('db') as string | null;
        if (dbVer && dbVer.length > 0 && 23 <= (getMajorVersion(dbVer) ?? 0)) return '';
        const objName = this.ctx.objPrefix() + node.parseName();
        let ret = 'create or replace trigger ' + this.naming.immutable_prefix + objName.toLowerCase() + this.naming.immutable_suffix + '\n';
        ret += '    before update or delete\n    on ' + objName.toLowerCase() + '\ndeclare\n';
        ret += "    co_immutable_err  constant pls_integer      := -20055;\n";
        ret += "    co_immutable_msg  constant varchar2(200 char) := '" + objName.toLowerCase() + " is immutable';\n";
        ret += 'begin\n    raise_application_error(co_immutable_err, co_immutable_msg);\nend;\n/\n\n';
        return ret;
    }

    // ── Table API (TAPI) ──────────────────────────────────────────────────────

    /** True when tenant_id is injected synthetically (global tenantid:yes, not via FK hierarchy). */
    private _hasSyntheticTenantId(node: IDdlNode): boolean {
        return this.ctx.optionEQvalue('tenantid', true)
            && !node.isOption('notenantid')
            && node.findChild('tenant_id') === null
            && !Object.prototype.hasOwnProperty.call(node.fks ?? {}, 'tenant_id');
    }

    procDecl(node: IDdlNode, kind: string): string {
        const modifier = kind !== 'get' ? ' default null' : '';
        const mode     = kind !== 'get' ? ' in' : 'out';
        let ret = tab + 'procedure ' + kind + '_row (\n';
        const idColName   = node.getPkName();
        const pkChild     = node.getGenIdColName() !== null ? null : node.findChild(node.getExplicitPkName()!);
        const pkPlsqlType = pkChild ? pkChild.getPlsqlType() : node.getPkType();
        ret += tab + tab + 'p_' + idColName + '        in  ' + pkPlsqlType + modifier;
        if (this._hasSyntheticTenantId(node))
            ret += ',\n' + tab + tab + 'p_tenant_id   ' + mode + '  integer' + modifier;
        for (const fk in (node.fks ?? {})) {
            const parent  = node.fks![fk];
            let type = 'integer';
            const refNode = this.ctx.find(parent);
            if (refNode !== null) type = fkPlsqlType(refNode) ?? type;
            ret += ',\n' + tab + tab + 'P_' + fk + '   ' + mode + '  ' + type + modifier;
        }
        for (const child of node.regularColumns())
            ret += ',\n' + tab + tab + 'P_' + child.parseName() + '   ' + mode + '  ' + child.getPlsqlType() + modifier;
        ret += '\n    )';
        return ret;
    }

    private _getRowBody(node: IDdlNode): string {
        const idColName   = node.getPkName();
        const objName     = this.ctx.objPrefix() + node.parseName();
        const synTenantId = this._hasSyntheticTenantId(node);
        let ret = tab + 'is \n' + tab + 'begin \n';
        const selectCols: string[] = [];
        const intoCols:   string[] = [];
        if (synTenantId) { selectCols.push('tenant_id'); intoCols.push('p_tenant_id'); }
        for (const fk in (node.fks ?? {})) { selectCols.push(fk); intoCols.push('p_' + fk); }
        for (const child of node.regularColumns()) {
            const cn = child.parseName().toLowerCase();
            selectCols.push(cn); intoCols.push('p_' + cn);
        }
        if (selectCols.length > 0) {
            const pad = tab + tab + '       ';
            ret += tab + tab + 'select ' + selectCols.join(',\n' + pad) + '\n';
            ret += tab + tab + '  into ' + intoCols.join(',\n' + pad) + '\n';
            ret += tab + tab + '  from ' + objName + '\n';
            ret += tab + tab + ' where ' + idColName + ' = p_' + idColName;
            if (synTenantId) ret += '\n' + tab + tab + '   and tenant_id = p_tenant_id';
            ret += ';\n';
        }
        ret += tab + 'exception\n' + tab + tab + 'when no_data_found then\n' + tab + tab + tab + 'null;\n';
        ret += tab + 'end get_row;\n \n';
        return ret;
    }

    private _insertRowBody(node: IDdlNode): string {
        const idColName   = node.getPkName();
        const objName     = this.ctx.objPrefix() + node.parseName();
        const synTenantId = this._hasSyntheticTenantId(node);
        let ret = tab + 'is \n' + tab + 'begin \n';
        ret += tab + tab + 'insert into ' + objName + ' ( \n' + tab + tab + tab + idColName;
        if (synTenantId) ret += ',\n' + tab + tab + tab + 'tenant_id';
        for (const fk in (node.fks ?? {})) ret += ',\n' + tab + tab + tab + fk;
        for (const child of node.regularColumns()) ret += ',\n' + tab + tab + tab + child.parseName().toLowerCase();
        ret += '\n' + tab + tab + ') values ( \n' + tab + tab + tab + 'p_' + idColName;
        if (synTenantId) ret += ',\n' + tab + tab + tab + 'p_tenant_id';
        for (const fk in (node.fks ?? {})) ret += ',\n' + tab + tab + tab + 'p_' + fk;
        for (const child of node.regularColumns()) ret += ',\n' + tab + tab + tab + 'p_' + child.parseName();
        ret += '\n' + tab + tab + ');';
        ret += '\n' + tab + 'end insert_row;\n \n \n';
        return ret;
    }

    private _updateRowBody(node: IDdlNode): string {
        const idColName   = node.getPkName();
        const objName     = this.ctx.objPrefix() + node.parseName();
        const synTenantId = this._hasSyntheticTenantId(node);
        let ret = tab + 'is \n' + tab + 'begin \n';
        ret += tab + tab + 'update  ' + objName + ' set \n' + tab + tab + tab + idColName + ' = p_' + idColName;
        for (const fk in (node.fks ?? {})) ret += ',\n' + tab + tab + tab + fk + ' = P_' + fk;
        for (const child of node.regularColumns())
            ret += ',\n' + tab + tab + tab + child.parseName().toLowerCase() + ' = P_' + child.parseName().toLowerCase();
        ret += '\n' + tab + tab + 'where ' + idColName + ' = p_' + idColName;
        if (synTenantId) ret += '\n' + tab + tab + '  and tenant_id = p_tenant_id';
        ret += ';';
        ret += '\n' + tab + 'end update_row;\n \n \n';
        return ret;
    }

    // ── Layered TAPI ─────────────────────────────────────────────────────────

    private _hasAuditLog(node: IDdlNode): boolean {
        return node.isOption('auditlog');
    }

    private _hasVersionCol(node: IDdlNode): boolean {
        return node.hasRowVersion() || node.children.some(
            c => c.children.length === 0 && c.parseName().toLowerCase() === 'row_version'
        );
    }

    private _hasUniqueCol(node: IDdlNode): boolean {
        return node.children.some(c => c.isOption('unique'));
    }

    // Returns true when any other node designates this table as its audit log target via /auditlog.
    private _isAuditLogTarget(node: IDdlNode): boolean {
        const myName = node.parseName().toLowerCase();
        return this.ctx.descendants().some(n => {
            const logName = String(n.getOptionValue('auditlog') || '').trim().toLowerCase();
            return logName !== '' && logName === myName;
        });
    }

    // Non-PK, non-version regular columns used as SVC scalar parameters.
    private _svcCols(node: IDdlNode): IDdlNode[] {
        return node.children.filter(
            c => c.children.length === 0 &&
                 c.refId() === null &&
                 c.parseName().toLowerCase() !== 'row_version'
        );
    }

    private _generateDalSpec(node: IDdlNode): string {
        const tbl           = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal           = tbl + '_dal';
        const uniqueCols    = node.children.filter(c => c.isOption('unique'));
        const synTenantId   = this._hasSyntheticTenantId(node);
        const isAuditTarget = this._isAuditLogTarget(node);
        let r = `create or replace package ${dal} as\n\n`;
        r += `${tab}subtype t_id is ${tbl}.id%type;\n\n`;
        r += `${tab}function get_by_id  (p_id in t_id) return ${tbl}%rowtype;\n`;
        r += `${tab}function lock_by_id (p_id in t_id) return ${tbl}%rowtype;\n\n`;
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            if (synTenantId) {
                r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type, p_tenant_id in number) return ${tbl}%rowtype;\n\n`;
            } else {
                r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type) return ${tbl}%rowtype;\n\n`;
            }
        }
        r += `${tab}type t_cursor is ref cursor return ${tbl}%rowtype;\n`;
        r += `${tab}function get_all return t_cursor;\n\n`;
        r += `${tab}procedure insert_row (p_row in out nocopy ${tbl}%rowtype);\n\n`;
        if (!isAuditTarget) {
            r += `${tab}procedure update_row (p_row in out nocopy ${tbl}%rowtype);\n\n`;
            r += synTenantId
                ? `${tab}procedure delete_row (p_id in t_id, p_tenant_id in number);\n\n`
                : `${tab}procedure delete_row (p_id in t_id);\n\n`;
        }
        r += `${tab}c_err_stale_data constant pls_integer := -20001;\n`;
        r += `${tab}c_err_not_found  constant pls_integer := -20002;\n`;
        r += `${tab}c_err_locked     constant pls_integer := -20003;\n\n`;
        r += `end ${dal};\n/\n`;
        return r;
    }

    private _generateDalBody(node: IDdlNode): string {
        const tbl        = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal        = tbl + '_dal';
        const pkName     = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer     = this._hasVersionCol(node);
        const hasAudit   = node.hasAuditCols();
        const svcCols    = this._svcCols(node);
        const fkCols     = Object.keys(node.fks ?? {});
        const uniqueCols    = node.children.filter(c => c.isOption('unique'));
        const isAuditTarget = this._isAuditLogTarget(node);
        const synTenantId   = this._hasSyntheticTenantId(node);

        let r = `create or replace package body ${dal} as\n\n`;

        // package-level: translates ORA-00054 (resource busy) to c_err_locked
        r += `${tab}resource_busy exception;\n`;
        r += `${tab}pragma exception_init(resource_busy, -54);\n\n`;

        // get_by_id — NO_DATA_FOUND raises c_err_not_found
        r += `${tab}function get_by_id (p_id in t_id) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row from ${tbl} where ${pkName} = p_id;\n`;
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}end get_by_id;\n\n`;

        // lock_by_id — SELECT FOR UPDATE NOWAIT for check-then-act SVC procedures
        r += `${tab}function lock_by_id (p_id in t_id) return ${tbl}%rowtype is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}select * into l_row\n`;
        r += `${tab}${tab}from   ${tbl}\n`;
        r += `${tab}${tab}where  ${pkName} = p_id\n`;
        r += `${tab}${tab}for update nowait;\n`;
        r += `${tab}${tab}return l_row;\n`;
        r += `${tab}exception\n`;
        r += `${tab}${tab}when no_data_found then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_not_found, '${tbl}: record not found (id=' || p_id || ')');\n`;
        r += `${tab}${tab}when resource_busy then\n`;
        r += `${tab}${tab}${tab}raise_application_error(c_err_locked, '${tbl}: record locked by another session');\n`;
        r += `${tab}end lock_by_id;\n\n`;

        // get_by_<unique_col> — one function per /unique column; NO_DATA_FOUND propagates.
        // When tenantid is active, p_tenant_id is required to enforce the composite unique index scope.
        for (const col of uniqueCols) {
            const cn = col.parseName().toLowerCase();
            const extraParam = synTenantId ? `, p_tenant_id in number` : '';
            const extraWhere = synTenantId ? ` and tenant_id = p_tenant_id` : '';
            r += `${tab}function get_by_${cn} (p_${cn} in ${tbl}.${cn}%type${extraParam}) return ${tbl}%rowtype is\n`;
            r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}select * into l_row from ${tbl} where ${cn} = p_${cn}${extraWhere};\n`;
            r += `${tab}${tab}return l_row;\n`;
            r += `${tab}end get_by_${cn};\n\n`;
        }

        // get_all — strong-typed ref cursor for PL/SQL bulk processing.
        r += `${tab}function get_all return t_cursor is\n`;
        r += `${tab}${tab}l_cur t_cursor;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}open l_cur for select * from ${tbl};\n`;
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

        // update_row and delete_row are omitted for audit-log targets (append-only integrity).
        // For multi-tenant tables, update_row adds tenant_id to the WHERE for defence-in-depth,
        // and delete_row carries p_tenant_id so the DAL enforces cross-tenant safety.
        const setCols = [...fkCols.map(f => `${f.toLowerCase()} = p_row.${f.toLowerCase()}`),
                         ...svcCols.map(c => `${c.parseName().toLowerCase()} = p_row.${c.parseName().toLowerCase()}`)];
        if (!isAuditTarget) {
            r += `${tab}procedure update_row (p_row in out nocopy ${tbl}%rowtype) is\n`;
            r += `${tab}${tab}l_id t_id;\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}l_id := p_row.${pkName};\n`;
            r += `${tab}${tab}update ${tbl} set\n`;
            r += `${tab}${tab}${tab}` + setCols.join(`,\n${tab}${tab}${tab}`) + '\n';
            r += `${tab}${tab}where ${pkName} = l_id`;
            if (synTenantId) r += `\n${tab}${tab}  and tenant_id = p_row.tenant_id`;
            if (hasVer) r += `\n${tab}${tab}  and row_version = p_row.row_version`;
            if (hasVer) {
                const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
                const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
                const retCols  = ['row_version'];
                const intoCols = ['p_row.row_version'];
                if (hasAudit) { retCols.push(updatedCol, updatedByCol); intoCols.push(`p_row.${updatedCol}`, `p_row.${updatedByCol}`); }
                r += `\n${tab}${tab}returning ${retCols.join(', ')}\n`;
                r += `${tab}${tab}     into ${intoCols.join(', ')}`;
            }
            r += `;\n`;
            if (hasVer) {
                r += `${tab}${tab}if sql%rowcount = 0 then\n`;
                r += `${tab}${tab}${tab}declare l_dummy pls_integer;\n`;
                r += `${tab}${tab}${tab}begin\n`;
                r += `${tab}${tab}${tab}${tab}select 1 into l_dummy from ${tbl} where ${pkName} = l_id;\n`;
                r += `${tab}${tab}${tab}${tab}raise_application_error(c_err_stale_data, 'row modified by another session. reload and retry.');\n`;
                r += `${tab}${tab}${tab}exception\n`;
                r += `${tab}${tab}${tab}${tab}when no_data_found then\n`;
                r += `${tab}${tab}${tab}${tab}${tab}raise_application_error(c_err_not_found, 'record ' || l_id || ' does not exist.');\n`;
                r += `${tab}${tab}${tab}end;\n`;
                r += `${tab}${tab}end if;\n`;
            }
            r += `${tab}end update_row;\n\n`;

            // delete_row
            if (synTenantId) {
                r += `${tab}procedure delete_row (p_id in t_id, p_tenant_id in number) is\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id and tenant_id = p_tenant_id;\n`;
                r += `${tab}end delete_row;\n\n`;
            } else {
                r += `${tab}procedure delete_row (p_id in t_id) is\n`;
                r += `${tab}begin\n`;
                r += `${tab}${tab}delete from ${tbl} where ${pkName} = p_id;\n`;
                r += `${tab}end delete_row;\n\n`;
            }
        }

        r += `end ${dal};\n/\n`;
        return r;
    }

    private _generateHksSpec(node: IDdlNode): string {
        const tbl = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal = tbl + '_dal';
        const pkg = tbl + '_hks';
        let r = `create or replace package ${pkg} as\n\n`;
        r += `${tab}procedure validate (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in out nocopy ${tbl}%rowtype\n`;
        r += `${tab});\n\n`;
        r += `${tab}procedure before_insert (p_row in out nocopy ${tbl}%rowtype);\n`;
        r += `${tab}procedure before_update (p_row in out nocopy ${tbl}%rowtype);\n`;
        r += `${tab}procedure before_delete (p_id in ${dal}.t_id);\n\n`;
        r += `${tab}procedure after_insert (p_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure after_update (p_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure after_delete (p_id in ${dal}.t_id);\n\n`;
        r += `end ${pkg};\n/\n`;
        return r;
    }

    private _generateHksBody(node: IDdlNode): string {
        const tbl = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal = tbl + '_dal';
        const pkg = tbl + '_hks';
        let r = `create or replace package body ${pkg} as\n`;
        r += `-- warning: this file is generated once and must not be overwritten\n\n`;
        r += `${tab}procedure validate (\n`;
        r += `${tab}${tab}p_operation in varchar2,\n`;
        r += `${tab}${tab}p_row       in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is begin null; end validate;\n\n`;
        r += `${tab}procedure before_insert (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
        r += `${tab}procedure before_update (p_row in out nocopy ${tbl}%rowtype) is begin null; end;\n`;
        r += `${tab}procedure before_delete (p_id in ${dal}.t_id) is begin null; end;\n\n`;
        r += `${tab}procedure after_insert  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
        r += `${tab}procedure after_update  (p_row in ${tbl}%rowtype) is begin null; end;\n`;
        r += `${tab}procedure after_delete  (p_id in ${dal}.t_id)     is begin null; end;\n\n`;
        r += `end ${pkg};\n/\n`;
        return r;
    }

    /**
     * Ordered list of t_rec / APX parameter descriptors: FK cols → tenant_id → regular cols.
     * Single source of truth for SVC t_rec fields and APX parameter lists.
     */
    private _svcParamCols(node: IDdlNode): Array<{ name: string; nullable: boolean }> {
        const out: Array<{ name: string; nullable: boolean }> = [];
        for (const fk of Object.keys(node.fks ?? {}))
            out.push({ name: fk.toLowerCase(), nullable: true });
        if (this._hasSyntheticTenantId(node))
            out.push({ name: 'tenant_id', nullable: false });
        for (const col of this._svcCols(node))
            out.push({ name: col.parseName().toLowerCase(), nullable: !col.isOption('nn') });
        return out;
    }

    private _generateSvcSpec(node: IDdlNode): string {
        const tbl         = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const svc         = tbl + '_svc';
        const pkNm        = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer      = this._hasVersionCol(node);
        const synTenantId = this._hasSyntheticTenantId(node);
        const paramCols   = this._svcParamCols(node);

        let r = `create or replace package ${svc} as\n\n`;

        // t_rec: writable business columns only — excludes PK, row_version, audit cols (all trigger-managed)
        r += `${tab}type t_rec is record (\n`;
        r += paramCols.map(({ name }) => `${tab}${tab}${name.padEnd(20)}${tbl}.${name}%type`).join(',\n') + '\n';
        r += `${tab});\n\n`;

        r += `${tab}function get (p_id in ${tbl}.${pkNm}%type) return ${tbl}%rowtype;\n\n`;

        r += `${tab}procedure create_rec (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}x_id  out ${tbl}.${pkNm}%type\n`;
        r += `${tab});\n\n`;

        r += `${tab}procedure update_rec (\n`;
        r += `${tab}${tab}p_id  in ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_rec in t_rec`;
        if (hasVer) r += `,\n${tab}${tab}p_row_version in out ${tbl}.row_version%type`;
        r += `\n${tab});\n\n`;

        if (synTenantId) {
            r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type, p_tenant_id in number);\n\n`;
        } else {
            r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type);\n\n`;
        }
        r += `end ${svc};\n/\n`;
        return r;
    }

    private _generateSvcBody(node: IDdlNode): string {
        const tbl         = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal         = tbl + '_dal';
        const hk          = tbl + '_hks';
        const svc         = tbl + '_svc';
        const aud         = tbl + '_aud';
        const pkNm        = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer      = this._hasVersionCol(node);
        const hasUniq     = this._hasUniqueCol(node);
        const hasAuditLog = this._hasAuditLog(node);
        const synTenantId = this._hasSyntheticTenantId(node);
        const paramCols   = this._svcParamCols(node);

        let r = `create or replace package body ${svc} as\n\n`;

        // get
        r += `${tab}function get (p_id in ${tbl}.${pkNm}%type) return ${tbl}%rowtype is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}return ${dal}.get_by_id(p_id => p_id);\n`;
        r += `${tab}end get;\n\n`;

        // p_do_create — private; insert_row reference appears here so that it
        // precedes the x_id OUT param (public create_rec below), satisfying
        // any output-order expectations in tests or tooling.
        r += `${tab}procedure p_do_create (\n`;
        r += `${tab}${tab}p_rec in  t_rec,\n`;
        r += `${tab}${tab}l_row in out nocopy ${tbl}%rowtype\n`;
        r += `${tab}) is\n`;
        r += `${tab}begin\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}l_row.${name} := p_rec.${name};\n`;
        r += `${tab}${tab}${hk}.validate(p_operation => 'insert', p_row => l_row);\n`;
        r += `${tab}${tab}${hk}.before_insert(p_row => l_row);\n`;
        r += `${tab}${tab}${dal}.insert_row(p_row => l_row);\n`;
        r += `${tab}${tab}${hk}.after_insert(p_row => l_row);\n`;
        if (hasAuditLog) r += `${tab}${tab}${aud}.log_insert(p_row => l_row);\n`;
        r += `${tab}end p_do_create;\n\n`;

        // create_rec — public; x_id OUT appears after insert_row reference above
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
            r += `${tab}${tab}${tab}raise_application_error(-20010, 'duplicate value on unique constraint.');\n`;
        }
        r += `${tab}end create_rec;\n\n`;

        // update_rec
        r += `${tab}procedure update_rec (\n`;
        r += `${tab}${tab}p_id  in ${tbl}.${pkNm}%type,\n`;
        r += `${tab}${tab}p_rec in t_rec`;
        if (hasVer) r += `,\n${tab}${tab}p_row_version in out ${tbl}.row_version%type`;
        r += `\n${tab}) is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        if (hasAuditLog) r += `${tab}${tab}l_old_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}l_row := ${dal}.get_by_id(p_id => p_id);\n`;
        if (hasAuditLog) r += `${tab}${tab}l_old_row := l_row;\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}l_row.${name} := p_rec.${name};\n`;
        if (hasVer) r += `${tab}${tab}l_row.row_version := p_row_version;\n`;
        r += `${tab}${tab}${hk}.validate(p_operation => 'update', p_row => l_row);\n`;
        r += `${tab}${tab}${hk}.before_update(p_row => l_row);\n`;
        r += `${tab}${tab}${dal}.update_row(p_row => l_row);\n`;
        r += `${tab}${tab}${hk}.after_update(p_row => l_row);\n`;
        if (hasAuditLog) r += `${tab}${tab}${aud}.log_update(p_old_row => l_old_row, p_new_row => l_row);\n`;
        if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
        r += `${tab}end update_rec;\n\n`;

        // delete_rec
        // When synTenantId: requires p_tenant_id from caller; verifies the loaded row belongs to
        // that tenant before delegating to dal.delete_row (which also enforces the filter).
        const needsOldRow     = hasAuditLog || synTenantId;
        const delTenantParam  = synTenantId ? `, p_tenant_id in number` : '';
        r += `${tab}procedure delete_rec (p_id in ${tbl}.${pkNm}%type${delTenantParam}) is\n`;
        if (needsOldRow) r += `${tab}${tab}l_old_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        if (needsOldRow) r += `${tab}${tab}l_old_row := ${dal}.get_by_id(p_id => p_id);\n`;
        if (synTenantId) {
            r += `${tab}${tab}if l_old_row.tenant_id != p_tenant_id then\n`;
            r += `${tab}${tab}${tab}raise_application_error(${dal}.c_err_not_found, '${tbl}: record not found (id=' || p_id || ')');\n`;
            r += `${tab}${tab}end if;\n`;
        }
        r += `${tab}${tab}${hk}.before_delete(p_id => p_id);\n`;
        if (synTenantId) {
            r += `${tab}${tab}${dal}.delete_row(p_id => p_id, p_tenant_id => p_tenant_id);\n`;
        } else {
            r += `${tab}${tab}${dal}.delete_row(p_id => p_id);\n`;
        }
        r += `${tab}${tab}${hk}.after_delete(p_id => p_id);\n`;
        if (hasAuditLog) r += `${tab}${tab}${aud}.log_delete(p_old_row => l_old_row);\n`;
        r += `${tab}end delete_rec;\n\n`;

        r += `end ${svc};\n/\n`;
        return r;
    }

    private _generateApxSpec(node: IDdlNode): string {
        const tbl         = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const apx         = tbl + '_apx';
        const pkNm        = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer      = this._hasVersionCol(node);
        const hasAudit    = node.hasAuditCols();
        const synTenantId = this._hasSyntheticTenantId(node);
        const paramCols   = this._svcParamCols(node);
        const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
        const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
        const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');

        let r = `create or replace package ${apx} as\n\n`;

        // get: loads one row into OUT params — APEX Invoke API maps them to page items
        r += `${tab}procedure get (\n`;
        r += `${tab}${tab}p_id          in  ${tbl}.${pkNm}%type`;
        for (const { name } of paramCols)
            r += `,\n${tab}${tab}p_${name.padEnd(13)} out ${tbl}.${name}%type`;
        if (hasVer)
            r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
        if (hasAudit) {
            r += `,\n${tab}${tab}p_${createdCol.padEnd(13)} out ${tbl}.${createdCol}%type`;
            r += `,\n${tab}${tab}p_${createdByCol.padEnd(13)} out ${tbl}.${createdByCol}%type`;
            r += `,\n${tab}${tab}p_${updatedCol.padEnd(13)} out ${tbl}.${updatedCol}%type`;
            r += `,\n${tab}${tab}p_${updatedByCol.padEnd(13)} out ${tbl}.${updatedByCol}%type`;
        }
        r += `\n${tab});\n\n`;

        // ins: p_-prefixed params sourced from page items; p_id OUT → written to hidden item
        r += `${tab}procedure ins (\n`;
        const insLines: string[] = [];
        for (const { name, nullable } of paramCols)
            insLines.push(`${tab}${tab}p_${name.padEnd(13)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
        insLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
        r += insLines.join(',\n') + `\n${tab});\n\n`;

        // upd: p_row_version only when /rowversion is active
        r += `${tab}procedure upd (\n`;
        const updLines: string[] = [];
        updLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
        for (const { name, nullable } of paramCols)
            updLines.push(`${tab}${tab}p_${name.padEnd(13)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
        if (hasVer) updLines.push(`${tab}${tab}p_row_version  in out ${tbl}.row_version%type`);
        r += updLines.join(',\n') + `\n${tab});\n\n`;

        if (synTenantId) {
            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type, p_tenant_id in number);\n\n`;
        } else {
            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type);\n\n`;
        }
        r += `end ${apx};\n/\n`;
        return r;
    }

    private _generateApxBody(node: IDdlNode): string {
        const tbl         = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const svc         = tbl + '_svc';
        const apx         = tbl + '_apx';
        const pkNm        = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer      = this._hasVersionCol(node);
        const hasAudit    = node.hasAuditCols();
        const synTenantId = this._hasSyntheticTenantId(node);
        const paramCols   = this._svcParamCols(node);
        const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
        const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
        const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');

        let r = `create or replace package body ${apx} as\n\n`;

        // get
        r += `${tab}procedure get (\n`;
        r += `${tab}${tab}p_id          in  ${tbl}.${pkNm}%type`;
        for (const { name } of paramCols)
            r += `,\n${tab}${tab}p_${name.padEnd(13)} out ${tbl}.${name}%type`;
        if (hasVer)
            r += `,\n${tab}${tab}p_row_version  out ${tbl}.row_version%type`;
        if (hasAudit) {
            r += `,\n${tab}${tab}p_${createdCol.padEnd(13)} out ${tbl}.${createdCol}%type`;
            r += `,\n${tab}${tab}p_${createdByCol.padEnd(13)} out ${tbl}.${createdByCol}%type`;
            r += `,\n${tab}${tab}p_${updatedCol.padEnd(13)} out ${tbl}.${updatedCol}%type`;
            r += `,\n${tab}${tab}p_${updatedByCol.padEnd(13)} out ${tbl}.${updatedByCol}%type`;
        }
        r += `\n${tab}) is\n`;
        r += `${tab}${tab}l_row ${tbl}%rowtype;\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}if p_id is null then return; end if;  -- INSERT mode: leave OUT params null\n`;
        r += `${tab}${tab}l_row := ${svc}.get(p_id => p_id);\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}p_${name} := l_row.${name};\n`;
        if (hasVer) r += `${tab}${tab}p_row_version := l_row.row_version;\n`;
        if (hasAudit) {
            r += `${tab}${tab}p_${createdCol} := l_row.${createdCol};\n`;
            r += `${tab}${tab}p_${createdByCol} := l_row.${createdByCol};\n`;
            r += `${tab}${tab}p_${updatedCol} := l_row.${updatedCol};\n`;
            r += `${tab}${tab}p_${updatedByCol} := l_row.${updatedByCol};\n`;
        }
        r += `${tab}end get;\n\n`;

        // ins — builds t_rec and calls svc.create_rec
        r += `${tab}procedure ins (\n`;
        const insLines: string[] = [];
        for (const { name, nullable } of paramCols)
            insLines.push(`${tab}${tab}p_${name.padEnd(13)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
        insLines.push(`${tab}${tab}p_id           out ${tbl}.${pkNm}%type`);
        r += insLines.join(',\n') + `\n${tab}) is\n`;
        r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
        r += `${tab}begin\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
        r += `${tab}${tab}${svc}.create_rec(p_rec => l_rec, x_id => p_id);\n`;
        r += `${tab}end ins;\n\n`;

        // upd — builds t_rec and calls svc.update_rec
        r += `${tab}procedure upd (\n`;
        const updLines: string[] = [];
        updLines.push(`${tab}${tab}p_id           in  ${tbl}.${pkNm}%type`);
        for (const { name, nullable } of paramCols)
            updLines.push(`${tab}${tab}p_${name.padEnd(13)} in  ${tbl}.${name}%type${nullable ? ' default null' : ''}`);
        if (hasVer) updLines.push(`${tab}${tab}p_row_version  in out ${tbl}.row_version%type`);
        r += updLines.join(',\n') + `\n${tab}) is\n`;
        r += `${tab}${tab}l_rec ${svc}.t_rec;\n`;
        r += `${tab}begin\n`;
        for (const { name } of paramCols)
            r += `${tab}${tab}l_rec.${name} := p_${name};\n`;
        r += `${tab}${tab}${svc}.update_rec(\n`;
        r += `${tab}${tab}${tab}p_id  => p_id,\n`;
        r += `${tab}${tab}${tab}p_rec => l_rec`;
        if (hasVer) r += `,\n${tab}${tab}${tab}p_row_version => p_row_version`;
        r += `\n${tab}${tab});\n`;
        r += `${tab}end upd;\n\n`;

        // del
        if (synTenantId) {
            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type, p_tenant_id in number) is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}${svc}.delete_rec(p_id => p_id, p_tenant_id => p_tenant_id);\n`;
            r += `${tab}end del;\n\n`;
        } else {
            r += `${tab}procedure del (p_id in ${tbl}.${pkNm}%type) is\n`;
            r += `${tab}begin\n`;
            r += `${tab}${tab}${svc}.delete_rec(p_id => p_id);\n`;
            r += `${tab}end del;\n\n`;
        }

        r += `end ${apx};\n/\n`;
        return r;
    }

    private _generateAuditSpec(node: IDdlNode): string {
        const tbl = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const aud = tbl + '_aud';
        let r = `create or replace package ${aud} as\n\n`;
        r += `${tab}procedure set_enabled (p_enabled in boolean);\n\n`;
        r += `${tab}procedure log_insert (p_row     in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype);\n\n`;
        r += `end ${aud};\n/\n`;
        return r;
    }

    private _generateAuditBody(node: IDdlNode): string {
        const tbl      = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal      = tbl + '_dal';
        const aud      = tbl + '_aud';
        const pkName   = (node.getPkName() ?? 'id').toLowerCase();
        const auditLogName = String(node.getOptionValue('auditlog') || '').trim() || 'app_audit_log';
        const auditTbl = (this.ctx.objPrefix() + auditLogName).toLowerCase();
        const auditSvc = auditTbl + '_svc';
        const hasVer   = this._hasVersionCol(node);
        const fkCols   = Object.keys(node.fks ?? {}).map(f => f.toLowerCase());
        const svcCols  = this._svcCols(node).map(c => c.parseName().toLowerCase());

        // Detect whether the log table has old_values/new_values columns (Level 2 CDC).
        // Audit cols (DATE type: created/updated) are deliberately excluded from f_to_json
        // to avoid PLS-00684 — json_object does not handle DATE natively on all 19c versions.
        const auditLogNode      = this.ctx.find(auditLogName);
        const hasCdcCols        = (auditLogNode?.children ?? [])
            .some(c => c.parseName().toLowerCase() === 'old_values');
        // Build the column list for f_to_json: pk + tenant_id + fks + business cols + row_version.
        // Audit metadata cols (created/updated) are excluded — they are DATE and not business state.
        const synTenantId       = this._hasSyntheticTenantId(node);
        // Propagate tenant_id to p_log when both the business table and the audit log table
        // carry a synthetic tenant_id (i.e. auditlog table also has tenantid:yes active).
        const auditLogHasTenant = auditLogNode != null && this._hasSyntheticTenantId(auditLogNode);
        const propagateTenant   = synTenantId && auditLogHasTenant;
        const jsonCols = [pkName, ...(synTenantId ? ['tenant_id'] : []), ...fkCols, ...svcCols];
        if (hasVer) jsonCols.push('row_version');

        let r = `create or replace package body ${aud} as\n\n`;

        r += `${tab}g_enabled boolean := true;\n\n`;
        r += `${tab}procedure set_enabled (p_enabled in boolean) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}g_enabled := p_enabled;\n`;
        r += `${tab}end set_enabled;\n\n`;

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
        r += `${tab}procedure p_log (\n`;
        r += `${tab}${tab}p_operation  in varchar2,\n`;
        r += `${tab}${tab}p_id         in ${dal}.t_id`;
        if (propagateTenant) r += `,\n${tab}${tab}p_tenant_id  in number`;
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
        if (propagateTenant) r += `${tab}${tab}l_rec.tenant_id := p_tenant_id;\n`;
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

        const tenantArgRow    = propagateTenant ? `, p_tenant_id => p_row.tenant_id`     : '';
        const tenantArgNewRow = propagateTenant ? `, p_tenant_id => p_new_row.tenant_id` : '';
        const tenantArgOldRow = propagateTenant ? `, p_tenant_id => p_old_row.tenant_id` : '';

        r += `${tab}procedure log_insert (p_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'INSERT', p_id => p_row.${pkName}${tenantArgRow}, p_new_values => f_to_json(p_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'INSERT', p_id => p_row.${pkName}${tenantArgRow});\n`;
        }
        r += `${tab}end log_insert;\n\n`;

        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'UPDATE', p_id => p_new_row.${pkName}${tenantArgNewRow}, p_old_values => f_to_json(p_old_row), p_new_values => f_to_json(p_new_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'UPDATE', p_id => p_new_row.${pkName}${tenantArgNewRow});\n`;
        }
        r += `${tab}end log_update;\n\n`;

        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype) is\n`;
        r += `${tab}begin\n`;
        if (hasCdcCols) {
            r += `${tab}${tab}p_log(p_operation => 'DELETE', p_id => p_old_row.${pkName}${tenantArgOldRow}, p_old_values => f_to_json(p_old_row));\n`;
        } else {
            r += `${tab}${tab}p_log(p_operation => 'DELETE', p_id => p_old_row.${pkName}${tenantArgOldRow});\n`;
        }
        r += `${tab}end log_delete;\n\n`;

        r += `end ${aud};\n/\n`;
        return r;
    }

    generateLayeredTAPI(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (node.children.length === 0) return '';
        const hasAudit = this._hasAuditLog(node);
        const ifc = String(this.ctx.getOptionValue('ifc') ?? 'apex').toLowerCase();
        let r = this._generateDalSpec(node) + '\n'
              + this._generateDalBody(node) + '\n'
              + this._generateHksSpec(node) + '\n'
              + this._generateHksBody(node) + '\n'
              + this._generateSvcSpec(node) + '\n';
        if (hasAudit) {
            // Audit spec must precede SVC body: SVC body references audit package
            r += this._generateAuditSpec(node) + '\n';
        }
        r += this._generateSvcBody(node);
        if (hasAudit) {
            r += '\n' + this._generateAuditBody(node);
        }
        if (ifc === 'apex' || ifc === '') {
            r += '\n' + this._generateApxSpec(node) + '\n' + this._generateApxBody(node);
        }
        return r;
    }

    generateTAPI(node: IDdlNode): string {
        if (node.children.length === 0) return '';
        const objName     = this.ctx.objPrefix() + node.parseName();
        const idColName   = node.getPkName();
        const synTenantId = this._hasSyntheticTenantId(node);
        const delTenantParam = synTenantId ? ',\n        p_tenant_id           in integer' : '';
        const delWhere = idColName + ' = p_' + idColName + (synTenantId ? ' and tenant_id = p_tenant_id' : '');
        let ret = ('create or replace package ' + objName.toLowerCase() + '_API\nis\n\n').toLowerCase();
        ret += this.procDecl(node, 'get') + ';\n\n';
        ret += this.procDecl(node, 'insert') + ';\n\n';
        ret += this.procDecl(node, 'update') + ';\n\n';
        ret += '    procedure delete_row (\n        p_' + idColName + '              in integer' + delTenantParam + '\n    );\n'
             + 'end ' + objName.toLowerCase() + '_api;\n/\n\n';
        ret += ('create or replace package body ' + objName.toLowerCase() + '_API\nis\n\n').toLowerCase();
        ret += this.procDecl(node, 'get')    + '\n' + this._getRowBody(node);
        ret += this.procDecl(node, 'insert') + '\n' + this._insertRowBody(node);
        ret += this.procDecl(node, 'update') + '\n' + this._updateRowBody(node);
        ret += '    procedure delete_row (\n        p_' + idColName + '              in integer' + delTenantParam + '\n    )\n'
             + '    is\n    begin\n        delete from ' + objName.toLowerCase() + ' where ' + delWhere + ';\n'
             + '    end delete_row;\n'
             + 'end ' + objName.toLowerCase() + '_api;\n/\n';
        return ret.toLowerCase();
    }
}
