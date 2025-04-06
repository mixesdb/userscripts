// ==UserScript==
// @name         TrackId.net (by MixesDB) PLAYER SEARCH VERSION
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.04.05.2_playerSearch
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-TrackId.net_93
// @include      http*trackid.net*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trackid.net
// @noframes
// @run-at       document-end
// ==/UserScript==









/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 *
 *
 * TOOLKIT.JS DIRECTLY EMBEDDED
 *
 *
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Vars and funcs that cannot live in global.js
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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
 * getToolkit_fromSCscUrl_api
 * Takes API track URL
 * Call API to the user/title URL as used on MixesDB
 * Pass that URL to getToolkit()
 */
function getToolkit_fromScUrl_api( scUrl_api="", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations ) {
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
                    if( playerUrl != "" ) {
                        getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "" );
                    }
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
function getToolkit_fromIframe( iframe, type="playerUrl", outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1 ) {
    logFunc( "getplayerUrl_fromIframe" );

    var srcUrl = iframe.attr("src"),
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
            var scUrl_api = decodeURIComponent( srcUrl )
                                .replace( /^(.+(?:\?|&)url=)(https:\/\/api\.soundcloud\.com\/tracks\/\d+)(.+)$/, "$2" )
                            ;
            logVar( "scUrl_api", scUrl_api );

            // Sanity check: if URL conatins track ID
            if( scUrl_api.split("/")[3] == "tracks" && regExp_numbers.test( scUrl_api.split("/")[4] ) ) {
                // call SC API to get user/title URL
                getToolkit_fromScUrl_api( scUrl_api, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "" );
            }

        } else {
            // https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra970-upsammy/&color=1a1a1a&theme_color=000000&auto_play=false&show_artwork=false&show_playcount=false&download=false&liking=false&sharing=false

            var scUrl_key = srcUrl.replace( /^(.+\?url=)(https:\/\/(?:www\.)?soundcloud\.com\/.+\/.+\/)(.+)$/, "$2" );
            logVar( "scUrl_key", scUrl_key );

            // Sanity check: if no path behind soundcloud.com/[key]
            if( scUrl_key.split("/")[4] != "" && scUrl_key.split("/")[5] == "" ) {
                getToolkit( scUrl_key, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "" );
            }
        }
    }

    // hearthis.at
    if( /.+hearthis\.at.+/.test(srcUrl) ) {
        // https://hearthis.at/embed/11715760/transparent_black/?hcolor=&color=&style=2&block_size=2&block_space=1&background=1&waveform=0&cover=0&autoplay=0&css=allowtransparency&partner=35

        playerUrl = srcUrl.replace( /^(http.+hearthis\.at)(\/embed\/)(\d+)(\/.+)$/, "$1/$3/" );

        if( playerUrl ) {
            getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "" );
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
            getToolkit( mcUrl, "playerUrl", "detail page", wrapper, insertType, titleText, "", max_toolboxIterations, "" );
        }
    }

    // YouTube
    if(  /.+youtube(-nocookie)?\.com.+/.test(srcUrl) || /.+youtu\.be.+/.test(srcUrl) ) {
        // https://www.youtube-nocookie.com/embed/iis0YFkPcn0?start=0&amp;origin=https%3A%2F%2Fwww.1001tracklists.com&amp;playsinline=1&amp;enablejsapi=1&amp;widgetid=1

        playerUrl = "https://youtu.be/" + getYoutubeIdFromUrl( srcUrl ) ;

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, insertType, titleText, "", max_toolboxIterations, "" );
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
    var output = '<input class="mdbTrackidCheck" type="checkbox" data-tidplayerurl="'+tidPlayerUrl+'" data-mdbpageid="'+mdbPageId+'">';

    if( target == "detail page" ) {
        output += '<label for="mdbTrackidCheck">TID tracklist is integrated</label>&nbsp;'+mdbTooltip("(?)", "Mark this TrackId.net tracklist as integrated to the tracklist of the linked MixesDB page.");
    }

    return output;
}

// makeMixesdbLink_fromId
function makeMixesdbLink_fromId( mdbPageId, title="MixesDB", className="", lastEditTimestamp="", from="", visitDomain="" ) {
    // normal link
    // https://www.mixesdb.com/w/?curid=613340
    var editSummary = "",
        mixesdbUrl = makeMixesdbPageUrl_fromId( mdbPageId ),
        output = '<a href="'+mixesdbUrl+'" class="mdb-mixesdbLink mixPage '+className+'">'+title+'</a>';

    if( lastEditTimestamp != "" ) {
        var localDate_long = convertUTCDateToLocalDate( new Date(lastEditTimestamp) ),
            localDate_ago = $.timeago( lastEditTimestamp ).replace( /^about /i, "" );

        console.log( "localDate_long: " + localDate_long );
        console.log( "localDate_ago: " + localDate_ago );
    }

    if( visitDomain == "trackid.net" ) editSummary = "TrackId.net tracklist integration of " + window.location.href;

    var tidPlayerUrl = $("img.artwork").closest("a").attr("href");

    // history link
    // https://www.mixesdb.com/w/?curid=613340&action=history
    output += '<span class="mdb-mixesdbLink-actionLinks-wrapper">';
    output += '<a href="'+mixesdbUrl+'&action=edit&from='+from+'&fromSite='+visitDomain+'&summary='+editSummary+'" class="mdb-mixesdbLink edit" target="_blank">EDIT</a>';
    output += '<a href="'+mixesdbUrl+'&action=history" class="mdb-mixesdbLink history" target="_blank">HIST';
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
function makeAvailableLinksListItem( playerUrl, titleText="", usage="", class_solvedUrlVariants ) {
    var playerUrl_clean = remove_mdbVariant_fromUrlStr( playerUrl ),
        playerUrl_domain = getDomain_fromUrlStr( playerUrl ),
        link = '<li class="mdb-toolkit-playerUrls-item '+usage+' filled '+class_solvedUrlVariants+'">';

    var domainIcon = '<img class="mdb-domainIcon" src="https://www.google.com/s2/favicons?sz=64&domain='+playerUrl_domain+'">';

    link += '<a href="'+playerUrl_clean+'" class="mdb-domainIconLink">'+domainIcon+'</a>';
    link += '<a href="'+playerUrl+'" class="mdb-actualPlayerLink">' + playerUrl + '</a>'; // do not shorten link text (for copy-paste)

    log( "urlIsTidSubmitCompatible( playerUrl ): " + urlIsTidSubmitCompatible( playerUrl ) )

    if( visitDomain != "trackid.net" && urlIsTidSubmitCompatible( playerUrl ) ) {
        link += makeTidSubmitLink( playerUrl_clean, titleText, "link-icon" ) ;
    }

    link += '</li>';

    return link;
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
function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1, embedUrl="" ) {
    logFunc( "getToolkit" );

    var urlDomain = getDomain_fromUrlStr( thisUrl );

    logVar( "thisUrl", thisUrl );
    logVar( "urlDomain", urlDomain );

    if( urlDomain == "hearthis.at" ) {

        // Important! Increase the max iterations for the new variant(s)!
        max_toolboxIterations += 1;
        log( "max_toolboxIterations increased to: " + max_toolboxIterations );

        $.ajax({
            url: thisUrl,
            success: function() {
                if( urlDomain == "hearthis.at" ) {
                    log( "hearthis.at ok" );

                    var matches_id = arguments[0].match( /(?:^.+<meta property="hearthis:embed:id" content=")(\d+)(".+$)/m ),
                        hearthisUrl_short = "https://hearthis.at/" + matches_id[1] + "/";

                    var matches_urlLong = arguments[0].match( /(?:^.+<meta property="og:url" content=")(.+)(".+$)/m ),
                        hearthisUrl_long = matches_urlLong[1];

                    logVar( "hearthisUrl_short", hearthisUrl_short );
                    logVar( "hearthisUrl_long", hearthisUrl_long );

                    embedUrl = hearthisUrl_short;

                    getToolkit_run( hearthisUrl_short+"?mdb-variant="+hearthisUrl_long+"&mdb-variantType=preferred", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl );
                }
            }
        });
    } else {
        getToolkit_run( thisUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl );
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit_run
 * TODO: type == "playerListItem" to ouput only a link icon if player is used
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var toolboxIteration = 0; // count iterations for multiple iframes

function getToolkit_run( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1, embedUrl="" ) {
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
    if( wrapper == "iframe.mdb-processed-toolkit:first" ) {
        wrapper = $("iframe.mdb-processed-toolkit:first");
    }

    // output wrapper
    // allow multiple same class li (when multiple players are checked, e.g. 1001)
    var toolkitOutput = "";

    // output wrapper with empty list
    // fill list with later results
    // allow multiple iterations to add list items
    if( addOutput ) {
        if( toolboxIteration == 1 ) {
            toolkitOutput += '<fieldset id="mdb-toolkit" class="'+domain_cssSafe+'">';
            toolkitOutput += '<legend>Toolkit</legend>';
            toolkitOutput += '<div id="mdb-toolkit_waiter" style="display:none"></div>';
            toolkitOutput += '<ul style="display:none">';
        }

        if( toolboxIteration == 1 ) {
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
        if( embedUrl && visitDomain != "trackid.net" ) {
            var embedUrl_len = embedUrl.length;
            toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-embedUrl filled">Embed URL: ';
            toolkitOutput_li += '<input class="mdb-element inline mdb-selectOnClick mono" type="text" value="'+embedUrl+'" size="'+embedUrl_len+'" />';
            toolkitOutput_li += '</li>';
        }

        $("#mdb-toolkit > ul").append( toolkitOutput_li );
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

    /*
     * classname for solved url variants
     */
    var class_solvedUrlVariants = "";
    if( domain == "hearthis.at" ) {
        class_solvedUrlVariants = "solvedUrlVariants";
    }

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

        $.ajax({
            url: apiQueryUrl,
            type: 'get',
            dataType: 'json',
            async: false,
            success: function(data) {
                /*
                  {
                    "mixesdb_player_search": [
                      {
                        "page_id": "468683",
                        "pageid": "468683",
                        "title": "2016-04-30 - Tony Humphries @ Cielo, NYC",
                        "dbKey": "2016-04-30_-_Tony_Humphries_@_Cielo,_NYC",
                        "url": "https://www.mixesdb.com/w/2016-04-30_-_Tony_Humphries_@_Cielo,_NYC",
                        "timestamp": "2025-04-02T07:48:28Z"
                      }
                    ]
                  }
                */

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

                    if( addOutput ) {
                        if( outputType == "detail page" ) {
                            var i;
                            var output = '<span class="mdb-toolkit-usageLink-intro">This player is used on MixesDB: </span>',
                                usageLinks = [];

                            if( showPlayerUrls ) {
                                output = '<span class="mdb-toolkit-usageLink-intro">This mix is on MixesDB: </span>';
                            }

                            for( i = 0; i < resultsArr.length; i++ ){
                                var title = resultsArr[i].title,
                                    mdbPageId = resultsArr[i].pageid,
                                    lastEditTimestamp = resultsArr[i].timestamp;

                                logVar( "title", title );
                                logVar( "mdbPageId", mdbPageId );

                                var link_playerUsedOn = makeMixesdbLink_fromId( mdbPageId, title, linkClass, lastEditTimestamp, "toolkit", visitDomain );

                                usageLinks.push( link_playerUsedOn );
                            }

                            usageLinks = array_unique( usageLinks );

                            // add links from array
                            // make list if multiple links
                            if( usageLinks.length > 1 ) {
                                output += '<ul>';
                                for( i = 0; i < usageLinks.length; i++ ){
                                    output += '<li>' +usageLinks[i]+ '</li>';
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
                        waitForKeyElements("#mdb-toolkit ul li.mdb-toolkit-usageLink.used:last", function( jNode ) {
                            $("#mdb-toolkit").addClass("filled");
                            jNode.append( output ).addClass("filled");
                        });

                        // available links used
                        waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used:last", function( jNode ) {
                            $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, titleText, "used", class_solvedUrlVariants ) );

                            if( showPlayerUrls ) {
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
                        if( searchTitleLink ) {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused:last", function( jNode ) {
                                var searchMessage = 'This player is';

                                if( max_toolboxIterations > 1 ) {
                                    searchMessage = 'These players are';
                                }

                                searchMessage += ' not used on MixesDB yet. ' + searchTitleLink;

                                $("#mdb-toolkit").addClass("filled");
                                jNode.append( searchMessage ).addClass("filled");
                            });
                        } else {
                            log( "No search res: No titleText!" );
                        }

                        // available links unused
                        // if domain of variable URLs add unused player URL to unclear list
                        if( domain != "no-case-yet.com" ) {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused:last", function( jNode ) {
                                $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, titleText, "unused", class_solvedUrlVariants ) );

                                if( showPlayerUrls ) {
                                    jNode.addClass("filled");
                                }
                            });
                        } else {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear:last", function( jNode ) {
                                var unclear = "";

                                if( domain == "no-case-yet.com" ) {
                                    unclear = "unclear";
                                }

                                $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, titleText, unclear, class_solvedUrlVariants ) );

                                if( showPlayerUrls || force_unclearResult ) {
                                    jNode.addClass("filled");
                                }
                            });
                        }
                    }
                }
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
                    $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used:not(:first)").remove();
                    $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused:not(:first)").remove();

                    // merge used and unused list items
                    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.used.filled:not(:first) > ul > li.mdb-toolkit-playerUrls-item.used.filled").each(function(){
                        $(this).appendTo(
                            $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.used.filled:first > ul")
                        );
                    });
                    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unused.filled:not(:first) > ul > li.mdb-toolkit-playerUrls-item.unused.filled").each(function(){
                        $(this).appendTo(
                            $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused.filled:first > ul")
                        );
                    });
                    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unclear.filled:not(:first) > ul > li.mdb-toolkit-playerUrls-item.unclear.filled").each(function(){
                        $(this).appendTo(
                            $("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear.filled:first > ul")
                        );
                    });

                    // remove multiple embed URL
                    $("#mdb-toolkit > ul li.mdb-toolkit-embedUrl.filled + li.mdb-toolkit-embedUrl.filled").remove();

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
                     * Solved URL variants
                     * @TODO urlThis_variantType is not used yet. moving the preferred before the unpreferred somewhat failed.
                     */
                    $("#mdb-toolkit li.mdb-toolkit-playerUrls-item.solvedUrlVariants a.mdb-actualPlayerLink:not(.processed)").each(function(){
                        var linkThis = $(this),
                            urlThis = linkThis.attr("href");

                        if( urlThis ) {
                            var urlThis_clean = remove_mdbVariant_fromUrlStr( urlThis ),
                                urlThis_variant = get_mdbVariant_fromUrlStr( urlThis ),
                                urlThis_variantType = get_mdbVariantType_fromUrlStr( urlThis ),
                                linkVariant = '<a href="'+urlThis_variant+'" class="mdb-variantLink processed" data-varianttype="'+urlThis_variantType+'">'+urlThis_variant+'</a>';

                            logVar( "urlThis", urlThis );
                            logVar( "urlThis_clean", urlThis_clean );
                            logVar( "urlThis_variant", urlThis_variant );
                            logVar( "urlThis_variantType", urlThis_variantType );

                            // switch urlThis_variantType
                            if( urlThis_variantType == "preferred" ) {
                                urlThis_variantType = "not-preferred";
                            } else {
                                urlThis_variantType = "preferred";
                            }

                            linkThis
                                .attr( "href", urlThis_clean )
                                .attr( "data-varianttype", urlThis_variantType )
                                .addClass("processed")
                                .text( urlThis_clean )
                                .after( " = " + linkVariant );

                            linkThis
                                .add( linkThis.closest("li.solvedUrlVariants") )
                                .attr( "data-mdbvariant", urlThis_variant );

                            // Remove unused variant link
                            waitForKeyElements("#mdb-toolkit li.mdb-toolkit-playerUrls-item.unused.filled.solvedUrlVariants a.mdb-actualPlayerLink.processed", function( jNode ) { // wait for unused
                                $("#mdb-toolkit li.mdb-toolkit-playerUrls-item.used.filled.solvedUrlVariants a.mdb-actualPlayerLink.processed").each(function(){ // each used
                                    var variantUrl = $(this).attr("href");
                                    $('#mdb-toolkit li.mdb-toolkit-playerUrls-item.unused.filled.solvedUrlVariants[data-mdbvariant="'+variantUrl+'"]').remove(); // remove unused
                                });
                            });

                            waitForKeyElements("#mdb-toolkit li.mdb-toolkit-playerUrls-item.unused.filled.solvedUrlVariants", function( jNode ) { // wait for unused
                                // unused duplicated solvedUrlVariants
                                    log("Unused duplicates");
                                    var variantUrl = $('a[data-varianttype="preferred"]', jNode).attr("href");
                                    $('#mdb-toolkit li.mdb-toolkit-playerUrls-item.solvedUrlVariants.unused[data-mdbvariant="'+variantUrl+'"]').remove();
                            });
                        }
                    });

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
    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.used.filled:first").insertBefore(
        $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unused.filled:first")
    );
    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unused.filled:first").insertBefore(
        $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unclear.filled:first")
    );
    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.used.filled:first").insertBefore(
        $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unclear.filled:first")
    );
    $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.used.filled:first").insertBefore( // again
        $("#mdb-toolkit > ul li.mdb-toolkit-playerUrls.unused.filled:first")
    );
    // embed URL to bottom
    $("#mdb-toolkit > ul li.mdb-toolkit-embedUrl.filled").appendTo(
        $("#mdb-toolkit > ul")
    );
    // last reorder: usage li always to top
    $("#mdb-toolkit > ul li.mdb-toolkit-usageLink.filled").prependTo(
        $("#mdb-toolkit > ul")
    );
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
                // avoid undefined error
                if( ( data.error && data.error.code == "notfound" )  ) {
                    // no result
                    var keywords = normalizeTitleForSearch( title ),
                        tidLink = makeTidSubmitLink( playerUrl, keywords, "text" );
                    if( tidLink ) {
                        jNode.append( '<li class="mdb-toolkit-tidLink filled">'+tidLink+'</li>' ).show();
                    }
                    // if no error
                } else {
                    var li_tidLink_out = "",
                        trackidurl = data.mixesdbtrackid?.[0]?.trackidurl || null,
                        lastCheckedAgainstMixesDB = data.mixesdbtrackid?.[0]?.mixesdbpages?.[0]?.lastCheckedAgainstMixesDB || null;

                    logVar( "trackidurl", trackidurl );
                    logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                    if( trackidurl ) {
                        li_tidLink_out += '<a href="'+trackidurl+'">This player exists on TrackId.net</a>';
                    }

                    if( lastCheckedAgainstMixesDB ) {
                        li_tidLink_out += ' <span id="mdbTrackidCheck-wrapper" class="integrated">'+checkIcon+'integrated</span>';
                        li_tidLink_out += ' ' + toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );
                    } else {
                        li_tidLink_out += ' (not integrated yet)';
                    }

                    if( li_tidLink_out != "" ) {
                        jNode.append( '<li class="mdb-toolkit-tidLink filled">'+li_tidLink_out+'</li>' ).show();
                    }
                }

                reorderToolkitItems();
            }
        }); // END ajax
    }); // END wait "#mdb-toolkit > ul"
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "toolkit.js loaded" );


















/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var dev = 0,
    cacheVersion = 82,
    scriptName = "TrackId.net",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( pathRaw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var timeoutDelay = 600,
    ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

// select elements
waitForKeyElements(".mdb-element.select", function( jNode ) {
    jNode.select().focus();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * mdbTrackidCheck
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * checkTidIntegration
 * save action: the mix page reference takes params page_id, dbKey, title
 */
function checkTidIntegration( tidPlayerUrl="", mdbPageId="", action="", wrapper="", target="audiostream page" ) {
    logFunc( "checkTidIntegration" );
    logVar( "action", action );
    logVar( "tidPlayerUrl", tidPlayerUrl );
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
                    success: function(data) {
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
                            var checked_pageId = ( data.mixesdbtrackid && data.mixesdbtrackid[0].mixesdbpages[0] ) ? data.mixesdbtrackid[0].mixesdbpages[0].page_id : "",
                                checked_url = ( data.mixesdbtrackid && data.mixesdbtrackid[0].mixesdbpages[0] ) ? data.mixesdbtrackid[0].mixesdbpages[0].url : "";

                            if( checked_pageId == mdbPageId ) {
                                var lastCheckedAgainstMixesDB = data.mixesdbtrackid[0].mixesdbpages[0].lastCheckedAgainstMixesDB;

                                if( lastCheckedAgainstMixesDB != null ) {
                                    log( "Is marked as integrated (mdbPageId: " +mdbPageId+ ")" );
                                    $("input", wrapper).replaceWith(checkIcon);

                                    var checked_ago_text = toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );

                                    if( checked_ago_text ) $("label", wrapper).next("span.mdb-tooltip").replaceWith( checked_ago_text );

                                    /* show */
                                    wrapper.addClass("integrated").show();
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
                                    waiter.remove();

                                    var notYetIntegratedText = '<span class="tooltip-title small" style="color:lightgreen" title="This tracklist is not intergated yet to the found mix page">not yet</span>';

                                    if( checked_pageId ) {
                                        var lastCheckedAgainstMixesDB = data.mixesdbtrackid[0].mixesdbpages[0].lastCheckedAgainstMixesDB;
                                        logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                                        if( lastCheckedAgainstMixesDB != null && lastCheckedAgainstMixesDB != "empty" ) {
                                            log( "Checked and page found: ("+checked_pageId+")" );

                                            var checkedLink = '<a href="'+checked_url+'">'+checkIcon+'</a>';

                                            wrapper.append( checkedLink );
                                        } else {
                                            // Add checkbox in tables for certain users
                                            var currentUsername = $(".user-name").text();

                                            if( currentUsername == "Schrute_Inc._disabled" || currentUsername == "Komapatient" ) {
                                                var status_td = wrapper.prev("td.status"),
                                                    status = $("div.MuiBox-root",status_td).attr("aria-label").trim();

                                                logVar( "status", status );

                                                if( status == "Tracklist ready" ) {
                                                    var input = make_mdbTrackidCheck_input( tidPlayerUrl, checked_pageId, "table" );
                                                    wrapper.append( input );
                                                }
                                            } else {
                                                wrapper.append( notYetIntegratedText );
                                            }
                                        }
                                    } else {
                                        log( "No checked_pageId! Run searchKeywords API for player URL to get the mdbPageId" );

                                        var apiQueryUrl = apiUrl_searchKeywords_fromUrl( tidPlayerUrl );
                                        logVar( "apiQueryUrl", apiQueryUrl );

                                        $.ajax({
                                            url: apiQueryUrl,
                                            type: 'get',
                                            dataType: 'json',
                                            async: false,
                                            success: function(data) {
                                                var resultsArr = data["mixesdb_player_search"],
                                                    resultNum = resultsArr.length;

                                                if( resultNum == 1 ) {
                                                    // @TODO DRY
                                                    var resultsArr = data["query"]["search"],
                                                        mdbPageId = resultsArr[0].pageid,
                                                        currentUsername = $(".user-name").text();

                                                    if( mdbPageId && currentUsername == "Schrute_Inc._disabled" || currentUsername == "Komapatient" ) {
                                                        var status_td = wrapper.prev("td.status"),
                                                            status = $("div.MuiBox-root",status_td).attr("aria-label").trim();

                                                        logVar( "status", status );

                                                        if( status == "Tracklist ready" ) {
                                                            var input = make_mdbTrackidCheck_input( tidPlayerUrl, mdbPageId, "table" );
                                                            wrapper.append( input );
                                                        } else {
                                                            wrapper.append( '<span class="tooltip-title" style="color:orange" title="Status is not ready">not ready</span>' );
                                                        }
                                                    } else {
                                                        wrapper.append( notYetIntegratedText );
                                                    }
                                                } else {
                                                    log( "resultNum != 1: " + resultNum );

                                                    if( resultNum == 0 ) {
                                                        wrapper.append( '<span class="tooltip-title small" style="color:crimson" title="No MixesDB mix page found using this player">not found</span>' );
                                                    }
                                                    if( resultNum > 1 ) {
                                                        wrapper.append( '<span class="tooltip-title small" style="color:orange" title="Bug: Too many results">multiple pages using this</span>' );
                                                    }
                                                }
                                            }
                                        }); // end ajax
                                    }
                                }
                            }
                        }
                    }
                });
                break;

            // save
            case "save":
                //logVar( "apiQueryUrl_save", apiQueryUrl_save );

                // confirm, disable input
                $.ajax({
                    url: apiQueryUrl_save,
                    type: 'post', /* POST on saving */
                    dataType: 'json',
                    async: true,
                    success: function(data) {
                        checkTidIntegration( tidPlayerUrl, mdbPageId, "check", wrapper, target );
                    }
                });
                break;
        }
    }
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
    var playerUrl = jNode.attr("data-tidplayerurl");

    if( playerUrl != "undefined" ) {
        checkTidIntegration( playerUrl, null, "check", jNode , "table" );
    }
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
 * Initialize feature functions per url path
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Before anythings starts: Reload the page
 * Firefox on macOS needs a tiny delay, otherwise there's constant reloading
 */
redirectOnUrlChange( 20 );

/*
 * grab url path and fire functions
 */
d.ready(function(){
    var contentWrapper = $(".MuiGrid-grid-xs-12"),
        path1 = window.location.pathname.replace(/^\//, "");

    logVar( "path1", path1 );

    switch( path1 ) {
        case "submiturl":
            on_submitrequest();
            break;
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Menu
 * minimal changes only
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".dashboard", function( jNode ) {
    var mdbMenu = '<h3 class="mdb-menu-hl">Requests</h3>';
    mdbMenu += '<ul class="mdb-menu mdb-nolist">';
    mdbMenu += '<li><a href="/submiturl?from=menu">Submit</a></li>'
    mdbMenu += '<li><a href="/myrequests?from=menu">My requests</a></li>'
    mdbMenu += '</ul>'

    jNode.append( mdbMenu );
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
    log(url);

    // get domain
    var a = document.createElement('a');
    a.href = playerUrl;
    var domain = a.hostname.replace("www.", ""),
        paths = a.pathname;
    //log("> " + domain);
    //log("> " + paths);

    // prepare embed code
    // hearthis.at not possible from provided page url
    switch (domain) {
        case "soundcloud.com": // https://soundcloud.com/fingermanedit/fingerman-dj-set-kvs-brussels
            var embed = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?visual=false&amp;url=' + playerUrl + '&amp;auto_play=false&amp;&amp;maxheight=120&amp;buying=false&amp;show_comments=false&amp;color=ff7700&amp;single_active=true&amp;show_reposts=false"></iframe>';
            break;
        case "mixcloud.com": // https://www.mixcloud.com/oldschool/sharam-jey-rave-satellite-1995/
            var feedPath = encodeURIComponent( paths ),
                embed = '<iframe width="100%" height="120" src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=' + feedPath + '" frameborder="0" ></iframe>';
            break;
        case "youtube.com": // https://www.youtube.com/watch?v=qUUYWIsfY90, https://youtu.be/qUUYWIsfY90
            var yt_id = getYoutubeIdFromUrl( playerUrl ),
                embed = '<iframe width="100%" height="315" src="https://www.youtube.com/embed/' + yt_id + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
            break;
        case "hearthis.at": // https://hearthis.at/toccoscuro/01-manpower-radio1sessentialmix-sat-09-07-2024-talion/
            var embed = "",
                wrapper = jNode.closest(".audio-stream-box");
            embed_hearthis_fromAnyUrl( playerUrl, wrapper, "append" );
    }
    //log( embed );

    // embed player
    $(".mdb-player-audiostream").remove();
    if( embed != "" ) {
        // embedded player output
        var mdbPlayerAndToolkit = '<div class="mdb-player-audiostream" data-tidplayerurl="'+playerUrl+'">' + embed + '</div>';
        jNode.closest(".audio-stream-box").append( mdbPlayerAndToolkit );
        jNode.hide();
    }

    if( playerUrl ) {
        // toolkit output
        waitForKeyElements(".mdb-player-audiostream:not(.mdb-processed-toolkit)", function( jNode ) {
            getToolkit( playerUrl, "playerUrl", "detail page", jNode, "after", titleText, "link", 1 );
            jNode.addClass("mdb-processed-toolkit");
        });
    }
}

// embed player
waitForKeyElements(".request-summary img.artwork", function( jNode ) {
    var playerUrl = jNode.closest("a").attr("href"),
        heading = $(".MuiGrid-container .MuiGrid-grid-xs-12 p.MuiTypography-body1").first(),
        titleText = normalizeTitleForSearch( heading.text() );

    logVar( "playerUrl", playerUrl );

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
        totalDur_Sec = durToSec(totalDur);
    log(mixTitle);
    logVar( "totalDur", totalDur);

    // iterate
    var tl = "",
        li = $("tr", tlWrapper),
        i = 1;

    logVar("li.length", li.length);

    li.each(function () {
        var thisTrack = "",
            artist = $(".artist", this).text(),
            title = $(".title", this).text().replace(/(.+) - (.+ (?:Remix|Mix|Version))/g, "$1 ($2)"),
            label = $(".label", this).text(),
            startTime = $(".startTime", this).text(),
            startTime_Sec = durToSec(startTime),
            endTime = $(".endTime", this).text(),
            endTime_Sec = durToSec(endTime),
            previousTrack = $(".MuiDataGrid-row:eq(" + (i - 2) + ")"), // eq starts at 0
            endTimePrevious = $(".MuiDataGrid-cell[data-field='endTime']", previousTrack).text(),
            endTimePrevious_Sec = durToSec(endTimePrevious),
            nextTrack = $(".MuiDataGrid-row:eq(" + (i) + ")"), // eq starts at 0
            startTimeNext = $(".MuiDataGrid-cell[data-field='startTime']", nextTrack).text(),
            startTimeNext_Sec = durToSec(startTimeNext);

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

        // artist - title
        if (artist && title !== "") {
            thisTrack += artist + ' - ' + title;
        }

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
    //log("tl before API:\n" + tl);

    if (tl !== "") {

        var res = apiTracklist( tl, "trackidNet" ),
            tlApi = res.text;
        //log( "tlApi:\n" + tlApi );

        if (tlApi) {
            tlWrapper.before(ta);
            $("#mixesdb-TLbox").val(tlApi);
            fixTLbox(res.feedback);
        }
    } else {
        log("tl empty");
    }
});


/*
 * Fix ugly grid layout to proper tables
 */

// waitForKeyElements
waitForKeyElements(".MuiDataGrid-virtualScrollerRenderZone:not(.processed)", function( jNode ) {
    jNode.addClass("processed");
    setTimeout(function () {
        funcTidTables( jNode.closest(".MuiDataGrid-main") );
    }, timeoutDelay);
});
$(".MuiDataGrid-virtualScrollerRenderZone .MuiDataGrid-cell:not(.processed)").on("change", function() {
    jNode.addClass("processed");
    setTimeout(function () {
        funcTidTables( $(this).closest(".MuiDataGrid-main") );
    }, timeoutDelay);
});

// funcTidTables
function funcTidTables(jNode) {
    logFunc( "funcTidTables" );

    $(".mdb-tid-table").remove();

    var audiostreams = [],
        heading = $(".MuiGrid-grid-xs-12 p.MuiTypography-body1"),
        grid = $(".data-grid", jNode).add(".MuiDataGrid-root");

    if (grid.length == 1 && grid.is(":visible")) {
        var tableClass = heading.text().replace(/ /g, ""),
            path = location.pathname.replace(/^\//, "");
        grid.before('<table class="mdb-tid-table ' + tableClass + ' ' + path + '"><tbody></tbody></table>');
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

        $(".MuiDataGrid-row").each(function () {
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

    // Insert the requestUrl to the submit input
    if( requestUrl && requestUrl !== "" ) {
        var requestUrl_domain = new URL( requestUrl ).hostname.replace("www.",""),
            keywords = getURLParameter("keywords");

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
                jNode.val( requestUrl );
                //jNode.trigger( e );
                jNode.closest(".MuiGrid-container").after( submitNote );
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