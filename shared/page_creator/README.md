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
read as exactly that – a name it knows as an **event** makes the title a live recording however
the uploader separated it, so `Kollektiv Ost - 3000Grad Festival` is a set played there and not
a mix released under that name, and among the chunks around such a place the one holding a name
the wiki knows as an **artist** is who played there, so a city standing between the event and
the line-up does not end up in either name. A chunk long enough to be a **chain** of names is asked about in
pieces as well as whole – `Timboletti im Chapeau Club` is looked up as itself, as `Timboletti`
and as `Chapeau Club`, because the wiki can only answer empty about the pair – and so are the
artists an `&` joins: `Ri0D. & Jonbot` is looked up as the pair and as each name. Everything
found is written in the wiki's own spelling (`trommel` becomes `Trommel`,
`asa 808` becomes `ASA 808`, and a shouted `DJ MARIA.` stays `DJ MARIA.` instead of being
tamed to "DJ Maria.", because the category holding her mixes is spelled that way) – which
follows a spelling-correcting redirect too, so `Ri0D.` is written `RiOD.`, the category that
really holds the mixes.

An **episode number stays in the chunk it was typed in** – it is what says which of the names
around it is the series. `LIMB #9 – Yuka` on the channel *LIMB* is episode 9 of LIMB, while
`The Sound of Rome #147 - Ricky Montana` on the channel *Ricky Montana* is episode 147 of that
show played by Ricky Montana. With a third chunk the two together answer the whole title:
`DEEP & HAZY - Undercurrent #5 - ALEXANDER BOGDANOV` on the channel *DEEP & HAZY* becomes
`2026-07-02 - Alexander Bogdanov - Undercurrent 5` – the numbered chunk is the series, the
channel picks itself out, and the chunk left over is who played it, so the channel name (the
crew putting the series out) does not join the title.

The series' own recent pages then settle the format – but only where those pages can say
anything about **this** mix. Two things stop them, and then nothing at all is read: the title
**numbers** its entity while MixesDB knows that name as a venue or an event (a series numbers
its editions, a place does not – `Undercurrent 5` and the Amsterdam club `Undercurrent` are two
things sharing a name), or the category's newest page is more than three years older than the
mix (a category nobody has written in that long has no convention to copy, and may not be this
mix's at all). The reasoning panel says which of the two it was.

Otherwise, once the entity resolves to a MixesDB category, its newest mix pages are read, and
where at least 90% of them agree – or all of the
5 newest, where older pages disagree because the series renamed itself – the suggestion is
rewritten to match: the episode number the way the series writes it (`Trommel 251` becomes
`Trommel.251`, `RA Podcast 971` becomes `RA Podcast (RA.971)`, `Zenaari Mix 26` becomes
`Zenaari Mix 026`, and a series that numbers no episodes drops the stray number), the name's
capitalisation as the titles really carry it, and – for a set played at a venue or festival –
the city the sibling pages put behind the place (`… @ Ritter Butzke` becomes
`… @ Ritter Butzke, Berlin`). A title you have edited by hand is never rewritten; what the
pages say still shows in the reasoning panel. `Category:Promo Mix` is deliberately exempt –
it collects unrelated self-released mixes, so its pages can teach a new page nothing.

A set that was played somewhere comes out the way MixesDB writes a live recording: one `@` and
one place group behind it. `Live at`, `live@` and a typed `@` all read the same, and a second
`@` folds into the place group – `live@3000Grad Festival @Utopia` becomes
`@ 3000Grad Festival, Utopia`, filed under the first place alone – unless a place further back
names the event (`… @ Dark Skies, Horst Festival`), which is the same group written the other way
round and is filed under the festival. Such a title carries the artist and the place and nothing
else: a stage, a camp, the set's own name, the genre – and the corner of the site named behind an
`im`/`at`/`bei` in the artist's own chunk (`Timboletti im Chapeau Club @ 3000Grad Festival`
becomes `Timboletti @ 3000Grad Festival`, once the channel or the wiki backs the name in front of
the word) – all go. A place that names the **room** of a venue rather than the venue is asked
about both ways, and where MixesDB has no category under the room's name while the venue around
it is one, the word comes off: `Live@Elsewhere Loft July` files under `Elsewhere`, the club with
the mixes, instead of under `Elsewhere Loft`, which is no category at all. The room is offered
back as a **Switch title** chip, since MixesDB does write it where it is worth naming. A group whose steps the uploader separated with a bracket,
a `|` or a dash wrap instead of a second `@` is joined the same way
(`@ Utopia | Ritter Butzke | Berlin` becomes `@ Utopia, Ritter Butzke, Berlin`). Such a title claims only the
year, and a year the place list itself names wins over the upload year and leaves the list
(`… @Utopia 2021` becomes a `2021 - …` title ending in `, Utopia`). A year behind an **event**
does the same even where the title names one place only, since that number is which edition
was played (`@ 3000Grad Festival 2023` becomes a `2023 - …` title ending in
`@ 3000Grad Festival`); behind a place that is neither an event nor part of a list the year may
belong to the name and stays (`@ What Happens Label Night 2026`). An event that writes its
edition a thousand years ahead is read as the year it means – 3000Grad's `Festival 3026` is the
2026 one, and those digits date the recording instead of staying in the festival's name. The one played-how marker
that stays is `Live PA`: said by the title – or by the description of a live recording – it is
written as `(Live PA)` behind the artist's name, while the artist category stays the bare name.

An `@` in front of a **date** joins nothing and reads as a plain `-`: `Ingo Sänger @ August
2026` is a mix from August 2026, not a set played at a place of that name. A title that then
names nothing but its month is the monthly mix MixesDB has a name for –
`2026-08 - Ingo Sänger - August Promo Mix`, the way `2011-08 - Aeroplane - August Promo Mix`
is written – and the page files under `Category:Promo Mix`. Keeping the stamp as the mix's own
name (`… - August 2026 (Promo Mix)`) is offered as a **Switch title** chip.

An event whose name says nothing about being one is read from two hints together: a chunk
ending in a bare year is an edition, and a chunk ending in a slot of the night – `Closing`,
`Opening`, `Peak Time` – is where inside it the set was played. Neither counts alone, and
together they turn `Bee Lincoln - Rote Dichte 2026 - Obstgarten Closing` into
`2026 - Bee Lincoln @ Obstgarten Closing, Rote Dichte`, filed under the event. The slot is
offered back as a **Switch title** chip, since the title reads just as well without it.

A **line-up fraction** in front of an act – `1/2 Faultierdisko`, one half of the duo playing
this set – never splits the name apart, and the act behind it is looked up next to the name as
written: where MixesDB knows the act and has no category under the fraction, the act is what
the title carries and what the page is filed under.

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

**Used categories** lists every category the new page would be filed under, in the order the
page text writes them: the year, the artists, the show, venue or event (or **Promo Mix**), the
styles and the `Tracklist:` filing. The artist and the entity name are the ones MixesDB is
asked about, one chip per name, its colour saying whether the wiki already has it:

- **green** – the category exists. The chip – and the category the page is really filed
  under – carries **MixesDB's own spelling** of the name. The suggested title writes it that
  way itself; a title **you** have edited keeps your spelling, but a title saying "DJ Maria."
  still files the page under `[[Category:DJ MARIA.]]`, where the wiki's 8 mixes are, rather
  than opening a second, empty category beside it. Where the two differ the tooltip says
  so, because the title in the field above is then still worth correcting. The name links to
  the category, and its mix count stands behind it. The count is a toggle: a click
  folds the category's most recently added mix pages out in a box attached under the chip,
  each linking to its page – the quickest way to see how pages of this series are named, and
  whether the mix is already among them. The chip itself keeps its exact size, so the row of
  categories never moves; the box lies over whatever stands below it until it is folded shut. They stand in the order a MixesDB category page lists
  them, oldest at the top and the newest at the bottom, so a look at the list needs no
  re-reading against the category page it mirrors. The pages usually arrive with the category answer
  itself, for artists as well as for shows, so the list is there the moment the chip is
  opened; where they do not, the click fetches them and the chip waits on a spinner until
  they are in. One list stands open at a time: opening a chip folds the one before it shut.
- **red** – MixesDB has no such category. That is not a mistake in itself (every artist has a
  first page), but it is exactly where a typo or a second spelling hides – so the name itself,
  marked by the loupe icon behind it, looks the name up on MixesDB: a hit there means the wiki
  knows it under another name.
- **grey** – MixesDB has not been asked about this name (yet), so there is no answer either way.

On a desktop-sized window the chips' MixesDB links – the category names, the red names' search
and the recent mix pages – open the page in a modal right here instead of a tab: the look they
serve is a five-second one. The page behind it goes dark and blurred, the whole window and the
site's own menu bar included, so nothing beside the box competes for the eye.
Nothing is fetched from MixesDB before a modal is actually opened. Esc, the × or a click beside the box close it; **Open on MixesDB** in its
header opens the same page as a tab after all, and so does cmd/ctrl- or middle-clicking any of
the links directly. On a narrow window the links open as tabs, as before.

The open modal is walked with the **left and right arrow keys**: one key frames the previous or
the next MixesDB link of the line, so a whole category and every mix page folded out under it
can be looked through without going back to the row between two pages. It walks exactly what is
on screen – a chip whose mix pages are not folded out is one step, not eleven – in the order the
line reads: each category, then the pages under it. The header counts the steps (`3 / 12`) in
its middle and carries the same two arrows as buttons. The walk goes **round**: one step past
the last link is the first one again (`12 / 12` → `1 / 12`), and one step back from the first
is the last, so a chip at the other end of the line is one key away and not eleven. The arrows
only grey out where the framed page has left the row altogether – a chip folded shut, a title
edited into other categories – since there is then no position to step from. The header names
nothing else – which page is
framed is the framed page's own headline to say. The line is re-read on every step, so a
category answer that lands while the modal is open is part of the walk from the next key on.

While the modal is up the arrow keys belong to it alone: a track playing under the overlay is
no longer skipped forward and backward along with the walk, and the page behind does not scroll
sideways either. Closing the modal hands the keys straight back to the site.

**Every page stays loaded while the modal is open.** The page being read keeps its frame when
you step off it, and the two pages a key away load into theirs while you are reading, so a
step is a swap between documents that are already there rather than a new page load – forward
through the walk and just as much back through it. Up to seven pages are held that way; the
ones you have walked furthest from are dropped first, and closing the modal drops all of them.
The first page of a walk is the only one you wait for.

An artist has to be known as an *artist* to count as green; the entity counts whatever MixesDB
files it as, since a podcast, a show, a venue and a festival can all stand in that slot.

The other chips – the year, the styles, **Promo Mix** and the `Tracklist:` filing – stay a
muted grey and carry neither link nor mix count: none of them is a name anyone could have
spelled wrong, so there is nothing to look up about them. They are listed all the same, because
the page really is filed under them; the tooltip of each says what decided it.

The line follows the title field: correct the title and, after a short pause, the categories are
re-read from it and any new names are looked up.

Behind each looked-up chip stands a **fit score**: how sure the row is that *this* is the right
category for *this* page. It is not the percentage the reasoning panel shows in section 3 –
that one weighs whether the wiki's answer is about the right **name**, and by that measure the
Amsterdam venue `Undercurrent` scores 95% even on a mix that has nothing to do with it. The fit
score starts there and takes off what argues against the category: the title numbers its entity
while MixesDB knows a venue or event of that name, or the category's newest page is years older
than the mix. Hover it for what lowered it. What it cannot tell you – and its tooltip says so –
is whether the title picked the right **words**: `Leon` is a real artist category with 69 mixes
and still the wrong reading of *Leon Row x Shimon*.

**Hints** sits under **Used categories** when the entity's recent sibling pages all share a
category the new page does not get. Each chip says behind it which pages it came off
(`Amsterdam Dance Event – all 10 of Undercurrent's newest pages carry it`), so the row answers
"where does this come from?" without a hover. It is deliberately a hint and not a filing: a
venue whose MixesDB pages happen to be festival sets votes for the festival, and only you can
tell whether this mix belongs there. The same lines close section 6 of the reasoning panel, as
plain text.

**Switch title** appears under the categories when the suggestion involved a close call the
build decided one way but could defensibly have decided the other. Each line is the full title
the *other* reading would make, as a clickable chip – click it and it swaps with the title
above: the field takes the chip's title, everything below (categories, report, page text)
follows as if it had been typed, and the same chip slot then offers the previous title back, so
nothing is lost and a second click undoes the switch. The chips follow the field – correct a
name in the title and the offered alternatives carry the correction. The tooltip of each chip
says why the build decided the other way. Offered today:

- **(Live PA)** – offered on two signals. The description says "Live PA" but the phrase was
  only a guess: either it was written into the title (the phrase may describe another act on
  the bill), or it was left off because the title does not read as a live recording – the chip
  offers the opposite reading. Or the title itself says *live* – `Live@Elsewhere Loft`,
  `alemiko *live` – and the word was consumed on the way to the title (read as the `@` joiner,
  or dropped because it says how the set was played, not where): the word alone never writes
  the marker, since a DJ set is announced the same way, but the chip offers the Live PA
  reading in case the act performed its own tracks. Only with a single artist in the title –
  with several, only the uploader knows whose set it was.
- **(Promo Mix)** – the marker was assumed because the name is no known show, venue or event
  (the chip offers the show/podcast reading without it), or the title reads as the artist's own
  series and the marker was deliberately left off (the chip offers the self-released reading
  with it). Switching also switches the page's filing: with the marker the page goes into
  `Category:Promo Mix`, without it under the name itself.

- **The room inside a venue** – the set was played in the loft, the rooftop or the garden of a
  club, and the title was filed under the club because MixesDB has no category under the room's
  name. The chip offers the room back (`… @ Elsewhere` becomes `… @ Elsewhere Loft`), which is
  how the wiki writes it where the room is worth naming – `2019-05-24 - Robert Hood @ Elsewhere
  Rooftop, NYC`. The page files under the venue either way, so this chip changes the title
  alone, not where the page ends up.

- **The month as the name** – the title dated itself with a month and named nothing else, so
  it was written the way MixesDB writes a monthly mix (`… - August Promo Mix`). The chip offers
  the stamp kept as the mix's own name instead (`… - August 2026 (Promo Mix)`) – the wiki has
  both spellings. The page files under `Category:Promo Mix` either way.

- **The slot of the night** – the title named the closing or the opening set at an event, and
  the group was written slot first, event last (`… @ Obstgarten Closing, Rote Dichte`). The chip
  offers the event alone (`… @ Rote Dichte`), which is how MixesDB writes it where the slot is
  not worth naming. The page files under the event either way, so this chip changes the title
  alone.

A chip only ever offers a different **title for this same page** – never one that would create a
different page. That is why a `Part 2` the title carried is dropped and *not* offered back: the
parts of one recording belong on one mix page, with every file in the file details, a player
each and the tracklist split into part chapters, so a title carrying the marker would only start
a duplicate.

### "Report" box

**Report** under the confidence score opens a text box under the row, already filled with
everything a report about a wrong title needs: the player's URL, the title, channel name and date
the site handed over, the title that came out of them, the score, and the artist and entity
categories the page would be filed under. Underneath are the empty lines only you can fill in – what went wrong and
what the title and its categories should have been. **Alternative title** is the one line that
may stay empty on purpose: fill it in when a *second* title would also be right – the reading
the row should have offered as a **Switch title** chip, or the one only you can know.

Copy the box, correct it and post it on Discord. It is always as tall as its text and grows as
you type. Editing the title field above refills it, but anything typed into the box itself is
never overwritten.

Above the box, a **reasoning panel** shows how the suggestion was built, so the "Mistake /
learning" line can name the step that went wrong. Its seven sections are numbered in the order
the build really ran: the title is parsed once before MixesDB is asked anything, once more
with its answers, and then measured against the entity's own recent pages – sections **2**,
**4** and **5** are the stages that shape the title, and their shared orange accent (the copy
button's colour) marks them against the blue of 1/3, the green of 6 and the citrus yellow of
7, the page text read off the same recent pages – the number, the bar down the left and the
heading itself all carry it. That is also why the
names in 3 are not read off the title of 2: the lookup is built from the chunks of **1**,
never from the cleaned title. Chips everywhere are coloured by **state**, not by what they
name – grey while something is still a candidate, red for what was ignored, green for what
ends up used.

- **1 Title chunks for category lookup** – the units the title splits into, plus the channel name. A chunk ends at
  a separator, at a bracket, at a part the uploader wrapped in dashes
  (`3000Grad Festival -Rummelplatz-` is two chunks), at every `@` (`Kernel Existence - live@3000Grad Festival @Utopia`
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
  its final version stands in section 5, in green.

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
  title at all), a curated show name, the chunk it was shortened from – `HMWL Podcast`
  carries `from the chunk "HMWL Podcast 439"`, since a category name never holds the episode
  number – or the artist group it was joined into (`Ri0D.` out of the chunk
  `Ri0D. & Jonbot`, asked on its own because MixesDB files each artist of a pair
  separately). A chunk that was deliberately NOT asked about stands at the end of the section on a
  `Not asked:` line with its reason: the place group's own country
  (`… @ S.U.N Festival – Hungary`) – a country is never a category – a chunk that is nothing
  but a counting word and its number (`Episode 72`, `Part 2`, `Pt.3`), which says which
  episode or which part this is and files nothing on MixesDB, a chunk a curated channel rule
  has already read as the show (`DJ MIX #679` on the channel *Dance TV*, `In The Mix` on
  *Juno Daily*) – those words name the show only together with the channel, so on their own
  they can only answer wrong, and the show they name is asked instead – or a chunk too long
  to be a name. Every chunk of section 1 is therefore either a chip here or a line saying why it is
  not. The chips answer section 6 by colour:
  green when the
  name ended up a category of the new page, red when it did not. Every name the wiki confirms – here and in section 6 –
  is a link to that category page on MixesDB, opening in a new tab so the player page stays
  where it is

  Behind every answer stands a **percentage**: how strongly that answer backs the name it was
  asked for, in the colours of the score above. Hover it for what lowered it. `HATE Podcast`
  found as `HATE Podcast` is 95%; `Daniel` found as an artist category holding a single mix is
  70% – with 57,000 artist categories on the wiki, a short name almost always finds somebody.
  A spelling the wiki writes differently and a name the wiki knows as several things at once
  cost as well. How full the category is barely counts: a category
  with 500 mixes can be the wrong reading of the words just as easily as an empty one
- **4 Title refined after lookup learnings** – the same cleanup a second time, now knowing
  what MixesDB has. Only what the answers
  CHANGED is listed – on most titles that is nothing, and the section says so. When they do
  change something, the suggestion before and after stands here as one line
  (`kernel existence - Ritter Butzke Berlin (Promo Mix) → Kernel Existence @ Ritter Butzke,
  Berlin`: MixesDB knowing `Ritter Butzke` as a venue is what turned the title into a set
  played there). A cleanup step that only ran in this pass is listed like any other step, and
  one the answers made stop happening on a `No longer done:` line. Why a particular name
  ended up in a particular slot is not repeated here – that is the `picked as …` line of
  section 6. The section closes with `Title after lookup:` – the built title as one chip,
  still grey: one stage remains

- **5 Title analysis of recent mixes** – how the entity's own newest pages write their titles,
  and what that did to the suggestion. A `Read:` line names the pages it is read off, then one
  line per question: the name's spelling as the titles write it, the episode format as a
  pattern (`Trommel.N`, `RA Podcast (RA.N)`, `Zenaari Mix N – zero-padded to 3 digits`, or
  `none – the pages write the bare name`), and for a venue or festival the city the pages put
  behind it. Each line carries its count – `9 of the 10 newest pages`, or `all 5 newest pages
  (the older ones disagree – newer pages win)` where the series changed its convention. What
  was applied to the suggestion leads the section as a before → after line; a title edited by
  hand is never rewritten and the section says so. The section closes with `Final title:` –
  the title as one chip, now green: every stage has run, this is the state the **Create** link
  uses, and a correction typed into the field above shows here as well

- **6 Categories for the mix page** – the `[[Category:…]]` lines the **Create** link writes.
  The artist and the entity line each start with **why that name got the slot** – `picked as
  the entity: "S.U.N Festival" carries an event word, so the title reads as a set PLAYED at
  it – it becomes the place behind the " @ ", and the channel is not used as a show on top of
  that`. That is the line to quote in a report when the wrong name ended up in a slot: it
  names the rule that put it there. Under it stands what the lookup knows – a known artist
  confirmed with its mix count, an unknown one flagged as possibly new or misspelled. A style
  the recent pages settled says so here too, with its count

- **7 Page text analysis of recent mixes** – what the same pages' wikitext settles about the
  page the **Create** link writes, one line per signal with its count: whether the pages open
  with an artwork named after the page itself (then the page text starts with the
  `[[File:…|right|360px]]` line, in the extension the siblings use – the live recordings among
  the siblings are left out of that count, and the line says how many), whether the file details
  are the dur table or a `{{StandardShow…}}` template (the template is only written when this
  file's duration roughly fits its stated length – a 40-minute file on a 2h show is a hint the
  category was misread), whether the pages use a `{{Player|mode=mirrors}}` with a line per
  platform (with the platform order those pages keep, and which line this player's URL lands
  on), whether the pages carry a **Notes** section – and, as a line of its
  own, which site those Notes link (`10 of the 10 newest pages link to groove.de (e.g. …)`) and
  where a page on it was found – the description, the **Buy** field, or behind a shortened link
  that had to be followed – so it is clear whether an empty Notes line means the series links
  nothing or only that this player named nothing –
  and which categories at least 90% of the pages share. That last one is
  **reported, never written**: the vote answers what those pages have in common, which is not
  the same question as what this mix sounds like. `Category:Undercurrent`'s newest pages carry
  Techno 5, House 3 and Tech House 2 – no style clears the bar – while `Amsterdam Dance Event`
  stands on all 10, because the venue's MixesDB pages happen to be festival sets. It shows up
  as a **Hints** chip and in section 6, and the page's style lines stay empty.
  Whatever clears no bar keeps today's default page text, so nothing here can make the page
  worse than before

The panel follows the title field: correct the title above and, after a short pause, the
categories are re-read from it and any new names are looked up on MixesDB. It follows the
tracklist box too: leave the box after an edit and the `Tracklist:` line in section 6 answers
the fresh verdict – nothing else in the panel changes, since the tracklist takes no part in the
title.

Opened while MixesDB is still being asked, the panel holds its space with grey pulsing
placeholder rows and shows the real content in one step once the answers are in.

### "Create" link

Opens the edit form of the new page, prefilled with:

- the leading `[[File:<page title>.jpg|right|360px]]` artwork line, where the entity's recent
  pages open with an artwork named after the page itself – in the extension those artworks
  use, and following the title field, so a corrected title takes the image name with it. Where
  the siblings name their artwork after something else (venues do) or carry none, no image
  line is invented. A **live recording** filed in a series category has no say here: its
  artwork is the event's flyer, named after the event, so a couple of `… @ Venue (Series 510)`
  pages can no longer talk a podcast out of the artwork line every one of its episodes carries.
  In a venue's or an event's own category, where all the pages are such recordings, they are
  the pages and they do decide
- the **File details** table (duration and what else the site gave away) – or the series'
  `{{StandardShow…}}` template instead, where that is the house style on the recent pages and
  this file's duration roughly fits it
- the `{{Player}}` with the player URL as MixesDB embeds it. Where the entity's recent pages
  publish every episode on two platforms – `{{Player|mode=mirrors}}` with a line per platform,
  as Groove Podcast, HATE Podcast, RA Podcast and XLR8R Podcast do – the new page gets that
  shape, with this player's URL on the line its platform stands on there and **the other line
  empty** for the mirror. MixesDB shows *"No value for one of the players!"* instead of a
  player until that line is filled in or deleted, so a page cannot go out with the mirror
  quietly missing. Series that use the plain one-URL player, and categories whose pages do not
  agree, keep the plain one
- an empty **Notes** section above the tracklist, where the entity's recent pages carry one –
  the place the link to the episode's own page goes, kept free so it does not have to be typed
  first. Where those Notes all link the same site, that link is filled in – looked for both in
  the description and in the player's **Buy / Free download** field, which is often where the
  episode's page is linked on a track whose description says nothing. On SoundCloud a
  **shortened link is followed** to get there: Groove Podcast writes "Go to bit.ly/… for track
  list" instead of the `groove.de` address its pages carry, and that is where the address comes
  from. Only a link that really leads to the site those Notes use is written – anywhere else
  and the line stays empty, and a URL is never built out of the title. Series that use no Notes
  section get none
- the categories the title gives away (year, artists, the entity the page is filed under)
- the style categories, where the site suggests any (TrackId.net's style suggestions box) –
  otherwise two empty category rows to fill in. What the entity's recent pages share is offered
  as a **Hints** chip under the row and never written for you
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

Characters that are invisible in a description never reach the box either. A non-breaking space,
one of Unicode's other blanks, a zero-width joiner, or a line separator an uploader pasted out of
a word processor all look exactly like an ordinary space – or like nothing at all – where they
were typed, but they are none, and one sitting between the numbering and the track used to ride
along into the created page as a stray blank (`#  Artist - Title`). They are read as the space
they look like, and the zero-width ones are dropped.

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

A tracklist written **without the spaces around that dash** – `Miret-Sabio Espejo (Original Mix)`
– is read too, and arrives in the box as `Miret - Sabio Espejo (Original Mix)`. It is only looked
for when the description yielded no tracklist any other way, and only where the letter behind the
dash is a capital and the title carries on behind it: a hyphen with no space around it is a
hyphen inside a word far more often than it is a separator, `Jerome Isma-Ae - Encounter` has to
keep splitting where its uploader put the spaces, and a line that simply ends after the compound
(`Live at Berlin-Mitte`) is prose.

A **credit the uploader wrapped onto a line of its own** no longer cuts the tracklist in two.
`Oliver Koletzki,` on one line and `Niko Schwind, Sidartha Siliceo-Satinka (Kermesse Remix)` on
the next are one track and arrive as one row. A line ending in a comma that carries no track of
its own is the front of the line below it – a track whose title really ends in a comma keeps its
own row.

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

A site script may have changed the tracklist before the box ever saw it. When it has, it says so
in the box: an extra row prints below the Tracklist Editor's own feedback, and the box goes into
warning mode for it – the same red the Editor uses for its own warnings, because a change nobody
asked for is the thing that must not be saved unlooked-at. SoundCloud is the case this exists
for; it replaces the channel handles uploaders credit remixers by with the names those channels
carry, and the row lists every one of them. The warning does not change which
`[[Category:Tracklist: …]]` the page is filed under – that stays whatever the Tracklist Editor
says about the text.

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
- A tracklist written with no spaces around the dash is missed when the artists are written
  lowercase (`stbr-Reservoir`): the capital behind the dash is what tells such a separator from
  a hyphen inside a word, and without it the tracklist would be cut in the wrong place more
  often than not.
- The mirrors `{{Player}}` can only ever be written half-filled: a player page knows its own
  URL, never the mirror's. And the shape is only copied where at least 90% of the recent pages
  agree on it – Boiler Room really does publish every set on YouTube and SoundCloud, but two of
  its ten newest pages carry only one of the two, so a page created there keeps the plain
  player.
- The arrow keys in the modal stop working once you have clicked *inside* the framed MixesDB
  page – from then on the keys belong to that page and scroll it. A click on the modal's header,
  or one of its two arrow buttons, hands them back. Scrolling the framed page with the mouse or
  the trackpad needs no click and leaves the keys alone.
- Shortened **Notes** links are only followed on SoundCloud, and only for the handful of
  shorteners the script knows (`bit.ly`, `tinyurl.com`, `t.co` and a few more). On TrackId.net
  they are not followed at all – the script would need a permission it deliberately does not
  ask for – so the same episode opened there gets the empty Notes section. Report a shortener
  that is missing and it can be added.

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
4. ✅ **Title and page text learned from the show's existing pages** – live since 2026-08-18.
   The ~10 newest pages of the entity's category are read with their wikitext, and whatever at
   least 90% of them agree on (or all of the 5 newest, where the series changed its
   convention) shapes the suggestion and the created page: the episode number format
   (`Trommel.234` vs `HATE Podcast 498` vs `RA Podcast (RA.1051)`, zero-padding included), the
   name's spelling as the titles write it, the city behind a venue or festival, the leading
   `[[File:…|right|360px]]` artwork line where the series opens with one, `{{StandardShow2h}}`
   instead of the file details table where that is the house style, an empty **Notes**
   section where the series keeps one – with the episode's own page link already in it where
   the description names it – and the `{{Player|mode=mirrors}}` of a series that publishes
   every episode on two platforms, with the line for the second one left empty.
   A category at least 90% of
   the recent episodes share is shown as a **Hints** chip and never written onto the page –
   what those pages have in common is not what this mix sounds like. Two new reasoning panel
   sections show what was read and what it changed. `Category:Promo Mix` is exempt – it
   collects unrelated mixes.

5. **End of the beta** – the row stops appearing altogether for a mix that already has a page.
   The **Exists** row is a beta device for comparing the suggestion against the title a human
   chose; once the suggestion is good enough that this is not worth reading any more, a mix with
   a page gets no row at all. Only worth doing after steps 2 and 3, since those are what make a
   *missed* existing page unlikely – the row may only go quiet once it is trustworthy about
   duplicates.

Design decisions and the measurements behind each step: `row_enrichment.md`,
`page_text_learning.md`, `mixesdb_api_request.md`.
