import { state, LS_TABS, LS_KEY, LS_ERD_POS, LS_ERD_COL, DEFAULT_ESQL } from './state.js';

// Callbacks injected by app.js to avoid circular imports
let _update;
let _capturePositions;

export function init({ update, capturePositions }) {
    _update           = update;
    _capturePositions = capturePositions;
}

// ── Persistence ───────────────────────────────────────────────────

export function newTabData(name, qsql = '') {
    return {
        id:   Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name, qsql, pos: [], col: [],
    };
}

export function saveTabs() {
    try { localStorage.setItem(LS_TABS, JSON.stringify({ tabs: state.tabs, active: state.activeSchemaTabId })); } catch (_) {}
}

export function saveActiveTab() {
    const tab = state.tabs.find(t => t.id === state.activeSchemaTabId);
    if (!tab) return;
    tab.esql = document.getElementById('input').value;
    tab.pos  = [...state.lastErdPos.entries()];
    tab.col  = [...state.collapsed];
}

export function applyActiveTab() {
    const tab = state.tabs.find(t => t.id === state.activeSchemaTabId);
    if (!tab) return;
    document.getElementById('input').value = tab.esql;
    state.lastErdPos = new Map(tab.pos || []);
    state.collapsed.clear();
    for (const id of (tab.col || [])) state.collapsed.add(id);
    state.lastRenderedInput = null;
    renderSchemaTabs();
}

// ── Initialisation (URL hash → LS_TABS → legacy LS_KEY → default) ─

export function initTabs() {
    let hashQsql = null, hashPos = null, hashCol = null;
    try {
        const hash = window.location.hash.slice(1);
        if (hash) {
            history.replaceState(null, '', window.location.pathname);
            if (hash.startsWith('v2:')) {
                const data = JSON.parse(decodeURIComponent(hash.slice(3)));
                hashQsql = data.q || '';
                hashPos  = data.p ? new Map(data.p) : new Map();
                hashCol  = data.c ? new Set(data.c) : new Set();
            } else {
                hashQsql = decodeURIComponent(hash);
                hashPos  = new Map(); hashCol = new Set();
            }
        }
    } catch (_) {}

    let restored = false;
    try {
        const saved = localStorage.getItem(LS_TABS);
        if (saved) {
            const data = JSON.parse(saved);
            state.tabs = (data.tabs || []).map(t => ({ id: t.id, name: t.name, esql: t.esql || '', pos: t.pos || [], col: t.col || [] }));
            state.activeSchemaTabId = data.active || (state.tabs[0] && state.tabs[0].id);
            restored = state.tabs.length > 0;
        }
    } catch (_) {}

    if (!restored) {
        try {
            const legacyQsql = localStorage.getItem(LS_KEY) || DEFAULT_ESQL;
            let legacyPos = [], legacyCol = [];
            try {
                const sp = localStorage.getItem(LS_ERD_POS);
                if (sp) legacyPos = JSON.parse(sp);
                const sc = localStorage.getItem(LS_ERD_COL);
                if (sc) legacyCol = JSON.parse(sc);
            } catch (_) {}
            const t = newTabData('Schema 1', legacyQsql);
            t.pos = legacyPos; t.col = legacyCol;
            state.tabs = [t]; state.activeSchemaTabId = t.id;
        } catch (_) {
            const t = newTabData('Schema 1', DEFAULT_ESQL);
            state.tabs = [t]; state.activeSchemaTabId = t.id;
        }
    }

    if (hashQsql !== null) {
        const tab = state.tabs.find(t => t.id === state.activeSchemaTabId);
        if (tab) {
            tab.esql = hashQsql;
            tab.pos  = hashPos ? [...hashPos.entries()] : [];
            tab.col  = hashCol ? [...hashCol] : [];
        }
    }

    applyActiveTab();
}

// ── Schema tab UI ─────────────────────────────────────────────────

export function renderSchemaTabs() {
    const el = document.getElementById('schema-tabs');
    if (!el) return;
    el.innerHTML = '';
    for (const t of state.tabs) {
        const btn     = document.createElement('button');
        btn.className = 'schema-tab' + (t.id === state.activeSchemaTabId ? ' active' : '');
        btn.dataset.id = t.id;
        btn.title     = t.name;

        const nameEl  = document.createElement('span');
        nameEl.className   = 'tab-name';
        nameEl.textContent = t.name;

        const closeEl = document.createElement('span');
        closeEl.className   = 'tab-close';
        closeEl.textContent = '×';
        closeEl.title       = 'Close tab';

        btn.appendChild(nameEl);
        btn.appendChild(closeEl);
        el.appendChild(btn);

        btn.addEventListener('click',   (e) => { if (e.target !== closeEl) switchSchemaTab(t.id); });
        btn.addEventListener('dblclick',(e) => { if (e.target !== closeEl) startTabRename(t.id, nameEl); });
        closeEl.addEventListener('click', (e) => { e.stopPropagation(); closeSchemaTab(t.id); });
    }

    const addBtn       = document.createElement('button');
    addBtn.className   = 'schema-tab-add';
    addBtn.title       = 'New tab';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', addSchemaTab);
    el.appendChild(addBtn);
}

export function switchSchemaTab(id) {
    if (id === state.activeSchemaTabId) return;
    if (state.activeTab === 'erd') _capturePositions();
    saveActiveTab();
    state.activeSchemaTabId = id;
    applyActiveTab();
    _update();
    saveTabs();
}

export function addSchemaTab() {
    saveActiveTab();
    const t = newTabData('Schema ' + (state.tabs.length + 1), '');
    state.tabs.push(t);
    state.activeSchemaTabId = t.id;
    applyActiveTab();
    _update();
    saveTabs();
}

export function closeSchemaTab(id) {
    if (state.tabs.length <= 1) return;
    const idx = state.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    if (id === state.activeSchemaTabId) {
        const next = state.tabs[idx - 1] || state.tabs[idx + 1];
        state.tabs.splice(idx, 1);
        state.activeSchemaTabId = next.id;
        applyActiveTab();
        _update();
    } else {
        state.tabs.splice(idx, 1);
        renderSchemaTabs();
    }
    saveTabs();
}

function startTabRename(tabId, nameEl) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    const oldName = tab.name;
    nameEl.contentEditable = 'true';
    nameEl.focus();
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    nameEl.addEventListener('blur', function done() {
        nameEl.removeEventListener('blur', done);
        nameEl.contentEditable = 'false';
        tab.name = nameEl.textContent.trim() || oldName;
        nameEl.textContent = tab.name;
        saveTabs();
    });
    nameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
        if (e.key === 'Escape') { nameEl.textContent = oldName; nameEl.blur(); }
    });
}
