# Page creator

The row next to a player holding a suggested MixesDB mix page title and a **Create** link that
opens the new page's edit form already filled in. Shared by the site scripts, so it looks and
behaves the same everywhere.

- **Runs on:** every site whose script loads it – currently [SoundCloud](../../SoundCloud/) and
  [TrackId.net](../../TrackId.net/) (audiostream pages with a SoundCloud player)
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** [Tracklist box](../tracklist_editor/)

## Features

### Suggested mix page title

Built from the player title, the uploader/channel name and the upload date, in MixesDB's own
title format (`YYYY-MM-DD - Artist - Show`). The field is editable – the suggestion is a starting
point, not a decision – and follows its text as you type, widening and narrowing again, so the
whole title stays readable without leaving an empty stretch behind it. A confidence
score next to it says how sure the suggestion is.

MixesDB's own category names sharpen the guess: the names in the title and the channel name are
looked up on the wiki, so a name MixesDB knows as an artist, podcast, show, venue or event is
read as exactly that – and written in the wiki's own spelling (`trommel` becomes `Trommel`,
`asa 808` becomes `ASA 808`).

A set that was played somewhere comes out the way MixesDB writes a live recording: one `@` and
one place group behind it. `Live at`, `live@` and a typed `@` all read the same, and a second
`@` folds into the place group – `live@3000Grad Festival @Utopia` becomes
`@ 3000Grad Festival, Utopia`, filed under the first place alone – unless a place further back
names the event (`… @ Dark Skies, Horst Festival`), which is the same group written the other way
round and is filed under the festival. Such a title claims only the
year, and a year the place list itself names wins over the upload year and leaves the list
(`… @Utopia 2021` becomes a `2021 - …` title ending in `, Utopia`). The one played-how marker
that stays is `Live PA`: said by the title – or by the description of a live recording – it is
written as `(Live PA)` behind the artist's name, while the artist category stays the bare name.

The row is meant for mixes that are **not on MixesDB yet**, and only for recordings of at
least 20 minutes, which is MixesDB's lower limit. Whether a player is already used is the
[Toolkit](../toolkit/)'s answer, so the row shows up once the toolkit box next to it
has one.

**During the beta** it also appears for mixes that already have a page – without the **Create**
link, with an **Exists** link to that page instead. That is on purpose: comparing the suggestion
against the title a human actually chose is the fastest way to find what the suggestion still
gets wrong, and it is exactly when the **Report** box is worth filling in. It ends when the beta
does (see the roadmap).

### Hints under the title

A box under the title field – framed like the reasoning panel, and always there – for what the
title itself cannot say: things worth checking before clicking **Create**.

**Used categories** lists the artist and the entity category the new page would be filed under,
one chip per name, its colour saying whether MixesDB already has it:

- **green** – the category exists. The name links to it, and its mix count stands behind it.
  Where the wiki spells the name differently than the title does, the tooltip says so – that is
  a correction worth making in the field above before creating. The count is a toggle: a click
  folds the category's most recently added mix pages out inside the chip, newest first, each
  linking to its page – the quickest way to see how pages of this series are named, and whether
  the mix is already among them. A show's pages arrive with the category answer itself; an
  artist's are fetched the first time the chip opens.
- **red** – MixesDB has no such category. That is not a mistake in itself (every artist has a
  first page), but it is exactly where a typo or a second spelling hides – so the name itself,
  marked by the loupe icon behind it, looks the name up on MixesDB: a hit there means the wiki
  knows it under another name.
- **grey** – MixesDB has not been asked about this name (yet), so there is no answer either way.

On a desktop-sized window the chips' MixesDB links – the category names, the red names' search
and the recent mix pages – open the page in a modal right here instead of a tab: the look they
serve is a five-second one. The pages behind the links on screen are prefetched, so the modal
is usually there at once. Esc, the × or a click beside the box close it; **Open on MixesDB** in its
header opens the same page as a tab after all, and so does cmd/ctrl- or middle-clicking any of
the links directly. On a narrow window the links open as tabs, as before.

An artist has to be known as an *artist* to count as green; the entity counts whatever MixesDB
files it as, since a podcast, a show, a venue and a festival can all stand in that slot. The year
and the style categories are not listed – neither is a name anyone could spell wrong.

The line follows the title field: correct the title and, after a short pause, the categories are
re-read from it and any new names are looked up.

### "Report" box

**Report** under the confidence score opens a text box under the row, already filled with
everything a report about a wrong title needs: the player's URL, the title, channel name and date
the site handed over, the title that came out of them, the score, and the artist and entity
categories the page would be filed under. Underneath are the empty lines only you can fill in – what went wrong and
what the title and its categories should have been.

Copy the box, correct it and post it on Discord. It is always as tall as its text and grows as
you type. Editing the title field above refills it, but anything typed into the box itself is
never overwritten.

Above the box, a **reasoning panel** shows how the suggestion was built, so the "Mistake /
learning" line can name the step that went wrong. Its five sections are numbered in the order
the build really ran: the title is parsed once before MixesDB is asked anything, and once more
with its answers, so the same cleanup appears twice, on either side of the lookup – sections
**2** and **4** are that one stage run twice, and their shared orange accent (the copy
button's colour) marks them against the blue of 1/3 and the green of 5 – the number, the bar
down the left and the heading itself all carry it. That is also why the
names in 3 are not read off the title of 2: the lookup is built from the chunks of **1**,
never from the cleaned title. Chips everywhere are coloured by **state**, not by what they
name – grey while something is still a candidate, red for what was ignored, green for what
ends up used.

- **1 Title chunks for category lookup** – the units the title splits into, plus the channel name. A chunk ends at
  a separator, at a bracket, at every `@` (`Kernel Existence - live@3000Grad Festival @Utopia`
  is the chunks `Kernel Existence | 3000Grad Festival | Utopia` – the live marker is no
  chunk), and at the `by` in front of a numbered series (`Guestroom 779 by Sascha Sibler` is
  two chunks) – the units section 3's lookups are built from. What the parse
  removes outright is shown in red on a `Removed:` line instead – a bracket crediting
  the artist's labels (`Tooker (SONARA / Crosstown Rebels)`), a list of places saying where
  the artist is from, or a bracketed country behind the artist's name (the `(BE)` of
  `Adjust (BE)`, even in a live title) – with the reason spelled out behind it; those names
  are never sent to the lookup
- **2 Title fixed and cleaned** – the first parse, before the wiki has been asked anything.
  Every fix and removal by name: typos, decoration, the date that
  was read out, joiners rewritten, chunks a mix page title does not carry (what the
  `Removed:` line of section 1 already names is not repeated here, in no step) – and the
  curated channel → show rules, whose work is otherwise invisible, drawn as chips with the
  show it puts into the title in green: a channel on the known-shows list as
  `Resident Advisor → RA Podcast`, and a curated channel rule under which the title's own
  words name the show as `"DJ MIX" on the channel Dance TV → Dance TV DJ Mix`. Both names are
  hand-written for that channel, so a wrong one is fixed in the script, not in the title.
  The section closes with `Title candidate:` – the whole title this first parse built, as one
  chip. It is grey on purpose: MixesDB has not answered yet, so this title can still change;
  its final version stands in section 4, in green.

  A step that worked off one of the script's word lists carries a round **?**: it opens the
  list itself – its name, one sentence on what it is for, and every entry as it is written in
  the script. So "Decoration removed" can be checked against the rule that removed it, and a
  report can say which entry is wrong (or which one is missing) instead of only what came
  out. Open lists stay open while the title above is corrected
- **3 Category candidate lookups on MixesDB** – the one request, sent for the names built from the chunks of 1 plus
  the channel. Two candidate columns, **Artist category candidates** and **Entity
  category candidates**, filled from the title's shape BEFORE the wiki answers: names in
  front of the `@` are asked as the artist; series-looking names, everything behind the `@`
  and a curated show name as the entity; the channel – genuinely either – in both columns.
  Next to each chip stands what the wiki's own category names answered for that role: the
  category in the wiki's spelling, its type and how many mixes it holds, `no category of
  this name` when it has none – or a `–` when its answers all belong to the other column.
  An answer of an unexpected type pulls the chip into that column too, so `MONUMENT` shows
  the podcast on the entity side and the wiki's `Monument (Jordan Smith)` on the artist
  side. A name that is not simply a chunk of section 1 says underneath where it does come
  from: the channel (asked as the series the mixes belong to, though it need not stand in the
  title at all), a curated show name, or the chunk it was shortened from – `HMWL Podcast`
  carries `from the chunk "HMWL Podcast 439"`, since a category name never holds the episode
  number. A chunk that was deliberately NOT asked about stands at the end of the section on a
  `Not asked:` line with its reason: the place group's own country
  (`… @ S.U.N Festival – Hungary`) – a country is never a category – a chunk that is nothing
  but a counting word and its number (`Episode 72`, `Part 2`, `Pt.3`), which says which
  episode or which part this is and files nothing on MixesDB, or a chunk too long to be a
  name. Every chunk of section 1 is therefore either a chip here or a line saying why it is
  not. The chips answer section 5 by colour:
  green when the
  name ended up a category of the new page, red when it did not. A name a curated channel
  mapping overrules says so – `DJ Mix` is a show on the wiki, but on the channel Dance TV
  those words name `Dance TV DJ Mix`. Every name the wiki confirms – here and in section 5 –
  is a link to that category page on MixesDB, opening in a new tab so the player page stays
  where it is

  Behind every answer stands a **percentage**: how strongly that answer backs the name it was
  asked for, in the colours of the score above. Hover it for what lowered it. `HATE Podcast`
  found as `HATE Podcast` is 95%; `Daniel` found as an artist category holding a single mix is
  70% – with 57,000 artist categories on the wiki, a short name almost always finds somebody.
  A spelling the wiki writes differently, a name it knows as several things at once, and a name
  a channel rule overrules all cost as well. How full the category is barely counts: a category
  with 500 mixes can be the wrong reading of the words just as easily as an empty one
- **4 Title refined after lookup learnings** – the same cleanup a second time, now knowing
  what MixesDB has. This is the run the title on screen comes from, and only what the answers
  CHANGED is listed – on most titles that is nothing, and the section says so. When they do
  change something, the suggestion before and after stands here as one line
  (`kernel existence - Ritter Butzke Berlin (Promo Mix) → Kernel Existence @ Ritter Butzke,
  Berlin`: MixesDB knowing `Ritter Butzke` as a venue is what turned the title into a set
  played there). A cleanup step that only ran in this pass is listed like any other step, and
  one the answers made stop happening on a `No longer done:` line. Why a particular name
  ended up in a particular slot is not repeated here – that is the `picked as …` line of
  section 5. The section closes with `Final title:` – the built title as one chip, now green:
  the answers are in, this is the state the **Create** link uses, and a correction typed into
  the field above shows here as well

- **5 Categories for the mix page** – the `[[Category:…]]` lines the **Create** link writes.
  The artist and the entity line each start with **why that name got the slot** – `picked as
  the entity: "S.U.N Festival" carries an event word, so the title reads as a set PLAYED at
  it – it becomes the place behind the " @ ", and the channel is not used as a show on top of
  that`. That is the line to quote in a report when the wrong name ended up in a slot: it
  names the rule that put it there. Under it stands what the lookup knows – a known artist
  confirmed with its mix count, an unknown one flagged as possibly new or misspelled

The panel follows the title field: correct the title above and, after a short pause, the
categories are re-read from it and any new names are looked up on MixesDB. It follows the
tracklist box too: leave the box after an edit and the `Tracklist:` line in section 5 answers
the fresh verdict – nothing else in the panel changes, since the tracklist takes no part in the
title.

Opened while MixesDB is still being asked, the panel holds its space with grey pulsing
placeholder rows and shows the real content in one step once the answers are in.

### "Create" link

Opens the edit form of the new page, prefilled with:

- the **File details** table (duration and what else the site gave away)
- the `{{Player}}` with the player URL as MixesDB embeds it
- the categories the title gives away (year, artists, the entity the page is filed under)
- the style categories, where the site suggests any (TrackId.net's style suggestions box) –
  otherwise they stay two empty category rows to fill in
- the tracklist from the box below, when there is one
- the artwork URL, handed over for MixesDB's own image upload form – it is not written into the
  page text

Nothing is saved: what opens is the normal edit form, to check and submit.

Filling the edit form and the upload field needs the
[MixesDB Userscripts Helper](../../MixesDB_Userscripts_Helper/) installed as well.

### Tracklist from the description

The tracklist an uploader wrote into the description ends up in an editable box next to the
player and, from there, on the created page. Comments are read only when the description held no
tracklist, and only for a whole numbered tracklist – single track IDs in comments are never
taken.

A description holding several tracklists, each under its own headline – a resident's hour and a
guest mix, say – becomes one tracklist in
[chapters](https://www.mixesdb.com/w/Help:Tracklists#Chapters): a `;Chapter` line above each
part. The headline is stripped down to the name the chapter is filed under, so
`First Hour - Ollie Blackmore:` becomes `;Ollie Blackmore` and `Guest Mix: Natasha Kitty Katt`
becomes `;Natasha Kitty Katt` – a `Guest Mix` / `Hour 1` / `First Hour` prefix and a trailing
`:` are removed, in whatever mixture of blanks, `-` and `:` they were typed. A headline needs no
blank line under it. When one of the tracklists has no headline of its own, no chapters are
invented – the longest single tracklist ends up in the box, as before.

Links never end up in the box. Some uploaders put a shop or label link under every single
track – usually without `http://` – and the tracklist is still found in one piece: the link
lines are skipped, and a link written inside a track line is removed from it.

A tracklist written as a bulleted list instead of a numbered one is read as well. The bullet in
front of the track – `- `, `• `, `· `, `> `, `* ` and the like – is taken off before the box is
filled. A leading hyphen especially has to go: the Tracklist Editor reads it as "this line
continues the one above", so a list written `- Artist - Title` all the way down used to arrive as
one single track, and a long one arrived as nothing at all. A bullet always has a blank behind
it, so an artist writing itself `-Ms-` keeps its hyphen.

A tracklist whose lines split artist and title with a slash (`Ackermann / Pure`, and the same
with `//`, `\` or `\\`) is read as well, and arrives in the box written with the dash MixesDB
uses. Only the first slash of a line moves, and only when the whole block is written that way –
a single `Artist / Other Artist - Title` among dashes is a collaboration and stays as it is.

The dash itself arrives in the box the way MixesDB writes it too. An uploader who typed an en
dash (`Arion – Squaa`), an em dash, a double hyphen or a space on only one side of it wrote the
same separator, and the box shows ` - ` for all of them – the Tracklist Editor otherwise reads
such a line as a track with no artist and calls the whole tracklist incomplete. Only the first
dash of a line is the separator; anything further right belongs to the title and stays.

The box is behind a **Tracklist** headline that toggles it, and a bracket behind that headline
says where the tracklist was read from. What is in the box at the moment **Create** is clicked is
what goes onto the page, so corrections stick. The box is the shared
[Tracklist box](../tracklist_editor/), so it behaves like every other one: correct it and leave
it, and it greys out for a moment while the Tracklist Editor re-formats it and re-answers its
feedback. Clicking **Create** straight out of the box works the same, visibly: the click runs
that update a final time first – the box greys out, scrolls into view if it was below the fold,
shows the formatted tracklist – and only then the edit form opens, carrying exactly that
version. The `[[Category:Tracklist: …]]` of the new page follows what the Tracklist Editor API
says about the box's final content – already while it is on screen, not only at the click.

Mixes that are already on MixesDB get the headline only – the tracklist is formatted on the first
click, not before, so no request is wasted.

On TrackId.net the description is not searched at all: the **Create** link reads the
[tracklist box](../../TrackId.net/#tracklist-in-wiki-syntax) the TrackId.net script itself builds
from the identified tracks, which is the better tracklist anyway.

### Loading placeholder

The MixesDB additions around a player arrive from different API answers – the toolkit, the title
row, buttons, the tracklist box – each a moment after the other. Until they are all in, a dark
grey pulsing placeholder holds their space, and the finished block then appears in one step
instead of piece by piece. If an answer takes too long, whatever has arrived is shown after a
few seconds.

Where it shows: SoundCloud's redesigned track pages and TrackId.net's audiostream pages. On
TrackId.net the embedded player itself is not covered – it shows and can play straight away; the
placeholder only holds the space below it.

## Known limitations

- The title suggestion leans on hand-maintained word lists (`title_definitions.js`) next to the
  MixesDB category lookup, so shows, labels and venues neither has seen before can end up in the
  wrong part of the title. Report a wrong suggestion on Discord – the **Report** box has the
  whole case ready – and it becomes a test case.
- Only tracklists written as a run of neighbouring lines are detected. A tracklist scattered
  through a description is left alone on purpose: a wrong tracklist on a new page is worse than
  none.

## Roadmap

1. ✅ **MixesDB name lookup** – live since 2026-08-16. The wiki answers what a name is – artist,
   podcast, show, venue, event – case-insensitively and in its own spelling, and the suggested
   title uses that answer (`asa 808` → `ASA 808`, known venues become
   `@ Venue, City`, known podcasts stop getting `(Promo Mix)` wrongly).
2. **Double-check info in the row** – live since 2026-08-18 as the
   [Used categories](#hints-under-the-title) chips: which of the page's categories MixesDB
   already has, the mix count of each, and – behind every count – the category's most recently
   added mix pages. Still to come: the category *family* around a name (`Dekmantel` →
   `Dekmantel Mix`, `Dekmantel Selectors`, `Dekmantel São Paulo Podcast`, …) and the pages
   around the mix date. So "this page may already exist" is visible **before** creating.
3. **Duplicate protection on Create** – a mix page that carries the track's URL only as a
   commented-out mirror looks like "not on MixesDB yet" today and invites duplicates; a search in
   the page source catches it. Plus a sanity check when **Create** is clicked – exact and fuzzy
   title match against existing pages – with the button turning into **"Yes, still create"** when
   something similar is found. Nothing is ever blocked, the row only shows the evidence.
4. **Page text learned from the show's existing pages** – read the last ~8 pages of the entity's
   category and copy what they agree on: the episode number format (`Trommel.234` vs
   `HATE Podcast 498` vs `RA Podcast (RA.1051)`), the leading
   `[[File:{{subst:PAGENAME}}.jpg|right|360px]]` where the series uses one, `{{StandardShow2h}}`
   instead of the file details table where that is the house style, and a style category only
   when at least 90% of the recent episodes agree (measured: that fires almost only on
   genre-locked series – HATE Podcast → Techno).

5. **End of the beta** – the row stops appearing altogether for a mix that already has a page.
   The **Exists** row is a beta device for comparing the suggestion against the title a human
   chose; once the suggestion is good enough that this is not worth reading any more, a mix with
   a page gets no row at all. Only worth doing after steps 2 and 3, since those are what make a
   *missed* existing page unlikely – the row may only go quiet once it is trustworthy about
   duplicates.

Design decisions and the measurements behind each step: `row_enrichment.md`,
`page_text_learning.md`, `mixesdb_api_request.md`.
