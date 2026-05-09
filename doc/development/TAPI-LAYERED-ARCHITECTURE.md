# EspreSQL — Layered TAPI Architecture Specification

**Status**: Specification  
**Version**: 1.9  
**Author**: Roberto Capancioni — Radicle s.r.l.  
**Date**: 2026-05-08  
**Target Platform**: Oracle Database 19c, Oracle APEX 22.1+, ORDS 23+

---

## Quick QSQL Reference

### Tier selection

Add `/api <tier>` on any table. The global `api: layered` setting is still required when
using bare `/api` (no tier argument, defaults to `full+hks`).

```espresql
-- lookup      → generated: tbl_apx
lookup_codes /api lookup
  code vc20 /nn
  label vc100 /nn

-- lookup+hks  → generated: tbl_hks, tbl_apx
categories /api lookup+hks
  code vc20 /nn
  label vc100 /nn

-- service     → generated: tbl_svc, tbl_apx  (_svc absorbs private DML)
orders /api service
  customer_id num /nn
  total num(12,2)

-- service+hks → generated: tbl_hks, tbl_svc, tbl_apx
invoices /api service+hks
  order_id num /nn
  amount num(12,2)

-- full        → generated: tbl_dal, tbl_svc, tbl_apx  (no hook stubs)
products /api full
  name vc100 /nn
  price num(12,2)

-- full+hks    → generated: tbl_dal, tbl_hks, tbl_svc, tbl_apx  (default)
employees /api full+hks
  name vc100 /nn
  email vc200 /nn /unique
  row_version num /nn
```

Numeric aliases: `1`=`lookup`, `1h`=`lookup+hks`, `2`=`service`, `2h`=`service+hks`,
`3`=`full`, `3h`=`full+hks`.

### Audit log

```espresql
app_audit_log /api full+hks
  entity vc128 /nn
  entity_id num /nn
  operation vc6 /nn
  old_values clob
  new_values clob

employees /api full+hks /auditlog app_audit_log
  name vc100 /nn
  row_version num /nn
```

Generated extra package: `employees_aud` (autonomous-transaction CDC writer).

### REST interface (`ifc` setting)

| `ifc` value | Interface package | Use case |
| --- | --- | --- |
| `apex` (default) | `_apx` | Oracle APEX |
| `rest` | `_rst` | ORDS REST endpoints |
| `both` | `_apx` + `_rst` | Dual access |

```espresql
# settings = { ifc: rest }

employees /api full+hks
  name vc100 /nn
```

### User-facing documentation

- **All tiers with examples**: [doc/user/examples.md §14](../user/examples.md#14-table-api-tapi--simple-and-layered-tiers)
- **Audit log chain**: [doc/user/examples.md §15](../user/examples.md#15-audit-log-chain-auditlog)
- **Per-table tier selection**: [doc/user/examples.md §19](../user/examples.md#19-layered-tapi--per-table-tier-selection)
- **Degradation rule**: [doc/user/examples.md §20](../user/examples.md#20-layered-tapi--degradation-absorbed-layers)
- **REST interface**: [doc/user/examples.md §21](../user/examples.md#21-layered-tapi--rest-interface-ifc-rest)
- **Grammar reference**: [doc/user/espresql-grammar.md §api](../user/espresql-grammar.md#api)

---

## 1. Critical Analysis of the Current Generated TAPI

The TAPI produced by EspreSQL (`/api` directive) is a functional scaffold, not a production-ready API. Before defining the target architecture, the defects must be understood explicitly.

### 1.1 Structural Defects

**`get_row` — scalar OUT parameters**

```sql
procedure get_row (
    p_id        in  integer,
    p_name      out varchar2,
    p_specialty out varchar2,
    p_email     out varchar2
);
```

Every new column added to the table requires a signature change that breaks all callers immediately. A `%ROWTYPE`-based return is the correct pattern.

Silently swallowing `NO_DATA_FOUND` makes the "not found" case indistinguishable from a row where all OUT params are NULL. The caller has no reliable way to detect absence.

**`update_row` — PK in the SET clause**

```sql
update doctors set
    id = p_id,   -- ← attempts to update the primary key
    ...
where id = p_id;
```

This is a no-op but semantically wrong and hazardous to maintain. The PK must never appear in the SET clause.

**`update_row` — no optimistic locking**

The table carries `row_version INTEGER NOT NULL`. The update ignores it entirely. A concurrent session can silently overwrite changes — the classic lost-update problem.

**`insert_row` — no return of the generated identity**

The PK is `default on null to_number(sys_guid(), ...)`. After insert the caller cannot retrieve the generated `id` without a second SELECT. A `RETURNING` clause is required.

**`insert_row` — accepts `p_id IN integer`**

Passing an externally provided numeric ID defeats the server-side generation intent.

### 1.2 Missing Concerns

| Concern | Status |
|---|---|
| Optimistic locking | Absent |
| Input validation (field-level) | Absent |
| Business rule enforcement | Absent |
| Observable errors with preserved call stack | Absent |
| Observability / audit hook | Absent |
| Unique-constraint violation mapping | Absent |
| Technology-specific interface (APEX, ORDS) | Absent |
| Transactional atomicity between DML and side effects | Absent |

### 1.3 Verdict

Adequate for APEX rapid prototyping. Not suitable as a contract-stable enterprise API. The three blockers for production use are: optimistic locking, observable errors, and a stable calling signature.

---

## 2. EspreSQL Default vs. Layered TAPI — At a Glance

| Capability | EspreSQL Default (`/api`) | Layered TAPI (this spec) |
|---|---|---|
| Signature stability | Low — scalar params break on new columns | High — DAL uses `%ROWTYPE`; SVC uses `t_rec` |
| Concurrent write safety | None — lost updates possible | Native optimistic locking via `row_version` |
| Extensibility | Requires forking the generated package | Hook layer: `validate / before / after` |
| Error visibility | Low — exceptions swallowed or raw | Full call stack via `DBMS_UTILITY.FORMAT_ERROR_BACKTRACE` |
| Consumer coverage | APEX only | APEX, ORDS, batch — same service layer |
| Technology-specific interface | None | IFC layer: `_apx` for APEX, `_rst` for ORDS |
| DML + side-effect atomicity | Undefined | Explicit policy per consumer |
| Migration path | N/A | Incremental, coexists with old package |

---

## 3. Target Architecture — Layered TAPI

### 3.1 Rationale

The full layered stack is justified when:
- Multiple consumers exist (APEX, ORDS, batch jobs) with different parameter conventions
- Business rules must fire regardless of entry point
- Validation and observability must be injectable without forking core code
- The data model evolves independently from the API contract
- APEX page items and REST JSON must be mapped at the boundary, not in business logic

### 3.2 Layer Map

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERFACE LAYER                                                │
│  {entity}_apx                   {entity}_rst                   │
│  APEX Invoke API                REST/ORDS handler              │
│  p_-prefixed params             JSON body in / JSON out        │
│  get / ins / upd / del          get / ins / upd / del          │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ calls                    │ calls
               ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE LAYER  —  {entity}_svc                                 │
│  t_rec record API (business columns only)                       │
│  Sequences DML + hook calls; maps constraint violations         │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ calls                        │ calls
               ▼                              ▼
┌─────────────────────────┐    ┌──────────────────────────────────┐
│  DATA ACCESS LAYER      │    │  HOOK LAYER                      │
│  {entity}_dal           │    │  {entity}_hks                    │
│  Pure DML, %ROWTYPE     │    │  Fixed spec / replaceable body   │
│  No business logic      │    │  validate / before / after       │
└─────────────────────────┘    └──────────────────────────────────┘

             ┌────────────────────────────┐
             │  SVC calls (when /auditlog)│
             ▼                            │
┌──────────────────────────────────┐      │
│  AUDIT PACKAGE (optional)        │      │
│  {entity}_audit                  │      │
│  f_to_json, PRAGMA AUTONOMOUS_   │      │
│  TRANSACTION, Level 2 CDC        │      │
│  old_values + new_values JSON    │      │
└──────────────────────────────────┘      │
             └────────────────────────────┘

  Exceptions propagate upward through all layers uncaught
  until the consumer boundary (IFC package or batch caller).
  The audit package is isolated via AUTONOMOUS_TRANSACTION —
  its COMMIT does not affect the calling transaction.
  Audit columns and row_version are always trigger-managed
  and are excluded from all SVC and IFC parameter lists.
```

### 3.3 Layer Summary

| Layer | Package suffix | Parameters | Responsibilities |
|---|---|---|---|
| IFC — APEX | `_apx` | `p_`-prefixed scalars | Maps APEX page items ↔ SVC `t_rec` |
| IFC — REST | `_rst` | JSON body / JSON response | Maps REST payload ↔ SVC `t_rec` |
| Service | `_svc` | `t_rec` record | Business logic, hook sequencing, constraint mapping |
| Hook | `_hks` | `%ROWTYPE` | Validate / before / after (replaceable body) |
| Data Access | `_dal` | `%ROWTYPE` | Pure DML, no business logic |

### 3.4 Tier Model — Selecting the Right Stack

Not every table justifies four separate packages. The tier is specified directly on the `/api` directive and selects the minimum package set for that table. The `_audit` package is orthogonal — it is added independently via `/auditlog` regardless of tier.

#### Tier definitions

| Tier | Packages generated | pkg# |
|------|--------------------|------|
| `lookup` | `_apx` | 1 |
| `lookup+hks` | `_apx` `_hks` | 2 |
| `service` | `_svc` `_apx` | 2 |
| `service+hks` | `_svc` `_hks` `_apx` | 3 |
| `full` | `_dal` `_svc` `_apx` | 3 |
| `full+hks` | `_dal` `_hks` `_svc` `_apx` | 4 |

`_rst` is orthogonal to the tier — it is added when `ifc: "rest"` or `ifc: "both"` is set, regardless of tier. `_audit` is added when `/auditlog` is active on the table, regardless of tier.

#### The `+hks` suffix — ownership boundary

`+hks` generates a separate `_hks` package with a **developer-owned body**. The generator writes the spec once and never overwrites the body again. Without `+hks`, hook stubs are private procedures inside the owning package body — generator-owned and overwritten on every regeneration. Use `+hks` when the hooks body contains production logic that must survive regeneration; omit it when there is no custom logic yet and a manual merge on regeneration is acceptable.

#### Cross-entity coupling constraint

| Scenario | Minimum tier |
|----------|-------------|
| No external callers | `lookup` or `lookup+hks` |
| Another `_svc` calls this entity's SVC procedures | `service` or `service+hks` |
| Another package calls this entity's `_dal` directly | `full` or `full+hks` |

#### Grant model

Only `_apx` (and `_rst` when generated) is granted to external consumers. `_dal`, `_svc`, and `_hks` are schema-internal regardless of tier.

#### EspreSQL syntax

The tier is the argument to `/api`. When omitted, the default is `full+hks` (backward-compatible with the old `layered` value). The `api` key is not needed in the settings block.

```sql
doctors       /api full+hks    -- dal + hks + svc + apx
lookup_types  /api lookup      -- apx only
order_lines   /api service+hks -- svc + hks + apx

# settings = { ifc: "apex", auditcols: yes, rowversion: yes }
```

#### Tier selection guide

```
Does another package call this entity's _dal directly?
  Yes → full  or  full+hks

Does another _svc call this entity's service procedures?
  Yes → service  or  service+hks

Otherwise → lookup  or  lookup+hks

Add +hks if: the hooks body contains logic that must survive regeneration.
```

#### Degradation rule

Each layer calls the layer immediately below it when that layer exists; when absent, it absorbs the missing layer's responsibilities as **private procedures** in its own body. The rule cascades uniformly through all boundaries:

| Caller | Dependency | Layer present | Layer absent |
|---|---|---|---|
| `_hks` spec | `_dal` | `{entity}_dal.t_id` for `before/after_delete` | `{entity}.id%TYPE` |
| `_svc` body | `_dal` | calls `{entity}_dal.get_by_id`, `insert_row`, … | private procedures `p_get_by_id`, `p_insert_row`, … in `_svc` body |
| `_svc` body | `_hks` | calls `{entity}_hks.validate`, `before_insert`, … | private no-op stubs in `_svc` body |
| `_apx` body | `_svc` | calls `{entity}_svc.create_rec`, `update_rec`, … | private procedures absorbing SVC logic in `_apx` body |

Consequences by tier:

- **`full` / `full+hks`**: all layers independent; each calls the one below.
- **`service` / `service+hks`**: no `_dal`; `_svc` body contains private DML procedures. `_svc` calls `_hks` when `+hks`.
- **`lookup` / `lookup+hks`**: no `_dal`, no `_svc`; `_apx` body contains both private DML and business logic. `_apx` calls `_hks` when `+hks`.

#### Body pattern — `service+hks` (SVC absorbs DAL)

When `_dal` is absent the `_svc` body opens with a private DML section that mirrors the DAL contract. The public procedures are identical in signature to the `full` tier; only the internal calls change.

```sql
CREATE OR REPLACE PACKAGE BODY doctors_svc AS

    -- ── Private DML (absorbed from the absent _dal) ──────────────────────────

    resource_busy EXCEPTION;
    PRAGMA EXCEPTION_INIT(resource_busy, -54);

    FUNCTION p_get_by_id (p_id IN doctors.id%TYPE) RETURN doctors%ROWTYPE IS
        l_row doctors%ROWTYPE;
    BEGIN
        SELECT * INTO l_row FROM doctors WHERE id = p_id;
        RETURN l_row;
    EXCEPTION
        WHEN no_data_found THEN
            raise_application_error(-20002,
                'doctors: record not found (id=' || p_id || ')');
    END p_get_by_id;

    PROCEDURE p_insert_row (p_row IN OUT NOCOPY doctors%ROWTYPE) IS
    BEGIN
        INSERT INTO doctors (name, specialty, email)
        VALUES (p_row.name, p_row.specialty, p_row.email)
        RETURNING id, row_version, created, created_by
             INTO p_row.id, p_row.row_version, p_row.created, p_row.created_by;
    END p_insert_row;

    PROCEDURE p_update_row (p_row IN OUT NOCOPY doctors%ROWTYPE) IS
    BEGIN
        UPDATE doctors
           SET name      = p_row.name,
               specialty = p_row.specialty,
               email     = p_row.email
         WHERE id          = p_row.id
           AND row_version = p_row.row_version;
        IF SQL%ROWCOUNT = 0 THEN
            DECLARE l_dummy PLS_INTEGER; BEGIN
                SELECT 1 INTO l_dummy FROM doctors WHERE id = p_row.id;
                raise_application_error(-20001,
                    'Row modified by another session. Reload and retry.');
            EXCEPTION
                WHEN no_data_found THEN
                    raise_application_error(-20002,
                        'Record ' || p_row.id || ' does not exist.');
            END;
        END IF;
    END p_update_row;

    PROCEDURE p_delete_row (p_id IN doctors.id%TYPE) IS
    BEGIN
        DELETE FROM doctors WHERE id = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            raise_application_error(-20002,
                'Record ' || p_id || ' does not exist.');
        END IF;
    END p_delete_row;

    -- ── Public interface (identical spec to full tier) ────────────────────────

    FUNCTION get (p_id IN doctors.id%TYPE) RETURN doctors%ROWTYPE IS
    BEGIN
        RETURN p_get_by_id(p_id => p_id);
    END get;

    PROCEDURE create_rec (
        p_rec IN  t_rec,
        x_id  OUT doctors.id%TYPE
    ) IS
        l_row doctors%ROWTYPE;
    BEGIN
        l_row.name      := p_rec.name;
        l_row.specialty := p_rec.specialty;
        l_row.email     := p_rec.email;
        doctors_hks.validate(p_operation => 'INSERT', p_row => l_row);
        doctors_hks.before_insert(p_row => l_row);
        p_insert_row(p_row => l_row);       -- private, replaces doctors_dal.insert_row
        doctors_hks.after_insert(p_row => l_row);
        x_id := l_row.id;
    EXCEPTION
        WHEN dup_val_on_index THEN
            raise_application_error(-20015,
                'Email address ' || p_rec.email || ' is already registered.');
    END create_rec;

    PROCEDURE update_rec (
        p_id          IN doctors.id%TYPE,
        p_rec         IN t_rec,
        p_row_version IN doctors.row_version%TYPE
    ) IS
        l_row     doctors%ROWTYPE;
        l_old_row doctors%ROWTYPE;
    BEGIN
        l_row             := p_get_by_id(p_id => p_id);
        l_old_row         := l_row;
        l_row.name        := p_rec.name;
        l_row.specialty   := p_rec.specialty;
        l_row.email       := p_rec.email;
        l_row.row_version := p_row_version;
        doctors_hks.validate(p_operation => 'UPDATE', p_row => l_row);
        doctors_hks.before_update(p_row => l_row);
        p_update_row(p_row => l_row);       -- private, replaces doctors_dal.update_row
        doctors_hks.after_update(p_row => l_row);
    EXCEPTION
        WHEN dup_val_on_index THEN
            raise_application_error(-20015,
                'Email address ' || p_rec.email || ' is already registered.');
    END update_rec;

    PROCEDURE delete_rec (p_id IN doctors.id%TYPE) IS
    BEGIN
        doctors_hks.before_delete(p_id => p_id);
        p_delete_row(p_id => p_id);         -- private, replaces doctors_dal.delete_row
        doctors_hks.after_delete(p_id => p_id);
    END delete_rec;

END doctors_svc;
/
```

For the `lookup+hks` tier the same principle applies one level further: `_apx` body opens with private DML procedures (absorbed from the absent `_dal`) and private business logic procedures (absorbed from the absent `_svc`), then calls `_hks` for hooks. The public `ins`, `upd`, `del` procedures map scalar page-item parameters to `%ROWTYPE` internally.

### 3.5 Design Decisions

**Error handling by exception, not by result record**

The service layer raises PL/SQL exceptions on every error. It does not return a `success/error_msg` result record. Reasons:

- In PL/SQL, exceptions are the native, zero-overhead error-propagation mechanism. A result record requires the caller to explicitly check `success` — forgetting to check is a silent bug. An uncaught exception is a loud, visible failure.
- `WHEN OTHERS THEN RETURN l_result` destroys the Oracle call stack. `DBMS_UTILITY.FORMAT_ERROR_BACKTRACE` cannot reconstruct it after the fact. This makes production debugging extremely difficult.
- ORDS does not require result objects to produce structured JSON error responses. Each handler catches exceptions locally and sets `:status`. One `WHEN OTHERS` block per handler is sufficient.
- APEX's `apex_error` framework is designed to consume PL/SQL exceptions — including mapping specific `SQLCODE` values to inline error messages.

**`t_rec` record in the SVC layer**

The service layer uses a record type `t_rec` defined in the package spec. It contains exclusively the writable business columns: FK columns, `tenant_id` (if synthetic), and regular business columns. It explicitly excludes:

- The primary key (auto-generated — never a caller input)
- `row_version` (trigger-managed — trigger increments on every UPDATE)
- Audit columns: `created`, `created_by`, `updated`, `updated_by` (trigger-managed)

Since triggers have the final word on these columns, including them in `t_rec` would be misleading. Callers who pass values for trigger-managed columns would be silently ignored.

Adding a new business column requires updating `t_rec` and recompiling dependents. This is accepted because a new column always requires a corresponding form change — the two are coupled by definition.

**No `x_version OUT` from SVC procedures**

`row_version` is incremented by the UPDATE trigger. After `update_rec` returns, the new version is in the database. If the caller needs the updated version (e.g., to write it back to an APEX page item for subsequent OCC), they re-read it from the `x_id`-identified row or the IFC layer handles it. Returning it as `OUT` would require an extra SELECT inside the SVC body and couples the SVC to trigger implementation details.

**`p_row_version IN` stays in `update_rec`**

Even though row_version is trigger-managed in writing, optimistic concurrency control requires the caller to provide the version they read at fetch time. The DAL's `update_row` checks this value in the `WHERE` clause before executing the UPDATE. If the check fails (another session modified the row), the DAL raises the stale-data error. The OCC guard parameter is omitted when `/rowversion` is not active on the table.

**IFC layer — one package per technology**

The interface layer does not attempt to be generic. Each technology (APEX, ORDS) has its own package with conventions native to that technology:
- `_apx`: parameters follow the `p_` naming convention; APEX Invoke API auto-maps them to page items of the same root name.
- `_rst`: procedures parse JSON input and emit JSON output using Oracle SQL/JSON functions.

Which IFC package is generated is controlled by the global setting `ifc` (default: `apex`). Multiple IFC packages can coexist for the same entity.

---

## 4. Layer 1 — Data Access Layer (`{entity}_dal`)

### 4.1 Responsibilities

- Execute DML and queries against exactly one table or view.
- Operate on `%ROWTYPE` — never scalar parameter lists.
- No validation, no business logic, no hook calls.
- Autonomous transactions only where explicitly documented.

### 4.2 Package Specification

```sql
CREATE OR REPLACE PACKAGE doctors_dal AS

    SUBTYPE t_id IS doctors.id%TYPE;

    -- ── Read ───────────────────────────────────────────────────────────────

    -- Raises NO_DATA_FOUND if id does not exist.
    -- This is the only plain read function. Callers handle absence with WHEN no_data_found.
    FUNCTION get_by_id  (p_id IN t_id) RETURN doctors%ROWTYPE;

    -- Acquires a row-level lock (SELECT FOR UPDATE NOWAIT) and returns the row.
    -- Use in SVC procedures that must perform a check-then-act sequence within
    -- a single transaction (e.g. deduct balance only if sufficient funds).
    -- Raises c_err_not_found if the row does not exist.
    -- Raises c_err_locked   if another session holds the lock (ORA-00054).
    -- The lock is released automatically when the calling transaction commits or rolls back.
    -- Do NOT use for cross-request locking (web forms) — the lock is transaction-scoped,
    -- not session-scoped, and will be released before the HTTP response is sent.
    FUNCTION lock_by_id (p_id IN t_id) RETURN doctors%ROWTYPE;

    FUNCTION get_by_email (p_email IN doctors.email%TYPE) RETURN doctors%ROWTYPE;

    -- Strong-typed ref cursor — for PL/SQL batch processing only.
    -- APEX Interactive/Classic Reports use direct SQL, not this function.
    TYPE t_cursor IS REF CURSOR RETURN doctors%ROWTYPE;
    FUNCTION get_all RETURN t_cursor;

    -- ── Write ──────────────────────────────────────────────────────────────

    -- p_row is IN OUT NOCOPY: caller receives back the full committed record
    -- (trigger-populated columns: id, row_version, created, created_by).
    --
    -- NOCOPY warning: the parameter is passed by reference. If insert_row raises
    -- after partially modifying p_row (e.g., the RETURNING clause wrote id but
    -- a subsequent constraint failed), p_row fields in the caller may be in an
    -- inconsistent state. After any exception, do not reuse the record without
    -- fully reinitialising it.
    PROCEDURE insert_row (p_row IN OUT NOCOPY doctors%ROWTYPE);

    -- Optimistic locking: raises c_err_stale_data if row_version does not match.
    -- Raises c_err_not_found if id does not exist.
    -- Same NOCOPY warning applies.
    PROCEDURE update_row (p_row IN OUT NOCOPY doctors%ROWTYPE);

    -- Raises c_err_not_found if id does not exist.
    PROCEDURE delete_row (p_id IN t_id);

    -- ── Error codes ────────────────────────────────────────────────────────

    c_err_stale_data CONSTANT PLS_INTEGER := -20001;   -- OCC version mismatch
    c_err_not_found  CONSTANT PLS_INTEGER := -20002;   -- row absent
    c_err_locked     CONSTANT PLS_INTEGER := -20003;   -- ORA-00054 (FOR UPDATE NOWAIT)

END doctors_dal;
/
```

### 4.3 Key Implementation Notes

**Single read function — no `find_by_id` variant**

A two-function pattern (`get_by_id` raises / `find_by_id` returns null-record) is dangerous in PL/SQL: a null-initialized `%ROWTYPE` record is indistinguishable from a record whose columns are genuinely NULL. There is no `Optional<T>`. Callers would rely on `l_row.id IS NOT NULL` as an implicit convention that is not enforced. The single function that raises `NO_DATA_FOUND` is simpler, universally understood, and safer — callers that need "absent is ok" write `WHEN no_data_found` explicitly.

**`get_all` is for PL/SQL batch — not for APEX reports**

APEX Interactive Reports and Classic Reports are driven by SQL queries defined in the region source, not by PL/SQL ref cursors. Do not route APEX reports through this function. APEX reports use `SELECT * FROM doctors` (or a view) directly.

**Optimistic locking in `update_row`:**

```sql
UPDATE doctors
   SET name        = p_row.name,
       specialty   = p_row.specialty,
       email       = p_row.email
 WHERE id          = p_row.id
   AND row_version = p_row.row_version;

IF SQL%ROWCOUNT = 0 THEN
    DECLARE l_dummy PLS_INTEGER;
    BEGIN
        SELECT 1 INTO l_dummy FROM doctors WHERE id = p_row.id;
        raise_application_error(c_err_stale_data,
            'Row modified by another session. Reload and retry.');
    EXCEPTION
        WHEN no_data_found THEN
            raise_application_error(c_err_not_found,
                'Record ' || p_row.id || ' does not exist.');
    END;
END IF;
```

**`lock_by_id` — pessimistic locking for check-then-act SVC procedures:**

```sql
-- package body: private exception declaration
resource_busy EXCEPTION;
PRAGMA EXCEPTION_INIT(resource_busy, -54);   -- ORA-00054

FUNCTION lock_by_id (p_id IN t_id) RETURN doctors%ROWTYPE IS
    l_row doctors%ROWTYPE;
BEGIN
    SELECT * INTO l_row
    FROM   doctors
    WHERE  id = p_id
    FOR UPDATE NOWAIT;
    RETURN l_row;
EXCEPTION
    WHEN no_data_found THEN
        raise_application_error(c_err_not_found,
            'doctors: record not found (id=' || p_id || ')');
    WHEN resource_busy THEN
        raise_application_error(c_err_locked,
            'doctors: record locked by another session');
END lock_by_id;
```

The `resource_busy` exception and its `PRAGMA EXCEPTION_INIT` are declared at the package body level (not inside the function), so they are shared by all body subprograms that might need them. The DAL translates ORA-00054 into the uniform `-20003` error code; callers never need to know the Oracle error number.

**When to use `lock_by_id` vs `get_by_id`:**

Use `lock_by_id` only in SVC procedures that implement a **check-then-act** pattern: a business rule is evaluated against a value read from the database, and a decision is made based on that value within the same transaction.

```sql
-- SVC example: deduct from account only if balance is sufficient
PROCEDURE deduct (
    p_id     IN accounts.id%TYPE,
    p_amount IN NUMBER
) IS
    l_row accounts%ROWTYPE;
BEGIN
    l_row := accounts_dal.lock_by_id(p_id => p_id);  -- read AND lock

    IF l_row.balance < p_amount THEN
        raise_application_error(-20020, 'Insufficient balance.');
    END IF;

    l_row.balance := l_row.balance - p_amount;
    accounts_dal.update_row(p_row => l_row);  -- row_version check still applies

END deduct;
```

Without the lock, two concurrent calls could both read `balance = 100`, both pass the `>= 80` check, both deduct, resulting in a negative balance. The `FOR UPDATE NOWAIT` guarantees the second caller waits (or gets `c_err_locked`) until the first transaction commits.

For standard CRUD operations — where OCC via `row_version` is sufficient — always use `get_by_id`. `lock_by_id` adds latency (it escalates to row lock immediately) and reduces concurrency; it should appear only where the read-modify-write sequence is logically indivisible.

**`lock_by_id` and `update_row` — row_version interaction:**

After `lock_by_id` you hold a lock and have the current `row_version`. No other session can modify the row, so the `update_row` OCC check (`WHERE row_version = p_row.row_version`) will always match. The check remains as defence in depth but will not fire under normal conditions.

**RETURNING clause in `insert_row`:**

```sql
INSERT INTO doctors (name, specialty, email)
VALUES (p_row.name, p_row.specialty, p_row.email)
RETURNING id, row_version, created, created_by
     INTO p_row.id, p_row.row_version, p_row.created, p_row.created_by;
```

After the call, `p_row` holds the complete persisted state without a second SELECT.

---

## 5. Layer 2 — Service / Business Logic Layer (`{entity}_svc`)

### 5.1 Responsibilities

- Accept a `t_rec` record of writable business columns.
- Map the record to a `%ROWTYPE` working record for DAL calls.
- Sequence hook calls around DAL calls within a single transaction.
- Map known constraint violations to semantic application errors.
- Raise exceptions on all error paths — never swallow.
- Expose the canonical API for all IFC packages and batch callers.

### 5.2 Package Specification

```sql
CREATE OR REPLACE PACKAGE doctors_svc AS

    -- Writable business columns only.
    -- Excludes: id (auto-generated), row_version (trigger), audit columns (trigger).
    TYPE t_rec IS RECORD (
        name        doctors.name%TYPE,
        specialty   doctors.specialty%TYPE,
        email       doctors.email%TYPE
    );

    -- ── Read ───────────────────────────────────────────────────────────────

    -- Returns the full %ROWTYPE including PK, row_version, and audit columns.
    -- Raises NO_DATA_FOUND if not found.
    FUNCTION get (p_id IN doctors.id%TYPE) RETURN doctors%ROWTYPE;

    -- ── Write ──────────────────────────────────────────────────────────────

    -- x_id receives the generated primary key after insert.
    -- row_version is trigger-managed — not returned.
    PROCEDURE create_rec (
        p_rec IN  t_rec,
        x_id  OUT doctors.id%TYPE
    );

    -- p_row_version enforces optimistic locking (present only when /rowversion is active).
    -- row_version after update is trigger-managed — not returned.
    PROCEDURE update_rec (
        p_id          IN doctors.id%TYPE,
        p_rec         IN t_rec,
        p_row_version IN doctors.row_version%TYPE
    );

    PROCEDURE delete_rec (p_id IN doctors.id%TYPE);

END doctors_svc;
/
```

### 5.3 Implementation Pattern — `create_rec`

```sql
PROCEDURE create_rec (
    p_rec IN  t_rec,
    x_id  OUT doctors.id%TYPE
) IS
    l_row doctors%ROWTYPE;
BEGIN
    -- Map t_rec fields to the working %ROWTYPE record.
    l_row.name      := p_rec.name;
    l_row.specialty := p_rec.specialty;
    l_row.email     := p_rec.email;

    -- validate, before_insert, insert_row, after_insert all execute in the
    -- same open transaction. If any step raises, the exception propagates to
    -- the IFC boundary (APX or RST package), which is responsible for rollback
    -- policy. Neither the INSERT nor the audit record is committed.
    doctors_hks.validate(p_operation => 'INSERT', p_row => l_row);
    doctors_hks.before_insert(p_row => l_row);
    doctors_dal.insert_row(p_row => l_row);
    doctors_hks.after_insert(p_row => l_row);

    x_id := l_row.id;

EXCEPTION
    WHEN dup_val_on_index THEN
        -- Map the UNIQUE constraint on email to a semantic error.
        raise_application_error(-20015,
            'Email address ' || p_rec.email || ' is already registered.');
END create_rec;
```

### 5.4 Implementation Pattern — `update_rec`

```sql
PROCEDURE update_rec (
    p_id          IN doctors.id%TYPE,
    p_rec         IN t_rec,
    p_row_version IN doctors.row_version%TYPE
) IS
    l_row     doctors%ROWTYPE;
    l_old_row doctors%ROWTYPE;
BEGIN
    l_row           := doctors_dal.get_by_id(p_id => p_id);
    l_old_row       := l_row;          -- snapshot for audit (when /auditlog)

    -- Overwrite writable fields; trigger-managed fields remain untouched.
    l_row.name      := p_rec.name;
    l_row.specialty := p_rec.specialty;
    l_row.email     := p_rec.email;
    l_row.row_version := p_row_version; -- carry OCC guard into the %ROWTYPE

    doctors_hks.validate(p_operation => 'UPDATE', p_row => l_row);
    doctors_hks.before_update(p_row => l_row);
    doctors_dal.update_row(p_row => l_row);   -- DAL raises stale_data if version mismatch
    doctors_hks.after_update(p_row => l_row);

EXCEPTION
    WHEN dup_val_on_index THEN
        raise_application_error(-20015,
            'Email address ' || p_rec.email || ' is already registered.');
END update_rec;
```

### 5.5 Transactional Atomicity — DML and After-Hooks

All hook calls and the DAL call execute within the same open database transaction. There is no implicit commit between them. The consequences:

- If `after_insert` raises (e.g., the audit table's tablespace is full), the exception propagates upward uncaught through `create_rec` to the IFC layer.
- **APX (APEX)**: the APEX framework automatically rolls back the open transaction when an error is raised in a page process. Both the INSERT and the failed audit INSERT are rolled back. Atomicity is preserved by default.
- **RST (ORDS)**: the ORDS handler catches the exception in its `WHEN OTHERS` block. Before responding to the client, it **must** issue an explicit `ROLLBACK` (see Section 7.2).

---

## 6. Layer 3 — Hook Layer (`{entity}_hks`)

### 6.1 Design Philosophy

The hook layer is a **PL/SQL package with a fixed specification and a replaceable body**. The default body is a no-op. Teams replace the body with custom logic without modifying the specification or the service layer.

This is preferred over a dynamic hook-table approach (`EXECUTE IMMEDIATE`) because:
- No dynamic SQL, no runtime registry overhead, no SQL-injection risk from procedure-name data.
- Compile-time dependency tracking via `ALL_DEPENDENCIES`.
- Only one implementation active at a time. Composing multiple extensions requires explicit sequencing in the body — the developer who installs the custom body owns the composition.

**ORA-04068 — package body replacement in production**

Replacing a package body with `CREATE OR REPLACE PACKAGE BODY` invalidates the package state for all sessions that have already loaded it. Sessions receive `ORA-04068: existing state of packages has been discarded` on their next call and must re-execute. Since the hooks packages are stateless (no package-level variables with state), the error is transient — the session retries and succeeds. However on a busy system with an APEX or ORDS connection pool, this produces a burst of visible errors during the deployment window.

Mitigation: deploy hooks body changes during a maintenance window or low-traffic period. Document this explicitly in the deployment runbook.

**`PRAGMA SERIALLY_REUSABLE` does not mitigate ORA-04068.** The two problems are unrelated: `PRAGMA SERIALLY_REUSABLE` prevents accumulation of package-level global state in the UGA between calls within the same session — it is irrelevant when a package has no global variables, which is the case for all hooks packages in this architecture. ORA-04068 is triggered by the DDL replacement of the package body itself, and fires regardless of whether the package is stateless or serially reusable. Applying the pragma would add re-initialisation overhead on every call without any benefit. Do not use it here.

### 6.2 Deployment Convention — Single Script Output

EspreSQL generates a **single SQL block** containing all packages in compilation order. It does not manage individual files. The hooks body is included in this output as a no-op stub.

The responsibility for protecting custom hooks code from accidental overwrite belongs entirely to the developer's deployment workflow, not to the generator.

**Recommended workflow:**

```
First generation:
  1. Run EspreSQL → copy the full output into your SQL client
  2. Execute the full script — installs dal, hks spec, hks body (no-op), svc, apx
  3. Save the hks body block into a separate developer-owned file
     (e.g. doctors_hks_impl.sql) in version control
  4. Replace the no-op stubs with custom logic in that file

Subsequent regenerations (e.g. new column added):
  1. Run EspreSQL → new output contains updated spec + refreshed no-op body
  2. Execute ONLY the packages you want to refresh:
       dal spec + body     ← always safe to re-run
       hks spec            ← safe to re-run (spec is generated, fixed interface)
       svc spec + body     ← always safe to re-run
       apx spec + body     ← always safe to re-run
  3. Do NOT re-execute the hks body block from EspreSQL output
  4. If the hks spec changed (new hook added), update doctors_hks_impl.sql manually
     to add the new stub, then re-execute your custom body
```

**Which packages are safe to re-run after regeneration:**

| Package | Safe to re-run | Owner |
|---|---|---|
| `{entity}_dal` (spec + body) | Yes | Generator |
| `{entity}_hks` spec | Yes | Generator |
| `{entity}_hks` body | **No** — contains custom logic | Developer |
| `{entity}_svc` (spec + body) | Yes | Generator |
| `{entity}_apx` (spec + body) | Yes | Generator |
| `{entity}_audit` (spec + body) | Yes | Generator |
| `app_audit_log` DAL/HKS/SVC | Yes | Generator |

The hks body is the only package where "re-run = data loss." All others are idempotent — re-running regenerated output replaces the package with an equivalent or updated version.

### 6.3 Package Specification

The parameter type for `before_delete` and `after_delete` depends on whether `_dal` is present in the tier. When `_dal` exists, the spec references `{entity}_dal.t_id`, anchoring the type to the DAL's subtype declaration. When `_dal` is absent, it references `{entity}.id%TYPE` directly.

```sql
CREATE OR REPLACE PACKAGE doctors_hks AS

    -- Called before any DML. Raise raise_application_error() to veto.
    -- p_operation: 'INSERT' | 'UPDATE' | 'DELETE'
    -- p_row may be modified (normalisation, computed fields).
    PROCEDURE validate (
        p_operation IN VARCHAR2,
        p_row       IN OUT NOCOPY doctors%ROWTYPE
    );

    -- Called after validation, before DML. May further enrich p_row.
    -- Raising here vetoes the operation — all within the same transaction.
    PROCEDURE before_insert (p_row IN OUT NOCOPY doctors%ROWTYPE);
    PROCEDURE before_update (p_row IN OUT NOCOPY doctors%ROWTYPE);

    -- Type of p_id: doctors_dal.t_id when _dal is present (full / full+hks),
    --               doctors.id%TYPE when _dal is absent (service+hks / lookup+hks).
    PROCEDURE before_delete (p_id  IN doctors_dal.t_id);   -- full / full+hks

    -- Called after successful DML, within the same open transaction.
    -- Raising here causes the IFC layer to roll back both the DML and the hook.
    PROCEDURE after_insert (p_row IN doctors%ROWTYPE);
    PROCEDURE after_update (p_row IN doctors%ROWTYPE);
    PROCEDURE after_delete (p_id  IN doctors_dal.t_id);    -- full / full+hks

END doctors_hks;
/
```

For tiers without `_dal` (`service+hks`, `lookup+hks`) the generator emits `doctors.id%TYPE` instead:

```sql
    PROCEDURE before_delete (p_id  IN doctors.id%TYPE);    -- service+hks / lookup+hks
    PROCEDURE after_delete  (p_id  IN doctors.id%TYPE);    -- service+hks / lookup+hks
```

### 6.4 Default No-Op Body

EspreSQL includes this block in the generated output. Execute it once to install the stub. Save it separately and replace the `NULL` stubs with custom logic — do not re-execute this block from subsequent EspreSQL output.

The type of `p_id` in `before_delete` and `after_delete` matches the spec (see §6.3): `doctors_dal.t_id` when `_dal` is present, `doctors.id%TYPE` otherwise.

```sql
-- WARNING: execute once only. Do not re-run after adding custom logic.
-- Save this block as a developer-owned file (e.g. doctors_hks_impl.sql)
-- and manage it independently from the EspreSQL output.
CREATE OR REPLACE PACKAGE BODY doctors_hks AS

    PROCEDURE validate (
        p_operation IN VARCHAR2,
        p_row       IN OUT NOCOPY doctors%ROWTYPE
    ) IS BEGIN NULL; END validate;

    PROCEDURE before_insert (p_row IN OUT NOCOPY doctors%ROWTYPE) IS BEGIN NULL; END;
    PROCEDURE before_update (p_row IN OUT NOCOPY doctors%ROWTYPE) IS BEGIN NULL; END;
    PROCEDURE before_delete (p_id  IN doctors_dal.t_id)           IS BEGIN NULL; END;  -- or doctors.id%TYPE

    PROCEDURE after_insert  (p_row IN doctors%ROWTYPE)             IS BEGIN NULL; END;
    PROCEDURE after_update  (p_row IN doctors%ROWTYPE)             IS BEGIN NULL; END;
    PROCEDURE after_delete  (p_id  IN doctors_dal.t_id)            IS BEGIN NULL; END;  -- or doctors.id%TYPE

END doctors_hks;
/
```

### 6.5 Custom Body — Validation, Normalisation, Audit

The type of `p_id` in `before_delete` and `after_delete` must match the spec generated for the tier (see §6.3).

```sql
CREATE OR REPLACE PACKAGE BODY doctors_hks AS

    PROCEDURE validate (
        p_operation IN VARCHAR2,
        p_row       IN OUT NOCOPY doctors%ROWTYPE
    ) IS
    BEGIN
        IF p_operation IN ('INSERT', 'UPDATE') THEN
            IF p_row.name IS NULL THEN
                raise_application_error(-20010, 'Doctor name is required.');
            END IF;
            IF p_row.email IS NULL OR p_row.email NOT LIKE '%@%' THEN
                raise_application_error(-20011, 'A valid email address is required.');
            END IF;
            IF p_row.specialty IS NOT NULL THEN
                BEGIN
                    medical_specialties_dal.get_by_id(p_id => p_row.specialty);
                EXCEPTION
                    WHEN no_data_found THEN
                        raise_application_error(-20012,
                            'Specialty "' || p_row.specialty || '" is not recognised.');
                END;
            END IF;
        END IF;
    END validate;

    PROCEDURE before_insert (p_row IN OUT NOCOPY doctors%ROWTYPE) IS
    BEGIN
        p_row.name := INITCAP(TRIM(p_row.name));
    END before_insert;

    PROCEDURE before_update (p_row IN OUT NOCOPY doctors%ROWTYPE) IS
    BEGIN
        p_row.name := INITCAP(TRIM(p_row.name));
    END before_update;

    PROCEDURE before_delete (p_id IN doctors_dal.t_id) IS BEGIN NULL; END;  -- or doctors.id%TYPE

    PROCEDURE after_insert (p_row IN doctors%ROWTYPE) IS
    BEGIN
        INSERT INTO app_audit_log (entity, entity_id, operation, logged_at, logged_by)
        VALUES ('DOCTORS', p_row.id, 'INSERT', SYSTIMESTAMP,
                SYS_CONTEXT('APEX$SESSION','APP_USER'));
    END after_insert;

    PROCEDURE after_update (p_row IN doctors%ROWTYPE) IS
    BEGIN
        INSERT INTO app_audit_log (entity, entity_id, operation, logged_at, logged_by)
        VALUES ('DOCTORS', p_row.id, 'UPDATE', SYSTIMESTAMP,
                SYS_CONTEXT('APEX$SESSION','APP_USER'));
    END after_update;

    PROCEDURE after_delete (p_id IN doctors_dal.t_id) IS  -- or doctors.id%TYPE
    BEGIN
        INSERT INTO app_audit_log (entity, entity_id, operation, logged_at, logged_by)
        VALUES ('DOCTORS', p_id, 'DELETE', SYSTIMESTAMP,
                SYS_CONTEXT('APEX$SESSION','APP_USER'));
    END after_delete;

END doctors_hks;
/
```

---

## 7. Layer 4 — Interface Layer (`{entity}_apx` / `{entity}_rst`)

### 7.1 Purpose

The interface layer is the only layer that knows which technology is consuming the API. It:
- Receives parameters in the form native to the consumer (APEX page items, JSON body).
- Builds a `doctors_svc.t_rec` record and calls the appropriate SVC procedure.
- Returns results in the form expected by the consumer.
- Does not contain business logic. Any validation performed here is structural (e.g., "JSON body is present") — semantic validation belongs in the HKS layer.

Which IFC packages are generated is controlled by the `ifc` setting:

| `ifc` value | Packages generated |
|---|---|
| `"apex"` (default) | `_apx` only |
| `"rest"` | `_rst` only |
| `"both"` | `_apx` + `_rst` |

```
# settings = { ifc: "apex" }    ← generates _apx only (default)
# settings = { ifc: "rest" }    ← generates _rst only
# settings = { ifc: "both" }    ← generates _apx + _rst
```

### 7.2 APEX Interface Package (`{entity}_apx`)

APEX calls `_apx` procedures from page processes using the **Invoke API** process type. APEX automatically maps page items to parameters by name: a parameter `p_name` is sourced from (or written to) a page item whose name ends in `_NAME` after stripping the page prefix (`P<n>_`).

**Procedure naming**: `get`, `ins`, `upd`, `del` — short imperative verbs consistent with the consumer's mental model. `update` and `delete` are SQL reserved words and cannot be used as bare procedure names in Oracle PL/SQL; `upd` and `del` are the standard short forms.

#### 7.2.1 Package Specification

The parameters of `get` are generated conditionally:
- `p_row_version OUT` — only if `/rowversion` is active on the table.
- Audit columns OUT (`p_created`, `p_created_by`, `p_updated`, `p_updated_by`) — only if `auditcols: yes` is active.

```sql
CREATE OR REPLACE PACKAGE doctors_apx AS

    -- Loads a row into OUT parameters, which APEX maps back to page items.
    -- Call from an APEX "Fetch Row" process on page load.
    -- p_row_version is present only when /rowversion is active on the table.
    -- Audit OUT params are present only when auditcols: yes is active.
    PROCEDURE get (
        p_id          IN  doctors.id%TYPE,
        p_name        OUT doctors.name%TYPE,
        p_specialty   OUT doctors.specialty%TYPE,
        p_email       OUT doctors.email%TYPE,
        p_row_version OUT doctors.row_version%TYPE,  -- only if /rowversion
        p_created     OUT doctors.created%TYPE,       -- only if auditcols: yes
        p_created_by  OUT doctors.created_by%TYPE,
        p_updated     OUT doctors.updated%TYPE,
        p_updated_by  OUT doctors.updated_by%TYPE
    );

    -- Creates a record from page item values.
    -- p_id OUT receives the generated PK; APEX maps it to the hidden ID item.
    PROCEDURE ins (
        p_name        IN  doctors.name%TYPE,
        p_specialty   IN  doctors.specialty%TYPE DEFAULT NULL,
        p_email       IN  doctors.email%TYPE,
        p_id          OUT doctors.id%TYPE
    );

    -- Updates a record. p_row_version is read from the hidden page item
    -- populated by the last get call — enforces optimistic concurrency.
    -- p_row_version is present only when /rowversion is active on the table.
    PROCEDURE upd (
        p_id          IN doctors.id%TYPE,
        p_name        IN doctors.name%TYPE,
        p_specialty   IN doctors.specialty%TYPE DEFAULT NULL,
        p_email       IN doctors.email%TYPE,
        p_row_version IN doctors.row_version%TYPE    -- only if /rowversion
    );

    PROCEDURE del (p_id IN doctors.id%TYPE);

END doctors_apx;
/
```

#### 7.2.2 Package Body

```sql
CREATE OR REPLACE PACKAGE BODY doctors_apx AS

    PROCEDURE get (
        p_id          IN  doctors.id%TYPE,
        p_name        OUT doctors.name%TYPE,
        p_specialty   OUT doctors.specialty%TYPE,
        p_email       OUT doctors.email%TYPE,
        p_row_version OUT doctors.row_version%TYPE,  -- only if /rowversion
        p_created     OUT doctors.created%TYPE,       -- only if auditcols: yes
        p_created_by  OUT doctors.created_by%TYPE,
        p_updated     OUT doctors.updated%TYPE,
        p_updated_by  OUT doctors.updated_by%TYPE
    ) IS
        l_row doctors%ROWTYPE;
    BEGIN
        l_row         := doctors_svc.get(p_id => p_id);
        p_name        := l_row.name;
        p_specialty   := l_row.specialty;
        p_email       := l_row.email;
        p_row_version := l_row.row_version;   -- only if /rowversion
        p_created     := l_row.created;        -- only if auditcols: yes
        p_created_by  := l_row.created_by;
        p_updated     := l_row.updated;
        p_updated_by  := l_row.updated_by;
    END get;

    PROCEDURE ins (
        p_name        IN  doctors.name%TYPE,
        p_specialty   IN  doctors.specialty%TYPE DEFAULT NULL,
        p_email       IN  doctors.email%TYPE,
        p_id          OUT doctors.id%TYPE
    ) IS
        l_rec doctors_svc.t_rec;
    BEGIN
        l_rec.name      := p_name;
        l_rec.specialty := p_specialty;
        l_rec.email     := p_email;
        doctors_svc.create_rec(p_rec => l_rec, x_id => p_id);
    END ins;

    PROCEDURE upd (
        p_id          IN doctors.id%TYPE,
        p_name        IN doctors.name%TYPE,
        p_specialty   IN doctors.specialty%TYPE DEFAULT NULL,
        p_email       IN doctors.email%TYPE,
        p_row_version IN doctors.row_version%TYPE
    ) IS
        l_rec doctors_svc.t_rec;
    BEGIN
        l_rec.name      := p_name;
        l_rec.specialty := p_specialty;
        l_rec.email     := p_email;
        doctors_svc.update_rec(
            p_id          => p_id,
            p_rec         => l_rec,
            p_row_version => p_row_version
        );
    END upd;

    PROCEDURE del (p_id IN doctors.id%TYPE) IS
    BEGIN
        doctors_svc.delete_rec(p_id => p_id);
    END del;

END doctors_apx;
/
```

#### 7.2.3 APEX Page Configuration

**Lost-update protection — `row_version` vs APEX `p_md5`**

APEX forms have a native lost-update mechanism: a hidden `p_md5` item containing an MD5 checksum of the displayed column values. If left active alongside `row_version`, two independent locking mechanisms operate in parallel and can produce contradictory results.

Resolution: **disable APEX's native Lost Update Protection** on any form that submits to this TAPI. Include `row_version` as a hidden page item (e.g., `:P10_ROW_VERSION`) populated by `doctors_apx.get` on load and submitted to `doctors_apx.upd` on save.

To disable Lost Update Protection in APEX: on each updatable column in the form region, set "Enable Column Locking" to **Off**, and remove any `APEX_ITEM.md5` or `P{n}_CHECKSUM` usage from the page process.

**APEX Invoke API — process configuration**

| Process event | Type | Package | Procedure | Parameter mapping |
|---|---|---|---|---|
| After Header | Invoke API | `doctors_apx` | `get` | `p_id` ← `:P10_ID`; OUT params → corresponding items |
| Processing | Invoke API | `doctors_apx` | `ins` or `upd` | `p_*` ← page items; `p_id OUT` → `:P10_ID` |
| Processing | Invoke API | `doctors_apx` | `del` | `p_id` ← `:P10_ID` |

APEX automatically applies the page prefix when matching parameter names to items. A parameter `p_name` on page 10 is matched to item `P10_NAME`.

**APEX Error Handling Function — centralised error mapping**

Define one Error Handling Function at the application level (Application > Edit Application Properties > Error Handling):

```sql
FUNCTION app_error_handler (
    p_error IN apex_error.t_error
) RETURN apex_error.t_error_result IS
    l_result apex_error.t_error_result := apex_error.init_error_result(p_error);
BEGIN
    IF p_error.ora_sqlcode = -20010 THEN
        l_result.message      := 'Doctor name is required.';
        l_result.column_alias := 'P10_NAME';
    ELSIF p_error.ora_sqlcode = -20011 THEN
        l_result.message      := 'Enter a valid email address.';
        l_result.column_alias := 'P10_EMAIL';
    ELSIF p_error.ora_sqlcode = -20015 THEN
        l_result.message      := 'This email address is already registered.';
        l_result.column_alias := 'P10_EMAIL';
    ELSIF p_error.ora_sqlcode = -20001 THEN
        l_result.message      := 'This record was modified by another user. Reload and try again.';
    ELSIF p_error.ora_sqlcode = -20002 THEN
        l_result.message      := 'Record not found. It may have been deleted.';
    ELSIF p_error.ora_sqlcode = -20003 THEN
        l_result.message      := 'This record is currently being processed by another operation. Try again in a moment.';
    END IF;
    RETURN l_result;
END app_error_handler;
```

### 7.3 REST Interface Package (`{entity}_rst`)

The `_rst` package is generated when `ifc: "rest"` or `ifc: "both"` is set. It wraps the same SVC layer as `_apx`, translating between JSON and `t_rec`. It is typically called from ORDS resource module handlers.

```sql
CREATE OR REPLACE PACKAGE BODY doctors_rst AS

    PROCEDURE ins IS
        l_body CLOB := :body_text;
        l_rec  doctors_svc.t_rec;
        l_id   doctors.id%TYPE;
    BEGIN
        IF l_body IS NULL OR NOT JSON_EXISTS(l_body, '$') THEN
            :status := 400;
            HTP.p(JSON_OBJECT('message' VALUE 'Request body must be valid JSON'));
            RETURN;
        END IF;

        l_rec.name      := JSON_VALUE(l_body, '$.name');
        l_rec.specialty := JSON_VALUE(l_body, '$.specialty');
        l_rec.email     := JSON_VALUE(l_body, '$.email');

        doctors_svc.create_rec(p_rec => l_rec, x_id => l_id);

        :status := 201;
        HTP.p(JSON_OBJECT('id' VALUE l_id));

    EXCEPTION
        WHEN OTHERS THEN
            -- ROLLBACK is mandatory: ORDS does not automatically roll back
            -- when the handler's WHEN OTHERS block returns normally.
            ROLLBACK;
            :status := CASE SQLCODE
                WHEN -20010 THEN 422
                WHEN -20011 THEN 422
                WHEN -20015 THEN 409
                WHEN -20001 THEN 409
                WHEN -20002 THEN 404
                ELSE              500
            END;
            HTP.p(JSON_OBJECT(
                'error_code' VALUE SQLCODE,
                'message'    VALUE SQLERRM,
                'detail'     VALUE DBMS_UTILITY.FORMAT_ERROR_BACKTRACE
            ));
    END ins;

    -- upd, del, get follow the same pattern.

END doctors_rst;
/
```

---

## 8. Audit Package (`{entity}_audit`) — Level 2 CDC

When a table carries the `/auditlog` directive, the generator emits a fourth package — `{entity}_audit` — with Level 2 Change Data Capture: every INSERT, UPDATE, and DELETE records a JSON snapshot of the full row (`old_values`, `new_values`) via `PRAGMA AUTONOMOUS_TRANSACTION`. Audit is orchestrated by the SVC layer; the HKS layer remains a pure no-op placeholder throughout.

**The `app_audit_log` table is owned by the developer, not auto-generated.** Define it explicitly with `/api`. The `old_values` and `new_values` CLOB columns are required for Level 2 CDC.

**QSQL definition:**

```
app_audit_log /api full+hks
  entity     vc128 /nn
  entity_id  num /nn
  operation  vc6 /nn
  old_values clob
  new_values clob

doctors /api full+hks /auditlog
  name       vc200 /nn
  email      vc200 /nn /unique
  row_version num /nn
# settings = { auditcols: yes }
```

**Generated `doctors_audit` package spec:**

```sql
CREATE OR REPLACE PACKAGE doctors_audit AS

    g_enabled BOOLEAN := TRUE;   -- set FALSE to suppress audit (e.g. bulk import)

    PROCEDURE log_insert (p_row     IN doctors%ROWTYPE);
    PROCEDURE log_update (p_old_row IN doctors%ROWTYPE, p_new_row IN doctors%ROWTYPE);
    PROCEDURE log_delete (p_old_row IN doctors%ROWTYPE);

END doctors_audit;
/
```

**Generated `doctors_audit` package body:**

```sql
CREATE OR REPLACE PACKAGE BODY doctors_audit AS

    FUNCTION f_to_json (p_row IN doctors%ROWTYPE) RETURN CLOB IS
    BEGIN
        RETURN json_object(
            'id'          VALUE p_row.id,
            'name'        VALUE p_row.name,
            'email'       VALUE p_row.email,
            'row_version' VALUE p_row.row_version
            RETURNING CLOB
        );
    END f_to_json;

    PROCEDURE p_log (
        p_operation  IN VARCHAR2,
        p_id         IN doctors_dal.t_id,
        p_old_values IN CLOB DEFAULT NULL,
        p_new_values IN CLOB DEFAULT NULL
    ) IS
        PRAGMA AUTONOMOUS_TRANSACTION;
        l_rec app_audit_log_svc.t_rec;
        l_id  app_audit_log.id%TYPE;
    BEGIN
        IF NOT g_enabled THEN RETURN; END IF;
        l_rec.entity     := 'doctors';
        l_rec.entity_id  := p_id;
        l_rec.operation  := p_operation;
        l_rec.old_values := p_old_values;
        l_rec.new_values := p_new_values;
        app_audit_log_svc.create_rec(p_rec => l_rec, x_id => l_id);
        COMMIT;
    END p_log;

    PROCEDURE log_insert (p_row IN doctors%ROWTYPE) IS
    BEGIN
        p_log(p_operation => 'INSERT', p_id => p_row.id, p_new_values => f_to_json(p_row));
    END log_insert;

    PROCEDURE log_update (p_old_row IN doctors%ROWTYPE, p_new_row IN doctors%ROWTYPE) IS
    BEGIN
        p_log(p_operation => 'UPDATE', p_id => p_new_row.id,
              p_old_values => f_to_json(p_old_row), p_new_values => f_to_json(p_new_row));
    END log_update;

    PROCEDURE log_delete (p_old_row IN doctors%ROWTYPE) IS
    BEGIN
        p_log(p_operation => 'DELETE', p_id => p_old_row.id, p_old_values => f_to_json(p_old_row));
    END log_delete;

END doctors_audit;
/
```

**Audit orchestration in `doctors_svc` (when `/auditlog` is active):**

```sql
-- create_rec — log after successful INSERT
doctors_hks.after_insert(p_row => l_row);
doctors_audit.log_insert(p_row => l_row);

-- update_rec — snapshot before field assignment
l_row     := doctors_dal.get_by_id(p_id => p_id);
l_old_row := l_row;
l_row.name  := p_rec.name;
l_row.email := p_rec.email;
...
doctors_hks.after_update(p_row => l_row);
doctors_audit.log_update(p_old_row => l_old_row, p_new_row => l_row);

-- delete_rec — fetch row BEFORE delete
l_old_row := doctors_dal.get_by_id(p_id => p_id);
doctors_hks.before_delete(p_id => p_id);
doctors_dal.delete_row(p_id => p_id);
doctors_hks.after_delete(p_id => p_id);
doctors_audit.log_delete(p_old_row => l_old_row);
```

**Package output order (when `/auditlog` is present):**

```
app_audit_log_dal   (spec + body)
app_audit_log_hks   (spec + body)
app_audit_log_svc   (spec + body)
doctors_dal         (spec + body)
doctors_hks         (spec + body)
doctors_svc         (spec + body)
doctors_apx         (spec + body)   ← when ifc: apex or both
doctors_rst         (spec + body)   ← when ifc: rest or both
doctors_audit       (spec + body)
```

---

## 9. Error Code Convention

All application errors use the range `-20000` to `-20999`. Oracle provides exactly 1000 codes. Allocate 100 per entity:

| Range | Entity / Domain |
|---|---|
| `-20001` to `-20009` | Infrastructure — shared (stale data, not found, locked) |
| `-20010` to `-20099` | `doctors` entity |
| `-20100` to `-20199` | `appointments` entity |
| `-20200` to `-20299` | `patients` entity |
| ... | 100 per entity |

Within a single entity's range:
- `+0` to `+9`: field-level validation failures
- `+10` to `+49`: business rule violations
- `+50` to `+59`: constraint violation mappings (duplicate key, FK)
- `+60` to `+99`: reserved for custom hook extensions

A constants package prevents magic numbers:

```sql
CREATE OR REPLACE PACKAGE app_errors AS
    c_stale_data   CONSTANT PLS_INTEGER := -20001;
    c_not_found    CONSTANT PLS_INTEGER := -20002;
    c_locked       CONSTANT PLS_INTEGER := -20003;
    c_dr_name_req  CONSTANT PLS_INTEGER := -20010;
    c_dr_email_fmt CONSTANT PLS_INTEGER := -20011;
    c_dr_spec_inv  CONSTANT PLS_INTEGER := -20012;
    c_dr_email_dup CONSTANT PLS_INTEGER := -20015;
END app_errors;
/
```

---

## 10. Grant Strategy

Grants must be planned at install time. In a two-schema setup (`DATA_SCHEMA` owns tables, `APP_SCHEMA` owns packages):

```sql
-- From DATA_SCHEMA
GRANT SELECT, INSERT, UPDATE, DELETE ON doctors TO APP_SCHEMA;

-- From APP_SCHEMA — only the IFC package is exposed to consumers
GRANT EXECUTE ON doctors_apx TO APEX_SCHEMA;
GRANT EXECUTE ON doctors_rst TO ORDS_PUBLIC_USER;

-- SVC, DAL, and HKS are internal — no external grants.
-- Only the IFC package forms the public consumer contract.
```

In a single-schema deployment, only the last two grants apply.

---

## 11. EspreSQL Generator Integration

The tier is the argument to `/api` on each table. When omitted, the default is `full+hks` (backward-compatible with the old `layered` value). The `api` key is not used in the settings block — tier selection is always per-table.

```
doctors       /api full+hks
   name       vc200 /nn
   email      vc200 /nn /unique

lookup_types  /api lookup
   code       vc30 /nn
   name       vc100 /nn

order_lines   /api service+hks
   order_id   num /fk orders /nn
   qty        num /nn

# settings = { ifc: "both", auditcols: yes, rowversion: yes, semantics: "CHAR" }
```

```typescript
// oracle-plsql.ts
generateLayeredTAPI(node: IDdlNode): string {
    if (node.inferType() !== 'table') return '';
    if (node.children.length === 0) return '';

    const raw  = node.getDirectiveArg('api') ?? 'full+hks';
    // legacy aliases
    const tier = raw === 'layered' ? 'full+hks'
               : raw === '3h'      ? 'full+hks'
               : raw === '3'       ? 'full'
               : raw === '2h'      ? 'service+hks'
               : raw === '2'       ? 'service'
               : raw === '1h'      ? 'lookup+hks'
               : raw === '1'       ? 'lookup'
               : raw;

    const hasDal = ['full', 'full+hks'].includes(tier);
    const hasHks = tier.endsWith('+hks');
    const hasSvc = ['service', 'service+hks', 'full', 'full+hks'].includes(tier);

    let r = '';
    if (hasDal) r += this._generateDalSpec(node) + '\n' + this._generateDalBody(node) + '\n';
    if (hasHks) r += this._generateHksSpec(node, hasDal) + '\n' + this._generateHksBody(node, hasDal) + '\n';
    if (hasSvc) r += this._generateSvcSpec(node) + '\n' + this._generateSvcBody(node, hasDal, hasHks) + '\n';

    // IFC packages — controlled by the ifc setting, not by tier
    const ifc = this.ctx.getOptionValue('ifc') ?? 'apex';
    if (ifc === 'apex' || ifc === 'both')
        r += this._generateApxSpec(node) + '\n' + this._generateApxBody(node, hasSvc, hasDal);
    if (ifc === 'rest' || ifc === 'both')
        r += '\n' + this._generateRstSpec(node) + '\n' + this._generateRstBody(node, hasSvc, hasDal);
    if (this._hasAuditLog(node))
        r += '\n' + this._generateAuditSpec(node) + '\n' + this._generateAuditBody(node);

    return r;
}
```

`_generateHksSpec(node, hasDal)` uses `{entity}_dal.t_id` for `before/after_delete` when `hasDal` is true, and `{entity}.id%TYPE` otherwise.

`_generateSvcBody(node, hasDal, hasHks)` emits private DML procedures (`p_get_by_id`, `p_insert_row`, …) when `hasDal` is false, and private no-op hook stubs when `hasHks` is false.

`_generateApxBody(node, hasSvc, hasDal)` calls `{entity}_svc.*` when `hasSvc` is true, and emits absorbed private logic otherwise.

The `_hks` body is the only file developers own — generated once and never overwritten. All other packages are generator-owned and safe to regenerate at any time.

---

## 12. What Is Explicitly Out of Scope

- **Row-Level Security (VPD / `DBMS_RLS`)**: Applied below the DAL. VPD predicates silently filter rows — `get_by_id` returning `NO_DATA_FOUND` may mean "not found" or "access denied." If RLS is active, document this distinction for callers.
- **`RESULT_CACHE`**: Performance tuning, decided after profiling.
- **TXEventQ / async notifications**: The `after_*` hooks are the integration point when this is needed — the body is replaced to enqueue rather than INSERT.
- **Bulk DML**: Separate pattern for high-volume operations.
- **Pagination**: Belongs in the SQL source of APEX reports or the ORDS handler, not in the DAL.
- **Oracle 23c features**: `BOOLEAN` native type and JSON Schema validation in the DB layer are straightforward improvements for a 23c target. They do not change this architecture.

---

## 13. Migration Path from Current Generated TAPI

**Step 1 — Identify all callers**

```sql
SELECT owner, name, type
  FROM all_dependencies
 WHERE referenced_name = 'DOCTORS_API'
   AND referenced_type = 'PACKAGE';

SELECT application_id, page_id, process_name, process_text
  FROM apex_application_page_processes
 WHERE UPPER(process_text) LIKE '%DOCTORS_API%';
```

**Step 2** — Install `doctors_dal`, `doctors_hks` (spec + no-op body), `doctors_svc`, `doctors_apx`. The old flat package coexists.

**Step 3** — Migrate APEX page processes one at a time to use `doctors_apx`. Switch from manual bind-variable process code to APEX Invoke API. Disable APEX Lost Update Protection. Map `row_version` to a hidden page item.

**Step 4** — Move existing validation logic into the hooks body. Execute the no-op stub from EspreSQL output once, save it as a developer-owned file, then replace the stubs with the custom logic ported from the old package.

**Step 5** — When Step 1 queries return zero rows: `DROP PACKAGE doctors_api`.

---

## Revision History

| Version | Date       | Author             | Notes |
|---------|------------|--------------------|-------|
| 1.0     | 2026-04-26 | Roberto Capancioni | Initial specification |
| 1.1     | 2026-04-26 | Roberto Capancioni | Removed `t_result`; ORA-04068; AUTONOMOUS_TRANSACTION guidance; `dup_val_on_index`; grants; ORDS JSON guard; simplified error ranges; APEX dependency query |
| 1.2     | 2026-04-26 | Roberto Capancioni | NOCOPY partial-state warning; APEX `p_md5` vs `row_version` conflict; explicit ROLLBACK in ORDS handler; atomicity policy formalised; comparison table; file naming convention; APEX Error Handling Function example; Oracle 23c future note |
| 1.3     | 2026-04-26 | Roberto Capancioni | Cross-entity validation via DAL with direct-SQL fallback note; file extension convention (`.pks`/`.pkb` vs `.sql`); corrected `PRAGMA SERIALLY_REUSABLE` misconception |
| 1.4     | 2026-04-27 | Roberto Capancioni | Audit layer: `/auditlog` directive generates `{entity}_audit` package with `PRAGMA AUTONOMOUS_TRANSACTION`; layer map, file naming table, and generator section updated |
| 1.5     | 2026-04-27 | Roberto Capancioni | `app_audit_log` is now developer-owned; `_audit.p_log` calls `app_audit_log_svc.create_rec` |
| 1.6     | 2026-05-05 | Roberto Capancioni | Four-layer architecture: IFC layer added (`_apx` / `_rst`); SVC switches from scalar params to `t_rec` record (business columns only, no PK/rowversion/audit — all trigger-managed); `x_version OUT` removed from SVC; hooks renamed to `_hks` throughout; `ifc` setting controls which IFC package is generated (default: `apex`); APX procedures: `get / ins / upd / del` with `p_`-prefix for APEX Invoke API auto-mapping; grants model updated — only IFC layer is public; `p_row_version` in APX `get`/`upd` only when `/rowversion` active; audit OUT params in APX `get` only when `auditcols: yes` active |
| 1.7     | 2026-05-05 | Roberto Capancioni | DAL: `lock_by_id` function added (SELECT FOR UPDATE NOWAIT); `c_err_locked` constant (-20003); `resource_busy` exception with PRAGMA EXCEPTION_INIT(-54) declared at body level; §4.3 extended with check-then-act pattern, SVC usage example, and guidance on when to use `lock_by_id` vs `get_by_id`; §7.2.3 APEX error handler updated with -20003 mapping; §8 audit body corrected to `l_rec t_rec` pattern (was showing old scalar named-param call); §9 error range and `app_errors` package updated with `c_locked`; §6.2 rewritten — EspreSQL generates a single SQL block, not separate files; file management is a deployment discipline, not a generator feature; `_hks_impl.sql` naming is a developer convention, not enforced by EspreSQL |
| 1.8     | 2026-05-08 | Roberto Capancioni | §3.4 Tier Model: 6-tier system (`lookup` `lookup+hks` `service` `service+hks` `full` `full+hks`) selects minimum package set per table; tier is the argument to `/api` on each table — `api` key removed from settings block; `+hks` suffix formalises developer-owned `_hks` body; cross-entity coupling constraint and tier selection guide added; `_audit` noted as orthogonal to tier; §3.4 Design Decisions renumbered to §3.5; §3 title "Four-Layer" → "Layered"; §7.1 and §8 settings examples updated; §11 TypeScript simplified with `hasDal`/`hasHks`/`hasSvc` flags and legacy numeric alias mapping |
| 1.9     | 2026-05-08 | Roberto Capancioni | §3.4 Degradation rule: explicit principle — each layer calls the one below if present, absorbs it as private procedures if absent; cascading table and per-tier consequences added; `service+hks` complete body example showing private DML section; `lookup+hks` pattern described; `_rst` and `_audit` noted as orthogonal to tier in tier table; §6.3 `_hks` spec: `before/after_delete` parameter type is `_dal.t_id` when `_dal` is present, `table.id%TYPE` otherwise — documented with both variants; §6.4/§6.5 bodies updated with conditional type note; §7.1 `ifc` setting: three explicit values (`"apex"` / `"rest"` / `"both"`) replace the previous two-value implicit behaviour; §8 output order updated with `_rst` conditional line; §11 TypeScript: `getOption` → `getOptionValue`; `hasDal` passed to `_generateHksSpec` and `_generateHksBody`; `hasDal`/`hasHks` passed to `_generateSvcBody`; `hasSvc`/`hasDal` passed to `_generateApxBody` and `_generateRstBody`; IFC generation replaced with explicit three-way `ifc` switch |
