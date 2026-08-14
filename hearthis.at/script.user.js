// ==UserScript==
// @name         hearthis.at (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.14.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/shared/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-hearthis.at_14
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-hearthis.at_24
// @include      http*hearthis.at*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hearthis.at
// @noframes
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var cacheVersion = 11,
    scriptName = "hearthis.at";
window.scriptName = scriptName; // toolkit.js reads this global directly

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On player pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Everything below reads the page out of the <meta> tags and the DOM, so it all has to run
 * again once hearthis has swapped in another track - see onUrlChange() in global.js.
 */
function runHearthisPage() {
    var pageUrl_meta = $('meta[property="og:url"]').attr("content"), // e.g. https://hearthis.at/andrei-mor/01-cultureshockandgrafix-radio1sessentialmix-sat-01-18-2025-talion/">
        pageId_meta = $('meta[property="hearthis:embed:id"]').attr("content"), // e.g. 11703627
        titleText = $('meta[property="og:title"]').attr("content") || document.title.replace(/\s*\|\s*HearThis.*$/i, ""), // e.g. Culture Shock &amp; Grafix - Radio 1's Essential Mix 2025-01-18
        toolkitTarget = $("section.track-detail-header"),
        pageUrl = pageUrl_meta || removeParametersFromUrl( location.href ),
        pageId = pageId_meta;

    if( !pageId && isHearthisIdUrl(pageUrl) ) {
        pageId = pageUrl.split("/")[3];
    }

    logVar( "pageUrl", pageUrl );
    logVar( "pageId", pageId );
    logVar( "toolkitTarget.length", toolkitTarget.length );

    if( urlPath(2) && toolkitTarget.length == 1 && pageUrl != "" && pageId != "" ) {
        logFunc( "On player pages" );

        var pageUrl_short = 'https://hearthis.at/'+pageId+'/';

        // Pass the canonical detail URL so toolkit.js can search both detail and short/embed variants
        getToolkit( pageUrl, "playerUrl", "detail page", toolkitTarget, "after", titleText, "", 2, pageUrl_short );
    }
}

onUrlChange( runHearthisPage, { runNow: true } );

})();
