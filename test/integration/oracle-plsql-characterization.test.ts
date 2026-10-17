/**
 * Byte-for-byte characterization of OraclePlsqlBuilder output.
 *
 * These fingerprints are intentionally stricter than the semantic assertions in
 * tapi-layered.test.ts: they protect the refactoring boundary while plsql.ts is
 * split into model analysis and focused renderers. When a fingerprint changes,
 * inspect the generated SQL before accepting the new value.
 */
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import expresql from '../../src/ddl.js';
import { DEFAULT_NAMING } from '../../src/compiler/node.js';
import type { IDdlNode } from '../../src/compiler/types.js';
import { OraclePlsqlBuilder } from '../../src/oracle/plsql.js';

type Render = (builder: OraclePlsqlBuilder, node: IDdlNode) => string;

function render(input: string, table: string, renderer: Render): string {
    const ctx = new expresql(input);
    // Full generation performs the same FK late-initialisation used in production.
    ctx.getDDL();
    const node = ctx.find(table);
    if (node === null) throw new Error(`Table not found in characterization fixture: ${table}`);
    return renderer(new OraclePlsqlBuilder(ctx, DEFAULT_NAMING), node);
}

function fingerprint(output: string): string {
    const hash = createHash('sha256').update(output, 'utf8').digest('hex');
    return `${Buffer.byteLength(output, 'utf8')}:${hash}`;
}

const cases: Array<{
    name: string;
    input: string;
    table: string;
    render: Render;
    expected: string;
}> = [
    {
        name: 'legacy flat TAPI',
        input: `employees /api
  name vc100 /nn
  email vc200 /unique
# settings = { api: yes }`,
        table: 'employees',
        render: (builder, node) => builder.generateTAPI(node),
        expected: '1932:18a215c71142a167b9cee02e010e556ad1b70156e57da59fbe6f2fe831216c28',
    },
    {
        name: 'full+hks layered TAPI with APP interface and audit',
        input: `app_audit_log /api
  entity vc128 /nn
  entity_id num /nn
  operation vc6 /nn
  old_values clob
  new_values clob
employees /api full+hks /auditlog app_audit_log
  name vc100 /nn
  email vc200 /unique
  row_version num /nn
# settings = { api: layered }`,
        table: 'employees',
        render: (builder, node) => builder.generateLayeredTAPI(node),
        expected: '15385:ebe1a5bea9e0ef5d3648e7db5683b40a63da4624c191db05ccc06127cc6ad673',
    },
    {
        name: 'service tier with REST interface and absorbed DAL/hooks',
        input: `orders /api service
  customer_id num /nn
  total num(12,2)
  row_version num /nn
# settings = { interface: rest }`,
        table: 'orders',
        render: (builder, node) => builder.generateLayeredTAPI(node),
        expected: '11966:b57459b2d980b9af2658fea49f5e83ac5bc0c308ad0053520eb5b49b4f25467f',
    },
    {
        name: 'lookup tier with both interfaces',
        input: `lookup_codes /api lookup
  code vc20 /nn /unique
  label vc100 /nn
# settings = { interface: both }`,
        table: 'lookup_codes',
        render: (builder, node) => builder.generateLayeredTAPI(node),
        expected: '18278:12ed1cc140ca4467616b7fda4fadf8b27b11e280fd7c3b210473b2ff9da7a33a',
    },
    {
        name: 'tenant and dimension scoped layered TAPI',
        input: `tenants /notenantid
  name vc100 /nn
companies /notenantid
  code vc20 /nn
widgets /api full+hks
  company_id /fk companies /nn
  name vc100 /nn
# settings = { tenantid: yes, dimensioncolumns: { company_id: "COMPANY" } }`,
        table: 'widgets',
        render: (builder, node) =>
            builder.generateTenantCtxSpec('') +
            builder.generateTenantCtxBody('') +
            builder.generateTenantBootstrapSpec('') +
            builder.generateTenantBootstrapBody('') +
            builder.generateLayeredTAPI(node),
        expected: '12466:37cefa29ac2b97e1b4f86f5e278ca40b962c48dd01afa0489e1be5f4252f26d0',
    },
    {
        name: 'versioned business-key TAPI with APP and REST interfaces',
        input: `customer_dim /api full+hks /versioned /businesskey code
  code vc20 /nn
  name vc200 /nn
  row_version num /nn
# settings = { interface: both }`,
        table: 'customer_dim',
        render: (builder, node) =>
            builder.generateVersionedTrigger(node) + builder.generateLayeredTAPI(node),
        // Fingerprint updated: /versioned's DAL now generates update_row/delete_row
        // (guarded by "and valid_to is null") additive to close_row, no longer omitted
        // — see doc/user/expresql-grammar.md. generateVersionedTrigger() itself is
        // unchanged here (this direct call bypasses generateFullDDL's new "skip when
        // layered" gating, which lives in generator.ts, not in the trigger renderer).
        // Fingerprint updated again (2.1.1): _svc.change_rec now forces
        // l_rec.<vtCol> := null before create_rec (the next version always opens
        // open) — same fix that drops a declared <vtCol> from _app/_rst change_rec's
        // flat parameters, which this fixture (no declared valid_to) does not exercise.
        expected: '33220:4fa2b6fa267f8ae01b5d7e362e7521bee03ae8c02d0ef3f75e31ea1967a3f594',
    },
    {
        name: 'immutable TAPI with REST interface',
        input: `events /api full+hks /immutable
  event_type vc50 /nn
  payload clob
# settings = { interface: rest }`,
        table: 'events',
        render: (builder, node) =>
            builder.generateImmutableTrigger(node) + builder.generateLayeredTAPI(node),
        expected: '9084:d31081a3de0add856cb361173049705e93017d13f878cb31499905d8dd0b4bc4',
    },
    {
        name: 'bridge TAPI',
        input: `users /api
  name vc100 /nn
roles /api
  name vc100 /nn
user_role /api full+hks /bridge
  user_id /fk users /nn
  role_id /fk roles /nn`,
        table: 'user_role',
        render: (builder, node) => builder.generateLayeredTAPI(node),
        expected: '15916:acf95923b67a2d693cd0cfddbb2cab6b24d1e5c448dfbcfe20cca6f783aeea93',
    },
    {
        name: 'aggregate package',
        input: `orders /api /aggregate
  customer_id num /nn
  status vc20 /nn
  order_lines /api
    sku vc50 /nn
    qty num /nn
# settings = { api: layered }`,
        table: 'orders',
        render: (builder, node) => builder.generateAggregatePackage(node),
        expected: '7635:a7ab9c80fb886bdb5179e6b57fb477dec5d8019ea29706e9b3665ab9a172365a',
    },
    {
        name: 'trigger and ORDS generation',
        input: `accounts /rest /auditcols /rowversion
  username vc100 /nn /lower
  status vc20 /upper`,
        table: 'accounts',
        render: (builder, node) => builder.generateTrigger(node) + builder.restEnable(node),
        expected: '725:cc4dfebf4236a83e117817e821fc28a27dc3015f50177e28f1cf71921e95e7fa',
    },
];

describe('Oracle PL/SQL generator characterization', () => {
    for (const fixture of cases) {
        test(fixture.name, () => {
            const output = render(fixture.input, fixture.table, fixture.render);
            expect(fingerprint(output)).toBe(fixture.expected);
        });
    }
});
