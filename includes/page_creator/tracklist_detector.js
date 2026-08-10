log( "/includes/page_creator/tracklist_detector.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * Tracklist detector
 *
 * Finds the tracklist inside a player's description (or, failing that, inside its comments) and
 * hands back JUST the tracklist - no headline, no "follow me" links, none of the prose around it.
 * Whatever comes out of here still goes through MixesDB's Tracklist Editor API before anyone
 * sees it; this file only answers "which lines of this text ARE the tracklist".
 *
 * Pure text in, pure text out: no DOM, no network, no jQuery. That is what makes it testable
 * (tracklist_examples.js + its deno runner) and what keeps it usable from every site script -
 * a description is a description whether it came from SoundCloud, Mixcloud or hearthis.
 *
 *     var found = mdbTracklist_detectInText( track.description );
 *     // -> { text: "01. Artist - Title\n02. ...", lines: 18, indexed: true }  or  null
 *
 *     var found = mdbTracklist_detectInComments([ "1. Artist - Title 2. Other - Thing ..." ]);
 *     // -> { text: "1. Artist - Title\n2. Other - Thing\n...", lines: 12, comment: "1. Artist..." }
 *
 *
 * How a tracklist is recognized
 * -----------------------------
 * A tracklist is a RUN of neighbouring lines, not a set of lines scattered over the text. That
 * is the whole trick: single lines that look like a track ("6 Decks - 2 Mixers" in a Hard Times
 * description) are everywhere, but four of them in a row are not.
 *
 * A line joins a run when it is either
 *
 *   - a TRACK line: "Artist - Title" survives after an optional index and an optional cue are
 *     taken off the front. The bracketed extras behind it - "(Some Mix)", "[Label - #Cat]" -
 *     are simply part of the title and need no rule of their own.
 *   - an INDEXED line: it starts with "1.", "01", "1)", "001.)", "1 - ", "#1 " ... Those come
 *     along because a numbered tracklist keeps numbering the tracks it has no name for
 *     ("06. [018] ID"), and dropping them would tear one tracklist into three.
 *
 * Blank lines end a run, which is what keeps a heading ("Tracklist:") and the paragraph above it
 * out of the block. A run is only taken when it is at least mdbTracklist_minTracks lines long and
 * at least half of them are real TRACK lines.
 *
 * On a numbered run the numbers additionally have to ASCEND, and the longest ascending stretch is
 * what survives. This is what throws out a stray "6 Decks - 2 Mixers" that happens to sit right
 * on top of a tracklist starting at "01." - and any other line that only looks numbered.
 *
 *
 * Comments
 * --------
 * Only ever asked when the description has nothing, and only for a WHOLE tracklist - the "the
 * track at 25 min is X - Y" comments are what this must not fall for. A SoundCloud comment is a
 * single line, so the numbering is the only thing left to split on: markers "1.", "2." ... that
 * start at 1, count up without a gap and appear at least mdbTracklist_minCommentTracks times.
 * A comment tracklist without numbers cannot be split back into tracks by anyone and is left
 * alone on purpose.
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// How many lines a run needs before it counts as a tracklist. Four is the shortest thing anyone
// would call a tracklist, and every false positive seen so far is one or two lines long.
var mdbTracklist_minTracks = 4;

// Comments are the riskier source (see the header), so they have to bring a full mix worth of
// tracks before they are believed.
var mdbTracklist_minCommentTracks = 6;

// A prose paragraph is one long line in a description; a track line is not. Nothing in the
// examples comes close to this, the longest being 92 characters.
var mdbTracklist_maxLineLength = 200;

// "1.", "01", "1)", "001.)", "(1)", "#1", "1 - " - the front of a numbered track line.
// \d{1,3} and the required separator together are what keeps a year out: "2026 Best Of" leaves
// "6" where the separator has to be and does not match.
var mdbTracklist_indexRe = /^[#(]?(\d{1,3})(?:[.):\]]+|\s*[-–—])?[ \t]+/;

// A cue in front of the artist: "[000]", "[00:12:30]", "[cue]"
var mdbTracklist_cueRe = /^\[[^\]]*\]\s*/;

// "Artist - Title", with the dash SoundCloud uploaders actually type - hyphen, en dash or em
// dash. The surrounding spaces are required: "Rub-A-Dub-Dub" and "Lo-Fi" are not two tracks.
var mdbTracklist_artistTitleRe = /\S\s[-–—]\s\S/;

// mdbTracklist_normalize
// One text, one line ending, one kind of space. Non-breaking spaces are what a pasted tracklist
// is full of, and they would make every " - " test fail for no visible reason.
function mdbTracklist_normalize( text ) {
    return String( text || "" )
        .replace( /\r\n?/g, "\n" )
        .replace( / /g, " " )
        .replace( /[ \t]+/g, " " );
}

// mdbTracklist_stripIndex
function mdbTracklist_stripIndex( line ) {
    return String( line || "" ).replace( mdbTracklist_indexRe, "" );
}

// mdbTracklist_index
// The number a line is numbered with, or -1. Only ever read off a line, never trusted on its own
// - see the ascending check in mdbTracklist_takeAscending().
function mdbTracklist_index( line ) {
    var m = String( line || "" ).match( mdbTracklist_indexRe );

    return m ? parseInt( m[1], 10 ) : -1;
}

// mdbTracklist_isTrackLine
// Index and cue are taken off first, so "001.) [cue] Foo - Bar (Some Mix) [Label - #Cat]" is
// judged on the "Foo - Bar ..." that is left.
function mdbTracklist_isTrackLine( line ) {
    var rest = mdbTracklist_stripIndex( line ).replace( mdbTracklist_cueRe, "" );

    return mdbTracklist_artistTitleRe.test( rest );
}

// mdbTracklist_isCandidateLine
// A line that may be part of a run. A URL never is - descriptions are full of "Buy it here -
// https://..." lines, which read as "Artist - Title" and sit right next to the tracklist.
function mdbTracklist_isCandidateLine( line ) {
    if( !line ) return false;
    if( line.length > mdbTracklist_maxLineLength ) return false;
    if( /https?:\/\//i.test( line ) ) return false;

    return mdbTracklist_isTrackLine( line ) || mdbTracklist_indexRe.test( line );
}

// mdbTracklist_takeAscending
// Of a numbered run, the longest stretch whose numbers count upwards. Lines without a number
// (the "06. [018] ID" case is numbered, but "ID" alone is not) ride along without breaking it.
//
// This is what a stray line on top of a tracklist runs into: "6 Decks - 2 Mixers" directly above
// "01. Hardrive - No Cure" reads as track 6 followed by track 1, so the stretch breaks between
// them and the 26 real tracks win over the stretch of one.
function mdbTracklist_takeAscending( lines ) {
    var best = [],
        current = [],
        last = -1,
        i;

    for( i = 0; i < lines.length; i++ ) {
        var index = mdbTracklist_index( lines[i] );

        if( index > -1 && index <= last ) {
            if( current.length > best.length ) best = current;
            current = [];
            last = -1;
        }

        current.push( lines[i] );
        if( index > -1 ) last = index;
    }

    return current.length > best.length ? current : best;
}

// mdbTracklist_scoreRun
// What a run has to bring to pass as a tracklist. Half real "Artist - Title" lines is deliberately
// lenient: a numbered tracklist may well name a quarter of its tracks "ID" and still be one.
function mdbTracklist_scoreRun( lines ) {
    var tracks = 0,
        indexed = 0,
        i;

    for( i = 0; i < lines.length; i++ ) {
        if( mdbTracklist_isTrackLine( lines[i] ) ) tracks++;
        if( mdbTracklist_indexRe.test( lines[i] ) ) indexed++;
    }

    return { tracks: tracks, indexed: indexed, rows: lines.length };
}

// mdbTracklist_acceptRun
function mdbTracklist_acceptRun( lines, minTracks ) {
    var score = mdbTracklist_scoreRun( lines );

    if( score.rows < minTracks ) return null;
    if( score.tracks < 3 ) return null;
    if( score.tracks * 2 < score.rows ) return null;

    return score;
}

// mdbTracklist_detectInText
// The entry point for a description. Returns the tracklist as it stands in the text - unchanged,
// numbering and cues included, since the Tracklist Editor API is the one that normalizes it.
function mdbTracklist_detectInText( text, minTracks ) {
    var min = minTracks || mdbTracklist_minTracks,
        lines = mdbTracklist_normalize( text ).split( "\n" ),
        runs = [],
        run = [],
        i;

    for( i = 0; i < lines.length; i++ ) {
        var line = lines[i].trim();

        if( mdbTracklist_isCandidateLine( line ) ) {
            run.push( line );
        } else {
            if( run.length ) runs.push( run );
            run = [];
        }
    }
    if( run.length ) runs.push( run );

    var best = null,
        bestScore = null;

    for( i = 0; i < runs.length; i++ ) {
        var candidate = runs[i],
            score = mdbTracklist_scoreRun( candidate );

        // Numbered runs are cut down to their longest ascending stretch first, so a run that
        // only borrowed its neighbour's numbering is judged on what is really left of it.
        if( score.indexed * 2 >= score.rows ) {
            candidate = mdbTracklist_takeAscending( candidate );
        }

        score = mdbTracklist_acceptRun( candidate, min );
        if( !score ) continue;

        if( !best || candidate.length > best.length ) {
            best = candidate;
            bestScore = score;
        }
    }

    if( !best ) {
        log( "mdbTracklist_detectInText: no tracklist found in " + lines.length + " lines of text." );
        return null;
    }

    log( "mdbTracklist_detectInText: found " + best.length + " lines (" + bestScore.tracks +
         " with an \"Artist - Title\", " + bestScore.indexed + " numbered)." );

    return {
        text: best.join( "\n" ),
        lines: best.length,
        indexed: bestScore.indexed * 2 >= bestScore.rows
    };
}

// mdbTracklist_splitNumbered
// A whole tracklist typed into ONE line, which is all a SoundCloud comment can be:
// "1. Artist - Title 2. Other - Thing 3. ...". Split at the numbering, because there is nothing
// else to split at.
//
// The numbers have to start at 1 and count up one by one. That is stricter than the description
// side on purpose: this is the rule that tells a posted tracklist apart from "3. is Artist -
// Title" under a mix, which is the far more common kind of comment and must never be taken.
function mdbTracklist_splitNumbered( text ) {
    var line = mdbTracklist_normalize( text ).replace( /\n+/g, " " ).trim(),
        markerRe = /(?:^|\s)[#(]?(\d{1,3})(?:[.):\]]+|\s*[-–—])\s*(?=\S)/g,
        marks = [],
        m;

    while( ( m = markerRe.exec( line ) ) !== null ) {
        // the match may start on the space in front of the number - the track starts at the number
        var lead = m[0].match( /^\s*/ )[0].length;

        marks.push({ at: m.index + lead, number: parseInt( m[1], 10 ) });
    }

    // start at 1, no gaps, no repeats - anything else is a comment that merely mentions numbers
    var start = -1,
        i;

    for( i = 0; i < marks.length; i++ ) {
        if( marks[i].number === 1 ) { start = i; break; }
    }

    if( start === -1 ) return null;

    var wanted = 1,
        taken = [];

    for( i = start; i < marks.length; i++ ) {
        if( marks[i].number !== wanted ) continue;
        taken.push( marks[i] );
        wanted++;
    }

    if( taken.length < 2 ) return null;

    var out = [];

    for( i = 0; i < taken.length; i++ ) {
        var from = taken[i].at,
            to = ( i + 1 < taken.length ) ? taken[i + 1].at : line.length;

        out.push( line.slice( from, to ).trim() );
    }

    return out;
}

// mdbTracklist_detectInComments
// comments: an array of comment bodies, newest or oldest first - it does not matter, the longest
// tracklist wins either way.
function mdbTracklist_detectInComments( comments ) {
    var list = comments || [],
        best = null,
        i;

    logVar( "mdbTracklist_detectInComments: comments to look at", list.length );

    for( i = 0; i < list.length; i++ ) {
        var body = String( list[i] || "" ).trim();

        if( !body ) continue;

        // a comment that happens to have real line breaks is read like a description, only with
        // the higher bar - the same "a whole tracklist or nothing" rule applies
        var found = mdbTracklist_detectInText( body, mdbTracklist_minCommentTracks );

        if( !found ) {
            var split = mdbTracklist_splitNumbered( body );

            if( split && mdbTracklist_acceptRun( split, mdbTracklist_minCommentTracks ) ) {
                found = { text: split.join( "\n" ), lines: split.length, indexed: true };
            }
        }

        if( found && ( !best || found.lines > best.lines ) ) {
            best = found;
            best.comment = body;
        }
    }

    if( best ) {
        log( "mdbTracklist_detectInComments: took a " + best.lines + " track tracklist out of a comment." );
    } else {
        log( "mdbTracklist_detectInComments: no full tracklist in the comments." );
    }

    return best;
}
