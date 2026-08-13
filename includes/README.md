# Shared features

Features that are not owned by a single site script. Each site script loads what it needs and
decides where it goes on the page, so the wording here describes what these look like
everywhere – a script's own README says what it does on that site.

- **Runs on:** every site a userscript with the feature is installed for
- **Install:** nothing to install – these come with the site scripts
- **Shared features:** [Page creator](page_creator/) has its own page

## Features

### Toolkit

`toolkit.js`. The grey **Toolkit** box next to a player. It takes the player URL, asks MixesDB
whether that player is already used, and shows:

- **This player is used on MixesDB** with a link to every mix page it is on, each followed by
  **EDIT** and **HIST** links (new tab) and how long ago that page was last edited
- **This player is not used on MixesDB yet** plus a **Search the title** link
- **Used / Unused players** – the copy-paste ready player URLs, on pages that hold more than one
  player. The URL is written out in full so it can be copied, tracking parameters removed
- **Embed URL** – the URL MixesDB embeds, in a field with a copy button, when the player belongs
  to the page being visited
- **This player exists on TrackId.net** (plus whether that tracklist is integrated into MixesDB
  already), or a **Submit to TrackId.net** link when it does not
- **This page was created after the MixesDB page was last edited** – a hint that the page's
  tracklist may be worth carrying over

Player URLs are read out of the page's embedded players, so a SoundCloud, Mixcloud, hearthis.at
or YouTube widget is recognised wherever it is embedded.

### Tracklist box

`global.js` (`#tlEditor`, `apiTracklist()`, `fixTLbox()`). The editable box holding a tracklist
in MixesDB wiki syntax. Whatever a site script scraped off the page goes through MixesDB's
Tracklist Editor API first, so what ends up in the box is formatted the way MixesDB wants it,
with the API's feedback (complete / incomplete / warnings) shown above it.

### File details

`global.js` (`getFileDetails_forToggle()`). The duration button next to a player. Clicking it
opens a copy-paste ready **File details** table for the mix page.

### TrackId.net submit links

`global.js` (`makeTidSubmitLink()`, `addTidPlaylistSubmitLink()`). Links that hand a player URL –
or a whole playlist/set – over to TrackId.net's submit form, prefilled.

## Known limitations

- The toolkit's MixesDB lookup is one request per player, so pages with many players take a
  moment before the box appears.
- `waitForKeyElements.js` and `jquery-3.7.1.min.js` are vendored copies and are not documented
  here.
