// ==UserScript==
// @name         TrackId.net (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.27.31
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-TrackId.net_114
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/mixesdb_modal/funcs.js?v-TrackId.net_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-TrackId.net_19
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-TrackId.net_132
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_importer/merge_core.js?v-TrackId.net_16
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_importer/funcs.js?v-TrackId.net_39
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_definitions.js?v_57
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_builder.js?v_89
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/tracklist_detector.js?v_13
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/page_creator.js?v_121
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
var cacheVersion = 207,
    scriptName = "TrackId.net";
window.scriptName = scriptName; // toolkit.js reads this global directly
window.cacheVersion = cacheVersion; // same reason: the @require'd shared files cache-bust their own CSS with it

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + "shared/page_creator/page_creator.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );

// MixesDB Page Creator: normally the row is only offered for players that are NOT on MixesDB
// yet - for a used player there is nothing to create. With this on, the row is shown for used
// players too, marked "used" and without the "Create" link (which would only start a duplicate
// page). On window because page_creator.js is a @require and cannot see this IIFE's scope.
window.mdbPageCreator_showForUsedPlayers = false; // Off despite the beta phase (like on SoundCloud): the big PC block gets in the way of testing the Tracklist Importer on used players

// Loading skeleton on audiostream pages: the grey pulsing placeholder below the embedded
// player (which shows straight away) until toolkit and Page Creator row have arrived -
// shared with SoundCloud, see mdbSkeleton_* in shared/page_creator/page_creator.js. With
// this off, the pieces pop in one by one; the time until everything has loaded is logged
// the same way in both modes.
window.mdbSkeleton_enabled = true;


/*
 * TrackId.net links under the players on MixesDB mix pages and on MixesDB:Explorer/Mixes
 * "Exists on TrackId.net" with a link, or "Submit to TrackId.net" with the player URL and
 * the page title already filled in.
 * Set 0 to disable
 */
const trackIdnet_addLinks = 1; // default: 1


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
 * TrackId.net links under every player on mixesdb.com
 *
 * Moved here out of the MixesDB Userscripts Helper: the link leads OUT to TrackId.net and
 * says whether this player is known there, which is this script's subject, not the Helper's -
 * the Helper is what teaches MixesDB to accept whatever the other scripts hand over. Nobody
 * who does not work with TrackId.net has a use for the links, and now they arrive with the
 * script that is installed for it.
 *
 * Runs on mix pages (ns 0) and on MixesDB:Explorer/Mixes; the mix page half also fires on the
 * edit form's preview, where the players are rendered the same way.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

if( visitDomain == "mixesdb.com" ) {
    d.ready(function(){ // needed for mw.config
        logFunc( "tidLinks on mixesdb.com" );

        if( !trackIdnet_addLinks ) {
            log( "trackIdnet_addLinks is off." );
            return;
        }

        // @include is http*mixesdb.com/w/* and therefore looser than a MediaWiki page - say so
        // instead of throwing on the first mw.config.get()
        if( typeof mw == "undefined" ) {
            log( "No mw.config on this page." );
            return;
        }

        // Prepare variables to check if we're on a mix page etc.
        var wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
            wgTitle = mw.config.get("wgTitle"),
            wgPageName = mw.config.get("wgPageName"),
            isMixPage = ( wgNamespaceNumber == 0 && wgTitle != "Main Page" ),
            isExplorerMixes = ( wgNamespaceNumber == 4 && wgPageName == "MixesDB:Explorer/Mixes" );

        // Two named flags rather than the one long condition this arrived as: there the setting
        // was ANDed with the mix page half alone, so && binding tighter than || left the
        // Explorer half running with the links switched off.
        if( !isMixPage && !isExplorerMixes ) {
            log( "Neither a mix page nor MixesDB:Explorer/Mixes." );
            return;
        }

        log( "Criteria for mix page matched." );

        /*
         * TrackId.net submit link under each player
         */
        $(".playerWrapper[data-playersite]").each(function(){
            var playerWrapper = $(this),
                playerTidCompatible = playerWrapper.attr("data-tidcompatibleplayersite"),
                playerUrl = playerWrapper.attr("data-playerurl"),
                playerSite = makeCssSafe( playerWrapper.attr("data-playersite") ),
                keywords = "";

            logVar( "playerSite", playerSite );
            logVar( "playerUrl", playerUrl );

            // Remove URL paramteres from e.g. SoundCloud and Mixcloud
            if( playerSite != "YouTube" ) {
                playerUrl = removeParametersFromUrl( playerWrapper.attr("data-playerurl") );
            } else {
                playerUrl = playerUrl.replace( "www.youtu.be", "youtu.be" );
            }

            if( playerSite == "hearthis-at" ) {
                playerUrl = playerUrl.replace( "hearthis.audio", "hearthis.at" );
            }

            // if mix page
            if( isMixPage ) {
                keywords = normalizeTitleForSearch( $("h1#firstHeading").text() );
            }

            // if Explorer/Mixes
            if( isExplorerMixes ) {
                var explorerResult = playerWrapper.closest(".explorerResult"),
                    explorerResult_title = $(".playerLink", explorerResult).attr("title");
                keywords = normalizeTitleForSearch( explorerResult_title );
            }

            if( playerTidCompatible == "true" ) {

                // check usage
                var apiQueryUrl_check = apiUrl_mw;
                apiQueryUrl_check += "?action=mixesdbtrackid";
                apiQueryUrl_check += "&format=json";
                apiQueryUrl_check += "&url=" + playerUrl;

                logVar( "apiQueryUrl_check", apiQueryUrl_check );

                $.ajax({
                    url: apiQueryUrl_check,
                    type: 'get', /* GET on checking */
                    dataType: 'json',
                    async: true,
                    success: function(data) {
                        /*
                         * Both links leave MixesDB for TrackId.net while the contributor is
                         * still working on the mix page - submitting or comparing a tracklist
                         * is a side trip, so they open in a new tab and leave the page behind
                         * them untouched.
                         */

                        // avoid undefined error
                        if( ( data.error && data.error.code == "notfound" )  ) {
                            // no result
                            var tidLink_submit = '<a href="'+makeTidSubmitUrl( playerUrl, keywords )+'" target="_blank"><img class="tidSubmit-icon fixedWidth" src="'+favicon_TID+'" alt="TrackId.net" style="max-height:1.2em;"> Submit to TrackId.net</a>';
                            playerWrapper.append( '<div class="tidLink '+playerSite+'">'+tidLink_submit+'</div>' );
                        } else {
                            var tidLink = "",
                                trackidurl = data.mixesdbtrackid?.[0]?.trackidurl || null,
                                lastCheckedAgainstMixesDB = data.mixesdbtrackid?.[0]?.mixesdbpages?.[0]?.lastCheckedAgainstMixesDB || null;

                            logVar( "trackidurl", trackidurl );
                            logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                            if( trackidurl ) {
                                tidLink += '<a href="'+trackidurl+'" target="_blank"><img class="tidSubmit-icon fixedWidth" src="'+favicon_TID+'" alt="TrackId.net" style="max-height:1.2em;"> Exists on TrackId.net</a>';

                                if( lastCheckedAgainstMixesDB ) {
                                    tidLink += ' <span id="mdbTrackidCheck-wrapper" class="integrated" style="max-height:15px">'+checkIcon+'integrated</span>';
                                    tidLink += ' ' + toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );
                                } else {
                                    tidLink += ' (not integrated yet)';
                                }
                            }

                            if( tidLink != "" ) {
                                playerWrapper.append( '<div class="tidLink '+playerSite+' grey">'+tidLink+'</div>' );
                            }
                        }
                    }
                }); // END ajax
            } else {
                log( "NOT playerTidCompatible: " + playerUrl );
            }
        });
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

    // MixesDB Page Creator - only needs the player URL, so it starts alongside the embed
    funcTidPageCreator( playerUrl );
}

/*
 * tidSkeleton_show
 * The one place the audiostream skeleton is configured, because it has two callers:
 * funcTidPlayers() for the players built on the spot and the toolkit handler for the
 * hearthis.at one, which only exists once its lookup has answered.
 * The player is NOT covered (keep): it should play as early as possible. The skeleton holds
 * the space below it, where Page Creator row and toolkit appear together at the reveal - the
 * row is placed "after" the player wrapper (funcTidPageCreator), so it is a hidden direct
 * child of the extras wrapper like the toolkit, not a visible part of the kept player.
 * Row and toolkit are SEPARATE stand-in boxes: the "pageCreator" one only where the row
 * really comes - funcTidPageCreator only builds it on audiostream detail pages with a
 * SoundCloud or YouTube player, and a grey box for a row that never arrives would reveal
 * into a hole.
 * The player URL is read off the wrapper (data-tidplayerurl), where both callers put it.
 * No height option: the values in page_creator.css are the one source of truth - an inline
 * height here would silently win over any value tuned in the CSS (the toolkit-only and the
 * row+toolkit case each have their own height there).
 */
function tidSkeleton_show() {
    var playerUrl = $("#mdb-tid-audiostreamExtras").attr("data-tidplayerurl") || "",
        playerDomain = getDomain_fromUrlStr( playerUrl ),
        // the same player types funcTidPageCreator builds a row for
        rowComes = urlPath_noParams(1) == "audiostreams" && urlPath_noParams(2)
                   && ( playerDomain == "soundcloud.com" || playerDomain == "youtube.com" || playerDomain == "youtu.be" );

    mdbSkeleton_show({
        target: "#mdb-tid-audiostreamExtras",
        rows:   rowComes ? [ "pageCreator", "toolkit" ] : [ "toolkit" ],
        keep:   ".mdb-player-audiostream"
    });
}

/*
 * MixesDB Page Creator (shared/page_creator/)
 * The suggested-title row between the embedded player and the toolkit - SoundCloud and
 * YouTube players so far. Each player type has its own data source, because the TID page
 * itself only knows a normalized heading and a locale-formatted date, and the title builder
 * deserves better input than that:
 *   - SoundCloud: the SC track API (title, username, dates, duration, artwork, description),
 *     the same way the SoundCloud script does it
 *   - YouTube: TID's OWN public API (funcTidPageCreator_youtube below) - it stores the
 *     original YT title, channel name and upload date, which is everything the row needs,
 *     and it is a same-origin request with no token
 * The "Create" link does NOT use the shared description-tracklist detection: TID's own
 * tracklist box (#tlEditor, built from the identified tracks further down this file) is the
 * better tracklist, and the tracklistBox option points the Page Creator at it - whatever is in
 * that box at the moment "Create" is clicked goes onto the new page. A stream still processing
 * has no box yet; clicking "Create" then starts the page with an empty tracklist, so wait for
 * the box.
 */
function funcTidPageCreator( playerUrl ) {
    logFunc( "funcTidPageCreator" );
    logVar( "funcTidPageCreator: playerUrl", playerUrl );

    // audiostream detail pages only - funcTidPlayers also runs for the submit form's preview
    if( urlPath_noParams(1) != "audiostreams" || !urlPath_noParams(2) ) {
        log( "funcTidPageCreator: not an audiostream detail page - no Page Creator row." );
        return;
    }

    var playerDomain = getDomain_fromUrlStr( playerUrl );

    if( playerDomain == "youtube.com" || playerDomain == "youtu.be" ) {
        funcTidPageCreator_youtube( playerUrl );
        return;
    }

    // Mixcloud/hearthis.at still need their own data source
    if( playerDomain != "soundcloud.com" ) {
        log( "funcTidPageCreator: not a SoundCloud or YouTube player - no Page Creator row yet." );
        return;
    }

    // Two network round trips deep (access token, then the track). If the reader has clicked
    // on to the next audiostream meanwhile, the answer must be dropped instead of written into
    // that page - see mdbPageGeneration in global.js.
    var pageGeneration = mdbPageGeneration;

    getScAccessTokenFromApi(function( scAccessToken ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        if( !scAccessToken || scAccessToken == "null" ) {
            log( "funcTidPageCreator: no SC access token - no Page Creator row." );
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
 * funcTidPageCreator_youtube
 * The YouTube route of the Page Creator row. YouTube offers no tokenless metadata API that
 * answers cross-origin (oEmbed carries no date, the innertube endpoint refuses a foreign
 * Origin header, and this script deliberately ships with no @grant) - but TID's OWN public
 * API already stores what its scraper read off the video: the original title, the channel
 * name, the upload date (createdOn - NOT addedOn, which is when the TID request was made),
 * the duration and an artwork URL. Same origin, no token, one request.
 * channelTrust "low": a YouTube channel is a broadcaster or re-uploader often enough that
 * the title builder must not fall back to its name without backing - see
 * mdbPageCreator_add()'s header comment in shared/page_creator/page_creator.js.
 */
function funcTidPageCreator_youtube( playerUrl ) {
    logFunc( "funcTidPageCreator_youtube" );

    // the slug is the API's key, and it is what the address bar carries
    var slug = urlPath_noParams(2),
        apiUrl = "https://trackid.net/api/public/audiostreams/" + slug,
        // one round trip - drop the answer if the reader has clicked on to the next
        // audiostream meanwhile (see mdbPageGeneration in global.js)
        pageGeneration = mdbPageGeneration;

    logVar( "funcTidPageCreator_youtube: apiUrl", apiUrl );

    $.ajax({
        dataType: "json",
        url: apiUrl,
        success: function( answer ) {
            if( !mdbIsCurrentPage( pageGeneration ) ) return;

            var a = answer ? answer.result : null;

            if( !a || !a.title ) {
                log( "funcTidPageCreator_youtube: the TID API answered, but without a usable audiostream (title missing)." );
                return;
            }

            // "02:01:29" (a possible fraction stripped); read digit group by digit group so
            // a "MM:SS" answer cannot land in the hours
            var durParts = String( a.duration || "" ).replace( /\..*$/, "" ).split( ":" ),
                durSec = 0,
                di;

            for( di = 0; di < durParts.length; di++ ) {
                durSec = durSec * 60 + ( parseInt( durParts[di], 10 ) || 0 );
            }

            // the video ID keys both URLs we hand over: the youtu.be form for {{Player}}
            // (the form MixesDB embeds, same as the YouTube script passes) and the maxres
            // thumbnail for the upload form - TID only stores the small hqdefault
            var ytId = getYoutubeIdFromUrl( a.url || playerUrl );

            logVar( "funcTidPageCreator_youtube: title", a.title );
            logVar( "funcTidPageCreator_youtube: channel", a.channel );
            logVar( "funcTidPageCreator_youtube: createdOn", a.createdOn );
            logVar( "funcTidPageCreator_youtube: durSec", durSec );
            logVar( "funcTidPageCreator_youtube: ytId", ytId );

            mdbPageCreator_add({
                title:        a.title,
                channel:      a.channel || "",
                // YouTube channels are often unrelated to who played - see the function comment
                channelTrust: "low",
                createdAt:    a.createdOn || "",
                durationMs:   durSec ? durSec * 1000 : 0,
                playerUrl:    ytId ? "https://youtu.be/" + ytId : playerUrl,
                artworkUrl:   ytId ? "https://i.ytimg.com/vi/" + ytId + "/maxresdefault.jpg" : ( a.artworkUrl || "" ),
                // the stored values are YouTube's own, so a report reads "YT title:" here
                sourceLabel:  "YT",
                // same placement as the SoundCloud route - a direct child of
                // #mdb-tid-audiostreamExtras between player and toolkit, where the loading
                // skeleton covers it
                target:       ".mdb-player-audiostream",
                placement:    "after",
                // TID's own tracklist box and style suggestions, read at click time
                tracklistBox: "#tlEditor #mixesdb-TLbox",
                stylesBox:    "#mixesdb-TIDstyles"
            });
        },
        error: function( jqXHR, textStatus, errorThrown ) {
            log( "funcTidPageCreator_youtube: FAILED to read the TID API (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + ")." );
        }
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

    // the Page Creator row is gated behind that toolkit's usage verdict - re-arm the poll
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

// mdbTid_totalDurSec
// The mix runtime TrackId.net prints in its header ("Duration 1:04:54"), in seconds. Read out
// of the DOM at CALL time and never cached: trackid.net is a single-page app, and a value
// stored once would still answer for the previous audiostream after a navigation.
//
// The Tracklist Importer picks it up through window.mdbTlImporter_durationSec (see
// shared/tracklist_importer/funcs.js) - it is what bounds the guessed cues at the END of a
// merged tracklist: a row behind [61] on a 1:04:54 mix can only be a "6x" minute, so it reads
// "[6?]" instead of "[??]".
function mdbTid_totalDurSec() {
    var text = $("p.MuiTypography-body1:contains('Duration')").closest("div").next(".MuiGrid-item").text().trim(),
        parts = text.split(":"),
        sec = parts.length === 3 ? durToSec( text ) : parts.length === 2 ? durToSec_MS( text ) : 0;

    return isFinite( sec ) && sec > 0 ? sec : 0;
}
window.mdbTlImporter_durationSec = mdbTid_totalDurSec; // a FUNCTION, so every read is this page's

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
        totalDur_Sec = mdbTid_totalDurSec();
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

            // The second pass is not only about the TEXT: a tracklist that was incomplete
            // ONLY because of those "?" rows is valid AND complete once they are gone, so the
            // verdict has to be asked again for the tracklist that actually goes into the box.
            // https://trackid.net/audiostreams/aka-aka-pres-rhythm-prism-radio-053
            var res_fixedCues = apiTracklist( tl_fixedCues, "trackidNet" ),
                tlApi_fixedCues = res_fixedCues.text,
                feedback_fixedCues = res_fixedCues.feedback;

            log( 'tlApi_fixedCues ("trackidNet", status: ' +
                 ( feedback_fixedCues && feedback_fixedCues.status ? feedback_fixedCues.status : "(none)" ) +
                 "):\n" + tlApi_fixedCues );

            if( tlApi_fixedCues ) {
                tlWrapper.before( ta );

                $("#mixesdb-TLbox").addClass("mixesdb-TLbox")
                    .val( tlApi_fixedCues )
                    .attr( "data-tlcandidate", tlApi )
                    // Both verdicts are in hand here, so the Toggle can swap them with the
                    // text instead of asking the API a third time on every click.
                    .data( "mdbTlFeedback", feedback_fixedCues )
                    .data( "mdbTlFeedbackCandidate", res.feedback );

                // ...and that fresh answer is the one printed. Handing fixTLbox() the FIRST
                // one left the box orange - "valid and incomplete: # [??] ?" - under a
                // tracklist that no longer holds a single "?", and with the row count of the
                // longer version it was talking about.
                fixTLbox( feedback_fixedCues );
            }

            if( tlApi.split("\n").length != tlApi_fixedCues.split("\n").length ) {
                showInfoCuesRemoved();
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
            // append, not prepend: where the API sent this list itself, its first <li> is the
            // verdict about the tracklist and stays the first thing in the box
            jNode.append('<li class="info_switchCueFormat"><button id="switchCueFormat" class="hand">Switch cue format (mmm > h:m)</button></li>');
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

/*
 * showInfoCuesRemoved
 *
 * The line above the box saying that likely-false "?" tracks were taken out, with the Toggle
 * that shows the unfiltered version.
 *
 * A function rather than a one-off because it has to be put back: it lives INSIDE the feedback
 * box, and every re-rendered verdict rebuilds that box's content - which is exactly what the
 * Toggle itself now does. It also creates the list it goes into when the answer on screen has
 * none: "valid and complete" comes as a bare message, and that is the usual answer here once
 * the "?" rows are gone.
 */
function showInfoCuesRemoved() {
    if( $("#toggleTlCandidate").length ) return;

    var info_cuesRemoved = '<li class="info_cuesRemoved">Possibly false <code>"?"</code> tracks have been removed due to short cue differences.';
    info_cuesRemoved += ' <button id="toggleTlCandidate" class="hand">Toggle</button>';
    //info_cuesRemoved += '&nbsp; <span id="select_tidminGap_wrapper" style="display:none">Max gap: <select id="select_tidminGap"><option>1</option><option>2</option><option selected="selected">3</option></select> minutes</span>';
    info_cuesRemoved += '</li>';

    // append: the API's verdict is the first row of that list where the API sent it, and the
    // list sits under the verdict where we create it - our notice goes below either way
    tlBoxTopInfoList().append( info_cuesRemoved );
}

// toggleTlCandidate
// Delegated, not bound to the button that happens to be on the page: showInfoCuesRemoved()
// builds a NEW button whenever the feedback box was re-rendered, and a handler bound to the
// old one would go with it.
$(document).on("click", "#toggleTlCandidate", function() {
    logFunc( "toggleTlCandidate" );

    var ta = $("textarea.mixesdb-TLbox"),
        ta_rows = ta.attr("rows"),
        tl_orig = ta.val(),
        tl_candidate = ta.attr("data-tlcandidate");

    logVar( "tl_orig", tl_orig );
    logVar( "tl_candidate", tl_candidate );

    if( tl_candidate ) {
        var tl_candidate_rows = tl_candidate.split("\n").length,
            feedback_orig = ta.data("mdbTlFeedback"),
            feedback_candidate = ta.data("mdbTlFeedbackCandidate");

        ta.val( tl_candidate )
            .attr( "data-tlcandidate", tl_orig )
            .data( "mdbTlFeedback", feedback_candidate )
            .data( "mdbTlFeedbackCandidate", feedback_orig );

        //$("#select_tidminGap_wrapper").show();

        if( ta_rows < tl_candidate_rows ) {
            ta.attr( "rows", tl_candidate_rows );
        }

        // The verdict follows the text. Without this the box keeps saying "valid and complete"
        // while the "?" rows it was complete WITHOUT are back on screen - the same wrong
        // pairing the second API call was added to end, one click later.
        // Both texts came from the API, so the memo the blur update compares against moves
        // with them too and leaving the box stays quiet.
        if( feedback_candidate ) {
            tlBoxRenderFeedback( ta, feedback_candidate );
            showInfoCuesRemoved();
        }

        ta.data( "mdbTlboxKnown", tl_candidate );
    }
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
 * 2026.08.27.31
 * Tracklist Importer: the Original and Candidate boxes of the review block are as tall as their
 * own text again (tracklist_importer funcs.js v39, CSS). They used to be stretched to the row
 * count of the tallest of the three columns, which left a screen of empty box under a short
 * list. Only the Merged editor still gets that shared row count, so nothing is scrolled away.
 *
 * 2026.08.27.30
 * Tracklist Importer: an Insert opens the review block too (tracklist_importer funcs.js v38,
 * CSS). Until now only a merge did, so after an insert the tracklist had to be copied into the
 * page's own Tracklist Editor by hand before it could be adjusted. The block now opens for an
 * insert as well - and with it the down state, which puts the inserted list into that editor
 * and hangs its Apply button under it. Two columns instead of three: the page had no tracklist,
 * so there is no Original to show. "Inserted" holds what went into the page, "Candidate" the
 * found list exactly as it stands, nothing highlighted - no merge ran to claim anything.
 *
 * 2026.08.27.29
 * Tracklist Importer merge, the redundant "..." (merge_core.js v16, reported on Luke Slater @
 * The Lot Radio 2026-06-13). A gap says tracks are missing at that spot - and once the found
 * tracklist has filled it up, the cues around it often say the opposite. The merged list is now
 * measured against itself: the median time from one track to the next where no "..." stands
 * between them is what one track of this mix runs, and a gap has to span more than one and a
 * half times that to survive. In the reported set (median 4 minutes) the 3 and 5 minute holes
 * go and the 7 and 9 minute ones stay. Only merges that actually added something are touched,
 * every track has to carry a real cue, and the first and last "..." of a list are left alone.
 *
 * 2026.08.27.28
 * Tracklist Importer: the "TID tracklist is integrated" checkbox no longer waits to be ticked
 * by hand after an import (tracklist_importer funcs.js v37). Insert/Merge/Chaptered open the
 * edit form in a new tab, so this page stays - and it now watches the mix page from here: every
 * 5s in the first minute, every 10s in minutes 2-4, every 30s in minutes 5-10, then it gives
 * up. The moment the page's tracklist
 * carries what was carried over, an "Integrated" note appears in front of the link and the box
 * is ticked the same announced way the "Identical" verdict ticks it. A merely CHANGED tracklist
 * is not the test - a foreign edit changes it too, and the tick POSTs with no way back: what the
 * merge would still write into the page has to have gone down (all of it, or the part the reader
 * let in). Behind a Chaptered link, where no merge runs, a tracklist that grew is the answer.
 *
 * 2026.08.27.26
 * Tracklist Importer, two fixes behind one report ("the Report shows the right merge, the edit
 * form gets a wrong one", tracklist_importer funcs.js v35, merge_core.js v15). Both come from
 * the mixesdb.com side, which BOTH carrying scripts (this one and 1001 Tracklists) run: until
 * now the first ready handler took the page, so a script sitting on an older cached copy of the
 * shared files could answer a click whose link the fresh script had built - the merge in the
 * edit form was then not the merge the Report had shown, and no fix could be tested. The link
 * names its sender now (&mdbTlImporterFrom=), that instance owns the page, and the log says
 * which one it is; an instance the link does not name takes over half a second later if the
 * named one never shows up. Second: the mix runtime is no longer only the link's to carry - the
 * edit page reads the "dur" cell of the page's own File details table when the link brought
 * none (tlImporter_pageDurationSec), so the cues behind the last known one are bounded on every
 * page that states its duration, whatever built the link.
 *
 * 2026.08.27.25
 * Tracklist Importer merge, the two ENDS of the cue guessing (merge_core.js v14,
 * tracklist_importer funcs.js v34, reported on fibre podcast sigint 014). The neighbour rule
 * needs a known cue on either side, and the first and the last row have only one. The FIRST
 * row is where the recording starts, so an unknown cue on it is written "[00]" outright instead
 * of being guessed down to "[0?]" - unless a "..." gap stands in front of it, which says the
 * list does not start there. Behind the LAST known cue the mix RUNTIME now plays the missing
 * neighbour: TrackId.net prints it in its header (mdbTid_totalDurSec, handed to the importer
 * through window.mdbTlImporter_durationSec and travelling to the edit page in the hash), so a
 * row behind [61] in a 1:04:54 mix reads "[6?]" - minute 61 to 64 all start with a 6. Sites
 * without a runtime behave as before, nothing is filled in there. The Report names the runtime
 * now, so a reported case can be reproduced.
 *
 * 2026.08.27.24
 * Via the shared Page Creator (page_creator.js v_121): the lead artwork line no longer goes
 * missing because ONE sibling's file name spells a character the wiki cannot put in a file
 * name. MediaWiki replaces ":", "/" and "\\" with a "-" on upload, so
 * "2017-09-21 - Mohr/Sula - Transmittal Tapes 6" is filed as "... - Mohr-Sula - ....jpg". That
 * page read as "artwork named after something else", 6 of 7 is not 90%, and reasoning section 7
 * said "no 90% agreement -> no image line" although all seven Transmittal Tapes pages open with
 * their own artwork (reported 2026-08-27). Both sides use the uploaded name now - the vote and
 * the [[File:]] line the new page is given, which for such a title used to point at a name the
 * uploader can never create. Second change on the same vote: where the sample splits between
 * "named after the page" and "named after something else" but NOT ONE page is without an
 * artwork, the majority answer wins instead of the vote abstaining - a series where every page
 * has a picture must not get its first page without one. A single page without an artwork still
 * puts the 90% bar back in charge, and a venue's or event's pages, which lead with "named after
 * something else", decide as before.
 *
 * 2026.08.27.23
 * Tracklist Importer merge, the unknown cues of a cue-less tracklist (merge_core.js v13): a mix
 * page whose tracklist carries no cue at all has no cue format the merge can keep, so it
 * borrows the found tracklist's - "[??]" no longer stands two digits wide between three-digit
 * cues. And an unknown cue keeps every leading digit the known cues around it agree on: one
 * between [095] and [098] reads "[09?]" now, one between [098] and [103] stays "[???]" because
 * the two say nothing in common. Nothing is filled in behind the last known cue (the stream
 * runs on) or where more rows sit between two cues than there are minutes between them - six
 * tracks did not play in minute 008. Reported on fibre podcast bman 011.
 *
 * 2026.08.27.22
 * The Page Creator row states its font sizes in px instead of rem (page_creator.css): rem is
 * the HOST page's root font size - 16px here, 14px on SoundCloud, 10px on YouTube - so the same
 * row came out in three sizes. Here that means slightly smaller text (title field 13px instead
 * of 14.4px, "Create" 14px instead of 16px): the row now looks the same on every site.
 *
 * 2026.08.27.21
 * Page Creator row for YouTube players (funcTidPageCreator_youtube): the data comes from
 * TID's own public API (/api/public/audiostreams/<slug>), which stores the original YT
 * title, channel name and upload date (createdOn) - same origin, no token. The row passes
 * channelTrust "low" (title_builder.js v_89, page_creator.js v_120): a YouTube channel is
 * often a broadcaster or re-uploader, so the title builder no longer falls back to its name
 * as artist/entity without backing (in the title, curated, or wiki-known). The loading
 * skeleton shows the Page Creator stand-in box for YouTube players too (tidSkeleton_show).
 *
 * 2026.08.27.20
 * The loading skeleton below the player shows the Page Creator row and the toolkit as two
 * SEPARATE grey boxes instead of the one merged block (page_creator.js v_119, new
 * "pageCreator" row type, and page_creator.css): the row's box only on audiostream detail
 * pages with a SoundCloud player - the only pages funcTidPageCreator builds a row for
 * (tidSkeleton_show reads the wrapper's data-tidplayerurl). Heights tuned against a
 * revealed page (aka-aka-pres-rhythm-prism-radio-053): row box 110px, both boxes 220px
 * total; toolkit-only pages keep the 125px box.
 *
 * 2026.08.27.18
 * Tracklist Importer: "Nothing to add" is treated like "Identical" now (tracklist_importer
 * funcs.js v33, CSS). Both verdicts mean every track of the TID tracklist is on the mix page -
 * "Identical" because the two lists are the same list, "Nothing to add" because the page
 * carries more on top of it - so both tick the "TID tracklist is integrated" checkbox, with the
 * same announced fade to green before the click. The note markup no longer tests a verdict
 * name: the two entries in tlImporter_noMergeVerdicts carry a `ticks` flag and the class is
 * .mdb-tlImporter-note-integrated instead of -identical.
 *
 * 2026.08.27.16
 * Tracklist Importer merge, half-known rows (merge_core.js v12): a page row that knows only
 * ONE half of a track - "ID", "Chris Stussy - ?", "? - Untitled (B1)" - counts as an unknown
 * the same way a bare "?" does. Such a row is matched by its cue time now instead of being
 * passed over and then added a second time, and the candidate fills exactly the half the page
 * is missing: a title the page has stays whatever the player site calls it. Artist and title
 * are compared apart as well, so "Costigane - Camera Tricks" and "Brendan Costigane - Camera
 * Tricks" are one track - the page's shorter spelling wins, the site's stands in the Candidate
 * column. Reported on Chris Stussy's Essential Mix 2024-10-12, where all three shapes ended up
 * on the page twice.
 *
 * 2026.08.27.13
 * Tracklist Importer goes multi-site (tracklist_importer funcs.js v22, merge_core.js v7):
 * 1001 Tracklists carries it now too, so TWO userscripts run on mixesdb.com/w/*. The first
 * instance claims the edit-form side through a marker attribute on <html> and the other
 * stands down - unclaimed, both would apply the merge, click "Show changes" and answer every
 * Apply press twice. Update both scripts together: an old instance without the claim does not
 * know to stand down. From the 1001 wiring, two shared fixes that apply here as well: a
 * chaptered CANDIDATE gets the Chaptered hand-merge link (TID candidates are always flat, so
 * nothing changes on this site), and tlImporter_parse strips ''' bold whole instead of
 * leaving a stray quote behind.
 *
 * 2026.08.27.12
 * The MixesDB modal is a shared feature now (shared/mixesdb_modal/, split out of
 * page_creator.js v_118 - new @require, CSS loads itself): the toolkit's "used" mix page
 * links carry a blue eye icon that frames the page in the same popup the Page Creator's
 * category chips open. Chips and arrow-key walk behave as before; the walk now also steps
 * through the toolkit's links, in page order.
 *
 * 2026.08.27.3
 * Tracklist Importer merge, the tail unknowns (merge_core.js v6, second NTS Japanese Techno
 * report): a gap-less original takes no "?" rows from the candidate - inside the list they
 * only repeat what it already covers. Behind its last row they do not. The candidate's
 * trailing run of "?" rows ([111] ? on a 2:00:17 stream) is the only sign that the stream
 * runs on past the tracklist, so it is appended now, together with the "..." the candidate
 * carries behind it. Unknowns anywhere else in a gap-less list are dropped as before, and one
 * whose cue lands within tolerance of an original track still adds nothing.
 *
 * 2026.08.27.2
 * Tracklist Importer merge, the dur fix (merge_core.js v5, from the NTS Japanese Techno
 * report): "the original's cue format wins" gets one exception. A bare [XX] format only
 * reaches 99 minutes, and a candidate detected beyond that ([106]) WILL be merged in - so
 * when either side knows a cue that does not fit the format's digit count, the format widens
 * (XX -> XXX) BEFORE merging and every cue moves with it, [08] -> [008] and [??] -> [???]
 * included, instead of the merged list mixing both widths. Colon formats are left alone.
 * A widened "??" next to "???" reads as the same unknown, so the review block does not
 * highlight the pure re-formatting as a change.
 *
 * 2026.08.26.27
 * Tracklist Importer, down state, after the mousedown fix (tracklist_importer funcs.js v21,
 * tracklist_editor funcs.js v19): an apply leaves NO focus behind - the press's own focus
 * change is prevented and the active element is blurred once the text is marked known, so
 * the editor's find field no longer ends up focused and the blur cannot start an update.
 * After a down apply the page scrolls up to the wiki textbox, where the result just landed;
 * the Merged column's Apply stays put, a reader salvaging candidate parts must not be
 * yanked away per apply. And the Live updates / API calls chips stay out of the SITE's own
 * feedback box - that box is mixesdb.com's, and the down state already carries the one
 * switch beside its Apply button.
 *
 * 2026.08.26.26
 * Tracklist Importer, down state: the first Apply after one of the editor's own buttons
 * (Cap) finally works with a real mouse (tracklist_importer funcs.js v20). The editor's
 * answer leaves its box focused with text our machinery had not seen, so the press's blur
 * fired the box's own blur update - the white-out and an extra API call - and its DOM work
 * moved the button between mousedown and mouseup, so the browser never fired the click at
 * all: the first press only played the animation, the second one applied. Apply now acts on
 * the press itself, before the blur can run, and marks the text as known - so pressing
 * Apply no longer triggers any blur round trip either: no white-out, no stray API call, the
 * box keeps looking exactly as Cap left it. Keyboard activation still works; one mouse
 * gesture can never apply twice.
 *
 * 2026.08.26.25
 * Tracklist Importer, down state: an Apply clicked while the site's Tracklist Editor was
 * still answering one of its own buttons (Cap, the menu, the dropdown) was refused with
 * nothing applied - and "Cap, then Apply" is one gesture, so the click fell into that
 * round-trip window as often as not and the button read as dead (tracklist_importer
 * funcs.js v19). The click now waits: the button says "One moment", and the moment the
 * editor's answer lands the settled text is applied by itself - one click is enough,
 * however fast it followed the button. A request the site's editor never answers (its
 * error path leaves the waiting mark standing for ever) is given ~8 seconds, then the
 * text is applied as it stands.
 *
 * 2026.08.26.23
 * Tracklist Importer, down state: the Apply button under the site's own Tracklist Editor
 * applies what stands in that editor at the moment it is clicked (tracklist_importer
 * funcs.js v18). It used to sleep or wake by comparing the box against the text last
 * applied, refreshed by a delegated input handler and a half-second poll - and the site's
 * own editor tools fire no input event at all, its menu and dropdown writing their result
 * only when the API answer comes home. So the state was always a little behind the screen,
 * in both directions: the button was still asleep when it was clicked and did nothing, or it
 * was awake from an earlier edit and applied the text that stood there before the tool ran -
 * the unchanged merge. It now sleeps on an empty box and on nothing else, reads the editor
 * fresh at click time, and answers a click made while the Tracklist Editor is still working
 * on one of its own buttons with "One moment" rather than writing the version that is on its
 * way out.
 *
 * 2026.08.26.22
 * The TrackId.net links under the players on mixesdb.com moved here out of the MixesDB
 * Userscripts Helper (script.css v194, MUH 2026.08.26.2): "Exists on TrackId.net" with its
 * integrated marker, or "Submit to TrackId.net" with player URL and page title filled in, on
 * mix pages and on MixesDB:Explorer/Mixes. The link leads OUT to TrackId.net and is this
 * script's subject; the Helper is what teaches MixesDB to accept what the other scripts hand
 * over, and nobody who does not work with TrackId.net has a use for the links. Nothing on
 * screen changes - the script already ran on mixesdb.com/w/* for the edit-form part, and the
 * setting to switch them off (trackIdnet_addLinks) travelled with them.
 * One thing does change: that setting now reaches BOTH halves. It was ANDed with the mix page
 * half of one long condition, and && binding tighter than || left the Explorer half adding
 * links with the setting on 0.
 *
 * 2026.08.26.21
 * Tracklist Importer review block: legend and icons on one line (tracklist_importer funcs.js
 * v17, CSS). The corner toggles straddle the border line again, sharing it with the legend -
 * now <strong>Diff</strong>, the site's own legend markup, so a #fragment targeting the
 * fieldset colours it. The legend clears the widen toggle's corner (margin-left) and is
 * pinned to the toggles' 22px (line-height, no skin padding), so legend and buttons center
 * on the same line; where a fieldset anchors absolute children is not interoperable across
 * engines, so tlImporter_alignToggles() nudges them onto the legend's measured center after
 * the block (and later the down toggle) lands. Block corners rounded .6rem, like the site's
 * own fieldsets.
 *
 * 2026.08.26.20
 * Tracklist Importer review block, layout round (tracklist_importer funcs.js v16, CSS). The
 * block is a FIELDSET now, legend "Diff", reading as one of the edit form's own sections.
 * Down state: block and the site's whole editor section (#editToolsBar-TLeditor) move to
 * directly below the wiki's Save/Preview row (.editButtons), jumping the toolbar rows and
 * the TrackId box between; a hidden marker restores the editor's home spot on the way up,
 * and #editform gets 1em of air above while down (body.mdb-tlImporter-down scopes it). The
 * feedback box's own close button is hidden while down - the chips row owns that corner and
 * the X had fallen under it. The corner toggles moved inside the block (top 10px, on the
 * heading row's line) instead of straddling the border, where they overlapped whatever
 * stood above. Toggling scrolls to the block's new position.
 *
 * 2026.08.26.19
 * Tracklist Importer down state, fixes (tracklist_importer funcs.js v15, CSS). The corner
 * toggles rendered as plain grey buttons with no icon while the block was down: docked, the
 * block sits inside form#editform and mixesdb.com's own "form button" !important rules hit
 * the two <button>s - bold, 1em side padding, borders - which squeezed the flex-item svg to
 * 0px width. Every visual property of the toggles (and the svg's size + flex basis) now
 * carries !important of its own. And the down Apply button only woke on real typing: the
 * editor's own tools set #tlEditor-textarea's value programmatically, which fires no input
 * event - the button is now refreshed by a delegated input handler (survives the module
 * rebuilding its textarea) plus a half-second poll while the row is on the page, so ANY
 * value change wakes or sleeps it.
 *
 * 2026.08.26.18
 * Tracklist Importer review block: new down toggle (tracklist_importer funcs.js v14, CSS).
 * An arrow button in the block's top right corner - the twin of the widen toggle - moves the
 * block down, directly above the site's own full Tracklist Editor section
 * (#editToolsBar-TLeditor): the Merged box's text goes into the real #tlEditor-textarea, the
 * empty Merged column is hidden and Original and Candidate stay side by side above the
 * editor, so final fixes happen in the editor with all its tools. Below its
 * #tlEditor-formActions the block adds the Apply button and the Live updates switch (no
 * tracklist state icons down there - the real ones under the edit box are on the same page).
 * The arrow flips to point up and moves everything back, the text travelling along both ways
 * so toggling never loses an edit. Remembered per browser like the widen toggle.
 *
 * 2026.08.26.8
 * Tracklist Importer review block, round four (tracklist_importer funcs.js v7, CSS). The
 * reported smashed "code>#" in the feedback box: MixesDB's own ext.mixesdb.global treats
 * every <li> under #mw-content-text on ns-0 edit/submit pages as a potential track row,
 * rewrites it with .html().replace(/<br>[^+]/,'') - eating the "<" of the tag behind the
 * <br> - and appends its fa-search magnifier. The block now flattens the API's
 * ul#tlEditor-feedback-topInfo into plain divs (re-applied via MutationObserver on every
 * feedback re-render), so nothing matches "ul li" and the site engine leaves the box alone;
 * the flattened rows also clear the chips with .5rem air and lose the list indent. The
 * Candidate column highlights both readings now: green = taken by the merge, orange = could
 * not be placed (gaps and "?" blanks stay plain). The block head line is gone.
 *
 * 2026.08.26.7
 * Tracklist Importer review block, round three (tracklist_importer funcs.js v6, CSS): Apply
 * now inserts the Merged box's text VERBATIM - the TLE is still asked once, but only for the
 * verdict behind the category and the icons, the text itself is no longer reformatted on the
 * way (and the blur update the click triggers is dropped, so nothing rewrites the box after).
 * The Apply button wears the wiki's own OOUI button classes. The TLE call counter travels
 * with the block through the form POSTs, so the chip no longer claims "0 API calls" next to
 * feedback that was paid for on the edit page. Spacing: no bottom margin under the box
 * wrapper or the feedback box, and the feedback box sits .5rem under the textarea.
 *
 * 2026.08.26.6
 * Tracklist Importer review block polish (tracklist_importer funcs.js v5, CSS): the two pres
 * and the Merged textarea share the height of the tallest list's row count (logical rows,
 * soft wrapping ignored - the textarea via its rows attribute, the pres via a min-height in
 * line-height units), the API's close button is hidden inside the block (the block is the
 * form's own UI, nothing to close), and the feedback verdict list clears the right-floated
 * chips instead of being squeezed next to them.
 *
 * 2026.08.26.5
 * Tracklist Importer: the candidate view below the edit box became a three-column review block
 * ABOVE it, right under MediaWiki's own diff (tracklist_importer funcs.js/merge_core.js v4,
 * toolkit/funcs.js v129). Original shows the page's tracklist with the parts the merge changed
 * highlighted, Candidate shows the found tracklist with the parts the merge took highlighted
 * (flipped from the old "NOT used" reading), and between them Merged holds the applied result
 * in a real Tracklist Editor box - editable, with live updates, the API feedback with its
 * chips and TL state icons (toolkit's mixesdb.com guard now lets them into this one block) -
 * plus an Apply button that runs the box through the TLE once and writes tracklist, category
 * and indicator icons into the edit form in one go. The block survives "Show changes"/"Show
 * preview" like the old view did and is dropped on an empty compare.
 *
 * 2026.08.26.3
 * Tracklist Importer merge fix (merge_core.js v2, from the andhim for Chetana report): the cue
 * helpers now understand three-part HH:MM:SS cues, so a bare-minutes candidate ([014]) is
 * converted to the original's format and inserted tracks are ordered by real seconds instead
 * of parseInt("00:30:35") = 0. A candidate "?" whose cue an original track already covers
 * (within 2 min) is dropped instead of inserted, a filled "?" slot keeps the original's more
 * precise cue, and a slot is only filled when the two cues roughly agree.
 *
 * 2026.08.26.4
 * Tracklist Importer: a candidate that adds nothing to the mix page gets no Merge link any
 * more (reported on "2026-08-22 - Flug - HATE Podcast 501", whose page already held exactly
 * the found tracklist: the link showed up and the edit form opened on "(No difference)").
 * The merge's "changed" flag is read off the merged TEXT now instead of off its write counter
 * - re-writing a "?" row or a label the original already had counted as a change while the
 * text stayed identical - and the link builder runs the merge before offering the link.
 * As a fallback the candidate view below the edit box is dropped when MediaWiki's own compare
 * came back empty, so nothing repeats the edit box when there is nothing to salvage.
 *
 * 2026.08.26.2
 * Thin vertical dividers group the toolkit's action links: [Insert/Merge Report] | [EDIT HIST]
 * | [integrated checkbox]. One divider comes from the Tracklist Importer behind its Report
 * link, the other sits INSIDE #mdbTrackidCheck-wrapper (toolkit/funcs.js v128), so it shows
 * and hides with the checkbox. Both are spaced 8px on each side: the HIST pill's 10px
 * margin-right toward the checkbox is zeroed inside the action links wrapper (global.css), and
 * the wrapper's "display: inline !important" catch-all is overridden for the divider, which
 * needs inline-block to hold its 1px width.
 *
 * 2026.08.26.1
 * New shared feature Tracklist Importer (shared/tracklist_importer/, beta) - the successor of
 * the stalled Tracklist Merger userscript. When the toolkit found the mix page and the
 * tracklist box is filled, the mix page's wikitext is fetched and an "Insert" (page has no
 * tracklist yet) or "Merge" (page has one) link appears in front of the toolkit's EDIT link,
 * with a "Report" link behind it that opens a paste-ready Discord report (original +
 * candidate + raw merge result). The link opens the mix page's edit form with the tracklist
 * inserted/merged, the "Tracklist:" category and the indicator icons updated, Save/Preview
 * locked and "Show changes" clicked for the user; after a merge the candidate is shown below
 * the edit box with everything the merge did NOT use highlighted, surviving "Show changes"/
 * "Show preview". The candidate travels in the URL hash, so its length cannot break the
 * request. Chaptered originals (";Name" rows) are skipped. Merge logic ported from the
 * Tracklist Merger into shared/tracklist_importer/merge_core.js, with a deno example runner.
 *
 * 2026.08.23.13
 * Two ways an uploader separates without typing a separator (title_builder.js v_88).
 * Reported on "SLo Motion @ Hidden Heights ::Sami J + Doog & Rich", channel "SLo Motion":
 *     WRONG: 2026 - SLo Motion @ Hidden Heights ::Sami J + Doog & Rich
 *     RIGHT: 2026 - SLo Motion @ Hidden Heights, Sami J, Doog & Rich
 * The entity category was that whole glued string - a category nobody can ever have - and is
 * Category:Hidden Heights now, with Sami J and Doog & Rich offered next to it.
 *
 * A GLUED separator run splits the title again. The "::" carried no space behind it, and the
 * split every rule below works on wants whitespace on BOTH sides of a separator - so the tail
 * rode along inside the venue name, was looked up as one name and filed the page under it.
 * What makes the exception safe is the DOUBLING: nothing writes two of the SAME separator
 * character in a row inside a name, so "::", "//", "||" and "--" are a boundary wherever they
 * stand, spaces or not. A single glued separator is left alone - that one is a time ("20:00"),
 * a date ("13/03/2025") or a name ("Jay-Z") as often as it is a boundary. The step runs next to
 * the bracket and the dash-wrap rewrites and BEFORE both of them, because the exit those two
 * share already cleaned a doubled run up on its way past: the same title got the fix when it
 * happened to carry a bracket and did not when it did not.
 *
 * And a " + " between two names separates them. The "+" is deliberately NOT a character on the
 * separator class: it is part of a name at least as often as it is a boundary ("B+",
 * "AGF+DELAY", "+/-"), and some of the dozen places reading that class let a separator stand
 * with no space next to it - with the character in there, "B+ live at Fabric" came out as
 * "B @ Fabric". So it needs whitespace on both sides, which is the rule a label bracket has
 * used for its "+" all along.
 * The TITLE gets a "," and the CHUNKS get a boundary - the same split in two answers, the way
 * mdbTitle_splitEventComma already cuts a chunk the suggested title keeps whole. In the title,
 * what a "+" separates are two NAMES and not two parts of the title: written as a separator the
 * halves became two title groups and the assembler flattened them into "Anja Schneider Ellen
 * Allien", while the "," is the joiner MixesDB uses for artists who played one after another
 * and the one a place group already strings its places with - right on either side of an "@",
 * which is where the reported "+" stood. In the chunks the two names have to be two units, or
 * the wiki is asked about "Sami J, Doog & Rich" - a name nobody can be filed under - on top of
 * the two real ones, and the panel shows them as one chip.
 * A "+" between two NUMBERS separates nothing and stays: "Vol. 1 + 2" is one recording, and a
 * "," there files a mix under an artist called "2".
 * 163 examples, all pass.
 *
 * 2026.08.23.11
 * A name is asked in its other spellings once MixesDB denies it (title_builder.js v_86,
 * page_creator.js v_117). Reported on "EG AFTER.189 Paco Wegman", channel "EG": MixesDB files
 * that show as Category:EGAFTER and keeps 110 mixes in it, the title writes the name with a
 * space, and the lookup asked exactly that and was told "no category of this name" - so the page
 * was about to open a second, empty category next to the one holding the whole series.
 *     WRONG: 2026-08-21 - Paco Wegman - EG AFTER.189
 *     RIGHT: 2026-08-21 - Paco Wegman - EGAFTER.189
 * mdbnames matches a name character for character (case aside), while the parser has always held
 * "EG AFTER" and "EGAFTER" to be ONE name - everything it compares runs through
 * mdbTitle_normalizeCompare, which keeps letters and digits and nothing else. So where the first
 * round comes back empty, one more exact request goes out with the other spellings of those
 * names, all of them at once: the glued form, the separators written as spaces and written away
 * ("R.E.M." -> "REM" / "R E M"), and a glued name split where its own case says the words end
 * ("EGAfter" -> "EG After"). Three spellings per name at most, and the glued one only for names
 * of two or three words - "Live At Fabric London" glued is a string nobody ever typed.
 * Nothing is guessed at: every spelling asked IS the same name, so the answer lands under the
 * very key the denied name reads, and the title is respelled to the wiki's version of it. A
 * LONGER name stays the row's business alone (the "Similar:" row), which never touches the
 * builder's cache. Where the second round finds nothing either, the reasoning panel's section 3
 * and the report box's "Lookups" lines say "also asked as ...", so a name asked twice never
 * reads like one given up on.
 * 162 examples, all pass.
 *
 * 2026.08.23.10
 * One artist group carries one joiner (title_builder.js v_85, title_definitions.js v_57).
 * Reported on "Observatory 143 – Sungate [with Lucient & Moy Santana]", channel "OpenLab Radio":
 * the guests behind the "with" were joined onto Sungate with the "," we assume for a "w/", and
 * the "&" the uploader had written between the two of them stayed where it was.
 *     WRONG: 2026-08-21 - Sungate, Lucient & Moy Santana - Observatory 143
 *     RIGHT: 2026-08-21 - Sungate, Lucient, Moy Santana - Observatory 143
 * The two joiners mean different things - MixesDB reserves " & " for artists who played
 * together and "," for one after another - so a group holding both claims to know that Lucient
 * and Moy Santana played together while Sungate played before or after them, which nothing in
 * the title says. The "," is ours and the "&" the uploader's, and where the two meet the one
 * that says nothing wins: every " & " in such a group becomes a ",". An "&" standing alone is
 * untouched ("Tonton & Tata"), and so are "b2b", "vs" and "pres." wherever they stand - those
 * are words about the recording, not a separator we picked. In front of the "@" only: the ","
 * of a place group strings venues and cities, not artists.
 *
 * 2026.08.23.9
 * A similar category is written into the title, and the name MixesDB denied is offered back
 * (page_creator.js v_116). Reported on "Dirtybird Radio 540 - Mitch Dodge", channel "DIRTYBIRD":
 * the exact lookup answered empty about "Dirtybird Radio", the prefix round found
 * "Dirtybird Radio Show" - a show with 9 mixes - and that answer reached the bar's "Similar:"
 * row and nothing else, so the suggestion kept a name MixesDB does not have while the name it
 * has sat on a yellow chip next to it.
 *     WRONG: 2026-08-07 - Mitch Dodge - Dirtybird Radio 540
 *     RIGHT: 2026-08-07 - Mitch Dodge - Dirtybird Radio Show 540
 * Where the round finds exactly ONE such category for the title's ENTITY, it now goes into the
 * suggestion, and the entity's recent pages are read for the episode format right after, as for
 * any other entity - a category that exists is what the page files under and what its number's
 * spelling comes from. The name the title wrote is not thrown away: it becomes the "Switch
 * title" chip, one click back. With two or three answers nothing is written - the row cannot
 * tell which series is meant - and every one of them is offered as a chip instead, which is the
 * floor this never goes under. Artists are left out: a category whose name merely starts like a
 * person's is usually a different person.
 * The title builder is untouched by it - prefix answers still never enter its cache. What
 * changes is a finished title, in the row, and the promoted name then goes through the ordinary
 * exact lookup like any name typed into the field.
 *
 * 2026.08.23.8
 * Via the shared title builder (title_builder.js v_84, title_definitions.js v_56), from a
 * SoundCloud report: a series word left standing alone is dropped with the channel name it
 * belonged to. "Nocturna #038 // Max Hefele [Melodic Deep Series]" on the channel "Melodic Deep"
 * signed its last chunk with the channel name plus the word saying what the channel is. Cutting
 * the channel out of a chunk it signed is right, but what it left behind was a chunk reading
 * "Series", which then glued itself onto the artist.
 *     WRONG: 2026-08-07 - Max Hefele Series - Nocturna 038
 *     RIGHT: 2026-08-07 - Max Hefele - Nocturna 038
 * A word off mdbTitleShowSuffixWords names a show only together with a name, so once that name
 * is gone the chunk goes too. A NUMBER behind the word is the other case and stays.
 * 160 examples, all pass.
 *
 * 2026.08.23.7
 * The channel's URL is asked about where no NAME reaches the series (page_creator.js v_115,
 * title_builder.js v_83). Reported on the SoundCloud channel "EG en Español", which MixesDB has
 * been filing as "Electronic Groove en Español Podcast" for 90 pages: the exact lookup answers
 * empty, the prefix round answers empty - "EG en Español" starts no category - and neither name
 * can be spelled into the other. The wiki holds the connection all the same, as a LINK: the
 * category page carries "https://soundcloud.com/egesp" in its text. So where the name lookups
 * left one of the two slots open, one more request goes out - list=exturlusage over namespace
 * 14, the API behind Special:LinkSearch - asking which category page links this channel, and
 * what comes back is read like a curated channel entry.
 * It hardens the CHANNEL and nothing else, so it is only written where this title backs it: the
 * title writing the category name, the category's own pages numbering their episodes with the
 * id the title carries, that id spelling the category's initials, the channel name and the
 * category name opening each other, or a name the wiki denied opening it. Unbacked, backed
 * equally for two of the channel's categories, or an artist category: reported in the reasoning
 * panel's section 3 and in the report box's new "Channel URL:" lines, and nothing is written.
 *     WRONG: 2019-09-24 - EG en Español - EGE.090 Adonis Rivera
 *     RIGHT: 2019-09-24 - Adonis Rivera - Electronic Groove en Español Podcast (EGE.090)
 * 159 examples, all pass.
 * This script hands no channelUrl over, so the round never fires here - the shared files are
 * only kept in step.
 *
 * 2026.08.23.5
 * A curated channel rule is read with the channel name the SITE gives (title_builder.js v_81,
 * title_definitions.js v_55). Third report on the channel "WHATS POPPIN by AKA AKA", and this
 * one had its own answer on screen: the channel had been given its series entry - on this
 * channel a title carrying "Rhythm Prism" is an episode of "Rhythm Prism Radio" - the lookup
 * had followed it, "Rhythm Prism Radio, podcast, 123 mixes" stood in the panel, and the
 * suggestion still wrote the uncurated "Rhythm Prism 085". Three rules out of it.
 * The curated maps are keyed on the channel name as the site gives it, so they have to be read
 * with that name: a channel crediting its maker is reduced to the maker alone ("WHATS POPPIN by
 * AKA AKA" -> "AKA AKA") long before the series rule runs, and under that name the entry does
 * not exist - while the lookup candidates, which never reduce, had found it. The two disagreed
 * about the very same channel, which is why the answer was in the panel and not in the title.
 * Then the curated show is not cut out of the title where a maker's "by" points at the number
 * counting ITS episodes: cut, "Rhythm Prism Radio by AKA AKA Episode #085" leaves the connector
 * standing as the artist and the number's keyword glued to the real one. Left whole, the credit
 * is read by the "by" rule - which now takes it even on a mapped channel and even where the
 * wiki files the show as a podcast, both fences being there because that rule DROPS the
 * channel, and here it drops nothing.
 * The presenter shape on the same channel needed one more: the channel's own name is no longer
 * cut out of what is left over when a "pres." follows it, since there it is the artist and not
 * the channel signing its own title, and a connector some cut left dangling now comes off the
 * end of a name the way a dangling "by" already did.
 *     WRONG: 2025-10-10 - AKA AKA - Rhythm Prism 085
 *     RIGHT: 2025-10-10 - AKA AKA - Rhythm Prism Radio 085
 * 158 examples, all pass.
 *
 * 2026.08.23.4
 * The "Similar:" row stops asking about a bare NUMBER (page_creator.js v_113). Where the title
 * counts its edition - "Trommel 251" - the number itself sat among the names MixesDB had been
 * told no about, and asking what the wiki has that STARTS with "251" can only bring back other
 * series' episodes. It is left out of that request now, and the panel's section 8 names it with
 * that reason. The report box lists no name that was never asked at all any more - neither this
 * one nor one that fell off the request's ten-name limit: a report is what the wiki was asked and
 * what came back, and a "not asked" bullet in it is a name to wonder about with no answer to it.
 *
 * 2026.08.23.3
 * The report box grew a fifth block, "## Similar lookups" (page_creator.js v_112): under every
 * name MixesDB answered nothing about in "## Lookups", the categories whose names merely START
 * like it - each with its type, its mix count, the same % the panel scores it with, and whether
 * the bar's "Similar:" row showed it or dropped it and why. It is the reasoning panel's section 8
 * written out, and it answers what "no category of this name" alone never could: whether the wiki
 * really has nothing, or has the name spelled longer ("103" -> "103 Club, venue, 2 mixes"), which
 * is usually where an expected title comes from. A name with nothing behind it says so in the
 * panel's words ("no category starts like this name either"). The box now also refills when that
 * looser round answers late, so an open box is never left quoting "looking for similar names …".
 *
 * 2026.08.23.1
 * A name MixesDB knows in the TITLE now beats a channel name nothing backs (title_builder.js
 * v_79, title_definitions.js v_53). From the "112 - unrushed by ena b." report on the channel
 * "u n r u s h": both answers were in hand and both were ignored - "Unrushed" a podcast with
 * 111 mixes, "Ena b." an artist with 2 - while the name that ended up in the title was the
 * channel's, which the wiki has never heard of and the title does not even write. Nothing was
 * wrong with the lookup; what went wrong is which branch took the title. The last of the
 * branches that return a whole title as ONE name reads it as a numbered series naming NOBODY
 * and puts the channel in front of the lot - and "names nobody" is exactly the claim the
 * lookup can disprove. So a new rule stands in front of it: where the title's own "by" has a
 * name MixesDB files as an ARTIST behind it, the title does name somebody, and that name wins.
 * The wiki is the second source the old "by" rule says is missing. That one asks the WORDS -
 * the bit in front of the word has to carry a number or a series word, since "Side by Side"
 * and "Live by the Sea" are names - and "unrushed" carries neither, so the split never
 * happened. An answer about the name behind the word settles it the way the numbered-name and
 * the acronym rules are settled: nothing in the words can decide, only the wiki can. Both
 * halves are asked about by design now, next to the chunk like every other reduction, instead
 * of being reached by accident. The answer settles the spelling too, and where what was made
 * is no known show and nothing numbers it, the mix is the artist's own and the page goes into
 * Category:Promo Mix ("SET BY DJ MARIA." -> "DJ MARIA. - SET (Promo Mix)").
 *     WRONG: 2026-07-13 - u n r u s h - 112 Unrushed By Ena b.
 *     RIGHT: 2026-07-13 - Ena b. - Unrushed 112
 * 156 examples, all pass.
 *
 * 2026.08.22.8
 * The wiki's answer about a place is READ now, and a category's OWN PAGES are what say it is
 * one (title_builder.js v_78). Second half of the HÖR report: with the name found at last,
 * "HÖR - radio, 665 mixes" stood in the panel and changed nothing. The channel's own name
 * stands in that title, so the branch that makes the channel the ARTIST glued everything else
 * into one entity - and an entity is one name, so "4AM Records HÖR" went to the wiki as a whole,
 * could only answer empty, and the page was about to be filed under Category:Promo Mix while
 * Category:HÖR sat there with 665 mix pages.
 * What makes a name a place is its own pages now, not its type: MixesDB files HÖR under
 * Category:Radio and NTS Radio under Category:Radio too, but HÖR's pages are all live sets
 * ("2026-05-09 - Scuba @ HÖR, Berlin") while NTS's are written as the show the set was
 * broadcast on ("2026-04-03 - Ruf Dug - NTS Radio"). The word "radio" cannot tell the two
 * apart, the pages can, and they ride along in the lookup answer already (mdbTitle_placeShape,
 * the same evidence a series' episode-id scheme is read off). Two pages at least and a majority
 * of them, asked LAST - behind the venue and the event rounds, so a name the wiki really types
 * as a place is never decided by its pages - and the type it did answer is what the panel says,
 * never "venue" about a radio.
 * The CITY comes off the same pages wherever the title writes none: "@ HÖR" stands on no
 * MixesDB page, every one of them writes "@ HÖR, Berlin". And the bit the group has no slot for
 * no longer disappears in silence - a set played somewhere is written as who played it, where
 * and in which town, and "4AM Records", the label whose night this was, fits none of the three.
 * It costs 3 points and comes back as a "Switch title" chip that writes it in front of the
 * place, the way MixesDB writes a party held at a venue ("@ 15 Years aufnahme + wiedergabe,
 * HÖR, Berlin").
 * Found on the way: "HÖR" read as a COUNTRY. mdbTitle_normalizeCompare keeps letters and digits
 * alone, so the "ö" was dropped rather than folded and the name compared as "hr" - which is
 * Croatia's code on mdbTitleCountries. Every place group threw the name out, and the wiki's own
 * "2026-05-09 - Scuba @ HÖR, Berlin" read back as a title filed under nothing at all. An
 * accented letter folds to its base letter now ("ö" -> "o"), which is also how that mix's own
 * description writes the station ("Played some records at HOR").
 *     WRONG: 2026-08-05 - Milan Hermess - 4AM Records HÖR (Promo Mix)
 *     RIGHT: 2026-08-05 - Milan Hermess @ HÖR, Berlin
 * 155 examples, all pass.
 *
 * 2026.08.22.7
 * A name the site writes DECOMPOSED is one name again (title_builder.js v_77). From the
 * "4AM Records - Milan Hermess | HÖR" report: "HÖR" was asked about as "Hör" and came back
 * as "no category of this name", while Category:HÖR holds 665 mixes. SoundCloud does not write
 * the "Ö" as the single character MediaWiki stores it as - it writes an "O" with a combining
 * diaeresis behind it, which looks exactly the same and is a different string. Decomposed, the
 * name counts four characters instead of three, so the rule that keeps a SHORT shouted name in
 * caps ("KCE", "HÖR") no longer knew it for one and re-cased it into a "Hör" nobody is filed
 * under; the compare key kept the bare "o" of the pair where the composed spelling drops the
 * "ö" whole, so one name had two cache keys; and api.php, which normalizes what it is asked,
 * answered "non-normalized data" and echoed the name COMPOSED - so its answer was filed under a
 * key the asker never looks up. The composed form is put on every bit of outside text now,
 * before a rule reads a character of it (mdbTitle_nfc: the player title, the channel name, the
 * description, the edited title field and every name that goes to the wiki), which is the form
 * MediaWiki stores every title in.
 * The lookup was never case-sensitive, and nothing about it changed here: MixesDB is the
 * case-sensitive half ($wgCapitalLinks = false), which is exactly why the API was asked for a
 * case-INsensitive answer - "hör", "Hör" and "HÖR" all find Category:HÖR, as long as they are
 * asked in the spelling the wiki stores.
 * The reported title is unchanged by this: "HÖR" is a known radio with 665 mixes in the panel
 * and in the report box now, while the entity slot still holds the two chunks glued together
 * ("4AM Records HÖR"). 155 examples, all pass.
 *
 * 2026.08.22.6
 * A place group ends at its city, and anything an uploader hangs behind it comes off the title
 * (title_definitions.js v_52, title_builder.js v_76, page_creator.js v_111). From the
 * "Blake Strange @ Sisyphos, Berlin [Dampfer]" report: the bracket became a chunk of its own,
 * the "@" fold joined it into the place group with a comma, and the suggestion offered
 * "@ Sisyphos, Berlin, Dampfer" - a place standing behind its own town, which MixesDB never
 * writes. A group is written from the specific outwards and CLOSES with the city, so a part
 * behind it is no place at all: it is the floor, the stage or the night the uploader played on,
 * and the pages the wiki has of such a venue do not carry it. A country is the one exception,
 * being wider than the town ("@ Watergate, Berlin, Germany"), and a group that OPENS with a
 * city is left alone - that is an uploader writing it backwards, not a tail.
 * The words are not lost: a new "Switch title" chip writes them back in FRONT of the place,
 * where MixesDB does write a party held at a venue ("@ Utopia, Ritter Butzke, Berlin"), so
 * "@ Dampfer, Sisyphos, Berlin" is one click away and the page files under Sisyphos either way.
 * The cut costs 3 points and says which words left and where they would go, since only the
 * uploader knows whether the floor is worth naming.
 *     WRONG: 2026-08-01 - Blake Strange @ Sisyphos, Berlin, Dampfer
 *     RIGHT: 2026-08-01 - Blake Strange @ Sisyphos, Berlin
 *
 * 2026.08.22.5
 * A title that already carries an "@" is a set played SOMEWHERE, and the branch that reads the
 * channel name out of a title now leaves it alone (title_builder.js v_75). From the "Anton &
 * Hogi Wirjono All Night Long DJ Set at ZODIAC" report on the channel "hogi": MixesDB answered
 * "Zodiac" as a venue with 4 mixes, and the suggestion ignored it. The channel's own name stood
 * inside the title ("hogi" in "Hogi Wirjono"), which sent the title into the branch that makes
 * the channel the artist and everything else the ENTITY - and an entity is one name, so the
 * whole place group went in as one and nothing ever read the venue answer. The page was about
 * to be filed under a brand-new "Anton & Wirjono All Night Long @ ZODIAC".
 * "All Night Long" is a live marker now, and markers STACK (title_definitions.js v_51,
 * title_builder.js v_75). The same title wrote two of them in a row ("All Night Long DJ Set
 * at"), and only the one touching the connector was ever consumed - so the other stayed glued
 * to the artist and went into the category lookup with it: "Hogi Wirjono All Night Long" was
 * asked about, "Hogi Wirjono" never was.
 * And the answer to that question is now read: the channel name is not cut out of a LONGER name
 * MixesDB knows as an artist (title_builder.js v_75). Category:Hogi Wirjono holds mixes, so the
 * "hogi" standing inside it belongs to that name - cutting it out invented an "Anton & Wirjono"
 * who never played anywhere. Only the wiki's answer keeps the word: with no category of the
 * longer name the cut stands, which is what a channel writing its name in front of a guest
 * needs. A name strung with an "&" is asked about both ways for this, the parts and the whole.
 *     WRONG: 2026 - hogi - Anton & Wirjono All Night Long @ ZODIAC
 *     RIGHT: 2026 - Anton & Hogi Wirjono @ Zodiac
 *
 * 2026.08.22.4
 * The "Report" box is Markdown now, in four headed blocks (page_creator.js v_110): "## Created"
 * with the values the site handed over and what the suggestion made of them, "## Lookups",
 * "## Mistakes / learnings" with two empty bullets, and "## Expected" for the answers only the
 * reporter has. Pasted on Discord the headings render as headings, and a case file can quote
 * one block at a time instead of a run of arrow lines.
 * "## Lookups" is new material, not a re-wording: it lists every name MixesDB was asked about
 * under "Artists:" and "Entities:" - the two columns of the reasoning panel's section 3, now
 * sorted by one shared function - each in quotes, with what came back ("AKA AKA" -> artist, 230
 * mixes, 95%) or with "no category of this name". That is the half of a case nobody can reconstruct
 * afterwards: the categories say what the page was filed under, these lines say what the wiki
 * knew at the time, which is what tells "the wiki had nothing" from "the wiki had it and the
 * parse picked the other name" apart. The box now also refills when a lookup answers late,
 * so an open box is never left quoting "looking it up …".
 *
 * 2026.08.21.6
 * The Toggle between the filtered and the unfiltered tracklist now flips the feedback with the
 * text - the same wrong pairing .5 fixed came back with one click on it: the box kept saying
 * "valid and complete" while the "?" rows it was complete WITHOUT were back on screen. Both
 * verdicts are already asked for when the box is built, so they are stashed on it and swapped,
 * which costs no further API call. The notice with the Toggle is put back after the swap - it
 * lives inside the feedback box, and rendering another verdict rebuilds that box's content.
 * The cue format switch needs none of this: the API keeps whichever cue format it is given and
 * answers [059] and [0:59] identically, rows and status included.
 *
 * 2026.08.21.5
 * The Tracklist Editor feedback under the box now answers the tracklist that is IN the box.
 * The likely-false "?" tracks are taken out after the first API answer and the shortened
 * tracklist is sent a second time, but the PRINTED answer was still the first one - the one
 * about the version that still had those rows. A tracklist that is incomplete only because of
 * them is valid and complete once they are gone, so the box stayed orange ("valid and
 * incomplete: # [??] ?") with the row count of the longer version, under a tracklist without a
 * single "?" left in it. https://trackid.net/audiostreams/aka-aka-pres-rhythm-prism-radio-053
 * The notice about the removed rows and its Toggle now create the feedback's top info list
 * when that fresh answer has none - a complete answer comes as a bare message without one -
 * which is also the list the cue format switch and the Tracklist Merger link wait for.
 * (tracklist_editor/funcs.js v_13)
 *
 * 2026.08.21.4
 * Via the shared title builder (title_definitions.js v_48, title_builder.js v_72,
 * page_creator.js v_106), from a SoundCloud report: a credit behind an artist's name now comes
 * off the title, and the lookup asks about the act on its own. "KODE9 FOR MAHARISHI" was one
 * candidate and a name MixesDB will never have, while Category:Kode9 and its 94 mixes were
 * never asked about at all. "for" now ends the act's name, the name in front of it is asked
 * next to the whole, the shortened forms of a long artist name ride along as the last
 * questions of the request, and the credit comes off only where the wiki answers nothing about
 * the written name AND knows the act as an artist. The dropped words come back as a "Switch
 * title" chip - a name can be built around the word ("Dance For Life") - and that chip moves
 * the page's artist category with it, since the category is read off the title.
 *
 * 2026.08.21.3
 * Via the shared title builder (title_builder.js v_71), from a SoundCloud report: an episode
 * number the uploader wrote into the NEXT bit of the title now goes to the show instead of
 * staying with the artist. "Playhaus: 001 Guliver" became "001 Guliver - Playhaus Podcast" -
 * cutting the show name out of the title leaves the colon that separated the two bits
 * standing in front of the number, and the rule that reads a number sitting right behind the
 * show name ("HATE Podcast 496 Fadi Mohem") started at the first character. It steps over
 * that separator now.
 *
 * 2026.08.20.28
 * The reasoning panel's section 8, "Similar categories on MixesDB", now wears the blue of 1
 * and 3 instead of the "Similar:" row's yellow (page_creator.css / cacheVersion 170): it is a
 * lookup round like those two, and the yellow is the CHIPS' state colour on the bar, which the
 * panel never uses to group sections.
 *
 * 2026.08.20.27
 * The reasoning panel grew section 8, "Similar categories on MixesDB" (page_creator.js v_104,
 * page_creator.css / cacheVersion 169): every answer of the prefix round behind the bar's
 * "Similar:" row, the dropped ones included - each with the category, its type, its mix count,
 * the same per-answer % as section 3, and the row's verdict (shown, or not shown with the
 * reason: the per-name cap, too few mixes, already a chip on the bar, already shown behind an
 * earlier name). Row and section render off ONE decision walk, so they cannot disagree. The
 * prefix request's "API call" link moved from section 3 into the new section - nothing in 3
 * reads its answers.
 *
 * 2026.08.20.26
 * The "Similar:" chips flow inline and wrap instead of stacking one per line
 * (page_creator.css / cacheVersion 168) - the short "(artist, 21 mixes)" notes never needed
 * the "Hints:" row column they had borrowed.
 *
 * 2026.08.20.25
 * The Page Creator's title builder and hints bar learned four rules from a SoundCloud report
 * ("UFO95 LIVE @ DOMMUNE"). (1) A NAME is never read as an episode id (title_builder.js
 * v_68): the artist's own "UFO95" was consumed as a glued id, which made the venue the
 * artist and filed the page under [[Category:Dommune]] as its ARTIST. An id-shaped token
 * touching an "@" is a name, and so is one MixesDB knows as a category of any type. (2) The
 * wiki's role answers are never used and argued against in one breath: slots holding a
 * venue/event where the artist belongs (or a place standing as the show) are put the wiki's
 * way round at the exit, into the live "<artist> @ <place>" form (mdbTitle_result). (3) A
 * category chip whose name EXISTS under another type is never RED any more (page_creator.js
 * v_103, page_creator.css): red is a wiki's "no such page". Such a chip is yellow like
 * "Similar:", links the category itself and says what is really in doubt - the title's
 * roles. (4) The panel's % no longer docks a name for holding FEW mixes: 7 mixes back a name
 * exactly as 298 do, and the count never spoke to the artist/entity decision. And a COUNTRY
 * never files as an artist or entity and never becomes a chip - no category line is written
 * off one unless the wiki itself answers for the name. 145 examples, all pass.
 *
 * 2026.08.20.24
 * A title that writes an "@" in front of a "#"-numbered EPISODE is read as the SERIES now, with
 * the live reading offered next to it (title_builder.js v_67, title_definitions.js v_44,
 * page_creator.js v_102, from a SoundCloud report on "Colossio @ Melodic Therapy #217 -
 * Mexico"): such a title says two things that cannot both be written, and read as a live
 * recording it came out as "2026 - Mexico - Colossio @ Melodic Therapy 217" - the country in the
 * ARTIST slot with the artist standing right there in front of the "@". The series wins, since a
 * show counts its episodes and a place does not; the date stays a gig's (the year alone) and the
 * live reading is a "Switch title" chip, country and all ("2026 - Colossio @ Melodic Therapy
 * 217, Mexico"), filed under the same name either way. Only the "#" spelling does this
 * ("@ Club 69" keeps its joiner), and an event keeps its "@" however it numbers its editions.
 * The same report's other half: a LONE country is left out of the written title wherever it
 * would be a group too many - behind an artist AND an entity it is where the artist is from -
 * and it is no chunk and no lookup candidate there either. Only written in full and only with
 * two chunks left standing: "Some Podcast 12 - Georgia" still files under Georgia.
 * 144 examples, all pass.
 *
 * 2026.08.20.23
 * The "Similar:" row now asks about the names the TITLE writes too, not only about the bar's
 * red chips (page_creator.js v_101, from a SoundCloud report): a mix built as a promo has the
 * year, the artist and "Promo Mix" on its bar and nothing else, so the mix's own name stands in
 * no category slot and a name the exact lookup denied inside it was asked by nobody - the
 * reported case being "NTS", with MixesDB's "NTS Radio" starting exactly like it. Those names
 * come off the lookup log now: only ones really asked and really denied, only while the title
 * still writes them word for word, and never one that opens a name already on the bar (which is
 * what keeps a fully-green row from firing a request it never fired before). Still hints only -
 * the suggestion does not change.
 *
 * 2026.08.20.22
 * A chunk whose names a joiner strings together is read as the line-up it is (title_builder.js
 * v_66, from a SoundCloud report): "Asa 808 b2b Third Guy" scored as a series on the digits of
 * a NAME, so neither artist was asked, and a title ending in such a list was number-stripped
 * to "Third Guy b2b Asa" on top. A b2b/&/vs/comma list is artists whatever digits stand in it
 * (only a series word still overrules it), the number stays where it was written since it
 * belongs to the last name in the list, and each member is asked exactly as written. Follows
 * the .20 round, which found the same reading on single names. No suggested title changes:
 * all 141 examples pass unchanged.
 *
 * 2026.08.20.21
 * A red category chip now gets a prefix round (page_creator.js v_100, page_creator.css /
 * cacheVersion 166): the names the exact lookup answered empty about are asked once more with
 * mdbnames' match=prefix, one request for all of them, and what MixesDB has that starts like
 * them renders as a "Similar:" row of yellow chips directly under "Used categories" - a look
 * to take, not a verdict: no fit score, at most 3 per red name, thin categories dropped. The
 * answers stay in their own cache; the title builder stays on exact match and the suggestion
 * does not change.
 *
 * 2026.08.20.20
 * A name ending in a number is asked about both ways now (title_builder.js v_65,
 * page_creator.js v_99, from a SoundCloud report): the lookup took the trailing number off
 * every name, the way a series stands in a title ("HATE Podcast 498" is filed under "HATE
 * Podcast"), but "Route 8" and "Asa 808" are artists and "Studio 80" and "Bar 25" venues whose
 * category carries the digits - and the reduced form does not answer empty there, it answers
 * wrong ("Studio" is four other clubs). Both readings are asked now, the reduced one first,
 * and the numbered one only where the title has not said the number counts editions (a
 * counting word, a "#", the "." of a series edition, a series word in the name or a year all
 * keep it out). Where the wiki knows the numbered name, the created page keeps the number in
 * its category. Same report: "w/" and "with" end a chunk now, so the guest behind them is a
 * candidate of their own instead of being looked up glued to the name in front.
 * No suggested title changes: all 140 examples pass unchanged.
 *
 * 2026.08.20.19
 * The acronym expansion is decided by the category's own page titles now, with the channel's
 * initials demoted to the fallback (title_builder.js v_64, page_creator.js v_98): a category
 * whose pages are titled "... - Deep Space Series (DSS 012)" is the wiki saying that "DSS" is
 * that series' episode id, which the letters merely resembling the channel name never was. The
 * titles come out of the `recent` list the category lookup already carries, so nothing is asked
 * twice. With it, the recent-pages age gate steps aside where the pages prove the category is
 * this mix's - their titles carrying the same episode id, or (on a site that hands a channelUrl
 * over, which this one does not) their wikitext linking the mix's channel.
 *
 * 2026.08.20.18
 * The acronym step of reasoning section 4 names what DECIDED, not what merely matched
 * (title_builder.js v_63): the initials only make the channel worth asking about, so the step
 * is "Series acronym expanded to the channel's name" now and its detail names the wiki's two
 * answers next to them. Display only, no title changes.
 *
 * 2026.08.20.17
 * An entity written as a bare acronym plus a number, where the letters spell the channel
 * name's initials in caps, is the channel's series abbreviating itself (title_builder.js
 * v_62, page_creator.js v_97, from a SoundCloud report): where MixesDB knows the channel
 * name as a podcast/show while it has no series category of the letters alone, the
 * suggestion writes the full name with the title's own id in brackets
 * ("... - Deep Space Series (DSS 140)") and the page files under the channel's category.
 * The channel-link hardening that came with it (comparing the uploader's channel URL to the
 * URLs in the entity category's sibling pages) stays off here on purpose: this script hands
 * no channelUrl over - a trackid.net page's uploader is not the mix's channel.
 *
 * 2026.08.20.15
 * A live title whose place group names an event AND a venue now files the created page under
 * both (title_builder.js v_61, page_creator.js v_96), wherever MixesDB has a category of each:
 * "2026-06-13 - Lord Of The Isles @ Far Blue, Noordspace" carries [[Category:Far Blue]] and
 * [[Category:Noordspace]], the way MixesDB's own pages carry the party next to the club. The
 * name the title is filed under is written whether or not the wiki has it yet - a new venue's
 * category is created with the page - while every further name of the group has to be a
 * category that really exists under that exact name, which is what keeps the city out of the
 * categories while it stays in the title. The "Used categories" row, the reasoning panel's
 * section 6 and the report box (one "Entity category:" line per filing) say the same thing.
 *
 * 2026.08.20.14
 * A vote every page agrees with is reported as "all 10 newest pages" instead of "10 of the 10
 * newest pages" (page_creator.js v_95), and in a category smaller than the ten asked for the
 * word "newest" is dropped altogether: "all 4 pages", "3 of the 4 pages", "the only page" -
 * nothing was left behind there, so nothing should sound like it was.
 *
 * 2026.08.20.13
 * Two wording fixes in reasoning section 7 (page_creator.js v_94). "Read: the 4 newest pages of
 * X" reads as if six pages had been skipped, when the category simply holds four - the line now
 * says "all 4 pages of X" wherever the fetched pages ARE the whole category (the API says so by
 * offering no continuation), and keeps "the 10 newest pages of X" where there are more. Nothing
 * was ever dropped: 30 categories were checked against the live API, and every short answer was
 * a short category. The Player row's outcome is called "{Player} with single URL stays"
 * instead of "the plain {Player} stays".
 *
 * 2026.08.20.12
 * The reasoning panel's category links all read as the bare name now (page_creator.js v_93):
 * sections 5 and 7 opened with "Read: the 10 newest pages of Category:Amplify Series" while
 * every other category link in the panel says "Amplify Series". The "Category:" prefix stays
 * where it belongs - in the [[Category:...]] lines section 6 prints, which are the wikitext the
 * page really gets.
 *
 * 2026.08.20.11
 * Reasoning section 7 labels its style rows "Shared styles" throughout - the hint case and the
 * nothing-agreed case still read "Shared category"/"Shared categories" - and phrases every row's
 * consequence behind the coloured " -> " arrow
 * (page_creator.js v_91) - the no-agreement and kept-as-is rows used a plain dash, so what was
 * observed and what it did to the page were not told apart the way the other rows do it.
 *
 * 2026.08.20.9
 * Three style refinements in the Page Creator (page_creator.js v_90). The empty style rows now
 * follow what the siblings show: one spare row behind the written style only where some of the
 * entity's pages carry a further style (Tech House on 1 of Amplify Series' 10 - this mix may be
 * such a page too), none where they use nothing else, and the plain two where no style was
 * written. All 111 members of Category:Style are baked in, so classifying a shared category
 * usually costs no request - only a name missing from that list (a style added to the wiki
 * later) still asks the API. And reasoning section 7 labels a written style "Shared styles",
 * drops the Category:Style plumbing from the row, and adds an "Other styles" line saying why an
 * empty row was (not) left.
 *
 * 2026.08.20.8
 * The style rows of a created page carry ONE blank line behind a style that was learned off the
 * entity's recent pages, not two (page_creator.js v_89). The blank rows are a spare to type a
 * further style into, not a shape to be filled: where a style was written, one of them is enough
 * and a line too many is deleted faster than a missing one is added. A page where nothing was
 * learned keeps the two blank rows it has always had.
 *
 * 2026.08.20.7
 * A style at least 90% of the entity's recent MixesDB pages carry is written onto the created
 * page again (page_creator.js v_88). Reported on
 * soundcloud.com/dirtyepicla/amplify-series-138-reka-zalan: Category:Amplify Series carries
 * [[Category:Techno]] on 10 of its 10 newest pages, reasoning section 7 said exactly that, and
 * the page still came out with two blank style rows to be filled in by hand. The vote stopped
 * writing on 2026-08-19 because it cannot tell a style from a coincidence: "Amsterdam Dance
 * Event" stands on all 10 pages of Category:Undercurrent, whose MixesDB pages happen to be
 * festival sets, and filing an unrelated podcast episode there is a wrong filing made for the
 * editor.
 *
 * It is no longer guessed - MixesDB is asked. Its style categories are the ones filed under
 * Category:Style, so one prop=categories request classifies whatever the vote produced (Techno,
 * Deep House, Drum & Bass come back carrying it; Amsterdam Dance Event carries Category:Event),
 * and only a confirmed style takes a style line. Every other winner stays the "Hints:" chip it
 * has been, and so does a name whose answer is still on its way: nothing is filed on a name
 * nobody confirmed. A written style joins the "Used categories" row as a plain grey chip like
 * "Promo Mix", its tooltip naming the pages it was learned off, reasoning section 6 says the same
 * next to the category line, and section 7 names the verdict per shared category and offers that request as
 * its own "API call" link. Answers are cached per name for the session, so the second series
 * voting for Techno costs no request at all. A site's own style suggestions box (TrackId.net) is
 * untouched and still wins - those styles are read off the mix itself.
 *
 * 2026.08.20.5
 * Via the shared Page Creator (page_creator.js v_86, title_builder.js v_60, page_creator.css):
 * sections 3, 5 and 7 of the reasoning panel each close with an "API call" link - the exact
 * api.php URL that section's answers came out of, opening the raw answer in a new tab. Section
 * 3 carries the one lookup request plus every per-chip page fetch the hints bar fired off its
 * answers; 5 and 7 share the single recent-pages request, which brings their titles and their
 * wikitext in one go. Built off the Amplify Series report: the hints bar reads "1 mix" where
 * Category:Amplify Series holds 29 mix pages, because MixesDB's own category counter has
 * drifted there, and writing that up for the wiki's maintainer meant rebuilding the request by
 * hand. Every link is built off the SAME data object its request is sent with, so it opens
 * what was really asked rather than an approximation of it.
 *
 * 2026.08.20.2
 * Via the shared Page Creator (page_creator.css): the box under an open hints bar chip hangs
 * 5px lower, and chip and box are one line all the way round - the chip's left border runs
 * straight down into the box's, and on the right the two are joined by an arc: the chip's
 * border turns into the box's top border in a quarter circle instead of a square step. The box
 * is held wide enough for that corner to have somewhere to land, so even the "no mix pages in
 * this category yet" one keeps the shape.
 *
 * 2026.08.19.49
 * Via the shared Page Creator (page_creator.css; page_creator.js v_85 only retells it in the
 * comments): the mix pages a hints bar chip folds out hang in a box attached UNDER the chip
 * now. Chip and box are two connected parts - the chip keeps its pill, its width and its
 * height to the pixel, so the chips behind it stand still for the first time in three cuts at
 * this layout, and the box - aligned to the chip's left edge, never narrower than it, sharing
 * one border line where they meet - takes no room in the bar: it lies over whatever follows
 * until it is folded shut.
 *
 * 2026.08.19.48
 * Via the shared Page Creator (page_creator.js v_84): the hints bar folds ONE chip's mix pages
 * out at a time - opening a chip closes the one that stood open before it. Two open lists left
 * the chips around them hanging in mid-air beside a tall list - "2026" next to one,
 * "Tracklist: none" next to the next - because a folded-out list is as wide as its longest mix
 * title and as tall as ten of them, while the chips beside it are pills. One at a time keeps
 * "Used categories" a line that can be read as one.
 *
 * 2026.08.19.36
 * Via the shared Page Creator (page_creator.js v_73): the {{Player}} of the created page takes
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
 * Via the shared Page Creator (page_creator.js v_70): the lead artwork line is back on a series
 * whose recent pages hold a live recording. Such a page opens with the EVENT's flyer, named
 * after the event - the artwork belongs to whatever the page records - so it cannot say what an
 * episode page starts with, and it no longer votes on it. Reported on SoundCloud's "GROOVE
 * Podcast 514": two of Category:Groove Podcast's 10 newest pages are sets played at an event,
 * 8 of 10 is not the 90% the vote wants, and the series lost the artwork line every one of its
 * episodes carries. A venue's or an event's own category, where every page is such a recording,
 * decides as before, and reasoning section 7 says how many pages were left out.
 *
 * Via the shared Page Creator (page_creator.js v_70): a hints bar chip's fit score stays behind
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
 * Via the shared Page Creator (page_creator.js v_68, page_creator.css): every looked-up chip in
 * the hints bar's "Used categories" carries a fit score - how sure the row is that this is the
 * right category for THIS page, with the reasons in its tooltip. Not the reasoning panel's
 * section 3 percentage, which answers whether the wiki's answer is about the right NAME.
 *
 * 2026.08.19.24
 * Via the shared Page Creator (page_creator.js v_67): a category's pages are only read where
 * they can say anything about THIS mix - not when the title numbers its entity while MixesDB
 * knows that name as a venue or an event, and not when the category's newest page is more than
 * three years older than the mix.
 *
 * Via the shared Page Creator (page_creator.js v_67, page_creator.css): a category the
 * entity's recent sibling pages share is no longer written onto the created page as a style.
 * The vote answers what those pages have in COMMON - a venue whose MixesDB pages are all
 * festival sets votes for the festival - so it is shown as a new "Hints:" row in the bar under
 * "Used categories" (each chip with a note saying which pages it came off) and at the end of
 * reasoning section 6, while the page's two style rows stay empty for the editor.
 *
 * 2026.08.19.23
 * Via the shared Page Creator (page_creator.js v_66, page_creator.css): the grey
 * "Category:Promo Mix" note under the "Create" link is gone. The hints bar's "Used categories"
 * already names every category the created page is filed under, "Promo Mix" among them, so the
 * note repeated it. What only it used to say - that the title leaves "(Promo Mix)" off because
 * its own name already says it - now sits in the tooltip of the "Promo Mix" chip.
 *
 * 2026.08.19.20
 * Via the shared Page Creator (title_builder.js v_51, title_definitions.js v_35,
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
 * Via the shared Page Creator (page_creator.js v_62, page_creator.css): the hints bar's "Used
 * categories" line now names EVERY category the created page is filed under - the year, the
 * styles, "Promo Mix" and the "Tracklist:" filing ride along as plain grey chips, no link and
 * no mix count, since none of them is a name the wiki could spell differently. Reported for
 * "Promo Mix", which the page text writes while the line stayed silent about it.
 *
 * 2026.08.19.18
 * Via the shared Page Creator (page_creator.js v_61, title_builder.js v_51,
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
 * The Page Creator's hints bar offers the readings the build decided against as
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
 * Second round of the same report, via the shared Page Creator (title_definitions.js v_28,
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
 * ONE skeleton for Page Creator row + toolkit, and the CSS owns the height. The row was
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
 * 120px) where toolkit and Page Creator row appear.
 *
 * 2026.08.16.4
 * Audiostream pages get the loading skeleton the SoundCloud script introduced, now shared
 * as mdbSkeleton_* in shared/page_creator/: player embed, toolkit and (for SoundCloud
 * players) the Page Creator row build up hidden behind a dark grey box with pulsing
 * stand-ins (player block + toolkit lines) and appear in one step once the toolkit verdict
 * is in and the DOM has settled - or after a 6s cap. For that the player wrapper now sits
 * inside a new #mdb-tid-audiostreamExtras container, which also catches the toolkit
 * (getToolkit's "after" placement lands inside it, right behind the player); selectors on
 * .mdb-player-audiostream and the Page Creator target are unchanged. hearthis players
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
 * The MixesDB Page Creator (shared/page_creator/) now runs on audiostream pages with a
 * SoundCloud player: the suggested-title row with the "Create" link sits between the embedded
 * player and the toolkit, fed from the SC track API (title, username, dates, duration, artwork
 * "-original" URL) via the same access token the toolkit already uses - the TID page itself
 * only knows a normalized heading and a locale-formatted date. No description-tracklist
 * detection here: the new tracklistBox option of mdbPageCreator_add() points the Page Creator
 * at TID's own #tlEditor box, so whatever the identified tracks say at the moment "Create" is
 * clicked goes onto the new page, and the Tracklist Editor's verdict about that text files the
 * "Tracklist:" category. Other players (Mixcloud, YouTube, hearthis.at) do not get the row yet.
 */
