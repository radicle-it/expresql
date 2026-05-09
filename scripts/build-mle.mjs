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

const bundle = readFileSync('dist/espresql.js', 'utf8');
const output = polyfill + bundle;
writeFileSync('dist/espresql.mle.cjs', output, 'utf8');
console.log('MLE bundle written: dist/espresql.mle.cjs (' + output.length + ' bytes)');
