# EspreSQL — Diff / Migration Generator (EX-10)

**Status**: Draft specification  
**Version**: 0.6  
**Author**: Roberto Capancioni — Radicle s.r.l.  
**Date**: 2026-05-06  

---

## 1. Purpose

`toDiff()` computes an incremental migration script between two EspreSQL definitions — an **old** definition (what is currently deployed) and a **new** definition (the desired target state). The output is a sequence of ordered Oracle DDL statements that transition the database from old to new without data loss where avoidable.

This solves the core production gap: once a schema is deployed, `toDDL()` cannot be re-run safely. `toDiff()` generates the `ALTER TABLE`, `CREATE INDEX`, `DROP COLUMN`, etc. statements that are safe to apply incrementally.

---

## 2. Scope

### In scope

| Area | Operations |
|---|---|
| Tables | Add, drop |
| Columns | Add, drop, modify type, modify nullability, modify default value, modify visibility (hidden/invisible) |
| Check constraints | Add/drop `/check` or `/values` constraint; add/drop `/between` constraint |
| FK constraints | Add/drop FK |
| Indexes | Add/drop regular (`/idx`) and unique (`/unique` or `/uk`) index; correct on new columns too |
| Sequences | Add/drop when `/pk SEQ` changes |
| Triggers | Add/drop BI/BU triggers when `/lower`, `/upper`, `/rowversion`, `/auditcols`, or `/rowkey` changes |
| Row version | Add/drop `row_version INTEGER NOT NULL` column (add requires manual intervention) |
| PK changes | Surrogate → business PK, composite PK add/remove/reorder — all via manual-intervention blocks (see `COMPOSITE-PK-SPEC.md`) |
| Views | Re-emit `CREATE OR REPLACE VIEW` when content changes; topological sort on inter-view deps |
| Layered TAPI packages | Add/drop/replace DAL, HKS, SVC, APX, AUD via `CREATE OR REPLACE` |
| Simple TAPI (`/api yes`) | Add/drop `_api` package |

### Out of scope (v1)

- **Column rename** — DDL suppressed for suspected renames; user receives a comment with the correct `RENAME COLUMN` statement (§4.2)
- **Table rename** — treated as drop + create with DESTRUCTIVE warning
- **Pre-flight check against live DB** — `oldQsql` is the only source of truth; manual DBA changes are invisible to `toDiff()`
- Partitioning changes
- Index rebuild / move tablespace
- Data migration (UPDATE statements)
- Cross-schema dependencies

---

## 3. Conceptual Model

```
old QSQL string ──► parse ──► OldTree (DdlNode[])  ──┐
                                                       ├─► diff() ──► DiffResult
new QSQL string ──► parse ──► NewTree (DdlNode[])  ──┘                   │
                                                              ordered migration DDL
```

Tables are matched by **canonical name** (lowercased, underscored). Columns within a matched table are matched by **canonical column name**. Position is ignored.

**Rename detection — safe suppression**: when exactly one column disappears and exactly one column of the same base type appears on the same table, `toDiff()` suppresses both the `SET UNUSED` and the `ADD` statements and instead emits a SQL comment containing the correct `ALTER TABLE t RENAME COLUMN old TO new`. A RENAME_HINT warning is added to `DiffResult.warnings`. This prevents silent data loss while giving the user the right tool. If the count of same-type drops and adds is not 1:1 (ambiguous case), suppression is disabled and both operations are emitted as normal drops and adds with a DESTRUCTIVE warning.

---

## 4. Change Taxonomy

### 4.1 Table-level changes

| Change | Detection | SQL emitted |
|---|---|---|
| New table | Name in new, absent in old | Full `CREATE TABLE` (reuse `generateDDL`) + packages |
| Dropped table | Name in old, absent in new | `DROP TABLE … CASCADE CONSTRAINTS` + `DROP PACKAGE` for removed packages + `DROP SEQUENCE` |
| Modified table | Name in both | Column / constraint / package diff (§4.2–4.4) |

`CASCADE CONSTRAINTS` on `DROP TABLE` removes FK constraints from child tables automatically. Dropped tables are emitted in **reverse topological order** (children before parents).

### 4.2 Column-level changes

| Change | Detection | SQL emitted | Warning |
|---|---|---|---|
| Add column (nullable) | Column in new, not in old, nullable | `ALTER TABLE t ADD (col type)` | — |
| Add column (NOT NULL) | Column in new, not in old, not null | Three-step pattern (§7.1) | DESTRUCTIVE + `requiresManualIntervention` |
| Add column with `/default` | New column has default value | `ALTER TABLE t ADD (col type DEFAULT ON NULL val)` | — |
| Add column with `/hidden` | New column is hidden/invisible | `ALTER TABLE t ADD (col type INVISIBLE)` | — |
| Add column with `/check` or `/values` | New column has check constraint | `ADD` + `ALTER TABLE t ADD CONSTRAINT ck CHECK (…)` | — |
| Add column with `/between` | New column has between constraint | `ADD` + `ALTER TABLE t ADD CONSTRAINT bet CHECK (… BETWEEN …)` | — |
| Add column with `/unique` or `/uk` | New column has unique index | `ADD` + `CREATE UNIQUE INDEX` | — |
| Add column with `/idx` | New column has regular index | `ADD` + `CREATE INDEX` | — |
| Drop column | Column in old, not in new, no matching add of same type | `SET UNUSED COLUMN` + `DROP UNUSED COLUMNS` | DESTRUCTIVE |
| Suspected rename (unambiguous) | Exactly one drop + one add of same type | SQL comment with `RENAME COLUMN` (no DDL) | INFO/RENAME_HINT |
| Suspected rename (ambiguous) | Multiple drops/adds of same type | Normal drop + add DDL emitted | DESTRUCTIVE |
| Type change — size increase | Same base type, new capacity ≥ old | `ALTER TABLE t MODIFY (col new_type)` | — |
| Type change — size reduction | Same base type, new capacity < old | `ALTER TABLE t MODIFY (col new_type)` | LOSSY |
| Type change — base type change | Base type differs | Transient FK drop + `MODIFY` + FK recreate (§7.3) | LOSSY |
| Add NOT NULL | Nullable → not null | `ALTER TABLE t MODIFY (col NOT NULL)` | DESTRUCTIVE + `requiresManualIntervention` |
| Remove NOT NULL | Not null → nullable | `ALTER TABLE t MODIFY (col NULL)` | — |
| Add `/default` | Default value added or changed | `ALTER TABLE t MODIFY (col DEFAULT ON NULL val)` | — |
| Remove `/default` | Default value removed | `ALTER TABLE t MODIFY (col DEFAULT NULL)` | — |
| Add `/hidden` | Column made invisible | `ALTER TABLE t MODIFY (col INVISIBLE)` | — |
| Remove `/hidden` | Column made visible | `ALTER TABLE t MODIFY (col VISIBLE)` | — |

When both type and nullability change on the same column, they are combined into a single `ALTER TABLE t MODIFY (col new_type [NOT NULL|NULL])` to minimise DDL lock time.

> **`requiresManualIntervention`**: the `sql` field of affected `DiffStatement` objects is emitted as a SQL comment — not runnable DDL. Check `DiffSummary.statementsRequiringIntervention > 0` before automated application. See §7.1 and the CI/CD-compatible incremental pattern (§7.2).

#### FK constraints blocking SET UNUSED

Oracle rejects `SET UNUSED COLUMN col` (ORA-12992) if another table holds an enabled FK referencing that column. In a valid QSQL diff, a dropped column implies the referencing FK is also absent from `newQsql` and is already in the `drop_fk` list. Since `drop_fk` is ordered before `set_unused` (§6), this is handled automatically.

#### Transient FK drop for base-type changes

Oracle rejects `ALTER TABLE t MODIFY (col new_type)` when the base type changes and an enabled FK from another table references that column. If the FK is stable (exists in both old and new), the diff emits a transient pair:

1. `DROP CONSTRAINT fk_…` (kind: `transient_drop_fk`)
2. `ALTER TABLE t MODIFY (col new_type)` (kind: `modify_column`)
3. `ALTER TABLE t ADD CONSTRAINT fk_…` (kind: `transient_add_fk`)

The ordering in §6 ensures steps 1–3 are sequenced correctly.

### 4.3 Constraint and index changes

FKs are matched by the tuple *(child table, child column, parent table)*. Constraint names follow the same naming convention as `generateDDL()` and are stable as long as the tuple is stable.

| Change | Detection | SQL emitted |
|---|---|---|
| Add FK | FK in new, not in old | `ALTER TABLE t ADD CONSTRAINT fk_…` (idempotent wrapper, §7.5) |
| Drop FK | FK in old, not in new | `ALTER TABLE t DROP CONSTRAINT fk_…` |
| Add check constraint | `/check` or `/values` added or changed on existing column | `ALTER TABLE t DROP CONSTRAINT old_ck` (if changed) + `ADD CONSTRAINT ck_… CHECK (col IN (…))` |
| Remove check constraint | `/check` or `/values` removed | `ALTER TABLE t DROP CONSTRAINT ck_…` |
| Add between constraint | `/between` added or changed on existing column | `ALTER TABLE t DROP CONSTRAINT old_bet` (if changed) + `ADD CONSTRAINT bet_… CHECK (col BETWEEN … AND …)` |
| Remove between constraint | `/between` removed | `ALTER TABLE t DROP CONSTRAINT bet_…` |
| Add column-level unique index | `/unique` or `/uk` on column in new, not in old | `CREATE UNIQUE INDEX tbl_col_unq ON t (col)` (idempotent wrapper, §7.5) |
| Drop column-level unique index | `/unique` or `/uk` on column in old, not in new | `DROP INDEX tbl_col_unq` |
| Add table-level composite unique | `/unique col1,col2` or `/uk col1,col2` on table line in new | `ALTER TABLE t ADD CONSTRAINT tbl_uk UNIQUE (col1, col2)` (idempotent wrapper, §7.5) |
| Drop table-level composite unique | `/unique` or `/uk` on table line in old, absent in new | `ALTER TABLE t DROP CONSTRAINT tbl_uk` |
| Change table-level composite unique columns | Column list differs | DROP old `tbl_uk` + ADD new `tbl_uk` |
| Add index | `/idx` in new, not in old | `CREATE INDEX tbl_col_i ON t (col)` (idempotent wrapper, §7.5) |
| Drop index | `/idx` in old, not in new | `DROP INDEX tbl_col_i` |

Check and between constraints on **new columns** are included in the same `add_column` step — not as separate `modify_column` statements.

> **Column-level vs table-level unique**: column-level `/unique` creates a `CREATE UNIQUE INDEX … _unq`; table-level `/unique col1,col2` creates an `ALTER TABLE … ADD CONSTRAINT … _uk UNIQUE (…)`. They use different naming suffixes (`_unq` vs `_uk`) and different DDL syntax. Cross-changes (column-level → table-level and vice versa) are handled correctly: the old object is dropped and the new one created.

### 4.4 Trigger changes

BI and BU triggers are regenerated as a unit whenever the "trigger signature" of a table changes. The signature is:

```
{ lower: [colNames], upper: [colNames], rv: bool, audit: bool, rowkey: bool }
```

If the signature is unchanged, no trigger DDL is emitted.

| Change | SQL emitted |
|---|---|
| Signature changed — old had triggers | `DROP TRIGGER tbl_bi` and/or `DROP TRIGGER tbl_bu` |
| Signature changed — new needs triggers | `CREATE OR REPLACE TRIGGER tbl_bi … tbl_bu …` |
| Signature unchanged | _(nothing)_ |

Trigger changes driven by `/rowversion` add/remove are also covered: adding `/rowversion` requires manual column initialization (§4.5) before triggers are created; removing `/rowversion` drops triggers and sets the column unused.

### 4.5 Row version (`/rowversion`)

| Change | SQL emitted | `requiresManualIntervention` |
|---|---|---|
| Add `/rowversion` | Manual 4-step block (add column nullable → UPDATE → NOT NULL → triggers) | **Yes** |
| Remove `/rowversion` | `SET UNUSED COLUMN row_version` + `DROP UNUSED COLUMNS` + `DROP TRIGGER` | No |

### 4.6 Option / API changes — `CREATE OR REPLACE` strategy

Package replacement uses `CREATE OR REPLACE PACKAGE` / `CREATE OR REPLACE PACKAGE BODY` rather than DROP + CREATE. This is the key property that eliminates the downtime window for package updates: active sessions receive the new code at their next procedure call entry point, with no forced invalidation. `DROP PACKAGE` is emitted **only** when a package is permanently removed from the schema.

| Change | Action |
|---|---|
| `/api yes` added | `CREATE OR REPLACE` `_api` spec + body |
| `/api yes` removed | `DROP PACKAGE _api` |
| `/api layered` added | `CREATE OR REPLACE` DAL/HKS/SVC/APX/AUD specs + bodies |
| `/api layered` removed | `DROP PACKAGE` DAL, HKS, SVC, APX, AUD |
| `/api yes` → `/api layered` | `DROP PACKAGE _api` + `CREATE OR REPLACE` five layered packages |
| `/api layered` → `/api yes` | `DROP PACKAGE` five layered packages + `CREATE OR REPLACE _api` |
| `/auditlog` added (layered) | `CREATE OR REPLACE` all layered packages (`_aud` included) |
| `/auditlog` removed (layered) | `DROP PACKAGE _aud` + `CREATE OR REPLACE` remaining four packages |
| `/apex` added (layered) | `CREATE OR REPLACE` all layered packages (`_apx` included) |
| `/apex` removed (layered) | `DROP PACKAGE _apx` + `CREATE OR REPLACE` remaining four packages |
| Any column change on a layered table | `CREATE OR REPLACE` all layered packages for that table |

> **Why all-or-nothing for replacement**: the dependency graph between DAL/HKS/SVC/APX/AUD is tight — SVC body calls DAL and AUD, APX body calls SVC. Regenerating all packages via `CREATE OR REPLACE` is safe (idempotent) and avoids the risk of stale inter-package references from partial replacement.

### 4.7 PK changes

PK structural changes (surrogate → business, composite PK column add/remove/reorder) are supported via manual-intervention blocks. See `COMPOSITE-PK-SPEC.md` for the full specification.

All PK migrations emit a `DESTRUCTIVE` warning and one or more `requiresManualIntervention = true` statements containing commented SQL that must be executed by the DBA in the correct order.

### 4.8 Shadow State

`toDiff()` has no visibility into the live database. If a DBA manually created an index, added a constraint, or altered a column outside of EspreSQL, the generated script may fail with object-already-exists or integrity-violation errors.

Mitigations within scope:
- Index creation and `ADD CONSTRAINT` statements use idempotency wrappers (§7.5) that silently skip ORA-00955 / ORA-02261 errors.
- Oracle 23c+ uses `IF NOT EXISTS` / `IF EXISTS` natively (§7.6).

Any other shadow-state collision (e.g., a DBA-added column with the same name as a column being added by the migration) is an inherent limitation of a QSQL-based tool and must be resolved manually.

---

## 5. Diff Algorithm

### Top-level

```
function diff(oldQsql, newQsql, ctx):
  oldNodes ← parse(oldQsql)
  newNodes ← parse(newQsql)

  oldMap ← index by canonicalName
  newMap ← index by canonicalName

  statements ← []
  warnings   ← []

  // Dropped tables — reverse topological order
  for each table in reverseTopologicalSort(oldMap \ newMap):
    statements += dropTable(table, ctx)       // DROP TABLE + DROP PACKAGE + DROP SEQUENCE
    warnings   += [ DESTRUCTIVE: "table dropped: " + table.name ]

  // New tables — topological order
  for each table in topologicalSort(newMap \ oldMap):
    statements += createTable(table, ctx)     // CREATE TABLE + CREATE OR REPLACE packages

  // Modified tables
  for each (oldTable, newTable) in oldMap ∩ newMap:
    (stmts, warns) ← diffTable(oldTable, newTable, ctx)
    statements += stmts
    warnings   += warns

  return DiffResult {
    statements: order(statements),            // §6
    warnings:   warnings,
    sql:        buildScript(statements),      // preamble (§7.7) + ordered SQL
    summary:    computeSummary(statements, warnings)
  }
```

### diffTable

```
function diffTable(oldTbl, newTbl, ctx):
  stmts ← []
  warns ← []

  dropped ← oldTbl.columns \ newTbl.columns
  added   ← newTbl.columns \ oldTbl.columns

  // ── Rename detection ──────────────────────────────────────────────────────
  suspectedRenames ← pairByType(dropped, added)  // unambiguous 1:1 only
  for each (oldCol, newCol) in suspectedRenames:
    stmts += comment_stmt("alter table t rename column " + oldCol + " to " + newCol)
    warns += [ INFO/RENAME_HINT: oldCol.name + " → " + newCol.name ]

  definiteDrops ← dropped \ suspectedRenames.keys
  definiteAdds  ← added  \ suspectedRenames.values

  // ── Definite drops ─────────────────────────────────────────────────────────
  for each col in definiteDrops:
    stmts += alterDropColumn(oldTbl, col)     // set_unused + drop_unused_columns
    warns += [ DESTRUCTIVE: "column dropped: " + col.name ]

  // ── Definite adds ──────────────────────────────────────────────────────────
  for each col in definiteAdds:
    stmts += addColumn(newTbl, col)           // ADD + optional check/between/index (§4.2)
    if col.notNull:
      warns += [ DESTRUCTIVE + requiresManualIntervention: col.name ]

  // ── Modified columns ───────────────────────────────────────────────────────
  for each (oldCol, newCol) in matched columns:
    stmts += modifyColumn(oldTbl, oldCol, newCol)
    //   covers: type, nullability, default, hidden, check, between (§4.2–4.3)

  // ── Row version ────────────────────────────────────────────────────────────
  stmts += diffRowVersion(oldTbl, newTbl)    // §4.5

  // ── PK structure ───────────────────────────────────────────────────────────
  (pkStmts, pkWarns) ← diffPk(oldTbl, newTbl, oldCols, newCols)  // §4.7
  stmts += pkStmts;  warns += pkWarns

  // ── FK constraints ─────────────────────────────────────────────────────────
  stmts += diffFKs(oldTbl, newTbl)

  // ── Indexes (existing columns only; new columns handled in addColumn) ───────
  stmts += diffIndexes(oldTbl, newTbl)

  // ── Triggers ───────────────────────────────────────────────────────────────
  stmts += diffTriggers(oldTbl, newTbl)      // §4.4

  // ── Views ──────────────────────────────────────────────────────────────────
  stmts += diffViews(oldTbl, newTbl)

  // ── API packages ───────────────────────────────────────────────────────────
  stmts += diffPackages(oldTbl, newTbl, ctx)

  return (stmts, warns)
```

### diffPackages

```
function diffPackages(oldTbl, newTbl, ctx):
  stmts  ← []
  oldPkgs ← packageNamesOf(oldTbl)   // e.g. {_api} or {_dal, _hks, _svc, _apx, _aud}
  newPkgs ← packageNamesOf(newTbl)

  // Permanently removed packages → DROP (the only case DROP PACKAGE is emitted)
  for each pkg in oldPkgs \ newPkgs:
    stmts += drop_package(pkg)

  // Packages in new state → CREATE OR REPLACE (covers both new and replacement)
  // Emitted only if packages input changed or a package is new
  if packagesInputChanged(oldTbl, newTbl) or newPkgs \ oldPkgs ≠ ∅:
    for each pkg in newPkgs (in dependency order: AUD→DAL→HKS→SVC→APX):
      stmts += create_or_replace_package_spec(pkg)
      stmts += create_or_replace_package_body(pkg)

  return stmts
```

`DROP PACKAGE` is **never** emitted for a package that exists in both old and new — `CREATE OR REPLACE` handles replacement without invalidating dependent objects.

### packagesInputChanged

Returns `true` when any of the following hold:

- The `/api` option value changed (including `yes` ↔ `layered` transitions)
- `/auditlog` was added or removed
- `/apex` was added or removed
- Any column was added, dropped, or modified on a table that has `/api layered`

### diffViews

```
function diffViews(allOldNodes, allNewNodes):
  oldViews ← { node | node.inferType() == 'view' } in allOldNodes
  newViews ← { node | node.inferType() == 'view' } in allNewNodes

  stmts ← []

  // Removed views
  for each view in oldViews \ newViews:
    stmts += drop_view(view)

  // New or changed views — topological sort on inter-view dependencies
  changedOrNew ← [ v ∈ newViews | v ∉ oldViews or contentChanged(v) ]
  for each view in topologicalSortViews(changedOrNew, newViews):
    stmts += create_or_replace_view(view)

  return stmts
```

`topologicalSortViews` builds a dependency graph by checking whether any view's column definitions reference another view by name (via `/references viewname` or equivalent QSQL syntax). When no cross-view references exist, declaration order is preserved.

---

## 6. Statement Ordering Rules

`order()` sorts all collected statements into this fixed sequence. Same-step statements are stable-sorted in collection order.

| Step | Kind(s) | Reason |
|---|---|---|
| 1 | `drop_package` | Permanent removals only — before altering tables they reference |
| 2 | `drop_view` | Before dropping tables the views query |
| 3 | `drop_fk`, `transient_drop_fk` | Before structural column changes |
| 4 | `drop_table` | Reverse topological order (children before parents) |
| 5 | `drop_index`, `drop_trigger` | — |
| 6 | `drop_sequence` | — |
| 7 | `create_table` | Topological order (parents before children) |
| 8 | `add_sequence` | Before package bodies that reference the sequence |
| 9 | `add_column`, `rename_hint` | — |
| 10 | `modify_column` | After add |
| 11 | `set_unused` | Mark before drop |
| 12 | `drop_unused_columns` | Tagged `[MAINTENANCE]` — safe to defer |
| 13 | `add_fk`, `transient_add_fk` | After all tables and columns exist |
| 14 | `add_index`, `create_trigger` | After columns exist |
| 15 | `create_package` (specs) | `CREATE OR REPLACE`; dependency order: AUD→DAL→HKS→SVC→APX |
| 16 | `create_view` | After package specs (views may call package functions declared in specs) |
| 17 | `create_package` (bodies) | After views (bodies may query views) |

> **Note on step 1**: `CREATE OR REPLACE PACKAGE` (steps 15/17) does not require a preceding DROP. Step 1 emits `DROP PACKAGE` only for packages that are permanently removed from the schema (absent from `newQsql`). This is the mechanism that eliminates downtime for package updates.

---

## 7. Oracle DDL Reference

### 7.1 Add column NOT NULL — three-step pattern

`ALTER TABLE t ADD (col type NOT NULL)` fails with ORA-01758 on non-empty tables. The diff generates three statements. Step 2 is emitted as a SQL comment (`requiresManualIntervention = true`) and halts automated pipelines.

```sql
-- Step 1: add as nullable (always succeeds)
alter table employees add (created_on date);

-- Step 2: ⚠ MANUAL INTERVENTION REQUIRED
-- Populate existing rows before step 3. Replace ??? with the correct expression.
-- update employees set created_on = ??? where created_on is null;
-- commit;

-- Step 3: enforce NOT NULL (fails if any row is still NULL after step 2)
alter table employees modify (created_on not null);
```

### 7.2 CI/CD-compatible incremental pattern for NOT NULL columns

To avoid `requiresManualIntervention` entirely — the recommended approach for automated pipelines:

**Migration N**: add the column as **nullable**. No intervention needed; applies cleanly in CI/CD.

```qsql
employees
  created_on date  -- nullable, no /nn
```

**Between migrations**: populate the column via application logic or a scheduled job.

**Migration N+1**: add the NOT NULL constraint once all rows are populated.

```qsql
employees
  created_on date /nn
```

The diff for migration N+1 detects the nullability change and emits `ALTER TABLE employees MODIFY (created_on not null)`, which succeeds because all rows are already populated. `requiresManualIntervention = false`.

### 7.3 Drop column — two-phase

```sql
-- Phase 1: mark unused (fast, minimal lock)
alter table employees set unused column old_col;

-- [MAINTENANCE] Phase 2: reclaim storage — safe to defer to maintenance window
alter table employees drop unused columns;
```

### 7.4 Modify column — transient FK for base-type change

```sql
-- Transient drop: remove blocking FK
alter table orders drop constraint orders_employees_fk;

-- Modify the column type
alter table employees modify (code varchar2(20));

-- Transient recreate: restore FK
alter table orders
    add constraint orders_employees_fk
    foreign key (employee_code)
    references employees (code);
```

### 7.5 Idempotency wrappers

Shadow-state objects (created manually outside EspreSQL) cause ORA-00955 / ORA-02261 on add operations. For Oracle < 23c, creation statements that cannot use `CREATE OR REPLACE` are wrapped in PL/SQL exception handlers:

```sql
-- Index (ORA-00955 = name already used by existing object)
begin
    execute immediate 'create index orders_status_i on orders (status)';
exception
    when others then
        if sqlcode = -955 then null;
        else raise;
        end if;
end;
/

-- Constraint (ORA-02261 = unique/primary key already exists)
begin
    execute immediate
        'alter table orders add constraint orders_customers_fk ' ||
        'foreign key (customer_id) references customers (id)';
exception
    when others then
        if sqlcode = -2261 then null;
        else raise;
        end if;
end;
/
```

### 7.6 Oracle 23c syntax

When `db` option ≥ 23, native syntax replaces the PL/SQL wrappers:

```sql
create index if not exists orders_status_i on orders (status);
drop table if exists employees cascade constraints;
drop package if exists employees_dal;
```

### 7.7 Script preamble

The first block in the generated SQL is a human-readable header:

```sql
-- ============================================================
-- EspreSQL Migration Script — v0.4
-- Generated : 2026-05-06T14:32:00Z
-- ============================================================
--
-- ⚠ MANUAL STEPS REQUIRED (statementsRequiringIntervention = 2)
--
--   [employees.created_on]
--     update employees set created_on = sysdate where created_on is null;
--
--   [orders.status]
--     update orders set status = 'ACTIVE' where status is null;
--
-- ⚠ POSSIBLE RENAMES — verify before applying
--
--   [employees] "old_name" (varchar2 100) → "new_name" (varchar2 100)
--     If rename: alter table employees rename column old_name to new_name;
--     Then delete the SET UNUSED / ADD statements below for this column.
--
-- ⚠ DESTRUCTIVE OPERATIONS
--   Tables dropped : 1   Columns dropped : 3
--   Apply during a maintenance window.
--
-- ============================================================
```

---

## 8. Warnings

`DiffResult.warnings` never suppresses SQL output. `requiresManualIntervention` is the mechanism that prevents automated application of statements requiring human input.

| Situation | Level | `requiresManualIntervention` |
|---|---|---|
| `DROP TABLE` | `DESTRUCTIVE` | No |
| `SET UNUSED COLUMN` | `DESTRUCTIVE` | No |
| `ADD column NOT NULL` | `DESTRUCTIVE` | **Yes** |
| `MODIFY col NOT NULL` | `DESTRUCTIVE` | **Yes** |
| Type change, capacity reduced | `LOSSY` | No |
| Type change, base type changed | `LOSSY` | No |
| Suspected rename (unambiguous) | `INFO` | No — DDL suppressed, comment emitted |
| Suspected rename (ambiguous) | `DESTRUCTIVE` | No — normal drops/adds emitted |

---

## 9. Public API

### Entry point — `src/ddl.ts`

```typescript
export function toDiff(oldQsql: string, newQsql: string, options?: Record<string, unknown>): DiffResult;
```

`options` accepts the same keys as `toDDL()` (dialect, db, prefix, pk, api, …).

### Factory — `src/factory.ts`

```typescript
export type DiffGeneratorFactory = (ctx: DdlContext) => DiffGenerator;

export function registerDiffGenerator(dialect: string, factory: DiffGeneratorFactory): void;
export function createDiffGenerator(ctx: DdlContext): DiffGenerator;
```

The `oracle` diff generator is pre-registered at module load.

### Types — `src/diff-types.ts`

```typescript
export interface DiffGenerator {
    compute(oldNodes: DdlNode[], newNodes: DdlNode[]): DiffResult;
}

export interface DiffResult {
    /** Full script including preamble */
    sql:        string;
    /** Individual statements in emission order (no preamble) */
    statements: DiffStatement[];
    warnings:   DiffWarning[];
    summary:    DiffSummary;
}

export interface DiffStatement {
    kind:    DiffStatementKind;
    table:   string;
    column?: string;
    /** Runnable DDL, or a SQL comment when requiresManualIntervention is true */
    sql:     string;
    requiresManualIntervention: boolean;
}

export type DiffStatementKind =
    | 'create_table'         | 'drop_table'
    | 'create_view'          | 'drop_view'
    | 'add_column'           | 'set_unused'        | 'drop_unused_columns' | 'modify_column'
    | 'add_fk'               | 'drop_fk'
    | 'transient_add_fk'     | 'transient_drop_fk'
    | 'add_index'            | 'drop_index'
    | 'add_sequence'         | 'drop_sequence'
    | 'create_package'       | 'drop_package'
    | 'create_trigger'       | 'drop_trigger'
    | 'rename_hint';         // comment-only, no DDL

export interface DiffSummary {
    tablesAdded:                     number;
    tablesDropped:                   number;
    tablesModified:                  number;
    statementsTotal:                 number;
    statementsRequiringIntervention: number;
    warningsTotal:                   number;
}

export interface DiffWarning {
    level:   'DESTRUCTIVE' | 'LOSSY' | 'INFO';
    table:   string;
    column?: string;
    message: string;
    requiresManualIntervention: boolean;
}
```

---

## 10. Source Structure

```
src/
├── diff-types.ts          ← DiffResult, DiffStatement, DiffWarning, DiffSummary (new)
├── diff.ts                ← toDiff() entry point; calls createDiffGenerator() (new)
├── factory.ts             ← add registerDiffGenerator / createDiffGenerator
├── ddl.ts                 ← add toDiff() re-export
└── oracle/
    └── diff-generator.ts  ← OracleDiffGenerator implements DiffGenerator (new)
```

### `OracleDiffGenerator` — `src/oracle/diff-generator.ts`

```typescript
export class OracleDiffGenerator implements DiffGenerator {
    constructor(private ctx: DdlContext) {}

    compute(oldNodes: DdlNode[], newNodes: DdlNode[]): DiffResult;

    private diffTable(old: DdlNode, neu: DdlNode): { stmts: DiffStatement[]; warns: DiffWarning[] };
    private detectRenames(dropped: IDdlNode[], added: IDdlNode[]): Map<IDdlNode, IDdlNode>;
    private addColumn(table: DdlNode, col: IDdlNode): DiffStatement[];
    private dropColumn(table: DdlNode, col: IDdlNode): DiffStatement[];
    private modifyColumn(table: DdlNode, old: IDdlNode, neu: IDdlNode): DiffStatement[];
    private dropBlockingFKs(table: DdlNode, col: IDdlNode): DiffStatement[];
    private recreateBlockingFKs(table: DdlNode, col: IDdlNode): DiffStatement[];
    private diffFKs(old: DdlNode, neu: DdlNode): DiffStatement[];
    private diffIndexes(old: DdlNode, neu: DdlNode): DiffStatement[];
    private diffViews(oldNodes: DdlNode[], newNodes: DdlNode[]): DiffStatement[];
    private topologicalSortViews(views: DdlNode[], allNewViews: DdlNode[]): DdlNode[];
    private diffPackages(old: DdlNode, neu: DdlNode): DiffStatement[];
    private packagesInputChanged(old: DdlNode, neu: DdlNode): boolean;
    private buildPreamble(stmts: DiffStatement[], warns: DiffWarning[]): string;
    private order(stmts: DiffStatement[]): DiffStatement[];
}
```

`OracleDiffGenerator` delegates to `OracleDDLGenerator` and `OraclePlsqlBuilder` for generation. It adds no duplicate logic — only ALTER / DROP / idempotency scaffolding.

---

## 11. Test Strategy

Tests live in `test/integration/diff.test.ts`.

### Test matrix

| Scenario | Key assertions |
|---|---|
| Identical old and new | `statements` empty; no warnings; `statementsRequiringIntervention = 0` |
| Add nullable column | `ADD` present; no warnings |
| Add NOT NULL column | Three-step emitted; step 2 is comment; `requiresManualIntervention = 1` |
| Drop column | `SET UNUSED` + `DROP UNUSED COLUMNS`; DESTRUCTIVE warning |
| Suspected rename — unambiguous | No DROP/ADD DDL; `rename_hint` statement present; INFO warning |
| Suspected rename — ambiguous | Normal DROP+ADD DDL; DESTRUCTIVE warning |
| Modify nullable → NOT NULL | `MODIFY … NOT NULL`; DESTRUCTIVE; `requiresManualIntervention = true` |
| Modify NOT NULL → nullable | `MODIFY … NULL`; no warning |
| Type + nullability together | Single `MODIFY (col new_type not null)` |
| Size increase | `MODIFY` present; no LOSSY |
| Size decrease | `MODIFY` present; LOSSY |
| Base type change, no FK | `MODIFY` present; LOSSY; no transient FK |
| Base type change, with stable FK | `transient_drop_fk` before `modify_column`; `transient_add_fk` after |
| Add table | Full `CREATE TABLE` |
| Drop table | `DROP TABLE`; DESTRUCTIVE |
| Add FK | Idempotency wrapper present |
| Drop FK | `DROP CONSTRAINT` present |
| Add index | Idempotency wrapper present |
| Add `/api layered` | Five `CREATE OR REPLACE` specs + bodies |
| Remove `/api layered` | Five `DROP PACKAGE` |
| Column change on layered table | Five `CREATE OR REPLACE` specs + bodies; no `DROP PACKAGE` |
| `/api yes` → `/api layered` | `DROP PACKAGE _api`; five `CREATE OR REPLACE` |
| Add `/auditlog` | `DROP PACKAGE _aud` absent; `CREATE OR REPLACE` five packages |
| Remove `/auditlog` | `DROP PACKAGE _aud`; `CREATE OR REPLACE` remaining four |
| View content changed | `CREATE OR REPLACE VIEW` re-emitted |
| View removed | `DROP VIEW` before table drops |
| View with inter-view dependency | Dependency emitted before dependent |
| Package replacement has no DROP | No `drop_package` when package exists in both old and new |
| Order: step 1 only for permanent drops | `drop_package` absent when replacing; present when removing |
| Order: drop FK before set_unused | `drop_fk` index < `set_unused` index |
| Order: specs before views | `create_package` (spec) index < `create_view` index |
| Order: views before bodies | `create_view` index < `create_package` (body) index |
| Order: children before parents on DROP | Child `drop_table` index < parent |
| DB 23c | `IF EXISTS` / `IF NOT EXISTS` native; no PL/SQL wrappers |
| DB < 23 | PL/SQL idempotency wrappers for index and constraint adds |
| Preamble with manual steps | `⚠ MANUAL STEPS REQUIRED` block present when `statementsRequiringIntervention > 0` |
| Preamble with rename hint | `⚠ POSSIBLE RENAMES` block present when rename_hint warning exists |
| Add `/check` on existing column | `modify_column` with `ADD CONSTRAINT … CHECK (col IN (…))` |
| Change `/check` values | Drop old constraint + add new constraint |
| Remove `/check` | Drop constraint |
| Add `/between` on existing column | `modify_column` with `ADD CONSTRAINT … CHECK (col BETWEEN … AND …)` |
| New column with `/check` | `add_column` includes both `ADD (col)` and `ADD CONSTRAINT` |
| New column with `/unique` | `add_index` with `CREATE UNIQUE INDEX` after `add_column` |
| New column with `/idx` | `add_index` with `CREATE INDEX` after `add_column` |
| New column with `/default` | `add_column` includes `DEFAULT ON NULL val` in column def |
| New column with `/hidden` | `add_column` includes `INVISIBLE` in column def |
| Add `/default` on existing column | `modify_column` with `DEFAULT ON NULL val` |
| Remove `/default` | `modify_column` with `DEFAULT NULL` |
| Add `/hidden` on existing column | `modify_column` with `INVISIBLE` |
| Remove `/hidden` | `modify_column` with `VISIBLE` |
| Add `/lower` on existing column | `create_trigger` for BI and BU |
| Remove `/lower` | `drop_trigger` for BI and BU |
| Add `/rowversion` | Manual `add_column` block + `create_trigger` |
| Remove `/rowversion` | `set_unused` for `row_version` + `drop_trigger` |
| Identical surrogate PK | No PK statements emitted |
| Identical composite PK | No PK statements emitted |
| Surrogate → single business PK | DESTRUCTIVE warning + manual DROP old PK + `set_unused id` + manual ADD new PK |
| Surrogate → composite PK | DESTRUCTIVE warning + manual blocks for each new column + SET UNUSED id |
| Add column to composite PK | Manual DROP + re-create with new column list |
| Remove column from composite PK | Manual DROP + re-create; removed column stays in table |
| Reorder composite PK columns | Manual DROP + re-create |
| `genpk:no` → composite PK | Manual ADD constraint only; no `set_unused` |
| Add table-level `/unique col1,col2` | `add_index` with `ALTER TABLE ADD CONSTRAINT _uk UNIQUE` |
| Remove table-level `/unique` | `drop_index` with `ALTER TABLE DROP CONSTRAINT _uk` |
| Change table-level `/unique` column list | DROP old `_uk` + ADD new `_uk` |
| Column-level `/unique` → table-level `/unique col1,col2` | DROP `_unq` index + ADD `_uk` constraint |
| Identical table-level `/unique` | No statements emitted |

---

## 12. Limitations (v1)

- **Rename — DDL suppressed, not executed**: unambiguous suspected renames emit a comment with `RENAME COLUMN`; ambiguous ones emit DROP+ADD with DESTRUCTIVE warning. In neither case does the tool execute the rename automatically.
- **No data migration**: the diff never generates executable `UPDATE` or `INSERT` statements. PK changes requiring data population emit commented guidance only.
- **PK changes — manual only**: PK structural changes (surrogate → business, composite add/remove/reorder) are supported but require DBA execution of the manual-intervention blocks. Automated pipelines must gate on `requiresManualIntervention`. See `COMPOSITE-PK-SPEC.md`.
- **Pre-flight check**: shadow-state collisions on non-index / non-constraint objects (e.g., a DBA-added column with the same name) are not mitigated and will cause script failure.
- **Package drop window**: `DROP PACKAGE` for permanently removed packages is DDL (auto-committed). There is a brief unavoidable window between the drop and the next package creation during which dependent objects reference a missing package. Apply package removals during a maintenance window.
- **View invalidation**: views defined outside EspreSQL that reference dropped tables are marked `INVALID` by Oracle. The diff only drops views explicitly defined in `oldQsql`.
- **Inter-view dependency detection**: topological sort for views requires parsing view column definitions for cross-view references. If view definitions use QSQL constructs that do not expose view-to-view references, declaration order is used as fallback.
- **NOT NULL without incremental migration**: when the incremental pattern (§7.2) is not followed, NOT NULL column additions require `requiresManualIntervention` and block automated pipelines. Use `/default` to provide a known populate value so the manual block emits a specific `UPDATE` rather than `???`.

---

## Revision History

| Version | Date       | Author             | Notes |
|---------|------------|--------------------|-------|
| 0.1     | 2026-05-06 | Roberto Capancioni | Initial draft |
| 0.2     | 2026-05-06 | Roberto Capancioni | 14 issues from internal review |
| 0.3     | 2026-05-06 | Roberto Capancioni | Rename paradox, three-step NOT NULL, transient FK, view ordering, idempotency, `requiresManualIntervention` |
| 0.4     | 2026-05-06 | Roberto Capancioni | Rename DDL suppression (unambiguous pairs → comment only); `CREATE OR REPLACE` for package replacement (eliminates downtime window; DROP only for permanent removal); CI/CD incremental pattern for NOT NULL (§7.2); idempotency extended to ADD CONSTRAINT; view topological sort; shadow state section reorganised; test matrix expanded |
| 0.5     | 2026-05-06 | Roberto Capancioni | Added: check/between constraints (§4.3); default/hidden column properties (§4.2); trigger diff (§4.4); rowversion diff (§4.5); indexes on new columns; PK structural changes (§4.7, COMPOSITE-PK-SPEC.md); `create_trigger`/`drop_trigger` statement kinds; `diffTable` pseudocode updated; §12 Limitations updated; test matrix expanded |
| 0.6     | 2026-05-06 | Roberto Capancioni | Added table-level composite unique (`/unique col1,col2`) diff support (§4.3); cross-change between column-level `_unq` index and table-level `_uk` constraint handled correctly |
