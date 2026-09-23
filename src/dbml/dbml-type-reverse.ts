/**
 * Converts a DBML type string → ESQL shorthand type.
 * Inverse of toDbmlType() in type-map.ts.
 *
 * @param typeName  The type_name field from @dbml/core (may include args, e.g. "varchar(100)")
 * @param args      The args field from @dbml/core (e.g. "100", "10,2")
 */
export function fromDbmlType(typeName: string, args?: string | null): string {
    // Strip quotes and extract base name (args may already be in typeName)
    const raw  = typeName.replace(/^"|"$/g, '').trim();
    const base = raw.replace(/\(.*\)$/, '').trim().toLowerCase();

    switch (base) {
        case 'varchar':
        case 'varchar2':
        case 'character varying':
        case 'nvarchar':
            return args ? `vc${args}` : 'vc';

        case 'char':
        case 'nchar':
            return args ? `vc${args}` : 'vc4';

        case 'int':
        case 'integer':
        case 'smallint':
        case 'tinyint':
        case 'bigint':
        case 'int2':
        case 'int4':
        case 'int8':
            return 'int';

        // serial = auto-increment integer (PostgreSQL)
        case 'serial':
        case 'bigserial':
        case 'smallserial':
            return 'int';

        case 'decimal':
        case 'numeric':
        case 'number':
            return args ? `num(${args})` : 'num';

        case 'float':
        case 'float4':
        case 'float8':
        case 'real':
        case 'double':
        case 'double precision':
            return 'num';

        case 'money':
            return 'num(19,4)';

        case 'date':
            return 'date';

        case 'timestamp':
        case 'datetime':
            return 'ts';

        case 'timestamp with time zone':
        case 'timestamptz':
            return 'tswtz';

        case 'timestamp with local time zone':
            return 'tswltz';

        case 'time':
        case 'time with time zone':
        case 'timetz':
            return 'ts';

        case 'boolean':
        case 'bool':
        case 'bit':
            return 'bool';

        case 'text':
        case 'clob':
        case 'longtext':
        case 'mediumtext':
        case 'tinytext':
        case 'ntext':
            return 'clob';

        case 'blob':
        case 'bytea':
        case 'binary':
        case 'varbinary':
        case 'longblob':
        case 'mediumblob':
            return 'blob';

        case 'json':
        case 'jsonb':
            return 'json';

        case 'uuid':
            return 'vc36';

        case 'sdo_geometry':
        case 'geometry':
        case 'geography':
        case 'point':
        case 'polygon':
            return 'geometry';
    }

    // Vector: "vector(N,type,storage)" or "vector(*,*,*)"
    const vecMatch = raw.match(/^vector\((\d+|\*),?([^,)]*),?([^)]*)\)$/i);
    if (vecMatch) {
        const dim = vecMatch[1] === '*' ? '' : vecMatch[1];
        return dim ? `vect${dim}` : 'vect';
    }

    // Unknown: pass through as-is (domain types, custom)
    if (args) return `${raw}(${args})`;
    return raw || 'vc';
}
