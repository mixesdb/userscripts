# CLAUDE.md

Name alias in prompts: `page creator`

The MixesDB page creator: the row (`#mdb-pageCreator`) a site script puts next to a player,
holding an editable suggested mix page title, a confidence score and a "Create" link that opens
the new page's edit form prefilled with the file details, the `{{Player}}`, the categories and
the artwork URL.

Shared by every site userscript. Nothing in here may look at a specific site: the site script
reads the values off its own page/API and hands them over.

## Files

| File | What it is |
| --- | --- |
| `page_creator.js` | The row and the "Create" link, plus the tracklist box. `mdbPageCreator_*`. Public entry points: `mdbPageCreator_add(options)`, `mdbPageCreator_addTracklist(options)` and `mdbPageCreator_watchToolkit()` - see the header comment for the options |
| `title_builder.js` | `buildMixesdbTitle()` and the `mdbTitle_*` parser. No DOM, no network except the MixesDB category lookup |
| `title_definitions.js` | The word lists and channel->show mappings the parser uses. Plain data, meant to be extended by hand - this is where the learning from each report goes |
| `tracklist_detector.js` | `mdbTracklist_detectInText()` / `mdbTracklist_detectInComments()`: which lines of a description are the tracklist. No DOM, no network - see below |
| `page_creator.css` | Styles the row and the tracklist box. Loaded with `loadRawCss()` by each site script |
| `title_examples.js` | Test data: every title ever reported as wrong |
| `title_examples_test.js` | The deno runner for it |
| `tracklist_examples.js` | Test data: real descriptions and the tracklist that has to come out of them |
| `tracklist_examples_test.js` | The deno runner for it |
| `mixesdb_api_request.md` | The category-lookup endpoint we asked the MixesDB maintainer for - see below |
| `page_text_learning.md` | Plan: reading the recent sibling pages' wikitext to shape the new page's text. Not built |

## Adding a site script

`@require` the four JS files in this order (they are plain scripts, not modules, so order is
the load order):

```
title_definitions.js, title_builder.js, tracklist_detector.js, page_creator.js
```

then `loadRawCss()` `page_creator.css` next to the script's own `script.css`, and call
`mdbPageCreator_add({ title, channel, createdAt, ..., target, placement })` when the site's data
arrives plus `mdbPageCreator_watchToolkit()` whenever the toolkit is (re)built. A site whose
player pages carry a description adds `mdbPageCreator_addTracklist({ description, loadComments,
target, placement })` - see the next section. SoundCloud is the reference implementation.

`target` should be a **selector string**, not a node: these sites re-render under the script's
feet, and the string is looked up again on every render.

## The tracklist

The tracklist an uploader wrote into the description ends up in an editable box next to the
player and on the created page. `tracklist_detector.js` finds it in the text, the Tracklist
Editor API (`apiTracklist( text, "standard" )` in `global.js`) formats it, `page_creator.js`
renders the box (the shared `#tlEditor` from `global.js`) and writes it into the page.

Settled, so it does not get re-litigated:

- **The box wins over the detection.** What is in it at the moment "Create" is clicked is what
  goes onto the page - it is there to be corrected.
- **The API is asked once more on the way into the click, and only its FEEDBACK is used** - the
  colour and the `[[Category:Tracklist: …]]`. The text stays the editor's: re-formatting what
  someone just typed, under their hands, at the moment they click away, is the worst possible
  time for it.
- **Only the API's own `"complete"` earns `Tracklist: complete`.** A warning, a hint or its
  `"incomplete"` all file as incomplete, which is the value that costs nothing if it is wrong.
- **`<list>` or not is read off the API's answer, not off the status.** MixesDB writes a
  tracklist as a `#` numbered list when every track is named, and as plain lines inside `<list>`
  when it is not (a `...` gap is no list item). The `#` in the answer ARE that decision.
- **A tracklist is a RUN of neighbouring lines**, never lines gathered from all over the text.
  Single lines that read as "Artist - Title" are everywhere in a description ("6 Decks - 2
  Mixers"); four of them in a row are not. Numbered runs additionally have to count upwards.
- **Comments are asked only when the description gave nothing**, and only for a WHOLE numbered
  tracklist starting at 1. Single track IDs - which is what nearly every comment naming an
  "Artist - Title" is - must never be taken, and an unnumbered comment tracklist is left alone
  because nothing can split it back into tracks. The site script fetches them (it owns the API
  token); this file decides whether they are worth fetching.

Run the examples before and after touching `tracklist_detector.js`:

```
deno run --allow-read includes/page_creator/tracklist_examples_test.js
```

They hold WHOLE descriptions, prose and links included - where the tracklist starts and stops is
the question, and that question does not exist in a trimmed fixture. Add a reported description
as a case the same way title reports are added to `title_examples.js`, with a comment naming what
it guards. A case with `expect: null` is as important as the others: a wrong tracklist on a new
mix page is worse than no tracklist.

## The MixesDB category lookup (on hold, waiting on the wiki)

The suggestion is meant to stop relying on hand-tuned word lists and let MixesDB's own category
names decide what is an artist, a podcast, a show, a venue or an event.
`mdbTitle_lookupCategories()` in `title_builder.js` is the first version of that, and it has two
known faults, both waiting on the endpoint requested in `mixesdb_api_request.md`:

- **MixesDB is case-sensitive** (`siteinfo` says `case: case-sensitive`, i.e.
  `$wgCapitalLinks = false`) - even the first letter. The lookup asks `Category:<bit>` verbatim,
  so `trommel`, `BASSIANI`, `FADI MOHEM` all miss categories that exist under another casing.
  Player titles are cased however the uploader felt, so this misses a large share of tracks.
- Only `artist` and `venue` are mapped; Podcast, Show, Event, Radio and Record Label all collapse
  into `"other"`, which no caller reads.

Do not start the client-side rework until the endpoint exists - that was decided, not forgotten.
Two things settled in advance, so they do not get re-litigated:

- **A resolved name is written in the wiki's spelling**, not the source's: `trommel` in a
  SoundCloud title becomes `Trommel` in the suggestion. This changes the expectation of the
  existing `Trommel.251 - Arno` case in `title_examples.js` (today it expects lowercase
  `trommel.251`) - update it as part of that work.
- **Candidates are only ever reduced from the RIGHT** (trailing episode number, `#n`, `.n`,
  year), never from the left. With 57,462 artist categories nearly every common word is a real
  category, so left-stripping invents matches: `MOLTO IN THE MIX` would find `In The Mix`, a
  genuine Show with 779 mixes, and wreck the title.
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

## Title suggestion reports

Every title reported as wrongly suggested lives in `title_examples.js` as its input and the
title it should produce. Run them before and after touching anything the suggestion uses
(`title_definitions.js`, `title_builder.js`):

```
deno run --allow-read includes/page_creator/title_examples_test.js
```

**I never edit `title_examples.js` by hand - Claude adds every reported title to it.** Part of
fixing the report, not a separate step or something to ask about first. Per report:

1. Add the case under the site it was reported from: `url`, `title`, `channel`, `date`,
   `expect`. `expect` is my expected title.
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
