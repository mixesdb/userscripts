# Apple Music

Turns an Apple Music album or playlist into MixesDB wiki syntax, with cues added up from the
track durations.

- **Runs on:** music.apple.com and beta.music.apple.com – album and playlist pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Music/script.user.js)
- **Shared features:** [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Tracklist in wiki syntax

The track list as a MixesDB tracklist in a box above it: track artists joined with `&`, or the
album artist when a track names none, and the song title.

### Cues from track durations

The durations are added up, so every track carries the minute it starts at.

### Control version

When every track has a duration, a **Control version** button shows a second box with the
durations still in it, to check the calculated cues against.

## Known limitations

- Sometimes Apple shows tracks as unavailable (pre-release albums, for instance). These carry no duration, so cue
  calculation is skipped for the whole album.
- **music.apple.com blocks external resources**, so MixesDB's Tracklist Editor API cannot be
  called from here. The box says so: paste the tracklist into the Tracklist Editor by hand to get
  it into the standard format.
- Apple Music also blocks external stylesheets, so this script's CSS is inlined and stays minimal.
