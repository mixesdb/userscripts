/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// toolkitUrls_totalTimeout
// fires additionally after playerUrlItems_timeout
// must be at least SoundCloud API response time
const toolkitUrls_totalTimeout = 750;


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Grab URLs from player iframes
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * getToolkit_fromSCApiTrackUrl
 * Takes API track URL
 * Call API to the user/title URL as used on MixesDB
 * Pass that URL to getToolkit()
 */
function getToolkit_fromSCApiTrackUrl( apiTrackUrl="", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations ) {
    logFunc( "getToolkit_fromSCApiTrackUrl" );

    if( apiTrackUrl ) {
        getScAccessTokenFromApi(function(output){
            var scAccessToken = output;

            $.ajax({
                beforeSend: function(request) {
                    request.setRequestHeader( "Authorization", "OAuth " + scAccessToken );
                },
                dataType: "json",
                url: apiTrackUrl,
                success: function( data ) {
                    var playerUrl = data.permalink_url;
                    if( playerUrl != "" ) {
                        getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations );
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

        // expect api URL, e.g. https://api.soundcloud.com/tracks/2007972247
        var apiTrackUrl = srcUrl.replace( /^(.+˙?url=)(https:\/\/api\.soundcloud\.com\/tracks\/\d+)(.+)$/, "$2" );
        logVar( "apiTrackUrl", apiTrackUrl );

        // Do we have a api track URL?
        if( apiTrackUrl.split("/")[3] == "tracks" && regExp_numbers.test( apiTrackUrl.split("/")[4] ) ) {
            // call SC API to get user/title URL
            getToolkit_fromSCApiTrackUrl( apiTrackUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations  );
        }
    }

    // hearthis.at
    // https://hearthis.at/embed/11715760/transparent_black/?hcolor=&color=&style=2&block_size=2&block_space=1&background=1&waveform=0&cover=0&autoplay=0&css=allowtransparency&partner=35
    if( /.+hearthis\.at.+/.test(srcUrl) ) {
        playerUrl = srcUrl.replace( /^(http.+hearthis\.at)(\/embed\/)(\d+)(\/.+)$/, "$1/$3/" );

        if( playerUrl ) {
            getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations );
        }
    }

    // Mixcloud
    // https://www.mixcloud.com/widget/iframe/?feed=https%3A%2F%2Fwww.mixcloud.com%2Fbeenoisetv%2Fa-cup-of-thea-episode-221-with-serena-thunderbolt%2F&amp;hide_cover=1
    if( /.+mixcloud\.com.+/.test(srcUrl) ) {
        playerUrl = decodeURIComponent( srcUrl.replace( /^(.+\?feed=)(https.+)(&hide.+)$/, "$2" ) );
        logVar( "playerUrl", playerUrl );

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", max_toolboxIterations );
        }
    }

    // YouTube
    // https://www.youtube-nocookie.com/embed/iis0YFkPcn0?start=0&amp;origin=https%3A%2F%2Fwww.1001tracklists.com&amp;playsinline=1&amp;enablejsapi=1&amp;widgetid=1
    if(  /.+youtube(-nocookie)?\.com.+/.test(srcUrl) || /.+youtu\.be.+/.test(srcUrl) ) {
        playerUrl = "https://youtu.be/" + getYoutubeIdFromUrl( srcUrl ) ;

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", max_toolboxIterations );
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

// makeMixesdbLink_fromId
function makeMixesdbLink_fromId( pageid, title="MixesDB", className="" ) {
    // normal link
    // https://www.mixesdb.com/w/?curid=613340
    var mixesdbUrl = makeMixesdbPageUrl_fromId( pageid ),
        output = '<a href="'+mixesdbUrl+'" class="mdb-mixesdbLink mixPage '+className+'">'+title+'</a>';

    // history link
    // https://www.mixesdb.com/w/?curid=613340&action=history
    output += '<span class="mdb-mixesdbLink-actionLinks-wrapper">';
    output += '<a href="'+mixesdbUrl+'&action=edit" class="mdb-mixesdbLink edit" target="_blank">edit</a>';
    output += '<a href="'+mixesdbUrl+'&action=history" class="mdb-mixesdbLink history" target="_blank">history</a>';
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

// apiUrl_searchKeywords_fromUrl
function apiUrl_searchKeywords_fromUrl( thisUrl ) {
    var keywords = mixesdbPlayerUsage_keywords( thisUrl );

    return 'https://www.mixesdb.com/w/api.php?action=query&list=search&srprop=snippet&format=json&srsearch=insource:%22'+keywords+'%22';
}

// makeAvailableLinksListItem
function makeAvailableLinksListItem( playerUrl, usage="", class_solvedUrlVariants ) {
    var playerUrl_clean = remove_mdbVariant_fromUrlStr( playerUrl ),
        playerUrl_domain = getDomain_fromUrlStr( playerUrl ),
        link = '<li class="mdb-toolkit-playerUrls-item '+usage+' filled '+class_solvedUrlVariants+'">';

    var domainIcon = '<img class="mdb-domainIcon" src="https://www.google.com/s2/favicons?sz=64&domain='+playerUrl_domain+'">';

    link += '<a href="'+playerUrl_clean+'" class="mdb-domainIconLink">'+domainIcon+'</a>';
    link += '<a href="'+playerUrl+'" class="mdb-actualPlayerLink">' + playerUrl + '</a>'; // do not shorten link text (for copy-paste)

    if( visitDomain != "trackid.net" && urlIsTidSubmitCompatible( playerUrl ) ) {
        link += makeTidSubmitLink( playerUrl_clean, "", "link-icon", "toolkit_li-not" ) ;
    }

    link += '</li>';

    return link;
}

/*
 * getToolkit
 * Gating URLs before running actual func
 * E.g. URL variants: take 1 url, create 2nd variant, send each to getToolkit_func
 */
function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1 ) {
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

                    // pass a variant parameter for cleanup
                    getToolkit_run( hearthisUrl_short+"?mdb-variant="+hearthisUrl_long+"&mdb-variantType=preferred", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations );
                    getToolkit_run( hearthisUrl_long+"?mdb-variant="+hearthisUrl_short+"&mdb-variantType=not-preferred", type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations );
                }
            }
        });
    } else {
        getToolkit_run( thisUrl, type, outputType, wrapper, insertType, titleText, linkClass, max_toolboxIterations );
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit_run
 * TODO: type == "playerListItem" to ouput only a link icon if player is used
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var toolboxIteration = 0; // count iterations for multiple iframes

function getToolkit_run( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", max_toolboxIterations=1 ) {
    logFunc( "getToolkit" );
    // types: "playerUrl", "hide if used"

    toolboxIteration = toolboxIteration + 1;

    logFunc( "getToolkit" );
    logVar( "toolboxIteration", toolboxIteration );
    logVar( "thisUrl", thisUrl );
    logVar( "type", type );
    logVar( "outputType", outputType );

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

        var toolkitOutput_li = '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-usageLink used"></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-usageLink unused"></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-tidSubmit"></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-playerUrls used">Used players:<ul class="mdb-nolist"></ul></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-playerUrls unused">Unused players:<ul class="mdb-nolist"></ul></li>';
        toolkitOutput_li += '<li data-iteration="'+toolboxIteration+'" class="mdb-toolkit-playerUrls unclear">';
        toolkitOutput_li += mdbTooltip( "Unclear if players are used", "To find out visit the page if a userscript with toolkit exists for that website." );
        toolkitOutput_li += ':<ul class="mdb-nolist"></ul>';
        toolkitOutput_li += '</li>';

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
     * classname for solced url variants
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

                if( max_toolboxIterations > 1 || visitDomain == "1001tracklists.com" ) {
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
                            var output = 'This player is used on MixesDB: ',
                                usageLinks = [];

                            if( showPlayerUrls ) output = 'This mix is on MixesDB: ';

                            for( i = 0; i < resultsArr.length; i++ ){
                                var title = resultsArr[i].title,
                                    pageid = resultsArr[i].pageid;

                                logVar( "title", title );
                                logVar( "pageid", pageid );

                                var link_playerUsedOn = makeMixesdbLink_fromId( pageid, title, linkClass );

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
                            $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, "used", class_solvedUrlVariants ) );

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

                // resultNum <= 0
                } else {
                    logVar( "Usage", "NOT used (resultNum="+resultNum+") " + thisUrl );

                    if( type == "hide if used" ) {
                        log( "This is not used: " + playerUrl );
                    }

                    if( addOutput ) {
                        if( searchTitleLink ) {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused:last", function( jNode ) {
                                var searchMessage = 'This player is not used on MixesDB yet. ' + searchTitleLink;

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
                                $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, "unused", class_solvedUrlVariants ) );

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

                                $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, unclear, class_solvedUrlVariants ) );

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
             * fill the tidSubmit li with text link
             * on player sites like SC, MC
             */
            if( visitDomain == "hearthis.at" ) {
                var tidLink = makeTidSubmitLink( thisUrl_forApi, titleText, "text" ),
                    li_tidSubmit = $("li.mdb-toolkit-tidSubmit");

                if( tidLink && $("a", li_tidSubmit).length == 0 ) {
                    li_tidSubmit.append( tidLink ).addClass("filled");
                }
            }

            /*
             * cleanup
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

                    // remove empty list items
                    $("#mdb-toolkit > ul > li").each(function(){ // For each element
                        var li_text = $(this).text().trim();
                        if( li_text == '' || li_text == 'Used players:' || li_text == "Unused players:"  || li_text == "Unclear if players are used:" ) {
                            $(this).remove(); // if it is empty, it removes it
                        }
                    });

                    /*
                     * reordering list items
                     */
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
                    // last reorder: usage li always to top
                    $("#mdb-toolkit > ul li.mdb-toolkit-usageLink.filled").prependTo(
                        $("#mdb-toolkit > ul")
                    );

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

                            // unused variant link > get actual url > delete used li with this url as variant attr
                            waitForKeyElements('#mdb-toolkit li.mdb-toolkit-playerUrls-item.solvedUrlVariants a[data-varianttype="preferred"]', function( jNode ) {
                                var variantUrl = jNode.attr("href");
                                logVar("variantUrl", variantUrl );

                                $('#mdb-toolkit li.mdb-toolkit-playerUrls-item.solvedUrlVariants[data-mdbvariant="'+variantUrl+'"]').remove();
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
                }, toolkitUrls_totalTimeout  );
            } // if cleanup

            /*
             * Showdown
             */
            var waiter = $("#mdb-toolkit_waiter"),
                toolkit_ul = $( "#mdb-toolkit ul");

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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "toolkit.js loaded" );