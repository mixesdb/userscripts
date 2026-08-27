# 1001 Tracklists

Turns a 1001tracklists.com tracklist into MixesDB wiki syntax and checks every player on the page
against MixesDB.

- **Runs on:** 1001tracklists.com – tracklist pages; mixesdb.com/w/* for the
  [Tracklist Importer](../shared/tracklist_importer/)'s edit-form side
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Tracklist box](../shared/tracklist_editor/),
  [Tracklist Importer](../shared/tracklist_importer/)

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
collected into one [Toolkit](../shared/toolkit/) box listing the used and unused player
URLs.

When the 1001 page was created after the MixesDB page was last edited, the toolkit says so – the
1001 tracklist is then likely worth carrying over.

### Insert or merge the tracklist into MixesDB

When the toolkit found the mix page and the tracklist box is filled, an **Insert** (the page
has no tracklist yet), **Merge** (it has one) or **Chaptered** link appears in front of the
toolkit's EDIT link, with a **Report** link behind it – see
[Tracklist Importer](../shared/tracklist_importer/) (beta). It opens the mix page's edit form
with the tracklist already inserted or merged and MediaWiki's own diff on screen; nothing is
saved for you.

**Chaptered** shows up more often here than on other sites, because it covers chapters on
either side: the MixesDB page's tracklist split into chapters, or the 1001 tracklist itself
carrying `;Name` rows – multi-set pages do. Merging chaptered tracklists is not supported yet,
so the link imports nothing and opens the edit form with the page's tracklist and the 1001 one
side by side, for the merge by hand. A chaptered 1001 tracklist going into a page *without* one
is a plain **Insert** – chapters and all.

Where no link can be offered, a note stands in its place and says why – **Identical**,
**Nothing to add**, **No Tracklist section** or **Page unreadable** – with the **Report** link
behind it. Unlike on TrackId.net there is no "integrated" checkbox on 1001 pages, so
**Identical** only says so and ticks nothing – standing in the same green it ends up with
over there.

### Adblock-blocker removed

The overlay demanding the adblocker be switched off is taken off the page.

## Known limitations

- Hidden player tabs are only read after a short delay, so the toolkit appears a moment after the
  page.
- Labels are lowercased and a bracketed suffix is dropped, which is what MixesDB wants but can
  need a correction for labels written in caps on purpose.
