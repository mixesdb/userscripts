# MixesDB Userscripts Helper

Changes MixesDB itself so the other userscripts can hand things over to it – a page text, a
title, an artwork URL – and adds the links that lead from a mix page out to TrackId.net and
Apple Podcasts.

- **Runs on:** mixesdb.com
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js)
- **Shared features:** [TrackId.net submit links](../shared/README.md#trackidnet-submit-links)

## Features

### TrackId.net links on mix pages

Under every player on a mix page: **Exists on TrackId.net** with a link, or a **Submit** link
that opens TrackId.net's form with the player URL and the page title already filled in. The same
icon is added to mix page titles and to the results on `MixesDB:Explorer/Mixes`.

### Apple Podcasts search icons

A search icon next to mix page titles and Explorer results, searching Apple Podcasts for that
mix.

### Apple Music links

Track links to Apple Music are rewritten so they open in the browser instead of the Music app
(via `beta.music.apple.com`), and in the country you set.

### Edit form: clean a cloned page

When a mix page was created by cloning another one, the clone's leftovers are taken out on
opening the edit form: the player URLs inside `{{Player}}`, the tracklist, the values of the File
details table, and the `[[File:…]]` line is pointed at the new page's name.

### Edit form: fill from a URL parameter

- `&insert=<page text>` fills an **empty** edit box with a ready-made page text. This is what the
  SoundCloud script's **Create** link uses.
- `&img1url=<url>` is remembered for the tab and fills the **Source URL** field of MixesDB's own
  inline upload form once it appears after a preview. The upload itself stays a deliberate click.
- `MixesDB:Add_a_new_mix?title=<title>` prefills the title field of the "Add a new mix" form.

Nothing is ever saved automatically, and a field that already holds something is left alone.

### Edit form: the preview opens by itself

A link that says it came from the page creator (`&from=PageCreator`) lands on the edit form and
goes straight to **Preview**: the new mix page is on screen – players, the artwork's red file
link, the tracklist – with the edit box under it, instead of a wall of wikitext to read. Only
that link does it. The toolkit's **EDIT** link opens an existing page to change one line, where a
preview would only be a page load in the way.

### Edit form: the "Tracklist:" indicator follows the text

Under the edit box sit three indicator icons for the tracklist filing – none, incomplete,
complete. The one matching the `[[Category:Tracklist: …]]` the edit box actually carries is lit,
the other two stay dim, and this keeps tracking while the text changes: type the category, paste
a page text, or arrive through another script's **Create** link, and the right icon lights up –
no category in the text means none lit. MixesDB itself never lights them from the box's text, so
a page text that arrived filled in used to show three dark icons however clearly it named the
category.

### Edit form: AI formatting review

The formatting review section is moved below the form buttons, where it does not sit between the
edit box and Save.

## Known limitations

- The settings live at the top of the script (Apple Music country code, whether TrackId.net links
  and Apple Podcasts icons are added). They have to be set again after an update.
- This script is what makes the other scripts' **Create** links work. Without it, such a link
  still opens the right edit form, but empty.
