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
 * Ported from the stalled Tracklist Merger userscript (Tracklist_Merger/script.user.js), made
 * self-contained on purpose: pure text in, text out – no DOM, no network, no jQuery – which is
 * what lets the deno runner (importer_examples_test.js) exercise it outside a browser, the way
 * page_creator's title_builder.js is tested. Keep it that way: the DOM half lives in funcs.js.
 *
 * Every candidate item records what the merge USED of it (tlImporter_candidateUse), so the
 * diff view under the wiki edit box can highlight exactly the candidate text that was NOT
 * taken over – see tlImporter_diffItems().
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Threshold for fuzzy matching when merging track titles (same value the merger used)
var tlImporter_similarityThreshold = 0.8;

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
 * Tracklist text <-> array
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_parse
// Port of make_tlArr (tracklist_editor/funcs.js) under its own name: the merge core cannot
// call the shared one (deno), and must not overwrite it on pages that load both.
function tlImporter_parse( tl ) {
    tl = String( tl || "" ).replace(/''/g, ""); // ''Hitam - ? [Unreleased]'' > Hitam - ? [Unreleased]

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
// "3:18" -> 198 (port of durToSec_MS in global.js)
function tlImporter_durToSec( dur ) {
    var a = String( dur ).trim().split(':');
    return (+a[0]) * 60 + (+a[1]);
}

// tlImporter_cueFormat
// Detect cue format from the first numeric cue in a tracklist array.
function tlImporter_cueFormat( tl_arr ) {
    for( var i = 0; i < tl_arr.length; i++ ) {
        var cue = tl_arr[i].cue;
        if( !cue || !/^\d+(:\d+)?$/.test(cue) ) { continue; }

        if( cue.indexOf(':') > -1 ) {
            var parts = cue.split(':');
            return { hasColon: true, minDigits: parts[0].length, secDigits: parts[1].length };
        }

        return { hasColon: false, cueDigits: cue.length };
    }
    return null;
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
    if( !cue || !format || !/^\d+(:\d+)?$/.test(cue) ) { return cue; }
    options = options || {};

    if( format.hasColon ) {
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

    var minsOnly = cue.indexOf(':') > -1
        ? parseInt(cue.split(':')[0], 10) * 60 + parseInt(cue.split(':')[1], 10)
        : parseInt(cue, 10);
    return tlImporter_padStart( minsOnly, format.cueDigits );
}

// tlImporter_normalizeCues
// Normalize all numeric track cues of an array to the target cue format.
function tlImporter_normalizeCues( tl_arr, targetFormat, options ) {
    if( !targetFormat ) { return tl_arr; }
    tl_arr.forEach(function( item ){
        if( item.type === "track" && item.cue ) {
            item.cue = tlImporter_cueToFormat( item.cue, targetFormat, options );
        }
    });
    return tl_arr;
}

// tlImporter_unknownCue
// An explicit unknown cue placeholder in the active cue style ("??" / "?:??").
function tlImporter_unknownCue( format ) {
    if( format && format.hasColon ) {
        return new Array( format.minDigits + 1 ).join("?") + ":" + new Array( format.secDigits + 1 ).join("?");
    }

    return new Array( ( format && format.cueDigits ? format.cueDigits : 2 ) + 1 ).join("?");
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

// tlImporter_sameCue
// "Did the merged track end up with the candidate's cue?" – for the usage flags. Loose on
// leading zeros and on colon cues, since both sides were normalized to the same format anyway.
function tlImporter_sameCue( a, b ) {
    if( a === undefined || b === undefined ) return a === b;

    a = String(a); b = String(b);
    if( a === b ) return true;
    if( /^\d+$/.test(a) && /^\d+$/.test(b) ) return parseInt(a, 10) === parseInt(b, 10);
    if( a.indexOf(':') > -1 && b.indexOf(':') > -1 ) return tlImporter_durToSec(a) === tlImporter_durToSec(b);

    return false;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The merge (port of the merger's mergeTracklists, plus usage tracking)
 *
 * `state` is a shared counter object: state.changes counts every write into the original, so
 * the caller can tell an enriching merge from one where the candidate added nothing at all.
 *
 * Usage tracking, for the diff view: every candidate item leaves with private flags
 * (_ti_matchedOrig, _ti_inserted, _ti_cueUsed) that tlImporter_candidateUse() reads AFTER the
 * merge, when the original items have their final cue/label values.
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
        similarityCache = {},
        originalHasGaps = original_arr.some(function( item ){ return item.type === "gap" || item.trackText === "?"; });

    original_arr.forEach(function( item ) {
        if (item.type === "track") {
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
            isUnknown      = candidateName === "?",
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
        }

        // 3) Fallback: same cue + unknown trackText in the original
        if (!origItem && cand.cue) {
            origItem = original_arr.filter(function( item ){
                return item.type === "track" && item.trackText === "?" && item.cue === cand.cue;
            })[0] || null;
        }

        if (origItem) {
            cand._ti_matchedOrig = origItem;

            if (origItem.trackText === "?") {
                origItem.trackText = candidateName;
                state.changes++;
            }

            if (cand.cue && (!origItem.cue || String(origItem.cue).indexOf('?') > -1)) {
                origItem.cue = cand.cue;
                state.changes++;
            }
            if (cand.dur && !origItem.dur) origItem.dur = cand.dur;
            if (candidateLabel && !origItem.label) {
                origItem.label = candidateLabel;
                state.changes++;
            }
            origItem._mergeMatchedCandidateIndex = i;

            // A following unknown candidate carries a cue the original's next cue-less track
            // can take over.
            var nextCand = candidate_arr[i + 1];
            if (nextCand && nextCand.type === "track" && nextCand.trackText === "?" && nextCand.cue) {
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
    // unconsumed "?" placeholder.
    function findUnknownSlotForCandidateIndex( candidateIndex ) {
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
            if (item.type === "track" && item.trackText === "?" && !item._mergeConsumedUnknown) {
                return item;
            }
        }

        return null;
    }

    if (originalHasGaps) {
        candidate_arr.forEach(function( cand, index ) {
            var unmatchedItem = unmatchedByIndex[index];

            if (unmatchedItem) {
                var slot = findUnknownSlotForCandidateIndex(index);
                if (slot) {
                    if (cand.cue) { slot.cue = cand.cue; state.changes++; }
                    if (cand.dur && !slot.dur) slot.dur = cand.dur;
                    if (cand.trackText !== "?") { slot.trackText = cand.trackText; state.changes++; }
                    if (cand.label && !slot.label) { slot.label = cand.label; state.changes++; }
                    slot._mergeConsumedUnknown = true;
                    unmatchedItem.filledUnknownSlot = true;
                    cand._ti_matchedOrig = slot;
                }
            } else if (cand.type === "gap") {
                var gapSlot = findUnknownSlotForCandidateIndex(index);
                if (gapSlot) {
                    gapSlot._mergeConsumedUnknown = true;
                }
            }
        });
    }

    // Insert unmatched tracks (including gaps around them) when no original unknown
    // placeholder was available in the same matched candidate segment.
    unmatched.forEach(function( u ) {
        if (u.filledUnknownSlot) return;

        var cand = u.cand,
            index = u.index,
            cueNum = parseInt(cand.cue);

        if (
            u.isUnknown && (
                !originalHasGaps ||
                original_arr.some(function( item ){ return item.type === "track" && parseInt(item.cue) === cueNum; })
            )
        ) {
            return; // skip unknowns when original has no gaps or duplicate unknown at same cue
        }

        var insertIndex = -1;
        for (var k = 0; k < original_arr.length; k++) {
            if (original_arr[k].type === "track" && parseInt(original_arr[k].cue) > cueNum) {
                insertIndex = k;
                break;
            }
        }
        if (insertIndex === -1) insertIndex = original_arr.length;

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

        if (originalHasGaps && hasNextGap &&
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
            cue: !cand.cue || tlImporter_sameCue( orig.cue, cand.cue ),
            text: true,
            label: !cand.label || String( orig.label || "" ).toLowerCase() === String( cand.label ).toLowerCase()
        };
    }

    // unmatched and not inserted
    return {
        cue: !cand.cue || !!cand._ti_cueUsed,
        text: cand.trackText === "?",
        label: !cand.label
    };
}

// tlImporter_diffItems
// The candidate as serializable rows for the diff view (and for sessionStorage, so the view
// survives "Show changes" / "Show preview").
function tlImporter_diffItems( candidate_arr ) {
    return candidate_arr.map(function( cand ) {
        if (cand.type === "gap") return { type: "gap" };

        return {
            type: "track",
            cue: cand.cue || "",
            text: cand.trackText || "",
            label: cand.label || "",
            use: tlImporter_candidateUse( cand )
        };
    });
}

// tlImporter_merge
// The one entry the site code calls: original text + candidate text in, merged text (raw, NOT
// yet TLE-formatted), a changed flag and the candidate diff rows out.
function tlImporter_merge( originalText, candidateText ) {
    var original_arr = tlImporter_parse( originalText ),
        candidate_arr = tlImporter_parse( candidateText );

    // Normalize candidate cues to the original cue format before merging.
    var originalCueFormat = tlImporter_cueFormat( original_arr ),
        originalFirstCuePrefix = "0";

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

    return {
        mergedText: tlImporter_textFromArr( merged_arr ),
        changed: state.changes > 0,
        diffItems: tlImporter_diffItems( candidate_arr )
    };
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Wikitext helpers – the "== Tracklist ==" section of a mix page
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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
