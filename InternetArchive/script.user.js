// ==UserScript==
// @name         Internet Archive (by MixesDB) (BETA)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.12.11.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-InternetArchive_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-InternetArchive_1
// @require      https://cdn.jsdelivr.net/npm/sorttable@1.0.2/sorttable.js
// @include      http*archive.org/details/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=archive.org
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

var cacheVersion = 6,
    scriptName = "InternetArchive";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * playsetLists
 * https://archive.org/details/Clubnight2011
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var playsetList_wrapper = $("#theatre-ia-wrap");

if( playsetList_wrapper.length ) {
    var playsetList_item = $('div[itemprop="hasPart"]', playsetList_wrapper);

    /*
     * Prepare mdb table
     */
    var playsetList_mdbTable_html = '<section id="playsetList_mdbTable_wrapper">';
    playsetList_mdbTable_html    +=   '<table id="playsetList_mdbTable" class="mdb-element sortable">';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" class="mdb-center" title="Sortable">#</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" title="Sortable">Name</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" title="Sortable">Detail</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" title="Sortable">Dur</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" class="sorttable_nosort">DL</th>';
    playsetList_mdbTable_html    +=   '</table>';
    playsetList_mdbTable_html    += '</section>';

    playsetList_wrapper.after( playsetList_mdbTable_html );

    var playsetList_mdbTable = $("#playsetList_mdbTable");

    // each playsetList item
    var i = 0;
    playsetList_item.each(function(){
        i++;

        /*
         * Extract values
         */
        var item_name = $('meta[itemprop="name"]', this).attr("content"); // Clubnight 2011.01.01
        var item_dur = $('meta[itemprop="duration"]', this).attr("content"); // PT0M7206S
        var item_url = $('link[itemprop="associatedMedia"]', this).first().attr("href"); // https://archive.org/download/Clubnight2011/Clubnight%202011.01.01%20-%20Motorcitysoul.ogg

        /*
         * Work with the values
         */
        // Name
        var episode = item_name;

        // detail
        var filename = decodeURIComponent(
                           item_url.split("/").pop() // get last part after "/"
                           .replace(/\.[^/.]+$/, "")       // remove extension
                       );
        var episode_detail = filename.replace( item_name + " - ", "" ); // Motorcitysoul

        // dur
        var dur = isoDurationToTime( item_dur ); // 2:00:06

        // download links
        var urls = [];
        $("link[itemprop='associatedMedia']", this).each(function() {
            var url = $(this).attr("href");
            if (url) urls.push(url);
        });
        // If we have mp3 and ogg → remove ogg(s)
        var hasMp3 = urls.some(u => u.toLowerCase().endsWith(".mp3"));
        if (hasMp3) {
            urls = urls.filter(u => !u.toLowerCase().endsWith(".ogg"));
        }
        // Build download links
        var formats = urls.map(function(url) {
            var ext = url.split(".").pop().toLowerCase();
            return '<a href="' + url + '" class="mdb-tooltip" data-tooltip="'+filename+'.'+ext+'">' + ext + '</a>';
        });
        var download_links = formats.join(' <span class="mdb-grey">|</span> ');

        /*
         * Add row to table
         */
        var episode_row = '<tr>';
        episode_row    +=    '<td class="mdb-right">'+i+'</td>';
        episode_row    +=    '<td>'+episode+'</td>';
        episode_row    +=    '<td>'+episode_detail+'</td>';
        episode_row    +=    '<td>'+dur+'</td>';
        episode_row    +=    '<td>'+download_links+'</td>';
        episode_row    += '</tr>';


        playsetList_mdbTable.append( episode_row );
    });

    /*
     * Metadata JS
     */
    waitForKeyElements( "input.js-ia-metadata", function( jNode ) {
        var arrString = jNode.attr("value");
        var apiIdentifier = "";

        try {
            var arr = JSON.parse( arrString );

            if ( Array.isArray( arr ) && arr.length ) {
                var arrItemWithMetadata = arr.find( function( item ) {
                    return item && item.metadata && item.metadata.identifier;
                } );

                apiIdentifier = arrItemWithMetadata?.metadata?.identifier
                || arr.find( function( item ) { return item && item.identifier; } )?.identifier
                || "";
            } else if ( arr && typeof arr === "object" ) {
                apiIdentifier = arr.metadata?.identifier || arr.identifier || "";
            }
        } catch ( error ) {
            console.error( "InternetArchive: Failed to parse metadata", error );
        }

        logVar( "arr", arrString );

        if ( apiIdentifier ) {
            var apiLink = $( '<div id="playsetList_apiLink" class="mdb-center"><a href="https://archive.org/metadata/' + apiIdentifier + '" target="_blank">API</a></div>' );
            $( "#playsetList_mdbTable" ).before( apiLink );
        }
    });
}