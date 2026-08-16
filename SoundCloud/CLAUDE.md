# CLAUDE.md

Script name alias in prompts: `SC`

## Mix page title suggestion / "Create" link

Lives in `/shared/page_creator/` now, shared with the other site scripts - see its own
CLAUDE.md, including the workflow for a reported wrong title. This script only reads the values
off the SoundCloud API and hands them over in one `mdbPageCreator_add({...})` call (in the
`api_funcs`/track-header block of `script.user.js`), plus `mdbPageCreator_watchToolkit()`
wherever `getToolkit()` is called.

On a track page the SoundCloud API for that track should only be called once in total.

SoundCloud-only bits that must stay on this side, not move into the page creator:

- `scArtworkOriginalUrl()` - asking the CDN for the "-original" size is a SoundCloud trick.
  It lives in `api_funcs.js` (like `formatScDate()`), not `script.funcs.js`: `api_funcs.js` is
  the file other scripts reading the SC API `@require` (RA, 1001 Tracklists, Player Checker,
  and TrackId.net for its own page creator row), so only API-level helpers belong in it -
  never anything touching the SoundCloud page's DOM
- `getScPlayerUrl()` - the URL MixesDB embeds is not `location.href` here
- the `target` selector, and the fact that it must be a **string**: SoundCloud re-renders the
  track header repeatedly, and a captured node would be detached by the next render
- `getScTrackComments()` in `api_funcs.js` - the endpoint and the OAuth token are ours. The
  page creator decides WHETHER the comments are worth fetching (only when the description held
  no tracklist) and calls this through the `loadComments` callback of
  `mdbPageCreator_addTracklist()`; it never learns where they came from.

The tracklist box goes after `#mdb-toolkit` - below the toolkit, above SoundCloud's own
description - which works in **both** layouts: in the new one the toolkit is the last thing in
`#mdb-sc-trackExtras` (right under the Track header), in the old one it is inserted before
`.listenDetails__partialInfo`, which holds the description.

**Utility-class collisions.** The Material layout ships utility CSS where `.fixed` means
`position: fixed`. `fixTLbox()` used to put a bare `"fixed"` class on the tracklist textarea,
which took it out of the flow and laid it over the page (The Lot Radio hit the same thing and
worked around it locally). The class is `mdb-tlBox-fixed` now, and `page_creator.css` states
`position: static !important` on the box on top of that. Any class we add to markup on these
sites has to be namespaced - a plain adjective is a collision waiting to happen.

## Locale: aria-labels vs. visible element text

SoundCloud track pages are used by both English and German locale accounts (reports come in
from both). These two kinds of text behave differently and must be handled differently:

- **aria-label / other structural attributes are NOT translated.** e.g. the Track header
  container is served as `aria-label="Track header"` or `aria-label="Track-Header"` (hyphen,
  capital H) depending on account/rollout bucket - that variance is a rollout quirk, not a
  locale one. It's still English text for German accounts too. Selectors matching these can
  stay English-only, but must handle known rollout-bucket string variants (see the
  case-insensitive `"Track header" i, "Track-Header" i` selector in script.user.js).
- **Visible UI text (button labels, link text, etc.) IS translated per account locale.** e.g.
  the description's "Show more" / "Show less" toggle renders as "Mehr anzeigen" / "Weniger
  anzeigen" for German accounts. A selector or exact-string check against only the English
  label will silently fail for those users with no console error - it just looks like the
  feature does nothing.

**Rule:** any time code matches an element by its visible text (`:contains(...)`,
`.text().trim() == "..."`, etc.), add both the English and German strings - see
`showMoreLabels`/`showLessLabels` in script.user.js for the pattern (parallel arrays of
labels, joined into a `:contains()` selector, exact-match checked via `.indexOf(...)`).
When matching by aria-label or other non-visible attributes instead, no German variant is
needed, but check whether SoundCloud is known to serve multiple literal strings for the same
attribute across rollout buckets (as with Track header/Track-Header) and cover those.
