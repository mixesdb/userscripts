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
- **a tracklist that already holds everything the found one has** – no link at all: the merge
  is tried before the link is offered, and one that would leave the page text as it is only
  leads to MediaWiki's "(No difference)"

Both open the mix page's edit form in a new tab with the work already done.

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

Titles are matched fuzzily, so spelling differences between the two sources do not produce
duplicates, and the candidate's cues are converted to the cue format the original already uses.

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
  (with the Live updates switch, the API call counter, the row count and the tracklist state
  icons under it), so final fixes can be made right there. The **Apply** button below writes
  the box back into the page: the tracklist section, the `Tracklist:` category and the
  indicator icons under the edit box, all in one click.
- **Candidate** – the tracklist the player site found: green marks the parts the merge took
  over, orange the parts it could not place – a label the page already had differently, a cue
  that was not taken, a track that found no spot. Salvage the orange parts by hand into the
  Merged box if they are worth it; parts the page simply already had stay plain.

The bars between the columns can be dragged to give one of them more room – double-click a bar
for three equal columns again. The button in the block's top left corner stretches the block
to the left over the sidebar and back; its right edge stays where the content column ends. Both choices are remembered per
browser. On a narrow window the three columns stack on top of each other instead, in the same
order.

Blanks and `...` gaps are never highlighted. The block stays while you preview or compare, so
fixes can be applied at any point before saving – but not when the compare comes back empty: a
merge that changed nothing after all drops the block instead of repeating what the edit box
already holds.

### Report link

Behind the Insert/Merge link sits **Report**: it opens a paste-ready Discord report holding the
mix page's original tracklist, the found candidate and the raw merge result, plus the empty
`Mistakes / learnings` and `Expected` lines only the reporter can fill – like the page
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
