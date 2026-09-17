/** Returns the identifier part accepted by PL/SQL END clauses. */
export function bareName(name: string): string {
    const dot = name.indexOf('.');
    return dot >= 0 ? name.slice(dot + 1) : name;
}
