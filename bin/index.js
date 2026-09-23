#! /usr/bin/env node
import { expresql, fromJSON, fromDBML } from '../dist/expresql.js';
import fs from 'fs';
import { basename, extname, dirname, join } from 'path';

try {
    const args     = process.argv.slice(2);
    const fromDbml = args.includes('--from-dbml');
    const toEsql   = args.includes('--to-esql');
    const toDbml   = args.includes('--dbml');
    const file     = args.find(a => !a.startsWith('--'));

    if (!file) {
        console.error('Usage: expresql [--dbml | --from-dbml [--to-esql]] <file.esql|.json|.dbml>');
        process.exit(1);
    }

    const text  = fs.readFileSync(file).toString();
    const ext   = extname(file);
    const stem  = basename(file, ext);
    const dir   = dirname(file);

    if (fromDbml || ext === '.dbml') {
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

    process.exit(0);

} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}
