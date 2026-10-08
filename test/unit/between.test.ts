/**
 * /between with signed and decimal bounds, and the name of its constraint (2026-10-08). The lexer makes "-90" two tokens ("-", "90"): the bounds
 * used to be read as the token after /between and the third one, which gave "check (lat between - and and)".
 */
import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

function ddl(columns: string): string {
    return toDDL('# settings = { db: "26ai", prefix: "zz_" }\nthing\n' + columns).toLowerCase();
}

describe('/between bounds', () => {
    test('positive bounds', () => {
        expect(ddl('  n num(3,0) /between 0 and 168\n')).toContain('check (n between 0 and 168)');
    });
    test('a negative lower bound', () => {
        expect(ddl('  lat num(9,6) /between -90 and 90\n')).toContain('check (lat between -90 and 90)');
    });
    test('negative bounds on both sides, with other options after', () => {
        expect(ddl('  t num(4,1) /between -40 and -5 /nn\n')).toContain('check (t between -40 and -5)');
    });
    test('the constraint takes the object prefix, like the _ck of a column', () => {
        expect(ddl('  lat num(9,6) /between -90 and 90\n')).toContain('constraint zz_thing_lat_bet');
    });
    test('no prefix, no prefix in the name either', () => {
        expect(toDDL('thing\n  n num(3,0) /between 0 and 9\n').toLowerCase()).toContain('constraint thing_n_bet');
    });
    test('decimal bounds', () => {
        expect(ddl('  p num(5,2) /between 0.5 and 99.5\n')).toContain('check (p between 0.5 and 99.5)');
    });
});
