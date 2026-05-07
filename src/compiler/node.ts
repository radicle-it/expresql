import { singular, concatNames, canonicalObjectName, getMajorVersion } from '../utils/naming.js';
import lexer, { LexerToken } from './lexer.js';
import amend_reserved_word from '../oracle/reserved_words.js';
import type { DdlContext, IDdlNode, SemanticType } from './types.js';

// ── Pre-computed lowercase constants (used only in DdlNode) ──────────────────

const TSWLTZ_LOWER    = 'timestamp with local time zone';
const TSWTZ_LOWER     = 'timestamp with time zone';
const TIMESTAMP_LOWER = 'timestamp';

// ── DEFAULT_NAMING ────────────────────────────────────────────────────────────

export const DEFAULT_NAMING = {
    pk:               '_pk',
    fk:               '_fk',
    unq:              '_unq',
    uk:               '_uk',
    ck:               '_ck',
    bet:              '_bet',
    bi:               '_bi',
    bu:               '_bu',
    seq:              '_seq',
    idx:              '_i',
    immutable_prefix: 'trg_',
    immutable_suffix: '_insertonly',
} as const;

export type Naming = typeof DEFAULT_NAMING;

// ── Type constants ────────────────────────────────────────────────────────────

export const tab         = '    ';
const stringTypes = ['string', 'varchar2', 'varchar', 'vc', 'char'];
const boolTypes   = ['yn', 'boolean', 'bool'];
const vectTypes   = ['vect', 'vector'];
const geoTypes    = ['geometry', 'sdo_geometry'];
let datatypes: string[] = [
    'integer', 'number', 'num', 'int',
    'blob', 'clob', 'json', 'file',
    'date', 'd', 'tstz', 'tswtz', 'tswltz', 'ts',
];
datatypes = datatypes.concat(stringTypes).concat(boolTypes).concat(vectTypes).concat(geoTypes);

// ── EXPANDING_TYPES ───────────────────────────────────────────────────────────

export interface ExpandingEntry { suffix: string; type: (ctx: DdlContext) => string; }
export type ExpandingTypes = Record<string, ExpandingEntry[]>;

export const EXPANDING_TYPES: ExpandingTypes = {
    file: [
        { suffix: '_filename', type: ctx => `varchar2(255${ctx.semantics()})` },
        { suffix: '_mimetype', type: ctx => `varchar2(255${ctx.semantics()})` },
        { suffix: '_charset',  type: ctx => `varchar2(255${ctx.semantics()})` },
        { suffix: '_lastupd',  type: ctx => String(ctx.getOptionValue('Date Data Type') ?? '').toLowerCase() },
    ],
};

// ── Helper functions ──────────────────────────────────────────────────────────

function _resolveVarcharLen(src: LexerToken[], vcPos: number, len: number): number {
    if (src[vcPos].value.endsWith('k'))
        return len < 32 ? len * 1024 : len * 1024 - 1;
    return len;
}

function _nameImpliesNumeric(
    colName: string, src: LexerToken[],
    vcPos: number, datePos: number, slashPos: number, pkPos: number,
): boolean {
    if (colName.endsWith('_id') && vcPos < 0 && datePos < 0) return true;
    if (src[1] && src[1].value === 'id') return true;
    if (colName === 'quantity') return true;
    if (colName.endsWith('_number')) return true;
    if (colName.endsWith('id') && vcPos < 0 && slashPos + 1 === pkPos) return true;
    return false;
}

function _nameImpliesDate(colName: string, src: LexerToken[], datePos: number): boolean {
    if (0 <= datePos) return true;
    if (colName === 'hiredate') return true;
    if (colName.endsWith('_date')) return true;
    if (colName.startsWith('date_of_')) return true;
    if (colName.startsWith('created')) return true;
    if (colName.startsWith('updated')) return true;
    if (1 < src.length && src[1].value === 'd') return true;
    return false;
}

// ── DdlNode class ─────────────────────────────────────────────────────────────

export class DdlNode implements IDdlNode {
    line:             number;
    parent:           DdlNode | null;
    children:         DdlNode[];
    fks:              Record<string, string> | null;
    content:          string;
    comment:          string | null;
    annotations:      string | null;
    src:              LexerToken[];
    colprefix?:       string;
    parsedName:       string | null;
    _maxChildNameLen: number;
    _slashPos?:       number;
    /** Preserved for compatibility — always undefined (dead code in generateView). */
    readonly one2many2oneUnsupoorted: string | undefined = undefined;
    _ctx:             DdlContext;

    constructor(lineNo: number, inputLine: string, parent: DdlNode | null, ctx: DdlContext) {
        this.line    = lineNo;
        this.parent  = parent;
        this.children = [];
        if (parent !== null) parent.children.push(this);

        this.fks     = null;
        this._ctx    = ctx;
        this.comment = null;

        function normalizeContent(ddlLine: string): string {
            let ret = ddlLine;
            ret = ret.replace(/ timestamp with local time zone/gi, ' tswltz');
            ret = ret.replace(/ timestamp with time zone/gi, ' tswtz');
            ret = ret.replace(/ timestamp/gi, ' ts');
            return ret;
        }

        this.content = normalizeContent(inputLine);

        // Extract annotations {key 'value', ...}
        this.annotations = null;
        const annStart = this.content.indexOf('{');
        if (annStart > 0 && (this.content.charAt(annStart - 1) === ' ' || this.content.charAt(annStart - 1) === '\t')) {
            const annEnd = this.content.indexOf('}', annStart);
            if (annEnd > annStart) {
                this.annotations = this.content.substring(annStart + 1, annEnd).trim();
                this.content = this.content.substring(0, annStart) + this.content.substring(annEnd + 1);
            }
        }

        this.src = lexer(this.content, false, true, '`');
        // lowerValue is already computed in LexerToken constructor — no loop needed

        const cp = this.getOptionValue('colprefix');
        if (cp !== null) this.colprefix = cp;

        this.parsedName      = null;
        this._maxChildNameLen = -1;
    }

    findChild(name: string): DdlNode | null {
        for (let i = 0; i < this.children.length; i++)
            if (this.children[i].parseName() === name) return this.children[i];
        return null;
    }

    descendants(): DdlNode[] {
        const ret: DdlNode[] = [this];
        for (let i = 0; i < this.children.length; i++)
            ret.push(...this.children[i].descendants());
        return ret;
    }

    maxChildNameLen(): number {
        if (this._maxChildNameLen >= 0) return this._maxChildNameLen;
        let maxLen = 2;
        if (this.hasRowKey())     maxLen = 'row_key'.length;
        if (this.hasRowVersion()) maxLen = Math.max(maxLen, 'row_version'.length);
        if (this.hasAuditCols()) {
            for (const key of ['createdcol', 'createdbycol', 'updatedcol', 'updatedbycol']) {
                const len = String(this._ctx.getOptionValue(key) ?? '').length;
                if (maxLen < len) maxLen = len;
            }
        }
        if (this._ctx.optionEQvalue('tenantid', true) && this.findChild('tenant_id') === null && !this.isOption('notenantid'))
            maxLen = Math.max(maxLen, 'tenant_id'.length);
        if (this.fks !== null) {
            for (const col in this.fks) {
                let len = col.length;
                const refNode = this._ctx.find(col);
                if (refNode !== null && refNode.isMany2One()) len += '_id'.length;
                if (maxLen < len) maxLen = len;
            }
        }
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (0 < child.children.length) continue;
            let len = child.parseName().length;
            for (const type in EXPANDING_TYPES) {
                if (0 < child.indexOf(type)) {
                    let maxSuffix = 0;
                    for (const ext of EXPANDING_TYPES[type])
                        if (ext.suffix.length > maxSuffix) maxSuffix = ext.suffix.length;
                    len += maxSuffix;
                    break;
                }
            }
            if (maxLen < len) maxLen = len;
        }
        const cols = this._ctx.additionalColumns();
        for (const col in cols) {
            const len = col.length;
            if (maxLen < len) maxLen = len;
        }
        this._maxChildNameLen = maxLen;
        return maxLen;
    }

    getAnnotationValue(key: string): string | null {
        if (this.annotations === null) return null;
        const regex = new RegExp(key + ':?\\s+[\'"]([^\'"]*)[\'"]', 'i');
        const match = this.annotations.match(regex);
        return match ? match[1] : null;
    }

    getAnnotationPairs(): Array<{ label: string; value: string | null }> {
        if (this.annotations === null) return [];
        const pairs: Array<{ label: string; value: string | null }> = [];
        const regex = /(\w+)(?:\s+['"]([^'"]*)['"'])?/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(this.annotations)) !== null)
            pairs.push({ label: match[1], value: match[2] !== undefined ? match[2] : null });
        return pairs;
    }

    hasAuditCols(): boolean {
        return this._ctx.optionEQvalue('Audit Columns', 'yes') || this.isOption('auditcols')
            || this.isOption('audit', 'col') || this.isOption('audit', 'cols') || this.isOption('audit', 'columns');
    }

    hasRowVersion(): boolean {
        return this._ctx.optionEQvalue('Row Version Number', 'yes') || this.isOption('rowversion');
    }

    hasRowKey(): boolean {
        return this._ctx.optionEQvalue('rowkey', true) || this.isOption('rowkey');
    }

    regularColumns(): DdlNode[] {
        return this.children.filter(c => c.children.length === 0 && c.refId() === null);
    }

    apexUser(): string {
        return this._ctx.optionEQvalue('apex', 'yes')
            ? "coalesce(sys_context('APEX$SESSION','APP_USER'),user)"
            : 'user';
    }

    auditSysDateFn(): string {
        const auditDateType = String(this._ctx.getOptionValue('auditdate') || this._ctx.getOptionValue('Date Data Type') || '');
        return auditDateType.toLowerCase().indexOf('timestamp') >= 0 ? 'systimestamp' : 'sysdate';
    }

    indexOf(token: string, isPrefix?: boolean): number {
        const lowerToken = token.toLowerCase();
        for (let i = 0; i < this.src.length; i++) {
            const lv = this.src[i].lowerValue;
            if (isPrefix && lv.indexOf(lowerToken) === 0) return i;
            else if (lowerToken === lv) return i;
        }
        return -1;
    }

    occursBeforeOption(token: string, isPrefix?: boolean): boolean {
        const tokenPos = this.indexOf(token, isPrefix);
        if (tokenPos <= 0) return false;
        if (this._slashPos === undefined) this._slashPos = this.indexOf('/');
        return this._slashPos < 0 || tokenPos < this._slashPos;
    }

    isOption(token: string, token2?: string): boolean {
        for (let i = 2; i < this.src.length; i++) {
            if (token === this.src[i].lowerValue)
                if (token2 == null || (i < this.src.length - 1 && token2 === this.src[i + 1].lowerValue))
                    return this.src[i - 1].value === '/';
        }
        return false;
    }

    getOptionValue(option: string): string | null {
        if (this.src.length < 3) return null;
        const pos = this.indexOf(option);
        if (pos < 2 || this.src[pos - 1].value !== '/') return null;
        let ret = '';
        for (let i = pos + 1; i < this.src.length && this.src[i].value !== '/' && this.src[i].value !== '['; i++)
            ret += this.src[i].value;
        return ret;
    }

    sugarcoatName(from: number, to: number): string {
        let prefix = '';
        if (this.children.length === 0) {
            if (this.parent !== undefined && this.parent !== null && this.parent.colprefix !== undefined)
                prefix = this.parent.colprefix + '_';
        }

        let ret = '';
        const spacer = '_';
        for (let i = from; i < to; i++) {
            const value = this.src[i].value;
            const qVal  = '"' + value + '"';
            if (this.src[i].type !== 'constant.numeric' && value !== canonicalObjectName(qVal)) {
                ret = this.content.substring(this.src[from].begin, this.src[to - 1].end);
                const hasPrefix = 0 < (String(this._ctx.getOptionValue('prefix') ?? '')).length;
                const canonical = canonicalObjectName(ret) ?? ret;
                const named = hasPrefix ? canonical : amend_reserved_word(canonical);
                this.parsedName = prefix + named;
                return this.parsedName;
            }
        }

        for (let i = from; i < to; i++) {
            if (from < i) ret += spacer;
            ret += this.src[i].value;
        }

        const c = ret.charAt(0);
        if (c >= '0' && c <= '9') ret = 'x' + ret;

        const hasPrefix = 0 < (String(this._ctx.getOptionValue('prefix') ?? '')).length;
        const canonical = canonicalObjectName(ret) ?? ret;
        const named = hasPrefix ? canonical : amend_reserved_word(canonical);
        this.parsedName = prefix + named;
        return this.parsedName;
    }

    parseName(): string {
        if (this.parsedName !== null) return this.parsedName;

        let nameFrom = 0;
        let ret = this.src[0].value;
        if (ret === '>' || ret === '<') {
            ret = this.src[1].value;
            nameFrom = 1;
        }
        const qtBegin = ret.indexOf('"');
        const qtEnd   = ret.indexOf('"', qtBegin + 1);
        if (0 <= qtBegin && qtBegin < qtEnd)
            return ret.substring(qtBegin, qtEnd + 1);

        if (this.src[0].value === 'view') return this.src[1].value;
        if (1 < this.src.length && this.src[1].value === '=') return this.src[0].value;

        let nameTo = this.src.length;

        let tmp = this.indexOf('/');
        if (0 < tmp) nameTo = tmp;
        tmp = this.indexOf('[');
        if (0 < tmp && tmp < nameTo) nameTo = tmp;
        tmp = this.indexOf('=');
        if (0 < tmp && tmp < nameTo) nameTo = tmp;

        for (let i = 0; i < datatypes.length; i++) {
            let pos = this.indexOf(datatypes[i]);
            if (pos < 0) pos = this.indexOf(datatypes[i], true);
            if (0 < pos && pos < nameTo) {
                nameTo = pos;
                return this.sugarcoatName(nameFrom, nameTo);
            }
        }

        for (let i = nameFrom; i < nameTo; i++) {
            const tmp2 = this.src[i].lowerValue;
            if (tmp2.charAt(0) === 'v' && tmp2.charAt(1) === 'c') {
                if (tmp2.charAt(2) === '(')  return this.sugarcoatName(nameFrom, i);
                if (tmp2.charAt(2) >= '0' && tmp2.charAt(2) <= '9') return this.sugarcoatName(nameFrom, i);
            }
        }

        return this.sugarcoatName(nameFrom, nameTo);
    }

    _inferTypeFull(): SemanticType {
        const src     = this.src;
        const colName = src[0].value;

        // Phase 1: varchar base length
        let varcharLen: number = (colName.endsWith('_name') || colName.startsWith('name') || colName.startsWith('email'))
            ? (this._ctx.getOptionValue('namelen') as number) || 255
            : 4000;
        const vcPos = this.indexOf('vc', true);
        if (0 < vcPos) {
            let vcArg = src[vcPos].value.substring('vc'.length);
            if (vcArg === '') {
                const oParenPos = this.indexOf('(');
                if (oParenPos === vcPos + 1) vcArg = src[vcPos + 2].value;
            }
            varcharLen = _resolveVarcharLen(src, vcPos, vcArg !== '' ? parseInt(vcArg) : varcharLen);
        }
        let base = 'varchar';

        // Phase 2: numeric by column name convention
        const datePos  = this.indexOf('date');
        if (this._slashPos === undefined) this._slashPos = this.indexOf('/');
        const slashPos = this._slashPos;
        if (_nameImpliesNumeric(colName, src, vcPos, datePos, slashPos, this.indexOf('pk')))
            base = 'number';

        // Phase 3: explicit keyword overrides
        if (this.occursBeforeOption('int', true)) base = 'integer';
        if (0 < vcPos) base = 'varchar';
        let vectorSpec: string | undefined;
        const vector = this.vectorType('vector') || this.vectorType('vect');
        if (vector !== null) {
            base      = 'vector';
            vectorSpec = vector.substring('vector'.length);  // e.g. "(128,*,*)"
        }

        // Phase 4: boolean
        const parent       = this.parent!;
        const parent_child = concatNames(parent.parseName(), '_', this.parseName());
        let needsBoolCheck = false;
        const isBooleanName  = colName.endsWith('_yn') || colName.startsWith('is_');
        const hasBoolKeyword = boolTypes.some(bt => 0 < this.indexOf(bt));
        if (isBooleanName || hasBoolKeyword) {
            base       = 'varchar';
            varcharLen = 1;
            needsBoolCheck = true;
        }
        const dbVer = this._ctx.getOptionValue('db') as string | null;
        if (needsBoolCheck && (
            this._ctx.getOptionValue('boolean') === 'native'
            || (this._ctx.getOptionValue('boolean') !== 'yn' && dbVer && dbVer.length > 0 && 23 <= (getMajorVersion(dbVer) ?? 0))
        )) {
            needsBoolCheck = false;
            base = 'boolean';
        }
        const isNativeBoolean = (base === 'boolean');

        // Phase 5: phone_number + num(precision)
        if (this.indexOf('phone_number') === 0) base = 'number';
        let numericSpec: string | undefined;
        const numFrom = this.indexOf('num', true);
        if (0 < numFrom) {
            base = 'number';
            const numTo = this.indexOf(')');
            if (0 < numTo) numericSpec = this.content.substring(src[numFrom + 1].begin, src[numTo].end).toLowerCase();
        }

        // Phase 6: date / timestamp override
        if (_nameImpliesDate(colName, src, datePos)) {
            const dateOpt = String(this._ctx.getOptionValue('Date Data Type') ?? '').toLowerCase();
            if (dateOpt === TIMESTAMP_LOWER)  base = 'timestamp';
            else if (dateOpt === TSWTZ_LOWER)  base = 'tswtz';
            else if (dateOpt === TSWLTZ_LOWER) base = 'tswltz';
            else base = 'date';
        }

        // Phase 7: LOB / JSON
        if (vcPos < 0) {
            if (this.occursBeforeOption('clob')) base = 'clob';
            if (this.occursBeforeOption('blob') || this.occursBeforeOption('file')) base = 'blob';
            if (this.occursBeforeOption('json')) base = 'json';
        }

        // Phase 8: geometry, domain (23+), timestamp variants
        for (const i in geoTypes) if (this.occursBeforeOption(geoTypes[i])) { base = 'geometry'; break; }
        if (this.isOption('domain') && dbVer && dbVer.length > 0 && 23 <= (getMajorVersion(dbVer) ?? 0))
            base = this.getOptionValue('domain') ?? base;
        if (this.occursBeforeOption('tswltz') && slashPos !== 0) base = 'tswltz';
        else if (this.occursBeforeOption('tswtz') || this.occursBeforeOption('tstz')) base = 'tswtz';
        else if (this.occursBeforeOption('ts')) base = 'timestamp';

        const result: SemanticType = { base, colName, varcharLen, needsBoolCheck, isNativeBoolean, parent_child };
        if (numericSpec !== undefined) result.numericSpec = numericSpec;
        if (vectorSpec  !== undefined) result.vectorSpec  = vectorSpec;
        return result;
    }

    inferType(): string {
        if (this.children !== null && 0 < this.children.length) return 'table';
        const src = this.src;
        if (src[0].value === 'view' || (1 < src.length && src[1].value === '=')) return 'view';
        if (src[0].value === 'dv') return 'dv';
        if (this.parent === null) return 'table';
        const sem = this._inferTypeFull();
        if (this.isOption('fk') || 0 < this.indexOf('reference', true)) {
            let fkType = 'number';
            if (sem.base === 'integer') fkType = 'integer';
            const parentRef = this.refId();
            const refNode   = this._ctx.find(parentRef!);
            if (refNode !== null && refNode.getExplicitPkName() !== null)
                fkType = refNode.getPkType();
            return fkType;
        }
        return sem.base;
    }

    getPlsqlType(): string {
        const t = this.inferType();
        if (t === 'varchar') return 'varchar2';
        return t;
    }

    vectorType(mnemonics: string): string | null {
        const vectPos = this.indexOf(mnemonics, true);
        const src = this.src;
        if (0 < vectPos) {
            let dim = src[vectPos].value.substring(mnemonics.length);
            if (dim === '') {
                const oParenPos = this.indexOf('(');
                if (oParenPos === vectPos + 1) dim = src[vectPos + 2].value;
            }
            let len: string | number = '*';
            if (dim !== '') {
                let factor = 1;
                if (dim.endsWith('k')) factor = 1024;
                dim = dim.substring(0, dim.length - 1);
                len = parseInt(dim) * factor;
            }
            return `vector(${len},*,*)`;
        }
        return null;
    }

    genConstraint(_optQuote?: string): string {
        let ret = '';
        if (this.isOption('check')) {
            let parentPref = '';
            if (this.parent !== null) parentPref = concatNames(this.parent.parseName(), '_');
            const parent_child = concatNames(parentPref, this.parseName());

            let offset = tab;
            if (this.parent !== null) offset = ' '.repeat(this.parent.maxChildNameLen());
            const constr = this.getGeneralConstraint();
            if (constr !== null) {
                if (this.children !== null && 0 < this.children.length) {
                    ret += tab + 'constraint ' + concatNames(this._ctx.objPrefix(), parent_child, DEFAULT_NAMING.ck);
                    ret += '  check ' + constr + ',\n';
                } else {
                    ret += ' constraint ' + concatNames(this._ctx.objPrefix(), parent_child, DEFAULT_NAMING.ck) + '\n';
                    ret += tab + tab + offset + 'check ' + constr + '';
                }
                return ret;
            }
            const values = this.getValues('check');
            ret += ' constraint ' + concatNames(this._ctx.objPrefix(), parent_child, DEFAULT_NAMING.ck) + '\n';
            ret += tab + tab + offset + 'check (' + this.parseName() + ' in (' + values + '))';
        }
        return ret;
    }

    isMany2One(): boolean {
        return this.src[0].value === '>';
    }

    getExplicitPkName(): string | null {
        if (this.isOption('pk')) {
            if (this.inferType() === 'table') return this.getOptionValue('pk');
            else return this.parseName();
        }
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i].isOption('pk')) return this.children[i].parseName();
        }
        return null;
    }

    trimmedContent(): string {
        let ret = this.content.trim();
        const start1 = ret.indexOf('[');
        const end1   = ret.indexOf(']');
        if (this.comment === null && 0 < start1)
            this.comment = ret.substr(start1 + 1, end1 - start1 - 1);
        if (0 < start1) ret = ret.substr(0, start1) + ret.substr(end1 + 2);
        const start2 = ret.indexOf('--');
        if (this.comment === null && 0 < start2) this.comment = ret.substr(start2 + 2);
        if (0 < start2) ret = ret.substr(0, start2);
        return ret.trim();
    }

    refId(): string | null {
        let tmp = this.trimmedContent();
        tmp = tmp.replace(/\/cascade/g, '');
        let pos = tmp.indexOf(' id ');
        if (pos < 0) {
            if (pos === tmp.length - ' id'.length) pos = tmp.indexOf(' id');
        }
        if (pos < 0) {
            pos = tmp.indexOf(' id');
            if (pos !== tmp.length - ' id'.length) pos = -1;
        }
        if (pos < 0) {
            pos = tmp.indexOf('_id ');
            if (pos !== tmp.length - '_id '.length) pos = -1;
        }
        if (pos < 0) {
            pos = tmp.indexOf('_id');
            if (pos !== tmp.length - '_id'.length) pos = -1;
        }
        if (pos < 0) {
            pos = tmp.indexOf('Id ');
            if (pos !== tmp.length - 'Id '.length) pos = -1;
        }
        if (0 < pos) {
            let ref = tmp.substr(0, pos) + 's';
            if (this._ctx.find(ref) !== null) return ref;
            ref = tmp.substr(0, pos);
            if (this._ctx.find(ref) !== null) return ref;
        }
        pos = tmp.indexOf('/fk');
        if (0 < pos) {
            tmp = tmp.substr(pos + '/fk'.length).trim();
            pos = tmp.indexOf('/');
            if (0 < pos) tmp = tmp.substring(0, pos).trim();
            pos = tmp.indexOf('[');
            if (0 < pos) tmp = tmp.substring(0, pos).trim();
            return tmp.replace(' ', '_');
        }
        pos = tmp.indexOf('/reference');
        if (0 < pos) {
            tmp = tmp.substr(pos + '/reference'.length).trim();
            if (tmp.indexOf('s') === 0) tmp = tmp.substring(1).trim();
            pos = tmp.indexOf('/');
            if (0 < pos) tmp = tmp.substring(0, pos).trim();
            pos = tmp.indexOf('[');
            if (0 < pos) tmp = tmp.substring(0, pos).trim();
            return tmp.replace(' ', '_');
        }
        return null;
    }

    getGeneralConstraint(): string | null {
        const from = this.indexOf('check');
        if (0 < from && this.src[from - 1].value === '/' &&
            (this.src[from + 1].value === '(' || this.src[from + 1].lowerValue === 'not')
        ) {
            let i = from + 2;
            for (; i < this.src.length && this.src[i].value !== '/' && this.src[i].value !== '[';)
                i++;
            let ret = this.content.substring(this.src[from + 1].begin, this.src[i - 1].end);
            if (ret.charAt(0) !== '(') ret = '(' + ret + ')';
            return ret;
        }
        return null;
    }

    listValues(check_or_values: string): (string | number | null)[] {
        const ret: (string | number | null)[] = [];
        const from = this.indexOf(check_or_values);
        let separator = ' ';
        for (let i = from + 1; i < this.src.length && this.src[i].value !== '/' && this.src[i].value !== '['; i++) {
            if (this.src[i].value === ',') { separator = ','; break; }
            else if (this.src[i].lowerValue === 'and') { separator = this.src[i].value; break; }
        }

        if (separator === ' ') {
            for (let i = from + 1; i < this.src.length && this.src[i].value !== '/' && this.src[i].value !== '['; i++) {
                let value: string = this.src[i].value;
                if (this.src[i].type === 'identifier' && value !== 'null') value = "'" + value + "'";
                if (value.charAt(0) === '`') value = value.substring(1, value.length - 1);
                ret.push(value);
            }
            return ret;
        }

        let aggrVal: string | null = null;
        let type:    string | null = null;
        for (let i = from + 1; i < this.src.length && this.src[i].value !== '/' && this.src[i].value !== '['; i++) {
            let value = this.src[i].value;
            const spacer = this.content.substring(this.src[i - 1].end, this.src[i].begin);
            if (value === separator) {
                if (type === 'identifier' && aggrVal !== 'null') aggrVal = "'" + aggrVal + "'";
                ret.push(aggrVal);
                aggrVal = null; type = null;
                continue;
            }
            if (value === '(' || value === ')') continue;
            if (value.charAt(0) === '`') value = value.substring(1, value.length - 1);
            else if (this.src[i].type === 'identifier') type = 'identifier';
            aggrVal = aggrVal === null ? value : aggrVal + spacer + value;
        }
        if (type === 'identifier') aggrVal = "'" + aggrVal + "'";
        ret.push(aggrVal);
        return ret;
    }

    getValues(check_or_values: string): string {
        let ret = '';
        const values = this.listValues(check_or_values);
        for (let i = 0; i < values.length; i++) {
            if (0 < i) ret += ',';
            ret += values[i];
        }
        return ret;
    }

    getDefaultValue(): string | null {
        if (!this.isOption('default')) return null;
        let value = '';
        for (let i = this.indexOf('default') + 1; i < this.src.length; i++) {
            const token = this.src[i].getValue();
            if (token === '/' || token === '-' || token === '[') break;
            value += token;
        }
        return value;
    }

    getBetweenClause(): string | null {
        if (!this.isOption('between')) return null;
        const bi = this.indexOf('between');
        return this.src[bi + 1].getValue() + ' and ' + this.src[bi + 3].getValue();
    }

    parseValues(): (string | number)[] | null {
        if (this.isOption('check'))  return this.listValues('check') as (string | number)[];
        if (this.isOption('values')) return this.listValues('values') as (string | number)[];
        if (this.isOption('between')) {
            const values = this.listValues('between');
            const out: number[] = [];
            for (let i = parseInt(String(values[0])); i <= parseInt(String(values[1])); i++)
                out.push(i);
            return out;
        }
        return null;
    }

    apparentDepth(): number {
        const chunks = this.content.split(/ |\t/);
        let depth = 0;
        for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            if ('\t' === chunk) { depth += tab.length; continue; }
            if ('' === chunk)   { depth++; continue; }
            return depth;
        }
        throw new Error('No alphanumerics in the node content');
    }

    depth(): number {
        if (this.parent === null) return 0;
        return this.parent.depth() + 1;
    }

    isLeaf(): boolean {
        return this.children.every(c => c.children.length === 0);
    }

    getGenIdColName(): string | null {
        if (this.inferType() !== 'table') return null;
        if (this.getExplicitPkName() !== null) return null;
        if (this._ctx.optionEQvalue('Auto Primary Key', 'yes')) {
            let colPrefix = '';
            if (this.colprefix !== undefined) colPrefix = this.colprefix + '_';
            if (this._ctx.optionEQvalue('prefixPKwithTname', 'yes'))
                colPrefix = (singular(this.parseName()) ?? this.parseName()) + '_';
            return colPrefix + 'id';
        }
        return null;
    }

    getPkName(): string | null {
        const id = this.getGenIdColName();
        if (id === null) return this.getExplicitPkName();
        return id;
    }

    getPkType(): string {
        const id = this.getGenIdColName();
        if (id === null) {
            const cname = this.getExplicitPkName()!;
            return this.findChild(cname)!.inferType();
        }
        return 'integer';
    }

    lateInitFks(): void {
        if (this.fks === null) this.fks = {};
        if (!this.isMany2One()) {
            if (this.parent !== null && this.inferType() === 'table') {
                const pkn = this.parent.getPkName() ?? '';
                if (pkn.indexOf(',') < 0)
                    this.fks[(singular(this.parent.parseName()) ?? this.parent.parseName()) + '_id'] = this.parent.parseName();
                else
                    this.fks[(singular(this.parent.getPkName() ?? '') ?? this.parent.parseName())] = this.parent.parseName();
            }
            for (let i = 0; i < this.children.length; i++) {
                const refId = this.children[i].refId();
                if (refId !== null)
                    this.fks[this.children[i].parseName()] = refId;
            }
        }
    }

    cardinality(): number {
        const start = this.isOption('insert');
        if (start) {
            const pos = this.indexOf('insert');
            let ret = parseInt(this.src[pos + 1].value);
            const limit = this._ctx.getOptionValue('datalimit') as number;
            if (limit < ret) ret = limit;
            return ret;
        }
        return 0;
    }

    isArray(): boolean {
        if (!this.isMany2One() && this.parent !== null) return true;
        return false;
    }

    hasNonArrayChildId(cname: string): boolean {
        if (!cname.endsWith('_id')) return false;
        const name = cname.slice(0, -3);
        return this.children.some(c => c.children.length > 0 && c.parseName() === name && !c.isArray());
    }

    getTransColumns(): IDdlNode[] {
        const cols: IDdlNode[] = [];
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (child.isOption('trans') || child.isOption('translation') || child.isOption('translations'))
                cols.push(child);
        }
        return cols;
    }

    getBaseType(): string {
        let type = this.inferType();
        let idx = type.indexOf(' not null');
        if (idx > 0) type = type.substring(0, idx);
        idx = type.indexOf('\n');
        if (idx > 0) type = type.substring(0, idx);
        return type;
    }
}
