// ==UserScript==
// @name         YouTube (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.08.27.8
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/YouTube/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-YouTube_12
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-YouTube_12
// @include      http*youtube.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @noframes
// @run-at       document-end
// ==/UserScript==


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

var ytId = getYoutubeIdFromUrl( url );

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

if( ytId ) {
    var playerUrl = "https://youtu.be/" + ytId,
        dur_sec_cache = null;
  
    waitForKeyElements( "#bottom-row", function( jNode ) {
        var titleText = $("#title h1").text(),
            wrapper = jNode;

        // Thumbnail as linked image
        var thumbImg_url = 'https://i.ytimg.com/vi/'+ytId+'/maxresdefault.jpg',
            thumbImg = '<div class="mdb-element mdb-thumbImgLink-wrapper left0"><a href="'+thumbImg_url+'" target="_blank"><img src="'+thumbImg_url+'"></a></div>';

        wrapper.after( thumbImg );

        // Toolkit
        getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "link", 1, playerUrl );
    });

    waitForKeyElements( ".ytp-time-duration", function() {
        setTimeout(function(){
            dur_sec_cache = getDurationSec_YT();
            if( !dur_sec_cache ) return;

            waitForKeyElements( "#top-level-buttons-computed", function( jNode ) {
                var dur = convertHMS( dur_sec_cache );
                jNode.prepend('<button id="mdb-fileInfo" class="mdb-element mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details">'+dur+'</button>');
            }, true );

            waitForKeyElements( "ytd-watch-metadata #description", function( jNode ) {
                jNode.before( getFileDetails_forToggle( dur_sec_cache ) );
            }, true );
        }, 1000 );
    }, true );
}

waitForKeyElements( ".mdb-toggle", function( jNode ) {
    jNode.click(function(){
<<<<<<< Updated upstream
        var toggleId = $(this).attr("data-toggleid"),
            target = $("#"+toggleId);
        target.slideToggle( 400 );
=======
        var toggleId = $(this).attr("data-toggleid");
        $("#"+toggleId).slideToggle( 250 );
>>>>>>> Stashed changes
        $(this).toggleClass("selected");

        var textarea = target.find("textarea");
        if( textarea.length ) textarea.click();
    });
});