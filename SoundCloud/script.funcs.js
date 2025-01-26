log( "script.funcs.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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
            logVar( "imageType", imageType );
            logVar( "artworkInfo", artworkInfo );

            $("#mdb-artwork-input-wrapper").append('<div id="mdb-artwork-info"><a href="'+origUrl+'" target="_blank">'+artworkInfo+'</a></div>');
    };
    img.src = origUrl;
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Playlist funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// linkRemoveSetParameter
function linkRemoveSetParameter( url ) {
    return url.replace( /^(.+)\?in=.+$/, "$1" )
              .replace( /^(.+)\?in_system_playlist=.+$/, "$1" );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Hiding options funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// removeFavedPlayer_ifOptedIn
function removeFavedPlayer_ifOptedIn( jNode ) {
    logFunc( "removeFavedPlayer_ifOptedIn" );

    if( getHideFav == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Misc
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// formatScDate
function formatScDate( date ) {
    if( typeof(date) !== "undefined" ) {
        date = date.replace(/(\d\d\d\d)\/(\d\d)\/(\d\d).+$/g,"$1-$2-$3");
    } else {
        date = "";
    }
    return date;
}


// fixScRedirectUrl
function fixScRedirectUrl( url ) {
    // https://gate.sc/?url=http%3A%2F%2Fbit.ly%2FHenPod&token=df8575-1-1631362609871
    url = decodeURIComponent( url.replace(/^.+url=(.+)&token.+$/, "$1") );
    return url;
}


// toggle click
waitForKeyElements(".mdb-toggle", function( jNode ) {
    jNode.click(function(){
        var toggleId = $(this).attr("data-toggleid");
        log( toggleId );

        $("#"+toggleId).slideToggle();
        $(this).toggleClass("selected");

        if( toggleId == "mdb-fileDetails" ) $("#mdb-fileDetails textarea").click();
    });
});