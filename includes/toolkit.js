/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Global constants, regExp, vars
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const visitDomain = location.hostname.replace("www.", "");


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
function getToolkit_fromSCApiTrackUrl( apiTrackUrl="", type, outputType, wrapper, insertType, titleText, linkClass, addActionLinks, max_toolboxIterations ) {
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
                        getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, addActionLinks, max_toolboxIterations );
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
function getToolkit_fromIframe( iframe, type="playerUrl", outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", addActionLinks="addActionLinks-not", max_toolboxIterations=1 ) {
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
            getToolkit_fromSCApiTrackUrl( apiTrackUrl, type, outputType, wrapper, insertType, titleText, linkClass, addActionLinks, max_toolboxIterations  );
        }
    }

    // hearthis.at
    // https://hearthis.at/embed/11715760/transparent_black/?hcolor=&color=&style=2&block_size=2&block_space=1&background=1&waveform=0&cover=0&autoplay=0&css=allowtransparency&partner=35
    if( /.+hearthis\.at.+/.test(srcUrl) ) {
        playerUrl = srcUrl.replace( /^(http.+hearthis\.at)(\/embed\/)(\d+)(\/.+)$/, "$1/$3/" );
        console.log( "hearthis.at URL type? " + playerUrl );

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", "addActionLinks", max_toolboxIterations );
        }
    }

    // Mixcloud
    // https://www.mixcloud.com/widget/iframe/?feed=https%3A%2F%2Fwww.mixcloud.com%2Fbeenoisetv%2Fa-cup-of-thea-episode-221-with-serena-thunderbolt%2F&amp;hide_cover=1
    if( /.+mixcloud\.com.+/.test(srcUrl) ) {
        playerUrl = decodeURIComponent( srcUrl.replace( /^(.+\?feed=)(https.+)(&hide.+)$/, "$2" ) );
        logVar( "playerUrl", playerUrl );

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", "addActionLinks", max_toolboxIterations );
        }
    }

    // YouTube
    // https://www.youtube-nocookie.com/embed/iis0YFkPcn0?start=0&amp;origin=https%3A%2F%2Fwww.1001tracklists.com&amp;playsinline=1&amp;enablejsapi=1&amp;widgetid=1
    if(  /.+youtube(-nocookie)?\.com.+/.test(srcUrl) || /.+youtu\.be.+/.test(srcUrl) ) {
        playerUrl = "https://youtu.be/" + getYoutubeIdFromUrl( srcUrl ) ;

        if( playerUrl ) {
            getToolkit( playerUrl, "playerUrl", "detail page", wrapper, "after", titleText, "", "addActionLinks", max_toolboxIterations );
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit helpers
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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
function makeMixesdbLink_fromId( pageid, title="MixesDB", className="", addActionLinks="addActionLinks" ) {
    // normal link
    // https://www.mixesdb.com/w/?curid=613340
    var mixesdbUrl = makeMixesdbPageUrl_fromId( pageid ),
        output = '<a href="'+mixesdbUrl+'" class="mdb-mixesdbLink mixPage '+className+'">'+title+'</a>';

    // history link
    // https://www.mixesdb.com/w/?curid=613340&action=history
    if( addActionLinks == "addActionLinks" ) {
        output += '<span class="mdb-mixesdbLink-actionLinks-wrapper">';
        output += '<a href="'+mixesdbUrl+'&action=edit" class="mdb-mixesdbLink edit">edit</a>';
        output += '<a href="'+mixesdbUrl+'&action=history" class="mdb-mixesdbLink history">history</a>';
        output += '</span>';
    }

    return output;
}

// mixesdbPlayerUsage
function mixesdbPlayerUsage_keywords( playerUrl ) {
    logFunc( "mixesdbPlayerUsage" );
    logVar( "playerUrl", playerUrl );

    var playerUrl_domain = playerUrl.hostname,
        playerUrl_normalized = normalizePlayerUrl( playerUrl ),
        keywords = playerUrl_normalized;

    //logVar( "playerUrl_normalized", playerUrl_normalized );

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
function makeAvailableLinksListItem( playerUrl, usage="" ) {
    var playerUrl_domain = getDomain_fromUrlStr( playerUrl ),
        link = '<li class="mdb-toolkit-playerUrls-item '+usage+' filled">';

    var domainIcon = '<img class="mdb-domainIcon" src="https://www.google.com/s2/favicons?sz=64&domain='+playerUrl_domain+'">';

    link += '<a href="'+playerUrl+'">'+domainIcon+'</a>';
    link += '<a href="'+playerUrl+'">' + playerUrl + '</a>'; // do not shorten link text (for copy-paste)

    if( visitDomain != "trackid.net" && urlIsTidSubmitCompatible( playerUrl ) ) {
        link += makeTidSubmitLink( playerUrl, "", "link-icon", "toolkit_li-not" ) ;
    }

    link += '</li>';

    return link;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit
 * TODO: type == "playerListItem" to ouput only a link icon if player is used
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var toolboxIteration = 0; // count iterations for multiple iframes

function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", addActionLinks="addActionLinks-not", max_toolboxIterations=1 ) {
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
        domain = getDomain_fromUrlStr( thisUrl ),
        domain_cssSafe = makeCssSafe( location.hostname );/* domain of the current website, not the URL */

    logVar( "thisUrl", thisUrl );
    logVar( "domain", domain );
    //logVar( "domain_cssSafe", domain_cssSafe );

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
            toolkitOutput += '<fieldset id="mdb-toolkit" class="'+domain_cssSafe+'"style="display:none">';
            toolkitOutput += '<legend>Toolkit</legend>';
            toolkitOutput += '<ul>';
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
        toolkitOutput_li += mdbTooltip( "Unclear if players are used", "Visit the page if a userscript with toolkit exists for that website." );
        toolkitOutput_li += ':<ul class="mdb-nolist"></ul>';
        toolkitOutput_li += '</li>';

        $("#mdb-toolkit > ul").append( toolkitOutput_li );
    }

    /*
     * Domain exceptions
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
     * call MixesDB API search
     * append usageLink
     */
    if( runAPIcall ) {
        var apiQueryUrl = apiUrl_searchKeywords_fromUrl( thisUrl );
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

                                var link_playerUsedOn = makeMixesdbLink_fromId( pageid, title, linkClass, addActionLinks );

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
                            $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, "used" ) );

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
                        // if domain of variable URLs add unused player URl to unclear list
                        if( domain != "hearthis.at" ) {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unused:last", function( jNode ) {
                                $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, "unused" ) );

                                if( showPlayerUrls ) {
                                    jNode.addClass("filled");
                                }
                            });
                        } else {
                            waitForKeyElements("#mdb-toolkit > ul > li.mdb-toolkit-playerUrls.unclear:last", function( jNode ) {
                                var unclear = "";

                                if( domain == "hearthis.at" ) {
                                    unclear = "unclear";
                                }

                                $("ul",jNode).append( makeAvailableLinksListItem( thisUrl, unclear ) );

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
             * cleanup
             * last ieration recognition
             */
            var cleanup = 1; // disable to debug

            if( cleanup == 1 ) {
                var lastIteration = ( toolboxIteration == max_toolboxIterations );
                log( "Last iteration? "+lastIteration+"! toolboxIteration: "+toolboxIteration+" / max_toolboxIterations: "+max_toolboxIterations );
                if( toolboxIteration > max_toolboxIterations ) {
                    log( "toolboxIteration > max_toolboxIterations!!!! I guess toolkit links are also not cleaned up (duplicates)? You should increase playerUrlItems_timeout ("+playerUrlItems_timeout +")!!!!" );
                }

                // if all list items are added
                if( lastIteration ) {
                    logFunc( "Toolkit cleanup" );

                    // remove usage.unused if usage
                    // "This player is not used on MixesDB yet"
                    var li_usage_len = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used.filled").length,
                        li_noUsage = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused");
                    if( li_usage_len > 0 ) {
                        li_noUsage.remove();
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

                    // remove duplicate list items
                    // if followed directly after the previous
                    var seen = {};
                    $( "#mdb-toolkit > ul > li ul li" ).each(function() {
                        var txt = $(this).text();
                        if (seen[txt])
                            $(this).remove();
                        else
                            seen[txt] = true;
                    });
                }
            } // if cleanup

            $( "#mdb-toolkit ul > li:not(.filled)").remove();
            $( "#mdb-toolkit .filled").show();
            $( "#mdb-toolkit").show();
        }); // ajax done
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "toolkit.js loaded" );