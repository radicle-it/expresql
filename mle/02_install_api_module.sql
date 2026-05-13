-- Auto-generato da scripts/generate-mle-sql.mjs — non modificare manualmente
-- Sorgente: mle/expresql-api.mjs  (785 byte, 1 chunk da 2000 char)
PROMPT >>> Caricamento expresql_api_module (1 chunk)...

-- Disabilita sostituzione variabili (&/&&) per non interferire con il codice JavaScript
SET DEFINE OFF

DECLARE
  l_src CLOB;
BEGIN
  DBMS_LOB.CREATETEMPORARY(l_src, TRUE);
  DBMS_LOB.APPEND(l_src, TO_CLOB('﻿// Sorgente per expresql_api_module (MLE).
// Importa dal modulo expresql caricato nell''environment Oracle MLE.
// NON usare JSON.parse sulle opzioni: toDDL/toERD accettano la stringa JSON direttamente.
import { toDDL, toERD, toErrors, expresql_version } from ''expresql'';

export function getDDL(qsql, optionsJson) {
    // optionsJson è già una stringa JSON — NON fare JSON.parse
    return toDDL(qsql, optionsJson || undefined);
}

export function getERD(qsql, optionsJson) {
    // optionsJson è già una stringa JSON — NON fare JSON.parse
    return JSON.stringify(toERD(qsql, optionsJson || undefined));
}

export function validate(qsql) {
    const errors = toErrors(qsql) || [];
    return JSON.stringify(errors);
}

export function version() {
    return expresql_version();
}
'));
  EXECUTE IMMEDIATE
    'CREATE OR REPLACE MLE MODULE expresql_api_module LANGUAGE JAVASCRIPT AS $QSQL$' ||
    l_src ||
    '$QSQL$';
  DBMS_LOB.FREETEMPORARY(l_src);
  DBMS_OUTPUT.PUT_LINE('OK  expresql_api_module caricato.');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_LOB.FREETEMPORARY(l_src);
    RAISE;
END;
/

SET DEFINE ON

SELECT module_name,
       language,
       status,
       ROUND(LENGTH(module_source) / 1024, 1) AS size_kb
FROM   user_mle_modules
WHERE  module_name = 'EXPRESQL_API_MODULE';

SELECT name, line, text
FROM   user_errors
WHERE  name = 'EXPRESQL_API_MODULE'
ORDER  BY line;

PROMPT >>> mle/02_install_api_module.sql completato.
