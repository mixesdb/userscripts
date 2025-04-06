// ==UserScript==
// @name         TrackId.net (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.04.06.5
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-TrackId.net_93
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-TrackId.net_61
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
    cacheVersion = 83,
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
    ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

// select elements
waitForKeyElements(".mdb-element.select", function( jNode ) {
    jNode.select().focus();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * mdbTrackidCheck
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * checkTidIntegration
 * save action: the mix page reference takes params page_id, dbKey, title
 */
function checkTidIntegration( tidPlayerUrl="", mdbPageId="", action="", wrapper="", target="audiostream page" ) {
    logFunc( "checkTidIntegration" );
    logVar( "action", action );
    logVar( "tidPlayerUrl", tidPlayerUrl );
    logVar( "wrapper", wrapper.html() );

    if( tidPlayerUrl && tidPlayerUrl != "" && typeof(tidPlayerUrl) !== "undefined" && tidPlayerUrl != "undefined" ) {
        var apiQueryUrl_check = apiUrl_mw;
        apiQueryUrl_check += "?action=mixesdbtrackid";
        apiQueryUrl_check += "&format=json";
        apiQueryUrl_check += "&url=" + tidPlayerUrl;

        var apiQueryUrl_save = apiQueryUrl_check + "&page_id=" + mdbPageId;

        // waiter
        if( target == "table" ) {
            var waiter = $("waiter", wrapper);
        }

        // by action
        switch( action ) {
            // check
            case "check":
                logVar( "apiQueryUrl_check", apiQueryUrl_check );

                $.ajax({
                    url: apiQueryUrl_check,
                    type: 'get', /* GET on checking */
                    dataType: 'json',
                    async: true,
                    success: function(data) {
                        // avoid undefined error
                        if( data.error && data.error.code == "notfound" ) {
                            if( target == "audiostream page" ) {
                                wrapper.html('Marking this as integrated is not possible yet.').show();
                            }
                            if( target == "table" ) {
                                waiter.remove();
                                wrapper.append( '<span class="tooltip-title" title="TrackId.net page not found (recently created?)">&ndash;</span>' );
                            }
                        // if no error
                        } else {
                            var checked_pageId = ( data.mixesdbtrackid && data.mixesdbtrackid[0].mixesdbpages[0] ) ? data.mixesdbtrackid[0].mixesdbpages[0].page_id : "",
                                checked_url = ( data.mixesdbtrackid && data.mixesdbtrackid[0].mixesdbpages[0] ) ? data.mixesdbtrackid[0].mixesdbpages[0].url : "";

                            if( checked_pageId == mdbPageId ) {
                                var lastCheckedAgainstMixesDB = data.mixesdbtrackid[0].mixesdbpages[0].lastCheckedAgainstMixesDB;

                                if( lastCheckedAgainstMixesDB != null ) {
                                    log( "Is marked as integrated (mdbPageId: " +mdbPageId+ ")" );
                                    $("input", wrapper).replaceWith(checkIcon);

                                    var checked_ago_text = toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );

                                    if( checked_ago_text ) $("label", wrapper).next("span.mdb-tooltip").replaceWith( checked_ago_text );

                                    /* show */
                                    wrapper.addClass("integrated").show();
                                } else {
                                    wrapper.show();
                                }

                            } else {
                                // audiostream page
                                if( target == "audiostream page" ) {
                                    log( "Not saved as integrated (mdbPageId: " +mdbPageId+ ")" );

                                    $("input", wrapper).removeAttr("checked").prop('checked', false);

                                    wrapper.show();
                                }

                                // tables
                                if( target == "table" ) {
                                    waiter.remove();

                                    if( checked_pageId ) {
                                        var lastCheckedAgainstMixesDB = data.mixesdbtrackid[0].mixesdbpages[0].lastCheckedAgainstMixesDB;
                                        logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                                        if( lastCheckedAgainstMixesDB != null && lastCheckedAgainstMixesDB != "empty" ) {
                                            log( "Checked and page found: ("+checked_pageId+")" );

                                            var checkedLink = '<a href="'+checked_url+'">'+checkIcon+'</a>';

                                            wrapper.append( checkedLink );
                                        } else {
                                            // Add checkbox in tables for certain users
                                            var currentUsername = $(".user-name").text();

                                            if( currentUsername == "Schrute_Inc._disabled" || currentUsername == "Komapatient" ) {
                                                var status_td = wrapper.prev("td.status"),
                                                    status = $("div.MuiBox-root",status_td).attr("aria-label").trim();

                                                logVar( "status", status );

                                                if( status == "Tracklist ready" ) {
                                                    var input = make_mdbTrackidCheck_input( tidPlayerUrl, checked_pageId, "table" );
                                                    wrapper.append( input );
                                                }
                                            } else {
                                                wrapper.append( "not yet" );
                                            }
                                        }
                                    } else {
                                        log( "No checked_pageId! Run searchKeywords API for player URL to get the mdbPageId" );

                                        var apiQueryUrl = apiUrl_searchKeywords_fromUrl( tidPlayerUrl );
                                        logVar( "apiQueryUrl", apiQueryUrl );

                                        $.ajax({
                                            url: apiQueryUrl,
                                            type: 'get',
                                            dataType: 'json',
                                            async: false,
                                            success: function(data) {
                                                var resultNum = data["query"]["searchinfo"]["totalhits"];
                                                if( resultNum == 1 ) {
                                                    // @TODO DRY
                                                    var resultsArr = data["query"]["search"],
                                                        mdbPageId = resultsArr[0].pageid,
                                                        currentUsername = $(".user-name").text();

                                                    if( mdbPageId && currentUsername == "Schrute_Inc." || currentUsername == "Komapatient" ) {
                                                        var status_td = wrapper.prev("td.status"),
                                                            status = $("div.MuiBox-root",status_td).attr("aria-label").trim();

                                                        logVar( "status", status );

                                                        if( status == "Tracklist ready" ) {
                                                            var input = make_mdbTrackidCheck_input( tidPlayerUrl, mdbPageId, "table" );
                                                            wrapper.append( input );
                                                        } else {
                                                            wrapper.append( '<span class="tooltip-title" title="Status is not ready">&ndash;</span>' );
                                                        }
                                                    } else {
                                                        wrapper.append( "not yet" );
                                                    }
                                                } else {
                                                    log( "resultNum != 1: " + resultNum );

                                                    if( resultNum == 0 ) {
                                                        wrapper.append( '<span class="tooltip-title small" title="No MixesDB mix page found using this player">not found</span>' );
                                                    }
                                                    if( resultNum > 1 ) {
                                                        wrapper.append( '<span class="tooltip-title small" title="Bug: Too many results">multiple pages using this</span>' );
                                                    }
                                                }
                                            }
                                        }); // end ajax
                                    }
                                }
                            }
                        }
                    }
                });
                break;

            // save
            case "save":
                //logVar( "apiQueryUrl_save", apiQueryUrl_save );

                // confirm, disable input
                $.ajax({
                    url: apiQueryUrl_save,
                    type: 'post', /* POST on saving */
                    dataType: 'json',
                    async: true,
                    success: function(data) {
                        checkTidIntegration( tidPlayerUrl, mdbPageId, "check", wrapper, target );
                    }
                });
                break;
        }
    }
}

/*
 * mdbTrackidCheck-wrapper
 */
waitForKeyElements("#mdbTrackidCheck-wrapper", function( jNode ) {
    // vars
    var input_mdbTrackidCheck = $("input.mdbTrackidCheck", jNode),
        input_checked = input_mdbTrackidCheck.attr("checked"),
        tidPlayerUrl = input_mdbTrackidCheck.attr("data-tidplayerurl"),
        mdbPageId = input_mdbTrackidCheck.attr("data-mdbpageid");

    logVar( "input_checked", input_checked );
    logVar( "tidPlayerUrl", tidPlayerUrl );
    logVar( "mdbPageId", mdbPageId );

    // on load, check
    checkTidIntegration( tidPlayerUrl, mdbPageId, "check", jNode, "audiostream page" );

    // on click, save
    input_mdbTrackidCheck.on( "click", function() {
        logFunc( "mdbTrackidCheck on click" );

        // mark as checked
        if( input_checked != "checked" && tidPlayerUrl && mdbPageId ) {
            checkTidIntegration( tidPlayerUrl, mdbPageId, "save", jNode, "audiostream page" );
        }
    });
});

/*
 * tables
 */
waitForKeyElements(".mdb-tid-table td.mdbTrackidCheck", function( jNode ) {
    var playerUrl = jNode.attr("data-tidplayerurl");

    if( playerUrl != "undefined" ) {
        checkTidIntegration( playerUrl, null, "check", jNode , "table" );
    }
});

waitForKeyElements(".mdb-tid-table td.mdbTrackidCheck input[type=checkbox]", function( jNode ) {
    var wrapper = jNode.closest("td.mdbTrackidCheck"),
        tidPlayerUrl = jNode.attr("data-tidplayerurl"),
        mdbPageId = jNode.attr("data-mdbpageid");

    jNode.on( "click", function() {
        logVar( "tidPlayerUrl", tidPlayerUrl );
        logVar( "mdbPageId", mdbPageId );

        if( tidPlayerUrl != "undefined" && mdbPageId != "undefined" ) {
            checkTidIntegration( tidPlayerUrl, mdbPageId, "save", wrapper, "table" );
        }
    });
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
                wrapper = jNode.closest(".audio-stream-box");
            embed_hearthis_fromAnyUrl( playerUrl, wrapper, "append" );
    }
    //log( embed );

    // embed player
    $(".mdb-player-audiostream").remove();
    if( embed != "" ) {
        // embedded player output
        var mdbPlayerAndToolkit = '<div class="mdb-player-audiostream" data-tidplayerurl="'+playerUrl+'">' + embed + '</div>';
        jNode.closest(".audio-stream-box").append( mdbPlayerAndToolkit );
        jNode.hide();
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

        title = removeDuplicateBracketedText( title );

        //logVar( "artist", artist );
        //logVar( "title", title );

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
        //logVar( "thisTrack", thisTrack );

        // gaps
        // add "..." row if gap is too laarge
        if( !$(this).is(':last-child') ) {
            // not last track
            var gapSec = startTimeNext_Sec - endTime_Sec;
            //log( "-------------------------------" );
            //log( "> startTime: " + startTime );
            //log( "> startTime_Sec: " + startTime_Sec );
            //log( "> endTime: " + endTime );
            //log( "> next startTime: " + startTimeNext );
            //log( "> gapSec: " + gapSec );

            // TID end times sometimes before start time
            // https://trackid.net/audiostreams/b5096745-56ad-4d4d-af61-8d16e32e0521
            // don't create next "[dur] ?" tracks then
            if( endTime_Sec < startTime_Sec ) {
                log( "Negative gapSec!" );
                tl += "\n...";

            } else {
                if( gapSec > 30 ) {
                    tl += "\n[" + endTime + "] ?";
                    if (gapSec > 180) {
                        tl += "\n...";
                    }
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

        var res = apiTracklist( tl, "trackidNet" ),
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
        funcTidTables( jNode.closest(".MuiDataGrid-main") );
    }, timeoutDelay);
});
$(".MuiDataGrid-virtualScrollerRenderZone .MuiDataGrid-cell:not(.processed)").on("change", function() {
    jNode.addClass("processed");
    setTimeout(function () {
        funcTidTables( $(this).closest(".MuiDataGrid-main") );
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
            var text = $(this).text().replace(/ /g, "").replace("CreatedOn", "Created on").replace("RequestedOn", "Requested on").replace("RequestedBy", "Requested by"),
                textId = $(this).attr("data-field");
            if (textId == "#") textId = "Index";
            if (textId) {
                tbody.append('<th id="' + textId + '">' + text + '</th>');
            }
        });

        tbody.append('<th class="mdbTrackidCheck">MixesDB<br />integration</th>');

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

                if (contOutput && cellContent) {
                    thisTr.append('<td class="' + cellClass + '">' + cellContent + '</td>');
                }
            });

            // mdbTrackidCheck
            var thisPlayerUrl = $(".AudioStreamType", thisTr).find("a").attr("href");
            thisTr.append('<td class="mdbTrackidCheck" data-tidplayerurl="' + thisPlayerUrl + '"><waiter>…</waiter></td>');
        });

        // hide grid but keep page navigation
        $(".MuiTablePagination-toolbar").insertAfter($(".mdb-tid-table"));

        // on audio pages hide the play button doesn't work in the copied tracklist table
        // but it is needed to generate the formatted tracklist textarea
        // so we hide the table and add the youtube search icon to the existing grid.
        if( urlPath(1) == "audiostreams" ) {
            $(".mdb-tid-table").fadeOut(300); // needs to be visible shortly for tracklist textarea generation
            grid.show();

            // add youtube search icon to grid
            // @TODO: What did I mena here?
        } else {
            // @TODO: Only show if opted in by new cookie option
            if( !/audiostreams\?keywords.+/g.test( urlPath(1) )  ) {
                grid.addClass('mdb-hide');
            }
        }

        // remove empty th
        //if( !addPlay ) $(".mdb-tid-table tbody th:first-of-type").remove();
    }

    //log("audiostreams: " + audiostreams);
    //log("> length: " + audiostreams.length);
    if (audiostreams.length > 0) {
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