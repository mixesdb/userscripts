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
 * extractUrlFromUrlParameter()
 * "https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra996-ron-trent&color=1a1a1a" returns "https://soundcloud.com/resident-advisor/ra996-ron-trent"
 * "https://soundcloud.com/resident-advisor/ra996-ron-trent" returns unchanged
 */
function extractUrlFromUrlParameter( fullUrl ) {
    logFunc( "extractUrlFromUrlParameter" );
    logVar( "fullUrl", fullUrl );
    
    var match = fullUrl.match(/[?&]url=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : fullUrl;
}

// ensureTrailingSlash
function ensureTrailingSlash( url ) {
    return url.replace(/\/?$/, '/');
}

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
            var scUrl_api = ensureTrailingSlash(
                                decodeURIComponent( srcUrl )
                                    .replace( /^(.+(?:\?|&)url=)(https:\/\/api\.soundcloud\.com\/tracks\/\d+)(.+)$/, "$2" )
                            );
            logVar( "scUrl_api", scUrl_api );

            // Sanity check: if URL conatins track ID
            if( scUrl_api.split("/")[3] == "tracks" && regExp_numbers.test( scUrl_api.split("/")[4] ) ) {
                // call SC API to get user/title URL
                getToolkit_fromScUrl_api( scUrl_api, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, "" );
            }

        } else {
            // https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra970-upsammy/&color=1a1a1a&theme_color=000000&auto_play=false&show_artwork=false&show_playcount=false&download=false&liking=false&sharing=false
            // https://w.soundcloud.com/player/?url=https://soundcloud.com/resident-advisor/ra996-ron-trent&color=1a1a1a&theme_color=000000&auto_play=false&show_artwork=false&show_playcount=false&download=false&liking=false&sharing=false
            
            var scUrl_key = ensureTrailingSlash( extractUrlFromUrlParameter( srcUrl ) );
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

    // domain-specific keywords
    // TODO YouTube: search the ID only
    var possYoutubeID = getYoutubeIdFromUrl( playerUrl );
    if( possYoutubeID.length == 11 ) {
       keywords = possYoutubeID;
    }

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

    // Quotes are needed to avoid false results
    // but with quotes special characters in URLs are not found…
    if( containsSpecialCharacters(keywords) || isHearthisIdUrl(thisUrl) ) {
        // https://www.mixesdb.com/w/api.php?action=query&list=search&srprop=timestamp&format=json&srsearch=insource:mixcloud.com/ElectronicBunker/sov-podcast-001-sub%CA%9Eutan
        return 'https://www.mixesdb.com/w/api.php?action=query&list=search&srprop=timestamp&format=json&srsearch=insource:'+keywords;
    } else {
        // https://www.mixesdb.com/w/api.php?action=query&list=search&srprop=timestamp&format=json&srsearch=insource:%22soundcloud.com/claptone/clapcast-499%22
        return 'https://www.mixesdb.com/w/api.php?action=query&list=search&srprop=timestamp&format=json&srsearch=insource:%22'+keywords+'%22';
    }
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

                    // pass a variant parameter for cleanup
                    getToolkit_run( hearthisUrl_short+"?mdb-variant="+hearthisUrl_long+"&mdb-variantType=preferred", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl );
                    getToolkit_run( hearthisUrl_long+"?mdb-variant="+hearthisUrl_short+"&mdb-variantType=not-preferred", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations, embedUrl );
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
                var resultNum = data["query"]["searchinfo"]["totalhits"],
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

                    var resultsArr = data["query"]["search"];

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
