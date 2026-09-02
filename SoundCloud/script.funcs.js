log( "script.funcs.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// append_artwork()
function append_artwork( artwork_url ) {
    logFunc( "append_artwork" );

    // also change for upload form [?]
    var thumbURL = artwork_url.replace(/-(t\d\d\d?\d?x\d\d\d?\d?|crop|large|badge|small|tiny|mini|original)/g, "-t500x500"),
        artworkURL = thumbURL,
        origUrl = thumbURL.replace("-t500x500", "-original");

    logVar( "artworkURL (thumbURL)", artworkURL );
    logVar( "origUrl", origUrl );

    if( $("#mdb-artwork-wrapper").length === 0 ) {
        if( $(".listenArtworkWrapper").length ) {
            $(".listenArtworkWrapper").replaceWith('<div id="mdb-artwork-wrapper"></div>');
            var imgWrapper = $("#mdb-artwork-wrapper");

            imgWrapper.append( createArtworkInfoWrapper( origUrl, {
                wrapperId: "mdb-artwork-input-wrapper",
                inputId: "mdb-artwork-input",
                inputClass: "selectOnClick",
                infoId: "mdb-artwork-info"
            }) );
            imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');

        } else if( $(".listenInfo .listenArtistInfo__report").length ) {
            var artworkInfoWrapper = createArtworkInfoWrapper( origUrl, {
                wrapperId: "mdb-artwork-input-wrapper",
                inputId: "mdb-artwork-input",
                inputClass: "selectOnClick",
                infoId: "mdb-artwork-info"
            });
            artworkInfoWrapper.append('<img id="mdb-artwork-img" src="'+origUrl+'" style="display:none;" />');
            $(".listenInfo .listenArtistInfo__report").replaceWith( artworkInfoWrapper );
        }
    }
}

// scArtworkOriginalUrl moved to api_funcs.js: TrackId.net reads the SC API too and needs the
// "-original" trick without pulling in this file's page handlers.

// append_artwork_trackExtras()
// New Material "Track header" layout (since ~Aug 2026 redesign): the artwork <img> is a
// React-managed node inside a box that clips its overflow, and tracks showing a "visuals"
// banner have no artwork <img> in the visible header at all. So the info bar is not attached
// to the artwork but added to the trackExtras wrapper, built from the API's artwork_url.
function append_artwork_trackExtras( wrapper, artwork_url ) {
    logFunc( "append_artwork_trackExtras" );

    var origUrl = scArtworkOriginalUrl( artwork_url );

    logVar( "origUrl", origUrl );

    wrapper.append( createArtworkInfoWrapper( origUrl, {
        wrapperId: "mdb-artwork-input-wrapper",
        wrapperClass: "mdb-artwork-input-wrapper-trackHeader",
        inputId: "mdb-artwork-input",
        inputClass: "selectOnClick",
        infoId: "mdb-artwork-info"
    }) );
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Playlist funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// linkRemoveSetParameter
function linkRemoveSetParameter( url ) {
    return url.replace( /^(.+)\?in=.+$/, "$1" )
              .replace( /^(.+)\?in_system_playlist=.+$/, "$1" );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Hiding options funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// listRowSelector
// One entry of a list the hiding options work on. Streams and profiles list them as
// li.soundList__item, the search results as li.searchList__item - what sits INSIDE the row is
// the same markup in both (.sound__body, a.soundTitle__title, .sc-button-like), only the row
// around it differs, so every "which entry does this button belong to" lookup takes both.
// Lives here rather than in script.user.js because this file is @require'd first and its
// own handlers need it too.
const listRowSelector = "li.soundList__item, li.searchList__item";

// removeFavedPlayer_ifOptedIn
function removeFavedPlayer_ifOptedIn( jNode ) {
    logFunc( "removeFavedPlayer_ifOptedIn" );

    if( getHideFav == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(listRowSelector).remove();
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Misc
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// formatScDate moved to api_funcs.js - same reason as scArtworkOriginalUrl above.


// fixScRedirectUrl
function fixScRedirectUrl( url ) {
    // https://gate.sc/?url=http%3A%2F%2Fbit.ly%2FHenPod&token=df8575-1-1631362609871
    url = decodeURIComponent( url.replace(/^.+url=(.+)&token.+$/, "$1") );
    return url;
}

// scPurchaseUrl
// The "Buy" / "Free download" URL as it really points, with the gate.sc wrapper taken off where
// SoundCloud put one on. Guarded rather than applied blindly: fixScRedirectUrl() ends in
// decodeURIComponent(), which throws on a stray "%" in a URL that was never wrapped.
// Two callers want the same string - the button in the track header, and the Page Creator,
// which searches this field for the created page's Notes link. The wrapper hides the host from
// both, and a gate.sc URL carrying a bit.ly cannot be recognised as a shortened link at all.
//
// "[/?]" and not "/": SoundCloud writes the wrapper WITHOUT the slash now
// (https://gate.sc?url=http%3A%2F%2Fbit.ly%2FBRCPod&token=...), and the older form with it is
// still what fixScRedirectUrl's own example shows. The slash-only test that stood here
// silently let today's form through unwrapped.
function scPurchaseUrl( url ) {
    url = String( url || "" );

    return /^https?:\/\/gate\.sc[\/?]/.test( url ) ? fixScRedirectUrl( url ) : url;
}



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * Filter row in #mdb-streamActions
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// ---------- Config ----------
const DEFAULT_MIN       = 20;                 // default minutes
const MIN_MINUTES       = 3;
const MAX_MINUTES       = 180;

const FAV_STEPS         = [1, 5, 10, 20, 50, 100, 250, 500, 1000];
const FAV_STEP_MAX      = FAV_STEPS.length - 1;
const DEFAULT_FAVS      = 1;

// Duration lookups: one at a time, this far apart, at most PAGE_RESOLVE_CAP per page (an SPA
// navigation starts a new page). The harvest of SoundCloud's own API answers (see
// installNetworkHooks) knows most durations before anyone asks, so the lookups are for the
// leftovers - typically the first page of a list, which was fetched before the hooks were in
// place.
const PAGE_RESOLVE_CAP    = 40;
const REQ_INTERVAL_MS     = 1500;
const RATE_LIMIT_PAUSE_MS = 30000;            // after a 429
const LOOKUP_MAX_TRIES    = 2;                // a network error or a rate limit gets one more try, then the entry is left alone

// The duration cache in localStorage. It is refilled from the API answers on every visit, so
// the TTL can be short - and the cap keeps the string JSON.stringify() builds and localStorage
// writes (synchronously, on the main thread) at a size that does not stall the page.
const CACHE_TTL           = 90 * 24 * 3600 * 1e3;   // 90 days
const NEG_TTL             = 7 * 24 * 3600 * 1e3;    // 7 days for "resolves to nothing with a duration"
const CACHE_MAX_ENTRIES   = 3000;
const CACHE_SAVE_DELAY_MS = 2000;

const UI_ID             = 'sc-hide-short-ui-wrap';
const ATTR_TOO_SHORT    = 'data-sc-too-short';
const ATTR_TOO_FEW_F    = 'data-sc-too-few-favs';

const LS_CACHE          = 'sc_hide_short_cache_v6';
const LS_SETT           = 'sc_hide_short_settings_v5';

// One entry of a list the row filters - the stream/profile rows, the search hits and the
// redesign's article cards - as ONE selector list, so a single querySelectorAll() finds them
// all in document order. asCard() maps a search hit to the <li> around it, see there.
const CARD_SELECTOR = [
    'article[aria-label="Track"]',
    'article[data-testid*="track"]',
    '.lazyLoadingList__item article',
    'li.soundList__item',
    '.searchItem'
].join(', ');

// How far outside the viewport an entry already counts as on screen, for the lookups
const IO_ROOT_MARGIN    = '150px';

// ---------- Utils ----------
// Declared BEFORE the state below on purpose: loadCache() runs while STATE is being built and
// uses now(). With the order the other way round, now() was still in its temporal dead zone
// at that moment, the ReferenceError was swallowed by loadCache()'s catch and every page
// started with an empty cache - the persisted one was written on every visit and never read.
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const now = () => Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clampMin = m => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(parseInt(m, 10) || DEFAULT_MIN)));
const thresholdMs = () => STATE.thresholdMin * 60 * 1000;
const norm = u => {
    try { const x = new URL(u, location.origin); return x.origin + x.pathname.replace(/\/+$/, ''); }
    catch { return (u || '').split('#')[0].split('?')[0]; }
};
// The row is only on the page for lists that offer it (setupStreamActionsFilterRow in
// script.user.js). The hooks below stay installed for the life of the document, so this is
// what keeps them from judging - and looking up - the playlists of a sets tab the user
// navigates to later.
const rowMounted = () => !!document.getElementById(UI_ID);
const lookupsWanted = () => STATE.durEnabled && rowMounted();

// ---------- State ----------
const STATE = {
    thresholdMin: DEFAULT_MIN,
    thresholdFavs: DEFAULT_FAVS,
    durEnabled: false,
    favsEnabled: false,
    clientId: null,
    clientIdScanned: false,
    cache: loadCache(),                // { url: { ms:number|null, t:ts, neg?:true } }
    cacheSaveTimer: null,
    resolvesDone: 0,
    capLogged: false,
    lastReq: 0,
    pausedUntil: 0,
    io: null,
    // What is known about each entry, keyed by its element: { url, ms, tries }. ms is
    // undefined until a duration was looked for, null when there is none to be had (on this
    // page), a number otherwise. A WeakMap, so an entry SoundCloud takes off the page takes
    // its record with it.
    cards: new WeakMap(),
    visible: new Set(),                // entries currently within IO_ROOT_MARGIN of the viewport
    pending: new Set(),                // entries still waiting for a duration lookup
    queueRunning: false,
    applyScheduled: false,
    applyOnlyNew: true
};

// ---------- Cache ----------
function loadCache() {
    try {
        const obj = JSON.parse(localStorage.getItem(LS_CACHE) || '{}');
        const t = now();
        let expired = 0;
        for (const k in obj) {
            const e = obj[k];
            if (!e) { delete obj[k]; continue; }
            const ttl = e.neg ? NEG_TTL : CACHE_TTL;
            if (e.t && t - e.t > ttl) { delete obj[k]; expired++; }
        }
        const dropped = pruneCache(obj);
        log( "loadCache: " + Object.keys(obj).length + " durations loaded (" + expired + " expired, " + dropped + " over the cap dropped)." );
        return obj;
    } catch { return {}; }
}

// pruneCache
// Drops the oldest entries beyond CACHE_MAX_ENTRIES. Returns how many went.
function pruneCache(obj) {
    const keys = Object.keys(obj);
    const excess = keys.length - CACHE_MAX_ENTRIES;
    if (excess <= 0) return 0;
    keys.sort((a, b) => (obj[a].t || 0) - (obj[b].t || 0));
    for (let i = 0; i < excess; i++) delete obj[keys[i]];
    return excess;
}

// saveCache
// Only makes a note that there is something to write. The old version serialised the whole
// cache and handed it to localStorage right away, once per harvested API answer and once per
// lookup - synchronous work on the main thread, while the user scrolls. Now it is one write
// per CACHE_SAVE_DELAY_MS at most, plus one when the page goes away.
function saveCache() {
    if (STATE.cacheSaveTimer) return;
    STATE.cacheSaveTimer = setTimeout(flushCache, CACHE_SAVE_DELAY_MS);
}
function flushCache() {
    if (!STATE.cacheSaveTimer) return;
    clearTimeout(STATE.cacheSaveTimer);
    STATE.cacheSaveTimer = null;
    pruneCache(STATE.cache);
    try { localStorage.setItem(LS_CACHE, JSON.stringify(STATE.cache)); } catch {}
}
window.addEventListener('pagehide', flushCache);

// ---------- Settings ----------
function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem(LS_SETT) || 'null');
        if (!s) return null;
        return {
            enabled: !!s.enabled,
            min: clampMin(s.min ?? DEFAULT_MIN),
            minFavs: Number.isFinite(s.minFavs) ? s.minFavs : DEFAULT_FAVS,
            favsEnabled: !!s.favsEnabled
        };
    } catch { return null; }
}
// "enabled" is the Durations checkbox. It used to be saved as "either checkbox", which
// switched Durations back on at the next visit for someone who had left only Favorites on.
function saveSettings(durEnabledVal, min, minFavs, favsEnabledVal) {
    try {
        localStorage.setItem(LS_SETT, JSON.stringify({
            enabled: !!durEnabledVal,
            min: clampMin(min),
            minFavs,
            favsEnabled: !!favsEnabledVal
        }));
    } catch {}
}

// ---------- UI ----------
function buildUI() {
    let wrap = document.getElementById(UI_ID);
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.id = UI_ID;
    wrap.innerHTML = `
    <div id="mdb-streamActions-filter"><span class="mdb-darkorange">Filter:</span><!--
 --><span class="mdb-streamActions-group"><!--
 --><label><!--
 --><input id="sc-hide-short-checkbox" type="checkbox"><!--
 --><span>Durations ≥<span id="sc-hide-short-val" class="value">${DEFAULT_MIN}</span></span><!--
 --></label><!--

 --><input id="sc-hide-short-slider" type="range" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1"><!--

 --></span><!--
 --><span class="mdb-streamActions-group"><!--
 --><label><!--
 --><input id="sc-favs-checkbox" type="checkbox"><!--
 --><span>Favorites ≥<span id="sc-min-favs-val" class="value">${DEFAULT_FAVS}</span></span><!--
 --></label><!--

 --><input id="sc-min-favs-slider" type="range" min="0" max="${FAV_STEP_MAX}" step="1"><!--

 --><span class="visually-hidden"><!--
        --><input id="sc-hide-short-minutes" type="number" maxlength="3" min="1"><!--
 --></span></span></div>
`;
    wireUI(wrap);
    return wrap;
}

function wireUI(root) {
    const cbDur   = root.querySelector('#sc-hide-short-checkbox');
    const slDur   = root.querySelector('#sc-hide-short-slider');
    const cbFavs  = root.querySelector('#sc-favs-checkbox');
    const slFavs  = root.querySelector('#sc-min-favs-slider');
    const minI    = root.querySelector('#sc-hide-short-minutes');
    const valDur  = root.querySelector('#sc-hide-short-val');
    const valFavs = root.querySelector('#sc-min-favs-val');

    const saved = loadSettings();

    // One setter per threshold: the number, its label, the slider and (for the duration) the
    // hidden number input move together
    const setDurThreshold = v => {
        STATE.thresholdMin = clampMin(v);
        valDur.textContent = String(STATE.thresholdMin);
        slDur.value        = String(STATE.thresholdMin);
        minI.value         = String(STATE.thresholdMin);
    };
    const setFavThreshold = idx => {
        idx = Math.max(0, Math.min(FAV_STEP_MAX, Math.round(parseInt(idx, 10) || 0)));
        STATE.thresholdFavs = FAV_STEPS[idx];
        valFavs.textContent = String(STATE.thresholdFavs);
        slFavs.value        = String(idx);
    };

    setDurThreshold(saved ? saved.min : DEFAULT_MIN);
    setFavThreshold(Math.max(0, FAV_STEPS.findIndex(v => v >= (saved ? saved.minFavs : DEFAULT_FAVS))));
    cbDur.checked  = !!(saved && saved.enabled);
    cbFavs.checked = !!(saved && saved.favsEnabled);

    // syncState
    // The checkboxes are the truth: the state, the html switch the CSS hides by and the saved
    // settings follow them, and then every entry on the page is judged again from what is
    // already known. No lookup is repeated for that - a slider move costs one pass over the
    // rows, not a round of requests, which is what makes dragging feel immediate. The old
    // version threw every verdict away on each move and evaluated the whole list from scratch,
    // layout reads included.
    const syncState = () => {
        STATE.durEnabled  = cbDur.checked;
        STATE.favsEnabled = cbFavs.checked;
        document.documentElement.classList.toggle('sc-hide-short-active', cbDur.checked || cbFavs.checked);
        saveSettings(cbDur.checked, STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
        scheduleApply(false);
    };

    // Moving a slider switches its own checkbox on. "input" fires on every step of a drag and
    // "change" once at the end; one handler serves both, scheduleApply() folds the burst into
    // one pass per frame.
    const onDurSlider = () => { setDurThreshold(slDur.value || DEFAULT_MIN); cbDur.checked = true; syncState(); };
    const onFavSlider = () => { setFavThreshold(slFavs.value); cbFavs.checked = true; syncState(); };
    slDur.addEventListener('input', onDurSlider);
    slDur.addEventListener('change', onDurSlider);
    slFavs.addEventListener('input', onFavSlider);
    slFavs.addEventListener('change', onFavSlider);

    // Hidden number input (compat)
    minI.addEventListener('change', () => { setDurThreshold(minI.value || DEFAULT_MIN); cbDur.checked = true; syncState(); });

    cbDur.addEventListener('change', syncState);
    cbFavs.addEventListener('change', syncState);

    syncState();
}

function mountUI() {
    logFunc( "mountUI" );

    // ONLY attach via waitForKeyElements
    /* global waitForKeyElements */
    waitForKeyElements('#mdb-streamActions', ($c) => {
        const node = $c instanceof Element ? $c : $c[0];
        if (!node) {
            log( "mountUI: #mdb-streamActions callback fired but node is empty - bailing." );
            return;
        }
        if (node.querySelector('#' + UI_ID)) {
            log( "mountUI: filter UI already mounted - skipping." );
            return; // already mounted
        }
        log( "mountUI: mounting filter UI into #mdb-streamActions." );
        const el = buildUI();
        node.appendChild(el);
        refreshVisible();
    });
}

// ---------- Card helpers ----------
function asCard(el) {
    // Search results: the row to hide is the <li>, not the .searchItem inside it. The li carries
    // the list's own spacing (sc-mt-3x), so hiding only its child leaves that gap behind and a
    // filtered search list ends up full of holes.
    const searchRow = el.closest('li.searchList__item');
    if (searchRow) return searchRow;

    return el.closest('article, li.soundList__item, .lazyLoadingList__item, .searchItem, .soundList__item') || el;
}
function getCardUrl(card) {
    for (const a of qsa('a[href]', card)) {
        const href = a.getAttribute('href') || a.href || '';
        if (!href) continue;
        if (/^https?:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(href) || /^\/[^/]+\/[^/]+/.test(href)) {
            return norm(href.startsWith('http') ? href : location.origin + href);
        }
    }
    return null;
}

// Favorites count (from like button label only)
function getFavoritesCount(card) {
    const likeBtn = card.querySelector('button.sc-button-like, .sc-button-like[aria-label="Like"]');
    const labelEl = likeBtn?.querySelector('.sc-button-label');
    if (labelEl) {
        const n = parseInt((labelEl.textContent || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(n)) return n;
    }
    if (likeBtn) {
        const n2 = parseInt((likeBtn.textContent || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(n2)) return n2;
    }
    const anyLike = card.querySelectorAll('.sc-button-like');
    for (const b of anyLike) {
        const t = (b.querySelector('.sc-button-label')?.textContent || b.textContent || '').trim();
        const num = parseInt(t.replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(num)) return num;
    }
    return 0;
}

// ---------- Network hooks (sniff client_id + harvest JSON durations) ----------
// isScApiUrl
// Only SoundCloud's own API answers carry durations. Cloning and parsing every other JSON
// answer the page fetches (analytics and the like) was work for nothing, on the main thread.
function isScApiUrl(urlStr) {
    try { return /(^|\.)soundcloud\.com$/.test(new URL(urlStr, location.origin).hostname); }
    catch { return false; }
}

function sniffClientId(urlStr) {
    if (STATE.clientId || !urlStr) return;
    try {
        const cid = new URL(urlStr, location.origin).searchParams.get('client_id');
        if (cid) STATE.clientId = cid;
    } catch {}
}

let installNetworkHooksCallCount = 0;
function installNetworkHooks() {
    installNetworkHooksCallCount++;
    log( "installNetworkHooks: patching fetch/XHR (call #" + installNetworkHooksCallCount + ")" );

    const of = window.fetch;
    window.fetch = async function(input, init) {
        const urlStr = typeof input === 'string' ? input
                     : (input && typeof input.url === 'string') ? input.url
                     : String(input || '');
        sniffClientId(urlStr);
        const resp = await of.apply(this, arguments);
        if (isScApiUrl(urlStr)) {
            try {
                const ct = resp.headers.get('content-type') || '';
                if (ct.includes('application/json')) resp.clone().json().then(harvestFromJson).catch(() => {});
            } catch {}
        }
        return resp;
    };

    const oo = XMLHttpRequest.prototype.open;
    const os = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        const urlStr = String(url || '');
        sniffClientId(urlStr);
        this._mdbScApi = isScApiUrl(urlStr);
        return oo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
        if (this._mdbScApi) {
            this.addEventListener('load', function() {
                try {
                    const ct = this.getResponseHeader && this.getResponseHeader('content-type') || '';
                    if (ct.includes('application/json')) {
                        const txt = this.responseText;
                        if (txt && txt.length < 10_000_000) {
                            try { harvestFromJson(JSON.parse(txt)); } catch {}
                        }
                    }
                } catch {}
            });
        }
        return os.apply(this, arguments);
    };
}

// harvestFromJson
// Every track object in an API answer carries permalink_url and duration - the stream's own
// pagination hands over the durations of a whole page at once, before a single row is on the
// screen. Entries already on the page that just got their answer are judged right away.
function harvestFromJson(obj) {
    const seen = new Set();
    let added = 0;
    const walk = v => {
        if (!v || typeof v !== 'object' || seen.has(v)) return;
        seen.add(v);
        if (Array.isArray(v)) { v.forEach(walk); return; }
        const url = v.permalink_url || v.uri || v.permalink;
        const dur = v.duration;
        if (url && typeof dur === 'number') {
            const key = norm(url);
            const cur = STATE.cache[key];
            // a "resolves to nothing" entry gives way to a real answer
            if (!cur || cur.ms == null) { STATE.cache[key] = { ms: dur, t: now() }; added++; }
        }
        for (const k in v) { const x = v[k]; if (x && typeof x === 'object') walk(x); }
    };
    walk(obj);
    if (!added) return;

    log( "harvestFromJson: " + added + " new durations, " + Object.keys(STATE.cache).length + " cached now." );
    saveCache();
    if (lookupsWanted()) scheduleApply(false);
}

// ensureClientId
// The client_id every api-v2 request carries. Sniffed off the page's own requests as they
// happen (hooks above); for the first lookups, which come before any request went through the
// hooks, the requests SoundCloud made BEFORE them are still on record in the performance
// timeline, every api-v2 URL among them with the client_id. The script scan is the last resort.
function ensureClientId() {
    if (STATE.clientId || STATE.clientIdScanned) return STATE.clientId;
    STATE.clientIdScanned = true;

    try {
        for (const entry of performance.getEntriesByType('resource')) {
            const m = /[?&]client_id=([A-Za-z0-9]+)/.exec(entry.name);
            if (m) { STATE.clientId = m[1]; break; }
        }
    } catch {}

    if (!STATE.clientId) {
        for (const s of document.scripts) {
            const txt = s.textContent || '';
            const m = txt.match(/client_id:"([A-Za-z0-9]+)"/) || txt.match(/clientId\s*:\s*"([A-Za-z0-9]+)"/);
            if (m) { STATE.clientId = m[1]; break; }
        }
    }

    logVar( "ensureClientId: client_id found", !!STATE.clientId );
    return STATE.clientId;
}

// ---------- Resolve duration ----------
// resolveDuration
// One request for one entry, api-v2 with the client_id. It used to ask api-widget first, and
// without a client_id that endpoint answers 401 (checked 2026-09-02) - so every lookup was
// two requests with the first one failing. Answers { ms } - null where the URL resolves to
// nothing with a duration - or { transient: true } for a rate limit, a rejected client_id or a
// network error: "not now" rather than "no", so nothing is cached and the queue may try again.
async function resolveDuration(url) {
    const cid = ensureClientId();
    if (!cid) return { ms: null, transient: true };

    let r;
    try {
        r = await fetch('https://api-v2.soundcloud.com/resolve?url=' + encodeURIComponent(url) + '&client_id=' + cid, { credentials: 'omit' });
    } catch {
        return { ms: null, transient: true };
    }

    if (r.status === 429) {
        STATE.pausedUntil = now() + RATE_LIMIT_PAUSE_MS;
        log( "resolveDuration: rate limited (429) - lookups paused for " + RATE_LIMIT_PAUSE_MS + "ms." );
        return { ms: null, transient: true };
    }
    if (r.status === 401 || r.status === 403) {
        // a stale client_id - forget it, the next lookup sniffs afresh
        log( "resolveDuration: " + r.status + " - dropping the client_id." );
        STATE.clientId = null;
        STATE.clientIdScanned = false;
        return { ms: null, transient: true };
    }
    if (!r.ok) return { ms: null, transient: false };

    try {
        const data = await r.json();
        return { ms: Number.isFinite(data?.duration) ? data.duration : null, transient: false };
    } catch {
        return { ms: null, transient: false };
    }
}

// ---------- Lookup queue ----------
// queueLookup / runLookupQueue
// One lookup at a time, always for an entry that is on screen right now. Entries the user has
// scrolled past stay queued and get their turn when they come back into view - the old version
// worked through everything it had ever seen in the order it saw it, so after a fast scroll the
// entries on screen waited behind dozens nobody was looking at any more. And an entry it could
// not answer was asked again every 1.6s, for ever, layout read included.
function queueLookup(card) {
    STATE.pending.add(card);
}

function pickPendingCard() {
    for (const card of STATE.pending) {
        if (!card.isConnected) {
            STATE.pending.delete(card);
            STATE.visible.delete(card);
            continue;
        }
        if (STATE.visible.has(card)) return card;
    }
    return null;
}

async function runLookupQueue() {
    if (STATE.queueRunning) return;
    STATE.queueRunning = true;

    try {
        for (;;) {
            if (!lookupsWanted()) break;

            const card = pickPendingCard();
            if (!card) break; // nothing on screen needs one - the IntersectionObserver restarts the queue when that changes

            const info = STATE.cards.get(card);
            if (!info || info.ms !== undefined) { STATE.pending.delete(card); continue; }

            // the harvest may have delivered the answer in the meantime
            const cached = STATE.cache[info.url];
            if (cached) {
                STATE.pending.delete(card);
                info.ms = cached.ms;
                applyThresholds(card, info);
                continue;
            }

            if (STATE.resolvesDone >= PAGE_RESOLVE_CAP) {
                // Unknown stays visible. Marked as judged, or the entry would be picked again on
                // every scroll.
                STATE.pending.delete(card);
                info.ms = null;
                applyThresholds(card, info);
                if (!STATE.capLogged) {
                    STATE.capLogged = true;
                    log( "runLookupQueue: " + PAGE_RESOLVE_CAP + " lookups done on this page - further unknown durations stay visible." );
                }
                continue;
            }

            // Spacing and the rate limit pause. The entry stays queued through the wait, and the
            // pick is made afresh afterwards - for whatever is on screen THEN.
            const waitMs = Math.max(STATE.pausedUntil, STATE.lastReq + REQ_INTERVAL_MS) - now();
            if (waitMs > 0) { await sleep(waitMs); continue; }

            STATE.pending.delete(card);
            STATE.lastReq = now();
            info.tries++;
            const res = await resolveDuration(info.url);

            if (res.transient) {
                if (info.tries < LOOKUP_MAX_TRIES) {
                    STATE.pending.add(card);
                } else {
                    info.ms = null;
                    applyThresholds(card, info);
                }
                continue;
            }

            STATE.resolvesDone++;
            STATE.cache[info.url] = res.ms != null ? { ms: res.ms, t: now() } : { ms: null, t: now(), neg: true };
            saveCache();
            info.ms = res.ms;
            applyThresholds(card, info);
        }
    } finally {
        STATE.queueRunning = false;
    }
}

// ---------- Judging entries ----------
// setFlag
// Touches the attribute only when it changes: a set or remove that changes nothing still
// invalidates style, and this runs for every entry on every slider move.
function setFlag(node, attr, on) {
    if (on) {
        if (!node.hasAttribute(attr)) node.setAttribute(attr, '1');
    } else if (node.hasAttribute(attr)) {
        node.removeAttribute(attr);
    }
}

function registerCard(card) {
    let info = STATE.cards.get(card);
    if (!info) {
        info = { url: null, ms: undefined, tries: 0 };
        STATE.cards.set(card, info);
        if (STATE.io) STATE.io.observe(card);
    }
    return info;
}

// applyThresholds
// Judges ONE entry from what is known - the favorites count off the row, the duration off the
// cache - and sets the two attributes the CSS hides by. Nothing in here reads layout: the old
// evaluateCard() asked every entry for its getBoundingClientRect() and wrote the previous
// entry's attribute in between, which forced a layout per entry - on every DOM mutation of the
// page, for every entry not yet judged. Where the duration is still unknown, the entry is
// queued for a lookup and the answer comes back through here.
function applyThresholds(card, info) {
    const node = asCard(card);
    const wasHidden = node.hasAttribute(ATTR_TOO_FEW_F) || node.hasAttribute(ATTR_TOO_SHORT);

    if (!info.url) info.url = getCardUrl(card);

    let tooFewFavs = false;
    if (STATE.favsEnabled) tooFewFavs = getFavoritesCount(card) < STATE.thresholdFavs;
    setFlag(node, ATTR_TOO_FEW_F, tooFewFavs);

    // The duration is only asked for where it can still make a difference: an entry the
    // favorites rule hides anyway is not worth a request
    let tooShort = false;
    if (!tooFewFavs && STATE.durEnabled && info.url) {
        if (info.ms === undefined) {
            const cached = STATE.cache[info.url];
            if (cached) info.ms = cached.ms;
        }
        if (info.ms === undefined) queueLookup(card);
        else tooShort = info.ms != null && info.ms < thresholdMs();
    }
    setFlag(node, ATTR_TOO_SHORT, tooShort);

    if ((tooFewFavs || tooShort) && !wasHidden) scheduleLazyLoadNudge(); // the row just vanished - see the lazy loading nudge below
}

// applyCards / scheduleApply
// Judges every entry on the page, or only the ones not seen before (the rows a lazy loaded
// page brings, noticed by the MutationObserver). Coalesced into one pass per frame: the sliders
// fire input events faster than that, and so does SoundCloud's DOM.
function scheduleApply(onlyNew) {
    if (!onlyNew) STATE.applyOnlyNew = false;
    if (STATE.applyScheduled) return;
    STATE.applyScheduled = true;
    requestAnimationFrame(() => {
        const only = STATE.applyOnlyNew;
        STATE.applyScheduled = false;
        STATE.applyOnlyNew = true;
        applyCards(only);
    });
}

function applyCards(onlyNew) {
    if (!rowMounted()) return;

    for (const card of qsa(CARD_SELECTOR)) {
        if (onlyNew && STATE.cards.has(card)) continue;
        applyThresholds(card, registerCard(card));
    }
    runLookupQueue();
}

// refreshVisible
// The entry point script.user.js calls after mounting the row - the name is from the days when
// it evaluated whatever was in view; now it judges the whole list from what is known.
function refreshVisible() {
    scheduleApply(false);
}

// ---------- Lazy loading nudge ----------
// SoundCloud's lazy loading lists fetch their next page from a scroll handler and nowhere
// else: on every scroll event the list checks whether its spinner (div.loading, the last
// child of the .lazyLoadingList) has come into view. Hiding rows shrinks the list without a
// scroll event, and once the page is shorter than the window the user cannot even produce
// one - the spinner sits in view, animating, and nothing ever loads. Seen on a search with
// "Durations ≥ 39": 9 of 11 results hidden, document height == window height, spinner at
// y=429, no request in sight until a scroll event was dispatched by hand.
// A synthetic scroll event on window runs the list's own check, which is exactly what a
// scroll of the user's would do: it loads the next page where the spinner is in view and is
// ignored where it is not, or while a page is already on its way. The list keeps growing
// until something passes the filter and makes the page scrollable again, or it hits its end
// (.paging-eof) - the same rounds the user would otherwise have to scroll through by hand.
// Throttled to one event per second: it is asked for on every DOM mutation, and a mutation
// storm must not turn into a scroll event storm.
const NUDGE_INTERVAL_MS = 1000;
let nudgeTimer = null;
let lastNudge = 0;

function lazyListSpinnerInView() {
    const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
    const shown = el => el.getBoundingClientRect().height > 0;

    // the end marker stays in the DOM on some lists, hidden - only a shown one means the end
    if (qsa('.paging-eof').some(shown)) return false;

    return qsa('.lazyLoadingList > .loading').some(el => shown(el) && el.getBoundingClientRect().top < viewportBottom);
}

function nudgeLazyLoading() {
    if (!lazyListSpinnerInView()) return;

    lastNudge = now();
    log( "nudgeLazyLoading: the lazy loading spinner is in view - dispatching a scroll event so SoundCloud fetches the next page." );
    window.dispatchEvent(new Event('scroll'));
}

function scheduleLazyLoadNudge() {
    if (nudgeTimer) return; // a check is pending already - it sees the DOM as it is by then

    // never right away: a burst of hides (a whole page answered from the cache) or of
    // mutations (SoundCloud appending a page) is checked once, after it has settled
    const wait = Math.max(300, lastNudge + NUDGE_INTERVAL_MS - now());
    nudgeTimer = setTimeout(() => {
        nudgeTimer = null;
        nudgeLazyLoading();
    }, wait);
}

// ---------- Orchestration ----------
// attachIO
// The IntersectionObserver is the ONE source of "is this entry on screen": it says so for
// free, in a batch, instead of a getBoundingClientRect() per entry. It restarts the lookup
// queue when a queued entry comes into view. Entries are handed to it as they are registered
// (registerCard), lazy loaded pages included.
function attachIO() {
    if (STATE.io) return;

    STATE.io = new IntersectionObserver((entries) => {
        let kick = false;
        for (const e of entries) {
            if (e.isIntersecting) {
                STATE.visible.add(e.target);
                if (STATE.pending.has(e.target)) kick = true;
            } else {
                STATE.visible.delete(e.target);
            }
        }
        if (kick) runLookupQueue();
    }, { root: null, rootMargin: IO_ROOT_MARGIN, threshold: 0.01 });

    // entries registered before the observer existed
    for (const card of qsa(CARD_SELECTOR)) {
        if (STATE.cards.has(card)) STATE.io.observe(card);
    }
}

// forgetCards
// An entry SoundCloud takes off the page (a navigation, a row the "Hide:" options remove)
// leaves the observer and the queues with it. Without this the observer kept every entry
// ever seen alive, and a navigation's worth of dead rows stayed in the queue.
function forgetCards(root) {
    const cards = root.matches(CARD_SELECTOR) ? [root] : root.querySelectorAll(CARD_SELECTOR);
    for (const card of cards) {
        if (STATE.io) STATE.io.unobserve(card);
        STATE.visible.delete(card);
        STATE.pending.delete(card);
        STATE.cards.delete(card);
    }
}

// observeDOM
// The MutationObserver only NOTICES: rows added (a lazy loaded page) are judged in the next
// frame, rows removed are forgotten. The old observer re-evaluated the whole list on every
// mutation of the document, and SoundCloud mutates on every hover and every second of
// playback.
// Every mutation also asks for a lazy loading nudge: the "Hide:" options remove rows via
// jQuery, which never passes through applyThresholds(), and a page SoundCloud just appended
// may consist of hidden rows only.
function observeDOM() {
    const mo = new MutationObserver((mutations) => {
        let added = false;
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (added || n.nodeType !== 1) continue;
                if (n.matches(CARD_SELECTOR) || n.querySelector(CARD_SELECTOR)) added = true;
            }
            for (const n of m.removedNodes) {
                if (n.nodeType === 1) forgetCards(n);
            }
        }
        if (added) scheduleApply(true);
        scheduleLazyLoadNudge();
    });
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });

    // SPA route changes: a new page gets a fresh lookup budget. The rows of the old page are
    // forgotten as SoundCloud takes them out of the DOM (forgetCards above). The rate limit
    // pause is NOT reset - it is the server's, not the page's.
    let last = location.href;
    setInterval(() => {
        if (location.href === last) return;
        last = location.href;
        STATE.resolvesDone = 0;
        STATE.capLogged = false;
        STATE.pending.clear();
    }, 600);
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Following a shortened link
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// scFollowRedirect
// Follows ONE redirect and hands the target to done(), or "" where there is none. Handed to
// the Page Creator as its followRedirect option, and asked for exactly one thing: the
// episode's real page behind the shortened link uploaders write instead of it ("Go to
// bit.ly/BRCPod for track list and short interview" - a 301 to the groove.de page that belongs
// in the new page's Notes section).
//
// It cannot be done with $.ajax/fetch, and not for want of trying: bit.ly's 301 carries no
// Access-Control-Allow-Origin, so a cors request is blocked before the redirect is followed
// and a no-cors one comes back opaque, with finalUrl unreadable. GM_xmlhttpRequest is not
// subject to CORS, which is why this file is where it lives - only SoundCloud @require's it,
// and only SoundCloud grants it. TrackId.net stays on its grant-free header.
//
// redirect: "manual" on purpose - the Location header is the whole answer, and stopping at it
// means the target is never actually fetched: no page view counted there, and @connect stays a
// list of shortener hosts (Tampermonkey checks redirect TARGETS against it too, and the target
// is by definition not known in advance). Managers that do not know the option follow anyway
// and answer with finalUrl, which is read as the fallback.
//
// anonymous: true - a redirector has no business seeing the reader's cookies.
//
// Whatever comes back is only a candidate: the Page Creator writes it only if it lands on the
// host the series' own Notes sections link (mdbPageCreator_notesUrlIn).
function scFollowRedirect( url, done ) {
    logFunc( "scFollowRedirect" );

    if( typeof GM_xmlhttpRequest !== "function" ) {
        log( "scFollowRedirect: this userscript manager grants no GM_xmlhttpRequest - not following " + url );
        done( "" );
        return;
    }

    // one answer only: a manager that fires both onload and ontimeout would otherwise re-render
    // the row twice, the second time with the empty answer
    var answered = false,
        answer = function( target ) {
            if( answered ) return;

            answered = true;
            done( target || "" );
        };

    GM_xmlhttpRequest({
        method: "HEAD",
        url: url,
        redirect: "manual",
        anonymous: true,
        timeout: 8000,
        onload: function( res ) {
            var headers = String( ( res && res.responseHeaders ) || "" ),
                location = /^[ \t]*location[ \t]*:[ \t]*(\S+)[ \t]*$/im.exec( headers );

            if( location ) {
                answer( location[1] );
                return;
            }

            // the manager followed the redirect itself - then the URL it ended on IS the answer
            answer( ( res && res.finalUrl && res.finalUrl !== url ) ? res.finalUrl : "" );
        },
        onerror: function() {
            log( "scFollowRedirect: FAILED for " + url );
            answer( "" );
        },
        ontimeout: function() {
            log( "scFollowRedirect: timed out for " + url );
            answer( "" );
        }
    });
}
