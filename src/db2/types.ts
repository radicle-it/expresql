import type { SemanticType } from '../compiler/types.js';

/**
 * Map a SemanticType to a Db2 LUW 11.1+ DDL column type string.
 * BOOLEAN and JSON require Db2 11.5+.
 */
export function toDb2Type(sem: SemanticType): string {
    // bool/yn QSQL types: base='varchar', varcharLen=1, needsBoolCheck=true → native BOOLEAN (Db2 11.5+)
    if (sem.needsBoolCheck && (sem.varcharLen === 1 || sem.varcharLen == null)) return 'boolean';
    switch (sem.base) {
        case 'varchar':   return `varchar(${sem.varcharLen ?? 4000})`;
        case 'number':    return sem.numericSpec ? `decimal${sem.numericSpec}` : 'decimal(15,4)';
        case 'integer':   return 'integer';
        case 'float':     return 'double';
        case 'date':      return 'date';
        case 'timestamp': return 'timestamp';
        case 'tswtz':     return 'timestamp with time zone';
        case 'tswltz':    return 'timestamp';          // Db2 has no WITH LOCAL TIME ZONE
        case 'clob':      return 'clob';
        case 'blob':      return 'blob';
        case 'boolean':   return 'boolean';            // Db2 11.5+
        case 'geometry':  return 'db2gse.st_geometry';
        case 'json':      return 'json';               // Db2 11.5+
        case 'xml':       return 'xml';
        case 'vector':    return 'clob';               // placeholder; use VECTOR(n) when Db2 12+/watsonx
        default:          return sem.base !== '' ? sem.base : 'varchar(255)';
    }
}
