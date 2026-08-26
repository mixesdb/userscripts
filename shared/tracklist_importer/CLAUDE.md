# CLAUDE.md

Name alias in prompts: `TI`, `tracklist importer`

The Tracklist Importer: the Insert/Merge/Report links the toolkit's usage row gains on a player
site with a filled tracklist box, and the mix-page edit form work behind them. It replaces the
stalled Tracklist Merger userscript (`Tracklist_Merger/`), whose merge logic it ports.

## Files

| File | What it is |
| --- | --- |
| `merge_core.js` | Pure text in, text out: the merge (`tlImporter_merge`), the matching and cue-format helpers, and the wikitext helpers for the `== Tracklist ==` section (`tlImporter_extractTracklist`, `tlImporter_setTracklist`, `tlImporter_tracklistWikitext`, `tlImporter_updateTlCategory`). No DOM, no network, no jQuery – deliberately self-contained (own copies of the normalization regexes), so the deno runner can load it. Keep it that way. |
| `funcs.js` | The DOM half: the toolkit links and Report box on the player site, the import + review block (Original / Merged / Candidate above the edit box) + Apply + button gating on the mixesdb.com edit form. Loads the CSS lazily (`tlImporter_loadCss`). |
| `tracklist_importer.css` | Report box, review block, locked-button state. Loaded by `funcs.js`, not by the site scripts. |
| `importer_examples.js` | Test data: merges and page-text cases. Reported merges become cases here, like title reports in `../page_creator/title_examples.js`. |
| `importer_examples_test.js` | The deno runner for it. |

Run the examples before and after touching `merge_core.js`:

```
deno run --allow-read shared/tracklist_importer/importer_examples_test.js
```

## How the candidate travels

The Insert/Merge link copies the toolkit EDIT link's href at click time (so `&siteHasTl=...`
rides along) and appends `&mdbTlImporter=<mode>` plus the candidate in the URL **hash**
(`#mdbTlImporterTl=...`). The hash never reaches the server, so tracklist length cannot break
the request line the way a query parameter could – and the same userscript runs on
mixesdb.com/w/*, where `funcs.js` reads it back.

## Settled

- **The live page decides Insert vs Merge**, not the link's label: the page can change between
  the link being built and clicked. The label is only what the fetch at link-build time said.
- **The original wins.** The candidate never overwrites an original cue, title or label – it
  only fills what is missing. What it could not place stays un-highlighted in the review
  block's Candidate column (highlights mark what the merge TOOK, mirrored by the Original
  column highlighting what the merge changed) instead of being forced in – hand-salvage goes
  through the Merged box and its Apply button.
- **The review block sits between MediaWiki's diff and the edit form** (`#editform`), never
  below the box: the reading order is the wiki's own diff first, then our three columns, then
  the form. Its Merged column is a REAL Tracklist Editor box (`#tlEditor`/`#mixesdb-TLbox`,
  same ids as on the player sites – nothing on the wiki edit page carries them), so live
  updates, feedback chips and the deliberately-scoped mixesdb.com exception in
  `toolkit_tlStateButtons()` all come from the shared code instead of copies.
- **Apply inserts the box text VERBATIM** – what the reader sees is what lands in the wiki
  edit box. The one synchronous TLE call only supplies the verdict (category + icons) and the
  re-rendered feedback; it never rewrites the text. The seq bump on the box drops the blur
  update the click itself triggered, so nothing reformats the box behind the apply either.
- **A merge that would change nothing gets no link.** `changed` is read off the merged TEXT,
  not off the write counter in `state.changes`: writing a value the original already carried
  counted as a change and produced a link into a `(No difference)` diff. The link builder runs
  the merge itself for this – it is pure JS, so that costs nothing but a few ms.
- **Save is locked until "Show changes" ran.** The auto-click is the convenience; the lock is
  the safety – a merge must not be savable unseen.
- **`Tracklist: complete` is never downgraded** (same rule as the toolkit's siteHasTl block).
- **Chaptered originals (`;Name` rows) are skipped** on both sides – no link, no merge.
