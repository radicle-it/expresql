import { singular } from '../utils/naming.js';
import amend_reserved_word from './reserved_words.js';
import { DdlNode, tab } from '../compiler/node.js';
import type { Naming } from '../compiler/node.js';
import { LexerToken } from '../compiler/lexer.js';
import type { DdlContext } from '../compiler/types.js';
import { toOracleType, oraclePkTypeModifier, isDb23 } from './types.js';

function trimTrailingComma(s: string): string {
    if (s.lastIndexOf(',\n') === s.length - 2)
        s = s.substring(0, s.length - 2) + '\n';
    return s;
}

/**
 * Handles all Oracle view/duality-view/resolved-view/translation-table
 * generation for OracleDDLGenerator.
 */
export class OracleViewBuilder {
    constructor(
        private ctx:    DdlContext,
        private naming: Naming,
    ) {}

    generateView(node: DdlNode): string {
        if (node.inferType() !== 'view' && node.inferType() !== 'dv') return '';
        if (this.ctx.optionEQvalue('Duality View', 'yes') || node.inferType() === 'dv') {
            try {
                return this.generateDualityView(node);
            } catch (e) {
                if ((e as Error).message === node.one2many2oneUnsupoorted) return '';
                throw e;
            }
        }
        const objName = this.ctx.objPrefix() + node.parseName();
        const chunks  = node.src;
        const setup   = this._buildViewSetup(node, chunks);
        if (setup === null) return '';
        let ret = 'create or replace view ' + objName;
        if (node.annotations !== null) ret += '\nannotations (' + node.annotations + ')';
        ret += ' as\n';
        ret += 'select\n';
        ret += this._buildViewColList(node, chunks, setup.aliasMap, setup.tblCache, setup.colCnts, setup.tblTransCols, setup.maxLen);
        ret = trimTrailingComma(ret);
        const { sortedTables, joinConditions } = this._sortViewTables(node, chunks, setup.tblCache);
        ret += 'from\n';
        ret += this._buildViewFromClause(node, sortedTables, setup.aliasMap, joinConditions, setup.tblTransCols, setup.tblCache);
        // Add tenant filter when tenantid is active and the primary driving table carries a synthetic tenant_id.
        // Replace the sys_context expression with the actual tenant context mechanism for your environment.
        if (this.ctx.optionEQvalue('tenantid', true) && sortedTables.length > 0) {
            const primaryTbl = setup.tblCache[sortedTables[0]];
            const hasSynTenant = primaryTbl !== null &&
                !primaryTbl.children.some(c => c.parseName().toLowerCase() === 'tenant_id');
            if (hasSynTenant) {
                const primaryAlias = setup.aliasMap[sortedTables[0]];
                const tenantCtxPkg = (this.ctx.objPrefix() + 'tenant_ctx').toLowerCase();
                ret += 'where ' + primaryAlias + '.tenant_id = ' + tenantCtxPkg + '.get_id\n';
            }
        }
        ret = ret.toLowerCase();
        if (ret.endsWith('\n')) ret = ret.trimEnd();
        if (!ret.endsWith('\n')) ret += '\n';
        if (this.ctx.optionEQvalue('readonlyviews', true)) ret += '\nwith read only';
        ret += '\n/\n';
        return ret.toLowerCase();
    }

    private _buildViewSetup(_node: DdlNode, chunks: LexerToken[]): {
        aliasMap: Record<string, string>;
        tblCache: Record<string, DdlNode | null>;
        maxLen: number;
        colCnts: Record<string, number>;
        tblTransCols: Record<string, Record<string, boolean>>;
    } | null {
        const aliasMap: Record<string, string> = {};
        const tblCache: Record<string, DdlNode | null> = {};
        for (let i = 2; i < chunks.length; i++) {
            aliasMap[chunks[i].value] = amend_reserved_word(chunks[i].value);
            tblCache[chunks[i].value] = this.ctx.find(chunks[i].value) as DdlNode | null;
        }
        let maxLen = 0;
        for (let i = 2; i < chunks.length; i++) {
            const tbl = tblCache[chunks[i].value];
            if (tbl === null) return null;
            const alias = aliasMap[chunks[i].value];
            let len = (alias + '.id').length;
            if (maxLen < len) maxLen = len;
            for (const child of tbl.children) {
                len = (alias + '.' + child.parseName()).length;
                if (maxLen < len) maxLen = len;
            }
        }
        const colCnts: Record<string, number> = {};
        for (let i = 2; i < chunks.length; i++) {
            const tbl = tblCache[chunks[i].value];
            if (tbl === null) continue;
            for (const child of tbl.children)
                colCnts[child.parseName()] = (colCnts[child.parseName()] ?? 0) + 1;
        }
        for (let i = 2; i < chunks.length; i++) {
            const idAlias = (singular(chunks[i].value) ?? chunks[i].value) + '_id';
            colCnts[idAlias] = (colCnts[idAlias] ?? 0) + 1;
        }
        const tblTransCols: Record<string, Record<string, boolean>> = {};
        for (let i = 2; i < chunks.length; i++) {
            const tbl = tblCache[chunks[i].value];
            if (tbl !== null) {
                const tc = tbl.getTransColumns();
                if (tc.length > 0) {
                    const transNames: Record<string, boolean> = {};
                    for (const t of tc) transNames[t.parseName()] = true;
                    tblTransCols[chunks[i].value] = transNames;
                }
            }
        }
        return { aliasMap, tblCache, maxLen, colCnts, tblTransCols };
    }

    private _buildViewColList(
        _node: DdlNode, chunks: LexerToken[],
        aliasMap: Record<string, string>,
        tblCache: Record<string, DdlNode | null>,
        colCnts: Record<string, number>,
        tblTransCols: Record<string, Record<string, boolean>>,
        maxLen: number,
    ): string {
        let ret = '';
        for (let i = 2; i < chunks.length; i++) {
            const tbl = tblCache[chunks[i].value];
            if (tbl === null) continue;
            const tblName    = chunks[i].value;
            const alias      = aliasMap[tblName];
            const transNames = tblTransCols[tblName] ?? {};
            const pad = ' '.repeat(maxLen - (alias.length + 1 + 2));
            ret += tab + alias + '.id' + tab + pad + (singular(tblName) ?? tblName) + '_id,\n';
            for (const child of tbl.children) {
                if (child.children.length === 0) {
                    const cname        = child.parseName();
                    let disambiguator  = '';
                    if (1 < (colCnts[cname] ?? 0)) disambiguator = (singular(tblName) ?? tblName) + '_';
                    if (transNames[cname]) {
                        const tAlias = 't_' + tblName;
                        const expr   = `coalesce(${tAlias}.trans_${cname}, ${alias}.${cname})`;
                        ret += tab + expr + tab + disambiguator + cname + ',\n';
                    } else {
                        const colPad = ' '.repeat(maxLen - (alias.length + 1 + cname.length));
                        ret += tab + alias + '.' + cname + tab + colPad + disambiguator + cname + ',\n';
                    }
                }
            }
            if (tbl.hasRowVersion()) {
                const rvPad = tab + ' '.repeat(tbl.maxChildNameLen() - 'row_version'.length);
                ret += tab + alias + '.row_version' + rvPad + (singular(tblName) ?? tblName) + '_row_version,\n';
            }
            if (tbl.hasRowKey()) {
                const rkPad = tab + ' '.repeat(tbl.maxChildNameLen() - 'ROW_KEY'.length);
                ret += tab + alias + '.ROW_KEY' + rkPad + (singular(tblName) ?? tblName) + '_ROW_KEY,\n';
            }
            if (tbl.hasAuditCols()) {
                for (const colKey of ['createdcol', 'createdbycol', 'updatedcol', 'updatedbycol']) {
                    const colName = String(this.ctx.getOptionValue(colKey) ?? '');
                    const acPad   = tab + ' '.repeat(tbl.maxChildNameLen() - colName.length);
                    ret += tab + alias + '.' + colName + acPad + (singular(tblName) ?? tblName) + '_' + colName + ',\n';
                }
            }
        }
        return ret;
    }

    private _sortViewTables(_node: DdlNode, chunks: LexerToken[], tblCache: Record<string, DdlNode | null>): {
        sortedTables: string[];
        joinConditions: Record<string, Array<{ fkCol: string; parentTable: string }>>;
    } {
        const viewTableNames: Record<string, boolean> = {};
        for (let i = 2; i < chunks.length; i++) viewTableNames[chunks[i].value] = true;

        const joinConditions: Record<string, Array<{ fkCol: string; parentTable: string }>> = {};
        for (let i = 2; i < chunks.length; i++) {
            const nameA = chunks[i].value;
            const nodeA = tblCache[nameA];
            if (nodeA === null) continue;
            for (const k in nodeA.fks) {
                const parent = nodeA.fks![k];
                if (viewTableNames[parent] && parent !== nameA) {
                    if (!joinConditions[nameA]) joinConditions[nameA] = [];
                    joinConditions[nameA].push({ fkCol: k, parentTable: parent });
                }
            }
        }

        const emitted: Record<string, boolean> = {};
        const sortedTables: string[] = [];
        for (let i = 2; i < chunks.length; i++) {
            const name = chunks[i].value;
            if (!joinConditions[name]) { sortedTables.push(name); emitted[name] = true; }
        }
        let remaining: string[] = [];
        for (let i = 2; i < chunks.length; i++)
            if (joinConditions[chunks[i].value]) remaining.push(chunks[i].value);

        while (remaining.length > 0) {
            let progress = false;
            const next: string[] = [];
            for (const name of remaining) {
                const allParentsEmitted = joinConditions[name].every(c => emitted[c.parentTable]);
                if (allParentsEmitted) {
                    sortedTables.push(name); emitted[name] = true; progress = true;
                } else {
                    next.push(name);
                }
            }
            remaining = next;
            if (!progress) {
                for (const name of remaining) { sortedTables.push(name); emitted[name] = true; }
                break;
            }
        }
        return { sortedTables, joinConditions };
    }

    private _buildViewFromClause(
        _node: DdlNode,
        sortedTables: string[],
        aliasMap: Record<string, string>,
        joinConditions: Record<string, Array<{ fkCol: string; parentTable: string }>>,
        tblTransCols: Record<string, Record<string, boolean>>,
        tblCache: Record<string, DdlNode | null>,
    ): string {
        let ret = '';
        const transContext = this.ctx.getOptionValue('transcontext');
        for (let si = 0; si < sortedTables.length; si++) {
            const tblName = sortedTables[si];
            const alias   = aliasMap[tblName];
            let tblExpr   = alias;
            if (this.ctx.objPrefix()) tblExpr = this.ctx.objPrefix() + tblName + ' ' + alias;
            if (si === 0) {
                ret += tab + tblExpr + '\n';
            } else if (joinConditions[tblName]) {
                const conds = joinConditions[tblName];
                ret += tab + 'left join ' + tblExpr + '\n';
                for (let c = 0; c < conds.length; c++) {
                    const aliasB = aliasMap[conds[c].parentTable];
                    const prefix = (c === 0) ? 'on ' : 'and ';
                    ret += tab + tab + prefix + alias + '.' + conds[c].fkCol + ' = ' + aliasB + '.id\n';
                }
            } else {
                ret += tab + 'cross join ' + tblExpr + '\n';
            }
            if (tblTransCols[tblName]) {
                const tblNode   = tblCache[tblName]!;
                const transName = this.ctx.objPrefix() + tblName + '_trans';
                const tAlias    = 't_' + tblName;
                const fkCol     = (singular(tblName) ?? tblName) + '_id';
                const pkCol     = tblNode.getGenIdColName() ?? tblNode.getExplicitPkName() ?? 'id';
                ret += tab + 'left join ' + transName + ' ' + tAlias + '\n';
                ret += tab + tab + 'on ' + tAlias + '.' + fkCol + ' = ' + alias + '.' + pkCol + '\n';
                ret += tab + tab + 'and ' + tAlias + '.language_code = ' + transContext + '\n';
            }
        }
        return ret;
    }

    generateDualityView(node: DdlNode): string {
        const chunks = node.src;
        if (chunks.length < 3)
            return '/* duality view requires at least a view name and one table */\n';

        const viewName      = this.ctx.objPrefix() + chunks[0].value;
        const rootTableName = chunks[2].value;
        const rootNode      = this.ctx.find(rootTableName);
        if (rootNode === null)
            return '/* duality view: table ' + rootTableName + ' not found */\n';

        rootNode.lateInitFks();
        const annotations = '@insert @update @delete';
        let ret = 'create or replace json relational duality view ' + viewName + ' as\n';
        ret += this.ctx.objPrefix() + rootNode.parseName() + ' ' + annotations + '\n';
        ret += '{\n';

        const rootPkCol = rootNode.getGenIdColName() ?? rootNode.getExplicitPkName() ?? 'id';
        let rootMaxLen  = '_id'.length;
        for (const child of rootNode.children) {
            if (child.children.length > 0 || child.refId() !== null) continue;
            const len = child.parseName().length;
            if (len > rootMaxLen) rootMaxLen = len;
        }
        for (let t = 3; t < chunks.length; t++) {
            const len = chunks[t].value.length;
            if (len > rootMaxLen) rootMaxLen = len;
        }

        ret += tab + '_id' + ' '.repeat(rootMaxLen - '_id'.length) + ' : ' + rootPkCol + ',\n';

        const fkCols: Record<string, boolean> = {};
        if (rootNode.fks !== null) for (const fk in rootNode.fks) fkCols[fk] = true;
        for (const child of rootNode.regularColumns()) {
            const cname = child.parseName();
            if (cname === rootPkCol || fkCols[cname]) continue;
            ret += tab + cname + ' '.repeat(rootMaxLen - cname.length) + ' : ' + cname + ',\n';
        }

        for (let t = 3; t < chunks.length; t++) {
            const nestedName = chunks[t].value;
            const nestedNode = this.ctx.find(nestedName);
            if (nestedNode === null) continue;
            nestedNode.lateInitFks();

            let isChild = false;
            if (nestedNode.fks !== null) {
                for (const fk in nestedNode.fks) {
                    if (nestedNode.fks[fk] === rootNode.parseName()) { isChild = true; break; }
                }
            }

            const nestedPkCol = nestedNode.getGenIdColName() ?? nestedNode.getExplicitPkName() ?? 'id';
            let nestedMaxLen  = '_id'.length;
            for (const child of nestedNode.children) {
                if (child.children.length > 0 || child.refId() !== null) continue;
                const len = child.parseName().length;
                if (len > nestedMaxLen) nestedMaxLen = len;
            }
            const nestedFkCols: Record<string, boolean> = {};
            if (nestedNode.fks !== null) for (const fk in nestedNode.fks) nestedFkCols[fk] = true;

            const open  = isChild ? '[{\n' : '{\n';
            const close = isChild ? '}]'   : '}';

            ret += tab + nestedName + ' '.repeat(rootMaxLen - nestedName.length) + ' : ' + this.ctx.objPrefix() + nestedNode.parseName() + ' ' + annotations + '\n';
            ret += tab + open;
            ret += tab + tab + '_id' + ' '.repeat(nestedMaxLen - '_id'.length) + ' : ' + nestedPkCol + ',\n';
            for (const child of nestedNode.regularColumns()) {
                const cname = child.parseName();
                if (cname === nestedPkCol || nestedFkCols[cname]) continue;
                ret += tab + tab + cname + ' '.repeat(nestedMaxLen - cname.length) + ' : ' + cname + ',\n';
            }
            ret = ret.replace(/,\n$/, '\n');
            ret += tab + close + ',\n';
        }

        ret = ret.replace(/,\n$/, '\n');
        ret += '};\n\n';
        return ret.toLowerCase();
    }

    generateTransTable(node: DdlNode): string {
        if (node.inferType() !== 'table') return '';
        const transCols = node.getTransColumns();
        if (transCols.length === 0) return '';

        const objName   = this.ctx.objPrefix() + node.parseName();
        const transName = objName + '_trans';
        const char      = this.ctx.semantics();
        const db23      = isDb23(this.ctx);

        let maxLen     = 'language_code'.length;
        const fkColName = (singular(node.parseName()) ?? node.parseName()) + '_id';
        if (fkColName.length > maxLen) maxLen = fkColName.length;
        for (const col of transCols) {
            const colName = 'trans_' + col.parseName();
            if (colName.length > maxLen) maxLen = colName.length;
        }
        if ('id'.length > maxLen) maxLen = 'id'.length;

        let ret = 'create table ' + transName + ' (\n';
        let pad = tab + ' '.repeat(maxLen - 'id'.length);
        ret += tab + 'id' + pad + 'number ' + oraclePkTypeModifier(transName, this.ctx, this.naming) + '\n';
        ret += tab + tab + ' '.repeat(maxLen) + 'constraint ' + transName + '_id' + this.naming.pk + ' primary key,\n';

        pad = tab + ' '.repeat(maxLen - fkColName.length);
        ret += tab + fkColName + pad + 'number not null,\n';

        pad = tab + ' '.repeat(maxLen - 'language_code'.length);
        ret += tab + 'language_code' + pad + `varchar2(5${char}) not null,\n`;

        for (const col of transCols) {
            const colName = 'trans_' + col.parseName();
            pad = tab + ' '.repeat(maxLen - colName.length);
            const baseType = toOracleType(col._inferTypeFull(), char, db23);
            ret += tab + colName + pad + baseType + ',\n';
        }
        ret += tab + 'constraint ' + transName + this.naming.uk + ' unique (' + fkColName + ', language_code)\n';
        ret += ');\n\n';

        let abbrev = node.parseName();
        if (abbrev.length > 2) abbrev = abbrev.substring(0, 2);
        ret += 'alter table ' + transName + ' add constraint ' + transName + '_' + abbrev + '_id' + this.naming.fk + '\n';
        ret += tab + 'foreign key (' + fkColName + ') references ' + objName + ';\n\n';
        ret += 'alter table ' + transName + ' add constraint ' + transName + '_lang' + this.naming.fk + '\n';
        ret += tab + 'foreign key (language_code) references ' + this.ctx.objPrefix() + 'language (code);\n\n';
        ret += 'create index ' + transName + this.naming.idx + '1 on ' + transName + ' (' + fkColName + ');\n';
        ret += 'create index ' + transName + this.naming.idx + '2 on ' + transName + ' (language_code);\n\n';
        return ret;
    }

    generateResolvedView(node: DdlNode): string {
        if (node.inferType() !== 'table') return '';
        const transCols = node.getTransColumns();
        if (transCols.length === 0) return '';

        const objName      = this.ctx.objPrefix() + node.parseName();
        const transName    = objName + '_trans';
        const viewName     = objName + '_resolved';
        const fkColName    = (singular(node.parseName()) ?? node.parseName()) + '_id';
        const transContext = this.ctx.getOptionValue('transcontext');

        let ret = 'create or replace view ' + viewName + ' as\nselect ';
        const selectCols: string[] = [];

        const idColName = node.getPkName();
        if (idColName !== null) selectCols.push('k.' + idColName);

        node.lateInitFks();
        for (const fk in (node.fks ?? {})) {
            if (0 < fk.indexOf(',')) continue;
            const refNode = this.ctx.find(node.fks![fk]);
            let _id = '';
            if (refNode !== null && refNode.isMany2One && refNode.isMany2One() && !fk.endsWith('_id')) _id = '_id';
            selectCols.push('k.' + fk + _id);
        }

        const transColNames: Record<string, boolean> = {};
        for (const col of transCols) transColNames[col.parseName()] = true;

        for (const child of node.regularColumns()) {
            const cname = child.parseName();
            if (idColName !== null && cname === 'id') continue;
            if (cname === node.getExplicitPkName()) continue;
            if (transColNames[cname])
                selectCols.push('coalesce(t.trans_' + cname + ', k.' + cname + ') as ' + cname);
            else
                selectCols.push('k.' + cname);
        }

        ret += selectCols[0] + ',\n';
        for (let i = 1; i < selectCols.length; i++) {
            ret += tab + tab + ' ' + selectCols[i];
            if (i < selectCols.length - 1) ret += ',';
            ret += '\n';
        }
        ret += 'from ' + objName + ' k\n';
        ret += 'left join ' + transName + ' t\n';
        ret += tab + 'on t.' + fkColName + ' = k.' + (idColName ?? node.getExplicitPkName()) + '\n';
        ret += tab + 'and t.language_code = ' + transContext + ';\n\n';
        return ret;
    }
}
