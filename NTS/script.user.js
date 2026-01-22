// ==UserScript==
// @name         NTS (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.01.22.1
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

/*
    Because humans love repeating themselves, here’s your routine wrapped in a function,
    then called from TWO waitForKeyElements hooks:
    1) when timestamps exist (.track__timestamp)
    2) when durations are NOT available (div.tracklist-promo)

    Both pass the same tlE selection into the function.
*/

/*
    No drama, no observers, no voodoo.
    Promo is loaded immediately, so we just CHECK for it once.

    Logic:
    - Always wait for timestamps (async case)
    - ALSO do a one-time length check for promo-based lists (no timestamps ever)
*/

function ntsProcessTracklists(tlE){
    log("Tracklists found: " + tlE.length);

    tlE.each(function(){
        $(this).before(ta + "<br />");

        var tl_has_dur = 0,
            tl = "",
            li = $("li.track", this);

        li.each(function(){
            $(".track__artist--mobile", this).remove();
            $(".track__artist", this).show();

            var artist = $(".track__artists", this).text()
                .replace(/\u00A0/g, " ")
                .trim()
                .replace(/^(.+) \(.+(?:mix|remix|version|edit|femix).*\)$/gi, "$1");

            var dur = $(".track__timestamp", this).text().trim()
                .replace("--:--", "");

            var title = $(".track__title", this).text()
                .replace(/\u00A0/g, " ")
                .trim();

            logVar("dur", dur);
            logVar("artist", artist);
            logVar("title", title);

            tl += "# ";

            if(dur && dur != ""){
                tl_has_dur = 1;
                tl += "[" + dur + "] ";
            }

            tl += artist;

            if(title && title != ""){
                tl += " - " + title;
            }

            tl += "\n";
        });

        tl = tl.replace(/\s{2,}/g, " ");

        log(tl);

        if(tl){
            if(tl_has_dur){
                var res_dur = apiTracklist(tl, "durToMins"),
                    tlApi_dur = res_dur.text;

                var res = apiTracklist(tlApi_dur, "addDurBrackets"),
                    tlApi = res.text,
                    feedback = res.feedback;
            }else{
                var res = apiTracklist(tl, "standard"),
                    tlApi = res.text,
                    feedback = res.feedback;
            }

            if(tlApi){
                $("#tlEditor").addClass("fs75p").css("width", "95%");
                $("#mixesdb-TLbox").val(tlApi);
                fixTLbox(res.feedback);
            }
        }
    });

    tlE.addClass("processed");
}

/*
    1) ASYNC case: wait for timestamps
*/
waitForKeyElements("ul.tracklist__tracks .track__timestamp", function(jNode){
    var tlE = jNode.closest("ul.tracklist__tracks:not(.processed)");
    ntsProcessTracklists(tlE);
});

/*
    2) SYNC case: promo exists immediately (no timestamps ever)
*/
(function(){
    var tlE = $("ul.tracklist__tracks:not(.processed)").has("div.tracklist-promo:not(.hidden)");

    if(tlE.length){
        ntsProcessTracklists(tlE);
    } else {
    }
})();