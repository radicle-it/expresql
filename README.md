![ExpreSQL logo](./img/expresql_logo_horizontal.png)

# ExpreSQL

ExpreSQL is a fork of [Oracle Quick SQL](https://github.com/oracle/quicksql), a tool that translates an indentation-based shorthand syntax (QSQL) into relational DDL, ERD metadata, and PL/SQL scaffolding.

The v2.0.0 rewrite introduces a multi-dialect architecture in TypeScript, replacing the original monolithic JavaScript codebase.

## Repository structure

- **`src/`** — QSQL compiler: lexer, parser, semantic analysis, and abstract multi-dialect generator
- **`src/oracle/`** — Oracle dialect: DDL generator, views, PL/SQL, TAPI, and diff/migration
- **`src/quick-erd/`** — ERD visualisation with AntV X6 and Mermaid renderers
- **`web/`** — Browser UI with QSQL editor and ERD visualisation
- **`mle/`** — Oracle MLE (Multilingual Engine) installation scripts for in-database execution
- **`test/`** — Vitest suite (unit + integration) and legacy JS regression tests
- **`dist/`** — Compiled output (`quick-sql.js`, `quick-erd.js`, `quick-sql.mle.cjs`)
- **`doc/`** — User and developer documentation (see [examples](doc/user/examples.md))

## License

Copyright (c) 2023 Oracle and/or its affiliates.
Copyright (c) 2026 Radicle IT and ExpreSQL contributors.

Released under the [Universal Permissive License v1.0](./LICENSE.txt). See the license file for full terms.

## Contributors

- **Oracle Corporation** — original Quick SQL engine and QSQL shorthand specification
- **Radicle** — TypeScript rewrite (v2.0.0): multi-dialect architecture, decoupled pipeline, PL/SQL builder modules
