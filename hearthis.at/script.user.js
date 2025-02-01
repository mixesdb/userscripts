// ==UserScript==
// @name         hearthis.at (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.02.01.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-hearthis.at_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-hearthis.at_3
// @include      http*hearthis.at*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hearthis.at
// @noframes
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
    scriptName = "hearthis.at",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 50 );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On player pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var pageUrl = $('meta[property="og:url"]').attr("content"), // e.g. https://hearthis.at/andrei-mor/01-cultureshockandgrafix-radio1sessentialmix-sat-01-18-2025-talion/">
    pageId = $('meta[property="hearthis:embed:id"]').attr("content"), // e.g. 11703627
    titleText = $('meta[property="og:title"]').attr("content"), // e.g. Culture Shock &amp; Grafix - Radio 1's Essential Mix 2025-01-18
    toolkitTarget = $("section.track-detail-header");

logVar( "pageUrl", pageUrl );
logVar( "pageId", pageId );
logVar( "toolkitTarget.length", toolkitTarget.length );

if( urlPath(2) && toolkitTarget.length == 1 && pageUrl != "" && pageId != "" ) {
    logFunc( "On player pages" );

    var pageUrl_short = 'https://hearthis.at/'+pageId+'/';

    getToolkit( pageUrl, "playerUrl", "detail page", toolkitTarget, "after", titleText, "", 2 );
    getToolkit( pageUrl_short, "playerUrl", "detail page", toolkitTarget, "after", titleText, "", 2 );
}