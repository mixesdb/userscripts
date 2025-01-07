// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.07.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_4
// @include      http*soundcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
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
    cacheVersion = 2,
    scriptName = "SoundCloud",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".listenArtworkWrapper", function( jNode ) {
    log( location.href );

    // Artwork link tzo original
    var artworkWrapper = $(".listenArtworkWrapper"),
        artwork_url = $(".sc-artwork",artworkWrapper).html().replace(/.+&quot;(htt.+(?:jpg|png)).+/, "$1");
    log( artworkWrapper.html() );
    logVar( "artwork_url", artwork_url );
    if( typeof artwork_url  !== "undefined" ) {
        append_artwork( artwork_url );
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Stream players > Favorite button
 *
 * TODO:
 * Enable in playlists https://soundcloud.com/resident-advisor
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".soundList__item .sc-button-like:not(.mdb-processed-favorited)", function( jNode ) {
    // is favorited
    if( jNode.hasClass("sc-button-selected") ) {
        var title = jNode.closest(".soundList__item").find(".soundTitle__title");
        log( "Favorite found: " + title.text() );

        // Highlight player title if favorited
        title.addClass("mdb-darkorange");
    }

    // mark as processed
    jNode.addClass("mdb-processed-favorited");
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Links in playlist sets
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// player links and link buttons
// https://soundcloud.com/resident-advisor/sets/ra-podcast
waitForKeyElements(".listenDetails__trackList li.trackList__item a.trackItem__trackTitle", function( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr("href") );

    jNode.attr( "href", playerUrlFixed )
         .attr( "target", "_blank" )
         .attr( "title", playerUrlFixed+" (opens in a new tab)" );
});

// Compact playlists
// https://soundcloud.com/resident-advisor
waitForKeyElements(".compactTrackList__listWrapper li.compactTrackList__item span.compactTrackListItem__trackTitle", function( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr( "data-permalink-path") );

    jNode.after( '<a href="'+playerUrlFixed+'" title="'+playerUrlFixed+' (opens in a new tab)" target="_blank" class="mdb-element mdb-copyLink sc-link-dark sc-link-primary sc-font-light">Link</a>' );
});

// .copyLink on click open new tab
waitForKeyElements(".mdb-copyLink", function( jNode ) {
    jNode.click(function(){
        var url = $(this).attr("href");
        window.open( url, "_blank" );
    });
});

// button to copy link (no href)
// hide it (would copy url with in parameter)
waitForKeyElements(".listenDetails__trackList li a.trackItem__trackTitle", function( jNode ) {
    jNode.hide();
});
waitForKeyElements(".listenDetails__trackList li button.sc-button-copylink", function( jNode ) {
    jNode.remove(); // hide() would make it flash on playlist pages
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Favorited buttons
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
// if favorited before, show hidden soundActions
waitForKeyElements(".listenDetails li .trackItem__actions:not(:visible)", function( jNode ) {
    jNode.css('margin-left','.5rem').show();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * [X] remove button
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
// if favorited before, show hidden soundActions
waitForKeyElements(".soundList__item .sound__body", function( jNode ) {
    var removeItem = '<div class="mdb-removeItem hand sc-text-grey" title="Remove the player (this session only)">X</div>';
    jNode.append( removeItem );
});

// on click
// scrolling is needed because it wouldn't load more when all visible are removed
waitForKeyElements(".soundList ul li .mdb-removeItem", function( jNode ) {
    $(".mdb-removeItem").click(function(){
        // keep lazy loading active
        $(".lazyInfo").remove();
        $(".lazyLoadingList__list, .userStream__list .soundList").after('<div style="text-align:center; margin-bottom:20px" class="lazyInfo">Problems loading more players? Try scrolling up and down.</div>');

        var y = $(window).scrollTop();
        $("html, body").animate({scrollTop:y + 1}, 0);
        $(this).closest('.soundList__item').remove();
        var y = $(window).scrollTop();
        $("html, body").delay(2).animate({scrollTop:y - 1}, 2);

        if( $(".paging-eof").is(':visible') ) {
            $('.lazyInfo').remove();
        }

        // remove
        $(this).closest(".soundList__item").remove();
    });
});