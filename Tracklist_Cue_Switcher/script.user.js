// ==UserScript==
// @name         Tracklist Cue Switcher (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.11.1
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Cue_Switcher_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.funcs.js?v_1
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