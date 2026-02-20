// ==UserScript==
// @name         Player Checker (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.012.20.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Player_Checker/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Player_Checker/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Player_Checker_8
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-Player_Checker_22
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v-Player_Checker_1
// @include      http*finn-johannsen.de*
// @include      http*groove.de/*/*/*/*podcast*
// @include      http*ra.co/news/*
// @include      http*ra.co/podcast/*
// @include      http*wearesoundspace.com/*
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
https://finn-johannsen.de
https://finn-johannsen.de/2026/02/18/finn-johannsen-full-support-2026-02-18/
https://groove.de/2025/01/29/groove-podcast-447-albert-van-abbe/
https://groove.de/2025/01/15/benjamin-roeder-charlie-groove-resident-podcast-60/
https://ra.co/podcast/970
https://de.ra.co/podcast/970
https://www.toxicfamily.de/2024/09/26/tofa-nightshift-vom-25-09-2024-mit-grille-in-the-mix/
https://wearesoundspace.com/mix386-luca-olivotto/
https://wearesoundspace.com/in-focus-008-break-3000-dirt-crew-recordings/
*/


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 8,
    scriptName = "Player_Checker";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


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
    logFunc( "Player Checker toolkit" );

    // playerUrlItems after timeout
    // not hidden ones like googletagmanager
    var playerUrlItems = [ $("iframe:visible").length ];

    log_playerUrlItems_len( playerUrlItems, "after timeout ("+playerUrlItems_timeout+")" );

    var max_toolboxIterations = get_playerUrlItems_len( playerUrlItems );
    var titleText = normalizeWebsiteTitles( $('meta[property="og:title"]').attr("content") );

    logVar( "max_toolboxIterations", max_toolboxIterations );

    // wrapper configuration (domain-based)
    let wrapper;
    let wrapper_append;

    switch (visitDomain) {

        case "finn-johannsen.de":
            wrapper         = "iframe.mdb-processed-toolkit";
            wrapper_append  = "after";
            break;

        default:
            wrapper         = "iframe.mdb-processed-toolkit:first";
            wrapper_append  = "before";
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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklists
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

if( visitDomain == "finn-johannsen.de" ) {
    var tl_wrapper = $(".post p:first");

    // Convert <br> to newline, strip remaining HTML
    var tl = tl_wrapper
        .html()
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();

    var tl_rows = tl.split(/\r?\n/).filter(Boolean).length;

    log("tl before API:\n" + tl);
    logVar("tl_rows", tl_rows);

    var tl_fixed = tl.replace( /^0?([\d:]+) \d+ (.+)/gm, "[$1] $2" );

    if( tl_rows > 8 ) { // sanity check if p-tag is tracklist
        tl_wrapper.before(ta);

        /*
        var res = apiTracklist( tl_fixed, "Standard" ),
            tlApi = res.text;
        log( 'tlApi ("trackidNet"):\n' + tlApi );
        */
        $("#mixesdb-TLbox")
            .addClass("mixesdb-TLbox")
            .val( tl_fixed )
            .show();

        //fixTLbox( res.feedback );
        fixTLbox();
        $("#mixesdb-TLbox").css("height","");
    } else {
        log( "Not detected as tracklist." );
    }
}