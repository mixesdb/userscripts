// ==UserScript==
// @name         Apple Podcasts (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.02.3
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Apple_Podcasts_7
// @match        https://*podcasts.apple.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=podcasts.apple.com
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
var css = 'img.mdb-logo {   background: #eee;   padding: 1px;}/* Search */.mdb-element.search { margin: 20px 30px 0;}.mdb-element.search * {    font-size: 1.4rem;}.mdb-element.search input[type=submit] { width: 6em; margin-left: 10px;}.mdb-element.search input {  padding: .5rem .75rem}.mdb-element.search input[type=text] {    width: calc(100% - 6em - 10px);}.mdb-searchLink-wrapper {   display: inline;}/* dragUrl */.mdb-element.dragUrl,.mdb-element.list {  float: right;   width: calc(100% - 35px) !important}.mdb-element.dragUrl {  max-height: 23px;   padding: 12px 4px !important;   width: 100% !important;}ol[data-testid=episodes-list] li {  clear: both;    padding-bottom: .35rem;}ol[data-testid=episodes-list] li img.mdb-logo { margin: .35rem 0 0; height: 22px;}h1.headings__title img.mdb-logo { height: 24px;   margin-left: 10px;}';
$("head").append('<style>'+css+'</style>');


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basic functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
// cleanupAddedElements
function cleanupAddedElements() {
    $(".mdb-element.search").remove();
}

// makeMdbSearchLink
function makeMdbSearchLink( titleText ) {
    var mdbLogo = '<img src="'+mdbLogoUrl_64+'" class="mdb-logo" alt="MixesDB Logo">';
    return '<div class="mdb-searchLink-wrapper"><a href="https://www.mixesdb.com/w/index.php?title=Special:Search&search='+encodeURIComponent( titleText )+'" target="_blank" title="Search \''+titleText+'\' on MixesDB">'+mdbLogo+'</a></div>';
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edpisode links more usable
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// makeDragLink
function makeDragUrl( url, classWrapper, cssWrapper, cssElement ) {
    return '<div class="mdb-element '+classWrapper+'" style="'+cssWrapper+'"><input class="mdb-element dragUrl" style="width: 100%; '+cssElement+'" value="'+url+'" /></div>';
}

/*
 * On show pages, episode lists, search results (Episodes section)
 */
waitForKeyElements(".episode .link-action", function( jNode ) {
    var episodeUrl = jNode.attr("href"),
        cssWrapper = 'padding: .25em 0 1em;';
    /*
    if( is_safari ) {
        cssWrapper = 'margin: -.6rem 0 0';
    }
    */

    var dragLink = makeDragUrl( episodeUrl, 'list', cssWrapper, '' );

    jNode.closest("li").append( dragLink );
});

/*
 * On episode page
 */
waitForKeyElements(".container-detail-header", function( jNode ) {
    var headings = $(".headings__subtitles", jNode),
        title = $("h1.headings__title"),
        titleText = title.text(),
        cssWrapper = 'margin-top: .5rem; width: 100%; max-width: 48em;',
        dragLink = makeDragUrl( location.href, 'header', cssWrapper, '' ),
        mdbSearchLink = makeMdbSearchLink( titleText );

    headings.css("width", "100%");
    headings.after( dragLink );
    title.append( mdbSearchLink );

    cleanupAddedElements();
});

// Select dragUrl input in header
waitForKeyElements(".mdb-element.header input.dragUrl", function( jNode ) {
    jNode.select().focus();
});

/*
 * On search result (Top Results section)
 */
waitForKeyElements(".top-search-lockup-wrapper", function( jNode ) {
    var episodeUrl = $("a.link-action", jNode).attr("href"),
        cssWrapper = 'margin: .35rem 0 0;';

    var dragLink = makeDragUrl( episodeUrl, 'topResult', cssWrapper, '' );

    jNode.append( dragLink );

    $(".section--mixedSearch li:first-of-type .mdb-element.dragUrl").select().focus();
});

/*
 * On show pages
 */
waitForKeyElements("ol[data-testid='episodes-list'] li", function( jNode ) {
    var titleLink = $(".episode-details__title-wrapper .multiline-clamp__text", jNode),
        titleText = titleLink.text(),
        mdbSearchLink = makeMdbSearchLink( titleText );

    jNode.append( mdbSearchLink );

    cleanupAddedElements();
});


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
    waitForKeyElements(".navigation__header input.search-input__text-field", function( jNode ) {
        setTimeout(function() {
            var searchForm = '<form class="mdb-element search" action="/'+urlPath(1)+'/search"><input type="text" name="term" value="'+keywords+'"><input type="submit" value="Search"></form>';
            $("main .content-container").prepend( searchForm );

            // select search input if no other urls / results
            if( $(".mdb-element.dragUrl").length === 0 ) {
                  $(".mdb-element.search input[type=text]").select().focus();
            }

        }, 1250 );
    });
}