/**
 * Tests for the /virtual column directive.
 *
 * Syntax: `colname type /virtual <sql-expression>`
 * Output: `colname type generated always as (<expr>) virtual`
 *
 * Virtual columns are:
 *  - included in CREATE TABLE at their declared position
 *  - excluded from TAPI INSERT/UPDATE parameter lists
 *  - included in SELECT lists / row record types
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { toDDL }      from '../../src/ddl.js';
import { resetSeed }  from '../../src/utils/sample.js';

beforeEach(() => { resetSeed(); });

describe('/virtual column directive', () => {

    test('simple computed label column', () => {
        const out = toDDL(`
invoices
    invoice_number /nn
    status_code vc10 /nn
    label vc100 /virtual (invoice_number || ' - ' || status_code)
`);
        expect(out).toContain("label");
        expect(out).toContain("generated always as");
        expect(out).toContain("(invoice_number || ' - ' || status_code)");
        expect(out).toContain("virtual");
    });

    test('CASE expression for billing status', () => {
        const out = toDDL(`
invoices
    invoice_number /nn
    status_code vc10 /nn
    not_billable_flag bool
    billing_status vc20 /virtual (CASE WHEN not_billable_flag = 'Y' THEN 'not_billable' ELSE status_code END)
`);
        expect(out).toContain("billing_status");
        expect(out).toContain("varchar2(20 char) generated always as");
        expect(out).toContain("CASE WHEN not_billable_flag = 'Y' THEN 'not_billable' ELSE status_code END");
        expect(out).toContain("virtual");
    });

    test('virtual column appears at declared position in CREATE TABLE', () => {
        const out = toDDL(`
products
    name /nn vc100
    price num(10,2) /nn
    price_label vc30 /virtual ('$' || to_char(price, 'FM999,999.00'))
    active bool
`);
        // price_label must appear between price and active in the table body
        const priceIdx      = out.indexOf('price');
        const priceLabelIdx = out.indexOf('price_label');
        const activeIdx     = out.indexOf('active');
        expect(priceLabelIdx).toBeGreaterThan(priceIdx);
        expect(priceLabelIdx).toBeLessThan(activeIdx);
    });

    test('expression without outer parens is wrapped automatically', () => {
        const out = toDDL(`
items
    a_col /nn
    b_col /nn
    ab_label vc50 /virtual a_col || ':' || b_col
`);
        // Generator must wrap bare expressions in parens
        expect(out).toContain('generated always as (');
        expect(out).toContain('virtual');
    });

    test('/virtual column excluded from TAPI parameters', () => {
        const out = toDDL(`
orders /api
    status_code vc10 /nn
    label vc100 /virtual (status_code || '-label')
`);
        // p_label parameter must NOT appear in insert/update procedures
        const insertIdx = out.indexOf('procedure ins(');
        const updateIdx = out.indexOf('procedure upd(');
        // Find end of ins() signature (next semicolon after the opening paren)
        const insEnd = out.indexOf(';', insertIdx);
        const updEnd = out.indexOf(';', updateIdx);

        const insSig = out.substring(insertIdx, insEnd);
        const updSig = out.substring(updateIdx, updEnd);

        expect(insSig).not.toContain('p_label');
        expect(updSig).not.toContain('p_label');
    });

    test('/virtual column included in SELECT record type', () => {
        const out = toDDL(`
orders /api
    status_code vc10 /nn
    label vc100 /virtual (status_code || '-label')
`);
        // The row record type or select cursor should include the label column
        expect(out).toMatch(/label\s+varchar2/);
    });

});
