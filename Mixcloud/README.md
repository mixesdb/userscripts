# Mixcloud

Adds the MixesDB toolkit and Page Creator to Mixcloud show pages, hands over the artwork and
file details, and filters shows already used on MixesDB out of a user's page.

- **Runs on:** mixcloud.com
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Page Creator](../shared/page_creator/), [File details](../shared/README.md#file-details)

## Features

### Toolkit

Below the player on a show page: is this show already on MixesDB – see
[Toolkit](../shared/toolkit/).

### MixesDB Page Creator

For shows the toolkit reports as not on MixesDB yet, the suggested page title and the
**Create** link sit above the toolkit – see [Page Creator](../shared/page_creator/). Title,
uploader, upload date, duration, the canonical show URL, the original-size artwork and the
description all come off the Mixcloud API.

The account name is treated with care: a Mixcloud account is a broadcaster or a re-uploader at
least as often as it is the artist or the series, so the suggestion only uses it when the title
itself or MixesDB backs it – see the
[channel name](../shared/page_creator/#suggested-mix-page-title) notes there.

Only shows of **at least 20 minutes** get the row – MixesDB does not take shorter recordings.

### Tracklist from the description

The tracklist an uploader wrote into the show's description lands in an editable
[tracklist box](../shared/page_creator/#tracklist-from-the-description) below the toolkit,
formatted in wiki syntax, and goes onto the created page. The description is the only source
read here – comments are not fetched. Same 20 minute gate as the row.

### Original artwork

The artwork URL in its full size, in a copyable field with a copy button, its dimensions next to
it linking to the image.

### Duration and file details

The show's duration from the Mixcloud API as a button next to the action buttons. Clicking it
opens the copy-paste ready [File details](../shared/README.md#file-details) table.

### API toggle

An **API** button that shows the raw `api.mixcloud.com` answer for the show inline, with every URL
in it clickable.

### Hide used shows

On a user's page, a **Hide: Used** checkbox removes every show that is already used on MixesDB, so
what is left is what still needs a page. Also reachable as `?hideUsed=true`.

### Submit a playlist to TrackId.net

On playlist pages, a submit link below the playlist title hands the whole playlist over to
TrackId.net.

## Known limitations

- Hiding used shows is one MixesDB lookup per show, so a page with hundreds of shows becomes slow.
- Mixcloud's class names are generated per build; layout changes on their side can make single
  features disappear until the selectors are followed up.
