# YouTube Player URLs (private)

Adds the YouTube player URL to a MixesDB mix page from a prepared list, matched by the episode
number in the page title. For working through a show's back catalogue page by page.

Private import helper – see [private/](../../) for what that means.

- **Runs on:** mixesdb.com
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js)
- **Shared features:** `../funcs.js` (shared with [Apple Podcasts Player URLs](../Apple_Podcasts/))

## Features

### "YT" button on the edit form

The edit toolbar gets a **Players:** group. When the page title carries an episode number the
prepared list knows, a **YT** button appears, inserts that YouTube URL into the page's
`{{Player}}` – or creates the template before the Notes/Tracklist section when the page has none
yet – and saves. It fires by itself as soon as it appears, so the page can be worked through
without clicking.

A page that already holds a YouTube URL is left alone and not saved again.

### "1=" button

Renumbers the URLs of an existing `{{Player}}` to the referenced form (`|1=URL |2=URL`) and
switches the template to `mode=mirrors`, which is what a page with several players for the same
mix needs.

When the page uses `t` title parameters, it warns instead of saving – those have to be renumbered
by hand.

### "Edit all results" on the Explorer

On `MixesDB:Explorer/Mixes` and `MixesDB:Explorer/Lists`, a link in the results header opens the
edit form of every result in its own tab.

## Known limitations

- Private and per-show: the episode list and the title pattern that matches episode numbers are
  constants at the top of the script and are swapped out for each show worked on. The pattern
  currently in place is the one for `Transmissions <n>`.
- The list is generated locally with `youtube_ids.sh` and pasted into the script rather than
  fetched, so it is only as current as the last paste.
- The button saves the page. Check the show and the list before letting it run through a
  catalogue.
