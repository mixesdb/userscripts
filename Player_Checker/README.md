# Player Checker

Checks the players embedded in blog and podcast posts against MixesDB, on the sites that publish
mixes without a player page of their own.

- **Runs on:** finn-johannsen.de, groove.de podcast posts, wearesoundspace.com, toxicfamily.de
- **Install:** [script.user.js](https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Player_Checker/script.user.js)
- **Shared features:** [Toolkit](../includes/README.md#toolkit), [Tracklist box](../includes/README.md#tracklist-box)

## Features

### Toolkit for every embedded player

Every visible player on the page – SoundCloud, Mixcloud, YouTube or hearthis.at – is looked up on
MixesDB and the result appears above it: is this mix on MixesDB already, and what is the
copy-paste ready player URL. See [Toolkit](../includes/README.md#toolkit).

On finn-johannsen.de, whose front page holds many posts at once, each post gets its own toolkit
rather than one shared box.

### Tracklists on finn-johannsen.de

Tracklists written into a post are turned into MixesDB wiki syntax in an editable box, from both
shapes the blog uses:

- paragraphs with one track per line, with or without a leading timestamp (timestamps become
  cues, and a track number behind the timestamp is dropped)
- two-column tables of title and artist

A block is only treated as a tracklist when it has timestamps, or more than eight lines.

## Known limitations

- The site list is the `@include` list above – a new blog needs a line added to the script.
- Only finn-johannsen.de gets tracklists. The other sites are player checks only.
- Posts with many players take a moment: each player is one MixesDB lookup, and posts are worked
  through one after the other.
