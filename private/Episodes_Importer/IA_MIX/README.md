# IA MIX (private)

Marks up Inverted Audio's IA MIX archive with what is and is not on MixesDB yet, and turns every
missing episode into one click that opens a prefilled new mix page.

Private import helper – see [private/](../../) for what that means.

- **Runs on:** inverted-audio.com/mix*, plus mixesdb.com edit forms
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/IA_MIX/script.user.js)
- **Shared features:** `../funcs.js` (shared with [Hernan Cattaneo Resident](../Hernan_Cattaneo_Resident/)), `../../Player_URLs/funcs.js`

## Features

### Which episodes are on MixesDB already

`Category:IA MIX` is read off the MixesDB API and the episode numbers in those page titles are
matched against the mixes listed on the page.

### "Copy to MixesDB" per episode

Every mix gets a link. For one already on MixesDB it says **See on MixesDB** and goes there. For
a missing one it says **Copy to MixesDB** and opens the edit form of the new page, prefilled with
the File details, the `{{Player}}`, the tracklist from the post's content run through MixesDB's
Tracklist Editor API, and the categories including the `Tracklist:` status.

Player URLs come from `player_episodes.js` – the list prepared for this show – so a mix page is
created with its player already in place.

Nothing is saved: the normal edit form opens, to check and submit. Links already used are marked.

### Hide what is done

A **Hide episodes that exist on MixesDB** checkbox leaves only the missing ones on the page, and
each entry has an **×** to take it off the list by hand. The archive's next page is loaded
automatically while hidden episodes are all that is left.

## Known limitations

- Private and hard-wired to this one show: category, selectors and the player URL list are
  constants in the script and in `player_episodes.js`.
- Mixes without an entry in `player_episodes.js` get a page without a player.
- Tracklists come from the post as Inverted Audio wrote them, so they need the usual check before
  saving.
