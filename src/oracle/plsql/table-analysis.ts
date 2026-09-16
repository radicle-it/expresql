import type { DdlContext, IDdlNode } from '../../compiler/types.js';

/** True when tenant_id is injected synthetically rather than declared or inherited. */
export function hasSyntheticTenantId(ctx: DdlContext, node: IDdlNode): boolean {
    return ctx.optionEQvalue('tenantid', true)
        && !node.isOption('notenantid')
        && node.findChild('tenant_id') === null
        && !Object.prototype.hasOwnProperty.call(node.fks ?? {}, 'tenant_id');
}
