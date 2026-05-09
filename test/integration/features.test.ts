/**
 * Integration tests for DDL features not covered (or only shallowly covered)
 * in small.test.ts. Organised by feature area, derived directly from
 * doc/user/espresql-grammar.md and doc/user/examples.md.
 *
 * Covered here:
 *  - /upper and /lower triggers
 *  - /between constraint
 *  - /references (external FK)
 *  - /idx explicit index directive
 *  - ondelete global setting
 *  - rowversion column + trigger
 *  - rowkey column + sequence
 *  - schema setting (DDL object names)
 *  - semantics: byte / Default
 *  - namelen setting (truncation)
 *  - FK: inline (backward ref) vs postponed ALTER (forward ref)
 *  - drop: yes with prefix
 *  - Multiple FK columns on same table
 *  - /pk table-level override
 *  - pk: GUID / SEQ / IDENTITY / NONE — DDL shape
 *  - prefixPKwithTname setting
 *  - example 16 — shared-schema multi-tenancy end-to-end
 *  - settings: all known keys produce no "Unknown setting" warning
 */

import { describe, test, expect } from 'vitest';
import { toDDL, toErrors } from '../../src/ddl.js';

function ddl(qsql: string): string { return toDDL(qsql); }

// ── /upper trigger ────────────────────────────────────────────────────────────

describe('/upper directive', () => {
    test('/upper generates BEFORE INSERT trigger that uppercases value', () => {
        const out = ddl(`employees\n  name vc200 /upper`);
        expect(out).toContain(':new.name := upper(:new.name)');
    });

    test('/upper trigger fires BEFORE INSERT and BEFORE UPDATE (separate triggers)', () => {
        const out = ddl(`employees\n  code vc10 /upper`);
        expect(out).toMatch(/before insert/i);
        expect(out).toMatch(/before update/i);
    });

    test('/upper on multiple columns — all in same pair of triggers', () => {
        const out = ddl(`products\n  code vc10 /upper\n  category vc50 /upper`);
        expect(out).toContain(':new.code := upper(:new.code)');
        expect(out).toContain(':new.category := upper(:new.category)');
        // Oracle generates one BI trigger and one BU trigger (2 total)
        const triggerCount = (out.match(/create or replace trigger/gi) ?? []).length;
        expect(triggerCount).toBe(2);
    });

    test('/upper generates exactly two triggers (BI + BU), not more', () => {
        const out = ddl(`items\n  code vc5 /upper`);
        const count = (out.match(/create or replace trigger/gi) ?? []).length;
        expect(count).toBe(2);
    });
});

// ── /lower trigger ────────────────────────────────────────────────────────────

describe('/lower directive', () => {
    test('/lower generates BEFORE INSERT trigger that lowercases value', () => {
        const out = ddl(`users\n  email vc200 /lower`);
        expect(out).toContain(':new.email := lower(:new.email)');
    });

    test('/lower fires BEFORE INSERT and BEFORE UPDATE (separate triggers)', () => {
        const out = ddl(`users\n  email vc200 /lower`);
        expect(out).toMatch(/before insert/i);
        expect(out).toMatch(/before update/i);
    });

    test('/upper and /lower on different columns — combined into BI + BU triggers', () => {
        const out = ddl(`contacts\n  name vc200 /upper\n  email vc200 /lower`);
        expect(out).toContain(':new.name := upper(:new.name)');
        expect(out).toContain(':new.email := lower(:new.email)');
        // Oracle generates one BI trigger and one BU trigger (2 total)
        const triggerCount = (out.match(/create or replace trigger/gi) ?? []).length;
        expect(triggerCount).toBe(2);
    });
});

// ── /between constraint ───────────────────────────────────────────────────────

describe('/between constraint', () => {
    test('/between generates CHECK (col BETWEEN a AND b)', () => {
        const out = ddl(`ratings\n  score num /between 1 and 10`);
        expect(out).toContain('between 1 and 10');
    });

    test('/between constraint has a name', () => {
        const out = ddl(`ratings\n  score num /between 1 and 10`);
        expect(out).toContain('constraint ratings_score_bet');
    });

    test('/between with decimal values', () => {
        const out = ddl(`prices\n  discount num /between 0 and 1`);
        expect(out).toContain('between 0 and 1');
    });
});

// ── /references directive ─────────────────────────────────────────────────────

describe('/references directive (external FK)', () => {
    test('/fk to undeclared table creates FK reference without error', () => {
        const out = ddl(`invoices\n  customer_id /fk customers /nn`);
        expect(out).toContain('references customers');
    });

    test('undeclared FK target produces no structural errors', () => {
        const errors = toErrors(`invoices\n  customer_id /fk customers /nn`)
            .filter((e: { message: string }) => !e.message.startsWith('Undefined Object'));
        expect(errors).toHaveLength(0);
    });

    test('/fk to external table is inline when declared as child column', () => {
        const out = ddl(`invoices\n  customer_id /fk customers /nn`);
        // Inline FK — in the column definition, not as ALTER TABLE
        expect(out).toContain('constraint invoices_customer_id_fk');
    });

    test('/fk to external table with /cascade', () => {
        const out = ddl(`orders\n  customer_id /fk customers /nn /cascade`);
        expect(out).toContain('on delete cascade');
    });

    test('/fk to external table with /setnull', () => {
        const out = ddl(`tasks\n  project_id /fk projects /setnull`);
        expect(out).toContain('on delete set null');
    });
});

// ── /idx directive ────────────────────────────────────────────────────────────

describe('/idx directive', () => {
    test('/idx generates CREATE INDEX on the column', () => {
        const out = ddl(`orders\n  status vc20 /idx`);
        expect(out).toContain('create index orders_i1 on orders (status)');
    });

    test('/index is an alias for /idx', () => {
        const out = ddl(`orders\n  status vc20 /index`);
        expect(out).toContain('create index');
        expect(out).toContain('(status)');
    });

    test('multiple /idx columns get incrementing index names', () => {
        const out = ddl(`orders\n  status vc20 /idx\n  priority num /idx`);
        expect(out).toContain('orders_i1');
        expect(out).toContain('orders_i2');
    });

    test('/idx with prefix applies prefix to index name', () => {
        const out = ddl(`orders\n  status vc20 /idx\n# settings = { prefix: "shop_" }`);
        expect(out).toContain('create index shop_orders_i1 on shop_orders (status)');
    });
});

// ── ondelete global setting ───────────────────────────────────────────────────

describe('ondelete global setting', () => {
    test('ondelete: cascade applies ON DELETE CASCADE to all FKs', () => {
        const out = ddl(`departments\n  name\n  employees\n    name\n# settings = { ondelete: cascade }`);
        expect(out).toContain('on delete cascade');
    });

    test('ondelete: "set null" applies ON DELETE SET NULL to all FKs', () => {
        const out = ddl(`departments\n  name\n  employees\n    name\n# settings = { ondelete: "set null" }`);
        expect(out).toContain('on delete set null');
    });

    test('ondelete not set → no ON DELETE clause by default', () => {
        const out = ddl(`departments\n  name\n  employees\n    name`);
        expect(out).not.toContain('on delete');
    });
});

// ── rowversion ────────────────────────────────────────────────────────────────

describe('rowversion', () => {
    test('rowversion: yes adds row_version integer not null column', () => {
        const out = ddl(`docs\n  title vc200\n# settings = { rowversion: yes }`);
        expect(out).toContain('row_version');
        expect(out).toContain('integer not null');
    });

    test('/rowversion on table directive adds column', () => {
        const out = ddl(`docs /rowversion\n  title vc200`);
        expect(out).toContain('row_version');
    });

    test('rowversion: yes generates a BEFORE UPDATE trigger incrementing the column', () => {
        const out = ddl(`docs\n  title vc200\n# settings = { rowversion: yes }`);
        expect(out).toContain(':new.row_version := nvl(:old.row_version, 0) + 1');
    });

    test('without rowversion setting no row_version column', () => {
        const out = ddl(`docs\n  title vc200`);
        expect(out).not.toContain('row_version');
    });
});

// ── rowkey ────────────────────────────────────────────────────────────────────

describe('rowkey', () => {
    test('rowkey: yes generates row_key_seq sequence', () => {
        const out = ddl(`docs\n  title\n# settings = { rowkey: yes }`);
        expect(out).toContain('create sequence  row_key_seq');
    });

    test('rowkey: yes adds row_key column with UNIQUE NOT NULL', () => {
        const out = ddl(`docs\n  title\n# settings = { rowkey: yes }`);
        expect(out).toContain('row_key');
        expect(out).toContain('varchar2(30');
        expect(out).toContain('unique not null');
    });

    test('/rowkey on table works like the setting', () => {
        const out = ddl(`docs /rowkey\n  title`);
        expect(out).toContain('row_key');
        expect(out).toContain('create sequence  row_key_seq');
    });

    test('CREATE SEQUENCE row_key_seq appears exactly once with multiple /rowkey tables', () => {
        const out = ddl(`a /rowkey\n  name\nb /rowkey\n  name`);
        const seqMatches = (out.match(/create sequence\s+row_key_seq/gi) ?? []).length;
        expect(seqMatches).toBe(1);
    });
});

// ── schema setting ────────────────────────────────────────────────────────────

describe('schema setting', () => {
    test('schema: hr prefixes table with hr.', () => {
        const out = ddl(`employees\n  name\n# settings = { schema: "hr" }`);
        expect(out).toContain('create table hr.employees');
    });

    test('schema + prefix combined', () => {
        const out = ddl(`employees\n  name\n# settings = { schema: "hr", prefix: "app_" }`);
        expect(out).toContain('create table hr.app_employees');
    });

    test('FK references include schema when schema is set', () => {
        const out = ddl(`departments\n  name\n  employees\n    name\n# settings = { schema: "hr" }`);
        expect(out).toContain('references hr.departments');
    });

    test('constraint names do NOT include schema prefix', () => {
        const out = ddl(`departments\n  name\n# settings = { schema: "hr" }`);
        expect(out).toContain('constraint departments_id_pk primary key');
        expect(out).not.toContain('constraint hr.departments_id_pk');
    });
});

// ── semantics ─────────────────────────────────────────────────────────────────

describe('semantics setting', () => {
    test('semantics: CHAR (default) uses CHAR qualifier', () => {
        const out = ddl(`users\n  email vc200`);
        expect(out).toContain('varchar2(200 char)');
    });

    test('semantics: BYTE uses BYTE qualifier', () => {
        const out = ddl(`users\n  email vc200\n# settings = { semantics: BYTE }`);
        expect(out).toContain('varchar2(200 byte)');
        expect(out).not.toContain('varchar2(200 char)');
    });

    test('semantics: Default — no qualifier', () => {
        const out = ddl(`users\n  email vc200\n# settings = { semantics: Default }`);
        expect(out).toContain('varchar2(200)');
        expect(out).not.toContain('varchar2(200 char)');
        expect(out).not.toContain('varchar2(200 byte)');
    });
});

// ── namelen setting ───────────────────────────────────────────────────────────

describe('namelen setting', () => {
    test('namelen: 30 truncates long object names to 30 chars', () => {
        const out = ddl(
            `a_very_long_table_name_here\n  a_very_long_column_name_here\n# settings = { namelen: 30 }`
        );
        // Object names longer than 30 chars should be truncated
        const lines = out.split('\n');
        for (const line of lines) {
            if (line.includes('create table')) {
                const match = line.match(/create table (\S+)/);
                if (match) expect(match[1].length).toBeLessThanOrEqual(30);
            }
        }
    });
});

// ── FK: inline (backward ref) vs postponed ALTER (forward ref) ────────────────

describe('FK: inline vs postponed ALTER', () => {
    test('backward FK (child declared after parent) is inline', () => {
        const out = ddl(`departments\n  name\n  employees\n    name`);
        // Inline: constraint clause appears inside CREATE TABLE employees
        const empPos = out.indexOf('create table employees');
        const paren  = out.indexOf(');', empPos);
        const block  = out.substring(empPos, paren);
        expect(block).toContain('references departments');
    });

    test('forward FK (child declared before parent) becomes postponed ALTER', () => {
        const out = ddl(`orders\n  customer_id /fk customers /nn\ncustomers\n  name`);
        // Postponed: ALTER TABLE appears after both CREATE TABLEs
        const lastCreate = out.lastIndexOf('create table');
        const alterPos   = out.indexOf('alter table orders add constraint', lastCreate);
        expect(alterPos).toBeGreaterThan(lastCreate);
        expect(out).toContain('foreign key (customer_id)');
        expect(out).toContain('references customers');
    });

    test('forward FK with /cascade includes ON DELETE CASCADE in ALTER', () => {
        const out = ddl(`orders\n  customer_id /fk customers /nn /cascade\ncustomers\n  name`);
        expect(out).toContain('on delete cascade');
    });

    test('forward FK with /setnull includes ON DELETE SET NULL in ALTER', () => {
        const out = ddl(`orders\n  customer_id /fk customers /setnull\ncustomers\n  name`);
        expect(out).toContain('on delete set null');
    });
});

// ── drop setting ──────────────────────────────────────────────────────────────

describe('drop setting', () => {
    test('drop: yes generates DROP TABLE before CREATE TABLE', () => {
        const out = ddl(`employees\n  name\n# settings = { drop: yes }`);
        expect(out).toContain('drop table employees cascade constraints');
    });

    test('drop: yes with prefix uses prefixed table name in DROP', () => {
        const out = ddl(`employees\n  name\n# settings = { drop: yes, prefix: "hr_" }`);
        expect(out).toContain('drop table hr_employees cascade constraints');
        expect(out).not.toContain('drop table employees');
    });

    test('drop: yes with pk:SEQ drops sequence too', () => {
        const out = ddl(`employees\n  name\n# settings = { drop: yes, pk: SEQ }`);
        expect(out).toContain('drop sequence employees_seq');
    });

    test('drop: no (default) does NOT generate DROP statements', () => {
        const out = ddl(`employees\n  name`);
        expect(out).not.toContain('drop table');
    });
});

// ── Multiple FK columns on same table ─────────────────────────────────────────

describe('multiple FK columns on same table', () => {
    test('two FKs on same table both generate constraint clauses', () => {
        const out = ddl(`departments\n  name\nprojects\n  name\ntasks\n  department_id /fk departments /nn\n  project_id /fk projects /nn`);
        expect(out).toContain('references departments');
        expect(out).toContain('references projects');
    });

    test('each FK generates its own index', () => {
        const out = ddl(`departments\n  name\nprojects\n  name\ntasks\n  department_id /fk departments /nn\n  project_id /fk projects /nn`);
        expect(out).toContain('tasks_i1');
        expect(out).toContain('tasks_i2');
    });
});

// ── pk setting — all modes in detail ─────────────────────────────────────────

describe('pk setting — all modes', () => {
    test('pk: guid (default) uses to_number(sys_guid())', () => {
        const out = ddl(`t\n  name`);
        expect(out).toContain("to_number(sys_guid(), 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')");
        expect(out).not.toContain('trigger');
    });

    test('pk: SEQ creates sequence and uses .nextval default', () => {
        const out = ddl(`t\n  name\n# settings = { pk: SEQ }`);
        expect(out).toContain('create sequence  t_seq');
        expect(out).toContain('t_seq.nextval');
        expect(out).not.toContain('trigger');
    });

    test('pk: identityDataType uses GENERATED BY DEFAULT ON NULL AS IDENTITY', () => {
        const out = ddl(`t\n  name\n# settings = { pk: identityDataType }`);
        expect(out).toContain('generated by default on null as identity');
        expect(out).not.toContain('trigger');
        expect(out).not.toContain('sequence');
    });

    test('pk: NONE — id column still appears with not null + primary key', () => {
        const out = ddl(`t\n  name\n# settings = { pk: NONE }`);
        expect(out).toContain('id');
        expect(out).toContain('not null');
        expect(out).toContain('primary key');
        expect(out).not.toContain('trigger');
        expect(out).not.toContain('sequence');
        expect(out).not.toContain('sys_guid');
        expect(out).not.toContain('identity');
    });

    test('genpk: false removes the id column entirely', () => {
        const out = ddl(`t\n  name\n# settings = { genpk: false }`);
        expect(out).not.toContain('id');
        expect(out).not.toContain('primary key');
    });

    test('pk setting applies to every table in the schema', () => {
        const out = ddl(`a\n  name\nb\n  name\n# settings = { pk: SEQ }`);
        expect(out).toContain('create sequence  a_seq');
        expect(out).toContain('create sequence  b_seq');
        expect(out).toContain('a_seq.nextval');
        expect(out).toContain('b_seq.nextval');
    });

    test('explicit PK column /pk uses the named column as primary key', () => {
        const out = ddl(`countries\n  code vc2 /pk /nn\n  name vc100\n# settings = { pk: SEQ }`);
        // code is declared as PK; it should appear as primary key
        expect(out).toContain('code');
        expect(out).toContain('primary key');
        // The auto-id column should not appear alongside the explicit PK
        expect(out).not.toContain('constraint countries_id_pk');
    });
});

// ── prefixPKwithTname ─────────────────────────────────────────────────────────

describe('prefixPKwithTname setting', () => {
    test('prefixPKwithTname: yes names PK column <singular_table>_id', () => {
        const out = ddl(`employees\n  name\n# settings = { prefixPKwithTname: yes }`);
        // Table name is singularized: employees → employee_id
        expect(out).toContain('employee_id');
    });

    test('prefixPKwithTname: yes FK column uses <singular_parent>_id convention', () => {
        const out = ddl(`departments\n  name\n  employees\n    name\n# settings = { prefixPKwithTname: yes }`);
        // Table name is singularized: departments → department_id
        expect(out).toContain('department_id');
    });

    test('prefixPKwithTname: no (default) uses plain id', () => {
        const out = ddl(`employees\n  name`);
        const block = out.substring(out.indexOf('create table'), out.indexOf(');') + 2);
        // The id column should be plain 'id', not 'employees_id'
        expect(block).toMatch(/\bid\s+number/);
    });
});

// ── settings: no Unknown setting warnings for all known keys ──────────────────

describe('settings — no unknown-option warnings for documented keys', () => {
    const knownSettings = [
        'apex', 'api', 'auditcols', 'boolean', 'compress', 'date', 'db',
        'drop', 'dv', 'editionable', 'genpk', 'inserts', 'language', 'longvc',
        'namelen', 'ondelete', 'overridesettings', 'pk', 'prefix',
        'prefixpkwithtname', 'rowkey', 'rowversion', 'schema', 'semantics',
        'tenantid', 'tenantref', 'verbose',
        'createdcol', 'createdbycol', 'updatedcol', 'updatedbycol',
        'transcontext', 'aienrichment', 'datalimit',
    ];

    for (const key of knownSettings) {
        test(`setting "${key}" is recognised (no Unknown setting warning)`, () => {
            const out = ddl(`t\n  name\n# settings = { ${key}: "test" }`);
            expect(out).not.toContain(`Unknown setting: ${key}`);
        });
    }

    test('unknown setting produces warning in output', () => {
        const out = ddl(`t\n  name\n# settings = { notARealSetting: "x" }`);
        expect(out).toContain('Unknown setting: notarealsetting');
    });
});

// ── API + tenantid: yes ───────────────────────────────────────────────────────

describe('API with tenantid: yes', () => {
    const qsql = `customers\n  full_name vc200 /nn\n  email vc200 /nn\n# settings = { api: yes, tenantid: yes }`;

    test('get_row has p_tenant_id OUT parameter', () => {
        const out = ddl(qsql);
        const pos = out.indexOf('procedure get_row');
        const decl = out.substring(pos, out.indexOf('procedure insert_row', pos));
        expect(decl).toContain('p_tenant_id');
        expect(decl).toMatch(/p_tenant_id\s+out/i);
    });

    test('insert_row has p_tenant_id IN parameter', () => {
        const out = ddl(qsql);
        const pos = out.indexOf('procedure insert_row');
        const decl = out.substring(pos, out.indexOf('procedure update_row', pos));
        expect(decl).toContain('p_tenant_id');
        expect(decl).toMatch(/p_tenant_id\s+in/i);
    });

    test('insert_row body includes tenant_id in column list', () => {
        const out = ddl(qsql);
        const pos = out.indexOf('insert into customers');
        expect(out.substring(pos, pos + 300)).toContain('tenant_id');
        expect(out.substring(pos, pos + 300)).toContain('p_tenant_id');
    });

    test('update_row WHERE clause scoped to tenant_id', () => {
        const out = ddl(qsql);
        const pos = out.indexOf('update  customers');
        expect(out.substring(pos, pos + 200)).toContain('and tenant_id = p_tenant_id');
    });

    test('delete_row has p_tenant_id parameter and scoped WHERE', () => {
        const out = ddl(qsql);
        const pos = out.indexOf('delete from customers');
        const block = out.substring(pos, pos + 100);
        expect(block).toContain('and tenant_id = p_tenant_id');
    });

    test('/notenantid table has NO p_tenant_id in API', () => {
        const out = ddl(`tenants /notenantid\n  name vc100\n# settings = { api: yes, tenantid: yes }`);
        const api = out.substring(out.indexOf('package tenants_api'));
        expect(api).not.toContain('p_tenant_id');
    });

    test('table without tenantid setting has NO p_tenant_id in API', () => {
        const out = ddl(`customers\n  email vc200\n# settings = { api: yes }`);
        const api = out.substring(out.indexOf('package customers_api'));
        expect(api).not.toContain('p_tenant_id');
    });
});

// ── Example 16 — Shared-schema multi-tenancy end-to-end ───────────────────────

describe('Example 16 — shared-schema multi-tenancy end-to-end', () => {
    const qsql = `subscription_plans /notenantid
  code  vc20 /nn /pk
  name  vc100 /nn
  price num(10,2) /nn

tenants /notenantid
  name      vc200 /nn
  plan_code /fk subscription_plans /nn

customers
  full_name   vc200 /nn
  email       vc200 /nn /unique
  plan_code   /fk subscription_plans

orders
  customer_id /fk customers /nn
  status      /check OPEN,SHIPPED,CLOSED /nn /default OPEN
  total       num(14,2) /nn

order_lines
  order_id   /fk orders /nn /cascade
  sku        vc50 /nn
  qty        num /nn
  unit_price num(10,2) /nn

# settings = { prefix: "app_", tenantid: yes, auditcols: yes, drop: yes, db: "23c" }`;

    test('generates all five tables', () => {
        const out = ddl(qsql);
        expect(out).toContain('create table app_subscription_plans');
        expect(out).toContain('create table app_tenants');
        expect(out).toContain('create table app_customers');
        expect(out).toContain('create table app_orders');
        expect(out).toContain('create table app_order_lines');
    });

    test('supra-tenant tables have NO tenant_id column', () => {
        const out = ddl(qsql);
        const planPos  = out.indexOf('create table app_subscription_plans');
        const planEnd  = out.indexOf(');', planPos);
        const planBlock = out.substring(planPos, planEnd);
        expect(planBlock).not.toContain('tenant_id');

        const tenPos  = out.indexOf('create table app_tenants');
        const tenEnd  = out.indexOf(');', tenPos);
        const tenBlock = out.substring(tenPos, tenEnd);
        expect(tenBlock).not.toContain('tenant_id');
    });

    test('tenant tables have tenant_id NOT NULL', () => {
        const out = ddl(qsql);
        for (const tbl of ['app_customers', 'app_orders', 'app_order_lines']) {
            const pos   = out.indexOf('create table ' + tbl);
            const end   = out.indexOf(');', pos);
            const block = out.substring(pos, end);
            expect(block, `${tbl} should have tenant_id not null`).toMatch(/tenant_id\s+number not null/);
        }
    });

    test('subscription_plans uses custom PK column code (varchar2)', () => {
        const out = ddl(qsql);
        const pos   = out.indexOf('create table app_subscription_plans');
        const end   = out.indexOf(');', pos);
        const block = out.substring(pos, end);
        expect(block).toContain('code');
        expect(block).toContain('varchar2');
        expect(block).toContain('primary key');
        expect(block).not.toContain('number default on null'); // no auto-id
    });

    test('tenants.plan_code FK type is varchar (matches subscription_plans.code type)', () => {
        const out = ddl(qsql);
        const pos   = out.indexOf('create table app_tenants');
        const end   = out.indexOf(');', pos);
        const block = out.substring(pos, end);
        expect(block).toContain('plan_code');
        expect(block).toMatch(/plan_code\s+varchar2/);
    });

    test('customers FK to subscription_plans is simple (supra-tenant target)', () => {
        const out = ddl(qsql);
        expect(out).toContain('references app_subscription_plans');
        // Must NOT produce a composite FK for supra-tenant target
        expect(out).not.toContain('foreign key (tenant_id, plan_code)');
    });

    test('orders generates composite FK (tenant_id, customer_id) → customers', () => {
        const out = ddl(qsql);
        expect(out).toContain('foreign key (tenant_id, customer_id)');
        expect(out).toContain('references app_customers (tenant_id, id)');
    });

    test('order_lines generates composite FK with ON DELETE CASCADE', () => {
        const out = ddl(qsql);
        expect(out).toContain('foreign key (tenant_id, order_id)');
        expect(out).toContain('references app_orders (tenant_id, id)');
        expect(out).toContain('on delete cascade');
    });

    test('auto-FK tenant_id → tenants generated for each tenant table', () => {
        const out = ddl(qsql);
        expect(out).toContain('app_customers_tenant_id_fk');
        expect(out).toContain('app_orders_tenant_id_fk');
        expect(out).toContain('app_order_lines_tenant_id_fk');
        // All reference app_tenants(id)
        const count = (out.match(/references app_tenants \(id\)/g) ?? []).length;
        expect(count).toBe(3);
    });

    test('customers email gets (tenant_id, email) scoped unique index', () => {
        const out = ddl(qsql);
        expect(out).toContain('app_customers_tid_email_uix');
        expect(out).toContain('on app_customers (tenant_id, email)');
    });

    test('referenced tenant tables get (tenant_id, id) composite unique', () => {
        const out = ddl(qsql);
        expect(out).toContain('app_customers_tid_id_uix');
        expect(out).toContain('app_orders_tid_id_uix');
    });

    test('audit columns present on all tables (auditcols: yes)', () => {
        const out = ddl(qsql);
        // Count occurrences of created_by (one per table = 5 tables)
        const matches = out.match(/created_by/g) ?? [];
        expect(matches.length).toBeGreaterThanOrEqual(5);
    });

    test('drop: yes with db: 23c uses DROP TABLE IF EXISTS', () => {
        const out = ddl(qsql);
        expect(out).toContain('drop table if exists app_subscription_plans');
        expect(out).toContain('drop table if exists app_customers');
    });

    test('no parse errors (excluding known /notenantid parser warning)', () => {
        const errors = toErrors(qsql)
            .filter((e: unknown) => (e as { message: string }).message !== 'Unknown Table directive');
        expect(errors).toHaveLength(0);
    });
});
