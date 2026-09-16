import { tab } from '../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../compiler/types.js';

export function generateRestEnable(ctx: DdlContext, node: IDdlNode): string {
    if (node.inferType() !== 'table') return '';
    if (!node.isOption('rest')) return '';
    const name     = node.parseName();
    const isQuoted = name.indexOf('"') === 0;
    let objName = ctx.objPrefix() + name;
    if (isQuoted) objName = ctx.objPrefix() + name.substring(1, name.length - 1);
    else objName = (ctx.objPrefix() + name).toUpperCase();
    return "begin\n" + tab + "ords.enable_object(p_enabled=>TRUE, p_object=>'" + objName + "');\nend;\n/\n";
}
