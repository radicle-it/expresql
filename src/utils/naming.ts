/**
 * Identifier naming utilities for Oracle DDL generation.
 * All functions are pure — no side effects, no external dependencies.
 */

export function singular(name: string | null): string | null {
    if (name == null) return name;
    const upper = name.toUpperCase();
    if (upper.endsWith('IES')) return name.substring(0, name.length - 3) + 'y';
    if (upper.endsWith('ES'))  return name.substring(0, name.length - 1);
    if (upper.endsWith('S'))   return name.substring(0, name.length - 1);
    return name;
}

/**
 * Quotes an Oracle identifier only when required (special chars, digit-start).
 * Lower-case and plain names are NOT quoted — intentional deviation from
 * the original dbtools-common quoteIdentifier().
 */
function quoteIdentifier(s: string | null): string | null {
    const quoteChar = '"';
    if (s == null) return null;

    const legitimateChars = '$#_ ';
    let quote = false;

    if (!s.startsWith(quoteChar)) {
        if (s.length > 0 && s[0] >= '0' && s[0] <= '9') {
            quote = true;
        } else {
            for (const c of s) {
                if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))
                    continue;
                if (legitimateChars.includes(c))
                    continue;
                quote = true;
                break;
            }
        }
    }

    if (s.startsWith('_') || s.startsWith('$') || s.startsWith('#'))
        quote = true;

    return quote ? quoteChar + s + quoteChar : s;
}

export function canonicalObjectName(name: string | null): string | null {
    if (name == null) return null;
    if (name.charAt(0) === '"') return name;
    const possiblyQuoted = quoteIdentifier(name);
    if (possiblyQuoted == null) return null;
    if (possiblyQuoted.charAt(0) === '"') return possiblyQuoted;
    return possiblyQuoted.replace(/ /g, '_');
}

export function concatNames(chunk1: string, chunk2: string, chunk3?: string): string {
    const c3 = chunk3 ?? '';
    let quote = false;
    let p1 = chunk1, p2 = chunk2, p3 = c3;

    if (p1.charAt(0) === '"') { quote = true; p1 = p1.slice(1, -1); }
    if (p2.charAt(0) === '"') { quote = true; p2 = p2.slice(1, -1); }
    if (p3.charAt(0) === '"') { quote = true; p3 = p3.slice(1, -1); }

    const ret = p1 + p2 + p3;
    return quote ? '"' + ret + '"' : ret.toLowerCase();
}

export function getMajorVersion(versionStr: string): number | null {
    if (versionStr.length < 2) return null;
    return parseInt(versionStr.substring(0, 2));
}

export default { singular, canonicalObjectName, concatNames };
