# Page creator

The row next to a player holding a suggested MixesDB mix page title and a **Create** link that
opens the new page's edit form already filled in. Shared by the site scripts, so it looks and
behaves the same everywhere.

- **Runs on:** every site whose script loads it – currently [SoundCloud](../../SoundCloud/)
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** [Toolkit](../README.md#toolkit), [Tracklist box](../README.md#tracklist-box)

## Features

### Suggested mix page title

Built from the player title, the uploader/channel name and the upload date, in MixesDB's own
title format (`YYYY-MM-DD - Artist - Show`). The field is editable – the suggestion is a starting
point, not a decision – and a confidence score next to it says how sure the suggestion is.

The row only appears for mixes that are **not on MixesDB yet** (the toolkit decides that) and
only for recordings of at least 20 minutes, which is MixesDB's lower limit.

### "Report" box

**Report** behind the confidence score opens a text box under the row, already filled with
everything a report about a wrong title needs: the title, channel name and date the site handed
over, the title that came out of them, the score, and the artist and entity categories the page
would be filed under. Underneath are the empty lines only you can fill in – what went wrong and
what the title and its categories should have been.

Copy the box, correct it and post it on Discord. Editing the title field above refills the box,
but anything typed into the box itself is never overwritten.

### "Create" link

Opens the edit form of the new page, prefilled with:

- the **File details** table (duration and what else the site gave away)
- the `{{Player}}` with the player URL as MixesDB embeds it
- the categories the title gives away (year, artists, the entity the page is filed under)
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

The box is behind a **Tracklist** headline that toggles it, and a bracket behind that headline
says where the tracklist was read from. What is in the box at the moment **Create** is clicked is
what goes onto the page, so corrections stick. The `[[Category:Tracklist: …]]` of the new page
follows what the Tracklist Editor API says about the box's final content.

Mixes that are already on MixesDB get the headline only – the tracklist is formatted on the first
click, not before, so no request is wasted.

## Known limitations

- The title suggestion leans on hand-maintained word lists (`title_definitions.js`), so shows,
  labels and venues it has not seen before can end up in the wrong part of the title. Report a
  wrong suggestion on Discord – the **Report** box has the whole case ready – and it becomes a
  test case.
- MixesDB category names are not yet used to resolve artists, shows and venues – that work waits
  on a wiki API endpoint.
- Only tracklists written as a run of neighbouring lines are detected. A tracklist scattered
  through a description is left alone on purpose: a wrong tracklist on a new page is worse than
  none.
