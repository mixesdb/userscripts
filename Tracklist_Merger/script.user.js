// ==UserScript==
// @name         Tracklist Merger (Beta)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.05.29.3
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Merger_14
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/youtube_funcs.js?v-Tracklist_Merger_1
// @require      https://cdn.jsdelivr.net/npm/diff@5.2.0/dist/diff.min.js
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

var cacheVersion = 5,
    scriptName = "Tracklist_Merger";
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );

const tid_minGap = 3;
// Threshold for fuzzy matching when merging track titles
const similarityThreshold = 0.8;
// Wait only briefly after typing pauses before rebuilding the expensive diff view.
const diffInputDelay = 175;
// Keep diff-rendering work inside a short frame budget so large tracklists do
// not monopolize the main thread while users continue editing.
const diffRenderFrameBudget = 8;

function clearScheduledDiffWork(timerId) {
    if( !timerId ) { return; }
    if( window.cancelIdleCallback ) {
        window.cancelIdleCallback( timerId );
    } else {
        window.clearTimeout( timerId );
    }
}


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
    adjust_columnWidths();
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
        maxLines = 1,
        lineHeight = parseFloat( pres.css('line-height') ) * 1.1;

    if( isNaN( lineHeight ) ) {
        lineHeight = parseFloat( pres.css('font-size') ) * 1.2;
    }

    pres.css('height', '' );

    pres.each(function(){
        var text = $(this).text(),
            lines = text.split(/\r\n|\r|\n/).length;
        if( text.endsWith('\n') ) {
            lines--;
        }
        if( lines > maxLines ) {
            maxLines = lines;
        }
    });

    pres.height( Math.ceil( maxLines * lineHeight ) );
}

// Store current and manually adjusted column widths
var manualWidths = null,
    currentWidths = null;

function apply_columnWidths(widths) {
    var selectors = ['#tl_original', '#merge_result_tle', '#tl_candidate'];
    var tables = [ $(selectors[0]).closest('table')[0], $('#diffContainer').closest('table')[0] ]
        .filter(Boolean)
        .reduce(function(arr, t){ if( arr.indexOf(t) === -1 ) { arr.push(t); } return arr; }, [])
        .map(function(t){ return $(t); });

    tables.forEach(function($table){
        var $colgroup = $table.children('colgroup');
        if( !$colgroup.length ) {
            $colgroup = $('<colgroup></colgroup>').prependTo($table);
        }

        var $cols = $colgroup.children('col');
        widths.forEach(function(_, idx){
            if( !$cols.eq(idx).length ) {
                $colgroup.append('<col>');
            }
        });

        $colgroup.children('col').each(function(i){
            if( widths[i] !== undefined ) {
                $(this).css('width', widths[i] + '%');
            }
        });

        $table.css('table-layout', 'fixed');
        $table.find('td').css('width', '');
    });

    currentWidths = widths;
}

/*
 * adjust_columnWidths
 *
 * Calculate the maximum line length for each column across both the
 * textarea inputs and the diff <pre> elements. Columns with shorter
 * content get a smaller width so that space is distributed according to
 * the actual text length. The resulting widths are applied to the
 * corresponding columns of both the Inputs and Diff tables.
 */
function adjust_columnWidths() {
    var selectors = ['#tl_original', '#merge_result_tle', '#tl_candidate'],
        maxLens = [0, 0, 0];

    if( Array.isArray(manualWidths) ) {
        apply_columnWidths(manualWidths);
        update_columnDividers(manualWidths);
        return;
    }

    // Determine longest line per column from textareas and diff <pre>s
    selectors.forEach(function(sel, idx){
        var el = $(sel);
        if( el.length ) {
            el.val().split(/\r\n|\r|\n/).forEach(function(line){
                if( line.length > maxLens[idx] ) {
                    maxLens[idx] = line.length;
                }
            });
        }

        var pre = $('#diffContainer td').eq(idx).find('pre');
        if( pre.length ) {
            pre.text().split(/\r\n|\r|\n/).forEach(function(line){
                if( line.length > maxLens[idx] ) {
                    maxLens[idx] = line.length;
                }
            });
        }
    });

    var total = maxLens.reduce(function(a, b){ return a + b; }, 0);

    var tables = [ $(selectors[0]).closest('table')[0], $('#diffContainer').closest('table')[0] ]
        .filter(Boolean)
        .reduce(function(arr, t){ if( arr.indexOf(t) === -1 ) { arr.push(t); } return arr; }, [])
        .map(function(t){ return $(t); });

    if( total === 0 ) {
        tables.forEach(function($t){
            $t.children('colgroup').remove();
            $t.find('td').css('width', '');
        });

        return;
    }

    var MIN_WIDTH = 22, // percentage
        emptyCount = 0,
        nonEmptyTotal = 0;

    maxLens.forEach(function(len){
        if( len === 0 ) {
            emptyCount++;
        } else {
            nonEmptyTotal += len;
        }
    });

    var remaining = 100 - MIN_WIDTH * emptyCount;

    var widths = maxLens.map(function(len){
        return len === 0 ? MIN_WIDTH : remaining * len / nonEmptyTotal;
    });

    apply_columnWidths(widths);
    update_columnDividers(widths);
}

function update_columnDividers(widths){
    var $wrapper = $("#tracklistMerger-wrapper");
    if( !$wrapper.length ) { return; }

    var ids = ['tm-divider-1','tm-divider-2'];
    ids.forEach(function(id, i){
        var $div = $wrapper.find('#'+id);
        if( !$div.length ) {
            $div = $('<div class="column-divider" id="'+id+'"></div>').appendTo($wrapper);
            $div.data('index', i);
        }
    });

    var totalWidth = $wrapper.width();
    $wrapper.find('#'+ids[0]).css('left', (widths[0]/100*totalWidth) + 'px');
    $wrapper.find('#'+ids[1]).css('left', ((widths[0]+widths[1])/100*totalWidth) + 'px');

    var $textareas = $wrapper.find('textarea');
    if( !$textareas.length ) { return; }
    var $startRow = $textareas.first().closest('tr');
    var $pres = $wrapper.find('#diffContainer pre');
    var $endRow = $pres.length ? $pres.last().closest('tr') : $textareas.last().closest('tr');
    var top = $startRow.position().top;
    var height = $endRow.position().top + $endRow.outerHeight() - top;
    $wrapper.find('.column-divider').css({ top: top + 'px', height: height + 'px' });
}

function init_columnDividerEvents(){
    var $wrapper = $("#tracklistMerger-wrapper");
    $wrapper.on('mousedown', '.column-divider', function(e){
        var idx = $(this).data('index');
        var startX = e.pageX;
        var start = (manualWidths || currentWidths || [33,34,33]).slice();
        var totalWidth = $wrapper.width();
        $(document).on('mousemove.tmResize', function(ev){
            var delta = (ev.pageX - startX) / totalWidth * 100;
            var newWidths = start.slice();
            newWidths[idx] += delta;
            newWidths[idx+1] -= delta;
            var MIN = 5;
            if( newWidths[idx] < MIN ) { newWidths[idx] = MIN; newWidths[idx+1] = start[idx]+start[idx+1]-MIN; }
            if( newWidths[idx+1] < MIN ) { newWidths[idx+1] = MIN; newWidths[idx] = start[idx]+start[idx+1]-MIN; }
            manualWidths = newWidths;
            apply_columnWidths(newWidths);
            update_columnDividers(newWidths);
        });
        $(document).on('mouseup.tmResize', function(){
            $(document).off('.tmResize');
        });
        e.preventDefault();
    });

    // Recalculate divider positions on window resize
    $(window).on('resize.tmDivider', function(){
        var widths = manualWidths || currentWidths;
        if( widths ) {
            update_columnDividers(widths);
        }
    });
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
            artistsArr = artistsArr.map(a => a.trim()).sort((a, b) => a.localeCompare(b));
            artists = artistsArr.join(" & ");
        }
        var normArtists = artists.toLowerCase();

        title = title.replace(/\(([^)]+)\)/g, function(match, p1) {
            var normP1 = p1
                .replace(/\s*(?:Ft|Feat\.?|Featuring|Pres\.?|Presents|\baka\b)\s+/gi, " & ")
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
            .replace(/\s*(?:Ft|Feat\.?|Featuring|Pres\.?|Presents|\baka\b)\s+/gi, " & ")
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
    const fuzzyList     = []; // [{ norm, item, len, head }]
    const fuzzyBuckets  = {}; // first-char → fuzzyList entries
    const fuzzyByLen    = []; // array grouped by norm length
    const similarityCache = {}; // "a||b" -> bool
    const originalHasGaps = original_arr.some(item => item.type === "gap" || item.trackText === "?");

    original_arr.forEach(item => {
        if (item.type === "track") {
            const norms = getTrackMatchNorms(item.trackText);
            norms.forEach(norm => {
                originalMap[norm] = item;
                const entry = { norm, item, len: norm.length, head: norm.charAt(0) };
                fuzzyList.push(entry);

                if (!fuzzyBuckets[entry.head]) {
                    fuzzyBuckets[entry.head] = [];
                }
                fuzzyBuckets[entry.head].push(entry);

                if (!fuzzyByLen[entry.len]) {
                    fuzzyByLen[entry.len] = [];
                }
                fuzzyByLen[entry.len].push(entry);
            });
        }
    });

    function isLikelySimilarText(normA, normB, threshold) {
        if (normA === normB) {
            return true;
        }

        const key = normA < normB ? (normA + "||" + normB) : (normB + "||" + normA);
        if (similarityCache.hasOwnProperty(key)) {
            return similarityCache[key];
        }

        const lenA = normA.length;
        const lenB = normB.length;
        const maxLen = Math.max(lenA, lenB);
        const allowedEdits = Math.floor((1 - threshold) * maxLen);
        if (Math.abs(lenA - lenB) > allowedEdits) {
            similarityCache[key] = false;
            return false;
        }

        const result = $.isTextSimilar(normA, normB, threshold);
        similarityCache[key] = result;
        return result;
    }

    function getFuzzyCandidates(candNorm) {
        const len = candNorm.length;
        const head = candNorm.charAt(0);
        let pool = fuzzyBuckets[head] || fuzzyList;
        const nearbyLenPool = [];

        // Pull only nearby lengths. At threshold=0.8, strings with huge length
        // differences can never match, so we avoid expensive Levenshtein calls.
        for (let l = Math.max(0, len - 6); l <= len + 6; l++) {
            if (fuzzyByLen[l]) {
                nearbyLenPool.push.apply(nearbyLenPool, fuzzyByLen[l]);
            }
        }

        if (nearbyLenPool.length && nearbyLenPool.length < pool.length) {
            pool = nearbyLenPool;
        }
        return pool;
    }

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
                    const fuzzyCandidates = getFuzzyCandidates(candNorm);
                    for (const entry of fuzzyCandidates) {
                        if (isLikelySimilarText(entry.norm, candNorm, similarityThreshold)) {
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

function calcSimilarity(a, b) {
  var m = a.length, n = b.length;
  var maxLen = Math.max(m, n);
  if (maxLen === 0) { return 1; }

  // Keep only the previous/current Levenshtein rows instead of an m*n matrix.
  // Diff rendering calls this many times, so avoiding repeated large matrix
  // allocations makes textarea input noticeably more responsive.
  var prev = Array(n + 1), curr = Array(n + 1);
  for (var j = 0; j <= n; j++) { prev[j] = j; }

  for (var i = 1; i <= m; i++) {
    curr[0] = i;
    for (var j = 1; j <= n; j++) {
      var cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    var tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return (maxLen - prev[n]) / maxLen;
}

// New diff logic
(function($) {
    function escapeHTML(s) { return $('<div>').text(s).html(); }
    function highlightWords(val, cls) {
      if (!val) return '';
      if (/^\s+$/.test(val)) return escapeHTML(val);
      var m = val.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return escapeHTML(m[1]) + '<span class="' + cls + '">' + escapeHTML(m[2]) + '</span>' + escapeHTML(m[3]);
    }
    function splitTrackLine(line) {
      var hash = '', cue = '', label = '', rest = line;
      if (rest.startsWith('# ')) {
        hash = '# ';
        rest = rest.slice(2);
      }
      var cueMatch = rest.match(/^(\s*\[[^\]]+\]\s*)/);
      if (cueMatch) {
        cue = cueMatch[0];
        rest = rest.slice(cueMatch[0].length);
      }
      var labelMatch = rest.match(/(\s*\[[^\]]+\]\s*)$/);
      if (labelMatch) {
        label = labelMatch[0];
        rest = rest.slice(0, rest.length - labelMatch[0].length);
      }
      return { hash: hash, cue: cue, text: rest, label: label };
    }
    function charDiff(segBase, segOther, cls) {
      var parts = Diff.diffChars(segOther, segBase);
      var res = '';
      parts.forEach(function(p) {
        if (p.added) {
          res += highlightWords(p.value, cls);
        } else if (!p.removed) {
          res += escapeHTML(p.value);
        }
      });
      return res;
    }
    function wordDiff(base, other, cls) {
      var parts = Diff.diffWordsWithSpace(other, base);
      var res = '';
      for (var i = 0; i < parts.length; ) {
        var p = parts[i];
        var next = parts[i + 1];

        // Handle swapped order: added followed by removed
        if (p.added && next && next.removed && !/\s/.test(p.value) && !/\s/.test(next.value)) {
          if (p.value.toLowerCase() === next.value.toLowerCase()) {
            res += escapeHTML(p.value);
          } else {
            res += highlightWords(p.value, cls);
          }
          i += 2;
          continue;
        }

        // Handle original order: removed followed by added
        if (p.removed && next && next.added && !/\s/.test(p.value) && !/\s/.test(next.value)) {
          if (next.value.toLowerCase() === p.value.toLowerCase()) {
            res += escapeHTML(next.value);
          } else {
            res += highlightWords(next.value, cls);
          }
          i += 2;
          continue;
        }

        if (p.added) {
          res += highlightWords(p.value, cls);
        } else if (!p.removed) {
          res += escapeHTML(p.value);
        }
        i++;
      }
      return res;
    }
    function fullHighlight(line, cls) {
      var p = splitTrackLine(line);
      var res = escapeHTML(p.hash);
      if (p.cue)   res += highlightWords(p.cue, cls);
      res += highlightWords(p.text, cls);
      if (p.label) res += highlightWords(p.label, cls);
      return res;
    }
    function buildTrackLineEntries(lines) {
      return lines.map(function(line) {
        var parts = splitTrackLine(line);
        return {
          line: line,
          parts: parts,
          norms: getTrackMatchNorms(parts.text)
        };
      });
    }
    function buildMatchContext(entries) {
      var exact = Object.create(null);
      var flattened = [];

      entries.forEach(function(entry, idx) {
        entry.norms.forEach(function(norm) {
          if (!norm) { return; }
          if (exact[norm] === undefined) { exact[norm] = idx; }
          flattened.push({ norm: norm, length: norm.length, idx: idx });
        });
      });

      return { entries: entries, exact: exact, flattened: flattened };
    }
    function findBestMatchEntry(baseEntry, targetContext) {
      var baseNorms = baseEntry.norms;
      var bestIdx = -1, bestScore = 0;

      for (var b = 0; b < baseNorms.length; b++) {
        var baseNorm = baseNorms[b];
        if (baseNorm && targetContext.exact[baseNorm] !== undefined) {
          return { idx: targetContext.exact[baseNorm], score: 1 };
        }
      }

      for (var i = 0; i < targetContext.flattened.length; i++) {
        var other = targetContext.flattened[i];
        for (var b = 0; b < baseNorms.length; b++) {
          var base = baseNorms[b];
          var maxLen = Math.max(other.length, base.length);
          if (maxLen === 0) { continue; }

          // The best possible Levenshtein similarity cannot exceed the length
          // ratio. Skip comparisons that cannot improve the current match.
          if ((Math.min(other.length, base.length) / maxLen) <= bestScore) {
            continue;
          }

          var score = calcSimilarity(other.norm, base);
          if (score > bestScore) {
            bestScore = score;
            bestIdx = other.idx;
            if (bestScore === 1) { return { idx: bestIdx, score: bestScore }; }
          }
        }
      }
      return { idx: bestIdx, score: bestScore };
    }
    function renderDiffLine(entry, targetContext, cls) {
      if (entry.line === '') { return ''; }
      if (entry.parts.text === '?' || entry.parts.text === '...') { return escapeHTML(entry.line); }

      var match = findBestMatchEntry(entry, targetContext);
      if (match.score === 0 || match.idx === -1) {
        return fullHighlight(entry.line, cls);
      }

      var target = targetContext.entries[match.idx].parts;
      var res = escapeHTML(entry.parts.hash);
      var cueHtml = wordDiff(entry.parts.cue, target.cue, cls); if (cueHtml) res += cueHtml;
      res += wordDiff(entry.parts.text, target.text, cls);
      var labelHtml = wordDiff(entry.parts.label, target.label, cls); if (labelHtml) res += labelHtml;
      return res;
    }
    function scheduleDiffWork(callback) {
      if (window.requestIdleCallback) {
        return window.requestIdleCallback(callback, { timeout: 250 });
      }
      return window.setTimeout(function() {
        callback({
          timeRemaining: function() { return diffRenderFrameBudget; },
          didTimeout: true
        });
      }, 16);
    }
    $.fn.showTracklistDiffs = function(opts) {
      var text1 = opts.text1 || '';
      var text2 = opts.text2 || '';
      var text3 = opts.text3 || '';
      var jobId = opts.jobId;
      var isCurrent = opts.isCurrent || function(){ return true; };
      var onComplete = opts.onComplete || function(){};
      var setTimer = opts.setTimer || function(){};
      if (text1.slice(-1) !== '\n') { text1 += '\n'; }
      if (text2.slice(-1) !== '\n') { text2 += '\n'; }
      if (text3.slice(-1) !== '\n') { text3 += '\n'; }

      var entries1 = buildTrackLineEntries(text1.split('\n'));
      var entries2 = buildTrackLineEntries(text2.split('\n'));
      var entries3 = buildTrackLineEntries(text3.split('\n'));
      var context1 = buildMatchContext(entries1);
      var context2 = buildMatchContext(entries2);

      return this.each(function() {
        var container = this;
        var columns = [
          { source: entries1, target: context2, cls: 'diff-removed', html: [], index: 0 },
          { source: entries2, target: context1, cls: 'diff-added', html: [], index: 0 },
          { source: entries3, target: context2, cls: 'diff-removed', html: [], index: 0 }
        ];
        var columnIndex = 0;

        function renderChunk(deadline) {
          if (!isCurrent(jobId)) { return; }

          var startedAt = Date.now();
          function hasFrameBudget() {
            if (deadline && !deadline.didTimeout && deadline.timeRemaining) {
              return deadline.timeRemaining() > 1;
            }
            return Date.now() - startedAt < diffRenderFrameBudget;
          }

          do {
            var column = columns[columnIndex];
            column.html.push(renderDiffLine(column.source[column.index], column.target, column.cls));
            column.index++;

            if (!isCurrent(jobId)) { return; }
            if (column.index >= column.source.length) {
              columnIndex++;
            }
          } while (columnIndex < columns.length && hasFrameBudget());

          if (columnIndex < columns.length) {
            setTimer(scheduleDiffWork(renderChunk));
            return;
          }

          var $row = $('<tr id="diffContainer">');
          columns.forEach(function(column) {
            $row.append($('<td>').append($('<pre>').html(column.html.join('\n'))));
          });
          $row.find('pre').each(function() {
            var $pre = $(this);
            if (!$pre.text().endsWith('\n')) { $pre.append('\n'); }
          });

          if (isCurrent(jobId)) {
            $(container).replaceWith($row);
            onComplete();
          }
        }

        setTimer(scheduleDiffWork(renderChunk));
      });
    };
  })(jQuery);


/*
 * run_diff
 */
var diffInputTimer = null,
    diffRenderTimer = null,
    diffRenderJobId = 0;

function cancel_diff_render() {
    diffRenderJobId++;
    if( diffRenderTimer ) {
        clearScheduledDiffWork( diffRenderTimer );
        diffRenderTimer = null;
    }
}

function schedule_run_diff() {
    if( diffInputTimer ) {
        clearTimeout( diffInputTimer );
    }

    // Stop any in-progress chunked diff immediately. Without this, a large
    // stale render can continue to consume the main thread while editing the
    // merged TLE textarea.
    cancel_diff_render();

    diffInputTimer = setTimeout(function(){
        diffInputTimer = null;
        run_diff();
    }, diffInputDelay );
}

function run_diff() {
    if( diffInputTimer ) {
        clearTimeout( diffInputTimer );
        diffInputTimer = null;
    }
    cancel_diff_render();

    var text1 = $("#tl_original").val(),
        text2 = $("#merge_result_tle").val(),
        text3 = $("#tl_candidate").val(),
        jobId = diffRenderJobId;

    if( text1 && text2 && text3 ) {
        if( text1 === text2 ) {
            $("#diffContainer").html('<td colspan="3" class="identical-msg">The merged tracklist is identical to the original.</td>');
            adjust_columnWidths();
        } else {
            $('#diffContainer').showTracklistDiffs({
                text1: text1,
                text2: text2,
                text3: text3,
                jobId: jobId,
                isCurrent: function(id){ return id === diffRenderJobId; },
                setTimer: function(timerId){ diffRenderTimer = timerId; },
                onComplete: function(){
                    diffRenderTimer = null;
                    var pre = $('#diffContainer pre').first();
                    if( pre.length ) {
                        adjust_preHeights( pre );
                    }
                    adjust_columnWidths();
                }
            });
        }
    } else {
        $("#diffContainer td").remove();
        adjust_columnWidths();
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
 * getCueFormat
 * Detect cue format from the first numeric cue in a tracklist array.
 */
function getCueFormat(tl_arr) {
    for( var i = 0; i < tl_arr.length; i++ ) {
        var cue = tl_arr[i].cue;
        if( !cue || !/^\d+(:\d+)?$/.test(cue) ) { continue; }

        if( cue.includes(':') ) {
            var parts = cue.split(':');
            return {
                hasColon: true,
                minDigits: parts[0].length,
                secDigits: parts[1].length
            };
        }

        return {
            hasColon: false,
            cueDigits: cue.length
        };
    }
    return null;
}

/*
 * normalizeCueToFormat
 * Convert a cue string to the target cue format.
 */
function normalizeCueToFormat(cue, format, options) {
    if( !cue || !format || !/^\d+(:\d+)?$/.test(cue) ) { return cue; }
    options = options || {};

    if( format.hasColon ) {
        // Special case: original uses H:MM (e.g. "0:06"), candidate uses bare MM
        // (e.g. "06"). In that case, keep the original prefix ("0") and map the
        // candidate number to the second component ("0:06"), not "6:00".
        if( !cue.includes(':') && options.bareAsSecondComponent ) {
            var secondValue = parseInt(cue, 10);
            var prefix = String(options.defaultPrefix || "0");
            return prefix.padStart(format.minDigits, '0') + ":" + String(secondValue).padStart(format.secDigits, '0');
        }

        var totalSeconds = cue.includes(':') ? durToSec_MS(cue) : parseInt(cue, 10) * 60;
        var mins = Math.floor(totalSeconds / 60),
            secs = Math.round(totalSeconds % 60);
        return String(mins).padStart(format.minDigits, '0') + ":" + String(secs).padStart(format.secDigits, '0');
    }

    var minsOnly = cue.includes(':')
        ? parseInt(cue.split(':')[0], 10) * 60 + parseInt(cue.split(':')[1], 10)
        : parseInt(cue, 10);
    return String(minsOnly).padStart(format.cueDigits, '0');
}

/*
 * normalizeTracklistCueFormat
 * Normalize all candidate numeric cues to the original cue format.
 */
function normalizeTracklistCueFormat(tl_arr, targetFormat, options) {
    if( !targetFormat ) { return tl_arr; }
    tl_arr.forEach(function(item){
        if( item.type === "track" && item.cue ) {
            item.cue = normalizeCueToFormat(item.cue, targetFormat, options);
        }
    });
    return tl_arr;
}

/*
 * run_merge
 */
function run_merge( showDebug=false ) {
    var tl_original = $("#tl_original").val(),
        tl_candidate = $("#tl_candidate").val(),
        tl_original_arr  = make_tlArr( tl_original ),
        tl_candidate_arr = make_tlArr( tl_candidate );

    // Normalize candidate cues to the original cue format before merging.
    var originalCueFormat = getCueFormat(tl_original_arr);
    var originalFirstCuePrefix = "0";
    if( originalCueFormat && originalCueFormat.hasColon ) {
        var firstColonCueItem = tl_original_arr.find(function(item){
            return item.type === "track" && item.cue && item.cue.includes(':');
        });
        if( firstColonCueItem ) {
            originalFirstCuePrefix = firstColonCueItem.cue.split(':')[0];
        }
    }

    var candidateCueNormalizationOptions = {
        bareAsSecondComponent: !!(originalCueFormat && originalCueFormat.hasColon),
        defaultPrefix: originalFirstCuePrefix
    };
    normalizeTracklistCueFormat(tl_candidate_arr, originalCueFormat, candidateCueNormalizationOptions);

    tl_original_arr  = addCueDiffs( tl_original_arr );
    tl_candidate_arr = addCueDiffs( tl_candidate_arr );

    $("#tl_original_arr").val(  "var tl_original_arr = "  + JSON.stringify( tl_original_arr, null, 2 )  + ";" );
    $("#tl_candidate_arr").val( "var tl_candidate_arr = " + JSON.stringify( tl_candidate_arr, null, 2 ) + ";" );

    // Merge
    var tl_merged_arr = mergeTracklists( tl_original_arr, tl_candidate_arr );

    // Keep merged cues in original format.
    normalizeTracklistCueFormat(tl_merged_arr, originalCueFormat, candidateCueNormalizationOptions);

    // If the merged list uses MM:SS cues, normalize unknown/missing cues
    // to "X:??" where X is the last known minute prefix.
    var mergedHasColon = tl_merged_arr.some(item => item.type === "track" && item.cue && item.cue.includes(':'));
    if( mergedHasColon ) {
        var lastCuePrefix = "0";
        tl_merged_arr.forEach(function(item){
            if( item.type !== "track" ) return;

            if( !item.cue || (typeof item.cue === "string" && item.cue.trim() === "??") ) {
                item.cue = lastCuePrefix + ":??";
                return;
            }

            if( item.cue && item.cue.includes(':') ) {
                var cuePrefix = item.cue.split(':')[0];
                if( /^\d+$/.test(cuePrefix) ) {
                    lastCuePrefix = cuePrefix;
                }
            }
        });
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
        init_columnDividerEvents();

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

        $("#tl_original, #merge_result_tle, #tl_candidate").on('input', schedule_run_diff);
        run_diff();
    });
}


/*
 * On TID
 */
if( domain == "trackid.net" ) {
    function add_mergeLink( $topInfo, mergeLink ) {
        var $mergeLi = $topInfo.children('#mergeLink');

        if( !$mergeLi.length ) {
            $mergeLi = $('<li id="mergeLink"></li>').append( mergeLink );
        }

        var $cueSwitch = $topInfo.children('li.info_switchCueFormat').first();

        if( $cueSwitch.length ) {
            $cueSwitch.after( $mergeLi );
        } else {
            $topInfo.prepend( $mergeLi );
        }
    }

    // create merge link under tracklists
    waitForKeyElements("ul#tlEditor-feedback-topInfo", function( jNode ) {
        var mergeLink = '<a href="https://www.mixesdb.com/w/MixesDB:Tests/Tracklist_Merger" target="_blank" rel="noopener">Open in Tracklist Merger</a>';

        add_mergeLink( jNode, mergeLink );
    });

    $(document).on('click', '#mergeLink a', function() {
        var tl_candidate = $("textarea.mixesdb-TLbox").val() || '';
        this.href = "https://www.mixesdb.com/w/MixesDB:Tests/Tracklist_Merger?tl_candidate=" + encodeURIComponent( tl_candidate );
    });

    waitForKeyElements("ul#tlEditor-feedback-topInfo li.info_switchCueFormat", function( jNode ) {
        var $topInfo = jNode.closest('ul#tlEditor-feedback-topInfo'),
            $mergeLi = $topInfo.children('#mergeLink');

        if( $topInfo.length && $mergeLi.length ) {
            jNode.after( $mergeLi );
        }
    });
}
