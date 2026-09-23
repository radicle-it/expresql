# Opzione A — DBML Exporter: documento di implementazione

**Versione**: 1.0  
**Stato**: Draft  
**Dipende da**: `doc/dbml/00-dbml.md` (analisi di fattibilità)

---

## Indice

1. [Obiettivo e scope](#1-obiettivo-e-scope)
2. [Architettura della soluzione](#2-architettura-della-soluzione)
3. [Modulo 1 — `DBMLGenerator`](#3-modulo-1--dbmlgenerator)
4. [Modulo 2 — Integrazione in `ddl-core.ts`](#4-modulo-2--integrazione-in-ddl-corets)
5. [Modulo 3 — CLI](#5-modulo-3--cli)
6. [Modulo 4 — Web UI: pannello DBML](#6-modulo-4--web-ui-pannello-dbml)
7. [Modulo 5 — Test](#7-modulo-5--test)
8. [Proposta opzionale: ERD viewer alternativo con Mermaid](#8-proposta-opzionale-erd-viewer-alternativo-con-mermaid)
9. [Piano di implementazione a sprint](#9-piano-di-implementazione-a-sprint)
10. [Decisioni di design già risolte](#10-decisioni-di-design-già-risolte)

---

## 1. Obiettivo e scope

Implementare un **DBML Exporter** per ExpreSQL:

- **Nuovo file** `src/dbml/generator.ts` — classe `DBMLGenerator` che traversa il forest di `DdlNode` e produce una stringa DBML valida (formato `dbmlv2`)
- **Nuovo metodo** `toDBML()` esposto da `expresql` class e dalla funzione `toDDL()` equivalente
- **Flag CLI** `--dbml` su `bin/index.js`
- **Nuovo pannello** nella web UI: tab "DBML" con "Copy" e "Open in dbdiagram.io"
- **Opzionale** (sezione 8): rimpiazzo o affiancamento dell'ERD viewer AntV X6 con Mermaid

**Non in scope**:

- Import DBML → ESQL (Opzione B)
- Round-trip fidelity (ESQL → DBML → ESQL)
- Dipendenza runtime su `@dbml/core` (nessuna)

---

## 2. Architettura della soluzione

### Mappa dei moduli

```
expresql/
├── src/
│   ├── dbml/
│   │   ├── generator.ts        ← NUOVO: DBMLGenerator
│   │   ├── type-map.ts         ← NUOVO: mapping SemanticType → DBML type string
│   │   └── column-expander.ts  ← NUOVO: espansione auditcols/versioned/trans/tenant
│   ├── ddl-core.ts             ← MODIFICA: aggiunge toDBML() e getDBML()
│   └── ddl.ts                  ← nessuna modifica (re-export da ddl-core)
├── bin/
│   └── index.js                ← MODIFICA: aggiunge --dbml flag
├── web/
│   ├── dbml-panel.js           ← NUOVO: logica pannello DBML nella web UI
│   └── app.js                  ← MODIFICA: integra dbml-panel
├── index_all.html              ← MODIFICA: aggiunge tab DBML
└── test/
    └── dbml/
        ├── core.test.ts        ← NUOVO: test costrutti base
        ├── relations.test.ts   ← NUOVO: test FK e Ref
        ├── metadata.test.ts    ← NUOVO: test custom properties
        └── fixtures/           ← NUOVO: .esql → .dbml snapshot
```

### Flusso dati

```
ESQL string
    ↓ lexer + parser (esistente)
DdlNode forest
    ↓ DBMLGenerator.generate(ctx)
DBMLModel (struttura intermedia)
    ↓ DBMLEmitter.emit(model)
DBML string
```

La separazione `DBMLGenerator` / `DBMLModel` / `DBMLEmitter` è intenzionale: permette
di testare la mappatura semantica indipendentemente dalla formattazione del testo.

---

## 3. Modulo 1 — `DBMLGenerator`

### 3.1 Struttura dei file

#### `src/dbml/type-map.ts`

```typescript
import type { SemanticType } from '../compiler/types.js';

/**
 * Converte SemanticType → stringa tipo DBML.
 * I tipi con spazi vengono avvolti in doppi apici come richiede la grammatica DBML v2.
 */
export function toDbmlType(st: SemanticType): string {
    switch (st.base) {
        case 'varchar':   return st.varcharLen ? `varchar(${st.varcharLen})` : 'varchar';
        case 'number':    return st.numericSpec ? `decimal${st.numericSpec}` : 'decimal';
        case 'integer':   return 'int';
        case 'date':      return 'date';
        case 'timestamp': return 'timestamp';
        case 'tswtz':     return '"timestamp with time zone"';
        case 'tswltz':    return '"timestamp with local time zone"';
        case 'boolean':   return 'boolean';
        case 'clob':      return 'text';
        case 'blob':      return 'blob';
        case 'json':      return 'json';
        case 'vector':    return st.vectorSpec ? `"vector${st.vectorSpec}"` : '"vector(*,*,*)"';
        case 'geometry':  return '"SDO_GEOMETRY"';
        default:
            // Domain types e tipi sconosciuti: passthrough.
            // Se il nome contiene spazi va avvolto in doppi apici.
            return st.base.includes(' ') ? `"${st.base}"` : st.base;
    }
}
```

#### `src/dbml/column-expander.ts`

```typescript
import type { IDdlNode } from '../compiler/types.js';

export interface ExpandedColumn {
    name:     string;
    type:     string;
    notNull:  boolean;
    pk?:      boolean;
    default?: string;
    note?:    string;
    esqlMeta?: Record<string, string>; // extra [esql_*: "..."] properties
}

/**
 * Espande le colonne virtuali generate da direttive tabella.
 * Queste colonne non appaiono esplicitamente nell'ESQL ma vengono generate nel DDL.
 * In DBML devono essere colonne reali.
 */
export function expandAuditCols(): ExpandedColumn[] {
    return [
        { name: 'created',    type: 'date',        notNull: true,  note: 'audit: row creation date' },
        { name: 'created_by', type: 'varchar(128)', notNull: true,  note: 'audit: row creation user' },
        { name: 'updated',    type: 'date',        notNull: false, note: 'audit: last update date' },
        { name: 'updated_by', type: 'varchar(128)', notNull: false, note: 'audit: last update user' },
    ];
}

export function expandRowVersion(): ExpandedColumn {
    return { name: 'row_version', type: 'int', notNull: true, default: '1', note: 'optimistic locking counter' };
}

export function expandRowKey(): ExpandedColumn {
    return { name: 'row_key', type: 'varchar(36)', notNull: true, note: 'ORDS row key' };
}

export function expandVersionedCols(): ExpandedColumn[] {
    return [
        { name: 'valid_from', type: 'date',    notNull: true,  note: 'SCD2: validity start' },
        { name: 'valid_to',   type: 'date',    notNull: false, note: 'SCD2: validity end (null = current)' },
        { name: 'is_current', type: 'boolean', notNull: true,  default: 'true', note: 'SCD2: current flag' },
    ];
}

export function expandTenantId(schema?: string): ExpandedColumn {
    return {
        name:    'tenant_id',
        type:    'int',
        notNull: true,
        note:    'multi-tenant discriminator',
        esqlMeta: { esql_tenant: 'yes' },
    };
}

/**
 * Torna true se la tabella deve avere tenant_id iniettato automaticamente.
 * Logica: il setting globale tenantid è true E la tabella non ha /notenantid.
 */
export function needsTenantId(node: IDdlNode, globalTenantId: boolean): boolean {
    return globalTenantId && !node.isOption('notenantid');
}
```

#### `src/dbml/generator.ts` — struttura completa

```typescript
import type { DdlContext, IDdlNode, ErdOutput } from '../compiler/types.js';
import { toDbmlType } from './type-map.js';
import {
    expandAuditCols, expandRowVersion, expandRowKey,
    expandVersionedCols, expandTenantId, needsTenantId,
    type ExpandedColumn,
} from './column-expander.js';

// ── Modello intermedio ────────────────────────────────────────────────────────

interface DbmlEnum {
    name:   string;
    schema: string | null;
    values: string[];
}

interface DbmlColumnDef {
    name:     string;
    type:     string;
    pk?:      boolean;
    unique?:  boolean;
    notNull?: boolean;
    increment?: boolean;
    default?: string;
    checkExpr?: string;    // backtick expression
    note?:    string;
    ref?:     { table: string; col: string; operator: '<' | '>' | '-' | '<>' };
    meta?:    Record<string, string>; // [esql_*: "value"]
}

interface DbmlIndex {
    cols:    string[];
    pk?:     boolean;
    unique?: boolean;
    name?:   string;
}

interface DbmlTable {
    name:    string;
    schema:  string | null;
    note?:   string;
    columns: DbmlColumnDef[];
    indexes: DbmlIndex[];
    meta?:   Record<string, string>;
}

interface DbmlRef {
    fromTable: string;
    fromCols:  string[];
    toTable:   string;
    toCols:    string[];
    operator:  '<' | '>' | '-' | '<>';
    delete?:   'cascade' | 'set null' | 'restrict' | 'no action';
    mandatory: boolean;        // true → lato obbligatorio (nn)
    name?:     string;         // constraint name per disambiguazione
}

interface DbmlModel {
    project?:     { name: string; databaseType: string; meta?: Record<string, string> };
    enums:        DbmlEnum[];
    tables:       DbmlTable[];
    refs:         DbmlRef[];
    tableGroups:  { name: string; tables: string[] }[];
}

// ── DBMLGenerator ─────────────────────────────────────────────────────────────

/**
 * Genera DBML (dbmlv2) a partire dal forest di DdlNode prodotto dal compilatore
 * ExpreSQL. Non estende BaseGenerator perché il DBML non è un target DDL:
 * non implementa colType(), generateDDL(), generateDrop() né generateFullDDL().
 *
 * Il generatore lavora in due passate:
 *   1. buildModel()  → struttura DbmlModel (mappatura semantica, testabile isolatamente)
 *   2. emitDBML()    → stringa DBML (formattazione, non ha logica semantica)
 */
export class DBMLGenerator {
    private ctx:           DdlContext;
    private schema:        string | null;
    private prefix:        string;
    private pkMode:        string;    // 'guid' | 'identity' | 'seq' | 'none'
    private globalTenant:  boolean;
    private enumRegistry:  Map<string, string>; // colQualName → enum DBML name

    constructor(ctx: DdlContext) {
        this.ctx          = ctx;
        this.schema       = ctx.options?.schema ?? null;
        this.prefix       = ctx.options?.prefix ?? '';
        this.pkMode       = ctx.options?.pk ?? 'guid';
        this.globalTenant = Boolean(ctx.options?.tenantid);
        this.enumRegistry = new Map();
    }

    // ── Entrypoint pubblico ───────────────────────────────────────────────────

    generate(): string {
        const model = this.buildModel();
        return this.emitDBML(model);
    }

    // ── Passata 1: costruzione del modello ────────────────────────────────────

    private buildModel(): DbmlModel {
        const enums:       DbmlEnum[]                       = [];
        const tables:      DbmlTable[]                      = [];
        const refs:        DbmlRef[]                        = [];
        const groupMap:    Map<string, string[]>            = new Map();

        // Pre-scan: raccoglie tutti i nomi tabella per la risoluzione FK
        const tableNodeMap = new Map<string, IDdlNode>();
        for (const root of this.ctx.forest) {
            this.collectTables(root, tableNodeMap);
        }

        // Scan principale: elabora ogni tabella
        for (const root of this.ctx.forest) {
            this.processNode(root, { enums, tables, refs, groupMap, tableNodeMap });
        }

        // Tabelle _trans generate da /trans: elaborate in processNode come nodi separati
        // (già nel forest dopo l'analisi semantica, se presenti)

        // TableGroups
        const tableGroups = [...groupMap.entries()].map(([name, tbls]) => ({ name, tables: tbls }));

        // Project block
        const db = (this.ctx.options?.db as string) ?? 'Oracle';
        const project = {
            name:         this.ctx.options?.schema ?? 'schema',
            databaseType: db.toLowerCase().startsWith('23') ? 'Oracle 23ai' : 'Oracle',
            meta: this.buildProjectMeta(),
        };

        return { project, enums, tables, refs, tableGroups };
    }

    private collectTables(node: IDdlNode, map: Map<string, IDdlNode>): void {
        if (node.children.length > 0) {
            map.set(node.parseName(), node);
            for (const child of node.children) {
                if (child.children.length > 0) this.collectTables(child, map);
            }
        }
    }

    private processNode(
        node: IDdlNode,
        acc: { enums: DbmlEnum[]; tables: DbmlTable[]; refs: DbmlRef[]; groupMap: Map<string, string[]>; tableNodeMap: Map<string, IDdlNode> },
    ): void {
        // Solo nodi con figli sono tabelle
        if (!node.children.length) return;

        const rawName  = node.parseName();
        const fullName = this.prefix ? `${this.prefix}_${rawName}` : rawName;

        const columns: DbmlColumnDef[] = [];
        const indexes:  DbmlIndex[]    = [];

        // ── PK colonna (auto-generata) ────────────────────────────────────────
        const pkColName = `${fullName}_id`;
        const pkColDef  = this.buildPkColumn(pkColName);
        columns.push(pkColDef);

        // ── tenant_id se richiesto ────────────────────────────────────────────
        if (needsTenantId(node, this.globalTenant)) {
            const tc = expandTenantId(this.schema ?? undefined);
            columns.push(this.expandedToColDef(tc));
            // FK tenant → tenants table
            acc.refs.push({
                fromTable: fullName,
                fromCols:  ['tenant_id'],
                toTable:   `${this.prefix ? this.prefix + '_' : ''}tenants`,
                toCols:    ['tenants_id'],
                operator:  '>',
                mandatory: true,
            });
        }

        // ── Colonne figlie ────────────────────────────────────────────────────
        for (const child of node.children) {
            if (child.children.length > 0) {
                // Figlio = sotto-tabella → relazione parent-child
                this.processNode(child, acc);

                // FK dal figlio → questa tabella
                const childName   = this.prefix ? `${this.prefix}_${child.parseName()}` : child.parseName();
                const fkColInChild = `${fullName}_id`;
                const mandatory    = child.isOption('nn') !== false; // default mandatory
                acc.refs.push({
                    fromTable: childName,
                    fromCols:  [fkColInChild],
                    toTable:   fullName,
                    toCols:    [pkColName],
                    operator:  '>',
                    mandatory,
                    delete:    child.isOption('cascade') ? 'cascade'
                             : child.isOption('setnull') ? 'set null'
                             : undefined,
                    name:      `${childName}_${fkColInChild}_fk`,
                });
            } else {
                // Figlio = colonna
                const colDef = this.buildColumnDef(child, fullName, acc.enums);
                if (colDef) columns.push(colDef);

                // FK esplicita (/fk)
                const fkTarget = child.refId?.();
                if (fkTarget) {
                    const targetFull  = this.prefix ? `${this.prefix}_${fkTarget}` : fkTarget;
                    const fkColName   = `${targetFull}_id`;
                    acc.refs.push({
                        fromTable: fullName,
                        fromCols:  [fkColName],
                        toTable:   targetFull,
                        toCols:    [`${targetFull}_id`],
                        operator:  '>',
                        mandatory: child.isOption('nn'),
                        delete:    child.isOption('cascade') ? 'cascade'
                                 : child.isOption('setnull') ? 'set null'
                                 : undefined,
                        name:      `${fullName}_${fkColName}_fk`,
                    });
                }

                // Star schema: > table (many-to-one)
                if (child.isMany2One?.()) {
                    const target     = child.parseName();
                    const targetFull = this.prefix ? `${this.prefix}_${target}` : target;
                    const fkColName  = `${targetFull}_id`;
                    acc.refs.push({
                        fromTable: fullName,
                        fromCols:  [fkColName],
                        toTable:   targetFull,
                        toCols:    [`${targetFull}_id`],
                        operator:  '>',
                        mandatory: child.isOption('nn'),
                        name:      `${fullName}_${fkColName}_star_fk`,
                    });
                }

                // Indice colonna (/idx)
                if (child.isOption('idx')) {
                    indexes.push({ cols: [child.parseName()] });
                }
                // Unique colonna (/unique) — già in colDef.unique ma anche come indice nominato
            }
        }

        // ── Direttive tabella → colonne espanse ───────────────────────────────

        if (node.isOption('auditcols')) {
            for (const ec of expandAuditCols()) columns.push(this.expandedToColDef(ec));
        }
        if (node.isOption('rowversion')) {
            columns.push(this.expandedToColDef(expandRowVersion()));
        }
        if (node.isOption('rowkey')) {
            columns.push(this.expandedToColDef(expandRowKey()));
        }
        if (node.isOption('versioned')) {
            for (const ec of expandVersionedCols()) columns.push(this.expandedToColDef(ec));
        }

        // ── Indici tabella-level (/pk, /unique) ───────────────────────────────
        // (derivati dalla semantica del nodo; gestiti dal base generator con getTablePk() etc.)
        // TODO: recuperare composite PK/unique dalla node API e aggiungerli a indexes

        // ── Metadati custom tabella ───────────────────────────────────────────
        const tableMeta = this.buildTableMeta(node);

        // ── Note tabella ──────────────────────────────────────────────────────
        const note = node.comment
            ?? node.getAnnotationPairs?.()?.find(p => p.label?.toLowerCase() === 'description')?.value;

        // ── TableGroup ────────────────────────────────────────────────────────
        const tgroup = node.getAnnotationPairs?.()?.find(p => p.label?.toUpperCase() === 'TGROUP')?.value;
        if (tgroup) {
            if (!acc.groupMap.has(tgroup)) acc.groupMap.set(tgroup, []);
            acc.groupMap.get(tgroup)!.push(fullName);
        }

        // ── Commit tabella nel modello ────────────────────────────────────────
        acc.tables.push({
            name:    fullName,
            schema:  this.schema,
            note:    note ?? undefined,
            columns,
            indexes,
            meta:    Object.keys(tableMeta).length ? tableMeta : undefined,
        });
    }

    // ── Costruzione colonna singola ───────────────────────────────────────────

    private buildPkColumn(pkColName: string): DbmlColumnDef {
        switch (this.pkMode) {
            case 'identity':
                return { name: pkColName, type: 'int', pk: true, increment: true };
            case 'seq':
                return { name: pkColName, type: 'int', pk: true,
                         default: `\`${this.prefix ? this.prefix.toUpperCase() : 'APP'}_SEQ.NEXTVAL\`` };
            case 'guid':
            default:
                return { name: pkColName, type: 'varchar(36)', pk: true,
                         default: '`sys_guid()`', note: 'GUID primary key' };
        }
    }

    private buildColumnDef(
        node:    IDdlNode,
        parent:  string,
        enums:   DbmlEnum[],
    ): DbmlColumnDef | null {
        const name = node.parseName();
        const st   = node._inferTypeFull();
        let   type = toDbmlType(st);

        // ── Check → Enum automatico ───────────────────────────────────────────
        const checkVals = node.getValues?.('check');
        let checkExpr: string | undefined;
        if (checkVals) {
            const vals = checkVals.split(',').map((v: string) => v.trim());
            const enumName = this.tryRegisterEnum(parent, name, vals, enums);
            if (enumName) {
                type = enumName; // usa il tipo enum DBML come tipo colonna
            } else {
                // Inline check expression
                checkExpr = `${name} in (${vals.map((v: string) => `'${v}'`).join(', ')})`;
            }
        }

        // ── Between → check expression ────────────────────────────────────────
        const between = node.getBetweenClause?.();
        if (between && !checkExpr) checkExpr = `${name} ${between}`;

        // ── Check arbitrario (/check (expr)) ─────────────────────────────────
        // (se il valore di check inizia con "(" è già un'espressione)
        if (checkVals?.startsWith('(') && !checkExpr) checkExpr = checkVals.slice(1, -1);

        // ── Default ───────────────────────────────────────────────────────────
        const defVal = node.getDefaultValue?.();
        let defaultStr: string | undefined;
        if (defVal !== null && defVal !== undefined) {
            // Espressioni SQL → backtick; literal stringhe → apici singoli; numeri → nudi
            if (/^[0-9.]+$/.test(defVal)) defaultStr = defVal;
            else if (/^'.*'$/.test(defVal)) defaultStr = defVal;
            else defaultStr = `\`${defVal}\``;
        }

        // ── Note colonna ──────────────────────────────────────────────────────
        const note = node.comment
            ?? node.getAnnotationPairs?.()?.find(
                (p: { label: string; value: string }) => p.label?.toLowerCase() === 'description'
            )?.value;

        // ── Meta colonna ──────────────────────────────────────────────────────
        const meta: Record<string, string> = {};
        if (node.isOption('upper'))  meta['esql_case']  = 'upper';
        if (node.isOption('lower'))  meta['esql_case']  = 'lower';
        if (node.isOption('domain')) meta['esql_domain'] = node.parseName(); // TODO: recuperare nome domain

        return {
            name,
            type,
            pk:        node.isOption('pk')     ?? false,
            unique:    node.isOption('unique')  ?? false,
            notNull:   node.isOption('nn')      ?? false,
            default:   defaultStr,
            checkExpr,
            note:      note ?? undefined,
            meta:      Object.keys(meta).length ? meta : undefined,
        };
    }

    private expandedToColDef(ec: ExpandedColumn): DbmlColumnDef {
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
     * Prova a registrare un Enum DBML per una lista /check.
     * Ritorna il nome dell'enum se registrato, null se i valori non sono idonei.
     *
     * Criteri di idoneità:
     * - ≤ 10 valori
     * - Tutti i valori sono identificatori validi (solo [a-zA-Z0-9_])
     * - Non già registrato con un nome diverso (colisione cross-tabella)
     */
    private tryRegisterEnum(
        tableName: string,
        colName:   string,
        vals:      string[],
        enums:     DbmlEnum[],
    ): string | null {
        if (vals.length > 10) return null;
        if (vals.some(v => !/^[a-zA-Z0-9_]+$/.test(v))) return null;

        const enumName = `${tableName}_${colName}_enum`;
        const key      = vals.slice().sort().join(',');

        // Riuso enum identico già visto (deduplicazione cross-tabella)
        for (const e of enums) {
            if (e.values.slice().sort().join(',') === key) {
                this.enumRegistry.set(`${tableName}.${colName}`, e.name);
                return e.name;
            }
        }

        enums.push({ name: enumName, schema: this.schema, values: vals });
        this.enumRegistry.set(`${tableName}.${colName}`, enumName);
        return enumName;
    }

    // ── Metadati custom ───────────────────────────────────────────────────────

    private buildTableMeta(node: IDdlNode): Record<string, string> {
        const m: Record<string, string> = {};
        const opt = (k: string, v = 'yes') => { if (node.isOption(k)) m[`esql_${k}`] = v; };

        opt('audit');
        opt('auditlog');
        opt('rest',       'yes'); // /rest → [esql_ords: "yes"]
        opt('immutable');
        opt('soda');
        opt('flashback');
        opt('compress');
        opt('history');
        opt('aggregate');
        opt('notenantid');

        if (node.isOption('auditcols'))  m['esql_auditcols']  = 'yes';
        if (node.isOption('rowversion')) m['esql_rowversion'] = 'yes';
        if (node.isOption('rowkey'))     m['esql_rowkey']     = 'yes';
        if (node.isOption('versioned'))  m['esql_versioned']  = 'yes';
        if (node.isOption('lockmode'))   m['esql_lockmode']   = node.getOptionValue?.('lockmode') ?? 'wait:10';

        // TAPI tier
        const apiTier = node.getOptionValue?.('api');
        if (apiTier) m['esql_api'] = apiTier;

        // businesskey
        const bk = node.getOptionValue?.('businesskey');
        if (bk) m['esql_businesskey'] = bk;

        // Oracle annotations passthrough
        for (const { label, value } of node.getAnnotationPairs?.() ?? []) {
            if (label && value && label.toUpperCase() !== 'DESCRIPTION' && label.toUpperCase() !== 'TGROUP') {
                m[`esql_ann_${label.toLowerCase()}`] = value;
            }
        }

        return m;
    }

    private buildProjectMeta(): Record<string, string> {
        const m: Record<string, string> = {};
        const opts = this.ctx.options ?? {};
        if (opts.prefix) m['esql_prefix'] = String(opts.prefix);
        if (opts.api)    m['esql_api']    = String(opts.api);
        if (opts.ifc)    m['esql_ifc']    = String(opts.ifc);
        if (opts.tenantid) m['esql_tenantid'] = 'yes';
        return m;
    }

    // ── Passata 2: emissione DBML ─────────────────────────────────────────────

    private emitDBML(model: DbmlModel): string {
        const lines: string[] = [];

        // Project block
        if (model.project) {
            lines.push(`Project ${model.project.name} {`);
            lines.push(`  database_type: '${model.project.databaseType}'`);
            if (model.project.meta) {
                for (const [k, v] of Object.entries(model.project.meta)) {
                    lines.push(`  ${k}: '${v}'`);
                }
            }
            lines.push('}');
            lines.push('');
        }

        // Enum blocks
        for (const en of model.enums) {
            const qual = en.schema ? `${en.schema}.${en.name}` : en.name;
            lines.push(`enum ${qual} {`);
            for (const v of en.values) lines.push(`  ${v}`);
            lines.push('}');
            lines.push('');
        }

        // Table blocks
        for (const tbl of model.tables) {
            const qual = tbl.schema ? `${tbl.schema}.${tbl.name}` : tbl.name;
            lines.push(`Table ${qual} {`);
            if (tbl.note) lines.push(`  Note: '${tbl.note.replace(/'/g, "\\'")}'`);

            for (const col of tbl.columns) {
                lines.push(this.emitColumn(col));
            }

            // indexes block
            if (tbl.indexes.length) {
                lines.push('');
                lines.push('  indexes {');
                for (const idx of tbl.indexes) {
                    const colList = idx.cols.length > 1 ? `(${idx.cols.join(', ')})` : idx.cols[0];
                    const flags: string[] = [];
                    if (idx.pk)     flags.push('pk');
                    if (idx.unique) flags.push('unique');
                    if (idx.name)   flags.push(`name: '${idx.name}'`);
                    const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
                    lines.push(`    ${colList}${flagStr}`);
                }
                lines.push('  }');
            }

            // Table-level metadata
            if (tbl.meta) {
                lines.push('');
                lines.push('  [');
                for (const [k, v] of Object.entries(tbl.meta)) {
                    lines.push(`    ${k}: "${v}"`);
                }
                lines.push('  ]');
            }

            lines.push('}');
            lines.push('');
        }

        // Ref blocks
        for (const ref of model.refs) {
            lines.push(this.emitRef(ref));
        }
        if (model.refs.length) lines.push('');

        // TableGroup blocks
        for (const tg of model.tableGroups) {
            lines.push(`TableGroup ${tg.name} {`);
            for (const tbl of tg.tables) lines.push(`  ${tbl}`);
            lines.push('}');
            lines.push('');
        }

        return lines.join('\n');
    }

    private emitColumn(col: DbmlColumnDef): string {
        const settings: string[] = [];

        if (col.pk)        settings.push('pk');
        if (col.increment) settings.push('increment');
        if (col.unique)    settings.push('unique');
        if (col.notNull)   settings.push('not null');
        if (col.default !== undefined) settings.push(`default: ${col.default}`);
        if (col.checkExpr) settings.push(`check: \`${col.checkExpr}\``);
        if (col.note)      settings.push(`note: '${col.note.replace(/'/g, "\\'")}'`);
        if (col.ref)       settings.push(`ref: ${col.ref.operator} ${col.ref.table}.${col.ref.col}`);
        if (col.meta) {
            for (const [k, v] of Object.entries(col.meta)) {
                settings.push(`${k}: "${v}"`);
            }
        }

        const settingsStr = settings.length ? ` [${settings.join(', ')}]` : '';
        return `  ${col.name} ${col.type}${settingsStr}`;
    }

    private emitRef(ref: DbmlRef): string {
        const deleteClause = ref.delete ? ` [delete: ${ref.delete}]` : '';
        const fromCols = ref.fromCols.length > 1 ? `(${ref.fromCols.join(', ')})` : ref.fromCols[0];
        const toCols   = ref.toCols.length   > 1 ? `(${ref.toCols.join(', ')})  ` : ref.toCols[0];
        const fromQual = this.schema ? `${this.schema}.${ref.fromTable}` : ref.fromTable;
        const toQual   = this.schema ? `${this.schema}.${ref.toTable}`   : ref.toTable;
        const nameStr  = ref.name ? ` ${ref.name}` : '';
        return `Ref${nameStr}: ${fromQual}.${fromCols} ${ref.operator} ${toQual}.${toCols}${deleteClause}`;
    }
}
```

### 3.2 Note implementative chiave

**FK resolution — gestione dei casi edge**

Il campo `refId()` su un nodo colonna ritorna il nome raw della tabella target (senza prefix).
Il generator deve applicare il prefix sia al nome della tabella corrente sia al target.
Se lo schema è impostato, le Ref devono essere qualificate (`schema.table.col`).

I nomi dei constraint FK (`${childName}_${fkColName}_fk`) garantiscono unicità nei diagrammi
con molte relazioni. DBML li mostra come tooltip su dbdiagram.io.

**Enum deduplication**

La deduplicazione cross-tabella (stessa lista di valori → stesso enum) riduce il file DBML.
Un enum `status_enum` con `['A','I','P']` definito sia su `orders.status` che su `invoices.status`
viene emesso una sola volta e referenziato da entrambe le colonne come tipo.

**Schema qualifica nelle Ref**

Quando `schema` è impostato nelle settings ESQL, tutti i nomi tabella nel DBML vengono
qualificati come `schema.table`. Le Ref devono usare la stessa qualifica altrimenti dbdiagram.io
non risolve i link. Il generator applica la qualifica in modo coerente in `emitColumn()` e `emitRef()`.

**`/trans` — tabella di traduzione**

I nodi con colonne `/trans` generano nel DDL Oracle una tabella separata `table_name_trans` con
una FK verso la tabella padre. In DBML questa tabella deve essere emessa come tabella reale.
Il modo più robusto è delegare al `processNode()` la creazione del nodo virtuale `_trans`,
oppure post-processare il forest dopo la generazione DDL. La seconda opzione è preferibile
perché riutilizza la logica esistente (evita di duplicare la logica di espansione `/trans`).

---

## 4. Modulo 2 — Integrazione in `ddl-core.ts`

### 4.1 Nuovo metodo `getDBML()` sulla classe `expresql`

```typescript
// In src/ddl-core.ts, aggiunto alla classe `expresql`

import { DBMLGenerator } from './dbml/generator.js';

export class expresql implements DdlContext {
    // ... codice esistente ...

    /**
     * Genera DBML (dbmlv2) dall'input ESQL corrente.
     * Equivalente a toDBML(input, options).
     */
    getDBML(): string {
        if (!this._dbml) {
            this._dbml = new DBMLGenerator(this).generate();
        }
        return this._dbml;
    }

    // Cache (analoga a _ddl e _erd già esistenti)
    private _dbml: string | null = null;
}
```

### 4.2 Funzione standalone `toDBML()`

```typescript
// Aggiunta in src/ddl-core.ts dopo le funzioni esistenti

export function toDBML(input: string, options?: unknown): string {
    return new expresql(input, options).getDBML();
}
```

### 4.3 Assegnazione allo slot statico

```typescript
// In fondo a src/ddl-core.ts, accanto agli altri assign

declare static toDBML: typeof toDBML;
// ...
expresql.toDBML = toDBML;
```

### 4.4 Export da `src/ddl.ts`

Nessuna modifica: `src/ddl.ts` fa `export * from './ddl-core.js'` — `toDBML` viene
ri-esportato automaticamente.

### 4.5 Export da `dist/expresql.js`

Il `toDBML` sarà disponibile direttamente dopo il build:

```javascript
import { toDBML } from '../dist/expresql.js';
```

Questo è il punto di import che usa la web UI.

---

## 5. Modulo 3 — CLI

### 5.1 `bin/index.js` — aggiunta flag `--dbml`

```javascript
// bin/index.js (Node.js, CJS o ESM secondo il package.json corrente)

import { toDDL, toDBML } from '../dist/expresql.js';
import { readFileSync, writeFileSync } from 'fs';
import { basename, extname, join, dirname } from 'path';

const args     = process.argv.slice(2);
const dbmlFlag = args.includes('--dbml');
const file     = args.find(a => !a.startsWith('--'));

if (!file) {
    console.error('Usage: expresql [--dbml] <file.esql>');
    process.exit(1);
}

const src = readFileSync(file, 'utf8');

if (dbmlFlag) {
    const dbml     = toDBML(src);
    const outFile  = join(dirname(file), basename(file, extname(file)) + '.dbml');
    writeFileSync(outFile, dbml, 'utf8');
    console.log(`DBML written to ${outFile} (${dbml.split('\n').length} lines)`);
} else {
    const ddl = toDDL(src);
    process.stdout.write(ddl + '\n');
}
```

**Comportamento**:
- `node bin/index.js schema.esql` → comportamento esistente (DDL su stdout)
- `node bin/index.js --dbml schema.esql` → scrive `schema.dbml` nella stessa directory
- Se il file ha più di 5000 righe DBML, stampa anche un warning

---

## 6. Modulo 4 — Web UI: pannello DBML

### 6.1 Modifica `index_all.html` — nuovo tab

```html
<!-- Aggiungere accanto al tab "ERD" esistente -->
<button class="tab-btn" data-tab="dbml" title="DBML Schema">DBML</button>

<!-- Aggiungere dopo il pane ERD esistente -->
<div class="tab-pane" data-tab="dbml">
    <div class="dbml-toolbar">
        <button id="btn-copy-dbml" class="btn-sm">⧉ Copy DBML</button>
        <button id="btn-open-dbdiagram" class="btn-sm btn-accent">↗ dbdiagram.io</button>
    </div>
    <div id="dbml-output" class="dbml-output"></div>
</div>
```

### 6.2 Stili CSS da aggiungere in `app.css`

```css
.dbml-toolbar {
    display:         flex;
    gap:             8px;
    padding:         6px 12px;
    background:      var(--toolbar-bg, #1e1e1e);
    border-bottom:   1px solid var(--border, #333);
    align-items:     center;
}

.dbml-output {
    font-family:  'IBM Plex Mono', 'Cascadia Code', monospace;
    font-size:    12px;
    line-height:  1.6;
    padding:      16px;
    white-space:  pre;
    overflow:     auto;
    height:       calc(100% - 40px);
    color:        var(--code-text, #d4d4d4);
    background:   var(--code-bg, #1e1e1e);
    tab-size:     2;
}
```

### 6.3 Nuovo file `web/dbml-panel.js`

```javascript
import { toDBML } from '../dist/expresql.js';
import { state }  from './state.js';

// ── State ─────────────────────────────────────────────────────────────────────

let lastDbmlText = '';
let dbmlStale    = true;

// ── Rendering ─────────────────────────────────────────────────────────────────

/**
 * Genera e mostra il DBML nell'apposito pannello.
 * Chiamata quando si switcha al tab "dbml" o quando l'input cambia
 * mentre il tab è visibile.
 */
export function renderDbml() {
    if (!dbmlStale) return;
    const inputEl  = document.getElementById('input');
    const outputEl = document.getElementById('dbml-output');
    if (!inputEl || !outputEl) return;

    try {
        lastDbmlText      = toDBML(inputEl.value);
        outputEl.textContent = lastDbmlText;
        dbmlStale            = false;
    } catch (e) {
        outputEl.textContent = `// DBML generation error:\n// ${e?.message ?? e}`;
        lastDbmlText         = '';
    }
}

/**
 * Chiamata da update() ogni volta che l'input cambia.
 * Non genera il DBML se il tab non è visibile (lazy rendering).
 */
export function markDbmlStale() {
    dbmlStale = true;
    if (state.activeTab === 'dbml') renderDbml();
}

// ── Bottoni ───────────────────────────────────────────────────────────────────

export function initDbmlPanel() {
    const btnCopy = document.getElementById('btn-copy-dbml');
    const btnOpen = document.getElementById('btn-open-dbdiagram');

    btnCopy?.addEventListener('click', () => {
        if (!lastDbmlText) return;
        navigator.clipboard.writeText(lastDbmlText).then(() => {
            const prev = btnCopy.textContent;
            btnCopy.textContent = '✓ Copied';
            setTimeout(() => { btnCopy.textContent = prev; }, 1400);
        });
    });

    btnOpen?.addEventListener('click', () => {
        if (!lastDbmlText) return;
        // dbdiagram.io accetta DBML come URL fragment encodato in base64
        // oppure tramite la clipboard (l'utente deve incollare manualmente)
        // Per ora: copia nella clipboard e apre dbdiagram.io
        navigator.clipboard.writeText(lastDbmlText).then(() => {
            window.open('https://dbdiagram.io/d', '_blank');
            // Mostra un tooltip "Paste your DBML in dbdiagram.io"
            btnOpen.textContent = '✓ Copied — paste in dbdiagram.io';
            setTimeout(() => { btnOpen.textContent = '↗ dbdiagram.io'; }, 3000);
        });
    });
}
```

> **Nota**: dbdiagram.io non espone un'API pubblica per pre-caricare il DBML via URL.
> L'approccio più comune è copiare nella clipboard e aprire la pagina perché l'utente incolli.
> In alternativa si può usare `dbdocs.io` che ha una CLI (`dbdocs build schema.dbml`) integrabile
> nel pipeline CI — questo è il caso d'uso preferito per l'automazione.

### 6.4 Modifica `web/app.js` — integrazione del pannello

```javascript
// Aggiungere all'inizio degli import
import { initDbmlPanel, markDbmlStale, renderDbml } from './dbml-panel.js';

// In update() — dopo la generazione DDL/diff — aggiungere:
markDbmlStale();

// Nello switch tab (già esistente), aggiungere:
if (tab === 'dbml') renderDbml();

// In Bootstrap — aggiungere:
initDbmlPanel();
```

### 6.5 Comportamento lazy (stale flag)

Il DBML viene generato **solo quando il tab è visibile**. Questo è coerente con il comportamento
del tab DDL (`ddlStale`) e del tab ERD (debounce + render on tab switch). La generazione DBML
è più costosa della sintassi highlight ma meno costosa del render X6 — può essere sincrona
senza debounce per schemi < 200 tabelle.

---

## 7. Modulo 5 — Test

### 7.1 Struttura dei test

```
test/dbml/
├── fixtures/
│   ├── basic.esql          ← schema minimo (1 tabella, colonne base)
│   ├── basic.dbml          ← output DBML atteso
│   ├── relations.esql      ← parent-child, /fk, star schema
│   ├── relations.dbml
│   ├── constraints.esql    ← /check, /between, /unique, /idx
│   ├── constraints.dbml
│   ├── directives.esql     ← /auditcols, /rowversion, /rest, /api full+hks
│   ├── directives.dbml
│   ├── enums.esql          ← /check val1,val2 → enum automatico
│   ├── enums.dbml
│   ├── schema.esql         ← schema + prefix setting
│   └── schema.dbml
├── core.test.ts
├── relations.test.ts
├── constraints.test.ts
└── metadata.test.ts
```

### 7.2 Pattern di test

```typescript
// test/dbml/core.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { toDBML } from '../../src/ddl-core.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const fix = (name: string) =>
    readFileSync(join(__dirname, 'fixtures', name), 'utf8').trim();

describe('DBMLGenerator — core', () => {

    it('emette Project block con database_type Oracle', () => {
        const dbml = toDBML('employees\n  name /nn');
        expect(dbml).toContain("Project");
        expect(dbml).toContain("database_type: 'Oracle'");
    });

    it('mappa varchar correttamente', () => {
        const dbml = toDBML('employees\n  email vc128 /nn');
        expect(dbml).toContain('email varchar(128) [not null]');
    });

    it('mappa PK guid con default sys_guid()', () => {
        const dbml = toDBML('# settings = { pk: guid }\nemployees\n  name');
        expect(dbml).toMatch(/employees_id\s+varchar\(36\)\s+\[pk.*default.*sys_guid/);
    });

    it('mappa PK identity con increment', () => {
        const dbml = toDBML('# settings = { pk: identity }\nemployees\n  name');
        expect(dbml).toContain('employees_id int [pk, increment]');
    });

    it('mappa timestamp with time zone con doppi apici', () => {
        const dbml = toDBML('events\n  created_at tswtz /nn');
        expect(dbml).toContain('"timestamp with time zone"');
    });

    it('emette snapshot per fixture basic', () => {
        const esql = fix('basic.esql');
        const got  = toDBML(esql).trim();
        const want = fix('basic.dbml');
        expect(got).toBe(want);
    });
});

describe('DBMLGenerator — enum extraction', () => {

    it('estrae enum da /check list breve', () => {
        const dbml = toDBML('orders\n  status /check A,I,P');
        expect(dbml).toContain('enum orders_status_enum');
        expect(dbml).toContain('  A\n  I\n  P');
        expect(dbml).toContain('status orders_status_enum');
    });

    it('usa inline check per lista > 10 valori', () => {
        const many = Array.from({ length: 11 }, (_, i) => `V${i}`).join(',');
        const dbml = toDBML(`orders\n  kind /check ${many}`);
        expect(dbml).not.toContain('enum orders_kind_enum');
        expect(dbml).toContain('check:');
    });

    it('usa inline check per valori con spazi', () => {
        const dbml = toDBML('orders\n  status /check "in progress",done');
        expect(dbml).not.toContain('enum');
        expect(dbml).toContain('check:');
    });

    it('deduplica enum identici cross-tabella', () => {
        const esql = 'orders\n  status /check A,I,P\ninvoices\n  status /check A,I,P';
        const dbml = toDBML(esql);
        const count = (dbml.match(/enum.*_status_enum/g) || []).length;
        expect(count).toBe(1); // emesso una sola volta
    });
});

describe('DBMLGenerator — FK e Ref', () => {

    it('emette Ref per parent-child implicito', () => {
        const dbml = toDBML('departments\n  employees\n    salary num');
        expect(dbml).toContain('Ref:');
        expect(dbml).toContain('employees.departments_id > departments.departments_id');
    });

    it('emette delete: cascade per /cascade', () => {
        const dbml = toDBML('departments\n  employees /cascade\n    salary num');
        expect(dbml).toContain('[delete: cascade]');
    });

    it('emette Ref per /fk esplicito', () => {
        const dbml = toDBML('orders\n  customer /fk customers /nn');
        expect(dbml).toContain('orders.customers_id > customers.customers_id');
    });
});

describe('DBMLGenerator — direttive tabella', () => {

    it('espande /auditcols come colonne DBML', () => {
        const dbml = toDBML('employees\n  name /nn\n  /auditcols');
        expect(dbml).toContain('created date [not null');
        expect(dbml).toContain('created_by varchar(128)');
        expect(dbml).toContain('updated date');
        expect(dbml).toContain('updated_by varchar(128)');
    });

    it('serializza /rest come [esql_ords: "yes"]', () => {
        const dbml = toDBML('products\n  name /nn\n  /rest');
        expect(dbml).toContain('esql_ords: "yes"');
    });

    it('serializza /api tier come [esql_api: "full+hks"]', () => {
        const dbml = toDBML('products\n  name /nn\n  /api full+hks');
        expect(dbml).toContain('esql_api: "full+hks"');
    });

    it('espande /versioned come colonne valid_from/valid_to/is_current', () => {
        const dbml = toDBML('products\n  name /nn\n  /versioned');
        expect(dbml).toContain('valid_from date [not null');
        expect(dbml).toContain('valid_to date');
        expect(dbml).toContain('is_current boolean');
    });
});
```

### 7.3 Snapshot fixtures — format

Le fixture `.dbml` sono file di testo prodotti dalla prima esecuzione dei test (`--update-snapshots`)
e poi committati come golden output. Il Vitest snapshot runner può gestirle automaticamente con
la funzione `toMatchFileSnapshot()` disponibile in `@vitest/snapshot`.

In alternativa, usare `expect(got).toBe(fix('basic.dbml'))` con file gestiti manualmente —
approccio già in uso nei test di regressione ESQL esistenti.

---

## 8. Proposta opzionale: ERD viewer alternativo con Mermaid

### 8.1 Motivazione

L'ERD viewer attuale (AntV X6 + `web/erd.js`) è funzionale ma ha alcune limitazioni:

| Aspetto | X6 attuale | Mermaid (proposto) |
|---|---|---|
| Auto-layout | BFS manuale (livelli) | dagre interno (ottimizzato) |
| Cardinalità | Solo archi → / --- | `\|\|--o{`, `}o--o{`, `\|\|--\|\|` |
| Interattività | Drag, collapse, zoom | Solo zoom (SVG/PNG export) |
| Dipendenza | `dist/antv-x6.min.js` (~1.2MB) | `mermaid.min.js` (~2.5MB) |
| Theme support | Sì (custom palette) | Sì (built-in dark/light/forest) |
| Manutenzione | Codice custom in `erd.js` | Zero codice custom |
| Export | No | SVG / PNG nativi |

Mermaid ha un auto-layout significativamente migliore di X6 per schemi con 20+ tabelle e molte
FK cross-dominio. Il trade-off principale è la perdita dell'interattività (drag nodi, collapse).

### 8.2 Strategia: modalità dual-view nel tab ERD

**Non si sostituisce X6** (già funzionante e ben integrato). Si aggiunge un **toggle**
nel tab ERD per switchare tra due modalità:

- **Interattiva** (X6, default): drag, collapse, posizioni salvate — esistente
- **Diagramma** (Mermaid): auto-layout dagre, cardinalità, SVG export — nuovo

Il toggle viene salvato in localStorage come preferenza utente.

### 8.3 Fonte dati per Mermaid — due opzioni

**Opzione M-A** (preferita): usare direttamente `ErdOutput` (già disponibile) e convertirlo
in sintassi `erDiagram` Mermaid. Vantaggio: nessuna dipendenza su `toDBML()`, sempre sincronizzato.

**Opzione M-B**: usare il DBML in output → `@dbml/core` Parser → nodi/archi Mermaid.
Svantaggio: richiede `@dbml/core` nel browser bundle (pesante).

Si adotta **Opzione M-A**.

### 8.4 Conversione `ErdOutput` → `erDiagram` Mermaid

```javascript
// web/mermaid-erd.js — nuovo file

/**
 * Converte il formato ErdOutput di ExpreSQL in testo Mermaid erDiagram.
 *
 * Cardinalità derivata:
 *   - link.mandatory === true   → ||--o{ (one-to-many, mandatory parent)
 *   - link.mandatory === false  → |o--o{ (one-to-many, optional)
 *   - link.source === link.target → ricorsivo, gestito come ||--o{
 */
export function erdToMermaid(data) {
    const lines = ['erDiagram'];

    // Tabelle con colonne
    for (const item of data.items) {
        lines.push(`  ${sanitize(item.name)} {`);
        for (const col of item.columns ?? []) {
            const typeStr = (col.datatype || 'varchar').replace(/[^a-zA-Z0-9_()]/g, '_');
            lines.push(`    ${typeStr} ${sanitize(col.name)}`);
        }
        lines.push('  }');
    }

    // Relazioni
    for (const link of data.links) {
        const lhs = sanitize(link.source);
        const rhs = sanitize(link.target);
        const card = link.mandatory !== false ? '||--o{' : '|o--o{';
        lines.push(`  ${lhs} ${card} ${rhs} : ""`);
    }

    return lines.join('\n');
}

function sanitize(name) {
    // Mermaid erDiagram non accetta punti o spazi nei nomi
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
```

### 8.5 Integrazione nel tab ERD

```html
<!-- Aggiungere nel tab ERD, sopra l'erd-container -->
<div class="erd-mode-toggle">
    <button id="btn-erd-interactive" class="erd-mode-btn qs-active" data-mode="x6">
        Interactive
    </button>
    <button id="btn-erd-diagram" class="erd-mode-btn" data-mode="mermaid">
        Diagram
    </button>
</div>

<!-- Container Mermaid (nascosto per default) -->
<div id="mermaid-container" class="erd-alt-container" style="display:none">
    <div class="mermaid" id="mermaid-diagram"></div>
    <button id="btn-export-svg" class="btn-sm" style="position:absolute;top:8px;right:8px">
        ↓ SVG
    </button>
</div>
```

```javascript
// web/mermaid-view.js — nuovo file

import { toERD }          from '../dist/expresql.js';
import { erdToMermaid }   from './mermaid-erd.js';

let mermaidInitialized = false;

async function ensureMermaid() {
    if (mermaidInitialized) return;
    // Mermaid caricato come script nella <head> di index_all.html
    // (self-hosted da web/lib/mermaid.min.js)
    await window.mermaid.initialize({
        startOnLoad: false,
        theme:       currentTheme() === 'dark' ? 'dark' : 'default',
        er:          { diagramPadding: 30, layoutDirection: 'LR' },
    });
    mermaidInitialized = true;
}

export async function renderMermaidErd(src) {
    await ensureMermaid();
    const erd  = toERD(src);
    const code = erdToMermaid(erd);
    const el   = document.getElementById('mermaid-diagram');
    if (!el) return;

    const { svg } = await window.mermaid.render('mermaid-svg', code);
    el.innerHTML  = svg;
}

export function initModeToggle({ getSrc }) {
    const btnX6      = document.getElementById('btn-erd-interactive');
    const btnMermaid = document.getElementById('btn-erd-diagram');
    const x6Cont     = document.getElementById('erd-container');
    const mmCont     = document.getElementById('mermaid-container');

    function setMode(mode) {
        const isX6 = mode === 'x6';
        x6Cont.style.display  = isX6 ? '' : 'none';
        mmCont.style.display  = isX6 ? 'none' : '';
        btnX6.classList.toggle('qs-active', isX6);
        btnMermaid.classList.toggle('qs-active', !isX6);
        try { localStorage.setItem('esql-erd-mode', mode); } catch (_) {}

        if (!isX6) renderMermaidErd(getSrc());
    }

    const savedMode = localStorage.getItem('esql-erd-mode') ?? 'x6';
    setMode(savedMode);

    btnX6?.addEventListener('click',      () => setMode('x6'));
    btnMermaid?.addEventListener('click', () => setMode('mermaid'));

    // Export SVG
    document.getElementById('btn-export-svg')?.addEventListener('click', () => {
        const svgEl = document.querySelector('#mermaid-container svg');
        if (!svgEl) return;
        const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
        const url  = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: 'schema.svg' }).click();
        URL.revokeObjectURL(url);
    });
}
```

### 8.6 Aggiunta di Mermaid all'HTML

```html
<!-- In index_all.html, prima della chiusura </head> -->
<!-- Mermaid self-hosted (non CDN — compatibile con CSP ExpreSQL) -->
<script src="web/lib/mermaid.min.js"></script>
```

Scaricare `mermaid.min.js` (v10+) e salvarlo in `web/lib/`. Dimensione ~2.5MB minificato,
~700KB gzippato. Da aggiungere a `.gitignore` o al processo di build se si usa il minifier.

### 8.7 Confronto finale X6 vs Mermaid

| Scenario | Raccomandazione |
|---|---|
| Schema piccolo (< 20 tabelle) | X6 (interattivo, posizioni salvate) |
| Schema grande (> 50 tabelle) | Mermaid (dagre layout, overview) |
| Presentazione / export | Mermaid (SVG) |
| Navigazione quotidiana | X6 (collapse, posizioni) |
| APEX embedded | Mermaid (static, no X6 dependency) |

**Raccomandazione finale**: implementare il dual-view con toggle. Effort stimato: 3–4 giorni
aggiuntivi rispetto al solo pannello DBML. Il valore è alto perché Mermaid risolve il problema
reale del layout per schemi complessi, senza rimuovere l'interattività X6 già funzionante.

---

## 9. Piano di implementazione a sprint

### Sprint 1 — Core generator (4–5 giorni)

Obiettivo: `toDBML()` funzionante su schemi semplici (nessuna direttiva avanzata).

1. Creare `src/dbml/type-map.ts` con tutti i mapping SemanticType → DBML type
2. Creare `src/dbml/column-expander.ts` con le funzioni di espansione
3. Creare `src/dbml/generator.ts` — `DBMLGenerator`:
   - `buildModel()` per tabelle e colonne (no FK, no direttive)
   - `emitDBML()` completo (Project, Tables, Columns, Indexes)
4. Aggiungere `getDBML()` e `toDBML()` in `ddl-core.ts`
5. Test unitari: `core.test.ts` con fixture `basic` e `schema`

**Criterio di completamento**: `toDBML('employees\n  name /nn\n  salary num')` produce
DBML valido parsabile da `@dbml/parse` (da verificare manualmente su dbdiagram.io).

### Sprint 2 — FK e Ref (3–4 giorni)

Obiettivo: parent-child, `/fk`, star schema, cascade/setnull.

1. Implementare la FK resolution in `processNode()`
2. Aggiungere `emitRef()` con operatori e ON DELETE
3. Gestire composite FK (tenant_id + col) per schemi multi-tenant
4. Test: `relations.test.ts` con fixture `relations`
5. Verifica manuale su dbdiagram.io (link FK risolti nel diagramma)

### Sprint 3 — Direttive e metadati (3–4 giorni)

Obiettivo: tutte le direttive tabella, enum automatici, TableGroup.

1. Implementare `tryRegisterEnum()` con deduplication
2. Implementare `buildTableMeta()` con tutti i `[esql_*]` custom properties
3. Implementare le espansioni di colonne: auditcols, rowversion, rowkey, versioned
4. Gestire `/trans` → tabella `_trans` separata
5. Implementare TableGroup da `{TGROUP 'name'}`
6. Test: `constraints.test.ts`, `metadata.test.ts` con fixture `directives` ed `enums`

### Sprint 4 — Web UI e CLI (2–3 giorni)

Obiettivo: integrazione completa nell'UI e nella CLI.

1. Modifica `index_all.html` — tab DBML
2. Creare `web/dbml-panel.js` con lazy rendering e pulsanti
3. Modifica `web/app.js` — integrazione pannello
4. Aggiunta CSS in `app.css`
5. Modifica `bin/index.js` — flag `--dbml`
6. Build + smoke test manuale

### Sprint 5 (opzionale) — Mermaid dual-view (3–4 giorni)

1. Download e hosting di `mermaid.min.js` in `web/lib/`
2. Creare `web/mermaid-erd.js` — conversione `ErdOutput` → `erDiagram`
3. Creare `web/mermaid-view.js` — init, render, toggle, export SVG
4. Modifiche HTML (toggle button, mermaid-container)
5. Test manuale con schema reale (Radicle Data Model)

---

## 10. Decisioni di design già risolte

Le seguenti questioni aperte del documento `00-dbml.md` sono qui risolte definitivamente:

| Questione | Decisione |
|---|---|
| Soglia enum automatici | ≤ 10 valori, tutti `[a-zA-Z0-9_]` — vedi `tryRegisterEnum()` |
| `/insert N` → records DBML | **Non implementato in Sprint 1–4.** Aggiungibile in Sprint 3 se si desidera: max 10 righe con seed fisso via `resetSeed()` |
| View join / duality view | Skip totale. Una nota nel Project block elenca le view omesse |
| Nome file output CLI | `<input-basename>.dbml` nella stessa directory del file sorgente |
| Schema default DBML | Se `schema` non è impostato nelle settings ESQL, nomi non qualificati (no `public`) |
| Dipendenza `@dbml/parse` | Solo dev dependency per i test; **non** nel bundle di produzione |
| Tabella `_trans` | Emessa come tabella DBML separata con FK verso il padre |
| Tenant context packages | Omessi completamente (non sono tabelle) |
| Ref naming | Emesso il nome constraint Oracle come `name` su ogni Ref (garantisce unicità) |
| Multi-schema con prefix | `Table schema.prefix_tablename` — qualifica sempre con schema se impostato |
