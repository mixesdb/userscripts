// ==UserScript==
// @name         radioeins (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.04.27.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/radioeinse/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/radioeinse/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-radioeins_1
// @include      http*radioeins.de*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=radioeins.de
// @noframes
// @run-at       document-end
// ==/UserScript==

var cacheVersion = 1,
    scriptName = "radioeins";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );

function buildTracklistFromTable( tableNode ) {
    var table = $(tableNode);

    if( table.hasClass("mdb-processed-tracklist") ) {
        return;
    }

    var rows = table.find("tr").filter(function(){
        return $(this).find(".trackinterpret, .tracktitle").length > 0;
    });

    if( rows.length === 0 ) {
        return;
    }

    var lines = [];

    rows.each(function(){
        var row = $(this),
            artist = row.find(".trackinterpret").first().text().replace(/\s+/g, " ").trim(),
            title = row.find(".tracktitle").first().text().replace(/\s+/g, " ").trim(),
            line = "";

        if( artist === "" && title === "" ) {
            return;
        }

        line = artist;

        if( title !== "" ) {
            line += (line !== "" ? " - " : "") + title;
        }

        lines.push( line );
    });

    if( lines.length === 0 ) {
        return;
    }

    var tlRaw = lines.join("\n");
    log( "tl before API:\n" + tlRaw );

    var res = apiTracklist( tlRaw, "standard" ),
        tlApi = (res && res.text) ? res.text : tlRaw,
        feedback = (res && res.feedback) ? res.feedback : "",
        tlEditor = $('<div class="tlEditor mdb-radioeins-tracklist"></div>'),
        tlTextarea = $('<textarea class="mono mixesdb-TLbox" wrap="off" style="display:none; width:100%; margin:10px 0 0 0; white-space:pre; overflow-x:auto; resize:vertical;"></textarea>');

    tlTextarea
        .attr("rows", Math.max(lines.length, 8))
        .val( tlApi )
        .show();

    tlEditor.append( tlTextarea );
    table.before( tlEditor );

    fixTLbox( feedback, tlEditor );
    table.addClass("mdb-processed-tracklist");
}

waitForKeyElements("table:has(tr.track)", function( jNode ) {
    buildTracklistFromTable( jNode );
});
