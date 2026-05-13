# ExpreSQL — Composite / Business Primary Keys

**Status**: Draft specification  
**Version**: 0.1  
**Author**: Roberto Capancioni — Radicle s.r.l.  
**Date**: 2026-05-06  

---

## 1. Purpose

This document specifies how ExpreSQL handles tables whose primary key is a **business key** rather than a surrogate key — i.e. one or more columns that exist in the domain (e.g. `country_code`, `order_no + line_no`) rather than a system-generated `id`.

It covers:
1. What already works in DDL generation.
2. Gaps identified in the diff / migration generator.
3. Specification for the missing diff behaviour.

---

## 2. Current State (DDL Generation)

### 2.1 Single business PK column

Mark any column with `/pk` to make it the primary key instead of the auto-generated `id`:

```
countries
    code vc2 /pk
    name vc100 /nn
```

Generated output:
```sql
create table countries (
    code    varchar2(2 char)   not null,
    name    varchar2(100 char) not null,
    constraint countries_code_pk primary key (code)
);
```

- No auto `id` column is generated.
- Constraint name: `<table>_<colname>_pk`.

### 2.2 Composite business PK (`table /pk col1, col2`)

Use the `/pk` option at the **table level** to declare a composite primary key:

```
employee /pk first_name, last_name
    first_name vc50 /nn
    last_name  vc50 /nn
    email      vc100
```

Generated output:
```sql
create table employee (
    first_name varchar2(50 char) not null,
    last_name  varchar2(50 char) not null,
    email      varchar2(100 char)
);
alter table employee add constraint employee_pk primary key (first_name, last_name);
```

- No auto `id` column is generated.
- Constraint name: `<table>_pk` (no column suffix for composite).
- FK references to this table automatically propagate the composite key columns.

### 2.3 FK propagation to composite PK tables

Child tables referencing a composite PK table receive all PK columns as FK columns automatically:

```
employee /pk first_name, last_name
    first_name vc50 /nn
    last_name  vc50 /nn
    job history
        start_date date /nn
        end_date   date
```

Generated FK constraint:
```sql
constraint employee_job_history_fk foreign key (first_name, last_name) references employee;
```

### 2.4 Suppressing auto-id without a business PK

Setting `pk: NONE` removes the auto-population trigger/sequence/default, but the `id` column is still generated. This is intentional for cases where the DBA will handle population separately. It does **not** behave as "no primary key at all".

### 2.5 What does NOT work currently

| Feature | Status |
|---|---|
| Single business PK (`col /pk`) | ✅ Works |
| Composite business PK (`tbl /pk c1,c2`) | ✅ Works |
| FK propagation to composite PK | ✅ Works |
| `genpk: no` to suppress auto `id` | ✅ Works |
| Diff: migrate surrogate → business PK | ❌ Not supported (throws) |
| Diff: change which columns form composite PK | ❌ Not supported (throws) |
| Diff: add/remove a column from a composite PK | ❌ Not supported (throws) |

---

## 3. Diff / Migration Gaps

### 3.1 Current safety check

`_diffTable()` in `src/oracle/diff-generator.ts` (≈ line 247):

```typescript
const oldPk = oldNode.getPkName() ?? oldNode.getGenIdColName() ?? 'id';
const newPk = newNode.getPkName() ?? newNode.getGenIdColName() ?? 'id';
if (oldPk !== newPk)
    throw new Error(`PK column change not supported on table "${tbl}": ${oldPk} → ${newPk}`);
```

`getPkName()` returns the first PK column name (or `null` for surrogate). This throws whenever the PK structure changes at all, even for safe composite additions.

### 3.2 Cases that need diff support

#### Case A — Surrogate → single business PK

```
# Old
orders
    customer_id /fk customers
    amount num

# New
orders
    order_no vc20 /pk
    customer_id /fk customers
    amount num
```

Required migration:
1. `ALTER TABLE orders ADD (order_no varchar2(20 char))` — new column first, nullable
2. **MANUAL INTERVENTION**: `UPDATE orders SET order_no = <expression>` — populate values
3. `ALTER TABLE orders MODIFY (order_no NOT NULL)` — then add NOT NULL
4. `ALTER TABLE orders DROP CONSTRAINT orders_pk` — drop old surrogate PK constraint
5. `DROP SEQUENCE orders_seq` (if `pk: SEQ`)  
6. `ALTER TABLE orders DROP COLUMN id` (set unused first, then drop)
7. `ALTER TABLE orders ADD CONSTRAINT orders_order_no_pk PRIMARY KEY (order_no)`

All steps after (1) are **requiresManualIntervention = true** or DESTRUCTIVE warnings.

#### Case B — Surrogate → composite business PK

```
# Old
order_lines
    order_id
    product_id

# New
order_lines /pk order_no, line_no
    order_no vc20 /nn
    line_no  num  /nn
    product_id
```

Required migration:
1. Add each new PK column (nullable initially)
2. **MANUAL**: populate values
3. Modify each to NOT NULL
4. Drop old surrogate PK and FK constraints pointing to it
5. Drop old surrogate `id` column (via SET UNUSED + DROP)
6. `ALTER TABLE order_lines ADD CONSTRAINT order_lines_pk PRIMARY KEY (order_no, line_no)`
7. **Update all child tables** that had FKs to `order_lines(id)` — drop old FK, add new columns, add new FK

#### Case C — Add a column to an existing composite PK

```
# Old
keys /pk a, b
    a vc10 /nn
    b vc10 /nn

# New
keys /pk a, b, c
    a vc10 /nn
    b vc10 /nn
    c vc10 /nn
```

Required migration:
1. Add `c` column (nullable)
2. **MANUAL**: populate `c`
3. `ALTER TABLE keys MODIFY (c NOT NULL)`
4. `ALTER TABLE keys DROP CONSTRAINT keys_pk`
5. `ALTER TABLE keys ADD CONSTRAINT keys_pk PRIMARY KEY (a, b, c)`

#### Case D — Remove a column from an existing composite PK

```
# Old
keys /pk a, b
    a vc10 /nn
    b vc10 /nn

# New
keys /pk a
    a vc10 /nn
    b vc10 /nn  -- column stays, just removed from PK
```

Required migration:
1. `ALTER TABLE keys DROP CONSTRAINT keys_pk`
2. `ALTER TABLE keys ADD CONSTRAINT keys_pk PRIMARY KEY (a)`  
3. (optional) `ALTER TABLE keys MODIFY (b NULL)` if nullability changed

---

## 4. Specification: Diff Support for PK Changes

### 4.1 PK change detection

Replace the current `throw` with structured detection:

```typescript
interface PkDescriptor {
    type: 'surrogate' | 'business';
    columns: string[];         // ordered list of PK column names
    constraintName: string;    // e.g. "orders_pk" or "orders_order_no_pk"
    sequenceName?: string;     // only when pk:SEQ
}
```

Build `PkDescriptor` for both old and new node. If they are identical (same type + same columns in same order), skip PK diff entirely — current behaviour, no change.

### 4.2 Emission order within `_diffTable()`

Insert a new `_diffPk()` call after column modifications:

```
1. Add new columns
2. Modify existing columns
3. _diffPk()  ← new
4. _diffIndexes()
5. _diffFks()
6. _diffTriggers()
```

`_diffPk()` signature:
```typescript
private _diffPk(
    oldNode: IDdlNode, newNode: IDdlNode,
    oldCtx: DdlContext, newCtx: DdlContext
): DiffStatement[]
```

### 4.3 Statement sequence for _diffPk()

When PK structure changes, emit in this order:

| Step | Kind | requiresManualIntervention | Notes |
|---|---|---|---|
| DESTRUCTIVE warning | — | — | Warn that PK change affects all FKs pointing to this table |
| Drop child FKs (if any) | `drop_fk` | false | Must precede PK drop |
| Drop old PK constraint | DDL comment | **true** | `ALTER TABLE t DROP CONSTRAINT old_pk` |
| Drop old surrogate column (if applicable) | `set_unused` + `drop_unused_columns` | false | Only when transitioning from surrogate to business |
| Drop old sequence (if `pk:SEQ`) | `drop_sequence` | false | — |
| Add new PK column(s) if missing | `add_column` | false | Nullable first |
| **MANUAL**: populate new PK column(s) | comment | **true** | Step guide in SQL comment |
| Modify new PK column(s) to NOT NULL | DDL comment | **true** | After populate |
| Add new PK constraint | DDL comment | **true** | After NOT NULL |
| Re-create child FKs with new columns | `add_fk` | false | After new PK exists |

All steps with `requiresManualIntervention = true` emit commented-out SQL:
```sql
-- ⚠ STEP N: MANUAL — populate order_no before proceeding
-- UPDATE orders SET order_no = ... WHERE order_no IS NULL;
-- ALTER TABLE orders MODIFY (order_no NOT NULL);
-- ALTER TABLE orders ADD CONSTRAINT orders_order_no_pk PRIMARY KEY (order_no);
```

### 4.4 DESTRUCTIVE warning

Emit a `DiffWarning` with `level: 'DESTRUCTIVE'`:

```
Primary key change on table "orders": surrogate(id) → business(order_no).
All foreign keys referencing this table will be dropped and re-created.
Data migration is required before the new PK constraint can be activated.
```

### 4.5 Child table FK updates

`_diffFks()` already handles FK add/drop per-table. When a parent table's PK columns change, child tables' FK constraints must be updated. The diff computes this automatically because child tables reference the parent by table name, not by column name — if the parent PK columns changed, the child FK will differ and `_diffFks()` will emit the correct drop + re-create.

**Prerequisite**: `_diffPk()` must run before `_diffFks()` on the parent table, and the child table diff must run after the parent. This is already guaranteed by topological sort (parent tables are processed before children — same order used for `CREATE TABLE` emissions).

### 4.6 Constraint naming rules

| Scenario | Constraint name |
|---|---|
| Single business PK `col /pk` | `<table>_<col>_pk` |
| Composite business PK `table /pk c1, c2` | `<table>_pk` |
| Surrogate auto PK | `<table>_pk` |

These match the existing DDL generator naming conventions.

---

## 5. Edge Cases and Constraints

### 5.1 `pk: NONE` / `genpk: no`

- `genpk: no` — no `id` column at all; the table simply has no surrogate PK. Safe to transition to a business PK via diff because there is no surrogate column to drop.
- `pk: NONE` — the `id` column is still generated (with no default population). For diff purposes, treat the same as a surrogate PK with an `id` column that must be dropped when transitioning to a business PK.

### 5.2 No-op cases

Do NOT emit any PK diff statement when:
- Old and new both have the same surrogate PK (no change).
- Old and new both have the same business PK column(s) in the same order.
- Only the PK _type_ changes between `pk:GUID` / `pk:SEQ` / `pk:identity` — these affect the default expression only, handled separately in column modification.

### 5.3 Composite PK column order matters

`ORDER BY (a, b)` and `ORDER BY (b, a)` are different PK constraints even if they enforce the same uniqueness. The diff must detect order changes and emit a DROP + re-create even if the column set is the same.

### 5.4 Composite PK with `/nn` on columns

New PK columns added to an existing table must be nullable at add time (otherwise the ADD fails if any rows exist). The `requiresManualIntervention` block guides the user through:
1. Add column (nullable)
2. Populate
3. Modify to NOT NULL
4. Add PK constraint

---

## 6. Implementation Notes

### 6.1 `getPkColumns()` helper

A new helper on `IDdlNode` (or computed in `_diffPk`) is needed to return the ordered list of all PK column names, not just the first one:

```typescript
// Pseudocode — actual implementation depends on DdlNode internals
function getPkColumns(node: IDdlNode): string[] {
    if (node.isOption('pk')) {
        // table-level /pk col1, col2
        return node.getOptionValue('pk').split(',').map(s => s.trim());
    }
    const col = node.children.find(c => c.isOption('pk'));
    if (col) return [col.parseName()];
    const genId = node.getGenIdColName();
    return genId ? [genId] : [];
}
```

### 6.2 Surrogate detection

```typescript
function isSurrogate(node: IDdlNode): boolean {
    // Table has no /pk option and no column with /pk — PK is auto-generated
    return !node.isOption('pk') && !node.children.some(c => c.isOption('pk'));
}
```

### 6.3 Step counter integration

Steps within `_diffPk()` use the same `requiresManualIntervention = true` pattern as existing manual steps (e.g. in `_addColumn`). The front-end groups these by `requiresManualIntervention` flag and presents them with the existing ⚠ indicator.

---

## 7. Test Cases

| # | Scenario | Expected output |
|---|---|---|
| 7.1 | No PK change (surrogate → surrogate, same columns) | No PK statements emitted |
| 7.2 | No PK change (composite → composite, same columns, same order) | No PK statements emitted |
| 7.3 | Surrogate → single business PK | DESTRUCTIVE warning + manual intervention block |
| 7.4 | Surrogate → composite business PK (2 cols) | DESTRUCTIVE warning + manual block for both cols |
| 7.5 | Composite PK: add one column | DROP + re-create, manual for new col |
| 7.6 | Composite PK: remove one column | DROP + re-create, no manual needed |
| 7.7 | Composite PK: reorder columns | DROP + re-create |
| 7.8 | Business PK + child table with FK | Child FK dropped before parent PK drop, re-created after |
| 7.9 | `genpk: no` → composite PK | No id column to drop, only ADD constraint steps |
| 7.10 | Composite PK, no change in columns, only nullability change | Handled by `_modifyColumn`, no PK diff |

---

## 8. Out of Scope for This Spec

- **Partial index on PK columns** — Oracle does not support this; non-issue.
- **Deferrable PK constraints** — not currently modelled in ExpreSQL.
- **Invisible columns in PK** — Oracle 12c+ allows this; out of scope until needed.
- **Pre-flight validation against live DB** — remains out of scope; `oldQsql` is the source of truth.
