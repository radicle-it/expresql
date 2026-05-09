// Pure syntax-highlighting functions — no DOM, no state.

export function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(cls, text) {
    return `<span class="${cls}">${esc(text)}</span>`;
}

// Generic left-to-right tokenizer.
// tokens: array of { re: RegExp (with 'i' flag, pre-compiled), cls: string }.
// Tokens are matched in priority order; first leftmost match wins.
function tokenize(text, tokens, defaultCls) {
    let html = '';
    let pos  = 0;

    while (pos < text.length) {
        let bestIdx   = text.length;
        let bestMatch = null;
        let bestCls   = null;

        // Reuse pre-compiled regexes — no new RegExp inside the loop
        for (const tok of tokens) {
            const m = tok.re.exec(text.slice(pos));
            if (m) {
                const abs = pos + m.index;
                if (abs < bestIdx) { bestIdx = abs; bestMatch = m[0]; bestCls = tok.cls; }
            }
        }

        if (!bestMatch) {
            const rest = text.slice(pos);
            html += defaultCls ? span(defaultCls, rest) : esc(rest);
            break;
        }

        if (bestIdx > pos) {
            const before = text.slice(pos, bestIdx);
            html += defaultCls ? span(defaultCls, before) : esc(before);
        }

        html += span(bestCls, bestMatch);
        pos = bestIdx + bestMatch.length;
    }
    return html;
}

// ── EspreSQL ─────────────────────────────────────────────────────
// All regexes pre-compiled once at module load with 'i' flag.

const QS_INLINE = [
    { re: /\[[^\]]*\]/i,       cls: 'qs-comment'    },
    { re: /\{[^}]*\}/i,        cls: 'qs-annotation' },
    { re: /\/\S+/i,            cls: 'qs-directive'  },
    { re: /\b\d+\b/i,          cls: 'qs-number'     },
    {
        re: /\b(timestamp\s+with\s+local\s+time\s+zone|timestamp\s+with\s+time\s+zone|sdo_geometry|timestamp|boolean|varchar2|varchar|integer|tswtz|string|number|vector|geometry|tstz|blob|clob|json|file|date|char|bool|int|num|vc(?:32k|\d+k?|\(\d+\))?|vect(?:\d+|\(\d+\))?|ts)\b/i,
        cls: 'qs-datatype',
    },
];

function qsLineContent(content, nameClass) {
    const firstToken = (() => {
        let bestIdx = content.length;
        for (const tok of QS_INLINE) {
            const m = tok.re.exec(content);   // pre-compiled, no allocation
            if (m && m.index < bestIdx) bestIdx = m.index;
        }
        return bestIdx;
    })();

    const namePart  = content.slice(0, firstToken).trimEnd();
    const afterName = content.slice(namePart.length);

    let html = namePart ? span(nameClass, namePart) : '';
    const leadingSpace = afterName.match(/^\s+/);
    if (leadingSpace) html += esc(leadingSpace[0]);
    html += tokenize(afterName.trimStart(), QS_INLINE, null);
    return html;
}

export function highlightEspreSQL(text) {
    const lines  = text.split('\n');
    const result = [];
    let inBlock  = false;

    for (const line of lines) {
        if (inBlock) {
            const end = line.indexOf('*/');
            if (end !== -1) {
                result.push(span('qs-comment', line.slice(0, end + 2)) + qsLineContent(line.slice(end + 2), 'qs-column'));
                inBlock = false;
            } else {
                result.push(span('qs-comment', line));
            }
            continue;
        }

        const trimmed = line.trimStart();
        const indent  = line.length - trimmed.length;

        if (!trimmed)                     { result.push(''); continue; }
        if (/^#\s*-{2,}\s*$/.test(trimmed)) { result.push(span('qs-migration-sep', line)); continue; }
        if (trimmed.startsWith('#'))             { result.push(span('qs-setting', line)); continue; }
        if (trimmed.startsWith('--'))     { result.push(esc(' '.repeat(indent)) + span('qs-comment', trimmed)); continue; }

        if (trimmed.startsWith('/*')) {
            const end = line.indexOf('*/');
            if (end !== -1) {
                result.push(span('qs-comment', line.slice(0, end + 2)) + qsLineContent(line.slice(end + 2), 'qs-column'));
            } else {
                result.push(span('qs-comment', line));
                inBlock = true;
            }
            continue;
        }

        if (/^(view|dv)\s/i.test(trimmed)) {
            const kwEnd = trimmed.indexOf(' ');
            result.push(esc(' '.repeat(indent)) + span('qs-keyword', trimmed.slice(0, kwEnd)) + esc(trimmed.slice(kwEnd)));
            continue;
        }

        const starMatch = /^([<>]\s*)/.exec(trimmed);
        const prefix    = starMatch ? starMatch[1] : '';
        const content   = trimmed.slice(prefix.length);
        const nameClass = indent === 0 ? 'qs-table' : 'qs-column';

        result.push(
            esc(' '.repeat(indent)) +
            (prefix ? span('qs-directive', prefix) : '') +
            qsLineContent(content, nameClass)
        );
    }

    return result.join('\n');
}

// ── Oracle DDL SQL ────────────────────────────────────────────────
// Multi-word keywords listed before their shorter sub-words.

const SQL_KEYWORDS =
    'CREATE\\s+OR\\s+REPLACE|CREATE|OR\\s+REPLACE|' +
    'PRIMARY\\s+KEY|FOREIGN\\s+KEY|NOT\\s+NULL|ON\\s+DELETE\\s+CASCADE|' +
    'ON\\s+DELETE\\s+SET\\s+NULL|ON\\s+DELETE|' +
    'IMMUTABLE\\s+TABLE|BLOCKCHAIN\\s+TABLE|' +
    'INSERT\\s+INTO|' +
    'TABLE|VIEW|INDEX|SEQUENCE|TRIGGER|PROCEDURE|FUNCTION|PACKAGE|' +
    'INSERT|INTO|VALUES|SELECT|FROM|WHERE|' +
    'CONSTRAINT|REFERENCES|DEFAULT|UNIQUE|CHECK|ENABLE|DISABLE|' +
    'AUDIT|COMMENT|IS|AS|BEGIN|END|DECLARE|RETURN|' +
    'HASHING\\s+USING|AFTER\\s+INSERT|UNTIL|DAYS|ROWS|BY|' +
    'GRANT|REVOKE|ALTER|DROP|RENAME|TO|ON|NO\\s+DROP|NO\\s+DELETE|' +
    'NULL|TRUE|FALSE|AND|OR|NOT|IN|BETWEEN|LIKE|ALL';

const SQL_DATATYPES =
    'TIMESTAMP\\s+WITH\\s+LOCAL\\s+TIME\\s+ZONE|' +
    'TIMESTAMP\\s+WITH\\s+TIME\\s+ZONE|' +
    'VARCHAR2|NVARCHAR2|NCHAR|INTEGER|FLOAT|CLOB|BLOB|' +
    'TIMESTAMP|BOOLEAN|NUMBER|DATE|CHAR|RAW|LONG|' +
    'BINARY_FLOAT|BINARY_DOUBLE|SDO_GEOMETRY|XMLTYPE|VECTOR';

// Pre-compiled once — no RegExp allocations during tokenization.
const SQL_TOKENS = [
    { re: new RegExp('/\\*[\\s\\S]*?\\*/', 'i'),              cls: 'sql-comment'    },
    { re: /--[^\n]*/i,                                        cls: 'sql-comment'    },
    { re: /'(?:[^'\\]|\\.)*'/i,                               cls: 'sql-string'     },
    { re: /"(?:[^"\\]|\\.)*"/i,                               cls: 'sql-identifier' },
    { re: /\b\d+(?:\.\d+)?\b/i,                              cls: 'sql-number'     },
    { re: new RegExp(`\\b(${SQL_DATATYPES})\\b`, 'i'),        cls: 'sql-datatype'   },
    { re: new RegExp(`\\b(${SQL_KEYWORDS})\\b`, 'i'),         cls: 'sql-keyword'    },
];

export function highlightSQL(text) {
    return tokenize(text, SQL_TOKENS, null);
}
