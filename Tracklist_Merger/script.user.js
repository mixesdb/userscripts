// ==UserScript==
// @name         Tracklist Merger (Beta)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.08.20.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Merger_Beta_7
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
 */
function adjust_textareaRows( textarea ) {
    var rows = textarea.val().trim().split(/\r\n|\r|\n/).length;

    textarea.attr("rows", rows);
}

/*
 * removePointlessVersionsForMatching
 */
function removePointlessVersionsForMatching( t ) {
    return t.replace( / \((Vocal|Main|Radio|Album|Single)\s?(Version|Edit|Mix)?\)/gmi, "" );
}

/*
 * normalize track titles for matching
 * copied from Common.js
 */

// normalizeTrackTitlesForMatching
function normalizeTrackTitlesForMatching( text ) {
    text = text.trim();
    text = normalizeStreamingServiceTracks( text );
    text = removeVersionWords( text ).replace( / \((.+) \)/, " ($1)" );
    text = removePointlessVersionsForMatching( text );

    text = text.replace( /^(.+) (?:Ft|Feat\.|Featuring?|&) .+ - (.+)$/, "$1 - $2" );

    text = text.toLowerCase();

    logVar( "normalizeTrackTitlesForMatching", text );

    return text;
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
    const originalMap = {}; // normalizedTitle → index in original_arr
    const fuzzyList   = []; // [{ norm, index }]
    original_arr.forEach((item, index) => {
        if (item.type === "track") {
            const norm = normalizeTrackTitlesForMatching(item.trackText);
            originalMap[norm] = index;
            fuzzyList.push({ norm, index });
        }
    });

    // Walk through candidate tracks
    for (let i = 0; i < candidate_arr.length; i++) {
        const cand = candidate_arr[i];
        if (cand.type !== "track" || !cand.trackText || cand.trackText === "?") {
            continue;
        }

        // Remember the candidate’s own name & label
        const candidateName  = cand.trackText;
        const candidateLabel = cand.label;

        const candNorm = normalizeTrackTitlesForMatching(candidateName);

        // 1) Try exact match by normalized title
        let matchIndex = originalMap[candNorm];

        // 2) Fallback to fuzzy matching
        if (matchIndex === undefined) {
            for (const entry of fuzzyList) {
                if ($.isTextSimilar(entry.norm, candNorm, similarityThreshold)) {
                    matchIndex = entry.index;
                    break;
                }
            }
        }

        // 3) Fallback: same cue + unknown trackText
        if (matchIndex === undefined && cand.cue) {
            matchIndex = original_arr.findIndex(item =>
                                                item.type === "track" &&
                                                item.trackText === "?" &&
                                                item.cue === cand.cue
                                               );
        }

        // Only proceed if we got a real slot
        if (typeof matchIndex === "number" && matchIndex >= 0) {
            const orig = original_arr[matchIndex];

            // --- NEW: if the original was unknown, adopt the candidate’s name ---
            if (orig.trackText === "?") {
                orig.trackText = candidateName;
            }
            // otherwise, leave the existing original spelling in place

            // Merge in missing cue or label
            if (cand.cue && !orig.cue)         orig.cue   = cand.cue;
            if (candidateLabel && !orig.label) orig.label = candidateLabel;

            // Existing “? plus cue” hack
            const nextCand = candidate_arr[i + 1];
            if (
                nextCand &&
                nextCand.type === "track" &&
                nextCand.trackText === "?" &&
                nextCand.cue
            ) {
                for (let j = matchIndex + 1; j < original_arr.length; j++) {
                    if (!original_arr[j].cue) {
                        original_arr[j].cue = nextCand.cue;
                        break;
                    }
                }
            }
        }
    }

    return original_arr; // = merged
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Diff functions
 * ChatGPT 4o-mini-high v2
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
      return Diff.diffChars(orig, mod).map(function(p) {
        if (p.added)   return wrapSpan(p.value, 'diff-added');
        if (p.removed) return '';
        return escapeHTML(p.value);
      }).join('');
    }
    function charDiffRed(orig, mod) {
      return Diff.diffChars(orig, mod).map(function(p) {
        if (p.added)   return wrapSpan(p.value, 'diff-removed');
        if (p.removed) return '';
        return escapeHTML(p.value);
      }).join('');
    }
    $.fn.showTracklistDiffs = function(opts) {
      var text1 = opts.text1 || '';
      var text2 = opts.text2 || '';
      var text3 = opts.text3 || '';
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
          var normCore = normalizeTrackTitlesForMatching(core);
          var origCore = '';
          for (var j = 0; j < lines2.length; j++) {
            var cand = lines2[j].replace(/^#?\s*\[.*?\]\s*/, '').trim();
            if ($.isTextSimilar(normalizeTrackTitlesForMatching(cand), normCore)) {
              origCore = cand;
              break;
            }
          }
          if (normalizeTrackTitlesForMatching(origCore) === normCore) {
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
 * run_merge
 */
function run_merge( showDebug=false ) {
    var tl_original = $("#tl_original").val(),
        tl_candidate = $("#tl_candidate").val(),
        tl_original_arr  = addCueDiffs( make_tlArr( tl_original  ) ),
        tl_candidate_arr = addCueDiffs( make_tlArr( tl_candidate ) );

    $("#tl_original_arr").val(  "var tl_original_arr = "  + JSON.stringify( tl_original_arr, null, 2 )  + ";" );
    $("#tl_candidate_arr").val( "var tl_candidate_arr = " + JSON.stringify( tl_candidate_arr, null, 2 ) + ";" );

    // Merge
    var tl_merged_arr = mergeTracklists( tl_original_arr, tl_candidate_arr ),
        tl_merged = arr_toTlText( tl_merged_arr );

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