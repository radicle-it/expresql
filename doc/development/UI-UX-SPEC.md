# EspreSQL Interactive — UI/UX Improvement Specification

**Version:** 1.0  
**Date:** 2026-05-06  
**Scope:** `index.html` + `web/app.css`

---

## 1. Executive Summary

The current EspreSQL interactive page is functional and visually coherent (Oracle Redwood palette, dark/light themes, syntax highlighting). However, several areas reduce usability and visual clarity:

- Inconsistent use of icons across toolbars and headers.
- The Settings panel lacks a close control and requires excessive scrolling.
- The theme-toggle button conveys no information about the current state.
- The Help button uses a raw `?` character with no styling.
- Some button labels are overly verbose for the space they occupy.
- The resize handle between panels has no visual affordance.
- The product identity (logo + title) is functional but lacks a distinctive EspreSQL mark.

This document catalogues every identified issue, proposes concrete changes (with priority), and notes implementation effort. Changes are grouped by area.

---

## 2. Current State by Area

### 2.1 Header

```
[Radicle logo] | EspreSQL — write shorthand…  [spacer]  Examples▾  ⚙ Settings  ? Help  ☀  radicle.it
```

| Element | Issue |
|---|---|
| `? Help` button | `?` is raw text, no icon styling, no `aria-label` |
| `☀` theme toggle | Shows only sun; no moon for dark mode; no visual state |
| `radicle.it` text link | Redundant — logo already links there |
| Header buttons | 11 px font; no `aria-expanded` state feedback |
| Subtitle text | 11 px muted — too small; valuable copy that gets ignored |

### 2.2 Settings Panel

| Issue | Detail |
|---|---|
| No close button | Only Esc or click-outside; discoverable only by accident |
| Group headers too small | 9 px uppercase — hard to scan quickly |
| Yes/No dropdowns | `<select>` for binary choices; toggles or checkboxes feel more natural |

### 2.3 Editor Panel (Left)

| Element | Issue |
|---|---|
| `⇄ Compare versions` | Verbose for a toolbar; `⇄` is ambiguous without label context |
| `editor-tools` bar | Contains a single button — wastes a full height-band |

### 2.4 Output Panel (Right)

| Element | Issue |
|---|---|
| Tab label "DDL Oracle SQL" | Verbose — "DDL" alone (or "Oracle DDL") is sufficient |
| `Copy DDL`, `Download .sql`, `Share link` | Plain text, no icons — inconsistent with ERD toolbar |
| `#mig-warnings` area | No visible label/header when warnings are present |

### 2.5 ERD Toolbar

| Element | Issue |
|---|---|
| `⊡ Fit` | `⊡` is not a widely recognised "fit to screen" glyph |
| `↺ Reset layout` | OK, but occupies full text width; could be icon-only with tooltip |

### 2.6 Help Drawer

| Element | Issue |
|---|---|
| Settings section | 30+ row inline table duplicates the Settings panel; should link to reference instead |
| 3 sections open by default | Quick Start, Tables, Quick Examples — cognitive load on first open |
| Fixed 420 px width | Fine on large screens; cramped on 1280 px with panels |
| No search | 10 sections; finding a directive requires manual scanning |
| Close button `×` | Functional but small for a primary close action |

### 2.7 Resize Handle

| Issue | Detail |
|---|---|
| 5 px wide, no affordance | Turns red on hover (good), but invisible until hovered |

### 2.8 Footer

| Issue | Detail |
|---|---|
| Full-width accent-red band | Heavy visual treatment for a one-word status message |

### 2.9 Logo & Visual Identity

| Issue | Detail |
|---|---|
| No EspreSQL-specific mark | The product is identified only via text; Radicle logo + text title lacks a dedicated icon |
| Radicle logo height 34 px | The CSS has a commented-out `background: #fff` — suggests unresolved transparency |
| Favicon | Probably inherits browser default; no `<link rel="icon">` tag present |

---

## 3. Proposed Improvements

### Priority Legend
- **P1** — High: visible problem, low effort, immediate improvement
- **P2** — Medium: meaningful improvement, moderate effort
- **P3** — Low: polish / nice-to-have

---

### 3.1 Header Improvements

#### P1 — Fix the Help button

Replace the raw `?` with a proper styled glyph and add `aria-label`:

```html
<!-- before -->
<button id="btn-help" class="tool-btn">? Help</button>

<!-- after -->
<button id="btn-help" class="tool-btn" aria-label="Help">ⓘ Help</button>
```

`ⓘ` (U+24D8 CIRCLED LATIN SMALL LETTER I) is universally recognised as an information/help icon and renders cleanly at small sizes. Alternatively use `❓` or a proper SVG icon.

#### P1 — Theme toggle: reflect current state

The button must show what the *current mode is* (so users can understand the toggle semantics) and what *clicking will do*:

Interpret `aria-pressed` as "is dark mode currently active?":

```html
<!-- dark mode active → sun icon (click switches to light), aria-pressed="true" (dark IS on) -->
<button id="btn-theme" class="tool-btn" title="Switch to light theme" aria-pressed="true">☀ Light</button>

<!-- light mode active → moon icon (click switches to dark), aria-pressed="false" (dark is OFF) -->
<button id="btn-theme" class="tool-btn" title="Switch to dark theme" aria-pressed="false">🌙 Dark</button>
```

JavaScript already reads `localStorage.getItem('qsql-theme') || 'dark'` on init — update the button label and `aria-pressed` to match the current theme on load and on every toggle.

Alternatively use only the icon (no text label) with a tooltip: `☀` / `🌙` with `title="Switch to dark/light theme"`.

#### P1 — Remove redundant `radicle.it` text link

The logo image already wraps an `<a href="https://radicle.it">`. The text link at the end of the header is redundant and consumes header space. Remove it. If a version string is available, show it here instead: `v2.0` in muted text.

#### P3 — Subtitle visibility

The subtitle `— write shorthand, get Oracle DDL in real time` is 11 px muted and easy to miss. Increase to 12 px or normal text weight. It communicates the core value proposition and should not compete with navigation.

---

### 3.2 Settings Panel

#### P1 — Add a close button to the Settings header

`.sett-hdr` currently contains only the "Settings" label. Add a close button aligned to the right:

```html
<div class="sett-hdr">
    Settings
    <button class="sett-close" id="btn-sett-close" aria-label="Close settings">&times;</button>
</div>
```

```css
.sett-hdr { display: flex; align-items: center; justify-content: space-between; }
.sett-close {
    background: none; border: none; color: var(--text-muted);
    font-size: 18px; cursor: pointer; line-height: 1; padding: 0 2px;
}
.sett-close:hover { color: var(--text); }
```

#### Note — Apply button is already sticky

The CSS already implements a sticky footer correctly: `#settings-panel` uses `display:flex; flex-direction:column`, `.sett-body` has `flex:1; overflow-y:auto`, and `.sett-footer` is `flex-shrink:0` _outside_ the scroll area. The Apply button should always be visible without scrolling. Verify this holds in all target browsers — if it misbehaves, adding `position: sticky; bottom: 0` to `.sett-footer` is the fallback.

If a secondary "Apply" shortcut in the header is still desired (to save the user from moving focus to the bottom), add it as a small pill next to the close button (Option B from the general approach below), but it is not required for correct behaviour.

#### P2 — Replace yes/no `<select>` with toggle switches

Binary yes/no settings are better expressed as toggles. Implement a CSS-only toggle:

```css
.sett-toggle { position: relative; display: inline-block; width: 36px; height: 18px; }
.sett-toggle input { opacity: 0; width: 0; height: 0; }
.sett-toggle-slider {
    position: absolute; inset: 0; background: var(--border);
    border-radius: 18px; transition: background .2s; cursor: pointer;
}
.sett-toggle input:checked + .sett-toggle-slider { background: var(--accent); }
.sett-toggle-slider::before {
    content: ''; position: absolute;
    width: 14px; height: 14px; left: 2px; bottom: 2px;
    background: white; border-radius: 50%; transition: transform .2s;
}
.sett-toggle input:checked + .sett-toggle-slider::before { transform: translateX(18px); }
```

Apply to purely binary settings (audit, rowversion, rowkey, drop, inserts, etc.). Keep `<select>` for settings with 3+ values (pk, api, date, ondelete).

#### P3 — Slightly larger group headers

Increase `.sett-group` from `font-size: 9px` to `font-size: 10px`. 9 px is below comfortable reading size even for labels. The visual hierarchy of label/group header can be maintained with spacing and color alone.

---

### 3.3 Editor Panel

#### P2 — Shorten "Compare versions" label

`⇄ Compare versions` is 16 characters. Proposals, in order of preference:

1. `⇄ Compare` (9 chars) — clear enough in context
2. `⇄ Diff` (6 chars)
3. Icon-only `⇄` with `title="Insert # --- diff separator"` — too cryptic without label

Update the Help drawer and inline reference accordingly.

The `editor-tools` bar (which currently holds only this one button) could be merged into the `schema-tabs` bar using `justify-content: space-between` — this recovers one row height:

```html
<div class="schema-tabs-wrap" style="display:flex; align-items:center; background:var(--bg-panel); border-bottom:1px solid var(--border)">
    <div class="schema-tabs" id="schema-tabs" style="flex:1"></div>
    <button id="btn-compare" class="tool-btn" style="margin:3px 6px" title="Insert # --- diff separator">⇄ Compare</button>
</div>
```

---

### 3.4 Output Panel

#### P1 — Rename tab "DDL Oracle SQL" → "DDL"

```html
<!-- before -->
<button class="tab-btn active" data-tab="ddl">DDL Oracle SQL</button>

<!-- after -->
<button class="tab-btn active" data-tab="ddl">DDL</button>
```

The context (it's an Oracle DDL tool) is implicit; the extra words add noise.

#### P1 — Add icons to DDL toolbar buttons

Replace plain-text buttons with icon + label pairs for visual consistency with the ERD toolbar:

| Current | Proposed |
|---|---|
| `Copy DDL` | `⧉ Copy` |
| `Download .sql` | `↓ Download` or `⬇ Download` |
| `Share link` | `↗ Share` or `🔗 Share` |

Recommended Unicode set (monospace-friendly):
- Copy: `⧉` (U+29C9 TWO JOINED SQUARES — specifically used as "copy" in GitHub and VS Code UIs)
- Download: `↓` (U+2193) or `⬇` (U+2B07)
- Share: `↗` (U+2197) or `🔗`

Avoid `⎘` (U+2398) — its official Unicode name is "HELM SYMBOL", not "copy"; it would be confusing.

```html
<button id="btn-copy"     class="tool-btn">⧉ Copy</button>
<button id="btn-download" class="tool-btn">↓ Download</button>
<button id="btn-share"    class="tool-btn">↗ Share</button>
```

#### P2 — Label migration warnings area

When `#mig-warnings` contains items, prepend a small header label so users understand what they're seeing:

Implement in JS: when adding warnings, prepend a header `<div class="mig-warn-hdr">⚠ Migration notices</div>`.

```css
.mig-warn-hdr {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-muted); padding: 5px 12px 3px;
    border-bottom: 1px solid var(--border);
}
```

---

### 3.5 ERD Toolbar

#### P2 — Replace `⊡` with a clearer fit-screen glyph

`⊡` (U+22A1) is a mathematical symbol. Better options:

- `⤢` (U+2922) arrows pointing outward
- `⛶` (U+26F6) — square four corners
- SVG `<svg>` inline icon for precise control
- Text fallback: `↔ Fit`

Recommended: use `⤢ Fit` or an inline SVG for a clean "expand to fit" metaphor.

#### P3 — Reset layout: icon-only on narrow viewports

`↺ Reset layout` can be shortened to `↺ Reset` or icon-only with `title`.

---

### 3.6 Help Drawer

#### P2 — Collapse Settings section, link to reference

The Settings section in the Help drawer (30+ rows) duplicates the Settings panel exactly. Replace it with:

```html
<details class="hdw-sec">
    <summary>Settings</summary>
    <div class="hdw-content">
        <p class="hdw-note">Use the <strong>⚙ Settings</strong> panel in the header to configure options visually, or add a <code># settings = { … }</code> line to your script.</p>
        <code class="hdw-eg"># settings = { pk: seq, semantics: CHAR, db: 23c }</code>
        <p class="hdw-note" style="margin-top:6px"><a href="doc/user/espresql-grammar.md#settings" target="_blank">→ Full settings reference (all keys and values)</a></p>
    </div>
</details>
```

This makes the Help drawer noticeably shorter and avoids duplication.

#### P2 — Open only Quick Start by default

Three open sections (Quick Start, Tables, Quick Examples) means the drawer opens with a large amount of expanded content. Open only Quick Start by default. Users can expand others on demand.

```html
<details class="hdw-sec" open>  <!-- Quick Start only -->
```

#### P3 — Add a search/filter input in the Help drawer

A small search input at the top of `.hdw-body` (similar to the Settings search) to filter section content. Implementation similar to `#sett-search` — hide `<details>` whose text content does not match.

---

### 3.7 Resize Handle

#### P2 — Add visual affordance (griplines)

A 5 px handle becomes invisible at rest. Add dotted grip lines using a CSS `::before` pseudo-element:

```css
.resize-handle {
    width: 6px;   /* slightly wider */
    background: var(--border);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background .12s;
    position: relative;
}
.resize-handle::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 2px; height: 24px;
    background: var(--border-hover);
    border-radius: 1px;
    transition: background .12s;
}
.resize-handle:hover::before,
.resize-handle.dragging::before { background: var(--accent); }
.resize-handle:hover, .resize-handle.dragging { background: var(--accent); }
```

---

### 3.8 Footer

#### P3 — Reduce visual weight of the status footer

The full-width accent-red `footer` is visually heavy for a one-word "ready" message. Options:

**Option A:** Change background to `var(--bg-ui)` for idle states; only use `var(--accent)` for active/error states:

```css
footer {
    padding: 3px 14px;
    background: var(--bg-ui);
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    font-size: 10px;
}
footer.status-busy  { background: var(--accent); color: #fff; }
footer.status-error { background: var(--error-bg); color: var(--error-text); }
```

**Option B (minimal):** Keep red but reduce height — reduce padding from `4px 14px` to `2px 14px`.

---

### 3.9 Logo & Visual Identity

#### P2 — Add a favicon

There is no `<link rel="icon">` in `<head>`. Even a simple SVG with the letter "Q" in the brand red would be a significant improvement:

```html
<link rel="icon" href="img/favicon.svg" type="image/svg+xml">
```

A minimal SVG favicon:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#C74634"/>
  <text x="6" y="24" font-family="sans-serif" font-weight="700" font-size="22" fill="white">Q</text>
</svg>
```

#### P2 — EspreSQL wordmark clarity

The current header reads: `[Radicle logo] | EspreSQL`. The product is "Radicle EspreSQL" but the two components are visually separate. Consider one of:

1. **Layered title**: Keep current layout but increase "EspreSQL" from 16 px to 18 px and make the subtitle a proper second line (using flex-direction: column) rather than an inline span.
2. **Combined mark**: Create a dedicated EspreSQL logo that incorporates both the Radicle brand and the SQL identity — e.g., the Radicle symbol + "EspreSQL" in a single SVG asset.

#### P3 — Resolve logo background inconsistency

The CSS has a commented-out `/*background: #fff;*/` on `.logo-img`. This suggests the logo may have transparency issues in certain states. Audit the PNG for transparency compatibility in both light and dark themes. If needed, provide separate logo variants or use an SVG logo that adapts via `currentColor`.

---

## 4. Implementation Priority Summary

| # | Area | Change | Priority | Effort |
|---|---|---|---|---|
| 1 | Header | Fix Help button (icon + aria-label) | P1 | Low |
| 2 | Header | Theme toggle shows current state + moon icon | P1 | Low |
| 3 | Header | Remove redundant `radicle.it` text link | P1 | Trivial |
| 4 | Settings | Add close button to `.sett-hdr` | P1 | Low |
| 5 | Output | Rename "DDL Oracle SQL" tab → "DDL" | P1 | Trivial |
| 6 | Output | Add icons to Copy / Download / Share | P1 | Low |
| 7 | Editor | Shorten "Compare versions" → "Compare" | P2 | Trivial |
| 8 | Editor | Merge editor-tools bar into schema-tabs row | P2 | Low |
| 9 | Settings | Replace binary yes/no selects with toggles | P2 | Medium |
| 11 | Help | Collapse/shrink Settings section | P2 | Low |
| 12 | Help | Open only Quick Start by default | P2 | Trivial |
| 13 | Resize | Add visual gripline affordance | P2 | Low |
| 14 | ERD | Replace `⊡` with better fit-screen icon | P2 | Trivial |
| 15 | Output | Add label to migration warnings area | P2 | Low |
| 16 | Logo | Add favicon (SVG) | P2 | Low |
| 17 | Footer | Reduce visual weight for idle state | P3 | Low |
| 18 | Logo | Increase EspreSQL title size / subtitle legibility | P3 | Trivial |
| 19 | Settings | Increase group header font-size 9 → 10 px | P3 | Trivial |
| 20 | Help | Add search/filter to Help drawer | P3 | Medium |
| 21 | Logo | Audit PNG transparency in light/dark themes | P3 | Low |

---

## 5. Design Principles to Maintain

The following current design decisions are **correct and should be preserved**:

- **Oracle Redwood palette** — `--rw-red: #C74634` as accent is on-brand and consistent. Do not change.
- **Dark default** — The pre-paint theme script prevents flash. Keep.
- **11 px uppercase letter-spacing labels** — used for group headers, tab labels, panel labels. Creates visual hierarchy without weight. Keep the pattern; only increase the 9 px outliers.
- **Syntax highlighting token colors** — VS Code–style palette for both QSQL and SQL output. Well chosen and should not change.
- **`tool-btn` class uniformity** — all toolbar buttons share the same base style. Maintain this; only add icons, not different button types.
- **Settings search filter** — a good discoverability feature, keep and potentially replicate in the Help drawer.
- **Resize handle hover color = accent** — the red-on-hover is a clear affordance; extend it with the gripline pseudo-element rather than replacing it.

---

## 6. Out of Scope

- **Responsive / mobile layout** — the tool is a split-panel code editor with resize handle and ERD canvas; mobile use is not a realistic scenario.
- **Full accessibility (WCAG/ARIA compliance)** — the audience is Oracle/SQL developers on desktop; the two ARIA attributes retained (`aria-label` on Help, `aria-pressed` on theme toggle) are trivial and double as test-automation hooks, not accessibility goals.
- Changing the Oracle Redwood brand colors.
- Theming beyond dark/light toggle.
- Replacing the EspreSQL parsing engine or output format.
