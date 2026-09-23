Specifica ExpreSQL → DBML

- Contesto
- [1. Sommario esecutivo](#s1)
- [2. Analisi DBML](#s2)
- [Grammatica](#s2a)
- [Estensibilità](#s2b)
- [Limitazioni](#s2c)
- [3. Analisi ExpreSQL](#s3)
- [Modello semantico](#s3a)
- [Struttura post-refactoring](#s3b)
- Mappatura
- [4. Costrutti → DBML](#s4)
- [Tabelle e colonne](#s4a)
- [Tipi di dato](#s4b)
- [Relazioni (FK)](#s4c)
- [Vincoli e indici](#s4d)
- [Direttive tabella](#s4e)
- [Annotazioni](#s4f)
- Analisi
- [5. Gap analysis](#s5)
- [ESQL senza equiv.](#s5a)
- [DBML aggiunge](#s5b)
- [6. Opzioni di implementazione](#s6)
- [7. Raccomandazione](#s7)
- [8. Piano di implementazione](#s8)
- [9. Consumer programmatici](#s9)
- [DDL Oracle custom](#s9a)
- [ERD viewer React](#s9b)
- [10. Questioni aperte](#s10)
- [11. Conclusione](#s11)

Documento di Specifica Tecnica

# ExpreSQL → DBML: analisi di fattibilità e piano di integrazione

**Versione** 1.0 — draft

**Stato** In revisione

**Progetto** Radicle ExpreSQL

**DBML** @dbml/core 10.2.0

**Abstract.** Questo documento analizza la fattibilità tecnica di integrare DBML (Database Markup Language, Holistics) come formato di output di ExpreSQL. Esamina la grammatica e i limiti di DBML, il modello semantico del compilatore ExpreSQL dopo il recente refactoring, e produce una mappatura costrutto-per-costrutto con grado di copertura. Si identificano quattro opzioni di implementazione e si raccomanda un *DBML Exporter* (ExpreSQL → DBML) come primo passo: la direzione con il miglior rapporto valore/sforzo, che apre integrazione nativa con dbdiagram.io e dbdocs.io senza richiedere di ri-implementare la logica DDL.

## 1 Sommario esecutivo

DBML è uno schema markup language leggero, database-agnostico, che ha acquisito ampia adozione come formato di documentazione e visualizzazione. Nativamente supportato da **dbdiagram.io** e **dbdocs.io**, è anche il formato di input/output di `@dbml/core` (parser, exporter, importer per SQL di quattro dialetti) e di `@dbml/connector` (database introspection). La sua community è attiva e il tooling maturo.

ExpreSQL è un compilatore completo: al momento della generazione conosce strutturalmente ogni aspetto dello schema (tipi, nullability, PK, FK, vincoli, indici, annotazioni, relazioni implicite dal tree indentato). Questo rende la produzione di DBML tecnicamente diretta per il sottoinsieme che DBML copre.

**La buona notizia**: la maggior parte delle primitive fondamentali di schema (tabelle, colonne, tipi, PK, FK, vincoli, indici) ha un equivalente DBML diretto. Il modello semantico di ExpreSQL è *più ricco* di quello che DBML può esprimere, non il contrario.

**La sfida**: le funzionalità Oracle-specifiche di ExpreSQL (TAPI layered, ORDS, versioning SCD2, tenant multi-schema, trigger-based upper/lower, domain types, duality views) non hanno equivalenti in DBML. La strategia raccomandata è mappare i costrutti fondamentali con piena fedeltà e serializzare le funzionalità avanzate come *metadati custom* nel formato `[key: "value"]` di DBML, dove il consumer (dbdiagram.io) li ignora ma altri tool possono leggerli.

## 2 Analisi DBML

### Grammatica — costrutti principali

DBML (v2, parser `@dbml/parse`) supporta i seguenti costrutti di primo livello:

| Costrutto | Sintassi | Note |
| --- | --- | --- |
| **Project** | `Project name { database_type: 'Oracle' }` | Metadati del progetto; un solo blocco per file |
| **Table** | `Table [schema.]name [as alias] { … }` | Schema default `public` |
| **Column** | `name type [settings]` | Tipi liberi (stringhe); tipi con spazi tra virgolette doppie |
| **Index** | Blocco `indexes { … }` nella tabella | Supporta composite, unique, hash, expression |
| **Check** | Blocco ``checks { \`expr\` [name] }`` | A livello tabella o inline con `` check: \`expr\` `` |
| **Ref** | `Ref: t1.col < t2.col` | Inline, short form, block form; composite FK; cross-schema |
| **Enum** | `enum [schema.]name { val1 val2 }` | Valori possono portare `note` |
| **TableGroup** | `TableGroup name { table1 table2 }` | Visualizzazione; supporta colori e note |
| **TablePartial** | `TablePartial name { … }` | Template di colonne riusabile con `~name` |
| **Records** | `records { val, val, val }` | Dati di esempio; uno per tabella; `[example]` li esclude dagli INSERT |
| **Note / Sticky** | `Note name { 'text' }` | Annotazione canvas; colore personalizzabile |
| **Dep** | `Dep: t1 -> t2` | Data lineage; non ha equivalente DDL |
| **Metadata** | `Metadata Table users { owner: 'hr' }` | Proprietà custom su elementi esistenti |
| **DiagramView** | `DiagramView name { Tables { * } }` | Vista filtrata del diagramma |

**Cardinalità FK supportata**: `-` (1:1), `<` (1:N), `>` (N:1), `<>` (N:M). Ogni lato accetta il modificatore `?` per l'opzionalità. Gli exporter SQL emettono solo FK strutturali; la cardinalità viene persa nella conversione DDL → SQL.

### Estensibilità

DBML non ha un API di plugin per estendere la grammatica. Le uniche forme di estensione disponibili per i consumer sono:

- **Custom properties** — qualsiasi coppia `key: "value"` nelle impostazioni `[…]` di tabella, colonna, TableGroup e Note. Vengono preservate nel modello JSON e ignorate dagli exporter SQL.
- **Blocchi Metadata** — aggiungono proprietà custom a elementi già definiti (anche cross-file).
- **Module system** — `use * from './path'` / `reuse` per composizione multi-file.

Questo significa che le funzionalità ExpreSQL senza equivalente DBML devono essere serializzate come metadati custom, non come costrutti di prima classe.

### Limitazioni note

- Tipi con spazi devono essere racchiusi tra doppi apici: `"timestamp with time zone"`.
- Ref inline (`ref: > table.col`) non supporta ON DELETE/UPDATE né colore.
- Un solo blocco `records` per tabella.
- Nessun supporto per: stored procedure, trigger, sequenze, view, materialized view, partitioning, tablespace, collation, deferrable constraints, foreign data wrappers.
- Il formato non è estendibile a livello grammaticale: nuovi costrutti richiedono modifiche al parser di Holistics.
- Schema nidificati (`a.b.c`) non supportati: solo un livello di qualifica (`schema.table`).

## 3 Analisi ExpreSQL

### Modello semantico al momento della generazione

Il compilatore ExpreSQL espone un **modello semantico completo** al momento della generazione. Attraverso `DdlNode` e `OracleTableApiModel`, un generator conosce strutturalmente:

| Proprietà | API | Tipo |
| --- | --- | --- |
| Nome colonna / tabella | `node.parseName()` | `string` |
| Tipo base colonna | `node.inferType()` | `'varchar'\|'number'\|'date'\|…` |
| Tipo completo (lunghezza, spec numerica) | `node._inferTypeFull()` | `SemanticType` |
| NOT NULL | `node.isOption('nn')` | `boolean` |
| UNIQUE (colonna) | `node.isOption('unique')` | `boolean` |
| INDEX non-unique | `node.isOption('idx')` | `boolean` |
| PRIMARY KEY | `node.getPkName()`, `node.getExplicitPkName()` | `string \| null` |
| Foreign key target | `node.refId()`, `node.fks` | `string \| null` |
| ON DELETE CASCADE / SET NULL | `node.isOption('cascade'\|'setnull')` | `boolean` |
| DEFAULT value | `node.getDefaultValue()` | `string \| null` |
| CHECK (lista valori) | `node.getValues('check')` | `string` |
| BETWEEN lo, hi | `node.getBetweenClause()` | `string \| null` |
| Commento / nota | `node.comment` | `string \| null` |
| Annotazioni Oracle | `node.getAnnotationPairs()` | `Array<{label,value}>` |
| Relazione parent-child | struttura ad albero `node.children` | `DdlNode[]` |
| Direzione (many-to-one) | `node.isMany2One()` | `boolean` |
| TAPI tier | `model.tier` | `string` |
| Dati sample | `node.cardinality()` | `number` |

### Struttura post-refactoring

Dopo il recente refactoring, il codice Oracle è organizzato in:

- `src/oracle/plsql/table-model.ts` — `OracleTableApiAnalyzer`: produce il modello stabile `OracleTableApiModel` per ogni tabella con TAPI. Questo è il punto di partenza da cui un DBML generator deve leggere le informazioni strutturate.
- `src/oracle/plsql/layered/` — sei renderer specializzati per tier (dal, hooks, service, app, rest, audit) + orchestrator.
- `src/oracle/generator.ts` — `OracleDDLGenerator`: genera DDL tramite `generateFullDDL()`.
- `src/compiler/base-generator.ts` — logica condivisa, incluso `generateERD()`.
- `src/compiler/factory.ts` — registro dialect: `registerGenerator(dialect, factory)`.

Un **DBML generator** si inserirebbe come nuovo dialect (o come metodo aggiuntivo nel base generator), con accesso diretto al forest di nodi parsed.

## 4 Mappatura costrutti ExpreSQL → DBML

PIENA Mappatura completa, nessuna perdita PARZIALE Traduzione approssimata o con perdita NESSUNA Nessun equivalente DBML METADATI Serializzabile come custom property

### Tabelle e colonne

| ExpreSQL | DBML equivalente | Copertura |
| --- | --- | --- |
| Tabella (nodo con figli) | `Table name { … }` | PIENA |
| `schema` setting | `Table schema.name { … }` | PIENA |
| `prefix` setting | Prefisso nel nome tabella; nessun costrutto DBML dedicato | PIENA |
| Colonna (figlio non-tabella) | `col_name col_type [settings]` | PIENA |
| Commento `-- text` / `[text]` | `note: 'text'` nella column | PIENA |
| Commento su tabella | `Note: 'text'` nel blocco tabella | PIENA |
| Annotazione `{DESCRIPTION 'text'}` | `note: 'text'` (column o table) | PIENA |
| Altre annotazioni `{Key 'value'}` | `[Key: "value"]` come custom property | METADATI |
| Vista join (`name_v = t1 t2`) | Nessun equivalente; DBML non modella le view | NESSUNA |
| Duality view (`dv`) | Nessun equivalente | NESSUNA |

### Tipi di dato

| ESQL shorthand | SemanticType.base | DBML type | Copertura |
| --- | --- | --- | --- |
| `vc`, `vcN`, `vc4k` | `varchar` | `varchar(N)` | PIENA |
| `num`, `num(p,s)` | `number` | `decimal` / `decimal(p,s)` | PARZIALE — Oracle `NUMBER` ≠ `decimal` in precisione arbitraria |
| `int`, `integer` | `integer` | `int` | PIENA |
| `date` | `date` | `date` | PIENA |
| `ts` | `timestamp` | `timestamp` | PIENA |
| `tswtz`, `tstz` | `tswtz` | `"timestamp with time zone"` | PIENA — richiede virgolette doppie in DBML |
| `tswltz` | `tswltz` | `"timestamp with local time zone"` | PIENA |
| `bool`, `boolean` | `boolean` | `boolean` | PIENA |
| `clob` | `clob` | `text` | PARZIALE — approssimazione; DBML non ha CLOB nativo |
| `blob` | `blob` | `blob` | PIENA |
| `json` | `json` | `json` | PIENA |
| `vect`, `vectN` | `vector` | `"vector(*,*,*)"` o `"vector(N,*,*)"` | PARZIALE — Oracle 23ai specific; DBML lo accetta come tipo libero |
| `geometry` | `geometry` | `"SDO_GEOMETRY"` | PARZIALE — tipo libero |
| `file` | `blob` | Colonne espanse: `_filename`, `_mimetype`, etc. | PARZIALE — DBML deve ricevere le colonne esplicite |
| `/domain name` | domain name | `name` (tipo passthrough) | PIENA — DBML accetta qualsiasi stringa come tipo |
| PK guid (`to_number(sys_guid()…)`) | auto-PK | ``[default: `sys_guid()`]`` | PARZIALE — espressione come stringa backtick |
| PK identity | auto-PK | `increment` | PIENA |
| PK sequence | auto-PK | ``[default: `seq.NEXTVAL`]`` | PARZIALE — DBML non ha il concetto di sequenza |

### Relazioni (Foreign Key)

ExpreSQL

```
departments
  name /nn
  employees       -- figlio implicito → FK
    name /nn
    salary num

orders
  customer /fk customers /nn
  > products      -- many-to-one
```

DBML equivalente

```
Table departments { ... }
Table employees { ... }
Ref: employees.departments_id > departments.id

Table orders { ... }
Ref: orders.customer_id > customers.id [delete: restrict]
Ref: orders.products_id > products.id
```

| Relazione ESQL | DBML | Copertura |
| --- | --- | --- |
| Parent-child implicito (indentazione) | `Ref: child.parent_id > parent.id` | PIENA |
| `/fk table` esplicito | `Ref: table.col > target.id` | PIENA |
| Star schema `> table` | `Ref: fact.dim_id > dim.id` | PIENA |
| `/cascade` | `[delete: cascade]` | PIENA |
| `/setnull` | `[delete: set null]` | PIENA |
| FK col con `/nn` (mandatory) | Side optionality `<` vs `<?` | PIENA |
| Composite FK (tenant_id + col) | `Ref: t.(tenant_id, col) > parent.(tenant_id, id)` | PIENA — DBML supporta FK composite |
| N:M (bridge table) | Tabella DBML normale con due FK; eventualmente `<>` | PARZIALE — il tipo bridge non è un costrutto DBML |
| Self-referential FK | `Ref: table.parent_id > table.id` | PIENA |

### Vincoli e indici

| ESQL | DBML | Copertura |
| --- | --- | --- |
| `/nn` | `not null` | PIENA |
| `/unique` (colonna) | `unique` | PIENA |
| `/pk` | `pk` | PIENA |
| `/default val` | `default: val` / `default: 'str'` / \`\` default: \`expr\` \`\` | PIENA |
| `/check val1,val2` | \`\` check: \`col in ('val1','val2')\` \`\` oppure `Enum` DBML | PARZIALE — stringa costruita; perdita dei valori tipati |
| `/check (expr)` arbitrario | \`\` check: \`expr\` \`\` | PIENA |
| `/between lo and hi` | \`\` check: \`col between lo and hi\` \`\` | PIENA |
| `/idx` (indice colonna) | Blocco `indexes { col_name }` | PIENA |
| Table-level `/pk col1,col2` | `indexes { (col1, col2) [pk] }` | PIENA |
| Table-level `/unique col1,col2` | `indexes { (col1, col2) [unique] }` | PIENA |
| Vincoli tenant-scoped (unique con tenant_id) | `indexes { (tenant_id, col) [unique] }` | PIENA |

### Direttive tabella Oracle-specifiche

| ESQL | Strategia DBML | Copertura |
| --- | --- | --- |
| `/api [tier]` | `[esql_api: "full+hks"]` custom property | METADATI |
| `/auditcols` | Colonne espanse: `created`, `created_by`, `updated`, `updated_by` + property `[esql_auditcols: "yes"]` | PARZIALE |
| `/rowversion` | Colonna `row_version` esplicita + property | PARZIALE |
| `/rowkey` | Colonna `row_key` esplicita + property | PARZIALE |
| `/audit` | `[esql_audit: "yes"]` | METADATI |
| `/auditlog` | `[esql_auditlog: "yes"]` | METADATI |
| `/rest` | `[esql_ords: "yes"]` | METADATI |
| `/immutable` | `[esql_immutable: "yes"]` | METADATI |
| `/soda` | `[esql_soda: "yes"]` | METADATI |
| `/versioned` | Colonne `valid_from`, `valid_to`, `is_current` + property | PARZIALE — semantica SCD2 persa |
| `/businesskey col` | Property + indice su business key | METADATI |
| `/flashback` | `[esql_fda: "archive_name"]` | METADATI |
| `/compress` | `[esql_compress: "yes"]` | METADATI |
| `/trans` (colonna) | Nessuna rappresentazione; tabella `_trans` può essere emessa separatamente | NESSUNA |
| `/bridge` | Tabella DBML normale (N:M implicita); semantica bridge persa | PARZIALE |
| `/aggregate` | `[esql_aggregate: "yes"]` | METADATI |
| `/upper`, `/lower` | `[esql_case: "upper"]` | METADATI — trigger non rappresentabile |
| `/lockmode` | `[esql_lockmode: "wait:10"]` | METADATI |
| `/notenantid` | `[esql_notenantid: "yes"]` | METADATI |
| `/insert N` | Blocco `records { … } [example]` | PARZIALE — dati generabili con seed deterministico |
| `/history` | `[esql_history: "yes"]` | METADATI |
| `/colprefix` | Colonne già espanse nel modello; la direttiva diventa trasparente | PIENA |

### Annotazioni e settings → DBML

| ESQL | DBML | Copertura |
| --- | --- | --- |
| Setting `tenantid: yes` + colonna `TENANT_ID` | Colonna esplicita con FK a `tenants` | PARZIALE |
| Setting `dimensioncolumns` | Property custom + RLS view come Note | METADATI |
| Setting `api: layered` | Property custom su Project block | METADATI |
| Setting `db: 23ai` | `Project { database_type: 'Oracle 23ai' }` | PIENA |
| Setting `prefix`, `schema` | Schema qualificato + prefisso nel nome tabella | PIENA |
| Annotation `{TGROUP 'name'}` | `TableGroup name { table }` | PIENA |

## 5 Gap analysis

### ExpreSQL → DBML: funzionalità senza equivalente strutturale

Le seguenti funzionalità di ExpreSQL non hanno una rappresentazione strutturale in DBML e richiedono una decisione esplicita su come (o se) serializzarle:

| Funzionalità ESQL | Impatto sulla perdita | Strategia consigliata |
| --- | --- | --- |
| `TAPI layered` (tutti i tier) | Alto — ragion d'essere di ExpreSQL | Custom property `[esql_api: "full+hks"]`; round-trip possibile se ExpreSQL legge il DBML |
| PL/SQL packages (`_dal`, `_svc`, etc.) | Totale — non rappresentabile | Esclusi dall'export DBML; nota nel Project block |
| Trigger (`/upper`, `/lower`, `/versioned`, `/rowversion`) | Alto | Custom property + colonne espanse dove applicabile |
| Viste join e duality views | Medio — perdita di definizione view | Skip o Note DBML con testo della definizione |
| SCD2 (`/versioned`, `/businesskey`) | Alto — semantica temporale persa | Colonne espanse + custom properties |
| Multi-tenancy (`tenantid`, `tenant_ctx`) | Medio | Colonne tenant esplicite + proprietà |
| `dimensioncolumns` / RLS | Alto — security pattern perso | Custom property; view `_rls` come Note |
| ORDS (`/rest`) | Basso per lo schema; ORDS è applicativo | Custom property `[esql_ords: "yes"]` |
| Traduzioni (`/trans`) | Alto — generazione tabella `_trans` | Emettere la tabella `_trans` come tabella DBML separata |
| FDA (`/flashback`) | Basso — DBA config | Custom property |
| Oracle Annotations (`{Key 'val'}`) | Basso — metadati custom | Custom property DBML |
| INSERT sample data (`/insert N`) | Basso — documentazione | Blocco `records { } [example]` con dati generati |

### DBML aggiunge a ExpreSQL

Funzionalità presenti in DBML che ExpreSQL non supporta, e che aprono opportunità se si adottasse DBML come formato canonico:

| Funzionalità DBML | Opportunità per ExpreSQL |
| --- | --- |
| **Cardinalità esplicita** (`-`, `<>`, `?`) | ESQL conosce la mandatory da `/nn` sulla FK col; la cardinalità N:M viene inferita dai bridge. DBML permetterebbe di documentarlo esplicitamente. |
| **Enum DBML** | Le liste `/check val1,val2` in ESQL sono candidate naturali per enum DBML quando i valori sono pochi e stabili. Il generator potrebbe automaticamente estrarre gli enum. |
| **Module system** | ESQL è un file singolo. DBML multi-file permetterebbe di suddividere schemi grandi in sotto-moduli (per dominio, per servizio). |
| **Data lineage (Dep)** | ExpreSQL non ha il concetto di lineage; DBML lo aggiunge per uso con dbdocs.io. |
| **DiagramView** | Viste filtrate del diagramma per sotto-team o per dominio. |
| **TablePartial** | Analogo a un "mixin" di colonne. ExpreSQL potrebbe beneficiare di un costrutto simile (es. colonne audit come partial). |
| **Project block** | Metadati globali strutturati; ESQL ha solo il blocco `# settings = { … }`. |
| **Note (sticky)** | Annotazioni free-form sul canvas del diagramma. |
| **Metadata block** | Aggiungere proprietà a elementi esistenti senza modificare la definizione — utile per layering di metadati (es. sicurezza, ownership). |
| **Ref naming + color** | Ref nominabili e colorabili — utile per diagrammi con molte relazioni. |
| **Records con type checking** | Il type checking sui dati di esempio è più robusto del solo `/insert N`. |

**Osservazione chiave:** La direzione ExpreSQL → DBML comporta *perdita di informazioni* per le funzionalità Oracle-avanzate. La direzione DBML → ExpreSQL comporta invece *aggiunta di capacità* al modello — ma richiede di implementare un parser DBML e di adattare la pipeline di generazione. Le due direzioni non sono simmetriche nel costo e nel rischio.

## 6 Opzioni di implementazione

Opzione A — Raccomandata

DBML Exporter (ESQL → DBML)

Basso rischio Effort: 3 settimane

Nuovo generator `DBMLGenerator` che traversa il forest di nodi parsati e produce una stringa DBML. Si inserisce nel registry via `registerGenerator` o come metodo indipendente.

\+ Apre integrazione con dbdiagram.io e dbdocs.io

\+ Nessuna dipendenza su `@dbml/parse` in produzione

\+ Non altera la pipeline DDL esistente

− Perdita di informazioni per funzionalità Oracle-avanzate

− Round-trip non garantito senza Opzione B

Opzione B

DBML Importer (DBML → DDL)

Alto rischio Effort: 5–7 settimane

Implementare un parser DBML (usando `@dbml/parse` come dipendenza) che converte il modello DBML in un forest di `DdlNode`, poi usa la pipeline Oracle esistente per generare DDL.

\+ Permette agli utenti di portare DBML esistente in ExpreSQL

\+ Format alternativo di input

− Aggiunge dipendenza runtime `@dbml/core` (pesante)

− Le funzionalità TAPI, ORDS, ecc. devono essere emesse manualmente

− Duplica lo sforzo: DBML ha già exporter Oracle

Opzione C

Bridge bidirezionale (A + B)

Molto alto Effort: 8–12 settimane

Implementare entrambe le direzioni con un formato di interchange intermedio che preserva le funzionalità avanzate di ExpreSQL nei custom metadata DBML, e le ri-legge alla conversione inversa.

\+ Round-trip (quasi) fidelità tramite custom metadata

− Elevata complessità; il round-trip sarà sempre parziale

− Il DBML con custom properties pesanti non è leggibile da umani

− Doppio sforzo di test e manutenzione

Opzione D

DBML come output documentazione

Bassissimo rischio Effort: 1 settimana

Sottoinsieme di Opzione A: generare un `.dbml` come artefatto di documentazione quando si esegue la CLI con flag `--dbml`. Scope ridotto: solo le primitive fondamentali (tabelle, colonne, FK, indici). Nessun custom metadata Oracle.

\+ Rapidissimo da implementare

\+ Valore immediato per dbdiagram.io

− Schema DBML incompleto (mancano direttive avanzate)

− Non ri-usabile come round-trip

## 7 Raccomandazione

Si raccomanda di implementare l'**Opzione A — DBML Exporter**, con le seguenti scelte progettuali esplicite:

1. **Classe dedicata** `DBMLGenerator` che estende `BaseGenerator`. Non registrato come dialect (non è un DDL target); esposto come metodo `toDDBML()` su `expresql`, e come flag `--dbml` sulla CLI.
2. **Enum automatici**: i `/check val1,val2` con ≤ 10 valori e nomi validi come identifer generano un blocco `enum` DBML separato. Valori con spazi o espressioni arbitrarie restano come inline `check:`.
3. **Espansione colonne automatiche**: `/auditcols`, `/rowversion`, `/rowkey`, `tenantid` vengono espanse come colonne esplicite nel DBML — il DBML finale deve rappresentare lo schema fisico, non lo shorthand.
4. **Prefisso `esql_` su tutte le custom properties**: riduce rischi di collisione con eventuali future keyword DBML e identifica chiaramente le proprietà come metadati ExpreSQL.
5. **View ESQL**: skip totale — nessuna view in DBML. Una nota nel `Project` block documenta le view che sono state omesse.
6. **Dati sample**: se `cardinality() > 0`, generare il blocco `records { } [example]` con dati deterministici (seed fisso). Max 10 righe per non gonfiare il file.
7. **TableGroup**: emesso per ogni gruppo `TGROUP` distinto trovato nelle annotazioni.
8. **Project block**: emesso sempre con `database_type` derivato dal setting `db` e proprietà globali (prefix, schema, api tier globale).

**Nota sulla fidelità:** Il file DBML prodotto è destinato a strumenti di visualizzazione e documentazione (dbdiagram.io, dbdocs.io). Non è pensato per essere ri-importato in ExpreSQL. La perdita di informazioni per le funzionalità Oracle-avanzate è accettabile in questo contesto.

## 8 Piano di implementazione (Opzione A)

F-1

Core: tabelle, colonne, tipi

- Creare `src/dbml/generator.ts` — `DBMLGenerator`
- Traversal del forest, emissione blocchi `Table { }`
- Mapping `SemanticType` → DBML type string (inclusi tipi con spazi)
- Colonne: NOT NULL, PK (guid/identity/seq), DEFAULT, note da `node.comment`
- Project block con `database_type` e metadati globali

Stima: 4–5 giorni

F-2

Relazioni e vincoli

- FK resolution: parent-child implicito, `/fk` esplicito, star schema `>`
- Emissione blocchi `Ref: …` con ON DELETE actions
- Optionality: `<` vs `<?` derivata da `/nn` sulla FK col
- Composite FK (tenant_id + col)
- Indici: `/idx`, `/unique` colonna e tabella, composite PK
- CHECK: lista valori → enum automatico o inline check
- BETWEEN → check expression

Stima: 4–5 giorni

F-3

Metadati e costrutti avanzati

- Custom properties `[esql_*]` per tutte le direttive senza equivalente
- Espansione `/auditcols`, `/rowversion`, `/rowkey`, `tenant_id`
- Espansione `/versioned`: colonne `valid_from`, `valid_to`, `is_current`
- Espansione `/trans`: tabella `_trans` come tabella DBML separata
- TableGroup da annotazioni `{TGROUP 'name'}`
- Blocchi `records { } [example]` da `/insert N`
- Note tabella da commenti e `{DESCRIPTION}`

Stima: 4 giorni

F-4

Integrazione e test

- Export da `src/ddl.ts`: metodo `toDBML()` su classe `expresql`
- Flag CLI: `node bin/index.js --dbml file.esql`
- Pulsante "Copy DBML" nella web UI (output panel aggiuntivo)
- Test Vitest: fixture ESQL → snapshot DBML per i costrutti principali
- Validazione opzionale con `@dbml/parse` (dev dependency)

Stima: 3 giorni

**Totale stimato:** 15–17 giorni lavorativi. La F-1 e F-2 sono la parte più critica; F-3 e F-4 sono incrementali e possono essere ridotte per un MVP iniziale (Opzione D → Opzione A completa).

## 9 Consumer programmatici del DBML output

Il DBML prodotto da ExpreSQL non è pensato solo per essere aperto su dbdiagram.io: è un formato machine-readable che abilita integrazioni programmatiche. I due pattern seguenti mostrano casi d'uso concreti che giustificano l'Opzione A anche al di là della visualizzazione.

### Pattern 1 — DDL Oracle custom con TABLESPACE e storage clause

Il parser `@dbml/core` espone un API stabile che permette di leggere il DBML e rigenerare DDL con varianti non gestite da ExpreSQL (tablespace dedicato per ambiente, storage clause, grant espliciti). Il consumer legge il DBML di ExpreSQL come sorgente di verità e vi applica le customizzazioni DBA-specifiche a valle:

```
const { Parser } = require('@dbml/core');
const fs = require('fs');

const dbmlContent = fs.readFileSync('schema.dbml', 'utf-8');
const parser = new Parser();
const database = parser.parse(dbmlContent, 'dbmlv2');

// database.schemas[0].tables è già risolto (FK, enum, indexes)
database.schemas[0].tables.forEach(table => {
  const cols = table.fields.map(f =>
    `  ${f.name} ${f.type.type_name}${f.not_null ? ' NOT NULL' : ''}`
  ).join(',\n');

  // Customizzazione DBA: TABLESPACE e STORAGE non presenti in DBML
  console.log(`CREATE TABLE ${table.name} (\n${cols}\n) TABLESPACE USERS_DATA STORAGE (INITIAL 64K);`);
});
```

**Perché è rilevante**: questo pattern disaccoppia la definizione logica dello schema (ESQL → DBML) dalle scelte fisiche di deployment (tablespace, partitioning, compressione). Il DBML diventa un *intermediate representation* condiviso tra il team applicativo e il DBA, ognuno dei quali lavora sulla propria trasformazione.

**Integrazione con ExpreSQL**: i custom metadata `[esql_*]` emessi dall'exporter sono accessibili nel modello DBML come `field.settings` — un consumer può leggere `[esql_api: "full+hks"]` per decidere quali grant emettere o quali package si aspetta di trovare già installati.

### Pattern 2 — ERD viewer React con auto-layout Dagre

Il secondo pattern mostra come il DBML di ExpreSQL possa alimentare un componente React autonomo per la visualizzazione ERD — alternativa a AntV X6 attualmente usata nella web UI, e nativa in ambienti React/APEX:

```
import { Parser } from '@dbml/core';
import dagre from '@dagrejs/dagre';

export function parseDbmlToGraph(dbmlCode: string) {
  const database = new Parser().parse(dbmlCode, 'dbmlv2');
  const schema   = database.schemas[0];

  // Grafo Dagre per auto-layout left-to-right
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes = schema.tables.map((table: any) => {
    const h = 40 + table.fields.length * 25;
    g.setNode(table.name, { width: 200, height: h });
    return {
      id:   table.name,
      data: { label: table.name, fields: table.fields.map((f: any) => ({
        name: f.name, type: f.type.type_name, isPk: f.pk
      }))},
      position: { x: 0, y: 0 }   // sovrascritto da dagre.layout()
    };
  });

  const edges = schema.refs.map((ref: any, i: number) => {
    const src = ref.endpoints[0].tableName;
    const tgt = ref.endpoints[1].tableName;
    g.setEdge(src, tgt);
    return { id: `e-${i}`, source: src, target: tgt,
             label: ref.endpoints[0].relation };   // '<', '>', '-', '<>'
  });

  dagre.layout(g);

  return {
    nodes: nodes.map(n => {
      const p = g.node(n.id);
      return { ...n, position: { x: p.x - p.width / 2, y: p.y - p.height / 2 }};
    }),
    edges
  };
}
```

**Perché è rilevante**: ExpreSQL già genera ERD tramite `generateERD()` e lo rende con AntV X6 nella web UI. Il DBML output abilita un percorso alternativo: componenti React (React Flow, Mermaid, draw.io embed) che ricevono il DBML come stringa e ne gestiscono autonomamente il layout e la visualizzazione. Questo è particolarmente utile per:

- **Embedding in APEX**: un componente React embeddato in una pagina APEX che mostra l'ERD del modulo dati corrente, rigenerato automaticamente a ogni deploy dello schema.
- **Documentazione CI/CD**: nel pipeline di build, generare `schema.dbml` e caricarlo su dbdocs.io come documentazione sempre aggiornata.
- **Dependency checking**: usare i blocchi `Ref` del DBML per validare che le FK attese siano presenti nel DDL fisico in produzione, senza fare query sul dizionario Oracle.

| Scenario | Dipendenze npm | Integrazione con ESQL output |
| --- | --- | --- |
| dbdiagram.io / dbdocs.io | Nessuna (SaaS) | Upload diretto del file `.dbml` |
| DDL Oracle custom (DBA) | `@dbml/core` | Parse DBML → genera DDL con clausole fisiche |
| ERD React (React Flow) | `@dbml/core`, `@dagrejs/dagre`, `reactflow` | Parse DBML → nodi/archi React Flow con auto-layout |
| Mermaid ERD embed | `@dbml/core` | Parse DBML → emissione testo `erDiagram` Mermaid |
| Documentazione CI | `@dbml/cli` | `dbdocs build schema.dbml` nel pipeline |

## 10 Questioni aperte

1. **Enum automatici da `/check`**: qual è la soglia di cardinalità per generare un Enum DBML vs un inline check? (proposta: ≤ 10 valori, tutti identificatori validi)
2. **Dati sample (`/insert N`)**: generare records DBML con seed deterministico o skip? I records DBML fanno parte dello schema visibile in dbdiagram.io.
3. **View**: skip totale o emettere le view join come commento/Note? Le duality view (23ai) hanno ancora meno equivalente.
4. **Nome file di output**: `<input>.dbml` o sempre `schema.dbml`? Per la web UI: pannello separato o download?
5. **Schema default DBML**: dbdiagram.io usa `public` come default. Quando ExpreSQL non ha un `schema` setting, dobbiamo emettere nomi non qualificati o qualificarli con `public`?
6. **Dipendenza `@dbml/parse`**: la validazione post-generazione con il parser DBML è utile per test ma aggiunge \~2MB alla dev dependency. Vale?
7. **Tabella `_trans` da `/trans`**: la tabella di traduzione va emessa nel DBML? Porta un FK verso la tabella padre — il consumer DBML lo vedrebbe come relazione reale.
8. **Tenant context packages**: `tenant_ctx` e `tenant_bootstrap` sono package PL/SQL, non tabelle. Ometterli completamente o documentarli come Note?
9. **Ref naming**: DBML permette nomi su Ref. Usiamo i nomi dei constraint Oracle (`employees_dept_id_fk`) per garantire l'unicità nei diagrammi complessi?
10. **Multi-schema con prefix**: quando schema+prefix danno `core.r1_employees`, il nome DBML deve essere `Table core.r1_employees` o `Table employees` con `schemaName: core` e `alias: employees`?

## 11 Conclusione

Il modello semantico di ExpreSQL è **strutturalmente più ricco** di quello che DBML può rappresentare: DBML è un formato di documentazione e visualizzazione, non un compilatore DDL. La conversione ExpreSQL → DBML è quindi una proiezione verso un sottoinsieme, non un'operazione di round-trip.

Per le primitive fondamentali — tabelle, colonne, tipi, FK, vincoli, indici — la copertura è **piena o quasi piena** senza compromessi significativi. Per le funzionalità Oracle-avanzate (TAPI layered, trigger, ORDS, SCD2, multi-tenancy), la strategia dei custom metadata `[esql_*]` permette di preservare le informazioni in un formato che non interferisce con dbdiagram.io e che può essere letto da future integrazioni.

Il valore principale dell'integrazione non è la round-trip fidelity — che non è il design goal — ma l'**apertura dell'ecosistema**: gli schemi ExpreSQL diventano immediatamente condivisibili come diagrammi su dbdiagram.io, pubblicabili come documentazione su dbdocs.io, e interoperabili con i workflow DBML già in uso nei team che già utilizzano quel formato.

Si raccomanda di iniziare con la Fase 1 (tabelle, colonne, tipi) come spike di 2 giorni per validare l'approccio su un caso reale prima di procedere con le fasi successive.