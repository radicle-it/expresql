/**
 * Integration tests for DBML → ESQL → DDL import pipeline.
 * Uses ExpreSQL naming conventions (tablename_id for PKs and FKs).
 */
import { describe, test, expect } from 'vitest';
// Import from ddl.ts so the Oracle dialect is registered
import { fromDBML } from '../../src/ddl.js';

async function importDDL(dbml: string, opts?: Parameters<typeof fromDBML>[1]): Promise<string> {
    return fromDBML(dbml, opts);
}

async function importESQL(dbml: string): Promise<string> {
    return fromDBML(dbml, { outputFormat: 'esql' });
}

// ── Basic round-trip ─────────────────────────────────────────────────────────

describe('DBML importer — basic', () => {

    test('simple table with columns', async () => {
        const dbml = `
Table products {
  products_id integer [primary key]
  name varchar(200) [not null]
  price decimal(10,2)
}`;
        const ddl = await importDDL(dbml);
        expect(ddl).toContain('create table products');
        expect(ddl).toContain('name');
        expect(ddl).toContain('price');
    });

    test('table note becomes bracket annotation', async () => {
        const dbml = `
Table customers [note: 'Customer accounts'] {
  customers_id integer [primary key]
  email varchar(255)
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('[Customer accounts]');
    });

    test('not null constraint', async () => {
        const dbml = `
Table items {
  items_id integer [primary key]
  name varchar(100) [not null]
}`;
        const ddl = await importDDL(dbml);
        expect(ddl).toContain('not null');
    });

    test('unique constraint', async () => {
        const dbml = `
Table accounts {
  accounts_id integer [primary key]
  email varchar(255) [unique]
}`;
        const ddl = await importDDL(dbml);
        expect(ddl).toContain('unique');
    });

});

// ── Type mapping ─────────────────────────────────────────────────────────────

describe('DBML importer — type mapping', () => {

    test('varchar maps to vc', async () => {
        const dbml = `
Table t {
  t_id integer [primary key]
  name varchar(100)
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('vc100');
    });

    test('decimal maps to num', async () => {
        const dbml = `
Table t {
  t_id integer [primary key]
  price decimal(10,2)
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('num(10,2)');
    });

    test('timestamp maps to ts', async () => {
        const dbml = `
Table t {
  t_id integer [primary key]
  event_time timestamp
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('ts');
    });

    test('boolean maps to bool', async () => {
        const dbml = `
Table t {
  t_id integer [primary key]
  is_active boolean
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('bool');
    });

});

// ── Reverse expansion (audit columns collapse) ───────────────────────────────

describe('DBML importer — reverse expansion', () => {

    test('audit columns collapse into /auditcols directive', async () => {
        const dbml = `
Table orders {
  orders_id integer [primary key]
  total decimal(10,2)
  created date
  created_by varchar(255)
  updated date
  updated_by varchar(255)
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('/auditcols');
        // audit columns should not appear as explicit fields
        expect(esql).not.toMatch(/^\s+created\b/m);
        expect(esql).not.toMatch(/^\s+updated\b/m);
        expect(esql).not.toMatch(/^\s+created_by\b/m);
    });

    test('created_at synonym also collapses', async () => {
        const dbml = `
Table events {
  events_id integer [primary key]
  name varchar(100)
  created_at timestamp
  updated_at timestamp
  created_by varchar(255)
  updated_by varchar(255)
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('/auditcols');
    });

    test('row_version collapses into /rowversion directive', async () => {
        const dbml = `
Table products {
  products_id integer [primary key]
  name varchar(200)
  row_version integer
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('/rowversion');
        expect(esql).not.toMatch(/^\s+row_version\b/m);
    });

    test('audit + rowversion together on header line', async () => {
        const dbml = `
Table users {
  users_id integer [primary key]
  email varchar(255)
  row_version integer
  created date
  created_by varchar(255)
  updated date
  updated_by varchar(255)
}`;
        const esql = await importESQL(dbml);
        const headerLine = esql.split('\n').find(l => l.startsWith('users'));
        expect(headerLine).toContain('/auditcols');
        expect(headerLine).toContain('/rowversion');
    });

});

// ── Enum → /check ────────────────────────────────────────────────────────────

describe('DBML importer — enum to /check', () => {

    test('enum values become /check directive', async () => {
        const dbml = `
Enum order_status {
  pending
  confirmed
  shipped
  cancelled
}

Table orders {
  orders_id integer [primary key]
  status order_status [not null]
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('/check pending,confirmed,shipped,cancelled');
    });

});

// ── FK relationships → hierarchy ─────────────────────────────────────────────

describe('DBML importer — FK hierarchy', () => {

    test('FK reference with standard naming produces nested table', async () => {
        const dbml = `
Table users {
  users_id integer [primary key, increment]
  email varchar(255)
}

Table orders {
  orders_id integer [primary key, increment]
  users_id integer [not null]
  total decimal(10,2)
}

Ref: orders.users_id > users.users_id`;

        const esql = await importESQL(dbml);
        // orders should be nested under users (indented)
        const lines = esql.split('\n');
        const usersIdx = lines.findIndex(l => /^users/.test(l));
        const ordersIdx = lines.findIndex(l => /^\s+orders/.test(l));
        expect(usersIdx).toBeGreaterThanOrEqual(0);
        expect(ordersIdx).toBeGreaterThan(usersIdx);
    });

    test('auto-generated FK column is skipped in child', async () => {
        const dbml = `
Table users {
  users_id integer [primary key, increment]
  email varchar(255)
}

Table orders {
  orders_id integer [primary key, increment]
  users_id integer [not null]
  total decimal(10,2)
}

Ref: orders.users_id > users.users_id`;

        const esql = await importESQL(dbml);
        // users_id should not appear as explicit field in orders section
        // (it's auto-generated by ExpreSQL hierarchy)
        const lines = esql.split('\n');
        const ordersStart = lines.findIndex(l => /^\s+orders/.test(l));
        expect(ordersStart).toBeGreaterThan(0);
        // No explicit users_id field under orders
        const ordersFields = lines.slice(ordersStart + 1).filter(l => /^\s{4,}/.test(l));
        expect(ordersFields.some(l => /users_id/.test(l))).toBe(false);
    });

});

// ── Settings detection ────────────────────────────────────────────────────────

describe('DBML importer — settings detection', () => {

    test('increment PK → identity mode', async () => {
        const dbml = `
Table t {
  t_id integer [primary key, increment]
  name varchar(100)
}`;
        const esql = await importESQL(dbml);
        expect(esql).toContain('pk: identity');
    });

    test('auto-generated PK column (tablename_id) is skipped', async () => {
        const dbml = `
Table products {
  products_id integer [primary key, increment]
  name varchar(200)
}`;
        const esql = await importESQL(dbml);
        // The PK column should not appear as an explicit field
        const lines = esql.split('\n').filter(l => /^\s+/.test(l));
        expect(lines.some(l => /products_id/.test(l))).toBe(false);
    });

});

// ── Full pipeline round-trip ──────────────────────────────────────────────────

describe('DBML importer — full DDL pipeline', () => {

    test('three-table schema produces valid DDL with FK indexes', async () => {
        const dbml = `
Table users {
  users_id integer [pk, increment]
  email varchar(255) [not null, unique]
}

Table orders {
  orders_id integer [pk, increment]
  users_id integer [not null]
  total decimal(10,2) [not null]
}

Table order_items {
  order_items_id integer [pk, increment]
  orders_id integer [not null]
  product_name varchar(200) [not null]
  quantity integer [not null]
}

Ref: orders.users_id > users.users_id
Ref: order_items.orders_id > orders.orders_id`;

        const ddl = await importDDL(dbml);
        expect(ddl).toContain('create table users');
        expect(ddl).toContain('create table orders');
        expect(ddl).toContain('create table order_items');
        expect(ddl).toContain('references users');
        expect(ddl).toContain('references orders');
        // ExpreSQL singularizes the parent name: users → user_id, orders → order_id
        expect(ddl).toContain('create index orders_i1 on orders (user_id)');
        expect(ddl).toContain('create index order_items_i1 on order_items (order_id)');
    });

    test('full test fixture produces expected DDL', async () => {
        const dbml = `
Project ecommerce {
  database_type: 'Oracle'
}

enum order_status {
  pending
  confirmed
  shipped
  cancelled
}

Table users {
  users_id     int [pk, increment]
  email        varchar(255) [not null, unique]
  created_at   timestamp [not null]
  created_by   varchar(128) [not null]
  updated_at   timestamp
  updated_by   varchar(128)
  row_version  int [not null]
  Note: 'Application users'
}

Table orders {
  orders_id    int [pk, increment]
  users_id     int [not null]
  total        decimal(10,2) [not null]
  status       order_status [not null]
  created_at   timestamp
  created_by   varchar(128)
  updated_at   timestamp
  updated_by   varchar(128)
}

Table order_items {
  order_items_id int [pk, increment]
  orders_id      int [not null]
  product_name   varchar(200) [not null]
  quantity       int [not null]
  price          decimal(10,2) [not null]
}

Ref: orders.users_id > users.users_id
Ref: order_items.orders_id > orders.orders_id`;

        const ddl = await importDDL(dbml);
        expect(ddl).toContain('create table users');
        expect(ddl).toContain('create table orders');
        expect(ddl).toContain('create table order_items');
        expect(ddl).toContain("comment on table users is 'Application users'");
        // Audit columns should appear as trigger-managed columns
        expect(ddl).toContain('created');
        expect(ddl).toContain('created_by');
        // row_version trigger
        expect(ddl).toContain('row_version');
        // Status check constraint
        expect(ddl).toContain("check (status in ('pending','confirmed','shipped','cancelled'))");
    });

    test('invalid DBML throws descriptive error', async () => {
        await expect(importDDL('this is not valid dbml {')).rejects.toThrow(/DBML parse error/);
    });

});
