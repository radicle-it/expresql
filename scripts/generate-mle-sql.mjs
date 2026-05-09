import { readFileSync, writeFileSync } from 'fs';

const CHUNK = 2000;   // caratteri per chunk — ben sotto il limite VARCHAR2 di Oracle
const DELIM = '$QSQL$';

function embedSQL(outFile, moduleName, srcFile) {
    const content = readFileSync(srcFile, 'utf8');

    // Escape single quotes per SQL ('' è il modo standard Oracle)
    const escaped = content.replace(/'/g, "''");

    // Spezza in chunk da CHUNK caratteri
    const chunks = [];
    for (let i = 0; i < escaped.length; i += CHUNK) {
        chunks.push(escaped.slice(i, i + CHUNK));
    }

    // Genera il blocco PL/SQL che assembla il CLOB e crea il modulo
    const appendLines = chunks
        .map(c => `  DBMS_LOB.APPEND(l_src, TO_CLOB('${c}'));`)
        .join('\n');

    const sql =
`-- Auto-generato da scripts/generate-mle-sql.mjs — non modificare manualmente
-- Sorgente: ${srcFile}  (${content.length} byte, ${chunks.length} chunk da ${CHUNK} char)
PROMPT >>> Caricamento ${moduleName} (${chunks.length} chunk)...

-- Disabilita sostituzione variabili (&/&&) per non interferire con il codice JavaScript
SET DEFINE OFF

DECLARE
  l_src CLOB;
BEGIN
  DBMS_LOB.CREATETEMPORARY(l_src, TRUE);
${appendLines}
  EXECUTE IMMEDIATE
    'CREATE OR REPLACE MLE MODULE ${moduleName} LANGUAGE JAVASCRIPT AS ${DELIM}' ||
    l_src ||
    '${DELIM}';
  DBMS_LOB.FREETEMPORARY(l_src);
  DBMS_OUTPUT.PUT_LINE('OK  ${moduleName} caricato.');
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
WHERE  module_name = '${moduleName.toUpperCase()}';

SELECT name, line, text
FROM   user_errors
WHERE  name = '${moduleName.toUpperCase()}'
ORDER  BY line;

PROMPT >>> ${outFile} completato.
`;

    writeFileSync(outFile, sql, 'utf8');
    console.log(`Generato: ${outFile}  (${chunks.length} chunk, ${(sql.length/1024).toFixed(0)} KB)`);
}

embedSQL('mle/01_install_module.sql',     'espresql_module',     'dist/espresql.mle.cjs');
embedSQL('mle/02_install_api_module.sql', 'espresql_api_module', 'mle/espresql-api.mjs');
