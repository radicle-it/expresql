# EspreSQL Layered TAPI — Test Implementation Specification

**Status**: Specification  
**Version**: 1.0  
**Author**: Roberto Capancioni — Radicle s.r.l.  
**Date**: 2026-04-26  
**Depends on**: [TAPI-LAYERED-ARCHITECTURE.md](TAPI-LAYERED-ARCHITECTURE.md) v1.3  
**Target Platform**: Oracle Database 19c

---

## 1. Purpose and Scope

This document specifies the test domain schema, the TAPI stack to implement, the test scenario catalogue, and the test harness structure required to validate the Layered TAPI Architecture defined in `TAPI-LAYERED-ARCHITECTURE.md`.

The output of this specification is a self-contained set of SQL and PL/SQL artefacts that:
- Exercise every contract defined in the architecture specification
- Can be executed in any Oracle 19c schema with no external dependencies beyond utPLSQL
- Serve as a living regression suite as the generator evolves
- Provide a reference implementation that developers can copy as a starting point for new entities

**This document does not contain implementation code.** It defines what must be implemented, the expected behaviour, and the acceptance criteria. Implementation follows in a separate deliverable.

---

## 2. Test Domain — Medical Scheduling

The test domain contains three entities with deliberate relationships designed to exercise every TAPI feature:

```
┌─────────────────┐          ┌──────────────────────────┐
│   specialties   │ 1──── 0..n │       doctors            │
│  (lookup, DAL   │◄──────────│  (full TAPI stack)       │
│   only)         │           │  FK to specialties.code  │
└─────────────────┘           │  UNIQUE on email         │
                              └────────────┬─────────────┘
                                           │ 1──── 0..n
                                           ▼
                              ┌──────────────────────────┐
                              │      appointments        │
                              │  (full TAPI stack)       │
                              │  FK to doctors.id        │
                              │  CHECK on status         │
                              └──────────────────────────┘
```

### Why this domain

| Feature under test | Entity that exercises it |
|---|---|
| Simple DAL, no write hooks | `specialties` |
| Cross-entity validation via DAL | `doctors_hooks` → `specialties_dal` |
| UNIQUE constraint → `dup_val_on_index` mapping | `doctors` (email) |
| Optimistic locking | `doctors`, `appointments` |
| Parent FK enforced on DELETE | `doctors` (has appointments) |
| Child FK validation | `appointments` → `doctors` |
| CHECK constraint mapping | `appointments` (status values) |
| After-hook audit trail | Both `doctors` and `appointments` |
| Atomicity: after-hook failure rolls back DML | `doctors` (injectable test hook body) |

---

## 3. Schema DDL

All objects are created in the test schema. No schema prefix in DDL — the installation script must be run connected as the target schema user.

### 3.1 Lookup — `specialties`

```sql
CREATE TABLE specialties (
    code        VARCHAR2(20 CHAR)
                CONSTRAINT specialties_pk PRIMARY KEY,
    description VARCHAR2(200 CHAR) NOT NULL,
    is_active   VARCHAR2(1)        DEFAULT 'Y' NOT NULL
                CONSTRAINT specialties_active_chk CHECK (is_active IN ('Y','N'))
);

COMMENT ON TABLE  specialties      IS 'Controlled vocabulary of medical specialties.';
COMMENT ON COLUMN specialties.code IS 'Short identifier used as FK target. Immutable once created.';
```

No triggers, no audit columns. This table is populated via reference data scripts, not TAPI. It intentionally has no `row_version` to test that the DAL pattern works for read-only lookup entities.

### 3.2 Main entity — `doctors`

```sql
CREATE TABLE doctors (
    id             NUMBER
                   DEFAULT ON NULL TO_NUMBER(SYS_GUID(), 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                   CONSTRAINT doctors_pk PRIMARY KEY,
    name           VARCHAR2(255 CHAR) NOT NULL,
    specialty_code VARCHAR2(20 CHAR)
                   CONSTRAINT doctors_spec_fk REFERENCES specialties(code),
    email          VARCHAR2(255 CHAR) NOT NULL
                   CONSTRAINT doctors_email_uq UNIQUE,
    license_number VARCHAR2(50 CHAR),
    row_version    INTEGER            NOT NULL,
    created        DATE               NOT NULL,
    created_by     VARCHAR2(255 CHAR) NOT NULL,
    updated        DATE               NOT NULL,
    updated_by     VARCHAR2(255 CHAR) NOT NULL
);

COMMENT ON TABLE  doctors               IS 'Registered doctors. Managed via doctors_svc.';
COMMENT ON COLUMN doctors.row_version   IS 'Optimistic locking counter. Incremented by BU trigger.';
COMMENT ON COLUMN doctors.specialty_code IS 'FK to specialties.code. NULL = generalist.';
```

Triggers on `doctors`:

```sql
CREATE OR REPLACE TRIGGER doctors_bi
    BEFORE INSERT ON doctors FOR EACH ROW
BEGIN
    :new.email       := LOWER(:new.email);
    :new.row_version := 1;
    :new.created     := SYSDATE;
    :new.created_by  := COALESCE(SYS_CONTEXT('APEX$SESSION','APP_USER'), USER);
    :new.updated     := SYSDATE;
    :new.updated_by  := COALESCE(SYS_CONTEXT('APEX$SESSION','APP_USER'), USER);
END doctors_bi;
/

CREATE OR REPLACE TRIGGER doctors_bu
    BEFORE UPDATE ON doctors FOR EACH ROW
BEGIN
    :new.email       := LOWER(:new.email);
    :new.row_version := NVL(:old.row_version, 0) + 1;
    :new.updated     := SYSDATE;
    :new.updated_by  := COALESCE(SYS_CONTEXT('APEX$SESSION','APP_USER'), USER);
END doctors_bu;
/
```

### 3.3 Child entity — `appointments`

```sql
CREATE TABLE appointments (
    id           NUMBER
                 DEFAULT ON NULL TO_NUMBER(SYS_GUID(), 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
                 CONSTRAINT appointments_pk PRIMARY KEY,
    doctor_id    NUMBER             NOT NULL
                 CONSTRAINT appointments_dr_fk REFERENCES doctors(id),
    patient_name VARCHAR2(255 CHAR) NOT NULL,
    scheduled_at DATE               NOT NULL,
    status       VARCHAR2(20 CHAR)  DEFAULT 'SCHEDULED' NOT NULL
                 CONSTRAINT appointments_status_chk
                     CHECK (status IN ('SCHEDULED','COMPLETED','CANCELLED')),
    notes        VARCHAR2(4000 CHAR),
    row_version  INTEGER            NOT NULL,
    created      DATE               NOT NULL,
    created_by   VARCHAR2(255 CHAR) NOT NULL,
    updated      DATE               NOT NULL,
    updated_by   VARCHAR2(255 CHAR) NOT NULL
);

COMMENT ON TABLE  appointments             IS 'Doctor appointments. Managed via appointments_svc.';
COMMENT ON COLUMN appointments.doctor_id   IS 'FK to doctors.id. Must reference an existing doctor.';
COMMENT ON COLUMN appointments.status      IS 'SCHEDULED|COMPLETED|CANCELLED. State machine enforced in SVC.';
```

Triggers on `appointments`:

```sql
CREATE OR REPLACE TRIGGER appointments_bi
    BEFORE INSERT ON appointments FOR EACH ROW
BEGIN
    :new.row_version := 1;
    :new.created     := SYSDATE;
    :new.created_by  := COALESCE(SYS_CONTEXT('APEX$SESSION','APP_USER'), USER);
    :new.updated     := SYSDATE;
    :new.updated_by  := COALESCE(SYS_CONTEXT('APEX$SESSION','APP_USER'), USER);
END appointments_bi;
/

CREATE OR REPLACE TRIGGER appointments_bu
    BEFORE UPDATE ON appointments FOR EACH ROW
BEGIN
    :new.row_version := NVL(:old.row_version, 0) + 1;
    :new.updated     := SYSDATE;
    :new.updated_by  := COALESCE(SYS_CONTEXT('APEX$SESSION','APP_USER'), USER);
END appointments_bu;
/
```

### 3.4 Audit log

Used by the custom hooks body to verify atomicity and observability:

```sql
CREATE TABLE app_audit_log (
    log_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity     VARCHAR2(64)       NOT NULL,
    entity_id  NUMBER             NOT NULL,
    operation  VARCHAR2(10)       NOT NULL
               CONSTRAINT audit_op_chk CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    logged_at  TIMESTAMP          NOT NULL,
    logged_by  VARCHAR2(255 CHAR) NOT NULL
);
```

---

## 4. TAPI Stack Inventory

The following packages must be implemented for this test domain. Each entry lists the package name, its type, and the source it derives from.

### 4.1 Shared infrastructure

| Package | Type | Description |
|---|---|---|
| `app_errors` | Constants package (spec only) | Centralised error code constants for the test domain |

### 4.2 `specialties` — DAL only (no SVC, no hooks)

| Package | Type | Regeneratable |
|---|---|---|
| `specialties_dal` | DAL | Yes |

`specialties_dal` exposes read-only access: `get_by_code`, `get_all`. No write procedures — the table is populated by reference data scripts. This package is the FK target for `doctors_hooks` cross-entity validation.

### 4.3 `doctors` — Full TAPI stack

| File | Package | Type | Regeneratable |
|---|---|---|---|
| `doctors_dal.sql` | `doctors_dal` | DAL | Yes |
| `doctors_hooks_spec.sql` | `doctors_hooks` (spec) | Hook spec | Yes |
| `doctors_hooks_impl.sql` | `doctors_hooks` (body) | Hook body | **No** |
| `doctors_svc.sql` | `doctors_svc` | Service layer | Yes |

### 4.4 `appointments` — Full TAPI stack

| File | Package | Type | Regeneratable |
|---|---|---|---|
| `appointments_dal.sql` | `appointments_dal` | DAL | Yes |
| `appointments_hooks_spec.sql` | `appointments_hooks` (spec) | Hook spec | Yes |
| `appointments_hooks_impl.sql` | `appointments_hooks` (body) | Hook body | **No** |
| `appointments_svc.sql` | `appointments_svc` | Service layer | Yes |

### 4.5 Test infrastructure

| File | Description | Regeneratable |
|---|---|---|
| `app_errors.sql` | Error constants package | Yes |
| `ref_data.sql` | Seed data for `specialties` | Yes |
| `doctors_hooks_test_body.sql` | Alternative hooks body for failure-injection tests | No |
| `test_suite_doctors.sql` | utPLSQL test suite for `doctors` | No |
| `test_suite_appointments.sql` | utPLSQL test suite for `appointments` | No |
| `test_suite_integration.sql` | Cross-entity integration tests | No |
| `install.sql` | Master installation script (runs all files in order) | No |
| `uninstall.sql` | Drops all test objects cleanly | No |

---

## 5. Error Code Registry — Test Domain

| Constant | Code | Entity | Condition |
|---|---|---|---|
| `c_err_stale_data` | `-20001` | Infrastructure | `row_version` mismatch on update |
| `c_err_not_found` | `-20002` | Infrastructure | Record does not exist |
| `c_dr_name_req` | `-20010` | `doctors` | `name` is NULL |
| `c_dr_email_fmt` | `-20011` | `doctors` | `email` is NULL or lacks `@` |
| `c_dr_spec_invalid` | `-20012` | `doctors` | `specialty_code` not in `specialties` |
| `c_dr_email_dup` | `-20015` | `doctors` | Duplicate `email` (maps `dup_val_on_index`) |
| `c_dr_has_appts` | `-20016` | `doctors` | Delete blocked: doctor has appointments |
| `c_ap_patient_req` | `-20110` | `appointments` | `patient_name` is NULL |
| `c_ap_date_req` | `-20111` | `appointments` | `scheduled_at` is NULL |
| `c_ap_date_past` | `-20112` | `appointments` | `scheduled_at` is in the past (on INSERT) |
| `c_ap_doctor_req` | `-20113` | `appointments` | `doctor_id` does not reference a valid doctor |
| `c_ap_status_inv` | `-20114` | `appointments` | Invalid status transition (e.g., CANCELLED → COMPLETED) |
| `c_ap_status_dup` | `-20115` | `appointments` | Maps `dup_val_on_index` if a unique business key is added |

---

## 6. Package Contracts

This section defines the exact public API signature each package must expose. Implementation bodies are not specified here — only the spec.

### 6.1 `specialties_dal`

```sql
CREATE OR REPLACE PACKAGE specialties_dal AS

    SUBTYPE t_code IS specialties.code%TYPE;

    -- Raises NO_DATA_FOUND if code does not exist or is_active = 'N'.
    FUNCTION get_by_code (p_code IN t_code) RETURN specialties%ROWTYPE;

    TYPE t_cursor IS REF CURSOR RETURN specialties%ROWTYPE;
    FUNCTION get_all_active RETURN t_cursor;

END specialties_dal;
```

### 6.2 `doctors_dal`

```sql
CREATE OR REPLACE PACKAGE doctors_dal AS

    SUBTYPE t_id IS doctors.id%TYPE;

    FUNCTION  get_by_id    (p_id    IN t_id)                    RETURN doctors%ROWTYPE;
    FUNCTION  get_by_email (p_email IN doctors.email%TYPE)       RETURN doctors%ROWTYPE;

    TYPE t_cursor IS REF CURSOR RETURN doctors%ROWTYPE;
    FUNCTION  get_all RETURN t_cursor;

    PROCEDURE insert_row (p_row IN OUT NOCOPY doctors%ROWTYPE);
    PROCEDURE update_row (p_row IN OUT NOCOPY doctors%ROWTYPE);
    PROCEDURE delete_row (p_id  IN t_id);

    c_err_stale_data CONSTANT PLS_INTEGER := -20001;
    c_err_not_found  CONSTANT PLS_INTEGER := -20002;

END doctors_dal;
```

### 6.3 `doctors_hooks` (spec)

```sql
CREATE OR REPLACE PACKAGE doctors_hooks AS

    PROCEDURE validate      (p_operation IN VARCHAR2, p_row IN OUT NOCOPY doctors%ROWTYPE);
    PROCEDURE before_insert (p_row IN OUT NOCOPY doctors%ROWTYPE);
    PROCEDURE before_update (p_row IN OUT NOCOPY doctors%ROWTYPE);
    PROCEDURE before_delete (p_id  IN doctors_dal.t_id);
    PROCEDURE after_insert  (p_row IN doctors%ROWTYPE);
    PROCEDURE after_update  (p_row IN doctors%ROWTYPE);
    PROCEDURE after_delete  (p_id  IN doctors_dal.t_id);

END doctors_hooks;
```

The production body (`doctors_hooks_impl.sql`) must implement:
- `validate`: name NOT NULL, email format, specialty via `specialties_dal.get_by_code`
- `before_insert` / `before_update`: `INITCAP(TRIM(name))`
- `after_insert` / `after_update` / `after_delete`: INSERT into `app_audit_log`
- `before_delete`: check for child appointments; raise `c_dr_has_appts` if any exist

### 6.4 `doctors_svc`

```sql
CREATE OR REPLACE PACKAGE doctors_svc AS

    FUNCTION  get (p_id IN doctors.id%TYPE) RETURN doctors%ROWTYPE;

    PROCEDURE create_doctor (
        p_name          IN  doctors.name%TYPE,
        p_specialty_code IN doctors.specialty_code%TYPE DEFAULT NULL,
        p_email         IN  doctors.email%TYPE,
        p_license_number IN doctors.license_number%TYPE DEFAULT NULL,
        x_id            OUT doctors.id%TYPE,
        x_version       OUT doctors.row_version%TYPE
    );

    PROCEDURE update_doctor (
        p_id             IN  doctors.id%TYPE,
        p_name           IN  doctors.name%TYPE,
        p_specialty_code IN  doctors.specialty_code%TYPE DEFAULT NULL,
        p_email          IN  doctors.email%TYPE,
        p_license_number IN  doctors.license_number%TYPE DEFAULT NULL,
        p_row_version    IN  doctors.row_version%TYPE,
        x_version        OUT doctors.row_version%TYPE
    );

    PROCEDURE delete_doctor (p_id IN doctors.id%TYPE);

END doctors_svc;
```

### 6.5 `appointments_dal`

```sql
CREATE OR REPLACE PACKAGE appointments_dal AS

    SUBTYPE t_id IS appointments.id%TYPE;

    FUNCTION  get_by_id      (p_id        IN t_id)                  RETURN appointments%ROWTYPE;
    FUNCTION  get_by_doctor  (p_doctor_id IN doctors_dal.t_id)       RETURN SYS_REFCURSOR;

    PROCEDURE insert_row (p_row IN OUT NOCOPY appointments%ROWTYPE);
    PROCEDURE update_row (p_row IN OUT NOCOPY appointments%ROWTYPE);
    PROCEDURE delete_row (p_id  IN t_id);

    FUNCTION  count_by_doctor (p_doctor_id IN doctors_dal.t_id) RETURN PLS_INTEGER;

    c_err_stale_data CONSTANT PLS_INTEGER := -20001;
    c_err_not_found  CONSTANT PLS_INTEGER := -20002;

END appointments_dal;
```

Note: `get_by_doctor` returns a `SYS_REFCURSOR` (weakly typed) rather than the strongly typed `t_cursor` pattern used in `doctors_dal`. This is intentional — it tests that the architecture tolerates both patterns and that the SVC layer handles the distinction correctly.

`count_by_doctor` is required by `doctors_hooks.before_delete` to check for child records before parent deletion.

### 6.6 `appointments_hooks` (spec)

```sql
CREATE OR REPLACE PACKAGE appointments_hooks AS

    PROCEDURE validate      (p_operation IN VARCHAR2, p_row IN OUT NOCOPY appointments%ROWTYPE);
    PROCEDURE before_insert (p_row IN OUT NOCOPY appointments%ROWTYPE);
    PROCEDURE before_update (p_row IN OUT NOCOPY appointments%ROWTYPE);
    PROCEDURE before_delete (p_id  IN appointments_dal.t_id);
    PROCEDURE after_insert  (p_row IN appointments%ROWTYPE);
    PROCEDURE after_update  (p_row IN appointments%ROWTYPE);
    PROCEDURE after_delete  (p_id  IN appointments_dal.t_id);

END appointments_hooks;
```

The production body must implement:
- `validate INSERT`: `patient_name` NOT NULL, `scheduled_at` NOT NULL, `scheduled_at > SYSDATE`, `doctor_id` exists via `doctors_dal.get_by_id`
- `validate UPDATE`: same field checks; additionally validate status transition (see Section 7, TC-AP-012)
- `after_insert` / `after_update` / `after_delete`: INSERT into `app_audit_log`

### 6.7 `appointments_svc`

```sql
CREATE OR REPLACE PACKAGE appointments_svc AS

    FUNCTION  get (p_id IN appointments.id%TYPE) RETURN appointments%ROWTYPE;

    PROCEDURE create_appointment (
        p_doctor_id    IN  appointments.doctor_id%TYPE,
        p_patient_name IN  appointments.patient_name%TYPE,
        p_scheduled_at IN  appointments.scheduled_at%TYPE,
        p_notes        IN  appointments.notes%TYPE DEFAULT NULL,
        x_id           OUT appointments.id%TYPE,
        x_version      OUT appointments.row_version%TYPE
    );

    PROCEDURE update_appointment (
        p_id           IN  appointments.id%TYPE,
        p_patient_name IN  appointments.patient_name%TYPE,
        p_scheduled_at IN  appointments.scheduled_at%TYPE,
        p_status       IN  appointments.status%TYPE,
        p_notes        IN  appointments.notes%TYPE DEFAULT NULL,
        p_row_version  IN  appointments.row_version%TYPE,
        x_version      OUT appointments.row_version%TYPE
    );

    PROCEDURE cancel_appointment (
        p_id          IN  appointments.id%TYPE,
        p_row_version IN  appointments.row_version%TYPE,
        x_version     OUT appointments.row_version%TYPE
    );

    PROCEDURE delete_appointment (p_id IN appointments.id%TYPE);

END appointments_svc;
```

`cancel_appointment` is a semantic operation distinct from `update_appointment`. It sets `status = 'CANCELLED'` and validates the transition in the hook. It tests that the SVC can expose domain-meaningful operations beyond raw CRUD.

---

## 7. Test Scenario Catalogue

Each scenario is identified by a code (`TC-DR-nnn` for doctors, `TC-AP-nnn` for appointments, `TC-INT-nnn` for integration), a category, the expected outcome, and which architecture contract it validates.

### 7.1 `doctors` — Unit Tests

| ID | Category | Description | Expected outcome | Contract validated |
|---|---|---|---|---|
| TC-DR-001 | Happy path | Create doctor with valid data, valid specialty | `x_id` populated, `x_version = 1`, row exists in DB | DAL RETURNING clause; SVC orchestration |
| TC-DR-002 | Happy path | Get doctor by id after creation | Returned row matches inserted values | DAL `get_by_id` |
| TC-DR-003 | Happy path | Update doctor name; name is title-cased | `x_version = 2`; `name = INITCAP(input)` | `before_update` hook; trigger increments version |
| TC-DR-004 | Happy path | Delete doctor with no appointments | Row absent from `doctors`; audit log has DELETE entry | DAL `delete_row`; `after_delete` hook |
| TC-DR-005 | Validation | Create with NULL name | Raises `-20010` | `validate` hook |
| TC-DR-006 | Validation | Create with NULL email | Raises `-20011` | `validate` hook |
| TC-DR-007 | Validation | Create with malformed email (no `@`) | Raises `-20011` | `validate` hook |
| TC-DR-008 | Validation | Create with unknown specialty_code | Raises `-20012` | Cross-entity validation via `specialties_dal` |
| TC-DR-009 | Validation | Create with inactive specialty_code | Raises `-20012` | `specialties_dal.get_by_code` filters `is_active='N'` |
| TC-DR-010 | Constraint | Create two doctors with same email | Second raises `-20015` | `dup_val_on_index` mapping in SVC |
| TC-DR-011 | Concurrency | Update with correct `row_version` | Succeeds; `x_version` incremented | Optimistic locking — happy path |
| TC-DR-012 | Concurrency | Update with stale `row_version` | Raises `-20001` | Optimistic locking — stale detection |
| TC-DR-013 | Concurrency | Update non-existent id | Raises `-20002` | Optimistic locking — not-found branch |
| TC-DR-014 | Delete safety | Delete doctor who has appointments | Raises `-20016` | `before_delete` hook; FK guard |
| TC-DR-015 | Not found | Get by non-existent id | Raises `NO_DATA_FOUND` | DAL `get_by_id` propagation |
| TC-DR-016 | Normalisation | Insert with leading/trailing spaces in name | Stored name is trimmed and title-cased | `before_insert` hook |
| TC-DR-017 | Audit | Insert doctor; check audit log | `app_audit_log` has one INSERT row for the doctor's id | `after_insert` hook; atomicity |
| TC-DR-018 | Atomicity | After-hook body raises; verify DML is rolled back | Row absent from `doctors`; audit log has no entry | Transaction atomicity; Section 5.4 of architecture spec |
| TC-DR-019 | Happy path | Create doctor with NULL specialty (generalist) | Succeeds; `specialty_code` is NULL in DB | Nullable FK; validate skips check when NULL |
| TC-DR-020 | Happy path | Get by email | Returns correct row | DAL `get_by_email` |

**TC-DR-018 implementation note**: To inject the after-hook failure without modifying the production body, the test suite installs `doctors_hooks_test_body.sql` before this test case and restores `doctors_hooks_impl.sql` (the no-op body) afterwards. The test body's `after_insert` raises a hardcoded error. The suite setup/teardown mechanism handles the swap.

### 7.2 `appointments` — Unit Tests

| ID | Category | Description | Expected outcome | Contract validated |
|---|---|---|---|---|
| TC-AP-001 | Happy path | Create appointment for existing doctor | `x_id` populated, `x_version = 1` | DAL RETURNING; SVC orchestration |
| TC-AP-002 | Happy path | Update appointment notes | `x_version = 2`; notes updated | `update_appointment` |
| TC-AP-003 | Happy path | Cancel appointment via `cancel_appointment` | `status = 'CANCELLED'`, `x_version` incremented | Semantic SVC operation |
| TC-AP-004 | Happy path | Delete appointment | Row absent from DB | DAL `delete_row` |
| TC-AP-005 | Validation | Create with NULL patient_name | Raises `-20110` | `validate` hook |
| TC-AP-006 | Validation | Create with NULL scheduled_at | Raises `-20111` | `validate` hook |
| TC-AP-007 | Validation | Create with scheduled_at in the past | Raises `-20112` | Business rule in `validate` hook |
| TC-AP-008 | Validation | Create with non-existent doctor_id | Raises `-20113` | Cross-entity validation via `doctors_dal` |
| TC-AP-009 | Concurrency | Update with stale `row_version` | Raises `-20001` | Optimistic locking |
| TC-AP-010 | Concurrency | Update non-existent id | Raises `-20002` | Not-found detection |
| TC-AP-011 | Audit | Create appointment; check audit log | `app_audit_log` has INSERT entry | `after_insert` hook |
| TC-AP-012 | State machine | Transition CANCELLED → COMPLETED | Raises `-20114` | Status transition guard in `validate UPDATE` |
| TC-AP-013 | State machine | Transition SCHEDULED → COMPLETED | Succeeds | Valid transition |
| TC-AP-014 | State machine | Transition COMPLETED → CANCELLED | Raises `-20114` | COMPLETED is a terminal state |

### 7.3 Integration Tests

| ID | Description | Expected outcome | Contract validated |
|---|---|---|---|
| TC-INT-001 | Create doctor, create 3 appointments, delete doctor | Raises `-20016` on delete | Parent FK guard across entities |
| TC-INT-002 | Create doctor, cancel all appointments, delete doctor | Doctor deleted successfully | Delete guard only blocks when active appointments exist (if so designed; see note) |
| TC-INT-003 | Create doctor A and doctor B with same email simultaneously (two sessions simulated) | One succeeds, one raises `-20015` | Concurrent insert — `dup_val_on_index` mapping |
| TC-INT-004 | Update doctor specialty to inactive code | Raises `-20012` | Cross-entity validation: inactive filter |
| TC-INT-005 | Doctor audit and appointment audit in same transaction | Both audit rows committed atomically | Single-transaction audit; no AUTONOMOUS_TRANSACTION |
| TC-INT-006 | After-hook on doctor raises; verify no doctor row and no audit row | Both absent | Full rollback propagation across DAL + hook calls |

**TC-INT-002 design note**: The `before_delete` implementation must define whether "has appointments" means any appointment regardless of status, or only non-CANCELLED appointments. This decision must be documented in `doctors_hooks_impl.sql` before the test is written. The test scenario is deliberately left open to expose this design choice to the implementor.

---

## 8. Test Harness

### 8.1 Framework — utPLSQL

The test harness uses **utPLSQL v3** (the standard open-source Oracle PL/SQL unit test framework). utPLSQL provides:
- Annotation-driven test suites (`--%suite`, `--%test`, `--%beforeeach`)
- Assertion library (`ut.expect(...).to_equal(...)`, `.to_raise_error(...)`)
- JUnit-compatible XML output for CI integration
- Automatic test isolation via transaction rollback after each test

Installation: `https://github.com/utPLSQL/utPLSQL` — requires `DBA` or dedicated install script. The test schema user needs `EXECUTE` on `ut3` objects and `CREATE PROCEDURE` privilege.

**Fallback for environments without utPLSQL**: each test case is also implemented as a standalone anonymous block that prints PASS/FAIL to DBMS_OUTPUT. These blocks are in `test_manual/` and are not part of the CI suite.

### 8.2 Suite Structure

```
test/
├── install.sql                  -- master installer (runs all in order)
├── uninstall.sql                -- drops all test objects
├── ref_data.sql                 -- specialties seed data
├── doctors_hooks_test_body.sql  -- failure-injection body for TC-DR-018 / TC-INT-006
├── test_suite_doctors.sql       -- utPLSQL suite: doctors unit tests
├── test_suite_appointments.sql  -- utPLSQL suite: appointments unit tests
├── test_suite_integration.sql   -- utPLSQL suite: cross-entity integration tests
└── test_manual/
    ├── tc_dr_001.sql            -- manual PASS/FAIL blocks (no utPLSQL required)
    └── ...
```

### 8.3 Suite Skeleton — `test_suite_doctors.sql`

The suite package must follow this structure (implementation bodies are separate deliverable):

```sql
CREATE OR REPLACE PACKAGE test_suite_doctors AS
    --%suite(Doctors TAPI)
    --%suitepath(espresql.tapi)

    -- Runs before each test: ensures a clean doctors table and known specialties
    --%beforeeach
    PROCEDURE setup;

    -- Runs after each test: verifies no orphan rows left; rolls back if needed
    --%aftereach
    PROCEDURE teardown;

    --%test(TC-DR-001: Create doctor with valid data)
    PROCEDURE tc_dr_001_create_happy_path;

    --%test(TC-DR-005: Create with NULL name raises -20010)
    PROCEDURE tc_dr_005_null_name;

    --%test(TC-DR-010: Duplicate email raises -20015)
    PROCEDURE tc_dr_010_dup_email;

    --%test(TC-DR-012: Stale row_version raises -20001)
    PROCEDURE tc_dr_012_stale_version;

    --%test(TC-DR-018: After-hook failure rolls back DML)
    PROCEDURE tc_dr_018_atomicity;

    -- ... one procedure per TC-DR-nnn entry in Section 7.1

END test_suite_doctors;
/
```

### 8.4 Assertion Patterns

The following utPLSQL assertion patterns are the standard used across all suites:

```sql
-- Assert scalar equality
ut.expect(l_version).to_equal(2);

-- Assert row exists with expected values
ut.expect(l_row.name).to_equal('Mario Rossi');

-- Assert a specific Oracle error is raised
ut.expect(SQLCODE).to_equal(-20010);

-- Pattern for exception-testing (wrap in anonymous inner block):
DECLARE
    l_raised BOOLEAN := FALSE;
BEGIN
    BEGIN
        doctors_svc.create_doctor(p_name => NULL, p_email => 'a@b.com',
                                   x_id => l_id, x_version => l_ver);
    EXCEPTION
        WHEN OTHERS THEN
            l_raised := TRUE;
            ut.expect(SQLCODE).to_equal(-20010);
    END;
    ut.expect(l_raised).to_be_true();
END;

-- Assert audit log entry exists
DECLARE l_cnt PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO l_cnt FROM app_audit_log
     WHERE entity = 'DOCTORS' AND entity_id = l_id AND operation = 'INSERT';
    ut.expect(l_cnt).to_equal(1);
END;

-- Assert row is absent (after delete or rollback)
DECLARE l_cnt PLS_INTEGER;
BEGIN
    SELECT COUNT(*) INTO l_cnt FROM doctors WHERE id = l_id;
    ut.expect(l_cnt).to_equal(0);
END;
```

### 8.5 Failure-Injection Mechanism (TC-DR-018)

To test atomicity without modifying the production hooks body, the suite uses a swap mechanism:

```sql
-- In test_suite_doctors.setup (before TC-DR-018 only):
-- 1. Compile doctors_hooks_test_body.sql (after_insert raises -20099)
-- 2. Run the test: verify no doctor row, no audit row
-- 3. In teardown: recompile doctors_hooks_impl.sql (no-op body)
```

The test body file (`doctors_hooks_test_body.sql`) must raise `-20099` in `after_insert`. This code must not conflict with any real application error code — `-20099` is reserved for test injection by convention (see Section 5, error code registry).

### 8.6 Setup and Teardown Data

The `setup` procedure in each suite creates the minimum fixture data needed for the test. It must be idempotent (safe to run multiple times). The `teardown` procedure deletes only rows created during the test, identified by a test-run marker stored as a package variable.

Fixture pattern:

```sql
-- In suite package body (package-level variable)
g_test_run_id VARCHAR2(36) := SYS_GUID();

-- In setup: create a doctor whose email contains the run ID
-- This guarantees isolation between parallel test runs
l_email := 'test.' || g_test_run_id || '@example.com';
```

---

## 9. Reference Data (Seed)

The following specialties must be present before any test runs. These are created by `ref_data.sql`:

| `code` | `description` | `is_active` |
|---|---|---|
| `CARDIOLOGY` | Cardiology | Y |
| `NEUROLOGY` | Neurology | Y |
| `GENERALIST` | General Medicine | Y |
| `INACTIVE_SPEC` | Deprecated specialty used in validation tests | **N** |

`INACTIVE_SPEC` is deliberately inactive to support TC-DR-009 and TC-INT-004.

---

## 10. Installation Sequence

`install.sql` must run the scripts in this exact order to satisfy compile-time dependencies:

```
1.  DDL: specialties, doctors, appointments, app_audit_log
2.  Triggers: doctors_bi, doctors_bu, appointments_bi, appointments_bu
3.  app_errors (constants package — no dependencies)
4.  specialties_dal
5.  doctors_dal           (depends on specialties_dal for t_id type)
6.  doctors_hooks_spec    (depends on doctors_dal for t_id subtype)
7.  doctors_hooks_impl    (implements doctors_hooks spec — no-op body)
8.  doctors_svc           (depends on doctors_dal, doctors_hooks)
9.  appointments_dal      (depends on doctors_dal)
10. appointments_hooks_spec (depends on appointments_dal)
11. appointments_hooks_impl (no-op body)
12. appointments_svc      (depends on appointments_dal, appointments_hooks, doctors_dal)
13. ref_data.sql          (inserts specialties rows)
14. test_suite_doctors    (depends on doctors_svc, app_errors)
15. test_suite_appointments (depends on appointments_svc, app_errors)
16. test_suite_integration (depends on both SVC packages)
```

`uninstall.sql` runs the reverse: drop test suites, then SVC, then hooks, then DAL, then tables.

---

## 11. Acceptance Criteria

The implementation is accepted when:

1. `ut.run('espresql.tapi')` exits with zero failures and zero errors.
2. All 20 TC-DR scenarios pass.
3. All 14 TC-AP scenarios pass.
4. All 6 TC-INT scenarios pass.
5. TC-DR-018 and TC-INT-006 pass without requiring any change to `doctors_hooks_impl.sql` or `appointments_hooks_impl.sql` (atomicity is structural, not hook-dependent).
6. `install.sql` and `uninstall.sql` are idempotent: running them twice in sequence leaves the schema in the same state as running them once.
7. All packages compile without warnings under `ALTER SESSION SET PLSQL_WARNINGS = 'ENABLE:ALL'`.

---

## 12. Out of Scope

- **Performance tests**: load volume, response time, connection pool behaviour.
- **APEX page process integration tests**: APEX page rendering is not testable with utPLSQL. Section 7.1 of the architecture specification describes the APEX integration pattern; it is validated by manual acceptance testing on a running APEX instance.
- **ORDS endpoint tests**: HTTP-level testing (status codes, JSON schema validation) is handled by a separate Postman/Newman collection not covered in this specification.
- **Multi-schema grant testing**: grant correctness is validated by the deployment runbook, not by unit tests.
- **Concurrency simulation (TC-INT-003)**: true simultaneous session concurrency cannot be unit-tested with utPLSQL in a single session. TC-INT-003 tests the constraint mapping only — it is documented as a manual test to be performed with two SQL Developer connections.

---

## Revision History

| Version | Date       | Author             | Notes |
|---------|------------|--------------------|-------|
| 1.0     | 2026-04-26 | Roberto Capancioni | Initial specification |
