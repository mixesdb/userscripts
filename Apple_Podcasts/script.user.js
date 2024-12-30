// ==UserScript==
// @name         Apple Podcasts (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2024.12.30.1
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Podcasts/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Apple_Podcasts_1
// @match        https://*podcasts.apple.com/*
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// Dev environment
var dev = 0,
    cacheVersion = 1;


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var scriptName = "SoundCloud",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
//loadRawCss( pathRaw + "Apple_Podcasts/script.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edpisode links more usable
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".episode .link-action", episodeLinksWait);

function episodeLinksWait(jNode) {
    var url = jNode.attr("href"),
        dragLink = '<div style="margin-top:-1em"><input class="mdb-element" style="width:100%;" value="'+url+'" /></div>';
    jNode.closest("li").append( dragLink );
}