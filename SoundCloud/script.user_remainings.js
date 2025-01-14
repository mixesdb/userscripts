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
