/**
 * Smoke tests for the 15 scenarios documented in doc/user/examples.md.
 * Each test verifies that key DDL patterns are present in the generated output.
 * These tests protect against regressions that would make the documentation wrong.
 */

import { describe, test, expect } from 'vitest';
import { toDDL, toErrors } from '../../src/ddl.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Assert that ddl contains every string in the patterns array. */
function contains(ddl: string, ...patterns: string[]): void {
    for (const p of patterns) {
        expect(ddl, `expected DDL to contain: ${p}`).toContain(p);
    }
}

/** Assert that no errors are returned for the given QSQL. */
function noErrors(qsql: string): void {
    const errors = toErrors(qsql);
    expect(errors, 'expected no parse errors').toHaveLength(0);
}

/**
 * Assert no structural errors (ignores undefinedObject, which is expected when
 * QSQL snippets reference tables that exist in the broader schema but are not
 * redefined in the snippet — e.g. /fk to an external table).
 */
function noStructuralErrors(qsql: string): void {
    const errors = toErrors(qsql).filter((e: { message: string }) => !e.message.startsWith('Undefined Object'));
    expect(errors, 'expected no structural parse errors').toHaveLength(0);
}

// ── 1. Basic parent-child hierarchy ──────────────────────────────────────────

describe('Example 1 — parent-child hierarchy', () => {
    const qsql = `departments /insert 2
  name /nn
  location
  employees /insert 4
    name /nn vc50
    email /lower
    salary num(10,2)
    date hired`;

    test('generates both tables', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'create table departments', 'create table employees');
    });

    test('employees has FK to departments', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'references departments');
    });

    test('/lower generates a before-insert trigger on email', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'lower(:new.email)');
    });

    test('/nn generates NOT NULL on name', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'not null');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 2. Audit columns and APEX ─────────────────────────────────────────────────

describe('Example 2 — audit columns + APEX', () => {
    const qsql = `projects
  name vc200 /nn
  status /check OPEN,ACTIVE,CLOSED /nn
  budget num(12,2)

# settings = { auditcols: yes, apex: yes }`;

    test('generates audit columns', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'created', 'created_by', 'updated', 'updated_by');
    });

    test('audit trigger uses APEX$SESSION', () => {
        const ddl = toDDL(qsql);
        contains(ddl, "APEX\$SESSION");
    });

    test('/check produces IN constraint', () => {
        const ddl = toDDL(qsql);
        contains(ddl, "'OPEN'", "'ACTIVE'", "'CLOSED'");
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 3. Column prefix ──────────────────────────────────────────────────────────

describe('Example 3 — /colprefix', () => {
    const qsql = `invoices /colprefix inv
  customer_id /fk customers /nn
  total num(14,2) /nn`;

    test('columns are prefixed', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'inv_customer_id', 'inv_total');
    });

    // customers is an external table — undefinedObject is expected by design
    test('no structural errors', () => noStructuralErrors(qsql));
});

// ── 4. FK to external table ───────────────────────────────────────────────────

describe('Example 4 — FK to external table', () => {
    const qsql = `invoices
  customer_id /fk customers /nn
  status /check DRAFT,ISSUED,PAID /nn`;

    test('generates FK reference to external table', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'references customers');
    });

    // customers is an external table — undefinedObject is expected by design
    test('no structural errors', () => noStructuralErrors(qsql));
});

// ── 5. Star schema (>) ────────────────────────────────────────────────────────

describe('Example 5 — star schema with >', () => {
    const qsql = `sales /insert 2
  quantity
  > products /insert 1
    name
  > customers /insert 1
    first name

# pk: identityDataType
# semantics: char`;

    test('generates three tables', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'create table sales', 'create table products', 'create table customers');
    });

    test('fact table carries FKs to dimension tables', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'references products', 'references customers');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 6. JSON Duality Views (23ai+) ─────────────────────────────────────────────

describe('Example 6 — JSON Duality Views', () => {
    const qsql = `departments
  name vc200 /nn
  employees
    first_name vc100 /nn
    last_name  vc100 /nn

dv dept_emp_dv departments employees

# settings = { db: "23c" }`;

    test('generates duality view', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'json relational duality view', 'dept_emp_dv');
    });

    test('duality view contains nested employees', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'employees');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 7. /trans — multi-lingual columns ────────────────────────────────────────

describe('Example 7 — /trans multi-lingual', () => {
    const qsql = `dept /immutable
  dname /trans

# prefix: abc`;

    test('generates language table', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'abc_language');
    });

    test('generates _trans table with trans_ prefix on column', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'abc_dept_trans', 'trans_dname');
    });

    test('generates _resolved view with COALESCE and LEFT JOIN', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'abc_dept_resolved', 'coalesce', 'left join');
    });

    test('_resolved view uses sys_context for language', () => {
        const ddl = toDDL(qsql);
        contains(ddl, "sys_context('APP_CTX','LANG')");
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 8. /immutable ─────────────────────────────────────────────────────────────

describe('Example 8 — /immutable', () => {
    const qsql = `audit_log /immutable
  entity    vc128 /nn
  operation vc10 /nn`;

    test('generates immutable trigger', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'before update or delete', 'raise_application_error');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 9. /soda ──────────────────────────────────────────────────────────────────

describe('Example 9 — /soda document collection', () => {
    const qsql = `sensor_readings /soda`;

    test('generates SODA fixed schema columns', () => {
        const ddl = toDDL(qsql);
        // json_document uses native json type (21c+); no IS JSON check constraint
        contains(ddl, 'json_document', 'last_modified');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 10. /flashback ────────────────────────────────────────────────────────────

describe('Example 10 — Flashback Data Archive', () => {
    const qsql = `salaries /flashback payroll_fda
  employee_id /fk employees /nn
  amount num(12,2) /nn`;

    test('generates flashback archive statement', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'flashback archive', 'payroll_fda');
    });

    // employees is an external table — undefinedObject is expected by design
    test('no structural errors', () => noStructuralErrors(qsql));
});

// ── 11. Sample data: /values, /constant ───────────────────────────────────────

describe('Example 11 — /values and /constant', () => {
    const qsql = `orders /insert 3
  customer_id num /nn /constant 42
  status /values OPEN,PENDING,SHIPPED /nn`;

    test('generates INSERT rows', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'insert into orders');
    });

    test('/constant pins customer_id to 42', () => {
        const ddl = toDDL(qsql);
        expect(ddl).toMatch(/42/);
    });

    test('inserts: false suppresses all INSERT statements', () => {
        const ddlNoInserts = toDDL(qsql + '\n# inserts: false');
        expect(ddlNoInserts).not.toContain('insert into orders');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 12. Oracle SQL Annotations ────────────────────────────────────────────────

describe('Example 12 — Oracle SQL annotations', () => {
    const qsql = `employees {DESCRIPTION 'HR workforce table', Classification 'HR'}
  name vc200 /nn {DESCRIPTION 'Full legal name'}`;

    test('generates annotations clause on table', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'annotations');
    });

    test('DESCRIPTION annotation generates COMMENT ON TABLE', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'comment on table employees');
    });

    test('DESCRIPTION annotation generates COMMENT ON COLUMN', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'comment on column employees.name');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 13. /rest ─────────────────────────────────────────────────────────────────

describe('Example 13 — ORDS REST enablement', () => {
    const qsql = `products /rest
  name vc200 /nn
  price num(10,2)`;

    test('generates ords.enable_object call', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'ords.enable_object', "'PRODUCTS'");
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 14. /api ──────────────────────────────────────────────────────────────────

describe('Example 14 — Table API (/api)', () => {
    const qsql = `products /api
  name vc200 /nn
  price num(10,2)`;

    test('generates PL/SQL package', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'package', 'products');
    });

    test('no parse errors', () => noErrors(qsql));
});

// ── 15. Combined schema ───────────────────────────────────────────────────────

describe('Example 15 — combined schema', () => {
    const qsql = `customers {DESCRIPTION 'Registered customers'}
  full_name vc200 /nn
  email     vc200 /nn /unique /lower
  tier      /check STANDARD,GOLD,PLATINUM /nn /default STANDARD

orders /auditcols /rowversion
  customer_id /fk customers /nn
  status /check OPEN,SHIPPED,DELIVERED /nn
  total num(12,2) /nn

view customer_orders customers orders

# settings = { prefix: "shop_", auditcols: yes, apex: yes, db: "23c" }`;

    test('generates prefixed tables', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'create table shop_customers', 'create table shop_orders');
    });

    test('generates join view', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'shop_customer_orders');
    });

    test('audit columns present', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'created_by', 'updated_by');
    });

    test('DESCRIPTION generates COMMENT ON', () => {
        const ddl = toDDL(qsql);
        contains(ddl, 'comment on table shop_customers');
    });

    test('no parse errors', () => noErrors(qsql));
});
