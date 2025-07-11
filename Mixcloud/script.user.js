// ==UserScript==
// @name         Mixcloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.07.11.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Mixcloud_26
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-Mixcloud_192
// @include      http*mixcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixcloud.com
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

var cacheVersion = 13,
    scriptName = "Mixcloud";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 1000 );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// createToggleApiArea
function createToggleApiArea( urlVar ) {
    logFunc( "createToggleApiArea" );

    logVar( "urlVar", urlVar );

    $.get(urlVar, function( data ) {
        waitForKeyElements('div[data-testid="playerHero"]', function( jNode ) {

            var apiTextLinkified = linkify( data ),
                toggleArea = '<pre id="toggleApiText" class="mdb-element" style="display:none">'+ apiTextLinkified +'</pre>';

            jNode.next().append( toggleArea );
            $("#toggleApiText").slideDown();
        });
    }, "text" );
}

// appendArtworkInfo
function appendArtworkInfo( artwork_max_url, imgWrapper ) {
    logFunc( "appendArtworkInfo" );

    var img = new Image();

    img.onload = function(){
        var imageWidth = this.width,
            imageHeight = this.height,
            artworkInfo = imageWidth +'&thinsp;x&thinsp;'+ imageHeight,
            artworkInfo_link = '<a href="'+artwork_max_url+'" class="mdb-artwork-img mdb-mc-text-white" target="_blank">'+artworkInfo+'</a>';

        imgWrapper.after( '<div class="mdb-artwork-input-wrapper"><input id="mdb-artwork-input" class="mdb-selectOnClick" type="text" value="'+artwork_max_url+'" />'+artworkInfo_link+'</div>' );
    };
    img.src = artwork_max_url;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * User pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Filter options
 * @DRY
 */
logVar( "urlPath(2)", urlPath(2) );

if( urlPath(2) == "uploads" || urlPath(2).replace(/\?.+$/,"") == "" ) { // https://www.mixcloud.com/Groove_Mag/?hideUsed=true
    // vars
    var getHideUsed = getURLParameter("hideUsed") == "true" ? "true" : "false",
        checkedUsed = "";
    
    if( getHideUsed == "true" ) checkedUsed = 'checked';
    
    // append filter section and param handling
    waitForKeyElements('main > section > div > ul', function( jNode ) {
        var userPageTabs = jNode,
            userPageTabs_firstText = $("li:first-of-type a span", userPageTabs).text();
        
        // is really user page?
        if( userPageTabs_firstText == "Shows" ) {
            var filterOptions = '<div id="mdb-streamActions" class="mdb-element">';
            filterOptions += '<span class="mdb-darkorange">Hide:</span>';
            filterOptions += '<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>';
            filterOptions += '</div>';
            
            userPageTabs.before( filterOptions );
            
            // reload
            var windowLocation = window.location,
                href = $(location).attr('href');

            if( typeof href != "undefined" ) {
                var url = href.replace(/\?.*$/g,"");
            }

            if( typeof url != "undefined" ) {
                $("#hideUsed").change(function(){
                    if(!this.checked) {
                        windowLocation.href = url + "?hideUsed=false";
                    } else {
                        windowLocation.href = url + "?hideUsed=true";
                    }
                });
            }
        }
    });
}

// Hiding option: each used player
waitForKeyElements('button[data-testid="audiocard-play-button"]', function( jNode ) {
    if( getHideUsed == "true" ) {
        logFunc( "Hiding used players" );

        var wrapper = jNode.parent("div").parent("div").parent("div").parent("div").parent("div"),
            playerUrl = 'https://www.mixcloud.com' + $("a", wrapper).attr("href");
        
        getToolkit( playerUrl, "hide if used", "lazy loading list", wrapper );
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Player pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Original artwork
 */
if( urlPath(2) != "" ) {
    waitForKeyElements('div[data-testid="playerHero"] img[data-in-view="true"]:not(.processed)', function( jNode ) {
        jNode.addClass("processed");

        var artwork_thumb_url = jNode.attr("src"),
            artwork_max_url = artwork_thumb_url.replace(/\/unsafe\/[0-9]+x[0-9]+\//, "/unsafe/0x0/"); /* https://community.metabrainz.org/t/is-there-a-native-optimal-size-for-cover-art-from-mixcloud/640075 */

        logVar( "artwork_max_url", artwork_max_url );

        appendArtworkInfo( artwork_max_url, jNode )
    });
}


/*
 * Action buttons
 */
if( urlPath(2) != "" ) {
    waitForKeyElements('button[aria-label="Add To"]:not(.processed)', function( jNode ) {
        jNode.addClass("processed");

        var apiUrl = url.replace( /(www\.)?mixcloud\.com/, "api.mixcloud.com" );

        // create wrappers to ensure prefered order of async created elements
        jNode.after( '<span class="mdb-apiLink-wrapper"></span><span class="mdb-durToggle-wrapper"></span><span class="mdb-tidSubmit-wrapper"></span>' );

        // add api toggle link
        var apiButton = '<a class="mdb-actionLink mdb-apiLink mdb-mc-text hand" data-apiurl="'+apiUrl+'" target="_blank">API</a>';
        logVar( "apiUrl", apiUrl );
        $(".mdb-apiLink-wrapper").after( apiButton );

        /*
         * Using API data
         */
        $.get(apiUrl, function( data ) {
            // add dur toggle
            var dur_sec = data["audio_length"],
                durToggleWrapper = getFileDetails_forToggle( dur_sec ),
                dur = convertHMS( dur_sec ),
                durToggleLink = '<a class="mdb-durToggleLink mdb-actionLink mdb-mc-text hand">'+dur+'</a>';

            // add dur button
            $(".mdb-durToggle-wrapper:not(.processed)").append( durToggleLink ).addClass("processed");

            // append toggle wrapper
            jNode.addClass("processed-dur");
            jNode.closest("div").after( '<div class="mdb-durToggle-wrapper-parent">'+durToggleWrapper+'</div>' );

            // toggle dur
            waitForKeyElements('.mdb-durToggleLink', function( jNode ) {
                jNode.click(function(){
                    log("click");
                    $("#mdb-fileDetails").toggle();
                    $("#mdb-fileDetails textarea").select().focus();
                });
            });

        }, "json" );
    });

    // api link on click
    waitForKeyElements(".mdb-apiLink", function( jNode ) {
        jNode.click(function(){
            var apiUrl = jNode.attr("data-apiurl"),
                apiToggleArea = $("#toggleApiText");

            if( apiToggleArea.length == 0 ) {
                createToggleApiArea( apiUrl );
            } else {
                ( apiToggleArea.is(':visible') ) ? apiToggleArea.slideUp() : apiToggleArea.slideDown();
            }
        });
    });
}


/*
 * Toolkit
 */
waitForKeyElements('div[data-testid="playerHero"] + div + div:not(.mdb-processed-toolkit)', function( jNode ) {
    var titleText = $("h1").text(),
        embedUrl = location.href.replace(/\?.+$/, "");
    
    getToolkit( embedUrl, "playerUrl", "detail page", jNode, "prepend", titleText, "", 1, embedUrl );

    jNode.addClass("mdb-processed-toolkit");
});