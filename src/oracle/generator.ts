import { singular, concatNames, getMajorVersion } from '../utils/naming.js';
import split_str from '../utils/split-str.js';
import { DdlNode, DEFAULT_NAMING, tab, EXPANDING_TYPES } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode, SemanticType } from '../compiler/types.js';
import { BaseGenerator } from '../compiler/base-generator.js';
import { toOracleType, oraclePkTypeModifier, isDb23 } from './types.js';
import { OracleViewBuilder } from './view.js';
import { OraclePlsqlBuilder } from './plsql.js';

// ── Local constants ───────────────────────────────────────────────────────────

const NOT_NULL_LOWER = ' not null';

function trimTrailingComma(s: string): string {
    if (s.lastIndexOf(',\n') === s.length - 2)
        s = s.substring(0, s.length - 2) + '\n';
    return s;
}

// ── OracleDDLGenerator ────────────────────────────────────────────────────────

export class OracleDDLGenerator extends BaseGenerator {
    private _naming: Naming;
    private _view:   OracleViewBuilder;
    private _plsql:  OraclePlsqlBuilder;

    constructor(ddlCtx: DdlContext, naming?: Naming) {
        super(ddlCtx);
        this._naming = naming ?? DEFAULT_NAMING;
        this._view   = new OracleViewBuilder(ddlCtx, this._naming);
        this._plsql  = new OraclePlsqlBuilder(ddlCtx, this._naming);
    }

    /** Map a SemanticType to an Oracle DDL column type string. */
    colType(sem: SemanticType): string { return this._toOracleType(sem); }

    private _pkTypeModifier(objName: string, namingOverride?: Naming): string {
        return oraclePkTypeModifier(objName, this._ddl, namingOverride ?? this._naming);
    }

    private _globalOnDelete(): string {
        const v = (this._ddl.getOptionValue('ondelete') as string | null) ?? '';
        if (v === 'cascade')   return ' on delete cascade';
        if (v === 'set null')  return ' on delete set null';
        if (v === 'restrict')  return ' on delete restrict';
        return '';
    }

    /** Constraint-line prefix — aligns 'constraint' keyword under the type column. */
    private _cpad(colNode: IDdlNode): string {
        return tab + tab + ' '.repeat(colNode.parent!.maxChildNameLen());
    }

    protected override _fkColType(refNode: IDdlNode): string | null {
        const rname = refNode.getExplicitPkName();
        if (rname === null || rname.includes(',')) return null;
        const pkChild = refNode.findChild(rname);
        return pkChild !== null ? this._toOracleType(pkChild._inferTypeFull()) : refNode.getPkType();
    }

    _toOracleType(sem: SemanticType): string {
        return toOracleType(sem, this._ddl.semantics(), isDb23(this._ddl));
    }

    _buildColumnConstraints(node: IDdlNode, ret: string, sem: SemanticType): string {
        if (node.isOption('unique') || node.isOption('uk')) {
            const parentIsNoTenant = node.parent !== null && node.parent.isOption('notenantid');
            if (!this._ddl.optionEQvalue('tenantid', true) || parentIsNoTenant) {
                ret += '\n';
                ret += this._cpad(node) + 'constraint ' + concatNames(this._ddl.objPrefix(), sem.parent_child, this._naming.unq) + ' unique';
            }
            // When tenantid: yes on a tenant table, inline unique is suppressed and replaced by
            // a (tenant_id, col) composite unique index generated in _genIndexes()
        }
        let optQuote = "'";
        if (ret.startsWith('integer') || ret.startsWith('number') || ret.startsWith('date')) optQuote = '';
        if (node.isOption('default')) {
            const value = node.getDefaultValue() ?? '';
            const sqlDateExpressions = ['sysdate', 'current_date', 'current_timestamp', 'systimestamp', 'localtimestamp'];
            if (sem.isNativeBoolean) {
                const boolVal = (value.toUpperCase() === 'Y' || value.toLowerCase() === 'true') ? 'true' : 'false';
                ret += ' default on null ' + boolVal;
            } else if (sqlDateExpressions.includes(value.toLowerCase()))
                ret += ' default on null ' + value;
            else
                ret += ' default on null ' + optQuote + value + optQuote;
        }
        if (node.isOption('nn') || node.indexOf('not') + 1 === node.indexOf('null'))
            if (node.indexOf('pk') < 0) ret += ' not null';
        if (node.isOption('hidden') || node.isOption('invincible')) ret += ' invisible';
        if (!sem.isNativeBoolean) ret += node.genConstraint(optQuote);
        if (sem.needsBoolCheck)
            ret += '\n' + this._cpad(node)
                + 'constraint ' + concatNames(this._ddl.objPrefix(), sem.parent_child)
                + ` check (${node.parseName()} in ('Y','N'))`;
        if (node.isOption('between')) {
            const values = node.getBetweenClause() ?? '';
            ret += ' constraint ' + concatNames(sem.parent_child, this._naming.bet) + '\n';
            ret += '           check (' + node.parseName() + ' between ' + values + ')';
        }
        if (node.isOption('pk')) {
            const typeModifier = ret.startsWith('number')
                ? ' ' + this._pkTypeModifier(this._ddl.objPrefix() + node.parent!.parseName())
                : ' not null';
            ret += typeModifier + '\n';
            ret += this._cpad(node) + 'constraint ' + concatNames(this._ddl.objPrefix(), sem.parent_child, this._naming.pk) + ' primary key';
        }
        if (node.annotations !== null) {
            if (0 <= ret.indexOf('\n'))
                ret += '\n' + this._cpad(node) + 'annotations (' + node.annotations + ')';
            else
                ret += ' annotations (' + node.annotations + ')';
        }
        return ret;
    }

    _genSequence(_node: IDdlNode, objName: string): string {
        if (this._ddl.optionEQvalue('pk', 'SEQ') && this._ddl.optionEQvalue('genpk', true))
            return 'create sequence  ' + objName + '_seq;\n\n';
        return '';
    }

    _genTableHeader(node: IDdlNode, objName: string, immutableKeyword: string, idColName: string | null): string {
        let ret = 'create ' + immutableKeyword + 'table ' + objName + ' (\n';
        const pad = tab + ' '.repeat(node.maxChildNameLen() - 'ID'.length);
        if (idColName !== null && !node.isOption('pk')) {
            ret += tab + idColName + pad + 'number ' + this._pkTypeModifier(objName) + '\n';
            const obj_col = concatNames(this._ddl.objPrefix('no schema') + node.parseName(), '_', idColName);
            ret += tab + tab + ' '.repeat(node.maxChildNameLen()) + 'constraint ' + concatNames(obj_col, this._naming.pk) + ' primary key,\n';
        } else {
            const pkName = node.getExplicitPkName();
            if (pkName !== null && pkName.indexOf(',') < 0) {
                const pkPad = tab + ' '.repeat(node.maxChildNameLen() - pkName.length);
                let type = 'number';
                const child = node.findChild(pkName);
                if (child !== null) type = this.parseType(child);
                ret += tab + pkName + pkPad + type + ',\n';
            }
        }
        return ret;
    }

    _genFkColumns(node: IDdlNode, objName: string): string {
        let ret = '';
        for (let fk in node.fks) {
            let parent = node.fks![fk];
            if (0 < fk.indexOf(',')) {
                const refNode = this._ddl.find(parent);
                const chunks = split_str(fk, ', ');
                for (let i = 0; i < chunks.length; i++) {
                    const col = chunks[i];
                    if (col === ',') continue;
                    const pChild = refNode?.findChild(col);
                    const colPad = tab + ' '.repeat(node.maxChildNameLen() - col.length);
                    ret += tab + col + colPad + (pChild ? this._toOracleType(pChild._inferTypeFull()) : 'number') + ',\n';
                }
                continue;
            }
            let type = 'number';
            const attr = node.findChild(fk);
            if (attr !== null) type = attr.inferType();
            let refNode = this._ddl.find(parent);
            let _id = '';
            if (refNode !== null) {
                type = this._fkColType(refNode) ?? type;
            } else {
                refNode = this._ddl.find(fk);
                if (refNode?.isMany2One?.() && !fk.endsWith('_id')) {
                    parent = fk;
                    fk = singular(fk) ?? fk;
                    _id = '_id';
                }
            }
            const fkPad = tab + ' '.repeat(node.maxChildNameLen() - fk.length);
            ret += tab + fk + _id + fkPad + type;
            const refPrefix = this._ddl.find(parent) !== null ? this._ddl.objPrefix() : '';
            const fkColName = fk + _id;
            const _isCompFk = this._ddl.optionEQvalue('tenantid', true)
                && !node.isOption('notenantid')
                && refNode !== null && !refNode.isOption('notenantid')
                && fkColName !== 'tenant_id';
            if (_isCompFk) {
                ret += ',\n';
                // Ensure target has (tenant_id, id) unique — Oracle requires it for FK validation.
                // Generated on-demand here (not proactively for every table).
                // Index FIRST, then CONSTRAINT USING INDEX — avoids ORA-01408.
                const targetObj = refPrefix + parent;
                const tidIxName = targetObj + '_tid_id_uix';
                const tidCName  = targetObj + '_tid_id_uq';
                const tidUix = `create unique index ${tidIxName}\n    on ${targetObj} (tenant_id, id);\n`;
                const tidUq  = `alter table ${targetObj}\n    add constraint ${tidCName}\n    unique (tenant_id, id) using index ${tidIxName};\n`;
                if (!this._ddl.postponedAltersSet.has(tidUix)) {
                    this._ddl.postponedAlters.push(tidUix);
                    this._ddl.postponedAltersSet.add(tidUix);
                    this._ddl.postponedAlters.push(tidUq);
                    this._ddl.postponedAltersSet.add(tidUq);
                }
                let onDelete = '';
                if (node.isOption('cascade')) onDelete = ' on delete cascade';
                else if (node.isOption('setnull')) onDelete = ' on delete set null';
                for (const c in node.children) {
                    const child = node.children[c];
                    if (fkColName === child.parseName()) {
                        if (child.isOption('cascade')) onDelete = ' on delete cascade';
                        else if (child.isOption('setnull')) onDelete = ' on delete set null';
                        break;
                    }
                }
                if (!onDelete) onDelete = this._globalOnDelete();
                const cName = objName + '_' + fkColName + this._naming.fk;
                const alter = 'alter table ' + objName + ' add constraint ' + cName +
                    '\n    foreign key (tenant_id, ' + fkColName + ')' +
                    '\n    references ' + refPrefix + parent + ' (tenant_id, id)' + onDelete + ';\n';
                if (!this._ddl.postponedAltersSet.has(alter)) {
                    this._ddl.postponedAlters.push(alter);
                    this._ddl.postponedAltersSet.add(alter);
                }
            } else if (refNode !== null && (refNode.line < node.line || refNode.isMany2One())) {
                ret += tab + tab + ' '.repeat(node.maxChildNameLen()) + 'constraint ' + objName + '_' + fk + this._naming.fk + '\n';
                let onDelete = '';
                if (node.isOption('cascade')) onDelete = ' on delete cascade';
                else if (node.isOption('setnull')) onDelete = ' on delete set null';
                let notNull = '';
                for (const c in node.children) {
                    const child = node.children[c];
                    if (fk === child.parseName()) {
                        if (child.isOption('nn') || child.isOption('notnull')) notNull = NOT_NULL_LOWER;
                        if (child.isOption('cascade')) onDelete = ' on delete cascade';
                        else if (child.isOption('setnull')) onDelete = ' on delete set null';
                        break;
                    }
                }
                if (!onDelete) onDelete = this._globalOnDelete();
                ret += tab + tab + ' '.repeat(node.maxChildNameLen()) + 'references ' + refPrefix + parent + onDelete + notNull + ',\n';
            } else {
                ret += ',\n';
                let onDelete = '';
                if (node.isOption('cascade')) onDelete = ' on delete cascade';
                else if (node.isOption('setnull')) onDelete = ' on delete set null';
                for (const c in node.children) {
                    const child = node.children[c];
                    if (fk === child.parseName()) {
                        if (child.isOption('cascade')) onDelete = ' on delete cascade';
                        else if (child.isOption('setnull')) onDelete = ' on delete set null';
                        break;
                    }
                }
                if (!onDelete) onDelete = this._globalOnDelete();
                const alter = 'alter table ' + objName + ' add constraint ' + objName + '_' + fk + '_fk foreign key (' + fk + ') references ' + refPrefix + parent + onDelete + ';\n';
                if (!this._ddl.postponedAltersSet.has(alter)) {
                    this._ddl.postponedAlters.push(alter);
                    this._ddl.postponedAltersSet.add(alter);
                }
            }
        }
        return ret;
    }

    _genTenantIdColumn(node: IDdlNode): string {
        if (!this._ddl.optionEQvalue('tenantid', true)) return '';
        if (node.isOption('notenantid')) return '';
        if (node.findChild('tenant_id') !== null) return ''; // already declared explicitly
        const pad = tab + ' '.repeat(node.maxChildNameLen() - 'tenant_id'.length);
        // Nullable only when the table generates sample data (/insert N) — see §3 multitenant-design.md
        const nullability = node.isOption('insert') ? '' : ' not null';
        return tab + 'tenant_id' + pad + 'number' + nullability + ',\n';
    }

    _genTenantIdFk(node: IDdlNode, objName: string): void {
        if (!this._ddl.optionEQvalue('tenantid', true)) return;
        if (node.isOption('notenantid')) return;
        if (node.findChild('tenant_id') !== null) return; // explicit column — user declares the FK themselves
        const tenantRef = String(this._ddl.getOptionValue('tenantref') || 'tenants');
        if (this._ddl.find(tenantRef) === null) return;   // no tenants master table in schema
        const tenantsObj = this._ddl.objPrefix() + tenantRef;
        const cName = objName + '_tenant_id' + this._naming.fk;
        const alter = `alter table ${objName} add constraint ${cName}\n    foreign key (tenant_id) references ${tenantsObj} (id);\n`;
        if (!this._ddl.postponedAltersSet.has(alter)) {
            this._ddl.postponedAlters.push(alter);
            this._ddl.postponedAltersSet.add(alter);
        }
    }

    _genRowKeyColumn(node: IDdlNode, objName: string): string {
        if (!node.hasRowKey()) return '';
        const pad = tab + ' '.repeat(node.maxChildNameLen() - 'ROW_KEY'.length);
        let ret = tab + 'row_key' + pad + `varchar2(30${this._ddl.semantics()})\n`;
        ret += tab + tab + ' '.repeat(node.maxChildNameLen()) + 'constraint ' + objName + '_row_key' + this._naming.unq + ' unique not null,\n';
        return ret;
    }

    _genRegularColumns(node: IDdlNode, _objName: string, idColName: string | null): string {
        let ret = '';
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (idColName !== null && child.parseName() === 'id') continue;
            if (0 < child.children.length) continue;
            if (child.refId() === null) {
                if (child.parseName() === node.getExplicitPkName()) continue;
                ret += tab + this.generateTable(child) + ',\n';
                for (const type in EXPANDING_TYPES) {
                    if (0 < child.indexOf(type)) {
                        const col = child.parseName().toUpperCase();
                        for (const ext of EXPANDING_TYPES[type]) {
                            const extraCol = col + ext.suffix.toUpperCase();
                            const extPad = tab + ' '.repeat(node.maxChildNameLen() - extraCol.length);
                            ret += tab + extraCol.toLowerCase() + extPad + ext.type(this._ddl) + ',\n';
                        }
                        break;
                    }
                }
            }
        }
        return ret;
    }

    _genRowVersionColumn(node: IDdlNode): string {
        if (!node.hasRowVersion()) return '';
        const pad = tab + ' '.repeat(node.maxChildNameLen() - 'row_version'.length);
        return tab + 'row_version' + pad + 'integer not null,\n';
    }

    _genAuditColumns(node: IDdlNode): string {
        if (!node.hasAuditCols()) return '';
        let auditDateType = String(this._ddl.getOptionValue('auditdate') || this._ddl.getOptionValue('Date Data Type') || '').toLowerCase();
        let ret = '';
        const created = String(this._ddl.getOptionValue('createdcol') ?? '');
        ret += tab + created + tab + ' '.repeat(node.maxChildNameLen() - created.length) + auditDateType + ' not null,\n';
        const createdby = String(this._ddl.getOptionValue('createdbycol') ?? '');
        ret += tab + createdby + tab + ' '.repeat(node.maxChildNameLen() - createdby.length) + `varchar2(255${this._ddl.semantics()}) not null,\n`;
        const updated = String(this._ddl.getOptionValue('updatedcol') ?? '');
        ret += tab + updated + tab + ' '.repeat(node.maxChildNameLen() - updated.length) + auditDateType + ' not null,\n';
        const updatedby = String(this._ddl.getOptionValue('updatedbycol') ?? '');
        ret += tab + updatedby + tab + ' '.repeat(node.maxChildNameLen() - updatedby.length) + `varchar2(255${this._ddl.semantics()}) not null,\n`;
        return ret;
    }

    _genAdditionalColumns(node: IDdlNode): string {
        let ret = '';
        const cols = this._ddl.additionalColumns();
        for (const col in cols) {
            const type = cols[col];
            const pad  = tab + ' '.repeat(node.maxChildNameLen() - col.length);
            ret += tab + col.toUpperCase() + pad + type + ' not null,\n';
        }
        return ret;
    }

    _genTableFooter(node: IDdlNode, objName: string, immutableKeyword: string, _db23plus: boolean): string {
        const tableAnnotations = node.annotations !== null ? '\nannotations (' + node.annotations + ')' : '';
        let compressClause = '';
        if (this._ddl.optionEQvalue('compress', 'yes') || node.isOption('compress'))
            compressClause = _db23plus ? ' row store compress advanced' : ' compress';
        let immutableSuffix = (immutableKeyword !== '') ? '\nno drop until 0 days idle\nno delete until 16 days after insert' : '';
        if (immutableSuffix !== '' && compressClause !== '') compressClause = '\n' + compressClause.trimStart();
        let ret = ')' + immutableSuffix + compressClause + tableAnnotations + ';\n\n';
        if (node.isOption('audit') && !node.isOption('auditcols') &&
            !node.isOption('audit', 'col') && !node.isOption('audit', 'cols') && !node.isOption('audit', 'columns')) {
            ret += 'audit all on ' + objName + ';\n\n';
        }
        if (node.isOption('flashback') || node.isOption('fda')) {
            const archiveName = String(node.getOptionValue('flashback') || node.getOptionValue('fda') || '').trim();
            ret += 'alter table ' + objName + ' flashback archive' + (0 < archiveName.length ? ' ' + archiveName : '') + ';\n\n';
        }
        return ret;
    }

    _genMultiColFkAlters(node: IDdlNode, objName: string): string {
        let ret = '';
        for (const fk in node.fks) {
            if (0 < fk.indexOf(',')) {
                const parent = node.fks![fk];
                ret += 'alter table ' + objName + ' add constraint ' + parent + '_' + objName + '_fk foreign key (' + fk + ') references ' + parent + ';\n\n';
            }
        }
        return ret;
    }

    _genIndexes(node: IDdlNode, objName: string, _db23plus: boolean): string {
        let ret = '';
        let num = 1;

        const isTenant = this._ddl.optionEQvalue('tenantid', true);
        const isSourceSupra = node.isOption('notenantid');

        // ── FK indices ─────────────────────────────────────────────────────────────────
        // Note: (tenant_id, id) composite unique is NOT generated proactively here.
        // It is generated on-demand in _genFkColumns() when a composite FK to this
        // table is created — only tables that are actually referenced get the unique.
        for (const fk in node.fks) {
            if (!node.isMany2One()) {
                const col = fk ?? (singular(node.fks![fk]) + '_id');
                if (num === 1) ret += '-- table index\n';
                // Skip tenant prefix when: tenantid off, this table is supra-tenant,
                // FK column IS tenant_id (bug guard), or the FK target is supra-tenant.
                const fkRefNode = this._ddl.find(node.fks![fk]);
                const isTargetSupra = fkRefNode !== null && fkRefNode.isOption('notenantid');
                const skipTenantPrefix = !isTenant || isSourceSupra || col === 'tenant_id' || isTargetSupra;
                const indexCols = skipTenantPrefix ? col : `tenant_id, ${col}`;
                ret += 'create index ' + objName + this._naming.idx + (num++) + ' on ' + objName + ' (' + indexCols + ');\n\n';
            }
        }

        // ── Explicit /pk override ──────────────────────────────────────────────────────
        const cut = node.getOptionValue('pk');
        if (cut) ret += 'alter table ' + objName + ' add constraint ' + objName + this._naming.pk + ' primary key (' + cut + ');\n\n';

        // ── Table-level /unique or /uk ─────────────────────────────────────────────────
        // When tenantid: yes, scope the unique constraint to the tenant.
        const cutUnq = node.getOptionValue('unique') ?? node.getOptionValue('uk');
        if (cutUnq !== null) {
            const cols = (isTenant && !isSourceSupra) ? `tenant_id, ${cutUnq}` : cutUnq;
            ret += 'alter table ' + objName + ' add constraint ' + objName + this._naming.uk + ' unique (' + cols + ');\n\n';
        }

        // ── Column-level /unique → (tenant_id, col) scoped unique index ──────────────
        // When tenantid: yes on a tenant table, inline constraint was suppressed in
        // _buildColumnConstraints(); generate composite index here instead.
        if (isTenant && !isSourceSupra) {
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.isOption('unique') || child.isOption('uk')) {
                    const col    = child.parseName();
                    const ixName = objName + '_tid_' + col + '_uix';
                    ret += `create unique index ${ixName}\n    on ${objName} (tenant_id, ${col});\n\n`;
                }
            }
        }

        // ── Column-level /idx or /index ───────────────────────────────────────────────
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.isOption('idx') || child.isOption('index')) {
                if (num === 1) ret += '-- table index\n';
                const indexCols = (isTenant && !isSourceSupra) ? `tenant_id, ${child.parseName()}` : child.parseName();
                ret += 'create index ' + objName + this._naming.idx + (num++) + ' on ' + objName + ' (' + indexCols + ');\n';
            }
        }

        // ── Vector indices (db 23+) ───────────────────────────────────────────────────
        if (_db23plus) {
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.children.length === 0 && child.inferType() === 'vector') {
                    ret += 'create vector index ' + objName + '_vi' + (num++) + ' on ' + objName + ' (' + child.parseName() + ')\n';
                    ret += '    organization neighbor partitions\n';
                    ret += '    with distance cosine;\n\n';
                }
            }
        }

        // ── Spatial indices ───────────────────────────────────────────────────────────
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.children.length === 0 && child.inferType() === 'geometry') {
                ret += 'create index ' + objName + '_si' + (num++) + ' on ' + objName + ' (' + child.parseName() + ')\n';
                ret += '    indextype is mdsys.spatial_index_v2;\n\n';
            }
        }

        return ret;
    }

    _genComments(node: IDdlNode, objName: string): string {
        let ret = '';
        const tableComment = node.getAnnotationValue('DESCRIPTION') || node.comment;
        if (tableComment !== null) ret += "comment on table " + objName + " is '" + tableComment + "';\n";
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const colComment = child.getAnnotationValue('DESCRIPTION') || child.comment;
            if (colComment !== null && child.children.length === 0)
                ret += "comment on column " + objName + '.' + child.parseName() + " is '" + colComment + "';\n";
        }
        return ret;
    }

    parseType(node: IDdlNode): string {
        if (node.children !== null && 0 < node.children.length) return 'table';
        const t = node.inferType();
        if (t === 'view' || t === 'dv') return t;
        if (node.parent === null) return 'table';
        const sem = node._inferTypeFull();
        return this._buildColumnConstraints(node, this._toOracleType(sem), sem);
    }

    generateTable(node: IDdlNode): string {
        if (node.children.length === 0 && 0 < node.apparentDepth()) {
            let pad = tab;
            if (node.parent !== undefined && node.parent !== null)
                pad += ' '.repeat(node.parent.maxChildNameLen() - node.parseName().length);
            return node.parseName() + pad + this.parseType(node);
        }

        node.lateInitFks();
        const objName = this._ddl.objPrefix() + node.parseName();

        if (node.isOption('soda')) {
            let ret = 'create table ' + objName + ' (\n';
            ret += tab + 'id              varchar2(255' + this._ddl.semantics() + ') not null\n';
            ret += tab + '                constraint ' + objName + '_id_pk primary key,\n';
            ret += tab + 'created_on      timestamp default sys_extract_utc(systimestamp) not null,\n';
            ret += tab + 'last_modified   timestamp default sys_extract_utc(systimestamp) not null,\n';
            ret += tab + 'version         varchar2(255' + this._ddl.semantics() + ') not null,\n';
            ret += tab + 'json_document   json\n';
            ret += ');\n\n';
            return ret;
        }

        const _dbVer    = this._ddl.getOptionValue('db') as string | null;
        const _db23plus = _dbVer !== null && _dbVer.length > 0 && 23 <= (getMajorVersion(_dbVer) ?? 0);
        let immutableKeyword = '';
        if (node.isOption('immutable') && _db23plus) immutableKeyword = 'immutable ';
        const idColName = node.getGenIdColName();

        let ret = this._genSequence(node, objName);
        ret += this._genTableHeader(node, objName, immutableKeyword, idColName);
        ret += this._genTenantIdColumn(node);
        ret += this._genFkColumns(node, objName);
        ret += this._genRowKeyColumn(node, objName);
        ret += this._genRegularColumns(node, objName, idColName);
        ret += this._genRowVersionColumn(node);
        ret += this._genAuditColumns(node);
        ret += this._genAdditionalColumns(node);
        ret += node.genConstraint();
        ret = trimTrailingComma(ret);
        ret += this._genTableFooter(node, objName, immutableKeyword, _db23plus);
        ret += this._genMultiColFkAlters(node, objName);
        ret += this._genIndexes(node, objName, _db23plus);
        this._genTenantIdFk(node, objName);
        ret += this._genComments(node, objName);
        ret += '\n';
        return ret;
    }

    generateDDL(node: IDdlNode): string {
        if (node.inferType() === 'view' || node.inferType() === 'dv') return '';
        const tables = this._orderedTableNodes(node as DdlNode);
        let ret = '';
        for (let i = 0; i < tables.length; i++) ret += this.generateTable(tables[i]);
        return ret;
    }

    generateDrop(node: IDdlNode): string {
        const objName = this._ddl.objPrefix() + node.parseName();
        const dbVer   = this._ddl.getOptionValue('db') as string | null;
        const ifExists = dbVer && dbVer.length > 0 && 23 <= (getMajorVersion(dbVer) ?? 0) ? 'if exists ' : '';
        let ret = '';
        if (node.inferType() === 'view') ret = 'drop view ' + ifExists + objName + ';\n';
        if (node.inferType() === 'table') {
            ret = 'drop table ' + ifExists + objName + ' cascade constraints;\n';
            if (this._ddl.optionEQvalue('api', 'layered') &&
                node.trimmedContent().toLowerCase().includes('/api')) {
                ret += 'drop package ' + ifExists + objName + '_dal;\n';
                ret += 'drop package ' + ifExists + objName + '_hks;\n';
                ret += 'drop package ' + ifExists + objName + '_svc;\n';
                if (node.isOption('auditlog')) {
                    ret += 'drop package ' + ifExists + objName + '_aud;\n';
                }
                const ifc = String(this._ddl.getOptionValue('ifc') ?? 'apex').toLowerCase();
                if (ifc === 'apex' || ifc === '') {
                    ret += 'drop package ' + ifExists + objName + '_apx;\n';
                } else if (ifc === 'rest') {
                    ret += 'drop package ' + ifExists + objName + '_rst;\n';
                }
            } else if (this._ddl.optionEQvalue('api', 'yes')) {
                ret += 'drop package ' + ifExists + objName + '_api;\n';
            }
            if (this._ddl.optionEQvalue('pk', 'SEQ'))  ret += 'drop sequence ' + ifExists + objName + this._naming.seq + ';\n';
        }
        return ret.toLowerCase();
    }

    protected override identityRestartSql(objName: string, idColName: string, nextVal: number): string {
        return 'alter table ' + objName + '\nmodify ' + idColName
            + ' generated always  as identity restart start with ' + nextVal + ';\n\n';
    }

    // ── View / trans-table delegates ──────────────────────────────────────────
    generateView(node: DdlNode): string                { return this._view.generateView(node); }
    generateDualityView(node: DdlNode): string         { return this._view.generateDualityView(node); }
    generateTransTable(node: DdlNode): string          { return this._view.generateTransTable(node); }
    generateResolvedView(node: DdlNode): string        { return this._view.generateResolvedView(node); }

    // ── PL/SQL / ORDS / triggers delegates ───────────────────────────────────────
    restEnable(node: IDdlNode): string                 { return this._plsql.restEnable(node); }
    generateTrigger(node: IDdlNode): string            { return this._plsql.generateTrigger(node); }
    generateImmutableTrigger(node: IDdlNode): string   { return this._plsql.generateImmutableTrigger(node); }
    generateTAPI(node: IDdlNode): string               { return this._plsql.generateTAPI(node); }
    generateLayeredTAPI(node: IDdlNode): string        { return this._plsql.generateLayeredTAPI(node); }


    generateFullDDL(): string {
        const forest      = this._ddl.forest      as DdlNode[];
        const descendants = this._ddl.descendants() as DdlNode[];
        let   output      = '';

        // DROP statements
        if (this._ddl.optionEQvalue('Include Drops', 'yes'))
            for (const node of descendants) {
                const drop = this.generateDrop(node);
                if (drop) output += drop;
            }

        // Row-key sequence
        if (this._ddl.optionEQvalue('rowkey', true)) {
            output += 'create sequence  row_key_seq;\n\n';
        } else {
            for (const root of forest) {
                if (root.trimmedContent().toUpperCase().includes('/ROWKEY')) {
                    output += 'create sequence  row_key_seq;\n\n';
                    break;
                }
            }
        }

        // Tables
        output += '-- create tables\n\n';
        for (const root of forest)
            output += this.generateDDL(root) + '\n';
        for (const alter of this._ddl.postponedAlters)
            output += alter + '\n';

        // Translation tables
        const hasTransCols = descendants.some(n => n.getTransColumns().length > 0);
        if (hasTransCols) {
            const char = this._ddl.semantics();
            const p    = this._ddl.objPrefix();
            output += '-- translation support\n\n';
            output += `create table ${p}language (\n`;
            output += `    code           varchar2(5${char}) not null\n`;
            output += `                   constraint ${p}language_code_pk primary key,\n`;
            output += `    locale         varchar2(28${char}) not null\n`;
            output += `                   constraint ${p}language_locale_unq unique,\n`;
            output += `    name           varchar2(1024${char}),\n`;
            output += `    native_name    varchar2(1024${char})\n`;
            output += `);\n\n`;
            output += `create index ${p}language_i1 on ${p}language (locale);\n\n`;
            for (const node of descendants) {
                const t = this.generateTransTable(node);
                if (t) output += t;
            }
        }

        // Triggers
        let j = 0;
        for (const node of descendants) {
            const trigger = this.generateTrigger(node);
            if (trigger) { if (j++ === 0) output += '-- triggers\n'; output += trigger + '\n'; }
        }
        for (const node of descendants) {
            const trigger = this.generateImmutableTrigger(node);
            if (trigger) { if (j++ === 0) output += '-- immutable triggers\n'; output += trigger; }
        }

        // ORDS REST enable
        for (const node of descendants) {
            const ords = this.restEnable(node);
            if (ords) output += ords + '\n';
        }

        // TAPI
        j = 0;
        const isLayered = this._ddl.optionEQvalue('api', 'layered');
        // Emit shared tenant-context packages first so all DALs can reference them: the
        // read-only tenant_ctx (get_id, safe to grant broadly) and the separate, more tightly
        // granted tenant_bootstrap (set_id/clear_id, must be the CREATE CONTEXT trusted package).
        if (isLayered && this._ddl.optionEQvalue('tenantid', true)) {
            if (j++ === 0) output += '-- APIs\n';
            output += this._plsql.generateTenantCtxSpec(this._ddl.objPrefix()) + '\n';
            output += this._plsql.generateTenantCtxBody(this._ddl.objPrefix()) + '\n';
            output += this._plsql.generateTenantBootstrapSpec(this._ddl.objPrefix()) + '\n';
            output += this._plsql.generateTenantBootstrapBody(this._ddl.objPrefix()) + '\n';
        }
        for (const node of descendants) {
            const hasApiDir = node.trimmedContent().toLowerCase().includes('/api');
            if (isLayered) {
                if (!hasApiDir) continue;
                const tapi = this.generateLayeredTAPI(node);
                if (tapi) { if (j++ === 0) output += '-- APIs\n'; output += tapi + '\n'; }
            } else {
                if (this._ddl.optionEQvalue('api', false) && !hasApiDir) continue;
                const tapi = this.generateTAPI(node);
                if (tapi) { if (j++ === 0) output += '-- APIs\n'; output += tapi + '\n'; }
            }
        }

        // Views
        j = 0;
        for (const root of forest) {
            const view = this.generateView(root);
            if (view) { if (j++ === 0) output += '-- create views\n'; output += view + '\n'; }
        }
        for (const node of descendants) {
            const rv = this.generateResolvedView(node);
            if (rv) { if (j++ === 0) output += '-- create views\n'; output += rv; }
        }

        // Table groups (TGROUP annotation)
        const groups: Record<string, string[]> = {};
        for (const node of descendants) {
            if (node.inferType() !== 'table') continue;
            const groupName = node.getAnnotationValue('TGROUP');
            if (groupName != null) {
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(this._ddl.objPrefix() + node.parseName());
            }
        }
        const groupNames = Object.keys(groups);
        if (groupNames.length > 0) {
            output += '-- table groups\n';
            for (const gn of groupNames) {
                output += `insert into user_annotations_groups$ (group_name) values ('${gn}');\n`;
                for (const member of groups[gn])
                    output += `insert into user_annotations_group_members$ (group_name, object_name) values ('${gn}', '${member.toUpperCase()}');\n`;
            }
            output += '\n';
        }

        // AI enrichment (db >= 26)
        const enrichDbVer = this._ddl.getOptionValue('db') as string | null;
        if (this._ddl.optionEQvalue('aienrichment', true) &&
            enrichDbVer != null && enrichDbVer.length >= 2 &&
            (getMajorVersion(enrichDbVer) ?? 0) >= 26) {
            const enrichCalls:  string[] = [];
            const enrichGroups: Record<string, string[]> = {};
            const prefix = this._ddl.objPrefix();

            for (const node of forest) {
                const type    = node.inferType();
                const pairs   = node.getAnnotationPairs();
                const objName = (prefix + node.parseName()).toUpperCase();

                if (type === 'table') {
                    for (const pair of pairs) {
                        if (pair.label.toUpperCase() === 'TGROUP') {
                            if (pair.value != null) {
                                if (!enrichGroups[pair.value]) enrichGroups[pair.value] = [];
                                enrichGroups[pair.value].push(objName);
                            }
                            continue;
                        }
                        if (pair.value == null) continue;
                        enrichCalls.push(`    metadata_annotations.set('${pair.label}', '${pair.value}', '${objName}');`);
                    }
                    for (const col of node.children) {
                        if (col.children.length > 0) continue;
                        const colPairs = col.getAnnotationPairs();
                        const colName  = objName + '.' + col.parseName().toUpperCase();
                        for (const pair of colPairs) {
                            if (pair.value == null) continue;
                            enrichCalls.push(`    metadata_annotations.set('${pair.label}', '${pair.value}', '${colName}', 'TABLE COLUMN');`);
                        }
                    }
                } else if (type === 'view') {
                    for (const pair of pairs) {
                        if (pair.value == null) continue;
                        enrichCalls.push(`    metadata_annotations.set('${pair.label}', '${pair.value}', '${objName}', 'VIEW');`);
                    }
                }
            }

            for (const gn of Object.keys(enrichGroups)) {
                enrichCalls.push(`    metadata_annotations.create_group('${gn}');`);
                for (const member of enrichGroups[gn])
                    enrichCalls.push(`    metadata_annotations.add_to_group('${gn}', '${member}', 'TABLE');`);
            }

            if (enrichCalls.length > 0)
                output += '-- AI enrichment\nbegin\n' + enrichCalls.join('\n') + '\nend;\n/\n\n';
        }

        // Sample data
        j = 0;
        for (const root of forest) {
            const data = this.generateData(root, this._ddl.data);
            if (data) { if (j++ === 0) output += '-- load data\n\n'; output += data + '\n'; }
        }

        return output;
    }
}

// ── Generator factory ─────────────────────────────────────────────────────────
