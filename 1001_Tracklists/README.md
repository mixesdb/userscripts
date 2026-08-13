# 1001 Tracklists

Turns a 1001tracklists.com tracklist into MixesDB wiki syntax and checks every player on the page
against MixesDB.

- **Runs on:** 1001tracklists.com – tracklist pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit), [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Tracklist in wiki syntax

The page's tracklist as a MixesDB tracklist in an editable box above it: cue times in brackets,
record labels in brackets behind the track, chapter headings (`;Pete Tong`) and the bold
intro rows 1001 writes between tracks.

Cue times are normalised on the way – a bare number becomes `[MM:00]`, and a list mixing `[MM:SS]`
with `[H:MM:SS]` is padded to one format.

### Toolkit for every player

1001 pages carry several players for the same mix (SoundCloud, Mixcloud, YouTube, Apple
Podcasts), visible ones and hidden tab ones. Each is checked against MixesDB and the result is
collected into one [Toolkit](../includes/README.md#toolkit) box listing the used and unused player
URLs.

When the 1001 page was created after the MixesDB page was last edited, the toolkit says so – the
1001 tracklist is then likely worth carrying over.

### Adblock-blocker removed

The overlay demanding the adblocker be switched off is taken off the page.

## Known limitations

- Hidden player tabs are only read after a short delay, so the toolkit appears a moment after the
  page.
- Labels are lowercased and a bracketed suffix is dropped, which is what MixesDB wants but can
  need a correction for labels written in caps on purpose.
