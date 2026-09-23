/**
 * Provides explicit column definitions for virtual columns that ExpreSQL
 * generates implicitly via table-level directives (/auditcols, /rowversion,
 * /rowkey, /versioned, tenant_id injection).
 *
 * In DBML every column must be explicit — there is no concept of a shorthand
 * directive that expands into multiple columns. These functions provide the
 * expanded definitions so that the DBML output represents the physical schema.
 */

export interface ExpandedColumn {
    name:      string;
    type:      string;
    notNull:   boolean;
    pk?:       boolean;
    default?:  string;
    note?:     string;
    /** Extra [esql_*: "..."] custom properties to emit on this column. */
    esqlMeta?: Record<string, string>;
}

// ── Audit columns ─────────────────────────────────────────────────────────────

/**
 * Expands /auditcols → four columns: created, created_by, updated, updated_by.
 * The actual column names are driven by the context options (createdcol, etc.),
 * but the defaults match the most common usage.
 */
export function expandAuditCols(opts?: {
    createdcol?:   string | undefined;
    createdbycol?: string | undefined;
    updatedcol?:   string | undefined;
    updatedbycol?: string | undefined;
    auditdate?:    string | undefined;
}): ExpandedColumn[] {
    const dateType = opts?.auditdate ? opts.auditdate : 'date';
    return [
        { name: opts?.createdcol    ?? 'created',    type: dateType,       notNull: true  },
        { name: opts?.createdbycol  ?? 'created_by', type: 'varchar(128)', notNull: true  },
        { name: opts?.updatedcol    ?? 'updated',    type: dateType,       notNull: false },
        { name: opts?.updatedbycol  ?? 'updated_by', type: 'varchar(128)', notNull: false },
    ];
}

// ── Row-level columns ─────────────────────────────────────────────────────────

export function expandRowVersion(): ExpandedColumn {
    return {
        name:    'row_version',
        type:    'int',
        notNull: true,
        default: '1',
        note:    'optimistic locking counter',
        esqlMeta: { esql_rowversion: 'yes' },
    };
}

export function expandRowKey(): ExpandedColumn {
    return {
        name:    'row_key',
        type:    'varchar(36)',
        notNull: true,
        note:    'ORDS alphanumeric row key',
        esqlMeta: { esql_rowkey: 'yes' },
    };
}

// ── SCD2 (versioned) columns ──────────────────────────────────────────────────

export function expandVersionedCols(): ExpandedColumn[] {
    return [
        { name: 'valid_from', type: 'date',    notNull: true,  note: 'SCD2 validity start' },
        { name: 'valid_to',   type: 'date',    notNull: false, note: 'SCD2 validity end (null = current)' },
        { name: 'is_current', type: 'boolean', notNull: true,  default: 'true', note: 'SCD2 current-row flag' },
    ];
}

// ── Tenant ID ─────────────────────────────────────────────────────────────────

export function expandTenantId(): ExpandedColumn {
    return {
        name:     'tenant_id',
        type:     'int',
        notNull:  true,
        note:     'multi-tenant discriminator',
        esqlMeta: { esql_tenant: 'yes' },
    };
}
