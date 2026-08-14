# radioeins

Turns the played-tracks table of a radioeins page into MixesDB wiki syntax.

- **Runs on:** radioeins.de – pages with a track table
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/radioeins/script.user.js)
- **Shared features:** [Tracklist box](../shared/tracklist_editor/)

## Features

### Tracklist in wiki syntax

The page's track table as a MixesDB tracklist in an editable box above it, one `Artist - Title`
per row. A row with only one of the two comes through with what it has.

## Known limitations

- No cues: radioeins publishes no track times in that table.
- One box per table – a page with several tables gets several boxes.
