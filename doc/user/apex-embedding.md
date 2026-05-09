# EspreSQL — Oracle APEX Embedding Guide

This guide describes how to embed the EspreSQL web application inside an Oracle APEX page using an iframe, with visual integration into the APEX Redwood theme.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Quick Setup](#2-quick-setup)
- [3. URL Parameters](#3-url-parameters)
- [4. Embedded Mode](#4-embedded-mode)
- [5. APEX Redwood Ocean Dark Theme](#5-apex-redwood-ocean-dark-theme)
- [6. APEX Page Configuration](#6-apex-page-configuration)
- [7. Cross-Origin Considerations](#7-cross-origin-considerations)

---

## 1. Overview

EspreSQL can be served as a static file and embedded inside an Oracle APEX page via a standard `<iframe>`. Two URL parameters control the embedded experience:

| Parameter | Purpose |
|---|---|
| `?theme=apex` | Apply the APEX Redwood Ocean dark colour palette |
| `?embed=1` | Force embedded mode (hide header and footer) |

Iframe embedding is also **detected automatically**: if the page is loaded inside a frame, the header and footer are hidden without any explicit parameter.

---

## 2. Quick Setup

Deploy `index.html` and its assets as a static APEX application file. In the APEX page, add a **Static Content** region with the following HTML:

```html
<iframe
    src="r/ad/100/files/static/v32/index.html?theme=apex"
    style="width:100%; height:calc(100vh - 60px); border:none; display:block;"
    title="EspreSQL">
</iframe>
```

Adjust the path `r/ad/100/files/static/v32/` to match your application ID, workspace alias, and file version. The `height` calculation subtracts the APEX header height; tune it to match your specific page template.

---

## 3. URL Parameters

### `?theme=<name>`

Selects the colour theme applied before the first paint (no flash of unstyled content).

| Value | Description |
|---|---|
| `dark` | Default — Oracle Redwood Cinnabar dark (red accent, dark earth tones) |
| `light` | Oracle Redwood Cinnabar light |
| `apex` | Oracle Redwood Ocean dark (navy background, blue accent) — recommended for APEX |

When `theme=apex` is active:
- The theme toggle button (☀ / 🌙) is hidden, since the theme is controlled externally by APEX.
- The theme is **not** persisted to `localStorage`; it is re-applied from the URL on every load.

### `?embed=1`

Adds the `embedded` CSS class to the root `<html>` element before the first render. Use this when you need to force embedded mode regardless of the frame context (e.g. during development when testing the page standalone).

### `?share`

Shows the **↗ Share** button in the DDL toolbar. The button copies a URL that encodes the current schema and ERD positions into a `#` fragment, allowing the state to be restored in a new tab.

The Share button is hidden by default because in APEX the application URL is managed by APEX itself; a fragment-encoded link would bypass session management and is generally not suitable for production use. Enable it explicitly when you need to share schemas outside of APEX (e.g. during development or for standalone deployments).

### Combining parameters

```
index.html?theme=apex&share
index.html?theme=apex&embed=1&share
```

---

## 4. Embedded Mode

### Automatic detection

When the page is loaded inside an iframe, `window.self !== window.top` is true. The inline script in `<head>` checks this condition and adds the `embedded` class to `<html>` before the browser renders any content, preventing a visible flash of the header.

```
window.self !== window.top  →  html.embedded  →  header hidden
```

In cross-origin scenarios where accessing `window.top` throws a `SecurityError`, the exception is caught and `embedded` is applied regardless — the safe default.

### What changes in embedded mode

| Element | Normal | Embedded |
|---|---|---|
| `<header>` (logo, toolbar, buttons) | Visible | Hidden |
| `<footer>` (status bar) | Visible | Hidden |
| `.panels` (editor + output) | `height: calc(100vh - header - footer)` | `height: 100vh` |

The editor, DDL output, ERD diagram, settings panel, help drawer, examples dropdown, and all keyboard shortcuts work identically in both modes.

---

## 5. APEX Redwood Ocean Dark Theme

### Colour palette

The `apex` theme maps to the Oracle Redwood **Ocean** colour pillar in dark mode (`rw-pillar--ocean rw-mode-body--dark`).

| Variable | Value | Usage |
|---|---|---|
| `--bg` | `#13202f` | Main background |
| `--bg-ui` | `#0d1a28` | UI chrome (panels, headers) |
| `--bg-panel` | `#1a2d40` | Panel surfaces |
| `--bg-btn` | `#1e3347` | Button backgrounds |
| `--bg-hover` | `#264057` | Hover state |
| `--border` | `#2a3e52` | Default borders |
| `--text` | `#e4eaf2` | Primary text |
| `--text-muted` | `#7a9ab5` | Secondary text, labels |
| `--accent` | `#0078ba` | Active elements, links |
| `--accent-hover` | `#006aa6` | Accent hover state |

### Syntax highlighting

The `apex` theme retains the same syntax token colours as the `dark` theme, which are readable on navy backgrounds without modification:

| Token | Colour |
|---|---|
| Table name | `#4fc1ff` |
| Column name | `#9cdcfe` |
| Directive (`/nn`, `/fk`, …) | `#c586c0` |
| Data type | `#4ec9b0` |
| Comment | `#5a8a6a` |
| Annotation | `#d7ba7d` |
| SQL keyword | `#569cd6` |

---

## 6. APEX Page Configuration

Recommended settings for the APEX page that hosts the iframe:

- **Page template:** Standard (no side column, no actions column) — class `t-PageTemplate--standard`
- **Navigation:** Suppress the page-level navigation bar if EspreSQL fills the full content area
- **Scrolling:** Set `overflow: hidden` on the APEX body or suppress the APEX footer to avoid double scroll bars
- **iframe height:** `calc(100vh - 60px)` subtracts a typical APEX Redwood header height; adjust for your theme variant

Example APEX Static Content region HTML (full viewport minus APEX header):

```html
<iframe
    src="r/ad/100/files/static/v32/index.html?theme=apex"
    style="width:100%; height:calc(100vh - 60px); border:none; display:block;"
    title="EspreSQL">
</iframe>
```

### Static file deployment

Upload the following files to your APEX application's static files (Application → Shared Components → Static Application Files):

| File | Required | Notes |
|---|---|---|
| `index.html` | Yes | Main entry point |
| `web/app.css` | Yes | Styles including `apex` theme |
| `web/app.js` | Yes | Application logic |
| `web/highlight.js` | Yes | Syntax highlighting |
| `web/settings.js` | Yes | Settings panel |
| `web/tabs.js` | Yes | Tab management |
| `web/autocomplete.js` | Yes | Autocomplete |
| `web/erd.js` | Yes | ERD diagram rendering |
| `web/state.js` | Yes | Shared state |
| `dist/espresql.js` | Yes | Compiler library |
| `dist/antv-x6.min.js` | Yes | ERD graph engine |
| `img/radicle_01.png` | No | Logo (not shown in embedded mode) |
| `img/favicon.svg` | No | Browser tab icon |

---

## 7. Cross-Origin Considerations

If EspreSQL is served from a different origin than the APEX application (e.g. Oracle Object Storage), automatic iframe detection still works correctly: the `SecurityError` thrown when accessing `window.top` is caught and treated as "inside a frame". Pass `?embed=1` explicitly in the `src` URL to avoid relying on the exception path:

```html
<iframe
    src="https://objectstorage.../index.html?theme=apex&embed=1"
    style="width:100%; height:calc(100vh - 60px); border:none; display:block;"
    title="EspreSQL">
</iframe>
```

EspreSQL does not use `postMessage` or `window.parent` communication; it operates entirely within its own frame context. APEX session data is not accessible from the iframe.
