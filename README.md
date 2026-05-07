# ExpreSQL <!-- omit in toc -->

> ExpreSQL is a fork of [Oracle's Quick SQL](https://github.com/oracle/quicksql),
> released under the Universal Permissive License v1.0. The original copyright
> and license remain in [`LICENSE.txt`](./LICENSE.txt). The "Quick SQL"
> shorthand syntax referenced throughout this documentation is the input
> language defined by the original project.

## Install

```bash
npm install @radicle-it/expresql
```

## Command Line Usage

```bash
npx @radicle-it/expresql test/apex/department_employees.qsql > output.sql
```

---

This is a technical summary of the **QuickSQL TypeScript Refactoring**, designed for developers who wish to maintain or extend the engine.

Version History
---------------

| Version | Date       | Author                              | Notes |
|---------|------------|-------------------------------------|-------|
| 2.0.0   | 2026-04-24 | Roberto Capancioni — Radicle s.r.l. | Major refactoring: multi-dialect architecture, `BaseGenerator` abstract class, factory/registry pattern, Oracle split into `OracleViewBuilder` / `OraclePlsqlBuilder` / `oracle-types.ts`, full TypeScript strict typing, `IDdlNode` interface |
| 1.3.14  | —          | Oracle Corporation                  | Last monolithic release |

Contributors
------------

*   **Oracle Corporation** — original QuickSQL engine and QSQL shorthand specification.
*   **Roberto Capancioni, Radicle s.r.l.** — TypeScript refactoring (v2.0.0): decoupled pipeline architecture, multi-dialect generator framework, PL/SQL builder modules, strict type interfaces.

try [**index.html**](https://rcapancioni-radicle.github.io/quicksql)

QuickSQL TypeScript Architecture Overview
=========================================

The project has been refactored from a monolithic JavaScript structure into a **decoupled, type-safe, multi-dialect architecture** following a "Compiler Frontend + Strategy" pattern. The system translates Shorthand Syntax (QSQL) into relational DDL, ERD metadata, or PL/SQL scaffolding.

### Core Architectural Pattern: **Decoupled Transformation Pipeline**

The engine operates in four distinct stages:

1.  **Lexical Analysis**: Raw string → flat token stream.
2.  **Syntactic Recognition**: Token stream → hierarchical Forest/Tree.
3.  **Semantic Analysis**: Nodes self-infer types and relationships.
4.  **Generation**: DDL Generators (Visitors) traverse the tree to produce output.


1\. Core Modules & Responsibilities
-----------------------------------

### lexer.ts (The Tokenizer)

*   **Purpose**: Scans the input string and produces `LexerToken` objects.
*   **Key Feature**: Pre-calculates `lowerValue` for every token to avoid expensive `.toLowerCase()` calls during tree traversal.
*   **Extensibility**: To add new operators (e.g., new Oracle syntax symbols), extend the `TokenType` union and the lexer loop.

### parser.ts (The Tree Builder)

*   **Function**: `recognize(ctx: DdlContext)`
*   **Logic**: Implements an indentation-aware parser. Merges multi-line annotation blocks (detecting unclosed `{...}`) and builds the parent-child hierarchy based on `LexerToken` offsets.
*   **How to extend**: To support new top-level directives (like `#settings`), update the OUTER loop logic.

### node.ts (The Semantic Brain)

*   **Class**: `DdlNode implements IDdlNode`
*   **Key Methods**:
    *   `inferType()`: Maps shorthand (e.g., `vc50`) to abstract semantic types.
    *   `parseName()`: Handles identifier extraction, quoted strings, and shorthand-to-object name mapping.
    *   `isOption(key)`: Checks for directives (e.g., `/insert`, `/nn`, `/rest`).
    *   `getSemanticType()`: Returns a dialect-agnostic `SemanticType` descriptor.
*   **Developer Note**: This is the most important file for adding new column-level features.

### types.ts (Contracts)

The system relies on strict interfaces to keep modules decoupled:

*   **`IDdlNode`**: Full public contract for any tree node. Generators interact exclusively through this interface, never with the internal `DdlNode` class.
*   **`SemanticType`**: A database-agnostic column descriptor (`base` type, `varcharLen`, `numericSpec`, `vectorSpec`, etc.). Each dialect maps this to its own SQL syntax.
*   **`DDLGenerator`**: The interface every generator must implement (`generateFullDDL()`, `generateERD()`).
*   **`DdlContext`**: Shared state object holding global options, the node forest, and error trackers.


2\. Generator Layer
-------------------

The generator layer is split into an abstract base, a factory/registry, and Oracle-specific modules.

### base-generator.ts (Abstract Base)

*   **Class**: `abstract class BaseGenerator implements DDLGenerator`
*   **Owns**:
    *   `generateERD()` — fully dialect-agnostic; uses the abstract `colType()` hook.
    *   `generateData()` — INSERT sample data generation with `_orderedTableNodes()` for FK ordering.
    *   `_fkColType(refNode)` — resolves the column type of a FK target via `this.colType()`.
*   **Abstract hooks** subclasses must implement:
    *   `colType(sem: SemanticType): string` — map a `SemanticType` to a SQL type string.
    *   `generateDDL(node)`, `generateDrop(node)`, `generateFullDDL()`.
*   **Override point**: `identityRestartSql(objName, idColName, nextVal)` — empty default; Oracle overrides it to emit `ALTER TABLE ... MODIFY ... RESTART`.

### factory.ts (Registry / Dispatch)

*   **`registerGenerator(dialect, factory)`**: Registers a dialect factory at runtime.
*   **`createGenerator(ctx)`**: Reads `ctx.getOptionValue('dialect')`, looks up the registry, and constructs the right generator. Throws a descriptive error for unknown dialects.
*   **Default**: The `oracle` dialect is registered at module load time.

### generator.ts (Oracle Orchestrator)

*   **Class**: `OracleDDLGenerator extends BaseGenerator`
*   **Role**: Thin orchestrator. Implements the abstract hooks and delegates to focused builder classes.
*   **Implements**:
    *   `colType(sem)` → delegates to `toOracleType()` from `oracle-types.ts`.
    *   `generateFullDDL()` — sequences: drops, tables, FKs, indexes, triggers, views, ORDS, TAPI, data.
    *   `generateDDL(node)` / `generateDrop(node)` — per-node DDL and DROP logic.
    *   `identityRestartSql()` — Oracle-specific IDENTITY sequence restart.
*   **Delegates to**:
    *   `OracleViewBuilder` for all view and duality view generation.
    *   `OraclePlsqlBuilder` for all trigger, ORDS, and TAPI generation.

### oracle-types.ts (Pure Type Mapper)

The single file a dialect author needs to understand to replace Oracle types:

*   **`toOracleType(sem, semantics, db23)`**: Maps a `SemanticType` to an Oracle DDL type string (e.g., `varchar2(100 char)`, `clob check (col is json)`, `vector(*,*,*)`).
*   **`oraclePkTypeModifier(objName, ctx, naming)`**: Returns the PK column modifier clause (IDENTITY / sequence default / GUID / NOT NULL).
*   **`isDb23(ctx)`**: Resolves whether the target DB is Oracle 23+, enabling native `boolean`, `json`, etc.

### oracle-view.ts (View Generation)

*   **Class**: `OracleViewBuilder`
*   **Generates**: standard updatable views, JSON Duality Views, translation tables, and resolved-view wrappers.
*   **Key methods**: `generateView()`, `generateDualityView()`, `generateTransTable()`, `generateResolvedView()`.

### oracle-plsql.ts (PL/SQL Scaffolding)

*   **Class**: `OraclePlsqlBuilder`
*   **Generates**: BI/BU row-level triggers (case enforcement, audit columns, row version), immutable-table triggers, ORDS `enable_object` calls, and Table API (TAPI) packages.
*   **Key methods**: `generateTrigger()`, `generateImmutableTrigger()`, `restEnable()`, `generateTAPI()`, `procDecl()`.

### tree.ts (Public Barrel)

Re-exports everything the public API needs:

```typescript
export { default } from './parser.js';           // recognize()
export { OracleDDLGenerator } from './generator.js';
export { BaseGenerator } from './base-generator.js';
export { OracleViewBuilder } from './oracle-view.js';
export { OraclePlsqlBuilder } from './oracle-plsql.js';
export { toOracleType, oraclePkTypeModifier, isDb23 } from './oracle-types.js';
export { createGenerator, registerGenerator } from './factory.js';
export type { GeneratorFactory } from './factory.js';
export { DdlNode } from './node.js';
```


3\. Supporting Utilities
------------------------

*   **naming.ts**: `singular()`/`plural()` transformations, Oracle identifier quoting rules, `getMajorVersion()`. Essential for naming consistency across all generators.
*   **errorMsgs.ts**: Post-parsing validation (misaligned indents, invalid attribute combinations).
*   **sample.ts**: Generates deterministic sample INSERT data for `/insert` tables.
*   **translate.ts**: Maps column names to plausible sample values (name, email, phone, etc.).
*   **json2qsql.ts**: Reverse-engineers a JSON document into QSQL shorthand.
*   **split_str.ts**: Tokenizes shorthand column spec strings (e.g., `vc50 /nn /lower`).


4\. How to Extend the Engine
----------------------------

### Adding a new Column Directive (e.g., `/encrypted`)

1.  **`types.ts`**: Add a method to `IDdlNode` if the generator needs to query it.
2.  **`node.ts`**: Implement the method on `DdlNode`, detecting the token in `src`.
3.  **`generator.ts`** (or the relevant builder): Check `child.isOption('encrypted')` and append the SQL clause.

### Adding a new Database Dialect

1.  Create `src/my-dialect-types.ts` with a `toMyDialectType(sem)` function.
2.  Create `src/my-dialect-generator.ts` extending `BaseGenerator`:
    *   Implement `colType(sem)` → call `toMyDialectType(sem)`.
    *   Implement `generateDDL()`, `generateDrop()`, `generateFullDDL()`.
3.  Register at startup:
    ```typescript
    import { registerGenerator } from './factory.js';
    registerGenerator('postgres', ctx => new PostgresDDLGenerator(ctx));
    ```
4.  Set `dialect: { value: 'postgres' }` in the context options.

`BaseGenerator` already provides `generateERD()` and `generateData()` for free — they use `this.colType()` and work for any dialect.

### Troubleshooting the Parser

If a specific line is parsed incorrectly, inspect the `src` property of the `DdlNode`. This array contains the exact `LexerToken` stream used to build that node.


### Technical Summary for LLM-Aided Coding

> This project is a TypeScript refactoring of QuickSQL. `parser.ts` builds a tree of `DdlNode` objects from QSQL shorthand. All generators extend `BaseGenerator` (abstract class) and are dispatched by `createGenerator()` in `factory.ts`. The Oracle implementation is split across `generator.ts` (orchestrator), `oracle-types.ts` (pure type mapper), `oracle-view.ts` (`OracleViewBuilder`), and `oracle-plsql.ts` (`OraclePlsqlBuilder`). All inter-module contracts go through the `IDdlNode` and `SemanticType` interfaces in `types.ts`. To add a dialect, extend `BaseGenerator`, implement `colType()` and the DDL methods, and call `registerGenerator()`.
