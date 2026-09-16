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
        expected: '15385:c97561c05a95ebae8f76b3fc583b68ccb7335f4bf45577e5a8a44c9331df2674',
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
        expected: '11966:0392d8bbf4f9ce6f818cc17f7cfd2794eec3bfa0a98a09fe3228de38c413b1e0',
    },
    {
        name: 'lookup tier with both interfaces',
        input: `lookup_codes /api lookup
  code vc20 /nn /unique
  label vc100 /nn
# settings = { interface: both }`,
        table: 'lookup_codes',
        render: (builder, node) => builder.generateLayeredTAPI(node),
        expected: '18278:fabc43fbdd9a6b381c9529a627e64e244df0b053171038090f4e2dd94e559104',
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
        expected: '12466:271ee39ac4c9ba54833706b37304f0ffadf82b4eaedf426b98d3e02cba7f7dfc',
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
        expected: '26144:68f5d597801451577a020ffb83210c642fb7e0845b36bb3e488ee85ff8dce5ab',
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
        expected: '9084:cdbfd02b387282e219d9ae26f631849ca4aad4a8572bce09e315f4a5b77e679e',
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
        expected: '15916:d082aa4d54d5db3d1e4f26a074aaa10dd5d0a4832a9137602af37dfbb2eed198',
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
        expected: '2007:79e0590859e30b65e0fa8f183a4f7878d5bb1a96c827e236602b7cbf9f1121c4',
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
