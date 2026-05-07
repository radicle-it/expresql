/**
 * Splits a string into an array of single-character symbol tokens and
 * multi-character word chunks.
 *
 * Example: split_str("a+b", "+") → ["a", "+", "b"]
 */
function split_str(text: string, symbols: string): string[] {
    const symbolSet = new Set(symbols);
    const ret: string[] = [];
    let current = '';

    for (const c of text) {
        if (symbolSet.has(c)) {
            if (current.length > 0) { ret.push(current); current = ''; }
            ret.push(c);
        } else {
            current += c;
        }
    }
    if (current.length > 0) ret.push(current);
    return ret;
}

export default split_str;
