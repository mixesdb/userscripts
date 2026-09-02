# SoundCloud

Turns a SoundCloud track page into a place a MixesDB page can be written from, and makes long
stream and profile lists usable by filtering out what is not a mix.

- **Runs on:** soundcloud.com – track pages, sets/playlists, streams, profiles and search results
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Page Creator](../shared/page_creator/), [Tracklist box](../shared/tracklist_editor/), [File details](../shared/README.md#file-details)

## Features

### Track header

A headline above SoundCloud's own with the track title (click to select it) and the dates the
API knows: **Created at**, **Release date** and **Last modified**. The date MixesDB should use is
highlighted.

### MixesDB Page Creator

The suggested page title and the **Create** link – see [Page Creator](../shared/page_creator/).
SoundCloud is its reference implementation: title, uploader, dates, duration, player URL,
artwork URL, description and the uploader's own channel URL all come off the SoundCloud API.
That channel URL is what lets the Page Creator ask MixesDB which category page *links* this
channel – the one lookup that needs no name, and the only way to reach a series the wiki files
under a name neither the title nor the channel spells.

The link that fills the created page's **Notes** section is looked for in the track's
description and in its **Buy / Free download** field, whichever names the episode's own page.

One thing happens only here: where that link is shortened – Groove Podcast writes "Go to
bit.ly/… for track list" rather than the `groove.de` address, in both places – the shortened
link is followed so the real address can go on the page. That is what the userscript manager
asks permission for on install, and it is the only thing this script uses that permission for:
one request, only to a known shortener, only when the series' MixesDB pages link such a page at
all, and only ever to read where it points. Where the answer does not lead to that site,
nothing is written.

### Tracklist from the description

The tracklist an uploader wrote into the description lands in an editable box below the toolkit,
formatted in wiki syntax. When the description holds none, the track's comments are asked once
for a complete tracklist somebody posted there – numbered (`1.`, `2.` …) or cued (`(00)`, `[05]`,
`1:02:30`). Details in [Page Creator](../shared/page_creator/).

Uploaders often credit remixers by their SoundCloud channel handle rather than by name –
`Blur - Tender (@reyneke Reinterpretation)`, `@drparnassus - Locomotiva`. Every `@handle` in a
detected tracklist is looked up and replaced by the name that channel carries, so the box shows
`Blur - Tender (REYNEKE Reinterpretation)` instead. The box then warns that it did so and lists
every handle with the name it was given: these are names the uploader never wrote, they are not
necessarily how the artist is credited on MixesDB, and a channel that has been renamed or turned
into a forwarding note gives a name that is plainly wrong. Check the list before saving. A handle
that cannot be looked up stays in the tracklist as it was.

### Toolkit

Is this track already on MixesDB – see [Toolkit](../shared/toolkit/). It carries the
player URL in the form MixesDB embeds, not `location.href`, so tracking parameters and the
redesign's frame URL never end up in a mix page.

### Tracks too short for MixesDB

MixesDB does not take recordings under 20 minutes, so on a shorter track the toolkit, the Page
Creator and the tracklist box are not loaded at all. The red duration is what says this is
intended, not broken, and its tooltip explains it. It is only a label there: the file details
are the wikitext for a mix page such a track will never get, so there is nothing to open and
the duration does not react to a click.

### Track page buttons

Next to the player:

- **duration** – click for the copy-paste ready [File details](../shared/README.md#file-details) table.
  Not clickable on a track under 20 minutes, see above
- **API** – toggles the raw SoundCloud API answer for the track, with the artwork URLs on top and
  every URL clickable
- **DL** – shown when the track is downloadable; forwards the click to SoundCloud's own download
  button, including when that button hides in the overflow menu
- **Link: …** – the track's buy/purchase link, which the current layout otherwise hides

### Artwork

The original-size artwork URL in a copyable field, with its dimensions and file type next to it.

### Full description

The truncated description is expanded automatically, once per track. Collapsing it by hand
afterwards is left alone. Works with English and German account locales.

### Loading placeholder

Until everything below the player has arrived – headline, dates, buttons, Page Creator row,
toolkit and tracklist box – grey pulsing placeholders hold their space and the finished content
appears in one step; the Page Creator row and the toolkit are two separate placeholder boxes –
see [Page Creator](../shared/page_creator/#loading-placeholder). Only on the redesigned track
pages.

### Filters on streams, profiles, playlists and search results

A **Hide:** row above lazy-loading lists, each option remembered:

- **Playlists** – hide playlist entries (on by default)
- **Reposts** – hide reposted players
- **Favs** – hide players you have favorited
- **Used** – hide players already used on MixesDB
- **X'ed items** – hide entries removed with the **X** button

And a **Filter:** row with two sliders: **Durations ≥ n minutes** and **Favorites ≥ n**, so short
uploads and unnoticed tracks disappear from the list.

Both rows also sit above the search results on **Everything**, **Go+** and **Tracks** – the
search tabs that list single tracks. Switching an option there reloads the page with the search
term intact. There is no **Reposts** box, since a search result is always the original upload.
The **People**, **Albums** and **Playlists** tabs are left alone: they list users and playlists,
which have neither a duration nor a favorites count to go by, and no option hides anything there.

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
- Channel handles are looked up for at most 50 different handles per tracklist. Beyond that the
  remaining handles stay in the text as they are.
