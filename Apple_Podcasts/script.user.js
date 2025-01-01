// ==UserScript==
// @name         Apple Podcasts (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.01.8
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
 * Referenced CSS files blocked by AP server!
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var css = '.mdb-element.search{margin:20px 30px 0}.mdb-element.search *{font-size:1.4rem}.mdb-element.search input[type=submit]{width:6em;margin-left:10px}.mdb-element.search input{padding:.5rem .75rem}.mdb-element.search input[type=text]{width:calc(100% - 6em - 10px)}.mdb-element.dragUrl{padding:2px 4px;}';
$("head").append('<style>'+css+'</style>');


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edpisode links more usable
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// makeDragLink
function makeDragUrl( url, classWrapper, cssWrapper, cssElement ) {
    return '<div class="mdb-element '+classWrapper+'" style="'+cssWrapper+'"><input class="mdb-element dragUrl" style="width: 100%; '+cssElement+'" value="'+url+'" /></div>';
}

/* On show pages, episode lists, search results (Episodes section) */
waitForKeyElements(".episode .link-action", episodeListWait);
function episodeListWait(jNode) {
    var episodeUrl = jNode.attr("href"),
        cssWrapper = 'padding: .25em 0 1em;';
    /*
    if( is_safari ) {
        cssWrapper = 'margin: -.6rem 0 0';
    }
    */

    var dragLink = makeDragUrl( episodeUrl, 'list', cssWrapper, '' );

    jNode.closest("li").append( dragLink );
}

/* On episode page */
waitForKeyElements(".container-detail-header", episodePageWait);
function episodePageWait(jNode) {
    var headings = $(".headings__subtitles", jNode),
        cssWrapper = 'margin-top: .5rem; width: 100%; max-width: 48em;',
        dragLink = makeDragUrl( location.href, 'header', cssWrapper, '' );

    headings.css("width", "100%");
    headings.after( dragLink );
}

/* On search result (Top Results section) */
waitForKeyElements(".top-search-lockup-wrapper", topResultWait);
function topResultWait( jNode ) {
    var episodeUrl = $("a.link-action", jNode).attr("href"),
        cssWrapper = 'margin: .35rem 0 0;';

    var dragLink = makeDragUrl( episodeUrl, 'topResult', cssWrapper, '' );

    jNode.append( dragLink );

    $(".section--mixedSearch li:first-of-type .mdb-element.dragUrl").select().focus();
}

/* Select dragUrl input */
waitForKeyElements(".mdb-element.header input.dragUrl", dragUrlInputWait);
function dragUrlInputWait(jNode) {
    jNode.select().focus();
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On search insert keywords in bigger form
 * When coming from search links, the keywords are not added to standard search input
 * extends MixesDB Userscripts Helper
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var keywords = getURLParameter( "term" ).trim();

logVar( "keywords", keywords );

if( keywords ) {
    waitForKeyElements(".navigation__header input.search-input__text-field", searchInputWait);
    function searchInputWait(jNode) {

        setTimeout(function() {
            var searchForm = '<form class="mdb-element search" action="/'+urlPath(1)+'/search"><input type="text" name="term" value="'+keywords+'"><input type="submit" value="Search"></form>';
            $("main .content-container").prepend( searchForm );

            // select search input if no other urls / results
            if( $(".mdb-element.dragUrl").length === 0 ) {
                  $(".mdb-element.search input[type=text]").select().focus();
            }

        }, 1250 );
    }
}