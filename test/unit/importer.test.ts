/**
 * /import and /keyview (2.2.0, ocean-code 00-docs/38 phase I2): the key views, the importer <t>_imp and its interface
 * <t>_imp_app, generated after every API; a declaration the importer cannot honour is an error of generation.
 */
import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

const settings = '# settings = { db: "26ai", prefix: "zz_", pk: identityDataType, rowversion: yes, api: "layered", dateonly: yes }\n';

function ddl(model: string): string {
    return toDDL(settings + model);
}

const MODEL = `
company /api service+hks /keyview
  code          vc20  /nn /unique
  name          vc200 /nn

warehouse /api service+hks /unique company_id, code /import upsert
  company_id    num   /nn /fk company
  code          vc20  /nn
  name          vc200 /nn {label_it 'Nome'}

item /api service+hks /import upsert {label_it 'Articolo'}
  code          vc30  /nn /unique
  name          vc200 /nn
  qty           num(10,0)
  price         num(12,2)
  valid_from    date
  seen_at       timestamp with local time zone
  active_flag   vc1   /nn /default Y /check Y, N
  kind          vc10  /check A, B
  warehouse_id  num   /fk warehouse
  currency_id   num   /fk ref_currency {import 'code'}
  note          vc4000 {import 'no'}
`;

describe('/import: what is generated', () => {
    const out = ddl(MODEL);

    test('nothing without the directive', () => {
        const plain = ddl('thing /api service+hks\n  code vc20 /nn /unique\n');
        expect(plain).not.toContain('_imp');
        expect(plain).not.toContain('_key_vw');
    });
    test('the key views: the plain key, and the key of a foreign key flattened with its name as prefix', () => {
        expect(out).toContain('create or replace view zz_company_key_vw as\nselect t.id id, t.code\nfrom   zz_company_rls t;');
        expect(out).toContain('select t.id id, k1.code company_code, t.code\nfrom   zz_warehouse_rls t\njoin zz_company_key_vw k1 on k1.id = t.company_id;');
        expect(out.indexOf('zz_company_key_vw as')).toBeLessThan(out.indexOf('zz_warehouse_key_vw as'));
    });
    test('the importer and its interface, after the API of every table', () => {
        expect(out).toContain('create or replace package zz_item_imp as');
        expect(out).toContain('create or replace package body zz_item_imp_app as');
        expect(out.indexOf('package body zz_item_svc')).toBeLessThan(out.indexOf('package zz_item_imp as'));
    });
    test('the types of the fields', () => {
        expect(out).toContain("l_new.code := imp_convert_svc.to_text(imp_convert_svc.required(imp_load_svc.value('code'), 'code'), 'code', 30);");
        expect(out).toContain("l_new.qty := imp_convert_svc.to_integer(imp_load_svc.value('qty'), 'qty');");
        expect(out).toContain("l_new.price := imp_convert_svc.to_decimal(imp_load_svc.value('price'), 'price');");
        expect(out).toContain("l_new.valid_from := imp_convert_svc.to_day(");
        expect(out).toContain("l_new.seen_at := imp_convert_svc.to_instant(");
        expect(out).toContain("l_new.active_flag := imp_convert_svc.to_flag(");
        expect(out).toContain("l_new.kind := imp_convert_svc.to_value(imp_load_svc.value('kind'), 'kind', 'A,B');");
    });
    test('a column left out with {import \'no\'}', () => {
        expect(out).not.toContain("value('note')");
        expect(out).toContain('l_rec.note := l_row.note;');            // kept as it is on update
    });
    test('a foreign key of this model resolved by the flattened key of its table', () => {
        expect(out).toContain("function fk_warehouse_id return number is");
        expect(out).toContain("from   zz_warehouse_key_vw k\n        where  k.company_code = l_1\n        and    k.code = l_2;");
        expect(out).toContain('[IMP_LOOKUP_PARTIAL] warehouse_company_code');
    });
    test('a foreign key to another model resolved through the columns its annotation names', () => {
        expect(out).toContain("from   ref_currency_key_vw k\n        where  k.code = l_1;");
        expect(out).toContain("[IMP_LOOKUP] currency_code");
    });
    test('the business key finds the row; the mode decides', () => {
        expect(out).toContain('select max(t.id) into l_id from zz_item_rls t where t.code = l_new.code;');
        expect(out).toContain("[IMP_NOT_FOUND] code");
        expect(out).toContain("[IMP_EXISTS] code");
        expect(out).toContain("elsif imp_load_svc.mode_code = 'UPDATE' then");     // 2.3.1: an empty key with UPSERT is a new row
    });
    test('a composite key with a foreign key: the key fields of the file and the search on the raw columns', () => {
        expect(out).toContain("t.company_id = l_new.company_id and t.code = l_new.code");
        expect(out).toContain("p_key_fields    => 'company_code,code'");
    });
    test('the update changes only the mapped fields, UNCHANGED when nothing changes', () => {
        expect(out).toContain("if imp_load_svc.mapped('qty') and (l_rec.qty != l_new.qty or l_rec.qty is null and l_new.qty is not null or l_rec.qty is not null and l_new.qty is null) then");
        expect(out).toContain("zz_item_svc.update_rec(l_id, l_rec, l_row.row_version);");
        expect(out).toContain("x_action := 'UNCHANGED';");
    });
    test('the registration: the target, its module, its resource, its modes, its fields and the Italian labels', () => {
        expect(out).toContain("c_target constant varchar2(128) := 'ZZ_ITEM';");
        expect(out).toContain("p_module_code   => 'ZZ',");
        expect(out).toContain("p_resource_code => 'ZZ_ITEM',");
        expect(out).toContain("p_modes         => 'INSERT,UPSERT,UPDATE',");
        expect(out).toContain(`p_names         => '{"it":"Articolo"}'`);
        expect(out).toContain('"field_name":"currency_code","label":"Currency","data_type":"TEXT","required":"N","key":"N","lookup":"ref_currency_key_vw(code)"');
        expect(out).toContain('"labels":{"it":"Nome"}');
    });
    test('a long load in a one-off job of the scheduler (2.3.0)', () => {
        expect(out).toContain("procedure load (p_job_id in number, p_dry_run in boolean default false, p_commit_rows in pls_integer default null);");
        expect(out).toContain("imp_load_svc.queue(p_job_id, c_target);");
        expect(out).toContain("job_action => 'ZZ_ITEM_IMP.RUN_JOB'");
        expect(out).toContain("auto_drop => true, enabled => false");
        expect(out).toContain("load(p_job_id, p_commit_rows => imp_load_svc.commit_rows);");
        expect(out).toContain("imp_load_svc.fail_job(p_job_id, dbms_utility.format_error_stack);");
        expect(out).toContain("if imp_load_svc.async_wanted(p_job_id) then");
    });
    test('the image of a written row and the undo (2.4.0)', () => {
        expect(out).toContain('function load_row (x_action out varchar2, x_image out clob) return number is');
        expect(out).toContain('x_image := imp_load_svc.image(zz_item_svc.get(l_id).row_version);');
        expect(out).toContain("l_before.put('name', l_rec.name);");
        expect(out).toContain("l_before.put('valid_from', to_char(l_rec.valid_from, 'YYYY-MM-DD\"T\"HH24:MI:SS'));");
        expect(out).toContain("l_before.put('seen_at', to_char(cast(l_rec.seen_at as timestamp with time zone), 'YYYY-MM-DD\"T\"HH24:MI:SS.FF6TZH:TZM'));");
        expect(out).toContain("l_before.put('currency_id', l_rec.currency_id);");
        expect(out).toContain('x_image := imp_load_svc.image(zz_item_svc.get(l_id).row_version, l_before, p_before_version => l_row.row_version);');
        expect(out).toContain('imp_load_svc.row_undone(zz_item_svc.get(l_row.id).row_version);');
        expect(out).toContain('imp_load_svc.row_done(l_action, l_id, l_image);');
        expect(out).toContain('procedure undo (p_job_id in number);');
        expect(out).toContain('imp_load_svc.begin_undo(p_job_id, c_target);');
        expect(out).toContain('imp_load_svc.check_version(l_row.row_version);');
        expect(out).toContain('zz_item_svc.delete_rec(l_row.id);');
        expect(out).toContain("l_rec.qty := l_old.get_number('qty');");
        expect(out).toContain("l_rec.valid_from := to_date(l_old.get_string('valid_from'), 'YYYY-MM-DD\"T\"HH24:MI:SS');");
        expect(out).toContain("l_rec.seen_at := to_timestamp_tz(l_old.get_string('seen_at'), 'YYYY-MM-DD\"T\"HH24:MI:SS.FF6TZH:TZM');");
        expect(out).toContain("l_rec.name := l_old.get_string('name');");
        expect(out).not.toContain("l_old.has('code')");                       // the key never changes
        expect(out).toContain('zz_item_svc.update_rec(l_row.id, l_rec, l_row.row_version);');
        expect(out).toContain('imp_load_svc.undo_failed;');
        expect(out).toContain('zz_item_imp.undo(p_job_id);');
    });
    test('the loop of imp_load_svc', () => {
        expect(out).toContain("imp_load_svc.begin_load(p_job_id, c_target, p_dry_run, p_commit_rows);");
        expect(out).toContain('imp_load_svc.row_failed;');
        expect(out).toContain('exit when imp_load_svc.stop_now;');
        expect(out).toContain('zz_item_imp.load(p_job_id, p_dry_run => true);');
    });
});

describe('/import: {import \'auto\'}', () => {
    test('a required column the service fills is imported, never required to insert', () => {
        const out = ddl("doc /api service+hks /import upsert\n  doc_no vc30 /nn /unique {import 'auto'}\n  title vc200 /nn\n");
        expect(out).toContain("l_new.doc_no := imp_convert_svc.to_text(imp_load_svc.value('doc_no'), 'doc_no', 30);");
        expect(out).not.toContain("[IMP_REQUIRED] doc_no: a value is required");
        expect(out).toContain("[IMP_REQUIRED] title: a value is required");
        expect(out).toContain('"field_name":"doc_no","label":"Doc no","data_type":"TEXT","max_length":30,"required":"N","key":"Y"');
    });
});

describe('/import: refused at generation', () => {
    test('a foreign key to another model without the columns of its key', () => {
        expect(() => ddl('thing /api service+hks /import\n  code vc20 /nn /unique\n  cur_id num /fk ref_currency\n'))
            .toThrow(/points to ref_currency of another model/);
    });
    test('a table without a service', () => {
        expect(() => ddl('thing /api lookup+hks /import\n  code vc20 /nn /unique\n')).toThrow(/has no service/);
    });
    test('updating without a business key', () => {
        expect(() => ddl('thing /api service+hks /import upsert\n  name vc20\n')).toThrow(/no business key/);
    });
    test('an unknown mode', () => {
        expect(() => ddl('thing /api service+hks /import foo\n  code vc20 /unique\n')).toThrow(/insert, upsert or update/);
    });
    test('a /versioned table', () => {
        expect(() => ddl('thing /api service+hks /versioned /businesskey code /import\n  code vc20 /nn\n')).toThrow(/versioned/);
    });
    test('a required foreign key left out', () => {
        expect(() => ddl('thing /api service+hks /import\n  code vc20 /nn /unique\n  cur_id num /nn /fk ref_currency {import \'no\'}\n'))
            .toThrow(/is required/);
    });
    test('a detail of an aggregate', () => {
        expect(() => ddl('order /api lookup+hks /aggregate\n  code vc20 /nn /unique\n  line /api service+hks /import\n    qty num\n'))
            .toThrow(/detail of the aggregate/);
    });
});
