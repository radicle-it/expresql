/**
 * Integration tests for the layered TAPI generator (api: "layered").
 * Verifies structural correctness of _dal, _hooks, and _svc package output.
 * No Oracle runtime required — all assertions are string-based.
 *
 * Companion spec: doc/development/TAPI-GENERATOR-TEST-SPECIFICATION.md (v1.2)
 * Architecture:   doc/development/TAPI-LAYERED-ARCHITECTURE.md (v1.3)
 */
import { describe, test, expect } from 'vitest';
import quicksql from '../../src/ddl.js';

function ddl(input: string, opts?: string): string {
    return new (quicksql as any)(input, opts).getDDL();
}

function segment(out: string, startMarker: string, endMarker: string): string {
    const start = out.indexOf(startMarker);
    if (start === -1) return '';
    const end = out.indexOf(endMarker, start + startMarker.length);
    return end === -1 ? out.slice(start) : out.slice(start, end + endMarker.length);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DOCTORS_QSQL = `\
doctors /api
  name vc200 /nn
  specialty vc100
  email vc200 /nn /unique
  row_version num /nn
# settings = {"api": "layered"}`.trim();

const DOCTORS_NO_VERSION_QSQL = `\
doctors /api
  name vc200 /nn
  email vc200 /nn
# settings = {"api": "layered"}`.trim();

const DOCTORS_PREFIX_QSQL = `\
doctors /api
  name vc200 /nn
  email vc200 /nn
  row_version num /nn
# settings = {"api": "layered", "prefix": "med"}`.trim();

const TWO_TABLES_QSQL = `\
specialties
  code vc10 /nn

doctors /api
  name vc200 /nn
  specialty_id /fk specialties
  row_version num /nn
# settings = {"api": "layered"}`.trim();

const DOCTORS_DROP_QSQL = `\
doctors /api
  name vc200 /nn
  row_version num /nn
# settings = {"api": "layered", "drop": "Y"}`.trim();

const SPECIALTIES_QSQL = `\
specialties /api
  label vc100 /nn
  row_version num /nn
# settings = {"api": "layered"}`.trim();

const DOCTORS_ROWVER_SETTING_QSQL = `\
doctors /api
  name vc200 /nn
  email vc200 /nn
# settings = {"api": "layered", "rowversion": "yes"}`.trim();

const DOCTORS_AUDITLOG_QSQL = `\
app_audit_log /api
  entity     vc128 /nn
  entity_id  num /nn
  operation  vc6 /nn
  old_values clob
  new_values clob

doctors /api /auditlog
  name vc200 /nn
  license_no vc20 /nn /unique
  row_version num /nn
# settings = {"api": "layered", "drop": "Y"}`.trim();

// Level 1 fallback: app_audit_log without old_values/new_values
const DOCTORS_AUDITLOG_L1_QSQL = `\
app_audit_log /api
  entity    vc128 /nn
  entity_id num /nn
  operation vc6 /nn

doctors /api /auditlog
  name vc200 /nn
  row_version num /nn
# settings = {"api": "layered"}`.trim();

// Level 1 with rowversion:yes — app_audit_log gets row_version, so create_rec has x_version out
const DOCTORS_AUDITLOG_ROWVER_QSQL = `\
app_audit_log /api
  entity    vc128 /nn
  entity_id num /nn
  operation vc6 /nn

doctors /api /auditlog
  name vc200 /nn
# settings = {"api": "layered", "rowversion": "yes"}`.trim();

// ── §4.1 Activation, mutual exclusion, and DROP ───────────────────────────────

describe('layered TAPI activation', () => {

    test('api:"layered" with /api directive emits _dal package spec', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('create or replace package doctors_dal');
    });

    test('api:"layered" with /api directive emits _hks package spec', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('create or replace package doctors_hks');
    });

    test('api:"layered" with /api directive emits _svc package spec', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('create or replace package doctors_svc');
    });

    test('api:"layered" does NOT emit the flat _api package', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).not.toContain('create or replace package doctors_api');
    });

    test('table without /api does not get layered packages', () => {
        const out = ddl(TWO_TABLES_QSQL);
        expect(out).not.toContain('create or replace package specialties_dal');
        expect(out).not.toContain('create or replace package specialties_hooks');
        expect(out).not.toContain('create or replace package specialties_svc');
    });

    test('api:"layered" without /api on any table emits no layered packages', () => {
        const out = ddl(`specialties\n  code vc10\n# settings = {"api": "layered"}`);
        expect(out).not.toContain('create or replace package specialties_dal');
        expect(out).not.toContain('create or replace package specialties_hooks');
        expect(out).not.toContain('create or replace package specialties_svc');
    });

    test('prefix is applied to all three package names', () => {
        const out = ddl(DOCTORS_PREFIX_QSQL);
        expect(out).toContain('create or replace package med_doctors_dal');
        expect(out).toContain('create or replace package med_doctors_hks');
        expect(out).toContain('create or replace package med_doctors_svc');
    });

    test('drop:"Y" with api:"layered" emits DROP PACKAGE for all three packages', () => {
        const out = ddl(DOCTORS_DROP_QSQL);
        expect(out).toContain('drop package');
        expect(out).toContain('doctors_dal');
        expect(out).toContain('doctors_hks');
        expect(out).toContain('doctors_svc');
    });

    test('drop:"Y" with api:"layered" does NOT emit drop package doctors_api', () => {
        const out = ddl(DOCTORS_DROP_QSQL);
        expect(out).not.toContain('doctors_api');
    });

});

// ── §4.2 DAL package specification ───────────────────────────────────────────

describe('DAL package specification', () => {

    test('subtype t_id anchored to PK column type', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('subtype t_id is doctors.id%type');
    });

    test('get_by_id returns %ROWTYPE', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('function get_by_id');
        expect(out).toContain('return doctors%rowtype');
    });

    test('insert_row uses IN OUT NOCOPY %ROWTYPE parameter', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('procedure insert_row');
        expect(out).toContain('p_row in out nocopy doctors%rowtype');
    });

    test('update_row uses IN OUT NOCOPY %ROWTYPE parameter', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('procedure update_row');
        expect(out).toContain('p_row in out nocopy doctors%rowtype');
    });

    test('delete_row accepts scalar PK via t_id', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalSpec = segment(out, 'create or replace package doctors_dal', 'end doctors_dal;');
        expect(dalSpec).toContain('procedure delete_row');
        expect(dalSpec).toContain('p_id in t_id');
    });

    test('c_err_stale_data constant declared in DAL spec', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalSpec = segment(out, 'create or replace package doctors_dal', 'end doctors_dal;');
        expect(dalSpec).toContain('c_err_stale_data');
        expect(dalSpec).toContain('-20001');
    });

    test('c_err_not_found constant declared in DAL spec', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalSpec = segment(out, 'create or replace package doctors_dal', 'end doctors_dal;');
        expect(dalSpec).toContain('c_err_not_found');
        expect(dalSpec).toContain('-20002');
    });

    test('c_err_locked constant declared in DAL spec', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalSpec = segment(out, 'create or replace package doctors_dal', 'end doctors_dal;');
        expect(dalSpec).toContain('c_err_locked');
        expect(dalSpec).toContain('-20003');
    });

    test('lock_by_id declared in DAL spec', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalSpec = segment(out, 'create or replace package doctors_dal', 'end doctors_dal;');
        expect(dalSpec).toContain('function lock_by_id');
        expect(dalSpec).toContain('return doctors%rowtype');
    });

    test('DAL spec ends with correct package name', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('end doctors_dal;');
    });

});

// ── DAL body — lock_by_id ─────────────────────────────────────────────────────

describe('DAL body — lock_by_id (pessimistic locking)', () => {

    test('lock_by_id uses SELECT FOR UPDATE NOWAIT', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out, 'create or replace package body doctors_dal', 'end doctors_dal;');
        const lockFn = segment(dalBody, 'function lock_by_id', 'end lock_by_id;');
        expect(lockFn).toContain('for update nowait');
        expect(lockFn).toContain('select * into l_row');
    });

    test('lock_by_id translates no_data_found to c_err_not_found', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out, 'create or replace package body doctors_dal', 'end doctors_dal;');
        const lockFn = segment(dalBody, 'function lock_by_id', 'end lock_by_id;');
        expect(lockFn).toContain('when no_data_found then');
        expect(lockFn).toContain('c_err_not_found');
    });

    test('lock_by_id translates resource_busy to c_err_locked', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out, 'create or replace package body doctors_dal', 'end doctors_dal;');
        const lockFn = segment(dalBody, 'function lock_by_id', 'end lock_by_id;');
        expect(lockFn).toContain('when resource_busy then');
        expect(lockFn).toContain('c_err_locked');
    });

    test('DAL body declares resource_busy exception with pragma exception_init(-54)', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out, 'create or replace package body doctors_dal', 'end doctors_dal;');
        expect(dalBody).toContain('resource_busy exception');
        expect(dalBody).toContain('pragma exception_init(resource_busy, -54)');
    });

});

// ── §4.3 DAL package body — insert_row ───────────────────────────────────────

describe('DAL body — insert_row', () => {

    test('insert_row body does not include PK in the INSERT column list', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).not.toMatch(/insert\s+into\s+doctors\s*\(\s*\n?\s*id\b/i);
    });

    test('insert_row body contains RETURNING clause that populates p_row.id', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('returning');
        expect(dalBody).toContain('into p_row.id');
    });

    test('insert_row RETURNING clause includes row_version', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('row_version');
        expect(dalBody).toContain('into p_row.id');
    });

});

// ── §4.4 DAL package body — update_row (optimistic locking) ──────────────────

describe('DAL body — update_row optimistic locking (row_version present)', () => {

    test('update_row WHERE clause filters on row_version', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('and row_version = p_row.row_version');
    });

    test('update_row does not include PK in the SET clause', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).not.toMatch(/\bset\b[\s\S]*?\bid\s*=\s*p_row\.id/i);
    });

    test('update_row probes SQL%ROWCOUNT for stale-data detection', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('if sql%rowcount = 0 then');
    });

    test('update_row raises c_err_stale_data on version mismatch', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('raise_application_error(c_err_stale_data');
    });

    test('update_row raises c_err_not_found when row is absent', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('raise_application_error(c_err_not_found');
    });

});

// ── §4.4b DAL update_row fallback — no row_version ───────────────────────────

describe('DAL body — update_row fallback (no row_version)', () => {

    test('update_row has no AND row_version clause when column is absent', () => {
        const out = ddl(DOCTORS_NO_VERSION_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).not.toContain('and row_version');
    });

    test('update_row has no SQL%ROWCOUNT stale-data check when column is absent', () => {
        const out = ddl(DOCTORS_NO_VERSION_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).not.toContain('if sql%rowcount = 0 then');
    });

    test('SVC update procedure has no p_row_version param when column is absent', () => {
        const out = ddl(DOCTORS_NO_VERSION_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).not.toContain('p_row_version');
        expect(svcSpec).not.toContain('x_version');
    });

});

// ── §4.5 HKS package specification ───────────────────────────────────────────

describe('HOOKS package specification', () => {

    test('validate procedure has p_operation IN VARCHAR2 parameter', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure validate');
        expect(hksSpec).toContain('p_operation in varchar2');
    });

    test('validate procedure has p_row IN OUT NOCOPY %ROWTYPE parameter', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('p_row in out nocopy doctors%rowtype');
    });

    test('before_insert declared with IN OUT NOCOPY %ROWTYPE', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure before_insert');
        expect(hksSpec).toContain('p_row in out nocopy doctors%rowtype');
    });

    test('before_update declared with IN OUT NOCOPY %ROWTYPE', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure before_update');
    });

    test('before_delete declared with scalar t_id parameter', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure before_delete');
        expect(hksSpec).toContain('p_id in doctors_dal.t_id');
    });

    test('after_insert declared with IN (read-only) %ROWTYPE, not IN OUT', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure after_insert');
        const afterInsertIdx = hksSpec.indexOf('procedure after_insert');
        const afterInsertLine = hksSpec.slice(afterInsertIdx, afterInsertIdx + 120);
        expect(afterInsertLine).not.toContain('in out');
        expect(afterInsertLine).toContain('in doctors%rowtype');
    });

    test('after_update declared with IN (read-only) %ROWTYPE', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure after_update');
    });

    test('after_delete declared with scalar t_id parameter', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksSpec = segment(out,
            'create or replace package doctors_hks',
            'end doctors_hks;');
        expect(hksSpec).toContain('procedure after_delete');
        expect(hksSpec).toContain('p_id in doctors_dal.t_id');
    });

    test('HOOKS spec ends with correct package name', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('end doctors_hks;');
    });

});

// ── §4.6 HKS default no-op body ──────────────────────────────────────────────

describe('HOOKS default no-op body', () => {

    test('HOOKS package body is emitted', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('create or replace package body doctors_hks');
    });

    test('validate stub has NULL body', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).toContain('procedure validate');
        expect(hksBody).toContain('begin null;');
        expect(hksBody).toContain('end validate;');
    });

    test('before_insert stub is a no-op', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).toContain('procedure before_insert');
        expect(hksBody).toContain('begin null;');
    });

    test('after_insert stub is a no-op', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).toContain('procedure after_insert');
        expect(hksBody).toContain('begin null;');
    });

    test('no-op body ends with correct package name', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).toContain('end doctors_hks;');
    });

    test('warning comment is present in no-op body', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).toContain('-- warning: this file is generated once');
    });

});

// ── §4.7 SVC package specification ───────────────────────────────────────────

describe('SVC package specification', () => {

    test('get function declared returning %ROWTYPE', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('function get');
        expect(svcSpec).toContain('return doctors%rowtype');
    });

    test('create procedure declared (no entity suffix)', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('procedure create_rec');
        expect(svcSpec).not.toContain('procedure create_rec_doctor');
    });

    test('create exposes business columns via t_rec record type', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('type t_rec is record');
        expect(svcSpec).toContain('doctors.name%type');
        expect(svcSpec).toContain('doctors.email%type');
    });

    test('create_rec has p_rec IN t_rec and x_id OUT; no x_version OUT', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('p_rec');
        expect(svcSpec).toContain('in  t_rec');
        expect(svcSpec).toContain('x_id');
        expect(svcSpec).toContain('out doctors.id%type');
        expect(svcSpec).not.toContain('x_version');
    });

    test('nullable column is in t_rec type definition', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('specialty');
        expect(svcSpec).toContain('doctors.specialty%type');
    });

    test('update procedure declared (no entity suffix)', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('procedure update_rec');
        expect(svcSpec).not.toContain('procedure update_rec_doctor');
    });

    test('update carries p_row_version IN param for optimistic locking', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('p_row_version');
        expect(svcSpec).toContain('doctors.row_version%type');
    });

    test('delete declared with scalar PK parameter (no entity suffix)', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('procedure delete_rec');
        expect(svcSpec).not.toContain('procedure delete_rec_doctor');
        expect(svcSpec).toContain('p_id in');
        expect(svcSpec).toContain('doctors.id%type');
    });

    test('SVC spec ends with correct package name', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).toContain('end doctors_svc;');
    });

});

// ── §4.8 SVC body — hook call sequence ───────────────────────────────────────

describe('SVC body — create hook call sequence', () => {

    test('validate called with INSERT operation', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.validate');
        expect(svcBody).toContain("'insert'");
    });

    test('before_insert called before DAL insert_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.before_insert');
        expect(svcBody).toContain('doctors_dal.insert_row');
        expect(svcBody.indexOf('doctors_hks.before_insert'))
            .toBeLessThan(svcBody.indexOf('doctors_dal.insert_row'));
    });

    test('DAL insert_row called with l_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_dal.insert_row');
        expect(svcBody).toContain('p_row => l_row');
    });

    test('after_insert called after DAL insert_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.after_insert');
        expect(svcBody.indexOf('doctors_dal.insert_row'))
            .toBeLessThan(svcBody.indexOf('doctors_hks.after_insert'));
    });

    test('dup_val_on_index caught and remapped to a user-error code', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('when dup_val_on_index then');
        expect(svcBody).toMatch(/raise_application_error\s*\(\s*-20\d{3}\s*,/);
    });

    test('WHEN OTHERS absent from SVC body — call stack preserved', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).not.toContain('when others');
    });

});

describe('SVC body — update hook call sequence', () => {

    test('validate called with UPDATE operation', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.validate');
        expect(svcBody).toContain("'update'");
    });

    test('before_update called before DAL update_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.before_update');
        expect(svcBody).toContain('doctors_dal.update_row');
        expect(svcBody.indexOf('doctors_hks.before_update'))
            .toBeLessThan(svcBody.indexOf('doctors_dal.update_row'));
    });

    test('DAL update_row called with l_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_dal.update_row');
        expect(svcBody).toContain('p_row => l_row');
    });

    test('after_update called after DAL update_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.after_update');
        expect(svcBody.indexOf('doctors_dal.update_row'))
            .toBeLessThan(svcBody.indexOf('doctors_hks.after_update'));
    });

    test('update body assigns p_row_version to l_row.row_version before DAL call', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('l_row.row_version');
        expect(svcBody).toContain('p_row_version');
        expect(svcBody.indexOf('l_row.row_version'))
            .toBeLessThan(svcBody.indexOf('doctors_dal.update_row'));
    });

    test('SVC update_rec has no x_version OUT — trigger owns row_version', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        const updateRec = segment(svcBody, 'procedure update_rec', 'end update_rec;');
        expect(updateRec).not.toContain('x_version');
    });

});

describe('SVC body — delete hook call sequence', () => {

    test('before_delete called before DAL delete_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.before_delete');
        expect(svcBody).toContain('doctors_dal.delete_row');
        expect(svcBody.indexOf('doctors_hks.before_delete'))
            .toBeLessThan(svcBody.indexOf('doctors_dal.delete_row'));
    });

    test('DAL delete_row called with p_id', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_dal.delete_row');
        expect(svcBody).toContain('p_id');
    });

    test('after_delete called after DAL delete_row', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_hks.after_delete');
        expect(svcBody.indexOf('doctors_dal.delete_row'))
            .toBeLessThan(svcBody.indexOf('doctors_hks.after_delete'));
    });

});

// ── §4.9 SVC body — row assembly ─────────────────────────────────────────────

describe('SVC body — scalar to %ROWTYPE assembly', () => {

    test('create body declares l_row working variable', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('l_row');
        expect(svcBody).toContain('doctors%rowtype');
    });

    test('p_rec.name is assigned to l_row.name before the hook sequence', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('l_row.name');
        expect(svcBody).toContain('p_rec.name');
        expect(svcBody.indexOf('l_row.name'))
            .toBeLessThan(svcBody.indexOf('doctors_hks.validate'));
    });

    test('p_rec.email is assigned to l_row.email before the hook sequence', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('l_row.email');
        expect(svcBody).toContain('p_rec.email');
        expect(svcBody.indexOf('l_row.email'))
            .toBeLessThan(svcBody.indexOf('doctors_hks.validate'));
    });

    test('x_id populated from l_row.id after insert', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('x_id');
        expect(svcBody).toContain('l_row.id');
        expect(svcBody.indexOf('doctors_dal.insert_row'))
            .toBeLessThan(svcBody.indexOf('x_id'));
    });

    test('SVC create_rec has no x_version OUT — trigger owns row_version', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        const createRec = segment(svcBody, 'procedure create_rec', 'end create_rec;');
        expect(createRec).not.toContain('x_version');
    });

});

// ── §4.10 Output ordering ─────────────────────────────────────────────────────

describe('package output ordering', () => {

    test('DAL spec emitted before HKS spec', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out.indexOf('create or replace package doctors_dal'))
            .toBeLessThan(out.indexOf('create or replace package doctors_hks'));
    });

    test('HKS spec emitted before SVC spec', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out.indexOf('create or replace package doctors_hks'))
            .toBeLessThan(out.indexOf('create or replace package doctors_svc'));
    });

    test('DAL spec precedes its own body', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out.indexOf('create or replace package doctors_dal as'))
            .toBeLessThan(out.indexOf('create or replace package body doctors_dal'));
    });

    test('HKS spec precedes its own body', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out.indexOf('create or replace package doctors_hks as'))
            .toBeLessThan(out.indexOf('create or replace package body doctors_hks'));
    });

    test('SVC spec precedes its own body', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out.indexOf('create or replace package doctors_svc as'))
            .toBeLessThan(out.indexOf('create or replace package body doctors_svc'));
    });

});

// ── §4.11 SVC procedure naming — entity-agnostic ─────────────────────────────

describe('SVC procedure naming — entity-agnostic (no entity suffix)', () => {

    test('all entities expose create, update, delete without entity suffix', () => {
        const out = ddl(SPECIALTIES_QSQL);
        const svcBody = segment(out,
            'create or replace package body specialties_svc',
            'end specialties_svc;');
        expect(svcBody).toContain('procedure create_rec');
        expect(svcBody).toContain('procedure update_rec');
        expect(svcBody).toContain('procedure delete_rec');
    });

    test('no entity suffix on SVC procedures for specialties table', () => {
        const out = ddl(SPECIALTIES_QSQL);
        expect(out).not.toContain('procedure create_rec_specialty');
        expect(out).not.toContain('procedure create_rec_specialties');
        expect(out).not.toContain('procedure update_rec_specialty');
        expect(out).not.toContain('procedure delete_rec_specialty');
    });

    test('package names use the full plural table name regardless', () => {
        const out = ddl(SPECIALTIES_QSQL);
        expect(out).toContain('create or replace package specialties_dal');
        expect(out).toContain('create or replace package specialties_hks');
        expect(out).toContain('create or replace package specialties_svc');
    });

});

// ── §4.11b Optimistic locking via rowversion global setting ───────────────────

describe('optimistic locking — rowversion global setting', () => {

    test('rowversion:yes global setting triggers AND row_version in update_row WHERE', () => {
        const out = ddl(DOCTORS_ROWVER_SETTING_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('and row_version = p_row.row_version');
    });

    test('rowversion:yes global setting triggers SQL%ROWCOUNT check', () => {
        const out = ddl(DOCTORS_ROWVER_SETTING_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('if sql%rowcount = 0 then');
    });

    test('rowversion:yes global setting triggers RETURNING row_version in insert_row', () => {
        const out = ddl(DOCTORS_ROWVER_SETTING_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).toContain('returning');
        expect(dalBody).toContain('row_version');
        expect(dalBody).toContain('into p_row.id');
    });

    test('rowversion:yes global setting adds p_row_version to SVC update_rec (no x_version out)', () => {
        const out = ddl(DOCTORS_ROWVER_SETTING_QSQL);
        const svcSpec = segment(out,
            'create or replace package doctors_svc',
            'end doctors_svc;');
        expect(svcSpec).toContain('p_row_version');
        expect(svcSpec).not.toContain('x_version');
    });

});

// ── §4.13 Audit logging — /auditlog directive ────────────────────────────────

describe('audit logging — /auditlog directive', () => {

    test('app_audit_log table is emitted when explicitly defined in QSQL', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out).toContain('create table app_audit_log');
    });

    test('app_audit_log has entity, entity_id, operation columns', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out).toContain('entity');
        expect(out).toContain('entity_id');
        expect(out).toContain('operation');
    });

    test('app_audit_log_svc package is generated for the explicitly defined audit table', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out).toContain('create or replace package app_audit_log_svc');
    });

    test('doctors_aud package spec is emitted', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out).toContain('create or replace package doctors_aud');
    });

    test('audit spec declares log_insert, log_update, log_delete procedures', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audSpec = segment(out,
            'create or replace package doctors_aud as',
            'end doctors_aud;');
        expect(audSpec).toContain('procedure log_insert');
        expect(audSpec).toContain('procedure log_update');
        expect(audSpec).toContain('procedure log_delete');
    });

    test('audit spec g_enabled flag is declared in spec', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audSpec = segment(out,
            'create or replace package doctors_aud as',
            'end doctors_aud;');
        expect(audSpec).toContain('g_enabled boolean := true');
    });

    test('audit spec log_insert takes p_row IN %ROWTYPE', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audSpec = segment(out,
            'create or replace package doctors_aud as',
            'end doctors_aud;');
        expect(audSpec).toContain('p_row     in doctors%rowtype');
    });

    test('audit spec log_update takes p_old_row and p_new_row IN %ROWTYPE', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audSpec = segment(out,
            'create or replace package doctors_aud as',
            'end doctors_aud;');
        expect(audSpec).toContain('p_old_row in doctors%rowtype, p_new_row in doctors%rowtype');
    });

    test('audit spec log_delete takes p_old_row IN %ROWTYPE', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audSpec = segment(out,
            'create or replace package doctors_aud as',
            'end doctors_aud;');
        expect(audSpec).toContain('p_old_row in doctors%rowtype');
        expect(audSpec).not.toContain('p_id in doctors_dal.t_id');
    });

    test('doctors_aud package body is emitted', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out).toContain('create or replace package body doctors_aud');
    });

    test('audit body has PRAGMA AUTONOMOUS_TRANSACTION in p_log', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('pragma autonomous_transaction');
    });

    test('audit body p_log calls app_audit_log_svc.create_rec with CDC params', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('app_audit_log_svc.create_rec');
        expect(audBody).toContain("l_rec.entity    := 'doctors'");
        expect(audBody).toContain('l_rec.entity_id := p_id');
        expect(audBody).toContain('l_rec.operation := p_operation');
        expect(audBody).toContain('l_rec.old_values := p_old_values');
        expect(audBody).toContain('l_rec.new_values := p_new_values');
        expect(audBody).toContain('create_rec(p_rec => l_rec, x_id => l_id)');
    });

    test('audit body p_log declares l_rec and l_id', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('l_rec app_audit_log_svc.t_rec');
        expect(audBody).toContain('l_id app_audit_log.id%type');
    });

    test('audit body p_log commits the autonomous transaction', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('commit;');
    });

    test('audit body p_log checks g_enabled before logging', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('if not g_enabled then return; end if;');
    });

    test('audit body contains f_to_json private function', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('function f_to_json (p_row in doctors%rowtype) return clob');
        expect(audBody).toContain('json_object(');
        expect(audBody).toContain('returning clob');
    });

    test('f_to_json enumerates all table columns including pk and row_version', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain("'id' value p_row.id");
        expect(audBody).toContain("'name' value p_row.name");
        expect(audBody).toContain("'license_no' value p_row.license_no");
        expect(audBody).toContain("'row_version' value p_row.row_version");
    });

    test('audit body log_insert calls p_log with INSERT and p_new_values', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain("p_log(p_operation => 'INSERT'");
        expect(audBody).toContain('p_new_values => f_to_json(p_row)');
    });

    test('audit body log_update calls p_log with UPDATE, p_old_values and p_new_values', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain("p_log(p_operation => 'UPDATE'");
        expect(audBody).toContain('p_old_values => f_to_json(p_old_row)');
        expect(audBody).toContain('p_new_values => f_to_json(p_new_row)');
    });

    test('audit body log_delete calls p_log with DELETE and p_old_values', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain("p_log(p_operation => 'DELETE'");
        expect(audBody).toContain('p_old_values => f_to_json(p_old_row)');
    });

    test('hooks after_* are no-ops even with /auditlog (audit in SVC, not hooks)', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).not.toContain('_aud.log_');
        expect(hksBody).toContain('after_insert');
        expect(hksBody).toContain('begin null;');
    });

    test('without /auditlog, hooks after_* remain no-ops (null)', () => {
        const out = ddl(DOCTORS_QSQL);
        const hksBody = segment(out,
            'create or replace package body doctors_hks',
            'end doctors_hks;');
        expect(hksBody).not.toContain('_aud.log_');
        expect(hksBody).toContain('after_insert');
        expect(hksBody).toContain('begin null;');
    });

    test('svc p_do_create calls doctors_aud.log_insert after insert', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_aud.log_insert(p_row => l_row)');
    });

    test('svc update_rec captures l_old_row before field assignment', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        const updateRec = segment(svcBody, 'procedure update_rec', 'end update_rec;');
        expect(updateRec).toContain('l_old_row doctors%rowtype');
        expect(updateRec).toContain('l_old_row := l_row');
        const idxCapture = updateRec.indexOf('l_old_row := l_row');
        const idxAssign  = updateRec.indexOf('l_row.name := p_rec.name');
        expect(idxCapture).toBeLessThan(idxAssign);
    });

    test('svc update_rec calls doctors_aud.log_update with old and new rows', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_aud.log_update(p_old_row => l_old_row, p_new_row => l_row)');
    });

    test('svc delete_rec fetches l_old_row before delete when /auditlog', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('l_old_row doctors%rowtype');
        expect(svcBody).toContain('l_old_row := doctors_dal.get_by_id(p_id => p_id)');
        const idxFetch  = svcBody.indexOf('l_old_row := doctors_dal.get_by_id');
        const idxDelete = svcBody.indexOf('doctors_dal.delete_row');
        expect(idxFetch).toBeLessThan(idxDelete);
    });

    test('svc delete_rec calls doctors_aud.log_delete with old row', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).toContain('doctors_aud.log_delete(p_old_row => l_old_row)');
    });

    test('without /auditlog, no _aud package is emitted', () => {
        const out = ddl(DOCTORS_QSQL);
        expect(out).not.toContain('_aud');
        expect(out).not.toContain('app_audit_log');
    });

    test('drop includes doctors_aud package when /auditlog', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out).toContain('drop package doctors_aud');
    });

    test('audit spec is emitted before SVC body (forward reference for compilation)', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        const auditSpecIdx = out.indexOf('create or replace package doctors_aud as');
        const svcBodyIdx   = out.indexOf('create or replace package body doctors_svc');
        expect(auditSpecIdx).toBeLessThan(svcBodyIdx);
    });

    test('audit spec is emitted after SVC spec in output ordering', () => {
        const out = ddl(DOCTORS_AUDITLOG_QSQL);
        expect(out.indexOf('end doctors_svc;'))
            .toBeLessThan(out.indexOf('create or replace package doctors_aud'));
    });

    // ── Level 1 fallback: app_audit_log without old_values/new_values ──────────

    test('Level 1: no f_to_json when app_audit_log lacks old_values/new_values', () => {
        const out = ddl(DOCTORS_AUDITLOG_L1_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).not.toContain('f_to_json');
        expect(audBody).not.toContain('json_object');
    });

    test('Level 1: p_log has no p_old_values/p_new_values params', () => {
        const out = ddl(DOCTORS_AUDITLOG_L1_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).not.toContain('p_old_values');
        expect(audBody).not.toContain('p_new_values');
    });

    test('Level 1: create_rec call omits p_old_values/p_new_values', () => {
        const out = ddl(DOCTORS_AUDITLOG_L1_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('app_audit_log_svc.create_rec');
        expect(audBody).not.toContain('p_old_values =>');
        expect(audBody).not.toContain('p_new_values =>');
    });

    test('Level 1: audit spec still emitted before SVC body', () => {
        const out = ddl(DOCTORS_AUDITLOG_L1_QSQL);
        const auditSpecIdx = out.indexOf('create or replace package doctors_aud as');
        const svcBodyIdx   = out.indexOf('create or replace package body doctors_svc');
        expect(auditSpecIdx).toBeLessThan(svcBodyIdx);
    });

    // ── rowversion:yes — app_audit_log gets x_version out in create_rec ─────────

    test('rowversion:yes — p_log uses l_rec t_rec pattern regardless of log table row_version', () => {
        const out = ddl(DOCTORS_AUDITLOG_ROWVER_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).toContain('l_rec app_audit_log_svc.t_rec');
        expect(audBody).toContain('create_rec(p_rec => l_rec, x_id => l_id)');
        expect(audBody).not.toContain('l_ver');
    });

    test('rowversion:yes — p_log has no x_version out — trigger owns row_version', () => {
        const out = ddl(DOCTORS_AUDITLOG_ROWVER_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).not.toContain('x_version');
    });

    test('without rowversion — p_log has no l_ver and no x_version in create_rec call', () => {
        const out = ddl(DOCTORS_AUDITLOG_L1_QSQL);
        const audBody = segment(out,
            'create or replace package body doctors_aud',
            'end doctors_aud;');
        expect(audBody).not.toContain('l_ver');
        expect(audBody).not.toContain('x_version');
    });

});

// ── §4.12 Transaction safety — no COMMIT ─────────────────────────────────────

describe('transaction safety — no COMMIT in generated bodies', () => {

    test('DAL body contains no COMMIT statement', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).not.toMatch(/\bcommit\b/i);
    });

    test('SVC body contains no COMMIT statement', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).not.toMatch(/\bcommit\b/i);
    });

    test('HOOKS no-op body contains no COMMIT statement', () => {
        const out = ddl(DOCTORS_QSQL);
        const hooksBody = segment(out,
            'create or replace package body doctors_hooks',
            'end doctors_hooks;');
        expect(hooksBody).not.toMatch(/\bcommit\b/i);
    });

    test('DAL body contains no ROLLBACK statement', () => {
        const out = ddl(DOCTORS_QSQL);
        const dalBody = segment(out,
            'create or replace package body doctors_dal',
            'end doctors_dal;');
        expect(dalBody).not.toMatch(/\brollback\b/i);
    });

    test('SVC body contains no ROLLBACK statement', () => {
        const out = ddl(DOCTORS_QSQL);
        const svcBody = segment(out,
            'create or replace package body doctors_svc',
            'end doctors_svc;');
        expect(svcBody).not.toMatch(/\brollback\b/i);
    });

});

// ── §4.14 tenantid: yes — synthetic tenant_id in layered TAPI ────────────────

const CUSTOMERS_TENANT_QSQL = `\
tenants /notenantid
  name vc200 /nn

customers /api
  tenant_ref /fk tenants
  full_name vc200 /nn
  email vc100
# settings = {"api": "layered", "tenantid": "yes", "pk": "identityDataType"}`.trim();

describe('layered TAPI — tenantid:yes', () => {

    test('SVC spec t_rec type includes tenant_id field', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const spec = segment(out, 'create or replace package customers_svc as', 'end customers_svc;');
        expect(spec).toContain('type t_rec is record');
        expect(spec).toContain('tenant_id');
    });

    test('SVC spec t_rec type includes FK field (tenant_ref)', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const spec = segment(out, 'create or replace package customers_svc as', 'end customers_svc;');
        expect(spec).toContain('tenant_ref');
    });

    test('SVC spec update_rec has p_id and p_rec in t_rec', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const spec = segment(out, 'create or replace package customers_svc as', 'end customers_svc;');
        const updateRec = segment(spec, 'procedure update_rec', ');');
        expect(updateRec).toContain('p_id');
        expect(updateRec).toContain('p_rec');
        expect(updateRec).toContain('t_rec');
    });

    test('SVC body p_do_create assigns tenant_id from p_rec to l_row', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const body = segment(out, 'create or replace package body customers_svc', 'end customers_svc;');
        const doCreate = segment(body, 'procedure p_do_create', 'end p_do_create;');
        expect(doCreate).toContain('l_row.tenant_id := p_rec.tenant_id');
    });

    test('SVC body create_rec passes p_rec record to p_do_create', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const body = segment(out, 'create or replace package body customers_svc', 'end customers_svc;');
        const createRec = segment(body, 'procedure create_rec', 'end create_rec;');
        expect(createRec).toContain('p_do_create(p_rec => p_rec');
    });

    test('SVC body update_rec assigns tenant_id from p_rec to l_row', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const body = segment(out, 'create or replace package body customers_svc', 'end customers_svc;');
        const updateRec = segment(body, 'procedure update_rec', 'end update_rec;');
        expect(updateRec).toContain('l_row.tenant_id := p_rec.tenant_id');
    });

    test('DAL body insert_row includes tenant_id in column list', () => {
        const out = ddl(CUSTOMERS_TENANT_QSQL);
        const dalBody = segment(out, 'create or replace package body customers_dal', 'end customers_dal;');
        const insertRow = segment(dalBody, 'procedure insert_row', 'end insert_row;');
        expect(insertRow).toContain('tenant_id');
        expect(insertRow).toContain('p_row.tenant_id');
    });

});

// ── §10 Per-table tier system (/api <tier>) ───────────────────────────────────

describe('per-table tier system — package selection', () => {

    test('lookup tier emits only _apx (no dal, hks, svc)', () => {
        const out = ddl('doctors /api lookup\n  name vc200');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_dal');
        expect(out).not.toContain('create or replace package doctors_hks');
        expect(out).not.toContain('create or replace package doctors_svc');
    });

    test('lookup+hks tier emits _hks and _apx only', () => {
        const out = ddl('doctors /api lookup+hks\n  name vc200');
        expect(out).toContain('create or replace package doctors_hks');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_dal');
        expect(out).not.toContain('create or replace package doctors_svc');
    });

    test('service tier emits _svc and _apx only', () => {
        const out = ddl('doctors /api service\n  name vc200');
        expect(out).toContain('create or replace package doctors_svc');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_dal');
        expect(out).not.toContain('create or replace package doctors_hks');
    });

    test('service+hks tier emits _hks, _svc, and _apx', () => {
        const out = ddl('doctors /api service+hks\n  name vc200');
        expect(out).toContain('create or replace package doctors_hks');
        expect(out).toContain('create or replace package doctors_svc');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_dal');
    });

    test('full tier emits _dal, _svc, and _apx (no _hks)', () => {
        const out = ddl('doctors /api full\n  name vc200');
        expect(out).toContain('create or replace package doctors_dal');
        expect(out).toContain('create or replace package doctors_svc');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_hks');
    });

    test('full+hks tier emits _dal, _hks, _svc, and _apx', () => {
        const out = ddl('doctors /api full+hks\n  name vc200');
        expect(out).toContain('create or replace package doctors_dal');
        expect(out).toContain('create or replace package doctors_hks');
        expect(out).toContain('create or replace package doctors_svc');
        expect(out).toContain('create or replace package doctors_apx');
    });

    test('bare /api (no arg) + api:layered global defaults to full+hks', () => {
        const out = ddl(DOCTORS_QSQL);  // DOCTORS_QSQL uses bare /api + api:"layered"
        expect(out).toContain('create or replace package doctors_dal');
        expect(out).toContain('create or replace package doctors_hks');
        expect(out).toContain('create or replace package doctors_svc');
    });

    test('numeric alias 1 maps to lookup', () => {
        const out = ddl('doctors /api 1\n  name vc200');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_dal');
        expect(out).not.toContain('create or replace package doctors_svc');
    });

    test('numeric alias 1h maps to lookup+hks', () => {
        const out = ddl('doctors /api 1h\n  name vc200');
        expect(out).toContain('create or replace package doctors_hks');
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_svc');
    });

    test('numeric alias 2 maps to service', () => {
        const out = ddl('doctors /api 2\n  name vc200');
        expect(out).toContain('create or replace package doctors_svc');
        expect(out).not.toContain('create or replace package doctors_dal');
    });

    test('numeric alias 3h maps to full+hks', () => {
        const out = ddl('doctors /api 3h\n  name vc200');
        expect(out).toContain('create or replace package doctors_dal');
        expect(out).toContain('create or replace package doctors_hks');
        expect(out).toContain('create or replace package doctors_svc');
    });

    test('different tables in same schema can use different tiers', () => {
        const qsql = 'staff /api lookup\n  name vc200\n\ndoctors /api full+hks\n  name vc200';
        const out = ddl(qsql);
        expect(out).toContain('create or replace package staff_apx');
        expect(out).not.toContain('create or replace package staff_dal');
        expect(out).toContain('create or replace package doctors_dal');
        expect(out).toContain('create or replace package doctors_hks');
    });

});

// ── §11 Degradation — absorbed DML and hook stubs ────────────────────────────

describe('degradation — SVC absorbs private DML when DAL absent', () => {

    test('service tier SVC body contains private DML section comment', () => {
        const out = ddl('doctors /api service\n  name vc200\n  email vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('private DML');
    });

    test('service tier SVC body contains p_get_by_id function', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('function p_get_by_id');
        expect(body).toContain('return doctors%rowtype');
    });

    test('service tier SVC body contains p_insert_row procedure', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('procedure p_insert_row');
    });

    test('service tier SVC body contains p_update_row procedure', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('procedure p_update_row');
    });

    test('service tier SVC body contains p_delete_row procedure', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('procedure p_delete_row');
    });

    test('service tier SVC body calls p_get_by_id (not doctors_dal.get_by_id)', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('p_get_by_id(');
        expect(body).not.toContain('doctors_dal.get_by_id');
    });

    test('full+hks tier SVC body does NOT contain private DML (DAL present)', () => {
        const out = ddl('doctors /api full+hks\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).not.toContain('private DML');
        expect(body).toContain('doctors_dal.get_by_id');
    });

});

describe('degradation — SVC absorbs private hook stubs when HKS absent', () => {

    test('service tier (no hks) SVC body contains private hook stubs comment', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('private hook stubs');
    });

    test('service tier (no hks) SVC body contains p_validate stub', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('procedure p_validate');
    });

    test('service tier (no hks) SVC body calls p_validate (not doctors_hks.validate)', () => {
        const out = ddl('doctors /api service\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).toContain('p_validate(');
        expect(body).not.toContain('doctors_hks.validate');
    });

    test('service+hks tier SVC body does NOT contain private hook stubs (HKS present)', () => {
        const out = ddl('doctors /api service+hks\n  name vc200');
        const body = segment(out, 'create or replace package body doctors_svc', 'end doctors_svc;');
        expect(body).not.toContain('private hook stubs');
        expect(body).toContain('doctors_hks.validate');
    });

});

describe('degradation — HKS id type conditional on DAL presence', () => {

    test('full+hks tier: before_delete uses doctors_dal.t_id', () => {
        const out = ddl('doctors /api full+hks\n  name vc200');
        const spec = segment(out, 'create or replace package doctors_hks', 'end doctors_hks;');
        expect(spec).toContain('p_id in doctors_dal.t_id');
    });

    test('service+hks tier (no dal): before_delete uses doctors.id%type', () => {
        const out = ddl('doctors /api service+hks\n  name vc200');
        const spec = segment(out, 'create or replace package doctors_hks', 'end doctors_hks;');
        expect(spec).toContain('p_id in doctors.id%type');
        expect(spec).not.toContain('doctors_dal.t_id');
    });

    test('lookup+hks tier (no dal): after_delete uses doctors.id%type', () => {
        const out = ddl('doctors /api lookup+hks\n  name vc200');
        const spec = segment(out, 'create or replace package doctors_hks', 'end doctors_hks;');
        expect(spec).toContain('p_id in doctors.id%type');
    });

});

// ── §12 ifc setting — APEX / REST / both ─────────────────────────────────────

describe('ifc setting — interface package selection', () => {

    test('ifc:"apex" (default) emits _apx but not _rst', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered"}`);
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).not.toContain('create or replace package doctors_rst');
    });

    test('ifc:"rest" emits _rst but not _apx', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        expect(out).toContain('create or replace package doctors_rst');
        expect(out).not.toContain('create or replace package doctors_apx');
    });

    test('ifc:"both" emits both _apx and _rst', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "both"}`);
        expect(out).toContain('create or replace package doctors_apx');
        expect(out).toContain('create or replace package doctors_rst');
    });

    test('RST spec declares get procedure (no parameters)', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const spec = segment(out, 'create or replace package doctors_rst', 'end doctors_rst;');
        expect(spec).toContain('procedure get;');
    });

    test('RST spec declares ins, upd, del procedures', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const spec = segment(out, 'create or replace package doctors_rst', 'end doctors_rst;');
        expect(spec).toContain('procedure ins;');
        expect(spec).toContain('procedure upd;');
        expect(spec).toContain('procedure del;');
    });

    test('RST body get procedure uses :p_id bind variable', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        const getProc = segment(body, 'procedure get is', 'end get;');
        expect(getProc).toContain(':p_id');
    });

    test('RST body get procedure calls doctors_svc.get', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        const getProc = segment(body, 'procedure get is', 'end get;');
        expect(getProc).toContain('doctors_svc.get');
    });

    test('RST body get procedure uses htp.p to output JSON', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        const getProc = segment(body, 'procedure get is', 'end get;');
        expect(getProc).toContain('htp.p(');
    });

    test('RST body ins procedure uses :body_text bind variable', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        const insProc = segment(body, 'procedure ins is', 'end ins;');
        expect(insProc).toContain(':body_text');
    });

    test('RST body ins procedure calls doctors_svc.create_rec', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        const insProc = segment(body, 'procedure ins is', 'end ins;');
        expect(insProc).toContain('doctors_svc.create_rec');
    });

    test('RST body procedures set :status bind variable', () => {
        const out = ddl(`doctors /api\n  name vc200\n# settings = {"api": "layered", "ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        expect(body).toContain(':status');
    });

    test('ifc:"rest" with lookup tier (no svc): RST body absorbs private DML', () => {
        const out = ddl(`doctors /api lookup\n  name vc200\n# settings = {"ifc": "rest"}`);
        const body = segment(out, 'create or replace package body doctors_rst', 'end doctors_rst;');
        expect(body).toContain('private DML');
    });

});
