-- =============================================================================
-- 03_install_env.sql
-- Crea l'MLE environment che collega i due moduli.
-- espresql_api_module importa 'espresql' → risolto in espresql_module.
--
-- Prerequisiti: entrambi i moduli devono essere già installati.
-- =============================================================================

PROMPT >>> Creazione espresql_env...

CREATE OR REPLACE MLE ENV espresql_env
IMPORTS (
    espresql     FROM espresql_module,       -- usato da espresql_api_module
    espresql_api FROM espresql_api_module    -- esposto al package PL/SQL
);
/

-- Verifica
SELECT env_name, imports
FROM   user_mle_envs
WHERE  env_name = 'QUICKSQL_ENV';

PROMPT >>> install_env.sql completato.
