// ==UserScript==
// @name         SoundCloud pimp (by MixesDB)
// @author       MixesDB
// @version      2024.12.25.1
// @description  DJ mix focus: Use track API, get original artwork, hide playlists, reposts and favs in lists
// @homepageURL  https://www.mixesdb.com/w/Help:Pimp_script
// @supportURL   https://www.mixesdb.com/w/MixesDB:Forum/Pimp_scripts
// @updateURL    https://www.mixesdb.com/tools/userscripts/SoundCloud_pimp_by_MixesDB.user.js
// @downloadURL  https://www.mixesdb.com/tools/userscripts/SoundCloud_pimp_by_MixesDB.user.js
// @include      http*soundcloud.com*
// @exclude      http*soundcloud.com/player/*
// @noframes
// @grant        unsafeWindow
// @require      https://www.mixesdb.com/scripts/jquery/jquery-1.7.min.js
// @require      https://www.mixesdb.com/scripts/js-cookie/latest.js?1
// @require      https://www.mixesdb.com/scripts/waitForKeyElements/waitForKeyElements.js
// @require      https://www.mixesdb.com/tools/userscripts/globals.js?SC_9
// @require      https://www.mixesdb.com/tools/userscripts/SoundCloud_funcs.js?20
// ==/UserScript==

var fast = 200,
    soundActionFakeButtonClass = 'sc_button-mdb sc-button-secondary sc-button sc-button-medium mdb-item',
    css = '.hand, .mdb-toggle {cursor: pointer;}.sc-text-grey {color: #999;}.mdb-grey-light {color: #bbb;}#mdb-trackHeader h1 {margin-top: 10px;}#mdb-trackHeader-releaseInfo {margin-bottom: 8px;}#mdb-trackHeader-releaseInfo span + span {margin-left: 10px;}#mdb-trackHeader-releaseInfo date.highlight {color: green;font-weight: bold;}.listenEngagement {padding-bottom: 6px;}.listenEngagement__actions {padding-bottom: 8px;}button.mdb-toggle.selected {border-color: #f60;}.sc_button-mdb a {color: inherit;}#mdb-toggle-target > div {padding-bottom: 10px;margin-bottom: 14px;border-bottom: 1px solid #fff;box-shadow: 0 1px 0 0 #f2f2f2;}#apiText {white-space: break-spaces;}#mdb-fileDetails {padding-bottom: 16px !important;}#mdb-fileDetails textarea {width: 19em;font-family: monospace;}.sc-button-group {padding: 0 !important;}.sc-button-group {margin: 0 !important;}.sc-button-group *, .sc-button-toolbar>.sc-button {margin-left: 0 !important;margin-right: 7px !important;}.listenArtworkWrapper {display: none;}.fullHero__artwork {width: 340px;height: 360px;}.fullHero__artwork * {width: 340px;height: 340px;}#mdb-artwork-input, #mdb-artwork-info {height: 20px;background-color: rgba(0, 0, 0, 0.1);display: inline-block;}#mdb-artwork-input, #mdb-artwork-info a {color: #fff;opacity: .5;}#mdb-artwork-info a {text-decoration: underline;}#mdb-artwork-input {overflow: hidden;width: calc( 100% - 110px );padding-left: 3px;padding-right: 3px;}#mdb-artwork-info {width: 110px;text-align: right;}.mdb-artwork-input.selected {background-color: #fc0;color: #fff;}.listenEngagement__commentForm {margin: 0 0 -8px;}.userStream h3 {margin: 0 0 10px;}.infoStats__table td {vertical-align: bottom;}.sc-border-light-right:not(td), .l-user-main {width: 100%;border-right: 0;}.l-sidebar-right {display: none;}.mdb-removeItem {text-align: center;margin: -2px 0 -10px 17px;padding-left: 1px;line-height: 1.7em;font-size: 18px;height: 30px;width: 30px;background-color: #f3f3f3;border-radius: 50%;}.mdb-removeItem:hover {color: #f60;background-color: #eee;}.soundList__item.processed {margin-right: -22px;}.soundList__item .soundTitle__tag, .soundList__item .soundTitle__tag:hover {background-color: #ddd;border-color: #ddd;}.soundList__item {margin-bottom: 20px;}#mdb-streamActions {font-weight: 400 !important;margin-top: -5px;padding-bottom: 20px;}#mdb-streamActions h3 {display: inline;}#mdb-streamActions h3 + h3 {margin-left: 15px;}.stream__list #mdb-streamActions h3 {color: #333 }#mdb-streamActions h3, #mdb-streamActions label {font-size: 16px;}#mdb-streamActions label input {margin: 0 6px 6px 0;}';

$("head").append('<style type="text/css">'+ css +'</style>');


/*
 * Carry the access_token for SC API calls
 */
var scAccessToken,
    current_href = location.href;


/*****************************************************************************************
 * 
 * Track page
 * 
 *****************************************************************************************/
waitForKeyElements(".l-listen-wrapper .soundActions .sc-button-group", kindTrackActionButtons);
function kindTrackActionButtons(jNode) {
    xc( location.href );

    // artwork
    var artworkWrapper = $(".listenArtworkWrapper"),
        artwork_url = $(".sc-artwork",artworkWrapper).html().replace(/.+&quot;(htt.+(?:jpg|png)).+/, "$1");
    console.log( artworkWrapper.html() );
    console.log( artwork_url );
    if( typeof artwork_url  !== "undefined" ) {
        append_artwork( artwork_url );
    }

    // API call
    getScAccessTokenFromApi(function(output){
        scAccessToken = output;
        xc( "scAccessToken: " + scAccessToken );

        // Call API on current page
        var trackUrl = location.href,
            trackUrlE = encodeURIComponent( trackUrl );

        $.ajax({
            beforeSend: function(request) {
                request.setRequestHeader("Authorization", "OAuth " + scAccessToken );
            },
            dataType: "json",
            url: "https://api.soundcloud.com/resolve?url=" + trackUrlE,
            success: function(t) {
                t.user = t.user.username;
                var apiText = JSON.stringify( t, null, "\t" ).replace(/({\n|\n})/gm, "").replace(/^\t{1}/gm,"").replace(/"user": \t/,'"user":\n').replace(/("|,|null,?)/g,''),
                    apiText = linkify( apiText );

                var soundActions = jNode,
                    id = t.id,
                    title = t.title,
                    created_at = formatScDate( t.created_at ),
                    release_date = formatScDate( t.release_date ),
                    last_modified = formatScDate( t.last_modified ),
                    permalink_url = t.permalink_url,
                    artwork_url = t.artwork_url,
                    duration = t.duration,
                    kind = t.kind,
                    downloadable = t.downloadable;

                console.log( kind +": "+ title );

                if( kind == "track" ) {
                    // trackHeader
                    var trackHeader = $("#mdb-trackHeader");
                    if( $("h1", trackHeader).length === 0 ) {
                        var trackHeader_content = '<h1 id="mdb-trackHeader-headline">'+title+'</h1>';
                        trackHeader_content += '<p id="mdb-trackHeader-releaseInfo" class="sc-text-grey">';
                        trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-createDate"><span>Created at:</span> <date id="mdb-trackHeader-date1">'+created_at+'</date></span>';
                        if( release_date != "" ) {
                            trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-releaseDate"><span>Release date:</span> <date id="mdb-trackHeader-date2">'+release_date+'</date></span>';
                        }
                        if( last_modified != "" ) {
                            trackHeader_content += '<span id="mdb-trackHeader-releaseInfo-lastmodDate"><span>Last modified:</span> <date id="mdb-trackHeader-date3">'+last_modified+'</date></span>';
                        }
                        trackHeader_content += '</p>';
                        trackHeader.append( trackHeader_content );

                        var dateClass = "highlight selectOnClick hand";
                        if( release_date == "" ) {
                            $("#mdb-trackHeader-releaseInfo-createDate date").addClass( dateClass );
                        } else {
                            $("#mdb-trackHeader-releaseInfo-releaseDate date").addClass( dateClass );
                        }
                    }

                    // add toggleTarget
                    if( $("#mdb-toggle-target").length === 0 ) {
                        $(".listenDetails").prepend( '<div id="mdb-toggle-target"></div>' );
                    }

                    // duration
                    xc("dur: " + duration );
                    if( duration !== null ) {
                        if( $("#mdb-fileInfo").length === 0 ) {
                            append_fileDetails( duration, soundActions );
                        }
                    }

                    // apiText-toggleButton
                    //xc($("#apiText-toggleButton").length);
                    if( $("#apiText-toggleButton").length == 0 ) {
                        soundActions.append( '<button id="apiText-toggleButton" class="'+soundActionFakeButtonClass+' mdb-toggle" data-toggleid="apiText">API</button>' );
                        $("#mdb-toggle-target").append('<div id="apiText" style="display:none">'+apiText+'</div>');
                    }

                }
            },
            error: function() {
                xc( "No track or no API!" );
            }
        });
    });
}

/*
 * Prepare track page
 * Add here instead of after API call for less flashing
 */
waitForKeyElements(".commentsList__title", moveCommentsInput);
function moveCommentsInput(jNode) {
    $(".listenEngagement__commentForm").insertBefore(jNode);
}
waitForKeyElements(".l-listen-hero", listenHero);
function listenHero( jNode ) {
    var trackHeader = '<div id="mdb-trackHeader"></div>';
    jNode.before( trackHeader );
}


/*****************************************************************************************
 * 
 * User page
 * 
 *****************************************************************************************/
// user sidebar
waitForKeyElements(".userSidebar .infoStats", userSidebar);
function userSidebar() {
    xc( "userSidebar()" );

    // unwrap right sidebar
    if( $("#mdb-userSidebar").length === 0 ) {
        $(".userInfoBar").prepend('<div id="mdb-userSidebar"><div id="mdb-userSidebar-toggleContent" style="display:none"></div></div>');
        var userSidebar = $("#mdb-userSidebar"),
            userSidebarToggleContent = $("#mdb-userSidebar-toggleContent");
        userSidebar.prepend( $(".userSidebar .infoStats .infoStats__description") );
        userSidebar.prepend( $(".userSidebar .infoStats .infoStats__table") );
        userSidebarToggleContent.append( $(".userSidebar .infoStats") );
        userSidebarToggleContent.append( $(".userSidebar .likesModule") );
        userSidebarToggleContent.append( $(".userSidebar .relatedArtistsModule") );
        userSidebarToggleContent.append( $(".userSidebar .followersModule") );
        userSidebarToggleContent.append( $(".userSidebar .followingsModule") );
        $(".l-sidebar-right").remove();

        // toggle
        $(".infoStats__table tr").append('<td><div id="mdb-userProfile-toggle" class="infoStats__value mdb-toggle sc-text-grey" data-toggleid="mdb-userSidebar-toggleContent">More</div></td>');
    }
}


/*****************************************************************************************
 * 
 * Stream page
 * 
 *****************************************************************************************/
// user sidebar
waitForKeyElements(".streamSidebar", streamSidebar);
function streamSidebar() {
    xc( "streamSidebar()" );
}


/*****************************************************************************************
 * 
 * Stream and user page
 * 
 *****************************************************************************************/
// url parameters
var getHidePl = getURLParameter("hidePl") == "true" ? "true" : "false",
    getHideReposts = getURLParameter("hideReposts") == "true" ? "true" : "false",
    getHideFav = getURLParameter("hideFav") == "true" ? "true" : "false";

// stream
waitForKeyElements(".stream__list .lazyLoadingList", lazyLoadingList);
waitForKeyElements(".userStream.lazyLoadingList", lazyLoadingList);
waitForKeyElements(".soundList.lazyLoadingList", lazyLoadingList);

function lazyLoadingList(jNode) {
    xc("lazyLoadingList()");

    // add checkboxes
    if( $("#mdb-streamActions").length === 0 ) {
        jNode.before('<div id="mdb-streamActions" class="spotlightTitle sc-text-grey sc-border-light-bottom"></div>');

        var sa = $("#mdb-streamActions"),
            checkedPl = "checked",
            checkedFav = "";
        if( getHidePl == "false" ) var checkedPl = '';
        if( getHideReposts == "true" ) var checkedReposts = 'checked';
        if( getHideFav == "true" ) var checkedFav = 'checked';

        sa.append('<h3 class="sc-text-light">Hide:</h3>');
        sa.append('<h3><label class="pointer"><input type="checkbox" id="hidePl" name="hidePl" '+checkedPl+' value="">Playlists</label></h3>');
        sa.append('<h3><label class="pointer"><input type="checkbox" id="hideReposts" name="hideReposts" '+checkedReposts+' value="">Reposts</label></h3>');
        sa.append('<h3><label class="pointer"><input type="checkbox" id="hideFav" name="hideFav" '+checkedFav+' value="">Favs</label></h3>');

    }
    
    // reload
    var windowLocation = window.location,
        href = $(location).attr('href');

    if( typeof href != "undefined" ) {
        var url = href.replace(/\?.*$/g,"");
    }
    
    if( typeof url != "undefined" ) {
        $("#hidePl").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl=false&hideReposts="+getHideReposts+"&hideFav="+getHideFav;
                              } else { windowLocation.href = url + "?hidePl=true&hideReposts="+getHideReposts+"&hideFav="+getHideFav;
        }});
        $("#hideReposts").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=false&hideFav="+getHideFav;
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts=true&hideFav="+getHideFav;
        }});
        $("#hideFav").change(function(){
            if(!this.checked) { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=false";
                              } else { windowLocation.href = url + "?hidePl="+getHidePl+"&hideReposts="+getHideReposts+"&hideFav=true";
        }});
    }
}

// each player
waitForKeyElements(".soundList__item .sound__body", eachPlayer);
function eachPlayer(jNode) {
    var pl = $(".soundList__item:has(.sound.playlist)"),
        repost = $(".soundList__item:has(.soundTitle__info .sc-ministats-reposts)"),
        fav = $(".soundList__item:has(.sc-button-like.sc-button-selected)");
    if( getHidePl == "true" ) pl.remove();
    if( getHideReposts == "true" ) repost.remove();
    if( getHideFav == "true" ) fav.remove();

        
    /*
     * Unwrap tag links
     */
    $(".soundTitle__tag").attr("href","javascript:void(0);").css("cursor","default");
    
    var trackUrl = "https://soundcloud.com" + $(".soundTitle__title", jNode).attr("href"),
        trackUrlE = encodeURIComponent( trackUrl );
}

// each player - remove favs fav
waitForKeyElements(".sc-button-like.sc-button-selected", streamFavWait);
function streamFavWait(jNode) {
    var fav = $(".soundList__item:has(.sc-button-like.sc-button-selected)");
    if( getHideFav == "true" ) fav.remove();
}


/*****************************************************************************************
 * 
 * Rest
 * 
 *****************************************************************************************/
// toggle click
waitForKeyElements(".mdb-toggle", mdbToggle);
function mdbToggle( jNode ) {
    jNode.click(function(){
        var toggleId = $(this).attr("data-toggleid");
        xc( toggleId );
        $("#"+toggleId).slideToggle();
        $(this).toggleClass("selected");
        
        if( toggleId == "mdb-fileDetails" ) $("#mdb-fileDetails textarea").click();
    });
}

// mdb-select-onClick
waitForKeyElements(".selectOnClick", selectOnClick);
function selectOnClick( jNode ) {
    jNode.click(function(){
        xc( "click" );
        jNode.addClass("selected").select().focus();
        
        var tagName = $(this).prop("tagName");
        //xc( tagName );
        if( tagName == 'DATE' || tagName == "H1" ) {
            selectText( $(this).attr("id") );
        }
    });
}