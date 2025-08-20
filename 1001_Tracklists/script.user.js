// ==UserScript==
// @name         1001 Tracklists (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.04.20.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-1001_Tracklists_23
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-1001_Tracklists_21
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v-1001_Tracklists_1
// @include      http*1001tracklists.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1001tracklists.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 17,
    scriptName = "1001_Tracklists";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function thousandoneTl() {
    runMain = false;
    $(".adRow").remove();
    // remove hidden elements that appear in text
    $(".tlUserInfo").remove();
    $(".tgHid").remove();

    var t = $("#tlTab");
    if( t.length > 0 ) {
        var tl = "",
            li = $("#tlTab > div"),
            len = li.length,
            rows = len;

        li.each(function() {

            // track
            if( $(this).attr("data-trno") != "" ) {
                var track = "",
                    song = $("div .trackValue",this).text().trim(),
                    label = $("div[itemprop='tracks'] .trackLabel",this)
                                .map(function(){ return $(this).text().trim(); })
                                .get()
                                .join(" / "),
                    dur = $("div[data-mode='hours']",this).text().trim();

                if( dur != "" ) track = "["+dur+"] ";
                track += song;
                if( label != "" ) track += " ["+label+"]";

                //log( track );
                if( track != "" && track != " " )  {
                    tl += track + "\n";
                }
            }

            // chapter
            // https://www.1001tracklists.com/tracklist/y3gt5lt/dominik-koislmeyer-jetique-energy-extravadance-charts-2021-08-28.html
            if( $(".fRow",this).length === 1 ) {
                var chapter = $(".fRow a",this).text().trim();
                if( chapter != "" ) tl += ";" + chapter + "\n";
            }

            // song chapter
            var span = $("span",this);
            if( span.attr("id") && span.attr("id").replace(/.+_(headtext_column)$/g, "$1") == "headtext_column" ) {
                var intro = span.text().trim().replace(/:$/g,"");
                if( intro != "" ) tl += "''" + intro + ":'' ";
            }
        });

        //log( tl );

        // fixes
        var tl = tl.replace('&thinsp;', ' ')
                   .replace(' (ID Remix) (ID Remix)', ' (ID Remix)')
                   .replace(/;(.+)\n\n;(.+)/g, ';$1 - $2')
                   .replace(/undefined - undefined/gi, '?');

        // dur fixes
        if( /\[\d+:\d+]/.test(tl) ) {
            tl = tl.replace( /\[(\d)] /, "[0$1:00] " )
                   .replace( /\[(\d+)] /, "[$1:00] " );
        }
        if( /\[\d\d:\d\d]/.test(tl) && /\[1:\d\d:\d\d]/.test(tl) ) {
            tl = tl.replace( /\[(\d\d:\d\d)] /gm, "[0:$1] " );
            tl = tl.replace( /\[(\d:\d\d)] /gm, "[0:0$1] " );
        }

        var res = apiTracklist( tl, "thousandoneTl" ),
            tlApi = res.text,
            feedback = res.feedback;

        if( tlApi ) {
            t.prepend( ta );
            $("#mixesdb-TLbox").css("position","inherit").append( tlApi );
            fixTLbox( res.feedback );
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Run funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var runMain = true;
if( urlPath(1) == "tracklist") {
    waitForKeyElements("#tlTab .trackValue", function( jNode ) {
        if( runMain ) {
            thousandoneTl();
        }
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var playerUrlItems_timeout = 500;

// log playerUrlItems before timeout
var playerUrlItems = [ $("div.iMediaP iframe").length,
                       $(".mediaTabItm.hidden li.mediaTab2 a").length
                     ];
log_playerUrlItems_len( playerUrlItems, "before timeout ("+playerUrlItems_timeout+")" );

// run after timeout
setTimeout(function() {
    // log playerUrlItems after timeout
    var playerUrlItems = [ $("div.iMediaP iframe").length,
                           $(".mediaTabItm.hidden li.mediaTab2 a").length
                         ];
    log_playerUrlItems_len( playerUrlItems, "after timeout ("+playerUrlItems_timeout+")" );

    var max_toolboxIterations = get_playerUrlItems_len( playerUrlItems );

    // let's go
    if( max_toolboxIterations > 0 ) {
        var titleText = $("#pageTitle h1").text(),
            wrapper = $(".mItems");

        /*
         * Visible and hidden iframes
         */
        waitForKeyElements("div.iMediaP iframe:not(.mdb-processed-toolkit)", function( jNode ) {
            var iframe = jNode;
            iframe.addClass("mdb-processed-toolkit");

            getToolkit_fromIframe( iframe, "playerUrl", "detail page", wrapper, "after", titleText, "", max_toolboxIterations );
        });

        /*
         * Tab links without iframe
         */
        waitForKeyElements(".mediaTabItm.hidden li.mediaTab2 a:not(.mdb-processed-toolkit)", function( jNode ) {
            jNode.addClass("mdb-processed-toolkit");

            var playerUrl = jNode.attr("href");
            logVar( "playerUrl pre func", playerUrl );

            // podcasts.apple.com
            if( /.+podcasts\.apple\.com.+/.test(playerUrl) ) {
                log( "Apple Podcasts" );
                getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", max_toolboxIterations );
            }
        });
    }
}, playerUrlItems_timeout );

/*
 * Compare page creation date to MixesDB last edit date
 * only on positive usage results
 */
waitForKeyElements(".mdb-mixesdbLink.lastEdit", function( jNode ) {
    var pageCreationTimestamp = $('time[itemprop="datePublished"]').text()
                                    .trim()
                                    // 2023-11-04 07:17:24
                                    .replace(/(\d{4}-\d{2}-\d{2}) (\d+:\d+:\d+)$/, "$1T$2Z" )
                                ;
    
    var lastEditTimestamp = jNode.attr("data-lastedittimestamp"); // 2025-01-28T20:26:13Z
    
    pageCreated_vs_lastEdit( pageCreationTimestamp, lastEditTimestamp );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Remove adblocker blocker
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements("#overlay", function( jNode ) {
    jNode.remove();
});

waitForKeyElements("#btn_msgpane_ok", function( jNode ) {
    jNode.click();
});
