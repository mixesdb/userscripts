# The Lot Radio

Turns a The Lot Radio show tracklist into MixesDB wiki syntax.

- **Runs on:** thelotradio.com — show pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TheLotRadio/script.user.js)
- **Shared features:** [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Tracklist in wiki syntax

The show's tracklist as a MixesDB tracklist in an editable box above the site's own list. The
site's play times become cues in minutes, padded to three digits for shows longer than 99
minutes.

Two things are added that the source does not have:

- a leading `[00] ?` when the first identified track starts more than a minute into the show
- a `...` gap marker wherever eight minutes or more pass between two tracks

## Known limitations

- Only what The Lot Radio published is in the tracklist; unidentified stretches show up as gaps.
- The show list is rendered by the site's own app, so the box appears once that list is there.
