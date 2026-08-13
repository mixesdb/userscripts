# NTS

Turns an NTS episode tracklist into MixesDB wiki syntax.

- **Runs on:** nts.live – episode pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/NTS/script.user.js)
- **Shared features:** [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Tracklist in wiki syntax

The episode's tracklist as a MixesDB tracklist in an editable box above it, one `# Artist - Title`
per track.

Version suffixes NTS writes into the artist name (`Pet Shop Boys (Ian Levine mix)`) are moved out
of it, and the duplicated mobile artist line NTS renders is ignored.

### Cues when NTS shows them

NTS shows track timestamps to subscribers only. When they are there they become cues, rounded
from `H:MM:SS` to minutes, and tracks without one get an explicit empty cue so the tracklist stays
aligned. Episodes without timestamps are handled as a plain tracklist.

## Known limitations

- Without an NTS subscription there are no timestamps, so the tracklist has no cues.
- The tracklist is read off the rendered page, so it appears once NTS has rendered it – up to a
  second on a slow load.
