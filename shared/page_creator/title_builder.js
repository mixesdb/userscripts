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

// mdbTitle_liveDate
// The date and the artist group of a LIVE recording whose player title carries no date of its
// own. Such a set is uploaded whenever the recording is ready - days, months or years after it
// was played - so the upload date is never the gig date and only its YEAR is claimed. A month
// the place names refines that year, and leaves the place name as it goes.
// See "The date of a live recording" in title_definitions.js.
function mdbTitle_liveDate( date, group ) {
    var year = mdbTitle_yearOf( date ),
        result = { date: date, group: group, month: 0 };

    if( !year ) return result;

    var withoutMonth = mdbTitle_takeRecordingMonth( group );

    result.date = year;
    result.month = withoutMonth.month;

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
function mdbTitle_seriesScore( part ) {
    var words = new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( mdbTitle_showSuffixWords() ) + ")\\b", "i" ),
        score = 0;

    if( words.test( part ) ) score += 2;
    if( /\d/.test( part ) ) score += 1;

    return score;
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
        series = new RegExp( "\\b(?:" + mdbTitle_wordListAlternation( mdbTitle_showSuffixWords() ) + ")\\b", "i" );

    if( !front || !series.test( front ) ) return result;

    result.text = front;
    result.taken = true;
    result.stamp = mdbTitle_trimSeparators( m[0] );

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
// Returns { text, read, dropped }.
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
function mdbTitle_applyJoiners( text ) {
    var live = ( typeof mdbTitleLiveAtWords !== "undefined" && mdbTitleLiveAtWords ) ? mdbTitleLiveAtWords : [],
        venue = ( typeof mdbTitleVenueConnectors !== "undefined" && mdbTitleVenueConnectors ) ? mdbTitleVenueConnectors : [],
        together = ( typeof mdbTitleTogetherArtistJoiners !== "undefined" && mdbTitleTogetherArtistJoiners ) ? mdbTitleTogetherArtistJoiners : [],
        read = [],
        dropped = "";

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

    return { text: text, read: read, dropped: dropped };
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

// mdbTitle_bitSplitRe
// Splits a title into the bits its separators mark out. A separator run needs whitespace on
// both sides, so hyphenated names ("RAW-ARTES", "пo-русски") stay in one piece. The colon is
// the exception: it is written onto the word in front of it and never turns up inside one.
function mdbTitle_bitSplitRe() {
    return new RegExp( "(?:\\s+[" + mdbTitle_sepInner + "]+|:)\\s+", "g" );
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
// (mdbTitleDroppedBitPatterns). Returns { text, dropped }. The separator runs are kept along with
// the chunks they belong to, so what stays reads exactly as the uploader wrote it.
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
function mdbTitle_categoryCandidates( playerTitle, username ) {
    var names = [],
        // spaced the same way buildMixesdbTitle spaces them, or a name the wiki is asked about
        // carries an underscore no category has
        bits = mdbTitle_spaced( playerTitle ).split( mdbTitle_bitSplitRe() ),
        channelNames = mdbTitle_channelNames( mdbTitle_spaced( username ) ),
        i;

    if( username ) names.push( mdbTitle_spaced( username ) );

    // A channel naming several names is asked about each of them: which one gets used is
    // decided off the title, and the wiki's answer is worth having for whichever it is.
    for( i = 0; channelNames.length > 1 && i < channelNames.length; i++ ) {
        names.push( channelNames[i] );
    }

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

    var joiner = ( typeof mdbTitleExtraArtistJoiner !== "undefined" && mdbTitleExtraArtistJoiner ) ? mdbTitleExtraArtistJoiner : ", ";
    return [ artist ].concat( extraArtists ).join( joiner );
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
        // The "(Promo Mix)" suffix is not part of the last one's name either.
        name = mdbTitle_trimSeparators( String( parts[i] || "" ).replace( /\s*\(\s*Promo Mix\s*\)\s*$/i, "" ) );

        if( name ) names.push( name );
    }

    return names;
}

// mdbTitle_titleCategories
// A finished MixesDB title -> { year, artists, entity }, i.e. what the wiki files the page
// under. Read off the TITLE and not off what the parser had in mind: the suggestion is editable,
// and a corrected title has to take its categories with it. Which is also why this parses rather
// than remembers - the title it is handed may never have been built here at all.
function mdbTitle_titleCategories( title ) {
    var text = String( title || "" ),
        bits = text.split( mdbTitle_bitSplitRe() ),
        year = ( text.match( /^\s*(\d{4})/ ) || [ "", "" ] )[1],
        artistField = bits[1] || "",
        entity = bits[2] || "";

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

    return {
        year: year,
        artists: mdbTitle_splitArtists( artistField ),
        entity: mdbTitle_trimSeparators( entity )
    };
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

    var keepUpper = ( typeof mdbTitleNormalCaseKeepUpper !== "undefined" && mdbTitleNormalCaseKeepUpper ) ? mdbTitleNormalCaseKeepUpper : [],
        keepLower = ( typeof mdbTitleNormalCaseKeepLower !== "undefined" && mdbTitleNormalCaseKeepLower ) ? mdbTitleNormalCaseKeepLower : [],
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

// mdbTitle_toNormalCaseKeeping
// mdbTitle_toNormalCase, with the channel's own spelling left standing wherever it turns up.
// The bit is split at it, so each piece is judged on its own case - "(selected) podcast 064"
// re-cases the " podcast 064" and hands back "(selected) Podcast 064".
function mdbTitle_toNormalCaseKeeping( s ) {
    var keep = mdbTitle_channelSpelling,
        parts,
        i;

    s = String( s || "" );

    if( !keep || s.indexOf( keep ) === -1 ) return mdbTitle_toNormalCase( s );

    parts = s.split( keep );

    for( i = 0; i < parts.length; i++ ) {
        parts[i] = mdbTitle_toNormalCase( parts[i] );
    }

    return parts.join( keep );
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
    // spelling excepted
    var normalCased = mdbTitle_toNormalCaseKeeping( s );
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

    try {
        // "_" is a space on MediaWiki and a word character to a regex, so it is written out
        // before anything else reads a word - of the title and of the channel name alike.
        var rest = mdbTitle_spaced( playerTitle ).replace( /\s+/g, " " ).trim();
        if( !rest ) return nothing;

        username = mdbTitle_spaced( username ).replace( /\s+/g, " " ).trim();

        logVar( "playerTitle", rest );
        logVar( "username", username );

        // 0) typos in the words the parser itself reads, before any rule reads one
        var spelled = mdbTitle_fixTypos( rest );

        if( spelled !== rest ) {
            logVar( "buildMixesdbTitle: typo corrected", rest + " -> " + spelled );
            rest = spelled;
        }

        // 1) drop decoration
        if( typeof mdbTitleNoise !== "undefined" && mdbTitleNoise ) {
            for( var n = 0; n < mdbTitleNoise.length; n++ ) {
                mdbTitleNoise[n].lastIndex = 0;
                rest = rest.replace( mdbTitleNoise[n], " " );
            }
        }

        // 1a) a bracket crediting the artist's label(s) - "Tooker (SONARA / Crosstown Rebels)".
        // While the brackets are still brackets, i.e. before 1b turns them into separators.
        var labelBrackets = mdbTitle_dropLabelBrackets( rest, description );

        if( labelBrackets.dropped.length ) {
            logVar( "buildMixesdbTitle: label credit dropped", labelBrackets.dropped.join( " | " ) );
            rest = labelBrackets.text;
        }

        // 1b) brackets are a chunk of their own, exactly like a "|" - written out as one here,
        // so that every rule below splits the title without having to know about brackets.
        // After the noise, whose patterns are written WITH their brackets. The channel's own
        // brackets are the exception and stay where they are ("[selected] podcast 064").
        var unbracketed = mdbTitle_bracketsToSeparators( rest, username );

        if( unbracketed !== rest ) {
            logVar( "buildMixesdbTitle: brackets read as separators", rest + " -> " + unbracketed );
            rest = unbracketed;
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

        // The title spelling the channel name exactly the way the channel does is the real
        // spelling, and Normal Case must not touch it. After 1b, so a channel name in brackets
        // is compared in the round-bracket spelling both sides have by then.
        var channelSpelling = mdbTitle_wikiSafe( username );

        if( channelSpelling && rest.indexOf( channelSpelling ) !== -1 ) {
            mdbTitle_channelSpelling = channelSpelling;
            logVar( "buildMixesdbTitle: the title spells the channel name the channel's way", channelSpelling );
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
            uploadDateReason = "no date in the player title - using the upload date, which is not the mix date for an older recording";

        if( found ) {
            date = found.out;
            rest = mdbTitle_cut( rest, found.index, found.length );

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

        if( joined.text !== rest ) {
            logVar( "buildMixesdbTitle: joiners applied", rest + " -> " + joined.text );
            rest = joined.text;
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

            var eventGroup = eventTitle.artist + " @ " + eventTitle.event;

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

            return mdbTitle_result( date, eventGroup, "", null, false, [], conf );
        }

        // 3g) MixesDB knows one of the bits as a venue, so this was played somewhere rather
        // than made for a feed: "Tonino & Lanka | Ritter Butzke | Berlin" is a live recording
        // at a Berlin club, which the title itself gives no way of telling.
        var venueTitle = mdbTitle_takeVenueTitle( rest, known );

        if( venueTitle ) {
            logVar( "buildMixesdbTitle: venue known to MixesDB", venueTitle.venue );

            var venueGroup = venueTitle.artist + " @ " + venueTitle.venue +
                             ( venueTitle.city ? ", " + venueTitle.city : "" );

            if( dateFromUpload ) {
                var venueLive = mdbTitle_liveDate( date, venueGroup );

                date = venueLive.date;
                venueGroup = venueLive.group;
                conf.drop( 10, mdbTitle_liveDateReason( venueLive.month ) );
            }

            return mdbTitle_result( date, venueGroup, "", null, false, [], conf );
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
            } else {
                conf.drop( 15, uploadDateReason );
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

                return mdbTitle_result( date, username, ownEntity, null, false, extraArtists, conf );
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
                                            false, extraArtists, conf );
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
        // Exactly two bits, as narrow as 5b and 5c: with a third one there is more than one
        // way to pair them up and it is a guess again. A number written ONTO the channel name
        // ("Trommel.251") never gets here - it left the title together with the name.
        if( taken.taken && !taken.episode && !isMappedChannel && !guestArtist &&
            restWithShow.indexOf( "@" ) === -1 && mdbTitle_countGroups( restWithShow ) === 2 ) {

            var titleEpisode = mdbTitle_findEpisode( restWithShow, true ),
                channelBit = mdbTitle_bitAt( restWithShow, taken.index );

            if( titleEpisode ) {
                var numberBit = mdbTitle_bitAt( restWithShow, titleEpisode.index );

                if( numberBit.start !== channelBit.start ) {
                    // the number goes with the series, so it comes out of the name here and is
                    // written back behind it by mdbTitle_assemble
                    var numberedSeries = mdbTitle_cleanArtist(
                            mdbTitle_cut( numberBit.text, titleEpisode.index - numberBit.start, titleEpisode.length ) );

                    if( numberedSeries ) {
                        logVar( "buildMixesdbTitle: the number is in the other bit, so the channel is the artist",
                                taken.show + " | " + numberedSeries + " " + titleEpisode.text );

                        return mdbTitle_result( date, taken.show, numberedSeries,
                                                { text: titleEpisode.text, kind: titleEpisode.kind },
                                                false, extraArtists, conf );
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
            // "<name> Mix August 2026": a series stamps its edition with the month instead of
            // a number, and the stamp reads exactly like the number does - the title is a
            // series and names nobody, so the channel is the artist. The stamp itself leaves
            // the name: the date group is what carries when the mix is from.
            monthly = mdbTitle_takeMonthlyEdition( seriesName, date );

        if( show && seriesName && !isMappedChannel && !taken.taken && !showFromEpisodeRule &&
            seriesName.indexOf( "@" ) === -1 &&
            mdbTitle_seriesScore( show ) === 0 &&
            ( !!foundEpisode || monthly.taken || mdbTitle_looksNumberedSeries( seriesName ) ) ) {

            if( monthly.taken ) {
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

            logVar( "buildMixesdbTitle: the title is a numbered series, so the channel is the artist", show );
            conf.drop( 5, "the title reads as a " + ( monthly.taken ? "monthly" : "numbered" ) +
                          " series and names nobody, so the channel was taken as the artist" );

            return mdbTitle_result( date, show, seriesName, null, seriesPromo, [], conf );
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

    // an empty group anywhere leaves a double space behind, and a trailing separator a trailing
    // space - neither belongs in a page title, whatever put it there
    out = out.replace( /\s+/g, " " ).trim();

    logVar( "mdbTitle_assemble result", out );
    return out;
}

// mdbTitle_result
// The single exit of buildMixesdbTitle: appends the extra artists, assembles, and enforces
// the three-group rule "Date - Artist - Entity" (see title_definitions.js). A 4th group is
// never a richer title, it always means a part of the player title was misread - it
// cannot be repaired blindly here, so it is flagged hard instead.
function mdbTitle_result( date, artist, entity, episode, promoMix, extraArtists, conf ) {
    // wikiSafe first (what a wiki title may hold at all), then tidy (how MixesDB spells it),
    // then the joiners, which stand between NAMES and so only apply to the artist group
    artist = mdbTitle_normalizeJoiners( mdbTitle_tidy( mdbTitle_wikiSafe( mdbTitle_joinArtists( artist, extraArtists ) ) ) );
    entity = mdbTitle_tidy( mdbTitle_wikiSafe( entity ) );

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
