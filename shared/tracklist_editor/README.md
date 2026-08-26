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
gets copied or written onto a page, not the version that was scraped. While you type, the box
grows and shrinks with its lines, so the whole tracklist stays visible without scrolling inside
the box.

### Live updates while you type (switch, off by default)

**Live updates** in the top right of the feedback box is a switch. Flip it on and the box keeps
up with you while you type: after a short typing pause – and right away when you press Enter or
click somewhere in the box – the tracklist is checked and formatted, and the feedback answers
the text as it stands. Numbering typed in front of a track disappears as you go, dashes are
written the way MixesDB writes them, and the cursor stays where you were typing.

A text row – a line carrying MixesDB's italics, like `# [0:38] ''Artist - ?''` – is left alone
while the cursor is in it. Taking those `''` off by hand takes more than one keystroke, and the
formatter would put them straight back between two of them, so no check runs at all while you are
in such a line. The feedback and the formatting follow as soon as you click somewhere else, press
Enter or leave the box.

The feedback box itself only changes when the answer changes, so a pause that confirms what is
already on screen is completely silent.

It is off by default because a half-written line honestly reads as a warning: the feedback goes
red mid-line and back on the next word, which is help while writing a tracklist out and noise
while fixing one cue in a finished one. The choice is remembered per site.

Next to the switch, a counter of the Tracklist Editor requests the page has made, in front of
the API's own row count. Nothing is asked twice about the same text.

### The box updates itself when you leave it

Click or tab out of an edited box and the text goes through the Tracklist Editor once more: the
box greys out for a moment, then shows the tracklist as the editor returns it – re-formatted
where needed – and the printed feedback and its colour answer the new content. This is the step
that rewrites, which is why it waits until you have left the box. Leaving the box without having
changed anything does nothing, and a box you are already typing in again when the answer arrives
is left alone.

On pages with the [Page creator](../page_creator/), the `Tracklist:` category of the page the
**Create** link would start follows the fresh verdict, and so does the reasoning panel's
category section.

### API feedback

Above the box, what the Tracklist Editor API said about its content:

- **green** – the tracklist is valid and complete
- **orange** – incomplete, or the API raised a hint
- **red** – the API raised a warning, e.g. tracks that seem to be missing their artist

Editing the box and asking again re-colours the same box rather than stacking a second answer
under the first.

The verdict itself stays the first line of the feedback. Everything the site scripts hang into
it – TrackId.net's **Toggle** for the removed `?` tracks, the **Switch cue format** button, the
link into the Tracklist Merger – sits under the verdict, whatever the answer is, so the sentence
you opened the box for is always in the same place.

On sites that also show the [Toolkit](../toolkit/), the same verdict is repeated in the top
right corner of the box as two icons – see
[Tracklist state icons](../toolkit/#tracklist-state-icons).

With **Live updates** on, the Tracklist Editor's "No changes were made." line is left out. It
means "the formatter found nothing to fix in what was sent" – a fair answer when you have
finished an edit and left the box, which is why it still appears with the switch off, but
mid-sentence after a typing pause it reads as if your edit had been ignored.

### Copying out

Where a tracklist was explicitly asked for (TrackId.net, RA), the box selects itself so it can
be copied straight out. Where one merely appeared next to a player, it does not – it would take
the caret and scroll the page to the box.

## Known limitations

- The first formatting request per tracklist is synchronous, so a very long tracklist holds the
  page up briefly while it is formatted. The checks while typing and the re-check after an edit
  are not – there the box only greys out while the editor thinks.
- With **Live updates** on, the text is judged exactly as it stands, so a half-written line
  reads as a warning until it is finished – and a line can be reformatted under you mid-sentence,
  which is the price of seeing the finished shape as you write.
- The **Live updates** setting is stored per site, so switching it on for one site does not
  switch it on for the others.
- Only the separator, the numbering and the cue position are normalised before the API sees the
  text. A tracklist written in a shape the API cannot read at all comes back red rather than
  fixed.
