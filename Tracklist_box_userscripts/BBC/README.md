# BBC

Turns the "Music played" list of a BBC programme page into MixesDB wiki syntax.

- **Runs on:** bbc.co.uk – programme pages with a tracklist
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_box_userscripts/BBC/script.user.js)
- **Shared features:** [Tracklist box](../../shared/tracklist_editor/)

## Features

### Tracklist in wiki syntax

The programme's played tracks as a MixesDB tracklist in an editable box at the top of the page:

- artist and title per track, several artists joined with `&`
- the record label in brackets behind the track, when BBC names one
- BBC's own segment groups become `;Chapter` lines, which is what splits a show with several
  guest mixes

Tracks BBC lists as `[Unknown]` come through as `Unknown`.

## Known limitations

- No cues: BBC does not publish track times.
- Only programme pages that render a segment list are handled – a programme without a published
  tracklist gets nothing.
