// ==UserScript==
// @name         RA (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.06.08.13
// @description  Change the look and behaviour of ra.co to help contributing to MixesDB, e.g. add player checks and artwork URLs.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/RA/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/RA/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-RA_3
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

var cacheVersion = 18,
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

function isRaPodcastEpisodePage() {
    return /^\/podcast\/\d+(?:[/?#]|$)/.test( window.location.pathname );
}

function isRaArtworkPage() {
    return isRaEventPage() || isRaPodcastEpisodePage();
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Copy buttons and MixesDB search links
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getRaMixesDbSearchUrl( searchText ) {
    return "https://www.mixesdb.com/w/index.php?title=Special:Search&search="
        + encodeURIComponent( searchText )
        + "&mode=simple&fulltext=1&profile=cats";
}

function getRaMixesDbIconUrl( width ) {
    return "https://www.mixesdb.com/w/thumb.php?f=MixesDB_logo_-_no_padding.png&width=" + width;
}

function isRaVenuePage() {
    return /^\/clubs\/\d+(?:[/?#]|$)/.test( window.location.pathname );
}

function isRaArtistPage() {
    return /^\/dj\/[^/?#]+(?:[/?#]|$)/.test( window.location.pathname );
}

function appendRaMixesDbButton( sourceNode, options ) {
    var settings = $.extend({
            buttonClass: "mdb-ra-mixesdb-control",
            iconWidth: 44,
            insertAfter: null,
            label: "Search on MixesDB"
        }, options || {}),
        sourceText = $.trim( sourceNode.text() ),
        insertAfter = settings.insertAfter ? $(settings.insertAfter) : sourceNode;

    if( !sourceText || !insertAfter.length || insertAfter.next( "." + settings.buttonClass ).length ) return;

    $( "<a>" )
        .attr({
            "aria-label": settings.label,
            href: getRaMixesDbSearchUrl( sourceText ),
            rel: "noopener noreferrer",
            target: "_blank",
            title: settings.label
        })
        .addClass( settings.buttonClass )
        .append( $( "<img>" ).attr({
            alt: "",
            height: 22,
            src: getRaMixesDbIconUrl( settings.iconWidth ),
            width: 22
        }))
        .insertAfter( insertAfter );
}

function groupRaInlineControls( sourceNode, options ) {
    var settings = $.extend({
            rowClass: "mdb-ra-copy-row",
            mixesDbClass: "mdb-ra-mixesdb-control"
        }, options || {}),
        control = sourceNode.next( ".mdb-copy-text-control" ),
        mixesDbControl = control.next( "." + settings.mixesDbClass );

    if( !control.length || sourceNode.parent().hasClass( settings.rowClass ) ) return;

    sourceNode.add( control )
        .add( mixesDbControl )
        .wrapAll( $( "<span>" ).addClass( settings.rowClass ) );
}

function appendRaInlineCopyAndMixesDbButtons( sourceNode, options ) {
    var settings = $.extend({
        copiedMessage: function( text ) {
            return "'"+ text + "' copied!";
        },
        mixesDbLabel: "Search on MixesDB",
        processedClass: "mdb-copy-text-processed",
        rowClass: "mdb-ra-copy-row",
        sourceClass: ""
    }, options || {});

    appendMdbCopyTextButton( sourceNode, {
        ariaLabel: "Copy the name",
        buttonTitle: "Copy the name",
        copiedMessage: settings.copiedMessage,
        processedClass: settings.processedClass,
        sourceClass: settings.sourceClass
    });

    appendRaMixesDbButton( sourceNode, {
        insertAfter: sourceNode.next( ".mdb-copy-text-control" ),
        label: settings.mixesDbLabel
    });

    groupRaInlineControls( sourceNode, {
        rowClass: settings.rowClass
    });
}

function appendRaEventVenueCopyButton( venueLink ) {
    if( !isRaEventPage() ) return;

    appendRaInlineCopyAndMixesDbButtons( venueLink, {
        mixesDbLabel: "Search venue on MixesDB",
        rowClass: "mdb-ra-event-venue-copy-row",
        sourceClass: "mdb-copy-text-source-ra-event-venue"
    });
}

function appendRaProfileNameCopyButton( profileName ) {
    var isVenue = isRaVenuePage(),
        isArtist = isRaArtistPage(),
        profileHeader = profileName.closest( "h1" );

    if( !isVenue && !isArtist ) return;

    if( profileName.closest( ".mdb-ra-profile-name-copy-row, .mdb-copy-text-control, .mdb-ra-mixesdb-control" ).length ) return;
    if( profileHeader.find( ".mdb-ra-profile-name-copy-row" ).length ) return;

    appendRaInlineCopyAndMixesDbButtons( profileName, {
        mixesDbLabel: isVenue ? "Search venue on MixesDB" : "Search artist on MixesDB",
        processedClass: "mdb-ra-profile-name-processed",
        rowClass: "mdb-ra-profile-name-copy-row",
        sourceClass: "mdb-copy-text-source-ra-profile-name"
    });
}

waitForKeyElements("a[data-pw-test-id='event-venue-link']:not(.mdb-copy-text-processed)", function( jNode ) {
    appendRaEventVenueCopyButton( jNode );
});

waitForKeyElements("[class*='ProfileHeader__HeaderContentWrapper'] h1 span:not(.mdb-ra-profile-name-processed):not(.mdb-ra-profile-name-copy-row):not(.mdb-copy-text-control):not(.mdb-copy-text-feedback):not(.mdb-ra-mixesdb-control)", function( jNode ) {
    appendRaProfileNameCopyButton( jNode );
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Podcast tracklist
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getRaTracklistHeadline( tracklist ) {
    var heading = tracklist.prevAll("span").filter(function() {
        return $(this).text().trim().toLowerCase() === "tracklist";
    }).first();

    if( heading.length ) return heading;

    return tracklist.closest("li").find("span").filter(function() {
        return $(this).text().trim().toLowerCase() === "tracklist";
    }).first();
}

function getRaTracklistText( tracklist ) {
    return tracklist.text()
                    .replace(/\u00A0/g, " ")
                    .split("\n")
                    .map(function( row ) {
                        return row.trim().replace(/\s{2,}/g, " ");
                    })
                    .filter(function( row ) {
                        return row !== "";
                    })
                    .map(function( row ) {
                        return "# " + row;
                    })
                    .join("\n");
}

function getRaPodcastPlayerIframe() {
    return $("iframe.mdb-processed-toolkit[src*='soundcloud.com'], iframe[src*='soundcloud.com']").first();
}

function selectRaTracklistEditor( container ) {
    var editor = $(container).find("#mixesdb-TLbox, textarea.mixesdb-TLbox").filter(":visible").first();

    if( editor.length ) {
        editor.select().focus();
    }
}

function moveRaTracklistSectionBelowPlayer( tracklist ) {
    if( !isRaPodcastEpisodePage() ) return;

    var iframe = getRaPodcastPlayerIframe();
    if( !iframe.length ) return;

    var tracklistLi = tracklist.closest("li"),
        tracklistSection = tracklistLi.children().filter(function() {
            return $.contains( this, tracklist[0] );
        }).first();

    if( !tracklistSection.length ) {
        tracklistSection = tracklist.parent();
    }

    if( tracklistSection.parent()[0] === iframe.parent()[0] && tracklistSection.index() > iframe.index() ) return;

    iframe.after( tracklistSection );
    selectRaTracklistEditor( tracklistSection );

    if( tracklistLi.length && $.trim( tracklistLi.text() ) === "" && tracklistLi.children().length === 0 ) {
        tracklistLi.remove();
    }
}

function moveRaTracklistsBelowPlayer() {
    $("ol.mdb-ra-tracklist-processed").each(function() {
        moveRaTracklistSectionBelowPlayer( $(this) );
    });
}

function appendRaTracklistEditor( tracklist ) {
    if( !isRaPodcastEpisodePage() ) return;

    var heading = getRaTracklistHeadline( tracklist );
    if( !heading.length ) return;

    var tl = getRaTracklistText( tracklist );
    if( !tl ) return;

    log( "RA tracklist before API:\n" + tl );

    var res = apiTracklist( tl, "standard" ),
        tlApi = res.text;

    if( !tlApi ) return;

    moveRaTracklistSectionBelowPlayer( tracklist );

    var editor = $(ta).addClass("mdb-ra-tracklist-editor");
    tracklist.before( editor );
    editor.find("#mixesdb-TLbox").val( tlApi );
    fixTLbox( res.feedback, editor );
}

waitForKeyElements("ol[class*='Tracklist']:not(.mdb-ra-tracklist-processed)", function( jNode ) {
    jNode.addClass("mdb-ra-tracklist-processed");
    appendRaTracklistEditor( jNode );
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Toolkit
 * Moved from Player Checker.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

setTimeout(function() {
    logFunc( "RA toolkit" );

    if( !isRaPodcastEpisodePage() ) return;

    var playerUrlItems = [ Math.max( $("iframe:visible").length, $("iframe").length ) ];
    log_playerUrlItems_len( playerUrlItems, "after timeout ("+playerUrlItems_timeout+")" );

    var max_toolboxIterations = Math.max( get_playerUrlItems_len( playerUrlItems ), 1 );
    var titleText = normalizeRaTitles( $('meta[property="og:title"]').attr("content") || "" );

    logVar( "max_toolboxIterations", max_toolboxIterations );

    waitForKeyElements("iframe:not(.mdb-processed-toolkit)", function( jNode ) {
        var iframe = jNode;
        iframe.addClass("mdb-processed-toolkit");

        getToolkit_fromIframe( iframe, "playerUrl", "detail page", "iframe.mdb-processed-toolkit:first", "before", titleText, "", max_toolboxIterations );
        moveRaTracklistsBelowPlayer();
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

function isRaEventArtwork( img ) {
    return img.parent("[class*='FullWidthStyle']").length > 0;
}

function isRaPodcastArtwork( img ) {
    var alt = img.attr("alt") || "";
    return /^RA[\s.]\d+/.test( alt );
}

function appendRaArtworkInfo( img ) {
    if( !isRaArtworkPage() ) return;
    if( isRaEventPage() && !isRaEventArtwork( img ) ) return;
    if( isRaPodcastEpisodePage() && !isRaPodcastArtwork( img ) ) return;

    var imgproxyUrl = getRaArtworkSource( img );
    if( !imgproxyUrl ) return;

    var origUrl = raImgproxyToOriginal( imgproxyUrl ),
        wrapper = createArtworkInfoWrapper( origUrl, {
            wrapperClass: "mdb-ra-artwork-info",
            inputClass: "mdb-ra-artwork-input selectOnClick",
            infoClass: "mdb-ra-artwork-size",
            readonly: true
        });

    img.closest("div").after( wrapper );
}

waitForKeyElements("div[class*='FullWidthStyle'] > img:not(.mdb-ra-artwork-processed), img[src*='imgproxy.ra.co']:not(.mdb-ra-artwork-processed), img[srcset*='imgproxy.ra.co']:not(.mdb-ra-artwork-processed)", function( jNode ) {
    jNode.addClass("mdb-ra-artwork-processed");
    appendRaArtworkInfo( jNode );
});
