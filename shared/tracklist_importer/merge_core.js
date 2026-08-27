/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist Importer – merge core
 *
 * Everything that turns an ORIGINAL tracklist (the one a MixesDB mix page already has) and a
 * CANDIDATE tracklist (the one a player site's userscript found, TLE-formatted) into ONE
 * merged tracklist – plus the wikitext helpers that put a tracklist into a mix page's text.
 *
 * The original is treated as the more correct one; the candidate only ENRICHES it:
 *   - cue times and labels are added to tracks both lists carry
 *   - "?" unknown tracks are filled with the candidate's identification
 *   - undiscovered tracks are inserted between existing consecutive tracks
 *   - tracks are added in "..." gaps
 *
 * Ported from the stalled Tracklist Merger userscript (since removed from the repo), made
 * self-contained on purpose: pure text in, text out – no DOM, no network, no jQuery – which is
 * what lets the deno runner (importer_examples_test.js) exercise it outside a browser, the way
 * page_creator's title_builder.js is tested. Keep it that way: the DOM half lives in funcs.js.
 *
 * Every candidate item records what the merge did with it and every original row what the
 * merge changed of it, so the review block on the wiki edit form can highlight exactly the
 * candidate text the merge took over and the original text it rewrote – see
 * tlImporter_diffItems() and tlImporter_originalItems().
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Threshold for fuzzy matching when merging track titles (same value the merger used)
var tlImporter_similarityThreshold = 0.8;

// How far two cues may lie apart and still mean the same moment (seconds). Candidate cues are
// often minute-rounded ([014] = 14 min) while the original keeps real times (00:13:20), so
// exact comparison would call every rounded cue "different". Used when filling "?" slots, when
// dropping duplicate unknown candidates, and for the diff view's "cue was used" flag.
var tlImporter_cueToleranceSec = 120;

// A "..." between two known cues is only believable while ONE track could have filled the span
// it covers. These two say what "could have" means, measured against the median runtime of the
// list itself (tlImporter_medianTrackRuntimeSec -> tlImporter_dropRedundantGaps):
//
//   factor      how much longer than the median a single track may run. 1.5 keeps the reading
//               on the safe side - the Luke Slater / The Lot Radio case (median 4 min) drops
//               the 3 and 5 minute holes and keeps the 7 and 9 minute ones
//   minSamples  how many gapless neighbour distances the median needs to mean anything. The
//               median of one or two distances is noise, and a wrong median removes a "..."
//               that carries real information
var tlImporter_gapRuntimeFactor = 1.5;
var tlImporter_gapMinSamples = 3;

// How many original rows WITHOUT a readable cue an insert may step over. The insert scan picks
// the first original row whose cue is bigger than the candidate's, so a new row always lands at
// the END of the cue-less run in front of that row - the merge has nothing in there to order it
// against and silently takes the last of the run's possible slots. Over one or two rows that is
// a near miss the reader corrects with one drag; over a BLOCK of them the row lands nowhere near
// its own cue. See the insert step in tlImporter_mergeArrays().
var tlImporter_insertMaxUnplacedRows = 2;

// tlImporter_log
// log() lives in global.js, which the deno runner does not load – so every log goes through
// this guard instead of assuming the browser environment.
function tlImporter_log( text ) {
    if( typeof log === "function" ) log( "tlImporter: " + text );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Text normalization for matching
 *
 * Local ports of normalizeStreamingServiceTracks (global.js), removePointlessVersions
 * (tracklist_editor/funcs.js) and removeVersionWords (youtube_funcs.js): the merge core must
 * not depend on files the deno runner cannot load, and matching-normalization may drift from
 * display-normalization on purpose – it only ever feeds the comparison, never the output.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_normalizeStreaming
function tlImporter_normalizeStreaming( text ) {
    return text
        .replace( /\[/g, "(" )
        .replace( /\]/g, ")" )
        .replace( " (Mixed)", "" )
        .replace( /ID\d+( \(from.+\))?/g, "ID" )
        .replace( "ID / ID", "ID" )
        .replace( /\s+/g, " " );
}

// tlImporter_removePointlessVersions
function tlImporter_removePointlessVersions( t ) {
    return t.replace( / \((Vocal|Main|Radio|Album|Single)\s?(Version|Edit|Mix)?\)/gmi, "" );
}

// tlImporter_removeVersionWords
function tlImporter_removeVersionWords( t ) {
    return t
        .replace( /\b(Original( Mix)?( Remastered)?|remix(?: \d+)?|rmx|rx|\w+\smixx?|\w*mixx?|version|vocal|Encore|Extended|Edit(?:!ion)?|Re-?Edit|Re-?work|Re-?Touch|Re-?model|Re-?Rub|Re-?vision|Re-?construction|Re-?make|Bemix|ori?gi?nal|orig|remaster(ed)?|process(?:ed)?|reshaped?|reconstruct.{,3}|(?:Re)?definition(?:!\sRec)|Perspective|interpretation|Translation|redo|re-?beef|re-?ruff|re-?prise|ReTop|Instr(?:\.)?umental(?: Version)?|acc?app?(?:ella)?|Dub[a-z]{,6}mental|M[au]sh(?: )?Up)\b/gmi, " " )
        .trim();
}

// tlImporter_normalizeForMatching
// One track title reduced to its comparable core: brackets, versions and featuring credits
// stripped, artists split, deduplicated and sorted so "A & B - T" and "B feat. A - T" meet.
function tlImporter_normalizeForMatching( text ) {
    text = text.trim();
    // remove bracketed descriptors anywhere in the string (e.g. labels, roles)
    text = text.replace(/\s*\[[^\]]+\]\s*/g, ' ');
    text = tlImporter_normalizeStreaming( text );
    text = tlImporter_removePointlessVersions( text );
    text = tlImporter_removeVersionWords( text ).replace( / \((.+) \)/, " ($1)" );
    text = text.replace(/\s+[x×]\s+/gi, " & ");
    text = text.replace( /^(.+) (?:Ft|Feat\.|Featuring?|Pres\.?|Presents) .+ - (.+)$/, "$1 - $2" );

    var parts = text.split(" - ");
    if (parts.length > 1) {
        var artists = parts.shift();
        var title = parts.join(" - ");
        artists = artists
            .replace(/\s*(?:Ft|Feat\.?|Featuring|Pres\.?|Presents|\baka\b)\s+/gi, " & ")
            .replace(/\s*,\s*/g, " & ")
            .replace(/\s+[x×]\s+/gi, " & ");
        var artistsArr = artists.split(/\s*(?:&|\band\b)\s*/i);
        if (artistsArr.length > 1) {
            artistsArr = artistsArr.map(function(a){ return a.trim(); }).sort(function(a, b){ return a.localeCompare(b); });
            artists = artistsArr.join(" & ");
        }
        var normArtists = artists.toLowerCase();

        // a bracketed artist repetition inside the title ("T (A & B)") says nothing new
        title = title.replace(/\(([^)]+)\)/g, function(match, p1) {
            var normP1 = p1
                .replace(/\s*(?:Ft|Feat\.?|Featuring|Pres\.?|Presents|\baka\b)\s+/gi, " & ")
                .replace(/\s*,\s*/g, " & ")
                .replace(/\s+[x×]\s+/gi, " & ")
                .toLowerCase().replace(/\s{2,}/g, ' ').trim();
            var normP1Arr = normP1.split(/\s*(?:&|\band\b|\baka\b)\s*/i)
                .filter(Boolean)
                .sort(function(a, b){ return a.localeCompare(b); });
            var normP1Sorted = normP1Arr.join(" & ");
            return normP1Sorted === normArtists ? '' : match;
        }).replace(/\s{2,}/g, ' ').trim();

        text = artists + " - " + title;
    }

    return text.toLowerCase().replace(/\s{2,}/g, ' ').trim();
}

// tlImporter_matchNorms
// All normalized variants of one track title: the full artist list plus every artist
// combination, with and without the bracketed version – so a candidate crediting only one of
// the original's two artists still meets it.
function tlImporter_matchNorms( text ) {
    var combosSet = {};

    function add( norm ) {
        combosSet[ norm ] = true;
    }

    function buildCombos( str ) {
        str = str.trim().replace(/\s*\[[^\]]+\]\s*/g, ' ');
        str = tlImporter_removePointlessVersions( str );
        str = tlImporter_removeVersionWords( str );
        str = str.replace(/\s+[x×]\s+/gi, " & ");
        str = str.trim();

        var parts = str.split(" - ");
        if (parts.length < 2) {
            add( tlImporter_normalizeForMatching( str ) );
            return;
        }

        var artists = parts.shift()
            .replace(/\s*(?:Ft|Feat\.?|Featuring|Pres\.?|Presents|\baka\b)\s+/gi, " & ")
            .replace(/\s*,\s*/g, " & ")
            .replace(/\s+[x×]\s+/gi, " & ");
        var title = parts.join(" - ");
        var artistsArr = artists.split(/\s*(?:&|\band\b|\baka\b)\s*/i).map(function(a){ return a.trim(); }).filter(Boolean);

        // unique
        artistsArr = artistsArr.filter(function( a, i ){ return artistsArr.indexOf(a) === i; });

        function combine(start, combo) {
            if (combo.length) {
                var artistStr = combo.slice().sort(function(a,b){ return a.localeCompare(b); }).join(" & ");
                add( tlImporter_normalizeForMatching( artistStr + " - " + title ) );
            }
            for (var i = start; i < artistsArr.length; i++) {
                combo.push( artistsArr[i] );
                combine( i + 1, combo );
                combo.pop();
            }
        }

        combine(0, []);

        if (!artistsArr.length) {
            add( tlImporter_normalizeForMatching( str ) );
        }
    }

    buildCombos( text );

    var textNoParens = text.replace(/\s*\([^\)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if ( textNoParens && textNoParens !== text ) {
        buildCombos( textNoParens );
    }

    return Object.keys( combosSet );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Similarity (plain-JS port of the merger's $.isTextSimilar)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_editDistance
// Levenshtein with two rows instead of the full matrix – called often during fuzzy matching.
function tlImporter_editDistance( a, b ) {
    var m = a.length, n = b.length;
    var prev = new Array(n + 1), curr = new Array(n + 1), i, j, tmp;

    for (j = 0; j <= n; j++) { prev[j] = j; }

    for (i = 1; i <= m; i++) {
        curr[0] = i;
        for (j = 1; j <= n; j++) {
            var cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min( prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost );
        }
        tmp = prev; prev = curr; curr = tmp;
    }

    return prev[n];
}

// tlImporter_isSimilar
// True when two normalized strings are at least `threshold` similar. The length precheck skips
// the expensive distance where the lengths alone already rule a match out.
function tlImporter_isSimilar( a, b, threshold ) {
    if (a === b) return true;

    var maxLen = Math.max( a.length, b.length );
    if (maxLen === 0) return true;

    var allowedEdits = Math.floor( (1 - threshold) * maxLen );
    if (Math.abs( a.length - b.length ) > allowedEdits) return false;

    var distance = tlImporter_editDistance( a, b );
    return ( (maxLen - distance) / maxLen ) >= threshold;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Unknown rows and artist names
 *
 * An unknown row is not always a bare "?": a page row may know the artist and not the title
 * ("Chloé Caillet - ?"), or the title and not the artist ("? - Untitled (B1)"), and "ID" says
 * the same as "?". Both halves are read apart here, because the merge treats them apart – the
 * page wins on every half it KNOWS, and only the halves it does not know may be written.
 *
 * The artist helpers answer the other half of the same question: is the credit over here the
 * credit over there, written shorter? "Costigane" is "Brendan Costigane" and "Chloé Caillet"
 * is one of "Chloé Caillet & Luke Alessi Feat. Jocelyn Brown" – whole-string similarity says
 * no to both, because the missing first name is a fifth of the string.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_unknownPart
// One half of a track text that says nothing: "?", "??", "ID", "ID2". NOT "Untitled" – that is
// a real title a release carries (and the page's "? - Untitled (B1)" keeps it against a
// candidate's "? - B1").
function tlImporter_unknownPart( part ) {
    part = String( part || "" ).trim();
    return /^\?+$/.test( part ) || /^ID\d*$/i.test( part );
}

// tlImporter_unknownParts
// A track text split into its two halves plus what is unknown about them.
function tlImporter_unknownParts( text ) {
    text = String( text || "" ).trim();

    var parts = text.split(" - ");

    // no " - ": either the whole row is an unknown marker, or it is a title we cannot split
    if( parts.length < 2 ) {
        var whole = tlImporter_unknownPart( text );
        return { artist: whole ? "" : text, title: whole ? "" : text, artistUnknown: whole, titleUnknown: whole };
    }

    var artist = parts.shift().trim(),
        title = parts.join(" - ").trim();

    return {
        artist: artist,
        title: title,
        artistUnknown: tlImporter_unknownPart( artist ),
        titleUnknown: tlImporter_unknownPart( title )
    };
}

// tlImporter_isUnknownText
// The row says NOTHING at all – "?", "ID", "? - ?". These are the placeholders the gap and
// slot machinery works with; a half-known row carries information and is never one of them.
function tlImporter_isUnknownText( text ) {
    var parts = tlImporter_unknownParts( text );
    return parts.artistUnknown && parts.titleUnknown;
}

// tlImporter_takesCandidateText
// May the candidate's text replace the original's? The original wins on every half it knows:
// a page title stays whatever the candidate calls it. Only a row whose TITLE is unknown takes
// the candidate's text, and a row that knows nothing at all also takes a candidate that only
// knows the artist.
function tlImporter_takesCandidateText( origText, candText ) {
    var orig = tlImporter_unknownParts( origText ),
        cand = tlImporter_unknownParts( candText );

    if( !orig.titleUnknown ) { return false; } // the page has a title – it wins
    if( !cand.titleUnknown ) { return true; }  // the candidate knows one, the page does not

    // both titles unknown: an artist the page does not have is the only news left
    return orig.artistUnknown && !cand.artistUnknown;
}

// tlImporter_artistNames
// The artist half of a track text as single lowercased names: "Chloé Caillet & Luke Alessi
// Feat. Jocelyn Brown" -> ["chloé caillet", "luke alessi", "jocelyn brown"]. Empty for a row
// without a " - " separator and for an unknown artist half – there is no name to compare.
function tlImporter_artistNames( text ) {
    var parts = tlImporter_unknownParts( text );

    if( !parts.artist || parts.artistUnknown ) { return []; }

    return parts.artist
        .replace(/\s*(?:Ft|Feat\.?|Featuring|Pres\.?|Presents|\baka\b)\s+/gi, " & ")
        .replace(/\s*,\s*/g, " & ")
        .replace(/\s+[x×]\s+/gi, " & ")
        .split(/\s*(?:&|\band\b)\s*/i)
        .map(function( name ){ return name.toLowerCase().replace(/\s{2,}/g, " ").trim(); })
        .filter(Boolean);
}

// tlImporter_sameArtistName
// Two single names for the same artist, one of them possibly shorter: every WORD of the
// shorter name is a word of the longer one ("costigane" in "brendan costigane"). Word-wise on
// purpose – a plain substring test would make "sam" the same artist as "samantha".
function tlImporter_sameArtistName( a, b ) {
    if( a === b ) { return true; }

    var aWords = a.split(/\s+/).filter(Boolean),
        bWords = b.split(/\s+/).filter(Boolean);

    if( !aWords.length || !bWords.length ) { return false; }

    var shortWords = aWords.length <= bWords.length ? aWords : bWords,
        longWords  = aWords.length <= bWords.length ? bWords : aWords;

    return shortWords.every(function( word ){ return longWords.indexOf( word ) > -1; });
}

// tlImporter_artistNamesCompatible
// The shorter credit is fully contained in the longer one: every artist it names is named
// over there too. Never true for an empty side – "no artist known" is not "same artist".
function tlImporter_artistNamesCompatible( a, b ) {
    if( !a.length || !b.length ) { return false; }

    var small = a.length <= b.length ? a : b,
        big   = a.length <= b.length ? b : a;

    return small.every(function( name ){
        return big.some(function( other ){ return tlImporter_sameArtistName( name, other ); });
    });
}

// tlImporter_artistsCompatible
// tlImporter_artistNamesCompatible on two whole track texts.
function tlImporter_artistsCompatible( aText, bText ) {
    return tlImporter_artistNamesCompatible( tlImporter_artistNames( aText ), tlImporter_artistNames( bText ) );
}

// tlImporter_titleNorm
// The title half normalized for comparison, "" when the row has no title of its own or an
// unknown one – those are matched by cue, never by title.
function tlImporter_titleNorm( text ) {
    var parts = tlImporter_unknownParts( text );

    if( !parts.title || parts.titleUnknown || parts.title === text ) { return ""; }

    return tlImporter_normalizeForMatching( parts.title );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist text <-> array
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_parse
// Port of make_tlArr (tracklist_editor/funcs.js) under its own name: the merge core cannot
// call the shared one (deno), and must not overwrite it on pages that load both.
function tlImporter_parse( tl ) {
    // Strip wiki quote runs whole: '' italics AND ''' bold. Pair-wise removal (/''/g) turned
    // the bold intro rows 1001tracklists carries ("'''Live @ X:''' Artist - Title") into a
    // mangled "'Live @ X:'" with one quote left over - and that is what would land in the
    // page wherever a candidate part is written.
    tl = String( tl || "" ).replace(/'{2,}/g, ""); // ''Hitam - ? [Unreleased]'' > Hitam - ? [Unreleased]

    var lines = tl.split('\n'),
        result = [];

    lines.forEach(function (line) {
        line = line.trim();

        if (line === '') return;

        if (line === "...") {
            result.push({ type: "gap" });
            return;
        }

        var row = { type: "track" };

        // Remove leading "#" numbering
        line = line.replace(/^#\s*/, '');

        // Optional cue [00] / [0:00] / [??] at the start
        var cueMatch = line.match(/^\[((?:\d|X|\?)+(?::(?:\d|X|\?){1,2}){0,2})\]/i);
        if (cueMatch) {
            row.cue = cueMatch[1];
            line = line.replace(/^\[((?:\d|X|\?)+(?::(?:\d|X|\?){1,2}){0,2})\]\s*/i, '');
        }

        // Optional label at the end
        var labelMatch = line.match(/\[(.*?)\]$/);
        if (labelMatch) {
            line = line.replace(/\s*\[.*?\]$/, '');
        }
        row.trackText = line.trim();

        if (labelMatch) {
            row.label = labelMatch[1];
        }

        result.push(row);
    });

    return result;
}

// tlImporter_textFromArr
// Port of arr_toTlText (tracklist_editor/funcs.js).
function tlImporter_textFromArr( tl_arr ) {
    return tl_arr.map(function( item ) {
        if (item.type === "track (false)") return null;

        if (item.type && item.type.indexOf("track") === 0) {
            var line = "";

            if (item.cue) line += "[" + item.cue + "] ";

            line += item.trackText || "";

            if (item.label) line += " [" + item.label + "]";

            return line;
        } else if (item.type === "gap") {
            // A gap the merge found redundant stays in the array – the review block's Original
            // column still has to show what the page held – but it is not printed any more.
            // See tlImporter_dropRedundantGaps().
            if (item._ti_gapDropped) return null;

            return "...";
        }

        return null;
    }).filter(function( line ){ return line !== null; }).join("\n");
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Cue format helpers (ports from the merger)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_durToSec
// "3:18" -> 198, "1:02:30" -> 3750 (port of durToSec_MS in global.js, extended to HH:MM:SS)
function tlImporter_durToSec( dur ) {
    var a = String( dur ).trim().split(':');

    if( a.length === 3 ) {
        return (+a[0]) * 3600 + (+a[1]) * 60 + (+a[2]);
    }

    return (+a[0]) * 60 + (+a[1]);
}

// tlImporter_cueToSec
// A numeric cue as total seconds, for ORDER and DISTANCE comparisons: a bare cue is minutes
// ([014] = 14 min, MixesDB style), colon cues go through tlImporter_durToSec. null for
// anything non-numeric ("??", "0:??") – callers must not compare those.
function tlImporter_cueToSec( cue ) {
    if( !cue || !/^\d+(:\d+){0,2}$/.test( String(cue) ) ) { return null; }

    cue = String( cue );
    return cue.indexOf(':') > -1 ? tlImporter_durToSec( cue ) : parseInt( cue, 10 ) * 60;
}

// tlImporter_cueFormat
// Detect cue format from the first numeric cue in a tracklist array. parts is 2 for MM:SS /
// H:MM cues and 3 for HH:MM:SS.
function tlImporter_cueFormat( tl_arr ) {
    for( var i = 0; i < tl_arr.length; i++ ) {
        var cue = tl_arr[i].cue;
        if( !cue || !/^\d+(:\d+){0,2}$/.test(cue) ) { continue; }

        if( cue.indexOf(':') > -1 ) {
            var parts = cue.split(':');

            if( parts.length === 3 ) {
                return { hasColon: true, parts: 3, hourDigits: parts[0].length, minDigits: parts[1].length, secDigits: parts[2].length };
            }

            return { hasColon: true, parts: 2, minDigits: parts[0].length, secDigits: parts[1].length };
        }

        return { hasColon: false, cueDigits: cue.length };
    }
    return null;
}

// tlImporter_widenedCueFormat
// The dur fix (NTS Japanese Techno report): "the original's cue format wins" gets one
// exception. A bare XX format only reaches 99 minutes, and a candidate cue detected beyond
// that ([106]) WILL be merged in – so when either side knows a cue that does not fit the
// format's digit count, the target format widens (XX -> XXX) to fit the largest known cue.
// Colon formats carry any length as they are and are left alone.
function tlImporter_widenedCueFormat( format, original_arr, candidate_arr ) {
    if( !format || format.hasColon ) { return format; }

    var maxMinutes = 0;

    original_arr.concat( candidate_arr ).forEach(function( item ){
        if( item.type !== "track" ) return;

        var sec = tlImporter_cueToSec( item.cue );
        if( sec !== null ) { maxMinutes = Math.max( maxMinutes, Math.round( sec / 60 ) ); }
    });

    var digitsNeeded = String( maxMinutes ).length;

    return digitsNeeded > format.cueDigits
        ? { hasColon: false, cueDigits: digitsNeeded }
        : format;
}

// tlImporter_padStart
function tlImporter_padStart( str, len ) {
    str = String( str );
    while( str.length < len ) { str = "0" + str; }
    return str;
}

// tlImporter_cueToFormat
// Convert one cue string to the target cue format.
function tlImporter_cueToFormat( cue, format, options ) {
    if( !cue || !format || !/^\d+(:\d+){0,2}$/.test(cue) ) { return cue; }
    options = options || {};

    if( format.hasColon ) {
        // HH:MM:SS target: unambiguous, so a bare cue is plain minutes ([014] -> 00:14:00)
        // and the bareAsSecondComponent special case below never applies.
        if( format.parts === 3 ) {
            var sec = tlImporter_cueToSec( cue ),
                h = Math.floor( sec / 3600 ),
                m = Math.floor( sec / 60 ) % 60,
                s = sec % 60;
            return tlImporter_padStart( h, format.hourDigits ) + ":" +
                   tlImporter_padStart( m, format.minDigits ) + ":" +
                   tlImporter_padStart( s, format.secDigits );
        }

        // Special case: original uses H:MM (e.g. "0:06"), candidate uses bare MM (e.g. "06").
        // Keep the original prefix ("0") and map the candidate number to the second component
        // ("0:06"), not "6:00".
        if( cue.indexOf(':') === -1 && options.bareAsSecondComponent ) {
            var secondValue = parseInt(cue, 10);
            var prefix = String(options.defaultPrefix || "0");
            return tlImporter_padStart( prefix, format.minDigits ) + ":" + tlImporter_padStart( secondValue, format.secDigits );
        }

        var totalSeconds = cue.indexOf(':') > -1 ? tlImporter_durToSec(cue) : parseInt(cue, 10) * 60;
        var mins = Math.floor(totalSeconds / 60),
            secs = Math.round(totalSeconds % 60);
        return tlImporter_padStart( mins, format.minDigits ) + ":" + tlImporter_padStart( secs, format.secDigits );
    }

    // Bare target cues are minutes, so colon cues are rounded to the nearest minute.
    var minsOnly = cue.indexOf(':') > -1
        ? Math.round( tlImporter_durToSec( cue ) / 60 )
        : parseInt(cue, 10);
    return tlImporter_padStart( minsOnly, format.cueDigits );
}

// tlImporter_normalizeCues
// Normalize all numeric track cues of an array to the target cue format.
function tlImporter_normalizeCues( tl_arr, targetFormat, options ) {
    if( !targetFormat ) { return tl_arr; }
    tl_arr.forEach(function( item ){
        if( item.type === "track" && item.cue ) {
            // Bare formats re-shape unknown placeholders too ("??" -> "???" after the dur fix
            // widened the format). Colon unknowns keep their own handling in tlImporter_merge
            // (last known hour prefix), so they stay untouched here.
            if( !targetFormat.hasColon && /^\?+$/.test( String(item.cue) ) ) {
                item.cue = tlImporter_unknownCue( targetFormat );
            } else {
                item.cue = tlImporter_cueToFormat( item.cue, targetFormat, options );
            }
        }
    });
    return tl_arr;
}

// tlImporter_unknownCue
// An explicit unknown cue placeholder in the active cue style ("??" / "?:??").
function tlImporter_unknownCue( format ) {
    if( format && format.hasColon ) {
        if( format.parts === 3 ) {
            return new Array( format.hourDigits + 1 ).join("?") + ":" +
                   new Array( format.minDigits + 1 ).join("?") + ":" +
                   new Array( format.secDigits + 1 ).join("?");
        }

        return new Array( format.minDigits + 1 ).join("?") + ":" + new Array( format.secDigits + 1 ).join("?");
    }

    return new Array( ( format && format.cueDigits ? format.cueDigits : 2 ) + 1 ).join("?");
}

// tlImporter_zeroCue
// Minute zero in the active cue style ("00" / "000" / "0:00" / "00:00:00") - the cue the first
// row of a tracklist gets, see tlImporter_firstCueZero.
function tlImporter_zeroCue( format ) {
    if( format && format.hasColon ) {
        if( format.parts === 3 ) {
            return tlImporter_padStart( 0, format.hourDigits ) + ":" +
                   tlImporter_padStart( 0, format.minDigits ) + ":" +
                   tlImporter_padStart( 0, format.secDigits );
        }

        return tlImporter_padStart( 0, format.minDigits ) + ":" + tlImporter_padStart( 0, format.secDigits );
    }

    return tlImporter_padStart( 0, format && format.cueDigits ? format.cueDigits : 2 );
}

// tlImporter_isPlaceholderCue
// A cue that says nothing at all: "??", "???", "?:??", "??:??:??". A cue carrying digits
// ("[09?]" from an earlier merge) is NOT one - it knows something.
function tlImporter_isPlaceholderCue( cue ) {
    return /^[?:]+$/.test( String( cue || "" ) );
}

// tlImporter_firstCueZero
// The first row of a tracklist is where the recording starts, so an unknown cue on it is not
// unknown at all: it is minute zero (reported: fibre podcast sigint 014, trackid.net, where a
// cue-less page row in front of the candidate's [03] came out "[0?]"). Written as a KNOWN cue,
// unlike the inferred ones of tlImporter_fillUnknownCuePrefixes, because this is not a guess
// from neighbours - every mix starts at 0.
//
// Two rows are not the first row: one behind a leading "..." (the gap says tracks are missing
// BEFORE it, so the list does not start there) and one in a tracklist that carries no cues at
// all (adding one would rewrite a line the candidate never touched).
function tlImporter_firstCueZero( tl_arr, format ) {
    if( !format ) { return tl_arr; }

    for( var i = 0; i < tl_arr.length; i++ ) {
        var item = tl_arr[i];

        if( item.type === "gap" ) { return tl_arr; }
        if( item.type !== "track" ) { continue; }

        if( tlImporter_isPlaceholderCue( item.cue ) ) {
            item.cue = tlImporter_zeroCue( format );
        }

        return tl_arr;
    }

    return tl_arr;
}

// tlImporter_ensureCues
// The Tracklist Editor API treats unbracketed leading numbers as cue times. Add an explicit
// unknown cue to every merged track without one, so artist names starting with digits remain
// track text.
function tlImporter_ensureCues( tl_arr, format ) {
    var unknownCue = tlImporter_unknownCue( format );

    tl_arr.forEach(function( item ){
        if( item.type === "track" && (!item.cue || String(item.cue).trim() === "") ) {
            item.cue = unknownCue;
        }
    });

    return tl_arr;
}

// tlImporter_fillUnknownCuePrefixes
// An unknown cue keeps every leading digit the known cues around it agree on: "[??]" sitting
// between [095] and [098] can only be a 09x minute, so it is written "[09?]" – the same reading
// a contributor writes by hand. Between [098] and [103] the two agree on nothing and it stays
// "[???]" (reported: fibre podcast bman 011, trackid.net).
//
// The bound is the LIST's own order, which is what a tracklist claims in the first place: a row
// printed between two cues played between them. Hence:
//   - no known cue before the run -> minute zero is the lower bound, a bound like any other
//   - no known cue after the run  -> the mix RUNTIME is the upper bound when the player site
//                                   knew one (endMinute, the last minute the stream reaches):
//                                   a row behind [61] on a 1:04:54 mix started between minute
//                                   61 and 64, which both read "6x", so it is "[6?]"
//                                   (reported: fibre podcast sigint 014). Without a runtime
//                                   nothing bounds the run from above (the stream runs on past
//                                   the last cue) and nothing may be filled in
//   - all digits equal            -> one "?" is kept anyway: the cue is INFERRED, and a row that
//                                    reads like a known cue claims more than the merge knows
//   - more unknown rows than minutes between the two bounds -> nothing is filled: six rows
//     between [008] and [009] (NTS Japanese Techno, where the page knows the tracks and almost
//     none of the times) cannot all have played in minute 008, so the bound is not one to write
//     into the page. One minute per row is the smallest span worth believing.
// Bare formats only. Colon cues have their own prefix rule in tlImporter_merge().
function tlImporter_fillUnknownCuePrefixes( tl_arr, format, endMinute ) {
    if( !format || format.hasColon || !format.cueDigits ) { return tl_arr; }

    var digits = format.cueDigits,
        rows = tl_arr.filter(function( item ){ return item.type === "track"; });

    // A row's cue as a padded digit string, or null when it says no minute. Gaps ("...") are not
    // rows and do not interrupt anything – a row behind a gap is still printed before the next cue.
    function knownCue( item ) {
        var cue = String( item && item.cue || "" );
        return /^\d+$/.test( cue ) ? tlImporter_padStart( cue, digits ) : null;
    }

    for( var i = 0; i < rows.length; i++ ) {
        if( knownCue( rows[i] ) !== null ) { continue; }

        // The whole run of cue-less rows at once: they share one pair of bounds, and their
        // NUMBER is what decides whether those bounds are believable.
        var runStart = i;
        while( i + 1 < rows.length && knownCue( rows[i + 1] ) === null ) { i++; }

        var after = i + 1 < rows.length ? knownCue( rows[i + 1] ) : null;

        // The trailing run: only the mix runtime can bound it. Skipped when the runtime needs
        // more digits than the format has - a [XX] list on a 106 minute mix would be comparing
        // "106" with "61" character by character.
        if( after === null && endMinute !== null && endMinute !== undefined
            && String( endMinute ).length <= digits ) {
            after = tlImporter_padStart( endMinute, digits );
        }

        if( after === null ) { continue; }

        var before = runStart > 0 ? knownCue( rows[runStart - 1] ) : tlImporter_padStart( 0, digits );
        if( before === null ) { continue; }

        var runLength = i - runStart + 1;
        if( parseInt( after, 10 ) - parseInt( before, 10 ) < runLength ) { continue; }

        var prefix = "";
        for( var d = 0; d < digits; d++ ) {
            if( before.charAt(d) !== after.charAt(d) ) { break; }
            prefix += before.charAt(d);
        }

        // An inferred cue stays visibly inferred, so never more than digits - 1 known digits.
        if( prefix.length > digits - 1 ) { prefix = prefix.substring( 0, digits - 1 ); }
        if( !prefix.length ) { continue; }

        for( var r = runStart; r <= i; r++ ) {
            // Only the pure placeholders – a row already carrying digits ("[09?]" from an earlier
            // merge) keeps what it says.
            if( /^\?+$/.test( String( rows[r].cue || "" ) ) ) {
                rows[r].cue = prefix + new Array( digits - prefix.length + 1 ).join("?");
            }
        }
    }

    return tl_arr;
}

// tlImporter_medianTrackRuntimeSec
// How long one track of THIS list runs, in seconds: the median distance between two rows that
// follow each other without a "..." between them. Only those pairs measure a single track –
// across a gap the distance covers an unknown number of them, which is exactly the question
// tlImporter_dropRedundantGaps asks.
//
// The median, not the average: a tracklist regularly carries one 12 minute opener or a closing
// ambient piece, and an average would let those stretch the believable span for every gap in
// the list. null when fewer than tlImporter_gapMinSamples distances are known.
function tlImporter_medianTrackRuntimeSec( runtimes ) {
    if( !runtimes || runtimes.length < tlImporter_gapMinSamples ) { return null; }

    var sorted = runtimes.slice().sort(function( a, b ){ return a - b; }),
        mid = Math.floor( sorted.length / 2 ),
        median = sorted.length % 2 ? sorted[ mid ] : ( sorted[ mid - 1 ] + sorted[ mid ] ) / 2;

    return median > 0 ? median : null;
}

// tlImporter_minText
// Seconds as "4.2 min", one decimal – the one wording for a span, so the log lines and the
// Report's cue gap block cannot drift apart.
function tlImporter_minText( sec ) {
    return ( Math.round( sec / 60 * 10 ) / 10 ) + " min";
}

// tlImporter_countText
// "1 track" / "8 tracks" – the Report counts things in prose, and "1 distance(s)" reads like a
// bug in the report rather than a number worth checking.
function tlImporter_countText( n, word ) {
    return n + " " + word + ( n === 1 ? "" : "s" );
}

// tlImporter_gapReading
// The MEASUREMENT tlImporter_dropRedundantGaps decides on, taken apart from the deciding: how
// many tracks and "..." the list has, how long one of its tracks runs (the median), how much
// span a "..." therefore needs, and what every "..." between two known cues actually spans.
//
// Split out because the Report has to print these numbers for the ORIGINAL and the CANDIDATE
// too, where no drop ever runs: a report saying "the ... stayed" without saying against which
// median cannot be turned into an example, and a reader cannot tell a list that has no gaps
// from one the step stood down on. Which is why nothing is left silent here – every reason not
// to judge lands in `stood` as a sentence, and the caller prints it.
//
// Touches nothing: the flags are set by tlImporter_dropRedundantGaps, on the rows this reading
// hands back in `rows`.
function tlImporter_gapReading( tl_arr ) {
    // Printed rows only, in list order – a "track (false)" never reaches the page and must not
    // separate two neighbours.
    var rows = ( tl_arr || [] ).filter(function( item ){
            return item.type === "gap" || item.type === "track";
        }),
        sec = [],
        gapRows = 0,
        unreadable = false,
        i;

    for( i = 0; i < rows.length; i++ ) {
        if( rows[i].type === "gap" ) {
            gapRows++;
            sec.push( null );
            continue;
        }

        var cueSec = tlImporter_cueToSec( rows[i].cue );

        // One unreadable cue and the whole step stands down: the distances around a "[??]" or
        // an inferred "[09?]" row are guesses, and a median may not be built from guesses.
        if( cueSec === null ) { unreadable = true; }

        sec.push( cueSec );
    }

    var reading = {
        rows: rows,             // the drop step's business – the hole indices point into this
        tracks: rows.length - gapRows,
        gaps: gapRows,
        samples: 0,
        median: null,           // seconds, null while nothing could be measured
        maxSpan: null,          // seconds a "..." has to beat to survive
        holes: [],              // [{ dist, gaps: [rowIndex], drop, after, before }]
        stood: "",              // why nothing was judged, in words
        applied: false          // whether the drop actually ran on this reading
    };

    if( unreadable ) {
        reading.stood = "a cue could not be read, so no distance around it may be measured";
        return reading;
    }

    // One pass for both readings: the distances WITHOUT a gap between them are the sample, the
    // ones WITH are the holes to decide. A run of gaps between the same two tracks is one hole.
    var runtimes = [],
        holes = [],
        prevTrack = -1,
        pending = [];

    for( i = 0; i < rows.length; i++ ) {
        if( rows[i].type === "gap" ) {
            if( prevTrack > -1 ) { pending.push( i ); } // a leading gap has no span to measure
            continue;
        }

        if( prevTrack > -1 ) {
            var dist = sec[i] - sec[ prevTrack ];

            if( pending.length ) {
                holes.push({
                    dist: dist,
                    gaps: pending,
                    drop: false,
                    // what the Report names the hole by – the two rows it sits between
                    after: tlImporter_gapRowText( rows[ prevTrack ] ),
                    before: tlImporter_gapRowText( rows[i] )
                });
            } else {
                runtimes.push( dist );
            }
        }

        prevTrack = i;
        pending = [];
    }
    // whatever is left in pending is a TRAILING gap – nothing follows it, nothing to measure

    reading.samples = runtimes.length;
    reading.median = tlImporter_medianTrackRuntimeSec( runtimes );
    reading.holes = holes;

    if( reading.median === null ) {
        reading.stood = "only " + tlImporter_countText( runtimes.length, "gapless neighbour distance" )
                        + ", no median to judge by";
        return reading;
    }

    reading.maxSpan = reading.median * tlImporter_gapRuntimeFactor;

    holes.forEach(function( hole ){
        // A backwards distance means the list is out of order – not something to act on here.
        hole.drop = hole.dist >= 0 && hole.dist <= reading.maxSpan;
    });

    return reading;
}

// tlImporter_gapRowText
// One row as the Report names it: "[15] Retina Burn", cue included where there is one.
function tlImporter_gapRowText( row ) {
    var cue = row && row.cue ? "[" + row.cue + "] " : "";

    return cue + ( ( row && row.trackText ) || "" );
}

// tlImporter_dropRedundantGaps
// The last reading of the merge: a "..." the merged cues themselves say is empty.
//
// A gap claims "tracks are missing here". Between two known cues that claim is checkable – the
// span between them has to be long enough for the row in front of the gap to have played AND
// something else after it. Measured against the list's own median runtime
// (tlImporter_medianTrackRuntimeSec) times tlImporter_gapRuntimeFactor: everything up to that
// is one track's own runtime and leaves no room for a second one, so the gap is dropped.
//
// Reported case (Luke Slater @ The Lot Radio 2026-06-13, trackid.net -> curid 748401): the page
// carried "[00] ? ... [15] Retina Burn" and "[19] Dillema ... [31] Devotion", and the merge
// filled both holes with the candidate's [06], [10], [24] and [28] rows. The two "..." then sat
// between cues 5 resp. 3 minutes apart – below the list's 4 minute median, so nothing fits in
// there any more – while the 7 and 9 minute holes further down still do and keep their gap.
//
// Deliberately narrow, in three ways:
//   - it only runs on a merge that WROTE something (see the call in tlImporter_merge). A gap
//     the page had all along, in a list the candidate did not enrich, is the contributor's own
//     statement and none of the importer's business – and touching it would turn the silent
//     "Identical" / "Nothing to add" verdicts into merges
//   - EVERY track has to carry a readable cue. One "[??]" or inferred "[09?]" row and the
//     distances around it are guesses, which is not what a median may be built from
//   - the two ENDS are left alone: a leading "..." has no cue in front of it and a trailing one
//     none behind it, so there is no span to measure
//
// The dropped gap stays in the array with a flag rather than being spliced out:
// tlImporter_textFromArr() skips it, while tlImporter_originalItems() keeps showing it in the
// review block's Original column, which has to show what the PAGE held.
//
// Returns the reading it acted on (tlImporter_gapReading), so the merge can hand the same
// numbers to the Report instead of them living only in the console.
function tlImporter_dropRedundantGaps( tl_arr ) {
    var reading = tlImporter_gapReading( tl_arr );

    if( reading.stood ) {
        // Only worth a line where there was something to judge – a list without a single "..."
        // is not standing down, it has nothing to decide.
        if( reading.gaps ) { tlImporter_log( "gap check: " + reading.stood ); }
        return reading;
    }

    if( !reading.holes.length ) { return reading; }

    tlImporter_log( "gap check: median runtime " + tlImporter_minText( reading.median ) + ", "
                    + "a \"...\" needs more than " + tlImporter_minText( reading.maxSpan ) + " of span" );

    reading.holes.forEach(function( hole ){
        if( !hole.drop ) { return; }

        hole.gaps.forEach(function( g ){ reading.rows[g]._ti_gapDropped = true; });

        tlImporter_log( "gap check: dropped a \"...\" spanning " + tlImporter_minText( hole.dist ) );
    });

    reading.applied = true;

    return reading;
}

// tlImporter_sameCue
// "Did the merged track end up with the candidate's cue?" – for the usage flags. Loose on
// leading zeros and on colon cues, since both sides were normalized to the same format anyway.
function tlImporter_sameCue( a, b ) {
    if( a === undefined || b === undefined ) return a === b;

    a = String(a); b = String(b);
    if( a === b ) return true;
    // "??" vs "???" is pure re-formatting (the dur fix widened the format), not a change
    if( /^\?+$/.test(a) && /^\?+$/.test(b) ) return true;
    if( /^\d+$/.test(a) && /^\d+$/.test(b) ) return parseInt(a, 10) === parseInt(b, 10);
    if( a.indexOf(':') > -1 && b.indexOf(':') > -1 ) return tlImporter_durToSec(a) === tlImporter_durToSec(b);

    return false;
}

// tlImporter_cueClose
// Same as tlImporter_sameCue, but a minute-rounded cue near the accepted one also counts:
// there is nothing in "00:14:00" worth salvaging next to "00:13:20".
function tlImporter_cueClose( a, b ) {
    if( tlImporter_sameCue( a, b ) ) return true;

    var aSec = tlImporter_cueToSec( a ),
        bSec = tlImporter_cueToSec( b );

    return aSec !== null && bSec !== null && Math.abs( aSec - bSec ) <= tlImporter_cueToleranceSec;
}



// tlImporter_unplacedRunLength
// How many original rows an insert at insertIndex would step over with no evidence for its
// place among them: the rows between the insert point and the nearest thing that BOUNDS it -
// a row with a readable cue (there the merge can order), a "..." (there the page itself says
// tracks are missing) or the start of the list.
function tlImporter_unplacedRunLength( arr, insertIndex ) {
    var rows = 0;

    for( var k = insertIndex - 1; k >= 0; k-- ) {
        var item = arr[k];

        if( item.type === "gap" ) break;                        // the page invited an insert here
        if( item.type !== "track" ) continue;
        if( tlImporter_cueToSec( item.cue ) !== null ) break;   // a cue to order against

        rows++;
    }

    return rows;
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The merge (port of the merger's mergeTracklists, plus usage tracking)
 *
 * `state` is a shared counter object: state.changes counts every write into the original, so
 * the caller can tell an enriching merge from one where the candidate added nothing at all.
 *
 * Usage tracking, for the review block: every candidate item leaves with private flags -
 * _ti_matchedOrig, _ti_inserted, _ti_cueUsed for the salvage reading (tlImporter_candidateUse),
 * _ti_usedCue / _ti_usedText / _ti_usedLabel set at each actual write for the "what did the
 * merge take" reading (tlImporter_candidateUsed). Both are read AFTER the merge, when the
 * original items have their final cue/label values.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function tlImporter_mergeArrays( original_arr, candidate_arr, state ) {
    state = state || { changes: 0 };

    // Strip out false-tracks from the candidate list, keep everything in the original
    candidate_arr = candidate_arr.filter(function( item ){ return item.type !== "track (false)"; });

    // Build exact lookup + fuzzy list for all original track items
    var originalMap   = {}, // normalizedTitle -> original item
        fuzzyList     = [], // [{ norm, item, len, head }]
        fuzzyBuckets  = {}, // first-char -> fuzzyList entries
        fuzzyByLen    = [], // grouped by norm length
        splitList     = [], // [{ item, artistNames, titleNorm }] – the halves, for step 2b
        similarityCache = {},
        originalHasGaps = original_arr.some(function( item ){ return item.type === "gap" || tlImporter_isUnknownText( item.trackText ); });

    original_arr.forEach(function( item ) {
        if (item.type === "track") {
            // the halves as the page has them NOW: the merge mutates original rows in place,
            // so a "?" filled by an earlier candidate must not be re-read as a title later
            var titleNorm = tlImporter_titleNorm( item.trackText );
            if (titleNorm) {
                splitList.push({ item: item, artistNames: tlImporter_artistNames( item.trackText ), titleNorm: titleNorm });
            }

            var norms = tlImporter_matchNorms( item.trackText );
            norms.forEach(function( norm ) {
                originalMap[norm] = item;
                var entry = { norm: norm, item: item, len: norm.length, head: norm.charAt(0) };
                fuzzyList.push(entry);

                if (!fuzzyBuckets[entry.head]) fuzzyBuckets[entry.head] = [];
                fuzzyBuckets[entry.head].push(entry);

                if (!fuzzyByLen[entry.len]) fuzzyByLen[entry.len] = [];
                fuzzyByLen[entry.len].push(entry);
            });
        }
    });

    function isLikelySimilarText( normA, normB, threshold ) {
        if (normA === normB) return true;

        var key = normA < normB ? (normA + "||" + normB) : (normB + "||" + normA);
        if (similarityCache.hasOwnProperty(key)) return similarityCache[key];

        var result = tlImporter_isSimilar( normA, normB, threshold );
        similarityCache[key] = result;
        return result;
    }

    function getFuzzyCandidates( candNorm ) {
        var len = candNorm.length,
            head = candNorm.charAt(0),
            pool = fuzzyBuckets[head] || fuzzyList,
            nearbyLenPool = [];

        // Pull only nearby lengths: at threshold 0.8 hugely different lengths can never match.
        for (var l = Math.max(0, len - 6); l <= len + 6; l++) {
            if (fuzzyByLen[l]) nearbyLenPool.push.apply(nearbyLenPool, fuzzyByLen[l]);
        }

        if (nearbyLenPool.length && nearbyLenPool.length < pool.length) pool = nearbyLenPool;
        return pool;
    }

    var unmatched = [];

    // Walk through candidate tracks
    for (var i = 0; i < candidate_arr.length; i++) {
        var cand = candidate_arr[i];
        if (cand.type !== "track" || !cand.trackText) continue;

        var candidateName  = cand.trackText,
            candidateLabel = cand.label,
            isUnknown      = tlImporter_isUnknownText( candidateName ),
            origItem = null,
            candNorms, c, e;

        if (!isUnknown) {
            candNorms = tlImporter_matchNorms( candidateName );

            // 1) Exact match by normalized title
            for (c = 0; c < candNorms.length; c++) {
                if (originalMap.hasOwnProperty( candNorms[c] )) {
                    origItem = originalMap[ candNorms[c] ];
                    break;
                }
            }

            // 2) Fallback to fuzzy matching
            if (!origItem) {
                outer:
                for (c = 0; c < candNorms.length; c++) {
                    var fuzzyCandidates = getFuzzyCandidates( candNorms[c] );
                    for (e = 0; e < fuzzyCandidates.length; e++) {
                        if (isLikelySimilarText( fuzzyCandidates[e].norm, candNorms[c], tlImporter_similarityThreshold )) {
                            origItem = fuzzyCandidates[e].item;
                            break outer;
                        }
                    }
                }
            }

            // 2b) Fallback: artist and title compared APART. A page that writes the artist
            // shorter than the candidate does ("Costigane" vs "Brendan Costigane") drags the
            // whole-string similarity under the threshold - the missing first name is a fifth
            // of the string - although the identical title says it is the same track, and the
            // candidate was inserted a second time (reported: Chris Stussy, Essential Mix
            // 2024-10-12). The title carries the match here, the artist only has to be
            // COMPATIBLE: one credit contained in the other.
            if (!origItem) {
                var candArtistNames = tlImporter_artistNames( candidateName ),
                    candTitleNorm   = tlImporter_titleNorm( candidateName );

                if (candTitleNorm && candArtistNames.length) {
                    for (e = 0; e < splitList.length; e++) {
                        if (!isLikelySimilarText( splitList[e].titleNorm, candTitleNorm, tlImporter_similarityThreshold )) continue;
                        if (!tlImporter_artistNamesCompatible( splitList[e].artistNames, candArtistNames )) continue;

                        origItem = splitList[e].item;
                        break;
                    }
                }
            }
        }

        // 3) Fallback: the same cue, where one side does not know what the other does. The
        // bare "?" row is only the obvious shape of that - an unknown carries a HALF of the
        // name often enough ("Chloé Caillet - ?" knows the artist, "? - Untitled (B1)" the
        // title), and those halves are exactly what the merge fills. Nothing but the cue
        // connects the two rows here, so the halves both sides DO know must not contradict:
        // an artist-less page row takes an artist-less candidate, a title-less one only a
        // candidate that credits its artist. A cue minute alone is no proof of anything.
        if (!origItem && cand.cue) {
            var candParts = tlImporter_unknownParts( candidateName );

            origItem = original_arr.filter(function( item ){
                if (item.type !== "track" || !tlImporter_sameCue( item.cue, cand.cue )) return false;
                if (typeof item._mergeMatchedCandidateIndex === "number") return false; // taken by an earlier candidate

                var origParts = tlImporter_unknownParts( item.trackText );

                // the page knows nothing about this row - anything the candidate has is news
                if (origParts.artistUnknown && origParts.titleUnknown) return true;

                // no title on the page: the candidate has to credit the page's artist
                if (origParts.titleUnknown) return tlImporter_artistsCompatible( item.trackText, candidateName );

                // no artist on the page: only an equally artist-less candidate row may be it
                if (origParts.artistUnknown) return candParts.artistUnknown;

                // the page knows both halves and the candidate does not know the title - same
                // artist test, and the candidate then only enriches cue and label
                return candParts.titleUnknown && tlImporter_artistsCompatible( item.trackText, candidateName );
            })[0] || null;
        }

        if (origItem) {
            cand._ti_matchedOrig = origItem;

            if (tlImporter_takesCandidateText( origItem.trackText, candidateName )) {
                origItem.trackText = candidateName;
                cand._ti_usedText = true;
                state.changes++;
            }

            if (cand.cue && (!origItem.cue || String(origItem.cue).indexOf('?') > -1)) {
                origItem.cue = cand.cue;
                cand._ti_usedCue = true;
                state.changes++;
            }
            if (cand.dur && !origItem.dur) origItem.dur = cand.dur;
            if (candidateLabel && !origItem.label) {
                origItem.label = candidateLabel;
                cand._ti_usedLabel = true;
                state.changes++;
            }
            origItem._mergeMatchedCandidateIndex = i;

            // A following unknown candidate carries a cue the original's next cue-less track
            // can take over.
            var nextCand = candidate_arr[i + 1];
            if (nextCand && nextCand.type === "track" && tlImporter_isUnknownText( nextCand.trackText ) && nextCand.cue) {
                var origIndex = original_arr.indexOf(origItem);
                for (var j = origIndex + 1; j < original_arr.length; j++) {
                    if (!original_arr[j].cue) {
                        original_arr[j].cue = nextCand.cue;
                        nextCand._ti_cueUsed = true;
                        state.changes++;
                        break;
                    }
                }
            }
        } else {
            unmatched.push({ cand: cand, index: i, isUnknown: isUnknown });
        }
    }

    var unmatchedByIndex = {};
    unmatched.forEach(function( item ) {
        unmatchedByIndex[item.index] = item;
    });

    // Between the two matched neighbours of a candidate index, find the original's first
    // unconsumed "?" placeholder. candCueSec limits the pick to slots whose cue lies within
    // the cue tolerance – a candidate detected at 01:18 must not claim a "?" at 01:10 just
    // because that slot comes first in the segment.
    function findUnknownSlotForCandidateIndex( candidateIndex, candCueSec ) {
        var prevAnchor = null,
            nextAnchor = null;

        original_arr.forEach(function( item ) {
            if (item.type !== "track" || typeof item._mergeMatchedCandidateIndex !== "number") return;

            if (item._mergeMatchedCandidateIndex < candidateIndex &&
                (!prevAnchor || item._mergeMatchedCandidateIndex > prevAnchor._mergeMatchedCandidateIndex)) {
                prevAnchor = item;
            }

            if (item._mergeMatchedCandidateIndex > candidateIndex &&
                (!nextAnchor || item._mergeMatchedCandidateIndex < nextAnchor._mergeMatchedCandidateIndex)) {
                nextAnchor = item;
            }
        });

        var startIndex = prevAnchor ? original_arr.indexOf(prevAnchor) + 1 : 0,
            endIndex = nextAnchor ? original_arr.indexOf(nextAnchor) : original_arr.length;

        if (startIndex > endIndex) return null;

        for (var k = startIndex; k < endIndex; k++) {
            var item = original_arr[k];
            if (item.type === "track" && tlImporter_isUnknownText( item.trackText ) && !item._mergeConsumedUnknown) {
                var slotSec = tlImporter_cueToSec( item.cue );
                if (candCueSec === null || slotSec === null || Math.abs( slotSec - candCueSec ) <= tlImporter_cueToleranceSec) {
                    return item;
                }
                // cue contradicts the candidate's – keep looking further down the segment
            }
        }

        return null;
    }

    if (originalHasGaps) {
        candidate_arr.forEach(function( cand, index ) {
            var unmatchedItem = unmatchedByIndex[index];

            if (unmatchedItem) {
                var slot = findUnknownSlotForCandidateIndex(index, tlImporter_cueToSec( cand.cue ));
                if (slot) {
                    // The original wins: a real original cue stays, the candidate only fills a
                    // missing or unknown one (same rule as for matched tracks above).
                    if (cand.cue && (!slot.cue || String(slot.cue).indexOf('?') > -1)) { slot.cue = cand.cue; cand._ti_usedCue = true; state.changes++; }
                    if (cand.dur && !slot.dur) slot.dur = cand.dur;
                    if (!tlImporter_isUnknownText( cand.trackText )) { slot.trackText = cand.trackText; cand._ti_usedText = true; state.changes++; }
                    if (cand.label && !slot.label) { slot.label = cand.label; cand._ti_usedLabel = true; state.changes++; }
                    slot._mergeConsumedUnknown = true;
                    unmatchedItem.filledUnknownSlot = true;
                    cand._ti_matchedOrig = slot;
                }
            } else if (cand.type === "gap") {
                var gapSlot = findUnknownSlotForCandidateIndex(index, null);
                if (gapSlot) {
                    gapSlot._mergeConsumedUnknown = true;
                }
            }
        });
    }

    // Where the candidate's trailing run of unknowns begins: scanning back from the end, gaps
    // are stepped over, "?" rows are taken in and the first REAL track stops the scan. Those
    // rows sit behind everything the candidate was able to name - see the tail rule below.
    var tailUnknownFrom = candidate_arr.length;
    for (var t = candidate_arr.length - 1; t >= 0; t--) {
        if (candidate_arr[t].type === "gap") continue;
        if (candidate_arr[t].type !== "track" || !tlImporter_isUnknownText( candidate_arr[t].trackText )) break;
        tailUnknownFrom = t;
    }

    // Insert unmatched tracks (including gaps around them) when no original unknown
    // placeholder was available in the same matched candidate segment.
    unmatched.forEach(function( u ) {
        if (u.filledUnknownSlot) return;

        var cand = u.cand,
            index = u.index,
            cueSec = tlImporter_cueToSec(cand.cue);

        var insertIndex = -1;
        for (var k = 0; k < original_arr.length; k++) {
            if (original_arr[k].type === "track" && cueSec !== null) {
                var origSec = tlImporter_cueToSec(original_arr[k].cue);
                if (origSec !== null && origSec > cueSec) {
                    insertIndex = k;
                    break;
                }
            }
        }
        if (insertIndex === -1) insertIndex = original_arr.length;

        // A row the merge cannot PLACE is not placed. The insert lands at the end of the
        // cue-less run in front of it (see tlImporter_insertMaxUnplacedRows), and over a block
        // of such rows that position is pure guesswork: the row ends up nowhere near its own
        // cue, and where the block holds rows the page could not name ("Exos - ?") the insert
        // may well duplicate a track the page already lists - nothing says the new row is not
        // exactly that unknown one. Reported (Invite's Choice Podcast 224 Exos, trackid.net):
        // the candidate's [07], [13], [14] and [24] were dropped in front of the first matched
        // row, behind the 18 rows the page lists before it, three of them near-duplicates of
        // rows already in that block. Such a row stays highlighted in the Candidate column
        // instead - the reader places it by hand, which is the only reading that is not a guess.
        // The END of the list is not that guess: nothing follows the last row, so there is no
        // other slot the merge could have chosen (same reasoning as the trailing unknown below).
        if (insertIndex < original_arr.length &&
            tlImporter_unplacedRunLength( original_arr, insertIndex ) > tlImporter_insertMaxUnplacedRows) {
            return;
        }

        // An unknown out of the candidate's trailing run that lands BEHIND the original's last
        // row is news even on a gap-less original: the list read as complete and the player
        // still had something after it ([111] ? on a 2:00:17 stream, NTS Japanese Techno
        // report). INSIDE the list a gap-less original keeps taking no unknowns - there it
        // only repeats what the original already covers.
        var isTailUnknown = u.isUnknown && index >= tailUnknownFrom && insertIndex === original_arr.length;

        if (u.isUnknown) {
            // an unknown whose cue lies within tolerance of an original track adds nothing
            // ([00:18:00] ? next to [00:18:00] andhim - Overnight)
            var duplicatesOriginalCue = cueSec !== null && original_arr.some(function( item ){
                if (item.type !== "track") return false;
                var itemSec = tlImporter_cueToSec(item.cue);
                return itemSec !== null && Math.abs(itemSec - cueSec) <= tlImporter_cueToleranceSec;
            });

            if (duplicatesOriginalCue) return;
            if (!originalHasGaps && !isTailUnknown) return;
        }

        var hasPrevGap = index > 0 && candidate_arr[index - 1].type === "gap",
            hasNextGap = index < candidate_arr.length - 1 && candidate_arr[index + 1].type === "gap";

        var gapBefore = insertIndex > 0 && original_arr[insertIndex - 1].type === "gap";
        if (gapBefore && !hasPrevGap) {
            insertIndex--; // reuse existing gap slot
        }

        if (originalHasGaps && hasPrevGap &&
            (insertIndex === 0 || original_arr[insertIndex - 1].type !== "gap")) {
            original_arr.splice(insertIndex, 0, { type: "gap" });
            insertIndex++;
        }

        cand._ti_inserted = true;
        state.changes++;
        original_arr.splice(insertIndex, 0, cand);

        // The candidate's gap behind an appended tail unknown comes along for the same reason
        // the unknown does: it is the "and there is more after this" the gap-less original
        // cannot say by itself.
        if ((originalHasGaps || isTailUnknown) && hasNextGap &&
            (insertIndex + 1 >= original_arr.length || original_arr[insertIndex + 1].type !== "gap")) {
            original_arr.splice(insertIndex + 1, 0, { type: "gap" });
        }
    });

    original_arr.forEach(function( item ) {
        delete item._mergeMatchedCandidateIndex;
        delete item._mergeConsumedUnknown;
    });

    return original_arr; // = merged
}

// tlImporter_candidateUse
// What the merge took over from one candidate item, read AFTER the merge. true = used (not
// highlighted), false = not used (highlighted in the diff view). A "?" track text and a gap
// are never highlighted – there is nothing in them the user could salvage by hand.
function tlImporter_candidateUse( cand ) {
    if (cand.type !== "track") {
        return { cue: true, text: true, label: true };
    }

    if (cand._ti_inserted) {
        return { cue: true, text: true, label: true };
    }

    var orig = cand._ti_matchedOrig;

    if (orig) {
        return {
            cue: !cand.cue || tlImporter_cueClose( orig.cue, cand.cue ),
            text: true,
            label: !cand.label || String( orig.label || "" ).toLowerCase() === String( cand.label ).toLowerCase()
        };
    }

    // unmatched and not inserted
    return {
        cue: !cand.cue || !!cand._ti_cueUsed,
        text: tlImporter_isUnknownText( cand.trackText ),
        label: !cand.label
    };
}

// tlImporter_candidateUsed
// The stricter sibling of tlImporter_candidateUse, for the review block's Candidate column:
// true only where the candidate part actually WROTE something into the merged result (filled a
// "?" text, a missing cue, an absent label, or arrived as a whole inserted track). A part the
// original already carried is not "used" - the merge did not need it.
function tlImporter_candidateUsed( cand ) {
    if (cand.type !== "track") {
        return { cue: false, text: false, label: false };
    }

    if (cand._ti_inserted) {
        return { cue: !!cand.cue, text: true, label: !!cand.label };
    }

    return {
        cue: !!( cand._ti_usedCue || cand._ti_cueUsed ),
        text: !!cand._ti_usedText,
        label: !!cand._ti_usedLabel
    };
}

// tlImporter_diffItems
// The candidate as serializable rows for the diff view (and for sessionStorage, so the view
// survives "Show changes" / "Show preview"). Each track carries BOTH readings of the merge:
// `use` (false = the merge could not place this part - the salvage reading the examples test
// against) and `used` (true = the merge wrote this part into the result - what the review
// block highlights).
function tlImporter_diffItems( candidate_arr ) {
    return candidate_arr.map(function( cand ) {
        if (cand.type === "gap") return { type: "gap" };

        return {
            type: "track",
            cue: cand.cue || "",
            text: cand.trackText || "",
            label: cand.label || "",
            use: tlImporter_candidateUse( cand ),
            used: tlImporter_candidateUsed( cand )
        };
    });
}

// tlImporter_originalItems
// The ORIGINAL rows as serializable items for the review block's Original column, read off the
// merged array AFTER the merge: original items are mutated in place and never removed, so the
// ones carrying a pre-merge snapshot (_ti_before, taken in tlImporter_merge) ARE the original
// in original order. `changed` flags every part whose value the merge (or the cue formatting
// around it) rewrote - that is what the column highlights.
function tlImporter_originalItems( merged_arr ) {
    var items = [];

    merged_arr.forEach(function( item ) {
        if (item.type === "gap") {
            // inserted gaps have no snapshot - they belong to the candidate, not the original
            if (item._ti_origGap) items.push({ type: "gap" });
            return;
        }

        if (item.type !== "track" || !item._ti_before) return;

        var before = item._ti_before;

        items.push({
            type: "track",
            cue: before.cue || "",
            text: before.text || "",
            label: before.label || "",
            changed: {
                // loose cue compare, so pure re-formatting (leading zeros, colon forms) does
                // not read as a change
                cue: !tlImporter_sameCue( before.cue || "", String( item.cue || "" ) ),
                text: ( before.text || "" ) !== ( item.trackText || "" ),
                label: ( before.label || "" ) !== ( item.label || "" )
            }
        });
    });

    return items;
}

// tlImporter_rawItems
// A tracklist as serializable rows that render VERBATIM: one row per LINE, the whole line as
// its text, no cue/label split and no merge reading on it - no `changed`, no `use`, no `used`,
// so tlImporter_renderPre() highlights nothing.
//
// For the cases where the two columns are shown WITHOUT a merge having run: the chaptered page,
// where the reader merges by hand. Going through tlImporter_parse() there buys nothing - there
// is no merge to flag parts of - and it costs the truth: the parser drops the "#" numbering,
// the '' wiki italics and every blank line, so the Original column showed a tidied-up list the
// page does not contain and the hand-merge was done against a text that is not there.
function tlImporter_rawItems( text ) {
    // every line becomes a "track" row, blank ones included: tlImporter_renderPre() draws any
    // other type as the "..." gap marker, which would invent a gap where the page has an empty
    // line - and a real "..." line is its own text here anyway
    return String( text || "" ).split( /\r?\n/ ).map(function( line ) {
        return { type: "track", cue: "", text: line, label: "" };
    });
}

// tlImporter_sameTracklists
// Do the two lists say the SAME thing? Read off the MERGE, never off the two texts: the
// candidate's cue format, its spelling and the labels it carries differ from the page's by
// nature, and only the matcher knows which row over here is which row over there.
//
// Two readings, either of which is enough. The plain one first: with the candidate's cues
// moved into the original's format (which happened before the merge), both lists serialize to
// the very same text. That is as certain as it gets - and it is the only reading that survives
// a track played TWICE, whose two rows collapse onto one entry in the title lookup and leave
// the 1:1 count below one short (reported: Feathers & Bones Mixtape 04 - the same Radian at
// [20] and [25], the same Atlantis at [67] and [83], both lists otherwise character for
// character the same).
//
// The other reading, for two lists that are the same list without being the same text:
//   - the merge wrote nothing into the page (changed = false)
//   - every candidate row found its counterpart in the original – matched, not inserted, no
//     two candidate rows on the same original row, and nothing on it the merge could not
//     place (tlImporter_candidateUse: a label the page has differently, a cue that disagrees)
//   - no original row was left without a candidate, gaps counted
//
// A candidate that is merely CONTAINED in a longer original is deliberately not identical:
// the page then knows more than the candidate, and the callers act unattended on this flag
// (the "TID tracklist is integrated" checkbox), so it has to mean certainty, not "close
// enough".
function tlImporter_sameTracklists( merged_arr, candidate_arr, changed, originalSerialized ) {
    if (changed) return false;

    if (tlImporter_textFromArr( candidate_arr ) === originalSerialized) return true;

    var matchedOrigs = [],
        candTracks = 0,
        candGaps = 0,
        allMatched = true;

    candidate_arr.forEach(function( cand ) {
        if (cand.type === "gap") {
            candGaps++;
            return;
        }

        if (cand.type !== "track") return; // "track (false)" never took part in the merge

        candTracks++;

        if (!cand._ti_matchedOrig || cand._ti_inserted) {
            allMatched = false;
            return;
        }

        // a part the merge could not place is something the reader may still want to salvage
        // by hand – two lists with one of those in them are not the same list
        var use = tlImporter_candidateUse( cand );

        if (!use.cue || !use.text || !use.label) {
            allMatched = false;
            return;
        }

        if (matchedOrigs.indexOf( cand._ti_matchedOrig ) === -1) matchedOrigs.push( cand._ti_matchedOrig );
    });

    if (!allMatched || matchedOrigs.length !== candTracks) return false;

    // The original rows inside the merged array are the ones carrying a pre-merge snapshot
    // (_ti_before) resp. the _ti_origGap flag – everything else was spliced in by the merge.
    var origTracks = 0,
        origGaps = 0;

    merged_arr.forEach(function( item ) {
        if (item.type === "track" && item._ti_before) origTracks++;
        if (item.type === "gap" && item._ti_origGap) origGaps++;
    });

    return matchedOrigs.length === origTracks && candGaps === origGaps;
}

// tlImporter_endMinute
// The last minute the stream reaches, out of the mix runtime the player site knew
// (options.durationSec, 1:04:54 -> 64). null when no runtime came along - which is the normal
// case for every site that does not print one, so no cue logic may DEPEND on it.
function tlImporter_endMinute( options ) {
    var sec = options && options.durationSec;

    if( typeof sec === "string" ) { sec = sec.indexOf(':') > -1 ? tlImporter_durToSec( sec ) : parseInt( sec, 10 ); }
    if( typeof sec !== "number" || !isFinite( sec ) || sec <= 0 ) { return null; }

    return Math.floor( sec / 60 );
}

// tlImporter_merge
// The one entry the site code calls: original text + candidate text in, merged text (raw, NOT
// yet TLE-formatted), a changed flag, an identical flag and the candidate diff rows out.
// options.durationSec is the mix runtime when the player site knows one - it bounds the
// unknown cues at the END of the list, see tlImporter_fillUnknownCuePrefixes.
function tlImporter_merge( originalText, candidateText, options ) {
    var original_arr = tlImporter_parse( originalText ),
        candidate_arr = tlImporter_parse( candidateText );

    // Pre-merge snapshot of every original row, BEFORE any cue normalization touches them:
    // the merge mutates original items in place, and the review block's Original column has to
    // show what the page held, with the parts the merge rewrote flagged - see
    // tlImporter_originalItems().
    original_arr.forEach(function( item ) {
        if (item.type === "gap") {
            item._ti_origGap = true;
        } else if (item.type === "track") {
            item._ti_before = { cue: item.cue || "", text: item.trackText || "", label: item.label || "" };
        }
    });

    // Normalize candidate cues to the original cue format before merging.
    var originalCueFormat = tlImporter_cueFormat( original_arr ),
        originalFirstCuePrefix = "0";

    // A cue-less original has no format to win with. Every cue the merged list ends up with
    // then comes from the CANDIDATE, so the candidate's format is the one the placeholders have
    // to match – without this the null format fell through to tlImporter_unknownCue()'s
    // two-digit default and wrote "[??]" between three-digit candidate cues (reported: fibre
    // podcast bman 011, trackid.net).
    var candidateCueFormat = false;
    if( !originalCueFormat ) {
        originalCueFormat = tlImporter_cueFormat( candidate_arr );
        candidateCueFormat = !!originalCueFormat;
    }

    // The dur fix is applied BEFORE merging: when the format widened (XX -> XXX, see
    // tlImporter_widenedCueFormat), the ORIGINAL's cues move to it right away ([08] -> [008],
    // [??] -> [???]) – placeholders, cue comparisons and inserted cues then all agree on one
    // width instead of the merge mixing [08] rows with a [106] one.
    var widenedCueFormat = tlImporter_widenedCueFormat( originalCueFormat, original_arr, candidate_arr );
    if( widenedCueFormat !== originalCueFormat ) {
        originalCueFormat = widenedCueFormat;
        tlImporter_normalizeCues( original_arr, originalCueFormat );
    } else if( candidateCueFormat ) {
        // Same reason, one step earlier: a cue-less original may still carry "[??]" rows, and
        // those move to the borrowed width too rather than staying two digits wide.
        tlImporter_normalizeCues( original_arr, originalCueFormat );
    }

    if( originalCueFormat && originalCueFormat.hasColon ) {
        var firstColonCueItem = original_arr.filter(function( item ){
            return item.type === "track" && item.cue && item.cue.indexOf(':') > -1;
        })[0];
        if( firstColonCueItem ) {
            originalFirstCuePrefix = firstColonCueItem.cue.split(':')[0];
        }
    }

    var cueOptions = {
        bareAsSecondComponent: !!( originalCueFormat && originalCueFormat.hasColon ),
        defaultPrefix: originalFirstCuePrefix
    };
    tlImporter_normalizeCues( candidate_arr, originalCueFormat, cueOptions );

    var state = { changes: 0 },
        merged_arr = tlImporter_mergeArrays( original_arr, candidate_arr, state );

    // Keep merged cues in the original format.
    tlImporter_normalizeCues( merged_arr, originalCueFormat, cueOptions );

    // Explicit unknown cues before the TLE API sees the text – but only in a tracklist that
    // carries cues at all: forcing "??" onto an entirely cue-less original would rewrite every
    // line the candidate never touched.
    var mergedHasCue = merged_arr.some(function( item ){ return item.type === "track" && item.cue; });
    if( mergedHasCue ) {
        tlImporter_ensureCues( merged_arr, originalCueFormat );

        // The first row starts the mix: its unknown cue is minute zero, not a guess. Before the
        // two prefix rules below, so both read it as the known cue it is.
        tlImporter_firstCueZero( merged_arr, originalCueFormat );
    }

    // If the merged list uses colon cues, give unknown cues the last known prefix ("X:??").
    var mergedHasColon = merged_arr.some(function( item ){
        return item.type === "track" && item.cue && String(item.cue).indexOf(':') > -1;
    });
    if( mergedHasColon ) {
        var lastCuePrefix = "0";
        merged_arr.forEach(function( item ){
            if( item.type !== "track" ) return;

            if( !item.cue || ( typeof item.cue === "string" && item.cue.trim() === "??" ) ) {
                item.cue = lastCuePrefix + ":??";
                return;
            }

            if( item.cue && String(item.cue).indexOf(':') > -1 ) {
                var cuePrefix = String(item.cue).split(':')[0];
                if( /^\d+$/.test(cuePrefix) ) {
                    lastCuePrefix = cuePrefix;
                }
            }
        });
    }

    // Unknown cues take on every digit their known neighbours agree on ("[??]" between [095]
    // and [098] -> "[09?]"). Last, so it sees the final order and every cue the merge wrote.
    // The mix runtime plays the missing neighbour for the rows behind the last known cue.
    tlImporter_fillUnknownCuePrefixes( merged_arr, originalCueFormat, tlImporter_endMinute( options ) );

    // And once every cue is final: a "..." the merged cues themselves say is empty is dropped.
    // Only on a merge that WROTE something - a gap in a list the candidate did not enrich is
    // the page's own statement, and rewriting it would also turn the silent "Identical" /
    // "Nothing to add" verdicts into merges. See tlImporter_dropRedundantGaps().
    // The reading is taken EITHER WAY: the Report prints the median and every "..." span even
    // where nothing was dropped, and a merge that stood down is exactly the one being reported.
    // Only the deciding half is behind the counter.
    var gapCheck = state.changes > 0 ? tlImporter_dropRedundantGaps( merged_arr )
                                     : tlImporter_gapReading( merged_arr );

    // "changed" answers the only question the callers really ask - would the page text
    // differ? state.changes alone cannot: it counts every WRITE into the original, and a write
    // that lands the same value (a candidate label the original already carried, a cue re-set
    // to what it was) left the flag true while the text stayed identical - which opened the
    // edit form on a "(No difference)" diff. Both sides go through the same serializer here,
    // so <list> tags, "#" numbering and cue formatting cannot fake a difference either.
    // The counter stays part of the test: it only ever turns a true into false, never the
    // other way round, so the "the original wins" cases keep leaving the page alone.
    var mergedText = tlImporter_textFromArr( merged_arr ),
        originalText_serialized = tlImporter_textFromArr( tlImporter_parse( originalText ) );

    var changed = state.changes > 0 && mergedText !== originalText_serialized;

    return {
        mergedText: mergedText,
        changed: changed,
        // the certain "these two are the same list" reading – see tlImporter_sameTracklists
        identical: tlImporter_sameTracklists( merged_arr, candidate_arr, changed, originalText_serialized ),
        diffItems: tlImporter_diffItems( candidate_arr ),
        originalItems: tlImporter_originalItems( merged_arr ),
        // median runtime, the span a "..." needs and what every one of them spans - see
        // tlImporter_gapReading. The Report prints it; nothing on the page reads it.
        gapCheck: gapCheck
    };
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Wikitext helpers – the "== Tracklist ==" section of a mix page
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_pageDurationSec
// The mix runtime out of the page's OWN "File details" table (the "dur" column of
// {|{{NormalTableFormat}} ... | 1:04:54), in seconds. 0 when the page carries none.
//
// The second source for the bound of the last cues, and the one that does not depend on the
// link: it is read on the edit page itself, so it answers for a link built by an older script
// generation, after a form POST has eaten the hash, and for every player site that prints no
// runtime of its own. Both the one-cell-per-line shape global.js writes and the inline
// "! dur !! MB" / "| 1:04:54 || 90" shape a hand-edited page may use are read.
function tlImporter_pageDurationSec( pageText ) {
    var lines = String( pageText || "" ).split( "\n" ),
        headers = [],
        cells = [],
        column = -1;

    function add( target, line, sep ) {
        line.split( sep ).forEach(function( cell ){
            // "| style=x | value" - a cell attribute is separated from the value by a single "|"
            var parts = cell.split( "|" );
            target.push( parts[ parts.length - 1 ].trim() );
        });
    }

    for( var i = 0; i < lines.length; i++ ) {
        var line = lines[i].trim();

        if( line.indexOf( "{|" ) === 0 ) { headers = []; cells = []; column = -1; continue; }
        if( line.indexOf( "|}" ) === 0 ) { break; }
        if( line.indexOf( "|-" ) === 0 ) { continue; }

        if( line.charAt(0) === "!" ) {
            // the header row is only interesting up to the point a "dur" column is found
            if( column === -1 ) {
                add( headers, line.replace( /^!\s*/, "" ), "!!" );

                for( var h = 0; h < headers.length; h++ ) {
                    if( /^dur(ation)?$/i.test( headers[h] ) ) { column = h; break; }
                }
            }
            continue;
        }

        if( line.charAt(0) === "|" && column > -1 ) {
            add( cells, line.replace( /^\|\s*/, "" ), "||" );

            if( cells.length > column ) {
                var value = cells[ column ];
                return /^\d+(:\d{1,2}){1,2}$/.test( value ) ? tlImporter_durToSec( value ) : 0;
            }
        }
    }

    return 0;
}

// tlImporter_findTracklistSection
// The section's body span inside a page text: from the end of the "== Tracklist ==" line to
// the next heading or the first category line. null when the page has no such section.
function tlImporter_findTracklistSection( pageText ) {
    var headRe = /^[ \t]*==\s*Tracklist\s*==[ \t]*$/mi,
        m = headRe.exec( pageText );

    if( !m ) return null;

    var bodyStart = m.index + m[0].length,
        rest = pageText.slice( bodyStart ),
        endRe = /^[ \t]*(==[^=].*==[ \t]*|\[\[Category:[^\]]*\]\].*)$/mi,
        e = endRe.exec( rest ),
        bodyEnd = e ? bodyStart + e.index : pageText.length;

    return { bodyStart: bodyStart, bodyEnd: bodyEnd };
}

// tlImporter_extractTracklist
// What the mix page currently holds as its tracklist: the section body without the <list>
// tags. hasTracks says whether there is anything in it – which is what decides Insert vs Merge.
function tlImporter_extractTracklist( pageText ) {
    var section = tlImporter_findTracklistSection( pageText );

    if( !section ) return { hasSection: false, hasTracks: false, tlText: "" };

    var body = pageText.slice( section.bodyStart, section.bodyEnd )
        .replace( /<\/?list>/gi, "" )
        .trim();

    return {
        hasSection: true,
        hasTracks: body !== "",
        tlText: body
    };
}

// tlImporter_needsListTag
// MixesDB writes a tracklist as a "#" numbered list when every track is named, and as plain
// lines inside <list> when it is not – the "#" in the TLE answer ARE that decision (same rule
// as mdbPageCreator_tracklistWikitext in page_creator.js).
function tlImporter_needsListTag( tl ) {
    var lines = String( tl || "" ).split("\n");

    for( var i = 0; i < lines.length; i++ ) {
        var line = lines[i].trim();
        if( line && line.indexOf("#") !== 0 ) return true;
    }

    return false;
}

// tlImporter_tracklistWikitext
function tlImporter_tracklistWikitext( tl ) {
    tl = String( tl || "" ).trim();

    if( !tl ) return "<list>\n\n</list>";

    return tlImporter_needsListTag( tl ) ? "<list>\n" + tl + "\n</list>" : tl;
}

// tlImporter_setTracklist
// Replace the tracklist section's body with the given wikitext. null when the page has no
// section to put it in – the caller then leaves the page alone.
function tlImporter_setTracklist( pageText, tlWikitext ) {
    var section = tlImporter_findTracklistSection( pageText );

    if( !section ) return null;

    return pageText.slice( 0, section.bodyStart ) +
           "\n\n" + tlWikitext + "\n\n" +
           pageText.slice( section.bodyEnd );
}

// tlImporter_updateTlCategory
// [[Category:Tracklist: none]] -> the given status; incomplete may become complete, complete
// is never downgraded (same rule the toolkit's siteHasTl block follows).
function tlImporter_updateTlCategory( pageText, status ) {
    if( !/^(incomplete|complete)$/.test( status || "" ) ) return pageText;

    if( status === "incomplete" && /\[\[Category:Tracklist: ?complete(\|[^\]]*)?\]\]/i.test( pageText ) ) {
        return pageText;
    }

    var out = pageText.replace( /\[\[Category:Tracklist: ?none(\|[^\]]*)?\]\]/i, "[[Category:Tracklist: " + status + "]]" );

    if( status === "complete" ) {
        out = out.replace( /\[\[Category:Tracklist: ?incomplete(\|[^\]]*)?\]\]/i, "[[Category:Tracklist: complete]]" );
    }

    return out;
}

tlImporter_log( "merge_core.js loaded" );
