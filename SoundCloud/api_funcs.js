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
    .fail(function() {
        console.log( "Cannot access MixesDB API or error!" );
    })
    .done(function(data) {
        log( "API called. data: " + data );
        var dataParsed = jQuery.parseJSON( data );
        log( "data parsed: " + data.access_token );
        if( dataParsed !== null ) {
            handleData( dataParsed.access_token );
        }
    });
}

// addApiErrorNote
function addApiErrorNote( reason="" ) {
    var reasonAdd = "";
    if( reason != "" ) {
        reasonAdd = ' ('+reason+')';
    }
    $(".listenDetails").prepend('<p class="mdb-warning">The API is currently not responding'+reasonAdd+'. Please check back later.</p>');
}