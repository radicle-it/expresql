import { tab } from '../../../compiler/node.js';

export type OracleOperation = 'insert' | 'close' | 'update' | 'delete' | 'grant' | 'revoke';
export type OracleHookNameResolver = (procedure: string) => string;

export function createHookNameResolver(
    packageName: string,
    hasExternalHooks: boolean,
): OracleHookNameResolver {
    return procedure => hasExternalHooks ? `${packageName}.${procedure}` : `p_${procedure}`;
}

/**
 * Renders the authorization, before-hook, validation and scope protocol (2.6.0):
 *
 *     chk_rbac → before_<op> → validate → chk_rls → (the write)
 *
 * chk_rbac comes first: the permission on the operation is asked before any hook code runs. validate and chk_rls
 * come last, right before the write, so they judge the values actually written: a before_<op> may change the row,
 * and nothing it changes escapes the rules and the scope. Until 2.5.0 validate (and chk_rls) ran before
 * before_<op>, whose changes went to the table unchecked.
 */
export function renderBeforeOperation(
    operation: OracleOperation,
    rowVariable: string,
    hasDimensionScope: boolean,
    hookName: OracleHookNameResolver,
    idExpression = 'p_id',
): string {
    let r = `${tab}${tab}${hookName('chk_rbac')}(p_operation => '${operation}', p_row => ${rowVariable});\n`;
    r += operation === 'delete'
        ? `${tab}${tab}${hookName('before_delete')}(p_id => ${idExpression});\n`
        : `${tab}${tab}${hookName(`before_${operation}`)}(p_row => ${rowVariable});\n`;
    r += `${tab}${tab}${hookName('validate')}(p_operation => '${operation}', p_row => ${rowVariable});\n`;
    if (hasDimensionScope) r += `${tab}${tab}${hookName('chk_rls')}(p_row => ${rowVariable});\n`;
    return r;
}

/** Renders the after-hook matching an operation. */
export function renderAfterOperation(
    operation: OracleOperation,
    rowVariable: string,
    hookName: OracleHookNameResolver,
    idExpression = 'p_id',
): string {
    return operation === 'delete'
        ? `${tab}${tab}${hookName('after_delete')}(p_id => ${idExpression});\n`
        : `${tab}${tab}${hookName(`after_${operation}`)}(p_row => ${rowVariable});\n`;
}
