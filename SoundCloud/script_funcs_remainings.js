/*
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


/*
 * convertHMS()
 */
function convertHMS(s) {
    var h = Math.floor(s / 3600); //Get whole hours
    s -= h * 3600;
    var m = Math.floor(s / 60); //Get remaining minutes
    s -= m * 60;
    return h + ":" + (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s); //zero padding on minutes and seconds
}


/*
 * artwork funcs
 */
function append_artwork( artwork_url ) {
                                              // also change for upload form
        var thumbURL = artwork_url.replace(/-(t\d\d\d?x\d\d\d?|crop|large|badge|small|tiny|mini|original)/g, "-t500x500"),
            origUrl = thumbURL.replace("-t500x500", "-original"),
            artworkURL = thumbURL;
    
    if( $("#mdb-artwork-wrapper").length === 0 ) {
        $(".listenArtworkWrapper").replaceWith('<div id="mdb-artwork-wrapper"></div>');
        var imgWrapper = $("#mdb-artwork-wrapper");
        
        imgWrapper.append('<div id="mdb-artwork-input-wrapper"><input id="mdb-artwork-input" class="selectOnClick"  type="text" value="'+origUrl+'" /></div>');

        $("<img>", {
            src: origUrl,
            load: function() {
                imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');
            }, error: function() {
                // check if original is PNG
                origUrl = origUrl.replace(".jpg",".png");
                $("<img>", {
                    src: origUrl,
                    load: function() {
                        imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');
                    },
                    error: function() {
                        // no original PNG, return 500x500 jpg
                        imgWrapper.prepend('<a class="mdb-artwork-img" href="'+thumbURL+'" target="_blank"><img id="mdb-artwork-img" src="'+thumbURL+'" /></a>');
                    }
                })
            }
        });
    }
}

waitForKeyElements("img#mdb-artwork-img", appendArtworkInfo);
function appendArtworkInfo( jNode ) {
    var origUrl = jNode.attr("src").replace(/(\r\n|\n|\r)/gm, ""), // replace line breaks
        imageType = origUrl.replace(/^.+\.([a-zA-Z]{3})/, "$1").toUpperCase();
        //imageType = origUrl.substr( origUrl.length - 3 ).toUpperCase();
    xc( "origUrl: '" + origUrl + "'" );
 
    var img = new Image();
    img.onload = function(){
            var imageWidth = this.width,
                imageHeight = this.height,
                artworkInfo = imageWidth +'&thinsp;x&thinsp;'+ imageHeight +' '+ imageType;
			xc( "imageType: " + imageType );
			xc( "artworkInfo: " + artworkInfo );
            xc( artworkInfo );

            $("#mdb-artwork-input-wrapper").append('<div id="mdb-artwork-info"><a href="'+origUrl+'" target="_blank">'+artworkInfo+'</a></div>');
    };
    img.src = origUrl;
}


/*
 * append_fileDetails()
 */
function append_fileDetails( duration, soundActions ) {
    xc( "append_fileDetails(): " + duration );
    
    var dur = convertHMS(  Math.floor(duration / 1000)  );
    
    if( dur !== null ) {
        soundActions.after('<button id="mdb-fileInfo" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="mdb-fileDetails" title="Click to copy file details" class="pointer">'+dur+'</button>');
        
        var fileDetails = '<div id="mdb-fileDetails" style="display:none"><textarea class="selectOnClick" rows="9">{|{{NormalTableFormat-Bytes}}\n! dur\n! bytes\n! kbps\n|-\n| '+dur+'\n| \n| \n|}</textarea></div>';
        $("#mdb-toggle-target").append( fileDetails );
    }
}


/*
 * fixDefaultSoundActions
 */
function fixDefaultSoundActions( jNode ) {
    $(".sc-button-like", jNode).text("");
    $(".sc-button-repost", jNode).text("");
    $(".sc-button-share", jNode).text("");
    $(".sc-button-copylink", jNode).text("");
    $(".sc-button-more", jNode).text("");

    var buyLink = $(".soundActions__purchaseLink", jNode);
    if( buyLink.length !== 0 ) {
        var buyLink_href = fixScRedirectUrl( buyLink.attr("href") ),
            buyLink_text = buyLink.text();

        buyLink.remove();
        jNode.append( '<button class="'+soundActionFakeButtonClass+'"><a href="'+buyLink_href+'" target="_blank">Link: '+buyLink_text+'</a></button>' );
    }
}
waitForKeyElements(".soundActions", fixDefaultSoundActions);


/*
 * selectText()
 */
function selectText(e){
    var t=document.getElementById(e);var n=window.getSelection();var r=document.createRange();r.selectNodeContents(t);n.removeAllRanges();n.addRange(r)
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
