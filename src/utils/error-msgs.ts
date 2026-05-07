// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal shape of a parsed node (DdlNode) used by the error-checker. */
interface ParsedNode {
    line:       number;
    content:    string;
    src:        Array<{ value: string; begin: number }>;
    /** Returns 'table', 'view', 'dv', or an SQL data-type string. */
    inferType(): string;
    parseName(): string;
    descendants(): ParsedNode[];
    isOption(key: string): boolean;
    indexOf(key: string, flag?: boolean): number;
}

/** Minimal shape of the top-level quicksql instance passed to checkSyntax. */
interface ParsedContext {
    input:    string;
    forest:   ParsedNode[];
    descendants(): ParsedNode[];
    optionEQvalue(key: string, value: unknown): boolean;
    find(name: string): unknown;
}

// ── Value objects ──────────────────────────────────────────────────────────────

class SyntaxError {
    from:     Offset;
    to:       Offset;
    message:  string;
    severity: string;

    constructor(message: string, from: Offset, to?: Offset | null, severity?: string | null) {
        this.from     = from;
        this.to       = to != null ? to : new Offset(from.line, from.depth + 1);
        this.message  = message;
        this.severity = severity != null ? severity : 'error';
    }
}

class Offset {
    line:  number;   // 0-based
    depth: number;   // 0-based

    constructor(line: number, depth: number) {
        this.line  = line;
        this.depth = depth;
    }
}

// ── Directive allow-lists ──────────────────────────────────────────────────────

const tableDirectives = [
     'api'
    ,'audit','auditcols'
    ,'check'
    ,'colprefix'
    ,'compress','compressed'
    ,'flashback','fda'
    ,'immutable'
    ,'insert'
    ,'rest'
    ,'rowkey'
    ,'rowversion'
    ,'soda'
    ,'unique','uk'
    ,'pk'
    ,'cascade','setnull'
];

const columnDirectives = [
     'idx','index','indexed'
    ,'unique','uk'
    ,'check'
    ,'constant'
    ,'default'
    ,'domain'
    ,'hidden','invincible'
    ,'values'
    ,'upper'
    ,'lower'
    ,'nn','not'
    ,'between'
    ,'references','reference'
    ,'cascade','setnull'
    ,'fk'
    ,'pk'
    ,'trans','translation','translations'
];

// ── Messages ───────────────────────────────────────────────────────────────────

const messages = {
    duplicateId:         'Explicit ID column conflicts with genpk',
    invalidDatatype:     'Invalid Datatype',
    undefinedObject:     'Undefined Object: ',
    misalignedAttribute: 'Misaligned Table or Column; apparent indent = ',
    tableDirectiveTypo:  'Unknown Table directive',
    columnDirectiveTypo: 'Unknown Column directive',
};

// ── Core checker ──────────────────────────────────────────────────────────────

function checkSyntax(parsed: ParsedContext): SyntaxError[] {
    const ddl = parsed;

    let ret: SyntaxError[] = [];

    let branches: ParsedNode[] = [];
    for (let i = 0; i < parsed.forest.length; i++) {
        if (parsed.forest[i].inferType() === 'table')
            branches = branches.concat(parsed.forest[i].descendants());
    }
    ret = ret.concat(line_mismatch(branches));
    const descendants = ddl.descendants();

    for (let i = 0; i < descendants.length; i++) {
        const node = descendants[i];
        if (ddl.optionEQvalue('genpk', true) && descendants[i].parseName() === 'id') {
            const depth = node.content.toLowerCase().indexOf('id');
            ret.push(new SyntaxError(messages.duplicateId, new Offset(node.line, depth), new Offset(node.line, depth + 2)));
            continue;
        }
        const src2 = node.src[2];
        if (2 < node.src.length && src2.value === '-') {
            const depth = src2.begin;
            ret.push(new SyntaxError(messages.invalidDatatype, new Offset(node.line, depth), new Offset(node.line, depth + 2)));
            continue;
        }
        const src1 = node.src[1];
        if (1 < node.src.length && src1.value === 'vc0') {
            const depth = src1.begin;
            ret.push(new SyntaxError(messages.invalidDatatype, new Offset(node.line, depth)));
            continue;
        }

        ret = ret.concat(ref_error_in_view(ddl, node));
        ret = ret.concat(fk_ref_error(ddl, node));
        ret = ret.concat(directive_typo(ddl, node));
    }

    return ret;
}

function directive_typo(_ddl: ParsedContext, node: ParsedNode): SyntaxError[] {
    const isTable = node.inferType() === 'table';
    const ret: SyntaxError[] = [];
    const chunks = node.src;
    let sawSlash = false;

    for (let j = 1; j < chunks.length; j++) {
        if (chunks[j].value === '/') {
            sawSlash = true;
            continue;
        }
        if (sawSlash) {
            sawSlash = false;
            if (isTable && tableDirectives.indexOf(chunks[j].value.toLowerCase()) < 0)
                ret.push(new SyntaxError(
                    messages.tableDirectiveTypo,
                    new Offset(node.line, chunks[j].begin),
                    new Offset(node.line, chunks[j].begin + chunks[j].value.length)
                ));
            if (!isTable && columnDirectives.indexOf(chunks[j].value.toLowerCase()) < 0)
                ret.push(new SyntaxError(
                    messages.columnDirectiveTypo,
                    new Offset(node.line, chunks[j].begin),
                    new Offset(node.line, chunks[j].begin + chunks[j].value.length)
                ));
        }
    }
    return ret;
}

function ref_error_in_view(ddl: ParsedContext, node: ParsedNode): SyntaxError[] {
    const ret: SyntaxError[] = [];
    if (node.inferType() === 'view') {
        const chunks = node.src;
        for (let j = 2; j < chunks.length; j++) {
            const tbl = ddl.find(chunks[j].value);
            if (tbl == null) {
                ret.push(new SyntaxError(
                    messages.undefinedObject + chunks[j].value,
                    new Offset(node.line, chunks[j].begin),
                    new Offset(node.line, chunks[j].begin + chunks[j].value.length)
                ));
            }
        }
    }
    return ret;
}

function fk_ref_error(ddl: ParsedContext, node: ParsedNode): SyntaxError[] {
    const ret: SyntaxError[] = [];
    if (node.isOption('fk') || 0 < node.indexOf('reference', true)) {
        let pos = node.indexOf('fk');
        if (pos < 0)
            pos = node.indexOf('reference');
        pos++;
        if (node.src.length - 1 < pos)
            return ret;
        if (node.src[pos].value === '/')
            return ret;
        const tbl = ddl.find(node.src[pos].value);
        if (tbl == null) {
            ret.push(new SyntaxError(
                messages.undefinedObject + node.src[pos].value,
                new Offset(node.line, node.src[pos].begin),
                new Offset(node.line, node.src[pos].begin + node.src[pos].value.length)
            ));
        }
    }
    return ret;
}

function line_mismatch(lines: ParsedNode[]): SyntaxError[] {
    const ret: SyntaxError[] = [];
    const indent = guessIndent(lines);

    for (let i = 1; i < lines.length; i++) {
        const line       = lines[i];
        const lineIndent = depth(line);
        if (indent !== null && lineIndent % indent !== 0)
            ret.push(new SyntaxError(
                messages.misalignedAttribute + indent,
                new Offset(line.line, lineIndent)
            ));
    }
    return ret;
}

// ── Indent helpers ─────────────────────────────────────────────────────────────

function guessIndent(lines: ParsedNode[]): number | null {
    const depths: number[] = [];
    for (let i = 0; i < lines.length; i++)
        depths[i] = depth(lines[i]);

    const frequencies: Record<number, number> = {};
    for (let i = 0; i < depths.length; i++) {
        const j = parentIndex(depths, i);
        if (j != null) {
            const diff = depths[i] - depths[j];
            frequencies[diff] = (frequencies[diff] ?? 0) + 1;
        }
    }

    let indent: number | null = null;
    for (const key in frequencies) {
        const k = parseInt(key);
        if (indent === null || frequencies[indent] <= frequencies[k])
            indent = k;
    }
    return indent;
}

function depth(line: ParsedNode): number {
    return line.src[0].begin;
}

function parentIndex(depths: number[], lineNo: number): number | null {
    for (let i = lineNo; 0 <= i; i--)
        if (depths[i] < depths[lineNo])
            return i;
    return null;
}

// ── Exports ────────────────────────────────────────────────────────────────────

const findErrors = checkSyntax;

export default { findErrors, messages };
