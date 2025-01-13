log( "script.funcs.js loaded" );

/*
 * Artwork funcs
 */
// append_artwork()
function append_artwork( artwork_url ) {
    logFunc( "append_artwork" );

    // also change for upload form [?]
    var thumbURL = artwork_url.replace(/-(t\d\d\d?x\d\d\d?|crop|large|badge|small|tiny|mini|original)/g, "-t500x500"),
        artworkURL = thumbURL,
        origUrl = thumbURL.replace("-t500x500", "-original");

    logVar( "artworkURL (thumbURL)", artworkURL );
    logVar( "origUrl", origUrl );

    if( $("#mdb-artwork-wrapper").length === 0 ) {
        $(".listenArtworkWrapper").replaceWith('<div id="mdb-artwork-wrapper"></div>');
        var imgWrapper = $("#mdb-artwork-wrapper");

        imgWrapper.append('<div id="mdb-artwork-input-wrapper"><input id="mdb-artwork-input" class="selectOnClick" type="text" value="'+origUrl+'" /></div>');

        imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');
    }
}

// Artwork info
// runs after append_artwork() replaced the artwork
waitForKeyElements("img#mdb-artwork-img", function( jNode ) {
    var origUrl = jNode.attr("src").replace(/(\r\n|\n|\r)/gm, ""), // replace line breaks
        imageType = origUrl.replace(/^.+\.([a-zA-Z]{3})/, "$1").toUpperCase();
        //imageType = origUrl.substr( origUrl.length - 3 ).toUpperCase();
    logVar( "origUrl", origUrl );

    var img = new Image();
    img.onload = function(){
            var imageWidth = this.width,
                imageHeight = this.height,
                artworkInfo = imageWidth +'&thinsp;x&thinsp;'+ imageHeight +' '+ imageType;
            logVar( "imageType: ", imageType );
            logVar( "artworkInfo: ", artworkInfo );

            $("#mdb-artwork-input-wrapper").append('<div id="mdb-artwork-info"><a href="'+origUrl+'" target="_blank">'+artworkInfo+'</a></div>');
    };
    img.src = origUrl;
});


/*
 * Playlist funcs
 */
// linkRemoveSetParameter
function linkRemoveSetParameter( url ) {
    return url.replace( /^(.+)\?in=.+$/, "$1" )
              .replace( /^(.+)\?in_system_playlist=.+$/, "$1" );
}


/*
 * getScAccessTokenFromApi
 * Get access_token and set as cookie
 * SC's user cookie 'oauth_token' doesn't work with the API
 */
var apiUrlTools = 'https://www.mixesdb.com/tools/api/api.php',
    scAccessToken_cookie_id = "SoundCloud_pimp_by_MixesDB_scAccessToken",
    scAccessToken_cookie_expire = 0.0063; // 3599 secs in days

function getScAccessTokenFromApi(handleData) {
    //xc( "getScAccessTokenFromApi()" );
    var scAccessToken_fromCookie = ( typeof( Cookies.get(scAccessToken_cookie_id) ) !== "undefined" ) ? Cookies.get( scAccessToken_cookie_id ) : '';
    
    // check if set as cookie
    if( scAccessToken_fromCookie == "" ) {
        //xc( "token not in cookie" );
        $.ajax({
            type: "POST",
            url: apiUrlTools,
            data: { query: "getScAccessToken" }
        })
        .fail(function() {
            console.log("Cannot access MixesDB API or error!");
        })
        .done(function(data) {
            console.log( "API called. data: " + data );
            var dataParsed = jQuery.parseJSON( data );
            //console.log( "data parsed: " + data.access_token );
            if( dataParsed !== null ) {
                handleData( dataParsed.access_token );
                Cookies.set( scAccessToken_cookie_id, dataParsed.access_token, { expires: scAccessToken_cookie_expire, domain: domain } );
            }
        });
    } else {
        //xc( "token in cookie :)" );
        handleData( scAccessToken_fromCookie );
    }
}
