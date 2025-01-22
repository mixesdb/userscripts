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

// makeMixesdbUrl
function getMixesdbUrl_fromId( pageid ) {
    return "https://www.mixesdb.com/w/?curid="+pageid;
}

// makeMixesdbLink_fromId
function makeMixesdbLink_fromId( pageid, title="MixesDB", className="" ) {
    return '<a href="'+getMixesdbUrl_fromId( pageid )+'" class="mdb-mixesdbLink '+className+'">'+title+'</a>';
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
    return apiUrlW+'?action=query&list=search&srprop=snippet&format=json&srsearch="'+keywords+'"';
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * getToolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getToolkit( thisUrl, type, outputType="detail page", wrapper, insertType ) {
    logFunc( "getToolkit" );

    var output = null,
        domain = getDomain_fromUrlStr( thisUrl ),
        domain_cssSafe = location.hostname.replace("www.","").replace(/\./, "-"), /* domain of the current website, not the URL */
        apiQueryUrl = apiUrl_searchKeywords_fromUrl( thisUrl );

    logVar( "domain", domain );
    logVar( "apiQueryUrl", apiQueryUrl );

    // call MixesDB API
    $.ajax({
        url: apiQueryUrl,
        type: 'get',
        dataType: 'json',
        async: false,
        success: function(data) {
            var search = data["query"]["search"][0],
                title = search.title,
                pageid = search.pageid;

            //logVar( "data", JSON.stringify(data) );
            //logVar( "search", JSON.stringify(search) );
            logVar( "title", title );
            logVar( "pageid", pageid );
            logVar( "domain_cssSafe", domain_cssSafe );

            var link_playerUsedOn = makeMixesdbLink_fromId( pageid, title );

            var output = '';
            if( outputType == "detail page" ) {
                output += '<fieldset id="mdb-toolkit" class="'+domain_cssSafe+'">';
                output += '<legend>Toolkit</legend>';
                output += '<ul class="mdb-nolist">';
                output += '<li>This player is used on MixesDB: '+link_playerUsedOn+'</li>';
                output += '</ul>';
                output += '</fieldset>';

                // success body class
                var type_cssSafe = type.replace(/\s/g,"");
                $("body").addClass( "mdb-"+type_cssSafe+"-success" );

                // MixesDB seearch icons can link to result page
                waitForKeyElements("#mdb-searchLink-detailPage"), function( jNode ) {
                    jNode.attr("href", getMixesdbUrl_fromId( pageid ) );
                }
            }

            logVar( "ouput", output );

            // add output
            switch( insertType ) {
                case "before":
                    wrapper.before( output );
                    break;
                case "prepend":
                    wrapper.prepend( output );
                    break;
                case "append":
                    wrapper.append( output );
                    break;
                case "after":
                    wrapper.after( output );
                    break;
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