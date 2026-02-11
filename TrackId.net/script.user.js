// ==UserScript==
// @name         TrackId.net (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.11.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-TrackId.net_109
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-TrackId.net_77
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.funcs.js?v_2
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
var cacheVersion = 96,
    scriptName = "TrackId.net";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var timeoutDelay = 600,
    tid_minGap = 3,
    ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

// select elements
waitForKeyElements(".mdb-element.select", function( jNode ) {
    jNode.select().focus();
});


/*
 * fixTidLabelnames
 * Removes duplicate comma-separated names (case-insensitive)
 *  Keeps the first occurrence, preserves order, trims whitespace.
 */
String.prototype.removeDuplicateNames = function () {
    const input = String(this ?? "");

    const parts = input
        .split(/\s*,\s*/)       // split on commas
        .map(s => s.trim())     // trim each
        .filter(Boolean);       // drop empties

    const seen = new Set();
    const result = [];

    for (const p of parts) {
        const key = p.toLowerCase(); // case-insensitive uniqueness
        if (!seen.has(key)) {
            seen.add(key);
            result.push(p);
        }
    }

    return result.join(", ");
};


/*
 * fixTidLabelnames
 */
String.prototype.fixTidLabelnames = function() {
    logFunc( "fixTidLabelnames" );

    var text = this.toString()
                   .replace( /\d+$/gi, '' ) // label == numbers only https://trackid.net/audiostreams/dj-koze-live-mayday-2003westfalenhalle-dortmund

                   // remove legal corporate entities
                   .replace( /(^|, )(.+) S\.?r\.?l\.?/gi, '$1$2' ) // Expanded Music Srl
                   .replace( /(^|, )(.+) GmbH/gi, '$1$2' ) // Foo GmbH
                   .replace( /^(.+), LLC/gi, '$1' ) // e.g. Tommy Boy Music, LLC
                   ;
    return text;
};


/*
 * removeMajorLabels
 * Once completed, move the logic to TLE
 */
String.prototype.removeMajorLabels = function() {
    logFunc( "removeMajorLabels" );

    var text = this.toString()
                   .replace( /(^|, )Atlantic( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )(A )?BMG( [^\]]+)?$/gi, '' )
                   .replace( /Bonzai Classics/gi, 'Bonzai' )
                   .replace( /(^|, )Capitol( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Columbia( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )EMI( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Epic( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )High Fashion Music( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Hitpool( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Island (Mercury|Records)( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Metrophon( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )PLG UK( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Polydor( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )(A )?Sony( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )The Vault( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )(UMC|Universal Music|Universal-Island)( [^\]]+)?(, a division of .+)?$/gi, '' )
                   .replace( /(^|, )UMOD.+Universal.+/gi, '' )
                   .replace( /(^|, )Ultra, LLC( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )UNI\/MOTOWN( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Warner( [^\]]+)?$/gi, '' )
                   .replace( /(?:^|, )WM Germany(?: - )([^\]]+)?$/gi, '$1' )
                   .replace( /^WM Sweden$/gi, '' )
                   // re-issues
                   .replace( /(^|, )(Azuli|Verve) (Back Catalog|Reissues)( [^\]]+)?$/gi, '$1$2' )
                   .replace( /(^|, )(Altra Moda Music|RMD Entertainment|S&S Records)$/gi, '' )
                   // different Catalogs
                   .replace( /(^|, )(Clarence Avant|Onelove|PIAS) (Recordings )?Catalog(ue)?( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Recordings Catalogue( [^\]]+)?$/gi, '' ) // yes, "Recordings Catalogue"! https://trackid.net/audiostreams/subfader-the-ghetto-funk-show-summer-beats-20090119
                   .replace( /(^|, )12" Golden Dance Classics$/g, '' )
                   ;
    return text;
};


/*
 * removeArtistLabels
 * "Abe Duque - What Happened? [Abe Duque Records]" > "Abe Duque - What Happened?" https://trackid.net/audiostreams/drea-31-october-2025
 */
String.prototype.removeArtistLabels = function(artist) {
  if (!artist) return this.trim();

  const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}(?:\\s+(?:Records|Recordings|Music|Label))?$`, 'i');

  return re.test(this.trim()) ? '' : this.trim();
};


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Initialize feature functions per url path
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 50 );

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

                                // Add checkbox in tables for certain users
                                var currentUsername = $(".user-name").text(),
                                    allowUserTableMarking = ["Schrute_Inc.", "Komapatient"].includes(currentUsername);

                                var dashText = '<span class="tooltip-title" title="Status is not ready">&ndash;</span>',
                                    notYetIntegratedText = '<span class="tooltip-title small" title="This tracklist is not intergated yet to the found mix page">not yet</span>';

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
                                            var status_td = wrapper.prev("td.status"),
                                                status = $("div.MuiBox-root",status_td).attr("aria-label").trim();

                                            logVar( "status", status );

                                            if( status == "Tracklist ready" ) {
                                                if( allowUserTableMarking ) {
                                                    var input = make_mdbTrackidCheck_input( tidPlayerUrl, checked_pageId, "table" );
                                                    wrapper.append( input );
                                                } else {
                                                    wrapper.append( notYetIntegratedText );
                                                }
                                            } else {
                                                wrapper.append( dashText );
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
                                                        mdbPageId = resultsArr[0].pageid;

                                                    if( mdbPageId ) {
                                                        var status_td = wrapper.prev("td.status"),
                                                            status = $("div.MuiBox-root",status_td).attr("aria-label").trim();

                                                        logVar( "status", status );

                                                        if( status == "Tracklist ready" ) {
                                                            if( allowUserTableMarking ) {
                                                                var input = make_mdbTrackidCheck_input( tidPlayerUrl, mdbPageId, "table" );
                                                                wrapper.append( input );
                                                            } else {
                                                                wrapper.append( notYetIntegratedText );
                                                            }
                                                        } else {
                                                            wrapper.append( dashText );
                                                        }
                                                    } else {
                                                        wrapper.append( notYetIntegratedText );
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
 * Menu
 * minimal changes only
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".user-name", function( jNode ) {
    var userName = jNode.closest("button");

    var quickLinks = '<ul class="mdb-quickLinks mdb-nolist mdb-highlight-hover">';
    quickLinks += '<li><a href="/submiturl?from=menu">Submit</a></li>';
    quickLinks += '<li><a href="/myrequests?from=menu">My requests</a></li>';
    quickLinks += '</ul>';

    userName.before( quickLinks );
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
            logVar( "titleText toolkit", titleText );
            getToolkit( playerUrl, "playerUrl", "detail page", jNode, "after", titleText, "link", 1 );
            jNode.addClass("mdb-processed-toolkit");
        });
    }
}

// embed player
waitForKeyElements(".request-summary img.artwork", function( jNode ) {
    var playerUrl = jNode.closest("a").attr("href"),
        heading = $(".MuiGrid-root h1"),
        titleText = normalizeTitleForSearch( heading.text() );

    logVar( "playerUrl (in artwork as given)", playerUrl );

    // Remove dots from hearthis slugs (So marking as integrated works)
    // https://trackid.net/audiostreams/subfader-house
    // > https://hearthis.at/subfader/h.o.u.s.e./ >> https://hearthis.at/subfader/house/
    var playerUrl_domain = getDomain_fromUrlStr( playerUrl );
    logVar( "playerUrl_domain", playerUrl_domain );
    if( playerUrl_domain == "hearthis.at" ) {
        playerUrl = playerUrl.removeDotsFromUrlSlug();
        logVar( "playerUrl (after removeDotsFromUrlSlug() for hearthis.at)", playerUrl );
        // change URL in artwork as well
        jNode.closest("a").attr("href", playerUrl);
    }

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
        var thisTrack = "";
        var thisTitle = $(".title", this).text().replace(/\s*\n\s*/g, ' ').trim();

        logVar( "title before replacing", thisTitle );

        var artist = $(".artist", this).text()
                       .replace(/\s*\n\s*/g, ' ') // https://trackid.net/audiostreams/nature-one-2024-opening-gayphoriastage
                       .replace(/([A-Z0-9]),([A-Z0-9])/i, "$1, $2") // https://trackid.net/audiostreams/calvo-at-nature-one-2o17-we-call-it-home
                       .removeDuplicateNames()
                       ,
            title  = thisTitle
                       .replace(")[", ") [") // normalize ")[" in title for futther treatment (removal) https://trackid.net/audiostreams/subfader-subfreaquence-house-tech-house-20100208
                       .replace(/\s*-\s*(?:feat(?:\.|uring)?)\s+(.+?)(?=$|\s*\()/i, ' (featuring $1)') // Scared Of My Heart - featuring E.R. Thorpe (Andre Lodemann Remix) https://trackid.net/audiostreams/balance-selections-215-james-harcourt#google_vignette
                       .replace(/ \(\d+ - Remaster\)$/, "") // Foo (Nutt Mix - Remastered 2021)
                       .replace(/^(.+) [\(\[](.+) - (?:\d+ )?Remaster(?:ed|ing)?(?: \d+)?[\)\]]/g, "$1 ($2)") // All Night (I Can Do It Right) (2016 - Remaster) https://trackid.net/audiostreams/subfader-the-ghetto-funk-show-20090216-mix-2 | Run before below stuff
                       .replace(/\s*[\(\[][^\(\[\)]*(Digital\s+Remaster|Mastering)[^\)\]]*[\)\]]/gi, "") // Title (2002 Digital Remaster / 24-Bit Mastering) https://trackid.net/audiostreams/dr-packer-live-in-ibiza-august-2025-hard-rock-hotel
                       .replace(/^(.+) [\(\[]Re-?master(ed|ing|is[ée])?( En)?(?:\s'?\d{2,4})?[\)\]]/gi, "$1") // (Remasterisé En 2002), also [Remaster] https://trackid.net/audiostreams/xmix3-1994-richie-hawtin-john-acquaviva-enter-the-digital-reality
                       .replace(/(.+) - (.+ (?:Remix|Mix|Version))/g, "$1 ($2)")
                       .replace(/^\((.+)\)$/g, "$1") // avoid "[000] Inland [Systemscan]" https://trackid.net/audiostreams/shed-josey-rebelle-sven-von-thulen-txl-berlin-recordings-chapter-7-arte-concert
                       .replace(/^(.+)-\d{4,5}$/g, "$1") // numbers as suffix, e.g. "Track Title-24070" https://trackid.net/audiostreams/alex-kvitta-sonderspur-pod-011281213
                       .replace(/^(.+) - (.+)$/g, "$1 ($2)") // "Track Title - Some Version" https://trackid.net/audiostreams/dj-hell-mayday-1999-soundtropolis
                       .replace(/(.+) \((\d+ )?Remaster(ed|ing)?( \d+)?\)$/g, "$1") // "Track Title - (Remaster)" etc
                       .replace(/(.+) \((\d+ )?([A-Za-z]+ )?(\s*Re-?master(ed|ing|;)?)(\s*(Mix|Version|Edition))?\)$/gi, "$1") // "Track Title - (2013 Japan Remaster; Remastered)"
                       .replace(/\s+\(Mixed\)/i, "") // remove " (Mixed)" https://trackid.net/audiostreams/balance-selections-234-sinca
                       .replace(/\s*\((?=Original)[^()]*?(?:\([^()]*\)[^()]*)*\)/gi, "") // (Original Mix (Digital Only)) and variants https://trackid.net/audiostreams/sirarthur-chris-liebing-umek-gayle-san-live-u60311-19991105-1of9
                       ;

        let label = "";
        let $label = $(".label", this);
        if ($label.length && $label.text().trim() !== "") {
            logVar( "label before fixing", $label.text() );

            label = $label.text()
                .replace(/\s*\n\s*/g, " ")
                .replace("Records (Distribution)", "Records")
                .replace(/[\[\]]/g, "")
                .fixTidLabelnames()
                .removeMajorLabels()
                .removeArtistLabels(artist)
            ;

            logVar( "label after fixing", label );
        }

        var startTime = $(".startTime", this).text(),
            startTime_Sec = durToSec(startTime),
            endTime = $(".endTime", this).text(),
            endTime_Sec = durToSec(endTime),
            previousTrack = $(".MuiDataGrid-row:eq(" + (i - 2) + ")"), // eq starts at 0
            endTimePrevious = $(".MuiDataGrid-cell[data-field='endTime']", previousTrack).text(),
            endTimePrevious_Sec = durToSec(endTimePrevious),
            nextTrack = $(".MuiDataGrid-row:eq(" + (i) + ")"), // eq starts at 0
            startTimeNext = $(".MuiDataGrid-cell[data-field='startTime']", nextTrack).text(),
            startTimeNext_Sec = durToSec(startTimeNext);

        artist = stripCountryCodes( artist );
        title = removePointlessVersions( title );
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

        // catch title (feat. artist2) and add to artist
        // should actually be catched by TLE (issue#525)
        var match = title.match(/\s*\(feat\. [^)]+\)/i);
        if (match) {
            var featPart = match[0].trim(); // e.g., "(feat. Foo)"
            title = title.replace(match[0], '').trim();
            artist += ' ' + featPart;
        }

        // artist - title
        if (artist && title !== "") {
            var artist_title = artist + ' - ' + title;

            // last checks
            // if found track is title of Mix CD
            // https://trackid.net/audiostreams/groove-podcast-481-bossy-doll-bina
            if (/\(Continuous DJ Mix\)\s*$/i.test(title)) {
                artist_title = "?";
                label = "";
            }

            thisTrack += artist_title;
        }

        // fixes on "Artist - Title"
        thisTrack = thisTrack.removeDuplicatedVersionArtist();

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
    log("tl before API:\n" + tl);

    if (tl !== "") {
        var res = apiTracklist( tl, "trackidNet" ),
            tlApi = res.text;
        log( 'tlApi ("trackidNet"):\n' + tlApi );

        if( tlApi ) {
            var tl_arr = make_tlArr( tlApi ),
                tl_arr_fixedCues = tidMarkFalseCues( addCueDiffs( tl_arr ) ),
                tl_arr_noDupes = removeAdjacentDuplicateTracks( tl_arr_fixedCues ),
                tl_fixedCues = arr_toTlText( tl_arr_noDupes );

            log( "tl_fixedCues:\n" + tl_fixedCues );

            var res_fixedCues = apiTracklist( tl_fixedCues, "trackidNet" ),
                tlApi_fixedCues = res_fixedCues.text;

            if( tlApi_fixedCues ) {
                tlWrapper.before( ta );

                $("#mixesdb-TLbox").addClass("mixesdb-TLbox")
                    .val( tlApi_fixedCues )
                    .attr( "data-tlcandidate", tlApi );

                fixTLbox( res.feedback );
            }

            if( tlApi.split("\n").length != tlApi_fixedCues.split("\n").length ) {
                var info_cuesRemoved = '<li class="info_cuesRemoved">Possibly false <code>"?"</code> tracks have been removed due to short cue differences.';
                info_cuesRemoved += ' <button id="toggleTlCandidate" class="hand">Toggle</button>';
                //info_cuesRemoved += '&nbsp; <span id="select_tidminGap_wrapper" style="display:none">Max gap: <select id="select_tidminGap"><option>1</option><option>2</option><option selected="selected">3</option></select> minutes</span>';
                info_cuesRemoved += '</li>';

                $("#tlEditor-feedback-topInfo").prepend( info_cuesRemoved );
            }

            // fix CSS
            $("#tlEditor").parent().parent().css("display","block");
        }
    } else {
        log("tl empty");
    }
});



function toggleTracklistTextareaCueFormat() {
    var ta = $("textarea.mixesdb-TLbox");
    if (!ta.length) return;

    var currentFormat = ta.attr("data-mdb-cue-format") || "MM";
    var nextFormat = currentFormat === "MM" ? "HMM" : "MM";

    if (currentFormat === "MM") {
        ta.attr("data-mdb-cue-original", ta.val() || "");
    }

    if (nextFormat === "MM") {
        var originalTracklist = ta.attr("data-mdb-cue-original");
        if (typeof originalTracklist !== "undefined") {
            ta.val(originalTracklist);
            ta.attr("data-mdb-cue-format", nextFormat);

            var buttonLabel_mm = "Switch cue format (mmm > h:m)";
            $("#switchCueFormat").text(buttonLabel_mm);
            return;
        }
    }

    var lines = String(ta.val() || "").split("\n");
    var convertedLines = lines.map(function (line) {
        return line.replace(/^\s*\[\s*([0-9\?:]+)\s*\]/, function (m, cue) {
            return "[" + toggleCue_MM_HMM(cue) + "]";
        });
    });

    ta.val(convertedLines.join("\n"));
    ta.attr("data-mdb-cue-format", nextFormat);

    var buttonLabel = nextFormat === "HMM" ? "Switch cue format (h:m > mmm)" : "Switch cue format (mmm > h:m)";
    $("#switchCueFormat").text(buttonLabel);
}

waitForKeyElements("ul#tlEditor-feedback-topInfo", function(jNode) {
    if (!$("#switchCueFormat").length) {
        jNode.prepend('<li class="info_switchCueFormat"><button id="switchCueFormat" class="hand">Switch cue format (mmm > h:m)</button></li>');
    }
});

$(document).on("click", "#switchCueFormat", function(e) {
    e.preventDefault();
    toggleTracklistTextareaCueFormat();
});

// toggleTlCandidate
waitForKeyElements("#toggleTlCandidate", function( jNode ) {
    jNode.click(function() {
        logFunc( "toggleTlCandidate" );

        var ta = $("textarea.mixesdb-TLbox"),
            ta_rows = ta.attr("rows"),
            tl_orig = ta.val(),
            tl_candidate = ta.attr("data-tlcandidate");

        logVar( "tl_orig", tl_orig );
        logVar( "tl_candidate", tl_candidate );

        if( tl_candidate ) {
            var tl_candidate_rows = tl_candidate.split("\n").length;

            ta.val( tl_candidate )
                .attr( "data-tlcandidate", tl_orig );

            //$("#select_tidminGap_wrapper").show();

            if( ta_rows < tl_candidate_rows ) {
                ta.attr( "rows", tl_candidate_rows );
            }
        }
    });
});


/*
 * Fix ugly grid layout to proper tables
 */

var skipReplacingTables = false;
if( urlPath_noParams(1) == "submiturl" ) {
    skipReplacingTables = true;
}
// waitForKeyElements
if( !skipReplacingTables ) {
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
}

// funcTidTables
function funcTidTables(jNode) {
    logFunc( "funcTidTables" );

    $(".mdb-tid-table").remove();

    var audiostreams = [],
        heading = $(".MuiGrid-grid-xs-12 p.MuiTypography-body1"),
        grid = $(".data-grid", jNode).add(".MuiDataGrid-root");

    if (grid.length == 1 && grid.is(":visible")) {
        var tableClass = heading.text()
                             .replace(/[<>]+/g,"") // sane https://trackid.net/audiostreams/mr-c-at-mw-at-club-o-dance-theatre-den-haag-nl-25-february-2000
                             .replace(/ /g, "")
                         ,
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
    var manualSubmitReady = false;

    function setInputValue(inputEl, value) {
        if (!inputEl) {
            return;
        }

        var valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        valueSetter.call(inputEl, value);
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function clickValidateButton() {
        var button = $("button.MuiButton-root").filter(function () {
            return $(this).text() === "Validate";
        }).first();

        if (button.length && !button.prop("disabled")) {
            button.trigger("click");
            return true;
        }

        return false;
    }

    function clickSubmitButton() {
        var button = $("button.MuiButton-root").filter(function () {
            return $(this).text() === "Submit";
        }).first();

        if (button.length && !button.prop("disabled")) {
            button.trigger("click");
            return true;
        }

        return false;
    }

    var submitClicked = false;
    function maybeAutoSubmit() {
        if (submitClicked) {
            return;
        }

        if (clickSubmitButton()) {
            submitClicked = true;
        }
    }

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

    waitForKeyElements( "button.MuiButton-root", function( jNode ) {
        if( jNode.text() === "Submit" ) {
            maybeAutoSubmit();
        }
    });

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
                setInputValue(jNode.get(0), requestUrl);
                //jNode.trigger( e );
                jNode.closest(".MuiGrid-container").after( submitNote );

                var attempts = 0;
                var clickTimer = setInterval(function () {
                    attempts += 1;
                    if (clickValidateButton() || attempts > 20) {
                        clearInterval(clickTimer);
                    }
                }, 250);
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
