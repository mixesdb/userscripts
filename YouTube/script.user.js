// ==UserScript==
// @name         YouTube (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.10.7
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/trustedTypes.js?v-YouTube_1
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-YouTube_23
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-YouTube_16
// @match        *://*.youtube.com/*
// @match        *://youtu.be/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-end
// ==/UserScript==

(function() {

console.log( "YouTube userscript init" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Startup diagnostics
 *
 * Reports of "the change is not there" on YouTube have so far produced logs with no line of
 * ours in them at all, which is ambiguous in the worst way: the script may never have run,
 * may have died on its first statement, or may have run fine while only the DOM part failed.
 * Everything here is deliberately dependency-free - plain console.log, no jQuery, no
 * global.js helpers - because a @require that failed to fetch is one of the causes it has to
 * be able to report. Nothing below may throw, or it takes the whole script down with it.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// ytLog: log() lives in global.js, so it is not available when that require is the problem
function ytLog( text ) {
    if( typeof log === "function" ) {
        log( text );
    } else {
        console.log( "[MixesDB userscript]: " + text );
    }
}

// Names an uncaught error with its exact file/line instead of leaving a silent dead script
// (same safety net as the SoundCloud script, added there for the same kind of report).
window.addEventListener( "error", function( e ) {
    ytLog( "UNCAUGHT ERROR: " + e.message + " @ " + e.filename + ":" + e.lineno + ":" + e.colno );
});

// Same safety net for rejected promises, which the "error" event does not cover. Worth its
// own listener: everything we insert from an ajax callback (loadRawCss, the toolkit's API
// lookups) fails exactly this way, and the console then shows jQuery's stack with no hint
// that it was our script - which is how the Trusted Types breakage stayed invisible.
window.addEventListener( "unhandledrejection", function( e ) {
    var reason = e.reason;
    ytLog( "UNHANDLED PROMISE REJECTION: " + ( reason && reason.message ? reason.message : reason ) );
});

ytLog( "location.href: " + location.href );
ytLog( "top frame: " + ( window.self === window.top ) + ", hostname: " + location.hostname );

/*
 * Reload-burst counter
 * redirectOnUrlChange() below turns every history.pushState/replaceState into a full page
 * reload, and YouTube rewrites its own URL while the page is loading. If that ever ends in a
 * reload loop, nothing we register survives long enough to do anything - and the console
 * looks empty because every reload clears it. sessionStorage survives reloads, so a count
 * far above 1 here is the proof. Counts only reloads of the SAME url within 30s of each
 * other, so ordinary navigation always reads 1.
 */
var mdbLoadCount = "unknown (sessionStorage unavailable)";
try {
    var mdbLoadKey = "mdb-yt-loadcount",
        mdbLoadState = JSON.parse( sessionStorage.getItem( mdbLoadKey ) || "null" ),
        mdbLoadNow = Date.now();

    if( !mdbLoadState || mdbLoadState.href !== location.href || mdbLoadNow - mdbLoadState.at > 30000 ) {
        mdbLoadState = { href: location.href, at: mdbLoadNow, count: 0 };
    }

    mdbLoadState.count++;
    mdbLoadState.at = mdbLoadNow;
    sessionStorage.setItem( mdbLoadKey, JSON.stringify( mdbLoadState ) );
    mdbLoadCount = mdbLoadState.count;
} catch( e ) {}

ytLog( "loads of this URL in the last 30s: " + mdbLoadCount + " (a number climbing on every check means a redirectOnUrlChange reload loop)" );

/*
 * @require check
 * Each @require is a separate network fetch that can fail on its own - and when it does, the
 * first call into it throws a bare ReferenceError naming a function, with nothing saying
 * which file was supposed to provide it. typeof on an undeclared name is safe.
 */
var mdbRequires = [
    [ "trustedTypes.js", "getTrustedTypesStatus", typeof getTrustedTypesStatus ],
    [ "jquery-3.7.1.min.js", "$", typeof $ ],
    [ "waitForKeyElements.js", "waitForKeyElements", typeof waitForKeyElements ],
    [ "youtube_funcs.js", "normalizeYoutubeTitle", typeof normalizeYoutubeTitle ],
    [ "global.js", "redirectOnUrlChange", typeof redirectOnUrlChange ],
    [ "global.js", "getPlaylistPageInfo", typeof getPlaylistPageInfo ],
    [ "global.js", "addTidPlaylistSubmitLink", typeof addTidPlaylistSubmitLink ],
    [ "toolkit.js", "getToolkit", typeof getToolkit ]
];

var mdbRequiresMissing = 0;
for( var mdbR = 0; mdbR < mdbRequires.length; mdbR++ ) {
    var mdbEntry = mdbRequires[ mdbR ],
        mdbOk = ( mdbEntry[2] === "function" );

    if( !mdbOk ) mdbRequiresMissing++;
    ytLog( "  [" + ( mdbOk ? "OK" : "MISSING" ) + "] " + mdbEntry[0] + " -> " + mdbEntry[1] + " (typeof: " + mdbEntry[2] + ")" );
}

if( mdbRequiresMissing ) {
    ytLog( "STOP READING HERE: " + mdbRequiresMissing + " @require(s) did not load. Nothing below can work. " +
           "Check the Network tab for the raw.githubusercontent.com/cdn.rawgit.com URLs in the header, " +
           "and re-save the script in the userscript manager so it re-fetches them." );
}

if( !/(^|\.)youtube\.com$/.test( window.location.hostname ) && window.location.hostname !== "youtu.be" ) {
    console.log( "YouTube userscript: skip non-YouTube host", window.location.hostname );
    return;
}

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
// guarded so that a failed global.js produces the full diagnostic report above and below
// instead of a ReferenceError that cuts the script off right here
if( typeof redirectOnUrlChange === "function" ) {
    redirectOnUrlChange( 200 );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 20,
    scriptName = "YouTube";
window.scriptName = scriptName; // toolkit.js reads this global directly

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Embed URL for copy-paste
 * Toolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getYoutubeIdFromDom() {
    var selectors = [
        "ytd-watch-flexy[video-id]",
        "ytd-player[video-id]",
        "meta[itemprop='videoId']"
    ];

    for( var i = 0; i < selectors.length; i++ ) {
        var node = document.querySelector( selectors[i] );
        if( !node ) continue;

        var id = node.getAttribute( "video-id" ) || node.getAttribute( "content" );
        if( id && id.length == 11 ) return id;
    }

    var playerResponseId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
    if( playerResponseId && playerResponseId.length == 11 ) return playerResponseId;

    var linkCandidates = document.querySelectorAll( "a[href*='watch?v='], a[href*='youtu.be/']" );
    for( var j = 0; j < linkCandidates.length; j++ ) {
        var href = linkCandidates[j].href || linkCandidates[j].getAttribute( "href" );
        if( !href ) continue;

        var parsedId = getYoutubeIdFromUrl( href );
        if( parsedId ) return parsedId;
    }

    return false;
}

function resolveYoutubeId() {
    var id = getYoutubeIdFromUrl( window.location.href )
             || getYoutubeIdFromUrl( url )
             || getYoutubeIdFromDom();

    if( typeof window.mdbYoutubeIdOverride === "string" && window.mdbYoutubeIdOverride.length == 11 ) {
        id = window.mdbYoutubeIdOverride;
    }

    return id;
}

function getDurationSec_YT() {
    var sec = window.ytInitialPlayerResponse?.videoDetails?.lengthSeconds
              || window.ytplayer?.config?.args?.length_seconds;
    if( sec ) return parseInt( sec, 10 );

    var player = document.querySelector('.html5-video-player');
    if( player && !player.classList.contains('ad-showing') ) {
        var hms = $(".ytp-time-duration").text().trim();
        if( hms && hms !== "0:00" ) {
            var parts = hms.split(":"),
                total = 0;
            for( var i = 0; i < parts.length; i++ ) {
                total = total*60 + parseInt( parts[i], 10 );
            }
            return total;
        }
    }

    var iso = $("meta[itemprop='duration']").attr("content");
    if( typeof iso === "undefined" ) return null;
    var m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if( !m ) return null;
    var h = parseInt(m[1] || 0, 10),
        min = parseInt(m[2] || 0, 10),
        s = parseInt(m[3] || 0, 10);
    return h*3600 + min*60 + s;
}

var youtubeEnhancementsStartedFor = null;

function initYoutubeEnhancements( ytId ) {
    if( !ytId || youtubeEnhancementsStartedFor === ytId ) return;

    youtubeEnhancementsStartedFor = ytId;
    logVar( "url", window.location.href );
    logVar( "ytId", ytId );

    var playerUrl = "https://youtu.be/" + ytId,
        dur_sec_cache = null,
        detailEnhancementsAdded = false,
        durationEnhancementsAdded = false;

    function addDetailPageEnhancements( wrapper ) {
        if( detailEnhancementsAdded ) return;

        var titleText = $("#title h1, ytd-watch-metadata h1").first().text().trim();
        if( !titleText ) titleText = $("meta[name='title']").attr("content") || document.title;

        var $wrapper = $(wrapper).first();
        if( !$wrapper.length ) return;

        // Thumbnail as linked image
        var thumbImg_url = 'https://i.ytimg.com/vi/'+ytId+'/maxresdefault.jpg',
            thumbImg = '<div class="mdb-element mdb-thumbImgLink-wrapper left0"><a href="'+thumbImg_url+'" target="_blank"><img src="'+thumbImg_url+'"></a></div>';

        if( !$(".mdb-thumbImgLink-wrapper").length ) {
            $wrapper.after( thumbImg );
        }

        // Toolkit
        getToolkit( playerUrl, "playerUrl", "detail page", $wrapper, "after", titleText, "link", 1, playerUrl );
        detailEnhancementsAdded = true;
    }

    function addDurationEnhancements() {
        if( durationEnhancementsAdded ) return;

        dur_sec_cache = getDurationSec_YT();
        if( !dur_sec_cache ) return;

        var dur = convertHMS( dur_sec_cache );

        waitForKeyElements( "#top-level-buttons-computed, ytd-watch-metadata #actions-inner", function( jNode ) {
            if( !$("#mdb-fileInfo").length ) {
                jNode.prepend('<button id="mdb-fileInfo" class="mdb-element mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details">'+dur+'</button>');
            }
        }, true );

        waitForKeyElements( "ytd-watch-metadata #description, ytd-expandable-video-description-body-renderer", function( jNode ) {
            if( !$("#mdb-fileDetails").length ) {
                jNode.before( getFileDetails_forToggle( dur_sec_cache ) );
            }
        }, true );

        durationEnhancementsAdded = true;
    }

    waitForKeyElements( "#bottom-row", function( jNode ) {
        addDetailPageEnhancements( jNode );
    });

    waitForKeyElements( "ytd-watch-metadata #description-inner, ytd-watch-metadata #description", function( jNode ) {
        addDetailPageEnhancements( jNode );
    });

    waitForKeyElements( ".ytp-time-duration", function() {
        setTimeout(function(){
            addDurationEnhancements();
        }, 1000 );
    }, true );

    waitForKeyElements( "ytd-watch-metadata", function() {
        addDurationEnhancements();
    }, true );
}

function ensureYoutubeEnhancementsStarted() {
    var ytId = resolveYoutubeId();
    if( !ytId ) {
        log( "No YouTube ID yet, waiting for page data..." );
        return false;
    }

    initYoutubeEnhancements( ytId );
    return true;
}

ensureYoutubeEnhancementsStarted();

var youtubeInitAttempts = 0,
    youtubeInitTimer = setInterval(function() {
        youtubeInitAttempts++;
        if( ensureYoutubeEnhancementsStarted() || youtubeInitAttempts >= 20 ) {
            clearInterval( youtubeInitTimer );
        }
    }, 500 );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Playlist pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Submit the whole playlist to TrackId.net
 * Below the header's action row (the "Play all" button and friends).
 * YouTube ships the playlist header markup twice over - a permanently hidden copy alongside
 * the live one - and still ships the pre-2024 sidebar layout (hidden) next to the current
 * one, so: candidate anchors, first VISIBLE one wins.
 * https://www.youtube.com/playlist?list=PL3r9-f9fgL-aqmZVC_kYcAw_bL0exz3k6
 */
var playlistAnchorSelector = ".ytPageHeaderViewModelFlexibleActions, ytd-playlist-sidebar-primary-info-renderer #stats";

// Dependency-free copy of the URL test. getPlaylistPageInfo() (global.js) stays the single
// source of truth for building the link, but the diagnostics below must keep working when
// global.js is exactly what failed - which is one of the things they exist to reveal.
var isPlaylistPage = location.pathname.replace( /\/+$/, "" ) === "/playlist" && /[?&]list=/.test( location.search );

ytLog( "playlist page (by URL): " + isPlaylistPage );

if( typeof waitForKeyElements !== "function" ) {
    ytLog( "waitForKeyElements is not available - the playlist submit link cannot be registered at all." );
} else {
    waitForKeyElements( playlistAnchorSelector, function( jNode ) {
        if( !getPlaylistPageInfo() ) return; // watch/channel pages have page headers too

        if( !jNode.is(":visible") ) return true; // hidden duplicate, or not hydrated yet

        ytLog( "Anchor matched and visible - adding the submit link now." );
        addTidPlaylistSubmitLink( jNode, "after" );
    });
}

/*
 * Playlist page diagnostics
 * The header is generated markup whose class names carry no meaning, and YouTube serves
 * several layouts in parallel per account/rollout bucket. waitForKeyElements by design only
 * logs once a selector actually matches, so a "the link is not there" report produces total
 * silence and cannot be diagnosed from a log alone (same problem as the SoundCloud track
 * page, see SoundCloud/script.user.js). These unconditional snapshots always show which
 * anchors existed, how many were visible, and whether the link ended up in the DOM.
 * Plain DOM, no jQuery: see the note on ytLog above.
 */
function logPlaylistPageSnapshot( label ) {
    if( !isPlaylistPage ) return;

    ytLog( "### Playlist page DOM snapshot: " + label + " (readyState: " + document.readyState + ")" );

    playlistAnchorSelector.split( ", " ).forEach(function( selector ) {
        var matches = document.querySelectorAll( selector ),
            visible = 0;

        Array.prototype.forEach.call( matches, function( node ) {
            var rect = node.getBoundingClientRect();
            if( rect.width > 0 && rect.height > 0 ) visible++;
        });

        ytLog( "  [" + matches.length + " found, " + visible + " visible] " + selector );
    });

    // Reference points that must exist on any playlist page whatsoever. All three at 0 means
    // the page had not rendered yet (or is a layout none of our selectors know), which is a
    // different problem than our specific anchor missing.
    [ "yt-page-header-view-model", "ytd-browse", "#contents" ].forEach(function( selector ) {
        ytLog( "  [" + document.querySelectorAll( selector ).length + " found] " + selector + " (reference point)" );
    });

    var link = document.querySelector( ".mdb-tidSubmit-playlist" );
    ytLog( "  submit link in the DOM: " + !!link + ( link ? ", visible: " + ( link.getBoundingClientRect().height > 0 ) : "" ) );
}

logPlaylistPageSnapshot( "at script start" );

[ 3000, 8000, 15000 ].forEach(function( delay ) {
    setTimeout(function() {
        logPlaylistPageSnapshot( delay + "ms after script start" );
    }, delay );
});

})();
