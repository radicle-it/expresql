import { fromDbmlType } from './dbml-type-reverse.js';

// ── Minimal types from @dbml/core (no type dependency at runtime) ─────────────

interface DbmlField {
    name:       string;
    type:       { type_name: string; args?: string | null };
    pk?:        boolean;
    unique?:    boolean;
    not_null?:  boolean;
    increment?: boolean;
    dbdefault?: { value: string; type: 'string' | 'expression' | 'number' | 'boolean' } | null;
    note?:      string | null;
    endpoints?: DbmlEndpoint[];
    metadata?:  Record<string, string>;
}

interface DbmlEndpoint {
    tableName:  string;
    fieldNames: string[];
    relation:   string;   // '*' = many (FK here), '1' = one
}

interface DbmlIndex {
    columns: Array<{ value: string; type: string }>;
    pk?:     boolean;
    unique?: boolean;
    name?:   string | null;
}

interface DbmlTable {
    name:     string;
    note?:    string | null;
    fields:   DbmlField[];
    indexes:  DbmlIndex[];
    metadata: Record<string, string>;
}

interface DbmlEnum {
    name:   string;
    values: Array<{ name: string }>;
}

interface DbmlRef {
    endpoints: [DbmlEndpoint, DbmlEndpoint];
    onDelete?: string | null;
}

interface DbmlTableGroup {
    name:   string;
    tables: string[];
}

interface DbmlSchema {
    name:        string;
    tables:      DbmlTable[];
    enums:       DbmlEnum[];
    refs:        DbmlRef[];
    tableGroups: DbmlTableGroup[];
}

interface DbmlDatabase {
    name?:         string;
    databaseType?: string;
    schemas:       DbmlSchema[];
}

// ── Well-known column name sets (for reverse expansion) ───────────────────────

const AUDIT_CREATED = new Set([
    'created', 'created_at', 'creation_date', 'ins_date', 'create_date', 'created_date',
]);
const AUDIT_CREATED_BY = new Set([
    'created_by', 'ins_user', 'created_user', 'create_user',
]);
const AUDIT_UPDATED = new Set([
    'updated', 'updated_at', 'last_update', 'upd_date', 'modify_date',
    'modified_at', 'update_date', 'last_modified',
]);
const AUDIT_UPDATED_BY = new Set([
    'updated_by', 'upd_user', 'updated_user', 'modified_by', 'update_user',
]);
const ROWVERSION_NAMES  = new Set(['row_version', 'version', 'opt_lock', 'lock_version', 'row_ver']);
const ROWKEY_NAMES      = new Set(['row_key', 'ords_key']);
const VERSIONED_FROM    = new Set(['valid_from', 'valid_start', 'date_from', 'eff_date', 'start_date']);
const VERSIONED_TO      = new Set(['valid_to', 'valid_end', 'date_to', 'end_date', 'exp_date']);
const VERSIONED_CURRENT = new Set(['is_current', 'current_flag', 'is_active']);

// ── Internal result types ─────────────────────────────────────────────────────

interface FkEdge {
    fromTable:  string;
    fromCol:    string;
    toTable:    string;
    toCol:      string;
    onDelete?:  string | null | undefined;
    mandatory:  boolean;
    isStandard: boolean;  // fromCol === `${toTable}_id`
}

interface HierarchyNode {
    table:       DbmlTable;
    children:    HierarchyNode[];
    fks:         FkEdge[];   // non-hierarchy FK → emitted as /fk
    parentFkCol: string;     // actual FK column that established the parent edge (to skip in emit)
}

interface CollapseResult {
    remainingFields: DbmlField[];
    directives:      string[];
    tenantDetected:  boolean;
}

// ── DBMLImporter ─────────────────────────────────────────────────────────────

export class DBMLImporter {
    private prefix: string;
    private schemaOpt: string | null;
    private enumMap: Map<string, string[]>;  // enumName → values
    private tenantGlobal = false;

    constructor(options: { schema?: string | null; prefix?: string } = {}) {
        this.prefix    = options.prefix ?? '';
        this.schemaOpt = options.schema ?? null;
        this.enumMap   = new Map();
    }

    // ── Public entrypoint ─────────────────────────────────────────────────────

    convert(db: DbmlDatabase): string {
        const lines: string[] = [];

        for (const schema of db.schemas) {
            // Populate enum map
            for (const en of schema.enums) {
                this.enumMap.set(en.name, en.values.map(v => v.name));
            }

            // Auto-detect prefix if not provided
            const prefix = this.prefix || this.detectPrefix(schema.tables) || '';
            this.prefix = prefix;

            // Build FK edges from Refs
            const fkEdges = this.buildFkEdges(schema);

            // Reconstruct hierarchy
            const hierarchy = this.buildHierarchy(schema.tables, fkEdges);

            // Emit settings block
            const settings = this.emitSettings(db, schema);
            if (settings) { lines.push(settings); lines.push(''); }

            // Emit table nodes
            for (const root of hierarchy) {
                lines.push(...this.emitNode(root, 0));
                lines.push('');
            }
        }

        return lines.join('\n').trimEnd();
    }

    // ── Settings block ────────────────────────────────────────────────────────

    private emitSettings(db: DbmlDatabase, schema: DbmlSchema): string {
        const parts: string[] = [];

        // database_type → note only (we always generate Oracle DDL)
        const dt = (db.databaseType ?? '').toLowerCase();
        if (dt.includes('23') || dt.includes('ai')) parts.push('db: "23ai"');

        // Schema
        const schName = this.schemaOpt ?? (schema.name !== 'public' ? schema.name : null);
        if (schName) parts.push(`schema: ${schName}`);

        // Prefix
        if (this.prefix) parts.push(`prefix: ${this.prefix}`);

        // PK mode: detect from tables
        const pkMode = this.detectPkMode(schema.tables);
        if (pkMode !== 'guid') parts.push(`pk: ${pkMode}`);

        // Tenant
        if (this.tenantGlobal) parts.push('tenantid: yes');

        // Round-trip: project-level esql_* from Metadata blocks (if present)
        // db doesn't have a .metadata field in @dbml/core — skipped

        if (!parts.length) return '';
        return `# settings = { ${parts.join(', ')} }`;
    }

    // ── PK mode detection ─────────────────────────────────────────────────────

    private detectPkMode(tables: DbmlTable[]): 'guid' | 'identity' | 'seq' {
        for (const table of tables) {
            const pk = table.fields.find(f => f.pk);
            if (!pk) continue;
            if (pk.increment)                                      return 'identity';
            if (/sys_guid/i.test(pk.dbdefault?.value ?? ''))      return 'guid';
            if (/NEXTVAL/i.test(pk.dbdefault?.value ?? ''))       return 'seq';
        }
        return 'guid';
    }

    // ── Prefix auto-detection ─────────────────────────────────────────────────

    private detectPrefix(tables: DbmlTable[]): string | null {
        if (tables.length < 2) return null;
        const names = tables.map(t => t.name);
        const parts = names[0].split('_');
        for (let i = parts.length - 1; i >= 1; i--) {
            const candidate = parts.slice(0, i).join('_');
            if (names.every(n => n.toLowerCase().startsWith(candidate.toLowerCase() + '_'))) {
                return candidate;
            }
        }
        return null;
    }

    // ── FK edge extraction from Refs ──────────────────────────────────────────

    private buildFkEdges(schema: DbmlSchema): FkEdge[] {
        const edges: FkEdge[] = [];

        for (const ref of schema.refs) {
            const [ep0, ep1] = ref.endpoints;

            // @dbml/core relation values: '1' = one side; '*' or '0..*' = many side (FK here).
            // Optional cardinality (?> or <?) produces '0..*' instead of '*'.
            let fromEp: DbmlEndpoint, toEp: DbmlEndpoint;

            if (isManyRelation(ep0.relation) && !isManyRelation(ep1.relation)) {
                fromEp = ep0; toEp = ep1;
            } else if (isManyRelation(ep1.relation) && !isManyRelation(ep0.relation)) {
                fromEp = ep1; toEp = ep0;
            } else {
                // Both many (N:M) or both one (1:1 with no clear FK side): skip N:M, use ep0→ep1 for 1:1
                if (isManyRelation(ep0.relation) && isManyRelation(ep1.relation)) continue;
                fromEp = ep0; toEp = ep1;
            }

            const fromCol = fromEp.fieldNames[0] ?? '';
            const toTable = toEp.tableName;
            const toCol   = toEp.fieldNames[0] ?? '';

            // Mandatory: check if the FK col is NOT NULL in the source table
            const srcTable = schema.tables.find(t => t.name === fromEp.tableName);
            const srcField = srcTable?.fields.find(f => f.name === fromCol);
            const mandatory = Boolean(srcField?.not_null);

            // Standard naming: the FK column is either `parentTable_id` or
            // `singularize(parentTable)_id` (ExpreSQL generates the latter).
            const isStandard = fromCol.toLowerCase() === `${toTable.toLowerCase()}_id`
                            || fromCol.toLowerCase() === `${singularize(toTable).toLowerCase()}_id`;

            edges.push({
                fromTable:  fromEp.tableName,
                fromCol,
                toTable,
                toCol,
                onDelete:   ref.onDelete,
                mandatory,
                isStandard,
            });
        }

        return edges;
    }

    // ── Hierarchy reconstruction ──────────────────────────────────────────────

    private buildHierarchy(tables: DbmlTable[], edges: FkEdge[]): HierarchyNode[] {
        // parentOf[childName] = { parent, fkCol } for standard FK edges only
        const parentOf = new Map<string, { parent: string; fkCol: string }>();

        for (const edge of edges) {
            if (!edge.isStandard) continue;
            if (!parentOf.has(edge.fromTable)) {
                parentOf.set(edge.fromTable, { parent: edge.toTable, fkCol: edge.fromCol });
            }
        }

        const rootTables = tables.filter(t => !parentOf.has(t.name));

        const buildNode = (table: DbmlTable): HierarchyNode => {
            const children = tables
                .filter(t => parentOf.get(t.name)?.parent === table.name)
                .map(buildNode);

            const fks = edges.filter(e =>
                e.fromTable === table.name &&
                !(e.isStandard && parentOf.get(table.name)?.parent === e.toTable)
            );

            const parentFkCol = parentOf.get(table.name)?.fkCol ?? '';
            return { table, children, fks, parentFkCol };
        };

        return rootTables.map(buildNode);
    }

    // ── Collapse well-known columns into ESQL directives ──────────────────────

    private collapseKnownColumns(
        fields:    DbmlField[],
        fkEdges:   FkEdge[],
        tableName: string,
    ): CollapseResult {
        const directives: string[]    = [];
        let   tenantDetected          = false;

        // Audit columns
        const hasCreated   = fields.some(f => AUDIT_CREATED.has(f.name.toLowerCase()));
        const hasCreatedBy = fields.some(f => AUDIT_CREATED_BY.has(f.name.toLowerCase()));
        const hasUpdated   = fields.some(f => AUDIT_UPDATED.has(f.name.toLowerCase()));
        const hasUpdatedBy = fields.some(f => AUDIT_UPDATED_BY.has(f.name.toLowerCase()));
        const auditScore   = [hasCreated, hasCreatedBy, hasUpdated, hasUpdatedBy].filter(Boolean).length;
        const auditActive  = auditScore >= 2;

        // /versioned (all 3 must be present)
        const hasFrom    = fields.some(f => VERSIONED_FROM.has(f.name.toLowerCase()));
        const hasTo      = fields.some(f => VERSIONED_TO.has(f.name.toLowerCase()));
        const hasCurrent = fields.some(f => VERSIONED_CURRENT.has(f.name.toLowerCase()));
        const versionedActive = hasFrom && hasTo && hasCurrent;

        // /rowversion
        const rowVersionActive = fields.some(f => ROWVERSION_NAMES.has(f.name.toLowerCase()));

        // /rowkey
        const rowKeyActive = fields.some(f => ROWKEY_NAMES.has(f.name.toLowerCase()));

        // tenant_id with FK → tenants table
        const hasTenantCol = fields.some(f => f.name.toLowerCase() === 'tenant_id');
        const hasTenantFk  = fkEdges.some(
            e => e.fromTable === tableName &&
                 e.fromCol.toLowerCase() === 'tenant_id' &&
                 e.toTable.toLowerCase().includes('tenant'),
        );
        tenantDetected = hasTenantCol && hasTenantFk;

        // Build set of names to remove
        const removeNames = new Set<string>();
        if (auditActive) {
            for (const s of [AUDIT_CREATED, AUDIT_CREATED_BY, AUDIT_UPDATED, AUDIT_UPDATED_BY]) {
                for (const n of s) removeNames.add(n);
            }
        }
        if (versionedActive) {
            for (const s of [VERSIONED_FROM, VERSIONED_TO, VERSIONED_CURRENT]) {
                for (const n of s) removeNames.add(n);
            }
        }
        if (rowVersionActive) for (const n of ROWVERSION_NAMES) removeNames.add(n);
        if (rowKeyActive)     for (const n of ROWKEY_NAMES)      removeNames.add(n);
        if (tenantDetected)   removeNames.add('tenant_id');

        const remainingFields = fields.filter(f => !removeNames.has(f.name.toLowerCase()));

        if (auditActive)      directives.push('/auditcols');
        if (rowVersionActive) directives.push('/rowversion');
        if (rowKeyActive)     directives.push('/rowkey');
        if (versionedActive)  directives.push('/versioned');

        return { remainingFields, directives, tenantDetected };
    }

    // ── Table node emission ───────────────────────────────────────────────────

    private emitNode(node: HierarchyNode, depth: number): string[] {
        const indent = '  '.repeat(depth);
        const lines: string[]  = [];
        const { table } = node;

        // Collapse well-known columns
        const { remainingFields, directives, tenantDetected } =
            this.collapseKnownColumns(table.fields, node.fks, table.name);

        if (tenantDetected) this.tenantGlobal = true;

        // Table name (strip prefix)
        const rawName = this.prefix
            ? table.name.replace(new RegExp(`^${escapeRegex(this.prefix)}_`, 'i'), '')
            : table.name;

        // Collect table-level directives (go on the header line in ESQL syntax)
        const headerDirectives = [
            ...directives,                                    // from reverse expansion
            ...this.emitTableMetaDirectivesList(table),       // from round-trip metadata
        ];

        // Table header: name [note] /directive1 /directive2 ...
        let header = `${indent}${rawName}`;
        if (table.note) header += ` [${table.note}]`;
        if (headerDirectives.length) header += ' ' + headerDirectives.join(' ');
        lines.push(header);

        // Build FK map: fieldName → FkEdge for non-hierarchy FKs belonging to this table.
        // This is passed to emitField so /fk is merged into the field line, not a separate line.
        const fkMap = new Map<string, FkEdge>();
        for (const fk of node.fks) {
            if (fk.fromTable !== table.name) continue;
            if (fk.fromCol.toLowerCase() === 'tenant_id' && tenantDetected) continue;
            fkMap.set(fk.fromCol.toLowerCase(), fk);
        }

        // Columns — skip the parent FK col; merge non-hierarchy /fk into field directives
        for (const field of remainingFields) {
            const line = this.emitField(field, indent + '  ', table, node.parentFkCol, fkMap);
            if (line !== null) lines.push(line);
        }

        // Composite indexes
        for (const idx of table.indexes ?? []) {
            const line = this.emitIndex(idx, indent + '  ');
            if (line) lines.push(line);
        }

        // Children (recursive)
        for (const child of node.children) {
            lines.push(...this.emitNode(child, depth + 1));
        }

        return lines;
    }

    // ── Field emission ────────────────────────────────────────────────────────

    private emitField(
        field: DbmlField,
        indent: string,
        table: DbmlTable,
        parentFkCol: string,           // actual FK column that established the parent edge
        fkMap: Map<string, FkEdge>,   // non-hierarchy FKs: fieldName → edge (for /fk directive)
    ): string | null {
        // Skip auto-generated PK — ExpreSQL generates the PK column automatically.
        // Skip 'id' (ExpreSQL default) or '<tableName>_id' (round-trip style).
        if (field.pk) {
            const n = field.name.toLowerCase();
            if (n === 'id' || n === `${table.name.toLowerCase()}_id`) return null;
        }

        // Skip the parent FK column — ExpreSQL regenerates it automatically
        // from the hierarchy nesting (exact match on the actual column name).
        if (parentFkCol && field.name.toLowerCase() === parentFkCol.toLowerCase()) return null;

        const typePart = this.resolveType(field);
        if (typePart === null) return null;  // field handled elsewhere (e.g. enum converted to /check)

        const directives: string[] = [];

        // Type check — for /check from enum
        const { type, checkDirective } = typePart;

        if (field.pk)        directives.push('/pk');
        if (field.increment) { /* increment already sets pk; emit /pk only */ }
        if (field.not_null && !field.pk)  directives.push('/nn');
        if (field.unique && !field.pk)    directives.push('/unique');

        // Default
        if (field.dbdefault) {
            const def = field.dbdefault;
            if (def.type === 'expression') {
                // Skip sys_guid() — it's the auto-PK default, handled by settings pk:guid
                if (!/sys_guid/i.test(def.value)) {
                    directives.push(`/default ${def.value}`);
                }
            } else if (def.type === 'string') {
                directives.push(`/default '${def.value}'`);
            } else {
                directives.push(`/default ${def.value}`);
            }
        }

        // Check from enum
        if (checkDirective) directives.push(checkDirective);

        // Non-hierarchy FK directive — merged into the field line
        const fkEdge = fkMap.get(field.name.toLowerCase());
        if (fkEdge) {
            const targetRaw = this.prefix
                ? fkEdge.toTable.replace(new RegExp(`^${escapeRegex(this.prefix)}_`, 'i'), '')
                : fkEdge.toTable;
            directives.push(`/fk ${targetRaw}`);
            if (fkEdge.onDelete === 'cascade')  directives.push('/cascade');
            if (fkEdge.onDelete === 'set null') directives.push('/setnull');
        }

        // Round-trip metadata
        if (field.metadata) {
            if (field.metadata['esql_case'] === 'upper') directives.push('/upper');
            if (field.metadata['esql_case'] === 'lower') directives.push('/lower');
        }

        // Note as inline ESQL comment
        let noteStr = '';
        if (field.note) noteStr = ` [${field.note}]`;

        const dirStr = directives.length ? ' ' + directives.join(' ') : '';
        // type may be '' for enum fields (type replaced by /check directive)
        const typeSep = type ? ` ${type}` : '';
        return `${indent}${field.name}${typeSep}${dirStr}${noteStr}`;
    }

    private resolveType(field: DbmlField): { type: string; checkDirective?: string } | null {
        const rawType = field.type.type_name ?? '';
        const args    = field.type.args ?? undefined;

        // Check if type is a registered enum
        const enumVals = this.enumMap.get(rawType);
        if (enumVals) {
            // Return a /check directive instead of a DBML type
            // The "type" becomes 'vc' (ExpreSQL default for check columns) or empty
            return {
                type:           '',
                checkDirective: `/check ${enumVals.join(',')}`,
            };
        }

        const esqlType = fromDbmlType(rawType, args as string | undefined);
        return { type: esqlType };
    }

    // ── Index emission ────────────────────────────────────────────────────────

    private emitIndex(idx: DbmlIndex, indent: string): string | null {
        if (!idx.columns || idx.columns.length === 0) return null;

        const cols = idx.columns.map(c => c.value).join(',');

        // Single-column: already handled as column directive
        if (idx.columns.length === 1) {
            if (idx.pk) return null;      // PK: handled in field
            if (idx.unique) return null;  // unique: handled in field
            if (!idx.pk && !idx.unique) return `${indent}/idx ${cols}`;
        }

        // Multi-column
        if (idx.pk)     return `${indent}/pk ${cols}`;
        if (idx.unique) return `${indent}/unique ${cols}`;

        return `${indent}/idx ${cols}`;
    }

    // ── Table metadata directives (round-trip) ────────────────────────────────

    private emitTableMetaDirectivesList(table: DbmlTable): string[] {
        const dirs: string[] = [];
        const m = table.metadata ?? {};

        if (m['esql_auditcols'] === 'yes')  dirs.push('/auditcols');
        if (m['esql_rowversion'] === 'yes') dirs.push('/rowversion');
        if (m['esql_rowkey'] === 'yes')     dirs.push('/rowkey');
        if (m['esql_versioned'] === 'yes')  dirs.push('/versioned');
        if (m['esql_rest'] === 'yes' || m['esql_ords'] === 'yes') dirs.push('/rest');
        if (m['esql_audit'] === 'yes')      dirs.push('/audit');
        if (m['esql_auditlog'] === 'yes')   dirs.push('/auditlog');
        if (m['esql_immutable'] === 'yes')  dirs.push('/immutable');
        if (m['esql_soda'] === 'yes')       dirs.push('/soda');
        if (m['esql_compress'] === 'yes')   dirs.push('/compress');
        if (m['esql_flashback'])            dirs.push('/flashback');
        if (m['esql_api'])                  dirs.push(`/api ${m['esql_api']}`);
        if (m['esql_businesskey'])          dirs.push(`/businesskey ${m['esql_businesskey']}`);
        if (m['esql_lockmode'])             dirs.push(`/lockmode ${m['esql_lockmode']}`);
        if (m['esql_notenantid'] === 'yes') dirs.push('/notenantid');
        if (m['esql_history'] === 'yes')    dirs.push('/history');
        if (m['esql_aggregate'] === 'yes')  dirs.push('/aggregate');

        return dirs;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// '0..*' (optional many, from ?> / <?) or '*' (required many) are both FK-side relations.
function isManyRelation(rel: string): boolean {
    return rel === '*' || rel === '0..*' || (rel.endsWith('..*') && rel.includes('..'));
}

// Basic English singularization for FK column name detection.
function singularize(name: string): string {
    if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
    if (name.endsWith('ses') || name.endsWith('xes') || name.endsWith('zes')) return name.slice(0, -2);
    if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
    return name;
}
