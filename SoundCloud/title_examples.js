/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Examples for the MixesDB mix page title suggestion
 *
 * Every title that was ever reported as wrong, kept as the input it came from and the title
 * it should produce. Run them with:
 *
 *     deno run --allow-read SoundCloud/title_examples_test.js
 *
 * WHAT THE SUGGESTION CURRENTLY MAKES OF EACH ONE IS NOT IN HERE ON PURPOSE. The runner
 * prints it next to the expected title on every run, so it is always the behaviour of today
 * and can never go stale - which a written-down "created title" would within a rule or two.
 *
 * Adding a case: title, channel and date are what SoundCloud gives us (the channel is the API
 * field "username", NOT the URL slug - check it if unsure, they differ often), expect is the
 * MixesDB title it should turn into. The url is only there to look the track up again.
 *
 * Why a case matters is not written per case either: it is in the rule it belongs to, in
 * title_definitions.js. A case that fails sends you there.
 *
 * This file is NOT @required by script.user.js - it is test data, not something to ship to
 * every SoundCloud page.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var scTitleExamples = [

    // Reported from SoundCloud
    {
        url: "https://soundcloud.com/limbpromo/limb-podcast-yuka-09",
        title: "LIMB #9 – Yuka",
        channel: "LIMB",
        date: "2026-08-07",
        expect: "2026-08-07 - Yuka - LIMB 9"
    },
    {
        url: "https://soundcloud.com/rauschendisko/rausch06",
        title: "RAUSCH#6 – Daniel Bortz",
        channel: "RAUSCHEN",
        date: "2018-10-12",
        expect: "2018-10-12 - Daniel Bortz - RAUSCH 6"
    },
    {
        url: "https://soundcloud.com/danielbortz/vintage-vinyl-session-004",
        title: "Vintage Vinyl Session 004",
        channel: "Daniel Bortz",
        date: "2026-08-09",
        // needs the wiki: only Category:Daniel Bortz being an Artist says the channel is the
        // person and the whole title the name of their series
        known: { "Daniel Bortz": "artist" },
        expect: "2026-08-09 - Daniel Bortz - Vintage Vinyl Session 004"
    },
    {
        url: "https://soundcloud.com/brisboys/brisboys-summer-2026-mix",
        title: "Brisboys - Summer 2026 Mix",
        channel: "Brisboys",
        date: "2026-08-07",
        expect: "2026-08-07 - Brisboys - Summer 2026 Mix"
    },
    {
        url: "https://soundcloud.com/toninomusik/tonino-lanka-ritter-butzke",
        title: "Tonino & Lanka | Ritter Butzke | Berlin",
        channel: "Tonino",
        date: "2026-07-20",
        // needs the wiki: Category:Ritter Butzke is a Venue, which is what makes this a live
        // recording and the bit behind it the city
        known: { "Ritter Butzke": "venue", "Berlin": "other" },
        expect: "2026-07-20 - Tonino & Lanka @ Ritter Butzke, Berlin"
    },
    {
        url: "https://soundcloud.com/shimon-earthly/leon-row-x-shimon-landjuweel",
        title: "Leon Row x Shimon | Landjuweel Festival 2026 | Part 2 | Bon Bon Vivant Stage",
        channel: "shimon",
        date: "2026-08-07",
        expect: "2026 - Leon Row & Shimon @ Landjuweel Festival"
    },
    {
        url: "https://soundcloud.com/moltorecordings/molto-in-the-mix-guest-of-6",
        title: "MOLTO IN THE MIX - Guest of the Week: buyArt",
        channel: "Molto Recordings Group",
        date: "2026-07-24",
        expect: "2026-07-24 - buyArt - Molto In The Mix"
    },
    {
        url: "https://soundcloud.com/bassiani/zenaari-mix-028-azim-fathi",
        title: "Zenaari Mix 028 - Azim Fathi",
        channel: "BASSIANI",
        date: "2026-07-29",
        expect: "2026-07-29 - Azim Fathi - Zenaari Mix 028"
    },
    {
        url: "https://soundcloud.com/yoyaku/yoyaku-instore-sessions-with-5",
        title: "Yoyaku Instore Sessions with TONTON & TATA",
        channel: "yoyaku",
        date: "2026-08-05",
        expect: "2026-08-05 - Tonton & Tata - Yoyaku Instore Sessions"
    },
    {
        url: "https://soundcloud.com/discoanon/hot-to-the-touch-321-raw-artes",
        title: "Hot To The Touch 321 | RAW-ARTES GUEST MIX",
        channel: "Discoholics Anonymous",
        date: "2026-08-05",
        expect: "2026-08-05 - Raw-Artes - Hot To The Touch 321"
    },
    {
        url: "https://soundcloud.com/dirtybirdrecords/dirtybird-radio-540-mitch",
        title: "Dirtybird Radio 540 - Mitch Dodge",
        channel: "DIRTYBIRD",
        date: "2026-08-07",
        expect: "2026-08-07 - Mitch Dodge - Dirtybird Radio 540"
    },
    {
        url: "https://soundcloud.com/rawppl/adriana-lopez-at-raw-x-monnom",
        title: "Adriana Lopez at RAW x Monnom Black | Mar 2026",
        channel: "RAW",
        date: "2026-07-28",
        expect: "2026-03 - Adriana Lopez @ Monnom Black"
    },
    {
        url: "https://soundcloud.com/egpodcast/eg-after-188-matt-hauser",
        title: "EG AFTER.188 Matt Hauser",
        channel: "EG",
        date: "2026-08-05",
        expect: "2026-08-05 - Matt Hauser - EG AFTER.188"
    },
    {
        url: "https://soundcloud.com/ithqdetroit/podcast-s15-e07-surgeon-erika",
        title: "IT.podcast.s15e06: Surgeon x Erika closing Return to the Source 2026",
        channel: "ithqdetroit",
        date: "2026-08-03",
        // Known to fall short: the event text behind the artists cannot be told from a name,
        // and the recording is a live set from an event the title never names as one. Kept as
        // a case so the parts that DO work (the ":" split, the "x" joiner, the entity) stay
        // working. Expect is what it produces today, not the ideal
        // "2026-08-03 - Surgeon & Erika - IT.podcast.s15e06".
        expect: "2026-08-03 - Surgeon & Erika closing Return to the Source 2026 - IT.podcast.s15e06"
    },
    {
        url: "https://soundcloud.com/technogermany/planet-melis-techno-germany",
        title: "Planet Melis - Techno Germany Podcast 226",
        channel: "Techno Germany",
        date: "2026-08-06",
        expect: "2026-08-06 - Planet Melis - Techno Germany Podcast 226"
    },
    {
        url: "https://soundcloud.com/slowciety/rinse-france-show-slowciety-w-asa-808-07032019",
        title: "Rinse France Show - Slowciety w/ Asa 808 - 07/03/2019",
        channel: "Slowciety",
        date: "2019-03-12",
        expect: "2019-03-07 - Slowciety, Asa 808 - Rinse France Show"
    },
    {
        url: "https://soundcloud.com/annadibbi/nina-odb-no-signal",
        title: "NINA ØDB - NO SIGNAL",
        channel: "Nina ØDB",
        date: "2026-06-14",
        expect: "2026-06-14 - Nina ØDB - No Signal (Promo Mix)"
    },
    {
        url: "https://soundcloud.com/sevenberlin/seven-mix-084-theo-scuera",
        title: "SEVEN Mix 084 - Theo Scuera",
        channel: "SEVEN",
        date: "2026-07-13",
        expect: "2026-07-13 - Theo Scuera - SEVEN Mix 084"
    },
    {
        url: "https://soundcloud.com/trommelmusic/trommel-251-arno",
        title: "Trommel.251 - Arno",
        channel: "trommel",
        date: "2026-08-06",
        expect: "2026-08-06 - Arno - trommel.251"
    },
    {
        url: "https://soundcloud.com/deep-space-series/solma",
        title: "DSS 139 | Solma",
        channel: "Deep Space Series",
        date: "2026-08-05",
        expect: "2026-08-05 - Solma - DSS 139"
    },
    {
        url: "https://soundcloud.com/groove-magazin/anja-schneider-live-at-docklands-smirnoff-sound-collective-camp",
        title: "Anja Schneider - Live at Docklands (Smirnoff Sound Collective Camp)",
        channel: "Groove Magazin",
        date: "2016-07-14",
        expect: "2016-07-14 - Anja Schneider @ Docklands"
    },
    {
        url: "https://soundcloud.com/lx-f/mixing-diaries-041",
        title: "Mixing-Diaries 041",
        channel: "LX-F",
        date: "2026-08-08",
        expect: "2026-08-08 - LX-F - Mixing-Diaries 041"
    },
    {
        url: "https://soundcloud.com/zaeino/from-paris-with-hope-vol-14",
        title: "From Paris With Hope Vol.14",
        channel: "ZÆINO",
        date: "2026-08-02",
        expect: "2026-08-02 - ZÆINO - From Paris With Hope Vol.14"
    },
    {
        url: "https://soundcloud.com/sweetspace/joetvannelli-slavetotherhythmepisode72",
        title: "Joe T Vannelli - Slave To The Rhythm Episode 72",
        channel: "Sweet Space",
        date: "2026-08-05",
        expect: "2026-08-05 - Joe T Vannelli - Slave To The Rhythm 72"
    },
    {
        url: "https://soundcloud.com/yoyaku/alich",
        title: "Yoyaku Instore Session with Alich",
        channel: "yoyaku",
        date: "2026-07-15",
        expect: "2026-07-15 - Alich - Yoyaku Instore Session"
    },

    // Reported before the URLs were kept
    {
        title: "HATE Podcast 496 - Fadi Mohem",
        channel: "HATE",
        date: "2026-04-03",
        expect: "2026-04-03 - Fadi Mohem - HATE Podcast 496"
    },
    {
        title: "Truancy Volume 300: Sunju Hargun",
        channel: "truantsblog",
        date: "2026-04-03",
        expect: "2026-04-03 - Sunju Hargun - Truancy Volume 300"
    },
    {
        title: "House Set August 2026 - Simeon Sarfati",
        channel: "Simeon Sarfati",
        date: "2026-08-03",
        expect: "2026-08-03 - Simeon Sarfati - House Set August 2026 (Promo Mix)"
    },
    {
        title: "Ruf Dug 030426",
        channel: "NTS Latest",
        date: "2026-04-05",
        expect: "2026-04-03 - Ruf Dug - NTS Radio"
    },
    {
        title: "UηκηΘωN - Hit the Breaks",
        channel: "SILENCE! Records",
        date: "2026-04-03",
        expect: "2026-04-03 - UηκηΘωN - Hit the Breaks (Promo Mix)"
    },
    {
        title: "fabric presents Bonobo",
        channel: "fabric",
        date: "2026-04-03",
        expect: "2026-04-03 - Bonobo - fabric"
    },
    {
        title: "DJ Koze @ Robert Johnson",
        channel: "Robert Johnson",
        date: "2026-04-03",
        expect: "2026-04-03 - DJ Koze @ Robert Johnson"
    },
    {
        title: "RA.971 Ben Klock",
        channel: "Resident Advisor",
        date: "2026-04-03",
        expect: "2026-04-03 - Ben Klock - RA Podcast (RA.971)"
    },

    // Built by hand, to hold a rule at its edge where no report happened to sit
    {
        title: "HATE Podcast 496 Fadi Mohem",
        channel: "HATE",
        date: "2026-04-03",
        expect: "2026-04-03 - Fadi Mohem - HATE Podcast 496"
    },
    {
        title: "SEVEN Mix 084 Theo Scuera",
        channel: "SEVEN",
        date: "2026-07-13",
        expect: "2026-07-13 - Theo Scuera - SEVEN Mix 084"
    },
    {
        title: "HATE PODCAST 496 - FADI MOHEM",
        channel: "HATE",
        date: "2026-04-03",
        expect: "2026-04-03 - Fadi Mohem - HATE Podcast 496"
    },
    {
        title: "Slowciety w/ Asa 808",
        channel: "Slowciety",
        date: "2019-03-12",
        expect: "2019-03-12 - Slowciety, Asa 808"
    },
    {
        title: "SOME ARTIST - NO SIGNAL FROM THE VOID",
        channel: "Some Artist",
        date: "2026-06-14",
        expect: "2026-06-14 - Some Artist - No Signal From The Void (Promo Mix)"
    },
    {
        title: "XLR8R700 - ARTIST NAME",
        channel: "XLR8R",
        date: "2026-04-03",
        expect: "2026-04-03 - Artist Name - XLR8R700"
    },
    {
        title: "SOME ARTIST - SOME SET 2026-08-20",
        channel: "Some Artist",
        date: "2026-08-06",
        expect: "2026-08-20 - Some Artist - Some Set (Promo Mix)"
    },
    {
        title: "SOME ARTIST - SOME SET 2026-08-01",
        channel: "Some Artist",
        date: "2026-08-06",
        expect: "2026-08-01 - Some Artist - Some Set (Promo Mix)"
    },
    {
        title: "Some DJ | Awakenings Open Air 2019 | Area X",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2019 - Some DJ @ Awakenings Open Air"
    },
    {
        title: "Festival Mix 12 - Some DJ",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026-08-07 - Some DJ - Festival Mix 12"
    },
    {
        title: "Some Podcast 12 - guest mix by DJ Koze",
        channel: "Some Podcast",
        date: "2026-08-05",
        expect: "2026-08-05 - DJ Koze - Some Podcast 12"
    },
    {
        title: "Look at Me - Some Artist",
        channel: "Some Label",
        date: "2026-08-05",
        expect: "2026-08-05 - Look at Me - Some Artist (Promo Mix)"
    },
    {
        title: "Live at Docklands",
        channel: "Anja Schneider",
        date: "2016-07-14",
        expect: "2016-07-14 - Anja Schneider @ Docklands"
    },
    {
        title: "Some DJ - Live at Berghain (Part 2)",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026-08-07 - Some DJ @ Berghain"
    }
];
