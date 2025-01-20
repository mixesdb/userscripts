// ==UserScript==
// @name         Apple Music (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.20.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Apple_Music/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Music/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Apple_Music_3
// @match        https://*music.apple.com/*
// @match        https://*beta.music.apple.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=music.apple.com
// @resource     IMPORTED_CSS_1 https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.css?v-Apple_Music_2
// @resource     IMPORTED_CSS_2 https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/tracklistEditor_copy.css
// @resource     IMPORTED_CSS_3 https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Apple_Music/script.css?v-Apple_Music_3
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==


/*
 * Before anythings starts: Reload the page
 * A tiny delay is needed, otherwise there's constant reloading.
 */

// Apple Music reload fix for Safari
// cannot use redirectOnUrlChange() because URL is
// https://beta.music.apple.com/includes/commerce/fetch-proxy.html?product=music&devToken=…
if( is_safari ) {
    var detectUrlChange_delay = 150,
        detectUrlChange_val_prev = window.location.href;

    setTimeout(function() {
        setInterval(function() {
            var detectUrlChange_val_curr = window.location.href;
            //logVar( "detectUrlChange_val_prev", detectUrlChange_val_prev );
            //logVar( "detectUrlChange_val_curr", detectUrlChange_val_curr );
            //logVar( "window.location.href", window.location.href );

            if( detectUrlChange_val_prev != detectUrlChange_val_curr ) {
                window.location.replace( detectUrlChange_val_curr );
            }
        }, detectUrlChange_delay );
    }, detectUrlChange_delay );
} else {
    redirectOnUrlChange( 750 );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load CSS the hard way (CSP)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const my_css_1 = GM_getResourceText("IMPORTED_CSS_1");
GM_addStyle(my_css_1);

const my_css_2 = GM_getResourceText("IMPORTED_CSS_2");
GM_addStyle(my_css_2);

const my_css_3 = GM_getResourceText("IMPORTED_CSS_3");
GM_addStyle(my_css_3);


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const apiWhitelisted = false;
const pageReadyDelay = 1200;

$("#mdb-tl-fakeOutput").remove();


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Album and playist pages
 * Track durations are added as cue prefix to sum them uo via makeTracklistFromArr()
 * But disabled tracks have no durations (e.g. pre-release albums)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

setTimeout(function() {
    waitForKeyElements('meta[property="og:type"]', function( jNode ) {
        var pageType = jNode.attr("content"); // urlPath(2) returnas "commerce" on playlisst?!!
        logVar( "pageType", pageType );

        if( pageType == "music.album" || pageType == "music.song" ) {
            var tl = "",
                allTracksHaveDurs = true;

            $(".songs-list-row--album:not(.mdb-tl-processed)").each(function() {
                $(this).addClass("mdb-tl-processed");

                // join artist links to array, to then join with " & "
                var artistArr = [];
                $(".songs-list-row__by-line a", this).each(function() {
                    artistArr.push( $(this).text().trim().replace(/^NaN/,"") );
                });

                var dur = $("time", this).text().trim().replace(/^NaN/,""),
                    artist = artistArr.join(" & "),
                    song = normalizeStreamingServiceTracks( $(".songs-list-row__song-name", this).text().trim() );

                // if the artist empty, use the general album artist
                if( artist == "" ) {
                    var artistArr = [];
                    $("main .headings__subtitles a").each(function(){
                        artistArr.push( $(this).text().trim().replace(/^NaN/,"") );
                    });
                    artist = artistArr.join(" & ");
                    log( "No track artist, using album artist: " + artist );
                }

                if( dur !== "" ) {
                    tl += "["+dur+"] ";
                } else {
                    allTracksHaveDurs = false;
                }
                tl += artist  +" - "+ song + "\n";
            });

            tl = tl.trim();

            if( tl !== "" ) {
                var tlTarget = $(".songs-list__header").closest(".section");

                // build cue from durs?
                log( "tl (before building cues via array):\n" + tl );

                var doCueSum = "track duration";
                if( !allTracksHaveDurs ) {
                    doCueSum = "allTracksHaveDurs-not";
                }

                var tlArr = getTracklistArr( tl, "Apple Music", doCueSum );
                logArr( "tlArr", tlArr );

                var tl_cuesAsDur = makeTracklistFromArr( tlArr, "Apple Music", doCueSum );
                log( "tl_cuesAsDur\n" + tl_cuesAsDur );

                if( !apiWhitelisted ) {
                    log( "No soup for you! *.music.apple.com doesn't allow external resources like api.php" );

                    var output = "",
                        rowCount = tl_cuesAsDur.split("\n").length - 1;

                    output += '<table id="mdb-tl-fakeOutput">';
                    output += '<td id="mdb-noSoup-wrapper"><img src="'+noSoupForYou_base64Url+'" width="270" alt="No soup for you!"></td><td>';
                    output += '<p class="mdb-highlight">music.apple.com restricts loading external resources like the Tracklist Editor API.<br />Format this to the standard format by pasting into the Tracklist Editor manually.</p>';
                    output += '<textarea id="mixesdb-TLbox" class="mdb-tlBox mono mdb-selectOnClick" rows="'+rowCount+'">'+tl_cuesAsDur+'</textarea>';

                    if( allTracksHaveDurs ) {
                        var tl_cuesAsDur_controlVersion = makeTracklistFromArr( tlArr, "Apple Music", "track duration control" ),
                            rowCount = tl_cuesAsDur_controlVersion.split("\n").length - 1;
                        log( "tl_cuesAsDur_controlVersion\n" + tl_cuesAsDur_controlVersion );

                        output += '<p class="mdb-highlight">[CUE] minutes are calculated by adding up the track durations. <button id="mdb-toggle-tl-controlVersion"><span>Control version</span></button></p>';
                        output += '<textarea id="mdb-tl-controlVersion" class="mdb-tlBox" rows="'+rowCount+'" style="display:none">'+tl_cuesAsDur_controlVersion+'</textarea>';
                        output += '</td></table>';
                    }

                    tlTarget.before( output );
                    fixTLbox();

                } else {
                    if( tl_cuesAsDur ) {
                        var res = apiTracklist( tl_cuesAsDurl, "Standard" ),
                            tlApi = res.text;
                        logVar( "tlApi:\n" + tlApi );

                        if( tlApi ) {
                            tlTarget.before(ta); // Migth not work because global.js cannot be loaded(?) > Further testing once api.php can be called
                            $("#mixesdb-TLbox").val( tlApi );
                            fixTLbox(res.feedback);
                        }
                    }
                }
            }
        } else {
            log( "No album or playlist page: " + pageType );
        }
    });
}, pageReadyDelay );

/*
 * Toggle control version tracklist
 */
waitForKeyElements("#mdb-toggle-tl-controlVersion", function(jNode) {
    jNode.click(function() {
        $("#mdb-tl-controlVersion").toggle();
    });
});
