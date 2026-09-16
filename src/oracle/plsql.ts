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

    // Strip schema prefix from a qualified name — used in PL/SQL END clauses where
    // Oracle requires the simple identifier, not schema.name.
    private _bare(name: string): string {
        const dot = name.indexOf('.');
        return dot >= 0 ? name.slice(dot + 1) : name;
    }

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
        ret += 'end ' + this._bare(objName) + this.naming.bi + ';\n/\n\n';
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
        ret += 'end ' + this._bare(objName) + this.naming.bu + ';\n/\n\n';
        return ret;
    }

    generateImmutableTrigger(node: IDdlNode): string {
        if (node.inferType() !== 'table') return '';
        if (!node.isOption('immutable')) return '';
        const dbVer = this.ctx.getOptionValue('db') as string | null;
        if (dbVer && dbVer.length > 0 && 23 <= (getMajorVersion(dbVer) ?? 0)) return '';
        const objName     = this.ctx.objPrefix() + node.parseName();
        const pfxNS       = this.ctx.objPrefix('no schema');
        const schemaOnly  = this.ctx.objPrefix().slice(0, this.ctx.objPrefix().length - pfxNS.length).toLowerCase();
        const bareObjName = this._bare(objName.toLowerCase());
        const trgName     = schemaOnly + this.naming.immutable_prefix + bareObjName + this.naming.immutable_suffix;
        let ret = 'create or replace trigger ' + trgName + '\n';
        ret += '    before update or delete\n    on ' + objName.toLowerCase() + '\ndeclare\n';
        ret += "    co_immutable_err  constant pls_integer      := -20055;\n";
        ret += "    co_immutable_msg  constant varchar2(200 char) := '" + objName.toLowerCase() + " is immutable';\n";
        ret += 'begin\n    raise_application_error(co_immutable_err, co_immutable_msg);\nend;\n/\n\n';
        return ret;
    }

    generateVersionedTrigger(node: IDdlNode): string {
        if (node.inferType() !== 'table' || !node.isOption('versioned')) return '';
        const objName    = this.ctx.objPrefix() + node.parseName();
        const tbl        = objName.toLowerCase();
        const pfxNS      = this.ctx.objPrefix('no schema');
        const schemaOnly = this.ctx.objPrefix().slice(0, this.ctx.objPrefix().length - pfxNS.length).toLowerCase();
        const bareTbl    = this._bare(tbl);
        const trgName    = schemaOnly + 'trg_' + bareTbl + '_versioned';
        const vtCol   = ((node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        const pk      = (node.getPkName() ?? 'id').toLowerCase();
        const updCl   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated').toLowerCase();
        const updByCl = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by').toLowerCase();
        // Columns managed by other BU triggers (row_version, audit updated/*_by) legitimately
        // change on the one permitted UPDATE (valid_to closure) — exclude them from comparison.
        // is_current is a virtual column derived from vtCol — can't appear in SET list anyway.
        const skipCols = new Set([vtCol, 'row_version', updCl, updByCl, 'is_current']);

        // CASE is PL/SQL-compatible (unlike DECODE which is SQL-only).
        // Null-safe: the (x = y OR (x IS NULL AND y IS NULL)) pattern returns 0 when equal.
        const changedParts: string[] = [];
        const changed = (col: string) =>
            `case when :old.${col} = :new.${col} or (:old.${col} is null and :new.${col} is null) then 0 else 1 end`;
        changedParts.push(changed(pk));
        if (this._hasSyntheticTenantId(node))
            changedParts.push(changed('tenant_id'));
        for (const fk in (node.fks ?? {}))
            changedParts.push(changed(fk.toLowerCase()));
        // valid_from: always included — auto-injected if not user-declared, appears in
        // regularColumns() if user-declared (where it won't match skipCols, so it's added there).
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

    // ── Table API (TAPI) ──────────────────────────────────────────────────────

    /** True when tenant_id is injected synthetically (global tenantid:yes, not via FK hierarchy). */
    private _hasSyntheticTenantId(node: IDdlNode): boolean {
        return this.ctx.optionEQvalue('tenantid', true)
            && !node.isOption('notenantid')
            && node.findChild('tenant_id') === null
            && !Object.prototype.hasOwnProperty.call(node.fks ?? {}, 'tenant_id');
    }

    /**
     * Row-level scope columns declared via the global `dimensioncolumns` setting
     * (map of column name → dimension type, e.g. `{ company_id: "COMPANY" }`).
     * Unlike tenant_id, these columns are never synthesized: they must already
     * exist on the table (typically an explicit `/fk` column) — this only
     * detects which of a table's own columns are configured to carry scope.
     * Returns one entry per matching column actually present on this table
     * (usually zero or one today; the shape supports more than one dimension
     * on the same table without any special-casing).
     */
    private _dimensionScopeColumns(node: IDdlNode): Array<{ col: string; dimType: string }> {
        const configured = this.ctx.getOptionValue('dimensioncolumns') as Record<string, string> | null;
        if (configured == null || typeof configured !== 'object') return [];
        const out: Array<{ col: string; dimType: string }> = [];
        for (const col of Object.keys(configured)) {
            const cn = col.toLowerCase();
            const present = Object.prototype.hasOwnProperty.call(node.fks ?? {}, cn)
                || node.findChild(cn) !== null;
            if (present) out.push({ col: cn, dimType: configured[col] });
        }
        return out;
    }

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
        const tbl = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dimCols = this._dimensionScopeColumns(node);
        const source = dimCols.length > 0 ? `sec_pkg.secured_by_dimension(${tbl})` : tbl;
        return `create or replace view ${tbl}_rls as\nselect * from ${source};\n/\n`;
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

    // Non-PK, non-version regular columns used as SVC scalar parameters.
    private _svcCols(node: IDdlNode): IDdlNode[] {
        return node.children.filter(
            c => c.children.length === 0 &&
                 c.refId() === null &&
                 c.parseName().toLowerCase() !== 'row_version'
        );
    }

    // Parses /lockmode directive: 'nowait' | 'wait' | 'wait:n' | absent.
    // Returns the default values to embed in generated get() signatures.
    private _getLockDefaults(node: IDdlNode): { lock: string; timeout: number } {
        const raw = (node.getOptionValue('lockmode') ?? '').trim().toLowerCase();
        if (!raw || raw === 'none') return { lock: 'none', timeout: 5 };
        if (raw === 'nowait') return { lock: 'nowait', timeout: 5 };
        if (raw === 'wait') return { lock: 'wait', timeout: 5 };
        if (raw.startsWith('wait:')) {
            const n = parseInt(raw.slice(5), 10);
            return { lock: 'wait', timeout: isNaN(n) || n < 0 ? 5 : n };
        }
        return { lock: 'none', timeout: 5 };
    }

    // Normalises /api directive arg to a canonical tier name.
    // An empty or absent argument defaults to 'full+hks' (backward-compatible with 'layered').
    private _getTier(node: IDdlNode): string {
        const apiArg = node.getOptionValue('api');
        const raw    = apiArg == null || apiArg.trim() === '' ? 'full+hks'
                     : apiArg.trim().toLowerCase();
        switch (raw) {
            case 'layered': case '3h': return 'full+hks';
            case '3':                  return 'full';
            case '2h':                 return 'service+hks';
            case '2':                  return 'service';
            case '1h':                 return 'lookup+hks';
            case '1':                  return 'lookup';
            default:                   return raw;
        }
    }

    // Private DML procedures absorbed into a package body when _dal is absent.
    private _generatePrivateDml(node: IDdlNode): string {
        const tbl         = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const pkNm        = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer      = this._hasVersionCol(node);
        const hasAudit    = node.hasAuditCols();
        const svcCols     = this._svcCols(node);
        const fkCols      = Object.keys(node.fks ?? {});
        const synTenantId = this._hasSyntheticTenantId(node);
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const vtCol       = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();

        const tenantCtxPkg = this.ctx.objPrefix() + 'tenant_ctx';
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

        return r;
    }

    // Private no-op hook stubs — used inside a body when _hks is absent from the tier.
    private _generatePrivateHookStubs(node: IDdlNode): string {
        const tbl  = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const pkNm = (node.getPkName() ?? 'id').toLowerCase();
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const dimCols     = this._dimensionScopeColumns(node);
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
        return r;
    }

    private _generateDalSpec(node: IDdlNode): string {
        const tbl        = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal        = tbl + '_dal';
        const pkName      = (node.getPkName() ?? 'id').toLowerCase();
        const uniqueCols = node.children.filter(c => c.isOption('unique'));
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const vtCol       = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
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
        r += `${tab}c_err_stale_data constant pls_integer := -20001;\n`;
        r += `${tab}c_err_not_found  constant pls_integer := -20002;\n`;
        r += `${tab}c_err_locked     constant pls_integer := -20003;\n\n`;
        r += `end ${this._bare(dal)};\n/\n`;
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
        const uniqueCols = node.children.filter(c => c.isOption('unique'));
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const vtCol       = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();

        let r = `create or replace package body ${dal} as\n\n`;

        // package-level: translates ORA-00054 (resource busy) to c_err_locked
        r += `${tab}resource_busy exception;\n`;
        r += `${tab}pragma exception_init(resource_busy, -54);\n\n`;

        // All tenant-aware queries delegate to the shared <prefix>tenant_ctx package
        // instead of duplicating a private function in every DAL — single point of configuration.
        const synTenantId  = this._hasSyntheticTenantId(node);
        const tenantCtxPkg = this.ctx.objPrefix() + 'tenant_ctx';
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

        r += `end ${this._bare(dal)};\n/\n`;
        return r;
    }

    private _generateHksSpec(node: IDdlNode, hasDal: boolean): string {
        const tbl    = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal    = tbl + '_dal';
        const pkg    = tbl + '_hks';
        const idType = hasDal ? `${dal}.t_id` : `${tbl}.id%type`;
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const dimCols     = this._dimensionScopeColumns(node);
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
        r += `end ${this._bare(pkg)};\n/\n`;
        return r;
    }

    private _generateHksBody(node: IDdlNode, hasDal: boolean): string {
        const tbl    = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal    = tbl + '_dal';
        const pkg    = tbl + '_hks';
        const idType = hasDal ? `${dal}.t_id` : `${tbl}.id%type`;
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const dimCols     = this._dimensionScopeColumns(node);
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
        const out: Array<{ name: string; nullable: boolean }> = [];
        for (const fk of Object.keys(node.fks ?? {}))
            out.push({ name: fk.toLowerCase(), nullable: true });
        for (const col of this._svcCols(node))
            out.push({ name: col.parseName().toLowerCase(), nullable: !col.isOption('nn') });
        return out;
    }

    /**
     * True when the user explicitly declared the PK column in the table definition
     * (pk: none / genpk: no with e.g. `id vc100 /pk /nn`) rather than relying on an
     * auto-generated key. _svcCols() does not exclude the PK by name — an explicit PK
     * column is a real child node like any other — so paramCols/t_rec already carry it.
     */
    private _pkIsUserDefined(node: IDdlNode): boolean {
        const pkNm = (node.getPkName() ?? 'id').toLowerCase();
        return this._svcCols(node).some(c => c.parseName().toLowerCase() === pkNm);
    }

    private _generateSvcSpec(node: IDdlNode): string {
        const tbl       = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const svc       = tbl + '_svc';
        const pkNm      = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer    = this._hasVersionCol(node);
        const paramCols = this._svcParamCols(node);
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const vtCol       = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        const lockDef     = this._getLockDefaults(node);

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
        r += `end ${this._bare(svc)};\n/\n`;
        return r;
    }

    private _generateSvcBody(node: IDdlNode, hasDal: boolean, hasHks: boolean): string {
        const tbl         = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const dal         = tbl + '_dal';
        const hk          = tbl + '_hks';
        const svc         = tbl + '_svc';
        const aud         = tbl + '_aud';
        const pkNm        = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer      = this._hasVersionCol(node);
        const hasUniq     = this._hasUniqueCol(node);
        const hasAuditLog = this._hasAuditLog(node);
        const paramCols   = this._svcParamCols(node);
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        const vtCol       = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        const dimCols     = this._dimensionScopeColumns(node);
        const lockDef     = this._getLockDefaults(node);

        const getById      = hasDal ? `${dal}.get_by_id`       : 'p_get_by_id';
        const lockById     = hasDal ? `${dal}.lock_by_id`      : 'p_lock_by_id';
        const lockByIdWait = hasDal ? `${dal}.lock_by_id_wait` : 'p_lock_by_id_wait';
        const getAll    = hasDal ? `${dal}.get_all`     : 'p_get_all';
        const insertRow = hasDal ? `${dal}.insert_row`  : 'p_insert_row';
        const updateRow = hasDal ? `${dal}.update_row`  : 'p_update_row';
        const deleteRow = hasDal ? `${dal}.delete_row`  : 'p_delete_row';
        const closeRow  = hasDal ? `${dal}.close_row`   : 'p_close_row';
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

        r += `end ${this._bare(svc)};\n/\n`;
        return r;
    }

    private _generateAppSpec(node: IDdlNode): string {
        const tbl       = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const app       = tbl + '_app';
        const pkNm      = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer    = this._hasVersionCol(node);
        const hasAudit  = node.hasAuditCols();
        const paramCols       = this._svcParamCols(node);
        const pkIsUserDefined = this._pkIsUserDefined(node);
        const isVersioned     = node.isOption('versioned');
        const isImmutable     = node.isOption('immutable');
        const vtCol           = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        // Flat parameter list excludes the PK — it is always handled via the explicit p_id
        // parameter below, never duplicated as p_<pkNm> too (would collide when pkNm is "id",
        // and is redundant information under two names otherwise).
        const appCols         = paramCols.filter(({ name }) => name !== pkNm);
        const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
        const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
        const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
        const lockDef      = this._getLockDefaults(node);

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
        r += `end ${this._bare(app)};\n/\n`;
        return r;
    }

    private _generateAppBody(node: IDdlNode, hasSvc: boolean, _hasDal: boolean, hasHks: boolean): string {
        const tbl       = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const svc       = tbl + '_svc';
        const hk        = tbl + '_hks';
        const app       = tbl + '_app';
        const pkNm      = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer    = this._hasVersionCol(node);
        const hasAudit  = node.hasAuditCols();
        const hasUniq   = this._hasUniqueCol(node);
        const paramCols       = this._svcParamCols(node);
        const pkIsUserDefined = this._pkIsUserDefined(node);
        const isVersioned     = node.isOption('versioned');
        const isImmutable     = node.isOption('immutable');
        const vtCol           = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        const dimCols         = this._dimensionScopeColumns(node);
        const appCols         = paramCols.filter(({ name }) => name !== pkNm);
        const createdCol   = String(this.ctx.getOptionValue('createdcol')   ?? 'created');
        const createdByCol = String(this.ctx.getOptionValue('createdbycol') ?? 'created_by');
        const updatedCol   = String(this.ctx.getOptionValue('updatedcol')   ?? 'updated');
        const updatedByCol = String(this.ctx.getOptionValue('updatedbycol') ?? 'updated_by');
        const lockDef      = this._getLockDefaults(node);
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

        r += `end ${this._bare(app)};\n/\n`;
        return r;
    }

    private _generateRstSpec(node: IDdlNode): string {
        const tbl = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const rst = tbl + '_rst';
        const isVersioned = node.isOption('versioned');
        const isImmutable = node.isOption('immutable');
        let r = `create or replace package ${rst} as\n\n`;
        r += `${tab}procedure get;\n`;
        r += `${tab}procedure get_all;\n`;
        r += `${tab}procedure ins;\n`;
        if (isVersioned) {
            r += `${tab}procedure close;\n\n`;
        } else if (isImmutable) {
            // No upd/del — append-only.
        } else {
            r += `${tab}procedure upd;\n`;
            r += `${tab}procedure del;\n\n`;
        }
        r += `end ${this._bare(rst)};\n/\n`;
        return r;
    }

    private _generateRstBody(node: IDdlNode, hasSvc: boolean, _hasDal: boolean, hasHks: boolean): string {
        const tbl       = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const svc       = tbl + '_svc';
        const hk        = tbl + '_hks';
        const rst       = tbl + '_rst';
        const pkNm      = (node.getPkName() ?? 'id').toLowerCase();
        const hasVer    = this._hasVersionCol(node);
        const lockDef   = this._getLockDefaults(node);
        const paramCols       = this._svcParamCols(node);
        const pkIsUserDefined = this._pkIsUserDefined(node);
        const isVersioned     = node.isOption('versioned');
        const isImmutable     = node.isOption('immutable');
        const vtCol           = (String(node.getOptionValue('versioned') ?? '').trim() || 'valid_to').toLowerCase();
        const dimCols         = this._dimensionScopeColumns(node);
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

        r += `end ${this._bare(rst)};\n/\n`;
        return r;
    }

    private _generateAuditSpec(node: IDdlNode): string {
        const tbl = (this.ctx.objPrefix() + node.parseName()).toLowerCase();
        const aud = tbl + '_aud';
        let r = `create or replace package ${aud} as\n\n`;
        r += `${tab}g_enabled boolean := true;\n\n`;
        r += `${tab}procedure log_insert (p_row     in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_update (p_old_row in ${tbl}%rowtype, p_new_row in ${tbl}%rowtype);\n`;
        r += `${tab}procedure log_delete (p_old_row in ${tbl}%rowtype);\n\n`;
        r += `end ${this._bare(aud)};\n/\n`;
        return r;
    }

    private _generateAuditBody(node: IDdlNode, hasDal: boolean): string {
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
        const auditLogNode = this.ctx.find(auditLogName);
        const hasCdcCols   = (auditLogNode?.children ?? [])
            .some(c => c.parseName().toLowerCase() === 'old_values');
        // Build the column list for f_to_json: pk + tenant_id + fks + business cols + row_version.
        // Audit metadata cols (created/updated) are excluded — they are DATE and not business state.
        const synTenantId = this._hasSyntheticTenantId(node);
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

        const tier     = this._getTier(node);
        const hasDal   = ['full', 'full+hks'].includes(tier);
        const hasHks   = tier.endsWith('+hks');
        const hasSvc   = ['service', 'service+hks', 'full', 'full+hks'].includes(tier);
        const hasAudit = this._hasAuditLog(node);

        // 'apex' kept as backward-compat alias for 'app'
        const ifc    = String(this.ctx.getOptionValue('interface') ?? 'app').toLowerCase();
        const genApp = ifc === 'app' || ifc === 'apex' || ifc === 'both' || ifc === '';
        const genRst = ifc === 'rest' || ifc === 'both';

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
        const pkg = (prefix + 'tenant_ctx').toLowerCase();
        let r = `-- Shared tenant-isolation context provider (read-only side)\n`;
        r += `create or replace package ${pkg} as\n\n`;
        r += `${tab}-- Returns the tenant ID bound to the current session (null when not set).\n`;
        r += `${tab}-- Safe to grant broadly: a SYS_CONTEXT read carries no privilege restriction.\n`;
        r += `${tab}function get_id return integer;\n\n`;
        r += `end ${this._bare(pkg)};\n/\n`;
        return r;
    }

    /** Body for the shared tenant-context package (read-only side). */
    generateTenantCtxBody(prefix: string): string {
        const pkg = (prefix + 'tenant_ctx').toLowerCase();
        let r = `create or replace package body ${pkg} as\n\n`;
        r += `${tab}function get_id return integer is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}return to_number(sys_context('${pkg}', 'tenant_id'));\n`;
        r += `${tab}end get_id;\n\n`;
        r += `end ${this._bare(pkg)};\n/\n`;
        return r;
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
        const ctxPkg = (prefix + 'tenant_ctx').toLowerCase();
        const bootPkg = (prefix + 'tenant_bootstrap').toLowerCase();
        let r = `-- Tenant-isolation bootstrap provider (mutating side: set_id/clear_id)\n`;
        r += `-- Run once as DBA: create or replace context ${ctxPkg} using ${bootPkg};\n`;
        r += `-- Grant EXECUTE on ${bootPkg} ONLY to a trusted bootstrap principal (logon trigger\n`;
        r += `-- owner or auth handler) — never to the general application/APEX runtime role.\n`;
        r += `create or replace package ${bootPkg} as\n\n`;
        r += `${tab}-- Binds the tenant ID at session start (logon trigger or REST auth handler).\n`;
        r += `${tab}procedure set_id(p_tenant_id in integer);\n\n`;
        r += `${tab}-- Clears the tenant ID bound to the current session (connection-pool checkout\n`;
        r += `${tab}-- boundaries, logoff, or test teardown).\n`;
        r += `${tab}procedure clear_id;\n\n`;
        r += `end ${this._bare(bootPkg)};\n/\n`;
        return r;
    }

    /** Body for the tenant-bootstrap package (mutating side: set_id/clear_id). */
    generateTenantBootstrapBody(prefix: string): string {
        const ctxPkg = (prefix + 'tenant_ctx').toLowerCase();
        const bootPkg = (prefix + 'tenant_bootstrap').toLowerCase();
        let r = `create or replace package body ${bootPkg} as\n\n`;
        r += `${tab}procedure set_id(p_tenant_id in integer) is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}dbms_session.set_context('${ctxPkg}', 'tenant_id', to_char(p_tenant_id));\n`;
        r += `${tab}end set_id;\n\n`;
        r += `${tab}procedure clear_id is\n`;
        r += `${tab}begin\n`;
        r += `${tab}${tab}dbms_session.clear_context('${ctxPkg}');\n`;
        r += `${tab}end clear_id;\n\n`;
        r += `end ${this._bare(bootPkg)};\n/\n`;
        return r;
    }
}
