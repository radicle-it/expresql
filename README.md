![ExpreSQL logo](./img/expresql_logo_horizontal.png)

# ExpreSQL

ExpreSQL is a fork of [Oracle Quick SQL](https://github.com/oracle/quicksql), a tool that translates an indentation-based shorthand syntax (QSQL) into relational DDL, ERD metadata, and PL/SQL scaffolding.

The v2.0.0 rewrite introduces a multi-dialect architecture in TypeScript, replacing the original monolithic JavaScript codebase.

## Repository structure

- **`src/`** — Compilatore QSQL: lexer, parser, analisi semantica e generatore astratto multi-dialetto
- **`src/oracle/`** — Dialetto Oracle: generatore DDL, viste, PL/SQL, TAPI e diff/migration
- **`src/quick-erd/`** — Visualizzazione ERD con renderer AntV X6 e Mermaid
- **`web/`** — Interfaccia browser con editor QSQL e visualizzazione ERD
- **`mle/`** — Script di installazione per Oracle MLE (esecuzione in-database)
- **`test/`** — Test Vitest (unit + integration) e suite di regressione legacy JS
- **`dist/`** — Output compilato (`quick-sql.js`, `quick-erd.js`, `quick-sql.mle.cjs`)
- **`doc/`** — Documentazione utente e di sviluppo (see [examples](doc/user/examples.md))

## License

Copyright (c) 2023 Oracle and/or its affiliates.
Copyright (c) 2026 Radicle IT and ExpreSQL contributors.

Released under the [Universal Permissive License v1.0](./LICENSE.txt). See the license file for full terms.

## Contributors

- **Oracle Corporation** — original Quick SQL engine and QSQL shorthand specification
- **Radicle** — TypeScript rewrite (v2.0.0): multi-dialect architecture, decoupled pipeline, PL/SQL builder modules
