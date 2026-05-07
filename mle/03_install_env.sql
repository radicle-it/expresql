-- =============================================================================
-- 03_install_env.sql
-- Crea l'MLE environment che collega i due moduli.
-- quicksql_api_module importa 'quicksql' → risolto in quicksql_module.
--
-- Prerequisiti: entrambi i moduli devono essere già installati.
-- =============================================================================

PROMPT >>> Creazione quicksql_env...

CREATE OR REPLACE MLE ENV quicksql_env
IMPORTS (
    quicksql     FROM quicksql_module,       -- usato da quicksql_api_module
    quicksql_api FROM quicksql_api_module    -- esposto al package PL/SQL
);
/

-- Verifica
SELECT env_name, imports
FROM   user_mle_envs
WHERE  env_name = 'QUICKSQL_ENV';

PROMPT >>> install_env.sql completato.
