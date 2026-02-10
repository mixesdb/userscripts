// ==UserScript==
// @name         Tracklist Cue Switcher (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.10.4
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Cue_Switcher_1
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 1,
    scriptName = "Tracklist_Cue_Switcher";

//loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Cue format conversion with '?' support
 *
 * Converts between:
 * - MM* minutes-only cues (2-3 chars, digits and '?', e.g. "7?", "07?", "0??", "00?")
 * - h:mm cues (hours can be 1-2 chars, minutes always 2 chars, digits and '?', e.g. "1:1?", "0:0?", "?:??")
 * - h:mm:ss cues (optional; mainly to convert to MM*, e.g. "0:??:??" -> "0??")
 *
 * Strategy:
 * - Parse cue into a numeric RANGE (min/max) in minutes (or seconds for h:mm:ss).
 * - Render the target format as a PATTERN by checking which digits are stable across the range.
 *
 * Important:
 * - This assumes the underlying value set forms a contiguous range, which is true for typical '?' placeholders.
 * - When converting h:mm:ss -> MM*, we use floor(totalSeconds/60) range.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// ─────────────────────────────────────────────────────────────
// Examples (your exact ones)
// ─────────────────────────────────────────────────────────────
// "00?"     -> "0:0?"
// "07?"     -> "1:1?"
// "0:??:??" -> "0??"
// "1:1?"    -> "7?"
//
// console.log(toggleCue_MM_HMM("00?"));
// console.log(toggleCue_MM_HMM("07?"));
// console.log(toggleCue_MM_HMM("0:??:??"));
// console.log(toggleCue_MM_HMM("1:1?"));

// ─────────────────────────────────────────────────────────────
// Internal helpers for '?' math
// ─────────────────────────────────────────────────────────────

// Convert a token like "07?", "0??", "??" into min/max integers.
// Example: "07?" -> {min: 70, max: 79}
// Bounds are optional. If provided, clamp into [minBound..maxBound].
function tokenToMinMax(token, minBound, maxBound) {
    var t = String(token).trim();

    if (!/^[0-9\?]+$/.test(t)) return null;

    var minStr = t.replace(/\?/g, "0");
    var maxStr = t.replace(/\?/g, "9");

    var min = parseInt(minStr, 10);
    var max = parseInt(maxStr, 10);

    if (isNaN(min) || isNaN(max)) return null;

    if (minBound != null) {
        if (min < minBound) min = minBound;
        if (max < minBound) max = minBound;
    }
    if (maxBound != null) {
        if (min > maxBound) min = maxBound;
        if (max > maxBound) max = maxBound;
    }

    // If clamping inverted the range (weird input), fix it
    if (min > max) {
        var tmp = min;
        min = max;
        max = tmp;
    }

    return { min: min, max: max };
}

// Render a contiguous integer range [min..max] as a pattern with digits / '?'.
// width: number of digits to render
// forcePad: if true, left-pad with zeros to width before patterning
//
// Example:
// rangeToPattern(70, 79, 2, false) -> "7?"
// rangeToPattern(0, 59, 3, true)  -> "0??"
function rangeToPattern(min, max, width, forcePad) {
    min = Math.floor(min);
    max = Math.floor(max);

    // Ensure sane ordering
    if (min > max) {
        var tmp = min;
        min = max;
        max = tmp;
    }

    // For padding comparisons, treat numbers as width-digit with leading zeros (if forcePad)
    function asWidthString(n) {
        var s = String(n);
        if (forcePad) {
            s = pad(s, width);
        }
        return s;
    }

    // If not forcing pad and width is just "minimum", we still want consistent digit positions.
    // So we still compare using a padded version when width is given.
    var minS = pad(String(min), width);
    var maxS = pad(String(max), width);

    // Decide each digit: fixed if that digit can't change within the range at that position.
    // This works for contiguous ranges.
    var out = "";
    for (var i = 0; i < width; i++) {
        var place = Math.pow(10, (width - 1 - i)); // e.g. width=3: 100, 10, 1

        var minBlock = Math.floor(min / place);
        var maxBlock = Math.floor(max / place);

        if (minBlock === maxBlock) {
            // digit is stable
            out += minS.charAt(i);
        } else {
            out += "?";
        }
    }

    // If not forcing pad, allow trimming leading zeros where they are truly just padding.
    // BUT keep at least 1 char.
    if (!forcePad) {
        out = out.replace(/^0+(?=\d|\?)/, "");
        if (out === "") out = "0";
    }

    return out;
}

// Decide minutes-only output width for a minute range.
// Rules derived from your examples:
// - From h:mm:ss -> minutes-only: ALWAYS 3 digits (e.g. 0..59 => "0??")
// - From h:mm -> minutes-only: 2 digits if <100 else 3 (e.g. 70..79 => "7?")
// - From minutes-only input: keep its original width (2 or 3)
function decideMinutesOnlyWidth(minMinutes, maxMinutes, context) {
    // context: "FROM_HMS" | "FROM_HMM" | "FROM_MM"
    if (context === "FROM_HMS") return 3;

    if (context === "FROM_MM") {
        // caller should pass original width; fallback:
        return (maxMinutes >= 100) ? 3 : 2;
    }

    // FROM_HMM
    return (maxMinutes >= 100) ? 3 : 2;
}

// ─────────────────────────────────────────────────────────────
// Parse cue into a minute-range
// Supports:
// - MM*: "NN", "NNN", with '?' allowed: "7?", "07?", "0??", "00?"
// - h:mm: "H:MM", hours can have '?' and multiple digits; minutes exactly 2 with '?' allowed
// - h:mm:ss / hh:mm:ss: mainly for converting to MM*, supports '?' in mm/ss
//
// Returns:
// { type, minMinutes, maxMinutes, mmWidth }
// type: "MM" | "HMM" | "HMS" | "INVALID"
// mmWidth: original minutes-only width (2 or 3) if type==="MM"
// ─────────────────────────────────────────────────────────────
function cueToMinuteRange(cue) {
    var s = String(cue).trim();

    // Minutes-only cue: 2-3 chars digits/? (allow longer, but you asked NN/NNN-ish)
    if (/^[0-9\?]{2,3}$/.test(s)) {
        var mm = tokenToMinMax(s, 0, 999);
        if (!mm) return { type: "INVALID" };

        return {
            type: "MM",
            minMinutes: mm.min,
            maxMinutes: mm.max,
            mmWidth: s.length
        };
    }

    // h:mm:ss or hh:mm:ss (with '?' allowed)
    if (/^[0-9\?]{1,2}:[0-9\?]{2}:[0-9\?]{2}$/.test(s)) {
        var parts = s.split(":");
        var hh = tokenToMinMax(parts[0], 0, 99);
        var mm2 = tokenToMinMax(parts[1], 0, 59);
        var ss2 = tokenToMinMax(parts[2], 0, 59);

        if (!hh || !mm2 || !ss2) return { type: "INVALID" };

        // total seconds range
        var minSec = (hh.min * 3600) + (mm2.min * 60) + ss2.min;
        var maxSec = (hh.max * 3600) + (mm2.max * 60) + ss2.max;

        // Convert to minute range via floor(sec/60)
        var minMinutes = Math.floor(minSec / 60);
        var maxMinutes = Math.floor(maxSec / 60);

        return {
            type: "HMS",
            minMinutes: minMinutes,
            maxMinutes: maxMinutes,
            mmWidth: null
        };
    }

    // h:mm (with '?' allowed), minutes exactly 2
    if (/^[0-9\?]{1,2}:[0-9\?]{2}$/.test(s)) {
        var p = s.split(":");
        var h = tokenToMinMax(p[0], 0, 99);
        var m = tokenToMinMax(p[1], 0, 59);

        if (!h || !m) return { type: "INVALID" };

        var minMinutes2 = (h.min * 60) + m.min;
        var maxMinutes2 = (h.max * 60) + m.max;

        return {
            type: "HMM",
            minMinutes: minMinutes2,
            maxMinutes: maxMinutes2,
            mmWidth: null
        };
    }

    return { type: "INVALID" };
}

// ─────────────────────────────────────────────────────────────
// Convert a minute-range to h:mm pattern
// Minutes portion always 2 chars (digits/?), like your examples "0:0?","1:1?"
// ─────────────────────────────────────────────────────────────
function minuteRangeToHMM(minMinutes, maxMinutes) {
    // Hour range
    var minH = Math.floor(minMinutes / 60);
    var maxH = Math.floor(maxMinutes / 60);

    // Minutes within hour:
    // If hour is stable, we can restrict minute range to that hour.
    // If hour can vary, minutes become "??" because we can't guarantee a single hour bucket.
    var mmMin, mmMax;

    if (minH === maxH) {
        mmMin = minMinutes % 60;
        mmMax = maxMinutes % 60;
    } else {
        mmMin = 0;
        mmMax = 59;
    }

    // Render hour as either fixed or '?'
    // (If you ever need multi-digit hour patterns like "1?" you can extend this easily.)
    var hPart = (minH === maxH) ? String(minH) : "?";

    // Render minutes as 2-digit pattern (forcePad=true)
    var mPart = rangeToPattern(mmMin, mmMax, 2, true);

    return hPart + ":" + mPart;
}

// ─────────────────────────────────────────────────────────────
// Convert a minute-range to minutes-only pattern (MM*)
// Context controls width and padding behavior.
// ─────────────────────────────────────────────────────────────
function minuteRangeToMM(minMinutes, maxMinutes, context, originalWidth) {
    var width;

    if (context === "FROM_MM" && (originalWidth === 2 || originalWidth === 3)) {
        width = originalWidth;
    } else {
        width = decideMinutesOnlyWidth(minMinutes, maxMinutes, context);
    }

    // For width=3, forcePad true so we can get "0??" instead of "??" for small ranges.
    // For width=2, do not force pad so "70..79" becomes "7?" not "7?" with weird trimming.
    var forcePad = (width === 3);

    return rangeToPattern(minMinutes, maxMinutes, width, forcePad);
}

// ─────────────────────────────────────────────────────────────
// Public: toggle between minutes-only (MM*) and h:mm
// - If input is MM* -> output h:mm
// - If input is h:mm -> output MM*
// - If input is h:mm:ss -> output MM* (because that's what you asked: "0:??:?? > 0??")
// - INVALID returns original string
// ─────────────────────────────────────────────────────────────
function toggleCue_MM_HMM(cue) {
    var s = String(cue).trim();
    if (!s) return s;

    var r = cueToMinuteRange(s);

    if (r.type === "MM") {
        return minuteRangeToHMM(r.minMinutes, r.maxMinutes);
    }

    if (r.type === "HMM") {
        return minuteRangeToMM(r.minMinutes, r.maxMinutes, "FROM_HMM", null);
    }

    if (r.type === "HMS") {
        return minuteRangeToMM(r.minMinutes, r.maxMinutes, "FROM_HMS", null);
    }

    // INVALID
    return s;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist cue switcher funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// getCue(track)
function getCue(track) {
    if (track == null) return null;

    var s = String(track).trim();
    if (!s) return null;

    var m = s.match(/^\[\s*([0-9\?:]+)\s*\]/);
    if (!m) return null;

    return m[1];
}

function getTrackCue(trackEl) {
    var textNode = getFirstDirectTextNode(trackEl);
    if (textNode && textNode.nodeValue != null) {
        var cue = getCue(textNode.nodeValue);
        if (cue != null) return cue;
    }

    // Fallback: full text can still contain a cue when DOM differs.
    return getCue($(trackEl).text());
}

// getCueFormatKey
function getCueFormatKey(cueOrTrackText) {
    var cue = getCue(cueOrTrackText) || String(cueOrTrackText || "").trim();
    if (!cue) return null;

    // Allowed cue patterns (anchored to full cue)
    // Note: We classify by returning explicit keys, not raw cue strings,
    // so "03" and "99" both become "NN".
    //
    // Unknowns:
    // - "??" / "???" / "0??" / "03?" / "1?" etc
    // - "?:??" / "??:??" / "0:??:??" / "??:??:??" etc

    // 3-part timecode: NN:NN:NN OR N:NN:NN, with ? allowed in positions
    // First part: either 1 digit or 2 digits or 1/? or 2/?s combos.
    // We'll keep it simple and explicit via separate regexes and keys.

    // Pure unknown fixed-width numeric
    if (/^\?{2}$/.test(cue)) return "??";
    if (/^\?{3}$/.test(cue)) return "???";

    // Numeric with unknowns (2 or 3 chars, digits and ?)
    // Examples: "1?", "03?", "0??", "??", "???"
    if (/^[0-9\?]{2}$/.test(cue)) return "NN";   // bucket for 2-char numeric/unknown
    if (/^[0-9\?]{3}$/.test(cue)) return "NNN";  // bucket for 3-char numeric/unknown

    // Timecode 2-part: N:NN or NN:NN, allow ? in each field
    // Examples: "3:45", "?:??", "0?:??", "??:??"
    // We'll bucket into "N:NN" vs "NN:NN" based on left field width
    if (/^[0-9\?]{1}:[0-9\?]{2}$/.test(cue)) return "N:NN";
    if (/^[0-9\?]{2}:[0-9\?]{2}$/.test(cue)) return "NN:NN";

    // Timecode 3-part: N:NN:NN or NN:NN:NN, allow ? in each field
    // Examples: "1:02:33", "0:??:??", "??:??:??", "12:34:56"
    if (/^[0-9\?]{1}:[0-9\?]{2}:[0-9\?]{2}$/.test(cue)) return "N:NN:NN";
    if (/^[0-9\?]{2}:[0-9\?]{2}:[0-9\?]{2}$/.test(cue)) return "NN:NN:NN";

    // If you want to allow other weirdness, add it above.
    return "INVALID";
}

// checkTracklistCueConsistency
function checkTracklistCueConsistency(tracks, opts) {
    opts = opts || {};
    var ignorePureUnknown = !!opts.ignorePureUnknown; // if true, ignore "??" and "???"
    var ignoreInvalid = !!opts.ignoreInvalid;         // if true, don't fail on INVALID (not recommended)

    var seen = {};
    var invalid = [];
    var missing = [];
    var keys = [];

    tracks.each(function () {
        var cue = getTrackCue(this);
        var key = getCueFormatKey(cue);
        var track = $(this).text().trim();

        if (key === null) {
            missing.push(track);
            return;
        }

        if (key === "INVALID") {
            invalid.push(track);
            if (!ignoreInvalid) {
                seen[key] = true;
            }
            return;
        }

        if (ignorePureUnknown && (key === "??" || key === "???")) {
            return;
        }

        seen[key] = true;
        keys.push(key);
    });

    var uniqueKeys = Object.keys(seen).filter(function (k) { return seen[k]; });

    return {
        ok: uniqueKeys.length <= 1 && invalid.length === 0 && (!ignoreInvalid),
        uniqueKeys: uniqueKeys, // formats found (after ignoring rules)
        invalidTracks: invalid, // tracks with bad cues
        missingCueTracks: missing, // tracks without leading [cue]
        sampleKey: uniqueKeys[0] || null
    };
}

function getFirstDirectTextNode(el) {
    var $nodes = $(el).contents().filter(function () {
        return this.nodeType === Node.TEXT_NODE && this.nodeValue != null;
    });
    return $nodes.length ? $nodes[0] : null;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Track cue switcher (DOM-safe, guarantees ONE space after "]")
 *
 * - Only edits the leading direct TEXT NODE of the track element
 * - Replaces the cue inside "[...]" with the toggled cue
 * - Ignores everything after "]" in terms of formatting and children
 * - ALWAYS ensures exactly one space after the closing bracket,
 *   even if the next node is <i>, <b>, <span>, ...
 *
 * Requires:
 * - toggleCue_MM_HMM(cue)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Clickable cue toggles
 *
 * - Wraps only the cue value inside "[...]" with an <a> element:
 *   [<a class="mdbCueToggle">000</a>]
 * - Adds dotted underline via inline styles (or you can move to CSS)
 * - Click toggles the cue format for that single track item
 * - Uses event delegation so it works with dynamic content
 *
 * Requires:
 * - toggleCue_MM_HMM(cue)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function wrapCueWithToggleLink(trackEl) {
    var textNode = getFirstDirectTextNode(trackEl);
    if (!textNode) return false;

    var val = String(textNode.nodeValue || "");

    // Match leading: optional whitespace, "[", cue, "]"
    // Capture:
    // 1) leading whitespace + "["
    // 2) cue
    // 3) "]" and whatever after (keep)
    var m = val.match(/^(\s*\[\s*)([0-9\?:]+)(\s*\][\s\S]*)$/);
    if (!m) return false;

    var cueKey = getCueFormatKey(m[2]);
    if (!["NN", "NNN", "N:NN", "N:NN:NN"].includes(cueKey)) {
        return false;
    }

    // If already wrapped, don't wrap again
    // We detect by checking if the next sibling already is the link we would insert.
    var next = textNode.nextSibling;
    if (next && next.nodeType === Node.ELEMENT_NODE && $(next).hasClass("mdbCueToggle")) {
        return false;
    }

    // Replace the text node with:
    // text node: "["
    // link node: "cue"
    // text node: "] ..."
    var before = document.createTextNode(m[1]);

    var link = document.createElement("a");
    link.className = "mdbCueToggle";
    link.href = "#";
    link.textContent = m[2];
    link.dataset.lastMmCue = (cueKey === "NN" || cueKey === "NNN") ? m[2] : "";

    // Dotted underline, only on the cue value
    link.style.textDecoration = "underline";
    link.style.textDecorationStyle = "dotted";
    link.style.textUnderlineOffset = "2px";
    link.style.cursor = "pointer";

    var after = document.createTextNode(m[3]);

    var parent = textNode.parentNode;
    parent.insertBefore(before, textNode);
    parent.insertBefore(link, textNode);
    parent.insertBefore(after, textNode);
    parent.removeChild(textNode);

    return true;
}

// Add wrapping to a set of tracks
function enableCueToggleLinks($tracks) {
    $tracks.each(function () {
        wrapCueWithToggleLink(this);
    });
}

function toggleLinkToTargetFormat(linkEl, targetFormat) {
    var $link = $(linkEl);
    var cue = $link.text();
    var key = getCueFormatKey(cue);
    var switchedCue = cue;

    if (targetFormat === "HMM") {
        if (key === "NN" || key === "NNN") {
            switchedCue = toggleCue_MM_HMM(cue);
        }
    } else if (targetFormat === "MM") {
        if (key === "N:NN" || key === "N:NN:NN") {
            switchedCue = $link.data("lastMmCue") || toggleCue_MM_HMM(cue);
        }
    }

    if (!switchedCue || switchedCue === cue) return;

    var newKey = getCueFormatKey(switchedCue);
    if (newKey === "NN" || newKey === "NNN") {
        $link.data("lastMmCue", switchedCue);
    }

    $link.text(switchedCue);
}

// Event delegation: click on one cue toggles all cues in the tracklist
$(document).on("click", "a.mdbCueToggle", function (e) {
    e.preventDefault();
    e.stopPropagation();

    var $link = $(this);
    var cue = $link.text();
    var key = getCueFormatKey(cue);
    var targetFormat = null;

    if (key === "NN" || key === "NNN") targetFormat = "HMM";
    if (key === "N:NN" || key === "N:NN:NN") targetFormat = "MM";
    if (!targetFormat) return;

    var $tracklist = $link.closest(".list");
    if (!$tracklist.length) {
        toggleLinkToTargetFormat(this, targetFormat);
        return;
    }

    $tracklist.find("a.mdbCueToggle").each(function () {
        toggleLinkToTargetFormat(this, targetFormat);
    });
});




/*
 * If MixesDB page ready
 */
d.ready(function(){ // needed for mw.config

    // Prepare variables to check if we're on a mix page etc.
    var wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
        wgTitle = mw.config.get("wgTitle");

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     *
     * Tracklist cue format switcher
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    logVar( "wgNamespaceNumber", wgNamespaceNumber );
    logVar( "wgTitle", wgTitle );

    if( wgNamespaceNumber==0 && wgTitle!="Main Page" ) { // on mix pages
        logFunc( "Tracklist cue switcher" );

        // has tracklist?
        // any .list between div.mw-heading > h2#Tracklist and div#bodyBottom
        // Select all .list elements between h2#Tracklist and #bodyBottom
        var tracklists = $("h2#Tracklist")
            .closest(".mw-heading")
            .nextUntil("#bodyBottom", ".list");

        // Each tracklist
        tracklists.each(function () {
            var tracklist = $(this),
                tracks = $(".list-track", tracklist);

            // Check if the tracklist is consistent
            var result = checkTracklistCueConsistency(tracks, {
                ignorePureUnknown: true, // ignore "??" and "???" if you want
                ignoreInvalid: false
            });

            var tracklist_consistent = (result.uniqueKeys.length <= 1 && result.invalidTracks.length === 0);

            logVar("tracklist_formats_found", result.uniqueKeys);
            logVar("tracklist_consistent", tracklist_consistent);

            if (result.invalidTracks.length) {
                log("INVALID CUE TRACKS:");
                result.invalidTracks.forEach(function (t) { log(t); });
            }
            if (result.missingCueTracks.length) {
                log("MISSING CUE TRACKS:");
                result.missingCueTracks.forEach(function (t) { log(t); });
            }

            // Each track
            tracks.each(function () {
                var trackText = $(this).text().trim();
                var cue = getTrackCue(this);
                var key = getCueFormatKey(cue);

                logVar("track", trackText);
                log("> cue format: " + key + " / toggled: " + toggleCue_MM_HMM(cue));
            });

            // Always make cues clickable where detectable.
            enableCueToggleLinks(tracks);
        });
    }
});
