import { describe, expect, test } from 'vitest';
import {
    createHookNameResolver,
    renderAfterOperation,
    renderBeforeOperation,
} from '../../src/oracle/plsql/layered/operation-hooks.js';

const hookName = (procedure: string) => `orders_hks.${procedure}`;

describe('Oracle operation hook rendering', () => {
    test('selects external packages or absorbed private hooks', () => {
        expect(createHookNameResolver('orders_hks', true)('validate')).toBe('orders_hks.validate');
        expect(createHookNameResolver('orders_hks', false)('validate')).toBe('p_validate');
    });

    test('renders the complete row-operation protocol', () => {
        expect(renderBeforeOperation('insert', 'l_row', true, hookName)).toBe(
            "        orders_hks.chk_rbac(p_operation => 'insert', p_row => l_row);\n" +
            '        orders_hks.chk_rls(p_row => l_row);\n' +
            "        orders_hks.validate(p_operation => 'insert', p_row => l_row);\n" +
            '        orders_hks.before_insert(p_row => l_row);\n'
        );
        expect(renderAfterOperation('insert', 'l_row', hookName)).toBe(
            '        orders_hks.after_insert(p_row => l_row);\n'
        );
    });

    test('uses the identifier contract for delete hooks', () => {
        expect(renderBeforeOperation('delete', 'l_row', false, hookName, ':p_id')).toContain(
            'orders_hks.before_delete(p_id => :p_id);'
        );
        expect(renderAfterOperation('delete', 'l_row', hookName, ':p_id')).toBe(
            '        orders_hks.after_delete(p_id => :p_id);\n'
        );
    });
});
