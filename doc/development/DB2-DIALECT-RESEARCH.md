# IBM Db2 Dialect — Feasibility Study & Specification

> Research document · ExpreSQL project · May 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [IBM Db2 Landscape](#2-ibm-db2-landscape)
3. [Market Analysis](#3-market-analysis)
4. [Commercial Opportunities](#4-commercial-opportunities)
5. [Competitive Landscape](#5-competitive-landscape)
6. [Technical Feasibility](#6-technical-feasibility)
7. [SWOT Analysis](#7-swot-analysis)
8. [Implementation Specification](#8-implementation-specification)
9. [Risks and Mitigations](#9-risks-and-mitigations)
10. [Recommendation](#10-recommendation)

---

## 1. Executive Summary

IBM Db2 is the seventh-ranked RDBMS globally by popularity (DB-Engines, 2025) and remains
deeply entrenched in financial services, government, and manufacturing — verticals where
database tooling investments are large and long-lived. No shorthand rapid-prototyping DDL
compiler exists for Db2; ExpreSQL would be the first.

The core DDL generation layer (Phase 1) is technically straightforward and maps cleanly onto
the existing `BaseGenerator` architecture. The TAPI procedural layer (Phase 2) requires
meaningful design work because Db2 has no concept of packages; a schema-based namespacing
strategy must substitute.

The commercial case is real but niche. The highest-value target is the IBM z/OS mainframe
ecosystem (banking, insurance, government) and the IBM i/AS400 installed base
(manufacturing, distribution). Both are underserved by modern developer tooling and have
large, sticky budgets.

**Recommendation: viable, medium-priority. Start with Phase 1 (DDL) as a proof-of-concept,
validate interest in the IBM partner ecosystem, then commit to Phase 2 only if traction
materialises.**

---

## 2. IBM Db2 Landscape

### 2.1 Editions

Db2 ships in three distinct editions that differ substantially at the SQL and procedural level:

| Edition | Platform | Procedural language | Key characteristics |
|---|---|---|---|
| **Db2 for LUW** | Linux, Unix, Windows | SQL PL | Primary target for new workloads; most Oracle-like |
| **Db2 for z/OS** | IBM mainframe | SQL PL + COBOL embedded SQL | Dominant in BFSI; "packages" are compiled SQL sets, not procedural units |
| **Db2 for i** | IBM i (AS/400) | SQL PL + RPG/CL | 100k+ installations; manufacturing and distribution |

An ExpreSQL dialect would initially target **Db2 for LUW** as the most accessible and
commercially relevant for new-project tooling, with z/OS and i/AS400 as follow-on targets.

### 2.2 Versioning

| Release | Year | Notable additions |
|---|---|---|
| Db2 10.5 (LUW) | 2013 | BLU Acceleration (columnar), temporal tables |
| Db2 11.1 (LUW) | 2016 | JSON support, `CREATE OR REPLACE` for most objects |
| Db2 11.5 (LUW) | 2019 | BOOLEAN native type, REST services, Python/R in-DB |
| Db2 12 (LUW, planned) | — | AI/vector extensions via IBM watsonx integration |

**Minimum viable target: Db2 11.1 LUW** — gives `CREATE OR REPLACE`, JSON, and broad SQL
compatibility. Db2 11.5+ for BOOLEAN and REST service generation.

### 2.3 Relationship to Oracle

Oracle and Db2 share a common ancestor (System R, IBM 1974). Their SQL dialects are
closer to each other than either is to PostgreSQL or SQL Server. The DDL surface maps
cleanly at ~85%. The main gaps are:

- **No `ROWNUM`** → `FETCH FIRST n ROWS ONLY` / `ROW_NUMBER() OVER()`
- **No `SYSDATE`** → `CURRENT DATE`, `CURRENT TIMESTAMP`
- **No `DUAL`** → `SYSIBM.SYSDUMMY1`
- **No `NVL`** → `COALESCE` (also valid in Oracle)
- **No Oracle packages** → schema-based namespacing (see §8.3)
- **No Oracle APEX** → `_apx` tier not applicable

---

## 3. Market Analysis

### 3.1 Database Rankings (DB-Engines, 2025)

```
#1  Oracle      (score ~1450)
#2  MySQL       (score ~1100)
#3  SQL Server  (score  ~900)
#4  PostgreSQL  (score  ~750)
#5  MongoDB     (score  ~450)
#6  Redis       (score  ~185)
#7  IBM Db2     (score  ~165)   ← target
#8  Elasticsearch
#9  SQLite
#10 MariaDB
```

Db2 trend: **slowly declining** in net-new workloads but **flat/stable** in enterprise
installed base. PostgreSQL is the primary beneficiary of displaced Db2 LUW workloads in
greenfield projects.

### 3.2 Installed Base by Vertical

| Vertical | Platform | Characteristics |
|---|---|---|
| **Banking / Insurance** | z/OS, LUW | Extremely sticky; 30–50 year deployment horizons; 70–80% of global transactional data flows through IBM mainframes |
| **Government / Public Sector** | z/OS, LUW | Long procurement cycles; high compliance requirements |
| **Healthcare** | LUW | EMR analytics; IBM Health Data Platform |
| **Manufacturing / Distribution** | IBM i | ~100k IBM i installations; RPG-to-SQL modernisation wave |
| **Telco** | LUW | Billing systems, OSS/BSS |
| **Retail** | LUW | IBM Store Solutions heritage |

### 3.3 Geographic Concentration

| Region | Strength |
|---|---|
| **North America** | Largest absolute installed base (BFSI + government) |
| **DACH** (Germany, Austria, Switzerland) | Strongest Db2 z/OS density in Europe |
| **Japan** | IBM mainframe dominant in banking |
| **Nordics** | Government and banking |
| **UK** | Financial services (City of London) |
| **Italy** | Moderate; banking sector (Intesa, UniCredit legacy systems) |

### 3.4 Cloud Trajectory

- **IBM Cloud Pak for Data**: Db2 as a managed service, increasingly used in hybrid-cloud
  enterprise deployments.
- **IBM Cloud Db2**: DBaaS offering comparable to Oracle Autonomous DB.
- **IBM watsonx.data**: Lakehouse with Db2 as a native connector; AI/vector workloads.
- IBM is actively migrating customers from on-prem Db2 LUW to IBM Cloud — new tooling that
  works both environments would align with this motion.

---

## 4. Commercial Opportunities

### 4.1 Tooling Gap

A direct comparison of the rapid-DDL-generation tooling market:

| Tool | Oracle | PostgreSQL | MySQL | SQL Server | Db2 |
|---|---|---|---|---|---|
| Oracle Quick SQL | ✓ | — | — | — | — |
| **ExpreSQL** | ✓ | planned? | — | — | **gap** |
| SchemaHero | — | ✓ | ✓ | ✓ | — |
| Liquibase | migration | migration | migration | migration | migration |
| dbt | transform | transform | transform | transform | — |
| IBM Data Studio | — | — | — | — | visual only |

**No shorthand rapid-prototyping DDL compiler exists for Db2.** ExpreSQL Db2 would be
the first and only entrant in this space.

### 4.2 IBM Partner Ecosystem

IBM operates a tiered partner programme (IBM PartnerPlus):
- **Silver**: basic co-marketing, IBM Cloud credits, marketplace listing
- **Gold / Platinum**: joint go-to-market, sales support, technical enablement

An ExpreSQL Db2 dialect enables:
1. **IBM Marketplace listing** — IBM Marketplace reaches 50k+ enterprise customers directly
2. **IBM Z Partner Community** — mainframe-focused ISV ecosystem
3. **IBM i Partner programme** — AS/400 modernisation wave is active
4. **IBM Cloud Pak for Data catalog** — integration point for hybrid-cloud data teams

### 4.3 Revenue Models

| Model | Description | Fit |
|---|---|---|
| **Open source + services** | Free dialect, paid support/customisation | Low barrier to adoption in IBM shops |
| **SaaS add-on** | Db2 dialect as premium feature in a hosted ExpreSQL SaaS | Requires SaaS wrapper first |
| **Consulting entry point** | Dialect as door-opener for schema design engagements | High margin if paired with IBM i/z modernisation projects |
| **OEM / white-label** | License to IBM SI partners (Kyndryl, Atos, Infosys) | Largest TAM but long sales cycles |

### 4.4 Complementarity with Oracle Work

Many large enterprises run **both Oracle and Db2** (often Oracle for OLTP, Db2 for
mainframe-side batch). An ExpreSQL that speaks both dialects is a single tool for
multi-database schema design teams — a differentiated positioning no competitor currently
occupies.

---

## 5. Competitive Landscape

### 5.1 Direct Competitors

None at the shorthand-compiler level. Closest alternatives a Db2 developer currently uses:

- **IBM Data Studio** (free, Eclipse-based): visual ER design, no shorthand input
- **DBeaver** (open source): universal IDE, purely manual DDL editing
- **Toad for IBM Db2** (Quest, paid): development IDE, no code generation from shorthand
- **DbSchema** (paid): visual designer with reverse-engineering

All are visual or manual tools. The shorthand-first, "type 10 words get 200 lines of DDL"
paradigm is entirely absent from the Db2 tooling ecosystem.

### 5.2 Adjacent Threats

- **PostgreSQL dialect (ExpreSQL's own roadmap)**: PostgreSQL is capturing most new
  workloads that would otherwise go to Db2 LUW. If ExpreSQL ships PostgreSQL first and
  it gains traction, Db2 becomes less urgent.
- **AI code generation (GitHub Copilot, etc.)**: LLMs can generate Db2 DDL from natural
  language. However, they cannot enforce architectural patterns (TAPI tiers, audit chains,
  ERD consistency) without a structured compiler layer — ExpreSQL remains relevant.

---

## 6. Technical Feasibility

### 6.1 Architecture Fit

The ExpreSQL multi-dialect architecture is explicitly designed for this:

```
src/compiler/factory.ts  →  registerGenerator('db2', () => new Db2DDLGenerator(ctx))
src/db2/
  generator.ts           ←  extends BaseGenerator
  types.ts               ←  SemanticType → Db2 SQL type mapping
  plsql.ts               ←  SQL PL stored procedure generation
```

`BaseGenerator` already handles: ERD generation, sample data, FK resolution, audit
columns, node tree traversal. A Db2 generator inherits all of this and overrides only
the dialect-specific parts.

### 6.2 Type Mapping

| QSQL semantic type | Oracle | Db2 LUW |
|---|---|---|
| `varchar(n)` | `VARCHAR2(n)` | `VARCHAR(n)` |
| `integer` | `NUMBER` | `INTEGER` |
| `number(p,s)` | `NUMBER(p,s)` | `DECIMAL(p,s)` |
| `float` | `FLOAT` | `DOUBLE` |
| `date` | `DATE` | `DATE` |
| `timestamp` | `TIMESTAMP` | `TIMESTAMP` |
| `clob` | `CLOB` | `CLOB` |
| `blob` | `BLOB` | `BLOB` |
| `boolean` | `CHAR(1) CHECK IN ('Y','N')` | `BOOLEAN` (11.5+) |
| `json` | `JSON` (21c+) | `JSON` (11.5+) or `CLOB` |
| `xml` | `XMLTYPE` | `XML` |
| `vector(n)` | `VECTOR(n, FLOAT32)` | `VECTOR(n)` (12+ / watsonx) |

### 6.3 DDL Generation Differences

#### Identity / Sequences

Oracle:
```sql
id  NUMBER  GENERATED ALWAYS AS IDENTITY
```

Db2:
```sql
id  INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1)
```

Both map from the same QSQL `/pk` or default PK semantics.

#### Temporal metadata

Oracle uses `SYSDATE`, Db2 uses `CURRENT TIMESTAMP`:

```sql
-- Oracle
created_on  DATE  DEFAULT SYSDATE  NOT NULL

-- Db2
created_on  TIMESTAMP  DEFAULT CURRENT TIMESTAMP  NOT NULL
```

#### Constraints and indexes

Syntax is nearly identical. `CREATE UNIQUE INDEX`, `CREATE INDEX`, inline `CONSTRAINT`
clauses — all translate directly.

#### Views

Standard SQL views translate without change. **Duality views are Oracle-specific** and have
no Db2 equivalent; that generator path is skipped for the Db2 dialect.

### 6.4 TAPI Tier System — The Key Design Challenge

Oracle packages provide: namespacing, type definitions, spec/body separation, private
state. **Db2 LUW has no package construct.**

The adaptation strategy is **schema-based namespacing**:

```sql
-- Oracle
CREATE OR REPLACE PACKAGE employees_dal AS
    FUNCTION  p_get_by_id(p_id IN employees.id%TYPE) RETURN employees%ROWTYPE;
    PROCEDURE p_insert_row(...);
END employees_dal;

-- Db2 equivalent
CREATE SCHEMA employees_dal;

CREATE OR REPLACE PROCEDURE employees_dal.p_get_by_id (
    IN  p_id     INTEGER,
    OUT p_result VARCHAR(32000)   -- JSON row, or use CURSOR
)
LANGUAGE SQL
BEGIN
    -- body
END;
```

Each TAPI "package" becomes a **schema containing stored procedures**:

| Oracle package | Db2 schema | Notes |
|---|---|---|
| `employees_dal` | schema `employees_dal` | All DAL procedures in one schema |
| `employees_svc` | schema `employees_svc` | Service layer |
| `employees_apx` | _(not generated)_ | APEX is Oracle-specific |
| `employees_rst` | schema `employees_rst` | Db2 REST Service compatible |

**Type aliases** (`t_row`, `t_id`) have no Db2 equivalent at the schema level. Options:
- Use explicit column types inline (`INTEGER`, `VARCHAR(255)`)
- Db2 11.5+ `CREATE TYPE employees_dal.t_id AS INTEGER` (distinct type) — verbose but
  faithful to the TAPI contract

**Degradation rules** (SVC absorbs absent DAL as private procedures, etc.) apply
unchanged — the schema-based layout still supports the same tier hierarchy.

### 6.5 `ifc` Setting Adaptation

| ifc value | Oracle | Db2 |
|---|---|---|
| `apex` | APEX `_apx` handler package | _(not applicable)_ |
| `rest` | ORDS `_rst` package | IBM Db2 REST Service procedures |
| `both` | both | REST only |

Db2 11.5+ introduced a built-in REST service layer (similar in concept to ORDS). A Db2
`_rst` schema would generate procedures annotated for Db2 REST — a reduced but real
equivalent.

### 6.6 Audit Log

The `/auditlog` directive generates a `_aud` package in Oracle. In Db2:
- No packages — same schema strategy as TAPI
- `CURRENT TIMESTAMP` instead of `SYSDATE`
- `CURRENT USER` instead of `SYS_CONTEXT('USERENV','SESSION_USER')` for the `modified_by`

The structural pattern is identical; only the system function calls differ.

### 6.7 Effort Estimate

| Phase | Scope | Estimated effort |
|---|---|---|
| **Phase 1: Core DDL** | Type mapping, tables, constraints, indexes, sequences, views, ERD | 3–4 weeks |
| **Phase 2: SQL PL TAPI** | Schema-based _dal/_svc/_rst, all 6 tiers, degradation rules | 5–7 weeks |
| **Phase 3: Diff/Migration** | `ALTER TABLE` for Db2 dialect | 2–3 weeks |
| **Phase 4: IBM i / z/OS** | Platform-specific DDL variants | 4–6 weeks (optional) |

Phase 1 alone is a shippable, useful product. Phase 2 makes it genuinely differentiated.

---

## 7. SWOT Analysis

### Strengths

| # | Strength | Evidence |
|---|---|---|
| S1 | **Multi-dialect architecture already built** | `factory.ts` + `BaseGenerator` — adding a dialect is structurally defined |
| S2 | **Oracle experience reduces learning curve** | Db2 and Oracle share ~85% DDL syntax; type mapping is largely known |
| S3 | **No competitor in the shorthand-compiler niche** | Survey of Db2 tooling shows zero shorthand-first tools |
| S4 | **TAPI architecture is portable** | Schema-based namespacing faithfully mirrors the tier hierarchy |
| S5 | **ERD generation is dialect-agnostic** | BaseGenerator ERD works immediately for Db2 |

### Weaknesses

| # | Weakness | Impact |
|---|---|---|
| W1 | **No Db2 packages** | TAPI tier system needs significant redesign (schema strategy) |
| W2 | **Oracle APEX irrelevant** | `_apx` tier produces no output; `ifc: apex` is a no-op |
| W3 | **Three incompatible editions** | LUW, z/OS, IBM i each differ — a single dialect may mislead users |
| W4 | **Test infrastructure** | Requires a Db2 instance (Docker image available but adds CI overhead) |
| W5 | **Limited organic community** | ExpreSQL is currently Oracle-centric; attracting Db2 users needs outreach |

### Opportunities

| # | Opportunity | Probability | Impact |
|---|---|---|---|
| O1 | **IBM PartnerPlus entry** | Medium | High — IBM partner reach is large |
| O2 | **IBM i modernisation wave** | High | Medium — RPG-to-SQL migration is active 2024–2027 |
| O3 | **IBM watsonx + vector columns** | Medium | Medium — AI workloads on Db2 growing |
| O4 | **Multi-dialect enterprise customers** | High | High — Oracle+Db2 coexistence is common in BFSI |
| O5 | **Mainframe schema tooling gap** | High | High — no modern rapid-DDL tool exists for z/OS |
| O6 | **IBM Cloud Pak for Data catalog** | Low-Medium | High — significant distribution if listed |

### Threats

| # | Threat | Probability | Impact |
|---|---|---|---|
| T1 | **PostgreSQL displacing Db2 LUW** | High | Medium — reduces long-term TAM for LUW target |
| T2 | **AI code generation commoditising DDL** | Medium | Low-Medium — structured patterns remain valuable |
| T3 | **Edition fragmentation confuses users** | Medium | Medium — unclear which "Db2" is targeted |
| T4 | **IBM strategic pivots** | Low | High — IBM could deprecate Db2 LUW in favour of cloud services |
| T5 | **Low community traction without marketing** | High | Medium — without IBM co-marketing, discovery is slow |

---

## 8. Implementation Specification

### 8.1 File Structure

```
src/db2/
  generator.ts        # Db2DDLGenerator extends BaseGenerator
  types.ts            # SemanticType → Db2 SQL type
  plsql.ts            # SQL PL TAPI builder (schema strategy)
  reserved-words.ts   # Db2 reserved word list
```

Register in `src/compiler/factory.ts`:

```typescript
import { Db2DDLGenerator } from '../db2/generator';
registerGenerator('db2', (ctx) => new Db2DDLGenerator(ctx));
```

Invoke via CLI or API:

```bash
node bin/index.js --dialect db2 schema.qsql
# or in settings block:
# settings = {"dialect": "db2"}
```

### 8.2 Type Mapping (`src/db2/types.ts`)

```typescript
export function db2ColType(sem: SemanticType): string {
    switch (sem.base) {
        case 'varchar':  return `VARCHAR(${sem.varcharLength ?? 255})`;
        case 'integer':  return 'INTEGER';
        case 'number':
            if (sem.numericSpec) return `DECIMAL(${sem.numericSpec.precision},${sem.numericSpec.scale})`;
            return 'DECIMAL(15,2)';
        case 'float':    return 'DOUBLE';
        case 'date':     return 'DATE';
        case 'timestamp':return 'TIMESTAMP';
        case 'boolean':  return 'BOOLEAN';          // Db2 11.5+
        case 'clob':     return 'CLOB';
        case 'blob':     return 'BLOB';
        case 'json':     return 'JSON';             // 11.5+; fallback: CLOB
        case 'xml':      return 'XML';
        case 'vector':
            return sem.vectorSpec ? `VECTOR(${sem.vectorSpec.dimensions})` : 'VECTOR(1536)';
        default:         return 'VARCHAR(255)';
    }
}
```

### 8.3 DDL Generation (`src/db2/generator.ts`)

Key overrides from `BaseGenerator`:

```typescript
export class Db2DDLGenerator extends BaseGenerator {

    colType(sem: SemanticType): string {
        return db2ColType(sem);
    }

    protected pkDefinition(node: IDdlNode): string {
        return `id  INTEGER  GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1)`;
    }

    protected sysTimestamp(): string { return 'CURRENT TIMESTAMP'; }
    protected sysUser(): string      { return 'CURRENT USER'; }
    protected sysDate(): string      { return 'CURRENT DATE'; }

    generateDDL(node: IDdlNode): string {
        // emit CREATE TABLE, constraints, indexes
        // no duality views, no XMLTYPE special handling
    }

    generateDrop(node: IDdlNode): string {
        return `DROP TABLE IF EXISTS ${node.tableName} CASCADE;\n`;
    }

    generateFullDDL(): string {
        // iterate forest, call generateDDL for each table node
        // emit sequences, views, TAPI if /api present
    }
}
```

### 8.4 TAPI — Schema Strategy

For a table `employees` with `/api full+hks`:

```sql
-- Schema declarations
CREATE SCHEMA employees_dal;
CREATE SCHEMA employees_hks;
CREATE SCHEMA employees_svc;
CREATE SCHEMA employees_rst;   -- if ifc includes rest

-- DAL procedures
CREATE OR REPLACE PROCEDURE employees_dal.p_get_by_id (
    IN  p_id       INTEGER,
    OUT p_row_json VARCHAR(32000)
)
LANGUAGE SQL
BEGIN
    -- implementation
END@

CREATE OR REPLACE PROCEDURE employees_dal.p_insert_row (
    IN p_first_name  VARCHAR(255),
    -- ... all columns
    OUT p_id         INTEGER
)
LANGUAGE SQL
BEGIN
    INSERT INTO employees (...) VALUES (...);
    SET p_id = IDENTITY_VAL_LOCAL();
END@

-- (p_update_row, p_delete_row, p_lock_row follow same pattern)

-- HKS stubs
CREATE OR REPLACE PROCEDURE employees_hks.p_validate (
    IN p_action   VARCHAR(10),
    IN p_row_json VARCHAR(32000)
)
LANGUAGE SQL
BEGIN
    -- stub: add validation logic here
END@

-- SVC facade
CREATE OR REPLACE PROCEDURE employees_svc.ins (
    IN p_first_name  VARCHAR(255),
    -- ...
    OUT p_id         INTEGER,
    OUT p_status     VARCHAR(20)
)
LANGUAGE SQL
BEGIN
    CALL employees_hks.p_validate('INSERT', ...);
    CALL employees_dal.p_insert_row(p_first_name, ..., p_id);
    SET p_status = 'SUCCESS';
END@
```

### 8.5 Tier Degradation Rules (unchanged semantics)

The same degradation logic as Oracle applies:
- **`service` tier**: SVC schema absorbs private DML procedures (no DAL schema created)
- **`lookup` tier**: read-only, no DML procedures
- **`+hks` variants**: HKS schema with validate/before/after hook stubs
- Without `+hks`: hook calls are omitted from SVC body

### 8.6 Db2 REST Service (`_rst` equivalent)

Db2 11.5+ REST services are defined via `WLM_SET_CLIENT_INFO` and `SYSTOOLS.HTTP_*` — a
different binding model from ORDS. The `_rst` schema for Db2 would generate procedures
callable via the Db2 REST service endpoint with JSON input/output:

```sql
CREATE OR REPLACE PROCEDURE employees_rst.get_by_id (
    IN  p_id     INTEGER,
    OUT p_result VARCHAR(32000)
)
LANGUAGE SQL
BEGIN
    DECLARE v_json VARCHAR(32000);
    SELECT JSON_OBJECT(
        'id'         : id,
        'first_name' : first_name,
        -- ...
    ) INTO v_result
    FROM employees
    WHERE id = p_id;
    SET p_result = v_result;
END@
```

### 8.7 Test Infrastructure

```bash
# Db2 LUW via Docker (IBM provides official image)
docker pull icr.io/db2_community/db2
docker run -d --name db2 \
  -e DB2INST1_PASSWORD=password -e DBNAME=testdb \
  -p 50000:50000 \
  icr.io/db2_community/db2

# Test file convention (mirror Oracle tests)
test/integration/db2-small.test.ts
test/integration/db2-tapi.test.ts
```

Vitest test pattern:

```typescript
import { toDDL } from '../../src/ddl';

test('Db2: basic table DDL', () => {
    const out = toDDL('employees\n  first_name\n  last_name', { dialect: 'db2' });
    expect(out).toContain('CREATE TABLE employees');
    expect(out).toContain('VARCHAR(');           // not VARCHAR2
    expect(out).toContain('GENERATED ALWAYS AS IDENTITY');
    expect(out).not.toContain('VARCHAR2');
    expect(out).not.toContain('SYSDATE');
});
```

---

## 9. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **z/OS SQL dialect incompatibilities discovered late** | Medium | Clearly scope Phase 1 as LUW-only; gate z/OS behind a sub-dialect flag (`db2:zos`) |
| **Schema-based TAPI confuses Oracle users** | Medium | Document clearly that Db2 has no packages; generate a README per schema group |
| **IBM Marketplace approval process slow** | High | Start partner application in parallel with Phase 1 development |
| **Db2 Docker CI flakiness** | Medium | Use Db2 community edition; fall back to syntax-only tests (no live execution) if CI is unstable |
| **BOOLEAN / JSON only in 11.5+** | Low | Emit `-- requires Db2 11.5+` comment; provide fallback types via a `db2-compat` option |

---

## 10. Recommendation

### Should we build it?

**Yes, but phased and validated.**

The technical path is clear and well-contained within the existing architecture. The market
gap is real — no shorthand DDL compiler exists for Db2. The highest-value verticals
(BFSI mainframe, IBM i manufacturing) are underserved and budget-rich.

### Suggested sequence

1. **Phase 1 (DDL only, ~3–4 weeks)**: Build `src/db2/generator.ts` + `src/db2/types.ts`.
   Produce correct `CREATE TABLE`, constraints, sequences, views, ERD for Db2 LUW 11.1+.
   Publish as a minor ExpreSQL release. Solicit feedback from IBM partner community.

2. **Validate demand** (2–4 weeks): Share Phase 1 at IBM developer forums, Db2 community
   Slack (Db2z Open Community), IBM PartnerPlus outreach. If traction > N downloads/stars
   or a commercial inquiry arrives, proceed.

3. **Phase 2 (SQL PL TAPI, ~5–7 weeks)**: Schema-based TAPI tier system. This is the
   differentiator — no other tool does this for Db2.

4. **Phase 3 (diff/migration, ~2–3 weeks)**: Only if Phase 2 users request it.

5. **Phase 4 (IBM i / z/OS, ~4–6 weeks)**: Only on explicit customer demand; the
   platform-specific differences justify a separate sub-dialect (`db2:i`, `db2:zos`).

### What to do first this week

1. Open a GitHub issue: _"RFC: IBM Db2 dialect"_ — gauge community interest
2. Create `src/db2/types.ts` with the type mapping table from §8.2
3. Create `src/db2/generator.ts` as a stub extending `BaseGenerator`
4. Add one integration test: a three-table QSQL input producing valid Db2 11.1 DDL

The first passing test will confirm the architecture accommodates the dialect without
surprises, and the RFC will tell you whether to invest in Phase 2.

---

*Last updated: 2026-05-08*
