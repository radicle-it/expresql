import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { quicksql } from '../src/ddl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Synthetic 1000-attribute input (same as profile.js)
let syntheticInput = "table\n";
for (let i = 0; i < 1000; i++)
    syntheticInput += ' '.repeat(3 * Math.floor(i / 20) + 3) + 'attr' + i + '\n';

// Real-world inspectwise schema
const inspectwise = readFileSync(
    resolve(__dirname, '../../quicksql-extension-vscode/examples/inspectwise.quicksql'),
    'utf8'
);

function median(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function bench(name, input, runs) {
    const times = [];
    let output;
    for (let i = 0; i < runs; i++) {
        const t0 = performance.now();
        output = quicksql.toDDL(input);
        times.push(performance.now() - t0);
    }
    const med = median(times);
    console.log(`${name}: median ${med.toFixed(2)} ms  (runs: ${times.map(t => t.toFixed(2)).join(', ')})`);
    return { name, median: med, outputLen: output.length };
}

console.log('QuickSQL Benchmark\n');

// Warmup
quicksql.toDDL(syntheticInput);
quicksql.toDDL(inspectwise);

const r1 = bench('synthetic-1000', syntheticInput, 5);
const r2 = bench('inspectwise-484', inspectwise, 5);

console.log(`\nOutput lengths: synthetic=${r1.outputLen}, inspectwise=${r2.outputLen}`);
