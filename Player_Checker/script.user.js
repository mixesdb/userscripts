// ==UserScript==
// @name         Player Checker (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.02.03.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Player_Checker/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Player_Checker/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Player_Checker_6
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-Player_Checker_5
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v-Player_Checker_1
// @include      http*groove.de/*/*/*/*podcast*
// @include      http*ra.co/podcast/*
// @include      http*wearesoundspace.com/*mix*
// @include      http*toxicfamily.de/*/*/*/*
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Matching URLs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
https://groove.de/2025/01/29/groove-podcast-447-albert-van-abbe/
https://groove.de/2025/01/15/benjamin-roeder-charlie-groove-resident-podcast-60/
https://ra.co/podcast/970
https://de.ra.co/podcast/970
https://www.toxicfamily.de/2024/09/26/tofa-nightshift-vom-25-09-2024-mit-grille-in-the-mix/
https://wearesoundspace.com/mix386-luca-olivotto/
*/


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var dev = 0,
    cacheVersion = 7,
    scriptName = "Player_Checker",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var playerUrlItems_timeout = 500;

// normalizeWebsiteTitles
function normalizeWebsiteTitles( titleText ) {
    return titleText
               .replace( " ⟋ RA Podcast", "" )
    ;
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// run after timeout
setTimeout(function() {
    logFunc( "Players Checker Toolkit" );

    // playerUrlItems after timeout
    // not hidden ones like googletagmanager
    var playerUrlItems = [ $("iframe:visible").length ];

    log_playerUrlItems_len( playerUrlItems, "after timeout ("+playerUrlItems_timeout+")" );

    var max_toolboxIterations = get_playerUrlItems_len( playerUrlItems );
    var titleText = normalizeWebsiteTitles( $('meta[property="og:title"]').attr("content") );

    logVar( "max_toolboxIterations", max_toolboxIterations );

    // wrapper
    switch( visitDomain ) {
        default:
            var wrapper = "iframe.mdb-processed-toolkit:first",
                wrapper_append = "before";
    }

    // let's go
    if( max_toolboxIterations > 0 ) {

        // visible iframes
        waitForKeyElements("iframe:not(.mdb-processed-toolkit)", function( jNode ) {
            var iframe = jNode;
            iframe.addClass("mdb-processed-toolkit");

            getToolkit_fromIframe( iframe, "playerUrl", "detail page", wrapper, wrapper_append, titleText, "", max_toolboxIterations );
        });
    }
}, playerUrlItems_timeout );