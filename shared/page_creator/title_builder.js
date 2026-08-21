log( "/shared/page_creator/title_builder.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * MixesDB page creator - the title builder (beta)
 *
 * Builds a starting point for a MixesDB mix page title out of what a player page can answer
 * for: the player title, the channel/uploader name and the upload date.
 * Rules: https://www.mixesdb.com/w/Help:Add_a_new_mix_page
 *
 * Site-agnostic on purpose - it never touches the DOM and never asks which site it is on, so
 * every userscript with a player title, a channel name and a date can call it. The site script
 * reads those three off its own page/API and hands them over; see page_creator.js for the UI
 * that wraps this.
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
 * This is a guess and labelled "BETA" in the UI on purpose: player titles are free text, and
 * the mix date regularly is NOT the upload date (radio shows get uploaded days later, old sets
 * years later), so nothing here can be used without a look.
 *
 * The word lists and the channel/show mapping live in title_definitions.js, not here.
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

// The month names MixesDB itself writes, for the "<Month> Promo Mix" titles a monthly mix
// gets ("2011-08 - Aeroplane - August Promo Mix"). English and spelled out, whatever the
// player title used ("Aug", "August", "Aug."), because that is how the wiki writes them.
var mdbTitle_monthTitleNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Characters player titles use to separate the parts of a title, as a regex class body.
// Doubled runs ("//", "||", "\\") are covered by the "+" quantifiers wherever this is used.
// The comma is deliberately NOT in here: on MixesDB "," joins artists who played after each
// other ("ANA, Johnny D, DJ Koze"), so it must never split a title into artist and show.
var mdbTitle_sepInner = "\\-–—|:/\\\\";

// The words that only ever introduce an episode NUMBER, so "Vol.5" must not be mistaken for an
// episode ID like "RA.971" just because it is also "letters, dot, digits".
//
// BUILT from the two curated lists in title_definitions.js rather than kept alongside them: a
// word that names a series (mdbTitleShowSuffixWords) and a word that counts an episode
// (mdbTitleCounterWords) both introduce a number wherever they stand, and a private copy of
// them drifts. It did - "cast" was on the show list and not in here, so
// "Whose These Cast #02 by Mar Monzon" never found the word carrying its number, and with it
// went the artist standing behind the "by". One list cannot drift from itself.
//
// What the two lists do NOT cover is added here: words that number something without naming a
// series ("Vol.5", "Tape 4", "Act 2", "Set 3"). Cached, since mdbTitle_findEpisode is called
// several times per title.
var mdbTitle_episodeWordCache = null;

function mdbTitle_episodeWords() {
    if( mdbTitle_episodeWordCache ) return mdbTitle_episodeWordCache;

    var words = [ "vol", "volume", "pod", "set", "feat", "ft", "tape", "act", "guest" ]
            .concat( mdbTitle_showSuffixWords() )
            .concat( ( typeof mdbTitleCounterWords !== "undefined" && mdbTitleCounterWords ) ? mdbTitleCounterWords : [] ),
        seen = {},
        list = [],
        word,
        i;

    for( i = 0; i < words.length; i++ ) {
        word = String( words[i] ).toLowerCase();

        if( word && !seen[word] ) { seen[word] = true; list.push( word ); }
    }

    // longest first, so the alternation reports "mixtape" rather than the "mix" inside it
    mdbTitle_episodeWordCache = list.sort( function( a, b ) { return b.length - a.length; } );

    return mdbTitle_episodeWordCache;
}

// mdbTitle_pad
function mdbTitle_pad( n ) {
    return ( n < 10 ? "0" : "" ) + n;
}

// mdbTitle_escapeRe
function mdbTitle_escapeRe( s ) {
    return String( s ).replace( /[.*+?^${}()|[\]\\]/g, "\\$&" );
}

// mdbTitle_escapeReLooseSpaces
// A name as a pattern whose INNER spaces are optional: "Frenzy Podcast" also matches
// "FrenzyPodcast". Everything else is escaped as usual, so only the spacing is loose - the
// whole name still has to stand there, and the callers still put word boundaries around it.
// See "A name written without its spaces" in title_definitions.js.
function mdbTitle_escapeReLooseSpaces( name ) {
    return mdbTitle_escapeRe( String( name || "" ) ).split( /\s+/ ).join( "\\s*" );
}

// mdbTitle_escapeReLooseSeparators
// mdbTitle_escapeReLooseSpaces plus: a dash or colon INSIDE the name matches any other one,
// and none at all. The same show is written "Juno Daily - In The Mix", "Juno Daily \u2013 In The
// Mix", "Juno Daily: In The Mix" and "Juno Daily In The Mix" by the same uploader in the same
// month, and a curated name that only matches the punctuation it happens to be written with
// leaves the rest of the show name standing in the title as if it were an artist. The WORDS
// still all have to stand there in order - only what sits between them is loose.
// Used for the mdbTitleChannelSeriesConversions keys, where the name is a whole title part
// rather than a single word.
function mdbTitle_escapeReLooseSeparators( name ) {
    return String( name || "" )
        .split( /\s*[-\u2013\u2014:|]+\s*/ )
        .map( mdbTitle_escapeReLooseSpaces )
        .join( "\\s*[-\u2013\u2014:|]*\\s*" );
}

// mdbTitle_fractionLeadRe
// A text OPENING on a fraction - "1/2 Faultierdisko", "3/4 Peace". Digits on both sides of a
// slash with no blank near it is how a name writes a fraction, and the slash is then no
// separator, however much mdbTitle_sepInner says it is one.
var mdbTitle_fractionLeadRe = /^\s*\d{1,5}[\/\\]\d/;

// mdbTitle_normalizeCompare
// Strips everything but letters/digits, so "DJ MARIA." and "dj maria" compare equal
function mdbTitle_normalizeCompare( s ) {
    return String( s || "" ).toLowerCase().replace( /[^a-z0-9]/g, "" );
}

// mdbTitle_matchCase
// Writes a word in the case another one was typed in: "PODCATS" -> "PODCAST", "Podcats" ->
// "Podcast", "podcats" -> "podcast". Whether a bit of the title is shouted is a question
// mdbTitle_toNormalCase answers later off the bit as a whole, so a correction must not change
// the answer on its way past.
function mdbTitle_matchCase( sample, word ) {
    var first = sample.charAt( 0 );

    if( sample === sample.toUpperCase() && sample !== sample.toLowerCase() ) return word.toUpperCase();
    if( first === first.toUpperCase() && first !== first.toLowerCase() ) {
        return word.charAt( 0 ).toUpperCase() + word.slice( 1 );
    }

    return word;
}

// mdbTitle_spaced
// "_" written as the space it already is on MediaWiki - see "The underscore IS a space" in
// title_definitions.js. Runs before every other rule, including the typo fixes: "_" is a word
// character to a regex, so every "\b" in the parser (and in mdbTitleTypoFixes) reads
// "SAXON_AUGUST" as a single word.
function mdbTitle_spaced( text ) {
    var chars = ( typeof mdbTitleSpaceChars !== "undefined" && mdbTitleSpaceChars ) ? mdbTitleSpaceChars : /_+/g;

    chars.lastIndex = 0;

    return String( text || "" ).replace( chars, " " );
}

// mdbTitle_fixTypos
// The misspellings of mdbTitleTypoFixes, corrected before any rule reads a word of the title.
function mdbTitle_fixTypos( text ) {
    var list = ( typeof mdbTitleTypoFixes !== "undefined" && mdbTitleTypoFixes ) ? mdbTitleTypoFixes : [],
        i;

    text = String( text || "" );

    for( i = 0; i < list.length; i++ ) {
        list[i].wrong.lastIndex = 0;

        text = text.replace( list[i].wrong, function( found ) {
            return mdbTitle_matchCase( found, list[i].right );
        } );
    }

    return text;
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
// so "26" is 2026 but "95" is 1995 (there are plenty of 90s sets on these sites).
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
// Distance in days to the upload date - this is what tells "030426" apart as
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
                cands = pat.build( m ) || [],
                // How many ways THESE digits can be read at all. "1999-10-09" has exactly one -
                // the year stands in front, so nothing about it is a guess - while "03/04/26"
                // has three. Counted per match and after the invalid readings dropped out
                // ("25/12/2020" is a date in one order only), because that is what says whether
                // the reading could be a misread. See the confidence drop in buildMixesdbTitle.
                readings = {},
                readingCount = 0;

            for( var r = 0; r < cands.length; r++ ) {
                if( cands[r] && !readings[ cands[r].out ] ) {
                    readings[ cands[r].out ] = true;
                    readingCount++;
                }
            }

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
                        readings: readingCount,
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

// mdbTitle_takeJokeYear
// The gig year of an event that writes its edition a thousand years ahead - "3000Grad Festival
// 3025" is the 2025 one. Returns { text, year }, year "" when the title names no such event or
// carries no such number. See mdbTitleJokeYearEvents in title_definitions.js for why this can
// only be curated per event.
//
// Taken OUT of the title, like every other gig year: MixesDB writes the year in front of a
// title and never twice. Read once the chunk rewrites have run and before the chunks a mix
// page title does not carry are dropped (1b3 in buildMixesdbTitle) - "Rummelplatz 3026" is no
// stage to that drop, "Rummelplatz" is.
//
// The number has to be a token of its own - not glued to letters - which is what keeps the
// "3000" of the event's own name out of it, and what comes out has to read as a real year, so
// a plain "2025" in the same title is left to the ordinary date rules.
function mdbTitle_takeJokeYear( text ) {
    var events = ( typeof mdbTitleJokeYearEvents !== "undefined" && mdbTitleJokeYearEvents ) ? mdbTitleJokeYearEvents : [],
        result = { text: String( text || "" ), year: "" },
        i;

    for( i = 0; i < events.length; i++ ) {
        if( !events[i].name ) continue;
        if( result.text.toLowerCase().indexOf( String( events[i].name ).toLowerCase() ) === -1 ) continue;

        var ahead = events[i].ahead || 0,
            // A number of its OWN: no letter and no digit on either side. Not whitespace -
            // the reported title glues it to the closing dash of a wrap ("-Rummelplatz 3026-")
            // and a bracket would do the same. The letter test is what keeps the "3000" of
            // the event's own name out of it.
            re = /(^|[^0-9A-Za-z])(\d{4})(?![0-9A-Za-z])/g,
            m;

        while( ( m = re.exec( result.text ) ) !== null ) {
            var real = String( Number( m[2] ) - ahead );

            if( !/^(?:19|20)\d{2}$/.test( real ) ) continue;

            // something has to be left standing - a title that is nothing but the number is
            // not dated by it, the same guard mdbTitle_takeTrailingYear keeps
            var without = mdbTitle_cut( result.text, m.index + m[1].length, m[2].length );

            if( !mdbTitle_trimSeparators( without ) ) continue;

            result.text = without;
            result.year = real;

            return result;
        }
    }

    return result;
}

// mdbTitle_yearOf
// The year of a date, or "" - the only part of an upload date a live recording may claim.
// Takes a bare "2026" as readily as a full ISO date, so an event's own year passes through it.
function mdbTitle_yearOf( date ) {
    var m = /^\s*((?:19|20)\d{2})/.exec( String( date || "" ) );

    return m ? m[1] : "";
}

// mdbTitle_takeRecordingMonth
// A MONTH NAME ending a live recording's title says WHEN it was played, not what the place is
// called: "Live@Elsewhere Loft July" is a July recording at Elsewhere Loft. Returns
// { text, month }, with month 0 when there is none.
//
// Only ever asked about a title that already reads as a live recording, and only about its LAST
// word. A bare month name is part of a NAME far more often than it is a date - "Mar Monzon",
// "May Day", the channel "Juni" - so nothing looser may read one, which is also why
// mdbTitle_findDate has no pattern for it.
function mdbTitle_takeRecordingMonth( text ) {
    var result = { text: String( text || "" ), month: 0 },
        m = /\s+([a-zäöü]{3,9})\.?\s*$/i.exec( result.text ),
        month = m ? mdbTitle_monthFromName( m[1] ) : 0;

    // the month must leave a place behind - "@ July" names no venue at all
    if( !month || !mdbTitle_trimSeparators( result.text.slice( 0, m.index ) ) ) return result;

    result.text = result.text.slice( 0, m.index );
    result.month = month;

    return result;
}

// mdbTitle_isDateOnly
// Is this bit of a title NOTHING BUT a date? "August 2026" is, "August Sessions" is not.
// Asked of what stands behind an "@" (mdbTitle_atDateSeparator), so it has to be strict:
// mdbTitle_findDate has to read it AND has to leave nothing standing.
// A bare month name is deliberately NOT one - a month on its own is part of a name far more
// often than it is a date ("Mar Monzon", "May Day", the channel "Juni"), which is the same
// reason mdbTitle_findDate has no pattern for one; on a live title the trailing month is
// already read by mdbTitle_takeRecordingMonth.
function mdbTitle_isDateOnly( text ) {
    var s = mdbTitle_trimSeparators( String( text || "" ) );

    if( !s ) return false;

    var found = mdbTitle_findDate( s, "" );

    return !!found && !mdbTitle_trimSeparators( mdbTitle_cut( s, found.index, found.length ) );
}

// mdbTitle_atDateSeparator
// "Ingo Sanger @ August 2026" -> "Ingo Sanger - August 2026": an "@" whose whole tail is a
// DATE joins nothing. The joiner says a set was PLAYED SOMEWHERE, and a date is not a
// somewhere - written in front of one the "@" is the uploader's own flourish, and reading it
// as the joiner cost the title twice over: the mix became a live recording at a place called
// "August 2026", and the date group never got the month the title had spelled out.
//
// Runs at the top of mdbTitle_applyJoiners, so the parse and the chunk split (which both go
// through it) see the same title, and so the "at" spelling is covered before the joiner rules
// read it. The tail is everything up to the next separator or the end - what stands behind an
// "@" is one group.
function mdbTitle_atDateSeparator( text ) {
    var s = String( text || "" ),
        re = /\s*(?:@|\bat\b)\s*/gi,
        out = "",
        last = 0,
        m;

    while( ( m = re.exec( s ) ) !== null ) {
        if( !m[0].length ) { re.lastIndex++; continue; } // never loop forever

        var after = s.slice( m.index + m[0].length ),
            split = mdbTitle_bitSplitRe(),
            next = split.exec( after ),
            tail = next ? after.slice( 0, next.index ) : after;

        if( mdbTitle_isDateOnly( tail ) ) {
            out += s.slice( last, m.index ) + " - ";
            last = m.index + m[0].length;
        }
    }

    return out + s.slice( last );
}

// mdbTitle_atEpisodeSeparator
// "Colossio @ Melodic Therapy #217 - Mexico" -> "Colossio - Melodic Therapy #217 - Mexico":
// an "@" pointing at a "#"-numbered EPISODE is written as the separator it also is.
//
// Such a title says two things that cannot both be written. The "@" says the set was PLAYED
// somewhere; the "#217" says the name behind it is a SERIES, counting its episodes. The series
// is the half that can be CHECKED - a show numbers its episodes, a place does not - and an "@"
// is everyday shorthand for "guest on" as readily as it is the joiner, so the series is what
// the suggestion writes. The other half is neither refuted nor thrown away:
//
//   - the DATE stays a live recording's, the year alone. If the set really was played at that
//     show, the upload date is not the day it was played, and claiming a day would be a guess
//     either way (mdbTitle_atEpisodeRead, read in the date step).
//   - the live reading is OFFERED as a "Switch title" chip, country and all
//     ("2026 - Colossio @ Melodic Therapy 217, Mexico"), so the call is made in the open
//     instead of silently - see the alternatives in mdbTitle_result.
//
// The "#" is what says it, and only the "#": it marks digits as a pure episode count and
// nothing else in a title does - see the "#" section in title_definitions.js -
// while a bare number behind a name is a venue's own as readily as an episode ("@ Club 69").
// A tail naming an EVENT keeps its "@" whatever it counts: an event numbering its editions is
// still the place the set was played at.
//
// Only an "@" with something in FRONT of it, and never the "at" spelling. A title opening on
// the joiner names no artist of its own and is the channel's own set ("@ Some Show #12"), and
// "at" carries the live markers with it ("Live at ..."), which have their own rules below.
//
// Runs next to mdbTitle_atDateSeparator at the top of mdbTitle_applyJoiners, for the same
// reason: the parse and the chunk split both go through it and have to see the same title.
function mdbTitle_atEpisodeSeparator( text ) {
    var s = String( text || "" ),
        eventRe = mdbTitle_eventWordRe(),
        re = /\s*@\s*/g,
        out = "",
        last = 0,
        m;

    while( ( m = re.exec( s ) ) !== null ) {
        if( !m[0].length ) { re.lastIndex++; continue; } // never loop forever

        var after = s.slice( m.index + m[0].length ),
            split = mdbTitle_bitSplitRe(),
            next = split.exec( after ),
            tail = mdbTitle_trimSeparators( next ? after.slice( 0, next.index ) : after ),
            episode = tail ? mdbTitle_findEpisode( tail ) : null;

        if( episode && episode.marked &&
            !( eventRe && eventRe.test( tail ) ) &&
            mdbTitle_trimSeparators( s.slice( last, m.index ) ) ) {
            out += s.slice( last, m.index ) + " - ";
            last = m.index + m[0].length;
        }
    }

    return out + s.slice( last );
}

// mdbTitle_takeTrailingYear
// A four-digit year ending the text, taken off together with the blank and a dangling comma
// in front of it. Returns { text, year }, year "" when the text does not end in one. Something
// has to be left standing - a text that IS the year is not dated by it.
// No rule of its own about WHEN a trailing year is a date rather than part of a name - the
// callers say that (mdbTitle_takeRecordingYear, the chunk split's live mirror).
function mdbTitle_takeTrailingYear( text ) {
    var result = { text: String( text || "" ), year: "" },
        m = /\s((?:19|20)\d{2})\s*$/.exec( result.text );

    if( !m || !mdbTitle_trimSeparators( result.text.slice( 0, m.index ) ) ) return result;

    result.text = result.text.slice( 0, m.index ).replace( /[\s,]+$/, "" );
    result.year = m[1];

    return result;
}

// mdbTitle_takeRecordingYear
// A YEAR ending a live recording's PLACE LIST says when the gig was, not what the place is
// called: "@ 3000Grad Festival, Utopia 2021" was played at Utopia, in 2021. Returns
// { text, year }, year "" when the title does not date itself that way.
//
// Two shapes say it. Behind the "," of a place group ("@ Event, Venue" / "@ Venue, City") -
// a venue or a city is not named after a year, so a year trailing the LIST dates the
// recording. And behind an EVENT, comma or not: an event runs once a year and the number is
// which edition this was, so "@ 3000Grad Festival 2023" is the 2023 one and MixesDB writes
// that year in the date group, never twice. isEvent is what the wiki answered about the place
// (the venue branch asks); an event WORD in the place says the same thing without a lookup,
// which is what the chunk mirror in mdbTitle_titleChunks runs on.
//
// A year glued to the ONE place name a title carries that is NEITHER may be the edition's own
// name and stays where it stands: "DJ Set @ What Happens Label Night 2026" keeps its 2026.
// See "The date of a live recording" in title_definitions.js.
function mdbTitle_takeRecordingYear( group, isEvent ) {
    var text = String( group || "" ),
        at = text.lastIndexOf( "@" );

    if( at === -1 ) return { text: text, year: "" };

    if( text.indexOf( ",", at ) === -1 && !isEvent && !mdbTitle_placeNamesEvent( text.slice( at + 1 ) ) ) {
        return { text: text, year: "" };
    }

    return mdbTitle_takeTrailingYear( text );
}

// mdbTitle_placeNamesEvent
// Does this place carry one of mdbTitleEventWords ("3000Grad Festival", "Dekmantel Open
// Air")? The word list alone, no lookup - the callers that HAVE an answer from the wiki pass
// it in themselves.
function mdbTitle_placeNamesEvent( place ) {
    var re = mdbTitle_eventWordRe();

    return !!( re && re.test( String( place || "" ) ) );
}

// mdbTitle_liveDate
// The date and the artist group of a LIVE recording whose player title carries no date of its
// own. Such a set is uploaded whenever the recording is ready - days, months or years after it
// was played - so the upload date is never the gig date and only its YEAR is claimed. A year
// the place list names wins over the upload year - the title is the only source that dates
// the gig - and a month the place names refines the year; both leave the place name as they go.
// See "The date of a live recording" in title_definitions.js.
function mdbTitle_liveDate( date, group, isEvent ) {
    var result = { date: date, group: group, month: 0 },
        withoutYear = mdbTitle_takeRecordingYear( group, isEvent ),
        year = withoutYear.year || mdbTitle_yearOf( date );

    if( !year ) return result;

    var withoutMonth = mdbTitle_takeRecordingMonth( withoutYear.text );

    result.date = year;
    result.month = withoutMonth.month;
    result.group = withoutYear.text;

    if( withoutMonth.month ) {
        result.date = year + "-" + mdbTitle_pad( withoutMonth.month );
        result.group = withoutMonth.text;
    }

    return result;
}

// mdbTitle_liveDateReason
// What the reader is told about a date mdbTitle_liveDate cut down to the year (and month).
function mdbTitle_liveDateReason( month ) {
    return month
        ? "only the year and the month are known - the title says the set was played somewhere and names a month, but no day"
        : "only the year is known - the title says the set was played somewhere but names no day, and the upload date is not when it was played";
}

/*
 * Confidence
 *
 * Every guess the builder has to make lowers the score, so the number next to the input says
 * how much of the title was READ off the source and how much was inferred. Capped at 95: this
 * is a suggestion, and claiming certainty about a free-text player title would be wrong.
 *
 * A GUESS is what earns a drop, and nothing else. The reasons are shown to the reader under
 * "What lowered it", so each one has to name something they could go and check - and a reason
 * that cannot say WHAT was guessed is a reason that should not have been charged. Four things
 * that look like doubts and are not, all found in one report - "1999-10-09 - Thomas Bangalter
 * @ WE, Dolton Expo Center, Chicago", a MixesDB title pasted back into the player, which came
 * out verbatim and still scored 65%:
 *
 * - A fact about the MIX is not a doubt about the reading. A title date ten years before the
 *   upload date only means the recording is old. Where the title names a day, a month and a
 *   year and the digits read one way, nothing there was decided by us: no drop. Where it leaves
 *   something open, the upload date did decide, and that is worth 3.
 * - Rewriting is not reading. Putting the blanks around an "@" the uploader typed, cutting a
 *   note about the recording out of a bracket, or trimming what a cut-out date left behind
 *   decides nothing. Only a joiner read INTO the title is charged, and the reason names the
 *   words it was read out of ("at" as "@") - the reader cannot check "a joiner was applied".
 * - What the title already says is not missing. A venue group is "@ Venue, City", so the doubt
 *   is a MISSING city, not the "@" - "@ WE, Dolton Expo Center, Chicago" leaves nothing open.
 * - A doubt about something that is not in the suggestion is not a doubt about the suggestion.
 *   The channel not being a known show is charged only where the channel actually became the
 *   entity, not where the title carried its own and the channel was dropped.
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

// mdbTitle_idIsName
// Whether an id-shaped token ("UFO95", "RA.971") is really a NAME standing in the title, so
// the episode finder has to leave it alone. Two ways a token says so:
// - it touches an "@": what stands in front of the joiner is who played and what stands
//   behind it is the place - the same both-sides rule mdbTitle_takeShowOutOfTitle holds to.
//   "UFO95 LIVE @ DOMMUNE" on the channel "UFO95" is the artist's own name at a venue, and
//   reading the name as an episode id turned the title inside out: the venue became the
//   artist and the id went behind the channel-show ("Dommune - UFO95 (UFO95)"). Reported
//   2026-08-20.
// - MixesDB knows the token as a category of ANY type: digits can be part of a name ("UFO95",
//   "Route 8", "Asa 808"), and only a real answer may say so (mdbTitle_knownNow - absent on
//   the first parse, where the "@" rule is the cover). The whole token is asked, never its
//   letter half: "RA" being a known podcast must not veto the id "RA.971".
function mdbTitle_idIsName( text, index, length, token ) {
    if( /^\s*@/.test( text.slice( index + length ) ) ) return true;
    if( /@\s*$/.test( text.slice( 0, index ) ) ) return true;

    return !!( mdbTitle_knownNow && mdbTitle_knownAs( mdbTitle_knownNow, token ) );
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
        if( mdbTitle_episodeWords().indexOf( m[2].toLowerCase() ) === -1 ) {
            var lead = m[1] ? m[1].length : 0;

            // a name is never an episode id - see mdbTitle_idIsName
            if( mdbTitle_idIsName( text, m.index + lead, m[0].length - lead, m[2] + "." + m[3] ) ) continue;

            return {
                text: m[2] + "." + m[3],
                kind: "id",
                index: m.index + lead,
                length: m[0].length - lead
            };
        }
    }

    // "Podcast 496", "Episode 12", "Vol. 5", "Show #23". The "#" is captured: it marks the
    // digits as a pure episode number, which is what lets a bare name stand right behind them
    // - see "#" marks the episode number in title_definitions.js.
    var wordRe = new RegExp( "(^|[^\\w])(" + mdbTitle_episodeWords().join("|") + ")\\.?\\s*(#?)\\s*(\\d{1,5})(?!\\d)", "i" );
    m = wordRe.exec( text );
    if( m ) {
        return {
            text: m[4],
            kind: "number",
            word: m[2], // the keyword as spelled in the title - part of the show name, see below
            marked: m[3] === "#",
            index: m.index + ( m[1] ? m[1].length : 0 ),
            length: m[0].length - ( m[1] ? m[1].length : 0 )
        };
    }

    // The same, but with a SEPARATOR between the keyword and its number:
    // "IA Podcast | 233: Fixeer & Ricardo Garduno". The uploader broke the show name and the
    // episode number into two bits of the title, and they still belong together - without this
    // the title reads as three groups and nothing can be told apart in it.
    // Two guards, because a separator makes the number a BIT of its own and a bit of its own
    // can be all sorts of things:
    // - a year is never taken this way ("Some Show | 2026" numbers no episode), since a wrong
    //   episode number costs more than a missing one
    // - the number has to END its bit. "Deep House Mix - 2 Hours Live" counts hours, not
    //   episodes, and what tells it from "IA Podcast | 233: Fixeer & Ricardo Garduno" is the
    //   word behind the digits. Without a separator the two cannot be confused and the pattern
    //   above already reads them.
    var sepWordRe = new RegExp( "(^|[^\\w])(" + mdbTitle_episodeWords().join("|") +
                                ")\\.?\\s*[" + mdbTitle_sepInner + "]+\\s*(#?)\\s*(?!(?:19|20)\\d{2}(?!\\d))(\\d{1,5})(?!\\d)" +
                                "(?=\\s*[" + mdbTitle_sepInner + "]|\\s*$)", "i" );
    m = sepWordRe.exec( text );
    if( m ) {
        return {
            text: m[4],
            kind: "number",
            word: m[2],
            marked: m[3] === "#",
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
            marked: true,
            index: m.index + ( m[1] ? m[1].length : 0 ),
            length: m[0].length - ( m[1] ? m[1].length : 0 )
        };
    }

    // "SSP176", "XLR8R700" - digits glued straight onto letters, so the letters belong to the
    // episode ID the same way "RA." does in "RA.971". Tightly guarded: at least two letters and
    // two digits, nothing wordy on either side - otherwise "b2b" would read as the ID "b2".
    var gluedRe = /(^|[^\w])([A-Za-z]{2,8})(\d{2,5})(?![\w])/g;
    while( ( m = gluedRe.exec( text ) ) !== null ) {
        if( mdbTitle_episodeWords().indexOf( m[2].toLowerCase() ) === -1 ) {
            var gluedLead = m[1] ? m[1].length : 0;

            // a name is never an episode id - see mdbTitle_idIsName
            if( mdbTitle_idIsName( text, m.index + gluedLead, m[0].length - gluedLead, m[2] + m[3] ) ) continue;

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
    //
    // Unless the text opens on a FRACTION: "1/2 Faultierdisko" is half a duo's name, and the
    // slash inside it separates nothing. Read as one, the "1" became an episode number
    // nobody wrote and the artist a "2 Faultierdisko" that does not exist. Digits on both
    // sides and no blank anywhere near the slash - that spelling is a fraction and nothing
    // else, so nothing looser is needed to tell it from a real separator.
    m = mdbTitle_fractionLeadRe.test( text )
            ? null
            : new RegExp( "^[\\s" + mdbTitle_sepInner + "]*(\\d{1,5})(?!\\d)\\s*[" + mdbTitle_sepInner + "]+\\s*" ).exec( text );
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
    return ( typeof mdbTitleShowSuffixWords !== "undefined" && mdbTitleShowSuffixWords ) ? mdbTitleShowSuffixWords : [
        "podcast", "radio", "show", "mix", "series", "session", "cast", "fm"
    ];
}

// mdbTitle_takeShowOutOfTitle
// Removes one occurrence of the show name from the title, so an episode number behind it can
// be found on its own. Returns the shortened text and the (possibly extended) show name.
function mdbTitle_takeShowOutOfTitle( text, show, allowExtend ) {
    // index is where the name stood in the text HANDED IN, which is what lets a caller ask
    // which bit of the title it was standing in - see 4c in buildMixesdbTitle
    var result = { text: text, show: show, taken: false, extended: false, episode: null, index: -1 };

    if( !show ) return result;

    // The pattern differs between a mapped and an unmapped channel, so the group numbers are
    // tracked as they are built - a hard-coded m[2]/m[3] would silently read the wrong group.
    // The name is a group of its own because its spaces are optional: how long it stands in the
    // title is not its own length ("FrenzyPodcast" is 14 characters of "Frenzy Podcast").
    var pattern = "(^|[^\\w])(" + mdbTitle_escapeReLooseSpaces( show ) + ")",
        nameGroup = 2,
        suffixGroup = 0,
        wordGroup = 0,
        numberGroup = 0,
        groups = 2;

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
    // Only the CASE is ever taken from the title, never the SPACING: a title writing the name
    // glued ("FrenzyPodcast") is matched by the loose spaces above, and the name still goes
    // into the suggestion spelled the way its own side spells it. Equal length says the spacing
    // is the same, since the two can only differ in case and in whitespace by then.
    var shownAs = m[nameGroup];

    if( shownAs !== show && shownAs.length === show.length &&
        show === show.toUpperCase() && show !== show.toLowerCase() ) {
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
    result.index = index;

    return result;
}

// mdbTitle_bitAt
// Which bit of a title an offset falls into: { text, start }, counting the bits the separators
// mark out (mdbTitle_bitSplitRe). What it is for is asking whether two things - the channel
// name and an episode number - stand in the SAME bit, which is what says the number belongs to
// that name rather than to the one in the next bit over.
function mdbTitle_bitAt( text, offset ) {
    var re = mdbTitle_bitSplitRe(),
        start = 0,
        end = text.length,
        m;

    re.lastIndex = 0;

    while( ( m = re.exec( text ) ) !== null ) {
        if( m[0].length === 0 ) { re.lastIndex++; continue; } // never loop forever

        if( m.index > offset ) {
            end = m.index;
            break;
        }

        start = m.index + m[0].length;
    }

    return { text: text.slice( start, end ), start: start };
}

// mdbTitle_bits
// Every bit of a title, each with the offset it starts at - the units mdbTitle_bitAt answers
// about, listed instead of looked up. What it is for is the bit of a three-bit title that is
// neither the channel's nor the numbered series' (4c): that one is the artist.
function mdbTitle_bits( text ) {
    var re = mdbTitle_bitSplitRe(),
        out = [],
        start = 0,
        m;

    re.lastIndex = 0;

    while( ( m = re.exec( text ) ) !== null ) {
        if( m[0].length === 0 ) { re.lastIndex++; continue; } // never loop forever

        out.push( { text: text.slice( start, m.index ), start: start } );
        start = m.index + m[0].length;
    }

    out.push( { text: text.slice( start ), start: start } );

    return out;
}

// mdbTitle_takeExtraArtists
// Pulls "w/ ..."/"with ..." out of the title: those are further artists and belong into the
// ARTIST group, not into a group of their own (see title_definitions.js).
//   "Rinse France Show - Slowciety w/ Asa 808"
//   -> { text: "Rinse France Show - Slowciety", artists: ["Asa 808"] }
// A connector at the very START of the text is left alone - there it introduces the first
// artist ("w/ Ruf Dug"), which mdbTitle_cleanArtist strips on its own.
function mdbTitle_takeExtraArtists( text ) {
    var list = ( typeof mdbTitleExtraArtistConnectors !== "undefined" && mdbTitleExtraArtistConnectors ) ? mdbTitleExtraArtistConnectors : [],
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

// mdbTitle_hasSeriesWord
// Whether a bit carries a word off mdbTitleShowSuffixWords at all - the word half of
// mdbTitle_seriesScore, for the readers that must not count digits: "Bonobo 2026" is no
// series, "UNCODED BIRTHDAY Radioshow" is one.
function mdbTitle_hasSeriesWord( part ) {
    return new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( mdbTitle_showSuffixWords() ) + ")\\b", "i" ).test( part );
}

// mdbTitle_seriesScore
// How much a bit of the title looks like a series rather than an artist name. A series WORD
// outweighs a bare number, which is what tells "IT.podcast.s15e06" (podcast + digits) from
// "Surgeon & Erika closing Return to the Source 2026" (digits only, and a year at that).
//
// The words are mdbTitleShowSuffixWords, the same curated list that turns a bare channel name into a
// show name: a word saying "this is a series" says it wherever it stands. It used to keep a
// list of its own, which drifted - it had "sessions" but not "session", so
// "Yoyaku Instore Sessions with ..." was read as a series and "Yoyaku Instore Session with ..."
// was not. One list cannot drift from itself.
//
// The NUMBER has to COUNT something, and a number that counts is never read INTO a word: it
// ends where the digits end ("Trommel.251", "Festival Mix 12", "XLR8R700", the "s15e06" of
// "IT.podcast.s15e06"). Digits running on into letters are a spelling instead - "3000Grad" is
// how the label writes its name, and scoring it made "Kollektiv Ost - 3000Grad Festival 3023"
// fail the event branch's "an event is a place, not a series" guard, so the title came out as
// a Promo Mix on the channel's own name.
function mdbTitle_seriesScore( part ) {
    var score = 0,
        // A digit glued to a superscript is a SPELLING, not a number that counts: "k²0 Open
        // Air" is how the crew writes its name, and the trailing 0 read as a count made the
        // event branch refuse the whole title ("an event is a place, not a series"). The run
        // goes the way the letters of "3000Grad" do - out of the digit test, never out of the
        // part itself.
        counted = String( part || "" ).replace( /[0-9]*[²³¹⁰-₉][0-9²³¹⁰-₉]*/g, "" );

    if( mdbTitle_hasSeriesWord( part ) ) score += 2;
    if( /\d(?![0-9A-Za-z])/.test( counted ) ) score += 1;

    return score;
}

// mdbTitle_splitNameChain
// The names a chunk strings together with a little word - "Timboletti im Chapeau Club" ->
// [ "Timboletti", "Chapeau Club" ], "Rosmarin und Lavendel" -> [ "Rosmarin", "Lavendel" ].
// Empty when the chunk is no chain. See "A chain of names is not a name" in
// title_definitions.js; placeOnly asks for the connectors that name a PLACE, which is the
// only subset allowed to shorten a name rather than merely add a lookup.
//
// Only a chunk long enough to be a chain is split - three words and more than 15 characters.
// A short one is far more likely to BE a name carrying the word ("Rock and Roll", "Fear of
// Men") than to be two, and every piece costs one of the ten names a lookup may ask about.
function mdbTitle_splitNameChain( name, placeOnly ) {
    var list = placeOnly
            ? ( ( typeof mdbTitleNamePlaceConnectors !== "undefined" && mdbTitleNamePlaceConnectors ) ? mdbTitleNamePlaceConnectors : [] )
            : ( ( typeof mdbTitleNameChainConnectors !== "undefined" && mdbTitleNameChainConnectors ) ? mdbTitleNameChainConnectors : [] ),
        text = mdbTitle_trimSeparators( String( name || "" ) );

    if( !list.length || text.length <= 15 || text.split( /\s+/ ).length < 3 ) return [];

    var parts = text.split( new RegExp( "\\s+(?:" + mdbTitle_wordListAlternation( list ) + ")\\s+", "i" ) ),
        out = [],
        piece,
        i;

    if( parts.length < 2 ) return [];

    for( i = 0; i < parts.length; i++ ) {
        piece = mdbTitle_trimSeparators( parts[i] );

        // a piece that is nothing but a connector-length scrap is no name to ask about
        if( piece && piece.length >= 3 ) out.push( piece );
    }

    return out.length > 1 ? out : [];
}

// mdbTitle_isCounterWord
// Whether an episode keyword only COUNTS ("Episode 72") or is part of the series name
// ("Truancy Volume 300"). See mdbTitleCounterWords in title_definitions.js.
function mdbTitle_isCounterWord( word ) {
    var list = ( typeof mdbTitleCounterWords !== "undefined" && mdbTitleCounterWords ) ? mdbTitleCounterWords : [],
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

// mdbTitle_takeMonthlyEdition
// "E-L-E-C-T-R-O MIx August 2026" -> { text: "E-L-E-C-T-R-O MIx", taken: true, stamp:
// "August 2026" }. A series word with "<Month> <Year>" behind it is the monthly EDITION of a
// recurring mix - the month and year date the episode the way "#39" numbers one, so they are
// not part of the name. Only at the very end of a name, only as month PLUS year, and only
// with a series word (mdbTitleShowSuffixWords) left standing in front: "Berghain July" names
// no series and stays whole, and a bare trailing month is a live recording's business
// (mdbTitle_takeRecordingMonth). See "A series dated by month" in title_definitions.js.
// date is the mix's date, and is what tells a two-digit YEAR from a DAY - see below.
function mdbTitle_takeMonthlyEdition( name, date ) {
    var result = { text: String( name || "" ), taken: false, stamp: "" },
        m = /\s+([a-zäöü]{3,9})\.?\s+((?:19|20)\d{2}|\d{2})\s*$/i.exec( result.text );

    if( !m || !mdbTitle_monthFromName( m[1] ) ) return result;

    // "August 26" is the 2026 edition as often as it is the 26th of August, and only the
    // upload date can say which: the digits are a year when they land on the year the mix was
    // uploaded in, give or take one. A four-digit year says it itself.
    if( m[2].length === 2 ) {
        var stampYear = mdbTitle_expandYear( m[2] ),
            uploadYear = parseInt( mdbTitle_yearOf( date ), 10 );

        if( !uploadYear || Math.abs( stampYear - uploadYear ) > 1 ) return result;
    }

    var front = mdbTitle_trimSeparators( result.text.slice( 0, m.index ) ),
        seriesBody = "\\b(?:" + mdbTitle_wordListAlternation( mdbTitle_showSuffixWords() ) + ")\\b",
        series = new RegExp( seriesBody, "i" );

    if( !front || !series.test( front ) ) return result;

    // What is left in front has to be a NAME, not just the word. Strip the series words out of
    // "Mix August 2026" and nothing remains: there is no series called "Mix", the title has no
    // name of its own at all, and taking the stamp off would leave the bare word as the name.
    // mdbTitle_datedMixName reads that one, and moves the word instead of dropping anything.
    if( !mdbTitle_trimSeparators( front.replace( new RegExp( seriesBody, "gi" ), " " ) ) ) return result;

    result.text = front;
    result.taken = true;
    result.stamp = mdbTitle_trimSeparators( m[0] );

    return result;
}

// mdbTitle_datedMixName
// "Mix August 2026" -> { text: "August 2026 Mix", taken: true }: a title that is a mix word
// and a date and NOTHING else has no name of its own, so the month and year are the name and
// MixesDB writes the word behind them. Works either way round, since an uploader types the
// word in front as readily as behind ("August 2026 Mix" is already in that order and comes
// back unchanged, which is what makes it safe to run over both).
// Nothing is dropped, only moved - see mdbTitleDatedMixWords in title_definitions.js. Anchored
// at both ends, so a name with anything else in it is never touched: "House Set August 2026"
// and "E-L-E-C-T-R-O MIx August 2026" both name something and go to mdbTitle_takeMonthlyEdition.
// No two-digit year check here, unlike the monthly edition: whether "August 26" is the year or
// the 26th does not change the answer, since either way the words only swap places.
function mdbTitle_datedMixName( name ) {
    var words = ( typeof mdbTitleDatedMixWords !== "undefined" && mdbTitleDatedMixWords ) ? mdbTitleDatedMixWords : [ "mix" ],
        result = { text: String( name || "" ), taken: false };

    if( !words.length ) return result;

    // the same flexible blank the live markers get, so "DJ-Mix" and "DJmix" are the same word
    var word = "(?:" + mdbTitle_liveWordAlternation( words ) + ")",
        re = new RegExp( "^(?:(" + word + ")\\s+)?([a-zäöü]{3,9})\\.?\\s+((?:19|20)\\d{2}|\\d{2})(?:\\s+(" + word + "))?$", "i" ),
        m = re.exec( result.text.trim() );

    if( !m ) return result;

    // exactly one of the two positions carries the word - "Mix August 2026 Mix" is neither
    var mixWord = m[1] || m[4];

    if( !mixWord || ( m[1] && m[4] ) || !mdbTitle_monthFromName( m[2] ) ) return result;

    result.text = m[2] + " " + m[3] + " " + mixWord;
    result.taken = true;

    return result;
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

// mdbTitle_liveWordAlternation
// The mdbTitleLiveAtWords as a regex body, with the blank INSIDE a two-word marker made
// optional: "DJ Set", "DJset", "DJ-Set" and "DJ.Set" are one word to an uploader, and the
// marker has to be dropped in all of them - a "DJmix" left standing ends up in the artist
// group in front of the "@". Only the blank between the marker's OWN words is loosened; the
// connector behind it keeps its whitespace, or the "at" of "Livegate" would count.
function mdbTitle_liveWordAlternation( list ) {
    return mdbTitle_wordListAlternation( list ).replace( /\s+/g, "\\s*[-._]?\\s*" );
}

// mdbTitle_reduceRecordingNotes
// A chunk that is a live/DJ-set marker with nothing but a note about the recording next to it
// becomes the bare marker: "… | 2hr Live Mix | at The Yard" -> "… | Live Mix | at The Yard".
// Uploaders put the marker in a bracket, and a bracket is a chunk of its own by the time the
// joiner rules run - so without this the marker is unreachable for them and the words around it
// ("2hr") end up in the artist. Only when the marker plus mdbTitleRecordingNoteFillers accounts
// for the WHOLE chunk: a name that merely contains a marker word ("Live Sessions 12") is a name.
function mdbTitle_reduceRecordingNotes( text ) {
    var live = ( typeof mdbTitleLiveAtWords !== "undefined" && mdbTitleLiveAtWords ) ? mdbTitleLiveAtWords : [],
        fillers = ( typeof mdbTitleRecordingNoteFillers !== "undefined" && mdbTitleRecordingNoteFillers ) ? mdbTitleRecordingNoteFillers : [];

    text = String( text || "" );

    if( !live.length ) return text;

    // the separator is captured, so parts reads [ chunk, sep, chunk, sep, chunk, ... ] - the
    // same split mdbTitle_dropBits uses. One chunk is the whole title and there is nothing
    // around the marker to reach.
    var parts = text.split( new RegExp( "((?:\\s+[" + mdbTitle_sepInner + "]+|:)\\s+)" ) );

    if( parts.length < 3 ) return text;

    var markerRe = new RegExp( "\\b(?:" + mdbTitle_liveWordAlternation( live ) + ")\\b", "i" ),
        i, j, bit, marker, left;

    for( i = 0; i < parts.length; i += 2 ) {
        bit = mdbTitle_trimSeparators( parts[i] );
        marker = bit.match( markerRe );

        // nothing to reduce when the chunk IS the marker already
        if( !marker || bit.length === marker[0].length ) continue;

        left = bit.slice( 0, marker.index ) + " " + bit.slice( marker.index + marker[0].length );

        for( j = 0; j < fillers.length; j++ ) {
            left = left.replace( fillers[j], " " );
        }

        if( !/\S/.test( left ) ) parts[i] = marker[0];
    }

    return parts.join( "" );
}

// mdbTitle_applyJoiners
// Rewrites the joiners of Help:Add_a_new_mix_page into the spelling MixesDB uses:
//   "Surgeon x Erika"                 -> "Surgeon & Erika"   (played together)
//   "Adriana Lopez at Monnom"         -> "Adriana Lopez @ Monnom"
//   "Anja Schneider - Live at Docks"  -> "Anja Schneider @ Docks"
// Done on the whole title before anything is split up, so the "@" is already in place when
// the venue rules further down look for it.
//
// Returns { text, read, dropped, liveSaid }.
//
// "read" holds the joiners it READ INTO the title, each named by the words it actually found
// ( "\"at\" as \"@\"" ). Only those are a guess about the recording and only those are worth a
// confidence drop, which is why they are collected here instead of being inferred from a
// before/after comparison at the call site: re-spacing an "@" the uploader typed, cutting a note
// about the recording out of a bracket and dropping a "(Live)" that sits BEHIND the place all
// change the text and decide nothing.
//
// "dropped" is a live marker that had no place to point at and was taken out of the title, see
// the block that sets it. That one loses something the title said, so the caller flags it.
//
// "liveSaid" is whether a marker this function consumed actually SAID "live" - "Live at",
// "Live@", a trailing "(Live)" or "*live" - as opposed to "dj set"/"dj mix", which sit on the
// same list and say the opposite. The word decides nothing here (a live recording is read off
// the joiner, never off the word), but it is the signal the Live PA alternative hangs on
// (mdbTitle_liveWordSeen above), so consuming it must not swallow it.
function mdbTitle_applyJoiners( text ) {
    // an "@"/"at" in front of a pure date is no joiner at all - before every rule below, so
    // none of them reads the date as the place it was played at
    text = mdbTitle_atDateSeparator( text );

    // an "@" in front of a "#"-numbered episode is the series it numbers, not the place it
    // looks like - same place in the order, so no rule below reads that show as a venue. The
    // live half of such a title is not lost here, it is carried by the build: see
    // mdbTitle_atEpisodeSeparator and mdbTitle_atEpisodeRead.
    text = mdbTitle_atEpisodeSeparator( text );

    var live = ( typeof mdbTitleLiveAtWords !== "undefined" && mdbTitleLiveAtWords ) ? mdbTitleLiveAtWords : [],
        venue = ( typeof mdbTitleVenueConnectors !== "undefined" && mdbTitleVenueConnectors ) ? mdbTitleVenueConnectors : [],
        together = ( typeof mdbTitleTogetherArtistJoiners !== "undefined" && mdbTitleTogetherArtistJoiners ) ? mdbTitleTogetherArtistJoiners : [],
        read = [],
        dropped = "",
        liveSaid = false;

    // What a rule replaced, in the words the title actually used, e.g. "Live at" -> "@".
    // The separator a rule swallows along with the phrase is not part of what was read, so it
    // is trimmed off: "- Live at" is reported as "Live at".
    function readAs( found, spelling ) {
        var was = mdbTitle_trimSeparators( found );

        if( was ) read.push( "\"" + was + "\" as \"" + spelling + "\"" );
    }

    // An "@" the uploader typed says the same thing as the rules below produce, so it is
    // written the same way before anything reads it: MixesDB spells the joiner " @ ", and
    // "Anja Schneider@Docks" is that title with the blanks left out. Everything downstream
    // asks indexOf( "@" ) and then reads the bits AROUND it, so a glued "@" would carry the
    // artist and the place into one bit and out into the finished title.
    text = text.replace( /\s*@\s*/g, " @ " ).replace( /^\s+|\s+$/g, "" );

    // A marker the uploader wrote into a bracket arrives here as a chunk holding the marker AND
    // a note about the recording ("2hr Live Mix"). Cut down to the marker first, so the rules
    // below read it as the marker it is rather than dragging "2hr" into the name in front.
    var reduced = mdbTitle_reduceRecordingNotes( text );

    if( reduced !== text ) {
        logVar( "mdbTitle_applyJoiners: a chunk is a note about the recording", text + " -> " + reduced );
        text = reduced;
    }

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
        // connector of its own next to the words from mdbTitleVenueConnectors - and as
        // punctuation it is its OWN boundary, so the spaces around it are optional:
        // "Live@Elsewhere Loft" is that title with the blanks left out, which is how uploaders
        // write it half the time. A WORD connector still needs its whitespace, or the "at" of
        // "Livegate" would count.
        // A separator may stand between the marker and the connector, because a marker the
        // uploader put in a bracket is a bit of its own by the time this runs -
        // mdbTitle_bracketsToSeparators turned the pair into "|", and the place is in the next
        // bit: "Anja Schneider (Live) @ Docks", "… Soulmate | Live Mix | at The Yard". A WORD
        // connector still needs whitespace or a separator in front of it - never nothing - or
        // the "at" of "Livegate" would count.
        var sep = "[" + mdbTitle_sepInner + "]",
            venueWords = venue.length ? mdbTitle_wordListAlternation( venue ) : "",
            connectors = ( venueWords ? "(?:\\s+|(?:\\s*" + sep + "\\s*)+)(?:" + venueWords + ")\\s+|" : "" ) +
                         "\\s*(?:" + sep + "\\s*)*@\\s*",
            liveRe = new RegExp(
                "(^|[^\\s" + mdbTitle_sepInner + "])\\s*" + sep + "*\\s*\\b(?:" +
                mdbTitle_liveWordAlternation( live ) +
                ")\\b(?:" + connectors + ")", "i" );

        text = text.replace( liveRe, function( all, before ) {
            // the "@" it produces may already have been in the title ("Live @ Docks"), and then
            // only the marker in front of it went - nothing was read into the title
            if( all.indexOf( "@" ) === -1 ) readAs( all.slice( before.length ), "@" );

            // whichever way, a marker was consumed - and one saying "live" is the Live PA
            // alternative's signal ("dj set" on the same list is not)
            if( /live/i.test( all.slice( before.length ) ) ) liveSaid = true;

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

        text = text.replace( venueRe, function( all, before ) {
            readAs( all.slice( before.length ), "@" );

            return before + " @";
        } );
    }

    // The marker may also stand at the END of the title, where it connects nothing. Two cases,
    // and they cost different things:
    //
    // - with an "@" in the title it only repeats what the joiner already says, so it is pure
    //   decoration: "Anja Schneider @ Docks (Live)", "… @ Docks - DJ Set"
    // - without one there is no place in the title at all, and the marker is stuck to the artist
    //   instead: "Dualism Series #031 - alemiko *live" -> the artist is "Alemiko". MixesDB has
    //   no group for HOW a set was played, only for WHERE, and "live" alone does not even settle
    //   that much - it may as well have been a DJ set. So the word goes and the caller says so
    //   in the confidence reasons, which is what the second return value is for.
    //
    // Only at the very end, and only while a name is left standing: a venue may well BEGIN with
    // the word ("@ Live Music Hall"), and there it is the name, not a marker.
    // Without an "@" the marker additionally has to be SET OFF from the name - by a separator, a
    // bracket (which is a "|" by the time this runs) or an asterisk, which is how an uploader
    // writes an aside. A name whose last word merely happens to be one of these words ("Boiler
    // Room Live") keeps it: nothing there says the word is an annotation rather than the name.
    if( live.length ) {
        var placed = text.indexOf( "@" ) !== -1,
            // "\\-" first: inside a character class a bare "-" would read as a range
            markerLead = placed ? "\\s*(?:[" + mdbTitle_sepInner + "]\\s*)*"
                                : "\\s*(?:[" + mdbTitle_sepInner + "*•·]\\s*)+",
            trailingRe = new RegExp( markerLead + "\\b(?:" +
                                     mdbTitle_liveWordAlternation( live ) + ")\\b\\s*$", "i" ),
            trailing = trailingRe.exec( text ),
            withoutMarker = text.replace( trailingRe, "" );

        if( trailing && ( placed ? /@\s*\S/ : /\S/ ).test( withoutMarker ) ) {
            if( !placed ) dropped = mdbTitle_trimSeparators( trailing[0] );

            // same signal as above: a removed "(Live)"/"*live" said "live", a "DJ Set" did not
            if( /live/i.test( trailing[0] ) ) liveSaid = true;

            text = withoutMarker;
        }
    }

    if( together.length ) {
        var re = new RegExp( "(^|\\s)(?:" + mdbTitle_wordListAlternation( together ) + ")(?=\\s)", "gi" ),
            at = text.indexOf( "@" );

        function toAmpersand( all, before ) {
            readAs( all.slice( before.length ), "&" );

            return before + "&";
        }

        // only in front of the venue - "RAW x Monnom Black" is two promoters, not two DJs
        if( at === -1 ) {
            text = text.replace( re, toAmpersand );
        } else {
            text = text.slice( 0, at ).replace( re, toAmpersand ) + text.slice( at );
        }
    }

    return { text: text, read: read, dropped: dropped, liveSaid: liveSaid };
}

// mdbTitle_joinPlaceGroups
// A MixesDB title carries " @ " ONCE: everything behind the joiner is one place group,
// written "@ Event, Venue" and "@ Venue, City". A player title that says "@" twice names the
// place in two steps - the festival and where it was held - so every "@" after the first
// becomes the "," of that group:
//     "Kernel Existence @ 3000Grad Festival @ Utopia" -> "... @ 3000Grad Festival, Utopia"
// A CHUNK behind the joiner is that same second step written with the uploader's other
// separator - a bracket, a "|", a dash wrap - and becomes the same ",":
//     "Kernel Existence @ Utopia | Ritter Butzke | Berlin" -> "... @ Utopia, Ritter Butzke, Berlin"
// Nothing else can become of it. Everything behind the "@" is the place, so a chunk there is
// never a show and never an artist, and without this the separator was merely flattened away
// and the places came out as one glued name ("@ Utopia Ritter Butzke Berlin"). The chunks a
// title carries that are NOT part of the place - a stage, a camp, a part number - are gone by
// the time this runs (1c), which is why this may take the rest at its word.
//
// Runs after mdbTitle_applyJoiners, which wrote every "@" as " @ " - so a plain replace is
// enough. A spelling rule, not a guess: both "@" were the uploader's own, only the second is
// written the way MixesDB writes it. See "Only one \" @ \" per title" in title_definitions.js.
function mdbTitle_joinPlaceGroups( text ) {
    text = String( text || "" );

    var first = text.indexOf( "@" );

    if( first === -1 ) return text;

    // whitespace on BOTH sides, the same boundary mdbTitle_bitSplitRe uses: a "-" sits inside
    // venue names ("Ritter-Butzke") and inside addresses all the time
    var sep = new RegExp( "\\s+[" + mdbTitle_sepInner + "]+\\s+", "g" );

    return text.slice( 0, first + 1 ) +
           text.slice( first + 1 ).replace( /\s*@\s*/g, ", " ).replace( sep, ", " );
}

// mdbTitle_takeLivePa
// The one HOW-marker MixesDB does write: "Live PA" says the act performed its own tracks
// live, and a title carries it as "(Live PA)" behind the artist's name. Here the phrase is
// only TAKEN OUT of the text, with the separator run in front of it - the marker and the name
// it annotates are one group, like the live markers; mdbTitle_result writes it back behind
// the finished artist. Returns { text, taken }.
// Two spellings: a bracket holding nothing but the phrase, and the bare phrase ("Live PA",
// "Live P.A.", "LivePA", any case). A bracket holding MORE than the phrase is left alone -
// cutting the words out of it would leave the bracket unbalanced around a rest nobody
// understood. A bare "live" is never this marker: without the "PA" it only says where, and
// mdbTitleLiveAtWords owns it. See "Live PA" in title_definitions.js.
function mdbTitle_takeLivePa( text ) {
    var result = { text: String( text || "" ), taken: false },
        phrase = "live[\\s\\-._]*p\\.?\\s*a\\.?",
        lead = "\\s*(?:[" + mdbTitle_sepInner + "*]\\s*)*",
        bracketed = new RegExp( lead + "[(\\[{]\\s*" + phrase + "\\s*[)\\]}]", "i" ),
        bare = new RegExp( lead + "\\b" + phrase + "(?![a-z0-9])", "i" ),
        m = bracketed.exec( result.text ) || bare.exec( result.text );

    if( !m ) return result;

    result.text = mdbTitle_cut( result.text, m.index, m[0].length );
    result.taken = true;

    return result;
}

// mdbTitle_livePaSaid
// Whether a text says the phrase at all - the description is asked with this, since there the
// phrase is not cut out, only read.
function mdbTitle_livePaSaid( text ) {
    return /\blive[\s\-._]*p\.?\s*a\.?(?![a-z0-9])/i.test( String( text || "" ) );
}

// mdbTitle_takeGuestMarker
// "RAW-ARTES GUEST MIX" -> the phrase is dropped and "RAW-ARTES" is remembered as the artist.
// Returns { text, artist }. See mdbTitleGuestMarkers in title_definitions.js.
function mdbTitle_takeGuestMarker( text ) {
    var list = ( typeof mdbTitleGuestMarkers !== "undefined" && mdbTitleGuestMarkers ) ? mdbTitleGuestMarkers : [],
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

// mdbTitle_guestConnectorRe
// The mdbTitleGuestConnectors as one regex, with whitespace REQUIRED on both sides: a word
// with a separator behind it ("Secret Cinema Invites, Catwalk") ends the name it belongs to
// and is no verb. null when the list is not loaded.
function mdbTitle_guestConnectorRe() {
    var list = ( typeof mdbTitleGuestConnectors !== "undefined" && mdbTitleGuestConnectors ) ? mdbTitleGuestConnectors : [];

    if( !list.length ) return null;

    return new RegExp( "\\s+\\b(?:" + mdbTitle_wordListAlternation( list ) + ")\\b\\s+", "i" );
}

// mdbTitle_guestIsName
// Whether what stands BEHIND a guest connector is a name at all. The one test that tells the
// verb from the "<Name> Invites" that is a party's or a series' own name: a number counts that
// series' editions ("Yax Invites 166") and a series word names the show ("Input Invites
// Podcast 1"), and in neither is the word a verb standing between two names.
function mdbTitle_guestIsName( guest ) {
    return !!guest && !/^[#.\s]*\d{1,5}$/.test( guest ) && !mdbTitle_hasSeriesWord( guest );
}

// mdbTitle_guestConnectorParts
// One CHUNK cut at the verb: "Bassiani invites Victor" -> [ "Bassiani", "Victor" ]. null where
// the chunk carries no such verb, or where the fences above say the word belongs to a name.
// Shared by the chunk split and the parse, so the units the wiki is asked about are the units
// the title is read as.
function mdbTitle_guestConnectorParts( bit ) {
    var re = mdbTitle_guestConnectorRe(),
        m = re ? re.exec( String( bit || "" ) ) : null;

    if( !m ) return null;

    var host = mdbTitle_trimSeparators( String( bit ).slice( 0, m.index ) ),
        guest = mdbTitle_trimSeparators( String( bit ).slice( m.index + m[0].length ) );

    if( !host || !mdbTitle_guestIsName( guest ) ) return null;

    return [ host, guest ];
}

// mdbTitle_takeGuestConnector
// "Bassiani invites Victor" -> the word is dropped and "Victor" is remembered as the artist,
// the host stays standing where it was. Returns { text, artist }.
// See mdbTitleGuestConnectors in title_definitions.js for why the fences below are what tells
// the verb from the "<Name> Invites" that is a party's own name.
function mdbTitle_takeGuestConnector( text ) {
    var re = mdbTitle_guestConnectorRe(),
        result = { text: text, artist: "" };

    if( !re ) return result;

    var m = re.exec( text );

    if( !m ) return result;

    var before = text.slice( 0, m.index ),
        after = text.slice( m.index + m[0].length ),
        // both sides are read as the BIT they stand in, the way a guest marker reads them:
        // a hyphen sits inside names ("RAW-ARTES") and only a separator run ends one
        hostBits = before.split( mdbTitle_bitSplitRe() ),
        guestBits = after.split( mdbTitle_bitSplitRe() ),
        host = mdbTitle_trimSeparators( hostBits[ hostBits.length - 1 ] ),
        guest = mdbTitle_cleanArtist( guestBits[0] );

    // a host in front of it inside the same chunk - without one the word starts the title and
    // names nobody
    if( !host || !guest ) return result;

    // ... and a real name behind it - see mdbTitle_guestIsName for what that rules out
    if( !mdbTitle_guestIsName( guest ) ) return result;

    // The verb becomes a SEPARATOR, the way a dash wrap does (mdbTitle_dashWrapsToSeparators):
    // the host and the guest are two names, and every rule downstream counts the title's bits
    // to decide which is which. Written as " | " rather than dropped, or the two would glue
    // into one name ("Bassiani Victor") that nobody wrote and the wiki cannot answer about.
    result.artist = guest;
    result.text = mdbTitle_tidySeparators( before + " | " + after );

    return result;
}

// mdbTitle_bitSplitRe
// Splits a title into the bits its separators mark out. A separator run needs whitespace on
// both sides, so hyphenated names ("RAW-ARTES", "пo-русски") stay in one piece. The colon is
// the exception: it is written onto the word in front of it and never turns up inside one.
function mdbTitle_bitSplitRe() {
    return new RegExp( "(?:\\s+[" + mdbTitle_sepInner + "]+|:)\\s+", "g" );
}

// mdbTitle_eventWordRe
// A name carrying one of mdbTitleEventWords ("Horst Festival", "Dekmantel Open Air"), as one
// regex. null when the list is not loaded. "open air" is also typed "open  air", so the blank
// inside a two-word marker reads as "\s+" - the replacement string is inserted verbatim, which
// is why it says "\\s+" and not an escaped backslash.
function mdbTitle_eventWordRe() {
    var words = ( typeof mdbTitleEventWords !== "undefined" && mdbTitleEventWords ) ? mdbTitleEventWords : [];

    if( !words.length ) return null;

    return new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( words ).replace( /\s+/g, "\\s+" ) + ")\\b", "i" );
}

// mdbTitle_endsWithEventWord
// Whether a name ENDS in an event word - "Horst Festival" and "Dekmantel Open Air" do, "Dark
// Skies" and "Utopia" do not. The end is what says the name IS the event rather than merely
// mentioning one ("Festival Mix 12"), and a trailing dot ("Sonar Fest.") is written decoration.
function mdbTitle_endsWithEventWord( text ) {
    var words = ( typeof mdbTitleEventWords !== "undefined" && mdbTitleEventWords ) ? mdbTitleEventWords : [];

    if( !words.length ) return false;

    return new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( words ).replace( /\s+/g, "\\s+" ) + ")\\.?$", "i" )
        .test( String( text || "" ).trim() );
}

// mdbTitle_endsWithSlotWord
// Whether a name ENDS in one of mdbTitleEventSlotWords - "Obstgarten Closing" does, "Summer
// Closing Mix" does not. The end is what says the bit IS the slot rather than merely carrying
// the word, exactly as with an event word above. Something has to stand in FRONT of it: a bare
// "Closing" names no place.
function mdbTitle_endsWithSlotWord( text ) {
    var words = ( typeof mdbTitleEventSlotWords !== "undefined" && mdbTitleEventSlotWords ) ? mdbTitleEventSlotWords : [],
        name = String( text || "" ).trim();

    if( !words.length || !name ) return false;

    var re = new RegExp( "(\\S)\\s+(?:" + mdbTitle_wordListAlternation( words ).replace( /\s+/g, "\\s+" ) + ")\\.?$", "i" );

    return re.test( name );
}

// mdbTitle_venueSpaceBase
// The VENUE inside a place name that names one of its rooms: "Elsewhere Loft" -> "Elsewhere",
// with the word that was taken off. null when the name ends in no such word
// (mdbTitleVenueSpaceWords in title_definitions.js) or when nothing usable is left in front of
// it - "The Loft" names no venue without its word.
// The word is returned as the TITLE spells it, since that is what the "Switch title" chip
// offers back. A leading "the" of the room goes with it ("Elsewhere The Loft"): the article
// belongs to the room, not to the venue in front of it.
// Reading only - whether the base may replace the name is the caller's question, and both
// callers ask the wiki before they act on it.
function mdbTitle_venueSpaceBase( name ) {
    var words = ( typeof mdbTitleVenueSpaceWords !== "undefined" && mdbTitleVenueSpaceWords ) ? mdbTitleVenueSpaceWords : [],
        text = mdbTitle_trimSeparators( String( name || "" ) ),
        m, base;

    if( !words.length || !text ) return null;

    m = new RegExp( "\\s+(?:the\\s+)?(" + mdbTitle_wordListAlternation( words ) + ")\\.?$", "i" ).exec( text );

    if( !m ) return null;

    base = mdbTitle_trimSeparators( text.slice( 0, m.index ) );

    // two letters are an abbreviation as readily as a name, and the lookup that follows would
    // match half the wiki
    if( base.length < 3 ) return null;

    return { base: base, word: m[1] };
}

// mdbTitle_lineupFractionBase
// The ARTIST inside a name that opens on a fraction: "1/2 Faultierdisko" -> "Faultierdisko",
// with the fraction that stands in front of it. null when the name opens on none.
//
// The fraction is a note about the LINE-UP - one half of the duo played this set - and MixesDB
// files the page under the act, which is the name behind it. "1/2 Faultierdisko" will never be
// a category; "Faultierdisko" is one, with 4 mixes.
//
// Reading only, and the one reduction that takes something off the LEFT of a name - so it is
// fenced by the shape rather than by a word list: digits, a slash, digits, a blank. Nothing
// else in a title is written that way, and the callers ask the wiki before they act on it.
function mdbTitle_lineupFractionBase( name ) {
    var text = mdbTitle_trimSeparators( String( name || "" ) ),
        m = /^(\d{1,3}[\/\\]\d{1,3})\s+(\S.*)$/.exec( text );

    if( !m ) return null;

    var base = mdbTitle_trimSeparators( m[2] );

    // two letters are an abbreviation as readily as a name, and the lookup that follows would
    // match half the wiki - the same floor mdbTitle_venueSpaceBase has
    if( base.length < 3 ) return null;

    return { base: base, fraction: m[1] };
}

// mdbTitle_bracketPairRe
// One innermost bracket pair of any kind, with its content. Innermost, so a bracket inside a
// bracket cannot pair up with the wrong one.
function mdbTitle_bracketPairRe() {
    return /[\(\[\{]([^\(\)\[\]\{\}]*)[\)\]\}]/g;
}

// mdbTitle_labelsFromTracklist
// The labels a tracklist credits: "Artist - Title [Label]", "Artist - Title [Label - Cat#]".
// Only a bracket ENDING a line that reads as a track is one - the " - " of "Artist - Title" has
// to stand in front of it - so a "[Free Download]" in the prose around the tracklist is not
// mistaken for a label. See mdbTitleKnownLabels in title_definitions.js for what this is for.
function mdbTitle_labelsFromTracklist( text ) {
    var lines = String( text || "" ).split( /[\r\n]+/ ),
        names = [],
        seen = {},
        i, m, name, cmp;

    for( i = 0; i < lines.length; i++ ) {
        m = /\s[-–—]\s.*\[([^\[\]]+)\]\s*$/.exec( lines[i] );

        if( !m ) continue;

        // "[Label - Cat#]" - the catalogue number is not part of the label's name
        name = mdbTitle_trimSeparators( m[1].split( /\s+[-–—]\s+/ )[0] );
        cmp = mdbTitle_normalizeCompare( name );

        if( !cmp || seen[cmp] ) continue;

        seen[cmp] = true;
        names.push( name );
    }

    return names;
}

// mdbTitle_isLabelName
// Whether a name is a record label or an event organiser rather than an artist - the three
// tests of mdbTitleKnownLabels, cheapest first. fromTracklist is the third one, and is empty
// on a site that hands over no description.
function mdbTitle_isLabelName( name, fromTracklist ) {
    var pattern = ( typeof mdbTitleLabelWords !== "undefined" && mdbTitleLabelWords ) ? mdbTitleLabelWords : /\brecords?\b/i,
        known = ( typeof mdbTitleKnownLabels !== "undefined" && mdbTitleKnownLabels ) ? mdbTitleKnownLabels : [],
        cmp = mdbTitle_normalizeCompare( name ),
        i;

    if( !cmp ) return false;

    pattern.lastIndex = 0;
    if( pattern.test( name ) ) return true;

    for( i = 0; i < known.length; i++ ) {
        if( mdbTitle_normalizeCompare( known[i] ) === cmp ) return true;
    }

    for( i = 0; fromTracklist && i < fromTracklist.length; i++ ) {
        if( mdbTitle_normalizeCompare( fromTracklist[i] ) === cmp ) return true;
    }

    return false;
}

// mdbTitle_isChannelBracket
// Whether a bracket pair OPENING the title holds the channel name: "[selected] podcast 064" on
// the channel "[selected]". There the brackets are how the brand writes itself and the words
// behind them are the rest of the same name, so the pair is neither a chunk of its own nor a
// credit to drop.
// Only at the very start. A bracket at the END of a title is an aside about what stands in
// front of it - "Tooker (SONARA)" credits Tooker's label even on SONARA's own channel - which
// is exactly what mdbTitle_dropLabelBrackets is for.
function mdbTitle_isChannelBracket( inside, offset, username ) {
    if( !username || offset !== 0 ) return false;

    return mdbTitle_normalizeCompare( inside ) === mdbTitle_normalizeCompare( username );
}

// mdbTitle_splitLabelNames
// "SONARA / Crosstown Rebels" -> [ "SONARA", "Crosstown Rebels" ]: the names a bracket credits,
// however the uploader separated them. See mdbTitleLabelSeparators in title_definitions.js.
function mdbTitle_splitLabelNames( content ) {
    var separators = ( typeof mdbTitleLabelSeparators !== "undefined" && mdbTitleLabelSeparators ) ? mdbTitleLabelSeparators : /\s*[,\/|]\s*/,
        parts = String( content || "" ).split( separators ),
        names = [],
        name,
        i;

    for( i = 0; i < parts.length; i++ ) {
        name = mdbTitle_trimSeparators( parts[i] );

        if( name ) names.push( name );
    }

    return names;
}

// mdbTitle_dropLabelBrackets
// "Tooker (SONARA / Crosstown Rebels)" -> "Tooker": a bracket crediting the artist's label(s)
// is none of a mix page title's business. Every name in the bracket has to be a label for it to
// go - see mdbTitleKnownLabels in title_definitions.js for why, and for the three tests.
// Runs before mdbTitle_bracketsToSeparators, i.e. while the brackets are still brackets.
//
// Only a bracket standing BEHIND something is a credit, so a title cannot begin with one. A
// bracket opening the title has nothing to credit and is the NAME of what follows it -
// "(Kompakt) Total Mix 015" is the show, the same shape as "[selected] podcast 064". That is
// also why the channel-name test does not have to be repeated here.
function mdbTitle_dropLabelBrackets( text, description ) {
    var result = { text: String( text || "" ), dropped: [] },
        // the description is only read when a bracket actually has to be decided about
        fromTracklist = null;

    if( !/[\(\[\{]/.test( result.text ) ) return result;

    var out = result.text.replace( mdbTitle_bracketPairRe(), function( all, inside, offset, whole ) {
        if( !mdbTitle_trimSeparators( whole.slice( 0, offset ) ) ) return all;

        var content = mdbTitle_trimSeparators( inside ),
            names,
            i;

        if( !content ) return all;

        if( fromTracklist === null ) fromTracklist = mdbTitle_labelsFromTracklist( description );

        // The whole bracket as ONE name first: a label's own name may hold a separator, spaces
        // and all ("Lost & Found", "aufnahme + wiedergabe"), and splitting one of those leaves
        // two halves that are nothing. Only what is not a label as a whole is read as a list.
        if( mdbTitle_isLabelName( content, fromTracklist ) ) {
            result.dropped.push( content );
            return " ";
        }

        // "SONARA / Crosstown Rebels", "Drumcode, Terminal M" - a bracket may credit several
        names = mdbTitle_splitLabelNames( content );

        if( names.length < 2 ) return all;

        for( i = 0; i < names.length; i++ ) {
            if( !mdbTitle_isLabelName( names[i], fromTracklist ) ) return all;
        }

        result.dropped = result.dropped.concat( names );
        return " ";
    } );

    if( result.dropped.length ) {
        result.text = out.replace( /\s+/g, " " ).trim();
    }

    return result;
}

// mdbTitle_bracketsToSeparators
// "(...)"/"[...]"/"{...}" -> "| ... |": a bracketed chunk is a chunk of its own, exactly like a
// "|"-separated one (see title_definitions.js). Rewritten rather than parsed, so every rule
// that splits a title into bits sees it without knowing brackets exist.
// The channel's own bracket at the head of the title is the exception (mdbTitle_isChannelBracket):
// it stays where it is and becomes the ROUND bracket a wiki title may hold.
function mdbTitle_bracketsToSeparators( text, username ) {
    text = String( text || "" );

    // Innermost pair first, so a bracket inside a bracket cannot pair up with the wrong one -
    // and repeated until nothing changes, or the outer pair of a nested one would stay behind
    var out = text,
        before;

    do {
        before = out;
        out = out.replace( mdbTitle_bracketPairRe(), function( all, inside, offset ) {
            if( mdbTitle_isChannelBracket( inside, offset, username ) ) return "(" + inside + ")";

            return " | " + inside + " | ";
        } );
    } while( out !== before );

    if( out === text ) return text;

    return mdbTitle_tidySeparators( out );
}

// mdbTitle_tidySeparators
// The cleanup every rule needs that writes a "|" into a title blind - the bracket rewrite and
// the dash-wrap rewrite below. A chunk at either end of the title, or one standing next to a
// separator the uploader already typed, leaves an empty chunk behind: two separator runs with
// nothing between them are ONE separator, and one at either end is none.
function mdbTitle_tidySeparators( text ) {
    var sep = "[" + mdbTitle_sepInner + "]",
        out = String( text || "" );

    out = out.replace( new RegExp( "\\s*" + sep + "+\\s*(?:" + sep + "+\\s*)+", "g" ), " | " )
             .replace( new RegExp( "^\\s*" + sep + "+\\s*" ), "" )
             .replace( new RegExp( "\\s*" + sep + "+\\s*$" ), "" );

    return out.replace( /\s+/g, " " ).trim();
}

// mdbTitle_dashWrapsToSeparators
// "3000Grad Festival -Rummelplatz-" -> "3000Grad Festival | Rummelplatz": a part the uploader
// WRAPPED in dashes is a chunk of its own, which is the same thing a bracket says - festivals
// and labels write the stage, the edition or the remix that way at least as often as they
// bracket it. Without this the wrap is no boundary at all: the whole tail rides along as one
// name, is looked up as one and is filed as one ("@ 3000Grad Festival -Rummelplatz"), so
// neither the festival nor what stands in the wrap is ever asked about.
//
// Next to mdbTitle_bracketsToSeparators (1b) and for its reason: what comes out is an ordinary
// chunk, so 1c gets to drop it when it names a stage and every rule below splits the title
// without knowing that dashes can wrap.
//
// What counts as a wrap is narrow on purpose, because "-" is also the everyday separator: the
// opening dash needs whitespace in front and a NON-space behind it, the closing one a non-space
// in front and whitespace (or the end) behind. That is what keeps the "-" of "Artist - Title"
// out, and a title merely ENDING in a dash. Something has to stand in FRONT of the wrap as well:
// a title opening with one has nothing to add to, and there the dashes are how the name itself
// is written ("-Ms- @ Club") - the same reason mdbTitle_dropLabelBrackets leaves a bracket at
// the head of a title alone.
function mdbTitle_dashWrapsToSeparators( text ) {
    text = String( text || "" );

    if( !/[-\u2013\u2014]/.test( text ) ) return text;

    var out = text.replace( /(^|\s)[-\u2013\u2014](\S(?:[\s\S]*?\S)?)[-\u2013\u2014](?=\s|$)/g,
        function( all, before, inside, offset ) {
            // offset is into the ORIGINAL text, which is what the test needs: whether anything
            // stood in front of the wrap cannot depend on a wrap rewritten before it
            if( !mdbTitle_trimSeparators( text.slice( 0, offset ) ) ) return all;

            return " | " + mdbTitle_trimSeparators( inside ) + " | ";
        } );

    if( out === text ) return text;

    return mdbTitle_tidySeparators( out );
}

// mdbTitle_dropBits
// Takes the chunks out that never make it into a MixesDB title - "Part 2", a stage, a camp
// (mdbTitleDroppedBitPatterns). Returns { text, dropped }. The separator runs are kept along with
// the chunks they belong to, so what stays reads exactly as the uploader wrote it.
// Nothing here is ever offered back as an alternative title - see "Never offered back" in
// mdbTitleDroppedBitPatterns (title_definitions.js).
function mdbTitle_dropBits( text ) {
    var patterns = ( typeof mdbTitleDroppedBitPatterns !== "undefined" && mdbTitleDroppedBitPatterns ) ? mdbTitleDroppedBitPatterns : [],
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

// mdbTitle_isCountry
// Whether a name is on mdbTitleCountries (title_definitions.js). Compared with
// mdbTitle_normalizeCompare, so case and the dots of an acronym cost nothing - "U.S.A.",
// "USA" and "usa" are one entry.
function mdbTitle_isCountry( name ) {
    var list = ( typeof mdbTitleCountries !== "undefined" && mdbTitleCountries ) ? mdbTitleCountries : [],
        cmp = mdbTitle_normalizeCompare( name ),
        i;

    if( !cmp ) return false;

    for( i = 0; i < list.length; i++ ) {
        if( mdbTitle_normalizeCompare( list[i] ) === cmp ) return true;
    }

    return false;
}

// mdbTitle_isCity
// Whether a name is on mdbTitleCities (title_definitions.js), compared the same way as the
// countries above. Only ever asked about a whole part of a PLACE GROUP: the list carries no
// codes, and "Berlin" is the city where the title has already said this is a place.
function mdbTitle_isCity( name ) {
    var list = ( typeof mdbTitleCities !== "undefined" && mdbTitleCities ) ? mdbTitleCities : [],
        cmp = mdbTitle_normalizeCompare( name ),
        i;

    if( !cmp ) return false;

    for( i = 0; i < list.length; i++ ) {
        if( mdbTitle_normalizeCompare( list[i] ) === cmp ) return true;
    }

    return false;
}

// mdbTitle_isLocationChunk
// Whether a whole chunk reads as WHERE the artist is from ON ITS OWN: a list of place names
// separated by "," or "/" whose LAST one is a country - "Ibiza/ Dusseldorf, Germany". At least
// TWO parts: a country standing alone is an artist or a mix name as readily as a place
// ("Georgia", "France", "Japan"), so a lone name is not this shape - where it still goes is a
// question of what ELSE the title holds, which mdbTitle_locationChunkFlags below answers. Every
// part has to look like a place NAME - short, no digits - or a sentence that happens to end in a
// country would go with it. See mdbTitleCountries in title_definitions.js.
function mdbTitle_isLocationChunk( chunk ) {
    var parts = String( chunk || "" ).split( /\s*[,\/;]+\s*/ ),
        i;

    if( parts.length < 2 ) return false;
    if( !mdbTitle_isCountry( parts[ parts.length - 1 ] ) ) return false;

    for( i = 0; i < parts.length; i++ ) {
        if( !parts[i] || /\d/.test( parts[i] ) ) return false;
        if( parts[i].split( /\s+/ ).length > 4 ) return false;
    }

    return true;
}

// mdbTitle_locationChunkFlags
// Which of a title's chunks say WHERE the artist is from and go - one true/false per chunk, in
// chunk order. The one reader of both location shapes, so the parse (mdbTitle_dropLocationChunks)
// and the chunk split (mdbTitle_titleChunks) can never disagree about a title.
//
// A place LIST ending in a country goes on its own, see above. A LONE country goes only where
// dropping it still leaves TWO chunks standing: a country alone is an artist or a mix name as
// readily as a place ("Georgia", "France", "Japan"), so "Some Podcast 12 - Georgia" keeps it
// and files the page under Georgia. Standing behind an artist AND an entity it can only be a
// byline about the artist - the same thing the bracketed "(BE)" of "Adjust (BE) @ S.U.N
// Festival" is, and the same thing a fourth group always turns out to be (see "The three
// groups" in title_definitions.js):
//
//     "Colossio @ Melodic Therapy #217 - Mexico"  (channel "CONNECT")
//     ->  2026 - Colossio - Melodic Therapy 217
//
// Which is also the rule's whole point: read as a place, that title had no chunk left for the
// ARTIST but the country, and came out as "2026 - Mexico - Colossio @ Melodic Therapy 217".
//
// The long-form name only, never one of the list's codes: "CAN", "NO", "IT", "IN" and "US" are
// everyday English words, and they are on mdbTitleCountries because a code is only ever read as
// the last part of a place LIST, where nothing else can be. A lone chunk is not that place, so
// it has to say the country in full.
//
// The caller runs this on a NON-live title only: behind the "@" the places are the venue's
// city and country, which MixesDB writes.
function mdbTitle_locationChunkFlags( chunks ) {
    var flags = [],
        lone = [],
        lists = 0,
        bit,
        i;

    for( i = 0; i < chunks.length; i++ ) {
        bit = mdbTitle_trimSeparators( chunks[i] );

        if( bit && mdbTitle_isLocationChunk( bit ) ) {
            flags.push( true );
            lists++;
        } else {
            flags.push( false );
            if( bit && mdbTitle_isCountry( bit ) &&
                mdbTitle_normalizeCompare( bit ).length > 3 ) lone.push( i );
        }
    }

    // dropped left to right, and only while two chunks are left over for the two groups a
    // MixesDB title is made of
    for( i = 0; i < lone.length && chunks.length - lists - ( i + 1 ) >= 2; i++ ) {
        flags[ lone[i] ] = true;
    }

    return flags;
}

// mdbTitle_dropLocationChunks
// Takes the places out of a title - "Miss Luna | Ibiza/ Dusseldorf, Germany" (the bracket
// became a chunk of its own long before this) loses the chunk that only says where Miss Luna
// is from. Which chunks those are is mdbTitle_locationChunkFlags' answer, the one the chunk
// split reads too. Returns { text, dropped: [] }, built exactly like mdbTitle_dropBits.
// The caller guards this with "no @ in the title": on a live recording the places are the
// venue's city and country, which MixesDB writes - see mdbTitleCountries.
function mdbTitle_dropLocationChunks( text ) {
    var result = { text: String( text || "" ), dropped: [] };

    // the separator is captured, so parts reads [ chunk, sep, chunk, sep, chunk, ... ]
    var parts = result.text.split( new RegExp( "((?:\\s+[" + mdbTitle_sepInner + "]+|:)\\s+)" ) ),
        chunks = [],
        kept = [],
        i;

    // one chunk is the whole title - there is nothing to drop it in favour of
    if( parts.length < 3 ) return result;

    for( i = 0; i < parts.length; i += 2 ) {
        chunks.push( mdbTitle_trimSeparators( parts[i] ) );
    }

    var flags = mdbTitle_locationChunkFlags( chunks );

    for( i = 0; i < parts.length; i += 2 ) {
        // each chunk carries the separator that stood in FRONT of it, so dropping a chunk
        // drops that separator with it and never leaves a dangling " | " behind
        if( flags[ i / 2 ] ) {
            result.dropped.push( chunks[ i / 2 ] );
        } else {
            kept.push( { sep: i ? parts[i - 1] : "", text: parts[i] } );
        }
    }

    // a title made of nothing but place lists stays as it is - something wrong beats nothing
    if( !result.dropped.length || !kept.length ) {
        return { text: result.text, dropped: [] };
    }

    result.text = "";
    for( i = 0; i < kept.length; i++ ) {
        result.text += ( i ? kept[i].sep : "" ) + kept[i].text;
    }

    return result;
}

// mdbTitle_dropLocationBrackets
// "Adjust (BE) @ S.U.N Festival" -> "Adjust @ S.U.N Festival": a bracket holding nothing but a
// country - or a place list - says where the artist is FROM, which a mix page title never
// carries. The bracket is what makes a LONE country safe to read as a place: as a chunk of its
// own, "Georgia" or "France" is an artist or a mix name as readily as a country
// (mdbTitle_isLocationChunk demands a place LIST for exactly that reason), but written into a
// bracket behind a name it is a byline about that name.
// Runs while the brackets are still brackets, like the label-credit drop next to it - and
// unlike the chunk drop (3h) it does not step aside on a live title: a bracket standing in
// FRONT of the "@" is glued to the artist, not to the venue. One BEHIND an "@" is left alone -
// there the places are the venue's city and country, which MixesDB writes.
// Only a bracket standing BEHIND something is one - a bracket opening the title names what
// follows it, the same rule the label credit lives by.
function mdbTitle_dropLocationBrackets( text ) {
    var result = { text: String( text || "" ), dropped: [] };

    if( !/[\(\[\{]/.test( result.text ) ) return result;

    var out = result.text.replace( mdbTitle_bracketPairRe(), function( all, inside, offset, whole ) {
        var before = whole.slice( 0, offset );

        if( !mdbTitle_trimSeparators( before ) ) return all;
        if( before.indexOf( "@" ) !== -1 ) return all;

        var content = mdbTitle_trimSeparators( inside );

        if( content && ( mdbTitle_isCountry( content ) || mdbTitle_isLocationChunk( content ) ) ) {
            result.dropped.push( content );
            return " ";
        }

        return all;
    } );

    if( result.dropped.length ) {
        result.text = out.replace( /\s+/g, " " ).trim();
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
 * One request per track, for every name in the title at once, against the wiki's own
 * action=mdbnames module: it matches case-insensitively (the wiki itself is case-sensitive
 * to the first letter, so a verbatim Category: lookup misses "trommel" and "BASSIANI"),
 * resolves redirects, and answers with the category's canonical spelling, its type and its
 * mix count. The answers are cached for the life of the page, so the same channel is never
 * asked about twice.
 *
 * A cache entry is { matches: [ { title, type, mixes, exactCase, recent } ] } - all matches,
 * because one name can be several things at once and only the title's context can pick:
 * "fabric" is the London club (venue) and "Fabric" an artist. "" is both "never asked" and
 * "MixesDB has no such category", which are the same thing to a caller: no help from here.
 * The test fixtures write entries as plain type strings, which every reader below accepts too.
 *
 * "recent" (non-artist matches only - the server does not ship it for artists) holds the
 * titles of recently added mix pages in that category, in the order the server walks them:
 * cl_timestamp, when the page was (re)categorized, not the mix date - so it is neither date
 * order nor complete (a category's newest page can be missing from it). Show it AS IT COMES
 * anyway - never re-sorted by title: that would only trade the server's order for a title
 * order, which mis-files every page whose editor set a sortkey by hand. The sortkey-true
 * list arrives with the page-text learning fetch (mdbPageCreator_recentFetch), which writes
 * it back onto the match. The hints bar's category chips are the reader for both.
 */
var mdbTitle_categoryCache = {},
    mdbTitle_categoryApiUrl = "https://www.mixesdb.com/w/api.php",
    // Every api.php request fired for THIS page, in the order they went out, each
    // { kind, subject, what, url, status }. The reasoning panel prints them as an "API call"
    // link next to the section that reads the answer, so a number that looks wrong can be
    // read where the script read it instead of being rebuilt by hand - which is exactly the
    // work the "1 mix" that MixesDB served for Category:Amplify Series (29 pages, 10 of them
    // in the same answer's "recent") cost before this existed.
    // kind files the call under its section: "mdbnames" -> 3, "recent" -> 5 and 7,
    // "hintRecent" -> the hints bar's per-chip fetch, which 3 lists as well, since that is
    // where the chip's category was answered about. subject is the category a per-category
    // call was fired for, so a section shows ITS call and not every category's.
    // Reset per page with the lookup log: a section whose answer came out of the cache of a
    // track opened earlier shows no link, because no request was made for it.
    mdbTitle_apiCallLog = [],
    // the types that say a name is a SERIES a mix belongs to rather than a person or a place -
    // a name the wiki knows this way is never "(Promo Mix)" and never doubted as a show
    mdbTitle_entityTypes = [ "podcast", "show", "radio", "internet radio" ],
    // what buildMixesdbTitle was last called with, for the one reader that cannot be handed it
    // as a parameter without threading it through every branch: the canonicalization at the
    // single exit, mdbTitle_result
    mdbTitle_knownNow = null,
    // Every name ever asked of the wiki on this page, in the order it was first asked - the
    // "Report" panel reads it to show which candidates were looked up and what came back. The
    // ANSWERS live in mdbTitle_categoryCache; this only remembers the asking, in the original
    // spelling (the cache keys are normalized beyond recognition). Reset per page by
    // mdbPageCreator_resetForNewPage(), unlike the cache, which is deliberately kept.
    mdbTitle_lookupLog = [],
    // Which ROLE each candidate was asked for, decided from the title's shape BEFORE the
    // lookup fires (mdbTitle_categoryCandidates): "artist" | "entity" per normalized name -
    // exactly one, the panel's section 3 files each chip into exactly one candidate column.
    // Reset with the log - the same name can play a different role on the next page.
    mdbTitle_candidateRoles = {},
    // WHERE each candidate came from: normalized name -> { origin, chunk }. origin is
    // "channel" | "channel name" | "curated show" | "chunk" | "number kept" | "title field",
    // chunk holds the chunk a name was reduced from when it was one.
    //
    // The panel's section 3 prints it, because the names asked are NOT the chunks shown: the
    // channel is asked though it stands nowhere in the title, and a chunk is asked without its
    // episode number ("HATE Podcast 496" -> "HATE Podcast"). Without the origin those names
    // read as invented, which is what the panel is there to disprove. Reset with the log.
    mdbTitle_candidateSources = {},
    // The other half of that question: chunks the split produced and the candidates
    // deliberately did NOT ask about, each { text, why }. Rebuilt by every
    // mdbTitle_categoryCandidates() run, since it is nothing but that run's decisions.
    mdbTitle_chunksNotAsked = [];

// mdbTitle_lookupLogEntry
// The log entry for a name, created on first sight. pending/failed/skipped describe the
// REQUEST; what the name turned out to be is read off the cache at render time.
function mdbTitle_lookupLogEntry( name ) {
    var key = mdbTitle_normalizeCompare( name ),
        i;

    if( !key ) return null;

    for( i = 0; i < mdbTitle_lookupLog.length; i++ ) {
        if( mdbTitle_lookupLog[i].key === key ) return mdbTitle_lookupLog[i];
    }

    var entry = { name: name, key: key, pending: false, failed: false, skipped: false };

    mdbTitle_lookupLog.push( entry );

    return entry;
}

// mdbTitle_lookupLogSettle
// The request for these names is over - clear pending, remember a failure. A failed name still
// sits in the cache as "" (asked names are pre-seeded so a dead API is not asked again), so
// only the log can tell "asked and unknown" from "asked and the request died".
function mdbTitle_lookupLogSettle( names, failed ) {
    for( var i = 0; i < names.length; i++ ) {
        var entry = mdbTitle_lookupLogEntry( names[i] );

        if( entry ) { entry.pending = false; entry.failed = failed; }
    }
}

// mdbTitle_apiCallUrl
// The GET URL an $.ajax data block goes out as. Built with jQuery's own $.param, so the link
// opens the request as the browser really made it - a hand-rolled encoder would answer a
// slightly different URL than the one whose answer is on screen, which is the one thing an
// "open the raw answer" link must not do.
function mdbTitle_apiCallUrl( data ) {
    return mdbTitle_categoryApiUrl + "?" + $.param( data );
}

// mdbTitle_noteApiCall
// Records one api.php request and hands the record back, so the caller can settle its status
// in its own handlers. "what" is the line the panel prints behind the link.
function mdbTitle_noteApiCall( kind, subject, what, data ) {
    var call = { kind: kind, subject: subject || "", what: what, url: mdbTitle_apiCallUrl( data ), status: "pending" };

    mdbTitle_apiCallLog.push( call );

    return call;
}

// mdbTitle_apiCalls
// The recorded calls of one kind, oldest first. subject narrows them to the one category a
// per-category kind ("recent", "hintRecent") was fired for; "" means every call of the kind.
function mdbTitle_apiCalls( kind, subject ) {
    var out = [],
        i;

    for( i = 0; i < mdbTitle_apiCallLog.length; i++ ) {
        if( mdbTitle_apiCallLog[i].kind !== kind ) continue;
        if( subject && mdbTitle_apiCallLog[i].subject !== subject ) continue;

        out.push( mdbTitle_apiCallLog[i] );
    }

    return out;
}

// mdbTitle_noteCandidateRole
// Records the ONE role a candidate is asked for - "artist" or "entity". Last write wins:
// the title's bits are recorded after the channel, and an edited title after the first
// build, so the role always describes the latest reading of the name.
function mdbTitle_noteCandidateRole( name, role ) {
    var key = mdbTitle_normalizeCompare( name );

    if( key ) mdbTitle_candidateRoles[key] = role;
}

// mdbTitle_noteChunkNotAsked
// Records a name the lookup deliberately skipped, for the panel's "Not asked:" line. Never
// twice: the edit path runs the lookup again without the candidates having been rebuilt, and
// the same skip listed three times reads as three different chunks.
function mdbTitle_noteChunkNotAsked( text, why ) {
    var key = mdbTitle_normalizeCompare( text ),
        i;

    if( !key ) return;

    for( i = 0; i < mdbTitle_chunksNotAsked.length; i++ ) {
        if( mdbTitle_normalizeCompare( mdbTitle_chunksNotAsked[i].text ) === key ) return;
    }

    mdbTitle_chunksNotAsked.push( { text: text, why: why } );
}

// mdbTitle_noteCandidateSource
// Records where a candidate came from - see mdbTitle_candidateSources.
//
// FIRST write wins, unlike the role's last-write-wins: the panel prints this next to the
// name as it was FIRST asked (that is the spelling the lookup log kept), so the origin has
// to be the one that spelling came from. On a channel whose handle matches a chunk of the
// title the two collide - "thelotradio" and "The Lot Radio" normalize to one key - and the
// chunk taken later would otherwise explain a chip that shows the channel's handle.
function mdbTitle_noteCandidateSource( name, origin, chunk ) {
    var key = mdbTitle_normalizeCompare( name );

    if( !key || Object.prototype.hasOwnProperty.call( mdbTitle_candidateSources, key ) ) return;

    mdbTitle_candidateSources[key] = { origin: origin, chunk: chunk || "" };
}

// mdbTitle_knownAs
// The type MixesDB files a name under: "artist" | "podcast" | "show" | "venue" | "event" |
// "radio" | "internet radio" | "record label" | "". Of several matches this answers with the
// best one (the server ranks) - use mdbTitle_knownMatch to ask for a type specifically.
function mdbTitle_knownAs( known, name ) {
    if( !known || !name ) return "";

    var key = mdbTitle_normalizeCompare( name ),
        entry = Object.prototype.hasOwnProperty.call( known, key ) ? known[key] : "";

    if( !entry ) return "";
    if( typeof entry === "string" ) return entry;

    return ( entry.matches && entry.matches.length ) ? String( entry.matches[0].type || "" ) : "";
}

// mdbTitle_knownMatch
// The best match of one of the given types, or null. This is how "fabric" answers both ways:
// the venue branch asks for a venue and gets the club, an artist reader would get "Fabric".
function mdbTitle_knownMatch( known, name, types ) {
    if( !known || !name ) return null;

    var key = mdbTitle_normalizeCompare( name ),
        entry = Object.prototype.hasOwnProperty.call( known, key ) ? known[key] : "";

    if( !entry ) return null;

    // a fixture's plain type string reads as one match spelled the way the fixture wrote it
    var matches = ( typeof entry === "string" )
        ? [ { title: name, type: entry, mixes: 1, exactCase: true } ]
        : ( entry.matches || [] );

    for( var i = 0; i < matches.length; i++ ) {
        if( !types || types.indexOf( String( matches[i].type || "" ) ) !== -1 ) return matches[i];
    }

    return null;
}

// mdbTitle_knownEntityType
// Whether MixesDB knows the name as a series (podcast/show/radio) - the answer that both
// suppresses "(Promo Mix)" and spares the "not in the known-shows list" doubt.
function mdbTitle_knownEntityType( known, name ) {
    return !!mdbTitle_knownMatch( known, name, mdbTitle_entityTypes );
}

// mdbTitle_matchConfidence
// How strongly ONE lookup answer backs the candidate it was asked for: { percent, reasons }, in
// the shape and the 10-95 band of the title score, so the panel colours both with one function.
// Display only - nothing in the parse reads it. It exists because the reasoning panel's section 3
// asked the reader to weigh "artist, 1 mix" against "podcast, 498 mixes" by eye, and the same
// three things decide it every time: is the wiki's category THIS name, is the name specific
// enough to be worth a hit at all (mixesdb_api_request.md §5 - "Daniel", "Asa", "Black" are all
// real artist categories with one mix each), and how full the category is - the last one worth
// little, since a well-filled category can be the wrong reading just as easily as an empty one.
// matches is the name's WHOLE answer list and index the match being scored: a name the wiki knows
// as several things is a weaker answer for each of them, since only the title's context can pick.
// overruled says a curated channel rule reads these words as something else - the answer may be
// perfectly true about the bare words and still not be what the title means.
function mdbTitle_matchConfidence( name, matches, index, overruled ) {
    var conf = mdbTitle_confidence(),
        list = matches || [],
        match = list[ index || 0 ] || {},
        asked = String( name || "" ).trim(),
        title = String( match.title || "" ),
        askedKey = mdbTitle_normalizeCompare( asked ),
        mixes = match.mixes;

    // 1) is the wiki's category this very name? Only the spelling may differ - the whole point of
    // the lookup is that the wiki knows the casing ("trommel" -> "Trommel"), so a case-only
    // difference is not a doubt.
    if( String( match.matchType || "" ) === "prefix" ) {
        conf.drop( 30, "the name is only the START of \"" + title + "\" - the wiki has no category of the name itself" );
    } else if( askedKey && askedKey === mdbTitle_normalizeCompare( title ) ) {
        // the wiki has exactly this name - nothing to doubt about the spelling
    } else if( askedKey && match.matchedTitle && askedKey === mdbTitle_normalizeCompare( match.matchedTitle ) ) {
        conf.drop( 10, "\"" + asked + "\" is a redirect - the wiki files these mixes under \"" + title + "\"" );
    } else if( askedKey && askedKey === mdbTitle_normalizeCompare( title.replace( /\s*\([^()]*\)\s*$/, "" ) ) ) {
        conf.drop( 5, "the wiki spells it \"" + title + "\" - matched without the qualifier" );
    } else {
        conf.drop( 25, "the wiki's category is spelled \"" + title + "\", not \"" + asked + "\"" );
    }

    // 2) the mix count, worth almost nothing on purpose: it says how well the wiki knows the
    // name, not whether the name is the right reading of these words. A category with 500 mixes
    // can be the wrong word just as easily as one with two - and a LOW count is no doubt either:
    // 7 mixes back a name exactly as 298 do, and docking the smaller answer made the two look
    // like a choice the number had settled (reported 2026-08-20, "UFO95" 80% next to "Dommune"
    // 95%). Only a category holding NOTHING is a small doubt about the name at all.
    if( typeof mixes === "number" && mixes === 0 ) {
        conf.drop( 10, "the category holds no mixes yet" );
    }

    // 3) a single word is what a fragment of a longer name looks like, and with 57,000 artist
    // categories almost every word is somebody. Charged only where the category is all but
    // empty and so cannot vouch for the name - a handful of mixes already says the name is
    // real ("Trommel" with 29 is a name; so is "UFO95" with 7, which this used to dock).
    if( typeof mixes === "number" && mixes < 3 && asked && asked.indexOf( " " ) === -1 ) {
        conf.drop( 20, "\"" + asked + "\" is a single word, and the mix count does not vouch for it" );
    }

    if( list.length > 1 ) {
        conf.drop( 10, "the wiki knows this name as " + list.length + " different things - only the rest of the title can pick" );
    }

    if( overruled ) {
        conf.drop( 30, "a curated channel rule reads these words as something else on this channel" );
    }

    return { percent: conf.percent(), reasons: conf.reasons };
}

// mdbTitle_oneCharApart
// Whether two NORMALIZED names differ in exactly one substituted character - the shape of a
// stylized spelling standing next to the plain one ("ri0d" vs "riod": the 0 the artist writes,
// the O the wiki files under). Same length on purpose: adding or dropping characters quickly
// makes another NAME ("dekmantel" vs "dekmantelfestival"), while swapping one in place is how
// letters get stylized and typos get made.
function mdbTitle_oneCharApart( a, b ) {
    if( !a || !b || a === b || a.length !== b.length ) return false;

    var diff = 0,
        i;

    for( i = 0; i < a.length; i++ ) {
        if( a.charAt( i ) !== b.charAt( i ) && ++diff > 1 ) return false;
    }

    return diff === 1;
}

// mdbTitle_canonicalName
// The wiki's own spelling of a name: "trommel" -> "Trommel", "BASSIANI" -> "Bassiani",
// "Asa 808" -> "ASA 808". Only when the match IS this name (compared normalized) - a fuzzy
// server match like "Truancy Volume" -> "Truancy Volumes" names a different string, and
// rewriting the title to it would change what the uploader said, not how it is spelled.
// A redirect gives the name-for-name test a second chance: for "dekmantel" the canonical
// title is "Dekmantel Festival" (a different name - no rewrite), but the REDIRECT the input
// hit is spelled "Dekmantel", and that casing is the wiki's own for the alias. matchedTitle
// carries it (mdbnames, both modes).
// One exception on that path (reported on "Ri0D."): a redirect whose TARGET is the same name
// up to one substituted character is the wiki correcting a spelling, not naming a different
// thing - "Ri0D." redirects to "RiOD.", and the target is the category the mixes really sit
// in, so it wins over the alias's casing. mdbTitle_oneCharApart is the fence.
// preferTypes ranks same-named matches of different types ("fabric" the venue vs "Fabric"
// the artist); pass nothing to take the server's best.
function mdbTitle_canonicalName( known, name, preferTypes ) {
    if( !name ) return name;

    var match = ( preferTypes && mdbTitle_knownMatch( known, name, preferTypes ) ) ||
                mdbTitle_knownMatch( known, name, null ),
        cmp = mdbTitle_normalizeCompare( name );

    if( !match ) return name;

    if( match.title && mdbTitle_normalizeCompare( match.title ) === cmp ) {
        return match.title;
    }

    if( match.matchedTitle && mdbTitle_normalizeCompare( match.matchedTitle ) === cmp ) {
        if( match.title && mdbTitle_oneCharApart( mdbTitle_normalizeCompare( match.title ), cmp ) ) {
            return match.title;
        }

        return match.matchedTitle;
    }

    return name;
}

// mdbTitle_canonicalArtists
// mdbTitle_canonicalName over every name of a joined artist group, keeping the separators as
// they stand: "leon row & shimon" -> "Leon Row & Shimon".
function mdbTitle_canonicalArtists( known, group ) {
    var parts = String( group || "" ).split( /(\s*[,&]\s*)/ ),
        i;

    for( i = 0; i < parts.length; i += 2 ) {
        parts[i] = mdbTitle_canonicalName( known, parts[i], [ "artist" ] );
    }

    return parts.join( "" );
}

// mdbTitle_stripTrailingNumber
// A trailing episode number or year off a name, because that is how a series name stands in a
// title: "HATE Podcast 496" is filed as "HATE Podcast", "Trommel.251" as "Trommel", "Landjuweel
// Festival 2026" as "Landjuweel Festival". From the RIGHT only - with 57,000+ artist categories
// nearly every common word is one, so shortening a name from the left invents matches ("MOLTO
// IN THE MIX" must not find the show "In The Mix").
function mdbTitle_stripTrailingNumber( name ) {
    return String( name || "" )
        .replace( /[\s.#-]*(?:no\.?|nr\.?|ep\.?|episode|vol\.?|part|pt\.?)?\s*\d{1,4}\s*$/i, "" )
        .trim();
}

// mdbTitle_numberBelongsToName
// Whether a name's trailing number may be part of the NAME rather than the edition it counts.
// Not every "<word> <number>" is a numbered series: "Route 8" and "Asa 808" are artists whose
// category carries the digits, and the strip above would ask the wiki about "Route" - a name
// it does not have, while the one it does have is never asked. Nothing in the words can settle
// that, only the wiki can, so this says when the numbered form is worth one of the ten lookup
// slots NEXT TO the reduced one (mdbTitle_categoryCandidates, mdbPageCreator_entityLookupNames).
//
// It is not, when the title has already said "this counts editions":
//   - a counting word, a "#" or the "." a series writes its edition with introduces the number
//     ("Vol. 3", "DJ Mix #677", "RA.971", "Trommel.234")
//   - the name in front of it carries a series word ("HATE Podcast 498")
//   - the number is a year ("Landjuweel Festival 2026") - no category name carries one
function mdbTitle_numberBelongsToName( name ) {
    var text = String( name || "" ).trim(),
        base = mdbTitle_stripTrailingNumber( text ),
        // what the strip took off, separators and counting word included
        tail = base ? text.slice( base.length ) : "";

    if( !base || base === text ) return false;

    // a letter in the tail is the counting word ("Vol. 3"), the punctuation is the same thing
    // written as a sign - a bare blank or hyphen in front of the digits says nothing
    if( /[a-z]/i.test( tail ) || /[#.]/.test( tail ) ) return false;

    if( /(?:19|20)\d{2}\s*$/.test( tail ) ) return false;

    return !mdbTitle_hasSeriesWord( base );
}

// mdbTitle_categoryCandidates
// The names worth asking about: the channel, and every chunk of the title. The chunks are the
// SHARED split (mdbTitle_titleChunks): brackets read as separators and the series-"by" split
// included, so a venue in brackets ("Tonino (Ritter Butzke)") and the artist behind a "by"
// ("Guestroom 779 by Sascha Sibler") are asked about too - a raw separator-only split kept
// both glued to their neighbours and the second pass never learned what the wiki knows.
// description is the player page's description, when the site has one - the split's label
// test reads the labels the tracklist credits out of it, so a credited label in a bracket is
// no candidate either.
// A channel name a conversion map REPLACES (title_definitions.js) is the one name not asked
// about - the map overrides whatever the wiki would answer for it. The curated show standing
// in its place is asked INSTEAD, in the channel's priority slot: its spelling needs no answer,
// but the mix count the panel annotates does, and so will the recent sibling pages the page
// text is to learn from (roadmap step 4).
function mdbTitle_categoryCandidates( playerTitle, username, description, refDate ) {
    var names = [],
        split = mdbTitle_titleChunks( playerTitle, username, description, refDate ),
        bits = split.chunks,
        // everything from the first "@" on is a place, never a possible artist
        placeFrom = ( typeof split.placeFrom === "number" ) ? split.placeFrom : -1,
        spacedUser = mdbTitle_spaced( username ),
        channelNames = mdbTitle_channelNames( spacedUser ),
        convKey = mdbTitle_usernameConversionKey( spacedUser ),
        convShow = convKey ? mdbTitleUsernameConversions[convKey] : "",
        // tested on the raw spaced title where the parse tests the cleaned one - the words
        // are matched loosely anyway (any case, inner spaces optional), so the difference is
        // a typo in a trigger word, which only costs one spare lookup of the channel name
        seriesConv = mdbTitle_channelSeriesConversion( mdbTitle_spaced( playerTitle ), spacedUser ),
        // a channel mapped to "" is NOT replaced: "no show" leaves the name standing as the
        // likely artist, and the wiki's answer about an artist name is real signal
        channelReplaced = !!convShow || !!seriesConv,
        i;

    // the panel's "why is this chunk not in section 3?" line - this run's decisions alone
    mdbTitle_chunksNotAsked = [];

    // role is what the name is a candidate FOR - "artist", "entity" or "both" - read off the
    // title's shape before the lookup fires. The panel's section 3 sorts its chips by it.
    // origin/chunk say where the name comes from, which the panel prints next to it.
    function take( name, role, origin, chunk ) {
        if( !name ) return;

        // the replaced channel name - the one name the maps already answer for. Not the
        // curated show itself, however much it may READ like the channel name: a channel
        // series entry may well map to the channel's own name ("In The Mix" on "Juno Daily"
        // -> the show "Juno Daily"), and the show is the one name that has to be asked -
        // it is the entity the page is filed under.
        if( channelReplaced && origin !== "curated show" &&
            mdbTitle_normalizeCompare( name ) === mdbTitle_normalizeCompare( spacedUser ) ) return;

        mdbTitle_noteCandidateRole( name, role );
        mdbTitle_noteCandidateSource( name, origin, chunk );

        // asked once, whatever asks: a group member can BE another chunk ("A & B - A"), and a
        // duplicate would burn one of the ten names the request takes. The notes above still
        // run - the role is the latest reading either way.
        for( var t = 0; t < names.length; t++ ) {
            if( mdbTitle_normalizeCompare( names[t] ) === mdbTitle_normalizeCompare( name ) ) return;
        }

        names.push( name );
    }

    // a curated show name can only be the entity
    if( convShow ) take( convShow, "entity", "curated show" );
    if( seriesConv ) take( seriesConv.entity, "entity", "curated show" );

    // The channel is asked as the entity: a channel is first read as the series the mixes
    // belong to. The wiki answering "artist" instead still shows under that one chip (the
    // type badge carries it), and the channel-as-artist branches still read the answer -
    // the role is what the parse EXPECTS, not a verdict.
    take( spacedUser, "entity", "channel" );

    // A channel naming several names is asked about each of them: which one gets used is
    // decided off the title, and the wiki's answer is worth having for whichever it is.
    for( i = 0; channelNames.length > 1 && i < channelNames.length; i++ ) {
        take( channelNames[i], "entity", "channel name" );
    }

    for( i = 0; i < bits.length; i++ ) {
        var bit = mdbTitle_cleanArtist( bits[i] ),
            inPlace = placeFrom !== -1 && i >= placeFrom;

        // The place group's country ("@ S.U.N Festival - Hungary") stays in the title but is
        // not worth a request: a country is never a category, and the 10-name limit is real.
        // The CITY of "@ Venue, City" is the same answer for the same reason - MixesDB writes
        // it into the title and files nothing under it (mdbTitleCities).
        // Behind the "@" only - a lone "Georgia" in front of it is an artist as readily as a
        // country, and its lookup is what says which. A city in front of the "@" is asked for
        // exactly that reason too: "Berlin" is a band as well as a place, and only the answer
        // tells the two apart while the title has not yet said which one it means.
        var placeOnly = ( inPlace && bit )
                      ? ( mdbTitle_isCountry( bit ) ? "country" : mdbTitle_isCity( bit ) ? "city" : "" )
                      : "";

        if( placeOnly ) {
            mdbTitle_noteChunkNotAsked( bits[i],
                "a " + placeOnly + " behind the \"@\" - never a category, and the 10-name request limit is real" );
            continue;
        }

        // The names a joiner strings together, read before the role is decided: "Asa 808 b2b
        // Third Guy" names two artists, and a b2b/&/vs/"," list is a LINE-UP, never a series -
        // whatever the digits in it may score. In front of the "@" only; behind it the same
        // punctuation strings places.
        var members = inPlace ? [] : mdbTitle_splitArtists( bit ),
            // a series word still overrules it, the way it outweighs a number in
            // mdbTitle_seriesScore: "Drumcode Radio Live & Friends 123" is one show's episode,
            // not two acts
            artistList = members.length > 1 && !mdbTitle_hasSeriesWord( bit );

        // behind the "@" everything is a place - an entity candidate, never an artist. In
        // front of it a series-looking bit ("MNMT Recordings", "HATE Podcast") asks as the
        // entity, anything else as the artist.
        var bitRole = inPlace ? "entity"
                    : artistList ? "artist"
                    : mdbTitle_seriesScore( bit ) > 0 ? "entity"
                    : "artist";

        // What the curated channel rule already answered for is not asked about: the words
        // it read ("In The Mix" on "Juno Daily", "DJ MIX #679" on "Dance TV") name the show
        // only together with the channel, so on their own they are either not a category at
        // all or the WRONG one - and the show they name is already a candidate, in the
        // channel's priority slot above. Chunk by chunk, since a consumed phrase can span
        // several ("Juno Daily" + "In The Mix"), and against the number-stripped form too,
        // which is where "DJ MIX #679" turns into the "DJ Mix" that must not be asked.
        var consumed = seriesConv ? mdbTitle_normalizeCompare( seriesConv.found ) : "",
            bitKey = mdbTitle_normalizeCompare( bit ),
            bitBase = mdbTitle_normalizeCompare( mdbTitle_stripTrailingNumber( bit ) );

        if( consumed && ( ( bitKey.length >= 3 && consumed.indexOf( bitKey ) !== -1 ) ||
                          ( bitBase.length >= 3 && consumed.indexOf( bitBase ) !== -1 ) ) ) {
            // ... but a chunk that IS the show needs no "not asked" line: it stands in the
            // list above under its own name, and reading it in both places at once is the
            // panel contradicting itself
            if( bitKey !== mdbTitle_normalizeCompare( seriesConv.entity ) ) {
                mdbTitle_noteChunkNotAsked( bits[i],
                    "the curated channel rule already read it as the show \"" + seriesConv.entity + "\", which is asked instead" );
            }

            continue;
        }

        // a page title that long is not a name, and asking wastes the request
        if( bit && bit.length <= 80 ) {
            // the trailing episode number or year off, because that is how a series name
            // stands in a title - see mdbTitle_stripTrailingNumber
            // ... but never off a line-up: the number at its end belongs to the LAST name in
            // it ("Third Guy b2b Asa 808"), and no episode of a series is written as a b2b
            var stripped = mdbTitle_stripTrailingNumber( bit ),
                reduced = !artistList && stripped && stripped !== bit && stripped.length >= 3;

            // The REDUCED form is the first question: a series category never carries the
            // episode number, so the full "DJ Mix #677" could only answer empty - and finding
            // the episode family behind "DJ Mix" is the row's planned prefix round
            // (row_enrichment.md), never this exact-match lookup.
            // a stripped name asks in the chunk's role: the strip requires a trailing number,
            // and a numbered name reads as a series - which is what bitRole says anyway, since
            // the digit alone already scores
            if( reduced ) {
                take( stripped, bitRole, "chunk", bits[i] );

                // ... and the name WITH its number right behind it, unless the title has said
                // the number counts editions (mdbTitle_numberBelongsToName): "Route 8" and
                // "Asa 808" are artists, their category carries the digits, and asking only
                // "Route" files the page under a category MixesDB does not have while the one
                // it does have is never asked. Second, not first: numbering is the commoner
                // reading of "<name> <number>", and the 10-name cap drops from the end.
                // As the ARTIST - a series category never carries its own episode number, so
                // if this form is a category at all it is a name that ends in digits. Behind
                // the "@" it is a place like everything there.
                if( mdbTitle_numberBelongsToName( bit ) ) {
                    take( bit, inPlace ? "entity" : "artist", "number kept", bits[i] );
                }
            } else {
                take( bit, bitRole, "chunk", bits[i] );
            }

            // ... and the VENUE inside a place that names one of its rooms: "Elsewhere Loft"
            // is no category while "Elsewhere" is, so the base is asked next to the full name
            // - which stays the first question, since a venue really called "... Garden"
            // answers for itself. Behind the "@" only, where the title itself has said these
            // words are the place; in front of it the same words sit inside artist names.
            // See "A room inside a venue is not the venue" in title_definitions.js.
            var space = inPlace
                ? mdbTitle_venueSpaceBase( reduced ? stripped : bit )
                : null;

            if( space ) {
                take( space.base, "entity", "place base", bits[i] );
            }

            // ... and the ACT behind a fraction, the same way round: "1/2 Faultierdisko" is
            // no category while "Faultierdisko" is, and the fraction only says how much of
            // the act was on stage. In FRONT of the "@" only, where a name is a name - and
            // the full form stays the first question, since the wiki could know it.
            var lineup = inPlace ? null : mdbTitle_lineupFractionBase( bit );

            if( lineup ) {
                take( lineup.base, "artist", "line-up base", bits[i] );
            }

            // ... and the names the chunk strings together, when it is long enough to be a
            // chain rather than one name ("Timboletti im Chapeau Club"). AFTER the whole,
            // which keeps the priority order the 10-name cap cuts at: the chunk itself is
            // still the likelier category, the pieces are what saves the lookup when it is
            // not. See "A chain of names is not a name" in title_definitions.js.
            var pieces = mdbTitle_splitNameChain( bit ),
                p;

            for( p = 0; p < pieces.length; p++ ) {
                take( pieces[p], bitRole, "chunk part", bits[i] );
            }

            // ... and the artists a joiner strings together, one by one: "Ri0D. & Jonbot" is
            // no category and never will be, while "Ri0D." is one - and the confirmed name is
            // what settles which bit names who PLAYED (mdbTitle_takeEventTitle's first tier).
            // The whole group stays the first question, since a duo can be a category of its
            // own ("Above & Beyond"). Each member is asked AS WRITTEN, number and all: a name
            // in a line-up is a name, so "Asa 808" is asked as "Asa 808". Artist-role bits
            // only: behind the "@" the names are places, and a bit carrying a series word
            // strings no line-up.
            if( bitRole === "artist" ) {
                var mb;

                for( mb = 0; members.length > 1 && mb < members.length; mb++ ) {
                    if( members[mb].length >= 3 ) {
                        take( members[mb], "artist", "group member", bits[i] );
                    }
                }
            }
        } else if( bit ) {
            mdbTitle_noteChunkNotAsked( bits[i],
                "longer than 80 characters - a page title that long is not a name" );
        }
    }

    return names;
}

// mdbTitle_isStaticName
// Whether a name says nothing about THIS mix - a counting word and its number and nothing else
// ("Episode 72", "Part 2"), matched against mdbTitleStaticNamePatterns. The patterns are
// anchored on both ends, so a real name carrying such a word ("Radio Episode Berlin") is
// untouched; the name is trimmed first, because a chunk can arrive with its separator's blank
// still on it.
function mdbTitle_isStaticName( name ) {
    var text = String( name || "" ).trim(),
        i;

    if( !text ) return false;

    for( i = 0; i < mdbTitleStaticNamePatterns.length; i++ ) {
        if( mdbTitleStaticNamePatterns[i].test( text ) ) return true;
    }

    return false;
}

// mdbTitle_isBareSeriesName
// Whether a name is nothing but a generic series word and the number behind it - "Podcast",
// "Podcast 323", "Mix #12", "Sessions". Such a name belongs to no show: MixesDB has no
// Category:Podcast, no Category:Mix and no Category:Show to file a page under, and the few
// bare words it does answer about answer QUALIFIED - "Mixtape" finds "Mixtape (Lane 8)",
// "Sessions" finds "Sessions (Ronski Speed)" - which are other people's series. So the name
// cannot merely answer empty, it can answer WRONG, and the slot it takes is one of ten.
//
// The word list is mdbTitleShowSuffixWords, the same one that turns a bare channel name into
// the show ("HATE" + "Podcast"): every word on it names a series only TOGETHER with a name,
// which is exactly why it is the list a bare one is tested against. A number behind it counts
// the episode however it is written ("Podcast 323", "Podcast #323", "Podcast.12").
//
// Not the same as mdbTitle_isStaticName: there the word says which episode or part this is
// and nothing is missing, here a NAME is missing - which is why the entity slot grows the
// channel name in front of such a word instead of dropping it (mdbTitle_result).
function mdbTitle_isBareSeriesName( name ) {
    var text = mdbTitle_trimSeparators( String( name || "" ).trim() );

    if( !text ) return false;

    return mdbTitle_isSeriesWordToken( text.replace( /[\s.#:-]*\d{1,5}$/, "" ) );
}

// mdbTitle_lookupCategories
// Asks the wiki's action=mdbnames module what these names are, all in ONE request, then calls
// back with the cache. Always calls back - a failed or blocked request just means the parser
// carries on with what the title alone says, which is what it did before this existed.
function mdbTitle_lookupCategories( names, callback ) {
    logFunc( "mdbTitle_lookupCategories" );

    var wanted = [],
        i, key, name;

    for( i = 0; i < names.length; i++ ) {
        // "#" is illegal in a wiki title, so a name carrying one ("DJ Mix #677") could only
        // ever answer empty - it is asked with the "#" written out. The cache key ignores
        // punctuation anyway, so the answer lands where every reader looks it up.
        // Our own markers come off in the same breath (mdbTitle_dropMarkers): no category is
        // called "... (Promo Mix)", so a caller handing one over is asking about a name that
        // cannot exist. Here rather than in the callers alone, so no round can ask for one.
        name = mdbTitle_dropMarkers( names[i] ).replace( /#/g, " " ).replace( /\s+/g, " " ).trim();
        key = mdbTitle_normalizeCompare( name );

        if( !key ) continue;

        // A name that is nothing but a counting word can only answer empty, so it is not asked
        // and gets no chip in the panel - it was never a candidate
        // (mdbTitleStaticNamePatterns). In the funnel both lookup rounds pass through, like
        // the "#" rewrite above: an edited title's names are covered too.
        if( mdbTitle_isStaticName( name ) ) {
            logVar( "mdbTitle_lookupCategories: static name, not asked", name );
            // ... and the panel says so, on the same "Not asked:" line as the candidate-side
            // skips: every chunk of section 1 is then either a chip in section 3 or a line
            // saying why it is not, and none disappears without a word. Guarded against
            // repeats - the edit path asks again without the candidates having run.
            mdbTitle_noteChunkNotAsked( name, "a counting word - it says which episode or which part this is, and MixesDB files nothing under such names" );
            continue;
        }

        // ... and a name that is nothing but a generic series word ("Podcast", "Mix 12") is
        // not asked either: no page is filed under one, and the bare words the wiki does
        // answer about answer with another show's qualified name. Same funnel, same reason -
        // see mdbTitle_isBareSeriesName.
        if( mdbTitle_isBareSeriesName( name ) ) {
            logVar( "mdbTitle_lookupCategories: bare series word, not asked", name );
            mdbTitle_noteChunkNotAsked( name, "nothing but a generic series word - it names a show only together with a name, so MixesDB has no category of it" );
            continue;
        }

        // the report panel's record of every name asked about on this page - cached ones too,
        // they were asked and their answer is worth showing
        mdbTitle_lookupLogEntry( name );

        if( Object.prototype.hasOwnProperty.call( mdbTitle_categoryCache, key ) ) continue;

        wanted.push( name );
    }

    // the module takes 10 names per request. The list is in priority order - the channel
    // first, then the title bits left to right - so what falls off is the least likely to
    // matter. Not pre-seeded as answered: a second lookup on the same page may still ask.
    if( wanted.length > 10 ) {
        logVar( "mdbTitle_lookupCategories: over the 10-name limit, dropping", wanted.slice( 10 ).join( " | " ) );

        for( i = 10; i < wanted.length; i++ ) {
            var over = mdbTitle_lookupLogEntry( wanted[i] );

            if( over ) over.skipped = true;
        }

        wanted = wanted.slice( 0, 10 );
    }

    if( !wanted.length ) {
        callback( mdbTitle_categoryCache );
        return;
    }

    logVar( "mdbTitle_lookupCategories: asking about", wanted.join( " | " ) );

    // everything asked about counts as answered even if the request dies, so a dead API is
    // asked once per page and not once per rebuild
    for( i = 0; i < wanted.length; i++ ) {
        mdbTitle_categoryCache[ mdbTitle_normalizeCompare( wanted[i] ) ] = "";

        // a name that fell off an earlier over-full request but made it into this one is no
        // longer skipped - it is being asked right now
        var entry = mdbTitle_lookupLogEntry( wanted[i] );

        if( entry ) { entry.pending = true; entry.skipped = false; }
    }

    // the request as an object of its own, so it can be recorded BEFORE it goes out: the
    // reasoning panel's "API call" link in section 3 opens exactly this URL
    var apiData = {
            action: "mdbnames",
            format: "json",
            formatversion: 2,
            origin: "*", // MediaWiki's CORS switch for an anonymous cross-origin read
            names: wanted.join( "|" ),
            // the recent mix pages of each non-artist match ride along in the same request
            // (contract caps this at 10) - the hints bar shows them behind the category chips
            recentlimit: 10
        },
        apiCall = mdbTitle_noteApiCall( "mdbnames", "",
                      wanted.length + ( wanted.length === 1 ? " name" : " names" ) + " in one request: " + wanted.join( " | " ),
                      apiData );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: apiData,
        success: function( data ) {
            apiCall.status = "done";

            var entries = ( data && data.mdbnames ) || [],
                i;

            for( i = 0; i < entries.length; i++ ) {
                var name = String( entries[i].name || "" ),
                    matches = entries[i].matches || [];

                if( !name ) continue;

                mdbTitle_categoryCache[ mdbTitle_normalizeCompare( name ) ] =
                    matches.length ? { matches: matches } : "";

                if( matches.length ) {
                    logVar( "mdbTitle_lookupCategories: " + name,
                            matches.map( function( m ) {
                                return "\"" + m.title + "\" " + m.type + " (" + m.mixes + ")";
                            } ).join( ", " ) );

                    // A match's canonical title is a name the wiki has answered about too -
                    // filed under its own key, so the readers of a respelled title ("Ri0D."
                    // -> "RiOD." via its redirect) find the answer without a second request.
                    // Never over an answer that key already has.
                    for( var mt = 0; mt < matches.length; mt++ ) {
                        var targetKey = matches[mt].title ? mdbTitle_normalizeCompare( matches[mt].title ) : "";

                        if( targetKey && !Object.prototype.hasOwnProperty.call( mdbTitle_categoryCache, targetKey ) ) {
                            mdbTitle_categoryCache[ targetKey ] = { matches: [ matches[mt] ] };
                        }
                    }
                }
            }

            mdbTitle_lookupLogSettle( wanted, false );
            callback( mdbTitle_categoryCache );
        },
        error: function( xhr, status ) {
            apiCall.status = "failed";
            log( "mdbTitle_lookupCategories FAILED (" + status + ") - carrying on with the title alone." );
            mdbTitle_lookupLogSettle( wanted, true );
            callback( mdbTitle_categoryCache );
        }
    });
}

// mdbTitle_groupHasKnownArtist
// Whether MixesDB knows the bit - or any name its joiners string together - as an ARTIST.
// "Ri0D. & Jonbot" is no category and never will be; "Ri0D." is one, and one confirmed name
// vouches for the whole group standing in the artist slot.
function mdbTitle_groupHasKnownArtist( known, group ) {
    if( !known || !group ) return false;

    if( mdbTitle_knownMatch( known, group, [ "artist" ] ) ) return true;

    var names = mdbTitle_splitArtists( group ),
        i;

    for( i = 0; names.length > 1 && i < names.length; i++ ) {
        if( mdbTitle_knownMatch( known, names[i], [ "artist" ] ) ) return true;
    }

    return false;
}

// mdbTitle_joinedArtistBit
// Whether a bit WRITES a line-up: two names strung with an artist joiner ("Ri0D. & Jonbot",
// "A b2b B"). The comma deliberately does not count - "Amsterdam, Netherlands" strings
// places, not artists - and the joiner needs a name on both sides, the same rule
// mdbTitle_splitArtists reads it by.
function mdbTitle_joinedArtistBit( bit ) {
    var joiners = ( typeof mdbTitleArtistSplitJoiners !== "undefined" && mdbTitleArtistSplitJoiners ) ? mdbTitleArtistSplitJoiners : [ "&" ];

    return new RegExp( "\\S\\s+(?:" + mdbTitle_wordListAlternation( joiners ) + ")\\s+\\S", "i" ).test( String( bit || "" ) );
}

// mdbTitle_takeVenueTitle
// A bit of the title is a place MixesDB knows: then this is a live recording, the place is an
// "@", and the bit behind it is the city. Returns { artist, venue, city, isEvent } or null.
//
// An EVENT counts as such a place, and the wiki saying so outweighs the separator the uploader
// typed: "Kollektiv Ost - 3000Grad Festival 3023" is a festival set written with a "-", and
// read off the separator alone it came out as the channel's own Promo Mix. A "-" says almost
// nothing - it separates an artist from a show, a show from an artist and an artist from a
// place alike - while a name MixesDB files as an event says outright that sets are PLAYED
// there. 3f gets there first whenever the name carries an event word; this is the door for
// the events whose name does not say what they are ("Fusion", "Melt").
//
// The bit behind an EVENT is not the city, though: "@ Event, Venue" holds the venue, and a
// name this rule cannot vouch for is better dropped than glued to the place - the same call
// mdbTitle_takeEventTitle makes, which keeps a country and nothing else. isEvent carries that
// difference to the caller.
function mdbTitle_takeVenueTitle( text, known ) {
    var bits = text.split( mdbTitle_bitSplitRe() ),
        cleaned = [],
        venueIndex = -1,
        isEvent = false,
        i;

    if( bits.length < 2 ) return null;

    for( i = 0; i < bits.length; i++ ) {
        cleaned.push( mdbTitle_cleanArtist( bits[i] ) );
    }

    // asked for the venue type specifically, not the best match: "fabric" is a venue AND an
    // artist, and standing in a title next to another name it is the place
    for( i = 0; i < cleaned.length; i++ ) {
        if( cleaned[i] && mdbTitle_knownMatch( known, cleaned[i], [ "venue" ] ) ) { venueIndex = i; break; }
    }

    // the event round is its own pass, so a venue anywhere in the title still wins over an
    // event standing further left - a venue is where the "@" points either way, and the venue
    // reading is the older and the narrower of the two
    for( i = 0; venueIndex === -1 && i < cleaned.length; i++ ) {
        if( cleaned[i] && mdbTitle_knownMatch( known, cleaned[i], [ "event" ] ) ) {
            venueIndex = i;
            isEvent = true;
        }
    }

    if( venueIndex === -1 ) return null;

    // No place is on episode 323. A bit writing a MARKED episode number says the title is an
    // episode of a series, and the two readings cannot both be written - the same call the
    // "@" rule makes ("Colossio @ Melodic Therapy #217", see "#" marks the episode number in
    // title_definitions.js). Here the uploader typed no "@" at all: what suggests the place is
    // the wiki knowing one of the names, and a club that also puts out a podcast is a name it
    // knows either way - "Bassiani invites Victor / Podcast #323" is episode 323 of the club's
    // podcast, not a set played at the club.
    // An EVENT is deliberately left alone, exactly as it is there: an event numbering its
    // editions is still the place a set was played at.
    var markedEpisode = mdbTitle_findEpisode( text, true );

    if( !isEvent && markedEpisode && markedEpisode.marked ) {
        logVar( "mdbTitle_takeVenueTitle: the title numbers an episode, so the known name is no place",
                cleaned[venueIndex] + " | #" + markedEpisode.text );
        return null;
    }

    // Who played there: the bit the wiki backs as an artist first - "Ritter Butzke | Berlin |
    // Tonino & Lanka" has two non-venue bits, and blind position picks the city - then a bit
    // that writes a line-up, then the first bit that is neither the venue nor a city
    // (mdbTitleCities), which is the same reading for the title the wiki answered nothing
    // about. A city is still taken as the last resort: a group of nothing but places was
    // misread long before this line, and declining the venue reading over it helps nobody.
    var artist = "",
        artistIndex = -1,
        artistKnown = false;

    for( i = 0; !artist && i < cleaned.length; i++ ) {
        if( i !== venueIndex && cleaned[i] && mdbTitle_groupHasKnownArtist( known, cleaned[i] ) ) {
            artist = cleaned[i];
            artistIndex = i;
            artistKnown = true;
        }
    }

    for( i = 0; !artist && i < cleaned.length; i++ ) {
        if( i !== venueIndex && cleaned[i] && mdbTitle_joinedArtistBit( cleaned[i] ) ) { artist = cleaned[i]; artistIndex = i; }
    }

    for( i = 0; !artist && i < cleaned.length; i++ ) {
        if( i !== venueIndex && cleaned[i] && !mdbTitle_isCity( cleaned[i] ) ) { artist = cleaned[i]; artistIndex = i; }
    }

    for( i = 0; !artist && i < cleaned.length; i++ ) {
        if( i !== venueIndex && cleaned[i] ) { artist = cleaned[i]; artistIndex = i; }
    }

    if( !artist ) return null;

    // ... and never the bit that already names the artist - "Ritter Butzke | Tonino" must not
    // glue Tonino behind the venue as its city on top of playing there
    var behind = ( venueIndex + 1 !== artistIndex && cleaned[ venueIndex + 1 ] ) || "";

    return {
        artist: artist,
        artistKnown: artistKnown,
        // in the wiki's own spelling - it is the wiki that says this is a venue at all
        venue: mdbTitle_canonicalName( known, cleaned[venueIndex], [ isEvent ? "event" : "venue" ] ),
        // "@ Ritter Butzke, Berlin" - Help:Add_a_new_mix_page puts the city behind the venue.
        // Behind an EVENT only a country is kept, see above
        city: ( isEvent && !mdbTitle_isCountry( behind ) ) ? "" : behind,
        isEvent: isEvent
    };
}

// mdbTitle_nameOutOfChain
// The NAME inside a chunk that strings one together with a place word - "Timboletti im Chapeau
// Club" -> "Timboletti". "" when the chunk is no such chain, or when nothing backs the front
// piece as the name.
//
// Backed means: the piece is the channel this was uploaded on, or MixesDB knows it as an
// artist. Without one of the two this would be guessing which half of a chunk nobody
// understood is the name - and guessing wrong loses a name the title really carried, which is
// worse than carrying two. The channel counts on its own because the first pass has no wiki
// answers yet and would otherwise show a different name than the second.
//
// The FRONT piece only: a place word says what follows it is the place, so the name is what
// stands in front of it.
function mdbTitle_nameOutOfChain( name, known, username ) {
    var pieces = mdbTitle_splitNameChain( name, true );

    if( pieces.length < 2 ) return "";

    var front = pieces[0],
        cmp = mdbTitle_normalizeCompare( front );

    if( username && cmp === mdbTitle_normalizeCompare( mdbTitle_spaced( username ) ) ) return front;
    if( mdbTitle_knownMatch( known, front, [ "artist" ] ) ) return front;

    return "";
}

// mdbTitle_takeEventTitle
// A live recording at an event: "<artists> | <event> <year>" - or "<artists> @ <event>"
// standing glued in one bit, where the "@" itself names the artist.
// Returns { artist, event, year, city, chainDropped } or null when the title is not one; city
// is the country standing right behind the event, kept as the place group's second part.
// The "Part 2"/stage chunks such a title carries are already gone - mdbTitle_dropBits takes
// them out of every title, not just out of this one.
//
// known and username are only read for the artist bit: where that bit is a name and the place
// inside the event it was played at ("Timboletti im Chapeau Club"), the place goes the way
// every other non-event bit of such a title goes - the event is where the set was played, and
// MixesDB carries no corner of its site. chainDropped is what was cut off, for the trace.
function mdbTitle_takeEventTitle( text, known, username ) {
    var eventWords = ( typeof mdbTitleEventWords !== "undefined" && mdbTitleEventWords ) ? mdbTitleEventWords : [],
        bits = text.split( mdbTitle_bitSplitRe() ),
        kept = [],
        i;

    // one bit cannot hold both an artist and an event
    if( !eventWords.length || bits.length < 2 ) return null;

    for( i = 0; i < bits.length; i++ ) {
        var bit = mdbTitle_cleanArtist( bits[i] );

        if( bit ) kept.push( bit );
    }

    var eventRe = mdbTitle_eventWordRe(),
        eventIndex = -1;

    for( i = 0; i < kept.length; i++ ) {
        if( eventRe.test( kept[i] ) ) { eventIndex = i; break; }
    }

    if( eventIndex === -1 ) return null;

    var event = kept[eventIndex],
        artist = "";

    // An "@" inside the event bit already answers who the artist is: "Adjust @ S.U.N
    // Festival" says Adjust plays there, and no other bit may override that - the bits
    // around it are the series and leftovers ("MNMT Recordings : Adjust @ S.U.N Festival
    // - Hungary"). Only when the event word stands BEHIND the "@" - in "<event> @ <place>"
    // the front is no artist. Non-greedy, so the FIRST "@" splits and a second one stays
    // in the event, where the one-" @ "-per-title fold reads it as its ",".
    var atSplit = /^(.*?\S)\s*@\s*(\S.*)$/.exec( event );

    if( atSplit && eventRe.test( atSplit[2] ) ) {
        artist = mdbTitle_trimSeparators( atSplit[1] );
        event = mdbTitle_trimSeparators( atSplit[2] );
    }

    // Otherwise the bits around the event, in order of what vouches for them: the bit the
    // wiki backs as an artist first - "<event> - Leipzig - Ri0D. & Jonbot" has two, and blind
    // position picks the city - then a bit that writes a line-up ("A & B"), then the first
    // bit that is not the event.
    var artistIndex = -1,
        artistKnown = false;

    for( i = 0; !artist && i < kept.length; i++ ) {
        if( i !== eventIndex && mdbTitle_groupHasKnownArtist( known, kept[i] ) ) {
            artist = kept[i];
            artistIndex = i;
            artistKnown = true;
        }
    }

    for( i = 0; !artist && i < kept.length; i++ ) {
        if( i !== eventIndex && mdbTitle_joinedArtistBit( kept[i] ) ) { artist = kept[i]; artistIndex = i; }
    }

    for( i = 0; !artist && i < kept.length; i++ ) {
        if( i !== eventIndex ) { artist = kept[i]; artistIndex = i; }
    }

    if( !artist ) return null;

    // "Timboletti im Chapeau Club" is the artist and a corner of the festival site
    var chainDropped = "",
        nameOnly = mdbTitle_nameOutOfChain( artist, known, username );

    if( nameOnly && nameOnly !== artist ) {
        chainDropped = artist;
        artist = nameOnly;
    }

    // The bit right BEHIND the event says where it is: MixesDB writes the place group as
    // "@ Event, Country" the same way it writes "@ Venue, City", so the country stays in the
    // title ("... @ S.U.N Festival, Hungary"). Countries only - a name this rule cannot
    // vouch for is better dropped than glued to the place - and never the bit that already
    // names the artist.
    var cityIndex = eventIndex + 1,
        city = ( cityIndex < kept.length && cityIndex !== artistIndex &&
                 mdbTitle_isCountry( kept[cityIndex] ) ) ? kept[cityIndex] : "";

    // "Landjuweel Festival 2026" -> the event is "Landjuweel Festival", the year is the date
    var year = "",
        m = /^\s*((?:19|20)\d{2})\b\s*|\s*\b((?:19|20)\d{2})\s*$/.exec( event );

    if( m ) {
        year = m[1] || m[2];
        event = ( event.slice( 0, m.index ) + " " + event.slice( m.index + m[0].length ) ).replace( /\s+/g, " " ).trim();
    }

    // An event is a PLACE, not a series. "Festival Mix 12 - Some DJ" carries the word but is a
    // podcast: once the year is off, an event name has neither a series word nor a number left
    // in it, while "Festival Mix 12" has both.
    if( !event || mdbTitle_seriesScore( event ) > 0 ) return null;

    return { artist: artist, artistKnown: artistKnown, event: event, year: year, city: city, chainDropped: chainDropped };
}

// mdbTitle_takeSlotEventTitle
// A live recording at an event whose NAME says nothing about being one - the two hints of
// mdbTitleEventSlotWords, which only count together:
//
//     "Bee Lincoln - Rote Dichte 2026 - Obstgarten Closing"
//     ->  { artist: "Bee Lincoln", slot: "Obstgarten Closing", event: "Rote Dichte", year: "2026" }
//
// Returns null when the title is not one. Exactly three bits: the artist, the slot and the
// event. With a fourth there is more than one way to pair them up, and the whole reading rests
// on two hints that each mean little on their own - so a guess on top of them is one too many.
//
// The year is taken OFF the event name, like every other gig year: MixesDB writes it in front
// of the title and never twice.
function mdbTitle_takeSlotEventTitle( text ) {
    var bits = String( text || "" ).split( mdbTitle_bitSplitRe() ),
        kept = [],
        i;

    for( i = 0; i < bits.length; i++ ) {
        var bit = mdbTitle_cleanArtist( bits[i] );

        if( bit ) kept.push( bit );
    }

    if( kept.length !== 3 ) return null;

    var slotIndex = -1,
        eventIndex = -1,
        dated = [];

    for( i = 0; i < kept.length; i++ ) {
        dated[i] = mdbTitle_takeTrailingYear( kept[i] );

        if( slotIndex === -1 && mdbTitle_endsWithSlotWord( kept[i] ) ) slotIndex = i;
    }

    if( slotIndex === -1 ) return null;

    for( i = 0; i < kept.length; i++ ) {
        if( i !== slotIndex && dated[i].year ) { eventIndex = i; break; }
    }

    if( eventIndex === -1 ) return null;

    var event = mdbTitle_trimSeparators( dated[eventIndex].text ),
        artist = "";

    for( i = 0; !artist && i < kept.length; i++ ) {
        if( i !== slotIndex && i !== eventIndex ) artist = kept[i];
    }

    // An event is a PLACE, not a series - the same guard mdbTitle_takeEventTitle has. Once the
    // year is off, an event name carries neither a series word nor a number, while a
    // "Podcast 12" carries both, and a title naming a podcast is no live recording.
    if( !artist || !event || mdbTitle_seriesScore( event ) > 0 ) return null;

    return { artist: artist, slot: kept[slotIndex], event: event, year: dated[eventIndex].year };
}

// mdbTitle_joinArtists
// First artist + the ones found behind "w/", with the joiner from title_definitions.js.
function mdbTitle_joinArtists( artist, extraArtists ) {
    if( !artist || !extraArtists || !extraArtists.length ) return artist;

    var joiner = ( typeof mdbTitleExtraArtistJoiner !== "undefined" && mdbTitleExtraArtistJoiner ) ? mdbTitleExtraArtistJoiner : ", ";
    return [ artist ].concat( extraArtists ).join( joiner );
}

// mdbTitle_dropMarkers
// Takes OUR OWN markers off a name: the " (Promo Mix)" behind the last group and the
// " (Live PA)" behind an artist are things WE write into a title to say something about the
// recording - no MixesDB category carries them, and nobody is called that. Everything that
// reads a name back out of a finished title runs through here, the wiki lookup included:
// asking about "Unedited (Promo Mix)" could only answer empty and would burn one of the ten
// names a request takes, while "Unedited" is the name that can actually be known.
function mdbTitle_dropMarkers( name ) {
    return String( name || "" ).replace( /\s*\(\s*(?:Promo Mix|Live\s*P\.?\s*A\.?)\s*\)\s*$/i, "" );
}

// mdbTitle_splitArtists
// The mirror of mdbTitle_joinArtists, and the one that has to hold for titles WE did not build:
// the artist group of a finished title -> the names in it, one per MixesDB artist category.
// See mdbTitleArtistSplitJoiners for the joiners and why the list is longer than what the
// builder itself writes.
function mdbTitle_splitArtists( artistField ) {
    var joiners = ( typeof mdbTitleArtistSplitJoiners !== "undefined" && mdbTitleArtistSplitJoiners ) ? mdbTitleArtistSplitJoiners : [ "&" ],
        // "," splits with or without whitespace around it. A WORD joiner needs whitespace on
        // BOTH sides, or the "x" of "Maxxi Soundsystem" and the "b2b" of a name would split a
        // single artist in two.
        re = new RegExp( "\\s*,\\s*|\\s+(?:" + mdbTitle_wordListAlternation( joiners ) + ")\\s+", "gi" ),
        parts = String( artistField || "" ).split( re ),
        names = [],
        name,
        i;

    for( i = 0; i < parts.length; i++ ) {
        // no episode stripping on an artist: "Asa 808" is a name, and the number belongs to it.
        // The "(Promo Mix)" behind the last one and the "(Live PA)" behind a name are markers,
        // not part of the name - the category is the bare name.
        name = mdbTitle_trimSeparators( mdbTitle_dropMarkers( parts[i] ) );

        if( name ) names.push( name );
    }

    return names;
}

// mdbTitle_titleCategories
// A finished MixesDB title -> { year, artists, entity, entities }, i.e. what the wiki files the
// page under. Read off the TITLE and not off what the parser had in mind: the suggestion is
// editable, and a corrected title has to take its categories with it. Which is also why this
// parses rather than remembers - the title it is handed may never have been built here at all.
//
// entity is the ONE name the parse files the page under; entities is every name the entity slot
// OFFERS, in title order and the picked one among them. A place group can name two things that
// both have a category - "@ Anjunadeep, Ritter Butzke, Berlin" is the party at the club, and
// MixesDB files such a page under both - while the city in the same group has none. Which of
// the offered names really is a category is not decided here but asked of the wiki
// (mdbPageCreator_entityCategoriesFor); the city is the one part that does not need asking,
// since a city has no category to find (mdbTitleCities).
function mdbTitle_titleCategories( title ) {
    var text = String( title || "" ),
        bits = text.split( mdbTitle_bitSplitRe() ),
        year = ( text.match( /^\s*(\d{4})/ ) || [ "", "" ] )[1],
        artistField = bits[1] || "",
        entity = bits[2] || "",
        places = [];

    // A live recording has no third bit: what stands behind the "@" is the entity there. The
    // FIRST place group alone, even in an edited title still holding a second " @ ": a MixesDB
    // title never carries the joiner twice.
    var atParts = artistField.split( /\s+@\s+/ );

    if( atParts.length > 1 ) {
        artistField = atParts[0];

        if( !entity ) {
            entity = mdbTitle_placeGroupEntity( atParts[1] );
            places = mdbTitle_placeGroupNames( atParts[1] );
        }
    }

    // The marker comes off the entity as well as off the artists: "Unedited (Promo Mix)" is
    // filed under Promo Mix and the name in the slot is "Unedited". Which reading of the title
    // it is - the page's categories, the report, the lookup of an edited title - it is the
    // bare name every time.
    var name = mdbTitle_trimSeparators( mdbTitle_dropMarkers( entity ) ),
        entities = places.length ? places : ( name ? [ name ] : [] ),
        key = mdbTitle_normalizeCompare( name ),
        have = false,
        i;

    for( i = 0; key && i < entities.length; i++ ) {
        if( mdbTitle_normalizeCompare( entities[i] ) === key ) { have = true; break; }
    }

    // the picked name is always among them: mdbTitle_placeGroupEntity falls back to the first
    // part where the whole group is slots, and a slot is no name mdbTitle_placeGroupNames keeps
    if( key && !have ) entities.unshift( name );

    return {
        year: year,
        artists: mdbTitle_splitArtists( artistField ),
        entity: name,
        entities: entities
    };
}

// mdbTitle_placeGroupNames
// The names a live title's place group offers as categories, in title order: every part of it
// except the ones that name no thing at all. A SLOT is such a part - "@ Obstgarten Closing,
// Rote Dichte" is the closing set of an event, and mdbTitle_placeGroupEntity steps over it for
// the same reason - and so is the group's COUNTRY, which MixesDB writes in a title and files
// nothing under (mdbTitleCountries; a country is not sent to the lookup anywhere else either).
//
// A CITY is the third kind of part that names no thing: "@ Ritter Butzke, Berlin" is the club
// and the city it stands in, and MixesDB has a category for the club alone (mdbTitleCities).
// Nothing about the WORDS tells the two apart, which is why this was the wiki's answer to give
// until the list existed - and still is for a city the list does not carry: it stands in the
// offered names, and "no category of this name" keeps it out one step later
// (mdbPageCreator_entityCategoriesFor). The list only spares the question.
function mdbTitle_placeGroupNames( group ) {
    var parts = String( group || "" ).split( "," ),
        out = [],
        i, name;

    for( i = 0; i < parts.length; i++ ) {
        name = mdbTitle_trimSeparators( mdbTitle_dropMarkers( parts[i] ) );

        if( !name || mdbTitle_endsWithSlotWord( name ) ||
            mdbTitle_isCountry( name ) || mdbTitle_isCity( name ) ) continue;

        out.push( name );
    }

    return out;
}

// mdbTitle_placeGroupEntity
// Which part of a live title's place group the page is filed under. The FIRST part as a rule -
// "@ Wire Club, Leeds" is filed under Wire Club and "@ 3000Grad Festival, Utopia" under the
// festival - because MixesDB writes the group from the outside in, the bigger name first.
//
// Unless another part NAMES AN EVENT: "Dave Huismans @ Dark Skies, Horst Festival" is the group
// written the other way round, the stage first, and the festival is the name the page belongs
// under either way. Only an event word overrules the order - a city or a venue behind the comma
// says nothing about which of the two is the bigger name, so there the order stays the answer.
//
// A SLOT word says the same thing from the other end: "@ Obstgarten Closing, Rote Dichte" is
// the closing set of an event, and a slot is no name to file a page under, so the first part
// steps aside and the next one answers. Never the last word - a group whose parts are all
// slots has nothing better to offer than its first.
//
// A CITY or a COUNTRY steps aside for good, and is the one thing that can leave this with
// NOTHING to answer: the entity is the one name a page is filed under whether or not the wiki
// has it - that is what gives a venue new to MixesDB its category - so a group of nothing but
// "@ Berlin" would create the very category that must not exist. Filing under nothing is what
// a title naming no venue says (mdbTitleCities, mdbTitleCountries).
function mdbTitle_placeGroupEntity( group ) {
    var parts = String( group || "" ).split( "," ),
        eventRe = mdbTitle_eventWordRe(),
        i, part;

    for( i = 0; eventRe && i < parts.length; i++ ) {
        part = mdbTitle_trimSeparators( parts[i] );

        if( part && eventRe.test( part ) ) return part;
    }

    for( i = 0; i < parts.length; i++ ) {
        part = mdbTitle_trimSeparators( parts[i] );

        if( part && !mdbTitle_endsWithSlotWord( part ) &&
            !mdbTitle_isCity( part ) && !mdbTitle_isCountry( part ) ) return part;
    }

    // the all-slots fallback: a slot is a name written badly, so the group's first part still
    // beats nothing - a city is no name at all, and nothing is what a group of them answers
    for( i = 0; i < parts.length; i++ ) {
        part = mdbTitle_trimSeparators( parts[i] );

        if( part && !mdbTitle_isCity( part ) && !mdbTitle_isCountry( part ) ) return part;
    }

    return "";
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

// mdbTitle_isSeriesWordToken
// Whether a single token IS a series word off mdbTitleShowSuffixWords ("Radioshow", "Mix."),
// compared normalized so case and a trailing dot cost nothing. The whole token only - the
// "podcast" inside "IT.podcast.s15e06" is part of an ID, not a word of its own.
function mdbTitle_isSeriesWordToken( token ) {
    var words = mdbTitle_showSuffixWords(),
        cmp = mdbTitle_normalizeCompare( token ),
        i;

    if( !cmp ) return false;

    for( i = 0; i < words.length; i++ ) {
        if( mdbTitle_normalizeCompare( words[i] ) === cmp ) return true;
    }

    return false;
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
        hasUpper = s.toLowerCase() !== s,
        // the bit mixes its cases ONLY because of a series word - decided below, and what
        // makes "UNCODED BIRTHDAY Radioshow" a shouted name rather than a deliberate spelling
        mixedBySeriesWords = false;

    // mixed case = a deliberate spelling; no case at all = no letters to fix
    if( hasLower === hasUpper ) {
        if( !hasUpper ) return s;

        // Judged once more with the series words (and the caseless digit tokens) set aside:
        // the generic word off the curated list is typed in Normal Case by habit even inside
        // a shouted name, so it says nothing about how the NAME is cased. Uniform without
        // them means the name is shouted and the word only rode along - the shouted words
        // are re-cased below and the set-aside tokens keep their typed case ("Radioshow"
        // stays "Radioshow", the "MIx" of "E-L-E-C-T-R-O MIx" stays "MIx"). Anything still
        // mixed without them is a deliberate spelling as before ("Nina ØDB", "MIT DIR '23
        // Warm Up Session") and stays verbatim.
        var tokens = s.split( /\s+/ ),
            rest = "",
            t;

        for( t = 0; t < tokens.length; t++ ) {
            if( !/\d/.test( tokens[t] ) && !mdbTitle_isSeriesWordToken( tokens[t] ) ) rest += tokens[t];
        }

        var restLower = rest.toUpperCase() !== rest,
            restUpper = rest.toLowerCase() !== rest;

        if( restLower === restUpper ) return s;

        mixedBySeriesWords = true;
    }

    var keepUpper = ( typeof mdbTitleNormalCaseKeepUpper !== "undefined" && mdbTitleNormalCaseKeepUpper ) ? mdbTitleNormalCaseKeepUpper : [],
        keepLower = ( typeof mdbTitleNormalCaseKeepLower !== "undefined" && mdbTitleNormalCaseKeepLower ) ? mdbTitleNormalCaseKeepLower : [],
        keepUpperCmp = [],
        keepLowerCmp = [],
        i;

    for( i = 0; i < keepUpper.length; i++ ) keepUpperCmp.push( mdbTitle_normalizeCompare( keepUpper[i] ) );
    for( i = 0; i < keepLower.length; i++ ) keepLowerCmp.push( mdbTitle_normalizeCompare( keepLower[i] ) );

    return s.replace( /\S+/g, function( word, offset ) {
        // the token set aside above keeps its typed case - it is the one word of the bit
        // that was NOT shouted, and re-casing it would rewrite exactly the word that needed
        // no fixing. Only in the mixed-by-series-words reading: a bit uniform throughout
        // ("MOLTO IN THE MIX") re-cases its series word with everything else.
        if( mixedBySeriesWords && mdbTitle_isSeriesWordToken( word ) ) return word;

        // "XLR8R700", "808", "2026" - an ID or a number, not a word to re-case
        if( /\d/.test( word ) ) return word;

        // No vowel, so it cannot be a word - it is an abbreviation and keeps its spelling:
        // "DSS 139" stays "DSS 139", and "NINA ØDB" becomes "Nina ØDB" rather than "Nina Ødb".
        // This is what saves the acronyms that are not worth listing one by one.
        if( !mdbTitle_hasVowel( word ) ) return word;

        // The channel spelling itself out in initials - "IA Podcast" on the channel
        // "Illegal Alien Records". An acronym that happens to hold a vowel reads exactly like a
        // shouted word ("IA" -> "Ia"), and the channel name is the one place that says which it
        // is, so it is asked before the word lists below.
        if( mdbTitle_isChannelInitials( word ) ) return word;

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

// How the CHANNEL spells its own name, but only when the title spells it EXACTLY the same way -
// see "Which spelling of the channel name to use" in title_definitions.js. Set once per
// suggestion in buildMixesdbTitle, and "" whenever the two spellings differ, which is what
// keeps "Yoyaku Instore Sessions" on the channel "yoyaku" out of it.
var mdbTitle_channelSpelling = "";

// The channel name's initials, e.g. "Illegal Alien Records" -> "IAR". Set once per suggestion
// in buildMixesdbTitle, next to mdbTitle_channelSpelling and for the same reason: Normal Case
// runs deep inside the parser and cannot be handed the channel through every caller.
var mdbTitle_channelInitials = "";

// The channel name those initials were made of, exactly as the parser used it (after
// mdbTitle_pickChannelName, so a channel listing several names contributes the one the title
// picked). Set once per suggestion next to the initials, read at the single exit: an entity
// written as the initials plus a number is the channel's series abbreviating itself, and
// the exit asks the wiki about the full name (mdbTitle_expandChannelAcronym).
var mdbTitle_channelUsed = "";

// How the TITLE spells that channel name, where it names it at all - "DIRTYBIRD" comes back
// as "Dirtybird" from "Dirtybird Radio 540", see "Which spelling of the channel name to use"
// in title_definitions.js. The same answer mdbTitle_takeShowOutOfTitle gives the branches, set
// once per suggestion so the single exit can use it too: an entity that is nothing but a
// series word grows this name in front of it (mdbTitle_growBareSeriesEntity), and it must not
// come out shouted where the title itself writes the brand properly.
var mdbTitle_channelShown = "";

// Whether this upload says the set was a LIVE PA - the act performing its own tracks - and
// where it said so. Set once per suggestion in buildMixesdbTitle, read in mdbTitle_result,
// which writes " (Live PA)" behind the artist's name. Two flags because the two sources carry
// different weight: the TITLE saying it is the uploader labelling this very set, the
// DESCRIPTION saying it may describe another act on the bill - so the description only counts
// on a title that reads as a live recording, and it costs confidence there.
var mdbTitle_livePaTitle = false;
var mdbTitle_livePaDescription = false;

// Whether the TITLE said "live" somewhere the parse consumed it - a "Live at"/"Live@" read
// as the " @ " joiner, a trailing "(Live)"/"*live" dropped as decoration. The word alone
// does not settle HOW the set was played (a DJ set is announced the same way), so it never
// writes the "(Live PA)" marker - but it is exactly the signal that makes the Live PA
// reading worth OFFERING, which is what mdbTitle_result's alternatives do with it. Only the
// words actually saying "live" set it: "dj set"/"dj mix" sit on the same joiner list and
// say the opposite. Set once per suggestion off mdbTitle_applyJoiners' liveSaid return.
var mdbTitle_liveWordSeen = false;

// Whether a branch DECIDED AGAINST "(Promo Mix)" on a title that reads as the artist's own
// mix (the channel known as an artist, a numbered series naming nobody) - the marker was a
// guess it refused to stack onto another guess. Set once per suggestion in the branch that
// decided, read in mdbTitle_result: it is what offers the promo reading as a switchable
// alternative instead of losing the decision silently.
var mdbTitle_promoDeclined = false;

// The room word mdbTitle_result took off the place group - { word, place, full }, null on
// every other title. "Elsewhere Loft" is no category, "Elsewhere" is the venue, so the word
// went; the reading is still worth OFFERING, and this is what mdbTitle_result's alternatives
// hand to the hints bar's "Switch title" chip. Set once per suggestion, in the reduction
// itself, and only there - the first pass runs without the wiki's answers and never reduces.
var mdbTitle_placeWordDropped = null;

// mdbTitle_atEpisodeRead
// Whether the title wrote an "@" in front of a "#"-numbered episode and the series reading won
// it (mdbTitle_atEpisodeSeparator), false on every other title. Two things read it, and both
// are about the half of the title that was NOT written: the date step, which claims the year
// alone the way it does for every set that was played somewhere, and mdbTitle_result, which
// offers the live reading as a "Switch title" chip. Set once per suggestion, by the BUILD's
// call only - the chunk split runs the same rewrite, and a signal about the SUGGESTION belongs
// to the build alone, exactly like mdbTitle_liveWordSeen above.
var mdbTitle_atEpisodeRead = false;

// mdbTitle_locationDropped
// The LONE country 3h took out of a non-live title - "Mexico", "" on every other title. Kept
// for the live chip above, which puts it back where a live title carries it: behind the place,
// as the place group's own country ("@ Melodic Therapy 217, Mexico"). A place LIST is not kept:
// it is a byline in any reading, never a place group MixesDB writes.
var mdbTitle_locationDropped = "";

// mdbTitle_slotPartRead
// The slot the 3g2 branch read into a place group: { slot, event }, null on every other title.
// "Obstgarten Closing" is where inside the night the set was played, and the page files under
// the event either way - so the group without it ("@ Rote Dichte") is a reading worth OFFERING,
// which is what mdbTitle_result hands to the hints bar's "Switch title" chip. Set once per
// suggestion, in the branch itself.
var mdbTitle_slotPartRead = null;

// mdbTitle_monthOnlyName
// The month a title dated itself with and NOTHING else - "August" out of "@ August 2026" -
// or "" on every other title. What it is for is the name such a mix gets: a self-released mix
// whose title is only its month is written "<Month> Promo Mix" on MixesDB
// ("2011-08 - Aeroplane - August Promo Mix", "2010-08 - Arto Mwambe - August Promo Mix" -
// 149 of them), and without a name of its own the title would come out as bare
// "2026-08 - Ingo Sanger". Set in the date step, read at the single exit.
var mdbTitle_monthOnlyName = "";

// mdbTitle_isChannelInitials
// Whether an all-caps word is the channel abbreviating itself: "IA" on "Illegal Alien Records".
// A PREFIX of the initials counts, because a label drops its "Records" in its own podcast name
// as readily as it keeps it. Two letters minimum - one initial matches almost anything - and
// the word has to be written in caps already, so a lowercase title is never shouted INTO caps.
function mdbTitle_isChannelInitials( word ) {
    if( !mdbTitle_channelInitials || word.length < 2 ) return false;
    if( word !== word.toUpperCase() || word === word.toLowerCase() ) return false;

    return mdbTitle_channelInitials.indexOf( word.toUpperCase() ) === 0;
}

// mdbTitle_initialsOf
// The first letter of every word of a name, in caps. Words that start with a digit or a symbol
// contribute nothing - an acronym is made of letters.
function mdbTitle_initialsOf( name ) {
    var words = String( name || "" ).split( /[^\p{L}\p{N}]+/u ),
        out = "",
        i;

    for( i = 0; i < words.length; i++ ) {
        var first = words[i].charAt( 0 );

        if( first && first.toLowerCase() !== first.toUpperCase() ) out += first.toUpperCase();
    }

    return out;
}

// mdbTitle_wordChar
// Whether a character is a letter or a digit, in any alphabet - what a name may not be glued
// to when it is looked for INSIDE a text. Unicode-aware, so "ØDB" and "Ωmega" count too.
function mdbTitle_wordChar( c ) {
    return !!c && /[\p{L}\p{N}]/u.test( c );
}

// mdbTitle_standsAlone
// Whether the occurrence of name at index is the name STANDING there, rather than a piece of a
// longer word. Checked per side, and only on the side the name itself ends in a letter or a
// digit: a channel written "Trommel." goes on matching "Trommel.251", while "Drumcomplex" no
// longer matches inside "Drumcomplexed". The string counterpart of the "(^|[^0-9A-Za-z])" /
// "(?![0-9A-Za-z])" guards the parser's regexes carry.
function mdbTitle_standsAlone( text, index, name ) {
    var before = index > 0 ? text.charAt( index - 1 ) : "",
        after = text.charAt( index + name.length );

    if( mdbTitle_wordChar( name.charAt( 0 ) ) && mdbTitle_wordChar( before ) ) return false;
    if( mdbTitle_wordChar( name.charAt( name.length - 1 ) ) && mdbTitle_wordChar( after ) ) return false;

    return true;
}

// mdbTitle_nameStandsIn
// Whether name stands somewhere in text as a name of its own - mdbTitle_standsAlone for the
// callers that only ask "is it in there at all", so no place has to spell the scan out again.
function mdbTitle_nameStandsIn( text, name ) {
    var at = 0,
        found;

    text = String( text || "" );

    if( !name ) return false;

    while( ( found = text.indexOf( name, at ) ) !== -1 ) {
        if( mdbTitle_standsAlone( text, found, name ) ) return true;

        at = found + 1;
    }

    return false;
}

// mdbTitle_toNormalCaseKeeping
// mdbTitle_toNormalCase, with the channel's own spelling left standing wherever it turns up.
// The bit is split at it, so each piece is judged on its own case - "(selected) podcast 064"
// re-cases the " podcast 064" and hands back "(selected) Podcast 064".
// Only where the name really STANDS, never inside a longer word: the channel "Drumcomplex" is
// the first eleven characters of the series "Drumcomplexed Radio Show", and splitting there
// left an "ed" to be re-cased as a word of its own - "DrumcomplexEd Radio Show", a name nobody
// wrote and no category the wiki could answer about (reported 2026-08-19).
function mdbTitle_toNormalCaseKeeping( s ) {
    var keep = mdbTitle_channelSpelling,
        pieces = [],
        from = 0,
        at = 0,
        found,
        i;

    s = String( s || "" );

    if( !keep ) return mdbTitle_toNormalCase( s );

    while( ( found = s.indexOf( keep, at ) ) !== -1 ) {
        if( mdbTitle_standsAlone( s, found, keep ) ) {
            pieces.push( s.slice( from, found ) );
            at = from = found + keep.length;
        } else {
            // glued into a longer word - the text stays in the piece being collected and the
            // search moves on by one character, so an overlapping occurrence is not skipped
            at = found + 1;
        }
    }

    if( !pieces.length ) return mdbTitle_toNormalCase( s );

    pieces.push( s.slice( from ) );

    for( i = 0; i < pieces.length; i++ ) {
        pieces[i] = mdbTitle_toNormalCase( pieces[i] );
    }

    return pieces.join( keep );
}

// mdbTitle_byMarkerFlags
// The regex flags that make "by" the preposition rather than a word of a name, for the bit it
// stands in: none (so only the lowercase "by" matches), or "i" inside a bit that is SHOUTED
// throughout, where caps say nothing. See the "by" block in title_definitions.js.
function mdbTitle_byMarkerFlags( text ) {
    text = String( text || "" );

    return ( text === text.toUpperCase() && text !== text.toLowerCase() ) ? "i" : "";
}

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

// mdbTitle_isShortAcronym
// Whether a bit of the title is nothing but a SHORT word written in caps - "KCE". Three
// letters standing alone are an artist's initials or a brand, never a word worth shouting, and
// no test inside the word says so: "KCE" holds a vowel, so mdbTitle_hasVowel passes it on to
// be re-cased into the "Kce" that is nobody.
// Only for a bit that is nothing BUT the word. The same three letters inside a phrase are an
// ordinary word ("MOLTO IN THE MIX" -> "Molto In The Mix"), which is why this is asked in
// mdbTitle_cleanArtist, where the string IS one bit of the title, and not per word inside
// mdbTitle_toNormalCase.
function mdbTitle_isShortAcronym( s ) {
    s = String( s || "" ).trim();

    if( s.length > 3 || !/^\S+$/.test( s ) ) return false;

    return s === s.toUpperCase() && s !== s.toLowerCase();
}

// mdbTitle_cleanArtist
function mdbTitle_cleanArtist( s ) {
    s = String( s || "" ).replace( /\s+/g, " " );

    // brackets left empty by a removed date/episode/show
    s = s.replace( /\(\s*\)|\[\s*\]|\{\s*\}/g, " " );

    // leading connectors: "w/ Ruf Dug", "presents Ruf Dug", ...
    s = mdbTitle_trimSeparators( s );
    s = s.replace( /^(?:w\/|w\.|with|feat\.?|ft\.?|presents?|pres\.?)\s+/i, "" );

    // "by Neryn" is the same thing, but only where the "by" is not a word of the name itself -
    // see the "by" block in title_definitions.js
    s = s.replace( new RegExp( "^by\\s+", mdbTitle_byMarkerFlags( s ) ), "" );

    s = mdbTitle_trimSeparators( s );

    // Normal Case for a bit that was shouted in caps or typed all lowercase, the channel's own
    // spelling excepted - and a bit that is nothing but a short word in caps excepted too,
    // since that is an acronym rather than a shouted word
    var normalCased = mdbTitle_isShortAcronym( s ) ? s : mdbTitle_toNormalCaseKeeping( s );
    if( normalCased !== s ) {
        logVar( "mdbTitle_cleanArtist: re-cased", s + " -> " + normalCased );
        mdbTitle_reCased = true;
        s = normalCased;
    }

    // Help:Add_a_new_mix_page: "DJ not Dj"
    s = s.replace( /\bdj\b/gi, "DJ" );

    return s;
}

// mdbTitle_normalizeJoiners
// "See Bastian B2B Afin" -> "See Bastian b2b Afin", "Surgeon VS. Regis" -> "Surgeon vs Regis".
// See mdbTitleArtistJoinerSpellings, which also says why this is the artist group's business and
// not the entity's. Whitespace on both sides is what makes a word a joiner rather than a piece
// of a name.
function mdbTitle_normalizeJoiners( s ) {
    var spellings = ( typeof mdbTitleArtistJoinerSpellings !== "undefined" && mdbTitleArtistJoinerSpellings ) ? mdbTitleArtistJoinerSpellings : {},
        writtenAs = {},
        variants = [],
        write,
        i;

    s = String( s || "" );

    for( write in spellings ) {
        if( !Object.prototype.hasOwnProperty.call( spellings, write ) ) continue;

        for( i = 0; i < spellings[write].length; i++ ) {
            writtenAs[ spellings[write][i].toLowerCase() ] = write;
            variants.push( spellings[write][i] );
        }
    }

    if( !variants.length ) return s;

    // longest first: "b2b2b" must not be read as "b2b" with a "2b" left behind
    variants.sort( function( a, b ) { return b.length - a.length; } );

    // the space in FRONT is consumed and put back, the one behind is only looked at - so two
    // joiners in a row ("Foo b2b Bar b2b Baz") both match. A joiner written as punctuation keeps
    // the space it is followed by and drops the one in front: "Foo, Bar", never "Foo , Bar".
    return s.replace(
        new RegExp( "(^|\\s)(?:" + mdbTitle_wordListAlternation( variants ) + ")(?=\\s)", "gi" ),
        function( all, before ) {
            var write = writtenAs[ all.trim().toLowerCase() ];

            return ( /^\w/.test( write ) ? before : "" ) + write;
        }
    );
}

// mdbTitle_tidy
// The MixesDB spelling conventions that hold for every group of a title, whichever branch built
// it - see "The spelling every group is held to" in title_definitions.js for the list and for
// what deliberately is not on it. Runs AFTER mdbTitle_wikiSafe(), so the square brackets are
// round ones by now and the spaces that replaced an illegal character are tidied up too.
function mdbTitle_tidy( s ) {
    var apostrophes = ( typeof mdbTitleApostropheChars !== "undefined" && mdbTitleApostropheChars ) ? mdbTitleApostropheChars : /[`´‘’]/g;

    apostrophes.lastIndex = 0;

    return String( s || "" )
        .replace( apostrophes, "'" )
        .replace( /\(\s+/g, "(" )
        .replace( /\s+\)/g, ")" )
        .replace( /\s+,/g, "," )
        .replace( /\s+/g, " " )
        .trim();
}

// mdbTitle_usernameConversionKey
// The mdbTitleUsernameConversions key for a channel name, or "" when it is not listed.
// Case-insensitive, so a casing slip in a hand-written key does not silently disable it.
function mdbTitle_usernameConversionKey( username ) {
    if( !username ) return "";

    var map = ( typeof mdbTitleUsernameConversions !== "undefined" && mdbTitleUsernameConversions ) ? mdbTitleUsernameConversions : {};

    if( Object.prototype.hasOwnProperty.call( map, username ) ) return username;

    for( var key in map ) {
        if( Object.prototype.hasOwnProperty.call( map, key ) && key.toLowerCase() === username.toLowerCase() ) {
            return key;
        }
    }

    return "";
}

// mdbTitle_channelNames
// The names a channel name lists: "Lone Saxon / Nick J. Smith" -> [ "Lone Saxon", "Nick J.
// Smith" ]. Only a slash or a pipe with whitespace on BOTH sides separates two names - see
// "A channel naming SEVERAL names" in title_definitions.js.
function mdbTitle_channelNames( username ) {
    var parts = String( username || "" ).split( /\s+[\/|]+\s+/ ),
        names = [],
        name,
        i;

    for( i = 0; i < parts.length; i++ ) {
        name = mdbTitle_trimSeparators( parts[i] );

        if( name ) names.push( name );
    }

    return names;
}

// mdbTitle_namesTheChannel
// Whether a name stands in the title as a name of its own rather than inside a longer word.
// The plain question, without the guards mdbTitle_takeShowOutOfTitle puts on top of it: this
// only decides WHICH of a channel's names to work with, never what to do with it.
function mdbTitle_namesTheChannel( text, name ) {
    if( !name ) return false;

    return new RegExp( "(^|[^\\w])" + mdbTitle_escapeRe( name ) + "(?![\\w])", "i" ).test( text );
}

// mdbTitle_pickChannelName
// Which of a channel's names to use: the one the title names, else the first - an account
// leads with the name it puts mixes out under.
function mdbTitle_pickChannelName( text, username ) {
    var names = mdbTitle_channelNames( username ),
        i;

    if( names.length < 2 ) return username;

    for( i = 0; i < names.length; i++ ) {
        if( mdbTitle_namesTheChannel( text, names[i] ) ) return names[i];
    }

    return names[0];
}

// mdbTitle_showFromUsername
// Channel name -> show entity, via mdbTitleUsernameConversions (title_definitions.js).
// An unlisted channel falls back to its raw name; an entry mapped to "" means "no show".
function mdbTitle_showFromUsername( username ) {
    if( !username ) return "";

    var key = mdbTitle_usernameConversionKey( username );
    return key ? mdbTitleUsernameConversions[key] : username;
}

// mdbTitle_channelSeriesConversion
// mdbTitleChannelSeriesConversions (title_definitions.js): the channel and a word in the title
// name the show TOGETHER. Returns { text, entity, words } with the words grown into the curated
// name inside the text, or null when the channel is not listed or the title carries none of its
// words.
// All of the channel's entries are searched at once, longest name first - every entry's words
// AND the show they map to, in one list. A channel writes the same show both ways, in full
// ("Juno Daily - In The Mix: Space Ghost") and halved ("In The Mix: Ben Diggins"), which takes
// two entries; each of the two names is also a piece of the other, so whichever stands in the
// title, the more specific one has to be found first. Trying entry by entry cannot do that -
// it would make the ORDER the entries happen to be written in decide the suggestion.
function mdbTitle_channelSeriesConversion( text, username ) {
    var map = ( typeof mdbTitleChannelSeriesConversions !== "undefined" && mdbTitleChannelSeriesConversions ) ? mdbTitleChannelSeriesConversions : {},
        key = "",
        k;

    if( !username ) return null;

    for( k in map ) {
        if( Object.prototype.hasOwnProperty.call( map, k ) && k.toLowerCase() === username.toLowerCase() ) {
            key = k;
            break;
        }
    }

    if( !key ) return null;

    var entries = map[key],
        candidates = [],
        words, entity, re, c;

    // Every name the channel's entries offer, each remembering the entry it came from: the
    // words a title may carry, and the show they map to - a title already carrying the show
    // in full is the same lookup, it just needs no rewriting.
    for( words in entries ) {
        if( !Object.prototype.hasOwnProperty.call( entries, words ) ) continue;

        entity = entries[words];
        if( !entity ) continue;

        candidates.push( { name: entity, entity: entity, words: words } );
        candidates.push( { name: words,  entity: entity, words: words } );
    }

    // Longest first, and never "entity before words" or "entry before entry": which name
    // contains which differs per entry, and the shorter one always matches inside the longer.
    // "Dance TV DJ Mix" (show) contains "DJ Mix" (words), so a title already carrying the show
    // must not grow a second "Dance TV"; "Juno Daily - In The Mix" (words) contains "Juno
    // Daily" (show), so the show found first would match its own first two words, replace them
    // with themselves and leave "- In The Mix" standing in the title as if it were an artist.
    // Longest-first is right in every direction - it is always the more specific match.
    candidates.sort( function( a, b ) { return b.name.length - a.name.length; } );

    for( c = 0; c < candidates.length; c++ ) {
        // more looseness than a mapped channel name gets: any case, inner spaces optional
        // AND the dash/colon between the words free (see mdbTitle_escapeReLooseSeparators),
        // word boundaries around the whole name
        re = new RegExp( "(^|[^\\w])" + mdbTitle_escapeReLooseSeparators( candidates[c].name ) + "(?![\\w])", "i" );

        if( re.test( text ) ) {
            // "found" keeps the words as the TITLE wrote them ("DJ MIX"), so the panel's
            // step can quote the title rather than the curated key
            var found = "",
                entry = candidates[c];

            return {
                text: text.replace( re, function( all, lead ) {
                    found = all.slice( lead.length );
                    return lead + entry.entity;
                } ),
                entity: entry.entity,
                words: entry.words,
                found: found
            };
        }
    }

    return null;
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The build trace
 *
 * How the LAST buildMixesdbTitle() run read the title, as plain data: the chunks the player
 * title split into (plus what the split removed outright - see mdbTitle_titleChunks), every
 * fix/removal of standard stuff by name, and the title as it stood once the cleanup was done.
 * The "Report" panel (page_creator.js) renders it above the report box, so a reporter sees
 * WHY the suggestion looks the way it does.
 *
 * Overwritten on every run - the second, lookup-informed pass replaces the first pass's
 * trace, which is right: the panel describes the suggestion that is on screen.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var mdbTitle_trace = null;

// mdbTitle_traceStep
// One thing the cleanup did, named for a reader: label says what, detail quotes it (usually
// the same "before -> after" string the logVar line next to it builds). Whitespace collapsed,
// so a removal that left a double blank behind does not show one.
// mapping is optional, for the channel -> show steps: { from, to, words? } - the panel
// renders it as chips (channel blue, show green) instead of the plain detail, which stays
// alongside as what a stale cached page_creator.js falls back to.
// defs names the title_definitions.js lists the step worked off, in the order they were read.
// The panel offers them behind a "?" (mdbTitleDefinitionDocs holds the text and the data), so
// a reporter can see the rule rather than infer it. A step that decided something on its own -
// the date, the brackets - names none, and gets no "?".
function mdbTitle_traceStep( label, detail, mapping, defs ) {
    if( !mdbTitle_trace ) return;

    // No step re-lists what the chunk section already shows as removed (a label credit, a
    // place list). Every step that quotes the title quotes it as it stands at that moment,
    // which is WITH those words - the parse drops them later - and quoted again they read as
    // kept. Central, so the answer is the same in every step. A step whose detail is those
    // names ("Location chunk dropped") is unaffected: it only ever names what section 1 did
    // NOT show.
    var text = mdbTitle_traceTextWithout( detail, mdbTitle_trace.chunksRemoved ).replace( /\s+/g, " " ).trim(),
        sides = text.split( " -> " );

    // ... and a step whose two sides came out IDENTICAL concerned nothing but such a chunk
    // (its brackets, its separators). "X -> X" is not a step, it is a step that has already
    // been reported one section higher.
    if( sides.length === 2 && sides[0] === sides[1] ) return;

    var step = {
        label: label,
        detail: text
    };

    if( mapping ) step.mapping = mapping;
    if( defs && defs.length ) step.defs = defs;

    mdbTitle_trace.steps.push( step );
}

// mdbTitle_traceCleaned
// Checkpoint: the title as it stands after the cleanup so far. Called after every removal, so
// the last call before the parse proper is what the panel shows as "after cleanup".
function mdbTitle_traceCleaned( text ) {
    if( mdbTitle_trace ) mdbTitle_trace.cleaned = text;
}

// mdbTitle_traceChunks
// A title as the trimmed, non-empty chunks it splits into - what the panel renders as chips.
// Splits at the separator runs, inside a chunk at "presents"/"pres." (the presenter and what
// they present are two names) and at the lowercase "by" in front of a numbered series - the
// same guarded reading the parser does ("Guestroom 779 by Sascha Sibler" is two units,
// "Live by the Sea" is one) - and at every " @ ", so the chunks shown are the units the
// parse really works with.
//
// The "@" pass sits HERE and not in mdbTitle_titleChunks, which is the only place it used to
// run: the panel splits its second section's chips with this function directly (see
// mdbPageCreator_renderReasoning), so an "@" pass one level up left section 2 showing
// "Green Lake Project @ 3000Grad Festival 3021" as one chip where section 1 showed two. One
// splitter, so the two sections cannot disagree about what a unit is.
function mdbTitle_traceChunks( text ) {
    var bits = String( text || "" ).split( mdbTitle_bitSplitRe() ),
        units = [],
        out = [],
        i, p, q, c, g, bit, presParts, invitedParts, byMatch, atParts, commaParts, part;

    for( i = 0; i < bits.length; i++ ) {
        bit = mdbTitle_trimSeparators( bits[i] );

        if( !bit ) continue;

        // "presents"/"pres." separates two names the way a "|" does - the presenter and what
        // they present are never one name ("Mat.Theo present UNCODED BIRTHDAY Radioshow",
        // "fabric presents Bonobo"), so each side is a unit and a candidate of its own.
        // Unlike the "by" below it needs no guard: the word introduces a name wherever it
        // stands, and no name carries it as an ordinary word.
        presParts = bit.split( /\s+(?:presents?|pres\.?)\s+/i );

        for( q = 0; q < presParts.length; q++ ) {
            part = mdbTitle_trimSeparators( presParts[q] );

            if( !part ) continue;

            // "<host> invites <guest>" is two names as well, and the same mirror is what makes
            // the guest a lookup candidate at all: read as one chunk the wiki was asked about
            // "Bassiani invites Victor" - a name that cannot exist - while "Victor", an artist
            // it knows, was never asked. Unlike "presents" the word needs its fences: "Secret
            // Cinema Invites" and "Yax Invites 166" carry it as part of the name
            // (mdbTitle_guestConnectorParts).
            invitedParts = mdbTitle_guestConnectorParts( part ) || [ part ];

            for( g = 0; g < invitedParts.length; g++ ) {
                part = invitedParts[g];

                byMatch = new RegExp( "^(.+?)\\s+by\\s+(.+)$", mdbTitle_byMarkerFlags( part ) ).exec( part );

                if( byMatch && mdbTitle_seriesScore( byMatch[1] ) > 0 ) {
                    units.push( mdbTitle_trimSeparators( byMatch[1] ), mdbTitle_trimSeparators( byMatch[2] ) );
                } else {
                    units.push( part );
                }
            }
        }
    }

    // every " @ " separates: the name in front of the joiner and each place behind it are
    // units of their own - "Kernel Existence @ 3000Grad Festival @ Utopia" is three chunks,
    // and each is asked about on its own
    for( i = 0; i < units.length; i++ ) {
        atParts = units[i].split( /\s*@\s*/ );

        for( p = 0; p < atParts.length; p++ ) {
            commaParts = mdbTitle_splitEventComma( atParts[p] );

            for( c = 0; c < commaParts.length; c++ ) {
                part = mdbTitle_trimSeparators( commaParts[c] );

                if( part ) out.push( part );
            }
        }
    }

    return out;
}

// mdbTitle_splitEventComma
// A chunk cut at the comma that stands in FRONT of an event name: "Dark Skies, Horst Festival"
// is a stage and the festival it stands on, and the wiki knows the two as their own categories -
// asked as one glued name it can only answer empty, while "Horst Festival" itself is never
// asked at all.
//
// Only that one comma cuts, and only when the part BEHIND it ends in an event word. The comma
// joins everywhere else and must keep doing so: it is how MixesDB writes an artist list ("ANA,
// Johnny D, DJ Koze" is one group of names, never a title split into artist and show) and how it
// writes a place group - and there the event stands in FRONT of the comma ("3000Grad Festival,
// Utopia", "Wire Club, Leeds"), so nothing behind it ends in an event word and the group stays
// whole. What this catches is the uploader who wrote the group the other way round.
//
// Splitting here and not in mdbTitle_bitSplitRe on purpose: this is the chunk split, which feeds
// the panel's chips and the lookup candidates. The parse works on the full text and keeps writing
// the place group with its comma - the suggested title does not change.
function mdbTitle_splitEventComma( text ) {
    var parts = String( text || "" ).split( "," ),
        out = [],
        current = parts[0],
        i;

    if( parts.length < 2 ) return [ text ];

    for( i = 1; i < parts.length; i++ ) {
        if( mdbTitle_endsWithEventWord( parts[i] ) ) {
            out.push( current );
            current = parts[i];
        } else {
            // not this comma - written back exactly where the uploader put it
            current += "," + parts[i];
        }
    }

    out.push( current );

    if( out.length > 1 ) {
        logVar( "mdbTitle_splitEventComma: a comma in front of an event name separates", text + " -> " + out.join( " | " ) );
    }

    return out;
}

// mdbTitle_traceTextWithout
// A step's quoted text with the chunks the shared split removes outright (label credits,
// place lists) excised - in their bracketed spelling first, then bare, each with the
// separator run in front of it, so the cut leaves no " - |" debris. Run over EVERY step's
// detail by mdbTitle_traceStep(); the reason is written there. Display only - the parse works
// on the full text and drops these chunks where its own rules do.
function mdbTitle_traceTextWithout( text, removed ) {
    var out = String( text || "" ),
        i, esc;

    for( i = 0; removed && i < removed.length; i++ ) {
        esc = mdbTitle_escapeRe( removed[i].text );

        // global: a step quotes the title twice ("before -> after") and the chunk has to go
        // from BOTH sides - cutting only the first leaves the step contradicting itself
        out = out
            .replace( new RegExp( "[(\\[{]\\s*" + esc + "\\s*[)\\]}]", "g" ), " " )
            .replace( new RegExp( "(?:\\s*[|\\/•\\-–]+\\s*|\\s+|^)" + esc + "(?=\\s*(?:[|\\/•\\-–]+\\s*|$))", "g" ), " " );
    }

    // Each side of a "before -> after" quote is a title of its own and is trimmed like one:
    // a chunk cut off the END of a side leaves behind the separator that used to join it
    // ("Mister Joshooa |"), which reads as a title missing something.
    var sides = out.replace( /\s+/g, " " ).split( " -> " ),
        s;

    for( s = 0; s < sides.length; s++ ) {
        sides[s] = mdbTitle_trimSeparators( sides[s] );
    }

    return sides.join( " -> " );
}

// mdbTitle_titleChunks
// THE chunk split: the player title as the chunks everything downstream shares - the panel's
// "Title chunks" section and the lookup candidates alike. Prepared the way the parser prepares
// the title (underscores as spaces, typos fixed, decoration dropped, label-credit brackets
// dropped, brackets read as separators - the channel's own bracket excepted), THEN split: a
// bracketed "(Ritter Butzke)" or a "<series> by <artist>" is a unit of its own, and a
// "[FREE DOWNLOAD]" is not a chunk at all. One function, so the chunks shown, the names looked
// up and the units parsed cannot drift apart.
//
// Returns { chunks, removed }. "removed" is what the parse takes out ENTIRELY, each as
// { text, reason: "label" | "location" } - a label credit ("Tooker (SONARA / Crosstown
// Rebels)", see 1a in buildMixesdbTitle) or a place list saying where the artist is from
// ("Ibiza/ Dusseldorf, Germany", see 3h). Those names never join the title, so they are no
// chunks and no lookup candidates - asking the wiki about a record label wastes the request.
// The panel shows them struck through, so a reporter sees they were dropped on purpose.
//
// refDate is the upload date the parse disambiguates a title's date with (createdAt ||
// releaseDate). Only needed so the date cut below lands on the same digits the parse cuts;
// without it a title carrying two dates could have its chunks cut at the other one.
function mdbTitle_titleChunks( playerTitle, username, description, refDate ) {
    var text = mdbTitle_fixTypos( mdbTitle_spaced( playerTitle ).replace( /\s+/g, " " ).trim() ),
        removed = [],
        n, i;

    if( typeof mdbTitleNoise !== "undefined" && mdbTitleNoise ) {
        for( n = 0; n < mdbTitleNoise.length; n++ ) {
            mdbTitleNoise[n].lastIndex = 0;
            text = text.replace( mdbTitleNoise[n], " " );
        }
    }

    // the same Live PA take the parse runs (1a0): the phrase is written back behind the
    // artist at the exit, so it is no unit of the title and no lookup candidate
    text = mdbTitle_takeLivePa( text ).text;

    // the same label-credit drop the parse runs (1a), while the brackets are still brackets
    var labels = mdbTitle_dropLabelBrackets( text, description );

    for( i = 0; i < labels.dropped.length; i++ ) {
        removed.push( { text: labels.dropped[i], reason: "label" } );
    }

    text = labels.text;

    // ... and the bracketed-country drop (1a2): "Adjust (BE)" loses the "(BE)" even on a live
    // title, so the code is no chunk and no lookup candidate
    var locationBrackets = mdbTitle_dropLocationBrackets( text );

    for( i = 0; i < locationBrackets.dropped.length; i++ ) {
        removed.push( { text: locationBrackets.dropped[i], reason: "location" } );
    }

    text = locationBrackets.text;

    // the same two chunk rewrites the parse runs (1b and 1b2): a bracket and a dash wrap are
    // each a chunk of their own. The joke-year mirror (1b3) goes with them: the digits of
    // "3000Grad Festival 3026" leave the title, so they belong to no chunk and to no lookup
    // candidate - the same reason the date is mirrored further down.
    var unbracketed = mdbTitle_takeJokeYear( mdbTitle_dashWrapsToSeparators(
            mdbTitle_bracketsToSeparators( text, mdbTitle_spaced( username ) ) ) ).text,
        // The units are the units the PARSE works with, so the joiners run first: a live
        // marker is gone ("live@3000Grad Festival" holds no chunk "live"), an "at" in front
        // of a place is the " @ " it will be read as. Also what the parse's 3h guard needs:
        // only a NON-live title drops its place lists - on a live one they are the venue's
        // city and country, which MixesDB writes.
        joined = mdbTitle_applyJoiners( unbracketed ).text,
        live = joined.indexOf( "@" ) !== -1;

    // The date mirror: the parse reads the date out of the title and writes it in FRONT of
    // the finished one (3 in buildMixesdbTitle), so the digits belong to no chunk and to no
    // lookup candidate. Without this they rode along inside their chunk
    // ("Blackmoonchild @ The Lot Radio 08-15-2026" -> chunk "The Lot Radio 08-15-2026") and
    // the trailing-number strip in mdbTitle_categoryCandidates then took only the LAST number
    // off it: the wiki was asked about "The Lot Radio 08-15", which can only answer empty,
    // while "The Lot Radio" itself was never asked - and section 1 of the panel contradicted
    // section 2, which shows the title after the parse's own cut.
    //
    // Before the live year/month strip, the same order the parse runs them in (3, then
    // mdbTitle_liveDate). They cannot take each other's work anyway: mdbTitle_findDate has no
    // year-only and no bare-month pattern, which is exactly what the strip below is for.
    var dateInTitle = mdbTitle_findDate( joined, refDate || "" );

    if( dateInTitle ) {
        joined = mdbTitle_cut( joined, dateInTitle.index, dateInTitle.length );
        logVar( "mdbTitle_titleChunks: date taken out before the split", dateInTitle.out + " -> " + joined );
    }

    // The live-date mirror: what mdbTitle_liveDate takes off the END of a live group - the
    // gig year behind the place list, a trailing month - dates the recording and is no part
    // of the last chunk. The year's guard is the parse's own rule, asked over the joined
    // place group; only the raw strip runs on the pre-join text, so the "@"s are still there
    // to split at below.
    if( live ) {
        if( mdbTitle_takeRecordingYear( mdbTitle_joinPlaceGroups( joined ) ).year ) {
            joined = mdbTitle_takeTrailingYear( joined ).text;
        }

        joined = mdbTitle_takeRecordingMonth( joined ).text;
    }

    // The monthly-edition mirror: a "<Month> <Year>" stamp ending a series title dates the
    // edition the way an episode number counts one, and the parse's series branches drop it
    // (mdbTitle_takeMonthlyEdition - its guards, the series word in front included, live in
    // there). Cut like the date above: the parse writes nothing of it into the title, so it
    // is no chunk and no lookup candidate - "(JUNE 26)" must not be asked about as "JUNE".
    // The dated-mix shape steps aside the way 6b's reading does: there the stamp IS the
    // name, and only the mix word moves.
    if( !live && !mdbTitle_datedMixName( joined ).taken ) {
        joined = mdbTitle_takeMonthlyEdition( joined, refDate || "" ).text;
    }

    // The further-artist mirror: the same take the parse runs (3b). "w/ Asa 808" and
    // "with STRAUSS." name ANOTHER artist, whom the parse writes into the artist group on
    // their own, so each of them is a unit of the title and a candidate of its own while the
    // connector belongs to no name. Without this the whole thing stayed one chunk
    // ("Flirt w/ Route 8") and the trailing-number strip then asked about "Flirt w/ Route",
    // while "Route 8" - the artist category MixesDB really has - was never asked at all.
    // Read in FRONT of the place group only: the connector's capture runs to the next
    // separator, and an "@" is none of them ("... w/ Route 8 @ 3000Grad Festival" would come
    // back as one artist called after the festival). Behind the "@" stand places anyway, and
    // a place is never a further artist.
    var atCut = live ? joined.indexOf( "@" ) : -1,
        placeTail = atCut === -1 ? "" : joined.slice( atCut ),
        extraArtists = mdbTitle_takeExtraArtists( atCut === -1 ? joined : joined.slice( 0, atCut ) );

    joined = extraArtists.text + placeTail;

    // the shared split, "@"s and all - see mdbTitle_traceChunks
    var chunks = mdbTitle_traceChunks( joined ),
        kept = [];

    // Where the place group starts in the chunks: everything from the first "@" on is a
    // place, never a possible artist. The candidate roles and the country skip
    // (mdbTitle_categoryCandidates) read this; -1 on a non-live title. Index math is safe:
    // the location-chunk removal below only runs when NOT live, and a place group only
    // exists when live, so the two never apply to the same title.
    var placeFrom = -1,
        atIdx = live ? joined.indexOf( "@" ) : -1;

    if( atIdx !== -1 ) {
        placeFrom = mdbTitle_traceChunks( joined.slice( 0, atIdx ) ).length;
    }

    var locations = live ? null : mdbTitle_locationChunkFlags( chunks );

    for( i = 0; i < chunks.length; i++ ) {
        if( locations && locations[i] ) {
            removed.push( { text: chunks[i], reason: "location" } );
        } else {
            kept.push( chunks[i] );
        }
    }

    // The further artists go back in behind the chunk the connector stood behind (the take's
    // "before"), so the chunks read in title order - "Flirt w/ Route 8 | BRL-071225" shows
    // "Flirt", "Route 8", "BRL" and not the guest last. Failing that, in front of the place
    // group: they are artists, and everything from the "@" on is a place, so a chunk appended
    // behind it would be asked about as one.
    if( extraArtists.artists.length ) {
        var into = -1;

        for( i = 0; extraArtists.before && i < kept.length; i++ ) {
            if( mdbTitle_normalizeCompare( mdbTitle_cleanArtist( kept[i] ) ) === mdbTitle_normalizeCompare( extraArtists.before ) ) {
                into = i + 1;
                break;
            }
        }

        if( into === -1 ) into = ( placeFrom === -1 ) ? kept.length : placeFrom;

        for( i = 0; i < extraArtists.artists.length; i++ ) {
            kept.splice( into + i, 0, extraArtists.artists[i] );
        }

        if( placeFrom !== -1 && into <= placeFrom ) placeFrom += extraArtists.artists.length;
    }

    return { chunks: kept, removed: removed, placeFrom: placeFrom };
}

// buildMixesdbTitle
// Returns { title, confidence, reasons }. title is "" when there is not enough to work with.
// known is the { name -> "artist"|"venue"|"other" } map from mdbTitle_lookupCategories(), or
// nothing on the first pass, before MixesDB has answered.
// description is the player page's description text, when the site has one. Only read for the
// labels its tracklist credits (mdbTitleKnownLabels) - nothing else in here looks at it.
function buildMixesdbTitle( playerTitle, username, createdAt, releaseDate, known, description ) {
    logFunc( "buildMixesdbTitle" );

    var conf = mdbTitle_confidence(),
        nothing = { title: "", confidence: 0, reasons: [] };

    mdbTitle_reCased = false;
    mdbTitle_channelSpelling = "";
    // filled in once the channel's name is settled below - a channel may name several, and
    // the initials of the one actually used are the ones an acronym is checked against
    mdbTitle_channelInitials = "";
    mdbTitle_channelUsed = "";
    mdbTitle_channelShown = "";
    // for mdbTitle_result, which canonicalizes the finished groups against the wiki
    mdbTitle_knownNow = known || null;
    mdbTitle_livePaTitle = false;
    mdbTitle_livePaDescription = false;
    mdbTitle_liveWordSeen = false;
    mdbTitle_promoDeclined = false;
    mdbTitle_placeWordDropped = null;
    mdbTitle_atEpisodeRead = false;
    mdbTitle_locationDropped = "";
    mdbTitle_slotPartRead = null;
    mdbTitle_monthOnlyName = "";
    mdbTitle_monthOnlyStamp = "";

    try {
        // "_" is a space on MediaWiki and a word character to a regex, so it is written out
        // before anything else reads a word - of the title and of the channel name alike.
        var rest = mdbTitle_spaced( playerTitle ).replace( /\s+/g, " " ).trim();
        if( !rest ) return nothing;

        username = mdbTitle_spaced( username ).replace( /\s+/g, " " ).trim();

        logVar( "playerTitle", rest );
        logVar( "username", username );

        // The report panel's record of this run - see "The build trace" above. The chunks are
        // the SHARED split (mdbTitle_titleChunks), the same one the lookup candidates are
        // built from - so what the panel shows as the units IS what was asked about, and what
        // the split removed (label credits, place lists) is shown as removed.
        // the same reference date step 3 disambiguates the title's date with, so the chunks
        // are cut at the digits the parse cuts
        var chunkSplit = mdbTitle_titleChunks( playerTitle, username, description, createdAt || releaseDate || "" );

        mdbTitle_trace = {
            playerTitle: rest,
            channel: username,
            chunks: chunkSplit.chunks,
            chunksRemoved: chunkSplit.removed,
            cleaned: rest,
            steps: [],
            // why the names that ended up on the page were picked for their slot - one
            // sentence per ROLE, written by the branch that decided (see mdbTitle_result)
            picks: null
        };

        // 0) typos in the words the parser itself reads, before any rule reads one
        var spelled = mdbTitle_fixTypos( rest );

        if( spelled !== rest ) {
            logVar( "buildMixesdbTitle: typo corrected", rest + " -> " + spelled );
            mdbTitle_traceStep( "Typo fixed", rest + " -> " + spelled, null, [ "mdbTitleTypoFixes" ] );
            rest = spelled;
        }

        // 1) drop decoration
        var beforeNoise = rest;

        if( typeof mdbTitleNoise !== "undefined" && mdbTitleNoise ) {
            for( var n = 0; n < mdbTitleNoise.length; n++ ) {
                mdbTitleNoise[n].lastIndex = 0;
                rest = rest.replace( mdbTitleNoise[n], " " );
            }
        }

        if( rest !== beforeNoise ) {
            mdbTitle_traceStep( "Decoration removed", beforeNoise + " -> " + rest, null, [ "mdbTitleNoise" ] );
        }

        // 1a0) "Live PA" - the one marker of HOW a set was played that MixesDB writes. Taken
        // out here, before the label test reads its bracket and before 1b makes it a chunk;
        // mdbTitle_result writes it back behind the finished artist as " (Live PA)". The
        // DESCRIPTION saying the phrase counts too, but only on a title that comes out as a
        // live recording - see mdbTitle_livePaTitle above mdbTitle_result.
        var livePa = mdbTitle_takeLivePa( rest );

        if( livePa.taken ) {
            logVar( "buildMixesdbTitle: Live PA marker taken", rest + " -> " + livePa.text );
            mdbTitle_traceStep( "Live PA marker read", rest + " -> " + livePa.text );
            mdbTitle_livePaTitle = true;
            rest = livePa.text;
        } else if( mdbTitle_livePaSaid( description ) ) {
            logVar( "buildMixesdbTitle: the description says Live PA", true );
            mdbTitle_livePaDescription = true;
        }

        // 1a) a bracket crediting the artist's label(s) - "Tooker (SONARA / Crosstown Rebels)".
        // While the brackets are still brackets, i.e. before 1b turns them into separators.
        var labelBrackets = mdbTitle_dropLabelBrackets( rest, description );

        if( labelBrackets.dropped.length ) {
            logVar( "buildMixesdbTitle: label credit dropped", labelBrackets.dropped.join( " | " ) );
            // no trace step: the chunk section's "Removed:" line already names these (the
            // shared split runs the same drop on the same text), and twice is noise
            rest = labelBrackets.text;
        }

        // 1a2) a bracket holding nothing but a country (or a place list) - "Adjust (BE)" says
        // where the artist is from, which the title never carries. While the brackets are
        // still brackets, and regardless of a live "@" further right - the function itself
        // leaves brackets BEHIND an "@" alone, where the places are the venue's.
        var locationBrackets = mdbTitle_dropLocationBrackets( rest );

        if( locationBrackets.dropped.length ) {
            logVar( "buildMixesdbTitle: location bracket dropped", locationBrackets.dropped.join( " | " ) );
            // no trace step, same reason as the label credit above
            rest = locationBrackets.text;
        }

        // 1b) brackets are a chunk of their own, exactly like a "|" - written out as one here,
        // so that every rule below splits the title without having to know about brackets.
        // After the noise, whose patterns are written WITH their brackets. The channel's own
        // brackets are the exception and stay where they are ("[selected] podcast 064").
        var unbracketed = mdbTitle_bracketsToSeparators( rest, username );

        if( unbracketed !== rest ) {
            logVar( "buildMixesdbTitle: brackets read as separators", rest + " -> " + unbracketed );

            // A bracket rewrite that concerned ONLY a chunk section 1 already shows as removed
            // ("Mister Joshooa ( Detroit, U.S.A.)") drops out in mdbTitle_traceStep, which
            // takes those chunks out of what it quotes and keeps no "X -> X" step.
            mdbTitle_traceStep( "Brackets read as separators", rest + " -> " + unbracketed );

            rest = unbracketed;
        }

        // 1b2) ... and so is a part the uploader WRAPPED in dashes: "3000Grad Festival
        // -Rummelplatz-". Here rather than further down so that 1c gets to drop it when it
        // names a stage, exactly as it drops a bracketed one.
        var unwrapped = mdbTitle_dashWrapsToSeparators( rest );

        if( unwrapped !== rest ) {
            logVar( "buildMixesdbTitle: dash-wrapped part read as its own chunk", rest + " -> " + unwrapped );
            mdbTitle_traceStep( "Dash-wrapped part read as its own chunk", rest + " -> " + unwrapped );
            rest = unwrapped;
        }

        // The channel may name SEVERAL names - the artist and the person behind the account
        // ("Lone Saxon / Nick J. Smith"). Only one of them can be used, and the title says
        // which; the rest of the parser then works with one name like everywhere else. A
        // mapped channel is left alone - that name is curated. See title_definitions.js.
        if( !mdbTitle_usernameConversionKey( username ) ) {
            var oneName = mdbTitle_pickChannelName( rest, username );

            if( oneName !== username ) {
                logVar( "buildMixesdbTitle: the channel lists several names, using", username + " -> " + oneName );
                username = oneName;
            }
        }

        mdbTitle_channelInitials = mdbTitle_initialsOf( username );
        mdbTitle_channelUsed = username;
        // the all-caps rule, asked once here so the exit spells the channel the way the
        // branches do - the take itself is read-only and its text is thrown away
        mdbTitle_channelShown = mdbTitle_takeShowOutOfTitle( rest, username, false ).show;

        // The title spelling the channel name exactly the way the channel does is the real
        // spelling, and Normal Case must not touch it. After 1b, so a channel name in brackets
        // is compared in the round-bracket spelling both sides have by then.
        // The name has to STAND in the title, not merely be a substring of a longer word: the
        // channel "Drumcomplex" is in "Drumcomplexed Radio Show" the way "art" is in "start".
        var channelSpelling = mdbTitle_wikiSafe( username );

        if( mdbTitle_nameStandsIn( rest, channelSpelling ) ) {
            mdbTitle_channelSpelling = channelSpelling;
            logVar( "buildMixesdbTitle: the title spells the channel name the channel's way", channelSpelling );
        }

        // 1b3) the gig year of an event that writes its edition a thousand years ahead
        // ("3000Grad Festival 3026"). Between the chunk rewrites and 1c, and that is the only
        // place it works: the number has to be gone before 1c compares a WHOLE chunk against
        // its patterns ("Rummelplatz 3026" is no stage, "Rummelplatz" is), and the chunks have
        // to exist before that, or the digits would be taken out of a name they never left.
        // Also long before 3 reads a date - no date pattern sees a year like this one.
        var jokeYearTaken = mdbTitle_takeJokeYear( rest ),
            jokeYear = jokeYearTaken.year;

        if( jokeYear ) {
            logVar( "buildMixesdbTitle: the event writes its year a thousand years ahead", rest + " -> " + jokeYearTaken.text );
            mdbTitle_traceStep( "Joke year read as the gig year", rest + " -> " + jokeYearTaken.text + " (" + jokeYear + ")",
                null, [ "mdbTitleJokeYearEvents" ] );
            rest = jokeYearTaken.text;
        }

        // 1c) chunks a mix page title does not carry - "Part 2", a stage, a camp. Done on the
        // whole title and this early because it is the same answer wherever such a chunk sits:
        // it names a piece of a recording or a corner of a site, not the mix.
        var withoutDropped = mdbTitle_dropBits( rest );

        if( withoutDropped.dropped ) {
            logVar( "buildMixesdbTitle: chunks dropped", rest + " -> " + withoutDropped.text );
            mdbTitle_traceStep( "Chunk dropped (a part, a stage or the like)", rest + " -> " + withoutDropped.text,
                null, [ "mdbTitleDroppedBitPatterns" ] );
            conf.drop( 5, "a part of the title was left out - it named a part, a stage or the like, which a mix page title does not carry" );
            // Nothing dropped here is ever offered back as a "Switch title" alternative -
            // "Part 2" least of all: the parts of one recording share ONE mix page (see
            // "Never offered back" in mdbTitleDroppedBitPatterns), so a chip appending it
            // would invite exactly the split page the drop exists to prevent.
            rest = withoutDropped.text;
        }

        mdbTitle_traceCleaned( rest );

        // 2) the show entity comes from the channel, not from the title
        var isMappedChannel = mdbTitle_usernameConversionKey( username ) !== "",
            show = mdbTitle_showFromUsername( username );
        logVar( "show", show + ( isMappedChannel ? " (mapped)" : " (raw channel name)" ) );

        // The mapping changes nothing in the TITLE, so without a step the panel could not
        // answer "why did Resident Advisor become RA Podcast?" - the one curated rule whose
        // work is otherwise invisible. See mdbTitleUsernameConversions in title_definitions.js.
        // The mapping field renders as chips; an entry mapped to "" ("no show") stays plain
        // text - there is no show to paint green.
        if( isMappedChannel ) {
            mdbTitle_traceStep( "Channel is on the known-shows list",
                username + " -> " + ( show || "(no show)" ),
                show ? { from: username, to: show } : null,
                [ "mdbTitleUsernameConversions" ] );
        }

        // 2a) the channel and a word in the title name the show TOGETHER: "DJ MIX #679" on the
        // channel "Dance TV" is an episode of "Dance TV DJ Mix" - the bare words would read as
        // a generic series and lose whose it is. The words grow into the curated name inside
        // the title, so every rule below finds the full name where the half one stood, and the
        // channel counts as mapped to it. See mdbTitleChannelSeriesConversions.
        var seriesConversion = mdbTitle_channelSeriesConversion( rest, username );

        if( seriesConversion ) {
            logVar( "buildMixesdbTitle: curated channel rule, title words name the show",
                    seriesConversion.words + " -> " + seriesConversion.entity );
            // The label says WHERE the show name comes from, not just what happened: this
            // name is hand-written for this channel in title_definitions.js, not read off
            // the title and not looked up. A reporter who reads "these words name the show"
            // alone looks for the rule in the title and does not find it.
            mdbTitle_traceStep( "Curated channel rule: title words name the show",
                "\"" + seriesConversion.found + "\" on the channel " + username + " -> " + seriesConversion.entity,
                { from: username, to: seriesConversion.entity, words: seriesConversion.found },
                [ "mdbTitleChannelSeriesConversions" ] );
            rest = seriesConversion.text;
            show = seriesConversion.entity;
            isMappedChannel = true;
            mdbTitle_traceCleaned( rest );
        }

        // 2b) An "@" whose whole tail is a DATE is no joiner - "Ingo Sanger @ August 2026" is
        // a mix from August 2026, not a set played at a place of that name. In front of the
        // date step, because the date patterns that need a group of their own
        // (monthYearGroup) count separators as the boundary and an "@" is none: left where it
        // stood, the month never reached the date group and became the entity instead. The
        // joiner rules further down run it again (mdbTitle_applyJoiners), which is what the
        // chunk split goes through - saying it twice costs nothing, the rewrite is idempotent.
        var atDated = mdbTitle_atDateSeparator( rest );

        if( atDated !== rest ) {
            logVar( "buildMixesdbTitle: \"@\" in front of a date is a separator", rest + " -> " + atDated );
            mdbTitle_traceStep( "\"@\" in front of a date read as a separator", rest + " -> " + atDated );
            rest = atDated;
            mdbTitle_traceCleaned( rest );
        }

        // 2c) And an "@" pointing at a "#"-numbered EPISODE - "Colossio @ Melodic Therapy #217"
        // says a set was played somewhere AND that the name behind the "@" is a series counting
        // its episodes, and only one of the two can be written. The series wins and the live
        // reading is kept alive as a flag rather than dropped: it still decides the DATE (a set
        // played somewhere is uploaded whenever it is ready) and it is offered back as a
        // "Switch title" chip at the exit. See mdbTitle_atEpisodeSeparator.
        // Its own step next to 2b rather than inside the joiner rewrite further down, because
        // this is where the reading is DECIDED - the joiner rules run the rewrite again
        // (mdbTitle_applyJoiners), which is what the chunk split goes through, and it is
        // idempotent, so saying it twice costs nothing.
        var atEpisode = mdbTitle_atEpisodeSeparator( rest );

        if( atEpisode !== rest ) {
            logVar( "buildMixesdbTitle: \"@\" in front of a numbered episode, read as the series", rest + " -> " + atEpisode );
            mdbTitle_traceStep( "\"@\" in front of a \"#\"-numbered episode: read as the series, not as a place",
                rest + " -> " + atEpisode );
            rest = atEpisode;
            mdbTitle_atEpisodeRead = true;
            mdbTitle_traceCleaned( rest );

            // a reading was PICKED between two the title states equally plainly, which is a
            // guess about the recording however well the number argues for it
            conf.drop( 5, "the title says both that the set was played somewhere (\"@\") and that the name " +
                          "behind it is a series (a \"#\"-numbered episode) - it was read as the series, and the " +
                          "live reading is offered as a switchable title" );
        }

        // 3) date. The creation date only DISAMBIGUATES a date written in the title
        // (DDMMYY vs MMDDYY vs YYMMDD) - it is used as the date itself only when the title
        // carries none, since mix dates legitimately differ from the upload date.
        var refDate = createdAt || releaseDate || "",
            found = mdbTitle_findDate( rest, refDate ),
            date = "",
            dateFromUpload = false,
            // The upload date is right for most of what gets uploaded - a podcast episode goes
            // up on its release day. It is wrong for an old set or a radio show uploaded later.
            uploadDateReason = "no date in the player title - using the upload date, which is not the mix date for an older recording";

        if( found ) {
            // sliced before the cut, so the trace can quote the digits as the title wrote them
            var dateAsWritten = mdbTitle_trimSeparators( rest.slice( found.index, found.index + found.length ) );

            date = found.out;
            rest = mdbTitle_cut( rest, found.index, found.length );

            mdbTitle_traceStep( "Date read out of the title", dateAsWritten + " -> " + found.out );
            mdbTitle_traceCleaned( rest );

            // a "<Month> <Year>" group and nothing else: remember the month, in case the
            // title turns out to name nothing but that (see mdbTitle_monthOnlyName)
            if( found.pattern === "monthYearGroup" ) {
                mdbTitle_monthOnlyName = mdbTitle_monthTitleNames[ +found.out.slice( 5, 7 ) ] || "";
                mdbTitle_monthOnlyStamp = dateAsWritten;
            }

            // a rival reading of the same digits lands almost as close to the upload date -
            // e.g. 03/04 could be the 3rd or the 4th, and nothing here can settle it
            if( found.runnerUp !== null && found.runnerUp - found.score < 2 ) {
                conf.drop( 15, "the date in the title reads two ways (day/month order)" );
            }

            // The title date being far from the upload date is normal for an old set, and it
            // also looks like a misread - but only a title that leaves something open can BE
            // misread. A day, a month and a year with one reading between them ("1999-10-09 -
            // Thomas Bangalter @ WE, Dolton Expo Center, Chicago", uploaded in 2009) leaves
            // nothing: the distance then says "this is an old recording", which is a fact about
            // the mix and not a doubt about the suggestion. Anything less complete - digits
            // that read two ways, a month without a day - keeps a small charge, since there the
            // upload date was the only thing that decided.
            if( found.score > 60 &&
                ( found.readings > 1 || !/^\d{4}-\d{2}-\d{2}$/.test( found.out ) ) ) {
                conf.drop( 3, "the date in the title is far from the upload date" );
            }
        } else if( jokeYear ) {
            // The title DID date itself, only in the event's own joke spelling - and a year
            // the title names beats the upload date, which is not the gig date for a festival
            // set (the same rule mdbTitle_liveDate keeps for a year behind the place list).
            date = jokeYear;
            logVar( "buildMixesdbTitle: no ordinary date in the title, using the joke year", date );
            mdbTitle_traceStep( "No ordinary date in the title", "the event's own year stands in: " + date );
        } else {
            // same preference the header's highlighted date uses: release date wins
            date = releaseDate || createdAt || "";
            // Charged further down, not here: an event title may still replace the upload date
            // with the year it names, and would leave a reason behind that is not true.
            dateFromUpload = true;
            logVar( "buildMixesdbTitle: no date in the title, falling back to", date );
            mdbTitle_traceStep( "No date in the title", "the upload date stands in: " + date );
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
            mdbTitle_traceStep( "Further artists taken out (\"w/\", \"with\")", extraArtists.join( ", " ),
                null, [ "mdbTitleExtraArtistConnectors" ] );
            mdbTitle_traceCleaned( rest );
        }

        // 3c) MixesDB joiners: "x" between artists becomes "&", "at" in front of a place
        // becomes "@". Both change what the rest of the parser sees, so they run early.
        var joined = mdbTitle_applyJoiners( rest );

        // the consumed marker's "live" survives as a signal: it is what offers the Live PA
        // reading as a switchable alternative at the exit. Only this call sets it - the
        // chunk split runs applyJoiners too, but a signal about the SUGGESTION belongs to
        // the build alone.
        if( joined.liveSaid ) {
            logVar( "buildMixesdbTitle: the title says \"live\"", "kept as the Live PA alternative's signal" );
            mdbTitle_liveWordSeen = true;
        }

        if( joined.text !== rest ) {
            logVar( "buildMixesdbTitle: joiners applied", rest + " -> " + joined.text );
            mdbTitle_traceStep( "Joiners rewritten", rest + " -> " + joined.text, null,
                [ "mdbTitleVenueConnectors", "mdbTitleTogetherArtistJoiners", "mdbTitleLiveAtWords" ] );
            rest = joined.text;
            mdbTitle_traceCleaned( rest );
        }

        // Only a joiner READ INTO the title is a guess, and the reason names the words it was
        // read out of - "a joiner was applied" says nothing a reader can go and check. A joiner
        // the uploader already typed costs nothing: it is the title telling us, not us telling
        // the title.
        if( joined.read.length ) {
            conf.drop( 5, "a joiner was read into the title (" + joined.read.join( ", " ) +
                          ") - check it against the recording" );
        }

        // The one thing applyJoiners takes OUT of the title rather than rewriting: a live marker
        // with no place for it to point at. Something the title said is gone, so it is said out
        // loud - if the set really was played somewhere, the venue has to be typed in by hand.
        if( joined.dropped ) {
            conf.drop( 5, "\"" + joined.dropped + "\" was dropped - it says how the set was played, not where, " +
                          "and the title names no venue or event to put behind an \"@\"" );
            mdbTitle_traceStep( "Live marker dropped", "\"" + joined.dropped + "\" says how the set was played, not where",
                null, [ "mdbTitleLiveAtWords" ] );
        }

        // 3c2) A second "@" never survives: everything behind the joiner is ONE place group,
        // "@ Event, Venue" - see mdbTitle_joinPlaceGroups. A spelling rule, so it costs
        // nothing: both "@" were the uploader's own.
        var onePlace = mdbTitle_joinPlaceGroups( rest );

        if( onePlace !== rest ) {
            logVar( "buildMixesdbTitle: further \"@\" joined into the place group", rest + " -> " + onePlace );
            mdbTitle_traceStep( "Only one \"@\" per title", rest + " -> " + onePlace );
            rest = onePlace;
            mdbTitle_traceCleaned( rest );
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
            mdbTitle_traceStep( "Guest-mix marker read", "the guest artist is " + guestArtist,
                null, [ "mdbTitleGuestMarkers" ] );
            mdbTitle_traceCleaned( rest );
        }

        // 3d2) "<host> invites <guest>" - the same answer from the other kind of word: a VERB
        // between two names, so the guest behind it is the artist and the host stays standing
        // as what names the show. Only where no guest marker has already named one - two
        // phrases naming two different artists is a title nobody writes, and the marker is the
        // more explicit of the two.
        if( !guestArtist ) {
            var invited = mdbTitle_takeGuestConnector( rest );

            if( invited.artist ) {
                guestArtist = invited.artist;
                rest = invited.text;

                logVar( "guest artist (invited)", guestArtist );
                mdbTitle_traceStep( "Guest connector read", "the host invites " + guestArtist + ", so the guest is the artist",
                    null, [ "mdbTitleGuestConnectors" ] );
                mdbTitle_traceCleaned( rest );
            }
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

            return mdbTitle_result( date, extraArtists[0], extra.before, null, false, extraArtists.slice( 1 ), conf, {
                artist: "the title names them behind \"with\"",
                entity: "what stands in front of \"with\" reads as a series name, so it is the show"
            } );
        }

        // 3f) A live recording at an event: the event is the venue, the artists are the bit
        // next to it, and "Part 2"/stage names are none of a mix page title's business.
        // Runs before the channel is touched at all - "Leon Row & Shimon" must keep the
        // "Shimon" that the channel of the same name would otherwise cut out of it.
        var eventTitle = mdbTitle_takeEventTitle( rest, known, username );

        if( eventTitle ) {
            logVar( "buildMixesdbTitle: event title", eventTitle.artist + " @ " + eventTitle.event + " (" + eventTitle.year + ")" );

            if( eventTitle.chainDropped ) {
                logVar( "buildMixesdbTitle: the artist bit named the place inside the event",
                    eventTitle.chainDropped + " -> " + eventTitle.artist );
                mdbTitle_traceStep( "Place inside the event dropped from the artist",
                    eventTitle.chainDropped + " -> " + eventTitle.artist, null,
                    [ "mdbTitleNameChainConnectors" ] );
            }

            var eventGroup = eventTitle.artist + " @ " + eventTitle.event +
                             ( eventTitle.city ? ", " + eventTitle.city : "" );

            if( dateFromUpload ) {
                // A festival set is uploaded whenever the recording is ready, so the upload date
                // says nothing about when it was played - only a year is claimed. The event's
                // own year wins over the upload year: the title states that one.
                var eventLive = mdbTitle_liveDate( eventTitle.year || date, eventGroup );

                date = eventLive.date;
                eventGroup = eventLive.group;
                conf.drop( 10, mdbTitle_liveDateReason( eventLive.month ) );

            } else if( eventTitle.year && date.slice( 0, 4 ) !== eventTitle.year ) {
                conf.drop( 15, "the date in the title and the year of the event (" + eventTitle.year + ") do not match - one of them is misread" );
            }

            conf.drop( 10, "read as a live recording at an event - the event name was taken as the place it was played at" );

            return mdbTitle_result( date, eventGroup, "", null, false, [], conf, {
                // when the wiki's artist answer picked the bit, say so - with several bits
                // around the event, position alone is not what decided
                artist: eventTitle.artistKnown
                    ? "MixesDB knows a name in that bit as an artist, which is what picked it over the other bits around the event"
                    : "the name standing in front of the event is who played there",
                // The wiki is NOT what decides this one - the event word list is (the venue
                // branch below is the one that asks MixesDB) - so the sentence must not claim
                // the wiki knows the name. "Why this and not the channel?" is answered by the
                // second half: a set played somewhere has a place, not a show.
                entity: "\"" + eventTitle.event + "\" carries an event word, so the title reads as a set PLAYED at it - " +
                        "it becomes the place behind the \" @ \", and the channel is not used as a show on top of that"
            } );
        }

        // 3g) MixesDB knows one of the bits as a venue, so this was played somewhere rather
        // than made for a feed: "Tonino & Lanka | Ritter Butzke | Berlin" is a live recording
        // at a Berlin club, which the title itself gives no way of telling.
        var venueTitle = mdbTitle_takeVenueTitle( rest, known );

        if( venueTitle ) {
            var venueKind = venueTitle.isEvent ? "event" : "venue";

            logVar( "buildMixesdbTitle: " + venueKind + " known to MixesDB", venueTitle.venue );

            var venueGroup = venueTitle.artist + " @ " + venueTitle.venue +
                             ( venueTitle.city ? ", " + venueTitle.city : "" );

            if( dateFromUpload ) {
                // the wiki's own answer about the place: an event's trailing year is the
                // edition's and dates the recording, whether or not the name carries an
                // event word ("Fusion 2024" is an event to the wiki and to nobody else)
                var venueLive = mdbTitle_liveDate( date, venueGroup, venueTitle.isEvent );

                date = venueLive.date;
                venueGroup = venueLive.group;
                conf.drop( 10, mdbTitle_liveDateReason( venueLive.month ) );
            }

            return mdbTitle_result( date, venueGroup, "", null, false, [], conf, {
                // when the wiki's artist answer picked the bit, say so - with several bits
                // around the place, position alone is not what decided
                artist: venueTitle.artistKnown
                    ? "MixesDB knows a name in that bit as an artist, which is what picked it over the other bits around the " + venueKind
                    : "the name standing next to the " + venueKind + " is who played there",
                // The wiki is what decides this one, so the sentence names it - and it names
                // the TYPE it answered with: an event answer is what overrules the "-" the
                // uploader typed, and a reader checking that must not be told "venue".
                entity: "MixesDB knows \"" + venueTitle.venue + "\" as " + ( venueTitle.isEvent ? "an event" : "a venue" ) +
                        ", so the title reads as a set PLAYED there - " +
                        "it becomes the place behind the \" @ \", and the channel is not used as a show on top of that"
            } );
        }

        // 3g2) The same, for an event whose name carries no event word: a bit ending in a bare
        // YEAR and a bit ending in a SLOT word ("Obstgarten Closing") say together that this
        // was played at a party, and neither of them says it alone. AFTER the wiki's own
        // answer above: a name MixesDB knows is stronger evidence than two word shapes, so a
        // title carrying a known venue is read by that branch and never reaches this one. The slot goes in front of
        // the event in the group, the way MixesDB writes a stage and the festival it stands
        // on, and the page is filed under the event (mdbTitle_placeGroupEntity).
        var slotEvent = mdbTitle_takeSlotEventTitle( rest );

        if( slotEvent ) {
            logVar( "buildMixesdbTitle: slot + dated event",
                slotEvent.artist + " @ " + slotEvent.slot + ", " + slotEvent.event + " (" + slotEvent.year + ")" );

            mdbTitle_traceStep( "Read as a set played at an event",
                slotEvent.slot + " names a slot and " + slotEvent.event + " " + slotEvent.year + " an edition",
                null, [ "mdbTitleEventSlotWords" ] );

            var slotGroup = slotEvent.artist + " @ " + slotEvent.slot + ", " + slotEvent.event;

            // the group without the slot is the other reading of the same night, and only the
            // uploader knows whether the slot is worth naming
            mdbTitle_slotPartRead = { slot: slotEvent.slot, event: slotEvent.event };

            if( dateFromUpload ) {
                // played on the event's own date, uploaded whenever the recording was ready -
                // so only the year is claimed, and the event's own year is the one it states
                var slotLive = mdbTitle_liveDate( slotEvent.year || date, slotGroup, true );

                date = slotLive.date;
                slotGroup = slotLive.group;
                conf.drop( 10, mdbTitle_liveDateReason( slotLive.month ) );

            } else if( slotEvent.year && date.slice( 0, 4 ) !== slotEvent.year ) {
                conf.drop( 15, "the date in the title and the year of the event (" + slotEvent.year + ") do not match - one of them is misread" );
            }

            conf.drop( 15, "read as a live recording at an event - the title names a slot (\"" + slotEvent.slot +
                           "\") next to a year, which is what a party night looks like, but neither word list nor MixesDB knows \"" +
                           slotEvent.event + "\" as an event" );

            return mdbTitle_result( date, slotGroup, "", null, false, [], conf, {
                artist: "the bit that names neither the slot nor the dated event is who played there",
                // Two word shapes decide this, not the wiki and not an event word - the
                // sentence has to say which, or a reporter cannot check it.
                entity: "\"" + slotEvent.slot + "\" ends in a slot word and \"" + slotEvent.event +
                        "\" carries the year of an edition, so the title reads as a set PLAYED at it - " +
                        "the event is the place behind the \" @ \" and what the page is filed under"
            } );
        }

        // The same for a live recording the title itself marks with an "@" - every branch below
        // carries that "@" through into the artist group, so the question is settled here, once,
        // on the whole title. Without one the upload date stands as it is, which is right for
        // what makes up most uploads: a podcast episode goes up on its release day.
        if( dateFromUpload ) {
            if( rest.indexOf( "@" ) !== -1 ) {
                var live = mdbTitle_liveDate( date, rest );

                logVar( "buildMixesdbTitle: live recording, no date in the title", date + " -> " + live.date );
                conf.drop( 10, mdbTitle_liveDateReason( live.month ) );

                date = live.date;
                rest = live.group;

            } else if( mdbTitle_atEpisodeRead && mdbTitle_yearOf( date ) ) {
                // 2c read the title as the series it numbers itself as, but the "@" the
                // uploader typed still says the set was PLAYED at that show - and a set played
                // somewhere goes up whenever the recording is ready. So the day is not claimed
                // here either: the year is what both readings agree on. No month is read out of
                // the rest the way mdbTitle_liveDate reads one out of a place group - outside a
                // place name a bare month is part of a name far more often than it is a date.
                logVar( "buildMixesdbTitle: \"@\" over a numbered episode, only the year is claimed", date + " -> " + mdbTitle_yearOf( date ) );
                conf.drop( 10, "only the year is known - the title's \"@\" says the set was played at the show it " +
                               "numbers, and a set played somewhere is uploaded whenever the recording is ready, " +
                               "not on the day it was played" );

                date = mdbTitle_yearOf( date );

            } else {
                conf.drop( 15, uploadDateReason );
            }
        }

        // 3h) A place list in a NON-live title says where the artist is from, which a mix page
        // title does not carry: "DJ MIX #679 - Miss Luna | Ibiza/ Dusseldorf, Germany" (the
        // bracket became a chunk in 1b) plays nowhere, so the chunk goes. After the joiners and
        // the event/venue branches, because "no @" is what says the title is not a live
        // recording - on a live one the places are the venue's city and country, which MixesDB
        // writes ("@ Ritter Butzke, Berlin"). See mdbTitleCountries in title_definitions.js.
        if( rest.indexOf( "@" ) === -1 ) {
            var locations = mdbTitle_dropLocationChunks( rest );

            if( locations.dropped.length ) {
                logVar( "buildMixesdbTitle: location chunks dropped", locations.dropped.join( " | " ) );
                conf.drop( 3, "\"" + locations.dropped.join( "\", \"" ) + "\" was left out - it says where the artist is from, which a mix page title does not carry" );

                // A LONE country is the one a live reading would carry behind the place, as the
                // place group's own country - kept for the "Switch title" chip, which is the
                // only reader. A place list is a byline in every reading and is not kept.
                for( var lc = 0; lc < locations.dropped.length; lc++ ) {
                    if( mdbTitle_isCountry( locations.dropped[lc] ) ) mdbTitle_locationDropped = locations.dropped[lc];
                }

                // The chunk section's "Removed:" line already names what the shared split
                // took out - a step here would say it twice. Only drift is worth a line: a
                // chunk the split KEPT (its live-title reading is an approximation of this
                // guard) but the parse drops after all.
                var locationsNotShown = [],
                    li, lr, seen;

                for( li = 0; li < locations.dropped.length; li++ ) {
                    seen = false;

                    for( lr = 0; lr < chunkSplit.removed.length; lr++ ) {
                        if( chunkSplit.removed[lr].reason === "location" &&
                            mdbTitle_normalizeCompare( chunkSplit.removed[lr].text ) === mdbTitle_normalizeCompare( locations.dropped[li] ) ) {
                            seen = true;
                            break;
                        }
                    }

                    if( !seen ) locationsNotShown.push( locations.dropped[li] );
                }

                if( locationsNotShown.length ) {
                    mdbTitle_traceStep( "Location chunk dropped", locationsNotShown.join( " | " ),
                        null, [ "mdbTitleCountries" ] );
                }

                rest = locations.text;
                mdbTitle_traceCleaned( rest );
            }
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
        // An "@" rules the branch out: there the title is not the name of something they made,
        // it is the place they played at, and the artist is already standing in front of it.
        // "DJ Set @ What Happens Label Night 2026" on the channel "Alex Esser" would otherwise
        // come out as "Alex Esser - Alex Esser @ What Happens Label Night 2026".
        if( !taken.taken && rest.indexOf( "@" ) === -1 && mdbTitle_knownAs( known, username ) === "artist" ) {
            var ownEntity = mdbTitle_cleanArtist( rest );

            if( ownEntity ) {
                logVar( "buildMixesdbTitle: MixesDB knows the channel as an artist", username );

                // "better left off than wrongly put on" (comment above) is still a close
                // call - the exit offers the promo reading as a switchable alternative
                mdbTitle_promoDeclined = true;

                return mdbTitle_result( date, username, ownEntity, null, false, extraArtists, conf, {
                    artist: "MixesDB knows the channel \"" + username + "\" as an artist, and the title names nobody else",
                    entity: "with the channel as the artist, what the title says is the name of what they made"
                } );
            }
        }

        // 4a2) The channel name opens the title and "pres." introduces a numbered SERIES:
        //   "Lilly Palmer pres. Spannung Radio Show #069"  (channel "Lilly Palmer")
        //   -> 2026-08-14 - Lilly Palmer - Spannung Radio 069
        // The channel is the ARTIST there, presenting a show of their own, and the series is
        // the entity - the words stay in the order they stand, nothing is moved around the
        // number. "fabric presents Bonobo" is the other reading: what follows is a bare NAME,
        // so the channel is the presenter and the name the artist (the fall-through below,
        // via mdbTitle_cleanArtist). The episode number is what tells the two apart - only a
        // series is presented episode by episode. The keyword that carried the number goes
        // with it ("Radio Show #069" -> "Radio 069"): it stood there to introduce the number,
        // and the name in front of it is the name the wiki files the show under.
        // See "The channel presenting a numbered series" in title_definitions.js.
        if( taken.taken && !isMappedChannel && !guestArtist ) {
            var presSeries = /^\s*(?:presents?|pres\.?)\s+(\S.*)$/i.exec( taken.text );

            if( presSeries ) {
                var presEpisode = mdbTitle_findEpisode( presSeries[1], true ),
                    presEntity = presEpisode &&
                        mdbTitle_cleanArtist( mdbTitle_cut( presSeries[1], presEpisode.index, presEpisode.length ) );

                if( presEntity ) {
                    logVar( "buildMixesdbTitle: the channel presents a numbered series", presEntity + " " + presEpisode.text );

                    return mdbTitle_result( date, taken.show, presEntity,
                                            { text: presEpisode.text, kind: presEpisode.kind },
                                            false, extraArtists, conf, {
                        artist: "the channel's own name stands in the title, in front of \"presents\"",
                        entity: "what the channel presents is numbered (" + presEpisode.text + "), and only a series is presented episode by episode"
                    } );
                }

                // No episode number, but the name itself carries a series WORD: "Mat.Theo
                // present UNCODED BIRTHDAY Radioshow" presents a show - a guest would be a
                // bare NAME, and nobody is called "... Radioshow". The word does the number's
                // job, so the channel is the artist here too. A monthly-edition stamp behind
                // the name ("(JUNE 26)", a chunk of its own by now) dates the edition the way
                // a number counts one and goes the same way - the date group already carries
                // when the mix is from. Digits alone decide nothing here, unlike the word:
                // "X presents Bonobo 2026" still reads as a guest.
                var presMonthly = mdbTitle_takeMonthlyEdition( presSeries[1], date ),
                    presWordEntity = mdbTitle_hasSeriesWord( presMonthly.text )
                        ? mdbTitle_cleanArtist( presMonthly.text ) : "";

                if( presWordEntity ) {
                    logVar( "buildMixesdbTitle: the channel presents a series named by its word", presWordEntity );

                    if( presMonthly.taken ) {
                        conf.drop( 5, "\"" + presMonthly.stamp + "\" was read as the edition's month, not as part of the name - the date group already carries when the mix is from" );
                    }

                    return mdbTitle_result( date, taken.show, presWordEntity, null, false, extraArtists, conf, {
                        artist: "the channel's own name stands in the title, in front of \"presents\"",
                        entity: "what the channel presents carries a series word, and a series is the channel's own show - a guest would be a bare name"
                    } );
                }
            }
        }

        // 4b) The channel name is in the title, but PLAIN - no "Podcast"/"Radio"/... behind it
        // and no entry in mdbTitleUsernameConversions saying it is a show. Then the channel is the
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
            // names a venue/event (@), is recognisably a series, or is one the wiki KNOWS as
            // a podcast/show/radio
            promoMix = !!entity &&
                       entity.indexOf( "@" ) === -1 &&
                       !/\b(podcast|radio|radioshow|show|sessions|series|cast|fm)\b/i.test( entity ) &&
                       !/promo\s*mix/i.test( entity ) &&
                       !mdbTitle_knownEntityType( known, entity );

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
            return mdbTitle_result( date, taken.show, entity, null, promoMix, extraArtists, conf, {
                artist: "the channel's own name stands in the title - the uploader and the title say the same thing",
                entity: promoMix
                        ? "what is left of the title once the channel's name is out of it - it is no known show, venue or event, so the page is filed as a Promo Mix"
                        : "what is left of the title once the channel's name is out of it"
            } );
        }

        // 4c) The channel name is in the title and an episode number is too, but they stand in
        // DIFFERENT bits of it:
        //   "The Sound of Rome #147 - Ricky Montana"  on the channel "Ricky Montana"
        // A number belongs to the name it stands next to, so the numbered bit is the series and
        // the channel - a person, standing in a bit of their own - is who played it:
        //   -> 2026-08-12 - Ricky Montana - The Sound of Rome 147
        // This is the mirror of "LIMB #9 – Yuka" on the channel "LIMB", where the number stands
        // in the channel's OWN bit and the channel therefore IS the series. That pair is also
        // why 4b steps aside as soon as a number turns up anywhere: which of the two the
        // channel is cannot be read off the shape of the title, but WHERE the number sits says
        // it outright.
        // Two bits, or THREE where one of them is the channel's: the number picks the series
        // out and the channel picks itself out, so with three bits exactly one is left over
        // and that one is the artist:
        //   "DEEP & HAZY - Undercurrent #5 - ALEXANDER BOGDANOV"  on the channel "DEEP & HAZY"
        //   -> 2026-07-02 - Alexander Bogdanov - Undercurrent 5
        // The channel then names neither the artist nor the series and is dropped - it is the
        // crew or label the series is put out by, which a mix page title does not carry.
        // Reported on exactly that title, where the number left its own bit to hang itself on
        // the channel ("DEEP & HAZY 5") while the two remaining bits glued into one artist.
        // Four bits are a guess again: there is then more than one leftover and nothing says
        // which of them is the name. A number written ONTO the channel name ("Trommel.251")
        // never gets here - it left the title together with the name.
        var groupCount = mdbTitle_countGroups( restWithShow );

        if( taken.taken && !taken.episode && !isMappedChannel && !guestArtist &&
            restWithShow.indexOf( "@" ) === -1 && ( groupCount === 2 || groupCount === 3 ) ) {

            var titleEpisode = mdbTitle_findEpisode( restWithShow, true ),
                channelBit = mdbTitle_bitAt( restWithShow, taken.index );

            if( titleEpisode ) {
                var numberBit = mdbTitle_bitAt( restWithShow, titleEpisode.index );

                if( numberBit.start !== channelBit.start ) {
                    // The episode KEYWORD stays in the series name unless it only counts, the
                    // same call 5b makes with mdbTitleCounterWords: "Drumcomplexed Radio Show
                    // 311" is episode 311 of "Drumcomplexed Radio Show", while "Slave To The
                    // Rhythm Episode 72" is episode 72 of "Slave To The Rhythm". The cut ran
                    // over the whole match, so it took the word with the number and left a
                    // series nobody ever wrote - reported 2026-08-19 on that Drumcomplex title,
                    // where "Drumcomplexed Radio" is no category and the real one holds 311 mixes.
                    var keptWord = ( titleEpisode.word && !mdbTitle_isCounterWord( titleEpisode.word ) )
                                       ? titleEpisode.word.length : 0,
                        // the number goes with the series, so it comes out of the name here and
                        // is written back behind it by mdbTitle_assemble
                        numberedSeries = mdbTitle_cleanArtist(
                            mdbTitle_cut( numberBit.text,
                                          titleEpisode.index - numberBit.start + keptWord,
                                          titleEpisode.length - keptWord ) ),
                        // with two bits the channel IS the artist, with three it is the bit
                        // that is neither the channel's nor the series'
                        leftoverBit = null,
                        allBits = mdbTitle_bits( restWithShow ),
                        b;

                    for( b = 0; groupCount === 3 && b < allBits.length; b++ ) {
                        if( allBits[b].start !== channelBit.start && allBits[b].start !== numberBit.start ) {
                            leftoverBit = mdbTitle_cleanArtist( allBits[b].text );
                        }
                    }

                    var pairArtist = groupCount === 3 ? leftoverBit : taken.show;

                    if( numberedSeries && pairArtist ) {
                        logVar( "buildMixesdbTitle: the number is in the other bit, so the channel is not the series",
                                pairArtist + " | " + numberedSeries + " " + titleEpisode.text );

                        // ... but not where the series is a bare word ("<channel> | Podcast
                        // #12 | <name>"): the exit puts the channel name in front of it, so
                        // it was never dropped and saying so contradicts the line the exit
                        // writes (mdbTitle_growBareSeriesEntity).
                        if( groupCount === 3 && !mdbTitle_isBareSeriesName( numberedSeries ) ) {
                            conf.drop( 5, "the channel name was dropped - it stands in a bit of its own next to a numbered series and a name, so it is neither of the two" );
                        }

                        return mdbTitle_result( date, pairArtist, numberedSeries,
                                                { text: titleEpisode.text, kind: titleEpisode.kind },
                                                false, extraArtists, conf, {
                            artist: groupCount === 3
                                    ? "the channel and the numbered series each stand in a bit of their own, so the bit left over is who played it"
                                    : "the channel's own name stands in the title, and the episode number belongs to the other bit",
                            entity: "the bit carrying the episode number (" + titleEpisode.text + ") is the series"
                        } );
                    }
                }
            }
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
            afterEpisode = "",
            // the series word 5a2 joined to the channel name, for the pick sentence at the
            // assembly - "the channel's own name stands in the title too" is only half of it
            showGrewWord = "";

        if( episode ) {
            logVar( "episode (" + episode.kind + ")", episode.text );
        }

        if( foundEpisode ) {
            beforeEpisode = rest.slice( 0, foundEpisode.index );
            afterEpisode = rest.slice( foundEpisode.index + foundEpisode.length );
            rest = mdbTitle_cut( rest, foundEpisode.index, foundEpisode.length );
        }

        // 5a2) The series word carrying the number stands AWAY from the channel name:
        //   "Bassiani invites Victor / Podcast #323"  (channel "BASSIANI")
        //   WRONG: 2026-08-13 - Victor - Bassiani 323
        //   RIGHT: 2026-08-13 - Victor - Bassiani Podcast 323
        // The word names the show together with the channel exactly as it does when the two
        // stand next to each other ("HATE Podcast 496" -> the show "HATE Podcast",
        // mdbTitle_takeShowOutOfTitle's allowExtend). Which bit the uploader put it in says
        // nothing about that - and the cut above takes the word out of the title along with
        // its number, so without this it is simply lost and the bare channel name is left
        // standing as the show. That is the worse of the two errors by far: "Podcast 323" is
        // an episode of nothing, and MixesDB has no Category:Podcast to file it under, while
        // Category:Bassiani Podcast holds the other 94 episodes.
        // Same fences as the adjacent case: a mapped channel is curated and never gains a
        // word from the title, a show that already carries one is left alone, and a word that
        // only COUNTS ("Episode 72") is no part of any name (mdbTitleCounterWords).
        if( foundEpisode && foundEpisode.word && taken.taken && !taken.extended && !isMappedChannel &&
            mdbTitle_isSeriesWordToken( foundEpisode.word ) && !mdbTitle_isCounterWord( foundEpisode.word ) &&
            show && !mdbTitle_hasSeriesWord( show ) ) {

            var grownShow = show + " " + mdbTitle_toNormalCase( foundEpisode.word );

            logVar( "buildMixesdbTitle: the series word stands in another bit, it names the show with the channel",
                    show + " -> " + grownShow );
            mdbTitle_traceStep( "Series word joined to the channel name", show + " -> " + grownShow,
                { from: show, to: grownShow, words: [ foundEpisode.word ] }, [ "mdbTitleShowSuffixWords" ] );

            show = grownShow;
            // the show DID gain a word from the title, which is what "extended" records - the
            // readers below all ask "extended || taken", so nothing changes behind this
            taken.extended = true;
            showGrewWord = foundEpisode.word;
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
        // mdbTitleCounterWords - "Truancy Volume 300" keeps its "Volume".
        if( episode && ( episode.word || episode.marked ) && !taken.taken ) {
            var showFromTitle = mdbTitle_cleanArtist( beforeEpisode ),
                // Normal Case for the keyword, exactly as mdbTitle_takeShowOutOfTitle does with
                // the same words: it is a common noun off a curated list, so "SOME PODCAST 12"
                // gives the show "Some Podcast" and not "Some PODCAST". The show NAME in front
                // of it is a name we know nothing about and is not touched here.
                // A "#" episode may carry no keyword at all ("Familycast #048") - the "#" is
                // then the whole marker and nothing joins the show name.
                episodeWord = ( !episode.word || mdbTitle_isCounterWord( episode.word ) ) ? "" : " " + mdbTitle_toNormalCase( episode.word ),
                // "by" does the job of a separator here: "Some Podcast 12 by Someone" names its
                // artist without one. See the "by" block in title_definitions.js for which one
                // counts - the flags are what keeps the "By" of a name out.
                artistAfter = new RegExp( "^\\s*(?:[" + mdbTitle_sepInner + ",]+|by\\b)\\s*(.+)$",
                                          mdbTitle_byMarkerFlags( afterEpisode ) ).exec( afterEpisode );

            // A "#" writes the digits as a pure episode number, so a bare name behind them is
            // the artist even with nothing but a space in between: "Multisexual Mix #39
            // Vaahzer" is the shape of "HATE Podcast 496 Fadi Mohem", it just never named its
            // channel. Only with the "#": behind an unmarked number a word is far more often
            // part of the name ("Deep House Mix 2 Hours") than an artist glued on, so there a
            // separator or a "by" stays required.
            if( !artistAfter && episode.marked ) {
                artistAfter = /^\s+(\S.*)$/.exec( afterEpisode );
            }

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

            var splitParts = rest.split( mdbTitle_bitSplitRe() ),
                // A lowercase "by" is the separator where the uploader typed none:
                // "Guestroom 779 by Sascha Sibler" on the channel "PRIVATEPLACES Mixtapes".
                // Only asked when nothing else split the title - a title that HAS separators is
                // already read by the bits it was written in. See the "by" block in
                // title_definitions.js for which "by" counts; the flags are what keeps the "By"
                // of a name ("Stand By Me") out. Non-greedy, so the FIRST one splits.
                byMatch = splitParts.length === 1
                            ? new RegExp( "^(.+?)\\s+by\\s+(.+)$", mdbTitle_byMarkerFlags( rest ) ).exec( rest )
                            : null,
                // ... and what stands in front of it has to look like a SERIES or a mix - a
                // number or a series word. A lowercase "by" is an ordinary English preposition
                // as well ("Live by the Sea", "Side by Side"), and with no separator in the
                // title there is nothing else left to tell the two apart. The number is what
                // says that something numbered its episodes and a name follows.
                bySplit = ( byMatch && mdbTitle_seriesScore( byMatch[1] ) > 0 ) ? byMatch : null;

            if( bySplit ) splitParts = [ bySplit[1], bySplit[2] ];

            if( splitParts.length === 2 ) {
                var leftPart = mdbTitle_cleanArtist( splitParts[0] ),
                    rightPart = mdbTitle_cleanArtist( splitParts[1] ),
                    leftScore = mdbTitle_seriesScore( leftPart ),
                    rightScore = mdbTitle_seriesScore( rightPart );

                if( leftPart && rightPart ) {
                    var splitArtist, splitEntity, splitPromo, splitWhy;

                    // A bit named as the guest artist is the artist, whatever else it looks
                    // like: "RAW-ARTES GUEST MIX" would otherwise read as a series of its own.
                    if( guestArtist && mdbTitle_normalizeCompare( leftPart ) === mdbTitle_normalizeCompare( guestArtist ) ) {
                        leftScore = -1;
                    } else if( guestArtist && mdbTitle_normalizeCompare( rightPart ) === mdbTitle_normalizeCompare( guestArtist ) ) {
                        rightScore = -1;
                    }

                    if( bySplit ) {
                        // The "by" says which side is which outright, so the scores are not
                        // asked: what stands in FRONT of it was made, who stands behind it made
                        // it. They would mostly agree ("Guestroom 779" carries the number), but
                        // not always - "Guestroom 779 by Radio Slave" has a series word in the
                        // NAME and would come out backwards. Nothing is charged, exactly as in
                        // the score branch: the word IS the answer, nothing was guessed.
                        // No "(Promo Mix)" either - the guard above let this through because the
                        // entity reads as a series, which is the opposite of a self-released mix.
                        splitArtist = rightPart;
                        splitEntity = leftPart;
                        splitPromo = false;
                        splitWhy = {
                            artist: "\"by\" names them as who made it",
                            entity: "\"by\" says that what stands in front of it is what was made"
                        };

                    } else if( leftScore !== rightScore ) {
                        // the side that looks more like a series is the show. Told apart by
                        // the title itself, so nothing was guessed and nothing is charged -
                        // swapping the two groups around is not a doubt about the result.
                        splitArtist = leftScore > rightScore ? rightPart : leftPart;
                        splitEntity = leftScore > rightScore ? leftPart : rightPart;
                        splitPromo = false;
                        splitWhy = {
                            artist: "the other half of the title looks more like a series name than this one",
                            entity: "of the title's two halves this one looks more like a series name (a number, or a word like \"Podcast\")"
                        };
                    } else {
                        // neither side looks like a series, so this is the order alone
                        splitArtist = leftPart;
                        splitEntity = rightPart;
                        splitPromo = !/promo\s*mix/i.test( splitEntity ) &&
                                     !mdbTitle_knownEntityType( known, splitEntity );

                        conf.drop( 10, "nothing in the title says which half is the artist - it was read in the order they stand" );
                        splitWhy = {
                            artist: "nothing in the title says which half is which, so the FIRST half was read as the artist",
                            entity: "nothing in the title says which half is which, so the SECOND half was read as the show"
                        };
                    }

                    logVar( "buildMixesdbTitle: title splits into artist/entity, channel not used", splitArtist + " | " + splitEntity );
                    if( splitPromo ) {
                        conf.drop( 10, "\"(Promo Mix)\" is assumed - it is not a known show, venue or event" );
                    }

                    return mdbTitle_result( date, splitArtist, splitEntity, null, splitPromo, extraArtists, conf, splitWhy );
                }
            }
        }

        // Where the show name ultimately came from decides how much it can be trusted.
        // One branch only - taken.extended implies taken.taken, so an if/else chain keeps the
        // same fact from being charged twice.
        //
        // The spread here is deliberately SMALL. mdbTitleUsernameConversions is a patch list of
        // channels that earlier versions got wrong, not a register of everything that is a
        // real show - so a channel missing from it says nothing much, and a big penalty for
        // that would mostly measure how far the list has been filled in rather than how well
        // the title was read. Being listed still confirms the entity, so it stays the best of
        // the branches, just barely.
        var unknownShowReason = "";

        if( isMappedChannel ) {
            // curated by hand in title_definitions.js - nothing to doubt
        } else if( showFromEpisodeRule ) {
            // "<Show> <Word> <Number> - <Artist>" was READ off the title, not guessed at: the
            // number and the separator say which part is which. Costs nothing.
        } else if( taken.extended || taken.taken ) {
            // the channel name is in the title too, which is confirmation from the title
            // itself - as good as finding the channel in the list
        } else if( show && mdbTitle_knownEntityType( known, show ) ) {
            // the wiki files it as a podcast/show/radio, which answers the doubt the list
            // exists for - nothing to charge
        } else if( show ) {
            // Not charged here: the branches below still drop the channel from a title that
            // does not need it, and a doubt about a name that never made it into the
            // suggestion is not a doubt about the suggestion. Charged at the assembly, and
            // only if the name is still standing there ("M_P_M" is not, in
            // "1999-10-09 - Thomas Bangalter @ WE, Dolton Expo Center, Chicago").
            unknownShowReason = "the channel \"" + show + "\" is not in the known-shows list - it may not be a show name at all";
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
        var seriesName = mdbTitle_joinArtists( mdbTitle_cleanArtist( restWithEpisode ), extraArtists ),
            // "Mix August 2026": a mix word and a date and nothing else - no name at all, so
            // the month IS the name and the word goes behind it. Nothing is dropped here.
            dated = mdbTitle_datedMixName( seriesName ),
            // "<name> Mix August 2026": a series stamps its edition with the month instead of
            // a number, and the stamp reads exactly like the number does - the title is a
            // series and names nobody, so the channel is the artist. The stamp itself leaves
            // the name: the date group is what carries when the mix is from.
            monthly = mdbTitle_takeMonthlyEdition( seriesName, date );

        if( show && seriesName && !isMappedChannel && !taken.taken && !showFromEpisodeRule &&
            seriesName.indexOf( "@" ) === -1 &&
            mdbTitle_seriesScore( show ) === 0 &&
            ( !!foundEpisode || dated.taken || monthly.taken || mdbTitle_looksNumberedSeries( seriesName ) ) ) {

            // The dated mix first: it is the narrower shape of the two (the WHOLE name is the
            // word and the date), and there the stamp is the only name there is - so it is
            // moved, never stripped.
            if( dated.taken ) {
                seriesName = dated.text;
                conf.drop( 5, "the title is a mix word and a date and names nothing else - the month was read as the mix's name, with the word behind it as MixesDB writes it" );

            } else if( monthly.taken ) {
                seriesName = monthly.text;
                conf.drop( 5, "\"" + monthly.stamp + "\" was read as the edition's month, not as part of the name - the date group already carries when the mix is from" );
            }

            // A numbered series on a channel that is not a show is someone putting out their
            // own mixes, so it belongs in Category:Promo Mix - but only when the name SAYS so
            // ("Vol.14", "Mix"). The artist here was inferred rather than read off the title,
            // and writing " (Promo Mix)" into the title on top of that would stack a guess on a
            // guess. mdbTitle_result keeps the category and leaves the title alone for exactly
            // the names that already say it.
            var seriesPromo = mdbTitle_saysPromoMix( seriesName );

            // ... and the stacked guess it refused is exactly what the exit offers as a
            // switchable alternative - the self-released reading was decided against, not
            // ruled out
            if( !seriesPromo ) mdbTitle_promoDeclined = true;

            logVar( "buildMixesdbTitle: the title is a numbered series, so the channel is the artist", show );
            conf.drop( 5, "the title reads as a " +
                          ( dated.taken ? "dated" : monthly.taken ? "monthly" : "numbered" ) +
                          " mix and names nobody, so the channel was taken as the artist" );

            return mdbTitle_result( date, show, seriesName, null, seriesPromo, [], conf, {
                artist: "the title is a numbered series and names nobody, so the channel was taken as who made it",
                entity: "the title is the series name, with its number written behind it"
            } );
        }

        // leftovers in the artist mean the title was not fully understood
        if( /[|\/:]|\[|\]/.test( artist ) ) {
            conf.drop( 10, "the artist still contains separators - part of the title may belong elsewhere" );
        }
        if( /\d/.test( artist ) ) {
            conf.drop( 5, "the artist still contains numbers - possibly a leftover date or episode" );
        }
        // A venue group is "@ Venue, City" on MixesDB, and a player title hardly ever spells the
        // city out - so what is worth flagging is the city MISSING, not the "@" being there.
        // The "@" itself is not charged here at all: where it was read into the title out of an
        // "at"/"Live at" the joiner drop above already said so, and where the uploader typed it
        // nothing was guessed. "@ WE, Dolton Expo Center, Chicago" names the place down to the
        // city and leaves nothing to look up.
        if( artist.indexOf( "@" ) !== -1 && artist.slice( artist.indexOf( "@" ) ).indexOf( "," ) === -1 ) {
            conf.drop( 5, "no city/country behind the venue/event - MixesDB writes \"@ Venue, City\", and a player title rarely spells the city out" );
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

        // The channel not being a known show only matters now that it is settled whether the
        // channel is IN the title at all - the branches above just dropped it from three kinds
        // of title that carry their own entity.
        if( show && unknownShowReason ) {
            conf.drop( 5, unknownShowReason );
        }

        // 7) assemble
        // Where the show came from is the same fact unknownShowReason is built on, so the two
        // are decided from the same flags - a reader must not be told the channel is mapped by
        // one line and doubted for not being a known show by the other.
        return mdbTitle_result( date, artist, show, episode, false, extraArtists, conf, {
            // a guest marker or a host's "invites" already named them - that is a stronger
            // answer than "whatever was left over", and it is the one the reader needs
            artist: ( guestArtist && mdbTitle_normalizeCompare( artist ) === mdbTitle_normalizeCompare( guestArtist ) )
                    ? "the title names them as the guest, and the guest is who played the mix"
                    : "what the title names once the date, the decoration and the show name are out of it",
            entity: !show ? ""
                    : isMappedChannel ? "the channel \"" + username + "\" is mapped to this show by hand (curated list, section 2)"
                    : showFromEpisodeRule ? "the title reads \"<Show> <Word> <Number> - <Artist>\", so what stands in front of the number is the show"
                    : showGrewWord ? "the channel's own name stands in the title, and the \"" + showGrewWord +
                                     "\" the episode number hangs on is what the show is called - the two name it together, " +
                                     "whichever part of the title the uploader wrote them in"
                    : ( taken.extended || taken.taken ) ? "the channel's own name stands in the title too"
                    : "the title carries no show of its own, so the channel it was uploaded to was taken as the one it belongs to"
        } );

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

    // an empty group anywhere leaves a double space behind, and a trailing separator a trailing
    // space - neither belongs in a page title, whatever put it there
    out = out.replace( /\s+/g, " " ).trim();

    logVar( "mdbTitle_assemble result", out );
    return out;
}

// mdbTitle_reducePlaceGroup
// "A @ Elsewhere Loft" -> "A @ Elsewhere": the room a set was played in, taken off the place
// group so the title names the venue MixesDB files it under. Returns the group unchanged
// whenever the wiki does not back the swap, which is most titles.
//
// Both halves of the condition have to hold, and the wiki answers both: the name the title
// carries is no category at ALL (a venue really called "... Garden" answers for itself and
// keeps its word), and the base IS one - as a venue or an event, never as an artist, since
// what stands behind the "@" is the place. Without the second half this would shorten a name
// nobody knows into another name nobody knows.
//
// The FIRST part of the group only, the one the page is filed under (mdbTitle_placeGroupEntity):
// "@ Venue, City" keeps its city, and the venue behind a festival is not what decides the
// filing either. Sits at the single exit rather than in the branches, so every reading that
// composes a place group - the "Live at" joiner, the venue branch, the event branch - is
// covered by the one rule.
function mdbTitle_reducePlaceGroup( group ) {
    var known = mdbTitle_knownNow,
        text = String( group || "" ),
        at = text.indexOf( " @ " );

    if( !known || at === -1 ) return text;

    var place = text.slice( at + 3 ),
        comma = place.indexOf( "," ),
        first = mdbTitle_trimSeparators( comma === -1 ? place : place.slice( 0, comma ) ),
        rest = comma === -1 ? "" : place.slice( comma );

    // the wiki knowing the place under any type at all settles it - the name is a category,
    // and a category is never shortened
    if( !first || mdbTitle_knownAs( known, first ) ) return text;

    var space = mdbTitle_venueSpaceBase( first );

    if( !space ) return text;

    var match = mdbTitle_knownMatch( known, space.base, [ "venue", "event" ] );

    if( !match ) return text;

    // in the wiki's own spelling, like every name an answer backs
    var venue = mdbTitle_canonicalName( known, space.base, [ "venue", "event" ] );

    mdbTitle_placeWordDropped = { word: space.word, place: venue, full: first };

    return text.slice( 0, at + 3 ) + venue + rest;
}

// mdbTitle_reduceLineupFraction
// "1/2 Faultierdisko @ 3000Grad Festival" -> "Faultierdisko @ 3000Grad Festival": the act
// behind a line-up fraction, so the title names what MixesDB files the page under. Returns the
// group unchanged whenever the wiki does not back the swap, which is every other title.
//
// Same two halves as the room reduction above, asked of the same cache: the name the title
// carries is no category at ALL, and the base IS one - as an ARTIST, since what stands here is
// who played. Without the second half this would shorten a name nobody knows into another name
// nobody knows.
//
// Only where the artist group is ONE name. A fraction in front of a list ("1/2 A & B") says
// nothing about which of the names it belongs to, and guessing that is worse than leaving the
// title as the uploader wrote it.
//
// No "Switch title" chip comes back from this, unlike the room word: MixesDB writes a room
// where it is worth naming, but it writes no line-up fraction anywhere - once the wiki has
// named the act, the fraction is a note about this recording and not a second reading of the
// title.
function mdbTitle_reduceLineupFraction( group ) {
    var known = mdbTitle_knownNow,
        text = String( group || "" ),
        at = text.indexOf( " @ " );

    if( !known ) return text;

    var name = mdbTitle_trimSeparators( at === -1 ? text : text.slice( 0, at ) ),
        rest = at === -1 ? "" : text.slice( at );

    if( !name || mdbTitle_splitArtists( name ).length !== 1 ) return text;

    // the wiki knowing the written name under any type at all settles it - the name is a
    // category, and a category is never shortened
    if( mdbTitle_knownAs( known, name ) ) return text;

    var lineup = mdbTitle_lineupFractionBase( name );

    if( !lineup || !mdbTitle_knownMatch( known, lineup.base, [ "artist" ] ) ) return text;

    return mdbTitle_canonicalName( known, lineup.base, [ "artist" ] ) + rest;
}

// mdbTitle_seriesIdPrefix
// The episode-id prefix a category's own page titles carry, or "": every page of
// Category:Deep Space Series is titled "... - Deep Space Series (DSS 012)", so that series
// writes its episodes as "(DSS <n>)" and the prefix is "DSS". Read off the `recent` titles
// the mdbnames answer already carries, so it costs no request of its own.
//
// The pages have to AGREE - one bracket is a qualifier or a one-off, several carrying the
// same letters are a scheme - and two is the bar, because a category holding two pages that
// both write it has no third to ask. Their AGE is not asked about at all: a page titled
// "Deep Space Series (DSS 012)" says how this series is written whatever year it was
// written in, and that is a different question from whether its conventions are still
// current (which is what mdbPageCreator_recentStaleBy is for).
function mdbTitle_seriesIdPrefix( match ) {
    var titles = ( match && match.recent ) || [],
        nameKey = mdbTitle_normalizeCompare( String( ( match && match.title ) || "" ) ),
        counts = {},
        // the letters as the PAGES write them, keyed by their comparison form: the wiki's own
        // spelling of the id is the one the new title gets, exactly as with a category name
        spellings = {},
        top = "",
        i, bracket, id, key;

    if( !nameKey || titles.length < 2 ) return "";

    for( i = 0; i < titles.length; i++ ) {
        // the page's own entity slot, which is where a MixesDB title carries the series
        bracket = /^(.*?)\s*\(([^()]*)\)$/.exec( mdbTitle_titleCategories( titles[i] ).entity );

        if( !bracket || mdbTitle_normalizeCompare( bracket[1] ) !== nameKey ) continue;

        // the letters in front of the number: "DSS 012" -> "DSS", "RA.971" -> "RA"
        id = /^([A-Za-z]{2,})[\s.#-]*\d{1,5}$/.exec( mdbTitle_trimSeparators( bracket[2] ) );

        if( !id ) continue;

        key = id[1].toUpperCase();
        counts[key] = ( counts[key] || 0 ) + 1;
        if( !spellings[key] ) spellings[key] = id[1];

        if( !top || counts[key] > counts[top] ) top = key;
    }

    return ( top && counts[top] >= 2 ) ? spellings[top] : "";
}

// mdbTitle_expandChannelAcronym
// "DSS 140" on the channel "Deep Space Series" -> entity "Deep Space Series" with the id
// "DSS 140" kept in brackets, the way MixesDB writes "RA Podcast (RA.971)". Reported
// 2026-08-20 on "DSS 140 | Space Drum Meditation", which filed under a lone "DSS" while
// Category:Deep Space Series held the episodes.
//
// TWO signals can say the letters are the channel's series, and they are not worth the same:
//
// 1. **The category's own pages write their episodes that way** - all 8 of Deep Space
//    Series' are titled "... - Deep Space Series (DSS <n>)". That is not an inference at
//    all, it is the wiki's own titles saying the id belongs to this series, so it decides
//    FIRST and costs no confidence. It does not care how old those pages are: a title
//    written in 2016 spells the series the same way a 2026 one does, and this upload's own
//    number carries on from theirs.
// 2. **The letters spell the channel name's initials** - the fallback, for a series MixesDB
//    knows without having a page that writes the id (a category filled from another
//    platform, a series whose pages predate the abbreviation). This one IS an inference -
//    "DSS" resembling "Deep Space Series" is not evidence that it means it - so it is only
//    reached when no page says otherwise, and it costs confidence. mdbTitle_isChannelInitials
//    demands the title write them in CAPS, so a word that merely starts like the channel
//    never reads as its abbreviation.
//
// Three fences hold whichever signal answered: the letters are NO series category of their
// own (a show really called by them keeps them - the title's own words win), the channel
// name IS one (mdbTitle_entityTypes), and the artist is not the channel itself (there the
// channel was read as who played, and one name cannot be both groups at once).
//
// Returns { entity, episode, type, acronym, scheme } or null - scheme being the id prefix
// the pages agreed on, i.e. which of the two signals answered. The number usually sits
// inside the entity ("DSS 140" arrives whole from the artist/entity split); an episode
// already cut out of the title is folded back into the id the way the title wrote it,
// digits untouched.
function mdbTitle_expandChannelAcronym( artist, entity, episode ) {
    var known = mdbTitle_knownNow,
        channel = mdbTitle_channelUsed;

    if( !known || !channel || !entity || entity.indexOf( "@" ) !== -1 ) return null;

    var acro, id;

    if( !episode ) {
        acro = mdbTitle_stripTrailingNumber( entity );

        if( !acro || acro === entity ) return null;

        id = entity;
    } else if( episode.kind === "number" || episode.kind === "dotted" ) {
        acro = entity;
        id = entity + ( episode.kind === "dotted" ? "." : " " ) + episode.text;
    } else {
        // an id episode already carries its own series spelling - nothing to expand
        return null;
    }

    // whatever answers below, what stands here has to be one word of letters
    if( !/^[A-Za-z]{2,}$/.test( acro ) ) return null;

    // the channel is this title's ARTIST reading - a name cannot be both groups at once
    if( mdbTitle_normalizeCompare( artist ) === mdbTitle_normalizeCompare( channel ) ) return null;

    // the letters themselves are a series category -> the title's own words win. Only an
    // answer about THIS name blocks it: "DSS" answered with the wiki's qualified
    // "DSS (Das Schwarze Schaf)" is the wiki offering its OTHER DSS, not this series.
    var acroMatch = mdbTitle_knownMatch( known, acro, mdbTitle_entityTypes );

    if( acroMatch && mdbTitle_normalizeCompare( String( acroMatch.title || "" ) ) === mdbTitle_normalizeCompare( acro ) ) return null;

    // ... and the channel name IS one - the wiki confirming the full name is the filing
    var channelMatch = mdbTitle_knownMatch( known, channel, mdbTitle_entityTypes );

    if( !channelMatch ) return null;

    // signal 1: the pages themselves. Signal 2 only where they say nothing.
    var scheme = mdbTitle_seriesIdPrefix( channelMatch ),
        byScheme = !!scheme && scheme.toUpperCase() === acro.toUpperCase();

    if( !byScheme && !mdbTitle_isChannelInitials( acro ) ) return null;

    // ... and where they answered, the id is written the way they write it: the pages are
    // the wiki's own titles, so their spelling of the prefix wins over the uploader's, the
    // same way a category name's does. Only the letters - the digits are the title's
    // ("DSS 012" and "DSS 140" pad alike, and padding is section 5's question, not this one).
    if( byScheme && scheme !== acro ) id = scheme + id.slice( acro.length );

    return {
        entity: mdbTitle_canonicalName( known, channel, mdbTitle_entityTypes ),
        episode: { kind: "id", text: id },
        type: String( channelMatch.type || "" ),
        // the letters alone, for the trace step - which has to name the answer that DECIDED,
        // not only the resemblance
        acronym: acro,
        // "" where the initials had to answer, so every reader can tell evidence from
        // inference: the trace step, the pick sentence and the confidence all say which
        scheme: byScheme ? scheme : "",
        pages: byScheme ? ( channelMatch.recent || [] ).length : 0
    };
}

// mdbTitle_growBareSeriesEntity
// "Podcast 323" on the channel "BASSIANI" -> "Bassiani Podcast 323". An entity that is
// nothing but a generic series word names no show: nobody's page is filed under
// Category:Podcast, and the episode number in front of it belongs to a series the title
// never spelled out. The channel is what says whose series it is - the same answer
// mdbTitle_takeShowOutOfTitle gives when the two words stand next to each other in the title
// ("HATE" + "Podcast" -> the show "HATE Podcast").
//
// At the single exit like the acronym expansion above, so every branch that can leave a bare
// word in the slot is covered by the one rule - 4c leaves one whenever the number stands in
// another bit than the channel name ("<channel> | Podcast #12"), and 5c whenever the title
// splits into two halves and the second is the word.
//
// Returns the grown name, or the entity unchanged. Three fences:
// - the channel has to name something ELSE: a channel called "Podcast" grows nothing
// - it must not already stand in the entity - which a bare word cannot, but the test costs
//   nothing and says what the rule means
// - the artist is not asked about here, unlike the acronym rule: a channel putting out its
//   own numbered podcast under its own name is the ordinary case ("Some Artist - Some Artist
//   Podcast 12"), while an acronym standing for the channel that also played is a
//   contradiction.
function mdbTitle_growBareSeriesEntity( entity ) {
    var channel = mdbTitle_channelShown || mdbTitle_channelUsed;

    if( !entity || !channel || !mdbTitle_isBareSeriesName( entity ) ) return entity;

    if( mdbTitle_isBareSeriesName( channel ) ) return entity;

    if( mdbTitle_normalizeCompare( entity ).indexOf( mdbTitle_normalizeCompare( channel ) ) !== -1 ) return entity;

    return channel + " " + mdbTitle_toNormalCase( entity );
}

// mdbTitle_result
// The single exit of buildMixesdbTitle: appends the extra artists, assembles, and enforces
// the three-group rule "Date - Artist - Entity" (see title_definitions.js). A 4th group is
// never a richer title, it always means a part of the player title was misread - it
// cannot be repaired blindly here, so it is flagged hard instead.
function mdbTitle_result( date, artist, entity, episode, promoMix, extraArtists, conf, picked ) {
    // Why these names got their slot, straight from the branch that decided it - the reasoning
    // panel prints it under the green chips, where "why S.U.N Festival and not MONUMENT?" is
    // the question a reader is left with. One sentence per ROLE, not per name: a name is green
    // because it became the page's artist or its entity, and that is what needs explaining.
    // Written even when the title comes out empty - a branch that returned has decided.
    if( mdbTitle_trace ) mdbTitle_trace.picks = picked || null;

    // wikiSafe first (what a wiki title may hold at all), then tidy (how MixesDB spells it),
    // then the joiners, which stand between NAMES and so only apply to the artist group
    artist = mdbTitle_normalizeJoiners( mdbTitle_tidy( mdbTitle_wikiSafe( mdbTitle_joinArtists( artist, extraArtists ) ) ) );
    entity = mdbTitle_tidy( mdbTitle_wikiSafe( entity ) );

    // Last word on spelling: a name the wiki knows is written the way the wiki writes it -
    // "trommel" -> "Trommel", "asa 808" -> "ASA 808" - undoing whatever the re-caser guessed.
    // After tidy so nothing re-cases it back, and only name-for-name (see mdbTitle_canonicalName).
    // In a composed live group ("A @ Venue, City") only the front is respelled here: the NAMES
    // in front of the "@" are artists like any others (reported on "Ri0D. & Jonbot @ ...",
    // which kept the stylized spelling), while the place behind it was canonicalized where the
    // group was built - the venue branch asks the wiki - and its ", City" is no artist list.
    if( mdbTitle_knownNow ) {
        var canonAt = artist.indexOf( "@" );

        if( canonAt === -1 ) {
            artist = mdbTitle_canonicalArtists( mdbTitle_knownNow, artist );
        } else {
            var canonFront = artist.slice( 0, canonAt ).replace( /\s+$/, "" ),
                canonTrail = artist.slice( canonFront.length, canonAt );

            artist = mdbTitle_canonicalArtists( mdbTitle_knownNow, canonFront ) + canonTrail + artist.slice( canonAt );
        }
        entity = mdbTitle_canonicalName( mdbTitle_knownNow, entity, mdbTitle_entityTypes );
    }

    // The wiki's role answers are never used and argued AGAINST in one breath: a title read as
    // "<place> - <artist>" - a venue in the artist slot, an artist standing as the show - files
    // the page exactly backwards, and every answer needed to see it is already in hand.
    // Reported 2026-08-20: "UFO95 LIVE @ DOMMUNE" came out as "Dommune - UFO95 (UFO95)" with
    // the wiki answering artist for UFO95 and venue for Dommune all along. Where MixesDB knows
    // the name in the ARTIST slot only as a venue/event and the name in the ENTITY slot only
    // as an artist, the two are put the wiki's way round, in the live form those two types
    // spell: "<artist> @ <place>". At the exit like the reductions below, so every branch that
    // can leave the slots crossed is covered by the one rule. Narrow on purpose: a name the
    // wiki also knows in its slot's own role keeps the slot ("fabric" the artist stays one), a
    // series answer keeps the entity a series, a promo keeps the mix's own name in the slot,
    // and an episode blocks the flip unless it is one of the two names misread - a real
    // number says the entity really numbers its episodes.
    if( mdbTitle_knownNow && artist && entity && !promoMix && artist.indexOf( "@" ) === -1 ) {
        var slotPlace  = mdbTitle_knownMatch( mdbTitle_knownNow, artist, [ "venue", "event" ] ),
            slotArtist = mdbTitle_knownMatch( mdbTitle_knownNow, artist, [ "artist" ] ),
            showArtist = mdbTitle_knownMatch( mdbTitle_knownNow, entity, [ "artist" ] ),
            showSeries = mdbTitle_knownMatch( mdbTitle_knownNow, entity, mdbTitle_entityTypes ),
            showPlace  = mdbTitle_knownMatch( mdbTitle_knownNow, entity, [ "venue", "event" ] ),
            episodeIsName = !episode ||
                mdbTitle_normalizeCompare( episode.text ) === mdbTitle_normalizeCompare( entity ) ||
                mdbTitle_normalizeCompare( episode.text ) === mdbTitle_normalizeCompare( artist );

        if( slotPlace && !slotArtist && showArtist && !showSeries && episodeIsName ) {
            var flippedArtist = mdbTitle_canonicalName( mdbTitle_knownNow, entity, [ "artist" ] ),
                flippedPlace  = mdbTitle_canonicalName( mdbTitle_knownNow, artist, [ "venue", "event" ] );

            logVar( "mdbTitle_result: artist and place put the wiki's way round",
                    artist + " - " + entity + " -> " + flippedArtist + " @ " + flippedPlace );
            mdbTitle_traceStep( "Artist and place put the wiki's way round",
                artist + " - " + entity + " -> " + flippedArtist + " @ " + flippedPlace +
                " - MixesDB knows \"" + flippedArtist + "\" only as an artist and \"" + flippedPlace +
                "\" only as a " + slotPlace.type + ", so the parse had the two slots crossed" );

            conf.drop( 10, "the parse read \"" + flippedPlace + "\" as the artist and \"" + flippedArtist +
                           "\" as the show - MixesDB knows them the other way round (a " + slotPlace.type +
                           " and an artist), so the title was put into the live form; check that it reads right" );

            // the deciding branch writes the sentences - this one asked the wiki, so it may say so
            if( mdbTitle_trace && mdbTitle_trace.picks ) {
                mdbTitle_trace.picks = {
                    artist: "MixesDB knows \"" + flippedArtist + "\" as an artist and not as a series - " +
                            "the parse had the name standing as the show, and the wiki's answer is what put it in front of the \" @ \"",
                    entity: "MixesDB knows \"" + flippedPlace + "\" as a " + slotPlace.type + " and not as an artist, " +
                            "so the title reads as a set PLAYED there - the parse had the two names the other way round"
                };
            }

            artist = flippedArtist + " @ " + flippedPlace;
            entity = "";
            episode = null;

        // The same answers the other way round: the ARTIST slot already holds the artist, but
        // the name standing as the show is one the wiki knows ONLY as a venue/event - a set
        // played somewhere, written as if the place were a series ("UFO95 - Dommune"). The
        // place goes behind an " @ " where it belongs; nothing about the artist changes.
        } else if( !slotPlace && showPlace && !showArtist && !showSeries &&
                   ( !episode || mdbTitle_normalizeCompare( episode.text ) === mdbTitle_normalizeCompare( entity ) ) ) {
            var placeName = mdbTitle_canonicalName( mdbTitle_knownNow, entity, [ "venue", "event" ] );

            logVar( "mdbTitle_result: the entity is a place, written as the live form",
                    artist + " - " + entity + " -> " + artist + " @ " + placeName );
            mdbTitle_traceStep( "The show slot names a place",
                artist + " - " + entity + " -> " + artist + " @ " + placeName +
                " - MixesDB knows \"" + placeName + "\" only as a " + showPlace.type +
                ", and a place is where a set was played, never the series it belongs to" );

            conf.drop( 10, "the parse read \"" + placeName + "\" as a show - MixesDB knows it only as a " +
                           showPlace.type + ", so the title was put into the live form; check that it reads right" );

            // the deciding branch writes the sentence - this one asked the wiki, so it may say so
            if( mdbTitle_trace && mdbTitle_trace.picks ) {
                mdbTitle_trace.picks.entity = "MixesDB knows \"" + placeName + "\" as a " + showPlace.type +
                    " and not as a series, so the title reads as a set PLAYED there and the name goes behind the \" @ \"";
            }

            artist = artist + " @ " + placeName;
            entity = "";
            episode = null;
        }
    }

    // An entity that is nothing but a series word is no name at all - the channel's goes in
    // front of it, so the page files under the series and not under Category:Podcast. Before
    // the acronym rule below, which reads a name in the slot and would find a common noun.
    var grownSeries = mdbTitle_growBareSeriesEntity( entity );

    if( grownSeries !== entity ) {
        logVar( "mdbTitle_result: bare series word grew the channel name", entity + " -> " + grownSeries );
        mdbTitle_traceStep( "Channel name joined to the bare series word", entity + " -> " + grownSeries,
            { from: entity, to: grownSeries }, [ "mdbTitleShowSuffixWords" ] );

        conf.drop( 5, "the title calls the show nothing but \"" + entity + "\" - the channel name was put in front of it, since MixesDB files no page under a word like that; check that the series is really called this" );

        // the deciding branch writes the sentence - this one changed the name, so it says why
        if( mdbTitle_trace && mdbTitle_trace.picks ) {
            mdbTitle_trace.picks.entity = "the title names the show with a generic word alone, which MixesDB has no category for - " +
                "the channel it was uploaded to is what says whose series it is, so its name went in front of the word";
        }

        entity = mdbTitle_knownNow ? mdbTitle_canonicalName( mdbTitle_knownNow, grownSeries, mdbTitle_entityTypes ) : grownSeries;
    }

    // An entity written as the channel's initials plus a number is the channel's series
    // abbreviating itself - "DSS 140" on "Deep Space Series" - and files under the full name
    // with the title's own id in brackets. At the exit like the reductions below, so every
    // branch that can leave an acronym in the slot is covered by the one rule; the function
    // holds the fences (mdbTitle_expandChannelAcronym).
    var acronymFull = mdbTitle_expandChannelAcronym( artist, entity, episode );

    if( acronymFull ) {
        logVar( "mdbTitle_result: entity acronym expanded to the channel name",
                entity + " -> " + acronymFull.entity + " (" + acronymFull.episode.text + ")" +
                ( acronymFull.scheme ? " (the category's pages write it that way)" : " (the channel's initials)" ) );

        // The label says what HAPPENED and the detail names what DECIDED - which is the
        // category's own page titles where they answered, and only otherwise the initials.
        // A step naming the initials on a title the PAGES settled would credit the weakest
        // reading we have with the change: "DSS" resembling "Deep Space Series" is an
        // inference, while a page titled "Deep Space Series (DSS 012)" is the wiki saying it.
        // Section 4 is where this change shows up and its pick sentence lives one section
        // further down, so the step has to stand on its own.
        if( acronymFull.scheme ) {
            mdbTitle_traceStep( "Series id read off the category's own page titles",
                                entity + " -> " + acronymFull.entity + " (" + acronymFull.episode.text + ")" +
                                " - MixesDB's " + acronymFull.pages + " pages of \"" + acronymFull.entity +
                                "\" are titled \"" + acronymFull.entity + " (" + acronymFull.scheme +
                                " <n>)\", so the \"" + acronymFull.acronym + "\" this title writes is that series' episode id" );
        } else {
            mdbTitle_traceStep( "Series acronym expanded to the channel's name",
                                entity + " -> " + acronymFull.entity + " (" + acronymFull.episode.text + ")" +
                                " - no page of \"" + acronymFull.entity + "\" writes such an id, but the letters spell" +
                                " the channel's initials, MixesDB has no series category \"" + acronymFull.acronym +
                                "\", and it knows \"" + acronymFull.entity + "\" as a " + acronymFull.type );
        }

        // Nothing is charged where the PAGES answered - they are the wiki's own titles, and
        // reading a title the way the series writes it is not a guess. The initials are, so
        // that path keeps its drop.
        if( !acronymFull.scheme ) {
            conf.drop( 5, "\"" + acronymFull.episode.text + "\" was read as \"" + acronymFull.entity +
                          "\" numbering itself - the letters spell the channel name's initials, and MixesDB knows the channel as a " +
                          acronymFull.type + " while it has no series category of the letters alone. No page of that category writes" +
                          " such an id, so check that the acronym really means the channel" );
        }

        // the deciding branch writes the sentence - this one asked the wiki, so it may say so
        if( mdbTitle_trace && mdbTitle_trace.picks ) {
            mdbTitle_trace.picks.entity = acronymFull.scheme
                ? "MixesDB's own pages of \"" + acronymFull.entity + "\" are titled \"" + acronymFull.entity +
                  " (" + acronymFull.scheme + " <n>)\", so the \"" + acronymFull.acronym +
                  "\" this title writes is that series' episode id and the page is filed under the series"
                : "the title writes the series as its initials - MixesDB has no series category of the " +
                  "letters alone, while \"" + acronymFull.entity + "\" is a " + acronymFull.type +
                  " it knows, so the page files under the channel's full name with the title's own id in brackets";
        }

        entity = acronymFull.entity;
        episode = acronymFull.episode;
    }

    // The one-" @ " rule holds at the exit, whatever branch built the group: the event and
    // venue branches compose "<artist bit> @ <place>" AFTER the title-wide rewrite (3c2), and
    // an artist bit that already carried an "@" would put a second one into the title -
    // "Kernel Existence @ Utopia | Ritter Butzke | Berlin" composes
    // "... @ Utopia @ Ritter Butzke, Berlin". Same rule, same spelling, no charge.
    var oneAtGroup = mdbTitle_joinPlaceGroups( artist );

    if( oneAtGroup !== artist ) {
        logVar( "mdbTitle_result: further \"@\" joined into the place group", artist + " -> " + oneAtGroup );
        artist = oneAtGroup;
    }

    // A room inside a venue is not the venue: where the place the title names is no category
    // and the venue around it is one, the word comes off - "@ Elsewhere Loft" -> "@ Elsewhere".
    // After the group is whole (the "@" fold above), so the part being read is the one the
    // page files under. The dropped word is offered back as a "Switch title" chip below.
    var placeShort = mdbTitle_reducePlaceGroup( artist );

    if( placeShort !== artist ) {
        logVar( "mdbTitle_result: room inside the venue dropped", artist + " -> " + placeShort );
        mdbTitle_traceStep( "Room inside the venue dropped",
                            artist + " -> " + placeShort, null, [ "mdbTitleVenueSpaceWords" ] );

        // the deciding branch writes the sentence - this one asked the wiki, so it may say so
        if( mdbTitle_trace && mdbTitle_trace.picks ) {
            mdbTitle_trace.picks.entity = "MixesDB has no category \"" + mdbTitle_placeWordDropped.full +
                "\", while \"" + mdbTitle_placeWordDropped.place + "\" is a venue it knows - \"" +
                mdbTitle_placeWordDropped.word + "\" names a room inside it, and the page files under the venue";
        }

        artist = placeShort;
    }

    // A line-up fraction is not part of the act's name: where the wiki knows the act and not
    // the fraction, the fraction comes off - "1/2 Faultierdisko" -> "Faultierdisko". Next to
    // the room rule and for the same reason, on the other side of the "@".
    var lineupShort = mdbTitle_reduceLineupFraction( artist );

    if( lineupShort !== artist ) {
        logVar( "mdbTitle_result: line-up fraction dropped", artist + " -> " + lineupShort );
        mdbTitle_traceStep( "Line-up fraction dropped", artist + " -> " + lineupShort );

        // the deciding branch writes the sentence - this one asked the wiki, so it may say so
        if( mdbTitle_trace && mdbTitle_trace.picks ) {
            mdbTitle_trace.picks.artist = "MixesDB knows the act without the fraction the title writes in front of it, " +
                "so the page is filed under the act - the fraction only says how much of it was on stage";
        }

        artist = lineupShort;
    }

    // "Live PA" said by the title or the description is written behind the artist's NAME, the
    // way MixesDB spells it: "Kernel Existence (Live PA) @ 3000Grad Festival". Only behind
    // ONE name - with several artists only the uploader knows whose set it was. The
    // description's word counts on a live recording alone (the phrase there may describe
    // another act on the bill) and stays a guess worth a drop; the title's own marker was
    // read, not guessed, and costs nothing. See "Live PA" in title_definitions.js.
    var livePa = mdbTitle_livePaTitle ||
                 ( mdbTitle_livePaDescription && artist.indexOf( "@" ) !== -1 );

    if( livePa && artist && !/\(\s*live\s*p\.?\s*a\.?\s*\)/i.test( artist ) ) {
        var livePaAt = artist.indexOf( "@" ),
            livePaName = ( livePaAt === -1 ? artist : artist.slice( 0, livePaAt ) ).replace( /\s+$/, "" );

        if( livePaName && mdbTitle_splitArtists( livePaName ).length > 1 ) {
            if( mdbTitle_livePaTitle ) {
                conf.drop( 3, "the title says \"Live PA\" but names several artists - put \" (Live PA)\" behind the right name by hand" );
            }
        } else if( livePaName ) {
            artist = livePaAt === -1 ? livePaName + " (Live PA)"
                                     : livePaName + " (Live PA) " + artist.slice( livePaAt );

            if( !mdbTitle_livePaTitle ) {
                conf.drop( 5, "\"(Live PA)\" was read out of the description - check that it describes this set's act" );
            }
        }
    }

    var monthNamed = null;

    // A mix whose title is nothing but its month gets the name MixesDB gives it:
    // "2011-08 - Aeroplane - August Promo Mix". Without this the entity slot stays empty and
    // the title comes out as a bare "2026-08 - Ingo Sanger", which says nothing about what
    // the file is - and the month, the one thing the uploader did name, is lost with it.
    // A self-released monthly mix is the textbook Promo Mix, so the page files under it; the
    // name already carries the words, so no " (Promo Mix)" is appended on top.
    //
    // Only where the title left NOTHING else: no name of its own, no episode number, and no
    // place (a live recording carries its group in the artist and is filed under the place).
    // And never where the name standing as the artist is a SHOW the wiki knows: "Some Podcast
    // - March 2026" is that podcast's March episode, and calling a known podcast's episode a
    // self-released mix would be the one thing the Promo Mix filing may never say.
    if( mdbTitle_monthOnlyName && artist && !entity && !episode && artist.indexOf( "@" ) === -1 &&
        !mdbTitle_knownEntityType( mdbTitle_knownNow, artist ) ) {
        entity = mdbTitle_monthOnlyName + " Promo Mix";
        promoMix = true;

        logVar( "mdbTitle_result: the title is its month, named the way MixesDB names one", entity );
        mdbTitle_traceStep( "Monthly mix named", "the title dates itself and names nothing else -> " + entity );

        conf.drop( 5, "the title names nothing but its month, so it was read as a self-released monthly mix and named \"" +
                      entity + "\" - the way MixesDB writes one" );

        if( mdbTitle_trace && mdbTitle_trace.picks ) {
            mdbTitle_trace.picks.entity = "the title dates itself with a month and names nothing else, " +
                "which MixesDB writes as \"" + entity + "\" and files under Category:Promo Mix";
        }

        monthNamed = { name: entity, stamp: mdbTitle_tidy( mdbTitle_wikiSafe( mdbTitle_monthOnlyStamp ) ) };
    }

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

    // The readings the build DECIDED AGAINST - the hints bar offers them as "Switch title:"
    // chips (mdbPageCreator_switchTitleHint in page_creator.js) instead of losing the call
    // silently. FACTS about what is switchable, never finished strings: the bar derives the
    // offered title from the CURRENT field text, so a chip survives an edit and the
    // recent-pages refinement where a pre-baked string would quietly undo both. Only ever the
    // close calls - a marker the build guessed about or refused to guess at, never one the
    // title itself spelled out.
    var alternatives = [];

    if( title ) {
        var livePaWritten = /\(\s*live\s*p\.?\s*a\.?\s*\)/i.test( artist );

        if( livePaWritten && !mdbTitle_livePaTitle ) {
            alternatives.push( {
                kind: "livePa",
                reason: "\"(Live PA)\" was read out of the description, not the title - the phrase there may describe another act on the bill."
            } );
        } else if( !livePaWritten &&
                   ( ( mdbTitle_livePaDescription && artist.indexOf( "@" ) === -1 ) ||
                     mdbTitle_liveWordSeen ) ) {
            // Two signals open this: the description's "Live PA" on a title that was not
            // read as a live recording (on one that was, the marker is written above), and
            // the title's own consumed "live" word - "Live@Elsewhere Loft",
            // "alemiko *live" - which never writes the marker (a DJ set is announced the
            // same way) but is exactly what makes the reading worth offering.
            // The single-name guard mirrors the write above: with several artists only the
            // uploader knows whose set it was, and a marker behind the wrong name is worse
            // than the confidence note that already asks for it by hand. On a live title
            // only the names in front of the "@" count, like at the write.
            var altPaAt = artist.indexOf( "@" ),
                altPaName = ( altPaAt === -1 ? artist : artist.slice( 0, altPaAt ) ).replace( /\s+$/, "" );

            if( altPaName && mdbTitle_splitArtists( altPaName ).length === 1 ) {
                alternatives.push( {
                    kind: "livePa",
                    reason: mdbTitle_livePaDescription
                        ? "The description says \"Live PA\", but the title was not read as a live recording, so the marker was left off."
                        : "The title says \"live\", which does not say HOW the set was played - a DJ set is announced the same way. If the act performed its own tracks, MixesDB writes \"(Live PA)\" behind the name."
                } );
            }
        }

        if( promoInTitle ) {
            // the marker is only ever written as an assumption (a known show, venue or event
            // never gets it), so the show reading is always worth offering back
            alternatives.push( {
                kind: "promoMix",
                reason: "\"" + entity + "\" is not a known show, venue or event, so \"(Promo Mix)\" was assumed - if it really is a show or podcast, the title goes without the marker and the page files under the name."
            } );
        } else if( mdbTitle_promoDeclined && entity && entity.indexOf( "@" ) === -1 &&
                   !mdbTitle_saysPromoMix( entity ) &&
                   !mdbTitle_knownEntityType( mdbTitle_knownNow, entity ) ) {
            alternatives.push( {
                kind: "promoMix",
                reason: "\"" + entity + "\" reads as a series of the artist's own, so \"(Promo Mix)\" was not stacked onto that guess - with the marker the page files under Category:Promo Mix instead of under the name."
            } );
        }

        // The room the reduction above took off the place group. MixesDB does write it where
        // it is worth naming - "2019-05-24 - Robert Hood @ Elsewhere Rooftop, NYC" is filed
        // under Elsewhere all the same - so this is a reading, not a mistake, and only the
        // uploader knows whether this set was one of those. The filing does not move with the
        // chip: mdbPageCreator_entityCategory reduces the name again off the lookup cache, so
        // both readings put the page under the venue.
        if( mdbTitle_placeWordDropped ) {
            alternatives.push( {
                kind: "placeWord",
                text: mdbTitle_placeWordDropped.word,
                place: mdbTitle_placeWordDropped.place,
                reason: "\"" + mdbTitle_placeWordDropped.word + "\" names a room inside \"" +
                        mdbTitle_placeWordDropped.place + "\", which is the category the page files under" +
                        " either way - MixesDB has no \"" + mdbTitle_placeWordDropped.full + "\". Where the room" +
                        " is worth naming, the title does carry it."
            } );
        }

        // The stamp the monthly naming above replaced. "August 2026" as the mix's own name is
        // the other way MixesDB writes such a page ("2016-07-30 - Guy J - Parallel Universe
        // (August Promo Mix)" shows both spellings side by side), and only the uploader knows
        // whether the month IS the name. The filing does not move - both readings are a Promo
        // Mix - so this chip changes the title alone.
        if( monthNamed && monthNamed.stamp ) {
            alternatives.push( {
                kind: "monthName",
                text: monthNamed.name,
                stamp: monthNamed.stamp,
                reason: "The title names nothing but its month, so it was named \"" + monthNamed.name +
                        "\" - the way MixesDB writes a monthly mix. Where the stamp IS the name the uploader gave it," +
                        " the title keeps it as \"" + monthNamed.stamp + " (Promo Mix)\". The page files under" +
                        " Category:Promo Mix either way."
            } );
        }

        // The slot 3g2 read into the place group. MixesDB writes the slot where it is worth
        // naming and the bare event where it is not, and the page files under the event
        // either way (mdbTitle_placeGroupEntity skips a slot part), so this moves nothing but
        // the title - the same deal the room word gets.
        if( mdbTitle_slotPartRead ) {
            alternatives.push( {
                kind: "slotPart",
                text: mdbTitle_slotPartRead.slot,
                place: mdbTitle_slotPartRead.event,
                reason: "\"" + mdbTitle_slotPartRead.slot + "\" names the slot of the night rather than the event," +
                        " and the page files under \"" + mdbTitle_slotPartRead.event + "\" either way." +
                        " Where the slot is not worth naming, the title carries the event alone."
            } );
        }

        // The live reading of a title that wrote an "@" in front of a "#"-numbered episode.
        // 2c wrote the series, because that is the half a number can prove - but the "@" is the
        // uploader's own, and where the show really is a venue or an event this is how MixesDB
        // writes it. The country 3h took off the title comes back with it, as the place group's
        // own country ("@ Melodic Therapy 217, Mexico"), which is exactly where a live title
        // carries it. The filing does not move: a place group is filed under its place and a
        // country is never a category, so both readings put the page under the same name.
        // Read off the finished TITLE, not off the groups above, so the chip's toggle searches
        // for the words the field really holds.
        if( mdbTitle_atEpisodeRead ) {
            var altGroups = title.split( " - " ),
                altPlace = altGroups.length > 2 ? altGroups.slice( 2 ).join( " - " ) : "";

            // Never onto an entity carrying a bracketed marker ("(Promo Mix)", "(RA.971)"):
            // the toggle would write the bracket into the middle of a place group, and a
            // marker is not a place to have played at anyway.
            if( altPlace && title.indexOf( " @ " ) === -1 && !/\)\s*$/.test( altPlace ) ) {
                alternatives.push( {
                    kind: "liveAt",
                    place: altPlace,
                    city: mdbTitle_locationDropped,
                    reason: "The title writes an \"@\" in front of \"" + altPlace + "\", which says the set was PLAYED there," +
                            " and a \"#\"-numbered episode, which says it is a series - and only one of the two can be written." +
                            " The series was written, because a show numbers its episodes and a place does not." +
                            ( mdbTitle_locationDropped
                                ? " On the live reading the \"" + mdbTitle_locationDropped + "\" behind it is the place's country, not where the artist is from."
                                : "" )
                } );
            }
        }

        // A chunk 1c dropped is never offered back - a "Part 2" above all. The parts of one
        // recording are ONE mix page (file details listing every file, a player each, the
        // tracklist split into part chapters), so a title carrying the marker is not a second
        // reading of this mix, it is the beginning of a duplicate page. See "Never offered
        // back" in mdbTitleDroppedBitPatterns.
    }

    return {
        title: title,
        confidence: conf.percent(),
        reasons: conf.reasons,
        // the page still belongs in Category:Promo Mix even when the title does not say so
        promoCategory: promoCategory,
        // the switchable readings above; [] on most titles
        alternatives: alternatives
    };
}

// mdbTitle_wikiSafe
// Takes out what a MediaWiki page title cannot hold (see title_definitions.js). A space, not
// nothing, so "RAUSCH#6" reads as "RAUSCH 6" and not "RAUSCH6".
// The square brackets go first and become ROUND ones: a bracket still standing here is holding
// a word ("[Live]"), and replacing it with a space would strip the pair for no reason.
function mdbTitle_wikiSafe( s ) {
    var illegal = ( typeof mdbTitleWikiIllegalChars !== "undefined" && mdbTitleWikiIllegalChars ) ? mdbTitleWikiIllegalChars : /[#<>\[\]|{}]+/g;

    illegal.lastIndex = 0;

    return String( s || "" )
        .replace( /\[/g, "(" )
        .replace( /\]/g, ")" )
        .replace( illegal, " " )
        .replace( /\s+/g, " " )
        .trim();
}

// mdbTitle_countGroups
// Groups as a READER counts them, not as the assembler joined them: any separator run with
// whitespace around it breaks a title in two on sight, whether it is the " - " we wrote or a
// "–" that came out of the player title.
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
// would only repeat what it says. See mdbTitlePromoMixImpliedWords in title_definitions.js.
function mdbTitle_saysPromoMix( entity ) {
    var words = ( typeof mdbTitlePromoMixImpliedWords !== "undefined" && mdbTitlePromoMixImpliedWords ) ? mdbTitlePromoMixImpliedWords : [];

    if( !entity || !words.length ) return false;

    return new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( words ) + ")\\b\\.?", "i" ).test( entity );
}
