# MixesDB modal

A MixesDB page – on MixesDB itself a TrackId.net page – opened in a popup **on the page you are
working on**, for the five-second look ("is this the right category?", "does this page already
exist?") that is not worth a tab. The page behind it goes dark and blurred so nothing beside the
box competes for the eye.

Three things open it, on a desktop-sized window:

- the **blue eye icon** behind a mix page link in the [toolkit](../toolkit/)'s
  *This mix is on MixesDB* row
- the same icon behind the toolkit's *This player exists on TrackId.net* link, which frames
  that TrackId.net page instead of a MixesDB one. The toolkit's *Submit* link has none: a
  framed page is signed out, and the submit form is of no use signed out
- a plain left click on the [Page Creator](../page_creator/)'s category chips and their
  recent mix pages
- the same **blue eye icon** behind the *Exists on TrackId.net* links under the players on
  MixesDB – see [TrackId.net](../../TrackId.net/#links-under-the-players-on-mixesdb).
  This is the one place where the framed page is not a MixesDB page: on the wiki itself the
  look worth having is the one at TrackId.net, and that page arrives with everything the
  TrackId.net script makes of it – its tracklist in wiki syntax included

- **Runs on:** every site whose script loads it – [SoundCloud](../../SoundCloud/),
  [Mixcloud](../../Mixcloud/), [YouTube](../../YouTube/), [RA](../../RA/),
  [TrackId.net](../../TrackId.net/), [1001 Tracklists](../../1001_Tracklists/),
  [hearthis.at](../../hearthis.at/), [Player Checker](../../Player_Checker/), plus
  mixesdb.com itself for the TrackId.net links under the players
- **Install:** nothing to install – it comes with the site scripts

## Features

### The framed page

The popup frames the page right there: the state of the page you came from – a playing
player above all – is untouched, and closing the popup puts you back exactly where you were.
**Esc**, the **×** or a click beside the box close it; the header's **Open on MixesDB** –
**Open on TrackId.net** where that is what is framed – opens the same page as a tab after all.

Everything that asks for a tab still gets one: cmd/ctrl/shift- and middle-clicking the eye or a
chip opens the page as a tab like any link, and on a narrow window (where the framed page would
be smaller than a tab) they simply stay the links they are.

### Moving the popup out of the way

The popup can be **dragged by its header** – grab the bar with the arrows in it and the box
follows the mouse. It may be pushed far past the edge of the window, far enough to park it in a
corner as a strip; only a hand's width of it and its header stay inside, so there is always
something left to pull it back by.

The moment the box starts moving, the **blur over the page fades away**: dragging the popup
aside is done to look at what is under it, and the point of the drag is that this becomes
readable. It stays clear until the popup is closed. Closing and opening it again puts the box
back in the middle of the window.

### Walking the page's MixesDB links

While the popup is open the **left and right arrow keys** frame the previous or the next
link on the page – every mix page of the toolkit's row, every category chip and folded-out mix
page of the Page Creator's bar, and on MixesDB every player's TrackId.net link – without going
back to the page between two looks. The header counts the steps (`3 / 12`) in its middle and
carries the same two arrows as buttons.

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
- A framed TrackId.net page is always **signed out**, and its cookie banner is back every time:
  the browser gives a page in a frame its own separate storage, and TrackId.net keeps its
  session there. Nothing worth framing needs the account – but anything that does (submitting a
  request, amendments) belongs in a real tab. A framed MixesDB page can be signed out the same
  way – it depends on how the browser treats cookies of a framed site – which shows as the
  logged-out skin and changes nothing about reading the page.
