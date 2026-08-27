# CLAUDE.md

Name alias in prompts: `TI`, `tracklist importer`

The Tracklist Importer: the Insert/Merge/Report links the toolkit's usage row gains on a player
site with a filled tracklist box, and the mix-page edit form work behind them. It replaces the
stalled Tracklist Merger userscript (since removed from the repo), whose merge logic it ports.

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
(`#mdbTlImporterFrom=<scriptName>&mdbTlImporterDur=<sec>&mdbTlImporterTl=...` - sender and
runtime first, the candidate last because it is the long one). The hash never reaches the server, so tracklist length cannot break
the request line the way a query parameter could – and the same userscript runs on
mixesdb.com/w/*, where `funcs.js` reads it back.

## Settled

- **ONE instance owns the mixesdb.com side, and it is the one the LINK names.** TrackId.net and
  1001 Tracklists both carry this
  file onto mixesdb.com/w/*, each in its own sandbox; unguarded, both would apply the merge,
  click "Show changes" and answer every Apply press once more. The claim is
  `data-mdb-tlimporter-owner` on `<html>` (ready handlers and timeouts run
  sequentially, so the synchronous check-and-set cannot race) plus
  `tlImporter_ownsEditPage`, both set by `tlImporter_claimEditPage()`, which also LOGS who owns
  the page. Who claims is not "whoever was first" any more: the link carries
  `&mdbTlImporterFrom=<scriptName>` and that instance takes it, because it is the one whose
  merge the reader saw in the toolkit row and in the Report - the other script may sit on an
  OLDER cached copy of these files and would answer the same click with a different merge,
  which is what makes a fix impossible to test (reported: the Report showed the fixed merge,
  the edit form got the old one). After a form POST the hash is gone, so the stored review
  block carries `owner` and `tlImporter_storedOwner()` reads it back. The named instance is
  waited for but not forever: `tlImporter_claimFallbackMs` (500ms, far past the one tick all
  d.ready handlers share) later, a page still unclaimed goes to whoever is there - a link from
  an older generation, or a sender not installed here, still gets its merge.
  And the named instance TAKES the page when something else already claimed it (`takeOver`,
  only for a sender out of the hash, not one out of the stored block): only an instance running
  an older copy of this file can claim against the parameter, and its merge is exactly the stale
  one being complained about. The overwrite lands in time because the "Show changes" click sits
  in a `setTimeout(0)` behind every ready handler of the tick, so the form is submitted with the
  text the winner wrote. What cannot be undone from here is the loser's `tlImporter_ownsEditPage`
  in its own sandbox - an old instance answers Apply presses alongside the new one until it is
  updated, which the takeover's log line says out loud.
  The mixesdb-side delegated handlers (both Apply buttons, the down
  state's live-chip and textarea sync) check that flag at event time, because they are bound at
  file load, long before the claim. The player-site handlers (import link, Report) are NOT
  gated - one script per player site, and the flag is false there. A new site script that adds
  `@include http*mixesdb.com/w/*` needs nothing: the claim comes with this file. But BOTH
  installed scripts must load a claim-aware version - an old instance does not know to stand
  down, so importer-funcs require-param bumps go into every carrying script together.
- **`tlImporter_parse` strips quote RUNS (`'{2,}`), not pairs.** Pair-wise `''` removal turned
  1001's bold intro rows (`'''Live @ X:''' Artist - Title`) into `'Live @ X:'` with a stray
  quote that would land in the page wherever a candidate part is written. Italics behave as
  before; the intro text itself stays part of the track text.

- **The live page decides Insert vs Merge**, not the link's label: the page can change between
  the link being built and clicked. The label is only what the fetch at link-build time said.
- **The original wins.** The candidate never overwrites an original cue, title or label – it
  only fills what is missing. The Candidate column shows both readings: green (`used`) marks
  what the merge wrote into the result, orange (`use` = false) what it could not place; parts
  the original already carried stay plain. Hand-salvage goes through the Merged box and its
  Apply button.
- **An unknown row is a row's HALF that is unknown, not the string `?`.** `tlImporter_unknownParts()`
  reads a track text as artist + title and says which half says nothing – `?`, `??`, `ID`, `ID2`;
  never `Untitled`, which is a real title a release carries (the page's `? - Untitled (B1)` keeps
  it against a candidate's `? - B1`). `tlImporter_isUnknownText()` is the both-halves case and
  replaced every `trackText === "?"` in the merge, so the gap and slot machinery treats an `ID`
  row like a `?` row; the half-known rows are deliberately NOT slots – they carry information.
  What may be written follows from the same reading: `tlImporter_takesCandidateText()` lets the
  candidate's text in only where the original's TITLE is unknown (a row that knows nothing at
  all also takes a candidate that only knows the artist). That is "the original wins" per half
  instead of per row.
- **Nothing but a shared cue connects two half-known rows, so their KNOWN halves must not
  contradict.** Step 3 of the matcher (reported: Chris Stussy, Essential Mix 2024-10-12, where
  `? - Untitled (B1)`, `Chloé Caillet - ?` and their candidate rows each landed on the page a
  second time) matches on an exactly equal cue plus one of: the page row knows nothing at all;
  the page has no title and the candidate credits the page's artist; the page has no artist and
  the candidate has none either; the page knows both halves and the CANDIDATE has no title (it
  then only enriches cue and label). A cue minute alone proves nothing – two tracks can share
  one – which is why no branch stands on the cue by itself, and why the cue must be equal, not
  merely close. A page row already taken by an earlier candidate is skipped.
- **Artist and title are also compared APART (step 2b).** `Costigane - Camera Tricks` and
  `Brendan Costigane - Camera Tricks` are the same track, and whole-string similarity says no:
  the missing first name is a fifth of the string, well past the 0.8 threshold. So the title
  carries the match (equal or similar) and the artist only has to be COMPATIBLE – every artist
  of the shorter credit named in the longer one, word-wise per name
  (`tlImporter_sameArtistName`: "costigane" in "brendan costigane", never "sam" in "samantha").
  Both halves must be KNOWN for this step; the unknown ones are step 3's business.
  The step is anchored on the title on purpose: two different tracks with the same title AND
  nested artist credits do not happen, while artist-anchored matching would merge every "A - X"
  into every "A - Y".
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
  In the DOWN state that wrong grab produced DOUBLE feedback under the site's textarea
  (reported on "Standard" with no changes): our live/blur/apply renders had already put a box
  there, the site's button press then removed the review block's HIDDEN box instead of that
  one and appended its answer as a second box – which stayed, press after press. Fixed on our
  side: `tlImporter_applyDown` PARKS the hidden Merged box's id
  (`mdb-tlImporter-feedback-parked`) on the way down and restores it on the way up, so the
  site's `getElementById` hits the box under its own textarea. The UP state's theft (a site
  button press eats the visible Merged feedback box) remains the site-side scoping issue.
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
- **EVERY stop the reader can see says why.** Not only the no-change ones: a page without a
  `== Tracklist ==` section and an unreadable page text get their note plus Report through the
  same `noLink()` in the link builder. `tlImporter_noMergeVerdicts` is the one table behind it –
  row text, tooltip, how the Report names the verdict, and whether a merge ran at all (only then
  may the Report show a merge result; running one for a chaptered page would invent a result
  nobody was shown). A new stop is a new entry there, not a bare `return`. Its `chapters` entry
  is the exception that proves it: that case is a LINK now (see below) and the entry supplies
  the link's label, tooltip and report line instead of a note's.
  The single silent stop left is "no EDIT link / no curid": there is nothing to hang a note on
  and nothing to report about.
- **"Identical" is the certain reading, and both no-change readings act by themselves.**
  `tlImporter_sameTracklists()` (merge_core.js, reported through `identical` on the merge
  result) has two readings, either of which is enough. Same serialized TEXT after the candidate's
  cues moved into the original's format – the plain one, and the only one that survives a track
  played twice: both rows collapse onto one entry in the title lookup, so the 1:1 count below
  comes up one short and read two character-identical lists as merely contained (reported,
  Feathers & Bones Mixtape 04). Or, for two lists that are the same list without being the same
  text, all of: nothing written, every candidate row matched 1:1 (not inserted, no two rows on
  the same original row, nothing on it `tlImporter_candidateUse()` could not place) and no
  original row or gap left over. It ticks the toolkit's "TID tracklist is integrated" checkbox
  (`tlImporter_tickIntegrated()`, a native `.click()` so TrackId.net's own handler does the
  saving – which POSTs, and the site knows no way back). Which is why it is DELAYED and
  announced: the note runs the `mdb-tlImporter-noteTick` pulse for `tlImporter_tickDelayMs`
  (the two state the same span, keep them in step) and the click lands after it, so nothing is
  written before the reader had a chance to see it coming – a tick they made themselves in that
  window cancels ours. A candidate merely CONTAINED in a longer original stays a reading of its
  own – it reads "Nothing to add", because the page then knows more than the player site – but it
  ticks the SAME box: every track of the candidate is on the page, which is all "integrated"
  claims. Both entries say so with `ticks: true` in `tlImporter_noMergeVerdicts`; neither the note
  nor the tick machinery tests a verdict NAME any more, so a third no-change reading only has to
  set that flag (and the note's class is `mdb-tlImporter-note-integrated`, not `-identical`).
  The tick has to WAIT: the checkbox arrives hidden and TrackId.net only shows it once its own
  check request came home – an answer that may replace the input with the check mark (already
  integrated) or the whole wrapper with a sentence (player unknown to the API). Hence the poll
  for a VISIBLE input, and the give-up after ~15s that every other site runs into.
- **The click starts a WATCH on the mix page, and the save ticks the checkbox.**
  `tlImporter_watchMixPage()` runs in the player-site tab (the import link is `target="_blank"`,
  so that tab stays), polls `tlImporter_fetchPageText()` for the page the link points at and
  ticks the toolkit's "TID tracklist is integrated" box through the same
  `tlImporter_tickIntegrated()` the "Identical" verdict uses - manual ticking after every import
  was the annoyance it removes. The "Integrated" note REPLACES the link it came from, so the row
  ends up in the same shape a no-merge verdict gives it: [note Report] | [EDIT HIST]. The link
  cannot stay - its `mdb-original` is the page text from BEFORE the save, so a second run would
  merge against a tracklist that no longer exists; a reload builds a fresh link against the
  current one. The tick POSTs and cannot be taken back, so a CHANGED tracklist
  is deliberately not the test: a foreign edit changes it too. The test is
  `tlImporter_candidateWrites()`, the number of candidate PARTS (cue/text/label over the merge's
  `diffItems.used`) the merge would still write into the page - measured once at click time
  against the link's stored `mdb-original`, and again on every answer. It has to have gone DOWN;
  0 is "all of it landed", anything lower than before is a partial merge the reader saved, and
  that still means integrated. The chaptered link has no merge to measure, so there the
  hand-merge is read off the tracklist's LENGTH (it has to have grown). Only rows that HAVE the
  checkbox are watched (`input.mdbTrackidCheck` with a real `data-tidplayerurl`, i.e.
  TrackId.net); everywhere else the poll would run for minutes with nothing to tick at the end.
  Cadence and deadline are a compromise, not a law, and they live in ONE place:
  `tlImporter_watchSteps`, read by `tlImporter_watchDelayMs()` ("until this many ms, ask every
  that many") and by `tlImporter_watchMaxMinutes()` for the log. The last step's `until` IS the
  deadline - `again()` refuses to schedule past it, which is the only place the watch times out.
  Today: 5s through minute 1, 10s through minute 4, 30s through minute 10, about 40 API calls
  for a watch that runs to the end.
- **Save is locked until "Show changes" ran.** The auto-click is the convenience; the lock is
  the safety – a merge must not be savable unseen.
- **The original's cue format wins, but it may WIDEN – the dur fix.** A bare `[XX]` format
  cannot say 106 minutes; when either side knows a cue beyond the format's digit count, the
  target format grows (`XX` -> `XXX`) BEFORE the merge and every cue moves with it, `[??]` ->
  `[???]` included (`tlImporter_widenedCueFormat`, NTS Japanese Techno report). Colon formats
  are left alone – they carry any length as they are.
- **A cue-less original has no format to win with, so it borrows the candidate's.** Every cue
  the merged list ends up with then comes from the candidate, and `tlImporter_cueFormat()`
  answering null let `tlImporter_unknownCue()` fall through to its two-digit default: `[??]`
  between `[000]` and `[005]` (reported, fibre podcast bman 011). The borrow happens BEFORE the
  dur fix, so a candidate that needs widening still gets it, and the original's own `[??]` rows
  move to the borrowed width too.
- **An unknown cue keeps every leading digit its known neighbours agree on.**
  `tlImporter_fillUnknownCuePrefixes()` (last step of the merge, so it sees the final order):
  `[??]` between `[095]` and `[098]` is `[09?]`, between `[098]` and `[103]` it stays `[???]`.
  The bound is the LIST's own order – a row printed between two cues played between them –
  which is also where its three limits come from. Nothing before the run means minute zero,
  which IS a bound; nothing after it means no bound at all (the stream runs on past the last
  cue), so nothing is filled; and a run with more rows than there are minutes between its bounds
  is not believable – the NTS Japanese Techno case has six rows between `[008]` and `[009]`, and
  writing `[00?]` on all six would put times into the page that cannot be true. One `?` always
  survives, even when both bounds are the same minute: the cue is INFERRED, and a row that reads
  like a known cue claims more than the merge knows. Bare formats only – colon cues keep the
  last-known-prefix rule in `tlImporter_merge()`, which is the same idea with one neighbour.
- **The list's two ENDS are bounds of their own.** The neighbour rule above needs a known cue on
  either side, and the first and the last row have only one - so both ends had their own wrong
  answer (reported, fibre podcast sigint 014). The first row is where the RECORDING starts:
  `tlImporter_firstCueZero()` writes `[00]` on it outright, a known cue and not an inferred one,
  because this is not a guess from neighbours - every mix starts at minute 0. Two rows are not
  that row: one behind a leading `...` (the gap says tracks are missing before it) and one in a
  tracklist that carries no cues at all, where a cue would rewrite a line the candidate never
  touched. Behind the LAST known cue the mix RUNTIME plays the missing neighbour
  (`tlImporter_merge`'s `options.durationSec` -> `tlImporter_endMinute()` -> the `endMinute`
  argument of `tlImporter_fillUnknownCuePrefixes`): a row behind `[61]` on a 1:04:54 mix started
  between minute 61 and 64, all of them `6x`, so it reads `[6?]`. Every other limit of the
  prefix rule still holds there - one `?` survives, and a run with more rows than minutes is not
  filled. The runtime is OPTIONAL and arrives as 0 from every site that prints none, which is
  the pre-runtime behaviour (nothing bounds the tail), so no cue logic may DEPEND on it.
- **The runtime is the site's to know, and it is read at CALL time.** `window.mdbTlImporter_durationSec`
  is the hook (`tlImporter_durationSec()` in funcs.js takes a function, a number or a "1:04:54"
  string), set by the site script the way `window.mdbTlImporter_candidateBox` is - TrackId.net
  points it at `mdbTid_totalDurSec()`, which reads its header. A FUNCTION, not a value: these
  are single-page apps, and a duration captured once answers for the previous mix for ever.
  It rides to the edit page in the hash in front of the candidate
  (`#mdbTlImporterDur=3894&mdbTlImporterTl=...`, read back by `tlImporter_durationFromHash()`),
  and it is named in the Report - a report without it cannot be turned into an example that
  reproduces the cues it bounded.
- **The edit page has a runtime of its own, and needs it.** `tlImporter_pageDurationSec()`
  (merge_core.js, so the deno runner covers it) reads the `dur` column of the page's own
  `{|{{NormalTableFormat}}` File details table - one cell per line as `global.js` writes it, or
  inline (`! dur !! MB`) as a hand-edited page may. `tlImporter_editPageDurationSec()` takes the
  link's value first and this one behind it, and says in the log which it used. The hash alone
  was not enough: it is empty for every site that prints no runtime (1001tracklists) and for
  every link built before the parameter existed, while the dur cell is on the page either way.
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
- **A row the merge cannot PLACE is not placed.** An unmatched candidate track is inserted in
  front of the first original row with a BIGGER cue, so it always lands at the END of the
  cue-less run in front of that row - the merge has nothing in there to order it against and
  silently takes the last of the run's possible slots. `tlImporter_unplacedRunLength()` measures
  that run (bounded by a readable cue, by a `...` - there the page itself says tracks are
  missing - or by the start of the list), `tlImporter_insertMaxUnplacedRows` (2) is what it may
  be. Reported (Invite's Choice Podcast 224 Exos, trackid.net): the candidate's `[07]`, `[13]`,
  `[14]` and `[24]` all found the same first matched row, `[34] Lucy`, and were dropped in front
  of it - behind the 18 cue-less rows the page lists before it, three of them the page's own
  rows under another spelling (`Ozy - Sacred Family` / `Sagrada Familia`, `IN SYNC - Jam Tapes 3`
  / `Insync - Jam Tape 1991 Cut 3`, and one of the five `Artist - ?` rows the block holds). A
  guessed position is a duplicate waiting to happen, and guessing buys nothing: the row stays
  highlighted in the Candidate column and the reader places it by hand, which is the only
  reading that is not a guess. Two stand-downs: one or two rows are a near miss the reader
  corrects at a glance (`[42] Bjarki - Polygon Pink Toast` steps over one row and lands), and
  the END of the list is no guess at all - nothing follows the last row, so there is no other
  slot the merge could have chosen and the trailing appends are untouched. It took two
  duplicates out of the NTS Japanese Techno example along the way (`Hiroshi Watanabe - Lost
  City` behind `Hiroshi W. - Lost City`, `FLR - PART 8` behind `FLR - Easy Filter Part 8`),
  which is exactly the shape the report names.
- **A `...` the merge filled up is dropped, measured against the list's OWN median runtime.**
  `tlImporter_dropRedundantGaps()` is the last step of the merge, after every cue is final. A gap
  claims tracks are missing; between two known cues that claim is checkable, because the span it
  covers has to fit the row in FRONT of it plus something else. The yardstick is
  `tlImporter_medianTrackRuntimeSec()` - the median distance between two rows with no `...`
  between them, times `tlImporter_gapRuntimeFactor` (1.5). The median, not the average: one 12
  minute opener would otherwise stretch the believable span for every gap in the list. Reported
  (Luke Slater @ The Lot Radio 2026-06-13, curid 748401): the page's two holes were filled with
  the candidate's `[06]`/`[10]` and `[24]`/`[28]` rows and the two `...` stayed, now spanning 5
  and 3 minutes against a 4 minute median - while the 7 and 9 minute ones further down are real.
  Three stand-downs, all of them deliberate: only a merge that WROTE something is touched
  (`state.changes > 0` at the call site - a gap in a list the candidate did not enrich is the
  contributor's own statement, and rewriting it would also turn the silent `Identical` /
  `Nothing to add` verdicts into merges and cost their auto-tick); every track has to carry a
  readable cue (one `[??]` or inferred `[09?]` and the distances around it are guesses, which is
  not what a median may be built from); and fewer than `tlImporter_gapMinSamples` (3) gapless
  neighbour distances are no sample at all. The two ENDS are out of scope by construction - a
  leading `...` has no cue in front of it, a trailing one none behind it. The dropped gap is
  FLAGGED (`_ti_gapDropped`), not spliced out: `tlImporter_textFromArr()` skips it while
  `tlImporter_originalItems()` keeps it, because the review block's Original column has to keep
  showing what the page held.
- **`Tracklist: complete` is never downgraded** (same rule as the toolkit's siteHasTl block).
- **Chaptered tracklists (`;Name` rows) are never merged, but they ARE opened - on EITHER
  side.** The toolkit row gets a third link, `Chaptered` (label and tooltip out of
  `tlImporter_noMergeVerdicts.chapters`, or `.chaptersCandidate` when the CANDIDATE carries the
  `;` rows - 1001tracklists' multi-set pages do, and a merge would swallow them as track
  titles; the page side outranks the candidate side in the wording. Dimmed by
  `.mdb-tlImporter-link-chapters` either way); the mode in the URL stays plain `merge` and
  `tlImporter_runEditPage()` re-detects the `;` rows off the LIVE page text AND the hash's
  candidate, like every other reading there. Only a merge is stopped by candidate chapters: a
  chaptered candidate into an empty section is a plain verbatim Insert. The stored payload's
  `chaptersFrom` ("page"/"candidate", missing = "page") only picks the block's wording. That branch writes NOTHING – not the page text, not the category, not the
  icons – locks nothing and does not click "Show changes": there is no change to show. It only
  renders the review block, with `chapters: true` in the payload:
  `tlImporter_rawItems()` (merge_core.js) puts BOTH texts up VERBATIM – one row per line, no
  cue/label split, no `changed` / `use` / `used`, so nothing is highlighted. Not
  `tlImporter_parse()`: with no merge to flag parts of, parsing buys nothing and costs the truth
  (it drops the `#` numbering, the `''` italics and every blank line), and the reader was
  hand-merging against a tidied-up list neither side actually holds – reported on Friday Dance
  Party 168. The Merged box opens EMPTY as the reader's workbench, Apply asleep until they write
  something. `tlImporter_renderStoredDiff()` keeps such a block on an EMPTY compare
  (the normal answer on a page nothing was written to), where a merge block is dropped.
- **An Insert opens the review block too - for the BOX, not for a diff.** Reported: after an
  insert the reader had to copy the list into the page's Tracklist Editor by hand to adjust it,
  while a merge hands them exactly that editor filled (the down state). So `insert` now stores
  a payload like every other mode and `tlImporter_runEditPage()` renders the block, which means
  the down state fills `#tlEditor-textarea` and hangs its Apply row under the site's editor
  there as well. The reading is the mode - `data.mode == "insert"`, no flag of its own - and it
  leaves the Original column OUT: that section was empty by definition (`hasTracks` false), and
  an empty third box reads as a column that failed to render. Two columns, "Inserted" and
  "Candidate", both VERBATIM (`tlImporter_rawItems`, the chaptered case's reason: no merge ran,
  so there is nothing to flag, and the parser would tidy up a list neither side holds). The grid
  is `.mdb-tlImporter-cols-2` - `tlImporter_addColResizers()` builds bars for three columns
  only, so the 14px they would occupy is the gap instead.
- **Down, an Insert shows NO column at all.** The Inserted column hands its text to the site's
  editor and is hidden like every Merged one - and the Candidate is dropped with it, because on
  an insert the two hold the SAME list: alone beside an editor carrying its own text, it is a
  copy to read past, not something to compare against. What is left is the block's labelled
  edge - legend and corner toggles - which still names the editor below it and still offers the
  way back up; the fieldset's padding collapses so the empty frame does not stand there as a
  box. The block carries `mdb-tlImporter-insert` for it (set in `tlImporter_renderDiffView`
  next to the `cols-2` class): the CSS needs the reading on the FIELDSET, not on the grid, and
  `tlImporter_downToggleTitle()` reads the same class so the arrow's tooltip stops promising
  columns that stay above the editor. The hiding rule names `.mdb-tlImporter-cols`, not
  `-cols-2`, so the narrow-window media query - which only rewrites `grid-template-columns` -
  cannot bring the columns back.
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
