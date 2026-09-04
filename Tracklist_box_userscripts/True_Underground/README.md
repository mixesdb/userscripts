# True Underground

Turns the tracklist of a True Underground mix page into MixesDB wiki syntax, and gives you the
right mouse button back.

- **Runs on:** trueunderground.one – every page; the tracklist box on mix pages that publish a
  tracklist
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_box_userscripts/True_Underground/script.user.js)
- **Shared features:** [Tracklist box](../../shared/tracklist_editor/)

## Features

### Right click, copying and text selection

The site blocks the context menu, text selection, copy and paste, and the keyboard shortcuts
behind them (cmd/ctrl+C, cmd/ctrl+S, cmd/ctrl+U, F12). On every page of the site all of that
works again, and the site's "Right click is disabled!" toast stays away.

### Tracklist in wiki syntax

Where a mix page publishes a tracklist – a heading ending in `Tracklist`, followed by the
numbered tracks – it appears as a MixesDB tracklist in an editable box right under that heading,
one `# Artist - Title` per track, with the label in brackets the way the site wrote it.

A page that lists its tracks without such a heading is handled too, as long as the list reads
like a tracklist: numbered lines with an `Artist - Title` separator.

The box does not select itself: the tracklist sits at the end of a long article, and jumping
there on load would take you away from the player.

## Known limitations

- The box depends on MixesDB's Tracklist Editor API allowing this site. Until it does, the box
  says so above the tracklist, shows the tracks as the site wrote them, and has neither the API
  feedback nor the **Live updates** switch – paste the text into the Tracklist Editor on MixesDB
  instead.
- No cues: the site publishes no track times.
- Only a few mixes carry a tracklist at all (True Techno 105 was the first) – the others get no
  box.
- Typos in the site's list come through as they are, e.g. a stray `11.` glued to the end of a
  track. The box is editable for exactly that.
