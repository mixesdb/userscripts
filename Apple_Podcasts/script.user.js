// ==UserScript==
// @name         Apple Podcasts (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.01.1
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Apple_Podcasts_7
// @match        https://*podcasts.apple.com/*
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
    scriptName = "Apple_Podcasts",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edpisode links more usable
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// makeDragLink
function makeDragUrl( url, classWrapper, cssWrapper, cssElement ) {
    return '<div class="mdb-element '+classWrapper+'" style="'+cssWrapper+'"><input class="mdb-element dragUrl" style="width: 100%; '+cssElement+'" value="'+url+'" /></div>';
}

/* On show pages / episode lists */
waitForKeyElements(".episode .link-action", episodeListWait);
function episodeListWait(jNode) {
    var episodeUrl = jNode.attr("href"),
        cssWrapper = 'padding: .25em 0 1em;';

    if( is_safari ) {
        cssWrapper = 'margin: -.6rem 0 0';
    }

    var dragLink = makeDragUrl( episodeUrl, 'list', cssWrapper, '' );

    jNode.closest("li").append( dragLink );
}

/* On episode page */
waitForKeyElements(".container-detail-header", episodePageWait);
function episodePageWait(jNode) {
    var headings = $(".headings__subtitles", jNode),
        dragLink = makeDragUrl( location.href, 'header', 'width: 100%; max-width: 48em;', '' );
    headings.css("width", "100%");
    headings.after( dragLink );
}

/* Select dragUrl input */
waitForKeyElements(".mdb-element.header input.dragUrl", dragUrlInputWait);
function dragUrlInputWait(jNode) {
    jNode.select().focus();
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On search insert keywords when coming from search link
 * extends MixesDB Userscripts Helper
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var keywords = getURLParameter( "term" );

logVar( "keywords", keywords );

if( keywords ) {
    waitForKeyElements(".navigation__header input.search-input__text-field", searchInputWait);
    function searchInputWait(jNode) {

        setTimeout(function() {
            var searchForm = '<form class="mdb-element search" action="/'+urlPath(1)+'/search"><input type="text" name="term" value="'+keywords+'"><input type="submit" value="Search"></form>';
            $("main .page-container").prepend( searchForm );
            $(".mdb-element.search input[type=text]").focus().select();
        }, 500 );
    }
}