# Apple Podcasts Player URLs (private)

Adds the Apple Podcasts player URL to a MixesDB mix page from a prepared list, matched by the
episode number in the page title – and collects that list off an Apple Podcasts show page in the
first place.

Private import helper – see [private/](../../) for what that means.

- **Runs on:** mixesdb.com and podcasts.apple.com
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/Apple_Podcasts/script.user.js)
- **Shared features:** `../funcs.js` (shared with [YouTube Player URLs](../YouTube/))

## Features

### "AP" button on the edit form

The edit toolbar gets a **Players:** group. When the page title carries an episode number the
prepared list knows, an **AP** button appears, inserts that Apple Podcasts URL into the page's
`{{Player}}` – or creates the template when the page has none yet – and saves. It fires by
itself as soon as it appears, so a show can be worked through without clicking.

Where the URL lands is set by `addAtPosition` at the top of the script: `"first"` puts it in
front of the URLs already in the template, `"last"` after them, and `"middle"` in the centre of
the resulting list – with only one URL already there, `"middle"` also puts it second.

### "1=" button

Renumbers the URLs of an existing `{{Player}}` to the referenced form (`|1=URL |2=URL`) and
switches the template to `mode=mirrors`. When the page uses `t` title parameters it warns instead
of saving – those have to be renumbered by hand.

Both buttons order the URLs of a multi-player page by the preferred site order in `../funcs.js`
(Apple Podcasts, SoundCloud, hearthis.at, YouTube, Mixcloud). `addAtPosition` overrules that for
the inserted URL only – the URLs already in the template keep that order among themselves.

### Collecting the episode list

On an Apple Podcasts show page, every episode's title and URL is written to the console as
`title : url`. That log is what the episode list at the top of the script is built from – the
titles get normalised down to the episode number, which then has to match what the MixesDB page
titles carry.

### "Edit all results" on the Explorer

On `MixesDB:Explorer/Mixes` and `MixesDB:Explorer/Lists`, a link in the results header opens the
edit form of every result in its own tab.

## Known limitations

- Private and per-show: the episode list and the title pattern that matches episode numbers are
  constants at the top of the script and are swapped out for each show worked on. The pattern
  currently in place is the one for `Resident <n>`; earlier shows are kept as commented-out lines
  next to it.
- Building the list means copying it out of the console by hand – there is no export.
- The button saves the page. Check the show and the list before letting it run through a
  catalogue.
