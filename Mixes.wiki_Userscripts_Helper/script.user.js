// ==UserScript==
// @name         MixesDB Userscripts Helper (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2024.12.26.1
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/MixesDB_userscripts_helper/script.user.js
// @downloadURL  https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/MixesDB_userscripts_helper/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-MixesDB_1
// @match        https://www.mixesdb.com/*
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * User settings
 * You need to set these on each update, but updates happen rarely for this script
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Apple Music links: force to open in browser?
// Keep 0 to use open the Music app
// Set 1 to open as normal browser tab on beta.music.apple.com (recommended)
var appleMusic_linksOpenInBrowser = 0; // default: 0

// Your Apple Music counry code, e.g. "de"
// All country codes: https://www.hiresedition.com/apple-music-country-codes.html
var appleMusic_countryCode_switch = ""; // default: ""


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * ToDos
 * Only URLs that are supported by TrackId.net: SoundCloud, Mixcloud, YouTube, hearthis.at
 * Rewrite to not require jQuery
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * TrackId.net support
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Quicker "Submit Request"
 */

// Prepare variables to check if we're on a mix page
var actionView =  $("body").hasClass("action-view") ? true : false,
    isNs0 = $("body").hasClass("ns-0") ? true : false,
    isMainPage = $("body").hasClass("rootpage-Main_Page") ? true : false;

log( "actionView: " + actionView );
log( "isNs0: " + isNs0 );
log( "isMainPage: " + isMainPage );


// Check if we're on a mix page
if( actionView && isNs0 && !isMainPage ) {
    log( "Criteria for mix page matched." );

    // On click add request page url for the first visible player
    $("#pageIconPlayers.trackIdNet").click(function(){
        var linkIcon = $("#pageIcons a.trackIdNet");

        // Prevent URLs from adding up after 1st click
        // otherwise the URLs add up and on 2nd click more than 2 tabs open
        var hrefOrig = linkIcon.attr("data-hreforig");
        linkIcon.attr("href", hrefOrig);

        // On click
        var urlSearch = linkIcon.attr("href").replace(/ /g,"%20"),
            requestPlayerUrl = $(".playerWrapper:visible[data-playerurl]").first().attr("data-playerurl"), // first visible player
            keywords = (new URL(urlSearch)).searchParams.get('keywords');
        logVar( "urlSearch", urlSearch );
        logVar( "keywords", keywords );

        if( requestPlayerUrl ) {
            log( "requestPlayerUrl: " + requestPlayerUrl );
            var urlRequest = "https://trackid.net/submitrequest?requestUrl="+requestPlayerUrl+"&keywords="+keywords;

            linkIcon.attr("href", urlRequest).attr("data-hreforig", urlSearch);

            log( "URL changed to: " + multiUrl );
        } else {
            log( "No first player URL found" );
        }
    });
} else {
    log( "Criteria for mix page not matched." );
}



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Change Apple Music links on tracks
 * Force link to open in browser instead of the Music app
 * Change URL to Apple Music Beta and custom country code
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".aff-iconlink.AppleMusic:not(.processed-userscript)", waitAppleMusicLinks);
waitForKeyElements(".aff-details-toprow-iTunesTitle a:not(.processed-userscript)", waitAppleMusicLinks);

function waitAppleMusicLinks(jNode) {
    jNode.addClass("processed-userscript");

    // https://music.apple.com/us/album/lunch/1739659134?i=1739659140&uo=4&app=music&at=1000l5EX
    // https://music.apple.com/de/search?at=1000l5EX&term=Floating%20Points%20Fast%20Foward
    var item_url = jNode.attr("href");

    // force link to open in browser
    logVar( "appleMusic_linksOpenInBrowser", appleMusic_linksOpenInBrowser );
    if( appleMusic_linksOpenInBrowser == 1 ) {
        // remove URL parameter app=music
        // album links have the app parameter by default, search links do not
        item_url = item_url.replace( "&app=music", "&app=browser" );

        // switch to beta (necessary to bypass Music app)
        item_url = item_url.replace( "music.apple.com", "beta.music.apple.com" );
    }

    // override country code
    logVar( "appleMusic_countryCode_switch", appleMusic_countryCode_switch );

    if( appleMusic_countryCode_switch != "" ) {
        item_url = item_url.replace( /music.apple.com\/..\//g, "music.apple.com/"+appleMusic_countryCode_switch+"/" );
    }

    // prepare url for switch
    if( appleMusic_linksOpenInBrowser == 1 || appleMusic_countryCode_switch != "" ) {
        jNode.attr( 'href', item_url );
    }

    // ensure link opens in new tab
    if( appleMusic_linksOpenInBrowser == 1 ) {
        jNode.click(function(e) {
            var url_open = item_url;
            log("click: " + url_open );
            e.preventDefault();
            window.open( url_open );
        });
    }
}
