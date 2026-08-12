# SoundCloud

Turns a SoundCloud track page into a place a MixesDB page can be written from, and makes long
stream and profile lists usable by filtering out what is not a mix.

- **Runs on:** soundcloud.com — track pages, sets/playlists, streams and profiles
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit), [Page creator](../includes/page_creator/), [Tracklist box](../includes/README.md#tracklist-box), [File details](../includes/README.md#file-details)

## Features

### Track header

A headline above SoundCloud's own with the track title (click to select it) and the dates the
API knows: **Created at**, **Release date** and **Last modified**. The date MixesDB should use is
highlighted.

### MixesDB page creator

The suggested page title and the **Create** link — see [Page creator](../includes/page_creator/).
SoundCloud is its reference implementation: title, uploader, dates, duration, player URL,
artwork URL and description all come off the SoundCloud API.

### Tracklist from the description

The tracklist an uploader wrote into the description lands in an editable box below the toolkit,
formatted in wiki syntax. When the description holds none, the track's comments are asked once
for a complete numbered tracklist. Details in [Page creator](../includes/page_creator/).

### Toolkit

Is this track already on MixesDB — see [Toolkit](../includes/README.md#toolkit). It carries the
player URL in the form MixesDB embeds, not `location.href`, so tracking parameters and the
redesign's frame URL never end up in a mix page.

### Track page buttons

Next to the player:

- **duration** — click for the copy-paste ready [File details](../includes/README.md#file-details) table
- **API** — toggles the raw SoundCloud API answer for the track, with the artwork URLs on top and
  every URL clickable
- **DL** — shown when the track is downloadable; forwards the click to SoundCloud's own download
  button, including when that button hides in the overflow menu
- **Link: …** — the track's buy/purchase link, which the current layout otherwise hides

### Artwork

The original-size artwork URL in a copyable field, with its dimensions and file type next to it.

### Full description

The truncated description is expanded automatically, once per track. Collapsing it by hand
afterwards is left alone. Works with English and German account locales.

### Filters on streams, profiles and playlists

A **Hide:** row above lazy-loading lists, each option remembered:

- **Playlists** — hide playlist entries (on by default)
- **Reposts** — hide reposted players
- **Favs** — hide players you have favorited
- **Used** — hide players already used on MixesDB
- **X'ed items** — hide entries removed with the **X** button

And a **Filter:** row with two sliders: **Durations ≥ n minutes** and **Favorites ≥ n**, so short
uploads and unnoticed tracks disappear from the list.

Every list entry gets an **X** button that removes it from view; favorited entries have their
title highlighted. The filter settings ride along when switching between a profile's tabs.

### Links in playlists and sets

Track links inside playlists open in a new tab and lose the `?in=` set parameter, so what gets
copied is the track's own URL. Compact playlists get an extra **Link** next to each track.

### Submit a set to TrackId.net

A submit link above a set's track list, handing the whole set over to TrackId.net.

## Known limitations

- Everything on track pages needs SoundCloud's API to answer. When it does not, a note says so
  and the page keeps only what could be read off the DOM.
- Since the ~Aug 2026 redesign track pages render inside a nested frame. Links we add carry
  `target="_top"` for that reason; a link that ever opens inside the frame is a bug worth
  reporting.
- Visible SoundCloud UI text is matched in English and German only. Other account locales fall
  back to whatever works without it (e.g. the description is not auto-expanded).
- The favorites filter resolves entries one at a time and pauses under load, so a long list fills
  in gradually.
