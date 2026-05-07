/**
 * Integration tests for syntax error detection (errorMsgs.ts).
 * Ported from error_msg_tests.js with proper Vitest matchers.
 */
import { describe, test, expect } from 'vitest';
import quicksql, { toErrors }  from '../../src/ddl.js';
import errorMsgs               from '../../src/errorMsgs.js';

// ── Helpers (mirror error_msg_tests.js) ───────────────────────────────────────

interface ErrorEntry {
    from:    { line: number; depth: number };
    to:      { line: number; depth: number };
    message: string;
}

function expectError(msgList: unknown[], line: number, offset: number, msg: string): void {
    const found = (msgList as ErrorEntry[]).some(
        e => e.from.line === line && e.from.depth === offset && e.message === msg
    );
    if (!found) {
        const list = (msgList as ErrorEntry[]).map(e =>
            `  line=${e.from.line} depth=${e.from.depth}: "${e.message}"`
        ).join('\n');
        throw new Error(
            `Expected error "${msg}" at line=${line} depth=${offset} not found.\nActual errors:\n${list}`
        );
    }
}

function expectNoError(msgList: unknown[], msgPrefix?: string): void {
    for (const err of msgList as ErrorEntry[]) {
        const matches = msgPrefix == null || err.message.startsWith(msgPrefix);
        if (matches)
            throw new Error(`Unexpected error: "${err.message}"`);
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('error detection', () => {

    test('explicit id column with genpk:true → duplicateId error', () => {
        const errors = toErrors(`dept\n    id`) as unknown[];
        expectError(errors, 1, 4, errorMsgs.messages.duplicateId);
    });

    test('vc-200 and vc0 → invalidDatatype errors', () => {
        const errors = new (quicksql as any)(`dept\n    name vc-200\n    name vc0`).getErrors();
        expectError(errors, 1, 4 + 4 + 2 + 1, errorMsgs.messages.invalidDatatype);
        expectError(errors, 2, 4 + 4 + 1,      errorMsgs.messages.invalidDatatype);
        expectNoError(errors, errorMsgs.messages.misalignedAttribute);
    });

    test('undefined FK target → undefinedObject error', () => {
        const errors = new (quicksql as any)(`dept\n    name\ncustomer\n    dept /fk department`).getErrors();
        expectError(errors, 3, 4 + 4 + 1 + 3 + 1, errorMsgs.messages.undefinedObject + 'department');
        expectNoError(errors, errorMsgs.messages.misalignedAttribute);
    });

    test('view referencing undefined table → undefinedObject error', () => {
        const errors = new (quicksql as any)(`dept\n    name\nview customer_view customer`).getErrors();
        expectError(errors, 2, 4 + 1 + 13 + 1, errorMsgs.messages.undefinedObject + 'customer');
        expectNoError(errors, errorMsgs.messages.misalignedAttribute);
    });

    test('misaligned column (3-space indent in 4-space context) → misalignedAttribute', () => {
        const errors = new (quicksql as any)(`dept\n   col1\n    "is this table or misaligned column?"`).getErrors();
        expectError(errors, 2, 4, errorMsgs.messages.misalignedAttribute + '3');
    });

    test('misaligned column in multi-column table → misalignedAttribute on last line', () => {
        const errors = new (quicksql as any)(`dept\n   col1\n   col2\n    "is this table or misaligned column?"`).getErrors();
        expectError(errors, 3, 4, errorMsgs.messages.misalignedAttribute + '3');
    });

    test('nested tables with consistent indent → no misalignment error', () => {
        const errors = new (quicksql as any)(`dept\n   name\n   emp\n      name`).getErrors();
        expectNoError(errors, errorMsgs.messages.misalignedAttribute);
    });

    test('settings line does not trigger spurious errors', () => {
        const errors = new (quicksql as any)(`dept\n   name\n   \nx = dept`).getErrors();
        expectNoError(errors);
    });

    test('FK check respects APEX prefix on table names', () => {
        const errors = new (quicksql as any)(`# apex:Y\nteam_statuses\n    name /fk undefined`).getErrors();
        expectError(errors, 2, 4 + 4 + 1 + 3 + 1, errorMsgs.messages.undefinedObject + 'undefined');
    });

    test('FK with bracket comment does not cause false positive', () => {
        const errors = new (quicksql as any)(`team_statuses\n    name\n\nteams\n    name\n    status /fk team_statuses  [Status ]`).getErrors();
        expectNoError(errors);
    });

    test('FK check works after block comment at start', () => {
        const errors = new (quicksql as any)(`/* line1\n    line2 */\nteam_statuses\n    name /fk undefined`).getErrors();
        expectError(errors, 3, 4 + 4 + 1 + 3 + 1, errorMsgs.messages.undefinedObject + 'undefined');
    });

    test('misaligned column: 3-space indent where 4 is the pattern', () => {
        const errors = new (quicksql as any)(`emp\n    ename\n    deptno /fk dept\n  \ndept\n   dname`).getErrors();
        expectError(errors, 5, 3, errorMsgs.messages.misalignedAttribute + '4');
    });

    test('unknown table directive → tableDirectiveTypo error', () => {
        const errors = new (quicksql as any)(`emp /fk\n    ename  /audit`).getErrors();
        expectError(errors, 0, 5, errorMsgs.messages.tableDirectiveTypo);
    });

    test('unknown column directive → columnDirectiveTypo error', () => {
        const errors = new (quicksql as any)(`emp /fk\n    ename  /audit`).getErrors();
        expectError(errors, 1, 4 + 5 + 1 + 1 + 1, errorMsgs.messages.columnDirectiveTypo);
    });

});

describe('error message constants', () => {

    test('all expected message keys are present', () => {
        expect(errorMsgs.messages.duplicateId).toBeTruthy();
        expect(errorMsgs.messages.invalidDatatype).toBeTruthy();
        expect(errorMsgs.messages.undefinedObject).toBeTruthy();
        expect(errorMsgs.messages.misalignedAttribute).toBeTruthy();
        expect(errorMsgs.messages.tableDirectiveTypo).toBeTruthy();
        expect(errorMsgs.messages.columnDirectiveTypo).toBeTruthy();
    });

});
