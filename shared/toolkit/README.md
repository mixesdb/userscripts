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
- **Shared features:** [Tracklist box](../tracklist_editor/), [Page creator](../page_creator/),
  [MixesDB modal](../mixesdb_modal/)

## Features

### Is this player already on MixesDB

The box says one of two things:

- **This player is used on MixesDB** with a link to every mix page it is on, each followed by
  a blue **eye icon**, **EDIT** and **HIST** links (new tab) and how long ago that page was
  last edited. The eye opens the mix page in the [MixesDB modal](../mixesdb_modal/) – a popup
  right on the page, for a quick look that does not stop a playing player; every other kind of
  click treats it as a normal link to the page
- **This player is not used on MixesDB yet** plus a **Search the title** link

When the player lookup finds nothing, the mix page **texts** are searched for the player URL as
a second step. That catches the mirror case: a page that carries the URL only written out by
hand – as a mirror on a second `{{Player}}` line, as a URL variant, or inside a hidden comment –
answers **This player appears on MixesDB** with the same links, instead of wrongly claiming the
player is unused. The different wording is on purpose: the URL is written on that page but is
not its indexed player, so give the page a quick look before adding anything.

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
already – or a **Submit this player URL to TrackId.net** link when it does not. The row always
starts with the TrackId.net icon, so it can be told apart from the other rows at a glance.

### Tracklist state icons

In the chip row of the [Tracklist box](../tracklist_editor/)'s feedback, next to the row
count: the two `Tracklist:` indicators MixesDB shows under its own edit box, at chip size –
**?** for incomplete, **✓** for complete. The one that applies is lit and the other dimmed,
following whatever the Tracklist Editor said about the tracklist.

They only show the state, they do not set it: the **EDIT** links carry the lit one to MixesDB,
where the page opens filed under `[[Category:Tracklist: incomplete]]` or
`[[Category:Tracklist: complete]]` instead of `none`.

`none` is not shown. There is a tracklist on the page, so the state is never none.

### Newer than the MixesDB page

**This page was created after the MixesDB page was last edited** – a hint that the page's
tracklist may be worth carrying over.

## Known limitations

- The MixesDB lookup is one request per player, so pages with many players take a moment before
  the box appears, e.g. on finn-johannsen.de.
