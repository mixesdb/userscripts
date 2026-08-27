# Tracklist Importer (beta)

Carries a tracklist a userscript found – TLE-formatted, sitting in the
[Tracklist box](../tracklist_editor/) – over to the MixesDB mix page the
[Toolkit](../toolkit/)'s player search matched, and prepares that page's edit form so the only
thing left to do is check the diff and save.

- **Runs on:** every site whose userscript loads it and shows the toolkit with player search –
  TrackId.net first – plus mixesdb.com/w/* for the edit-form part
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** part of the shared set; the site script's README says where it shows up

## Features

### Insert and Merge links in the toolkit

When the toolkit found the mix page on MixesDB and the page has a filled tracklist box, the mix
page's current text is checked:

- **no tracklist yet** – an **Insert** link appears in front of the toolkit's EDIT link
- **a tracklist exists** – a **Merge** link appears there instead
- **a tracklist that already holds everything the found one has** – no link, but a short note
  in its place saying so: **Identical** when the two lists are the same list, **Nothing to add**
  when the page holds everything the found tracklist has and more. The merge is tried before the
  link is offered, and one that would leave the page text as it is only leads to MediaWiki's
  "(No difference)". Hover the note for the reason – and the **Report** link stands behind it
  just as it does behind Insert and Merge, with the verdict named in the report.

Both links open the mix page's edit form in a new tab with the work already done.

**Identical** also ticks the toolkit's **TID tracklist is integrated** checkbox for you: when the
mix page carries exactly this tracklist, it *is* integrated. It is the certain reading – every
track of the found tracklist sits on the page, the page has no track the found one is missing,
and there is nothing left over the merge could not place. **Nothing to add** never ticks anything:
the page knows more than the found tracklist there, and whether that counts as integrated is your
call.

### Insert

The found tracklist goes into the page's empty Tracklist section: inside `<list>` tags when it
has gaps (`...`), replacing the tag when every track is a numbered `#` line – the same rule the
[page creator](../page_creator/) writes new pages by.

### Merge

The mix page's existing tracklist is the **original**, the found one the **candidate**. The
original is treated as more correct; the candidate only enriches it:

- cue times and labels are added to tracks both lists carry
- `?` unknown tracks are filled with the candidate's identification – keeping the original's
  own, usually more precise cue time
- undiscovered tracks are inserted between existing consecutive tracks
- tracks are added in `...` gaps
- an unknown the candidate found *behind* the last track of the tracklist is appended, even
  when the tracklist has no gaps at all – it is the one hint that the mix runs on past where
  the page ends

Titles are matched fuzzily, so spelling differences between the two sources do not produce
duplicates, and the candidate's cues are converted to the cue format the original already uses.
One exception: when the mix turns out to run past what the original's cue format can say – a
track was detected at `[106]` but the page counts minutes in two digits – the whole list
switches to the wider format (`[08]` becomes `[008]`, `[??]` becomes `[???]`) instead of mixing
both widths.

### On the edit form

The edit form opens with the tracklist inserted or merged, the `Tracklist:` category and the
indicator icons under the edit box updated to what the Tracklist Editor says about the new
tracklist (an existing `Tracklist: complete` is never downgraded) – and **Show changes** is
clicked for you, so the first thing on screen is MediaWiki's own diff. Until that diff has
loaded, **Save changes** and **Show preview** are locked: nothing can be saved unseen.

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

### Report link

Behind the Insert/Merge link – and behind the **Identical** / **Nothing to add** note, where a
wrong verdict is the very thing worth reporting – sits **Report**: it opens a paste-ready Discord
report holding the mix page's original tracklist, the found candidate and the raw merge result,
plus the empty `Mistakes / learnings` and `Expected` lines only the reporter can fill – like the page
creator's Report box.

## Known limitations

- Beta, on TrackId.net only so far.
- Mix pages whose tracklist has chapters (`;Name` rows) are skipped – merging those needs its
  own logic.
- The merge is a heuristic: fuzzy matching is a threshold, not certainty, and track insertion
  goes by cue times. Always read the diff before saving – that is why Save is locked until
  **Show changes** ran.
- The candidate travels in the link's URL fragment; the link must be followed normally
  (left/middle/ctrl-click) for it to arrive.
