# Quick SQL Grammar <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Datatypes](#datatypes)
- [Table Directives](#table-directives)
    - [Star/Snowflake schema relationship direction indicators](#starsnowflake-schema-relationship-direction-indicators)
- [Column Directives](#column-directives)
    - [Multi-lingual columns (/trans)](#multi-lingual-columns-trans)
- [Views](#views)
    - [View Syntax](#view-syntax)
    - [View Example](#view-example)
- [Annotations](#annotations)
    - [Annotation Syntax](#annotation-syntax)
    - [DESCRIPTION Annotation](#description-annotation)
    - [Annotation Examples](#annotation-examples)
- [Settings](#settings)
    - [apex](#apex)
    - [api](#api)
    - [auditcols](#auditcols)
    - [boolean](#boolean)
    - [compress](#compress)
    - [transcontext](#transcontext)
    - [createdByCol](#createdbycol)
    - [createdCol](#createdcol)
    - [date](#date)
    - [db](#db)
    - [dialect](#dialect)
    - [drop](#drop)
    - [language](#language)
    - [longVC](#longvc)
    - [ondelete](#ondelete)
    - [overrideSettings](#overridesettings)
    - [PK](#pk)
    - [prefix](#prefix)
    - [prefixPKwithTname](#prefixpkwithtname)
    - [genPK](#genpk)
    - [resetsettings](#resetsettings)
    - [rowkey](#rowkey)
    - [tenantID](#tenantid)
    - [rowVersion](#rowversion)
    - [schema](#schema)
    - [semantics](#semantics)
    - [updatedByCol](#updatedbycol)
    - [updatedCol](#updatedcol)
    - [verbose](#verbose)
    - [inserts](#inserts)
    - [ifc](#ifc)
    - [dv](#dv)
    - [editionable](#editionable)
    - [aienrichment](#aienrichment)
    - [namelen](#namelen)
    - [datalimit](#datalimit)
- [Schema Migration](#schema-migration)
- [API Reference](#api-reference)
    - [toDDL](#toddl)
    - [toERD](#toerd)
    - [toErrors](#toerrors)
    - [toDiff](#todiff)
    - [fromJSON](#fromjson)
    - [qsql\_version](#qsql_version)
    - [registerGenerator / BaseGenerator](#registergenerator--basegenerator)
- [Document](#document)
- [Grammar](#grammar)

<!-- 1. [Datatypes](#datatypes)
1. [Table Directives](#table-directives)
2. [Column Directives](#column-Directives)
3. [Views](#views)
4. [Settings](#settings)
5. [Grammar](#grammar) -->

> **See also:** [Practical Examples](examples.md) — 15 end-to-end scenarios with QSQL input and generated DDL output, covering parent-child hierarchies, star schemas, JSON duality views, multi-lingual columns, TAPI, ORDS, Oracle SQL annotations, and more.

## Comments

A comment can appear between any keywords, parameters, or punctuation marks in a statement. You can include a comment in a statement in two ways:
- Begin the comment with a slash and an asterisk (/*). Proceed with the text of the comment. This text can span multiple lines. End the comment with an asterisk and a slash (*/). The opening and terminating characters need not be separated from the text by a space or a line break.
- Begin the comment with -- (two hyphens). Proceed with the text of the comment. This text cannot extend to a new line. End the comment with a line break.

## Datatypes

<!-- markdownlint-disable MD013 -->
| QSQL shorthand | Oracle DDL type | Db2 LUW DDL type |
| --- | --- | --- |
| `boolean`, `bool` | `BOOLEAN` (23c+) · `CHAR(1) CHECK (col IN ('Y','N'))` on older. Override with the [`boolean`](#boolean) setting. | `BOOLEAN` (11.5+, always native) |
| `num`, `number` | `NUMBER` | `DECIMAL(15,4)` |
| `num(p,s)` | `NUMBER(p,s)` | `DECIMAL(p,s)` |
| `int`, `integer` | `INTEGER` | `INTEGER` |
| `d`, `date` | `DATE` | `DATE` |
| `ts`, `timestamp` | `TIMESTAMP` | `TIMESTAMP` |
| `tstz`, `tswtz`, `timestamp with local time zone` | `TIMESTAMP WITH LOCAL TIME ZONE` | `TIMESTAMP WITH TIME ZONE` |
| `char`, `vc`, `varchar`, `varchar2`, `string` | `VARCHAR2(4000 char)` | `VARCHAR(4000)` |
| `vcNNN`, `vc(NNN)` | `VARCHAR2(NNN char)` | `VARCHAR(NNN)` |
| `vc32k` | `VARCHAR2(32767)` | `VARCHAR(32672)` |
| `vcNk` | `VARCHAR2(N×1024)` — e.g. `vc4k` → `VARCHAR2(4096)` | `VARCHAR(N×1024)` |
| `clob` | `CLOB` | `CLOB` |
| `blob` | `BLOB` | `BLOB` |
| `json` | `JSON` (23c+) · `CLOB CHECK (col IS JSON)` on older | `JSON` (11.5+) |
| `xml` | `XMLTYPE` | `XML` |
| `geometry`, `sdo_geometry` | `SDO_GEOMETRY` | `DB2GSE.ST_GEOMETRY` |
| `vect`, `vector` | `VECTOR(*,*,*)` (23c+) | `CLOB` _(placeholder — use `VECTOR(n)` on Db2 12+/watsonx)_ |
| `vectNNN`, `vect(NNN)` | `VECTOR(NNN,*,*)` (23c+) | `CLOB` _(placeholder)_ |
| `file` | `BLOB` + `_FILENAME`, `_CHARSET`, `_MIMETYPE`, `_LASTUPD` columns (APEX upload pattern) | `BLOB` + same metadata columns |
<!-- markdownlint-enable MD013 -->

## Table Directives

<!-- markdownlint-disable MD013 -->
| Directive | Description | Dialect |
| --- | --- | --- |
| `/api [tier]` | Generate layered Table API. The optional *tier* selects which layers are generated: `lookup`, `lookup+hks`, `service`, `service+hks`, `full`, `full+hks` (default). **Oracle:** generates PL/SQL packages (`_dal`, `_hks`, `_svc`, `_app`/`_rst`). **Db2:** generates schema-scoped SQL PL procedures (`_dal`, `_hks`, `_svc`, `_app`/`_rst`). Interface controlled by [`ifc`](#ifc). See [api](#api) setting. | All |
| `/audit` | Adds Oracle auditing (`AUDIT ALL ON <TABLE>`). On Db2, emits a comment recommending an IBM Db2 Audit Policy instead. | All *(Oracle feature)* |
| `/auditcols`, `/audit cols` | Adds `CREATED`, `CREATED_BY`, `UPDATED`, `UPDATED_BY` columns and trigger logic. **Oracle:** `SYSDATE` / `v('APP_USER')`. **Db2:** `CURRENT TIMESTAMP` / `CURRENT USER`. | All |
| `/auditlog [table]` | Generates an audit package with `PRAGMA AUTONOMOUS_TRANSACTION` that logs all DML to a developer-supplied audit table. The generated package calls `<log_table>_svc.create_rec` inside an autonomous transaction. | Oracle only |
| `/check` | Table-level CHECK constraint. | All |
| `/colprefix` | Prefix all columns of the table with this value (underscore appended automatically). | All |
| `/compress`, `/compressed` | Creates the table compressed. | Oracle only |
| `/flashback`, `/fda` | Enable Flashback Data Archive. Optionally specify an archive name, e.g. `/flashback myarchive`. | Oracle only |
| `/history` | *(23ai+)* Temporal history: generates a `<table>_history` shadow table and triggers with `valid_from` / `valid_to` timestamps. | Oracle only |
| `/immutable` | *(21c+)* Append-only table. A BEFORE UPDATE OR DELETE trigger raises an application error. | Oracle only |
| `/insert NN` | Generate NN random INSERT statements (max 1000). | All |
| `/notenantid` | Marks a table as supra-tenant (no `TENANT_ID` column). Used with the [`tenantid`](#tenantid) setting. | Oracle only |
| `/rest` | REST-enable the table using Oracle REST Data Services (ORDS). | Oracle only |
| `/rowversion` | Adds a `ROW_VERSION` column and a BEFORE UPDATE trigger that increments it. **Oracle:** `NUMBER`. **Db2:** `INTEGER`, SQL PL syntax. | All |
| `/soda` | *(21c+)* Creates a SODA-compatible JSON document collection table. | Oracle only |
| `/unique`, `/uk` | Table-level UNIQUE constraint. | All |
| `/pk` | Explicit primary key constraint (composite on the table level). | All |
| `{annotations}` | Oracle SQL Annotations on the table. `DESCRIPTION` generates `COMMENT ON TABLE`. See [Annotations](#annotations). | Oracle only |
<!-- markdownlint-enable MD013 -->

### Star/Snowflake schema relationship direction indicators

In star (and snowflake) database model tables are organized into a hierarchy
where the table at the top (fact) is in many-to-one relationship to children (dimension tables).
Consequently, each dimension table is equipped with primary key, which is referenced via foreign
key constraint in the fact table. For example, given the Sales fact table together with Products
and Customers dimension tables, the star database model is expressed in QSQL as:

```
sales
  quantity
  > products
    name
  > customers 
    first name  
```

The more-than symbol `>` hints the many-to-one relationship between the table cardinalities.
The opposite -- one-to-many relationship -- is denoted by the `<` prefix, which is default,
and is usually omitted from QSQL schema definition.

[Sales-Product-Customer Example](../../test/star/sales_product_customers.qsql)

## Column Directives

<!-- markdownlint-disable MD013 -->
| Directive | Description | Dialect |
| --- | --- | --- |
| `/idx`, `/index`, `/indexed` | Creates a non-unique index on the column. | All |
| `/unique`, `/uk` | Creates a unique constraint on the column. | All |
| `/check` | Check constraint with comma-delimited values, e.g. `/check Yes, No`. | All |
| `/constant` | Sets this column to a constant value in generated INSERT data, e.g. `/constant NYC`. | All |
| `/default` | Adds a DEFAULT value clause to the column. | All |
| `/domain` | *(23ai+)* Use an Oracle SQL Domain as the column type, e.g. `/domain email_d`. | Oracle only |
| `/values` | Comma-separated list of values to use in generated INSERT data, e.g. `/values 1, 2, 3`. | All |
| `/upper` | Forces column values to upper case via a BEFORE INSERT OR UPDATE trigger. | Oracle only |
| `/lower` | Forces column values to lower case via a BEFORE INSERT OR UPDATE trigger. | Oracle only |
| `/nn`, `/not null` | Adds a NOT NULL constraint. | All |
| `/between` | Adds a BETWEEN check constraint, e.g. `/between 1 and 100`. | All |
| `/references`, `/reference`, `/fk` | Foreign key reference, e.g. `/fk departments`. Can reference tables outside the model. | All |
| `/cascade` | ON DELETE CASCADE on the FK column. | All |
| `/setnull` | ON DELETE SET NULL on the FK column. | All |
| `/pk` | Marks this column as the explicit primary key. Prefer auto-generated PKs when possible. | All |
| `/trans`, `/translation` | Marks a column for multi-lingual support. Generates a shared `language` table, a `<table>_trans` table, and a `<table>_resolved` view using `sys_context`. See [`transcontext`](#transcontext). | Oracle only |
| `--`, `[comments]` | Inline comment — double-dash or square-bracket syntax. | All |
| `{annotations}` | Oracle SQL Annotations on the column. `DESCRIPTION` generates `COMMENT ON COLUMN`. See [Annotations](#annotations). | Oracle only |
<!-- markdownlint-enable MD013 -->

### Multi-lingual columns (/trans)

Marking one or more columns with `/trans` activates QuickSQL's translation pattern. Three objects are generated:

| Object | Purpose |
|---|---|
| `<prefix>language` table | Shared lookup table (created once for the whole schema). Stores language codes (`code VARCHAR2(5)` PK), locale, name, and native name. |
| `<table>_trans` table | One row per (parent row × language). Contains the FK to the parent table, a FK to `language`, and one `trans_<col>` column for every `/trans`-marked column. A UNIQUE constraint on `(parent_id, language_code)` prevents duplicates. |
| `<table>_resolved` view | `LEFT JOIN`s the parent table with `<table>_trans` on the `language_code` matching the expression defined by [`transcontext`](#transcontext) (default: `sys_context('APP_CTX','LANG')`). Uses `COALESCE` so untranslated rows fall back to the base-table value. |

**Important:** the base table **keeps** the original columns. `/trans` does not remove them — the `_resolved` view overlays translations on top via `COALESCE`.

**Example input:**

```quicksql
dept /immutable
  dname /trans

# prefix: abc
```

**Generated objects:**

```sql
-- Base table — dname column is kept here as fallback
create table abc_dept (
    id      number generated by default on null as identity
            constraint abc_dept_id_pk primary key,
    dname   varchar2(4000 char)
);

-- Immutable trigger (because of /immutable)
create or replace trigger trg_abc_dept_insertonly
    before update or delete on abc_dept
begin
    raise_application_error(-20055, 'abc_dept is immutable');
end;
/

-- Shared language lookup (created once for the whole schema)
create table abc_language (
    code           varchar2(5 char) not null
                   constraint abc_language_code_pk primary key,
    locale         varchar2(28 char) not null
                   constraint abc_language_locale_unq unique,
    name           varchar2(1024 char),
    native_name    varchar2(1024 char)
);

-- Translation table — translated column prefixed with trans_
create table abc_dept_trans (
    id               number generated by default on null as identity
                     constraint abc_dept_trans_id_pk primary key,
    dept_id          number not null,
    language_code    varchar2(5 char) not null,
    trans_dname      varchar2(4000 char),
    constraint abc_dept_trans_uk unique (dept_id, language_code)
);

alter table abc_dept_trans add constraint abc_dept_trans_de_id_fk
    foreign key (dept_id) references abc_dept;
alter table abc_dept_trans add constraint abc_dept_trans_lang_fk
    foreign key (language_code) references abc_language (code);

-- Resolved view — falls back to base-table value when no translation exists
create or replace view abc_dept_resolved as
select k.id,
       coalesce(t.trans_dname, k.dname) as dname
from   abc_dept k
left join abc_dept_trans t
    on  t.dept_id       = k.id
    and t.language_code = sys_context('APP_CTX', 'LANG');
```

Use the `transcontext` setting to change the language-resolution expression:

```quicksql
# transcontext: "sys_context('MY_CTX','LANGUAGE')"
```

## Views

### View Syntax

```quicksql
view [view_name] [table name] [table name]...
```

Ensure the view name contains no spaces, ensure the table names contain no
spaces. Delimit table names by a space or comma.

### View Example

```quicksql
dept 
  dname 
  loc 
  emp 
    ename 
    job 
    
view dept_emp emp dept
```

This syntax restricts views to conjunctive queries (i.e. containing equijoin
predicates) only.

### Duality View Syntax (23ai+)

```quicksql
dv [view_name] [root_table] [nested_table]...
```

JSON Relational Duality Views expose relational data as JSON documents. The first table is the root; subsequent tables are nested as child or parent objects based on their foreign key relationships.

### Duality View Example

```quicksql
# settings = {db: "23ai"}
departments
    name
    employees
        first_name
        last_name
        salary num

dv dept_emp_dv departments employees
```

Generates:

```sql
create or replace json relational duality view dept_emp_dv as
departments @insert @update @delete
{
    _id       : id,
    name      : name,
    employees : employees @insert @update @delete
    [{
        _id        : id,
        first_name : first_name,
        last_name  : last_name,
        salary     : salary
    }]
};
```

## Annotations

Oracle SQL annotations can be added to tables, columns, and views using curly braces `{...}`. Annotations are included in the generated DDL as `ANNOTATIONS (...)` clauses.

### Annotation Syntax

```quicksql
table_name {Key 'value', AnotherKey "value", FlagKey}
    column_name {Key 'value'}
```

- Key-value annotations: `Key 'value'` or `Key "value"` (single or double quotes)
- Flag annotations (no value): `FlagKey`
- Multiple annotations are comma-separated

### DESCRIPTION Annotation

When an annotation has the key `DESCRIPTION`, a `COMMENT ON` statement is automatically generated from its value. This applies to both tables and columns. If a node has both a `DESCRIPTION` annotation and an explicit comment (`[...]` or `--`), the `DESCRIPTION` annotation takes precedence.

```quicksql
departments {DESCRIPTION 'Main HR departments table', Classification 'HR'}
    name {DESCRIPTION 'The department name'}
```

Generates:

```sql
create table departments (
    ...
)
annotations (DESCRIPTION 'Main HR departments table', Classification 'HR');

comment on table departments is 'Main HR departments table';
comment on column departments.name is 'The department name';
```

### Annotation Examples

```quicksql
-- Table-level annotation
departments {UI_Display 'Departments', Classification 'HR'}
    name

-- Column-level annotation
departments
    name {UI_Display 'Department Name'}

-- Annotations combined with directives
departments
    name /nn {Format 'text'}

-- View annotation
view dept_v dept {UI_Display 'Department View'}
```

### AI Enrichment (aienrichment + db >= 26)

When the `aienrichment` setting is `yes` and `db` is `26ai` or higher, Quick SQL additionally generates a PL/SQL block that populates the `METADATA_ANNOTATIONS` AI enrichment layer. This enables Oracle 26ai features such as `METADATA_ANNOTATIONS_USAGE`, `METADATA_ANNOTATIONS_GROUPS`, and `METADATA_ANNOTATIONS_GROUP_MEM` views.

For key-value annotations, `metadata_annotations.set()` calls are generated:

- **Table annotations** — `metadata_annotations.set(label, value, 'TABLE_NAME')`
- **Column annotations** — `metadata_annotations.set(label, value, 'TABLE.COLUMN', 'TABLE COLUMN')`
- **View annotations** — `metadata_annotations.set(label, value, 'VIEW_NAME', 'VIEW')`

For `GROUP` annotations, `metadata_annotations.create_group()` and `metadata_annotations.add_to_group()` calls are generated.

Flag annotations (without a value) are skipped since the package requires a value argument.

## Settings

You can enter inline settings to explicitly set SQL syntax generation options.
Alternatively, you can click Settings at the top of the right pane to
declaratively set the generation options.

> **UI vs inline-only settings**  
> All settings are available both in the ⚙ Settings panel and as inline `#` directives. One exception: `resetsettings` has no persistent value — it is a one-shot directive that clears all active settings when the script is parsed. It cannot be represented as a panel control and must be written inline.

Entering settings directly into the Quick SQL Shorthand pane ensures the same
SQL generation options are utilized even if you download the script and later
paste it back. For example, enter the following to prefix all table names with
TEST and generate for schema OBE:

```quicksql
# settings = { prefix: "test", schema: "OBE" }
```

Alternatively, enter each setting on a separate line for the same result:

```quicksql
# prefix: "test"
```

```quicksql
# schema: "OBE"
```

Note: The settings must start on a new line and begin with # settings = to enter
multiple settings, or # to enter a single setting per line. All values are case
insensitive. Brackets, spaces, and commas can be added for clarity but are
ignored. To have all settings generated use:

```quicksql
# verbose: true
```

The available settings are listed in the below sections.

### Settings by dialect

| Setting | All dialects | Oracle only | Notes |
|---|---|---|---|
| `api` | ✓ | | Oracle: PL/SQL packages. Db2: schema-scoped SQL PL procedures. |
| `apex` | | ✓ | Oracle APEX user function for audit columns. |
| `auditcols` | ✓ | | Oracle: `SYSDATE` / `v('APP_USER')`. Db2: `CURRENT TIMESTAMP` / `CURRENT USER`. |
| `boolean` | | ✓ | Oracle Y/N vs native control. Db2 always generates native `BOOLEAN`. |
| `compress` | | ✓ | |
| `createdByCol` | ✓ | | |
| `createdCol` | ✓ | | |
| `datalimit` | ✓ | | |
| `date` | | ✓ | Oracle DATE type variant. Db2 always maps `d` → `DATE`. |
| `db` | | ✓ | Oracle version targeting (11g → 26ai). |
| `dialect` | ✓ | | Selects the SQL dialect. |
| `drop` | ✓ | | Oracle: `DROP … CASCADE CONSTRAINTS`. Db2: `DROP … IF EXISTS`. |
| `dv` | | ✓ | JSON Duality Views (23ai+). |
| `editionable` | | ✓ | Oracle EBR. |
| `aienrichment` | | ✓ | Oracle 26ai metadata annotations. |
| `genPK` | ✓ | | |
| `ifc` | ✓ (`app`, `rest`, `both`) | ✓ (`app`, `rest`, `both`) | `app` and `rest` work for both dialects. `both` generates `_app` + `_rst` simultaneously. |
| `inserts` | ✓ | | |
| `language` | ✓ | | |
| `longVC` | ✓ | | |
| `namelen` | ✓ | | |
| `ondelete` | ✓ | | |
| `overrideSettings` | ✓ | | |
| `pk` | ✓ | | `guid` → `SYS_GUID()` on Oracle; maps to `IDENTITY` on Db2. |
| `prefix` | ✓ | | |
| `prefixPKwithTname` | ✓ | | |
| `resetsettings` | ✓ | | |
| `rowkey` | | ✓ | |
| `rowVersion` | ✓ | | Oracle: `NUMBER`. Db2: `INTEGER`, SQL PL trigger. |
| `schema` | ✓ | | |
| `semantics` | | ✓ | Oracle `CHAR`/`BYTE` semantics for VARCHAR2. |
| `tenantID` | | ✓ | |
| `tenantRef` | | ✓ | |
| `transcontext` | | ✓ | Oracle application context for `/trans`. |
| `updatedByCol` | ✓ | | |
| `updatedCol` | ✓ | | |
| `verbose` | ✓ | | |

---

### apex

> **Dialect:** Oracle only

**Possible values**: `true`, `false`  
**Default value**: `false`

This setting controls the syntax generated to support audit columns.
Specifically if audit columns are enabled triggers are generated to maintain the
user creating a row and the user last updating a row. When enabled the following
function is used:

```sql
coalesce(sys_context('APEX$SESSION','APP_USER'),user)
```

When not enabled the following function is used:

```sql
user
```

### api

**Possible Values**: `true`, `false`, `layered`  
**Default Value**: `false`

Generate PL/SQL APIs on all tables for create, read, update, and delete operations.

| Value | Behaviour |
|---|---|
| `false` | No API generated (default). |
| `true` | Generates a single `<table>_api` package with create, read, update, delete procedures. |
| `layered` | Enables the layered TAPI system (see below). Tables marked with `/api` get the full six-layer stack unless overridden per table. |

#### Layered TAPI tiers

Each table with a `/api <tier>` directive generates a stack of PL/SQL packages. The tier argument is self-contained — no global setting needed:

| Tier | Packages generated | Notes |
|---|---|---|
| `lookup` | `_app` | Minimal: application interface only, no service logic. |
| `lookup+hks` | `_hks`, `_app` | Adds hook stubs for business rules. |
| `service` | `_svc`, `_app` | Service layer absorbs private DML (no `_dal`). |
| `service+hks` | `_hks`, `_svc`, `_app` | Adds hook stubs; SVC delegates to `_hks`. |
| `full` | `_dal`, `_svc`, `_app` | Full stack without hook stubs. |
| `full+hks` | `_dal`, `_hks`, `_svc`, `_app` | Full stack (default for bare `/api`). |

Numeric aliases: `1` = `lookup`, `1h` = `lookup+hks`, `2` = `service`, `2h` = `service+hks`, `3` = `full`, `3h` = `full+hks`.

**Degradation rule**: each layer calls the layer below when present; when a lower layer is absent, its logic is absorbed as private procedures. For example, a `service` tier SVC body embeds private `p_get_by_id`, `p_insert_row`, `p_update_row`, `p_delete_row` procedures instead of calling `_dal`.

**Interface package**: controlled by the [`ifc`](#ifc) setting (`app`, `rest`, or `both`). Default is `app`, which generates `_app` (named-parameter procedures). Use `rest` to generate `_rst` (ORDS/HTTP handlers) instead, or `both` to generate both. `apex` is a backward-compatible alias for `app`.

```quicksql
-- default: log table is app_audit_log (with prefix applied)
employees /api full+hks /auditlog
  name vc100 /nn

-- explicit: name the log table directly
app_audit_log /api full+hks
  entity    vc128 /nn
  entity_id num   /nn
  operation vc6   /nn

employees /api full+hks /auditlog app_audit_log
  name vc100 /nn
```

Per-table tier override (two tables, different tiers in the same schema):

```quicksql
-- lookup_codes only needs the app interface
lookup_codes /api lookup
  code  vc20 /nn
  label vc100 /nn

-- employees needs the full stack with hooks and audit
employees /api full+hks /auditlog
  name       vc100 /nn
  email      vc200 /nn /unique
  row_version num /nn
```

#### API and multi-tenancy (`tenantid: yes`)

When `tenantid: yes` is active, every tenant-scoped table automatically receives a `tenant_id NUMBER NOT NULL` column. The API generator is aware of this and adds `p_tenant_id` to all four procedures:

- **`get_row`** — `p_tenant_id` is an `OUT` parameter; the `WHERE` clause filters `AND tenant_id = p_tenant_id`.
- **`insert_row`** — `p_tenant_id` is an `IN` parameter written into the `tenant_id` column.
- **`update_row`** — `p_tenant_id` is an `IN` parameter; the `WHERE` clause includes `AND tenant_id = p_tenant_id` to prevent cross-tenant mutations.
- **`delete_row`** — `p_tenant_id` is an `IN` parameter; the `WHERE` clause includes `AND tenant_id = p_tenant_id`.

Tables marked `/notenantid` are excluded from this behaviour and receive no `p_tenant_id` parameter.

```quicksql
customers
  full_name vc200 /nn
  email     vc200 /nn /unique

# settings = { api: yes, tenantid: yes }
```

Generated signature (excerpt):

```sql
procedure insert_row (
    p_id          in  integer  default null,
    p_tenant_id   in  integer  default null,
    p_full_name   in  varchar2 default null,
    p_email       in  varchar2 default null
);

procedure delete_row (
    p_id        in integer,
    p_tenant_id in integer
);
```

### auditcols

**Possible Values**: `true`, `false`  
**Default Value**: `false`

Adds an additional created, created_by, updated and updated_by columns to every
table created.

### boolean

> **Dialect:** Oracle only — Db2 always generates native `BOOLEAN`; this setting is ignored.

**Possible Values**: `yn`, `native`  
**Default Value**: inferred from `#db`

Controls how `boolean`/`bool` columns are represented in the generated DDL.

| Value | Generated type | Notes |
|---|---|---|
| `native` | `BOOLEAN` | Requires Oracle 23c or higher. Default when `db: 23c` or higher. |
| `yn` | `CHAR(1) CHECK (col IN ('Y','N'))` | Legacy pattern for pre-23c databases. |

This setting takes priority over `#db`, allowing you to use the legacy `yn` representation even when `db: 23c` is set (useful when the schema must stay compatible with older clients).

### compress

> **Dialect:** Oracle only

**Possible Values**: `true`, `false`  
**Default Value**: `false`

When enabled creates all tables compressed.

### transcontext

> **Dialect:** Oracle only — tied to `/trans` which uses Oracle `sys_context`.

**Default Value**: `sys_context('APP_CTX','LANG')`

The SQL expression used in the `_resolved` view to determine the current language
when using `/trans` column directives. For example, to use a different application
context:

```quicksql
# transcontext: "sys_context('MY_CTX','LANGUAGE')"
```

### createdByCol

**Default Value**: `created_by`

When Audit Columns are enabled the default column used to track the user who
created a row is CREATED_BY. Use this setting to override default audit column
name.

### createdCol

**Default Value**: `created`

When Audit Columns are enabled the default column used to track the user who
created a row is CREATED. Use this setting to override default audit column
name.

### date

> **Dialect:** Oracle only — controls how the `d`/`date` QSQL shorthand maps to Oracle SQL types. Db2 always maps `d` → `DATE`.

**Possible Values**: `date`, `timestamp`, `timestamp with timezone`, `TSWTZ`,
`timestamp with local time zone`, `TSWLTZ`  
**Default Value**: `date`

By default all DATE columns created using the Oracle DATE datatype. Use this
setting to override this default.

### db

> **Dialect:** Oracle only — targets a specific Oracle version. Ignored when `dialect: db2`.

**Possible Values**: `11g`, `12c`, `19c`, `21c`, `23c`, `26ai`
**Default Value**: `19c`

Specifies the database version the syntax should be compatible with. The version string is reduced to major version number.  Therefore, 23, 23c, 23ai, and 23.1.1 are all legitimate values equivalent to 23.

### dialect

**Possible Values**: `oracle`, `db2`  
**Default Value**: `oracle`

Selects the SQL dialect for DDL generation.

| Value | Target database | Notes |
|-------|----------------|-------|
| `oracle` | Oracle Database (default) | Full feature set: packages, APEX, ORDS, JSON Duality Views, MLE |
| `db2` | IBM Db2 LUW 11.1+ | SQL PL stored procedures, schema-based namespacing, no APEX/ORDS |

**Example:**

```quicksql
employees
  name         vc100 /nn
  hire_date    d
  salary       num(12,2)

# settings = {"dialect":"db2"}
```

**Db2-specific behaviour:**

- Column types: `VARCHAR` (not `VARCHAR2`), `DECIMAL(p,s)` (not `NUMBER`), `BOOLEAN` (11.5+), `JSON` (11.5+), `DOUBLE` for float.
- Primary key default: `INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY`. Use `pk: seq` for a sequence-based PK.
- Triggers: Db2 SQL PL syntax — `REFERENCING NEW AS n [OLD AS o]`, `SET n.col = value`, `CURRENT TIMESTAMP`, `CURRENT USER`.  The statement terminator is changed to `@` via `--#SET TERMINATOR @`.
- DROP: `DROP TABLE IF EXISTS` (no `CASCADE CONSTRAINTS`).
- Layered TAPI (`/api`): schemas replace Oracle packages — each tier gets its own schema (`_dal`, `_hks`, `_svc`, `_app`, `_rst`) containing `CREATE OR REPLACE PROCEDURE` statements.
- `ifc: app` (default) generates `_app` with named-parameter `get`/`ins`/`upd`/`del` procedures. `get` uses `SELECT … INTO` for per-column OUT params; `ins`/`upd`/`del` delegate to `_svc`. `ifc: rest` generates `_rst` with `GET DIAGNOSTICS`-based error handling and `json_object(…)` responses. `apex` is accepted as a backward-compatible alias for `app`.

### drop

**Possible Values**: `true`, `false`  
**Default Value**: `false`

Include SQL commands to drop each database object created.

### language

**Possible Values**: `EN`, `DE`, `KO`, `JA`  
**Default Value**: `EN`

Generate data used for insert statements using this language.

### longVC

**Possible Values**: `true`, `false`  
**Default Value**: `false`

Allow longer identifiers to be used for database object names. Longer
identifiers allow the maximum length a VARCHAR2 column datatype will be 32767
characters. When not set the maximum length of a VARCHAR2 column datatype will
be 4000 characters.

### ondelete

**Possible Values**: `cascade`, `restrict`, `set null`
**Default Value**: `cascade`

This setting controls how foreign key ON DELETE settings.

### overrideSettings

**Possible Values**: `true`, `false`  
**Default Value**: `false`

When enabled all application settings set via the user interface console are
ignored and only settings set in the script will be used.

### PK

**Possible Values**: `guid`, `seq`, `identity`, `none`  
**Default Value**: `identity`

Determines how the primary key will be set. Primary keys can be set using
SYS_GUID, identity column or sequence.

> **Db2 note:** `guid` is Oracle-specific (`SYS_GUID()`). When `dialect: db2` and `pk: guid` is set, the PK is generated as `INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY` (Db2 has no native UUID PK by default). Use `pk: seq` for a sequence-driven PK on Db2.

### prefix

Database object prefix. An underscore will be appended if not provided.

### prefixPKwithTname

**Possible Values**: `true`, `false`  
**Default Value**: `false`

Prefix primary key database table columns with name of table. For example the
primary key of the EMPLOYEE table would be EMPLOYEE_ID. Without setting the name
of implicitly created primary key columns will be ID.

### genPK

**Possible Values**: `true`, `false`  
**Default Value**: `true`

Automatically generate an ID primary key column for each table.

### resetsettings

*(inline only)*  

Resets all application settings to default values. When included, all application
settings currently active for your session will be ignored.

### rowkey

> **Dialect:** Oracle only

**Possible Values**: `true`, `false`  
**Default Value**: `false`

For each table created add a ROW_KEY column that generates an alphanumeric
identifier. Values of the ROW_KEY column will be set by generated database table
trigger logic.

### tenantID

> **Dialect:** Oracle only

**Possible Values**: `true`, `false`  
**Default Value**: `false`

Enables the shared-schema multi-tenancy pattern. When set to `yes`, for each generated **tenant** table (not marked `/notenantid`) QuickSQL automatically:

1. **Adds a `TENANT_ID NUMBER NOT NULL` column** (second column after the PK). Nullable only when the table uses `/insert N` — in that case run `ALTER TABLE … MODIFY tenant_id NOT NULL` after populating the sample data with a valid tenant.
2. **Generates an auto-FK `tenant_id → tenants(id)`** — when a table named `tenants` (or the value of `tenantref`) exists in the same script and `tenant_id` is synthetic (not declared explicitly). Customize the master table name with `tenantref: "workspaces"`.
3. **Generates a `(tenant_id, id)` composite unique index + `USING INDEX` constraint on the target table** — only on-demand when another tenant table references it via composite FK. Index is created first to avoid `ORA-01408`.
4. **Prefixes all FK indices with `tenant_id`** — `create index … on … (tenant_id, fk_col)` so that FK lookups use the tenant discriminator as the leading column.
5. **Scopes column-level `/unique` to `(tenant_id, col)`** — inline constraint suppressed, replaced by a composite unique index.
6. **Prefixes table-level `/unique` and explicit `/idx`** column indices with `tenant_id`.
7. **Generates composite foreign keys** `(tenant_id, fk_col) → target(tenant_id, id)` for all FK references between tenant tables — prevents cross-tenant referential integrity violations at DB level. Supports `/cascade` and `/setnull` on the FK column.

If `tenant_id` is already declared as an explicit column, the synthetic column is skipped (no duplicate); the auto-FK is also skipped (the user manages it via `/fk`).

**Supra-tenant tables** (lookup data, tenant master, global config) that must not have a `TENANT_ID` can be marked with the `/notenantid` table directive. QuickSQL skips the synthetic column and all tenant-scoped logic for those tables, and FK references to them remain simple (no composite).

```quicksql
subscription_plans /notenantid   -- supra-tenant: shared by all tenants, no TENANT_ID
  name  vc100 /nn
  price num(10,2) /nn

tenants /notenantid              -- master tenant table: supra-tenant
  name vc200 /nn

customers
  full_name vc200 /nn
  email     vc200 /nn /unique    -- becomes (tenant_id, email) unique index
  plan_id   /fk subscription_plans /nn  -- simple FK (supra-tenant target)

orders
  customer_id /fk customers /nn /cascade  -- composite FK with ON DELETE CASCADE

# settings = { prefix: "app_", tenantid: yes }
```

Generated highlights:

```sql
create table app_customers (
    id         number ... constraint app_customers_id_pk primary key,
    tenant_id  number not null,            -- ← added by tenantid: yes; NOT NULL by default
    plan_id    number ...
               references app_subscription_plans not null,  -- simple FK to supra-tenant
    full_name  varchar2(200 char) not null,
    email      varchar2(200 char) not null
);
-- email unique scoped to tenant
create unique index app_customers_tid_email_uix on app_customers (tenant_id, email);
-- FK index to supra-tenant table: plain (no tenant prefix)
create index app_customers_i1 on app_customers (plan_id);
-- auto-FK: tenant_id → tenants master table (tenants is in the same script)
alter table app_customers add constraint app_customers_tenant_id_fk
    foreign key (tenant_id) references app_tenants (id);
-- (tenant_id, id) unique on customers: on-demand (prerequisite for the FK from orders)
create unique index app_customers_tid_id_uix on app_customers (tenant_id, id);
alter table app_customers add constraint app_customers_tid_id_uq
    unique (tenant_id, id) using index app_customers_tid_id_uix;
-- composite FK between tenant tables with ON DELETE CASCADE
alter table app_orders add constraint app_orders_customer_id_fk
    foreign key (tenant_id, customer_id)
    references app_customers (tenant_id, id) on delete cascade;
```

See [Multi-Tenant Design](./multitenant-design.md) for the full enterprise guide: VPD, filtered views, application context, partitioning, and the complete hardening script.

#### tenantid and API generation

When `api: yes` (or `api: true`) is combined with `tenantid: yes`, the generated API procedures automatically include `p_tenant_id` so that every DML operation is scoped to the correct tenant. See [API and multi-tenancy](#api-and-multi-tenancy-tenantid-yes) for full details and examples.

### tenantRef

> **Dialect:** Oracle only

**Possible Values**: any table name string  
**Default Value**: `"tenants"`

Specifies the name of the master tenant table for the auto-FK generated by `tenantid: yes`. When the tenants master table has a name other than `tenants`, set this to the canonical table name (without prefix):

```quicksql
workspaces /notenantid
  name vc200 /nn

documents
  title vc200 /nn

# settings = { prefix: "app_", tenantid: yes, tenantref: "workspaces" }
```

QuickSQL generates `FOREIGN KEY (tenant_id) REFERENCES app_workspaces (id)` on `app_documents`.

### rowVersion

**Possible Values**: `true`, `false`  
**Default Value**: `false`

For each table generated add a ROW_VERSION column that increments by 1 for each
update. When enabled database table trigger logic will be generated to increment
row versions on update.

### schema

Prefix object names with a schema name. The default is no schema prefix for
object names.

### semantics

> **Dialect:** Oracle only — Oracle `VARCHAR2` supports `CHAR` and `BYTE` semantics; Db2 `VARCHAR` uses byte-length sizing only.

**Possible Values**:  `char`, `byte`  

You can choose between:

- No column semantics:

    ```sql
    varchar2(4000)
    ```

- Byte semantics:

    ```sql
    varchar2(4000 byte)
    ```

- Char semantics

    ```sql
    varchar2(4000 char)
    ```

### updatedByCol

**Default Value**: `updated_by`

When enabling audit columns use this setting to override the default audit column name.

### updatedCol

**Default Value**: `updated`

When enabling audit columns use this setting to override the default audit column name.

### verbose

**Possible Values**: `true`, `false`  
**Default Value**: `false`

Show all settings, not just settings that are different from the default.

### inserts

**Possible Values**: `true`, `false`  
**Default Value**: `true`

When set to `false`, suppresses all `INSERT` statements in the generated DDL even if `/insert N` directives appear in the schema. Useful when you want clean DDL without sample data, for example when deploying to production environments.

```quicksql
# inserts: false
employees /insert 10
  name vc100
```

The `/insert 10` directive is ignored and no INSERT statements are generated.

### ifc

**Possible Values**: `app`, `rest`, `both` (`apex` is a backward-compatible alias for `app`)  
**Default Value**: `app` (both dialects)

Controls which interface package is generated for layered TAPI tables.

| Value | Package generated | Dialect | Use when |
|---|---|---|---|
| `app` | `_app` | All | Named-parameter procedures, callable from any application code. |
| `apex` | `_app` | All | Backward-compatible alias for `app`. |
| `rest` | `_rst` | All | HTTP-aware procedures with status codes and JSON, for REST gateways (ORDS on Oracle, similar on Db2). |
| `both` | `_app` and `_rst` | All | Dual access: application code and REST clients simultaneously. |

The `_app` package exposes named IN/OUT parameters — no HTTP semantics.  
**Oracle**: `get` returns a `%ROWTYPE`; `ins`/`upd`/`del` call through to `_svc`.  
**Db2**: `get` uses `SELECT … INTO` to populate per-column OUT params; `ins`/`upd`/`del` delegate to `_svc` with a `p_status VARCHAR(20)` output.

The `_rst` package (Oracle) uses ORDS bind variables (`:body_text`, `:p_id`, `:status`) and emits JSON via `htp.p`.  
The `_rst` package (Db2) uses SQL PL `GET DIAGNOSTICS` for error handling and returns `json_object(…)` results.

```quicksql
# settings = { ifc: rest }

employees /api full+hks
  name       vc100 /nn
  email      vc200 /nn /unique
  row_version num /nn
```

```quicksql
# settings = { ifc: both }

employees /api
  name vc100 /nn
```

### dv

> **Dialect:** Oracle only — requires Oracle 23c+.

**Possible Values**: `true`, `false`  
**Default Value**: `false`

When set to `true`, automatically generates a JSON Relational Duality View for every parent-child relationship in the schema. Requires `db: 23c` or higher. Equivalent to adding `dv` statements manually for every table hierarchy.

```quicksql
# settings = { db: "23c", dv: true }
departments
  name
  employees
    first_name
    salary num
```

### editionable

> **Dialect:** Oracle only — Oracle Edition-Based Redefinition (EBR).

**Possible Values**: `true`, `false`  
**Default Value**: `false`

When enabled, all generated PL/SQL objects (triggers, packages, procedures) are created with the `EDITIONABLE` keyword, making them compatible with Oracle Edition-Based Redefinition (EBR). Requires Oracle 11g R2+.

```quicksql
# editionable: true
employees /api
  name vc100
```

### aienrichment

> **Dialect:** Oracle only — requires Oracle 26ai.

**Possible Values**: `true`, `false`  
**Default Value**: `false`

*(26ai+)* When enabled together with `db: 26ai`, generates an additional PL/SQL block that registers all Oracle SQL annotations in the `METADATA_ANNOTATIONS` AI enrichment layer. This enables Oracle 26ai features such as automatic column classification, sensitivity labelling, and AI-assisted data discovery.

Annotations with the `GROUP` key generate `metadata_annotations.create_group()` and `metadata_annotations.add_to_group()` calls. Flag annotations (no value) are skipped because the package requires a value argument.

```quicksql
# settings = { db: "26ai", aienrichment: "yes" }
employees {Classification 'HR', GROUP 'PII'}
  name {DESCRIPTION 'Full name', Sensitivity 'Private'}
  salary num
```

### namelen

**Default Value**: `128`

Maximum number of characters allowed for generated Oracle identifier names (tables, columns, constraints, indexes, packages). Oracle 12.2+ supports identifiers up to 128 characters; pre-12.2 releases support only 30. When targeting an older database, set this to `30` to avoid `ORA-00972: identifier is too long` errors.

```quicksql
# settings = { db: "19c", namelen: 30 }
```

### datalimit

**Default Value**: *(none)*

Global cap on the number of INSERT rows generated per table. Overrides any `/insert N` directive that exceeds this value. Useful to prevent accidentally generating large data sets in shared scripts.

```quicksql
# datalimit: 50
employees /insert 1000   -- capped at 50 rows
  name vc100
```

## Schema Migration

The QuickSQL editor supports **inline schema migration** using the `# ---` delimiter. Write both schema versions in the same editor, separated by the delimiter, and the DDL panel switches to migration mode automatically.

### Syntax

```
# ---
```

Any number of dashes (2+), with or without spaces, is accepted: `# ---`, `#--`, `# ----`, `#----------` all work. Regex: `/^#\s*-{2,}\s*$/m`. Only the **first** occurrence in the file is treated as the delimiter; subsequent occurrences are part of v2.

### Example

```quicksql
employees
  name vc100 /nn
  email vc200

# settings = { "prefix": "app_" }

# ---

employees
  name vc100 /nn
  email vc200 /nn
  phone vc50

departments
  dept_name vc100 /nn

# settings = { "prefix": "app_" }
```

Everything **above** `# ---` is the old schema (v1). Everything **below** is the new schema (v2), including any `# settings` that apply to v2.

### Behavior

| Editor content | DDL panel output |
|---|---|
| No `# ---` | Full DDL script (normal mode) |
| Contains `# ---` | Incremental migration script (`ALTER TABLE`, `CREATE TABLE`, …) |

In migration mode:
- **Copy** button becomes **Copy Migration SQL**
- **Download** saves as `migration-<timestamp>.sql`
- **Status bar** shows `Migration: +N · ~N modified · N statements · ⚠ N manual`
- Warning bars appear above the output for each `DESTRUCTIVE`, `LOSSY`, or `INFO` diagnostic
- The `# ---` line is highlighted in the editor with a distinct style

### Inserting the delimiter

Use the **⇄ Compare versions** button above the editor to automatically append `# ---` and position the cursor ready for the new schema. If the delimiter is already present the button has no effect.

### Edge cases

| Case | Behavior |
|---|---|
| v2 is empty | Generates DROP statements for all v1 tables |
| v1 is empty | Generates CREATE statements for all v2 tables |
| Multiple `# ---` | Only the first splits v1 from v2; subsequent ones are part of v2 |
| Parse error in v1 or v2 | The DDL panel shows the error message as in normal mode |

For the programmatic API, see [`toDiff`](#todiff) in the section below.

---

## API Reference

The Quick SQL library exposes a JavaScript API consumed by the browser UI and, via the Oracle MLE integration, by PL/SQL code running inside the database. All functions are exported from the `dist/quick-sql.js` (ESM) and `dist/quick-sql.umd.cjs` (UMD/CommonJS) bundles.

### toDDL

```javascript
toDDL(qsql: string, optionsJson?: string): string
```

Converts a Quick SQL shorthand string to Oracle DDL. Returns the generated SQL as a plain string.

The optional second argument must be a **JSON string** (not a parsed object) containing any settings you want to override. Settings passed here take effect even when `overridesettings` is not set.

```javascript
import { toDDL } from './dist/quick-sql.js';

const ddl = toDDL('employees\n  name vc100 /nn', '{"db":"23c","auditcols":"yes"}');
console.log(ddl);
```

### toERD

```javascript
toERD(qsql: string, optionsJson?: string): object
```

Returns a graph object describing the entity-relationship diagram. The object contains `nodes` and `edges` arrays suitable for passing to a graph layout library such as AntV X6 or JointJS. See `doc/user/quick-erd.md` for layout and rendering details.

### toErrors

```javascript
toErrors(qsql: string): Array<ErrorEntry>
```

Validates the Quick SQL shorthand and returns an array of diagnostic objects. Returns an empty array when there are no errors.

Each entry in the returned array has the following structure:

```typescript
interface ErrorEntry {
  from: {
    line:  number;   // 0-based line index where the error starts
    depth: number;   // indentation depth of the offending node
  };
  to: {
    line:  number;   // 0-based line index where the error ends (inclusive)
    depth: number;
  };
  message:  string;  // human-readable error description
  severity: string;  // "error" | "warning" | "info"
}
```

Example — checking errors and reading the first one:

```javascript
import { toErrors } from './dist/quick-sql.js';

const errors = toErrors('employees\n  /nn');   // column with no name
if (errors.length > 0) {
    const e = errors[0];
    console.log(`Line ${e.from.line}: [${e.severity}] ${e.message}`);
}
```

> **Note:** `toErrors` returns a JavaScript array, not a JSON string. Do not call `JSON.parse()` on its return value.

### toDiff

```javascript
toDiff(oldQsql: string, newQsql: string, options?: unknown): DiffResult
```

Computes an incremental Oracle DDL migration script between two Quick SQL schema versions. Returns a `DiffResult` object with the following structure:

```typescript
interface DiffResult {
  sql:        string;          // complete, runnable migration script
  statements: DiffStatement[]; // individual DDL statements in execution order
  warnings:   DiffWarning[];   // DESTRUCTIVE / LOSSY / INFO diagnostics
  summary:    DiffSummary;     // counts of added/dropped/modified tables and statements
}

interface DiffStatement {
  kind:                        DiffStatementKind; // e.g. 'add_column', 'drop_table', …
  table:                       string;
  column?:                     string;
  sql:                         string;
  requiresManualIntervention:  boolean;
}

interface DiffWarning {
  level:                       'DESTRUCTIVE' | 'LOSSY' | 'INFO';
  table:                       string;
  column?:                     string;
  message:                     string;
  requiresManualIntervention:  boolean;
}
```

`DiffStatementKind` values: `create_table`, `drop_table`, `create_view`, `drop_view`, `add_column`, `set_unused`, `drop_unused_columns`, `modify_column`, `add_fk`, `drop_fk`, `add_index`, `drop_index`, `add_sequence`, `drop_sequence`, `create_package`, `drop_package`, `rename_hint`.

**Execution order** — statements are sorted into a fixed 17-step sequence so the script can be run as-is: drop packages → drop views → drop FKs → drop tables → create tables → add columns → modify columns → set unused → add FKs → add indexes → create package specs → create views → create package bodies.

**NOT NULL additions** use a three-step safe pattern: ADD nullable → manual UPDATE comment (marked `requiresManualIntervention: true`) → MODIFY NOT NULL.

**Idempotency** — FK and index statements are wrapped in PL/SQL `BEGIN / EXCEPTION` blocks for databases older than 23c. On 23c+ the `IF [NOT] EXISTS` syntax is used instead.

**Rename detection** — when exactly one column is dropped and one of the same base type is added on the same table, a `rename_hint` statement (commented `ALTER TABLE … RENAME COLUMN`) is emitted instead of a destructive DROP + ADD pair.

```javascript
import { toDiff } from './dist/quick-sql.js';

const v1 = `employees
  name vc100 /nn
  email vc200`;

const v2 = `employees
  name vc100 /nn
  email vc200 /nn
  phone vc50

departments
  dept_name vc100 /nn`;

const result = toDiff(v1, v2);
console.log(result.sql);
// → runnable Oracle migration script

for (const w of result.warnings)
    console.warn(`[${w.level}] ${w.table}: ${w.message}`);

const s = result.summary;
console.log(`+${s.tablesAdded} tables, ~${s.tablesModified} modified, ${s.statementsTotal} statements`);
```

The `options` parameter follows the same convention as `toDDL` — pass either a JSON string or embed `# settings = {…}` inside the QSQL strings.

### fromJSON

```javascript
fromJSON(json: string | object): string
```

Converts a JSON document (as a string or parsed object) to a Quick SQL shorthand string. The generated QSQL approximates the structure of the JSON document and can be further refined by the user.

### qsql_version

```javascript
qsql_version(): string
```

Returns the library version string, e.g. `"2.0.0"`.

### registerGenerator / BaseGenerator

```javascript
registerGenerator(name: string, GeneratorClass: typeof BaseGenerator): void
```

Extension point for adding custom SQL dialect generators. `BaseGenerator` is the abstract base class that dialect-specific generators must extend. Refer to `doc/development/` for the generator API contract.

---

## Document

The database defined via QuickSQL is populated with the data generated by
[chancejs](https://github.com/chancejs/chancejs). If QSQL code has been generated
from json document, then the document is kept under the `#document` section, and
is used to populate the database with genuine data.
See the [Car Racing Example](../../test/DV/car_racing/1.qsql).

## Grammar

> **Note:** All setting keys and directive names are case-insensitive. Values are also case-insensitive unless otherwise stated.

```abnf
quicksql::= stmt+

stmt::= tree
      | view
      | '#' individual_setting
      | '#' 'settings' '=' '{' individual_setting ( ',' individual_setting )* '}'
      | '#' 'document' '=' JSON

view::= 'view' view_name table_name+ annotation?
       | view_name '=' table_name+
       | 'dv' view_name table_name+

view_name::= identifier
table_name::= identifier
column_name::= identifier

tree::= node+

node::= tableNode | columnNode

tableNode::= indentation relationship? tableName tableDirective* annotation?
columnNode::= indentation columnName columnDirective* datatype* annotation?

indentation::= INDENT | DEDENT | SAMELEVEL

relationship::= '>' | '<'

tableDirective::= '/'
       ('api'
      |'audit'|'auditcols'|'audit cols'|'audit columns'
      |'auditlog' identifier?
      |'colprefix'
      |'compress'|'compressed'
      |'flashback'|'fda'
      |'history'
      |'immutable'
      |'insert' integer
      |'notenantid'
      |'rest'
      |'rowversion'
      |'soda'
      |'unique'|'uk'
      |'pk'
      |'check'
      |'cascade'
      )

columnDirective::= '/'
      ('idx'|'index'|'indexed'
      |'unique'|'uk'
      |'check'
      |'constant'
      |'default'
      |'values'
      |'upper'
      |'lower'
      |'nn'|'not null'
      |'between'
      |'references'|'reference'
      |'cascade'|'setnull'
      |'fk'
      |'pk'
      |'domain'
      |'trans'|'translation'|'translations'
      )

annotation::= '{' annotationEntry ( ',' annotationEntry )* '}'

annotationEntry::= identifier ( string_literal | double_quoted_literal )
                  | identifier

datatype::=
       'num'|'number'
       |'num' '(' integer ',' integer ')'
       |'int'|'integer'
       |'d'|'date'
       |'ts'|'timestamp'
       |'tstz'|'tswtz'|'timestamp' 'with' 'local' 'time' 'zone'
       |'bool'|'boolean'
       |'vc'|'varchar'|'varchar2'|'char'|'string'
       |'vc' integer | 'vc' '(' integer ')'
       |'vc' integer 'k'
       |'vc32k'
       |'clob'|'blob'
       |'json'
       |'file'
       |'geometry'|'sdo_geometry'
       |'vect'|'vector'
       |'vect' integer | 'vect' '(' integer ')'

individual_setting::=
      ( 'aienrichment'|'apex'|'api'|'auditcols'
      |'boolean'
      |'compress'|'createdbycol'|'createdcol'
      |'date'|'datalimit'|'db'|'drop'|'dv'
      |'editionable'
      |'inserts'
      |'language'|'longvc'
      |'namelen'
      |'ondelete'|'overridesettings'
      |'pk'|'prefix'|'prefixpkwithtname'
      |'genpk'
      |'resetsettings'|'rowkey'
      |'tenantid'|'rowversion'
      |'schema'|'semantics'
      |'transcontext'
      |'updatedbycol'|'updatedcol'
      |'verbose' ) ':' (string_literal| 'true' | 'false')
```

[Syntax Railroad Diagram (interactive)](./railroad_diagram.xhtml) · [Syntax Railroad Diagram (Markdown)](./railroad_diagram.md)

---

**Related documents**

- [Practical Examples](examples.md) — 15 annotated QSQL scenarios with generated DDL
- [Multi-Tenant Design](multitenant-design.md) — enterprise multi-tenancy: indexes, FK integrity, VPD, application context
- [ERD Guide](quick-erd.md) — diagram rendering, layout, and theming
- [Error Diagnostics](error-diagnostics.md) — `toErrors` deep dive and diagnostic API
