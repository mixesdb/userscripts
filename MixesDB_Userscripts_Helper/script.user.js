// ==UserScript==
// @name         MixesDB Userscripts Helper (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.04.18.1
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-MixesDB_Userscripts_Helper_11
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-MixesDB_Userscripts_Helper_2
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * User settings
 * You need to set these on each update, but updates happen rarely for this script
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Apple Music settings
 */
// Apple Music links: force to open in browser?
// Keep 0 to use open the Music app
// Set 1 to open as normal browser tab on beta.music.apple.com (recommended)
const appleMusic_linksOpenInBrowser = 1; // default: 0

// Your Apple Music counry code, e.g. "de"
// All country codes: https://www.hiresedition.com/apple-music-country-codes.html
const appleMusic_countryCode_switch = "de"; // default: ""

/*
 * TrackId.net settings
 */
// Submit player URLs to the TID request form
// * On Explorer mix results add an icon to the title bar
// * On mix pages add TID links to every player ("Exists" or "Submit")
// Set 0 to disable
const trackIdnet_addLinks = 1; // default: 1

/*
 * Apple Podcasts settings
 */
// Add search icons for Apple Podcasts to mix page title icons and Explorer mix results
// Set 0 to disable
const applePodcasts_addSearchIcons = 1; // default: 1


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var dev = 0,
    cacheVersion = 7,
    scriptName = "MixesDB_Userscripts_Helper",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

//loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basic functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
// getKeywordsFromTitle
function getKeywordsFromTitle( titleWrapper ) {
    return normalizeTitleForSearch( titleWrapper.text() );
}

// function getKeywordsFromTitle_Customized_AP
// Customize keywords for more precise results
function getKeywordsFromTitle_Customized_AP( titleWrapper ) {
    var title = titleWrapper.text(),
        keywords = getKeywordsFromTitle( titleWrapper );

    if( title.match(/Resident Advisor \(RA\.\d+\)/) ) {
        keywords = title.replace( /^.+ - (.+) - Resident Advisor \((RA\.\d+)\)/g, "$2 $1");
    }

    return keywords;
}

// get applePodcastsSearchLink
function getApplePodcastsSearchLink( className, keywords ) {
    var applePodcastsSearchUrl = "https://podcasts.apple.com/us/search?term="+encodeURIComponent( keywords );

    // mak eicon link
    // max-height to avoid flashing original icon size (script.css loads later)
    var iconLink = '<a class="'+className+' applePodcastsSearch" href="'+applePodcastsSearchUrl+'" title="Search \''+keywords+'\’ in Apple Podcasts" target="_blank"><img src="https://www.mixesdb.com/w/images/a/ad/Apple_Podcasts_logo.svg" style="max-height:18px" alt="Apple Podcasts icon"/></a>';

    return iconLink;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * TrackId.net functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// fixRequestPlayerUrl
function fixRequestPlayerUrl( url ) {
    return url
        .replace( "www.youtu.be", "youtu.be" )
        .replace( "m.soundcloud.com", "soundcloud.com" );
}

// tidLinkFromUrl
function tidLinkFromUrl( requestPlayerUrl, keywords ) {
    var urlFixed = fixRequestPlayerUrl( requestPlayerUrl ),
        domain = new URL( urlFixed ).hostname.replace("www.",""),
        cont = false;

    //logVar( "domain", domain );

    if( domain == "soundcloud.com" || domain == "mixcloud.com" || domain == "youtube.com" || domain == "youtu.be" || domain == "hearthis.at" ) {
        cont = true;
    }

    if( cont ) {
        var tidUrl = makeTidSubmitUrl( urlFixed, keywords ),
            tidLogo = '<img class="op05" src="'+favicon_TID+'" alt="TrackId.net Logo" style="max-height:20px">', // max-height to avoid flashing original icon size (script.css loads later)
            link = '<a class="explorerTitleIcon tidSubmit" href="'+tidUrl+'" title="Submit '+urlFixed+' on TrackId.net" target="_blank" style="display:none">'+tidLogo+'</a>';
        return link;
    } else {
        log( domain + " cannot be requested on TrackId.net" );
        return false;
    }
}

// triggerVisiblePlayer
function triggerVisiblePlayer( wrapper ) {
    var firstPlayerVisible = $('.playerWrapper.on-explorer:visible[data-tidcompatibleplayersite="true"]', wrapper).first(),
        playerUrl = firstPlayerVisible.attr("data-playerurl"),
        keywords = getKeywordsFromTitle( $(".explorerTitleLink", wrapper) );

    log( playerUrl );
    //logVar( "keywords", keywords );

    if( playerUrl && keywords ) {
        var tidLink = tidLinkFromUrl( playerUrl, keywords );
        if( tidLink ) {
            log( "Adding TID link for " + playerUrl );
            $(".explorerTitle .greylinks", wrapper).append( tidLink );
            $(".tidSubmit", wrapper).fadeIn( msFadeSlow );
        } else {
            log( "Skipped." );
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Mix page title icons and Explorer title icons fpr
 ** TrackId.net request submission
 ** Apple Podcasts search
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
logFunc( "Quicker Submit Request" );

d.ready(function(){ // needed for mw.config

    // Prepare variables to check if we're on a mix page etc.
    var actionView =  $("body").hasClass("action-view") ? true : false,
        wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
        wgTitle = mw.config.get("wgTitle"),
        wgPageName = mw.config.get("wgPageName");

    /*
     * On mix pages and MixesDB:Explorer/Mixes
     * Also allow on page edit (preview)
     */
    if( trackIdnet_addLinks
        && ( wgNamespaceNumber==0 && wgTitle!="Main Page" )
        || ( wgNamespaceNumber==4 && wgPageName=="MixesDB:Explorer/Mixes" )
      ) {
        log( "Criteria for mix page matched." );

        /*
         * TrackId.net submit link under each player
         */
        $(".playerWrapper[data-playersite]").each(function(){
            var playerWrapper = $(this),
                playerTidCompatible = playerWrapper.attr("data-tidcompatibleplayersite"),
                playerUrl = playerWrapper.attr("data-playerurl"),
                keywords = getKeywordsFromTitle( $("h1#firstHeading") );

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
                        // avoid undefined error
                        if( ( data.error && data.error.code == "notfound" )  ) {
                            // no result
                            var tidLink_submit = '<a href="'+makeTidSubmitUrl( playerUrl, keywords )+'">Submit to TrackId.net</a>';
                            playerWrapper.append( '<div class="tidLink">'+tidLink_submit+'</div>' );
                        } else {
                            var tidLink = "",
                                trackidurl = data.mixesdbtrackid?.[0]?.trackidurl || null,
                                lastCheckedAgainstMixesDB = data.mixesdbtrackid?.[0]?.mixesdbpages?.[0]?.lastCheckedAgainstMixesDB || null;

                            logVar( "trackidurl", trackidurl );
                            logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                            if( trackidurl ) {
                                tidLink += '<a href="'+trackidurl+'">Exists on TrackId.net</a>';

                                if( lastCheckedAgainstMixesDB ) {
                                    tidLink += ' <span id="mdbTrackidCheck-wrapper" class="integrated" style="max-height:15px">'+checkIcon+'integrated</span>';
                                    tidLink += ' ' + toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );
                                } else {
                                    tidLink += ' (not integrated yet)';
                                }
                            }

                            if( tidLink != "" ) {
                                playerWrapper.append( '<div class="tidLink grey">'+tidLink+'</div>' );
                            }
                        }
                    }
                }); // END ajax
            }
        });
    }

    /*
     * On mix pages and Category pages
     */
    if( ( wgNamespaceNumber==0 && wgTitle!="Main Page" )
        || wgNamespaceNumber==14
      ) {
        // Apple Podcasts search link icon
        if( applePodcasts_addSearchIcons ) {
            if( actionView ) {
                var titleWrapper = $("#firstHeading .mw-page-title-main");
            } else {
                var titleWrapper = $("#firstHeading #firstHeadingTitle");
            }

            if( wgNamespaceNumber==14 ) {
                var keywords = wgTitle; // on Category
            } else {
                var keywords = getKeywordsFromTitle_Customized_AP( titleWrapper );
            }

            if( keywords ) var applePodcastsSearchLink = getApplePodcastsSearchLink( "pageIcon", keywords );
            if( applePodcastsSearchLink ) $("#pageIcons").prepend( applePodcastsSearchLink );
        } else {
            log( "applePodcasts_addSearchIcons diabled." );
        }

    }

    /*
     * On MixesDB:Explorer/Mixes
     */
    if( wgNamespaceNumber==4 && wgPageName=="MixesDB:Explorer/Mixes" ) {
        log( "Criteria for MixesDB:Explorer/Mixes matched." );

        // Apple Podcasts search link icon
        if( applePodcasts_addSearchIcons ) {
            $(".explorerTitle").each(function(){
                var wrapper = this,
                    keywords = getKeywordsFromTitle_Customized_AP( $(".explorerTitleLink", wrapper) ),
                    applePodcastsSearchLink = getApplePodcastsSearchLink( "explorerTitleIcon", keywords );

                if( applePodcastsSearchLink ) $(".greylinks", wrapper).append( applePodcastsSearchLink );
            });
        } else {
            log( "applePodcasts_addSearchIcons diabled." );
        }
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Change Apple Music links on tracks
 * Force link to open in browser instead of the Music app
 * Change URL to Apple Music Beta and custom country code
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".aff-iconlink.AppleMusic:not(.processed-userscript)", waitAppleMusicLinks);
waitForKeyElements(".aff-details-toprow-iTunesTitle a:not(.processed-userscript)", waitAppleMusicLinks);

function waitAppleMusicLinks(jNode) {
    jNode.addClass("processed-userscript");

    // https://music.apple.com/us/album/lunch/1739659134?i=1739659140&uo=4&app=music&at=1000l5EX
    // https://music.apple.com/de/search?at=1000l5EX&term=Floating%20Points%20Fast%20Foward
    // https://music.apple.com/search?term=Plant%2043%20Emerald%20Shift
    var item_url = jNode.attr("href");

    // force link to open in browser
    logVar( "appleMusic_linksOpenInBrowser", appleMusic_linksOpenInBrowser );
    if( appleMusic_linksOpenInBrowser == 1 ) {
        // remove URL parameter app=music
        // album links have the app parameter by default, search links do not
        item_url = item_url.replace( "&app=music", "&app=browser" );

        // switch to beta (necessary to bypass Music app)
        item_url = item_url.replace( "music.apple.com", "beta.music.apple.com" );
    }

    // override country code
    logVar( "appleMusic_countryCode_switch", appleMusic_countryCode_switch );

    if( appleMusic_countryCode_switch != "" ) {
        item_url = item_url.replace( /music.apple.com\/..\//g, "music.apple.com/"+appleMusic_countryCode_switch+"/" )
                           .replace( "apple.com/search", "apple.com/"+appleMusic_countryCode_switch+"/search" )
                           ;
    }

    // prepare url for switch
    if( appleMusic_linksOpenInBrowser == 1 || appleMusic_countryCode_switch != "" ) {
        jNode.attr( 'href', item_url );
    }

    // ensure link opens in new tab
    if( appleMusic_linksOpenInBrowser == 1 ) {
        jNode.click(function(e) {
            var url_open = item_url;
            log("click: " + url_open );
            e.preventDefault();
            window.open( url_open );
        });
    }
}
