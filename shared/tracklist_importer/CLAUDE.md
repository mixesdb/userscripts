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
| `tracklist_importer.css` | Report box, the "nothing to merge" note in the toolkit row, review block, locked-button state. Loaded by `funcs.js`, not by the site scripts. |
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
  `#mixesdb-TLbox`), so live updates and the feedback chips all come from the shared code
  instead of copies. No tracklist state icons in its chip row: `toolkit_tlStateButtons()`
  skips mixesdb.com entirely - the real ones under the edit box are on the same page.
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
- **A merge that would change nothing gets no link, but a NOTE.** `changed` is read off the
  merged TEXT, not off the write counter in `state.changes`: writing a value the original
  already carried counted as a change and produced a link into a `(No difference)` diff. The
  link builder runs the merge itself for this – it is pure JS, so that costs nothing but a few
  ms. The spot the link would have taken stays occupied by `tlImporter_addNoMergeNote()`: an
  empty action row is indistinguishable from an importer that never ran. The Report link comes
  along (`tlImporter_makeReportLink()`, one builder for both outcomes) and names the verdict in
  the report – the case without a link must not be the case without a report, because a wrong
  verdict is precisely what needs reporting.
- **"Identical" is the certain reading, and it is the one that acts by itself.**
  `tlImporter_sameTracklists()` (merge_core.js, reported through `identical` on the merge
  result) answers it off the MERGE, never off the two texts – cue format, spelling and labels
  differ between page and player site by nature, and only the matcher knows which row is which.
  All of: nothing written, every candidate row matched 1:1 (not inserted, no two rows on the
  same original row, nothing on it `tlImporter_candidateUse()` could not place) and no original
  row or gap left over. Only that ticks the toolkit's "TID tracklist is integrated" checkbox
  (`tlImporter_tickIntegrated()`, a native `.click()` so TrackId.net's own handler does the
  saving – which POSTs, and the site knows no way back). Which is why it is DELAYED and
  announced: the note runs the `mdb-tlImporter-noteTick` pulse for `tlImporter_tickDelayMs`
  (the two state the same span, keep them in step) and the click lands after it, so nothing is
  written before the reader had a chance to see it coming – a tick they made themselves in that
  window cancels ours. A candidate merely CONTAINED in a
  longer original is not identical: it reads "Nothing to add" and ticks nothing, because the
  page then knows more than the player site and only the reader can judge that.
  The tick has to WAIT: the checkbox arrives hidden and TrackId.net only shows it once its own
  check request came home – an answer that may replace the input with the check mark (already
  integrated) or the whole wrapper with a sentence (player unknown to the API). Hence the poll
  for a VISIBLE input, and the give-up after ~15s that every other site runs into.
- **Save is locked until "Show changes" ran.** The auto-click is the convenience; the lock is
  the safety – a merge must not be savable unseen.
- **The original's cue format wins, but it may WIDEN – the dur fix.** A bare `[XX]` format
  cannot say 106 minutes; when either side knows a cue beyond the format's digit count, the
  target format grows (`XX` -> `XXX`) BEFORE the merge and every cue moves with it, `[??]` ->
  `[???]` included (`tlImporter_widenedCueFormat`, NTS Japanese Techno report). Colon formats
  are left alone – they carry any length as they are.
- **A gap-less original takes no unknowns – except at the very end.** `?` rows of the candidate
  are only placed where the original admits a gap; in a gap-less list they repeat what it
  already covers. The candidate's TRAILING run of `?` rows is the exception: it sits behind the
  original's last row, where nothing covers it, and is the only sign that the stream runs on
  past the tracklist (`[111] ?` on a 2:00:17 player, second NTS Japanese Techno report). It is
  appended together with the `...` the candidate carries behind it – gap-less or not. The tail
  test is two-part on purpose: the row must come out of that trailing run AND land at the end
  of the merged list, because a `[??]`-heavy original has no parseable cues to sort against and
  every mid-list unknown would otherwise read as "at the end" too. An unknown whose cue lands
  within tolerance of an original track is still dropped, tail or not.
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
  delegated handler, reading the site box) and a standalone Live updates switch – no tl state
  icons, here or in the Merged box: the real ones under the edit box are on the same page,
  and `toolkit_tlStateButtons()` skips every feedback box on mixesdb.com anyway. **Down
  is the default**: `tlImporter_readDown` answers true while `mdb-tlImporter-down` is unset,
  and only a clicked toggle writes the key – so "0" is a real choice (the reader moved the
  block back up once) and keeps winning. The state is applied only once the site's
  editor section exists – it is rendered by a ResourceLoader module, so the toggle waits for
  `#tlEditor-textarea` via waitForKeyElements; without that section the block simply stays up.
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
  **The Apply buttons act on MOUSEDOWN** (`tlImporter_applyPress`, with a click handler kept
  for keyboard activation and a time-bound press flag so one mouse gesture cannot apply
  twice). A real first press after Cap used to do nothing: the site editor's answer leaves
  its box focused (`.select().focus()`) holding text our machinery has not seen, so the
  press's blur fired `tlBoxBlurUpdate` - chip render, white-out, an extra API call - whose
  synchronous DOM work shifted the button between mousedown and mouseup, and the CLICK never
  fired. Acting on the press ends that, and undercuts the blur too: `tlImporter_applyNow`
  refreshes `mdbTlboxKnown` before the browser blurs the box, so the blur finds text == known
  and stays quiet - the box keeps looking exactly as the editor's button left it. The press's
  own default is prevented and the active element blurred after the apply, so an apply leaves
  NO focus anywhere (the browser's default had landed it on the editor's find field); a DOWN
  apply then scrolls up to `#wpTextbox1`, where the result just landed - the Merged column's
  button deliberately does not, a reader salvaging candidate parts stays where they are. And
  `tlBoxShowApiCount` (tracklist_editor) skips feedback boxes inside `#editToolsBar-TLeditor`:
  that box is the SITE's, our chips in it read as a site feature, and the down state already
  carries the one Live updates switch beside its Apply button.
  A press that lands while the site's own `waitingForApi` class is on the box is not applied
  and not swallowed either: it WAITS. "Cap, then Apply" is one gesture, its Apply falls into
  the round-trip window as often as not, and a refused click there reads as a dead button –
  that was the second reported shape. The button says "One moment", the box is watched until
  the class comes off, and `tlImporter_applyNow()` then runs on the settled text, exactly as
  if the click had come after the answer. Bounded at ~8s: `ext.mixesdb.editor` clears the
  class in a `done` handler with no `fail` behind it, so a failed request leaves it standing
  for ever, and the wait then applies the text as it stands rather than sleeping for good.
