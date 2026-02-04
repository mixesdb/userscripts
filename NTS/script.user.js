// ==UserScript==
// @name         NTS (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.04.2
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

function ntsProcessTracklists(tlE){
    log("Tracklists found: " + tlE.length);

    tlE.each(function(){
        $(this).before(ta + "<br />");

        var tl_has_dur = 0,
            tl = "",
            li = $("li.track", this);

        li.each(function(){
            // Remove hidden duplicated artists
            $(".track__artist--mobile", this).remove();
            $(".track__artist", this).show();

            log( $(this).text() );

            var artist = $(".track__artists", this).text()
                .replace(/\u00A0/g, " ") // normalise all spaces to regular ASCII spaces
                .trim()
                // Fix versions behind artist names
                // "Pet Shop Boys (Ian Levine mix)" WTF
                // Only needs to match (artistname version), not (vocal) etc
                // https://www.nts.live/shows/rhythmsection/episodes/rhythmsection-7th-february-2024
                .replace(/^(.+) \(.+(?:mix|remix|version|edit|femix).*\)$/gi, "$1")
            ;

            // dur is visible only for subscribed users (or missing entirely)
            var dur = $(".track__timestamp", this).text().trim()
                .replace("--:--", "");

            var title = $(".track__title", this).text()
                .replace(/\u00A0/g, " ") // normalise all spaces to regular ASCII spaces
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

        // Fix multiple spaces
        // FIXME: TLE API should handle this…
        // https://www.nts.live/shows/rhythmsection/episodes/rhythmsection-7th-february-2024
        tl = tl.replace(/\s{2,}/g, " ");

        log(tl);

        // API
        if(tl){
            if(tl_has_dur){
                // round H:MM:SS to MM
                var res_dur = apiTracklist(tl, "durToMins"),
                    tlApi_dur = res_dur.text;

                // add brackets for missing durs
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

// Case 1: timestamps are present (subscriber)
waitForKeyElements("ul.tracklist__tracks .track__timestamp", function(jNode){
    var tlE = jNode.closest("ul.tracklist__tracks:not(.processed)");
    ntsProcessTracklists(tlE);
});

// Case 2: timestamps are NOT available (promo element exists)
waitForKeyElements("ul.tracklist__tracks div.tracklist-promo:not(.hidden)", function(jNode){
    var tlE = jNode.closest("ul.tracklist__tracks:not(.processed)");
    if(!tlE.find(".track__timestamp").length){
        ntsProcessTracklists(tlE);
    }
});

// Case 3: No timestamps at all
waitForKeyElements("ul.tracklist__tracks:not(.processed)", function(jNode){
    if(!jNode.find(".track__timestamp").length && !jNode.find("div.tracklist-promo:not(.hidden)").length){
        ntsProcessTracklists(jNode);
        jNode.addClass("processed");
    }
});
