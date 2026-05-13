// Directive autocomplete popup for the ExpreSQL editor.

let _update;

export function init({ update }) {
    _update = update;
}

const DIRECTIVES = [
    { cmd: '/nn',         desc: 'NOT NULL' },
    { cmd: '/unique',     desc: 'UNIQUE constraint' },
    { cmd: '/pk',         desc: 'Declare as primary key' },
    { cmd: '/fk',         desc: 'Foreign key — /fk table_name' },
    { cmd: '/index',      desc: 'Create index on column' },
    { cmd: '/lower',      desc: 'Trigger: force lowercase' },
    { cmd: '/upper',      desc: 'Trigger: force uppercase' },
    { cmd: '/check',      desc: 'CHECK IN — /check A,B,C' },
    { cmd: '/between',    desc: 'CHECK BETWEEN — /between A,B' },
    { cmd: '/default',    desc: 'DEFAULT value — /default val' },
    { cmd: '/insert',     desc: 'Sample rows — /insert N' },
    { cmd: '/rest',       desc: 'Enable ORDS REST' },
    { cmd: '/audit',      desc: 'Add audit columns' },
    { cmd: '/rowversion', desc: 'Row version (OCC)' },
    { cmd: '/api',        desc: 'Table API (TAPI)' },
    { cmd: '/auditlog',   desc: 'Audit package with autonomous transaction' },
    { cmd: '/immutable',  desc: 'Immutable table (no UPDATE/DELETE)' },
    { cmd: '/history',    desc: 'Temporal history tracking' },
    { cmd: '/soda',       desc: 'SODA document store' },
];

let acEl;
let acInsertStart  = 0;
let acSelectedIdx  = 0;
let acCurrentItems = [];

function hideAutocomplete() {
    acEl.classList.remove('open');
    acCurrentItems = [];
}

function renderAcSelection() {
    acEl.querySelectorAll('.ac-item').forEach((el, i) => {
        el.classList.toggle('selected', i === acSelectedIdx);
        if (i === acSelectedIdx) el.scrollIntoView({ block: 'nearest' });
    });
}

function insertDirective(d) {
    const inputEl = document.getElementById('input');
    const v   = inputEl.value;
    const end = inputEl.selectionStart;
    const trailingWord = v.slice(end).match(/^\w*/)[0];
    inputEl.value = v.slice(0, acInsertStart) + d.cmd + ' ' + v.slice(end + trailingWord.length);
    const pos = acInsertStart + d.cmd.length + 1;
    inputEl.selectionStart = inputEl.selectionEnd = pos;
    hideAutocomplete();
    _update();
}

function showAutocomplete(items, insertStart) {
    const inputEl  = document.getElementById('input');
    acCurrentItems = items;
    acInsertStart  = insertStart;
    acSelectedIdx  = 0;
    acEl.innerHTML = '';

    items.forEach((d, i) => {
        const row = document.createElement('div');
        row.className = 'ac-item' + (i === 0 ? ' selected' : '');
        row.innerHTML = `<span class="ac-cmd">${d.cmd}</span><span class="ac-desc">${d.desc}</span>`;
        row.addEventListener('mousedown', (e) => { e.preventDefault(); insertDirective(d); });
        acEl.appendChild(row);
    });

    const rect    = inputEl.getBoundingClientRect();
    const text    = inputEl.value.slice(0, inputEl.selectionStart);
    const lineIdx = (text.match(/\n/g) || []).length;
    const lh      = 13 * 1.65;
    let top  = rect.top + 14 + (lineIdx + 1) * lh - inputEl.scrollTop;
    const left = rect.left + 56;

    acEl.style.visibility = 'hidden';
    acEl.classList.add('open');
    const acH = acEl.offsetHeight;
    acEl.style.visibility = '';
    if (top + acH > window.innerHeight - 8) {
        top = rect.top + 14 + lineIdx * lh - inputEl.scrollTop - acH - 2;
    }
    acEl.style.top  = Math.max(4, top) + 'px';
    acEl.style.left = Math.max(4, left) + 'px';
}

export function checkAutocomplete() {
    const inputEl   = document.getElementById('input');
    const s         = inputEl.selectionStart;
    const text      = inputEl.value.slice(0, s);
    const lineStart = text.lastIndexOf('\n') + 1;
    const lineText  = text.slice(lineStart);

    if (lineText.trimStart().startsWith('#')) { hideAutocomplete(); return; }

    const match = lineText.match(/\/(\w*)$/);
    if (!match) { hideAutocomplete(); return; }

    const query    = match[1].toLowerCase();
    const filtered = DIRECTIVES.filter(d => d.cmd.slice(1).startsWith(query));
    if (!filtered.length) { hideAutocomplete(); return; }

    showAutocomplete(filtered, s - match[0].length);
}

// Called from app.js keydown handler — returns true if the event was consumed.
export function handleKeydown(e) {
    if (!acEl || !acEl.classList.contains('open')) return false;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        acSelectedIdx = Math.min(acSelectedIdx + 1, acCurrentItems.length - 1);
        renderAcSelection(); return true;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        acSelectedIdx = Math.max(acSelectedIdx - 1, 0);
        renderAcSelection(); return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (acCurrentItems[acSelectedIdx]) insertDirective(acCurrentItems[acSelectedIdx]);
        return true;
    }
    if (e.key === 'Escape') { hideAutocomplete(); return true; }
    return false;
}

export function initAutocomplete() {
    acEl = document.getElementById('autocomplete');
    document.getElementById('input').addEventListener('blur', () => setTimeout(hideAutocomplete, 120));
}
