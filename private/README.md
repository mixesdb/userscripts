# Private userscripts

Personal import helpers, not part of the userscript set MixesDB contributors install. They exist
for bulk work on one specific show at a time: importing a podcast's back catalogue, or filling in
player URLs for a series of mix pages that already exist.

Each of them is edited before use — the show, the category and the episode list are constants at
the top of the script, not settings.

## The scripts

| Script | Runs on | What it does |
| --- | --- | --- |
| [Hernan Cattaneo Resident](Episodes_Importer/Hernan_Cattaneo_Resident/) | podcast.hernancattaneo.com | Create-page links for missing Resident episodes |
| [IA MIX](Episodes_Importer/IA_MIX/) | inverted-audio.com | Create-page links for missing IA MIX episodes |
| [YouTube Player URLs](Player_URLs/YouTube/) | mixesdb.com | Insert a YouTube player URL into a mix page from a prepared list |
| [Apple Podcasts Player URLs](Player_URLs/Apple_Podcasts/) | mixesdb.com, podcasts.apple.com | Insert an Apple Podcasts player URL into a mix page from a prepared list |

`Episodes_Importer/funcs.js` and `Player_URLs/funcs.js` hold what the two pairs share.

Both importers need the [MixesDB Userscripts Helper](../MixesDB_Userscripts_Helper/) — or rather
their own `insertText` handling on mixesdb.com, which is why they are `@include`d there too.
