# CLAUDE.md

Name alias in prompts: `TI`, `tracklist importer`

The Tracklist Importer: the Insert/Merge/Report links the toolkit's usage row gains on a player
site with a filled tracklist box, and the mix-page edit form work behind them. It replaces the
stalled Tracklist Merger userscript (`Tracklist_Merger/`), whose merge logic it ports.

## Files

| File | What it is |
| --- | --- |
| `merge_core.js` | Pure text in, text out: the merge (`tlImporter_merge`), the matching and cue-format helpers, and the wikitext helpers for the `== Tracklist ==` section (`tlImporter_extractTracklist`, `tlImporter_setTracklist`, `tlImporter_tracklistWikitext`, `tlImporter_updateTlCategory`). No DOM, no network, no jQuery – deliberately self-contained (own copies of the normalization regexes), so the deno runner can load it. Keep it that way. |
| `funcs.js` | The DOM half: the toolkit links and Report box on the player site, the import + review block (Original / Merged / Candidate above the edit box) + Apply + button gating on the mixesdb.com edit form. Loads the CSS lazily (`tlImporter_loadCss`). |
| `tracklist_importer.css` | Report box, review block, locked-button state. Loaded by `funcs.js`, not by the site scripts. |
| `importer_examples.js` | Test data: merges and page-text cases. Reported merges become cases here, like title reports in `../page_creator/title_examples.js`. |
| `importer_examples_test.js` | The deno runner for it. |

Run the examples before and after touching `merge_core.js`:

```
deno run --allow-read shared/tracklist_importer/importer_examples_test.js
```

## How the candidate travels

The Insert/Merge link copies the toolkit EDIT link's href at click time (so `&siteHasTl=...`
rides along) and appends `&mdbTlImporter=<mode>` plus the candidate in the URL **hash**
(`#mdbTlImporterTl=...`). The hash never reaches the server, so tracklist length cannot break
the request line the way a query parameter could – and the same userscript runs on
mixesdb.com/w/*, where `funcs.js` reads it back.

## Settled

- **The live page decides Insert vs Merge**, not the link's label: the page can change between
  the link being built and clicked. The label is only what the fetch at link-build time said.
- **The original wins.** The candidate never overwrites an original cue, title or label – it
  only fills what is missing. The Candidate column shows both readings: green (`used`) marks
  what the merge wrote into the result, orange (`use` = false) what it could not place; parts
  the original already carried stay plain. Hand-salvage goes through the Merged box and its
  Apply button.
- **No `<li>` may survive inside the review block's feedback box.** MixesDB's own
  `ext.mixesdb.global` treats every `<li>` under `#mw-content-text` on ns-0 edit/submit pages
  as a potential track row, rewrites it via `.html().replace(/<br>[^+]/,'')` – a regex that
  eats the `<` of whatever tag follows a `<br>` (the reported smashed `code>#`) – and appends
  its fa-search wrapper. `tlImporter_flattenFeedbackList()` therefore turns the API's
  `ul#tlEditor-feedback-topInfo` into plain divs, re-applied through a MutationObserver
  because live updates and blur formats re-render the box from tracklist_editor/funcs.js,
  which has no hook for us.
- **The review block sits between MediaWiki's diff and the edit form** (`#editform`), never
  below the box: the reading order is the wiki's own diff first, then our three columns, then
  the form. Its Merged column is a REAL Tracklist Editor box (`.tlEditor` class +
  `#mixesdb-TLbox`), so live updates, feedback chips and the deliberately-scoped mixesdb.com
  exception in `toolkit_tlStateButtons()` all come from the shared code instead of copies.
- **The Merged wrapper is `class="tlEditor"` only, NEVER `id="tlEditor"`.** mixesdb.com's own
  editor module (`ext.mixesdb.editor`) renders its own `#tlEditor` inside the edit form and
  addresses it as `$('#tlEditor')` – first id in document order wins, and the review block
  sits above the form. A duplicate id here caught the site's feedback colour classes
  (`tlEditor-feedback-hint` etc.), so the site's own feedback box stayed white. All shared
  TLE code matches `.tlEditor` when a target is passed. Still open on the SITE's side: the
  module's `$('#tlEditor-feedback').remove()` and `fadeOutFeedback()` also grab the first
  match in the document, which is OUR feedback box whenever the review block shows one –
  scoping those lookups into the site editor's own container is a site fix, not ours.
- **Apply inserts the box text VERBATIM** – what the reader sees is what lands in the wiki
  edit box. The one synchronous TLE call only supplies the verdict (category + icons) and the
  re-rendered feedback; it never rewrites the text. The seq bump on the box drops the blur
  update the click itself triggered, so nothing reformats the box behind the apply either.
- **A merge that would change nothing gets no link.** `changed` is read off the merged TEXT,
  not off the write counter in `state.changes`: writing a value the original already carried
  counted as a change and produced a link into a `(No difference)` diff. The link builder runs
  the merge itself for this – it is pure JS, so that costs nothing but a few ms.
- **Save is locked until "Show changes" ran.** The auto-click is the convenience; the lock is
  the safety – a merge must not be savable unseen.
- **`Tracklist: complete` is never downgraded** (same rule as the toolkit's siteHasTl block).
- **Chaptered originals (`;Name` rows) are skipped** on both sides – no link, no merge.
- **The down toggle borrows the site's editor, it does not copy it.** The arrow in the block's
  top right corner (`tlImporter_applyDown`) moves the block AND `#editToolsBar-TLeditor` (the
  wrapper of the site's whole editor fieldset) to directly after `.editOptions` – below the
  wiki's Save/Preview row, jumping the toolbar rows and the TrackId box between – and the
  Merged text into the site's own `#tlEditor-textarea`; the emptied Merged column is hidden
  by CSS and keeps all its wiring. A hidden `#mdb-tlImporter-tleHome` marker restores the
  editor's home spot on the way up, and `body.mdb-tlImporter-down` scopes the down-only page
  rules (`#editform` margin, the hidden feedback close button). The block itself is a
  fieldset with legend "Diff" – `min-width: 0` in the CSS is what lets its columns shrink. The text travels BOTH ways together with `mdbTlboxKnown`, so
  toggling never loses an edit and never triggers a spurious blur update. Below
  `#tlEditor-formActions` sit a second Apply button (`#mdb-tlImporter-apply-down`, same
  delegated handler, reading the site box) and a standalone Live updates switch – deliberately
  no tl state icons, the real ones under the edit box are on the same page, and
  `toolkit_tlStateButtons()` skips boxes outside the review block on mixesdb.com anyway. The
  choice is remembered per browser (`mdb-tlImporter-down`) and applied only once the site's
  editor section exists – it is rendered by a ResourceLoader module, so the toggle waits for
  `#tlEditor-textarea` via waitForKeyElements.
  Two of its lessons are load-bearing: docked, the block sits INSIDE `form#editform`, and
  mixesdb.com's own `form button` !important rules hit the corner toggles (they squeezed the
  flex-item svg to 0px width) – every visual property of the toggles carries `!important` in
  the CSS for exactly that, do not "clean" them away.
- **The down Apply button asks nothing about the CONTENT of the box.** It sleeps on an empty
  box and on nothing else, and the text it writes is read out of `#tlEditor-textarea` at CLICK
  time (`tlImporter_downBox()`, the one lookup down there – fresh every call, since the
  module may rebuild its textarea). The Merged column's button sleeps against the last applied
  text (`tlImporter_watchApplyButton`) and that is right for a box we own; down here it was
  wrong, and both reported symptoms came out of it. The site's editor tools write the value
  with no input event, and its menu and dropdown only when their own API answer comes home, so
  a wake state read from a snapshot is always behind what is on screen: the button was still
  asleep when it was clicked – doing NOTHING – or awake from an earlier edit and applying the
  text that stood there before the tool ran, which is the unchanged merge.
  `tlImporter_refreshDownApply()` is still driven by a delegated input handler plus a poll
  rather than a listener on the node, for the same rebuild reason, but both now only decide
  empty or not.
  A click that lands while the site's own `waitingForApi` class is on the box is not applied
  and not swallowed either: it WAITS. "Cap, then Apply" is one gesture, its Apply falls into
  the round-trip window as often as not, and a refused click there reads as a dead button –
  that was the second reported shape. The button says "One moment", the box is watched until
  the class comes off, and `tlImporter_applyNow()` then runs on the settled text, exactly as
  if the click had come after the answer. Bounded at ~8s: `ext.mixesdb.editor` clears the
  class in a `done` handler with no `fail` behind it, so a failed request leaves it standing
  for ever, and the wait then applies the text as it stands rather than sleeping for good.
