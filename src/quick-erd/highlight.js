/**
 * Shared highlight + color utilities for ERD diagram.
 * Pure functions, no DOM dependencies.
 */

/**
 * BFS through data.links starting from rootTable.
 * Links go source (parent) → target (child).
 * @param {number} [maxHops] — optional depth limit (1 = direct children only).
 * Returns { depths: Map<tableName, depth>, maxDepth }.
 */
export function computeHighlightTree( rootTable, data, maxHops ) {
    const upper = rootTable.toUpperCase();
    const depths = new Map();
    depths.set( upper, 0 );

    // Build bidirectional adjacency
    const neighbors = new Map();
    for ( const link of data.links ) {
        const src = normalizeTableName( link.source );
        const tgt = normalizeTableName( link.target );
        if ( !neighbors.has( src ) ) neighbors.set( src, [] );
        if ( !neighbors.has( tgt ) ) neighbors.set( tgt, [] );
        neighbors.get( src ).push( tgt );
        neighbors.get( tgt ).push( src );
    }

    const queue = [ upper ];
    let maxDepth = 0;

    while ( queue.length > 0 ) {
        const current = queue.shift();
        const currentDepth = depths.get( current );
        if ( maxHops != null && currentDepth >= maxHops ) continue;
        const related = neighbors.get( current ) || [];
        for ( const rel of related ) {
            if ( !depths.has( rel ) ) {
                const d = currentDepth + 1;
                depths.set( rel, d );
                if ( d > maxDepth ) maxDepth = d;
                queue.push( rel );
            }
        }
    }

    return { depths, maxDepth };
}

/**
 * Highlight colors for ERD diagram.
 * Returns { bg, text } for a given depth.
 * depth 0 = vivid blue (selected table)
 * depth 1+ = warm amber/gold that desaturates with distance
 * Text is always white for reliable contrast on the saturated backgrounds.
 */
export function highlightColor( depth, maxDepth ) {
    if ( depth === 0 ) {
        return { bg: 'hsl(210, 75%, 48%)', text: '#fff' };
    }
    const t = maxDepth <= 1 ? 0 : ( depth - 1 ) / ( maxDepth - 1 );
    const saturation = Math.round( 60 - t * 25 );
    const lightness = Math.round( 52 - t * 8 );
    return { bg: `hsl(40, ${saturation}%, ${lightness}%)`, text: '#fff' };
}

/**
 * Strips schema prefix (everything before last dot), uppercases.
 */
export function normalizeTableName( name ) {
    return name.toUpperCase().split( '.' ).pop();
}
