/* globals __PACKAGE_VERSION__ */
declare const __PACKAGE_VERSION__: string | undefined;

import tree, { createGenerator, createDiffGenerator, DdlNode } from './tree.js';
export { registerGenerator, BaseGenerator, registerDiffGenerator, createDiffGenerator } from './tree.js';
export type { GeneratorFactory, DiffGeneratorFactory } from './tree.js';
export type { DiffResult, DiffStatement, DiffStatementKind, DiffWarning, DiffSummary, DiffGenerator } from './tree.js';
import lexer from './compiler/lexer.js';
import json2qsql from './utils/json-to-qsql.js';
import errorMsgs from './utils/error-msgs.js';
import { canonicalObjectName } from './utils/naming.js';
import type { DdlContext, DDLGenerator, IDdlNode, ErdColumn, ErdItem, ErdLink, ErdOutput } from './compiler/types.js';
export type { DdlContext, DDLGenerator, IDdlNode, ErdColumn, ErdItem, ErdLink, ErdOutput };

// ── PK / date-type canonical string constants ────────────────────────────────

const identityDataType = 'identityDataType';
const guid             = 'guid';
const tswtz            = 'Timestamp with time zone';
const tswltz           = 'Timestamp with local time zone';

// ── Types ────────────────────────────────────────────────────────────────────

interface OptionDef {
    label:   string;
    value:   string | number | boolean;
    check?:  string[];
}

/** Mutable copy of the options record built per-instance from defaultOptions. */
type OptionsRecord = Record<string, OptionDef>;

// ── normalize() ──────────────────────────────────────────────────────────────

type NormalizedValue = string | boolean | null;

function normalize(input: unknown): NormalizedValue {
    if (input == null) return null;
    const s = typeof input === 'string' ? input.toLowerCase() : input;
    if (s === 'yes'   || s === 'y'    || s === 'true'  || s === true)  return true;
    if (s === 'no'    || s === 'n'    || s === 'false'  || s === false) return false;
    if (s === identityDataType.toLowerCase()) return 'identity';
    if (s === guid.toLowerCase())             return 'guid';
    if (s === tswtz.toLowerCase())            return 'tswtz';
    if (s === tswltz.toLowerCase())           return 'tswltz';
    return typeof s === 'string' ? s : String(s);
}

// ── Default options ───────────────────────────────────────────────────────────

const defaultOptions: OptionsRecord = {
    apex:             { label: 'APEX',                          value: 'no',      check: ['yes','no'] },
    auditcols:        { label: 'Audit Columns',                 value: 'no',      check: ['yes','no'] },
    createdcol:       { label: 'Created Column Name',           value: 'created' },
    createdbycol:     { label: 'Created By Column Name',        value: 'created_by' },
    updatedcol:       { label: 'Updated Column Name',           value: 'updated' },
    updatedbycol:     { label: 'Updated By Column Name',        value: 'updated_by' },
    auditdate:        { label: 'Audit Column Date Type',        value: '' },
    aienrichment:     { label: 'AI Enrichment',                 value: 'no',      check: ['yes','no'] },
    boolean:          { label: 'Boolean Datatype',              value: 'not set', check: ['yn','native'] },
    genpk:            { label: 'Auto Primary Key',              value: 'yes',     check: ['yes','no'] },
    semantics:        { label: 'Character Strings',             value: 'CHAR',    check: ['BYTE','CHAR','Default'] },
    language:         { label: 'Data Language',                 value: 'EN',      check: ['EN','JP','KO'] },
    datalimit:        { label: 'Data Limit Rows',               value: 10000 },
    date:             { label: 'Date Data Type',                value: 'DATE',    check: ['DATE','TIMESTAMP',tswtz,tswltz] },
    db:               { label: 'Database Version',              value: 'not set' },
    dv:               { label: 'Duality View',                  value: 'no',      check: ['yes','no'] },
    drop:             { label: 'Include Drops',                 value: 'no',      check: ['yes','no'] },
    editionable:      { label: 'Editinable',                    value: 'no',      check: ['yes','no'] },
    inserts:          { label: 'Generate Inserts',              value: true,      check: ['yes','no'] },
    namelen:          { label: 'Name Character Length',         value: 255 },
    overridesettings: { label: 'Ignore toDDL() second parameter', value: 'no',   check: ['yes','no'] },
    prefix:           { label: 'Object Prefix',                 value: '' },
    pk:               { label: 'Primary Key Maintenance',       value: guid,      check: [identityDataType, guid, 'SEQ', 'NONE'] },
    prefixpkwithtname:{ label: 'Prefix primary keys with table name', value: 'no', check: ['yes','no'] },
    rowkey:           { label: 'Alphanumeric Row Identifier',   value: 'no',      check: ['yes','no'] },
    rowversion:       { label: 'Row Version Number',            value: 'no',      check: ['yes','no'] },
    schema:           { label: 'Schema',                        value: '' },
    api:              { label: 'Table API',                     value: 'no',      check: ['yes','no'] },
    compress:         { label: 'Table Compression',             value: 'no',      check: ['yes','no'] },
    transcontext:     { label: 'Translation Context',           value: "sys_context('APP_CTX','LANG')" },
    dialect:          { label: 'SQL Dialect',                   value: 'oracle' },
    longvc:           { label: 'Longer Varchars',               value: 'no',      check: ['yes','no'] },
    ondelete:         { label: 'On Delete',                     value: '',        check: ['cascade','restrict','set null'] },
    tenantid:         { label: 'Tenant ID',                     value: 'no',      check: ['yes','no'] },
    tenantref:        { label: 'Tenant Reference Table',        value: '' },
    verbose:          { label: 'Verbose Output',                value: 'no',      check: ['yes','no'] },
};

// ── expresql class ────────────────────────────────────────────────────────────

export class expresql implements DdlContext {

    // ── Cached output (null = not yet generated) ──
    private _ddl:    string     | null = null;
    private _erd:    ErdOutput  | null = null;
    private _errors: unknown[]  | null = null;

    // ── State ──
    input:              string;
    options:            OptionsRecord;
    forest:             DdlNode[];
    postponedAlters:    string[]      = [];
    postponedAltersSet: Set<string>   = new Set();
    data?:              unknown;       // optional pre-loaded data object for generateData()

    private _labelToKey: Record<string, string> = {};
    name2node:           Record<string, DdlNode> | null = null;

    constructor(fullInput: string, options?: unknown) {
        this.options = JSON.parse(JSON.stringify(defaultOptions)) as OptionsRecord;
        this.input   = fullInput;

        // Build label→key reverse-lookup for getOptionValue()
        for (const x in this.options) {
            const lbl = this.options[x].label;
            if (lbl != null) this._labelToKey[lbl.toLowerCase()] = x;
        }

        // Apply external options override if not suppressed by overridesettings
        let prefix = '';
        if (fullInput.toLowerCase().includes('overridesettings'))
            tree(this);   // parse just enough to read overridesettings
        if (options !== undefined && this.optionEQvalue('overrideSettings', false))
            prefix = '# settings = ' + String(options) + '\n\n';

        this.input  = prefix + fullInput;
        this.forest = tree(this) as DdlNode[];
    }

    // ── Option access ─────────────────────────────────────────────────────────

    getOptionValue(kEy: string): string | number | boolean | null {
        const key    = kEy.toLowerCase();
        let   option = this.options[key];
        if (!(key in this.options)) {
            const mapped = this._labelToKey[key];
            if (mapped != null) option = this.options[mapped];
        }
        return option?.value ?? null;
    }

    optionEQvalue(key: string, value: unknown): boolean {
        // eslint-disable-next-line eqeqeq -- intentional loose comparison after normalize()
        return normalize(this.getOptionValue(key)) == normalize(value);
    }

    setOptionValue(kEy: string, value: unknown): void {
        const key = kEy.toLowerCase();
        if (!(key in this.options)) {
            for (const x in this.options) {
                if (this.options[x].label === kEy) {
                    this.options[x].value = (value ?? '') as string | number | boolean;
                    return;
                }
            }
        }
        const v = value ?? '';
        let option = this.options[key];
        if (option == null) {
            option = { label: key, value: v as string | number | boolean };
            this.options[key] = option;
        } else {
            option.value = v as string | number | boolean;
        }
    }

    nonDefaultOptions(): Record<string, unknown> {
        const ret: Record<string, unknown> = {};
        for (const x in this.options)
            if (defaultOptions[x] && !this.optionEQvalue(x, defaultOptions[x].value))
                ret[x] = this.options[x].value;
        return ret;
    }

    unknownOptions(): string[] {
        const ret: string[] = [];
        for (const x in this.options)
            if (defaultOptions[x] == null) ret.push(x);
        return ret;
    }

    setOptions(line: string): void {
        line = line.trim();
        if (line.startsWith('#')) line = line.substring(1).trim();
        const eqPos = line.indexOf('=');
        let tmp = line.substring(eqPos + 1).trim();
        if (!tmp.includes('{')) tmp = '{' + line + '}';

        let json = '';
        const src = lexer(tmp, true, true, '');
        for (const t of src) {
            if (t.type === 'identifier' &&
                t.value !== 'true' && t.value !== 'false' && t.value !== 'null') {
                json += '"' + t.value + '"';
            } else if (t.type === 'constant.numeric' && !/^\d+(\.\d+)?$/.test(t.value)) {
                // Alphanumeric token like "19c" — lexed as numeric but must be a string.
                json += '"' + t.value + '"';
            } else {
                json += t.value;
            }
        }
        const settings = JSON.parse(json) as Record<string, unknown>;
        for (const x in settings)
            this.setOptionValue(x.toLowerCase(), settings[x]);
    }

    // ── Semantic helpers ──────────────────────────────────────────────────────

    semantics(): string {
        if (this.optionEQvalue('semantics', 'CHAR')) return ' char';
        if (this.optionEQvalue('semantics', 'BYTE')) return ' byte';
        return '';
    }

    objPrefix(withoutSchema?: string): string {
        let schema = (this.getOptionValue('schema') as string | null) ?? '';
        schema = (schema !== '' && withoutSchema == null) ? schema + '.' : '';
        const prefix = (this.getOptionValue('prefix') as string | null) ?? '';
        const sep    = (prefix !== '' && !prefix.endsWith('_')) ? '_' : '';
        return (schema + prefix + sep).toLowerCase();
    }

    // ── Node lookup ───────────────────────────────────────────────────────────

    find(name: string): DdlNode | null {
        if (this.name2node != null)
            return this.name2node[canonicalObjectName(name) as string] ?? null;

        this.name2node = {};
        for (const root of this.forest) {
            for (const node of root.descendants())
                this.name2node[node.parseName()] = node;
        }
        return this.name2node[canonicalObjectName(name) as string] ?? null;
    }

    descendants(): DdlNode[] {
        const ret: DdlNode[] = [];
        for (const root of this.forest)
            ret.push(...root.descendants());
        return ret;
    }

    additionalColumns(): Record<string, string> {
        const ret: Record<string, string> = {};
        const input = this.getOptionValue('Auxiliary Columns') as string | null;
        if (input == null) return ret;
        for (const attr of input.split(',')) {
            const trimmed = attr.trim();
            const pos     = trimmed.indexOf(' ');
            if (pos > 0) ret[trimmed.substring(0, pos)] = trimmed.substring(pos + 1).toUpperCase();
            else         ret[trimmed] = 'VARCHAR2(4000)';
        }
        return ret;
    }

    // ── Output generators ─────────────────────────────────────────────────────

    getERD(): ErdOutput {
        if (this._erd != null) return this._erd;
        this._erd = createGenerator(this).generateERD();
        return this._erd;
    }

    getDDL(): string {
        if (this._ddl != null) return this._ddl;
        this._ddl = createGenerator(this).generateFullDDL() + this._makeFooter();
        return this._ddl;
    }

    private _makeFooter(): string {
        const inputWithoutComments = (s: string) => s
            .replace(/\/\*/g, '--<--')
            .replace(/\*\//g, '-->--')
            .replace(/\/*\s*Non-default options:/g, '');

        let out = `-- Generated by Radicle ExpreSQL ${this.version()} ${new Date().toLocaleString()}\n\n`;
        out += '/*\n';
        out += inputWithoutComments(this.input);
        out += '\n';
        for (const u of this.unknownOptions())
            out += '*** Unknown setting: ' + u + '\n';
        out += '\n*/';
        return out;
    }

    getErrors(): unknown[] {
        if (this._errors != null) return this._errors;
        this._errors = errorMsgs.findErrors(this) as unknown[];
        return this._errors;
    }

    version(): string {
        return expresql_version();
    }

    // ── Static back-compat assignments (for quickSQL.toDDL() calling convention) ──
    declare static toDDL:    typeof toDDL;
    declare static toERD:    typeof toERD;
    declare static toErrors: typeof toErrors;
    declare static toDiff:   typeof toDiff;
    declare static fromJSON: typeof fromJSON;
    declare static version:  typeof expresql_version;
    declare static lexer:    typeof lexer;
}

// ── Module-level API functions ────────────────────────────────────────────────

export function fromJSON(input: unknown, name?: string): string {
    return json2qsql(input as string, name) as string;
}

export function toERD(input: string, options?: unknown): ErdOutput {
    return new expresql(input, options).getERD();
}

export function toDDL(input: string, options?: unknown): string {
    return new expresql(input, options).getDDL();
}

export function toErrors(input: string, options?: unknown): unknown[] {
    return new expresql(input, options).getErrors();
}

export function toDiff(
    oldQsql: string,
    newQsql: string,
    options?: unknown,
): import('./diff-types.js').DiffResult {
    const newCtx = new expresql(newQsql, options);
    const oldCtx = new expresql(oldQsql, options);
    return createDiffGenerator(newCtx).compute(oldCtx, newCtx);
}

export function expresql_version(): string {
    return typeof __PACKAGE_VERSION__ === 'undefined' ? 'development' : __PACKAGE_VERSION__;
}

// Assign to static slots for backward-compat (expresql.toDDL etc.)
expresql.toDDL    = toDDL;
expresql.toERD    = toERD;
expresql.toErrors = toErrors;
expresql.toDiff   = toDiff;
expresql.fromJSON = fromJSON;
expresql.version  = expresql_version;
expresql.lexer    = lexer;

export default expresql;
