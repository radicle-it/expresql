import type { DdlContext } from './types.js';

// ── Statement kinds ───────────────────────────────────────────────────────────

export type DiffStatementKind =
    | 'create_table'         | 'drop_table'
    | 'create_view'          | 'drop_view'
    | 'add_column'           | 'set_unused'        | 'drop_unused_columns' | 'modify_column'
    | 'add_fk'               | 'drop_fk'
    | 'transient_add_fk'     | 'transient_drop_fk'
    | 'add_index'            | 'drop_index'
    | 'add_sequence'         | 'drop_sequence'
    | 'create_package'       | 'drop_package'
    | 'create_trigger'       | 'drop_trigger'
    | 'rename_hint';

// ── Core interfaces ───────────────────────────────────────────────────────────

export interface DiffStatement {
    kind:    DiffStatementKind;
    table:   string;
    column?: string;
    /** Runnable DDL, or a SQL comment when requiresManualIntervention is true */
    sql:     string;
    requiresManualIntervention: boolean;
}

export interface DiffWarning {
    level:   'DESTRUCTIVE' | 'LOSSY' | 'INFO';
    table:   string;
    column?: string;
    message: string;
    requiresManualIntervention: boolean;
}

export interface DiffSummary {
    tablesAdded:                     number;
    tablesDropped:                   number;
    tablesModified:                  number;
    statementsTotal:                 number;
    statementsRequiringIntervention: number;
    warningsTotal:                   number;
}

export interface DiffResult {
    /** Full script including preamble */
    sql:        string;
    /** Individual statements in emission order */
    statements: DiffStatement[];
    warnings:   DiffWarning[];
    summary:    DiffSummary;
}

// ── Generator interface ───────────────────────────────────────────────────────

export interface DiffGenerator {
    compute(oldCtx: DdlContext, newCtx: DdlContext): DiffResult;
}
