import { describe, test, expect } from 'vitest';
import split_str from '../../src/split_str.js';

describe('split_str', () => {

    test('splits on a single symbol', () => {
        expect(split_str('a+b', '+')).toEqual(['a', '+', 'b']);
    });

    test('splits on multiple distinct symbols', () => {
        expect(split_str('a+b=c', '+=')).toEqual(['a', '+', 'b', '=', 'c']);
    });

    test('consecutive symbols produce one token each', () => {
        expect(split_str('a++b', '+')).toEqual(['a', '+', '+', 'b']);
    });

    test('symbol at start', () => {
        expect(split_str('+a', '+')).toEqual(['+', 'a']);
    });

    test('symbol at end', () => {
        expect(split_str('a+', '+')).toEqual(['a', '+']);
    });

    test('no symbols in text → single token', () => {
        expect(split_str('hello', '+')).toEqual(['hello']);
    });

    test('empty string → empty array', () => {
        expect(split_str('', '+')).toEqual([]);
    });

    test('only symbols → one token per character', () => {
        expect(split_str('+++', '+')).toEqual(['+', '+', '+']);
    });

    test('real QuickSQL use-case: slashes and spaces', () => {
        const tokens = split_str('/nn /pk', '/ ');
        expect(tokens).toContain('/');
        expect(tokens).toContain('nn');
        expect(tokens).toContain('pk');
    });

});
