# Tracklist Cue Switcher

Makes the cues in a MixesDB tracklist clickable, so a tracklist written in minutes can be read in
clock times and back without editing anything.

- **Runs on:** mixesdb.com/w/* — mix pages, `MixesDB:Explorer/Mixes`, and tracklists in the
  lightbox
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js)
- **Shared features:** none

## Features

### Clickable cues

Every cue MixesDB renders becomes a link. Clicking one cycles **all** tracklists on the page
through three states:

1. the cue as written (`[07]`)
2. the other format (`[0:07:00]`)
3. both at once (`[07|0:07:00]`)

Nothing on the page is changed permanently — this is a reading aid, not an edit.

### Converting minutes to clock times

A tracklist written in plain minutes has no hour in it, so the hour is worked out from the
neighbouring cues: where the minutes wrap around, the hour goes up. Unknown cues (`??`, `???`)
are filled in from the tracks around them where that is unambiguous.

### Remembered preference

The format last switched to is remembered, so the next mix page opens in it.

## Known limitations

- The hour of a minutes-only cue is inferred, not known. A tracklist with large gaps or an
  inconsistent cue format can put a cue in the wrong hour — the first click always brings back the
  cue as written.
- Only cues in the shapes `[NN]`, `[NNN]`, `[N:NN]`, `[NN:NN]`, `[N:NN:NN]`, `[??]` and `[???]`
  are made clickable. Anything else is left alone.
