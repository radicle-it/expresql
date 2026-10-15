import { tab } from '../../../compiler/node.js';
import type { DdlContext, IDdlNode } from '../../../compiler/types.js';
import { OracleTableApiAnalyzer } from '../table-model.js';

/**
 * 2.2.0 — /import and /keyview (ocean-code 00-docs/38, phase I2): the importer of a table, generated with its API.
 *
 *   person /api service+hks /import upsert
 *     code         vc30 /nn /unique                      -- the business key (a /unique column, or a table /unique a, b)
 *     name         vc200 /nn {label_it 'Nome'}
 *     currency_id  num /fk ref_currency {import 'code'}  -- in the file: currency_code, resolved through ref_currency_key_vw
 *     note         vc4000 {import 'no'}                  -- not importable
 *     doc_no       vc30 /nn /unique {import 'auto'}      -- required, but the service fills it when the file has none
 *
 * generates, after the API of every table:
 *   <t>_key_vw      id + the business key flattened (a key column that is a foreign key becomes the key of the table it
 *                   points to, with its name as prefix), over the _rls views: the port that resolves a code
 *   <t>_imp         the importer (service level): describe (the fields as json), load (the loop of imp_load_svc, one
 *                   savepoint per row), register_target / unregister_target (imp_registry_uc)
 *   <t>_imp_app     the interface: check_job (the dry run), load, register_target, unregister_target
 * The importer converts with imp_convert_svc, resolves the foreign keys by their business key, finds the row by the
 * table's business key, decides INSERT / UPSERT / UPDATE, changes only the mapped fields and writes through <t>_svc
 * (hooks, permissions, RLS). It calls the imp_ module of ocean-code (imp_load_svc, imp_convert_svc, imp_registry_uc).
 * /keyview alone generates the key view of a table other modules point to.
 * A declaration the importer cannot honour is an error of generation (thrown), never a wrong package.
 */

type FieldType = 'TEXT' | 'INTEGER' | 'DECIMAL' | 'DAY' | 'INSTANT' | 'FLAG';

/** one column of a key view: its name and its type */
interface KeyColumn {
    name: string;
    type: FieldType;
}

/** a field of the file */
interface ImportField {
    name: string;              // the field name in the file (lower case)
    label: string;
    labelIt: string | null;
    type: FieldType;
    maxLength: number | null;
    required: boolean;
    key: boolean;
    lookup: string | null;
    allowed: string[];
    column: string;            // the column of the table it fills
}

/** a plain column the importer fills */
interface PlainColumn {
    column: string;
    field: ImportField;
    sqlType: string;
    hasDefault: boolean;
}

/** a foreign key the importer resolves */
interface ForeignColumn {
    column: string;
    keyView: string;           // <ref>_key_vw
    fields: ImportField[];     // one per column of the key view, in its order
    keyColumns: KeyColumn[];
    required: boolean;
}

interface ImportModel {
    table: string;
    pk: string;
    service: string;
    importer: string;
    app: string;
    target: string;
    module: string;
    resource: string;
    label: string;
    labelIt: string | null;
    modes: string[];
    keyColumns: string[];      // the table's own business key (raw columns)
    keyFields: string[];       // the fields of the file that carry it
    plain: PlainColumn[];
    foreign: ForeignColumn[];
    hasVersion: boolean;
    clobColumns: Set<string>;
}

function humanize(name: string): string {
    const s = name.replace(/_id$/i, '').replace(/_/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function sqlString(s: string): string {
    return "'" + s.replace(/'/g, "''") + "'";
}

interface SemanticLike {
    base: string;
    varcharLen?: number;
    numericSpec?: string;
    needsBoolCheck?: boolean;
}

/** the semantic type of a column (DdlNode._inferTypeFull: base, varchar length, number precision) */
function semanticOf(col: IDdlNode): SemanticLike {
    const full = (col as unknown as { _inferTypeFull?: () => SemanticLike })._inferTypeFull;
    if (typeof full === 'function') return full.call(col);
    return { base: col.inferType() };
}

function fieldTypeOf(sem: SemanticLike, allowed: string[]): { type: FieldType | null; maxLength: number | null } {
    const base = sem.base.toLowerCase();
    if (base === 'varchar' || base === 'varchar2' || base === 'char') {
        const upper = allowed.map(a => a.toUpperCase()).sort().join(',');
        if (upper === 'N,Y' || sem.needsBoolCheck === true) return { type: 'FLAG', maxLength: null };
        return { type: 'TEXT', maxLength: sem.varcharLen ?? null };
    }
    if (base === 'clob') return { type: 'TEXT', maxLength: null };
    if (base === 'integer') return { type: 'INTEGER', maxLength: null };
    if (base === 'number') {
        const spec = (sem.numericSpec ?? '').replace(/\s/g, '');
        return { type: /^\(\d+(,0)?\)$/.test(spec) ? 'INTEGER' : 'DECIMAL', maxLength: null };
    }
    if (base === 'date') return { type: 'DAY', maxLength: null };
    if (base === 'timestamp' || base === 'tswtz' || base === 'tswltz') return { type: 'INSTANT', maxLength: null };
    return { type: null, maxLength: null };   // blob, json, boolean, vector: not imported
}

function allowedValues(col: IDdlNode): string[] {
    if (!col.isOption('check')) return [];
    const values = (col as unknown as { listValues(k: string): (string | number | null)[] }).listValues('check');
    return values
        .filter((v): v is string | number => v !== null)
        .map(v => String(v).replace(/^'(.*)'$/, '$1'));
}

/** the PL/SQL expression converting the text of a field to the column's type */
function conversion(f: ImportField, text: string): string {
    const name = sqlString(f.name);
    if (f.allowed.length > 0 && f.type === 'TEXT')
        return `imp_convert_svc.to_value(${text}, ${name}, ${sqlString(f.allowed.join(','))})`;
    switch (f.type) {
        case 'TEXT':    return `imp_convert_svc.to_text(${text}, ${name}${f.maxLength !== null ? ', ' + f.maxLength : ''})`;
        case 'INTEGER': return `imp_convert_svc.to_integer(${text}, ${name})`;
        case 'DECIMAL': return `imp_convert_svc.to_decimal(${text}, ${name})`;
        case 'DAY':     return `imp_convert_svc.to_day(${text}, ${name})`;
        case 'INSTANT': return `imp_convert_svc.to_instant(${text}, ${name})`;
        case 'FLAG':    return `imp_convert_svc.to_flag(${text}, ${name})`;
    }
}

export class OracleImportRenderer {
    private models = new WeakMap<IDdlNode, ImportModel>();
    private keyCache = new WeakMap<IDdlNode, KeyColumn[]>();

    constructor(
        private ctx: DdlContext,
        private analyzer: OracleTableApiAnalyzer,
    ) {}

    private fullName(node: IDdlNode): string {
        return (this.ctx.objPrefix() + node.parseName()).toLowerCase();
    }

    private moduleCode(): string {
        return this.ctx.objPrefix().replace(/_$/, '').replace(/^.*\./, '').toUpperCase();
    }

    private columnNode(node: IDdlNode, name: string): IDdlNode | null {
        return node.children.find(c => c.children.length === 0 && c.parseName().toLowerCase() === name) ?? null;
    }

    /** the referenced node of a foreign key when the table is in this ESQL, else null */
    private internalRef(node: IDdlNode, fk: string): IDdlNode | null {
        const ref = (node.fks ?? {})[fk];
        if (ref === undefined) return null;
        const found = this.ctx.find(ref) as IDdlNode | null;
        return found !== null && found.inferType() === 'table' ? found : null;
    }

    private refName(node: IDdlNode, fk: string): string {
        const internal = this.internalRef(node, fk);
        if (internal !== null) return this.fullName(internal);
        return String((node.fks ?? {})[fk]).toLowerCase();
    }

    /** the business key of a table: a table /unique a, b; or its /unique column ({import_key 'y'} chooses among more) */
    businessKey(node: IDdlNode): string[] {
        const raw = node.getOptionValue('unique') ?? node.getOptionValue('uk');
        const table = raw === null ? '' : String(raw);
        if (table.trim() !== '' && node.children.length > 0) {
            return table.split(',').map((s: string) => s.trim().toLowerCase()).filter((s: string) => s !== '');
        }
        const unique = node.children.filter(c => c.children.length === 0 && (c.isOption('unique') || c.isOption('uk')));
        if (unique.length === 0) return [];
        const chosen = unique.find(c => /^y/i.test(c.getAnnotationValue('import_key') ?? '')) ?? unique[0];
        return [chosen.parseName().toLowerCase()];
    }

    /** the columns of <t>_key_vw: a key column, or the key of the table a key foreign key points to, prefixed */
    keyViewColumns(node: IDdlNode, path: IDdlNode[] = []): KeyColumn[] {
        const cached = this.keyCache.get(node);
        if (cached !== undefined) return cached;
        if (path.includes(node))
            throw new Error(`/import: the business key of ${this.fullName(node)} points back to itself`);
        const key = this.businessKey(node);
        if (key.length === 0)
            throw new Error(`/import: ${this.fullName(node)} has no business key (a /unique column or a table /unique a, b)`);
        const out: KeyColumn[] = [];
        for (const k of key) {
            if (Object.prototype.hasOwnProperty.call(node.fks ?? {}, k)) {
                const base = k.replace(/_id$/, '');
                for (const c of this.foreignKeyColumns(node, k, [...path, node]))
                    out.push({ name: `${base}_${c.name}`, type: c.type });
            } else {
                const col = this.columnNode(node, k);
                if (col === null) throw new Error(`/import: ${this.fullName(node)}: the key column ${k} does not exist`);
                const t = fieldTypeOf(semanticOf(col), allowedValues(col)).type;
                out.push({ name: k, type: t === null ? 'TEXT' : (t === 'FLAG' ? 'TEXT' : t) });
            }
        }
        this.keyCache.set(node, out);
        return out;
    }

    /** the key columns of the table a foreign key points to: from its ESQL, or from {import 'col, col'} (text) */
    private foreignKeyColumns(node: IDdlNode, fk: string, path: IDdlNode[] = []): KeyColumn[] {
        const internal = this.internalRef(node, fk);
        if (internal !== null) return this.keyViewColumns(internal, path);
        const col = this.columnNode(node, fk);
        const ann = col?.getAnnotationValue('import') ?? null;
        if (ann === null || ann.trim() === '' || ann.trim().toLowerCase() === 'no')
            throw new Error(`/import: ${this.fullName(node)}.${fk} points to ${this.refName(node, fk)} of another model: `
                + `name the columns of its key view, {import 'code'}, or leave it out with {import 'no'}`);
        return ann.split(',').map(s => ({ name: s.trim().toLowerCase(), type: 'TEXT' as FieldType })).filter(c => c.name !== '');
    }

    isImport(node: IDdlNode): boolean {
        return node.inferType() === 'table' && node.children.length > 0 && node.isOption('import');
    }

    /** the tables whose key view this model needs: every /import and /keyview table and the tables their keys reach */
    keyViewTables(descendants: IDdlNode[]): IDdlNode[] {
        const out: IDdlNode[] = [];
        const visit = (node: IDdlNode) => {
            if (out.includes(node)) return;
            for (const k of this.businessKey(node)) {
                const ref = this.internalRef(node, k);
                if (ref !== null) visit(ref);
            }
            out.push(node);
        };
        for (const node of descendants) {
            if (node.inferType() !== 'table' || node.children.length === 0) continue;
            if (this.isImport(node) || node.isOption('keyview')) {
                visit(node);
                if (this.isImport(node)) {
                    for (const fk of Object.keys(node.fks ?? {})) {
                        const ref = this.internalRef(node, fk);
                        const col = this.columnNode(node, fk);
                        if (ref !== null && (col?.getAnnotationValue('import') ?? '').toLowerCase() !== 'no') visit(ref);
                    }
                }
            }
        }
        return out;
    }

    generateKeyView(node: IDdlNode): string {
        const tbl = this.fullName(node);
        const pk = (node.getPkName() ?? 'id').toLowerCase();
        const key = this.businessKey(node);
        if (key.length === 0)
            throw new Error(`/import: ${tbl} has no business key (a /unique column or a table /unique a, b)`);
        const cols: string[] = [`t.${pk} id`];
        const joins: string[] = [];
        let n = 0;
        for (const k of key) {
            if (Object.prototype.hasOwnProperty.call(node.fks ?? {}, k)) {
                const alias = `k${++n}`;
                const base = k.replace(/_id$/, '');
                const col = this.columnNode(node, k);
                const outer = col !== null && col.isOption('nn') ? 'join' : 'left join';
                joins.push(`${outer} ${this.refName(node, k)}_key_vw ${alias} on ${alias}.id = t.${k}`);
                for (const c of this.foreignKeyColumns(node, k)) cols.push(`${alias}.${c.name} ${base}_${c.name}`);
            } else {
                cols.push(`t.${k}`);
            }
        }
        let r = `-- the business key of ${tbl}, flattened: the port that resolves a code (generated, /import)\n`;
        r += `create or replace view ${tbl}_key_vw as\n`;
        r += `select ${cols.join(', ')}\n`;
        r += `from   ${tbl}_rls t`;
        for (const j of joins) r += `\n${j}`;
        r += ';\n/\n';
        return r;
    }

    private model(node: IDdlNode): ImportModel {
        const cached = this.models.get(node);
        if (cached !== undefined) return cached;
        const api = this.analyzer.analyze(node);
        const tbl = api.names.table;
        if (!api.capabilities.hasSvc)
            throw new Error(`/import: ${tbl} has no service (an importer writes through <table>_svc): use the tier service+hks or full+hks`);
        if (api.features.versioned)
            throw new Error(`/import: ${tbl} is /versioned: a new version is a change_rec, write its importer by hand`);
        if (api.aggregateMaster !== null)
            throw new Error(`/import: ${tbl} is a detail of the aggregate ${api.aggregateMaster.masterTable}: write its importer by hand (doc 38 §9.5)`);
        const raw = String(node.getOptionValue('import') ?? '').trim().toLowerCase();
        let modes: string[];
        switch (raw) {
            case '': case 'insert': modes = ['INSERT']; break;
            case 'upsert':          modes = ['INSERT', 'UPSERT', 'UPDATE']; break;
            case 'update':          modes = ['UPDATE']; break;
            default: throw new Error(`/import ${raw}: the mode is insert, upsert or update (${tbl})`);
        }
        if (api.features.immutable && modes.some(m => m !== 'INSERT'))
            throw new Error(`/import: ${tbl} is /immutable: only /import insert`);
        const keyColumns = this.businessKey(node);
        if (modes.some(m => m !== 'INSERT') && keyColumns.length === 0)
            throw new Error(`/import ${raw}: ${tbl} has no business key to find a row (a /unique column or a table /unique a, b)`);

        const clobColumns = new Set<string>();
        const plain: PlainColumn[] = [];
        for (const col of api.columns.service) {
            const name = col.parseName().toLowerCase();
            if (name === api.names.pk) continue;
            const ann = (col.getAnnotationValue('import') ?? '').trim().toLowerCase();
            if (ann === 'no') continue;
            const sem = semanticOf(col);
            const sqlType = sem.base;
            if (sem.base.toLowerCase() === 'clob') clobColumns.add(name);
            const allowed = allowedValues(col);
            const { type, maxLength } = fieldTypeOf(sem, allowed);
            if (type === null) continue;
            const hasDefault = col.getDefaultValue() !== null;
            plain.push({
                column: name,
                sqlType,
                hasDefault,
                field: {
                    name,
                    label: col.getAnnotationValue('label') ?? humanize(name),
                    labelIt: col.getAnnotationValue('label_it'),
                    type,
                    maxLength,
                    required: col.isOption('nn') && !hasDefault && ann !== 'auto',   // {import 'auto'}: the service fills it
                    key: keyColumns.includes(name),
                    lookup: null,
                    allowed: type === 'FLAG' ? [] : allowed,
                    column: name,
                },
            });
        }
        const foreign: ForeignColumn[] = [];
        for (const fk of api.columns.foreignKeys.map(f => f.toLowerCase())) {
            const col = this.columnNode(node, fk);
            const ann = (col?.getAnnotationValue('import') ?? '').trim().toLowerCase();
            const required = col !== null ? col.isOption('nn') && col.getDefaultValue() === null : true;
            if (ann === 'no') {
                if (required) throw new Error(`/import: ${tbl}.${fk} is required: it cannot be left out with {import 'no'}`);
                continue;
            }
            const keyCols = this.foreignKeyColumns(node, fk);
            const base = fk.replace(/_id$/, '');
            const keyView = `${this.refName(node, fk)}_key_vw`;
            const lookup = `${keyView}(${keyCols.map(c => c.name).join(', ')})`;
            const label = col?.getAnnotationValue('label') ?? humanize(fk);
            const labelIt = col?.getAnnotationValue('label_it') ?? null;
            foreign.push({
                column: fk,
                keyView,
                keyColumns: keyCols,
                required,
                fields: keyCols.map(c => ({
                    name: `${base}_${c.name}`,
                    label: keyCols.length === 1 ? label : `${label} - ${humanize(c.name)}`,
                    labelIt: labelIt === null ? null : (keyCols.length === 1 ? labelIt : `${labelIt} - ${humanize(c.name)}`),
                    type: c.type,
                    maxLength: null,
                    required,
                    key: keyColumns.includes(fk),
                    lookup,
                    allowed: [],
                    column: fk,
                })),
            });
        }
        const keyFields: string[] = [];
        for (const k of keyColumns) {
            const f = foreign.find(x => x.column === k);
            if (f !== undefined) keyFields.push(...f.fields.map(x => x.name));
            else if (plain.some(p => p.column === k)) keyFields.push(k);
            else throw new Error(`/import: ${tbl}: the key column ${k} is not importable`);
        }
        const tableNode = node;
        const model: ImportModel = {
            table: tbl,
            pk: api.names.pk,
            service: api.names.service,
            importer: tbl + '_imp',
            app: tbl + '_imp_app',
            target: tbl.toUpperCase(),
            module: this.moduleCode(),
            resource: (tableNode.getAnnotationValue('resource') ?? tbl).toUpperCase(),
            label: tableNode.getAnnotationValue('label') ?? humanize(node.parseName().toLowerCase()),
            labelIt: tableNode.getAnnotationValue('label_it'),
            modes,
            keyColumns,
            keyFields,
            plain,
            foreign,
            hasVersion: api.features.versionColumn,
            clobColumns,
        };
        this.models.set(node, model);
        return model;
    }

    private fields(m: ImportModel): ImportField[] {
        const out: ImportField[] = [];
        for (const p of m.plain) out.push(p.field);
        for (const f of m.foreign) out.push(...f.fields);
        return out;
    }

    private fieldJson(f: ImportField, order: number): string {
        const o: Record<string, unknown> = {
            field_name: f.name,
            label: f.label,
            data_type: f.type,
        };
        if (f.maxLength !== null) o.max_length = f.maxLength;
        o.required = f.required ? 'Y' : 'N';
        o.key = f.key ? 'Y' : 'N';
        if (f.lookup !== null) o.lookup = f.lookup;
        if (f.allowed.length > 0) o.allowed_values = f.allowed.join(',');
        o.display_order = order;
        if (f.labelIt !== null) o.labels = { it: f.labelIt };
        return JSON.stringify(o);
    }

    generateSpec(node: IDdlNode): string {
        const m = this.model(node);
        let r = `create or replace package ${m.importer} as\n`;
        r += `${tab}-- the importer of ${m.table} (generated, /import ${m.modes.join(', ').toLowerCase()}; ocean-code 00-docs/38): the rows of an\n`;
        r += `${tab}-- import of imp_ written through ${m.service}, one savepoint per row (imp_load_svc)\n\n`;
        r += `${tab}-- the fields of the file as json (imp_registry_uc.register_target, the template of the pages)\n`;
        r += `${tab}function describe return clob;\n\n`;
        r += `${tab}-- loads (or with p_dry_run tries and rolls back) the rows not written yet of import p_job_id; p_commit_rows: a\n`;
        r += `${tab}-- commit every n rows (a job of the scheduler)\n`;
        r += `${tab}procedure load (p_job_id in number, p_dry_run in boolean default false, p_commit_rows in pls_integer default null);\n\n`;
        r += `${tab}-- 2.3.0: the load in a job of the scheduler (IMP_LOAD_<id>, dropped when done): queued by imp_load_svc, run as\n`;
        r += `${tab}-- the owner of the import by run_job\n`;
        r += `${tab}procedure load_async (p_job_id in number);\n`;
        r += `${tab}procedure run_job (p_job_id in number);\n\n`;
        r += `${tab}-- what this table offers to import, in imp_target (the seed of the module)\n`;
        r += `${tab}procedure register_target;\n`;
        r += `${tab}procedure unregister_target;\n\n`;
        r += `end ${m.importer};\n/\n`;
        return r;
    }

    generateBody(node: IDdlNode): string {
        const m = this.model(node);
        const t2 = tab + tab;
        const t3 = t2 + tab;
        const t4 = t3 + tab;
        let r = `create or replace package body ${m.importer} as\n\n`;
        r += `${tab}c_target constant varchar2(128) := ${sqlString(m.target)};\n\n`;

        // the foreign keys: resolved by the business key of the table they point to
        for (const f of m.foreign) {
            r += `${tab}-- ${f.column}: ${f.fields.map(x => x.name).join(' + ')} -> ${f.keyView}\n`;
            r += `${tab}function fk_${f.column} return number is\n`;
            f.fields.forEach((x, i) => {
                r += `${t2}l_${i + 1} varchar2(4000) := trim(imp_load_svc.value(${sqlString(x.name)}));\n`;
            });
            r += `${t2}l_id number;\n`;
            r += `${t2}l_n  number;\n`;
            r += `${tab}begin\n`;
            const all = f.fields.map((_, i) => `l_${i + 1} is null`).join(' and ');
            r += `${t2}if ${all} then\n${t3}return null;\n${t2}end if;\n`;
            if (f.fields.length > 1) {
                f.fields.forEach((x, i) => {
                    r += `${t2}if l_${i + 1} is null then\n`;
                    r += `${t3}raise_application_error(-20844, '[IMP_LOOKUP_PARTIAL] ${x.name}: a value is required with the other fields of ${f.column}');\n`;
                    r += `${t2}end if;\n`;
                });
            }
            const where = f.keyColumns.map((c, i) => {
                const fld = f.fields[i];
                const v = c.type === 'TEXT' ? `l_${i + 1}` : conversion({ ...fld, type: c.type }, `l_${i + 1}`);
                return `k.${c.name} = ${v}`;
            }).join(`\n${t2}and    `);
            r += `${t2}select min(k.id), count(*) into l_id, l_n\n`;
            r += `${t2}from   ${f.keyView} k\n`;
            r += `${t2}where  ${where};\n`;
            const shown = f.fields.map((_, i) => `l_${i + 1}`).join(` || ' / ' || `);
            r += `${t2}if l_n = 0 then\n`;
            r += `${t3}raise_application_error(-20844, '[IMP_LOOKUP] ${f.fields[0].name}: "' || ${shown} || '" not found');\n`;
            r += `${t2}elsif l_n > 1 then\n`;
            r += `${t3}raise_application_error(-20844, '[IMP_LOOKUP_AMBIGUOUS] ${f.fields[0].name}: "' || ${shown} || '" names ' || l_n || ' rows');\n`;
            r += `${t2}end if;\n`;
            r += `${t2}return l_id;\n`;
            r += `${tab}end fk_${f.column};\n\n`;
        }

        // one row
        r += `${tab}function load_row (x_action out varchar2) return number is\n`;
        r += `${t2}l_new     ${m.service}.t_rec;\n`;
        r += `${t2}l_rec     ${m.service}.t_rec;\n`;
        r += `${t2}l_row     ${m.table}%rowtype;\n`;
        r += `${t2}l_id      ${m.table}.${m.pk}%type;\n`;
        r += `${t2}l_changed boolean := false;\n`;
        r += `${tab}begin\n`;
        r += `${t2}-- the values of the file (a field without a column stays null)\n`;
        for (const p of m.plain) {
            const f = p.field;
            const text = `imp_load_svc.value(${sqlString(f.name)})`;
            r += `${t2}if imp_load_svc.mapped(${sqlString(f.name)}) then\n`;
            r += `${t3}l_new.${p.column} := ${conversion(f, f.required ? `imp_convert_svc.required(${text}, ${sqlString(f.name)})` : text)};\n`;
            r += `${t2}end if;\n`;
        }
        for (const f of m.foreign) {
            const cond = f.fields.map(x => `imp_load_svc.mapped(${sqlString(x.name)})`).join(' or ');
            r += `${t2}if ${cond} then\n`;
            r += `${t3}l_new.${f.column} := fk_${f.column};\n`;
            if (f.required) {
                r += `${t3}if l_new.${f.column} is null then\n`;
                r += `${t4}raise_application_error(-20844, '[IMP_REQUIRED] ${f.fields[0].name}: a value is required');\n`;
                r += `${t3}end if;\n`;
            }
            r += `${t2}end if;\n`;
        }

        // the row with this business key
        if (m.keyColumns.length > 0) {
            const notNull = m.keyColumns.map(k => `l_new.${k} is not null`).join(' and ');
            const where = m.keyColumns.map(k => `t.${k} = l_new.${k}`).join(' and ');
            r += `${t2}-- the row with this business key (${m.keyColumns.join(', ')}), among the ones this user sees\n`;
            r += `${t2}if ${notNull} then\n`;
            r += `${t3}select max(t.${m.pk}) into l_id from ${m.table}_rls t where ${where};\n`;
            // 2.3.1 -- an empty key is refused only to UPDATE: with UPSERT the row is new (an {import 'auto'} key from the
            // service, a required one refused by the insert)
            r += `${t2}elsif imp_load_svc.mode_code = 'UPDATE' then\n`;
            r += `${t3}raise_application_error(-20844, '[IMP_REQUIRED] ${m.keyFields[0]}: the business key is required to update');\n`;
            r += `${t2}end if;\n`;
            const shown = m.keyFields.map(k => `imp_load_svc.value(${sqlString(k)})`).join(` || ' / ' || `);
            r += `${t2}if l_id is null and imp_load_svc.mode_code = 'UPDATE' then\n`;
            r += `${t3}raise_application_error(-20844, '[IMP_NOT_FOUND] ${m.keyFields[0]}: "' || ${shown} || '" does not exist');\n`;
            r += `${t2}elsif l_id is not null and imp_load_svc.mode_code = 'INSERT' then\n`;
            r += `${t3}raise_application_error(-20844, '[IMP_EXISTS] ${m.keyFields[0]}: "' || ${shown} || '" exists already');\n`;
            r += `${t2}end if;\n`;
        }

        // insert
        r += `${t2}if l_id is null then\n`;
        for (const p of m.plain) {
            if (!p.field.required) continue;
            r += `${t3}if l_new.${p.column} is null then\n`;
            r += `${t4}raise_application_error(-20844, '[IMP_REQUIRED] ${p.field.name}: a value is required');\n`;
            r += `${t3}end if;\n`;
        }
        for (const f of m.foreign) {
            if (!f.required) continue;
            r += `${t3}if l_new.${f.column} is null then\n`;
            r += `${t4}raise_application_error(-20844, '[IMP_REQUIRED] ${f.fields[0].name}: a value is required');\n`;
            r += `${t3}end if;\n`;
        }
        r += `${t3}${m.service}.create_rec(l_new, l_id);\n`;
        r += `${t3}x_action := 'INSERTED';\n`;
        r += `${t3}return l_id;\n`;
        r += `${t2}end if;\n`;

        // update: the row as it is, the mapped fields from the file
        const params = this.analyzer.analyze(node).columns.parameters.map(p => p.name);
        r += `${t2}-- an update: the row as it is, then only the fields of the file\n`;
        r += `${t2}l_row := ${m.service}.get(l_id);\n`;
        for (const c of params) r += `${t2}l_rec.${c} := l_row.${c};\n`;
        // 2.2.1 — changed, never "not same": with a null on one side "not (a = b or …)" is null, and an empty field
        // given a value by the file was UNCHANGED (found by req_request.amount)
        const changed = (c: string) => m.clobColumns.has(c)
            ? `(l_rec.${c} is null and l_new.${c} is not null or l_rec.${c} is not null and l_new.${c} is null or dbms_lob.compare(l_rec.${c}, l_new.${c}) != 0)`
            : `(l_rec.${c} != l_new.${c} or l_rec.${c} is null and l_new.${c} is not null or l_rec.${c} is not null and l_new.${c} is null)`;
        for (const p of m.plain) {
            if (m.keyColumns.includes(p.column)) continue;
            r += `${t2}if imp_load_svc.mapped(${sqlString(p.field.name)}) and ${changed(p.column)} then\n`;
            r += `${t3}l_rec.${p.column} := l_new.${p.column};\n${t3}l_changed := true;\n`;
            r += `${t2}end if;\n`;
        }
        for (const f of m.foreign) {
            if (m.keyColumns.includes(f.column)) continue;
            const cond = f.fields.map(x => `imp_load_svc.mapped(${sqlString(x.name)})`).join(' or ');
            r += `${t2}if (${cond}) and ${changed(f.column)} then\n`;
            r += `${t3}l_rec.${f.column} := l_new.${f.column};\n${t3}l_changed := true;\n`;
            r += `${t2}end if;\n`;
        }
        r += `${t2}if l_changed then\n`;
        r += `${t3}${m.service}.update_rec(l_id, l_rec${m.hasVersion ? ', l_row.row_version' : ''});\n`;
        r += `${t3}x_action := 'UPDATED';\n`;
        r += `${t2}else\n`;
        r += `${t3}x_action := 'UNCHANGED';\n`;
        r += `${t2}end if;\n`;
        r += `${t2}return l_id;\n`;
        r += `${tab}end load_row;\n\n`;

        // the loop
        r += `${tab}procedure load (p_job_id in number, p_dry_run in boolean default false, p_commit_rows in pls_integer default null) is\n`;
        r += `${t2}l_action varchar2(20);\n`;
        r += `${t2}l_id     number;\n`;
        r += `${tab}begin\n`;
        r += `${t2}imp_load_svc.begin_load(p_job_id, c_target, p_dry_run, p_commit_rows);\n`;
        r += `${t2}while imp_load_svc.next_row loop\n`;
        r += `${t3}begin\n`;
        r += `${t4}l_id := load_row(l_action);\n`;
        r += `${t4}imp_load_svc.row_done(l_action, l_id);\n`;
        r += `${t3}exception when others then\n`;
        r += `${t4}imp_load_svc.row_failed;\n`;
        r += `${t3}end;\n`;
        r += `${t3}exit when imp_load_svc.stop_now;\n`;
        r += `${t2}end loop;\n`;
        r += `${t2}imp_load_svc.end_load;\n`;
        r += `${tab}end load;\n\n`;

        // 2.3.0 -- a load too long for the page: a one-off job of the scheduler, created by the module that owns the
        // importer (no name travels as data: the action is this package)
        const jobAction = `${m.importer.toUpperCase()}.RUN_JOB`;
        r += `${tab}procedure load_async (p_job_id in number) is\n`;
        r += `${t2}l_name varchar2(128) := 'IMP_LOAD_' || p_job_id;\n`;
        r += `${tab}begin\n`;
        r += `${t2}imp_load_svc.queue(p_job_id, c_target);\n`;
        r += `${t2}dbms_scheduler.create_job(job_name => l_name, job_type => 'STORED_PROCEDURE', job_action => '${jobAction}',\n`;
        r += `${t2}                          number_of_arguments => 1, auto_drop => true, enabled => false,\n`;
        r += `${t2}                          comments => 'A load of imp_ (00-docs/38 §13): import ' || p_job_id || ', dropped when done');\n`;
        r += `${t2}dbms_scheduler.set_job_argument_value(job_name => l_name, argument_position => 1, argument_value => to_char(p_job_id));\n`;
        r += `${t2}dbms_scheduler.enable(l_name);\n`;
        r += `${tab}end load_async;\n\n`;
        r += `${tab}procedure run_job (p_job_id in number) is\n`;
        r += `${tab}begin\n`;
        r += `${t2}imp_load_svc.begin_job(p_job_id);\n`;
        r += `${t2}load(p_job_id, p_commit_rows => imp_load_svc.commit_rows);\n`;
        r += `${t2}imp_load_svc.end_job;\n`;
        r += `${tab}exception when others then\n`;
        r += `${t2}rollback;\n`;
        r += `${t2}imp_load_svc.fail_job(p_job_id, dbms_utility.format_error_stack);\n`;
        r += `${t2}imp_load_svc.end_job;\n`;
        r += `${t2}raise;\n`;
        r += `${tab}end run_job;\n\n`;

        // describe and the registration
        const fields = this.fields(m);
        r += `${tab}function describe return clob is\n`;
        r += `${t2}l_json clob := '[';\n`;
        r += `${tab}begin\n`;
        fields.forEach((f, i) => {
            r += `${t2}l_json := l_json || ${sqlString(this.fieldJson(f, (i + 1) * 10) + (i < fields.length - 1 ? ',' : ''))};\n`;
        });
        r += `${t2}return l_json || ']';\n`;
        r += `${tab}end describe;\n\n`;

        r += `${tab}procedure register_target is\n`;
        r += `${tab}begin\n`;
        r += `${t2}imp_registry_uc.register_target(\n`;
        r += `${t3}p_code          => c_target,\n`;
        r += `${t3}p_module_code   => ${sqlString(m.module)},\n`;
        r += `${t3}p_name          => ${sqlString(m.label)},\n`;
        r += `${t3}p_resource_code => ${sqlString(m.resource)},\n`;
        r += `${t3}p_key_fields    => ${m.keyFields.length > 0 ? sqlString(m.keyFields.join(',')) : 'null'},\n`;
        r += `${t3}p_modes         => ${sqlString(m.modes.join(','))},\n`;
        r += `${t3}p_fields        => describe,\n`;
        r += `${t3}p_names         => ${m.labelIt !== null ? sqlString(JSON.stringify({ it: m.labelIt })) : 'null'});\n`;
        r += `${tab}end register_target;\n\n`;

        r += `${tab}procedure unregister_target is\n`;
        r += `${t2}l_n number;\n`;
        r += `${tab}begin\n`;
        r += `${t2}l_n := imp_registry_uc.unregister_target(c_target);\n`;
        r += `${tab}end unregister_target;\n\n`;

        r += `end ${m.importer};\n/\n`;
        return r;
    }

    generateAppSpec(node: IDdlNode): string {
        const m = this.model(node);
        let r = `create or replace package ${m.app} as\n`;
        r += `${tab}-- the interface of the importer of ${m.table} (generated, /import): the pages, a test, REST at the end\n`;
        r += `${tab}procedure check_job (p_job_id in number);     -- the dry run: every rule, nothing written\n`;
        r += `${tab}procedure load      (p_job_id in number);     -- in a job of the scheduler above IMP_SYNC_MAX_ROWS rows\n`;
        r += `${tab}procedure register_target;\n`;
        r += `${tab}procedure unregister_target;\n`;
        r += `end ${m.app};\n/\n`;
        return r;
    }

    generateAppBody(node: IDdlNode): string {
        const m = this.model(node);
        let r = `create or replace package body ${m.app} as\n\n`;
        r += `${tab}procedure check_job (p_job_id in number) is\n${tab}begin\n${tab}${tab}${m.importer}.load(p_job_id, p_dry_run => true);\n${tab}end check_job;\n\n`;
        r += `${tab}procedure load (p_job_id in number) is\n${tab}begin\n`;
        r += `${tab}${tab}if imp_load_svc.async_wanted(p_job_id) then\n${tab}${tab}${tab}${m.importer}.load_async(p_job_id);\n`;
        r += `${tab}${tab}else\n${tab}${tab}${tab}${m.importer}.load(p_job_id);\n${tab}${tab}end if;\n${tab}end load;\n\n`;
        r += `${tab}procedure register_target is\n${tab}begin\n${tab}${tab}${m.importer}.register_target;\n${tab}end register_target;\n\n`;
        r += `${tab}procedure unregister_target is\n${tab}begin\n${tab}${tab}${m.importer}.unregister_target;\n${tab}end unregister_target;\n\n`;
        r += `end ${m.app};\n/\n`;
        return r;
    }

    /** the key views, then for every /import table its importer and its interface */
    generateAll(descendants: IDdlNode[]): string {
        for (const node of descendants) if (this.isImport(node)) this.model(node);   // the declaration checked first
        const keyTables = this.keyViewTables(descendants);
        if (keyTables.length === 0) return '';
        let r = '';
        for (const node of keyTables) r += this.generateKeyView(node) + '\n';
        for (const node of descendants) {
            if (!this.isImport(node)) continue;
            r += this.generateSpec(node) + '\n' + this.generateBody(node) + '\n';
            r += this.generateAppSpec(node) + '\n' + this.generateAppBody(node) + '\n';
        }
        return r;
    }
}
