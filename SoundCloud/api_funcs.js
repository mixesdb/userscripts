log( "/SoundCloud/api_funcs.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * API funs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// getScAccessTokenFromApi
// Get access_token
function getScAccessTokenFromApi(handleData) {
    logFunc( "getScAccessTokenFromApi" );
    $.ajax({
        type: "POST",
        url: "https://www.mixesdb.com/tools/api/api.php",
        data: { query: "getScAccessToken" }
    })
    .fail(function( jqXHR, textStatus, errorThrown ) {
        log( "getScAccessTokenFromApi: FAILED to reach MixesDB API (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + ")" );
    })
    .done(function(data) {
        log( "getScAccessTokenFromApi: API responded. data: " + data );
        var dataParsed = jQuery.parseJSON( data );
        log( "getScAccessTokenFromApi: data parsed, access_token: " + ( dataParsed ? dataParsed.access_token : "null" ) );
        if( dataParsed !== null ) {
            handleData( dataParsed.access_token );
        } else {
            log( "getScAccessTokenFromApi: dataParsed is null - handleData() not called, caller will hang waiting for scAccessToken." );
        }
    });
}

// getScTrackComments
// The comments under a track, reduced to their plain bodies - which is all the tracklist
// detector wants. Only ever called when the description held no tracklist (the page creator
// decides that, see mdbPageCreator_addTracklist), so this costs a request on the minority of
// tracks rather than on all of them.
//
// One page of 200 and no paging beyond it: 200 is the endpoint's maximum, and a track busy
// enough to bury a tracklist under more than 200 comments is not one where it would be found.
function getScTrackComments( trackId, accessToken, handleData ) {
    logFunc( "getScTrackComments" );

    if( !trackId || !accessToken ) {
        log( "getScTrackComments: no track ID or no access token - no comments to look at." );
        handleData( [] );
        return;
    }

    $.ajax({
        beforeSend: function( request ) {
            request.setRequestHeader( "Authorization", "OAuth " + accessToken );
        },
        dataType: "json",
        url: "https://api.soundcloud.com/tracks/" + trackId + "/comments?limit=200&linked_partitioning=true",
        success: function( data ) {
            // linked_partitioning wraps the array in a "collection", but the endpoint has
            // answered with a bare array often enough to be worth catching both
            var list = ( data && data.collection ) ? data.collection : ( Array.isArray( data ) ? data : [] ),
                bodies = [];

            $.each( list, function( i, comment ) {
                if( comment && comment.body ) bodies.push( comment.body );
            });

            logVar( "getScTrackComments: comments read", bodies.length );
            handleData( bodies );
        },
        error: function( jqXHR, textStatus, errorThrown ) {
            log( "getScTrackComments: FAILED (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + ") - carrying on without comments." );
            handleData( [] );
        }
    });
}

// addApiErrorNote
function addApiErrorNote( reason="" ) {
    var reasonAdd = "";
    if( reason != "" ) {
        reasonAdd = ' ('+reason+')';
    }

    // New Material "Track header" layout (since ~Aug 2026 redesign) has no .listenDetails anymore
    var noteTarget = $("#mdb-sc-trackExtras").length ? $("#mdb-sc-trackExtras") : $(".listenDetails");
    noteTarget.prepend('<p class="mdb-warning">The API is currently not responding'+reasonAdd+'. Please check back later.</p>');
}