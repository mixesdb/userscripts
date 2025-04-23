// ==UserScript==
// @name         Tracklist Merger (Beta)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.04.23.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Merger_Beta_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jsdiff/7.0.0/diff.min.js
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

/* removePointlessVersionsForMatching */
function removePointlessVersionsForMatching( t ) {
    return t.replace( / \((Vocal|Main)\)/gmi, "" );
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
    // 1) Keep only real tracks in original, and drop "track (false)" in candidate
    original_arr = original_arr.filter(item => item.type === "track");
    candidate_arr = candidate_arr.filter(item => item.type !== "track (false)");

    // 2) Build exact lookup + a list for fuzzy matching
    const originalMap = {};     // normalizedTitle -> index
    const fuzzyList = [];       // [{ norm, index }]
    original_arr.forEach((item, index) => {
        const norm = normalizeTrackTitlesForMatching(item.trackText);
        originalMap[norm] = index;
        fuzzyList.push({ norm, index });
    });

    // 3) Walk through candidates
    for (let i = 0; i < candidate_arr.length; i++) {
        const cand = candidate_arr[i];
        if (cand.type !== "track" || !cand.trackText || cand.trackText === "?") {
            continue;
        }

        // Normalize candidate title
        const candNorm = normalizeTrackTitlesForMatching(cand.trackText);

        // 3a) Try exact lookup first
        let matchIndex = originalMap[candNorm];

        // 3b) If no exact match, try fuzzy
        if (matchIndex === undefined) {
            for (const entry of fuzzyList) {
                if ($.isTextSimilar(entry.norm, candNorm, similarityThreshold)) {
                    matchIndex = entry.index;
                    break;
                }
            }
        }

        if (matchIndex !== undefined) {
            // 4) Overwrite candidate’s trackText with the exact original
            cand.trackText = original_arr[matchIndex].trackText;

            // 5) Now merge using your original logic
            const orig = original_arr[matchIndex];
            if (cand.cue && !orig.cue) {
                orig.cue = cand.cue;
            }
            if (cand.label && !orig.label) {
                orig.label = cand.label;
            }

            // 6) Handle a following '?' track-cue patch
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

    return original_arr;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Diff functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

(function($){
    'use strict';

    // 1) HTML‑escape helper
    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m=>{
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
        });
    }

    // 2) Our diff engine: word‑level with char‑level fallback for modifications
    function diffText(oldStr, newStr) {
        const parts = Diff.diffWords(oldStr, newStr, { ignoreCase: true });
        let out = [];

        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];

            // a removed+added pair → character‑level diff
            if (p.removed && parts[i+1]?.added) {
                const chars = Diff.diffChars(p.value, parts[i+1].value, { ignoreCase: true });
                chars.forEach(c => {
                    const esc = escapeHtml(c.value);
                    if      (c.added)   out.push(`<span class="diff-added">${esc}</span>`);
                    else if (c.removed) out.push(`<span class="diff-removed">${esc}</span>`);
                    else                out.push(esc);
                });
                i++;  // skip the added part
            }
            else if (p.added) {
                out.push(`<span class="diff-added">${escapeHtml(p.value)}</span>`);
            }
            else if (p.removed) {
                out.push(`<span class="diff-removed">${escapeHtml(p.value)}</span>`);
            }
            else {
                out.push( escapeHtml(p.value) );
            }
        }

        return out.join('');
    }

    // 3) jQuery plugin to render the three outputs
    $.fn.showTracklistDiffs = function({ text1, text2, text3 }) {
        const t1 = text1.trim().split("\n"),
              t2 = text2.trim().split("\n"),
              t3 = text3.trim().split("\n"),
              $container = this.empty();

        // build the three HTML fragments
        // — Original
        const origHtml = [
            `<strong>Original</strong>`,
            `<pre>${ escapeHtml(text1) }</pre>`
        ].join("");

        // — Merge result (Text2 vs Text1), now ignoring "..." in either text1 or text2
        let diff2 = `<strong>Merge result</strong><pre>`;
        for (let i = 0; i < Math.max(t1.length, t2.length); i++) {
            const line1 = t1[i] || "";
            const line2 = t2[i] || "";

            // if either side is "..." → context only, no diff
            if (line1.trim() === "..." || line2.trim() === "...") {
                diff2 += escapeHtml(line2) + "\n";
            } else {
                diff2 += diffText(line1, line2) + "\n";
            }
        }
        diff2 += `</pre>`;


        // — Text3 vs Text2
        // build lookup for text2 by [ID]
        const map2 = {};
        t2.forEach(line => {
            const m = line.match(/^\s*#?\s*\[(\d+)\]\s*(.*)$/);
            if (m) map2[m[1]] = m[2];
        });

        let diff3 = `<strong>Candidate</strong><pre>`;
        for (let raw3 of t3) {
            const trimmed = raw3.trim();
            if (trimmed === "...") {
                diff3 += escapeHtml(raw3) + "\n";
                continue;
            }
            const m3 = raw3.match(/^\[(\d+)\]\s*(.*)$/);
            if (m3) {
                const id = m3[1],
                      b3 = m3[2],
                      b2 = map2[id] || "";

                if (b3.trim() === "?") {
                    diff3 += `<span class="diff-context">[${id}]</span> ${ escapeHtml(b3) }\n`;
                } else {
                    diff3 += `<span class="diff-context">[${id}]</span> ${ diffText(b2, b3) }\n`;
                }
            } else {
                diff3 += escapeHtml(raw3) + "\n";
            }
        }
        diff3 += `</pre>`;

        // now wrap all three fragments into a single row of td's
        const $tableCells = $(`<td>${ origHtml }</td>
            <td>${ diff2 }</td>
            <td>${ diff3 }</td>`);

        $container.append($tableCells);
        return this;
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
 * Run everything
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

        $("#diff").click(function(){
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