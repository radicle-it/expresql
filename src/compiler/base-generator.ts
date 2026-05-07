import { singular } from '../utils/naming.js';
import translate from '../utils/translate.js';
import { generateSample, resetSeed } from '../utils/sample.js';
import { tab } from './node.js';
import split_str from '../utils/split-str.js';
import type { DdlContext, DDLGenerator, IDdlNode, SemanticType, ErdColumn, ErdItem, ErdLink, ErdOutput } from './types.js';

// ── Shared private utilities ───────────────────────────────────────────────────

function trimTrailingComma(s: string): string {
    if (s.lastIndexOf(',\n') === s.length - 2)
        s = s.substring(0, s.length - 2) + '\n';
    return s;
}

function getValue(obj: unknown, oName: string | null, attr: string, oName2Match: string): unknown[] | null {
    let ret: unknown[] = [];
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return null;
    const tmp = (obj as Record<string, unknown>)[attr];
    if (tmp !== null && tmp !== undefined && oName === oName2Match) ret.push(tmp);
    for (const p in obj as object) {
        const child = (obj as Record<string, unknown>)[p];
        const sub = getValue(child, p, attr, oName2Match);
        if (sub !== null) ret = ret.concat(sub);
    }
    return ret;
}

/**
 * Abstract base for all DDL generators.
 *
 * Subclasses must implement:
 *   - colType(sem)       — render a SemanticType to a dialect column-type string
 *   - generateDDL(node)  — emit DDL for one top-level node
 *   - generateDrop(node) — emit DROP statement(s) for one node
 *   - generateFullDDL()  — orchestrate the full script
 *
 * generateERD() is provided here and is dialect-agnostic; it delegates
 * all type-string decisions to colType().
 */
export abstract class BaseGenerator implements DDLGenerator {
    protected _ddl: DdlContext;

    constructor(ctx: DdlContext) {
        this._ddl = ctx;
    }

    // ── Dialect hooks ─────────────────────────────────────────────────────────

    /** Map a SemanticType to a dialect-specific column type string. */
    abstract colType(sem: SemanticType): string;

    // ── Contract (implemented by dialect subclass) ────────────────────────────

    abstract generateDDL(node: IDdlNode): string;
    abstract generateDrop(node: IDdlNode): string;
    abstract generateFullDDL(): string;

    // ── Shared helpers ────────────────────────────────────────────────────────

    /**
     * Resolve the dialect column type for a FK column by inspecting the
     * referenced table's explicit PK. Returns null for auto-generated PKs
     * so the caller can fall back to the FK column's own convention type.
     */
    protected _fkColType(refNode: IDdlNode): string | null {
        const pkName = refNode.getExplicitPkName();
        if (pkName == null || pkName.includes(',')) return null;
        const pkChild = refNode.findChild(pkName);
        return pkChild != null ? this.colType(pkChild._inferTypeFull()) : refNode.getPkType();
    }

    // ── Shared: ERD generation ────────────────────────────────────────────────

    generateERD(): ErdOutput {
        const descendants = this._ddl.descendants();
        const output: ErdOutput = { items: [], links: [] };

        for (const node of descendants) {
            if (node.inferType() !== 'table') continue;

            const item: ErdItem = {
                name:    this._ddl.objPrefix('no schema') + node.parseName(),
                schema:  (this._ddl.getOptionValue('schema') as string) || null,
                columns: [],
            };
            output.items.push(item);

            // PK column
            const idColName = node.getGenIdColName();
            if (idColName != null && !node.isOption('pk')) {
                item.columns.push({ name: idColName, datatype: 'number' });
            } else {
                const pkName = node.getExplicitPkName();
                if (pkName != null && !pkName.includes(',')) {
                    const child = node.findChild(pkName);
                    item.columns.push({ name: pkName, datatype: child ? this.colType(child._inferTypeFull()) : 'number' });
                }
            }

            // FK columns
            node.lateInitFks();
            for (const fk in (node.fks ?? {})) {
                const parent: string = node.fks![fk];
                if (fk.includes(',')) {
                    const refNode = this._ddl.find(parent);
                    for (const col of split_str(fk, ', ')) {
                        if (col === ',') continue;
                        const pChild = refNode?.findChild(col);
                        item.columns.push({ name: col, datatype: pChild ? this.colType(pChild._inferTypeFull()) : 'number' } as ErdColumn);
                    }
                    continue;
                }
                const attr    = node.findChild(fk);
                let   type    = attr ? attr.inferType() : 'number';
                let   fkName  = fk;
                const refNode = this._ddl.find(parent);
                if (refNode != null) {
                    type = this._fkColType(refNode) ?? type;
                } else {
                    const altRef = this._ddl.find(fk);
                    if (altRef?.isMany2One?.() && !fk.endsWith('_id'))
                        fkName = (singular(fk) ?? fk) + '_id';
                }
                item.columns.push({ name: fkName, datatype: type });
            }

            // Regular columns
            const explicitPk = node.getExplicitPkName();
            for (const child of node.children) {
                if (child.inferType() === 'table') continue;
                if (child.refId()     != null)     continue;
                if (child.parseName() === explicitPk) continue;
                item.columns.push({ name: child.parseName(), datatype: this.colType(child._inferTypeFull()) });
                if (child.indexOf('file') > 0) {
                    const col   = child.parseName();
                    const vc255: SemanticType = { base: 'varchar', varcharLen: 255, colName: col, needsBoolCheck: false, isNativeBoolean: false, parent_child: '' };
                    const dtSem: SemanticType = { base: 'date',    colName: col, needsBoolCheck: false, isNativeBoolean: false, parent_child: '' };
                    item.columns.push({ name: col + '_filename', datatype: this.colType(vc255) });
                    item.columns.push({ name: col + '_mimetype', datatype: this.colType(vc255) });
                    item.columns.push({ name: col + '_charset',  datatype: this.colType(vc255) });
                    item.columns.push({ name: col + '_lastupd',  datatype: this.colType(dtSem) });
                }
            }

            // Row meta-columns
            const nodeContent = node.trimmedContent().toUpperCase();
            if (this._ddl.optionEQvalue('rowkey', true) || nodeContent.includes('/ROWKEY')) {
                const vc30: SemanticType = { base: 'varchar', varcharLen: 30, colName: 'row_key', needsBoolCheck: false, isNativeBoolean: false, parent_child: '' };
                item.columns.push({ name: 'row_key', datatype: this.colType(vc30) });
            }
            if (this._ddl.optionEQvalue('rowVersion', 'yes') || nodeContent.includes('/ROWVERSION'))
                item.columns.push({ name: 'row_version', datatype: 'integer' });
            if (this._ddl.optionEQvalue('Audit Columns', 'yes') || nodeContent.includes('/AUDITCOLS')) {
                let auditBase = (this._ddl.getOptionValue('auditdate') as string | null) || '';
                if (!auditBase) auditBase = this._ddl.getOptionValue('Date Data Type') as string ?? 'date';
                const auditSem: SemanticType = { base: auditBase.toLowerCase(), colName: '', needsBoolCheck: false, isNativeBoolean: false, parent_child: '' };
                const vc255:    SemanticType = { base: 'varchar', varcharLen: 255, colName: '', needsBoolCheck: false, isNativeBoolean: false, parent_child: '' };
                item.columns.push({ name: this._ddl.getOptionValue('createdcol')   as string, datatype: this.colType(auditSem) });
                item.columns.push({ name: this._ddl.getOptionValue('createdbycol') as string, datatype: this.colType(vc255) });
                item.columns.push({ name: this._ddl.getOptionValue('updatedcol')   as string, datatype: this.colType(auditSem) });
                item.columns.push({ name: this._ddl.getOptionValue('updatedbycol') as string, datatype: this.colType(vc255) });
            }
            // Synthetic tenant_id column (when tenantid: yes and not excluded)
            if (this._ddl.optionEQvalue('tenantid', true) && !node.isOption('notenantid') && node.findChild('tenant_id') === null) {
                const numSem: SemanticType = { base: 'number', colName: 'tenant_id', needsBoolCheck: false, isNativeBoolean: false, parent_child: '' };
                item.columns.push({ name: 'tenant_id', datatype: this.colType(numSem) });
            }
        }

        // Links
        for (const node of descendants) {
            if (node.inferType() !== 'table') continue;
            this.generateDDL(node);  // populates node.fks as side-effect
            for (const fk in (node.fks ?? {})) {
                const parent  = node.fks![fk];
                const pkNode  = this._ddl.find(parent);
                if (pkNode == null) continue;
                const pk        = pkNode.getExplicitPkName() ?? 'id';
                const fkAttr    = node.findChild(fk);
                const mandatory = fkAttr == null || fkAttr.isOption('nn') || fkAttr.isOption('notnull');
                const link: ErdLink = {
                    source:    this._ddl.objPrefix('no schema') + parent,
                    source_id: pk,
                    target:    this._ddl.objPrefix('no schema') + node.parseName(),
                    target_id: fk,
                };
                if (mandatory) link.mandatory = mandatory;
                output.links.push(link);
            }
        }

        // Synthetic tenant_id → tenants links (when tenantid: yes)
        if (this._ddl.optionEQvalue('tenantid', true)) {
            const tenantRef  = String(this._ddl.getOptionValue('tenantref') || 'tenants');
            const tenantsNode = this._ddl.find(tenantRef);
            if (tenantsNode != null) {
                const tenantsPk   = tenantsNode.getExplicitPkName() ?? 'id';
                const tenantsName = this._ddl.objPrefix('no schema') + tenantRef;
                for (const node of descendants) {
                    if (node.inferType() !== 'table') continue;
                    if (node.isOption('notenantid')) continue;
                    if (node.findChild('tenant_id') !== null) continue;
                    output.links.push({
                        source:    tenantsName,
                        source_id: tenantsPk,
                        target:    this._ddl.objPrefix('no schema') + node.parseName(),
                        target_id: 'tenant_id',
                        mandatory: true,
                    });
                }
            }
        }

        // Groups
        const groups: Record<string, string[]> = {};
        for (const node of descendants) {
            if (node.inferType() !== 'table') continue;
            const groupName = node.getAnnotationValue('TGROUP');
            if (groupName != null) {
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(this._ddl.objPrefix('no schema') + node.parseName());
            }
        }
        if (Object.keys(groups).length > 0) output.groups = groups;

        return output;
    }

    // ── Shared: INSERT data generation ────────────────────────────────────────

    /**
     * Dialect hook: SQL to reset an IDENTITY/sequence column after bulk inserts.
     * Return empty string if the dialect needs no reset statement.
     */
    protected identityRestartSql(
        _objName: string, _idColName: string, _nextVal: number,
    ): string {
        return '';
    }

    protected _isContainedIn(node: IDdlNode, nodes: IDdlNode[]): boolean {
        for (const n of nodes)
            if (n.parseName() === node.parseName()) return true;
        return false;
    }

    protected _orderedTableNodes(node: IDdlNode): IDdlNode[] {
        const ret: IDdlNode[] = [node];
        for (const desc of node.descendants().slice(1)) {
            if (desc.children.length === 0) continue;
            if (desc.isMany2One()) {
                if (!this._isContainedIn(desc, ret)) ret.unshift(desc);
            } else if (!this._isContainedIn(desc, ret)) {
                ret.push(desc);
            }
        }
        return ret;
    }

    generateData(node: IDdlNode, dataObj: unknown): string {
        resetSeed();
        if (this._ddl.optionEQvalue('inserts', false)) return '';
        const tab2inserts = this.inserts4tbl(node, dataObj);
        const tables      = this._orderedTableNodes(node);
        let ret = '';
        for (const tbl of tables) {
            const objName = this._ddl.objPrefix() + tbl.parseName();
            const inserts = (tab2inserts as Record<string, string>)[objName];
            if (inserts != null) ret += inserts;
        }
        return ret;
    }

    inserts4tbl(node: IDdlNode, dataObj: unknown): Record<string, string> {
        let tab2inserts: Record<string, string> = {};
        if (this._ddl.optionEQvalue('inserts', false)) return {};
        const objName = this._ddl.objPrefix() + node.parseName();
        let insert = '';
        for (let i = 0; i < node.cardinality(); i++) {
            let elem: unknown = null;
            if (dataObj != null) {
                const tbl = (dataObj as Record<string, unknown>)[objName];
                if (tbl != null && Array.isArray(tbl)) elem = tbl[i];
            }
            insert += this._buildInsertStatement(node, i, elem, objName);
        }
        if (insert !== '') insert += '\ncommit;\n\n';
        const idColName = node.getGenIdColName();
        if (idColName != null && 1 < node.cardinality() && !this._ddl.optionEQvalue('pk', 'guid'))
            insert += this.identityRestartSql(objName, idColName, node.cardinality() + 1);
        tab2inserts[objName] = insert;
        for (const child of node.children) {
            if (child.children.length > 0)
                tab2inserts = { ...tab2inserts, ...this.inserts4tbl(child, dataObj) };
        }
        return tab2inserts;
    }

    _buildInsertStatement(node: IDdlNode, i: number, elem: unknown, objName: string): string {
        let insert = 'insert into ' + objName + ' (\n';
        const idColName = node.getGenIdColName();
        let pkName:  string | null = null;
        let pkValue: unknown = null;
        if (idColName != null) {
            pkName = idColName;
            insert += tab + pkName + ',\n';
        } else {
            pkName = node.getExplicitPkName();
            if (pkName != null) insert += tab + pkName + ',\n';
        }
        for (let fk in (node.fks ?? {})) {
            let parent  = node.fks![fk];
            let _id = '';
            let refNode = this._ddl.find(parent);
            if (refNode == null) {
                refNode = this._ddl.find(fk);
                if (refNode?.isMany2One?.() && !fk.endsWith('_id')) {
                    parent = fk; fk = singular(fk) ?? fk; _id = '_id';
                }
            }
            insert += tab + fk + _id + ',\n';
        }
        for (const child of node.regularColumns()) {
            if (idColName != null && child.parseName() === 'id') continue;
            if (child.isOption('pk')) continue;
            insert += tab + child.parseName() + ',\n';
        }
        insert = trimTrailingComma(insert);
        insert += ') values (\n';
        if (idColName != null) {
            pkValue = i + 1;
            insert += tab + pkValue + ',\n';
        } else if (pkName != null) {
            const field = pkName;
            const tmp = getValue(this._ddl.data, null, field, node.parseName());
            let v: unknown = -1;
            if (elem != null) v = (elem as Record<string, unknown>)[field];
            if (tmp != null && (tmp as unknown[])[i] != null)
                v = (tmp as unknown[])[i];
            if (v !== -1 && typeof v === 'string') v = "'" + v + "'";
            pkValue = v !== -1 ? v : i + 1;
            insert += tab + pkValue + ',\n';
        }
        for (const fk in (node.fks ?? {})) {
            const ref = node.fks![fk];
            const { type, values } = this._resolveFkSampleValues(node, fk, ref, elem, pkValue, objName);
            const lang = String(this._ddl.getOptionValue('Data Language') ?? 'EN');
            insert += tab + String(translate(lang, generateSample(objName, (singular(ref) ?? ref) + '_id', type, values))) + ',\n';
        }
        for (const child of node.regularColumns()) {
            if (idColName != null && child.parseName() === 'id') continue;
            if (child.parseName() === node.getExplicitPkName()) continue;
            let values = child.parseValues();
            const cname = child.parseName();
            if (elem != null) {
                const v = (elem as Record<string, unknown>)[cname];
                if (v != null) values = [v as string];
            }
            const lang  = String(this._ddl.getOptionValue('Data Language') ?? 'EN');
            const datum = generateSample(objName, cname, this.colType(child._inferTypeFull()), values);
            insert += tab + String(translate(lang, datum)) + ',\n';
        }
        insert = trimTrailingComma(insert);
        insert += ');\n';
        return insert;
    }

    _resolveFkSampleValues(
        _node: IDdlNode, fk: string, ref: string, elem: unknown,
        pkValue: unknown, objName: string,
    ): { type: string; values: unknown[] } {
        const refNode = this._ddl.find(ref);
        let values: unknown[] = [];
        let type = 'INTEGER';
        for (let k = 1; k <= (refNode?.cardinality() ?? 0); k++) values.push(k);
        if (elem != null) {
            const elemObj  = elem as Record<string, unknown>;
            const refData0 = elemObj[fk];
            if (refData0 != null) {
                if (typeof refData0 === 'string') type = 'STRING';
                values = [refData0];
            } else {
                const m2mTbl  = objName + '_' + ref;
                const m2mData = (this._ddl.data as Record<string, unknown> | null)?.[m2mTbl];
                if (m2mData != null) {
                    for (const idx in m2mData as object) {
                        const row = (m2mData as Record<string, unknown>)[idx] as Record<string, unknown>;
                        if (row[objName + '_id'] === pkValue) {
                            const rd = row[fk];
                            if (rd != null) {
                                if (typeof rd === 'string') type = 'STRING';
                                values = [rd];
                            }
                            break;
                        }
                    }
                } else {
                    const fk1 = refNode?.getPkName() ?? null;
                    const rd  = fk1 != null ? elemObj[fk1] : undefined;
                    if (rd != null) {
                        if (typeof rd === 'string') type = 'STRING';
                        values = [rd];
                    }
                }
            }
        }
        return { type, values };
    }
}
