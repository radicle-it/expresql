#! /usr/bin/env node
import { expresql, fromJSON, fromDBML } from '../dist/expresql.js';
import fs from 'fs';
import { basename, extname, dirname, join } from 'path';

try {
    const args     = process.argv.slice(2);
    const fromDbml = args.includes('--from-dbml');
    const toEsql   = args.includes('--to-esql');
    const toDbml   = args.includes('--dbml');
    const diff     = args.includes('--diff');
    const file     = args.find(a => !a.startsWith('--'));

    if (!file) {
        console.error('Usage: expresql [--dbml | --from-dbml [--to-esql]] <file.esql|.json|.dbml>\n       expresql --diff <old.esql> <new.esql>');
        process.exit(1);
    }

    const text  = fs.readFileSync(file).toString();
    const ext   = extname(file);
    const stem  = basename(file, ext);
    const dir   = dirname(file);

    if (diff) {
        // 2.7.0: the migration from one version of a model to the next (ocean-code 00-docs/01c §3.2) -- the same
        // toDiff as the web editor's "# ---": the script on stdout, the warnings on stderr; exit 2 when a statement
        // needs a manual intervention (a rename, a lossy type change), so a pipeline cannot take it as complete
        const files = args.filter(a => !a.startsWith('--'));
        if (files.length !== 2) {
            console.error('Usage: expresql --diff <old.esql> <new.esql>');
            process.exit(1);
        }
        const { toDiff } = await import('../dist/expresql.js');
        const result = toDiff(fs.readFileSync(files[0]).toString(), fs.readFileSync(files[1]).toString());
        for (const w of result.warnings) console.error(`${w.level}: ${w.table}${w.column ? '.' + w.column : ''}: ${w.message}`);
        const manual = result.summary.statementsRequiringIntervention;
        process.stdout.write(result.sql + '\n', () => process.exit(manual > 0 ? 2 : 0));

    } else if (fromDbml || ext === '.dbml') {
        // DBML → ESQL or DDL
        const fmt    = toEsql ? 'esql' : 'ddl';
        const result = await fromDBML(text, { outputFormat: fmt });
        if (toEsql) {
            const outFile = join(dir, stem + '.esql');
            fs.writeFileSync(outFile, result, 'utf8');
            console.error(`ESQL written to ${outFile}`);
        } else {
            process.stdout.write(result + '\n');
        }

    } else if (toDbml) {
        // ESQL → DBML
        const { toDBML } = await import('../dist/expresql.js');
        const dbml    = toDBML(text);
        const outFile = join(dir, stem + '.dbml');
        fs.writeFileSync(outFile, dbml, 'utf8');
        console.error(`DBML written to ${outFile} (${dbml.split('\n').length} lines)`);

    } else if (ext === '.json') {
        // JSON → DDL (existing behaviour)
        const key = stem.includes('/') ? stem.substring(stem.lastIndexOf('/') + 1) : stem;
        console.log(fromJSON(text, key));

    } else {
        // ESQL → DDL (default)
        console.log(new expresql(text).getDDL());
    }

    // 2.2.0 — exit only once stdout is written: process.exit right after a large console.log cut the output when it
    // went to a pipe or a file (1,482 lines of 6,495, no error)
    if (!diff) process.stdout.write('', () => process.exit(0));

} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}
