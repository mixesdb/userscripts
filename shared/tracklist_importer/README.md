# Tracklist Importer (beta)

Carries a tracklist a userscript found – TLE-formatted, sitting in the
[Tracklist box](../tracklist_editor/) – over to the MixesDB mix page the
[Toolkit](../toolkit/)'s player search matched, and prepares that page's edit form so the only
thing left to do is check the diff and save. On a mix page's edit form it also works the other
way round: **merge mode** takes a tracklist you paste in from anywhere.

- **Runs on:** every site whose userscript loads it and shows the toolkit with player search –
  TrackId.net and 1001tracklists.com so far – plus mixesdb.com for the edit-form part, which the
  [MixesDB Userscripts Helper](../../MixesDB_Userscripts_Helper/) carries as well, so merge mode
  is there whether or not a player-site script is installed
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** part of the shared set; the site script's README says where it shows up

## Features

### Insert and Merge links in the toolkit

When the toolkit found the mix page on MixesDB and the page has a filled tracklist box, the mix
page's current text is checked:

- **no tracklist yet** – an **Insert** link appears in front of the toolkit's EDIT link
- **a tracklist exists** – a **Merge** link appears there instead
- **the tracklist is split into chapters** (`;Name` rows, one per set) – a **Chaptered** link
  appears there. Merging into one chapter is not supported yet, so it imports nothing: it opens
  the edit form with the page's tracklist and the found one side by side, for the merge by hand.
  The same link appears when the *found* tracklist is the chaptered one – 1001tracklists'
  multi-set pages are – because a merge would swallow its chapter rows as track titles. Only a
  merge is stopped by chapters: a chaptered tracklist going into a page without one is a plain
  **Insert**, chapters and all

All three open the mix page's edit form in a new tab – the first two with the work already done.

Where none of them can be offered, a short note stands in the link's place and says why – hover
it for the full reason. The row never just stays empty; an empty row would only look like a
broken userscript:

- **Identical** – both lists are the same list. Nothing to merge, and following a link would
  only lead to MediaWiki's "(No difference)"
- **Nothing to add** – the page's tracklist holds everything the found one has, and more
- **No Tracklist section** – the page has no `== Tracklist ==` section, so there is nothing to
  insert into
- **Page unreadable** – the page's text could not be fetched just now; reload to try again

The **Report** link stands behind every one of them, exactly as it does behind Insert and Merge,
and the report names the verdict – a verdict you disagree with is the very thing worth reporting.

**Identical** and **Nothing to add** also tick the toolkit's **TID tracklist is integrated**
checkbox for you – on TrackId.net, the one site that has the checkbox; everywhere else the note
only says so (on 1001 Tracklists in the same green, right away). Both mean every track of the
found tracklist is on the mix page: with **Identical** the two lists are the same list, with
**Nothing to add** the page carries more on top of it – either way the found tracklist *is*
integrated. It says so before it does it – the note fades to green and the box is ticked a
moment later, so the tick happens in front of you and not behind your back. Tick it yourself in
that moment and nothing else happens.

### Insert

The found tracklist goes into the page's empty Tracklist section: inside `<list>` tags when it
has gaps (`...`), replacing the tag when every track is a numbered `#` line – the same rule the
[Page Creator](../page_creator/) writes new pages by.

The review block below opens for an insert as well, so the list that just went in can be
adjusted in the page's own Tracklist Editor right away.

### Merge

The mix page's existing tracklist is the **original**, the found one the **candidate**. The
original is treated as more correct; the candidate only enriches it:

- cue times and labels are added to tracks both lists carry
- `?` unknown tracks are filled with the candidate's identification – keeping the original's
  own, usually more precise cue time
- a track does not have to be a bare `?` to count as unknown: `ID`, `Chris Stussy - ?` and
  `? - Untitled (B1)` are half-known rows, and the candidate fills the half that is missing –
  the label, the title, the whole credit. Rows like these are recognized by their cue time, so
  the halves both lists *do* know have to agree: a page row without an artist takes a found row
  without one, a page row without a title only one that credits the same artist
- undiscovered tracks are inserted between existing consecutive tracks
- tracks are added in `...` gaps
- an unknown the candidate found *behind* the last track of the tracklist is appended, even
  when the tracklist has no gaps at all – it is the one hint that the mix runs on past where
  the page ends

A found track is only inserted where the merge can actually place it. It goes in front of the
first page track with a later cue time, and so lands at the end of whatever run of rows without
a cue sits in front of that track. Over one or two rows that is a near miss you move by hand;
over a whole block of them the track ends up nowhere near the minute it was detected at – and
where that block holds rows the page could not name (`Exos - ?`), the found track may well *be*
one of them and would be written into the page a second time. A track with more than two such
unplaceable rows in front of it is therefore left out of the merged list and stays highlighted
in the Candidate column, for you to place yourself. The end of the list is not that kind of
guess: nothing follows the last row, so a track detected behind it is appended as before.

Titles are matched fuzzily, so spelling differences between the two sources do not produce
duplicates. Artist and title are compared apart as well, so an artist the page writes shorter
than the player site does – `Costigane` where the site says `Brendan Costigane` – is still the
same track as long as the title matches: the page's spelling stays, the site's one stands in the
Candidate column for you to judge.

A page row that has artist and title **the other way round** is found as well: `Caprock -
Majestic` on the page and `Majestic - Caprock` on the player site are one track, and until now
the found one was written into the page a second time. The two halves are held against each
other crosswise for this, and both have to answer – the page's artist against the site's title
*and* the page's title against the site's artist – which is why they may be spelled a little
more loosely than a straight comparison allows. This is the one place where the found row wins
the text: nothing of the page is lost by turning the two halves round, and the player site reads
its credit off a release database while the page row was typed by hand. The Original column
shows the row as the page had it, so the change is visible in the comparison.

A **text row** – a line the page carries in MixesDB's italics because it is not a readable
`Artist - Title`, like `''? (Nick Stoynoff Remix) [Tronic]''` – keeps those marks. Filling in
nothing but its cue used to hand the row back bare, so the page lost the marking on every merge
that touched such a row. The marks go if the found tracklist actually names the track, because
then the row is no longer the unreadable one the page marked.

The candidate's cues are converted to the cue format the original already uses.
Two exceptions: when the mix turns out to run past what the original's cue format can say – a
track was detected at `[106]` but the page counts minutes in two digits – the whole list
switches to the wider format (`[08]` becomes `[008]`, `[??]` becomes `[???]`) instead of mixing
both widths. And a page whose tracklist has no cue at all has no format to keep, so the found
tracklist's is used for the whole list.

Tracks the found tracklist does not know keep an unknown cue, and that cue says as much as the
list allows: a track between `[095]` and `[098]` can only have played in minute 09x, so it reads
`[09?]`. Between `[098]` and `[103]` the two neighbours agree on nothing and it stays `[???]`.
Nothing is filled in where more unknown tracks sit between two cues than there are minutes
between them.

The two ends of the list are read the same way:

- the **first** track is where the recording starts, so an unknown cue on it is written `[00]`
  outright – not a guess, unlike the ones above. Unless a `...` gap stands in front of it: then
  the list does not start there and the cue stays unknown
- behind the **last** known cue the mix **runtime** takes the part of the missing neighbour: a
  track behind `[61]` in a 1:04:54 mix can only have played in minute 6x, so it reads `[6?]`.
  The runtime comes from the player site where it prints one (TrackId.net does, above its
  tracklist), otherwise from the `dur` cell of the mix page's own File details table. Without
  either nothing is filled in there – the mix runs on from the last cue and nothing says how far

A `...` the merge filled up is taken out again. A gap says tracks are missing at that spot, and
once the found tracklist has put its own tracks in there the cues around it often say the
opposite: nothing fits in the few minutes that are left. The merged list is measured against
itself for this – the median time from one track to the next where no `...` stands between them
is what one track of this mix runs, and a gap has to span more than one and a half times that to
still be believable. In the reported Luke Slater set that median is 4 minutes: the gaps spanning
3 and 5 minutes go, the ones spanning 7 and 9 minutes stay. The Original column still shows every
`...` the page had, so a dropped one is visible in the comparison.

Three things keep this careful: it only runs where the merge actually added something, so a page
the found tracklist has nothing to give is never rewritten; every track in the list has to carry
a real cue, because one `[??]` makes the times around it guesses; and a `...` at the very start or
the very end of the list is left alone, having only one cue next to it.

### On the edit form

The edit form opens with the tracklist inserted or merged, the `Tracklist:` category and the
indicator icons under the edit box updated to what the Tracklist Editor says about the new
tracklist (an existing `Tracklist: complete` is never downgraded) – and **Show changes** is
clicked for you, so the first thing on screen is MediaWiki's own diff. Until that diff has
loaded, **Save changes** and **Show preview** are locked: nothing can be saved unseen.

Behind a **Chaptered** link none of that happens: the page text is left untouched, nothing is
locked and nothing is clicked. Only the review block below opens, so the merge can be done by
hand there.

### Review block above the edit box

After a merge, a three-column block sits between MediaWiki's diff and the wiki textbox – after
an insert it has two of them, see below:

- **Original** – the tracklist the page had, with the parts the merge changed highlighted
- **Merged** – the result as applied, in the same editable [Tracklist box](../tracklist_editor/)
  the player sites show: it grows with the text, checks itself against the Tracklist Editor
  (with the Live updates switch, the API call counter and the row count under it – no
  tracklist state icons, the real ones under the edit box are on the same page), so final
  fixes can be made right there. The **Apply** button below writes
  the box back into the page: the tracklist section, the `Tracklist:` category and the
  indicator icons under the edit box, all in one click. It is greyed out until the box actually
  says something else than what the merge already put into the page – on arrival there is
  nothing to apply, and after applying it goes quiet again.
- **Candidate** – the tracklist the player site found: green marks the parts the merge took
  over, orange the parts it could not place – a label the page already had differently, a cue
  that was not taken, a track that found no spot. Salvage the orange parts by hand into the
  Merged box if they are worth it; parts the page simply already had stay plain.

The bars between the columns can be dragged to give one of them more room – double-click a bar
for three equal columns again. Every block starts with three equal columns: the widths belong to
the merge in front of you, not to the one before it. The button in the block's top left corner
stretches the block to the left over the sidebar and back – its right edge stays where the
content column ends, and that choice IS remembered per browser. On a narrow window the three
columns stack on top of each other instead, in the same order.

The block is a fieldset named **Diff**, like the form's own sections. By default it moves down
to the page's own full Tracklist Editor as soon as that section has loaded: block and editor
section stand directly below the wiki's Save/Preview buttons, the Merged text goes into that
editor, the empty Merged column disappears, and Original and Candidate stay side by side above
it – so final fixes happen in the editor you know, with its menu, find/replace and undo. Below
the editor's own buttons the block adds an **Apply** button and the Live updates switch (no
tracklist state icons here either, for the same reason as in the Merged column).
That Apply always writes what stands in the editor at the moment you click it, so anything the
editor's own buttons just did to the text goes into the page with it; it is only greyed out
while the box is empty. Clicked while the Tracklist Editor is still answering one of those
buttons it says **One moment**, waits for the answer, and then applies the settled text by
itself – one click is enough, however fast it followed the button.
The arrow button in the block's top right corner moves everything back up above the edit box,
and down again – the text travelling along both ways, so toggling never loses an edit, and the
page scrolls along to wherever the block just went. Like the widen choice, your last click is
remembered per browser: moved up once, the block stays up on the next mix page too.

Blanks and `...` gaps are never highlighted. The block stays while you preview or compare, so
fixes can be applied at any point before saving – but not when the compare comes back empty: a
merge that changed nothing after all drops the block instead of repeating what the edit box
already holds.

Behind an **Insert** link there is no block on screen at all. The inserted tracklist goes
straight into the page's own Tracklist Editor, which stands directly below the wiki's
Save/Preview buttons with the **Apply** button and the Live updates switch under it – exactly
what a merge looks like once its block has moved down. Correcting the list you just inserted
happens in the editor you know, with its menu, find/replace and undo, instead of copying it down
there by hand first.

An insert has no second state and no arrow button: the page had no tracklist, so there is
nothing an Original column could show, and the Candidate is the very same list the editor
already holds – a block above it could only repeat what is right there. Your remembered up/down
choice is left alone on such a page; it belongs to the merges. Only when the edit form's own
Tracklist Editor never loads does the block appear after a few seconds instead, named **Diff –
the page had no tracklist, the whole list was inserted**, with the two columns **Inserted** and
**Candidate** and its own Apply button, so the list can still be read and corrected.

Behind a **Chaptered** link the same block opens without a merge behind it: the fieldset is named
**Diff – chaptered page, nothing was merged** (or **chaptered tracklist**, when the found one
carries the chapters), Original shows the page's tracklist and Candidate
the found one, both exactly as they stand – numbering, chapter rows, wiki markup and blank lines
included – and nothing is highlighted, because no merge ran to claim anything. The Merged box in the middle is empty on purpose: build the tracklist for the
whole section there, chapters included, and **Apply** writes it into the page like after any
merge. This block also stays when a compare comes back empty – on a page nothing was written
to, that is the normal answer, and the found tracklist has to stay on screen for the hand work.

### Merge mode on the edit page

Everything above needs a player site in front of it. A tracklist you simply **copied** from
somewhere – a forum post, a comment, a site no userscript of ours runs on – gets in the other
way: on the edit form of a mix page that already has a tracklist, a small **Merge mode** link
sits in the Tracklist editor section's own label, right behind its name. It opens merge mode and
goes; the section below it is untouched until you actually merge something.

Merge mode is the same review block, with one column turned round:

- **Original** holds the page's tracklist as it stands
- **Merged** is empty – **nothing is filled into any editor before a merge has run**, so the
  Tracklist Editor you may already be working in keeps what you typed
- **Candidate** is an empty box to paste into

Below both columns stands one button, and it is the same button throughout. While the Candidate
box is empty it reads **Paste clipboard & merge**: the tracklist is on your clipboard anyway, so
it fetches it, drops it into the Candidate box and merges, all on one click. Type or paste into
the box yourself and it becomes a plain **Merge** – it then merges what stands there and never
touches the clipboard. Where a browser will not hand the clipboard over (Firefox does not let a
page script read it at all, Chrome asks and may be told no), the block says so and puts the caret
in the box for you.

What you paste is run through the Tracklist Editor once before it is merged, the way a tracklist
sitting in a player site's box already has been. So `1. 05:23 Artist – Title (Label)` is read as
the tracklist it is, and what the merge takes over from it arrives in the page's own formatting
rather than the other source's.

After the merge the three columns read exactly as after a link merge: the Original with what the
merge changed highlighted, the merge result in the box, the pasted list with green for what was
used and orange for what could not be placed. The button below still says **Merge**, and one
click on it does the whole next source at once: the Candidate column is emptied, what you copied
goes in, and the merge runs – so several sources can go into one page one after the other, each
building on the result of the last.

Original and Candidate are held to the same height throughout, before the merge and after it.
Both sides are measured rather than counted in lines, so a long track row that wraps onto two
lines on screen is accounted for.

The one difference to a merge behind a link: **nothing is written to the page until you press
Apply.** You are already standing on the form with your own text in the box, so no page text is
rewritten under you, MediaWiki's **Show changes** is not clicked for you and Save is never
locked. Apply is awake from the moment a merge has run – that is the step that writes the
tracklist, the `Tracklist:` category and the indicator icons.

Two things merge mode says instead of doing them, in a line under the block's name:

- a **chaptered** tracklist on either side is not merged, here as little as behind a link – both
  lists stay on screen as they are and the Merged box is where you put them together
- a merge that **took nothing** from the pasted list says so; the page's tracklist already holds
  everything it says

Reloading the edit form closes merge mode. The **Merge mode** link only appears where there is
something to merge into: a page whose `== Tracklist ==` section is empty has nothing for a merge, and pasting
a list into the page's own Tracklist Editor is all an insert would be.

### Marked as integrated after the save

The Insert/Merge/Chaptered link opens the edit form in a **new tab**, so the toolkit row stays
where it is – and from there the mix page is watched for the save. Once its tracklist carries the
found one, the **TID tracklist is integrated** checkbox of the same row is ticked for you: an
**Integrated** note takes the link's place in front of **Report**, fades to green, and the tick
lands a moment later – the same row and the same announced tick the **Identical** verdict makes.
Tick it yourself in that moment and nothing else happens. The link goes because it carried the
page's tracklist from before the save; reload the player page for a link that knows the current
one.

What it waits for is not a *changed* tracklist – somebody else's edit changes it too, and the
tick cannot be taken back – but a tracklist that took *this* one in: what the merge would still
write into the page has to have gone down. A save that kept only part of the found tracklist
counts as well, because the page then holds what the reader let in. Behind a **Chaptered** link,
where no merge runs, a tracklist that grew in the hand-merge is the answer instead.

The page is asked every 5 seconds in the first minute, every 10 seconds in minutes 2 to 4 and
every 30 seconds in minutes 5 to 10, then the watch gives up. Leaving the player-site page or
closing its tab ends it too, and so does the checkbox being handled meanwhile. Only TrackId.net
has that checkbox – on every other site there is nothing to tick and nothing is watched.

### Report link

Behind the Insert/Merge link – and behind every note that replaces it – sits **Report**: it opens a paste-ready Discord
report holding the mix page's original tracklist, the found candidate, the mix runtime where the
site prints one and the raw merge result, plus an empty `Mistakes / learnings` list and an empty
`Expected` code block only the reporter can fill – like the Page Creator's Report box.

A **Cue gaps** block sits between the found tracklist and the merged result, one line per
tracklist – the page's, the found one and the merged one. Each says how many tracks and how many
`...` the list holds, how long one of its tracks runs (the median from one track to the next
where no `...` stands between them), over how many such distances that was measured, and how
much span a `...` therefore needs to survive. Under it stands one line per `...`: the two tracks
it sits between, the minutes it spans and whether the merge dropped it or kept it. That is the
reading behind every gap the merge removes, so a report about a `...` that went or stayed can be
checked instead of guessed at. Where nothing could be measured the line says so – a list with a
`[??]` cue in it, or one with too few tracks in a row to tell how long a track runs.

## Known limitations

- Beta, on TrackId.net and 1001tracklists.com so far.
- Chaptered tracklists (`;Name` rows) are never merged automatically, on either side: neither
  into a mix page whose tracklist has chapters, nor from a found tracklist that carries them –
  merging chapters needs its own logic. The **Chaptered** link opens the review block for the
  merge by hand, and the Report link stands behind it as everywhere else.
- The merge is a heuristic: fuzzy matching is a threshold, not certainty, and track insertion
  goes by cue times. Always read the diff before saving – that is why Save is locked until
  **Show changes** ran.
- A tracklist without cue times gives the merge almost nothing to order new tracks against, so
  on such a page most found tracks stay in the Candidate column instead of being inserted. That
  is deliberate – see above – but it means the merge adds little there beyond cues and labels
  for the tracks it recognized.
- The candidate travels in the link's URL fragment; the link must be followed normally
  (left/middle/ctrl-click) for it to arrive. Merge mode has no link and no fragment – what you
  paste is what it merges.
- Merge mode lives in whichever of the installed scripts owns the edit page, and a script that
  has not been updated does not know it: with an old TrackId.net or 1001 Tracklists next to a
  current MixesDB Userscripts Helper the button can stay away. The browser console names the
  owner on every edit form (`tlImporter: "…" owns this page`) – update that script.
- The watch that ticks the integrated checkbox after the save lives in the player-site tab:
  close it or navigate on there and the checkbox stays for you. It also gives up after
  10 minutes – a save that comes later is not seen.
