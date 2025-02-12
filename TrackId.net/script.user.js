// ==UserScript==
// @name         TrackId.net (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.02.12.5
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-TrackId.net_79
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-TrackId.net_30
// @include      http*trackid.net*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trackid.net
// @noframes
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var dev = 0,
    cacheVersion = 62,
    scriptName = "TrackId.net",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var timeoutDelay = 600,
    ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>',
    checkIcon = '<img class="mdb-checked-icon" src="data:image/png;base64,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" alt="Checked">';

// select elements
waitForKeyElements(".mdb-element.select", function( jNode ) {
    jNode.select().focus();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Initialize feature functions per url path
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 20 );

/*
 * grab url path and fire functions
 */
d.ready(function(){
    var contentWrapper = $(".MuiGrid-grid-xs-12"),
        path1 = window.location.pathname.replace(/^\//, "");

    logVar( "path1", path1 );

    switch( path1 ) {
        case "submiturl":
            on_submitrequest();
            break;
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Menu
 * minimal changes only
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".dashboard", function( jNode ) {
    var mdbMenu = '<h3 class="mdb-menu-hl">Requests</h3>';
    mdbMenu += '<ul class="mdb-menu mdb-nolist">';
    mdbMenu += '<li><a href="/submiturl?from=menu">Submit</a></li>'
    mdbMenu += '<li><a href="/myrequests?from=menu">My requests</a></li>'
    mdbMenu += '</ul>'

    jNode.append( mdbMenu );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On audiostream pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/*
 * Players
 */
// funcTidPlayers
function funcTidPlayers( jNode, playerUrl, titleText ) {
    logFunc( "funcTidPlayers" );
    log(url);

    // get domain
    var a = document.createElement('a');
    a.href = playerUrl;
    var domain = a.hostname.replace("www.", ""),
        paths = a.pathname;
    //log("> " + domain);
    //log("> " + paths);

    // prepare embed code
    // hearthis.at not possible from provided page url
    switch (domain) {
        case "soundcloud.com": // https://soundcloud.com/fingermanedit/fingerman-dj-set-kvs-brussels
            var embed = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?visual=false&amp;url=' + playerUrl + '&amp;auto_play=false&amp;&amp;maxheight=120&amp;buying=false&amp;show_comments=false&amp;color=ff7700&amp;single_active=true&amp;show_reposts=false"></iframe>';
            break;
        case "mixcloud.com": // https://www.mixcloud.com/oldschool/sharam-jey-rave-satellite-1995/
            var feedPath = encodeURIComponent( paths ),
                embed = '<iframe width="100%" height="120" src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=' + feedPath + '" frameborder="0" ></iframe>';
            break;
        case "youtube.com": // https://www.youtube.com/watch?v=qUUYWIsfY90, https://youtu.be/qUUYWIsfY90
            var yt_id = getYoutubeIdFromUrl( playerUrl ),
                embed = '<iframe width="100%" height="315" src="https://www.youtube.com/embed/' + yt_id + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
            break;
        case "hearthis.at": // https://hearthis.at/toccoscuro/01-manpower-radio1sessentialmix-sat-09-07-2024-talion/
            var embed = "",
                wrapper = jNode.closest(".MuiBox-root");
            embed_hearthis_fromAnyUrl( playerUrl, wrapper, "after" );
    }
    //log( embed );

    // embed player
    $(".mdb-player-audiostream").remove();
    if( embed != "" ) {
        // embedded player output
        var mdbPlayerAndToolkit = '<div class="mdb-player-audiostream" data-playerurl="'+playerUrl+'">' + embed + '</div>';
        jNode.closest(".MuiBox-root").after( mdbPlayerAndToolkit );
        jNode.remove();
    }

    if( playerUrl ) {
        // toolkit output
        waitForKeyElements(".mdb-player-audiostream:not(.mdb-processed-toolkit)", function( jNode ) {
            getToolkit( playerUrl, "playerUrl", "detail page", jNode, "after", titleText, "link", 1 );
            jNode.addClass("mdb-processed-toolkit");
        });
    }
}

// embed player
waitForKeyElements(".request-summary img.artwork", function( jNode ) {
    var playerUrl = jNode.closest("a").attr("href"),
        heading = $(".MuiGrid-container .MuiGrid-grid-xs-12 p.MuiTypography-body1").first(),
        titleText = normalizeTitleForSearch( heading.text() );

    logVar( "playerUrl", playerUrl );

    if( url != "" ) {
        funcTidPlayers( jNode, playerUrl, titleText );
    }
});

/*
 * Compare page creation date to MixesDB last edit date
 * only on positive usage results 
 */
waitForKeyElements(".mdb-mixesdbLink.lastEdit", function( jNode ) {
    var pageCreationTimestamp = $(".audio-stream-box > div > div > .MuiBox-root:nth-of-type(5) div + div p.MuiTypography-body1").text()
                                    .trim()
                                    // d/M/yyyy
                                    // 1/3/2025, 9:54:50 AM
                                    .replace(/ (AM|PM)$/i, "" )
                                    .replace(/(\d+)\/(\d+)\/(\d+), (\d+:\d+:\d+)$/, "$3-$1-$2T$4Z" )
    
                                    // m+d.M.yyyy
                                    // 21.1.2025, 13:05:04
                                    .replace(/(\d+)\.(\d+)\.(\d+), (\d+:\d+:\d+)$/, "$3-$2-$1T$4Z" ) // 18.1.2025, 10:43:21
    
                                    // pad M-d
                                    // 2025-1-3T9:54:50Z
                                    .replace(/(\d{4})-(\d)-/, "$1-0$2-" )
                                    .replace(/(\d{4})-(\d{2})-(\d)T/, "$1-$2-0$3T" )
                                ;
    
    var lastEditTimestamp = jNode.attr("data-lastedittimestamp"); // 2025-01-28T20:26:13Z
    
    pageCreated_vs_lastEdit( pageCreationTimestamp, lastEditTimestamp );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tables
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Tracklist table
 * via table .mdb-tid-table
 */
// waitForKeyElements
waitForKeyElements(".mdb-tid-table:not('.tlEditor-processed')", function( jNode ) {
    logFunc( "funcTidTracklist" );

    var tlWrapper = jNode;

    tlWrapper.addClass("tlEditor-processed");

    // hide banner
    $(".MuiAlert-root.MuiAlert-standardInfo").hide();
    $(".MuiGrid-container.request-summary").css("margin-top", "0");

    var heading = $(".MuiGrid-container .MuiGrid-grid-xs-12 p.MuiTypography-body1").first(),
        mixTitle = heading.text(),
        totalDur = $("p.MuiTypography-body1:contains('Duration')").closest("div").next(".MuiGrid-item").text(),
        totalDur_Sec = durToSec(totalDur);
    log(mixTitle);
    logVar( "totalDur", totalDur);

    // iterate
    var tl = "",
        li = $("tr", tlWrapper),
        i = 1;

    logVar("li.length", li.length);

    li.each(function () {
        var thisTrack = "",
            artist = $(".artist", this).text(),
            title = $(".title", this).text().replace(/(.+) - (.+ (?:Remix|Mix|Version))/g, "$1 ($2)"),
            label = $(".label", this).text(),
            startTime = $(".startTime", this).text(),
            startTime_Sec = durToSec(startTime),
            endTime = $(".endTime", this).text(),
            endTime_Sec = durToSec(endTime),
            previousTrack = $(".MuiDataGrid-row:eq(" + (i - 2) + ")"), // eq starts at 0
            endTimePrevious = $(".MuiDataGrid-cell[data-field='endTime']", previousTrack).text(),
            endTimePrevious_Sec = durToSec(endTimePrevious),
            nextTrack = $(".MuiDataGrid-row:eq(" + (i) + ")"), // eq starts at 0
            startTimeNext = $(".MuiDataGrid-cell[data-field='startTime']", nextTrack).text(),
            startTimeNext_Sec = durToSec(startTimeNext);

        logVar("artist", artist);

        // remove label when its actually the artist repeated
        if (label == artist) {
            label = "";
        }

        // dur
        if (startTime !== "") {
            // first track is gap?
            if (i == 1) {
                // start tl with gap when first dur is larger than 120(?)
                if (startTime_Sec > 120) {
                    tl += '[0:00:00] ?\n...\n';
                }
            }
            thisTrack += '[' + startTime + '] ';
        }

        // artist - title
        if (artist && title !== "") {
            thisTrack += artist + ' - ' + title;
        }

        // label
        if (label !== "") {
            thisTrack += ' [' + label + ']';
        }

        tl += thisTrack;
        //log( thisTrack );

        // gaps
        // add "..." row if gap is too laarge
        if (!$(this).is(':last-child')) {
            // not last track
            gapSec = startTimeNext_Sec - endTime_Sec;
            //log( "> endTime: " + endTime );
            //log( "> next startTime: " + startTimeNext );
            //log( "> gapSec: " + gapSec );

            if (gapSec > 30) {
                tl += "\n[" + endTime + "] ?";
                if (gapSec > 180) {
                    tl += "\n...";
                }
            }
            tl += "\n";

        } else {
            // last track
            //log( "> last track" );
            //log( "> lastTrack_gap: " + lastTrack_gap );
            var lastTrack_gap = totalDur_Sec - endTime_Sec;
            //log( "> lastTrack_gap: " + lastTrack_gap );

            // is the last track close to end or possible gap?
            if (lastTrack_gap > 70) {
                tl += "\n[" + endTime + "] ?";
            }
            if (lastTrack_gap > 240) {
                tl += "\n...";
            }
        }

        i++;
    });

    // API
    tl = tl.trim();

    //log("tl before API:\n" + tl);

    if (tl !== "") {

        var res = apiTracklist(tl, "trackidNet"),
            tlApi = res.text;
        //log( "tlApi:\n" + tlApi );

        if (tlApi) {
            tlWrapper.before(ta);
            $("#mixesdb-TLbox").val(tlApi);
            fixTLbox(res.feedback);
        }
    } else {
        log("tl empty");
    }
});


/*
 * Fix ugly grid layout to proper tables
 */

// waitForKeyElements
waitForKeyElements(".MuiDataGrid-virtualScrollerRenderZone:not(.processed)", function( jNode ) {
    jNode.addClass("processed");
    setTimeout(function () {
        funcTidTables(jNode.closest(".MuiDataGrid-main"));
    }, timeoutDelay);
});
$(".MuiDataGrid-virtualScrollerRenderZone .MuiDataGrid-cell:not(.processed)").on("change", function() {
    jNode.addClass("processed");
    setTimeout(function () {
        funcTidTables($(this).closest(".MuiDataGrid-main"));
    }, timeoutDelay);
});

// funcTidTables
function funcTidTables(jNode) {
    logFunc( "funcTidTables" );
    $(".mdb-tid-table").remove();

    var audiostreams = [],
        heading = $(".MuiGrid-grid-xs-12 p.MuiTypography-body1"),
        grid = $(".data-grid", jNode).add(".MuiDataGrid-root");

    if (grid.length == 1 && grid.is(":visible")) {
        var tableClass = heading.text().replace(/ /g, ""),
            path = location.pathname.replace(/^\//, "");
        grid.before('<table class="mdb-tid-table ' + tableClass + ' ' + path + '"><tbody></tbody></table>');
        var tbody = $(".mdb-tid-table tbody");

        $(".MuiDataGrid-columnHeader", grid).each(function () {
            var text = $(this).text().replace(/ /g, ""),
                textId = $(this).attr("data-field");
            if (textId == "#") textId = "Index";
            if (textId) tbody.append('<th id="' + textId + '">' + text + '</th>');
        });

        $(".MuiDataGrid-row").each(function () {
            //log("get urls" + $(this).html());

            var rowId = $(this).attr("data-id"),
                listItemLink = $(".MuiDataGrid-cell--textLeft[data-colindex=2] a.white-link", this);

            if (typeof listItemLink.attr("href") !== "undefined") {
                var rowUrl = listItemLink.attr("href").replace(/^\//, ""),
                    urlSplit = rowUrl.split("/"),
                    urlType = urlSplit[0].replace(/s$/, ""), // musictrack or audiostream
                    urlValue = urlSplit[1];
            }

            if (urlValue) {
                switch (urlType) {
                    case "audiostream":
                        audiostreams.push(urlValue);
                        break;
                }
            }

            // each gridd cell
            tbody.append('<tr id="' + rowId + '" data-' + urlType + '="' + urlValue + '"></tr>');
            var thisTr = $("tr#" + rowId + "");

            $(".MuiDataGrid-cell", this).each(function () {
                var cellClass = $(this).attr("data-field"),
                    cellContent = $(this).html(),
                    contOutput = true,
                    playWrapper = $(this).closest('div.MuiDataGrid-row');
                cellContent = $(this).html();

                if (contOutput && cellContent) thisTr.append('<td class="' + cellClass + '">' + cellContent + '</td>');
            });
        });

        // hide grid but keep page navigation
        $(".MuiTablePagination-toolbar").insertAfter($(".mdb-tid-table"));

        // on audio pages hide the play button doesn't work in the copied tracklist table
        // but it is needed to generate the formatted tracklist textarea
        // so we hide the table and add the youtube search icon to the existing grid.
        if (urlPath(1) == "audiostreams") {
            $(".mdb-tid-table").fadeOut(300); // needs to be visible shortly for tracklist textarea generation
            grid.show();

            // add youtube search icon to grid
        } else {
            grid.addClass('mdb-hide');
        }

        // remove empty th
        //if( !addPlay ) $(".mdb-tid-table tbody th:first-of-type").remove();
    }

    log("audiostreams: " + audiostreams);
    log("> length: " + audiostreams.length);
    if (audiostreams.length > 0) {
        log("about to run trackidnet_checked_check_batch");

        var list = audiostreams.join(", "),
            res = trackidnet_checked("trackidnet_checked_check_batch", list);
        if (res !== null) {
            $.each(res, function () {
                var audiostream = $(this)[0].audiostream,
                    timestamp = $(this)[0].timestamp;
                log(audiostream);

                $("tr[data-audiostream='" + audiostream + "'] td.mixesdbPageCheck-status").html(checkIcon);
            });
            $(".mixesdbPageCheck-status-no").show();
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Submit request URLs
 * https://trackid.net/submitrequest
 * https://trackid.net/submitrequest?url=https://soundcloud.com/djrog/latin-vibes&keywords=foo%20bar
 * Passing URL pramater requires the userscript "MixesDB Userscripts Helper (by MixesDB)"
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function on_submitrequest() {
    logFunc( "on_submitrequest" );

    // submitted URL, page preview pops up
    // if exists, take user directly there without confirmation
    // Test URL page exists: https://soundcloud.com/resident-advisor/ra944-tsvi
    // Test URL page does not exist: https://soundcloud.com/djrog/latin-vibes
    // buggy if this part comes after the requestUrl part
    waitForKeyElements( ".audio-stream-box", submitrequest_pagePreview_wait);

    function submitrequest_pagePreview_wait(jNode) {
        log( "submitrequest_pagePreview_wait()" );
        // if page exists or not: Does the next element contains the "VIEW TRACKLIST" button?
        var firstButton = jNode.next(".MuiGrid-container").find("button:first"),
            firstButton_text = firstButton.text().toLowerCase(); // "view tracklist"
        logVar( "firstButton text", firstButton_text )

        if( firstButton_text == "view tracklist" ) {
            // page exists, send user directly there
            // existing page might still be processing!
            firstButton.trigger("click"); // We cannot catch that URL
        } else {
            // page does not exist
            // stay cos user might want to use the option "Notify me when ready"
        }
    }

    // if url was passed as parameter
    var requestUrl = getURLParameter( "requestUrl" );
    logVar( "requestUrl", requestUrl );

    // Insert the requestUrl to the submit input
    if( requestUrl && requestUrl !== "" ) {
        var requestUrl_domain = new URL( requestUrl ).hostname.replace("www.",""),
            keywords = getURLParameter("keywords");

        logVar( "requestUrl_domain", requestUrl_domain );
        logVar( "keywords", keywords );

        // add URL to input and try to submit
        waitForKeyElements( ".MuiGrid-grid-xs-12 .MuiFormControl-root input[type=text].MuiInputBase-input", function( jNode ) {
            logFunc( "submitRequest_input_wait" );

            // Submit notice cos we cannot just trigger a click on the the "VALIDATE" button
            // For YouTube URLs it doesn't allow a blank after the URL...
            var note_standard = create_note( "Press the SPACEBAR and ENTER to validate" ),
                note_YouTube  = create_note( "Press the SPACEBAR, BACKSPACE and ENTER" );

            switch( requestUrl_domain ) {
                case "youtube.com":
                    var submitNote = note_YouTube;
                    break;
                case "youtu.be":
                    var submitNote = note_YouTube;
                    break;
                default:
                    var submitNote = note_standard;
            }

            var input = create_input( requestUrl );
            jNode.closest(".MuiGrid-container").before( input );
            //var e = jQuery.Event( "keydown", { keyCode: 32 } );

            jNode.select();
            setTimeout(function () {
                jNode.val( requestUrl );
                //jNode.trigger( e );
                jNode.closest(".MuiGrid-container").after( submitNote );
            }, timeoutDelay);
        });

        // Add keywords to search input
        waitForKeyElements( "#search-box", function( jNode ) {
            logFunc( "submitRequest_searchInput_wait" );

            var newSearch = '<form id="mdb-replacedSearch" action="https://trackid.net/audiostreams" method="GET">';
                newSearch += create_button( "Search", "replaced-search-button inline", "submit" );
                newSearch += "&nbsp;&nbsp;";
                newSearch += create_input( keywords, "replaced-search-input inline", "keywords" );
                newSearch += '</form>';

            jNode.closest(".header-mid.MuiBox-root").replaceWith( newSearch );
        });

        // Click button "View Tracklist" when it appeas
        waitForKeyElements( "button.MuiButton-root", function( jNode ) {
            var buttonText = jNode.text();

            if( buttonText == "View Tracklist" || buttonText == "Submit" ) {
                jNode.click();
            }
        });
    }
}
