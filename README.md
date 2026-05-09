# ExpreSQL

ExpreSQL is a fork of [Oracle EspreSQL](https://github.com/oracle/espresql), a tool that translates an indentation-based shorthand syntax (QSQL) into relational DDL, ERD metadata, and PL/SQL scaffolding.

The v2.0.0 rewrite introduces a multi-dialect architecture in TypeScript, replacing the original monolithic JavaScript codebase.

## Repository structure

- **`src/`** — Compilatore QSQL: lexer, parser, analisi semantica e generatore astratto multi-dialetto
- **`src/oracle/`** — Dialetto Oracle: generatore DDL, viste, PL/SQL, TAPI e diff/migration
- **`src/quick-erd/`** — Visualizzazione ERD con renderer AntV X6 e Mermaid
- **`web/`** — Interfaccia browser con editor QSQL e visualizzazione ERD
- **`mle/`** — Script di installazione per Oracle MLE (esecuzione in-database)
- **`test/`** — Test Vitest (unit + integration) e suite di regressione legacy JS
- **`dist/`** — Output compilato (`espresql.js`, `quick-erd.js`, `espresql.mle.cjs`)
- **`doc/`** — Documentazione utente e di sviluppo

## License

Copyright (c) 2023 Oracle and/or its affiliates.
Copyright (c) 2026 Radicle IT and ExpreSQL contributors.

Released under the [Universal Permissive License v1.0](./LICENSE.txt). See the license file for full terms.

## Contributors

- **Oracle Corporation** — original EspreSQL engine and QSQL shorthand specification
- **Radicle IT** — TypeScript rewrite (v2.0.0): multi-dialect architecture, decoupled pipeline, PL/SQL builder modules
