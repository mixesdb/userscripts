// ==UserScript==
// @name         YouTube (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.21.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/trustedTypes.js?v-YouTube_2
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-YouTube_28
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-YouTube_21
// @match        *://*.youtube.com/*
// @match        *://youtu.be/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-end
// ==/UserScript==

(function() {

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 * Only the declarations live up here (they cannot throw): the CSS
 * itself loads in "Load CSS" further down, after the @require check
 * had its chance to report a dead global.js - loadRawCss() lives there
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var cacheVersion = 34,
    scriptName = "YouTube";
window.scriptName = scriptName; // toolkit.js reads this global directly

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
 * We no longer reload on URL changes ourselves (onUrlChange() replaced redirectOnUrlChange(),
 * see global.js), and YouTube rewriting its own URL while the page loads is exactly the case
 * that used to send that into a reload loop. Kept as a tripwire: in a loop nothing we
 * register survives long enough to do anything, and the console looks empty because every
 * reload clears it. sessionStorage survives reloads, so a count far above 1 here is the
 * proof - and now points at something other than us. Counts only reloads of the SAME url
 * within 30s of each other, so ordinary navigation always reads 1.
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

ytLog( "loads of this URL in the last 30s: " + mdbLoadCount + " (a number climbing on every check means something is reloading the page in a loop)" );

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
    [ "global.js", "onUrlChange", typeof onUrlChange ],
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
           "Check the Network tab for the raw.githubusercontent.com URLs in the header, " +
           "and re-save the script in the userscript manager so it re-fetches them." );
}

if( !/(^|\.)youtube\.com$/.test( window.location.hostname ) && window.location.hostname !== "youtu.be" ) {
    console.log( "YouTube userscript: skip non-YouTube host", window.location.hostname );
    return;
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load CSS
 * cacheVersion/scriptName sit at the top of the IIFE - only the
 * loadRawCss() calls stay down here, behind the @require check
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );
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

/*
 * expectedId (optional): YouTube keeps window.ytInitialPlayerResponse around across SPA
 * navigations and does not always refresh it before our handlers run, so on the second video
 * it can still describe the first one. Passing the ID we resolved for the current page makes
 * that branch answer only when it really belongs to this video; the player DOM below is live
 * and needs no such check.
 */
function getDurationSec_YT( expectedId ) {
    var playerResponse = window.ytInitialPlayerResponse?.videoDetails,
        playerResponseFits = !expectedId || !playerResponse?.videoId || playerResponse.videoId === expectedId;

    var sec = ( playerResponseFits ? playerResponse?.lengthSeconds : null )
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

/*
 * Per-video state
 *
 * All handlers below are registered ONCE, at the bottom of this section, and then keep
 * running for the lifetime of the document - waitForKeyElements polls forever and
 * onUrlChange() (global.js) re-arms it when YouTube swaps in the next video.
 *
 * That is why nothing here may CAPTURE the video ID or the duration: after the user clicks
 * the next video, a captured value would still describe the previous one and the toolkit
 * would look up the wrong mix. Everything is resolved fresh inside the handler instead, and
 * these two remember which video the work was already done for.
 *
 * They also explain the missing `waitOnce` argument on waitForKeyElements: a one-shot
 * handler stops polling for good after the first video, which is fine only when every
 * navigation reloads the page - which it no longer does.
 */
var youtubeDetailsAddedFor = null,
    youtubeDurationAddedFor = null;

// Shortest video we still treat as a possible DJ mix. Anything below gets no toolkit.
var toolkitMinDuration_sec = 20 * 60;

function addDetailPageEnhancements( wrapper ) {
    var ytId = resolveYoutubeId();

    if( !ytId ) {
        log( "No YouTube ID yet, waiting for page data..." );
        return true; // not handled - keep offering this node
    }

    if( youtubeDetailsAddedFor === ytId ) return;

    var titleText = $("#title h1, ytd-watch-metadata h1").first().text().trim();
    if( !titleText ) titleText = $("meta[name='title']").attr("content") || document.title;

    var $wrapper = $(wrapper).first();
    if( !$wrapper.length ) return true;

    logVar( "url", window.location.href );
    logVar( "ytId", ytId );

    var playerUrl = "https://youtu.be/" + ytId;

    // Thumbnail as linked image
    var thumbImg_url = 'https://i.ytimg.com/vi/'+ytId+'/maxresdefault.jpg',
        thumbImg = '<div class="mdb-element mdb-thumbImgLink-wrapper left0"><a href="'+thumbImg_url+'" target="_blank"><img src="'+thumbImg_url+'"></a></div>';

    if( !$(".mdb-thumbImgLink-wrapper").length ) {
        $wrapper.after( thumbImg );
    }

    /*
     * Toolkit - only for videos long enough to be a DJ mix.
     * getToolkit() hits the MixesDB API for every video it is called on, and the overwhelming
     * majority of YouTube videos are not mixes, so that request would be wasted almost every
     * time. Duration is the one cheap signal we already have: nothing under 20 minutes is a
     * mix, so it decides before any request goes out.
     */
    var dur_sec = getDurationSec_YT( ytId );

    if( !dur_sec ) {
        log( "Duration not known yet - deferring the toolkit decision to the next poll" );
        return true; // not handled - the thumbnail above is guarded against being added twice
    }

    if( dur_sec < toolkitMinDuration_sec ) {
        log( "Video is " + convertHMS( dur_sec ) + ", below the " + convertHMS( toolkitMinDuration_sec ) + " mix threshold - no toolkit, no MixesDB API call" );
        youtubeDetailsAddedFor = ytId;
        return;
    }

    logVar( "duration", convertHMS( dur_sec ) + " - long enough for a mix, adding the toolkit" );

    // Last argument is the toolkit's Embed URL item - the copy-paste ready player URL, same
    // youtu.be URL we look the video up with, which is why it is passed twice.
    getToolkit( playerUrl, "playerUrl", "detail page", $wrapper, "after", titleText, "link", 1, playerUrl );
    youtubeDetailsAddedFor = ytId;
}

function addDurationEnhancements() {
    var ytId = resolveYoutubeId();

    if( !ytId || youtubeDurationAddedFor === ytId ) return;

    var dur_sec = getDurationSec_YT( ytId );
    if( !dur_sec ) return true; // player not ready yet - ask again on the next poll

    var dur = convertHMS( dur_sec ),
        buttonTarget = $("#top-level-buttons-computed, ytd-watch-metadata #actions-inner").first(),
        detailsTarget = $("ytd-watch-metadata #description, ytd-expandable-video-description-body-renderer").first();

    // The metadata row hydrates later than the player, so both targets have to be there
    // before this video counts as done - otherwise it would be marked off with nothing added.
    if( !buttonTarget.length || !detailsTarget.length ) return true;

    if( !$("#mdb-fileInfo").length ) {
        buttonTarget.prepend('<button id="mdb-fileInfo" class="mdb-element mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details">'+dur+'</button>');
    }

    if( !$("#mdb-fileDetails").length ) {
        detailsTarget.before( getFileDetails_forToggle( dur_sec ) );
    }

    youtubeDurationAddedFor = ytId;
}

waitForKeyElements( "#bottom-row", addDetailPageEnhancements );

waitForKeyElements( "ytd-watch-metadata #description-inner, ytd-watch-metadata #description", addDetailPageEnhancements );

waitForKeyElements( ".ytp-time-duration", function() {
    setTimeout( addDurationEnhancements, 1000 );
});

waitForKeyElements( "ytd-watch-metadata", addDurationEnhancements );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Playlists
 *
 * Two pages show one and the same playlist, and both get the submit link:
 *   /playlist?list=…          the playlist's own page, link below the header's action row
 *   /watch?v=…&list=…         a video playing out of it, link in the sidebar panel
 * getPlaylistPageInfo() (global.js) reduces both to the same canonical playlist URL, so
 * whichever one it is submitted from, TrackId.net gets the same playlist.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Playlist page
 * Below the header's action row (the "Play all" button and friends).
 * YouTube ships the playlist header markup twice over - a permanently hidden copy alongside
 * the live one - and still ships the pre-2024 sidebar layout (hidden) next to the current
 * one, so: candidate anchors, first VISIBLE one wins.
 * https://www.youtube.com/playlist?list=PL3r9-f9fgL-aqmZVC_kYcAw_bL0exz3k6
 */
var playlistAnchorSelector = ".ytPageHeaderViewModelFlexibleActions, ytd-playlist-sidebar-primary-info-renderer #stats";

/*
 * Watch page playing a playlist
 * There is no page header here - the playlist is the panel at the top of the right sidebar,
 * so the link goes below that panel's action row (loop/shuffle/⋮), right above the video list.
 * https://www.youtube.com/watch?v=WSIP7fWTjIU&list=PLtVJWhGPjwI0CDoCLajqrUMdcbi5kffPt
 */
var watchPlaylistAnchorSelector = "ytd-playlist-panel-renderer #playlist-actions";

// Dependency-free copies of the URL tests. getPlaylistPageInfo() (global.js) stays the single
// source of truth for building the link, but the diagnostics below must keep working when
// global.js is exactly what failed - which is one of the things they exist to reveal.
// Functions, not values: YouTube goes from a playlist to a video and back without ever
// loading a document, so anything answered once at script start answers for the wrong page
// from the first click onwards.
function isPlaylistPage() {
    return location.pathname.replace( /\/+$/, "" ) === "/playlist" && /[?&]list=/.test( location.search );
}

function isWatchPlaylistPage() {
    return location.pathname.replace( /\/+$/, "" ) === "/watch" && /[?&]list=/.test( location.search );
}

// Says which of the two the current URL is - note that a list= alone is not enough: an
// auto-generated Mix and the private Watch Later/Liked lists carry one too and get no link
// (see isSubmittableYoutubeListId in global.js), which is why the answer is logged as well.
function logPlaylistUrlKind() {
    ytLog( "playlist page (by URL): " + isPlaylistPage() +
           ", watch page with a playlist: " + isWatchPlaylistPage() +
           ", submittable playlist: " + ( typeof getPlaylistPageInfo === "function" ? JSON.stringify( getPlaylistPageInfo() ) : "unknown, global.js is missing" ) );
}

logPlaylistUrlKind();

if( typeof waitForKeyElements !== "function" ) {
    ytLog( "waitForKeyElements is not available - the playlist submit link cannot be registered at all." );
} else {
    waitForKeyElements( playlistAnchorSelector, function( jNode ) {
        // Not getPlaylistPageInfo(): that one now answers for watch pages too, and those are
        // served by the handler below. Channel pages have page headers as well.
        if( !isPlaylistPage() ) return true;

        if( !jNode.is(":visible") ) return true; // hidden duplicate, or not hydrated yet

        ytLog( "Anchor matched and visible - adding the submit link now." );
        addTidPlaylistSubmitLink( jNode, "after" );
    });

    waitForKeyElements( watchPlaylistAnchorSelector, function( jNode ) {
        // Nothing to submit here - no list=, or one we do not submit. Returns true rather
        // than falling through: YouTube keeps this panel across videos, so the node has to
        // stay on the watch list for the next one, which may well be a playlist we do want.
        if( !getPlaylistPageInfo() ) return true;

        if( !jNode.is(":visible") ) return true; // panel closed, or not hydrated yet

        ytLog( "Playlist panel action row matched and visible - adding the submit link now." );
        addTidPlaylistSubmitLink( jNode, "after" );
    });
}

/*
 * Playlist diagnostics
 * Both anchors are generated markup whose class names carry no meaning, and YouTube serves
 * several layouts in parallel per account/rollout bucket. waitForKeyElements by design only
 * logs once a selector actually matches, so a "the link is not there" report produces total
 * silence and cannot be diagnosed from a log alone (same problem as the SoundCloud track
 * page, see SoundCloud/script.user.js). These unconditional snapshots always show which
 * anchors existed, how many were visible, and whether the link ended up in the DOM.
 * Plain DOM, no jQuery: see the note on ytLog above.
 */
function logPlaylistPageSnapshot( label ) {
    var onPlaylistPage = isPlaylistPage(),
        onWatchPlaylistPage = isWatchPlaylistPage();

    if( !onPlaylistPage && !onWatchPlaylistPage ) return;

    // Which anchors to report, and reference points that must exist on a page of that kind
    // whatsoever. All of the latter at 0 means the page had not rendered yet (or is a layout
    // none of our selectors know), which is a different problem than our anchor missing.
    var anchors = onPlaylistPage ? playlistAnchorSelector : watchPlaylistAnchorSelector,
        references = onPlaylistPage
                     ? [ "yt-page-header-view-model", "ytd-browse", "#contents" ]
                     : [ "ytd-watch-flexy", "ytd-playlist-panel-renderer", "#secondary" ];

    ytLog( "### DOM snapshot of the " + ( onPlaylistPage ? "playlist page" : "watch page's playlist panel" ) +
           ": " + label + " (readyState: " + document.readyState + ")" );

    anchors.split( ", " ).forEach(function( selector ) {
        var matches = document.querySelectorAll( selector ),
            visible = 0;

        Array.prototype.forEach.call( matches, function( node ) {
            var rect = node.getBoundingClientRect();
            if( rect.width > 0 && rect.height > 0 ) visible++;
        });

        ytLog( "  [" + matches.length + " found, " + visible + " visible] " + selector );
    });

    references.forEach(function( selector ) {
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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * SPA navigation
 *
 * YouTube is the reason the old redirectOnUrlChange() was worst here: it rewrites its own
 * URL while a page is still loading, so "reload on every URL change" could reload the video
 * the user had just started. Nothing reloads any more - onUrlChange() (global.js) waits for
 * YouTube to finish swapping in the new video, clears out what the previous one left behind,
 * and the handlers above then run again for the new one.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// guarded so that a failed global.js produces the full diagnostic report above instead of a
// ReferenceError that cuts the script off here
if( typeof onUrlChange === "function" ) {
    onUrlChange(function() {
        // onUrlChange() has just removed our elements from the page, so the bookkeeping that
        // says "already done" has to go with them - otherwise coming back to a video seen
        // earlier in this session would leave it without a toolkit.
        youtubeDetailsAddedFor = null;
        youtubeDurationAddedFor = null;

        logPlaylistUrlKind();
        logPlaylistPageSnapshot( "after SPA navigation" );
    });
}

})();
