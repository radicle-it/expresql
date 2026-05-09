# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExpreSQL is a EspreSQL (QSQL) shorthand-to-DDL compiler. It takes indentation-based shorthand and produces relational DDL, ERD metadata, and PL/SQL scaffolding. Forked from Oracle's EspreSQL, rewritten in TypeScript with a multi-dialect architecture.

## Commands

```bash
# Build (DDL + ERD + MLE)
npm run build

# Build individual targets
npm run build:ddl          # Vite build for DDL library
npm run build:erd          # Vite build for ERD library
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

`src/ddl.ts` — exports `espresql` class with `toDDL()`, `toERD()`, `fromJSON()`. The `toDDL` convenience function combines lexing, parsing, and generation.

## Key Directories

- `src/compiler/` — Core pipeline: lexer, parser, node semantics, base generator, factory, types
- `src/utils/` — Utilities: naming, error messages, sample data, string splitting, translation, JSON-to-QSQL
- `src/oracle/` — Oracle-specific: type mapping, views, PL/SQL, diff/migration generation, reserved words
- `src/quick-erd/` — ERD visualization (JavaScript, not TypeScript). AntV X6 and Mermaid renderers.
- `web/` — Browser UI (vanilla JS)
- `mle/` — Oracle MLE (Multilingual Engine) SQL installation scripts
- `test/unit/` — Vitest unit tests
- `test/integration/` — Vitest integration tests
- `test/apex/`, `test/bugs/`, `test/JSON/`, `test/star/` — `.esql` test fixtures with expected `.sql` output

## Build System

Vite builds two separate libraries controlled by `TARGET_LIBRARY` env var:
- **DDL**: entry `src/ddl.ts` → `dist/espresql.js`
- **ERD**: entry `src/quick-erd/quick-erd.js` → `dist/quick-erd.js`

A custom Vite plugin redirects legacy `./legacy/xxx.js` imports to `src/xxx.ts` files.

## Testing Conventions

- Vitest tests use `toDDL()` / `espresql` class, assert on output strings with `toContain()` / `toMatch()`
- Call `resetSeed()` in `beforeEach` for deterministic sample data
- Legacy `.js` regression tests compare token-by-token output against `.sql` baselines
- Both test suites must pass: `npm test` (legacy) and `npm run test:ts` (vitest)

## Adding a New Dialect

1. Create `src/<dialect>/generator.ts` extending `BaseGenerator`
2. Implement abstract hooks: `colType()`, `generateDDL()`, `generateDrop()`, `generateFullDDL()`
3. Register in `src/compiler/factory.ts` via `registerGenerator('<dialect>', factoryFn)`
