# CLAUDE.md

Script name alias in prompts: `SC`

## Mix page title suggestion / "Create" link

Lives in `/shared/page_creator/` now, shared with the other site scripts - see its own
CLAUDE.md, including the workflow for a reported wrong title. This script only reads the values
off the SoundCloud API and hands them over in one `mdbPageCreator_add({...})` call (in the
`api_funcs`/track-header block of `script.user.js`), plus `mdbPageCreator_watchToolkit()`
wherever `getToolkit()` is called.

On a track page the SoundCloud API for that track should only be called once in total.

SoundCloud-only bits that must stay on this side, not move into the Page Creator:

- `scArtworkOriginalUrl()` - asking the CDN for the "-original" size is a SoundCloud trick.
  It lives in `api_funcs.js` (like `formatScDate()`), not `script.funcs.js`: `api_funcs.js` is
  the file other scripts reading the SC API `@require` (RA, 1001 Tracklists, Player Checker,
  and TrackId.net for its own Page Creator row), so only API-level helpers belong in it -
  never anything touching the SoundCloud page's DOM
- `getScPlayerUrl()` - the URL MixesDB embeds is not `location.href` here
- the `target` selector, and the fact that it must be a **string**: SoundCloud re-renders the
  track header repeatedly, and a captured node would be detached by the next render
- `scResolveHandles()` / `scHandleNoticeHtml()` in `api_funcs.js` - uploaders credit remixers
  by SoundCloud `@handle`, which only means something on this site. The lookup is
  `soundcloud.com/oembed`: no token and no `client_id`, and SAME ORIGIN here, so there is
  nothing to keep in sync when SoundCloud rotates its keys. Names are cached in
  `localStorage` under `mdb_sc_handle_names_v1`. It is called only after
  `mdbTracklist_detectInText()` / `...InComments()` found a tracklist AT ALL - that gate is
  what keeps the majority of tracks, which have no tracklist, from costing a request. The
  Page Creator is told about the swap through `mdbPageCreator_addTracklistNotice()` and never
  learns that handles were involved.
- `getScTrackComments()` in `api_funcs.js` - the endpoint and the OAuth token are ours. The
  Page Creator decides WHETHER the comments are worth fetching (only when the description held
  no tracklist) and calls this through the `loadComments` callback of
  `mdbPageCreator_addTracklist()`; it never learns where they came from.
- `scPurchaseUrl()` in `script.funcs.js` - the "Buy"/"Free download" URL with SoundCloud's
  `gate.sc` wrapper taken off. Two callers: the button in the track header, and the Page
  Creator, which searches this field for the created page's Notes link (`purchaseUrl` option).
  Note the guard is `/^https?:\/\/gate\.sc[\/?]/` - SoundCloud writes the wrapper without the
  slash today (`https://gate.sc?url=...`), and the slash-only test that stood in the button
  code let those through unwrapped. Do not "simplify" it back.
- `scFollowRedirect()` in **`script.funcs.js`** - the one thing here that is not
  SoundCloud-specific but SCRIPT-specific: it needs `GM_xmlhttpRequest`, which only this script
  grants. It goes to the Page Creator as the `followRedirect` option of `mdbPageCreator_add()`
  and is asked for exactly one thing - the episode page behind the shortened link a description
  writes instead of it ("Go to bit.ly/BRCPod ..."), for the created page's `== Notes ==`
  section. It must NOT move to `api_funcs.js`: TrackId.net `@require`s that file and ships with
  no `@grant` line at all, and it is meant to stay that way. The `@connect` list in the header
  has to name every host `mdbPageCreator_notesShorteners` does, or the reader gets a permission
  dialog. `redirect: "manual"` is deliberate - see the function's comment.

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
