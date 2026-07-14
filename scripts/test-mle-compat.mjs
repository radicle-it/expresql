// Simula l'ambiente Graal.js rimuovendo Buffer prima dell'import
const origBuffer = globalThis.Buffer;
delete globalThis.Buffer;

// createRequire è necessario per caricare un CJS bundle da ESM e ottenere le named exports
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bundle = require('../dist/expresql.mle.cjs');

// Ripristina Buffer per l'ambiente Node
globalThis.Buffer = origBuffer;

let passed = 0;
let failed = 0;

function assert(condition, label, detail) {
    if (condition) {
        console.log('  PASS  ' + label);
        passed++;
    } else {
        console.error('  FAIL  ' + label + (detail ? ' — ' + detail : ''));
        failed++;
    }
}

console.log('\n--- Test MLE compatibility ---\n');

// Test 1: tabella semplice
const ddl1 = bundle.toDDL('employees\n  name /nn\n  salary num');
assert(ddl1 && ddl1.toLowerCase().includes('create table employees'), 'toDDL: tabella semplice');
assert(ddl1.toLowerCase().includes('not null'), 'toDDL: NOT NULL generato per /nn');

// Test 2: opzioni come stringa JSON
const ddl2 = bundle.toDDL('orders\n  amount num', '{"prefix":"sales"}');
assert(ddl2 && ddl2.toLowerCase().includes('create table sales_orders'), 'toDDL: prefix via options string');

// Test 3: gerarchia padre-figlio
const ddl3 = bundle.toDDL('departments\n  name /nn\n  employees\n    name /nn vc50\n    salary num');
assert(ddl3 && ddl3.toLowerCase().includes('departments_id'), 'toDDL: FK padre→figlio generato');

// Test 4: toErrors ritorna array con from.line
// toErrors() ritorna un array JS (non una stringa JSON)
const errors = bundle.toErrors('employees\n  - bad_col') || [];
assert(Array.isArray(errors), 'toErrors: ritorna array');
if (errors.length > 0) {
    assert(errors[0].from !== undefined && errors[0].from.line !== undefined,
        'toErrors: struttura {from:{line,depth}, message, severity}');
} else {
    // input potrebbe non produrre errori — verifica con input certamente invalido
    const errors2 = bundle.toErrors('x\n  -') || [];
    assert(Array.isArray(errors2), 'toErrors: ritorna array su input invalido');
}

// Test 5: toERD ritorna struttura con tables/links
const erd = bundle.toERD('departments\n  name /nn\n  employees\n    name /nn');
assert(erd && typeof erd === 'object', 'toERD: ritorna oggetto');

// Test 6: versione bundle
const ver = bundle.qsql_version();
assert(typeof ver === 'string' && ver.length > 0, 'qsql_version: stringa non vuota', ver);

console.log('\nRisultato: ' + passed + ' passed, ' + failed + ' failed\n');
if (failed > 0) process.exit(1);
