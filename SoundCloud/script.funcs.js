log( "script.funcs.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// append_artwork()
function append_artwork( artwork_url ) {
    logFunc( "append_artwork" );

    // also change for upload form [?]
    var thumbURL = artwork_url.replace(/-(t\d\d\d?\d?x\d\d\d?\d?|crop|large|badge|small|tiny|mini|original)/g, "-t500x500"),
        artworkURL = thumbURL,
        origUrl = thumbURL.replace("-t500x500", "-original");

    logVar( "artworkURL (thumbURL)", artworkURL );
    logVar( "origUrl", origUrl );

    if( $("#mdb-artwork-wrapper").length === 0 ) {
        if( $(".listenArtworkWrapper").length ) {
            $(".listenArtworkWrapper").replaceWith('<div id="mdb-artwork-wrapper"></div>');
            var imgWrapper = $("#mdb-artwork-wrapper");

            imgWrapper.append( createArtworkInfoWrapper( origUrl, {
                wrapperId: "mdb-artwork-input-wrapper",
                inputId: "mdb-artwork-input",
                inputClass: "selectOnClick",
                infoId: "mdb-artwork-info"
            }) );
            imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');

        } else if( $(".listenInfo .listenArtistInfo__report").length ) {
            var artworkInfoWrapper = createArtworkInfoWrapper( origUrl, {
                wrapperId: "mdb-artwork-input-wrapper",
                inputId: "mdb-artwork-input",
                inputClass: "selectOnClick",
                infoId: "mdb-artwork-info"
            });
            artworkInfoWrapper.append('<img id="mdb-artwork-img" src="'+origUrl+'" style="display:none;" />');
            $(".listenInfo .listenArtistInfo__report").replaceWith( artworkInfoWrapper );
        }
    }
}

// append_artwork_trackExtras()
// New Material "Track header" layout (since ~Aug 2026 redesign): the artwork <img> is a
// React-managed node inside a box that clips its overflow, and tracks showing a "visuals"
// banner have no artwork <img> in the visible header at all. So the info bar is not attached
// to the artwork but added to the trackExtras wrapper, built from the API's artwork_url.
function append_artwork_trackExtras( wrapper, artwork_url ) {
    logFunc( "append_artwork_trackExtras" );

    var thumbURL = artwork_url.replace(/-(t\d\d\d?\d?x\d\d\d?\d?|crop|large|badge|small|tiny|mini|original)/g, "-t500x500"),
        origUrl = thumbURL.replace("-t500x500", "-original");

    logVar( "origUrl", origUrl );

    wrapper.append( createArtworkInfoWrapper( origUrl, {
        wrapperId: "mdb-artwork-input-wrapper",
        wrapperClass: "mdb-artwork-input-wrapper-trackHeader",
        inputId: "mdb-artwork-input",
        inputClass: "selectOnClick",
        infoId: "mdb-artwork-info"
    }) );
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Playlist funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// linkRemoveSetParameter
function linkRemoveSetParameter( url ) {
    return url.replace( /^(.+)\?in=.+$/, "$1" )
              .replace( /^(.+)\?in_system_playlist=.+$/, "$1" );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Hiding options funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// removeFavedPlayer_ifOptedIn
function removeFavedPlayer_ifOptedIn( jNode ) {
    logFunc( "removeFavedPlayer_ifOptedIn" );

    if( getHideFav == "true" ) {
        log( "Hidden: " + jNode.closest(".soundTitle__title") );
        jNode.closest(".soundList__item").remove();
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Misc
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// formatScDate
function formatScDate( date ) {
    if( typeof(date) !== "undefined" ) {
        date = date.replace(/(\d\d\d\d)\/(\d\d)\/(\d\d).+$/g,"$1-$2-$3");
    } else {
        date = "";
    }
    return date;
}


// fixScRedirectUrl
function fixScRedirectUrl( url ) {
    // https://gate.sc/?url=http%3A%2F%2Fbit.ly%2FHenPod&token=df8575-1-1631362609871
    url = decodeURIComponent( url.replace(/^.+url=(.+)&token.+$/, "$1") );
    return url;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * MixesDB mix page title suggestion (beta)
 *
 * Builds a starting point for a MixesDB mix page title out of the SoundCloud API data and
 * offers it in an editable input below the track headline.
 * Rules: https://www.mixesdb.com/w/Help:Add_a_new_mix_page
 *
 * Target shapes (all confirmed against existing MixesDB pages):
 *   YYYY-MM-DD - Artist                     no show info at all
 *   YYYY-MM-DD - Artist - Show              2026-04-03 - Ruf Dug - NTS Radio
 *   YYYY-MM-DD - Artist - Show NNN          2026-07-19 - Fadi Mohem - HATE Podcast 496
 *   YYYY-MM-DD - Artist - Show (ID)         2025-01-13 - DJ MARIA. - RA Podcast (RA.971)
 *
 * A plain episode NUMBER is appended to the show name, an alphanumeric episode ID goes into
 * brackets - that is how both are written on MixesDB.
 *
 * This is a guess and labelled "beta" in the UI on purpose: SoundCloud titles are free text,
 * and the mix date regularly is NOT the upload date (radio shows get uploaded days later, old
 * sets years later), so nothing here can be used without a look.
 *
 * The channel/show mapping lives in SoundCloud/title_definitions.js, not here.
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// English and German month names/abbreviations, for titles that spell the month out.
// Not in title_definitions.js: these are parser internals, not something to curate.
var mdbTitle_monthNames = {
    jan: 1, januar: 1, january: 1,
    feb: 2, februar: 2, february: 2,
    mar: 3, march: 3, "mär": 3, "märz": 3, maerz: 3, mrz: 3,
    apr: 4, april: 4,
    may: 5, mai: 5,
    jun: 6, june: 6, juni: 6,
    jul: 7, july: 7, juli: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, okt: 10, oktober: 10,
    nov: 11, november: 11,
    dec: 12, december: 12, dez: 12, dezember: 12
};

// Words that only ever introduce an episode NUMBER, so "Vol.5" must not be mistaken for an
// episode ID like "RA.971" just because it is also "letters, dot, digits".
var mdbTitle_episodeWords = [
    "vol", "volume", "ep", "episode", "pt", "part", "no", "nr", "nos", "chapter", "folge",
    "podcast", "pod", "show", "mix", "mixtape", "set", "session", "radio", "feat", "ft",
    "tape", "act", "guest"
];

// mdbTitle_pad
function mdbTitle_pad( n ) {
    return ( n < 10 ? "0" : "" ) + n;
}

// mdbTitle_escapeRe
function mdbTitle_escapeRe( s ) {
    return String( s ).replace( /[.*+?^${}()|[\]\\]/g, "\\$&" );
}

// mdbTitle_normalizeCompare
// Strips everything but letters/digits, so "DJ MARIA." and "dj maria" compare equal
function mdbTitle_normalizeCompare( s ) {
    return String( s || "" ).toLowerCase().replace( /[^a-z0-9]/g, "" );
}

// mdbTitle_isValidYmd
function mdbTitle_isValidYmd( y, m, d ) {
    if( !y || !m || !d ) return false;
    if( m < 1 || m > 12 ) return false;
    // new Date(y, m, 0) is the last day of month m (months are 0-based there), so this also
    // gets leap years right without a table
    if( d < 1 || d > new Date( y, m, 0 ).getDate() ) return false;
    return y >= 1950 && y <= new Date().getFullYear() + 1;
}

// mdbTitle_expandYear
// 2-digit year -> 4 digits. Everything up to next year reads as 20xx, the rest as 19xx,
// so "26" is 2026 but "95" is 1995 (there are plenty of 90s sets on SoundCloud).
function mdbTitle_expandYear( yy ) {
    var n = parseInt( yy, 10 ),
        cutoff = ( new Date().getFullYear() % 100 ) + 1;
    return n <= cutoff ? 2000 + n : 1900 + n;
}

// mdbTitle_candidateYmd / _candidateYm / _candidateY
// A candidate carries both the string that goes into the title (out) and a full date used
// only for scoring (iso), so YYYY-MM and YYYY can be scored against the creation date too.
function mdbTitle_candidateYmd( y, m, d ) {
    if( !mdbTitle_isValidYmd( y, m, d ) ) return null;
    var iso = y + "-" + mdbTitle_pad( m ) + "-" + mdbTitle_pad( d );
    return { iso: iso, out: iso };
}

function mdbTitle_candidateYm( y, m ) {
    if( !y || m < 1 || m > 12 || y < 1950 || y > new Date().getFullYear() + 1 ) return null;
    return { iso: y + "-" + mdbTitle_pad( m ) + "-01", out: y + "-" + mdbTitle_pad( m ) };
}

function mdbTitle_candidateY( y ) {
    if( !y || y < 1950 || y > new Date().getFullYear() + 1 ) return null;
    return { iso: y + "-07-01", out: String( y ) };
}

// mdbTitle_monthFromName
function mdbTitle_monthFromName( name ) {
    var key = String( name || "" ).toLowerCase().replace( /\.$/, "" );
    return mdbTitle_monthNames[key] || 0;
}

// mdbTitle_scoreCandidate
// Distance in days to the SoundCloud creation date - this is what tells "030426" apart as
// DDMMYY vs MMDDYY vs YYMMDD. A candidate AFTER the creation date gets a small penalty, so
// an otherwise equally distant reading that already lies in the past on upload day wins:
// mixes are normally uploaded on or after their date. Lower is better.
function mdbTitle_scoreCandidate( iso, refIso ) {
    if( !refIso ) return 0;

    var diff = ( Date.parse( iso + "T00:00:00Z" ) - Date.parse( refIso + "T00:00:00Z" ) ) / 86400000;
    if( isNaN( diff ) ) return 0;

    return Math.abs( diff ) + ( diff > 0 ? 0.5 : 0 );
}

// mdbTitle_findDate
// Returns { out, index, length } for the best date found in text, or null.
// Patterns are ordered most specific first and the FIRST pattern that yields any valid
// reading wins - otherwise the bare-year fallback at the end would steal from a full date.
function mdbTitle_findDate( text, refIso ) {
    var patterns = [
        // 2026-04-03, 2026.04.03, 2026/04/03 - year first is never ambiguous
        {
            name: "isoFull",
            re: /(^|[^\d])((?:19|20)\d{2})[-.\/](\d{1,2})[-.\/](\d{1,2})(?!\d)/g,
            build: function( m ) {
                return [ mdbTitle_candidateYmd( +m[2], +m[3], +m[4] ) ];
            }
        },
        // 3 April 2026 / 3rd Apr 26 / 3. April 2026
        {
            name: "textualDMY",
            re: /(^|[^\w])(\d{1,2})(?!\d)(?:st|nd|rd|th|\.)?\s+([a-zäöü]{3,9})\.?,?\s+((?:19|20)\d{2}|\d{2})(?!\d)/gi,
            build: function( m ) {
                var y = m[4].length === 2 ? mdbTitle_expandYear( m[4] ) : +m[4];
                return [ mdbTitle_candidateYmd( y, mdbTitle_monthFromName( m[3] ), +m[2] ) ];
            }
        },
        // April 3, 2026 / Apr 3rd 26
        {
            name: "textualMDY",
            re: /(^|[^\w])([a-zäöü]{3,9})\.?\s+(\d{1,2})(?!\d)(?:st|nd|rd|th)?,?\s+((?:19|20)\d{2}|\d{2})(?!\d)/gi,
            build: function( m ) {
                var y = m[4].length === 2 ? mdbTitle_expandYear( m[4] ) : +m[4];
                return [ mdbTitle_candidateYmd( y, mdbTitle_monthFromName( m[2] ), +m[3] ) ];
            }
        },
        // 03-04-2026 / 03.04.2026 / 04/03/2026 - DMY vs MDY decided by the creation date
        {
            name: "sepY4",
            re: /(^|[^\d])(\d{1,2})[-.\/](\d{1,2})[-.\/]((?:19|20)\d{2})(?!\d)/g,
            build: function( m ) {
                return [
                    mdbTitle_candidateYmd( +m[4], +m[3], +m[2] ), // DMY
                    mdbTitle_candidateYmd( +m[4], +m[2], +m[3] )  // MDY
                ];
            }
        },
        // 20260403 / 03042026 / 04032026
        {
            name: "compact8",
            re: /(^|[^\d])(\d{8})(?!\d)/g,
            build: function( m ) {
                var s = m[2];
                return [
                    mdbTitle_candidateYmd( +s.slice(0,4), +s.slice(4,6), +s.slice(6,8) ), // YMD
                    mdbTitle_candidateYmd( +s.slice(4,8), +s.slice(2,4), +s.slice(0,2) ), // DMY
                    mdbTitle_candidateYmd( +s.slice(4,8), +s.slice(0,2), +s.slice(2,4) )  // MDY
                ];
            }
        },
        // 03-04-26 / 26.04.03
        {
            name: "sepY2",
            re: /(^|[^\d])(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{2})(?!\d)/g,
            build: function( m ) {
                return [
                    mdbTitle_candidateYmd( mdbTitle_expandYear( m[4] ), +m[3], +m[2] ), // DMY
                    mdbTitle_candidateYmd( mdbTitle_expandYear( m[4] ), +m[2], +m[3] ), // MDY
                    mdbTitle_candidateYmd( mdbTitle_expandYear( m[2] ), +m[3], +m[4] )  // YMD
                ];
            }
        },
        // 030426 - the shape NTS and friends put behind the artist name
        {
            name: "compact6",
            re: /(^|[^\d])(\d{6})(?!\d)/g,
            build: function( m ) {
                var s = m[2];
                return [
                    mdbTitle_candidateYmd( mdbTitle_expandYear( s.slice(4,6) ), +s.slice(2,4), +s.slice(0,2) ), // DDMMYY
                    mdbTitle_candidateYmd( mdbTitle_expandYear( s.slice(4,6) ), +s.slice(0,2), +s.slice(2,4) ), // MMDDYY
                    mdbTitle_candidateYmd( mdbTitle_expandYear( s.slice(0,2) ), +s.slice(2,4), +s.slice(4,6) )  // YYMMDD
                ];
            }
        },
        // April 2026 -> month precision, which MixesDB allows as YYYY-MM
        {
            name: "textualMY",
            re: /(^|[^\w])([a-zäöü]{3,9})\.?\s+((?:19|20)\d{2})(?!\d)/gi,
            build: function( m ) {
                return [ mdbTitle_candidateYm( +m[3], mdbTitle_monthFromName( m[2] ) ) ];
            }
        },
        // 2026-04
        {
            name: "isoYM",
            re: /(^|[^\d])((?:19|20)\d{2})[-.\/](\d{1,2})(?!\d)/g,
            build: function( m ) {
                return [ mdbTitle_candidateYm( +m[2], +m[3] ) ];
            }
        },
        // bare year. The [^\w.#] guard keeps it off episode numbers like "RA.2024" or "#1998"
        {
            name: "year",
            re: /(^|[^\w.#])((?:19|20)\d{2})(?!\d)/g,
            build: function( m ) {
                return [ mdbTitle_candidateY( +m[2] ) ];
            }
        }
    ];

    for( var p = 0; p < patterns.length; p++ ) {
        var pat = patterns[p],
            best = null,
            m;

        pat.re.lastIndex = 0;

        while( ( m = pat.re.exec( text ) ) !== null ) {
            if( m[0].length === 0 ) { pat.re.lastIndex++; continue; } // never loop forever

            var lead = m[1] ? m[1].length : 0,
                cands = pat.build( m ) || [];

            for( var c = 0; c < cands.length; c++ ) {
                if( !cands[c] ) continue;

                // the tiny c offset keeps each pattern's own preference order on exact ties
                // (e.g. DMY before MDY), without ever outweighing a real day of distance
                var score = mdbTitle_scoreCandidate( cands[c].iso, refIso ) + c * 0.001;

                if( best === null || score < best.score ) {
                    best = {
                        out: cands[c].out,
                        score: score,
                        index: m.index + lead,
                        length: m[0].length - lead
                    };
                }
            }
        }

        if( best ) {
            logVar( "mdbTitle_findDate: matched by " + pat.name, best.out );
            return best;
        }
    }

    return null;
}

// mdbTitle_findEpisode
// Returns { text, kind: "id"|"number", index, length } or null.
function mdbTitle_findEpisode( text ) {
    var m;

    // "RA.971", "RA. 971" - letters, dot, digits. Episode words are excluded, so "Vol.5"
    // falls through to the number patterns below instead of becoming a bracketed ID.
    var idRe = /(^|[^\w])([A-Za-z][A-Za-z0-9]{0,7})\.\s?(\d{1,5})(?!\d)/g;
    while( ( m = idRe.exec( text ) ) !== null ) {
        if( mdbTitle_episodeWords.indexOf( m[2].toLowerCase() ) === -1 ) {
            var lead = m[1] ? m[1].length : 0;
            return {
                text: m[2] + "." + m[3],
                kind: "id",
                index: m.index + lead,
                length: m[0].length - lead
            };
        }
    }

    // "Podcast 496", "Episode 12", "Vol. 5", "Show #23"
    var wordRe = new RegExp( "(^|[^\\w])(" + mdbTitle_episodeWords.join("|") + ")\\.?\\s*#?\\s*(\\d{1,5})(?!\\d)", "i" );
    m = wordRe.exec( text );
    if( m ) {
        return {
            text: String( parseInt( m[3], 10 ) ),
            kind: "number",
            word: m[2], // the keyword as spelled in the title - part of the show name, see below
            index: m.index + ( m[1] ? m[1].length : 0 ),
            length: m[0].length - ( m[1] ? m[1].length : 0 )
        };
    }

    // "#496" - "#" is not allowed in MixesDB page titles, so only the number survives
    m = /(^|[^\w])#\s?(\d{1,5})(?!\d)/.exec( text );
    if( m ) {
        return {
            text: String( parseInt( m[2], 10 ) ),
            kind: "number",
            index: m.index + ( m[1] ? m[1].length : 0 ),
            length: m[0].length - ( m[1] ? m[1].length : 0 )
        };
    }

    // a number left at the very front once the show name was cut out of the title,
    // e.g. "HATE Podcast 496 - Fadi Mohem" -> " 496 - Fadi Mohem"
    m = /^[\s\-–—|:]*(\d{1,5})(?!\d)\s*[-–—|:]/.exec( text );
    if( m ) {
        return {
            text: String( parseInt( m[1], 10 ) ),
            kind: "number",
            index: 0,
            length: m[0].length - 1 // keep the trailing separator, cleanup strips it
        };
    }

    return null;
}

// mdbTitle_cut
// Replaces a slice with a single space, so removing a token cannot glue two words together
function mdbTitle_cut( text, index, length ) {
    return text.slice( 0, index ) + " " + text.slice( index + length );
}

// Words that turn a bare channel name into the show name MixesDB actually uses, when the
// SoundCloud title spells it out: channel "HATE" + title "HATE Podcast 496" -> "HATE Podcast".
// Only used for channels without an entry in scUsernameConversions - an explicit mapping is
// the curated name and must not be extended behind the editor's back.
var mdbTitle_showSuffixWords = [
    "podcast", "radio", "radioshow", "show", "mixshow", "mixtape", "mixseries", "series",
    "sessions", "session", "cast", "fm"
];

// mdbTitle_takeShowOutOfTitle
// Removes one occurrence of the show name from the title, so an episode number behind it can
// be found on its own. Returns the shortened text and the (possibly extended) show name.
function mdbTitle_takeShowOutOfTitle( text, show, allowExtend ) {
    var result = { text: text, show: show, taken: false };

    if( !show ) return result;

    var re = new RegExp(
            "(^|[^\\w])" + mdbTitle_escapeRe( show ) +
            ( allowExtend ? "(\\s+(?:" + mdbTitle_showSuffixWords.join("|") + "))?" : "" ) +
            "(?![\\w])", "i" ),
        m = re.exec( text );

    if( !m ) return result;

    var lead = m[1] ? m[1].length : 0,
        index = m.index + lead,
        length = m[0].length - lead;

    // Both sides of an "@" are off limits, because there the name is not a show:
    // - "Ruf Dug @ Somewhere" on the channel "Ruf Dug" - the channel name is the ARTIST,
    //   cutting it would promote the venue to artist ("- Somewhere - Ruf Dug")
    // - "DJ Koze @ Robert Johnson" on the channel "Robert Johnson" - it is the VENUE,
    //   cutting it would leave a stray "@ ," in the title
    if( /^\s*@/.test( text.slice( index + length ) ) || /@\s*$/.test( text.slice( 0, index ) ) ) {
        return result;
    }

    if( allowExtend && m[2] ) {
        result.show = ( show + " " + m[2].trim() ).replace( /\s+/g, " " );
    }
    result.text = mdbTitle_cut( text, index, length );
    result.taken = true;

    return result;
}

// mdbTitle_cleanArtist
function mdbTitle_cleanArtist( s ) {
    s = String( s || "" ).replace( /\s+/g, " " );

    // brackets left empty by a removed date/episode/show
    s = s.replace( /\(\s*\)|\[\s*\]|\{\s*\}/g, " " );

    // leading connectors: "w/ Ruf Dug", "presents Ruf Dug", ...
    s = s.replace( /^[\s\-–—_|\/\\:,@~•·>»]+/, "" );
    s = s.replace( /^(?:w\/|with|feat\.?|ft\.?|presents?|pres\.?|by)\s+/i, "" );

    // trailing separators. The trailing DOT is deliberately kept - artist names like
    // "DJ MARIA." end in one and MixesDB spells them that way.
    s = s.replace( /^[\s\-–—_|\/\\:,@~•·>»]+/, "" );
    s = s.replace( /[\s\-–—_|\/\\:,@~•·<«]+$/, "" );

    s = s.replace( /\s+/g, " " ).trim();

    // Help:Add_a_new_mix_page: "DJ not Dj"
    s = s.replace( /\bdj\b/gi, "DJ" );
    // ... and b2b stays lowercase, as in "Ruf Dug b2b Daniel John Willis - NTS Radio"
    s = s.replace( /\bb2b\b/gi, "b2b" );

    return s;
}

// mdbTitle_usernameConversionKey
// The scUsernameConversions key for a channel name, or "" when it is not listed.
// Case-insensitive, so a casing slip in a hand-written key does not silently disable it.
function mdbTitle_usernameConversionKey( username ) {
    if( !username ) return "";

    var map = ( typeof scUsernameConversions !== "undefined" && scUsernameConversions ) ? scUsernameConversions : {};

    if( Object.prototype.hasOwnProperty.call( map, username ) ) return username;

    for( var key in map ) {
        if( Object.prototype.hasOwnProperty.call( map, key ) && key.toLowerCase() === username.toLowerCase() ) {
            return key;
        }
    }

    return "";
}

// mdbTitle_showFromUsername
// Channel name -> show entity, via scUsernameConversions (title_definitions.js).
// An unlisted channel falls back to its raw name; an entry mapped to "" means "no show".
function mdbTitle_showFromUsername( username ) {
    if( !username ) return "";

    var key = mdbTitle_usernameConversionKey( username );
    return key ? scUsernameConversions[key] : username;
}

// buildMixesdbTitle
// Returns the suggested page title, or "" when there is not enough to work with.
function buildMixesdbTitle( scTitle, username, createdAt, releaseDate ) {
    logFunc( "buildMixesdbTitle" );

    try {
        var rest = String( scTitle || "" ).replace( /\s+/g, " " ).trim();
        if( !rest ) return "";

        logVar( "scTitle", rest );
        logVar( "username", username );

        // 1) drop decoration
        if( typeof scTitleNoise !== "undefined" && scTitleNoise ) {
            for( var n = 0; n < scTitleNoise.length; n++ ) {
                scTitleNoise[n].lastIndex = 0;
                rest = rest.replace( scTitleNoise[n], " " );
            }
        }

        // 2) the show entity comes from the channel, not from the title
        var isMappedChannel = mdbTitle_usernameConversionKey( username ) !== "",
            show = mdbTitle_showFromUsername( username );
        logVar( "show", show + ( isMappedChannel ? " (mapped)" : " (raw channel name)" ) );

        // 3) date. The creation date only DISAMBIGUATES a date written in the title
        // (DDMMYY vs MMDDYY vs YYMMDD) - it is used as the date itself only when the title
        // carries none, since mix dates legitimately differ from the upload date.
        var refDate = createdAt || releaseDate || "",
            found = mdbTitle_findDate( rest, refDate ),
            date = "";

        if( found ) {
            date = found.out;
            rest = mdbTitle_cut( rest, found.index, found.length );
        } else {
            // same preference the header's highlighted date uses: release date wins
            date = releaseDate || createdAt || "";
            logVar( "buildMixesdbTitle: no date in the title, falling back to", date );
        }

        if( !date ) return "";

        // 4) take the show name out of the title before looking for an episode, so
        // "HATE Podcast 496 - Fadi Mohem" leaves "496 - Fadi Mohem" and not "HATE - ..."
        var restWithShow = rest, // kept for the "title was nothing but the show" fallback below
            taken = mdbTitle_takeShowOutOfTitle( rest, show, !isMappedChannel );

        rest = taken.text;
        show = taken.show;

        if( username && mdbTitle_normalizeCompare( username ) !== mdbTitle_normalizeCompare( show ) ) {
            rest = mdbTitle_takeShowOutOfTitle( rest, username, false ).text;
        }

        // 5) episode
        var episode = mdbTitle_findEpisode( rest ),
            beforeEpisode = "",
            afterEpisode = "";

        if( episode ) {
            logVar( "episode (" + episode.kind + ")", episode.text );
            beforeEpisode = rest.slice( 0, episode.index );
            afterEpisode = rest.slice( episode.index + episode.length );
            rest = mdbTitle_cut( rest, episode.index, episode.length );
        }

        // 5b) "Truancy Volume 300: Sunju Hargun" - the channel name ("truantsblog") is nowhere
        // in the title, but the title itself spells out "<show> <word> <number> - <artist>",
        // which is how a lot of podcast series title their uploads. Taking the show from
        // there beats falling back to the raw channel name.
        // Guarded tightly so a plain "Some DJ Vol.5" is not turned inside out: only for a
        // keyword episode, only when something follows it behind a separator, and only when
        // the channel name was NOT found in the title (if it was, we already have the show).
        if( episode && episode.word && !taken.taken ) {
            var showFromTitle = mdbTitle_cleanArtist( beforeEpisode ),
                artistAfter = /^\s*[-–—|:,]\s*(.+)$/.exec( afterEpisode );

            if( showFromTitle && artistAfter && mdbTitle_cleanArtist( artistAfter[1] ) ) {
                show = ( showFromTitle + " " + episode.word ).replace( /\s+/g, " " );
                rest = artistAfter[1];
                logVar( "buildMixesdbTitle: show taken from the title instead of the channel", show );
            }
        }

        // 6) whatever is left is the artist
        var artist = mdbTitle_cleanArtist( rest );

        if( !artist ) {
            // the title held nothing but show/episode/date, e.g. "Ruf Dug 030426" on the
            // channel "Ruf Dug". Fall back to the title WITH the show still in it (not to the
            // raw title - that would drag the date back in), the guard below sorts it out.
            var fallback = restWithShow,
                fallbackEpisode = mdbTitle_findEpisode( fallback );

            if( fallbackEpisode ) {
                fallback = mdbTitle_cut( fallback, fallbackEpisode.index, fallbackEpisode.length );
            }
            artist = mdbTitle_cleanArtist( fallback );
        }

        logVar( "artist", artist );
        if( !artist ) return "";

        // an artist channel uploading its own sets would otherwise give "Artist - Artist".
        // Containment (not just equality) catches "Ruf Dug @ Somewhere" on the channel
        // "Ruf Dug", but only from 4 characters up - a 2-3 letter show name is too likely to
        // turn up inside an unrelated artist name.
        var artistCmp = mdbTitle_normalizeCompare( artist ),
            showCmp = mdbTitle_normalizeCompare( show ),
            shorter = Math.min( artistCmp.length, showCmp.length );

        if( showCmp && artistCmp &&
            ( artistCmp === showCmp ||
              ( shorter >= 4 && ( artistCmp.indexOf( showCmp ) !== -1 || showCmp.indexOf( artistCmp ) !== -1 ) ) ) ) {
            logVar( "buildMixesdbTitle: dropping the show, it is the artist itself", show );
            show = "";
        }

        // 7) assemble
        var out = date + " - " + artist;

        if( show ) {
            out += " - " + show;

            if( episode ) {
                // plain number appended ("HATE Podcast 496"), alphanumeric ID bracketed
                // ("RA Podcast (RA.971)") - both taken from how MixesDB spells them
                out += episode.kind === "number" ? " " + episode.text : " (" + episode.text + ")";
            }
        } else if( episode && episode.kind === "id" ) {
            out += " (" + episode.text + ")";
        }

        logVar( "buildMixesdbTitle result", out );
        return out;

    } catch( e ) {
        log( "buildMixesdbTitle FAILED: " + e );
        return "";
    }
}


/*
 * The input below the headline
 *
 * Two async sources have to meet before it can be added: the API call (which brings the
 * title/date/channel) and the toolkit (which decides whether the mix is on MixesDB already).
 * Both just store their piece and call mdbTitleInput_add() - whichever finishes last adds it.
 */
var mdbTitle_suggestion = "",
    mdbTitle_toolkitVerdict = null,
    mdbTitle_toolkitPoll = null;

// mdbTitleInput_setSuggestion
function mdbTitleInput_setSuggestion( suggestion ) {
    mdbTitle_suggestion = suggestion || "";
    mdbTitleInput_add();
}

// mdbTitleInput_watchToolkit
// The suggestion is only useful for mixes that are NOT on MixesDB yet, so it waits for the
// toolkit's verdict instead of showing up right away.
//
// Polling, not waitForKeyElements, on purpose: waitForKeyElements stores its "alreadyFound"
// flag in ONE jQuery data key per ELEMENT, and toolkit.js already watches these very <li>s -
// a second watcher on them would starve whichever of the two runs second (see CLAUDE.md).
function mdbTitleInput_watchToolkit() {
    logFunc( "mdbTitleInput_watchToolkit" );

    // the toolkit is rebuilt whenever SoundCloud's re-render wipes #mdb-sc-trackExtras,
    // so an earlier poll (and its verdict) is stale by now
    if( mdbTitle_toolkitPoll ) {
        clearInterval( mdbTitle_toolkitPoll );
        mdbTitle_toolkitPoll = null;
    }
    mdbTitle_toolkitVerdict = null;

    var tries = 0,
        maxTries = 100; // 100 * 300ms = 30s

    mdbTitle_toolkitPoll = setInterval(function() {
        // .filled is what carries the answer: both <li>s are created empty and only the one
        // matching the MixesDB API result gets filled (the other is dropped in the cleanup)
        var used = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used.filled").length,
            unused = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused.filled").length;

        if( used ) {
            log( "mdbTitleInput_watchToolkit: this player is already used on MixesDB - no title suggestion needed." );
            mdbTitle_toolkitVerdict = "used";
        } else if( unused ) {
            log( "mdbTitleInput_watchToolkit: not on MixesDB yet - offering a page title." );
            mdbTitle_toolkitVerdict = "unused";
        } else if( ++tries < maxTries ) {
            return;
        } else {
            log( "mdbTitleInput_watchToolkit: gave up waiting for the toolkit verdict after " + maxTries + " tries." );
        }

        clearInterval( mdbTitle_toolkitPoll );
        mdbTitle_toolkitPoll = null;

        mdbTitleInput_add();
    }, 300);
}

// mdbTitleInput_add
function mdbTitleInput_add() {
    if( mdbTitle_toolkitVerdict !== "unused" ) return;
    if( !mdbTitle_suggestion ) return;

    var headline = $("#mdb-trackHeader-headline");
    if( !headline.length ) return;
    if( $("#mdb-mixesdbTitle-wrapper").length ) return;

    logFunc( "mdbTitleInput_add" );

    var wrapper = $("<div>").attr( "id", "mdb-mixesdbTitle-wrapper" ),
        input = $("<input>", {
            type: "text",
            id: "mdb-mixesdbTitle",
            spellcheck: "false",
            autocomplete: "off",
            title: "Suggested MixesDB mix page title - editable, please check it before using it"
        }).addClass( "mono" ),
        beta = $("<span>")
            .attr( "id", "mdb-mixesdbTitle-beta" )
            .attr( "title", "Guessed from the SoundCloud title, date and channel name - it can be wrong. See Help:Add a new mix page." )
            .text( "beta" );

    // .val() instead of a value attribute so the title text is never parsed as HTML
    input.val( mdbTitle_suggestion );

    // monospace, so size is the character count of the suggestion - the whole title stays
    // visible without a horizontal scroll. Floored, an empty-looking 1-char box is useless.
    input.attr( "size", Math.max( 20, mdbTitle_suggestion.length ) );

    wrapper.append( input, beta );
    headline.after( wrapper );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * Filter row in #mdb-streamActions
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// ---------- Config ----------
const DEFAULT_MIN       = 20;                 // default minutes
const MIN_MINUTES       = 3;
const MAX_MINUTES       = 180;

const FAV_STEPS         = [1, 5, 10, 20, 50, 100, 250, 500, 1000];
const FAV_STEP_MAX      = FAV_STEPS.length - 1;
const DEFAULT_FAVS      = 1;

const PAGE_RESOLVE_CAP  = 40;
const REQ_INTERVAL_MS   = 1500;
const CACHE_TTL         = 10 * 365 * 24 * 3600 * 1e3;  // 10 years
const NEG_TTL           = 7 * 24 * 3600 * 1e3;         // 7 days

const UI_ID             = 'sc-hide-short-ui-wrap';
const CHECKED_CLASS     = 'sc-checked';
const ATTR_TOO_SHORT    = 'data-sc-too-short';
const ATTR_TOO_FEW_F    = 'data-sc-too-few-favs';

const LS_CACHE          = 'sc_hide_short_cache_v6';
const LS_SETT           = 'sc_hide_short_settings_v5';

// ---------- State ----------
const STATE = {
    thresholdMin: DEFAULT_MIN,
    thresholdFavs: DEFAULT_FAVS,
    favsEnabled: false,
    clientId: null,
    cache: loadCache(),                // { url: { ms:number|null, t:ts, neg?:true } }
    resolvesDone: 0,
    lastReq: 0,
    inflight: new Map(),               // url -> Promise<number|null>
    pausedUntil: 0,
    io: null
};

// ---------- Utils ----------
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const now = () => Date.now();
const clampMin = m => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(parseInt(m, 10) || DEFAULT_MIN)));
const enabled = () => document.documentElement.classList.contains('sc-hide-short-active');
const thresholdMs = () => STATE.thresholdMin * 60 * 1000;
const norm = u => {
    try { const x = new URL(u, location.origin); return x.origin + x.pathname.replace(/\/+$/, ''); }
    catch { return (u || '').split('#')[0].split('?')[0]; }
};
const computeEnabled = (cbMain, cbFavs) => !!(cbMain?.checked || cbFavs?.checked);

function loadCache() {
    try {
        const obj = JSON.parse(localStorage.getItem(LS_CACHE) || '{}');
        const t = now();
        for (const k in obj) {
            const e = obj[k]; if (!e) { delete obj[k]; continue; }
            const ttl = e.neg ? NEG_TTL : CACHE_TTL;
            if (e.t && t - e.t > ttl) delete obj[k];
        }
        return obj;
    } catch { return {}; }
}
function saveCache() {
    try { localStorage.setItem(LS_CACHE, JSON.stringify(STATE.cache)); } catch {}
}

function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem(LS_SETT) || 'null');
        if (!s) return null;
        return {
            enabled: !!s.enabled,
            min: clampMin(s.min ?? DEFAULT_MIN),
            minFavs: Number.isFinite(s.minFavs) ? s.minFavs : DEFAULT_FAVS,
            favsEnabled: !!s.favsEnabled
        };
    } catch { return null; }
}
function saveSettings(enabledVal, min, minFavs, favsEnabledVal) {
    try {
        localStorage.setItem(LS_SETT, JSON.stringify({
            enabled: !!enabledVal,
            min: clampMin(min),
            minFavs,
            favsEnabled: !!favsEnabledVal
        }));
    } catch {}
}

// ---------- UI ----------
function buildUI() {
    let wrap = document.getElementById(UI_ID);
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.id = UI_ID;
    wrap.innerHTML = `
    <div id="mdb-streamActions-filter"><span class="mdb-darkorange">Filter:</span><!--
 --><span class="mdb-streamActions-group"><!--
 --><label><!--
 --><input id="sc-hide-short-checkbox" type="checkbox"><!--
 --><span>Durations ≥<span id="sc-hide-short-val" class="value">${DEFAULT_MIN}</span></span><!--
 --></label><!--

 --><input id="sc-hide-short-slider" type="range" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1"><!--

 --></span><!--
 --><span class="mdb-streamActions-group"><!--
 --><label><!--
 --><input id="sc-favs-checkbox" type="checkbox"><!--
 --><span>Favorites ≥<span id="sc-min-favs-val" class="value">${DEFAULT_FAVS}</span></span><!--
 --></label><!--

 --><input id="sc-min-favs-slider" type="range" min="0" max="${FAV_STEP_MAX}" step="1"><!--

 --><span class="visually-hidden"><!--
        --><input id="sc-hide-short-minutes" type="number" maxlength="3" min="1"><!--
 --></span></span></div>
`;
    wireUI(wrap);
    return wrap;
}

function wireUI(root) {
    const cbMain    = root.querySelector('#sc-hide-short-checkbox');
    const slDur     = root.querySelector('#sc-hide-short-slider');
    const cbFavs    = root.querySelector('#sc-favs-checkbox');
    const slFavs    = root.querySelector('#sc-min-favs-slider');
    const minI      = root.querySelector('#sc-hide-short-minutes');
    const valDur    = root.querySelector('#sc-hide-short-val');
    const valFavs   = root.querySelector('#sc-min-favs-val');

    const saved = loadSettings();
    STATE.thresholdMin   = saved ? saved.min : DEFAULT_MIN;
    STATE.thresholdFavs  = saved ? saved.minFavs : DEFAULT_FAVS;
    STATE.favsEnabled    = saved ? !!saved.favsEnabled : false;

    // duration init
    minI.value          = String(STATE.thresholdMin);
    slDur.value         = String(STATE.thresholdMin);
    valDur.textContent  = String(STATE.thresholdMin);

    // favorites init (map saved numeric → slider index)
    const initFavIndex = Math.max(0, FAV_STEPS.findIndex(v => v >= STATE.thresholdFavs));
    slFavs.value       = String(initFavIndex);
    valFavs.textContent= String(STATE.thresholdFavs);

    cbMain.checked      = !!(saved && saved.enabled);
    cbFavs.checked      = STATE.favsEnabled;

    document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
    saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

    let t;
    const debouncedReset = () => {
        clearTimeout(t);
        t = setTimeout(() => resetAll(), 120);   // fast feedback while dragging
    };

    // Duration slider: auto-enable ONLY duration checkbox; live re-eval while dragging
    slDur.addEventListener('input', () => {
        STATE.thresholdMin = clampMin(slDur.value || DEFAULT_MIN);
        valDur.textContent = String(STATE.thresholdMin);
        minI.value = String(STATE.thresholdMin);

        if (!cbMain.checked) cbMain.checked = true;
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

        if (computeEnabled(cbMain, cbFavs)) debouncedReset();
    });
    slDur.addEventListener('change', () => {
        if (!cbMain.checked) cbMain.checked = true;
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
        clearTimeout(t);
        resetAll();
    });

    const favValueFromSlider = slider => {
        const idx = Math.max(0, Math.min(FAV_STEP_MAX, Math.round(parseInt(slider.value, 10) || 0)));
        return FAV_STEPS[idx];
    };

    // Favorites slider: auto-enable ONLY favorites checkbox; live re-eval while dragging
    slFavs.addEventListener('input', () => {
        STATE.thresholdFavs = favValueFromSlider(slFavs);
        valFavs.textContent = String(STATE.thresholdFavs);

        if (!cbFavs.checked) {
            cbFavs.checked = true;
            STATE.favsEnabled = true;
        }
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

        if (computeEnabled(cbMain, cbFavs)) debouncedReset();
    });
    slFavs.addEventListener('change', () => {
        STATE.thresholdFavs = favValueFromSlider(slFavs);
        valFavs.textContent = String(STATE.thresholdFavs);

        if (!cbFavs.checked) {
            cbFavs.checked = true;
            STATE.favsEnabled = true;
        }
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
        clearTimeout(t);
        resetAll();
    });

    // Hidden number input (compat)
    minI.addEventListener('change', () => {
        STATE.thresholdMin = clampMin(minI.value || DEFAULT_MIN);
        slDur.value = String(STATE.thresholdMin);
        valDur.textContent = String(STATE.thresholdMin);

        if (!cbMain.checked) cbMain.checked = true;
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

        clearTimeout(t);
        resetAll();
    });

    // Main enable/disable
    cbMain.addEventListener('change', () => {
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
        clearTimeout(t);
        resetAll();
    });

    // Favorites enable/disable
    cbFavs.addEventListener('change', () => {
        STATE.favsEnabled = cbFavs.checked;
        document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
        saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
        clearTimeout(t);
        if (computeEnabled(cbMain, cbFavs)) resetAll();
    });
}

function mountUI() {
    logFunc( "mountUI" );

    // ONLY attach via waitForKeyElements
    /* global waitForKeyElements */
    waitForKeyElements('#mdb-streamActions', ($c) => {
        const node = $c instanceof Element ? $c : $c[0];
        if (!node) {
            log( "mountUI: #mdb-streamActions callback fired but node is empty - bailing." );
            return;
        }
        if (node.querySelector('#' + UI_ID)) {
            log( "mountUI: filter UI already mounted - skipping." );
            return; // already mounted
        }
        log( "mountUI: mounting filter UI into #mdb-streamActions." );
        const el = buildUI();
        node.appendChild(el);
        refreshVisible();
    });
}

// ---------- Card discovery / helpers ----------
function getCards(root = document) {
    return Array.from(new Set([
        ...root.querySelectorAll('article[aria-label="Track"]:not(.' + CHECKED_CLASS + ')'),
        ...root.querySelectorAll('article[data-testid*="track"]:not(.' + CHECKED_CLASS + ')'),
        ...root.querySelectorAll('.lazyLoadingList__item article:not(.' + CHECKED_CLASS + ')'),
        ...root.querySelectorAll('li.soundList__item:not(.' + CHECKED_CLASS + ')'),
        ...root.querySelectorAll('.searchItem:not(.' + CHECKED_CLASS + ')')
    ]));
}
function getAllTrackCards(root = document) {
    return Array.from(new Set([
        ...root.querySelectorAll('article[aria-label="Track"]'),
        ...root.querySelectorAll('article[data-testid*="track"]'),
        ...root.querySelectorAll('.lazyLoadingList__item article'),
        ...root.querySelectorAll('li.soundList__item'),
        ...root.querySelectorAll('.searchItem')
    ]));
}
function asCard(el) {
    return el.closest('article, li.soundList__item, .lazyLoadingList__item, .searchItem, .soundList__item') || el;
}
function getCardUrl(card) {
    for (const a of qsa('a[href]', card)) {
        const href = a.getAttribute('href') || a.href || '';
        if (!href) continue;
        if (/^https?:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(href) || /^\/[^/]+\/[^/]+/.test(href)) {
            return norm(href.startsWith('http') ? href : location.origin + href);
        }
    }
    return null;
}

// Favorites count (from like button label only)
function getFavoritesCount(card) {
    const likeBtn = card.querySelector('button.sc-button-like, .sc-button-like[aria-label="Like"]');
    const labelEl = likeBtn?.querySelector('.sc-button-label');
    if (labelEl) {
        const n = parseInt((labelEl.textContent || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(n)) return n;
    }
    if (likeBtn) {
        const n2 = parseInt((likeBtn.textContent || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(n2)) return n2;
    }
    const anyLike = card.querySelectorAll('.sc-button-like');
    for (const b of anyLike) {
        const t = (b.querySelector('.sc-button-label')?.textContent || b.textContent || '').trim();
        const num = parseInt(t.replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(num)) return num;
    }
    return 0;
}

// ---------- Network hooks (sniff client_id + harvest JSON durations) ----------
let installNetworkHooksCallCount = 0;
function installNetworkHooks() {
    installNetworkHooksCallCount++;
    log( "installNetworkHooks: patching fetch/XHR (call #" + installNetworkHooksCallCount + ")" );

    const of = window.fetch;
    window.fetch = async function(input, init) {
        try {
            const urlStr = typeof input === 'string' ? input : (input?.url || '');
            if (urlStr) {
                const u = new URL(urlStr, location.origin);
                const cid = u.searchParams.get('client_id');
                if (cid && !STATE.clientId) STATE.clientId = cid;
            }
        } catch {}
        const resp = await of.apply(this, arguments);
        try {
            const ct = resp.headers.get('content-type') || '';
            if (ct.includes('application/json')) resp.clone().json().then(harvestFromJson).catch(() => {});
        } catch {}
        return resp;
    };

    const oo = XMLHttpRequest.prototype.open;
    const os = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        try {
            const u = new URL(url, location.origin);
            const cid = u.searchParams.get('client_id');
            if (cid && !STATE.clientId) STATE.clientId = cid;
        } catch {}
        return oo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            try {
                const ct = this.getResponseHeader && this.getResponseHeader('content-type') || '';
                if (ct.includes('application/json')) {
                    const txt = this.responseText;
                    if (txt && txt.length < 10_000_000) {
                        try { harvestFromJson(JSON.parse(txt)); } catch {}
                    }
                }
            } catch {}
        });
        return os.apply(this, arguments);
    };
}

function harvestFromJson(obj) {
    const seen = new Set();
    const walk = v => {
        if (!v || typeof v !== 'object' || seen.has(v)) return;
        seen.add(v);
        if (Array.isArray(v)) { v.forEach(walk); return; }
        const url = v.permalink_url || v.uri || v.permalink;
        const dur = v.duration;
        if (url && typeof dur === 'number') {
            const key = norm(url);
            if (!STATE.cache[key]) STATE.cache[key] = { ms: dur, t: now() };
        }
        for (const k in v) { const x = v[k]; if (x && typeof x === 'object') walk(x); }
    };
    walk(obj);
    saveCache();
}

async function ensureClientId() {
    if (STATE.clientId) return STATE.clientId;
    for (const s of document.scripts) {
        const txt = s.textContent || '';
        const m = txt.match(/client_id:"([A-Za-z0-9]+)"/) || txt.match(/clientId\s*:\s*"([A-Za-z0-9]+)"/);
        if (m) { STATE.clientId = m[1]; break; }
    }
    return STATE.clientId || null;
}

// ---------- Resolve duration ----------
async function resolveViaWidget(url) {
    try {
        const ep = `https://api-widget.soundcloud.com/resolve?url=${encodeURIComponent(url)}`;
        const r = await fetch(ep, { credentials: 'omit' });
        if (!r.ok) return null;
        const data = await r.json();
        if (Number.isFinite(data?.duration)) return data.duration;
        if (Number.isFinite(data?.track?.duration)) return data.track.duration;
        if (Array.isArray(data?.tracks) && Number.isFinite(data.tracks[0]?.duration)) return data.tracks[0].duration;
        return null;
    } catch { return null; }
}
async function resolveViaApi(url) {
    const cid = (await ensureClientId()) || STATE.clientId;
    if (!cid) return null;
    const ep = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${cid}`;
    const r = await fetch(ep, { credentials: 'omit' });
    if (r.status === 429) {
        STATE.pausedUntil = now() + 30000; // cooldown
        return null;
    }
    if (!r.ok) return null;
    const data = await r.json();
    return Number.isFinite(data?.duration) ? data.duration : null;
}
async function getDuration(url) {
    const c = STATE.cache[url];
    if (c) { if (c.ms != null) return c.ms; if (c.neg) return null; }

    if (STATE.resolvesDone >= PAGE_RESOLVE_CAP) return null;
    if (now() < STATE.pausedUntil) return null;

    if (STATE.inflight.has(url)) return STATE.inflight.get(url);

    const p = (async () => {
        const wait = Math.max(0, STATE.lastReq + REQ_INTERVAL_MS - now());
        if (wait) await new Promise(r => setTimeout(r, wait));
        STATE.lastReq = now();

        let ms = await resolveViaWidget(url);
        if (ms == null) ms = await resolveViaApi(url);

        if (ms != null) {
            STATE.resolvesDone++;
            STATE.cache[url] = { ms, t: now() };
        } else {
            STATE.cache[url] = { ms: null, t: now(), neg: true };
        }
        saveCache();
        return STATE.cache[url].ms; // may be null
    })();

    STATE.inflight.set(url, p);
    try { return await p; }
    finally { STATE.inflight.delete(url); }
}

// ---------- Evaluate ----------
async function evaluateCard(card) {
    if (!enabled() || card.classList.contains(CHECKED_CLASS)) return;

    const r = card.getBoundingClientRect();
    if (!(r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight))) return;

    if (card.dataset.scProcessing === '1') return;
    card.dataset.scProcessing = '1';

    try {
        const url = getCardUrl(card);
        if (!url) return;

        const node = asCard(card);

        // Favorites — immediate and independent
        let tooFewFavs = false;
        if (STATE.favsEnabled) {
            const favs = getFavoritesCount(card);
            tooFewFavs = favs < STATE.thresholdFavs;
            if (tooFewFavs) node.setAttribute(ATTR_TOO_FEW_F, '1'); else node.removeAttribute(ATTR_TOO_FEW_F);
        } else {
            node.removeAttribute(ATTR_TOO_FEW_F);
        }
        if (tooFewFavs) {
            card.classList.add(CHECKED_CLASS);
            return;
        }

        // Duration — cache → resolve
        let ms = STATE.cache[url]?.ms ?? null;
        const isNeg = !!STATE.cache[url]?.neg;
        if (ms == null && !isNeg) {
            ms = await getDuration(url);  // may be null
        }
        const haveStableDuration = (ms != null) || !!STATE.cache[url]?.neg;
        if (!haveStableDuration) {
            setTimeout(() => { evaluateCard(card); }, 1600);
            return;
        }

        const tooShort = (ms != null) && (ms < thresholdMs()); // keep ≥ threshold
        if (tooShort) node.setAttribute(ATTR_TOO_SHORT, '1'); else node.removeAttribute(ATTR_TOO_SHORT);

        card.classList.add(CHECKED_CLASS);
    } finally {
        card.dataset.scProcessing = '';
    }
}

// ---------- Orchestration ----------
let rafPending = false;
function refreshVisible() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
        rafPending = false;
        getCards().forEach(c => { evaluateCard(c); });
    });
}

function attachIO() {
    if (STATE.io) return;
    STATE.io = new IntersectionObserver((entries) => {
        if (!enabled()) return;
        for (const e of entries) {
            if (e.isIntersecting && !e.target.classList.contains(CHECKED_CLASS)) evaluateCard(e.target);
        }
    }, { root: null, rootMargin: '150px', threshold: 0.01 });
    getCards().forEach(c => STATE.io.observe(c));
}

function observeDOM() {
    const mo = new MutationObserver(() => refreshVisible());
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });

    // SPA route changes
    let last = location.href;
    setInterval(() => {
        if (location.href !== last) {
            last = location.href;
            STATE.resolvesDone = 0;
            STATE.pausedUntil = 0;
            STATE.inflight.clear();
            resetAll();
        }
    }, 600);
}

function resetAll() {
    getAllTrackCards().forEach(c => {
        c.classList.remove(CHECKED_CLASS);
        const node = asCard(c);
        node.removeAttribute(ATTR_TOO_SHORT);
        node.removeAttribute(ATTR_TOO_FEW_F);
        node.style.display = '';
    });
    if (STATE.io) { try { STATE.io.disconnect(); } catch {} }
    STATE.io = null;
    attachIO();
    refreshVisible();
}