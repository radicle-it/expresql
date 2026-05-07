// @ts-ignore – chance has no bundled type declarations
import Chance from 'chance';
import lexer from './lexer.js';

export function generateSample(
    lTable:  string,
    lColumn: string,
    lType:   string,
    values:  unknown[] | null,
): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chance: any = new (Chance as any)(seed++);
    const type   = lType.toUpperCase();
    const table  = lTable.toUpperCase();
    const column = lColumn.toUpperCase();

    if (values != null && 0 < values.length) {
        const min = 0;
        const max = values.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = values[Math.floor(seededRandom() * (max - min)) + min];
        if (   !type.startsWith('INTEGER') && !type.startsWith('NUMBER') && !type.startsWith('DATE')
            && (!value.toLowerCase || value.toLowerCase() !== 'null')
            && (!value.charAt || (value.charAt(0) !== 'q' && value.charAt(1) !== '\''))
        ) {
            if (value.charAt && value.charAt(0) === '\'')
                value = (value as string).substring(1, (value as string).length - 1);
            value = (value as string).split('\'').join('\'\'');
            value = '\'' + value + '\'';
        }
        return value;
    }

    if (column === 'NAME' && 0 <= table.indexOf('DEPARTMENT')) {
        const depts = ['Sales', 'Finance', 'Delivery', 'Manufacturing'];
        return '\'' + depts[Math.floor(seededRandom() * depts.length)] + '\'';
    }

    if (chance[column.toLowerCase()] !== undefined
        && column.indexOf('NAME') < 0
    ) {
        return '\'' + chance[column.toLowerCase()]() + '\'';
    }
    if (column === 'FIRST_NAME')
        return '\'' + chance.first() + '\'';
    if (column === 'LAST_NAME')
        return '\'' + chance.last() + '\'';
    if (0 <= column.indexOf('NAME'))
        return '\'' + chance.name() + '\'';

    if (0 < column.indexOf('ADDRESS'))
        return '\'' + chance.address() + '\'';

    if (column === 'LOCATION')
        return '\'' + chance.city() + '\'';

    if (column === 'DESCRIPTION') {
        let descr: string = chance.paragraph({ sentences: 2 });
        const tSrc = lexer(lType, false, true, '');
        let len = 400;
        let pos = -1;
        for (let i = 0; i < tSrc.length; i++) {
            const t = tSrc[i].value;
            if (t === '(') {
                pos = i + 1;
                continue;
            }
            if (0 < pos && t === ')') {
                len = parseInt(tSrc[pos].value);
                break;
            }
        }
        if (len < descr.length)
            descr = descr.substring(0, len);
        return '\'' + descr + '\'';
    }

    if (column === 'JOB') {
        const jobs = ['Engineer', 'Consultant', 'Architect', 'Manager', 'Analyst', 'Specialist', 'Evangelist', 'Salesman'];
        return '\'' + jobs[Math.floor(seededRandom() * jobs.length)] + '\'';
    }

    if (type.startsWith('INTEGER') || type.startsWith('NUMBER'))
        return Math.floor(seededRandom() * 100);

    if (type.startsWith('DATE') || type.startsWith('TIMESTAMP')) {
        const offset = Math.floor(seededRandom() * 100);
        return 'sysdate-' + offset;
    }
    if (type === 'BLOB' || type === 'LONG')
        return 'null';

    return '\'N/A\'';
}

let seed = 1;

export function resetSeed(): void {
    seed = 1;
}

function seededRandom(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

export default { generateSample, resetSeed };
