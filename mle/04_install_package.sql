-- =============================================================================
-- 04_install_package.sql
-- Crea il package PL/SQL expresql_pkg che espone le funzioni ExpreSQL.
--
-- Prerequisiti: expresql_env deve essere già installato.
-- =============================================================================

PROMPT >>> Creazione expresql_pkg (spec)...

CREATE OR REPLACE PACKAGE expresql_pkg AS

    /**
     * Genera DDL Oracle da input ExpreSQL.
     * @param p_qsql    Schema in notazione ExpreSQL
     * @param p_options Opzioni JSON (es. '{"prefix":"p1","semantics":"CHAR"}')
     *                  Passare come stringa JSON — non serializzare come oggetto.
     * @return          DDL Oracle come CLOB
     */
    FUNCTION to_ddl (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB;

    /**
     * Valida la sintassi ExpreSQL.
     * @return JSON array di errori; array vuoto '[]' se tutto OK.
     *         Struttura elemento: {from:{line,depth}, to:{line,depth}, message, severity}
     *         Usare JSON_VALUE(result, '$[0].from.line' RETURNING NUMBER) per leggere la riga.
     */
    FUNCTION validate (
        p_qsql IN CLOB
    ) RETURN CLOB;

    /**
     * Ritorna l'ERD come JSON (nodi + archi).
     * @param p_qsql    Schema in notazione ExpreSQL
     * @param p_options Opzioni JSON (stringa, stesso formato di to_ddl)
     * @return          Struttura ERD serializzata come JSON CLOB
     */
    FUNCTION to_erd (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB;

    /** Versione del bundle expresql caricato (es. '2.0.0'). */
    FUNCTION version RETURN VARCHAR2;

END expresql_pkg;
/

PROMPT >>> Creazione expresql_pkg (body)...

CREATE OR REPLACE PACKAGE BODY expresql_pkg AS

    FUNCTION to_ddl (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB
    AS MLE MODULE expresql_api_module
    ENV expresql_env
    SIGNATURE 'getDDL(string, string)';

    FUNCTION validate (
        p_qsql IN CLOB
    ) RETURN CLOB
    AS MLE MODULE expresql_api_module
    ENV expresql_env
    SIGNATURE 'validate(string)';

    FUNCTION to_erd (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB
    AS MLE MODULE expresql_api_module
    ENV expresql_env
    SIGNATURE 'getERD(string, string)';

    FUNCTION version RETURN VARCHAR2
    AS MLE MODULE expresql_api_module
    ENV expresql_env
    SIGNATURE 'version()';

END expresql_pkg;
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
