# Toolkit

The grey **Toolkit** box next to a player. It takes the player URL, asks MixesDB whether that
player is already used and answers the one question worth asking before writing anything: does
this mix have a page yet. Shared by the site scripts, so it looks and behaves the same
everywhere – a script's own README says where on that site the box shows up.

- **Runs on:** every site whose script loads it – [SoundCloud](../../SoundCloud/),
  [Mixcloud](../../Mixcloud/), [YouTube](../../YouTube/), [RA](../../RA/),
  [TrackId.net](../../TrackId.net/), [1001 Tracklists](../../1001_Tracklists/),
  [hearthis.at](../../hearthis.at/), [Internet Archive](../../InternetArchive/),
  [Player Checker](../../Player_Checker/), [MixesDB Userscripts Helper](../../MixesDB_Userscripts_Helper/)
- **Install:** nothing to install – it comes with the site scripts
- **Shared features:** [Tracklist box](../tracklist_editor/), [Page creator](../page_creator/)

## Features

### Is this player already on MixesDB

The box says one of two things:

- **This player is used on MixesDB** with a link to every mix page it is on, each followed by
  **EDIT** and **HIST** links (new tab) and how long ago that page was last edited
- **This player is not used on MixesDB yet** plus a **Search the title** link

Player URLs are read out of the page's embedded players, so a SoundCloud, Mixcloud, hearthis.at
or YouTube widget is recognised wherever it is embedded.

### Used / Unused players

On pages holding more than one player, the copy-paste ready player URLs sorted into the ones
MixesDB already uses and the ones it does not. The URL is written out in full so it can be
copied, tracking parameters removed.

### Embed URL

The URL MixesDB embeds, in a field with a copy button, shown when the player belongs to the page
being visited.

### TrackId.net check

**This player exists on TrackId.net**, plus whether that tracklist is integrated into MixesDB
already – or a **Submit to TrackId.net** link when it does not.

### Newer than the MixesDB page

**This page was created after the MixesDB page was last edited** – a hint that the page's
tracklist may be worth carrying over.

## Known limitations

- The MixesDB lookup is one request per player, so pages with many players take a moment before
  the box appears, e.g. on finn-johannsen.de.
