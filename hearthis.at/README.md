# hearthis.at

Adds the MixesDB toolkit to hearthis.at track pages.

- **Runs on:** hearthis.at – track pages
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit)

## Features

### Toolkit

Below the track header: is this track already used on MixesDB – see
[Toolkit](../includes/README.md#toolkit).

hearthis.at players are embedded on MixesDB under two different URLs: the readable
`hearthis.at/user/track/` one and the numeric `hearthis.at/12345/` one the embed uses. Both are
looked up, so a track already on MixesDB is found no matter which of the two was used there, and
both are offered as copy-paste player URLs.

## Known limitations

- Only track pages. Profile and playlist pages get nothing.
- Because two URLs are checked per track, the toolkit needs two MixesDB requests and appears a
  moment later than on other sites.
