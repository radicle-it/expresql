/**
 * Mermaid-based ERD renderer.
 * Renders ER diagrams using Mermaid's erDiagram syntax with
 * pan/zoom support and click-to-highlight.
 */

import mermaid from 'mermaid';
import { highlightColor, normalizeTableName } from './highlight.js';

let mermaidInitialized = false;
let renderCounter = 0;

export class MermaidRenderer {
    constructor( containerEl, diagram ) {
        this.container = containerEl;
        this.diagram = diagram;
        this.entityMap = new Map(); // normalized name → { g, box }
        this._originalStyles = new Map(); // normalized name → original inline style string
        this.svgEl = null;

        if ( !mermaidInitialized ) {
            const isDark = (
                ( typeof document !== 'undefined' && document.body && (
                    document.body.classList.contains( 'vscode-dark' ) ||
                    document.body.getAttribute( 'data-vscode-theme-kind' ) === 'vscode-dark'
                ) ) ||
                ( typeof window !== 'undefined' && window.matchMedia &&
                    window.matchMedia( '(prefers-color-scheme: dark)' ).matches )
            );

            mermaid.initialize( {
                startOnLoad: false,
                theme: isDark ? 'dark' : 'base',
                themeVariables: {
                    fontSize: '12px'
                },
                er: {
                    useMaxWidth: false
                }
            } );
            mermaidInitialized = true;
        }

        // Create scrollable wrapper with zoom
        this.wrapper = document.createElement( 'div' );
        this.wrapper.className = 'qs-erd-mermaid-wrapper';

        this.inner = document.createElement( 'div' );
        this.inner.className = 'qs-erd-mermaid-inner';
        this.wrapper.appendChild( this.inner );
        this.container.appendChild( this.wrapper );

        this._scale = 1;
        this._setupZoom();
        this._setupPan();
    }

    async render( data ) {
        const code = this._generateMermaidCode( data );
        const id = `qs-erd-mermaid-${renderCounter++}`;

        try {
            const { svg } = await mermaid.render( id, code );
            this.inner.innerHTML = svg;
            this.svgEl = this.inner.querySelector( 'svg' );
            this._buildEntityMap();
            this._attachClickHandlers();
        } catch ( e ) {
            this.inner.innerHTML = `<pre class="qs-erd-error">Diagram render error: ${e.message}</pre>`;
        }
    }

    _generateMermaidCode( data ) {
        let code = 'erDiagram\n';

        // Entities with columns (swap name/type positions so name shows first visually)
        for ( const item of data.items ) {
            const safeName = _safeId( item.name );
            code += `    ${safeName} {\n`;
            if ( item.columns ) {
                for ( const col of item.columns ) {
                    const colName = _safeAttr( col.name );
                    const colType = _safeAttr( col.datatype );
                    // Mermaid syntax: type name — we swap so name appears in "type" position (left)
                    code += `        ${colName} ${colType}\n`;
                }
            }
            code += '    }\n';
        }

        // Relationships
        for ( const link of data.links ) {
            const src = _safeId( link.source );
            const tgt = _safeId( link.target );
            code += `    ${src} ||--o{ ${tgt} : ""\n`;
        }

        return code;
    }

    _buildEntityMap() {
        this.entityMap.clear();
        this._originalStyles.clear();
        if ( !this.svgEl ) return;

        // Mermaid v11: entities are <g class="node default"> with <g class="name"> for the label.
        // Mermaid v10/older: entities are <g class="entity"> with <text class="er-entityLabel">.
        // Try v11 first, fall back to older.
        let nodes = this.svgEl.querySelectorAll( 'g.node' );
        if ( nodes.length > 0 ) {
            this._buildEntityMapV11( nodes );
        } else {
            // Fallback: older Mermaid with .entity class
            nodes = this.svgEl.querySelectorAll( '.entity' );
            this._buildEntityMapLegacy( nodes );
        }
    }

    _buildEntityMapV11( nodes ) {
        for ( const node of nodes ) {
            // Entity name is inside <g class="name"> or <g class="label name">
            const nameGroup = node.querySelector( 'g.name, g.label.name' );
            if ( !nameGroup ) continue;

            const nameText = nameGroup.textContent.trim().toUpperCase();
            if ( !nameText ) continue;

            // Rough.js creates <g> wrappers containing <path> children.
            // Main box = first <g> child; row backgrounds = .row-rect-even/.row-rect-odd <g>.
            // Collect all fill-able paths (box + rows), excluding dividers and label text.
            const fillPaths = node.querySelectorAll(
                ':scope > g:first-child path, .row-rect-even path, .row-rect-odd path'
            );

            this.entityMap.set( nameText, { g: node, fillPaths } );

            // Save original styles for highlight restore
            const saved = [];
            for ( const p of fillPaths ) {
                saved.push( p.getAttribute( 'style' ) || '' );
            }
            this._originalStyles.set( nameText, saved );
        }
    }

    _buildEntityMapLegacy( entities ) {
        for ( const entity of entities ) {
            const label = entity.querySelector( '.er-entityLabel' );
            if ( !label ) continue;

            const name = label.textContent.trim().toUpperCase();
            if ( !name ) continue;

            const box = entity.querySelector( '.er-entityBox' ) || entity.querySelector( 'rect' );
            const fillPaths = box ? [ box ] : [];
            this.entityMap.set( name, { g: entity, fillPaths } );

            const saved = [];
            for ( const p of fillPaths ) {
                saved.push( p.getAttribute( 'style' ) || '' );
            }
            this._originalStyles.set( name, saved );
        }
    }

    _attachClickHandlers() {
        for ( const [ name, { g } ] of this.entityMap ) {
            g.style.cursor = 'pointer';
            g.addEventListener( 'click', ( e ) => {
                e.stopPropagation();
                this.diagram.onTableClick( name );
            } );
        }

        // Click on blank area clears highlight
        if ( this.svgEl ) {
            this.svgEl.addEventListener( 'click', () => {
                if ( this.diagram.highlightedTable ) {
                    this.diagram.onTableClick( this.diagram.highlightedTable );
                }
            } );
        }
    }

    _colorEntity( g, fillPaths, bg, textColor ) {
        for ( const p of fillPaths ) {
            p.style.fill = bg;
            p.style.stroke = bg;
        }
        if ( textColor ) {
            for ( const t of g.querySelectorAll( 'text' ) ) {
                t.style.fill = textColor;
            }
        }
    }

    applyHighlight( tree ) {
        const { depths, maxDepth } = tree;

        for ( const [ name, { g, fillPaths } ] of this.entityMap ) {
            const normalized = normalizeTableName( name );
            if ( depths.has( normalized ) ) {
                const depth = depths.get( normalized );
                const { bg, text } = highlightColor( depth, maxDepth );
                this._colorEntity( g, fillPaths, bg, text );
                g.style.opacity = '1';
            } else {
                g.style.opacity = '0.15';
            }
        }

        // Fade relationship lines
        if ( this.svgEl ) {
            const edges = this.svgEl.querySelectorAll( '.edge, .er-relationshipLine, .relationship' );
            for ( const edge of edges ) {
                edge.style.opacity = '0.1';
            }
        }
    }

    focusEntity( name ) {
        if ( !name ) {
            this.clearHighlight();
            return;
        }

        const upperName = name.toUpperCase();

        for ( const [ entName, { g, fillPaths } ] of this.entityMap ) {
            if ( entName === upperName ) {
                this._colorEntity( g, fillPaths, 'hsl(210, 75%, 48%)', '#fff' );
                g.style.opacity = '1';

                // Scroll the entity into view
                const wrapperRect = this.wrapper.getBoundingClientRect();
                const gRect = g.getBoundingClientRect();
                const centerX = gRect.left + gRect.width / 2 - wrapperRect.left;
                const centerY = gRect.top + gRect.height / 2 - wrapperRect.top;
                this.wrapper.scrollLeft += centerX - wrapperRect.width / 2;
                this.wrapper.scrollTop += centerY - wrapperRect.height / 2;
            } else {
                g.style.opacity = '0.15';
            }
        }

        // Fade edges
        if ( this.svgEl ) {
            const edges = this.svgEl.querySelectorAll( '.edge, .er-relationshipLine, .relationship' );
            for ( const edge of edges ) {
                edge.style.opacity = '0.1';
            }
        }
    }

    clearHighlight() {
        for ( const [ name, { g, fillPaths } ] of this.entityMap ) {
            g.style.opacity = '';
            const saved = this._originalStyles.get( name ) || [];
            fillPaths.forEach( ( p, i ) => {
                if ( saved[i] != null ) {
                    p.setAttribute( 'style', saved[i] );
                } else {
                    p.style.fill = '';
                    p.style.stroke = '';
                }
            } );
            // Restore text colors
            for ( const t of g.querySelectorAll( 'text' ) ) {
                t.style.fill = '';
            }
        }

        if ( this.svgEl ) {
            const edges = this.svgEl.querySelectorAll( '.edge, .er-relationshipLine, .relationship, path, line' );
            for ( const edge of edges ) {
                edge.style.opacity = '';
            }
        }
    }

    _setupZoom() {
        this.wrapper.addEventListener( 'wheel', ( e ) => {
            e.preventDefault();
            const oldScale = this._scale;
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.min( 3, Math.max( 0.2, oldScale + delta ) );
            if ( newScale === oldScale ) return;

            // Mouse position relative to the wrapper viewport
            const rect = this.wrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left + this.wrapper.scrollLeft;
            const mouseY = e.clientY - rect.top + this.wrapper.scrollTop;

            // Point in unscaled content under cursor
            const contentX = mouseX / oldScale;
            const contentY = mouseY / oldScale;

            this._scale = newScale;
            this.inner.style.transform = `scale(${newScale})`;

            // Adjust scroll so the same content point stays under cursor
            this.wrapper.scrollLeft = contentX * newScale - ( e.clientX - rect.left );
            this.wrapper.scrollTop = contentY * newScale - ( e.clientY - rect.top );
        }, { passive: false } );
    }

    _setupPan() {
        let isPanning = false;
        let didMove = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;

        this.wrapper.addEventListener( 'mousedown', ( e ) => {
            if ( e.button !== 0 ) return;
            isPanning = true;
            didMove = false;
            startX = e.clientX;
            startY = e.clientY;
            scrollLeft = this.wrapper.scrollLeft;
            scrollTop = this.wrapper.scrollTop;
        } );

        window.addEventListener( 'mousemove', ( e ) => {
            if ( !isPanning ) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if ( !didMove && Math.abs( dx ) < 3 && Math.abs( dy ) < 3 ) return;
            didMove = true;
            e.preventDefault();
            this.wrapper.style.cursor = 'grabbing';
            this.wrapper.scrollLeft = scrollLeft - dx;
            this.wrapper.scrollTop = scrollTop - dy;
        } );

        window.addEventListener( 'mouseup', () => {
            if ( !isPanning ) return;
            isPanning = false;
            this.wrapper.style.cursor = 'grab';
        } );
    }

    destroy() {
        this.container.innerHTML = '';
        this.entityMap.clear();
        this._originalStyles.clear();
        this.svgEl = null;
    }
}

function _safeId( name ) {
    // Mermaid entity names: remove dots, replace spaces/special chars with underscores
    return name.replace( /\./g, '_' ).replace( /[^a-zA-Z0-9_]/g, '_' ).toUpperCase();
}

function _safeAttr( value ) {
    // Mermaid attribute tokens can't contain spaces or special chars
    return value.replace( /[^a-zA-Z0-9_()]/g, '_' );
}
