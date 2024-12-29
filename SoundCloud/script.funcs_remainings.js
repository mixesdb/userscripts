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
