# RA

Adds the MixesDB toolkit and the podcast tracklist to ra.co, plus the copy buttons and artwork
URLs a mix page needs.

- **Runs on:** ra.co and its country subdomains – podcast episodes, events, clubs, artists
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/RA/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Tracklist box](../shared/tracklist_editor/)

## Features

### Toolkit on podcast episodes

Above the player on `ra.co/podcast/…`: is this episode already on MixesDB – see
[Toolkit](../shared/toolkit/). The episode's SoundCloud player is what gets looked up.

### Podcast tracklist

RA's own tracklist as a MixesDB tracklist in an editable box, and the whole tracklist section is
moved below the player where it belongs.

### Copy buttons and MixesDB search

- **Event pages:** a copy button and a MixesDB search icon next to the venue name
- **Club and artist pages:** the same next to the profile name in the header

The search icon opens a MixesDB search restricted to categories, which is what finds the venue or
artist page.

### Original artwork

On event and podcast episode pages, the artwork's original URL – the real JPG or PNG, not RA's
webp proxy version – in a copyable field with its dimensions.

## Known limitations

- Only podcast episode pages get a toolkit. Event and news pages are for the artwork and the copy
  buttons.
- RA's class names are generated per build, so layout changes on their side can make single
  features disappear until the selectors are followed up.
