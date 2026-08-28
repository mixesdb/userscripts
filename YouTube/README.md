# YouTube

Adds the MixesDB toolkit and Page Creator to YouTube videos long enough to be a DJ mix, plus
the thumbnail and file details a mix page needs.

- **Runs on:** youtube.com and youtu.be – watch pages and playlist pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Page Creator](../shared/page_creator/), [File details](../shared/README.md#file-details)

## Features

### Toolkit

Below the video title: is this video already on MixesDB – see
[Toolkit](../shared/toolkit/). The player URL is handed over as `https://youtu.be/<id>`,
the form MixesDB embeds, and the same URL is offered as the copy-paste **Embed URL**.

Only videos of **at least 20 minutes** get a toolkit. Everything shorter is not a mix, and the
duration is checked before any request goes out.

### MixesDB Page Creator

For videos the toolkit reports as not on MixesDB yet, the suggested page title and the
**Create** link sit above the toolkit – see [Page Creator](../shared/page_creator/). Title,
channel name, upload date, duration, artwork URL and description are read fresh for the current
video, so the row stays correct when YouTube swaps videos without reloading the page.

The channel name is treated with care: a YouTube channel is a broadcaster or a re-uploader at
least as often as it is the artist or the series, so the suggestion only uses it when the title
itself or MixesDB backs it – see the
[channel name](../shared/page_creator/#suggested-mix-page-title) notes there.

A tracklist the uploader wrote into the video description ends up in the editable
[tracklist box](../shared/page_creator/#tracklist-from-the-description) below the toolkit
and on the created page. Same 20 minute gate as the toolkit.

When the description holds none, the **comments** are read: the top comments of the video are
asked once for a whole tracklist somebody posted there – pinned by the channel or written by a
listener – and the first one found lands in the same box. Single track IDs in comments are never
taken, only a complete tracklist. Videos whose description already carries the tracklist cost no
comment lookup at all.

### Loading placeholder

Below the video metadata, grey pulsing placeholders hold the space of the Page Creator row and
the toolkit – one box each – until both have arrived, and they appear in one step. See
[Loading placeholder](../shared/page_creator/#loading-placeholder).

### Thumbnail

The video's `maxresdefault` thumbnail below the title, linking to the full-size image.

### Duration and file details

The duration as a button right below the thumbnail. Clicking it opens the copy-paste ready
[File details](../shared/README.md#file-details) table.

### Submit a playlist to TrackId.net

A submit link that hands the whole playlist over to TrackId.net – on the playlist's own page
below the header's action row, and on a video playing out of a playlist in the sidebar panel,
below its loop/shuffle row and above the video list. Both submit the playlist, not the single
video, so it makes no difference which one you use.

Auto-generated **Mixes** and your **Watch Later**/**Liked videos** lists get no link: the first
exists only for your own session, the others are private, so TrackId.net could not read either.

## Known limitations

- youtube.com enforces Trusted Types, which blocks the way jQuery writes markup. The script
  installs a pass-through policy for it before anything else loads. Should Google ever restrict
  policy names, the whole script stops working – the console says so in its first line rather
  than failing silently.
- YouTube ships several playlist header layouts in parallel per account; the submit link attaches
  to the visible one. The console keeps snapshots of what was found, which is what a "the link is
  not there" report should be checked against.
- A video whose duration is not known yet gets its toolkit on a later poll, not immediately.
