# Discogs

Turns a Discogs release tracklist into MixesDB wiki syntax, with cues added up from the track
durations.

- **Runs on:** discogs.com – release pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Discogs/script.user.js)
- **Shared features:** [Tracklist box](../shared/tracklist_editor/)

## Features

### Tracklist in wiki syntax

The release's tracklist as a MixesDB tracklist in an editable box above it. Per track: the track
artist, or the release artist when the track has none, and the title. Artist names are cleaned of
Discogs' disambiguation suffixes (`Artist (2)`, `Artist*`).

### Cues from track durations

The durations are added up, so every track carries the minute it starts at. From the first track
with an unknown duration onwards the cue becomes `[??]` rather than a wrong number. A release
with no durations at all gets no cues.

### Chapters

Discogs' own heading rows become `;Chapter` lines. A multi-disc release without heading rows gets
them derived from the track positions – `;CD 1` for CD releases, `;Part 1` otherwise – and the
cues restart per chapter.

### File details and notes

A second box above the tracklist with the release's file details and notes, ready to be copied
into the mix page.

## Known limitations

- Discogs renders the tracklist with React, so the box appears a moment after the page and is
  built once – a release opened through in-page navigation may need a reload.
- Only release pages are handled; master pages have no tracklist table of this shape.
