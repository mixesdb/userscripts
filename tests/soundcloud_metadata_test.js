// deno test --allow-read tests/soundcloud_metadata_test.js
// Optional paired check: add --allow-run=python3 and -- --server-root=/path/to/mixesdb.
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = file => Deno.readTextFileSync(new URL(file, root));
const api = read('SoundCloud/api_funcs.js');
const sc = read('SoundCloud/script.user.js');
const tid = read('TrackId.net/script.user.js');
const toolkit = read('shared/toolkit/funcs.js');
const serverRoot = Deno.args.find(value => value.startsWith('--server-root='))?.slice(14);
const sentinel = 'offline-application-bearer-sentinel';
const track = {
    kind: 'track', sharing: 'public', id: 123, title: 'Artist - Radio 123',
    user: { username: 'Artist', permalink_url: 'https://soundcloud.com/artist' },
    permalink_url: 'https://soundcloud.com/artist/mix', duration: 7200000,
    created_at: '2026/10/22 12:00:00 +0000', release_date: null,
    last_modified: '2026/10/22 12:00:00 +0000', downloadable: true,
    artwork_url: 'https://i1.sndcdn.com/artwork-large.jpg',
    description: '01. Artist - First track\n02. Artist - Second track\n03. Artist - Third track',
    purchase_url: 'https://example.test/episode', purchase_title: 'Free download'
};
const bodies = ['1. Artist - First track\n2. Artist - Second track\n3. Artist - Third track'];
const clone = value => JSON.parse(JSON.stringify(value));

// Run the real PHP dispatcher/projection with its existing offline provider adapter when
// checking both repositories together. No server/provider service or network is needed.
function pairedResponse(options, resource) {
    if (!serverRoot) {
        if (options.data.query === 'getScTrackComments') return { bodies };
        if (options.data.query === 'getScPermalink') return { kind: resource.kind, permalink_url: resource.permalink_url };
        return clone(resource);
    }
    const bridge = `import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom tests.test_soundcloud_public_track import SoundcloudPublicTrackTests\nfixture=json.loads(sys.argv[2])\nr=SoundcloudPublicTrackTests().call(**fixture)\nprint(json.dumps(r))`;
    const responses = [{ status: 200, body: JSON.stringify({ ...resource, access_token: sentinel }) }];
    if (options.data.query === 'getScTrackComments') {
        responses.push({ status: 200, body: JSON.stringify({ collection: bodies.map(body => ({ body, access_token: sentinel })), next_href: 'https://attacker.invalid/' }) });
    }
    const command = new Deno.Command('python3', {
        args: ['-B', '-c', bridge, serverRoot, JSON.stringify({ post: options.data, responses })],
        stdout: 'piped', stderr: 'piped'
    }).outputSync();
    assert.ok(command.success, new TextDecoder().decode(command.stderr));
    const result = JSON.parse(new TextDecoder().decode(command.stdout));
    assert.equal(result.status, 200, result.body);
    assert.ok(!result.body.includes(sentinel));
    assert.ok(result.requests.every(request => request.url.startsWith('https://api.soundcloud.com/')));
    return JSON.parse(result.body);
}

function environment() {
    const requests = [], creators = [], tracklists = [], html = [], errors = [], toolkits = [], clicks = new Map();
    const node = selector => ({
        length: 0,
        attr: () => 'mdb-sc-trackExtras',
        is: query => query === '#mdb-sc-trackExtras',
        append(value) { html.push(String(value)); return this; },
        prepend(value) { html.push(String(value)); return this; },
        after(value) { html.push(String(value)); return this; },
        prependTo() { return this; }, insertAfter() { return this; }, addClass() { return this; },
        click(callback) { clicks.set(selector, callback); return this; }
    });
    const $ = value => typeof value === 'object' ? value : node(value);
    $.each = (value, callback) => Object.entries(value).forEach(([key, item]) => callback(key, item));
    $.ajax = options => {
        assert.equal(options.url, 'https://www.mixesdb.com/tools/api/api.php');
        assert.equal(options.type, 'POST');
        assert.equal(options.beforeSend, undefined);
        assert.equal(options.headers, undefined);
        assert.ok(!JSON.stringify(options.data).includes(sentinel));
        const request = { options, done: options.success, fail: options.error };
        requests.push(request);
        return {
            done(callback) { request.done = callback; return this; },
            fail(callback) { request.fail = callback; return this; }
        };
    };
    let callback, duration = null, downloads = 0;
    const context = vm.createContext({
        $, URL, console, log() {}, logFunc() {}, logVar() {},
        fetch() { throw new Error('Unexpected external request'); },
        waitForKeyElements(selector, handler) { callback = handler; },
        mdbPageGeneration: 1, mdbIsCurrentPage: generation => generation === context.mdbPageGeneration,
        urlPath: () => 'mix', urlPath_noParams: index => index === 1 ? 'audiostreams' : 'mix',
        getDomain_fromUrlStr: () => 'soundcloud.com',
        getScPlayerUrl: () => 'https://soundcloud.com/artist/mix',
        soundActionFakeButtonClass: 'test-buttons', RUN_sc_button_group: true,
        toolkitDurationGate_resolve: value => { duration = value; },
        toolkitDurationGate_tooShort: () => duration > 0 && duration < 1200000,
        mdbPageCreator_add: options => creators.push(options),
        mdbPageCreator_addTracklist: options => tracklists.push(options),
        mdbPageCreator_addTracklistNotice() {},
        scPurchaseUrl: value => value, scFollowRedirect() {},
        append_artwork_trackExtras() {},
        convertHMS: () => '2:00:00', getFileDetails_forToggle: () => 'file details',
        triggerScDownload: () => { downloads++; },
        textify: value => value, linkify: value => value,
        getToolkit: (...args) => toolkits.push(args),
    });
    vm.runInContext(api + '\n' + read('shared/page_creator/tracklist_detector.js'), context);
    context.addApiErrorNote = reason => errors.push(reason);
    const start = sc.indexOf("waitForKeyElements('.l-listen-wrapper .soundActions .sc-button-group");
    const end = sc.indexOf('/*\n * Re-order added soundActsions buttons', start);
    assert.ok(start > 0 && end > start);
    vm.runInContext(sc.slice(start, end), context);
    const scHandler = callback;
    const tidStart = tid.indexOf('function funcTidPageCreator( playerUrl )');
    const tidEnd = tid.indexOf('/*\n * funcTidPageCreator_youtube', tidStart);
    vm.runInContext(tid.slice(tidStart, tidEnd), context);
    const toolkitStart = toolkit.indexOf('function getToolkit_fromScUrl_api(');
    const toolkitEnd = toolkit.indexOf('/*\n * getToolkit_fromIframe', toolkitStart);
    vm.runInContext(toolkit.slice(toolkitStart, toolkitEnd), context);
    return { context, requests, creators, tracklists, html, errors, toolkits, clicks,
        scHandler: () => scHandler(node('#mdb-sc-trackExtras')),
        duration: () => duration, downloads: () => downloads,
        respond(index = 0, resource = track) {
            const request = requests[index];
            request.done(pairedResponse(request.options, resource));
        } };
}

Deno.test('SoundCloud preserves header, Page Creator, tracklists, buttons and one metadata request', () => {
    const env = environment();
    env.scHandler();
    assert.equal(env.requests.length, 1);
    assert.equal(env.requests[0].options.data.query, 'getScTrack');
    env.respond();
    assert.equal(env.creators.length, 1);
    const creator = env.creators[0];
    for (const [field, expected] of Object.entries({ title: track.title, channel: 'Artist',
        channelUrl: track.user.permalink_url, description: track.description, purchaseUrl: track.purchase_url,
        durationMs: track.duration, createdAt: '2026-10-22', releaseDate: '' })) {
        assert.equal(creator[field], expected, field);
    }
    assert.equal(creator.artworkUrl, 'https://i1.sndcdn.com/artwork-original.jpg');
    assert.equal(typeof creator.followRedirect, 'function');
    assert.equal(env.tracklists[0].description, track.description);
    assert.ok(env.html.some(value => value.includes('mdb-fileInfo')));
    assert.ok(env.html.some(value => value.includes('apiText')));
    assert.ok(env.html.some(value => value.includes('mdb-purchaseLink')));
    env.clicks.get('#mdb-dlInfo')();
    assert.equal(env.downloads(), 1);
    env.scHandler();
    assert.equal(env.requests.length, 1);
});

Deno.test('comments remain optional, body-only, and failure completes the callback', () => {
    const env = environment();
    env.scHandler(); env.respond();
    assert.equal(env.requests.length, 1);
    let result;
    env.tracklists[0].loadComments(value => { result = value; });
    assert.equal(env.requests[1].options.data.query, 'getScTrackComments');
    assert.equal(env.requests[1].options.data.url, 'https://soundcloud.com/artist/mix');
    env.respond(1);
    assert.equal(JSON.stringify(result), JSON.stringify(bodies));
    env.tracklists[0].loadComments(value => { result = value; });
    env.requests[2].fail({ responseText: sentinel });
    assert.equal(JSON.stringify(result), '[]');
});

Deno.test('SPA stale metadata, errors and comments do not update the next track', () => {
    const env = environment();
    env.scHandler(); env.context.mdbPageGeneration++;
    env.respond(); env.requests[0].fail();
    assert.equal(env.creators.length, 0);
    assert.equal(env.errors.length, 0);
    const comment = environment();
    comment.scHandler(); comment.respond();
    let called = false;
    comment.tracklists[0].loadComments(() => { called = true; });
    comment.context.mdbPageGeneration++;
    comment.respond(1);
    assert.equal(called, false);
});

Deno.test('short tracks and provider failure retain toolkit duration decisions', () => {
    const env = environment();
    env.scHandler(); env.respond(0, { ...track, duration: 60000 });
    assert.equal(env.creators.length, 0);
    assert.equal(env.tracklists.length, 0);
    assert.equal(env.duration(), 60000);
    const failure = environment();
    failure.scHandler(); failure.requests[0].fail({ responseText: sentinel });
    assert.equal(failure.duration(), 0);
    assert.equal(failure.errors.length, 1);
});

Deno.test('TrackId.net Page Creator retains SoundCloud fields, tracklist/style sources and SPA guard', () => {
    const env = environment();
    env.context.funcTidPageCreator('https://soundcloud.com/artist/mix'); env.respond();
    const creator = env.creators[0];
    assert.equal(creator.title, track.title);
    assert.equal(creator.channel, 'Artist');
    assert.equal(creator.description, track.description);
    assert.equal(creator.tracklistBox, '#tlEditor #mixesdb-TLbox');
    assert.equal(creator.stylesBox, '#mixesdb-TIDstyles');
    env.context.funcTidPageCreator('https://soundcloud.com/artist/mix');
    env.context.mdbPageGeneration++; env.respond(1);
    assert.equal(env.creators.length, 1);
});

Deno.test('toolkit track, URN, playlist and explicit private-share lookups retain argument ordering', () => {
    const playlist = { kind: 'playlist', sharing: 'public', id: 456,
        permalink_url: 'https://soundcloud.com/artist/sets/radio' };
    for (const [url, resource] of [
        ['https://api.soundcloud.com/tracks/123', track],
        ['https://api.soundcloud.com/tracks/soundcloud:tracks:123', track],
        ['https://api.soundcloud.com/playlists/456', playlist],
        ['https://api.soundcloud.com/tracks/123?secret_token=s-shared123',
            { ...track, sharing: 'private', secret_token: 's-shared123' }]
    ]) {
        const env = environment();
        env.context.getToolkit_fromScUrl_api(url, 'playerUrl', 'detail page', 'wrapper', 'after', 'title', 'link', 3, 'auto', 7);
        assert.equal(env.requests[0].options.data.query, 'getScPermalink');
        assert.equal(env.requests[0].options.data.url, url);
        env.respond(0, resource);
        assert.equal(JSON.stringify(env.toolkits[0]), JSON.stringify([
            resource.permalink_url, 'playerUrl', 'detail page', 'wrapper', 'after', 'title', 'link', 3, '', 'auto', 7
        ]));
    }
});

Deno.test('locators keep explicit shares, remove tracking and reject duplicate capabilities', () => {
    const env = environment();
    assert.equal(env.context.scMetadataLocator('https://soundcloud.com/artist/mix?utm_source=x&secret_token=s-shared123#comments'),
        'https://soundcloud.com/artist/mix?secret_token=s-shared123');
    assert.equal(env.context.scMetadataLocator('https://soundcloud.com/artist/mix/s-shared123'),
        'https://soundcloud.com/artist/mix/s-shared123');
    assert.equal(env.context.scMetadataLocator('https://soundcloud.com/artist/mix?secret_token=s-one&secret_token=s-two'), '');
    assert.equal(env.context.scMetadataLocator('not a URL'), '');
});

Deno.test('all dependency consumers are versioned and no browser bearer path remains', () => {
    assert.ok(!api.includes('getScAccessToken'));
    for (const source of [api, sc, tid, toolkit]) {
        assert.ok(!source.includes('setRequestHeader( "Authorization"'));
        assert.ok(!source.includes('getScAccessTokenFromApi'));
    }
    const consumers = ['SoundCloud', 'TrackId.net', 'RA', '1001_Tracklists', 'Player_Checker',
        'Mixcloud', 'InternetArchive', 'hearthis.at', 'YouTube', 'MixesDB_Userscripts_Helper'];
    for (const name of consumers) {
        const source = read(name + '/script.user.js');
        const version = source.match(/@version\s+(\d{4}\.\d{2}\.\d{2}\.\d+)/);
        assert.ok(version && version[1].slice(0, 10) >= '2026.10.22');
        assert.ok(source.includes('/shared/toolkit/funcs.js?'));
    }
});
