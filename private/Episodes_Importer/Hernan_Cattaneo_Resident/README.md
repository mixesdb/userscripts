# Hernan Cattaneo Resident (private)

Marks up the Resident podcast's episode archive with what is and is not on MixesDB yet, and turns
every missing episode into one click that opens a prefilled new mix page.

Private import helper — see [private/](../../) for what that means.

- **Runs on:** podcast.hernancattaneo.com, plus mixesdb.com edit forms
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/Hernan_Cattaneo_Resident/script.user.js)
- **Shared features:** `../funcs.js` (shared with [IA MIX](../IA_MIX/))

## Features

### Which episodes are on MixesDB already

`Category:Resident (Show)` is read off the MixesDB API and the episode numbers in those page
titles are matched against the episodes on the page. A hand-maintained list in the script covers
the episodes whose MixesDB title does not carry a matching number.

### "Copy to MixesDB" per episode

Every episode gets a link. For one already on MixesDB it says **See on MixesDB** and goes there.
For a missing one it says **Copy to MixesDB** and opens the edit form of the new page, prefilled
with:

- `== File details ==` with `{{StandardShow1h}}`
- the `{{Player}}` with the episode's MP3 URL
- the tracklist from the episode description, run through MixesDB's Tracklist Editor API
- the categories: year, `Hernan Cattaneo`, `Resident (Show)`, `Progressive House` and the
  `Tracklist:` status the API's feedback gives

The page title is built from the episode title, which comes in several shapes over the years
(`Resident / Episode 502 / Dec 19 2020`, `502 Hernan Cattaneo podcast - 2020-12-19`) and in
Spanish month names as well as English ones.

Nothing is saved — the normal edit form opens, to check and submit. Links already used are
marked, so a long session can be picked up where it stopped.

### Hide what is done

A **Hide episodes that exist on MixesDB** checkbox leaves only the missing ones on the page, and
each episode has an **×** to take it off the list by hand. The archive's "load more" is clicked
automatically while hidden episodes are all that is left.

## Known limitations

- Private and hard-wired to this one podcast: category, artist, genre, selectors and the manual
  episode list are constants at the top of the script.
- Tracklists come from the episode description as the podcast writes them, so they need the usual
  check before saving.
- The list of episodes covered by hand has to grow whenever an episode is filed under a MixesDB
  title without a matching number.
