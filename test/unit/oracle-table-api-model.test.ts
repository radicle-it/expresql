import { describe, expect, test } from 'vitest';
import expresql from '../../src/ddl.js';
import {
    normalizeApiTier,
    OracleTableApiAnalyzer,
} from '../../src/oracle/plsql/table-model.js';

function fixture(input: string, table: string) {
    const ctx = new expresql(input);
    for (const node of ctx.descendants()) node.lateInitFks();
    const node = ctx.find(table);
    if (node === null) throw new Error(`Missing fixture table: ${table}`);
    const analyzer = new OracleTableApiAnalyzer(ctx);
    return { analyzer, model: analyzer.analyze(node), node };
}

describe('OracleTableApiModel', () => {
    test.each([
        [null, 'full+hks'],
        ['', 'full+hks'],
        ['layered', 'full+hks'],
        ['3h', 'full+hks'],
        ['3', 'full'],
        ['2h', 'service+hks'],
        ['2', 'service'],
        ['1h', 'lookup+hks'],
        ['1', 'lookup'],
        ['LOOKUP', 'lookup'],
    ])('normalizes API tier %j to %s', (input, expected) => {
        expect(normalizeApiTier(input)).toBe(expected);
    });

    test('normalizes names, capabilities, interfaces and lock defaults once', () => {
        const { analyzer, model, node } = fixture(`orders /api service+hks /lockmode wait:10
  order_no vc20 /nn /unique
  total num(12,2)
# settings = { prefix: "app_", interface: both }`, 'orders');

        expect(model.names).toMatchObject({
            table: 'app_orders',
            pk: 'id',
            dal: 'app_orders_dal',
            hooks: 'app_orders_hks',
            service: 'app_orders_svc',
            app: 'app_orders_app',
            rest: 'app_orders_rst',
        });
        expect(model.tier).toBe('service+hks');
        expect(model.capabilities).toEqual({ hasDal: false, hasHks: true, hasSvc: true });
        expect(model.interfaces).toEqual({ value: 'both', app: true, rest: true });
        expect(model.lockDefaults).toEqual({ lock: 'wait', timeout: 10 });
        expect(analyzer.analyze(node)).toBe(model);
    });

    test('collects columns and cross-cutting table features', () => {
        const { model } = fixture(`tenants /notenantid
  name vc100 /nn
companies /notenantid
  code vc20 /nn
orders /api full+hks /versioned /businesskey order_no /auditlog
  company_id /fk companies /nn
  order_no vc20 /nn /unique
  description vc200
  row_version num /nn
# settings = {
  tenantid: yes,
  dimensioncolumns: { company_id: "COMPANY" }
}`, 'orders');

        expect(model.columns.foreignKeys).toEqual(['company_id']);
        expect(model.columns.parameters).toEqual([
            { name: 'company_id', nullable: true },
            { name: 'order_no', nullable: false },
            { name: 'description', nullable: true },
        ]);
        expect(model.columns.unique.map(c => c.parseName())).toEqual(['order_no']);
        expect(model.features).toMatchObject({
            auditLog: true,
            versionColumn: true,
            versioned: true,
            immutable: false,
            syntheticTenantId: true,
        });
        expect(model.dimensionScopes).toEqual([{ col: 'company_id', dimType: 'COMPANY' }]);
        expect(model.versionToColumn).toBe('valid_to');
        expect(model.businessKeyColumn).toBe('order_no');
    });

    test('recognizes bridge metadata and user-defined primary keys', () => {
        const { model } = fixture(`users
  name
roles
  name
user_role /api /bridge
  assignment_key vc30 /pk /nn
  user_id /fk users /nn
  role_id /fk roles /nn
# settings = { genpk: no, pk: none }`, 'user_role');

        expect(model.names.pk).toBe('assignment_key');
        expect(model.pkIsUserDefined).toBe(true);
        expect(model.bridge).toEqual({ left: 'user_id', right: 'role_id', rightLabel: 'role' });
    });

    test('collects direct aggregate details only', () => {
        const { model } = fixture(`orders /api /aggregate
  status vc20
  order_lines /api
    sku vc50
    line_notes
      note_text vc200`, 'orders');

        expect(model.aggregateDetails).toHaveLength(1);
        expect(model.aggregateDetails[0]).toMatchObject({
            detailTbl: 'order_lines',
            fkCol: 'order_id',
        });
    });
});
