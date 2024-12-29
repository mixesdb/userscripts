// ==UserScript==
// @name         SoundCloud (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2024.12.29.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @downloadURL  https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_1
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/script.funcs.js?v_1
// @include      http*soundcloud.com*
// @noframes
// @run-at       document-end
// ==/UserScript==

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var css = '.hand, .mdb-toggle {cursor: pointer;}.sc-text-grey {color: #999;}.mdb-grey-light {color: #bbb;}#mdb-trackHeader h1 {margin-top: 10px;}#mdb-trackHeader-releaseInfo {margin-bottom: 8px;}#mdb-trackHeader-releaseInfo span + span {margin-left: 10px;}#mdb-trackHeader-releaseInfo date.highlight {color: green;font-weight: bold;}.listenEngagement {padding-bottom: 6px;}.listenEngagement__actions {padding-bottom: 8px;}button.mdb-toggle.selected {border-color: #f60;}.sc_button-mdb a {color: inherit;}#mdb-toggle-target > div {padding-bottom: 10px;margin-bottom: 14px;border-bottom: 1px solid #fff;box-shadow: 0 1px 0 0 #f2f2f2;}#apiText {white-space: break-spaces;}#mdb-fileDetails {padding-bottom: 16px !important;}#mdb-fileDetails textarea {width: 19em;font-family: monospace;}.sc-button-group {padding: 0 !important;}.sc-button-group {margin: 0 !important;}.sc-button-group *, .sc-button-toolbar>.sc-button {margin-left: 0 !important;margin-right: 7px !important;}.listenArtworkWrapper {display: none;}.fullHero__artwork {width: 340px;height: 360px;}.fullHero__artwork * {width: 340px;height: 340px;}#mdb-artwork-input, #mdb-artwork-info {height: 20px;background-color: rgba(0, 0, 0, 0.1);display: inline-block;}#mdb-artwork-input, #mdb-artwork-info a {color: #fff;opacity: .5;}#mdb-artwork-info a {text-decoration: underline;}#mdb-artwork-input {overflow: hidden;width: calc( 100% - 110px );padding-left: 3px;padding-right: 3px;}#mdb-artwork-info {width: 110px;text-align: right;}.mdb-artwork-input.selected {background-color: #fc0;color: #fff;}.listenEngagement__commentForm {margin: 0 0 -8px;}.userStream h3 {margin: 0 0 10px;}.infoStats__table td {vertical-align: bottom;}.sc-border-light-right:not(td), .l-user-main {width: 100%;border-right: 0;}.l-sidebar-right {display: none;}.mdb-removeItem {text-align: center;margin: -2px 0 -10px 17px;padding-left: 1px;line-height: 1.7em;font-size: 18px;height: 30px;width: 30px;background-color: #f3f3f3;border-radius: 50%;}.mdb-removeItem:hover {color: #f60;background-color: #eee;}.soundList__item.processed {margin-right: -22px;}.soundList__item .soundTitle__tag, .soundList__item .soundTitle__tag:hover {background-color: #ddd;border-color: #ddd;}.soundList__item {margin-bottom: 20px;}#mdb-streamActions {font-weight: 400 !important;margin-top: -5px;padding-bottom: 20px;}#mdb-streamActions h3 {display: inline;}#mdb-streamActions h3 + h3 {margin-left: 15px;}.stream__list #mdb-streamActions h3 {color: #333 }#mdb-streamActions h3, #mdb-streamActions label {font-size: 16px;}#mdb-streamActions label input {margin: 0 6px 6px 0;}';

$("head").append('<style type="text/css">'+ css +'</style>');



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Track page
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".l-listen-wrapper .soundActions .sc-button-group", trackPage_wait);
function trackPage_wait(jNode) {
    // Artwork link tzo original
    var artworkWrapper = $(".listenArtworkWrapper"),
        artwork_url = $(".sc-artwork",artworkWrapper).html().replace(/.+&quot;(htt.+(?:jpg|png)).+/, "$1");
    log( artworkWrapper.html() );
    log( artwork_url );
    if( typeof artwork_url  !== "undefined" ) {
        append_artwork( artwork_url );
    }
}

// Artwork info
waitForKeyElements("img#mdb-artwork-img", appendArtworkInfo);
function appendArtworkInfo( jNode ) {
    logFunc( "appendArtworkInfo" );

    var origUrl = jNode.attr("src").replace(/(\r\n|\n|\r)/gm, ""), // replace line breaks
        imageType = origUrl.replace(/^.+\.([a-zA-Z]{3})/, "$1").toUpperCase();
        //imageType = origUrl.substr( origUrl.length - 3 ).toUpperCase();
    log( "origUrl: '" + origUrl + "'" );

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
}