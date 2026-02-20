// ==UserScript==
// @name         Player Checker (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.20.6
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
https://finn-johannsen.de/2026/01/28/finn-johannsen-full-support-2026-01-28/
https://finn-johannsen.de/2025/11/04/at-the-top-of-the-stairs-0044-all-that-scratching-is-making-me-glitch/
https://finn-johannsen.de/2025/06/19/finn-johannsen-finn-johannsen-go-check-the-survey-vol-1-3-pepe-bradock/
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
            //break;
            return;

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

if( visitDomain == "finn-johannsen.de" ) {
    $(".post").each(function(){
        var $post = $(this);

        // Collect tracklists from BOTH:
        // - <p> blocks with timestamps + <br>
        // - <figure class="wp-block-table"> tables (2 columns: Title | Artist)
        var items = [];

        // Every <p> that contains a tracklist (timestamp + index at line start)
        // NOTE: Freeze the list first so DOM changes (textarea insert, fixTLbox) can't mess with iteration
        var pList = $post.find("p").get();

        for( var i = 0; i < pList.length; i++ ) {

            var $p = $(pList[i]);

            // Make pure text (convert <br> to \n, keep entities decoded by jQuery)
            var html = $p.html();
            if( !html ) continue;

            // Convert <br> to \n
            var html_nl = html.replace(/<br\s*\/?>/gi, "\n");

            // Decode HTML entities properly (e.g. &amp; -> &)
            var tmp = document.createElement("div");
            tmp.innerHTML = html_nl;

            var tl = tmp.textContent.trim();

            // Reject if no timestamp at line start (multiline)
            // - Some lists have track numbers after the timestamp, some don't
            if( !/^\s*\d{2}:\d{2}:\d{2}\s+/m.test(tl) ) continue;

            var tl_rows = tl.split(/\r?\n/).filter(Boolean).length;

            log("tl before API:\n" + tl);
            logVar("tl_rows", tl_rows);

            // Make track number optional:
            // 00:00:00 1 Artist – Title  -> [00:00:00] Artist – Title
            // 00:00:00 Artist – Title    -> [00:00:00] Artist – Title
            var tl_fixed = tl.replace( /^0?([\d:]+)\s+(?:\d+\s+)?(.+)$/gm, "[$1] $2" );

            if( tl_rows > 8 ) { // sanity check if p-tag is tracklist
                items.push({
                    anchor: $p,
                    tl_fixed: tl_fixed,
                    tl_rows: tl_rows
                });
            } else {
                log( "Not detected as tracklist." );
            }
        }

        // Tables that are tracklists (2 columns)
        // Build: td2 + " - " + td1 + "\n"
        var figList = $post.find("figure.wp-block-table").get();

        for( var j = 0; j < figList.length; j++ ) {

            var $fig = $(figList[j]);
            var $rows = $fig.find("tr");

            if( $rows.length < 3 ) continue; // sanity: ignore tiny tables

            var out = [];

            $rows.each(function(){

                var $td = $("td", this);
                if( $td.length < 2 ) return;

                var td1 = $td.eq(0).text().replace(/\s+/g, " ").trim(); // Title
                var td2 = $td.eq(1).text().replace(/\s+/g, " ").trim(); // Artist

                // Fallback handling for empty cells
                if( !td1 ) td1 = "?";
                if( !td2 ) td2 = "?";

                out.push( td2 + " - " + td1 );
            });

            if( out.length < 8 ) continue; // sanity check if table is tracklist

            var tl_table = out.join("\n");
            var tl_rows_table = out.length;

            log("tl (table) before API:\n" + tl_table);
            logVar("tl_rows (table)", tl_rows_table);

            items.push({
                anchor: $fig,
                tl_fixed: tl_table,
                tl_rows: tl_rows_table
            });
        }

        // Render all detected tracklists (multiple per post supported)
        for( var k = 0; k < items.length; k++ ) {

            var it = items[k];

            // Create textarea that keeps each track on ONE visual line (no soft wrap)
            var ta = '<textarea class="mixesdb-TLbox mono" ' +
                     'wrap="off" ' +
                     'style="display:none; width:100%; margin:10px 0 0 0; white-space:pre; overflow-x:auto; resize:vertical;" ' +
                     'rows="' + it.tl_rows + '"></textarea>';

            it.anchor.before(ta);

            it.anchor.prev("textarea.mixesdb-TLbox")
                .val( it.tl_fixed )
                .show();

            //fixTLbox( res.feedback );
        }
    });
}