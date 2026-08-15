# Tracklist box

The editable box holding a tracklist in MixesDB wiki syntax. Whatever a site script scraped off
the page goes through MixesDB's Tracklist Editor API first, so what ends up in the box is
formatted the way MixesDB wants it – not the way the uploader happened to type it. Shared by the
site scripts, so it looks and behaves the same everywhere.

- **Runs on:** every site whose script loads it – [SoundCloud](../../SoundCloud/),
  [TrackId.net](../../TrackId.net/), [RA](../../RA/),
  [1001 Tracklists](../../1001_Tracklists/), [NTS](../../NTS/), [BBC](../../BBC/),
  [The Lot Radio](../../TheLotRadio/), [radioeins](../../radioeins/),
  [Discogs](../../Discogs/), [Apple Music](../../Apple_Music/),
  [Player Checker](../../Player_Checker/)
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** [Toolkit](../toolkit/), [Page creator](../page_creator/)

Those are the scripts that ADD the box, and they are the only ones listing it as a shared
feature. A script that merely applies its own feature to a box already on the page does not:
the [Tracklist Cue Switcher](../../Tracklist_Cue_Switcher/) adds its cue format switch to it and
the [Tracklist Merger](../../Tracklist_Merger/) reads what is in it, but neither puts a box
there, so neither lists it.

## Features

### The box

The tracklist arrives already formatted: numbering stripped, the separator written as MixesDB
writes it, cues in front of the track. It stays editable – corrections made in the box are what
gets copied or written onto a page, not the version that was scraped.

### API feedback

Above the box, what the Tracklist Editor API said about its content:

- **green** – the tracklist is valid and complete
- **orange** – incomplete, or the API raised a hint
- **red** – the API raised a warning, e.g. tracks that seem to be missing their artist

Editing the box and asking again re-colours the same box rather than stacking a second answer
under the first.

### Copying out

Where a tracklist was explicitly asked for (TrackId.net, RA), the box selects itself so it can
be copied straight out. Where one merely appeared next to a player, it does not – it would take
the caret and scroll the page to the box.

## Known limitations

- The API is asked once per tracklist and the request is synchronous, so a very long tracklist
  holds the page up briefly while it is formatted.
- Only the separator, the numbering and the cue position are normalised before the API sees the
  text. A tracklist written in a shape the API cannot read at all comes back red rather than
  fixed.
