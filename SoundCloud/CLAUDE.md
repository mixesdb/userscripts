# CLAUDE.md

Script name alias in prompts: `SC`

## Mix page title suggestion / "Create" link

Lives in `/includes/page_creator/` now, shared with the other site scripts - see its own
CLAUDE.md, including the workflow for a reported wrong title. This script only reads the values
off the SoundCloud API and hands them over in one `mdbPageCreator_add({...})` call (in the
`api_funcs`/track-header block of `script.user.js`), plus `mdbPageCreator_watchToolkit()`
wherever `getToolkit()` is called.

SoundCloud-only bits that must stay on this side, not move into the page creator:

- `scArtworkOriginalUrl()` - asking the CDN for the "-original" size is a SoundCloud trick
- `getScPlayerUrl()` - the URL MixesDB embeds is not `location.href` here
- the `target` selector, and the fact that it must be a **string**: SoundCloud re-renders the
  track header repeatedly, and a captured node would be detached by the next render

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
