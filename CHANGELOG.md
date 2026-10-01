# Change Log

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## ExpreSQL fork

ExpreSQL is a fork of [Oracle's Quick SQL](https://github.com/oracle/quicksql)
maintained by Radicle IT, released under the same Universal Permissive
License v1.0. Versions and entries below `1.2.15` are inherited from the
upstream project.

## [Unreleased]

### Features

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
