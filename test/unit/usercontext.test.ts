/**
 * The usercontext setting (2.7.0): a namespace literal, or a PL/SQL constant (pkg.constant) holding the namespace.
 * A namespace never contains a dot, so a qualified name is emitted as is in the audit triggers: a wrong name then
 * fails to compile instead of reading NULL at runtime (ocean-code 00-docs/01c §5).
 */

import { describe, test, expect } from 'vitest';
import { toDDL } from '../../src/ddl.js';

const model = (uctx: string) => `
customers
  full_name vc200 /nn

# settings = { auditcols: yes, apex: yes, usercontext: ${uctx} }`;

describe('usercontext', () => {
    test('a namespace is quoted', () => {
        const ddl = toDDL(model('"MY_APP_CTX"'));
        expect(ddl).toContain("coalesce(sys_context('MY_APP_CTX','USER'),sys_context('APEX$SESSION','APP_USER'),user)");
    });

    test('a qualified constant is emitted as is, in the insert and the update trigger', () => {
        const ddl = toDDL(model('"ctx_const.c_namespace"'));
        const hits = ddl.split("coalesce(sys_context(ctx_const.c_namespace,'USER'),sys_context('APEX$SESSION','APP_USER'),user)").length - 1;
        expect(hits).toBe(3);   // created_by, updated_by (insert), updated_by (update)
        expect(ddl).not.toContain("'ctx_const.c_namespace'");
    });

    test('not set: no application context', () => {
        const ddl = toDDL(model('""'));
        expect(ddl).toContain("coalesce(sys_context('APEX$SESSION','APP_USER'),user)");
    });
});
