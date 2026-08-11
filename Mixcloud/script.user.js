// ==UserScript==
// @name         Mixcloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.11.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Mixcloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Mixcloud_31
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-Mixcloud_198
// @include      http*mixcloud.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixcloud.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 23,
    scriptName = "Mixcloud";
window.scriptName = scriptName; // toolkit.js reads this global directly

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


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

        imgWrapper.after( '<div class="mdb-element mdb-artwork-input-wrapper"><input id="mdb-artwork-input" class="mdb-selectOnClick" type="text" value="'+artwork_max_url+'" />'+artworkInfo_link+'</div>' );

        // small copy button behind the artwork URL input
        appendMdbCopyTextButton( $("#mdb-artwork-input"), {
            ariaLabel: "Copy the artwork URL",
            buttonTitle: "Copy the artwork URL",
            copiedMessage: function() {
                return "Artwork URL copied!";
            },
            processedClass: "mdb-artwork-input-copy-processed"
        });
    };
    img.src = artwork_max_url;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * SPA navigation
 *
 * Mixcloud swaps the page on a click without ever loading a document, so everything that
 * reads the URL has to be re-read afterwards - see onUrlChange() in global.js. The
 * waitForKeyElements handlers further down stay registered once and are re-armed by
 * onUrlChange(), which is why they test the URL inside the handler instead of around it.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Read off the URL, so it is only valid for the page we are on right now. Script scope, not
// block scope: the "hide used players" handler below reads it too.
var getHideUsed = "false";

function runMixcloudPage() {
    logVar( "urlPath(2)", urlPath(2) );

    getHideUsed = getURLParameter("hideUsed") == "true" ? "true" : "false";
    logVar( "getHideUsed", getHideUsed );
}

onUrlChange( runMixcloudPage, { runNow: true } );

/*
 * Filter options on user pages
 * @DRY
 * https://www.mixcloud.com/Groove_Mag/?hideUsed=true
 */
waitForKeyElements('main > section > div > ul', function( jNode ) {
    // || "": urlPath(2) is undefined on mixcloud.com itself, where .replace() would throw -
    // harmless while this ran once at the top of the file, but here it would throw on every
    // poll for as long as the tab is open.
    var tab = urlPath(2) || "";

    if( tab != "uploads" && tab.replace(/\?.+$/,"") != "" ) return true;

    var userPageTabs = jNode,
        userPageTabs_firstText = $("li:first-of-type a span", userPageTabs).text();

    // is really user page?
    if( userPageTabs_firstText == "Shows" ) {
        var checkedUsed = getHideUsed == "true" ? 'checked' : "",
            filterOptions = '<div id="mdb-streamActions" class="mdb-element">';
        filterOptions += '<div id="mdb-streamActions-hide">';
        filterOptions += '<span class="mdb-darkorange">Hide:</span>';
        filterOptions += '<label class="pointer" title="Hide players that are used on MixesDB"><input type="checkbox" id="hideUsed" name="hideUsed" '+checkedUsed+' value="">Used</label>';
        filterOptions += '</div>';
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

// Hiding option: each used player
    waitForKeyElements('button[data-testid="audiocard-play-button"]', function (jNode) {
        if (getHideUsed === "true") {
            logFunc("Hiding used players");

            /* Select each player'S top wrapper (React classnames!)
            • Replaces brittle .parent("div") chains with a semantic jump using .closest().
            • Falls back to a fixed-depth hop only if the semantic selector fails.
            • Picks a sensible anchor inside the card to build the show URL, avoiding /pro/ etc.
            • Keeps your original getToolkit() call signature.

             Step 1: jump to the nearest Card wrapper (React styled-component)
             The outer node has classes like: "styles__CardWrapper-css-in-js__sc-494ggw-0 lgeAcl"
             We match by substring "CardWrapper" to survive hash/class changes.

             Stalls the webpage after hundreds of players tho
            */
            var $wrapper = jNode.closest('div[class*="CardWrapper"]');

            // Fallback (rare): if the site changes naming, hop up a fixed number of DIV ancestors.
            if (!$wrapper.length) {
                // eq(4) ≈ five levels up; adjust if needed after testing.
                $wrapper = jNode.parents('div').eq(4);
            }

            // If we still have nothing, bail out gracefully.
            if (!$wrapper.length) {
                console.warn("CardWrapper not found for node:", jNode.get(0));
                return;
            }

            /* Step 2: extract the relative show link from inside the card.
               Prefer title/artwork links that point to a show (start with "/"),
               and avoid irrelevant anchors such as "/pro/".
            */
            var relHref = $wrapper
                .find('a[href^="/"]:not([href^="/pro/"])')
                .first()
                .attr("href") || "";

            if (!relHref) {
                console.warn("No suitable anchor href found inside CardWrapper");
                return;
            }

            // Step 3: build absolute URL and pass along
            var playerUrl = "https://www.mixcloud.com" + relHref;

            getToolkit(playerUrl, "hide if used", "lazy loading list", $wrapper);
        }
    });


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Playlist pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Submit the whole playlist to TrackId.net
 * Below the playlist title row (play button, title, share), above the first player.
 * Mixcloud's class names are generated, so the row can only be reached from the play-all
 * button: button-wrapper > row with the h1 > row that also holds the share button.
 * https://www.mixcloud.com/spartacus/playlists/jazz/
 */
waitForKeyElements('div[data-testid="play-all"]', function( jNode ) {
    if( !getPlaylistPageInfo() ) return; // profile pages have a play-all button too

    // Mixcloud renders the row more than once (responsive variants), only the visible one counts
    if( !jNode.is(":visible") ) return true;

    var titleRow = jNode.closest('div[data-testid="button-wrapper"]').parent().parent();

    addTidPlaylistSubmitLink( titleRow, "after" );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Player pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Original artwork
 * The "is this a player page?" test sits INSIDE the handler: the handler is registered once
 * for the lifetime of the document and outlives any number of navigations, so asking the URL
 * around it would answer for whichever page happened to be open at script start.
 * "return true" tells waitForKeyElements the node is not dealt with yet, so it keeps
 * offering it - which is what we want if the URL only becomes a player page later.
 */
waitForKeyElements('div[data-testid="playerHero"] img[data-in-view="true"]:not(.mdb-processed-artwork)', function( jNode ) {
    if( urlPath(2) == "" ) return true;

    jNode.addClass("mdb-processed-artwork");

    var artwork_thumb_url = jNode.attr("src"),
        artwork_max_url = artwork_thumb_url.replace(/\/unsafe\/[0-9]+x[0-9]+\//, "/unsafe/0x0/"); /* https://community.metabrainz.org/t/is-there-a-native-optimal-size-for-cover-art-from-mixcloud/640075 */

    logVar( "artwork_max_url", artwork_max_url );

    appendArtworkInfo( artwork_max_url, jNode )
});


/*
 * Action buttons
 */
waitForKeyElements('button[aria-label="Add To"]:not(.mdb-processed-actions)', function( jNode ) {
    if( urlPath(2) == "" ) return true;

    jNode.addClass("mdb-processed-actions");

    // location.href, not global.js' url: that one is the address bar as it was when the
    // script started, i.e. the wrong mix after a navigation
    var apiUrl = location.href.replace( /(www\.)?mixcloud\.com/, "api.mixcloud.com" );

    // create wrappers to ensure prefered order of async created elements
    jNode.after( '<span class="mdb-element mdb-apiLink-wrapper"></span><span class="mdb-element mdb-durToggle-wrapper"></span><span class="mdb-element mdb-tidSubmit-wrapper"></span>' );

    // add api toggle link
    var apiButton = '<a class="mdb-element mdb-actionLink mdb-apiLink mdb-mc-text hand" data-apiurl="'+apiUrl+'" target="_blank">API</a>';
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
            durToggleLink = '<a class="mdb-element mdb-durToggleLink mdb-actionLink mdb-mc-text hand">'+dur+'</a>';

        // add dur button
        $(".mdb-durToggle-wrapper:not(.mdb-processed-durToggle)").append( durToggleLink ).addClass("mdb-processed-durToggle");

        // append toggle wrapper
        jNode.addClass("mdb-processed-dur");
        jNode.closest("div").after( '<div class="mdb-element mdb-durToggle-wrapper-parent">'+durToggleWrapper+'</div>' );

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


/*
 * Toolkit
 */
waitForKeyElements('div[data-testid="playerHero"] + div + div:not(.mdb-processed-toolkit)', function( jNode ) {
    var titleText = $("h1").text(),
        embedUrl = location.href.replace(/\?.+$/, "");
    
    getToolkit( embedUrl, "playerUrl", "detail page", jNode, "prepend", titleText, "", 1, embedUrl );

    jNode.addClass("mdb-processed-toolkit");
});

})();