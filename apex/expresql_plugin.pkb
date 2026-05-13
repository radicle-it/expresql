create or replace package body expresql_plugin as

    -- ── shorthand ──────────────────────────────────────────────────────────
    procedure h(p in varchar2) as begin sys.htp.p(p); end;

    function render (
        p_region in            apex_plugin.t_region,
        p_plugin in            apex_plugin.t_plugin,
        p_param  in            apex_plugin.t_region_render_param,
        p_result in out nocopy apex_plugin.t_region_render_result
    ) return apex_plugin.t_region_render_result
    as
        l_theme      varchar2(20)   := lower(nvl(p_region.attribute_01, 'apex'));
        l_height     varchar2(200)  := nvl(p_region.attribute_02, 'calc(100vh - 120px)');
        l_share      varchar2(1)    := nvl(p_region.attribute_03, 'N');
        l_files_base varchar2(4000) := nvl(p_region.attribute_04, '#APP_IMAGES#expresql/');

        l_prefix     varchar2(4000);
        l_share_cls  varchar2(20);
    begin
        -- Resolve #APP_IMAGES# / #WORKSPACE_IMAGES# substitutions
        l_prefix := replace(l_files_base, '#APP_IMAGES#',    apex_application.g_image_prefix);
        l_prefix := replace(l_prefix,     '#WORKSPACE_IMAGES#', apex_application.g_workspace_image_prefix);

        -- Validate theme
        if l_theme not in ('dark', 'light', 'apex') then
            l_theme := 'apex';
        end if;

        l_share_cls := case when l_share = 'Y' then ' show-share' else '' end;

        -- ── CSS ──────────────────────────────────────────────────────────────
        apex_css.add_file(p_url => l_prefix || 'web/app.css',         p_key => 'expresql-app-css');
        apex_css.add_file(p_url => l_prefix || 'apex/apex-plugin.css', p_key => 'expresql-plugin-css');

        -- ── JavaScript (loaded at end of <body>, in order) ───────────────────
        apex_javascript.add_library(
            p_name            => 'antv-x6.min.js',
            p_directory       => l_prefix || 'dist/',
            p_version         => null,
            p_skip_if_loaded  => true,
            p_key             => 'antv-x6');
        apex_javascript.add_library(
            p_name            => 'app_all.js',
            p_directory       => l_prefix || 'web/',
            p_version         => null,
            p_skip_if_loaded  => true,
            p_key             => 'expresql-app');

        -- ── Plugin root ───────────────────────────────────────────────────────
        h('<div class="expresql-plugin-root' || l_share_cls || '"'
            || ' data-theme="' || l_theme || '"'
            || ' style="height:' || sys.htf.escape_sc(l_height) || '">');

        -- ── Toolbar ───────────────────────────────────────────────────────────
        h('<div class="expresql-toolbar">');
        h('  <span class="title">ExpreSQL</span>');
        h('  <span class="spacer"></span>');
        h('  <button id="btn-examples" class="tool-btn">Examples &#x25BE;</button>');
        h('  <button id="btn-settings" class="tool-btn">&#x2699; Settings</button>');
        h('  <button id="btn-help"     class="tool-btn" aria-label="Help">&#x24D8; Help</button>');
        h('  <button id="btn-theme"    class="tool-btn" aria-pressed="true">&#x2600;</button>');
        h('</div>');

        -- ── Examples dropdown (populated by JS) ───────────────────────────────
        h('<div id="examples-panel"></div>');

        -- ── Settings panel ────────────────────────────────────────────────────
        h('<div id="settings-panel">');
        h('  <div class="sett-hdr">Settings<button class="sett-close" id="btn-sett-close" aria-label="Close settings">&times;</button></div>');
        h('  <div class="sett-search-wrap">');
        h('    <span class="sett-search-icon">&#x1F50D;</span>');
        h('    <input id="sett-search" type="text" placeholder="Filter settings&hellip;" autocomplete="off">');
        h('    <button id="sett-search-clear" class="sett-search-clear" title="Clear">&#x00D7;</button>');
        h('  </div>');
        h('  <div class="sett-tab-bar">');
        h('    <button class="sett-tab" data-tab="schema">Schema</button>');
        h('    <button class="sett-tab" data-tab="types">Types</button>');
        h('    <button class="sett-tab" data-tab="columns">Columns</button>');
        h('    <button class="sett-tab" data-tab="output">Output</button>');
        h('    <button class="sett-tab" data-tab="advanced">Advanced</button>');
        h('  </div>');
        h('  <div class="sett-body">');

        -- Schema pane
        h('    <div class="sett-pane" data-pane="schema">');
        h('      <div class="sett-group">Primary Key</div>');
        h('      <div class="sett-row"><label for="sett-pk">PK type</label>');
        h('        <select id="sett-pk"><option value="">&#x2014; default (guid) &#x2014;</option>');
        h('          <option value="identityDataType">identityDataType</option>');
        h('          <option value="guid">guid</option><option value="seq">seq (sequence)</option>');
        h('          <option value="none">none</option></select></div>');
        h('      <div class="sett-row"><label for="sett-genpk">Auto PK</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-genpk"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-prefixpk">Prefix PK with table name</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-prefixpk"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-group">Naming</div>');
        h('      <div class="sett-row"><label for="sett-prefix">Object prefix</label>');
        h('        <input id="sett-prefix" type="text" placeholder="e.g. app_, hr_"></div>');
        h('      <div class="sett-row"><label for="sett-schema">Schema</label>');
        h('        <input id="sett-schema" type="text" placeholder="e.g. HR, APP"></div>');
        h('      <div class="sett-row"><label for="sett-dialect">SQL dialect</label>');
        h('        <input id="sett-dialect" type="text" placeholder="oracle"></div>');
        h('    </div>');

        -- Types pane
        h('    <div class="sett-pane" data-pane="types">');
        h('      <div class="sett-group">Data Types</div>');
        h('      <div class="sett-row"><label for="sett-db">DB version</label>');
        h('        <input id="sett-db" type="text" placeholder="e.g. 23c, 19c, 21c"></div>');
        h('      <div class="sett-row"><label for="sett-sem">Char semantics</label>');
        h('        <select id="sett-sem"><option value="">&#x2014; default (CHAR) &#x2014;</option>');
        h('          <option value="CHAR">CHAR</option><option value="BYTE">BYTE</option></select></div>');
        h('      <div class="sett-row"><label for="sett-date">Date data type</label>');
        h('        <select id="sett-date"><option value="">&#x2014; default (DATE) &#x2014;</option>');
        h('          <option value="DATE">DATE</option><option value="TIMESTAMP">TIMESTAMP</option>');
        h('          <option value="Timestamp with time zone">TIMESTAMP WITH TIME ZONE</option>');
        h('          <option value="Timestamp with local time zone">TIMESTAMP WITH LOCAL TIME ZONE</option></select></div>');
        h('      <div class="sett-row"><label for="sett-bool">Boolean data type</label>');
        h('        <select id="sett-bool"><option value="">&#x2014; not set &#x2014;</option>');
        h('          <option value="native">native (23c boolean)</option>');
        h('          <option value="yn">yn (char Y/N)</option></select></div>');
        h('      <div class="sett-row"><label for="sett-lang">Data language</label>');
        h('        <select id="sett-lang"><option value="">&#x2014; default (EN) &#x2014;</option>');
        h('          <option value="EN">EN (English)</option><option value="JP">JP (Japanese)</option>');
        h('          <option value="KO">KO (Korean)</option></select></div>');
        h('    </div>');

        -- Columns pane
        h('    <div class="sett-pane" data-pane="columns">');
        h('      <div class="sett-group">Auto Columns</div>');
        h('      <div class="sett-row"><label for="sett-audit">Audit columns</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-audit"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-rowver">Row version</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-rowver"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-rowkey">Row key (alphanumeric)</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-rowkey"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-aienrich">AI enrichment</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-aienrich"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-group">Audit Column Names</div>');
        h('      <div class="sett-row"><label for="sett-createdcol">Created timestamp column</label>');
        h('        <input id="sett-createdcol" type="text" placeholder="created"></div>');
        h('      <div class="sett-row"><label for="sett-createdbycol">Created by column</label>');
        h('        <input id="sett-createdbycol" type="text" placeholder="created_by"></div>');
        h('      <div class="sett-row"><label for="sett-updatedcol">Updated timestamp column</label>');
        h('        <input id="sett-updatedcol" type="text" placeholder="updated"></div>');
        h('      <div class="sett-row"><label for="sett-updatedbycol">Updated by column</label>');
        h('        <input id="sett-updatedbycol" type="text" placeholder="updated_by"></div>');
        h('    </div>');

        -- Output pane
        h('    <div class="sett-pane" data-pane="output">');
        h('      <div class="sett-group">Output</div>');
        h('      <div class="sett-row"><label for="sett-drop">Include DROP statements</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-drop"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-inserts">Generate INSERTs</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-inserts"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-dv">Duality views</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-dv"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-edit">Editionable</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-edit"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-api">Table API (TAPI)</label>');
        h('        <select id="sett-api"><option value="">&#x2014; default (no) &#x2014;</option>');
        h('          <option value="yes">yes</option><option value="no">no</option>');
        h('          <option value="layered">layered</option></select></div>');
        h('      <div class="sett-row"><label for="sett-apex">APEX</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-apex"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-compress">Table compression</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-compress"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-group">FK &amp; Identifiers</div>');
        h('      <div class="sett-row"><label for="sett-ondelete">FK ON DELETE</label>');
        h('        <select id="sett-ondelete"><option value="">&#x2014; default (cascade) &#x2014;</option>');
        h('          <option value="cascade">cascade</option><option value="restrict">restrict</option>');
        h('          <option value="set null">set null</option></select></div>');
        h('      <div class="sett-row"><label for="sett-longvc">Long VARCHAR2 (32767)</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-longvc"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-namelen">Max identifier length</label>');
        h('        <input id="sett-namelen" type="text" placeholder="128 (12.2+) or 30"></div>');
        h('    </div>');

        -- Advanced pane
        h('    <div class="sett-pane" data-pane="advanced">');
        h('      <div class="sett-group">Multi-tenancy &amp; Data</div>');
        h('      <div class="sett-row"><label for="sett-tenantid">Tenant ID column</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-tenantid"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-tenantref">Tenant reference table</label>');
        h('        <input id="sett-tenantref" type="text" placeholder="tenants"></div>');
        h('      <div class="sett-row"><label for="sett-datalimit">Max INSERT rows per table</label>');
        h('        <input id="sett-datalimit" type="text" placeholder="no limit"></div>');
        h('      <div class="sett-group">Advanced</div>');
        h('      <div class="sett-row"><label for="sett-transcontext">Translation context expression</label>');
        h('        <input id="sett-transcontext" type="text" placeholder="sys_context(''APP_CTX'',''LANG'')"></div>');
        h('      <div class="sett-row"><label for="sett-overridesettings">Override UI settings</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-overridesettings"><span class="sett-toggle-slider"></span></label></div>');
        h('      <div class="sett-row"><label for="sett-verbose">Verbose (show all settings)</label>');
        h('        <label class="sett-toggle"><input type="checkbox" id="sett-verbose"><span class="sett-toggle-slider"></span></label></div>');
        h('    </div>');

        h('  </div>'); -- sett-body
        h('  <div class="sett-footer">');
        h('    <button class="sett-apply" id="btn-sett-apply">Apply settings</button>');
        h('  </div>');
        h('</div>'); -- settings-panel

        -- ── Error bar ─────────────────────────────────────────────────────────
        h('<div id="error"></div>');

        -- ── Main panels ───────────────────────────────────────────────────────
        h('<div class="panels">');

        -- Left panel: editor
        h('  <div class="panel">');
        h('    <div class="schema-tabs-wrap">');
        h('      <div class="schema-tabs" id="schema-tabs"></div>');
        h('      <button id="btn-compare" class="tool-btn"');
        h('        title="Insert # --- delimiter to compare two schema versions">&#x21C4; Compare</button>');
        h('    </div>');
        h('    <div class="editor-wrap">');
        h('      <div class="cur-line" id="cur-line"></div>');
        h('      <div class="ln-layer" id="ln-layer" aria-hidden="true"></div>');
        h('      <pre class="hl-layer" id="qs-hl" aria-hidden="true"></pre>');
        h('      <textarea id="input" spellcheck="false">departments /insert 2');
        h('   name /nn');
        h('   location');
        h('   country');
        h('   employees /insert 4');
        h('      name /nn vc50');
        h('      email /lower');
        h('      cost center num');
        h('      date hired');
        h('      job vc255');
        h('');
        h('emp_v = departments employees');
        h('');
        h('# settings = { "prefix": null, "semantics": "CHAR", "DV": false, pk: identityDataType }');
        h('</textarea>');
        h('    </div>');
        h('  </div>'); -- left panel

        -- Resize handle
        h('  <div class="resize-handle" id="resize-handle"></div>');

        -- Right panel: DDL / ERD
        h('  <div class="panel">');
        h('    <div class="panel-tabs">');
        h('      <button class="tab-btn qs-active" data-tab="ddl">DDL</button>');
        h('      <button class="tab-btn"        data-tab="erd">ER Diagram</button>');
        h('    </div>');
        h('    <div class="tab-pane qs-active" data-tab="ddl">');
        h('      <div class="ddl-toolbar">');
        h('        <button id="btn-copy"     class="tool-btn">&#x29C9; Copy</button>');
        h('        <button id="btn-download" class="tool-btn">&#x2193; Download</button>');
        h('        <button id="btn-share"    class="tool-btn">&#x2197; Share</button>');
        h('      </div>');
        h('      <div id="mig-warnings"></div>');
        h('      <pre id="output"></pre>');
        h('    </div>');
        h('    <div class="tab-pane" data-tab="erd">');
        h('      <div class="erd-toolbar">');
        h('        <button id="btn-erd-fit"   class="tool-btn">&#x2922; Fit</button>');
        h('        <button id="btn-erd-zin"   class="tool-btn">+ Zoom</button>');
        h('        <button id="btn-erd-zout"  class="tool-btn">&#x2212; Zoom</button>');
        h('        <span class="sep"></span>');
        h('        <button id="btn-erd-reset" class="tool-btn">&#x21BA; Reset</button>');
        h('      </div>');
        h('      <div id="erd-container"></div>');
        h('    </div>');
        h('  </div>'); -- right panel

        h('</div>'); -- panels

        -- ── Status bar (div avoids conflicting with APEX <footer> CSS) ────────
        h('<div id="status">ready</div>');

        -- ── Autocomplete ──────────────────────────────────────────────────────
        h('<div id="autocomplete"></div>');

        -- ── Help drawer ───────────────────────────────────────────────────────
        h('<aside id="help-drawer">');
        h('  <div class="hdw-hdr">');
        h('    <strong>ExpreSQL Reference</strong>');
        h('    <button class="hdw-close" id="help-close">&times;</button>');
        h('  </div>');
        h('  <div class="hdw-tab-bar">');
        h('    <button class="hdw-tab qs-active" data-tab="start">Start</button>');
        h('    <button class="hdw-tab" data-tab="tables">Tables</button>');
        h('    <button class="hdw-tab" data-tab="types">Types</button>');
        h('    <button class="hdw-tab" data-tab="views">Views</button>');
        h('    <button class="hdw-tab" data-tab="api">API</button>');
        h('  </div>');
        h('  <div class="hdw-body">');

        -- Help: Start
        h('    <div class="hdw-pane qs-active" data-pane="start">');
        h('      <details class="hdw-sec" open><summary>Quick Start</summary><div class="hdw-content">');
        h('        <p class="hdw-note">Write table names at the left margin. Indent columns underneath.');
        h('          Indent a table under another to create a parent-child FK automatically.</p>');
        h('        <code class="hdw-eg">departments&#x0A;   name /nn&#x0A;   location&#x0A;   employees&#x0A;      name /nn vc100&#x0A;      email /lower&#x0A;      salary num(10,2)</code>');
        h('        <p class="hdw-note" style="margin-top:8px">Add settings at the end of the script:</p>');
        h('        <code class="hdw-eg"># settings = { db: "23c", auditcols: yes, prefix: "app_" }</code>');
        h('      </div></details>');
        h('      <details class="hdw-sec"><summary>Keyboard Shortcuts</summary><div class="hdw-content">');
        h('        <table class="ref">');
        h('          <tr><td><kbd>Tab</kbd></td><td>Indent 3 spaces</td></tr>');
        h('          <tr><td><kbd>Enter</kbd></td><td>Auto-indent to match current line</td></tr>');
        h('          <tr><td><kbd>Esc</kbd></td><td>Close Help and Settings panels</td></tr>');
        h('        </table>');
        h('      </div></details>');
        h('    </div>');

        -- Help: Tables
        h('    <div class="hdw-pane" data-pane="tables">');
        h('      <details class="hdw-sec" open><summary>Tables</summary><div class="hdw-content">');
        h('        <table class="ref">');
        h('          <tr><td>table_name</td><td>Creates a table with auto primary key</td></tr>');
        h('          <tr><td>name /insert <em>N</em></td><td>Generate N sample data rows (max 1000)</td></tr>');
        h('          <tr><td>name /rest</td><td>Enable ORDS REST on the table</td></tr>');
        h('          <tr><td>name /audit</td><td>Add <code>AUDIT ALL ON &lt;table&gt;</code></td></tr>');
        h('          <tr><td>name /auditcols</td><td>Add CREATED, CREATED_BY, UPDATED, UPDATED_BY columns + trigger</td></tr>');
        h('          <tr><td>name /rowversion</td><td>Add ROW_VERSION column; trigger increments on every UPDATE (OCC)</td></tr>');
        h('          <tr><td>name /api</td><td>Generate Table API (TAPI package)</td></tr>');
        h('          <tr><td>name /api /auditlog [<em>log_table</em>]</td><td>Layered TAPI + audit package with <code>PRAGMA AUTONOMOUS_TRANSACTION</code></td></tr>');
        h('          <tr><td>name /colprefix <em>pfx</em></td><td>Prefix all columns of this table with <em>pfx</em></td></tr>');
        h('          <tr><td>name /compress</td><td>CREATE TABLE &hellip; COMPRESS</td></tr>');
        h('          <tr><td>name /immutable</td><td>Append-only table (21c+)</td></tr>');
        h('          <tr><td>name /history</td><td>Temporal history table with valid_from/valid_to (23ai+)</td></tr>');
        h('          <tr><td>name /soda</td><td>SODA JSON document collection (21c+)</td></tr>');
        h('        </table>');
        h('      </div></details>');
        h('      <details class="hdw-sec"><summary>Column Directives</summary><div class="hdw-content">');
        h('        <table class="ref">');
        h('          <tr><td>/nn</td><td>NOT NULL constraint</td></tr>');
        h('          <tr><td>/unique</td><td>UNIQUE constraint</td></tr>');
        h('          <tr><td>/index</td><td>Non-unique index on the column</td></tr>');
        h('          <tr><td>/lower</td><td>Trigger: force all lowercase</td></tr>');
        h('          <tr><td>/upper</td><td>Trigger: force all uppercase</td></tr>');
        h('          <tr><td>/default <em>val</em></td><td>DEFAULT value</td></tr>');
        h('          <tr><td>/check <em>A,B,C</em></td><td>CHECK IN (A, B, C)</td></tr>');
        h('          <tr><td>/fk <em>table</em></td><td>Explicit foreign key reference</td></tr>');
        h('          <tr><td>/pk</td><td>Declare column as primary key</td></tr>');
        h('          <tr><td>/trans</td><td>Multi-lingual column &mdash; generates <code>_trans</code> table + <code>_resolved</code> view</td></tr>');
        h('        </table>');
        h('      </div></details>');
        h('    </div>');

        -- Help: Types
        h('    <div class="hdw-pane" data-pane="types">');
        h('      <details class="hdw-sec" open><summary>Data Types</summary><div class="hdw-content">');
        h('        <table class="ref">');
        h('          <tr><td>vc / vc<em>N</em></td><td>varchar2(4000) / varchar2(N)</td></tr>');
        h('          <tr><td>num / num(<em>p,s</em>)</td><td>number / number(p,s)</td></tr>');
        h('          <tr><td>int</td><td>integer</td></tr>');
        h('          <tr><td>date / ts / tstz</td><td>date / timestamp / timestamp with time zone</td></tr>');
        h('          <tr><td>bool</td><td>boolean (23c) or number(1)</td></tr>');
        h('          <tr><td>json</td><td>json (23c) or clob check is json</td></tr>');
        h('          <tr><td>clob / blob</td><td>clob / blob</td></tr>');
        h('          <tr><td>vect / vect<em>N</em></td><td>vector (23c+)</td></tr>');
        h('          <tr><td>file</td><td>APEX file upload columns</td></tr>');
        h('        </table>');
        h('        <p class="hdw-note" style="margin-top:4px"><a href="doc/user/expresql-grammar.md#datatypes" target="_blank">&rarr; Full reference</a></p>');
        h('      </div></details>');
        h('    </div>');

        -- Help: Views
        h('    <div class="hdw-pane" data-pane="views">');
        h('      <details class="hdw-sec" open><summary>Views &amp; JSON Duality</summary><div class="hdw-content">');
        h('        <table class="ref">');
        h('          <tr><td>name = t1 t2</td><td>Join view across tables</td></tr>');
        h('          <tr><td>dv name = t1</td><td>JSON Duality View (Oracle 23c)</td></tr>');
        h('          <tr><td>&gt; t1</td><td>Star schema: dimension table</td></tr>');
        h('          <tr><td>&lt; t1</td><td>Snowflake: sub-hierarchy</td></tr>');
        h('        </table>');
        h('      </div></details>');
        h('      <details class="hdw-sec"><summary>Schema Migration</summary><div class="hdw-content">');
        h('        <p class="hdw-note">Write the old schema, add a <code>#&nbsp;---</code> separator, then the new schema.</p>');
        h('        <p class="hdw-note" style="margin-top:6px">Use the <strong>&#x21C4; Compare</strong> button to insert the separator automatically.</p>');
        h('      </div></details>');
        h('    </div>');

        -- Help: API
        h('    <div class="hdw-pane" data-pane="api">');
        h('      <details class="hdw-sec" open><summary>JavaScript / MLE functions</summary><div class="hdw-content">');
        h('        <table class="ref">');
        h('          <tr><td><code>toDDL(qsql, opts?)</code></td><td>Convert QSQL to Oracle DDL string</td></tr>');
        h('          <tr><td><code>toERD(qsql, opts?)</code></td><td>Return ER diagram graph object</td></tr>');
        h('          <tr><td><code>toDiff(old, new, opts?)</code></td><td>Compute incremental migration</td></tr>');
        h('          <tr><td><code>fromJSON(json)</code></td><td>Convert JSON document to QSQL string</td></tr>');
        h('        </table>');
        h('        <p class="hdw-note" style="margin-top:8px"><a href="doc/user/expresql-grammar.md" target="_blank">&rarr; Grammar Reference</a></p>');
        h('      </div></details>');
        h('    </div>');

        h('  </div>'); -- hdw-body
        h('</aside>');

        -- ── Close plugin root ─────────────────────────────────────────────────
        h('</div>');

        return p_result;
    end render;

end expresql_plugin;
/
