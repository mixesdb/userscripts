# Page creator

The row next to a player holding a suggested MixesDB mix page title and a **Create** link that
opens the new page's edit form already filled in. Shared by the site scripts, so it looks and
behaves the same everywhere.

- **Runs on:** every site whose script loads it – currently [SoundCloud](../../SoundCloud/)
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** [Tracklist box](../tracklist_editor/)

## Features

### Suggested mix page title

Built from the player title, the uploader/channel name and the upload date, in MixesDB's own
title format (`YYYY-MM-DD - Artist - Show`). The field is editable – the suggestion is a starting
point, not a decision – and a confidence score next to it says how sure the suggestion is.

The row only appears for mixes that are **not on MixesDB yet**, and only for recordings of at
least 20 minutes, which is MixesDB's lower limit. Whether a player is already used is the
[Toolkit](../toolkit/)'s answer, so the row shows up once the toolkit box next to it
has one.

### "Report" box

**Report** under the confidence score opens a text box under the row, already filled with
everything a report about a wrong title needs: the player's URL, the title, channel name and date
the site handed over, the title that came out of them, the score, and the artist and entity
categories the page would be filed under. Underneath are the empty lines only you can fill in – what went wrong and
what the title and its categories should have been.

Copy the box, correct it and post it on Discord. It is always as tall as its text and grows as
you type. Editing the title field above refills it, but anything typed into the box itself is
never overwritten.

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
