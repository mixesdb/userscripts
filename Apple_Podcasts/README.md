# Apple Podcasts

Makes Apple Podcasts episode URLs easy to grab and adds MixesDB search links next to episode
titles.

- **Runs on:** podcasts.apple.com — episode pages, show pages, search results
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js)
- **Shared features:** none

## Features

### Episode URL fields

Apple Podcasts offers no way to copy an episode URL. A field holding it is added:

- on an episode page, below the heading, preselected so it can be copied straight away
- under every episode in a show's episode list
- next to the top result of a search

### MixesDB search links

A MixesDB logo next to the episode title — on the episode page and in a show's episode list —
searching MixesDB for that episode.

### Bigger search form

When a page is opened with a `term` parameter (which is what the search links from other
userscripts produce), Apple's own search box does not show the keywords. A second, larger search
form carrying them is added at the top of the page, focused and ready to refine.

## Known limitations

- Apple Podcasts blocks external stylesheets, so this script's CSS is inlined and stays minimal.
- Episode pages have no tracklist and no toolkit — this script is about getting the URL and the
  title out of the page.
