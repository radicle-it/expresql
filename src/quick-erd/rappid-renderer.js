/* global joint */

/**
 * Rappid (JointJS+) based ERD renderer.
 * Same interface as MermaidRenderer: constructor, render, applyHighlight, clearHighlight, destroy.
 */

import dagre from 'dagre';
import utils from './utils.js';
import cs from './constants.js';
import { highlightColor, normalizeTableName } from './highlight.js';

export class RappidRenderer {
    constructor( containerEl, diagram ) {
        this.container = containerEl;
        this.diagram = diagram;
        this.entityMap = new Map(); // normalized table name → JointJS element

        joint.anchors.columnAnchor = function ( view, magnet, ref ) {
            let anchor;
            const { model } = view;
            const bbox = view.getNodeUnrotatedBBox( magnet );
            const center = model.getBBox().center();
            const angle = model.angle();
            let refPoint = ref;
            if ( ref instanceof Element ) {
                const refView = this.paper.findView( ref );
                refPoint = refView ? refView.getNodeBBox( ref ).center() : new joint.g.Point();
            }
            refPoint.rotate( center, angle );
            anchor = ( refPoint.x <= ( bbox.x + bbox.width ) ) ? bbox.leftMiddle() : bbox.rightMiddle();
            return anchor.rotate( center, -angle );
        };

        this.graph = new joint.dia.Graph( {}, { cellNamespace: joint.shapes } );
        this.paper = new joint.dia.Paper( {
            width: 100,
            height: 100,
            gridSize: 1,
            model: this.graph,
            highlighting: false,
            sorting: joint.dia.Paper.sorting.APPROX,
            cellViewNamespace: joint.shapes,
            defaultRouter: { name: 'metro' },
            defaultAnchor: { name: 'columnAnchor' },
            defaultConnector: { name: 'rounded' },
            linkPinning: false,
            interactive: {
                vertexAdd: false,
                linkMove: false,
                elementMove: true
            }
        } );

        this.paperScroller = new joint.ui.PaperScroller( {
            autoResizePaper: true,
            padding: 50,
            paper: this.paper
        } );

        // Panning
        this.paper.on( 'blank:pointerdown', ( evt, x, y ) => {
            this.paperScroller.setCursor( 'grabbing' );
            this.paperScroller.startPanning( evt, x, y );
        } );
        this.paper.on( 'blank:pointerup', () => {
            this.paperScroller.setCursor( 'default' );
        } );

        // Mouse wheel zoom
        const onWheel = ( _view, evt, _x, _y, delta ) => {
            evt.preventDefault();
            this.paperScroller.zoom( delta === -1 ? -0.2 : 0.2, {
                min: 0.1,
                max: 3
            } );
        };
        this.paper.on( 'cell:mousewheel', onWheel );
        this.paper.on( 'blank:mousewheel', ( evt, x, y, delta ) => {
            onWheel( null, evt, x, y, delta );
        } );

        // Table click → highlight
        this.paper.on( 'element:pointerclick', ( cellView ) => {
            const name = cellView.model.attr( 'headerLabel/text' );
            if ( name ) {
                this.diagram.onTableClick( normalizeTableName( name ) );
            }
        } );

        // Blank click → clear highlight
        this.paper.on( 'blank:pointerclick', () => {
            if ( this.diagram.highlightedTable ) {
                this.diagram.onTableClick( this.diagram.highlightedTable );
            }
        } );

        // Keyboard shortcuts
        if ( this.keyboard ) {
            this.keyboard.disable();
        }
        this.keyboard = new joint.ui.Keyboard();

        // Wrapper element
        this.wrapper = document.createElement( 'div' );
        this.wrapper.className = 'qs-erd-rappid-wrapper';

        const scrollerEl = this.paperScroller.render().el;
        scrollerEl.style.width = '100%';
        scrollerEl.style.height = '100%';

        this.wrapper.appendChild( scrollerEl );
        this.container.appendChild( this.wrapper );
    }

    async render( data ) {
        if ( !data.items?.length ) return;

        this.graph.clear();
        this.entityMap.clear();

        try {
            const cells = [];
            const idsMap = new Map();

            for ( const item of data.items ) {
                const objectName = item.name.toUpperCase();
                let objectSchema = item.schema;
                if ( objectSchema ) objectSchema = objectSchema.toUpperCase();

                const columns = ( item.columns || [] ).map( col => ( {
                    name: col.name.toUpperCase(),
                    datatype: col.datatype.replace( '(', ' (' ).toUpperCase()
                } ) );

                const objectWidth = utils.calcWidth( objectSchema, objectName, columns );

                const fullName = objectSchema ? `${objectSchema}.${objectName}` : objectName;
                const ShapeClass = ( item.type === 'view' )
                    ? joint.shapes.quicksql.View
                    : joint.shapes.quicksql.Table;

                const cell = new ShapeClass( {
                    id: utils.newGuid(),
                    size: { width: objectWidth }
                } );

                cell.setName( fullName );
                cell.setColumns( columns );

                idsMap.set( fullName, cell.id );
                this.entityMap.set( normalizeTableName( item.name ), cell );
                cells.push( cell );
            }

            for ( const link of data.links ) {
                const sourceID = idsMap.get( link.source.toUpperCase() );
                const targetID = idsMap.get( link.target.toUpperCase() );
                if ( sourceID && targetID ) {
                    const rel = new joint.shapes.quicksql.Relation( {
                        source: { id: sourceID, port: link.source_id.toUpperCase() },
                        target: { id: targetID, port: link.target_id.toUpperCase() },
                        style: 'solid'
                    } );
                    cells.push( rel );
                }
            }

            this.graph.resetCells( cells );

            this._dagreLayout();

            this.graph.getLinks().forEach( link => link.toBack() );

            setTimeout( () => {
                this.paperScroller.adjustPaper();
                this.paperScroller.zoom( 1, { absolute: true } );
                this.paperScroller.centerContent();
            }, 100 );
        } catch ( e ) {
            console.error( 'RappidRenderer render error:', e );
            this.container.innerHTML = `<pre class="qs-erd-error">Diagram render error: ${e.message}</pre>`;
        }
    }

    _dagreLayout() {
        const g = new dagre.graphlib.Graph();
        g.setGraph( { rankdir: 'TB', nodesep: 120, edgesep: 100, ranksep: 100 } );
        g.setDefaultEdgeLabel( () => ( {} ) );

        for ( const el of this.graph.getElements() ) {
            const size = el.size();
            g.setNode( el.id, { width: size.width, height: size.height } );
        }

        for ( const link of this.graph.getLinks() ) {
            g.setEdge( link.source().id, link.target().id );
        }

        dagre.layout( g );

        for ( const el of this.graph.getElements() ) {
            const node = g.node( el.id );
            el.position( node.x - node.width / 2, node.y - node.height / 2 );
        }
    }

    applyHighlight( tree ) {
        const { depths, maxDepth } = tree;

        // Highlight elements
        for ( const el of this.graph.getElements() ) {
            const name = normalizeTableName( el.attr( 'headerLabel/text' ) || '' );
            if ( depths.has( name ) ) {
                const { bg, text } = highlightColor( depths.get( name ), maxDepth );
                el.attr( 'body/fill', bg );
                el.attr( 'body/stroke', bg );
                el.attr( 'headerLabel/fill', text );
                el.attr( 'itemLabels/fill', text );
                el.attr( 'itemLabels_1/fill', text );
                el.attr( 'root/opacity', 1 );
            } else {
                el.attr( 'root/opacity', 0.15 );
            }
        }

        // Fade links
        for ( const link of this.graph.getLinks() ) {
            link.attr( './opacity', 0.1 );
        }
    }

    focusEntity( name ) {
        if ( !name ) {
            this.clearHighlight();
            return;
        }
        const upper = name.toUpperCase();
        let targetEl = null;

        for ( const el of this.graph.getElements() ) {
            const elName = normalizeTableName( el.attr( 'headerLabel/text' ) || '' );
            if ( elName === upper ) {
                el.attr( 'body/fill', 'hsl(210, 75%, 48%)' );
                el.attr( 'body/stroke', 'hsl(210, 75%, 48%)' );
                el.attr( 'headerLabel/fill', '#fff' );
                el.attr( 'itemLabels/fill', '#fff' );
                el.attr( 'itemLabels_1/fill', '#fff' );
                el.attr( 'root/opacity', 1 );
                targetEl = el;
            } else {
                el.attr( 'root/opacity', 0.15 );
            }
        }

        for ( const link of this.graph.getLinks() ) {
            link.attr( './opacity', 0.1 );
        }

        // Scroll to the focused element
        if ( targetEl && this.paperScroller ) {
            this.paperScroller.scrollToElement( targetEl, { animation: true } );
        }
    }

    clearHighlight() {
        for ( const el of this.graph.getElements() ) {
            const isView = el.get( 'type' ) === 'quicksql.View';
            el.attr( 'body/fill', isView ? cs.colors.VIEW_BACKGROUND : cs.colors.TABLE_BACKGROUND );
            el.attr( 'body/stroke', isView ? cs.colors.VIEW_BORDER : cs.colors.TABLE_BORDER );
            el.attr( 'headerLabel/fill', isView ? cs.colors.VIEW_NAME_TEXT : cs.colors.TABLE_NAME_TEXT );
            el.attr( 'itemLabels/fill', isView ? cs.colors.VIEW_COLUMN_TEXT : cs.colors.TABLE_COLUMN_TEXT );
            el.attr( 'itemLabels_1/fill', isView ? cs.colors.VIEW_DATA_TYPE_TEXT : cs.colors.TABLE_DATA_TYPE_TEXT );
            el.attr( 'root/opacity', 1 );
        }

        for ( const link of this.graph.getLinks() ) {
            link.attr( './opacity', 1 );
        }
    }

    destroy() {
        if ( this.keyboard ) {
            this.keyboard.disable();
            this.keyboard = null;
        }
        if ( this.wrapper && this.wrapper.parentNode ) {
            this.wrapper.parentNode.removeChild( this.wrapper );
        }
        this.graph.clear();
        this.entityMap.clear();
        this.paper = null;
        this.paperScroller = null;
        this.graph = null;
    }
}
