# Mixcloud

Adds the MixesDB toolkit to Mixcloud show pages, hands over the artwork and file details, and
filters shows already used on MixesDB out of a user's page.

- **Runs on:** mixcloud.com
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit), [File details](../includes/README.md#file-details)

## Features

### Toolkit

Below the player on a show page: is this show already on MixesDB – see
[Toolkit](../includes/README.md#toolkit).

### Original artwork

The artwork URL in its full size, in a copyable field with a copy button, its dimensions next to
it linking to the image.

### Duration and file details

The show's duration from the Mixcloud API as a button next to the action buttons. Clicking it
opens the copy-paste ready [File details](../includes/README.md#file-details) table.

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
