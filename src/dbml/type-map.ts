import type { SemanticType } from '../compiler/types.js';

/**
 * Maps a SemanticType to a DBML v2 type string.
 * Types containing spaces are wrapped in double-quotes as required by the DBML grammar.
 */
export function toDbmlType(st: SemanticType): string {
    switch (st.base) {
        case 'varchar':   return st.varcharLen ? `varchar(${st.varcharLen})` : 'varchar';
        case 'number':    return st.numericSpec ? `decimal${st.numericSpec}` : 'decimal';
        case 'integer':   return 'int';
        case 'date':      return 'date';
        case 'timestamp': return 'timestamp';
        case 'tswtz':     return '"timestamp with time zone"';
        case 'tswltz':    return '"timestamp with local time zone"';
        case 'boolean':   return 'boolean';
        case 'clob':      return 'text';
        case 'blob':      return 'blob';
        case 'json':      return 'json';
        case 'vector':    return st.vectorSpec ? `"vector${st.vectorSpec}"` : '"vector(*,*,*)"';
        case 'geometry':  return '"SDO_GEOMETRY"';
        default:
            // Domain types and unknown types: passthrough.
            // Names with spaces must be wrapped in double-quotes.
            return st.base.includes(' ') ? `"${st.base}"` : st.base;
    }
}
