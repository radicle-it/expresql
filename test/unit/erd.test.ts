/**
 * Tests for toERD() output.
 *
 * toERD() returns { items, links, groups? } where:
 *   items  — one entry per table/view (name, columns[])
 *   links  — one entry per FK relationship (source, source_id, target, target_id, mandatory?)
 *   groups — optional Record<groupName, tableName[]>
 *
 * These tests verify that the ERD data is correct for every schema feature.
 * ERD bugs are invisible to the DDL test suite — this file fills that gap.
 */

import { describe, test, expect } from 'vitest';
import { toERD } from '../../src/ddl.js';
import type { ErdOutput, ErdItem, ErdLink } from '../../src/compiler/types.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function erd(qsql: string): ErdOutput { return toERD(qsql); }

function item(out: ErdOutput, name: string): ErdItem | undefined {
    return out.items.find(i => i.name === name);
}

function col(it: ErdItem | undefined, colName: string) {
    return it?.columns.find(c => c.name === colName);
}

function link(out: ErdOutput, src: string, tgt: string): ErdLink | undefined {
    return out.links.find(l => l.source === src && l.target === tgt);
}

// ── 1. Basic items ────────────────────────────────────────────────────────────

describe('ERD — basic items', () => {
    const qsql = `departments /insert 2
  name /nn
  employees /insert 4
    name /nn
    salary num(10,2)`;

    test('returns one item per table', () => {
        const out = erd(qsql);
        expect(out.items).toHaveLength(2);
    });

    test('item names match table names', () => {
        const out = erd(qsql);
        const names = out.items.map(i => i.name);
        expect(names).toContain('departments');
        expect(names).toContain('employees');
    });

    test('PK column id is listed first in columns', () => {
        const out = erd(qsql);
        const dept = item(out, 'departments');
        expect(dept?.columns[0].name).toBe('id');
    });

    test('regular columns appear in items', () => {
        const out = erd(qsql);
        const emp = item(out, 'employees');
        const names = emp?.columns.map(c => c.name) ?? [];
        expect(names).toContain('name');
        expect(names).toContain('salary');
    });

    test('FK column appears in child item', () => {
        const out = erd(qsql);
        const emp = item(out, 'employees');
        const colNames = emp?.columns.map(c => c.name) ?? [];
        expect(colNames).toContain('department_id');
    });
});

// ── 2. Prefix ─────────────────────────────────────────────────────────────────

describe('ERD — prefix', () => {
    const qsql = `customers
  full_name vc200
  orders
    total num

# settings = { prefix: "shop_" }`;

    test('item names use prefix', () => {
        const out = erd(qsql);
        const names = out.items.map(i => i.name);
        expect(names).toContain('shop_customers');
        expect(names).toContain('shop_orders');
    });

    test('item names do NOT appear without prefix', () => {
        const out = erd(qsql);
        const names = out.items.map(i => i.name);
        expect(names).not.toContain('customers');
        expect(names).not.toContain('orders');
    });

    test('link source/target names use prefix', () => {
        const out = erd(qsql);
        const lk = link(out, 'shop_customers', 'shop_orders');
        expect(lk).toBeDefined();
    });
});

// ── 3. Links ──────────────────────────────────────────────────────────────────

describe('ERD — links', () => {
    const qsql = `departments
  name /nn
  employees
    name /nn /fk departments`;

    test('link exists from parent to child', () => {
        const out = erd(qsql);
        const lk = link(out, 'departments', 'employees');
        expect(lk).toBeDefined();
    });

    test('link source_id is PK of parent', () => {
        const out = erd(qsql);
        const lk = link(out, 'departments', 'employees');
        expect(lk?.source_id).toBe('id');
    });

    test('link target_id is FK column on child', () => {
        const out = erd(qsql);
        const lk = link(out, 'departments', 'employees');
        expect(lk?.target_id).toBe('department_id');
    });

    test('explicit FK without /nn is NOT mandatory', () => {
        const qsql2 = `projects\n  name\ntasks\n  project_id /fk projects\n  title vc200`;
        const out = erd(qsql2);
        const lk = link(out, 'projects', 'tasks');
        expect(lk?.mandatory).toBeFalsy();
    });

    test('FK /nn sets mandatory true on link', () => {
        const qsql2 = `depts\n  name\n  emps\n    dept_id /fk depts /nn`;
        const out = erd(qsql2);
        const lk = link(out, 'depts', 'emps');
        expect(lk?.mandatory).toBe(true);
    });

    test('no link when no FK relationship exists', () => {
        const qsql2 = `table_a\n  name\ntable_b\n  name`;
        const out = erd(qsql2);
        expect(out.links).toHaveLength(0);
    });

    test('three-level hierarchy produces two links', () => {
        const qsql3 = `orders\n  name\n  order_lines\n    qty\n    shipments\n      date shipped`;
        const out = erd(qsql3);
        expect(out.links).toHaveLength(2);
        expect(link(out, 'orders', 'order_lines')).toBeDefined();
        expect(link(out, 'order_lines', 'shipments')).toBeDefined();
    });
});

// ── 4. Forward reference (FK to table declared later) ─────────────────────────

describe('ERD — forward reference FK', () => {
    const qsql = `orders
  customer_id /fk customers /nn
  status vc20

customers
  name vc200`;

    test('link exists despite forward reference', () => {
        const out = erd(qsql);
        const lk = link(out, 'customers', 'orders');
        expect(lk).toBeDefined();
    });

    test('link target_id is the FK column name', () => {
        const out = erd(qsql);
        const lk = link(out, 'customers', 'orders');
        expect(lk?.target_id).toBe('customer_id');
    });
});

// ── 5. Explicit PK column ─────────────────────────────────────────────────────

describe('ERD — explicit PK column', () => {
    test('custom PK column name appears in items', () => {
        const qsql = `countries\n  code vc2 /pk\n  name vc100`;
        const out  = erd(qsql);
        const it   = item(out, 'countries');
        const colNames = it?.columns.map(c => c.name) ?? [];
        expect(colNames).toContain('code');
        expect(colNames).not.toContain('id');
    });

    test('link source_id is the custom PK column', () => {
        const qsql = `countries\n  code vc2 /pk\n  cities\n    name\n    country_code /fk countries /nn`;
        const out  = erd(qsql);
        const lk   = link(out, 'countries', 'cities');
        expect(lk?.source_id).toBe('code');
    });

    test('FK column type matches custom PK type', () => {
        const qsql = `subscription_plans /notenantid\n  code vc20 /nn /pk\n  name vc100\ntenants /notenantid\n  plan_code /fk subscription_plans /nn\n# settings = { tenantid: yes }`;
        const out  = erd(qsql);
        const tenantItem = item(out, 'tenants');
        const pc = col(tenantItem, 'plan_code');
        // plan_code FK should use varchar2 type (from subscription_plans.code vc20)
        expect(pc?.datatype).toMatch(/varchar/i);
    });
});

// ── 6. Audit columns in ERD ───────────────────────────────────────────────────

describe('ERD — audit columns', () => {
    test('auditcols: yes adds created/updated columns to items', () => {
        const qsql = `employees\n  name\n# settings = { auditcols: yes }`;
        const out  = erd(qsql);
        const emp  = item(out, 'employees');
        const cols = emp?.columns.map(c => c.name) ?? [];
        expect(cols).toContain('created');
        expect(cols).toContain('created_by');
        expect(cols).toContain('updated');
        expect(cols).toContain('updated_by');
    });

    test('/auditcols on table adds audit columns to that item', () => {
        const qsql = `projects /auditcols\n  name`;
        const out  = erd(qsql);
        const it   = item(out, 'projects');
        const cols = it?.columns.map(c => c.name) ?? [];
        expect(cols).toContain('created');
        expect(cols).toContain('updated');
    });

    test('table without auditcols has no created column', () => {
        const qsql = `simple_table\n  name`;
        const out  = erd(qsql);
        const it   = item(out, 'simple_table');
        const cols = it?.columns.map(c => c.name) ?? [];
        expect(cols).not.toContain('created');
    });
});

// ── 7. Column datatypes in ERD ────────────────────────────────────────────────

describe('ERD — column datatypes', () => {
    test('num column shows number type', () => {
        const qsql = `invoices\n  amount num(10,2)`;
        const out  = erd(qsql);
        const it   = item(out, 'invoices');
        const c    = col(it, 'amount');
        expect(c?.datatype).toMatch(/number/i);
    });

    test('vc column shows varchar type', () => {
        const qsql = `users\n  email vc200`;
        const out  = erd(qsql);
        const it   = item(out, 'users');
        const c    = col(it, 'email');
        expect(c?.datatype).toMatch(/varchar/i);
    });

    test('date column shows date type', () => {
        const qsql = `events\n  event_date date`;
        const out  = erd(qsql);
        const it   = item(out, 'events');
        const c    = col(it, 'event_date');
        expect(c?.datatype).toMatch(/date/i);
    });

    test('pk id column is number type', () => {
        const qsql = `orders\n  name`;
        const out  = erd(qsql);
        const it   = item(out, 'orders');
        const c    = col(it, 'id');
        expect(c?.datatype).toBe('number');
    });

    test('rowversion column appears in ERD', () => {
        const qsql = `docs\n  title\n# settings = { rowversion: yes }`;
        const out  = erd(qsql);
        const it   = item(out, 'docs');
        const cols = it?.columns.map(c => c.name) ?? [];
        expect(cols).toContain('row_version');
    });
});

// ── 8. Views excluded from ERD ────────────────────────────────────────────────

describe('ERD — views excluded', () => {
    test('view is NOT in items', () => {
        const qsql = `departments\n  name\nview dept_v departments`;
        const out  = erd(qsql);
        const names = out.items.map(i => i.name);
        expect(names).not.toContain('dept_v');
    });

    test('view does NOT generate a link', () => {
        const qsql = `departments\n  name\nview dept_v departments`;
        const out  = erd(qsql);
        // Only the view reference — no real FK — so no links expected
        expect(out.links).toHaveLength(0);
    });
});

// ── 9. Groups ({TGROUP}) ──────────────────────────────────────────────────────

describe('ERD — TGROUP groups', () => {
    const qsql = `departments {TGROUP 'HR'}
  name
employees {TGROUP 'HR'}
  name
projects {TGROUP 'PMO'}
  name`;

    test('groups property is present', () => {
        const out = erd(qsql);
        expect(out.groups).toBeDefined();
    });

    test('HR group contains departments and employees', () => {
        const out = erd(qsql);
        expect(out.groups?.['HR']).toContain('departments');
        expect(out.groups?.['HR']).toContain('employees');
    });

    test('PMO group contains projects only', () => {
        const out = erd(qsql);
        expect(out.groups?.['PMO']).toContain('projects');
        expect(out.groups?.['PMO']).not.toContain('departments');
    });

    test('no groups property when no TGROUP annotation', () => {
        const qsql2 = `a\n  name\nb\n  name`;
        const out   = erd(qsql2);
        expect(out.groups).toBeUndefined();
    });
});

// ── 10. Star schema (> notation) ─────────────────────────────────────────────

describe('ERD — star schema (>)', () => {
    const qsql = `sales
  qty num
  > products
    name
  > customers
    first_name`;

    test('all three tables appear as items', () => {
        const out   = erd(qsql);
        const names = out.items.map(i => i.name);
        expect(names).toContain('sales');
        expect(names).toContain('products');
        expect(names).toContain('customers');
    });

    test('sales links to products and customers', () => {
        const out = erd(qsql);
        expect(link(out, 'products',  'sales')).toBeDefined();
        expect(link(out, 'customers', 'sales')).toBeDefined();
    });

    test('no direct link between products and customers', () => {
        const out = erd(qsql);
        expect(link(out, 'products', 'customers')).toBeUndefined();
        expect(link(out, 'customers', 'products')).toBeUndefined();
    });
});

// ── 11. Schema setting ────────────────────────────────────────────────────────

describe('ERD — schema setting', () => {
    test('item names do NOT include schema prefix', () => {
        const qsql = `orders\n  total num\n# settings = { schema: "hr", prefix: "app_" }`;
        const out  = erd(qsql);
        // ERD uses objPrefix('no schema') so schema is excluded from item names
        const names = out.items.map(i => i.name);
        expect(names).toContain('app_orders');
        expect(names).not.toContain('hr.app_orders');
    });

    test('schema is stored in item.schema field', () => {
        const qsql = `orders\n  total num\n# settings = { schema: "hr" }`;
        const out  = erd(qsql);
        const it   = item(out, 'orders');
        expect(it?.schema).toBe('hr');
    });

    test('no schema → item.schema is null', () => {
        const qsql = `orders\n  total num`;
        const out  = erd(qsql);
        const it   = item(out, 'orders');
        expect(it?.schema).toBeNull();
    });
});

// ── 12. tenantid: yes — ERD items ─────────────────────────────────────────────

describe('ERD — tenantid: yes — items', () => {
    const qsql = `customers
  full_name vc200

orders
  customer_id /fk customers /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('all tenant tables appear as ERD items', () => {
        const out   = erd(qsql);
        const names = out.items.map(i => i.name);
        expect(names).toContain('app_customers');
        expect(names).toContain('app_orders');
    });

    test('tenant_id column appears in each tenant table item', () => {
        const out  = erd(qsql);
        const cust = item(out, 'app_customers');
        const ord  = item(out, 'app_orders');
        expect(cust?.columns.map(c => c.name)).toContain('tenant_id');
        expect(ord?.columns.map(c => c.name)).toContain('tenant_id');
    });

    test('/notenantid table has NO tenant_id column in ERD', () => {
        const qsql2 = `plans /notenantid\n  name vc100\n# settings = { tenantid: yes }`;
        const out   = erd(qsql2);
        const it    = item(out, 'plans');
        expect(it?.columns.map(c => c.name)).not.toContain('tenant_id');
    });
});

// ── 13. tenantid: yes — ERD links (composite FK + auto-FK) ───────────────────

describe('ERD — tenantid: yes — links', () => {
    const qsql = `tenants /notenantid
  name vc200 /nn

customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn

order_lines
  order_id /fk orders /nn /cascade

# settings = { tenantid: yes, prefix: "app_" }`;

    test('composite FK link: customers → orders exists', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_customers', 'app_orders');
        expect(lk).toBeDefined();
    });

    test('composite FK link: orders → order_lines exists', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_orders', 'app_order_lines');
        expect(lk).toBeDefined();
    });

    test('auto-FK: tenants → customers link exists', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_tenants', 'app_customers');
        expect(lk).toBeDefined();
    });

    test('auto-FK: tenants → orders link exists', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_tenants', 'app_orders');
        expect(lk).toBeDefined();
    });

    test('auto-FK: tenants → order_lines link exists', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_tenants', 'app_order_lines');
        expect(lk).toBeDefined();
    });

    test('auto-FK target_id is tenant_id', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_tenants', 'app_customers');
        expect(lk?.target_id).toBe('tenant_id');
    });

    test('auto-FK source_id is id (PK of tenants)', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_tenants', 'app_customers');
        expect(lk?.source_id).toBe('id');
    });

    test('auto-FK link is mandatory', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_tenants', 'app_customers');
        expect(lk?.mandatory).toBe(true);
    });

    test('/notenantid table does NOT get auto-FK from tenants', () => {
        const qsql2 = `tenants /notenantid\n  name\nplans /notenantid\n  name\n# settings = { tenantid: yes }`;
        const out   = erd(qsql2);
        // plans is /notenantid, so no auto-FK to tenants
        expect(link(out, 'tenants', 'plans')).toBeUndefined();
    });

    test('table with explicit tenant_id column does NOT get auto-FK link', () => {
        const qsql2 = `tenants /notenantid\n  name\ncustomers\n  tenant_id num /nn\n  name\n# settings = { tenantid: yes }`;
        const out   = erd(qsql2);
        // explicit tenant_id → user manages FK themselves, no auto-link
        expect(link(out, 'tenants', 'customers')).toBeUndefined();
    });
});

// ── 14. tenantref — custom tenant table name ──────────────────────────────────

describe('ERD — tenantref', () => {
    const qsql = `orgs /notenantid
  name vc200

customers
  full_name vc200

# settings = { tenantid: yes, tenantref: "orgs", prefix: "app_" }`;

    test('auto-FK links use custom tenantref table', () => {
        const out = erd(qsql);
        const lk  = link(out, 'app_orgs', 'app_customers');
        expect(lk).toBeDefined();
    });

    test('default tenants table name is not linked when tenantref overrides', () => {
        const out = erd(qsql);
        // No table named 'tenants' → no links from 'app_tenants'
        expect(link(out, 'app_tenants', 'app_customers')).toBeUndefined();
    });

    test('tenantref table itself has no auto-FK (is /notenantid)', () => {
        const out = erd(qsql);
        // orgs /notenantid → should not receive auto-FK from itself
        expect(link(out, 'app_orgs', 'app_orgs')).toBeUndefined();
    });
});

// ── 15. FK to supra-tenant (/notenantid) table stays simple in ERD ─────────────

describe('ERD — FK to /notenantid target stays simple', () => {
    const qsql = `subscription_plans /notenantid
  code vc20 /nn /pk
  name vc100

customers
  plan_code /fk subscription_plans

# settings = { tenantid: yes }`;

    test('link from subscription_plans to customers exists', () => {
        const out = erd(qsql);
        const lk  = link(out, 'subscription_plans', 'customers');
        expect(lk).toBeDefined();
    });

    test('link target_id is the FK column (not composite)', () => {
        const out = erd(qsql);
        const lk  = link(out, 'subscription_plans', 'customers');
        // FK to /notenantid table is NOT composite, so target_id is plain plan_code
        expect(lk?.target_id).toBe('plan_code');
        expect(lk?.target_id).not.toContain(',');
    });
});

// ── 16. toERD() error handling ────────────────────────────────────────────────

describe('ERD — error handling', () => {
    test('empty input returns empty items and links', () => {
        const out = erd('');
        expect(out.items).toHaveLength(0);
        expect(out.links).toHaveLength(0);
    });

    test('single table with no FKs returns 0 links', () => {
        const out = erd(`lone_wolf\n  name`);
        expect(out.links).toHaveLength(0);
    });

    test('returns valid output without throwing for complex schema', () => {
        const qsql = `departments /insert 3
  name /nn /upper
  location vc100
  employees /insert 10
    name /nn /lower
    email /lower /nn /unique
    salary num(10,2)
    job_title vc100

projects /insert 5
  name vc200 /nn
  budget num(12,2)

# settings = { auditcols: yes, prefix: "hr_", db: "23c" }`;

        expect(() => erd(qsql)).not.toThrow();
        const out = erd(qsql);
        expect(out.items.length).toBeGreaterThanOrEqual(2);
    });
});
