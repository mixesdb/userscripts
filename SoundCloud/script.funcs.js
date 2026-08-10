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

// scArtworkOriginalUrl
// SoundCloud writes the size into the artwork's file name ("-t500x500", "-large", ...) and
// serves the same picture in a dozen of them. MixesDB wants the biggest one there is, so
// whichever size the API named is swapped for "-original". Whether that one really exists is
// a separate question - loadArtworkInfo() here, and MixesDB's own upload form over there,
// both fall back to a size that loads.
function scArtworkOriginalUrl( artwork_url ) {
    return String( artwork_url || "" )
        .replace( /-(t\d\d\d?\d?x\d\d\d?\d?|crop|large|badge|small|tiny|mini|original)/g, "-original" );
}

// append_artwork_trackExtras()
// New Material "Track header" layout (since ~Aug 2026 redesign): the artwork <img> is a
// React-managed node inside a box that clips its overflow, and tracks showing a "visuals"
// banner have no artwork <img> in the visible header at all. So the info bar is not attached
// to the artwork but added to the trackExtras wrapper, built from the API's artwork_url.
function append_artwork_trackExtras( wrapper, artwork_url ) {
    logFunc( "append_artwork_trackExtras" );

    var origUrl = scArtworkOriginalUrl( artwork_url );

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
 * This is a guess and labelled "BETA" in the UI on purpose: SoundCloud titles are free text,
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

// Characters SoundCloud titles use to separate the parts of a title, as a regex class body.
// Doubled runs ("//", "||", "\\") are covered by the "+" quantifiers wherever this is used.
// The comma is deliberately NOT in here: on MixesDB "," joins artists who played after each
// other ("ANA, Johnny D, DJ Koze"), so it must never split a title into artist and show.
var mdbTitle_sepInner = "\\-–—|:/\\\\";

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

// mdbTitle_candidateYmd
// A candidate carries the date twice - once for scoring, once for the title. They are the
// same today, but keeping them apart leaves room for coarser precisions later on.
function mdbTitle_candidateYmd( y, m, d ) {
    if( !mdbTitle_isValidYmd( y, m, d ) ) return null;
    var iso = y + "-" + mdbTitle_pad( m ) + "-" + mdbTitle_pad( d );
    return { iso: iso, out: iso };
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
        // "Mar 2026" / "March 2026" - but ONLY as a group of its own, i.e. with a separator
        // or the end of the title on both sides. That is the whole difference between
        //   "Adriana Lopez at RAW x Monnom Black | Mar 2026"  -> the date, 2026-03-XX
        //   "House Set August 2026 - Simeon Sarfati"          -> part of the mix's NAME
        // An unknown day is simply left off ("2026-03", never "2026-03-XX"), while the scoring
        // uses the 1st - that is what the iso/out split in a candidate is for.
        {
            name: "monthYearGroup",
            re: new RegExp( "(^|[" + mdbTitle_sepInner + "]+\\s*)([a-zäöü]{3,9})\\.?\\s+((?:19|20)\\d{2})(?!\\d)\\s*(?=[" + mdbTitle_sepInner + "]|$)", "gi" ),
            build: function( m ) {
                var month = mdbTitle_monthFromName( m[2] );
                if( !month || !mdbTitle_isValidYmd( +m[3], month, 1 ) ) return [];

                return [ {
                    iso: m[3] + "-" + mdbTitle_pad( month ) + "-01",
                    out: m[3] + "-" + mdbTitle_pad( month )
                } ];
            }
        }
        // Deliberately NO year-only ("1998") pattern here, and no month-year inside a bit of
        // the title: those are part of the mix's NAME, and we have an exact upload date to use
        // instead. Reading them as the date would both lose a day and cut a word out.
    ];

    for( var p = 0; p < patterns.length; p++ ) {
        var pat = patterns[p],
            best = null,
            runnerUp = null, // best score of a DIFFERENT reading - feeds the confidence score
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
                    if( best !== null && best.out !== cands[c].out ) runnerUp = best.score;
                    best = {
                        out: cands[c].out,
                        score: score,
                        index: m.index + lead,
                        length: m[0].length - lead
                    };
                } else if( cands[c].out !== best.out && ( runnerUp === null || score < runnerUp ) ) {
                    runnerUp = score;
                }
            }
        }

        if( best ) {
            best.pattern = pat.name;
            best.runnerUp = runnerUp;
            logVar( "mdbTitle_findDate: matched by " + pat.name, best.out );
            return best;
        }
    }

    return null;
}

/*
 * Confidence
 *
 * Every guess the builder has to make lowers the score, so the number next to the input says
 * how much of the title was READ off the source and how much was inferred. Capped at 95: this
 * is a suggestion, and claiming certainty about a free-text SoundCloud title would be wrong.
 */
function mdbTitle_confidence() {
    return {
        score: 100,
        reasons: [],
        drop: function( points, reason ) {
            this.score -= points;
            this.reasons.push( reason );
            return this;
        },
        percent: function() {
            return Math.max( 10, Math.min( 95, Math.round( this.score ) ) );
        }
    };
}

// mdbTitle_findEpisode
// Returns { text, kind: "id"|"number", index, length } or null.
// The digits are kept exactly as the title writes them - "SEVEN Mix 084" is episode "084",
// not "84": the padding is part of how the series numbers its episodes.
// entityKnown says the entity is already settled (its name was found in the title, or the
// channel is mapped) - a number standing alone between separators is then its episode number
// and not a group of its own. See the "three groups" block in title_definitions.js.
function mdbTitle_findEpisode( text, entityKnown ) {
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
            text: m[3],
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
            text: m[2],
            kind: "number",
            index: m.index + ( m[1] ? m[1].length : 0 ),
            length: m[0].length - ( m[1] ? m[1].length : 0 )
        };
    }

    // "SSP176", "XLR8R700" - digits glued straight onto letters, so the letters belong to the
    // episode ID the same way "RA." does in "RA.971". Tightly guarded: at least two letters and
    // two digits, nothing wordy on either side - otherwise "b2b" would read as the ID "b2".
    var gluedRe = /(^|[^\w])([A-Za-z]{2,8})(\d{2,5})(?![\w])/g;
    while( ( m = gluedRe.exec( text ) ) !== null ) {
        if( mdbTitle_episodeWords.indexOf( m[2].toLowerCase() ) === -1 ) {
            var gluedLead = m[1] ? m[1].length : 0;
            return {
                text: m[2] + m[3],
                kind: "id",
                index: m.index + gluedLead,
                length: m[0].length - gluedLead
            };
        }
    }

    // A number left over once the show name was cut out of the title, e.g.
    // "Sweet Space Podcast 176 // Yazan Sarayrah" -> " 176 // Yazan Sarayrah".
    // The whole separator run is consumed, doubled ones ("//", "||") included.
    m = new RegExp( "^[\\s" + mdbTitle_sepInner + "]*(\\d{1,5})(?!\\d)\\s*[" + mdbTitle_sepInner + "]+\\s*" ).exec( text );
    if( m ) {
        return {
            text: m[1],
            kind: "number",
            index: 0,
            length: m[0].length
        };
    }

    // The same number, but at the END of what is left, e.g. "Planet Melis - Techno Germany
    // Podcast 226" leaves "Planet Melis -  226" once the show name is cut out. Only with a
    // known entity, since without one a lone number group can just as well be a year
    // ("Some Mix - 1998"), and turning that into an episode would be worse than leaving it.
    if( entityKnown ) {
        m = new RegExp( "(^|[" + mdbTitle_sepInner + "]+)\\s*(\\d{1,5})(?!\\d)\\s*(?:[" + mdbTitle_sepInner + "]+|$)" ).exec( text );
        if( m ) {
            return {
                text: m[2],
                kind: "number",
                index: m.index,
                length: m[0].length
            };
        }

        // The number ends the entity, and a SPACE is all that separates it from the artist:
        // "HATE Podcast 496 Fadi Mohem" leaves " 496 Fadi Mohem" once the show name is cut.
        // Anchored at the start, because that is what says the number sat behind the entity.
        m = /^\s*(\d{1,5})(?!\d)\s+/.exec( text );
        if( m ) {
            return {
                text: m[1],
                kind: "number",
                index: 0,
                length: m[0].length
            };
        }
    }

    return null;
}

// mdbTitle_cut
// Replaces a slice with a single space, so removing a token cannot glue two words together
function mdbTitle_cut( text, index, length ) {
    return text.slice( 0, index ) + " " + text.slice( index + length );
}

// mdbTitle_showSuffixWords
// The curated list lives in title_definitions.js, so the words can be extended without
// reading the parser. The fallback keeps the parser working on its own.
function mdbTitle_showSuffixWords() {
    return ( typeof scShowSuffixWords !== "undefined" && scShowSuffixWords ) ? scShowSuffixWords : [
        "podcast", "radio", "show", "mix", "series", "session", "cast", "fm"
    ];
}

// mdbTitle_takeShowOutOfTitle
// Removes one occurrence of the show name from the title, so an episode number behind it can
// be found on its own. Returns the shortened text and the (possibly extended) show name.
function mdbTitle_takeShowOutOfTitle( text, show, allowExtend ) {
    var result = { text: text, show: show, taken: false, extended: false, episode: null };

    if( !show ) return result;

    // The pattern differs between a mapped and an unmapped channel, so the group numbers are
    // tracked as they are built - a hard-coded m[2]/m[3] would silently read the wrong group.
    var pattern = "(^|[^\\w])" + mdbTitle_escapeRe( show ),
        suffixGroup = 0,
        wordGroup = 0,
        numberGroup = 0,
        groups = 1;

    if( allowExtend ) {
        // "HATE" + " Podcast" -> the show is "HATE Podcast"
        pattern += "(\\s+(?:" + mdbTitle_showSuffixWords().join("|") + "))?";
        suffixGroup = ++groups;

        // "EG" + " AFTER.188" -> the show is "EG AFTER", numbered 188. ANY word is allowed
        // here, but only together with the number behind it: the number is what says the word
        // belongs to the series name rather than being the start of the artist.
        pattern += "(?:(?:\\s+([A-Za-z][A-Za-z0-9]*))?\\.(\\d{1,5}))?";
        wordGroup = ++groups;
        numberGroup = ++groups;
    } else {
        // a mapped channel name is curated and never gains a word from the title, but a
        // number written onto it is still its episode number
        pattern += "(?:\\.(\\d{1,5}))?";
        numberGroup = ++groups;
    }

    var re = new RegExp( pattern + "(?![\\w])", "i" ),
        m = re.exec( text );

    if( !m ) return result;

    var lead = m[1] ? m[1].length : 0,
        index = m.index + lead,
        length = m[0].length - lead;

    // How the TITLE spells the channel name. A channel name in ALL CAPS is shouted the same
    // way a title is, so it says nothing about the spelling: the title wins there.
    //   channel "DIRTYBIRD" + "Dirtybird Radio 540"  ->  "Dirtybird Radio 540"
    // Any other channel spelling is the brand's own and keeps its case, which is what makes
    // "Trommel.251" on the channel "trommel" come out as "trommel.251".
    var shownAs = text.substr( index, show.length );

    if( shownAs !== show && show === show.toUpperCase() && show !== show.toLowerCase() ) {
        logVar( "mdbTitle_takeShowOutOfTitle: channel is all caps, title spelling wins", show + " -> " + shownAs );
        result.show = shownAs;
    }

    // Both sides of an "@" are off limits, because there the name is not a show:
    // - "Ruf Dug @ Somewhere" on the channel "Ruf Dug" - the channel name is the ARTIST,
    //   cutting it would promote the venue to artist ("- Somewhere - Ruf Dug")
    // - "DJ Koze @ Robert Johnson" on the channel "Robert Johnson" - it is the VENUE,
    //   cutting it would leave a stray "@ ," in the title
    if( /^\s*@/.test( text.slice( index + length ) ) || /@\s*$/.test( text.slice( 0, index ) ) ) {
        return result;
    }

    // A joiner right behind the name makes it the FIRST ARTIST of a group, not a show:
    // "Tonino & Lanka" on the channel "Tonino" is two artists who played together, and cutting
    // the channel out of it would leave the nonsense "& Lanka". The channel name being there
    // CONFIRMS the group, it does not overwrite it.
    if( /^\s*(?:&|,|\bb2b\b|\band\b)/i.test( text.slice( index + length ) ) ) {
        logVar( "mdbTitle_takeShowOutOfTitle: a joiner follows the channel name, so it is an artist", show );
        return result;
    }

    if( suffixGroup && m[suffixGroup] ) {
        // the channel name keeps its own spelling, the word taken from the title does not:
        // "HATE" + "PODCAST" -> "HATE Podcast". It is a common noun off a curated list, so
        // Normal Case is safe for it.
        result.show = ( result.show + " " + mdbTitle_toNormalCase( m[suffixGroup].trim() ) ).replace( /\s+/g, " " );
        result.extended = true;
    }

    // "Trommel.251" on the channel "trommel" -> "trommel.251": the channel spelling wins, the
    // dot and the number are kept as written. The digits stay verbatim, "084" is not "84".
    if( m[numberGroup] ) {
        // The word in front of the number is part of the series name and is NOT re-cased:
        // unlike a suffix word it is a name we know nothing about, so "EG AFTER" must not
        // turn into "EG After".
        if( wordGroup && m[wordGroup] ) {
            result.show = ( result.show + " " + m[wordGroup] ).replace( /\s+/g, " " );
            result.extended = true;
        }

        result.episode = { text: m[numberGroup], kind: "dotted" };
    }

    result.text = mdbTitle_cut( text, index, length );
    result.taken = true;

    return result;
}

// mdbTitle_takeExtraArtists
// Pulls "w/ ..."/"with ..." out of the title: those are further artists and belong into the
// ARTIST group, not into a group of their own (see title_definitions.js).
//   "Rinse France Show - Slowciety w/ Asa 808"
//   -> { text: "Rinse France Show - Slowciety", artists: ["Asa 808"] }
// A connector at the very START of the text is left alone - there it introduces the first
// artist ("w/ Ruf Dug"), which mdbTitle_cleanArtist strips on its own.
function mdbTitle_takeExtraArtists( text ) {
    var list = ( typeof scExtraArtistConnectors !== "undefined" && scExtraArtistConnectors ) ? scExtraArtistConnectors : [],
        result = { text: text, artists: [], before: "" };

    if( !list.length ) return result;

    var alternatives = [];
    for( var i = 0; i < list.length; i++ ) {
        // a connector ending in a letter needs a word boundary ("with" must not match
        // "without"); one ending in "/" or "." is its own boundary
        alternatives.push( mdbTitle_escapeRe( list[i] ) + ( /\w$/.test( list[i] ) ? "\\b" : "" ) );
    }

    // <connector> <names>, up to the next separator, the next connector or the end of the
    // text. The next connector has to end the capture explicitly: "w/" carries a "/", which
    // IS a separator, so "Asa 808 w/ Third Guy" would otherwise capture "Asa 808 w".
    // The leading \s+ is what keeps a connector at position 0 out of it.
    var connectors = alternatives.join( "|" ),
        re = new RegExp( "\\s+(?:" + connectors + ")\\s*((?:(?!\\s+(?:" + connectors + "))[^" + mdbTitle_sepInner + "])+)", "i" ),
        from = 0,
        m;

    // one occurrence per pass - each pass either shortens the text or moves "from" past the
    // match it turned down, so this always terminates
    while( ( m = re.exec( result.text.slice( from ) ) ) !== null ) {
        var index = from + m.index,
            names = mdbTitle_cleanArtist( m[1] );

        var bits = result.text.slice( 0, index ).split( mdbTitle_bitSplitRe() ),
            lastBit = bits[ bits.length - 1 ];

        // A series NUMBER behind the connector says it stands INSIDE a name and introduces
        // nobody: "From Paris With Hope Vol.14" is one mix name, there is no "Hope" who played
        // it. Only an episode KEYWORD counts, so "Slowciety w/ Asa 808" still names Asa 808.
        // Unless what stands in FRONT is already a series - then the number belongs to THAT and
        // the connector introduces a guest as usual ("Some Show w/ DJ Koze Vol.3").
        // Trimmed, not cleaned: seriesScore ignores case anyway, and cleanArtist would re-case
        // the title as a side effect of a question that may well be answered with "no".
        if( mdbTitle_hasKeywordEpisode( m[1] ) &&
            mdbTitle_seriesScore( mdbTitle_trimSeparators( lastBit ) ) === 0 ) {

            logVar( "mdbTitle_takeExtraArtists: a series number stands behind the connector, so it is part of the name", m[1] );
            from = index + m[0].length;
            continue;
        }

        // What stands immediately in front of the FIRST connector decides whose name it is:
        // "Slowciety w/ Asa 808" makes Slowciety the first artist, while
        // "Yoyaku Instore Sessions with TONTON & TATA" names a show, not an artist.
        if( !result.before ) {
            result.before = mdbTitle_cleanArtist( lastBit );
        }

        result.text = mdbTitle_cut( result.text, index, m[0].length );
        if( names ) result.artists.push( names );

        // the text just changed under us, so the next pass starts over
        from = 0;
    }

    return result;
}

// mdbTitle_hasKeywordEpisode
// Whether a bit carries an episode number introduced by a KEYWORD ("Vol.14", "Episode 72"), as
// opposed to a name that merely has digits in it ("Asa 808").
function mdbTitle_hasKeywordEpisode( text ) {
    var found = mdbTitle_findEpisode( text );

    return !!( found && found.word );
}

// mdbTitle_seriesScore
// How much a bit of the title looks like a series rather than an artist name. A series WORD
// outweighs a bare number, which is what tells "IT.podcast.s15e06" (podcast + digits) from
// "Surgeon & Erika closing Return to the Source 2026" (digits only, and a year at that).
//
// The words are scShowSuffixWords, the same curated list that turns a bare channel name into a
// show name: a word saying "this is a series" says it wherever it stands. It used to keep a
// list of its own, which drifted - it had "sessions" but not "session", so
// "Yoyaku Instore Sessions with ..." was read as a series and "Yoyaku Instore Session with ..."
// was not. One list cannot drift from itself.
function mdbTitle_seriesScore( part ) {
    var words = new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( mdbTitle_showSuffixWords() ) + ")\\b", "i" ),
        score = 0;

    if( words.test( part ) ) score += 2;
    if( /\d/.test( part ) ) score += 1;

    return score;
}

// mdbTitle_isCounterWord
// Whether an episode keyword only COUNTS ("Episode 72") or is part of the series name
// ("Truancy Volume 300"). See scCounterWords in title_definitions.js.
function mdbTitle_isCounterWord( word ) {
    var list = ( typeof scCounterWords !== "undefined" && scCounterWords ) ? scCounterWords : [],
        cmp = mdbTitle_normalizeCompare( word );

    if( !cmp ) return false;

    for( var i = 0; i < list.length; i++ ) {
        if( mdbTitle_normalizeCompare( list[i] ) === cmp ) return true;
    }

    return false;
}

// mdbTitle_looksNumberedSeries
// Whether a name reads as a numbered SERIES rather than as somebody's name: "Mixing-Diaries
// 041", "From Paris, Hope Vol.14". Either an episode keyword carrying the number, or a number
// ending the name - a series numbers its episodes, a person does not number themselves.
function mdbTitle_looksNumberedSeries( name ) {
    name = String( name || "" );

    // A YEAR ending the name is not an episode number: "Some Live Set 2019" says when it was
    // played, and no series is on episode 2019. An episode KEYWORD still settles it either way.
    var endsInNumber = /[\s.]\d{1,5}$/.test( name ) && !/[\s.](?:19|20)\d{2}$/.test( name );

    return endsInNumber || !!mdbTitle_findEpisode( name );
}

// mdbTitle_wordListAlternation
// "at"/"x"/... -> the escaped "at|x" body of a regex alternation.
function mdbTitle_wordListAlternation( list ) {
    var alternatives = [];

    for( var i = 0; i < list.length; i++ ) {
        alternatives.push( mdbTitle_escapeRe( list[i] ) );
    }

    return alternatives.join( "|" );
}

// mdbTitle_applyJoiners
// Rewrites the joiners of Help:Add_a_new_mix_page into the spelling MixesDB uses:
//   "Surgeon x Erika"                 -> "Surgeon & Erika"   (played together)
//   "Adriana Lopez at Monnom"         -> "Adriana Lopez @ Monnom"
//   "Anja Schneider - Live at Docks"  -> "Anja Schneider @ Docks"
// Done on the whole title before anything is split up, so the "@" is already in place when
// the venue rules further down look for it.
function mdbTitle_applyJoiners( text ) {
    var live = ( typeof scLiveAtWords !== "undefined" && scLiveAtWords ) ? scLiveAtWords : [],
        venue = ( typeof scVenueConnectors !== "undefined" && scVenueConnectors ) ? scVenueConnectors : [],
        together = ( typeof scTogetherArtistJoiners !== "undefined" && scTogetherArtistJoiners ) ? scTogetherArtistJoiners : [];

    // "Live at <place>" first, because it says outright what the two rules below can only read
    // off the shape of a title. One name in front of it is enough - unlike the bare "at" below
    // it cannot be an ordinary English phrase - and the separator in front is swallowed with
    // it, since the artist and the place they played at are ONE group. What has to stand there
    // is the end of a NAME (not a space, not another separator), so "Anja Schneider - Live at
    // Docklands" joins up.
    // A title that OPENS with it names no artist at all ("Live at Docklands"): the "@" is put
    // at the front, where buildMixesdbTitle reads it as "the channel is the artist".
    if( live.length ) {
        // "Live @ <place>" is the same title as "Live at <place>", so the "@" counts as a
        // connector of its own next to the words from scVenueConnectors
        var sep = "[" + mdbTitle_sepInner + "]",
            connectors = venue.length ? mdbTitle_wordListAlternation( venue ) + "|@" : "@",
            liveRe = new RegExp(
                "(^|[^\\s" + mdbTitle_sepInner + "])\\s*" + sep + "*\\s*\\b(?:" +
                mdbTitle_wordListAlternation( live ).replace( /\s+/g, "\\s+" ) +
                ")\\b\\s+(?:" + connectors + ")\\s+", "i" );

        text = text.replace( liveRe, function( all, before ) {
            return before ? before + " @ " : "@ ";
        } );
    }

    // The venue next: an "x" behind an "@" belongs to the venue name and must not become "&".
    // Two words have to stand in front of the connector, inside its own bit of the title -
    // that is what makes it a NAME at a place ("Adriana Lopez at RAW") rather than an ordinary
    // English phrase ("Look at Me", where "at" is just a preposition).
    if( venue.length ) {
        var word = "[^\\s" + mdbTitle_sepInner + "]+",
            venueRe = new RegExp( "(" + word + "\\s+" + word + ")\\s+(?:" +
                                  mdbTitle_wordListAlternation( venue ) + ")(?=\\s)", "i" );

        text = text.replace( venueRe, "$1 @" );
    }

    if( together.length ) {
        var re = new RegExp( "(^|\\s)(?:" + mdbTitle_wordListAlternation( together ) + ")(?=\\s)", "gi" ),
            at = text.indexOf( "@" );

        // only in front of the venue - "RAW x Monnom Black" is two promoters, not two DJs
        if( at === -1 ) {
            text = text.replace( re, "$1&" );
        } else {
            text = text.slice( 0, at ).replace( re, "$1&" ) + text.slice( at );
        }
    }

    return text;
}

// mdbTitle_takeGuestMarker
// "RAW-ARTES GUEST MIX" -> the phrase is dropped and "RAW-ARTES" is remembered as the artist.
// Returns { text, artist }. See scGuestMarkers in title_definitions.js.
function mdbTitle_takeGuestMarker( text ) {
    var list = ( typeof scGuestMarkers !== "undefined" && scGuestMarkers ) ? scGuestMarkers : [],
        result = { text: text, artist: "" };

    if( !list.length ) return result;

    var alternatives = [];
    for( var i = 0; i < list.length; i++ ) {
        // "guest mix" also spelled "guest  mix" or "guestmix"
        alternatives.push( mdbTitle_escapeRe( list[i] ).replace( /\s+/g, "\\s*" ) );
    }

    // A ":" or a "by" behind the phrase turns it around: the guest is then named AFTER it
    // ("Guest of the Week: buyArt", "Guest mix by buyArt") instead of in front of it
    // ("RAW-ARTES GUEST MIX"). Case is ignored throughout.
    var re = new RegExp( "\\s*\\b(?:" + alternatives.join( "|" ) + ")\\b\\s*(:|by\\b)?\\s*", "i" ),
        m = re.exec( text );

    if( !m ) return result;

    var before = text.slice( 0, m.index ),
        after = text.slice( m.index + m[0].length ),
        bits;

    // The artist is the whole BIT, not the word next to the phrase: a hyphen counts as a
    // separator everywhere else, and cutting at it would leave "RAW-" and "ARTES".
    if( m[1] ) {
        bits = after.split( mdbTitle_bitSplitRe() );
        result.artist = mdbTitle_cleanArtist( bits[0] );
    } else {
        bits = before.split( mdbTitle_bitSplitRe() );
        result.artist = mdbTitle_cleanArtist( bits[ bits.length - 1 ] );
    }

    result.text = before + " " + after;

    return result;
}

// mdbTitle_bitSplitRe
// Splits a title into the bits its separators mark out. A separator run needs whitespace on
// both sides, so hyphenated names ("RAW-ARTES", "пo-русски") stay in one piece. The colon is
// the exception: it is written onto the word in front of it and never turns up inside one.
function mdbTitle_bitSplitRe() {
    return new RegExp( "(?:\\s+[" + mdbTitle_sepInner + "]+|:)\\s+", "g" );
}

// mdbTitle_bracketsToSeparators
// "(...)"/"[...]"/"{...}" -> "| ... |": a bracketed chunk is a chunk of its own, exactly like a
// "|"-separated one (see title_definitions.js). Rewritten rather than parsed, so every rule
// that splits a title into bits sees it without knowing brackets exist.
function mdbTitle_bracketsToSeparators( text ) {
    text = String( text || "" );

    // Innermost pair first, so a bracket inside a bracket cannot pair up with the wrong one -
    // and repeated until nothing changes, or the outer pair of a nested one would stay behind
    var out = text,
        before;

    do {
        before = out;
        out = out.replace( /[\(\[\{]([^\(\)\[\]\{\}]*)[\)\]\}]/g, " | $1 | " );
    } while( out !== before );

    if( out === text ) return text;

    // The "|" goes in blind, so a bracket at either end of the title, or one standing next to
    // another separator, leaves an empty chunk behind. Two separator runs with nothing between
    // them are one separator, and one at either end is none.
    var sep = "[" + mdbTitle_sepInner + "]";

    out = out.replace( new RegExp( "\\s*" + sep + "+\\s*(?:" + sep + "+\\s*)+", "g" ), " | " )
             .replace( new RegExp( "^\\s*" + sep + "+\\s*" ), "" )
             .replace( new RegExp( "\\s*" + sep + "+\\s*$" ), "" );

    return out.replace( /\s+/g, " " ).trim();
}

// mdbTitle_dropBits
// Takes the chunks out that never make it into a MixesDB title - "Part 2", a stage, a camp
// (scDroppedBitPatterns). Returns { text, dropped }. The separator runs are kept along with
// the chunks they belong to, so what stays reads exactly as the uploader wrote it.
function mdbTitle_dropBits( text ) {
    var patterns = ( typeof scDroppedBitPatterns !== "undefined" && scDroppedBitPatterns ) ? scDroppedBitPatterns : [],
        result = { text: String( text || "" ), dropped: 0 };

    if( !patterns.length ) return result;

    // the separator is captured, so parts reads [ chunk, sep, chunk, sep, chunk, ... ]
    var parts = result.text.split( new RegExp( "((?:\\s+[" + mdbTitle_sepInner + "]+|:)\\s+)" ) ),
        kept = [],
        i, j;

    // one chunk is the whole title - there is nothing to drop it in favour of
    if( parts.length < 3 ) return result;

    for( i = 0; i < parts.length; i += 2 ) {
        // trimmed, not cleaned: whether a chunk is a stage is a question, and cleanArtist
        // would answer it by re-casing the title on the way
        var bit = mdbTitle_trimSeparators( parts[i] ),
            drop = false;

        for( j = 0; bit && j < patterns.length; j++ ) {
            patterns[j].lastIndex = 0;
            if( patterns[j].test( bit ) ) { drop = true; break; }
        }

        // each chunk carries the separator that stood in FRONT of it, so dropping a chunk
        // drops that separator with it and never leaves a dangling " | " behind
        if( drop ) {
            result.dropped++;
        } else {
            kept.push( { sep: i ? parts[i - 1] : "", text: parts[i] } );
        }
    }

    // a title made of nothing but dropped chunks stays as it is - something wrong beats nothing
    if( !kept.length ) return { text: result.text, dropped: 0 };

    result.text = "";
    for( i = 0; i < kept.length; i++ ) {
        result.text += ( i ? kept[i].sep : "" ) + kept[i].text;
    }

    return result;
}

/*
 * What MixesDB already knows
 *
 * The wiki is the authority on which names are artists and which are places, and it answers
 * for free. Without it the parser can only go by the shape of a title, which cannot tell
 * "Vintage Vinyl Session 004" on the channel "Daniel Bortz" (an artist uploading his own
 * series) from a podcast called "Vintage Vinyl" - or know that "Ritter Butzke" is a club and
 * therefore an "@".
 *
 * One request per track, for every name in the title at once. The answers are cached for the
 * life of the page, so the same channel is never asked about twice.
 */
var mdbTitle_categoryCache = {},
    mdbTitle_categoryApiUrl = "https://www.mixesdb.com/w/api.php";

// mdbTitle_knownAs
// "artist" | "venue" | "other" | "" - "" is both "never asked" and "MixesDB has no such
// category", which are the same thing to a caller: no help from here.
function mdbTitle_knownAs( known, name ) {
    if( !known || !name ) return "";

    var key = mdbTitle_normalizeCompare( name );
    return Object.prototype.hasOwnProperty.call( known, key ) ? known[key] : "";
}

// mdbTitle_categoryCandidates
// The names worth asking about: the channel, and every bit the title splits into.
function mdbTitle_categoryCandidates( scTitle, username ) {
    var names = [],
        bits = String( scTitle || "" ).split( mdbTitle_bitSplitRe() ),
        i;

    if( username ) names.push( username );

    for( i = 0; i < bits.length; i++ ) {
        var bit = mdbTitle_cleanArtist( bits[i] );

        // a page title that long is not a name, and asking wastes the request
        if( bit && bit.length <= 80 ) names.push( bit );
    }

    return names;
}

// mdbTitle_lookupCategories
// Asks MixesDB what its Category: pages say about these names, all in ONE request, then calls
// back with the cache. Always calls back - a failed or blocked request just means the parser
// carries on with what the title alone says, which is what it did before this existed.
function mdbTitle_lookupCategories( names, callback ) {
    logFunc( "mdbTitle_lookupCategories" );

    var wanted = [],
        titles = [],
        i, key;

    for( i = 0; i < names.length; i++ ) {
        key = mdbTitle_normalizeCompare( names[i] );

        if( !key || Object.prototype.hasOwnProperty.call( mdbTitle_categoryCache, key ) ) continue;

        wanted.push( names[i] );
        titles.push( "Category:" + names[i] );
    }

    if( !titles.length ) {
        callback( mdbTitle_categoryCache );
        return;
    }

    logVar( "mdbTitle_lookupCategories: asking about", titles.join( " | " ) );

    // everything asked about counts as answered even if the request dies, so a dead API is
    // asked once per page and not once per rebuild
    for( i = 0; i < wanted.length; i++ ) {
        mdbTitle_categoryCache[ mdbTitle_normalizeCompare( wanted[i] ) ] = "";
    }

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: {
            action: "query",
            prop: "categories",
            cllimit: "max",
            format: "json",
            origin: "*", // MediaWiki's CORS switch for an anonymous cross-origin read
            titles: titles.join( "|" )
        },
        success: function( data ) {
            var pages = ( data && data.query && data.query.pages ) || {},
                id;

            for( id in pages ) {
                if( !Object.prototype.hasOwnProperty.call( pages, id ) ) continue;

                var page = pages[id],
                    name = String( page.title || "" ).replace( /^Category:/, "" ),
                    cats = page.categories || [],
                    kind = "",
                    c;

                // "missing" on the page means MixesDB has no category of that name at all
                if( page.missing === undefined ) {
                    kind = "other";

                    for( c = 0; c < cats.length; c++ ) {
                        var parent = String( cats[c].title || "" ).replace( /^Category:/, "" ).toLowerCase();

                        if( parent === "artist" ) { kind = "artist"; break; }
                        if( parent === "venue" || parent === "club" ) { kind = "venue"; break; }
                    }
                }

                mdbTitle_categoryCache[ mdbTitle_normalizeCompare( name ) ] = kind;
                if( kind ) logVar( "mdbTitle_lookupCategories: " + name, kind );
            }

            callback( mdbTitle_categoryCache );
        },
        error: function( xhr, status ) {
            log( "mdbTitle_lookupCategories FAILED (" + status + ") - carrying on with the title alone." );
            callback( mdbTitle_categoryCache );
        }
    });
}

// mdbTitle_takeVenueTitle
// A bit of the title is a place MixesDB knows: then this is a live recording, the place is an
// "@", and the bit behind it is the city. Returns { artist, venue, city } or null.
function mdbTitle_takeVenueTitle( text, known ) {
    var bits = text.split( mdbTitle_bitSplitRe() ),
        cleaned = [],
        venueIndex = -1,
        i;

    if( bits.length < 2 ) return null;

    for( i = 0; i < bits.length; i++ ) {
        cleaned.push( mdbTitle_cleanArtist( bits[i] ) );
    }

    for( i = 0; i < cleaned.length; i++ ) {
        if( cleaned[i] && mdbTitle_knownAs( known, cleaned[i] ) === "venue" ) { venueIndex = i; break; }
    }

    if( venueIndex === -1 ) return null;

    var artist = "";
    for( i = 0; i < cleaned.length; i++ ) {
        if( i !== venueIndex && cleaned[i] ) { artist = cleaned[i]; break; }
    }

    if( !artist ) return null;

    return {
        artist: artist,
        venue: cleaned[venueIndex],
        // "@ Ritter Butzke, Berlin" - Help:Add_a_new_mix_page puts the city behind the venue
        city: cleaned[ venueIndex + 1 ] || ""
    };
}

// mdbTitle_takeEventTitle
// A live recording at an event: "<artists> | <event> <year>".
// Returns { artist, event, year } or null when the title is not one.
// The "Part 2"/stage chunks such a title carries are already gone - mdbTitle_dropBits takes
// them out of every title, not just out of this one.
function mdbTitle_takeEventTitle( text ) {
    var eventWords = ( typeof scEventWords !== "undefined" && scEventWords ) ? scEventWords : [],
        bits = text.split( mdbTitle_bitSplitRe() ),
        kept = [],
        i;

    // one bit cannot hold both an artist and an event
    if( !eventWords.length || bits.length < 2 ) return null;

    for( i = 0; i < bits.length; i++ ) {
        var bit = mdbTitle_cleanArtist( bits[i] );

        if( bit ) kept.push( bit );
    }

    // "open air" is also written "open  air" - the replacement string is inserted verbatim,
    // so it has to read "\s+" and not an escaped backslash
    var eventRe = new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( eventWords ).replace( /\s+/g, "\\s+" ) + ")\\b", "i" ),
        eventIndex = -1;

    for( i = 0; i < kept.length; i++ ) {
        if( eventRe.test( kept[i] ) ) { eventIndex = i; break; }
    }

    if( eventIndex === -1 ) return null;

    // the first bit that is not the event names the artists
    var artist = "";
    for( i = 0; i < kept.length; i++ ) {
        if( i !== eventIndex ) { artist = kept[i]; break; }
    }

    if( !artist ) return null;

    // "Landjuweel Festival 2026" -> the event is "Landjuweel Festival", the year is the date
    var event = kept[eventIndex],
        year = "",
        m = /^\s*((?:19|20)\d{2})\b\s*|\s*\b((?:19|20)\d{2})\s*$/.exec( event );

    if( m ) {
        year = m[1] || m[2];
        event = ( event.slice( 0, m.index ) + " " + event.slice( m.index + m[0].length ) ).replace( /\s+/g, " " ).trim();
    }

    // An event is a PLACE, not a series. "Festival Mix 12 - Some DJ" carries the word but is a
    // podcast: once the year is off, an event name has neither a series word nor a number left
    // in it, while "Festival Mix 12" has both.
    if( !event || mdbTitle_seriesScore( event ) > 0 ) return null;

    return { artist: artist, event: event, year: year };
}

// mdbTitle_joinArtists
// First artist + the ones found behind "w/", with the joiner from title_definitions.js.
function mdbTitle_joinArtists( artist, extraArtists ) {
    if( !artist || !extraArtists || !extraArtists.length ) return artist;

    var joiner = ( typeof scExtraArtistJoiner !== "undefined" && scExtraArtistJoiner ) ? scExtraArtistJoiner : ", ";
    return [ artist ].concat( extraArtists ).join( joiner );
}

// mdbTitle_capitalizeFirst
// Uppercases the first CASED character, so "(no" becomes "(No" and a leading bracket or
// quote does not swallow the capital. Works on any alphabet - a character is a letter when
// its upper and lower form differ.
// A hyphen starts a new part of the name, so both halves are capitalised: "RAW-ARTES" is
// "Raw-Artes", never "Raw-artes".
function mdbTitle_capitalizeFirst( word ) {
    var parts = word.split( "-" );

    for( var p = 0; p < parts.length; p++ ) {
        for( var i = 0; i < parts[p].length; i++ ) {
            var c = parts[p].charAt( i );

            if( c.toLowerCase() !== c.toUpperCase() ) {
                parts[p] = parts[p].slice( 0, i ) + c.toUpperCase() + parts[p].slice( i + 1 );
                break;
            }
        }
    }

    return parts.join( "-" );
}

// mdbTitle_hasVowel
// Whether a word can be pronounced as a word at all. "DSS", "NTS", "ØDB" cannot, so they are
// abbreviations and keep their spelling. "Ø" and "Æ" are deliberately NOT counted as vowels:
// they turn up in stylised names, where keeping the caps is the safer bet.
function mdbTitle_hasVowel( word ) {
    return /[aeiouyàáâãäåèéêëìíîïòóôõöùúûü]/i.test( word );
}

// mdbTitle_toNormalCase
// "NO SIGNAL" -> "No Signal". A bit of the title written entirely in caps (or entirely in
// lowercase) is a typing habit, not a spelling - MixesDB writes titles in Normal Case.
// Anything MIXING both cases is left verbatim: that is how the name is really spelled
// ("Nina ØDB", "UηκηΘωN"). Word lists in title_definitions.js.
function mdbTitle_toNormalCase( s ) {
    s = String( s || "" );

    // toUpperCase/toLowerCase are unicode-aware, so this also sees "Ø" and "η" as letters
    var hasLower = s.toUpperCase() !== s,
        hasUpper = s.toLowerCase() !== s;

    // mixed case = a deliberate spelling; no case at all = no letters to fix
    if( hasLower === hasUpper ) return s;

    var keepUpper = ( typeof scNormalCaseKeepUpper !== "undefined" && scNormalCaseKeepUpper ) ? scNormalCaseKeepUpper : [],
        keepLower = ( typeof scNormalCaseKeepLower !== "undefined" && scNormalCaseKeepLower ) ? scNormalCaseKeepLower : [],
        keepUpperCmp = [],
        keepLowerCmp = [],
        i;

    for( i = 0; i < keepUpper.length; i++ ) keepUpperCmp.push( mdbTitle_normalizeCompare( keepUpper[i] ) );
    for( i = 0; i < keepLower.length; i++ ) keepLowerCmp.push( mdbTitle_normalizeCompare( keepLower[i] ) );

    return s.replace( /\S+/g, function( word, offset ) {
        // "XLR8R700", "808", "2026" - an ID or a number, not a word to re-case
        if( /\d/.test( word ) ) return word;

        // No vowel, so it cannot be a word - it is an abbreviation and keeps its spelling:
        // "DSS 139" stays "DSS 139", and "NINA ØDB" becomes "Nina ØDB" rather than "Nina Ødb".
        // This is what saves the acronyms that are not worth listing one by one.
        if( !mdbTitle_hasVowel( word ) ) return word;

        var cmp = mdbTitle_normalizeCompare( word );

        if( keepUpperCmp.indexOf( cmp ) !== -1 ) return word.toUpperCase();

        // small words stay lowercase, but never as the first word of the bit
        if( offset > 0 && keepLowerCmp.indexOf( cmp ) !== -1 ) return word.toLowerCase();

        return mdbTitle_capitalizeFirst( word.toLowerCase() );
    });
}

// Set by mdbTitle_cleanArtist when it had to re-case a bit of the title. Read once per
// suggestion in mdbTitle_result - a name deliberately spelled in caps looks exactly like a
// shouted one, so having re-cased anything is worth a confidence drop.
var mdbTitle_reCased = false;

// mdbTitle_trimSeparators
// The separators and whitespace a bit of the title is left with once its neighbours were cut
// away. The trailing DOT is deliberately kept - artist names like "DJ MARIA." end in one and
// MixesDB spells them that way.
// Split out of mdbTitle_cleanArtist so a bit can be LOOKED at (is it a stage? a camp?) without
// cleanArtist's Normal Case, which is a side effect (mdbTitle_reCased) and not a question.
function mdbTitle_trimSeparators( s ) {
    return String( s || "" )
        .replace( /\s+/g, " " )
        .replace( /^[\s\-–—_|\/\\:,@~•·>»]+/, "" )
        .replace( /[\s\-–—_|\/\\:,@~•·<«]+$/, "" )
        .trim();
}

// mdbTitle_cleanArtist
function mdbTitle_cleanArtist( s ) {
    s = String( s || "" ).replace( /\s+/g, " " );

    // brackets left empty by a removed date/episode/show
    s = s.replace( /\(\s*\)|\[\s*\]|\{\s*\}/g, " " );

    // leading connectors: "w/ Ruf Dug", "presents Ruf Dug", ...
    s = mdbTitle_trimSeparators( s );
    s = s.replace( /^(?:w\/|with|feat\.?|ft\.?|presents?|pres\.?|by)\s+/i, "" );

    s = mdbTitle_trimSeparators( s );

    // Normal Case for a bit that was shouted in caps or typed all lowercase
    var normalCased = mdbTitle_toNormalCase( s );
    if( normalCased !== s ) {
        logVar( "mdbTitle_cleanArtist: re-cased", s + " -> " + normalCased );
        mdbTitle_reCased = true;
        s = normalCased;
    }

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
// Returns { title, confidence, reasons }. title is "" when there is not enough to work with.
// known is the { name -> "artist"|"venue"|"other" } map from mdbTitle_lookupCategories(), or
// nothing on the first pass, before MixesDB has answered.
function buildMixesdbTitle( scTitle, username, createdAt, releaseDate, known ) {
    logFunc( "buildMixesdbTitle" );

    var conf = mdbTitle_confidence(),
        nothing = { title: "", confidence: 0, reasons: [] };

    mdbTitle_reCased = false;

    try {
        var rest = String( scTitle || "" ).replace( /\s+/g, " " ).trim();
        if( !rest ) return nothing;

        logVar( "scTitle", rest );
        logVar( "username", username );

        // 1) drop decoration
        if( typeof scTitleNoise !== "undefined" && scTitleNoise ) {
            for( var n = 0; n < scTitleNoise.length; n++ ) {
                scTitleNoise[n].lastIndex = 0;
                rest = rest.replace( scTitleNoise[n], " " );
            }
        }

        // 1b) brackets are a chunk of their own, exactly like a "|" - written out as one here,
        // so that every rule below splits the title without having to know about brackets.
        // After the noise, whose patterns are written WITH their brackets.
        var unbracketed = mdbTitle_bracketsToSeparators( rest );

        if( unbracketed !== rest ) {
            logVar( "buildMixesdbTitle: brackets read as separators", rest + " -> " + unbracketed );
            rest = unbracketed;
        }

        // 1c) chunks a mix page title does not carry - "Part 2", a stage, a camp. Done on the
        // whole title and this early because it is the same answer wherever such a chunk sits:
        // it names a piece of a recording or a corner of a site, not the mix.
        var withoutDropped = mdbTitle_dropBits( rest );

        if( withoutDropped.dropped ) {
            logVar( "buildMixesdbTitle: chunks dropped", rest + " -> " + withoutDropped.text );
            conf.drop( 5, "a part of the title was left out - it named a part, a stage or the like, which a mix page title does not carry" );
            rest = withoutDropped.text;
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
            date = "",
            dateFromUpload = false,
            // The upload date is right for most of what gets uploaded - a podcast episode goes
            // up on its release day. It is wrong for an old set or a radio show uploaded later.
            uploadDateReason = "no date in the SoundCloud title - using the upload date, which is not the mix date for an older recording";

        if( found ) {
            date = found.out;
            rest = mdbTitle_cut( rest, found.index, found.length );

            // a rival reading of the same digits lands almost as close to the upload date -
            // e.g. 03/04 could be the 3rd or the 4th, and nothing here can settle it
            if( found.runnerUp !== null && found.runnerUp - found.score < 2 ) {
                conf.drop( 15, "the date in the title reads two ways (day/month order)" );
            }

            // the title date being far from the upload date is normal for an old set, but it
            // also looks exactly like a misread, so it is worth flagging
            if( found.score > 60 ) {
                conf.drop( 10, "the date in the title is far from the upload date" );
            }
        } else {
            // same preference the header's highlighted date uses: release date wins
            date = releaseDate || createdAt || "";
            // Charged further down, not here: an event title may still replace the upload date
            // with the year it names, and would leave a reason behind that is not true.
            dateFromUpload = true;
            logVar( "buildMixesdbTitle: no date in the title, falling back to", date );
        }

        if( !date ) return nothing;

        // 3b) further artists behind "w/"/"with". Taken out here, before anything decides what
        // is artist and what is entity, so they cannot end up as a group of their own:
        //   "Rinse France Show - Slowciety w/ Asa 808 - 07/03/2019"
        //   -> artist "Slowciety, Asa 808", entity "Rinse France Show"
        var extra = mdbTitle_takeExtraArtists( rest ),
            extraArtists = extra.artists;

        rest = extra.text;

        if( extraArtists.length ) {
            logVar( "extra artists", extraArtists.join( " | " ) + " (behind: " + extra.before + ")" );
        }

        // 3c) MixesDB joiners: "x" between artists becomes "&", "at" in front of a place
        // becomes "@". Both change what the rest of the parser sees, so they run early.
        var joined = mdbTitle_applyJoiners( rest );

        if( joined !== rest ) {
            logVar( "buildMixesdbTitle: joiners applied", rest + " -> " + joined );
            conf.drop( 5, "a joiner was read out of the title (\"x\" as \"&\", \"at\"/\"Live at\" as \"@\") - check it against the recording" );
            rest = joined;
        }

        // A title that is nothing but the place ("Live at Docklands") names no artist, so the
        // channel is the one who played there and belongs in front of the "@". Written into the
        // title rather than handled at the end, so the venue rules below see the usual shape.
        if( username && /^\s*@/.test( rest ) ) {
            logVar( "buildMixesdbTitle: the title names only the place, so the channel is the artist", username );
            rest = username + " " + rest.replace( /^\s*/, "" );
        }

        // 3d) "<name> guest mix" - the name in front of it is the artist, and the phrase goes
        var guest = mdbTitle_takeGuestMarker( rest ),
            guestArtist = guest.artist;

        rest = guest.text;

        if( guestArtist ) {
            logVar( "guest artist", guestArtist );
        }

        // 3e) "<show> with <artists>" - what stands in front of the connector names a SERIES,
        // so it is the entity and the named artists are the only artists there are. The
        // channel name is not one of them, even when it starts that bit:
        //   "Yoyaku Instore Sessions with TONTON & TATA" on the channel "yoyaku"
        //   -> 2026-08-05 - Tonton & Tata - Yoyaku Instore Sessions
        // The entity is taken from the TITLE here, so it keeps the title's spelling - unlike
        // an entity that IS the channel name, which keeps the channel's ("trommel.251").
        if( extraArtists.length && extra.before && mdbTitle_seriesScore( extra.before ) > 0 ) {
            logVar( "buildMixesdbTitle: the bit in front of \"with\" is the show", extra.before );

            conf.drop( 10, "the artists were read from behind \"with\", and the title in front of it taken as the show" );

            return mdbTitle_result( date, extraArtists[0], extra.before, null, false, extraArtists.slice( 1 ), conf );
        }

        // 3f) A live recording at an event: the event is the venue, the artists are the bit
        // next to it, and "Part 2"/stage names are none of a mix page title's business.
        // Runs before the channel is touched at all - "Leon Row & Shimon" must keep the
        // "Shimon" that the channel of the same name would otherwise cut out of it.
        var eventTitle = mdbTitle_takeEventTitle( rest );

        if( eventTitle ) {
            logVar( "buildMixesdbTitle: event title", eventTitle.artist + " @ " + eventTitle.event + " (" + eventTitle.year + ")" );

            if( eventTitle.year && dateFromUpload ) {
                // a festival set is uploaded whenever the recording is ready, so the upload
                // date says nothing about when it was played - only the year is claimed
                date = eventTitle.year;
                conf.drop( 10, "only the year is known - the title names an event but no day, and the upload date is not when it was played" );
            } else if( dateFromUpload ) {
                conf.drop( 15, uploadDateReason );
            } else if( eventTitle.year && date.slice( 0, 4 ) !== eventTitle.year ) {
                conf.drop( 15, "the date in the title and the year of the event (" + eventTitle.year + ") do not match - one of them is misread" );
            }

            conf.drop( 10, "read as a live recording at an event - the event name was taken as the place it was played at" );

            return mdbTitle_result( date, eventTitle.artist + " @ " + eventTitle.event, "", null, false, [], conf );
        }

        // 3g) MixesDB knows one of the bits as a venue, so this was played somewhere rather
        // than made for a feed: "Tonino & Lanka | Ritter Butzke | Berlin" is a live recording
        // at a Berlin club, which the title itself gives no way of telling.
        var venueTitle = mdbTitle_takeVenueTitle( rest, known );

        if( venueTitle ) {
            logVar( "buildMixesdbTitle: venue known to MixesDB", venueTitle.venue );

            if( dateFromUpload ) {
                conf.drop( 15, uploadDateReason );
            }

            return mdbTitle_result(
                date,
                venueTitle.artist + " @ " + venueTitle.venue + ( venueTitle.city ? ", " + venueTitle.city : "" ),
                "", null, false, [], conf
            );
        }

        if( dateFromUpload ) {
            conf.drop( 15, uploadDateReason );
        }

        // 4) take the show name out of the title before looking for an episode, so
        // "HATE Podcast 496 - Fadi Mohem" leaves "496 - Fadi Mohem" and not "HATE - ..."
        var restWithShow = rest, // kept for the "title was nothing but the show" fallback below
            taken = mdbTitle_takeShowOutOfTitle( rest, show, !isMappedChannel ),
            promoMix = false;

        // 4a) MixesDB knows the CHANNEL as an artist, and the title never names them: then the
        // person is the artist and everything the title says is the name of what they made.
        //   "Vintage Vinyl Session 004" on the channel "Daniel Bortz"
        //   -> 2026-08-09 - Daniel Bortz - Vintage Vinyl Session 004
        // Read off the shape alone this comes out backwards, with the series as the artist and
        // the artist as the show, and no way of telling which of the two the channel is.
        // No "(Promo Mix)": a name like that is a series of the artist's own, and the marker is
        // better left off than wrongly put on.
        if( !taken.taken && mdbTitle_knownAs( known, username ) === "artist" ) {
            var ownEntity = mdbTitle_cleanArtist( rest );

            if( ownEntity ) {
                logVar( "buildMixesdbTitle: MixesDB knows the channel as an artist", username );

                return mdbTitle_result( date, username, ownEntity, null, false, extraArtists, conf );
            }
        }

        // 4b) The channel name is in the title, but PLAIN - no "Podcast"/"Radio"/... behind it
        // and no entry in scUsernameConversions saying it is a show. Then the channel is the
        // ARTIST and the remaining title is the mix's own name:
        //   "House Set August 2026 - Simeon Sarfati" on the channel "Simeon Sarfati"
        //   -> 2026-08-03 - Simeon Sarfati - House Set August 2026 (Promo Mix)
        // Reading it the other way round would make "House Set" the artist and the person the
        // show. The episode step is skipped here on purpose: the entity is the mix's name and
        // has to stay verbatim ("Weekly Mix 12" must not become "Weekly 12").
        // "fabric presents Bonobo" is the exception: a connector right behind the channel name
        // makes it the PRESENTER, not the artist - the artist is what follows it.
        // A number written onto the channel name ("Trommel.251") rules this branch out as
        // well: a name that carries an episode number is a series, not the artist. So does a
        // guest marker, which already named the artist and it is not the channel.
        // An episode number anywhere in what is left rules it out too: a numbered thing is a
        // series, so the channel is its name and not the artist. "LIMB #9 – Yuka" is episode 9
        // of LIMB by Yuka, not a mix by LIMB called "#9 – Yuka".
        if( taken.taken && !taken.extended && !taken.episode && !guestArtist && !isMappedChannel &&
            !mdbTitle_findEpisode( taken.text, true ) &&
            !/^\s*(?:presents?|pres\.?|w\/|with|feat\.?|ft\.?)\b/i.test( taken.text ) ) {

            var entity = mdbTitle_cleanArtist( taken.text );

            logVar( "buildMixesdbTitle: channel name is the artist, entity from the title", entity );

            // a self-released mix under its own name is a promo mix - but not when the entity
            // names a venue/event (@) or is recognisably a series
            promoMix = !!entity &&
                       entity.indexOf( "@" ) === -1 &&
                       !/\b(podcast|radio|radioshow|show|sessions|series|cast|fm)\b/i.test( entity ) &&
                       !/promo\s*mix/i.test( entity );

            // No penalty for the split itself: the uploader's own name standing verbatim in
            // their own title is the strongest confirmation of an artist there is - two
            // independent sources agreeing - so this is the opposite of a guess. Which half is
            // the artist is settled, which is exactly what the 5c split below has to guess at.
            //
            // That also carries the "(Promo Mix)" call: someone's own channel putting out a mix
            // under a name of its own is the textbook case for it, so it costs half of what the
            // same assumption costs in 5c, where the artist itself was only inferred.
            if( promoMix ) {
                conf.drop( 5, "\"(Promo Mix)\" is assumed - it is not a known show, venue or event" );
            }

            // taken.show, not show: the title may spell an all-caps channel name better
            return mdbTitle_result( date, taken.show, entity, null, promoMix, extraArtists, conf );
        }

        rest = taken.text;
        show = taken.show;

        if( username && mdbTitle_normalizeCompare( username ) !== mdbTitle_normalizeCompare( show ) ) {
            rest = mdbTitle_takeShowOutOfTitle( rest, username, false ).text;
        }

        // 5) episode. The entity is settled whenever its name was found in the title or the
        // channel is mapped - a number left over on its own is then its episode number.
        // A number written onto the show name ("trommel.251") is the episode itself and left
        // the title together with the name, so there is nothing left to look for or to cut.
        var foundEpisode = taken.episode ? null : mdbTitle_findEpisode( rest, taken.taken || isMappedChannel ),
            episode = taken.episode || foundEpisode,
            showFromEpisodeRule = false,
            // the title as it stands BEFORE the number is cut out of it, for 6b: when the whole
            // title turns out to be the series name, it keeps how the series writes its own
            // number ("From Paris With Hope Vol.14", not "... Hope Vol 14" reassembled)
            restWithEpisode = rest,
            beforeEpisode = "",
            afterEpisode = "";

        if( episode ) {
            logVar( "episode (" + episode.kind + ")", episode.text );
        }

        if( foundEpisode ) {
            beforeEpisode = rest.slice( 0, foundEpisode.index );
            afterEpisode = rest.slice( foundEpisode.index + foundEpisode.length );
            rest = mdbTitle_cut( rest, foundEpisode.index, foundEpisode.length );
        }

        // 5b) "Truancy Volume 300: Sunju Hargun" - the channel name ("truantsblog") is nowhere
        // in the title, but the title itself spells out "<show> <word> <number> - <artist>",
        // which is how a lot of podcast series title their uploads. Taking the show from
        // there beats falling back to the raw channel name.
        // Guarded tightly, since it overrides the channel: only for a keyword episode, and only
        // when the channel name was NOT found in the title (if it was, we already have the
        // show). A title with nothing but a name and a number in it is not this rule's business
        // - 6b reads that one, with the whole title as the series.
        // The keyword itself joins the show name unless it only counts ("Episode"), see
        // scCounterWords - "Truancy Volume 300" keeps its "Volume".
        if( episode && episode.word && !taken.taken ) {
            var showFromTitle = mdbTitle_cleanArtist( beforeEpisode ),
                episodeWord = mdbTitle_isCounterWord( episode.word ) ? "" : " " + episode.word,
                artistAfter = new RegExp( "^\\s*[" + mdbTitle_sepInner + ",]+\\s*(.+)$" ).exec( afterEpisode );

            if( showFromTitle && artistAfter && mdbTitle_cleanArtist( artistAfter[1] ) ) {
                show = ( showFromTitle + episodeWord ).replace( /\s+/g, " " );
                rest = artistAfter[1];
                showFromEpisodeRule = true;
                logVar( "buildMixesdbTitle: show taken from the title instead of the channel", show );

            } else if( showFromTitle && !mdbTitle_trimSeparators( afterEpisode ) ) {
                // The mirror: "<artist> - <show> <word> <number>", with the number ENDING the
                // title, e.g. "Joe T Vannelli - Slave To The Rhythm Episode 72". The number is
                // the last thing in the title, so the bit it sits behind is the entity and what
                // stands in front of that is the artist.
                //   -> 2026-08-05 - Joe T Vannelli - Slave To The Rhythm 72
                // Without this the channel stays the show, gets dropped further down for making
                // a fourth group, and the episode number goes with it - there is no entity left
                // to hang it on.
                // Exactly two bits, as narrow as 5c below: more of them and which one carries
                // the series is a guess again.
                var beforeBits = beforeEpisode.split( mdbTitle_bitSplitRe() );

                if( beforeBits.length === 2 ) {
                    var entityFromTitle = mdbTitle_cleanArtist( beforeBits[1] );

                    if( entityFromTitle && mdbTitle_cleanArtist( beforeBits[0] ) ) {
                        show = ( entityFromTitle + episodeWord ).replace( /\s+/g, " " );
                        rest = beforeBits[0];
                        showFromEpisodeRule = true;
                        logVar( "buildMixesdbTitle: the number ends the title, so the bit in front of it is the show", show );
                    }
                }
            }
        }

        // 5c) The title already reads "<part> - <part>" and the channel is nowhere in it, e.g.
        // "UηκηΘωN - Hit the Breaks" on the channel "SILENCE! Records". The title alone then
        // carries artist AND entity, so appending the channel would invent a third group
        // ("- UηκηΘωN - Hit the Breaks - SILENCE! Records"). Which side is which:
        // the side carrying a number or a series word is the show ("ALFOS 1 - Weatherall"),
        // and when neither does, the first side is the artist and the second the mix's own
        // name - which makes it a self-released mix, hence (Promo Mix).
        //
        // Conditions are deliberately narrow, since this overrides the channel entirely:
        // - not a mapped channel and the channel name not found in the title (4b/5b own those)
        // - EXACTLY one separator run, so hyphenated words and multi-part titles are left
        //   alone. A run needs whitespace on both sides, with the colon as the exception:
        //   it is written onto the word in front of it ("IT.podcast.s15e06: Surgeon x Erika")
        //   and never turns up inside one.
        // - no "@" anywhere: that is a venue/event title, where the joiner rules differ
        if( !isMappedChannel && !taken.taken && !showFromEpisodeRule && !episode &&
            rest.indexOf( "@" ) === -1 ) {

            var splitParts = rest.split( mdbTitle_bitSplitRe() );

            if( splitParts.length === 2 ) {
                var leftPart = mdbTitle_cleanArtist( splitParts[0] ),
                    rightPart = mdbTitle_cleanArtist( splitParts[1] ),
                    leftScore = mdbTitle_seriesScore( leftPart ),
                    rightScore = mdbTitle_seriesScore( rightPart );

                if( leftPart && rightPart ) {
                    var splitArtist, splitEntity, splitPromo;

                    // A bit named as the guest artist is the artist, whatever else it looks
                    // like: "RAW-ARTES GUEST MIX" would otherwise read as a series of its own.
                    if( guestArtist && mdbTitle_normalizeCompare( leftPart ) === mdbTitle_normalizeCompare( guestArtist ) ) {
                        leftScore = -1;
                    } else if( guestArtist && mdbTitle_normalizeCompare( rightPart ) === mdbTitle_normalizeCompare( guestArtist ) ) {
                        rightScore = -1;
                    }

                    if( leftScore !== rightScore ) {
                        // the side that looks more like a series is the show. Told apart by
                        // the title itself, so nothing was guessed and nothing is charged -
                        // swapping the two groups around is not a doubt about the result.
                        splitArtist = leftScore > rightScore ? rightPart : leftPart;
                        splitEntity = leftScore > rightScore ? leftPart : rightPart;
                        splitPromo = false;
                    } else {
                        // neither side looks like a series, so this is the order alone
                        splitArtist = leftPart;
                        splitEntity = rightPart;
                        splitPromo = !/promo\s*mix/i.test( splitEntity );

                        conf.drop( 10, "nothing in the title says which half is the artist - it was read in the order they stand" );
                    }

                    logVar( "buildMixesdbTitle: title splits into artist/entity, channel not used", splitArtist + " | " + splitEntity );
                    if( splitPromo ) {
                        conf.drop( 10, "\"(Promo Mix)\" is assumed - it is not a known show, venue or event" );
                    }

                    return mdbTitle_result( date, splitArtist, splitEntity, null, splitPromo, extraArtists, conf );
                }
            }
        }

        // Where the show name ultimately came from decides how much it can be trusted.
        // One branch only - taken.extended implies taken.taken, so an if/else chain keeps the
        // same fact from being charged twice.
        //
        // The spread here is deliberately SMALL. scUsernameConversions is a patch list of
        // channels that earlier versions got wrong, not a register of everything that is a
        // real show - so a channel missing from it says nothing much, and a big penalty for
        // that would mostly measure how far the list has been filled in rather than how well
        // the title was read. Being listed still confirms the entity, so it stays the best of
        // the branches, just barely.
        if( isMappedChannel ) {
            // curated by hand in title_definitions.js - nothing to doubt
        } else if( showFromEpisodeRule ) {
            // "<Show> <Word> <Number> - <Artist>" was READ off the title, not guessed at: the
            // number and the separator say which part is which. Costs nothing.
        } else if( taken.extended || taken.taken ) {
            // the channel name is in the title too, which is confirmation from the title
            // itself - as good as finding the channel in the list
        } else if( show ) {
            conf.drop( 5, "the channel \"" + show + "\" is not in the known-shows list - it may not be a show name at all" );
        }

        // 5d) The channel hosting its own party: "Adriana Lopez @ RAW x Monnom Black" on the
        // channel "RAW". The channel is the promoter, which the "@" already says, so its name
        // is dropped from the venue and only the place it names is kept.
        if( show && rest.indexOf( "@" ) !== -1 ) {
            var promoterRe = new RegExp(
                    "(@\\s*)" + mdbTitle_escapeRe( show ) + "\\s*(?:&|x)\\s+", "i" ),
                withoutPromoter = rest.replace( promoterRe, "$1" );

            if( withoutPromoter !== rest ) {
                logVar( "buildMixesdbTitle: channel is the promoter of the venue, dropped", show );
                conf.drop( 5, "the channel was dropped from the venue name - it is the promoter, which \"@\" already says" );
                rest = withoutPromoter;
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
            conf.drop( 15, "nothing was left over for the artist - reusing the whole title" );
        }

        logVar( "artist", artist );
        if( !artist ) return nothing;

        // 6b) The title is a numbered SERIES and names nobody at all: "Mixing-Diaries 041" on
        // the channel "LX-F", "From Paris With Hope Vol.14" on "ZÆINO". A series numbers its
        // episodes and a person does not number themselves, so what the title carries is the
        // ENTITY - and the channel is then the one who played it. Read off the order alone this
        // comes out backwards ("Mixing-Diaries 041 - LX-F"), with the series as the artist.
        //
        // The WHOLE title becomes the entity, verbatim: a number found inside it was never an
        // episode hanging off a show name, it is how this series writes itself, so it is put
        // back rather than reassembled ("Vol.14", not "Vol 14"). Anything found behind "with"
        // goes in with it for the same reason.
        //
        // Before the leftover checks below, not after: a number is exactly what a series name
        // is expected to carry, so charging for one in the artist would be charging for the
        // very thing this rule reads. See title_definitions.js for the two guards.
        var seriesName = mdbTitle_joinArtists( mdbTitle_cleanArtist( restWithEpisode ), extraArtists );

        if( show && seriesName && !isMappedChannel && !taken.taken && !showFromEpisodeRule &&
            seriesName.indexOf( "@" ) === -1 &&
            mdbTitle_seriesScore( show ) === 0 &&
            ( !!foundEpisode || mdbTitle_looksNumberedSeries( seriesName ) ) ) {

            // A numbered series on a channel that is not a show is someone putting out their
            // own mixes, so it belongs in Category:Promo Mix - but only when the name SAYS so
            // ("Vol.14", "Mix"). The artist here was inferred rather than read off the title,
            // and writing " (Promo Mix)" into the title on top of that would stack a guess on a
            // guess. mdbTitle_result keeps the category and leaves the title alone for exactly
            // the names that already say it.
            var seriesPromo = mdbTitle_saysPromoMix( seriesName );

            logVar( "buildMixesdbTitle: the title is a numbered series, so the channel is the artist", show );
            conf.drop( 5, "the title reads as a numbered series and names nobody, so the channel was taken as the artist" );

            return mdbTitle_result( date, show, seriesName, null, seriesPromo, [], conf );
        }

        // leftovers in the artist mean the title was not fully understood
        if( /[|\/:]|\[|\]/.test( artist ) ) {
            conf.drop( 10, "the artist still contains separators - part of the title may belong elsewhere" );
        }
        if( /\d/.test( artist ) ) {
            conf.drop( 5, "the artist still contains numbers - possibly a leftover date or episode" );
        }
        if( artist.indexOf( "@" ) !== -1 ) {
            conf.drop( 10, "there is a venue/event in the title - check the joiner and the city/country info" );
        }
        if( artist.length > 60 ) {
            conf.drop( 5, "the artist is unusually long" );
        }

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
            conf.drop( 5, "the channel is the artist, so no show/venue was added" );

        } else if( show && !isMappedChannel && !taken.taken && !showFromEpisodeRule &&
                   mdbTitle_bitSplitRe().test( artist ) ) {
            // The title already split into two groups of its own, so it did not leave an
            // entity to fill in - appending the raw channel name would only make a fourth
            // group ("MOLTO IN THE MIX - Guest of the Week: buyArt - Molto Recordings Group").
            // Only for a channel name that is a pure guess anyway: one that is mapped, or that
            // was found in the title, has earned its place.
            logVar( "buildMixesdbTitle: dropping the channel, the title already has two groups", show );
            show = "";
            conf.drop( 5, "the channel was not added - the title already carries an artist and a name of its own" );

        } else if( show && artist.indexOf( "@" ) !== -1 ) {
            // The venue is already IN the artist group, so the channel must not be added as a
            // third one: "Adriana Lopez @ Monnom Black" needs no "- RAW" behind it. Unlike the
            // containment test above this holds however short the channel name is.
            logVar( "buildMixesdbTitle: dropping the show, the venue is already in the artist", show );
            show = "";
            conf.drop( 5, "the title names a venue with \"@\", so the channel was not added as a show" );
        }

        // 7) assemble
        return mdbTitle_result( date, artist, show, episode, false, extraArtists, conf );

    } catch( e ) {
        log( "buildMixesdbTitle FAILED: " + e );
        return nothing;
    }
}

// mdbTitle_assemble
// "YYYY-MM-DD - Artist[ - Show[ NNN|(ID)]][ (Promo Mix)]"
function mdbTitle_assemble( date, artist, show, episode, promoMix ) {
    if( !date || !artist ) return "";

    var out = date + " - " + artist;

    if( show ) {
        out += " - " + show;

        if( episode ) {
            // plain number appended ("HATE Podcast 496"), a number written onto the name kept
            // that way ("trommel.251"), alphanumeric ID bracketed ("RA Podcast (RA.971)") -
            // all three taken from how MixesDB spells them
            if( episode.kind === "number" ) {
                out += " " + episode.text;
            } else if( episode.kind === "dotted" ) {
                out += "." + episode.text;
            } else {
                out += " (" + episode.text + ")";
            }
        }
    } else if( episode && episode.kind === "id" ) {
        out += " (" + episode.text + ")";
    }

    // Help:Add_a_new_mix_page - a homemade/self-released mix goes into Category:Promo Mix,
    // and the title marks it: "2025-12-09 - Tau Car - Printemps 66 (Promo Mix)"
    if( promoMix ) {
        out += " (Promo Mix)";
    }

    logVar( "mdbTitle_assemble result", out );
    return out;
}

// mdbTitle_result
// The single exit of buildMixesdbTitle: appends the extra artists, assembles, and enforces
// the three-group rule "Date - Artist - Entity" (see title_definitions.js). A 4th group is
// never a richer title, it always means a part of the SoundCloud title was misread - it
// cannot be repaired blindly here, so it is flagged hard instead.
function mdbTitle_result( date, artist, entity, episode, promoMix, extraArtists, conf ) {
    artist = mdbTitle_wikiSafe( mdbTitle_joinArtists( artist, extraArtists ) );
    entity = mdbTitle_wikiSafe( entity );

    // " (Promo Mix)" only where the name does not already say it - the page still goes into
    // the category either way, which is what promoCategory carries out to the UI
    var promoCategory = !!promoMix,
        promoInTitle = promoMix && !mdbTitle_saysPromoMix( entity );

    var title = mdbTitle_assemble( date, artist, entity, episode, promoInTitle );

    if( title ) {
        // THE strict rule: three groups, and no group holding a separator that reads as a
        // fourth. "2026-08-07 - LIMB - #9 - Yuka" is four groups however it is punctuated, and
        // a title that comes out like that was not understood - so the separators inside the
        // groups are flattened to keep the promise, and the score is capped low enough that
        // nobody pastes it without looking.
        var groups = mdbTitle_countGroups( title );

        if( groups > 3 ) {
            logVar( "mdbTitle_result: too many groups", groups + " in \"" + title + "\"" );

            title = mdbTitle_assemble( date, mdbTitle_flattenSeparators( artist ),
                                       mdbTitle_flattenSeparators( entity ), episode, promoInTitle );

            conf.drop( 100, "the title came out as " + groups + " groups instead of \"Date - Artist - Entity\" - a part of it was not understood and had to be flattened, so read it before using it" );
        }
    }

    if( title ) {
        // The episode number had nowhere to go: mdbTitle_assemble writes it behind the entity,
        // and there is no entity. So it fell out of the title - which is a number the series
        // itself put there, not decoration, and worth saying out loud rather than losing.
        if( episode && !entity && episode.kind !== "id" ) {
            conf.drop( 10, "the title numbers an episode (" + episode.text + ") but no show name was found to put it behind, so the number was left out" );
        }

        // charged here rather than where the names were found, because only a join that really
        // happened had to guess the joiner
        if( artist && extraArtists && extraArtists.length ) {
            conf.drop( 5, "the artists behind \"w/\" were joined with \",\" (played after another) - use \" & \" if they played together" );
        }

        if( mdbTitle_reCased ) {
            conf.drop( 5, "the title was written in one case throughout and was put into Normal Case - check names that really are spelled in caps" );
        }
    }

    return {
        title: title,
        confidence: conf.percent(),
        reasons: conf.reasons,
        // the page still belongs in Category:Promo Mix even when the title does not say so
        promoCategory: promoCategory
    };
}

// mdbTitle_wikiSafe
// Takes out what a MediaWiki page title cannot hold (see title_definitions.js). A space, not
// nothing, so "RAUSCH#6" reads as "RAUSCH 6" and not "RAUSCH6".
function mdbTitle_wikiSafe( s ) {
    var illegal = ( typeof scWikiIllegalChars !== "undefined" && scWikiIllegalChars ) ? scWikiIllegalChars : /[#<>\[\]|{}]+/g;

    illegal.lastIndex = 0;

    return String( s || "" ).replace( illegal, " " ).replace( /\s+/g, " " ).trim();
}

// mdbTitle_countGroups
// Groups as a READER counts them, not as the assembler joined them: any separator run with
// whitespace around it breaks a title in two on sight, whether it is the " - " we wrote or a
// "–" that came out of the SoundCloud title.
function mdbTitle_countGroups( title ) {
    // the date's own hyphens carry no spaces, so they are not separator runs
    return title.split( mdbTitle_bitSplitRe() ).length;
}

// mdbTitle_flattenSeparators
// Last resort for a group that still holds a separator: the separator goes, the words stay.
// Leaves a bad title, but never a title that reads as four groups.
function mdbTitle_flattenSeparators( s ) {
    return String( s || "" )
        .replace( mdbTitle_bitSplitRe(), " " )
        .replace( /\s+/g, " " )
        .trim();
}

// mdbTitle_saysPromoMix
// Whether a name already says it is not a podcast or radio show, so " (Promo Mix)" behind it
// would only repeat what it says. See scPromoMixImpliedWords in title_definitions.js.
function mdbTitle_saysPromoMix( entity ) {
    var words = ( typeof scPromoMixImpliedWords !== "undefined" && scPromoMixImpliedWords ) ? scPromoMixImpliedWords : [];

    if( !entity || !words.length ) return false;

    return new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( words ) + ")\\b\\.?", "i" ).test( entity );
}


/*
 * The input below the headline
 *
 * Two async sources have to meet before it can be added: the API call (which brings the
 * title/date/channel) and the toolkit (which decides whether the mix is on MixesDB already).
 * Both just store their piece and call mdbTitleInput_add() - whichever finishes last adds it.
 */
var mdbTitle_suggestion = "",
    mdbTitle_confidencePercent = 0,
    mdbTitle_confidenceReasons = [],
    mdbTitle_promoCategory = false,
    // what the "Create" link sends along besides the title - all three come from the same API
    // response the suggestion is built from, so they are taken in through mdbTitle_suggest()
    // rather than read off the DOM (see getScPlayerUrl(), which lives in the userscript's IIFE)
    mdbTitle_playerUrl = "",
    mdbTitle_durationMs = 0,
    mdbTitle_artworkUrl = "",
    mdbTitle_toolkitVerdict = null,
    mdbTitle_toolkitPoll = null;

// mdbTitle_suggest
// The entry point the track page calls. Builds the suggestion TWICE: once straight away off
// the title alone, so there is something on screen without waiting for a network round trip,
// and once more when MixesDB has said what it knows about the names in it. The second pass is
// what turns a channel into an artist and a bit of the title into an "@ venue".
function mdbTitle_suggest( scTitle, username, createdAt, releaseDate, durationMs, playerUrl, artworkUrl ) {
    logFunc( "mdbTitle_suggest" );

    mdbTitle_playerUrl = playerUrl || "";
    mdbTitle_artworkUrl = scArtworkOriginalUrl( artworkUrl );

    var first = buildMixesdbTitle( scTitle, username, createdAt, releaseDate, mdbTitle_categoryCache );

    mdbTitleInput_setSuggestion( first, durationMs );

    mdbTitle_lookupCategories( mdbTitle_categoryCandidates( scTitle, username ), function( known ) {
        var second = buildMixesdbTitle( scTitle, username, createdAt, releaseDate, known );

        if( second.title !== first.title ) {
            logVar( "mdbTitle_suggest: MixesDB knew better", first.title + "  ->  " + second.title );
        }

        mdbTitleInput_setSuggestion( second, durationMs );
    });
}

// mdbTitle_showForUsed
// The "Debug settings" block at the top of script.user.js sets the flag. Read through a
// helper (and off window - this file is a @require and cannot see the userscript's IIFE
// scope), so a cached script.user.js from before the setting existed just means "off"
// instead of a ReferenceError.
function mdbTitle_showForUsed() {
    return window.mdbTitle_showForUsedPlayers === true;
}

// The "Create" link target: the edit form of the new page itself, not the "Add a new mix" form
// that only takes a title. Everything this page already knows about the mix rides along in the
// "insert" parameter - MixesDB_Userscripts_Helper puts it into the edit box, see its
// "Edit: insert a page text handed over in the URL" section.
var mdbTitle_editUrl = "https://www.mixesdb.com/w/index.php";

// mdbTitleInput_syncCreateHref
// The input is editable, so the link has to carry whatever is in it AT CLICK TIME. Kept in a
// real href (rather than built in a click handler) so cmd/ctrl/middle-click still open a tab.
function mdbTitleInput_syncCreateHref( input, link ) {
    var title = $.trim( input.val() ),
        artwork = mdbTitle_artwork(),
        href = mdbTitle_editUrl +
               "?title=" + encodeURIComponent( title ) +
               "&action=edit" +
               "&insert=" + encodeURIComponent( mdbTitle_pageText( title ) );

    // Not part of the page text: whether the mix page gets a picture at all is the editor's
    // decision, and they make it over there by writing the [[File:...]] line themselves. The
    // URL only rides along so that, once they have, MixesDB's upload form knows where the
    // picture is - see the Helper's "Edit: remember an image URL" section.
    if( artwork ) {
        href += "&img1url=" + encodeURIComponent( artwork );
    }

    link.attr( "href", href );
}

// mdbTitle_artwork
// The artwork URL to hand over. #mdb-artwork-input holds the one that has been tried against
// the server - loadArtworkInfo() puts whatever actually loaded in there, which is not always
// the "-original" that was asked for - so it beats the URL built from the API response. That
// input only exists in the new layout, and it is filled in asynchronously, hence the fallback.
function mdbTitle_artwork() {
    var fromPage = $.trim( $("#mdb-artwork-input").val() || "" );

    return fromPage || mdbTitle_artworkUrl;
}

// mdbTitle_pageText
// The wikitext a new mix page starts as. Only what this SoundCloud page can actually answer for
// is filled in: the file details, the player, and the categories the title itself spells out.
// The tracklist and the styles are the editor's work and are left as the empty shapes they have
// on every mix page, so nothing here has to be undone before it can be finished.
function mdbTitle_pageText( title ) {
    return "== File details ==\n\n" +
           mdbTitle_fileDetails() + "\n\n" +
           "{{Player\n |" + mdbTitle_playerUrl + "\n}}\n\n" +
           "== Tracklist ==\n\n" +
           "<list>\n\n</list>\n\n" +
           mdbTitle_pageCategories( title );
}

// mdbTitle_fileDetails
// #mdb-fileDetails already holds the table in wiki syntax - it is what the duration button
// copies out - so the page text takes it from there rather than building a second version of
// it, and picks up MB/kbps the day those are read off the file.
// It is built from the same API response as the suggestion but a moment later (see the "file
// details" block in script.user.js), so for the window in between the duration that came in
// with the suggestion stands in for it.
function mdbTitle_fileDetails() {
    var fromPage = $.trim( $("#mdb-fileDetails textarea").val() || "" );

    if( fromPage ) return fromPage;

    return getFileDetails_wikitext( mdbTitle_durationMs ? Math.floor( mdbTitle_durationMs / 1000 ) : 0 );
}

// mdbTitle_pageCategories
// Read out of the title in the input, not out of what the parser had in mind: the input is
// editable, and a corrected title has to take its categories with it.
//
// "Date - Artist - Entity" gives the year, one category per artist, and the entity. The two
// empty slots are the styles - nothing on a SoundCloud page says what a mix sounds like, and a
// guess there is worse than a blank the editor cannot miss. "Tracklist: none" is what a page
// without a tracklist is filed as; the wiki's own editor swaps it once one is added.
function mdbTitle_pageCategories( title ) {
    var bits = String( title || "" ).split( mdbTitle_bitSplitRe() ),
        year = ( String( title || "" ).match( /^\s*(\d{4})/ ) || [ "", "" ] )[1],
        artistField = bits[1] || "",
        entity = bits[2] || "",
        cats = [],
        i;

    if( year ) cats.push( year );

    // A live recording has no third bit: what stands behind the "@" is the entity there. The
    // city behind the venue is not a category of its own - "... @ Wire Club, Leeds" is filed
    // under Wire Club alone - so only the part in front of the comma is taken.
    var atParts = artistField.split( /\s+@\s+/ );

    if( atParts.length > 1 ) {
        artistField = atParts[0];

        if( !entity ) {
            entity = atParts.slice( 1 ).join( " @ " ).split( "," )[0];
        }
    }

    // the separators MixesDB writes between artists - "," for one after another, "&" for
    // together - both mean one category each
    var artists = artistField.split( /\s*(?:,|&)\s*/ );

    for( i = 0; i < artists.length; i++ ) {
        // no episode stripping on an artist: "Asa 808" is a name, and the number belongs to it
        var artist = $.trim( artists[i].replace( /\s*\(Promo Mix\)\s*$/, "" ) );

        if( artist ) cats.push( artist );
    }

    // Help:Add_a_new_mix_page - a self-released mix is filed under Promo Mix, and what stands in
    // the entity slot there is the mix's OWN name, which is no category at all: "1975 - Bob
    // Marley & The Wailers - Secret Santana Tapes (Promo Mix)" is filed under the two artists
    // and Promo Mix, never under "Secret Santana Tapes". The flag covers the titles that leave
    // the suffix off because the name already says it (see mdbTitleInput_syncPromoNote).
    var isPromoMix = mdbTitle_promoCategory || /\(Promo Mix\)\s*$/.test( title ),
        entityCategory = isPromoMix ? "Promo Mix" : mdbTitle_entityCategory( entity );

    if( entityCategory ) cats.push( entityCategory );

    cats.push( "", "" ); // styles - the editor's call
    cats.push( "Tracklist: none" );

    var out = "";

    for( i = 0; i < cats.length; i++ ) {
        out += "[[Category:" + cats[i] + "]]\n";
    }

    return out;
}

// mdbTitle_entityCategory
// MixesDB files every episode of a series under the series itself: "HATE Podcast 173" and
// "Trommel.038" are both [[Category:HATE Podcast]] / [[Category:Trommel]], and an event keeps
// its name without the edition ("Sunwaves 31" -> Sunwaves). The bracketed tail a title can
// carry - "(RA.971)", "(Promo Mix)" - is never part of a category name either.
function mdbTitle_entityCategory( entity ) {
    return String( entity || "" )
        .replace( /\s*\([^()]*\)\s*$/, "" )
        .replace( /[\s.]+\d+$/, "" )
        .trim();
}

// Help:File_Details#Minimum_duration - MixesDB does not take recordings under 20 minutes, so
// there is no page to create for a shorter track and no point offering a title for one.
var mdbTitle_minDurationMs = 20 * 60 * 1000;

// mdbTitleInput_setSuggestion
// Takes the { title, confidence, reasons } object from buildMixesdbTitle(), plus the track
// duration in ms (the API's t.duration - the same value #mdb-fileInfo shows).
function mdbTitleInput_setSuggestion( suggestion, durationMs ) {
    // kept for the page text behind the "Create" link, in case it is built before
    // #mdb-fileDetails exists - see mdbTitle_fileDetails()
    mdbTitle_durationMs = durationMs || 0;

    // only skip on a duration we actually know: a missing/zero value means the API gave us
    // nothing, and dropping the suggestion over that would be worse than offering it
    if( durationMs && durationMs < mdbTitle_minDurationMs ) {
        log( "mdbTitleInput_setSuggestion: track is " + Math.round( durationMs / 1000 ) + "s, under the " +
             ( mdbTitle_minDurationMs / 60000 ) + " min MixesDB minimum - no title suggested." );
        mdbTitle_suggestion = "";
        return;
    }

    mdbTitle_suggestion = ( suggestion && suggestion.title ) || "";
    mdbTitle_confidencePercent = ( suggestion && suggestion.confidence ) || 0;
    mdbTitle_confidenceReasons = ( suggestion && suggestion.reasons ) || [];
    mdbTitle_promoCategory = !!( suggestion && suggestion.promoCategory );
    mdbTitleInput_add();
}

// mdbTitleInput_watchToolkit
// The suggestion is only useful for mixes that are NOT on MixesDB yet, so it waits for the
// toolkit's verdict instead of showing up right away. (The debug setting
// mdbTitle_showForUsedPlayers takes the used ones too - it still waits for the verdict, it
// just does not throw them away.)
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
            log( "mdbTitleInput_watchToolkit: this player is already used on MixesDB - " +
                 ( mdbTitle_showForUsed()
                   ? "showing the title anyway (debug setting mdbTitle_showForUsedPlayers)."
                   : "no title suggestion needed." ) );
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

// mdbTitleInput_refresh
// Second thoughts from the MixesDB lookup, put into a row that is already on screen. Anything
// typed into the input wins: a refined guess is still a guess, and the editor's own text is
// the one thing here that is not.
function mdbTitleInput_refresh( wrapper ) {
    logFunc( "mdbTitleInput_refresh" );

    var input = wrapper.find( "#mdb-mixesdbTitle" );

    if( input.length && !input.data( "mdb-edited" ) && input.val() !== mdbTitle_suggestion ) {
        input.val( mdbTitle_suggestion )
             .attr( "size", Math.max( 20, mdbTitle_suggestion.length ) )
             .trigger( "change" ); // keeps the "Create" href in step with the new title
    }

    wrapper.find( "#mdb-mixesdbTitle-score" )
        .attr( "class", "mdb-mixesdbTitle-score-" + mdbTitleInput_confidenceBand( mdbTitle_confidencePercent ) )
        .attr( "title", mdbTitleInput_confidenceTitle() )
        .text( mdbTitle_confidencePercent + "%" );

    mdbTitleInput_syncPromoNote( wrapper );
}

// mdbTitleInput_syncPromoNote
// Help:Add_a_new_mix_page puts a self-released mix into Category:Promo Mix. Where the title
// itself already says so (" (Promo Mix)") there is nothing to add; where the name carries the
// word anyway ("Summer 2026 Mix") the suffix is left off, and THEN the category still has to
// be named somewhere - here, under the "Create" link.
function mdbTitleInput_syncPromoNote( wrapper ) {
    var note = wrapper.find( "#mdb-mixesdbTitle-promoCategory" ),
        wanted = mdbTitle_promoCategory && mdbTitle_suggestion.indexOf( "(Promo Mix)" ) === -1;

    if( !wanted ) {
        note.remove();
        return;
    }

    if( !note.length ) {
        wrapper.find( "#mdb-mixesdbTitle-createColumn" ).append(
            $("<span>")
                .attr( "id", "mdb-mixesdbTitle-promoCategory" )
                .attr( "title", "A self-released mix - the page belongs in Category:Promo Mix, and the \"Create\" link already writes that category into it.\nThe title itself does not say so because its name already does (\"Mix\", \"Vol.\", ...)." )
                .text( "Category:Promo Mix" )
        );
    }
}

// mdbTitleInput_add
function mdbTitleInput_add() {
    // A used player normally has no row at all - the debug setting is the only way it gets one,
    // and it still waits for a verdict (null = the toolkit has not answered yet).
    var isUsed = ( mdbTitle_toolkitVerdict === "used" );

    if( mdbTitle_toolkitVerdict !== "unused" && !( isUsed && mdbTitle_showForUsed() ) ) return;
    if( !mdbTitle_suggestion ) return;

    var headline = $("#mdb-trackHeader-headline");
    if( !headline.length ) return;

    // The row is built once and refreshed after that: the MixesDB lookup lands a moment after
    // the first suggestion is on screen, and rebuilding the whole row would take the input
    // (and anything typed into it) away under the editor's hands.
    var existing = $("#mdb-mixesdbTitle-wrapper");
    if( existing.length ) {
        mdbTitleInput_refresh( existing );
        return;
    }

    logFunc( "mdbTitleInput_add" );
    logVar( "mdbTitleInput_add: toolkit verdict", mdbTitle_toolkitVerdict );

    // No .mono class here on purpose: global.css sets ".mono { font-size: 12px !important }",
    // which no ID selector can beat. The monospace font comes from #mdb-mixesdbTitle instead.
    var wrapper = $("<div>").attr( "id", "mdb-mixesdbTitle-wrapper" ),
        input = $("<input>", {
            type: "text",
            id: "mdb-mixesdbTitle",
            spellcheck: "false",
            autocomplete: "off",
            title: "Suggested MixesDB mix page title - editable, please check it before using it"
        }),
        // how much of the title was read off the source vs. inferred - the tooltip names
        // every guess that cost points, so it says WHAT to check, not just that something is off
        score = $("<span>")
            .attr( "id", "mdb-mixesdbTitle-score" )
            .addClass( "mdb-mixesdbTitle-score-" + mdbTitleInput_confidenceBand( mdbTitle_confidencePercent ) )
            .attr( "title", mdbTitleInput_confidenceTitle() )
            .text( mdbTitle_confidencePercent + "%" ),
        beta = $("<span>")
            .attr( "id", "mdb-mixesdbTitle-beta" )
            .attr( "title", "Guessed from the SoundCloud title, date and channel name - it can be wrong. See Help:Add a new mix page." )
            .text( "BETA" );

    // .val() instead of a value attribute so the title text is never parsed as HTML
    input.val( mdbTitle_suggestion );

    // monospace, so size is the character count of the suggestion - the whole title stays
    // visible without a horizontal scroll. Floored, an empty-looking 1-char box is useless.
    input.attr( "size", Math.max( 20, mdbTitle_suggestion.length ) );

    // input first, so appendMdbCopyTextButton() has a parent to insert the button into - it
    // uses .after(), which is a no-op on a detached node.
    // Order: input, copy, confidence (score over beta), then "Create" - or "used" in its place.
    wrapper.append( input );

    appendMdbCopyTextButton( input, {
        ariaLabel: "Copy the suggested MixesDB page title",
        buttonTitle: "Copy the suggested MixesDB page title",
        copiedMessage: function() {
            return "Page title copied!";
        },
        processedClass: "mdb-mixesdbTitle-copy-processed"
    });

    // "beta" belongs under the score, and a plain <br> cannot do that here: the row is a flex
    // container, where a <br> becomes a flex item of its own instead of breaking the line.
    // A small column wrapper stacks the two and keeps them as one item in the row.
    var confidence = $("<span>")
            .attr( "id", "mdb-mixesdbTitle-confidence" )
            .append( score, beta );

    wrapper.append( confidence );

    if( isUsed ) {
        // No "Create" link for a used player: the mix HAS a page, and the link would open the
        // edit form of a second one. The toolkit right below links to the existing page - that
        // is what the suggestion is to be compared against. The marker keeps the debug row from
        // ever passing as the normal "not on MixesDB yet" one.
        wrapper.addClass( "mdb-mixesdbTitle-used" )
               .append( $("<span>")
                   .attr( "id", "mdb-mixesdbTitle-usedNote" )
                   .attr( "title", "This player is already used on MixesDB - see the toolkit below.\nThe title is only shown because the debug setting mdbTitle_showForUsedPlayers is on at the top of script.user.js. No \"Create\" link, since that would start a duplicate page." )
                   .text( "Exists" ) );
    } else {
        // _blank, not the usual _top: the point of this link is to fill in the MixesDB form
        // while still reading duration/artwork URL/API data off this SoundCloud page - the
        // same "keep working on the source page" case as the toolkit's EDIT/HIST links.
        var create = $("<a>")
                .attr( "id", "mdb-mixesdbTitle-create" )
                .attr( "target", "_blank" )
                .attr( "title", "Create this mix page on MixesDB - opens its edit form, filled with the file details, the player and the categories the title gives away" )
                .text( "Create" );

        mdbTitleInput_syncCreateHref( input, create );
        input.on( "input change", function() {
            mdbTitleInput_syncCreateHref( input, create );
        });

        // The page text is more than the title: the file details table lands in the DOM a
        // moment after this row is built, and nothing about that fires an input event. So the
        // href is refreshed once more on the way into the click - mousedown covers left,
        // middle and cmd/ctrl-click alike, focus covers reaching the link by keyboard.
        create.on( "mousedown focus", function() {
            mdbTitleInput_syncCreateHref( input, create );
        });

        // Only a REAL keystroke marks the input as the editor's. A refresh sets .val() and
        // fires "change" itself, which must not count as editing.
        input.on( "input", function() {
            input.data( "mdb-edited", true );
        });

        // A column, so the promo category note can sit under the link the way "BETA" sits
        // under the score
        wrapper.append( $("<span>").attr( "id", "mdb-mixesdbTitle-createColumn" ).append( create ) );
        mdbTitleInput_syncPromoNote( wrapper );
    }

    headline.after( wrapper );
}

// mdbTitleInput_confidenceBand
// Drives the colour. The thresholds are about what the reader should DO: green = read off the
// source, amber = one guess worth checking, red = the title was largely inferred.
function mdbTitleInput_confidenceBand( percent ) {
    if( percent >= 80 ) return "high";
    if( percent >= 55 ) return "mid";
    return "low";
}

// mdbTitleInput_confidenceTitle
function mdbTitleInput_confidenceTitle() {
    var intro = "Confidence that this title needs no changes.";

    if( !mdbTitle_confidenceReasons.length ) {
        return intro + "\nEverything was read straight off the SoundCloud title, date and channel.";
    }

    return intro + "\n\nWhat lowered it:\n- " + mdbTitle_confidenceReasons.join( "\n- " );
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