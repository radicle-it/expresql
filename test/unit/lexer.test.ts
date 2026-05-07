import { describe, test, expect } from 'vitest';
import lexer, { LexerToken } from '../../src/lexer.js';

// Helper: tokenise with the most common flags (no ws, no quoted-strings, no extra operators)
function lex(input: string, extraOper = ''): LexerToken[] {
    return lexer(input, false, false, extraOper);
}

// Helper: tokenise keeping whitespace
function lexWS(input: string): LexerToken[] {
    return lexer(input, true, false, '');
}

// Helper: tokenise with quoted-string support
function lexQ(input: string): LexerToken[] {
    return lexer(input, false, true, '');
}

// ── Basic token types ─────────────────────────────────────────────────────────

describe('identifier tokens', () => {

    test('single word', () => {
        const tokens = lex('dept');
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('identifier');
        expect(tokens[0].value).toBe('dept');
    });

    test('two words separated by space', () => {
        const tokens = lex('dept name');
        expect(tokens).toHaveLength(2);
        expect(tokens[0].value).toBe('dept');
        expect(tokens[1].value).toBe('name');
    });

    test('lowerValue is always lowercase', () => {
        const tokens = lex('DEPT');
        expect(tokens[0].lowerValue).toBe('dept');
        expect(tokens[0].value).toBe('DEPT');
    });

});

describe('numeric tokens', () => {

    test('integer literal', () => {
        const tokens = lex('42');
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('constant.numeric');
        expect(tokens[0].value).toBe('42');
    });

    test('decimal literal', () => {
        const tokens = lex('3.14');
        expect(tokens[0].type).toBe('constant.numeric');
    });

    test('number inside expression: a+2', () => {
        const tokens = lex('a+2', '+');
        expect(tokens[1].type).toBe('operation');
        expect(tokens[2].type).toBe('constant.numeric');
    });

});

describe('operator tokens', () => {

    test('/ is always an operation token regardless of extraOper', () => {
        // '/' is in the default operation set, so it is always split
        const withoutOp = lex('/pk');
        expect(withoutOp[0].type).toBe('operation');
        expect(withoutOp[0].value).toBe('/');
        expect(withoutOp[1].value).toBe('pk');

        // same result with '/' explicitly in extraOper
        const withOp = lex('/pk', '/');
        expect(withOp[0].type).toBe('operation');
        expect(withOp[0].value).toBe('/');
        expect(withOp[1].value).toBe('pk');
    });

});

// ── Whitespace handling ───────────────────────────────────────────────────────

describe('whitespace handling', () => {

    test('whitespace is stripped by default', () => {
        const tokens = lex('a  b');
        expect(tokens.every(t => t.type !== 'ws')).toBe(true);
    });

    test('whitespace is kept when keepWSandCOMMENTS=true', () => {
        const tokens = lexWS('a b');
        const wsTokens = tokens.filter(t => t.type === 'ws');
        expect(wsTokens.length).toBeGreaterThan(0);
    });

});

// ── Comments ──────────────────────────────────────────────────────────────────

describe('block comments', () => {

    test('block comment is stripped', () => {
        const tokens = lex('a /* comment */ b');
        expect(tokens).toHaveLength(2);
        expect(tokens[0].value).toBe('a');
        expect(tokens[1].value).toBe('b');
    });

    test('block comment is kept when keepWSandCOMMENTS=true', () => {
        const tokens = lexWS('a /* hi */ b');
        const comments = tokens.filter(t => t.type === 'comment');
        expect(comments.length).toBeGreaterThan(0);
    });

});

describe('line comments', () => {

    test('-- comment is stripped', () => {
        const tokens = lex('a -- comment\nb');
        expect(tokens.map(t => t.value)).toEqual(['a', 'b']);
    });

    test('--- (triple dash) is a line-comment token', () => {
        // The lexer creates a line-comment token for -- and accumulates the rest
        const tokens = lexWS('--- description\n');
        const cmd = tokens.find(t => t.type === 'line-comment');
        expect(cmd).toBeDefined();
        expect(cmd!.value).toContain('---');
    });

});

// ── Quoted strings ────────────────────────────────────────────────────────────

describe('quoted strings', () => {

    test('single-quoted string when quotedStrings=true', () => {
        const tokens = lexQ("'hello world'");
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('quoted-string');
        expect(tokens[0].value).toBe("'hello world'");
    });

    test('double-quoted string', () => {
        const tokens = lexQ('"my_table"');
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('dquoted-string');
    });

});

// ── Token position metadata ───────────────────────────────────────────────────

describe('token positions', () => {

    test('begin and end are character offsets', () => {
        const tokens = lex('abc def');
        expect(tokens[0].begin).toBe(0);
        expect(tokens[0].end).toBe(3);
        expect(tokens[1].begin).toBe(4);
        expect(tokens[1].end).toBe(7);
    });

    test('line counter increments on newline', () => {
        const tokens = lex('a\nb');
        expect(tokens[0].line).toBe(0);
        expect(tokens[1].line).toBe(1);
    });

    test('empty input → no tokens', () => {
        expect(lex('')).toHaveLength(0);
    });

});

// ── Real QuickSQL patterns ────────────────────────────────────────────────────

describe('QuickSQL patterns', () => {

    test('table with column shorthand: dept\\n    name vc32', () => {
        const tokens = lex('dept\n    name vc32');
        expect(tokens[0].value).toBe('dept');
        expect(tokens[1].value).toBe('name');
        expect(tokens[2].value).toBe('vc32');
    });

    test('directive with slash: name /pk', () => {
        const tokens = lex('name /pk', '/');
        expect(tokens[0].value).toBe('name');
        expect(tokens[1].value).toBe('/');
        expect(tokens[2].value).toBe('pk');
    });

    test('# settings line is tokenised', () => {
        const tokens = lex('# settings = { "genpk": false }');
        expect(tokens[0].value).toBe('#');
    });

});
