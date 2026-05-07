import { DdlNode } from './node.js';
import lexer from './lexer.js';
import type { DdlContext } from './types.js';

// ── recognize ─────────────────────────────────────────────────────────────────

function recognize(parsed: DdlContext): DdlNode[] {
    const fullInput = parsed.input;

    let path: DdlNode[] = [];
    const ret: DdlNode[] = [];

    const src = lexer(fullInput + '\n', true, true, '`');
    parsed.data = null;
    let poundDirective: string | null = null;
    let line = '';

    OUTER: for (let i = 0; i < src.length; i++) {
        const t = src[i];

        if (t.value === '\n') {
            if (poundDirective === null) {
                line = line.replace(/\r/g, '');

                // Merge multi-line {…} annotation blocks into a single logical line.
                // Count unescaped braces to detect an unclosed block.
                const openBraces  = (line.match(/\{/g) ?? []).length;
                const closeBraces = (line.match(/\}/g) ?? []).length;
                if (openBraces > closeBraces) {
                    // Annotation block is still open — keep accumulating tokens.
                    continue;
                }

                const nc = line.replace(/\r/g, '').replace(/ /g, '');
                if (nc === '') { line = ''; continue; }

                let node = new DdlNode(t.line - 1, line, null, parsed);
                let matched = false;
                for (let j = 0; j < path.length; j++) {
                    const cmp = path[j];
                    if (node.apparentDepth() <= cmp.apparentDepth()) {
                        if (0 < j) {
                            const parent = path[j - 1];
                            node = new DdlNode(t.line - 1, line, parent, parsed);
                            path[j] = node;
                            path = path.slice(0, j + 1);
                            matched = true;
                            break;
                        } else {
                            path[0] = node;
                            path = path.slice(0, 1);
                            ret.push(node);
                            matched = true;
                        }
                    }
                }
                if (!matched) {
                    if (0 < path.length) {
                        const parent = path[path.length - 1];
                        node = new DdlNode(t.line - 1, line, parent, parsed);
                    }
                    path.push(node);
                    if (node.apparentDepth() === 0) ret.push(node);
                }
                if (node.isMany2One()) {
                    const parent = node.parent!;
                    if (parent.fks === null) parent.fks = {};
                    let refId = node.refId();
                    if (refId === null) refId = node.parseName();
                    parent.fks[node.parseName() + '_id'] = refId;
                }
                line = '';
                continue;
            }
        }

        if (poundDirective === null && t.value === '#') { poundDirective = ''; continue; }
        if (poundDirective !== null) {
            poundDirective += t.value;
            if (t.value !== '\n' && t.value !== '}') continue;
            const src1 = lexer(poundDirective, false, true, '');
            if (src1.length % 4 === 3 && src1[1].value === ':') {
                parsed.setOptions(poundDirective);
                poundDirective = null; line = '';
                continue;
            }
            let flattened: string | null = null;
            let settings:  string | null = null;
            for (const j in src1) {
                const t1 = src1[j];
                if (flattened === null && t1.value === 'flattened') { flattened = ''; continue; }
                if (flattened !== null) {
                    flattened += t1.value;
                    if (flattened === '=') continue;
                    if (flattened.charAt(flattened.length - 1) !== '}') continue;
                    const jsonStr = flattened.substring(1);
                    try { parsed.data = JSON.parse(jsonStr); poundDirective = null; line = ''; continue OUTER; }
                    catch (_e) { /* keep going */ }
                }
                if (settings === null && t1.value === 'settings') { settings = ''; continue; }
                if (settings !== null) {
                    settings += t1.value;
                    try { parsed.setOptions(settings); poundDirective = null; line = ''; continue OUTER; }
                    catch (_e) { /* keep going */ }
                }
            }
        }
        if (t.type === 'comment') continue;
        if (t.type === 'line-comment') {
            if (0 < line.trim().length) line += t.value;
            continue;
        }
        line += t.value;
    }

    return ret;
}

export default recognize;
