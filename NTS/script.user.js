// ==UserScript==
// @name         NTS (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.11.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/NTS/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/NTS/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-NTS_2
// @include      http*nts.live*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nts.live
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
    cacheVersion = 2,
    scriptName = "NTS",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
waitForKeyElements("ul.tracklist__tracks", function( jNode ) {
        var tlE = jNode;

        log( "Tracklists found: " + tlE.length );

        tlE.each(function(){
            $(this).before( ta + '<br />' );
            var tl = "",
                li = $("li.track",this);
            li.each(function(){
                var artist = $(".track__artist:visible",this).text(),
                    title = $(".track__title:visible",this).text();
                tl += "# " + artist + " - " + title + "\n";
            });

            log( tl );

            // API
            if( tl ) {
                var res = apiTracklist( tl, "standard" ),
                    tlApi = res.text,
                    feedback = res.feedback;

                if( tlApi ) {
                    $("#tlEditor").addClass("fs75p").css("width","95%");
                    $("#mixesdb-TLbox").val( tlApi );
                    fixTLbox( res.feedback );
                }
            }
        });
});