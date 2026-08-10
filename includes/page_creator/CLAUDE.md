# CLAUDE.md

Name alias in prompts: `page creator`

The MixesDB page creator: the row (`#mdb-pageCreator`) a site script puts next to a player,
holding an editable suggested mix page title, a confidence score and a "Create" link that opens
the new page's edit form prefilled with the file details, the `{{Player}}`, the categories and
the artwork URL.

Shared by every site userscript. Nothing in here may look at a specific site: the site script
reads the values off its own page/API and hands them over.

## Files

| File | What it is |
| --- | --- |
| `page_creator.js` | The row and the "Create" link. `mdbPageCreator_*`. Public entry points: `mdbPageCreator_add(options)` and `mdbPageCreator_watchToolkit()` - see the header comment for the options |
| `title_builder.js` | `buildMixesdbTitle()` and the `mdbTitle_*` parser. No DOM, no network except the MixesDB category lookup |
| `title_definitions.js` | The word lists and channel->show mappings the parser uses. Plain data, meant to be extended by hand - this is where the learning from each report goes |
| `page_creator.css` | Styles the row. Loaded with `loadRawCss()` by each site script |
| `title_examples.js` | Test data: every title ever reported as wrong |
| `title_examples_test.js` | The deno runner for it |

## Adding a site script

`@require` the three JS files in this order (they are plain scripts, not modules, so order is
the load order):

```
title_definitions.js, title_builder.js, page_creator.js
```

then `loadRawCss()` `page_creator.css` next to the script's own `script.css`, and call
`mdbPageCreator_add({ title, channel, createdAt, ..., target, placement })` when the site's data
arrives plus `mdbPageCreator_watchToolkit()` whenever the toolkit is (re)built. SoundCloud is
the reference implementation.

`target` should be a **selector string**, not a node: these sites re-render under the script's
feet, and the string is looked up again on every render.

## Title suggestion reports

Every title reported as wrongly suggested lives in `title_examples.js` as its input and the
title it should produce. Run them before and after touching anything the suggestion uses
(`title_definitions.js`, `title_builder.js`):

```
deno run --allow-read includes/page_creator/title_examples_test.js
```

**I never edit `title_examples.js` by hand - Claude adds every reported title to it.** Part of
fixing the report, not a separate step or something to ask about first. Per report:

1. Add the case under the site it was reported from: `url`, `title`, `channel`, `date`,
   `expect`. `expect` is my expected title.
2. `channel` is the channel/uploader name as the site's API gives it, NOT the URL slug - they
   differ constantly (on SoundCloud it is the API field `username`: `discoanon` ->
   "Discoholics Anonymous", `sevenberlin` -> "SEVEN"). If I did not give it, or gave it in
   passing, read it off the site rather than guessing it - for SoundCloud that is
   `https://soundcloud.com/oembed?format=json&url=<track url>`.
3. Never record what the suggestion currently produces - the runner prints that every run.
4. Run the suite. It has to end at "all pass" before the work is done, old cases included.

If a title cannot realistically be reached (an event name that reads exactly like a mix name,
say), do not leave the case failing forever - pin `expect` to what it produces today and note
in a comment on the case what the ideal would be, so the parts that DO work stay guarded.
Say so in the reply rather than quietly lowering the bar.

What a case is guarding is not noted on the case - it is in the rule it belongs to, in
`title_definitions.js`. A failing case sends you there.

The builder is shared, so a rule learned from one site's report applies to all of them - which
is also why a fix must be checked against the cases of the OTHER sites, not just the reporting
one.
