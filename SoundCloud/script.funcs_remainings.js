

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
