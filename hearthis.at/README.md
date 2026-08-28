# hearthis.at

Adds the MixesDB toolkit and Page Creator to hearthis.at track pages.

- **Runs on:** hearthis.at – track pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Page Creator](../shared/page_creator/)

## Features

### Toolkit

Below the track header: is this track already used on MixesDB – see
[Toolkit](../shared/toolkit/).

hearthis.at players are embedded on MixesDB under two different URLs: the readable
`hearthis.at/user/track/` one and the numeric `hearthis.at/12345/` one the embed uses. Both are
looked up, so a track already on MixesDB is found no matter which of the two was used there, but
only the numeric URL is listed as copy-paste player URL – the same one the Embed URL field shows.

### MixesDB Page Creator

For tracks the toolkit reports as not on MixesDB yet, the suggested page title and the
**Create** link sit above the toolkit – see [Page Creator](../shared/page_creator/). Title,
uploader, upload date, duration, artwork and description all come off the hearthis.at API, and
the player URL handed over is the numeric one – the form MixesDB embeds.

The account name is treated with care: a hearthis.at account is a broadcaster or a re-uploader
at least as often as it is the artist or the series, so the suggestion only uses it when the
title itself or MixesDB backs it – see the
[channel name](../shared/page_creator/#suggested-mix-page-title) notes there.

Only tracks of **at least 20 minutes** get the row – MixesDB does not take shorter recordings.

### Tracklist from the description

The tracklist an uploader wrote into the track's description lands in an editable
[tracklist box](../shared/page_creator/#tracklist-from-the-description) below the toolkit,
formatted in wiki syntax, and goes onto the created page. The description is the only source
read here – comments are not fetched. Same 20 minute gate as the row.

## Known limitations

- Only track pages. Profile and playlist pages get nothing.
- Because two URLs are checked per track, the toolkit needs two MixesDB requests and appears a
  moment later than on other sites.
