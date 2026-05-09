-- Verifica stato oggetti espresql nel schema corrente
SET SERVEROUTPUT ON

SELECT 'MLE MODULE'   AS tipo, module_name   AS nome, status FROM user_mle_modules  WHERE module_name LIKE 'QUICKSQL%'
UNION ALL
SELECT 'MLE ENV',              env_name,      'N/A'          FROM user_mle_envs     WHERE env_name    LIKE 'QUICKSQL%'
UNION ALL
SELECT 'PACKAGE',              object_name,   status         FROM user_objects       WHERE object_name LIKE 'QUICKSQL%' AND object_type IN ('PACKAGE','PACKAGE BODY')
UNION ALL
SELECT 'FUNCTION',             object_name,   status         FROM user_objects       WHERE object_name LIKE 'QUICKSQL%' AND object_type = 'FUNCTION'
ORDER BY 1, 2;
