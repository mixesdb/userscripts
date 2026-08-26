# CLAUDE.md

Name alias in prompts: `TI`, `tracklist importer`

The Tracklist Importer: the Insert/Merge/Report links the toolkit's usage row gains on a player
site with a filled tracklist box, and the mix-page edit form work behind them. It replaces the
stalled Tracklist Merger userscript (`Tracklist_Merger/`), whose merge logic it ports.

## Files

| File | What it is |
| --- | --- |
| `merge_core.js` | Pure text in, text out: the merge (`tlImporter_merge`), the matching and cue-format helpers, and the wikitext helpers for the `== Tracklist ==` section (`tlImporter_extractTracklist`, `tlImporter_setTracklist`, `tlImporter_tracklistWikitext`, `tlImporter_updateTlCategory`). No DOM, no network, no jQuery – deliberately self-contained (own copies of the normalization regexes), so the deno runner can load it. Keep it that way. |
| `funcs.js` | The DOM half: the toolkit links and Report box on the player site, the import + diff view + button gating on the mixesdb.com edit form. Loads the CSS lazily (`tlImporter_loadCss`). |
| `tracklist_importer.css` | Report box, candidate diff view, locked-button state. Loaded by `funcs.js`, not by the site scripts. |
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
  only fills what is missing. What it could not place is shown highlighted in the candidate
  view instead of being forced in.
- **Save is locked until "Show changes" ran.** The auto-click is the convenience; the lock is
  the safety – a merge must not be savable unseen.
- **`Tracklist: complete` is never downgraded** (same rule as the toolkit's siteHasTl block).
- **Chaptered originals (`;Name` rows) are skipped** on both sides – no link, no merge.
