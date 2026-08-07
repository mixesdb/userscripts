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