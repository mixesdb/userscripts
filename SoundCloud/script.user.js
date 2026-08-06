// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.06.15
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_35
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-SoundCloud_52
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_29
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v_3
// @include      http*soundcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Frame handling
 *
 * Since the ~Aug 2026 redesign SoundCloud no longer renders track pages into the main
 * document: the whole track page lives in a same-origin iframe (iframe.webiIframe, id
 * #__WEBI_IFRAME_PRELOADED__) whose path is the address bar path prefixed with "/n/".
 * Everything we add to a track page has to be added inside that document, so @noframes
 * had to go - which in turn means the script now also starts in every other
 * soundcloud.com frame (widget players, upload target, ...) and has to opt out there.
 *
 * Stream/profile/playlist pages are unaffected and still render into the top document.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// The frame is only ours if we can actually reach the embedding page - a soundcloud.com
// page embedded somewhere else entirely is none of our business either.
function canAccessTopFrame() {
    try {
        return typeof window.top.location.pathname === "string";
    } catch( e ) {
        return false;
    }
}

const isTopFrame = ( window.self === window.top ),
      isWebiFrame = ( !isTopFrame && /^\/n\//.test( location.pathname ) && canAccessTopFrame() );

if( !isTopFrame && !isWebiFrame ) {
    return; // not a frame we have anything to do in
}

// Inside the webi frame it is the address bar - not location.href - that holds the URL
// MixesDB works with: the frame's own path carries the "/n/" prefix plus SoundCloud's
// internal query string. Re-point global.js' urlPath() at the address bar so every
// urlPath()/urlPath_noParams() call in global.js, toolkit.js and this script keeps
// seeing /user/track instead of /n/user/track.
const pageLocation = isWebiFrame ? window.top.location : window.location,
      pagePathname = pageLocation.pathname,
      pageHref = pageLocation.protocol + "//" + pageLocation.host + pagePathname + pageLocation.search;

if( isWebiFrame ) {
    urlPath = function(n) {
        return pageHref.split('/')[n+2];
    };
}

// The OpenGraph/app-link meta tags (needed for the track ID) only exist in the top
// document - the webi frame ships a near-empty <head>.
const metaDoc = isWebiFrame ? window.top.document : document;

/*
 * getScPlayerUrl
 * The player URL as MixesDB embeds it.
 * DO NOT build it from location.href: that carries parameters, and inside the webi frame
 * it is not even the URL of this track.
 * Must work on URLs like https://soundcloud.com/fccr/shigeo-yamaguchi-wm-66-berlin-1996?utm_source=trackid.net&utm_campaign=wtshare&utm_medium=widget&utm_content=https%253A%252F%252Fsoundcloud.com%252Ffccr%252Fshigeo-yamaguchi-wm-66-berlin-1996
 */
function getScPlayerUrl() {
    return pageLocation.protocol + '//' + pageLocation.host + pagePathname;
}


/*
 * Before anythings starts: Reload the page
 * A tiny delay is needed, otherwise there's constant reloading.
 * Only the top frame owns the address bar; hooking history inside the webi frame as
 * well would only fight with the top frame's reload.
 */
if( isTopFrame ) {
    redirectOnUrlChange( 60 );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 54,
    scriptName = "SoundCloud";
window.scriptName = scriptName; // toolkit.js reads this global directly

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
    if (isSetsTab || !isHideXedEnabled()) return;

    const slug = getSlugFromSoundItem(soundItem);
    if (slug && isXed(slug)) {
        soundItem.remove();
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
const isSetPage = ( urlPath_noParams(2) == "sets" ) ? true : false,
      isSetsTab = isSetPage && !urlPath_noParams(3);
logVar( 'isSetPage (= "'+urlPath_noParams(2)+'")', isSetPage );
logVar( "isSetsTab", isSetsTab );

// The sets tab only shows an informational placeholder instead of filter
// controls, so no persisted hide option may remove its playlist entries.
if( isSetsTab ) {
    getHidePl = getHideReposts = getHideFav = getHideUsed = getHideXed = "false";
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".listenArtworkWrapper", function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        //log( location.href );

        // Artwork link to original (legacy wrapper)
        var artworkWrapper = $(".listenArtworkWrapper"),
            artwork_url = $(".sc-artwork", artworkWrapper).html().replace(/.+&quot;(htt.+(?:jpg|png)).+/, "$1");
        log( artworkWrapper.html() );
        logVar( "artwork_url", artwork_url );
        if( typeof artwork_url  !== "undefined" ) {
            append_artwork( artwork_url );
        }
    }
});

// Artwork link to original (new listenInfo wrapper)
waitForKeyElements(".listenInfo .image span.sc-artwork[style*='background-image']", function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        var styleAttr = jNode.attr("style") || "",
            artwork_url = styleAttr.replace(/.*background-image:\s*url\(["']?(https?:[^"')]+(?:jpg|png))["']?\).*/, "$1");

        logVar( "artwork_url (listenInfo)", artwork_url );

        if( typeof artwork_url !== "undefined" && artwork_url !== styleAttr ) {
            append_artwork( artwork_url );
        }
    }
});

// Artwork link to original (new Material "Track header" layout, since ~Aug 2026 redesign)
// is not done from the DOM: the artwork box clips its overflow, so an info bar placed next to
// the <img> is invisible, and tracks with a "visuals" banner have no artwork <img> in the
// visible header at all. It is added from the API artwork_url instead, see the API call below.


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
        if( isSetsTab ) {
            saHide.append( "Filter options on pages with multiple playlists create too much server load. Open the playlist/set page of interest individually." );
        } else {
            if( !isSetPage ) {
                saHide.append('<label class="pointer"><input type="checkbox" id="hidePl" name="hidePl" '+checkedPl+' value="">Playlists</label>');
                saHide.append('<label class="pointer"><input type="checkbox" id="hideReposts" name="hideReposts" '+checkedReposts+' value="">Reposts</label>');
                saHide.append('<label class="pointer" title="Hide players that are favorited by you"><input type="checkbox" id="hideFav" name="hideFav" '+checkedFav+' value="">Favs</label>');
            }
            saHide.append('<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>');
            saHide.append('<label class="pointer" title="Hide items you previously removed with the X button"><input type="checkbox" id="hideXed" name="hideXed" '+checkedXed+' value="">X\'ed items</label>');
        }
    }

    // Filter row
    if( !isSetsTab ) {
        installNetworkHooks();
        mountUI();
        attachIO();
        observeDOM();
        refreshVisible();
    }

    // reload
    var windowLocation = window.location,
        href = $(location).attr('href');

    if( typeof href != "undefined" ) {
        var url = href.replace(/\?.*$/g,"");
    }

    if( typeof url != "undefined" ) {
        $("#hidePl").change(function(){
            const hidePlEnabled = this.checked;
            setHideOption(hidePlaylistsKey, hidePlEnabled);

            if(!hidePlEnabled) { windowLocation.href = url + "?hidePl=false&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl=true&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
        }});
        $("#hideReposts").change(function(){
            const hideRepostsEnabled = this.checked;
            setHideOption(hideRepostsKey, hideRepostsEnabled);

            if(!hideRepostsEnabled) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=false&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=true&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
        }});
        $("#hideFav").change(function(){
            const hideFavEnabled = this.checked;
            setHideOption(hideFavoritesKey, hideFavEnabled);

            if(!hideFavEnabled) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=false&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=true&hideUsed="+getHideUsed+"&hideXed="+getHideXed;
        }});
        $("#hideUsed").change(function(){
            const hideUsedEnabled = this.checked;
            setHideOption(hideUsedKey, hideUsedEnabled);

            if(!hideUsedEnabled) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed=false&hideXed="+getHideXed;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed=true&hideXed="+getHideXed;
        }});
        $("#hideXed").change(function(){
            const hideXedEnabled = this.checked;
            setHideXedEnabled(hideXedEnabled);

            windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav="+getHideFav+"&hideUsed="+getHideUsed+"&hideXed="+(hideXedEnabled ? "true" : "false");
        });
    }
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
        jNode.closest(".soundList__item").remove();
    }
});

// Hiding option: each repost player
waitForKeyElements(".soundList__item .sc-ministats-reposts", function( jNode ) {
    if( getHideReposts == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
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
 * SoundCloud's own download button (new layout)
 *
 * The redesign renders it as an unlabelled MUI icon button - its mui-* class names are
 * generated per build and useless as a selector, so the aria-label is the only stable hook:
 * <button ... aria-label="Download track"><svg>...</svg></button>
 *
 * We cannot download the file ourselves (the API's download_url needs the OAuth token as a
 * header, so it cannot just be put into an <a href>), so #mdb-dlInfo forwards the click to
 * that button instead.
 */

// The track page lives in the webi frame, but the header can also come from the top
// document - search both, and only ever take a visible match: the header is rendered twice
// (responsive mobile/desktop variants) and clicking the hidden copy does nothing.
function findScVisibleElement( selector ) {
    var docs = ( metaDoc !== document ) ? [ document, metaDoc ] : [ document ];

    for( var i = 0; i < docs.length; i++ ) {
        var found = $( selector, docs[i] ).filter(':visible').first();
        if( found.length !== 0 ) {
            return found;
        }
    }
    return $();
}

// Selectors are tried one after the other, not as one comma list: a comma list returns
// whatever comes first in the document, which could be an unrelated "Download the app"
// button, while the exact aria-label is the one we actually want.
function getScDownloadButton() {
    var selectors = [ 'button[aria-label="Download track"]',
                      '[role="menuitem"][aria-label^="Download track"]',
                      'button[aria-label^="Download track"]' ];

    for( var i = 0; i < selectors.length; i++ ) {
        var found = findScVisibleElement( selectors[i] );
        if( found.length !== 0 ) {
            return found;
        }
    }
    return $();
}

/*
 * triggerScDownload
 * Must be called straight from the click handler, never out of a timer: browsers only let
 * the download through while the user gesture is still active.
 * onFail() is called if the button cannot be found at all.
 */
function triggerScDownload( onFail ) {
    logFunc( "triggerScDownload" );

    var dlButton = getScDownloadButton();

    if( dlButton.length !== 0 ) {
        log( "Clicking SoundCloud's own download button" );
        dlButton.get(0).click();
        return;
    }

    // Not in the DOM: on narrow layouts the download sits in the header's overflow menu,
    // and MUI only renders menu items once the menu is open.
    var moreButton = findScVisibleElement( 'button[aria-label^="More"]' );

    if( moreButton.length === 0 ) {
        onFail();
        return;
    }

    log( "No download button - opening the overflow menu" );
    moreButton.get(0).click();

    // The menu renders async, so poll for it - but briefly: the click still has to land
    // inside the transient user activation window (~5s in Chrome).
    var tries = 0,
        poll = setInterval(function(){
            var menuButton = getScDownloadButton();

            if( menuButton.length !== 0 ) {
                clearInterval( poll );
                log( "Clicking the download entry of the overflow menu" );
                menuButton.get(0).click();
            } else if( ++tries > 20 ) {
                clearInterval( poll );
                onFail();
            }
        }, 50);
}

/*
 * Call API
 * .listen-content .soundActions > for premium account layout (?), e.g. https://soundcloud.com/grabthegroove/gtg-pdcst-046-pyramidal-decode
 */
// run all this only once
var RUN_sc_button_group = true;

// New Material "Track header" layout (since ~Aug 2026 redesign) has no button-group with room
// for extra buttons, so API/file-details buttons go into #mdb-sc-trackExtras - and that wrapper
// is what this handler waits for there.
// It must NOT wait for the Track header section itself: waitForKeyElements keeps its
// "alreadyFound" flag in one jQuery data key per element, so several handlers watching the same
// element starve each other - whichever runs first flags it and the rest never see it.
waitForKeyElements('.l-listen-wrapper .soundActions .sc-button-group, .listen-content .soundActions .sc-button-group, #mdb-sc-trackExtras', function( jNode ) {
    if( RUN_sc_button_group ) {
        var isNewSoundCloudLayout = jNode.is('#mdb-sc-trackExtras');

        RUN_sc_button_group = false;

        if( urlPath(2) != "sets" ) {

            logFunc( "Player page / sound action buttons" );
            logVar( "isNewSoundCloudLayout", isNewSoundCloudLayout );

            // API call
            getScAccessTokenFromApi(function(output){
                scAccessToken = output;
                logVar( "scAccessToken", scAccessToken );

                if( scAccessToken != "null" ) {
                    // Call API on current page
                    // metaDoc: in the new layout this meta only exists in the top document
                    var iosUrlMeta = $('meta[property="al:ios:url"]', metaDoc),
                        currentTrack_id = iosUrlMeta.length ? iosUrlMeta.attr("content").replace( "soundcloud://sounds:", "" ) : ""; // e.g. 2007615367
                    logVar( "currentTrack_id", currentTrack_id );

                    if( !currentTrack_id ) {
                        log( "No track ID meta found!" );
                        addApiErrorNote( "no track ID" );
                        return;
                    }
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
                                download_url = t.download_url,
                                apiArtworkUrl = t.artwork_url,
                                purchase_url = t.purchase_url,
                                purchase_title = t.purchase_title;

                            logVar( "kind", kind );
                            logVar( "title", title );
                            logVar( "downloadable", downloadable );

                            if( kind == "track" ) {
                                // trackHeader
                                // in the new layout jNode is #mdb-sc-trackExtras itself, which already
                                // brings its own #mdb-trackHeader, #mdb-sc-trackButtons and #mdb-toggle-target
                                var soundActions = jNode,
                                    trackHeader = isNewSoundCloudLayout ? $("#mdb-sc-trackHead #mdb-trackHeader") : $("#mdb-trackHeader"),
                                    buttonTarget = isNewSoundCloudLayout ? $("#mdb-sc-trackButtons") : jNode;

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

                                    // new layout: the create date shares one row with the buttons
                                    // (DL, duration, API), so move it over there before they are added.
                                    // It loses the grey of the header <p> on the way - add it back.
                                    if( isNewSoundCloudLayout ) {
                                        $("#mdb-trackHeader-releaseInfo-createDate").addClass("sc-text-grey").prependTo( buttonTarget );

                                        // drop the now possibly empty header paragraph to avoid its spacing
                                        var releaseInfo = $("#mdb-trackHeader-releaseInfo");
                                        if( releaseInfo.children().length === 0 ) {
                                            releaseInfo.remove();
                                        }
                                    }
                                }

                                // add toggleTarget
                                if( $("#mdb-toggle-target").length === 0 ) {
                                    $(".listenDetails").prepend( '<div id="mdb-toggle-target"></div>' );
                                }

                                // indicate download is available
                                // cannot add DL url, thus only a button, but that cannot trigger the dropown to open
                                // therefor rename the dropdown to "DL"
                                // In the new layout the hint gets its own button next to the other
                                // trackExtras buttons, which forwards the click to SoundCloud's own
                                // download button - see triggerScDownload().
                                if( downloadable ) {
                                    if( isNewSoundCloudLayout ) {
                                        if( $("#mdb-dlInfo").length === 0 ) {
                                            buttonTarget.append('<button id="mdb-dlInfo" class="'+soundActionFakeButtonClass+'" title="Download this track (triggers SoundCloud\'s own download button)">DL</button>');

                                            $("#mdb-dlInfo").click(function(){
                                                var dlInfoButton = $(this);

                                                triggerScDownload(function(){
                                                    log( "SoundCloud's own download button was not found" );
                                                    dlInfoButton.addClass("mdb-dlInfo-failed")
                                                                .attr( "title", "SoundCloud's own download button could not be found - please use it directly" );
                                                });
                                            });
                                        }
                                    } else {
                                        $(".sc-button-more", jNode).html('<span class="mdb-fakeDlButton">DL</span>');
                                    }
                                }

                                // buy/purchase link
                                // The old layout offered it as .soundActions__purchaseLink in the DOM, the
                                // new one hides it away - take it from the API response instead.
                                if( isNewSoundCloudLayout && purchase_url && $("#mdb-purchaseLink").length === 0 ) {
                                    var purchase_href = /^https?:\/\/gate\.sc\//.test( purchase_url ) ? fixScRedirectUrl( purchase_url ) : purchase_url,
                                        purchase_text = purchase_title ? purchase_title : "Buy";

                                    buttonTarget.append( '<button id="mdb-purchaseLink" class="'+soundActionFakeButtonClass+'"><a href="'+purchase_href+'" target="_blank">Link: '+purchase_text+'</a></button>' );
                                }

                                // artwork: link to the original plus its dimensions/file type
                                // goes into the head row (right of the title), not into the button row
                                if( isNewSoundCloudLayout && apiArtworkUrl && $("#mdb-artwork-input-wrapper").length === 0 ) {
                                    append_artwork_trackExtras( $("#mdb-sc-trackHead"), apiArtworkUrl );
                                }

                                // file details
                                // TODO: get bytes from download url
                                if( dur_ms ) {
                                    if( $("#mdb-fileInfo").length === 0 ) {
                                        //var bytes = getBytesSizeFromUrl_api( download_url, scAccessToken );
                                        var bytes = "",
                                            dur_sec = Math.floor(dur_ms/ 1000),
                                            durToggleWrapper = getFileDetails_forToggle( dur_sec, bytes ),
                                            dur = convertHMS( dur_sec );

                                        if( isNewSoundCloudLayout ) {
                                            buttonTarget.append('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');
                                        } else {
                                            soundActions.after('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');
                                        }

                                        $("#mdb-toggle-target").append( durToggleWrapper );
                                    }
                                }

                                // apiText-toggleButton
                                //log($("#apiText-toggleButton").length);
                                if( $("#apiText-toggleButton").length === 0 ) {
                                    // remove artwork_url
                                    // add modified artwork url for -original.ext
                                    // tracks without an artwork return null here
                                    var artwork_url = t.artwork_url,
                                        artwork_url_original_try = artwork_url ? artwork_url.replace("-large.", "-original.") : "";
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

                                    if( isNewSoundCloudLayout ) {
                                        buttonTarget.append( '<button id="apiText-toggleButton" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="apiText">API</button>' );
                                    } else {
                                        soundActions.append( '<button id="apiText-toggleButton" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="apiText">API</button>' );
                                    }
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

// New Material "Track header" layout (since ~Aug 2026 redesign)
// API/file-details buttons + toolkit go into a dedicated wrapper below the box,
// since the new box has no room for extra buttons and its layout is not ours to change.
// SC renders the track header twice (responsive mobile/desktop variants), only the :visible one matters.
//
// This is the ONLY handler allowed to watch the Track header section: waitForKeyElements keeps
// its "alreadyFound" state in a single jQuery data key per element, so a second handler on the
// same element would never get called. Everything else for this layout therefore hangs off
// #mdb-sc-trackExtras - including the toolkit, which is kicked off right here.
waitForKeyElements('section[aria-label="Track header"]:not(.mdb-processed-trackheader)', function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        // filtering by :visible in the selector itself is untested with an attribute selector
        // in this codebase - check it as a separate runtime condition instead (proven pattern).
        // Must return true (not just bail) - waitForKeyElements marks a node "alreadyFound" and
        // stops calling back on it forever unless the callback returns a truthy "keep watching" value.
        if( !jNode.is(':visible') ) {
            return true;
        }

        jNode.addClass("mdb-processed-trackheader");

        if( $("#mdb-sc-trackExtras").length === 0 ) {
            // #mdb-sc-trackHead is the row that holds the title (left) and the artwork info bar
            // (right, below the artwork of the Track header box) - see script.css.
            // #mdb-sc-trackButtons keeps the buttons above #mdb-toggle-target - appending them to
            // the wrapper itself would push them below whatever an expanded toggle prints out
            jNode.after( '<div id="mdb-sc-trackExtras"><div id="mdb-sc-trackHead"><div id="mdb-trackHeader"></div></div><div id="mdb-sc-trackButtons"></div><div id="mdb-toggle-target"></div></div>' );

            // toolkit goes full-width at the very end of the wrapper (below buttons and toggle
            // target), instead of being squeezed into the old sidebar column
            getToolkit( getScPlayerUrl(), "playerUrl", "detail page", $("#mdb-sc-trackExtras"), "append", jNode.find("h1").first().text(), "", 1, getScPlayerUrl() );
        }
    }
});

/*
 * Force full description
 * The old layout was handled by CSS (.truncatedAudioInfo__wrapper), but the new one
 * collapses the description via React state, so the "Show more" button has to be
 * clicked. Its class names are generated (mui-*) and useless as a selector, so match
 * it by its exact label - "Show more comments" and friends must not be clicked.
 */
if( isWebiFrame ) {
    waitForKeyElements('button:contains("Show more"):not(.mdb-processed-showMore)', function( jNode ) {
        jNode.addClass("mdb-processed-showMore");

        if( jNode.text().trim() == "Show more" && jNode.is(':visible') ) {
            log( "Expanding the truncated description" );
            jNode.get(0).click();
        }
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 *
 * .listen-about .listenDetails > for premium account layout (?), e.g. https://soundcloud.com/grabthegroove/gtg-pdcst-046-pyramidal-decode
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// The new layout fires its own getToolkit() from the Track header handler above - see the note
// there on why it must not add a second watcher on that section.
waitForKeyElements('.l-listen__mainContent .listenDetails__partialInfo:not(.mdb-processed-toolkit), .listen-about .listenDetails:not(.mdb-processed-toolkit)', function( jNode ) {
    if( urlPath(2) && urlPath(2) != "sets" ) {
        jNode.addClass("mdb-processed-toolkit");

        //var titleText = $('meta[property="og:title"]').text();
        var titleText = $("h1.soundTitle__title").text();

        getToolkit( getScPlayerUrl(), "playerUrl", "detail page", jNode, "before", titleText, "", 1, getScPlayerUrl() );
    }
});

})();
