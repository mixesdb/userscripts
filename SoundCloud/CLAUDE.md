# CLAUDE.md

Script name alias in prompts: `SC`

## Mix page title suggestion

Every title reported as wrongly suggested lives in `title_examples.js` as its input and the
title it should produce. Run them before and after touching anything the suggestion uses
(`title_definitions.js`, the `mdbTitle_*` functions and `buildMixesdbTitle()` in
`script.funcs.js`):

```
deno run --allow-read SoundCloud/title_examples_test.js
```

**I never edit `title_examples.js` by hand - Claude adds every reported title to it.** Part of
fixing the report, not a separate step or something to ask about first. Per report:

1. Add the case: `url`, `title`, `channel`, `date`, `expect`. `expect` is my expected title.
2. `channel` is the API field `username`, NOT the URL slug - they differ constantly
   (`discoanon` -> "Discoholics Anonymous", `sevenberlin` -> "SEVEN"). If I did not give it,
   or gave it in passing, read it off
   `https://soundcloud.com/oembed?format=json&url=<track url>` rather than guessing it.
3. Never record what the suggestion currently produces - the runner prints that every run.
4. Run the suite. It has to end at "all pass" before the work is done, old cases included.

If a title cannot realistically be reached (an event name that reads exactly like a mix name,
say), do not leave the case failing forever - pin `expect` to what it produces today and note
in a comment on the case what the ideal would be, so the parts that DO work stay guarded.
Say so in the reply rather than quietly lowering the bar.

What a case is guarding is not noted on the case - it is in the rule it belongs to, in
`title_definitions.js`, which is where the learning from each report goes. A failing case
sends you there.

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
