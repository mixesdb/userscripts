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
point, not a decision – and widens as you type so the whole title stays readable. A confidence
score next to it says how sure the suggestion is.

MixesDB's own category names sharpen the guess: the names in the title and the channel name are
looked up on the wiki, so a name MixesDB knows as an artist, podcast, show, venue or event is
read as exactly that – and written in the wiki's own spelling (`trommel` becomes `Trommel`,
`asa 808` becomes `ASA 808`).

The row is meant for mixes that are **not on MixesDB yet**, and only for recordings of at
least 20 minutes, which is MixesDB's lower limit. Whether a player is already used is the
[Toolkit](../toolkit/)'s answer, so the row shows up once the toolkit box next to it
has one.

**During the beta** it also appears for mixes that already have a page – without the **Create**
link, with an **Exists** link to that page instead. That is on purpose: comparing the suggestion
against the title a human actually chose is the fastest way to find what the suggestion still
gets wrong, and it is exactly when the **Report** box is worth filling in. It ends when the beta
does (see the roadmap).

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
learning" line can name the step that went wrong:

1. **Title chunks** – the units the title splits into, plus the channel name. A chunk ends at
   a separator, at a bracket, and at the `by` in front of a numbered series (`Guestroom 779 by
   Sascha Sibler` is two chunks) – the same units the lookups are sent for. What the parse
   removes outright is shown in red on a `Removed:` line instead – a bracket crediting
   the artist's labels (`Tooker (SONARA / Crosstown Rebels)`) or a list of places saying where
   the artist is from – with the reason spelled out behind it; those names are never sent to
   the lookup
2. **Fixed and cleaned** – every fix and removal by name: typos, decoration, the date that
   was read out, joiners rewritten, chunks a mix page title does not carry (what the
   `Removed:` line of section 1 already names is not repeated here) – and the channel →
   show mappings, whose work is otherwise invisible, drawn as chips with the channel in blue
   and the show in green: a channel on the known-shows list as `Resident Advisor → RA
   Podcast`, and a show the channel and the title name together as `"DJ MIX" on the channel
   Dance TV → Dance TV DJ Mix`
3. **MixesDB lookups** – which names were asked about on the wiki and what came back: the
   category in the wiki's own spelling, its type (artist, podcast, venue, …) and how many
   mixes it holds – or that no category of that name exists. The asked name's chip answers
   section 4 by colour: green when it ended up a category of the new page, red when it did
   not. A name a curated channel mapping overrules says so – `DJ Mix` is a show on the wiki,
   but on the channel Dance TV those words name `Dance TV DJ Mix`
4. **Categories for the new page** – the `[[Category:…]]` lines the **Create** link writes,
   each annotated with what the lookup knows: a known artist is confirmed with its mix count,
   an unknown one is flagged as possibly new or misspelled

The panel follows the title field: correct the title above and, after a short pause, the
categories are re-read from it and any new names are looked up on MixesDB.

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
what goes onto the page, so corrections stick. The `[[Category:Tracklist: …]]` of the new page
follows what the Tracklist Editor API says about the box's final content.

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
2. **Double-check info in the row** – links to the found categories with type and mix count, the
   category *family* around a name (`Dekmantel` → `Dekmantel Mix`, `Dekmantel Selectors`,
   `Dekmantel São Paulo Podcast`, … – needs the wiki's planned `match=prefix` mode), and the most
   recent + same-date mix pages of the artist and the show. So "this page may already exist" is
   visible **before** creating.
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
