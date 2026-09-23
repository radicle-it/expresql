import { toERD }                     from '../dist/expresql.js';
import { state, LS_ERD_POS, LS_ERD_COL } from './state.js';

// ── Layout constants ──────────────────────────────────────────────

const NODE_W   = 280;
const HEADER_H = 40;
const COL_H    = 26;
const GAP_X    = 130;
const GAP_Y    = 110;
const RADIUS   = 8;

// ── Theme palettes ────────────────────────────────────────────────

const PALETTES = {
    light: [
        { fill: '#2D5F8A', text: '#FFFFFF', border: '#2D5F8A', body: '#FFFFFF' },
        { fill: '#7C3AED', text: '#FFFFFF', border: '#7C3AED', body: '#FFFFFF' },
        { fill: '#047857', text: '#FFFFFF', border: '#047857', body: '#FFFFFF' },
        { fill: '#B45309', text: '#FFFFFF', border: '#B45309', body: '#FFFFFF' },
        { fill: '#BE123C', text: '#FFFFFF', border: '#BE123C', body: '#FFFFFF' },
        { fill: '#0E7490', text: '#FFFFFF', border: '#0E7490', body: '#FFFFFF' },
    ],
    dark: [
        { fill: '#1E3A5F', text: '#93C5FD', border: '#3B82F6', body: '#1A2236' },
        { fill: '#3B1F6B', text: '#C4B5FD', border: '#8B5CF6', body: '#1A2236' },
        { fill: '#064E3B', text: '#6EE7B7', border: '#10B981', body: '#1A2236' },
        { fill: '#451A03', text: '#FCD34D', border: '#F59E0B', body: '#1A2236' },
        { fill: '#4C0519', text: '#FCA5A5', border: '#F87171', body: '#1A2236' },
        { fill: '#083344', text: '#67E8F9', border: '#22D3EE', body: '#1A2236' },
    ],
};

const NODE_DEFAULTS = {
    dark:  {
        table: { fill: '#1E3A5F', text: '#93C5FD', border: '#3B82F6', body: '#1A2236' },
        view:  { fill: '#064E3B', text: '#6EE7B7', border: '#10B981', body: '#1A2236' },
    },
    light: {
        table: { fill: '#2D5F8A', text: '#FFFFFF', border: '#2D5F8A', body: '#FFFFFF' },
        view:  { fill: '#047857', text: '#FFFFFF', border: '#047857', body: '#FFFFFF' },
    },
};

const ICON_PK = '⚷';
const ICON_FK = '⬡';

const ROW_COLORS = {
    dark: {
        row:        '#1A2236',
        colDefault: '#CBD5E1',
        colPk:      '#FCD34D',
        colFk:      '#93C5FD',
        colType:    '#64748B',
        iconPk:     '#EAB308',
        iconFk:     '#60A5FA',
        labelColor: '#475569',
    },
    light: {
        row:        '#FFFFFF',
        colDefault: '#374151',
        colPk:      '#92400E',
        colFk:      '#1D4ED8',
        colType:    '#6B7280',
        iconPk:     '#D97706',
        iconFk:     '#2563EB',
        labelColor: '#94A3B8',
    },
};

const GRAPH_BG  = { dark: '#0F172A', light: '#F1F5F9' };
const BODY_FILL = { dark: '#1A2236', light: '#FFFFFF' };

// Module-level highlight state (not in state.js to avoid coupling)
let _activeEdgeCells  = [];   // currently highlighted edge Cell objects
let _highlightedNodeId = null;
let _flowTimer = null;

function currentTheme() {
    const r = document.querySelector('.expresql-plugin-root') || document.documentElement;
    return r.dataset.theme === 'light' ? 'light' : 'dark';
}

// ── CSS animation injection ───────────────────────────────────────

function injectErdAnimCSS() {
    if (document.getElementById('qs-erd-anim')) return;
    const s = document.createElement('style');
    s.id = 'qs-erd-anim';
    // !important needed: X6 sets some attrs as inline styles which beat CSS class selectors.
    // stroke-dasharray: 0 + round linecap = zero-length dash rendered as a pure circle dot.
    // Keyframe offset = -(0 + gap) = -24 for one full cycle.
    s.textContent = `
        @keyframes qs-edge-flow { to { stroke-dashoffset: -24; } }
        .qs-edge-hl {
            stroke:            #3B82F6 !important;
            stroke-width:      6px     !important;
            stroke-linecap:    round   !important;
            stroke-dasharray:  0 24    !important;
            animation: qs-edge-flow 1.2s linear infinite;
        }
    `;
    document.head.appendChild(s);
}

// ── Node geometry ─────────────────────────────────────────────────

function nodeH(item, isCollapsed) {
    if (isCollapsed) return HEADER_H;
    return HEADER_H + (item.columns || []).length * COL_H + 1;
}

function buildErdMeta(data) {
    const palette = PALETTES[currentTheme()];
    const meta = new Map();
    for (const item of data.items) meta.set(item.name, { pkCols: new Set(), fkCols: new Set(), groupColor: null });

    for (const { source, source_id } of data.links) meta.get(source)?.pkCols.add(source_id);
    for (const { target, target_id } of data.links) meta.get(target)?.fkCols.add(target_id);

    const groupEntries = Object.entries(data.groups || {});
    groupEntries.forEach(([, tables], gi) => {
        const color = palette[gi % palette.length];
        for (const tbl of tables) { if (meta.has(tbl)) meta.get(tbl).groupColor = color; }
    });

    return meta;
}

export function buildNodeDef(item, { isCollapsed = false, pkCols = new Set(), fkCols = new Set(), groupColor = null } = {}) {
    const theme  = currentTheme();
    const nd     = NODE_DEFAULTS[theme];
    const rc     = ROW_COLORS[theme];
    const isView = item.type === 'view';
    const gc     = groupColor || (isView ? nd.view : nd.table);

    const h    = nodeH(item, isCollapsed);
    const cols = isCollapsed ? [] : (item.columns || []);

    const cx = NODE_W / 2;
    const cy = h / 2;
    const tx = (ax) => ax - cx;
    const ty = (ay, fs = 12) => ay - cy - 0.3 * fs;

    const hpExpanded  = `M ${RADIUS} 0 H ${NODE_W-RADIUS} Q ${NODE_W} 0 ${NODE_W} ${RADIUS} V ${HEADER_H} H 0 V ${RADIUS} Q 0 0 ${RADIUS} 0 Z`;
    const hpCollapsed = `M ${RADIUS} 0 H ${NODE_W-RADIUS} Q ${NODE_W} 0 ${NODE_W} ${RADIUS} V ${h-RADIUS} Q ${NODE_W} ${h} ${NODE_W-RADIUS} ${h} H ${RADIUS} Q 0 ${h} 0 ${h-RADIUS} V ${RADIUS} Q 0 0 ${RADIUS} 0 Z`;
    const hp = isCollapsed ? hpCollapsed : hpExpanded;

    const toggleGlyph = isCollapsed ? '▶' : '▾';
    const labelY = HEADER_H / 2 + 5;
    const viewTag = isView ? '  ⬡' : '';

    const markup = [
        { tagName: 'rect', selector: 'body'    },
        { tagName: 'path', selector: 'hdr'     },
        { tagName: 'text', selector: 'hdr-lbl' },
        { tagName: 'text', selector: 'hdr-tog' },
    ];
    if (!isCollapsed && cols.length > 0) markup.push({ tagName: 'line', selector: 'divider' });

    const attrs = {
        body:      { width: NODE_W, height: h, fill: gc.body || BODY_FILL[theme], stroke: gc.border, strokeWidth: 1.5, rx: RADIUS, ry: RADIUS, filter: 'url(#qs-shadow)' },
        hdr:       { d: hp, fill: gc.fill, stroke: 'none' },
        'hdr-lbl': { text: item.name + viewTag, x: tx(14), y: ty(labelY, 13), fill: gc.text, 'font-size': 13, 'font-weight': 'bold', 'text-anchor': 'start' },
        'hdr-tog': { text: toggleGlyph, x: tx(NODE_W - 12), y: ty(labelY, 11), fill: gc.text, 'font-size': 11, 'text-anchor': 'end' },
        divider:   { x1: 0, y1: HEADER_H, x2: NODE_W, y2: HEADER_H, stroke: gc.border, strokeWidth: 1, opacity: 0.4 },
    };

    cols.forEach((col, i) => {
        const y0   = HEADER_H + i * COL_H;
        const ym   = y0 + COL_H / 2;
        const isPk = pkCols.has(col.name);
        const isFk = fkCols.has(col.name);
        const hasIcon = isPk || isFk;

        const iconChar = isPk ? ICON_PK : ICON_FK;
        const iconFill = isPk ? rc.iconPk : rc.iconFk;
        const nameX    = hasIcon ? tx(26) : tx(12);
        const nameFill = isPk ? rc.colPk : isFk ? rc.colFk : rc.colDefault;

        markup.push(
            { tagName: 'rect', selector: `rr${i}` },
            { tagName: 'text', selector: `cn${i}` },
            { tagName: 'text', selector: `ct${i}` },
        );
        if (hasIcon) markup.push({ tagName: 'text', selector: `ic${i}` });

        attrs[`rr${i}`] = { x: 0, y: y0, width: NODE_W, height: COL_H, fill: rc.row, stroke: 'none' };
        attrs[`cn${i}`] = {
            text: col.name,
            x: nameX, y: ty(ym, 12),
            fill: nameFill,
            'font-size': 12,
            'font-weight': isPk ? '600' : '400',
            'text-anchor': 'start',
        };
        attrs[`ct${i}`] = {
            text: col.datatype || '',
            x: tx(NODE_W - 10), y: ty(ym, 11),
            fill: rc.colType,
            'font-size': 11,
            'text-anchor': 'end',
            'font-style': 'italic',
        };
        if (hasIcon) {
            attrs[`ic${i}`] = {
                text: iconChar,
                x: tx(12), y: ty(ym, 11),
                fill: iconFill,
                'font-size': 11,
                'text-anchor': 'start',
            };
        }
    });

    return { markup, attrs, width: NODE_W, height: h };
}

// ── BFS layout ────────────────────────────────────────────────────

export function computeLayout(data) {
    const { items, links } = data;
    const childOf  = new Map(items.map(i => [i.name, []]));
    const parentOf = new Map(items.map(i => [i.name, []]));

    for (const { source, target } of links) {
        childOf.get(source)?.push(target);
        parentOf.get(target)?.push(source);
    }

    const level = new Map();
    const queue = items.filter(i => !(parentOf.get(i.name) || []).length).map(i => [i.name, 0]);
    if (!queue.length && items.length) queue.push([items[0].name, 0]);

    while (queue.length) {
        const [name, lv] = queue.shift();
        if (level.has(name) && level.get(name) >= lv) continue;
        level.set(name, lv);
        for (const c of (childOf.get(name) || [])) queue.push([c, lv + 1]);
    }
    for (const { name } of items) if (!level.has(name)) level.set(name, 0);

    const byLv = new Map();
    for (const [name, lv] of level) {
        if (!byLv.has(lv)) byLv.set(lv, []);
        byLv.get(lv).push(name);
    }

    const nameToItem = new Map(items.map(i => [i.name, i]));
    const pos = new Map();
    let y = 0;
    for (const [, names] of [...byLv.entries()].sort(([a], [b]) => a - b)) {
        const maxH = Math.max(...names.map(n => nodeH(nameToItem.get(n) || { columns: [] }, false)));
        let x = 0;
        for (const name of names) { pos.set(name, { x, y }); x += NODE_W + GAP_X; }
        y += maxH + GAP_Y;
    }
    return pos;
}

// ── X6 graph ──────────────────────────────────────────────────────

export function capturePositions() {
    if (!state.x6graph) return;
    for (const cell of state.x6graph.getCells()) {
        if (cell.isNode()) state.lastErdPos.set(cell.id, cell.getPosition());
    }
    try { localStorage.setItem(LS_ERD_POS, JSON.stringify([...state.lastErdPos.entries()])); } catch (_) {}
}

function updateShadowFilter(svgEl, theme) {
    const existing = svgEl.querySelector('#qs-shadow');
    if (existing) existing.remove();
    let defs = svgEl.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgEl.insertBefore(defs, svgEl.firstChild);
    }
    const opacity = theme === 'light' ? 0.08 : 0.50;
    defs.innerHTML =
        `<filter id="qs-shadow" x="-25%" y="-25%" width="150%" height="150%">`
        + `<feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="rgba(0,0,0,${opacity})"/>`
        + `</filter>`;
}

// ── Edge highlight / animation ────────────────────────────────────

function getEdgeLinePath(graph, cell) {
    const view = graph.findViewByCell(cell);
    if (!view) return null;
    // X6 v2 marks attrs-bound elements with data-selector
    return view.container.querySelector('[data-selector="line"]')
        || view.container.querySelector('path');
}

function startEdgeHighlight(graph, cell) {
    const el = getEdgeLinePath(graph, cell);
    if (el) el.classList.add('qs-edge-hl');
}

function stopEdgeHighlight(graph, cell) {
    const el = getEdgeLinePath(graph, cell);
    if (el) el.classList.remove('qs-edge-hl');
}

function clearHighlight(graph) {
    for (const cell of _activeEdgeCells) stopEdgeHighlight(graph, cell);
    _activeEdgeCells   = [];
    _highlightedNodeId = null;
    if (_flowTimer) { clearTimeout(_flowTimer); _flowTimer = null; }
}

// Walk up the DOM from the clicked SVG element to find the first data-selector
function clickedSelector(e) {
    let el = e.target;
    while (el && el.getAttribute) {
        const s = el.getAttribute('data-selector');
        if (s) return s;
        el = el.parentElement;
    }
    return null;
}

// ── Edge style + crow's foot markers ─────────────────────────────

function edgeStyle(mandatory) {
    const theme = currentTheme();
    const color = theme === 'light'
        ? (mandatory ? '#94A3B8' : '#CBD5E1')
        : (mandatory ? '#475569' : '#2D3A4E');

    // Source (1/PK side): single perpendicular tick  |
    const srcPath = 'M 0 -4 L 0 4';

    // Target (N/FK side) — compact crow's foot like dbdiagram:
    //   mandatory  → |<  pre-tick (4 px) + three-tine fork (5 px deep, ±3 amplitude)
    //   optional   → ○<  small circle (r=2.5, 10 px out) + same fork
    const tgtPath = mandatory
        ? 'M 0 -3 L -5 0 L 0 3 M 0 0 L -5 0 M -2 -3 L -2 3'
        : 'M 0 -3 L -5 0 L 0 3 M 0 0 L -5 0 M -13 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0';

    return {
        line: {
            stroke: color,
            strokeWidth: 1.5,
            strokeDasharray: mandatory ? '' : '7 4',
            sourceMarker: { tagName: 'path', d: srcPath, stroke: color, fill: 'none', strokeWidth: 1.5 },
            targetMarker: { tagName: 'path', d: tgtPath, stroke: color, fill: 'none', strokeWidth: 1.5 },
        },
    };
}

function edgeLabels(mandatory) {
    const theme = currentTheme();
    const fill  = ROW_COLORS[theme].labelColor;
    // Custom markup: plain text only, no background rect
    const lbl   = [{ tagName: 'text', selector: 'label' }];
    const base  = {
        fill, fontSize: 10,
        'font-family': 'monospace', 'font-weight': '600',
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
    };
    return [
        {
            markup:   lbl,
            attrs:    { label: { ...base, text: '1' } },
            // 25 px absolute from source — past the source marker (5 px)
            position: { distance: 25, offset: 10 },
        },
        {
            markup:   lbl,
            attrs:    { label: { ...base, text: mandatory ? '1..*' : '0..*' } },
            // -25 px from target — past the crow's foot marker (max 17 px)
            position: { distance: -25, offset: 10 },
        },
    ];
}

export function initGraph() {
    if (state.x6graph) return;
    injectErdAnimCSS();

    const X6 = window.X6;
    const erdContainer = document.getElementById('erd-container');
    if (!X6 || !X6.Graph) {
        erdContainer.innerHTML = '<div style="padding:20px;color:#f48771;font-size:12px">X6 not loaded — check the path dist/antv-x6.min.js</div>';
        return;
    }
    const theme = currentTheme();
    const { Graph } = X6;
    erdContainer.style.background = GRAPH_BG[theme];
    state.x6graph = new Graph({
        container:   erdContainer,
        width:       erdContainer.clientWidth  || 800,
        height:      erdContainer.clientHeight || 600,
        grid:        false,
        mousewheel:  { enabled: true, zoomAtMousePosition: true, factor: 1.1, minScale: 0.15, maxScale: 4 },
        panning:     { enabled: true },
        interacting: { nodeMovable: true },
        connecting:  { enabled: false },
    });

    const svgEl = erdContainer.querySelector('svg');
    if (svgEl) updateShadowFilter(svgEl, theme);

    state.x6graph.on('node:click', ({ cell, e }) => {
        // Compute click position relative to the node (in graph coords)
        const rect    = erdContainer.getBoundingClientRect();
        const zoom    = state.x6graph.zoom();
        const pan     = state.x6graph.translate();          // { tx, ty }
        const graphX  = (e.clientX - rect.left - pan.tx) / zoom;
        const graphY  = (e.clientY - rect.top  - pan.ty) / zoom;
        const nodePos = cell.getPosition();
        const relX    = graphX - nodePos.x;
        const relY    = graphY - nodePos.y;

        const inHeader = relY >= 0 && relY < HEADER_H;
        const inToggle = inHeader && relX > NODE_W - 24;   // toggle glyph is far right

        if (inToggle) {
            // Toggle glyph → collapse / expand
            capturePositions();
            const id = cell.id;
            if (state.collapsed.has(id)) state.collapsed.delete(id);
            else state.collapsed.add(id);
            try { localStorage.setItem(LS_ERD_COL, JSON.stringify([...state.collapsed])); } catch (_) {}
            if (state.lastErdData) renderErdCells(state.lastErdData, true);
        } else if (inHeader) {
            // Header click → toggle highlight on all connected edges
            if (_highlightedNodeId === cell.id) {
                clearHighlight(state.x6graph);
            } else {
                clearHighlight(state.x6graph);
                _highlightedNodeId = cell.id;
                const connected = state.x6graph.getConnectedEdges(cell);
                _activeEdgeCells = [...connected];
                _flowTimer = setTimeout(() => {
                    for (const edge of connected) startEdgeHighlight(state.x6graph, edge);
                }, 30);
            }
        }
        // Body row click: no action
    });

    state.x6graph.on('node:moved', () => capturePositions());

    // Edge click: toggle highlight + flow animation
    state.x6graph.on('edge:click', ({ cell }) => {
        const alreadySelected = _activeEdgeCells.length === 1 && _activeEdgeCells[0].id === cell.id;
        clearHighlight(state.x6graph);
        if (!alreadySelected) {
            _activeEdgeCells = [cell];
            _flowTimer = setTimeout(() => startEdgeHighlight(state.x6graph, cell), 30);
        }
    });

    state.x6graph.on('blank:click', () => clearHighlight(state.x6graph));

    // Resize graph canvas when the container changes size (split-bar drag, window resize).
    // graph.resize() keeps the SVG canvas sized to the container. CSS background on the
    // container covers the rest — no X6 background rect needed.
    const ro = new ResizeObserver(() => {
        if (!state.x6graph) return;
        const w = erdContainer.clientWidth;
        const h = erdContainer.clientHeight;
        if (w > 0 && h > 0) {
            state.x6graph.resize(w, h);
            erdContainer.style.background = GRAPH_BG[currentTheme()];
        }
    });
    ro.observe(erdContainer);
}

export function renderErdCells(data, keepPositions) {
    clearHighlight(state.x6graph);
    state.x6graph.clearCells();
    const erdMeta = buildErdMeta(data);

    for (const item of data.items) {
        const pos  = state.lastErdPos.get(item.name) || { x: 0, y: 0 };
        const meta = erdMeta.get(item.name) || {};
        state.x6graph.addNode({ id: item.name, ...pos, ...buildNodeDef(item, { isCollapsed: state.collapsed.has(item.name), ...meta }) });
    }

    for (const link of data.links) {
        try {
            const mandatory = link.mandatory !== false;
            state.x6graph.addEdge({
                source:    { cell: link.source },
                target:    { cell: link.target },
                attrs:     edgeStyle(mandatory),
                router:    { name: 'orth' },
                connector: { name: 'rounded', args: { radius: 12 } },
            });
        } catch (e) { console.error('addEdge failed:', e); }
    }

    if (!keepPositions) {
        state.x6graph.zoomToFit({ padding: 48, maxScale: 1 });
        state.x6graph.centerContent();
    }
}

export function applyErdTheme() {
    if (!state.x6graph) return;
    const theme = currentTheme();
    const erdContainer = document.getElementById('erd-container');
    if (erdContainer) erdContainer.style.background = GRAPH_BG[theme];
    const svgEl = erdContainer && erdContainer.querySelector('svg');
    if (svgEl) updateShadowFilter(svgEl, theme);
    if (state.lastErdData) renderErdCells(state.lastErdData, true);
}

export function renderERD(data) {
    initGraph();
    if (!state.x6graph) return;
    state.lastErdData = data;
    const hadSaved = state.lastErdPos.size > 0;
    const freshPos = computeLayout(data);
    for (const item of data.items) {
        if (!state.lastErdPos.has(item.name)) state.lastErdPos.set(item.name, freshPos.get(item.name) || { x: 0, y: 0 });
    }
    renderErdCells(data, hadSaved);
    if (hadSaved) {
        state.x6graph.zoomToFit({ padding: 48, maxScale: 1 });
        state.x6graph.centerContent();
    }
}

export function updateDiagram(keepPositions = false) {
    const inputEl      = document.getElementById('input');
    const statusEl     = document.getElementById('status');
    const erdContainer = document.getElementById('erd-container');
    const src = inputEl.value;
    if (state.x6graph && src === state.lastRenderedInput) return;
    try {
        const data      = toERD(src);
        const prevItems = state.lastErdData ? state.lastErdData.items : [];
        state.lastRenderedInput = src;
        state.lastErdData       = data;

        if (keepPositions && state.x6graph) {
            const freshPos = computeLayout(data);
            for (let idx = 0; idx < data.items.length; idx++) {
                const item = data.items[idx];
                if (state.lastErdPos.has(item.name)) continue;
                const prev = prevItems[idx];
                if (prev && state.lastErdPos.has(prev.name)) {
                    state.lastErdPos.set(item.name, state.lastErdPos.get(prev.name));
                } else {
                    state.lastErdPos.set(item.name, freshPos.get(item.name) || { x: 0, y: 0 });
                }
            }
            renderErdCells(data, true);
        } else {
            renderERD(data);
        }
    } catch (e) {
        if (state.x6graph) {
            statusEl.textContent = 'ERD: ' + (e && e.message ? e.message : e).toString().slice(0, 100);
        } else {
            erdContainer.innerHTML =
                `<div style="padding:20px;color:#f48771;font-size:12px;white-space:pre-wrap">Diagram error:\n${e && e.message ? e.message : e}</div>`;
        }
    }
}
