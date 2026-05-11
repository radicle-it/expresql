// Shared mutable state and constants.
// All modules import this object and mutate its properties directly.

export const LS_KEY     = 'radicle-qsql-v1';
export const LS_ERD_POS = 'radicle-qsql-erd-pos-v1';
export const LS_ERD_COL = 'radicle-qsql-erd-col-v1';
export const LS_TABS    = 'radicle-qsql-tabs-v1';

export const DEFAULT_ESQL =
`departments /insert 2
   name /nn
   location
   country
   employees /insert 1
      name /nn vc50
      email /lower
      cost center num
      date hired
      job vc255

emp_v = departments employees

# settings = { pk: identityDataType, auditcols: yes, apex: yes }
`;

export const NEW_TAB_ESQL =
`employees /insert 1
   name /nn vc100
   email /lower /nn
   hire_date date /nn
   department vc50

# settings = { pk: identityDataType, auditcols: yes, apex: yes }
`;

export const state = {
    // ERD
    lastErdData:       null,
    lastErdPos:        new Map(),
    lastRenderedInput: null,
    collapsed:         new Set(),
    x6graph:           null,
    // DDL
    lastDdlText:       '',
    // Tabs
    tabs:              [],
    activeSchemaTabId: null,
    // UI
    activeTab:         'ddl',
    erdDebounceTimer:  null,
};
