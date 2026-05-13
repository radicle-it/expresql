-- =============================================================================
-- 03_install_env.sql
-- Crea l'MLE environment che collega i due moduli.
-- expresql_api_module importa 'expresql' → risolto in expresql_module.
--
-- Prerequisiti: entrambi i moduli devono essere già installati.
-- =============================================================================

PROMPT >>> Creazione expresql_env...

CREATE OR REPLACE MLE ENV expresql_env
IMPORTS (
    expresql     FROM expresql_module,       -- usato da expresql_api_module
    expresql_api FROM expresql_api_module    -- esposto al package PL/SQL
);
/

-- Verifica
SELECT env_name, imports
FROM   user_mle_envs
WHERE  env_name = 'QUICKSQL_ENV';

PROMPT >>> install_env.sql completato.
