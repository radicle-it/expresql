-- =============================================================================
-- 04_install_package.sql
-- Crea il package PL/SQL quicksql_pkg che espone le funzioni QuickSQL.
--
-- Prerequisiti: quicksql_env deve essere già installato.
-- =============================================================================

PROMPT >>> Creazione quicksql_pkg (spec)...

CREATE OR REPLACE PACKAGE quicksql_pkg AS

    /**
     * Genera DDL Oracle da input QuickSQL.
     * @param p_qsql    Schema in notazione QuickSQL
     * @param p_options Opzioni JSON (es. '{"prefix":"p1","semantics":"CHAR"}')
     *                  Passare come stringa JSON — non serializzare come oggetto.
     * @return          DDL Oracle come CLOB
     */
    FUNCTION to_ddl (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB;

    /**
     * Valida la sintassi QuickSQL.
     * @return JSON array di errori; array vuoto '[]' se tutto OK.
     *         Struttura elemento: {from:{line,depth}, to:{line,depth}, message, severity}
     *         Usare JSON_VALUE(result, '$[0].from.line' RETURNING NUMBER) per leggere la riga.
     */
    FUNCTION validate (
        p_qsql IN CLOB
    ) RETURN CLOB;

    /**
     * Ritorna l'ERD come JSON (nodi + archi).
     * @param p_qsql    Schema in notazione QuickSQL
     * @param p_options Opzioni JSON (stringa, stesso formato di to_ddl)
     * @return          Struttura ERD serializzata come JSON CLOB
     */
    FUNCTION to_erd (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB;

    /** Versione del bundle quicksql caricato (es. '2.0.0'). */
    FUNCTION version RETURN VARCHAR2;

END quicksql_pkg;
/

PROMPT >>> Creazione quicksql_pkg (body)...

CREATE OR REPLACE PACKAGE BODY quicksql_pkg AS

    FUNCTION to_ddl (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB
    AS MLE MODULE quicksql_api_module
    ENV quicksql_env
    SIGNATURE 'getDDL(string, string)';

    FUNCTION validate (
        p_qsql IN CLOB
    ) RETURN CLOB
    AS MLE MODULE quicksql_api_module
    ENV quicksql_env
    SIGNATURE 'validate(string)';

    FUNCTION to_erd (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB
    AS MLE MODULE quicksql_api_module
    ENV quicksql_env
    SIGNATURE 'getERD(string, string)';

    FUNCTION version RETURN VARCHAR2
    AS MLE MODULE quicksql_api_module
    ENV quicksql_env
    SIGNATURE 'version()';

END quicksql_pkg;
/

-- Verifica compilazione
SELECT object_name, object_type, status
FROM   user_objects
WHERE  object_name = 'QUICKSQL_PKG'
ORDER  BY object_type;

SELECT name, type, line, text
FROM   user_errors
WHERE  name = 'QUICKSQL_PKG'
ORDER  BY type, line;

PROMPT >>> install_package.sql completato.
