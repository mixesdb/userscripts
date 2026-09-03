// ==UserScript==
// @name         1001 Tracklists (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.09.03.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-1001_Tracklists_27
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/mixesdb_modal/funcs.js?v-1001_Tracklists_4
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-1001_Tracklists_16
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-1001_Tracklists_112
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_importer/merge_core.js?v-1001_Tracklists_11
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_importer/funcs.js?v-1001_Tracklists_21
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

var cacheVersion = 47,
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
 * 2026.09.03.2
 * Tracklist Importer merge, three fixes off one report (merge_core.js v11, Claude Young @ Fuse
 * 2000-11-04, trackid.net). A VERSION named on both sides has to agree: the page plays "Percy X
 * - Break It Down" twice, as the Percy X Remix and as the Cari Lekebusch Remix 43 minutes
 * later, and the found Percy X Remix was written onto the Cari Lekebusch row - which also
 * anchored every detection behind it against the wrong row, so "[050] FLR - PART 7" stood in
 * front of "[031] Percy X" in the merged list. A row naming another version is no match now,
 * and a track played twice takes its two page rows in order. The found list's "[000] ?" and
 * "..." in front of its first detection are no longer written where the page names the track
 * that plays there - they went in because the page has "?" rows further down, which made the
 * whole list count as one with gaps. And a page "?" without a cue is only filled when a cue at
 * most two rows away places it - the one "?" in a stretch of 25 cue-less rows would otherwise
 * have taken any unmatched detection of those 70 minutes, each a track the page already lists
 * under another spelling.
 *
 * 2026.09.03.1
 * Tracklist Importer: the review block's Original and Candidate columns are EDITABLE
 * (tracklist_importer funcs.js v21, CSS). The highlighted <pre> stays as the backdrop and a
 * textarea with invisible text lies exactly on top of it, so the green/orange marking is
 * still there while the text can be typed in. Editing a box drops that box's colours until
 * the next merge - they describe a text that no longer stands there - and its border turns
 * dashed to say so. A "Merge" button in front of Apply re-merges what the two boxes hold
 * into the Merged box; with Live updates on, a typing pause does it by itself. Down, the
 * Merged column's heading and help line now stand above the site's own Tracklist Editor box
 * instead of disappearing with the hidden column, and merge mode's button below the columns
 * says "Merge another" so the two are not both called "Merge".
 *
 * 2026.09.01.1
 * Tracklist Importer merge: a TEXT ROW keeps its wiki italics (merge_core.js v10). A row the
 * page carries as "''? (Nick Stoynoff Remix) [Tronic]''" - the marks MixesDB writes around a row
 * that is not a readable "Artist - Title" - came back out of the merge bare as soon as anything
 * about it changed, here the cue the found tracklist knew (reported on Tronic Podcast 735 with
 * Nick Stoynoff). The parser stripped every quote run before the merge saw a row, so the marks
 * existed nowhere in the result and the page lost them on Apply. A run that WRAPS the whole row
 * is remembered on that row now and printed back around text and label, with the cue outside it.
 * The marks follow the text: where the found tracklist actually names the track, its own
 * (normally absent) marks come with it - the row is not the unreadable one the page marked any
 * more. Runs that are not a wrapper are stripped as before, which is what keeps 1001's bold
 * intro rows ("'''Live @ X:''' Artist - Title") readable.
 *
 * 2026.08.31.6
 * Tracklist Importer merge mode, three things (tracklist_importer funcs.js v20).
 * The pasted candidate is run through the TLE API before it is merged. Behind a link it always
 * arrived TLE-formatted - it had been sitting in the shared tracklist box on the player site -
 * but a tracklist pasted in by hand is whatever the other source prints ("1. 05:23 Artist -
 * Title (Label)"). The merge matches on parsed artist/title/cue, so an unnormalized candidate
 * matched worse, and whatever it did hand over carried the other site's formatting into the
 * page. The chapters check still runs on the RAW paste, where ";Name" rows are recognizable.
 * "Paste another" is gone: there is ONE button for every state of merge mode now and only its
 * label moves. After a merge it says "Merge" like before, and one press does the whole next
 * source - Candidate column emptied, clipboard read, merge run - the same single click the
 * first merge took.
 * And the two columns are held to one height AFTER the merge as well, not only while the
 * Candidate is a paste box. Two <pre>s side by side is the pair that gets read the longest and
 * it was the one pair left to end at different heights.
 *
 * 2026.08.31.5
 * Tracklist Importer merge mode: Original and Candidate are held to one MEASURED height now
 * (tracklist_importer funcs.js v19, CSS). They were sized by counting line breaks, and a row
 * like "# Kevin McKay, Boogietraxx, Akeem Raphael - Go Back To '89 (Extended Mix) [Glasgow
 * Underground]" is one row in the text and two on screen - so the <pre> was handed a
 * min-height SHORTER than its own wrapped text already needed, kept its natural height, and
 * the paste box beside it stood a couple of rows short (reported with a screenshot). Both
 * sides are measured instead: whichever needs more room decides, and the other is given that
 * height. Re-measured on every keystroke in the box, after the down move and after a window
 * resize - all three change how many rows wrap.
 *
 * 2026.08.31.4
 * Tracklist Importer merge mode, two fixes off a screenshot (tracklist_importer funcs.js v18,
 * CSS). The site's Tracklist editor fieldset had lost its whole TOP BORDER: our CSS stretched
 * its legend to width 100% so the merge-mode link could float to the far right, and a legend IS
 * the notch in that border - one as wide as the fieldset leaves no border to notch. Nothing is
 * done to the legend any more; the link is simply appended to it.
 * And it is called "Merge mode" now, not "Merge tracklist", sitting directly behind the
 * section's own name in that label instead of at its right end.
 *
 * 2026.08.31.2
 * Tracklist Importer merge mode, the styling round (tracklist_importer funcs.js v16, CSS).
 * The way in is a LINK now, small and floated to the right end of the Tracklist editor
 * section's own label, instead of a button below its action row: this form is used to edit a
 * tracklist a hundred times for every once one is merged into it, and a button standing among
 * Standard / Cap / find-replace claimed a weight the feature does not have. It removes itself
 * once clicked.
 * Merge mode fills NOTHING into any editor before a merge has run - the Merged box opens empty
 * and, down, the page's own Tracklist Editor keeps whatever was typed in it (tlImporter_applyDown
 * no longer writes an empty Merged box into it at all, which the chaptered case gets out of the
 * same fix). The merge result still goes straight into whichever box is the live one.
 * Original and Candidate are held to the same height while the Candidate is a paste box
 * (tlImporter_handMatchHeights): the box opens at the Original's row count and the two grow
 * together as a longer list is pasted in.
 * The button moved out of the Candidate column to below BOTH columns, centered on the block's
 * full width - the two boxes belong together and a control under one of them read as belonging
 * to that one alone. It carries two labels: "Paste clipboard & merge" while the box is empty,
 * which fetches what you copied and merges it in one click, and a plain "Merge" the moment
 * there is text in the box. Firefox does not let a page script read the clipboard and Chrome
 * may be told no - the block then says so and puts the caret in the box.
 *
 * 2026.08.31.1
 * Tracklist Importer: MERGE MODE, a merge started on the edit page itself (tracklist_importer
 * funcs.js v15, CSS). Everything the importer did needed a player site in front of it - a
 * tracklist copied from a forum post, a comment or a site no userscript of ours runs on had no
 * way in. A "Merge tracklist" button below the page's own Tracklist Editor now opens the
 * review block with the page's tracklist in Original and in the Merged box, and the Candidate
 * column as a paste box with a Merge button under it. It swaps to the usual highlighted list
 * once the merge ran, with "Paste another" for a second source on top of the first. Up and
 * down work exactly as after a link merge - down from the first moment, because the Merged box
 * is seeded with the page's tracklist the editor already holds. The one difference to the link
 * flow: the merge writes NOTHING into the page, so no "Show changes" is clicked and Save is
 * never locked - Apply is what writes, and it starts awake instead of asleep.
 * MixesDB Userscripts Helper carries the importer onto mixesdb.com now as well, so merge mode
 * reaches every contributor and not only the ones with this script installed; an edit form no
 * import link and no stored review block points at is owned by that script (tlImporter_homeScript),
 * which turns the old first-ready-handler coin toss into an answer.
 *
 * 2026.08.28.4
 * The shared MixesDB modal stands down where another instance of ours already has one open
 * (mixesdb_modal funcs.js v2). Nothing changes on 1001tracklists.com - this is the
 * mixesdb.com/w/* side, which this script and TrackId.net both run on: TrackId.net now hangs
 * the modal's eye behind its links under the players, and one click on it reaches the
 * delegated handler of BOTH copies of the file. Without the stand-down the second copy built
 * a second overlay behind the first and loaded the framed page again, so both scripts need
 * the new file.
 *
 * 2026.08.28.3
 * Tracklist Importer merge, artist and title the WRONG WAY ROUND (merge_core.js v9, reported on
 * a trackid.net import). A page row typed off what a player showed has the two halves the wrong
 * way round often enough - "Caprock - Majestic" against the found "Majestic - Caprock" - and
 * every match step said no: the whole strings differ, and comparing the halves straight holds
 * each one against the wrong counterpart, so the found row was INSERTED as a second row for the
 * same track. The halves are now also compared CROSSWISE, both known on both sides and both
 * having to answer, which carries a lower threshold (0.7 against the straight 0.8). The found
 * row then WINS the text: the same two halves, only turned round, and the player site reads its
 * credit off a release database while the page row was typed by hand. Two smaller things came
 * with it: the Discogs disambiguation number on an artist name ("Majestic (3)") takes no part in
 * any comparison, and the version stripper's emptied brackets are dropped before comparing -
 * "City Lights (Edit)" compared as "city lights ( )", 0.67 against a page's "Citylights" where
 * the two names alone are 0.91.
 *
 * 2026.08.28.2
 * Tracklist Importer Report: the "## Cue gaps" block moved up, from behind the merged tracklist
 * to right behind the found one (tracklist_importer funcs.js v14) - the reading belongs to the
 * two lists above it and explains the "..." the merged list below either kept or lost.
 *
 * 2026.08.28.1
 * Tracklist Importer Report: a new "## Cue gaps" block (tracklist_importer funcs.js v13,
 * merge_core.js v8). It prints, for the original, the found and the merged tracklist, how many
 * tracks and "..." each holds, the median track runtime measured over its gapless neighbour
 * distances, and the span a "..." needs to survive - plus one line per "...", naming the two
 * rows it sits between, its span and whether it was dropped or kept. Those numbers decide
 * every gap the merge removes and existed only in the console until now, so a report about a
 * "..." that went or stayed could not be checked, let alone turned into a test example. Where
 * nothing could be measured the block says why instead of leaving the line out (an unreadable
 * cue, too few gapless neighbours). The candidate is measured too: trackid.net builds its own
 * "..." off the same median, so a wrong gap can be older than the merge.
 *
 * 2026.08.27.20
 * Tracklist Importer: an Insert no longer shows a review block at all (tracklist_importer
 * funcs.js v12, CSS). It only ever had one state worth having - the inserted list in the page's
 * own Tracklist Editor, with Apply and the Live updates switch under it - because its two
 * columns are the page's new tracklist and the list it came from, the same text twice. So an
 * insert now goes down to that editor whatever the remembered up/down choice says, gets no
 * arrow button, and its fieldset is never shown; the remembered choice is left alone, it
 * belongs to the merges. Only an edit form whose Tracklist Editor never loads gets the block
 * after all, a few seconds in, so the list can still be read and corrected.
 *
 * 2026.08.27.19
 * Tracklist Importer merge, the rows the merge cannot place (merge_core.js v7, reported on
 * trackid.net for Invite's Choice Podcast 224 Exos). A found track that matches nothing on the
 * page is put in front of the first page row with a bigger cue - which means it lands at the
 * END of the run of cue-less rows in front of that row. Over one or two rows that is a near
 * miss; over a block of them it is a guess with nothing behind it. In the reported set four
 * tracks from the mix's first half were dropped directly in front of the first matched row,
 * behind the 18 rows the page lists before it, three of them the page's own rows under another
 * spelling. Such a track is no longer written into the page: it stays highlighted in the
 * Candidate column, where the reader places it by hand.
 *
 * 2026.08.27.18
 * Tracklist Importer: after an Insert, the Candidate column goes away while the review block
 * stands down at the page's own Tracklist Editor (tracklist_importer funcs.js v11, CSS). The
 * inserted list and the candidate are the same list, so next to an editor already holding it
 * the column was a copy to read past. Only the block's named edge and its arrow button stay
 * above the editor; moving the block back up brings the Candidate back.
 *
 * 2026.08.27.17
 * Tracklist Importer: the Original and Candidate boxes of the review block are as tall as their
 * own text again (tracklist_importer funcs.js v10, CSS). They used to be stretched to the row
 * count of the tallest of the three columns, which left a screen of empty box under a short
 * list. Only the Merged editor still gets that shared row count, so nothing is scrolled away.
 *
 * 2026.08.27.16
 * Tracklist Importer: an Insert opens the review block too (tracklist_importer funcs.js v9,
 * CSS) - and with it the down state, which puts the inserted tracklist into the page's own
 * Tracklist Editor with an Apply button under it, instead of leaving it to be copied there by
 * hand. Two columns instead of three: the page had no tracklist, so there is no Original.
 *
 * 2026.08.27.15
 * Tracklist Importer merge, the redundant "..." (merge_core.js v6, reported on trackid.net for
 * Luke Slater @ The Lot Radio 2026-06-13). A gap says tracks are missing at that spot - and
 * once the found tracklist has filled it up, the cues around it often say the opposite. The
 * merged list is now measured against itself: the median time from one track to the next where
 * no "..." stands between them is what one track of this mix runs, and a gap has to span more
 * than one and a half times that to survive. Only merges that actually added something are
 * touched, every track has to carry a real cue, and the first and last "..." of a list are left
 * alone.
 *
 * 2026.08.27.14
 * Tracklist Importer (tracklist_importer funcs.js v8): after an Insert/Merge click the mix page
 * is watched for the save, and the toolkit's "TID tracklist is integrated" checkbox is ticked
 * from what the page then holds instead of by hand. Only rows that HAVE that checkbox are
 * watched, which is TrackId.net's - nothing is polled here; the file is loaded for the shared
 * importer and comes along with the fix.
 *
 * 2026.08.27.12
 * Tracklist Importer, two fixes behind one report on trackid.net (tracklist_importer funcs.js
 * v6, merge_core.js v5). Both scripts carrying the importer run on mixesdb.com/w/*, and until
 * now the first ready handler took the edit page - so THIS script could answer a click whose
 * link TrackId.net had built, with whatever version of the shared files it had cached. The link
 * names its sender now (&mdbTlImporterFrom=), that instance owns the page, and the log says
 * which one it is; an instance the link does not name takes over half a second later if the
 * named one never shows up. Second: the merge reads the mix runtime out of the "dur" cell of
 * the page's own File details table when the link carries none - which is always here, since
 * 1001tracklists prints no runtime - so the cues behind the last identified track are bounded
 * on this site too ("[6?]" instead of "[??]" behind [61] on a 1:04:54 mix).
 *
 * 2026.08.27.11
 * Tracklist Importer merge, the two ENDS of the cue guessing (merge_core.js v4,
 * tracklist_importer funcs.js v5, reported on fibre podcast sigint 014, trackid.net). The
 * neighbour rule needs a known cue on either side, and the first and the last row have only
 * one. The FIRST row is where the recording starts, so an unknown cue on it is written "[00]"
 * outright instead of being guessed down to "[0?]" - unless a "..." gap stands in front of it,
 * which says the list does not start there. Behind the LAST known cue the mix RUNTIME plays the
 * missing neighbour where the site prints one: 1001tracklists does not, so nothing is filled in
 * there, exactly as before.
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
