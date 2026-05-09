# EspreSQL — Specifiche UX per Diff / Migration

**Versione:** 2.0  
**Data:** 2026-05-06  
**Stato:** Proposta

---

## 1. Vincolo progettuale

> **Zero stati.** Lo stesso testo nell'editor deve produrre sempre lo stesso output, senza dipendere da localStorage, snapshot in memoria, flag UI o qualsiasi altro stato esterno. Il comportamento dell'app è una funzione pura del testo corrente.

Questo esclude qualsiasi meccanismo "baseline/snapshot" (Opzione C della versione precedente) e qualsiasi tab o drawer aggiuntivo che richieda gestione di stato separato.

---

## 2. Soluzione: delimitatore inline `# ---`

L'utente scrive **entrambi gli schemi nello stesso editor**, separati da una riga speciale:

```
# ---
```

Il testo dell'editor è la sorgente di verità completa. L'app lo analizza deterministicamente:

| Contenuto dell'editor | Output DDL panel |
|-----------------------|-----------------|
| Nessun delimitatore | DDL completo normale (`toDDL`) |
| Contiene `# ---` | Migration script (`toDiff(parte1, parte2)`) |

Nessun stato esterno. Nessun toggle. Nessuna preferenza salvata. **Stesso testo → stesso output, sempre.**

---

## 3. Sintassi del delimitatore

La riga separatrice è un commento QSQL (inizia con `#`) — il parser lo ignora già. L'app la riconosce con questa regex:

```
/^#\s*-{2,}\s*$/m
```

Esempio editor completo:

```qsql
employees
  name vc100 /nn
  email vc200

# settings = { "prefix": "app_" }

# ---

employees
  name vc100 /nn
  email vc200 /nn
  phone vc50

departments
  dept_name vc100 /nn

# settings = { "prefix": "app_" }
```

Regole:
- Tutto sopra `# ---` è l'**old schema** (v1)
- Tutto sotto è il **new schema** (v2), incluse eventuali `# settings`
- Il delimitatore può stare ovunque nel testo, anche dopo le settings di v1
- È case-insensitive: `# --- V2`, `#--- v2` sono accettati
- Se appare più di una volta, solo la **prima** occorrenza divide v1 da v2

---

## 4. Comportamento del pannello DDL

### Modalità DDL normale (nessun delimitatore)

Nessuna modifica rispetto allo stato attuale. Il pannello mostra il DDL Oracle completo.

```
[Copy DDL]  [Download]  [Share]
──────────────────────────────────
create table employees (
  ...
```

### Modalità Migration (delimitatore presente)

Il pannello DDL **cambia automaticamente** output e label:

```
[Copy Migration SQL]  [Download .sql]  [Share]        ⚠ 1 manual
──────────────────────────────────────────────────────────────────
⚠ DESTRUCTIVE  [employees.email]  adding NOT NULL — manual step
──────────────────────────────────────────────────────────────────
-- ============================================================
-- EspreSQL Migration Script
-- Generated: 2026-05-06T...
-- ============================================================
...
```

Elementi che cambiano in modalità Migration:
- **Pulsante Copy** → etichetta diventa `Copy Migration SQL`
- **Download** → scarica `migration-<timestamp>.sql`
- **Share** → funziona normalmente (il testo completo incluso `# ---` è nell'URL)
- **Status bar** → `Migration: +1 table · ~1 modified · 5 statements · ⚠ 1 manual`
- **Barra warning** → riga colorata sopra l'output per ogni warning (DESTRUCTIVE / LOSSY / INFO)
- **Share** è pienamente funzionante: chiunque apra il link condiviso vede lo stesso migration script

---

## 5. Feedback visivo nell'editor

Quando l'editor contiene `# ---`, la riga del delimitatore riceve una evidenziazione speciale nel syntax highlighter (classe `qs-migration-sep`):

```
employees          ← testo normale (v1)
  name vc100 /nn
  email vc200
                   ← riga vuota
━━ v2 ━━━━━━━━━━  ← riga delimitatore: bold, colore accent, separatore visivo
                   ← riga vuota
employees          ← testo normale (v2)
  name vc100 /nn
  email vc200 /nn
```

La riga `# ---` viene renderizzata con stile distinto (es. colore accent rosso, font-weight bold) ma non modifica la sintassi QSQL — è semplicemente un commento speciale.

---

## 6. UX della scrittura del delimitatore

### Inserimento manuale
L'utente scrive `# ---` su una riga vuota. Il pannello DDL si aggiorna immediatamente.

### Pulsante "⇄ Compare versions"
Per chi non conosce la sintassi, un pulsante nella toolbar dell'editor (o nel menu Examples) inserisce automaticamente il delimitatore e un placeholder per v2:

```
Click "⇄ Compare versions":
  → appende al testo corrente:

  \n\n# ---\n\n(paste new schema here)\n
```

Il cursore si posiziona dopo il delimitatore, pronto per l'incolla. Questo è l'unico elemento UI aggiuntivo necessario.

### Snippet nel help drawer
La sezione Quick Examples aggiunge un esempio cliccabile che carica un template diff precompilato nell'editor.

---

## 7. Perché questa soluzione è corretta

| Requisito | Soddisfatto? | Note |
|-----------|-------------|------|
| Zero stato esterno | ✅ | Il testo dell'editor è l'unica sorgente di verità |
| Deterministico | ✅ | Stesso testo → stesso output, sempre |
| Parlante | ✅ | `# ---` è autoesplicativo nel testo |
| Serializzabile | ✅ | Share link funziona, il file `.esql` salvato contiene tutto |
| Un solo editor | ✅ | Nessun secondo textarea o pannello aggiuntivo |
| Compatibile con schema tabs | ✅ | Ogni tab può avere il proprio `# ---` o no |
| Compatibile con settings | ✅ | v1 e v2 possono avere `# settings` distinte |
| Backward compatible | ✅ | Chi non usa `# ---` non vede nessuna modifica |
| Implementazione minima | ✅ | ~30 righe in `update()` + regex + CSS per il separator |

---

## 8. Casi limite

| Caso | Comportamento |
|------|---------------|
| `# ---` ma v2 vuoto | `toDiff(v1, "")` → drop di tutte le tabelle di v1 |
| `# ---` ma v1 vuoto | `toDiff("", v2)` → create di tutte le tabelle di v2 |
| Più `# ---` nel testo | Solo la prima occorrenza divide v1 da v2; le successive sono trattate come testo di v2 |
| Settings solo in v1 | v2 eredita i valori di default; l'utente può aggiungere `# settings` anche in v2 |
| Settings in v2 differenti da v1 | Entrambi i contesti vengono creati con le loro settings — `toDiff` accetta `options` per-contesto |
| Errore di parsing in v1 o v2 | Il pannello mostra il messaggio di errore come fa già oggi per il DDL |

---

## 9. Implementazione — componenti da modificare

| File | Modifica |
|------|---------|
| `web/app.js` | `update()`: rilevare delimitatore, chiamare `toDiff` o `toDDL`; aggiornare label pulsanti |
| `web/app.js` | Aggiungere pulsante `⇄ Compare versions` nella toolbar editor |
| `web/app.css` | Stile per `.qs-migration-sep` nel highlighter |
| `web/highlight.js` | Riconoscere `# ---` e assegnare classe speciale |
| `web/app.css` | Stile per barra warning sopra l'output (DESTRUCTIVE / LOSSY / INFO) |
| `index.html` | Pulsante `⇄ Compare versions` nella toolbar editor (sinistra del pannello) |

**Nessun nuovo file.** Nessuna modifica al core (`src/`).

---

## 10. Prossimi passi

1. ✅ Revisione e approvazione di questo documento
2. Implementazione in `web/app.js` — parsing del delimitatore + switch `toDDL`/`toDiff`
3. Stile separatore in `web/highlight.js` + `web/app.css`
4. Pulsante `⇄ Compare versions`
5. Aggiornamento `doc/user/espresql-grammar.md` — documentare la sintassi `# ---`
6. Aggiornamento `doc/user/examples.md` — esempio 17 aggiornato con la nuova sintassi
