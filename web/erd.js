import { toERD }                     from '../dist/espresql.js';
import { state, LS_ERD_POS, LS_ERD_COL } from './state.js';

// ── Layout constants ──────────────────────────────────────────────

const NODE_W   = 240;
const HEADER_H = 32;
const COL_H    = 20;
const GAP_X    = 100;
const GAP_Y    = 80;
const RADIUS   = 6;

// ── Theme palettes ────────────────────────────────────────────────

const PALETTES = {
    dark: [
        { fill: '#162636', text: '#4fc1ff', border: '#1e6aa8' },
        { fill: '#1e2716', text: '#b5cea8', border: '#4e7a30' },
        { fill: '#261626', text: '#c586c0', border: '#8040a0' },
        { fill: '#261e10', text: '#d7ba7d', border: '#a07030' },
        { fill: '#261616', text: '#f48771', border: '#a03030' },
        { fill: '#162626', text: '#4ec9b0', border: '#207060' },
    ],
    light: [
        { fill: '#D0E8F8', text: '#005090', border: '#2070C0' },
        { fill: '#D0E8D0', text: '#1A5A1A', border: '#40A040' },
        { fill: '#E8D0E8', text: '#601060', border: '#9040A0' },
        { fill: '#F8ECD0', text: '#604000', border: '#B07020' },
        { fill: '#F8D8D0', text: '#601010', border: '#B03030' },
        { fill: '#D0ECE8', text: '#0A5050', border: '#208878' },
    ],
};

const NODE_DEFAULTS = {
    dark:  {
        table: { fill: '#162636', text: '#4fc1ff', border: '#1e6aa8' },
        view:  { fill: '#162620', text: '#9cdcfe', border: '#2a8a5a' },
    },
    light: {
        table: { fill: '#D0E8F8', text: '#005090', border: '#2070C0' },
        view:  { fill: '#D0E8E0', text: '#0A5050', border: '#30A070' },
    },
};

const ROW_COLORS = {
    dark: {
        even: '#202020', odd: '#252527', pk: '#1b2a12', fk: '#0e1c2c',
        colDefault: '#d4d4d4', colPk: '#c5a400', colFk: '#9cdcfe', colType: '#4ec9b0',
        tagPk: '#b8a030', tagFk: '#4080c0',
    },
    light: {
        even: '#FFFFFF', odd: '#F7F5F3', pk: '#FFF8E0', fk: '#EBF3FF',
        colDefault: '#2A2826', colPk: '#7A5A00', colFk: '#0050A0', colType: '#157060',
        tagPk: '#C09000', tagFk: '#3870B0',
    },
};

const GRAPH_BG  = { dark: '#1a1a1a', light: '#F0EDEA' };
const BODY_FILL = { dark: '#1a1a1a', light: '#FFFFFF' };

function currentTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

// ── Node geometry ─────────────────────────────────────────────────

function nodeH(item, isCollapsed) {
    if (isCollapsed) return HEADER_H;
    return HEADER_H + (item.columns || []).length * COL_H + 2;
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

    // X6 v2 applies transform="translate(NODE_W/2, h/2)" to every <text> in markup
    // and wraps content in <tspan dy="0.3em">. Compensate with these helpers.
    const cx = NODE_W / 2;
    const cy = h / 2;
    const tx = (ax)        => ax - cx;
    const ty = (ay, fs=12) => ay - cy - 0.3 * fs;

    const hpExpanded  = `M ${RADIUS} 0 H ${NODE_W-RADIUS} Q ${NODE_W} 0 ${NODE_W} ${RADIUS} V ${HEADER_H} H 0 V ${RADIUS} Q 0 0 ${RADIUS} 0 Z`;
    const hpCollapsed = `M ${RADIUS} 0 H ${NODE_W-RADIUS} Q ${NODE_W} 0 ${NODE_W} ${RADIUS} V ${h-RADIUS} Q ${NODE_W} ${h} ${NODE_W-RADIUS} ${h} H ${RADIUS} Q 0 ${h} 0 ${h-RADIUS} V ${RADIUS} Q 0 0 ${RADIUS} 0 Z`;
    const hp = isCollapsed ? hpCollapsed : hpExpanded;

    const accentPath = isCollapsed
        ? `M ${RADIUS} 1 H ${RADIUS+3} V ${h-1} H ${RADIUS} Q 1 ${h} 1 ${h-RADIUS} V ${RADIUS} Q 1 1 ${RADIUS} 1 Z`
        : `M ${RADIUS} 1 H ${RADIUS+3} V ${HEADER_H-1} H ${RADIUS} V ${RADIUS} Q 1 1 ${RADIUS} 1 Z`;

    const toggleGlyph = isCollapsed ? '▶' : '▾';

    const markup = [
        { tagName: 'rect', selector: 'body'    },
        { tagName: 'path', selector: 'hdr'     },
        { tagName: 'path', selector: 'accent'  },
        { tagName: 'text', selector: 'hdr-lbl' },
        { tagName: 'text', selector: 'hdr-tog' },
    ];
    if (!isCollapsed && cols.length > 0) markup.push({ tagName: 'line', selector: 'divider' });

    const attrs = {
        body:      { width: NODE_W, height: h, fill: BODY_FILL[theme], stroke: gc.border, strokeWidth: 1.5, rx: RADIUS, ry: RADIUS, filter: 'url(#qs-shadow)' },
        hdr:       { d: hp, fill: gc.fill, stroke: 'none' },
        accent:    { d: accentPath, fill: gc.border, stroke: 'none' },
        'hdr-lbl': { text: item.name, x: tx(RADIUS + 8), y: ty(HEADER_H / 2 + 4), fill: gc.text, 'font-size': 12, 'font-weight': 'bold', 'text-anchor': 'start' },
        'hdr-tog': { text: toggleGlyph, x: tx(NODE_W - 10), y: ty(HEADER_H / 2 + 4, 10), fill: gc.text, 'font-size': 10, 'font-weight': 'normal', 'text-anchor': 'end' },
        divider:   { x1: 0, y1: HEADER_H, x2: NODE_W, y2: HEADER_H, stroke: gc.border, strokeWidth: 1 },
    };

    cols.forEach((col, i) => {
        const y0  = HEADER_H + i * COL_H;
        const ym  = y0 + COL_H / 2;
        const isPk = pkCols.has(col.name);
        const isFk = fkCols.has(col.name);

        const rowFill  = isPk ? rc.pk : isFk ? rc.fk : (i % 2 === 0 ? rc.even : rc.odd);
        const hasTag   = isPk || isFk;
        const tagText  = isPk ? 'PK' : 'FK';
        const tagFill  = isPk ? rc.tagPk : rc.tagFk;
        const nameX    = hasTag ? tx(RADIUS + 8 + 26) : tx(RADIUS + 8);
        const nameFill = isPk ? rc.colPk : isFk ? rc.colFk : rc.colDefault;

        markup.push({ tagName: 'rect', selector: `rr${i}` }, { tagName: 'text', selector: `cn${i}` }, { tagName: 'text', selector: `ct${i}` });
        if (hasTag) markup.push({ tagName: 'text', selector: `tg${i}` });

        attrs[`rr${i}`] = { x: 0, y: y0, width: NODE_W, height: COL_H, fill: rowFill, stroke: 'none' };
        if (hasTag) attrs[`tg${i}`] = { text: tagText, x: tx(RADIUS + 8), y: ty(ym, 9), fill: tagFill, 'font-size': 9, 'font-weight': 'bold', 'text-anchor': 'start' };
        attrs[`cn${i}`] = { text: col.name, x: nameX, y: ty(ym, 11), fill: nameFill, 'font-size': 11, 'text-anchor': 'start' };
        attrs[`ct${i}`] = { text: col.datatype || '', x: tx(NODE_W - 10), y: ty(ym, 10), fill: rc.colType, 'font-size': 10, 'text-anchor': 'end' };
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
    const opacity = theme === 'light' ? 0.12 : 0.7;
    defs.innerHTML =
        `<filter id="qs-shadow" x="-30%" y="-30%" width="160%" height="160%">`
        + `<feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,${opacity})"/>`
        + `</filter>`;
}

export function initGraph() {
    if (state.x6graph) return;
    const X6 = window.X6;
    const erdContainer = document.getElementById('erd-container');
    if (!X6 || !X6.Graph) {
        erdContainer.innerHTML = '<div style="padding:20px;color:#f48771;font-size:12px">X6 not loaded — check the path dist/antv-x6.min.js</div>';
        return;
    }
    const theme = currentTheme();
    const { Graph } = X6;
    state.x6graph = new Graph({
        container:   erdContainer,
        width:       erdContainer.clientWidth  || 800,
        height:      erdContainer.clientHeight || 600,
        background:  { color: GRAPH_BG[theme] },
        grid:        false,
        mousewheel:  { enabled: true, zoomAtMousePosition: true, factor: 1.1, minScale: 0.15, maxScale: 4 },
        panning:     { enabled: true },
        interacting: { nodeMovable: true },
        connecting:  { enabled: false },
    });

    const svgEl = erdContainer.querySelector('svg');
    if (svgEl) updateShadowFilter(svgEl, theme);

    state.x6graph.on('node:click', ({ cell }) => {
        capturePositions();
        const id = cell.id;
        if (state.collapsed.has(id)) state.collapsed.delete(id);
        else state.collapsed.add(id);
        try { localStorage.setItem(LS_ERD_COL, JSON.stringify([...state.collapsed])); } catch (_) {}
        if (state.lastErdData) renderErdCells(state.lastErdData, true);
    });

    state.x6graph.on('node:moved', () => capturePositions());
}

function edgeStyle(mandatory) {
    const theme = currentTheme();
    const color = theme === 'light'
        ? (mandatory ? 'rgba(60,90,140,0.65)'  : 'rgba(80,110,160,0.4)')
        : (mandatory ? 'rgba(160,160,190,0.6)' : 'rgba(140,140,160,0.4)');
    return {
        line: {
            stroke: color,
            strokeWidth: 1.5,
            strokeDasharray: mandatory ? '' : '6 4',
            sourceMarker: { tagName: 'path', d: 'M 0 -6 L 0 6', stroke: color, fill: 'none', strokeWidth: 1.5 },
            targetMarker: { tagName: 'path', d: 'M -12 -7 L 0 0 L -12 7 M 0 0 L -12 0', stroke: color, fill: 'none', strokeWidth: 1.5 },
        },
    };
}

export function renderErdCells(data, keepPositions) {
    state.x6graph.clearCells();
    const erdMeta = buildErdMeta(data);

    for (const item of data.items) {
        const pos  = state.lastErdPos.get(item.name) || { x: 0, y: 0 };
        const meta = erdMeta.get(item.name) || {};
        state.x6graph.addNode({ id: item.name, ...pos, ...buildNodeDef(item, { isCollapsed: state.collapsed.has(item.name), ...meta }) });
    }

    for (const link of data.links) {
        try {
            state.x6graph.addEdge({
                source:    { cell: link.source },
                target:    { cell: link.target },
                attrs:     edgeStyle(link.mandatory !== false),
                router:    { name: 'orth' },
                connector: { name: 'rounded', args: { radius: 8 } },
            });
        } catch (e) { console.error('addEdge failed:', e); }
    }

    if (!keepPositions) {
        state.x6graph.zoomToFit({ padding: 40, maxScale: 1 });
        state.x6graph.centerContent();
    }
}

export function applyErdTheme() {
    if (!state.x6graph) return;
    const theme = currentTheme();
    state.x6graph.drawBackground({ color: GRAPH_BG[theme] });
    const erdContainer = document.getElementById('erd-container');
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
        state.x6graph.zoomToFit({ padding: 40, maxScale: 1 });
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
