# Change Log

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## 2.3.1 — 2026-10-15

- `/import`: a row without its business key is refused only to `UPDATE`. With `UPSERT` it is a new row: an
  `{import 'auto'}` key is filled by the service (a product without a code gets one from its series), a required key
  is refused by the insert. Found by `prd_product` of ocean-code (phase I6 of its doc 38).

## 2.3.0 — 2026-10-15

- `/import`: a long load in a job of the scheduler (phase I5 of doc 38 of ocean-code). `<t>_imp.load` takes
  `p_commit_rows`; `load_async` queues the import (`imp_load_svc.queue`) and creates a one-off job `IMP_LOAD_<id>`
  (auto drop) whose action is `<t>_imp.run_job` -- the module that owns the importer creates it, no name travels as
  data; `run_job` puts the owner of the import in session (`imp_load_svc.begin_job`), loads with a commit every
  `imp_load_svc.commit_rows` rows, and keeps why it failed (`fail_job`). `<t>_imp_app.load` goes to the job above
  `IMP_SYNC_MAX_ROWS` rows (`imp_load_svc.async_wanted`).

## 2.2.1 — 2026-10-15

- `/import`: `{import 'auto'}` on a required column the service fills when it is empty (a number from a series): it
  is imported and can be the business key, but an insert does not require it. Found by `req_request.request_no` of
  ocean-code (phase I3 of its doc 38).
- `/import`: an update tells a changed field with `a != b or a is null and b is not null or a is not null and b is
  null`. The 2.2.0 test `not (a = b or a is null and b is null)` is null when one side is null, so an empty field the
  file gave a value stayed as it was and the row was `UNCHANGED` (found by `req_request.amount` on the database).

## 2.2.0 — 2026-10-15

- Oracle: **`/import [insert|upsert|update]`** on a table with a service (`service+hks`, `full+hks`) generates, after every API and every `_agg`, the importer of the table for the `imp_` module of ocean-code (its doc 38, phase I2): `<t>_key_vw` (the id and the business key flattened over the `_rls` views: a key column that is a foreign key becomes the key of the table it points to, with its name as prefix), `<t>_imp` (`describe`, the fields as json; `load(p_job_id, p_dry_run)`, the loop of `imp_load_svc` with one savepoint per row; `register_target` / `unregister_target` through `imp_registry_uc`) and `<t>_imp_app` (`check_job`, `load`, `register_target`, `unregister_target`). A row is converted with `imp_convert_svc` by the type of its column (TEXT with its length, INTEGER, DECIMAL, DAY, INSTANT, FLAG, a `/check` as a closed vocabulary), its foreign keys are resolved by the business key of the table they point to (`[IMP_LOOKUP]`, `[IMP_LOOKUP_PARTIAL]`, `[IMP_LOOKUP_AMBIGUOUS]`), the row is found by the table's business key (a `/unique` column, `{import_key 'y'}` to choose among more, or a table `/unique a, b`), the mode decides (`[IMP_EXISTS]`, `[IMP_NOT_FOUND]`), an update changes only the mapped fields (`UNCHANGED` when nothing changes), and the write goes through `<t>_svc` (hooks, permissions, RLS).
- Column annotations read by `/import`: `{import 'col, col'}` on a foreign key to a table of another model (the columns of its `<ref>_key_vw`, compared as text), `{import 'no'}` (not importable), `{label 'X'}`, `{label_it 'Y'}`; on the table `{label}`, `{label_it}`, `{resource 'R'}` (the resource of `aut_`, default the table name).
- **`/keyview`** generates only the key view of a table, for the tables other models point to.
- A declaration the importer cannot honour is an error of generation (the CLI exits 1 with the reason): a foreign key to another model without `{import '…'}`, a required foreign key left out, a table without a service, a `/versioned` table, a detail of an `/aggregate` (their importers are written by hand), `upsert`/`update` without a business key, an unknown mode.
- CLI: the process exits only once stdout is written. `process.exit` right after a large `console.log` cut the output read from a pipe or `$(…)` (1,482 lines of 6,495, no error).
- Without `/import` and `/keyview` every model of ocean-code (35) generates the same text as 2.1.4, the line of the version aside.

## 2.1.4 — 2026-10-15

- Compiler: the timestamp types are shortened (`timestamp` → `ts`, `… with time zone` → `tswtz`, `… with local time zone` → `tswltz`) only where a type is written, between the name and the first `/option` or `--` comment. `data_type vc20 /check NUMERIC, VARCHAR, DATE, TIMESTAMP, CLOB` generated `check (data_type in (…,'ts',…))`: the value `TIMESTAMP` was refused at runtime. Found by the `bic_` module of ocean-code (the BICC column types of a data store); every other model of ocean-code generates the same text.

## 2.1.3 — 2026-10-13

- Compiler: a type word inside a `/check` or `/values` list is a value, not the type of the column. `kind vc10 /check TEXT, NUMBER, DATE, FLAG` became a `date` column (with the midnight check of `dateonly`), and `NUMERIC` a `number`: the type keywords (`date`, `num…`, `vc`, `yn`/`boolean`, `vector`) are now read only between the name and the first `/option` (`DdlNode.indexOfType`). Found by the `ast_` module of ocean-code (the kind of the value of a feature).

## 2.1.2 — 2026-10-09

- Oracle: no `create index` on a `/unique` foreign-key column — the unique constraint already indexes it, and a second index on the same column list raises ORA-01408 at deploy.

## ExpreSQL fork

ExpreSQL is a fork of [Oracle's Quick SQL](https://github.com/oracle/quicksql)
maintained by Radicle IT, released under the same Universal Permissive
License v1.0. Versions and entries below `1.2.15` are inherited from the
upstream project.

## [2.1.1] - 2026-10-09

### Fixed

- Oracle: `/unique` (or `/uk`) on a foreign-key column was silently dropped (the inline
  `references` constraint was the only one rendered). Now the column gets a second inline
  constraint `<prefix>_<table>_<column>_unq unique`, in both the inline and the postponed
  (`alter table ... add constraint ... foreign key`) branches. Found by the `flw_` module of
  ocean-code (one draft per model, one owner per definition).

## [Unreleased]

### Bug Fixes

- **`/between`: the constraint takes the object prefix** — `<prefix>_<table>_<column>_bet`, like the `_ck` of a
  column and every other constraint: it was `<table>_<column>_bet`, so two modules with a table of the same name (a
  `port` or a `provider` in two modules of one schema) gave the same constraint name. The same rule in the diff
  generator (add and drop of a `/between`). **A database generated before** keeps the old names: rename them
  (`alter table <t> rename constraint <table>_<column>_bet to <prefix>_<table>_<column>_bet`) before using the diff
  generator on it. Found by `ocean-code` (2026-10-08). 2 tests in `test/unit/between.test.ts` (1142 green).
- **`/between` with a signed bound** — `/between -90 and 90` generated `check (lat between - and and)`: the
  bounds were read as the token after `/between` and the third one, and the lexer makes `-90` two tokens.
  `getBetweenClause` now reads them with `listValues`, which joins the tokens of one value (also decimals and
  options after the range). Found by `ocean-code` (latitude and longitude of a port, 2026-10-08). 4 tests in
  `test/unit/between.test.ts` (1140 green).

### Features

- **`/aggregate`: a detail is written through its aggregate (Oracle, 2.1.3)** — `<master>_agg` gets
  `update_<detail>(p_master_id, p_<pk>, p_rec <detail>_svc.t_rec[, p_row_version])`: the same ownership
  check as `remove_` (a row of another master is `[NOT_FOUND]`), then `before_update_<detail>` (record in
  out, FK forced back to the master), the detail's `update_rec`, `after_update_<detail>` — both new hooks in
  `<master>_agg_hks`. And the `_app` of a detail **with a `_svc`** delegates its writes to the aggregate:
  `ins` → `add_`, `upd` → `update_`, `del` → `remove_` (the master read from `<detail>_rls`); reads stay on
  the `_svc`, the spec is unchanged, so pages and callers do not change. Its body is emitted by the
  aggregate pass right after `<master>_agg` (the spec stays in place), so every object compiles in order.
  A `/versioned` detail delegates `ins` only (its aggregate has no `update_`/`remove_`); a detail without a
  `_svc` does not delegate (the `_agg` calls its `_app`, delegating back would loop). From the
  `ocean-code` package rule (11-livelli-package-e-log.md §1.3): a page reaches a detail through its
  aggregate, so the aggregate's rules hold whatever the entry point. 5 tests in `tapi-layered.test.ts`,
  characterization fingerprint updated (1136 green).

- **`/aggregate`: `<master>_agg_hks`, the hooks of the aggregate level (Oracle)** — generated once,
  emitted before `<master>_agg`; per detail with a `_svc`: `before_add_<detail>` (the detail's
  `t_rec` in out: validate, normalize, raise to refuse; the FK is forced back to the master),
  `after_add_<detail>`, and with `remove_` also `before_remove_`/`after_remove_<detail>` (after
  the ownership check). `add_`/`remove_` call them around the detail's `create_rec`/`delete_rec`.
  From the `ocean-code` package-level rule (§1.6, 2026-10-01): a hook belongs to the level whose
  rule it protects and is named after the package it hooks. Tests in `tapi-layered.test.ts`,
  characterization fingerprint updated (1131 green).

- **`/versioned /businesskey`: start/end uniques and a window check instead of
  `<bk>_cur_uk` (Oracle)** — `<t>_from_uk unique (<bk>, valid_from)`,
  `<t>_to_uk unique (<bk>, <close col>)` and `<t>_window_ck check (<close col> is
  null or <close col> > valid_from)`. A NULL close column still takes part in a
  composite UNIQUE when the key is set, so `to_uk` keeps "at most one open
  version per key" (what the function-based `cur_uk` index did) and also rules
  out two versions starting or ending at the same instant; plain constraints, no
  index over the virtual `is_current`. The 26ai assertion is unchanged. Decided in
  `ocean-code` (rule §1.4c, 2026-09-30), where these lines had been added by hand
  after generation; tests in `tapi-layered.test.ts` (1127 green).

- **`auditutc: yes` setting (Oracle)** — audit columns are `TIMESTAMP`
  holding UTC on every table, written with `sys_extract_utc(systimestamp)`;
  overrides `auditdate`. One rule for immutable and ordinary tables alike.
  Decided on 2026-09-30 in `ocean-code` (audit data: UTC; business instants:
  local time zone; days: `DATE`); pinned by a test in `small.test.ts`.
- **`dateonly: yes` setting (Oracle)** — every `DATE` column gets an inline
  `<prefix><table>_<column>_day_ck check (<column> = trunc(<column>))`: a
  `DATE` holds a calendar day, instants are declared as
  `timestamp with local time zone`. Timestamps and audit columns are never
  checked. Asked on 2026-09-30 by `ocean-code` (days vs instants rule, doc
  `00-moduli-applicativi.md` §1.4d there); pinned by two tests in
  `test/integration/small.test.ts`. Default `no`: output unchanged.
- **Audit columns of an `/immutable` table with a time zone `auditdate`** —
  Oracle rejects `timestamp with [local] time zone` in immutable and blockchain
  tables (ORA-05730, verified on 26ai): those tables now get plain `timestamp`
  audit columns holding UTC, written with `sys_extract_utc(systimestamp)`;
  every other table keeps the configured type. Found on `ocean-code`'s
  `twg_order_log`; pinned by a test in `test/integration/small.test.ts`.

### Bug Fixes

- **Quotes in table and column comments** — a `'` inside a comment (e.g. `-- the
  provider's key`) ended the SQL literal of the generated `COMMENT ON` (ORA-03049 on
  install). Now doubled. Found on `ocean-code`'s `mdp_` module; pinned by a test in
  `small.test.ts`. Known, not fixed yet: a column named like another table of the
  module (e.g. `country` next to a `country` table) can make an `/fk <table>` of a
  third table lose its constraint; renaming the column avoids it.

Four generator defects found on 2026-09-27 while generating a real module
(`ocean-code`, `twg_`: 25 tables, `/versioned /businesskey`, `/bridge`,
`/aggregate`) and installing its output on Oracle 26ai. Each one is pinned by
a regression test in `test/integration/tapi-layered.test.ts` ("2.1.1 — …").

- **`/versioned /businesskey` with a declared close column** — declaring
  `valid_from`/`valid_to` (or a custom `/versioned <col>`) explicitly made
  `_app.change_rec` (and `_rst.change_rec`'s body attributes) carry the close
  column twice: once as a flat column parameter, once as the close-instant
  parameter `p_<vtCol>` (PLS-00410 duplicate formal parameter), and the body
  copied `p_<vtCol>` into the *new* version row, closing it at birth. Now the
  declared `<vtCol>` is excluded from `change_rec`'s flat parameters/body
  attributes (`p_<vtCol>` keeps its single meaning: when the current version
  closes), a declared `valid_from` stays a normal parameter (a backdated
  version is legitimate), and `_svc.change_rec` forces `l_rec.<vtCol> := null`
  so the next version always opens open whatever `p_rec` carried.
- **`/bridge` + table-level `/unique` on the same two columns** — both a
  `_uk` and a `_uk_bridge` constraint were emitted on the identical column
  set (ORA-02261 at install time). The bridge constraint is now skipped when
  a table-level `/unique` already covers exactly the two FK columns, in any
  order; a `/unique` on a different column set still gets both.
- **Table-level `/unique` on a nested table** — the nested table node carries
  the `unique` option like a column does, so the parent's natural-key reads
  gained a `get_by_<child>` on a non-existent column (PLS-00302) at every
  layer (`_dal`/`_svc`/`_app`/`_rst`). Natural-key candidates are now columns
  only (`children.length === 0`), in the table model and in the REST
  interface's own scan.
- **`/businesskey` current-key index on a virtual column** — `<table>_<key>_cur_uk`
  was `case when is_current = 1 then <key> end`, a function-based index over
  the virtual `is_current` column, which Oracle rejects (ORA-54034). The index
  now uses the base expression `case when <vtCol> is null then <key> end`
  (same predicate `is_current` is defined on; custom `/versioned <col>` names
  honored). The non-overlap `CREATE ASSERTION` (26ai+) is unchanged.

Characterization fingerprint for "versioned business-key TAPI with APP and
REST interfaces" updated for the `_svc.change_rec` change. `npm test` (legacy
`test/regression_test.js`) is not present on this branch; `npm run test:ts`
is the suite that gates these changes (1121 tests).

## [2.0.1] - 2026-05-08

### Bug Fixes

- **diff: triggers missing for new tables** — `_createTable` in `OracleDiffGenerator` did not call `generateTrigger()`, so BI/BU triggers were omitted from the diff output when adding a table that uses `/rowversion`, `/audit`, or `lower`/`upper` columns. Triggers for *modified* tables (via `_diffTriggers`) were unaffected.
- **diff: nested table column changes not detected** — `_tableMap` iterated only `ctx.forest` (root-level tables), so nested tables (e.g. `employees` inside `departments`) were never included in the diff comparison. Changed to `ctx.descendants()` so all tables, regardless of nesting depth, are compared.

## [2.0.0] - 2026-05-07

### Major TypeScript Refactoring

- **Full TypeScript rewrite**: Monolithic JavaScript codebase replaced with a decoupled, type-safe, multi-dialect architecture
- **Compiler Frontend + Strategy pattern**: Four-stage pipeline — Lexical Analysis, Syntactic Recognition, Semantic Analysis, Generation
- **`BaseGenerator` abstract class**: Dialect-agnostic base with abstract hooks (`colType`, `generateDDL`, `generateDrop`, `generateFullDDL`)
- **Factory/Registry pattern**: `registerGenerator()` / `createGenerator()` for pluggable dialect support
- **Oracle generator split**: Modular `OracleDDLGenerator` (orchestrator), `OracleViewBuilder`, `OraclePlsqlBuilder`, `oracle-types.ts` (pure type mapper)
- **Strict type interfaces**: `IDdlNode`, `SemanticType`, `DDLGenerator`, `DdlContext` contracts in `types.ts`
- **Oracle MLE integration**: Scripts for deploying QuickSQL as an Oracle MLE module
- **TypeScript test suite**: Unit and integration tests via Vitest alongside existing regression tests
- **New dependencies**: `dagre` (graph layout), `mermaid` (diagram rendering), `typescript`, `vitest`

Contributors: Oracle Corporation (original engine), Roberto Capancioni / Radicle s.r.l. (TypeScript refactoring)

## [1.4.0] - 2026-05-06

### `toDiff` — Schema Migration Generator (EX-10)

- **New public API function `toDiff(oldQsql, newQsql, options?)`** — computes an incremental Oracle DDL migration script between two Quick SQL schema versions
- Returns a `DiffResult` with: `sql` (runnable script), `statements` (per-step metadata), `warnings` (DESTRUCTIVE / LOSSY / INFO), and `summary` (table/statement counts)
- **17-step fixed execution order**: drop packages → drop views → drop FKs → drop tables → drop indexes/sequences → create tables/sequences → add/modify columns → set unused → drop unused → add FKs → add indexes → create package specs → create views → create package bodies
- **Safe NOT NULL additions**: three-step pattern — ADD nullable → manual UPDATE comment → MODIFY NOT NULL
- **Idempotency wrappers**: PL/SQL `BEGIN/EXCEPTION` blocks for DB < 23c; `IF [NOT] EXISTS` syntax on 23c+
- **Rename detection**: unambiguous same-type rename emits a `rename_hint` instead of destructive DROP + ADD
- **TAPI/package diffing**: `CREATE OR REPLACE` on column changes; `DROP PACKAGE` only on permanent removal
- **View diffing**: topological sort on inter-view dependencies; `CREATE OR REPLACE VIEW` on content change
- **`toDiff` exposed as static method** on the `quicksql` class for backward-compatible calling convention
- New **"⇄ Diff / Migrate"** tab in the browser UI: paste old and new QSQL, get the migration script in real time with syntax highlighting and colour-coded warning badges
- `doc/user/quick-sql-grammar.md` — new `toDiff` section in the API Reference
- `doc/user/examples.md` — example 17: Schema migration with `toDiff`

## [1.3.14] - 2026-02-11

### ERD Diagram — Highlight & UI Improvements
- **Distinct highlight colors**: Selected table uses vivid blue, related tables use warm amber/gold — instantly distinguishable at any depth
- **White text on highlighted tables**: Text color now switches to white during highlight for reliable contrast in both light and dark themes
- **Active filter chip styling**: Group filter chips use a fixed accent blue with white text instead of theme foreground/background swap, ensuring visibility in all themes

## [1.2.0] - 2023-11-8

[Compatible API amendments](https://github.com/oracle/quicksql/issues/23)

The former calls `toDDL` and `toERD`

```
   let output = toDDL(input,opt);
```

are encouraged to be replaced with

```
   let qsql = new quicksql(input,opt); // parse once only
   let output = qsql.getDDL();
   let errors = qsql.getErrors();
```

## [1.2.1] - 2024-2-8

Issues up to #51

Further Json to QSQL parsing progress

Performance optimization: from 12 sec down to 4.5 sec for 1000 line QSQL schema definition
in test/profile.js (test for pk-fk chain of 333 tables, 3 column each; 268 ms for chain of
50 tables, 20 columns each).

## [1.2.2] - 2024-2-15

Issue #52

Fixed invalid 'Misaligned Table ...' error, exhibited in vscode QSQL extension (yet to be published).

## [1.2.4] - 2024-2-22

NPX command

Error diagnostic fixes

## [1.2.10] - 2024-3-22

#41

## [1.2.11] - 2024-3-22

#57
#62
#63

## [1.2.12] - 2024-4-2

Misindented error diagnostics, one more time
Table and column directive syntax check

## [1.2.14] - 2024-9-22

#65
#67
#84

## [1.2.15] - 2024-9-24

#71
#78

## United-Codes Fork

### 1.3.0 - 2026-02-06

#### Added

- **26ai database version**: Added `26ai` as a supported value for the `db` setting.

#### Fixed

- **Reserved word prefix with user prefix**: Skip reserved word prefix when a user-defined prefix is already set.

### 1.3.1 - 2026-02-06

#### Added

- **Flashback Data Archive directives**: New `/flashback` and `/fda` table directives to enable Flashback Data Archive on tables. Optionally specify an archive name, e.g. `/flashback myarchive`.

### 1.3.2 - 2026-02-06

#### Added

- **Oracle 23ai annotations**: New `{key 'value'}` syntax for adding Oracle SQL annotations to tables, columns, and views. Supports key-value pairs, flag annotations, and multiple annotations per element.

### 1.3.3 - 2026-02-06

#### Added

- **Translation directive** (`/trans`, `/translation`, `/translations`): New column directive for multi-lingual translation support. Automatically generates a shared `language` table, a `<table>_trans` table with translated column variants, and a `<table>_resolved` view that joins them using `sys_context` for the current language. Configurable via the `transcontext` setting.

### 1.3.4 - 2026-02-06

#### Added

- **DESCRIPTION annotation comment generation**: When a table or column annotation includes a `DESCRIPTION` key (e.g., `{DESCRIPTION 'Main HR table'}`), a `COMMENT ON TABLE` or `COMMENT ON COLUMN` statement is automatically generated. The `DESCRIPTION` annotation takes precedence over explicit comments.
- **Double-quoted annotation values**: Annotation values now support both single quotes (`'value'`) and double quotes (`"value"`).

### 1.3.5 - 2026-02-09

#### Added

- **Immutable tables** (`/immutable`): New table directive that generates a `BEFORE UPDATE OR DELETE` trigger preventing any modifications after insert. Use for audit logs, inspection records, and other append-only tables.
- **SODA collections** (`/soda`): New table directive that generates a fixed-schema SODA-compatible collection table with `id`, `created_on`, `last_modified`, `version`, and `json_document` columns. Child columns are ignored.
- **Table groups** (`{GROUP 'name'}`): New `GROUP` annotation on tables that generates `INSERT` statements into `USER_ANNOTATIONS_GROUPS$` and `USER_ANNOTATIONS_GROUP_MEMBERS$` for logical table grouping.
- **Translation-aware views**: Views over tables with `/trans` columns now automatically use `coalesce(t.trans_col, tbl.col)` expressions and `LEFT JOIN` to the `_trans` table with the configured `transcontext` language filter.

#### Fixed

- **Default date expressions**: SQL date expressions (`sysdate`, `current_date`, `current_timestamp`, `systimestamp`, `localtimestamp`) used with `/default` are no longer incorrectly quoted on timestamp and varchar columns.

### 1.3.6 - 2026-02-09

#### Fixed

- **External FK prefix**: Foreign key references to external tables (not defined in the QuickSQL model) no longer get the object prefix prepended. E.g. `/fk UC_FLOWFORMS_FORM` with prefix `IW` now correctly generates `references UC_FLOWFORMS_FORM` instead of `references iw_UC_FLOWFORMS_FORM`.

### 1.3.11 - 2026-02-10

#### Changed

- **ANSI JOIN syntax in views**: Views now use `LEFT JOIN ... ON` and `CROSS JOIN` instead of comma-separated tables with Oracle `(+)` outer join syntax in `WHERE`. Tables are topologically sorted so base tables appear first, then dependent tables join via FK conditions.

#### Fixed

- **Immutable table trigger**: `BEFORE INSERT OR UPDATE` reduced to `BEFORE INSERT` for `/immutable` tables, and the dead `ELSIF UPDATING` branch for `row_version` is omitted.
