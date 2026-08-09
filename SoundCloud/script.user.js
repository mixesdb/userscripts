// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.09.6
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_40
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-SoundCloud_58
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/title_definitions.js?v_9
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_44
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v_3
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
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 74,
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

// Title creator: normally the suggested MixesDB page title is only offered for players that
// are NOT on MixesDB yet - for a used player there is nothing to create, so the row stays
// hidden and the title it would have built cannot be compared with the page that exists.
// With this on, the row is shown for used players too, marked "used" and without the "Create"
// link (which would only start a duplicate page).
window.mdbTitle_showForUsedPlayers = true; // True as default for the beta phase


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
const pageLocation = isWebiFrame ? window.top.location : window.location,
      pagePathname = pageLocation.pathname,
      pageHref = pageLocation.protocol + "//" + pageLocation.host + pagePathname + pageLocation.search;

logVar( "pageLocation source", isWebiFrame ? "window.top.location (address bar)" : "window.location" );
logVar( "pageHref", pageHref );

if( isWebiFrame ) {
    urlPath = function(n) {
        return pageHref.split('/')[n+2];
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
    return pageLocation.protocol + '//' + pageLocation.host + pagePathname;
}


/*
 * Before anythings starts: Reload the page
 * A tiny delay is needed, otherwise there's constant reloading.
 * Only the top frame owns the address bar; hooking history inside the webi frame as
 * well would only fight with the top frame's reload.
 */
if( isTopFrame ) {
    log( "Setting up redirectOnUrlChange (top frame only)." );
    redirectOnUrlChange( 60 );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Constants
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 74,
    scriptName = "SoundCloud";
window.scriptName = scriptName; // toolkit.js reads this global directly
logVar( "scriptName", scriptName );
logVar( "cacheVersion", cacheVersion );

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
    if (isSetsTab || !isHideXedEnabled()) return;

    const slug = getSlugFromSoundItem(soundItem);
    if (slug && isXed(slug)) {
        soundItem.remove();
    }
};

// Note: loadRawCss() (in global.js) does not log success/error itself - if styling ever looks
// broken, check the Network tab for these two URLs, since a failed fetch here fails silently.
logFunc( "Loading CSS" );
var globalCssUrl = githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion,
    scriptCssUrl = githubPath_raw + scriptName + "/script.css?v-" + cacheVersion;
logVar( "globalCssUrl", globalCssUrl );
logVar( "scriptCssUrl", scriptCssUrl );
loadRawCss( globalCssUrl );
loadRawCss( scriptCssUrl );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var scAccessToken;

const fast = 201,
      soundActionFakeButtonClass = 'sc_button-mdb sc-button-secondary sc-button sc-button-medium mdb-item',
      current_url = location.href;

// url parameters
var getHidePl = resolveHideOption("hidePl", hidePlaylistsKey),
    getHideReposts = resolveHideOption("hideReposts", hideRepostsKey),
    getHideFav = resolveHideOption("hideFav", hideFavoritesKey),
    getHideUsed = resolveHideOption("hideUsed", hideUsedKey),
    getHideXedParam = getURLParameter("hideXed"),
    getHideXed = getHideXedParam == "true" ? "true" : getHideXedParam == "false" ? "false" : ( isHideXedEnabled() ? "true" : "false" );

setHideXedEnabled(getHideXed === "true");

logVar( "getHidePl", getHidePl );
logVar( "getHideReposts", getHideReposts );
logVar( "getHideFav", getHideFav );
logVar( "getHideUsed", getHideUsed );
logVar( "getHideXed", getHideXed );

// On set pages show only some filter options and hide list items, not players
// https://soundcloud.com/jedentageinset/sets/jeden-tag-ein-set-podcasts
const isSetPage = ( urlPath_noParams(2) == "sets" ) ? true : false,
      isSetsTab = isSetPage && !urlPath_noParams(3);
logVar( 'isSetPage (= "'+urlPath_noParams(2)+'")', isSetPage );
logVar( "isSetsTab", isSetsTab );

// The sets tab only shows an informational placeholder instead of filter
// controls, so no persisted hide option may remove its playlist entries.
if( isSetsTab ) {
    getHidePl = getHideReposts = getHideFav = getHideUsed = getHideXed = "false";
}


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
    [ 'meta[property="al:ios:url"]',                                    "meta"  ], // track ID source for the API call
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
    var removeItem = '<div class="mdb-removeItem hand sc-text-grey" title="Remove the player (can be filtered out again with the hiding option &quot;X\'ed items&quot;)">X</div>';
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

waitForKeyElements('.soundList__item:not(.mdb-xed-checked)', function( jNode ) {
    jNode.addClass('mdb-xed-checked');
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
        if( isSetsTab ) {
            saHide.append( "Filter options on pages with multiple playlists create too much server load. Open the playlist/set page of interest individually." );
        } else {
            if( !isSetPage ) {
                saHide.append('<label class="pointer"><input type="checkbox" id="hidePl" name="hidePl" '+checkedPl+' value="">Playlists</label>');
                saHide.append('<label class="pointer"><input type="checkbox" id="hideReposts" name="hideReposts" '+checkedReposts+' value="">Reposts</label>');
                saHide.append('<label class="pointer" title="Hide players that are favorited by you"><input type="checkbox" id="hideFav" name="hideFav" '+checkedFav+' value="">Favs</label>');
            }
            saHide.append('<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>');
            saHide.append('<label class="pointer" title="Hide items you previously removed with the X button"><input type="checkbox" id="hideXed" name="hideXed" '+checkedXed+' value="">X\'ed items</label>');
        }
    }

    // Filter row
    if( !isSetsTab ) {
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
        jNode.append( '<button class="'+soundActionFakeButtonClass+'"><a href="'+buyLink_href+'" target="_blank">Link: '+buyLink_text+'</a></button>' );
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
        var isNewSoundCloudLayout = jNode.is('#mdb-sc-trackExtras');

        RUN_sc_button_group = false;

        if( urlPath(2) != "sets" ) {

            logFunc( "Player page / sound action buttons" );
            logVar( "isNewSoundCloudLayout", isNewSoundCloudLayout );

            // API call
            getScAccessTokenFromApi(function(output){
                scAccessToken = output;
                logVar( "scAccessToken", scAccessToken );

                if( scAccessToken != "null" ) {
                    // Call API on current page
                    // metaDoc: in the new layout this meta only exists in the top document
                    var iosUrlMeta = $('meta[property="al:ios:url"]', metaDoc),
                        currentTrack_id = iosUrlMeta.length ? iosUrlMeta.attr("content").replace( "soundcloud://sounds:", "" ) : ""; // e.g. 2007615367
                    logVar( "currentTrack_id", currentTrack_id );

                    if( !currentTrack_id ) {
                        log( "No track ID meta found!" );
                        addApiErrorNote( "no track ID" );
                        return;
                    }
                    var scApiURl_currentTrack = "https://api.soundcloud.com/tracks/" + currentTrack_id; // Track ID would need to be grabbed (e.g. via sound action "report" URL
                    //var scApiURl_currentTrack = "https://api.soundcloud.com/resolve?url=" + encodeURIComponent( location.href );

                    logVar( "scApiURl_currentTrack", scApiURl_currentTrack );

                    $.ajax({
                        beforeSend: function(request) {
                            request.setRequestHeader( "Authorization", "OAuth " + scAccessToken );
                        },
                        dataType: "json",
                        url: scApiURl_currentTrack,
                        success: function( t ) {

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

                                // MixesDB mix page title suggestion, below the headline.
                                // Outside the h1 guard above: the input is only added once the
                                // toolkit reported "not on MixesDB yet", which can land long
                                // after the header was built (and the other way round).
                                // dur_ms gates it: MixesDB does not take recordings under 20 min.
                                mdbTitleInput_setSuggestion(
                                    buildMixesdbTitle( title, ( t.user && t.user.username ) ? t.user.username : "", created_at, release_date ),
                                    dur_ms
                                );

                                // add toggleTarget
                                if( $("#mdb-toggle-target").length === 0 ) {
                                    $(".listenDetails").prepend( '<div id="mdb-toggle-target"></div>' );
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
                                if( isNewSoundCloudLayout && purchase_url && $("#mdb-purchaseLink").length === 0 ) {
                                    var purchase_href = /^https?:\/\/gate\.sc\//.test( purchase_url ) ? fixScRedirectUrl( purchase_url ) : purchase_url,
                                        purchase_text = purchase_title ? purchase_title : "Buy";

                                    buttonTarget.append( '<button id="mdb-purchaseLink" class="'+soundActionFakeButtonClass+'"><a href="'+purchase_href+'" target="_blank">Link: '+purchase_text+'</a></button>' );
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
                                            durToggleWrapper = getFileDetails_forToggle( dur_sec, bytes ),
                                            dur = convertHMS( dur_sec );

                                        if( isNewSoundCloudLayout ) {
                                            buttonTarget.append('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');
                                        } else {
                                            soundActions.after('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');
                                        }

                                        $("#mdb-toggle-target").append( durToggleWrapper );
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
                            }
                        },
                        error: function() {
                            log( "No track or no API!" );
                            addApiErrorNote( "unknown error" );
                        }
                    });
                } else {
                    addApiErrorNote( "no access token" );
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

            // toolkit goes full-width at the very end of the wrapper (below buttons and toggle
            // target), instead of being squeezed into the old sidebar column
            log( "Calling getToolkit() for #mdb-sc-trackExtras." );
            getToolkit( getScPlayerUrl(), "playerUrl", "detail page", $("#mdb-sc-trackExtras"), "append", jNode.find("h1").first().text(), "", 1, getScPlayerUrl() );

            // the title suggestion is gated behind that toolkit's usage verdict
            mdbTitleInput_watchToolkit();
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
    let descriptionExpandedOnce = false;

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

        log( "Calling getToolkit() for old layout .listenDetails." );
        getToolkit( getScPlayerUrl(), "playerUrl", "detail page", jNode, "before", titleText, "", 1, getScPlayerUrl() );

        // the title suggestion is gated behind that toolkit's usage verdict
        mdbTitleInput_watchToolkit();
    } else {
        log( "Not a track detail page - skipping old layout toolkit." );
    }
});

log( "script.user.js IIFE finished - all handlers registered." );

})();

/*
 * Changelog
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
