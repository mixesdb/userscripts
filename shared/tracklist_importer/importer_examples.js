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
                "...\n" +
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
        // included. The duplicate insertions (Hiroshi Watanabe next to Hiroshi W., FLR - PART 8
        // next to FLR - Easy Filter Part 8, ――――― - IN YER MEMORY next to Takkyu Ishino's) are
        // the fuzzy threshold's current reading, NOT part of the guard – a later matching
        // improvement may change those lines.
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
                "[???] Hiroshi W. - Lost City\n" +
                "[???] Yoshinori Sunahara - MFRFM (Bounce 2 Mix)\n" +
                "[???] Hiroki Esashika - Kazane\n" +
                "[???] DJ Tasaka - Loopa Trooper\n" +
                "[???] Kagami - Tokyo Disco Music All Night Long\n" +
                "[???] Moa - Malicia Mpedia\n" +
                "[009] Hiroshi Watanabe - Lost City [King Street Sounds]\n" +
                "[026] Takkyu Ishino - Feeling\n" +
                "[???] Co-Fusion - Tokyo Funky Beat!\n" +
                "[???] Zank - Dow\n" +
                "[033] Ryukyudisko - Super Spin Spam\n" +
                "[???] The Anazaworld - Horse Direct\n" +
                "[???] DJ Shufflemaster - Untitled\n" +
                "[042] Co-Fusion - Cycle [Musicmine]\n" +
                "[???] Fumiya Tanaka - Micro One\n" +
                "[???] Q'Hey - Login\n" +
                "[???] Subvoice - Untitled\n" +
                "[???] Takaaki Itoh - Serenity Through Pain\n" +
                "[???] Go Hiyama - C\n" +
                "[061] Kazu Kimura - Night Walk [CLR]\n" +
                "[???] Akira Ishihara - Yamaga 7 O'Clock\n" +
                "[???] Brothers In Raw (Tobynation & Mijk Van Dijk) - Ach-So! (Ebizoo Remix)\n" +
                "[???] Chester Beatty - Untitled (Turia B1)\n" +
                "[???] Kagami - Tiger Track\n" +
                "[???] FLR - Easy Filter Part 8\n" +
                "[073] FLR - PART 8 [70Drums]\n" +
                "[076] Dr. Shingo - Galaxy Girls [Konsequent]\n" +
                "[082] Chizawa - Panther\n" +
                "[087] Nagai Eri - Howlin' Yumi [ACV]\n" +
                "[???] Jin Hiyama - Exorista Japonica\n" +
                "[???] Ryoh Mitomi - Haru-Kaze\n" +
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
        // the only sign that the 2:00:17 stream runs on past it.
        unused: { cues: [2, 7, 10, 13], texts: [], labels: [] }
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
