// ==UserScript==
// @name         1001 Tracklists (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.27.10
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-1001_Tracklists_27
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/mixesdb_modal/funcs.js?v-1001_Tracklists_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-1001_Tracklists_16
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-1001_Tracklists_111
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_importer/merge_core.js?v-1001_Tracklists_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_importer/funcs.js?v-1001_Tracklists_4
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v-1001_Tracklists_1
// @include      http*1001tracklists.com*
// @include      http*mixesdb.com/w/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1001tracklists.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 34,
    scriptName = "1001_Tracklists";
window.scriptName = scriptName; // toolkit.js reads this global directly
window.cacheVersion = cacheVersion; // same reason: the @require'd shared files cache-bust their own CSS with it

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function thousandoneTl() {
    runMain = false;
    $(".adRow").remove();
    // remove hidden elements that appear in text
    $(".tlUserInfo").remove();
    $(".tgHid").remove();

    var t = $("#tlTab");
    if( t.length > 0 ) {
        var tl = "",
            li = $("#tlTab > div"),
            len = li.length,
            rows = len;

        // persist chapter between <li> iterations
        var pendingIntro = "";

        li.each(function() {

            // -------------------------
            // 1) detect "chapter intro" li (the standalone '''...''' rows)
            // -------------------------
            var span = $("span", this);

            if (
                span.length &&
                span.attr("id") &&
                span.attr("id").endsWith("headtext_column")
            ) {
                // store for NEXT track
                pendingIntro = span.text().trim().replace(/:$/g, "");
                return; // important: skip further processing for this li
            }


            // -------------------------
            // 2) detect track li
            // -------------------------
            if ($(this).attr("data-trno") != "") {

                var track = "",
                    song = $("div .trackValue", this).text().trim(),
                    label = $("div[itemprop='tracks'] .trackLabel", this)
                .map(function(){ return $(this).text().trim(); })
                .get()
                .join(" / ")
                .toLowerCase()
                .replace(/(.+) \(.+\)/, "$1"),
                    dur = $("div[data-mode='hours']", this).text().trim();


                // + duration
                if (dur !== "") {
                    track += "[" + dur + "] ";
                }

                // + pending chapter (consume once)
                if (pendingIntro !== "") {
                    track += "'''" + pendingIntro + ":''' ";
                    pendingIntro = ""; // reset after use
                }

                // + song
                track += song;

                // + label
                if (label !== "") {
                    track += " [" + label + "]";
                }

                if (track.trim() !== "") {
                    tl += track + "\n";
                }
            }


            // -------------------------
            // 3) detect main chapter (;Pete Tong etc.)
            // -------------------------
            if ($(".fRow", this).length === 1) {
                var chapter = $(".fRow a", this).text().trim();

                if (chapter !== "") {
                    tl += ";" + chapter + "\n";
                }
            }
        });

        log( "tl before API:\n" + tl );

        // fixes
        var tl = tl.replace('&thinsp;', ' ')
                   .replace(' (ID Remix) (ID Remix)', ' (ID Remix)')
                   .replace(/;(.+)\n\n;(.+)/g, ';$1 - $2')
                   .replace(/undefined - undefined/gi, '?');

        // dur fixes
        if( /\[\d+:\d+]/.test(tl) ) {
            tl = tl.replace( /\[(\d)] /, "[0$1:00] " )
                   .replace( /\[(\d+)] /, "[$1:00] " );
        }
        if( /\[\d\d:\d\d]/.test(tl) && /\[1:\d\d:\d\d]/.test(tl) ) {
            tl = tl.replace( /\[(\d\d:\d\d)] /gm, "[0:$1] " );
            tl = tl.replace( /\[(\d:\d\d)] /gm, "[0:0$1] " );
        }

        var res = apiTracklist( tl, "thousandoneTl" ),
            tlApi = res.text,
            feedback = res.feedback;

        if( tlApi ) {
            t.prepend( ta );
            // the mixesdb-TLbox CLASS is what the Tracklist Importer reads the candidate off
            // (tlImporter_boxSelector) - the box from global.js only carries the id, so it is
            // added here, exactly as TrackId.net does after filling its box
            $("#mixesdb-TLbox").addClass("mixesdb-TLbox").css("position","inherit").append( tlApi );
            fixTLbox( res.feedback );
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Run funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var runMain = true;
if( urlPath(1) == "tracklist") {
    waitForKeyElements("#tlTab .trackValue", function( jNode ) {
        if( runMain ) {
            thousandoneTl();
        }
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Only on 1001tracklists.com: this script also runs on mixesdb.com/w/* for the Tracklist
// Importer's edit-form side (shared/tracklist_importer/funcs.js brings that along by itself),
// and none of the toolkit lookups below belong on a wiki page.
if( visitDomain != "mixesdb.com" ) {

    var playerUrlItems_timeout = 500;

    // log playerUrlItems before timeout
    var playerUrlItems = [ $("div.iMediaP iframe").length,
                           $(".mediaTabItm.hidden li.mediaTab2 a").length
                         ];
    log_playerUrlItems_len( playerUrlItems, "before timeout ("+playerUrlItems_timeout+")" );

    // run after timeout
    setTimeout(function() {
        // log playerUrlItems after timeout
        var playerUrlItems = [ $("div.iMediaP iframe").length,
                               $(".mediaTabItm.hidden li.mediaTab2 a").length
                             ];
        log_playerUrlItems_len( playerUrlItems, "after timeout ("+playerUrlItems_timeout+")" );

        var max_toolboxIterations = get_playerUrlItems_len( playerUrlItems );

        // let's go
        if( max_toolboxIterations > 0 ) {
            var titleText = $("#pageTitle h1").text(),
                wrapper = $(".mItems");

            /*
             * Visible and hidden iframes
             */
            waitForKeyElements("div.iMediaP iframe:not(.mdb-processed-toolkit)", function( jNode ) {
                var iframe = jNode;
                iframe.addClass("mdb-processed-toolkit");

                getToolkit_fromIframe( iframe, "playerUrl", "detail page", wrapper, "after", titleText, "", max_toolboxIterations, "auto" );
            });

            /*
             * Tab links without iframe
             */
            waitForKeyElements(".mediaTabItm.hidden li.mediaTab2 a:not(.mdb-processed-toolkit)", function( jNode ) {
                jNode.addClass("mdb-processed-toolkit");

                var playerUrl = jNode.attr("href");
                logVar( "playerUrl pre func", playerUrl );

                // podcasts.apple.com
                if( /.+podcasts\.apple\.com.+/.test(playerUrl) ) {
                    log( "Apple Podcasts" );
                    getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", max_toolboxIterations, "", "auto" );
                }
            });
        }
    }, playerUrlItems_timeout );

    /*
     * Compare page creation date to MixesDB last edit date
     * only on positive usage results
     */
    waitForKeyElements(".mdb-mixesdbLink.lastEdit", function( jNode ) {
        var pageCreationTimestamp = $('time[itemprop="datePublished"]').text()
                                        .trim()
                                        // 2023-11-04 07:17:24
                                        .replace(/(\d{4}-\d{2}-\d{2}) (\d+:\d+:\d+)$/, "$1T$2Z" )
                                    ;

        var lastEditTimestamp = jNode.attr("data-lastedittimestamp"); // 2025-01-28T20:26:13Z

        pageCreated_vs_lastEdit( pageCreationTimestamp, lastEditTimestamp );
    });

}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Remove adblocker blocker
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Only on 1001tracklists.com: an id as generic as #overlay must never be removed from
// whatever mixesdb.com happens to render under it.
if( visitDomain != "mixesdb.com" ) {

    waitForKeyElements("#overlay", function( jNode ) {
        jNode.remove();
    });

    waitForKeyElements("#btn_msgpane_ok", function( jNode ) {
        jNode.click();
    });

}

})();

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Changelog
 *
 * 2026.08.27.10
 * Tracklist Importer merge, the unknown cues of a cue-less tracklist (merge_core.js v3): a mix
 * page whose tracklist carries no cue at all has no cue format the merge can keep, so it
 * borrows the found tracklist's - "[??]" no longer stands two digits wide between three-digit
 * cues. And an unknown cue keeps every leading digit the known cues around it agree on: one
 * between [095] and [098] reads "[09?]" now, one between [098] and [103] stays "[???]" because
 * the two say nothing in common. Nothing is filled in behind the last known cue (the stream
 * runs on) or where more rows sit between two cues than there are minutes between them - six
 * tracks did not play in minute 008. Reported on fibre podcast bman 011.
 *
 * 2026.08.27.9
 * Tracklist Importer: "Nothing to add" is treated like "Identical" now (tracklist_importer
 * funcs.js v4, CSS). Both verdicts mean every track of the 1001 tracklist is on the mix page -
 * "Identical" because the two lists are the same list, "Nothing to add" because the page
 * carries more on top of it - so both wear the same green here (the integrated checkbox they
 * tick on TrackId.net does not exist on 1001).
 *
 * 2026.08.27.7
 * The Tracklist Importer's "Identical" note is green here too (tracklist_importer.css,
 * 1001-scoped rule): on TrackId.net the green arrives with the auto-tick of the integrated
 * checkbox, which 1001 does not have - so the note now simply stands in that green from the
 * start instead of staying plain.
 *
 * 2026.08.27.6
 * Tracklist Importer merge, half-known rows (merge_core.js v2): a page row that knows only
 * ONE half of a track - "ID", "Chris Stussy - ?", "? - Untitled (B1)" - counts as an unknown
 * the same way a bare "?" does. Such a row is matched by its cue time now instead of being
 * passed over and then added a second time, and the candidate fills exactly the half the page
 * is missing: a title the page has stays whatever the player site calls it. Artist and title
 * are compared apart as well, so "Costigane - Camera Tricks" and "Brendan Costigane - Camera
 * Tricks" are one track - the page's shorter spelling wins, the site's stands in the Candidate
 * column. Reported on Chris Stussy's Essential Mix 2024-10-12, where all three shapes ended up
 * on the page twice.
 *
 * 2026.08.27.2
 * Tracklist Importer (shared/tracklist_importer/, beta) wired in, exactly as on TrackId.net:
 * the toolkit's usage rows gain Insert/Merge/Chaptered plus Report when the tracklist box is
 * filled, and the script now also runs on mixesdb.com/w/* for the edit-form side. The box
 * gains the mixesdb-TLbox CLASS the importer reads the candidate off (global.js's ta only
 * carries the id). The toolkit lookups and the adblocker removal are gated off mixesdb.com.
 * 1001-specific handling that went into the shared files: a chaptered CANDIDATE (";Name" rows
 * in the 1001 tracklist, multi-set pages) gets the Chaptered hand-merge link instead of a
 * merge that would swallow the chapter rows, and tlImporter_parse strips ''' bold whole, so
 * 1001's "'''Live @ X:'''" intro rows cannot leave a stray quote in merged text. No
 * "integrated" checkbox here - that stays a TrackId.net feature, the Identical note ticks
 * nothing on this site.
 * The global.js / tracklist_editor / toolkit require params were refreshed (and their
 * "1002_Tracklists" typos fixed): the importer leans on current tracklist_editor and toolkit
 * code, and this script's cached copies were many bumps behind the content TrackId.net loads.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
