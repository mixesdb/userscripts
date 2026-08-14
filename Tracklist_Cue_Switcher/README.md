# Tracklist Cue Switcher

Switches a tracklist's cues between minutes and clock times – on a MixesDB page by clicking a
cue, in the TrackId.net Tracklist box by an option in the tracklist feedback.

- **Runs on:** mixesdb.com/w/* – mix pages, `MixesDB:Explorer/Mixes` and tracklists in the
  lightbox; trackid.net audiostream pages, through the TrackId.net script
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js)
  – nothing extra is needed for trackid.net, the [TrackId.net](../TrackId.net/) script brings the
  cue conversion with it
- **Shared features:** [Tracklist box](../shared/tracklist_editor/) – on trackid.net only

## Features

### Clickable cues

Every cue MixesDB renders becomes a link. Clicking one cycles **all** tracklists on the page
through three states:

1. the cue as written (`[07]`)
2. the other format (`[0:07]`)
3. both at once (`[07|0:07]`)

Nothing on the page is changed permanently – this is a reading aid, not an edit.

### Converting minutes to clock times

A tracklist written in plain minutes has no hour in it, so the hour is worked out from the
neighbouring cues: where the minutes wrap around, the hour goes up. Unknown cues (`??`, `???`)
are filled in from the tracks around them where that is unambiguous.

### Remembered preference

The format last switched to is remembered, so the next mix page opens in it. Mix pages and
TrackId.net remember their own, so switching the box on TrackId.net does not change how mix pages
open.

### On TrackId.net

The Tracklist box is a text field, so there is no cue to click. The switch is offered as a
**Switch cue format** button in the tracklist feedback instead, and it applies to the whole box at
once: `[059]` becomes `[0:59]` and back. Only those two – there is no "both at once" state,
because what is in the box is meant to be copied into a wiki page.

Unlike on a mix page this really rewrites the tracklist, so the cues are copied out the way they
are shown. TrackId.net's cues come from real timestamps, so no hour has to be guessed, and
switching back to minutes restores exactly what TrackId.net produced.

## Known limitations

- On a mix page the hour of a minutes-only cue is inferred, not known. A tracklist with large gaps
  or an inconsistent cue format can put a cue in the wrong hour – the first click always brings
  back the cue as written.
- Only cues in the shapes `[NN]`, `[NNN]`, `[N:NN]`, `[NN:NN]`, `[N:NN:NN]`, `[??]` and `[???]`
  are made clickable. Anything else is left alone.
- On TrackId.net, switching back to minutes restores the tracklist as TrackId.net produced it.
  Edits made in the box while it showed clock times are lost, so switch first and edit afterwards.
