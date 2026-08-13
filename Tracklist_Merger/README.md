# Tracklist Merger (Beta)

Merges a second tracklist into an existing one – a TrackId.net tracklist into the tracklist a
MixesDB page already has, say – and shows what would change.

- **Runs on:** `mixesdb.com/w/MixesDB:Tests/Tracklist_Merger` and trackid.net audiostream pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js)
- **Shared features:** [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Merge two tracklists

The merger page takes the **original** tracklist and a **candidate** and produces one merged
tracklist: tracks the candidate identified where the original had a gap are filled in, tracks
both agree on are kept once. Titles are matched fuzzily, so spelling differences between the two
sources do not produce duplicates.

### Cue handling

The original's cue format is detected and every cue taken from the candidate is converted to it,
including the padding it uses. Merged tracks that end up without a cue get an explicit unknown-cue
placeholder, so the Tracklist Editor cannot mistake a leading number for a cue.

### Diff view

The two tracklists and the result side by side, column-aligned, updating as you type.

### "Open in Tracklist Merger" on TrackId.net

A link above every TrackId.net tracklist that opens the merger with that tracklist already filled
in as the candidate.

### URL parameters

`?tl_original=…&tl_candidate=…` fill both boxes; adding `&do=merge` runs the merge straight away.

## Known limitations

- Beta, and it lives on a test page on MixesDB rather than in the wiki's own interface.
- Fuzzy matching is a threshold, not certainty: check the diff before taking the result.
- Large tracklists make the live diff heavy; it is rebuilt in the background after a typing pause.
