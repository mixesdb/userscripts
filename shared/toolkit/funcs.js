/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Vars and funcs that cannot live in global.js
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "shared/toolkit/funcs.js: started executing" );

/*
 * Link targets in toolkit HTML
 *
 * Every link we generate must carry an explicit target="_top".
 *
 * Since the ~Aug 2026 SoundCloud redesign the toolkit is rendered *inside* a nested
 * browsing context (iframe#__WEBI_IFRAME_PRELOADED__, see SoundCloud/script.user.js
 * "Frame handling"). A link without a target defaults to _self, so it replaced the
 * SoundCloud frame's content with MixesDB while the address bar kept showing the
 * soundcloud.com track URL - the page could not be bookmarked or shared, and because
 * the frame then became cross-origin the userscript lost all access to it.
 *
 * _top navigates the tab itself, i.e. it leaves the frame while still opening in the
 * same tab, which keeps the new-tab decision with the user (cmd/ctrl/middle-click).
 * Outside a frame _top is identical to _self, so this is a no-op for every other site
 * the toolkit runs on.
 */

// regExp
//const regExp_numbers = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/; // https://stackoverflow.com/questions/1272696

/*
 * changeYoutubeUrlVariant - cannot live in global.js!
 */
function changeYoutubeUrlVariant(url, variant = "youtube.com") {
    let videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

    if (!videoIdMatch) return null; // Return null if no valid YouTube ID found

    let videoId = videoIdMatch[1];

    if (variant === "youtu.be") {
        return 'https://youtu.be/'+videoId;
    } else {
        return 'https://www.youtube.com/watch?v='+videoId;
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Grab URLs from player iframes
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/*
 * extractUrlFromUrlParameter()
 * "https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra996-ron-trent&color=1a1a1a" returns "https://soundcloud.com/resident-advisor/ra996-ron-trent"
 * "https://soundcloud.com/resident-advisor/ra996-ron-trent" returns unchanged
 */
function extractUrlFromUrlParameter( fullUrl ) {
    logFunc( "extractUrlFromUrlParameter" );
    logVar( "fullUrl", fullUrl );

    try {
        var parsedUrl = new URL( fullUrl, window.location.href );
        var urlParam = parsedUrl.searchParams.get( "url" );

        if( urlParam ) {
            return decodeURIComponent( urlParam );
        }
    } catch( error ) {
        log( "extractUrlFromUrlParameter: URL parser failed" );
    }

    var match = fullUrl.match(/[?&]url=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : fullUrl;
}

// ensureTrailingSlash
function ensureTrailingSlash( url ) {
    return url.replace(/\/?$/, '/');
}

// normalizeSiteDomain
// Same site, other hostname: the Embed URL check below asks "does this player belong to the
// page we are on?", and a site whose player URLs live on a second domain of its own would
// answer that wrongly on a plain string comparison.
// YouTube is the case: the toolkit hands the player around as https://youtu.be/<id>
// everywhere (see getToolkit_fromIframe), while the page itself is on youtube.com - plus
// m./music. subdomains, which the YouTube script's @match lets in as well.
function normalizeSiteDomain( domain ) {
    if( !domain ) {
        return domain;
    }

    if( domain == "youtu.be" || /^([^.]+\.)?youtube(-nocookie)?\.com$/.test( domain ) ) {
        return "youtube.com";
    }

    return domain;
}

// shouldShowEmbedUrl
// Only show the URL of a player that IS this page - an embed URL from another domain
// describes a foreign player (e.g. a SoundCloud widget on 1001tracklists.com), which is
// nothing the visitor can copy into a MixesDB page from here.
function shouldShowEmbedUrl( embedUrl ) {
    if( !embedUrl || visitDomain == "trackid.net" ) {
        return false;
    }

    var embedDomain = getDomain_fromUrlStr( embedUrl );

    if( !embedDomain ) {
        return false;
    }

    return normalizeSiteDomain( visitDomain.replace("www.", "") ) == normalizeSiteDomain( embedDomain );
}

// removeTrackingParameters
// Removes URL parameters from SoundCloud URLs, keeps other domains unchanged.
function removeTrackingParameters( url ) {
    if( !url || getDomain_fromUrlStr( url ) != "soundcloud.com" ) {
        return url;
    }

    return ensureTrailingSlash( removeParametersFromUrl( url ) );
}

/*
 * getToolkit_fromSCscUrl_api
 * Takes API track URL
 * Call API to the user/title URL as used on MixesDB
 * Pass that URL to getToolkit()
 */
function getToolkit_fromScUrl_api( scUrl_api="", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, siteHasTl="", playerOrder=0 ) {
    logFunc( "getToolkit_fromSCscUrl_api" );

    if( scUrl_api ) {
        getScAccessTokenFromApi(function(output){
            var scAccessToken = output;

            $.ajax({
                beforeSend: function(request) {
                    request.setRequestHeader( "Authorization", "OAuth " + scAccessToken );
                },
                dataType: "json",
                url: scUrl_api,
                success: function( data ) {
                    var playerUrl = data.permalink_url;
                    log( "getToolkit_fromScUrl_api: resolved playerUrl: " + playerUrl );
                    if( playerUrl != "" ) {
                        getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "", siteHasTl, playerOrder );
                    }
                },
                error: function( jqXHR, textStatus, errorThrown ) {
                    log( "getToolkit_fromScUrl_api: FAILED to resolve SC API URL (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + "): " + scUrl_api );
                }
            });
        });
    }
}

/*
 * getToolkit_fromIframe
 * Expect various iframes, try to get the URL that is used for embedding on MixesDB
 * SoundCloud: Usually has track API URL, needs to call API and fire getToolkit from ajax result
 * Thus all the parameters for getToolkit() must be carried around
 */
var toolkitPlayerOrderCounter = 0;

function getToolkitPlayerOrder( iframe ) {
    var iframe_jNode = $(iframe),
        playerOrder = parseInt( iframe_jNode.attr("data-mdb-playerorder"), 10 );

    if( isNaN(playerOrder) ) {
        toolkitPlayerOrderCounter = toolkitPlayerOrderCounter + 1;
        playerOrder = toolkitPlayerOrderCounter;
        iframe_jNode.attr("data-mdb-playerorder", playerOrder);
    }

    return playerOrder;
}

function getToolkit_fromIframe( iframe, type="playerUrl", outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1, siteHasTl="" ) {
    logFunc( "getplayerUrl_fromIframe" );

    var playerOrder = getToolkitPlayerOrder( iframe ),
        srcUrl = iframe.attr("src"),
        playerUrl = "";

    logVar( "srcUrl", srcUrl );

    // SoundCloud
    if( /.+soundcloud\.com.+/.test(srcUrl) ) {
        log( "iframe is SoundCloud" );

        // api.soundcloud.com or soundcloud.com/[key]
        if( /.+api\.soundcloud\.com.+/.test(srcUrl) ) {
            // https://w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/2007972247&show_artwork=true&color=%23ff5500&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true
            // https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/2020102693%3Fsecret_token%3Ds-vhhWvBuKaYu&color=%23ebebeb&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true
            // https://w.soundcloud.com/player/?visual=true&url=https:%2F%2Fapi.soundcloud.com%2Ftracks%2F1680484035&show_artwork=true&maxheight=1000&maxwidth=708

            // expect api URL, e.g. https://api.soundcloud.com/tracks/2007972247
            var scUrl_api = extractUrlFromUrlParameter( srcUrl );
            logVar( "scUrl_api", scUrl_api );

            // Sanity check: if URL points to a SoundCloud API resource (track, playlist, etc.)
            if( /^https:\/\/(api\.)?soundcloud\.com\/.+/.test(scUrl_api) ) {
                // call SC API to get user/title URL
                getToolkit_fromScUrl_api( scUrl_api, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, siteHasTl, playerOrder );
            }

        } else {
            // https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra970-upsammy/&color=1a1a1a&theme_color=000000&auto_play=false&show_artwork=false&show_playcount=false&download=false&liking=false&sharing=false
            // https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra996-ron-trent&color=1a1a1a&theme_color=000000&auto_play=false&show_artwork=false&show_playcount=false&download=false&liking=false&sharing=false

            var scUrl_key = ensureTrailingSlash( extractUrlFromUrlParameter( srcUrl ) );
            logVar( "scUrl_key", scUrl_key );

            // Sanity check: if URL has /user/track
            if( /^https:\/\/(www\.)?soundcloud\.com\/[^/]+\/[^/?#]+\/?$/.test(scUrl_key) ) {
                getToolkit( scUrl_key, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "", siteHasTl, playerOrder );
            }
        }
    }

    // hearthis.at
    if( /.+hearthis\.at.+/.test(srcUrl) ) {
        // https://hearthis.at/embed/11715760/transparent_black/?hcolor=&color=&style=2&block_size=2&block_space=1&background=1&waveform=0&cover=0&autoplay=0&css=allowtransparency&partner=35

        playerUrl = srcUrl.replace( /^(http.+hearthis\.at)(\/embed\/)(\d+)(\/.+)$/, "$1/$3/" );

        if( playerUrl ) {
            getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "", siteHasTl, playerOrder );
        }
    }

    // Mixcloud
    if( /.+mixcloud\.com.+/.test(srcUrl) ) {
        // https://www.mixcloud.com/widget/iframe/?feed=https%3A%2F%2Fwww.mixcloud.com%2Fbeenoisetv%2Fa-cup-of-thea-episode-221-with-serena-thunderbolt%2F&amp;hide_cover=1
        // https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2FGroove_Mag%2Fgroove-podcast-447-albert-van-abbe%2F

        var mcUrl = decodeURIComponent( srcUrl )
                        .replace( /^(.+(?:\?|&)feed=)(.+)(&hide.+|\/)$/, "$2" )
                    ;
        logVar( "mcUrl", mcUrl );

        if( !mcUrl.match(/^https:\/\/(www\.)?mixcloud\.com/) ) { // '/Groove_Mag/groove-podcast-447-albert-van-abbe'
            mcUrl = "https://www.mixcloud.com" + mcUrl;
        }

        if( mcUrl ) {
            getToolkit( mcUrl, "playerUrl", "detail page", wrapper, insertType, titleText, "", max_toolboxIterations, "", siteHasTl, playerOrder );
        }
    }

    // YouTube
    if(  /.+youtube(-nocookie)?\.com.+/.test(srcUrl) || /.+youtu\.be.+/.test(srcUrl) ) {
        // https://www.youtube-nocookie.com/embed/iis0YFkPcn0?start=0&amp;origin=https%3A%2F%2Fwww.1001tracklists.com&amp;playsinline=1&amp;enablejsapi=1&amp;widgetid=1

        playerUrl = "https://youtu.be/" + getYoutubeIdFromUrl( srcUrl ) ;

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, insertType, titleText, "", max_toolboxIterations, "", siteHasTl, playerOrder );
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit helpers
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// remove_mdbVariant_fromUrlStr
function remove_mdbVariant_fromUrlStr( thisUrl ) {
    return thisUrl.replace( /^(.+)(\?mdb-variant=.+&mdb-variantType=.+)$/, "$1" );
}

// get_mdbVariant_fromUrlStr
function get_mdbVariant_fromUrlStr( thisUrl ) {
    return thisUrl.replace( /^(.+\?mdb-variant=)(.+)(&mdb-variantType=.+)$/, "$2" );
}

// get_mdbVariantType_fromUrlStr
function get_mdbVariantType_fromUrlStr( thisUrl ) {
    return thisUrl.replace( /^(.+&mdb-variantType=)(.+)$/, "$2" );
}

// get_playerUrlItems_len
function get_playerUrlItems_len( playerUrlItems ) {
    var playerUrlItems_len = 0;

    $.each( playerUrlItems, function( index, num ) {
        playerUrlItems_len += num;
    });

    return playerUrlItems_len
}

// log_playerUrlItems_len
function log_playerUrlItems_len( playerUrlItems, info="" ) {
    var playerUrlItems_len = get_playerUrlItems_len( playerUrlItems );

    logVar( "playerUrlItems_len "+info, playerUrlItems_len );
}

// makeMixesdbPageUrl_fromId
function makeMixesdbPageUrl_fromId( pageid ) {
    return "https://www.mixesdb.com/w/?curid="+pageid;
}

// makeMixesdbSearchUrl
function makeMixesdbSearchUrl( text ) {
    var text_normalized = normalizeTitleForSearch( text ),
        searchUrl = 'https://www.mixesdb.com/w/index.php?title=&search=' + encodeURIComponent(text_normalized);

    return searchUrl;
}

// make_mdbTrackidCheck_input
function make_mdbTrackidCheck_input( tidPlayerUrl, mdbPageId, target="detail page" ) {
    var output = '<input id="mdbTrackidCheck-label" class="mdbTrackidCheck" type="checkbox" data-tidplayerurl="'+tidPlayerUrl+'" data-mdbpageid="'+mdbPageId+'">';

    if( target == "detail page" ) {
        output += '<label for="mdbTrackidCheck-label" class="hand">TID tracklist is integrated</label>&nbsp;'+mdbTooltip("(?)", "Mark this TrackId.net tracklist as integrated to the tracklist of the linked MixesDB page.");
    }

    return output;
}

// toolkit_tlStatusFromFeedback
// What the Tracklist Editor said about ONE feedback box: "incomplete", "complete", or "" when
// it said neither.
//
// Read from the box's TEXT, not from its list items as this used to be. The API only builds a
// list when it has more to say about the tracklist; one it is happy with is answered with a
// bare line instead ("The tracklist seems valid and complete." - see tlBoxTopInfoList() in
// tracklist_editor/funcs.js), and the list-only reading never saw that one. So the state that
// is worth carrying over to MixesDB the most - a complete tracklist - was the one the EDIT
// links never got.
function toolkit_tlStatusFromFeedback( box ) {
    var match = String( $(box).text() ).match( /tracklist seems (?:to be )?valid and (incomplete|complete)/i );

    return match ? match[1].toLowerCase() : "";
}

// toolkit_getSiteHasTlStatus
function toolkit_getSiteHasTlStatus() {
    // a state picked by hand outranks whatever the API last said - see the state buttons below
    if( toolkit_tlStatePicked() ) {
        return toolkit_tlStatePicked();
    }

    var status = "";

    $("#tlEditor-feedback, ul.tlEditor-feedback-topInfo, ul#tlEditor-feedback-topInfo").each(function () {
        status = toolkit_tlStatusFromFeedback( this );

        if( status ) return false;
    });

    return status;
}

// toolkit_getSiteHasTlParam
function toolkit_getSiteHasTlParam( siteHasTl="" ) {
    var status = siteHasTl;

    if( siteHasTl == "auto" ) {
        status = toolkit_getSiteHasTlStatus();
    }//get

    if( /^(incomplete|complete)$/.test(status) ) {
        return status;
    }

    return "";
}

// toolkit_updateEditLinksSiteHasTl
function toolkit_updateEditLinksSiteHasTl( fromSite="", siteHasTl="" ) {
    var status = toolkit_getSiteHasTlParam( siteHasTl );

    if( !status ) {
        return;
    }

    $("a.mdb-mixesdbLink.edit").each(function () {
        var editLink = $(this),
            href = editLink.attr("href") || "";

        if( !href ) {
            return;
        }

        if( fromSite != "" && href.indexOf("fromSite=" + fromSite) === -1 ) {
            return;
        }

        href = href.replace(/&siteHasTl=(incomplete|complete)/g, "");
        href = href.replace(/(fromSite=[^&]+)/, "$1&siteHasTl=" + status);

        editLink.attr("href", href);
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The tracklist state buttons
 *
 * MixesDB's edit page carries three of them under the edit box (#afterTextbox1): none,
 * incomplete, complete - the [[Category:Tracklist: ...]] the page is filed under, the one that
 * applies lit and the other two dimmed. Two of the three are repeated in the chip row of every
 * Tracklist Editor feedback box we put on a player site, at the chips' own height, because
 * that is where the state is DECIDED: the toolkit's EDIT links carry it to MixesDB as
 * &siteHasTl=..., and the block at the end of this file presets the category from it once the
 * edit page opens.
 *
 * "none" is not repeated. A box only exists where a tracklist was found, so that button could
 * never be anything but the dark one of the row.
 *
 * Until one is clicked the state is READ from the feedback ("The tracklist seems valid and
 * complete.") - which is what the EDIT links did before the buttons existed, so a reader who
 * never touches them sees what was already happening. A click PINS it: from then on the pick
 * is what the links carry and a later API answer no longer moves it. The reader knows things
 * about the mix the formatter cannot see - a tracklist that is complete although half of it
 * is "?", a "complete" one that stops an hour before the mix does.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// toolkit_tlStatePicked
// What a click picked, "" while the feedback is still what decides.
//
// Kept on the feedback box rather than in a variable of ours, because that is the lifetime the
// pick has: it is about THIS tracklist. A re-rendered answer only swaps the box's CONTENT, so
// the pick survives it - and on the single-page sites the box is taken down on navigation
// (mdbResetForNewPage() in global.js removes #tlEditor), so the pick cannot follow the reader
// to the next mix, which a variable of ours would have done.
function toolkit_tlStatePicked() {
    return $("#tlEditor-feedback").first().attr( "data-mdb-tlstate-picked" ) || "";
}

// the two states the buttons offer, in the order MixesDB shows them in
var toolkit_tlStates = [
    {
        state: "incomplete",
        title: "The tracklist is INCOMPLETE.\nClick to say so yourself: the MixesDB EDIT links then file the page under [[Category:Tracklist: incomplete]], whatever the check above says."
    },
    {
        state: "complete",
        title: "The tracklist is COMPLETE.\nClick to say so yourself: the MixesDB EDIT links then file the page under [[Category:Tracklist: complete]], whatever the check above says."
    }
];

// toolkit_tlStateIcon
// MixesDB draws these with Font Awesome (fa-question-circle, fa-check-circle): a filled circle
// with the glyph knocked white out of it. Font Awesome is loaded on MixesDB and on none of the
// player sites, so the same two shapes are drawn here rather than asked for by class name.
// currentColor, so the colour is the button's and the dimming is one opacity on the button.
function toolkit_tlStateIcon( state ) {
    var glyph = state == "complete"
        ? '<path d="M4.6 8.4l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M5.9 6.3C5.9 4.6 10.1 4.6 10.1 6.4 10.1 7.9 8 8.2 8 9.9" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="#fff"/>';

    return '<svg class="mdb-tlEditor-tlState-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="currentColor"/>' + glyph + '</svg>';
}

// toolkit_tlStateButtons
// Puts the row into every feedback box on the page, or re-lights the one already there. Called
// on every feedback render (tlBoxShowApiCount() in tracklist_editor/funcs.js, which rebuilds
// the box from the API's HTML and would otherwise take the row off the page with it) and when
// a box first appears, which is what lights the right icon on load.
function toolkit_tlStateButtons() {
    // MixesDB has the real ones under its edit box: a second row for the same category on the
    // same page would be one row too many, and the EDIT links this one drives are not there.
    if( typeof domain !== "undefined" && domain == "mixesdb.com" ) {
        return;
    }

    $("#tlEditor-feedback").each(function() {
        var box = $(this),
            state = ( box.attr( "data-mdb-tlstate-picked" ) || "" ) || toolkit_tlStatusFromFeedback( box ),
            row = box.children( ".mdb-tlEditor-tlState" ).first();

        if( !row.length ) {
            row = $("<div>").addClass( "mdb-tlEditor-tlState mdb-element" );

            $.each( toolkit_tlStates, function( i, def ) {
                row.append(
                    $("<span>")
                        .addClass( "mdb-tlEditor-tlState-button mdb-tlEditor-tlState-" + def.state )
                        .attr( "data-mdb-tlstate", def.state )
                        .attr( "title", def.title )
                        .html( toolkit_tlStateIcon( def.state ) )
                        .on( "click", function() {
                            box.attr( "data-mdb-tlstate-picked", def.state );

                            log( "toolkit_tlStateButtons: \"" + def.state + "\" picked by hand - the EDIT links carry it from here." );

                            toolkit_tlStateButtons();
                            toolkit_updateEditLinksSiteHasTl( typeof domain !== "undefined" ? domain : "", "auto" );
                        })
                );
            });

            // Into the chip row, on the outer side of the API's "N rows" chip: they all float
            // right, so the earlier one in the box is the one further right. A row of their
            // own under the message cost a whole line of box for two icons - and the box is
            // ONE line tall whenever the answer is ("The tracklist seems valid and complete.").
            var rows = box.find( "#tlEditor-feedback-rows" ).first();

            if( rows.length ) rows.before( row ); else box.prepend( row );
        }

        row.children( ".mdb-tlEditor-tlState-button" ).each(function() {
            var button = $(this);

            button.toggleClass( "mdb-tlEditor-tlState-on", button.attr( "data-mdb-tlstate" ) == state );
        });
    });
}

// makeMixesdbLink_fromId
function makeMixesdbLink_fromId( mdbPageId, title="MixesDB", className="", lastEditTimestamp="", from="", visitDomain="", siteHasTl="" ) {
    // normal link
    // https://www.mixesdb.com/w/?curid=613340
    var editSummary = "",
        mixesdbUrl = makeMixesdbPageUrl_fromId( mdbPageId ),
        output = '<a href="'+mixesdbUrl+'" class="mdb-mixesdbLink mixPage '+className+'" target="_top">'+title+'</a>';

    if( lastEditTimestamp != "" ) {
        var localDate_long = convertUTCDateToLocalDate( new Date(lastEditTimestamp) ),
            localDate_ago = $.timeago( lastEditTimestamp ).replace( /^about /i, "" );

        console.log( "localDate_long: " + localDate_long );
        console.log( "localDate_ago: " + localDate_ago );
    }

    if( visitDomain == "trackid.net" ) editSummary = "TrackId.net tracklist integration of " + window.location.href;

    var tidPlayerUrl = $("img.artwork").closest("a").attr("href");

    var siteHasTl_linkParam = toolkit_getSiteHasTlParam( siteHasTl ),
        editUrl = mixesdbUrl+'&action=edit&from='+from+'&fromSite='+visitDomain+'&summary='+editSummary;

    if( siteHasTl_linkParam != "" ) {
        editUrl += '&siteHasTl=' + siteHasTl_linkParam;
    }

    // action links: edit hist
    output += '<span class="mdb-mixesdbLink-actionLinks-wrapper">';
    output += '<a href="'+editUrl+'" class="mdb-mixesdbLink edit" target="_blank">EDIT</a>'; // edit link https://www.mixesdb.com/w/?curid=613340&action=edit
    output += '<a href="'+mixesdbUrl+'&action=history" class="mdb-mixesdbLink history" target="_blank">HIST'; // history link https://www.mixesdb.com/w/?curid=613340&action=history
    if( localDate_ago && localDate_long ) {
        output += ' <span class="mdb-mixesdbLink lastEdit" data-lastedittimestamp="'+lastEditTimestamp+'">('+mdbTooltip( localDate_ago, "Last edit: " + localDate_long )+')</span>';
    }
    output += '</a>';
    output += '<span id="mdbTrackidCheck-wrapper" style="display: none;">';

    output += make_mdbTrackidCheck_input( tidPlayerUrl, mdbPageId, "detail page" );

    output += '</span>';

    return output;
}

// mixesdbPlayerUsage
function mixesdbPlayerUsage_keywords( playerUrl ) {
    logFunc( "mixesdbPlayerUsage" );
    logVar( "playerUrl", playerUrl );

    var playerUrl_domain = playerUrl.hostname,
        playerUrl_normalized = normalizePlayerUrl( playerUrl ),
        keywords = playerUrl_normalized;

    logVar( "playerUrl_normalized", playerUrl_normalized );
    logVar( "keywords", keywords );

    return keywords;
}

// containsSpecialCharacters
// URLs without https://
function containsSpecialCharacters( text ) {
    var regex = /^[a-zA-Z0-9-_\/.]+$/;
    return !regex.test( text );
}

// apiUrl_searchKeywords_fromUrl
function apiUrl_searchKeywords_fromUrl( thisUrl ) {
    logFunc( "apiUrl_searchKeywords_fromUrl", apiUrl_searchKeywords_fromUrl );
    logVar( "thisUrl", thisUrl );

    var keywords = mixesdbPlayerUsage_keywords( thisUrl );

    return 'https://www.mixesdb.com/w/api.php?action=mixesdb_player_search&format=json&url='+keywords;
}

// makeAvailableLinksListItem
function makeAvailableLinksListItem( playerUrl, titleText="", usage="", class_solvedUrlVariants, playerOrder=0 ) {
    var playerUrl_clean = removeTrackingParameters( remove_mdbVariant_fromUrlStr( playerUrl ) ),
        playerUrl_domain = getDomain_fromUrlStr( playerUrl ),
        link = '<li class="mdb-toolkit-playerUrls-item '+usage+' filled '+class_solvedUrlVariants+'" data-playerorder="'+playerOrder+'">';

    var domainIcon = '<img class="mdb-domainIcon" src="https://www.google.com/s2/favicons?sz=64&domain='+playerUrl_domain+'">';

    link += '<a href="'+playerUrl_clean+'" class="mdb-domainIconLink" target="_top">'+domainIcon+'</a>';
    link += '<a href="'+playerUrl_clean+'" class="mdb-actualPlayerLink" data-urlwithvariant="'+playerUrl+'" target="_top">' + playerUrl_clean + '</a>'; // do not shorten link text (for copy-paste)

    log( "urlIsTidSubmitCompatible( playerUrl ): " + urlIsTidSubmitCompatible( playerUrl ) )

    if( visitDomain != "trackid.net" && urlIsTidSubmitCompatible( playerUrl ) ) {
        link += makeTidSubmitLink( playerUrl_clean, titleText, "link-icon" ) ;
    }

    link += '</li>';

    return link;
}

function reorderToolkitPlayerUrlListItems( wrapper ) {
    var wrapper_jq = $(wrapper),
        list_jq = $("> ul", wrapper_jq),
        listItems_jq = $("> li.mdb-toolkit-playerUrls-item", list_jq);

    listItems_jq.sort(function(a, b) {
        var orderA = parseInt( $(a).attr("data-playerorder"), 10 ),
            orderB = parseInt( $(b).attr("data-playerorder"), 10 );

        if( isNaN(orderA) ) {
            orderA = Number.MAX_SAFE_INTEGER;
        }

        if( isNaN(orderB) ) {
            orderB = Number.MAX_SAFE_INTEGER;
        }

        return orderA - orderB;
    }).appendTo( list_jq );
}

// pageCreated_vs_lastEdit
// takes UTC timestamps
function pageCreated_vs_lastEdit( pageCreationTimestamp, lastEditTimestamp ) {
    if( pageCreationTimestamp && lastEditTimestamp ) {
        logVar( "pageCreationTimestamp", pageCreationTimestamp );
        logVar( "lastEditTimestamp", lastEditTimestamp );

        var pageCreationTimestamp_newDate = new Date( pageCreationTimestamp );
        var lastEditTimestamp_newDate = new Date( lastEditTimestamp );

        var pageCreationTimestamp_newDate_getTime = new Date(pageCreationTimestamp_newDate).getTime();
        var lastEditTimestamp_newDate_getTime = new Date(lastEditTimestamp_newDate).getTime();

        console.log( "pageCreationTimestamp_newDate_getTime: " + pageCreationTimestamp_newDate_getTime );
        console.log( "lastEditTimestamp_newDate_getTime: " + lastEditTimestamp_newDate_getTime );

        if( pageCreationTimestamp_newDate_getTime >= lastEditTimestamp_newDate_getTime ) {
            $("#mdb-pageCreatedAfterLastPageEdit").remove();
            $("#mdb-toolkit > ul").append('<li id="mdb-pageCreatedAfterLastPageEdit" class="filled">'+mdbTooltip( "This page was created after the MixesDB page was last edited.", "It is likely that you can enrich the MixesDB tracklist with this page's tracklist." )+'</li>');
        } else {
            console.log( "This page was created before the last MixesDB page edit." );
        }
    }
}

/*
 * getToolkit
 * Gating URLs before running actual func
 * E.g. URL variants: take 1 url, create 2nd variant, send each to getToolkit_func
 */
function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1, embedUrl="", siteHasTl="", playerOrder=0 ) {
    logFunc( "getToolkit" );

    var urlDomain = getDomain_fromUrlStr( thisUrl );

    logVar( "thisUrl", thisUrl );
    logVar( "urlDomain", urlDomain );

    if( urlDomain == "hearthis.at" ) {
        var toolkitUrls = [];

        if( !embedUrl && isHearthisIdUrl(thisUrl) ) {
            embedUrl = thisUrl;
        }

        toolkitUrls.push( thisUrl );

        if( embedUrl && embedUrl != thisUrl ) {
            log( "hearthis.at embed URL was provided by caller." );
            toolkitUrls.push( embedUrl );
            toolkitUrls = array_unique( toolkitUrls );
            logVar( "toolkitUrls", JSON.stringify(toolkitUrls) );

            $.each( toolkitUrls, function( index, toolkitUrl ) {
                getToolkit_run( toolkitUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl, siteHasTl, playerOrder );
            });
        } else {
            $.ajax({
                url: thisUrl,
                success: function() {
                    if( urlDomain == "hearthis.at" ) {
                        log( "hearthis.at ok" );

                        var matches_id = arguments[0].match( /<meta property="hearthis:embed:id" content="(\d+)"/m );

                        if( matches_id && matches_id[1] ) {
                            embedUrl = "https://hearthis.at/" + matches_id[1] + "/";
                            logVar( "embedUrl", embedUrl );
                        }

                        if( embedUrl && embedUrl != thisUrl ) {
                            toolkitUrls.push( embedUrl );
                        }

                        toolkitUrls = array_unique( toolkitUrls );
                        logVar( "toolkitUrls", JSON.stringify(toolkitUrls) );

                        $.each( toolkitUrls, function( index, toolkitUrl ) {
                            getToolkit_run( toolkitUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl, siteHasTl, playerOrder );
                        });
                    }
                }
            });
        }
    } else {
        getToolkit_run( thisUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl, siteHasTl, playerOrder );
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit_run
 * TODO: type == "playerListItem" to ouput only a link icon if player is used
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var toolboxIteration = 0; // count iterations for multiple iframes

function getToolkit_run( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1, embedUrl="", siteHasTl="", playerOrder=0 ) {
    logFunc( "getToolkit_run" );
    // types: "playerUrl", "hide if used"

    toolboxIteration = toolboxIteration + 1;

    logFunc( "getToolkit" );
    logVar( "toolboxIteration", toolboxIteration );
    logVar( "thisUrl", thisUrl );
    logVar( "type", type );
    logVar( "outputType", outputType );
    logVar( "titleText", titleText );

    var addOutput = true,
        output = null,
        thisUrl_forApi = thisUrl,
        playerUrl_possibleUsageVariants = 1,
        domain = getDomain_fromUrlStr( thisUrl );

    logVar( "thisUrl", thisUrl );
    logVar( "domain", domain );
    //logVar( "domain_cssSafe", domain_cssSafe );
    logVar( "thisUrl_forApi", thisUrl_forApi );

    if( type == "hide if used" ) {
        addOutput = false;
    }

    // userscript Player Checker inserts before first fitting iframe
    if (wrapper === "iframe.mdb-processed-toolkit:first") {
        wrapper = $("iframe.mdb-processed-toolkit").first();
    } else {
        wrapper = $(wrapper);
    }

    // output wrapper
    // allow multiple same class li (when multiple players are checked, e.g. 1001)
    var toolkitOutput = "";

    // output wrapper with empty list
    // fill list with later results
    // allow multiple iterations to add list items
    //
    // Build the shell whenever it is actually missing from the DOM, not just on the very first
    // call (toolboxIteration == 1). toolboxIteration is a module-global counter that never
    // resets, so gating on it alone used to mean the #mdb-toolkit shell was only ever built once
    // per whole page load - if the wrapper it lived in got wiped later (e.g. SoundCloud's own
    // React re-render tearing down and recreating #mdb-sc-trackExtras), every later call saw
    // toolboxIteration != 1 and silently did nothing, leaving the toolkit gone for good. Checking
    // live DOM presence instead still lets multiple iframes on one page share a single shell
    // (present -> just append <li> items below) while also recovering when a previous shell was
    // destroyed (missing -> rebuild it, regardless of iteration count).
    var toolkitShellMissing = $("#mdb-toolkit").length === 0;

    if( addOutput ) {
        if( toolkitShellMissing ) {
            if( toolboxIteration != 1 ) {
                log( "getToolkit_run: toolboxIteration is " + toolboxIteration + " (not 1) but #mdb-toolkit is NOT in the DOM - (re)creating the toolkit shell now anyway." );
            }

            toolkitOutput += '<fieldset id="mdb-toolkit" class="mdb-toolkit '+domain_cssSafe+'">';
            toolkitOutput += '<legend>Toolkit</legend>';
            toolkitOutput += '<div id="mdb-toolkit_waiter" style="display:none"></div>';
            toolkitOutput += '<ul style="display:none">';
            toolkitOutput += '</ul>';
            toolkitOutput += '</fieldset>';

            // add output
            switch( insertType ) {
                case "before":
                    wrapper.before( toolkitOutput );
                    break;
                case "prepend":
                    wrapper.prepend( toolkitOutput );
                    break;
                case "append":
                    wrapper.append( toolkitOutput );
                    break;
                case "after":
                    wrapper.after( toolkitOutput );
                    break;
            }
        }

        var toolkitOutput_li = '';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-usageLink used"></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-usageLink unused"></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-tidLink"></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-playerUrls used">Used players:<ul class="mdb-nolist"></ul></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-playerUrls unused">Unused players:<ul class="mdb-nolist"></ul></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-playerUrls unclear">';
        toolkitOutput_li += mdbTooltip( "Unclear if players are used", "To find out visit the page if a userscript with toolkit exists for that website." );
        toolkitOutput_li += ':<ul class="mdb-nolist"></ul>';
        toolkitOutput_li += '</li>';

        // embedUrl
        if( shouldShowEmbedUrl( embedUrl ) ) {
            var embedUrl_len = embedUrl.length;
            toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-embedUrl filled">Embed URL: ';
            toolkitOutput_li += '<input class="mdb-element inline mdb-selectOnClick mono" type="text" value="'+embedUrl+'" size="'+embedUrl_len+'" />';
            toolkitOutput_li += '</li>';
        }

        $("#mdb-toolkit > ul").append( toolkitOutput_li );

        // small copy button behind the Embed URL input
        $("#mdb-toolkit > ul > li.mdb-toolkit-embedUrl.filled input").each(function() {
            appendMdbCopyTextButton( $(this), {
                ariaLabel: "Copy the embed URL",
                buttonTitle: "Copy the embed URL",
                copiedMessage: function() {
                    return "Embed URL copied!";
                },
                processedClass: "mdb-toolkit-embedUrl-copy-processed"
            });
        });
    }

    /*
     * playerURL domain exceptions
     */
    var runAPIcall = true;

    if( titleText != "" ) {
        var searchTitleLink = '<a class="'+linkClass+'" href="'+makeMixesdbSearchUrl( titleText )+'" target="_blank">Search the title</a>'
    }

    // YouTube
    if( domain == "youtube.com" || domain == "youtu.be" ) {
        log( "domain is YouTube. Changing the search URl to the YT ID only." );
        thisUrl_forApi = "https://youtu.be/" + getYoutubeIdFromUrl( thisUrl );
    }

    /*
     * visitDomain exceptions
     */
    if( visitDomain == "hearthis.at" ) { // YouTube URLs are searched with the ID only, so not 2 variants to handle in output
        playerUrl_possibleUsageVariants = 2;
    }

    var class_solvedUrlVariants = "";

    /*
     * Final apiURl prepartion
     */
    thisUrl_forApi = remove_mdbVariant_fromUrlStr( thisUrl_forApi );

    /*
     * call MixesDB API search
     * append usageLink
     */
    if( runAPIcall ) {
        var apiQueryUrl = apiUrl_searchKeywords_fromUrl( thisUrl_forApi );
        logVar( "apiQueryUrl", apiQueryUrl );

        // async:false (synchronous XHR) is deprecated by browsers and can be silently blocked/
        // throw without a "red" console error in some environments (seen more on mobile browsers) -
        // if the toolkit never appears, check whether this log line and the matching
        // "MixesDB API search FAILED"/success log below ever show up at all.
        log( "getToolkit_run: calling MixesDB API search (synchronous XHR): " + apiQueryUrl );

        $.ajax({
            url: apiQueryUrl,
            type: 'get',
            dataType: 'json',
            async: false,
            success: function(data) {
                log( "getToolkit_run: MixesDB API search responded." );

                var resultsArr = data["mixesdb_player_search"],
                    resultNum = resultsArr.length,
                    showPlayerUrls = false,
                    force_unclearResult = false;

                if( max_toolboxIterations > 1
                   || visitDomain == "1001tracklists.com"
                   || visitDomain == "groove.de"
                   || visitDomain == "ra.co"
                   || visitDomain == "wearesoundspace.com"
                   || visitDomain == "toxicfamily.de"
                  ) {
                    showPlayerUrls = true;
                }

                if( max_toolboxIterations == 1 && visitDomain == "trackid.net" ) {
                    force_unclearResult = true;
                }

                logVar( "resultNum", resultNum );
                logVar( "addOutput", addOutput );

                if( resultNum > 0 ) {
                    logVar( "Usage", "used (resultNum="+resultNum+") " + thisUrl );

                    //logVar( "data", JSON.stringify(data) );
                    logVar( "resultsArr", JSON.stringify(resultsArr) );
                    logVar( "resultsArr.length", resultsArr.length );

                    if( addOutput ) {
                        if( outputType == "detail page" ) {
                            var i;
                            var output = '<span class="mdb-toolkit-usageLink-intro">This player is used on MixesDB: </span>',
                                usageLinks = [];

                            if( showPlayerUrls ) {
                                output = '<span class="mdb-toolkit-usageLink-intro">This mix is on MixesDB: </span>';
                            }

                            log( "Ready to output usage links" );
                            logVar( "showPlayerUrls", showPlayerUrls );

                            for( i = 0; i < resultsArr.length; i++ ){
                                var title = resultsArr[i].title,
                                    mdbPageId = resultsArr[i].pageid,
                                    lastEditTimestamp = resultsArr[i].timestamp;

                                logVar( "title", title );
                                logVar( "mdbPageId", mdbPageId );

                                var link_playerUsedOn = makeMixesdbLink_fromId( mdbPageId, title, linkClass, lastEditTimestamp, "toolkit", visitDomain, siteHasTl );

                                usageLinks.push( link_playerUsedOn );
                            }

                            usageLinks = array_unique( usageLinks );

                            // add links from array
                            // make list if multiple links
                            if( usageLinks.length > 1 ) {
                                output += '<ul class="nested filled">';
                                for( i = 0; i < usageLinks.length; i++ ){
                                    output += '<li class="filled">' +usageLinks[i]+ '</li>';
                                }
                                output += '</ul>';
                            } else {
                                output += usageLinks[0];
                            }

                            // success body class
                            var type_cssSafe = type.replace(/\s/g,"");
                            $("body").addClass( "mdb-"+type_cssSafe+"-success" );
                        }

                        // append usageLink used
                        waitForKeyElements("#mdb-toolkit ul li.mdb-toolkit-usageLink.used", function(jNode) {

                            const $all = $("#mdb-toolkit ul li.mdb-toolkit-usageLink.used");
                            const $last = $all.last();

                            // Only act on the current LAST .used item
                            if (!jNode.length || !$last.length || jNode[0] !== $last[0]) return;

                            $("#mdb-toolkit").addClass("filled");
                            jNode.append(output).addClass("filled");
                        });


                        // available links used
                        waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used", function(jNode) {

                            const $all = $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used");
                            const $last = $all.last();

                            // Only act on the current LAST .used item
                            if (!jNode.length || !$last.length || jNode[0] !== $last[0]) return;

                            $("ul", jNode).append(
                                makeAvailableLinksListItem(thisUrl, titleText, "used", class_solvedUrlVariants, toolboxIteration)
                            );

                            reorderToolkitPlayerUrlListItems(jNode);

                            if (showPlayerUrls) {
                                jNode.addClass("filled");
                            }
                        });

                    // !addOutput
                    } else {
                        log( "Not adding output" );

                        // remove the wrapper if usage results
                        if( type == "hide if used" ) {
                            log( "Removing " + thisUrl );
                            wrapper.remove();
                        }
                    }

                // resultNum = 0
                } else {
                    logVar( "Usage", "NOT used (resultNum="+resultNum+") " + thisUrl );

                    if( type == "hide if used" ) {
                        log( "This is not used: " + playerUrl );
                    }

                    if( addOutput ) {
                        if (searchTitleLink) {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused", function(jNode) {

                                const $all = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused");
                                const $last = $all.last();

                                // Only act on the current LAST .unused item
                                if (!jNode.length || !$last.length || jNode[0] !== $last[0]) return;

                                var searchMessage = 'This player is';

                                if (max_toolboxIterations > 1) {
                                    searchMessage = 'These players are';
                                }

                                searchMessage += ' not used on MixesDB yet. ' + searchTitleLink;

                                $("#mdb-toolkit").addClass("filled");
                                jNode.append(searchMessage).addClass("filled");
                            });
                        } else {
                            log("No search res: No titleText!");
                        }

                        // available links unused
                        // if domain of variable URLs add unused player URL to unclear list
                        if (domain != "no-case-yet.com") {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused", function(jNode) {

                                const $all = $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused");
                                const $last = $all.last();

                                // Only act on the current LAST .unused item
                                if (!jNode.length || !$last.length || jNode[0] !== $last[0]) return;

                                $("ul", jNode).append(
                                    makeAvailableLinksListItem(thisUrl, titleText, "unused", class_solvedUrlVariants, toolboxIteration)
                                );

                                reorderToolkitPlayerUrlListItems(jNode);

                                if (showPlayerUrls) {
                                    jNode.addClass("filled");
                                }
                            });
                        } else {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear", function(jNode) {

                                const $all = $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear");
                                const $last = $all.last();

                                // Only act on the current LAST .unclear item
                                if (!jNode.length || !$last.length || jNode[0] !== $last[0]) return;

                                var unclear = "";

                                if (domain == "no-case-yet.com") {
                                    unclear = "unclear";
                                }

                                $("ul", jNode).append(
                                    makeAvailableLinksListItem(thisUrl, titleText, unclear, class_solvedUrlVariants, toolboxIteration)
                                );

                                reorderToolkitPlayerUrlListItems(jNode);

                                if (showPlayerUrls || force_unclearResult) {
                                    jNode.addClass("filled");
                                }
                            });
                        }
                    } else {
                        varLog( "addOutput", addOutput );
                    }
                }
            },
            error: function( jqXHR, textStatus, errorThrown ) {
                log( "getToolkit_run: MixesDB API search FAILED (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + "): " + apiQueryUrl );
            }
        }).done(function(data) {
            /*
             * add TID link
             */
            if( urlIsTidSubmitCompatible( location.href ) ) {
                toolkit_addTidLink( thisUrl_forApi, titleText );
            } else {
                log( "Not TID compatible: " + location.href );
            }

            /*
             * Cleanup
             * last ieration recognition
             */
            var cleanup = 1; // disable to debug toolkit output

            if( cleanup == 1 ) {
                // if all list items are added
                setTimeout(function() {
                    logFunc( "Toolkit cleanup" );

                    var li_usage_len = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used.filled").length,
                        li_noUsage_all = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused"),
                        li_noUsage_len = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused.filled").length,
                        li_unclear = $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear.filled"),
                        li_playerUrls_all = $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls");

                    logVar( "li_usage_len", li_usage_len );
                    logVar( "li_noUsage_len", li_noUsage_len );

                    // remove usage.unused if usage
                    if( li_usage_len > 0 ) {
                        li_noUsage_all.remove();
                    }

                    // remove extra usage list items
                    $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used").not(":first").remove();
                    $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused").not(":first").remove();

                    // merge used and unused list items
                    $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used.filled")
                        .not(":first")
                        .find("> ul > li.mdb-toolkit-playerUrls-item.used.filled")
                        .each(function() {
                        $(this).appendTo(
                            $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used.filled").first().find("> ul")
                        );
                    });

                    $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused.filled")
                        .not(":first")
                        .find("> ul > li.mdb-toolkit-playerUrls-item.unused.filled")
                        .each(function() {
                        $(this).appendTo(
                            $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused.filled").first().find("> ul")
                        );
                    });

                    $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear.filled")
                        .not(":first")
                        .find("> ul > li.mdb-toolkit-playerUrls-item.unclear.filled")
                        .each(function() {
                        $(this).appendTo(
                            $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear.filled").first().find("> ul")
                        );
                    });

                    // reorder merged first matching blocks
                    reorderToolkitPlayerUrlListItems(
                        $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used.filled").first()
                    );

                    reorderToolkitPlayerUrlListItems(
                        $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused.filled").first()
                    );

                    reorderToolkitPlayerUrlListItems(
                        $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear.filled").first()
                    );

                    // remove multiple embed URL with same value
                    var embedUrlsSeen = {};
                    $("#mdb-toolkit > ul li.mdb-toolkit-embedUrl.filled").each(function(){
                        var embedInput = $("input", this),
                            embedUrlValue = embedInput.val();

                        if( embedUrlValue && embedUrlsSeen[embedUrlValue] ) {
                            $(this).remove();
                        } else {
                            embedUrlsSeen[embedUrlValue] = true;
                        }
                    });

                    // remove empty list items
                    $("#mdb-toolkit > ul > li").each(function(){ // For each element
                        var li_text = $(this).text().trim();
                        if( li_text == "" || li_text == "Used players:" || li_text == "Unused players:"  || li_text == "Unclear if players are used:" ) {
                            $(this).remove(); // if it is empty, it removes it
                        }
                    });

                    reorderToolkitItems();

                    /*
                     * 2 playerUrl_possibleUsageVariants
                     * On no-case-yet.com itself 2 URL types are used (and searched)
                     * These results are possible:
                     * 1 used, 1 unused listed
                     * 2 unused hearthis.at playerURLs > 2 unclear listed
                     */
                    if( playerUrl_possibleUsageVariants == 2 ) {
                        // if usageLink.unused, remove li_unclear
                        if( li_noUsage_len > 0 ) {
                            li_unclear.remove();
                        }

                        // if usageLink.used, remove li_used and li_unused
                        if( li_usage_len > 0 ) {
                            li_playerUrls_all.remove();
                        }
                    }

                    /*
                     * Remove empty list items
                     */
                    $(".mdb-toolkit-playerUrls.filled").each(function(){
                        if( $("ul > li", this).length == 0 ) {
                            $(this).remove();
                        }
                    });

                    /*
                     * remove duplicate list items
                     * if followed directly after the previous
                     */
                    var seen = {};
                    $( "#mdb-toolkit > ul > li ul li" ).each(function() {
                        var txt = $(this).text();
                        if (seen[txt])
                            $(this).remove();
                        else
                            seen[txt] = true;
                    });

                }, toolkitUrls_totalTimeout );
            } // if cleanup

            /*
             * Showdown
             */
            var waiter = $("#mdb-toolkit_waiter"),
                toolkit_ul = $("#mdb-toolkit ul");

            if( max_toolboxIterations > 1 ) {
                waiter.slideDown( toolkitUrls_totalTimeout + 250 );

                setTimeout(function() {
                    waiter.remove();
                    toolkit_ul.fadeIn( 125 );
                }, toolkitUrls_totalTimeout );
            } else {
                toolkit_ul.show();
            }

            $("> li:not(.filled)", toolkit_ul).remove();
            $("#mdb-toolkit .filled").show();
        }); // ajax done
    }
}


/*
 * reorderToolkitItem
 */
function reorderToolkitItems() {

    /* ------------------------------------------------------------
     * Get the FIRST matching top-level list items.
     * We do NOT use :first-of-type here, because that means
     * "first LI among siblings", not "first matching element".
     * ------------------------------------------------------------ */
    const $toolkitList = $("#mdb-toolkit > ul");

    const $used = $toolkitList.children("li.mdb-toolkit-playerUrls.used.filled").first();
    const $unused = $toolkitList.children("li.mdb-toolkit-playerUrls.unused.filled").first();
    const $unclear = $toolkitList.children("li.mdb-toolkit-playerUrls.unclear.filled").first();

    /* ------------------------------------------------------------
     * Desired order:
     * 1. used
     * 2. unused
     * 3. unclear
     *
     * Append moves existing nodes, so this is a simple and robust
     * way to normalize order without fragile insertBefore chains.
     * Missing items are skipped automatically.
     * ------------------------------------------------------------ */
    if ($used.length) {
        $used.appendTo($toolkitList);
    }

    if ($unused.length) {
        $unused.appendTo($toolkitList);
    }

    if ($unclear.length) {
        $unclear.appendTo($toolkitList);
    }

    /* ------------------------------------------------------------
     * Embed URL should always be near the bottom / at the end.
     * ------------------------------------------------------------ */
    $toolkitList.children("li.mdb-toolkit-embedUrl.filled").appendTo($toolkitList);

    /* ------------------------------------------------------------
     * Usage items should always be at the top.
     * prependTo() keeps the set order as returned by jQuery.
     * ------------------------------------------------------------ */
    $toolkitList.children("li.mdb-toolkit-usageLink.filled").prependTo($toolkitList);
}


/*
 * toolkit_tidLastCheckedText
 */
function toolkit_tidLastCheckedText( timestamp ) {
    // replace (?) tooltip with time ago info
    // convert "2025-03-30 12:01:56" to "2025-03-30T12:01:56Z"
    if( /^.+ .+$/.test(timestamp) ) {
        var timestamp_ago = timestamp.replace(" ", "T") + "Z";
    }

    var checked_ago = $.timeago(timestamp_ago)?.replace(/^about /i, ""),
        checked_ago_text = checked_ago ? "(" + mdbTooltip(checked_ago, timestamp) + ")" : "";

    logVar("checked_ago", checked_ago);

    return checked_ago_text || "";
}


/*
 * toolkit_addTidLink
 * adds TID link or submit link according to page existance
 * also check MixesDB integration
 */
function toolkit_addTidLink( playerUrl, title ) {
    // convert YouTbe URLs to watch variant since TID stores them as such
    if( getDomain_fromUrlStr(playerUrl) == "youtu.be" ) {
        playerUrl = changeYoutubeUrlVariant( playerUrl, "youtube.com")
    }

    // Wait for toolkit
    waitForKeyElements("#mdb-toolkit > ul", function( jNode ) {
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
                 * The row is about TrackId.net whatever the API answered, so the icon starts it
                 * in every case - the submit link, the "exists" link and the integration state
                 * that is shown on its own when the API knows the player but has no TID URL for
                 * it. It sits in the <li>, not inside the links, because that last case has no
                 * link to put it in.
                 */
                var tidIcon = '<img class="tidSubmit-icon" src="'+favicon_TID+'" alt="TrackId.net" style="max-height:1.2em;"> ',
                    li_tidLink_out = "";

                // avoid undefined error
                if( ( data.error && data.error.code == "notfound" )  ) {
                    // no result
                    var keywords = normalizeTitleForSearch( title );

                    li_tidLink_out = makeTidSubmitLink( playerUrl, keywords, "text" );
                    // if no error
                } else {
                    var trackidurl = data.mixesdbtrackid?.[0]?.trackidurl || null,
                        lastCheckedAgainstMixesDB = data.mixesdbtrackid?.[0]?.mixesdbpages?.[0]?.lastCheckedAgainstMixesDB || null;

                    logVar( "trackidurl", trackidurl );
                    logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                    if( trackidurl ) {
                        li_tidLink_out += '<a href="'+trackidurl+'" target="_top">This player exists on TrackId.net</a>';
                    }

                    if( lastCheckedAgainstMixesDB ) {
                        li_tidLink_out += ' <span id="mdbTrackidCheck-wrapper" class="integrated">'+checkIcon+'integrated</span>';
                        li_tidLink_out += ' ' + toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );
                    } else {
                        li_tidLink_out += ' (not integrated yet)';
                    }
                }

                if( li_tidLink_out != "" ) {
                    jNode.append( '<li class="mdb-toolkit-tidLink filled">'+tidIcon+li_tidLink_out+'</li>' ).show();
                }

                reorderToolkitItems();
            },
            error: function( jqXHR, textStatus, errorThrown ) {
                log( "toolkit_addTidLink: FAILED to check TrackId.net integration (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + "): " + apiQueryUrl_check );
            }
        }); // END ajax
    }); // END wait "#mdb-toolkit > ul"
}

// keep Toolkit edit links in sync with TL status feedback
waitForKeyElements("#tlEditor-feedback", function( jNode ) {
    var currentDomain = typeof domain !== "undefined" ? domain : "";

    // the state buttons live in this box - this is what draws them, and what lights the icon
    // the first answer decided on
    toolkit_tlStateButtons();

    if( currentDomain != "" ) {
        toolkit_updateEditLinksSiteHasTl( currentDomain, "auto" );
    }
});

waitForKeyElements("a.mdb-mixesdbLink.edit", function( jNode ) {
    var currentDomain = typeof domain !== "undefined" ? domain : "";

    if( currentDomain != "" ) {
        toolkit_updateEditLinksSiteHasTl( currentDomain, "auto" );
    }
});

// MixesDB edit page: apply siteHasTl query parameter to categories and active button
d.ready(function () {
    if (scriptName != "TrackId.net") {
        return;
    }

    if (domain != "mixesdb.com" || typeof mw === "undefined" || !mw.config) {
        return;
    }

    var wgAction = mw.config.get("wgAction"),
        wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
        wgTitle = mw.config.get("wgTitle"),
        siteHasTl = getURLParameter("siteHasTl");

    if ((wgAction == "edit" || wgAction == "submit")
        && wgNamespaceNumber == 0
        && wgTitle != "Main Page"
        && /^(incomplete|complete)$/.test(siteHasTl)
    ) {
        var textarea = $("textarea#wpTextbox1");

        if (textarea.length) {
            var currentText = textarea.val(),
                hasTracklistCompleteCategory = currentText.indexOf("[[Category:Tracklist: complete]]") !== -1,
                skipCategoryUpdate = (siteHasTl == "incomplete" && hasTracklistCompleteCategory);

            if( !skipCategoryUpdate ) {
                textarea.val(
                    currentText.replace(
                        "[[Category:Tracklist: none]]",
                        "[[Category:Tracklist: " + siteHasTl + "]]"
                    )
                );
            }

            if( skipCategoryUpdate ) {
                return;
            }

            $("#afterTextbox1 a.button-after").removeClass("op1");

            var buttonSelector = siteHasTl == "incomplete" ? "a#button-after-TLi" : "a#button-after-TLc",
                targetButton = $(buttonSelector);

            if (targetButton.length) {
                targetButton.addClass("op1");
            }
        }
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "toolkit.js loaded" );
