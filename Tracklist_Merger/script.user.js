// ==UserScript==
// @name         Tracklist Merger (Beta)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.08.25.5
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Merger/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Merger_10
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

function calcSimilarity(a, b) {
  var m = a.length, n = b.length;
  var dp = Array(m + 1);
  for (var i = 0; i <= m; i++) {
    dp[i] = Array(n + 1).fill(0);
  }
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      var cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  var maxLen = Math.max(m, n);
  return maxLen === 0 ? 1 : (maxLen - dp[m][n]) / maxLen;
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
    function findBestMatch(line, lines) {
      var base = splitTrackLine(line);
      var baseNorms = getTrackMatchNorms(base.text);
      var bestIdx = -1, bestScore = 0;
      for (var i = 0; i < lines.length; i++) {
        var other = splitTrackLine(lines[i]);
        var otherNorms = getTrackMatchNorms(other.text);
        for (var b = 0; b < baseNorms.length; b++) {
          for (var o = 0; o < otherNorms.length; o++) {
            var score = calcSimilarity(otherNorms[o], baseNorms[b]);
            if (score > bestScore) { bestScore = score; bestIdx = i; }
          }
        }
      }
      return { idx: bestIdx, score: bestScore };
    }
    $.fn.showTracklistDiffs = function(opts) {
      var text1 = opts.text1 || '';
      var text2 = opts.text2 || '';
      var text3 = opts.text3 || '';
      if (text1.slice(-1) !== '\n') { text1 += '\n'; }
      if (text2.slice(-1) !== '\n') { text2 += '\n'; }
      if (text3.slice(-1) !== '\n') { text3 += '\n'; }
      var lines1 = text1.split('\n');
      var lines2 = text2.split('\n');
      var lines3 = text3.split('\n');
      return this.each(function() {
        var $container = $(this).empty();
        var $row = $('<tr id="diffContainer">');

        // Column 1: Original vs Merged
        var html1 = lines1.map(function(line) {
          if (line === '') { return ''; }
          var p1 = splitTrackLine(line);
          if (p1.text === '?' || p1.text === '...') { return escapeHTML(line); }
          var match = findBestMatch(line, lines2);
          if (match.score === 0 || match.idx === -1) {
            return fullHighlight(line, 'diff-removed');
          }
          var p2 = splitTrackLine(lines2[match.idx]);
          var res = escapeHTML(p1.hash);
          var cueHtml = wordDiff(p1.cue, p2.cue, 'diff-removed'); if (cueHtml) res += cueHtml;
          res += wordDiff(p1.text, p2.text, 'diff-removed');
          var labelHtml = wordDiff(p1.label, p2.label, 'diff-removed'); if (labelHtml) res += labelHtml;
          return res;
        }).join('\n');
        $row.append($('<td>').append($('<pre>').html(html1)));

        // Column 2: Merged vs Original
        var html2 = lines2.map(function(line) {
          if (line === '') { return ''; }
          var p2 = splitTrackLine(line);
          if (p2.text === '?' || p2.text === '...') { return escapeHTML(line); }
          var match = findBestMatch(line, lines1);
          if (match.score === 0 || match.idx === -1) {
            return fullHighlight(line, 'diff-added');
          }
          var p1 = splitTrackLine(lines1[match.idx]);
          var res = escapeHTML(p2.hash);
          var cueHtml = wordDiff(p2.cue, p1.cue, 'diff-added'); if (cueHtml) res += cueHtml;
          res += wordDiff(p2.text, p1.text, 'diff-added');
          var labelHtml = wordDiff(p2.label, p1.label, 'diff-added'); if (labelHtml) res += labelHtml;
          return res;
        }).join('\n');
        $row.append($('<td>').append($('<pre>').html(html2)));

        // Column 3: Candidate vs Merged
        var html3 = lines3.map(function(line) {
          if (line === '') { return ''; }
          var p3 = splitTrackLine(line);
          if (p3.text === '?' || p3.text === '...') { return escapeHTML(line); }
          var match = findBestMatch(line, lines2);
          if (match.score === 0 || match.idx === -1) {
            return fullHighlight(line, 'diff-removed');
          }
          var p2 = splitTrackLine(lines2[match.idx]);
          var res = escapeHTML(p3.hash);
          var cueHtml = wordDiff(p3.cue, p2.cue, 'diff-removed'); if (cueHtml) res += cueHtml;
          res += wordDiff(p3.text, p2.text, 'diff-removed');
          var labelHtml = wordDiff(p3.label, p2.label, 'diff-removed'); if (labelHtml) res += labelHtml;
          return res;
        }).join('\n');
        $row.append($('<td>').append($('<pre>').html(html3)));

        $row.find('pre').each(function() {
          var $pre = $(this);
          if (!$pre.text().endsWith('\n')) { $pre.append('\n'); }
        });

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
        if( text1 === text2 ) {
            $("#diffContainer").html('<td colspan="3" class="identical-msg">The merged tracklist is identical to the original.</td>');
        } else {
            $('#diffContainer').showTracklistDiffs({ text1, text2, text3 });
            var pre = $('#diffContainer pre').first();
            if( pre.length ) {
                adjust_preHeights( pre );
            }
        }
    } else {
        $("#diffContainer td").remove();
    }
    adjust_columnWidths();
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

        $("#tl_original, #merge_result_tle, #tl_candidate").on('input', run_diff);
        run_diff();
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