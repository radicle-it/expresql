import type { DdlContext, IDdlNode } from '../compiler/types.js';
import type { DiffGenerator, DiffResult, DiffStatement, DiffStatementKind, DiffWarning, DiffSummary } from '../compiler/diff-types.js';
import { OracleDDLGenerator } from './generator.js';
import { OraclePlsqlBuilder } from './plsql.js';
import { toOracleType, isDb23 } from './types.js';
import { DdlNode, DEFAULT_NAMING } from '../compiler/node.js';
import { concatNames } from '../utils/naming.js';

// ── Step order map ────────────────────────────────────────────────────────────

const STEP: Record<DiffStatementKind, number> = {
    drop_package:        1,
    drop_view:           2,
    drop_fk:             3,
    transient_drop_fk:   3,
    drop_table:          4,
    drop_index:          5,
    drop_sequence:       6,
    create_table:        7,
    add_sequence:        8,
    add_column:          9,
    rename_hint:         9,
    modify_column:      10,
    set_unused:         11,
    drop_unused_columns: 12,
    add_fk:             13,
    transient_add_fk:   13,
    add_index:          14,
    create_trigger:     14,
    drop_trigger:        5,
    create_package:     15, // overridden to 17 for bodies in _step()
    create_view:        16,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mk(
    kind:    DiffStatementKind,
    table:   string,
    sql:     string,
    column?: string,
    rmi = false,
): DiffStatement {
    const s: DiffStatement = { kind, table, sql, requiresManualIntervention: rmi };
    if (column !== undefined) s.column = column;
    return s;
}

function wn(
    level:   'DESTRUCTIVE' | 'LOSSY' | 'INFO',
    table:   string,
    message: string,
    column?: string,
    rmi = false,
): DiffWarning {
    const w: DiffWarning = { level, table, message, requiresManualIntervention: rmi };
    if (column !== undefined) w.column = column;
    return w;
}

// ── OracleDiffGenerator ───────────────────────────────────────────────────────

export class OracleDiffGenerator implements DiffGenerator {

    compute(oldCtx: DdlContext, newCtx: DdlContext): DiffResult {
        const allStmts: DiffStatement[] = [];
        const warns:    DiffWarning[]   = [];

        const oldTables = this._tableMap(oldCtx);
        const newTables = this._tableMap(newCtx);
        const oldViews  = this._viewMap(oldCtx);
        const newViews  = this._viewMap(newCtx);

        // ── Dropped tables ────────────────────────────────────────────────────
        const dropped: IDdlNode[] = [];
        for (const [name, node] of oldTables)
            if (!newTables.has(name)) dropped.push(node);

        for (const node of this._reverseTopoSort(dropped, oldCtx)) {
            allStmts.push(...this._dropTable(node, oldCtx));
            warns.push(wn('DESTRUCTIVE', node.parseName(), `table dropped: ${node.parseName()}`));
        }

        // ── New tables ────────────────────────────────────────────────────────
        const added: IDdlNode[] = [];
        for (const [name, node] of newTables)
            if (!oldTables.has(name)) added.push(node);

        for (const node of this._topoSort(added, newCtx))
            allStmts.push(...this._createTable(node, newCtx));

        // ── Modified tables ───────────────────────────────────────────────────
        for (const [name, newNode] of newTables) {
            const oldNode = oldTables.get(name);
            if (oldNode == null) continue;
            const { stmts, warns: tw } = this._diffTable(oldNode, newNode, oldCtx, newCtx);
            allStmts.push(...stmts);
            warns.push(...tw);
        }

        // ── Views (global) ────────────────────────────────────────────────────
        allStmts.push(...this._diffViews(oldViews, newViews, newCtx));

        // ── Order and assemble ────────────────────────────────────────────────
        const ordered  = this._order(allStmts);
        const preamble = this._buildPreamble(ordered, warns);
        const body     = ordered.map(s => s.sql.endsWith('\n') ? s.sql : s.sql + '\n').join('\n');

        return {
            sql:        preamble + body,
            statements: ordered,
            warnings:   warns,
            summary:    this._summary(ordered, warns, oldTables, newTables),
        };
    }

    // ── Map builders ──────────────────────────────────────────────────────────

    private _tableMap(ctx: DdlContext): Map<string, IDdlNode> {
        const map = new Map<string, IDdlNode>();
        for (const node of ctx.descendants())
            if (node.inferType() === 'table') map.set(node.parseName(), node);
        return map;
    }

    private _viewMap(ctx: DdlContext): Map<string, IDdlNode> {
        const map = new Map<string, IDdlNode>();
        for (const root of ctx.forest)
            if (root.inferType() === 'view' || root.inferType() === 'dv')
                map.set(root.parseName(), root);
        return map;
    }

    // ── Topological sort ──────────────────────────────────────────────────────

    private _topoSort(nodes: IDdlNode[], ctx: DdlContext): IDdlNode[] {
        const nameSet = new Set(nodes.map(n => n.parseName()));
        const visited = new Set<string>();
        const result:  IDdlNode[] = [];

        const visit = (node: IDdlNode) => {
            const name = node.parseName();
            if (visited.has(name)) return;
            visited.add(name);
            if (node.fks) {
                for (const fkCol in node.fks) {
                    const refTable = node.fks![fkCol];
                    if (nameSet.has(refTable)) {
                        const ref = ctx.find(refTable);
                        if (ref != null) visit(ref);
                    }
                }
            }
            result.push(node);
        };

        for (const node of nodes) visit(node);
        return result;
    }

    private _reverseTopoSort(nodes: IDdlNode[], ctx: DdlContext): IDdlNode[] {
        return [...this._topoSort(nodes, ctx)].reverse();
    }

    // ── Drop table ────────────────────────────────────────────────────────────

    private _dropTable(node: IDdlNode, ctx: DdlContext): DiffStatement[] {
        const stmts:    DiffStatement[] = [];
        const tbl       = node.parseName();
        const objName   = ctx.objPrefix() + tbl;
        const db23      = isDb23(ctx);
        const ifx       = db23 ? 'if exists ' : '';

        // Packages (permanent removal)
        const apiKind = this._apiKind(node, ctx);
        if (apiKind === 'layered') {
            for (const pkg of this._layeredPkgNames(node, ctx))
                stmts.push(mk('drop_package', tbl, `drop package ${ifx}${pkg};\n`));
        } else if (apiKind === 'simple') {
            stmts.push(mk('drop_package', tbl, `drop package ${ifx}${objName}_api;\n`));
        }

        // Sequence
        if (ctx.optionEQvalue('pk', 'SEQ'))
            stmts.push(mk('drop_sequence', tbl,
                `drop sequence ${ifx}${objName}${DEFAULT_NAMING.seq};\n`));

        // Table
        stmts.push(mk('drop_table', tbl,
            `drop table ${ifx}${objName} cascade constraints;\n`));

        return stmts;
    }

    // ── Create table ──────────────────────────────────────────────────────────

    private _createTable(node: IDdlNode, ctx: DdlContext): DiffStatement[] {
        const stmts:  DiffStatement[] = [];
        const tbl     = node.parseName();
        const objName = ctx.objPrefix() + tbl;
        const gen     = new OracleDDLGenerator(ctx);

        // Sequence
        if (ctx.optionEQvalue('pk', 'SEQ'))
            stmts.push(mk('add_sequence', tbl,
                `create sequence  ${objName}${DEFAULT_NAMING.seq};\n`));

        // Table DDL (includes inline FK constraints and indexes via the generator)
        node.lateInitFks();
        const prevLen  = ctx.postponedAlters.length;
        let   tableDdl = gen.generateTable(node);
        // Append FK alters accumulated during generation
        const newAlters = ctx.postponedAlters.slice(prevLen);
        for (const a of newAlters) tableDdl += a + '\n';
        stmts.push(mk('create_table', tbl, tableDdl));

        const plsql = new OraclePlsqlBuilder(ctx, DEFAULT_NAMING);

        // Triggers (lower/upper/rowversion/auditcols)
        const triggerSql = plsql.generateTrigger(node);
        if (triggerSql) stmts.push(mk('create_trigger', tbl, triggerSql));

        // Packages
        const apiKindCreate = this._apiKind(node, ctx);
        if (apiKindCreate === 'layered') {
            stmts.push(...this._splitPkgBlocks(plsql.generateLayeredTAPI(node), tbl));
        } else if (apiKindCreate === 'simple') {
            stmts.push(...this._splitPkgBlocks(plsql.generateTAPI(node), tbl));
        }

        return stmts;
    }

    // ── Diff table ────────────────────────────────────────────────────────────

    private _diffTable(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, newCtx:  DdlContext,
    ): { stmts: DiffStatement[]; warns: DiffWarning[] } {
        const stmts: DiffStatement[] = [];
        const warns: DiffWarning[]   = [];
        const tbl     = newNode.parseName();
        const objName = newCtx.objPrefix() + tbl;

        // Ensure FK records are populated
        oldNode.lateInitFks();
        newNode.lateInitFks();


        // ── Column diff ───────────────────────────────────────────────────────
        const oldCols = this._colMap(oldNode);
        const newCols = this._colMap(newNode);

        const droppedCols: IDdlNode[] = [];
        for (const [name, col] of oldCols)
            if (!newCols.has(name)) droppedCols.push(col);

        const addedCols: IDdlNode[] = [];
        for (const [name, col] of newCols)
            if (!oldCols.has(name)) addedCols.push(col);

        // Rename detection
        const renames   = this._detectRenames(droppedCols, addedCols);
        const renamedOld = new Set([...renames.keys()].map(n => n.parseName()));
        const renamedNew = new Set([...renames.values()].map(n => n.parseName()));

        for (const [oldCol, newCol] of renames) {
            stmts.push(mk('rename_hint', tbl,
                `-- alter table ${objName} rename column ${oldCol.parseName()} to ${newCol.parseName()};\n`,
                oldCol.parseName()));
            warns.push(wn('INFO', tbl,
                `suspected rename: ${oldCol.parseName()} → ${newCol.parseName()} (verify before applying)`,
                oldCol.parseName()));
        }

        // Definite drops
        for (const col of droppedCols) {
            if (renamedOld.has(col.parseName())) continue;
            stmts.push(...this._dropColumn(objName, tbl, col));
            warns.push(wn('DESTRUCTIVE', tbl, `column dropped: ${col.parseName()}`, col.parseName()));
        }

        // Definite adds
        for (const col of addedCols) {
            if (renamedNew.has(col.parseName())) continue;
            const { stmts: cs, warns: cw } = this._addColumn(objName, tbl, col, newCtx);
            stmts.push(...cs);
            warns.push(...cw);
        }

        // Modified columns
        for (const [name, newCol] of newCols) {
            const oldCol = oldCols.get(name);
            if (oldCol == null) continue;
            const { stmts: ms, warns: mw } =
                this._modifyColumn(objName, tbl, oldCol, newCol, oldCtx, newCtx);
            stmts.push(...ms);
            warns.push(...mw);
        }

        // ── Row version column ────────────────────────────────────────────────
        const oldHasRV = oldNode.hasRowVersion();
        const newHasRV = newNode.hasRowVersion();
        if (!oldHasRV && newHasRV) {
            stmts.push(mk('add_column', tbl,
                `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                `-- Initialize row_version for existing rows, then add NOT NULL:\n` +
                `-- alter table ${objName} add (row_version integer);\n` +
                `-- update ${objName} set row_version = 0;\n` +
                `-- commit;\n` +
                `-- alter table ${objName} modify (row_version not null);\n`,
                'row_version', true));
            warns.push(wn('INFO', tbl,
                'rowversion added — requires manual column initialization', 'row_version', true));
        }
        if (oldHasRV && !newHasRV) {
            stmts.push(mk('set_unused', tbl,
                `alter table ${objName} set unused column row_version;\n`, 'row_version'));
            stmts.push(mk('drop_unused_columns', tbl,
                `-- [MAINTENANCE] safe to defer to a maintenance window\n` +
                `alter table ${objName} drop unused columns;\n`, 'row_version'));
            warns.push(wn('DESTRUCTIVE', tbl, 'row_version column dropped', 'row_version'));
        }

        // ── PK changes ────────────────────────────────────────────────────────
        const { stmts: pks, warns: pkw } =
            this._diffPk(oldNode, newNode, oldCtx, newCtx, oldCols, newCols);
        stmts.push(...pks);
        warns.push(...pkw);

        // ── FK constraints ────────────────────────────────────────────────────
        stmts.push(...this._diffFKs(oldNode, newNode, oldCtx, newCtx));

        // ── Indexes ───────────────────────────────────────────────────────────
        stmts.push(...this._diffIndexes(oldNode, newNode, oldCtx, newCtx));

        // ── Triggers (lower/upper/rowversion/auditcols) ───────────────────────
        stmts.push(...this._diffTriggers(oldNode, newNode, oldCtx, newCtx));

        // ── Packages ──────────────────────────────────────────────────────────
        const colsChanged = droppedCols.some(c => !renamedOld.has(c.parseName()))
            || addedCols.some(c => !renamedNew.has(c.parseName()))
            || stmts.some(s => s.kind === 'modify_column');
        const { stmts: ps, warns: pw } =
            this._diffPackages(oldNode, newNode, oldCtx, newCtx, colsChanged);
        stmts.push(...ps);
        warns.push(...pw);

        return { stmts, warns };
    }

    // ── PK descriptor ────────────────────────────────────────────────────────

    private _pkDesc(
        node: IDdlNode, ctx: DdlContext,
    ): { type: 'surrogate' | 'business' | 'none'; columns: string[]; constraintName: string } {
        const tbl     = node.parseName();
        const objName = ctx.objPrefix() + tbl;
        const expName = node.getExplicitPkName() as string | null;

        if (expName != null) {
            const cols  = expName.includes(',')
                ? expName.split(',').map(s => s.trim())
                : [expName];
            const cname = cols.length === 1
                ? `${objName}_${cols[0]}_pk`
                : `${objName}_pk`;
            return { type: 'business', columns: cols, constraintName: cname };
        }

        const genId = node.getGenIdColName();
        if (genId != null)
            return { type: 'surrogate', columns: [genId], constraintName: `${objName}_pk` };

        return { type: 'none', columns: [], constraintName: '' };
    }

    // ── Diff PK ───────────────────────────────────────────────────────────────

    private _diffPk(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, newCtx:  DdlContext,
        oldCols: Map<string, IDdlNode>,
        newCols: Map<string, IDdlNode>,
    ): { stmts: DiffStatement[]; warns: DiffWarning[] } {
        const stmts: DiffStatement[] = [];
        const warns: DiffWarning[]   = [];
        const tbl    = newNode.parseName();
        const oldObj = oldCtx.objPrefix() + tbl;
        const newObj = newCtx.objPrefix() + tbl;

        const oldPk = this._pkDesc(oldNode, oldCtx);
        const newPk = this._pkDesc(newNode, newCtx);

        // No structural change
        if (oldPk.type === newPk.type && oldPk.columns.join(',') === newPk.columns.join(','))
            return { stmts, warns };

        // DESTRUCTIVE warning
        const oldDesc = oldPk.type === 'none' ? 'none' : `${oldPk.type}(${oldPk.columns.join(', ')})`;
        const newDesc = newPk.type === 'none' ? 'none' : `${newPk.type}(${newPk.columns.join(', ')})`;
        warns.push(wn('DESTRUCTIVE', tbl,
            `Primary key change on "${tbl}": ${oldDesc} → ${newDesc}. ` +
            `All FKs referencing this table must be dropped and re-created. ` +
            `Data migration required.`, undefined, true));

        // For each new PK column: if it needs to become NOT NULL and that
        // step was not already emitted by _addColumn (which only does it when /nn
        // is declared), emit a manual NOT NULL block here.
        for (const col of newPk.columns) {
            const oldCol = oldCols.get(col);
            const newCol = newCols.get(col);
            if (newCol == null) continue;           // defensive: column not in map

            const alreadyNn = this._isNotNull(newCol);
            if (alreadyNn) continue;                // _addColumn or _modifyColumn will handle it

            if (oldCol == null) {
                // Brand new column added without /nn — _addColumn added it nullable only
                stmts.push(mk('modify_column', tbl,
                    `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                    `-- Populate ${col} for existing rows, then add NOT NULL:\n` +
                    `-- update ${newObj} set ${col} = ??? where ${col} is null;\n` +
                    `-- commit;\n` +
                    `-- alter table ${newObj} modify (${col} not null);\n`,
                    col, true));
            } else if (!this._isNotNull(oldCol)) {
                // Existing column promoted to PK but not yet NN
                stmts.push(mk('modify_column', tbl,
                    `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                    `-- Ensure all rows have a non-null ${col} value, then:\n` +
                    `-- alter table ${newObj} modify (${col} not null);\n`,
                    col, true));
            }
        }

        // Manual: drop old PK constraint
        if (oldPk.constraintName) {
            stmts.push(mk('modify_column', tbl,
                `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                `-- Drop the old primary key constraint before continuing:\n` +
                `-- alter table ${oldObj} drop constraint ${oldPk.constraintName};\n`,
                undefined, true));
        }

        // Automatic: drop old surrogate column when switching to a business PK
        if (oldPk.type === 'surrogate') {
            const idCol = oldPk.columns[0];
            if (!newCols.has(idCol)) {
                // Only drop if the column is not being kept as a regular column
                stmts.push(mk('set_unused', tbl,
                    `alter table ${oldObj} set unused column ${idCol};\n`, idCol));
                stmts.push(mk('drop_unused_columns', tbl,
                    `-- [MAINTENANCE] safe to defer to a maintenance window\n` +
                    `alter table ${oldObj} drop unused columns;\n`, idCol));
            }
            if (oldCtx.optionEQvalue('pk', 'SEQ'))
                stmts.push(mk('drop_sequence', tbl,
                    `drop sequence ${oldObj}${DEFAULT_NAMING.seq};\n`));
        }

        // Manual: add new PK constraint (must run after all PK cols are NOT NULL)
        if (newPk.columns.length > 0) {
            const cols = newPk.columns.join(', ');
            stmts.push(mk('add_fk', tbl,
                `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                `-- After all PK columns are NOT NULL, add the primary key:\n` +
                `-- alter table ${newObj} add constraint ${newPk.constraintName} primary key (${cols});\n`,
                undefined, true));
        }

        return { stmts, warns };
    }

    // ── Diff triggers ─────────────────────────────────────────────────────────

    private _diffTriggers(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, newCtx:  DdlContext,
    ): DiffStatement[] {
        const stmts:  DiffStatement[] = [];
        const tbl     = newNode.parseName();
        const oldObj  = (oldCtx.objPrefix() + tbl).toLowerCase();

        const sig = (node: IDdlNode) => JSON.stringify({
            lower:  node.children.filter(c => c.isOption('lower')).map(c => c.parseName()),
            upper:  node.children.filter(c => c.isOption('upper') && !c.isOption('lower')).map(c => c.parseName()),
            rv:     node.hasRowVersion(),
            audit:  node.hasAuditCols(),
            rowkey: node.hasRowKey(),
        });

        if (sig(oldNode) === sig(newNode)) return stmts;

        const hasLU = (node: IDdlNode) =>
            node.children.some(c => c.isOption('lower') || c.isOption('upper'));

        const oldHasBi = hasLU(oldNode) || oldNode.hasRowVersion() || oldNode.hasAuditCols() || oldNode.hasRowKey();
        const oldHasBu = hasLU(oldNode) || oldNode.hasRowVersion() || oldNode.hasAuditCols();
        const newHasBi = hasLU(newNode) || newNode.hasRowVersion() || newNode.hasAuditCols() || newNode.hasRowKey();
        const newHasBu = hasLU(newNode) || newNode.hasRowVersion() || newNode.hasAuditCols();

        if (oldHasBi) stmts.push(mk('drop_trigger', tbl, `drop trigger ${oldObj}${DEFAULT_NAMING.bi};\n`));
        if (oldHasBu) stmts.push(mk('drop_trigger', tbl, `drop trigger ${oldObj}${DEFAULT_NAMING.bu};\n`));

        if (newHasBi || newHasBu) {
            const plsql = new OraclePlsqlBuilder(newCtx, DEFAULT_NAMING);
            const sql   = plsql.generateTrigger(newNode);
            if (sql) stmts.push(mk('create_trigger', tbl, sql));
        }

        return stmts;
    }

    // ── Column helpers ────────────────────────────────────────────────────────

    private _colMap(node: IDdlNode): Map<string, IDdlNode> {
        const map = new Map<string, IDdlNode>();
        for (const col of node.regularColumns())
            map.set(col.parseName(), col);
        return map;
    }

    private _isNotNull(col: IDdlNode): boolean {
        return col.isOption('nn') ||
            (col.indexOf('not') >= 0 && col.indexOf('not') + 1 === col.indexOf('null'));
    }

    // ── Rename detection ──────────────────────────────────────────────────────

    private _detectRenames(dropped: IDdlNode[], added: IDdlNode[]): Map<IDdlNode, IDdlNode> {
        const result     = new Map<IDdlNode, IDdlNode>();
        const byDropType = new Map<string, IDdlNode[]>();
        const byAddType  = new Map<string, IDdlNode[]>();

        const typeKey = (col: IDdlNode): string => {
            const s = col._inferTypeFull();
            return `${s.base}:${s.varcharLen ?? ''}:${s.numericSpec ?? ''}:${s.vectorSpec ?? ''}`;
        };

        for (const col of dropped) {
            const key = typeKey(col);
            if (!byDropType.has(key)) byDropType.set(key, []);
            byDropType.get(key)!.push(col);
        }
        for (const col of added) {
            const key = typeKey(col);
            if (!byAddType.has(key)) byAddType.set(key, []);
            byAddType.get(key)!.push(col);
        }

        for (const [key, drops] of byDropType) {
            const adds = byAddType.get(key);
            if (adds == null) continue;
            if (drops.length === 1 && adds.length === 1)
                result.set(drops[0], adds[0]);
        }
        return result;
    }

    // ── Add column ────────────────────────────────────────────────────────────

    private _addColumn(
        objName: string, tbl: string,
        col:     IDdlNode, ctx: DdlContext,
    ): { stmts: DiffStatement[]; warns: DiffWarning[] } {
        const stmts: DiffStatement[] = [];
        const warns: DiffWarning[]   = [];
        const db23    = isDb23(ctx);
        const sem     = col._inferTypeFull();
        const colType = toOracleType(sem, ctx.semantics(), db23);
        const colName = col.parseName();
        const isNN    = this._isNotNull(col);

        // Build column definition suffix (default, invisible)
        let colSuffix = '';
        if (col.isOption('default')) {
            const rawVal   = col.getDefaultValue() ?? '';
            const sqlDates = ['sysdate', 'current_date', 'current_timestamp', 'systimestamp', 'localtimestamp'];
            const isNumOrDate = colType.startsWith('integer') || colType.startsWith('number')
                || colType.startsWith('date') || colType.startsWith('timestamp')
                || sqlDates.includes(rawVal.toLowerCase());
            const q = isNumOrDate ? '' : "'";
            colSuffix += sqlDates.includes(rawVal.toLowerCase())
                ? ` default on null ${rawVal}`
                : ` default on null ${q}${rawVal}${q}`;
        }
        if (col.isOption('hidden') || col.isOption('invincible')) colSuffix += ' invisible';

        const colDef = `${colName} ${colType}${colSuffix}`;

        if (isNN) {
            // Three-step pattern: ADD nullable first, populate, then NOT NULL
            const defaultVal = col.isOption('default') ? col.getDefaultValue() ?? '???' : '???';
            const sqlDates   = ['sysdate', 'current_date', 'current_timestamp', 'systimestamp', 'localtimestamp'];
            const isNumOrDate = colType.startsWith('integer') || colType.startsWith('number')
                || colType.startsWith('date') || colType.startsWith('timestamp')
                || sqlDates.includes(defaultVal.toLowerCase());
            const q = (!col.isOption('default') || isNumOrDate) ? '' : "'";
            const populateVal = sqlDates.includes(defaultVal.toLowerCase())
                ? defaultVal : `${q}${defaultVal}${q}`;
            const isKnown = col.isOption('default');
            stmts.push(mk('add_column', tbl,
                `alter table ${objName} add (${colDef});\n`, colName));
            stmts.push(mk('add_column', tbl,
                `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                (isKnown
                    ? `-- Populate existing rows with the default value before step 3.\n`
                    : `-- Populate existing rows before step 3. Replace ??? with the correct expression.\n`) +
                `-- update ${objName} set ${colName} = ${populateVal} where ${colName} is null;\n` +
                `-- commit;\n`,
                colName, true));
            stmts.push(mk('modify_column', tbl,
                `alter table ${objName} modify (${colName} not null);\n`, colName));
            warns.push(wn('DESTRUCTIVE', tbl,
                `added NOT NULL column ${colName} — requires manual data population`,
                colName, true));
        } else {
            stmts.push(mk('add_column', tbl,
                `alter table ${objName} add (${colDef});\n`, colName));
        }

        // Check / between constraint for the new column
        if (col.isOption('check') || col.isOption('values')) {
            const vals   = col.isOption('check') ? col.getValues('check') : col.getValues('values');
            const ckName = concatNames(ctx.objPrefix(), `${tbl}_${colName}`, DEFAULT_NAMING.ck);
            stmts.push(mk('add_column', tbl,
                `alter table ${objName} add constraint ${ckName} check (${colName} in (${vals}));\n`,
                colName));
        } else if (col.isOption('between')) {
            const between = col.getBetweenClause() ?? '';
            const betName = concatNames(`${tbl}_${colName}`, DEFAULT_NAMING.bet);
            stmts.push(mk('add_column', tbl,
                `alter table ${objName} add constraint ${betName} check (${colName} between ${between});\n`,
                colName));
        }

        // Unique / regular index for the new column
        if (col.isOption('unique') || col.isOption('uk')) {
            const name = `${objName}_${colName}${DEFAULT_NAMING.unq}`;
            const sql  = `create unique index ${name} on ${objName} (${colName});\n`;
            stmts.push(mk('add_index', tbl,
                db23 ? `create unique index if not exists ${name} on ${objName} (${colName});\n`
                     : this._wrapIndex(sql)));
        } else if (col.isOption('idx') || col.isOption('index')) {
            const name = `${objName}_${colName}${DEFAULT_NAMING.idx}`;
            const sql  = `create index ${name} on ${objName} (${colName});\n`;
            stmts.push(mk('add_index', tbl,
                db23 ? `create index if not exists ${name} on ${objName} (${colName});\n`
                     : this._wrapIndex(sql)));
        }

        return { stmts, warns };
    }

    // ── Drop column ───────────────────────────────────────────────────────────

    private _dropColumn(objName: string, tbl: string, col: IDdlNode): DiffStatement[] {
        const colName = col.parseName();
        return [
            mk('set_unused', tbl,
                `alter table ${objName} set unused column ${colName};\n`, colName),
            mk('drop_unused_columns', tbl,
                `-- [MAINTENANCE] safe to defer to a maintenance window\n` +
                `alter table ${objName} drop unused columns;\n`,
                colName),
        ];
    }

    // ── Modify column ─────────────────────────────────────────────────────────

    private _modifyColumn(
        objName: string, tbl: string,
        oldCol:  IDdlNode, newCol: IDdlNode,
        oldCtx:  DdlContext, newCtx: DdlContext,
    ): { stmts: DiffStatement[]; warns: DiffWarning[] } {
        const stmts: DiffStatement[] = [];
        const warns: DiffWarning[]   = [];
        const oldSem = oldCol._inferTypeFull();
        const newSem = newCol._inferTypeFull();
        const db23   = isDb23(newCtx);
        const oldType = toOracleType(oldSem, oldCtx.semantics(), isDb23(oldCtx));
        const newType = toOracleType(newSem, newCtx.semantics(), db23);
        const oldNN   = this._isNotNull(oldCol);
        const newNN   = this._isNotNull(newCol);
        const colName = newCol.parseName();

        // ── Type / nullability ────────────────────────────────────────────────
        const typeChanged = oldType !== newType;
        const nullChanged = oldNN   !== newNN;

        if (typeChanged || nullChanged) {
            if (oldSem.base !== newSem.base) {
                const nullSuffix = newNN ? ' not null' : (oldNN ? ' null' : '');
                stmts.push(mk('modify_column', tbl,
                    `alter table ${objName} modify (${colName} ${newType}${nullSuffix});\n`, colName));
                warns.push(wn('LOSSY', tbl,
                    `base type changed on ${colName}: ${oldSem.base} → ${newSem.base}`, colName));
            } else {
                const parts: string[] = [];
                if (typeChanged) parts.push(newType);
                if (nullChanged) parts.push(newNN ? 'not null' : 'null');
                const modClause = parts.join(' ');
                const addingNN  = !oldNN && newNN;

                if (addingNN) {
                    stmts.push(mk('modify_column', tbl,
                        `-- ⚠ MANUAL INTERVENTION REQUIRED\n` +
                        `-- Ensure all rows have a non-null value before executing.\n` +
                        `-- alter table ${objName} modify (${colName} ${modClause});\n`,
                        colName, true));
                    warns.push(wn('DESTRUCTIVE', tbl,
                        `adding NOT NULL on ${colName} — requires manual verification`,
                        colName, true));
                } else {
                    stmts.push(mk('modify_column', tbl,
                        `alter table ${objName} modify (${colName} ${modClause});\n`, colName));
                    if (typeChanged && oldSem.base === 'varchar') {
                        const oldLen = oldSem.varcharLen ?? 4000;
                        const newLen = newSem.varcharLen ?? 4000;
                        if (newLen < oldLen)
                            warns.push(wn('LOSSY', tbl,
                                `varchar size reduced on ${colName}: ${oldLen} → ${newLen}`, colName));
                    }
                }
            }
        }

        // ── Default value ─────────────────────────────────────────────────────
        const oldDefault = oldCol.getDefaultValue();
        const newDefault = newCol.getDefaultValue();
        if (oldDefault !== newDefault) {
            if (newCol.isOption('default')) {
                const rawVal   = newDefault ?? '';
                const sqlDates = ['sysdate', 'current_date', 'current_timestamp', 'systimestamp', 'localtimestamp'];
                const isNumOrDate = newType.startsWith('integer') || newType.startsWith('number')
                    || newType.startsWith('date') || newType.startsWith('timestamp')
                    || sqlDates.includes(rawVal.toLowerCase());
                const q = isNumOrDate ? '' : "'";
                const defClause = sqlDates.includes(rawVal.toLowerCase())
                    ? `default on null ${rawVal}`
                    : `default on null ${q}${rawVal}${q}`;
                stmts.push(mk('modify_column', tbl,
                    `alter table ${objName} modify (${colName} ${defClause});\n`, colName));
            } else {
                stmts.push(mk('modify_column', tbl,
                    `alter table ${objName} modify (${colName} default null);\n`, colName));
            }
        }

        // ── Visibility (hidden / invisible) ───────────────────────────────────
        const oldHidden = oldCol.isOption('hidden') || oldCol.isOption('invincible');
        const newHidden = newCol.isOption('hidden') || newCol.isOption('invincible');
        if (oldHidden !== newHidden) {
            stmts.push(mk('modify_column', tbl,
                `alter table ${objName} modify (${colName} ${newHidden ? 'invisible' : 'visible'});\n`,
                colName));
        }

        // ── Check / between constraints ───────────────────────────────────────
        const oldHasCheck = oldCol.isOption('check') || oldCol.isOption('values');
        const newHasCheck = newCol.isOption('check') || newCol.isOption('values');
        const oldHasBet   = oldCol.isOption('between');
        const newHasBet   = newCol.isOption('between');
        const oldConstrSig = oldHasCheck ? JSON.stringify(oldCol.parseValues())
                           : oldHasBet   ? oldCol.getBetweenClause()
                           : null;
        const newConstrSig = newHasCheck ? JSON.stringify(newCol.parseValues())
                           : newHasBet   ? newCol.getBetweenClause()
                           : null;
        if (oldConstrSig !== newConstrSig) {
            if (oldConstrSig !== null) {
                const oldCkName = oldHasBet
                    ? concatNames(`${tbl}_${colName}`, DEFAULT_NAMING.bet)
                    : concatNames(oldCtx.objPrefix(), `${tbl}_${colName}`, DEFAULT_NAMING.ck);
                stmts.push(mk('modify_column', tbl,
                    `alter table ${objName} drop constraint ${oldCkName};\n`, colName));
            }
            if (newHasCheck) {
                const vals   = newHasCheck && newCol.isOption('check') ? newCol.getValues('check') : newCol.getValues('values');
                const ckName = concatNames(newCtx.objPrefix(), `${tbl}_${colName}`, DEFAULT_NAMING.ck);
                stmts.push(mk('modify_column', tbl,
                    `alter table ${objName} add constraint ${ckName} check (${colName} in (${vals}));\n`,
                    colName));
            } else if (newHasBet) {
                const between = newCol.getBetweenClause() ?? '';
                const betName = concatNames(`${tbl}_${colName}`, DEFAULT_NAMING.bet);
                stmts.push(mk('modify_column', tbl,
                    `alter table ${objName} add constraint ${betName} check (${colName} between ${between});\n`,
                    colName));
            }
        }

        return { stmts, warns };
    }

    // ── Diff FKs ──────────────────────────────────────────────────────────────

    private _diffFKs(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, newCtx:  DdlContext,
    ): DiffStatement[] {
        const stmts:    DiffStatement[] = [];
        const tbl       = newNode.parseName();
        const oldObj    = oldCtx.objPrefix() + tbl;
        const newObj    = newCtx.objPrefix() + tbl;
        const db23      = isDb23(newCtx);
        const oldFks    = oldNode.fks ?? {};
        const newFks    = newNode.fks ?? {};

        // Dropped FKs
        for (const fkCol in oldFks) {
            if (fkCol in newFks) continue;
            stmts.push(mk('drop_fk', tbl,
                `alter table ${oldObj} drop constraint ${oldObj}_${fkCol}_fk;\n`));
            // Also drop the FK column (it was auto-generated from the relationship)
            stmts.push(mk('set_unused', tbl,
                `alter table ${oldObj} set unused column ${fkCol};\n`, fkCol));
            stmts.push(mk('drop_unused_columns', tbl,
                `-- [MAINTENANCE] safe to defer to a maintenance window\n` +
                `alter table ${oldObj} drop unused columns;\n`, fkCol));
        }

        // Added FKs
        for (const fkCol in newFks) {
            if (fkCol in oldFks) continue;
            const refTable  = newFks[fkCol];
            const refPrefix = newCtx.find(refTable) != null ? newCtx.objPrefix() : '';
            const cName     = `${newObj}_${fkCol}_fk`;
            const fkType    = this._fkColType(refTable, newCtx) ?? 'number';
            const alterSql  =
                `alter table ${newObj} add constraint ${cName}\n` +
                `    foreign key (${fkCol})\n` +
                `    references ${refPrefix}${refTable};\n`;

            // Add FK column
            stmts.push(mk('add_column', tbl,
                `alter table ${newObj} add (${fkCol} ${fkType});\n`, fkCol));

            // Add FK constraint with idempotency wrapper
            stmts.push(mk('add_fk', tbl,
                db23 ? alterSql : this._wrapConstraint(alterSql)));
        }

        return stmts;
    }

    private _fkColType(refTable: string, ctx: DdlContext): string | null {
        const ref = ctx.find(refTable);
        if (ref == null) return null;
        const pkName = ref.getExplicitPkName();
        if (pkName == null || pkName.includes(',')) return null;
        const pkChild = ref.findChild(pkName);
        if (pkChild != null)
            return toOracleType(pkChild._inferTypeFull(), ctx.semantics(), isDb23(ctx));
        return ref.getPkType() || null;
    }

    // ── Diff indexes ──────────────────────────────────────────────────────────

    private _diffIndexes(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, newCtx:  DdlContext,
    ): DiffStatement[] {
        const stmts:  DiffStatement[] = [];
        const tbl     = newNode.parseName();
        const newObj  = newCtx.objPrefix() + tbl;
        const oldObj  = oldCtx.objPrefix() + tbl;
        const db23    = isDb23(newCtx);
        const oldMap  = this._colMap(oldNode);
        const newMap  = this._colMap(newNode);

        for (const [colName, newCol] of newMap) {
            const oldCol  = oldMap.get(colName);
            if (oldCol == null) continue; // new — indexes handled with add_column

            const hadIdx  = oldCol.isOption('idx') || oldCol.isOption('index');
            const hasIdx  = newCol.isOption('idx') || newCol.isOption('index');
            const hadUnq  = oldCol.isOption('unique') || oldCol.isOption('uk');
            const hasUnq  = newCol.isOption('unique') || newCol.isOption('uk');

            if (!hadIdx && hasIdx) {
                const name = `${newObj}_${colName}_i`;
                const sql  = `create index ${name} on ${newObj} (${colName});\n`;
                stmts.push(mk('add_index', tbl,
                    db23 ? `create index if not exists ${name} on ${newObj} (${colName});\n`
                         : this._wrapIndex(sql)));
            }
            if (hadIdx && !hasIdx) {
                const name = `${oldObj}_${colName}_i`;
                stmts.push(mk('drop_index', tbl, `drop index ${name};\n`));
            }

            if (!hadUnq && hasUnq) {
                const name = `${newObj}_${colName}_unq`;
                const sql  = `create unique index ${name} on ${newObj} (${colName});\n`;
                stmts.push(mk('add_index', tbl,
                    db23 ? `create unique index if not exists ${name} on ${newObj} (${colName});\n`
                         : this._wrapIndex(sql)));
            }
            if (hadUnq && !hasUnq) {
                const name = `${oldObj}_${colName}_unq`;
                stmts.push(mk('drop_index', tbl, `drop index ${name};\n`));
            }
        }

        // ── Table-level composite unique (/unique col1,col2 or /uk col1,col2) ──
        const getTableUk = (node: IDdlNode): string | null => {
            const raw = node.isOption('unique') ? node.getOptionValue('unique')
                      : node.isOption('uk')     ? node.getOptionValue('uk')
                      : null;
            if (!raw || typeof raw !== 'string') return null;
            // Normalize: trim whitespace around each column name
            return raw.split(',').map(c => c.trim()).join(',');
        };

        const oldUk = getTableUk(oldNode);
        const newUk = getTableUk(newNode);

        if (oldUk !== newUk) {
            if (oldUk != null) {
                stmts.push(mk('drop_index', tbl,
                    `alter table ${oldObj} drop constraint ${oldObj}${DEFAULT_NAMING.uk};\n`));
            }
            if (newUk != null) {
                const cols     = newUk.split(',').join(', ');
                const ukName   = `${newObj}${DEFAULT_NAMING.uk}`;
                const alterSql = `alter table ${newObj} add constraint ${ukName} unique (${cols});\n`;
                stmts.push(mk('add_index', tbl,
                    db23 ? alterSql : this._wrapConstraint(alterSql)));
            }
        }

        return stmts;
    }

    // ── Diff views ────────────────────────────────────────────────────────────

    private _diffViews(
        oldViews: Map<string, IDdlNode>,
        newViews: Map<string, IDdlNode>,
        newCtx:   DdlContext,
    ): DiffStatement[] {
        const stmts: DiffStatement[] = [];
        const db23  = isDb23(newCtx);
        const ifx   = db23 ? 'if exists ' : '';

        // Dropped views
        for (const [name] of oldViews) {
            if (!newViews.has(name)) {
                const objName = newCtx.objPrefix() + name;
                stmts.push(mk('drop_view', name, `drop view ${ifx}${objName};\n`));
            }
        }

        // New or changed views — topological sort on inter-view deps
        const toProcess: IDdlNode[] = [];
        for (const [name, newView] of newViews) {
            const oldView = oldViews.get(name);
            if (oldView == null || oldView.trimmedContent() !== newView.trimmedContent())
                toProcess.push(newView);
        }

        for (const view of this._topoSortViews(toProcess, newViews)) {
            const gen = new OracleDDLGenerator(newCtx);
            const sql = gen.generateView(view as DdlNode);
            if (sql) stmts.push(mk('create_view', view.parseName(), sql));
        }

        return stmts;
    }

    private _topoSortViews(views: IDdlNode[], allNew: Map<string, IDdlNode>): IDdlNode[] {
        // Simple dependency sort: check if any view's content references another view's name
        const names   = new Set(views.map(v => v.parseName()));
        const visited = new Set<string>();
        const result:  IDdlNode[] = [];

        const visit = (view: IDdlNode) => {
            const name = view.parseName();
            if (visited.has(name)) return;
            visited.add(name);
            const content = view.trimmedContent().toLowerCase();
            for (const other of allNew.values()) {
                const oname = other.parseName();
                if (oname === name) continue;
                if (names.has(oname) && content.includes(oname))
                    visit(other);
            }
            result.push(view);
        };

        for (const view of views) visit(view);
        return result;
    }

    // ── Diff packages ─────────────────────────────────────────────────────────

    private _diffPackages(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, newCtx:  DdlContext,
        colsChanged: boolean,
    ): { stmts: DiffStatement[]; warns: DiffWarning[] } {
        const stmts:   DiffStatement[] = [];
        const warns:   DiffWarning[]   = [];
        const tbl      = newNode.parseName();
        const db23     = isDb23(newCtx);
        const ifx      = db23 ? 'if exists ' : '';
        const oldKind  = this._apiKind(oldNode, oldCtx);
        const newKind  = this._apiKind(newNode, newCtx);

        // Permanently dropped packages → DROP (only case DROP PACKAGE is emitted in diff)
        for (const pkg of this._droppedPkgs(oldNode, newNode, oldCtx, newCtx, oldKind, newKind))
            stmts.push(mk('drop_package', tbl, `drop package ${ifx}${pkg};\n`));

        // Packages that need CREATE OR REPLACE
        const auditChanged = oldNode.isOption('auditlog') !== newNode.isOption('auditlog');
        const apexChanged  =
            (oldNode.isOption('apex') || oldNode.isOption('apx')) !==
            (newNode.isOption('apex') || newNode.isOption('apx'));
        const needsReplace = colsChanged || oldKind !== newKind || auditChanged || apexChanged;

        if (newKind === 'layered' && needsReplace) {
            const plsql = new OraclePlsqlBuilder(newCtx, DEFAULT_NAMING);
            stmts.push(...this._splitPkgBlocks(plsql.generateLayeredTAPI(newNode), tbl));
        } else if (newKind === 'simple' && needsReplace) {
            const plsql = new OraclePlsqlBuilder(newCtx, DEFAULT_NAMING);
            stmts.push(...this._splitPkgBlocks(plsql.generateTAPI(newNode), tbl));
        }

        return { stmts, warns };
    }

    private _apiKind(node: IDdlNode, ctx: DdlContext): 'layered' | 'simple' | 'none' {
        const hasDir = node.trimmedContent().toLowerCase().includes('/api');
        if (!hasDir) return 'none';
        // If /api is present on the node, it's layered (any tier argument)
        const apiVal = node.getOptionValue('api')?.trim().toLowerCase() ?? '';
        const isLayeredTier = ['full+hks', 'full', 'service+hks', 'service',
                               'lookup+hks', 'lookup', 'layered',
                               '3h', '3', '2h', '2', '1h', '1'].includes(apiVal);
        if (isLayeredTier) return 'layered';
        // Legacy: global api:layered setting
        if (ctx.optionEQvalue('api', 'layered')) return 'layered';
        // /api yes (simple flat TAPI)
        if (ctx.optionEQvalue('api', 'yes') || apiVal === 'yes') return 'simple';
        return 'none';
    }

    private _layeredPkgNames(node: IDdlNode, ctx: DdlContext): string[] {
        const obj     = ctx.objPrefix() + node.parseName();
        const raw     = (node.getOptionValue('api') ?? 'full+hks').trim().toLowerCase();
        const tier    = raw === 'layered' || raw === '3h' ? 'full+hks'
                      : raw === '3'                       ? 'full'
                      : raw === '2h'                      ? 'service+hks'
                      : raw === '2'                       ? 'service'
                      : raw === '1h'                      ? 'lookup+hks'
                      : raw === '1'                       ? 'lookup'
                      : raw;
        const hasDal  = ['full', 'full+hks'].includes(tier);
        const hasHks  = tier.endsWith('+hks');
        const hasSvc  = ['service', 'service+hks', 'full', 'full+hks'].includes(tier);
        const ifc     = String(ctx.getOptionValue('ifc') ?? 'app').toLowerCase();
        const genApp  = ifc === 'app' || ifc === 'apex' || ifc === 'both' || ifc === '';
        const genRst  = ifc === 'rest' || ifc === 'both';

        const pkgs: string[] = [];
        if (hasDal) pkgs.push(`${obj}_dal`);
        if (hasHks) pkgs.push(`${obj}_hks`);
        if (hasSvc) pkgs.push(`${obj}_svc`);
        if (genApp)  pkgs.push(`${obj}_app`);
        if (genRst)  pkgs.push(`${obj}_rst`);
        if (node.isOption('auditlog') && hasSvc) pkgs.push(`${obj}_aud`);
        return pkgs;
    }

    private _droppedPkgs(
        oldNode: IDdlNode, newNode: IDdlNode,
        oldCtx:  DdlContext, _newCtx: DdlContext,
        oldKind: string, newKind: string,
    ): string[] {
        const dropped: string[] = [];
        const oldObj  = oldCtx.objPrefix() + oldNode.parseName();

        if (oldKind === 'layered' && (newKind === 'simple' || newKind === 'none')) {
            dropped.push(`${oldObj}_dal`, `${oldObj}_hks`, `${oldObj}_svc`, `${oldObj}_app`);
            if (oldNode.isOption('auditlog')) dropped.push(`${oldObj}_aud`);
        } else if (oldKind === 'simple' && (newKind === 'layered' || newKind === 'none')) {
            dropped.push(`${oldObj}_api`);
        } else if (oldKind === 'layered' && newKind === 'layered') {
            if (oldNode.isOption('auditlog') && !newNode.isOption('auditlog'))
                dropped.push(`${oldObj}_aud`);
        }

        return dropped;
    }

    // ── Package block splitting ───────────────────────────────────────────────

    private _splitPkgBlocks(tapiSql: string, tbl: string): DiffStatement[] {
        const result: DiffStatement[] = [];
        const parts   = tapiSql.split(/\n\/\s*(?:\n|$)/);
        for (let part of parts) {
            part = part.trim();
            if (!part) continue;
            result.push(mk('create_package', tbl, part + '\n/\n'));
        }
        return result;
    }

    // ── Idempotency wrappers ──────────────────────────────────────────────────

    private _wrapIndex(createSql: string): string {
        const sql = createSql.trim().replace(/;\s*$/, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
        return (
            `begin\n` +
            `    execute immediate '${sql.replace(/'/g, "''")}';\n` +
            `exception\n` +
            `    when others then\n` +
            `        if sqlcode = -955 then null;\n` +
            `        else raise;\n` +
            `        end if;\n` +
            `end;\n/\n`
        );
    }

    private _wrapConstraint(alterSql: string): string {
        const sql = alterSql.trim().replace(/;\s*$/, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
        return (
            `begin\n` +
            `    execute immediate '${sql.replace(/'/g, "''")}';\n` +
            `exception\n` +
            `    when others then\n` +
            `        if sqlcode = -2261 then null;\n` +
            `        else raise;\n` +
            `        end if;\n` +
            `end;\n/\n`
        );
    }

    // ── Statement ordering ────────────────────────────────────────────────────

    private _order(stmts: DiffStatement[]): DiffStatement[] {
        return [...stmts].sort((a, b) => this._step(a) - this._step(b));
    }

    private _step(s: DiffStatement): number {
        if (s.kind === 'create_package')
            return s.sql.toLowerCase().includes('package body ') ? 17 : 15;
        return STEP[s.kind] ?? 99;
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    private _summary(
        stmts:     DiffStatement[],
        warns:     DiffWarning[],
        oldTables: Map<string, IDdlNode>,
        newTables: Map<string, IDdlNode>,
    ): DiffSummary {
        let tablesAdded   = 0;
        let tablesDropped = 0;
        let tablesModified = 0;

        for (const [n] of newTables) if (!oldTables.has(n)) tablesAdded++;
        for (const [n] of oldTables) if (!newTables.has(n)) tablesDropped++;
        // Modified = exists in both and has at least one non-trivial statement
        const modSet = new Set<string>();
        for (const s of stmts) {
            if (s.kind !== 'create_table' && s.kind !== 'drop_table' &&
                s.kind !== 'create_package' && s.kind !== 'drop_package' &&
                s.kind !== 'create_view'  && s.kind !== 'drop_view' &&
                s.kind !== 'add_sequence' && s.kind !== 'drop_sequence') {
                if (oldTables.has(s.table) && newTables.has(s.table))
                    modSet.add(s.table);
            }
        }
        tablesModified = modSet.size;

        return {
            tablesAdded,
            tablesDropped,
            tablesModified,
            statementsTotal:                 stmts.length,
            statementsRequiringIntervention: stmts.filter(s => s.requiresManualIntervention).length,
            warningsTotal:                   warns.length,
        };
    }

    // ── Preamble ──────────────────────────────────────────────────────────────

    private _buildPreamble(stmts: DiffStatement[], warns: DiffWarning[]): string {
        const rmiStmts      = stmts.filter(s => s.requiresManualIntervention);
        const renameWarns   = warns.filter(w => w.level === 'INFO');
        const droppedTables = stmts.filter(s => s.kind === 'drop_table').map(s => s.table);
        const droppedCols   = warns.filter(w => w.message.startsWith('column dropped'));

        let out = '';
        out += '-- ============================================================\n';
        out += '-- EspreSQL Migration Script\n';
        out += `-- Generated : ${new Date().toISOString()}\n`;
        out += '-- ============================================================\n';

        if (rmiStmts.length > 0) {
            out += '--\n';
            out += `-- ⚠ MANUAL STEPS REQUIRED (statementsRequiringIntervention = ${rmiStmts.length})\n`;
            out += '--\n';
            for (const s of rmiStmts) {
                out += `--   [${s.table}${s.column ? '.' + s.column : ''}]\n`;
                const lines = s.sql.split('\n').filter(l => l.startsWith('-- '));
                for (const l of lines) out += `--   ${l.replace(/^--\s*/, '')}\n`;
                out += '--\n';
            }
        }

        if (renameWarns.length > 0) {
            out += '--\n';
            out += '-- ⚠ POSSIBLE RENAMES — verify before applying\n';
            out += '--\n';
            for (const w of renameWarns)
                out += `--   [${w.table}] ${w.message}\n`;
            out += '--\n';
        }

        if (droppedTables.length > 0 || droppedCols.length > 0) {
            out += '--\n';
            out += '-- ⚠ DESTRUCTIVE OPERATIONS\n';
            if (droppedTables.length > 0)
                out += `--   Tables dropped  : ${droppedTables.length}\n`;
            if (droppedCols.length > 0)
                out += `--   Columns dropped : ${droppedCols.length}\n`;
            out += '--   Apply during a maintenance window.\n';
            out += '--\n';
        }

        out += '-- ============================================================\n';
        out += '\n';
        return out;
    }
}
