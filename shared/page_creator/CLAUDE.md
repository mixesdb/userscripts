

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
| `page_creator.js` | The row and the "Create" link, plus the tracklist box. `mdbPageCreator_*`. Public entry points: `mdbPageCreator_add(options)`, `mdbPageCreator_addTracklist(options)`, `mdbPageCreator_addTracklistNotice(html)` and `mdbPageCreator_watchToolkit()` - see the header comment for the options. Also the loading skeleton (`mdbSkeleton_*`, entry point `mdbSkeleton_show(options)`) - see its section comment |
| `title_builder.js` | `buildMixesdbTitle()` and the `mdbTitle_*` parser. No DOM, no network except the MixesDB category lookup. Also `mdbTitle_titleCategories()`, the way back: a finished title -> the year, the artists and the entity the page is filed under (plus `entities`, every name its place group offers) |
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

A site that CHANGED the tracklist before handing it over says so with
`mdbPageCreator_addTracklistNotice(html)`. The string is printed as its own row with the
Tracklist Editor API's feedback and counts as a warning, so the box goes into warning mode for
it - `mdbPageCreator_feedbackWithNotices()` folds the notices into every answer the API gives
about that box, and the raw answer is kept so a re-fold cannot print a notice twice. The
`status` is always the API's own: a notice is about provenance, not completeness, and must not
move the `Tracklist:` category. Callable before or after the box exists; SoundCloud's comments
path needs the latter. SoundCloud's resolved channel handles are the only caller so far.

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
- **A list bullet in front of the track is taken off before the API sees it** (`- Eddie Richards -
  Someday` -> `Eddie Richards - Someday`), and it is the FIRST thing the block gets, so every step
  after it looks at the track and not at a decoration. The hyphen is the expensive one: the API
  reads it as "this line continues the one above" and glues the tracks together, so a 32-line list
  written with `- ` came back as ONE row and, at that length, as an empty text with "No tracklist
  received." - which is a box that never opens. An en dash, `•`, `·`, `>` or `~` costs less and is
  just as wrong: it survives into the artist name of every track. No majority rule, unlike the
  slash - a single bulleted line already swallows the track above it. A blank behind the bullet is
  required, which is what keeps an artist called `-Ms-` intact.
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
- **A dash written WITHOUT its spaces is a separator too, but only on a second pass.**
  `Miret-Sabio Espejo (Original Mix)` is a track line to a reader and to nothing in the first
  pass, which wants a space on at least one side - the rule that keeps `Lo-Fi` and
  `Jerome Isma-Ae` from splitting into two tracks. Both cannot hold at once, so the whole
  detection is simply run a SECOND time over a text whose spaceless separators were spaced out
  (`mdbTracklist_spaceTightDashes()`), and only when the first pass found nothing anywhere - a
  description that already yielded a tracklist never reaches it, which is what makes the pass
  free of regressions by construction. Four guards keep it off prose: only a line carrying
  neither a spaced dash nor a slash is rewritten, the letter behind the dash has to be a CAPITAL
  (a compound word is lowercase behind its hyphen, a title is not - and a digit is barred, or
  every `2026-08-19` would pass), at least `mdbTracklist_minTracks` lines have to be written that
  way before the pass runs at all, and MOST of them have to run on behind the dash - what is left
  of a compound is one word and the line ends there (`Berlin-Mitte`, `Jean-Luc`), which is what
  short prose lines carrying a hyphenated place name fail and the only thing that otherwise
  passes every other guard. Counted over the block rather than demanded per line: a one-word
  title among the others is a track, and dropping that one line would tear the run in two.
  Accepted price: a lowercase artist (`stbr-Reservoir`) is not seen - a run cut at the wrong dash
  is worse than no run.
- **A line ending in a COMMA that is no track line of its own is the front of the next line**
  and is glued there before the runs are read (`mdbTracklist_joinContinuations()`), leaving a
  null behind exactly like a URL line, so every other line keeps the position the chapter lookup
  reads it by. An uploader whose artist list ran over the row writes it that way
  (`Oliver Koletzki,` / `Niko Schwind, Sidartha Siliceo-Satinka (Kermesse Remix)`), and left
  standing it costs far more than its own track: it is no candidate line, so the run ENDS there
  - two of them in one tracklist made three short runs, of which only the longest would have
  survived, or three chapters named after the leftovers. A line that already passes as a TRACK is
  never moved: a title ending in a comma is a row. The numbering does not save it the same way -
  a wrapped credit may carry it (`02. Oliver Koletzki,`) - but then the line below has to carry
  none, or the two are two numbered tracks and neither wrapped anywhere.
- **A cue written BEHIND the track is moved in front of it before the API sees it**, and anything
  trailing that cue becomes a bold note in front of the artist ("Artist - Title 00:56:00- CLASSIC
  OF THE WEEK" -> "[00:56:00] '''CLASSIC OF THE WEEK:''' Artist - Title"). The API reads a leading
  cue and takes a trailing one for part of the title, so this cannot be left to it. Only done when
  at least half the block's lines carry such a cue - one title ending in something clock-shaped is
  not a pattern.
- **Comments are asked only when the description gave nothing**, and only for a WHOLE
  tracklist. A comment is one long line, so what MARKS its tracks is the only thing to split on,
  and there are two markers: the NUMBERING (`1.`, `2.` ..., starting at 1 and counting up
  without a gap, `mdbTracklist_splitNumbered()`) and the CUES (`(00)`, `[05]`, `1:02:30` - a
  number in brackets or a clock time carrying its colon, never a bare one, never running
  backwards, `mdbTracklist_splitCued()`). Either way six tracks have to come out of the split
  and half of them have to read "Artist - Title", which is the bar the markers really rest on:
  single track IDs - what nearly every comment naming an "Artist - Title" is - must never be
  taken. A comment tracklist with NO marker is left alone because nothing can split it back into
  tracks. The split lines then get the same spaceless-separator second pass a description gets
  (`mdbTracklist_acceptSplit()`), and a cue is rewritten into the brackets MixesDB writes it in,
  digits untouched - `(00)Gerd` would reach the API as an artist called `(00)Gerd`. The site
  script fetches the comments (it owns the API token); this file decides whether they are worth
  fetching.
- **A trailing `?` is the writer's, not the title's** (`mdbTracklist_tidyUnsure()`):
  `Gerd - Echo Jammz?` loses it, and so does a trailing `…`. Only ever in a block that ALREADY
  writes `?` the MixesDB way somewhere - in place of an artist, in place of a title, or as the
  whole track (`?`, `Will Hofbauer - ?`) - which is what leaves `Haddaway - What Is Love?` and
  every other title really ending in a question mark alone. A `?` that IS the artist or the
  title keeps its place whatever the block does.

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

**`mixes` is the wiki's own `categoryinfo` count and some of those counts are wrong** (found
2026-08-20 on `Category:Amplify Series`, reported to the maintainer). MediaWiki keeps a
category's member counts in the `category` table instead of counting on read, and on this wiki
several of those counters have drifted: `Amplify Series` answers `1 mix` where the category
holds 29 mix pages, and 3 of 40 randomly sampled categories are off in one direction or the
other. The answer contradicts itself where it happens - `"mixes": 1` next to the ten titles the
same match carries in `recent` - but `recentlimit` is capped at 10, so `recent.length` is only
ever a lower bound and cannot correct the count. **Nothing here works around it**: the count is
worth at most -10 in `mdbTitle_matchConfidence` and the chip is a display, so a drifted counter
costs a chip that reads wrong, never a wrong title. The fix belongs on the server
(`recountCategories.php`) - do not build a client-side guess for it.

Rules the implementation follows, settled before it was built - do not re-litigate:

- **A resolved name is written in the wiki's spelling**, not the source's: `trommel` ->
  `Trommel.251`, `asa 808` -> `ASA 808`. Done at the single exit (`mdbTitle_result`), but ONLY
  name-for-name: a server match whose normalized name differs (`Truancy Volume` ->
  `Truancy Volumes`) is knowledge, not a spelling, and never rewrites the title. One exception
  since 2026-08-19 (reported on `Ri0D.`): a REDIRECT whose target is the same name up to one
  substituted character (`Ri0D.` -> `RiOD.`, the stylized 0 vs the O) is the wiki correcting a
  spelling, and the target - the category that really holds the mixes - wins
  (`mdbTitle_oneCharApart`; `Dekmantel` -> `Dekmantel Festival` stays knowledge). The exit also
  respells the names in FRONT of a composed live group's `@` since the same day - only the
  place behind it was ever canonicalized where the group was built, so `Ri0D. & Jonbot @ ...`
  kept the stylized spelling even with the wiki's answer in hand.
- **The first pass's own names are candidates too** (`mdbPageCreator_addParsedNames()` in
  `page_creator.js`, since 2026-08-19): the artists and every entity category of the title the
  first parse built (`mdbPageCreator_entityLookupNames`), appended LAST (an over-full list drops them first) and deduped against
  the chunk candidates, so on the usual title - where the parse's names ARE chunks - they add
  nothing. They exist for the name only the parse can see: `RA.971 DJ MARIA.` is ONE chunk,
  the episode id being no separator, so the chunk side asked a name that cannot exist while
  the artist inside it was never asked - the wiki's `Category:DJ MARIA.` (8 mixes) then never
  reached the title, which said "DJ Maria." while the page was filed under the right spelling.
  Category names are the last word on spelling, and this is what puts them into the second
  pass's hands. Origin `first parse` in the panel's section 3.
- **The CATEGORY is respelled too, and separately from the title**
  (`mdbPageCreator_categoryEntry()` in `page_creator.js`, since 2026-08-18): the artist and
  entity entries carry the wiki's spelling even where the TITLE does not - an EDITED title is
  never rewritten, so the page text writes `[[Category:DJ MARIA.]]` under whatever spelling
  the editor typed - a category spelled our way is a second, EMPTY category
  next to the one holding the 8 mixes, which is the one thing a category line may never be.
  Done again there rather than left to the title's canonicalization because the two are not
  the same question: a title keeps what its own rules made of a name, a category has to be the
  page that really exists. Same guard as above - a respelling only (normalized names equal, or
  the one-char redirect exception, which is exactly the case where writing the alias would file
  the page into the redirect category) - asked by ROLE (an artist has to be known AS an
  artist), and the name the title spells is kept as `titleName`, which is what the chip's
  tooltip says is worth correcting. The chip's link already carried the wiki's spelling; the
  chip's TEXT is this entry, which is why the Ri0D. report saw the two disagree.
- **Candidates come from THE shared chunk split** (`mdbTitle_titleChunks`): typos and
  decoration out first, brackets read as separators (the channel's own bracket excepted), and
  the parser's guarded series-"by" split - `Guestroom 779 by Sascha Sibler` asks about both
  halves, `(Ritter Butzke)` is asked on its own. One function also feeds the report panel's
  "Title chunks for category lookup" section, so what is shown, what is asked and what is parsed cannot drift.
  What the parse removes OUTRIGHT is no chunk and no candidate: a label-credit bracket
  (`Tooker (SONARA / Crosstown Rebels)`, rule 1a - needs the description for the
  tracklist-credited labels, so the split takes it as its third parameter) and a place list
  saying where the artist is from (rule 3h, mirrored with the same live-title guard). The
  split returns them under `removed`, each `{ text, reason: "label" | "location" }`, and the
  panel shows them as red chips on the chunk section's "Removed:" line with the reason -
  the cleanup section does NOT repeat them - asking the wiki about a record label wastes
  the request.
  **The DATE is cut there too** (`mdbTitle_findDate`, mirroring rule 3), with the upload date
  as the split's fourth parameter so both cuts land on the same digits. The parse writes the
  date in FRONT of the finished title, so it is part of no chunk and of no name - and the
  trailing-number reduction below only ever takes ONE number off, so a date left in its chunk
  becomes a name that cannot exist: `The Lot Radio 08-15-2026` was asked about as
  `The Lot Radio 08-15` while the venue itself was never asked.
- **The artists a joiner strings together are candidates too** (2026-08-19, reported on
  "Brotfabrik X k²0 Open Air - 25.07.2026 - Leipzig - Ri0D. & Jonbot"): `Ri0D. & Jonbot` is no
  category and never will be, so each name of an artist-role chunk's group is asked next to
  the whole (origin `group member` in the panel's section 3; the whole stays first - a duo can
  be a category of its own). **A joiner is what MAKES the chunk artist-role** (2026-08-20):
  `Asa 808 b2b Third Guy` used to score as a series on the digits of a NAME, which put it in
  the entity column and skipped the member split, so neither artist was asked. A b2b/&/vs/comma
  list is a line-up whatever digits stand in it - only a series WORD overrules that, the way it
  outweighs a number in `mdbTitle_seriesScore` (`Drumcode Radio Live & Friends 123` stays one
  show's episode). Such a chunk is not number-stripped either: the digits at its end belong to
  the last NAME in the list (`Third Guy b2b Asa 808`), and no episode is written as a b2b. The
  members are asked as written, number and all. The confirmed name is what settles which bit of an event/venue
  title names who PLAYED: `mdbTitle_takeEventTitle`/`_takeVenueTitle` pick the bit the wiki
  backs as an artist first (`mdbTitle_groupHasKnownArtist`), then a bit that writes a line-up
  (`mdbTitle_joinedArtistBit` - the comma deliberately not counting, it strings places), and
  only then the first bit around the place - blind position had made `Leipzig`, a chunk of its
  own, the artist, and the glue-the-rest fallback an entity `Leipzig Ri0D. & Jonbot` that
  nobody wrote. The candidate list dedupes normalized (a member can BE another chunk), and the
  same report is why a digit glued to a superscript (`k²0`) counts as a spelling in
  `mdbTitle_seriesScore`, not as a number - read as a count it failed the event branch's
  "an event is a place, not a series" guard.
- **Candidates are only ever reduced from the RIGHT** (trailing episode number, `#n`, `.n`,
  year), never from the left. With 57,462 artist categories nearly every common word is a real
  category, so left-stripping invents matches: `MOLTO IN THE MIX` would find `In The Mix`, a
  genuine Show with 779 mixes, and wreck the title. (Verified the server does not left-match
  either.) **The reduced form is the FIRST question** - `DJ Mix #677` asks as `DJ Mix`, and the
  reasoning panel's re-lookup asks the entity category, not the numbered entity: a series
  category never carries the episode number, so that form could only answer empty, and the
  episode family behind the reduced name is the row's planned prefix round
  (`row_enrichment.md`), never this exact-match lookup.
- **... but the name WITH its number is asked next to it, unless the title said the number
  counts editions** (2026-08-20, reported on "Flirt w/ Route 8 | BRL-071225"): not every
  `<name> <number>` is a numbered series. `Route 8` and `Asa 808` are artists, `Studio 80`,
  `Bar 25` and `Club 69` are venues, and their category carries the digits - asking only the
  reduced form does not merely answer empty, it answers WRONG: `Studio` finds four other clubs
  and `Front` a venue with 17 mixes. Nothing in the words can settle it, only the wiki can, so
  both readings are asked, the reduced one first (numbering is the commoner one, and the
  10-name cap drops from the end). `mdbTitle_numberBelongsToName` is what says when the second
  question is worth a slot - not when a counting word, a `#` or the `.` of a series edition
  introduces the number (`Vol. 3`, `DJ Mix #677`, `RA.971`), not when the name in front of it
  carries a series word (`HATE Podcast 498`), not when the number is a year. The numbered form
  asks as the ARTIST (as the place behind an `@`): a series category never carries its own
  episode number, so if that form is a category at all it is a name ending in digits. The
  answer is also what stops the cut at filing time - `mdbPageCreator_entityCategory` keeps the
  number where the wiki has answered for the name as it stands, the same shape as the room
  reduction below, and `mdbPageCreator_entityLookupNames` asks the numbered form so that
  answer can exist. This is NOT the prefix round: `match=prefix` on `Route` ranks
  `Route 94` first and would poison the cache (`row_enrichment.md` - the builder never uses
  prefix mode). Exact-matching the written name costs one slot and cannot answer wrong.
- **`w/` and `with` end a CHUNK the way they end a name in the parse** (2026-08-20, same
  report): step 3b takes the further artists out of the title, and `mdbTitle_titleChunks`
  mirrors it, so the guest is a unit and a candidate of their own while the connector belongs
  to no name. Without the mirror the whole thing stayed one chunk (`Flirt w/ Route 8`) and the
  number strip then asked about `Flirt w/ Route`, while `Route 8` was never asked from the
  chunk side at all; `Slowciety w/ Asa 808` asked as `Slowciety w/ Asa`. Read in FRONT of the
  place group only - the connector's capture runs to the next separator and an `@` is none, so
  `... w/ Route 8 @ 3000Grad Festival` would come back as one artist named after the festival -
  and the taken names go back in behind the chunk the connector stood behind, so the chunks
  read in title order.
- **A ROOM inside a venue asks about the venue too** (2026-08-19, reported on
  "Live@Elsewhere Loft July"): `Elsewhere Loft` is no category and never will be, while
  `Elsewhere` is the club, so behind the `@` the base name is asked NEXT TO the full one
  (`mdbTitle_venueSpaceBase` + `mdbTitleVenueSpaceWords` in `title_definitions.js`, origin
  `place base` in the panel's section 3). This is the one reduction that takes a WORD off, so
  it is fenced twice: only behind the `@`, where the title itself has said these words are the
  place, and only off a curated list that names a room, a floor or a piece of outdoor ground -
  never the house itself (`Club`, `Haus`, `Studio`, `Arena` are deliberately not on it, since a
  venue is named `... Club` far more often than it has a room called one). Still from the RIGHT
  and still one word, so the rule above holds. The full name stays the FIRST question: a venue
  really called `... Garden` answers for itself, and the reduction only fires where the wiki
  answers empty about the name AND knows the base as a venue or an event
  (`mdbTitle_reducePlaceGroup`, at the single exit so every branch that composes a place group
  is covered). The word is not lost - it comes back as a "Switch title" chip, and
  `mdbPageCreator_entityCategory` reduces the name again off the lookup cache, so the page
  files under the venue whichever reading the title carries.
- **A LINE-UP FRACTION is the second reduction that is not from the right** (2026-08-19,
  reported on "1/2 Faultierdisko @ 3000Grad Festival 2023"): "1/2 Faultierdisko" says one half
  of the duo played, and it is no category and never will be while `Faultierdisko` is one with
  4 mixes, so the act behind the fraction is asked NEXT TO the written name
  (`mdbTitle_lineupFractionBase`, origin `line-up base` in the panel's section 3). Fenced by
  the SHAPE rather than by a list - digits, a slash, digits, a blank - because nothing else in
  a title is written that way, and in FRONT of the "@" only, where a name is a name. Same two
  conditions as the room rule, so the same guard: the written name is no category at all AND
  the base is one, as an ARTIST. `mdbTitle_reduceLineupFraction` at the single exit then puts
  the act into the title, and unlike the room word it is NOT offered back as a chip - MixesDB
  writes a room where it is worth naming, but it writes no line-up fraction anywhere. The slash
  is no separator either: `mdbTitle_fractionLeadRe` keeps `mdbTitle_findEpisode` off it, which
  had read the "1" as a leading episode number and left the artist as "2 Faultierdisko".
- **A CREDIT is the third reduction, and the second one allowed to shorten the name a title
  ends up carrying** (2026-08-21, reported on "KODE9 FOR MAHARISHI - HYPERDUB 2014-2019
  DRIVE-BY", channel `kodenine`): "for" says who the mix was MADE FOR - maharishi is a clothing
  label - so `KODE9 For Maharishi` is a name MixesDB has never had and never will, while
  `Category:Kode9` holds 94 mixes and was never asked about at all. The whole bit was one
  candidate, one lookup and one empty answer, and the page was about to be filed under a
  brand-new empty category standing next to the real one - which is the one thing a category
  line may never be. `mdbTitleNameCreditConnectors` in `title_definitions.js` is the list, the
  third connector subset next to `mdbTitleNamePlaceConnectors`; `mdbTitle_nameCreditBase` reads
  it (the FIRST connector splits, so "A for B for C" reads its act as "A"), the candidates take
  the act next to the whole (origin `credit base`), and `mdbTitle_reduceNameCredit` at the
  single exit puts it into the title under the same two conditions the room word and the
  line-up fraction are reduced under: the wiki answers NOTHING about the written name AND knows
  the act as an ARTIST.
  **The connector also settles the ROLE**, which is what made the bit askable at all: `KODE9`
  ends in a digit, so `mdbTitle_seriesScore` scored the bit as a series and sorted it into the
  entity column - and a bit written "<name> for <somebody>" is an act and a credit whatever
  digits stand in the name. ARTIST side only, and that is the whole fence: behind the "@" the
  same little words connect places, and in the entity slot the reduction answers WRONG far more
  often than right - this very title's `Hyperdub 2014-2019 Drive-By` reduces to
  `Category:Hyperdub`, the Rinse FM show with 48 episodes, and filing a maharishi promo under it
  is a mistake no empty answer could correct.
  Unlike the fraction the dropped words ARE offered back, as a `nameCredit` "Switch title" chip:
  MixesDB writes names built around the word ("Dance For Life" is an event), and this is the one
  chip that moves the FILING with it - a page's artist category is read off the title, so the
  toggle decides which category the page joins. It is also the one reduction that costs
  confidence (-3), for the same reason: the other two are fenced by a shape or by a curated word
  that cannot be part of a name, this one is not.
- **A long artist name is asked about SHORTENED, a word at a time from the right** (2026-08-21,
  same report - "run more shortened variations" was what it asked for): `mdbTitle_nameHeads`
  turns `KODE9 For Maharishi` into `KODE9 For` and `KODE9`. A name of several words the wiki has
  never heard of usually carries one it does know at its front, and asking about the whole alone
  leaves that one unasked. Three words is the floor - a two-word name reduces to a single first
  name, and "Daniel", "Asa" and "Black" are all real artist categories with one mix each - and
  `mdbTitleNameHeadMax` (3) the ceiling.
  **They are QUESTIONS and nothing else.** No branch shortens a title on a head: each reduction
  has its own shape to go by (a room word, a fraction, a credit connector), and a head that
  answers is a name for the panel and the reporter to read. That is deliberate - "chop until the
  wiki nods" would shorten "Sven Väth Sound Of The Season" to its artist and drop the mix's own
  name, and with 57,462 artist categories the answer would come often enough to look right.
  Taken LAST of all and only while `names.length < mdbTitleNameHeadRoom` (6): they are the
  speculative names of the request, and one of them pushing a name some rule actually read out
  of the ten would cost more than it can ever answer. The parse's own names
  (`mdbPageCreator_addParsedNames`) are appended after this function returns, which is what the
  room leaves space for.
- **An acronym in the entity slot is expanded off the CATEGORY'S OWN PAGE TITLES first, and
  only then off the channel's initials** (2026-08-20, reported on "DSS 140 | Space Drum
  Meditation" on the channel "Deep Space Series"): the title filed under a lone `DSS` while
  Category:Deep Space Series - the channel, a podcast with 8 mixes - holds the episodes and
  titles every one of them "... - Deep Space Series (DSS 012)". The exit expands it
  (`mdbTitle_expandChannelAcronym`, in `mdbTitle_result` like the room and fraction
  reductions, so every branch that can leave an acronym in the slot is covered): the entity
  becomes the channel name in the wiki's spelling and the id goes into an `episode` of kind
  `id` - the assemble shape "Show (ID)".
  **Which signal answers is the whole point, and they are not worth the same.** The pages'
  own titles (`mdbTitle_seriesIdPrefix`, read off the `recent` list the mdbnames answer
  already carries - no request) are the WIKI SAYING the id belongs to this series, so they
  decide first, cost no confidence, and their spelling of the prefix wins over the
  uploader's (`Xyz 140` -> `XYZ 140`, the same rule a category name follows). Two pages
  have to agree - one bracket is a qualifier, several are a scheme. Their AGE is not asked
  about: a page titled "Deep Space Series (DSS 012)" says how the series is written whatever
  year it was written in, which is a different question from whether its conventions are
  current. The initials (`mdbTitle_isChannelInitials`, caps required, off the new
  `mdbTitle_channelUsed` global) are the FALLBACK for a series MixesDB knows without a page
  that writes such an id, and stay worth -5: `DSS` resembling `Deep Space Series` is an
  inference, not evidence. The trace step, the pick sentence and the confidence each name
  which of the two answered - crediting the initials on a title the pages settled would put
  the weakest reading we have behind the change.
  Three fences hold whichever answered: the letters are NO series category of their own (a
  show really called by them keeps them, and only an answer about THIS name blocks - the
  wiki's qualified "DSS (Das Schwarze Schaf)" is its OTHER DSS), the channel name IS one
  (`mdbTitle_entityTypes`), and the artist is not the channel itself (the numbered-series
  branch reads the channel as who played, and one name cannot be both groups). The filing
  needs nothing new - `mdbPageCreator_entityCategory` already strips a trailing bracket, so
  the page files under the channel's category; `mdbTitle_titleCategories` keeps the bracket
  in the SLOT it returns, which `mdbPageCreator_entityIsNumbered` depends on.
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
- **A channel name CREDITING its maker is two names, and its "by" says which is which**
  (2026-08-22, reported on "AKA AKA pres. Rhythm Prism Radio #053" on the channel "WHATS
  POPPIN by AKA AKA") - `mdbTitle_channelByParts`, read by `mdbTitle_pickChannelName` in the
  parse and by `mdbTitle_categoryCandidates` for the lookup. Glued, that name is one MixesDB
  files nothing under, and the damage is not the wasted request: the channel then stands
  NOWHERE in the title, so every rule that looks for it there is off - here 4a2, which reads a
  "pres." behind the channel name as the separator it is, so the whole title went into the
  entity slot with the channel in front of it and one artist standing in both groups. Split,
  "AKA AKA" opens the title and the show comes out on its own. Same word, same direction and
  the same case fence as the title's own "by" rule (`mdbTitle_byMarkerFlags`): what stands in
  FRONT was made, who stands behind made it. So these are NOT the equal names a "/" lists -
  the maker LEADS (the account's own name, which is what the title-names-neither fallback
  picks) and the two are asked in the roles their sides give them, the maker as an artist and
  the show as an entity. Instead of the "/" split, never next to it.
  **The four fences are the rule**, since a lowercase "by" is an ordinary preposition and a
  channel name carries no separator to tell them apart: the case fence ("Stand By Me"), the
  whole channel name STANDING in the title (`mdbTitle_namesTheChannel` - the title and the
  account spelling it alike are two sources saying it is one name, which is how a channel
  really called "Death by Audio" keeps it), the two halves being one name written twice
  ("Side by Side"), and a maker that reads as a name at all - no bare number, no series
  (`mdbTitle_guestIsName`) and no LOWERCASE little word no name opens on
  (`mdbTitleNonNameLeadWords`, "Live by the Sea"; lowercase only, or "The Martinez Brothers"
  would go with it).
- **The episode KEYWORD stays in the show name where the wiki knows the name carrying it**
  (2026-08-22, same report) - `mdbTitle_episodeWordKept`, read by 4a2. "Radio Show #069" comes
  out as "Radio 069" because the word stood there to announce the number, and that default is
  a report of its own ("Lilly Palmer pres. Spannung Radio Show #069"). But
  Category:Rhythm Prism Radio holds 123 mixes, which settles what its "Radio" is doing there:
  the cut left a "Rhythm Prism" MixesDB does not have while the answer naming the real one was
  already in hand. The wiki only ever OVERRULES the default - with nothing known the drop
  stands - and a word that merely counts (`mdbTitleCounterWords`) is never part of a name
  whatever the wiki says. The numbered-pair branch (4c) makes the same call on the same words
  with the opposite default, the word STAYING unless it only counts, because there the show
  name is the numbered bit itself ("Drumcomplexed Radio Show 311") and no word introduced it.
- **An answer can only be read where the title still HAS a place group** (2026-08-22, reported
  on "Anton & Hogi Wirjono All Night Long DJ Set at ZODIAC" on the channel "hogi"): the wiki
  answered `Zodiac` - a venue with 4 mixes - and the suggestion ignored it, which is what the
  report asked about. Nothing was wrong with the lookup: `Zodiac` was a chunk, it was asked,
  and the answer was in hand. What went wrong is that the title never reached a branch that
  reads a place. The channel's own name stood INSIDE the title ("hogi" in "Hogi Wirjono"), so
  4b fired - the branch that makes the channel the artist and everything left over the ENTITY -
  and an entity is ONE name, so the whole live group went in as one and the page was about to
  be filed under a brand-new `Anton & Wirjono All Night Long @ ZODIAC`. 4b now carries the same
  `"@"` guard 4a has had all along, and for the same reason written there: behind an `"@"` the
  title is not the name of something the channel made, it is the place they played at, and the
  artist is already standing in front of it. The general path then reads the group, and
  `mdbTitle_result` respells the place off the lookup (`ZODIAC` -> `Zodiac`) exactly as it does
  for a group any venue branch composed.
  **The lesson generalises past this one branch**: a category answer is worth nothing on its
  own - it is read by the branch that takes the title, so a branch returning EARLY silently
  discards every answer the lookup collected. A rule that can return a whole title as one name
  belongs behind the guards that say the title is something else.
  **The same report is why a live marker may STACK** (`mdbTitleLiveAtWords`): "All Night Long
  DJ Set at" is two markers in a row and only the one touching the connector was consumed, so
  the other stayed glued to the artist - and went into the lookup with it. `Hogi Wirjono All
  Night Long` was asked about, `Hogi Wirjono` never was. The joiner rule reads a RUN of markers
  now; each one still has to BE a marker, so no name is swallowed.
- **The channel name is not cut out of a longer name the wiki knows**
  (`mdbTitle_channelInsideKnownName`, 2026-08-22, same report): `Category:Hogi Wirjono` holds
  mixes, so the "hogi" standing inside it is part of that NAME, not the uploader signing their
  own title - and cutting it out left an `Anton & Wirjono` who never played anywhere, filed
  under a category nobody has. This is the OTHER half of asking the name: the marker fix put
  `Hogi Wirjono` into the request, and without this the answer would have come back and changed
  nothing. Read the way the parse reads a title everywhere else - the BIT the match stands in,
  then, on the side of the `"@"` it stands on, the member of that bit's line-up
  (`mdbTitle_splitArtists`) or the part of the place group (`mdbTitle_placeGroupParts`), asked
  in the role its side gives it. The cut stays the DEFAULT: an uploader really does write their
  channel name in front of a guest, and only an answer about the longer name overrules that -
  a name the wiki has never heard of gives no reason to keep it.
  **The lookup owes the parse both readings of a joined name**, which is what makes the answer
  reachable at all: an `&` in a candidate asks about the parts AND the whole (`Anton`,
  `Hogi Wirjono`, `Anton & Hogi Wirjono`) - the group-member split above - since a duo can be a
  category of its own while a line-up never is.
- **A confirmed name in the TITLE beats a channel name nothing confirms** (2026-08-23, reported
  on "112 - unrushed by ena b." on the channel "u n r u s h"): the answers were in hand and both
  were ignored - `Unrushed` a podcast with 111 mixes, `Ena b.` an artist with 2 - while the name
  that ended up in the title was the channel's, which MixesDB has never heard of and the title
  does not even write. It came out `2026-07-13 - u n r u s h - 112 Unrushed By Ena b.`: two
  brand-new empty categories. Nothing was wrong with the lookup again; what went wrong is which
  branch took the title. 6b - "the title is a numbered series and names NOBODY, so the channel
  is who played" - is the last of the branches that return the whole title as one name, and its
  premise is exactly the thing the lookup can falsify. So the new **6a** stands in front of it:
  where the title's own `by` has a name MixesDB files as an **artist** behind it, the title does
  name somebody, and that name outweighs a channel name no answer backs.
  **The wiki is the second source 5c's `by` rule says is missing.** That rule asks the WORDS -
  the bit in front of the `by` has to carry a number or a series word, since "Side by Side" and
  "Live by the Sea" are names - and `unrushed` carries neither, so the split never happened.
  An answer about the name behind the word settles it the same way the numbered-name and
  acronym rules are settled: nothing in the words can decide, only the wiki can.
  `mdbTitle_titleByParts` holds the reading and the three fences it shares with
  `mdbTitle_channelByParts` (the case fence, one name written twice, a maker that reads as a
  name); 6a holds the four that let it act - the channel earned nothing from the title
  (not mapped, not standing in it, no `<Show> <Word> <Number>` reading) and is no known series
  either, no `@` is left in the title, the wiki knows nothing about the written bit as a whole
  (a category is never split, the guard `mdbTitle_reduceNameCredit` holds), and what stands in
  FRONT of the `by` is not a name the wiki knows ONLY as an artist. The answer settles the
  SPELLING too - `Ena b.`, not the `Ena B.` the re-caser had written into the entity.
  Both halves are candidates now as well (origins `title show` / `title maker`, next to the
  chunk like every other reduction), so the answer 6a reads is asked for by design rather than
  reached by accident through `mdbTitle_splitNameChain`. Read off the chunk AS WRITTEN: the
  re-caser turns "unrushed by ena b." into "Unrushed By Ena b.", and that capital `B` is
  precisely what the case fence reads as a word of a name.
- **A name that is nothing but a counting word is no candidate** - `mdbTitleStaticNamePatterns`
  ("Episode 72", "Part 2", "Pt.3", the bare words too) holds the names every mix carries, so
  MixesDB files nothing under them and the wiki could only answer empty. Patterns rather than
  words, like `mdbTitleDroppedBitPatterns`: each entry carries its own number and its own
  spellings. Matched whole and anchored on both ends (`mdbTitle_isStaticName`), so a real name
  carrying the word ("Radio Episode Berlin", "Party") is untouched. Not the same list as
  `mdbTitleCounterWords`, which takes the word OFF a name that has more to it - a word only
  belongs here when a category of that name would be meaningless. A word a series is named
  after ("Podcast", "Mix") is meaningless in the same way once it stands ALONE, but it is a
  different rule and a different list - see the next bullet - because what is missing there is
  a NAME, and the entity slot grows one rather than dropping the word.
- **A name that is nothing but a generic SERIES word is no candidate either** (2026-08-21,
  reported on "Bassiani invites Victor / Podcast #323") - `mdbTitle_isBareSeriesName`, tested
  against `mdbTitleShowSuffixWords` with a trailing number allowed ("Podcast", "Podcast 323",
  "Mix #12"). Every word on that list names a series only TOGETHER with a name, which is why a
  bare one cannot merely answer empty: it can answer WRONG. `Mixtape` comes back as
  "Mixtape (Lane 8)", `Sessions` as "Sessions (Ronski Speed)" - the wiki's qualifier rule
  offering somebody else's series. In the same funnel as the counting words, so the skipped
  name costs no slot of the ten (the cap runs after the skips) and the panel's "Not asked:"
  line says why.
  **The entity slot grows the channel name in front of such a word** rather than dropping it
  (`mdbTitle_growBareSeriesEntity`, at the single exit like the acronym expansion, so every
  branch that can leave one there is covered): "Podcast 323" on "BASSIANI" becomes
  "Bassiani Podcast 323", the category that really holds the other 94 episodes. The channel is
  spelled the way the TITLE spells it where it names it (`mdbTitle_channelShown`, the all-caps
  rule asked once in `buildMixesdbTitle`), and the grown name is canonicalized against the
  wiki like any other. `mdbPageCreator_entityCategory` refuses the bare word as a category on
  top of that - the builder can no longer produce one, but an EDITED title can, and
  `[[Category:Podcast]]` on a mix page is the one thing a category line may never be.
  Worth 5 confidence: the word is the title's, the name is only the channel's.
- **A host INVITING a guest is two names, not one** (2026-08-21, same report) -
  `mdbTitleGuestConnectors` in `title_definitions.js`, read by `mdbTitle_takeGuestConnector`
  in the parse and mirrored in the chunk split (`mdbTitle_guestConnectorParts` in
  `mdbTitle_traceChunks`), the way "presents" is. Read as one chunk the wiki was asked about
  "Bassiani invites Victor" - a name that cannot exist - while "Victor", an artist it knows
  with 10 mixes, was never asked at all, and the club (a venue it knows) took the artist slot.
  The verb becomes a " | " in the parse text rather than being dropped: the two would
  otherwise glue into "Bassiani Victor". mdbTitleGuestMarkers' one-directional sibling - there
  the phrase NAMES the thing and the artist may stand on either side of it, here the word is a
  verb and the sides are settled.
  **The fences are the whole rule**, because "<Name> Invites" is a party's or a series' own
  name two dozen times over on MixesDB ("Secret Cinema Invites", "Yax Invites 166",
  "Input Invites Podcast 1"): whitespace on both sides of the word, a name in front of it
  inside the same chunk, and behind it a name that is neither a number nor a series word.
  A separator right behind the word is what most of those real names have, and it alone rules
  them out.
- **A "#"-numbered episode blocks the wiki's VENUE reading** (2026-08-21, same report) -
  `mdbTitle_takeVenueTitle` steps aside where a bit of the title writes a marked episode
  number. The same call the "@" rule makes ("Colossio @ Melodic Therapy #217"), and needed
  here because the split above made "Bassiani" a bit of its own: the club is a venue MixesDB
  knows, so 3g read the podcast episode as a set played at the club. No place is on episode
  323. An EVENT is deliberately left alone, exactly as it is there - an event numbering its
  editions is still the place a set was played at.
- **A series word standing in ANOTHER bit than the channel name still names the show with it**
  (2026-08-21, same report) - step 5a2 of `buildMixesdbTitle`. "HATE Podcast 496" grows the
  show in `mdbTitle_takeShowOutOfTitle` because the two words are adjacent; "Bassiani invites
  Victor / Podcast #323" writes them a chunk apart, and the episode cut then takes the word
  out of the title along with its number, leaving the bare channel name as the show. Which bit
  the uploader put the word in says nothing about whose series it is. Same fences as the
  adjacent case: not for a mapped channel, not onto a show that already carries a series word,
  and not for a word that only COUNTS (`mdbTitleCounterWords`). Costs nothing - the word is
  the title's own and the channel name stands in the title too.
- **"#" is never sent** - `mdbTitle_lookupCategories` writes it out (`X #12` asks as `X 12`):
  the character is illegal in a wiki title, so a name carrying one can only answer empty.
  Sits in the one funnel both lookup rounds pass through, so an edited title's names are
  covered too.
- **Our own markers are never sent** - `mdbTitle_dropMarkers` takes the " (Promo Mix)" and the
  " (Live PA)" off a name first. We write those into a title to say something about the
  RECORDING; no category is called that, so `Unedited (Promo Mix)` could only answer empty.
  Reported on `DJ SPUN | UNEDITED | 07.31.26 | Part 1`, where the title and both categories
  were right and the wiki was asked about a name that cannot exist: the artists' side had
  dropped the marker from the start, but the entity read back off a finished title
  (`mdbTitle_titleCategories`, the source of the panel's re-lookup after an edit) kept it. The
  strip sits in the same funnel as the "#" rewrite, so no round can ask for one, and in
  `mdbTitle_titleCategories` on top, so the name whose ROLE and ORIGIN the panel records is the
  same name that is asked about.
- **Every name is sent COMPOSED, and the whole parse works in that form** (2026-08-22,
  reported on `4AM Records - Milan Hermess | HÖR`) - `mdbTitle_nfc()` puts Unicode's NFC on the
  player title, the channel name, the description, the edited title field and every name that
  goes into the request. SoundCloud writes `HÖR` DECOMPOSED, as an `O` with a combining
  diaeresis behind it (U+004F U+0308) rather than the single U+00D6 MediaWiki stores - the two
  look identical and are different strings, and all three layers broke on it at once: the
  decomposed name counts four characters, so `mdbTitle_isShortAcronym` did not know the
  three-letter acronym for one and re-cased it to `Hör`; `mdbTitle_normalizeCompare` keeps the
  bare `o` of the pair where it drops a composed `ö` whole, so one name had two cache keys;
  and `api.php` warns `non-normalized data`, answers anyway and echoes the name COMPOSED, so
  its answer was cached under a key the asker never read and `Category:HÖR` (665 mixes) came
  back as "no category of this name". Nothing here is about CASE - the module matches
  case-insensitively by contract, and `hör`/`Hör`/`HÖR` all find it once they are asked in the
  form the wiki stores. The composed form sits in `mdbTitle_spaced()`, the one rewrite the
  title and the channel name pass through on every entry point, so no path can skip it.
  **And an accented letter is FOLDED to its base letter in `mdbTitle_normalizeCompare`**, not
  dropped: the strip keeps `a-z0-9` alone, so the composed `HÖR` compared as `hr` - which is
  Croatia's code on `mdbTitleCountries`. `mdbTitle_isCountry` said yes, `mdbTitle_placeGroupNames`
  threw the name out of every place group, and `2026-05-09 - Scuba @ HÖR, Berlin` - the wiki's
  OWN page title - read back as a title filed under nothing. Folding is also what a reader means
  by "the same name", and how the description of that mix writes it ("Played some records at
  HOR"). A letter with no decomposition (`Ø`) is dropped as before.
- **A denied name is asked again in its other SPELLINGS** (2026-08-23, reported on
  `EG AFTER.189 Paco Wegman`, channel `EG`) - `mdbTitle_lookupVariants()`, fired from
  `mdbTitle_lookupCategories`'s own success handler for every name that came back empty, one
  request for all of them, exact mode, and the callback waits for it. MixesDB files that show
  as `Category:EGAFTER` with 110 mixes in it, the title writes it with a space, and the module
  matches character for character (case aside), so the exact round asked a string that cannot
  exist and the page was about to open a second, empty category next to the series. What is
  asked are the spellings `mdbTitle_normalizeCompare` ALREADY calls the same name - the glued
  form (`EG AFTER` -> `EGAFTER`, two or three segments at most: `Live At Fabric London` glued
  is a string nobody typed), the separators written as spaces and written away (`R.E.M.` ->
  `R E M` / `REM`) and a glued name split where its own case says the words end (`EGAfter` ->
  `EG After`); `mdbTitle_spellingVariants`, capped at `mdbTitle_maxSpellingVariants` per name
  and sent rank-major, so a full request does not spend itself on the first name's third guess.
  **No cache of its own and no new trust**: a variant normalizes to the very key the denied
  name reads, so the answer lands where the reader looks and `mdbTitle_canonicalName` respells
  the title to the wiki's version of it - this only makes the SERVER agree with the comparison
  the builder already runs everywhere. Nothing empty is ever written over an answer that key
  already has. A LONGER or shorter name stays the row's prefix round alone (hints only, never
  the builder's cache); this round asks the SAME name. The panel's section 3 and the report's
  `## Lookups` lines say `also asked as "..."` where the second round found nothing either, so
  a name asked twice never reads like one given up on.
- **All matches per name are kept**, because one name is legitimately several things:
  `fabric` the venue and `Fabric` the artist. Readers ask by type (`mdbTitle_knownMatch`);
  a name the wiki knows as podcast/show/radio (`mdbTitle_knownEntityType`) is never
  "(Promo Mix)" and never charged the "not in the known-shows list" doubt.
- **A place group files the page under EVERY name the wiki has** (2026-08-20, reported on
  "Lord Of The Isles at Far Blue @ Noordspace"): the created page carried `Category:Far Blue`
  alone while MixesDB has the venue behind the comma, `Noordspace`, as a category of its own -
  and MixesDB files such a page under both (`2026-05-23 - Dosem @ Anjunadeep, Ritter Butzke,
  Berlin` carries the party AND the club). `mdbTitle_titleCategories` returns `entities` for
  it, every part of the group in title order (`mdbTitle_placeGroupNames`: a slot part and the
  group's country drop out, the CITY does not), next to the unchanged `entity` - which stays
  the ONE name the parse picked and the one every analysis keeps running on
  (`mdbPageCreator_recentAnalysisFor` and its two gates, sections 5 and 7, the chip's stale
  drop). `mdbPageCreator_entityCategoriesFor` turns that into the filing: the picked name
  whether or not the wiki has it - a venue new to MixesDB gets its category created together
  with the page - and every FURTHER name only where the lookup answers venue or event FOR THAT
  EXACT NAME (`mdbPageCreator_placeMatch`; the qualifier match `Utopia` -> `Utopia (Event)` is
  the wiki's other Utopia, not the Berlin one the title means). That is what keeps the city out
  without a city list - no city is a category - and it is why the city IS asked about: its
  empty answer is the only thing that tells it from the venue standing next to it. Everything
  downstream reads the entries, so the page text, the "Used categories" chips, the report's
  "Entity category:" lines and section 6 can only say the same thing; the second entry carries
  its own "why" sentence, since no branch picked it and the pick's sentence is about the other
  name. A sibling page's own second entity is skipped in the style vote for the same reason the
  first one is (`mdbPageCreator_recentPageTextFindings`).
- **A category's OWN PAGES say whether its name is a place, where the type cannot**
  (2026-08-22, second report on "4AM Records - Milan Hermess | HÖR") - `mdbTitle_placeShape()`
  reads the `recent` titles the mdbnames answer already carries, like `mdbTitle_seriesIdPrefix`
  does for an episode-id scheme, and answers `{ city }` where they write the name behind the
  `@`. `Category:HÖR` is filed under `Category:Radio` and so is `Category:NTS Radio`: the first
  is a Berlin studio whose pages are all live sets (`2026-05-09 - Scuba @ HÖR, Berlin`), the
  second a station whose pages are written as the show (`2026-04-03 - Ruf Dug - NTS Radio`).
  The word "radio" cannot tell them apart, the pages can, and they are the wiki's own titles
  rather than an inference about them - so this costs no confidence, exactly like the id
  scheme. `mdbTitle_takeVenueTitle` asks it LAST, behind the venue and the event rounds, so a
  name the wiki really types as a place is never decided by its pages, and the type it did
  answer is carried out as `byPages` - the panel may not tell its reader "venue" about a name
  the wiki calls a radio. Two pages at least and a MAJORITY of them, so one live-filed guest
  set does not turn a show into a place. **The CITY comes from the same evidence** and only
  where the title itself writes none: `@ HÖR` stands on no MixesDB page. Read off what stands
  right behind the name in each group and only where `mdbTitleCities` backs the word - a group
  closes with its town, so a name behind the place that is no city is another place
  (`@ 15 Years aufnahme + wiedergabe, HÖR, Berlin`). Never behind an EVENT, whose group carries
  a country and not a town.
  The same report is why that branch no longer drops a bit silently: it writes ONE artist, the
  place and its city, so a title naming a fourth thing (`4AM Records`, the label whose night it
  was) lost it without a word. `mdbTitle_placeBitDropped` costs 3 points and comes back as a
  `placeTail` chip - the same kind, because the rewrite IS the same: the words go in front of
  the place, which is where MixesDB writes the night a set was played at.
- **A place group is split by ONE function, and the "," is not its only separator**
  (2026-08-22, reported on "Karotte @ AYLI X OURS Frankfurt 07-08-2026"):
  `mdbTitle_placeGroupParts` returns the group's names in title order, each with the separator
  that stood in front of it, so joining the two fields back reproduces the group verbatim.
  Three separators, and the last two are new: every comma (behind the "@" a group lists an
  event, a venue and a city and nothing else, so the artist-list reading a comma has in FRONT
  of the "@" cannot stand here), an " x " naming two places that shared the night
  (`mdbTitlePlaceJoinerWords`), and a CITY glued to the end of a part - the "," the uploader
  left out (`mdbTitle_cityTail`). Every reader works off it: the chunk split
  (`mdbTitle_traceChunks` behind the "@"), the offered categories
  (`mdbTitle_placeGroupNames`), the picked entity (`mdbTitle_placeGroupEntity`), the comma the
  exit writes in (`mdbTitle_commaOffCity`) and the respelling
  (`mdbTitle_canonicalPlaceGroup`) - which is what stops the chunks, the lookup and the title
  from drifting apart the way section 1 and section 2 once did. Read as one name the wiki was
  asked about "AYLI X OURS Frankfurt", which can only answer empty, while "OURS" - an event it
  knows with 4 mixes - was never asked at all.
  **The city cut needs no wiki answer and is the one thing on `mdbTitleCities` that CHANGES a
  title**, so it is fenced by the list alone: longest city match wins ("Frankfurt am Main" is
  never cut to "Main"), something has to be left in front of it, and a part whose city already
  stands behind it as its own part is the group written right ("@ Sisyphos Berlin, Berlin").
  The risk it takes is a venue named after its town, which is the risk the list already ran
  behind a comma - and the words all stay in the title either way, only the name's end moves.
  **The " x " is the only joiner read here.** The "&" stands inside place names far too often
  and where it really joins two places the title reads right either way -
  "Brotfabrik & k²0 Open Air" was reported and accepted as ONE name, and that case still has to
  pass. In FRONT of the "@" the same letter joins two ARTISTS and is rewritten to "&"
  (`mdbTitleArtistSplitJoiners`); behind it the word is kept as the uploader typed it, because
  MixesDB writes it that way.
- **A QUALIFIED answer is this title's only where the place group's own city says so**
  (2026-08-22, same report) - `mdbTitle_qualifiedPlaceMatch`, read by the exit's
  `mdbTitle_canonicalPlaceGroup` and by `mdbPageCreator_placeQualified` at filing time. MixesDB
  tells two places of one name apart in the CATEGORY title, and one name legitimately answers
  with several: `Utopia` comes back as `Utopia (Event)`, `Utopia (Las Vegas)` and
  `Utopia (Turku)`, `As You Like It` as the Frankfurt event and the San Francisco one. Only the
  rest of the title can pick, and the place group is where the answer stands - so a qualified
  answer counts when its bracket holds a city or a country the GROUP itself carries, and
  otherwise not at all. That is what keeps `mdbPageCreator_placeMatch`'s old refusal intact: a
  title naming Berlin matches none of the three Utopias and files under the name it carries,
  exactly as before. A type word in a bracket ("(Show)", "(DJ)") can never be a city, so those
  answers stay the knowledge they always were.
  **The TITLE writes the bare name and the CATEGORY writes the bracket** - the one place where
  the two are deliberately spelled differently. MixesDB's own pages say so
  (`2016-11-19 - Karotte @ As You Like It, Frankfurt` sits in
  `Category:As You Like It (Frankfurt)`), and `mdbTitle_bracketedMatch` is what lets the rest of
  the row read such a name back: it was never asked about WITH its bracket - the lookup sent the
  bare name and the wiki's qualifier rule answered - so the answer sits under the bare key, and
  without it a category the page really joins renders as a red chip standing next to itself.
  `mdbPageCreator_recentAnalysisFor` picks the same way, and that is the half worth watching:
  without it the sibling pages read for a Frankfurt gig were the San Francisco event's, because
  that answer holds ten times the mixes and the server ranks it first.
  **The wiki cannot answer for "AYLI" yet.** `Category:AYLI` redirects to
  `Category:As You Like It`, a disambiguation page with no type, and `mdbnames` drops a typeless
  redirect target before its qualifier rule runs - so the name comes back empty and the
  abbreviation stays in the title. `mixesdb_api_request.md` §12 is the ask; everything else in
  the report works without it. Do not build a client-side way round it: `match=prefix` cannot
  find "As You Like It" behind "AYLI" either, and a second `action=query&redirects=1` per
  unanswered name would cost one request per player page.
- The module takes **10 names max** per request - the candidate list is priority-ordered
  (channel first) and truncated, not split into a second request.
- **A non-artist match then reads the ~10 newest mix pages in that category and copies their
  format** (built 2026-08-18, roadmap step 4 - `mdbPageCreator_recentFetch()` +
  `mdbPageCreator_applyRecentToSuggestion()`), rather than deriving it. `generator=categorymembers`
  with `gcmnamespace=0&gcmsort=sortkey&gcmdir=desc` - a mix page title starts with its date, so
  the sortkey is the date. NEVER
  `cmsort=timestamp`, which sorts by when the page was added to the CATEGORY and floats every
  re-saved old page to the top (that was our own spec's mistake until 2026-08-18, and it is what
  the `recent` field of `mdbnames` was built to - so `recent` misses the newest pages until the
  endpoint is changed; `mdbPageCreator_usedCatFetchRecent()` asks correctly, and the analysis
  fetch writes its sortkey-true titles back onto the match's `recent`, so the hints bar heals
  too). **The sortkey order is taken from the API, never rebuilt from the titles**: the
  generator's order does not survive the response (`query.pages` comes back in pageid order,
  with no index to restore it from), so the same category rides along in the same request as a
  plain `list=categorymembers`, and `query.categorymembers` is the order the wikitext is filed
  into. A title sort would look like date order and quietly mis-file every page carrying a
  manual sortkey - `2023-09-18 - Dan Andrei @ Sunwaves 31, Romania (Trommel.220)` is filed at
  its release date 2025-05-30 and belongs among the 2025 episodes. For the same reason
  `mdbPageCreator_usedCatRecent()` never SORTS `recent` - it only turns it round, so the chip
  reads oldest first the way a category page does, the newest page at the bottom.
  Reading those pages is what settles episode
  number padding (`Zenaari Mix 025`), separators (`Trommel.234`), formats no rule would invent
  (`RA Podcast (RA.1051)`), whether there is a number at all (`Essential Mix`), the name's
  spelling as the titles write it, and the city of a
  venue or event (`@ Ritter Butzke, Berlin`) - which otherwise is taken from the player title and
  is usually simply missing. A rule needs 90% of the pages, or all of the unanimous newest 5
  where the older ones disagree - newer pages take precedence, because conventions change:
  `Slave To The Rhythm` renamed its episodes from
  `Ep.393` to `716` over the years, so even the 10-page sample can straddle a rename. Only the
  SUGGESTION is ever rewritten, never an edited title, and a refinement whose entity would file
  under a different category is dropped. Bucket categories (`mdbPageCreator_bucketCategories`,
  "Promo Mix") are skipped everywhere - their pages are no siblings.
  **The city is learned this way and the VENUE deliberately is not** (settled 2026-08-22, on
  the AYLI X OURS report): the city is a property of the event, the venue is a property of one
  EDITION of it. `Category:OURS` writes "Sparta Schwimmclub" on all four of its pages and the
  two events still pair up somewhere else the next time, so a venue the siblings agree on says
  nothing about the night being filed - and a wrong venue in a title is a wrong place, not a
  missing one. Asked for in the report and taken back by the reporter the same day; do not
  build it because the numbers look unanimous.
- **Two gates decide whether the recent pages are this mix's siblings AT ALL**, and where one
  bites nothing is read - not the title format, not the page text, not the shared categories
  (`mdbPageCreator_recentAnalysisFor`, both reported 2026-08-19 on the DEEP & HAZY /
  Undercurrent mix, where the analysis had run on a category that is neither):
  - `numbered-place`: the TITLE numbers the entity ("Undercurrent 5" -
    `mdbPageCreator_entityIsNumbered`) while the wiki knows the name as a venue or an event.
    A series numbers its editions and a place does not, so the two are different things
    sharing a name. Checked before the fetch, since it needs no pages.
  - `stale`: the category's newest page is more than `mdbPageCreator_recentMaxAgeYears` (3)
    older than the mix (`mdbPageCreator_recentStaleBy`, off the newest title's date - the
    pages arrive newest first). Undercurrent's newest page is from 2015 and the mix from
    2026: eleven years of nothing say the conventions are dead and the category may not be
    this mix's. Only this direction - siblings NEWER than the mix are the normal case for an
    old recording added today. Checked after the fetch, so `info.entry` is nulled with the
    verdict and every reader of it finds nothing whether or not it thought to ask about skip.
    **Unless the pages PROVE the category is this mix's** (`mdbPageCreator_recentProvenOwn`,
    2026-08-20, the DSS report): the gate doubts WHOSE category this is as much as how
    current it is, and evidence answering the first makes dropping it for the second wrong -
    Category:Deep Space Series' newest page is from 2016 while the mix is episode 140 of the
    same series on the same channel, so the gap says the wiki stopped keeping up, not that
    the pages are somebody else's. Two proofs, both off pages already fetched: their titles
    carry the very episode id this title does (works on every site - it compares the title
    against the wiki), or their wikitext links this mix's channel (needs `channelUrl`).
    Neither claims the CONVENTIONS are current; where those disagree the 90% vote decides as
    always. `info.staleKept` keeps the lag so the panel's "Read:" line can say why pages that
    old were read, and the chip's dormancy drop goes with the verdict. Undercurrent is
    untouched by it: no bracketed id in the title, and its 2015 club nights link no
    SoundCloud channel of the mix.
  The entity CHIP says the first one too, in its tooltip: the category exists, so the chip is
  green, but the page would join that venue's category and only the editor can tell whether
  that is right.
- **The entity category's pages LINKING the mix's channel is the one signal that RAISES the
  fit score** (2026-08-20, the DSS report's "choice hardening"): the sibling wikitexts the
  recent-pages fetch already holds are searched for the uploader's channel URL
  (soundcloud.com/deep-space-series standing in a `{{Player}}` is the pages themselves saying
  whose series the category is, which no name match can). The URL arrives as the `channelUrl`
  option of `mdbPageCreator_add()` - NEVER derived from `playerUrl` in shared code, since how
  a site's URLs nest is site knowledge: SoundCloud passes `t.user.permalink_url`, TrackId.net
  deliberately nothing (a trackid.net page's uploader is not the mix's channel). A hit is +15
  on `mdbPageCreator_categoryFit` (the percent clamp keeps the ceiling at 95) with its own
  "What backs it" tooltip line, and section 7 opens with a "Channel link" row. Presence is
  the ONLY signal - absence proves nothing (older pages, other platforms, a series that
  moved hosts) and charges nothing, nowhere. Computed fresh per call off the current
  `channelUrl` (`mdbPageCreator_channelLinkFinding`), never baked into the per-category
  findings cache, which outlives the page and would answer the next channel's mix with this
  channel's evidence.
- **What the sibling pages SHARE is written only where MixesDB calls it a STYLE**
  (2026-08-20; the vote itself is signal C, unchanged at 90%). The vote answers "what do these
  pages have in COMMON", which is not "what does this mix sound like", and Category:Undercurrent
  shows both halves at once - its 10 newest pages carry Techno 5, House 3, Tech House 2, so no
  style clears the bar, while `Amsterdam Dance Event` stands on all 10, because the venue's
  MixesDB pages are sets from four different ADE editions. Between 2026-08-19 and 2026-08-20
  that made the whole finding a hint and nothing was written; reported back on
  `Amplify Series 138`, whose category carries `Techno` on 10 of 10 and whose new page still
  came out with two blank style rows.
  So the split is not guessed, it is KNOWN: all 111 members of `Category:Style` are baked in as
  `mdbPageCreator_knownStyles` (fetched 2026-08-20 - the vocabulary is essentially static), so
  the usual case costs no request. Only a winning name NOT on that list still asks the API -
  `mdbPageCreator_styleCatFetch()`, one `prop=categories&clcategories=Category:Style` request,
  cached per name in `mdbPageCreator_styleCatCache` - which is what catches a style added after
  the snapshot; and `mdbPageCreator_recentLearnedCategories()` splits the
  winners on the answer: a name the wiki files under `Category:Style` goes into the page's style
  lines (at most two; the blank rows behind them are a spare to type into, not a shape to fill:
  one blank where the tally shows further styles on single pages - `otherStyles` in the split -
  no blank where the siblings use nothing else, and the plain two where nothing was written at
  all; asked for on 2026-08-20), everything else stays the
  HINT it was - `mdbPageCreator_recentHintCategories()` feeds the bar's "Hints:" row (chip + a
  note saying which pages it came off) and the block closing section 6, where the same lines are
  plain text. Pending and failed answers write nothing: only "yes" writes.
  The written style chip is a PLAIN grey one on the "Used categories" row, like `Promo Mix` and
  the year (asked for on 2026-08-20, after a first cut made it green and linked): it is a
  category the page gets like every other on that row, and the row's colours answer "could the
  wiki spell this differently", which is not a question about a style. What it must keep doing is
  say where it came from - its tooltip (`mdbPageCreator_plainCategoryNote`) and the panel's
  category row name the pages it was learned off, because a filing the editor did not make has to
  be traceable.
  A rejected first attempt is worth recording, so it is not built again: classifying the learned
  name with `mdbnames` (it answers empty about `Techno`/`House`/`Deep House` and with a type
  about `Amsterdam Dance Event`) and writing the ones that came back EMPTY. Same request cost,
  but it infers a style from silence - a name MixesDB simply does not have yet reads as a style
  and gets filed. Asking `Category:Style` has the wiki say what the name IS, which is the same
  question the editor would ask.
- **The same call also brings those pages' wikitext, which shapes the new page's text**
  (`mdbPageCreator_recentPageTextFindings()`, applied in `mdbPageCreator_pageText()` /
  `_categoryEntries()`) -
  `{{StandardShow2h}}` instead of the file details table (only when the player duration roughly
  fits its stated length, ±30%), the leading
  `[[File:<literal title>.jpg|right|360px]]` in the extension the siblings use, the
  `== Notes ==` section (signal D, 2026-08-19) and the shape of the `{{Player}}`
  (signal E, 2026-08-19). Design and
  measurements in
  `page_text_learning.md` - its deltas section says where the built version deviates from the
  plan and why. The 90% style vote is still counted (measured: it fires on 1 category in 9)
  but fills nothing - see the bullet above - and `Tracklist:` is never learned from the
  siblings at all: it describes the page's own tracklist, which is what the section above
  decides. That file says why.
- **The `== Notes ==` section is written EMPTY, and filled only from the description**
  (signal D, 2026-08-19). Two votes at the usual 90%: does the series carry a Notes section at
  all, and which HOST do those sections link (`mdbPageCreator_notesBody()`,
  `mdbPageCreator_urlHost()`). The first one writes the heading with a blank line under it -
  a heading that is already there gets filled far more often than one the editor has to type -
  and the second is only a search key: `mdbPageCreator_recentNotesUrl()` looks through the
  player page's description (`mdbPageCreator_description`, handed over by
  `mdbPageCreator_add()`) for a link on that host with at least
  `mdbPageCreator_notesUrlMinPath` characters of path behind it, and writes it verbatim or
  nothing. The length bar is what separates the episode's own page from the magazine's front
  page, which half the descriptions link as well. **No URL is ever constructed** - a slug is
  not derivable from a title, and a wrong link in Notes is worse than an empty line. The two
  votes are separate on purpose - Essential Mix pages carry a Notes section holding nothing but
  `Episode #1671`, so the section is its convention and no host is.
- **Two texts are searched, not one** (`mdbPageCreator_notesSources()`): the description, and
  the site's "Buy" / "Free download" field (the `purchaseUrl` option - SoundCloud's
  `purchase_url`, unwrapped from `gate.sc` by `scPurchaseUrl()` before it is handed over). The
  second is one URL an uploader set deliberately, so it is filled on tracks whose description
  names nothing, and every Groove Podcast episode carries its `bit.ly` in it. Both are searched
  by the same rule and both can hold a shortened link. `purchaseUrl` is NEVER written to the
  page as itself - it is a place to look, not a value.
- **`{{Player|mode=mirrors}}` is written with the mirror line EMPTY where the series uses it**
  (signal E, 2026-08-19). `mdbPageCreator_playerRead()` reads the first `{{Player}}` of each
  sibling as `mirrors` / `plain` / `other` / `none`, the usual 90% vote decides, and only
  `mirrors` writes anything (measured: it fires on `Groove Podcast`, `HATE Podcast`,
  `RA Podcast` and `XLR8R Podcast`, and abstains on everything else, incl. `Boiler Room` at
  8/10). The page creator only ever has the one URL of the player page it sits on, so the
  second line is left open for the editor - and MixesDB answers an open slot with
  `No value for one of the players!` instead of a player, which is the point on a series where
  all ten newest pages carry the mirror, and is why the reasoning panel's Player row names that
  box. Two rules around it, both verified against the live parser: the URL goes on the line its
  HOST stands on in the siblings when every mirror page agrees (`RA Podcast` has Apple Podcasts
  first and SoundCloud second, so there the first line is the empty one), and a URL holding a
  `=` is written as `|1=URL` with every line of that template numbered - unnumbered, MediaWiki
  reads the part in front of the `=` as a parameter name and the player renders `{{{1}}}`.
  `video=audio` and `mode=multi` are deliberately not learned, see `page_text_learning.md`.
- **A SHORTENED link in the description is followed, and only on SoundCloud** (2026-08-19).
  Groove Podcast writes "Go to bit.ly/BRCPod for track list" rather than the `groove.de` URL its
  own Notes sections carry, and that bit.ly is a plain 301 to exactly the page that belongs in
  Notes - so the direct search alone would have missed the series the signal was built for. No
  `$.ajax` can read it (a shortener's 301 sends no `Access-Control-Allow-Origin`: cors is
  blocked before the redirect, no-cors comes back opaque), so it takes `GM_xmlhttpRequest` -
  **a grant of the SITE script, which is why nothing in `/shared/` may call one**. It arrives
  as the `followRedirect` option of `mdbPageCreator_add()`; a site that passes none keeps the
  empty section, which is what TrackId.net does on purpose (it ships with no `@grant` line at
  all, and adding one would move it into Tampermonkey's sandbox). SoundCloud's implementation
  is `scFollowRedirect()` in its `script.funcs.js` - **not** `api_funcs.js`, which TrackId.net
  `@require`s. `mdbPageCreator_notesShorteners` and SoundCloud's `@connect` list have to name
  the same hosts: missing there costs the reader a permission dialog, missing here means the
  link is never followed. Whatever comes back is a CANDIDATE - it goes through the same
  `mdbPageCreator_notesUrlIn()` rule as the description, so a redirect leading anywhere but the
  host the siblings link writes nothing. Design and the four gates in front of the request in
  `page_text_learning.md`.

### Roadmap

The one place the order of this work is written down. Every design decision lives in the plan
file named on the line, not here.

The order is the one decided on 2026-08-16 (README's Roadmap section is the human-readable
mirror of this table - keep the two in step):

| # | Work | Plan file | State |
| --- | --- | --- | --- |
| 1 | Category lookup rework: case-insensitive, all types, canonical spelling into the title | `mixesdb_api_request.md` | **DONE 2026-08-16** on the live `action=mdbnames` |
| 2 | Double-check info in the row: category links + family via `match=prefix`, sibling titles recent + around the mix date | `row_enrichment.md` §1-2 | **category links DONE 2026-08-18** as the hints bar (`mdbPageCreator_renderHints()`) - the artist and entity categories as green/red chips (a red name searches MixesDB, marked by a loupe), off the answers the title lookup already has. Since 2026-08-19 the line names EVERY category the page text writes, in its order: the year, the styles, "Promo Mix" and the `Tracklist:` filing ride along as plain grey chips without link or count (verdict `plain`, `mdbPageCreator_plainCategoryNote()`) - they are no name the wiki could spell differently, but leaving them out read as if the page did not get them. An artist or an entity is still required for the line to appear at all. **Recent siblings DONE the same day**: the lookup asks `recentlimit=10` - since 2026-08-19 the server attaches `recent` to EVERY type, artists included, and sorts it by sortkey, so the chip usually needs no request of its own - `mdbPageCreator_usedCatFetchRecent()` is the fallback for the chip clicked before its pages are in (a name edited into the title is answered a moment before them), and the chip stands open on a waiter while it runs - and every green chip's mix count toggles the pages open, ONE chip at a time since 2026-08-19 and in a box hung UNDER the chip since the same day (CSS-only: the list stays the chip's child, `position:absolute` off the chip - the chip keeps its exact size, so the line never moves, and the box lies over what follows until folded shut; inside the chip it dragged the line apart, as a full-width row it tore chip and list into two unrelated things) (on desktop the chips' links open a MixesDB modal, `mdbPageCreator_modalOpen()`, prefetched - and since 2026-08-19 the arrow keys step it through every link the bar has on screen, `mdbPageCreator_modalStep()`). **The prefix round's first cut DONE 2026-08-20** as the "Similar:" row (`mdbPageCreator_prefixEnsure()` / `_similarCategoriesHint()`): the bar's RED names are asked once more with `match=prefix`, one request for all of them, and the answers render as yellow chips directly under "Used categories" - hints only, in their own cache (`mdbPageCreator_prefixCache`), never the builder's; no similarity score (the used-cat percentage is a real fit score and a number here would pose as one); gentle thresholds as named constants (`mdbPageCreator_prefixMaxPerName` 3, `_prefixMinMixes` 2). The full family around a KNOWN name and the around-the-date window still open, fully unblocked - `match=prefix` + `matchedTitle` + `matchType` went LIVE 2026-08-16 (verified; row-only - the title builder stays on exact match; confirmed 2026-08-20 that it needs no `recentlimit`, and that a mid-word prefix can answer empty - the server matches at word granularity) |
| 3 | Duplicate protection: `insource:` mirror-URL check in the toolkit's player search, and the Create-click sanity check with the two-step "Yes, still create" button | `row_enrichment.md` §3-4 | open, nothing blocks it |
| 4 | Page text learned from siblings: episode number format, `{{StandardShow*}}`, lead image, shared categories at 90% | `page_text_learning.md` | **DONE 2026-08-18**: one `generator=categorymembers` + `prop=revisions` call per entity category (`mdbPageCreator_recentFetch()`, cached in `mdbPageCreator_recentAnalysisCache`), consensus at 90% with the unanimous newest-5 overriding a disagreeing sample (`mdbPageCreator_recentConsensus()` - newer pages take precedence). Feeds the SUGGESTION (`mdbPageCreator_applyRecentToSuggestion()`: episode format incl. zero-padding, the name as titles write it, the venue's city; never an edited title), the PAGE TEXT (lead `[[File:]]` with the literal title + the siblings' extension - the live recordings among the siblings do not vote on it since 2026-08-19, `mdbPageCreator_recentImageVote()`: their artwork is the event's, and 2 of 10 such pages cost Groove Podcast the artwork line all its episodes carry -, `{{StandardShow*}}` when the duration roughly fits, an empty `== Notes ==` section where the series has one, prefilled from the description where its Notes link a host the description names too, `{{Player|mode=mirrors}}` with the mirror line empty where the series publishes every episode twice - the 90% style vote fills a style line again since 2026-08-20, but only for a name MixesDB files under `Category:Style` - one `prop=categories&clcategories=Category:Style` request, `mdbPageCreator_styleCatFetch()`/`_recentLearnedCategories()`; every other winner stays the "Hints:" chip it was) and reasoning panel sections 5 + 7. `mdbPageCreator_bucketCategories` ("Promo Mix") is skipped everywhere, incl. the hints bar's "N mixes" toggle. Deltas against the plan file are noted at its top |
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

**The chips' fit score is NOT section 3's score** (`mdbPageCreator_categoryFit`, since
2026-08-19). Two different questions, so two different numbers, and mixing them was the whole
reason for building a second one: section 3 asks "is the wiki's answer about this NAME right"
(`mdbTitle_matchConfidence`), the chip asks "will the page be filed right". On the reported
DEEP & HAZY mix the first answers 95% about `Undercurrent` - the category really is spelled
that way and really holds 28 mixes - while the second has to answer badly, because the wiki's
Undercurrent is an Amsterdam venue and the title numbers its entity. So section 3's verdict is
the BASE, its reasons are carried over whole, and the fit signals come off it: the
numbered-entity/place conflict (-45) and a category dormant relative to the mix (-10, plus 3
per year over `mdbPageCreator_recentMaxAgeYears`, capped at -30) - the same two gates the
recent-pages analysis refuses on, read off the same `mdbPageCreator_recentAnalysisFor` (which
starts no fetch, so the render stays free of side effects). Measured: `Undercurrent` 50%,
a venue whose newest page is 12 years old 65%, `HATE Podcast` and `Leon` 95%.
**The tooltip closes with what the number does not cover** - whether the parse picked the right
WORDS - because that is the one thing neither score can see and a bare percentage next to a
category name implies it. Only the page's own categories get one: the "Hints:" row passes no
title and a hint is no filing to be confident about.

## The "Similar:" row (hints bar, since 2026-08-20)

The prefix round behind a name the wiki denied: once the exact lookup has answered EMPTY about
a name, it is asked once more with `match=prefix` - every denied name of this title in ONE
request (`mdbPageCreator_prefixEnsure`, fired from the two settle paths next to the recent
fetch, never from a render) - and what MixesDB has that starts like it renders as yellow chips
directly under "Used categories" (`mdbPageCreator_similarCategoriesHint`). Settled, so it does
not get re-litigated:

- **Hints only for the BUILDER, always** (2026-08-20): the answers live in
  `mdbPageCreator_prefixCache` and never reach `mdbTitle_categoryCache` - with prefix matches
  in there the builder would read "Dekmantel" as a podcast and the exact-match discipline
  would be undone from the server side (row_enrichment.md: "The row uses prefix mode. The
  title builder NEVER does"). That half stands and is not up for discussion.
  What DID change is the row's own use of them - see "Writing the similar category into the
  title" below. The route back was named when the rule was written ("when i later often end up
  on examples 'why didn't we use that related cat' i'll get back on the earlier route") and it
  was taken on 2026-08-23. The discipline survives it because the promotion happens on the
  FINISHED title in `page_creator.js`, never in a build: the promoted name then goes through
  the ordinary EXACT lookup like any name typed into the field.
- **Yellow, and no score of any kind ON THE BAR**: not green (the page does not get them), not
  red (nobody denied them), and the chips carry no percentage - the used-cat chips' number is a
  REAL fit score, and one here would dress the name resemblance up as one. The note behind
  each chip says facts instead: the type and the mix count. The reasoning panel's section 8 is
  the one place a number stands: `mdbTitle_matchConfidence`, the same per-answer score as
  section 3's, whose prefix branch charges the asked name being only the START of the
  category's - a diagnostic in a diagnostic surface, never on the bar.
- **Gentle thresholds, named so they are one edit away** (`mdbPageCreator_prefixMaxPerName` 3,
  `mdbPageCreator_prefixMinMixes` 2): at most 3 chips per red name, thin categories dropped -
  the API ranks by mix count already. Only `matchType: "prefix"` renders (an exact or redirect
  answer would have answered the exact round; a qualified one turns that chip green), never a
  name the bar already carries, and a failed request is not retried.
- **ONE walk decides shown-or-dropped for the bar and the panel alike**
  (`mdbPageCreator_prefixDecisions`, 2026-08-20): it applies the thresholds above in the
  row's order (the cap first - an answer the full cap kept the row from looking at claims no
  dedupe key) and records the verdict per answer with its reason. The row renders the
  survivors, the panel's section 8 the whole list - so the two can never disagree about which
  answer made the row, and "why didn't we see that related cat" is answered on screen.
- **The chips join the modal and its arrow-key walk** - `mdbPageCreator_modalLinks()` and the
  click interception read both category rows, in document order, which is the order the bar
  reads. Section 8 closes with the request as an "API call" link (kind `prefix`) - moved
  there from section 3 on 2026-08-20: nothing in 3 reads the prefix answers, and the link
  belongs where its answer is on screen.

### The second source of names: what the TITLE writes (2026-08-20, second round)

The first cut asked the bar's RED CHIPS, and a report walked straight through the hole in that:
`NTS - Sacred Pools - Toshiki Ohta - August 2026 (No Voice Over)` (SoundCloud, channel
"Toshiki Ohta") is built as `2026-08 - Toshiki Ohta - NTS Sacred Pools - No Voice Over (Promo
Mix)`, so its bar carries the year, the artist and "Promo Mix" - **the mix's own name stands in
no category slot on a promo**, `mdbPageCreator_entityCategoriesFor` returns the bucket alone.
The exact round HAD asked "NTS" (a chunk candidate) and been told no; nothing then asked it a
second way, and the wiki's `NTS Radio` - which starts exactly like it - stayed invisible. The
reporter's own fix was a wiki-side redirect `NTS` -> `NTS Radio`, which is the sanctioned route
while the row is hints-only; the row still has to be able to point at it.

So `mdbPageCreator_prefixMissingNames` returns two rounds of names, and both mean "asked, and
the wiki said no": the bar's red chips first, then the names the TITLE writes that are no chip
at all, read off `mdbTitle_lookupLog` (this page's asked names, original spelling). The fences,
each of which a case walked into while building:

- **Denied means denied as ANYTHING** for the second round - `mdbTitle_knownMatch( cache, name,
  null )`. These names stand in no category slot, so unlike a bar chip there is no role to hold
  the answer against.
- **Never asked is not denied**: a name dropped over the exact round's 10-name limit
  (`entry.skipped`) or one whose request died (`entry.failed`) is skipped - a chip reading
  "MixesDB has no category ..." about it would be a lie.
- **The title has to still write it**, as whole words (`mdbPageCreator_titleWritesName`, on
  `mdbPageCreator_nameWords`). A channel the parse threw away is no filing anyone is about to
  make. Word-wise and NOT on the normalized keys, which have no spaces left in them: "nts" sits
  inside "toshikiohtants" there and every short name would find itself somewhere. The wiki's
  prefix mode matches at word granularity too (row_enrichment.md §1), so both ends agree about
  where a name begins.
- **A bare NUMBER the title counts its edition with stays out** (`mdbPageCreator_isEditionNumber`,
  2026-08-23): "251" behind "Trommel 251" is the episode number the build already decided on, and
  it reaches this round the ordinary way - a bare-number chunk is a lookup candidate like any
  other, the wiki says no about it, and the title writes it. Asking what MixesDB has that STARTS
  with "251" can only answer with other series' episodes, which is why only the LOOSER round
  refuses it: the exact round's answer is about this very name and stays worth having. The digits
  are read off the ENTITY slot (`mdbPageCreator_editionNumbers`), where a MixesDB title writes its
  episode number - the two shapes `mdbPageCreator_entityIsNumbered` knows, a separator plus digits
  ("Trommel 251") and the bracketed ID ("RA Podcast (RA.1051)") - so a slot that is nothing BUT
  digits counts no edition and its name is asked as usual. "084" and "84" are one edition, the
  padding being how the series writes its number.
- **A name that OPENS one the bar carries stays out** (`mdbPageCreator_nameStartsName`): "HATE"
  next to a green "HATE Podcast" chip would ask a looser question about a filing the bar has
  already settled, and the family around a name the wiki KNOWS is a whole addition of its own
  that is not built (row_enrichment.md §1, the Dekmantel case). This is also what keeps the
  common, fully-green row from firing a request it never fired before - measured on the
  `HATE Podcast 496` and `Deep Space Series 004` fixtures.
- **The request caps at 10 names**, the module's limit like the exact round's, and the seeds of
  the dropped ones come back out of `mdbPageCreator_prefixCache` so a later call can still get
  to them.

`mdbPageCreator_similarCategoriesHint` walks that same list rather than the bar's entries a
second time - half of those names are on no chip - which is what keeps the row and the request
from ever disagreeing about what was asked. A name with nothing cached simply renders nothing.

A name the round REFUSES to ask about does not vanish with it: `mdbPageCreator_prefixMissingNames`
takes an optional `skipped` array, `mdbPageCreator_prefixDecisions` hands one in and appends what
came back as records with `status: "skipped"` and the sentence saying why, and section 8 prints
that sentence where it prints a status. The row itself never sees them - it renders shown answers
and these have none - and the request never carried them. A denied name leaving the round without
a word is precisely what that section exists to prevent.

The REPORT box is the one surface that does not list them (2026-08-23): `mdbPageCreator_reportSimilar`
drops every record that was never asked - `status: "skipped"` and the `"unasked"` ones that fell
off the 10-name limit alike. A report is what MixesDB was asked and what came back; a "not asked"
bullet in it hands the reader a name to wonder about and no answer to weigh, and the reason is
already on screen in the panel. Where that leaves the block empty it says so in one line rather
than standing under its heading with nothing.

### Writing the similar category into the title (2026-08-23, the route back)

Reported on `Dirtybird Radio 540 - Mitch Dodge`, channel `DIRTYBIRD`: the exact round answered
empty for "Dirtybird Radio", the prefix round found `Dirtybird Radio Show` (a show with 9
mixes) - and the suggestion still carried a name MixesDB does not have while the name it does
have sat on a yellow chip. That is the "why didn't we use that related cat" case the hints-only
rule named its own exit for, so the exit was taken.

The rule, in the maintainer's words: *the red cat should be used for an alternative title and
the similar category used as title - and in such cases always at least make an alternative
title with the similar cat.* Which is the same rule the curated channel names got the same day
(see the "Switch title" section): an existing category wins the suggestion, the closer reading
survives as a chip. Two functions carry it, both in `page_creator.js`:

- `mdbPageCreator_similarEntityFacts( title )` - the offers, as `entityName` facts in the exact
  shape `mdbTitle_result` emits, so the bar, `mdbPageCreator_altToggle` and the chip treat them
  like any other reading decided against. **Derived on every render, never stored**: they answer
  about the name the FIELD carries, and `mdbPageCreator_setTitle` - which the channel-URL round
  calls a second time - replaces the stored `mdbPageCreator_alternatives` wholesale.
- `mdbPageCreator_applySimilarEntity()` - the promotion, called from the prefix round's settle
  path (never from a render, like every other late answer), with
  `mdbPageCreator_applyRecentToSuggestion()` right behind it: the promoted name is a category
  that HAS pages, and their titles are where the episode number's spelling comes from. That is
  half the reason the existing category is worth writing at all.

Settled:

- **Entities only, never artists.** A category whose name merely starts like a person's is
  usually another person ("Ben" -> "Ben Klock"); a series written in full is the same series.
  A promo title asks nothing here either, and needs no fence for it: its entity entry is the
  "Promo Mix" bucket, which IS a category, so it never reaches the prefix round.
- **Exactly ONE offer gets written.** With two or three the row cannot tell which series this
  is, and picking the first would be a guess dressed as an answer. The chips already put every
  one of them one click away - which is the floor this never goes under: **the similar category
  is always reachable as an alternative title, written or not.**
- **The promotion is remembered** (`mdbPageCreator_similarPromoted`), because the walk that
  found it cannot find it twice: once the promoted name stands in the title, that name is a
  category, so it is no longer one of the denied names the round asks about - and the chip
  offering the way back would vanish with the answer it was built from. Same reason the builder
  keeps `mdbTitle_placeWordDropped` and friends. Reset per page, next to
  `mdbPageCreator_alternatives`.
- **The builder is untouched.** The prefix answers still never enter `mdbTitle_categoryCache`
  and no build ever reads one. What changes is a finished TITLE, in the row - and the promoted
  name then goes through the ordinary exact lookup, because writing the field fires the same
  `change` path a typed correction takes (`mdbPageCreator_queueCategoryUpdate`). So the chip
  that was yellow turns green off a real answer, not off the prefix one.
- **A full render, not just the bar**, where something was promoted: only `mdbPageCreator_render`
  writes a new suggestion into the field, and the bar alone would leave the old title standing
  over new chips.

## The channel-URL round (since 2026-08-23)

The lookup that asks about no NAME at all. Reported on the SoundCloud channel `EG en Español`,
which MixesDB has been filing as `Electronic Groove en Español Podcast` for 90 pages: the exact
round answers empty, the prefix round answers empty (`EG en Español` starts no category), and
no rule can spell one name into the other. The wiki holds the pair all the same, as a LINK -
`https://soundcloud.com/egesp` is the whole body of that category page - so the last question is
"which category page links this channel?", which `list=exturlusage` over namespace 14 (the API
behind `Special:LinkSearch`) answers in one request.

`mdbPageCreator_channelCatEnsure`, fired from `mdbPageCreator_add`'s lookup callback AFTER its
own tail (the recent fetch, the prefix round, the render) and from nowhere else. Settled, so it
does not get re-litigated:

- **It hardens the CHANNEL, nothing else.** A category linking the channel says whose category
  it is; it does not say this upload is an episode of it. So the finding is written as the
  runtime twin of an `mdbTitleUsernameConversions` entry - `mdbTitle_channelUrlShows` in
  title_builder.js, read in step 2 of `buildMixesdbTitle` right after the curated map and only
  where that one was silent (a hand-written entry outranks a lookup, an entry mapped to `""`
  included). Nothing is ever written into the title from the answer directly, and the category
  cache is NOT seeded under the channel's name: an answer filed under a name that is not the
  category's would paint chips for a category the page does not file under.
- **Only where THIS title backs it** (`mdbPageCreator_channelCatSupport`, five signals: the
  title writing the name, the category's pages numbering their episodes with the id the title
  carries (`mdbTitle_seriesIdPrefix` off the `recent` list the name lookup brought), that id
  spelling the category's initials, the channel and category names opening each other, a denied
  candidate opening it). Unbacked, the finding is reported and changes nothing - a channel can
  host a series and still upload a festival set. The support is re-run per TITLE while the
  answer is cached per CHANNEL: the second track of the same channel asks the title question
  again, not the wiki.
- **Two more fences.** Several linking categories that this title backs EQUALLY leave it alone
  (`ambiguous` - a channel with an artist category and a show category is exactly where only the
  title can pick), and a category MixesDB gives no TYPE is never applied (typeless means neither
  artist nor series). An ARTIST category carries `show: ""`: it says the channel is a person, so
  no show name grows from it - correcting the artist's SPELLING from it is not done and is a
  README limitation.
- **The gate is the half-miss, not the total one** (`mdbPageCreator_channelCatWanted`): the
  round fires unless the wiki answered for BOTH slots, artist and entity. `EGE.090 Adonis
  Rivera` resolves the artist perfectly and leaves the series to the raw channel name, which is
  the case it exists for.
- **Prefix bleed is filtered here, not in the query** (`mdbPageCreator_channelUrlIsChannel`):
  LinkSearch matches the path as a prefix, so `soundcloud.com/deep-space` answers with
  deep-space-helsinki as well. The needle (`mdbPageCreator_channelUrlNeedle`, shared with
  `mdbPageCreator_channelLinkFinding` so the two never disagree about which URL this channel is)
  has to end where a URL part ends. The query itself is `*.<needle>`, which takes the bare host
  and its subdomains the way Special:LinkSearch reads a target.
- **Two requests, and the second is the ordinary one**: what came back is asked about through
  `mdbTitle_lookupCategories`, so the found category arrives with its type, its mix count and its
  recent pages like every other answer and lands in the same cache - the entity chip, the recent
  fetch and section 3's chip all read it. Its chip carries the origin `channel URL`.
- **Surfaces**: the panel's section 3 closes with the `Channel URL:` block
  (`mdbPageCreator_reasoningChannelCat`) plus the `channelCat` API-call link, and the report box
  has `Channel URL:` lines under "Lookups" (`mdbPageCreator_reportChannelCat`). Both say why
  nothing was written where nothing was: not asked, nothing links it, unbacked, ambiguous,
  artist, typeless.
- **A title the editor has typed in is never rewritten** by the late answer, the same fence the
  recent-pages refinement stands behind. The rebuild is a full `buildMixesdbTitle` from the
  player title, never a patch of the finished one: step 2 reads the mapping, and everything
  after it follows from there.

## The "Switch title" line (hints bar, since 2026-08-19)

The readings the build DECIDED AGAINST, offered under "Used categories" as one full title per
line; a click swaps the chip with the title field, and the same slot then offers the way back.
`mdbTitle_result` emits the facts (`suggestion.alternatives`), `mdbPageCreator_switchTitleHint`
renders them. Settled, so it does not get re-litigated:

- **Facts, never finished strings.** A chip is a TOGGLE (`mdbPageCreator_altToggle`) applied to
  the CURRENT field text on every render. A pre-baked title would quietly undo the recent-pages
  refinement and every correction typed after the build - and the toggle is also what makes the
  swap replace in place: after a click the re-render derives the inverse into the same slot,
  with no stored swap state anywhere.
- **Only close calls get a chip** - a marker the build guessed about or refused to guess at,
  never one the title itself spelled out: a "(Live PA)" read from the DESCRIPTION (either
  written as a guess, or left off because the title read as a studio mix - the title's own
  marker is read, not guessed, and gets no chip), a "(Promo Mix)" that was assumed (4b/5c) or
  deliberately withheld (`mdbTitle_promoDeclined`: the channel-known-as-artist and
  numbered-series branches, where writing it would stack a guess on a guess). With several
  artists the Live PA chip is skipped like the marker itself: only the uploader knows whose
  set it was.
- **The title's own consumed "live" word opens the Live PA chip too** (2026-08-19, second
  round - reported on "Live@Elsewhere Loft July" and "Dualism Series #031 - alemiko *live",
  where no chip fired). `mdbTitle_applyJoiners` consumes the word on both paths - read as the
  " @ " joiner, or dropped as a trailing marker with no place to point at - and now returns
  `liveSaid`, which the build keeps as `mdbTitle_liveWordSeen`; only the BUILD's call sets
  the global, never the chunk split's. The word still never WRITES the marker (a DJ set is
  announced the same way - which is also why "dj set"/"dj mix", sitting on the same
  `mdbTitleLiveAtWords` list, must never set the flag: the consumed text has to say "live"),
  it only makes the reading worth offering - on live and studio titles alike, single artist
  only. `expectAlternatives` in `title_examples.js` guards it (kinds that must be present;
  the runner checks presence, not reason wording).
- **The room word taken off a venue is offered back** (2026-08-19, reported on
  "Live@Elsewhere Loft July"): the lookup rule above files the page under `Elsewhere` because
  `Elsewhere Loft` is no category, and the chip offers the room back into the TITLE. It is a
  reading, not a mistake - the wiki writes the room where it is worth naming
  (`2019-05-24 - Robert Hood @ Elsewhere Rooftop, NYC`, filed under Elsewhere all the same) -
  and only the uploader knows whether this set was one of those. Unlike the promo chip this
  one does NOT move the filing: `mdbPageCreator_entityCategory` runs the same reduction off
  the lookup cache (`mdbPageCreator_venueOfRoom`), so the page files under the venue either
  way, which is also what keeps an editor who types the room in by hand out of an empty
  category. The toggle works on the PLACE the fact names, never on the end of the title: the
  group can carry a city behind the venue, and the word belongs behind the venue itself.
- **The month stamp is offered back where the monthly naming replaced it** (2026-08-19,
  reported on "Ingo Sanger @ August 2026"): a title that dates itself with a month and names
  nothing else is written `<Month> Promo Mix` (`mdbTitle_monthOnlyName` at the single exit -
  the wiki has 149 of them), and the stamp kept as the mix's own name is the other spelling the
  wiki carries (`2016-07-30 - Guy J - Parallel Universe (August Promo Mix)` shows both at
  once). Both readings file under Promo Mix, so the chip moves the title alone. Kind
  `monthName`.
- **The slot of the night is offered back like the room word** (2026-08-19, reported on
  "Bee Lincoln - Rote Dichte 2026 - Obstgarten Closing"): 3g2 reads a chunk ending in one of
  `mdbTitleEventSlotWords` next to a chunk ending in a bare year as a set played at an event,
  and writes the group slot first, event last. The title reads just as well without the slot,
  and `mdbTitle_placeGroupEntity` steps over a slot part either way, so the chip moves the
  title and not the filing - the same deal the room word gets, toggled on the EVENT the fact
  names rather than on the end of the title. Kind `slotPart`.
- **The live reading of an "@" over a numbered episode is offered** (2026-08-20, reported on
  "Colossio @ Melodic Therapy #217 - Mexico"): such a title says "played there" and "this is a
  series" at once, `mdbTitle_atEpisodeSeparator` writes the series (a show counts its episodes,
  a place does not), and the chip offers the live half back. Kind `liveAt`, toggled on the
  ENTITY group at the end of the title, with `city` - the lone country 3h dropped - going back
  in behind the place, where a live title carries it and a series title does not carry it at
  all. The filing does not move: a place group files under its place and
  `mdbTitle_placeGroupNames` skips a country, so both readings put the page under the same
  name. The decision is charged (5) and says so in the reasons, and the date is a gig's in
  either reading - `mdbTitle_atEpisodeRead` is what the date step reads for that.
- **A candidate decided against in favour of an EXISTING category is offered back**
  (2026-08-23, the rule out of the third Rhythm Prism report). Where two names are in the
  running for the entity - one a category MixesDB HAS, the other standing closer to what the
  title actually wrote - the existing category wins the suggestion: it is what the page files
  under, and its recent pages are what the number's spelling is then learned from
  (`mdbPageCreator_applyRecentToSuggestion`). The closer reading is not thrown away for it. It
  becomes a chip, so the two are one click apart instead of one of them being invisible.
  The curated channel rule is the first case of it: a `mdbTitleChannelSeriesConversions` entry
  grows the words a title carries into the show the channel's episodes really file under
  ("Rhythm Prism by AKA AKA Episode #085" -> `Rhythm Prism Radio`), and the words the title
  wrote become kind `entityName`. `mdbTitle_curatedNameGrown` carries the fact, set in the
  conversion itself. Mechanics worth keeping:
  - **toggled on the NAME, not on a slot** - the entity group carries the episode number and
    can carry a "(Promo Mix)" behind it, so the name is the only fixed point in it
  - **the LONGER of the two names is searched first**, whichever it is: the curated show can
    hold the title's words ("Rhythm Prism Radio" holds "Rhythm Prism") and the words can hold
    the show ("Juno Daily - In The Mix" holds "Juno Daily"), and the shorter one always matches
    inside the longer. Searched with `mdbTitle_escapeReLooseSeparators`, the way the curated
    rule matches its own keys - the same name is written with a dash, an en dash, a colon or
    nothing at all
  - **the fact is only set where the rule really REWROTE the title.** A title spelling the
    curated name in full ("AKA AKA pres. Rhythm Prism Radio #053") matched it as its entry's
    LONGER candidate, so nothing was decided against and there is no second reading
  - **and the chip is only offered where the wiki ANSWERED for the curated name.** The chip's
    sentence calls it the category MixesDB has, which an unasked name cannot claim - which is
    also what keeps the chip off the first pass, where nothing has been asked yet
  - **the filing moves with it**, like the name credit's: a page's entity category is read off
    the title, so the switch is what puts the page under the title's own words
  - the curated words go into the fact as the map's KEY, not as the title shouted them
    ("DJ MIX"): a key is hand-written in the spelling a MixesDB title carries, and the chip
    writes it straight into the field
- **A chip may never propose a DIFFERENT PAGE, only a different title for this one.** That is
  the line every candidate reading is measured against, and it is what rules out the dropped
  chunks of 1c - "Part 2" above all (dropped again 2026-08-19, second round: it had been built
  and was wrong). The parts of one recording share ONE mix page, with the files, the players
  and the tracklist's part chapters inside it, so a title carrying the marker is the start of a
  duplicate, not a second reading - the chip would use the switch to undo the drop. Held
  against the offered readings: "(Live PA)" and the venue-room word describe the same
  recording, and "(Promo Mix)" moves the filing of the same page. The wiki DOES carry a few
  "... (Part 2)" titles; those are separate releases, and no reason to offer the marker on a
  split upload. The rule and the reasoning live in `mdbTitleDroppedBitPatterns`
  ("Never offered back").
- **The promo switch moves the filing.** `mdbPageCreator_entityCategoryFor` reads the flag OR
  the title's marker, so `mdbPageCreator_applyAlternative` sets `mdbPageCreator_promoCategory`
  to match the toggle - without that, switching to the show reading would still file the page
  under Promo Mix. The hints bar's "Used categories" reads the FIELD's title for the same reason,
  and since 2026-08-19 it is the ONLY place the filing is named: the grey "Category:Promo Mix"
  note that used to hang under the "Create" link said the same thing a second time and is gone
  (`mdbPageCreator_syncPromoNote`, `#mdb-pageCreator-createColumn`).
- **A switch counts as an edit** (`mdb-edited`): the reading was chosen on purpose, and the
  next refresh or recent-pages refinement must not put the suggestion back over it.

## Title suggestion reports

Reports come out of the **"Report" box** under the score (`mdbPageCreator_reportText()` in
`page_creator.js`). Since 2026-08-22 it is **Markdown in headed blocks** - the box is read
where it is pasted, and on Discord the headings render:

- **`## Created`** - the page URL, the player title, the channel name **as the site's API gives
  it**, the upload date, the suggested title, the score and the categories, one `* ` bullet each
- **`## Lookups`** - the reasoning panel's section 3 as text: every asked name under `Artists:`
  or `Entities:` (filed by `mdbPageCreator_lookupRoleColumns()`, which the panel's two columns
  read too), in quotes - a name carries the comma and the arrow the answer is built from - with
  everything the wiki said about it: `* "AKA AKA" -> artist, 230 mixes, 95%`,
  several answers joined with ` | `, the wiki's own spelling in front where it differs from the
  name asked, and otherwise the same status wording the panel shows (`no category of this name`,
  `looking it up …`, `lookup failed`, `not asked - over the 10-name request limit`). A case is
  wrong for one of two reasons - the wiki had nothing, or it had the name and the parse picked
  another - and only this block tells them apart afterwards
- **`## Similar lookups`** (since 2026-08-23) - the reasoning panel's section 8 as text:
  the prefix round behind the names the block above answered empty about, read off
  `mdbPageCreator_prefixDecisions()` - the SAME walk the bar's "Similar:" row and section 8
  render from, so the box can never claim a chip the reporter did not see. Two levels: the asked
  name in quotes with a bare `->`, and under it one `** ` line per answer -
  `** 103 Club, venue, 2 mixes, 40%, shown on the "Similar:" row`, or `..., not shown - ` and the
  walk's own reason (the 3-per-name cap, the mix minimum, already a chip on the bar, already
  shown under an earlier name). A name with no answer carries the status behind the arrow in
  section 8's wording, `no category starts like this name either` above all. It is the block that
  separates "the wiki has nothing" from "the wiki has it spelled longer", which is where an
  expected title usually comes from - and it is hints only, so it stands OUTSIDE `## Lookups`:
  those lines built the title, these were only offered next to it
- **`## Mistakes / learnings`** - two empty `* ` bullets. Two, because a wrong title is rarely
  wrong for one reason - a case usually names the step that misread the title AND the rule that
  should have caught it, and a second bullet standing there is what gets the second one written
- **`## Expected`** - the reporter's "Expected title", "Expected alternative title" and
  "Expected … category" lines

"Expected alternative title" (since 2026-08-19) is a SECOND title that would also be right - the reading
the row should have offered as a "Switch title" chip, or one only the reporter can know
("Elsewhere Loft" is that club's rooftop). It is the one line that is empty on purpose most of
the time, and an empty one says there is a single right answer, so it is no reason to ask back. That is exactly the input a case
needs - do not ask back for any of it when the box was used.

The two late-answering rounds refill the box (`mdbPageCreator_fillReport()`, a no-op on a closed
box and on one the reporter has written in): the exact lookup for `## Lookups`, and the prefix
round's own settle path - success AND failure - for `## Similar lookups`. A block quoting a
request's status must never outlive the request.

Every line left for the reporter keeps **one blank behind its colon** - that is where the cursor
goes, and a line ending in ":" makes the writer type the space first. Keep it when the block
grows a line.

Above the box sits the **reasoning panel** (`mdbPageCreator_renderReasoning()`), numbered in the
order the build RAN - **1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8**: the title chunks, the first parse's
cleanup (closing with the title it built as one grey "Title candidate:" chip), the mdbnames
lookups with their answers, the second parse (what those answers changed, closing with the grey
"Title after lookup:" chip), the recent-pages title analysis (what the entity's newest pages
settled about the format, closing with the green "Final title:" chip - the green finale lives
in the LAST title stage, and only there, or two "final" chips would contradict each other), the
created page's categories annotated from the lookup cache, the recent-pages page text
analysis, and the similar categories (`mdbPageCreator_reasoningSimilar()`: every answer of the
prefix round with its score and the "Similar:" row's verdict - shown, or dropped and why -
last because it decides nothing about the title or the page). 2, 4 and 5 are the title-shaping
stages - 2 and 4 ONE stage run twice on either side
of the lookup, 5 the format read off the wiki itself - and their shared orange accent (the copy
button's colour, vs the blue of 1, 3 and 8 - the chunks and both lookup rounds - the green of
6, and the citrus of 7, which says "same recent pages, about the PAGE rather than the title")
says so; the accent paints the count
bubble, the left bar AND the heading, stated once per section as the
`--mdb-reasoning-accent*` properties in `page_creator.css`. The CHIPS are a different
question and stay coloured by STATE, never by type: grey candidate, red ignored, green used. Its
sources are plain-data globals in `title_builder.js` - `mdbTitle_trace` (filled by every
`buildMixesdbTitle()` run), `mdbTitle_lookupLog` (every name `mdbTitle_lookupCategories()` was
ever asked on this page; the answers stay in `mdbTitle_categoryCache`) and
`mdbTitle_candidateSources`/`mdbTitle_chunksNotAsked` (where each asked name came from, and
which chunk was deliberately skipped) - plus `mdbPageCreator_tracePreLookup` and
`mdbPageCreator_titlePreLookup`/`_titlePostLookup`, which live in `page_creator.js` because
telling the first pass from the second is orchestration knowledge the parser does not have. Display only, rebuilt whole on every render; a title edit re-renders
debounced and looks the current title's names up first (cache-aware). Hardcoded dark like the
loading skeleton (both sites are dark-themed). Opened while a lookup is still pending (or the
page skeleton is up), it renders its own stand-in rows and a safety-net poll re-renders when
everything settled - the normal path is the refresh after the lookup answer.

Settled about what it shows:

- **Section 3's names are BUILT from section 1's chunks, and say so** - the channel (which
  need not stand in the title), a curated show name, a chunk without its trailing episode
  number. That difference is what made the panel read as contradicting itself, so every name
  that is not simply a chunk carries its origin (`mdbTitle_candidateSources`) on a line of its
  own under the row - spanning both grid tracks, since inside the answer column it ate the
  width the answers need. The chunks the candidates deliberately skipped
  (`mdbTitle_chunksNotAsked`) close the section on a "Not asked:" line, with the reason.
- **Section 4 reports the SUGGESTION, not only the step diff** - the branches the wiki's
  answers open write no cleanup step (the venue reading composes "A @ Venue, City" at the
  single exit), so a run that rewrites the whole title has an empty step diff. Without
  `mdbPageCreator_titlePreLookup`/`_titlePostLookup` next to it, 4 would report that nothing
  had happened on exactly the titles where the lookup mattered most.
- **Section 3 is two candidate columns, filled BEFORE the wiki answers** - "Artist category
  candidates" and "Entity category candidates". The ROLE comes from the title's shape
  (mdbTitle_candidateRoles, recorded by mdbTitle_categoryCandidates): names in front of the
  "@" ask as the artist; series-looking names, everything behind the "@" and a curated show
  name as the entity; the channel as both - so the chips say what a name was asked FOR, not
  merely what came back. Within a column only that role's answers render ("artist" types
  left, everything else right); an answer of an unexpected type still pulls the chip into
  its column, an answer list that is all of the other kind shows a muted "–", and a name
  with no answer shows its status note in its candidate column(s) only - never as an
  artist-column line for a series or a place. The place group's country is no candidate at
  all: kept in the title, never a category. Built off the MONUMENT report (2026-08-17),
  where a podcast answer standing in one flat list read as if it backed an artist.
- **Section 3's percentage is scored per ANSWER, not per asked name** -
  `mdbTitle_matchConfidence( name, matches, index, overruled )` in `title_builder.js`, returning
  `{ percent, reasons }` out of the same `mdbTitle_confidence()` object the title score uses, so
  both are clamped to 10-95 and coloured by `mdbPageCreator_confidenceBand()`. A name the wiki
  knows as several things ("fabric" the club, "Fabric" the artist) has one number per reading -
  that is the whole point, one number for the row could only be about one of them. Nothing in
  the parse reads it: it weighs the wiki's answer (is the category THIS name, is the name
  specific enough, does a curated channel rule overrule it), never whether the parse picked the
  right chunk - "Leon" with 69 mixes scores 95% and is still the wrong reading of
  "Leon Row x Shimon". **The mix count is deliberately worth almost nothing** (-10 for a
  category holding one mix or none, -5 for two to four, nothing above): it says how well the
  wiki knows the name, not whether the name is the right reading of these words - a category
  with 500 mixes can be the wrong word just as easily as an empty one. It used to cost up to
  35, which put every thinly-filled but perfectly correct artist in the yellow band. A row with no answer at all (unknown, pending, failed,
  over the request limit) gets no number - there is nothing to score. The reasons are shown on
  hover under "What lowered it", so the rule the confidence reasons live by holds here too: each
  one names something the reporter can go and check.
- **Section 4 leads with WHY the name got the slot, and the deciding branch writes that
  sentence** - `mdbTitle_trace.picks` (`{ artist, entity }`, one sentence per ROLE), passed as
  the last argument of `mdbTitle_result()` by each of its ten call sites and rendered above the
  lookup answer by `mdbPageCreator_reasoningCategoryRow()`. Built from the MONUMENT report's
  second round: the panel filed `S.U.N Festival`, a name the wiki has never heard of, as the
  entity while `MONUMENT` (podcast, 425 mixes) went unused, and every line on screen was either
  "no category of this name yet" or section 3's answer repeated - none of them said that the
  event word and the " @ " are what decided it. The panel must NEVER re-derive this from the
  title's shape: a second opinion that disagrees with the parse misleads the reporter, and a
  new branch that forgets its sentence must show no line rather than a guessed one. Say what
  actually decided - the event branch reads a word list, not the wiki, so its sentence may not
  claim MixesDB knows the name (the venue branch is the one that asks). A branch reached
  through several sub-readings (5c's "by", the series score, the plain order) carries the
  sentence in a variable set where the reading is decided, not one written at the return.
- **Only section 1 shows chunks, and one function splits them** - `mdbTitle_traceChunks()`
  (separator runs, the series-"by", every " @ " and the comma standing in FRONT of an event
  name - `mdbTitle_splitEventComma`: `Dark Skies, Horst Festival` is two chunks, `ANA,
  Johnny D` and `3000Grad Festival, Utopia` stay one), reached through `mdbTitle_titleChunks()`.
  Sections 2 and 4 do NOT re-split the cleaned title: they close with the BUILT title as one
  chip (grey "Title candidate:" before the lookup, green "Final title:" after). The panel used
  to re-split `trace.cleaned` there, and every split rule then had to reach both callers in
  the same state or the sections contradicted each other - the glued
  "Dark Skies, Horst Festival 2026" chip was exactly that, the event-comma rule testing text
  whose gig year only the chunk side had taken out. A cleanup step that takes something out
  of a NAME must still reach the chunks too: the date used to be gone from the title while
  still sitting in section 1's chip, which read as the parse having put it back
  (the date mirror in `mdbTitle_titleChunks`).
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
- **Every api.php request the page fired is a link in the section that reads its answer**
  (2026-08-20) - `mdbTitle_apiCallLog` in `title_builder.js`, written by
  `mdbTitle_noteApiCall()` at the three call sites (`mdbTitle_lookupCategories`,
  `mdbPageCreator_recentFetch`, `mdbPageCreator_usedCatFetchRecent`) and rendered by
  `mdbPageCreator_reasoningApiCalls()` as an "API call" row closing sections 3 (the mdbnames
  lookup, plus every hints-bar chip fetch - that is where those chips' categories were
  answered about), 5 and 7 (the one recent-pages request, which carries titles and wikitext
  both) and 8 (the prefix round - its answers render there and on the bar's "Similar:" row,
  never in 3). The URL is built with `$.param` off the SAME data object the `$.ajax` call sends,
  never a second hand-written one: a link opening a slightly different request than the one
  whose answer is on screen is worse than no link at all. Built off the Amplify Series report -
  the hints bar said "1 mix" where the category holds 29, and turning that into something the
  MixesDB maintainer can act on meant rebuilding the request by hand. The log is cleared per
  page with the lookup log, so a section whose answer came out of the cache of a track opened
  earlier shows no row: the request was not made for this page and the panel may not say it
  was.

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
   `expectEntity` does the same for the name the page is filed under and `expectEntities` for
   every name a place group offers ("@ Far Blue, Noordspace" offers both) - which of the offered
   ones the page really carries is the wiki's answer at filing time and is not in the runner,
   which does not load `page_creator.js`. `expectPromoCategory` guards the one filing that is
   NOT readable off the title: a name that already says it ("... Vol 4", "Summer 2026 Mix")
   files under `Category:Promo Mix` without carrying a "(Promo Mix)" marker, so a report about
   exactly that has nothing else to hold on to - title, artists and entity all come out
   unchanged. It reads `promoCategory` off the build.
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
