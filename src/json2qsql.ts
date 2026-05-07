/* globals __PACKAGE_VERSION__ */
declare const __PACKAGE_VERSION__: string | undefined;

import { singular } from './naming.js';

// ── Types ──────────────────────────────────────────────────────────────────────

type AnyRecord   = Record<string, unknown>;
type ContentMap  = Record<string, AnyRecord[]>;
type CountMap    = Record<string, number>;
type ParentMap   = Record<string, string>;

interface IdRef {
    key:   string;
    value: unknown;
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function indent(depth: number): string {
    let s = '';
    for (let i = 0; i < depth; i++)
        s += '   ';
    return s;
}

function hasEntry(array: AnyRecord[], entry: AnyRecord): boolean {
    for (const i in array)
        if (JSON.stringify(array[i]) === JSON.stringify(entry))
            return true;
    return false;
}

function getId(record: AnyRecord): IdRef | null {
    const suffixes = ['_id', 'Id'];
    if (record['id'] != null)
        return { key: 'id', value: record['id'] };
    for (let i = 0; i < suffixes.length; i++) {
        const suffix = suffixes[i];
        for (const property in record) {
            if (property.endsWith(suffix))
                return { key: property, value: record[property] };
        }
    }
    return null;
}

function hasPrimitiveAttr(value: unknown): boolean {
    if (value == null || typeof value !== 'object') return false;
    for (const property in (value as AnyRecord)) {
        if ((value as AnyRecord)[property] != null && typeof (value as AnyRecord)[property] === 'object')
            continue;
        return true;
    }
    return false;
}

function suggestName(obj: unknown): string | null {
    let property: string | null = null;
    outer: for (const i in (obj as AnyRecord)) {
        if (i === '0')
            for (const attr in (obj as AnyRecord)[i] as AnyRecord) {
                property = attr;
                break outer;
            }
        else {
            property = i;
            break outer;
        }
    }
    if (property == null) return null;
    if (property.toLowerCase() === 'id') return null;
    if (property.toLowerCase().endsWith('_id'))
        return property.substring(0, property.length - '_id'.length);
    if (property.endsWith('Id'))
        return property.substring(0, property.length - 'Id'.length);
    return null;
}

function isM2M(content: AnyRecord[], attr1: string, attr2: string): boolean {
    let is12M = false;
    let isM21 = false;
    for (const i in content)
        for (let j = 0; j < (i as unknown as number); j++) {
            if (content[i][attr1] === content[j][attr1]
             && content[i][attr2] !== content[j][attr2]
            ) is12M = true;
            else if (content[i][attr1] !== content[j][attr1]
                  && content[i][attr2] === content[j][attr2]
            ) isM21 = true;
            if (is12M && isM21) return true;
        }
    return false;
}

function signature(obj: unknown): string {
    if (obj == null) return '';
    if (typeof obj !== 'object') return '';
    let ret = '(';
    for (const property in (obj as AnyRecord)) {
        if (property === '0')
            return signature((obj as AnyRecord)[property]);
        if ((obj as AnyRecord)[property] != null && typeof (obj as AnyRecord)[property] === 'object')
            continue;
        ret += property + ',';
    }
    if (ret.lastIndexOf(',') === ret.length - 1)
        ret = ret.substring(0, ret.length - 1);
    return ret + ')';
}

function auxTabSignature(table1: string, table2: string): string {
    let t1 = table1;
    let t2 = table2;
    const pos1 = t1.indexOf('(');
    if (0 < pos1) t1 = t1.substring(0, pos1);
    const pos2 = t2.indexOf('(');
    if (0 < pos2) t2 = t2.substring(0, pos2);
    return t1 + '_' + t2 + '(' + t1 + '_id,' + t2 + '_id)';
}

// ── TableContent class ─────────────────────────────────────────────────────────

class TableContent {
    tableContent:    ContentMap  = {};
    notNormalized:   string[]    = [];
    tableSignatures: string[]    = [];
    child2parent:    ParentMap   = {};
    objCounts:       CountMap    = {};
    idSeq:           number      = 1;

    output(key: string, value: unknown, level: number, m2m?: boolean): string {
        if (m2m !== false && this.notNormalized.includes(key)) {
            const auxTable = auxTabSignature(this.parent(key) ?? '', key);
            const tContent = this.tableContent[auxTable];
            if (tContent != null) {
                const output = '\n' + indent(level) + this.tableName(auxTable) + ' /insert ' + tContent.length;
                if (isM2M(tContent, this.refIdName(this.parent(key) ?? ''), this.refIdName(key))) {
                    return output + this.output(key, value, level + 1, false);
                }
            }
        }

        const m2o = this.notNormalized.includes(key) ? '>' : '';
        let output = '\n' + indent(level) + m2o + this.tableName(key);

        if (typeof value === 'number') {
            output += ' num';
            if (key.endsWith('_id') || key.endsWith('Id')) {
                output += ' /pk';
                return output;
            }
        }
        if (key === 'id') {
            return '\n' + indent(level) + 'id vc32 /pk';
        }

        tofinal: if (value != null && typeof value === 'object') {
            if (Array.isArray(value)) {
                for (const property in value) {
                    if (1 <= (property as unknown as number))
                        break;
                    const field = (value as unknown[])[property as unknown as number];
                    output = this.output(key, field, level, m2m);
                    break tofinal;
                }
            } else {
                if (key !== '') {
                    if (this.tableContent[key] == null) { /* no-op */ }
                    output += '  /insert ' + this.tableContent[key].length;
                }
            }
            let promotedField = '';
            if (!this.tableSignatures.includes(key)) {
                output = '';
                level--;
            }
            for (const property in (value as AnyRecord)) {
                const field = (value as AnyRecord)[property];
                if (property != null) {
                    const fld = singular(key) ?? '';
                    const cmp = property.toLowerCase();
                    if (key != null && fld + '_id' === cmp && 0 < level)
                        promotedField = property;
                    if (fld + '_id' === cmp)
                        continue;
                    if (!isNaN(property as unknown as number) && !Array.isArray(value))
                        continue;
                }
                const subtree = this.output(property + signature(field), field, level + 1);
                output += subtree;
            }
            if (promotedField !== '')
                output += '\n' + indent(level) + promotedField;
        }
        return output;
    }

    flatten(key: string, value: unknown, parentId?: IdRef | null): void {
        const record: AnyRecord = {};

        for (const property in (value as AnyRecord)) {
            const val = (value as AnyRecord)[property];
            if (val != null && typeof val === 'object') {
                let k      = key;
                let pId    = parentId;
                if (isNaN(property as unknown as number)) {
                    k = property + signature(val);
                    const tmp = getId(record);
                    if (tmp != null) pId = tmp;
                }
                this.flatten(k, val, pId);
            } else {
                record[property] = val;
            }
        }

        if (!this.notNormalized.includes(key) && parentId != null && Object.keys(record).length)
            record[parentId.key] = parentId.value;

        const hasKeys = 0 < Object.keys(record).length;
        let array = this.tableContent[key];
        if (hasKeys) {
            if (array == null) array = [];
            if (!hasEntry(array, record))
                array.push(record);

            if (this.notNormalized.includes(key)) {
                const par = this.parent(key);
                if (par != null) {
                    const m2m  = auxTabSignature(par, key);
                    let array2 = this.tableContent[m2m];
                    if (array2 == null) array2 = [];
                    const newObj: AnyRecord = {};
                    newObj[this.refIdName(par)] = parentId?.value;
                    let id = getId(record);
                    if (id == null) {
                        record['id'] = this.idSeq++;
                        id = getId(record);
                    }
                    newObj[this.refIdName(key)] = id!.value;
                    array2.push(newObj);
                    this.tableContent[m2m] = array2;
                }
            }
            this.tableContent[key] = array;
        } else if (array == null) {
            this.tableContent[key] = [];
        }
    }

    duplicatesAndParents(attr: string, value: unknown): void {
        const key = '"' + attr + '":' + JSON.stringify(value);
        let tmp = this.objCounts[key] ?? 0;

        let isComposite = false;
        for (const property in (value as AnyRecord)) {
            const val = (value as AnyRecord)[property];
            if (val != null && typeof val === 'object') {
                let k = attr;
                if (isNaN(property as unknown as number))
                    k = property + signature(val);
                else if (!Array.isArray(value))
                    continue;
                if (k !== attr)
                    this.child2parent[k] = attr;
                this.duplicatesAndParents(k, val);
                isComposite = true;
            }
        }

        const hasPrimAttr = hasPrimitiveAttr(value);
        if (hasPrimAttr && !this.tableSignatures.includes(attr))
            this.tableSignatures.push(attr);
        if (!isComposite)
            this.objCounts[key] = tmp + 1;
        if (1 < this.objCounts[key] && !this.notNormalized.includes(attr))
            this.notNormalized.push(attr);
    }

    parent(table: string): string | null {
        const ret = this.child2parent[table];
        if (ret != null && !this.tableSignatures.includes(ret))
            return this.parent(ret);
        return ret ?? null;
    }

    tableName(tableSignature: string): string {
        const ip = tableSignature.indexOf('(');
        if (ip < 0) return tableSignature;
        const table = tableSignature.substring(0, ip);
        let cnt = 0;
        let pos = -1;
        for (const property in this.tableSignatures) {
            const cmp      = this.tableSignatures[property];
            const cmpTable = cmp.substring(0, cmp.indexOf('('));
            if (cmpTable === table)  cnt++;
            if (cmp === tableSignature) pos = cnt;
        }
        if (cnt < 2) return table;
        return table + pos;
    }

    refIdName(tableSignature: string): string {
        return (singular(this.tableName(tableSignature)) ?? this.tableName(tableSignature)) + '_id';
    }
}

// ── Translate ──────────────────────────────────────────────────────────────────

function translate(input: string, name?: string): string {
    const obj = JSON.parse(input);

    const sugg = suggestName(obj);
    if (sugg != null) name = sugg;
    if (name == null) name = 'root_tbl';

    const tc = new TableContent();
    tc.duplicatesAndParents(name + signature(obj), obj);
    tc.flatten(name + signature(obj), obj);

    let output = tc.output(name + signature(obj), obj, 0);

    output += '\n\n#settings = { genpk: false, drop: true, pk: identityDataType, semantics: char }';

    output += '\n\n#flattened = \n';
    const tableContent: Record<string, AnyRecord[]> = {};
    for (const tabSig in tc.tableContent)
        tableContent[tc.tableName(tabSig)] = tc.tableContent[tabSig];
    output += JSON.stringify(tableContent, null, 3);
    output += '\n';

    const version = typeof __PACKAGE_VERSION__ === 'undefined' ? 'development' : __PACKAGE_VERSION__;
    output += '\n\n-- Generated by json2qsql.js ' + version + ' ' + new Date().toLocaleString() + '\n\n';

    output += '#document = \n';
    output += JSON.stringify(obj, null, 3);
    output += '\n';

    return output;
}

export default translate;
