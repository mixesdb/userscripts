// ==UserScript==
// @name         Internet Archive (by MixesDB) (BETA)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.09.30.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-InternetArchive_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-InternetArchive_1
// @include      http*archive.org/details/*
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

var cacheVersion = 1,
    scriptName = "InternetArchive";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Run
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// playsetList
var playsetList_wrapper = $("#theatre-ia-wrap");

if( playsetList_wrapper.length == 1 ) {
    var playsetList_item = $('div[itemprop="hasPart"]', playsetList_wrapper);

    // prepare mdb table
    var playsetList_mdbTable_html = '<section id="playsetList_mdbTable_wrapper">';
    playsetList_mdbTable_html    +=   '<table id="playsetList_mdbTable" class="mdb-element">';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name">Duration</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name">Name</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name">Filename</th>';
    playsetList_mdbTable_html    +=   '</table>';
    playsetList_mdbTable_html    += '</section>';

    playsetList_wrapper.after( playsetList_mdbTable_html );

    var playsetList_mdbTable = $("#playsetList_mdbTable");

    // each playsetList item
    playsetList_item.each(function(){
        // Extract values
        var item_name = $('meta[itemprop="name"]', this).attr("content");
        var item_dur = $('meta[itemprop="duration"]', this).attr("content");
        var item_url = $('link[itemprop="associatedMedia"]', this).first().attr("href");

        // Work with the values
        var dur = isoDurationToTime( item_dur );
        var filename = decodeURIComponent(
                           item_url.split("/").pop() // get last part after "/"
                           .replace(/\.[^/.]+$/, "")       // remove extension
                       );

        playsetList_mdbTable.append( '<tr><td>'+dur+'</td><td>'+item_name+'</td><td>'+filename+'</td></tr>' );
    });
}