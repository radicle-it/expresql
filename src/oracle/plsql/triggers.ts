import { getMajorVersion } from '../../utils/naming.js';
import type { Naming } from '../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../compiler/types.js';
import { bareName } from './names.js';
import { hasSyntheticTenantId } from './table-analysis.js';

function caseMethod(node: IDdlNode): string {
    if (node.isOption('lower')) return 'lower';
    if (node.isOption('upper')) return 'upper';
    return '';
}

export class OracleTriggerBuilder {
    constructor(
        private ctx: DdlContext,
        private naming: Naming,
    ) {}

    generate(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (node.isOption('soda')) return '';
        return this._generateBI(node) + this._generateBU(node);
    }

    private _generateBI(node: IDdlNode): string {
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
        ret += 'end ' + bareName(objName) + this.naming.bi + ';\n/\n\n';
        return ret;
    }

    private _generateBU(node: IDdlNode): string {
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
        ret += 'end ' + bareName(objName) + this.naming.bu + ';\n/\n\n';
        return ret;
    }

    generateImmutable(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (!node.isOption('immutable')) return '';
        const dbVer = this.ctx.getOptionValue('db') as string | null;
        if (dbVer && dbVer.length > 0 && 23 <= (getMajorVersion(dbVer) ?? 0)) return '';
        const objName     = this.ctx.objPrefix() + node.parseName();
        const pfxNS       = this.ctx.objPrefix('no schema');
        const schemaOnly  = this.ctx.objPrefix().slice(0, this.ctx.objPrefix().length - pfxNS.length).toLowerCase();
        const bareObjName = bareName(objName.toLowerCase());
        const trgName     = schemaOnly + this.naming.immutable_prefix + bareObjName + this.naming.immutable_suffix;
        let ret = 'create or replace trigger ' + trgName + '\n';
        ret += '    before update or delete\n    on ' + objName.toLowerCase() + '\ndeclare\n';
        ret += "    co_immutable_err  constant pls_integer      := -20055;\n";
        ret += "    co_immutable_msg  constant varchar2(200 char) := '" + objName.toLowerCase() + " is immutable';\n";
        ret += 'begin\n    raise_application_error(co_immutable_err, co_immutable_msg);\nend;\n/\n\n';
        return ret;
    }

    generateVersioned(node: IDdlNode): string {
        if (node.inferType() !== 'table' || !node.isOption('versioned')) return '';
        const objName    = this.ctx.objPrefix() + node.parseName();
        const tbl        = objName.toLowerCase();
        const pfxNS      = this.ctx.objPrefix('no schema');
        const schemaOnly = this.ctx.objPrefix().slice(0, this.ctx.objPrefix().length - pfxNS.length).toLowerCase();
        const bareTbl    = bareName(tbl);
        const trgName    = schemaOnly + 'trg_' + bareTbl + '_versioned';
        const vtCol   = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        const pk      = (node.getPkName() ?? 'id').toLowerCase();
        const updCl   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated').toLowerCase();
        const updByCl = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by').toLowerCase();
        const skipCols = new Set([vtCol, 'row_version', updCl, updByCl, 'is_current']);

        const changedParts: string[] = [];
        const changed = (col: string) =>
            `case when :old.${col} = :new.${col} or (:old.${col} is null and :new.${col} is null) then 0 else 1 end`;
        changedParts.push(changed(pk));
        if (hasSyntheticTenantId(this.ctx, node))
            changedParts.push(changed('tenant_id'));
        for (const fk in (node.fks ?? {}))
            changedParts.push(changed(fk.toLowerCase()));
        if (node.findChild('valid_from') === null)
            changedParts.push(changed('valid_from'));
        for (const child of node.regularColumns()) {
            const cn = child.parseName().toLowerCase();
            if (skipCols.has(cn)) continue;
            changedParts.push(changed(cn));
        }

        let r = `create or replace trigger ${trgName}\n`;
        r += `    before update or delete\n    on ${tbl}\n    for each row\ndeclare\n`;
        r += `    c_del_err  constant pls_integer := -20056;\n`;
        r += `    c_upd_err  constant pls_integer := -20057;\n`;
        r += `begin\n`;
        r += `    if deleting then\n`;
        r += `        raise_application_error(c_del_err, '[VERSIONED] ${tbl}: delete is not permitted on a versioned (insert-only) table');\n`;
        r += `    end if;\n`;
        r += `    if :old.${vtCol} is not null then\n`;
        r += `        raise_application_error(c_upd_err, '[VERSIONED] ${tbl}: this version row is already closed (${vtCol} is not null)');\n`;
        r += `    end if;\n`;
        r += `    if :new.${vtCol} is null then\n`;
        r += `        raise_application_error(c_upd_err, '[VERSIONED] ${tbl}: ${vtCol} must be set to a non-null timestamp to close the version');\n`;
        r += `    end if;\n`;
        if (changedParts.length > 0) {
            r += `    if (   ${changedParts[0]}\n`;
            for (let i = 1; i < changedParts.length; i++)
                r += `         + ${changedParts[i]}\n`;
            r += `         ) > 0\n    then\n`;
            r += `        raise_application_error(c_upd_err, '[VERSIONED] ${tbl}: only closing ${vtCol} is permitted; other columns must not change');\n`;
            r += `    end if;\n`;
        }
        r += `end trg_${bareTbl}_versioned;\n/\n\n`;
        return r;
    }
}
