// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.17.4
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-SoundCloud_49
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-SoundCloud_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-SoundCloud_59
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_definitions.js?v_24
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_builder.js?v_27
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/tracklist_detector.js?v_10
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/page_creator.js?v_26
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_54
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v_5
// @include      http*soundcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 * Only the declarations live up here: the CSS itself loads in
 * "Loading CSS" further down, after the frame opt-out, so foreign
 * frames (widget players etc.) stay untouched
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var cacheVersion = 116,
    scriptName = "SoundCloud";
window.scriptName = scriptName; // toolkit.js reads this global directly
logVar( "scriptName", scriptName );
logVar( "cacheVersion", cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Debug settings
 *
 * All off in the shipped script - flip one to true while working on a feature.
 * They sit on window because the code reading them lives in the @require'd script.funcs.js,
 * which cannot see this IIFE's scope (same reason as window.scriptName further down).
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// MixesDB page creator: normally the row is only offered for players that are NOT on MixesDB
// yet - for a used player there is nothing to create, so it stays hidden and the title it
// would have built cannot be compared with the page that exists.
// With this on, the row is shown for used players too, marked "used" and without the "Create"
// link (which would only start a duplicate page).
window.mdbPageCreator_showForUsedPlayers = true; // True as default for the beta phase

// Track page loading skeleton (new layout): the grey pulsing placeholder that covers the
// wrapper below the Track header until buttons, toolkit and tracklist box have all arrived -
// shared with TrackId.net, see mdbSkeleton_* in shared/page_creator/page_creator.js.
// With this off, the pieces pop in one by one as they used to. The time until everything
// has loaded is logged the same way in BOTH modes, so they can be compared log against log.
window.mdbSkeleton_enabled = true;


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * IIFE logging
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "script.user.js IIFE started. location.href: " + location.href );

// Safety net: some users report the script doing nothing with no red console error at all
// (e.g. Win11+Chrome, "Firefox mobile app PC version" - see CLAUDE.md/support chat history).
// A require that fails to fetch, or an exception swallowed by a browser/extension, would
// otherwise leave zero trace. This guarantees at least one log line naming the exact file/line.
window.addEventListener( "error", function( e ) {
    log( "UNCAUGHT ERROR: " + e.message + " @ " + e.filename + ":" + e.lineno + ":" + e.colno );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Frame handling
 *
 * Since the ~Aug 2026 redesign SoundCloud no longer renders track pages into the main
 * document: the whole track page lives in a same-origin iframe (iframe.webiIframe, id
 * #__WEBI_IFRAME_PRELOADED__) whose path is the address bar path prefixed with "/n/".
 * Everything we add to a track page has to be added inside that document, so @noframes
 * had to go - which in turn means the script now also starts in every other
 * soundcloud.com frame (widget players, upload target, ...) and has to opt out there.
 *
 * Stream/profile/playlist pages are unaffected and still render into the top document.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// The frame is only ours if we can actually reach the embedding page - a soundcloud.com
// page embedded somewhere else entirely is none of our business either.
function canAccessTopFrame() {
    logFunc( "canAccessTopFrame" );

    try {
        var result = typeof window.top.location.pathname === "string";
        logVar( "canAccessTopFrame result", result );
        return result;
    } catch( e ) {
        logVar( "canAccessTopFrame result", "false (threw: " + e + ")" );
        return false;
    }
}

logFunc( "Frame handling" );
logVar( "location.href", location.href );
logVar( "location.pathname", location.pathname );
logVar( "window.self === window.top", window.self === window.top );

const isTopFrame = ( window.self === window.top );
let isWebiFrame = false;

if( !isTopFrame ) {
    var pathLooksLikeWebiFrame = /^\/n\//.test( location.pathname );
    logVar( "pathLooksLikeWebiFrame (/^\\/n\\//.test(location.pathname))", pathLooksLikeWebiFrame );

    isWebiFrame = pathLooksLikeWebiFrame && canAccessTopFrame();
}

logVar( "isTopFrame", isTopFrame );
logVar( "isWebiFrame", isWebiFrame );

if( !isTopFrame && !isWebiFrame ) {
    log( "STOPPING: this frame is neither the top frame nor a recognized webi frame - nothing to do here. (" + location.href + ")" );
    return; // not a frame we have anything to do in
}

log( "Frame accepted, continuing in " + ( isTopFrame ? "top frame" : "webi frame" ) + "." );

// Inside the webi frame it is the address bar - not location.href - that holds the URL
// MixesDB works with: the frame's own path carries the "/n/" prefix plus SoundCloud's
// internal query string. Re-point global.js' urlPath() at the address bar so every
// urlPath()/urlPath_noParams() call in global.js, toolkit.js and this script keeps
// seeing /user/track instead of /n/user/track.
const pageLocation = isWebiFrame ? window.top.location : window.location;

/*
 * getPageHref
 * A function, not a const: SoundCloud swaps tracks without ever loading a document (see
 * onUrlChange() in global.js), so a URL read once at script start names the track the user
 * opened FIRST and every lookup after the first click would be for the wrong mix.
 * pageLocation itself is a live Location object and stays correct.
 */
function getPageHref() {
    return pageLocation.protocol + "//" + pageLocation.host + pageLocation.pathname + pageLocation.search;
}

logVar( "pageLocation source", isWebiFrame ? "window.top.location (address bar)" : "window.location" );
logVar( "pageHref", getPageHref() );

if( isWebiFrame ) {
    urlPath = function(n) {
        return getPageHref().split('/')[n+2];
    };
    log( "urlPath() overridden to read from the address bar (webi frame mode)." );
}

// The OpenGraph/app-link meta tags (needed for the track ID) only exist in the top
// document - the webi frame ships a near-empty <head>.
const metaDoc = isWebiFrame ? window.top.document : document;
logVar( "metaDoc source", isWebiFrame ? "window.top.document" : "document" );

/*
 * getScPlayerUrl
 * The player URL as MixesDB embeds it.
 * DO NOT build it from location.href: that carries parameters, and inside the webi frame
 * it is not even the URL of this track.
 * Must work on URLs like https://soundcloud.com/fccr/shigeo-yamaguchi-wm-66-berlin-1996?utm_source=trackid.net&utm_campaign=wtshare&utm_medium=widget&utm_content=https%253A%252F%252Fsoundcloud.com%252Ffccr%252Fshigeo-yamaguchi-wm-66-berlin-1996
 */
function getScPlayerUrl() {
    return pageLocation.protocol + '//' + pageLocation.host + pageLocation.pathname;
}

// SPA navigation is set up at the very bottom of this file, once everything it has to reset
// exists - see runSoundcloudPage().


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Constants
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const xedItemsStorageKey = 'mdb-soundcloud-xed-items',
      hideXedItemsKey = 'mdb-soundcloud-hide-xed',
      hidePlaylistsKey = 'mdb-soundcloud-hide-playlists',
      hideRepostsKey = 'mdb-soundcloud-hide-reposts',
      hideFavoritesKey = 'mdb-soundcloud-hide-favorites',
      hideUsedKey = 'mdb-soundcloud-hide-used';

const getXedItems = () => {
    try {
        return JSON.parse(localStorage.getItem(xedItemsStorageKey)) || [];
    } catch (error) {
        logVar('getXedItems failed', error);
        return [];
    }
};

const saveXedItems = (items) => {
    localStorage.setItem(xedItemsStorageKey, JSON.stringify(items));
};

const addXedItem = (slug) => {
    if (!slug) return;

    const items = getXedItems();
    if (!items.includes(slug)) {
        items.push(slug);
        saveXedItems(items);
    }
};

const isXed = (slug) => getXedItems().includes(slug);

const isHideXedEnabled = () => localStorage.getItem(hideXedItemsKey) === 'true';

const setHideXedEnabled = (isEnabled) => {
    localStorage.setItem(hideXedItemsKey, isEnabled ? 'true' : 'false');
};

const resolveHideOption = (paramName, storageKey, defaultValue = 'false') => {
    const paramValue = getURLParameter(paramName);

    if (paramValue === 'true' || paramValue === 'false') {
        localStorage.setItem(storageKey, paramValue);
        return paramValue;
    }

    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === 'true' || storedValue === 'false') {
        return storedValue;
    }

    return defaultValue;
};

const setHideOption = (storageKey, isEnabled) => {
    localStorage.setItem(storageKey, isEnabled ? 'true' : 'false');
};

const getSlugFromSoundItem = (soundItem) => {
    if (!soundItem || !soundItem.length) return null;

    const link = soundItem.find('.sc-link-primary.soundTitle__title');
    const href = link.attr('href');

    if (!href) return null;

    return href
        .replace(/^https?:\/\/(?:www\.)?soundcloud\.com\//, '')
        .replace(/\?.*$/, '');
};

const hideIfXed = (soundItem) => {
    if (isSetsTab() || !isHideXedEnabled()) return;

    const slug = getSlugFromSoundItem(soundItem);
    if (slug && isXed(slug)) {
        soundItem.remove();
    }
};

// Note: loadRawCss() (in global.js) does not log success/error itself - if styling ever looks
// broken, check the Network tab for these URLs, since a failed fetch here fails silently.
// page_creator.css belongs to the shared MixesDB page creator (shared/page_creator/) and is
// loaded by every site script that calls mdbPageCreator_add() - see its header comment.
logFunc( "Loading CSS" );
var globalCssUrl = githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion,
    pageCreatorCssUrl = githubPath_raw + "shared/page_creator/page_creator.css?v-" + scriptName + "_" + cacheVersion,
    scriptCssUrl = githubPath_raw + scriptName + "/script.css?v-" + cacheVersion;
logVar( "globalCssUrl", globalCssUrl );
logVar( "pageCreatorCssUrl", pageCreatorCssUrl );
logVar( "scriptCssUrl", scriptCssUrl );
loadRawCss( globalCssUrl );
loadRawCss( pageCreatorCssUrl );
loadRawCss( scriptCssUrl );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var scAccessToken;

const fast = 200,
      soundActionFakeButtonClass = 'sc_button-mdb sc-button-secondary sc-button sc-button-medium mdb-item';

// On set pages show only some filter options and hide list items, not players
// https://soundcloud.com/jedentageinset/sets/jeden-tag-ein-set-podcasts
// Functions rather than values, for the same reason as getPageHref() above: SoundCloud goes
// from a user page to a set and back without loading a document.
function isSetPage() {
    return urlPath_noParams(2) == "sets";
}

function isSetsTab() {
    return isSetPage() && !urlPath_noParams(3);
}

// url parameters
// Read off the URL, so they only describe the page we are on right now - readHideOptions()
// runs again for every page, see runSoundcloudPage() at the bottom of this file.
var getHidePl, getHideReposts, getHideFav, getHideUsed, getHideXed;

function readHideOptions() {
    getHidePl = resolveHideOption("hidePl", hidePlaylistsKey);
    getHideReposts = resolveHideOption("hideReposts", hideRepostsKey);
    getHideFav = resolveHideOption("hideFav", hideFavoritesKey);
    getHideUsed = resolveHideOption("hideUsed", hideUsedKey);

    var getHideXedParam = getURLParameter("hideXed");
    getHideXed = getHideXedParam == "true" ? "true" : getHideXedParam == "false" ? "false" : ( isHideXedEnabled() ? "true" : "false" );

    setHideXedEnabled(getHideXed === "true");

    // The sets tab only shows an informational placeholder instead of filter
    // controls, so no persisted hide option may remove its playlist entries.
    if( isSetsTab() ) {
        getHidePl = getHideReposts = getHideFav = getHideUsed = getHideXed = "false";
    }

    logVar( 'isSetPage (= "'+urlPath_noParams(2)+'")', isSetPage() );
    logVar( "isSetsTab", isSetsTab() );
    logVar( "getHidePl", getHidePl );
    logVar( "getHideReposts", getHideReposts );
    logVar( "getHideFav", getHideFav );
    logVar( "getHideUsed", getHideUsed );
    logVar( "getHideXed", getHideXed );
}

readHideOptions();


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Track page diagnostics
 *
 * Every handler below (Toolkit, Track header, sc-button-group, artwork, ...) is driven
 * by waitForKeyElements, which - by design - only logs once a watched selector actually
 * matches. If a browser/layout combination exists where NONE of our selectors ever match
 * (SoundCloud markup changed further, an extension mangled the DOM, the frame never
 * finished hydrating, ...), that produces total silence: no error, no "not found" log,
 * nothing - which is exactly the "userscript ran fine but no MixesDB elements appeared"
 * reports we cannot currently diagnose from a log alone.
 *
 * This takes an unconditional snapshot of which key selectors exist (and are :visible)
 * in the DOM, at fixed checkpoints, independent of whether any waitForKeyElements
 * callback ever fires. A user's next log - even if it gets cut off before any handler
 * result appears - will still show exactly what markup was/wasn't there and when.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// selector -> which document to check it in ("frame" = this frame's own document, which
// is the webi iframe's document on new-layout track pages; "meta" = metaDoc, since e.g.
// al:ios:url only ever exists in the top document even inside the webi frame)
var trackPageDiagnosticSelectors = [
    [ 'section[aria-label="Track header" i], section[aria-label="Track-Header" i]', "frame" ], // new layout container (Aug 2026 redesign) - SoundCloud serves "Track header" OR "Track-Header" depending on account/rollout bucket, confirmed via a live cross-check against a reporter's session where only the hyphenated form was present
    [ '#mdb-sc-trackExtras',                                            "frame" ], // our new-layout wrapper, if already built
    [ '.l-listen-hero',                                                 "frame" ], // old layout header trigger
    [ '.l-listen__mainContent .listenDetails__partialInfo',             "frame" ], // old layout toolkit selector A
    [ '.listen-about .listenDetails',                                    "frame" ], // old layout toolkit selector B
    [ '.soundActions',                                                  "frame" ],
    [ '.l-listen-wrapper .soundActions .sc-button-group, .listen-content .soundActions .sc-button-group', "frame" ],
    [ '.listenArtworkWrapper',                                          "frame" ], // old artwork wrapper
    [ '.listenInfo .image span.sc-artwork[style*="background-image"]',  "frame" ], // newer artwork wrapper
    [ 'h1.soundTitle__title',                                           "frame" ],
    [ 'button[aria-label="Download track"]',                            "frame" ],
    [ 'meta[property="al:ios:url"]',                                    "meta"  ], // NOT the track ID source any more (it is stale under SPA navigation - see the API call), kept as a signal for whether this document was server-rendered for this track
    [ 'meta[property="og:title"]',                                      "meta"  ]
];

function logTrackPageSnapshot( label ) {
    // Both the top frame and the webi frame run their own copy of this diagnostic (each
    // sets up its own 'load'/timeout checkpoints), and both log under the same unlabeled
    // text - without the frame tag, two near-identical "Track page DOM snapshot" blocks
    // show up back to back and can only be told apart by eyeballing which values are
    // non-zero. Confirmed against a known-good log: this is expected/harmless there, but
    // for a broken report it needs to be unambiguous at a glance.
    logFunc( "Track page DOM snapshot: " + label + " (" + ( isWebiFrame ? "webi frame" : "top frame" ) + ")" );
    logVar( "document.readyState", document.readyState );
    logVar( "urlPath(2)", urlPath(2) );

    $.each( trackPageDiagnosticSelectors, function( i, entry ) {
        var selector = entry[0],
            docTarget = ( entry[1] === "meta" ) ? metaDoc : document,
            matches = $( selector, docTarget ),
            visibleCount = matches.filter(':visible').length;

        log( "  [" + matches.length + " found, " + visibleCount + " visible] " + selector );
    });
}

// Reaches directly into the webi iframe's own contentDocument from the TOP frame, i.e.
// it bakes in the manual "run this snippet in DevTools" check we kept having to ask
// testers for by hand while chasing a report where the webi frame's OWN script instance
// reported 0 matches for everything. Only the top frame can do this (it owns the iframe
// element); running it there means every future log already contains the answer instead
// of needing a live back-and-forth with whoever can reproduce the bug.
// If this ever disagrees with the webi frame's own self-reported snapshot above, that
// points to a bug/race in OUR diagnostic rather than in SoundCloud's markup - currently
// indistinguishable without this cross-check.
function logWebiIframeCrossCheck( label ) {
    if( !isTopFrame ) return; // only the top frame can reach the iframe element itself

    logFunc( "Webi iframe cross-check (from top frame): " + label );

    var iframe = document.getElementById( "__WEBI_IFRAME_PRELOADED__" ) ||
                 Array.prototype.filter.call( document.querySelectorAll( "iframe" ), function( f ) {
                     try {
                         return /^\/n\//.test( new URL( f.src, location.href ).pathname );
                     } catch( e ) {
                         return false;
                     }
                 })[0];

    if( !iframe ) {
        log( "No webi iframe (#__WEBI_IFRAME_PRELOADED__ or iframe[src^=\"/n/\"]) found in the top document." );
        return;
    }

    logVar( "iframe.src", iframe.src );

    var doc;
    try {
        doc = iframe.contentDocument;
    } catch( e ) {
        log( "Webi iframe found but reading contentDocument threw (cross-origin?): " + e );
        return;
    }

    if( !doc ) {
        log( "Webi iframe found but contentDocument is null (not yet accessible)." );
        return;
    }

    var labels = $( "section[aria-label]", doc ).map(function() { return $(this).attr("aria-label"); }).get();
    logVar( "section[aria-label] values seen directly inside the webi iframe", JSON.stringify( labels ) );
    logVar( "#mdb-sc-trackExtras present inside the webi iframe (cross-check)", $("#mdb-sc-trackExtras", doc).length !== 0 );
}

// Logged-in vs logged-out has repeatedly turned out to matter for reproducing layout
// bugs, but asking someone what account state they were in after the fact is unreliable.
// These are matched by href/src PATTERN, not by translated button text (the same trap
// that made the original "Track header" aria-label investigation take several rounds) -
// so they hold regardless of the page's locale. Logged as raw signals rather than a
// single yes/no verdict since we do not have a confirmed ground truth for every account
// state yet; interpret alongside everything else rather than trusting this in isolation.
function logAuthSignals( label ) {
    if( !isTopFrame ) return; // metaDoc central here too, no need to run from both frames

    logFunc( "Auth signals: " + label );
    logVar( "a[href*=\"/signin\"] count (seen when logged out)", $('a[href*="/signin"]', metaDoc).length );
    logVar( "iframe[src*=\"web-auth\"] count (prefetched sign-in modal, seen when logged out)", $('iframe[src*="web-auth"]', metaDoc).length );
}

function runTrackPageDiagnostics( label ) {
    logTrackPageSnapshot( label );
    logWebiIframeCrossCheck( label );
    logAuthSignals( label );
}

// Only meaningful on an actual track page - urlPath(2) already accounts for the webi
// frame's urlPath() override (reads the address bar) done further up this file.
if( urlPath(2) && urlPath(2) != "sets" ) {
    runTrackPageDiagnostics( "at script start" );

    if( document.readyState !== "complete" ) {
        window.addEventListener( "load", function() {
            runTrackPageDiagnostics( "on window 'load' event" );
        });
    }

    // React/webi content can keep hydrating well after document-end and 'load' - these
    // fixed, one-shot checkpoints catch that without logging forever (unlike a
    // MutationObserver/interval, which would flood the console on every re-render).
    [ 3000, 8000, 15000 ].forEach(function( delay ) {
        setTimeout(function() {
            runTrackPageDiagnostics( delay + "ms after script start" );
        }, delay );
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Artwork" );

waitForKeyElements(".listenArtworkWrapper", function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        //log( location.href );

        // Artwork link to original (legacy wrapper)
        var artworkWrapper = $(".listenArtworkWrapper"),
            artwork_url = $(".sc-artwork", artworkWrapper).html().replace(/.+&quot;(htt.+(?:jpg|png)).+/, "$1");
        log( artworkWrapper.html() );
        logVar( "artwork_url", artwork_url );
        if( typeof artwork_url  !== "undefined" ) {
            append_artwork( artwork_url );
        }
    }
});

// Artwork link to original (new listenInfo wrapper)
waitForKeyElements(".listenInfo .image span.sc-artwork[style*='background-image']", function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        var styleAttr = jNode.attr("style") || "",
            artwork_url = styleAttr.replace(/.*background-image:\s*url\(["']?(https?:[^"')]+(?:jpg|png))["']?\).*/, "$1");

        logVar( "artwork_url (listenInfo)", artwork_url );

        if( typeof artwork_url !== "undefined" && artwork_url !== styleAttr ) {
            append_artwork( artwork_url );
        }
    }
});

// Artwork link to original (new Material "Track header" layout, since ~Aug 2026 redesign)
// is not done from the DOM: the artwork box clips its overflow, so an info bar placed next to
// the <img> is invisible, and tracks with a "visuals" banner have no artwork <img> in the
// visible header at all. It is added from the API artwork_url instead, see the API call below.


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Favorite button
 *
 * TODO:
 * Enable in playlists https://soundcloud.com/resident-advisor
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Favorite button" );

// soundList__item
waitForKeyElements(".soundList__item .sc-button-like:not(.mdb-processed-favorited)", function( jNode ) {
    // is favorited
    if( jNode.hasClass("sc-button-selected") ) {
        var title = jNode.closest(".soundList__item").find(".soundTitle__title");
        log( "Favorite found: " + title.text() );

        // Highlight player title if favorited
        title.addClass("mdb-darkorange");

        // Hiding option: remove faved player
        removeFavedPlayer_ifOptedIn( jNode );
    }

    // mark as processed
    jNode.addClass("mdb-processed-favorited");
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Submit the whole set to TrackId.net
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Set submit link" );

// Below the filter row of #mdb-streamActions, i.e. the last of our own controls above the
// set's track list. That row is built by mountUI() in script.funcs.js, which only runs for
// !isSetsTab() - exactly the set pages this link is for.
// Set pages still use the old layout, so no webi frame handling is needed here, but
// getPageHref() is passed anyway since it is the address bar URL in either frame.
// https://soundcloud.com/jedentageinset/sets/jeden-tag-ein-set-podcasts
waitForKeyElements("#mdb-streamActions-filter", function( jNode ) {
    addTidPlaylistSubmitLink( jNode, "after", getPageHref() );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Links in playlist sets
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Links in playlist sets" );

// player links and link buttons
// https://soundcloud.com/resident-advisor/sets/ra-podcast
waitForKeyElements(".listenDetails__trackList li a.trackItem__trackTitle", playlistSetsCaseOne );
waitForKeyElements(".systemPlaylistTrackList__list li a.trackItem__trackTitle", playlistSetsCaseOne );
function playlistSetsCaseOne( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr("href") );

    jNode.attr( "href", playerUrlFixed )
         .attr( "target", "_blank" )
         .attr( "title", playerUrlFixed+" (opens in a new tab)" );

    // Hiding option: each used player in li.trackList__item
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players in sets" );

        var wrapper = jNode.closest("li.trackList__item"),
            playerUrl = "soundcloud.com" + jNode.attr("href");
        //logVar( "trackList__item playerUrl", playerUrl );

        getToolkit( playerUrl, "hide if used", "lazy loading list", wrapper );
    }
}

// Compact playlists
// https://soundcloud.com/resident-advisor
waitForKeyElements(".compactTrackList__listWrapper li.compactTrackList__item a.trackItem__trackTitle", function( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr( "href") );

    jNode.after( '<a href="'+playerUrlFixed+'" title="'+playerUrlFixed+' (opens in a new tab)" target="_blank" class="mdb-element mdb-copyLink">Link</a>' );
});

// .copyLink on click open new tab
waitForKeyElements(".mdb-copyLink", function( jNode ) {
    jNode.click(function(){
        var url = $(this).attr("href");
        window.open( url, "_blank" );
    });
});

// button to copy link (no href)
// hide it (would copy url with in parameter)
waitForKeyElements(".listenDetails__trackList li a.trackItem__trackTitle", function( jNode ) {
    jNode.hide();
});
waitForKeyElements(".listenDetails__trackList li button.sc-button-copylink", function( jNode ) {
    jNode.remove(); // hide() would make it flash on playlist pages
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Favorited buttons
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Favorited buttons" );

// if favorited before, show hidden soundActions
waitForKeyElements(".listenDetails li .trackItem__actions:not(:visible)", function( jNode ) {
    jNode.css('margin-left','.5rem').show();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * [X] remove button
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: [X] remove button" );

// if favorited before, show hidden soundActions
waitForKeyElements(".soundList__item .sound__body", function( jNode ) {
    var removeItem = '<div class="mdb-element mdb-removeItem hand sc-text-grey" title="Remove the player (can be filtered out again with the hiding option &quot;X\'ed items&quot;)">X</div>';
    jNode.append( removeItem );
});

// on click
// scrolling is needed because it wouldn't load more when all visible are removed
waitForKeyElements(".soundList__item .mdb-removeItem", function( jNode ) {
    $(".mdb-removeItem").click(function(){
        log( "click remove" );

        // keep lazy loading active
        $(".lazyInfo").remove();
        $(".lazyLoadingList__list, .userStream__list .soundList").after('<div style="text-align:center; margin-bottom:20px" class="lazyInfo">Problems loading more players? Try scrolling up and down.</div>');

        const soundItem = $(this).closest('.soundList__item');
        const slug = getSlugFromSoundItem(soundItem);
        addXedItem(slug);

        var y = $(window).scrollTop();
        $("html, body").animate({scrollTop:y + 1}, 0);
        soundItem.remove();
        var y = $(window).scrollTop();
        $("html, body").delay(2).animate({scrollTop:y - 1}, 2);

        if( $(".paging-eof").is(':visible') ) {
            $('.lazyInfo').remove();
        }
    });
});

waitForKeyElements('.soundList__item:not(.mdb-processed-xed)', function( jNode ) {
    jNode.addClass('mdb-processed-xed');
    hideIfXed(jNode);
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Hide options
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Hide options" );

// lazy loading lists (streams and feed)
waitForKeyElements(".stream__list .lazyLoadingList", lazyLoadingList);
waitForKeyElements(".userStream.lazyLoadingList", lazyLoadingList);
waitForKeyElements(".soundList.lazyLoadingList", lazyLoadingList);
waitForKeyElements(".trackList.lazyLoadingList", lazyLoadingList);

function lazyLoadingList(jNode) {
    logFunc( "lazyLoadingList" );

    // add checkboxes
    if( $("#mdb-streamActions").length === 0 ) {
        jNode.before('<div id="mdb-streamActions" class="sc-text-grey"><div id="mdb-streamActions-hide"></div></div>');

        // vars
        var saHide = $("#mdb-streamActions-hide"),
            checkedPl = "checked",
            checkedReposts = "",
            checkedFav = "",
            checkedUsed = "",
            checkedXed = "";
        if( getHidePl == "false" ) checkedPl = '';
        if( getHideReposts == "true" ) checkedReposts = 'checked';
        if( getHideFav == "true" ) checkedFav = 'checked';
        if( getHideUsed == "true" ) checkedUsed = 'checked';
        if( getHideXed == "true" ) checkedXed = 'checked';

        // Display filter options per tab type
        saHide.append('<span class="mdb-darkorange">Hide:</span>');
        if( isSetsTab() ) {
            saHide.append( "Filter options on pages with multiple playlists create too much server load. Open the playlist/set page of interest individually." );
        } else {
            if( !isSetPage() ) {
                saHide.append('<label class="pointer"><input type="checkbox" id="hidePl" name="hidePl" '+checkedPl+' value="">Playlists</label>');
                saHide.append('<label class="pointer"><input type="checkbox" id="hideReposts" name="hideReposts" '+checkedReposts+' value="">Reposts</label>');
                saHide.append('<label class="pointer" title="Hide players that are favorited by you"><input type="checkbox" id="hideFav" name="hideFav" '+checkedFav+' value="">Favs</label>');
            }
            saHide.append('<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>');
            saHide.append('<label class="pointer" title="Hide items you previously removed with the X button"><input type="checkbox" id="hideXed" name="hideXed" '+checkedXed+' value="">X\'ed items</label>');
        }
    }

    // Filter row
    if( !isSetsTab() ) {
        log( "lazyLoadingList: setting up filter row (installNetworkHooks, mountUI, attachIO, observeDOM, refreshVisible)." );
        installNetworkHooks();
        mountUI();
        attachIO();
        observeDOM();
        refreshVisible();
    } else {
        log( "lazyLoadingList: isSetsTab - skipping filter row setup." );
    }

    // reload
    var windowLocation = window.location,
        href = $(location).attr('href');

    if( typeof href != "undefined" ) {
        var url = href.replace(/\?.*$/g,"");
    }

    if( typeof url != "undefined" ) {
        $("#hidePl").change(function(){
            const hidePlEnabled = this.checked;
            setHideOption(hidePlaylistsKey, hidePlEnabled);

            if(!hidePlEnabled) { windowLocation.href = url + "?hidePl=false&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl=true&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
        }});
        $("#hideReposts").change(function(){
            const hideRepostsEnabled = this.checked;
            setHideOption(hideRepostsKey, hideRepostsEnabled);

            if(!hideRepostsEnabled) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=false&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=true&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
        }});
        $("#hideFav").change(function(){
            const hideFavEnabled = this.checked;
            setHideOption(hideFavoritesKey, hideFavEnabled);

            if(!hideFavEnabled) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=false&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=true&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
        }});
        $("#hideUsed").change(function(){
            const hideUsedEnabled = this.checked;
            setHideOption(hideUsedKey, hideUsedEnabled);

            if(!hideUsedEnabled) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed=false&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed=true&hideXed="+getHideXed;
        }});
        $("#hideXed").change(function(){
            const hideXedEnabled = this.checked;
            setHideXedEnabled(hideXedEnabled);

            windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+(hideXedEnabled ? "true" : "false");
        });
    }
}

// Pass URL parameters for hiding options to user profile tabs
waitForKeyElements(".userInfoBar__tabs ul", function( jNode ) {
    $("a.g-tabs-link", jNode).each(function(){
        var link = $(this),
            href = link.attr("href"),
            hidingParams = location.search;

        logVar( "hidingParams", hidingParams );

        if( /hide(?:Pl|Reposts|Fav|Used|Xed)=/.test(hidingParams) ) {
            var href_hidingParams = href + hidingParams;
            link.attr( "href", href_hidingParams );
        }
    });
});

// Hiding option: each playlist
waitForKeyElements(".soundList__item .sound.playlist", function( jNode ) {
    if( getHidePl == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
    }
});

// Hiding option: each repost player
waitForKeyElements(".soundList__item .sc-ministats-reposts", function( jNode ) {
    if( getHideReposts == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
    }
});

// Hiding option: each fFaved players > on waitForKeyElements fav button

// Hiding option: each used player in li.soundList__item
waitForKeyElements(".sc-link-primary.soundTitle__title", function( jNode ) {
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players in li.soundList__item" );

        var wrapper = jNode.closest("li.soundList__item"),
            playerUrl = "soundcloud.com" + jNode.attr("href");

        logVar( "li.soundList__itemplayerUrl", playerUrl );

        getToolkit( playerUrl, "hide if used", "lazy loading list", wrapper );
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit duration gate
 *
 * MixesDB does not take recordings under 20 min (Help:File_Details#Minimum_duration). The
 * page creator already refuses those - and for the toolkit the MixesDB usage check could
 * only ever answer "not used", so it is not loaded at all for them, which saves MixesDB
 * that request. The red #mdb-fileInfo button is what tells the reader this is on purpose.
 *
 * The duration comes out of the ONE SC API answer the sc-button-group handler already
 * fetches - no second SC API call for this. Since the toolkit handlers fire before that
 * answer is in, they park their getToolkit() call here and it is released (or dropped)
 * when the answer names the duration.
 *
 * The SC API can also die on the way (a failing token fetch never calls back - see
 * getScAccessTokenFromApi), and the toolkit must not die with it: a parked call is released
 * ungated after 10s. A duration of 0/unknown releases too - only a duration we positively
 * know may drop the toolkit, the same rule mdbPageCreator_setTitle applies.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var toolkitDurationGate_pending = null,  // the parked "load the toolkit now" call of the current track
    toolkitDurationGate_durMs = null,    // null = the SC API has not answered for this track yet, 0 = answered without a duration
    toolkitDurationGate_fallbackTimer = null;

function toolkitDurationGate_clearFallbackTimer() {
    if( toolkitDurationGate_fallbackTimer ) {
        clearTimeout( toolkitDurationGate_fallbackTimer );
        toolkitDurationGate_fallbackTimer = null;
    }
}

// toolkitDurationGate_tooShort
// Only a positively known duration may drop the toolkit - see the section comment.
// mdbPageCreator_minDurationMs is the page creator's 20 min constant (page_creator.js), so
// both features keep skipping at the same threshold.
function toolkitDurationGate_tooShort() {
    return toolkitDurationGate_durMs !== null
        && toolkitDurationGate_durMs > 0
        && toolkitDurationGate_durMs < mdbPageCreator_minDurationMs;
}

// toolkitDurationGate_decide
function toolkitDurationGate_decide( fire ) {
    if( toolkitDurationGate_tooShort() ) {
        log( "toolkitDurationGate: track is " + Math.round( toolkitDurationGate_durMs / 1000 ) + "s, under the " +
             ( mdbPageCreator_minDurationMs / 60000 ) + " min MixesDB minimum - toolkit (and its MixesDB usage check) skipped. " +
             "The red #mdb-fileInfo button marks this as intended." );

        // the loading skeleton waits for a toolkit verdict before it reveals - tell it that
        // none is coming, or it would sit out its whole max wait
        mdbSkeleton_noToolkit();
        return;
    }

    fire();
}

// toolkitDurationGate_request
// The toolkit handlers hand their getToolkit() call in here instead of firing it themselves.
function toolkitDurationGate_request( fire ) {
    logFunc( "toolkitDurationGate_request" );

    toolkitDurationGate_clearFallbackTimer();

    // duration already in (a React re-render of the same track): decide right away
    if( toolkitDurationGate_durMs !== null ) {
        toolkitDurationGate_decide( fire );
        return;
    }

    log( "toolkitDurationGate_request: SC API answer not in yet - toolkit call parked." );
    toolkitDurationGate_pending = fire;

    toolkitDurationGate_fallbackTimer = setTimeout(function() {
        if( toolkitDurationGate_pending ) {
            log( "toolkitDurationGate: no SC API answer after 10s - loading the toolkit without the duration check." );
            var pending = toolkitDurationGate_pending;
            toolkitDurationGate_pending = null;
            pending();
        }
    }, 10000 );
}

// toolkitDurationGate_resolve
// Called with the SC API's duration (ms) once its answer is in - 0 for "answered, but no
// usable duration" (an error, no track, no token), which releases the parked call ungated.
function toolkitDurationGate_resolve( durMs ) {
    toolkitDurationGate_durMs = ( typeof durMs === "number" && durMs > 0 ) ? durMs : 0;
    logVar( "toolkitDurationGate_resolve: durMs", toolkitDurationGate_durMs );

    toolkitDurationGate_clearFallbackTimer();

    if( toolkitDurationGate_pending ) {
        var pending = toolkitDurationGate_pending;
        toolkitDurationGate_pending = null;
        toolkitDurationGate_decide( pending );
    }
}

// toolkitDurationGate_reset
// SPA navigation: the parked call and the duration both describe the previous track.
function toolkitDurationGate_reset() {
    toolkitDurationGate_pending = null;
    toolkitDurationGate_durMs = null;
    toolkitDurationGate_clearFallbackTimer();
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Player page / features using SC API
 * like soundAactions buttons and upload date
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Player page / SC API features (soundActions, download button, sc-button-group, trackHeader, description expand)" );

/*
 * fixDefaultSoundActions
 * Make more space by removing button text for most
 */
waitForKeyElements(".soundActions", function( jNode ) {
    logFunc( "fixDefaultSoundActions" );

    var buyLink = $(".soundActions__purchaseLink", jNode);
    if( buyLink.length !== 0 ) {
        var buyLink_href = fixScRedirectUrl( buyLink.attr("href") ),
            buyLink_text = buyLink.text();

        buyLink.remove();
        // an <a> carrying the button classes, not an <a> inside a <button> - see the new
        // layout's #mdb-purchaseLink for why a nested anchor cannot be clicked
        jNode.append( '<a class="'+soundActionFakeButtonClass+'" href="'+buyLink_href+'" target="_blank">Link: '+buyLink_text+'</a>' );
    }
});

/*
 * SoundCloud's own download button (new layout)
 *
 * The redesign renders it as an unlabelled MUI icon button - its mui-* class names are
 * generated per build and useless as a selector, so the aria-label is the only stable hook:
 * <button ... aria-label="Download track"><svg>...</svg></button>
 *
 * We cannot download the file ourselves (the API's download_url needs the OAuth token as a
 * header, so it cannot just be put into an <a href>), so #mdb-dlInfo forwards the click to
 * that button instead.
 */

// The track page lives in the webi frame, but the header can also come from the top
// document - search both, and only ever take a visible match: the header is rendered twice
// (responsive mobile/desktop variants) and clicking the hidden copy does nothing.
function findScVisibleElement( selector ) {
    var docs = ( metaDoc !== document ) ? [ document, metaDoc ] : [ document ];

    for( var i = 0; i < docs.length; i++ ) {
        var found = $( selector, docs[i] ).filter(':visible').first();
        if( found.length !== 0 ) {
            return found;
        }
    }
    return $();
}

// Selectors are tried one after the other, not as one comma list: a comma list returns
// whatever comes first in the document, which could be an unrelated "Download the app"
// button, while the exact aria-label is the one we actually want.
function getScDownloadButton() {
    var selectors = [ 'button[aria-label="Download track"]',
                      '[role="menuitem"][aria-label^="Download track"]',
                      'button[aria-label^="Download track"]' ];

    for( var i = 0; i < selectors.length; i++ ) {
        var found = findScVisibleElement( selectors[i] );
        if( found.length !== 0 ) {
            return found;
        }
    }
    return $();
}

/*
 * triggerScDownload
 * Must be called straight from the click handler, never out of a timer: browsers only let
 * the download through while the user gesture is still active.
 * onFail() is called if the button cannot be found at all.
 */
function triggerScDownload( onFail ) {
    logFunc( "triggerScDownload" );

    var dlButton = getScDownloadButton();

    if( dlButton.length !== 0 ) {
        log( "Clicking SoundCloud's own download button" );
        dlButton.get(0).click();
        return;
    }

    // Not in the DOM: on narrow layouts the download sits in the header's overflow menu,
    // and MUI only renders menu items once the menu is open.
    var moreButton = findScVisibleElement( 'button[aria-label^="More"]' );

    if( moreButton.length === 0 ) {
        onFail();
        return;
    }

    log( "No download button - opening the overflow menu" );
    moreButton.get(0).click();

    // The menu renders async, so poll for it - but briefly: the click still has to land
    // inside the transient user activation window (~5s in Chrome).
    var tries = 0,
        poll = setInterval(function(){
            var menuButton = getScDownloadButton();

            if( menuButton.length !== 0 ) {
                clearInterval( poll );
                log( "Clicking the download entry of the overflow menu" );
                menuButton.get(0).click();
            } else if( ++tries > 20 ) {
                clearInterval( poll );
                onFail();
            }
        }, 50);
}

/*
 * Call API
 * .listen-content .soundActions > for premium account layout (?), e.g. https://soundcloud.com/grabthegroove/gtg-pdcst-046-pyramidal-decode
 */
// run all this only once
var RUN_sc_button_group = true;

// New Material "Track header" layout (since ~Aug 2026 redesign) has no button-group with room
// for extra buttons, so API/file-details buttons go into #mdb-sc-trackExtras - and that wrapper
// is what this handler waits for there.
// It must NOT wait for the Track header section itself: waitForKeyElements keeps its
// "alreadyFound" flag in one jQuery data key per element, so several handlers watching the same
// element starve each other - whichever runs first flags it and the rest never see it.
waitForKeyElements('.l-listen-wrapper .soundActions .sc-button-group, .listen-content .soundActions .sc-button-group, #mdb-sc-trackExtras', function( jNode ) {
    log( "sc-button-group/#mdb-sc-trackExtras matched. RUN_sc_button_group: " + RUN_sc_button_group + ", matched selector on: " + ( jNode.attr("id") || jNode.attr("class") ) );

    if( RUN_sc_button_group ) {
        var isNewSoundCloudLayout = jNode.is('#mdb-sc-trackExtras'),
            // Which track this run is for. Everything below is two network round trips deep
            // (access token, then the track), and jNode/title/artwork/description all describe
            // THIS track - so if the reader has clicked on to the next one meanwhile, the
            // answer has to be dropped instead of written into their page. See
            // mdbPageGeneration in global.js.
            pageGeneration = mdbPageGeneration;

        RUN_sc_button_group = false;

        if( urlPath(2) != "sets" ) {

            logFunc( "Player page / sound action buttons" );
            logVar( "isNewSoundCloudLayout", isNewSoundCloudLayout );

            // API call
            getScAccessTokenFromApi(function(output){
                if( !mdbIsCurrentPage( pageGeneration ) ) return;

                scAccessToken = output;
                logVar( "scAccessToken", scAccessToken );

                if( scAccessToken != "null" ) {
                    /*
                     * Which track this page is about: asked of the API by its PLAYER URL.
                     *
                     * It used to be read out of meta[property="al:ios:url"] in the top
                     * document, and that only ever worked because we forced a full reload on
                     * every URL change. SoundCloud writes that meta when it SERVER-renders a
                     * track page and does not rewrite it when its own router navigates, so
                     * under SPA navigation it is either
                     *   - absent, coming from the feed          -> "no track ID", no toolkit
                     *   - the PREVIOUS track, coming from one   -> the mix before this one is
                     *     what gets looked up, which is how its header, page creator row and
                     *     tracklist ended up on the next mix's page.
                     * Both symptoms disappear on a manual reload, which is exactly the tell.
                     *
                     * getScPlayerUrl() is built from the live pageLocation (the address bar in
                     * either frame), so it always names the track actually on screen.
                     */
                    var scApiURl_currentTrack = "https://api.soundcloud.com/resolve?url=" + encodeURIComponent( getScPlayerUrl() );

                    logVar( "scApiURl_currentTrack", scApiURl_currentTrack );

                    $.ajax({
                        beforeSend: function(request) {
                            request.setRequestHeader( "Authorization", "OAuth " + scAccessToken );
                        },
                        dataType: "json",
                        url: scApiURl_currentTrack,
                        success: function( t ) {
                            // The reader moved on while this was in the air - this whole
                            // block writes the track it describes into the page, so it would
                            // put the PREVIOUS mix's header, page creator row and tracklist
                            // onto the one now on screen.
                            if( !mdbIsCurrentPage( pageGeneration ) ) return;

                            var kind = t.kind,
                                id = t.id,
                                title = t.title,
                                created_at = formatScDate( t.created_at ),
                                release_date = formatScDate( t.release_date ),
                                last_modified = formatScDate( t.last_modified ),
                                dur_ms = t.duration,
                                downloadable = t.downloadable,
                                download_url = t.download_url,
                                apiArtworkUrl = t.artwork_url,
                                purchase_url = t.purchase_url,
                                purchase_title = t.purchase_title;

                            logVar( "kind", kind );
                            logVar( "title", title );
                            logVar( "downloadable", downloadable );

                            // releases (or drops) the parked getToolkit() call - see the
                            // toolkit duration gate. A non-track answer counts as "no
                            // usable duration", which releases ungated.
                            toolkitDurationGate_resolve( kind == "track" ? dur_ms : 0 );

                            // MixesDB does not take recordings under 20 min: no page creator
                            // row, no tracklist box (the toolkit was dropped by the gate
                            // above). Read off the gate so both use the same verdict.
                            var tooShortForMixesdb = toolkitDurationGate_tooShort();

                            if( kind == "track" ) {
                                // trackHeader
                                // in the new layout jNode is #mdb-sc-trackExtras itself, which already
                                // brings its own #mdb-trackHeader, #mdb-sc-trackButtons and #mdb-toggle-target
                                var soundActions = jNode,
                                    trackHeader = isNewSoundCloudLayout ? $("#mdb-sc-trackHead #mdb-trackHeader") : $("#mdb-trackHeader"),
                                    buttonTarget = isNewSoundCloudLayout ? $("#mdb-sc-trackButtons") : jNode;

                                if( $("h1", trackHeader).length === 0 ) {
                                    var trackHeader_content = '<h1 id="mdb-trackHeader-headline" class="hand"><span class="mdb-selectOnClick">'+title+'</span></h1>';

                                    trackHeader_content += '<p id="mdb-trackHeader-releaseInfo" class="sc-text-grey">';
                                    trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-createDate"><span>Created at:</span> <date id="mdb-trackHeader-date1" class="mdb-selectOnClick hand">'+created_at+'</date></span>';
                                    if( release_date != "" ) {
                                        trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-releaseDate"><span>Release date:</span> <date id="mdb-trackHeader-date2" class="mdb-selectOnClick hand">'+release_date+'</date></span>';
                                    }
                                    if( last_modified != "" ) {
                                        trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-lastmodDate"><span>Last modified:</span> <date id="mdb-trackHeader-date3" class="mdb-selectOnClick hand">'+last_modified+'</date></span>';
                                    }
                                    trackHeader_content += '</p>';

                                    logVar( "trackHeader_content", trackHeader_content );

                                    trackHeader.append( trackHeader_content );

                                    var dateClass = "highlight mdb-selectOnClick hand";
                                    if( release_date == "" ) {
                                        $("#mdb-trackHeader-releaseInfo-createDate date").addClass( dateClass );
                                    } else {
                                        $("#mdb-trackHeader-releaseInfo-releaseDate date").addClass( dateClass );
                                    }

                                    // new layout: the dates share one row with the buttons
                                    // (DL, duration, API), so move them over there before they are
                                    // added. Move the whole #mdb-trackHeader-releaseInfo paragraph
                                    // instead of the single spans - the grey and the date.highlight
                                    // styles are scoped to that wrapper.
                                    if( isNewSoundCloudLayout ) {
                                        $("#mdb-trackHeader-releaseInfo").prependTo( buttonTarget );

                                        // #mdb-trackHeader is one column of the #mdb-sc-trackHead
                                        // flex row (the artwork info bar is the other), so a
                                        // headline left in there only gets part of the width, and
                                        // long titles wrap early. Lift it out to be a direct child
                                        // of the wrapper, where it spans everything.
                                        // It goes AFTER #mdb-sc-trackHead, not before it: that row
                                        // has to stay the first thing in the wrapper so the artwork
                                        // info bar keeps sitting directly below SoundCloud's own
                                        // artwork. Putting the headline above it would push the bar
                                        // down by the height of the headline plus the title row.
                                        // #mdb-trackHeader stays behind as the empty flex spacer
                                        // that keeps the artwork bar over on the right.
                                        // The title suggestion is inserted AFTER the headline, so it
                                        // follows it out here and gets the full width too.
                                        $("#mdb-trackHeader-headline").insertAfter( $("#mdb-sc-trackHead") );
                                    }
                                }

                                // MixesDB page creator (shared/page_creator/), below the
                                // headline. Everything site-specific is read off the API
                                // response here and handed over - the creator itself never
                                // looks at a SoundCloud page.
                                // Outside the h1 guard above: the row is only added once the
                                // toolkit reported "not on MixesDB yet", which can land long
                                // after the header was built (and the other way round).
                                // dur_ms gates it: MixesDB does not take recordings under 20 min.
                                // getScPlayerUrl() rides along for the {{Player}} of the page the
                                // "Create" link starts - the same URL MixesDB embeds, which is
                                // not what location.href holds here (see its comment above).
                                // The artwork URL goes with it for MixesDB's image upload form;
                                // it is NOT put on the page. scArtworkOriginalUrl() is applied
                                // HERE and not over there: asking for the "-original" size is a
                                // SoundCloud CDN trick, not something a page creator knows.
                                // target as a selector string, not a node: SoundCloud re-renders
                                // under us, and the string is looked up again on every render.
                                // Not called at all for a track under the 20 min minimum:
                                // mdbPageCreator_setTitle() would refuse the title anyway, but
                                // skipping here also saves its MixesDB category lookup.
                                if( !tooShortForMixesdb ) {
                                    mdbPageCreator_add({
                                        title:       title,
                                        channel:     ( t.user && t.user.username ) ? t.user.username : "",
                                        createdAt:   created_at,
                                        releaseDate: release_date,
                                        durationMs:  dur_ms,
                                        playerUrl:   getScPlayerUrl(),
                                        artworkUrl:  scArtworkOriginalUrl( apiArtworkUrl ),
                                        // Not for the tracklist - that is the separate call below.
                                        // The TITLE builder reads the labels the tracklist credits
                                        // ("Artist - Title [Label]") out of it, so it can tell a
                                        // label in brackets behind an artist from a second artist.
                                        description: t.description,
                                        // what the "Report" box calls this site ("SC title:",
                                        // "SC date:") - the short name a reported title is written
                                        // with, not the script name
                                        sourceLabel: "SC",
                                        target:      "#mdb-trackHeader-headline",
                                        placement:   "after"
                                    });
                                } else {
                                    log( "Track is under the 20 min MixesDB minimum - no page creator row and no tracklist box." );
                                }

                                // add toggleTarget
                                if( $("#mdb-toggle-target").length === 0 ) {
                                    $(".listenDetails").prepend( '<div id="mdb-toggle-target"></div>' );
                                }

                                // The tracklist an uploader wrote into the description (or, when
                                // there is none there, into a comment): the page creator finds
                                // it, has MixesDB's Tracklist Editor format it and puts it into
                                // an editable box that then rides along into the created page.
                                // Only the description is handed over up front - the comments
                                // cost another API call and are fetched from the callback, which
                                // the creator only reaches when the description gave nothing.
                                // Below the toolkit and above SoundCloud's own description, which
                                // #mdb-toolkit gives us in BOTH layouts: in the new one the
                                // toolkit is the last thing in #mdb-sc-trackExtras (which sits
                                // right under the Track header), in the old one it is inserted
                                // before .listenDetails__partialInfo, which holds the
                                // description. It arrives from a MixesDB API call of its own, so
                                // the creator waits for it rather than expecting it to be there.
                                // Skipped for a too-short track along with mdbPageCreator_add()
                                // above: its box waits for a toolkit verdict, and the duration
                                // gate dropped that toolkit.
                                if( !tooShortForMixesdb ) {
                                    mdbPageCreator_addTracklist({
                                        description:  t.description,
                                        loadComments: function( done ) {
                                            // id, not a track ID read off the page: it comes out of
                                            // the very response being handled, so it cannot name
                                            // another track than the one this row is for.
                                            getScTrackComments( id, scAccessToken, done );
                                        },
                                        target:       "#mdb-toolkit",
                                        placement:    "after"
                                    });
                                }

                                // indicate download is available
                                // cannot add DL url, thus only a button, but that cannot trigger the dropown to open
                                // therefor rename the dropdown to "DL"
                                // In the new layout the hint gets its own button next to the other
                                // trackExtras buttons, which forwards the click to SoundCloud's own
                                // download button - see triggerScDownload().
                                if( downloadable ) {
                                    if( isNewSoundCloudLayout ) {
                                        if( $("#mdb-dlInfo").length === 0 ) {
                                            buttonTarget.append('<button id="mdb-dlInfo" class="'+soundActionFakeButtonClass+'" title="Download this track (triggers SoundCloud\'s own download button)">DL</button>');

                                            $("#mdb-dlInfo").click(function(){
                                                var dlInfoButton = $(this);

                                                triggerScDownload(function(){
                                                    log( "SoundCloud's own download button was not found" );
                                                    dlInfoButton.addClass("mdb-dlInfo-failed")
                                                                .attr( "title", "SoundCloud's own download button could not be found - please use it directly" );
                                                });
                                            });
                                        }
                                    } else {
                                        $(".sc-button-more", jNode).html('<span class="mdb-fakeDlButton">DL</span>');
                                    }
                                }

                                // buy/purchase link
                                // The old layout offered it as .soundActions__purchaseLink in the DOM, the
                                // new one hides it away - take it from the API response instead.
                                // The link IS the button, it is not an <a> inside a <button>: SoundCloud's
                                // own .sc-button rule (which soundActionFakeButtonClass pulls in for the
                                // look) sets pointer-events: none on every child, so a nested anchor never
                                // receives the click - the button swallows it and nothing happens. An <a>
                                // carrying the button classes is what SoundCloud does itself and what we
                                // already do for a.mdb-tidSubmit.sc_button-mdb.
                                if( isNewSoundCloudLayout && purchase_url && $("#mdb-purchaseLink").length === 0 ) {
                                    var purchase_href = /^https?:\/\/gate\.sc\//.test( purchase_url ) ? fixScRedirectUrl( purchase_url ) : purchase_url,
                                        purchase_text = purchase_title ? purchase_title : "Buy";

                                    buttonTarget.append( '<a id="mdb-purchaseLink" class="'+soundActionFakeButtonClass+'" href="'+purchase_href+'" target="_blank">Link: '+purchase_text+'</a>' );
                                }

                                // artwork: link to the original plus its dimensions/file type
                                // goes into the head row (right of the title), not into the button row
                                if( isNewSoundCloudLayout && apiArtworkUrl && $("#mdb-artwork-input-wrapper").length === 0 ) {
                                    append_artwork_trackExtras( $("#mdb-sc-trackHead"), apiArtworkUrl );
                                }

                                // file details
                                // TODO: get bytes from download url
                                if( dur_ms ) {
                                    if( $("#mdb-fileInfo").length === 0 ) {
                                        //var bytes = getBytesSizeFromUrl_api( download_url, scAccessToken );
                                        var bytes = "",
                                            dur_sec = Math.floor(dur_ms/ 1000),
                                            dur = convertHMS( dur_sec ),
                                            // Too short for MixesDB: the file details are the
                                            // wikitext that goes onto a mix page, and this track
                                            // will never get one - so the duration is a plain
                                            // label here and nothing opens under it. The red fill
                                            // says why the toolkit and page creator are missing
                                            // (styled in script.css, cursor included), and the
                                            // tooltip spells it out. Leaving mdb-toggle and
                                            // data-toggleid off is what makes it inert: the click
                                            // handler in global.js binds by that class.
                                            fileInfoClass = soundActionFakeButtonClass + ( tooShortForMixesdb ? ' mdb-fileInfo-tooShort' : ' mdb-toggle' ),
                                            fileInfoToggle = tooShortForMixesdb ? '' : ' data-toggleid="mdb-fileDetails"',
                                            fileInfoTitle = tooShortForMixesdb
                                                ? 'Too short for MixesDB (under 20:00), so no toolkit, no page creator and no file details for this track.'
                                                : 'Click to copy file details';

                                        if( isNewSoundCloudLayout ) {
                                            buttonTarget.append('<button id="mdb-fileInfo" class="'+fileInfoClass+'"'+fileInfoToggle+' title="'+fileInfoTitle+'">'+dur+'</button>');
                                        } else {
                                            soundActions.after('<button id="mdb-fileInfo" class="'+fileInfoClass+'"'+fileInfoToggle+' title="'+fileInfoTitle+'">'+dur+'</button>');
                                        }

                                        // no box for a track that is too short - it would only
                                        // ever hold file details nobody can use
                                        if( !tooShortForMixesdb ) {
                                            $("#mdb-toggle-target").append( getFileDetails_forToggle( dur_sec, bytes ) );
                                        }
                                    }
                                }

                                // apiText-toggleButton
                                //log($("#apiText-toggleButton").length);
                                if( $("#apiText-toggleButton").length === 0 ) {
                                    // remove artwork_url
                                    // add modified artwork url for -original.ext
                                    // tracks without an artwork return null here
                                    var artwork_url = t.artwork_url,
                                        artwork_url_original_try = artwork_url ? artwork_url.replace("-large.", "-original.") : "";
                                    delete t["artwork_url"];

                                    // move description to end of t array
                                    var description = t.description;
                                    delete t["description"];
                                    t["description"] = description;

                                    // move user to end of t array
                                    var user = t.user;
                                    delete t["user"];
                                    t["user"] = user;

                                    // build new re-ordered t_new array
                                    // artwork urls on top
                                    var t_new = { "artwork_url_original (try)" : artwork_url_original_try };
                                    t_new["artwork_url"] = artwork_url;
                                    // add remaining t values
                                    $.each( t, function(key, value) {
                                        t_new[key] = value;
                                    });

                                    // prepare apiText for toggle output
                                    var apiText = textify( JSON.stringify( t_new, null, "\t" ) ),
                                        apiTextLinkified = linkify( apiText );
                                    //logVar( "apiText", apiText );

                                    if( isNewSoundCloudLayout ) {
                                        buttonTarget.append( '<button id="apiText-toggleButton" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="apiText">API</button>' );
                                    } else {
                                        soundActions.append( '<button id="apiText-toggleButton" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="apiText">API</button>' );
                                    }
                                    $("#mdb-toggle-target").append('<div id="apiText" style="display:none">'+apiTextLinkified+'</div>');
                                }
                            } else {
                                // /resolve normally answers with the resource itself. If it ever
                                // hands back a { status, location } pointer instead, kind is
                                // undefined and everything above silently does nothing - which
                                // is the one failure mode of switching to it, so it says so.
                                log( "The API answered, but not with a track (kind: " + kind + ")" +
                                     ( t && t.location ? " - it returned a pointer to " + t.location + " instead." : "." ) );
                                addApiErrorNote( "no track in the API answer" );
                            }
                        },
                        error: function() {
                            log( "No track or no API!" );
                            addApiErrorNote( "unknown error" );

                            // no duration to gate on - release the parked toolkit call, but
                            // only if the reader is still on the page this answer was for
                            if( mdbIsCurrentPage( pageGeneration ) ) {
                                toolkitDurationGate_resolve( 0 );
                            }
                        }
                    });
                } else {
                    addApiErrorNote( "no access token" );
                    toolkitDurationGate_resolve( 0 ); // no duration to gate on - release the parked toolkit call
                }
            });
        }
    } else {
        // RUN_sc_button_group flips true->false once per successful build, but the Track header
        // handler below resets it back to true whenever it has to recreate #mdb-sc-trackExtras
        // from scratch (SoundCloud's own React re-render wipes the old node). So this branch is
        // expected/harmless UNLESS it fires right after a recreation - that would mean the reset
        // didn't happen and the buttons/dates/API toggle are stuck missing again.
        log( "sc-button-group/#mdb-sc-trackExtras matched again but RUN_sc_button_group is false - " +
             "buttons/dates/API toggle will NOT be (re)built this time (expected: already built for " +
             "the current wrapper instance)." );
    }
});

/*
 * Re-order added soundActsions buttons (async)
 */
// TID submit to the end
waitForKeyElements(".soundActions a.mdb-tidSubmit.sc_button-mdb:not(.moved)", function( jNode ) {
    jNode.addClass("moved").appendTo( $(".soundActions") );
});

/*
 * trackHeader
 */
// Add header from API call
// Add here instead of after API call for less flashing
waitForKeyElements(".l-listen-hero", function( jNode ) {
    log( "Old layout: .l-listen-hero found - adding #mdb-trackHeader before it." );
    var trackHeader = '<div id="mdb-trackHeader"></div>';
    jNode.before( trackHeader );
});

// New Material "Track header" layout (since ~Aug 2026 redesign)
// API/file-details buttons + toolkit go into a dedicated wrapper below the box,
// since the new box has no room for extra buttons and its layout is not ours to change.
// SC renders the track header twice (responsive mobile/desktop variants), only the :visible one matters.
//
// This is the ONLY handler allowed to watch the Track header section: waitForKeyElements keeps
// its "alreadyFound" state in a single jQuery data key per element, so a second handler on the
// same element would never get called. Everything else for this layout therefore hangs off
// #mdb-sc-trackExtras - including the toolkit, which is kicked off right here.
// No ":not(.mdb-processed-trackheader)" guard and no permanent "done" marker here on purpose:
// #mdb-sc-trackExtras is a plain DOM sibling React knows nothing about, and SC's app wipes it
// whenever an ancestor of the Track header section re-renders - e.g. when the description
// below gets expanded/collapsed, which changes the page layout height. A one-shot guard would
// leave the toolkit gone for good the first time that happens, so this keeps re-checking
// forever (return true) and recreates the wrapper whenever it goes missing.
// Diagnostic only (does not change behaviour): proves/times whether #mdb-sc-trackExtras is
// really getting wiped by SoundCloud's own re-render, as opposed to never having been created
// in the first place. Logged distinctly from a first-time creation below.
var trackExtrasEverCreated = false;
var trackExtrasRemovalObserver = null;

function watchTrackExtrasForRemoval( node ) {
    if( trackExtrasRemovalObserver ) {
        trackExtrasRemovalObserver.disconnect();
        trackExtrasRemovalObserver = null;
    }

    var parent = node && node.parentNode;
    if( !parent ) {
        log( "watchTrackExtrasForRemoval: #mdb-sc-trackExtras has no parentNode - cannot observe removal." );
        return;
    }

    trackExtrasRemovalObserver = new MutationObserver(function() {
        if( !document.contains(node) ) {
            log( "#mdb-sc-trackExtras was REMOVED from the DOM after creation (most likely SoundCloud's own " +
                 "React re-render wiping it, not our code - we never remove it ourselves). The Track header " +
                 "handler recreates it and resets RUN_sc_button_group so the content gets rebuilt too." );
            trackExtrasRemovalObserver.disconnect();
            trackExtrasRemovalObserver = null;
        }
    });
    trackExtrasRemovalObserver.observe( parent, { childList: true } );
}

// This handler intentionally polls forever (see "return true" below), and it is invoked once
// per poll for BOTH the visible Track header and its permanently-hidden responsive duplicate -
// so logging on every call floods the console within seconds and buries the one log line that
// actually matters (a state change). trackHeaderLastLoggedState dedupes: only log when the
// observable state (visible vs not, #mdb-sc-trackExtras present vs not) actually changes.
var trackHeaderLastLoggedState = null;

// SoundCloud serves this section with aria-label either "Track header" (space) or
// "Track-Header" (hyphen, capital H) depending on account/rollout bucket - confirmed by
// having a reporter's browser reach directly into its own webi iframe and report back
// the literal attribute value, after an exact-string match against "Track header" alone
// left his session completely silent (no elements, no error) while ours matched fine.
// The case-insensitive "i" flag additionally guards against further capitalization
// variants of either form.
waitForKeyElements('section[aria-label="Track header" i], section[aria-label="Track-Header" i]', function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        // filtering by :visible in the selector itself is untested with an attribute selector
        // in this codebase - check it as a separate runtime condition instead (proven pattern).
        // The hidden responsive duplicate polls forever too but is never worth logging.
        if( !jNode.is(':visible') ) {
            return true;
        }

        var trackExtrasExists = $("#mdb-sc-trackExtras").length !== 0,
            state = trackExtrasExists ? "present" : "missing";

        if( state !== trackHeaderLastLoggedState ) {
            log( "Track header handler: #mdb-sc-trackExtras is now " + state + " (urlPath(2): " + urlPath(2) + ")." );
            trackHeaderLastLoggedState = state;
        }

        if( !trackExtrasExists ) {
            if( trackExtrasEverCreated ) {
                log( "#mdb-sc-trackExtras missing AGAIN - it existed before and was removed. RECREATING the wrapper now, and resetting RUN_sc_button_group so its content gets rebuilt too (see below)." );

                // The wrapper being recreated means SoundCloud's React re-render wiped the old
                // DOM node entirely - the new #mdb-sc-trackExtras is empty, so the one-shot
                // RUN_sc_button_group guard (further up this file) must be allowed to fire once
                // more for it, otherwise the buttons/dates/API toggle never come back (this was
                // the actual bug: the guard used to stay false forever after the first build).
                RUN_sc_button_group = true;
            } else {
                log( "#mdb-sc-trackExtras missing - creating buttons/toolkit wrapper now (first time)." );
            }
            trackExtrasEverCreated = true;

            // #mdb-sc-trackHead is the row that holds the title (left) and the artwork info bar
            // (right, below the artwork of the Track header box) - see script.css.
            // #mdb-sc-trackButtons keeps the buttons above #mdb-toggle-target - appending them to
            // the wrapper itself would push them below whatever an expanded toggle prints out
            jNode.after( '<div id="mdb-sc-trackExtras"><div id="mdb-sc-trackHead"><div id="mdb-trackHeader"></div></div><div id="mdb-sc-trackButtons"></div><div id="mdb-toggle-target"></div></div>' );

            logVar( "#mdb-sc-trackExtras created, now in DOM", $("#mdb-sc-trackExtras").length !== 0 );

            watchTrackExtrasForRemoval( $("#mdb-sc-trackExtras").get(0) );

            // Everything async that lands in this wrapper (buttons/dates from the SC API,
            // the toolkit's MixesDB verdict, the page creator row, the tracklist box) used
            // to pop in piece by piece. Cover the build-up with the pulsing grey skeleton
            // instead and swap it out in one step - see mdbSkeleton_* in
            // shared/page_creator/page_creator.js.
            mdbSkeleton_show({
                target: "#mdb-sc-trackExtras",
                rows:   [ "head", "dates", "buttons", "toolkit" ],
                extraReady: function() {
                    // buttons built from the API answer, or the API failure note (a direct
                    // wrapper child) - either way the SC API side is done
                    return $("#mdb-sc-trackButtons").children().length !== 0
                           || $("#mdb-sc-trackExtras").children("p.mdb-warning").length !== 0;
                }
            });

            // toolkit goes full-width at the very end of the wrapper (below buttons and toggle
            // target), instead of being squeezed into the old sidebar column.
            // Not called directly: the call is parked in the duration gate and only released
            // once the SC API answer above says the track is long enough for MixesDB.
            log( "Requesting toolkit for #mdb-sc-trackExtras (parked until the SC API names the duration)." );
            toolkitDurationGate_request(function() {
                log( "Calling getToolkit() for #mdb-sc-trackExtras." );
                // the wrapper is looked up at fire time: the parked call can outlive the node
                // it was registered for (React wipe), and this handler re-requests for the new one
                getToolkit( getScPlayerUrl(), "playerUrl", "detail page", $("#mdb-sc-trackExtras"), "append", jNode.find("h1").first().text(), "", 1, getScPlayerUrl() );

                // the page creator row is gated behind that toolkit's usage verdict
                mdbPageCreator_watchToolkit();
            });
        }
    } else if( trackHeaderLastLoggedState !== "not-track-page" ) {
        log( "Not a track detail page (urlPath(2): '" + urlPath(2) + "') - skipping trackExtras wrapper." );
        trackHeaderLastLoggedState = "not-track-page";
    }

    // must return true (not just bail) - waitForKeyElements marks a node "alreadyFound" and
    // stops calling back on it forever unless the callback returns a truthy "keep watching" value
    return true;
});

/*
 * Force full description
 * The old layout was handled by CSS (.truncatedAudioInfo__wrapper), but the new one
 * collapses the description via React state, so the "Show more" button has to be
 * clicked. Its class names are generated (mui-*) and useless as a selector, so match
 * it by its exact label - "Show more comments" and friends must not be clicked.
 *
 * The label is UI text, not an aria-label, so unlike "Track header" it IS translated by
 * SoundCloud's own i18n - a German-locale account renders "Mehr anzeigen"/"Weniger
 * anzeigen" instead of "Show more"/"Show less". A reporter on German Windows saw the
 * description never auto-expand; their screenshot showed the untranslated button text,
 * confirming the exact-English-string match was the cause. Both label lists below need a
 * new entry for every additional locale MixesDB wants supported.
 */
var showMoreLabels = [ "Show more", "Mehr anzeigen" ];
var showLessLabels = [ "Show less", "Weniger anzeigen" ];
var descriptionExpandedOnce = false;

if( isWebiFrame ) {
    // One click attempt is not enough: the button ships in the server-rendered HTML of the
    // frame, so a click that lands before React has hydrated it is swallowed without effect -
    // and the old ":not(.mdb-processed-showMore)" selector made sure we never came back to it.
    // Keep the node in waitForKeyElements' watch list instead (callback returns true) and click
    // again on every poll. Once the description is expanded the label turns into "Show less",
    // the selector stops matching and the retries end on their own; the counter is only the
    // safety net for the case where clicking never takes effect at all.
    const showMoreMaxClicks = 20;

    // Force-expand only the FIRST time the description shows up collapsed. Without this flag,
    // a user who manually clicks "Show less" afterwards gets fought forever: the button's label
    // flips back to "Show more", the selector below matches it again, and per-node state (the
    // click counter/class) is no help - React swaps in a fresh button element on every toggle,
    // so each re-collapse looks like a brand-new, never-clicked button to us.
    // "First time" means per track, not per browser tab: runSoundcloudPage() at the bottom of
    // this file puts it back to false whenever SoundCloud swaps in another track, whose
    // description arrives collapsed again. Hence declared outside this block.

    // Confirms the expand actually took effect (not just that we clicked). Once SC ever shows
    // "Show less"/"Weniger anzeigen", the description has been opened for this page view -
    // after that, leave the user free to collapse/expand at will.
    var showLessSelector = showLessLabels.map(function( label ) {
        return 'button:contains("' + label + '")';
    }).join(", ");

    waitForKeyElements( showLessSelector, function() {
        descriptionExpandedOnce = true;
        return false;
    });

    var showMoreSelector = showMoreLabels.map(function( label ) {
        return 'button:contains("' + label + '")';
    }).join(", ");

    waitForKeyElements( showMoreSelector, function( jNode ) {
        if( descriptionExpandedOnce ) {
            return false;
        }

        // "Show more comments"/"Mehr anzeigen" (of comments) and friends must not be
        // clicked - drop those nodes for good unless the label is an exact match
        if( showMoreLabels.indexOf( jNode.text().trim() ) === -1 ) {
            return false;
        }

        // not rendered yet - do not give up on it, it is the description button
        if( !jNode.is(':visible') ) {
            return true;
        }

        const clicks = ( jNode.data("mdbShowMoreClicks") || 0 ) + 1;

        if( clicks > showMoreMaxClicks ) {
            log( "Giving up on expanding the truncated description after " + showMoreMaxClicks + " clicks" );
            return false;
        }

        jNode.data("mdbShowMoreClicks", clicks).addClass("mdb-processed-showMore");

        log( "Expanding the truncated description, click " + clicks );
        jNode.get(0).click();

        return true;
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 *
 * .listen-about .listenDetails > for premium account layout (?), e.g. https://soundcloud.com/grabthegroove/gtg-pdcst-046-pyramidal-decode
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "Registering handlers: Toolkit (old layout)" );

// The new layout fires its own getToolkit() from the Track header handler above - see the note
// there on why it must not add a second watcher on that section.
waitForKeyElements('.l-listen__mainContent .listenDetails__partialInfo:not(.mdb-processed-toolkit), .listen-about .listenDetails:not(.mdb-processed-toolkit)', function( jNode ) {
    log( "Old layout toolkit handler fired (.listenDetails__partialInfo / .listenDetails). urlPath(2): " + urlPath(2) );

    if( urlPath(2) && urlPath(2) != "sets" ) {
        jNode.addClass("mdb-processed-toolkit");

        //var titleText = $('meta[property="og:title"]').text();
        var titleText = $("h1.soundTitle__title").text();
        logVar( "titleText", titleText );

        // Parked in the duration gate, not called directly - released once the SC API answer
        // (fetched by the sc-button-group handler) says the track is long enough for MixesDB.
        log( "Requesting toolkit for old layout .listenDetails (parked until the SC API names the duration)." );
        toolkitDurationGate_request(function() {
            log( "Calling getToolkit() for old layout .listenDetails." );
            getToolkit( getScPlayerUrl(), "playerUrl", "detail page", jNode, "before", titleText, "", 1, getScPlayerUrl() );

            // the page creator row is gated behind that toolkit's usage verdict
            mdbPageCreator_watchToolkit();
        });
    } else {
        log( "Not a track detail page - skipping old layout toolkit." );
    }
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * SPA navigation
 *
 * Registered last, because it resets state that is declared all over this file.
 *
 * Both frames install it, unlike the reload it replaces: the reload was a top-frame job
 * because only the top frame owns the address bar, but the DOM work now happens where the
 * DOM is - and on new-layout track pages that is the webi frame. The frame that does not own
 * the address bar reads it from the top frame via getUrl below.
 *
 * The waitForKeyElements handlers above are NOT re-registered here: they poll for the
 * lifetime of the document and onUrlChange() re-arms them - see global.js.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function runSoundcloudPage() {
    logFunc( "runSoundcloudPage" );

    // All read off the URL, so the previous page's answers are worthless
    readHideOptions();

    // One-shot guards whose "shot" was fired for the previous track. onUrlChange() has just
    // removed the elements they were guarding, so they have to go back to their starting
    // value along with them, or the new track gets no buttons and no toolkit at all.
    RUN_sc_button_group = true;
    trackHeaderLastLoggedState = null;
    descriptionExpandedOnce = false;

    // The parked toolkit call and the duration both describe the previous track.
    toolkitDurationGate_reset();

    // Same fixed checkpoints as at script start - see the diagnostics section above for why
    // this is unconditional rather than triggered by a handler.
    if( urlPath(2) && urlPath(2) != "sets" ) {
        runTrackPageDiagnostics( "after SPA navigation" );

        [ 3000, 8000 ].forEach(function( delay ) {
            setTimeout(function() {
                runTrackPageDiagnostics( delay + "ms after SPA navigation" );
            }, delay );
        });
    }
}

onUrlChange( runSoundcloudPage, {
    // pageLocation is window.top.location in the webi frame, i.e. the address bar - the
    // frame's own location.href is a /n/... URL that does not change per track.
    getUrl: function() {
        return pageLocation.href;
    }
});

log( "script.user.js IIFE finished - all handlers registered." );

})();

/*
 * Changelog
 *
 * 2026.08.17.3
 * The shared chunk split (mdbTitle_titleChunks, title_builder.js v_26) now removes what the
 * parse removes: a bracket crediting the artist's labels ("Tooker (SONARA / Crosstown
 * Rebels)") and a place list saying where the artist is from. Those names showed up as
 * chunks and were sent to the mdbnames lookup although the parse had already dropped them -
 * asking the wiki about a record label wasted the request. The reasoning panel
 * (page_creator.js v_25, page_creator.css) shows them in red on a "Removed:" line
 * with the reason spelled out, so a reporter sees the drop was on purpose. The description
 * (the labels a tracklist credits) now reaches the split too, so a credited label in a
 * bracket is no lookup candidate either.
 * The panel's "Fixed and cleaned" section also names the channel -> show mappings, whose
 * work was invisible (nothing in the title text changes): a channel on the known-shows list
 * (mdbTitleUsernameConversions) as "Resident Advisor -> RA Podcast", and a show the channel
 * and the title name together (mdbTitleChannelSeriesConversions) as '"DJ MIX" on the channel
 * Dance TV -> Dance TV DJ Mix'.
 * The removed chips lost their strikethrough (red alone says it), the cleanup section no
 * longer repeats what that "Removed:" line already names, and the channel -> show mapping
 * steps draw the mapping as chips: the channel in the blue of the chunk section's channel
 * chip, the show it became in green.
 *
 * 2026.08.16.15
 * The "Report" box got a reasoning panel above the textarea (shared/page_creator/:
 * page_creator.js v_24, title_builder.js v_23, page_creator.css): four sections showing the
 * chunks the player title split into, what the cleanup fixed and removed (typos, decoration,
 * label credits, the date), which names were looked up via action=mdbnames and what the wiki
 * knows them as, and the categories the created page would be filed under - each annotated
 * from the lookup cache (known artist with mix count vs. "no category of this name yet").
 * The chunks are THE shared split (mdbTitle_titleChunks): typos/decoration out first,
 * brackets read as separators and the parser's guarded series-"by" split included - so
 * "Guestroom 779 by Sascha Sibler" shows (and looks up) both halves, and a venue in
 * brackets becomes a candidate the second build pass can recognise.
 * Editing the title re-renders the panel after a short pause and looks the new names up
 * first (cache-aware, one request at most). Dark surface like the loading skeleton (both
 * sites are dark-themed; grey-on-white was hard to read next to them), one accent colour
 * per section, semantic tones on the notes (green = confirmed, amber = check this, red =
 * request died). Opened before every lookup answered, the panel shows pulsing stand-in
 * rows of its own and swaps to the real content once everything is in.
 *
 * 2026.08.16.7
 * The red duration of a too-short track is a plain label now, not a button: short tracks are
 * never used on MixesDB, so the file details it used to open are wikitext nobody can use.
 * mdb-toggle/data-toggleid stay off it (the click handler in global.js binds by that class),
 * the file details block is not built at all, the tooltip only explains the red, and the
 * cursor and hover styles stop promising a click (script.css).
 *
 * 2026.08.16.6
 * A track under MixesDB's 20 min minimum no longer loads the toolkit at all - its MixesDB
 * usage check could only ever answer "not used", so that request is saved along with the
 * page creator row and the tracklist box, which were already refused for such tracks. The
 * duration comes out of the ONE SC API answer the buttons are built from (new "Toolkit
 * duration gate" section: getToolkit() is parked and released - or dropped - by that
 * answer; no second SC API call). The red #mdb-fileInfo duration button (light red fill,
 * MUI error text color, explaining tooltip) is what tells the reader the missing pieces
 * are intended, not broken. A dead SC API cannot take the toolkit down with it: a parked
 * call is released ungated after 10s, and an answer without a usable duration releases
 * right away - only a positively known short duration drops the toolkit. The loading
 * skeleton is told no toolkit verdict is coming (new mdbSkeleton_noToolkit() in
 * page_creator.js v_23), so it reveals on the settle window instead of its 6s cap.
 *
 * 2026.08.16.4
 * The loading skeleton moved to shared/page_creator/ (mdbSkeleton_* in page_creator.js,
 * styles in page_creator.css) so TrackId.net gets it too: scSkeleton_* left script.funcs.js
 * and the skeleton CSS left script.css. This script now passes its specifics to
 * mdbSkeleton_show(): the wrapper selector, the stand-in rows (head/dates/buttons/toolkit)
 * and an extraReady() check for the SC API side (buttons built, or the failure note).
 * Behaviour on SoundCloud is unchanged, including the tuned 230px height (now the shared
 * default); the debug flag was renamed window.scSkeleton_enabled ->
 * window.mdbSkeleton_enabled.
 *
 * 2026.08.16.3
 * Skeleton follow-ups. Fixed 320px height instead of the stand-ins' natural height, which
 * rendered clearly taller than the typical content: 320px is the height of a page WITHOUT
 * a tracklist box (most descriptions hold none), so the tracklist stand-in is gone - a page
 * that does get one grows in the one reveal step. Flex column, the fixed rows keep their
 * size and the toolkit stand-in absorbs the remainder, so nothing is clipped mid-bar.
 * New window.scSkeleton_enabled option in the debug settings block (default true): with it
 * off the pieces pop in one by one as before, but the readiness watch still runs, and the
 * "everything loaded Xms after the wrapper was created" log line is written with identical
 * wording in both modes, so skeleton on/off can be compared log against log.
 *
 * 2026.08.16.2
 * New-layout track pages no longer build up piece by piece ("very flashy"): the moment
 * #mdb-sc-trackExtras is created it shows a dark grey skeleton - pulsing bars shaped like
 * the content to come (headline, artwork bar, dates, button pills, toolkit, tracklist box) -
 * while the real elements assemble hidden underneath (display:none is safe there: the one
 * thing that measures itself, the tracklist textarea, sizes via its rows attribute counted
 * from the text). One reveal swaps skeleton for content: SC API buttons and the toolkit
 * verdict present plus 600ms of wrapper quiet - which lets the page creator row and a
 * description tracklist slip in - or a 6s cap that shows whatever arrived. The API failure
 * note counts as the API being done, so a dead API does not hold the page; a
 * comments-fetched tracklist may still pop in after the reveal (rare, sits at the bottom).
 * Re-shows when SoundCloud's React wipes the wrapper and the Track header handler recreates
 * it. scSkeleton_* in script.funcs.js, styles in script.css; old layout untouched.
 *
 * 2026.08.15.6
 * formatScDate() and scArtworkOriginalUrl() moved from script.funcs.js to api_funcs.js:
 * TrackId.net now feeds the page creator from the SC track API on its audiostream pages and
 * needs both, and api_funcs.js is the file every script reading the SC API already @requires
 * (RA, 1001 Tracklists, Player Checker) - pulling in script.funcs.js instead would have
 * dragged this page's DOM handlers along. No behaviour change on SoundCloud; formatScDate()
 * additionally survives a null release_date now, where the old typeof check only caught
 * undefined and null.replace() would have taken the whole API success handler down.
 *
 * 2026.08.15.4
 * soulheavenrecords/soul-heaven-presents-004-natasha-kitty-katt holds TWO tracklists - the
 * resident's hour under "First Hour - Ollie Blackmore:" and the guest's under "Guest Mix -
 * Natasha Kitty Katt" - and the detector took the first and silently dropped the second.
 * MixesDB writes such a mix as chapters (Help:Tracklists#Chapters), and the detector now does
 * too: when more than one run passes and every one has a headline above it, all of them are
 * taken, each block under a ";Chapter" line with a blank line between the blocks. The headline
 * is stripped down to the name the chapter is filed under - "Guest Mix" / "Hour 1" / "First
 * Hour" prefixes and a trailing ":" go, in whatever mixture of blanks, "-" and ":" they were
 * typed - and a headline glued straight onto its tracks (no blank line, so "Hour 1 - DJ A:"
 * even reads as a track line and joins the run) is peeled off the front when the rest still
 * passes on its own. All or nothing: a run without a headline, a bare "Tracklist:" heading or
 * runs that disagree on being numbered mean no chapters and the longest run wins as before.
 * The Tracklist Editor API keeps the ";" lines and numbers each chapter's tracks on their own -
 * verified against it. 22 detector examples now, all passing.
 *
 * 2026.08.13.13
 * The tracklist of whose-these-records/whose-these-cast-02-by-mar-1 came back orange with "These
 * tracks seem to miss the artist names" listing every track: its uploader splits artist and title
 * with an EN dash, and the Tracklist Editor API reads the hyphen and the em dash but not that one,
 * so each line arrived as one nameless track carrying the whole line as its artist. Not the
 * "standard" type going missing - that is what has always been passed, here as everywhere else.
 * The detector now writes the separator as " - " before the API sees it, whatever dash and
 * whatever spacing it was typed with ("Artist –Title", "Artist -- Title"), the same answer the
 * slash of .10 got and for the same reason: the API knows one separator.
 * Only the FIRST separator of a line moves - a dash further right is part of the title - and the
 * numbering and a leading cue are skipped over, so a "12 – Artist – Title" is split by the second
 * dash and not by the one that numbers it. 20 detector examples now, all passing.
 *
 * 2026.08.13.10
 * "No tracklist detected" on anjaschneider/clubroom-431-with-anja: the uploader splits artist and
 * title with a SLASH ("Ackermann / Pure"), and the detector only ever knew the dash - so not one
 * line of that block read as a track and no run formed at all. A slash counts as a separator now,
 * with "//", "\" and "\\" as the same thing, and the block is rewritten to " - " before the
 * Tracklist Editor API sees it: the API knows no other separator and would take such a line for
 * one nameless track carrying the whole line as its artist.
 * A slash needs a space on BOTH sides to count, where the dash needs only one - it lives inside
 * words and addresses all day long ("AC/DC", "w/", "music.beepd.co/card/anjaschneider"), and a
 * one-sided rule would read half the prose of a description as a track line.
 * Only the FIRST separator on a line splits it, so "traKKman / Jack 2 The Groove - Sound Factory
 * Bar mix" keeps the dash in its title, and only a block that is MOSTLY slash lines is rewritten:
 * a lone "Artist / Other Artist - Title" among dashes is a collaboration, not a separator.
 * 19 detector examples now, all passing.
 *
 * 2026.08.10.17
 * ROOT CAUSE FOUND for "no tracklist detected" on sultanshepard/dialekt-radio-339: the uploader
 * wrote every track as its own paragraph, so the description holds a BLANK LINE between every
 * pair of tracks - and a blank line ended a run, which left twelve runs of one line each and no
 * tracklist. Blank lines no longer end a run by themselves: they end it unless the numbering
 * steps over them ("11." followed by "12." is one list however many blank lines sit between).
 * That the number has to go UP is what keeps the old case working - in the Hard Times
 * description a "6 Decks - 2 Mixers" line sits one blank line above a tracklist starting at
 * "01.", and 1 does not follow 6, so that blank still ends the run. Unnumbered tracklists are
 * unaffected: without numbering there is nothing to step over, so a blank always ends the run
 * there, which is what keeps the social links under a description out of it.
 * The same track page writes its cues BEHIND the track ("Artist - Title 00:52:09"), two of them
 * with a chapter name hung off the cue. Sent as-is, the Tracklist Editor keeps the timestamp
 * glued to the title and turns "- CLASSIC OF THE WEEK" into a label of its own, so the block is
 * now tidied first: the cue moves in front, where MixesDB writes cues, and what trailed it
 * becomes a bold note in front of the artist -
 * "[00:56:00] '''CLASSIC OF THE WEEK:''' Dennis Ferrer & Jerome Sydenham - Sandcastles (...)".
 * Only done when at least half the lines of the block carry such a cue: one title ending in
 * something clock-shaped ("Sandcastles 9:11") is not a pattern, and rewriting it would invent a
 * timestamp nobody wrote.
 * 16 detector examples now, all passing.
 *
 * 2026.08.10.13
 * The tracklist box is now behind a headline that toggles it, and it is no longer built at all
 * until there is a reason to. Detecting a tracklist is free (a regex over text we already have);
 * formatting it costs a request to the Tracklist Editor API. So on a mix that is ALREADY on
 * MixesDB the API is not asked at all - only the headline goes up, and the first click on it
 * pays for the box; every click after that just shows and hides it. Nothing on such a page needs
 * the tracklist by itself (it is there to be compared with the one the wiki has), and most of
 * those clicks never happen. A mix with no page yet is unchanged: the box is what the "Create"
 * link carries, so it is formatted and opened right away. That decision needs the toolkit's
 * verdict, which arrives after the toolkit itself, so the creator now waits for both - and makes
 * the decision once, so a SoundCloud re-render cannot force a box the reader closed back open.
 * The headline is "Tracklist (from description)" in grey: the word alone is the <strong> and the
 * toggle (pointer, caret), the bracket alone is an <abbr> carrying the "where this came from"
 * tooltip. A tooltip on the word would have fought the click.
 * New detector example, deep-space-helsinki/july_2026: labels written behind the title with the
 * SAME " - " that separates the artist, so every line carries two dashes and none of them is the
 * one that matters. It passed unchanged - 15 examples now, all passing.
 *
 * 2026.08.10.12
 * Three fixes to the tracklist box of .11, all reported off the live page:
 * ROOT CAUSE FOUND for "the textarea floats over the page": fixTLbox() marked a finished box
 * with a class named plainly "fixed", and SoundCloud's Material layout ships utility CSS where
 * .fixed means "position: fixed" - so the box left the flow and was laid over the description.
 * The Lot Radio had hit the same collision and worked around it locally (its
 * keepTheLotRadioTextareaInFlow()); this fixes it at the source, where the class is now
 * "mdb-tlBox-fixed" like every other class we add. page_creator.css states "position: static
 * !important" on the box on top of that, since it sits in markup we do not own on every site.
 * The box now goes BELOW the toolkit instead of above it - after #mdb-toolkit, which is above
 * the description in both layouts. The toolkit arrives from a MixesDB API call of its own, so
 * the creator polls for it rather than expecting it to be there when the tracklist is.
 * The feedback box got its colour flattened to one grey: page_creator.css set a colour on
 * "#mdb-pageCreator-tracklist #tlEditor-feedback", and two IDs beat the one ID and one class of
 * tracklistEditor_copy.css' ".tlEditor-feedback-complete #tlEditor-feedback" - so green for
 * complete, orange for incomplete and red for a warning all lost to it. That colour IS the
 * message; the rule states no colour at all now.
 * The headline is plain "Tracklist" again and only says where it came from when that is the
 * surprising answer ("Tracklist (from a comment)") - naming the description on every track is
 * noise that drowns out the one case worth a second look.
 *
 * 2026.08.10.11
 * The tracklist an uploader wrote into the description is no longer retyped by hand: it is
 * found, formatted and carried into the created mix page. New
 * shared/page_creator/tracklist_detector.js reads a tracklist out of any description text
 * (pure text in, text out - no DOM, no network, so it is testable and every site script can use
 * it), MixesDB's Tracklist Editor API turns it into wiki syntax with type "standard", and it
 * lands in the shared #tlEditor box above SoundCloud's description. What is in that box at the
 * moment "Create" is clicked is what goes onto the page - the box is asked of the API once more
 * on the way into the click, and only the FEEDBACK of that answer is used (the colour and the
 * [[Category:Tracklist: complete|incomplete|none]]); the text stays the editor's.
 * A tracklist is recognized as a RUN of neighbouring lines rather than as single lines that
 * look like a track - "6 Decks - 2 Mixers" is everywhere, four of them in a row are not - and
 * numbered runs additionally have to count upwards, which is what keeps a stray line sitting on
 * top of a tracklist out of it. When the description has none, the track's comments are fetched
 * (getScTrackComments(), one page of 200) and searched for a WHOLE numbered tracklist starting
 * at 1: single track IDs, which is what nearly every comment naming an "Artist - Title" is,
 * must never be taken. 14 examples in tracklist_examples.js guard all of it, run with
 * "deno run --allow-read shared/page_creator/tracklist_examples_test.js".
 * global.js: fixTLbox() takes a third argument to skip the select() - a box that appears on its
 * own next to a player must not take the caret and scroll the page to itself - and no longer
 * stacks a second feedback box when it is re-run; apiTracklist() returns an empty result
 * instead of throwing when the API answers with something that is not JSON (an empty tracklist
 * answers with an empty body).
 *
 * 2026.08.10.10
 * The mix page title row is now the shared "MixesDB page creator" in
 * shared/page_creator/ - renamed after the "Create" link, since the title has long stopped
 * being all it hands to the wiki (file details, {{Player}}, categories, artwork URL). Nothing
 * about it was SoundCloud-specific except where the values come from, so it moved out whole:
 * title_definitions.js (the word lists, its sc* globals renamed to mdbTitle*),
 * title_builder.js (buildMixesdbTitle() and the mdbTitle_* parser, lifted out of
 * script.funcs.js), page_creator.js (the row, mdbPageCreator_*) and page_creator.css (lifted
 * out of script.css). The ids went with it: #mdb-mixesdbTitle-wrapper -> #mdb-pageCreator and
 * so on, and window.mdbTitle_showForUsedPlayers -> window.mdbPageCreator_showForUsedPlayers.
 * A site script now hands over one object - title, channel, createdAt and where to put the row
 * - and keeps its own quirks on its own side (this file applies scArtworkOriginalUrl() before
 * passing the artwork URL along). target is given as a SELECTOR STRING so it survives
 * SoundCloud's re-renders, which a captured node would not. Behaviour is unchanged; all 47
 * title examples still pass.
 *
 * 2026.08.09.4
 * Extends .1 to EVERY copy button behind an input, not just the ones holding a URL - the
 * button behind the created MixesDB title dragged nothing at all. All of them are now an <a>
 * (draggable="true" plus a dragstart that writes the input's current value), and only a URL
 * additionally gets an href, so a title drags as plain text while a URL still drags as a
 * link. <button> cannot do this job: it is a form control, and Firefox refuses to start a
 * drag on those whatever draggable says - it would have looked fine in Chrome and silently
 * done nothing for Firefox users. The hrefless <a> gets role="button", tabindex="0" and
 * Enter/Space handling, since an <a> without href is neither focusable nor key-activatable.
 * Copy sources that are not inputs (RA venue/artist names) stay <button>s - their text sits
 * in the page and can be dragged directly.
 *
 * 2026.08.09.2
 * Debugging the title creator meant never seeing what it builds for a player that IS on
 * MixesDB - exactly the cases where the correct title is already known and the suggestion
 * could be judged. New "Debug settings" block at the top of this file with
 * window.mdbTitle_showForUsedPlayers (off by default): with it on, the title row is added
 * for used players too, marked "used" in MixesDB orange and without the "Create" link, which
 * would only start a duplicate page. Everything else is unchanged, including the 20 min
 * minimum duration - a track too short for MixesDB still gets no suggestion.
 *
 * 2026.08.09.1
 * Copy buttons next to URL inputs (artwork URL, toolkit Embed URL) are now real <a href>
 * elements instead of <button>s, so the URL can be dragged out of the page into another
 * window/app - a <button> cannot be dragged at all. A plain click still copies and never
 * navigates; only an explicit modifier click (cmd/ctrl/shift) opens the link. The href and
 * the drag payload are re-read from the input on every interaction, so an edited or
 * rewritten URL (e.g. the artwork extension fix) is always what gets dragged. Inputs whose
 * value is not an http(s) URL - the MixesDB page title input - stay <button>s.
 *
 * 2026.08.08.1
 * ROOT CAUSE FOUND for "description does not auto-expand" report from a German-locale
 * Windows user (worked fine for other testers): the description force-expand matched the
 * "Show more"/"Show less" button by its exact English label text, but SoundCloud
 * translates that visible label per account locale - German renders "Mehr anzeigen"/
 * "Weniger anzeigen" instead. Unlike the "Track header" aria-label (an internal,
 * untranslated attribute - see .15 below), this is real UI copy and IS localized. Added
 * showMoreLabels/showLessLabels arrays and match against either language; see CLAUDE.md
 * for the standing rule this establishes.
 *
 * 2026.08.07.15
 * ROOT CAUSE FOUND for "userscript loads fine, no elements on the new layout" reports:
 * the Track header selector required an exact match against the literal string
 * "Track header", but a reporter's own webi iframe cross-check (added in .14) showed
 * SoundCloud serving "Track-Header" (hyphen, capital H) there instead - a different
 * literal string depending on account/rollout bucket, not a locale or browser issue as
 * earlier suspected. Since #mdb-sc-trackExtras and the entire toolkit are gated behind
 * this one selector via waitForKeyElements, an exact-string mismatch meant total silence:
 * no error, no "not found" log, nothing. Both the diagnostic selector and the real
 * handler now match "Track header" OR "Track-Header", case-insensitively.
 *
 * 2026.08.07.14
 * Added logWebiIframeCrossCheck() and logAuthSignals(), both run from the top frame
 * alongside the existing DOM snapshot at every checkpoint. logWebiIframeCrossCheck
 * bakes in the manual "run this snippet in DevTools" check (find the webi iframe by
 * #__WEBI_IFRAME_PRELOADED__ or iframe[src^="/n/"], read its contentDocument directly)
 * that we kept having to ask a live tester for by hand while chasing a report where the
 * webi frame's own script instance reported 0 matches for everything - now every future
 * log already contains that answer. logAuthSignals logs locale-independent (href/src
 * pattern, not translated button text) signals for logged-in vs logged-out, since that
 * turned out to matter for reproducing this bug and is unreliable to reconstruct after
 * the fact from memory alone.
 *
 * 2026.08.07.8
 * logTrackPageSnapshot now tags each snapshot with "(webi frame)"/"(top frame)".
 * Verified against a known-good macOS/Chrome log: the top frame and webi frame each run
 * their own copy of the diagnostic and log under identical unlabeled text, so every
 * checkpoint appeared twice - only distinguishable by eyeballing which values were
 * non-zero. Fine when everything works, but ambiguous for a broken report (e.g. "webi
 * frame never loaded" vs. "webi frame loaded, selectors just don't match").
 *
 * 2026.08.07.7
 * Added "Track page diagnostics" (logTrackPageSnapshot): an unconditional DOM snapshot
 * of the key track-page selectors (new + old layout), logged at script start, on
 * window 'load', and 3s/8s/15s afterwards. Every existing track-page log line is gated
 * behind a waitForKeyElements match, so a report of "userscript loaded, no elements at
 * all on the new layout" produced zero diagnosable signal. This closes that gap without
 * changing any behaviour.
 */
