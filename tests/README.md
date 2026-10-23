# Offline SoundCloud compatibility tests

Run `deno test --allow-read tests/soundcloud_metadata_test.js` from the repository root.
The tests evaluate the real SoundCloud callback, TrackId.net Page Creator callback,
shared toolkit resolver, API helper, and tracklist detector with mocked DOM/network boundaries.
They cover supported metadata, description and comment tracklists, download/purchase buttons,
duration gates, SPA navigation, private-share locators, playlists, errors and versioned consumers.
No package installation, provider request or browser credentials are needed.

To exercise the client requests against the companion MixesDB PHP implementation too:

```sh
deno test --allow-read --allow-run=python3 tests/soundcloud_metadata_test.js -- --server-root=/absolute/path/to/mixesdb
```

That checkout must contain `tests/test_soundcloud_public_track.py` from MixesDB PR #1711.
Python 3 and PHP are required for this paired mode. The existing PHP fixture dispatches
real API code with a disposable mocked provider; it does not contact SoundCloud.

The server must provide `getScTrack`, `getScTrackComments` and `getScPermalink` before these
updated dependencies are used. Old scripts still using `getScAccessToken` must be updated
before that action is retired. Coordinate the server and userscript rollout; never restore
bearer disclosure as a compatibility fallback. These tests do not validate a live provider or
Tampermonkey rendering on the actual sites.
