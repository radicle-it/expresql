import { tab } from '../../../compiler/node.js';
import type { OracleParameterColumn } from '../table-model.js';

/** Computes a stable parameter-column width without truncating long identifiers. */
export function parameterWidth(minimum: number, names: Iterable<string>): number {
    return Math.max(minimum, ...Array.from(names, name => name.length + 1));
}

/** Renders the repeated flat IN parameter shape used by APP package declarations. */
export function renderInputParameterLines(
    table: string,
    columns: readonly OracleParameterColumn[],
    width: number,
): string[] {
    return columns.map(({ name, nullable }) =>
        `${tab}${tab}p_${name.padEnd(width)} in  ${table}.${name}%type${nullable ? ' default null' : ''}`
    );
}

/** Renders comma-prefixed OUT parameters so callers can append them to a declaration. */
export function renderOutParameterBlock(
    table: string,
    names: readonly string[],
    width: number,
): string {
    return names.map(name =>
        `,\n${tab}${tab}p_${name.padEnd(width)} out ${table}.${name}%type`
    ).join('');
}

/** Copies fields from a row variable into flat OUT parameters. */
export function renderOutAssignments(
    names: readonly string[],
    rowVariable = 'l_row',
): string {
    return names.map(name =>
        `${tab}${tab}p_${name} := ${rowVariable}.${name};\n`
    ).join('');
}
