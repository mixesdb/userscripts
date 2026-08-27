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
        // not identical: the candidate has a label the page carries differently and a "?" row
        // the merge dropped - both are things a reader may still want to look at
        identical: false,
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
    },
    {
        // Reported 2026-08-26 (andhim for Chetana, trackid.net): an HH:MM:SS original met a
        // bare-minutes candidate and the cue helpers knew neither three-part cues nor how to
        // order them, so inserted tracks kept their [018]-style cues and landed in the wrong
        // places. Guards: candidate cues take the original's HH:MM:SS format; an unknown
        // whose cue is covered by an original track (018 vs 00:18:00) is dropped instead of
        // inserted; a "?" slot keeps its own more precise cue when filled (00:13:20, not
        // 00:14:00); a slot is only filled when the cues roughly agree, so Nu Genea (078)
        // fills [01:17:00] and not the segment's first "?" at [01:10:10].
        // Also the redundant-gap rule in the small: the candidate's "..." between its [066] and
        // [071] came in behind [01:10:10], where the page's own cues leave 50 seconds for the
        // missing track it claims - well below the list's ~4 min median, so it is dropped.
        name: "HH:MM:SS original with minute-rounded candidate",
        original: "# [00:00:00] Addam (Be) & Crisologo & Massuma - Wagathoni\n" +
                  "# [00:05:10] andhim Feat. Zaho De Sagazan - Mon Corps [SUPERFRIENDS]\n" +
                  "# [00:08:50] Nico Stojan & Tooker - Perla [SONARA]\n" +
                  "# [00:13:20] ?\n" +
                  "# [00:18:00] andhim - Overnight [SUPERFRIENDS]\n" +
                  "# [00:22:20] A$AP Rocky - Sundress (Chris Luno Remix) [A$AP]\n" +
                  "# [00:25:50] DJ Tomer & Ricardo - Train Ride\n" +
                  "# [00:30:35] Oliver Koletzki - Der Mückenschwarm (andhim 20yrs SVT Remix) [STIL VOR TALENT]\n" +
                  "# [00:35:00] ?\n" +
                  "# [00:40:20] Aaaron & Deckert - Your Love\n" +
                  "# [00:43:30] Yamil - Don't Play With Me [MONABERRY]\n" +
                  "# [00:47:30] ?\n" +
                  "# [00:51:30] Dropgun & Lost Capital & Kate Moon Feat. Yo Trane - Only One [FUTURE HOUSE MUSIC]\n" +
                  "# [00:55:50] Gabss & Vintage Culture - Lost [AFFAIRS]\n" +
                  "# [01:01:00] Darco - Baziman [DESCENDING ORDER]\n" +
                  "# [01:04:10] ?\n" +
                  "# [01:05:30] Augusto Yepes - Indian Flair [ABRACADABRA]\n" +
                  "# [01:10:10] ?\n" +
                  "# [01:12:50] ?\n" +
                  "# [01:17:00] ?\n" +
                  "# [01:21:30] AIKON - Welcome To The Future [UNTAMED]\n" +
                  "# [01:25:10] DJ Chus & Amine K (Moroko Loko) & Riponne - The Real Dancers (Yulia Niko Remix) [IZIL]\n" +
                  "# [01:29:00] andhim - Boy Boy Boy [BLACK BUTTER]\n" +
                  "# [01:33:00] Notre Dame - Candy Cloud [PARANORMAL]\n" +
                  "# [01:38:00] andhim - You're Not Alone [HIGHER GROUND (MAD DECENT)]\n" +
                  "# [01:42:20] WhoMadeWho & Tripolism - Flying Away With You (andhim Remix) [CERCLE]",
        candidate: "[000] ADDAM & Crisologo & Massuma - Wagathoni [Klub]\n" +
                   "[006] andhim - Mon Corps\n" +
                   "[009] Nico Stojan - Perla [SONARA]\n" +
                   "[014] andhim - Acido [Magnifik]\n" +
                   "[018] ?\n" +
                   "...\n" +
                   "[023] A$AP Rocky - Sundress\n" +
                   "...\n" +
                   "[028] DJ Tomer - Train Ride [Mahaba]\n" +
                   "[031] Oliver Koletzki - Der Mückenschwarm (andhim 20yrs SVT Remix)\n" +
                   "[035] ?\n" +
                   "...\n" +
                   "[041] Aaaron & Deckert - Your Love [TAU]\n" +
                   "[044] Yamil - Don't Play With Me [Monaberry]\n" +
                   "[048] Samm - Heart Spin [Magnifik]\n" +
                   "[052] Dropgun & Lost Capital & Kate Moon & Yo Trane - Only One [Future House Music]\n" +
                   "[057] DJ THIAGO ARMANDO SC - LOSTZINH MINIMAL\n" +
                   "[061] Darco - Baziman [Descending Order]\n" +
                   "[066] ?\n" +
                   "...\n" +
                   "[071] Dave Ruthwell & SGX - Dark Beat (Extended Mix) [Club Bad]\n" +
                   "[073] Augusto Yepes - Indian Flair [ABRACADABRA]\n" +
                   "[078] Nu Genea - Tienaté [NG Licensed To Carosello]\n" +
                   "[082] AIKON - Welcome To The Future [UNTAMED]\n" +
                   "[086] DJ Chus - Real Dancer (Yulia Niko Extended Remix) [Izil]\n" +
                   "[089] andhim - Boy Boy Boy\n" +
                   "[094] Notre Dame - Candy Cloud [Paranormal]\n" +
                   "[099] andhim - You're Not Alone\n" +
                   "[103] WhoMadeWho & Tripolism - Flying Away With You [Cercle]\n" +
                   "[106] ?",
        expect: "[00:00:00] Addam (Be) & Crisologo & Massuma - Wagathoni [Klub]\n" +
                "[00:05:10] andhim Feat. Zaho De Sagazan - Mon Corps [SUPERFRIENDS]\n" +
                "[00:08:50] Nico Stojan & Tooker - Perla [SONARA]\n" +
                "[00:13:20] andhim - Acido [Magnifik]\n" +
                "[00:18:00] andhim - Overnight [SUPERFRIENDS]\n" +
                "[00:22:20] A$AP Rocky - Sundress (Chris Luno Remix) [A$AP]\n" +
                "[00:25:50] DJ Tomer & Ricardo - Train Ride [Mahaba]\n" +
                "[00:30:35] Oliver Koletzki - Der Mückenschwarm (andhim 20yrs SVT Remix) [STIL VOR TALENT]\n" +
                "[00:35:00] ?\n" +
                "[00:40:20] Aaaron & Deckert - Your Love [TAU]\n" +
                "[00:43:30] Yamil - Don't Play With Me [MONABERRY]\n" +
                "[00:47:30] Samm - Heart Spin [Magnifik]\n" +
                "[00:51:30] Dropgun & Lost Capital & Kate Moon Feat. Yo Trane - Only One [FUTURE HOUSE MUSIC]\n" +
                "[00:55:50] Gabss & Vintage Culture - Lost [AFFAIRS]\n" +
                "[00:57:00] DJ THIAGO ARMANDO SC - LOSTZINH MINIMAL\n" +
                "[01:01:00] Darco - Baziman [DESCENDING ORDER]\n" +
                "[01:04:10] ?\n" +
                "[01:05:30] Augusto Yepes - Indian Flair [ABRACADABRA]\n" +
                "[01:10:10] ?\n" +
                "[01:11:00] Dave Ruthwell & SGX - Dark Beat (Extended Mix) [Club Bad]\n" +
                "[01:12:50] ?\n" +
                "[01:17:00] Nu Genea - Tienaté [NG Licensed To Carosello]\n" +
                "[01:21:30] AIKON - Welcome To The Future [UNTAMED]\n" +
                "[01:25:10] DJ Chus & Amine K (Moroko Loko) & Riponne - The Real Dancers (Yulia Niko Remix) [IZIL]\n" +
                "[01:29:00] andhim - Boy Boy Boy [BLACK BUTTER]\n" +
                "[01:33:00] Notre Dame - Candy Cloud [PARANORMAL]\n" +
                "[01:38:00] andhim - You're Not Alone [HIGHER GROUND (MAD DECENT)]\n" +
                "[01:42:20] WhoMadeWho & Tripolism - Flying Away With You (andhim Remix) [CERCLE]\n" +
                "[01:46:00] ?",
        changed: true,
        // line 5: the dropped duplicate unknown; line 9: DJ Tomer's cue is 130s off the
        // original's (beyond tolerance); line 22: Augusto's cue disagrees by 7.5 minutes.
        unused: { cues: [5, 9, 22], texts: [], labels: [] }
    },
    {
        // Reported: the page already carried exactly this tracklist (Flug - HATE Podcast 501),
        // the Merge link showed up anyway and the edit form opened on "(No difference)". The
        // re-writing of "?" rows and of labels the original already had counted as changes
        // while the text stayed identical - so "changed" must be read off the TEXT, not off
        // the counter.
        name: "identical original and candidate change nothing",
        original: "[000] Earwax - No Output (Silent Mix) [MORD]\n" +
                  "...\n" +
                  "[015] Nørbak - Adeus (Mathys Lenne Remix) [NRBK]\n" +
                  "[019] ?\n" +
                  "...\n" +
                  "[035] Clotur - Hyperdrive [K S R]\n" +
                  "[038] ?\n" +
                  "...",
        candidate: "[000] Earwax - No Output (Silent Mix) [MORD]\n" +
                   "...\n" +
                   "[015] Nørbak - Adeus (Mathys Lenne Remix) [NRBK]\n" +
                   "[019] ?\n" +
                   "...\n" +
                   "[035] Clotur - Hyperdrive [K S R]\n" +
                   "[038] ?\n" +
                   "...",
        expect: "[000] Earwax - No Output (Silent Mix) [MORD]\n" +
                "...\n" +
                "[015] Nørbak - Adeus (Mathys Lenne Remix) [NRBK]\n" +
                "[019] ?\n" +
                "...\n" +
                "[035] Clotur - Hyperdrive [K S R]\n" +
                "[038] ?\n" +
                "...",
        changed: false,
        identical: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Reported 2026-08-27 (Feathers & Bones - Mixtape #04, trackid.net): page and TID list
        // were character for character the same, and the verdict still read "Nothing to add"
        // instead of "Identical" - so the integrated checkbox was never ticked. A track played
        // TWICE ([20] and [25] are the same Radian, [67] and [83] the same Atlantis) collapses
        // onto one entry in the title lookup, so two candidate rows match one original row and
        // the 1:1 count comes up short. Guard: two lists that serialize to the same text are
        // identical, whatever the matcher made of their duplicates.
        // The unused cues are the matcher's current reading of those duplicates, NOT part of
        // the guard: both Radian rows match the LAST Radian of the original, so the first one's
        // cue reads as 5 minutes off. It only shows in the diff view's Candidate column, which
        // a no-merge case never opens.
        name: "identical lists with a track played twice",
        original: "[00] ?\n" +
                  "...\n" +
                  "[20] Rodriguez Jr & Liset Alea & RJLA - Radian (Cercle Version) [Mobilee]\n" +
                  "[25] Rodriguez Jr & Liset Alea & RJLA - Radian (Cercle Version) [Mobilee]\n" +
                  "[31] Rodriguez Jr - Kilian [Mobilee]\n" +
                  "[36] ?\n" +
                  "...\n" +
                  "[67] Rodriguez Jr - Atlantis (Edit) [Systematic]\n" +
                  "[83] Rodriguez Jr - Atlantis (Edit) [Systematic]\n" +
                  "...",
        candidate: "[00] ?\n" +
                   "...\n" +
                   "[20] Rodriguez Jr & Liset Alea & RJLA - Radian (Cercle Version) [Mobilee]\n" +
                   "[25] Rodriguez Jr & Liset Alea & RJLA - Radian (Cercle Version) [Mobilee]\n" +
                   "[31] Rodriguez Jr - Kilian [Mobilee]\n" +
                   "[36] ?\n" +
                   "...\n" +
                   "[67] Rodriguez Jr - Atlantis (Edit) [Systematic]\n" +
                   "[83] Rodriguez Jr - Atlantis (Edit) [Systematic]\n" +
                   "...",
        expect: "[00] ?\n" +
                "...\n" +
                "[20] Rodriguez Jr & Liset Alea & RJLA - Radian (Cercle Version) [Mobilee]\n" +
                "[25] Rodriguez Jr & Liset Alea & RJLA - Radian (Cercle Version) [Mobilee]\n" +
                "[31] Rodriguez Jr - Kilian [Mobilee]\n" +
                "[36] ?\n" +
                "...\n" +
                "[67] Rodriguez Jr - Atlantis (Edit) [Systematic]\n" +
                "[83] Rodriguez Jr - Atlantis (Edit) [Systematic]\n" +
                "...",
        changed: false,
        identical: true,
        unused: { cues: [3, 8], texts: [], labels: [] }
    },
    {
        // The weaker no-change shape: everything the candidate has is on the page, but the
        // page knows more (a track the candidate never found). Nothing to merge either way,
        // but this is NOT the same list - and the "Identical" note plus the automatic
        // "TID tracklist is integrated" tick hang off that difference.
        name: "candidate contained in a longer original",
        original: "[00] A - One\n[10] B - Two\n[20] C - Three",
        candidate: "[00] A - One\n[10] B - Two",
        expect: "[00] A - One\n[10] B - Two\n[20] C - Three",
        changed: false,
        identical: false,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Reported 2026-08-27 (NTS Guide To 90s-00s Japanese Techno, trackid.net): the dur
        // fix. The original's XX cue format met a candidate detected at [106] – beyond what
        // two digits can say – and the merged list mixed [08] rows with a [106] one. Guard:
        // when cues beyond the format's digit count are known on either side, the target
        // format widens (XX -> XXX) BEFORE merging, and every cue moves with it, [??] -> [???]
        // included.
        // The two duplicate insertions this case used to carry are gone with
        // tlImporter_insertMaxUnplacedRows (see "unplaceable candidate rows are left to the
        // reader"): [009] Hiroshi Watanabe would have stepped over six cue-less rows to land
        // right behind "Hiroshi W. - Lost City", [073] FLR - PART 8 over five to land behind
        // "FLR - Easy Filter Part 8" – both of them the same track, both placed by nothing.
        // Their parts are highlighted in the Candidate column instead. What stays is
        // ――――― - IN YER MEMORY next to Takkyu Ishino's: it is APPENDED behind the last row,
        // where no other slot exists, and its double is the fuzzy threshold's current reading.
        // It doubles as the counter-case to the unknown-cue prefixes below: the runs with room
        // around them take the one digit their bounds agree on ("[0??]": before minute 100,
        // which on a 128-minute mix says something), while the three rows behind [099] have no
        // known cue after them at all and stay "[???]".
        name: "bare cue format widens for cues beyond 99",
        original: "# [00] Captain Funk - O.Y.M.\n" +
                  "# [00] Big Foot - Bisket Afro\n" +
                  "# [08] Hitoshi Ohishi - Heelflip\n" +
                  "# [??] Hiroshi W. - Lost City\n" +
                  "# [??] Yoshinori Sunahara - MFRFM (Bounce 2 Mix)\n" +
                  "# [??] Hiroki Esashika - Kazane\n" +
                  "# [??] DJ Tasaka - Loopa Trooper\n" +
                  "# [??] Kagami - Tokyo Disco Music All Night Long\n" +
                  "# [??] Moa - Malicia Mpedia\n" +
                  "# [??] Takkyu Ishino - Feeling\n" +
                  "# [??] Co-Fusion - Tokyo Funky Beat!\n" +
                  "# [??] Zank - Dow\n" +
                  "# [??] Ryukyudisko - Super Spin Spam\n" +
                  "# [??] The Anazaworld - Horse Direct\n" +
                  "# [??] ''DJ Shufflemaster - Untitled''\n" +
                  "# [??] Co-Fusion - Cycle\n" +
                  "# [??] Fumiya Tanaka - Micro One\n" +
                  "# [??] Q'Hey - Login\n" +
                  "# [??] ''Subvoice - Untitled''\n" +
                  "# [??] Takaaki Itoh - Serenity Through Pain\n" +
                  "# [??] Go Hiyama - C\n" +
                  "# [??] Kazu Kimura - Night Walk\n" +
                  "# [??] Akira Ishihara - Yamaga 7 O'Clock\n" +
                  "# [??] Brothers In Raw (Tobynation & Mijk Van Dijk) - Ach-So! (Ebizoo Remix)\n" +
                  "# [??] ''Chester Beatty - Untitled (Turia B1)''\n" +
                  "# [??] Kagami - Tiger Track\n" +
                  "# [??] FLR - Easy Filter Part 8\n" +
                  "# [??] Dr. Shingo - Galaxy Girls\n" +
                  "# [??] Chizawa - Panther\n" +
                  "# [??] Nagai Eri - Howlin' Yumi\n" +
                  "# [??] Jin Hiyama - Exorista Japonica\n" +
                  "# [??] Ryoh Mitomi - Haru-Kaze\n" +
                  "# [??] 7th Gate - After The Silence\n" +
                  "# [??] Ken Ishii - Extra\n" +
                  "# [??] Takkyu Ishino - In Yer Memory\n" +
                  "# [??] Shin - Plus Tokyo\n" +
                  "# [??] Ringo aka Susumu Yokota - Tsukushi",
        candidate: "[000] Captain Funk - O.Y.M. [Sublime/Musicmine]\n" +
                   "[004] ?\n" +
                   "...\n" +
                   "[009] Hiroshi Watanabe - Lost City [King Street Sounds]\n" +
                   "...\n" +
                   "[026] Takkyu Ishino - Feeling\n" +
                   "[029] ?\n" +
                   "...\n" +
                   "[033] RYUKYUDISKO - Super Spin Spam\n" +
                   "[036] ?\n" +
                   "...\n" +
                   "[042] Co-Fusion - Cycle [Musicmine]\n" +
                   "[046] ?\n" +
                   "...\n" +
                   "[061] Kazu Kimura - Night Walk [CLR]\n" +
                   "...\n" +
                   "[073] FLR - PART 8 [70Drums]\n" +
                   "[076] Dr. Shingo - Galaxy Girls [Konsequent]\n" +
                   "[082] Chizawa Q - Panther\n" +
                   "[087] Nagai Eri - Howlin' Yumi [ACV]\n" +
                   "...\n" +
                   "[094] 7th Gate - After The Silence [Rotation]\n" +
                   "[099] Ken Ishii - Extra\n" +
                   "[106] ――――― - IN YER MEMORY\n" +
                   "[111] ?\n" +
                   "...",
        expect: "[000] Captain Funk - O.Y.M. [Sublime/Musicmine]\n" +
                "[000] Big Foot - Bisket Afro\n" +
                "[008] Hitoshi Ohishi - Heelflip\n" +
                "[0??] Hiroshi W. - Lost City\n" +
                "[0??] Yoshinori Sunahara - MFRFM (Bounce 2 Mix)\n" +
                "[0??] Hiroki Esashika - Kazane\n" +
                "[0??] DJ Tasaka - Loopa Trooper\n" +
                "[0??] Kagami - Tokyo Disco Music All Night Long\n" +
                "[0??] Moa - Malicia Mpedia\n" +
                "[026] Takkyu Ishino - Feeling\n" +
                "[0??] Co-Fusion - Tokyo Funky Beat!\n" +
                "[0??] Zank - Dow\n" +
                "[033] Ryukyudisko - Super Spin Spam\n" +
                "[0??] The Anazaworld - Horse Direct\n" +
                "[0??] DJ Shufflemaster - Untitled\n" +
                "[042] Co-Fusion - Cycle [Musicmine]\n" +
                "[0??] Fumiya Tanaka - Micro One\n" +
                "[0??] Q'Hey - Login\n" +
                "[0??] Subvoice - Untitled\n" +
                "[0??] Takaaki Itoh - Serenity Through Pain\n" +
                "[0??] Go Hiyama - C\n" +
                "[061] Kazu Kimura - Night Walk [CLR]\n" +
                "[0??] Akira Ishihara - Yamaga 7 O'Clock\n" +
                "[0??] Brothers In Raw (Tobynation & Mijk Van Dijk) - Ach-So! (Ebizoo Remix)\n" +
                "[0??] Chester Beatty - Untitled (Turia B1)\n" +
                "[0??] Kagami - Tiger Track\n" +
                "[0??] FLR - Easy Filter Part 8\n" +
                "[076] Dr. Shingo - Galaxy Girls [Konsequent]\n" +
                "[082] Chizawa - Panther\n" +
                "[087] Nagai Eri - Howlin' Yumi [ACV]\n" +
                "[0??] Jin Hiyama - Exorista Japonica\n" +
                "[0??] Ryoh Mitomi - Haru-Kaze\n" +
                "[094] 7th Gate - After The Silence [Rotation]\n" +
                "[099] Ken Ishii - Extra\n" +
                "[???] Takkyu Ishino - In Yer Memory\n" +
                "[???] Shin - Plus Tokyo\n" +
                "[???] Ringo aka Susumu Yokota - Tsukushi\n" +
                "[106] ――――― - IN YER MEMORY\n" +
                "[111] ?\n" +
                "...",
        changed: true,
        // the "?" candidates INSIDE the list (lines 2, 7, 10, 13) are dropped – a gap-less
        // original takes no unknown rows, so their cues stay unplaced. The trailing "?"
        // (line 25) is kept with its gap: it lands behind the original's last row, where it is
        // the only sign that the 2:00:17 stream runs on past it. Lines 4 and 17 are the two
        // rows the merge could not place – everything they carry is left for the reader.
        unused: { cues: [2, 4, 7, 10, 13, 17], texts: [4, 17], labels: [4, 17] }
    },
    {
        // Reported 2026-08-27 (Chris Stussy - Essential Mix 2024-10-12, 1001tracklists): three
        // rows the merge could not see as rows it already had, each of them added a second
        // time. Guards the three readings behind that:
        //   [021] "? - Untitled (B1)" vs "? - B1 [Mask]" - an unknown ARTIST on both sides at
        //         the same cue is the same track; the page's title wins, the label is added.
        //   [089] "Chloé Caillet - ?" vs the full credit - an unknown TITLE takes the
        //         candidate's text whole, as long as the candidate credits the page's artist.
        //   [098] "Costigane" vs "Brendan Costigane" - the same title with the artist written
        //         shorter on the page. The page wins ("Costigane" stays), the row is not
        //         doubled, and the candidate's spelling stays readable in the Candidate column.
        name: "half-known rows and a shortened artist name",
        original: "# [002] Alex Cortex - Discola [Housewax]\n" +
                  "# [016] Chris Stussy - The Streets Is Where I'm From\n" +
                  "# [021] ''? - Untitled (B1)''\n" +
                  "# [064] ?\n" +
                  "# [089] ''Chloé Caillet - ?''\n" +
                  "# [098] Costigane - Camera Tricks [Sense]\n" +
                  "# [116] Weekend Players - Into The Sun [Multiply]",
        candidate: "# [002] Alex Cortex - Discola [Housewax]\n" +
                   "# [016] Chris Stussy - The Streets Is Where I'm From\n" +
                   "# [021] ''? - B1 [Mask]''\n" +
                   "# [064] Vil-N-X Feat. Jacqui Gray - De' Jah Voo (Rendezvous Mix) [Island Noyze]\n" +
                   "# [089] Chloé Caillet & Luke Alessi Feat. Jocelyn Brown - The One [Disorder]\n" +
                   "# [098] Brendan Costigane - Camera Tricks [Sense]\n" +
                   "# [116] Weekend Players - Into The Sun [Multiply]",
        expect: "[002] Alex Cortex - Discola [Housewax]\n" +
                "[016] Chris Stussy - The Streets Is Where I'm From\n" +
                "[021] ? - Untitled (B1) [Mask]\n" +
                "[064] Vil-N-X Feat. Jacqui Gray - De' Jah Voo (Rendezvous Mix) [Island Noyze]\n" +
                "[089] Chloé Caillet & Luke Alessi Feat. Jocelyn Brown - The One [Disorder]\n" +
                "[098] Costigane - Camera Tricks [Sense]\n" +
                "[116] Weekend Players - Into The Sun [Multiply]",
        changed: true,
        // everything the candidate carries found its place - the page's own spellings winning
        // is not a part the merge could not place
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Reported 2026-08-27 (fibre podcast bman 011, trackid.net): the unknown cues of a
        // CUE-LESS original. Two things were wrong with them.
        //   1. Width: with no cue of its own the page had no format to win with, and the
        //      fallback wrote a two-digit "[??]" between the candidate's three-digit cues. The
        //      candidate's format is borrowed when the original has none.
        //   2. Digits: an unknown between [000] and [005] can only be a 00x minute, so it reads
        //      "[00?]" – the same "[09?]" / "[10?]" between [095]/[098] and [104]/[109]. What
        //      the two bounds do NOT agree on stays "?"; the row behind the last known cue is
        //      not bounded at all and keeps every "?" it has.
        name: "unknown cues of a cue-less original",
        original: "# A - One\n" +
                  "# B - Two\n" +
                  "# C - Three\n" +
                  "# D - Four\n" +
                  "# E - Five\n" +
                  "# F - Six\n" +
                  "# G - Seven",
        candidate: "# [000] A - One\n" +
                   "# [005] C - Three\n" +
                   "# [095] D - Four\n" +
                   "# [098] F - Six\n" +
                   "# [104] G - Seven",
        expect: "[000] A - One\n" +
                "[00?] B - Two\n" +
                "[005] C - Three\n" +
                "[095] D - Four\n" +
                "[09?] E - Five\n" +
                "[098] F - Six\n" +
                "[104] G - Seven",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Reported 2026-08-27 (fibre podcast sigint 014, trackid.net): the two ends of a
        // cue-less original.
        //   1. The FIRST row came out "[0?]" - inferred from minute zero and the candidate's
        //      [03]. But it is not inferred at all: the first row of a tracklist is where the
        //      recording starts, so it IS [00].
        //   2. The LAST row came out "[??]": nothing follows it, so the prefix rule had no
        //      upper bound. The mix RUNTIME is that bound - 1:04:54 behind a [61] leaves only
        //      minutes 61 to 64, all of them "6x", so it reads "[6?]".
        name: "first row is minute zero, the runtime bounds the last",
        durationSec: 3894, // 1:04:54, the duration TrackId.net prints above the tracklist
        original: "# Kushkusshhh - Revive [Unreleased]\n" +
                  "# Kangding Ray - TARO\n" +
                  "# Kushkusshhh - Drowning\n" +
                  "# Ali Bilal - Wayfarer [Unreleased]\n" +
                  "# Ottagone - Ottagone 016\n" +
                  "# Ket Robinson - Siren Call (JakoJako Remix) [KR]\n" +
                  "# ASEC - Quiet [Quiet Details]\n" +
                  "# Delano Legito - Therapeutic Range [Float]\n" +
                  "# Cleric - Unwritten Future (Cleric 10/10 Remix) [Clergy]\n" +
                  "# Temudo - Live Extract 2.11 (Edit) [Clergy]\n" +
                  "# Lindsey Herbert - Aussetzung Der Zeit [Clergy]\n" +
                  "# Cleric X Dax J - Sirius (Cleric 9/10 Remix) [Clergy]\n" +
                  "# VSK - Exit [Clergy]\n" +
                  "# N\u00f8rbak - Your Heroes May Fail You [Dynamic Reflection]\n" +
                  "# B\u00d8HM - Nonlinear System [Fever]\n" +
                  "# N\u00f8rbak - Norma (VIL Remix) [NRBK]\n" +
                  "# Ottagone - Ottagone 021\n" +
                  "# Ebass - Anthem [SK_Eleven]",
        candidate: "[00] ?\n" +
                   "...\n" +
                   "[03] Kangding Ray - Taro [Ara]\n" +
                   "[09] Kushkusshhh - Drowning [Diffuse Reality]\n" +
                   "...\n" +
                   "[17] Ottagone - Ottagone 016 [Will & Ink]\n" +
                   "[20] Ket Robinson - Siren Call (JakoJako Remix) [KR]\n" +
                   "[24] ?\n" +
                   "...\n" +
                   "[28] Delano Legito - Therapeutic Range\n" +
                   "[31] Cleric - Unwritten Future (Cleric 10/10 Remix) [Clergy]\n" +
                   "[34] Temudo - Live Extract 2.11 [Edit] - Clergy]\n" +
                   "[40] Lindsey Herbert - Aussetzung Der Zeit [Clergy]\n" +
                   "[43] Cleric & Dax J - Sirius (Cleric 9/10 Remix) [Clergy]\n" +
                   "[46] VSK - Exit [Clergy]\n" +
                   "[50] ?\n" +
                   "...\n" +
                   "[53] B\u00d8HM - Nonlinear System [Fever]\n" +
                   "[58] N\u00f8rbak - Norma (VIL Remix) [NRBK]\n" +
                   "[61] Ottagone - Ottagone 021 [Will & Ink]",
        expect: "[00] Kushkusshhh - Revive [Unreleased]\n" +
                "[03] Kangding Ray - TARO [Ara]\n" +
                "[09] Kushkusshhh - Drowning [Diffuse Reality]\n" +
                "[??] Ali Bilal - Wayfarer [Unreleased]\n" +
                "[17] Ottagone - Ottagone 016 [Will & Ink]\n" +
                "[20] Ket Robinson - Siren Call (JakoJako Remix) [KR]\n" +
                "[24] ASEC - Quiet [Quiet Details]\n" +
                "[28] Delano Legito - Therapeutic Range [Float]\n" +
                "[31] Cleric - Unwritten Future (Cleric 10/10 Remix) [Clergy]\n" +
                "[34] Temudo - Live Extract 2.11 (Edit) [Clergy]\n" +
                "[40] Lindsey Herbert - Aussetzung Der Zeit [Clergy]\n" +
                "[43] Cleric X Dax J - Sirius (Cleric 9/10 Remix) [Clergy]\n" +
                "[46] VSK - Exit [Clergy]\n" +
                "[50] N\u00f8rbak - Your Heroes May Fail You [Dynamic Reflection]\n" +
                "[53] B\u00d8HM - Nonlinear System [Fever]\n" +
                "[58] N\u00f8rbak - Norma (VIL Remix) [NRBK]\n" +
                "[61] Ottagone - Ottagone 021 [Will & Ink]\n" +
                "[6?] Ebass - Anthem [SK_Eleven]",
        changed: true,
        // line 1 is the candidate's "[00] ?" - a gap-less original takes no unknown rows, so
        // its cue stays unplaced (the [00] on the first row is our own rule, not that row's),
        // and line 12's label is the "[Edit] - Clergy]" TrackId.net mangled the Temudo row
        // into, which the page's own "[Clergy]" wins against
        unused: { cues: [1], texts: [], labels: [12] }
    },
    {
        // The two ends again, in the cases where nothing may be written:
        //   - a leading "..." says tracks are missing BEFORE the first row, so it did not
        //     start the mix and keeps its "[??]"
        //   - no runtime came along (every site but TrackId.net so far), so nothing bounds the
        //     rows behind the last known cue either
        name: "leading gap and no runtime leave both ends unknown",
        original: "...\n# A - One\n# B - Two\n# C - Three",
        candidate: "...\n[20] B - Two [L2]",
        expect: "...\n[??] A - One\n[20] B - Two [L2]\n[??] C - Three",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Reported 2026-08-27 (Luke Slater @ The Lot Radio 2026-06-13, trackid.net -> curid
        // 748401): the merge filled both of the page's holes with the candidate's rows and left
        // the two "..." standing, where the cues around them no longer leave room for a missing
        // track. The list's median runtime is 4 minutes, so a "..." has to span more than 6:
        // the 5 minute hole ([10] -> [15]) and the 3 minute one ([28] -> [31]) go, the 7 minute
        // ([31] -> [38]) and 9 minute ([41] -> [50]) ones stay.
        name: "gaps the merged cues leave no room for are dropped",
        durationSec: 3407, // 0:56:47, the duration TrackId.net prints above the tracklist
        original: "[00] ?\n" +
                  "...\n" +
                  "[15] Planetary Assault Systems - Retina Burn\n" +
                  "[19] Shinedoe - Dillema (Alexander Kowalski Pressure Point Remix)\n" +
                  "...\n" +
                  "[31] Planetary Assault Systems - Devotion",
        candidate: "[00] Planetary Assault Systems - Sermon Of The Light Tides [Ostgut Ton]\n" +
                   "[06] Planetary Assault Systems - Labyrinth [Ostgut Ton]\n" +
                   "[10] ?\n" +
                   "...\n" +
                   "[16] Planetary Assault Systems - Retina Burn [Ostgut Ton]\n" +
                   "[20] Shinedoe - Dillema (Alexander Kowalski Pressure Point Remix) [MTM]\n" +
                   "[24] Planetary Assault Systems - Thunder Major [Ostgut Ton]\n" +
                   "[28] ?\n" +
                   "...\n" +
                   "[32] Planetary Assault Systems - Devotion [Token]\n" +
                   "...\n" +
                   "[38] Uncertain - Phrase [Symbolism]\n" +
                   "[41] Dorbachov - Ellesmere Street (Invexis Remix) [SCRAP & DELETE]\n" +
                   "...\n" +
                   "[50] Kevin Saunderson & Tronikhouse - Smooth Groove [KMS (BEAT Music Fund)]\n" +
                   "[52] Seamus Haji - The Big Bang Theory (Satellite Club) [Big Love]\n" +
                   "[56] Albert Salvatierra - Cypsela [Truncate]",
        expect: "[00] Planetary Assault Systems - Sermon Of The Light Tides [Ostgut Ton]\n" +
                "[06] Planetary Assault Systems - Labyrinth [Ostgut Ton]\n" +
                "[10] ?\n" +
                "[15] Planetary Assault Systems - Retina Burn [Ostgut Ton]\n" +
                "[19] Shinedoe - Dillema (Alexander Kowalski Pressure Point Remix) [MTM]\n" +
                "[24] Planetary Assault Systems - Thunder Major [Ostgut Ton]\n" +
                "[28] ?\n" +
                "[31] Planetary Assault Systems - Devotion [Token]\n" +
                "...\n" +
                "[38] Uncertain - Phrase [Symbolism]\n" +
                "[41] Dorbachov - Ellesmere Street (Invexis Remix) [SCRAP & DELETE]\n" +
                "...\n" +
                "[50] Kevin Saunderson & Tronikhouse - Smooth Groove [KMS (BEAT Music Fund)]\n" +
                "[52] Seamus Haji - The Big Bang Theory (Satellite Club) [Big Love]\n" +
                "[56] Albert Salvatierra - Cypsela [Truncate]",
        changed: true,
        // nothing is left over: the candidate's [16], [20] and [32] lose against the page's own
        // [15], [19] and [31], but one minute apart is well inside tlImporter_cueToleranceSec,
        // so there is nothing in them worth salvaging by hand
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // The same rule in the small, and its two stand-downs. Here it fires: median 4 minutes,
        // the "..." between [12] and [15] spans 3 and goes.
        name: "a gap below the median runtime goes",
        original: "[00] A - One\n[04] B - Two\n[08] C - Three\n[12] D - Four\n...\n[15] E - Five\n[20] F - Six",
        candidate: "[00] A - One [L1]\n[04] B - Two\n[08] C - Three\n[12] D - Four\n[15] E - Five\n[20] F - Six",
        expect: "[00] A - One [L1]\n[04] B - Two\n[08] C - Three\n[12] D - Four\n[15] E - Five\n[20] F - Six",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Stand-down 1: the very same list plus one cue-less row at the end. Its "[??]" makes
        // every distance around it a guess, so no median may be built and the gap stays.
        name: "an unknown cue stands the gap check down",
        original: "[00] A - One\n[04] B - Two\n[08] C - Three\n[12] D - Four\n...\n[15] E - Five\n[20] F - Six\nG - Seven",
        candidate: "[00] A - One [L1]\n[04] B - Two\n[08] C - Three\n[12] D - Four\n[15] E - Five\n[20] F - Six",
        expect: "[00] A - One [L1]\n[04] B - Two\n[08] C - Three\n[12] D - Four\n...\n[15] E - Five\n[20] F - Six\n[??] G - Seven",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Stand-down 2: two tracks with the gap between them are no sample at all - there is no
        // gapless neighbour distance to take a median of, so nothing is judged.
        name: "too few gapless neighbours leave the gap alone",
        original: "[00] A - One\n...\n[03] B - Two",
        candidate: "[00] A - One [L1]\n[03] B - Two",
        expect: "[00] A - One [L1]\n...\n[03] B - Two",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Reported 2026-08-27 (Invite's Choice Podcast 224 Exos, trackid.net): four candidate
        // tracks the merge could not PLACE, placed anyway. [07], [13], [14] and [24] found no
        // match, so the insert scan looked for the first original row with a bigger cue - which
        // is [34] Lucy, the first row the merge had matched at all - and dropped all four
        // directly in front of it, behind the 18 cue-less rows the page lists before it. Three
        // of them are near-duplicates of rows inside that very block (Ozy - Sacred Family,
        // IN SYNC - Jam Tapes 3, and one of the five "Artist - ?" rows), which is what a guessed
        // position costs. See tlImporter_insertMaxUnplacedRows: a row is inserted only where the
        // merge can order it, otherwise it stays highlighted in the Candidate column for the
        // reader to place by hand.
        //
        // What still lands: [42] steps over ONE cue-less row (Gimme Acid, between the matched
        // [40] and [43]), and [52] is appended behind the last row, where no other slot exists.
        name: "unplaceable candidate rows are left to the reader",
        durationSec: 4974, // 1:22:54
        original: 
                  "# Staffan Linzatti - Intro\n" +
                  "# ''Yagya - ? [Unreleased''\n" +
                  "# ''Exos & Oculus - ? [Unreleased''\n" +
                  "# Exos - Q Box [Thule 10]\n" +
                  "# ''Thor - ? [Unreleased''\n" +
                  "# ''Exos - ?[Unreleased''\n" +
                  "# Plastik - Thule 11\n" +
                  "# Ozy - Sacred Family - Strobelight Network 002\n" +
                  "# Exos & Ohm - FróðiOctal Industries [Unreleased]\n" +
                  "# Steve O'Sullivan - Where's Burt (Thor Remix)\n" +
                  "# ''Exos - Unreleased''\n" +
                  "# Exos - With The (Oculus Remix)\n" +
                  "# Delano Smith - Behind The Shadows (Steve O'Sullivan Remix)\n" +
                  "# IN SYNC - Jam Tapes 3\n" +
                  "# ''Bjarki - ? [Unreleased''\n" +
                  "# Sanasol - Glow\n" +
                  "# Spankey Rodgers - Digit Fidgit\n" +
                  "# Octal / Ruxpin - Unreleased Remix\n" +
                  "# Lucy - Sana Sana Sana Cura Cura Cura\n" +
                  "# Thomas Hessler - Perception\n" +
                  "# Nina Kraviz - IMPRV\n" +
                  "# Yaleesa Hall - First Leyland\n" +
                  "# Bjarki - Gimme Acid [Trip 001]\n" +
                  "# Bjarki - I Wanna Go Bang [Trip - 003]\n" +
                  "# Exos - Red Dragon [Unreleased]\n" +
                  "# ''Hidden People - ? [Unreleased''\n" +
                  "# Splice - Syncussion [Unreleased]\n" +
                  "# Dajae - Day By Day (Green Velvet Mix)\n" +
                  "# Samuli Kemppi - Power Of Voltages\n" +
                  "# Exos - Do Not Sleep 1 (KID Mistik Remix)\n" +
                  "# Soul Is Back - Luke Slater Remix\n" +
                  "# Aubrey - Grimson Nebular (Exos Remix)\n" +
                  "# Planetary Assault Systems - No Exit\n" +
                  "# Kwartz - Hole\n" +
                  "# Lewis Fautzi - Big Bang\n" +
                  "# Petter B - Edit Pilaf\n" +
                  "# Lewis Fautzi - Range\n" +
                  "# Hector Oaks - No One Tale\n" +
                  "# Steve Bicknell - Lost Recordings\n" +
                  "# Ben Buitendijk - Colourblind\n" +
                  "# Echoplex - Warglass [Unreleased]\n" +
                  "# Valmay - Minor A 10\n" +
                  "# Ben Sims - Corsica [Forthcoming]\n" +
                  "# Taken - B (Halcyon) [Unreleased]\n" +
                  "# Jeff Mills - Spiral Therapy\n" +
                  "# Ozy - Klukka",
        candidate: 
                   "[00] ?\n" +
                   "...\n" +
                   "[07] Exos - Áttfalt [X/OZ Music]\n" +
                   "...\n" +
                   "[13] Plastic - Most Unusual [Inner State]\n" +
                   "[14] Ozy - Sagrada Familia [X/OZ Music]\n" +
                   "...\n" +
                   "[24] Insync - Jam Tape 1991 Cut 3 [Third Ear]\n" +
                   "[27] ?\n" +
                   "...\n" +
                   "[34] Lucy - Sana Sana Sana Cura Cura Cura [Token]\n" +
                   "[37] Thomas Hessler - Perception [Index Marcel Fengler]\n" +
                   "[38] Nina Kraviz - Imprv [Trip]\n" +
                   "[40] Yaleesa Hall - First Leyland\n" +
                   "[42] Bjarki - Polygon Pink Toast [Trip]\n" +
                   "[43] Bjarki - I Wanna Go Bang [Trip]\n" +
                   "[46] ?\n" +
                   "...\n" +
                   "[52] Soul Designer - The Soul Is Back (Luke Slater Remix)\n" +
                   "...",
        expect: 
                "[00] Staffan Linzatti - Intro\n" +
                "[??] Yagya - ? [Unreleased\n" +
                "[??] Exos & Oculus - ? [Unreleased\n" +
                "[??] Exos - Q Box [Thule 10]\n" +
                "[??] Thor - ? [Unreleased\n" +
                "[??] Exos - ?[Unreleased\n" +
                "[??] Plastik - Thule 11\n" +
                "[??] Ozy - Sacred Family - Strobelight Network 002\n" +
                "[??] Exos & Ohm - FróðiOctal Industries [Unreleased]\n" +
                "[??] Steve O'Sullivan - Where's Burt (Thor Remix)\n" +
                "[??] Exos - Unreleased\n" +
                "[??] Exos - With The (Oculus Remix)\n" +
                "[??] Delano Smith - Behind The Shadows (Steve O'Sullivan Remix)\n" +
                "[??] IN SYNC - Jam Tapes 3\n" +
                "[??] Bjarki - ? [Unreleased\n" +
                "[??] Sanasol - Glow\n" +
                "[??] Spankey Rodgers - Digit Fidgit\n" +
                "[??] Octal / Ruxpin - Unreleased Remix\n" +
                "[34] Lucy - Sana Sana Sana Cura Cura Cura [Token]\n" +
                "[37] Thomas Hessler - Perception [Index Marcel Fengler]\n" +
                "[38] Nina Kraviz - IMPRV [Trip]\n" +
                "[40] Yaleesa Hall - First Leyland\n" +
                "[4?] Bjarki - Gimme Acid [Trip 001]\n" +
                "[42] Bjarki - Polygon Pink Toast [Trip]\n" +
                "[43] Bjarki - I Wanna Go Bang [Trip - 003]\n" +
                "[46] Exos - Red Dragon [Unreleased]\n" +
                "[??] Hidden People - ? [Unreleased\n" +
                "[??] Splice - Syncussion [Unreleased]\n" +
                "[??] Dajae - Day By Day (Green Velvet Mix)\n" +
                "[??] Samuli Kemppi - Power Of Voltages\n" +
                "[??] Exos - Do Not Sleep 1 (KID Mistik Remix)\n" +
                "[??] Soul Is Back - Luke Slater Remix\n" +
                "[??] Aubrey - Grimson Nebular (Exos Remix)\n" +
                "[??] Planetary Assault Systems - No Exit\n" +
                "[??] Kwartz - Hole\n" +
                "[??] Lewis Fautzi - Big Bang\n" +
                "[??] Petter B - Edit Pilaf\n" +
                "[??] Lewis Fautzi - Range\n" +
                "[??] Hector Oaks - No One Tale\n" +
                "[??] Steve Bicknell - Lost Recordings\n" +
                "[??] Ben Buitendijk - Colourblind\n" +
                "[??] Echoplex - Warglass [Unreleased]\n" +
                "[??] Valmay - Minor A 10\n" +
                "[??] Ben Sims - Corsica [Forthcoming]\n" +
                "[??] Taken - B (Halcyon) [Unreleased]\n" +
                "[??] Jeff Mills - Spiral Therapy\n" +
                "[??] Ozy - Klukka\n" +
                "[52] Soul Designer - The Soul Is Back (Luke Slater Remix)",
        changed: true,
        // the four unplaceable rows (3, 5, 6, 8) plus the "?" rows a gap-less original takes
        // none of (1, 9) - and line 16's label, which loses against the page's own "[Trip - 003]"
        unused: { cues: [1, 3, 5, 6, 8, 9], texts: [3, 5, 6, 8], labels: [3, 5, 6, 8, 16] }
    },
    {
        // Artist and title the other way round on the page: the crosswise compare of step 2c
        // finds the row and the CANDIDATE wins the text - the halves are the same, only their
        // order was wrong. Without it the candidate was inserted as a second row.
        // Reported: Groove Podcast 498 Doudou MD, trackid.net.
        name: "swapped artist and title match, the candidate turns them round",
        original: "[20] A - One\nCaprock - Majestic\n[33] B - Two",
        candidate: "[20] A - One\n[29] Majestic - Caprock [Taste]\n[33] B - Two",
        expect: "[20] A - One\n[29] Majestic - Caprock [Taste]\n[33] B - Two",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // Same case with the Discogs disambiguation number still on the artist ("Majestic (3)"):
        // it takes no part in the comparison, so the swap is found either way. The number does
        // ride into the page here - the sending site strips it, this file only ignores it.
        name: "a Discogs artist number does not stop the swap match",
        original: "[20] A - One\nCaprock - Majestic\n[33] B - Two",
        candidate: "[20] A - One\n[29] Majestic (3) - Caprock [Taste]\n[33] B - Two",
        expect: "[20] A - One\n[29] Majestic (3) - Caprock [Taste]\n[33] B - Two",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // The swapped halves do not have to be written identically - the version stripper's
        // emptied bracket is dropped before comparing, so "City Lights (Edit)" meets the page's
        // "Citylights" at 0.91 instead of 0.67.
        name: "swap match survives a loose half",
        original: "[20] A - One\nCitylights - Compass\n[33] B - Two",
        candidate: "[20] A - One\n[29] Compass - City Lights (Edit) [Cabinet]\n[33] B - Two",
        expect: "[20] A - One\n[29] Compass - City Lights (Edit) [Cabinet]\n[33] B - Two",
        changed: true,
        unused: { cues: [], texts: [], labels: [] }
    },
    {
        // The straight reading wins where there is one: a swap must never turn a row round that
        // both sides already agree on, and the crosswise compare must not reach across rows -
        // "One - A" is NOT the page's "A - One" turned round when the page has both.
        name: "swap does not touch rows that match straight",
        original: "[20] A - One\n[29] One - A",
        candidate: "[20] A - One [L1]\n[29] One - A [L2]",
        expect: "[20] A - One [L1]\n[29] One - A [L2]",
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
        // The mix runtime out of the page's own "File details" table (fibre podcast sigint 014):
        // the second source for the bound of the last cues, and the one that is there whatever
        // the link carried. durationSec 0 on every case without such a table.
        name: "the File details table carries the mix runtime",
        pageText: "{|{{NormalTableFormat}}\n! dur\n! MB\n! kbps\n|-\n| 1:04:54\n| \n| \n|}\n\n" +
                  "== Tracklist ==\n\n# [00] A - One\n\n[[Category:2026]]",
        durationSec: 3894,
        hasTracks: true,
        extracted: "# [00] A - One",
        tl: "# [00] A - One\n# [61] B - Two",
        expect: "{|{{NormalTableFormat}}\n! dur\n! MB\n! kbps\n|-\n| 1:04:54\n| \n| \n|}\n\n" +
                "== Tracklist ==\n\n# [00] A - One\n# [61] B - Two\n\n[[Category:2026]]"
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
