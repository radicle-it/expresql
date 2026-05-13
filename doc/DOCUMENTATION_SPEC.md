# Specifica della Documentazione ExpreSQL <!-- omit in toc -->

**Versione:** 1.0  
**Data:** 2026-04-28  
**Autore:** Roberto Capancioni  
**Stato:** BOZZA — da approvare prima di avviare la scrittura

---

## Indice <!-- omit in toc -->

- [1. Obiettivi](#1-obiettivi)
- [2. Audience e casi d'uso](#2-audience-e-casi-duso)
- [3. Artefatti da produrre](#3-artefatti-da-produrre)
- [4. Inventario completo delle funzionalità](#4-inventario-completo-delle-funzionalità)
  - [4.1 Tipi di dato](#41-tipi-di-dato)
  - [4.2 Direttive di tabella](#42-direttive-di-tabella)
  - [4.3 Direttive di colonna](#43-direttive-di-colonna)
  - [4.4 Impostazioni (Settings)](#44-impostazioni-settings)
  - [4.5 Viste e schemi](#45-viste-e-schemi)
  - [4.6 Annotazioni](#46-annotazioni)
  - [4.7 Commenti](#47-commenti)
  - [4.8 Sezione `#document`](#48-sezione-document)
  - [4.9 API pubblica JavaScript](#49-api-pubblica-javascript)
  - [4.10 Integrazione Oracle MLE](#410-integrazione-oracle-mle)
- [5. Gap analysis — cosa manca nella documentazione attuale](#5-gap-analysis--cosa-manca-nella-documentazione-attuale)
  - [5.1 Gap nell'help drawer (index.html)](#51-gap-nellhelp-drawer-indexhtml)
  - [5.2 Gap in expresql-grammar.md](#52-gap-in-expresql-grammarmd)
  - [5.3 Gap nell'interfaccia impostazioni (Settings panel)](#53-gap-nellinterfaccia-impostazioni-settings-panel)
- [6. Struttura proposta degli artefatti](#6-struttura-proposta-degli-artefatti)
  - [6.1 Help Drawer (in-app)](#61-help-drawer-in-app)
  - [6.2 Documento di riferimento completo](#62-documento-di-riferimento-completo)
  - [6.3 Esempi pratici](#63-esempi-pratici)
- [7. Linee guida stilistiche](#7-linee-guida-stilistiche)
- [8. Priorità e roadmap](#8-priorità-e-roadmap)

---

## 1. Obiettivi

ExpreSQL è uno strumento maturo con un numero significativo di funzionalità implementate che non sono documentate o sono documentate parzialmente. Questo documento specifica **cosa** documentare, **per chi**, **in quale forma** e **in quale ordine di priorità**, prima di avviare la scrittura effettiva della documentazione.

Gli obiettivi della documentazione sono:

1. **Completezza:** ogni funzionalità implementata deve avere una voce in almeno uno degli artefatti documentali.
2. **Scopribilità:** l'utente deve poter trovare rapidamente la risposta alla domanda "come si fa X in ExpreSQL?".
3. **Progressività:** un principiante deve poter iniziare con i concetti base; un utente avanzato deve trovare i dettagli tecnici senza essere rallentato dall'introduzione.
4. **Manutenibilità:** la struttura della documentazione deve rendere semplice aggiungere sezioni per nuove funzionalità senza riscrivere tutto.

---

## 2. Audience e casi d'uso

| Audience | Livello ExpreSQL | Bisogno principale | Artefatto primario |
|---|---|---|---|
| **Sviluppatore applicativo** | Principiante–Intermedio | "Come definisco questo schema?" | Help drawer + esempi |
| **DBA Oracle** | Principiante ExpreSQL | "Che DDL viene generato?" | Grammar reference + esempi avanzati |
| **Architetto dati** | Intermedio–Avanzato | "Posso modellare schemi star/duality?" | Grammar reference §viste |
| **Sviluppatore di integrazione** | Avanzato | "Come uso l'API JS/MLE?" | doc/user/expresql-grammar.md + ORACLE_MLE_INTEGRATION.md |
| **Utente Oracle APEX** | Principiante | "Come configuro per APEX?" | Help drawer §impostazioni |

---

## 3. Artefatti da produrre

### Artefatto A — Help Drawer (in-app, `index.html`)

Aggiornamento dell'help drawer esistente. Attualmente incompleto: mancano direttive introdotte di recente, alcune impostazioni non sono descritte, i tipi di dato `vector` e `json` non compaiono, le annotazioni non sono menzionate.

- **Formato:** HTML compatto, massimo 2–3 righe per voce
- **Lingua:** Inglese (coerente con l'attuale contenuto)
- **Sezioni proposte:** vedere §6.1

### Artefatto B — Grammar Reference completo (`doc/user/expresql-grammar.md`)

Aggiornamento del documento esistente per colmare i gap elencati in §5.2. Deve essere il documento di riferimento tecnico definitivo.

- **Formato:** Markdown, tabelle, blocchi di codice con output DDL
- **Lingua:** Inglese
- **Sezioni proposte:** vedere §6.2

### Artefatto C — Raccolta esempi pratici (`doc/user/examples.md`)

Documento nuovo. Raccoglie scenari reali end-to-end con input QSQL e DDL output corrispondente. Serve sia a chi impara sia a chi cerca conferma sul comportamento di una feature.

- **Formato:** Markdown, sezioni per scenario
- **Lingua:** Inglese
- **Sezioni proposte:** vedere §6.3

### Artefatto D — Integrazione Oracle MLE (`ORACLE_MLE_INTEGRATION.md`)

Già aggiornato a v1.1 nella sessione corrente. Nessun gap aggiuntivo identificato al momento.

---

## 4. Inventario completo delle funzionalità

### 4.1 Tipi di dato

Ogni tipo deve essere documentato con: alias accettati, tipo Oracle generato, versione DB minima (se applicabile), note.

| Shorthand | Sinonimi | Tipo Oracle generato | Note |
|---|---|---|---|
| `num`, `number` | — | `NUMBER` | |
| `num(p,s)` | — | `NUMBER(p,s)` | precisione e scala |
| `int`, `integer` | — | `INTEGER` | |
| `d`, `date` | — | `DATE` o `TIMESTAMP*` | dipende da `#date` |
| `ts`, `timestamp` | — | `TIMESTAMP` | |
| `tstz`, `tswtz` | `timestamp with local time zone` | `TIMESTAMP WITH LOCAL TIME ZONE` | |
| `vc`, `varchar`, `varchar2`, `char`, `string` | — | `VARCHAR2(4000)` | lunghezza default |
| `vcNNN`, `vc(NNN)` | — | `VARCHAR2(NNN)` | es. `vc50` → `VARCHAR2(50)` |
| `vcNk` | — | `VARCHAR2(N*1024)` | es. `vc4k` → `VARCHAR2(4096)` |
| `vc32k` | — | `VARCHAR2(32767)` | richiede `longvc: true` |
| `clob` | — | `CLOB` | |
| `blob` | — | `BLOB` | |
| `json` | — | `JSON` (23c+) o `CLOB CHECK(col IS JSON)` | comportamento condizionale su `#db` |
| `file` | — | `BLOB` + 4 colonne ausiliarie | `_FILENAME`, `_CHARSET`, `_MIMETYPE`, `_LASTUPD` |
| `boolean`, `bool` | — | `BOOLEAN` (23c+) o `NUMBER(1)` o `CHAR(1)` | dipende da `#boolean` e `#db` |
| `geometry`, `sdo_geometry` | — | `SDO_GEOMETRY` | |
| `vector`, `vect` | — | `VECTOR(*,*,*)` | 23c+ |
| `vectNNN`, `vect(NNN)` | — | `VECTOR(NNN,*,*)` | dimensionalità fissa |
| `<domain_name>` con `/domain` | — | tipo dominio SQL | 23ai+, vedere §4.3 |

**Da documentare:** i tipi `vector`/`vect` e `file` non compaiono nell'help drawer attuale. Il tipo `json` non è elencato nella tabella dell'help. Il comportamento condizionale di `boolean` in funzione di `#db` e `#boolean` non è spiegato da nessuna parte.

---

### 4.2 Direttive di tabella

Queste direttive si applicano a livello di riga-tabella (stessa indentazione del nome tabella, dopo il nome).

| Direttiva | Sinonimi | Comportamento | Versione DB | Documentato |
|---|---|---|---|---|
| `/api` | — | Genera package PL/SQL CRUD + AUDIT ALL | tutte | parzialmente |
| `/audit` | — | AUDIT ALL ON \<table\> | tutte | sì |
| `/auditcols` | `/audit cols`, `/audit columns` | Aggiunge CREATED, CREATED_BY, UPDATED, UPDATED_BY + trigger | tutte | sì |
| `/auditlog` | — | Package audit con `PRAGMA AUTONOMOUS_TRANSACTION` | tutte | **no** |
| `/check` | — | Vincolo CHECK a livello tabella | tutte | sì |
| `/colprefix <pref>` | — | Prefissa tutte le colonne della tabella | tutte | sì |
| `/compress`, `/compressed` | — | CREATE TABLE … COMPRESS | tutte | sì |
| `/flashback`, `/fda <name>` | — | Abilita Flashback Data Archive | 12c+ | sì |
| `/history` | — | Temporal history tracking | 23c+ | **no** |
| `/immutable` | — | Tabella append-only (trigger blocca UPDATE/DELETE) | 21c+ | **no** |
| `/insert NN` | — | Genera NN INSERT con dati casuali (max 1000) | tutte | sì |
| `/pk` | — | Chiave primaria composita a livello tabella | tutte | sì |
| `/rest` | — | REST-abilita la tabella via ORDS | tutte | sì |
| `/rowversion` | — | Aggiunge colonna ROW_VERSION con trigger auto-increment | tutte | **no** |
| `/soda` | — | Tabella collection SODA con schema fisso | 21c+ | **no** |
| `/unique`, `/uk` | — | Vincolo UNIQUE a livello tabella | tutte | sì |
| `{annotation}` | — | Annotazioni Oracle SQL; `DESCRIPTION` genera COMMENT ON | 23c+ | parzialmente |

**Critico:** `/auditlog`, `/history`, `/immutable`, `/rowversion`, `/soda` non compaiono né nell'help drawer né nella tabella del grammar reference.

---

### 4.3 Direttive di colonna

Queste direttive si applicano a livello di colonna, dopo il nome colonna e prima o dopo il tipo di dato.

| Direttiva | Sinonimi | Comportamento | Documentato |
|---|---|---|---|
| `/nn`, `/not null` | — | Vincolo NOT NULL | sì |
| `/pk` | — | Identifica la colonna come PK | sì |
| `/unique`, `/uk` | — | Vincolo UNIQUE | sì |
| `/index`, `/idx`, `/indexed` | — | Indice non-unique | sì |
| `/fk <table>` | `/references`, `/reference` | FK verso un'altra tabella | sì |
| `/cascade` | — | ON DELETE CASCADE sulla FK | sì |
| `/setnull` | — | ON DELETE SET NULL sulla FK | sì |
| `/check <A,B,...>` | — | CHECK IN (A, B, …) | sì |
| `/between <A> and <B>` | — | CHECK BETWEEN A AND B | sì |
| `/default <val>` | — | DEFAULT value | sì |
| `/upper` | — | Trigger: forza maiuscolo | sì |
| `/lower` | — | Trigger: forza minuscolo | sì |
| `/insert <N>` | — | Override dati per questa colonna (N valori) | sì |
| `/values <v1,v2,...>` | — | Valori personalizzati per INSERT casuali | sì |
| `/constant <val>` | — | Valore costante per INSERT casuali | sì |
| `/domain <domain_name>` | — | Usa SQL Domain 23ai+ come tipo colonna | sì |
| `/trans`, `/translation`, `/translations` | — | Colonna multilingue: genera _trans + _resolved | **parzialmente** |
| `{annotation}` | — | Annotazioni Oracle SQL; `DESCRIPTION` genera COMMENT ON COLUMN | **parzialmente** |

**Da documentare:** il comportamento completo di `/trans` (quali tabelle genera, come funziona `_resolved`, il ruolo di `transcontext`). Le annotazioni a livello colonna.

---

### 4.4 Impostazioni (Settings)

Le impostazioni si specificano con `# chiave: valore` oppure `# settings = { chiave: valore, ... }`.

#### Gruppo: Chiave Primaria

| Impostazione | Valori | Default | Descrizione | Documentato |
|---|---|---|---|---|
| `pk` | `identity`, `guid`, `seq`, `none` | `identity` | Tipo di PK generata automaticamente | sì |
| `genpk` | `true`, `false` | `true` | Genera automaticamente colonna PK (ID) | sì |
| `prefixpkwithtname` | `true`, `false` | `false` | Prefissa ID con il nome tabella (es. EMPLOYEE_ID) | sì |

#### Gruppo: Nomi e Schema

| Impostazione | Valori | Default | Descrizione | Documentato |
|---|---|---|---|---|
| `prefix` | stringa | — | Prefisso per tutti gli oggetti DB | sì |
| `schema` | stringa | — | Schema Oracle da anteporre agli oggetti | sì |
| `createdcol` | stringa | `created` | Nome colonna timestamp creazione (audit) | sì |
| `createdbycol` | stringa | `created_by` | Nome colonna utente creazione (audit) | sì |
| `updatedcol` | stringa | `updated` | Nome colonna timestamp aggiornamento (audit) | sì |
| `updatedbycol` | stringa | `updated_by` | Nome colonna utente aggiornamento (audit) | sì |
| `namelen` | numero | 128 | Lunghezza massima identificatori Oracle | **no** |
| `datalimit` | numero | — | Limite righe INSERT generate | **no** |

#### Gruppo: Tipi di dato

| Impostazione | Valori | Default | Descrizione | Documentato |
|---|---|---|---|---|
| `db` | `11g`, `12c`, `19c`, `21c`, `23c`, `26ai` | `19c` | Versione DB target; influenza JSON, BOOLEAN, VECTOR | sì |
| `date` | `date`, `timestamp`, `tswtz`, `tswltz` | `date` | Tipo Oracle per colonne DATE | sì |
| `boolean` | `native`, `yn` | da `#db` | Rappresentazione BOOLEAN | sì |
| `semantics` | `char`, `byte` | — | Semantica VARCHAR2 (CHAR/BYTE) | sì |
| `longvc` | `true`, `false` | `false` | Abilita VARCHAR2(32767) invece di 4000 | sì |
| `language` | `EN`, `DE`, `JP`, `KO` | `EN` | Lingua dati INSERT casuali | sì |

#### Gruppo: Colonne auto-generate

| Impostazione | Valori | Default | Descrizione | Documentato |
|---|---|---|---|---|
| `auditcols` | `true`, `false` | `false` | Aggiunge 4 colonne audit a tutte le tabelle | sì |
| `rowversion` | `true`, `false` | `false` | Aggiunge ROW_VERSION con trigger | sì |
| `rowkey` | `true`, `false` | `false` | Aggiunge ROW_KEY alfanumerico con trigger | sì |
| `aienrichment` | `true`, `false` | `false` | Aggiunge metadati AI enrichment (26ai+) | **no** |
| `tenantid` | `true`, `false` | `false` | Aggiunge TENANT_ID per multi-tenancy | sì |
| `transcontext` | espressione SQL | `sys_context('APP_CTX','LANG')` | Espressione lingua per viste _resolved | sì |

#### Gruppo: Output e funzionalità

| Impostazione | Valori | Default | Descrizione | Documentato |
|---|---|---|---|---|
| `drop` | `true`, `false` | `false` | Antepone DROP agli oggetti | sì |
| `inserts` | `true`, `false` | `true` | Genera INSERT con dati casuali | **no** |
| `dv` | `true`, `false` | `false` | Abilita JSON Duality Views | **no** |
| `editionable` | `true`, `false` | `false` | Oggetti PL/SQL EDITIONABLE | **no** |
| `api` | `true`, `false`, `layered` | `false` | Genera TAPI package | sì |
| `apex` | `true`, `false` | `false` | Usa `APEX$SESSION` per audit | sì |
| `compress` | `true`, `false` | `false` | Compressione su tutte le tabelle | sì |

#### Gruppo: Controllo comportamento

| Impostazione | Valori | Default | Descrizione | Documentato |
|---|---|---|---|---|
| `overridesettings` | `true`, `false` | `false` | Ignora impostazioni UI, usa solo quelle in-script | sì |
| `verbose` | `true`, `false` | `false` | Mostra tutte le impostazioni nel DDL generato | sì |
| `resetsettings` | — | — | Ripristina tutte le impostazioni ai default | sì |

**Critico:** `inserts`, `dv`, `editionable`, `aienrichment`, `namelen`, `datalimit` non sono documentati da nessuna parte. `inserts: false` è particolarmente importante: permette di generare DDL pulito senza INSERT.

---

### 4.5 Viste e schemi

| Funzionalità | Sintassi | Descrizione | Documentato |
|---|---|---|---|
| Vista semplice | `view nome t1 t2` | JOIN view su più tabelle | sì |
| Vista alias | `nome = t1 t2` | Sintassi alternativa per view | sì |
| JSON Duality View | `dv nome root figlio...` | Duality view 23ai+; nidifica basandosi su FK | sì |
| Relazione molti-a-uno | `> table` | Indica dimensione in schema star | sì |
| Relazione uno-a-molti | `< table` | Default, solitamente omesso | sì |
| Schema snowflake | gerarchie `>` a più livelli | Tabelle dimensione annidate | sì (implicito) |

---

### 4.6 Annotazioni

| Funzionalità | Sintassi | Comportamento | Documentato |
|---|---|---|---|
| Annotazione chiave-valore | `{Key 'value'}` | `ANNOTATIONS(Key 'value')` nel DDL | sì |
| Annotazione flag | `{FlagKey}` | `ANNOTATIONS(FlagKey)` nel DDL | sì |
| Annotazione DESCRIPTION | `{DESCRIPTION 'testo'}` | Genera anche `COMMENT ON TABLE/COLUMN` | sì |
| Annotazione GROUP | `{GROUP 'nome'}` | Gruppo di annotazioni Oracle; genera `create_group()` | **no** |
| Annotazione su vista | `view v t1 {Key 'val'}` | Annotazione su view | **no** |
| AI enrichment automatico | `aienrichment: yes` + `db: 26ai` | Genera `metadata_annotations.set()` PL/SQL | **no** |

---

### 4.7 Commenti

| Sintassi | Comportamento |
|---|---|
| `-- testo` | Commento a riga singola; ignorato nel DDL |
| `/* testo */` | Commento multi-riga; ignorato nel DDL |
| `[testo]` | Commento inline (parentesi quadre); ignorato nel DDL |

---

### 4.8 Sezione `#document`

Quando il QSQL viene generato da un documento JSON, il documento originale viene preservato sotto `# document = <JSON>`. Questo documento viene usato per popolare il DB con dati realistici (al posto dei dati casuali di chancejs).

Esempio: `test/DV/car_racing/1.esql`.

---

### 4.9 API pubblica JavaScript

Documentata in `doc/user/expresql-grammar.md` solo indirettamente. Deve avere una sezione dedicata.

| Funzione | Firma | Ritorna | Note |
|---|---|---|---|
| `toDDL` | `toDDL(qsql, optionsJson?)` | `string` — DDL SQL | `optionsJson` è una stringa JSON, non un oggetto |
| `toERD` | `toERD(qsql, optionsJson?)` | oggetto grafo | per rendering ERD |
| `toErrors` | `toErrors(qsql)` | `Array<{from,to,message,severity}>` | array JS, non JSON string |
| `fromJSON` | `fromJSON(json)` | stringa QSQL | converte JSON → QSQL |
| `qsql_version` | `qsql_version()` | `string` | versione libreria |
| `registerGenerator` | `registerGenerator(name, cls)` | — | API estensione per generatori custom |
| `BaseGenerator` | classe | — | classe base per generatori custom |

La struttura di `toErrors` (con `from.line`, `to.line`, `severity`) non è documentata da nessuna parte nella user doc attuale.

---

### 4.10 Integrazione Oracle MLE

Documentata in `ORACLE_MLE_INTEGRATION.md` (v1.1, aggiornato nella sessione corrente). Copre:

- Architettura dei moduli MLE (`expresql_module`, `expresql_api_module`)
- Package PL/SQL `expresql_pkg` con 4 funzioni (`to_ddl`, `validate`, `to_erd`, `version`)
- Script di installazione (`mle/01_` → `mle/05_`)
- Workflow di aggiornamento (§10.4)
- Polyfill Buffer per GraalVM

Nessun gap critico identificato. Può essere referenziato da `expresql-grammar.md` ma non fa parte della documentazione utente standard.

---

## 5. Gap analysis — cosa manca nella documentazione attuale

### 5.1 Gap nell'help drawer (index.html)

L'help drawer attuale è organizzato in sezioni. Lacune identificate:

**Sezione Types:**
- [ ] `vector` / `vect` / `vectNNN` non elencato
- [ ] `file` non elencato
- [ ] `json` non elencato (o presente ma senza specificare comportamento 23c+ vs. legacy)
- [ ] `boolean` non spiega la differenza tra `native` e `yn`
- [ ] Manca nota su `vc32k` (richiede `longvc: true`)

**Sezione Table Directives:**
- [ ] `/auditlog` non presente
- [ ] `/history` non presente
- [ ] `/immutable` non presente
- [ ] `/rowversion` non presente
- [ ] `/soda` non presente
- [ ] Annotazioni `{...}` non menzionate

**Sezione Column Directives:**
- [ ] `/trans` / `/translation` non descritto nel suo comportamento completo
- [ ] Annotazioni `{...}` non menzionate
- [ ] `/domain` non presente

**Sezione Settings:**
- [ ] `inserts` non documentata
- [ ] `dv` non documentata
- [ ] `editionable` non documentata
- [ ] `aienrichment` non documentata
- [ ] `namelen` non documentata
- [ ] `datalimit` non documentata
- [ ] `boolean` presente ma senza spiegazione della dipendenza da `#db`

**Sezione mancante — Annotations:**
- [ ] Nessuna sezione dedicata ad annotazioni Oracle SQL nell'help drawer

**Sezione mancante — Comments:**
- [ ] Sintassi `--`, `/* */`, `[...]` non spiegata nell'help drawer

**Sezione mancante — API / Integration:**
- [ ] Nessun accenno all'API JavaScript nell'help drawer

---

### 5.2 Gap in expresql-grammar.md

**Tabella tipi di dato:**
- [ ] `vector`, `vectNNN` non presenti
- [ ] `file` presente ma senza spiegare le 4 colonne ausiliarie
- [ ] `json` non spiega il comportamento condizionale 23c+ vs. `CLOB CHECK IS JSON`
- [ ] `boolean` non spiega interazione con `#db` e `#boolean`

**Tabella direttive di tabella:**
- [ ] `/auditlog` mancante
- [ ] `/history` mancante
- [ ] `/immutable` mancante
- [ ] `/rowversion` mancante
- [ ] `/soda` mancante

**Tabella impostazioni:**
- [ ] `inserts` mancante
- [ ] `dv` mancante
- [ ] `editionable` mancante
- [ ] `aienrichment` mancante
- [ ] `namelen` mancante
- [ ] `datalimit` mancante
- [ ] Valore `layered` per `api` non documentato

**Sezione API:**
- [ ] Struttura di ritorno di `toErrors` non documentata (campi `from.line`, `to.line`, `severity`)
- [ ] `fromJSON` non documentata
- [ ] `registerGenerator` / `BaseGenerator` non documentati

**Grammatica ABNF (fondo documento):**
- [ ] `tableDirective` incompleto: mancano `/immutable`, `/soda`, `/history`, `/auditlog`, `/rowversion`
- [ ] `individual_setting` incompleto: mancano `inserts`, `dv`, `editionable`, `aienrichment`, `boolean`, `namelen`, `datalimit`
- [ ] `datatype` incompleto: mancano `vector`, `vectNNN`, alias `json`

---

### 5.3 Gap nell'interfaccia impostazioni (Settings panel)

Il pannello impostazioni UI (`web/settings.js`) non espone queste impostazioni pur essendo implementate:

- `inserts` (on/off INSERT generazione)
- `dv` (duality views)
- `editionable`
- `aienrichment`
- `namelen`
- `datalimit`
- `transcontext`

Queste impostazioni sono accessibili solo inline via `# chiave: valore`. Devono essere documentate esplicitamente come "only via inline settings" per evitare confusione.

---

## 6. Struttura proposta degli artefatti

### 6.1 Help Drawer (in-app)

Struttura proposta per l'help drawer aggiornato (in-app, `index.html`), con sezioni nell'ordine di utilizzo tipico:

```
1. Quick Start           — 3-4 righe: struttura base tabella/colonna, link a esempi
2. Tables                — direttive di tabella (tabella compatta, 1 riga per direttiva)
3. Columns               — direttive di colonna (tabella compatta)
4. Data Types            — tutti i tipi con shorthand e tipo Oracle risultante
5. Annotations           — sintassi {}, DESCRIPTION, GROUP
6. Views & Relationships — view, dv, >, <
7. Comments              — --, /* */, [...]
8. Settings              — tutte le impostazioni, raggruppate per categoria
9. Keyboard Shortcuts    — Tab, Enter, Esc, ecc.
10. API Reference (link) — link a doc/user/expresql-grammar.md
```

Ogni voce nelle tabelle deve avere: shorthand/sintassi, effetto in 5–8 parole, esempio minimo (1 riga), versione DB minima dove rilevante.

---

### 6.2 Documento di riferimento completo

Struttura proposta per `doc/user/expresql-grammar.md` aggiornato:

```
# ExpreSQL Grammar Reference

## 1. Overview
   1.1 Struttura di uno script QSQL (indentazione, relazioni)
   1.2 Come usare questo documento

## 2. Comments

## 3. Data Types
   — tabella completa con tutti i tipi, sinonimi, DB minima, note

## 4. Table Directives
   — tabella completa (inclusi /auditlog, /history, /immutable, /soda, /rowversion)
   — Star/Snowflake schema (>, <)

## 5. Column Directives
   — tabella completa (incluso /trans, /domain, annotazioni)
   — Dettaglio /trans: tabelle generate, ruolo transcontext, esempio DDL output

## 6. Views
   6.1 Vista semplice (view / =)
   6.2 JSON Duality View (dv) — 23ai+
   6.3 Schema Star/Snowflake (già in §4 ma con esempio completo)

## 7. Annotations
   7.1 Sintassi
   7.2 DESCRIPTION → COMMENT ON
   7.3 GROUP annotation
   7.4 AI Enrichment (aienrichment + db: 26ai)

## 8. Settings
   — tabelle per gruppo (PK, Nomi, Tipi, Colonne auto, Output, Comportamento)
   — per ogni impostazione: valori, default, descrizione, esempio inline, note
   — impostazioni solo-inline: esplicitate chiaramente

## 9. #document section

## 10. API JavaScript Reference
   10.1 toDDL
   10.2 toERD
   10.3 toErrors — struttura di ritorno con dettaglio campi
   10.4 fromJSON
   10.5 qsql_version
   10.6 Estensioni: registerGenerator, BaseGenerator

## 11. Grammar (ABNF)
   — grammatica completa aggiornata
```

---

### 6.3 Esempi pratici

Struttura proposta per `doc/user/examples.md`:

```
# ExpreSQL — Esempi pratici

## 1. Schema base con relazione padre-figlio
## 2. Audit columns e APEX
## 3. Chiave primaria composita e colprefix
## 4. Foreign key esterne al modello
## 5. Star schema (fact + dimensioni)
## 6. JSON Duality Views (23ai+)
## 7. Tabelle multi-lingua con /trans
## 8. Immutable table + Temporal history
## 9. SODA collection
## 10. Flashback Data Archive
## 11. Generazione dati con /insert, /values, /constant
## 12. Annotazioni Oracle SQL
## 13. Integrazione ORDS (/rest)
## 14. Table API (TAPI) con /api
## 15. Schema completo (combina più feature)
```

Ogni esempio deve includere: input QSQL, DDL output (o porzione rilevante), spiegazione in 2–3 frasi di cosa dimostra.

---

## 7. Linee guida stilistiche

1. **Lingua:** Inglese. La documentazione esistente è in inglese; mantenerla coerente.
2. **Tono:** tecnico-descrittivo, no marketing. Descrivere il comportamento, non promuovere lo strumento.
3. **Esempi:** ogni feature deve avere almeno un esempio QSQL → DDL. Preferire esempi che mostrano il comportamento di default e poi la variazione.
4. **Versioni DB:** indicare esplicitamente la versione Oracle minima richiesta per le funzionalità che non sono universali (`23c+`, `21c+`, `23ai+`).
5. **Terminologia coerente:**
   - "Table directive" (non "table option" o "table flag")
   - "Column directive" (non "column modifier")
   - "Setting" (non "parameter" o "option") per le impostazioni `#`
   - "ExpreSQL shorthand" o semplicemente "QSQL" per il linguaggio input
6. **Formattazione codice:** usare ` ```expresql ` per il codice input, ` ```sql ` per il DDL output.
7. **Tabelle:** usare tabelle Markdown per le reference veloci. Non superare 5 colonne per leggibilità.
8. **Note di versione:** usare badge inline `(23ai+)`, `(21c+)`, `(12c+)` immediatamente dopo il nome della feature.

---

## 8. Priorità e roadmap

### Fase 1 — Aggiornamento critico (blocca utenti)

Questi gap causano errori o confusione immediata:

1. **`inserts: false`** — manca; utenti che vogliono DDL pulito non trovano l'impostazione
2. **`/immutable`, `/soda`, `/history`** — introdotte di recente, non documentate da nessuna parte
3. **Struttura di ritorno `toErrors`** — chi usa l'API non sa come leggere gli errori
4. **Tipi `vector`, `json`** — missing nell'help per un tool che enfatizza 23ai+

### Fase 2 — Completamento reference

1. Tutte le impostazioni mancanti: `dv`, `editionable`, `aienrichment`, `namelen`, `datalimit`
2. Tabella direttive completa (inclusi `/auditlog`, `/rowversion`, `/flashback`)
3. Dettaglio `/trans` con output DDL completo
4. Annotazioni: sezione dedicata nell'help drawer
5. Grammatica ABNF aggiornata

### Fase 3 — Nuovi artefatti

1. `doc/user/examples.md` — raccolta esempi pratici
2. Sezione API JavaScript in `expresql-grammar.md`
3. Sezione "Quick Start" nell'help drawer
4. Aggiornamento Settings panel UI per esporre le impostazioni solo-inline

### Fase 4 — Qualità e manutenzione

1. Aggiunta test automatici per verificare che gli esempi nella doc producano il DDL dichiarato
2. Collegamento incrociato tra help drawer e grammar reference
3. Revisione della grammatica ABNF per completezza formale
