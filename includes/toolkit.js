/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit helpers
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// getDomain_fromUrlStr
// example.com
function getDomain_fromUrlStr( urlString ) {
    var urlParts = urlString.split('/'); // Split the URL by '/'
    if( urlParts.length > 2 ) {
        return urlParts[2].replace("www.",""); // The hostname is the third part
    }
}

// getMixesdbPageUrl_fromId
function getMixesdbPageUrl_fromId( pageid ) {
    return "https://www.mixesdb.com/w/?curid="+pageid;
}

// makeMixesdbSearchUrl
function makeMixesdbSearchUrl( text ) {
    var text_normalized = normalizeTitleForSearch( text ),
        searchUrl = 'https://www.mixesdb.com/w/index.php?title=&search=' + encodeURIComponent(text_normalized);

    return searchUrl;
}

// makeMixesdbLink_fromId
function makeMixesdbLink_fromId( pageid, title="MixesDB", className="", addHistoryLink="addHistoryLink" ) {
    // normal link
    // https://www.mixesdb.com/w/?curid=613340
    var mixesdbUrl = getMixesdbPageUrl_fromId( pageid ),
        output = '<a href="'+mixesdbUrl+'" class="mdb-mixesdbLink '+className+'">'+title+'</a>';

    // history link
    // https://www.mixesdb.com/w/?curid=613340&action=history
    if( addHistoryLink == "addHistoryLink" ) {
        output += '<span class="mdb-mixesdbLink-history-wrapper">(<a href="'+mixesdbUrl+'&action=history" class="mdb-mixesdbLink mdb-mixesdbLink-history">history</a>)';
    }

    return output;
}

// makeTidSubmitLink
function makeTidSubmitLink( thisUrl, keywords ) {
    var keyowrds = normalizeTitleForSearch( keywords ),
        tidUrl = makeTidSubmitUrl( thisUrl, keywords ),
        tidLink = '<a href="'+tidUrl+'" target="_blank" class="mdb-tidSubmit">Submit this player URL to TrackId.net</a>';

    return tidLink;
}

// normalizePlayerUrl
function normalizePlayerUrl( playerUrl ) {
    return playerUrl.trim()
        .replace( /^(https?:\/\/)(.+)$/, "$2" )
        .replace( "www.", "" )
        .replace( /^(.+)\/$/, "$1" )
    ;
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
    logVar( "keywords", keywords );

    return keywords;
}

// apiUrl_searchKeywords_fromUrl
function apiUrl_searchKeywords_fromUrl( thisUrl ) {
    var keywords = mixesdbPlayerUsage_keywords( thisUrl );
    return 'https://www.mixesdb.com/w/api.php?action=query&list=search&srprop=snippet&format=json&srsearch=insource:%22'+keywords+'%22';
}


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
function getToolkit_fromSCApiTrackUrl( apiTrackUrl="", type, outputType, wrapper, insertType, titleText, linkClass, addHistoryLink ) {
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
                        getToolkit( playerUrl, type, outputType, wrapper, insertType, titleText, linkClass, addHistoryLink );
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
function getToolkit_fromIframe( iframe, type="playerUrl", outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", addHistoryLink="addHistoryLink-not" ) {
    logFunc( "getplayerUrl_fromIframe" );

    var srcUrl = iframe.attr("src"),
        playerUrl = "";

    logVar( "srcUrl", srcUrl );

    if( /.+soundcloud.com.+/.test(srcUrl) ) {
        log( "iframe is SoundCloud" );

        // expect api URL, e.g. https://api.soundcloud.com/tracks/2007972247
        var apiTrackUrl = srcUrl.replace( /^(.+˙?url=)(https:\/\/api\.soundcloud\.com\/tracks\/\d+)(.+)$/, "$2" );

        logVar( "apiTrackUrl", apiTrackUrl );

        // Do we have a api track URL?
        if( apiTrackUrl.split("/")[3] == "tracks" && regExp_numbers.test( apiTrackUrl.split("/")[4] ) ) {
            // call SC API to get user/title URL
            getToolkit_fromSCApiTrackUrl( apiTrackUrl, type, outputType, wrapper, insertType, titleText, linkClass, addHistoryLink  );
        }

    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit
 * TODO: type == "playerListItem" to ouput only a link icon if player is used
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType="append", titleText="", linkClass="", addHistoryLink="addHistoryLink-not" ) {
    // types: "playerUrl", "hide if used"

    logFunc( "getToolkit" );
    logVar( "thisUrl", thisUrl );
    logVar( "type", type );
    logVar( "outputType", outputType );

    var addOutput = true,
        output = null,
        domain_cssSafe = getDomain_fromUrlStr( thisUrl ),
        domain_cssSafe = makeCssSafe( location.hostname );/* domain of the current website, not the URL */

    //logVar( "domain", domain );
    //logVar( "domain_cssSafe", domain_cssSafe );

    if( type == "hide if used" ) {
        addOutput = false;
    }

    // output wrapper
    if( addOutput ) {
        var toolkitWrapper = '<fieldset id="mdb-toolkit" class="'+domain_cssSafe+'" style="display:none">';
        toolkitWrapper += '<legend>Toolkit</legend>';
        toolkitWrapper += '<ul class="">';
        toolkitWrapper += '<li class="mdb-toolkit-usageLink" style="display:none">';
        toolkitWrapper += '</li>';
        toolkitWrapper += '<li class="mdb-toolkit-usageImpossibleLink" style="display:none">';
        toolkitWrapper += '</li>';
        toolkitWrapper += '<li class="mdb-toolkit-noUsageLink" style="display:none">';
        toolkitWrapper += '</li>';
        toolkitWrapper += '<li class="mdb-toolkit-tidSubmit" style="display:none">';
        toolkitWrapper += '</li>';
        toolkitWrapper += '</ul>';
        toolkitWrapper += '</fieldset>';

        // add output
        switch( insertType ) {
            case "before":
                wrapper.before( toolkitWrapper );
                break;
            case "prepend":
                wrapper.prepend( toolkitWrapper );
                break;
            case "append":
                wrapper.append( toolkitWrapper );
                break;
            case "after":
                wrapper.after( toolkitWrapper );
                break;
        }
    }

    /*
     * Domain exceptions
     */
    var runAPIcall = true;

    if( titleText != "" ) {
        var searchTitleLink = '<a class="'+linkClass+'" href="'+makeMixesdbSearchUrl( titleText )+'" target="_blank">Search the title</a>'
    }

    // hearthis.at
    // Player template expects the URL to be like https://hearthis.at/11703627/
    // MixesDB player usage only works with searching the string hearthis.at/11703627
    // @TODO This would require parsing the long URL https://hearthis.at/andrei-mor/01-cultureshockandgrafix-radio1sessentialmix-sat-01-18-2025-talion/ to extract the short URL https://hearthis.at/11703627/
    if( domain == "hearthis.at" ) {
        var path1_isNumeric = regExp_numbers.test( thisUrl.split("/")[1] );
        logVar( "path1_isNumeric", path1_isNumeric );

        if( !path1_isNumeric ) {
            log( "hearthis.at URL is not the short URL" );

            if( addOutput ) {
                // append usage note
                waitForKeyElements("#mdb-toolkit ul li.mdb-toolkit-usageImpossibleLink", function( jNode ) {
                    var usageNote = 'It\'s not possible to tell if this player is used on MixesDB!';
                    usageNote += '<br />hearthis.at players are embedded with the short URL containing the numeric ID.';
                    usageNote += '<ul>';
                    usageNote += '<li>Check MixesDB usage on the <a class="'+linkClass+'" href="'+thisUrl+'">hearthis.at player page</a> (userscript required).</li>';
                    usageNote += '<li>'+searchTitleLink+'</li>';
                    usageNote += '</ul>';

                    $("#mdb-toolkit").show();
                    jNode.append( usageNote ).show();
                });
            }

            runAPIcall = false;
        } else {
            log( "hearthis.at URL is not the short URL" );
        }
    }

    // YouTube
    if( domain == "youtube.com" || domain == "youtu.be" ) {
        log( "domain is YouTube. Changing the search URl to the YT ID only." );
        thisUrl = getYoutubeIdFromUrl( thisUrl );
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
                var resultNum = data["query"]["searchinfo"]["totalhits"];

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

                            for( i = 0; i < resultsArr.length; i++ ){
                                var title = resultsArr[i].title,
                                    pageid = resultsArr[i].pageid;

                                logVar( "title", title );
                                logVar( "pageid", pageid );

                                var link_playerUsedOn = makeMixesdbLink_fromId( pageid, title, linkClass, addHistoryLink );

                                usageLinks.push( link_playerUsedOn );
                            }

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

                        // append usageLink
                        waitForKeyElements("#mdb-toolkit ul li.mdb-toolkit-usageLink", function( jNode ) {
                            $("#mdb-toolkit").show();
                            jNode.append( output ).show();
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
                            waitForKeyElements("#mdb-toolkit ul li.mdb-toolkit-noUsageLink", function( jNode ) {
                                var searchMessage = 'This player is not used on MixesDB yet. ' + searchTitleLink;

                                $("#mdb-toolkit").show();
                                jNode.append( searchMessage ).show();
                            });
                        } else {
                            log( "No search res: No titleText!" );
                        }
                    }
                }
            }
        });
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "toolkit.js loaded" );