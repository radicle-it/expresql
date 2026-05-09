import { singular, concatNames } from '../utils/naming.js';
import split_str from '../utils/split-str.js';
import { DdlNode, DEFAULT_NAMING, tab } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import type { DdlContext, IDdlNode, SemanticType } from '../compiler/types.js';
import { BaseGenerator } from '../compiler/base-generator.js';
import { toDb2Type } from './types.js';
import { Db2PlsqlBuilder } from './plsql.js';

// ── Local helpers ─────────────────────────────────────────────────────────────

const NOT_NULL_LOWER = ' not null';

function trimTrailingComma(s: string): string {
    if (s.lastIndexOf(',\n') === s.length - 2)
        s = s.substring(0, s.length - 2) + '\n';
    return s;
}

// ── Db2DDLGenerator ───────────────────────────────────────────────────────────

export class Db2DDLGenerator extends BaseGenerator {
    private _naming: Naming;
    private _plsql:  Db2PlsqlBuilder;

    constructor(ddlCtx: DdlContext, naming?: Naming) {
        super(ddlCtx);
        this._naming = naming ?? DEFAULT_NAMING;
        this._plsql  = new Db2PlsqlBuilder(ddlCtx, this._naming);
    }

    colType(sem: SemanticType): string { return toDb2Type(sem); }

    // ── PK helpers ────────────────────────────────────────────────────────────

    private _pkColType(objName: string): string {
        if (this._ddl.optionEQvalue('pk', 'seq'))
            return `integer not null default next value for ${objName}${this._naming.seq}`;
        // 'guid' is Oracle's default — map to IDENTITY for Db2; real UUID requires a UDF
        return 'integer not null generated always as identity (start with 1 increment by 1)';
    }

    private _genSequence(objName: string): string {
        if (this._ddl.optionEQvalue('pk', 'seq') && this._ddl.optionEQvalue('genpk', true))
            return `create sequence  ${objName}${this._naming.seq} start with 1 increment by 1;\n\n`;
        return '';
    }

    protected override identityRestartSql(objName: string, idColName: string, nextVal: number): string {
        return `alter table ${objName}\n    alter column ${idColName} restart with ${nextVal};\n\n`;
    }

    // ── Column constraint builder ─────────────────────────────────────────────

    private _cpad(colNode: IDdlNode): string {
        return tab + tab + ' '.repeat(colNode.parent!.maxChildNameLen());
    }

    private _buildColumnConstraints(node: IDdlNode, ret: string, sem: SemanticType): string {
        if (node.isOption('unique') || node.isOption('uk')) {
            ret += '\n';
            ret += this._cpad(node) + 'constraint ' + concatNames(this._ddl.objPrefix(), sem.parent_child, this._naming.unq) + ' unique';
        }
        let optQuote = "'";
        if (ret.startsWith('integer') || ret.startsWith('decimal') || ret.startsWith('double') || ret.startsWith('date')) optQuote = '';
        if (node.isOption('default')) {
            const value = node.getDefaultValue() ?? '';
            const sqlDateExpressions = ['current date', 'current_date', 'current timestamp', 'current_timestamp'];
            if (sem.isNativeBoolean) {
                const boolVal = (value.toUpperCase() === 'Y' || value.toLowerCase() === 'true') ? 'true' : 'false';
                ret += ' default ' + boolVal;
            } else if (sqlDateExpressions.includes(value.toLowerCase()))
                ret += ' default ' + value;
            else
                ret += ' default ' + optQuote + value + optQuote;
        }
        if (node.isOption('nn') || node.indexOf('not') + 1 === node.indexOf('null'))
            if (node.indexOf('pk') < 0) ret += ' not null';
        if (!sem.isNativeBoolean) ret += node.genConstraint(optQuote);
        // Skip check constraint for boolean — Db2 11.5+ has native BOOLEAN
        if (sem.needsBoolCheck && toDb2Type(sem) !== 'boolean')
            ret += '\n' + this._cpad(node)
                + 'constraint ' + concatNames(this._ddl.objPrefix(), sem.parent_child)
                + ` check (${node.parseName()} in ('Y','N'))`;
        if (node.isOption('between')) {
            const values = node.getBetweenClause() ?? '';
            ret += ' constraint ' + concatNames(sem.parent_child, this._naming.bet) + '\n';
            ret += '           check (' + node.parseName() + ' between ' + values + ')';
        }
        if (node.isOption('pk')) {
            ret += ' not null\n';
            ret += this._cpad(node) + 'constraint ' + concatNames(this._ddl.objPrefix(), sem.parent_child, this._naming.pk) + ' primary key';
        }
        return ret;
    }

    parseType(node: IDdlNode): string {
        if (node.children !== null && 0 < node.children.length) return 'table';
        const t = node.inferType();
        if (t === 'view') return t;
        if (node.parent === null) return 'table';
        const sem = node._inferTypeFull();
        return this._buildColumnConstraints(node, toDb2Type(sem), sem);
    }

    // ── Table header ──────────────────────────────────────────────────────────

    private _genTableHeader(node: IDdlNode, objName: string, idColName: string | null): string {
        let ret = 'create table ' + objName + ' (\n';
        const pad = tab + ' '.repeat(node.maxChildNameLen() - 'ID'.length);
        if (idColName !== null && !node.isOption('pk')) {
            ret += tab + idColName + pad + this._pkColType(objName) + '\n';
            const obj_col = concatNames(this._ddl.objPrefix('no schema') + node.parseName(), '_', idColName);
            ret += tab + tab + ' '.repeat(node.maxChildNameLen()) + 'constraint ' + concatNames(obj_col, this._naming.pk) + ' primary key,\n';
        } else {
            const pkName = node.getExplicitPkName();
            if (pkName !== null && pkName.indexOf(',') < 0) {
                const pkPad = tab + ' '.repeat(node.maxChildNameLen() - pkName.length);
                let type = 'integer';
                const child = node.findChild(pkName);
                if (child !== null) type = this.parseType(child);
                ret += tab + pkName + pkPad + type + ',\n';
            }
        }
        return ret;
    }

    // ── FK columns ────────────────────────────────────────────────────────────

    protected override _fkColType(refNode: IDdlNode): string | null {
        const pkName = refNode.getExplicitPkName();
        if (pkName === null || pkName.includes(',')) return null;
        const pkChild = refNode.findChild(pkName);
        return pkChild !== null ? toDb2Type(pkChild._inferTypeFull()) : refNode.getPkType();
    }

    private _genFkColumns(node: IDdlNode, objName: string): string {
        let ret = '';
        for (let fk in node.fks) {
            let parent = node.fks![fk];
            if (0 < fk.indexOf(',')) {
                const refNode = this._ddl.find(parent);
                const chunks  = split_str(fk, ', ');
                for (let i = 0; i < chunks.length; i++) {
                    const col = chunks[i];
                    if (col === ',') continue;
                    const pChild  = refNode?.findChild(col);
                    const colPad  = tab + ' '.repeat(node.maxChildNameLen() - col.length);
                    ret += tab + col + colPad + (pChild ? toDb2Type(pChild._inferTypeFull()) : 'integer') + ',\n';
                }
                continue;
            }
            let type = 'integer';
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
            const fkPad  = tab + ' '.repeat(node.maxChildNameLen() - fk.length);
            const fkColName = fk + _id;
            ret += tab + fkColName + fkPad + type;
            const refPrefix = this._ddl.find(parent) !== null ? this._ddl.objPrefix() : '';
            if (refNode !== null && (refNode.line < node.line || refNode.isMany2One())) {
                ret += tab + tab + ' '.repeat(node.maxChildNameLen()) + 'constraint ' + objName + '_' + fkColName + this._naming.fk + '\n';
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
                const alter = `alter table ${objName} add constraint ${objName}_${fkColName}${this._naming.fk} foreign key (${fkColName}) references ${refPrefix}${parent}${onDelete};\n`;
                if (!this._ddl.postponedAltersSet.has(alter)) {
                    this._ddl.postponedAlters.push(alter);
                    this._ddl.postponedAltersSet.add(alter);
                }
            }
        }
        return ret;
    }

    // ── Regular / extra columns ───────────────────────────────────────────────

    private _genRegularColumns(node: IDdlNode, idColName: string | null): string {
        let ret = '';
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (idColName !== null && child.parseName() === 'id') continue;
            if (0 < child.children.length) continue;
            if (child.refId() === null) {
                if (child.parseName() === node.getExplicitPkName()) continue;
                ret += tab + this.generateTable(child) + ',\n';
                // file-type expansion: _filename / _mimetype / _charset / _lastupd
                if (0 < child.indexOf('file')) {
                    const col = child.parseName();
                    for (const ext of [
                        { suffix: '_filename', type: 'varchar(255)' },
                        { suffix: '_mimetype', type: 'varchar(255)' },
                        { suffix: '_charset',  type: 'varchar(255)' },
                        { suffix: '_lastupd',  type: 'timestamp' },
                    ]) {
                        const extraCol = col + ext.suffix;
                        const extPad   = tab + ' '.repeat(node.maxChildNameLen() - extraCol.length);
                        ret += tab + extraCol + extPad + ext.type + ',\n';
                    }
                }
            }
        }
        return ret;
    }

    private _genRowVersionColumn(node: IDdlNode): string {
        if (!node.hasRowVersion()) return '';
        const pad = tab + ' '.repeat(node.maxChildNameLen() - 'row_version'.length);
        return tab + 'row_version' + pad + 'integer not null,\n';
    }

    private _genAuditColumns(node: IDdlNode): string {
        if (!node.hasAuditCols()) return '';
        // Db2: use timestamp (CURRENT TIMESTAMP) instead of Oracle's date (SYSDATE)
        const auditDateType = 'timestamp';
        let ret = '';
        const created   = String(this._ddl.getOptionValue('createdcol')   ?? 'created');
        const createdby = String(this._ddl.getOptionValue('createdbycol') ?? 'created_by');
        const updated   = String(this._ddl.getOptionValue('updatedcol')   ?? 'updated');
        const updatedby = String(this._ddl.getOptionValue('updatedbycol') ?? 'updated_by');
        ret += tab + created   + tab + ' '.repeat(node.maxChildNameLen() - created.length)   + auditDateType + ' not null,\n';
        ret += tab + createdby + tab + ' '.repeat(node.maxChildNameLen() - createdby.length) + 'varchar(255) not null,\n';
        ret += tab + updated   + tab + ' '.repeat(node.maxChildNameLen() - updated.length)   + auditDateType + ' not null,\n';
        ret += tab + updatedby + tab + ' '.repeat(node.maxChildNameLen() - updatedby.length) + 'varchar(255) not null,\n';
        return ret;
    }

    private _genAdditionalColumns(node: IDdlNode): string {
        let ret = '';
        const cols = this._ddl.additionalColumns();
        for (const col in cols) {
            const type = cols[col];
            const pad  = tab + ' '.repeat(node.maxChildNameLen() - col.length);
            ret += tab + col.toUpperCase() + pad + type + ' not null,\n';
        }
        return ret;
    }

    // ── Table footer, indexes, comments ──────────────────────────────────────

    private _genTableFooter(node: IDdlNode, objName: string): string {
        let ret = ');\n\n';
        if (node.isOption('audit') && !node.isOption('auditcols')) {
            // Db2: AUDIT equivalent is DB2 AUDIT policy, not a DDL statement. Emit comment.
            ret += `-- note: configure IBM Db2 Audit Policy for ${objName}\n\n`;
        }
        return ret;
    }

    private _genMultiColFkAlters(node: IDdlNode, objName: string): string {
        let ret = '';
        for (const fk in node.fks) {
            if (0 < fk.indexOf(',')) {
                const parent = node.fks![fk];
                ret += `alter table ${objName} add constraint ${parent}_${objName}${this._naming.fk} foreign key (${fk}) references ${parent};\n\n`;
            }
        }
        return ret;
    }

    private _genIndexes(node: IDdlNode, objName: string): string {
        let ret = '';
        let num = 1;

        for (const fk in node.fks) {
            if (!node.isMany2One()) {
                const col = fk ?? (singular(node.fks![fk]) + '_id');
                if (num === 1) ret += '-- table index\n';
                ret += `create index ${objName}${this._naming.idx}${num++} on ${objName} (${col});\n\n`;
            }
        }

        const cutPk = node.getOptionValue('pk');
        if (cutPk) ret += `alter table ${objName} add constraint ${objName}${this._naming.pk} primary key (${cutPk});\n\n`;

        const cutUnq = node.getOptionValue('unique') ?? node.getOptionValue('uk');
        if (cutUnq !== null)
            ret += `alter table ${objName} add constraint ${objName}${this._naming.uk} unique (${cutUnq});\n\n`;

        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child.isOption('idx') || child.isOption('index')) {
                if (num === 1) ret += '-- table index\n';
                ret += `create index ${objName}${this._naming.idx}${num++} on ${objName} (${child.parseName()});\n`;
            }
        }

        return ret;
    }

    private _genComments(node: IDdlNode, objName: string): string {
        let ret = '';
        const tableComment = node.getAnnotationValue('DESCRIPTION') || node.comment;
        if (tableComment !== null) ret += `comment on table ${objName} is '${tableComment}';\n`;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const colComment = child.getAnnotationValue('DESCRIPTION') || child.comment;
            if (colComment !== null && child.children.length === 0)
                ret += `comment on column ${objName}.${child.parseName()} is '${colComment}';\n`;
        }
        return ret;
    }

    // ── generateTable ─────────────────────────────────────────────────────────

    generateTable(node: IDdlNode): string {
        // Column node — return inline definition string
        if (node.children.length === 0 && 0 < node.apparentDepth()) {
            let pad = tab;
            if (node.parent !== undefined && node.parent !== null)
                pad += ' '.repeat(node.parent.maxChildNameLen() - node.parseName().length);
            return node.parseName() + pad + this.parseType(node);
        }

        node.lateInitFks();
        const objName   = this._ddl.objPrefix() + node.parseName();
        const idColName = node.getGenIdColName();

        let ret = this._genSequence(objName);
        ret += this._genTableHeader(node, objName, idColName);
        ret += this._genFkColumns(node, objName);
        ret += this._genRegularColumns(node, idColName);
        ret += this._genRowVersionColumn(node);
        ret += this._genAuditColumns(node);
        ret += this._genAdditionalColumns(node);
        ret += node.genConstraint();
        ret  = trimTrailingComma(ret);
        ret += this._genTableFooter(node, objName);
        ret += this._genMultiColFkAlters(node, objName);
        ret += this._genIndexes(node, objName);
        ret += this._genComments(node, objName);
        ret += '\n';
        return ret;
    }

    // ── Contract implementation ───────────────────────────────────────────────

    generateDDL(node: IDdlNode): string {
        if (node.inferType() === 'view') return '';
        const tables = this._orderedTableNodes(node as DdlNode);
        let ret = '';
        for (let i = 0; i < tables.length; i++) ret += this.generateTable(tables[i]);
        return ret;
    }

    generateDrop(node: IDdlNode): string {
        const objName = this._ddl.objPrefix() + node.parseName();
        let ret = '';
        if (node.inferType() === 'view')  ret = `drop view if exists ${objName};\n`;
        if (node.inferType() === 'table') {
            ret = `drop table if exists ${objName};\n`;
            if (this._ddl.optionEQvalue('pk', 'seq'))
                ret += `drop sequence if exists ${objName}${this._naming.seq};\n`;
            // Drop TAPI schemas if layered API was generated
            const hasApiDir  = node.trimmedContent().toLowerCase().includes('/api');
            const apiVal     = (node.getOptionValue('api') ?? '').trim().toLowerCase();
            const tierNames  = ['full+hks', 'full', 'service+hks', 'service', 'lookup+hks', 'lookup'];
            const isLayered  = hasApiDir && (tierNames.includes(apiVal) || apiVal === '' || apiVal === 'layered');
            if (isLayered) {
                const raw    = !apiVal || apiVal === 'layered' ? 'full+hks' : apiVal;
                const tier   = raw === '3h' ? 'full+hks' : raw === '3'  ? 'full'
                             : raw === '2h' ? 'service+hks' : raw === '2'  ? 'service'
                             : raw === '1h' ? 'lookup+hks'  : raw === '1'  ? 'lookup' : raw;
                const hasDal = ['full', 'full+hks'].includes(tier);
                const hasHks = tier.endsWith('+hks');
                const hasSvc = ['service', 'service+hks', 'full', 'full+hks'].includes(tier);
                const ifc    = String(this._ddl.getOptionValue('ifc') ?? 'app').toLowerCase();
                const genApp = ifc === 'app' || ifc === 'apex' || ifc === 'both' || ifc === '';
                const genRst = ifc === 'rest' || ifc === 'both';
                if (hasDal) ret += `drop schema ${objName}_dal restrict;\n`;
                if (hasHks) ret += `drop schema ${objName}_hks restrict;\n`;
                if (hasSvc) ret += `drop schema ${objName}_svc restrict;\n`;
                if (genApp) ret += `drop schema ${objName}_app restrict;\n`;
                if (genRst) ret += `drop schema ${objName}_rst restrict;\n`;
            }
        }
        return ret.toLowerCase();
    }

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

        // Tables
        output += '-- create tables\n\n';
        for (const root of forest)
            output += this.generateDDL(root) + '\n';
        for (const alter of this._ddl.postponedAlters)
            output += alter + '\n';

        // Triggers
        let j = 0;
        for (const node of descendants) {
            const trig = this._plsql.generateTrigger(node);
            if (trig) { if (j++ === 0) output += '-- triggers\n'; output += trig + '\n'; }
        }

        // TAPI (layered only — Db2 has no legacy TAPI package)
        j = 0;
        const layeredTiers = ['full+hks', 'full', 'service+hks', 'service', 'lookup+hks', 'lookup',
                              'layered', '3h', '3', '2h', '2', '1h', '1'];
        for (const node of descendants) {
            const hasApiDir  = node.trimmedContent().toLowerCase().includes('/api');
            const nodeApiVal = (node.getOptionValue('api') ?? '').trim().toLowerCase();
            const isLayered  = hasApiDir && (layeredTiers.includes(nodeApiVal) || nodeApiVal === '');
            if (!isLayered) continue;
            const tapi = this._plsql.generateLayeredTAPI(node);
            if (tapi) { if (j++ === 0) output += '-- APIs\n'; output += tapi + '\n'; }
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
