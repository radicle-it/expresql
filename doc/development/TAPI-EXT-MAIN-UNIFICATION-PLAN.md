# Piano di unificazione: `tapi-ext` come unico branch

**Stato**: Piano approvato, esecuzione non ancora iniziata
**Data**: 2026-09-10
**Decisione**: `tapi-ext` diventa l'unico branch attivo. Il lavoro fatto su `main`
dal punto di diramazione (8 maggio 2026, commit `2de4d31`) in poi **non viene
copiato né mergiato** — viene ricostruito da capo sopra `tapi-ext`, usando i
commit di `main` come riferimento di *cosa* ottenere, non di *come* (vedi
`doc/development/TAPI-LAYERED-ARCHITECTURE.md` per il disegno del sistema a
tier che è il punto di partenza).

## Perché ricostruire e non mergiare

Verificato con un rebase di prova reale (poi annullato, nessuna modifica
persistita): dal terzo commit in poi, `main` e `tapi-ext` hanno riscritto le
**stesse funzioni** del generatore (`_generateDalBody`/`update_row` e affini
in `src/oracle/plsql.ts`) per motivi incompatibili — `tapi-ext` per i tier,
`main` per l'isolamento multi-tenant. Non sono conflitti di formattazione, è
la stessa funzione evoluta in due direzioni contemporaneamente per ~15 dei 25
commit. Mergiare richiederebbe risolvere ognuno di questi a mano con lo
stesso rischio (e probabilmente lo stesso sforzo) di riprogettarli — con il
rischio aggiuntivo di introdurre bug sottili in un merge non banale.

## Punto di partenza: stato di `tapi-ext` oggi

- Sistema a tier completo (`lookup`, `lookup+hks`, `service`, `service+hks`,
  `full`, `full+hks`), documentato in `doc/development/
  TAPI-LAYERED-ARCHITECTURE.md` (v1.9), con test dedicato
  (`test/integration/tapi-layered.test.ts`).
- Pacchetto interfaccia già rinominato `_apx` → `_app`.
- Lavoro proprio successivo non presente su `main`: dialetto DB2, restyling
  pannello impostazioni/tema, pulizia librerie, rinomina progetto a
  ExpreSQL (fatta autonomamente, in modo diverso dalla rinomina di `main`).
- **Problema noto da sistemare per primo**: `npm run test:ts` fallisce su
  `test/integration/regression.test.ts` — 17 test su 849 falliscono con
  "token mismatch" sui fixture `star/*.esql` — quasi certamente un
  disallineamento estensione file (`.qsql`→`.esql`) rimasto a metà dalla
  rinomina propria di `tapi-ext`. Va chiuso prima di costruirci sopra, per
  ripartire da una baseline verde.
  **Fatto** (`01c6e9b`) — causa reale trovata: BOM UTF-8 in 17 baseline
  `.sql`, mai gestito dal lexer; risolto nel test harness invece che nei
  singoli fixture. 849/849 verdi.

## Attività, in ordine

Ogni attività è "ricostruisci il comportamento descritto, tenendo conto dei
tier" — non un cherry-pick. Dove il main originale presuppone un'unica forma
(`full+hks`), l'attività include la decisione esplicita di come si comporta
per gli altri tier (spesso: la stessa logica, incorporata nella funzione che
quel tier usa per assorbire il layer assente — vedi la regola di
degradazione già in `TAPI-LAYERED-ARCHITECTURE.md`).

### 0. Baseline verde
Sistemare il fallimento dei 17 test di `regression.test.ts` su `tapi-ext`
(fixture `.esql` disallineati). Nessun lavoro nuovo finché la suite non è
verde.

### 1. Isolamento multi-tenant: seam nel DAL invece di parametro dal chiamante
Modello: `aa6776c` + `0bca57a` + `433cb12` + `7de6b14` (14 luglio).
- Package condiviso `<prefix>tenant_ctx` (get_id, set_id, clear_id) invece di
  `p_tenant_id` passato dal chiamante (insicuro: chiunque può falsificarlo).
- Ogni filtro tenant nel DAL (get_by_id, lock_by_id, get_by_<col>, get_all,
  insert_row, update_row stale-data check, delete_row) legge da lì.
- Opzione `readonlyviews` (vista `WITH READ ONLY` + filtro `tenant_ctx.get_id`).
- **Decisione da prendere qui**: per i tier `service`/`lookup`, dove queste
  operazioni sono procedure private embedded invece che un `_dal` a parte, la
  stessa chiamata a `tenant_ctx` va incorporata nella funzione che le assorbe
  — stesso principio, punto di generazione diverso.
- UI: checkbox `readonlyviews` nel pannello impostazioni (adattare al pannello
  attuale di `tapi-ext`, che è stato restilizzato rispetto a quello di `main`).

**Fatto**. `_generateDalBody` (tier `full`/`full+hks`) e `_generatePrivateDml`
(tier `service`/`lookup`, procedure private embedded) applicano entrambe lo
stesso scoping via `<prefix>tenant_ctx.get_id` su get_by_id/lock_by_id/
get_by_<col>/get_all/insert_row/update_row (+ stale-data check)/delete_row —
la decisione sui tier degradati era esplicita nel piano ed è stata applicata
di conseguenza. `_svcParamCols` non espone più `tenant_id` al chiamante (era
ancora nella forma insecura pre-luglio, dato che il sistema a tier è nato
prima del redesign su `main`). Vista join (`name: v1 v2`) ora filtra su
`tenant_ctx.get_id` quando la tabella driver ha `tenant_id` sintetico, più
`WITH READ ONLY` quando `readonlyviews: yes` — funzionalità che su `tapi-ext`
non esisteva affatto prima (`view.ts` non aveva alcuna logica tenant).
Pacchetto condiviso `<prefix>tenant_ctx` (get_id/set_id/clear_id) emesso una
sola volta, prima del primo package layered che lo referenzia. UI: checkbox
`readonlyviews` nel pannello impostazioni attuale di `tapi-ext` (non
riportato l'esempio dimostrativo in `web/app.js`, rimandabile). 3 test
esistenti in `tapi-layered.test.ts` asserivano il vecchio comportamento
insicuro — riscritti per asserire il nuovo; aggiunti 3 test nuovi (scoping
DAL su read/write, generazione del pacchetto condiviso). 852/852 verdi,
build completa pulita.

### 2. Allineamento colonne dinamico in `t_rec`/parametri APX
Modello: `6020218`. `padEnd()` fisso → calcolato sulla lunghezza massima
reale dei nomi colonna per tabella. Applicare ovunque `t_rec`/liste parametri
vengono generate — per tier `full+hks` è un solo punto, per gli altri tier
verificare che la stessa generazione (embedded o no) sia coperta.

### 3. Estensione interfaccia: `ifc: rest`
Modello: `3e3f3aa` + `ab0e37c` + `f34c57f` (19 luglio). Pacchetto `_rst` con
handler ORDS (get_one/get_all/post_one/put_one/delete_one), bind variabili
ORDS native, `json_object`/`json_value`/`json_exists`, DROP corretto per
`ifc: rest/none` invece di assumere sempre `_app`.
- **Decisione da prendere qui**: `_rst` è stato progettato su `main` assumendo
  che sotto ci sia sempre `_svc`. Per i tier senza `_svc` separato (`lookup`,
  `lookup+hks`), `_rst` deve chiamare `_app` direttamente — da decidere e
  documentare esplicitamente, non implicito.

### 4. Eliminare `p_id` duplicato su PK utente-definite
Modello: `84e33ad`. Quando `pk: none`/`genpk: no` e la colonna PK è dichiarata
a mano, non generare sia il parametro esplicito sia quello da `_svcParamCols()`.
Fix puntuale, verificare su tutti i tier che costruiscono la lista parametri.

### 5. Fix lexer: `/check` con valori che iniziano per cifra ma non numerici
Modello: `667ecfd`. `"2WAY"` classificato erroneamente come numerico dal
lexer, valore emesso senza quote → DDL invalido. Fix nel lexer/generatore,
indipendente dai tier.

### 6. Fix inferenza tipo: `vc`/`int`/`vector` espliciti vincono su euristica `is_`
Modello: `515ce36`. Un tipo esplicito (`vc1 /check Y,N`) non deve essere
scavalcato dall'euristica boolean su colonne `is_*`/`*_yn`. Fix nella fase di
inferenza tipo, indipendente dai tier.

### 7. Messaggi di errore con prefisso classificabile + fix suffisso pacchetto IFC
Modello: `6a31922`. Prefissare `raise_application_error` per
`c_err_stale_data`/`c_err_not_found`/`c_err_locked`/`dup_val_on_index` con un
token tra parentesi quadre (`[STALE_DATA]`, `[NOT_FOUND]`, ecc.) — necessario
perché un layer chiamante (es. `APEX_EXEC`) rilancia l'eccezione come
`ORA-20987` generico, il token nel testo è l'unico modo per classificarla a
valle. Applicare in ogni punto che solleva questi errori, su ogni tier —
incluse le procedure private embedded di `service`/`lookup`.

### 8. `/versioned` + `dimensioncolumns` (row-level scope)
Modello: `c7e6c9b`, il più corposo. Due feature distinte arrivate nello
stesso commit su `main`:
- `/versioned`: tabelle temporali insert-only (valid_from/valid_to/is_current,
  trigger di immutabilità, `close_row`/`close_version`, vista `_current`).
- `dimensioncolumns`: scope a livello riga generalizzato oltre `tenantid`
  (mappa colonna→tipo dimensione), `chk_rbac` sempre generato su ogni
  tabella, `chk_rls` solo se configurato, filtro anti-IDOR su get_by_id/
  lock_by_id/get_all.
- **Decisione da prendere qui, esplicita, non implicita come su `main`**:
  `chk_rbac`/`chk_rls` presuppongono un `_hks`. Per i tier senza `_hks`
  (`lookup`, `service`, `full`), `dimensioncolumns` è compatibile? Se sì, dove
  vive il controllo? Se no, va documentato come vincolo del tier (es.
  "`dimensioncolumns` richiede almeno `+hks`"). Da decidere qui, prima di
  scrivere codice, non durante.
- `/versioned` ha lo stesso problema per `close_row`: la vista `_current` e la
  procedura `close_row` presuppongono oggi la forma `full+hks`.

### 9. Documentazione `dimensioncolumns`/`chk_rbac`/`chk_rls`
Modello: `51bd5ae`. Stesso trattamento già dato a `tenantid` nella doc:
sezione dedicata in `quick-sql-grammar.md`, riga nella tabella di copertura
in `DOCUMENTATION_SPEC.md`. Da scrivere DOPO il punto 8, includendo
esplicitamente l'interazione con i tier (assente nella versione originale su
`main`, che non aveva tier da documentare).

### 10. Placeholder UI per `dimensioncolumns` nel pannello impostazioni
Modello: `db5ffd2`. Checkbox che inserisce un placeholder letterale
`dimensioncolumns: { company_id: "COMPANY" }` (non un vero round-trip
bidirezionale — il parser delle impostazioni nel pannello non è JSON-aware).
Adattare al pannello attuale di `tapi-ext` (già restilizzato).

### 11. Fix: colonna di scope NULL trattata come condivisa/sempre visibile
Modello: `960ddcc`. Il filtro anti-IDOR di lettura non gestiva il caso
colonna dimensione NULL (riga condivisa) — restava invisibile a tutte le
sessioni perché NULL non uguaglia mai un codice di scope. Applicare dopo il
punto 8, stesso filtro.

### 12. Unificare la lettura: vista `<tabella>_rls` invece di WHERE ripetuto
Modello: `2c42616`. Le funzioni di lettura (get_by_id/lock_by_id/get_all/
get_by_<unique>) non ricostruiscono più il proprio filtro — leggono da una
vista `<tabella>_rls` generata una volta, subito prima del corpo DAL. Per i
tier senza `_dal` separato, la stessa vista esiste comunque (è un oggetto DB,
non un package) — verificare che le procedure private embedded leggano da lì
allo stesso modo.

### 13. Vista `_rls` sempre generata, anche senza colonne di dimensione
Modello: il lavoro più recente, fatto ieri in questa sessione (non ancora
committato su `main` al momento di questo piano — vedi `git stash` su
`main`). Principio: il livello di presentazione (incluso il DAL stesso) non
deve mai leggere una tabella direttamente, solo una vista — passthrough
(`select * from <tabella>`) quando non c'è nulla da filtrare. Da rifare qui
DOPO il punto 12, sulla vista unificata di `tapi-ext`.

### 14. Verifica incrociata della rinomina progetto
Non una vera "attività di porting" — `tapi-ext` ha già la propria rinomina a
ExpreSQL (commit `bfead75`/`ac30e19`), fatta indipendentemente da quella di
`main` (`eaaa6a5`/`12d1c5c`). Checklist: cercare riferimenti residui a
"quick-sql"/"QuickSQL" rimasti in commenti, nomi di file, doc — su entrambe
le rinomine capita che qualcosa sfugga (è già successo, vedi il problema del
punto 0).

### 15. Validazione finale
- `npm run test:ts` verde su tutta la suite.
- `npm run build` (tutti i target: DDL Oracle, DDL DB2, MLE, web) senza errori.
- Confronto mirato: stessi fixture `.qsql`/`.esql` di prova compilati sia con
  `tapi-ext` aggiornato sia con `main` attuale, differenza attesa **solo**
  dove la struttura a tier cambia deliberatamente la forma generata — ogni
  altra differenza è una regressione da investigare.

### 16. Decisione sul destino di `main` — rimandata
Non eseguire ora. Solo dopo il punto 15, quando `tapi-ext` avrà parità
completa (e in più i tier), si decide se archiviare, rinominare o cancellare
`main`/`origin/main`. Richiede conferma esplicita quando ci si arriva — è
un'operazione distruttiva su un branch remoto condiviso.

## Nota sull'ordine

L'ordine sopra ricalca quello cronologico di `main` perché riflette anche
dipendenze reali: il punto 8 (dimensioncolumns) riusa lo stesso principio di
"vista come punto di lettura" che il punto 1 (tenant_ctx) ha già stabilito
per il multi-tenant, e il punto 12/13 generalizzano ulteriormente quel
principio. Non è necessario fare tutto in una sessione: ogni punto è
verificabile in isolamento (build + test) prima di passare al successivo.
