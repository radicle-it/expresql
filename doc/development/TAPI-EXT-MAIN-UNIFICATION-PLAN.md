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
Modello: `aa6776c` + `0bca57a` + `433cb12` + `7de6b14` (14 luglio) +
`757cf4d` (16 luglio, split tenant_ctx/tenant_bootstrap — vedi nota "Fatto").
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

**Correzione (successiva, durante l'indagine del punto 3)**: il commit
`7de6b14` usato come modello iniziale genera `tenant_ctx` come un unico
package con `get_id`+`set_id`+`clear_id` insieme — ma non era l'ultima parola
di `main` sullo stesso giorno. Il commit successivo `757cf4d` (stesso 16
luglio, poche ore dopo, descritto come modifiche esterne dell'utente) divide
il package in due, per un motivo di sicurezza reale: Oracle vincola
`DBMS_SESSION.SET_CONTEXT`/`CLEAR_CONTEXT` per un namespace al solo package
nominato in `CREATE CONTEXT <ns> USING <package>` (altrimenti ORA-01031),
quindi quel package non può essere anche quello concesso ampiamente per la
sola lettura — altrimenti chi ha `EXECUTE` su `get_id` ottiene anche la
capacità di impersonare qualunque tenant via `set_id`. Ricostruito di
conseguenza: `<prefix>tenant_ctx` ora contiene solo `get_id` (concedibile
ampiamente al ruolo applicativo/APEX), `<prefix>tenant_bootstrap` è un nuovo
package con `set_id`/`clear_id` (da concedere solo a un principal fidato —
proprietario di un logon trigger o handler di autenticazione), emesso subito
dopo `tenant_ctx` nello stesso punto di `generateFullDDL`. Test
`tenant_ctx`/`tenant_bootstrap` in `tapi-layered.test.ts` riscritti di
conseguenza (4 test, uno diviso in due + verifica ordine emissione + verifica
commento `CREATE CONTEXT`). 857/857 verdi, build completa pulita.

### 2. Allineamento colonne dinamico in `t_rec`/parametri `_app`
Modello: `6020218`. `padEnd()` fisso → calcolato sulla lunghezza massima
reale dei nomi colonna per tabella. Applicare ovunque `t_rec`/liste parametri
vengono generate — per tier `full+hks` è un solo punto, per gli altri tier
verificare che la stessa generazione (embedded o no) sia coperta.

**Fatto**. `padEnd(20)` fisso in `_generateSvcSpec` (t_rec) e `padEnd(13)`
fisso in `_generateAppSpec`/`_generateAppBody` (get/ins/upd) → larghezza
calcolata per tabella (`Math.max(minimo, ...nomi.map(n => n.length + 1))`).
`_rst` non ha bisogno dello stesso fix: usa bind variabili ORDS
(`:p_id`/`:body_text`), nessuna lista di parametri PL/SQL da allineare —
non esisteva nemmeno su `main` quando `6020218` fu scritto (`ifc: rest` è
arrivato dopo, 19 luglio). Colto anche l'avviso dell'utente: rinominata la
variabile locale `apx`→`app` in `_generateAppSpec`/`_generateAppBody`
(generava già `_app` in output, ma la sorgente diceva ancora `apx`) e
corretti due commenti che dicevano "APX parameter lists" invece di "_app
parameter lists" — nessun residuo `apx`/`APX` rimasto nel file. 2 nuovi test
(nome lungo forza un allineamento condiviso su tutta la lista, non solo sulla
colonna lunga). 854/854 verdi, build completa pulita.

### 3. Estensione interfaccia: `ifc: rest`
Modello: `3e3f3aa` + `ab0e37c` + `f34c57f` (19 luglio). Pacchetto `_rst` con
handler ORDS (get_one/get_all/post_one/put_one/delete_one), bind variabili
ORDS native, `json_object`/`json_value`/`json_exists`, DROP corretto per
`ifc: rest/none` invece di assumere sempre `_app`.
- **Decisione da prendere qui**: `_rst` è stato progettato su `main` assumendo
  che sotto ci sia sempre `_svc`. Per i tier senza `_svc` separato (`lookup`,
  `lookup+hks`), `_rst` deve chiamare `_app` direttamente — da decidere e
  documentare esplicitamente, non implicito.

**Fatto**. `_rst` su `tapi-ext` esisteva già (nato indipendentemente da
`main`, con lo stesso schema finale: bind variabili ORDS `:p_id`/`:body_text`/
`:status`, `json_object`/`json_value`/`json_exists`, handler eccezioni
condiviso) — verificato *prima* di assumere una ricostruzione, come
annunciato. La decisione su `lookup`/`lookup+hks` (senza `_svc`) era già
risolta correttamente: `_rst` chiama le funzioni private assorbite
(`p_get_by_id`/`p_insert_row`/ecc.) esattamente come `_app` fa per lo stesso
tier — stesso principio di degradazione, stesso punto di generazione
(`_generatePrivateDml`).

Il confronto riga per riga con `main` a `f34c57f` ha però trovato due gap
reali, non presenti nel piano originale perché `_rst` di `main` a quella data
non conosceva ancora il sistema a tier:
- **`get_all` mancava del tutto** — nessun endpoint di collezione, su nessun
  tier. Aggiunto: `p_get_all` (nuova funzione privata assorbita,
  `sys_refcursor`, stesso scoping tenant di `p_get_by_id`) in
  `_generatePrivateDml`; `_svc` espone ora `get_all` pubblico (delega a
  `_dal.get_all` quando presente, altrimenti `p_get_all` — stesso pattern già
  usato per `get`); `_rst.get_all` chiama `_svc.get_all` quando `_svc` è
  presente, altrimenti `p_get_all` direttamente (stesso pattern di
  `_rst.get`). Nota: `hasDal` implica sempre `hasSvc` nel sistema a tier
  attuale (`full`/`full+hks` sono l'unico sottoinsieme con `_dal`, ed sono
  entrambi anche in `hasSvc`), quindi il caso "dal presente senza svc" non
  esiste — la degradazione a due rami (`hasSvc` sì/no) in `_rst` è completa.
- **Bug**: la chiave JSON di `ins`/`upd`/`del` era `'id'` letterale invece del
  nome reale della colonna PK (`pkNm`) — su una tabella con PK definita
  esplicitamente (es. `code vc20 /pk`), la risposta REST avrebbe restituito
  `{"id": ...}` invece di `{"code": ...}`. Corretto in tutti e tre i punti.

6 test nuovi in `tapi-layered.test.ts` (spec/body `get_all` per tier
full/service/lookup, verifica che `_rst.get_all` non tocchi `_svc` quando
assente, verifica chiave JSON su PK non standard). 862/862 verdi, build
completa pulita.

### 4. Eliminare `p_id` duplicato su PK utente-definite
Modello: `84e33ad`. Quando `pk: none`/`genpk: no` e la colonna PK è dichiarata
a mano, non generare sia il parametro esplicito sia quello da `_svcParamCols()`.
Fix puntuale, verificare su tutti i tier che costruiscono la lista parametri.

**Fatto**. Confermato il bug (verificato prima con un dump diretto): con PK
dichiarata a mano e chiamata `id`, `_app`/`_rst` generavano sia il parametro
`p_id` esplicito sia — dato che `_svcCols()` non esclude la PK per nome — un
secondo `p_id` da `_svcParamCols()`, due parametri formali con lo stesso nome
(errore di compilazione Oracle, PLS-00371). Con PK a nome diverso (es.
`code`) non c'è collisione di nome ma la stessa ridondanza semantica
(`p_id`/`p_code` che veicolano lo stesso valore sotto due nomi).

Aggiunto `_pkIsUserDefined()`; filtrata la PK dalla lista piatta di parametri
(`appCols` in `_generateAppSpec`/`Body`, `rstCols` in `_generateRstBody`) su
get/ins/upd, su tutti i tier (`hasSvc`/`!hasSvc`). Per `ins`, quando la PK è
utente-definita: in `_app`, `p_id` passa da OUT a IN (il chiamante fornisce
la chiave), il corpo assegna `l_rec.pkNm := p_id` (o `l_row.pkNm := p_id` sul
ramo assorbito) e una `l_xid` locale assorbe l'OUT di `create_rec`; in
`_rst`, `l_rec.pkNm`/`l_row.pkNm` viene estratto esplicitamente dal body JSON
(`json_value(l_body, '$.pkNm')`). Per `upd` la PK resta **volutamente non**
riestratta da `p_<pkNm>`/dal body — è immutabile, viene sempre e solo da
`p_id`/`:p_id` (decisione esplicita, non implicita, coerente con main). Il
livello `_svc` (t_rec, `create_rec`/`update_rec`) resta invariato: non ha un
parametro `p_id` esplicito parallelo con cui collidere, quindi non necessita
del filtro. Bug collaterale corretto in `_generateAppBody`'s `upd` (ramo
`!hasSvc`): il loop del corpo referenziava ancora `paramCols` non filtrato
mentre la firma dichiarava solo `appCols` — avrebbe prodotto un riferimento a
un parametro `p_<pkNm>` non dichiarato quando la PK è utente-definita.

10 test nuovi in `tapi-layered.test.ts` (collisione di nome su `_app`
get/ins/upd, propagazione `l_xid`/`l_rec.pkNm`, immutabilità della PK in
`upd`, stesso comportamento su `_rst` per tier full/lookup, caso PK
auto-generata invariato). 872/872 verdi, build completa pulita.

### 5. Fix lexer: `/check` con valori che iniziano per cifra ma non numerici
Modello: `667ecfd`. `"2WAY"` classificato erroneamente come numerico dal
lexer, valore emesso senza quote → DDL invalido. Fix nel lexer/generatore,
indipendente dai tier.

**Fatto**. Confermato il bug con un dump diretto prima di correggere:
`/check 2WAY,3WAY` produceva `check (match_type in (2WAY,3WAY))` — DDL
invalido, ORA-00907. La causa non è nel lexer (il nome del task era
impreciso, il modello `667ecfd` la corregge in `node.ts`, non nel lexer): il
lexer marca qualunque token che inizia per cifra come `constant.numeric`,
anche quando il resto non è numerico (`2WAY`, `24H`, `1ST`); `listValues()`
si fidava di quella classificazione senza verificarne il contenuto reale.
Aggiunto `_isPureNumericLiteral()` (regex `^-?\d+(\.\d+)?$`) e
`_isUnquotedNonNumericToken()` (identifier, oppure numeric-ma-non-realmente-
numerico) — sostituiscono il controllo diretto `type === 'identifier'` nei
due punti di `listValues()` (branch a separatore spazio, branch a
separatore virgola/aggregato). Nessun tocco al lexer stesso, come da
modello — comportamento di stringhe già quotate e literal backtick
invariato.

Durante la verifica trovata una piccola asimmetria non prevista dal modello:
il branch a virgola già escludeva `'null'` dalla quotatura per il valore
*durante* il loop (`aggrVal !== 'null'` prima del `continue` sul
separatore) — evidentemente un fix precedente indipendente su `tapi-ext` —
ma non per l'**ultimo** valore della lista, gestito dopo la fine del loop
con uno statement separato privo dello stesso guard. Corretto per simmetria
(stesso punto toccato dal modello `667ecfd`, che aggiunge esattamente questo
guard lì).

3 test nuovi in `small.test.ts` (quotatura valori tipo `2WAY`, valori
numerici reali restano non quotati, `null` finale in lista a virgola resta
non quotato). 875/875 verdi, build completa pulita.

### 6. Fix inferenza tipo: `vc`/`int`/`vector` espliciti vincono su euristica `is_`
Modello: `515ce36`. Un tipo esplicito (`vc1 /check Y,N`) non deve essere
scavalcato dall'euristica boolean su colonne `is_*`/`*_yn`. Fix nella fase di
inferenza tipo, indipendente dai tier.

**Fatto**. Codice di `inferType()` su `tapi-ext` identico a `main` pre-fix
(stessa Fase 4, stesse variabili `vcPos`/`occursBeforeOption('int', true)`/
`vector` già presenti) — bug confermato presente: `is_overrun vc1 /nn /check
Y,N` su db ≥ 23 produceva `boolean not null` senza check constraint,
scartando silenziosamente il tipo e la direttiva espliciti dell'utente.
Aggiunta la guardia `hasExplicitType` (vero se `vcPos > 0`, oppure `int`
compare prima di un'opzione, oppure è stato rilevato un tipo `vector`) —
l'euristica per nome (`is_*`/`*_yn`) viene saltata quando è vera. Il ramo
`hasBoolKeyword` (`yn`/`boolean`/`bool` come parola chiave) resta invariato:
è già una dichiarazione esplicita, deve sempre vincere.

Aggiornato un test esistente che documentava il vecchio comportamento come
atteso; aggiunto un test che conferma che `is_*` senza tipo esplicito
continua a mappare a `boolean` nativo su db ≥ 23 (comportamento corretto,
non toccato dal fix). 876/876 verdi, build completa pulita.

### 7. Messaggi di errore con prefisso classificabile + fix suffisso pacchetto IFC
Modello: `6a31922`. Prefissare `raise_application_error` per
`c_err_stale_data`/`c_err_not_found`/`c_err_locked`/`dup_val_on_index` con un
token tra parentesi quadre (`[STALE_DATA]`, `[NOT_FOUND]`, ecc.) — necessario
perché un layer chiamante (es. `APEX_EXEC`) rilancia l'eccezione come
`ORA-20987` generico, il token nel testo è l'unico modo per classificarla a
valle. Applicare in ogni punto che solleva questi errori, su ogni tier —
incluse le procedure private embedded di `service`/`lookup`.

**Fatto**. Il fix del suffisso pacchetto IFC (`_apx` → `_app`) era già stato
applicato in una fase precedente di questo stesso lavoro di unificazione (su
istruzione esplicita dell'utente durante il punto 2), quindi qui è servito
solo il prefisso ai messaggi di errore. Il modello (`6a31922`) tocca 5 punti
in `plsql.ts`, tutti nel mondo "DAL sempre presente" di `main` a quella data:
`_dal.lock_by_id` (`[NOT_FOUND]`, `[LOCKED]`), `_dal.update_row` stale-data
check (`[STALE_DATA]`, `[NOT_FOUND]` annidato), `_svc.create_rec`
(`[DUPLICATE]`). Il sistema a tier di `tapi-ext` — evoluzione indipendente,
non esistente su `main` a quella data — duplica esattamente lo stesso
pattern di messaggi in altri 5 punti non coperti dal modello: le funzioni
private assorbite in `_generatePrivateDml` (`p_get_by_id`: `[NOT_FOUND]`;
`p_update_row` stale-data check: `[STALE_DATA]`/`[NOT_FOUND]`) e altri due
handler `dup_val_on_index` in `_generateAppBody`'s `ins`/`upd` (ramo
`!hasSvc`, tier `lookup`/`lookup+hks`) oltre a quello in `_svc.create_rec`.
Applicato lo stesso principio ovunque, per coerenza — lasciare non protetti
i percorsi assorbiti avrebbe riprodotto lo stesso tipo di inconsistenza già
corretta ai punti 3 e 4. Il trigger di immutabilità (`co_immutable_err`,
costanti nominate, non stringa inline) resta fuori scope, come su `main`.

Aggiunta la sezione §9.1 a `TAPI-LAYERED-ARCHITECTURE.md` (v1.9 → v1.10) che
documenta la convenzione, esplicitamente estesa alle forme degradate/
assorbite — non presente nel modello (il doc di `main` a quel commit non
conosceva ancora il sistema a tier).

6 test nuovi in `tapi-layered.test.ts` (tier `full+hks`: DAL/SVC; tier
degradati: `p_get_by_id`/`p_update_row` assorbiti, `_app` `dup_val_on_index`
su tier `lookup`). 882/882 verdi, build completa pulita.

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

**Fatto**. Entrambe le decisioni sono state prese nella stessa direzione:
**compatibile con ogni tier**, seguendo lo stesso principio di degradazione
già alla base di tutto questo lavoro di unificazione ("ogni layer chiama
quello sotto se presente, lo assorbe come procedura privata se assente" —
già applicato identicamente a tenant scoping, `get_all`, messaggi
d'errore). Non è stata introdotta alcuna restrizione di tier per nessuna
delle due feature — estendere la macchina di assorbimento già esistente
non aggiunge complessità reale, applica lo stesso pattern già collaudato
a una dimensione in più.

**`/versioned`** — parte tier-indipendente (colonne `valid_from`/`valid_to`
custom/`is_current` virtuale, vista `_current` + indice, trigger di
versionamento che blocca DELETE e limita UPDATE alla sola chiusura di
`valid_to`) ricostruita 1:1 dal modello. Parte TAPI, tier-aware:
- `_dal` (hasDal): `close_row` sostituisce `update_row`+`delete_row`.
- `_generatePrivateDml` (!hasDal): nuova `p_close_row` assorbita, stesso
  schema di `close_row`, sostituisce `p_update_row`/`p_delete_row`.
- `_hks` (hasHks): `before_close`/`after_close` sostituiscono
  `before_update`/`after_update`/`before_delete`/`after_delete`.
- `_generatePrivateHookStubs` (!hasHks): stessa sostituzione,
  `p_before_close`/`p_after_close`.
- `_svc`: `close_version` sostituisce `update_rec`+`delete_rec` — instrada
  verso `hasDal ? dal.close_row : p_close_row` e
  `hkCall('before_close')`/`hkCall('after_close')`, non hardcoded come nel
  modello (che non aveva tier da instradare).
- `_app`/`_rst`: `close` sostituisce `upd`+`del` — quando `hasSvc` chiama
  `svc.close_version`; quando non c'è `_svc` (tier `lookup`), assorbe
  direttamente `p_close_row` + hook privati, stesso pattern già usato per
  `ins`/`upd`/`del` assorbiti.

**`dimensioncolumns`** — `chk_rbac`/`chk_rls` vivono in `_hks` quando
presente; quando `!hasHks`, assorbiti come `p_chk_rbac`/`p_chk_rls` in
`_generatePrivateHookStubs` (`p_chk_rbac` sempre, `p_chk_rls` solo se
configurato — stessa condizione di `_hks`), chiamati tramite lo stesso
`hkCall()` già usato per `validate`/`before_insert`/ecc. — nessun nuovo
meccanismo, lo stesso già esistente esteso a due hook in più. Ordine
`chk_rbac` → `chk_rls` → `validate` applicato identicamente in tutti e 12 i
punti che generano quella sequenza (`_svc`: insert/update/delete/close ×
`_app`/`_rst` assorbiti sullo stesso set di operazioni per il tier
`lookup`). Filtro di lettura anti-IDOR (`_dimensionScopeConditions`)
applicato sia in `_generateDalBody` sia in `_generatePrivateDml`
(get_by_id/lock_by_id/get_by_unique/get_all), rispecchiando esattamente il
pattern già usato per `tenant_ctx.get_id` dal punto 1. Le scritture
(insert_row/update_row/delete_row/close_row) restano **senza** filtro nel
WHERE — resta autoritativo `chk_rls`, che solleva invece di no-oppare in
silenzio, come nel modello.

Corretto anche un bug reale scoperto durante l'implementazione: `delete_rec`
non recuperava mai la riga né chiamava `validate('delete', ...)` — l'unica
operazione su cui `validate()` non veniva mai invocato, su nessuna tabella,
indipendentemente da `dimensioncolumns`. Applicato lo stesso fix anche al
percorso assorbito in `_app`/`_rst` (tier `lookup`) per lo stesso principio
di coerenza già seguito ai punti 3, 4, 7 — il modello non copre quel
percorso (non esisteva su `main`).

Bundle di fix minori dallo stesso commit modello, applicati per lo stesso
criterio "ricostruire fedelmente" seguito in tutto questo piano: `subtype
t_id` in `_generateDalSpec` ancorato al vero nome PK invece di `.id`
hardcoded; NOT NULL propagato sulla colonna FK anche nel ramo ALTER TABLE
postponed (mancava solo lì); `singular()` non tronca più parole che
finiscono in `-ss` (address, class, access); warning nuovo `/fk` con tipo
esplicito ignorato silenziosamente; warning nuovo `/versioned` +
`/immutable` contraddittori; `auditlog`/`versioned` aggiunti alla whitelist
direttive di tabella (mancava `auditlog`, falso positivo di "typo"
preesistente). Grammatica (`quick-sql-grammar.md`,
`railroad_diagram.md`) aggiornata per `/versioned`; documentazione
`dimensioncolumns` rimandata al punto 9 come da piano.

54 test nuovi (21 in `test/unit/dimensionscope.test.ts`, 19 in
`tapi-layered.test.ts`, 14 in `small.test.ts`) — copertura tier `full+hks`
fedele al modello, più degradazione `service`/`lookup` non presente nel
modello. 936/936 verdi, build completa pulita.

### 9. Documentazione `dimensioncolumns`/`chk_rbac`/`chk_rls`
Modello: `51bd5ae`. Stesso trattamento già dato a `tenantid` nella doc:
sezione dedicata in `quick-sql-grammar.md`, riga nella tabella di copertura
in `DOCUMENTATION_SPEC.md`. Da scrivere DOPO il punto 8, includendo
esplicitamente l'interazione con i tier (assente nella versione originale su
`main`, che non aveva tier da documentare).

**Fatto**. Portato il contenuto del modello in tutti i punti previsti,
riposizionato secondo la struttura reale di `tapi-ext` (diversa da `main`:
niente `_apx`, sistema a tier, `examples.md` numerato in modo indipendente
— arrivato a 24 esempi propri, non i 18 di `main`):
- `DOCUMENTATION_SPEC.md`: riga `dimensioncolumns` nella tabella impostazioni
  (gruppo "Output e funzionalità", accanto ad `api`), descrizione adattata
  per menzionare l'assorbimento (`chk_rls` "in `_hks` (o assorbito)").
- `quick-sql-grammar.md`: voce `dimensionColumns` nel TOC + sezione dedicata
  dopo `tenantID` (stesso stile di `tenantRef`); sottosezione `chk_rbac and
  chk_rls (api: layered)` sotto la documentazione dei tier, esplicitamente
  estesa alla degradazione tier (menziona `p_chk_rbac`/`p_chk_rls` assorbiti
  quando `_hks` è assente — non presente nel modello); regola grammaticale
  `individual_setting` estesa con l'alternativa a oggetto JSON.
- `examples.md`: nuovo esempio (numerato 25, non 19 — la numerazione di
  `tapi-ext` è già propria) con output DDL trascritto da una vera
  esecuzione (non a memoria, stesso principio del modello), verificato che
  il comportamento di lettura per `get_by_id` su `tapi-ext` NON abbia il
  blocco `exception`/`NO_DATA_FOUND` esplicito che ha `main` (propaga
  all'chiamante per design preesistente di `tapi-ext` — la trascrizione
  riflette il comportamento reale, non quello del modello).
- `web/app.js`: nuova voce nella gallery di esempi in-browser, categoria
  `Multi-tenant` (`tapi-ext` ha un campo `cat` che il modello non aveva).
- Non toccato `railroad_diagram.md`/`.xhtml` per lo stesso motivo del
  modello — diagramma SVG generato da tool esterno, editare solo lo
  specchio testuale lo lascerebbe incoerente con l'immagine.

Nessun cambiamento al codice sorgente in questo punto — solo documentazione.
936/936 verdi (invariato, come atteso).

### 10. Placeholder UI per `dimensioncolumns` nel pannello impostazioni
Modello: `db5ffd2`. Checkbox che inserisce un placeholder letterale
`dimensioncolumns: { company_id: "COMPANY" }` (non un vero round-trip
bidirezionale — il parser delle impostazioni nel pannello non è JSON-aware).
Adattare al pannello attuale di `tapi-ext` (già restilizzato).

**Fatto**. Il pannello attuale di `tapi-ext` usa la stessa struttura
`.sett-toggle`/`.sett-toggle-slider` del modello (non serviva adattamento di
stile) — aggiunta riga `sett-dimensioncolumns` in `index.html` subito dopo
`sett-tenantref`, prima di `sett-readonlyviews`; stessi tre punti di innesto
in `settings.js` del modello (`writeSettings`: placeholder letterale se
checked; `syncSettingsForm`: sempre non spuntato al riapertura, stesso
commento esplicativo; oggetto passato a `writeSettings` nel click handler).
Nessuna modifica a `parseSettings()` — stesso limite noto del modello (non
JSON-aware), commentato identicamente.

Verifica: nessun tool di automazione browser disponibile in questa sessione
per un test interattivo dal vivo; verificato staticamente (`node --check`
su `settings.js`) e per ragionamento diretto sul codice — la checkbox
risulterà in modo affidabile non spuntata alla riapertura perché
`parseSettings()`'s regex non riesce a estrarre un valore scalare pulito
`'yes'` da un blocco `{ ... }` annidato, esattamente il comportamento
voluto e documentato dal modello. Nessuna modifica al codice sorgente
TypeScript. 936/936 invariati.

### 11. Fix: colonna di scope NULL trattata come condivisa/sempre visibile
Modello: `960ddcc`. Il filtro anti-IDOR di lettura non gestiva il caso
colonna dimensione NULL (riga condivisa) — restava invisibile a tutte le
sessioni perché NULL non uguaglia mai un codice di scope. Applicare dopo il
punto 8, stesso filtro.

**Fatto**. Fix puntuale in `_dimensionScopeConditions` — unico punto
condiviso da `_generateDalBody` (hasDal) e `_generatePrivateDml` (!hasDal),
quindi la correzione si propaga automaticamente a ogni tier senza toccare
altri punti: `exists (...)` → `(<tbl>.<col> is null or exists (...))`, per
ogni colonna di dimensione. 4 test esistenti aggiornati alla nuova forma
generata + 1 nuovo test esplicito su questo comportamento. 937/937 verdi,
build completa pulita.

### 12. Unificare la lettura: vista `<tabella>_rls` invece di WHERE ripetuto
Modello: `2c42616`. Le funzioni di lettura (get_by_id/lock_by_id/get_all/
get_by_<unique>) non ricostruiscono più il proprio filtro — leggono da una
vista `<tabella>_rls` generata una volta, subito prima del corpo DAL. Per i
tier senza `_dal` separato, la stessa vista esiste comunque (è un oggetto DB,
non un package) — verificare che le procedure private embedded leggano da lì
allo stesso modo.

**Fatto**. `_dimensionScopeConditions` rimossa (come nel modello); nuova
`_generateDimensionRlsView` — oggetto DB puro, non dipende da alcun package.
Decisione tier: a differenza del modello (che la emette "subito prima del
corpo DAL", presupponendo `_dal` sempre presente), qui viene emessa in
**testa a `generateLayeredTAPI`, incondizionatamente rispetto al tier** —
prima di qualunque package, che sia `_dal`, `_hks`, `_svc` o `_app`/`_rst` a
seconda di chi arriva per primo. Necessario perché `_generatePrivateDml`
(tier senza `_dal`) ha bisogno della vista esattamente quanto `_dal` stesso.
`_generateDalBody` e `_generatePrivateDml` aggiornati identicamente:
`dimSource = hasDimScope ? <tabella>_rls : <tabella>`, usato in FROM/select
di get_by_id/lock_by_id/get_by_<unique>/get_all (sia la versione DAL sia
quella assorbita `p_get_by_id`/`p_get_all`); `tenant_id` resta nel WHERE
separatamente (il filtro dimensione vive ora solo nella vista). Scritture
(insert_row/update_row/delete_row/close_row, comprese le versioni private)
invariate — non leggono né filtrano mai tramite `_rls`.

Verificato con dump reale del generatore (non a memoria) che l'output
combacia col modello: `create or replace view invoices_rls as select * from
sec_pkg.secured_by_dimension(invoices);` seguito da `select * into l_row
from invoices_rls where id = p_id;` in `get_by_id`. Documentazione
aggiornata negli stessi 4 punti del modello (`DOCUMENTATION_SPEC.md`,
`quick-sql-grammar.md`, `examples.md` — testo ritrascritto da
un'esecuzione reale, non copiato dal modello — e `web/app.js`), più la
sezione tier-aware in `dimensionscope.test.ts` estesa con verifica che la
vista precede sia `_dal` sia `_app` a seconda del tier.

10 test riscritti/aggiunti in `dimensionscope.test.ts` per la nuova forma
generata (vista + redirect di lettura), inclusa copertura esplicita per i
tier degradati (`service`, `lookup`) assente nel modello. 943/943 verdi,
build completa pulita.

### 13. Vista `_rls` sempre generata, anche senza colonne di dimensione
Modello: il lavoro più recente, fatto ieri in questa sessione (non ancora
committato su `main` al momento di questo piano — vedi `git stash` su
`main`). Principio: il livello di presentazione (incluso il DAL stesso) non
deve mai leggere una tabella direttamente, solo una vista — passthrough
(`select * from <tabella>`) quando non c'è nulla da filtrare. Da rifare qui
DOPO il punto 12, sulla vista unificata di `tapi-ext`.

**Fatto**. Verificato che lo stash su `main` esistesse ancora
(`stash@{0}: "wip before tapi-ext inspection"`) e ispezionato in sola
lettura (`git stash show -p`, mai applicato) prima di ricostruirlo come
lavoro nuovo su `tapi-ext`, come da regola del piano. `_generateDimensionRlsView`:
rimosso l'`if (dimCols.length === 0) return ''` — genera sempre la vista,
`select * from sec_pkg.secured_by_dimension(<tabella>)` se ci sono colonne
di dimensione configurate, altrimenti passthrough `select * from
<tabella>`. `_generateDalBody`/`_generatePrivateDml`: `dimSource` non è più
condizionale (`hasDimScope ? ... : tbl`) ma sempre `<tabella>_rls` — stesso
fix applicato a entrambe le funzioni per lo stesso motivo dei punti 11/12
(unico punto condiviso... in questo caso due punti gemelli, uno per `_dal`
presente uno per assente, mantenuti in sincronia a mano perché non
condividono già una funzione comune). L'emissione della vista in
`generateLayeredTAPI` restava già incondizionata rispetto al tier dal punto
12 — non ha richiesto modifiche, solo il commento è stato aggiornato.

3 test riscritti in `dimensionscope.test.ts` per il nuovo comportamento
(vista passthrough anche per `companies`/tabelle senza `dimensioncolumns`
affatto). Documentazione aggiornata negli stessi 3 punti del modello
(`DOCUMENTATION_SPEC.md`, `quick-sql-grammar.md`, `examples.md`) — non
toccato `web/app.js`, come nello stash stesso (l'esempio in galleria non
cambia concettualmente). 943/943 verdi, build completa pulita.

Con questo si chiude il lavoro core sul meccanismo `dimensioncolumns`/
`_rls` avviato al punto 8 e affinato ai punti 11-13 — quattro passaggi
incrementali fedeli all'evoluzione reale vista su `main`, ciascuno
verificato con dump reale del generatore prima di scrivere documentazione o
test.

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
