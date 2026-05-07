import split_str from './split_str.js';

// ── Token type union ────────────────────────────────────────────────────────

export type TokenType =
    | 'identifier'
    | 'constant.numeric'
    | 'operation'
    | 'ws'
    | 'quoted-string'
    | 'dquoted-string'
    | 'bquoted-string'
    | 'comment'
    | 'line-comment'
    | 'dbtools-command';

// Sentinel values used for `end` while a string token is still open (not yet closed).
const END_OPEN_SINGLE  = -10;  // single-quoted string not yet closed
const END_OPEN_DOUBLE  = -11;  // double-quoted or backtick string not yet closed

// ── LexerToken ──────────────────────────────────────────────────────────────

export class LexerToken {
    type:       TokenType;
    value:      string;
    begin:      number;
    /** Byte-end position, or END_OPEN_SINGLE / END_OPEN_DOUBLE while token is still open. */
    end:        number;
    line:       number;
    col:        number;
    /** Cached lowercase value — avoids repeated toLowerCase() calls in tree.js. */
    lowerValue: string;

    constructor(value: string, from: number, to: number, type: TokenType, line: number, col = 0) {
        this.type       = type;
        this.value      = value;
        this.begin      = from;
        this.end        = to;
        this.line       = line;
        this.col        = col;
        this.lowerValue = value.toLowerCase();
    }

    toString(): string {
        return `{type:${this.type},value:${this.value}}`;
    }

    /**
     * Returns the token value, converting backtick-quoted identifiers to Oracle
     * alt-quote syntax `q'[...]'`.
     * NOTE: the backtick conversion path currently returns `this.value` unchanged
     * (pre-existing behaviour — the converted string is built but not returned).
     */
    getValue(): string {
        if (this.value.length < 2) return this.value;
        // Backtick path: conversion is computed but not returned (preserved behaviour).
        // if (this.value.charAt(0) === '`') return "q'[" + this.value.slice(1, -1) + "]'";
        return this.value;
    }

    /** True when the token is a standard SQL string literal: 'text' or N'text'. */
    isStandardLiteral(): boolean {
        if (this.value.length < 2) return false;
        const first = this.value.charAt(0);
        if (first !== "'" && first !== 'n' && first !== 'N') return false;
        let text = this.value;
        if (first === 'n' || first === 'N') {
            if (text.length < 3) return false;
            text = text.substring(1);
        }
        return text.charAt(0) === "'" && text.charAt(text.length - 1) === "'";
    }

    /** True when the token is an Oracle alt-quote literal: q'[...]', nq'[...]', etc. */
    isAltLiteral(): boolean {
        if (this.value.length < 5) return false;
        const first = this.value.charAt(0);
        if (first !== 'q' && first !== 'Q' && first !== 'n' && first !== 'N') return false;

        let text = this.value;
        if (first === 'q' || first === 'Q') {
            text = text.substring(1);
        } else if (
            (first === 'n' || first === 'N') &&
            (this.value.charAt(1) === 'q' || this.value.charAt(1) === 'Q')
        ) {
            if (text.length < 6) return false;
            text = text.substring(2);
        } else {
            return false;
        }

        if (text.charAt(0) === "'" && text.charAt(text.length - 1) === "'")
            text = text.substring(1, text.length - 1);
        else
            return false;

        return matchingDelimiter(text.charAt(0)) === text.charAt(text.length - 1);
    }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function matchingDelimiter(ch: string): string {
    if (ch === '<') return '>';
    if (ch === '[') return ']';
    if (ch === '{') return '}';
    if (ch === '(') return ')';
    return ch;
}

/**
 * Handles numeric tokens that contain an exponent/suffix char (e, f, d).
 * Splits "1e01" into two tokens so the exponent letter is a separate identifier.
 * Returns true when the token was handled, false when it needs normal processing.
 */
function fixedExponent(input: string, ret: LexerToken[], pos: number, line: number): boolean {
    const eIdx = input.indexOf('e');
    const fIdx = input.indexOf('f');
    const dIdx = input.indexOf('d');
    if (eIdx < 0 && fIdx < 0 && dIdx < 0) return false;

    let offset = pos;
    const chunks = split_str(input, 'efd');
    for (const token of chunks) {
        offset += token.length;
        const type: TokenType = (token.charAt(0) >= '0' && token.charAt(0) <= '9')
            ? 'constant.numeric'
            : 'identifier';
        ret.push(new LexerToken(token, offset - token.length, offset, type, line));
    }
    return true;
}

/**
 * First-pass tokenizer: splits the source into raw LexerToken objects,
 * handling quoted strings, comments, and numeric literals.
 */
function iterate_tokens(sourceExpr: string, quotedStrings: boolean, extraOper: string): LexerToken[] {
    const ret: LexerToken[] = [];
    const operation = '(){}[]^-|!*+.><=\'",;:%@?/\\#~' + extraOper;
    const ws        = ' \n\r\t';
    const chunks    = split_str(sourceExpr, operation + ws);

    let pos  = 0;
    let line = 0;
    let col  = 0;

    for (let i = 0; i < chunks.length; i++) {
        const token = chunks[i];
        const last  = ret.length > 0 ? ret[ret.length - 1] : null;

        if (token === '\n') {
            line++;
            col = 0;
        } else {
            col = (i > 0 && chunks[i - 1] !== '\n') ? col + chunks[i - 1].length : 0;
        }
        pos += token.length;

        // ── Open block comment: accumulate until */ ──────────────────────────
        if (last?.type === 'comment' &&
            (last.value.lastIndexOf('*/') !== last.value.length - 2 || last.value === '/*/')) {
            last.value = (token === '*' || token === '/') ? last.value + token : '/* ... ';
            last.end = pos;
            if (last.type === 'comment' &&
                last.value.lastIndexOf('*/') === last.value.length - 2 &&
                last.value !== '/*/') {
                last.value = sourceExpr.substring(last.begin, last.end);
            }
            continue;
        }

        // ── Line comment / dbtools command: accumulate to end of line ────────
        if (last !== null &&
            (last.type === 'line-comment' || last.type === 'dbtools-command')) {
            if (token !== '\n') { last.value += token; continue; }
            last.end = last.begin + last.value.length;
        }

        // ── Open single-quoted string ────────────────────────────────────────
        if (last?.type === 'quoted-string' &&
            !(last.isStandardLiteral() || last.isAltLiteral())) {
            last.value += token;
            last.end = last.begin + last.value.length;
            continue;
        }

        // ── Open double-quoted string ────────────────────────────────────────
        if (last?.type === 'dquoted-string' &&
            !(last.value.endsWith('"') && last.value.length > 1)) {
            if (token !== '"') continue;
            last.end   = pos;
            last.value = sourceExpr.substring(last.begin, last.end);
            continue;
        }

        // ── Open backtick-quoted string ──────────────────────────────────────
        if (last?.type === 'bquoted-string' &&
            !(last.value.endsWith('`') && last.value.length > 1)) {
            if (token !== '`') continue;
            last.end   = pos;
            last.value = sourceExpr.substring(last.begin, last.end);
            continue;
        }

        // ── Block comment start: / followed by * ─────────────────────────────
        if (token === '*' && last?.value === '/') {
            last.value += token;
            last.end    = last.begin + last.value.length;
            last.type   = 'comment';
            continue;
        }

        // ── Line comment start: - followed by - ──────────────────────────────
        if (token === '-' && last?.value === '-') {
            last.value += token;
            last.type   = 'line-comment';
            continue;
        }

        // ── @identifier continuation ──────────────────────────────────────────
        if (last?.type === 'identifier' && last.end === END_OPEN_DOUBLE &&
            last.value.startsWith('@')) {
            if (token !== '\n' && token !== '\r') { last.value += token; continue; }
            last.end = pos - 1;
            ret.push(new LexerToken(token, pos - 1, pos, 'ws', line, col));
            continue;
        }

        // ── Single-quote: start or extend a quoted-string ────────────────────
        if (quotedStrings && token === "'") {
            const lastLower = (last !== null && last.value.length <= 2)
                ? last.value.toLowerCase() : '';
            if (lastLower === 'q' || lastLower === 'n' || lastLower === 'u' || lastLower === 'nq') {
                last!.value += token;
                last!.type   = 'quoted-string';
            } else {
                ret.push(new LexerToken(token, pos - 1, END_OPEN_SINGLE, 'quoted-string', line, col));
            }
            continue;
        }

        // ── Double-quote ──────────────────────────────────────────────────────
        if (quotedStrings && token === '"') {
            ret.push(new LexerToken(token, pos - 1, END_OPEN_DOUBLE, 'dquoted-string', line, col));
            continue;
        }

        // ── Backtick ──────────────────────────────────────────────────────────
        if (token === '`' && operation.includes('`')) {
            ret.push(new LexerToken(token, pos - 1, END_OPEN_DOUBLE, 'bquoted-string', line, col));
            continue;
        }

        // ── Single operator char ──────────────────────────────────────────────
        if (token.length === 1 && operation.includes(token)) {
            ret.push(new LexerToken(token, pos - 1, pos, 'operation', line, col));
            continue;
        }

        // ── Whitespace ────────────────────────────────────────────────────────
        if (token.length === 1 && ws.includes(token)) {
            ret.push(new LexerToken(token, pos - 1, pos, 'ws', line, col));
            continue;
        }

        // ── Numeric literal ───────────────────────────────────────────────────
        if (token.charAt(0) >= '0' && token.charAt(0) <= '9') {
            if (!fixedExponent(token, ret, pos - token.length, line)) {
                const last2 = token.charAt(token.length - 1).toUpperCase();
                if ('KMGTPE'.includes(last2)) {
                    ret.push(new LexerToken(token.slice(0, -1), pos - token.length, pos - 1, 'constant.numeric', line, col));
                    ret.push(new LexerToken(token.slice(-1),    pos - 1,            pos,     'constant.numeric', line, col));
                } else {
                    ret.push(new LexerToken(token, pos - token.length, pos, 'constant.numeric', line, col));
                }
            }
            continue;
        }

        // ── Default: identifier ───────────────────────────────────────────────
        ret.push(new LexerToken(token, pos - token.length, pos, 'identifier', line, col));
    }

    if (ret.length > 0)
        ret[ret.length - 1].end = sourceExpr.length;

    return ret;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Tokenizes `input` into an array of LexerToken objects.
 *
 * @param input              - Source text to tokenize
 * @param keepWSandCOMMENTS  - When false (default for quicksql), whitespace and
 *                             comment tokens are stripped from the output
 * @param quotedStrings      - When true, single/double-quoted strings are kept
 *                             as single tokens
 * @param extraOper          - Additional characters to treat as operators
 */
function lexemise(
    input:             string,
    keepWSandCOMMENTS: boolean,
    quotedStrings:     boolean,
    extraOper:         string,
): LexerToken[] {
    const ret: LexerToken[] = [];
    const src = iterate_tokens(input, quotedStrings, extraOper);
    let last: LexerToken | null = null;

    for (const token of src) {
        // Glue adjacent quoted strings and N'...' prefix into one token
        if (token.type === 'quoted-string') {
            if (last?.type === 'quoted-string') {
                last.value += token.value;
                last.end    = token.end;
                continue;
            }
            if (last?.type === 'identifier' &&
                last.value.toUpperCase() === 'N' &&
                last.end === token.begin) {
                last.begin = token.begin;
                last.end   = token.end;
                last.type  = token.type;
                last.value = token.value;
                continue;
            }
        }

        // Fix @identifier end position
        if (token.value.startsWith('@'))
            token.end = token.begin + token.value.length;

        // # appended to preceding identifier (e.g. abc#23)
        if (token.value === '#' && last?.type === 'identifier') {
            last.end   += 1;
            last.value += '#';
            continue;
        }
        if ((token.type === 'identifier' || token.type === 'constant.numeric') &&
            last !== null &&
            last.value.endsWith('#') && last.type === 'identifier') {
            last.end   += token.value.length;
            last.value += token.value;
            continue;
        }

        // Normalise preprocessor variables to $$VAR
        if (token.value.startsWith('$$'))
            token.value = '$$VAR';

        if (keepWSandCOMMENTS ||
            (token.type !== 'ws' && token.type !== 'comment' && token.type !== 'line-comment')) {
            ret.push(token);
        }
        last = token;
    }

    return ret;
}

export default lexemise;
