// ==UserScript==
// @name         Mixcloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.17.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Mixcloud_5
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
    cacheVersion = 1,
    scriptName = "Mixcloud",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

//loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// createToggleApiArea
function createToggleApiArea(urlVar) {
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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Action buttons
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// on tracks
if( urlPath(2) != "" ) {
    waitForKeyElements('button[aria-label="Add To"]:not(.processed)', function( jNode ) {
        jNode.addClass("processed");

        // create wrappers to ensure prefered order of async created elements
        jNode.after( '<span id="mdb-apiLink-wrapper"></span><span id="mdb-tidSubmit-wrapper"></span>' );

        // add api toggle link
        var apiUrl = url.replace( /(www\.)?mixcloud\.com/, "api.mixcloud.com" ),
            apiButton = '<a class="mdb-actionLink mdb-apiLink mdb-mc-text" href="javascript:void(o);" data-apiurl="'+apiUrl+'" target="_blank">API</a>';
        logVar( "apiUrl", apiUrl );
        $("#mdb-apiLink-wrapper").after( apiButton );

        // add TID submit link
        var keywords = $('meta[property="og:title"]').attr("content"),
            tidSubmitUrl = makeTidSubmitUrl( url, keywords ),
            tidLink = '<a class="mdb-actionLink mdb-tidSubmit" href="'+tidSubmitUrl+'" target="_blank"><img src="'+tidIconUrl+'" alt=TrackId.net Logo" /></a>';
        $("#mdb-tidSubmit-wrapper").after( tidLink );
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