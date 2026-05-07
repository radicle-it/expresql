import { describe, test, expect } from 'vitest';
import { singular, canonicalObjectName, concatNames, getMajorVersion } from '../../src/naming.js';

// ── singular ──────────────────────────────────────────────────────────────────

describe('singular', () => {

    test('null → null', () => {
        expect(singular(null)).toBeNull();
    });

    test('plain -s plural', () => {
        expect(singular('departments')).toBe('department');
        expect(singular('customers')).toBe('customer');
    });

    test('-ies plural', () => {
        expect(singular('categories')).toBe('category');
        expect(singular('countries')).toBe('country');
    });

    test('-es plural (only strips the trailing s)', () => {
        // 'employees' ends with 'ES' → removes last char ('s') → 'employee'
        expect(singular('employees')).toBe('employee');
    });

    test('word with no recognised plural suffix is returned unchanged', () => {
        // 'order' does not end in s/es/ies
        expect(singular('order')).toBe('order');
    });

    test('preserves original casing', () => {
        // singular() checks upper-cased suffix but returns using original casing
        expect(singular('Departments')).toBe('Department');
        expect(singular('EMPLOYEES')).toBe('EMPLOYEE');
    });

    test('single character s → empty string (edge case, not a crash)', () => {
        expect(singular('s')).toBe('');
    });

});

// ── canonicalObjectName ───────────────────────────────────────────────────────

describe('canonicalObjectName', () => {

    test('null → null', () => {
        expect(canonicalObjectName(null)).toBeNull();
    });

    test('plain lowercase name → unchanged (no quoting)', () => {
        expect(canonicalObjectName('dept')).toBe('dept');
    });

    test('space replaced with underscore', () => {
        expect(canonicalObjectName('my dept')).toBe('my_dept');
    });

    test('already-quoted name is returned as-is', () => {
        expect(canonicalObjectName('"my dept"')).toBe('"my dept"');
    });

    test('name starting with digit is double-quoted', () => {
        const result = canonicalObjectName('1dept');
        expect(result).toBe('"1dept"');
    });

    test('name starting with underscore is double-quoted', () => {
        const result = canonicalObjectName('_dept');
        expect(result).toBe('"_dept"');
    });

    test('name with special char is double-quoted', () => {
        const result = canonicalObjectName('dept-v2');
        expect(result).toBe('"dept-v2"');
    });

});

// ── concatNames ───────────────────────────────────────────────────────────────

describe('concatNames', () => {

    test('two plain names → lowercase concatenation', () => {
        expect(concatNames('HR', 'DEPT')).toBe('hrdept');
    });

    test('three plain names', () => {
        expect(concatNames('HR', '_', 'DEPT')).toBe('hr_dept');
    });

    test('any quoted chunk → result is quoted', () => {
        expect(concatNames('"My"', 'Table')).toBe('"MyTable"');
    });

    test('quoted chunks are stripped of their own quotes', () => {
        expect(concatNames('"A"', '"B"')).toBe('"AB"');
    });

});

// ── getMajorVersion ───────────────────────────────────────────────────────────

describe('getMajorVersion', () => {

    test('extracts leading two-digit number', () => {
        expect(getMajorVersion('19c')).toBe(19);
        expect(getMajorVersion('23ai')).toBe(23);
        expect(getMajorVersion('11g')).toBe(11);
    });

    test('string shorter than 2 chars → null', () => {
        expect(getMajorVersion('9')).toBeNull();
        expect(getMajorVersion('')).toBeNull();
    });

});
