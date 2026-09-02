// ==UserScript==
// @name         YouTube (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.09.02.1
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
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/mixesdb_modal/funcs.js?v-YouTube_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-YouTube_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-YouTube_30
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_definitions.js?v_57
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_builder.js?v_89
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/tracklist_detector.js?v_15
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/page_creator.js?v_125
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
var cacheVersion = 47,
    scriptName = "YouTube";
window.scriptName = scriptName; // toolkit.js reads this global directly
window.cacheVersion = cacheVersion; // same reason: the @require'd shared files cache-bust their own CSS with it

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
    [ "mixesdb_modal/funcs.js", "mdbModal_open", typeof mdbModal_open ],
    [ "tracklist_editor/funcs.js", "apiTracklist", typeof apiTracklist ],
    [ "toolkit.js", "getToolkit", typeof getToolkit ],
    [ "page_creator/title_definitions.js", "mdbTitleUsernameConversions", typeof mdbTitleUsernameConversions ],
    [ "page_creator/title_builder.js", "buildMixesdbTitle", typeof buildMixesdbTitle ],
    [ "page_creator/tracklist_detector.js", "mdbTracklist_detectInText", typeof mdbTracklist_detectInText ],
    [ "page_creator/page_creator.js", "mdbPageCreator_add", typeof mdbPageCreator_add ]
];

var mdbRequiresMissing = 0;
for( var mdbR = 0; mdbR < mdbRequires.length; mdbR++ ) {
    var mdbEntry = mdbRequires[ mdbR ],
        // "not undefined" rather than "function": title_definitions.js exports plain data
        mdbOk = ( mdbEntry[2] !== "undefined" );

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
loadRawCss( githubPath_raw + "shared/page_creator/page_creator.css?v-" + scriptName + "_" + cacheVersion );
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

/*
 * Whether the Page Creator row's side of #mdb-yt-extras is DECIDED - either the row is in or
 * we know there will be none. The loading skeleton's extraReady() reads it (see below); it is
 * reset to false with every fresh container, so the next video waits for its own row.
 */
var ytPageCreatorSettled = false;

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

    /*
     * One container we own for everything that arrives async below the video metadata: the
     * Page Creator row and the toolkit. That is what lets the loading skeleton
     * (mdbSkeleton_* in shared/page_creator/page_creator.js) cover the build-up and reveal
     * both in one step - the row and the toolkit are its two separate grey stand-in boxes,
     * like on TrackId.net. mdb-element: taken down again on SPA navigation.
     */
    if( !$("#mdb-yt-extras").length ) {
        $wrapper.after( '<div id="mdb-yt-extras" class="mdb-element"></div>' );

        // fresh container, so the row it is waiting for has not arrived yet (see extraReady)
        ytPageCreatorSettled = false;

        mdbSkeleton_show({
            target: "#mdb-yt-extras",
            rows:   [ "pageCreator", "toolkit" ],
            /*
             * The toolkit verdict alone is NOT enough here: the Page Creator row needs the
             * video data, which is its own async lookup and lands a second or more after the
             * verdict - so the skeleton used to reveal a toolkit-only box and the row then
             * popped in below it, which is exactly what the skeleton exists to prevent.
             * The flag - not $("#mdb-pageCreator").length - so a video the row is NOT built
             * for (no usable data) reveals as soon as that is known instead of sitting out
             * the skeleton's max wait.
             */
            extraReady: function() {
                return ytPageCreatorSettled;
            }
        });
    }

    // Last argument is the toolkit's Embed URL item - the copy-paste ready player URL, same
    // youtu.be URL we look the video up with, which is why it is passed twice.
    // Appended INTO the extras wrapper (it used to go after $wrapper directly), so the
    // skeleton covers it.
    getToolkit( playerUrl, "playerUrl", "detail page", $("#mdb-yt-extras"), "append", titleText, "link", 1, playerUrl );

    // the Page Creator row is gated behind that toolkit's usage verdict - (re)arm the poll
    mdbPageCreator_watchToolkit();

    // the row itself needs the video's data, which is its own (possibly async) lookup
    addYtPageCreator( ytId, dur_sec );

    youtubeDetailsAddedFor = ytId;
}

/*
 * getYtVideoData
 * Everything the Page Creator needs about the CURRENT video, keyed by its id: title, channel
 * name and URL, upload date, duration, description. Three sources, best first:
 *
 * 1. window.ytInitialPlayerResponse - but only when it really describes this video. YouTube
 *    keeps it around across SPA navigations and does not always refresh it BEFORE our
 *    handlers run (see getDurationSec_YT above) - it usually does refresh it shortly after,
 *    though, so a stale one is POLLED for a while instead of being given up on: that path
 *    costs no request and works logged-out, which the player API below does not.
 * 2. The page's own player API (/youtubei/v1/player). Same origin - the watch page calls it
 *    itself on every navigation - and it answers without any API key (only a CROSS-origin
 *    call is refused, which is why TrackId.net cannot use it and reads TID's own API
 *    instead). The request context is read off window.ytcfg where available, with a plain
 *    WEB-client fallback. Not guaranteed either: a logged-out/bot-flagged session gets a
 *    LOGIN_REQUIRED answer with no videoDetails at all (seen 2026-08-27 in a fresh
 *    cookieless browser), which lands in the same catch as a network error.
 * 3. The DOM - title and channel name only, no upload date and no description. The
 *    suggestion is poor without a date, so this is a last resort and the log says so.
 */
function getYtVideoData( ytId, done ) {
    var polled = 0,
        pollMax = 20,  // 20 x 500ms = 10s of waiting for YouTube's own refresh
        pollMs = 500;

    function fromPlayerResponse( pr ) {
        var vd = pr && pr.videoDetails,
            mf = pr && pr.microformat && pr.microformat.playerMicroformatRenderer;

        if( !vd || vd.videoId !== ytId || !vd.title ) return null;

        return {
            title:       vd.title,
            channel:     vd.author || "",
            // ownerProfileUrl comes as http:// - MixesDB pages link channels as https
            channelUrl:  ( mf && mf.ownerProfileUrl )
                             ? mf.ownerProfileUrl.replace( /^http:/, "https:" )
                             : ( vd.channelId ? "https://www.youtube.com/channel/" + vd.channelId : "" ),
            createdAt:   ( mf && ( mf.publishDate || mf.uploadDate ) ) || "",
            durationSec: parseInt( vd.lengthSeconds, 10 ) || 0,
            description: vd.shortDescription || ""
        };
    }

    function fromDom() {
        log( "getYtVideoData: falling back to the DOM - title and channel only, no date." );

        done({
            title:       $("#title h1, ytd-watch-metadata h1").first().text().trim(),
            channel:     $("ytd-watch-metadata ytd-channel-name a").first().text().trim(),
            channelUrl:  "",
            createdAt:   "",
            durationSec: 0,
            description: ""
        });
    }

    function askPlayerApi() {
        log( "getYtVideoData: ytInitialPlayerResponse stayed stale - asking the page's own player API." );

        fetch( "/youtubei/v1/player?prettyPrint=false", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                context: getYtInnertubeContext(),
                videoId: ytId
            })
        }).then( function( response ) {
            if( !response.ok ) throw new Error( "HTTP " + response.status );
            return response.json();
        }).then( function( answer ) {
            var data = fromPlayerResponse( answer );

            if( !data ) {
                throw new Error( "the answer describes " +
                    ( answer && answer.videoDetails ? "video " + answer.videoDetails.videoId : "no video" ) +
                    ", not " + ytId +
                    ( answer && answer.playabilityStatus ? " (playability: " + answer.playabilityStatus.status + ")" : "" ) );
            }

            done( data );
        }).catch( function( e ) {
            log( "getYtVideoData: player API FAILED (" + e + ")." );
            fromDom();
        });
    }

    function poll() {
        /*
         * Nothing to wait for when the global is not VISIBLE to us at all. Tampermonkey runs
         * userscripts in an isolated world under Chrome MV3 (the console lines then come from
         * "userscript.html", not from the page), and there our window is not the page's:
         * window.ytInitialPlayerResponse is undefined and stays undefined, however long we
         * poll. Measured on a watch page 2026-08-27: the row appeared 20s after the toolkit
         * because every one of the 20 polls was asking a window that can never answer, and
         * the player API - which works in both worlds - was only asked afterwards. A STALE
         * response (present, describes the previous video) is the real SPA case the poll is
         * for and still gets its full wait.
         */
        if( typeof window.ytInitialPlayerResponse === "undefined" ) {
            log( "getYtVideoData: ytInitialPlayerResponse is not visible from this userscript context (isolated world) - not polling for it, asking the player API right away." );
            askPlayerApi();
            return;
        }

        var fresh = fromPlayerResponse( window.ytInitialPlayerResponse );

        if( fresh ) {
            log( "getYtVideoData: ytInitialPlayerResponse describes this video" +
                 ( polled ? " (after " + polled + " poll(s))" : "" ) + " - no request needed." );
            done( fresh );
            return;
        }

        polled++;

        if( polled < pollMax ) {
            setTimeout( poll, pollMs );
            return;
        }

        askPlayerApi();
    }

    poll();
}

/*
 * getYtInnertubeContext
 * The "context" block every /youtubei/v1/ call has to carry. window.ytcfg holds the page's
 * own one - but it belongs to the PAGE's window, and under Chrome MV3 Tampermonkey runs us in
 * an isolated world where that is not our window (see the poll in getYtVideoData above), so
 * the fallback is the normal case there rather than the exception. Both endpoints we ask
 * (player, next) answer a bare WEB client without an API key, as long as the call is
 * same-origin.
 */
function getYtInnertubeContext() {
    var context = ( window.ytcfg && typeof window.ytcfg.get === "function" )
                      ? window.ytcfg.get( "INNERTUBE_CONTEXT" )
                      : null;

    return context || { client: { clientName: "WEB", clientVersion: "2.20260801.00.00" } };
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Comments
 *
 * A YouTube tracklist is written into the description most of the time, but by no means
 * always: on channels that upload a mix a week it regularly arrives as a comment instead,
 * pinned by the uploader or written by a listener -
 * https://www.youtube.com/watch?v=1os948yIB7k is one of those. The Page Creator asks for the
 * comments only when the description held no tracklist (see mdbPageCreator_addTracklist() in
 * page_creator.js), so a video carrying its tracklist in the description costs nothing here.
 *
 * There is no "give me the comments" endpoint. The watch page reads them the way we do here:
 * /youtubei/v1/next for the video hands out a continuation TOKEN for its comment section, and
 * that token, posted back to the same endpoint, returns a page of comments plus the token for
 * the page after it. Same origin, no API key - see getYtVideoData() above for what that
 * endpoint family does and does not answer.
 *
 * Sorted the way the section opens: top comments. A tracklist comment on a mix is normally
 * pinned or the most liked one, so it sits on the first page whenever it exists at all.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// How many pages of comments are read at most. Each page is a request of its own and holds 20
// comments, and the page after the first is only ever fetched when everything so far held no
// tracklist - which is also the case where a further page is least likely to pay off. Two is
// the compromise: 40 top comments, and one extra request on the videos that have nothing.
var ytCommentPagesMax = 2;

/*
 * ytInnertubeNext
 * One POST to /youtubei/v1/next, the endpoint the watch page itself uses for everything below
 * the player. `payload` is what the call is ABOUT: { videoId: ... } for the watch page's own
 * data, { continuation: token } for a page of comments. Hands over null on any failure - a
 * tracklist we did not get is not worth an exception.
 */
function ytInnertubeNext( payload, done ) {
    fetch( "/youtubei/v1/next?prettyPrint=false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( $.extend( { context: getYtInnertubeContext() }, payload ) )
    }).then( function( response ) {
        if( !response.ok ) throw new Error( "HTTP " + response.status );
        return response.json();
    }).then( done ).catch( function( e ) {
        log( "ytInnertubeNext: FAILED (" + e + ")." );
        done( null );
    });
}

/*
 * ytFindDeep
 * Hands every value stored under `key` anywhere in a parsed InnerTube answer to `hit`, in the
 * order they are written. The paths are never hardcoded on purpose: YouTube moves its
 * renderers around between releases - the same answer already carries the comment section in
 * two different places - and a hardcoded path breaks silently, with no line in the log saying
 * which one it was.
 */
function ytFindDeep( node, key, hit ) {
    if( !node || typeof node !== "object" ) return;

    var i, k;

    if( Array.isArray( node ) ) {
        for( i = 0; i < node.length; i++ ) ytFindDeep( node[i], key, hit );
        return;
    }

    for( k in node ) {
        if( !Object.prototype.hasOwnProperty.call( node, k ) ) continue;

        if( k === key ) hit( node[k] );

        ytFindDeep( node[k], key, hit );
    }
}

/*
 * ytCommentsToken
 * The continuation token that opens the comment section, out of the answer for the video. The
 * section is the itemSectionRenderer marked "comment-item-section" - it is the marker that is
 * looked for, not its place in the answer, and the FIRST one wins (the same answer describes
 * the section a second time for the comments engagement panel, which holds the same token).
 * Empty when the video has its comments turned off, or when YouTube answered us with nothing.
 */
function ytCommentsToken( answer ) {
    var token = "";

    ytFindDeep( answer, "itemSectionRenderer", function( section ) {
        if( token || !section || section.sectionIdentifier !== "comment-item-section" ) return;

        ytFindDeep( section, "continuationCommand", function( command ) {
            if( !token && command && command.token ) token = command.token;
        });
    });

    return token;
}

/*
 * ytCommentsNextToken
 * The "more comments" token of a comment page. Read off the TOP level of the returned item
 * lists, where it is the last entry behind the threads, rather than by searching the answer:
 * a thread that has replies carries a continuation of its own, of the very same type, and
 * that one would load the replies of one comment instead of the next twenty comments.
 */
function ytCommentsNextToken( answer ) {
    var endpoints = ( answer && answer.onResponseReceivedEndpoints ) || [],
        token = "",
        i, j, command, items, last;

    for( i = 0; i < endpoints.length; i++ ) {
        // the first page arrives as a "reload", every page after it as an "append"
        command = endpoints[i].reloadContinuationItemsCommand || endpoints[i].appendContinuationItemsAction;
        items = ( command && command.continuationItems ) || [];

        for( j = 0; j < items.length; j++ ) {
            last = items[j].continuationItemRenderer;

            if( last && last.continuationEndpoint && last.continuationEndpoint.continuationCommand ) {
                token = last.continuationEndpoint.continuationCommand.token || token;
            }
        }
    }

    return token;
}

/*
 * ytCommentBodies
 * The comment texts of one page, as the plain strings the detector wants. Two shapes, because
 * YouTube changed this one: today the thread renderers only REFERENCE their comment and the
 * text arrives in the frameworkUpdates entity batch (commentEntityPayload), while the older
 * answers carried it inside the thread itself (commentRenderer.contentText). The old shape is
 * only read when the new one gave nothing, so a page that ships both cannot count double.
 */
function ytCommentBodies( answer ) {
    var bodies = [];

    ytFindDeep( answer, "commentEntityPayload", function( payload ) {
        var content = payload && payload.properties && payload.properties.content;

        if( content && content.content ) bodies.push( content.content );
    });

    if( !bodies.length ) {
        ytFindDeep( answer, "commentRenderer", function( comment ) {
            var text = comment && comment.contentText;

            if( !text ) return;

            if( text.simpleText ) {
                bodies.push( text.simpleText );
            } else if( text.runs ) {
                bodies.push( text.runs.map( function( run ) { return run.text || ""; } ).join( "" ) );
            }
        });
    }

    return bodies;
}

/*
 * getYtVideoComments
 * The top-level comments of a video as plain strings - what the Page Creator's loadComments
 * hands over. Replies are left out: they are behind a continuation of their own, and a
 * tracklist is not written as a reply.
 * Every answer can outlive the page it was asked for, so each step checks the page generation
 * before spending the next request (see mdbPageGeneration in global.js). An empty array on
 * every failure - the box then simply stays away, as it does for a video with no tracklist.
 */
function getYtVideoComments( ytId, done ) {
    logFunc( "getYtVideoComments" );

    var pageGeneration = mdbPageGeneration,
        bodies = [],
        pages = 0;

    function readPage( token ) {
        ytInnertubeNext({ continuation: token }, function( answer ) {
            if( !mdbIsCurrentPage( pageGeneration ) ) return;

            pages++;
            bodies = bodies.concat( ytCommentBodies( answer ) );

            logVar( "getYtVideoComments: comments read after page " + pages, bodies.length );

            var next = ytCommentsNextToken( answer );

            // One more page only while nothing has been found: the detector runs again over
            // everything in the creator, so this ask is purely about whether the next request
            // is worth sending.
            if( next && pages < ytCommentPagesMax && !mdbTracklist_detectInComments( bodies ) ) {
                readPage( next );
                return;
            }

            done( bodies );
        });
    }

    ytInnertubeNext({ videoId: ytId }, function( answer ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        var token = ytCommentsToken( answer );

        if( !token ) {
            log( "getYtVideoComments: no comment section in the answer - comments are off for this video, or YouTube did not answer this session (see getYtVideoData)." );
            done( [] );
            return;
        }

        readPage( token );
    });
}

/*
 * MixesDB Page Creator (shared/page_creator/)
 * The suggested-title row above the toolkit, in the #mdb-yt-extras wrapper. Everything
 * site-specific is read off the video data here and handed over - the creator itself never
 * looks at a YouTube page.
 * channelTrust "low" is the important hand-over: a YouTube channel is a broadcaster or
 * re-uploader at least as often as it is the artist or the series, so the title builder must
 * not fall back to its name as artist/entity without backing (the name standing in the title,
 * a curated map entry, or MixesDB knowing it) - see mdbPageCreator_add()'s header comment.
 * The description IS handed to the shared tracklist detection, like on SoundCloud: YouTube
 * uploaders write their tracklist into it often enough. loadComments is handed over as well,
 * for the ones who do not - see the Comments section above; it is only ever called when the
 * description held nothing.
 */
function addYtPageCreator( ytId, dur_sec ) {
    // the video lookup can be a round trip - drop the answer if the user has clicked on to
    // the next video meanwhile (see mdbPageGeneration in global.js)
    var pageGeneration = mdbPageGeneration;

    getYtVideoData( ytId, function( data ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        if( !data || !data.title ) {
            log( "addYtPageCreator: no usable video data - no Page Creator row." );
            ytPageCreatorSettled = true; // decided: nothing more is coming, let the skeleton go
            return;
        }

        logVar( "addYtPageCreator: title", data.title );
        logVar( "addYtPageCreator: channel", data.channel );
        logVar( "addYtPageCreator: createdAt", data.createdAt );

        mdbPageCreator_add({
            title:        data.title,
            channel:      data.channel,
            // YouTube channels are often unrelated to who played - see the comment above
            channelTrust: "low",
            createdAt:    data.createdAt,
            durationMs:   ( data.durationSec || dur_sec || 0 ) * 1000,
            // the form MixesDB embeds - same URL the toolkit looks the video up with
            playerUrl:    "https://youtu.be/" + ytId,
            channelUrl:   data.channelUrl,
            // same maxresdefault the thumbnail feature links; for MixesDB's upload form
            artworkUrl:   "https://i.ytimg.com/vi/" + ytId + "/maxresdefault.jpg",
            // the TITLE builder reads the labels a description tracklist credits out of this
            // ("Artist - Title [Label]") - the tracklist box is the separate call below
            description:  data.description,
            sourceLabel:  "YT",
            // first thing in the extras wrapper, above the toolkit - a direct child, so the
            // loading skeleton covers it
            target:       "#mdb-yt-extras",
            placement:    "prepend"
        });

        ytPageCreatorSettled = true; // the row is in - the skeleton may reveal now

        // The tracklist an uploader wrote into the description, as an editable box below the
        // toolkit that rides along into the created page - and, when the description holds
        // none, the one somebody posted as a comment.
        // Not gated on a description being there: a video with an empty description is exactly
        // the case where the comments are the only source, and the detector answers an empty
        // text with "nothing found" like any other.
        mdbPageCreator_addTracklist({
            description:  data.description,
            loadComments: function( done ) {
                getYtVideoComments( ytId, done );
            },
            target:       "#mdb-toolkit",
            placement:    "after"
        });
    });
}

function addDurationEnhancements() {
    var ytId = resolveYoutubeId();

    if( !ytId || youtubeDurationAddedFor === ytId ) return;

    var dur_sec = getDurationSec_YT( ytId );
    if( !dur_sec ) return true; // player not ready yet - ask again on the next poll

    var dur = convertHMS( dur_sec ),
        // The duration button goes right below the thumbnail we add ourselves instead of into
        // YouTube's own action row: keeps both of our additions together and out of the row
        // YouTube keeps re-rendering.
        buttonTarget = $(".mdb-thumbImgLink-wrapper").first();

    // The thumbnail is added by addDetailPageEnhancements(), so the button's anchor can still
    // be missing when the player is already up - ask again on the next poll instead of marking
    // this video off with nothing added.
    if( !buttonTarget.length ) return true;

    if( !$("#mdb-fileInfo").length ) {
        buttonTarget.after('<button id="mdb-fileInfo" class="mdb-element mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details">'+dur+'</button>');
    }

    // Directly below its own button, not down at YouTube's description: the toggle opens where
    // the user clicked instead of somewhere further down the page.
    if( !$("#mdb-fileDetails").length ) {
        $("#mdb-fileInfo").after( getFileDetails_forToggle( dur_sec ) );
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

/*
 * Changelog
 *
 * 2026.09.02.1
 * Page Creator (page_creator.js v_125, CSS): a dropdown behind "Create" for the file details
 * body - the dur table with this file's duration, {{StandardShow1h}} or {{StandardShow2h}} (plus
 * the siblings' own template where it is another one). Shown only where the entity's recent
 * pages could not decide it: no known show category, a vote under the 90% bar, a template this
 * file's duration contradicts, a failed fetch or too few pages. Opens on what the page text
 * writes anyway; a pick rides into the created page and is named in the reasoning panel.
 *
 * 2026.08.28.1
 * The tracklist box no longer needs the description: when the uploader wrote none, the video's
 * top COMMENTS are read for one (getYtVideoComments). YouTube has no endpoint for comments, so
 * it is /youtubei/v1/next twice - once for the video, which hands out the comment section's
 * continuation token, once with that token for a page of comments - same origin and no API key,
 * like the player call above it. Two pages at most, and the second only when the first held
 * nothing; a video whose description carries the tracklist costs no request at all. The shared
 * detector (tracklist_detector.js v_15) decides what is a tracklist, as it does for the
 * description, and it learned the shape these comments are written in on the way: a timestamp
 * in front of every track ("00:36 = Power Tool - Madness") is put into the brackets MixesDB
 * writes a cue in, because the API reads the bare form as the line's numbering and leaves
 * "# 36 = Power Tool - Madness" of it.
 *
 * 2026.08.27.6
 * Via the shared Page Creator (page_creator.js v_121): the lead artwork line no longer goes
 * missing because ONE sibling's file name spells a character the wiki cannot put in a file
 * name. MediaWiki replaces ":", "/" and "\\" with a "-" on upload, so
 * "2017-09-21 - Mohr/Sula - Transmittal Tapes 6" is filed as "... - Mohr-Sula - ....jpg". That
 * page read as "artwork named after something else", 6 of 7 is not 90%, and reasoning section 7
 * said "no 90% agreement -> no image line" although all seven Transmittal Tapes pages open with
 * their own artwork (reported 2026-08-27). Both sides use the uploaded name now - the vote and
 * the [[File:]] line the new page is given, which for such a title used to point at a name the
 * uploader can never create. Second change on the same vote: where the sample splits between
 * "named after the page" and "named after something else" but NOT ONE page is without an
 * artwork, the majority answer wins instead of the vote abstaining - a series where every page
 * has a picture must not get its first page without one. A single page without an artwork still
 * puts the 90% bar back in charge, and a venue's or event's pages, which lead with "named after
 * something else", decide as before.
 *
 * 2026.08.27.4
 * The Page Creator row now arrives seconds after the toolkit instead of ~20s, and the loading
 * skeleton waits for it. Two fixes: getYtVideoData no longer polls window.ytInitialPlayerResponse
 * for 10s when that global is not VISIBLE at all - Tampermonkey runs the script in an isolated
 * world under Chrome MV3, where the page's globals never show up, so it asks the page's own
 * player API right away and only a genuinely STALE response (the SPA case) still gets the poll.
 * And the skeleton got an extraReady() for the row (new ytPageCreatorSettled), so it no longer
 * reveals a toolkit-only box with the row popping in below it afterwards.
 * The row is also sized properly on YouTube now (page_creator.css): its font sizes were stated
 * in rem, and YouTube's root font size is 10px, which made the whole row a third smaller than
 * the toolkit under it. Every size in the row is px now, so all three sites match.
 *
 * 2026.08.27.3
 * MixesDB Page Creator on watch pages (shared/page_creator/, new @requires): the suggested
 * page title, the "Create" link and the description's tracklist box, above/below the toolkit
 * in the new #mdb-yt-extras wrapper - only for videos long enough for a mix, behind the same
 * 20 min gate as the toolkit. Video data comes fresh per video id (getYtVideoData):
 * ytInitialPlayerResponse when it matches, else the page's own /youtubei/v1/player API, else
 * the DOM. channelTrust "low" tells the title builder not to fall back to the channel name
 * without backing - YouTube channels are often broadcasters/re-uploaders, not who played.
 * The wrapper's build-up is covered by the shared loading skeleton with the Page Creator row
 * and the toolkit as two separate grey boxes (split skeleton, like TrackId.net) - with light
 * greys in YouTube's light mode (page_creator.css site rules).
 */
