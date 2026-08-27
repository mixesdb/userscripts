# TrackId.net

Turns a TrackId.net audiostream into a copy-paste ready MixesDB tracklist, and keeps track of
which TID tracklists have already been integrated into MixesDB.

- **Runs on:** trackid.net, plus mixesdb.com/w/* for the links under the players and the edit-form part
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js)
- **Shared features:** [Toolkit](../shared/toolkit/), [Page Creator](../shared/page_creator/), [Tracklist box](../shared/tracklist_editor/), [Tracklist Importer](../shared/tracklist_importer/)

## Features

### Tracklist in wiki syntax

The audiostream's identified tracks as a MixesDB tracklist, with start times as cues and labels
in brackets. On the way there a long list of cleanups is applied, all of them learned from real
pages:

- artist names de-duplicated, country codes stripped, `feat.` moved from the title to the artist,
  and the disambiguation number Discogs hangs on names that exist twice in its database
  (`Majestic (3)`) dropped – it belongs to the database, not to the act
- titles normalised – `Title - Some Remix` becomes `Title (Some Remix)`, remaster/`(Mixed)`
  noise removed, numeric suffixes dropped
- labels cleaned, major labels and labels that only repeat the artist removed
- a leading `?` when the first identified track starts more than two minutes in, and a `?` for
  every stretch of unidentified audio between two tracks or behind the last one
- a `...` behind such a `?` only where more than ONE track fits into that stretch. What one track
  of this mix runs is measured on the mix itself – the median distance from each identified
  track to the row printed behind it, which is the next track where it follows right on and the
  track's own end where unidentified audio comes in between – and the stretch has to span more
  than one and a half times that, the same reading the
  [Tracklist Importer](../shared/tracklist_importer/) uses when it merges. Three minutes of
  unidentified audio is one track in a set of four minute tracks and two in a set of two minute
  ones, so the same hole gets a `...` in the one and none in the other. Lists with fewer than
  three measurable distances keep the fixed spans of two, three resp. four minutes

Tracks whose cue is suspiciously close to the previous one are treated as false positives and
removed; a **Toggle** button above the box shows the unfiltered version. The filtered tracklist
is then checked once more, so the feedback belongs to the version in the box: a tracklist that
was incomplete only because of those `?` rows comes back green once they are gone - and the
feedback follows the **Toggle**, back to orange while the unfiltered version is on screen.

### Style suggestions

The stream's TrackId.net styles, mapped to MixesDB category names, in a copyable box below the
tracklist – with the reminder to double-check them by skipping through the mix. On pages with
the [Page Creator](#mixesdb-page-creator) row they also prefill the created page's style
categories.

### Cue format switch

The cues can be switched between `[MM]` and `[H:MM:SS]`, and the choice is remembered for the
next audiostream.

### Player and toolkit

The audiostream's source player is embedded on the page (SoundCloud, Mixcloud, YouTube,
hearthis.at) and the [Toolkit](../shared/toolkit/) below it says whether that player is
already used on MixesDB – including a hint when the TID page is newer than the last edit of the
MixesDB page.

### Loading placeholder

The embedded player shows straight away; below it, grey pulsing placeholders hold the space of
the Page Creator row and the toolkit – one box each – until they have arrived, and they appear
in one step. The Page Creator box only shows for SoundCloud and YouTube players, the ones the
row exists for – see [Page Creator](../shared/page_creator/#loading-placeholder).

### MixesDB Page Creator

On audiostream pages whose source player is on SoundCloud or YouTube, the suggested page title
and the **Create** link sit between the embedded player and the toolkit – see
[Page Creator](../shared/page_creator/). The values are not read off the TID page, which only
shows a normalized heading: for a SoundCloud player the title, channel name, date, duration and
artwork URL come from the SoundCloud API, so the suggestion is the same one the SoundCloud
script would make on the track's own page; for a YouTube player they come from TrackId.net's
own API, which stores the original video title, channel name and upload date. A YouTube
channel name is only used in the title when something backs it – see the
[channel name](../shared/page_creator/#suggested-mix-page-title) notes there.

Unlike on SoundCloud there is no tracklist detection from the description: the **Create** link
takes whatever is in the [tracklist box](#tracklist-in-wiki-syntax) at the moment it is clicked –
corrections included – and files the `Tracklist:` category by what the Tracklist Editor says
about it. On a stream that is still processing the box does not exist yet; wait for it before
creating the page.

The [style suggestions](#style-suggestions) fill the new page's style categories the same way:
whatever is in that box when **Create** is clicked, so correct it there first. Without
suggestions a style at least 90% of the entity's recent MixesDB pages carry takes a row – only
where MixesDB files that name under `Category:Style`, so a festival or a venue those pages share
stays a hint under the row. An empty row is left behind the written style only where some of
the entity's pages carry a further style; without any style at all the page keeps the two empty
rows to fill in by hand.

Other players (Mixcloud, hearthis.at) do not get the row yet.

### Insert or merge the tracklist into MixesDB

When the toolkit found the mix page and the tracklist box is filled, an **Insert** (the page
has no tracklist yet), **Merge** (it has one) or **Chaptered** (it has one split into chapters)
link appears in front of the toolkit's EDIT link, with a **Report** link behind it – see
[Tracklist Importer](../shared/tracklist_importer/) (beta). It opens the mix page's edit form
with the tracklist already inserted or merged and MediaWiki's own diff on screen; nothing is
saved for you. **Chaptered** imports nothing – merging into one chapter is not supported yet –
and opens the edit form with the page's tracklist and this one side by side, for the merge by
hand. Where no link can be offered at all, a note stands in its place and says why –
**Identical**, **Nothing to add**, **No Tracklist section** or **Page unreadable** – with the
**Report** link behind it, so a verdict you disagree with can be reported like any merge.
The mix duration printed above the tracklist travels along: it is what lets the merge guess the
cue times of the tracks behind the last identified one.

### Mark as integrated

A **TID tracklist is integrated** checkbox next to the MixesDB page link records that this TID
tracklist has been carried over. Pages already marked show a check mark and how long ago that
happened.

The checkbox ticks itself when the [Tracklist Importer](../shared/tracklist_importer/) finds
this tracklist on the mix page already – the **Identical** note in the same row (the same list
on both sides) or the **Nothing to add** one (the page carries more on top of it), which fades
to green just before the box is ticked and stays green afterwards.

It also ticks itself after an **Insert**, **Merge** or **Chaptered** click: that link opens the
edit form in a new tab, this page stays where it is, and the mix page is watched from here for
the next 10 minutes. The moment its tracklist carries what was carried over, an **Integrated**
note takes the link's place and the box is ticked the same announced way. A tracklist that
merely changed is not enough – somebody else's edit does that too – it has to have taken THIS
tracklist in, whole or in part. Leave this page or close it and the watch ends with it; the
checkbox is then yours to tick as before.

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

### Links under the players on MixesDB

Under every player on a MixesDB mix page, and under the players in the results on
`MixesDB:Explorer/Mixes`: **Exists on TrackId.net** with a link to that audiostream – followed by
the check mark and how long ago its tracklist was carried over, or a note that it has not been –
or **Submit to TrackId.net**, which opens the [submit form](#submit-form) with the player URL and
the page title already filled in.

Both links open in a new tab, so the mix page you are working on stays where it is.

Only players TrackId.net can take are given a link. This was part of the
[MixesDB Userscripts Helper](../MixesDB_Userscripts_Helper/) until 2026-08-26; it moved here
because the links are about TrackId.net, and it is this script a contributor installs for it.
Switch them off with `trackIdnet_addLinks = 0` at the top of the script.

### On MixesDB

When an edit form is opened from a TID link that reported a complete or incomplete tracklist, the
page's `[[Category:Tracklist: none]]` is updated accordingly and the matching button is
preselected. An existing `Tracklist: complete` is never downgraded.

## Known limitations

- The cleanups are pattern-based. A title or label written in a way not seen before comes through
  untouched – report it on Discord and it becomes another rule.
- Removing likely-false `?` tracks is a heuristic; use the toggle to check what was dropped.
- Style suggestions come from TrackId.net's own styles and are only as good as those.
- `trackIdnet_addLinks` lives at the top of the script and has to be set again after an update.
