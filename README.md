# MixesDB userscripts

MixesDB userscripts change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. by adding copy-paste-ready tracklists in wiki syntax.

See https://www.mixesdb.com/w/Help:MixesDB_userscripts for installation and general help.

## The scripts

Each folder holds one userscript and a README describing its features.

| Script | Runs on | What it does |
| --- | --- | --- |
| [SoundCloud](SoundCloud/) | soundcloud.com | Page creator, tracklist from the description, toolkit, artwork, list filters |
| [Mixcloud](Mixcloud/) | mixcloud.com | Toolkit, artwork URL, file details, hide used shows |
| [YouTube](YouTube/) | youtube.com | Page creator, tracklist from the description, toolkit for mix-length videos, thumbnail, file details |
| [TrackId.net](TrackId.net/) | trackid.net, mixesdb.com | Tracklist in wiki syntax, page creator, player embed, integration marker, TID links under MixesDB players |
| [RA](RA/) | ra.co | Toolkit, podcast tracklist, artwork URLs, copy buttons |
| [1001 Tracklists](1001_Tracklists/) | 1001tracklists.com, mixesdb.com | Tracklist in wiki syntax, toolkit for every player, tracklist import to MixesDB |
| [hearthis.at](hearthis.at/) | hearthis.at | Toolkit for both player URL variants |
| [NTS](NTS/) | nts.live | Tracklist in wiki syntax |
| [BBC](BBC/) | bbc.co.uk | Tracklist in wiki syntax |
| [The Lot Radio](TheLotRadio/) | thelotradio.com | Tracklist in wiki syntax |
| [radioeins](radioeins/) | radioeins.de | Tracklist in wiki syntax |
| [Discogs](Discogs/) | discogs.com | Release tracklist in wiki syntax, file details |
| [Apple Music](Apple_Music/) | music.apple.com | Album tracklist in wiki syntax |
| [Apple Podcasts](Apple_Podcasts/) | podcasts.apple.com | Episode URL fields, MixesDB search links |
| [Internet Archive](InternetArchive/) | archive.org | Episode table with downloads and MixesDB usage (beta) |
| [Player Checker](Player_Checker/) | blogs and podcast sites | Toolkit for embedded players, tracklists |
| [MixesDB Userscripts Helper](MixesDB_Userscripts_Helper/) | mixesdb.com | Makes MixesDB accept what the other scripts hand over |
| [Tracklist Cue Switcher](Tracklist_Cue_Switcher/) | mixesdb.com, trackid.net | Clickable cues, minutes ⟷ clock times |

Shared across the site scripts, in [shared/](shared/): the [toolkit](shared/toolkit/), the
[tracklist box](shared/tracklist_editor/), the [page creator](shared/page_creator/), the
[tracklist importer](shared/tracklist_importer/) and the [MixesDB modal](shared/mixesdb_modal/).

[private/](private/) holds personal import helpers for bulk work on a single show. They are not
part of the set contributors install.

## Issues

There probably won't be any issues listed here. Discussion takes place on Discord:
https://discord.com/channels/1258107262833262603/1261652338314055742
