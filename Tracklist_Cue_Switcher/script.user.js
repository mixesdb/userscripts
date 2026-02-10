// ==UserScript==
// @name         Tracklist Cue Switcher (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.10.26
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Cue_Switcher_1
// @match        https://www.mixesdb.com/w/*
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

var cacheVersion = 2,
    scriptName = "Tracklist_Cue_Switcher";

var cuePreferredFormatStorageKey = "mdb_tracklistCueSwitcherPreferredFormat";

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
// - mm:ss: "MM:SS" (left side exactly 2 chars) for cues like "58:10"; converted with rounded minutes
// - h:mm:ss / hh:mm:ss: mainly for converting to MM*, supports '?' in mm/ss
//
// Returns:
// { type, minMinutes, maxMinutes, mmWidth }
// type: "MM" | "HMM" | "MMSS" | "HMS" | "INVALID"
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

    // mm:ss (with '?' allowed), 2+2 chars, convert via rounded minutes.
    // This catches cues like "58:10" and maps to 58 minutes.
    if (/^[0-9\?]{2}:[0-9\?]{2}$/.test(s)) {
        var p2 = s.split(":");
        var mm3 = tokenToMinMax(p2[0], 0, 99);
        var ss3 = tokenToMinMax(p2[1], 0, 59);

        if (!mm3 || !ss3) return { type: "INVALID" };

        var minSec2 = (mm3.min * 60) + ss3.min;
        var maxSec2 = (mm3.max * 60) + ss3.max;

        var minMinutes3 = Math.round(minSec2 / 60);
        var maxMinutes3 = Math.round(maxSec2 / 60);

        return {
            type: "MMSS",
            minMinutes: minMinutes3,
            maxMinutes: maxMinutes3,
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
    // For width=2, keep padding for H:MM/MM:SS inputs so 2:16 becomes "02" (not "2").
    var forcePad = (width === 3 || (width === 2 && context !== "FROM_MM"));

    return rangeToPattern(minMinutes, maxMinutes, width, forcePad);
}

function inferHourForZeroHundredsCue(prevCue, nextCue, overNextCue, prevStableHour, nextStableHour) {
    function inferFromCandidate(candidateCue) {
        if (!candidateCue) return null;

        var n = String(candidateCue).trim();

        // If cue is explicit 0XX in minutes-only format, keep current cue in hour 0 bucket.
        if (/^0[0-9]{2}$/.test(n)) {
            return 0;
        }

        var parsed = cueToMinuteRange(n);
        if (!parsed || parsed.type === "INVALID") return null;

        var minH = Math.floor(parsed.minMinutes / 60);
        var maxH = Math.floor(parsed.maxMinutes / 60);

        // Only infer when cue clearly sits in one hour bucket.
        if (minH === maxH) return minH;

        return null;
    }

    if (prevStableHour != null && nextStableHour != null && prevStableHour === nextStableHour) {
        return prevStableHour;
    }

    if (nextStableHour != null) return nextStableHour;
    if (prevStableHour != null) return prevStableHour;

    var inferred = inferFromCandidate(nextCue);
    if (inferred != null) return inferred;

    // If next cue is ambiguous/missing, fall back to previous stable cue.
    inferred = inferFromCandidate(prevCue);
    if (inferred != null) return inferred;

    // If next cue is still ambiguous, look one cue further.
    return inferFromCandidate(overNextCue);
}

function toggleCue_MM_HMM_WithAssumptions(cue, prevCue, nextCue, overNextCue, prevStableHour, nextStableHour) {
    var s = String(cue).trim();

    // Ambiguous X?? cue may span multiple hours (e.g. 1?? -> 100..199).
    // If following cue makes the hour obvious, keep the leading hour.
    if (/^[0-9]\?\?$/.test(s)) {
        var leadingHour = parseInt(s.charAt(0), 10);
        var inferredLeadingHour = inferHourForZeroHundredsCue(prevCue, nextCue, overNextCue, prevStableHour, nextStableHour);

        if (inferredLeadingHour != null && inferredLeadingHour === leadingHour) {
            return String(leadingHour) + ":??";
        }
    }

    // Ambiguous minutes-only cue crossing 0..99 range.
    // Use the next cue to infer the intended hour when possible.
    if (/^0\?\?$/.test(s)) {
        var inferredHour = inferHourForZeroHundredsCue(prevCue, nextCue, overNextCue, prevStableHour, nextStableHour);
        if (inferredHour != null) {
            return String(inferredHour) + ":??";
        }
    }

    return toggleCue_MM_HMM(s);
}

function inferUnknownThreeDigitCueToHMM(prevCue, nextCue) {
    if (!prevCue || !nextCue) return null;

    var prevParsed = cueToMinuteRange(prevCue);
    var nextParsed = cueToMinuteRange(nextCue);

    if (!prevParsed || !nextParsed) return null;
    if (prevParsed.type === "INVALID" || nextParsed.type === "INVALID") return null;

    // Track is between previous and next cue.
    // Use the open interval between both ranges when possible.
    var minMinutes = prevParsed.maxMinutes + 1;
    var maxMinutes = nextParsed.minMinutes - 1;

    if (minMinutes > maxMinutes) {
        minMinutes = Math.min(prevParsed.minMinutes, nextParsed.minMinutes);
        maxMinutes = Math.max(prevParsed.maxMinutes, nextParsed.maxMinutes);
    }

    return minuteRangeToHMM(minMinutes, maxMinutes);
}

function inferStableHourFromCue(cue) {
    if (!cue) return null;

    var parsed = cueToMinuteRange(cue);
    if (!parsed || parsed.type === "INVALID") return null;

    var minH = Math.floor(parsed.minMinutes / 60);
    var maxH = Math.floor(parsed.maxMinutes / 60);

    if (minH === maxH) return minH;
    return null;
}

function findNearestStableHour(cues, startIdx, step) {
    if (!Array.isArray(cues)) return null;
    if (step !== -1 && step !== 1) return null;

    for (var i = startIdx; i >= 0 && i < cues.length; i += step) {
        var hour = inferStableHourFromCue(cues[i]);
        if (hour != null) return hour;
    }

    return null;
}

function inferUnknownNumericCueToHMM(cue, prevCue, nextCue, prevStableHour, nextStableHour) {
    var cueStr = String(cue || "").trim();

    if (!/^\?{2,3}$/.test(cueStr)) return null;

    var prevHour = (prevStableHour != null) ? prevStableHour : inferStableHourFromCue(prevCue);
    var nextHour = (nextStableHour != null) ? nextStableHour : inferStableHourFromCue(nextCue);

    if (prevHour != null && nextHour != null && prevHour === nextHour) {
        return String(prevHour) + ":??";
    }

    if (nextHour != null) {
        return String(nextHour) + ":??";
    }

    if (prevHour != null) {
        return String(prevHour) + ":??";
    }

    if (prevCue && nextCue) {
        var inferred = inferUnknownThreeDigitCueToHMM(prevCue, nextCue);
        if (inferred) return inferred;
    }

    return toggleCue_MM_HMM(cueStr);
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

    // Disambiguate MM:SS cues first.
    //
    // "58:10" should toggle to "58" (minutes-only), not "0:58".
    // Handling this branch before generic range parsing avoids accidental
    // interpretation as a minutes-only cue in callers that pre-process text.
    if (/^[0-9\?]{2}:[0-9\?]{2}$/.test(s)) {
        var mmss = cueToMinuteRange(s);
        if (mmss.type === "MMSS") {
            return minuteRangeToMM(mmss.minMinutes, mmss.maxMinutes, "FROM_HMM", null);
        }
    }

    var r = cueToMinuteRange(s);

    if (r.type === "MM") {
        return minuteRangeToHMM(r.minMinutes, r.maxMinutes);
    }

    if (r.type === "HMM") {
        return minuteRangeToMM(r.minMinutes, r.maxMinutes, "FROM_HMM", null);
    }

    if (r.type === "MMSS") {
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
 * - Wraps the full bracketed cue with an <a> element:
 *   <a class="mdbCueToggle">[000]</a>
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
    // 1) leading whitespace
    // 2) cue
    // 3) whatever after closing bracket (keep)
    var m = val.match(/^(\s*)\[\s*([0-9\?:]+)\s*\]([\s\S]*)$/);
    if (!m) return false;

    var cueKey = getCueFormatKey(m[2]);
    if (!["NN", "NNN", "??", "???", "N:NN", "NN:NN", "N:NN:NN"].includes(cueKey)) {
        return false;
    }

    // If already wrapped, don't wrap again
    // We detect by checking if the next sibling already is the link we would insert.
    var next = textNode.nextSibling;
    if (next && next.nodeType === Node.ELEMENT_NODE && $(next).hasClass("mdbCueToggle")) {
        return false;
    }

    // Replace the text node with:
    // text node: optional leading whitespace
    // link node: "[cue]"
    // text node: remainder
    var before = document.createTextNode(m[1]);

    var link = document.createElement("a");
    link.className = "mdbCueToggle";
    link.href = "#";
    link.style.cssText = "color: inherit !important; text-decoration: none;"; // avoid flashing (CSS file sometimes fires after elements are created)
    link.textContent = "[" + m[2] + "]";
    link.dataset.originalCue = m[2];
    link.dataset.lastMmCue = (cueKey === "NN" || cueKey === "NNN") ? m[2] : "";

    var after = document.createTextNode(m[3]);

    var parent = textNode.parentNode;
    parent.insertBefore(before, textNode);
    parent.insertBefore(link, textNode);
    parent.insertBefore(after, textNode);
    parent.removeChild(textNode);

    return true;
}

function getCueFromToggleText(value) {
    var s = String(value || "").trim();

    // Single cue: [000]
    var one = s.match(/^\[\s*([0-9\?:]+)\s*\]$/);
    if (one) return one[1];

    // Dual cue display: [000] [0:00]
    var two = s.match(/^\[\s*([0-9\?:]+)\s*\]\s*\[\s*([0-9\?:]+)\s*\]$/);
    if (two) return two[1];

    return s;
}

// Add wrapping to a set of tracks
function enableCueToggleLinks($tracks) {
    $tracks.each(function () {
        wrapCueWithToggleLink(this);
    });
}

function getAlternateCueFromOriginal(cue, prevCue, nextCue, overNextCue, prevStableHour, nextStableHour) {
    var key = getCueFormatKey(cue);

    if (key === "NN" || key === "NNN") {
        return toggleCue_MM_HMM_WithAssumptions(cue, prevCue, nextCue, overNextCue, prevStableHour, nextStableHour);
    }

    if (key === "??" || key === "???") {
        return inferUnknownNumericCueToHMM(cue, prevCue, nextCue, prevStableHour, nextStableHour) || cue;
    }

    if (key === "N:NN" || key === "NN:NN" || key === "N:NN:NN") {
        return toggleCue_MM_HMM(cue);
    }

    return cue;
}

function getStoredPreferredCueFormat() {
    var value = String(localStorage.getItem(cuePreferredFormatStorageKey) || "").trim();
    if (value === "MM" || value === "HMM") return value;
    return null;
}

function storePreferredCueFormat(format) {
    if (format !== "MM" && format !== "HMM") return;
    localStorage.setItem(cuePreferredFormatStorageKey, format);
}

function getTargetFormatFromCue(cue) {
    var key = getCueFormatKey(cue);
    if (key === "NN" || key === "NNN" || key === "??" || key === "???") return "MM";
    if (key === "N:NN" || key === "NN:NN" || key === "N:NN:NN") return "HMM";
    return null;
}

function rememberTracklistPreferredFormatForMode($tracklist, mode) {
    var selectedFormat = null;

    $tracklist.find("a.mdbCueToggle").each(function () {
        var $link = $(this);
        var originalCue = String($link.data("originalCue") || getCueFromToggleText($link.text()) || "").trim();
        var alternateCue = String($link.data("alternateCue") || "").trim();
        var cue = null;

        if (mode === 0) {
            cue = originalCue;
        } else if (mode === 1) {
            cue = alternateCue || originalCue;
        }

        if (!cue) return;

        selectedFormat = getTargetFormatFromCue(cue);
        if (selectedFormat) return false;
    });

    if (selectedFormat) {
        storePreferredCueFormat(selectedFormat);
    }
}

function applyStoredPreferredFormat($tracklist) {
    var preferredFormat = getStoredPreferredCueFormat();
    if (!preferredFormat) return;

    var $links = $tracklist.find("a.mdbCueToggle");
    if (!$links.length) return;

    var changedAny = false;

    $links.each(function () {
        if (toggleLinkToTargetFormat(this, preferredFormat)) {
            changedAny = true;
        }
    });

    // Keep mode in sync with rendered cues.
    // If no cue was changed, the tracklist is still in original mode.
    $tracklist.data("cueDisplayMode", changedAny ? 1 : 0);
}

function toggleLinkToTargetFormat(linkEl, targetFormat) {
    var $link = $(linkEl);
    var cue = getCueFromToggleText($link.text());
    var key = getCueFormatKey(cue);
    var switchedCue = cue;

    if (targetFormat === "HMM") {
        if (key === "NN" || key === "NNN" || key === "??" || key === "???") {
            var $all = $link.closest(".list, ul, ol").find("a.mdbCueToggle");
            var idx = $all.index(linkEl);
            var cues = $all.map(function () {
                return getCueFromToggleText($(this).text());
            }).get();

            var prevCue = (idx > 0) ? cues[idx - 1] : null;
            var nextCue = (idx >= 0 && idx + 1 < cues.length) ? cues[idx + 1] : null;
            var overNextCue = (idx >= 0 && idx + 2 < cues.length) ? cues[idx + 2] : null;
            var prevStableHour = findNearestStableHour(cues, idx - 1, -1);
            var nextStableHour = findNearestStableHour(cues, idx + 1, 1);

            if (key === "??" || key === "???") {
                switchedCue = inferUnknownNumericCueToHMM(cue, prevCue, nextCue, prevStableHour, nextStableHour) || cue;
            } else {
                switchedCue = toggleCue_MM_HMM_WithAssumptions(cue, prevCue, nextCue, overNextCue, prevStableHour, nextStableHour);
            }
        }
    } else if (targetFormat === "MM") {
        if (key === "N:NN" || key === "NN:NN" || key === "N:NN:NN") {
            switchedCue = $link.data("lastMmCue") || toggleCue_MM_HMM(cue);
        }
    }

    if (!switchedCue || switchedCue === cue) return false;

    var newKey = getCueFormatKey(switchedCue);
    if (newKey === "NN" || newKey === "NNN") {
        $link.data("lastMmCue", switchedCue);
    }

    $link.text("[" + switchedCue + "]");
    return true;
}

function applyTracklistCueMode($tracklist, mode) {
    var $links = $tracklist.find("a.mdbCueToggle");
    if (!$links.length) return;

    $links.each(function () {
        var $link = $(this);
        if (!$link.data("originalCue")) {
            $link.data("originalCue", getCueFromToggleText($link.text()));
        }
    });

    var originalCues = $links.map(function () {
        return String($(this).data("originalCue") || "").trim();
    }).get();

    $links.each(function (idx) {
        var $link = $(this);
        var originalCue = originalCues[idx] || String($link.data("originalCue") || "").trim();
        var prevCue = (idx > 0) ? originalCues[idx - 1] : null;
        var nextCue = (idx + 1 < originalCues.length) ? originalCues[idx + 1] : null;
        var overNextCue = (idx + 2 < originalCues.length) ? originalCues[idx + 2] : null;

        var prevStableHour = findNearestStableHour(originalCues, idx - 1, -1);
        var nextStableHour = findNearestStableHour(originalCues, idx + 1, 1);

        var alternateCue = $link.data("alternateCue");
        if (!alternateCue) {
            alternateCue = getAlternateCueFromOriginal(originalCue, prevCue, nextCue, overNextCue, prevStableHour, nextStableHour);
            $link.data("alternateCue", alternateCue);

            var altKey = getCueFormatKey(alternateCue);
            if (altKey === "NN" || altKey === "NNN") {
                $link.data("lastMmCue", alternateCue);
            }
        }

        if (mode === 0) {
            $link.text("[" + originalCue + "]");
        } else if (mode === 1) {
            $link.text("[" + (alternateCue || originalCue) + "]");
        } else if (mode === 2) {
            if (alternateCue && alternateCue !== originalCue) {
                $link.text("[" + originalCue + "|" + alternateCue + "]");
            } else {
                $link.text("[" + originalCue + "]");
            }
        }
    });
}

// Event delegation: click on one cue cycles all cues in the tracklist
$(document).on("click", "a.mdbCueToggle", function (e) {
    e.preventDefault();
    e.stopPropagation();

    var $link = $(this);
    var $tracklist = $link.closest(".list, ul, ol");
    if (!$tracklist.length) {
        $tracklist = $link.parent();
    }

    var currentMode = parseInt($tracklist.data("cueDisplayMode"), 10);
    if (isNaN(currentMode)) currentMode = 0;

    // Cycle: original -> format change -> both -> original
    var nextMode = (currentMode + 1) % 3;

    var $allTracklists = $("[data-mdb-cue-tracklist='1']");
    if (!$allTracklists.length) {
        $allTracklists = $tracklist;
    }

    $allTracklists.each(function () {
        var $list = $(this);
        $list.data("cueDisplayMode", nextMode);
        applyTracklistCueMode($list, nextMode);
        rememberTracklistPreferredFormatForMode($list, nextMode);
    });
});



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * Run
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

d.ready(function(){ // needed for mw.config
    logFunc( "Tracklist cue switcher" );

    // Prepare variables to check if we're on a mix page etc.
    var actionView =  $("body").hasClass("action-view") ? true : false,
        wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
        wgTitle = mw.config.get("wgTitle"),
        wgPageName = mw.config.get("wgPageName");

    logVar( "wgNamespaceNumber", wgNamespaceNumber );
    logVar( "wgTitle", wgTitle );
    logVar( "wgPageName", wgPageName );

    function processTracklists($tracklists) {
        $tracklists.each(function () {
            var tracklist = $(this),
                tracks = tracklist.find(".list-track");

            tracklist.attr("data-mdb-cue-tracklist", "1");

            // Fallback for pages where tracklists are plain UL/OL without .list-track classes.
            if (!tracks.length && (tracklist.is("ul") || tracklist.is("ol"))) {
                tracks = tracklist.children("li");
            }

            // Check if the tracklist is consistent
            var result = checkTracklistCueConsistency(tracks, {
                ignorePureUnknown: true, // ignore "??" and "???" if you want
                ignoreInvalid: false
            });

            var tracklist_consistent = (result.uniqueKeys.length <= 1 && result.invalidTracks.length === 0);

            //logVar("tracklist_formats_found", result.uniqueKeys);
            logVar("tracklist_consistent", tracklist_consistent);

            // Each track
            tracks.each(function () {
                var trackText = $(this).text().trim();
                var cue = getTrackCue(this);
                var key = getCueFormatKey(cue);

                logVar("track", trackText);
                log("> cue: " + cue + " / format: " + key + " / toggled: " + toggleCue_MM_HMM(cue));
            });

            // Always make cues clickable where detectable.
            enableCueToggleLinks(tracks);
            applyStoredPreferredFormat(tracklist);
        });
    }

    function runCueSwitcherSection(section) {
        log("> Running on " + section.label);
        processTracklists(section.getTracklists());
    }

    function watchLightboxTracklists() {
        waitForKeyElements("#lightbox .list, #lightbox ul, #lightbox ol", function (jNode) {
            log("> Running on lightbox");
            processTracklists(jNode);
        });
    }

    var runSections = [
        {
            label: "mix pages",
            shouldRun: function () {
                return wgNamespaceNumber === 0 && wgTitle !== "Main Page";
            },
            getTracklists: function () {
                // has tracklist?
                // any .list between div.mw-heading > h2#Tracklist and div#bodyBottom
                // Select all .list elements between h2#Tracklist and #bodyBottom
                return $("h2#Tracklist")
                    .closest(".mw-heading")
                    .nextUntil("#bodyBottom", ".list, ul, ol");
            }
        },
        {
            label: "Explorer/Mixes",
            shouldRun: function () {
                return wgNamespaceNumber === 4 && wgTitle === "Explorer/Mixes";
            },
            getTracklists: function () {
                return $(".ExplorerTracklist .list, ul, ol");
            }
        }
    ];

    $.each(runSections, function (_, section) {
        if (section.shouldRun()) {
            runCueSwitcherSection(section);
        }
    });

    watchLightboxTracklists();
});