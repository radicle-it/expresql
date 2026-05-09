/**
 * Integration tests for the Db2 layered TAPI (SQL PL, schema-based).
 *
 * QSQL syntax: table-level directives on the table name line
 *   "employees /api full+hks\n  name"
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { toDDL } from '../../src/ddl.js';
import { resetSeed } from '../../src/utils/sample.js';

beforeEach(() => { resetSeed(); });

const DB2 = '# settings = {"dialect":"db2","inserts":"no"}';

function ddl(input: string): string {
    return toDDL(input + '\n' + DB2);
}

// ── §1 Tier: full+hks ─────────────────────────────────────────────────────────

describe('§1 full+hks tier', () => {

    test('generates --#SET TERMINATOR @', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('--#SET TERMINATOR @');
    });

    test('creates DAL schema', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('create schema employees_dal @');
    });

    test('creates HKS schema', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('create schema employees_hks @');
    });

    test('creates SVC schema', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('create schema employees_svc @');
    });

    test('creates RST schema (default ifc)', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('create schema employees_rst @');
    });

    test('DAL p_get_by_id uses DYNAMIC RESULT SETS 1 cursor', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('dynamic result sets 1');
        expect(out).toContain('declare c cursor with return for');
        expect(out).toContain('select * from employees where id = p_id');
    });

    test('DAL p_insert_row uses IDENTITY_VAL_LOCAL()', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('identity_val_local()');
    });

    test('DAL p_delete_row deletes by PK', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('delete from employees where id = p_id');
    });

    test('HKS p_validate is a stub', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('employees_hks.p_validate');
        expect(out).toContain('add validation logic');
    });

    test('SVC ins calls HKS validate', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain("call employees_hks.p_validate('INSERT', '')");
    });

    test('SVC ins calls DAL p_insert_row', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('call employees_dal.p_insert_row(');
    });

    test('SVC ins has exit handler for sqlexception', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('declare exit handler for sqlexception');
        expect(out).toContain("set p_status = 'ERROR'");
    });

    test('RST get delegates to SVC', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('call employees_svc.get(');
    });

    test('RST returns HTTP status codes', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('set p_status = 200');
        expect(out).toContain('set p_status = 201');
        expect(out).toContain('set p_status = 500');
    });

    test('RST error handler uses GET DIAGNOSTICS', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('get diagnostics exception 1 p_result = message_text');
    });

    test('no Oracle PL/SQL syntax in output', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).not.toContain('create or replace package');
        expect(out).not.toContain('%rowtype');
        expect(out).not.toContain(':=');
        expect(out).not.toContain('raise_application_error');
    });

    test('JSON output uses json_object', () => {
        const out = ddl('employees /api full+hks\n  name');
        expect(out).toContain('json_object(');
    });

});

// ── §2 Tier: full (no HKS) ────────────────────────────────────────────────────

describe('§2 full tier (no HKS)', () => {

    test('generates DAL and SVC but no HKS schema', () => {
        const out = ddl('employees /api full\n  name');
        expect(out).toContain('create schema employees_dal @');
        expect(out).toContain('create schema employees_svc @');
        expect(out).not.toContain('create schema employees_hks @');
    });

    test('SVC ins does not call HKS validate', () => {
        const out = ddl('employees /api full\n  name');
        expect(out).not.toContain('employees_hks.p_validate');
    });

});

// ── §3 Tier: service+hks ──────────────────────────────────────────────────────

describe('§3 service+hks tier (no DAL)', () => {

    test('generates HKS and SVC but no DAL schema', () => {
        const out = ddl('employees /api service+hks\n  name');
        expect(out).toContain('create schema employees_hks @');
        expect(out).toContain('create schema employees_svc @');
        expect(out).not.toContain('create schema employees_dal @');
    });

    test('SVC absorbs private DML when DAL absent', () => {
        const out = ddl('employees /api service+hks\n  name');
        expect(out).toContain('private insert (absorbed from absent _dal)');
    });

    test('SVC del performs direct DELETE', () => {
        const out = ddl('employees /api service+hks\n  name');
        expect(out).toContain('private delete (absorbed from absent _dal)');
        expect(out).toContain('delete from employees where id = p_id');
    });

});

// ── §4 Tier: service (no DAL, no HKS) ────────────────────────────────────────

describe('§4 service tier', () => {

    test('generates SVC only (no DAL, no HKS)', () => {
        const out = ddl('employees /api service\n  name');
        expect(out).toContain('create schema employees_svc @');
        expect(out).not.toContain('create schema employees_dal @');
        expect(out).not.toContain('create schema employees_hks @');
    });

    test('SVC does not call HKS', () => {
        const out = ddl('employees /api service\n  name');
        expect(out).not.toContain('employees_hks');
    });

});

// ── §5 Tier: lookup+hks ───────────────────────────────────────────────────────

describe('§5 lookup+hks tier (read-only + hooks)', () => {

    test('generates HKS but no DAL and no SVC', () => {
        const out = ddl('employees /api lookup+hks\n  name');
        expect(out).toContain('create schema employees_hks @');
        expect(out).not.toContain('create schema employees_dal @');
        expect(out).not.toContain('create schema employees_svc @');
    });

    test('RST get uses private get when no SVC/DAL', () => {
        const out = ddl('employees /api lookup+hks\n  name');
        expect(out).toContain('private get (absorbed from absent _svc/_dal)');
    });

});

// ── §6 Tier: lookup ───────────────────────────────────────────────────────────

describe('§6 lookup tier (read-only)', () => {

    test('generates RST only, no DAL/HKS/SVC schemas', () => {
        const out = ddl('employees /api lookup\n  name');
        expect(out).toContain('create schema employees_rst @');
        expect(out).not.toContain('create schema employees_dal @');
        expect(out).not.toContain('create schema employees_hks @');
        expect(out).not.toContain('create schema employees_svc @');
    });

});

// ── §7 Numeric tier aliases ───────────────────────────────────────────────────

describe('§7 Numeric tier aliases', () => {

    test('3h maps to full+hks', () => {
        const out = ddl('employees /api 3h\n  name');
        expect(out).toContain('tier=full+hks');
    });

    test('3 maps to full', () => {
        const out = ddl('employees /api 3\n  name');
        expect(out).toContain('tier=full');
        expect(out).not.toContain('employees_hks');
    });

    test('2 maps to service', () => {
        const out = ddl('employees /api 2\n  name');
        expect(out).toContain('tier=service');
    });

    test('1 maps to lookup', () => {
        const out = ddl('employees /api 1\n  name');
        expect(out).toContain('tier=lookup');
    });

});

// ── §8 Multiple tables ────────────────────────────────────────────────────────

describe('§8 Multiple tables with different tiers', () => {

    test('each table generates its own schema set', () => {
        const out = ddl(
            'departments /api full\n  name\n' +
            'employees /api service\n  name\n  department_id /fk departments'
        );
        expect(out).toContain('create schema departments_dal @');
        expect(out).toContain('create schema employees_svc @');
        expect(out).not.toContain('create schema employees_dal @');
    });

});

// ── §9 Bare /api defaults to full+hks ────────────────────────────────────────

describe('§9 Bare /api directive', () => {

    test('bare /api generates full+hks tier', () => {
        const out = ddl('employees /api\n  name');
        expect(out).toContain('tier=full+hks');
        expect(out).toContain('create schema employees_dal @');
        expect(out).toContain('create schema employees_hks @');
    });

});
