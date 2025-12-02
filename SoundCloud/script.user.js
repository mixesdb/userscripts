// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.12.02.8
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_33
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-SoundCloud_49
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_19
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v_2
// @include      http*soundcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/*
 * Before anythings starts: Reload the page
 * A tiny delay is needed, otherwise there's constant reloading.
 */
redirectOnUrlChange( 60 );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 41,
    scriptName = "SoundCloud";

const xedItemsStorageKey = 'mdb-soundcloud-xed-items',
      hideXedItemsKey = 'mdb-soundcloud-hide-xed',
      hidePlaylistsKey = 'mdb-soundcloud-hide-playlists',
      hideRepostsKey = 'mdb-soundcloud-hide-reposts',
      hideFavoritesKey = 'mdb-soundcloud-hide-favorites',
      hideUsedKey = 'mdb-soundcloud-hide-used';

const getXedItems = () => {
    try {
        return JSON.parse(localStorage.getItem(xedItemsStorageKey)) || [];
    } catch (error) {
        logVar('getXedItems failed', error);
        return [];
    }
};

const saveXedItems = (items) => {
    localStorage.setItem(xedItemsStorageKey, JSON.stringify(items));
};

const addXedItem = (slug) => {
    if (!slug) return;

    const items = getXedItems();
    if (!items.includes(slug)) {
        items.push(slug);
        saveXedItems(items);
    }
};

const isXed = (slug) => getXedItems().includes(slug);

const isHideXedEnabled = () => localStorage.getItem(hideXedItemsKey) === 'true';

const setHideXedEnabled = (isEnabled) => {
    localStorage.setItem(hideXedItemsKey, isEnabled ? 'true' : 'false');
};

const resolveHideOption = (paramName, storageKey, defaultValue = 'false') => {
    const paramValue = getURLParameter(paramName);

    if (paramValue === 'true' || paramValue === 'false') {
        localStorage.setItem(storageKey, paramValue);
        return paramValue;
    }

    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === 'true' || storedValue === 'false') {
        return storedValue;
    }

    return defaultValue;
};

const setHideOption = (storageKey, isEnabled) => {
    localStorage.setItem(storageKey, isEnabled ? 'true' : 'false');
};

const getSlugFromSoundItem = (soundItem) => {
    if (!soundItem || !soundItem.length) return null;

    const link = soundItem.find('.sc-link-primary.soundTitle__title');
    const href = link.attr('href');

    if (!href) return null;

    return href
        .replace(/^https?:\/\/(?:www\.)?soundcloud\.com\//, '')
        .replace(/\?.*$/, '');
};

const hideIfXed = (soundItem) => {
    if (!isHideXedEnabled()) return;

    const slug = getSlugFromSoundItem(soundItem);
    if (slug && isXed(slug)) {
        soundItem.hide();
    }
};

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


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
var getHidePl = resolveHideOption("hidePl", hidePlaylistsKey),
    getHideReposts = resolveHideOption("hideReposts", hideRepostsKey),
    getHideFav = resolveHideOption("hideFav", hideFavoritesKey),
    getHideUsed = resolveHideOption("hideUsed", hideUsedKey),
    getHideXedParam = getURLParameter("hideXed"),
    getHideXed = getHideXedParam == "true" ? "true" : getHideXedParam == "false" ? "false" : ( isHideXedEnabled() ? "true" : "false" );

setHideXedEnabled(getHideXed === "true");

logVar( "getHidePl", getHidePl );
logVar( "getHideReposts", getHideReposts );
logVar( "getHideFav", getHideFav );
logVar( "getHideUsed", getHideUsed );
logVar( "getHideXed", getHideXed );

// On set pages show only some filter options and hide list items, not players
// https://soundcloud.com/jedentageinset/sets/jeden-tag-ein-set-podcasts
const isSetPage = ( urlPath_noParams(2) == "sets" ) ? true : false;
logVar( 'isSetPage (= "'+urlPath_noParams(2)+'")', isSetPage );


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

// soundList__item
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

    // Hiding option: each used player in li.trackList__item
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players in sets" );

        var wrapper = jNode.closest("li.trackList__item"),
            playerUrl = "soundcloud.com" + jNode.attr("href");
        //logVar( "trackList__item playerUrl", playerUrl );

        getToolkit( playerUrl, "hide if used", "lazy loading list", wrapper );
    }
}

// Compact playlists
// https://soundcloud.com/resident-advisor
waitForKeyElements(".compactTrackList__listWrapper li.compactTrackList__item a.trackItem__trackTitle", function( jNode ) {
    var playerUrlFixed = linkRemoveSetParameter( jNode.attr( "href") );

    jNode.after( '<a href="'+playerUrlFixed+'" title="'+playerUrlFixed+' (opens in a new tab)" target="_blank" class="mdb-element mdb-copyLink">Link</a>' );
});

// .copyLink on click open new tab
waitForKeyElements(".mdb-copyLink", function( jNode ) {
    jNode.click(function(){
        var url = $(this).attr("href");
        window.open( url, "_blank" );
    });

    // Hiding option: each used player in li.compactTrackList__item
    /* TOO EXPENSIVE ON https://soundcloud.com/resident-advisor/sets
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players in li.compactTrackListItem" );

        var wrapper = jNode.closest("li.compactTrackList__item"),
            playerUrl = "soundcloud.com" + jNode.attr("href");

        logVar( "li.compactTrackList__item playerUrl", playerUrl );

        getToolkit( playerUrl, "hide if used", "lazy loading list", wrapper );
    }
    */
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
    var removeItem = '<div class="mdb-removeItem hand sc-text-grey" title="Remove the player (can be filtered out again with the hiding option &quot;X\'ed items&quot;)">X</div>';
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

        const soundItem = $(this).closest('.soundList__item');
        const slug = getSlugFromSoundItem(soundItem);
        addXedItem(slug);

        var y = $(window).scrollTop();
        $("html, body").animate({scrollTop:y + 1}, 0);
        soundItem.remove();
        var y = $(window).scrollTop();
        $("html, body").delay(2).animate({scrollTop:y - 1}, 2);

        if( $(".paging-eof").is(':visible') ) {
            $('.lazyInfo').remove();
        }
    });
});

waitForKeyElements('.soundList__item:not(.mdb-xed-checked)', function( jNode ) {
    jNode.addClass('mdb-xed-checked');
    hideIfXed(jNode);
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
waitForKeyElements(".trackList.lazyLoadingList", lazyLoadingList);

function lazyLoadingList(jNode) {
    logFunc( "lazyLoadingList" );

    // add checkboxes
    if( $("#mdb-streamActions").length === 0 ) {
        jNode.before('<div id="mdb-streamActions" class="sc-text-grey"><div id="mdb-streamActions-hide"></div></div>');

        // vars
        var saHide = $("#mdb-streamActions-hide"),
            checkedPl = "checked",
            checkedReposts = "",
            checkedFav = "",
            checkedUsed = "",
            checkedXed = "";
        if( getHidePl == "false" ) checkedPl = '';
        if( getHideReposts == "true" ) checkedReposts = 'checked';
        if( getHideFav == "true" ) checkedFav = 'checked';
        if( getHideUsed == "true" ) checkedUsed = 'checked';
        if( getHideXed == "true" ) checkedXed = 'checked';

        // Display filter options per tab type
        saHide.append('<span class="mdb-darkorange">Hide:</span>');
        if( !isSetPage ) {
            saHide.append('<label class="pointer"><input type="checkbox" id="hidePl" name="hidePl" '+checkedPl+' value="">Playlists</label>');
            saHide.append('<label class="pointer"><input type="checkbox" id="hideReposts" name="hideReposts" '+checkedReposts+' value="">Reposts</label>');
            saHide.append('<label class="pointer" title="Hide players that are favorited by you"><input type="checkbox" id="hideFav" name="hideFav" '+checkedFav+' value="">Favs</label>');
        }
        // Not on Playlists tab, e.g. https://soundcloud.com/resident-advisor/sets
        // but allow on playlist page, e.g. https://soundcloud.com/resident-advisor/sets/ra-podcast
        if( !isSetPage || isSetPage && typeof( urlPath(3) ) != "undefined" ) {
             saHide.append('<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>');
        } else {
            saHide.append( "Filter options on pages with multiple playlists create too much server load. Open the playlist/set page of interest individually." );
        }

        saHide.append('<label class="pointer" title="Hide items you previously removed with the X button"><input type="checkbox" id="hideXed" name="hideXed" '+checkedXed+' value="">X\'ed items</label>');
    }

    // Filter row
    if( urlPath(2) !== "sets" ) {
        installNetworkHooks();
        mountUI();
        attachIO();
        observeDOM();
        refreshVisible();
    }

    const updateHideQueryParams = () => {
        const urlObj = new URL(window.location.href);

        urlObj.searchParams.set('hidePl', getHidePl);
        urlObj.searchParams.set('hideReposts', getHideReposts);
        urlObj.searchParams.set('hideFav', getHideFav);
        urlObj.searchParams.set('hideUsed', getHideUsed);
        urlObj.searchParams.set('hideXed', getHideXed);

        history.replaceState(null, '', urlObj.toString());
    };

    const applyStreamHiding = () => {
        $('.soundList__item').each(function() {
            const item = $(this);
            const hidePlaylist = getHidePl === "true" && item.find('.sound.playlist').length !== 0;
            const hideRepost = getHideReposts === "true" && item.find('.sc-ministats-reposts').length !== 0;
            const hideFavorite = getHideFav === "true" && item.find('.sc-button-like.sc-button-selected').length !== 0;

            const slug = getSlugFromSoundItem(item);
            const hideXedItem = getHideXed === "true" && slug && isXed(slug);

            const shouldHide = hidePlaylist || hideRepost || hideFavorite || hideXedItem;

            item.toggle(!shouldHide);

            if (getHideUsed === "true" && !shouldHide) {
                const link = item.find('.sc-link-primary.soundTitle__title').first();
                if (link.length) {
                    const wrapper = item.closest('li.soundList__item');
                    const playerUrl = "soundcloud.com" + link.attr("href");

                    getToolkit( playerUrl, "hide if used", "stream filter", wrapper );
                }
            }
        });
    };

    $("#hidePl").change(function(){
        const hidePlEnabled = this.checked;
        setHideOption(hidePlaylistsKey, hidePlEnabled);
        getHidePl = hidePlEnabled ? "true" : "false";

        updateHideQueryParams();
        applyStreamHiding();
    });

    $("#hideReposts").change(function(){
        const hideRepostsEnabled = this.checked;
        setHideOption(hideRepostsKey, hideRepostsEnabled);
        getHideReposts = hideRepostsEnabled ? "true" : "false";

        updateHideQueryParams();
        applyStreamHiding();
    });

    $("#hideFav").change(function(){
        const hideFavEnabled = this.checked;
        setHideOption(hideFavoritesKey, hideFavEnabled);
        getHideFav = hideFavEnabled ? "true" : "false";

        updateHideQueryParams();
        applyStreamHiding();
    });

    $("#hideUsed").change(function(){
        const hideUsedEnabled = this.checked;
        setHideOption(hideUsedKey, hideUsedEnabled);
        getHideUsed = hideUsedEnabled ? "true" : "false";

        updateHideQueryParams();
        applyStreamHiding();
    });

    $("#hideXed").change(function(){
        const hideXedEnabled = this.checked;
        setHideXedEnabled(hideXedEnabled);
        getHideXed = hideXedEnabled ? "true" : "false";

        updateHideQueryParams();
        applyStreamHiding();
    });

    applyStreamHiding();
}

// Pass URL parameters for hiding options to user profile tabs
waitForKeyElements(".userInfoBar__tabs ul", function( jNode ) {
    $("a.g-tabs-link", jNode).each(function(){
        var link = $(this),
            href = link.attr("href"),
            hidingParams = location.search;

        logVar( "hidingParams", hidingParams );

        if( /hide(?:Pl|Reposts|Fav|Used|Xed)=/.test(hidingParams) ) {
            var href_hidingParams = href + hidingParams;
            link.attr( "href", href_hidingParams );
        }
    });
});

// Hiding option: each playlist
waitForKeyElements(".soundList__item .sound.playlist", function( jNode ) {
    if( getHidePl == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").hide();
    }
});

// Hiding option: each repost player
waitForKeyElements(".soundList__item .sc-ministats-reposts", function( jNode ) {
    if( getHideReposts == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").hide();
    }
});

// Hiding option: each fFaved players > on waitForKeyElements fav button

// Hiding option: each used player in li.soundList__item
waitForKeyElements(".sc-link-primary.soundTitle__title", function( jNode ) {
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players in li.soundList__item" );

        var wrapper = jNode.closest("li.soundList__item"),
            playerUrl = "soundcloud.com" + jNode.attr("href");

        logVar( "li.soundList__itemplayerUrl", playerUrl );

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

        getToolkit( playerUrl, "playerUrl", "detail page", jNode, "before", titleText, "", 1, playerUrl );
    }
});