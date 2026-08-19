// ==UserScript==
// @name         TrackId.net (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.19.38
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-TrackId.net_114
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-TrackId.net_12
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-TrackId.net_119
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_definitions.js?v_41
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_builder.js?v_59
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/tracklist_detector.js?v_13
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/page_creator.js?v_75
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v-TrackId.net_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.funcs.js?v_2
// @include      http*trackid.net*
// @include      http*mixesdb.com/w/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trackid.net
// @noframes
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var cacheVersion = 151,
    scriptName = "TrackId.net";
window.scriptName = scriptName; // toolkit.js reads this global directly

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + "shared/page_creator/page_creator.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );

// MixesDB page creator: normally the row is only offered for players that are NOT on MixesDB
// yet - for a used player there is nothing to create. With this on, the row is shown for used
// players too, marked "used" and without the "Create" link (which would only start a duplicate
// page). On window because page_creator.js is a @require and cannot see this IIFE's scope.
window.mdbPageCreator_showForUsedPlayers = true; // True as default for the beta phase, like on SoundCloud

// Loading skeleton on audiostream pages: the grey pulsing placeholder below the embedded
// player (which shows straight away) until toolkit and page creator row have arrived -
// shared with SoundCloud, see mdbSkeleton_* in shared/page_creator/page_creator.js. With
// this off, the pieces pop in one by one; the time until everything has loaded is logged
// the same way in both modes.
window.mdbSkeleton_enabled = true;


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
 * removeDuplicateNames
 * Removes duplicate comma-separated names (case-insensitive)
 * Keeps the first occurrence, preserves order, trims whitespace.
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
 * fixTidArtistnames
 */
String.prototype.fixTidArtistnames = function() {
    logFunc( "fixTidArtistnames" );

    var text = this.toString()
                   .replace( "Danilo Plessow & Motor City Drum Ensemble", "Motor City Drum Ensemble" )
                   ;
    return text;
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
                   .replace( /^(.+) (UK|US)/gi, '$1' ) // Country codes, eg ADA UK
                   .replace( "Defected - Slip 'N' Slide", "Slip 'N' Slide" )
                   .replace( "DUB Recordings", "" ) // would end up as [DUB] > (Dub)
                   .replace( "VIVa MUSiC (BEAT Music Fund)", "VIVa" )
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
                   .replace( /(^|, )(PLG - )?Capitol( [^\]]+)?$/gi, '' )
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
                   .replace( /(^|, )(Altra Moda Music|Essential 12" Classics|Essential Media|RMD Entertainment|S&S Records)$/gi, '' )
                   // different Catalogs
                   .replace( /(^|, )(Clarence Avant|Onelove|PIAS) (Recordings )?Catalog(ue)?( [^\]]+)?$/gi, '' )
                   .replace( /(^|, )Recordings Catalogue( [^\]]+)?$/gi, '' ) // yes, "Recordings Catalogue"! https://trackid.net/audiostreams/subfader-the-ghetto-funk-show-summer-beats-20090119
                   .replace( /(^|, )12" Golden Dance Classics$/g, '' )
                   // Stupid artist labels
                   .replace( /^Danilo Plessow$/g, '' )
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
 * grab url path and fire functions
 * TrackId.net is a React app: clicking through the site never loads a document, so this runs
 * again for every page the user opens - see onUrlChange() in global.js.
 */
function runTrackIdPage() {
    var path1 = window.location.pathname.replace(/^\//, "");

    logVar( "path1", path1 );

    // funcTidTables() hides the site's own data grid behind our table. onUrlChange() has just
    // removed our table, so the grid has to be given back until the table is rebuilt -
    // otherwise the new page shows an empty space where its list should be.
    $(".mdb-hide").removeClass("mdb-hide");

    switch( path1 ) {
        case "submiturl":
            on_submitrequest();
            break;
    }
}

if( visitDomain == "trackid.net" ) {
    // Only on trackid.net: this script also runs on mixesdb.com/w/*, which is a plain wiki
    // where every navigation is a real page load anyway.
    d.ready(function(){
        onUrlChange( runTrackIdPage, { runNow: true } );
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * mdbTrackidCheck
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * checkTidIntegration
 * save action: the mix page reference takes params page_id, dbKey, title
 */

function getMixesdbTrackIdPages( data ) {
    var resultItems = ( data && Array.isArray( data.mixesdbtrackid ) ) ? data.mixesdbtrackid : [];

    return ( resultItems[0] && Array.isArray( resultItems[0].mixesdbpages ) ) ? resultItems[0].mixesdbpages : [];
}

function getMixesdbTrackIdPageById( data, mdbPageId ) {
    var pages = getMixesdbTrackIdPages( data ),
        matchedPage = null;

    $.each( pages, function( index, page ) {
        if( String( page.page_id ) == String( mdbPageId ) ) {
            matchedPage = page;
            return false;
        }
    });

    return matchedPage;
}

function markTidIntegrationWrapperIntegrated( wrapper, lastCheckedAgainstMixesDB ) {
    if( $("input", wrapper).length > 0 ) {
        $("input", wrapper).replaceWith(checkIcon);
    }

    if( lastCheckedAgainstMixesDB ) {
        var checked_ago_text = toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );

        if( checked_ago_text ) $("label", wrapper).next("span.mdb-tooltip").replaceWith( checked_ago_text );
    }

    wrapper.addClass("integrated").show();
}

function checkTidIntegration( tidPlayerUrl="", mdbPageId="", action="", wrapper="", target="audiostream page" ) {
    logFunc( "checkTidIntegration" );
    logVar( "action", action );
    logVar( "tidPlayerUrl", tidPlayerUrl );
    logVar( "mdbPageId", mdbPageId );
    logVar( "target", target );
    logVar( "wrapper.length", wrapper.length );
    logVar( "wrapper.classes", wrapper.attr("class") );
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
                    beforeSend: function() {
                        log( "mdbTrackidCheck check request started" );
                    },
                    success: function(data, textStatus, jqXHR) {
                        log( "mdbTrackidCheck check request success" );
                        logVar( "check textStatus", textStatus );
                        logVar( "check httpStatus", jqXHR.status );
                        logVar( "check response", data );
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
                            var checkedPage = getMixesdbTrackIdPageById( data, mdbPageId ),
                                checked_pageId = checkedPage ? checkedPage.page_id : "";

                            if( checkedPage ) {
                                var lastCheckedAgainstMixesDB = checkedPage.lastCheckedAgainstMixesDB;

                                if( lastCheckedAgainstMixesDB != null ) {
                                    log( "Is marked as integrated (mdbPageId: " +mdbPageId+ ")" );
                                    markTidIntegrationWrapperIntegrated( wrapper, lastCheckedAgainstMixesDB );
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
                                    renderTableTrackIdCheckResult( tidPlayerUrl, wrapper, data, waiter );
                                }
                            }
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        log( "mdbTrackidCheck check request error" );
                        logVar( "check textStatus", textStatus );
                        logVar( "check errorThrown", errorThrown );
                        logVar( "check httpStatus", jqXHR.status );
                        logVar( "check responseText", jqXHR.responseText );
                    },
                    complete: function(jqXHR, textStatus) {
                        log( "mdbTrackidCheck check request complete" );
                        logVar( "check complete textStatus", textStatus );
                        logVar( "check complete httpStatus", jqXHR.status );
                        logVar( "wrapper.classes after check", wrapper.attr("class") );
                        logVar( "wrapper after check", wrapper.html() );
                    }
                });
                break;

            // save
            case "save":
                //logVar( "apiQueryUrl_save", apiQueryUrl_save );

                // confirm, disable input
                logVar( "apiQueryUrl_save", apiQueryUrl_save );

                $.ajax({
                    url: apiQueryUrl_save,
                    type: 'post', /* POST on saving */
                    dataType: 'json',
                    async: true,
                    beforeSend: function() {
                        log( "mdbTrackidCheck save request started" );
                    },
                    success: function(data, textStatus, jqXHR) {
                        log( "mdbTrackidCheck save request success" );
                        logVar( "save textStatus", textStatus );
                        logVar( "save httpStatus", jqXHR.status );
                        logVar( "save response", data );
                        if( target == "audiostream page" ) {
                            markTidIntegrationWrapperIntegrated( wrapper );
                        }
                        checkTidIntegration( tidPlayerUrl, mdbPageId, "check", wrapper, target );
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        log( "mdbTrackidCheck save request error" );
                        logVar( "save textStatus", textStatus );
                        logVar( "save errorThrown", errorThrown );
                        logVar( "save httpStatus", jqXHR.status );
                        logVar( "save responseText", jqXHR.responseText );
                    },
                    complete: function(jqXHR, textStatus) {
                        log( "mdbTrackidCheck save request complete" );
                        logVar( "save complete textStatus", textStatus );
                        logVar( "save complete httpStatus", jqXHR.status );
                        logVar( "wrapper.classes after save", wrapper.attr("class") );
                        logVar( "wrapper after save", wrapper.html() );
                    }
                });
                break;
        }
    }
}

var mdbTrackidTableBatchQueue = {},
    mdbTrackidTableBatchTimer = null,
    mdbTrackidBatchMaxUrlsPerRequest = 25,
    mdbTrackidBatchMaxQueryLength = 1800;

function buildTrackIdBatchQueryValue( playerUrls ) {
    return encodeURIComponent( playerUrls.join( "|" ) );
}

// Split one large table scan into bounded batch requests.
// MediaWiki multi-value GET params are pipe-delimited inside one param value,
// not repeated as &urls=a&urls=b.
function chunkTrackIdBatchPlayerUrls( playerUrls ) {
    var chunks = [],
        oversizedUrls = [],
        currentChunk = [],
        baseLength = ( apiUrl_mw + "?action=mixesdbtrackidbatch&format=json&urls=" ).length;

    $.each( playerUrls, function( index, playerUrl ) {
        var singleUrlLength = baseLength + buildTrackIdBatchQueryValue( [ playerUrl ] ).length,
            nextChunk = currentChunk.concat( [ playerUrl ] ),
            nextChunkLength = baseLength + buildTrackIdBatchQueryValue( nextChunk ).length;

        if( singleUrlLength > mdbTrackidBatchMaxQueryLength ) {
            oversizedUrls.push( playerUrl );
            return;
        }

        if(
            currentChunk.length > 0
            && (
                currentChunk.length >= mdbTrackidBatchMaxUrlsPerRequest
                || nextChunkLength > mdbTrackidBatchMaxQueryLength
            )
        ) {
            chunks.push( currentChunk );
            currentChunk = [ playerUrl ];
            return;
        }

        currentChunk = nextChunk;
    });

    if( currentChunk.length > 0 ) {
        chunks.push( currentChunk );
    }

    return {
        chunks: chunks,
        oversizedUrls: oversizedUrls
    };
}

function renderTableTrackIdCheckResult( tidPlayerUrl, wrapper, data, waiter, options ) {
    var currentUsername = $(".user-name").text(),
        allowUserTableMarking = ["Schrute_Inc.", "Komapatient"].includes(currentUsername),
        dashText = '<span class="tooltip-title" title="Status is not ready">&ndash;</span>',
        notYetIntegratedText = '<span class="tooltip-title small" title="This tracklist is not intergated yet to the found mix page">not yet</span>',
        noPageFoundText = '<span class="tooltip-title small" title="No MixesDB mix page found using this player">not found</span>',
        mixesdbPages = getMixesdbTrackIdPages( data ),
        firstMixesdbPage = mixesdbPages[0] || null,
        checked_pageId = firstMixesdbPage ? firstMixesdbPage.page_id : "",
        checked_url = firstMixesdbPage ? firstMixesdbPage.url : "";

    options = options || {};

    waiter = waiter || $("waiter", wrapper);
    waiter.remove();

    // Treat explicit API errors as terminal row states.
    // Missing rows are handled below by the existing search-keyword fallback.
    if( data.error && data.error.code == "notfound" ) {
        wrapper.append( '<span class="tooltip-title" title="TrackId.net page not found (recently created?)">&ndash;</span>' );
        return;
    }

    if( data.error ) {
        wrapper.append( '<span class="tooltip-title" title="' + ( data.error.info || "TrackId.net batch check failed" ) + '">&ndash;</span>' );
        return;
    }

    if( checked_pageId ) {
        var lastCheckedAgainstMixesDB = firstMixesdbPage.lastCheckedAgainstMixesDB;

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
        if( options.skipSearchFallback ) {
            // Batch callers already asked MixesDB about this player URL.
            // Do not fan back out into per-row lookups when no page_id comes back.
            wrapper.append( noPageFoundText );
            return;
        }

        // Preserve the old recovery path for legacy single-item checks.
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
        });
    }
}

function queueTableTidIntegrationCheck( wrapper ) {
    var playerUrl = wrapper.attr("data-tidplayerurl");

    if( !playerUrl || playerUrl == "undefined" ) {
        return;
    }

    if( !mdbTrackidTableBatchQueue[playerUrl] ) {
        mdbTrackidTableBatchQueue[playerUrl] = [];
    }

    // Multiple rows can point at the same player URL.
    // Queue all wrappers so one batch result can update every matching cell.
    mdbTrackidTableBatchQueue[playerUrl].push( wrapper );

    if( mdbTrackidTableBatchTimer ) {
        clearTimeout( mdbTrackidTableBatchTimer );
    }

    // Small debounce window so rows discovered together become one request burst.
    mdbTrackidTableBatchTimer = setTimeout( flushTableTidIntegrationChecks, 50 );
}

function flushTableTidIntegrationChecks() {
    var playerUrls = Object.keys( mdbTrackidTableBatchQueue );

    if( playerUrls.length === 0 ) {
        return;
    }

    var queue = mdbTrackidTableBatchQueue;
    mdbTrackidTableBatchQueue = {};
    mdbTrackidTableBatchTimer = null;

    var batchPlan = chunkTrackIdBatchPlayerUrls( playerUrls );

    // If one URL is too large even by itself, surface that row locally instead of
    // sending an oversized request that can fail the whole batch unexpectedly.
    $.each( batchPlan.oversizedUrls, function( index, playerUrl ) {
        $.each( queue[playerUrl] || [], function( wrapperIndex, wrapper ) {
            renderTableTrackIdCheckResult( playerUrl, wrapper, {
                error: {
                    code: "batchtoolong",
                    info: "TrackId.net player URL is too long for batch checking",
                    url: playerUrl
                }
            }, $("waiter", wrapper) );
        });
    });

    $.each( batchPlan.chunks, function( chunkIndex, playerUrlChunk ) {
        var apiQueryUrl = apiUrl_mw;
        apiQueryUrl += "?action=mixesdbtrackidbatch";
        apiQueryUrl += "&format=json";
        apiQueryUrl += "&urls=" + buildTrackIdBatchQueryValue( playerUrlChunk );

        logVar( "apiQueryUrl_batch", apiQueryUrl );

        $.ajax({
            url: apiQueryUrl,
            type: 'get',
            dataType: 'json',
            async: true,
            success: function(data) {
                var resultsByUrl = {};

                if( data.error ) {
                    $.each( playerUrlChunk, function( index, playerUrl ) {
                        $.each( queue[playerUrl] || [], function( wrapperIndex, wrapper ) {
                            renderTableTrackIdCheckResult( playerUrl, wrapper, { error: data.error }, $("waiter", wrapper) );
                        });
                    });
                    return;
                }

                $.each( data.mixesdbtrackidbatch || [], function( index, result ) {
                    // The batch API echoes both requestedurl and sanitizedurl.
                    // Index both so the table lookup can tolerate backend normalization.
                    if( result.requestedurl ) {
                        resultsByUrl[result.requestedurl] = result;
                    }
                    if( result.sanitizedurl ) {
                        resultsByUrl[result.sanitizedurl] = result;
                    }
                });

                $.each( playerUrlChunk, function( index, playerUrl ) {
                    var result = resultsByUrl[playerUrl],
                        tableData = result ? {
                            mixesdbtrackid: Array.isArray( result.mixesdbtrackid ) ? result.mixesdbtrackid : [],
                            error: result.error
                        } : {
                            // No direct batch hit: fall through to the existing search-keyword path
                            // instead of inventing a new table-only row state.
                            mixesdbtrackid: []
                        };

                    $.each( queue[playerUrl] || [], function( wrapperIndex, wrapper ) {
                        renderTableTrackIdCheckResult( playerUrl, wrapper, tableData, $("waiter", wrapper), {
                            skipSearchFallback: true
                        } );
                    });
                });
            },
            error: function() {
                $.each( playerUrlChunk, function( index, playerUrl ) {
                    $.each( queue[playerUrl] || [], function( wrapperIndex, wrapper ) {
                        renderTableTrackIdCheckResult( playerUrl, wrapper, {
                            error: {
                                code: "batchfailed",
                                info: "TrackId.net batch check failed",
                                url: playerUrl
                            }
                        }, $("waiter", wrapper) );
                    });
                });
            }
        });
    });
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
    queueTableTidIntegrationCheck( jNode );
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

    var quickLinks = '<ul class="mdb-element mdb-quickLinks mdb-nolist mdb-highlight-hover">';
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
    log( location.href ); // location.href, not global.js' url: that one is the page we started on

    // get domain
    var a = document.createElement('a');
    a.href = playerUrl;
    var domain = a.hostname.replace("www.", ""),
        paths = a.pathname;
    //log("> " + domain);
    //log("> " + paths);

    // prepare embed code
    // hearthis.at is the odd one out: its iframe needs the numeric track id, which is not in
    // the page URL we are given - embed_hearthis_fromAnyUrl() looks it up and appends the
    // player itself when it has it. So that branch has no markup to hand back, only the
    // promise of one, and everything below has to run for it all the same.
    var embed = "",
        embedIsAsync = false;

    switch (domain) {
        case "soundcloud.com": // https://soundcloud.com/fingermanedit/fingerman-dj-set-kvs-brussels
            embed = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?visual=false&amp;url=' + playerUrl + '&amp;auto_play=false&amp;&amp;maxheight=120&amp;buying=false&amp;show_comments=false&amp;color=ff7700&amp;single_active=true&amp;show_reposts=false"></iframe>';
            break;
        case "mixcloud.com": // https://www.mixcloud.com/oldschool/sharam-jey-rave-satellite-1995/
            var feedPath = encodeURIComponent( paths );
            embed = '<iframe width="100%" height="120" src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=' + feedPath + '" frameborder="0" ></iframe>';
            break;
        case "youtube.com": // https://www.youtube.com/watch?v=qUUYWIsfY90, https://youtu.be/qUUYWIsfY90
            var yt_id = getYoutubeIdFromUrl( playerUrl );
            embed = '<iframe width="100%" height="315" src="https://www.youtube.com/embed/' + yt_id + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
            break;
        case "hearthis.at": // https://hearthis.at/toccoscuro/01-manpower-radio1sessentialmix-sat-09-07-2024-talion/
            embedIsAsync = true;
            break;
    }
    //log( embed );

    // embed player
    // A hearthis.at lookup that was still in flight when the page was left appends into the
    // wrapper it was handed, which by then is this detached one - harmless, and the reason
    // the removal happens before the new wrapper is built.
    $("#mdb-tid-audiostreamExtras").remove();
    $(".mdb-player-audiostream").remove();
    if( embed != "" || embedIsAsync ) {
        // One wrapper around player + toolkit: getToolkit's "after" placement (see the
        // toolkit handler below) lands right behind the player and thus INSIDE this
        // wrapper, so the shared loading skeleton can cover the toolkit's build-up and
        // swap it out in one step. See mdbSkeleton_* in shared/page_creator/.
        //
        // The player URL and the title travel on this wrapper, not in a closure, so that the
        // toolkit handler below can stay a single registration - see the note there. On the
        // wrapper rather than on the player: the hearthis.at player is built by
        // embed_hearthis_fromId() in shared/global.js and arrives carrying only its own
        // attributes, so the player element is not a place both routes can write to.
        // .attr() rather than a concatenated attribute string: mix titles contain quotes
        // often enough ("Live at Foo" 2019) and would break the markup.
        var tidExtras = $('<div id="mdb-tid-audiostreamExtras" class="mdb-element"></div>')
                            .attr( "data-tidplayerurl", playerUrl )
                            .attr( "data-tidtitle", titleText );

        if( embed != "" ) {
            tidExtras.append( $('<div class="mdb-element mdb-player-audiostream"></div>').append( embed ) );
        }

        jNode.closest(".audio-stream-box").append( tidExtras );

        // The artwork the player replaces - but only where the player is already there. The
        // hearthis.at id lookup can come back empty, and an artwork link beats nothing at all.
        if( embed != "" ) {
            jNode.hide();
        }

        // Appended INTO the extras wrapper, not next to it as before: that is what puts the
        // hearthis.at player where the toolkit handler can find its URL and gets it removed
        // on the next SPA navigation (the wrapper is an .mdb-element, the player div from
        // shared/global.js is not).
        if( embedIsAsync ) {
            embed_hearthis_fromAnyUrl( playerUrl, tidExtras, "append" );
        }

        // The skeleton stands in for the toolkit, so it belongs BELOW the player - and on the
        // hearthis.at route there is no player yet, only a lookup on its way. Put up now, the
        // grey box would be the first thing in the wrapper and the player would shove it down
        // when it arrives. The toolkit handler starts it instead, the moment the player is on
        // the page - which is also the moment the toolkit starts building, so nothing is
        // uncovered that used to be covered.
        if( embedIsAsync ) {
            tidExtras.attr( "data-mdbskeletondeferred", "1" );
        } else {
            tidSkeleton_show();
        }
    }

    // MixesDB page creator - only needs the player URL, so it starts alongside the embed
    funcTidPageCreator( playerUrl );
}

/*
 * tidSkeleton_show
 * The one place the audiostream skeleton is configured, because it has two callers:
 * funcTidPlayers() for the players built on the spot and the toolkit handler for the
 * hearthis.at one, which only exists once its lookup has answered.
 * The player is NOT covered (keep): it should play as early as possible. The skeleton holds
 * the space below it, where page creator row and toolkit appear together at the reveal - the
 * row is placed "after" the player wrapper (funcTidPageCreator), so it is a hidden direct
 * child of the extras wrapper like the toolkit, not a visible part of the kept player.
 * No height option: the default in page_creator.css is the one source of truth - an inline
 * height here would silently win over any value tuned in the CSS.
 */
function tidSkeleton_show() {
    mdbSkeleton_show({
        target: "#mdb-tid-audiostreamExtras",
        rows:   [ "toolkit" ],
        keep:   ".mdb-player-audiostream"
    });
}

/*
 * MixesDB page creator (shared/page_creator/)
 * The suggested-title row between the embedded player and the toolkit - SoundCloud players
 * only for now. Everything the row needs is read off the SC track API (title, username, dates,
 * duration, artwork URL), the same way the SoundCloud script does it - the TID page itself
 * only knows a normalized heading and a locale-formatted date, and the title builder deserves
 * better input than that.
 * The "Create" link does NOT use the shared description-tracklist detection: TID's own
 * tracklist box (#tlEditor, built from the identified tracks further down this file) is the
 * better tracklist, and the tracklistBox option points the page creator at it - whatever is in
 * that box at the moment "Create" is clicked goes onto the new page. A stream still processing
 * has no box yet; clicking "Create" then starts the page with an empty tracklist, so wait for
 * the box.
 */
function funcTidPageCreator( playerUrl ) {
    logFunc( "funcTidPageCreator" );
    logVar( "funcTidPageCreator: playerUrl", playerUrl );

    // audiostream detail pages only - funcTidPlayers also runs for the submit form's preview
    if( urlPath_noParams(1) != "audiostreams" || !urlPath_noParams(2) ) {
        log( "funcTidPageCreator: not an audiostream detail page - no page creator row." );
        return;
    }

    // SoundCloud players only for now - Mixcloud/YouTube/hearthis.at need their own data source
    if( getDomain_fromUrlStr( playerUrl ) != "soundcloud.com" ) {
        log( "funcTidPageCreator: not a SoundCloud player - no page creator row yet." );
        return;
    }

    // Two network round trips deep (access token, then the track). If the reader has clicked
    // on to the next audiostream meanwhile, the answer must be dropped instead of written into
    // that page - see mdbPageGeneration in global.js.
    var pageGeneration = mdbPageGeneration;

    getScAccessTokenFromApi(function( scAccessToken ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        if( !scAccessToken || scAccessToken == "null" ) {
            log( "funcTidPageCreator: no SC access token - no page creator row." );
            return;
        }

        var scApiUrl_track = "https://api.soundcloud.com/resolve?url=" + encodeURIComponent( playerUrl );
        logVar( "funcTidPageCreator: scApiUrl_track", scApiUrl_track );

        $.ajax({
            beforeSend: function( request ) {
                request.setRequestHeader( "Authorization", "OAuth " + scAccessToken );
            },
            dataType: "json",
            url: scApiUrl_track,
            success: function( t ) {
                if( !mdbIsCurrentPage( pageGeneration ) ) return;

                if( !t || t.kind != "track" ) {
                    log( "funcTidPageCreator: the API answered, but not with a track (kind: " + ( t ? t.kind : "no data" ) + ")." );
                    return;
                }

                logVar( "funcTidPageCreator: title", t.title );
                logVar( "funcTidPageCreator: channel", t.user ? t.user.username : "" );
                logVar( "funcTidPageCreator: created_at", t.created_at );
                logVar( "funcTidPageCreator: duration", t.duration );

                mdbPageCreator_add({
                    title:        t.title,
                    channel:      ( t.user && t.user.username ) ? t.user.username : "",
                    createdAt:    formatScDate( t.created_at ),
                    releaseDate:  formatScDate( t.release_date ),
                    durationMs:   t.duration,
                    playerUrl:    playerUrl,
                    artworkUrl:   scArtworkOriginalUrl( t.artwork_url ),
                    // the TITLE builder reads the labels a description tracklist credits out
                    // of this ("Artist - Title [Label]") - the tracklist itself comes from the
                    // TID box, see tracklistBox below
                    description:  t.description,
                    // the values above are SoundCloud's, so a report reads "SC title:" here too
                    sourceLabel:  "SC",
                    // "after" the player wrapper, not appended INTO it: the row becomes a
                    // direct child of #mdb-tid-audiostreamExtras between player and toolkit,
                    // which is what lets the loading skeleton cover it - the player wrapper
                    // itself stays visible (keep) while everything loads, so a row inside it
                    // would pop in before the one reveal
                    target:       ".mdb-player-audiostream",
                    placement:    "after",
                    // TID's own tracklist box: what is in it when "Create" is clicked goes
                    // onto the new page, and its API verdict files the "Tracklist:" category
                    tracklistBox: "#tlEditor #mixesdb-TLbox",
                    // TID's "Style suggestions" box: its [[Category:...]] lines fill the two
                    // style slots of the new page - also read at click time, no waiting needed
                    stylesBox:    "#mixesdb-TIDstyles"
                });
            },
            error: function( jqXHR, textStatus, errorThrown ) {
                log( "funcTidPageCreator: FAILED to resolve the SC track (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + ")." );
            }
        });
    });
}

/*
 * toolkit output
 * Registered once, at the top level, NOT from inside funcTidPlayers(): waitForKeyElements
 * keeps one polling interval per selector and that interval holds the callback it was
 * created with, so a second registration of the same selector would keep running the FIRST
 * audiostream's closure - and build the toolkit for the wrong mix from the second page on.
 */
waitForKeyElements(".mdb-player-audiostream:not(.mdb-processed-toolkit)", function( jNode ) {
    // Read off the extras wrapper, which funcTidPlayers() built for every route - the
    // hearthis.at player inside it comes from embed_hearthis_fromId() (shared/global.js) and
    // knows nothing about TID.
    var tidExtras = jNode.closest("#mdb-tid-audiostreamExtras"),
        playerUrl = tidExtras.attr("data-tidplayerurl"),
        titleText = tidExtras.attr("data-tidtitle") || "";

    if( !playerUrl ) return;

    // The hearthis.at route left the skeleton to us (see funcTidPlayers): its player is on
    // the page now, and the toolkit built right below is exactly what the grey box stands in
    // for. Before getToolkit(), so none of its output is ever painted uncovered.
    if( tidExtras.attr("data-mdbskeletondeferred") ) {
        tidExtras.removeAttr("data-mdbskeletondeferred");
        tidSkeleton_show();
    }

    logVar( "titleText toolkit", titleText );
    getToolkit( playerUrl, "playerUrl", "detail page", jNode, "after", titleText, "link", 1, "", "auto" );
    jNode.addClass("mdb-processed-toolkit");

    // the page creator row is gated behind that toolkit's usage verdict - re-arm the poll
    // whenever the toolkit is (re)built
    mdbPageCreator_watchToolkit();
});

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
                       .fixTidArtistnames()
                       ,
            title  = thisTitle
                       .replace(")[", ") [") // normalize ")[" in title for futther treatment (removal) https://trackid.net/audiostreams/subfader-subfreaquence-house-tech-house-20100208
                       .replace(/\s*-\s*(?:feat(?:\.|uring)?)\s+(.+?)(?=$|\s*\()/i, ' (featuring $1)') // Scared Of My Heart - featuring E.R. Thorpe (Andre Lodemann Remix) https://trackid.net/audiostreams/balance-selections-215-james-harcourt#google_vignette
                       .replace(/ \(\d+ - Remaster\)$/, "") // Foo (Nutt Mix - Remastered 2021)
                       .replace(/^(.+) [\(\[](.+) - (?:\d+ )?Remaster(?:ed|ing)?(?: \d+)?[\)\]]/g, "$1 ($2)") // All Night (I Can Do It Right) (2016 - Remaster) https://trackid.net/audiostreams/subfader-the-ghetto-funk-show-20090216-mix-2 | Run before below stuff
                       .replace(/\s*[\(\[][^\(\[\)]*(Digital\s+Remaster|Mastering)[^\)\]]*[\)\]]/gi, "") // Title (2002 Digital Remaster / 24-Bit Mastering) https://trackid.net/audiostreams/dr-packer-live-in-ibiza-august-2025-hard-rock-hotel
                       .replace(/^(.+) [\(\[]Re-?master(ed|ing|is[ée])?( En)?(?:\s'?\d{2,4})?[\)\]]/gi, "$1") // (Remasterisé En 2002), also [Remaster] https://trackid.net/audiostreams/xmix3-1994-richie-hawtin-john-acquaviva-enter-the-digital-reality
                       .replace(/(.+) - (.+ (?:Remix|Mix|Version))/g, "$1 ($2)")

                       //.replace(/^\((.+)\)$/g, "$1") // avoid "[000] Inland [Systemscan]" https://trackid.net/audiostreams/shed-josey-rebelle-sven-von-thulen-txl-berlin-recordings-chapter-7-arte-concert
                       .replace(/^\(([^()]+)\)$/g, "$1") // Only unwrap when there is exactly one outer pair and no additional ) inside

                       .replace(/^(.+)-\d{4,5}$/g, "$1") // numbers as suffix, e.g. "Track Title-24070" https://trackid.net/audiostreams/alex-kvitta-sonderspur-pod-011281213
                       .replace(/^(.+) - (.+)$/g, "$1 ($2)") // "Track Title - Some Version" https://trackid.net/audiostreams/dj-hell-mayday-1999-soundtropolis
                       .replace(/(.+) \((\d+ )?Remaster(ed|ing)?( \d+)?\)$/g, "$1") // "Track Title - (Remaster)" etc
                       .replace(/(.+) \((\d+ )?([A-Za-z]+ )?(\s*Re-?master(ed|ing|;)?)(\s*(Mix|Version|Edition))?\)$/gi, "$1") // "Track Title - (2013 Japan Remaster; Remastered)"
                       .replace(/\s+\(Mixed\)/i, "") // remove " (Mixed)" https://trackid.net/audiostreams/balance-selections-234-sinca
                       .replace(/ \[(.+)\] \[Mixed\]/, " ($1)") // " [V] [Mixed]" https://trackid.net/audiostreams/groove-podcast-501-salimata
                       .replace(/\((.+);Mixed\)/i, "($1)") // remove "(Versionx;Mixed)" https://trackid.net/audiostreams/itps064-iron-curtis
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
            previousTrack = $("tr:eq(" + (i - 2) + ")", tlWrapper), // eq starts at 0
            endTimePrevious = $(".endTime", previousTrack).text(),
            endTimePrevious_Sec = durToSec(endTimePrevious),
            nextTrack = $("tr:eq(" + (i) + ")", tlWrapper), // eq starts at 0
            startTimeNext = $(".startTime", nextTrack).text(),
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

    outputTidGenresTextarea();
});


function outputTidGenresTextarea() {
    if (urlPath_noParams(1) != "audiostreams") return;

    var styleRenameMap = {
        "Abstract": ["Experimental"],
        "African": ["World Music"],
        "Alternative Rock": ["Rock"],
        "Bass Music": ["Bass"],
        "Contemporary Jazz": ["Jazz"],
        "Contemporary R&B": ["R&B"],
        "Dance-pop": ["Pop"],
        "Drum n Bass": ["Drum & Bass"],
        "Electro House": ["Progressive House"],
        "Garage House": ["House"],
        "Indie Rock": ["Rock"],
        "Italo-Disco": ["Disco"],
        "Jazz-Funk": ["Jazz", "Funk"],
        "New Wave": ["Pop"],
        "Nu-Disco": ["Disco", "House"],
        "Pop Rap": ["Pop", "Hip Hop"],
        "Pop Rock": ["Pop", "Rock"],
        "Psy-Trance": ["Psytrance"],
        "Psychedelic Rock": ["Psychedelic", "Rock"],
        "Roots Reggae": ["Reggae"],
        "Speedcore": ["Hardcore"],
        "Synth-pop": ["Pop"]
    };
    var tidStyles = [];
    var stylesRow = $("p.MuiTypography-body1").filter(function() {
        return $(this).text().trim() == "Styles";
    }).first().closest(".MuiBox-root");

    if (!stylesRow.length) return;

    $("a.link", stylesRow).each(function() {
        var styleName = $(this).text().trim().replace(/,\s*$/, "");
        if (styleName) {
            tidStyles.push(styleName);
        }
    });

    $("#mixesdb-TIDstylesWrapper").remove();

    if (tidStyles.length < 1) return;
    if (!$("#tlEditor").length || !$(".mdb-tid-table").length) return;

    var tidStylesOutput = [];
    $.each(tidStyles, function(i, styleName) {
        var outputStyleNames = styleRenameMap[styleName] || [styleName];
        $.each(outputStyleNames, function(j, outputStyleName) {
            tidStylesOutput.push("[[Category:" + outputStyleName + "]]");
        });
    });

    tidStylesOutput = [...new Set(tidStylesOutput)];

    var output = tidStylesOutput.join("\n");
    var outputRows = Math.max(1, tidStylesOutput.length);
    $("#tlEditor").after('<div id="mixesdb-TIDstylesWrapper"><strong class="mdb-highlight">Style suggestions</strong><textarea id="mixesdb-TIDstyles" class="mono" rows="' + outputRows + '" style="display:block; width:100%; margin:10px 0 0 0;"></textarea><p class="mdb-top5 mdb-small mdb-grey"><em>Please double-check by skipping through the mix manually.</em></p></div>');
    $("#mixesdb-TIDstyles").val(output);
}


var cueFormatPreferenceStorageKey = "mdb_trackid_preferredCueFormat";

function getStoredCueFormatPreference() {
    var value = String(localStorage.getItem(cueFormatPreferenceStorageKey) || "").trim();
    return (value === "MM" || value === "HMM") ? value : null;
}

function storeCueFormatPreference(format) {
    if (format !== "MM" && format !== "HMM") return;
    localStorage.setItem(cueFormatPreferenceStorageKey, format);
}

function toggleTracklistTextareaCueFormat(targetFormat) {
    var ta = $("textarea.mixesdb-TLbox");
    if (!ta.length) return;

    function selectTracklistTextarea() {
        ta.focus().select();
    }

    function detectCueFormatFromTextarea(text) {
        var m = String(text || "").match(/^\s*\[\s*([0-9\?:]+)\s*\]/m);
        if (!m) return "MM";

        var cue = String(m[1] || "");
        if (cue.indexOf(":") >= 0) return "HMM";
        return "MM";
    }

    var currentFormat = ta.attr("data-mdb-cue-format") || detectCueFormatFromTextarea(ta.val());
    var nextFormat = (targetFormat === "MM" || targetFormat === "HMM") ? targetFormat : (currentFormat === "MM" ? "HMM" : "MM");

    if (currentFormat === nextFormat) {
        var currentButtonLabel = nextFormat === "HMM" ? "Switch cue format (h:m > mmm)" : "Switch cue format (mmm > h:m)";
        $("#switchCueFormat").text(currentButtonLabel);
        storeCueFormatPreference(nextFormat);
        return;
    }

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
            storeCueFormatPreference(nextFormat);
            selectTracklistTextarea();
            return;
        }
    }

    function padTrackIdMinutesCue(cue) {
        var s = String(cue || "").trim();
        if (!/^[0-9\?]{2}$/.test(s)) return s;
        return "0" + s;
    }

    var lines = String(ta.val() || "").split("\n");
    var convertedLines = lines.map(function (line) {
        return line.replace(/^\s*\[\s*([0-9\?:]+)\s*\]/, function (m, cue) {
            var switchedCue = toggleCue_MM_HMM(cue);

            // TrackId exports mmm-style cues. Keep left-padding when converting
            // from h:mm back to minutes-only so 0:59 becomes 059.
            if (nextFormat === "MM") {
                switchedCue = padTrackIdMinutesCue(switchedCue);
            }

            return "[" + switchedCue + "]";
        });
    });

    ta.val(convertedLines.join("\n"));
    ta.attr("data-mdb-cue-format", nextFormat);

    var buttonLabel = nextFormat === "HMM" ? "Switch cue format (h:m > mmm)" : "Switch cue format (mmm > h:m)";
    $("#switchCueFormat").text(buttonLabel);
    storeCueFormatPreference(nextFormat);
    selectTracklistTextarea();
}

if( visitDomain == "trackid.net" ) {
    waitForKeyElements("ul#tlEditor-feedback-topInfo", function(jNode) {
        if (!$("#switchCueFormat").length) {
            jNode.prepend('<li class="info_switchCueFormat"><button id="switchCueFormat" class="hand">Switch cue format (mmm > h:m)</button></li>');
        }

        var preferredFormat = getStoredCueFormatPreference();
        if (preferredFormat === "HMM") {
            $("#switchCueFormat").text("Switch cue format (h:m > mmm)");
            toggleTracklistTextareaCueFormat("HMM");
        } else if (preferredFormat === "MM") {
            $("#switchCueFormat").text("Switch cue format (mmm > h:m)");
        }
    });
}

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

// The "is this a page we replace tables on?" test sits INSIDE the handler: it is registered
// once for the lifetime of the document and outlives any number of navigations, so asking
// around it would answer for whichever page happened to be open at script start.
function skipReplacingTables() {
    return urlPath_noParams(1) == "submiturl";
}

// waitForKeyElements
waitForKeyElements(".MuiDataGrid-virtualScrollerRenderZone:not(.mdb-processed-grid)", function( jNode ) {
    if( skipReplacingTables() ) return true; // not handled - ask again after a navigation

    jNode.addClass("mdb-processed-grid");
    setTimeout(function () {
        loadTidPaginatedGridRows( jNode.closest(".MuiDataGrid-main"), function( gridMain ) {
            funcTidTables( gridMain );
        });
    }, timeoutDelay);
});
$(document).on("change", ".MuiDataGrid-virtualScrollerRenderZone .MuiDataGrid-cell", function() {
    if( skipReplacingTables() ) return;

    var gridMain = $(this).closest(".MuiDataGrid-main");
    setTimeout(function () {
        funcTidTables( gridMain );
    }, timeoutDelay);
});


function parseTidPaginationText( text ) {
    var match = String( text || "" ).trim().match( /(\d+)\s*[–-]\s*(\d+)\s+of\s+(\d+)/i );

    return match ? { first: Number( match[1] ), last: Number( match[2] ), total: Number( match[3] ) } : null;
}

function getTidGridRowClones( gridMain ) {
    return $(".MuiDataGrid-row", gridMain).clone( true, true ).toArray();
}

function getTidGridRowsForTable( grid, gridMain ) {
    var paginatedRows = grid.data( "mdbTidPaginatedRows" ) || gridMain.data( "mdbTidPaginatedRows" );

    return paginatedRows && paginatedRows.length ? $( paginatedRows ) : $( ".MuiDataGrid-row", grid );
}

function isTidAudiostreamTracklistGrid( gridMain ) {
    return urlPath_noParams( 1 ) == "audiostreams"
        && urlPath_noParams( 2 )
        && $( ".MuiDataGrid-virtualScrollerRenderZone", gridMain ).length;
}

function waitForTidPaginationChange( gridMain, previousText, callback ) {
    var attempts = 0,
        timer = setInterval(function() {
            var currentText = $(".MuiTablePagination-displayedRows", gridMain.closest(".MuiDataGrid-root").add($(document))).first().text();

            attempts++;
            if( currentText && currentText != previousText ) {
                clearInterval( timer );
                setTimeout( callback, timeoutDelay );
            }

            if( attempts > 40 ) {
                clearInterval( timer );
                callback();
            }
        }, 100 );
}

function loadTidPaginatedGridRows( gridMain, callback ) {
    if( !isTidAudiostreamTracklistGrid( gridMain ) ) {
        callback( gridMain );
        return;
    }

    var gridRoot = gridMain.closest( ".MuiDataGrid-root" ),
        paginationTextNode = $(".MuiTablePagination-displayedRows", gridRoot),
        pagination = parseTidPaginationText( paginationTextNode.text() ),
        nextButton = $("button[aria-label='Go to next page']:not(:disabled)", gridRoot);

    if( !pagination || pagination.total <= pagination.last || !nextButton.length || gridRoot.data("mdbTidPaginationLoaded") ) {
        callback( gridMain );
        return;
    }

    log( "TrackId.net paginated grid detected: " + paginationTextNode.text() );

    var collectedRows = getTidGridRowClones( gridMain );

    function collectNextPage() {
        var previousText = paginationTextNode.text(),
            button = $("button[aria-label='Go to next page']:not(:disabled)", gridRoot);

        if( !button.length ) {
            gridRoot.data( "mdbTidPaginatedRows", collectedRows );
            gridMain.data( "mdbTidPaginatedRows", collectedRows );
            gridRoot.data( "mdbTidPaginationLoaded", true );
            callback( gridMain );
            return;
        }

        button.trigger( "click" );

        waitForTidPaginationChange( gridMain, previousText, function() {
            collectedRows = collectedRows.concat( getTidGridRowClones( gridMain ) );

            var currentPagination = parseTidPaginationText( paginationTextNode.text() );
            if( !currentPagination || currentPagination.last >= currentPagination.total ) {
                gridRoot.data( "mdbTidPaginatedRows", collectedRows );
                gridMain.data( "mdbTidPaginatedRows", collectedRows );
                gridRoot.data( "mdbTidPaginationLoaded", true );
                callback( gridMain );
                return;
            }

            collectNextPage();
        });
    }

    collectNextPage();
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
        grid.before('<table class="mdb-element mdb-tid-table ' + tableClass + ' ' + path + '"><tbody></tbody></table>');
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

        getTidGridRowsForTable( grid, jNode ).each(function () {
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
            keywords = getURLParameter("keywords") || ""; // set URLs are submitted without keywords – avoid "null" in the search input

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

})();

/*
 * Changelog
 *
 * 2026.08.19.36
 * Via the shared page creator (page_creator.js v_73): the {{Player}} of the created page takes
 * the shape the series uses. Where at least 90% of the entity's recent pages publish every
 * episode on two platforms - {{Player|mode=mirrors}} with a line per platform, as Groove
 * Podcast, HATE Podcast, RA Podcast and XLR8R Podcast do - the new page is written that way,
 * with this player's URL on the line its platform stands on there (RA Podcast keeps Apple
 * Podcasts first, so a SoundCloud URL goes on the second one) and the other line empty for the
 * mirror. MixesDB answers an open slot with "No value for one of the players!" instead of a
 * player, so a page cannot go out with the mirror quietly missing - reasoning section 7 says
 * that too. Every other category keeps the plain one-URL player. A URL holding a "=" is now
 * written as "|1=URL": unnumbered, MediaWiki reads the part in front of the "=" as a parameter
 * name and the player renders "{{{1}}}".
 *
 * 2026.08.19.33
 * Via the shared page creator (page_creator.js v_70): the lead artwork line is back on a series
 * whose recent pages hold a live recording. Such a page opens with the EVENT's flyer, named
 * after the event - the artwork belongs to whatever the page records - so it cannot say what an
 * episode page starts with, and it no longer votes on it. Reported on SoundCloud's "GROOVE
 * Podcast 514": two of Category:Groove Podcast's 10 newest pages are sets played at an event,
 * 8 of 10 is not the 90% the vote wants, and the series lost the artwork line every one of its
 * episodes carries. A venue's or an event's own category, where every page is such a recording,
 * decides as before, and reasoning section 7 says how many pages were left out.
 *
 * Via the shared page creator (page_creator.js v_70): a hints bar chip's fit score stays behind
 * its "N mixes" count when the count is toggled open - it used to drop under the folded-out mix
 * pages.
 *
 * 2026.08.19.32
 * Via the shared title builder (title_builder.js v_59): two words a suggested title used to
 * lose. A channel name that is the start of a longer word ("Drumcomplex" in "Drumcomplexed")
 * no longer splits that word apart when the Normal Case pass leaves the channel's own spelling
 * standing, and the word in front of an episode number ("Drumcomplexed Radio Show 311") stays
 * in the series name unless it only counts ("Episode 72"). Reported on SoundCloud, where the
 * title came out as "DrumcomplexEd Radio 311" while the real category holds 311 mixes.
 *
 * 2026.08.19.25
 * Via the shared page creator (page_creator.js v_68, page_creator.css): every looked-up chip in
 * the hints bar's "Used categories" carries a fit score - how sure the row is that this is the
 * right category for THIS page, with the reasons in its tooltip. Not the reasoning panel's
 * section 3 percentage, which answers whether the wiki's answer is about the right NAME.
 *
 * 2026.08.19.24
 * Via the shared page creator (page_creator.js v_67): a category's pages are only read where
 * they can say anything about THIS mix - not when the title numbers its entity while MixesDB
 * knows that name as a venue or an event, and not when the category's newest page is more than
 * three years older than the mix.
 *
 * Via the shared page creator (page_creator.js v_67, page_creator.css): a category the
 * entity's recent sibling pages share is no longer written onto the created page as a style.
 * The vote answers what those pages have in COMMON - a venue whose MixesDB pages are all
 * festival sets votes for the festival - so it is shown as a new "Hints:" row in the bar under
 * "Used categories" (each chip with a note saying which pages it came off) and at the end of
 * reasoning section 6, while the page's two style rows stay empty for the editor.
 *
 * 2026.08.19.23
 * Via the shared page creator (page_creator.js v_66, page_creator.css): the grey
 * "Category:Promo Mix" note under the "Create" link is gone. The hints bar's "Used categories"
 * already names every category the created page is filed under, "Promo Mix" among them, so the
 * note repeated it. What only it used to say - that the title leaves "(Promo Mix)" off because
 * its own name already says it - now sits in the tooltip of the "Promo Mix" chip.
 *
 * 2026.08.19.20
 * Via the shared page creator (title_builder.js v_51, title_definitions.js v_35,
 * page_creator.js v_62): a place that names the ROOM of a venue now files the page under the
 * VENUE. Behind the "@" the base name is asked about next to the full one, and where MixesDB
 * answers empty about the name while knowing the base as a venue or an event, the room word
 * comes off - "Live@Elsewhere Loft July" becomes "2026-07 - alexander:louis @ Elsewhere",
 * "Elsewhere Loft" being a category the wiki does not have. Only behind the "@" and only off a
 * curated word list; the room comes back as a "Switch title" chip, since MixesDB does write it
 * where it is worth naming, and the page files under the venue either way. The "Report" box
 * has a new "Alternative title:" line for that kind of second reading.
 *
 * 2026.08.19.19
 * Via the shared page creator (page_creator.js v_62, page_creator.css): the hints bar's "Used
 * categories" line now names EVERY category the created page is filed under - the year, the
 * styles, "Promo Mix" and the "Tracklist:" filing ride along as plain grey chips, no link and
 * no mix count, since none of them is a name the wiki could spell differently. Reported for
 * "Promo Mix", which the page text writes while the line stayed silent about it.
 *
 * 2026.08.19.18
 * Via the shared page creator (page_creator.js v_61, title_builder.js v_51,
 * title_definitions.js v_35): the "Switch title:" line no longer offers a dropped "Part 2".
 * The parts of one recording belong on one mix page, so the marker would only start a
 * duplicate. A chip may offer a different title for this page, never a different page.
 *
 * 2026.08.19.17
 * Via the shared title builder (title_builder.js v_50), from two SoundCloud reports: the
 * "Switch title:" Live PA chip now also fires on the title's own "live" word - one consumed
 * as the " @ " joiner or dropped as a trailing marker. The word never writes the marker (a
 * DJ set is announced the same way), it only offers the reading.
 *
 * 2026.08.19.16
 * The page creator's hints bar offers the readings the build decided against as
 * "Switch title:" chips (page_creator.js v_60, title_builder.js v_49, page_creator.css) -
 * a guessed "(Live PA)", an assumed or deliberately withheld "(Promo Mix)", a dropped
 * "Part N", each as the full title it would make. A click swaps it with the title field and
 * the same slot then offers the way back; the promo switch also moves the page's filing
 * between Category:Promo Mix and the name itself.
 *
 * 2026.08.19.15
 * Via the shared title builder (title_builder.js v_48, title_definitions.js v_34,
 * page_creator.js v_59), from two SoundCloud reports: a set played at an event is now read as
 * one even where the title only says so with a "-" - the event branch no longer mistakes digits
 * inside a word ("3000Grad") for an episode number, and MixesDB answering "event" about a name
 * is enough on its own. A chunk that strings several names together with a little word
 * ("Timboletti im Chapeau Club") is asked about in pieces as well as whole, since the wiki can
 * only answer empty about the chain.
 *
 * 2026.08.19.14
 * Via the shared title builder (title_builder.js v_47, title_definitions.js v_33), from two
 * SoundCloud reports: a part an uploader wrapped in dashes ("-Rummelplatz 3026-") is now a
 * chunk of its own instead of riding along inside the name in front of it, an event that
 * writes its edition a thousand years ahead (3000Grad's "Festival 3025") has those digits read
 * as the gig year, and a place group whose steps are separated by a bracket or a "|" rather
 * than a second "@" is joined with the "," MixesDB writes instead of being flattened into one
 * glued name.
 *
 * 2026.08.19.13
 * Via the shared tracklist detector (tracklist_detector.js v_12), from a SoundCloud report:
 * a description whose tracks are written "Artist-Title" with no spaces around the dash is now
 * read on a second pass, and a credit the uploader wrapped onto a line of its own ("Oliver
 * Koletzki," / "Niko Schwind, ...") is glued onto the track it belongs to instead of ending
 * the run. No effect here - TrackId.net builds its tracklist box from the identified tracks
 * and never searches a description.
 *
 * 2026.08.19.11
 * hearthis.at players: the grey toolkit placeholder no longer goes up before the player it
 * belongs under - it waited for nothing there and was pushed down as soon as the player
 * arrived. It now appears with the player, in its place below it.
 *
 * 2026.08.19.10
 * The toolkit is back on hearthis.at players. Since the toolkit handler was moved out of
 * funcTidPlayers() into a single top-level registration (2026.08.11.1), it reads the player
 * URL off the element instead of a closure - and only the players built on the spot
 * (SoundCloud, Mixcloud, YouTube) carry it. The hearthis.at player is appended later by
 * embed_hearthis_fromId() in shared/global.js and arrives with its own attributes only, so
 * the handler found no URL and quietly returned. The URL and title now travel on the
 * #mdb-tid-audiostreamExtras wrapper, which every route builds, and the hearthis.at player
 * is appended INTO that wrapper rather than next to it, which also gets it cleaned up on the
 * next SPA navigation, where it used to stay behind. It is not covered by the loading
 * skeleton: it shows the moment the lookup comes back, like the players built on the spot -
 * the skeleton keeps holding the space below it for the toolkit. The artwork stays visible
 * on this route, unlike the others: the id lookup can come back empty and an artwork link
 * beats nothing at all.
 *
 * 2026.08.19.8
 * The MixesDB modal opens again (page_creator.css). The blurred backdrop of .7 came with
 * "opacity: 0; visibility: hidden" and a transition meant to be flipped by a class - but
 * nothing adds one, and the overlay is built fresh on every open and thrown away on close,
 * so it has no closed state to transition out of: it opened fully invisible, which looked
 * like the chips' category links doing nothing. The fade is now an animation that runs on
 * insertion, which is what an element with no resting state needs. Blur and tint unchanged.
 *
 * 2026.08.19.7
 * The real cause of the dead first click on a chip's "N mixes" after a title edit, which
 * .6 only guessed at (page_creator.js v_58): the mousedown takes the focus out of the
 * title field, the field fires "change" because it was typed in, the hints bar re-renders
 * on that and throws away the very element the mouse went down on - so the browser
 * dispatched no click event at all. That is the blink, and it is why only a second click
 * (field already blurred, no "change" left to fire) opened the list. The bar now builds
 * its content detached and swaps it in only where the markup really differs; measured on
 * SoundCloud, the "change" after a title edit produces byte-identical markup, so the nodes
 * - and any click in progress on one of them - are left alone.
 *
 * The "there is more above" fade over the top of an open list is gone again
 * (page_creator.css).
 *
 * 2026.08.19.6
 * The hints bar's "N mixes" toggle got three fixes (page_creator.js v_57,
 * page_creator.css). The recent mix pages now stand the way a MixesDB category page lists
 * them, oldest at the top and the newest at the bottom, instead of upside down. Where the
 * category holds more pages than the ten shown, the top of the list fades
 * into the panel's background - the ones it does not show are the older ones, so "there
 * is more" belongs above its first line. And the count is a toggle from the moment it
 * appears: a name edited into the title field is answered a moment before its pages are,
 * and until now that first click did nothing, so it took a second one to open the list.
 * The click now opens the chip on a spinner and fetches the pages itself
 * (mdbPageCreator_usedCatFetchRecent, back for that one case).
 *
 * 2026.08.19.1
 * The suggested title now spells a name the way its MixesDB category does even when no
 * chunk carries the name on its own: the first parse's artists and entity category join
 * the lookup candidates (page_creator.js v_53, mdbPageCreator_addParsedNames). Reported
 * on "RA.971 DJ MARIA." (SoundCloud) - the whole title is ONE chunk, so the lookup only
 * ever asked a name that cannot exist, and the title said "DJ Maria." while the wiki
 * files her 8 mixes under "Category:DJ MARIA.". Category names are the last word on
 * spelling. The new candidates are appended last (an over-full list drops them first),
 * deduped against the chunk candidates, origin "first parse" in the reasoning panel's
 * section 3.
 *
 * 2026.08.18.14
 * The reasoning panel's section headings now stand in a column of their own
 * (page_creator.css). The five headings differ by more than ten characters, and with the
 * grey hint packed straight behind each of them every section started its hint at a
 * different x, so the panel read as five unrelated blocks rather than one list. The
 * heading column is capped, not fixed: a narrow player column shrinks it instead of
 * pushing the hint out of the panel. The headings are no longer white either - each one
 * takes its section's accent, and the raw-material sections 1 and 3 are back on the blue
 * they had before .13 rather than the grey that made them look switched off. A section
 * now states its colour once as three custom properties and bar, heading and count bubble
 * are painted off them.
 *
 * 2026.08.18.13
 * The reasoning panel's sections are renumbered 1..5 as shown - the 2a/2b pair is gone - and
 * renamed for what they hold: "Title chunks for category lookup", "Title fixed and cleaned",
 * "Category candidate lookups on MixesDB", "Title refined after lookup learnings",
 * "Categories for the mix page" (page_creator.js v_47, page_creator.css). Colours now follow
 * STATE, not type: grey while something is only a candidate (section 1's chunks and the
 * channel chip included), red for what was ignored, green only for what ends up used - so
 * green no longer means one thing in 3 and another under 2. The two build sections close
 * with the built title as ONE chip instead of re-split chunks: "Title candidate:" in grey
 * before the lookup, "Final title:" in green after it - which also retires the re-split
 * that could disagree with section 1 (the glued "Dark Skies, Horst Festival 2026" chip of
 * the .12 report). The section accents follow the same states - the copy button's orange
 * for the two title builds, grey for 1/3, green for 5 - and "no category of this name yet"
 * in 5 drops its unique yellow for the standard grey.
 *
 * 2026.08.18.12
 * A place group an uploader wrote the other way round is now read as two names
 * (title_builder.js v_45). From the report on "Dave Huismans at Dark Skies, Horst Festival
 * 2026": the suggested title was already right, but MixesDB was asked about the glued
 * "Dark Skies, Horst Festival", which can only answer empty, while "Horst Festival" itself
 * was never asked - and the page came out filed under "Dark Skies", the stage, because a
 * live title is filed under the FIRST place of its group. A comma with an EVENT name behind
 * it now separates, so both are asked on their own, and the part naming the event is the
 * entity category wherever it stands in the group. Only an event word overrules the order:
 * "@ Wire Club, Leeds" and "@ 3000Grad Festival, Utopia" are unchanged, an artist list
 * ("ANA, Johnny D, DJ Koze") stays one name group, and no suggested title changes.
 *
 * 2026.08.18.11
 * A tracklist an uploader wrote as a bulleted list instead of a numbered one now opens
 * (tracklist_detector.js v_11). From the report on
 * frida_carlos/frida_carlos_3000grad_festival_3026_schiff_ahoi, whose 32 tracks are each
 * written "- Artist - Title": clicking the "Tracklist" headline did nothing at all. The
 * Tracklist Editor API reads a leading hyphen as "this line continues the one above" and had
 * glued all 32 into one row, which at that length comes back as an empty text with "No
 * tracklist received." - and an empty answer means no box, so the headline looked like a dead
 * link. The bullet is now taken off every line before the block is handed over, hyphen, en
 * dash, em dash, "*", "•", "·", ">", "~", "=" and "|" alike - the ones the API does not strip
 * itself otherwise survive into the artist name. A blank behind the bullet is required, so an
 * artist called "-Ms-" keeps its hyphen.
 *
 * 2026.08.18.10
 * Via the shared title builder (title_builder.js v_44, title_definitions.js v_32), from a
 * SoundCloud report: the presenter rule now reads a series WORD behind "presents"/"pres."
 * as the channel's own show, not only an episode number; a month-year edition stamp behind
 * the series name is dropped (the date group already carries when the mix is from); Normal
 * Case reaches a shouted name whose only lowercase is a series word ("UNCODED BIRTHDAY
 * Radioshow" -> "Uncoded Birthday Radioshow", the word kept as typed); and the chunk split
 * separates at "presents", so presenter and presented are asked about as two names.
 *
 * 2026.08.18.3
 * Third bug out of the .28 round (page_creator.js v_43): section 3 dropped every candidate
 * the wiki answered EMPTY for - such a name was asked, showed its chip in section 2 and
 * appeared in no lookup column. The recorded role is a plain string ("artist"/"entity") and
 * the panel read .artist off it as if it were an object, so only a name with an answer ever
 * rendered. And the step details (section 2) lose their monospace (page_creator.css): a
 * detail is as often a prose sentence as a quoted title.
 *
 * 2026.08.18.2
 * Section 4 of the reasoning panel now says WHY each name got its slot, in one line above the
 * lookup answer (title_builder.js v_38, page_creator.js v_42, page_creator.css) - "picked as
 * the artist: the channel's own name stands in the title - the uploader and the title say the
 * same thing". From a SoundCloud report where a festival the wiki has never heard of became
 * the entity while the channel, a podcast with 425 mixes, sat unused and nothing on screen
 * said what decided it. The sentence is written by the branch that decided
 * (mdbTitle_trace.picks, filled at mdbTitle_result's ten call sites), never re-derived in the
 * panel.
 * Also fixed while there: section 3 painted EVERY chip green. The role argument added in
 * .28 shifted the row renderer's isCat and overruledBy a slot along, so "artist" arrived as
 * "did this become a category".
 *
 * 2026.08.18.1
 * The reasoning panel's per-answer percentage (title_builder.js v_38) no longer leans on the
 * mix count: a category with 500 mixes can be the wrong reading of the words just as easily
 * as an empty one, so the count only says how well the wiki knows the name. The ladder is
 * -10 for a category holding one mix or none and -5 for two to four; the -12 and -5 brackets
 * below 10 and 25 mixes are gone. What a name IS (spelling, several readings at once, a
 * channel rule saying otherwise, a single word the wiki barely knows) still decides the rest.
 * Also caught up with the two shared files this script had been left behind on
 * (title_definitions.js v_29, title_builder.js - the .27/.28 rounds bumped SoundCloud only,
 * so a TrackId.net install kept serving the older cached copies).
 *
 * 2026.08.17.28
 * Second round of the same report, via the shared page creator (title_definitions.js v_28,
 * title_builder.js v_36, page_creator.js v_41, page_creator.css): the reasoning panel's
 * section 3 sorts its CHIPS into the two candidate columns, decided from the title's shape
 * before the lookup fires - names in front of the "@" ask as the artist; series-looking
 * names, everything behind the "@" and a curated show name as the entity; the channel as
 * both. "No category of this name" shows only in the name's own column. The place group's
 * country stays in the title ("@ S.U.N Festival, Hungary") and is not looked up. Also
 * fixed: section 4 died on any page whose artist or entity IS a known category (bare match
 * handed to mdbPageCreator_reasoningMatch's old signature).
 *
 * 2026.08.17.27
 * From a SoundCloud report ("MNMT Recordings : Adjust (BE) @ S.U.N Festival - Hungary"),
 * via the shared title builder (title_definitions.js v_27, title_builder.js v_35): a
 * bracket holding nothing but a country says where the artist is FROM and is dropped even
 * on a live title, as long as it stands in front of the "@" - no chunk, no lookup
 * candidate - and an "@" glued inside the event bit now names the artist instead of the
 * first bit winning positionally. The reasoning panel's lookup section (page_creator.js
 * v_40, page_creator.css) is now a table with two answer columns - "Artist category
 * candidates" and "Entity category candidates": an answer lands under the role its type
 * can play, an empty side reads "-", a name with no category spans both.
 *
 * 2026.08.17.24
 * The reasoning panel's sections 1 and 2 split the title the same way again
 * (title_builder.js v_33): the "@" pass sat in mdbTitle_titleChunks, one level above the
 * splitter the panel calls for its "Left for the parser" chips, so section 2 showed an
 * "<artist> @ <event>" bit as ONE chip where section 1 showed two. Moved into
 * mdbTitle_traceChunks, which both go through. Display only: the chunks, the lookups and the
 * suggested title are unchanged, all 113 examples pass.
 *
 * 2026.08.17.23
 * The one-" @ " rule now also holds at the builder's exit (title_builder.js v_32,
 * title_definitions.js v_26): the event and venue branches compose "<artist bit> @ <place>"
 * AFTER the title-wide rewrite, so an artist bit already carrying an "@" put a second one
 * into the title once the wiki knew the venue. Enforced in mdbTitle_result, where every
 * branch converges. Require params bumped so a Tampermonkey that cached the previous
 * versions before the push reached the CDN refetches.
 *
 * 2026.08.17.10
 * From a SoundCloud report ("Kernel Existence - live@3000Grad Festival @Utopia 2021"), via
 * the shared title builder (title_definitions.js v_25, title_builder.js v_31): a MixesDB
 * title carries " @ " once - every "@" after the first folds into the place group as its
 * "," ("@ 3000Grad Festival, Utopia"), the entity category is the FIRST place alone, and a
 * year trailing that place list is the gig year: it wins over the upload year and leaves
 * the title. The chunk split runs the joiners first and separates at every "@", so a live
 * marker is no chunk and each place is looked up on its own. New: "Live PA" (from the title,
 * or from the description of a live recording) comes out as "(Live PA)" behind the artist's
 * name, while the artist category stays the bare name.
 *
 * 2026.08.17.3
 * The shared chunk split (mdbTitle_titleChunks, title_builder.js v_25) now removes what the
 * parse removes: a bracket crediting the artist's labels ("Tooker (SONARA / Crosstown
 * Rebels)") and a place list saying where the artist is from. Those names showed up as
 * chunks and were sent to the mdbnames lookup although the parse had already dropped them -
 * asking the wiki about a record label wasted the request. The reasoning panel
 * (page_creator.js v_25, page_creator.css) shows them in red on a "Removed:" line
 * with the reason spelled out, so a reporter sees the drop was on purpose.
 * The panel's "Fixed and cleaned" section also names the channel -> show mappings, whose
 * work was invisible (nothing in the title text changes): a channel on the known-shows list
 * (mdbTitleUsernameConversions) as "Resident Advisor -> RA Podcast", and a show the channel
 * and the title name together (mdbTitleChannelSeriesConversions) as '"DJ MIX" on the channel
 * Dance TV -> Dance TV DJ Mix'.
 * The removed chips lost their strikethrough (red alone says it), the cleanup section no
 * longer repeats what that "Removed:" line already names, and the channel -> show mapping
 * steps draw the mapping as chips: the channel in the blue of the chunk section's channel
 * chip, the show it became in green.
 *
 * 2026.08.16.15
 * The "Report" box got a reasoning panel above the textarea (shared/page_creator/:
 * page_creator.js v_24, title_builder.js v_22, page_creator.css) - how the suggestion was
 * built, in four sections: title chunks, cleanup steps, the action=mdbnames lookups with
 * their answers, and the created page's categories annotated from the lookup cache. Editing
 * the title re-renders the panel after a short pause and looks the new names up first.
 * The chunks are the shared split (mdbTitle_titleChunks) that also feeds the lookup
 * candidates: brackets read as separators and the series-"by" split included.
 * Dark surface like the loading skeleton, one accent colour per section, semantic tones on
 * the notes; opened before every lookup answered, the panel shows pulsing stand-in rows of
 * its own and swaps to the real content once everything is in.
 *
 * 2026.08.16.8
 * ONE skeleton for page creator row + toolkit, and the CSS owns the height. The row was
 * appended INTO the kept (always visible) player wrapper, so it popped in on its own before
 * the reveal and the covered area below changed size - now it is placed "after" the player
 * wrapper, a hidden direct child of #mdb-tid-audiostreamExtras between player and toolkit,
 * revealed together with the toolkit in the one swap (order stays player > row > toolkit:
 * .after(player) inserts in front of the toolkit whichever of the two renders first). The
 * call's height option is gone: it set an inline style that silently beat any height tuned
 * in page_creator.css - the CSS default is now the one source of truth for all sites.
 *
 * 2026.08.16.5
 * The embedded player is no longer covered by the loading skeleton: its embed markup is
 * built right on the spot, so hiding it only delayed playback for no calmer page. New keep
 * option of mdbSkeleton_show() (shared/page_creator/): direct children matching it stay
 * visible while loading and are skipped by the reveal fade, so the player does not blink
 * at the swap. The skeleton now only holds the space below the player (rows: toolkit,
 * 120px) where toolkit and page creator row appear.
 *
 * 2026.08.16.4
 * Audiostream pages get the loading skeleton the SoundCloud script introduced, now shared
 * as mdbSkeleton_* in shared/page_creator/: player embed, toolkit and (for SoundCloud
 * players) the page creator row build up hidden behind a dark grey box with pulsing
 * stand-ins (player block + toolkit lines) and appear in one step once the toolkit verdict
 * is in and the DOM has settled - or after a 6s cap. For that the player wrapper now sits
 * inside a new #mdb-tid-audiostreamExtras container, which also catches the toolkit
 * (getToolkit's "after" placement lands inside it, right behind the player); selectors on
 * .mdb-player-audiostream and the page creator target are unchanged. hearthis players
 * arrive through a separate async path outside the container and keep the old behaviour.
 * New debug option window.mdbSkeleton_enabled (default true): off = pieces pop in as
 * before, and both modes log the identical "everything loaded Xms" line for comparison.
 *
 * 2026.08.15.4
 * The "Create" link now also fills the created page's STYLE categories from TID's own "Style
 * suggestions" box (new stylesBox option of mdbPageCreator_add(), next to tracklistBox): its
 * "[[Category:...]]" lines replace the two empty [[Category:]] rows the page text otherwise
 * keeps for the editor. Read at the moment "Create" is clicked, like the tracklist - so
 * corrections typed into the box ride along, and no waiting for the box is needed. No
 * suggestions (or an emptied box) keep the two empty rows as before.
 *
 * 2026.08.15.1
 * The MixesDB page creator (shared/page_creator/) now runs on audiostream pages with a
 * SoundCloud player: the suggested-title row with the "Create" link sits between the embedded
 * player and the toolkit, fed from the SC track API (title, username, dates, duration, artwork
 * "-original" URL) via the same access token the toolkit already uses - the TID page itself
 * only knows a normalized heading and a locale-formatted date. No description-tracklist
 * detection here: the new tracklistBox option of mdbPageCreator_add() points the page creator
 * at TID's own #tlEditor box, so whatever the identified tracks say at the moment "Create" is
 * clicked goes onto the new page, and the Tracklist Editor's verdict about that text files the
 * "Tracklist:" category. Other players (Mixcloud, YouTube, hearthis.at) do not get the row yet.
 */
