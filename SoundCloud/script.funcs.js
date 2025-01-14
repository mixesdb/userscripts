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
const apiUrlToolsX = "https://www.mixesdb.com/tools/api/api.php",
      scAccessToken_cookie_id = "SoundCloud_userscript_by_MixesDB_scAccessToken",
      scAccessToken_cookie_expire = 0.0063; // 0.0063 = 3599 secs in days

function getScAccessTokenFromApi(handleData) {
    logFunc( "getScAccessTokenFromApi" );

    var scAccessToken_fromCookie = ( typeof( Cookies.get(scAccessToken_cookie_id) ) !== "undefined" ) ? Cookies.get( scAccessToken_cookie_id ) : '';

    // check if set as cookie
    if( scAccessToken_fromCookie == "" ) {
        log( "token not in cookie" );

        $.ajax({
            type: "POST",
            url: apiUrlToolsX,
            data: { query: "getScAccessToken" }
        })
        .fail(function() {
            console.log( "Cannot access MixesDB API or error!" );
        })
        .done(function(data) {
            log( "API called. data: " + data );

            var dataParsed = jQuery.parseJSON( data );
            log( "data parsed: " + data.access_token );

            if( dataParsed !== null ) {
                handleData( dataParsed.access_token );
                Cookies.set( scAccessToken_cookie_id, dataParsed.access_token, { expires: scAccessToken_cookie_expire, domain: domain } );
            }
        });
    } else {
        log( "token in cookie :)" );
        handleData( scAccessToken_fromCookie );
    }
}


/*
 * append_fileDetails()
 */
function append_fileDetails( duration, soundActions, bytes="" ) {
    log( "append_fileDetails(): " + duration );

    var dur = convertHMS(  Math.floor(duration / 1000)  );

    if( dur !== null ) {
        soundActions.after('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');

        var fileDetails = '<div id="mdb-fileDetails" style="display:none"><textarea class="mdb-selectOnClick" rows="9">{|{{NormalTableFormat-Bytes}}\n! dur\n! bytes\n! kbps\n|-\n| '+dur+'\n| '+bytes+'\n| \n|}</textarea></div>';
        $("#mdb-toggle-target").append( fileDetails );
    }
}


/*
 * formatScDate()
 */
function formatScDate( date ) {
    if( typeof(date) !== "undefined" ) {
        date = date.replace(/(\d\d\d\d)\/(\d\d)\/(\d\d).+$/g,"$1-$2-$3");
    } else {
        date = "";
    }
    return date;
}


/*
 * fixScRedirectUrl()
 */
function fixScRedirectUrl( url ) {
    // https://gate.sc/?url=http%3A%2F%2Fbit.ly%2FHenPod&token=df8575-1-1631362609871
    url = decodeURIComponent( url.replace(/^.+url=(.+)&token.+$/, "$1") );
    return url;
}


/*
 * toggle click
 */
waitForKeyElements(".mdb-toggle", function( jNode ) {
    jNode.click(function(){
        var toggleId = $(this).attr("data-toggleid");
        log( toggleId );

        $("#"+toggleId).slideToggle();
        $(this).toggleClass("selected");

        if( toggleId == "mdb-fileDetails" ) $("#mdb-fileDetails textarea").click();
    });
});


/*
 * mdb-select-onClick
 */
waitForKeyElements(".mdb-selectOnClick", function( jNode ) {
    jNode.click(function(){
        log( "click" );
        $(this).addClass("selected").select().focus();

        var tagName = $(this).prop("tagName");
        //log( tagName );
        if( tagName == 'DATE' || tagName == "H1" ) {
            selectText( $(this).attr("id") );
        }
    });
});
