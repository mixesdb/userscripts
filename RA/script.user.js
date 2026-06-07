// ==UserScript==
// @name         RA (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.06.07.2
// @description  Change the look and behaviour of ra.co to help contributing to MixesDB, e.g. add player checks and artwork URLs.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/RA/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/RA/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-RA_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-RA_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/api_funcs.js?v-RA_1
// @match        *://ra.co/*
// @match        *://*.ra.co/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ra.co
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/*
https://ra.co/news/*
https://ra.co/podcast/970
https://de.ra.co/podcast/970
https://ra.co/events/2232716
https://de.ra.co/events/2232716
*/


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 2,
    scriptName = "RA";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var playerUrlItems_timeout = 500;

function normalizeRaTitles( titleText ) {
    return titleText
               .replace( " ⟋ RA Podcast", "" )
    ;
}

function isRaEventPage() {
    return /^\/events\/\d+(?:[/?#]|$)/.test( window.location.pathname );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 * Moved from Player Checker.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

setTimeout(function() {
    logFunc( "RA toolkit" );

    var playerUrlItems = [ Math.max( $("iframe:visible").length, $("iframe").length ) ];
    log_playerUrlItems_len( playerUrlItems, "after timeout ("+playerUrlItems_timeout+")" );

    var max_toolboxIterations = Math.max( get_playerUrlItems_len( playerUrlItems ), 1 );
    var titleText = normalizeRaTitles( $('meta[property="og:title"]').attr("content") || "" );

    logVar( "max_toolboxIterations", max_toolboxIterations );

    waitForKeyElements("iframe:not(.mdb-processed-toolkit)", function( jNode ) {
        var iframe = jNode;
        iframe.addClass("mdb-processed-toolkit");

        getToolkit_fromIframe( iframe, "playerUrl", "detail page", "iframe.mdb-processed-toolkit:first", "before", titleText, "", max_toolboxIterations );
    });
}, playerUrlItems_timeout );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Event artwork
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// raImgproxyToOriginal()
// Changes ra.co img urls like https://imgproxy.ra.co/_/quality:66/w:1442/rt:fill/aHR0cHM6Ly9pbWFnZXMucmEuY28vM2MyNGI0MTA1M2M4MGFmMjliOGVjNDMzODg4ODc3Mzc1M2UzZjAyNy5qcGc= to give the original (JPG or PNG, not webp)
function raImgproxyToOriginal(url) {
    const encoded = url.split("/").pop();
    return atob(encoded);
}

function getRaArtworkSource( img ) {
    var src = img.attr("src") || ( img[0] && img[0].currentSrc ) || "";

    if( src.indexOf("imgproxy.ra.co") !== -1 ) {
        return src;
    }

    var srcset = img.attr("srcset") || "";
    if( srcset.indexOf("imgproxy.ra.co") === -1 ) {
        return "";
    }

    var candidates = srcset.split(",").map(function( candidate ) {
        return candidate.trim().split(/\s+/)[0];
    }).filter(function( candidate ) {
        return candidate.indexOf("imgproxy.ra.co") !== -1;
    });

    return candidates.length ? candidates[candidates.length - 1] : "";
}

function escapeHtmlAttr( text ) {
    return text.replace(/&/g, "&amp;")
               .replace(/"/g, "&quot;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;");
}

function appendRaArtworkInfo( img ) {
    if( !isRaEventPage() ) return;

    var imgproxyUrl = getRaArtworkSource( img );
    if( !imgproxyUrl ) return;

    var origUrl = raImgproxyToOriginal( imgproxyUrl ),
        imageType = origUrl.replace(/^.+\.([a-zA-Z]{3,4})(?:[?#].*)?$/, "$1").toUpperCase(),
        escapedOrigUrl = escapeHtmlAttr( origUrl ),
        wrapper = $('<div class="mdb-ra-artwork-info"><input class="mdb-ra-artwork-input selectOnClick" type="text" readonly value="'+escapedOrigUrl+'" /><div class="mdb-ra-artwork-size"><a href="'+escapedOrigUrl+'" target="_blank">loading…</a></div></div>');

    img.after( wrapper );

    var probe = new Image();
    probe.onload = function() {
        var artworkInfo = this.width +'&thinsp;x&thinsp;'+ this.height +' '+ imageType;
        wrapper.find(".mdb-ra-artwork-size a").html( artworkInfo );
    };
    probe.src = origUrl;
}

waitForKeyElements("div[class*='FullWidthStyle'] > img:not(.mdb-ra-artwork-processed)", function( jNode ) {
    jNode.addClass("mdb-ra-artwork-processed");
    appendRaArtworkInfo( jNode );
});
