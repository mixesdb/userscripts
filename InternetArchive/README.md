# Internet Archive (BETA)

Turns an archive.org item holding a whole set of recordings into a sortable table with download
links and a MixesDB usage check per file.

- **Runs on:** archive.org/details/* – items with a playset list
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js)
- **Shared features:** none – the usage check in the table is this script's own, not the
  [Toolkit](../shared/toolkit/)

## Features

### Episode table

Below the player, a sortable table of every recording in the item:

- number, name and the detail part of the file name (usually the artist)
- duration
- a download link per available format – `.ogg` is dropped when an `.mp3` exists for the same
  recording, and the full file name is on the link as a tooltip

### MixesDB usage per file

The last column says whether the file is already used on MixesDB: the mix page as a link, or
**Slug not used** linking to the search that was run. The lookup searches MixesDB's wikitext for
the file's archive.org path, so it finds the file wherever on the page it was used.

### API link

A link to the item's archive.org metadata endpoint above the table.

## Known limitations

- Beta. Only items whose page renders a playset list are handled; a single-file item gets nothing.
- Recordings without a download URL cannot be checked and say so in the table.
- One MixesDB request per recording, so an item with hundreds of files fills the last column
  gradually.
