# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExpreSQL is an ESQL shorthand-to-DDL compiler. It takes indentation-based shorthand and produces relational DDL, ERD metadata, and PL/SQL scaffolding. Forked from Oracle's Quick SQL, rewritten in TypeScript with a multi-dialect architecture.

## Active plan — read this first

`tapi-ext` is the only branch going forward. `main` (and `origin/main`) diverged from the same fork point (`2de4d31`, 2026-05-07) and accumulated ~2 months of independent work (multi-tenant redesign, `ifc: rest`, `dimensioncolumns` row-level scope, and more) that never got merged here — and, verified live, cannot be cleanly merged (the two branches rewrote the same generator functions for incompatible reasons). That work is being **rebuilt from scratch on top of `tapi-ext`**, using `main`'s commits as a reference for *what* to achieve, not as something to cherry-pick or merge.

**Start here**: `doc/development/TAPI-EXT-MAIN-UNIFICATION-PLAN.md` — the full task list, in order, with the reasoning behind each one and the tier-system design decisions each task needs to make explicit (this branch's `full+hks`/`full`/`service(+hks)`/`lookup(+hks)` tiers didn't exist when the corresponding feature was first built on `main`, so each port has to decide how the feature behaves on every tier, not just the default one). Task 0 in that plan (fix the 17 failing `regression.test.ts` fixtures) must be green before starting anything else. See also `doc/development/TAPI-LAYERED-ARCHITECTURE.md` for the tier system itself.

## Commands

```bash
# Build (DDL + MLE)
npm run build

# Build individual targets
npm run build:ddl          # Vite build for DDL library (all dialects)
npm run build:mle          # Generate MLE SQL modules

# Tests
npm test                   # Legacy JS regression test runner
npm run test:ts            # Vitest TypeScript tests (preferred)
npm run test:ts:watch      # Vitest watch mode

# Run a single test file
npx vitest run test/unit/lexer.test.ts
npx vitest run test/integration/small.test.ts

# Lint
npm run lint               # All lint tasks
npm run lint:markdown      # Markdown files only

# CLI usage
node bin/index.js <file.esql or file.json>
```

## Architecture

4-stage compiler pipeline:

1. **Lexer** (`src/compiler/lexer.ts`) — raw string → `LexerToken[]` with pre-computed `lowerValue`
2. **Parser** (`src/compiler/parser.ts`) — indentation-aware token stream → `DdlNode[]` tree
3. **Semantic analysis** (`src/compiler/node.ts`) — nodes self-infer types via `inferType()` / `getSemanticType()` → dialect-agnostic `SemanticType`
4. **Generation** — dialect-specific generators traverse the tree to produce DDL output

### Generator pattern

- `BaseGenerator` (`src/compiler/base-generator.ts`) — abstract class with shared logic (ERD generation, sample data, FK resolution). Subclasses implement `colType()`, `generateDDL()`, `generateDrop()`, `generateFullDDL()`.
- `src/compiler/factory.ts` — registry/dispatch: `registerGenerator(dialect, factory)` / `createGenerator(ctx)`. Defaults to `'oracle'`.
- Oracle implementation in `src/oracle/`: `OracleDDLGenerator` orchestrates, delegating to `OracleViewBuilder` (views, duality views) and `OraclePlsqlBuilder` (triggers, ORDS, TAPI packages).

### Core contracts (`src/compiler/types.ts`)

- **`IDdlNode`** — public node interface (properties, tree navigation, directives)
- **`SemanticType`** — database-agnostic column descriptor (base type, varchar length, numeric spec, vector spec)
- **`DDLGenerator`** — interface: `generateFullDDL()`, `generateERD()`
- **`DdlContext`** — shared state (options, forest, errors)

### Main entry point

`src/ddl.ts` — exports `expresql` class with `toDDL()`, `toERD()`, `fromJSON()`. The `toDDL` convenience function combines lexing, parsing, and generation.

## Key Directories

- `src/compiler/` — Core pipeline: lexer, parser, node semantics, base generator, factory, types
- `src/utils/` — Utilities: naming, error messages, sample data, string splitting, translation, JSON-to-ESQL
- `src/oracle/` — Oracle-specific: type mapping, views, PL/SQL, diff/migration generation, reserved words
- `src/db2/` — Db2-specific: type mapping, PL/SQL, TAPI packages
- `web/` — Browser UI (vanilla JS) with AntV X6 ERD visualization
- `mle/` — Oracle MLE (Multilingual Engine) SQL installation scripts
- `test/unit/` — Vitest unit tests
- `test/integration/` — Vitest integration tests
- `test/apex/`, `test/bugs/`, `test/JSON/`, `test/star/` — `.esql` test fixtures with expected `.sql` output

## Build System

Vite builds three separate libraries controlled by `TARGET_LIBRARY` env var:
- **DDL**: entry `src/ddl.ts` → `dist/expresql.js` (core + all dialects)
- **DDL-ORACLE**: entry `src/ddl-oracle.ts` → `dist/expresql-oracle.js`
- **DDL-DB2**: entry `src/ddl-db2.ts` → `dist/expresql-db2.js`

## Testing Conventions

- Vitest tests use `toDDL()` / `expresql` class, assert on output strings with `toContain()` / `toMatch()`
- Call `resetSeed()` in `beforeEach` for deterministic sample data
- Legacy JS regression tests (`npm test`) compare output against `.sql` baselines in `test/` fixture dirs
- Both test suites must pass: `npm test` (legacy) and `npm run test:ts` (vitest)

## Adding a New Dialect

1. Create `src/<dialect>/generator.ts` extending `BaseGenerator`
2. Implement abstract hooks: `colType()`, `generateDDL()`, `generateDrop()`, `generateFullDDL()`
3. Register in `src/compiler/factory.ts` via `registerGenerator('<dialect>', factoryFn)`
