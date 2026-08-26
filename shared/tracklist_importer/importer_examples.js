/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist Importer – merge and wikitext examples
 *
 * Test data for merge_core.js, run by importer_examples_test.js (deno). Two suites:
 *
 *   tlImporterExamples_merge     original + candidate -> expected merged text, plus which
 *                                candidate parts must count as UNUSED (the diff view's
 *                                highlights). unused lists 1-based candidate line numbers
 *                                per part – lines are counted over the parsed candidate
 *                                (blank lines dropped, gaps counted).
 *
 *   tlImporterExamples_pageText  page text + tracklist -> expected page text after
 *                                tlImporter_setTracklist(), and the Insert-vs-Merge reading
 *                                of tlImporter_extractTracklist().
 *
 * Add a reported merge as a case the way title reports become cases in
 * page_creator/title_examples.js, with a comment naming what it guards.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlImporterExamples_merge = [
    {
        // Labels are added to matching tracks; identical cues stay quiet.
        name: "labels enrich matching tracks",
        original: "[00] A - One\n[05] B - Two\n[10] C - Three",
        candidate: "[000] A - One [LabelA]\n[005] B - Two\n[010] C - Three [LabelC]",
        expect: "[00] A - One [LabelA]\n[05] B - Two\n[10] C - Three [LabelC]",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // A "?" unknown with the same cue is filled, and a track after the last match lands
        // in front of the trailing gap.
        name: "fill unknown and add in gap",
        original: "[00] A - One\n[10] ?\n...",
        candidate: "[00] A - One\n[10] B - Two [L2]\n[25] C - Three",
        expect: "[00] A - One\n[10] B - Two [L2]\n[25] C - Three\n...",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // An undiscovered track is inserted between existing consecutive tracks by its cue.
        name: "insert between consecutive tracks",
        original: "[00] A - One\n[10] C - Three",
        candidate: "[00] A - One\n[06] B - Two\n[10] C - Three",
        expect: "[00] A - One\n[06] B - Two\n[10] C - Three",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // The original wins: its label stays (candidate label unused), and a lone "?" between
        // two matched tracks of a gap-less original is not inserted. Nothing changes.
        name: "original wins, nothing to add",
        original: "[00] A - One [OrigLabel]\n[10] B - Two",
        candidate: "[00] A - One [CandLabel]\n[03] ?\n[10] B - Two",
        expect: "[00] A - One [OrigLabel]\n[10] B - Two",
        changed: false,
        unused: { cues: [2], texts: [], labels: [1] }
    },
    {
        // Candidate MM cues are converted to the original's H:MM format before merging.
        name: "cue format follows the original",
        original: "[0:00] A - One\n[0:30] ?",
        candidate: "[00] A - One\n[30] B - Two",
        expect: "[0:00] A - One\n[0:30] B - Two",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Fuzzy title match: one character difference still matches, the label is taken over.
        name: "fuzzy title match takes the label",
        original: "[00] Hieroglyphic Being - The Fourth Dimension",
        candidate: "[00] Hieroglyphic Being - The Fourth Dimensions [Mathematics]",
        expect: "[00] Hieroglyphic Being - The Fourth Dimension [Mathematics]",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    }
];

var tlImporterExamples_pageText = [
    {
        // The empty <list> of a page without a tracklist reads as "insert", and an incomplete
        // tracklist (gaps, no "#") goes back INSIDE <list>.
        name: "insert incomplete tracklist into empty list tag",
        pageText: "== Tracklist ==\n\n<list>\n\n</list>\n\n[[Category:2020]]\n[[Category:Tracklist: none]]",
        hasTracks: false,
        tl: "[00] A - One\n...",
        expect: "== Tracklist ==\n\n<list>\n[00] A - One\n...\n</list>\n\n[[Category:2020]]\n[[Category:Tracklist: none]]"
    },
    {
        // A complete tracklist – every track numbered "# " – replaces the <list> tag entirely.
        name: "insert complete tracklist replaces the list tag",
        pageText: "== Tracklist ==\n\n<list>\n\n</list>\n\n[[Category:2020]]",
        hasTracks: false,
        tl: "# [00] A - One\n# [10] B - Two",
        expect: "== Tracklist ==\n\n# [00] A - One\n# [10] B - Two\n\n[[Category:2020]]"
    },
    {
        // An existing tracklist inside <list> reads as "merge", and its text comes out
        // without the tags.
        name: "existing tracklist is extracted for merging",
        pageText: "== File details ==\n\nfoo\n\n== Tracklist ==\n\n<list>\n[00] A - One\n...\n</list>\n\n== Notes ==\n\nbar",
        hasTracks: true,
        extracted: "[00] A - One\n...",
        tl: "[00] A - One\n[10] B - Two",
        expect: "== File details ==\n\nfoo\n\n== Tracklist ==\n\n<list>\n[00] A - One\n[10] B - Two\n</list>\n\n== Notes ==\n\nbar"
    }
];
