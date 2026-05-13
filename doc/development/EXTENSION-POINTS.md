# ExpreSQL — Extension Points

**Status**: Active  
**Version**: 1.2  
**Author**: Roberto Capancioni — Radicle s.r.l.  
**Date**: 2026-05-05  

---

## Purpose

This document defines the extension points for the ExpreSQL platform. EX-1 is implemented and stable. EX-2 onwards are planned — titles and intent only, no implementation contract yet.

---

## Architecture Overview

```
┌───────────────────────────────────────┐
│  Tier 1 — TypeScript Engine (dist/)   │
│  registerGenerator() / BaseGenerator  │
└────────────────┬──────────────────────┘
                 │ JSON / DDL strings
┌────────────────▼──────────────────────┐
│  Tier 2 — Oracle MLE Module           │
│  QUICKSQL_PKG (PL/SQL façade)         │
│  QUICKSQL_SCHEMA_PKG (schema mgmt)    │
└────────────────┬──────────────────────┘
                 │ ORDS REST + SQL
┌────────────────▼──────────────────────┐
│  Tier 3 — APEX Application            │
│  QSQL Editor Plugin / ERD Viewer      │
└───────────────────────────────────────┘
```

---

## EX-1 — Multi-Dialect Generator Registration

**Tier**: TypeScript Engine  
**Stability**: Stable (v2.0.0 public API)

### Source Directory Structure

Database-specific code lives in its own subdirectory under `src/`:

```
src/
├── oracle/                  ← Oracle-specific implementation
│   ├── generator.ts         ← OracleDDLGenerator (extends BaseGenerator)
│   ├── types.ts             ← toOracleType, isDb23, oraclePkTypeModifier
│   ├── view.ts              ← OracleViewBuilder
│   ├── plsql.ts             ← OraclePlsqlBuilder (triggers, TAPI)
│   ├── reserved_words.ts    ← Oracle reserved word list
│   └── index.ts             ← barrel re-export for Oracle symbols
├── <dialect>/               ← future: one folder per dialect
│   └── generator.ts
├── base-generator.ts        ← abstract base class (dialect-agnostic)
├── factory.ts               ← registerGenerator / createGenerator
├── tree.ts                  ← generic barrel (parser, BaseGenerator, factory, DdlNode)
└── (other generic files)
```

Adding a new dialect means creating `src/<dialect>/generator.ts`, extending `BaseGenerator`, and calling `registerGenerator()`.

### Contract

```typescript
// factory.ts
type GeneratorFactory = (ctx: DdlContext) => DDLGenerator;

function registerGenerator(dialect: string, factory: GeneratorFactory): void;
function createGenerator(ctx: DdlContext): DDLGenerator;
```

### How It Works

`createGenerator()` reads `ctx.getOptionValue('dialect')` and dispatches to the matching factory. The `oracle` factory is pre-registered at module load. Any code that calls `registerGenerator()` before calling `toDDL()` / `toERD()` installs a new dialect transparently.

### Implementation Template

```typescript
// src/postgres/generator.ts
import { BaseGenerator, registerGenerator } from '@oracle/expresql';
import type { DdlContext, SemanticType, IDdlNode } from '@oracle/expresql';

class PostgresDDLGenerator extends BaseGenerator {
    colType(sem: SemanticType): string {
        switch (sem.base) {
            case 'varchar':  return `VARCHAR(${sem.varcharLen ?? 4000})`;
            case 'number':   return sem.numericSpec ? `NUMERIC(${sem.numericSpec})` : 'NUMERIC';
            case 'date':     return 'TIMESTAMPTZ';
            case 'clob':     return 'TEXT';
            case 'blob':     return 'BYTEA';
            case 'boolean':  return 'BOOLEAN';
            case 'json':     return 'JSONB';
            default:         return 'TEXT';
        }
    }
    generateDDL(node: IDdlNode): string { /* ... */ return ''; }
    generateDrop(node: IDdlNode): string { /* ... */ return ''; }
    generateFullDDL(): string { /* ... */ return ''; }
}

registerGenerator('postgres', ctx => new PostgresDDLGenerator(ctx));
```

### Constraints

- Dialect names must be lowercase alphanumeric + hyphens. No spaces.
- A second call with the same dialect name silently replaces the previous factory.
- `BaseGenerator.generateERD()` and `BaseGenerator.generateData()` are dialect-agnostic and inherited for free.

---

## Planned Extensions

The following extension points are intended but not yet designed. No implementation contract exists.

| ID    | Name                           | Tier                    | Brief intent                                                  |
|-------|--------------------------------|-------------------------|---------------------------------------------------------------|
| EX-2  | Lifecycle Hooks                | Oracle DB (PL/SQL)      | BEFORE/AFTER events on generate, deploy, save, promote        |
| EX-3  | Pluggable Validators           | Oracle DB (PL/SQL)      | DB-side governance rules (naming, PII, FK existence)          |
| EX-4  | Alternative ERD Renderers      | APEX / JavaScript       | Swap AntV X6 for Mermaid, Graphviz, LucidChart               |
| EX-5  | ERD Thumbnail Storage          | Oracle DB + APEX        | SVG thumbnail alongside definition row; gallery/preview view  |
| EX-6  | Schema Dependency Tracking     | Oracle DB               | Cross-definition FK deps; topological deploy order            |
| EX-7  | Multi-Environment Promotion    | Oracle DB + ORDS        | DEV → TEST → PROD with audit trail and rollback               |
| EX-8  | Approval Workflow              | Oracle DB + APEX        | Approval gate before deployment to protected environments     |
| EX-9  | CI/CD SQLcl Integration        | DevOps / External       | REST endpoints for pipeline-driven generation and deployment  |
| EX-10 | Pluggable Diff / Migration     | TypeScript + Oracle DB  | Delta computation between deployed and target schema          |

---

## Revision History

| Version | Date       | Author              | Notes                                                              |
|---------|------------|---------------------|--------------------------------------------------------------------|
| 1.0     | 2026-04-24 | Roberto Capancioni  | Initial specification draft                                        |
| 1.1     | 2026-05-05 | Roberto Capancioni  | EX-1: added source directory structure (oracle/ subfolder)         |
| 1.2     | 2026-05-05 | Roberto Capancioni  | Replaced EX-2→EX-10 detail with planned-extensions summary table   |
