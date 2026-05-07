/**
 * Shared type definitions used by both ddl.ts and tree.ts.
 * Kept in a separate file to avoid circular imports.
 */

// ── ERD output types ──────────────────────────────────────────────────────────

export interface ErdColumn {
    name:     string;
    datatype: string;
}

export interface ErdItem {
    name:    string;
    schema:  string | null;
    columns: ErdColumn[];
    type?:   string;
}

export interface ErdLink {
    source:    string;
    source_id: string;
    target:    string;
    target_id: string;
    mandatory?: boolean;
}

export interface ErdOutput {
    items:   ErdItem[];
    links:   ErdLink[];
    groups?: Record<string, string[]>;
}

// ── SemanticType ──────────────────────────────────────────────────────────────

/**
 * Database-agnostic description of a parsed QSQL column's type.
 * DdlNode._inferTypeFull() returns this; DDL generators translate it to
 * dialect-specific SQL.
 */
export interface SemanticType {
    /** Abstract base, e.g. 'varchar' | 'number' | 'integer' | 'date' |
     *  'timestamp' | 'tswtz' | 'tswltz' | 'clob' | 'blob' | 'boolean' |
     *  'geometry' | 'json' | 'vector' | <domain-name> */
    base:            string;
    /** parseName() of this column — generators need it for inline constraints. */
    colName:         string;
    /** Character length for 'varchar' base. */
    varcharLen?:     number;
    /** Parenthesized precision/scale for 'number', e.g. "(10,2)". */
    numericSpec?:    string;
    /** Full parenthesized dimension for 'vector', e.g. "(128,*,*)". */
    vectorSpec?:     string;
    /** Emit check (col in ('Y','N')) constraint. */
    needsBoolCheck:  boolean;
    /** Emit as native SQL BOOLEAN keyword (no check constraint). */
    isNativeBoolean: boolean;
    /** "<table>_<col>" string for constraint naming. */
    parent_child:    string;
}

// ── IDdlNode ──────────────────────────────────────────────────────────────────

/**
 * Public contract for a parsed QSQL node.
 * Defined here (not in tree.ts) to break the circular-import problem:
 * DdlContext references IDdlNode; DdlNode (in tree.ts) implements IDdlNode.
 */
export interface IDdlNode {
    // Properties
    line:     number;
    parent:   IDdlNode | null;
    children: IDdlNode[];
    fks:      Record<string, string> | null;

    // Identity
    parseName():       string;
    inferType():       string;
    trimmedContent():  string;
    _inferTypeFull():  SemanticType;
    getPlsqlType():    string;

    // Option/directive inspection
    isOption(token: string, token2?: string): boolean;
    indexOf(token: string, isPrefix?: boolean): number;

    // Tree navigation
    findChild(name: string):  IDdlNode | null;
    descendants():            IDdlNode[];
    regularColumns():         IDdlNode[];

    // PK / FK
    getExplicitPkName(): string | null;
    getPkName():         string | null;
    getPkType():         string;
    getGenIdColName():   string | null;
    lateInitFks():       void;
    refId():             string | null;

    // Annotations
    getAnnotationValue(key: string): string | null;
    getAnnotationPairs(): Array<{ label: string; value: string | null }>;

    // Layout helpers (alignment of column definitions)
    maxChildNameLen(): number;
    apparentDepth():   number;

    // Structural predicates (audit/rowkey/rowversion)
    hasAuditCols():   boolean;
    hasRowVersion():  boolean;
    hasRowKey():      boolean;

    // Node-level option query (different from DdlContext.getOptionValue — this reads the node's own inline options)
    getOptionValue(key: string): string | number | boolean | null;

    // Column properties (data)
    annotations: string | null;
    comment:     string | null;

    // Column constraint helpers (for DDL generators)
    genConstraint(optQuote?: string):  string;
    getDefaultValue():                 string | null;
    getBetweenClause():                string | null;
    getValues(check_or_values: string): string;

    // Insert / sample data
    parseValues(): (string | number)[] | null;

    // Translation and APEX support (QSQL-level features)
    getTransColumns():  IDdlNode[];
    apexUser():         string;
    auditSysDateFn():   string;

    // Classification
    isMany2One():  boolean;
    cardinality(): number;
}

// ── DDLGenerator ─────────────────────────────────────────────────────────────

/**
 * Contract every DDL generator must fulfil.
 * quicksql depends only on this interface, not on any concrete generator class.
 */
export interface DDLGenerator {
    generateFullDDL(): string;
    generateERD():     ErdOutput;
}

// ── DdlContext ─────────────────────────────────────────────────────────────────

/**
 * The subset of `quicksql` that tree.ts / OracleDDLGenerator depend on.
 * `ddl.ts` implements this; `tree.ts` consumes it as the type of the `ddl`
 * closure variable — keeping the two files decoupled.
 */
export interface DdlContext {
    input:              string;
    getOptionValue(key: string): string | number | boolean | null;
    optionEQvalue(key: string, value: unknown): boolean;
    objPrefix(withoutSchema?: string): string;
    semantics(): string;
    find(name: string): IDdlNode | null;
    descendants(): IDdlNode[];
    additionalColumns(): Record<string, string>;
    setOptions(line: string): void;
    forest:             IDdlNode[];
    postponedAlters:    string[];
    postponedAltersSet: Set<string>;
    data?:              unknown;
}
