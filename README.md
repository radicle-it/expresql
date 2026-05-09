# EspreSQL

EspreSQL è un fork di [Oracle Quick SQL](https://github.com/oracle/quicksql), uno strumento che traduce una sintassi shorthand indentation-based (ESQL) in DDL relazionale, metadati ERD e scaffolding PL/SQL.

La riscrittura v2.0.0 introduce un'architettura multi-dialetto in TypeScript, sostituendo il codebase JavaScript monolitico originale.

## Repository structure

- **`src/`** — Compilatore ESQL: lexer, parser, analisi semantica e generatore astratto multi-dialetto
- **`src/oracle/`** — Dialetto Oracle: generatore DDL, viste, PL/SQL, TAPI e diff/migration
- **`src/db2/`** — Dialetto IBM Db2: generatore DDL e TAPI
- **`web/`** — Interfaccia browser con editor ESQL e visualizzazione ERD (AntV X6)
- **`mle/`** — Script di installazione per Oracle MLE (esecuzione in-database)
- **`test/`** — Test Vitest (unit + integration) e suite di regressione JS
- **`dist/`** — Output compilato (`espresql.js`, `espresql-oracle.js`, `espresql-db2.js`)
- **`doc/`** — Documentazione utente e di sviluppo

## License

Copyright (c) 2023 Oracle and/or its affiliates.
Copyright (c) 2026 Radicle IT and ExpreSQL contributors.

Released under the [Universal Permissive License v1.0](./LICENSE.txt). See the license file for full terms.

## Contributors

- **Oracle Corporation** — original EspreSQL engine and QSQL shorthand specification
- **Radicle IT** — TypeScript rewrite (v2.0.0): multi-dialect architecture, decoupled pipeline, PL/SQL builder modules
