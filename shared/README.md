# Shared features

Features that are not owned by a single site script. Each site script loads what it needs and
decides where it goes on the page, so the wording here describes what these look like
everywhere – a script's own README says what it does on that site.

- **Runs on:** every site a userscript with the feature is installed for
- **Install:** nothing to install – these come with the site scripts
- **Shared features:** the bigger ones have their own page – [Toolkit](toolkit/),
  [Tracklist box](tracklist_editor/), [Page creator](page_creator/)

The features below have no page of their own: they are single helpers out of `global.js` rather
than a feature with its own files.

## Features

### File details

`global.js` (`getFileDetails_forToggle()`). The duration button next to a player. Clicking it
opens a copy-paste ready **File details** table for the mix page.

### TrackId.net submit links

`global.js` (`makeTidSubmitLink()`, `addTidPlaylistSubmitLink()`). Links that hand a player URL –
or a whole playlist/set – over to TrackId.net's submit form, prefilled.

Every page that shows a playlist gets the playlist link, not just the playlist's own page – a
YouTube video playing out of one counts too. They all submit the same playlist, whichever page
you use.

## Known limitations

- `waitForKeyElements.js` and `jquery-3.7.1.min.js` are vendored copies and are not documented
  here.
