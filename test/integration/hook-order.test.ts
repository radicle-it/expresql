/**
 * The order of the hooks around a write, on every tier and every interface (2.6.0):
 *
 *     chk_rbac → before_<op> → validate → chk_rls → (the write)
 *
 * validate and chk_rls judge the values actually written: whatever before_<op> changes in the row is still checked.
 * Every protocol block in the generated code (the _svc, an absorbed _app, a REST handler; insert, update, delete,
 * close, grant, revoke) is checked line by line, so a renderer that writes its own sequence cannot drift.
 */
import { describe, expect, test } from 'vitest';
import expresql from '../../src/ddl.js';

function ddl(input: string): string {
    return new (expresql as any)(input).getDDL();
}

// every protocol block: the chk_rbac line of an operation and the calls on the lines that follow it
function blocks(out: string): Array<{ op: string; calls: string[] }> {
    const lines = out.split('\n');
    const found: Array<{ op: string; calls: string[] }> = [];
    lines.forEach((line, i) => {
        const m = /^\s*(?:\w+_hks\.|p_)chk_rbac\(p_operation => '(\w+)'/.exec(line);
        if (!m) return;
        const calls = lines.slice(i, i + 4)
            .map(l => /^\s*(?:\w+_hks\.|p_)(chk_rbac|chk_rls|validate|before_\w+)\(/.exec(l)?.[1])
            .filter((c): c is string => c !== undefined);
        found.push({ op: m[1], calls });
    });
    return found;
}

function expectOrder(out: string, scoped = false): number {
    const found = blocks(out);
    for (const b of found) {
        const expected = ['chk_rbac', `before_${b.op}`, 'validate', ...(scoped ? ['chk_rls'] : [])];
        expect(b.calls.slice(0, expected.length), `operation ${b.op}`).toEqual(expected);
    }
    return found.length;
}

const TIERS = ['full+hks', 'full', 'service+hks', 'service', 'lookup+hks', 'lookup'];
const INTERFACES = ['app', 'rest', 'both'];

describe('hook order: chk_rbac → before_<op> → validate, on every tier and interface', () => {
    for (const tier of TIERS) {
        for (const ifc of INTERFACES) {
            test(`${tier}, interface ${ifc}`, () => {
                const out = ddl(`widgets /api ${tier}\n  name vc100 /nn\n# settings = { interface: ${ifc} }`);
                expect(expectOrder(out)).toBeGreaterThan(0);
            });
        }
    }

    test('/versioned: close and insert of the new version', () => {
        const out = ddl(`policies /api full+hks /versioned /businesskey code\n  code vc20 /nn\n  name vc100\n# settings = { interface: both }`);
        expect(expectOrder(out)).toBeGreaterThan(0);
        expect(out).toMatch(/before_close\(p_row => l_\w+\);\n\s*policies_hks\.validate\(p_operation => 'close'/);
    });

    test('/bridge: grant and revoke', () => {
        const out = ddl(`users /api\n  name vc100 /nn\nroles /api\n  name vc100 /nn\nuser_role /api full+hks /bridge\n  user_id /fk users\n  role_id /fk roles\n# settings = { interface: both }`);
        expect(expectOrder(out)).toBeGreaterThan(0);
        expect(out).toMatch(/user_role_hks\.before_grant\(p_row => l_row\);\n\s*user_role_hks\.validate\(p_operation => 'grant'/);
    });

    test('dimension scope: chk_rls comes last, right after validate', () => {
        const out = ddl(`tenants /notenantid\n  name vc100 /nn\ncompanies /notenantid\n  code vc20 /nn\nwidgets /api full+hks\n  company_id /fk companies\n  name vc100 /nn\n# settings = { dimensioncolumns: { company_id: "COMPANY" } }`);
        const widgets = out.slice(out.indexOf('create or replace package body widgets_svc'));
        expect(expectOrder(widgets.slice(0, widgets.indexOf('end widgets_svc;')), true)).toBeGreaterThan(0);
    });
});

// X1-4 (82b §3.3): a bulk call runs per row the whole scalar sequence, then validate_many, the DML, after_<op> per
// row and after_many
describe('hook order: /bulk, the scalar sequence per row then the batch', () => {
    const OPS: Array<[string, string, string]> = [
        ['p_create_many', 'insert_rows', 'after_insert'],
        ['p_update_many', 'update_rows', 'after_update'],
        ['p_delete_many', 'delete_rows', 'after_delete'],
    ];
    for (const tier of ['full+hks', 'full', 'service+hks', 'service']) {
        test(tier, () => {
            const out = ddl(`widgets /api ${tier} /bulk\n  name vc100 /nn\n  site vc20\n# settings = { dimensioncolumns: { site: "SITE" } }`);
            expect(expectOrder(out, true)).toBeGreaterThan(0);
            for (const [proc, dml, after] of OPS) {
                const body = out.slice(out.indexOf(`procedure ${proc} (`), out.indexOf(`end ${proc};`));
                const at = (re: RegExp) => body.search(re);
                const steps = [/chk_rbac\(/, /chk_rls\(/, /validate_many\(/, new RegExp(`${dml}\\(`), new RegExp(`${after}\\(`), /after_many\(/];
                const positions = steps.map(at);
                positions.forEach((p, k) => expect(p, `${proc}: ${steps[k]}`).toBeGreaterThan(-1));
                expect(positions, proc).toEqual([...positions].sort((a, b) => a - b));
            }
        });
    }
});
