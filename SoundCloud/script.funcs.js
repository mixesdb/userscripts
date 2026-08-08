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
        m;

    // one occurrence per pass - each pass shortens the text, so this always terminates
    while( ( m = re.exec( result.text ) ) !== null ) {
        var names = mdbTitle_cleanArtist( m[1] );

        // What stands immediately in front of the FIRST connector decides whose name it is:
        // "Slowciety w/ Asa 808" makes Slowciety the first artist, while
        // "Yoyaku Instore Sessions with TONTON & TATA" names a show, not an artist.
        if( !result.before ) {
            var bits = result.text.slice( 0, m.index ).split( mdbTitle_bitSplitRe() );
            result.before = mdbTitle_cleanArtist( bits[ bits.length - 1 ] );
        }

        result.text = mdbTitle_cut( result.text, m.index, m[0].length );
        if( names ) result.artists.push( names );
    }

    return result;
}

// mdbTitle_seriesScore
// How much a bit of the title looks like a series rather than an artist name. A series WORD
// outweighs a bare number, which is what tells "IT.podcast.s15e06" (podcast + digits) from
// "Surgeon & Erika closing Return to the Source 2026" (digits only, and a year at that).
function mdbTitle_seriesScore( part ) {
    var score = 0;

    if( /\b(podcast|radio|radioshow|show|sessions|series|cast|fm|mix|mixtape)\b/i.test( part ) ) score += 2;
    if( /\d/.test( part ) ) score += 1;

    return score;
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
//   "Surgeon x Erika"            -> "Surgeon & Erika"   (played together)
//   "Adriana Lopez at Monnom"    -> "Adriana Lopez @ Monnom"
// Done on the whole title before anything is split up, so the "@" is already in place when
// the venue rules further down look for it.
function mdbTitle_applyJoiners( text ) {
    var venue = ( typeof scVenueConnectors !== "undefined" && scVenueConnectors ) ? scVenueConnectors : [],
        together = ( typeof scTogetherArtistJoiners !== "undefined" && scTogetherArtistJoiners ) ? scTogetherArtistJoiners : [];

    // The venue first: an "x" behind an "@" belongs to the venue name and must not become "&".
    // Two words have to stand in front of the connector, inside its own bit of the title -
    // that is what makes it a NAME at a place ("Adriana Lopez at RAW") rather than an ordinary
    // English phrase ("Look at Me", "Live at Berghain", where "at" is just a preposition).
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
function buildMixesdbTitle( scTitle, username, createdAt, releaseDate ) {
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
            // The upload date is right for most of what gets uploaded - a podcast episode goes
            // up on its release day. It is wrong for an old set or a radio show uploaded later,
            // which is worth a real drop but not the biggest one in the file.
            conf.drop( 15, "no date in the SoundCloud title - using the upload date, which is not the mix date for an older recording" );
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
            conf.drop( 5, "a joiner was read out of the title (\"x\" as \"&\", \"at\" as \"@\") - check it against the recording" );
            rest = joined;
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

        // 4) take the show name out of the title before looking for an episode, so
        // "HATE Podcast 496 - Fadi Mohem" leaves "496 - Fadi Mohem" and not "HATE - ..."
        var restWithShow = rest, // kept for the "title was nothing but the show" fallback below
            taken = mdbTitle_takeShowOutOfTitle( rest, show, !isMappedChannel ),
            promoMix = false;

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
        if( taken.taken && !taken.extended && !taken.episode && !guestArtist && !isMappedChannel &&
            !/^\s*(?:presents?|pres\.?|w\/|with|feat\.?|ft\.?)\b/i.test( taken.text ) ) {

            var entity = mdbTitle_cleanArtist( taken.text );

            logVar( "buildMixesdbTitle: channel name is the artist, entity from the title", entity );

            // a self-released mix under its own name is a promo mix - but not when the entity
            // names a venue/event (@) or is recognisably a series
            promoMix = !!entity &&
                       entity.indexOf( "@" ) === -1 &&
                       !/\b(podcast|radio|radioshow|show|sessions|series|cast|fm)\b/i.test( entity ) &&
                       !/promo\s*mix/i.test( entity );

            conf.drop( 10, "artist and mix name were told apart by the channel name, not by the title itself" );
            if( promoMix ) {
                conf.drop( 10, "\"(Promo Mix)\" is assumed - it is not a known show, venue or event" );
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
        // Guarded tightly so a plain "Some DJ Vol.5" is not turned inside out: only for a
        // keyword episode, only when something follows it behind a separator, and only when
        // the channel name was NOT found in the title (if it was, we already have the show).
        if( episode && episode.word && !taken.taken ) {
            var showFromTitle = mdbTitle_cleanArtist( beforeEpisode ),
                artistAfter = new RegExp( "^\\s*[" + mdbTitle_sepInner + ",]+\\s*(.+)$" ).exec( afterEpisode );

            if( showFromTitle && artistAfter && mdbTitle_cleanArtist( artistAfter[1] ) ) {
                show = ( showFromTitle + " " + episode.word ).replace( /\s+/g, " " );
                rest = artistAfter[1];
                showFromEpisodeRule = true;
                logVar( "buildMixesdbTitle: show taken from the title instead of the channel", show );
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
        if( isMappedChannel ) {
            // curated by hand in title_definitions.js - nothing to doubt
        } else if( showFromEpisodeRule ) {
            // "<Show> <Word> <Number> - <Artist>" was READ off the title, not guessed at: the
            // number and the separator say which part is which. Costs nothing.
        } else if( taken.extended ) {
            conf.drop( 5, "the show name was completed from the title (\"" + show + "\")" );
        } else if( taken.taken ) {
            conf.drop( 5, "the show name comes from the channel name found in the title" );
        } else if( show ) {
            conf.drop( 20, "the channel \"" + show + "\" is not in the known-shows list - it may not be a show name at all" );
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
    var title = mdbTitle_assemble( date, mdbTitle_joinArtists( artist, extraArtists ), entity, episode, promoMix );

    if( title ) {
        // charged here rather than where the names were found, because only a join that really
        // happened had to guess the joiner
        if( artist && extraArtists && extraArtists.length ) {
            conf.drop( 5, "the artists behind \"w/\" were joined with \",\" (played after another) - use \" & \" if they played together" );
        }

        if( mdbTitle_reCased ) {
            conf.drop( 5, "the title was written in one case throughout and was put into Normal Case - check names that really are spelled in caps" );
        }

        // the date's own hyphens carry no spaces, so this only counts real groups
        var groups = title.split( " - " ).length;

        if( groups > 3 ) {
            logVar( "mdbTitle_result: too many groups", groups + " in \"" + title + "\"" );
            conf.drop( 25, "the suggestion has " + groups + " groups instead of \"Date - Artist - Entity\" - part of the title was not understood" );
        }
    }

    return {
        title: title,
        confidence: conf.percent(),
        reasons: conf.reasons
    };
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
    mdbTitle_toolkitVerdict = null,
    mdbTitle_toolkitPoll = null;

// The "Create" link target. MixesDB_Userscripts_Helper picks the title parameter up there and
// fills it into the "Add a new mix" form - see its "Add a new mix: prefill" section.
var mdbTitle_addNewMixUrl = "https://www.mixesdb.com/w/MixesDB:Add_a_new_mix";

// mdbTitleInput_syncCreateHref
// The input is editable, so the link has to carry whatever is in it AT CLICK TIME. Kept in a
// real href (rather than built in a click handler) so cmd/ctrl/middle-click still open a tab.
function mdbTitleInput_syncCreateHref( input, link ) {
    link.attr( "href", mdbTitle_addNewMixUrl + "?title=" + encodeURIComponent( $.trim( input.val() ) ) );
}

// Help:File_Details#Minimum_duration - MixesDB does not take recordings under 20 minutes, so
// there is no page to create for a shorter track and no point offering a title for one.
var mdbTitle_minDurationMs = 20 * 60 * 1000;

// mdbTitleInput_setSuggestion
// Takes the { title, confidence, reasons } object from buildMixesdbTitle(), plus the track
// duration in ms (the API's t.duration - the same value #mdb-fileInfo shows).
function mdbTitleInput_setSuggestion( suggestion, durationMs ) {
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
        // _blank, not the usual _top: the point of this link is to fill in the MixesDB form
        // while still reading duration/artwork URL/API data off this SoundCloud page - the
        // same "keep working on the source page" case as the toolkit's EDIT/HIST links.
        create = $("<a>")
            .attr( "id", "mdb-mixesdbTitle-create" )
            .attr( "target", "_blank" )
            .attr( "title", "Create this mix page on MixesDB - opens the \"Add a new mix\" form with the title above" )
            .text( "Create" ),
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
    // uses .after(), which is a no-op on a detached node. Order: input, copy, score, Create, beta.
    wrapper.append( input );

    appendMdbCopyTextButton( input, {
        ariaLabel: "Copy the suggested MixesDB page title",
        buttonTitle: "Copy the suggested MixesDB page title",
        copiedMessage: function() {
            return "Page title copied!";
        },
        processedClass: "mdb-mixesdbTitle-copy-processed"
    });

    mdbTitleInput_syncCreateHref( input, create );
    input.on( "input change", function() {
        mdbTitleInput_syncCreateHref( input, create );
    });

    // "beta" belongs under the score, and a plain <br> cannot do that here: the row is a flex
    // container, where a <br> becomes a flex item of its own instead of breaking the line.
    // A small column wrapper stacks the two and keeps them as one item in the row.
    var confidence = $("<span>")
            .attr( "id", "mdb-mixesdbTitle-confidence" )
            .append( score, beta );

    wrapper.append( confidence, create );
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