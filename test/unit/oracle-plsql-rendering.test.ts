import { describe, expect, test } from 'vitest';
import { bareName } from '../../src/oracle/plsql/names.js';
import {
    parameterWidth,
    renderDuplicateValueException,
    renderInputParameterLines,
    renderOutAssignments,
    renderOutParameterBlock,
    renderRecordAssignments,
} from '../../src/oracle/plsql/layered/rendering.js';

describe('Oracle PL/SQL rendering primitives', () => {
    test('normalizes qualified names for END clauses', () => {
        expect(bareName('orders_pkg')).toBe('orders_pkg');
        expect(bareName('app.orders_pkg')).toBe('orders_pkg');
    });

    test('keeps the minimum width and expands for long identifiers', () => {
        expect(parameterWidth(13, ['id', 'name'])).toBe(13);
        expect(parameterWidth(13, ['workflow_correlation_id'])).toBe(24);
    });

    test('renders flat input parameters including nullable defaults', () => {
        expect(renderInputParameterLines('orders', [
            { name: 'status', nullable: false },
            { name: 'note', nullable: true },
        ], 7)).toEqual([
            '        p_status  in  orders.status%type',
            '        p_note    in  orders.note%type default null',
        ]);
    });

    test('renders output declarations and row assignments', () => {
        expect(renderOutParameterBlock('orders', ['status'], 7))
            .toBe(',\n        p_status  out orders.status%type');
        expect(renderOutAssignments(['status']))
            .toBe('        p_status := l_row.status;\n');
    });

    test('renders record population and duplicate translation', () => {
        expect(renderRecordAssignments(['status'], 'l_row', name => `p_rec.${name}`))
            .toBe('        l_row.status := p_rec.status;\n');
        expect(renderDuplicateValueException()).toContain(
            "raise_application_error(-20010, '[DUPLICATE] duplicate value on unique constraint.');"
        );
    });
});
