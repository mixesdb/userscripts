# TrackId.net

Turns a TrackId.net audiostream into a copy-paste ready MixesDB tracklist, and keeps track of
which TID tracklists have already been integrated into MixesDB.

- **Runs on:** trackid.net, plus mixesdb.com/w/* for the edit-form part
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit), [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Tracklist in wiki syntax

The audiostream's identified tracks as a MixesDB tracklist, with start times as cues and labels
in brackets. On the way there a long list of cleanups is applied, all of them learned from real
pages:

- artist names de-duplicated, country codes stripped, `feat.` moved from the title to the artist
- titles normalised — `Title - Some Remix` becomes `Title (Some Remix)`, remaster/`(Mixed)`
  noise removed, numeric suffixes dropped
- labels cleaned, major labels and labels that only repeat the artist removed
- a leading `?` gap when the first identified track starts more than two minutes in

Tracks whose cue is suspiciously close to the previous one are treated as false positives and
removed; a **Toggle** button above the box shows the unfiltered version.

### Style suggestions

The stream's TrackId.net styles, mapped to MixesDB category names, in a copyable box below the
tracklist — with the reminder to double-check them by skipping through the mix.

### Cue format switch

The cues can be switched between `[MM]` and `[H:MM:SS]`, and the choice is remembered for the
next audiostream.

### Player and toolkit

The audiostream's source player is embedded on the page (SoundCloud, Mixcloud, YouTube,
hearthis.at) and the [Toolkit](../includes/README.md#toolkit) below it says whether that player is
already used on MixesDB — including a hint when the TID page is newer than the last edit of the
MixesDB page.

### Mark as integrated

A **TID tracklist is integrated** checkbox next to the MixesDB page link records that this TID
tracklist has been carried over. Pages already marked show a check mark and how long ago that
happened.

### Real tables instead of the data grid

TrackId.net's grid layout is replaced with a plain sortable table, and paginated grids are read
to the end first, so a tracklist is never cut off at the page boundary.

### Menu quick links

**Submit** and **My requests** next to the user menu.

### Submit form

`trackid.net/submiturl` accepts a `requestUrl` parameter, fills it into the form and validates it
for you; when the audiostream already exists, its tracklist opens directly. A `keywords`
parameter replaces the site search with a prefilled one. Links carrying these parameters are what
the other userscripts' **Submit to TrackId.net** links produce.

### On MixesDB

When an edit form is opened from a TID link that reported a complete or incomplete tracklist, the
page's `[[Category:Tracklist: none]]` is updated accordingly and the matching button is
preselected. An existing `Tracklist: complete` is never downgraded.

## Known limitations

- The cleanups are pattern-based. A title or label written in a way not seen before comes through
  untouched — report it on Discord and it becomes another rule.
- Removing likely-false `?` tracks is a heuristic; use the toggle to check what was dropped.
- Style suggestions come from TrackId.net's own styles and are only as good as those.
