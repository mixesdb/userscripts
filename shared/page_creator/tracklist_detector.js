log( "/shared/page_creator/tracklist_detector.js loaded" );


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
 *     // several tracklists under headlines -> one text with a ";Chapter" line above each block,
 *     // and found.chapters holding the names - see "Chapters" below
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
 * A line ENDING IN A COMMA that is no track line of its own is not a line at all - it is the
 * front of the next one, and it is glued there before the runs are read. That is how an uploader
 * whose artist list ran over the row writes it: "Oliver Koletzki," on one line, "Niko Schwind,
 * Sidartha Siliceo-Satinka (Kermesse Remix)" on the next. Left standing it costs far more than
 * the one track it names - it is no candidate line, so the run ENDS there, and a tracklist with
 * two such wrapped credits in it arrives as three shorter ones, of which only the longest
 * survives - or as three chapters named after the leftovers. A line that already IS a track line
 * is never moved: a title that happens to end in a comma is a row of its own. The numbering does
 * not save it the same way, because a wrapped credit may well carry it ("02. Oliver Koletzki,"),
 * but then the line below has to carry none - two numbered lines are two tracks.
 *
 * Blank lines end a run, which is what keeps a heading ("Tracklist:") and the paragraph above it
 * out of the block - UNLESS the numbering steps over them. An uploader who writes every track as
 * its own paragraph (SoundCloud renders those as <p>, and the description then holds a blank line
 * between every pair of tracks) still wrote one tracklist, and "11." followed by "12." says so
 * across any gap. That the number has to go UP is what keeps the rule honest: in the Hard Times
 * description a "6 Decks - 2 Mixers" line sits one blank line above a tracklist starting at "01.",
 * and 1 does not follow 6, so that blank still ends the run.
 *
 * URLs are nothing and nowhere. A line that is only a link vanishes before the runs are read -
 * it neither joins a run nor ends one, and it is no blank line either: uploaders put a link
 * under every single track ("01.Lifeblood - ...", then "cicutanetlabel.com/release-019/"), and
 * a rule that merely refused to TAKE those lines would still cut the run apart at every one of
 * them. Most of these links are typed bare, without the http:// a scheme test would need, so a
 * bare "domain.tld/path" has to be recognized as well. A URL standing INSIDE a line is stripped
 * out of it, and what is left decides: "Buy it here - https://..." reads as "Artist - Title"
 * with the URL in place and as nothing once it is gone.
 *
 * A run is only taken when it is at least mdbTracklist_minTracks lines long and at least half of
 * them are real TRACK lines.
 *
 * On a numbered run the numbers additionally have to ASCEND, and the longest ascending stretch is
 * what survives. This is what throws out a stray "6 Decks - 2 Mixers" that happens to sit right
 * on top of a tracklist starting at "01." - and any other line that only looks numbered.
 *
 *
 *
 * The separator written without its spaces
 * ----------------------------------------
 * "Miret-Sabio Espejo (Original Mix)" is a track line to a reader and nothing at all to the rule
 * above, which wants a space on at least one side of the dash - the very thing that keeps
 * "Lo-Fi" and "Jerome Isma-Ae" from splitting into two tracks. Both cannot hold at once, so the
 * spaceless dash gets a SECOND PASS rather than a place in the first: only when the rules above
 * found no tracklist anywhere in the description are such lines rewritten to " - " and the whole
 * detection run again over the result. A description that already yielded a tracklist never
 * reaches the second pass, which is what leaves every case above exactly as it was.
 *
 * Four things keep that pass from making a tracklist out of prose:
 *
 *   - only a line carrying NEITHER a spaced dash NOR a slash is rewritten, so "Jerome Isma-Ae -
 *     Encounter" keeps splitting where its uploader spaced the separator out
 *   - the letter behind the dash has to be a CAPITAL. A compound word is lowercase behind its
 *     hyphen ("lo-fi", "dub-hazed", "much-needed", "record-breaking"), a title is not
 *   - at least mdbTracklist_minTracks lines have to be written that way before the pass runs at
 *     all. One hyphenated name in a paragraph is not a tracklist, and this is what keeps the
 *     pass away from the descriptions that simply hold none
 *   - and most of those lines have to RUN ON behind the dash. What is left of a capitalized
 *     compound is one word and the line ends there ("Berlin-Mitte", "Jean-Luc", "Isma-Ae"); a
 *     title carries on. Short prose lines each holding a hyphenated place name are the one
 *     thing that passes all three guards above, and this is what they fail. Counted over the
 *     block, not demanded of each line - a one-word title among the others is a track, and
 *     dropping that ONE line would tear the run in two
 *
 * What it cannot see is an artist written lowercase ("stbr-Reservoir"). That tracklist stays
 * unfound - which is the right way round: a run cut at the wrong dash is worse than no run.
 *
 *
 * Chapters
 * --------
 * A description holding SEVERAL tracklists, each under a headline ("First Hour - Ollie
 * Blackmore:", then ten tracks, then "Guest Mix - Natasha Kitty Katt", then ten more), is one
 * mix in parts - and MixesDB writes it that way, as chapters (Help:Tracklists#Chapters):
 *
 *     ;Ollie Blackmore
 *     01. Soul Slayerz Feat Karina Nistal - Call Me (Vocal Mix)
 *     ...
 *
 *     ;Natasha Kitty Katt
 *     01. Twisted Katt - Natasha Kitty Katt & Twisted Soul Collective
 *     ...
 *
 * So when more than one run passes, they are ALL taken - a ";Chapter" line above each block, a
 * blank line between the blocks - rather than silently dropping every list but the longest.
 * The Tracklist Editor API keeps the ";" lines and numbers each chapter's tracks on their own
 * (verified against it), so what leaves here survives the formatting.
 *
 * The chapter name is the headline standing above the run, stripped down to what MixesDB files
 * the chapter under: decorations, a trailing ":" or "-", and a "Guest Mix" / "Hour 1" / "First
 * Hour" prefix with whatever mixture of blanks, "-" and ":" it was typed with all go. A headline
 * that was ONLY such a prefix ("Guest Mix") keeps it - a generic chapter name still names the
 * chapter, where an empty one would break the wiki syntax.
 *
 * A headline needs no blank line under it. Written "Hour 1 - DJ A:" right on top of its tracks
 * it even reads as a track line and JOINS the run - so a run whose first line is unnumbered and
 * wears a headline's clothes (that prefix, or a trailing ":") has it peeled off, provided what
 * remains still passes as a tracklist on its own. See mdbTracklist_gluedHeadline().
 *
 * All or nothing: every run needs its own headline, and the runs have to agree on being
 * numbered. A run whose nearest line above is a track of the previous run (a torn tracklist,
 * not two chapters), a prose line, a bare "Tracklist:" heading or nothing at all means NO
 * chapters, and the longest single run wins as before - a wrong chapter split on a new page is
 * worse than the main tracklist alone.
 *
 *
 * Tidying, before the API sees it
 * -------------------------------
 * The block is handed over as the uploader wrote it, with six exceptions.
 *
 * A list bullet in front of the track is taken off: "- Eddie Richards - Someday" -> "Eddie
 * Richards - Someday". The hyphen is the expensive one - the Tracklist Editor API reads it as
 * "this line continues the one above" and glues the tracks together, so a list written with "- "
 * comes back as one row and, once it is long enough, as nothing at all. An en dash, a "•", a "·",
 * a ">" or a "~" survives into the artist name instead. No majority rule: a single bulleted line
 * already swallows the track above it.
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
 * The separator itself is written as " - ", whatever dash and whatever spacing it was typed with:
 * "Arion – Squaa" -> "Arion - Squaa". The API normalizes an em dash and one-sided spacing itself,
 * but not the EN dash - the one SoundCloud uploaders type most - and a line it does not read
 * splits into no artist at all, so the whole tracklist comes back with "These tracks seem to miss
 * the artist names" under it. Only the first separator of a line moves; a dash further right is
 * part of the title.
 *
 * A cue written BEHIND the
 * track ("Artist - Title 00:52:09") is moved in front of it, where MixesDB writes cues
 * ("[00:52:09] Artist - Title"), and anything trailing the cue becomes a bold note in front of the
 * artist ("00:56:00- CLASSIC OF THE WEEK" -> "'''CLASSIC OF THE WEEK:''' Artist - Title").
 * The Tracklist Editor API reads a leading cue and would take a trailing one for part of the
 * title, so this has to happen on our side. Only done when at least half the lines of the block
 * carry such a cue - one title that happens to end in something clock-shaped is not a pattern.
 *
 * And the "?" somebody hangs off the END of a track they are unsure about ("Gerd - Echo Jammz?")
 * is taken off, together with a trailing "…" - but only in a block that already writes "?" the
 * MixesDB way somewhere, in place of an artist or a title ("?", "Will Hofbauer - ?"). Without
 * such a mark nothing is touched, which is what leaves "Haddaway - What Is Love?" alone.
 *
 *
 * Comments
 * --------
 * Only ever asked when the description has nothing, and only for a WHOLE tracklist - the "the
 * track at 25 min is X - Y" comments are what this must not fall for. A SoundCloud comment is a
 * single line, so what MARKS the tracks is the only thing left to split on, and there are two
 * kinds of marker:
 *
 *   - the NUMBERING: "1.", "2." ... starting at 1 and counting up without a gap
 *   - the CUES: "(00)", "[05]", "1:02:30" - a number in brackets or a clock time carrying its
 *     colon, never a bare one, and never running backwards. Cues neither start at 1 nor count up
 *     one by one, because they are minutes into the mix and not track numbers, so the numbering
 *     rule cannot see them at all; that they only ever go UP, and arrive somewhere, is what
 *     takes its place
 *
 * Either way at least mdbTracklist_minCommentTracks tracks have to come out of the split and half
 * of them have to read "Artist - Title" - which is the bar the two markers really rest on, since
 * a comment mentioning a time or a number brings one track, not six. And because a comment's
 * tracks are written "Artist-Title" without the spaces at least as often as a description's lines
 * are, the second pass below runs over the split lines too when the first reading finds nothing.
 *
 * A comment tracklist with no marker at all cannot be split back into tracks by anyone and is
 * left alone on purpose.
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

// A chapter headline is a SHORT line. The longest real one seen so far ("First Hour - Ollie
// Blackmore:") is 29 characters; the prose lines that can also stand right above a tracklist
// run long past this.
var mdbTracklist_maxHeadlineLength = 60;

// What a headline hangs IN FRONT of the name and MixesDB does not file the chapter under:
// "Guest Mix - Natasha Kitty Katt", "Hour 1: Foo", "First Hour - Ollie Blackmore" - in whatever
// mixture of blanks, "-" and ":" it was typed. The name is what is left once it goes.
var mdbTracklist_chapterPrefixRe = /^(?:guest\s*mix(?:\s+by)?|(?:first|second|third|fourth|1st|2nd|3rd|4th)\s+hour|hour\s*(?:\d{1,2}|one|two|three|four))(?:\s*[-–—:]\s*|\s+)/i;

// "1.", "01", "1)", "001.)", "(1)", "#1", "1 - " - the front of a numbered track line, taken
// apart into what OPENS it, the digits, and the separator behind them. In three groups rather
// than one because the numbering is not only recognized here but rewritten - see
// mdbTracklist_evenIndexes().
// \d{1,3} and the required separator together are what keeps a year out: "2026 Best Of" leaves
// "6" where the separator has to be and does not match.
var mdbTracklist_indexRe = /^([#(]?)(\d{1,3})([.):\]]+|\s*[-–—])?[ \t]+/;

// A cue in front of the artist: "[000]", "[00:12:30]", "[cue]"
var mdbTracklist_cueRe = /^\[[^\]]*\]\s*/;

// The same cue written WITHOUT those brackets, plus whatever the writer put between it and the
// track: "00:36 = Artist - Title", "1:02:30 Artist - Title", "05:12 - Artist - Title".
// A clock time only. A bare number in front of a track is the NUMBERING (mdbTracklist_indexRe
// reads that one), and the colon is the whole difference between the two.
var mdbTracklist_leadingCueRe = /^(\d{1,3}(?::\d{2}){1,2})[ \t]*(?:[=|>~:–—-]+[ \t]*)?(?=\S)/;

// The same thing as a MARKER inside the one line a comment has: "(00)Gerd-Echo Jammz? (02)ID?
// ...". Read by mdbTracklist_splitCued() and by nothing else - a description splits into tracks
// by its line breaks and needs none of this.
//
// A bare number is deliberately no marker here: "1 Artist - Title" is the NUMBERING's shape and
// mdbTracklist_splitNumbered() is what reads that. The brackets, or the colon of a clock time,
// are what make a number a cue - which is also why the seconds of "(1:02)" may be one digit but
// those of a bare "1:02" may not: without brackets around it, "5:3" is a score, a date or a
// Bible verse far more often than it is a timestamp.
var mdbTracklist_commentCueRe = /(?:^|\s)(?:\((\d{1,3}(?::\d{1,2}){0,2})\)|\[(\d{1,3}(?::\d{1,2}){0,2})\]|(\d{1,3}:\d{2}(?::\d{2})?))[ \t]*(?=\S)/g;

// The bullet an uploader writes a list with instead of numbering it: "- Artist - Title",
// "• Artist - Title". Same characters mdbTracklist_chapterName() peels off a headline, plus the
// three dashes - see mdbTracklist_stripBullets() for what each of them costs.
//
// The blank behind it is what makes it a bullet and not a name: "-Ms- - Bad Boy" opens with a
// hyphen that belongs to the artist, and every real bullet seen so far is written with a space
// after it. Repeated ("-- Artist") because that is one bullet to whoever typed it.
var mdbTracklist_bulletRe = /^[*=~>|•·\-–—]+[ \t]+/;

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
//
// The two groups are the characters either side of the separator, kept so that the same regex can
// also do the rewriting - see mdbTracklist_plainDashes(). "+" for the same reason: "Artist -- Title"
// is ONE separator to whoever typed it, and rewriting only half of it would leave a stray dash in
// front of the title.
var mdbTracklist_artistTitleRe = /(\S)(?:\s[-–—]+\s?|\s?[-–—]+\s)(\S)/;

// The other separator uploaders write instead of that dash: "Ackermann / Pure", with "//", "\"
// and "\\" as the same thing. A space is required on BOTH sides here, where the dash needs only
// one: a slash lives inside words, dates and addresses all day long ("AC/DC", "w/ Mücha", "24/7",
// "music.beepd.co/card/anjaschneider"), so a one-sided rule would read half the prose of a
// description as a track line. The two groups are the characters either side of the separator,
// kept so that the same regex can also do the rewriting - see mdbTracklist_dashifyLine().
var mdbTracklist_slashTitleRe = /(\S)\s[\/\\]{1,2}\s(\S)/;

// The same separator with the spaces left off: "Miret-Sabio Espejo (Original Mix)". Only ever
// asked on the second pass and only of a line carrying neither of the two above - see "The
// separator written without its spaces" in the header.
//
// The CAPITAL behind the dash is what carries the whole rule. A hyphen without spaces around it
// is a hyphen inside a word nine times out of ten, and a word is lowercase behind it ("lo-fi",
// "dub-hazed", "much-needed"); a title is not. A digit is not allowed there either - "2026-08-19"
// and "24-7" would pass, and a date list is exactly what these descriptions are full of. A "?"
// passes as well, because "Will Hofbauer-?" is a track whose title the writer does not know,
// written the way MixesDB writes an unknown one - and no compound word carries a question mark
// behind its hyphen. The two groups are the characters either side, kept so the same regex can
// do the rewriting.
var mdbTracklist_tightDashRe = /([\p{L}\p{N}])[-–—](\p{Lu}|\?)/u;

// A cue written behind the track instead of in front of it, with whatever the uploader hung off
// it: "Artist - Title 00:52:09", "Artist - Title 00:56:00- CLASSIC OF THE WEEK".
// The index in front is kept as it is; only what stands behind the track moves.
var mdbTracklist_trailingCueRe = /^([#(]?\d{1,3}(?:[.):\]]+|\s*[-–—])?[ \t]+)?(.*\S)\s+(\d{1,3}:\d{2}(?::\d{2})?)\s*(?:[-–—]\s*(\S.*?))?\s*$/;

// A line that is nothing but a link. Uploaders put one under every track, and most are written
// without the http:// a scheme test would need - so a bare "domain.tld/path" and even a bare
// "domain.tld" have to be read as one. Two things keep track names out of it: the TLD has to be
// LOWERCASE and short, which is what saves "Mono.xID" (an artist) and "R.E.M", and the label in
// front of it has to carry a letter, which is what saves "4.Slam" (a numbered one-word track) -
// a digits-only host like "1001.tl" only passes with its scheme on.
var mdbTracklist_urlLineRe = /^(?:https?:\/\/\S+|www\.\S+|[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9-]+)*\.[a-z]{2,6}(?:[\/?#]\S*)?)$/;

// The same thing INSIDE a line ("Facebook - www.facebook.com/MichonOfficial", "Find the
// tracklist and Q&A at ra.co/podcast/1070"). Stricter than the whole-line rule in one point: a
// bare domain needs its /path here, because "feat.dj" can stand inside a track title where a
// lone "domain.tld" line cannot. Only a URL at the start of the line or behind a space is one -
// a slash or dot glued into a word is part of that word.
var mdbTracklist_urlInLineRe = /(?:^|\s)(?:https?:\/\/\S+|www\.\S+|[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9-]+)*\.[a-z]{2,6}\/\S*)/g;

// mdbTracklist_stripUrls
// The line with its URLs taken out and the spacing healed. "" for a line that was only URL(s).
function mdbTracklist_stripUrls( line ) {
    return String( line || "" )
        .replace( mdbTracklist_urlInLineRe, " " )
        .replace( /[ \t]+/g, " " )
        .trim();
}

// mdbTracklist_normalize
// One text, one line ending, one kind of space. Non-breaking spaces are what a pasted tracklist
// is full of, and they would make every " - " test fail for no visible reason.
//
// The same goes for the rest of Unicode's spaces and for the two characters that are not
// spaces at all: U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR. Word processors and
// phone keyboards put them into descriptions, and they are INVISIBLE there - a line reading
// "8. <U+2028>@tpusemusic - Syd's Night" looks like every other line of the tracklist. Nothing
// in [ \t] steps over one, so mdbTracklist_indexRe stopped in front of it, the index strip
// left it standing, and it rode all the way into the wiki text as a stray blank ("#  Artist").
//
// They become a SPACE, not a "\n": in a description they turn up inside a line far more often
// than as its break, and splitting there would cut the tracklist in two at that very track.
function mdbTracklist_normalize( text ) {
    return String( text || "" )
        .replace( /\r\n?/g, "\n" )
        .replace( /[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, " " )
        // zero-width joiners and the BOM have no width to give - they go, rather than becoming
        // a blank that was never on screen
        .replace( /[\u200b-\u200d\ufeff]/g, "" )
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
// mdbTracklist_detectInText() strips URLs out before this is asked, so the test here is only
// the backstop for a URL written in a way the stripper's boundaries do not reach.
function mdbTracklist_isCandidateLine( line ) {
    if( !line ) return false;
    if( line.length > mdbTracklist_maxLineLength ) return false;
    if( /https?:\/\//i.test( line ) ) return false;

    return mdbTracklist_isTrackLine( line ) || mdbTracklist_indexRe.test( line );
}

// mdbTracklist_joinContinuations
// The cleaned lines with every WRAPPED line glued onto the one below it - see the header. The
// line it came from is left behind as null, the way a URL line is: it joins no run, it ends
// none, and every other line keeps the position the chapter lookup reads it by.
//
// A trailing comma is the whole signal, and it is enough because the line is judged as well: one
// that already passes as a TRACK is a row of its own, whatever it ends in, and gluing it onto
// the next one would cost two tracks instead of saving one.
//
// The wrapped line may well carry the block's numbering ("02. Oliver Koletzki," and the rest of
// the credit under it), so a number does not save a line here the way it saves a track line -
// but then the line below has to carry NONE, or the two are two numbered tracks and neither
// wrapped anywhere.
function mdbTracklist_joinContinuations( cleaned ) {
    var moved = 0,
        i, line, next;

    for( i = 0; i < cleaned.length - 1; i++ ) {
        line = cleaned[i];
        next = cleaned[i + 1];

        // null is a URL line, "" a blank one - a credit does not wrap across either
        if( !line || !next ) continue;
        if( !/,$/.test( line ) ) continue;
        if( line.length > mdbTracklist_maxLineLength ) continue;
        if( mdbTracklist_isTrackLine( line ) ) continue;
        if( mdbTracklist_index( line ) > -1 && mdbTracklist_index( next ) > -1 ) continue;
        if( line.length + 1 + next.length > mdbTracklist_maxLineLength ) continue;

        cleaned[i + 1] = line + " " + next;
        cleaned[i] = null;
        moved++;
    }

    if( moved ) {
        log( "mdbTracklist_joinContinuations: " + moved + " line(s) end in a comma and carry no track of their own - glued onto the line below." );
    }

    return cleaned;
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

// mdbTracklist_stripBullets
// The list bullet in front of the track taken off: "- Eddie Richards - Someday" -> "Eddie
// Richards - Someday". The FIRST thing the block gets, so that everything after it - the
// numbering, the separator, the cue - looks at the track itself and not at a decoration in front
// of it.
//
// A leading hyphen is the one that turns a whole tracklist into nothing: the Tracklist Editor API
// reads it as "this line continues the one above" and glues the tracks together, so a 32-line
// list written with "- " comes back as ONE row - and once that row is long enough, as an empty
// text with "No tracklist received." under it, which is a box that never opens. The others cost
// less but are just as wrong: an en dash, a "•", a "·", a ">" or a "~" survives into the artist
// name, and every track of the created page starts with it.
//
// No majority rule, unlike the slash: a bullet is not a separator anyone could have meant, and a
// SINGLE hyphen line already swallows the track above it - there is no pattern to wait for. Only
// lines that made it into the run are seen here, and those are track lines or numbered lines,
// where nothing in front of the artist belongs to the artist.
function mdbTracklist_stripBullets( lines ) {
    var out = [],
        changed = 0,
        i, line;

    for( i = 0; i < lines.length; i++ ) {
        line = String( lines[i] ).replace( mdbTracklist_bulletRe, "" );

        if( line !== lines[i] ) changed++;

        out.push( line );
    }

    if( changed ) {
        log( "mdbTracklist_stripBullets: " + changed + " of the " + lines.length +
             " lines open with a list bullet - taken off." );
    }

    return out;
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
// bullet in front of it off first, then the cue that stands in front of the track written the
// way MixesDB writes one - both are decorations every step below has to look past - then the
// numbering evened out, then the separator in the middle, then the cue behind the track moved in
// front of it - and last the writer's own "?" off the end, which has to come last because it is
// the only step that reads the separator the steps above it wrote.
function mdbTracklist_tidy( lines ) {
    return mdbTracklist_tidyUnsure( mdbTracklist_tidyCues( mdbTracklist_plainDashes( mdbTracklist_dashifySeparators( mdbTracklist_evenIndexes( mdbTracklist_tidyLeadingCues( mdbTracklist_stripBullets( lines ) ) ) ) ) ) );
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
function mdbTracklist_dashifyLine( line ) {
    var text = String( line ),
        at = mdbTracklist_bodyAt( text );

    return text.slice( 0, at ) + text.slice( at ).replace( mdbTracklist_slashTitleRe, "$1 - $2" );
}

// mdbTracklist_bodyAt
// Where the track itself starts on a line: behind the numbering and behind a leading cue. Both
// rewriters skip over that, the same way mdbTracklist_separator() takes both off before looking -
// so the separator they change is the one that was counted, never one sitting in front of the
// artist ("12 – Artist – Title" is numbered "12 – " and split by the SECOND dash).
function mdbTracklist_bodyAt( text ) {
    var index = text.match( mdbTracklist_indexRe ),
        at = index ? index[0].length : 0,
        cue = text.slice( at ).match( mdbTracklist_cueRe );

    return cue ? at + cue[0].length : at;
}

// mdbTracklist_plainDashes
// The separator written as the " - " the Tracklist Editor API reads, whatever dash and whatever
// spacing the uploader typed: "Arion – Squaa" -> "Arion - Squaa".
//
// The API normalizes an em dash and one-sided spacing itself, but NOT the en dash - which is the
// one SoundCloud uploaders type most (whose-these-records/whose-these-cast-02-by-mar-1 is written
// with it throughout). Such a line comes back as one nameless track carrying the whole line as its
// artist, and the box turns orange with "These tracks seem to miss the artist names" under it -
// listing every track of the tracklist. Same reasoning as the slash above: the API knows one
// separator, so everything else has to be rewritten on our side.
//
// No majority rule here, unlike the slash: a dash with a space next to it IS the separator on a
// line that has one, whichever of the three it is - that is the very rule the run was detected by.
function mdbTracklist_plainDashes( lines ) {
    var out = [],
        changed = 0,
        i, line;

    for( i = 0; i < lines.length; i++ ) {
        line = mdbTracklist_plainDashLine( lines[i] );

        if( line !== lines[i] ) changed++;

        out.push( line );
    }

    if( changed ) {
        log( "mdbTracklist_plainDashes: " + changed + " of the " + lines.length +
             " lines split artist and title with something other than \" - \" - written as \" - \"." );
    }

    return out;
}

// mdbTracklist_plainDashLine
// Only the FIRST separator of the line moves, the one mdbTracklist_separator() judged it by. A
// dash further right belongs to the title and stays as the uploader wrote it: "Kevin Saunderson –
// Inner City Pennies From Heaven - Roland Leesker Remix" is artist, title and remix credit, and
// the API splits on the first " - " too.
function mdbTracklist_plainDashLine( line ) {
    var text = String( line ),
        at = mdbTracklist_bodyAt( text );

    return text.slice( 0, at ) + text.slice( at ).replace( mdbTracklist_artistTitleRe, "$1 - $2" );
}

// mdbTracklist_tidyLeadingCues
// A cue in FRONT of the track, put into the brackets MixesDB writes a cue in: "00:36 = Power
// Tool - Madness" -> "[00:36] Power Tool - Madness". The digits are left exactly as they were
// typed, the same way mdbTracklist_splitCued() writes a comment's markers.
//
// The API cannot read the bare form (measured against it 2026-08-28): it takes the "00:" for the
// line's numbering and leaves a stray "36" standing in front of the artist, and "1:31:39" loses
// its hour the same way - "# 36 = Power Tool - Madness" for a line 33 uploaders out of 33 wrote
// as a timestamp. Whatever they put between the cue and the track goes with the rewriting: an
// "=" left standing would be read as part of the artist, a "-" as the artist/title separator
// itself, which costs the whole track.
//
// Half the block has to carry one, for the same reason mdbTracklist_tidyCues() below waits for
// the same majority: a single line opening with something clock-shaped is not a pattern.
function mdbTracklist_tidyLeadingCues( lines ) {
    var withCue = 0,
        out = [],
        i;

    for( i = 0; i < lines.length; i++ ) {
        if( mdbTracklist_leadingCueLine( lines[i] ) !== null ) withCue++;
    }

    if( withCue * 2 < lines.length ) return lines;

    log( "mdbTracklist_tidy: " + withCue + " of " + lines.length + " lines open with a cue of their own - writing it the way MixesDB writes a cue." );

    for( i = 0; i < lines.length; i++ ) {
        out.push( mdbTracklist_leadingCueLine( lines[i] ) || lines[i] );
    }

    return out;
}

// mdbTracklist_leadingCueLine
// The one line rewritten, or null when it carries no bare cue in front - which is also how
// mdbTracklist_tidyLeadingCues() counts them, so the test and the rewriting can never disagree.
//
// The line's NUMBERING is taken off first and put back untouched: "01. 00:36 Artist - Title" is
// the shape a numbered tracklist with timestamps is written in, and the cue in it sits behind
// the number, not at the start of the line.
function mdbTracklist_leadingCueLine( line ) {
    var text = String( line || "" ),
        index = text.match( mdbTracklist_indexRe ),
        at = index ? index[0].length : 0,
        body = text.slice( at );

    if( !mdbTracklist_leadingCueRe.test( body ) ) return null;

    return text.slice( 0, at ) + body.replace( mdbTracklist_leadingCueRe, "[$1] " );
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

// mdbTracklist_unsureMark
// Whether this line writes a "?" the way MixesDB does - IN PLACE of the artist, in place of the
// title, or as the whole track. That is the mark mdbTracklist_tidyUnsure() waits for before it
// believes a "?" hanging off the end of any other line.
function mdbTracklist_unsureMark( line ) {
    var text = String( line || "" ),
        body = text.slice( mdbTracklist_bodyAt( text ) ).trim(),
        at = body.indexOf( " - " );

    if( body === "?" ) return true;
    if( at < 0 ) return false;

    return body.slice( 0, at ).trim() === "?" || body.slice( at + 3 ).trim() === "?";
}

// mdbTracklist_tidyUnsure
// The "?" a writer hangs off the END of a track they are not certain about taken off: "(00)Gerd-
// Echo Jammz?" is Gerd's "Echo Jammz" with a question mark of the writer's own on it, not a title
// that asks a question. A "…" behind the title is the same thing - somebody trailing off, or a
// comment cut short where it was read - and neither belongs in a MixesDB tracklist.
//
// Only ever done in a block that ALREADY writes "?" the MixesDB way somewhere: in place of the
// artist, in place of the title, or as the whole track ("(42)?", "(62)Will Hofbauer-?"). THAT is
// what says this writer marks what they do not know with a "?" - and without one, nothing here
// is touched, which is what leaves "Haddaway - What Is Love?" and every other title that really
// does end in a question mark alone. The same "a pattern or nothing" rule the slashes and the
// trailing cues are rewritten by.
//
// A "?" that IS the artist or the title stays whatever the block does - taking it off would
// leave "Will Hofbauer - " with nothing behind the separator - and so does a line with no
// separator at all, where "ID?" is all anyone knows about the track.
function mdbTracklist_tidyUnsure( lines ) {
    var marks = 0,
        changed = 0,
        out = [],
        i;

    for( i = 0; i < lines.length; i++ ) {
        if( mdbTracklist_unsureMark( lines[i] ) ) marks++;
    }

    if( !marks ) return lines;

    for( i = 0; i < lines.length; i++ ) {
        var line = String( lines[i] ),
            at = mdbTracklist_bodyAt( line ),
            body = line.slice( at ),
            sep = body.indexOf( " - " ),
            title = sep > -1 ? body.slice( sep + 3 ).trim() : "",
            bare = title.replace( /\s*(?:\?+|\.\.\.|…)$/, "" ).trim();

        if( bare && bare !== title ) {
            out.push( line.slice( 0, at ) + body.slice( 0, sep + 3 ) + bare );
            changed++;
        } else {
            out.push( lines[i] );
        }
    }

    if( changed ) {
        log( "mdbTracklist_tidyUnsure: " + marks + " of the " + lines.length +
             " lines write \"?\" for what the writer does not know - taking the same mark off the end of " +
             changed + " named track(s)." );
    }

    return out;
}

// mdbTracklist_takeAscending
// Of a numbered run, the longest stretch whose numbers count upwards - as { lines, at }, where
// `at` is the offset of that stretch inside the run, so the caller can map it back to a position
// in the description. Lines without a number (the "06. [018] ID" case is numbered, but "ID"
// alone is not) ride along without breaking it.
//
// This is what a stray line on top of a tracklist runs into: "6 Decks - 2 Mixers" directly above
// "01. Hardrive - No Cure" reads as track 6 followed by track 1, so the stretch breaks between
// them and the 26 real tracks win over the stretch of one.
function mdbTracklist_takeAscending( lines ) {
    var best = [],
        bestAt = 0,
        current = [],
        currentAt = 0,
        last = -1,
        i;

    for( i = 0; i < lines.length; i++ ) {
        var index = mdbTracklist_index( lines[i] );

        if( index > -1 && index <= last ) {
            if( current.length > best.length ) {
                best = current;
                bestAt = currentAt;
            }

            current = [];
            currentAt = i;
            last = -1;
        }

        current.push( lines[i] );
        if( index > -1 ) last = index;
    }

    return current.length > best.length
        ? { lines: current, at: currentAt }
        : { lines: best, at: bestAt };
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

// mdbTracklist_chapterName
// The chapter name a headline holds, or null for a line that cannot be one. Decorations go
// first ("*** Tracklisting ***"), then a trailing ":" or "-" ("First Hour - Ollie Blackmore:"),
// then the mdbTracklist_chapterPrefixRe prefix. A headline that was ONLY the prefix ("Guest
// Mix") keeps it - a generic chapter name still names the chapter, where an empty one would
// break the wiki syntax.
//
// null is for what disqualifies the LINE, not just the name: a line numbered like a track is a
// leftover track, one past mdbTracklist_maxHeadlineLength or ending like a sentence is prose,
// and a bare "Tracklist(ing)" heading titles the WHOLE list, not a chapter of it.
function mdbTracklist_chapterName( line ) {
    var name = String( line || "" )
        .replace( /^[\s*=~_#>|•·-]+/, "" )
        .replace( /[\s*=~_#>|•·]+$/, "" );

    if( !name || name.length > mdbTracklist_maxHeadlineLength ) return null;
    if( mdbTracklist_indexRe.test( name ) ) return null;
    if( /[.!?…]$/.test( name ) ) return null;

    name = name.replace( /[\s:\-–—]+$/, "" );

    if( !name ) return null;

    // The prefix can stack ("Hour 1 - Guest Mix: Foo"), so it is taken off until none is left -
    // with a bound, so a pathological line cannot loop this.
    var stripped = name,
        guard = 4;

    while( guard-- > 0 && mdbTracklist_chapterPrefixRe.test( stripped ) ) {
        stripped = stripped.replace( mdbTracklist_chapterPrefixRe, "" ).replace( /[\s:\-–—]+$/, "" );
    }

    if( !stripped ) stripped = name;

    if( /^(?:(?:full|the)\s+)?(?:track\s*list(?:ing|s)?|playlist)$/i.test( stripped ) ) return null;

    return stripped;
}

// mdbTracklist_chapterHeadline
// The headline standing above a run, as a chapter name - or null when there is none. `cleaned`
// is the description exactly as the run collector read it ("" a blank line, null a URL line -
// which is nothing here too, uploaders put a link under a headline like under everything else),
// and the FIRST real line above the run decides. A track of another taken tracklist there means
// the runs stand back to back with nothing between them - a torn tracklist, not two chapters.
function mdbTracklist_chapterHeadline( from, accepted, cleaned ) {
    var i, j;

    for( i = from - 1; i >= 0; i-- ) {
        if( cleaned[i] === null || cleaned[i] === "" ) continue;

        for( j = 0; j < accepted.length; j++ ) {
            if( i >= accepted[j].from && i <= accepted[j].to ) return null;
        }

        return mdbTracklist_chapterName( cleaned[i] );
    }

    return null;
}

// mdbTracklist_gluedHeadline
// Whether a run's first line is a headline GLUED to its block: no blank line between "Hour 1 -
// DJ A:" and the tracks means the headline reads as a track line and joins the run. Only a line
// that is unnumbered AND wears a headline's clothes - the chapter prefix or a trailing ":" -
// counts: an unnumbered first track ("ID - Intro") wears neither, and a numbered one is a track
// whatever it ends in.
function mdbTracklist_gluedHeadline( line ) {
    if( mdbTracklist_index( line ) > -1 ) return false;

    var bare = String( line || "" ).replace( /^[\s*=~_#>|•·-]+/, "" );

    return mdbTracklist_chapterPrefixRe.test( bare ) || /:$/.test( bare );
}

// mdbTracklist_chapters
// Several tracklists as ONE, written the way MixesDB writes a mix in parts - see "Chapters" in
// the header. All or nothing: every run needs its own headline and the runs have to agree on
// being numbered, otherwise null, and the caller falls back to the longest single run.
function mdbTracklist_chapters( accepted, cleaned, min ) {
    var parts = [],
        i, part, name, rest, restScore;

    for( i = 0; i < accepted.length; i++ ) {
        part = accepted[i];
        name = null;

        // A glued headline is peeled off the front of its run - but only when what remains
        // still passes as a tracklist on its own. When it does not, the line was not a headline
        // after all and the lookup above the run gets its turn.
        if( mdbTracklist_gluedHeadline( part.lines[0] ) ) {
            name = mdbTracklist_chapterName( part.lines[0] );
            rest = part.lines.slice( 1 );
            restScore = name ? mdbTracklist_acceptRun( rest, min ) : null;

            if( restScore ) {
                part = { lines: rest, score: restScore, from: part.from, to: part.to };
            } else {
                name = null;
            }
        }

        if( !name ) name = mdbTracklist_chapterHeadline( part.from, accepted, cleaned );

        if( !name ) {
            log( "mdbTracklist_chapters: tracklist " + ( i + 1 ) + " of " + accepted.length + " has no headline above it - no chapters." );
            return null;
        }

        parts.push({ name: name, lines: part.lines, score: part.score });
    }

    var indexed = parts[0].score.indexed * 2 >= parts[0].score.rows,
        blocks = [],
        rows = 0,
        names = [];

    for( i = 0; i < parts.length; i++ ) {
        if( ( parts[i].score.indexed * 2 >= parts[i].score.rows ) !== indexed ) {
            log( "mdbTracklist_chapters: the " + parts.length + " tracklists do not agree on being numbered - no chapters." );
            return null;
        }
    }

    // Each block is tidied on its own: the majority rules (numbering style, slash separators,
    // trailing cues) are per-tracklist decisions, and one chapter's style must not outvote
    // another's.
    for( i = 0; i < parts.length; i++ ) {
        blocks.push( ";" + parts[i].name + "\n" + mdbTracklist_tidy( parts[i].lines ).join( "\n" ) );
        rows += parts[i].score.rows;
        names.push( parts[i].name );
    }

    log( "mdbTracklist_chapters: " + parts.length + " tracklists under headlines - written as chapters: \"" + names.join( "\", \"" ) + "\"." );

    return {
        text: blocks.join( "\n\n" ),
        lines: rows,
        indexed: indexed,
        chapters: names
    };
}

// mdbTracklist_spaceTightDashes
// The description with a spaceless "Artist-Title" separator written as the " - " every rule in
// here reads - see "The separator written without its spaces" in the header. null when fewer
// than mdbTracklist_minTracks lines are written that way, and that is the guard keeping the
// second pass away from the descriptions that simply hold no tracklist: one hyphenated name in
// a paragraph must not start a search for a run.
//
// A line carrying a spaced dash or a slash is left alone - its separator is already the one that
// was counted, and moving an earlier hyphen would split "Jerome Isma-Ae - Encounter" into
// "Jerome Isma" and "Ae - Encounter". URLs come out of a line BEFORE it is judged, and a line
// that was nothing but a URL is passed through untouched: "cicutanetlabel.com/release-Nine" is a
// link, and spacing its hyphen out would hand the detector a track line to believe.
function mdbTracklist_spaceTightDashes( text ) {
    var lines = mdbTracklist_normalize( text ).split( "\n" ),
        out = [],
        changed = 0,
        titled = 0,
        i, bare, at, body, spaced;

    for( i = 0; i < lines.length; i++ ) {
        bare = mdbTracklist_urlLineRe.test( lines[i].trim() ) ? "" : mdbTracklist_stripUrls( lines[i] );

        if( !bare || mdbTracklist_separator( bare ) !== null ) {
            out.push( lines[i] );
            continue;
        }

        // the numbering and a leading cue are skipped, the same way both rewriters do it - the
        // dash of a "12 - " numbering is not the separator, and "[00:12]" carries none at all
        at = mdbTracklist_bodyAt( bare );
        body = bare.slice( at );
        spaced = body.replace( mdbTracklist_tightDashRe, "$1 - $2" );

        if( spaced === body ) {
            out.push( lines[i] );
            continue;
        }

        out.push( bare.slice( 0, at ) + spaced );
        changed++;

        // Does what stands BEHIND the dash run on? A title does ("Sabio Espejo (Original Mix)"),
        // the second half of a compound name does not ("Berlin-Mitte", "Jean-Luc", "Isma-Ae").
        if( /\s/.test( spaced.slice( spaced.indexOf( " - " ) + 3 ) ) ) titled++;
    }

    if( changed < mdbTracklist_minTracks ) return null;

    // A pattern or nothing, the same rule the cues and the slashes are rewritten by: most of
    // these lines have to read like "Artist - Title Words" before ANY of them is believed. Five
    // short lines of prose each carrying a hyphenated place name ("Live at Berlin-Mitte",
    // "Recorded in Baden-Baden" ...) are the one thing that otherwise passes every guard above,
    // and they all end where the compound ends. Counted rather than demanded per line: a
    // one-word title among them is a track, and dropping THAT line would tear the run in two -
    // which is the outcome this file calls worse than finding nothing.
    if( titled * 2 < changed ) {
        log( "mdbTracklist_spaceTightDashes: " + changed + " lines carry a dash without spaces, but only " +
             titled + " of them run on behind it - reads as hyphenated names, not as a tracklist." );
        return null;
    }

    log( "mdbTracklist_spaceTightDashes: " + changed + " lines split artist and title with a dash carrying no spaces - written as \" - \" for a second pass." );

    return out.join( "\n" );
}

// mdbTracklist_detectInText
// The entry point for a description. Returns the tracklist as it stands in the text - unchanged,
// numbering and cues included, since the Tracklist Editor API is the one that normalizes it.
// Several tracklists under headlines come back as one text with a ";Chapter" line above each -
// see mdbTracklist_chapters().
//
// Two passes over the same rules: the text as it was written, and - only when that found nothing
// - the text with its spaceless separators spaced out. See "The separator written without its
// spaces" in the header for why the two cannot be one pass.
function mdbTracklist_detectInText( text, minTracks ) {
    var min = minTracks || mdbTracklist_minTracks,
        found = mdbTracklist_detectRuns( text, min );

    if( found ) return found;

    var spaced = mdbTracklist_spaceTightDashes( text );

    if( !spaced ) return null;

    return mdbTracklist_detectRuns( spaced, min );
}

// mdbTracklist_detectRuns
// One pass of the detection - see mdbTracklist_detectInText(), which is what everything else
// calls.
function mdbTracklist_detectRuns( text, minTracks ) {
    var min = minTracks || mdbTracklist_minTracks,
        lines = mdbTracklist_normalize( text ).split( "\n" ),
        cleaned = [],
        i, raw, line;

    // What each line IS, decided once and kept: null for a line that was nothing but URL(s) -
    // see the header - "" for a blank line, the URL-stripped text for everything else. An array
    // rather than a step inside the loop below because the chapter step reads the lines ABOVE a
    // run again, and it has to read them the same way.
    for( i = 0; i < lines.length; i++ ) {
        raw = lines[i].trim();
        line = mdbTracklist_urlLineRe.test( raw ) ? "" : mdbTracklist_stripUrls( raw );

        cleaned.push( raw && !line ? null : line );
    }

    // A wrapped credit is glued onto the track it belongs to before any run is read - a line
    // that is only the front of the next one must not be allowed to end a run. See the header.
    mdbTracklist_joinContinuations( cleaned );

    var runs = [],
        run = null,
        blankSeen = false;

    for( i = 0; i < cleaned.length; i++ ) {
        line = cleaned[i];

        // A URL line vanishes - it does not join the run, it does not end it, and it is NOT a
        // blank line: the track above it and the track below it are neighbours. A blank the
        // uploader wrote around it still counts, which is why this steps over blankSeen instead
        // of resetting it.
        if( line === null ) continue;

        // A blank line decides nothing by itself - what follows it does. See
        // mdbTracklist_numberingContinues(): a tracklist whose tracks are separate paragraphs has
        // a blank line between every pair of them and is still one tracklist.
        if( !line ) {
            if( run ) blankSeen = true;
            continue;
        }

        if( mdbTracklist_isCandidateLine( line ) ) {
            if( run && blankSeen && !mdbTracklist_numberingContinues( run.lines[ run.lines.length - 1 ], line ) ) {
                runs.push( run );
                run = null;
            }

            // `at` remembers where each line stands in the description, so an accepted run can
            // be traced back there - the chapter step looks for the headline ABOVE that spot.
            if( !run ) run = { lines: [], at: [] };

            run.lines.push( line );
            run.at.push( i );
        } else {
            if( run ) runs.push( run );
            run = null;
        }

        blankSeen = false;
    }
    if( run ) runs.push( run );

    var accepted = [],
        best = null,
        bestScore = null;

    for( i = 0; i < runs.length; i++ ) {
        var candidate = runs[i].lines,
            offset = 0,
            score = mdbTracklist_scoreRun( candidate );

        // Numbered runs are cut down to their longest ascending stretch first, so a run that
        // only borrowed its neighbour's numbering is judged on what is really left of it.
        if( score.indexed * 2 >= score.rows ) {
            var stretch = mdbTracklist_takeAscending( candidate );

            candidate = stretch.lines;
            offset = stretch.at;
        }

        score = mdbTracklist_acceptRun( candidate, min );
        if( !score ) continue;

        accepted.push({
            lines: candidate,
            score: score,
            from: runs[i].at[ offset ],
            to: runs[i].at[ offset + candidate.length - 1 ]
        });

        if( !best || candidate.length > best.length ) {
            best = candidate;
            bestScore = score;
        }
    }

    // More than one tracklist in one description is a mix in parts when every part has its
    // headline - then all of them are taken, as chapters. When they cannot be (no headline,
    // prose, a torn tracklist), the longest single run below wins as before.
    if( accepted.length > 1 ) {
        var chaptered = mdbTracklist_chapters( accepted, cleaned, min );

        if( chaptered ) return chaptered;
    }

    if( !best ) {
        log( "mdbTracklist_detectRuns: no tracklist found in " + lines.length + " lines of text." );
        return null;
    }

    log( "mdbTracklist_detectRuns: found " + best.length + " lines (" + bestScore.tracks +
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

// mdbTracklist_cueSeconds
// A cue as seconds, so that two of them can be compared. A bare number is MINUTES - that is what
// "[000]" means on a MixesDB tracklist and what a comment writer means by "(45)" - "1:02" is
// minutes and seconds, "1:02:30" hours, minutes and seconds.
function mdbTracklist_cueSeconds( cue ) {
    var parts = String( cue ).split( ":" ),
        h = 0,
        m = 0,
        s = 0;

    if( parts.length === 1 ) {
        m = parseInt( parts[0], 10 );
    } else if( parts.length === 2 ) {
        m = parseInt( parts[0], 10 );
        s = parseInt( parts[1], 10 );
    } else {
        h = parseInt( parts[0], 10 );
        m = parseInt( parts[1], 10 );
        s = parseInt( parts[2], 10 );
    }

    return h * 3600 + m * 60 + s;
}

// mdbTracklist_splitCued
// The other way a whole tracklist arrives in ONE line: marked with CUES instead of numbering -
// "(00)Gerd-Echo Jammz? (02)ID? (05)Tikkle-Bubbles (Club Mix) ...". The split above cannot see
// those, and must not: they neither start at 1 nor count up one by one, because they are minutes
// into the mix and not track numbers.
//
// What takes the place of that rule is that a cue list never runs BACKWARDS. The longest stretch
// of markers that only ever goes up is the tracklist, and the sentence somebody wrapped around it
// is not part of it. On its own that is weak - two times mentioned in one sentence are in some
// order too - so everything else rests on the bar every comment tracklist has to clear anyway:
// mdbTracklist_minCommentTracks tracks, half of them a real "Artist - Title". "the one at 42 is
// Objekt - Ganzfeld, and 1:02:30 too" brings two markers and one track and gets nowhere near it.
//
// The cue is rewritten into the brackets MixesDB writes it in, with the digits left exactly as
// they were typed: "(00)" -> "[00] ". The Tracklist Editor API reads a leading "[00]" and would
// take "(00)Gerd" for an artist called "(00)Gerd".
function mdbTracklist_splitCued( text ) {
    var line = mdbTracklist_normalize( text ).replace( /\n+/g, " " ).trim(),
        marks = [],
        m;

    // a shared /g regex remembers where it stopped - and this one is asked once per comment
    mdbTracklist_commentCueRe.lastIndex = 0;

    while( ( m = mdbTracklist_commentCueRe.exec( line ) ) !== null ) {
        // the match may start on the space in front of the marker, and it eats the space behind
        // it - the cue starts at the bracket, the track behind whatever follows it
        var cue = m[1] || m[2] || m[3],
            lead = m[0].match( /^\s*/ )[0].length;

        marks.push({
            at:    m.index + lead,
            track: m.index + m[0].length,
            cue:   cue,
            secs:  mdbTracklist_cueSeconds( cue )
        });
    }

    // The longest stretch of markers that never steps back, kept as a window into `marks` rather
    // than as a copy - the split below needs where each of them SAT in the line, not just what it
    // said. One stray time in the sentence in front of the list ("the drop at (60) is unreal, btw
    // (00)...") is exactly what this drops.
    var best = { at: 0, len: 0 },
        start = 0,
        i;

    for( i = 1; i <= marks.length; i++ ) {
        if( i < marks.length && marks[i].secs >= marks[i - 1].secs ) continue;

        if( i - start > best.len ) best = { at: start, len: i - start };

        start = i;
    }

    var taken = marks.slice( best.at, best.at + best.len );

    if( taken.length < mdbTracklist_minCommentTracks ) {
        if( marks.length ) {
            logVar( "mdbTracklist_splitCued: cues found, longest stretch that never runs backwards", taken.length );
        }

        return null;
    }

    // Markers that all name the SAME time are no cue list: a row of "(1)"s is a numbering the
    // split above reads, or a comment repeating itself. Only ever going up is not enough on its
    // own - it has to arrive somewhere.
    if( taken[ taken.length - 1 ].secs <= taken[0].secs ) {
        log( "mdbTracklist_splitCued: " + taken.length + " cues that never move on from " + taken[0].cue + " - not a cue list." );
        return null;
    }

    var out = [];

    for( i = 0; i < taken.length; i++ ) {
        var to = ( i + 1 < taken.length ) ? taken[i + 1].at : line.length;

        out.push( "[" + taken[i].cue + "] " + line.slice( taken[i].track, to ).trim() );
    }

    log( "mdbTracklist_splitCued: split a comment at " + out.length + " cues running from " +
         taken[0].cue + " to " + taken[ taken.length - 1 ].cue + "." );

    return out;
}

// mdbTracklist_acceptSplit
// What a comment's split lines have to pass before they are a tracklist, and what they get on the
// way out. Shared by both splits above, because neither of them says anything about the tracks -
// they only say where one ends and the next begins.
//
// The second pass is the one mdbTracklist_detectInText() runs over a description, for the same
// reason: a comment's tracks are written "Artist-Title" without the spaces at least as often as a
// description's lines are, and the split has just turned the comment INTO lines, so the same
// rewriting answers here. Only asked when the lines as they stand are no tracklist - a split that
// already passed must not be touched, exactly as over there.
function mdbTracklist_acceptSplit( split ) {
    if( !split ) return null;

    var score = mdbTracklist_acceptRun( split, mdbTracklist_minCommentTracks );

    if( !score ) {
        var spaced = mdbTracklist_spaceTightDashes( split.join( "\n" ) );

        if( !spaced ) return null;

        split = spaced.split( "\n" );
        score = mdbTracklist_acceptRun( split, mdbTracklist_minCommentTracks );

        if( !score ) return null;
    }

    split = mdbTracklist_tidy( split );

    return {
        text: split.join( "\n" ),
        lines: split.length,
        indexed: score.indexed * 2 >= score.rows
    };
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

        // Numbering first: it is the stricter of the two splits, and a list carrying both a
        // number and a cue per track ("1. (00) Artist - Title") is numbered to whoever wrote it.
        if( !found ) found = mdbTracklist_acceptSplit( mdbTracklist_splitNumbered( body ) );
        if( !found ) found = mdbTracklist_acceptSplit( mdbTracklist_splitCued( body ) );

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
