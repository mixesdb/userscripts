// ==UserScript==
// @name         The Lot Radio (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.05.06.3
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/The_Lot_Radio/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/The_Lot_Radio/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-The_Lot_Radio_3
// @include      http*thelotradio.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=thelotradio.com
// @noframes
// @run-at       document-end
// ==/UserScript==


/*
 * Before anythings starts: Reload the page
 * A tiny delay is needed, otherwise there's constant reloading.
 */
redirectOnUrlChange( 60 );


function normalizeTheLotRadioText( text ) {
    return text
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function theLotRadioTimeToSeconds( time ) {
    var parts = time.split(":");

    if( parts.length !== 3 ) {
        return null;
    }

    var hours = parseInt(parts[0], 10),
        minutes = parseInt(parts[1], 10),
        seconds = parseInt(parts[2], 10);

    if( isNaN(hours) || isNaN(minutes) || isNaN(seconds) ) {
        return null;
    }

    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatTheLotRadioCue( totalSeconds, padTo ) {
    var minutes = Math.round(totalSeconds / 60);

    return pad( minutes, padTo );
}

function buildTheLotRadioTracklist( wrapperUl ) {
    var wrapper = $(wrapperUl);

    if( urlPath_noParams(1) !== "shows" || wrapper.hasClass("mdb-processed-tracklist") ) {
        return;
    }

    var tracks = [],
        lastTrackSeconds = 0;

    wrapper.find("li button > div.grid").each(function(){
        var row = $(this),
            time = normalizeTheLotRadioText( row.children("span").eq(0).text() ),
            trackInfo = row.children("span").eq(1),
            title = normalizeTheLotRadioText( trackInfo.children("span").eq(0).text() ),
            artist = normalizeTheLotRadioText( trackInfo.children("span").eq(1).text() ),
            timeSeconds = time !== "" ? theLotRadioTimeToSeconds( time ) : null;

        if( title === "" && artist === "" ) {
            return;
        }

        if( timeSeconds !== null ) {
            lastTrackSeconds = timeSeconds;
        }

        tracks.push({
            artist: artist,
            timeSeconds: timeSeconds,
            title: title
        });
    });

    if( tracks.length === 0 ) {
        return;
    }

    var padTo = Math.round(lastTrackSeconds / 60) > 99 ? 3 : 2,
        lines = [];

    if( tracks[0].timeSeconds !== null && Math.round(tracks[0].timeSeconds / 60) > 1 ) {
        lines.push( "# [" + formatTheLotRadioCue( 0, padTo ) + "] ?" );
    }

    $.each( tracks, function( index, track ) {
        var line = "# ",
            nextTrack = tracks[index + 1];

        if( track.timeSeconds !== null ) {
            line += "[" + formatTheLotRadioCue( track.timeSeconds, padTo ) + "] ";
        }

        if( track.artist !== "" ) {
            line += track.artist;
        }

        if( track.title !== "" ) {
            line += (track.artist !== "" ? " - " : "") + track.title;
        }

        lines.push( line );

        if( track.timeSeconds !== null && nextTrack && nextTrack.timeSeconds !== null && nextTrack.timeSeconds - track.timeSeconds >= 480 ) {
            lines.push( "..." );
        }
    });

    var tlRaw = lines.join("\n");
    log( "tl before API:\n" + tlRaw );

    var res = apiTracklist( tlRaw, "standard" ),
        tlApi = (res && res.text) ? res.text : tlRaw,
        feedback = (res && res.feedback) ? res.feedback : "";

    if( tlApi ) {
        var tlEditor = $('<div class="tlEditor mdb-thelotradio-tracklist"></div>'),
            tlTextarea = $('<textarea class="mono mixesdb-TLbox" wrap="off" style="display:none; width:100%; margin:10px 0 0 0; white-space:pre; overflow-x:auto; resize:vertical;"></textarea>');

        tlTextarea
            .attr("rows", Math.max(lines.length, 8))
            .val( tlApi )
            .show();

        tlEditor.append( tlTextarea );
        wrapper.before( tlEditor );
        fixTLbox( feedback, tlEditor );
        wrapper.addClass("mdb-processed-tracklist");
    }
}

waitForKeyElements("ul.t-body-small.text-dark-gray", function( jNode ) {
    buildTheLotRadioTracklist( jNode );
});