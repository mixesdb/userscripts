# MixesDB modal

A MixesDB page opened in a popup **on the page you are working on** – for the five-second look
("is this the right category?", "does this page already exist?") that is not worth a tab. The
page behind it goes dark and blurred so nothing beside the box competes for the eye.

Two things open it, on a desktop-sized window:

- the **blue eye icon** behind a mix page link in the [toolkit](../toolkit/)'s
  *This mix is on MixesDB* row
- a plain left click on the [page creator](../page_creator/)'s category chips and their
  recent mix pages

- **Runs on:** every site whose script loads it – [SoundCloud](../../SoundCloud/),
  [Mixcloud](../../Mixcloud/), [YouTube](../../YouTube/), [RA](../../RA/),
  [TrackId.net](../../TrackId.net/), [1001 Tracklists](../../1001_Tracklists/),
  [hearthis.at](../../hearthis.at/), [Player Checker](../../Player_Checker/)
- **Install:** nothing to install – it comes with the site scripts

## Features

### The framed page

The popup frames the MixesDB page right there: the state of the page you came from – a playing
player above all – is untouched, and closing the popup puts you back exactly where you were.
**Esc**, the **×** or a click beside the box close it; **Open on MixesDB** in its header opens
the same page as a tab after all.

Everything that asks for a tab still gets one: cmd/ctrl/shift- and middle-clicking the eye or a
chip opens the page as a tab like any link, and on a narrow window (where the framed page would
be smaller than a tab) they simply stay the links they are.

### Walking the page's MixesDB links

While the popup is open the **left and right arrow keys** frame the previous or the next
MixesDB link on the page – every mix page of the toolkit's row, every category chip and folded-out
mix page of the page creator's bar – without going back to the page between two looks. The
header counts the steps (`3 / 12`) in its middle and carries the same two arrows as buttons.

The walk goes **round**: one step past the last link is the first one again, and one step back
from the first is the last. It walks exactly what is on screen, in the order the page reads,
and the line is re-read on every step – so links that appear or fold away while the popup is
open are part of the walk from the next key on. The arrows only grey out where the framed page
has left the page altogether, since there is then no position to step from.

While the popup is up the arrow keys belong to it alone: a track playing under the overlay is
not skipped forward and backward along with the walk, and the page behind does not scroll.
Closing the popup hands the keys straight back to the site.

### Pages stay loaded

The page being read keeps its frame when you step off it, and the two pages a key away load
into theirs while you are reading – so a step is a swap between documents that are already
there rather than a new page load, forward through the walk and just as much back. Up to seven
pages are held that way; the ones you have walked furthest from are dropped first, and closing
the popup drops all of them. Nothing is fetched from MixesDB before a popup is actually opened.

## Known limitations

- The arrow keys stop working once you have clicked *inside* the framed MixesDB page – from
  then on the keys belong to that page and scroll it. A click on the popup's header, or one of
  its two arrow buttons, hands them back. Scrolling the framed page with the mouse or the
  trackpad needs no click and leaves the keys alone.
- On windows narrower than about 1024px the popup does not open at all – the eye and the chips
  then behave like the plain links they are.
