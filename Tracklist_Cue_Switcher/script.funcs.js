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


