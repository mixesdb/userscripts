

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
  be a category of its own). The confirmed name is what settles which bit of an event/venue
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
  either.) **Only the reduced form is asked** - `DJ Mix #677` asks as `DJ Mix` alone, and the
  reasoning panel's re-lookup asks the entity category, not the numbered entity: a category
  name never carries the episode number, so the full form could only answer empty, and the
  episode family behind the reduced name is the row's planned prefix round
  (`row_enrichment.md`), never this exact-match lookup. Accepted price: an artist whose name
  ends in digits ("Asa 808") loses its exact match.
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
- **An entity written as the channel's INITIALS is the channel's series abbreviating itself**
  (2026-08-20, reported on "DSS 140 | Space Drum Meditation" on the channel "Deep Space
  Series"): the title filed under a lone `DSS` while Category:Deep Space Series - the
  channel, a podcast with 8 mixes - holds the episodes and titles every one of them
  "... - Deep Space Series (DSS 012)". So the exit expands it
  (`mdbTitle_expandChannelAcronym`, in `mdbTitle_result` like the room and fraction
  reductions, so every branch that can leave an acronym in the slot is covered): the entity
  becomes the channel name in the wiki's spelling, the id as the title wrote it goes into an
  `episode` of kind `id` - the assemble shape "Show (ID)". Same two-halves guard as those
  reductions, answered by the wiki: the letters are NO series category of their own (a show
  really called by them keeps them, and only an answer about THIS name blocks - the wiki's
  qualified "DSS (Das Schwarze Schaf)" is its OTHER DSS), and the channel name IS one
  (`mdbTitle_entityTypes`). What ties the two names is `mdbTitle_isChannelInitials` - caps
  required, a prefix of the initials counts - off the new `mdbTitle_channelUsed` global, and
  the artist must not BE the channel (the numbered-series branch reads the channel as who
  played, and one name cannot be both groups). Costs 5 confidence: the equivalence of
  acronym and channel is our inference, the wiki only confirmed the two halves. The filing
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
- **A name that is nothing but a counting word is no candidate** - `mdbTitleStaticNamePatterns`
  ("Episode 72", "Part 2", "Pt.3", the bare words too) holds the names every mix carries, so
  MixesDB files nothing under them and the wiki could only answer empty. Patterns rather than
  words, like `mdbTitleDroppedBitPatterns`: each entry carries its own number and its own
  spellings. Matched whole and anchored on both ends (`mdbTitle_isStaticName`), so a real name
  carrying the word ("Radio Episode Berlin", "Party") is untouched. Not the same list as
  `mdbTitleCounterWords`, which takes the word OFF a name that has more to it - a word only
  belongs here when a category of that name would be meaningless, never one a series is named
  after ("Podcast", "Mix").
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
| 2 | Double-check info in the row: category links + family via `match=prefix`, sibling titles recent + around the mix date | `row_enrichment.md` §1-2 | **category links DONE 2026-08-18** as the hints bar (`mdbPageCreator_renderHints()`) - the artist and entity categories as green/red chips (a red name searches MixesDB, marked by a loupe), off the answers the title lookup already has. Since 2026-08-19 the line names EVERY category the page text writes, in its order: the year, the styles, "Promo Mix" and the `Tracklist:` filing ride along as plain grey chips without link or count (verdict `plain`, `mdbPageCreator_plainCategoryNote()`) - they are no name the wiki could spell differently, but leaving them out read as if the page did not get them. An artist or an entity is still required for the line to appear at all. **Recent siblings DONE the same day**: the lookup asks `recentlimit=10` - since 2026-08-19 the server attaches `recent` to EVERY type, artists included, and sorts it by sortkey, so the chip usually needs no request of its own - `mdbPageCreator_usedCatFetchRecent()` is the fallback for the chip clicked before its pages are in (a name edited into the title is answered a moment before them), and the chip stands open on a waiter while it runs - and every green chip's mix count toggles the pages open, ONE chip at a time since 2026-08-19 and in a box hung UNDER the chip since the same day (CSS-only: the list stays the chip's child, `position:absolute` off the chip - the chip keeps its exact size, so the line never moves, and the box lies over what follows until folded shut; inside the chip it dragged the line apart, as a full-width row it tore chip and list into two unrelated things) (on desktop the chips' links open a MixesDB modal, `mdbPageCreator_modalOpen()`, prefetched - and since 2026-08-19 the arrow keys step it through every link the bar has on screen, `mdbPageCreator_modalStep()`). Family and the around-the-date window still open, fully unblocked - `match=prefix` + `matchedTitle` + `matchType` went LIVE 2026-08-16 (verified; row-only - the title builder stays on exact match) |
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
`page_creator.js`), so they arrive with the page URL, the player title, the channel name **as the
site's API gives it**, the upload date, the suggested title, the score and the categories already
filled in,
plus the reporter's "Mistake / learning", "Expected …" and "Alternative title" lines.
"Alternative title" (since 2026-08-19) is a SECOND title that would also be right - the reading
the row should have offered as a "Switch title" chip, or one only the reporter can know
("Elsewhere Loft" is that club's rooftop). It is the one line that is empty on purpose most of
the time, and an empty one says there is a single right answer, so it is no reason to ask back. That is exactly the input a case
needs - do not ask back for any of it when the box was used.

Above the box sits the **reasoning panel** (`mdbPageCreator_renderReasoning()`), numbered in the
order the build RAN - **1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7**: the title chunks, the first parse's
cleanup (closing with the title it built as one grey "Title candidate:" chip), the mdbnames
lookups with their answers, the second parse (what those answers changed, closing with the grey
"Title after lookup:" chip), the recent-pages title analysis (what the entity's newest pages
settled about the format, closing with the green "Final title:" chip - the green finale lives
in the LAST title stage, and only there, or two "final" chips would contradict each other), the
created page's categories annotated from the lookup cache, and the recent-pages page text
analysis. 2, 4 and 5 are the title-shaping stages - 2 and 4 ONE stage run twice on either side
of the lookup, 5 the format read off the wiki itself - and their shared orange accent (the copy
button's colour, vs the blue of 1/3, the green of 6 and the citrus of 7, which says "same
recent pages, about the PAGE rather than the title") says so; the accent paints the count
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
  both). The URL is built with `$.param` off the SAME data object the `$.ajax` call sends,
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
   which does not load `page_creator.js`.
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
