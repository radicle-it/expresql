/**
 * Toolbar UI component for DiagramPreview.
 * Builds renderer dropdown + group filter chips.
 */

/* global joint */

export function buildToolbar( diagram ) {
    const el = document.createElement( 'div' );
    el.className = 'qs-erd-toolbar';

    const hasRappid = typeof joint !== 'undefined';

    // Renderer select
    const select = document.createElement( 'select' );
    select.className = 'qs-erd-renderer-select';

    const optRappid = document.createElement( 'option' );
    optRappid.value = 'rappid';
    optRappid.textContent = 'Rappid';
    if ( hasRappid ) {
        optRappid.selected = true;
    } else {
        optRappid.disabled = true;
        optRappid.title = 'Requires Rappid library';
    }
    select.appendChild( optRappid );

    const optMermaid = document.createElement( 'option' );
    optMermaid.value = 'mermaid';
    optMermaid.textContent = 'Mermaid';
    if ( !hasRappid ) {
        optMermaid.selected = true;
    }
    select.appendChild( optMermaid );

    select.addEventListener( 'change', () => {
        diagram.switchRenderer( select.value );
    } );

    el.appendChild( select );

    // Search input
    const searchInput = document.createElement( 'input' );
    searchInput.type = 'text';
    searchInput.className = 'qs-erd-search';
    searchInput.placeholder = 'Search tables...';

    let searchMatches = [];
    let searchIndex = -1;

    searchInput.addEventListener( 'input', () => {
        const query = searchInput.value.trim().toUpperCase();
        if ( !query ) {
            searchMatches = [];
            searchIndex = -1;
            diagram.searchTable( null );
            return;
        }
        const data = diagram.getFilteredData();
        searchMatches = data.items
            .filter( i => i.name.toUpperCase().includes( query )
                || ( i.columns && i.columns.some( c => c.name.toUpperCase().includes( query ) ) ) )
            .map( i => i.name.toUpperCase() );
        if ( searchMatches.length > 0 ) {
            searchIndex = 0;
            diagram.searchTable( searchMatches[0] );
        } else {
            searchIndex = -1;
            diagram.searchTable( null );
        }
    } );

    searchInput.addEventListener( 'keydown', ( e ) => {
        if ( e.key === 'Enter' && searchMatches.length > 0 ) {
            e.preventDefault();
            searchIndex = ( searchIndex + 1 ) % searchMatches.length;
            diagram.searchTable( searchMatches[searchIndex] );
        }
        if ( e.key === 'Escape' ) {
            searchInput.value = '';
            searchInput.dispatchEvent( new Event( 'input' ) );
            searchInput.blur();
        }
    } );

    el.appendChild( searchInput );

    // Cmd/Ctrl+F focuses search
    document.addEventListener( 'keydown', ( e ) => {
        if ( ( e.metaKey || e.ctrlKey ) && e.key === 'f' ) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    } );

    // Group chips
    const groupNames = Object.keys( diagram.groups || {} );
    let chipContainer = null;

    if ( groupNames.length > 0 ) {
        chipContainer = document.createElement( 'div' );
        chipContainer.className = 'qs-erd-chip-container';

        const allChip = _createChip( 'All', true );
        allChip.addEventListener( 'click', () => {
            _setAllActive( chipContainer );
            diagram.setActiveGroups( null );
        } );
        chipContainer.appendChild( allChip );

        for ( const name of groupNames ) {
            const chip = _createChip( name, false );
            chip.addEventListener( 'click', () => {
                _toggleChip( chip, chipContainer, diagram );
            } );
            chipContainer.appendChild( chip );
        }

        el.appendChild( chipContainer );
    }

    return { el };
}

function _createChip( label, active ) {
    const chip = document.createElement( 'button' );
    chip.className = 'qs-erd-chip' + ( active ? ' active' : '' );
    chip.textContent = label;
    chip.dataset.group = label;
    return chip;
}

function _toggleChip( chip, container, diagram ) {
    const allChip = container.querySelector( '[data-group="All"]' );

    chip.classList.toggle( 'active' );

    // If a group chip is toggled, deactivate "All"
    allChip.classList.remove( 'active' );

    // Collect active groups
    const activeGroups = [];
    container.querySelectorAll( '.qs-erd-chip.active' ).forEach( c => {
        if ( c.dataset.group !== 'All' ) {
            activeGroups.push( c.dataset.group );
        }
    } );

    // If none active, reactivate "All"
    if ( activeGroups.length === 0 ) {
        allChip.classList.add( 'active' );
        diagram.setActiveGroups( null );
    } else {
        diagram.setActiveGroups( activeGroups );
    }
}

function _setAllActive( container ) {
    container.querySelectorAll( '.qs-erd-chip' ).forEach( c => {
        c.classList.remove( 'active' );
    } );
    container.querySelector( '[data-group="All"]' ).classList.add( 'active' );
}
