# YouTube

Adds the MixesDB toolkit to YouTube videos long enough to be a DJ mix, plus the thumbnail and
file details a mix page needs.

- **Runs on:** youtube.com and youtu.be — watch pages and playlist pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit), [File details](../includes/README.md#file-details)

## Features

### Toolkit

Below the video title: is this video already on MixesDB — see
[Toolkit](../includes/README.md#toolkit). The player URL is handed over as `https://youtu.be/<id>`,
the form MixesDB embeds, and the same URL is offered as the copy-paste **Embed URL**.

Only videos of **at least 20 minutes** get a toolkit. Everything shorter is not a mix, and the
duration is checked before any request goes out.

### Thumbnail

The video's `maxresdefault` thumbnail below the title, linking to the full-size image.

### Duration and file details

The duration as a button in the action row. Clicking it opens the copy-paste ready
[File details](../includes/README.md#file-details) table.

### Submit a playlist to TrackId.net

On playlist pages, a submit link below the header's action row hands the whole playlist over to
TrackId.net.

## Known limitations

- youtube.com enforces Trusted Types, which blocks the way jQuery writes markup. The script
  installs a pass-through policy for it before anything else loads. Should Google ever restrict
  policy names, the whole script stops working — the console says so in its first line rather
  than failing silently.
- YouTube ships several playlist header layouts in parallel per account; the submit link attaches
  to the visible one. The console keeps snapshots of what was found, which is what a "the link is
  not there" report should be checked against.
- A video whose duration is not known yet gets its toolkit on a later poll, not immediately.
