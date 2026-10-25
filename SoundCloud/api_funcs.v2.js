log( "/SoundCloud/api_funcs.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * API funs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Provider credentials stay on MixesDB. Only metadata crosses this boundary.
// Complete either callback so a provider failure cannot leave a page waiting for a token.
function getScTrackFromApi( trackUrl, handleData, handleError ) {
    return $.ajax({
        type: "POST",
        url: "https://www.mixesdb.com/tools/api/api.php",
        dataType: "json",
        data: { query: "getScTrack", client_family: typeof scriptName === "string" ? scriptName : "unknown", client_version: "2026.10.25.1", url: scMetadataLocator( trackUrl ) }
    }).done(function( data ) {
        if( data && data.kind === "track" ) {
            handleData( data );
        } else if( handleError ) {
            handleError();
        }
    }).fail(function() {
        log( "getScTrackFromApi: metadata unavailable." );
        if( handleError ) handleError();
    });
}

// Discard tracking parameters, but retain a caller's explicit private-share capability.
function scMetadataLocator( value ) {
    try {
        var url = new URL( value );
        var secrets = url.searchParams.getAll( "secret_token" );
        if( secrets.length > 1 ) return "";
        var secret = secrets[0];
        url.protocol = "https:";
        url.hash = "";
        url.search = "";
        if( secret ) url.searchParams.set( "secret_token", secret );
        return url.href;
    } catch( error ) {
        return "";
    }
}

// formatScDate
// The API's "2026/08/07 17:28:15 +0000" as the "2026-08-07" MixesDB titles and reports use.
// Lives here, not in script.funcs.js: every script reading the SC API needs it (TrackId.net
// feeds the Page Creator from SC track data too), and this is the file they all @require.
function formatScDate( date ) {
    // string check, not just typeof !== "undefined": the API answers null for a missing
    // release_date, and null.replace() would take the whole success handler down with it
    if( typeof date === "string" ) {
        date = date.replace(/(\d\d\d\d)\/(\d\d)\/(\d\d).+$/g,"$1-$2-$3");
    } else {
        date = "";
    }
    return date;
}

// scArtworkOriginalUrl
// SoundCloud writes the size into the artwork's file name ("-t500x500", "-large", ...) and
// serves the same picture in a dozen of them. MixesDB wants the biggest one there is, so
// whichever size the API named is swapped for "-original". Whether that one really exists is
// a separate question - loadArtworkInfo() in script.funcs.js, and MixesDB's own upload form
// over there, both fall back to a size that loads.
// Here rather than in script.funcs.js for the same reason as formatScDate above.
function scArtworkOriginalUrl( artwork_url ) {
    return String( artwork_url || "" )
        .replace( /-(t\d\d\d?\d?x\d\d\d?\d?|crop|large|badge|small|tiny|mini|original)/g, "-original" );
}

// One page of plain comment bodies, only when the description held no tracklist.
// The server checks the same track locator before reading comments; no arbitrary API URL.
function getScTrackComments( trackUrl, handleData ) {
    return $.ajax({
        type: "POST",
        url: "https://www.mixesdb.com/tools/api/api.php",
        dataType: "json",
        data: { query: "getScTrackComments", client_family: typeof scriptName === "string" ? scriptName : "unknown", client_version: "2026.10.25.1", url: scMetadataLocator( trackUrl ) }
    }).done(function( data ) {
        handleData( data && Array.isArray( data.bodies ) ? data.bodies : [] );
    }).fail(function() {
        log( "getScTrackComments: unavailable; carrying on without comments." );
        handleData( [] );
    });
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Channel handles in tracklists
 *
 * Uploaders credit remixers by their SoundCloud @handle instead of by name - "Blur - Tender
 * (@reyneke Reinterpretation)", "@drparnassus - Locomotiva". A handle is not an artist name
 * and MixesDB cannot do anything with one, so every handle is looked up and replaced by the
 * name its channel carries. The name may not be how the artist is credited elsewhere, but it
 * is a name rather than a login, which is what makes the tracklist usable at all.
 *
 * The lookup is soundcloud.com/oembed: no token, no client_id, and SAME ORIGIN on the pages
 * this runs on, so there is no CORS to arrange and nothing to keep in sync when SoundCloud
 * rotates its keys. It answers with the channel's display name in "title".
 *
 * Only ever run over a text a tracklist was already DETECTED in - see the call in
 * script.user.js. A track whose description holds no tracklist costs no request at all.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// A handle as SoundCloud spells its permalinks: 3-25 characters of [a-z0-9_-]. Matched
// case-insensitively because uploaders type "@Nhiimusic" for a channel called "nhiimusic".
//
// The character BEFORE the @ is captured and put back rather than tested with a lookbehind
// (Safari only learned those in 16.4). It must not be a word character, a dot or a slash,
// which is what keeps "notredame@effect-mgmt.com" and ".../@foo" out of the match.
var scHandleRe = /(^|[^A-Za-z0-9_@.\/-])@([A-Za-z0-9][A-Za-z0-9_-]{2,24})(?![A-Za-z0-9_-])/g;

var scHandleCacheKey = "mdb_sc_handle_names_v1",
    // Channel names change rarely and a stale one is no worse than the handle it replaced, so
    // this is deliberately long: the same remixers turn up across a whole label's uploads.
    scHandleCacheTtl = 90 * 24 * 3600 * 1000,
    // A miss is kept far shorter: a deleted channel can come back, and a request that failed
    // on the network must not poison the name for a quarter of a year.
    scHandleCacheNegTtl = 7 * 24 * 3600 * 1000,
    // Per tracklist. A 200-track list of nothing but handles would otherwise be 200 requests;
    // beyond this the remaining handles are simply left standing.
    scHandleMax = 50,
    // How many lookups are in the air at once. SoundCloud answers oembed quickly and these are
    // same-origin, but a burst of 50 parallel requests is rude and invites a 429.
    scHandleConcurrency = 4;

// scHandleCacheRead / scHandleCacheWrite
// { handle: { name: string|null, t: timestamp } }. A null name is a remembered miss.
function scHandleCacheRead() {
    try {
        return JSON.parse( localStorage.getItem( scHandleCacheKey ) || "{}" ) || {};
    } catch( e ) {
        return {};
    }
}

function scHandleCacheWrite( cache ) {
    try {
        localStorage.setItem( scHandleCacheKey, JSON.stringify( cache ) );
    } catch( e ) {
        // a full or blocked localStorage costs us the cache, not the feature
        log( "scHandleCacheWrite: could not store the handle cache (" + e + ")" );
    }
}

// scHandleCached
// The remembered name, or undefined when nothing usable is remembered. Returns null for a
// remembered miss, which is why the caller has to check with "typeof", not for truthiness.
function scHandleCached( cache, handle ) {
    var hit = cache[ handle ];

    if( !hit ) return undefined;

    var ttl = hit.name ? scHandleCacheTtl : scHandleCacheNegTtl;

    if( ( Date.now() - ( hit.t || 0 ) ) > ttl ) return undefined;

    return hit.name;
}

// scHandlesInText
// Every distinct handle in the text, lowercased - the form the permalink actually has.
function scHandlesInText( text ) {
    var found = [],
        seen = {},
        m;

    scHandleRe.lastIndex = 0; // a /g regex keeps its position between calls

    while( ( m = scHandleRe.exec( String( text || "" ) ) ) !== null ) {
        var handle = m[2].toLowerCase();

        if( !seen[ handle ] ) {
            seen[ handle ] = true;
            found.push( handle );
        }
    }

    return found;
}

// scLookupHandle
// One channel's name, or null. Never throws - a handle that cannot be looked up is left in the
// tracklist as it was, which is the honest outcome: a visible @handle beats a wrong name.
async function scLookupHandle( handle ) {
    try {
        var url = "https://soundcloud.com/oembed?format=json&url=" +
                  encodeURIComponent( "https://soundcloud.com/" + handle );

        // credentials omitted although this is same-origin: the lookup is about a public
        // channel and has no business carrying the reader's session
        var r = await fetch( url, { credentials: "omit" } );

        if( !r.ok ) {
            log( "scLookupHandle: @" + handle + " - HTTP " + r.status );
            return null;
        }

        var data = await r.json(),
            name = data && data.title ? String( data.title ).trim() : "";

        // oembed answers for tracks and sets too. A handle in a tracklist should only ever be
        // a user, and a track title dropped in as an artist name would be worse than nothing.
        if( data && data.type && data.type !== "rich" && data.type !== "link" ) {
            log( "scLookupHandle: @" + handle + " - oembed type \"" + data.type + "\", not a channel" );
            return null;
        }

        if( !name ) return null;

        logVar( "scLookupHandle: @" + handle, name );

        return name;
    } catch( e ) {
        log( "scLookupHandle: @" + handle + " FAILED (" + e + ")" );
        return null;
    }
}

// scResolveHandleNames
// The handles that are not cached, looked up a few at a time. Hands back a plain
// { handle: name } of everything that RESOLVED - misses are left out, not carried as null.
async function scResolveHandleNames( handles ) {
    var cache = scHandleCacheRead(),
        names = {},
        toLookUp = [];

    $.each( handles, function( i, handle ) {
        var cached = scHandleCached( cache, handle );

        if( typeof cached === "undefined" ) {
            toLookUp.push( handle );
        } else if( cached ) {
            names[ handle ] = cached;
        }
    });

    logVar( "scResolveHandleNames: handles", handles.length + " (" + toLookUp.length + " to look up, rest cached)" );

    if( toLookUp.length > scHandleMax ) {
        log( "scResolveHandleNames: " + toLookUp.length + " uncached handles - looking up the first " + scHandleMax + " only." );
        toLookUp = toLookUp.slice( 0, scHandleMax );
    }

    // a small pool rather than Promise.all over everything - see scHandleConcurrency
    var next = 0;

    async function worker() {
        while( next < toLookUp.length ) {
            var handle = toLookUp[ next++ ],
                name = await scLookupHandle( handle );

            cache[ handle ] = { name: name, t: Date.now() };

            if( name ) names[ handle ] = name;
        }
    }

    var workers = [];

    for( var i = 0; i < Math.min( scHandleConcurrency, toLookUp.length ); i++ ) {
        workers.push( worker() );
    }

    await Promise.all( workers );

    scHandleCacheWrite( cache );

    return names;
}

// scReplaceHandles
// Every resolved handle in the text swapped for its channel name, "@" and all. Unresolved ones
// are left exactly as they were.
function scReplaceHandles( text, names ) {
    return String( text || "" ).replace( scHandleRe, function( match, before, handle ) {
        var name = names[ handle.toLowerCase() ];

        return name ? ( before + name ) : match;
    });
}

// scResolveHandles
// The whole job. scanText is the text the handles are harvested from - the one a tracklist was
// detected in - and applyTo is every string the replacement is then made in: that is the same
// single text for a description, and ALL comment bodies for a tracklist found in a comment
// (the detector re-reads the bodies itself, so a swap in only one of them would be lost).
//
// done( applyTo /* array, replaced */, replacements /* [{ handle, name }], sorted */ )
// is called even when nothing was resolved, so the caller has one path, not two.
function scResolveHandles( scanText, applyTo, done ) {
    logFunc( "scResolveHandles" );

    var handles = scHandlesInText( scanText );

    if( !handles.length ) {
        log( "scResolveHandles: no channel handles in this tracklist." );
        done( applyTo, [] );
        return;
    }

    scResolveHandleNames( handles ).then(function( names ) {
        var replacements = [];

        $.each( handles, function( i, handle ) {
            if( names[ handle ] ) replacements.push({ handle: handle, name: names[ handle ] });
        });

        logVar( "scResolveHandles: resolved", replacements.length + " of " + handles.length );

        done( $.map( applyTo, function( text ) {
            return scReplaceHandles( text, names );
        }), replacements );
    }).catch(function( e ) {
        // the tracklist still has to reach the box - with its handles, as it always did
        log( "scResolveHandles: FAILED (" + e + ") - handing the text over unchanged." );
        done( applyTo, [] );
    });
}

// scHandleNoticeHtml
// What the tracklist box says about it. Warning mode, because these are artist names the
// uploader never typed: the reader has to see which ones we put there before saving the page.
// Empty string when nothing was resolved, so the caller can hand the result straight on.
function scHandleNoticeHtml( replacements ) {
    if( !replacements || !replacements.length ) return "";

    var esc = function( s ) { return $( "<div>" ).text( String( s ) ).html(); },
        pairs = $.map( replacements, function( r ) {
            return "<code>@" + esc( r.handle ) + "</code> &rarr; <code>" + esc( r.name ) + "</code>";
        });

    return "<strong>" + replacements.length + " artist " +
           ( replacements.length === 1 ? "name is" : "names are" ) +
           " a resolved SoundCloud channel handle</strong>, not a name the uploader wrote: " +
           pairs.join( ", " ) + ". Check them against how the artists are credited on MixesDB.";
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