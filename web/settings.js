// Settings panel — reads/writes the # settings line in the textarea.

let _update;

export function init({ update }) {
    _update = update;
}

export function parseSettings() {
    const m = document.getElementById('input').value.match(/^#\s*settings\s*=\s*\{([^}]*)\}/m);
    if (!m) return {};
    const out = {};
    const re  = /"?(\w+)"?\s*:\s*("([^"]*)"|([^,}\s]+))/g;
    let hit;
    while ((hit = re.exec(m[1])) !== null) {
        const k = hit[1];
        const v = hit[3] !== undefined ? hit[3] : hit[4];
        out[k]  = v === 'null' ? '' : v === 'true' ? 'true' : v === 'false' ? 'false' : v;
    }
    return out;
}

export function writeSettings(s) {
    const inputEl = document.getElementById('input');
    const p = [];
    const add = (key, val) => { if (val) p.push(`${key}: ${val}`); };
    const addStr = (key, val) => { if (val) p.push(`${key}: "${val}"`); };
    add('pk',                 s.pk);
    add('genpk',              s.genpk);
    add('prefixpkwithtname',  s.prefixpk);
    addStr('prefix',          s.prefix);
    addStr('schema',          s.schema);
    add('dialect',            s.dialect);
    add('db',                 s.db);
    add('semantics',          s.sem);
    add('date',               s.date);
    add('boolean',            s.bool);
    add('language',           s.lang);
    add('auditcols',          s.audit);
    add('rowversion',         s.rowver);
    add('rowkey',             s.rowkey);
    add('aienrichment',       s.aienrich);
    add('tenantid',           s.tenantid);
    addStr('tenantref',       s.tenantref);
    add('drop',               s.drop);
    add('inserts',            s.inserts);
    add('dv',                 s.dv);
    add('editionable',        s.edit);
    add('api',                s.api);
    add('apex',               s.apex);
    add('compress',           s.compress);
    add('ondelete',           s.ondelete);
    add('longvc',             s.longvc);
    add('namelen',            s.namelen);
    add('datalimit',          s.datalimit);
    addStr('createdcol',      s.createdcol);
    addStr('createdbycol',    s.createdbycol);
    addStr('updatedcol',      s.updatedcol);
    addStr('updatedbycol',    s.updatedbycol);
    addStr('transcontext',    s.transcontext);
    add('overridesettings',   s.overridesettings);
    add('verbose',            s.verbose);

    const line = p.length ? `# settings = { ${p.join(', ')} }` : '';
    const text = inputEl.value;
    if (/^#\s*settings\s*=/m.test(text)) {
        inputEl.value = line
            ? text.replace(/^#\s*settings\s*=.*$/m, line)
            : text.replace(/\n*^#\s*settings\s*=.*$\n?/m, '');
    } else if (line) {
        inputEl.value = text.trimEnd() + '\n\n' + line + '\n';
    }
    _update();
}

export function syncSettingsForm() {
    const s   = parseSettings();
    const set = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = s[key] === 'yes';
        else el.value = s[key] || '';
    };
    set('sett-pk',               'pk');
    set('sett-genpk',            'genpk');
    set('sett-prefixpk',         'prefixpkwithtname');
    set('sett-prefix',           'prefix');
    set('sett-schema',           'schema');
    set('sett-dialect',          'dialect');
    set('sett-db',               'db');
    set('sett-sem',              'semantics');
    set('sett-date',             'date');
    set('sett-bool',             'boolean');
    set('sett-lang',             'language');
    set('sett-audit',            'auditcols');
    set('sett-rowver',           'rowversion');
    set('sett-rowkey',           'rowkey');
    set('sett-aienrich',         'aienrichment');
    set('sett-tenantid',         'tenantid');
    set('sett-tenantref',        'tenantref');
    set('sett-drop',             'drop');
    set('sett-inserts',          'inserts');
    set('sett-dv',               'dv');
    set('sett-edit',             'editionable');
    set('sett-api',              'api');
    set('sett-apex',             'apex');
    set('sett-compress',         'compress');
    set('sett-ondelete',         'ondelete');
    set('sett-longvc',           'longvc');
    set('sett-namelen',          'namelen');
    set('sett-datalimit',        'datalimit');
    set('sett-createdcol',       'createdcol');
    set('sett-createdbycol',     'createdbycol');
    set('sett-updatedcol',       'updatedcol');
    set('sett-updatedbycol',     'updatedbycol');
    set('sett-transcontext',     'transcontext');
    set('sett-overridesettings', 'overridesettings');
    set('sett-verbose',          'verbose');
}

export function initSettingsPanel() {
    const panel       = document.getElementById('settings-panel');
    const btnSettings = document.getElementById('btn-settings');
    const searchEl    = document.getElementById('sett-search');
    const clearBtn    = document.getElementById('sett-search-clear');
    const applyBtn    = document.getElementById('btn-sett-apply');
    const body        = panel.querySelector('.sett-body');

    // ── Dirty-state tracking ──────────────────────────────────────
    let _snapshot = {};

    function ctrlValue(el) {
        if (!el) return '';
        return el.type === 'checkbox' ? (el.checked ? 'yes' : '') : el.value;
    }

    function captureSnapshot() {
        _snapshot = {};
        body.querySelectorAll('.sett-row').forEach(row => {
            const ctrl = row.querySelector('select, input[type=text], input[type=checkbox]');
            if (ctrl && ctrl.id) _snapshot[ctrl.id] = ctrlValue(ctrl);
        });
    }

    function refreshDirty() {
        let n = 0;
        body.querySelectorAll('.sett-row').forEach(row => {
            const ctrl = row.querySelector('select, input[type=text], input[type=checkbox]');
            if (!ctrl || !ctrl.id) return;
            const dirty = ctrlValue(ctrl) !== (_snapshot[ctrl.id] ?? '');
            row.classList.toggle('sett-row--dirty', dirty);
            if (dirty) n++;
        });
        applyBtn.classList.toggle('has-changes', n > 0);
        applyBtn.textContent = n > 0
            ? `Apply (${n} change${n > 1 ? 's' : ''})`
            : 'Apply settings';
    }

    function clearDirty() {
        body.querySelectorAll('.sett-row--dirty').forEach(r => r.classList.remove('sett-row--dirty'));
        applyBtn.classList.remove('has-changes');
        applyBtn.textContent = 'Apply settings';
    }

    body.addEventListener('change', refreshDirty);
    body.addEventListener('input',  refreshDirty);
    // ─────────────────────────────────────────────────────────────

    function filterSettings() {
        const q = searchEl.value.trim().toLowerCase();
        clearBtn.style.display = q ? '' : 'none';

        body.querySelectorAll('.sett-row').forEach(row => {
            const label = row.querySelector('label');
            const text  = label ? label.textContent.toLowerCase() : '';
            row.style.display = (!q || text.includes(q)) ? '' : 'none';
        });

        body.querySelectorAll('.sett-group').forEach(group => {
            let sibling = group.nextElementSibling;
            let hasVisible = false;
            while (sibling && !sibling.classList.contains('sett-group')) {
                if (sibling.classList.contains('sett-row') && sibling.style.display !== 'none')
                    hasVisible = true;
                sibling = sibling.nextElementSibling;
            }
            group.style.display = hasVisible ? '' : 'none';
        });
    }

    function resetSearch() {
        searchEl.value = '';
        filterSettings();
    }

    searchEl.addEventListener('input', filterSettings);
    clearBtn.addEventListener('click', () => { searchEl.value = ''; filterSettings(); searchEl.focus(); });

    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = panel.classList.toggle('open');
        if (isOpen) {
            syncSettingsForm();
            captureSnapshot();
            const r = btnSettings.getBoundingClientRect();
            panel.style.top = r.bottom + 4 + 'px';
            if (r.left < window.innerWidth / 2) {
                panel.style.left  = r.left + 'px';
                panel.style.right = '';
            } else {
                panel.style.left  = '';
                panel.style.right = (window.innerWidth - r.right) + 'px';
            }
        } else {
            clearDirty();
            resetSearch();
        }
    });

    document.getElementById('btn-sett-close').addEventListener('click', () => {
        panel.classList.remove('open');
        clearDirty();
        resetSearch();
    });

    document.getElementById('btn-sett-apply').addEventListener('click', () => {
        const v = (id) => {
            const el = document.getElementById(id);
            if (!el) return '';
            return el.type === 'checkbox' ? (el.checked ? 'yes' : '') : el.value;
        };
        writeSettings({
            pk:               v('sett-pk'),       genpk:           v('sett-genpk'),
            prefixpk:         v('sett-prefixpk'),
            prefix:           v('sett-prefix'),   schema:          v('sett-schema'),
            dialect:          v('sett-dialect'),
            db:               v('sett-db'),        sem:             v('sett-sem'),
            date:             v('sett-date'),      bool:            v('sett-bool'),
            lang:             v('sett-lang'),
            audit:            v('sett-audit'),     rowver:          v('sett-rowver'),
            rowkey:           v('sett-rowkey'),    aienrich:        v('sett-aienrich'),
            tenantid:         v('sett-tenantid'),
            tenantref:        v('sett-tenantref'),
            drop:             v('sett-drop'),      inserts:         v('sett-inserts'),
            dv:               v('sett-dv'),        edit:            v('sett-edit'),
            api:              v('sett-api'),       apex:            v('sett-apex'),
            compress:         v('sett-compress'),
            ondelete:         v('sett-ondelete'),  longvc:          v('sett-longvc'),
            namelen:          v('sett-namelen'),   datalimit:       v('sett-datalimit'),
            createdcol:       v('sett-createdcol'),    createdbycol: v('sett-createdbycol'),
            updatedcol:       v('sett-updatedcol'),    updatedbycol: v('sett-updatedbycol'),
            transcontext:     v('sett-transcontext'),
            overridesettings: v('sett-overridesettings'),
            verbose:          v('sett-verbose'),
        });
        clearDirty();
        panel.classList.remove('open');
        resetSearch();
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== btnSettings) {
            panel.classList.remove('open');
            clearDirty();
            resetSearch();
        }
    });

    return panel;
}
