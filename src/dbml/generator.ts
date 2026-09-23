/**
 * DBMLGenerator — ExpreSQL → DBML (dbmlv2) exporter.
 *
 * Not a DDL generator (does not extend BaseGenerator): DBML is a documentation
 * and visualization format, not a DDL target. Operates in two passes:
 *
 *   1. buildModel()  → DbmlModel (semantic mapping, independently testable)
 *   2. emitDBML()    → string (text formatting, no semantic logic)
 *
 * Usage:
 *   const dbml = new DBMLGenerator(ctx).generate();
 */

import type { DdlContext, IDdlNode } from '../compiler/types.js';
import { toDbmlType }                from './type-map.js';
import {
    expandAuditCols,
    expandRowVersion,
    expandRowKey,
    expandVersionedCols,
    expandTenantId,
    type ExpandedColumn,
} from './column-expander.js';

// ── Intermediate model ────────────────────────────────────────────────────────

interface DbmlEnum {
    name:   string;
    schema: string | null;
    values: string[];
}

interface DbmlColumnDef {
    name:       string;
    type:       string;
    pk?:        boolean | undefined;
    unique?:    boolean | undefined;
    notNull?:   boolean | undefined;
    increment?: boolean | undefined;
    default?:   string  | undefined;
    checkExpr?: string  | undefined;
    note?:      string  | undefined;
    meta?:      Record<string, string> | undefined;
}

interface DbmlIndex {
    cols:    string[];
    pk?:     boolean | undefined;
    unique?: boolean | undefined;
    name?:   string  | undefined;
}

interface DbmlTable {
    name:    string;
    schema:  string | null;
    note?:   string | undefined;
    columns: DbmlColumnDef[];
    indexes: DbmlIndex[];
    meta?:   Record<string, string> | undefined;
}

interface DbmlRef {
    name?:     string | undefined;
    fromTable: string;
    fromCols:  string[];
    toTable:   string;
    toCols:    string[];
    operator:  '<' | '>' | '-' | '<>';
    delete?:   'cascade' | 'set null' | 'restrict' | 'no action' | undefined;
    mandatory: boolean;
}

interface DbmlModel {
    project?:    { name: string; databaseType: string; meta: Record<string, string> } | undefined;
    enums:       DbmlEnum[];
    tables:      DbmlTable[];
    refs:        DbmlRef[];
    tableGroups: { name: string; tables: string[] }[];
}

// ── DBMLGenerator ─────────────────────────────────────────────────────────────

export class DBMLGenerator {

    private readonly schema:       string;
    private readonly prefix:       string;
    private readonly pkMode:       string;
    private readonly globalTenant: boolean;
    private readonly tenantRef:    string;
    private readonly globalAudit:  boolean;
    private readonly globalRowVer: boolean;
    private readonly globalRowKey: boolean;
    private readonly auditDateType: string;
    private readonly createdcol:   string;
    private readonly createdbycol: string;
    private readonly updatedcol:   string;
    private readonly updatedbycol: string;

    // Enum deduplication: sorted-value-signature → registered enum name
    private readonly enumBySig = new Map<string, string>();

    constructor(private readonly ctx: DdlContext) {
        const opt = (k: string, fallback = '') =>
            String(ctx.getOptionValue(k) ?? fallback);

        this.schema        = opt('schema');
        this.prefix        = opt('prefix');
        this.pkMode        = opt('pk', 'guid');
        this.globalTenant  = ctx.optionEQvalue('tenantid', true);
        this.tenantRef     = opt('tenantref');
        this.globalAudit   = ctx.optionEQvalue('auditcols', true);
        this.globalRowVer  = ctx.optionEQvalue('rowversion', true);
        this.globalRowKey  = ctx.optionEQvalue('rowkey', true);
        this.auditDateType = opt('auditdate');
        this.createdcol    = opt('createdcol',   'created');
        this.createdbycol  = opt('createdbycol', 'created_by');
        this.updatedcol    = opt('updatedcol',   'updated');
        this.updatedbycol  = opt('updatedbycol', 'updated_by');
    }

    // ── Public API ────────────────────────────────────────────────────────────

    generate(): string {
        return this.emitDBML(this.buildModel());
    }

    // ── Pass 1: model construction ────────────────────────────────────────────

    private buildModel(): DbmlModel {
        const enums:       DbmlEnum[]                    = [];
        const tables:      DbmlTable[]                   = [];
        const refs:        DbmlRef[]                     = [];
        const groupMap:    Map<string, string[]>         = new Map();

        for (const root of this.ctx.forest) {
            this.processTable(root, enums, tables, refs, groupMap);
        }

        const tableGroups = [...groupMap.entries()].map(([name, tbls]) => ({ name, tables: tbls }));

        // Project block
        const rawDb = String(this.ctx.getOptionValue('db') ?? '');
        const dbType = /23/i.test(rawDb) ? 'Oracle 23ai' : 'Oracle';
        const project = {
            name:         this.schema || 'schema',
            databaseType: dbType,
            meta:         this.buildProjectMeta(),
        };

        return { project, enums, tables, refs, tableGroups };
    }

    private tableName(rawName: string): string {
        const p = this.prefix;
        const sep = p && !p.endsWith('_') ? '_' : '';
        return p ? p + sep + rawName : rawName;
    }

    private qualifiedName(raw: string): string {
        const tbl = this.tableName(raw);
        return this.schema ? `${this.schema}.${tbl}` : tbl;
    }

    private processTable(
        node:     IDdlNode,
        enums:    DbmlEnum[],
        tables:   DbmlTable[],
        refs:     DbmlRef[],
        groupMap: Map<string, string[]>,
    ): void {
        const rawName  = node.parseName();
        const tblName  = this.tableName(rawName);
        const qualName = this.schema ? `${this.schema}.${tblName}` : tblName;

        const columns: DbmlColumnDef[] = [];
        const indexes:  DbmlIndex[]    = [];

        // ── Injected PK column ────────────────────────────────────────────────
        const pkColName = node.getPkName() ?? `${tblName}_id`;
        columns.push(this.makePkColumn(pkColName));

        // ── Injected tenant_id ────────────────────────────────────────────────
        if (this.globalTenant && !node.isOption('notenantid')) {
            columns.push(this.expandedToCol(expandTenantId()));
            const tenantTable = this.tenantRef
                ? this.qualifiedName(this.tenantRef)
                : (this.schema ? `${this.schema}.tenants` : 'tenants');
            refs.push({
                name:      `${tblName}_tenant_id_fk`,
                fromTable: qualName,
                fromCols:  ['tenant_id'],
                toTable:   tenantTable,
                toCols:    ['tenants_id'],
                operator:  '>',
                mandatory: true,
            });
        }

        // ── Child columns and sub-tables ──────────────────────────────────────
        for (const child of node.children) {
            if (child.children.length > 0) {
                // Sub-table → recurse, then add parent→child FK
                this.processTable(child, enums, tables, refs, groupMap);

                const childRaw  = child.parseName();
                const childName = this.tableName(childRaw);
                const childQual = this.schema ? `${this.schema}.${childName}` : childName;
                const fkCol     = `${tblName}_id`;
                const mandatory = !child.isOption('optional');

                refs.push({
                    name:      `${childName}_${fkCol}_fk`,
                    fromTable: childQual,
                    fromCols:  [fkCol],
                    toTable:   qualName,
                    toCols:    [pkColName],
                    operator:  '>',
                    mandatory,
                    delete:    child.isOption('cascade')  ? 'cascade'
                             : child.isOption('setnull') ? 'set null'
                             : undefined,
                });
            } else {
                // Column node
                const colDef = this.buildColumn(child, tblName, enums);
                if (colDef) {
                    columns.push(colDef);

                    // /unique → named index (column already carries unique flag too)
                    if (child.isOption('unique')) {
                        indexes.push({ cols: [child.parseName()], unique: true });
                    }
                    // /idx → non-unique index
                    if (child.isOption('idx')) {
                        indexes.push({ cols: [child.parseName()] });
                    }
                }

                // Explicit FK ref (/fk table)
                const fkTarget = child.refId?.();
                if (fkTarget) {
                    const targetTbl  = this.tableName(fkTarget);
                    const targetQual = this.schema ? `${this.schema}.${targetTbl}` : targetTbl;
                    const fkColName  = child.parseName();
                    refs.push({
                        name:      `${tblName}_${fkColName}_fk`,
                        fromTable: qualName,
                        fromCols:  [fkColName],
                        toTable:   targetQual,
                        toCols:    [`${targetTbl}_id`],
                        operator:  '>',
                        mandatory: child.isOption('nn'),
                        delete:    child.isOption('cascade')  ? 'cascade'
                                 : child.isOption('setnull') ? 'set null'
                                 : undefined,
                    });
                }

                // Star schema (many-to-one > table)
                if (child.isMany2One()) {
                    const dimRaw    = child.parseName();
                    const dimTbl    = this.tableName(dimRaw);
                    const dimQual   = this.schema ? `${this.schema}.${dimTbl}` : dimTbl;
                    const dimFkCol  = `${dimTbl}_id`;
                    refs.push({
                        name:      `${tblName}_${dimFkCol}_star_fk`,
                        fromTable: qualName,
                        fromCols:  [dimFkCol],
                        toTable:   dimQual,
                        toCols:    [`${dimTbl}_id`],
                        operator:  '>',
                        mandatory: child.isOption('nn'),
                    });
                }
            }
        }

        // ── Expanded columns from table-level directives ───────────────────────

        const hasAudit  = this.globalAudit  || node.hasAuditCols();
        const hasRowVer = this.globalRowVer || node.hasRowVersion();
        const hasRowKey = this.globalRowKey || node.hasRowKey();

        if (hasAudit) {
            for (const ec of expandAuditCols({
                createdcol:   this.createdcol,
                createdbycol: this.createdbycol,
                updatedcol:   this.updatedcol,
                updatedbycol: this.updatedbycol,
                auditdate:    this.auditDateType || undefined,
            })) {
                columns.push(this.expandedToCol(ec));
            }
        }
        if (hasRowVer) columns.push(this.expandedToCol(expandRowVersion()));
        if (hasRowKey)  columns.push(this.expandedToCol(expandRowKey()));

        if (node.isOption('versioned')) {
            for (const ec of expandVersionedCols()) columns.push(this.expandedToCol(ec));
        }

        // ── Expansion of /trans → separate _trans table with FK ───────────────
        const transCols = node.getTransColumns?.() ?? [];
        if (transCols.length > 0) {
            const transName = `${tblName}_trans`;
            const transQual = this.schema ? `${this.schema}.${transName}` : transName;
            const transColdefs: DbmlColumnDef[] = [
                { name: `${transName}_id`, type: 'int', pk: true, increment: true },
                { name: `${tblName}_id`,   type: 'int', notNull: true },
                { name: 'lang',            type: 'varchar(10)', notNull: true },
            ];
            for (const tc of transCols) {
                const st = tc._inferTypeFull();
                transColdefs.push({
                    name:    tc.parseName(),
                    type:    toDbmlType(st),
                    notNull: false,
                    note:    tc.comment ?? undefined,
                });
            }
            tables.push({
                name:    transName,
                schema:  this.schema || null,
                note:    `Translation table for ${tblName}`,
                columns: transColdefs,
                indexes: [{ cols: [`${tblName}_id`, 'lang'], unique: true }],
                meta:    { esql_trans: 'yes' },
            });
            refs.push({
                name:      `${transName}_${tblName}_id_fk`,
                fromTable: transQual,
                fromCols:  [`${tblName}_id`],
                toTable:   qualName,
                toCols:    [pkColName],
                operator:  '>',
                mandatory: true,
                delete:    'cascade',
            });
        }

        // ── Table-level metadata ──────────────────────────────────────────────
        const tableMeta = this.buildTableMeta(node, hasAudit, hasRowVer, hasRowKey);

        // ── Table note ────────────────────────────────────────────────────────
        const note = node.comment
            ?? node.getAnnotationValue('DESCRIPTION')
            ?? node.getAnnotationValue('description');

        // ── TableGroup ────────────────────────────────────────────────────────
        const tgroup = node.getAnnotationValue('TGROUP') ?? node.getAnnotationValue('tgroup');
        if (tgroup) {
            if (!groupMap.has(tgroup)) groupMap.set(tgroup, []);
            groupMap.get(tgroup)!.push(qualName);
        }

        tables.push({
            name:    tblName,
            schema:  this.schema || null,
            note:    note ?? undefined,
            columns,
            indexes,
            meta:    Object.keys(tableMeta).length ? tableMeta : undefined,
        });
    }

    // ── PK column ─────────────────────────────────────────────────────────────

    private makePkColumn(pkColName: string): DbmlColumnDef {
        const mode = this.pkMode.toLowerCase();
        if (mode === 'identity' || mode === 'identitydatatype') {
            return { name: pkColName, type: 'int', pk: true, increment: true };
        }
        if (mode === 'seq') {
            const seqName = this.prefix
                ? this.prefix.toUpperCase() + '_SEQ'
                : 'APP_SEQ';
            return { name: pkColName, type: 'int', pk: true, default: `\`${seqName}.NEXTVAL\`` };
        }
        // guid (default)
        return { name: pkColName, type: 'varchar(36)', pk: true, default: '`sys_guid()`' };
    }

    // ── Column building ───────────────────────────────────────────────────────

    private buildColumn(
        node:    IDdlNode,
        tblName: string,
        enums:   DbmlEnum[],
    ): DbmlColumnDef | null {
        const name = node.parseName();
        const st   = node._inferTypeFull();
        let   type = toDbmlType(st);

        let checkExpr: string | undefined;

        // /check val1,val2 → try enum (string values only); fall back to inline check
        if (node.isOption('check')) {
            const checkVals = node.getValues('check');
            // Split and strip surrounding quotes added by the tokenizer
            const rawVals = checkVals.split(',').map((v: string) => v.trim().replace(/^'|'$/g, '')).filter(Boolean);
            // "Simple" values: all-identifier chars, not purely numeric, no operators
            const simpleVals = rawVals.every(v => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
            if (simpleVals && rawVals.length > 0) {
                const enumName = this.tryRegisterEnum(tblName, name, rawVals, enums);
                if (enumName) {
                    type = enumName;
                } else {
                    checkExpr = `${name} in (${rawVals.map((v: string) => `'${v}'`).join(', ')})`;
                }
            }
            // Arbitrary expressions (operators, parens, numeric ranges): skip emitting
            // check in DBML — too fragile to reconstruct from token stream. The
            // constraint is visible in the DDL output.
        }

        // /between lo and hi → check expression
        if (!checkExpr && node.isOption('between')) {
            const between = node.getBetweenClause();
            if (between) checkExpr = `${name} ${between}`;
        }

        // DEFAULT
        const defVal = node.getDefaultValue();
        let defaultStr: string | undefined;
        if (defVal !== null && defVal !== undefined) {
            if (/^[0-9]+(\.[0-9]+)?$/.test(defVal)) {
                defaultStr = defVal;                         // numeric literal
            } else if (/^'.*'$/.test(defVal)) {
                defaultStr = defVal;                         // already quoted string
            } else if (defVal === 'null' || defVal === 'NULL') {
                defaultStr = 'null';
            } else {
                defaultStr = `\`${defVal}\``;               // SQL expression
            }
        }

        // Note
        const note = node.comment
            ?? node.getAnnotationValue('DESCRIPTION')
            ?? node.getAnnotationValue('description');

        // Column-level custom properties
        const meta: Record<string, string> = {};
        if (node.isOption('upper')) meta['esql_case'] = 'upper';
        if (node.isOption('lower')) meta['esql_case'] = 'lower';

        return {
            name,
            type,
            pk:        node.isOption('pk')     || false,
            unique:    node.isOption('unique')  || false,
            notNull:   node.isOption('nn')      || false,
            default:   defaultStr,
            checkExpr,
            note:      note ?? undefined,
            meta:      Object.keys(meta).length ? meta : undefined,
        };
    }

    private expandedToCol(ec: ExpandedColumn): DbmlColumnDef {
        return {
            name:    ec.name,
            type:    ec.type,
            pk:      ec.pk,
            notNull: ec.notNull,
            default: ec.default,
            note:    ec.note,
            meta:    ec.esqlMeta,
        };
    }

    // ── Enum extraction ───────────────────────────────────────────────────────

    /**
     * Tries to register a DBML enum for a /check list.
     * Returns the enum name if registered (or reused), null if the values are
     * ineligible (too many, contain non-identifier characters, etc.).
     *
     * Deduplication: identical value sets across tables/columns reuse the same enum.
     */
    private tryRegisterEnum(
        tblName: string,
        colName: string,
        vals:    string[],
        enums:   DbmlEnum[],
    ): string | null {
        if (vals.length === 0 || vals.length > 10) return null;
        if (vals.some(v => !/^[a-zA-Z0-9_]+$/.test(v))) return null;

        const sig = [...vals].sort().join('\0');
        if (this.enumBySig.has(sig)) return this.enumBySig.get(sig)!;

        const enumName = `${tblName}_${colName}_enum`;
        enums.push({ name: enumName, schema: this.schema || null, values: vals });
        this.enumBySig.set(sig, enumName);
        return enumName;
    }

    // ── Metadata helpers ──────────────────────────────────────────────────────

    private buildTableMeta(
        node:     IDdlNode,
        hasAudit: boolean,
        hasRowVer: boolean,
        hasRowKey: boolean,
    ): Record<string, string> {
        const m: Record<string, string> = {};
        const flag = (k: string, label = k) => { if (node.isOption(k)) m[`esql_${label}`] = 'yes'; };

        flag('audit');
        flag('auditlog');
        flag('immutable');
        flag('soda');
        flag('history');
        flag('aggregate');
        flag('notenantid');
        flag('compress');
        flag('versioned');
        flag('businesskey');

        if (node.isOption('rest'))   m['esql_ords']    = 'yes';
        if (node.isOption('flashback')) m['esql_fda']  = node.getOptionValue('flashback') as string ?? 'yes';
        if (node.isOption('lockmode'))  m['esql_lockmode'] = String(node.getOptionValue('lockmode') ?? 'wait:10');

        if (hasAudit)  m['esql_auditcols']  = 'yes';
        if (hasRowVer) m['esql_rowversion'] = 'yes';
        if (hasRowKey) m['esql_rowkey']     = 'yes';

        // TAPI tier from node-level /api directive
        const tier = node.getOptionValue('api');
        if (tier) m['esql_api'] = String(tier);

        // Pass through arbitrary annotations (excluding DESCRIPTION and TGROUP)
        for (const { label, value } of node.getAnnotationPairs()) {
            const uLabel = label.toUpperCase();
            if (uLabel === 'DESCRIPTION' || uLabel === 'TGROUP') continue;
            if (value) m[`esql_ann_${label.toLowerCase()}`] = value;
        }

        return m;
    }

    private buildProjectMeta(): Record<string, string> {
        const m: Record<string, string> = {};
        const opt = (k: string) => this.ctx.getOptionValue(k);
        if (opt('prefix'))   m['esql_prefix']   = String(opt('prefix'));
        if (opt('api'))      m['esql_api']       = String(opt('api'));
        if (opt('ifc'))      m['esql_ifc']       = String(opt('ifc'));
        if (this.globalTenant) m['esql_tenantid'] = 'yes';
        return m;
    }

    // ── Pass 2: DBML emission ─────────────────────────────────────────────────

    private emitDBML(model: DbmlModel): string {
        const out: string[] = [];

        // Project block
        if (model.project) {
            out.push(`Project ${model.project.name} {`);
            out.push(`  database_type: '${model.project.databaseType}'`);
            for (const [k, v] of Object.entries(model.project.meta)) {
                out.push(`  ${k}: '${escStr(v)}'`);
            }
            out.push('}', '');
        }

        // Enum blocks
        for (const en of model.enums) {
            const qual = en.schema ? `${en.schema}.${en.name}` : en.name;
            out.push(`enum ${qual} {`);
            for (const v of en.values) out.push(`  ${v}`);
            out.push('}', '');
        }

        // Table blocks
        for (const tbl of model.tables) {
            const qual = tbl.schema ? `${tbl.schema}.${tbl.name}` : tbl.name;
            out.push(`Table ${qual} {`);
            if (tbl.note) out.push(`  Note: '${escStr(tbl.note)}'`);

            for (const col of tbl.columns) out.push(this.emitColumn(col));

            // indexes block
            if (tbl.indexes.length > 0) {
                out.push('', '  indexes {');
                for (const idx of tbl.indexes) {
                    const cols  = idx.cols.length > 1 ? `(${idx.cols.join(', ')})` : idx.cols[0];
                    const flags = [
                        ...(idx.pk     ? ['pk']     : []),
                        ...(idx.unique ? ['unique'] : []),
                        ...(idx.name   ? [`name: '${idx.name}'`] : []),
                    ];
                    out.push(`    ${cols}${flags.length ? ` [${flags.join(', ')}]` : ''}`);
                }
                out.push('  }');
            }

            // Table-level metadata
            if (tbl.meta && Object.keys(tbl.meta).length > 0) {
                out.push('');
                out.push('  [');
                for (const [k, v] of Object.entries(tbl.meta)) {
                    out.push(`    ${k}: "${escStr(v)}"`);
                }
                out.push('  ]');
            }

            out.push('}', '');
        }

        // Ref blocks
        for (const ref of model.refs) out.push(this.emitRef(ref));
        if (model.refs.length > 0) out.push('');

        // TableGroup blocks
        for (const tg of model.tableGroups) {
            out.push(`TableGroup ${tg.name} {`);
            for (const tbl of tg.tables) out.push(`  ${tbl}`);
            out.push('}', '');
        }

        return out.join('\n');
    }

    private emitColumn(col: DbmlColumnDef): string {
        const settings: string[] = [];
        if (col.pk)        settings.push('pk');
        if (col.increment) settings.push('increment');
        if (col.unique)    settings.push('unique');
        if (col.notNull)   settings.push('not null');
        if (col.default !== undefined) settings.push(`default: ${col.default}`);
        if (col.checkExpr) settings.push(`check: \`${col.checkExpr}\``);
        if (col.note)      settings.push(`note: '${escStr(col.note)}'`);
        if (col.meta) {
            for (const [k, v] of Object.entries(col.meta)) settings.push(`${k}: "${escStr(v)}"`);
        }
        return `  ${col.name} ${col.type}${settings.length ? ` [${settings.join(', ')}]` : ''}`;
    }

    private emitRef(ref: DbmlRef): string {
        const fromCols = ref.fromCols.length > 1 ? `(${ref.fromCols.join(', ')})` : ref.fromCols[0];
        const toCols   = ref.toCols.length   > 1 ? `(${ref.toCols.join(', ')})`   : ref.toCols[0];
        const del      = ref.delete ? ` [delete: ${ref.delete}]` : '';
        const nameStr  = ref.name ? ` ${ref.name}` : '';
        return `Ref${nameStr}: ${ref.fromTable}.${fromCols} ${ref.operator} ${ref.toTable}.${toCols}${del}`;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escStr(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
