# Opzione B — DBML Importer: documento di implementazione

**Versione**: 1.0  
**Stato**: Draft  
**Dipende da**: `doc/dbml/00-dbml.md` (analisi di fattibilità), `doc/dbml/01-option-a-implementation.md` (Opzione A)

---

## Indice

1. [Obiettivo e scope](#1-obiettivo-e-scope)
2. [Architettura della soluzione](#2-architettura-della-soluzione)
3. [Modulo 1 — Parser DBML e dipendenza `@dbml/core`](#3-modulo-1--parser-dbml-e-dipendenza-dbmlcore)
4. [Modulo 2 — `DBMLImporter` (DBML → ESQL)](#4-modulo-2--dbmlimporter-dbml--esql)
5. [Modulo 3 — Integrazione in `ddl-core.ts`](#5-modulo-3--integrazione-in-ddl-corets)
6. [Modulo 4 — CLI](#6-modulo-4--cli)
7. [Modulo 5 — Web UI: Import nel pannello DBML](#7-modulo-5--web-ui-import-nel-pannello-dbml)
8. [Modulo 6 — Test](#8-modulo-6--test)
9. [Gap analysis: cosa va perso nella conversione](#9-gap-analysis-cosa-va-perso-nella-conversione)
10. [Piano di implementazione a sprint](#10-piano-di-implementazione-a-sprint)
11. [Decisioni di design già risolte](#11-decisioni-di-design-già-risolte)

---

## 1. Obiettivo e scope

Implementare un **DBML Importer** per ExpreSQL:

- **Nuovo file** `src/dbml/importer.ts` — classe `DBMLImporter` che legge un documento DBML (dbmlv2) e produce una stringa **ESQL** equivalente, percorribile dal compilatore esistente per generare DDL Oracle
- **Nuovo metodo** `fromDBML(dbmlStr, options?)` esposto da `expresql` class e come funzione standalone
- **Flag CLI** `--from-dbml` su `bin/index.js` (con sotto-opzione `--to-esql` per vedere lo shorthand)
- **Bottone "Import"** nella web UI: pannello DBML con textarea per incollare DBML o caricare un file `.dbml`

**Approccio scelto: DBML → ESQL → pipeline esistente**

Esistono due strategie architetturali per implementare il path DBML → DDL:

| Strategia | Descrizione | Pro | Contro |
|---|---|---|---|
| **A — DBML → ESQL** (raccomandata) | Convertire il modello DBML in una stringa ESQL; poi la pipeline esistente (lexer → parser → generator) produce il DDL | Semplice; ESQL è leggibile dall'utente; round-trip visibile; zero duplicazione di logica | Perdita di alcune funzionalità DBML senza equivalente ESQL |
| **B — DBML → DdlNode** | Costruire mock `DdlNode` direttamente dal modello DBML, bypassando il lexer/parser | Più rapido nella generazione finale | Richiede implementare o mockare l'interfaccia `IDdlNode` intera; fragile a ogni refactoring del compiler |

Si adotta la **Strategia A**. Il beneficio principale è che l'ESQL intermedio è leggibile e mostrabile all'utente come anteprima prima della generazione DDL — valore aggiunto per la UX. L'output ESQL è anche un risultato di valore autonomo (l'utente può incollarlo nell'editor e continuare il lavoro).

**In scope**:
- Tables, colonne, tipi base → ESQL shorthand
- Refs DBML → gerarchia implicita o direttive `/fk`
- Enums DBML → `/check val1,val2` (se i valori sono ≤ 10 e identificatori validi)
- Indexes DBML → `/idx`, `/unique`, composite `/pk`
- Custom properties `[esql_*]` → direttive ESQL corrispondenti (round-trip)
- Schema/prefix → settings block ESQL
- TableGroup → `{TGROUP 'name'}` annotations
- CLI e Web UI

**Non in scope**:
- DBML `records { }` → `/insert N` (i dati di esempio non sono portabili in modo generico)
- DBML `Note` (sticky), `DiagramView`, `Dep` — costrutti canvas-only senza equivalente ESQL
- `TablePartial` — il compilatore ESQL non ha mixin; va espanso manualmente
- Funzionalità TAPI avanzate: l'import non può inferire il tier da un DBML senza custom properties
- DBML multi-file (`use * from './other.dbml'`) — solo file singolo

---

## 2. Architettura della soluzione

### Mappa dei moduli

```
expresql/
├── src/
│   ├── dbml/
│   │   ├── generator.ts          ← esistente (Opzione A)
│   │   ├── type-map.ts           ← esistente
│   │   ├── column-expander.ts    ← esistente
│   │   ├── importer.ts           ← NUOVO: DBMLImporter
│   │   └── dbml-type-reverse.ts  ← NUOVO: DBML type → ESQL shorthand
│   └── ddl-core.ts               ← MODIFICA: aggiunge fromDBML()
├── bin/
│   └── index.js                  ← MODIFICA: aggiunge --from-dbml flag
├── web/
│   └── dbml-panel.js             ← MODIFICA: aggiunge Import UI
└── test/
    └── dbml/
        ├── importer.test.ts      ← NUOVO
        └── fixtures/
            ├── round-trip.dbml   ← round-trip test: ESQL→DBML→ESQL
            ├── round-trip.esql   ← atteso dopo re-import
            ├── external.dbml     ← DBML proveniente da strumenti esterni
            └── external.esql     ← ESQL atteso
```

### Flusso dati

```
DBML string
    ↓ @dbml/parse  (dipendenza npm)
DBMLDatabase  (modello interno @dbml/core)
    ↓ DBMLImporter.toESQL(model)
ESQL string
    ↓ lexer + parser + OracleDDLGenerator  (pipeline esistente)
Oracle DDL string
```

La separazione in due passi (DBML → ESQL, poi ESQL → DDL) permette:
1. Mostrare l'ESQL intermedio nell'UI come anteprima editabile
2. Mantenere un unico punto di generazione DDL (nessuna duplicazione)
3. Testare il `DBMLImporter` indipendentemente dal compilatore

### Dipendenza: `@dbml/parse` vs `@dbml/core`

`@dbml/core` (~2MB minificato) include parser, exporter SQL per quattro dialetti, connector, e molto altro. Per il solo parsing DBML in ExpreSQL basta il sotto-pacchetto `@dbml/parse` (~800KB), che è esportato separatamente da `@dbml/core` v10+.

```bash
npm install --save-dev @dbml/core        # per test
npm install --save @dbml/parse           # runtime, solo parsing
```

**Nota**: il bundle Vite DDL (`dist/expresql.js`) non deve includere `@dbml/core` o `@dbml/parse` — questi vengono usati solo lato server (CLI) o caricati dinamicamente nella web UI. Questo è possibile perché `fromDBML()` non è esposta nel bundle produzione (vedi sezione 5.4).

---

## 3. Modulo 1 — Parser DBML e dipendenza `@dbml/core`

### 3.1 Struttura del modello `@dbml/parse`

Il parser di `@dbml/core` produce un oggetto `Database` con la seguente struttura rilevante:

```typescript
// Da @dbml/core (semplificato per i campi che usiamo)
interface DBMLDatabase {
    schemas: DBMLSchema[];
}

interface DBMLSchema {
    name:   string;            // 'public' di default
    tables: DBMLTable[];
    enums:  DBMLEnum[];
    refs:   DBMLRef[];
    tableGroups: DBMLTableGroup[];
}

interface DBMLTable {
    name:    string;
    alias?:  string;
    note?:   string;
    fields:  DBMLField[];
    indexes: DBMLIndex[];
    settings?: Record<string, string>;  // custom properties [key: "val"]
}

interface DBMLField {
    name:       string;
    type:       { type_name: string; args?: string };  // es. { type_name: 'varchar', args: '100' }
    pk?:        boolean;
    unique?:    boolean;
    not_null?:  boolean;
    increment?: boolean;
    default?:   { value: string; type: 'string' | 'expression' | 'number' | 'boolean' };
    note?:      string;
    settings?:  Record<string, string>;
}

interface DBMLIndex {
    columns:  Array<{ value: string; type: 'column' | 'expression' }>;
    pk?:      boolean;
    unique?:  boolean;
    name?:    string;
}

interface DBMLEnum {
    name:   string;
    values: Array<{ name: string; settings?: { note?: string } }>;
}

interface DBMLRef {
    endpoints: [DBMLEndpoint, DBMLEndpoint];
    onDelete?: 'cascade' | 'set null' | 'restrict' | 'no action';
    name?:     string;
}

interface DBMLEndpoint {
    tableName:  string;
    schemaName: string;
    fieldNames: string[];
    relation:   '<' | '>' | '-' | '<>';  // cardinalità lato endpoint
}
```

### 3.2 Parsing difensivo

Il parser può lanciare eccezioni su DBML non valido. Il `DBMLImporter` deve wrappare il parsing:

```typescript
import { Parser } from '@dbml/parse';

export function parseDbml(dbmlStr: string): DBMLDatabase {
    try {
        return new Parser().parse(dbmlStr, 'dbmlv2');
    } catch (e: unknown) {
        // Aggiungi contesto utile al messaggio di errore
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`DBML parse error: ${msg}`);
    }
}
```

### 3.3 File `src/dbml/dbml-type-reverse.ts`

Mapping inverso rispetto a `type-map.ts` (Opzione A). Data una stringa tipo DBML, produce lo shorthand ESQL corrispondente:

```typescript
/**
 * Converte una stringa tipo DBML → shorthand tipo ESQL.
 * Mapping inverso di toDbmlType() in type-map.ts.
 */
export function fromDbmlType(dbmlType: string, args?: string): string {
    const t = dbmlType.toLowerCase().replace(/^"|"$/g, '').trim();

    // Tipi con args: varchar(N), decimal(p,s)
    if (t === 'varchar' || t === 'varchar2' || t === 'character varying') {
        return args ? `vc${args}` : 'vc';
    }
    if (t === 'char') {
        return args ? `vc${args}` : 'vc4';
    }
    if (t === 'decimal' || t === 'numeric' || t === 'number') {
        return args ? `num(${args})` : 'num';
    }
    if (t === 'int' || t === 'integer' || t === 'smallint' || t === 'bigint') {
        return 'int';
    }
    if (t === 'float' || t === 'double' || t === 'real') {
        return 'num';
    }
    if (t === 'date')      return 'date';
    if (t === 'timestamp') return 'ts';
    if (t === 'timestamp with time zone')       return 'tswtz';
    if (t === 'timestamp with local time zone') return 'tswltz';
    if (t === 'boolean' || t === 'bool')        return 'bool';
    if (t === 'text' || t === 'clob' || t === 'longtext') return 'clob';
    if (t === 'blob' || t === 'bytea' || t === 'binary')  return 'blob';
    if (t === 'json' || t === 'jsonb') return 'json';

    // Tipi vector: "vector(N,*,*)" o "vector(*,*,*)"
    const vecMatch = t.match(/^vector\((\d+|\*),([^,]+),([^)]+)\)$/);
    if (vecMatch) {
        const dim  = vecMatch[1] === '*' ? '0' : vecMatch[1];
        const fmt  = vecMatch[2].trim() === '*' ? '' : vecMatch[2].trim().toLowerCase();
        const stor = vecMatch[3].trim() === '*' ? '' : vecMatch[3].trim().toUpperCase();
        return `vect${dim}${fmt ? ` ${fmt}` : ''}${stor ? ` ${stor}` : ''}`.trim();
    }

    // SDO_GEOMETRY
    if (t === 'sdo_geometry' || t === 'geometry') return 'geometry';

    // Fallback: passthrough come tipo libero ExpreSQL
    // I tipi sconosciuti vengono mantenuti come stringa raw.
    // In ESQL è possibile usare tipi arbitrari (domain types).
    return args ? `${dbmlType}(${args})` : dbmlType;
}
```

---

## 4. Modulo 2 — `DBMLImporter` (DBML → ESQL)

### 4.1 Strategia di ricostruzione della gerarchia

Il problema principale nella conversione DBML → ESQL è ricostruire la **gerarchia di indentazione** ESQL a partire da un modello piatto di tabelle e Ref.

In ESQL, le relazioni parent-child si esprimono con l'indentazione:
```
departments
  name /nn
  employees         ← child di departments, FK implicita
    salary num
```

In DBML, le stesse relazioni sono Ref esplicite tra tabelle flat:
```
Table departments { ... }
Table employees { ... }
Ref: employees.departments_id > departments.departments_id
```

Il `DBMLImporter` deve decidere, per ogni tabella:
- È una tabella radice (nessuna FK in ingresso, o ha FK in uscita verso "parent")?
- È una child (ha una FK verso un'altra tabella che la "contiene" semanticamente)?

**Algoritmo di rilevamento gerarchia**:

1. Costruire un grafo diretto FK: `source → target` per ogni Ref di tipo `>` (many-to-one)
2. Le tabelle senza Ref in ingresso da altre tabelle (nodi sorgente del grafo) sono radici
3. Le tabelle con una sola FK verso una tabella radice (o sub-radice) sono candidates per la gerarchia implicita
4. Caso speciale: tabelle con FK multiple o circolari → non gerarchizzabili → usare `/fk` esplicito

La regola pratica:

> Se una tabella `B` ha esattamente una FK verso `A`, e quella FK punta alla PK di `A`, e la colonna FK si chiama `<A_name>_id`, allora `B` è child di `A` in ESQL.
> In tutti gli altri casi, emettere la tabella flat con `/fk table` esplicito.

**Esempio di esito dell'algoritmo**:

| Tabella | FK verso | Colonna FK | Gerarchia |
|---|---|---|---|
| `departments` | (nessuna) | — | radice |
| `employees` | `departments` | `departments_id` | child di `departments` |
| `orders` | `customers`, `products` | `customers_id`, `products_id` | flat con `/fk` multipli |
| `audit_log` | `employees` | `actor_id` (nome non-standard) | flat con `/fk employees` |

### 4.2 `src/dbml/importer.ts` — struttura completa

```typescript
import type { DBMLDatabase, DBMLTable, DBMLField, DBMLRef, DBMLEnum, DBMLSchema } from '@dbml/parse';
import { fromDbmlType } from './dbml-type-reverse.js';

// ── Strutture interne ─────────────────────────────────────────────────────────

interface FkEdge {
    fromTable: string;
    fromCol:   string;
    toTable:   string;
    toCol:     string;
    onDelete?: string;
    mandatory: boolean;  // true se la FK col è NOT NULL
    isStandard: boolean; // true se fromCol === `${toTable}_id`
}

interface HierarchyNode {
    table:    DBMLTable;
    children: HierarchyNode[];
    fks:      FkEdge[];   // FK non-gerarchia (usano /fk)
}

// ── DBMLImporter ─────────────────────────────────────────────────────────────

export class DBMLImporter {
    private schema: string | null;
    private prefix: string;
    private enumMap: Map<string, string[]>;  // enumName → valori

    constructor(options: {
        schema?: string | null;
        prefix?: string;
    } = {}) {
        this.schema   = options.schema ?? null;
        this.prefix   = options.prefix ?? '';
        this.enumMap  = new Map();
    }

    // ── Entrypoint pubblico ───────────────────────────────────────────────────

    /**
     * Converte un documento DBML (stringa) in ESQL shorthand.
     * Il modello DBML è già parsato da @dbml/parse; qui si assume parsing avvenuto.
     */
    convert(db: DBMLDatabase): string {
        const lines: string[] = [];

        // Di solito c'è un solo schema (public), ma iteriamo per sicurezza
        for (const schema of db.schemas) {
            // 1. Raccoglie gli enum per usarli nella mappatura tipi
            for (const en of schema.enums) {
                this.enumMap.set(en.name, en.values.map(v => v.name));
            }

            // 2. Costruisce le FK edges
            const fkEdges = this.buildFkEdges(schema);

            // 3. Determina gerarchia tabelle
            const hierarchy = this.buildHierarchy(schema.tables, fkEdges);

            // 4. Emette settings block
            const settingsBlock = this.emitSettings(db, schema);
            if (settingsBlock) {
                lines.push(settingsBlock);
                lines.push('');
            }

            // 5. Emette le tabelle radice con i loro figli (ricorsivo)
            for (const root of hierarchy) {
                lines.push(...this.emitNode(root, 0));
                lines.push('');
            }
        }

        return lines.join('\n').trimEnd();
    }

    // ── Settings ESQL ─────────────────────────────────────────────────────────

    private emitSettings(db: DBMLDatabase, schema: DBMLSchema): string {
        const parts: string[] = [];
        const project = (db as any).project;  // @dbml/core espone project su db

        // database_type → dialect (usato solo per documentazione; ExpreSQL usa sempre Oracle)
        const dbType = project?.databaseType ?? '';
        if (dbType.toLowerCase().includes('23') || dbType.toLowerCase().includes('ai')) {
            parts.push('db: "23ai"');
        }

        // Schema
        const schemaName = this.schema ?? (schema.name !== 'public' ? schema.name : null);
        if (schemaName) parts.push(`schema: ${schemaName}`);

        // Prefix derivato dal prefisso comune nelle tabelle (opzionale)
        if (this.prefix) parts.push(`prefix: ${this.prefix}`);

        // Custom properties sul Project block (round-trip da Opzione A)
        if (project?.settings) {
            for (const [k, v] of Object.entries(project.settings as Record<string,string>)) {
                if (k === 'esql_prefix') parts.push(`prefix: ${v}`);
                if (k === 'esql_api')    parts.push(`api: ${v}`);
                if (k === 'esql_tenantid' && v === 'yes') parts.push('tenantid: yes');
                if (k === 'esql_ifc')    parts.push(`ifc: ${v}`);
            }
        }

        if (!parts.length) return '';
        return `# settings = { ${parts.join(', ')} }`;
    }

    // ── Costruzione grafo FK ──────────────────────────────────────────────────

    private buildFkEdges(schema: DBMLSchema): FkEdge[] {
        const edges: FkEdge[] = [];

        for (const ref of schema.refs) {
            const [ep0, ep1] = ref.endpoints;

            // In DBML, `A.col > B.col` → ep0.relation='>' → A ha FK verso B (many-to-one)
            // Normalizziamo: fromTable è sempre il lato "molti"
            let fromEp: typeof ep0, toEp: typeof ep1;

            if (ep0.relation === '>' || ep1.relation === '<') {
                fromEp = ep0; toEp = ep1;
            } else if (ep0.relation === '<' || ep1.relation === '>') {
                fromEp = ep1; toEp = ep0;
            } else if (ep0.relation === '-') {
                // 1:1 → arbitrariamente: ep0 → ep1
                fromEp = ep0; toEp = ep1;
            } else {
                // N:M (`<>`) → nessuna direzione chiara; saltiamo (bridge table)
                continue;
            }

            const fromCol  = fromEp.fieldNames[0] ?? '';
            const toCol    = toEp.fieldNames[0] ?? '';
            const toTable  = toEp.tableName;

            // FK colonna è mandatory se la colonna è NOT NULL nel modello tabella
            const fromTable_ = schema.tables.find(t => t.name === fromEp.tableName);
            const fromField  = fromTable_?.fields.find(f => f.name === fromCol);
            const mandatory  = Boolean(fromField?.not_null);

            // FK "standard" ExpreSQL: colonna si chiama `<toTable>_id`
            const isStandard = fromCol === `${toTable}_id`
                            || fromCol === `${toTable.toLowerCase()}_id`;

            edges.push({
                fromTable: fromEp.tableName,
                fromCol,
                toTable,
                toCol,
                onDelete:  ref.onDelete,
                mandatory,
                isStandard,
            });
        }

        return edges;
    }

    // ── Ricostruzione gerarchia ───────────────────────────────────────────────

    private buildHierarchy(tables: DBMLTable[], edges: FkEdge[]): HierarchyNode[] {
        // Mappa: tableName → quante FK in ingresso ha (come target)
        const inDegree = new Map<string, number>();
        for (const t of tables) inDegree.set(t.name, 0);

        // Candidature parent-child: solo FK standard con fromCol = `toTable_id`
        const parentOf = new Map<string, string>(); // fromTable → toTable (il suo parent)
        for (const edge of edges) {
            if (!edge.isStandard) continue;
            // Una tabella può avere al più UN parent nella gerarchia
            if (!parentOf.has(edge.fromTable)) {
                parentOf.set(edge.fromTable, edge.toTable);
                inDegree.set(edge.toTable, (inDegree.get(edge.toTable) ?? 0) + 1);
            }
        }

        // Tabelle senza parent → radici
        const rootTables = tables.filter(t => !parentOf.has(t.name));

        // Costruisce i nodi ricorsivamente
        const buildNode = (table: DBMLTable): HierarchyNode => {
            const children = tables
                .filter(t => parentOf.get(t.name) === table.name)
                .map(buildNode);

            // FK non-standard → usano /fk esplicito
            const fks = edges.filter(e =>
                e.fromTable === table.name && !edges.find(
                    x => x.fromTable === table.name && x.isStandard && x.toTable === parentOf.get(table.name)
                )
            );

            return { table, children, fks };
        };

        return rootTables.map(buildNode);
    }

    // ── Emissione ESQL ────────────────────────────────────────────────────────

    private emitNode(node: HierarchyNode, depth: number): string[] {
        const indent = '  '.repeat(depth);
        const lines:  string[] = [];
        const { table } = node;

        // Nome tabella (rimuove prefix se presente)
        const rawName = this.prefix
            ? table.name.replace(new RegExp(`^${this.prefix}_`, 'i'), '')
            : table.name;

        // Riga tabella
        let tableHeader = `${indent}${rawName}`;
        if (table.note) tableHeader += ` [${table.note}]`;
        lines.push(tableHeader);

        // Colonne
        for (const field of table.fields) {
            const colLine = this.emitField(field, indent + '  ', table);
            if (colLine) lines.push(colLine);
        }

        // Indici tabella-level (composite pk, composite unique)
        for (const idx of table.indexes) {
            const idxLine = this.emitIndex(idx, indent + '  ');
            if (idxLine) lines.push(idxLine);
        }

        // Custom properties → direttive ESQL
        lines.push(...this.emitTableDirectives(table, indent + '  '));

        // FK esplicite (non-standard) → /fk
        for (const fk of node.fks) {
            if (fk.fromTable !== table.name) continue;
            const targetName = this.prefix
                ? fk.toTable.replace(new RegExp(`^${this.prefix}_`, 'i'), '')
                : fk.toTable;
            let fkLine = `${indent}  ${fk.fromCol} /fk ${targetName}`;
            if (fk.mandatory) fkLine += ' /nn';
            if (fk.onDelete === 'cascade')  fkLine += ' /cascade';
            if (fk.onDelete === 'set null') fkLine += ' /setnull';
            lines.push(fkLine);
        }

        // Figli ricorsivi
        for (const child of node.children) {
            lines.push(...this.emitNode(child, depth + 1));
        }

        return lines;
    }

    private emitField(field: DBMLField, indent: string, table: DBMLTable): string | null {
        // Salta PK auto-generata (colName === `${tableName}_id`) — ExpreSQL la genera
        const expectedPkName = `${table.name}_id`;
        if (field.pk && field.name === expectedPkName) {
            // La PK auto è gestita da ExpreSQL; non emettere la colonna
            // Teniamo però traccia del pkMode per il settings block
            return null;
        }

        // Tipo ESQL
        const type = this.resolveFieldType(field);

        // Direttive colonna
        const directives: string[] = [];
        if (field.not_null)   directives.push('/nn');
        if (field.unique)     directives.push('/unique');
        if (field.pk)         directives.push('/pk');
        if (field.increment)  directives.push('/pk');  // identity

        // Default
        if (field.default !== undefined) {
            const def = field.default;
            if (def.type === 'expression') directives.push(`/default ${def.value}`);
            else if (def.type === 'string') directives.push(`/default '${def.value}'`);
            else directives.push(`/default ${def.value}`);
        }

        // Note → commento ESQL
        let note = '';
        if (field.note) note = ` [${field.note}]`;

        // Custom properties esql_* → direttive ESQL
        if (field.settings) {
            if (field.settings['esql_case'] === 'upper') directives.push('/upper');
            if (field.settings['esql_case'] === 'lower') directives.push('/lower');
        }

        const dirStr = directives.length ? ' ' + directives.join(' ') : '';
        return `${indent}${field.name} ${type}${dirStr}${note}`;
    }

    private resolveFieldType(field: DBMLField): string {
        const rawType = field.type.type_name;
        const args    = field.type.args ?? undefined;

        // Se il tipo è un enum registrato, convertilo in /check list
        if (this.enumMap.has(rawType)) {
            return ''; // tipo sarà sostituito con /check; vedi nota sotto
            // In pratica, `resolveFieldType` torna '' e l'emissione è gestita
            // nella pipeline con `/check val1,val2` aggiunto alle directives.
        }

        return fromDbmlType(rawType, args) || 'vc';
    }

    private emitIndex(idx: DBMLIndex & { pk?: boolean; unique?: boolean; name?: string }, indent: string): string | null {
        const cols = idx.columns.map(c => c.value).join(',');

        // Indice singolo su colonna singola: già gestito come direttiva colonna (/idx, /unique)
        if (idx.columns.length === 1 && !idx.pk && !idx.unique) return null;

        // Composite PK
        if (idx.pk && idx.columns.length > 1) {
            return `${indent}/pk ${cols}`;
        }

        // Composite unique
        if (idx.unique && idx.columns.length > 1) {
            return `${indent}/unique ${cols}`;
        }

        return null;
    }

    private emitTableDirectives(table: DBMLTable, indent: string): string[] {
        const lines: string[] = [];
        const s = table.settings ?? {};

        // Round-trip custom properties → direttive ExpreSQL
        if (s['esql_auditcols'] === 'yes')  lines.push(`${indent}/auditcols`);
        if (s['esql_rowversion'] === 'yes') lines.push(`${indent}/rowversion`);
        if (s['esql_rowkey'] === 'yes')     lines.push(`${indent}/rowkey`);
        if (s['esql_versioned'] === 'yes')  lines.push(`${indent}/versioned`);
        if (s['esql_rest'] === 'yes' || s['esql_ords'] === 'yes') lines.push(`${indent}/rest`);
        if (s['esql_audit'] === 'yes')       lines.push(`${indent}/audit`);
        if (s['esql_auditlog'] === 'yes')    lines.push(`${indent}/auditlog`);
        if (s['esql_immutable'] === 'yes')   lines.push(`${indent}/immutable`);
        if (s['esql_soda'] === 'yes')        lines.push(`${indent}/soda`);
        if (s['esql_compress'] === 'yes')    lines.push(`${indent}/compress`);
        if (s['esql_flashback'])             lines.push(`${indent}/flashback`);
        if (s['esql_api'])                   lines.push(`${indent}/api ${s['esql_api']}`);
        if (s['esql_businesskey'])           lines.push(`${indent}/businesskey ${s['esql_businesskey']}`);
        if (s['esql_lockmode'])              lines.push(`${indent}/lockmode ${s['esql_lockmode']}`);
        if (s['esql_notenantid'] === 'yes')  lines.push(`${indent}/notenantid`);
        if (s['esql_history'] === 'yes')     lines.push(`${indent}/history`);
        if (s['esql_aggregate'] === 'yes')   lines.push(`${indent}/aggregate`);

        // Note tabella → comment ExpreSQL (non ha una sintassi direttiva standard;
        // la apponiamo come commento inline sul nome tabella — vedi emitNode)

        return lines;
    }
}
```

### 4.3 Note implementative chiave

**Enum → /check conversion**

Quando un campo DBML ha tipo `some_table_status_enum`, e quell'enum è nel registry (`this.enumMap`), la colonna viene emessa come:
```
status /check A,I,P
```
perché ESQL tratta `/check val1,val2` come il costrutto canoni­co. La logica di `emitField()` deve gestire il caso enum separatamente:

```typescript
private emitField(field: DBMLField, ...): string | null {
    const rawType = field.type.type_name;
    const enumVals = this.enumMap.get(rawType);

    if (enumVals) {
        // Tipo è un enum DBML → emetti /check
        directives.unshift(`/check ${enumVals.join(',')}`);
        // Il "tipo" ESQL va omesso: ExpreSQL inferisce varchar per le colonne /check
        return `${indent}${field.name} /check ${enumVals.join(',')}${dirStr}${note}`;
    }
    // ... resto normale
}
```

**PK detection e pkMode**

Il DBMLImporter deve determinare il `pkMode` per il settings block analizzando la colonna PK della prima tabella:
- Ha `increment: true` → `pk: identity`
- Ha `default: sys_guid()` o `default: SYS_GUID()` → `pk: guid`
- Ha `default: <SEQ>.NEXTVAL` → `pk: seq`
- Nessuno dei precedenti → `pk: guid` (default)

```typescript
private detectPkMode(tables: DBMLTable[]): string {
    for (const table of tables) {
        const pkField = table.fields.find(f => f.pk);
        if (!pkField) continue;
        if (pkField.increment)                                  return 'identity';
        if (/sys_guid/i.test(pkField.default?.value ?? ''))    return 'guid';
        if (/NEXTVAL/i.test(pkField.default?.value ?? ''))     return 'seq';
    }
    return 'guid';
}
```

**Prefix detection automatico**

Se l'utente non passa esplicitamente `prefix`, il DBMLImporter può tentare di rilevarlo automaticamente cercando un prefisso comune a tutte le tabelle:

```typescript
private detectPrefix(tables: DBMLTable[]): string | null {
    if (tables.length < 2) return null;
    const names = tables.map(t => t.name);
    const parts = names[0].split('_');
    for (let i = parts.length - 1; i >= 1; i--) {
        const candidate = parts.slice(0, i).join('_');
        if (names.every(n => n.startsWith(candidate + '_'))) {
            return candidate;
        }
    }
    return null;
}
```

---

## 5. Modulo 3 — Integrazione in `ddl-core.ts`

### 5.1 Import condizionale

`@dbml/parse` non deve essere incluso nel bundle Vite produzione. La dipendenza va importata dinamicamente solo quando `fromDBML()` viene chiamata:

```typescript
// src/ddl-core.ts

/**
 * Converte un documento DBML (dbmlv2) in ESQL shorthand, poi genera DDL Oracle.
 * Richiede @dbml/parse installato come dipendenza.
 *
 * options.outputFormat:
 *   'ddl'  (default) → Oracle DDL string
 *   'esql'           → ESQL shorthand intermedio (per anteprima o editing)
 */
export async function fromDBML(
    dbmlStr: string,
    options?: { outputFormat?: 'ddl' | 'esql'; schema?: string; prefix?: string } & Record<string, unknown>
): Promise<string> {
    // Dynamic import: non incluso nel bundle DDL principale
    const { Parser } = await import('@dbml/parse');
    const { DBMLImporter } = await import('./dbml/importer.js');

    const db      = new Parser().parse(dbmlStr, 'dbmlv2');
    const imp     = new DBMLImporter({ schema: options?.schema, prefix: options?.prefix });
    const esql    = imp.convert(db);

    if (options?.outputFormat === 'esql') return esql;

    // Genera DDL dalla stringa ESQL prodotta
    return new expresql(esql, { db: 'oracle', ...options }).getDDL();
}
```

### 5.2 Metodo sull'istanza `expresql`

```typescript
// In src/ddl-core.ts, sulla classe expresql

/**
 * Crea un'istanza expresql a partire da una stringa DBML.
 * Statico perché richiede await (import dinamico).
 */
static async fromDBML(
    dbmlStr: string,
    options?: Parameters<typeof fromDBML>[1]
): Promise<expresql> {
    const { Parser }      = await import('@dbml/parse');
    const { DBMLImporter } = await import('./dbml/importer.js');

    const db   = new Parser().parse(dbmlStr, 'dbmlv2');
    const imp  = new DBMLImporter({ schema: options?.schema, prefix: options?.prefix });
    const esql = imp.convert(db);

    return new expresql(esql, options);
}
```

Uso:
```typescript
const expr = await expresql.fromDBML(dbmlString, { schema: 'hr' });
const ddl  = expr.getDDL();
const erd  = expr.getERD();
const esql = expr.input; // lo shorthand intermedio
```

### 5.3 Esportazioni da `src/ddl.ts`

`src/ddl.ts` fa `export * from './ddl-core.js'` — `fromDBML` viene ri-esportata automaticamente.

### 5.4 Esclusione dal bundle Vite

In `vite.apex.config.js` (e negli altri config Vite), aggiungere `@dbml/parse` agli `external`:

```javascript
// vite.apex.config.js
export default defineConfig({
    build: {
        lib: { ... },
        rollupOptions: {
            external: ['@dbml/parse', '@dbml/core'],  // non bundlare
        }
    }
});
```

---

## 6. Modulo 4 — CLI

### 6.1 `bin/index.js` — flag `--from-dbml`

```javascript
// bin/index.js (aggiornamento del file esistente)

import { toDDL, toDBML, fromDBML } from '../dist/expresql.js';
import { readFileSync } from 'fs';
import { basename, extname, join, dirname } from 'path';

const args       = process.argv.slice(2);
const dbmlFlag   = args.includes('--dbml');
const fromDbml   = args.includes('--from-dbml');
const toEsql     = args.includes('--to-esql');
const file       = args.find(a => !a.startsWith('--'));

if (!file) {
    console.error('Usage: expresql [--dbml | --from-dbml [--to-esql]] <file>');
    process.exit(1);
}

const src = readFileSync(file, 'utf8');

if (dbmlFlag) {
    // Opzione A: ESQL → DBML
    const dbml    = toDBML(src);
    const outFile = join(dirname(file), basename(file, extname(file)) + '.dbml');
    writeFileSync(outFile, dbml, 'utf8');
    console.log(`DBML written to ${outFile}`);

} else if (fromDbml) {
    // Opzione B: DBML → ESQL o DDL
    const result = await fromDBML(src, { outputFormat: toEsql ? 'esql' : 'ddl' });

    if (toEsql) {
        const outFile = join(dirname(file), basename(file, extname(file)) + '.esql');
        writeFileSync(outFile, result, 'utf8');
        console.log(`ESQL written to ${outFile}`);
    } else {
        process.stdout.write(result + '\n');
    }

} else {
    // Default: ESQL → DDL
    const ddl = toDDL(src);
    process.stdout.write(ddl + '\n');
}
```

**Comportamenti**:

| Comando | Input | Output |
|---|---|---|
| `expresql schema.esql` | ESQL | Oracle DDL su stdout |
| `expresql --dbml schema.esql` | ESQL | `schema.dbml` nella stessa dir |
| `expresql --from-dbml schema.dbml` | DBML | Oracle DDL su stdout |
| `expresql --from-dbml --to-esql schema.dbml` | DBML | `schema.esql` nella stessa dir |

---

## 7. Modulo 5 — Web UI: Import nel pannello DBML

### 7.1 Modifica `index_all.html` — Import area nel tab DBML

```html
<!-- Aggiungere nel pane dbml, dopo la toolbar esistente -->
<div class="dbml-import-area" id="dbml-import-area">
    <div class="dbml-import-header">
        <span>Import DBML</span>
        <button id="btn-close-import" class="btn-icon" title="Chiudi">✕</button>
    </div>
    <textarea id="dbml-import-input"
              placeholder="Incolla qui il tuo schema DBML..."
              spellcheck="false"></textarea>
    <div class="dbml-import-actions">
        <button id="btn-import-dbml"  class="btn-sm btn-accent">↓ Importa → ESQL</button>
        <button id="btn-import-file"  class="btn-sm">📂 Carica file .dbml</button>
        <input  type="file" id="dbml-file-input" accept=".dbml" style="display:none">
    </div>
    <div id="dbml-import-error" class="dbml-import-error" style="display:none"></div>
</div>
```

```html
<!-- Nella toolbar DBML esistente, aggiungere il bottone di apertura -->
<button id="btn-open-import" class="btn-sm">↑ Import DBML</button>
```

### 7.2 Stili CSS

```css
.dbml-import-area {
    display:         none;              /* mostrata solo quando aperta */
    flex-direction:  column;
    gap:             8px;
    padding:         12px;
    background:      var(--bg-panel);
    border-bottom:   1px solid var(--border);
}

.dbml-import-area.open { display: flex; }

.dbml-import-header {
    display:         flex;
    justify-content: space-between;
    align-items:     center;
    font-size:       11px;
    font-weight:     600;
    text-transform:  uppercase;
    letter-spacing:  0.06em;
    color:           var(--text-muted);
}

#dbml-import-input {
    font-family:  'IBM Plex Mono', monospace;
    font-size:    11px;
    height:       140px;
    resize:       vertical;
    background:   var(--code-bg);
    color:        var(--code-text);
    border:       1px solid var(--border);
    border-radius: 4px;
    padding:      8px;
    tab-size:     2;
}

.dbml-import-actions {
    display: flex; gap: 6px; align-items: center;
}

.dbml-import-error {
    font-family:   monospace;
    font-size:     11px;
    color:         #f48771;
    background:    rgba(244, 135, 113, 0.08);
    border:        1px solid rgba(244, 135, 113, 0.3);
    border-radius: 4px;
    padding:       6px 8px;
    white-space:   pre-wrap;
}
```

### 7.3 Modifica `web/dbml-panel.js` — logica Import

```javascript
// Aggiungere in web/dbml-panel.js

export function initDbmlImport({ onImport }) {
    const btnOpen  = document.getElementById('btn-open-import');
    const btnClose = document.getElementById('btn-close-import');
    const area     = document.getElementById('dbml-import-area');
    const textarea = document.getElementById('dbml-import-input');
    const btnImport= document.getElementById('btn-import-dbml');
    const btnFile  = document.getElementById('btn-import-file');
    const fileInput= document.getElementById('dbml-file-input');
    const errEl    = document.getElementById('dbml-import-error');

    const showError = (msg) => {
        errEl.textContent = msg;
        errEl.style.display = '';
    };
    const clearError = () => { errEl.style.display = 'none'; };

    btnOpen?.addEventListener('click', () => area?.classList.add('open'));
    btnClose?.addEventListener('click', () => {
        area?.classList.remove('open');
        clearError();
    });

    const doImport = async (dbmlStr) => {
        clearError();
        try {
            // fromDBML è async (dynamic import)
            const { fromDBML } = await import('../dist/expresql.js');
            const esql = await fromDBML(dbmlStr, { outputFormat: 'esql' });

            // Passa l'ESQL all'editor principale tramite callback
            onImport(esql);
            area?.classList.remove('open');
        } catch (e) {
            showError(e?.message ?? String(e));
        }
    };

    btnImport?.addEventListener('click', () => {
        const text = textarea?.value?.trim();
        if (!text) { showError('Incolla uno schema DBML prima di importare.'); return; }
        doImport(text);
    });

    btnFile?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
        const file = fileInput?.files?.[0];
        if (!file) return;
        file.text().then(doImport).catch(e => showError(e?.message));
    });
}
```

### 7.4 Integrazione in `web/app.js`

```javascript
// In update() → notifica che il DBML è da ricalcolare dopo l'import
import { initDbmlImport } from './dbml-panel.js';

// Nel bootstrap
initDbmlImport({
    onImport: (esqlText) => {
        // Inserisce l'ESQL nel CodeMirror editor e triggera l'update
        const editor = state.cmEditor;
        if (editor) {
            editor.dispatch({
                changes: { from: 0, to: editor.state.doc.length, insert: esqlText }
            });
        } else {
            document.getElementById('input').value = esqlText;
            update();
        }
        // Switcha al tab ESQL/DDL per vedere il risultato immediato
        switchTab('ddl');
    }
});
```

---

## 8. Modulo 6 — Test

### 8.1 Struttura dei test

```
test/dbml/
├── fixtures/
│   ├── basic.dbml              ← esistente (Opzione A output)
│   ├── basic.esql              ← NUOVO: ESQL atteso per basic.dbml
│   ├── round-trip.esql         ← ESQL originale
│   ├── round-trip-reimport.esql ← ESQL atteso dopo ESQL→DBML→ESQL
│   ├── external-pg.dbml        ← DBML da strumento esterno (PostgreSQL types)
│   ├── external-pg.esql        ← ESQL atteso
│   ├── enums.dbml              ← enum DBML → /check ESQL
│   ├── enums.esql              ← atteso
│   ├── hierarchy.dbml          ← parent-child via Refs
│   └── hierarchy.esql          ← ESQL con gerarchia indentata
├── importer.test.ts            ← NUOVO
└── round-trip.test.ts          ← NUOVO
```

### 8.2 Pattern di test

```typescript
// test/dbml/importer.test.ts
import { describe, it, expect } from 'vitest';
import { fromDBML } from '../../src/ddl-core.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const fix = (name: string) =>
    readFileSync(join(__dirname, 'fixtures', name), 'utf8').trim();

describe('DBMLImporter — core', () => {

    it('converte tabella semplice → ESQL', async () => {
        const dbml = `Table employees { name varchar(100) [not null] }`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        expect(esql).toContain('employees');
        expect(esql).toContain('name vc100 /nn');
    });

    it('rileva pkMode identity da DBML increment', async () => {
        const dbml = `Table users { users_id int [pk, increment] \n name varchar(50) }`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        expect(esql).toContain('pk: identity');
    });

    it('converte enum DBML → /check', async () => {
        const dbml = `
enum status_enum { A I P }
Table orders {
    orders_id int [pk]
    status status_enum [not null]
}`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        expect(esql).toContain('status /check A,I,P');
    });

    it('ricostruisce gerarchia parent-child da Ref standard', async () => {
        const dbml = `
Table departments { departments_id int [pk]  name varchar(100) }
Table employees   { employees_id int [pk]  departments_id int  name varchar(100) }
Ref: employees.departments_id > departments.departments_id`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        // employees deve essere indentato sotto departments
        expect(esql).toMatch(/^departments\s*\n\s+.*\n\s+employees/m);
    });

    it('emette /fk esplicito per FK non-standard', async () => {
        const dbml = `
Table employees { employees_id int [pk]  manager_id int  name varchar(100) }
Table managers  { managers_id int [pk]   name varchar(100) }
Ref: employees.manager_id > managers.managers_id`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        expect(esql).toContain('/fk managers');
    });

    it('emette delete: cascade come /cascade', async () => {
        const dbml = `
Table departments { departments_id int [pk] name varchar(100) }
Table employees   { employees_id int [pk]  departments_id int }
Ref: employees.departments_id > departments.departments_id [delete: cascade]`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        expect(esql).toContain('/cascade');
    });

    it('preserva direttive esql_* nel round-trip', async () => {
        const dbml = `
Table products {
    products_id int [pk]
    name varchar(100)
    [esql_api: "full+hks", esql_rest: "yes", esql_auditcols: "yes"]
}`;
        const esql = await fromDBML(dbml, { outputFormat: 'esql' });
        expect(esql).toContain('/api full+hks');
        expect(esql).toContain('/rest');
        expect(esql).toContain('/auditcols');
    });

    it('genera DDL Oracle valido', async () => {
        const dbml = `Table employees { employees_id int [pk]  name varchar(100) [not null] }`;
        const ddl  = await fromDBML(dbml);
        expect(ddl).toContain('CREATE TABLE employees');
        expect(ddl).toContain('name VARCHAR2(100) NOT NULL');
    });

    it('snapshot: basic.dbml → basic.esql', async () => {
        const dbml = fix('basic.dbml');
        const got  = (await fromDBML(dbml, { outputFormat: 'esql' })).trim();
        const want = fix('basic.esql');
        expect(got).toBe(want);
    });

    it('snapshot: external-pg.dbml → external-pg.esql', async () => {
        const dbml = fix('external-pg.dbml');
        const got  = (await fromDBML(dbml, { outputFormat: 'esql' })).trim();
        const want = fix('external-pg.esql');
        expect(got).toBe(want);
    });
});

describe('DBMLImporter — round-trip', () => {
    it('ESQL → DBML → ESQL produce ESQL equivalente', async () => {
        const { toDBML } = await import('../../src/ddl-core.js');
        const originalEsql = fix('round-trip.esql');
        const dbml         = toDBML(originalEsql);
        const reimportEsql = (await fromDBML(dbml, { outputFormat: 'esql' })).trim();
        const expected     = fix('round-trip-reimport.esql');
        expect(reimportEsql).toBe(expected);
    });
});
```

### 8.3 Fixture `external-pg.dbml` — caso realistico

```dbml
// Schema PostgreSQL tipico proveniente da dbdiagram.io
Project ecommerce {
  database_type: 'PostgreSQL'
}

Table users {
  users_id  serial      [pk, increment]
  email     varchar(255) [unique, not null]
  created_at timestamp  [default: `now()`]
  role      user_role_enum [not null]
}

enum user_role_enum {
  admin
  member
  guest
}

Table orders {
  orders_id  serial    [pk, increment]
  users_id   integer   [not null, ref: > users.users_id]
  total      decimal(10,2) [not null]
  status     order_status_enum [not null]
  created_at timestamp
}

enum order_status_enum {
  pending
  confirmed
  shipped
  delivered
  cancelled
}

Table order_items {
  order_items_id serial  [pk, increment]
  orders_id      integer [not null, ref: > orders.orders_id]
  product_name   varchar(200) [not null]
  quantity       integer [not null]
  price          decimal(10,2) [not null]
}
```

ESQL atteso (`external-pg.esql`):

```esql
# settings = { pk: identity }

users
  email vc255 /unique /nn
  created_at ts /default now()
  role /check admin,member,guest /nn
  orders
    total num(10,2) /nn
    status /check pending,confirmed,shipped,delivered,cancelled /nn
    created_at ts
    order_items
      product_name vc200 /nn
      quantity int /nn
      price num(10,2) /nn
```

---

## 9. Gap analysis: cosa va perso nella conversione

### DBML → ESQL: informazioni non convertibili

| Costrutto DBML | Comportamento nell'import | Impatto |
|---|---|---|
| `records { }` (dati di esempio) | Ignorati — nessun equivalente ESQL diretto | Basso |
| `Note name { }` (sticky notes) | Ignorati — costrutti canvas-only | Basso |
| `DiagramView` | Ignorato | Basso |
| `Dep:` (data lineage) | Ignorato | Basso |
| `TablePartial` | Le colonne del partial **non** vengono espanse automaticamente | **Alto** — l'utente deve espanderle manualmente |
| Schema multipli (`a.b.c`) | Solo un livello supportato | Medio |
| `ref: <> ` (N:M) | La tabella bridge viene emessa come tabella flat senza gerarchia | Medio |
| Ref inline `[ref: > table.col]` | Supportata se la struttura del campo è accessibile nel modello | Basso |
| Colori su TableGroup e Ref | Ignorati | Basso |
| Tipi PostgreSQL-specifici (`serial`, `uuid`, `jsonb`, `bytea`, `text[]`) | Mappati al tipo ESQL più vicino: `serial` → `int /pk`, `uuid` → `vc36`, `jsonb` → `json`, `bytea` → `blob`, `text[]` non supportato | Medio |
| `database_type: 'PostgreSQL'` | Il DDL generato è sempre Oracle; il tipo DB di input è solo indicativo | Atteso |

### DBML → ESQL: qualità dell'output e revisione manuale raccomandata

L'ESQL prodotto dall'import è **corretto ma non ottimizzato**. In particolare:

1. **Gerarchia**: la ricostruzione della gerarchia parent-child è euristica. Schemi con FK non-standard o cross-dominio complessi producono ESQL flat (con `/fk` espliciti) invece della struttura indentata. Il DDL generato è identico, ma l'ESQL è meno leggibile.

2. **Tipi numerici**: `decimal(10,2)` → `num(10,2)` è corretto. Ma `decimal` senza args → `num` perde la distinzione Oracle `NUMBER` vs `DECIMAL` (semanticamente diversi in precision arbitraria).

3. **Direttive avanzate**: se il DBML non contiene custom properties `[esql_*]`, le direttive TAPI (`/api`, `/rest`, `/auditcols`, ecc.) non vengono generate. L'utente deve aggiungerle manualmente dopo l'import.

4. **PK naming**: ExpreSQL genera PK con nome `<tablename>_id`. Se il DBML ha PK con nome diverso (`id`, `pk`, `user_id`), la PK viene emessa come colonna `/pk` esplicita invece di essere la PK auto-generata. Il DDL è corretto, ma l'ESQL è verbose.

**Raccomandazione UX**: dopo l'import, mostrare un banner "Schema importato — revisiona le direttive TAPI prima di generare DDL definitivo."

---

## 10. Piano di implementazione a sprint

### Sprint 1 — Core importer (4–5 giorni)

Obiettivo: `fromDBML(dbmlStr, { outputFormat: 'esql' })` funzionante su schemi semplici.

1. Aggiungere `@dbml/parse` come dipendenza
2. Creare `src/dbml/dbml-type-reverse.ts` — mapping completo
3. Creare `src/dbml/importer.ts` — `DBMLImporter`:
   - `convert()` con parsing
   - `emitNode()` / `emitField()` senza FK hierarchy (tutto flat)
   - `emitSettings()` con settings block ESQL
4. Aggiungere `fromDBML()` in `ddl-core.ts` (async, dynamic import)
5. Test: `importer.test.ts` casi base (colonne, tipi, note)

**Criterio di completamento**: `fromDBML(basicDbml, { outputFormat: 'esql' })` produce ESQL
compilabile dalla pipeline esistente senza errori.

### Sprint 2 — FK e gerarchia (3–4 giorni)

Obiettivo: Ref DBML → gerarchia ESQL o `/fk` espliciti.

1. Implementare `buildFkEdges()` — normalizzazione direzione Ref
2. Implementare `buildHierarchy()` — algoritmo parent-child detection
3. Gestire FK non-standard → `/fk` esplicito
4. Gestire ON DELETE → `/cascade`, `/setnull`
5. Test: `importer.test.ts` — casi gerarchia e FK
6. Fixture `hierarchy.dbml` → `hierarchy.esql`

### Sprint 3 — Enum, indici, round-trip (3–4 giorni)

Obiettivo: enum DBML → `/check`, indici composite, round-trip verificato.

1. `enumMap` e conversione campo tipo-enum → `/check val1,val2`
2. Indici composite → `/pk col1,col2`, `/unique col1,col2`
3. Custom properties `[esql_*]` → direttive ESQL (round-trip completo)
4. `detectPkMode()` e `detectPrefix()`
5. Test: `round-trip.test.ts`
6. Fixture `external-pg.dbml` → `external-pg.esql`

### Sprint 4 — CLI e Web UI (2–3 giorni)

Obiettivo: integrazione CLI e pannello Import nella web UI.

1. Modifica `bin/index.js` — flag `--from-dbml`, `--to-esql`
2. Modifica `index_all.html` — Import area nel tab DBML
3. CSS in `app.css`
4. `initDbmlImport()` in `dbml-panel.js`
5. Integrazione in `app.js` — callback onImport → editor
6. Build + smoke test manuale

**Criterio di completamento**: incollare `external-pg.dbml` nella UI produce DDL Oracle valido nell'editor senza errori.

---

## 11. Decisioni di design già risolte

| Questione aperta | Decisione |
|---|---|
| Strategia DBML → DDL | DBML → ESQL (intermedio visibile) → pipeline DDL esistente; non DBML → DdlNode diretto |
| Dipendenza `@dbml/parse` | Dev dependency + runtime via dynamic import; **non** nel bundle Vite produzione |
| Gerarchia parent-child | Ricostruzione euristica: solo FK standard (`child.<parent>_id > parent.<parent>_id`); tutto il resto → `/fk` flat |
| Enum DBML → ESQL | Se valori ≤ 10 e tutti `[a-zA-Z0-9_]` → `/check val1,val2`; altrimenti tipo passthrough |
| PK auto-generata | Se la PK DBML si chiama `<tablename>_id` → omessa (ExpreSQL la genera); altrimenti → `/pk` esplicito |
| `TablePartial` | Non espanso automaticamente; documentato come limitazione nota |
| `records { }` | Ignorati; l'ESQL non ha equivalente per dati di esempio (solo `/insert N` ma semanticamente diverso) |
| Prefix detection | Automatico se tutte le tabelle condividono un prefisso comune; override esplicito via opzione |
| Schema multipli DBML | Solo lo schema `public` (primo schema) viene importato; la presenza di schemi multipli genera un warning |
| `database_type` non-Oracle | Il DDL prodotto è sempre Oracle; il tipo del DBML sorgente è informativo e influenza solo la scelta del settings block |
| UX dopo l'import | Banner "revisiona direttive TAPI" nel pannello risultato; tab DDL viene mostrato automaticamente dopo l'import |
