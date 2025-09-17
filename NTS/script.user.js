// ==UserScript==
// @name         NTS (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.09.17.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/NTS/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/NTS/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-NTS_4
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

var cacheVersion = 2,
    scriptName = "NTS";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


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
                // Remove hidden duplicated artists
                $(".track__artist--mobile", this).remove();
                $(".track__artist", this).show();

                var artist = $(".track__artists",this).text()
                              .replace(/\u00A0/g, ' ') // normalise all spaces to regular ASCII spaces
                              .trim()
                              // Fix versions behind artist names
                              // "Pet Shop Boys (Ian Levine mix)" WTF
                              // Only needs to match (artistname version), not (vocal) etc
                              // https://www.nts.live/shows/rhythmsection/episodes/rhythmsection-7th-february-2024
                              .replace( /^(.+) \(.+(?:mix|remix|version|edit|femix).*\)$/gi, "$1" )
                              ;

                var title = $(".track__title",this).text()
                              .replace(/\u00A0/g, ' ') // normalise all spaces to regular ASCII spaces
                              .trim();


                logVar( "artist", artist );
                logVar( "title", title );

                tl += "# " + artist + " - " + title + "\n";
            });

            // Fix multiple spaces
            // FIXME: TLE API should handle this…
            // https://www.nts.live/shows/rhythmsection/episodes/rhythmsection-7th-february-2024
            tl = tl.replace( /\s{2,}/g, " ");

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