# QuickSQL — Integrazione Oracle MLE: Specifiche Tecniche

**Versione documento:** 1.1  
**Data:** 2026-04-28  
**Bundle di riferimento:** `dist/quick-sql.umd.cjs` (~338 KB, UMD format)  
**API pubblica esposta:** `quickSQL.toDDL(qsql, options?)`, `quickSQL.toERD(qsql, options?)`, `quickSQL.toErrors(qsql, options?)`, `quickSQL.toDiff(oldQsql, newQsql, options?)`

---

## Indice

1. [Prerequisiti e Requisiti di Sistema](#fase-1)
2. [Analisi di Compatibilità Bundle ↔ Graal.js](#fase-2)
3. [Adattamento del Bundle per MLE](#fase-3)
4. [Caricamento come MLE Module](#fase-4)
5. [Creazione MLE Environment](#fase-5)
6. [Call Specifications PL/SQL](#fase-6)
7. [Package PL/SQL Wrapper](#fase-7)
8. [Testing e Validazione](#fase-8)
9. [Integrazione APEX](#fase-9)
10. [Deployment e Manutenzione](#fase-10)

---

## Fase 1 — Prerequisiti e Requisiti di Sistema {#fase-1}

### 1.1 Versione Database

| Versione Oracle | Supporto MLE | Note |
|----------------|-------------|------|
| ≤ 20c | ❌ Non disponibile | — |
| 21c | ⚠️ Sperimentale | Feature preview, non production |
| 23c / 23ai Free | ✅ Stabile | Versione minima raccomandata |
| 23ai Cloud (APEX) | ✅ Completo | Scenario target |

Verifica versione:
```sql
SELECT banner_full FROM v$version;
SELECT comp_name, status FROM dba_registry WHERE comp_id = 'MLE';
```

### 1.2 Abilitazione MLE

In 23ai MLE è abilitato per default. Verificare:
```sql
SELECT name, value FROM v$parameter WHERE name = 'enable_mle';
-- atteso: TRUE
```

Se disabilitato (richiede SYSDBA):
```sql
ALTER SYSTEM SET enable_mle = TRUE SCOPE = BOTH;
```

### 1.3 Privilege Necessari per lo Schema Applicativo

```sql
-- Da eseguire come DBA
GRANT CREATE MLE MODULE TO <schema>;
GRANT CREATE MLE ENV    TO <schema>;
GRANT CREATE PROCEDURE  TO <schema>;   -- per call specs
GRANT EXECUTE ON JAVASCRIPT TO <schema>;
```

### 1.4 Limiti MLE da Considerare

| Risorsa | Limite Oracle 23ai |
|---------|-------------------|
| Dimensione modulo JS (sorgente) | 2 MB per modulo |
| Memoria heap per sessione | Configurabile, default 256 MB |
| Timeout esecuzione JS | Configurabile via Resource Manager |
| Tipi supportati nello scambio dati | VARCHAR2, NUMBER, CLOB, DATE, BINARY_DOUBLE, BOOLEAN |

Il bundle `quick-sql.umd.cjs` pesa **338 KB** — abbondantemente sotto il limite di 2 MB.

> **Nota:** Il repository contiene anche `dist/quick-erd.umd.cjs` (3.1 MB). Si tratta di una libreria di rendering grafico per browser — **non va caricata come MLE module**: supera il limite di 2 MB e usa API DOM non disponibili in Graal.js.

---

## Fase 2 — Analisi di Compatibilità Bundle ↔ Graal.js {#fase-2}

Oracle MLE esegue JavaScript tramite **GraalVM JavaScript** (non Node.js). Non sono disponibili:
`process`, `require()`, `__dirname`, `__filename`, `fs`, `path`, Node.js built-in modules.

### 2.1 Risultato Analisi del Bundle Attuale

| API | Presente nel bundle | Compatibile Graal.js | Azione |
|-----|--------------------|-----------------------|--------|
| `typeof exports == "object"` (UMD header) | ✅ | ✅ | Nessuna |
| `typeof define == "function"` (AMD fallback) | ✅ | ✅ | Nessuna |
| `process.env` | ❌ Non presente | — | — |
| `__dirname` / `__filename` | ❌ Non presente | — | — |
| `Buffer.from()` | ⚠️ 1 occorrenza | ❌ Non disponibile | **Polyfill** (vedi §2.2) |
| `setTimeout` / `setInterval` | ❌ Non presente | — | — |
| `Math.random()` | ✅ | ✅ | Nessuna |

### 2.2 Il Problema `Buffer.from()`

L'unica occorrenza si trova in `Chance.prototype.buffer()`, il metodo della libreria di random data che genera array di byte casuali. **Non è nel path di generazione nomi/indirizzi** (incluso JP/KO): la traduzione giapponese/coreana usa Unicode literals hardcoded (`「…`, `영…`) e non chiama mai `Buffer`.

Il problema si manifesta **solo** se il codice di generazione sample data richiama esplicitamente `chance.buffer()` — percorso non attivato nella generazione INSERT standard di QuickSQL. Tuttavia il polyfill rimane necessario: senza di esso il semplice caricamento del bundle lancerebbe `throw new Error("Sorry, the buffer() function is not supported...")` in Graal.js non appena il motore esegue la definizione del metodo.

Localizzazione nel bundle:
```
...s.prototype.buffer=function(e){if(typeof Buffer>"u")throw new d(...)...return Buffer.from(c)}...
```

Non blocca `toDDL()` né la generazione INSERT con `language: EN/JP/KO`.

### 2.3 Compatibilità del Formato UMD

Il formato UMD del bundle:
```javascript
(function(U, H) {
    typeof exports == "object" && typeof module < "u"
        ? H(exports)                          // CommonJS ← MLE usa questo
        : typeof define == "function" && define.amd
        ? define(["exports"], H)              // AMD
        : (U = ..., H(U.quickSQL = {}))       // global
})(this, function(U) { ... });
```

Oracle MLE espone `exports` e `module` in ambiente CommonJS → **il branch corretto viene selezionato automaticamente**.

---

## Fase 3 — Adattamento del Bundle per MLE {#fase-3}

### 3.1 Creare `dist/quick-sql.mle.cjs`

Si crea una versione dedicata al deploy MLE con un polyfill per `Buffer`:

```javascript
// Aggiungere come header PRIMA del contenuto del bundle UMD
if (typeof Buffer === 'undefined') {
    globalThis.Buffer = {
        from: function(arr) {
            if (typeof arr === 'string') return { toString: () => arr };
            // conversione minimale byte array → stringa
            return {
                toString: function(enc) {
                    try {
                        return String.fromCharCode.apply(null, arr);
                    } catch(e) {
                        return '';
                    }
                }
            };
        }
    };
}
// <qui il contenuto di dist/quick-sql.umd.cjs invariato>
```

### 3.2 Script di Build

Aggiungere a `package.json`:
```json
"scripts": {
    "build:mle": "node scripts/build-mle.mjs"
}
```

`scripts/build-mle.mjs`:
```javascript
import { readFileSync, writeFileSync } from 'fs';

const polyfill = `if (typeof Buffer === 'undefined') {
    globalThis.Buffer = {
        from: function(arr) {
            if (typeof arr === 'string') return { toString: () => arr };
            return { toString: () => {
                try { return String.fromCharCode.apply(null, arr); } catch(e) { return ''; }
            }};
        }
    };
}
`;
const bundle = readFileSync('dist/quick-sql.umd.cjs', 'utf8');
writeFileSync('dist/quick-sql.mle.cjs', polyfill + bundle, 'utf8');
console.log('MLE bundle written:', (polyfill + bundle).length, 'bytes');
```

### 3.3 Verifica Locale del Bundle MLE

```javascript
// test-mle-compat.mjs — simula l'ambiente Graal.js
// Rimuove Buffer per testare il polyfill
const origBuffer = globalThis.Buffer;
delete globalThis.Buffer;

const bundle = await import('./dist/quick-sql.mle.cjs');
// oppure: const { quickSQL } = require('./dist/quick-sql.mle.cjs');

const result = bundle.toDDL(`
employees
  name /nn vc100
  salary num
`);
console.assert(result.includes('create table'), 'DDL generated OK');
console.log('MLE compatibility OK');

globalThis.Buffer = origBuffer;
```

---

## Fase 4 — Caricamento come MLE Module {#fase-4}

### 4.1 Metodo A — SQL*Plus / SQLcl (raccomandato per CI/CD)

```sql
-- Crea o sostituisce il modulo
-- Il file viene letto dal filesystem locale con SQLcl
CREATE OR REPLACE MLE MODULE quicksql_module
LANGUAGE JAVASCRIPT
AS
$$
-- contenuto di dist/quick-sql.mle.cjs incollato qui
-- oppure con SQLcl: @quick-sql.mle.cjs
$$
/
```

Con SQLcl (metodo più pratico per file grandi):
```sql
-- SQLcl supporta il caricamento da file
script
    var content = util.readFile('dist/quick-sql.mle.cjs');
    var stmt = "CREATE OR REPLACE MLE MODULE quicksql_module " +
               "LANGUAGE JAVASCRIPT AS $js$" + content + "$js$";
    var s = conn.prepareStatement(stmt);
    s.execute();
    print("Module loaded");
/
```

### 4.2 Metodo B — PL/SQL con DBMS_LOB (caricamento da tabella)

Utile per deployment automatizzato senza accesso filesystem:

```sql
-- Step 1: Caricare il bundle in una tabella staging
CREATE TABLE quicksql_stage (
    id      NUMBER PRIMARY KEY,
    chunk   CLOB
);

-- Step 2: Inserire il bundle via JDBC/ORDS in chunk da 32KB
-- (gestito dall'applicazione di deployment)

-- Step 3: Assemblare e creare il modulo
DECLARE
    l_src CLOB;
BEGIN
    SELECT chunk INTO l_src FROM quicksql_stage WHERE id = 1;
    
    EXECUTE IMMEDIATE
        'CREATE OR REPLACE MLE MODULE quicksql_module ' ||
        'LANGUAGE JAVASCRIPT AS ' || l_src;
END;
/
```

### 4.3 Verifica Caricamento

```sql
-- Verifica esistenza modulo
SELECT module_name, language, status, length(module_source)
FROM   user_mle_modules
WHERE  module_name = 'QUICKSQL_MODULE';

-- Verifica assenza errori di compilazione
SELECT * FROM user_errors WHERE name = 'QUICKSQL_MODULE';
```

---

## Fase 5 — Creazione MLE Environment {#fase-5}

L'environment definisce quali moduli sono importati e con quali nomi:

```sql
CREATE OR REPLACE MLE ENV quicksql_env
IMPORTS (
    quicksql FROM quicksql_module  -- nome locale → modulo DB
);
```

Il nome `quicksql` è il nome con cui il codice JS dell'env può referenziare il modulo
(rilevante solo se si scrivono ulteriori moduli JS che importano quicksql).

Verifica:
```sql
SELECT env_name, imports FROM user_mle_envs
WHERE env_name = 'QUICKSQL_ENV';
```

---

## Fase 6 — Call Specifications PL/SQL {#fase-6}

Le call specifications collegano funzioni PL/SQL a funzioni JavaScript esportate dal modulo.

### 6.1 Mappatura Tipi

| PL/SQL | JavaScript (Graal.js) |
|--------|----------------------|
| `IN VARCHAR2` | `string` |
| `IN CLOB` | `string` (automatico per testi > 32KB) |
| `RETURN CLOB` | `string` (ritorno) |
| `IN NUMBER` | `number` |
| `IN BOOLEAN` | `boolean` |

### 6.2 `toDDL` — Funzione Principale

```sql
CREATE OR REPLACE FUNCTION quicksql_to_ddl (
    p_qsql    IN CLOB,
    p_options IN VARCHAR2 DEFAULT NULL   -- JSON opzioni, es. '{"prefix":"p1"}'
)
RETURN CLOB
AS MLE MODULE quicksql_module
ENV quicksql_env
SIGNATURE 'toDDL(string, string)';
/
```

> **Nota:** Le opzioni vengono serializzate come JSON stringa lato PL/SQL e deserializzate lato JS.
> Occorre un piccolo wrapper JS (vedi Fase 7) per gestire il parse delle opzioni.

### 6.3 `toErrors` — Validazione Sintattica

```sql
CREATE OR REPLACE FUNCTION quicksql_to_errors (
    p_qsql IN CLOB
)
RETURN CLOB   -- JSON array di errori: vedi struttura sotto
AS MLE MODULE quicksql_module
ENV quicksql_env
SIGNATURE 'toErrors(string)';
/
```

> **Struttura del JSON restituito** (non `[{"line":N}]` — campi corretti):
> ```json
> [
>   {
>     "from":     { "line": 2, "depth": 4 },
>     "to":       { "line": 2, "depth": 6 },
>     "message":  "Invalid Datatype",
>     "severity": "error"
>   }
> ]
> ```
> Per leggere il numero di riga dal PL/SQL usare:
> ```sql
> JSON_VALUE(l_errors, '$[0].from.line' RETURNING NUMBER)
> -- NON: JSON_VALUE(l_errors, '$[0].line' ...)  ← non esiste
> ```

### 6.4 `toDiff` — Script di Migrazione Incrementale

```sql
CREATE OR REPLACE FUNCTION quicksql_to_diff (
    p_old_qsql IN CLOB,
    p_new_qsql IN CLOB,
    p_options  IN VARCHAR2 DEFAULT NULL   -- JSON opzioni, es. '{"db":"23c"}'
)
RETURN CLOB   -- script SQL di migrazione completo (testo)
AS MLE MODULE quicksql_module
ENV quicksql_env
SIGNATURE 'toDiff(string, string, string)';
/
```

Il valore restituito è il migration script come testo SQL (campo `sql` del `DiffResult`). Per accedere a statements e warning è necessario il wrapper JS (§7.4).

### 6.5 Verifica Immediata

```sql
SELECT quicksql_to_ddl(
    'employees' || CHR(10) ||
    '  name /nn' || CHR(10) ||
    '  salary num'
) AS ddl
FROM dual;
```

---

## Fase 7 — Package PL/SQL Wrapper {#fase-7}

### 7.1 Comportamento delle Opzioni

Il costruttore interno di QuickSQL accetta le opzioni come **stringa JSON** (non come oggetto): le prepone all'input come `# settings = <optionsJson>` prima del parsing. Passare un oggetto JS causerebbe `String({...})` = `"[object Object]"` e renderebbe le opzioni silenziosamente inutili.

Le call spec (Fase 6) passano già la stringa JSON così com'è — il wrapper non deve fare `JSON.parse`.

### 7.2 Modulo JS Wrapper (`quicksql_api_module`)

Creare un secondo modulo MLE che importa quicksql e gestisce le opzioni:

```javascript
// quicksql-api.mjs — sorgente per quicksql_api_module
import { toDDL, toERD, toErrors, toDiff, qsql_version } from 'quicksql';

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

export function getDiff(oldQsql, newQsql, optionsJson) {
    // Restituisce il migration script SQL come stringa
    return toDiff(oldQsql, newQsql, optionsJson || undefined).sql;
}

export function version() {
    return qsql_version();
}
```

```sql
CREATE OR REPLACE MLE MODULE quicksql_api_module
LANGUAGE JAVASCRIPT
AS
<contenuto di quicksql-api.mjs>
/

-- Aggiornare l'environment per importare entrambi i moduli
CREATE OR REPLACE MLE ENV quicksql_env
IMPORTS (
    quicksql     FROM quicksql_module,
    quicksql_api FROM quicksql_api_module
);
```

### 7.3 Package PL/SQL

```sql
CREATE OR REPLACE PACKAGE quicksql_pkg AS

    /**
     * Genera DDL Oracle da input QuickSQL.
     * @param p_qsql    Schema in notazione QuickSQL
     * @param p_options Opzioni JSON (es. '{"prefix":"p1","semantics":"CHAR"}')
     * @return          DDL Oracle come CLOB
     */
    FUNCTION to_ddl (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB;

    /**
     * Valida la sintassi QuickSQL.
     * @return JSON array di errori; array vuoto '[]' se tutto OK
     */
    FUNCTION validate (
        p_qsql IN CLOB
    ) RETURN CLOB;

    /**
     * Ritorna l'ERD come JSON (nodi + archi).
     */
    FUNCTION to_erd (
        p_qsql    IN CLOB,
        p_options IN VARCHAR2 DEFAULT NULL
    ) RETURN CLOB;

    /** Versione del bundle quicksql caricato. */
    FUNCTION version RETURN VARCHAR2;

END quicksql_pkg;
/

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
```

### 7.4 Utilizzo dal PL/SQL Applicativo

```sql
DECLARE
    l_qsql    CLOB;
    l_options VARCHAR2(200);
    l_ddl     CLOB;
    l_errors  CLOB;
BEGIN
    l_qsql := 'departments /insert 2' || CHR(10) ||
              '  name /nn' || CHR(10) ||
              '  employees /insert 4' || CHR(10) ||
              '    name /nn vc50' || CHR(10) ||
              '    salary num';
    l_options := '{"prefix":"hr","semantics":"CHAR","pk":"identityDataType"}';

    -- Valida prima
    l_errors := quicksql_pkg.validate(l_qsql);
    IF l_errors != '[]' THEN
        raise_application_error(-20001, 'QuickSQL syntax errors: ' || l_errors);
    END IF;

    -- Genera DDL
    l_ddl := quicksql_pkg.to_ddl(l_qsql, l_options);

    -- Esegui il DDL (opzionale — richiede EXECUTE IMMEDIATE o DBMS_SQL)
    DBMS_OUTPUT.put_line(SUBSTR(l_ddl, 1, 4000));
END;
/
```

---

## Fase 8 — Testing e Validazione {#fase-8}

### 8.1 Test Funzionali Minimi

```sql
-- Test 1: tabella semplice
SELECT quicksql_pkg.to_ddl('employees' || CHR(10) || '  name /nn')
FROM dual;
-- atteso: contiene 'create table employees'

-- Test 2: validazione errori
SELECT quicksql_pkg.validate('# settings = { invalidjson }')
FROM dual;
-- atteso: JSON array non vuoto

-- Test 3: con opzioni prefix
SELECT quicksql_pkg.to_ddl(
    'orders' || CHR(10) || '  amount num',
    '{"prefix":"sales"}'
)
FROM dual;
-- atteso: 'create table sales_orders'

-- Test 4: duality view
SELECT quicksql_pkg.to_ddl(
    'departments' || CHR(10) ||
    '  employees' || CHR(10) ||
    '    name /nn' || CHR(10) ||
    'emp_v = departments employees' || CHR(10) ||
    '# settings = {"DV":true}',
    NULL
)
FROM dual;
-- atteso: contiene 'duality view emp_v'

-- Test 5: versione bundle
SELECT quicksql_pkg.version() FROM dual;
```

### 8.2 Test di Performance

```sql
-- Misurare latenza su schema medio (10 tabelle)
SET TIMING ON
DECLARE
    l_result CLOB;
BEGIN
    FOR i IN 1..100 LOOP
        l_result := quicksql_pkg.to_ddl(
            'orders' || CHR(10) || '  customer_id' || CHR(10) ||
            '  items' || CHR(10) || '    product_id' || CHR(10) || '    quantity num'
        );
    END LOOP;
END;
/
-- Target: < 5ms per chiamata in steady state (dopo warm-up JIT)
```

### 8.3 Limiti e Failure Mode

| Scenario | Comportamento atteso |
|----------|---------------------|
| Input NULL | `toDDL` ritorna NULL (gestito dal wrapper) |
| Input vuoto `''` | Ritorna stringa vuota o comment DDL |
| Input > 1 MB | Testare con CLOB reale — Graal.js gestisce stringhe grandi |
| Opzioni JSON malformate | `JSON.parse` solleva eccezione → propagata come ORA- |
| Schema con 100+ tabelle | Verificare heap JS; possibile timeout con Resource Manager |

---

## Fase 9 — Integrazione APEX {#fase-9}

### 9.1 Da un Page Process APEX

```sql
-- In un Page Process (PL/SQL)
DECLARE
    l_options VARCHAR2(500);
    l_ddl     CLOB;
BEGIN
    -- Costruire il JSON opzioni con le API corrette di APEX_JSON
    apex_json.initialize_clob_output;
    apex_json.open_object;
    apex_json.write('prefix',    :P1_PREFIX);
    apex_json.write('semantics', :P1_SEMANTICS);
    apex_json.close_object;
    l_options := apex_json.get_clob_output;
    apex_json.free_output;

    l_ddl := quicksql_pkg.to_ddl(:P1_QSQL_INPUT, l_options);
    :P1_DDL_OUTPUT := l_ddl;
END;
```

> **Nota:** `apex_json.members()` e `apex_json.member()` non esistono nell'API APEX. Usare sempre `open_object` / `write` / `close_object` come sopra.

### 9.2 Come REST API via ORDS

```sql
-- Abilitare il modulo ORDS
BEGIN
    ords.define_module(
        p_module_name    => 'quicksql',
        p_base_path      => '/quicksql/',
        p_is_published   => TRUE
    );
    ords.define_template(
        p_module_name    => 'quicksql',
        p_pattern        => 'ddl'
    );
    ords.define_handler(
        p_module_name    => 'quicksql',
        p_pattern        => 'ddl',
        p_method         => 'POST',
        p_source_type    => ords.source_type_plsql,
        p_source         => q'[
            DECLARE
                l_body  CLOB         := :body;
                l_opts  VARCHAR2(500) := :options;
            BEGIN
                :status := 200;
                :result := quicksql_pkg.to_ddl(l_body, l_opts);
            END;
        ]'
    );
    -- OBBLIGATORIO: senza define_parameter, :options è sempre NULL
    ords.define_parameter(
        p_module_name        => 'quicksql',
        p_pattern            => 'ddl',
        p_method             => 'POST',
        p_name               => 'options',
        p_bind_variable_name => 'options',
        p_source_type        => 'QUERY_STRING',
        p_param_type         => 'STRING',
        p_access_method      => 'IN'
    );
    COMMIT;
END;
/
```

Chiamata REST:
```http
POST /ords/<schema>/quicksql/ddl?options={"prefix":"app"}
Content-Type: text/plain

departments
  name /nn
  employees
    name /nn vc50
```

---

## Fase 10 — Deployment e Manutenzione {#fase-10}

### 10.1 Script di Installazione Completo

Ordine obbligatorio:
```
1. mle/01_install_module.sql       -- CREATE OR REPLACE MLE MODULE quicksql_module
2. mle/02_install_api_module.sql   -- CREATE OR REPLACE MLE MODULE quicksql_api_module
3. mle/03_install_env.sql          -- CREATE OR REPLACE MLE ENV quicksql_env
4. mle/04_install_package.sql      -- CREATE OR REPLACE PACKAGE [BODY] quicksql_pkg
5. mle/05_install_test.sql         -- smoke test
```

### 10.2 Aggiornamento Bundle (nuovo release quicksql)

```sql
-- Sostituire solo il modulo sorgente; env e package non cambiano
CREATE OR REPLACE MLE MODULE quicksql_module
LANGUAGE JAVASCRIPT
AS <nuovo bundle>;
/
-- L'env è invalidato automaticamente e ricompilato al primo uso
```

### 10.3 Monitoraggio

```sql
-- Sessioni MLE attive
SELECT sid, username, module, action
FROM   v$session
WHERE  module LIKE '%MLE%';

-- Utilizzo heap JS per sessione
SELECT * FROM v$mle_heap_stats;
```

### 10.4 Workflow di Aggiornamento (nuovo release QuickSQL)

Ogni volta che il sorgente QuickSQL viene aggiornato, seguire questi passi nell'ordine indicato:

**Step 1 — Ricostruisci i bundle** (da terminale, nella root del progetto):
```bash
npm run build        # ricompila dist/quick-sql.umd.cjs (e gli altri bundle)
npm run build:mle    # rigenera dist/quick-sql.mle.cjs con polyfill Buffer
                     # + rigenera mle/01_install_module.sql e mle/02_install_api_module.sql
                     #   con il contenuto del bundle già incorporato (no JavaScript engine richiesto)
```

**Step 2 — Ricarica solo `quicksql_module`** con SQLcl:
```bash
sql <user>/<password>@<host>:<port>/<service>
```
```sql
@mle/01_install_module.sql
```

`quicksql_env` e `quicksql_pkg` **non vanno toccati**: Oracle invalida e ricompila l'env automaticamente al primo utilizzo successivo.

**Step 3 — Verifica con lo smoke test:**
```sql
@mle/05_install_test.sql
```
Tutti gli 8 test devono risultare `PASS` prima di rilasciare in produzione.

---

**Quando reinstallare anche env e package**

I passi 2 e 3 sopra bastano nella stragrande maggioranza dei casi. È necessario rieseguire anche `install_api_module.sql`, `install_env.sql` e `install_package.sql` solo se:

| Condizione | Script da rieseguire |
|------------|---------------------|
| Cambia la firma di una funzione in `quicksql-api.mjs` (es. nuovo parametro) | `02` → `03` → `04` → `05` |
| Si aggiunge una nuova funzione al package `quicksql_pkg` | `02` → `03` → `04` → `05` |
| Si rinomina o si rimuove una funzione esportata | `02` → `03` → `04` → `05` |
| Aggiornamento solo del bundle (nessuna modifica API) | Solo `01` → `05` |

---

## Export aggiuntivi del bundle

Il bundle espone funzioni non usate nel wrapper di base ma utili per scenari avanzati:

| Export | Firma | Utilizzo |
|--------|-------|----------|
| `fromJSON(json, options?)` | `(object\|string, string?) → string` | Converte un JSON Schema esistente in QSQL — utile per reverse engineering da strutture dati JSON |
| `registerGenerator(gen)` | `(BaseGenerator) → void` | Registra un generatore SQL custom; consente futuri dialetti o output non-Oracle (es. PostgreSQL, TypeScript types) senza modificare il bundle core |
| `qsql_version()` | `() → string` | Versione del bundle (attualmente `"2.0.0"`) — già usata nel package wrapper |

---

## Riepilogo Blocchi Tecnici

| # | Blocco | Gravità | Soluzione |
|---|--------|---------|-----------|
| 1 | `Buffer.from()` nel bundle | ⚠️ Medio | Polyfill 6-righe in Fase 3 (necessario al load, non nel path DDL/INSERT) |
| 2 | Wrapper Fase 7: **non fare `JSON.parse` prima di `toDDL`** | 🔴 Critico | Passare `optionsJson` direttamente — già corretto nel documento v1.1 |
| 3 | Struttura `toErrors`: usare `from.line`, non `line` | 🔴 Critico | Aggiornare consumer PL/SQL — già documentato in §6.3 |
| 4 | ORDS: `:options` richiede `define_parameter` | ⚠️ Medio | Aggiunto in §9.2 |
| 5 | APEX: `apex_json.members()` inesistente | ⚠️ Medio | Sostituito con `open_object`/`write`/`close_object` in §9.1 |
| 6 | `dist/quick-erd.umd.cjs` — 3.1 MB, non caricare in MLE | ℹ️ Nota | Non includere nel deployment (vedi §1.4) |
| 7 | Richiede Oracle 23ai (non 19c/21c) | 🔴 Vincolante | Nessuna workaround |

**Stima effort totale di implementazione:** 2–3 giorni per sviluppatore Oracle con esperienza MLE.

---

*Fine documento — quicksql MLE Integration Spec v1.1 — revisione 2026-04-28*
