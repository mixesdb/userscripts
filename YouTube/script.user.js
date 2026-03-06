// ==UserScript==
// @name         YouTube (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.03.06.10
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-YouTube_16
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-YouTube_14
// @match        *://*.youtube.com/*
// @match        *://youtu.be/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-end
// ==/UserScript==

console.log( "YouTube userscript init" );

if( !/(^|\.)youtube\.com$/.test( window.location.hostname ) && window.location.hostname !== "youtu.be" ) {
    console.log( "YouTube userscript: skip non-YouTube host", window.location.hostname );
    return;
}

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 200 );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 12,
    scriptName = "YouTube";

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
