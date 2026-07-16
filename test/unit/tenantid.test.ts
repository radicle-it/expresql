/**
 * Tests for the tenantid: yes setting.
 *
 * When tenantid: yes is active, QuickSQL:
 *  1. Adds a tenant_id NUMBER column as the second column (after PK, before FK columns)
 *  2. Generates a (tenant_id, id) composite unique index + USING INDEX constraint
 *  3. Prefixes FK indices with (tenant_id, fk_col) instead of (fk_col)
 *  4. Replaces column-level /unique inline constraint with (tenant_id, col) composite index
 *  5. Prefixes table-level /unique with tenant_id
 *  6. Prefixes explicit /idx column indices with tenant_id
 *  7. Does NOT add a synthetic tenant_id when the table already declares it explicitly
 *  8. Generates composite FK (tenant_id, fk_col) → target(tenant_id, id) between tenant tables
 *  9. /notenantid directive marks a table as supra-tenant: no synthetic tenant_id, standard indices
 * 10. FK to /notenantid table stays simple (no composite FK)
 * 11. Bug fix: FK column named tenant_id does not produce (tenant_id, tenant_id) index
 * 12. tenant_id is NOT NULL when the table has no /insert; nullable when /insert is present
 * 13. Auto-FK tenant_id → tenants table when a tenants (/notenantid) table exists in schema
 * 14. tenantref setting customises the name of the master tenant table
 * 15. /cascade and /setnull propagated to composite FK and postponed simple FK
 * 16. tenant_ctx package exposes clear_id() alongside get_id()/set_id()
 */

import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

function ddl(qsql: string): string {
    return toDDL(qsql).toLowerCase();
}

// ── 1. Tenant_id column generation ───────────────────────────────────────────

describe('tenantid: yes — column', () => {
    const qsql = `
customers
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('tenant_id column appears in table', () => {
        expect(ddl(qsql)).toContain('tenant_id');
    });

    test('tenant_id is NOT NULL when table has no /insert', () => {
        const out = ddl(qsql);
        const pos = out.indexOf('tenant_id');
        const snippet = out.substring(pos, pos + 60);
        expect(snippet).toMatch(/tenant_id\s+number not null,/);
    });

    test('tenant_id appears before full_name (second column after PK)', () => {
        const out = ddl(qsql);
        expect(out.indexOf('tenant_id')).toBeLessThan(out.indexOf('full_name'));
    });
});

// ── 2. (tenant_id, id) composite unique index ─────────────────────────────
// Generated on-demand when another tenant table references this table via FK.
// Tables not referenced by any composite FK do NOT get the (tenant_id, id) unique.

describe('tenantid: yes — composite unique index (tenant_id, id)', () => {
    // customers is referenced by orders → gets (tenant_id, id) unique
    const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('creates unique index on (tenant_id, id) for the referenced table', () => {
        expect(ddl(qsql)).toContain('create unique index app_customers_tid_id_uix');
        expect(ddl(qsql)).toContain('on app_customers (tenant_id, id)');
    });

    test('creates UNIQUE constraint USING INDEX on referenced table', () => {
        expect(ddl(qsql)).toContain('add constraint app_customers_tid_id_uq');
        expect(ddl(qsql)).toContain('unique (tenant_id, id) using index app_customers_tid_id_uix');
    });

    test('index appears before constraint (avoids ORA-01408)', () => {
        const out = ddl(qsql);
        expect(out.indexOf('create unique index app_customers_tid_id_uix'))
            .toBeLessThan(out.indexOf('add constraint app_customers_tid_id_uq'));
    });

    test('table NOT referenced by any FK does NOT get (tenant_id, id) unique', () => {
        // orders is a leaf — nobody references it
        expect(ddl(qsql)).not.toContain('app_orders_tid_id_uix');
    });

    test('table with no FKs to it does NOT get (tenant_id, id) unique when alone', () => {
        const alone = `
customers
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(alone)).not.toContain('tid_id_uix');
    });
});

// ── 3. FK indices prefixed with tenant_id ────────────────────────────────

describe('tenantid: yes — FK indices', () => {
    const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn
  total num(14,2) /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('FK index on orders uses (tenant_id, customer_id)', () => {
        expect(ddl(qsql)).toContain('on app_orders (tenant_id, customer_id)');
    });

    test('FK index does NOT use plain (customer_id) when tenantid active', () => {
        const out = ddl(qsql);
        // index line should not have (customer_id) alone — must have tenant_id prefix
        expect(out).not.toMatch(/create index app_orders_i\d+ on app_orders \(customer_id\)/);
    });
});

// ── 4. Column-level /unique → (tenant_id, col) composite index ───────────

describe('tenantid: yes — column /unique', () => {
    const qsql = `
customers
  full_name vc200 /nn
  email vc200 /nn /unique

# settings = { tenantid: yes, prefix: "app_" }`;

    test('generates (tenant_id, email) composite unique index', () => {
        expect(ddl(qsql)).toContain('create unique index app_customers_tid_email_uix');
        expect(ddl(qsql)).toContain('on app_customers (tenant_id, email)');
    });

    test('does NOT generate inline unique constraint on email', () => {
        // The inline "constraint app_customers_email_unq unique" must be absent
        expect(ddl(qsql)).not.toContain('app_customers_email_unq');
    });
});

// ── 5. Table-level /unique prefixed with tenant_id ────────────────────────

describe('tenantid: yes — table /unique', () => {
    const qsql = `
customers /unique email
  full_name vc200 /nn
  email vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('table-level UNIQUE constraint includes tenant_id', () => {
        const out = ddl(qsql);
        expect(out).toContain('unique (tenant_id, email)');
    });
});

// ── 6. Column /idx prefixed with tenant_id ───────────────────────────────

describe('tenantid: yes — /idx', () => {
    const qsql = `
orders
  status vc20 /nn /idx
  total num(14,2) /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('explicit /idx index uses (tenant_id, status)', () => {
        expect(ddl(qsql)).toContain('on app_orders (tenant_id, status)');
    });
});

// ── 7. No duplicate tenant_id when declared explicitly ───────────────────

describe('tenantid: yes — explicit tenant_id column', () => {
    const qsql = `
orders
  tenant_id num /nn
  status vc20 /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('tenant_id appears exactly once in table DDL', () => {
        const out = ddl(qsql);
        // count occurrences of 'tenant_id' in the create table block
        const tableBlock = out.substring(out.indexOf('create table'), out.indexOf(');') + 2);
        const matches = tableBlock.match(/tenant_id/g) ?? [];
        expect(matches.length).toBe(1);
    });
});

// ── 8. Standard behavior unchanged when tenantid: no ─────────────────────

describe('tenantid: no — standard behavior', () => {
    const qsql = `
customers
  email vc200 /nn /unique

# settings = { prefix: "app_" }`;

    test('no tenant_id column without tenantid: yes', () => {
        expect(ddl(qsql)).not.toContain('tenant_id');
    });

    test('email unique constraint is inline (standard)', () => {
        expect(ddl(qsql)).toContain('app_customers_email_unq');
    });

    test('no (tenant_id, id) composite index without tenantid: yes', () => {
        expect(ddl(qsql)).not.toContain('tid_id_uix');
    });
});

// ── 9. Multiple tenant tables ─────────────────────────────────────────────

describe('tenantid: yes — multiple tables', () => {
    const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn

order_lines
  order_id /fk orders /nn
  qty num /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('all three tables have tenant_id column', () => {
        const out = ddl(qsql);
        // Each CREATE TABLE block should contain tenant_id
        const tables = ['app_customers', 'app_orders', 'app_order_lines'];
        for (const tbl of tables) {
            const pos  = out.indexOf('create table ' + tbl);
            const end  = out.indexOf(');', pos);
            const block = out.substring(pos, end);
            expect(block, `${tbl} should have tenant_id`).toContain('tenant_id');
        }
    });

    test('referenced tables get (tenant_id, id) composite unique, unreferenced do not', () => {
        const out = ddl(qsql);
        // customers is referenced by orders → gets unique
        expect(out).toContain('app_customers_tid_id_uix');
        // orders is referenced by order_lines → gets unique
        expect(out).toContain('app_orders_tid_id_uix');
        // order_lines is not referenced by anyone → does NOT get unique
        expect(out).not.toContain('app_order_lines_tid_id_uix');
    });
});

// ── 10. Composite FK between tenant tables ────────────────────────────────────

describe('tenantid: yes — composite FK between tenant tables', () => {
    const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('generates composite FK (tenant_id, customer_id) → customers(tenant_id, id)', () => {
        const out = ddl(qsql);
        expect(out).toContain('foreign key (tenant_id, customer_id)');
        expect(out).toContain('references app_customers (tenant_id, id)');
    });

    test('composite FK constraint name includes the FK column', () => {
        expect(ddl(qsql)).toContain('app_orders_customer_id_fk');
    });

    test('composite FK does NOT also generate a plain FK on customer_id alone', () => {
        const out = ddl(qsql);
        expect(out).not.toMatch(/foreign key \(customer_id\)/);
    });

    test('composite FK generates (tenant_id, id) unique on the target before the FK', () => {
        const out = ddl(qsql);
        expect(out).toContain('create unique index app_customers_tid_id_uix');
        const uixPos = out.indexOf('create unique index app_customers_tid_id_uix');
        const fkPos  = out.indexOf('foreign key (tenant_id, customer_id)');
        expect(uixPos).toBeLessThan(fkPos);
    });
});

// ── 11. /notenantid — supra-tenant table ─────────────────────────────────────

describe('tenantid: yes — /notenantid supra-tenant table', () => {
    const qsql = `
subscription_plans /notenantid
  name vc100 /nn
  price num(10,2) /nn

customers
  full_name vc200 /nn
  plan_id /fk subscription_plans /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('supra-tenant table has no synthetic tenant_id column', () => {
        const out = ddl(qsql);
        const planPos = out.indexOf('create table app_subscription_plans');
        const planEnd = out.indexOf(');', planPos);
        const block = out.substring(planPos, planEnd);
        expect(block).not.toContain('tenant_id');
    });

    test('supra-tenant table has no (tenant_id, id) composite unique index', () => {
        expect(ddl(qsql)).not.toContain('app_subscription_plans_tid_id_uix');
    });

    test('tenant table still gets synthetic tenant_id', () => {
        const out = ddl(qsql);
        const custPos = out.indexOf('create table app_customers');
        const custEnd = out.indexOf(');', custPos);
        expect(out.substring(custPos, custEnd)).toContain('tenant_id');
    });

    test('FK from tenant table to supra-tenant table stays simple (no composite)', () => {
        const out = ddl(qsql);
        expect(out).not.toMatch(/foreign key \(tenant_id, plan_id\)/);
        expect(out).toMatch(/foreign key \(plan_id\)|references app_subscription_plans/);
    });

    test('FK index to supra-tenant table does not get tenant_id prefix', () => {
        const out = ddl(qsql);
        expect(out).not.toMatch(/on app_customers \(tenant_id, plan_id\)/);
        expect(out).toMatch(/on app_customers \(plan_id\)/);
    });
});

// ── 12. /notenantid — unique stays inline ────────────────────────────────────

describe('tenantid: yes — /notenantid table keeps inline unique', () => {
    const qsql = `
currencies /notenantid
  code vc3 /nn /unique

# settings = { tenantid: yes, prefix: "ref_" }`;

    test('supra-tenant /unique stays as inline constraint (not composite index)', () => {
        expect(ddl(qsql)).toContain('ref_currencies_code_unq');
    });

    test('no (tenant_id, code) composite index on supra-tenant table', () => {
        expect(ddl(qsql)).not.toContain('tid_code');
    });
});

// ── 13. Bug fix: no (tenant_id, tenant_id) index ──────────────────────────────

describe('tenantid: yes — FK column named tenant_id', () => {
    const qsql = `
tenants /notenantid
  name vc200 /nn

customers
  tenant_id num /nn /fk tenants

# settings = { tenantid: yes, prefix: "app_" }`;

    test('no (tenant_id, tenant_id) in any index', () => {
        expect(ddl(qsql)).not.toContain('tenant_id, tenant_id');
    });

    test('tenant_id FK gets plain index on (tenant_id)', () => {
        const out = ddl(qsql);
        expect(out).toMatch(/on app_customers \(tenant_id\)/);
    });
});

// ── 14. tenant_id NOT NULL / nullable ─────────────────────────────────────────

describe('tenantid: yes — NOT NULL on synthetic tenant_id', () => {
    test('tenant_id is NOT NULL when table has no /insert', () => {
        const qsql = `
customers
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(qsql)).toMatch(/tenant_id\s+number not null,/);
    });

    test('tenant_id is nullable when table has /insert N', () => {
        const qsql = `
customers /insert 5
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        const out = ddl(qsql);
        expect(out).toMatch(/tenant_id\s+number,/);
        expect(out).not.toMatch(/tenant_id\s+number not null,/);
    });

    test('explicit tenant_id column preserves its own nullability', () => {
        // User declared the column — QuickSQL does not touch it
        const qsql = `
orders
  tenant_id num /nn
  status vc20 /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(qsql)).toMatch(/tenant_id\s+number not null,/);
    });
});

// ── 15. Auto-FK tenant_id → tenants ──────────────────────────────────────────

describe('tenantid: yes — auto-FK tenant_id → tenants table', () => {
    const qsqlWithTenants = `
tenants /notenantid
  name vc200 /nn

customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn

# settings = { tenantid: yes, prefix: "app_" }`;

    test('generates FK tenant_id → app_tenants for each tenant table', () => {
        const out = ddl(qsqlWithTenants);
        expect(out).toContain('app_customers_tenant_id_fk');
        expect(out).toContain('app_orders_tenant_id_fk');
    });

    test('auto-FK references app_tenants (id)', () => {
        const out = ddl(qsqlWithTenants);
        expect(out).toContain('foreign key (tenant_id) references app_tenants (id)');
    });

    test('supra-tenant table does NOT get auto-FK', () => {
        expect(ddl(qsqlWithTenants)).not.toContain('app_tenants_tenant_id_fk');
    });

    test('no auto-FK when tenants table is absent from schema', () => {
        const noTenants = `
customers
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(noTenants)).not.toContain('tenant_id_fk');
    });

    test('no auto-FK when tenant_id is declared explicitly (user manages the FK)', () => {
        const explicit = `
tenants /notenantid
  name vc200 /nn

customers
  tenant_id num /nn /fk tenants

# settings = { tenantid: yes, prefix: "app_" }`;
        // The FK on explicit tenant_id is app_customers_tenant_id_fk — generated inline.
        // No duplicate auto-FK should exist.
        const out = ddl(explicit);
        const count = (out.match(/app_customers_tenant_id_fk/g) ?? []).length;
        expect(count).toBe(1);
    });
});

// ── 16. tenantref setting ─────────────────────────────────────────────────────

describe('tenantid: yes — tenantref setting', () => {
    test('tenantref points auto-FK to a custom-named master table', () => {
        const qsql = `
workspaces /notenantid
  name vc200 /nn

documents
  title vc200 /nn

# settings = { tenantid: yes, tenantref: "workspaces", prefix: "app_" }`;
        const out = ddl(qsql);
        expect(out).toContain('foreign key (tenant_id) references app_workspaces (id)');
    });

    test('default tenantref is "tenants"', () => {
        const qsql = `
tenants /notenantid
  name vc200 /nn

customers
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(qsql)).toContain('references app_tenants (id)');
    });
});

// ── 17. /cascade and /setnull on composite FK ────────────────────────────────

describe('tenantid: yes — /cascade and /setnull on composite FK', () => {
    test('/cascade on FK column propagates to composite FK', () => {
        const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn /cascade

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(qsql)).toContain('on delete cascade');
    });

    test('/setnull on FK column propagates to composite FK', () => {
        const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /setnull

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(qsql)).toContain('on delete set null');
    });

    test('no /cascade → no ON DELETE clause on composite FK', () => {
        const qsql = `
customers
  full_name vc200 /nn

orders
  customer_id /fk customers /nn

# settings = { tenantid: yes, prefix: "app_" }`;
        expect(ddl(qsql)).not.toContain('on delete');
    });
});

// ── 18. tenant_ctx clear_id() ─────────────────────────────────────────────────
// Added so callers have a trusted-package way to reset the tenant context (pool
// checkout/logoff/test teardown) without hitting ORA-01031 from DBMS_SESSION.CLEAR_CONTEXT
// called outside the package associated with the context via CREATE CONTEXT ... USING.

describe('tenantid: yes — tenant_ctx.clear_id()', () => {
    // tenant_ctx is only emitted alongside a layered DAL that references it (generator.ts:661),
    // so this needs api: layered + a table carrying /api, not just tenantid: yes alone.
    const qsql = `
customers /api
  full_name vc200 /nn

# settings = { tenantid: yes, prefix: "app_", api: layered }`;

    test('clear_id is declared in the tenant_ctx package spec', () => {
        const out = ddl(qsql);
        const specPos = out.indexOf('create or replace package app_tenant_ctx as');
        const specEnd = out.indexOf('end app_tenant_ctx;', specPos);
        expect(out.substring(specPos, specEnd)).toContain('procedure clear_id;');
    });

    test('clear_id is implemented in the tenant_ctx package body', () => {
        const out = ddl(qsql);
        const bodyPos = out.indexOf('create or replace package body app_tenant_ctx as');
        const bodyEnd = out.indexOf('end app_tenant_ctx;', bodyPos);
        const block = out.substring(bodyPos, bodyEnd);
        expect(block).toContain('procedure clear_id is');
        expect(block).toContain("dbms_session.clear_context('app_tenant_ctx');");
    });

    test('get_id and set_id are unchanged alongside the new clear_id', () => {
        const out = ddl(qsql);
        expect(out).toContain('function get_id return integer;');
        expect(out).toContain('procedure set_id(p_tenant_id in integer);');
    });
});
