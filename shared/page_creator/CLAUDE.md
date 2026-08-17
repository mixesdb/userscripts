

Name alias in prompts: `PC`, `page creator`

The MixesDB page creator: the row (`#mdb-pageCreator`) a site script puts next to a player,
holding an editable suggested mix page title, a confidence score and a "Create" link that opens
the new page's edit form prefilled with the file details, the `{{Player}}`, the categories and
the artwork URL.

Shared by every site userscript. Nothing in here may look at a specific site: the site script
reads the values off its own page/API and hands them over.

## Files

| File | What it is |
| --- | --- |
| `page_creator.js` | The row and the "Create" link, plus the tracklist box. `mdbPageCreator_*`. Public entry points: `mdbPageCreator_add(options)`, `mdbPageCreator_addTracklist(options)` and `mdbPageCreator_watchToolkit()` - see the header comment for the options. Also the loading skeleton (`mdbSkeleton_*`, entry point `mdbSkeleton_show(options)`) - see its section comment |
| `title_builder.js` | `buildMixesdbTitle()` and the `mdbTitle_*` parser. No DOM, no network except the MixesDB category lookup. Also `mdbTitle_titleCategories()`, the way back: a finished title -> the year, the artists and the entity the page is filed under |
| `title_definitions.js` | The word lists and channel->show mappings the parser uses. Plain data, meant to be extended by hand - this is where the learning from each report goes |
| `tracklist_detector.js` | `mdbTracklist_detectInText()` / `mdbTracklist_detectInComments()`: which lines of a description are the tracklist. No DOM, no network - see below |
| `page_creator.css` | Styles the row, the tracklist box and the loading skeleton. Loaded with `loadRawCss()` by each site script |
| `title_examples.js` | Test data: every title ever reported as wrong |
| `title_examples_test.js` | The deno runner for it |
| `tracklist_examples.js` | Test data: real descriptions and the tracklist that has to come out of them |
| `tracklist_examples_test.js` | The deno runner for it |
| `mixesdb_api_request.md` | The category-lookup endpoint we asked the MixesDB maintainer for - see below |
| `page_text_learning.md` | Plan: reading the recent sibling pages' wikitext to shape the new page's text. Not built |
| `row_enrichment.md` | Plan: category links, sibling titles and duplicate checks in the row. Not built, except the `insource:` mirror-URL check, which needs no endpoint |

In `page_creator.css` the `Site specific rules` block stays at the BOTTOM of the file - new rules
go ABOVE it, never after it and never in the middle of it unless they are site specific themselves.
Those rules are `body.<site>`-scoped overrides of the shared ones above them, so they have to come
last to win on equal specificity, and keeping them in one closing block is what makes "is anything
here site specific?" a question the end of the file answers.

## Adding a site script

`@require` the four JS files in this order (they are plain scripts, not modules, so order is
the load order):

```
title_definitions.js, title_builder.js, tracklist_detector.js, page_creator.js
```

`../global.js` and `../tracklist_editor/funcs.js` have to be `@require`'d before all four -
`page_creator.js` calls `apiTracklist()` and renders the `#tlEditor` box out of the latter.

then `loadRawCss()` `page_creator.css` next to the script's own `script.css`, and call
`mdbPageCreator_add({ title, channel, createdAt, ..., target, placement })` when the site's data
arrives plus `mdbPageCreator_watchToolkit()` whenever the toolkit is (re)built. A site whose
player pages carry a description adds `mdbPageCreator_addTracklist({ description, loadComments,
target, placement })` - see the next section - and hands the same `description` to
`mdbPageCreator_add()`, where the TITLE builder reads the labels its tracklist credits.
SoundCloud is the reference implementation.

A site that builds a tracklist box of its OWN (TrackId.net renders the identified tracks into
one) skips `mdbPageCreator_addTracklist()` entirely and names that box in the `tracklistBox`
option of `mdbPageCreator_add()` instead - the "Create" link then reads the page's tracklist
out of it at click time, and the Tracklist Editor's verdict about that text files the
`Tracklist:` category, exactly as with the creator's own box. The same pattern serves the
styles: a site that suggests style categories (TrackId.net's "Style suggestions" box) names
that box in `stylesBox`, and its `[[Category:...]]` lines fill the style slots the page text
otherwise leaves as two empty rows - also read at click time, so no waiting on the box.

`target` should be a **selector string**, not a node: these sites re-render under the script's
feet, and the string is looked up again on every render.

`sourceLabel` is the site's short name as a reported title is written with it (`"SC"`), used by
the "Report" box for its `SC title:`/`SC date:` lines. `window.scriptName` is only the fallback -
the script name and the name reports use are not always the same.

A site whose additions build up inside ONE container it owns can cover that build-up with the
loading skeleton: call `mdbSkeleton_show({ target, rows, height, keep, extraReady })` right
after creating the container (and again whenever the site wipes and the script recreates it).
All other children of `target` are `display:none` until the toolkit verdict is in,
`extraReady()` - if given - says the site's own async pieces are done, and the container's DOM
has been quiet for a settle window; then skeleton and content swap in one step (6s cap either
way). `rows` composes the grey stand-ins from a shared vocabulary (`head`, `dates`, `buttons`,
`player`, `toolkit`); `keep` names direct children that stay visible while loading and skip the
reveal fade (TID's embedded player - built on the spot, so covering it would only delay
playback); `window.mdbSkeleton_enabled = false` (site debug settings) turns it into timing-only
mode, which logs the same "everything loaded" line without covering anything. SoundCloud and
TrackId.net are the two callers.

## The tracklist

The tracklist an uploader wrote into the description ends up in an editable box next to the
player and on the created page. `tracklist_detector.js` finds it in the text, the Tracklist
Editor API (`apiTracklist( text, "standard" )` in `../tracklist_editor/funcs.js`) formats it,
`page_creator.js` renders the box (the shared `#tlEditor` from `../tracklist_editor/funcs.js`)
and writes it into the page.

Settled, so it does not get re-litigated:

- **Detecting, formatting and showing are three steps, not one.** Detecting is free, formatting
  costs a request. So a mix that is ALREADY on MixesDB gets the headline and nothing else - the
  API is not asked until someone clicks it, and most of those clicks never happen. A mix with no
  page yet is formatted and opened straight away, because the "Create" link has to carry it. That
  needs the toolkit's verdict, so the box waits for it, and the decision is made **once**: a
  re-render must not force a box the reader closed back open.
- **The headline is two elements.** The word "Tracklist" is the `<strong>` and the toggle; the
  bracket behind it is an `<abbr>` whose title says where the tracklist was read out of. A
  tooltip on the word would fight the click, and a click on the explanation means nothing.
- **The box wins over the detection.** What is in it at the moment "Create" is clicked is what
  goes onto the page - it is there to be corrected. Hiding it does not drop it from the page:
  that is a display state, not a decision about the tracklist.
- **An edited box re-formats itself on blur, and the click-time ask is the safety net.** The
  shared blur update (`tlBoxBlurUpdate` in `../tracklist_editor/funcs.js`, since 2026-08-17)
  sends an edited box through the API when the editor leaves it, writes the answer back and
  hands the verdict to `mdbPageCreator_tracklistBoxUpdated()`, which keeps it exactly as the
  click-time validation would (so that validation then finds the text unchanged and asks
  nothing) and re-renders the reasoning panel - only its section 4 comes out different, and
  no name lookup fires, because the tracklist takes no part in the title.
- **While the caret is in the box the text is formatted too, not only the feedback** (since
  2026-08-17, fourth round - protecting the caret's own line left it visibly unformatted while
  every line around it changed), and only when the reader switched it on (the "Live updates"
  switch in the feedback box, OFF by default). The debounced check (`tlBoxTypeUpdate`, 800ms,
  flushed at once on Enter and on a click into the box) writes the answer and remaps the caret:
  line-wise while the line count holds (the caret's line keeps its index, only its column is
  mapped), whole-text otherwise - `tlBoxRemapOffset()` is the common-prefix/common-suffix
  mapping input-formatting code uses. It skips the write mid-composition (IME) and when the box
  was typed on since the request went out, and reports back whether the box now HOLDS the
  answer: that boolean is what `mdbPageCreator_tracklistBoxUpdated( box, res, applied )` files
  as validated, so a skipped write still leaves the blur pass its work.
- **On the way into the click the API is asked once more if the box changed since, and its
  TEXT is applied like on blur** (since 2026-08-17, second round: "Create" clicked straight
  out of the textarea fires BEFORE the box's blur, so the blur update alone left such a page
  with the raw typed text). Rewriting the text at the click is as safe as on blur, for the
  same reason: clicking "Create" says the typing is done. Both click paths apply through the
  shared `tlBoxApplyResult()` and hand the bookkeeping to
  `mdbPageCreator_tracklistBoxUpdated()`; the request-sequence bump outdates a blur answer
  still in flight, so nothing applies twice.
- **The plain left click (and Enter) holds the navigation back until the update was SEEN**
  (third round, same day: on TrackId.net the synchronous ask was invisible - it blocked the
  paint and the new tab took the screen the moment it returned).
  `mdbPageCreator_createAfterTracklistUpdate()` intercepts the click and waits two halves of
  `tlBoxUpdateMinMs`: grey for the first (scrolled into view when the box sits below the
  fold), the applied answer on screen for the second - opening on the grey's end alone was
  seen as "box goes white, stalls, tab opens", the result never visible. Only then the edit
  form opens - `window.open` inside the click's transient activation, with a same-tab
  fallback if a blocker disagrees, and a pending flag held up to the open so a click in
  either half cannot start a second tab. Middle, right and cmd/ctrl/shift-clicks navigate natively off the href and keep
  the synchronous ask at mousedown (`mdbPageCreator_validateTracklist()`) - their flash after
  the fact is visible because those clicks leave the page on screen.
- **Only the API's own `"complete"` earns `Tracklist: complete`.** A warning, a hint or its
  `"incomplete"` all file as incomplete, which is the value that costs nothing if it is wrong.
- **`<list>` or not is read off the API's answer, not off the status.** MixesDB writes a
  tracklist as a `#` numbered list when every track is named, and as plain lines inside `<list>`
  when it is not (a `...` gap is no list item). The `#` in the answer ARE that decision.
- **A tracklist is a RUN of neighbouring lines**, never lines gathered from all over the text.
  Single lines that read as "Artist - Title" are everywhere in a description ("6 Decks - 2
  Mixers"); four of them in a row are not. Numbered runs additionally have to count upwards.
- **Several runs become CHAPTERS (`;Name` above each block, blank line between) - all or
  nothing.** Every run needs its own headline: the nearest real line above it, or a glued
  "Hour 1 - DJ A:" first line, peeled off only when the rest still passes as a tracklist. The
  name is the headline stripped of "Guest Mix"/"Hour 1"/"First Hour" prefixes and a trailing
  ":", in whatever mixture of blanks, "-" and ":"; a headline that was ONLY the prefix keeps
  it. A missing headline, a prose line, a bare "Tracklist:" heading or runs that disagree on
  being numbered mean NO chapters - the longest run wins as before, because a wrong chapter
  split is worse than the main tracklist alone. The TLE API keeps the ";" lines and numbers
  each chapter's tracks on their own (verified against it 2026-08-15), so chapters need nothing
  from `page_creator.js`.
- **A blank line ends a run unless the numbering steps over it.** An uploader who writes every
  track as its own paragraph leaves a blank line between every pair of them and still wrote one
  tracklist. Only the numbering may bridge that gap, and only upwards - which is what keeps the
  "6 Decks - 2 Mixers" line one blank above a tracklist starting at "01." out of it, and what
  keeps the social links under an unnumbered tracklist out of that one.
- **A URL is never part of a tracklist and never the END of one.** A line that is only a link
  vanishes before the runs are read - it neither joins a run nor breaks it, and it is no blank
  line. Uploaders put a link under every single track, and a rule that merely refused to take
  those lines would still cut the run apart at each of them. Most such links are typed bare,
  without `http://`, so `domain.tld/path` and a lone `domain.tld` count as URLs - guarded by a
  lowercase short TLD and a letter in the label before it, which is what keeps `Mono.xID` and
  `4.Slam` being tracks. A URL INSIDE a line is stripped and what remains is judged:
  `Buy it here - https://...` reads as a track with the URL in place and as nothing without it.
- **One numbering style per block, decided by the MAJORITY of its numbered lines.** An uploader
  who typed `12 - ` and `13 - ` into a list otherwise numbered `12 ` wrote one tracklist, but the
  API reads the block as a whole: it strips the numbering the block agrees on and leaves the odd
  lines alone, so those two arrive with the number still in the artist. Only lines disagreeing
  with the majority are rewritten, and the digits are never touched (`07` stays `07`) - which is
  what leaves a list written `1 - Artist - Title` all the way down exactly as it is, and is the
  answer to a dash that belongs to the artist rather than to the numbering. No majority means no
  rewrite: two styles splitting a block down the middle is not a pattern.
- **A block that splits artist and title with a SLASH is rewritten to the dash** (`Ackermann /
  Pure` -> `Ackermann - Pure`, same for `//`, `\` and `\\`) before the API sees it: the API knows
  no other separator and reads such a line as one nameless track carrying the whole line as its
  artist. A slash needs a space on BOTH sides to count as one, where the dash needs only one -
  it sits inside words and addresses all the time (`AC/DC`, `w/`, `label.com/artist`). Only the
  FIRST separator on a line splits it (`traKKman / Jack 2 The Groove - Sound Factory Bar mix`
  keeps the dash in its title), and only a block whose separator lines are MOSTLY slashes is
  rewritten - a lone `Artist / Other Artist - Title` among dashes is a collaboration.
- **The separator is written as `" - "` before the API sees it**, whatever dash and whatever
  spacing it was typed with (`Arion – Squaa`, `Artist –Title`, `Artist -- Title`). The API
  normalizes an em dash and one-sided spacing itself, but NOT the en dash - the one SoundCloud
  uploaders type most - and a line it does not read splits into no artist at all, so the box comes
  back orange with "These tracks seem to miss the artist names" listing every track. No majority
  rule here, unlike the slash: a dash with a space next to it IS the separator on a line that has
  one, which is the very rule the run was detected by. Only the FIRST one moves, and the numbering
  and a leading cue are skipped over first.
- **A cue written BEHIND the track is moved in front of it before the API sees it**, and anything
  trailing that cue becomes a bold note in front of the artist ("Artist - Title 00:56:00- CLASSIC
  OF THE WEEK" -> "[00:56:00] '''CLASSIC OF THE WEEK:''' Artist - Title"). The API reads a leading
  cue and takes a trailing one for part of the title, so this cannot be left to it. Only done when
  at least half the block's lines carry such a cue - one title ending in something clock-shaped is
  not a pattern.
- **Comments are asked only when the description gave nothing**, and only for a WHOLE numbered
  tracklist starting at 1. Single track IDs - which is what nearly every comment naming an
  "Artist - Title" is - must never be taken, and an unnumbered comment tracklist is left alone
  because nothing can split it back into tracks. The site script fetches them (it owns the API
  token); this file decides whether they are worth fetching.

Run the examples before and after touching `tracklist_detector.js`:

```
deno run --allow-read shared/page_creator/tracklist_examples_test.js
```

They hold WHOLE descriptions, prose and links included - where the tracklist starts and stops is
the question, and that question does not exist in a trimmed fixture. Add a reported description
as a case the same way title reports are added to `title_examples.js`, with a comment naming what
it guards. A case with `expect: null` is as important as the others: a wrong tracklist on a new
mix page is worse than no tracklist.

## The MixesDB category lookup (live since 2026-08-16)

The suggestion no longer relies on hand-tuned word lists alone: MixesDB's own category names
decide what is an artist, a podcast, a show, a venue or an event. The wiki's `action=mdbnames`
module (built for us - contract in `mixesdb_api_request.md`) answers case-insensitively with
the canonical spelling, the type and the mix count; `mdbTitle_lookupCategories()` in
`title_builder.js` is the client. Background worth keeping: **MixesDB itself is case-sensitive
to the first letter** (`$wgCapitalLinks = false`), which is why a verbatim `Category:` lookup
missed `trommel`/`BASSIANI` for months and why the module exists at all.

Rules the implementation follows, settled before it was built - do not re-litigate:

- **A resolved name is written in the wiki's spelling**, not the source's: `trommel` ->
  `Trommel.251`, `asa 808` -> `ASA 808`. Done at the single exit (`mdbTitle_result`), but ONLY
  name-for-name: a server match whose normalized name differs (`Truancy Volume` ->
  `Truancy Volumes`) is knowledge, not a spelling, and never rewrites the title.
- **Candidates come from THE shared chunk split** (`mdbTitle_titleChunks`): typos and
  decoration out first, brackets read as separators (the channel's own bracket excepted), and
  the parser's guarded series-"by" split - `Guestroom 779 by Sascha Sibler` asks about both
  halves, `(Ritter Butzke)` is asked on its own. One function also feeds the report panel's
  "Title chunks" section, so what is shown, what is asked and what is parsed cannot drift.
  What the parse removes OUTRIGHT is no chunk and no candidate: a label-credit bracket
  (`Tooker (SONARA / Crosstown Rebels)`, rule 1a - needs the description for the
  tracklist-credited labels, so the split takes it as its third parameter) and a place list
  saying where the artist is from (rule 3h, mirrored with the same live-title guard). The
  split returns them under `removed`, each `{ text, reason: "label" | "location" }`, and the
  panel shows them as red chips on the chunk section's "Removed:" line with the reason -
  the cleanup section does NOT repeat them - asking the wiki about a record label wastes
  the request.
- **Candidates are only ever reduced from the RIGHT** (trailing episode number, `#n`, `.n`,
  year), never from the left. With 57,462 artist categories nearly every common word is a real
  category, so left-stripping invents matches: `MOLTO IN THE MIX` would find `In The Mix`, a
  genuine Show with 779 mixes, and wreck the title. (Verified the server does not left-match
  either.) **Only the reduced form is asked** - `DJ Mix #677` asks as `DJ Mix` alone, and the
  reasoning panel's re-lookup asks the entity category, not the numbered entity: a category
  name never carries the episode number, so the full form could only answer empty, and the
  episode family behind the reduced name is the row's planned prefix round
  (`row_enrichment.md`), never this exact-match lookup. Accepted price: an artist whose name
  ends in digits ("Asa 808") loses its exact match.
- **Only the REPLACED channel name is no candidate** - a channel name a conversion map
  replaces ("Dance TV", "Resident Advisor") is the one name not worth a request: the map
  overrides whatever the wiki would answer for it. The curated show standing in its place
  ("Dance TV DJ Mix", "RA Podcast") IS asked, in the channel's priority slot - not for its
  spelling (curated, never overridden) but for what hangs off the category: the mix count the
  panel annotates today, the recent sibling pages of roadmap step 4 tomorrow. Replaced means
  replaced: a series-map channel whose title carries none of its words falls through to the
  ordinary rules and keeps its lookup, and so does a channel mapped to "" - "no show" still
  leaves the name standing as the likely artist. The generic words ("DJ Mix") stay
  candidates too.
- **"#" is never sent** - `mdbTitle_lookupCategories` writes it out (`X #12` asks as `X 12`):
  the character is illegal in a wiki title, so a name carrying one can only answer empty.
  Sits in the one funnel both lookup rounds pass through, so an edited title's names are
  covered too.
- **All matches per name are kept**, because one name is legitimately several things:
  `fabric` the venue and `Fabric` the artist. Readers ask by type (`mdbTitle_knownMatch`);
  a name the wiki knows as podcast/show/radio (`mdbTitle_knownEntityType`) is never
  "(Promo Mix)" and never charged the "not in the known-shows list" doubt.
- The module takes **10 names max** per request - the candidate list is priority-ordered
  (channel first) and truncated, not split into a second request.
- **A non-artist match then reads the last ~8 mix pages in that category and copies their
  format**, rather than deriving it. `list=categorymembers` with `cmnamespace=0&cmsort=timestamp&
  cmdir=desc` (or the `recent` field, if the endpoint ships it). This is what settles episode
  number padding (`Zenaari Mix 025`), separators (`Trommel.234`), formats no rule would invent
  (`RA Podcast (RA.1051)`), whether there is a number at all (`Essential Mix`), and the city of a
  venue or event (`@ Ritter Butzke, Berlin`) - which today is taken from the player title and is
  usually simply missing. Recent pages only: `Slave To The Rhythm` renamed its episodes from
  `Ep.393` to `716` over the years, so a full listing misleads.
- **The same call also brings those pages' wikitext, which shapes the new page's text** -
  `{{StandardShow2h}}` instead of the file details table, the leading
  `[[File:{{subst:PAGENAME}}.jpg|right|360px]]`. Design and measurements in
  `page_text_learning.md`. Styles are only filled when 90% of the siblings agree (measured: that
  fires on 1 category in 9), and `Tracklist:` is never learned from the siblings at all - it
  describes the page's own tracklist, which is what the section above decides. That file says
  why.

### Roadmap

The one place the order of this work is written down. Every design decision lives in the plan
file named on the line, not here.

The order is the one decided on 2026-08-16 (README's Roadmap section is the human-readable
mirror of this table - keep the two in step):

| # | Work | Plan file | State |
| --- | --- | --- | --- |
| 1 | Category lookup rework: case-insensitive, all types, canonical spelling into the title | `mixesdb_api_request.md` | **DONE 2026-08-16** on the live `action=mdbnames` |
| 2 | Double-check info in the row: category links + family via `match=prefix`, sibling titles recent + around the mix date | `row_enrichment.md` §1-2 | open, fully unblocked - `match=prefix` + `matchedTitle` + `matchType` went LIVE 2026-08-16 (verified; row-only - the title builder stays on exact match) |
| 3 | Duplicate protection: `insource:` mirror-URL check in the toolkit's player search, and the Create-click sanity check with the two-step "Yes, still create" button | `row_enrichment.md` §3-4 | open, nothing blocks it |
| 4 | Page text learned from siblings: episode number format, `{{StandardShow*}}`, lead image, styles at 90% | `page_text_learning.md` | open, unblocked (`recentlimit` exists but the wikitext still needs the generator call) |
| 5 | **End of beta**: no row at all for a mix that already has a page | - | open, and LAST on purpose - see below |

**Step 5 in full.** Today `window.mdbPageCreator_showForUsedPlayers = true` ships in both site
scripts ("True as default for the beta phase"), which is what `mdbPageCreator_showForUsed()`
reads and what lets `mdbPageCreator_render()` build the row for a used player - with "Exists"
in place of "Create". Ending the beta means shipping it `false` (and then dropping the flag,
the `isUsed` branch and the `used` styling once nobody needs the comparison). Note the "Debug
settings" comment block in the site scripts claims "All off in the shipped script", which this
one is not - fix that line as part of the same work.

It is LAST on purpose and not a code cleanup to do early: while the row still fires for used
players it is a free safety net, because a mix whose page we FAILED to find is still shown to a
human who can spot the duplicate. Steps 2 and 3 are what make that failure unlikely, so the net
may only be removed after them.

Tracklist transfer is NOT on this roadmap because it already shipped - the description/comment
tracklist ends up on the created page and `Tracklist: complete/incomplete/none` follows the
Tracklist Editor API's verdict (see "The tracklist" above). An old plan note calling it "much
later" predates that work.

## Title suggestion reports

Reports come out of the **"Report" box** under the score (`mdbPageCreator_reportText()` in
`page_creator.js`), so they arrive with the page URL, the player title, the channel name **as the
site's API gives it**, the upload date, the suggested title, the score and the categories already
filled in,
plus the reporter's "Mistake / learning" and "Expected …" lines. That is exactly the input a case
needs - do not ask back for any of it when the box was used.

Above the box sits the **reasoning panel** (`mdbPageCreator_renderReasoning()`): title chunks,
cleanup steps, the mdbnames lookups with their answers, and the created page's categories
annotated from the lookup cache. Its sources are plain-data globals in `title_builder.js` -
`mdbTitle_trace` (filled by every `buildMixesdbTitle()` run) and `mdbTitle_lookupLog` (every
name `mdbTitle_lookupCategories()` was ever asked on this page; the answers stay in
`mdbTitle_categoryCache`). Display only, rebuilt whole on every render; a title edit re-renders
debounced and looks the current title's names up first (cache-aware). Hardcoded dark like the
loading skeleton (both sites are dark-themed). Opened while a lookup is still pending (or the
page skeleton is up), it renders its own stand-in rows and a safety-net poll re-renders when
everything settled - the normal path is the refresh after the lookup answer.

Settled about what it shows:

- **No step re-lists what the chunk section shows as removed** - a label credit, a place list.
  Done once, in `mdbTitle_traceStep()`, over every step's detail: a step quotes the title as it
  stands at that moment, which is WITH those words (the parse drops them later), and quoted
  again they read as kept. A step whose two sides come out identical after the cut concerned
  nothing else and is dropped whole - "X -> X" is not a step.
- **A step that worked off a `title_definitions.js` list offers it behind a round "?"** -
  the list's name, one sentence, and the entries printed as the JS they are written as. A
  reporter can then name the entry that is wrong instead of only the outcome. The step names
  its lists in the `defs` parameter of `mdbTitle_traceStep()`, `mdbTitleDefinitionDocs` (bottom
  of `title_definitions.js`) holds the sentence and the data, and `mdbPageCreator_definitionLiteral()`
  prints it - regexes as regexes, identifier keys bare, so the block reads like the file.
  **A new list needs an entry there as soon as a step names it**; a list no step points at
  needs none. A step that decided something on its own (the date, the brackets) names no list
  and gets no "?".
- The open "?" blocks are the one thing the panel remembers across a re-render
  (`mdbPageCreator_openDefinitions`) - the rebuild is what a title EDIT triggers, and a list
  opened to compare the title against must not close on the first keystroke.

Every title reported as wrongly suggested lives in `title_examples.js` as its input and the
title it should produce. Run them before and after touching anything the suggestion uses
(`title_definitions.js`, `title_builder.js`):

```
deno run --allow-read shared/page_creator/title_examples_test.js
```

**I never edit `title_examples.js` by hand - Claude adds every reported title to it.** Part of
fixing the report, not a separate step or something to ask about first. Per report:

1. Add the case under the site it was reported from: `url`, `title`, `channel`, `date`,
   `expect`. `expect` is my expected title. When the report is about the CATEGORIES the page is
   filed under rather than the title, add `expectArtists` as well - the artist categories, one
   per artist, which the runner reads off the built title with `mdbTitle_titleCategories()`.
   `description` is optional and only matters to the label test (`mdbTitleKnownLabels`), which
   reads the labels a tracklist credits (`Artist - Title [Label]`) out of it.
2. `channel` is the channel/uploader name as the site's API gives it, NOT the URL slug - they
   differ constantly (on SoundCloud it is the API field `username`: `discoanon` ->
   "Discoholics Anonymous", `sevenberlin` -> "SEVEN"). If I did not give it, or gave it in
   passing, read it off the site rather than guessing it - for SoundCloud that is
   `https://soundcloud.com/oembed?format=json&url=<track url>`.
3. Never record what the suggestion currently produces - the runner prints that every run.
4. Run the suite. It has to end at "all pass" before the work is done, old cases included.

If a title cannot realistically be reached (an event name that reads exactly like a mix name,
say), do not leave the case failing forever - pin `expect` to what it produces today and note
in a comment on the case what the ideal would be, so the parts that DO work stay guarded.
Say so in the reply rather than quietly lowering the bar.

What a case is guarding is not noted on the case - it is in the rule it belongs to, in
`title_definitions.js`. A failing case sends you there.

The builder is shared, so a rule learned from one site's report applies to all of them - which
is also why a fix must be checked against the cases of the OTHER sites, not just the reporting
one.
