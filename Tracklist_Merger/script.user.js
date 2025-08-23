// ==UserScript==
// @name         Tracklist Merger (Beta)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.08.23.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Merger_Beta_9
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://cdn.jsdelivr.net/npm/diff@5.1.0/dist/diff.min.js
// @match        https://www.mixesdb.com/w/MixesDB:Tests/Tracklist_Merger*
// @include      http*trackid.net/audiostreams/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basics
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const tid_minGap = 3;
const similarityThreshold = 0.8;


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * Funcs (to be moved)
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * clear_textareas
 */
function clear_textareas() {
    $("#tracklistMerger-wrapper textarea").val("");
    $("#tracklistMerger-wrapper #diffContainer td").remove();
}

/*
 * adjust_textareaRows
 *
 * Ensure that all textareas in the same table row share the height of
 * the largest textarea. This avoids having differently sized textareas
 * when pasting content into only one of them.
 */
function adjust_textareaRows( textarea ) {
    var tr = textarea.closest('tr'),
        textareas = tr.find('textarea'),
        maxRows = 1;

    textareas.each(function(){
        var rows = $(this).val().trim().split(/\r\n|\r|\n/).length;
        if( rows > maxRows ) {
            maxRows = rows;
        }
    });

    textareas.attr('rows', maxRows);
}

/*
 * adjust_preHeights
 *
 * Ensure that all <pre> elements in the same table row share the height of
 * the tallest <pre>. This keeps the diff view columns aligned regardless of
 * content length.
 */
function adjust_preHeights( pre ) {
    var tr = pre.closest('tr'),
        pres = tr.find('pre'),
        maxHeight = 0;

    pres.css('height', '');

    pres.each(function(){
        var h = this.scrollHeight;
        if( h > maxHeight ) {
            maxHeight = h;
        }
    });

    pres.height( maxHeight );
}

/*
 * normalize track titles for matching
 * copied from Common.js
 */

// normalizeTrackTitlesForMatching
function normalizeTrackTitlesForMatching( text ) {
    text = text.trim();
    // remove bracketed descriptors anywhere in the string (e.g. labels, roles)
    text = text.replace(/\s*\[[^\]]+\]\s*/g, ' ');
    text = normalizeStreamingServiceTracks( text );
    text = removePointlessVersions( text );
    text = removeVersionWords( text ).replace( / \((.+) \)/, " ($1)" );
    text = text.replace(/\s+[x×]\s+/gi, " & ");
    text = text.replace( /^(.+) (?:Ft|Feat\.|Featuring?) .+ - (.+)$/, "$1 - $2" );

    var parts = text.split(" - ");
    if (parts.length > 1) {
        var artists = parts.shift();
        var title = parts.join(" - ");
        artists = artists
            .replace(/\s*(?:Ft|Feat\.?|Featuring|\baka\b)\s+/gi, " & ")
            .replace(/\s*,\s*/g, " & ")
            .replace(/\s+[x×]\s+/gi, " & ");
        var artistsArr = artists.split(/\s*(?:&|\band\b)\s*/i);
        if (artistsArr.length > 1) {
            artistsArr = artistsArr.map(a => a.trim()).sort((a, b) => a.localeCompare(b));
            artists = artistsArr.join(" & ");
        }
        var normArtists = artists.toLowerCase();

        title = title.replace(/\(([^)]+)\)/g, function(match, p1) {
            var normP1 = p1
                .replace(/\s*(?:Ft|Feat\.?|Featuring|\baka\b)\s+/gi, " & ")
                .replace(/\s*,\s*/g, " & ")
                .replace(/\s+[x×]\s+/gi, " & ")
                .toLowerCase().replace(/\s{2,}/g, ' ').trim();
            var normP1Arr = normP1.split(/\s*(?:&|\band\b|\baka\b)\s*/i)
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b));
            var normP1Sorted = normP1Arr.join(" & ");
            return normP1Sorted === normArtists ? '' : match;
        }).replace(/\s{2,}/g, ' ').trim();

        text = artists + " - " + title;
    }

    text = text.toLowerCase().replace(/\s{2,}/g, ' ').trim();

    logVar( "normalizeTrackTitlesForMatching", text );

    return text;
}

/*
 * getTrackMatchNorms
 * Return normalized variants for all artist combinations
 */
function getTrackMatchNorms( text ) {
    const combosSet = new Set();

    function buildCombos( str ) {
        str = str.trim().replace(/\s*\[[^\]]+\]\s*/g, ' ');
        str = removePointlessVersions( str );
        str = removeVersionWords( str );
        str = str.replace(/\s+[x×]\s+/gi, " & ");
        str = str.trim();

        var parts = str.split(" - ");
        if (parts.length < 2) {
            combosSet.add( normalizeTrackTitlesForMatching( str ) );
            return;
        }

        var artists = parts.shift()
            .replace(/\s*(?:Ft|Feat\.?|Featuring|\baka\b)\s+/gi, " & ")
            .replace(/\s*,\s*/g, " & ")
            .replace(/\s+[x×]\s+/gi, " & ");
        var title = parts.join(" - ");
        var artistsArr = artists.split(/\s*(?:&|\band\b|\baka\b)\s*/i).map(a => a.trim()).filter(Boolean);
        artistsArr = [...new Set(artistsArr)];

        function combine(start, combo) {
            if (combo.length) {
                var artistStr = combo.slice().sort((a,b) => a.localeCompare(b)).join(" & ");
                combosSet.add( normalizeTrackTitlesForMatching( artistStr + " - " + title ) );
            }
            for (var i = start; i < artistsArr.length; i++) {
                combo.push( artistsArr[i] );
                combine( i + 1, combo );
                combo.pop();
            }
        }

        combine(0, []);

        if (!artistsArr.length) {
            combosSet.add( normalizeTrackTitlesForMatching( str ) );
        }
    }

    buildCombos( text );

    var textNoParens = text.replace(/\s*\([^\)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if ( textNoParens && textNoParens !== text ) {
        buildCombos( textNoParens );
    }

    return [...combosSet];
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Merge functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * isTextSimilar
 * Usage Examples:

  // true: identical strings
  $.isTextSimilar(
    "Foo Bar - Baz",
    "Foo Bar - Baz"
  ); // → true

  // true: only one character difference ("Dimensions" vs. "Dimension")
  $.isTextSimilar(
    "Hieroglyphic Being - The Fourth Dimensions",
    "Hieroglyphic Being - The Fourth Dimension"
  ); // → true

  // false: too many differences
  $.isTextSimilar(
    "Hieroglyphic Being - The Fourth Dimensions",
    "Hieroglyphic Being - Some Name"
  ); // → false

  // you can also adjust tolerance (e.g., 80% similarity)
  $.isTextSimilar( "Hieroglyphic Being - The Fourth Dimensions", "Hieroglyphic Being - The Fourth Dimension", 0.95 ); // true
 */
(function($) {
  // Compute edit (Levenshtein) distance between two strings
  function _editDistance(a, b) {
    var m = a.length, n = b.length,
        dp = [], i, j;

    // initialize dp table
    for (i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (j = 1; j <= n; j++) {
      dp[0][j] = j;
    }

    // fill dp
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,       // deletion
          dp[i][j-1] + 1,       // insertion
          dp[i-1][j-1] + cost   // substitution
        );
      }
    }
    return dp[m][n];
  }

  /**
   * $.isTextSimilar(str1, str2[, threshold])
   *
   * @param {String} str1
   * @param {String} str2
   * @param {Number} [threshold=0.9] similarity threshold between 0 and 1
   * @return {Boolean}
   */
  $.isTextSimilar = function(str1, str2, threshold) {
    threshold = (typeof threshold === 'number') ? threshold : 0.9;

    // normalize: trim, lowercase, strip excess whitespace
    var s1 = $.trim(str1).toLowerCase().replace(/\s+/g, ' ');
    var s2 = $.trim(str2).toLowerCase().replace(/\s+/g, ' ');

    // if exactly equal, immediate true
    if (s1 === s2) {
      return true;
    }

    // compute edit distance & normalize
    var distance = _editDistance(s1, s2);
    var maxLen   = Math.max(s1.length, s2.length);
    if (maxLen === 0) {
      // both empty
      return true;
    }
    var similarity = (maxLen - distance) / maxLen;

    return (similarity >= threshold);
  };
})(jQuery);
/* END isTextSimilar */

/*
 * mergeTracklists
 */
function mergeTracklists(original_arr, candidate_arr) {
    // Strip out false-tracks from the candidate list, but keep everything in the original (including gaps)
    candidate_arr = candidate_arr.filter(item => item.type !== "track (false)");

    // Build exact lookup + fuzzy list for all original track items
    const originalMap   = {}; // normalizedTitle → original item
    const fuzzyList     = []; // [{ norm, item }]
    const originalHasGaps = original_arr.some(item => item.type === "gap" || item.trackText === "?");

    original_arr.forEach(item => {
        if (item.type === "track") {
            const norms = getTrackMatchNorms(item.trackText);
            norms.forEach(norm => {
                originalMap[norm] = item;
                fuzzyList.push({ norm, item });
            });
        }
    });

    const unmatched = [];

    // Walk through candidate tracks
    for (let i = 0; i < candidate_arr.length; i++) {
        const cand = candidate_arr[i];
        if (cand.type !== "track" || !cand.trackText) {
            continue;
        }

        const candidateName  = cand.trackText;
        const candidateLabel = cand.label;
        const isUnknown      = candidateName === "?";

        let origItem;

        if (!isUnknown) {
            const candNorms = getTrackMatchNorms(candidateName);

            // 1) Try exact match by normalized title
            for (const candNorm of candNorms) {
                if (originalMap.hasOwnProperty(candNorm)) {
                    origItem = originalMap[candNorm];
                    break;
                }
            }

            // 2) Fallback to fuzzy matching
            if (!origItem) {
                outer: for (const candNorm of candNorms) {
                    for (const entry of fuzzyList) {
                        if ($.isTextSimilar(entry.norm, candNorm, similarityThreshold)) {
                            origItem = entry.item;
                            break outer;
                        }
                    }
                }
            }
        }

        // 3) Fallback: same cue + unknown trackText
        if (!origItem && cand.cue) {
            origItem = original_arr.find(item =>
                item.type === "track" &&
                item.trackText === "?" &&
                item.cue === cand.cue
            );
        }

        if (origItem) {
            if (origItem.trackText === "?") {
                origItem.trackText = candidateName;
            }

            if (cand.cue && (!origItem.cue || String(origItem.cue).includes('?'))) origItem.cue = cand.cue;
            if (cand.dur && !origItem.dur)         origItem.dur   = cand.dur;
            if (candidateLabel && !origItem.label) origItem.label = candidateLabel;

            const nextCand = candidate_arr[i + 1];
            if (
                nextCand &&
                nextCand.type === "track" &&
                nextCand.trackText === "?" &&
                nextCand.cue
            ) {
                const origIndex = original_arr.indexOf(origItem);
                for (let j = origIndex + 1; j < original_arr.length; j++) {
                    if (!original_arr[j].cue) {
                        original_arr[j].cue = nextCand.cue;
                        break;
                    }
                }
            }
        } else {
            unmatched.push({ cand, index: i, isUnknown });
        }
    }

    // Insert unmatched tracks (including gaps around them)
    unmatched.forEach(({ cand, index, isUnknown }) => {
        const cueNum = parseInt(cand.cue);
        if (
            isUnknown && (
                !originalHasGaps ||
                original_arr.some(item => item.type === "track" && parseInt(item.cue) === cueNum)
            )
        ) {
            return; // skip unknowns when original has no gaps or duplicate unknown at same cue
        }

        let insertIndex = original_arr.findIndex(
            item => item.type === "track" && parseInt(item.cue) > cueNum
        );
        if (insertIndex === -1) insertIndex = original_arr.length;

        const hasPrevGap = index > 0 && candidate_arr[index - 1].type === "gap";
        const hasNextGap = index < candidate_arr.length - 1 && candidate_arr[index + 1].type === "gap";

        const gapBefore = insertIndex > 0 && original_arr[insertIndex - 1].type === "gap";
        if (gapBefore && !hasPrevGap) {
            insertIndex--; // reuse existing gap slot
        }

        if (
            originalHasGaps &&
            hasPrevGap &&
            (insertIndex === 0 || original_arr[insertIndex - 1].type !== "gap")
        ) {
            original_arr.splice(insertIndex, 0, { type: "gap" });
            insertIndex++;
        }

        original_arr.splice(insertIndex, 0, cand);

        if (
            originalHasGaps &&
            hasNextGap &&
            (insertIndex + 1 >= original_arr.length || original_arr[insertIndex + 1].type !== "gap")
        ) {
            original_arr.splice(insertIndex + 1, 0, { type: "gap" });
        }
    });

    return original_arr; // = merged
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Diff functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

 (function($) {
    function escapeHTML(s) { return $('<div>').text(s).html(); }
    function wrapSpan(val, cls) {
      var lead = val.match(/^\s*/)[0];
      var trail = val.match(/\s*$/)[0];
      var core = val.slice(lead.length, val.length - trail.length);
      return lead + (core ? '<span class="' + cls + '">' + escapeHTML(core) + '</span>' : '') + trail;
    }
    function charDiffGreen(orig, mod) {
      return Diff.diffWords(orig, mod).map(function(p) {
        if (p.added)   return wrapSpan(p.value, 'diff-added');
        if (p.removed) return '';
        return escapeHTML(p.value);
      }).join('');
    }
    function charDiffRed(orig, mod) {
      return Diff.diffWords(orig, mod).map(function(p) {
        if (p.added)   return wrapSpan(p.value, 'diff-removed');
        if (p.removed) return '';
        return escapeHTML(p.value);
      }).join('');
    }
      $.fn.showTracklistDiffs = function(opts) {
      var text1 = opts.text1 || '';
      var text2 = opts.text2 || '';
      var text3 = opts.text3 || '';

      // Ensure each column string ends with a newline so that the
      // corresponding <pre> elements have matching heights. Without this the
      // Candidate column could appear one row shorter when its input lacked a
      // trailing line break.
      if (text1.slice(-1) !== '\n') { text1 += '\n'; }
      if (text2.slice(-1) !== '\n') { text2 += '\n'; }
      if (text3.slice(-1) !== '\n') { text3 += '\n'; }

      var lines1 = text1.split('\n');
      var lines2 = text2.split('\n');
      var lines3 = text3.split('\n');
      return this.each(function() {
        var $container = $(this).empty();
        var $row = $('<tr id="diffContainer">');

        // Column 1: Original
        $row.append($('<td>').append($('<pre>').text(text1)));

        // Column 2: Merged vs Original (green additions)
        var html2 = lines2.map(function(line, i) {
          var core2 = line.replace(/^#?\s*\[.*?\]\s*/, '').trim().toLowerCase();
          var orig = lines1[i] || '';
          var core1 = orig.replace(/^#?\s*\[.*?\]\s*/, '').trim().toLowerCase();
          if (core2 === '?' || core2 === '...') {
            return escapeHTML(line);
          }
          if (core1 === core2) {
            return escapeHTML(line);
          }
          return charDiffGreen(orig, line);
        }).join('\n');
        $row.append($('<td>').append($('<pre>').html(html2)));

        // Column 3: Candidate vs Merged (red extras, normalized matching)
        var html3 = lines3.map(function(line) {
          var coreRaw = line.replace(/^#?\s*\[.*?\]\s*/, '').trim();
          if (coreRaw === '?' || coreRaw === '...') {
            return escapeHTML(line);
          }
          var cue = line.match(/^(\s*\[.*?\]\s*)/);
          var prefix = cue ? cue[1] : '';
          var core = coreRaw;
          // strip trailing label for matching
          var coreNoLabel = core.replace(/\s*\[[^\]]+\]\s*$/, '');
          var normCore = normalizeTrackTitlesForMatching(coreNoLabel);
          var origCore = '';
          var origNorm = '';
          for (var j = 0; j < lines2.length; j++) {
            var cand = lines2[j].replace(/^#?\s*\[.*?\]\s*/, '').trim();
            var candNoLabel = cand.replace(/\s*\[[^\]]+\]\s*$/, '');
            var candNorm = normalizeTrackTitlesForMatching(candNoLabel);
            if ($.isTextSimilar(candNorm, normCore)) {
              origCore = cand;
              origNorm = candNorm;
              break;
            }
          }
          if (origNorm === normCore) {
            return escapeHTML(line);
          }
          return escapeHTML(prefix) + charDiffRed(origCore, core);
        }).join('\n');

        $row.append($('<td>').append($('<pre>').html(html3)));

        $container.replaceWith($row);
      });
    };
  })(jQuery);


/*
 * run_diff
 */
function run_diff() {
    var text1 = $("#tl_original").val(),
        text2 = $("#merge_result_tle").val(),
        text3 = $("#tl_candidate").val();
    if( text1 && text2 && text3 ) {
        $('#diffContainer').showTracklistDiffs({ text1, text2, text3 });
        var pre = $('#diffContainer pre').first();
        if( pre.length ) {
            adjust_preHeights( pre );
        }
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * Run everything
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * normalizeCueDigits
 * Pad cues like "[00]" to three digits ("[000]")
 */
function normalizeCueDigits(tl_arr) {
    tl_arr.forEach(function(item) {
        if (item.cue && /^\d{1,2}$/.test(item.cue)) {
            item.cue = ("000" + item.cue).slice(-3);
        }
    });
    return tl_arr;
}

/*
 * usesThreeDigitCues
 * Return true if any cue under 100 is written with three digits
 */
function usesThreeDigitCues(tl_arr) {
    return tl_arr.some(function(item) {
        return item.cue && /^\d{3}$/.test(item.cue) && parseInt(item.cue, 10) < 100;
    });
}

/*
 * run_merge
 */
function run_merge( showDebug=false ) {
    var tl_original = $("#tl_original").val(),
        tl_candidate = $("#tl_candidate").val(),
        tl_original_arr  = make_tlArr( tl_original ),
        tl_candidate_arr = make_tlArr( tl_candidate );

    // If only one list uses three-digit cues, pad the other
    var originalHas3  = usesThreeDigitCues( tl_original_arr ),
        candidateHas3 = usesThreeDigitCues( tl_candidate_arr );
    if( originalHas3 && !candidateHas3 ) {
        normalizeCueDigits( tl_candidate_arr );
    } else if( candidateHas3 && !originalHas3 ) {
        normalizeCueDigits( tl_original_arr );
    }

    tl_original_arr  = addCueDiffs( tl_original_arr );
    tl_candidate_arr = addCueDiffs( tl_candidate_arr );

    $("#tl_original_arr").val(  "var tl_original_arr = "  + JSON.stringify( tl_original_arr, null, 2 )  + ";" );
    $("#tl_candidate_arr").val( "var tl_candidate_arr = " + JSON.stringify( tl_candidate_arr, null, 2 ) + ";" );

    // Merge
    var tl_merged_arr = mergeTracklists( tl_original_arr, tl_candidate_arr );

    // When cue formats differ ("MM:SS" vs "MM"), unify the result
    var originalHasColon  = tl_original_arr.some(item => item.cue && item.cue.includes(':')),
        candidateHasColon = tl_candidate_arr.some(item => item.cue && item.cue.includes(':'));

    if( originalHasColon !== candidateHasColon ) {
        var origTrackCount   = tl_original_arr.filter(item => item.type === "track").length,
            mergedTrackCount = tl_merged_arr.filter(item => item.type === "track").length,
            pad2 = n => String(n).padStart(2, '0');

        if( mergedTrackCount > origTrackCount ) {
            // New tracks added → convert all cues to minutes (rounded)
            tl_merged_arr.forEach(function(item){
                if( item.type === "track" && item.cue ) {
                    if( item.cue.includes(':') ) {
                        item.cue = pad2( Math.round( durToSec_MS( item.cue ) / 60 ) );
                    } else {
                        item.cue = pad2( item.cue );
                    }
                }
            });
        } else if( originalHasColon ) {
            // No new tracks → keep original format
            tl_merged_arr.forEach(function(item){
                if( item.type === "track" && item.cue && !item.cue.includes(':') ) {
                    item.cue = pad2( item.cue ) + ':00';
                }
            });
        } else {
            tl_merged_arr.forEach(function(item){
                if( item.type === "track" && item.cue ) {
                    if( item.cue.includes(':') ) {
                        item.cue = pad2( Math.round( durToSec_MS( item.cue ) / 60 ) );
                    } else {
                        item.cue = pad2( item.cue );
                    }
                }
            });
        }
    }

    var tl_merged = arr_toTlText( tl_merged_arr );

    $("#merge_result").val( tl_merged );
    $("#merge_result_arr").val( JSON.stringify( tl_merged_arr, null, 2 ) );

    // Format with TLE API
    var res = apiTracklist( tl_merged, "addDurBrackets" ),
        tl_merged_tle = res.text;

    if( tl_merged_tle ) {
        log( "\n" + tl_merged_tle );
        $("#merge_result_tle").val( tl_merged_tle );

        // run diff
        run_diff();
    }

    /*
     * fix tl textarea heights
     */
    $("textarea.fixRows").each(function(){
        adjust_textareaRows( $(this) );
    });
    // but adjust candidate height if smaller than original
    var rows_original = $("#tl_original").attr("rows"),
        rows_candidate = $("#tl_candidate").attr("rows");
    if( rows_original > rows_candidate ) {
        $("#tl_candidate").attr("rows", rows_original );
    }

    if( showDebug ) {
        $("tr.debug").show()
    }
}


/*
 * On MixesDB
 */
if( domain == "mixesdb.com" ) {
    $(document).ready(function () {

        $("#clear").click(function(){
            clear_textareas();
        });

        $("#diff").click(function(e){
            e.preventDefault();
            run_diff();
        });

        /*
         * if url paramater
         */
        var tl_original = getURLParameter( "tl_original" );
        if( tl_original && tl_original != "" ) {
            clear_textareas();

            logVar( "tl_original URL param", tl_original );

            $("#tl_original").val( tl_original );

            adjust_textareaRows( $("#tl_original") );
        }

        var tl_candidate = getURLParameter( "tl_candidate" );
        if( tl_candidate && tl_candidate != "" ) {

            logVar( "tl_candidate URL param", tl_candidate );

            $("#tl_candidate").val( tl_candidate );

            adjust_textareaRows( $("#tl_candidate") );
        }

        /*
         * init run for saved tracklists
         */
        if( getURLParameter( "do" ) == "merge" &&
            tl_original &&
            tl_candidate
          ) {
            run_merge( true );
        }
    });
}


/*
 * On TID
 */
if( domain == "trackid.net" ) {
    // create merge link under tracklists
    waitForKeyElements("ul#tlEditor-feedback-topInfo", function( jNode ) {
        var tl_candidate = $("textarea.mixesdb-TLbox").val();

        if( tl_candidate ) {
            var mergeLink = '<a href="https://www.mixesdb.com/w/MixesDB:Tests/Tracklist_Merger?tl_candidate='+encodeURIComponent( tl_candidate )+'" target="_blank">Open in Tracklist Merger</a>';

            jNode.prepend( '<li id="mergeLink">'+mergeLink+'</li>' );
        }
    });
}