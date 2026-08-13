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
 *     are simply part of the title and need no rule of their own. A slash between the two
 *     ("Ackermann / Pure") counts as well - see the separator part of the tidying below.
 *   - an INDEXED line: it starts with "1.", "01", "1)", "001.)", "1 - ", "#1 " ... Those come
 *     along because a numbered tracklist keeps numbering the tracks it has no name for
 *     ("06. [018] ID"), and dropping them would tear one tracklist into three.
 *
 * Blank lines end a run, which is what keeps a heading ("Tracklist:") and the paragraph above it
 * out of the block - UNLESS the numbering steps over them. An uploader who writes every track as
 * its own paragraph (SoundCloud renders those as <p>, and the description then holds a blank line
 * between every pair of tracks) still wrote one tracklist, and "11." followed by "12." says so
 * across any gap. That the number has to go UP is what keeps the rule honest: in the Hard Times
 * description a "6 Decks - 2 Mixers" line sits one blank line above a tracklist starting at "01.",
 * and 1 does not follow 6, so that blank still ends the run.
 *
 * A run is only taken when it is at least mdbTracklist_minTracks lines long and at least half of
 * them are real TRACK lines.
 *
 * On a numbered run the numbers additionally have to ASCEND, and the longest ascending stretch is
 * what survives. This is what throws out a stray "6 Decks - 2 Mixers" that happens to sit right
 * on top of a tracklist starting at "01." - and any other line that only looks numbered.
 *
 *
 * Tidying, before the API sees it
 * -------------------------------
 * The block is handed over as the uploader wrote it, with three exceptions.
 *
 * The numbering is evened out. "12 - Wassu & Haums" and "13 - Juju" in a list otherwise numbered
 * "11 Dino Lenny", "14 JUNO (DE)" is one tracklist to a reader and two kinds of line to the
 * Tracklist Editor API: it strips the numbering from the lines that share the block's style and
 * leaves the odd ones out alone, so those two arrive with their number still in the artist. The
 * majority style wins and only the lines disagreeing with it are rewritten, which is what leaves
 * a list that is CONSISTENTLY "1 - Artist - Title" untouched.
 *
 * A block that splits artist and title with a SLASH ("Ackermann / Pure", also "//" and "\") is
 * rewritten to the dash the Tracklist Editor API reads, because the API knows no other separator:
 * it takes such a line for one nameless track called "Ackermann / Pure" and hands back the whole
 * tracklist with not a single track in it. Only the FIRST slash of a line moves, and only when
 * most of the block's lines are written that way - a lone "Artist / Other Artist - Title" among
 * dashes is a collaboration, not a separator.
 *
 * And a cue written BEHIND the
 * track ("Artist - Title 00:52:09") is moved in front of it, where MixesDB writes cues
 * ("[00:52:09] Artist - Title"), and anything trailing the cue becomes a bold note in front of the
 * artist ("00:56:00- CLASSIC OF THE WEEK" -> "'''CLASSIC OF THE WEEK:''' Artist - Title").
 * The Tracklist Editor API reads a leading cue and would take a trailing one for part of the
 * title, so this has to happen on our side. Only done when at least half the lines of the block
 * carry such a cue - one title that happens to end in something clock-shaped is not a pattern.
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

// "1.", "01", "1)", "001.)", "(1)", "#1", "1 - " - the front of a numbered track line, taken
// apart into what OPENS it, the digits, and the separator behind them. In three groups rather
// than one because the numbering is not only recognized here but rewritten - see
// mdbTracklist_evenIndexes().
// \d{1,3} and the required separator together are what keeps a year out: "2026 Best Of" leaves
// "6" where the separator has to be and does not match.
var mdbTracklist_indexRe = /^([#(]?)(\d{1,3})([.):\]]+|\s*[-–—])?[ \t]+/;

// A cue in front of the artist: "[000]", "[00:12:30]", "[cue]"
var mdbTracklist_cueRe = /^\[[^\]]*\]\s*/;

// "Artist - Title", with the dash SoundCloud uploaders actually type - hyphen, en dash or em
// dash. A space on at least ONE side of it is required, and that alone is what keeps
// "Rub-A-Dub-Dub" and "Lo-Fi" from reading as two tracks: a hyphen inside a word never has a
// space next to it.
//
// Demanding one on BOTH sides is what a single typo used to cost a whole tracklist. "Kate Bush
// -Running Up That Hill" is a track line its uploader mistyped, and rejecting it does not just
// drop that line - it is not a candidate line at all, so the run ENDS there and the tracklist is
// torn into the part above and the part below, of which only the longer one survives. Half a
// tracklist is the one outcome worse than none, because nothing about it looks wrong.
var mdbTracklist_artistTitleRe = /\S(?:\s[-–—]\s?|\s?[-–—]\s)\S/;

// The other separator uploaders write instead of that dash: "Ackermann / Pure", with "//", "\"
// and "\\" as the same thing. A space is required on BOTH sides here, where the dash needs only
// one: a slash lives inside words, dates and addresses all day long ("AC/DC", "w/ Mücha", "24/7",
// "music.beepd.co/card/anjaschneider"), so a one-sided rule would read half the prose of a
// description as a track line. The two groups are the characters either side of the separator,
// kept so that the same regex can also do the rewriting - see mdbTracklist_dashifyLine().
var mdbTracklist_slashTitleRe = /(\S)\s[\/\\]{1,2}\s(\S)/;

// A cue written behind the track instead of in front of it, with whatever the uploader hung off
// it: "Artist - Title 00:52:09", "Artist - Title 00:56:00- CLASSIC OF THE WEEK".
// The index in front is kept as it is; only what stands behind the track moves.
var mdbTracklist_trailingCueRe = /^([#(]?\d{1,3}(?:[.):\]]+|\s*[-–—])?[ \t]+)?(.*\S)\s+(\d{1,3}:\d{2}(?::\d{2})?)\s*(?:[-–—]\s*(\S.*?))?\s*$/;

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

    return m ? parseInt( m[2], 10 ) : -1;
}

// mdbTracklist_separator
// WHICH separator splits the artist from the title on this line - "-" or "/" - or null for a line
// that carries neither and is no track line. Index and cue are taken off first, so
// "001.) [cue] Foo - Bar (Some Mix) [Label - #Cat]" is judged on the "Foo - Bar ..." that is left.
//
// The FIRST of the two on the line is the one that splits it, and the rest of the line is title:
// "traKKman / Jack 2 The Groove - Sound Factory Bar mix" is a slash line whose title happens to
// carry a dash, "Dj Lion - Mit Dir Intro - Camisra - Let Me Show You / Alta Moda" a dash line
// whose title happens to carry a slash.
function mdbTracklist_separator( line ) {
    var rest = mdbTracklist_stripIndex( line ).replace( mdbTracklist_cueRe, "" ),
        dash = rest.search( mdbTracklist_artistTitleRe ),
        slash = rest.search( mdbTracklist_slashTitleRe );

    if( dash < 0 && slash < 0 ) return null;
    if( dash < 0 ) return "/";
    if( slash < 0 ) return "-";

    return slash < dash ? "/" : "-";
}

// mdbTracklist_isTrackLine
function mdbTracklist_isTrackLine( line ) {
    return mdbTracklist_separator( line ) !== null;
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

// mdbTracklist_numberingContinues
// Whether a blank line between these two is a gap INSIDE one tracklist rather than the end of it.
// Only the numbering can say so: "11." followed by "12." is one list however many blank lines the
// uploader put between them, and "6 Decks - 2 Mixers" followed by "01." is not.
function mdbTracklist_numberingContinues( before, after ) {
    var from = mdbTracklist_index( before ),
        to = mdbTracklist_index( after );

    return from > -1 && to > from;
}

// mdbTracklist_tidyLine
// The cue behind the track moved in front of it, and whatever trailed the cue turned into a bold
// note - see the "Tidying" part of the header. Returns the line unchanged when there is no
// trailing cue on it.
function mdbTracklist_tidyLine( line ) {
    var m = String( line || "" ).match( mdbTracklist_trailingCueRe );

    if( !m ) return line;

    var index = m[1] || "",
        track = m[2],
        cue = m[3],
        note = m[4] ? "'''" + m[4].trim() + ":''' " : "";

    return index + "[" + cue + "] " + note + track;
}

// mdbTracklist_indexStyle
// HOW a line writes its numbering, with the digits themselves left out: "1." and "01." are the
// same style, "12 -" is not. null for a line that is not numbered at all.
function mdbTracklist_indexStyle( line ) {
    var m = String( line || "" ).match( mdbTracklist_indexRe );

    // "|" cannot occur in either group - one is "#" or "(", the other a dash or ".):]"
    return m ? ( m[1] || "" ) + "|" + ( m[3] || "" ) : null;
}

// mdbTracklist_evenIndexes
// One numbering style for the whole block. An uploader who typed "12 - " and "13 - " into a list
// otherwise numbered "12 " wrote one tracklist and meant one thing by it, but the Tracklist
// Editor API reads the block as a whole: it strips the numbering it sees on most lines and leaves
// the odd ones out alone, so those two tracks keep their number and arrive as tracks called
// "12 - Wassu & Haums" and "13 - Juju".
//
// The MAJORITY style wins and only the lines that disagree with it are touched. That is also the
// answer to the dash that belongs to the artist rather than to the numbering: a list written
// "1 - Artist - Title" all the way down is consistent, so nothing about it is a minority and
// nothing is rewritten. A block does not write its artists differently from line to line - a
// separator standing out from every other line is the numbering, not a name.
function mdbTracklist_evenIndexes( lines ) {
    var counts = {},
        indexed = 0,
        top = null,
        i, style;

    for( i = 0; i < lines.length; i++ ) {
        style = mdbTracklist_indexStyle( lines[i] );

        if( style === null ) continue;

        indexed++;
        counts[ style ] = ( counts[ style ] || 0 ) + 1;

        if( !top || counts[ style ] > counts[ top ] ) top = style;
    }

    // A block that is not mostly numbered has no numbering style to even out - and the stray line
    // that DOES start with a number in an unnumbered tracklist ("2 Bad Mice - Bombscare") must not
    // become one by itself.
    if( !top || indexed * 2 < lines.length ) return lines;

    // Nothing to do, and the far more common case by a distance: everyone already agrees.
    if( counts[ top ] === indexed ) return lines;

    // A plurality is not a majority. Two styles splitting a block down the middle is an uploader
    // who changed their mind halfway, and picking a winner by one line would be a coin toss.
    if( counts[ top ] * 2 <= indexed ) {
        log( "mdbTracklist_evenIndexes: no numbering style holds a majority of the " + indexed + " numbered lines - leaving them as they are." );
        return lines;
    }

    var parts = top.split( "|" ),
        lead = parts[0],
        sep = parts[1],
        out = [];

    log( "mdbTracklist_evenIndexes: " + counts[ top ] + " of " + indexed + " numbered lines are written \"" +
         lead + "N" + sep + " \" - bringing the other " + ( indexed - counts[ top ] ) + " in line." );

    for( i = 0; i < lines.length; i++ ) {
        out.push( mdbTracklist_evenIndexLine( lines[i], top, lead, sep ) );
    }

    return out;
}

// mdbTracklist_evenIndexLine
// The digits are kept exactly as the uploader wrote them - "07" stays "07". Only what is
// decorated around them changes, which is the whole of what the API trips over.
function mdbTracklist_evenIndexLine( line, style, lead, sep ) {
    var mine = mdbTracklist_indexStyle( line );

    if( mine === null || mine === style ) return line;

    var m = String( line ).match( mdbTracklist_indexRe );

    return lead + m[2] + sep + " " + line.slice( m[0].length );
}

// mdbTracklist_tidy
// Everything the block gets on the way to the API, in the order the steps read the line: the
// numbering at the front evened out first, then the separator in the middle, then the cue behind
// the track moved in front of it.
function mdbTracklist_tidy( lines ) {
    return mdbTracklist_tidyCues( mdbTracklist_dashifySeparators( mdbTracklist_evenIndexes( lines ) ) );
}

// mdbTracklist_dashifySeparators
// A block written "Ackermann / Pure" turned into the "Artist - Title" the Tracklist Editor API
// reads. The API knows the dash and nothing else, so a slash line arrives as one nameless track
// carrying the whole line as its artist - a tracklist with no tracks in it.
//
// Most of the lines that carry a separator at all have to be slash lines before any of them is
// touched, the same "a pattern or nothing" rule as the cues below. A lone "Artist / Other Artist
// - Title" in a block of dashes is a collaboration, and rewriting its slash would move the split
// off the dash that really is the separator. The dash lines of a mostly-slash block are left
// alone for the mirror image of that reason: their separator already is the one the API reads.
function mdbTracklist_dashifySeparators( lines ) {
    var slash = 0,
        dash = 0,
        i, sep;

    for( i = 0; i < lines.length; i++ ) {
        sep = mdbTracklist_separator( lines[i] );

        if( sep === "/" ) slash++;
        else if( sep === "-" ) dash++;
    }

    if( !slash || slash <= dash ) return lines;

    log( "mdbTracklist_dashifySeparators: " + slash + " of the " + ( slash + dash ) +
         " lines with a separator split artist and title with a slash - writing those with \" - \"." );

    var out = [];

    for( i = 0; i < lines.length; i++ ) {
        out.push( mdbTracklist_separator( lines[i] ) === "/" ? mdbTracklist_dashifyLine( lines[i] ) : lines[i] );
    }

    return out;
}

// mdbTracklist_dashifyLine
// The line's first slash written as " - ", and nothing else touched: "Fu Dog, Sides / Mzanbouncy"
// -> "Fu Dog, Sides - Mzanbouncy". A second slash ("Artist / Title / Label") stays where the
// uploader put it - it separates the title from something else, not the artist from the title.
// The numbering and the cue are skipped over, the same way mdbTracklist_separator() takes them off
// before looking - so the slash that is rewritten is the one that was counted, never one sitting
// in front of the artist.
function mdbTracklist_dashifyLine( line ) {
    var text = String( line ),
        index = text.match( mdbTracklist_indexRe ),
        at = index ? index[0].length : 0,
        cue = text.slice( at ).match( mdbTracklist_cueRe );

    if( cue ) at += cue[0].length;

    return text.slice( 0, at ) + text.slice( at ).replace( mdbTracklist_slashTitleRe, "$1 - $2" );
}

// mdbTracklist_tidyCues
// Half the block has to carry a trailing cue before any of them is rewritten. One title ending in
// something clock-shaped ("Sandcastles 9:11") is not a pattern, and turning it into a cue would
// invent a timestamp no one wrote.
function mdbTracklist_tidyCues( lines ) {
    var withCue = 0,
        i;

    for( i = 0; i < lines.length; i++ ) {
        if( mdbTracklist_trailingCueRe.test( lines[i] ) ) withCue++;
    }

    if( withCue * 2 < lines.length ) return lines;

    log( "mdbTracklist_tidy: " + withCue + " of " + lines.length + " lines carry a cue behind the track - moving them in front." );

    var out = [];

    for( i = 0; i < lines.length; i++ ) {
        out.push( mdbTracklist_tidyLine( lines[i] ) );
    }

    return out;
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
        blankSeen = false,
        i;

    for( i = 0; i < lines.length; i++ ) {
        var line = lines[i].trim();

        // A blank line decides nothing by itself - what follows it does. See
        // mdbTracklist_numberingContinues(): a tracklist whose tracks are separate paragraphs has
        // a blank line between every pair of them and is still one tracklist.
        if( !line ) {
            if( run.length ) blankSeen = true;
            continue;
        }

        if( mdbTracklist_isCandidateLine( line ) ) {
            if( blankSeen && !mdbTracklist_numberingContinues( run[ run.length - 1 ], line ) ) {
                runs.push( run );
                run = [];
            }

            run.push( line );
        } else {
            if( run.length ) runs.push( run );
            run = [];
        }

        blankSeen = false;
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

    best = mdbTracklist_tidy( best );

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
                split = mdbTracklist_tidy( split );
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
