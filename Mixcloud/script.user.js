// ==UserScript==
// @name         Mixcloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.30.3
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Mixcloud_15
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-Mixcloud_7
// @include      http*mixcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixcloud.com
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

var dev = 0,
    cacheVersion = 5,
    scriptName = "Mixcloud",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 1000 );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// createToggleApiArea
function createToggleApiArea( urlVar ) {
    logFunc( "createToggleApiArea" );

    logVar( "urlVar", urlVar );

    $.get(urlVar, function( data ) {
        waitForKeyElements('div[data-testid="playerHero"]', function( jNode ) {

            var apiTextLinkified = linkify( data ),
                toggleArea = '<pre id="toggleApiText" class="mdb-element" style="display:none">'+ apiTextLinkified +'</pre>';

            jNode.next().append( toggleArea );
            $("#toggleApiText").slideDown();
        });
    }, "text" );
}

// appendArtworkInfo
function appendArtworkInfo( artwork_max_url, imgWrapper ) {
    logFunc( "appendArtworkInfo" );

    var img = new Image();

    img.onload = function(){
        var imageWidth = this.width,
            imageHeight = this.height,
            artworkInfo = imageWidth +'&thinsp;x&thinsp;'+ imageHeight,
            artworkInfo_link = '<a href="'+artwork_max_url+'" class="mdb-artwork-img mdb-mc-text-white" target="_blank">'+artworkInfo+'</a>';

        imgWrapper.after( '<div class="mdb-artwork-input-wrapper"><input id="mdb-artwork-input" class="mdb-selectOnClick" type="text" value="'+artwork_max_url+'" />'+artworkInfo_link+'</div>' );
    };
    img.src = artwork_max_url;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Original artwork
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
if( urlPath(2) != "" ) {
    waitForKeyElements('div[data-testid="playerHero"] img[data-in-view="true"]:not(.processed)', function( jNode ) {
        jNode.addClass("processed");

        var artwork_thumb_url = jNode.attr("src"),
            artwork_max_url = artwork_thumb_url.replace(/\/unsafe\/[0-9]+x[0-9]+\//, "/unsafe/0x0/"); /* https://community.metabrainz.org/t/is-there-a-native-optimal-size-for-cover-art-from-mixcloud/640075 */

        logVar( "artwork_max_url", artwork_max_url );

        appendArtworkInfo( artwork_max_url, jNode )
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Action buttons
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// on tracks
if( urlPath(2) != "" ) {
    waitForKeyElements('button[aria-label="Add To"]:not(.processed)', function( jNode ) {
        jNode.addClass("processed");

        var apiUrl = url.replace( /(www\.)?mixcloud\.com/, "api.mixcloud.com" );

        // add api toggle link
        var apiButton = '<a class="mdb-actionLink mdb-apiLink mdb-mc-text hand" data-apiurl="'+apiUrl+'" target="_blank">API</a>';
        logVar( "apiUrl", apiUrl );
        $("#mdb-apiLink-wrapper").after( apiButton );

        /*
         * Using API data
         */
        $.get(apiUrl, function( data ) {
            // add dur toggle
            var dur_sec = data["audio_length"],
                durToggleWrapper = getFileDetails_forToggle( dur_sec ),
                dur = convertHMS( dur_sec ),
                durToggleLink = '<a id="mdb-durToggleLink" class="mdb-actionLink mdb-mc-text hand">'+dur+'</a>';

            // add dur button
            $("#mdb-durToggle-wrapper").append( durToggleLink );

            // append toggle wrapper
                jNode.addClass("processed-dur");
                jNode.closest("div").after( '<div id="mdb-durToggle-wrapper-parent">'+durToggleWrapper+'</div>' );

            // toggle dur
            waitForKeyElements('#mdb-durToggleLink', function( jNode ) {
                jNode.click(function(){
                    log("click");
                    $("#mdb-fileDetails").toggle();
                    $("#mdb-fileDetails textarea").select().focus();
                });
            });

            // add TID submit link to toolkit
            waitForKeyElements("#mdb-toolkit > ul", function( jNode ) {
                var keywords = $('meta[property="og:title"]').attr("content"),
                    tidLink = makeTidSubmitLink( data["url"], keywords, "text" );
                if( tidLink ) {
                    jNode.append( tidLink );
                }
            });

        }, "json" );
    });

    // api link on click
    waitForKeyElements(".mdb-apiLink", function( jNode ) {
        jNode.click(function(){
            var apiUrl = jNode.attr("data-apiurl"),
                apiToggleArea = $("#toggleApiText");

            if( apiToggleArea.length == 0 ) {
                createToggleApiArea( apiUrl );
            } else {
                ( apiToggleArea.is(':visible') ) ? apiToggleArea.slideUp() : apiToggleArea.slideDown();
            }
        });
    });
}


/*
 * Toolkit
 */
waitForKeyElements('div[data-testid="playerHero"] + div + div:not(.mdb-processed-toolkit)', function( jNode ) {
    var titleText = $("h1").text();
    getToolkit( location.href, "playerUrl", "detail page", jNode, "prepend", titleText, "", "addActionLinks-not" );

    jNode.addClass("mdb-processed-toolkit");
});