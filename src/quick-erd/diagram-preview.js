/**
 * DiagramPreview — main entry point for the ERD with toolbar.
 * Supports both Mermaid and Rappid renderers, auto-detecting Rappid at runtime.
 */

/* global joint */

import { MermaidRenderer } from './mermaid-renderer.js';
import { RappidRenderer } from './rappid-renderer.js';
import { buildToolbar } from './toolbar.js';
import { computeHighlightTree, normalizeTableName } from './highlight.js';

export class DiagramPreview {
    constructor( data, elementOrSelector = '#quickERD' ) {
        if (
            !elementOrSelector
            || (
                !(
                    typeof elementOrSelector === 'string'
                    && ( this.element = document.querySelector( elementOrSelector ) )
                )
                && !(
                    typeof elementOrSelector === 'object'
                    && ( this.element = elementOrSelector )
                    && ( typeof this.element.append === 'function' )
                )
            )
        ) {
            throw new Error( 'Invalid element or selector provided' );
        }

        this.data = data;
        this.groups = data.groups || {};
        this.activeGroups = null;
        this.highlightedTable = null;

        this._setupContainer();

        this.toolbar = buildToolbar( this );
        this.toolbarEl.appendChild( this.toolbar.el );

        this.rendererType = ( typeof joint !== 'undefined' ) ? 'rappid' : 'mermaid';
        this.renderer = this._createRenderer( this.rendererType );
        this.refresh();
    }

    _setupContainer() {
        this.element.innerHTML = '';

        this.toolbarEl = document.createElement( 'div' );
        this.toolbarEl.className = 'qs-erd-toolbar-container';
        this.element.appendChild( this.toolbarEl );

        this.canvasEl = document.createElement( 'div' );
        this.canvasEl.className = 'qs-erd-canvas';
        this.element.appendChild( this.canvasEl );
    }

    getFilteredData() {
        if ( !this.activeGroups?.length ) return this.data;

        const included = new Set();
        for ( const g of this.activeGroups ) {
            ( this.groups[g] || [] ).forEach( t => included.add( t.toUpperCase() ) );
        }

        const items = this.data.items.filter( i => included.has( i.name.toUpperCase() ) );
        const names = new Set( items.map( i => normalizeTableName( i.name ) ) );

        const links = this.data.links.filter( l => {
            const s = normalizeTableName( l.source );
            const t = normalizeTableName( l.target );
            return names.has( s ) && names.has( t );
        } );

        return { items, links, groups: this.groups };
    }

    setActiveGroups( groups ) {
        this.activeGroups = groups;
        this.highlightedTable = null;
        this.refresh();
    }

    async refresh() {
        await this.renderer.render( this.getFilteredData() );
        if ( this.highlightedTable ) this._applyHighlight( this.highlightedTable );
    }

    onTableClick( name ) {
        if ( this.highlightedTable === name ) {
            this.highlightedTable = null;
            this.renderer.clearHighlight();
        } else {
            this.highlightedTable = name;
            this._applyHighlight( name );
        }
    }

    highlightTable( name ) {
        if ( !name ) {
            this.highlightedTable = null;
            this.renderer.clearHighlight();
        } else {
            this.highlightedTable = name;
            this._applyHighlight( name );
        }
    }

    searchTable( name ) {
        if ( !name ) {
            this.highlightedTable = null;
            this.renderer.clearHighlight();
        } else {
            this.highlightedTable = name;
            this.renderer.focusEntity( name );
        }
    }

    _applyHighlight( name ) {
        const tree = computeHighlightTree( name, this.getFilteredData(), 1 );
        this.renderer.applyHighlight( tree );
    }

    updateData( data ) {
        const newGroups = data.groups || {};
        const groupsChanged = JSON.stringify( newGroups ) !== JSON.stringify( this.groups );

        this.data = data;
        this.groups = newGroups;
        this.highlightedTable = null;

        if ( groupsChanged ) {
            this.activeGroups = null;
            this.toolbarEl.innerHTML = '';
            this.toolbar = buildToolbar( this );
            this.toolbarEl.appendChild( this.toolbar.el );
        }

        this.refresh();
    }

    switchRenderer( type ) {
        if ( type === this.rendererType ) return;
        this.highlightedTable = null;
        this.renderer.destroy();
        this.rendererType = type;
        this.renderer = this._createRenderer( type );
        this.refresh();
    }

    _createRenderer( type ) {
        if ( type === 'rappid' && typeof joint !== 'undefined' ) {
            return new RappidRenderer( this.canvasEl, this );
        }
        return new MermaidRenderer( this.canvasEl, this );
    }
}
