/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Global constants, vars
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const apiUrlW = "https://www.mixesdb.com/w/api.php";


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

// makeMdbSearchUrl
function makeMdbSearchUrl( text ) {
    var text_normalized = normalizeTitleForSearch( text ),
        searchUrl = 'https://www.mixesdb.com/w/index.php?title=&search=' + encodeURIComponent(text_normalized);

    return searchUrl;
}

// makeMixesdbLink_fromId
function makeMixesdbLink_fromId( pageid, title="MixesDB", className="" ) {
    return '<a href="'+getMixesdbPageUrl_fromId( pageid )+'" class="mdb-mixesdbLink '+className+'">'+title+'</a>';
}

// makeTidSubmitLink_text
function makeTidSubmitLink_text( thisUrl, keywords ) {
    var tidUrl = makeTidSubmitUrl( thisUrl, keywords );

    var tidLink = '<a href="'+tidUrl+'" target="_blank" class="mdb-tidSubmit">Submit this player URL to TrackId.net</a>';

    return tidLink;
}

// normalizePlayerUrl
function normalizePlayerUrl( playerUrl ) {
    return playerUrl.trim()
        .replace( /^(https?:\/\/)(.+)$/, "$2" )
        .replace( "www.", "" )
        .replace( /^(.+)\/?$/, "$1" )
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
    return apiUrlW+'?action=query&list=search&srprop=snippet&format=json&srsearch=insource:%22'+keywords+'%22';
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit
 * TODO: type == "playerListItem" to ouput only a link icon if player is used
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType, titleText ) {
    logFunc( "getToolkit" );

    var output = null,
        domain = getDomain_fromUrlStr( thisUrl ),
        domain_cssSafe = location.hostname.replace("www.","").replace(/\./, "-"), /* domain of the current website, not the URL */
        apiQueryUrl = apiUrl_searchKeywords_fromUrl( thisUrl );

    logVar( "domain", domain );
    //logVar( "domain_cssSafe", domain_cssSafe );
    logVar( "apiQueryUrl", apiQueryUrl );

    // output wrapper
    if( outputType == "detail page" ) {
        var toolkitWrapper = '<fieldset id="mdb-toolkit" class="'+domain_cssSafe+'" style="display:none">';
        toolkitWrapper += '<legend>Toolkit</legend>';
        toolkitWrapper += '<ul class="">';
        toolkitWrapper += '<li class="mdb-toolkit-usageLink" style="display:none">';
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

    // call MixesDB API search
    // append usageLink
    $.ajax({
        url: apiQueryUrl,
        type: 'get',
        dataType: 'json',
        async: false,
        success: function(data) {
            var resultNum = data["query"]["searchinfo"]["totalhits"];
            
            logVar( "resultNum", resultNum );

            if( resultNum > 0 ) {
                var resultsArr = data["query"]["search"];

                //logVar( "data", JSON.stringify(data) );
                logVar( "resultsArr", JSON.stringify(resultsArr) );
                logVar( "resultsArr.length", resultsArr.length );
                
                if( outputType == "detail page" ) {
                    var i;
                    var output = 'This player is used on MixesDB: ',
                        usageLinks = [];
                    
                    for( i = 0; i < resultsArr.length; i++ ){                        
                        var title = resultsArr[i].title,
                            pageid = resultsArr[i].pageid;
                        
                        logVar( "title", title );
                        logVar( "pageid", pageid );

                        var link_playerUsedOn = makeMixesdbLink_fromId( pageid, title );
                        
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
            } else {
                var searchLink = 'This player is not used on MixesDB yet. <a href="'+makeMdbSearchUrl( titleText )+'" target="_blank">Search the title</a>';
                waitForKeyElements("#mdb-toolkit ul li.mdb-toolkit-noUsageLink", function( jNode ) {
                    if( titleText ) {
                        $("#mdb-toolkit").show();
                        jNode.append( searchLink ).show();
                    }
                });
            }
        }
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "toolkit.js loaded" );
