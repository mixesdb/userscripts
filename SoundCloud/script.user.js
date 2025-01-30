// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.30.4
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_18
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-SoundCloud_34
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_16
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v_2
// @include      http*soundcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
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

var dev = 1,
    cacheVersion = 20,
    scriptName = "SoundCloud",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var scAccessToken;

const fast = 200,
      soundActionFakeButtonClass = 'sc_button-mdb sc-button-secondary sc-button sc-button-medium mdb-item',
      current_url = location.href;

// url parameters
var getHidePl = getURLParameter("hidePl") == "true" ? "true" : "false",
    getHideReposts = getURLParameter("hideReposts") == "true" ? "true" : "false",
    getHideFav = getURLParameter("hideFav") == "true" ? "true" : "false",
    getHideUsed = getURLParameter("hideUsed") == "true" ? "true" : "false";

logVar( "getHidePl", getHidePl );
logVar( "getHideReposts", getHideReposts );
logVar( "getHideFav", getHideFav );
logVar( "getHideUsed", getHideUsed );


/*
 * Before anythings starts: Reload the page
 * A tiny delay is needed, otherwise there's constant reloading.
 */
redirectOnUrlChange( 20 );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".listenArtworkWrapper", function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        //log( location.href );

        // Artwork link tzo original
        var artworkWrapper = $(".listenArtworkWrapper"),
            artwork_url = $(".sc-artwork", artworkWrapper).html().replace(/.+&quot;(htt.+(?:jpg|png)).+/, "$1");
        log( artworkWrapper.html() );
        logVar( "artwork_url", artwork_url );
        if( typeof artwork_url  !== "undefined" ) {
            append_artwork( artwork_url );
        }
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Favorite button
 *
 * TODO:
 * Enable in playlists https://soundcloud.com/resident-advisor
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".soundList__item .sc-button-like:not(.mdb-processed-favorited)", function( jNode ) {
    // is favorited
    if( jNode.hasClass("sc-button-selected") ) {
        var title = jNode.closest(".soundList__item").find(".soundTitle__title");
        log( "Favorite found: " + title.text() );

        // Highlight player title if favorited
        title.addClass("mdb-darkorange");

        // Hiding option: remove faved player
        removeFavedPlayer_ifOptedIn( jNode );
    }

    // mark as processed
    jNode.addClass("mdb-processed-favorited");
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Links in playlist sets
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// player links and link buttons
// https://soundcloud.com/resident-advisor/sets/ra-podcast
waitForKeyElements(".listenDetails__trackList li a.trackItem__trackTitle", playlistSetsCaseOne );
waitForKeyElements(".systemPlaylistTrackList__list li a.trackItem__trackTitle", playlistSetsCaseOne );
function playlistSetsCaseOne( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr("href") );

    jNode.attr( "href", playerUrlFixed )
         .attr( "target", "_blank" )
         .attr( "title", playerUrlFixed+" (opens in a new tab)" );
}

// Compact playlists
// https://soundcloud.com/resident-advisor
waitForKeyElements(".compactTrackList__listWrapper li.compactTrackList__item span.compactTrackListItem__trackTitle", function( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr( "data-permalink-path") );

    jNode.after( '<a href="'+playerUrlFixed+'" title="'+playerUrlFixed+' (opens in a new tab)" target="_blank" class="mdb-element mdb-copyLink sc-link-dark sc-link-primary sc-font-light">Link</a>' );
});

// .copyLink on click open new tab
waitForKeyElements(".mdb-copyLink", function( jNode ) {
    jNode.click(function(){
        var url = $(this).attr("href");
        window.open( url, "_blank" );
    });
});

// button to copy link (no href)
// hide it (would copy url with in parameter)
waitForKeyElements(".listenDetails__trackList li a.trackItem__trackTitle", function( jNode ) {
    jNode.hide();
});
waitForKeyElements(".listenDetails__trackList li button.sc-button-copylink", function( jNode ) {
    jNode.remove(); // hide() would make it flash on playlist pages
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Favorited buttons
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// if favorited before, show hidden soundActions
waitForKeyElements(".listenDetails li .trackItem__actions:not(:visible)", function( jNode ) {
    jNode.css('margin-left','.5rem').show();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * [X] remove button
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// if favorited before, show hidden soundActions
waitForKeyElements(".soundList__item .sound__body", function( jNode ) {
    var removeItem = '<div class="mdb-removeItem hand sc-text-grey" title="Remove the player (this session only)">X</div>';
    jNode.append( removeItem );
});

// on click
// scrolling is needed because it wouldn't load more when all visible are removed
waitForKeyElements(".soundList__item .mdb-removeItem", function( jNode ) {
    $(".mdb-removeItem").click(function(){
        log( "click remove" );

        // keep lazy loading active
        $(".lazyInfo").remove();
        $(".lazyLoadingList__list, .userStream__list .soundList").after('<div style="text-align:center; margin-bottom:20px" class="lazyInfo">Problems loading more players? Try scrolling up and down.</div>');

        var y = $(window).scrollTop();
        $("html, body").animate({scrollTop:y + 1}, 0);
        $(this).closest('.soundList__item').remove();
        var y = $(window).scrollTop();
        $("html, body").delay(2).animate({scrollTop:y - 1}, 2);

        if( $(".paging-eof").is(':visible') ) {
            $('.lazyInfo').remove();
        }

        // remove
        $(this).closest(".soundList__item").remove();
    });
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Hide options
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// lazy loading lists (streams and feed)
waitForKeyElements(".stream__list .lazyLoadingList", lazyLoadingList);
waitForKeyElements(".userStream.lazyLoadingList", lazyLoadingList);
waitForKeyElements(".soundList.lazyLoadingList", lazyLoadingList);

function lazyLoadingList(jNode) {
    logFunc( "lazyLoadingList" );

    // add checkboxes
    if( $("#mdb-streamActions").length === 0 ) {
        jNode.before('<div id="mdb-streamActions" class="sc-text-grey sc-border-light-bottom"></div>');

        var sa = $("#mdb-streamActions"),
            checkedPl = "checked",
            checkedReposts = "",
            checkedFav = "",
            checkedUsed = "";
        if( getHidePl == "false" ) var checkedPl = '';
        if( getHideReposts == "true" ) var checkedReposts = 'checked';
        if( getHideFav == "true" ) var checkedFav = 'checked';
        if( getHideUsed == "true" ) var checkedUsed = 'checked';

        sa.append('<span>Hide:</span>');
        sa.append('<label class="pointer"><input type="checkbox" id="hidePl" name="hidePl" '+checkedPl+' value="">Playlists</label>');
        sa.append('<label class="pointer"><input type="checkbox" id="hideReposts" name="hideReposts" '+checkedReposts+' value="">Reposts</label>');
        sa.append('<label class="pointer" title="Hide player that are favorited by you"><input type="checkbox" id="hideFav" name="hideFav" '+checkedFav+' value="">Favs</label>');
        sa.append('<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>');
    }

    // reload
    var windowLocation = window.location,
        href = $(location).attr('href');

    if( typeof href != "undefined" ) {
        var url = href.replace(/\?.*$/g,"");
    }

    if( typeof url != "undefined" ) {
        $("#hidePl").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl=false&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed;
                              } else { windowLocation.href = url + "?hidePl=true&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed;
        }});
        $("#hideReposts").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=false&hideFav="+getHideFav+"&hideUsed="+getHideUsed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=true&hideFav="+getHideFav+"&hideUsed="+getHideUsed;
        }});
        $("#hideFav").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=false&hideUsed="+getHideUsed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=true&hideUsed="+getHideUsed;
        }});
        $("#hideUsed").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed=false";
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed=true";
        }});
    }
}

// Pass URL parameters for hiding options to user profile tabs
waitForKeyElements(".userInfoBar__tabs ul", function( jNode ) {
    $("a.g-tabs-link", jNode).each(function(){
        var link = $(this),
            href = link.attr("href"),
            hidingParams = location.search;

        logVar( "hidingParams", hidingParams );

        if( /.*hidePl.*/.test(hidingParams) ) {
            var href_hidingParams = href + hidingParams;
            link.attr( "href", href_hidingParams );
        }
    });
});

// Hiding option: each playlist
waitForKeyElements(".soundList__item .sound.playlist", function( jNode ) {
    if( getHidePl == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
    }
});

// Hiding option: each repost player
waitForKeyElements(".soundList__item .sc-ministats-reposts", function( jNode ) {
    if( getHidePl == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
    }
});

// Hiding option: each fFaved players > on waitForKeyElements fav button

// Hiding option: each used player
waitForKeyElements(".sc-link-primary.soundTitle__title", function( jNode ) {
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players" );

        var wrapper = jNode.closest("li.soundList__item"),
            playerUrl = "soundcloud.com" + jNode.attr("href");

        getToolkit( playerUrl, "hide if used", "lazy loading list", wrapper );
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Player page / features using SC API
 * like soundAactions buttons and upload date
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * fixDefaultSoundActions
 * Make more space by removing button text for most
 */
waitForKeyElements(".soundActions", function( jNode ) {
    logFunc( "fixDefaultSoundActions" );
    $(".sc-button-like", jNode).text("");
    $(".sc-button-repost", jNode).text("");
    $(".sc-button-share", jNode).text("");
    $(".sc-button-copylink", jNode).text("");
    $(".sc-button-more", jNode).text("");
    $(".sc-button-queue", jNode).text("");

    var buyLink = $(".soundActions__purchaseLink", jNode);
    if( buyLink.length !== 0 ) {
        var buyLink_href = fixScRedirectUrl( buyLink.attr("href") ),
            buyLink_text = buyLink.text();

        buyLink.remove();
        jNode.append( '<button class="'+soundActionFakeButtonClass+'"><a href="'+buyLink_href+'" target="_blank">Link: '+buyLink_text+'</a></button>' );
    }
});

/*
 * Call API
 */
// run all this only once
var RUN_sc_button_group = true;

waitForKeyElements(".l-listen-wrapper .soundActions .sc-button-group", function( jNode ) {
    if( RUN_sc_button_group ) {
        RUN_sc_button_group = false;

        if( urlPath(2) != "sets" ) {

            logFunc( "Player page / sound action buttons" );

            // API call
            getScAccessTokenFromApi(function(output){
                scAccessToken = output;
                logVar( "scAccessToken", scAccessToken );

                if( scAccessToken != "null" ) {
                    // Call API on current page
                    var currentTrack_id = $('meta[property="al:ios:url"]').attr("content").replace( "soundcloud://sounds:", "" ); // e.g. 2007615367
                    logVar( "currentTrack_id", currentTrack_id );
                    var scApiURl_currentTrack = "https://api.soundcloud.com/tracks/" + currentTrack_id; // Track ID would need to be grabbed (e.g. via sound action "report" URL
                    //var scApiURl_currentTrack = "https://api.soundcloud.com/resolve?url=" + encodeURIComponent( location.href );

                    logVar( "scApiURl_currentTrack", scApiURl_currentTrack );

                    $.ajax({
                        beforeSend: function(request) {
                            request.setRequestHeader( "Authorization", "OAuth " + scAccessToken );
                        },
                        dataType: "json",
                        url: scApiURl_currentTrack,
                        success: function( t ) {

                            var kind = t.kind,
                                id = t.id,
                                title = t.title,
                                created_at = formatScDate( t.created_at ),
                                release_date = formatScDate( t.release_date ),
                                last_modified = formatScDate( t.last_modified ),
                                dur_ms = t.duration,
                                downloadable = t.downloadable,
                                download_url = t.download_url;

                            logVar( "kind", kind );
                            logVar( "title", title );
                            logVar( "downloadable", downloadable );

                            if( kind == "track" ) {
                                // trackHeader
                                var soundActions = jNode,
                                    trackHeader = $("#mdb-trackHeader");

                                if( $("h1", trackHeader).length === 0 ) {
                                    var trackHeader_content = '<h1 id="mdb-trackHeader-headline" class="hand"><span class="mdb-selectOnClick">'+title+'</span></h1>';

                                    trackHeader_content += '<p id="mdb-trackHeader-releaseInfo" class="sc-text-grey">';
                                    trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-createDate"><span>Created at:</span> <date id="mdb-trackHeader-date1" class="mdb-selectOnClick hand">'+created_at+'</date></span>';
                                    if( release_date != "" ) {
                                        trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-releaseDate"><span>Release date:</span> <date id="mdb-trackHeader-date2" class="mdb-selectOnClick hand">'+release_date+'</date></span>';
                                    }
                                    if( last_modified != "" ) {
                                        trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-lastmodDate"><span>Last modified:</span> <date id="mdb-trackHeader-date3" class="mdb-selectOnClick hand">'+last_modified+'</date></span>';
                                    }
                                    trackHeader_content += '</p>';

                                    logVar( "trackHeader_content", trackHeader_content );

                                    trackHeader.append( trackHeader_content );

                                    var dateClass = "highlight mdb-selectOnClick hand";
                                    if( release_date == "" ) {
                                        $("#mdb-trackHeader-releaseInfo-createDate date").addClass( dateClass );
                                    } else {
                                        $("#mdb-trackHeader-releaseInfo-releaseDate date").addClass( dateClass );
                                    }
                                }

                                // add toggleTarget
                                if( $("#mdb-toggle-target").length === 0 ) {
                                    $(".listenDetails").prepend( '<div id="mdb-toggle-target"></div>' );
                                }

                                // indicate download is available
                                // cannot add DL url, thus only a button, but that cannot trigger the dropown to open
                                // therefor rename the dropdown to "DL"
                                if( downloadable ) {
                                    $(".sc-button-more", jNode).html('<span class="mdb-fakeDlButton">DL</span>');
                                }

                                // file details
                                // TODO: get bytes from download url
                                if( dur_sec !== null ) {
                                    if( $("#mdb-fileInfo").length === 0 ) {
                                        //var bytes = getBytesSizeFromUrl_api( download_url, scAccessToken );
                                        var bytes = "",
                                            dur_sec = Math.floor(dur_ms/ 1000),
                                            durToggleWrapper = getFileDetails_forToggle( dur_sec, bytes ),
                                            dur = convertHMS( dur_sec );

                                        soundActions.after('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');

                                        $("#mdb-toggle-target").append( durToggleWrapper );
                                    }
                                }

                                // apiText-toggleButton
                                //log($("#apiText-toggleButton").length);
                                if( $("#apiText-toggleButton").length === 0 ) {
                                    // remove artwork_url
                                    // add modified artwork url for -original.ext
                                    var artwork_url = t.artwork_url,
                                        artwork_url_original_try = artwork_url.replace("-large.", "-original.");
                                    delete t["artwork_url"];

                                    // move description to end of t array
                                    var description = t.description;
                                    delete t["description"];
                                    t["description"] = description;

                                    // move user to end of t array
                                    var user = t.user;
                                    delete t["user"];
                                    t["user"] = user;

                                    // build new re-ordered t_new array
                                    // artwork urls on top
                                    var t_new = { "artwork_url_original (try)" : artwork_url_original_try };
                                    t_new["artwork_url"] = artwork_url;
                                    // add remaining t values
                                    $.each( t, function(key, value) {
                                        t_new[key] = value;
                                    });

                                    // prepare apiText for toggle output
                                    var apiText = textify( JSON.stringify( t_new, null, "\t" ) ),
                                        apiTextLinkified = linkify( apiText );
                                    //logVar( "apiText", apiText );

                                    soundActions.append( '<button id="apiText-toggleButton" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="apiText">API</button>' );
                                    $("#mdb-toggle-target").append('<div id="apiText" style="display:none">'+apiTextLinkified+'</div>');
                                }

                                // Add TID submit link to toolkit
                                waitForKeyElements("#mdb-toolkit > ul", function( jNode ) {
                                    var keywords = normalizeTitleForSearch( t.title ),
                                        tidLink = makeTidSubmitLink( t.permalink_url, keywords, "text", "toolkit_li" );
                                    if( tidLink ) {
                                        jNode.append( tidLink ).show();
                                    }
                                });
                            }
                        },
                        error: function() {
                            log( "No track or no API!" );
                            addApiErrorNote( "unknown error" );
                        }
                    });
                } else {
                    addApiErrorNote( "no access token" );
                }
            });
        }
    }
});

/*
 * Re-order added soundActsions buttons (async)
 */
// TID submit to the end
waitForKeyElements(".soundActions a.mdb-tidSubmit.sc_button-mdb:not(.moved)", function( jNode ) {
    jNode.addClass("moved").appendTo( $(".soundActions") );
});

/*
 * trackHeader
 */
// Add header from API call
// Add here instead of after API call for less flashing
waitForKeyElements(".l-listen-hero", function( jNode ) {
    var trackHeader = '<div id="mdb-trackHeader"></div>';
    jNode.before( trackHeader );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".l-listen__mainContent .listenDetails__partialInfo:not(.mdb-processed-toolkit)", function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        jNode.addClass("mdb-processed-toolkit");

        //var titleText = $('meta[property="og:title"]').text();
        var titleText = $("h1.soundTitle__title").text();

        // get the player URL
        // DO NOT use location.href as this includes parameters
        // Must work on URLs like https://soundcloud.com/fccr/shigeo-yamaguchi-wm-66-berlin-1996?utm_source=trackid.net&utm_campaign=wtshare&utm_medium=widget&utm_content=https%253A%252F%252Fsoundcloud.com%252Ffccr%252Fshigeo-yamaguchi-wm-66-berlin-1996
        var playerUrl = location.protocol + '//' + location.host + location.pathname;

        getToolkit( playerUrl, "playerUrl", "detail page", jNode, "before", titleText, "", "addActionLinks-not" );
    }
});