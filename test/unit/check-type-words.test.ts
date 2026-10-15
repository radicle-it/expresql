/**
 * A type word inside a /check or /values list is a value, not the type of the column (2026-10-13): "kind vc10 /check
 * TEXT, NUMBER, DATE, FLAG" used to become a date column (with the midnight check of dateonly), then a number; the
 * type keywords are read only between the name and the first /option (DdlNode.indexOfType).
 */
import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

function ddl(columns: string): string {
    return toDDL('# settings = { db: "26ai", prefix: "zz_", dateonly: yes }\nthing\n' + columns).toLowerCase();
}

describe('type words inside a /check list', () => {
    test('DATE as a value keeps a varchar column, without the midnight check', () => {
        const out = ddl('  kind vc10 /nn /default TEXT /check TEXT, NUMBER, DATE, FLAG\n');
        expect(out).toMatch(/kind\s+varchar2\(10 char\) default on null 'text' not null/);
        expect(out).toContain("check (kind in ('text','number','date','flag'))");
        expect(out).not.toContain('kind_day_ck');
    });
    test('NUMERIC as a value (a prefix of num) keeps a varchar column', () => {
        expect(ddl('  kind vc10 /check X, NUMERIC\n')).toMatch(/kind\s+varchar2\(10 char\)/);
    });
    test('BOOLEAN and JSON as values keep a varchar column', () => {
        const out = ddl('  kind vc10 /check X, BOOLEAN, JSON\n');
        expect(out).toMatch(/kind\s+varchar2\(10 char\)/);
        expect(out).not.toMatch(/kind\s+boolean/);
    });
    test('a vector word as a value keeps a varchar column', () => {
        expect(ddl('  kind vc10 /check X, VECTOR\n')).toMatch(/kind\s+varchar2\(10 char\)/);
    });
    test('the type keywords before the options still work', () => {
        const out = ddl('  born date /nn\n  n num(5) /check 1, 2\n  ok yn\n');
        expect(out).toMatch(/born\s+date\b/);
        expect(out).toContain('born_day_ck');
        expect(out).toMatch(/n\s+number\(5\)/);
    });
    test('TIMESTAMP as a value stays TIMESTAMP, not the abbreviation ts (2.1.4)', () => {
        const out = ddl('  data_type vc20 /check NUMERIC, VARCHAR, DATE, TIMESTAMP, CLOB\n');
        expect(out).toMatch(/data_type\s+varchar2\(20 char\)/);
        expect(out).toContain("check (data_type in ('numeric','varchar','date','timestamp','clob'))");
    });
    test('the timestamp types written as types are still read', () => {
        const out = ddl('  at timestamp with local time zone /nn\n  tz timestamp with time zone\n  ts0 timestamp -- a timestamp\n');
        expect(out).toMatch(/at\s+timestamp with local time zone not null/);
        expect(out).toMatch(/tz\s+timestamp with time zone/);
        expect(out).toMatch(/ts0\s+timestamp\b/);
    });
    test('a column named like a type keeps its inferred type', () => {
        expect(ddl('  date\n')).toMatch(/date\s+date\b/);
    });
});
