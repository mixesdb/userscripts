# Tracklist Importer (beta)

Carries a tracklist a userscript found – TLE-formatted, sitting in the
[Tracklist box](../tracklist_editor/) – over to the MixesDB mix page the
[Toolkit](../toolkit/)'s player search matched, and prepares that page's edit form so the only
thing left to do is check the diff and save.

- **Runs on:** every site whose userscript loads it and shows the toolkit with player search –
  TrackId.net and 1001tracklists.com so far – plus mixesdb.com/w/* for the edit-form part
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

Titles are matched fuzzily, so spelling differences between the two sources do not produce
duplicates. Artist and title are compared apart as well, so an artist the page writes shorter
than the player site does – `Costigane` where the site says `Brendan Costigane` – is still the
same track as long as the title matches: the page's spelling stays, the site's one stands in the
Candidate column for you to judge. The candidate's cues are converted to the cue format the
original already uses.
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

After a merge, a three-column block sits between MediaWiki's diff and the wiki textbox:

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

Behind a **Chaptered** link the same block opens without a merge behind it: the fieldset is named
**Diff – chaptered page, nothing was merged** (or **chaptered tracklist**, when the found one
carries the chapters), Original shows the page's tracklist and Candidate
the found one, both exactly as they stand – numbering, chapter rows, wiki markup and blank lines
included – and nothing is highlighted, because no merge ran to claim anything. The Merged box in the middle is empty on purpose: build the tracklist for the
whole section there, chapters included, and **Apply** writes it into the page like after any
merge. This block also stays when a compare comes back empty – on a page nothing was written
to, that is the normal answer, and the found tracklist has to stay on screen for the hand work.

### Report link

Behind the Insert/Merge link – and behind every note that replaces it – sits **Report**: it opens a paste-ready Discord
report holding the mix page's original tracklist, the found candidate, the mix runtime where the
site prints one and the raw merge result, plus an empty `Mistakes / learnings` list and an empty
`Expected` code block only the reporter can fill – like the Page Creator's Report box.

## Known limitations

- Beta, on TrackId.net and 1001tracklists.com so far.
- Chaptered tracklists (`;Name` rows) are never merged automatically, on either side: neither
  into a mix page whose tracklist has chapters, nor from a found tracklist that carries them –
  merging chapters needs its own logic. The **Chaptered** link opens the review block for the
  merge by hand, and the Report link stands behind it as everywhere else.
- The merge is a heuristic: fuzzy matching is a threshold, not certainty, and track insertion
  goes by cue times. Always read the diff before saving – that is why Save is locked until
  **Show changes** ran.
- The candidate travels in the link's URL fragment; the link must be followed normally
  (left/middle/ctrl-click) for it to arrive.
