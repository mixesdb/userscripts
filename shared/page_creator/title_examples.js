/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Examples for the MixesDB page creator's title suggestion
 *
 * Every title that was ever reported as wrong, kept as the input it came from and the title
 * it should produce. Run them with:
 *
 *     deno run --allow-read shared/page_creator/title_examples_test.js
 *
 * WHAT THE SUGGESTION CURRENTLY MAKES OF EACH ONE IS NOT IN HERE ON PURPOSE. The runner
 * prints it next to the expected title on every run, so it is always the behaviour of today
 * and can never go stale - which a written-down "created title" would within a rule or two.
 *
 * One file for every site, grouped by where the report came from: the builder is shared, so a
 * title reported on one site guards the rule for all of them.
 *
 * Adding a case: title, channel and date are what the site gives us (on SoundCloud the channel
 * is the API field "username", NOT the URL slug - check it if unsure, they differ often),
 * expect is the MixesDB title it should turn into. The url is only there to look the mix up
 * again.
 *
 * expectArtists is optional and holds the ARTIST CATEGORIES the finished title has to be filed
 * under, as reported. Only worth writing down where the split is the point of the case - a
 * title naming two artists, a name that must NOT be split - since for a single artist it only
 * repeats the middle group of expect. expectEntity is its sibling for the ENTITY category the
 * page is filed under, worth writing down where reading it off the title is the point - which
 * part of a live title's place group it is, say - and expectEntities holds every name that
 * group OFFERS as a category, in title order, for a case whose point is that a page files
 * under more than one of them ("@ Far Blue, Noordspace").
 *
 * Why a case matters is not written per case either: it is in the rule it belongs to, in
 * title_definitions.js. A case that fails sends you there.
 *
 * This file is NOT @required by any script.user.js - it is test data, not something to ship to
 * every player page.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var mdbTitleExamples = [

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
        expect: "2026 - Tonino & Lanka @ Ritter Butzke, Berlin"
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
        // the wiki knows the series and its spelling wins over the channel's lowercase
        known: { "Trommel": "podcast" },
        expect: "2026-08-06 - Arno - Trommel.251"
    },
    {
        url: "https://soundcloud.com/deep-space-series/solma",
        title: "DSS 139 | Solma",
        channel: "Deep Space Series",
        date: "2026-08-05",
        // no "known" on purpose: without the wiki's answers the acronym stays as written -
        // this is the fence of the expansion the case below guards
        expect: "2026-08-05 - Solma - DSS 139"
    },
    {
        url: "https://soundcloud.com/deep-space-series/spacedrummeditation",
        title: "DSS 140 | Space Drum Meditation",
        channel: "Deep Space Series",
        date: "2026-08-20",
        // needs the wiki, and the RECENT titles above all: every page of
        // Category:Deep Space Series is titled "... - Deep Space Series (DSS <n>)", which is
        // the wiki's own titles saying the "DSS" of this title is that series' episode id -
        // evidence, where the letters spelling the channel's initials would only be a
        // resemblance. Their age says nothing about it (these are from 2016, the mix is 140
        // episodes later). The entity is the full name with the title's own id in brackets,
        // and the page files under Category:Deep Space Series - the filing strips the
        // bracket (mdbPageCreator_entityCategory).
        // "DSS" itself is no series category: the wiki answers with its qualified
        // "DSS (Das Schwarze Schaf)", an artist, which is its OTHER DSS.
        known: {
            "Deep Space Series": { type: "podcast", mixes: 8, recent: [
                "2016-08-18 - Joachim Spieth - Deep Space Series (DSS 012)",
                "2016-08-01 - Border One - Deep Space Series (DSS 011)",
                "2016-05-06 - Alderaan - Deep Space Series (DSS 008)",
                "2016-03-30 - Ntogn - Deep Space Series (DSS 006)",
                "2016-02-26 - THNTS - Deep Space Series (DSS 004)",
                "2016-02-05 - Hydrangea - Deep Space Series (DSS 003)",
                "2016-01-24 - Oubys - Deep Space Series (DSS 002)",
                "2015-12-15 - Ness - Deep Space Series (DSS 001)"
            ] },
            "DSS": { matches: [ { title: "DSS (Das Schwarze Schaf)", type: "artist", mixes: 1, matchedTitle: "DSS (Das Schwarze Schaf)", matchType: "qualified" } ] }
        },
        expect: "2026-08-20 - Space Drum Meditation - Deep Space Series (DSS 140)",
        expectEntity: "Deep Space Series (DSS 140)"
    },
    {
        url: "https://soundcloud.com/groove-magazin/anja-schneider-live-at-docklands-smirnoff-sound-collective-camp",
        title: "Anja Schneider - Live at Docklands (Smirnoff Sound Collective Camp)",
        channel: "Groove Magazin",
        date: "2016-07-14",
        expect: "2016 - Anja Schneider @ Docklands"
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
    {
        url: "https://soundcloud.com/mitdirfestival/see-bastian-b2b-afin-ulle-war-sauber-mit-dir-23-warm-up-session",
        title: "See Bastian B2B Afin - ULLE WAR SAUBER!! (MIT DIR `23 Warm Up Session)",
        channel: "MIT DIR Festival",
        date: "2023-08-02",
        expectArtists: [ "See Bastian", "Afin" ],
        expect: "2023-08-02 - See Bastian b2b Afin - ULLE WAR SAUBER!! MIT DIR '23 Warm Up Session"
    },
    {
        url: "https://soundcloud.com/hmwl/tooker-house-music-with-love",
        title: "HMWL Podcast 439: Tooker (SONARA / Crosstown Rebels)",
        channel: "House Music With Love (HMWL)",
        date: "2026-08-05",
        // the label bracket is no chunk: its names are on mdbTitleKnownLabels, so they are
        // dropped by the shared split too and never sent to the mdbnames lookup
        expectChunks: [ "HMWL Podcast 439", "Tooker" ],
        expect: "2026-08-05 - Tooker - HMWL Podcast 439"
    },
    {
        // The same bracket with two labels nothing knows - not the word list, not
        // mdbTitleKnownLabels. The mix's own TRACKLIST is what says they are labels, so the
        // names here must stay invented ones, or the case stops testing that.
        title: "HMWL Podcast 440: Some DJ (Nightshade Audio / Unlisted Tapes)",
        channel: "House Music With Love (HMWL)",
        date: "2026-08-05",
        description: "01. Some DJ - A Track [Nightshade Audio]\n02. Another One - B Track [Unlisted Tapes - NUT123]\n\nFollow us!",
        // chunks guarded too: the split only knows these are labels from the description, so
        // this is the case that fails if the description stops reaching it
        expectChunks: [ "HMWL Podcast 440", "Some DJ" ],
        expect: "2026-08-05 - Some DJ - HMWL Podcast 440"
    },
    {
        url: "https://soundcloud.com/selected-berlin/selected-podcast-064-w-strauss",
        title: "[selected] podcast 064 w/ STRAUSS.",
        channel: "[selected]",
        date: "2026-08-11",
        expect: "2026-08-11 - Strauss. - (selected) Podcast 064"
    },
    {
        url: "https://soundcloud.com/phonomusicclub-inf/phono-music-club-podcats-by-2",
        title: "Phono music club podcats by Neryn",
        channel: "PHONO Music Club",
        date: "2026-08-10",
        expect: "2026-08-10 - Neryn - PHONO Music Club Podcast"
    },
    {
        url: "https://soundcloud.com/alexesser/what-happens-mix",
        title: "DJ Set @ What Happens Label Night 2026",
        channel: "Alex Esser",
        date: "2026-06-28",
        expect: "2026 - Alex Esser @ What Happens Label Night 2026"
    },
    {
        url: "https://soundcloud.com/alexanderlouisnyc/live-elsewhere-july",
        title: "Live@Elsewhere Loft July",
        channel: "alexander:louis",
        date: "2026-07-27",
        // What the wiki answered: the channel is an Artist, "Elsewhere Loft" is no category
        // at all - while the club "Elsewhere" is one, with 2 mixes. "Loft" names a room
        // inside it, so the word comes off and the page files under the venue. Reported
        // 2026-08-19 as the entity category being a name MixesDB does not have.
        known: { "alexander:louis": "artist", "Elsewhere": { type: "venue", mixes: 2 } },
        expectEntity: "Elsewhere",
        expect: "2026-07 - alexander:louis @ Elsewhere"
    },
    {
        url: "https://soundcloud.com/whose-these-records/whose-these-cast-02-by-mar-1",
        title: "Whose These Cast #02 by Mar Monzon",
        channel: "Whose These Records",
        date: "2026-07-30",
        expect: "2026-07-30 - Mar Monzon - Whose These Cast 02"
    },
    {
        url: "https://soundcloud.com/dirk-wiertz/e-l-e-c-t-r-o-mix-august-2026",
        title: "E-L-E-C-T-R-O MIx August 2026",
        channel: "Dirk Wiertz",
        date: "2026-08-14",
        expect: "2026-08-14 - Dirk Wiertz - E-L-E-C-T-R-O MIx"
    },
    {
        url: "https://soundcloud.com/lilly_palmer/lilly-palmer-pres-spannung-radio-show-069",
        title: "Lilly Palmer pres. Spannung Radio Show #069",
        channel: "Lilly Palmer",
        date: "2026-08-14",
        expect: "2026-08-14 - Lilly Palmer - Spannung Radio 069"
    },
    {
        url: "https://soundcloud.com/multisex/multisexual-mix-39-vaahzer",
        title: "Multisexual Mix #39 Vaahzer",
        channel: "MULTISEX",
        date: "2026-08-14",
        expect: "2026-08-14 - Vaahzer - Multisexual Mix 39"
    },
    {
        url: "https://soundcloud.com/techno-ist-familiensache/familycast-048-zitrophren",
        title: "Familycast #048 - Zitrophren",
        channel: "Techno ist Familiensache",
        date: "2026-08-06",
        // The report expected the date 2026-08-13 - the page's display date. The SoundCloud
        // API hands the script created_at 2026-08-06 (uploaded private, made public a week
        // later) and no release_date, so 08-06 is the date the builder gets and the date it
        // writes. Which date the site script hands over is its question, not this parser's.
        expect: "2026-08-06 - Zitrophren - Familycast 048"
    },
    {
        url: "https://soundcloud.com/nickjsmith/lone-saxon_august-26_mix",
        title: "LONE SAXON_AUGUST 26_MIX",
        channel: "Lone Saxon / Nick J. Smith",
        date: "2026-08-07",
        expectArtists: [ "Lone Saxon" ],
        expect: "2026-08-07 - Lone Saxon - August 26 Mix"
    },
    {
        url: "https://soundcloud.com/from-undrgrnd-culture/kce-from-open-frequency-001",
        title: "KCE — FROM OPEN FREQUENCY 001",
        channel: "From UNDRGRND Culture",
        date: "2026-08-13",
        expectArtists: [ "KCE" ],
        expect: "2026-08-13 - KCE - From Open Frequency 001"
    },
    {
        url: "https://soundcloud.com/chlaurien/mix-august-2026-1",
        title: "Mix August 2026",
        channel: "Christian Laurien",
        date: "2026-08-07",
        // the reported entity category is Promo Mix, which the name already says - so it is
        // carried by promoCategory and not written into the title
        expect: "2026-08-07 - Christian Laurien - August 2026 Mix"
    },
    {
        url: "https://soundcloud.com/dancetelevision/dj-mix-679-miss-luna-dusseldorf-germany",
        title: "DJ MIX #679 - Miss Luna ( Ibiza/ Dusseldorf, Germany)",
        channel: "Dance TV",
        date: "2026-08-04",
        // two rules at once: the channel and "DJ Mix" name the show together
        // (mdbTitleChannelSeriesConversions), and the bracketed place list says where Miss Luna
        // is from, which a non-live title does not carry (mdbTitleCountries). The place list is
        // no chunk either - it never joins the title, so it is never looked up
        expectArtists: [ "Miss Luna" ],
        expectChunks: [ "DJ MIX #679", "Miss Luna" ],
        // the chunk stays a chunk - it is what the title says - but the lookup asks about the
        // curated show instead of the bare "DJ Mix" the strip would leave of it
        expectAsked: [ "Dance TV DJ Mix", "Miss Luna" ],
        expectNotAsked: [ "DJ Mix" ],
        expect: "2026-08-04 - Miss Luna - Dance TV DJ Mix 679"
    },
    {
        url: "https://soundcloud.com/junodailyonline/juno-daily-in-the-mix-space",
        title: "Juno Daily – In The Mix: Space Ghost",
        channel: "Juno Daily",
        date: "2026-08-19",
        // the same map the other way round: here the WORDS in the title
        // ("Juno Daily – In The Mix") contain the show they map to ("Juno Daily"), where
        // Dance TV's show contains its words. The longer name has to be looked for first or
        // the "Juno Daily" at the front matches itself, and the "– In The Mix" left over
        // reads as part of the artist
        expectArtists: [ "Space Ghost" ],
        expectEntity: "Juno Daily",
        expect: "2026-08-19 - Space Ghost - Juno Daily"
    },
    {
        url: "https://soundcloud.com/junodailyonline/juno-daily-in-the-mix-new-digital-fidelity",
        title: "Juno Daily - In The Mix: New Digital Fidelity",
        channel: "Juno Daily",
        date: "2026-08-19",
        // the SAME show as the case above, written with a hyphen where the key has an en dash -
        // the uploader uses both in the same month. A key is curated data, not a regex, so the
        // punctuation between its words is what is loose (mdbTitle_escapeReLooseSeparators)
        expectArtists: [ "New Digital Fidelity" ],
        expectEntity: "Juno Daily",
        expect: "2026-08-19 - New Digital Fidelity - Juno Daily"
    },
    {
        url: "https://soundcloud.com/junodailyonline/in-the-mix-ben-diggins",
        title: "In The Mix: Ben Diggins",
        channel: "Juno Daily",
        date: "2026-03-20",
        // the same show HALVED - the channel writes it both ways, so it takes a second entry
        // ("In The Mix": "Juno Daily") next to the full one. Without it "In The Mix" reads as
        // the show itself and the page is filed under it instead of under the channel's show
        expectArtists: [ "Ben Diggins" ],
        expectEntity: "Juno Daily",
        // and the curated show is what the wiki is asked about - "In The Mix" on its own is
        // either no category at all or somebody else's show
        expectAsked: [ "Juno Daily", "Ben Diggins" ],
        expectNotAsked: [ "In The Mix" ],
        expect: "2026-03-20 - Ben Diggins - Juno Daily"
    },
    {
        url: "https://soundcloud.com/privateplaces/779-sascha-sibler",
        title: "Guestroom 779 by Sascha Sibler",
        channel: "PRIVATEPLACES Mixtapes",
        date: "2022-06-15",
        // the lowercase "by" is the only separator in the title, and the number alone would
        // never have been read as an episode - "Guestroom" carries no series word and the
        // channel is nowhere in the title
        expectArtists: [ "Sascha Sibler" ],
        expect: "2022-06-15 - Sascha Sibler - Guestroom 779"
    },
    {
        url: "https://soundcloud.com/kernelexistence/kernel-existence-live3000grad-festival-utopia-2021",
        title: "Kernel Existence - live@3000Grad Festival @Utopia 2021",
        channel: "kernel existence",
        date: "2021-08-10",
        // a second "@" never survives into the title: the festival and the venue it was held
        // at are ONE place group, joined with ",". The chunks still separate at every "@",
        // the year behind the place list is the gig year (the date group carries it), and the
        // entity category is the FIRST place alone. The bare "live" marks nothing - it is no
        // "Live PA"
        expectArtists: [ "Kernel Existence" ],
        expectEntity: "3000Grad Festival",
        expectChunks: [ "Kernel Existence", "3000Grad Festival", "Utopia" ],
        expect: "2021 - Kernel Existence @ 3000Grad Festival, Utopia"
    },
    {
        url: "https://soundcloud.com/horstartsandmusicfestival/dave-huismans-at-dark-skies",
        title: "Dave Huismans at Dark Skies, Horst Festival 2026",
        channel: "Horst Arts & Music",
        date: "2026-07-30",
        // the place group written the other way round - the stage first, the festival behind
        // the comma. The title itself was already right; what was wrong is what follows from
        // it. The comma in front of an event name separates, so the wiki is asked about "Dark
        // Skies" and "Horst Festival" instead of the glued pair, which could only answer
        // empty - and the page is filed under the festival, not under the stage, although the
        // stage stands first
        expectArtists: [ "Dave Huismans" ],
        expectEntity: "Horst Festival",
        expectChunks: [ "Dave Huismans", "Dark Skies", "Horst Festival" ],
        expect: "2026 - Dave Huismans @ Dark Skies, Horst Festival"
    },

    {
        url: "https://soundcloud.com/ri0d/3026-riod-rummelplatz-neu",
        title: "RiOD. @ 3000Grad Festival -Rummelplatz 3026-",
        channel: "RiOD.",
        date: "2026-08-11",
        // a part the uploader WRAPPED in dashes is a chunk of its own, exactly like a
        // bracketed one - without that the whole tail is one name, is looked up as one and is
        // what the page ends up filed under. What the wrap holds here is the festival's
        // fairground corner, which a mix page carries as little as it carries a stage, and
        // "3026" is 3000Grad's own spelling of 2026 (mdbTitleJokeYearEvents): it dates the
        // recording and leaves the title
        expectArtists: [ "RiOD." ],
        expectEntity: "3000Grad Festival",
        expectChunks: [ "RiOD.", "3000Grad Festival", "Rummelplatz" ],
        expect: "2026 - RiOD. @ 3000Grad Festival"
    },
    {
        url: "https://soundcloud.com/ri0d/ri0d-3000-grad-festival-3025-rummelplatz",
        title: "Ri0D. @ 3000Grad Festival 3025  -RUMMELPLATZ-",
        channel: "RiOD.",
        date: "2025-08-12",
        // the same upload a year earlier, with the joke year on the festival instead of
        // inside the wrap - it has to go from either place, or it rides along in the name the
        // page is filed under. The artist keeps the title's spelling of the channel name,
        // zero and all: the two differ, so the channel's own spelling does not stand in
        expectArtists: [ "Ri0D." ],
        expectEntity: "3000Grad Festival",
        expectChunks: [ "Ri0D.", "3000Grad Festival", "RUMMELPLATZ" ],
        expect: "2025 - Ri0D. @ 3000Grad Festival"
    },

    {
        url: "https://soundcloud.com/kollektivost/kollektiv-ost-3000grad-festival-3023",
        title: "Kollektiv Ost - 3000Grad Festival 3023",
        channel: "Kollektiv Ost",
        date: "2023-08-18",
        known: { "3000Grad Festival": { type: "event", mixes: 276 }, "Kollektiv Ost": { type: "artist", mixes: 18 } },
        // a festival set written with a "-". The event branch used to refuse it: its "an event
        // is a place, not a series" guard counted the digits of "3000Grad" as an episode
        // number, so the title fell through to the channel-as-artist reading and came out as
        // the channel's own Promo Mix. A number that COUNTS ends where the digits end - these
        // run on into letters, which is a spelling
        expectArtists: [ "Kollektiv Ost" ],
        expectEntity: "3000Grad Festival",
        expect: "2023 - Kollektiv Ost @ 3000Grad Festival"
    },
    {
        url: "https://soundcloud.com/timboletti/rosmarinlavendel",
        title: "Timboletti im Chapeau Club - 3000Grad Festival 3025 - Rosmarin und Lavendel - Undercover-Ambient",
        channel: "timboletti",
        date: "2025-08-13",
        known: { "3000Grad Festival": { type: "event", mixes: 276 }, "Timboletti": { type: "artist", mixes: 8 } },
        // four chunks, of which a MixesDB title carries two. The first is a chain - the artist
        // and the corner of the festival site they played in - and asking the wiki about the
        // pair can only answer empty, so a long chunk is asked about in pieces as well
        // ("Timboletti" is a category, "Timboletti im Chapeau Club" never will be). The place
        // word is also what shortens the name: inside a set played at an event the place is
        // settled, so what stands behind "im" goes the way the set name and the genre go
        expectArtists: [ "Timboletti" ],
        expectEntity: "3000Grad Festival",
        expectChunks: [ "Timboletti im Chapeau Club", "3000Grad Festival", "Rosmarin und Lavendel", "Undercover-Ambient" ],
        expect: "2025 - Timboletti @ 3000Grad Festival"
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
        expect: "2026 - DJ Koze @ Robert Johnson"
    },
    {
        title: "RA.971 Ben Klock",
        channel: "Resident Advisor",
        date: "2026-04-03",
        expect: "2026-04-03 - Ben Klock - RA Podcast (RA.971)"
    },
    {
        url: "https://soundcloud.com/meat-free-djs/deetron-pres-soulmate-2hr-live",
        title: "Deetron pres. Soulmate [2hr Live Mix] at The Yard // 25.07.2026",
        channel: "Meat Free",
        date: "2026-07-30",
        // the phrase stays whole in the title and is still two categories - as on the wiki's own
        // "2024-05-16 - Deetron Pres. Soulmate - fabric Podcast 037"
        expectArtists: [ "Deetron", "Soulmate" ],
        expect: "2026-07-25 - Deetron pres. Soulmate @ The Yard"
    },
    {
        url: "https://soundcloud.com/illegal-alien-records/ia-podcast-233-fixeer-ricardo",
        title: "IA Podcast | 233: Fixeer & Ricardo Garduno",
        channel: "Illegal Alien Records",
        date: "2026-03-05",
        // "IA" is the channel's own initials, so Normal Case has to leave it alone -
        // "Ia Podcast" is what it would make of a two-letter acronym that holds a vowel
        expectArtists: [ "Fixeer", "Ricardo Garduno" ],
        expect: "2026-03-05 - Fixeer & Ricardo Garduno - IA Podcast 233"
    },
    {
        url: "https://soundcloud.com/m_p_m/1999-10-09-thomas-bangalter-we-dolton-expo-center-chicago",
        title: "1999-10-09 - Thomas Bangalter @ WE, Dolton Expo Center, Chicago",
        channel: "M_P_M",
        date: "2009-10-28",
        // a MixesDB title pasted back into the player: nothing here is inferred, which is what
        // the confidence has to say as well - see the four drops it used to be charged
        expect: "1999-10-09 - Thomas Bangalter @ WE, Dolton Expo Center, Chicago"
    },
    {
        url: "https://soundcloud.com/ricky-montana/tsr147",
        title: "The Sound of Rome #147 - Ricky Montana",
        channel: "Ricky Montana",
        date: "2026-08-12",
        // the number stands in the OTHER bit than the channel name, which is what tells this
        // from "LIMB #9 – Yuka" further up - there the number is in the channel's own bit
        expectArtists: [ "Ricky Montana" ],
        expect: "2026-08-12 - Ricky Montana - The Sound of Rome 147"
    },
    {
        url: "https://soundcloud.com/dualismberlin/dualism-series-031",
        title: "Dualism Series #031 - alemiko *live",
        channel: "Dualism.Berlin",
        date: "2026-08-12",
        // the marker names no place, so it cannot become an "@" and must not stay stuck to the
        // artist either - "Alemiko *Live" would be the artist category
        expectArtists: [ "Alemiko" ],
        expect: "2026-08-12 - Alemiko - Dualism Series 031"
    },
    {
        url: "https://soundcloud.com/frenzynl/frenzypodcast-233-glia",
        title: "FrenzyPodcast #233 - GLIA",
        channel: "Frenzy",
        date: "2026-08-14",
        // the channel is mapped to "Frenzy Podcast", and the mapped value is the spelling the
        // title carries - the title's glued "FrenzyPodcast" must not override it
        expect: "2026-08-14 - Glia - Frenzy Podcast 233"
    },
    {
        url: "https://soundcloud.com/monument-podcast/mnmt-recordings-adjust-be-s-u",
        title: "MNMT Recordings : Adjust (BE) @ S.U.N Festival – Hungary",
        channel: "MONUMENT",
        date: "2026-08-17",
        known: {
            "Monument": { matches: [
                { title: "Monument", type: "podcast", mixes: 425 },
                { title: "Monument (Jordan Smith)", type: "artist", mixes: 3 }
            ] },
            "Adjust": { type: "artist" }
        },
        // Three rules from one report. "(BE)" is a bracketed country behind the artist -
        // where Adjust is from, so it goes even though the title is a live one, and it is no
        // chunk and no lookup candidate. The "@" glued to "Adjust" already names the artist:
        // the event branch must read it instead of falling back to the first bit, which is
        // the SERIES here ("MNMT Recordings") - the wiki knowing Adjust as an artist and
        // Monument as a podcast says as much. And "Hungary", the country standing behind the
        // event, stays in the title as the place group's second part - it is a chunk but no
        // lookup candidate, since a country is never a category.
        expectChunks: [ "MNMT Recordings", "Adjust", "S.U.N Festival", "Hungary" ],
        expectArtists: [ "Adjust" ],
        expectEntity: "S.U.N Festival",
        expect: "2026 - Adjust @ S.U.N Festival, Hungary"
    },
    {
        url: "https://soundcloud.com/resident-advisor/ra971-djmaria",
        title: "RA.971 DJ MARIA.",
        channel: "Resident Advisor",
        date: "2025-01-12",
        known: { "DJ MARIA.": { type: "artist", mixes: 8 } },
        // The category name is the last word on spelling. The re-caser reads the shouted
        // "DJ MARIA." as a typing habit and makes it "DJ Maria." - right as a guess, wrong
        // once the wiki has answered: her 8 mixes are filed under "DJ MARIA.", spelled in
        // caps with the trailing dot, and the title has to write the name the way the
        // category does. The chunk is "RA.971 DJ MARIA." in ONE piece (the episode id is no
        // separator), so the browser only learns the category because the first parse's own
        // names are candidates too (mdbPageCreator_addParsedNames in page_creator.js).
        expectArtists: [ "DJ MARIA." ],
        expect: "2025-01-12 - DJ MARIA. - RA Podcast (RA.971)"
    },

    // Built by hand, to hold a rule at its edge where no report happened to sit
    {
        title: "HATE Podcast 496 Fadi Mohem",
        channel: "HATE",
        date: "2026-04-03",
        expect: "2026-04-03 - Fadi Mohem - HATE Podcast 496"
    },
    {
        // the same monthly edition with the year written short - the reported
        // "E-L-E-C-T-R-O MIx August 2026" is the four-digit half of the pair
        title: "E-L-E-C-T-R-O MIx August 26",
        channel: "Dirk Wiertz",
        date: "2026-08-14",
        expect: "2026-08-14 - Dirk Wiertz - E-L-E-C-T-R-O MIx"
    },
    {
        // the other side of it: two digits that cannot be the edition's year land nowhere near
        // the upload year, so they are a DAY and stay part of the name
        title: "Some Mix August 12",
        channel: "Some Channel",
        date: "2026-08-05",
        expect: "2026-08-05 - Some Channel - Some Mix August 12"
    },
    {
        // the mix word already BEHIND the month, i.e. the order MixesDB writes - it has to
        // come back unchanged, or running the rule over both orders would shuffle it forever
        title: "August 2026 Mix",
        channel: "Christian Laurien",
        date: "2026-08-07",
        expect: "2026-08-07 - Christian Laurien - August 2026 Mix"
    },
    {
        // the same shape spelled "DJ Mix", which is one word to an uploader however they
        // punctuate it
        title: "DJ-Mix August 2026",
        channel: "Christian Laurien",
        date: "2026-08-07",
        expect: "2026-08-07 - Christian Laurien - August 2026 DJ-Mix"
    },
    {
        // a name in front of the mix word is a NAME, so the stamp dates an edition of it and
        // goes - this is the monthly-edition rule, and the pair guards the border between them
        title: "Some Show Mix August 2026",
        channel: "Some Channel",
        date: "2026-08-07",
        expect: "2026-08-07 - Some Channel - Some Show Mix"
    },
    {
        // three letters alone in a bit are an acronym and keep their caps; the same three
        // inside a phrase are an ordinary word, which "MOLTO IN THE MIX" guards from the
        // other side
        title: "ABC - Some Podcast 12",
        channel: "Some Channel",
        date: "2026-08-07",
        expect: "2026-08-07 - ABC - Some Podcast 12"
    },
    {
        // the cutoff: one letter more and it is a word again
        title: "ABCD - Some Podcast 12",
        channel: "Some Channel",
        date: "2026-08-07",
        expect: "2026-08-07 - Abcd - Some Podcast 12"
    },
    {
        title: "Some Podcast 12 - Some DJ VS. Other DJ",
        channel: "Some Podcast",
        date: "2026-08-05",
        expectArtists: [ "Some DJ", "Other DJ" ],
        expect: "2026-08-05 - Some DJ vs Other DJ - Some Podcast 12"
    },
    {
        title: "Some Podcast 12 - Some DJ versus Other DJ",
        channel: "Some Podcast",
        date: "2026-08-05",
        expectArtists: [ "Some DJ", "Other DJ" ],
        expect: "2026-08-05 - Some DJ vs Other DJ - Some Podcast 12"
    },
    {
        title: "Some Podcast 12 - Some DJ B3B Other DJ",
        channel: "Some Podcast",
        date: "2026-08-05",
        expectArtists: [ "Some DJ", "Other DJ" ],
        expect: "2026-08-05 - Some DJ b2b Other DJ - Some Podcast 12"
    },
    {
        // the presenter has nowhere to go - the entity slot is taken by the podcast - so the
        // two names are two artists rather than one category holding the whole phrase.
        // "fabric presents Bonobo" above is the case where the presenter CAN be placed.
        title: "Some Podcast 12 - Some DJ presents Other DJ",
        channel: "Some Podcast",
        date: "2026-08-05",
        expectArtists: [ "Some DJ", "Other DJ" ],
        expect: "2026-08-05 - Some DJ, Other DJ - Some Podcast 12"
    },
    {
        // the ABBREVIATION is the other word: it names a project, so it stays in the title -
        // and the two names are still two categories
        title: "Some Podcast 12 - Some DJ pres Other DJ",
        channel: "Some Podcast",
        date: "2026-08-05",
        expectArtists: [ "Some DJ", "Other DJ" ],
        expect: "2026-08-05 - Some DJ pres. Other DJ - Some Podcast 12"
    },
    {
        // the entity is a NAME - no joiner rewriting in there
        title: "Some DJ - Techno versus House",
        channel: "Some Label",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - Techno versus House (Promo Mix)"
    },
    {
        // a label the list has never heard of, recognised by the word it writes into its name
        title: "HMWL Podcast 441: Some DJ (Ostgut Ton Records)",
        channel: "House Music With Love (HMWL)",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - HMWL Podcast 441"
    },
    {
        // the same credit in SQUARE brackets and split by a comma - the bracket a title carries
        // is whichever one the uploader typed, and both are the same credit
        title: "HMWL Podcast 442: Some DJ [Drumcode, Terminal M]",
        channel: "House Music With Love (HMWL)",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - HMWL Podcast 442"
    },
    {
        // a label whose own NAME holds a separator: split first and both halves are nothing, so
        // the whole bracket is tried as one name before anything is split
        title: "HMWL Podcast 443: Some DJ (Lost & Found)",
        channel: "House Music With Love (HMWL)",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - HMWL Podcast 443"
    },
    {
        // The label list is only ever asked about a bracket standing BEHIND something. This one
        // opens the title, so it credits nobody - it is the name of what follows it, and
        // "Kompakt" being a label on the list is exactly why it must not be dropped here.
        title: "(Kompakt) Total Mix 015 - Some DJ",
        channel: "Kompakt Records",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - Kompakt Total Mix 015"
    },
    {
        // One label and one unknown name: the bracket STAYS, and the title comes out badly on
        // purpose - the point of the case is that the unknown name is still in it. Dropping a
        // bracket that only half reads as a label credit would delete a real artist for good,
        // which is worse than the 10% title a reader is warned about here.
        title: "Some Podcast 12 - Some DJ (Tresor / Someone Else)",
        channel: "Some Channel",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ Tresor Someone Else - Some Podcast 12"
    },
    {
        // "by" behind the episode number does the job of a separator, in caps because the whole
        // title is shouted
        title: "SOME PODCAST 12 BY SOMEONE",
        channel: "Some Channel",
        date: "2026-08-05",
        expect: "2026-08-05 - Someone - Some Podcast 12"
    },
    {
        // the same word, Normal Case, inside a name - nothing follows it
        title: "Some Podcast 12 - Stand By Me",
        channel: "Some Channel",
        date: "2026-08-05",
        expect: "2026-08-05 - Stand By Me - Some Podcast 12"
    },
    {
        // the "by" as the ONLY separator, with the number the sole thing saying that the front
        // is a series - the reported "Guestroom 779 by Sascha Sibler" without its keyword-free
        // twin sister. The name behind it carries a series word, so the scores alone would put
        // the two the wrong way round: the "by" is what settles it
        title: "Somewhere 779 by Radio Kid",
        channel: "Some Channel",
        date: "2026-08-05",
        expect: "2026-08-05 - Radio Kid - Somewhere 779"
    },
    {
        // the border of that rule: with nothing series-shaped in front of it, a lowercase "by"
        // is an ordinary English word and splits nothing - the title is one name
        title: "Side by Side",
        channel: "Some Channel",
        date: "2026-08-05",
        expect: "2026-08-05 - Side by Side - Some Channel"
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
        expect: "2016 - Anja Schneider @ Docklands"
    },
    {
        // The "Part 2" is dropped and never offered back as a "Switch title" chip: the parts
        // of one recording share ONE mix page, so a title carrying the marker would start a
        // duplicate rather than read the same mix differently. See "Never offered back" in
        // mdbTitleDroppedBitPatterns.
        title: "Some DJ - Live at Berghain (Part 2)",
        channel: "Some Label",
        date: "2026-08-07",
        expectNoAlternatives: [ "chunk" ],
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        // the month behind the place refines the year, and only there - the same word ending an
        // ordinary title stays part of the name
        title: "Some DJ - Live at Berghain July",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026-07 - Some DJ @ Berghain"
    },
    {
        title: "Some DJ - Berghain July",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026-08-07 - Some DJ - Berghain July (Promo Mix)"
    },
    {
        title: "Some DJ - DJmix at Berghain",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        title: "Some DJ - DJ-Set@Berghain",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        title: "Some DJ - Live Mix at Berghain",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        title: "Some DJ@Berghain",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        title: "Some DJ (Live) @ Berghain",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        title: "Some DJ @ Berghain (DJ Set)",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        // the marker word is only noise where it MARKS - a venue may be named after it, and
        // there it is the name
        title: "Some DJ @ Live Music Hall",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Live Music Hall"
    },
    {
        title: "Some DJ (60 min Live Mix) at Berghain",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026 - Some DJ @ Berghain"
    },
    {
        // the other side of it: a NAME that happens to carry a marker word is not a note about
        // the recording, and neither the name nor its number may be dropped
        title: "Some DJ - Live Sessions 12",
        channel: "Some Label",
        date: "2026-08-07",
        expect: "2026-08-07 - Some DJ - Live Sessions 12"
    },
    {
        // the place list without the Dance TV channel map: "City, Country" behind the artist
        // says where they are from, which a non-live title does not carry
        title: "Some Podcast 12 - Some DJ (Warsaw, Poland)",
        channel: "Some Podcast",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - Some Podcast 12"
    },
    {
        // a country standing ALONE is an artist or a mix name as readily as a place - only the
        // place LIST ending in a country is location info, so this chunk has to survive
        title: "Some Podcast 12 - Georgia",
        channel: "Some Podcast",
        date: "2026-08-05",
        expect: "2026-08-05 - Georgia - Some Podcast 12"
    },
    {
        // the SHORT forms of a country do the same job as the long one, two-letter included
        title: "Some Podcast 12 - Some DJ (Paris, FR)",
        channel: "Some Podcast",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - Some Podcast 12"
    },
    {
        // and the three-letter Olympic spelling, which is what an uploader writes as readily
        // as the ISO one
        title: "Some Podcast 12 - Some DJ (Zurich, SUI)",
        channel: "Some Podcast",
        date: "2026-08-05",
        expect: "2026-08-05 - Some DJ - Some Podcast 12"
    },
    {
        // a code standing alone drops nothing either - same rule as the lone "Georgia" above,
        // and what makes the word-shaped codes ("CAN", "NO", "IT") safe to list
        title: "Some Podcast 12 - CAN",
        channel: "Some Podcast",
        date: "2026-08-05",
        expect: "2026-08-05 - CAN - Some Podcast 12"
    },
    {
        // the venue branch composes its "@" AFTER the title-wide one-"@" rewrite, off an
        // artist bit that may already carry one - the single exit is where the rule holds
        // for every branch, so this must never come out as "@ Utopia @ Ritter Butzke".
        // "@ Party, Venue, City" is also how MixesDB writes exactly this shape
        title: "Kernel Existence @ Utopia | Ritter Butzke | Berlin",
        channel: "kernel existence",
        date: "2021-08-10",
        known: { "Ritter Butzke": "venue", "Berlin": "other" },
        expect: "2021 - Kernel Existence @ Utopia, Ritter Butzke, Berlin"
    },
    {
        // the marker MixesDB DOES write for how a set was played: "Live PA" - the act
        // performing its own tracks - goes behind the artist's name. A bare "live" never
        // becomes this, see the reported "live@3000Grad Festival" above
        title: "Kernel Existence - Live PA @ 3000Grad Festival",
        channel: "kernel existence",
        date: "2021-08-10",
        expectArtists: [ "Kernel Existence" ],
        expect: "2021 - Kernel Existence (Live PA) @ 3000Grad Festival"
    },
    {
        // the phrase found in the DESCRIPTION instead of the title - counts on a live
        // recording, with a confidence drop, since it may describe another act on the bill
        title: "Kernel Existence @ 3000Grad Festival",
        channel: "kernel existence",
        date: "2021-08-10",
        description: "Our live PA from the festival's opening night.",
        expect: "2021 - Kernel Existence (Live PA) @ 3000Grad Festival"
    },
    {
        // the same phrase in the description of a NON-live title marks nothing: no "@" means
        // no "(Live PA)" - the description's word alone is too little off a place
        title: "Some Artist - Some Mix",
        channel: "Some Artist",
        date: "2026-08-05",
        description: "More live PA dates coming soon.",
        expect: "2026-08-05 - Some Artist - Some Mix"
    },
    {
        // Reported: the date sat glued to the venue with no space in front of it, so it rode
        // into the chunk and the wiki was asked about "The Lot Radio 08-15" - the trailing
        // number strip in mdbTitle_categoryCandidates takes one number, and a US-format date
        // holds three. The chunk split cuts the date the way the parse does, so the name
        // asked about is the venue's own.
        title: "Blackmoonchild @ The Lot Radio 08-15-2026",
        channel: "thelotradio",
        date: "2026-08-15",
        expectChunks: [ "Blackmoonchild", "The Lot Radio" ],
        expect: "2026-08-15 - Blackmoonchild @ The Lot Radio"
    },
    {
        // Reported: the title and both categories were right, but the wiki was asked about
        // "Unedited (Promo Mix)" - the marker WE append rode along into the name read back
        // out of the finished title. No category is called that, so the answer could only be
        // empty. The entity read off a title is the bare name (mdbTitle_dropMarkers).
        url: "https://soundcloud.com/as-you-like-it/djspun-unedited-ayli-1",
        title: "DJ SPUN | UNEDITED | 07.31.26 | Part 1",
        channel: "As You Like It",
        date: "2026-08-18",
        expectEntity: "Unedited",
        expect: "2026-07-31 - DJ Spun - Unedited (Promo Mix)"
    },
    {
        // Reported: the presenter rule only knew a NUMBERED series, so "present" with a
        // series word behind it fell through and everything left of the title became the
        // artist - stamp, caps and all ("UNCODED BIRTHDAY Radioshow JUNE 26" as the artist
        // category). Three rules from the report: a series word behind "present(s)" says
        // show as loudly as a number does; the bracketed "(JUNE 26)" is the edition's
        // month-year stamp and goes (the date group already carries when the mix is from,
        // and a date belongs in no category name); and shouted words around a Normal Case
        // series word are a shouted NAME, re-cased with the series word kept as typed.
        // "present" also separates the chunks: presenter and presented are two names.
        url: "https://soundcloud.com/mat_theo/mat-theo-uncoded-birthday",
        title: "Mat.Theo present UNCODED BIRTHDAY Radioshow (JUNE 26)",
        channel: "Mat.Theo",
        date: "2026-06-23",
        expectArtists: [ "Mat.Theo" ],
        expectEntity: "Uncoded Birthday Radioshow",
        expectChunks: [ "Mat.Theo", "UNCODED BIRTHDAY Radioshow" ],
        expect: "2026-06-23 - Mat.Theo - Uncoded Birthday Radioshow"
    },
    {
        // Reported: the Live PA alternative did not fire - the trailing "*live" was dropped
        // (it says how the set was played, not where) and the signal went with it. A
        // consumed "live" now offers the "(Live PA)" reading as a "Switch title:" chip; it
        // still never WRITES the marker, since a DJ set is announced the same way.
        url: "https://soundcloud.com/dualismberlin/dualism-series-031",
        title: "Dualism Series #031 - alemiko *live",
        channel: "Dualism.Berlin",
        date: "2026-08-12",
        known: { "alemiko": "artist", "Dualism Series": { type: "podcast", mixes: 31 } },
        expectAlternatives: [ "livePa" ],
        expect: "2026-08-12 - alemiko - Dualism Series 031"
    },
    {
        // Reported with the case above: the same signal consumed the other way - the "Live"
        // of "Live@" was read as the " @ " joiner, so the title became a live recording and
        // the word disappeared into it. The chip offers "(Live PA)" in front of the "@".
        url: "https://soundcloud.com/alexanderlouisnyc/live-elsewhere-july",
        title: "Live@Elsewhere Loft July",
        channel: "alexander:louis",
        date: "2026-07-27",
        // ... and the room word the second round took off the venue is offered back the same
        // way: MixesDB does write the room where it is worth naming ("@ Elsewhere Rooftop,
        // NYC" is filed under Elsewhere), so it is a reading, not a mistake.
        known: { "alexander:louis": "artist", "Elsewhere": { type: "venue", mixes: 2 } },
        expectAlternatives: [ "livePa", "placeWord" ],
        expect: "2026-07 - alexander:louis @ Elsewhere"
    },
    {
        // Reported: the wiki knows "Undercurrent" as a venue with 28 mixes, and that answer
        // pulled the title apart - the episode number left its own chunk, hung itself on the
        // channel ("DEEP & HAZY 5") and what was left of the other two chunks glued into one
        // artist ("Undercurrent ALEXANDER BOGDANOV"). A venue has no episode numbers: the
        // "#5" says the chunk it stands in is a numbered series, whatever else that name is
        // elsewhere, and the number never moves to another chunk.
        url: "https://soundcloud.com/deepandhazy/undercurrent-6-alexander",
        title: "DEEP & HAZY - Undercurrent #5 - ALEXANDER BOGDANOV",
        channel: "DEEP & HAZY",
        date: "2026-07-02",
        known: { "Undercurrent": { type: "venue", mixes: 28 } },
        expectArtists: [ "Alexander Bogdanov" ],
        // the entity SLOT as the title writes it - the episode number comes off where the
        // category is built (mdbPageCreator_entityCategory), so the page files under
        // Category:Undercurrent, which is what the report asked for
        expectEntity: "Undercurrent 5",
        expect: "2026-07-02 - Alexander Bogdanov - Undercurrent 5"
    },
    {
        // Reported: read as a promo mix, with the event as the artist's second name. Two
        // hints say this was played somewhere: a name ending in a bare YEAR is an event
        // edition ("Rote Dichte 2026"), and a chunk ending in a party-slot word ("Obstgarten
        // Closing") is the slot it was played in. The event is the entity wherever it stands
        // in the group, exactly as with an event word.
        url: "https://soundcloud.com/beelincoln/bee-lincoln-rote-dichte-2026",
        title: "Bee Lincoln - Rote Dichte 2026 - Obstgarten Closing",
        channel: "Bee Lincoln",
        date: "2026-08-18",
        known: { "Bee Lincoln": { type: "artist", mixes: 1 } },
        expectArtists: [ "Bee Lincoln" ],
        expectEntity: "Rote Dichte",
        // ... and the group without the slot is the other reading the report named, offered
        // as a chip - the page files under Rote Dichte either way
        expectAlternatives: [ "slotPart" ],
        expect: "2026 - Bee Lincoln @ Obstgarten Closing, Rote Dichte"
    },
    {
        // Reported three times over. "1/2" is a fraction, not a separator, so the leading
        // number is no episode and the artist is not the "2 Faultierdisko" a split at the
        // slash left. The year trailing an EVENT is that edition's year, so it dates the
        // recording and leaves the name - which the one-place rule ("... Label Night 2026"
        // keeps its year) only ever did behind the comma of a place list until now. And the
        // fraction says how much of the act was on stage, so the ACT is asked about next to
        // the written name: the wiki knows "Faultierdisko" (4 mixes) and will never know
        // "1/2 Faultierdisko", and the page belongs under the act.
        url: "https://soundcloud.com/sattlord/12-faultierdisko-3000grad-festival-2023",
        title: "1/2 Faultierdisko @ 3000Grad Festival 2023",
        channel: "lockige Ostsee",
        date: "2023-08-14",
        known: {
            "3000Grad Festival": { type: "event", mixes: 335 },
            "Faultierdisko": { type: "artist", mixes: 4 }
        },
        expectArtists: [ "Faultierdisko" ],
        expectEntity: "3000Grad Festival",
        expectChunks: [ "1/2 Faultierdisko", "3000Grad Festival" ],
        expect: "2023 - Faultierdisko @ 3000Grad Festival"
    },
    {
        // Reported: read as a set played at a place called "August 2026", which then became
        // the entity and, with its number stripped, the category "August". Two rules from the
        // report: an "@" in front of a pure DATE joins nothing - it is the uploader's own
        // flourish and reads as a plain separator, which is also what lets the date step see
        // the month at all; and a month is never a category, so a title that names nothing
        // but its month is the monthly mix MixesDB writes as "<Month> Promo Mix"
        // ("2011-08 - Aeroplane - August Promo Mix" and 148 more). The page files under
        // Category:Promo Mix, which is what promoCategory carries - the entity slot below is
        // the title's own name, not the category.
        url: "https://soundcloud.com/ingosaenger/ingo-saenger-august-2026",
        title: "Ingo Sänger @ August 2026",
        channel: "Ingo Sänger",
        date: "2026-08-10",
        known: { "Ingo Sänger": { type: "artist", mixes: 3 } },
        expectArtists: [ "Ingo Sänger" ],
        expectEntity: "August Promo Mix",
        // ... and the stamp kept as the mix's own name is the other reading the report named
        expectAlternatives: [ "monthName" ],
        expect: "2026-08 - Ingo Sänger - August Promo Mix"
    },
    {
        // ... but a name the wiki knows as a SHOW never gets it: "<Podcast> - March 2026" is
        // that podcast's March episode, not a self-released mix.
        title: "Some Podcast - March 2026",
        channel: "Some Podcast",
        date: "2026-03-20",
        known: { "Some Podcast": { type: "podcast", mixes: 120 } },
        expectEntity: "",
        expect: "2026-03 - Some Podcast"
    },
    {
        // The same "@" in front of a real place is untouched - only a pure date turns it into
        // a separator, and a month name alone is no date (a name carries one far more often).
        title: "Ingo Sänger @ Sisyphos",
        channel: "Ingo Sänger",
        date: "2026-08-10",
        known: { "Ingo Sänger": { type: "artist", mixes: 3 }, "Sisyphos": { type: "venue", mixes: 40 } },
        expectEntity: "Sisyphos",
        expect: "2026 - Ingo Sänger @ Sisyphos"
    },
    {
        // The same title with an act the wiki has never heard of: nothing backs the swap, so
        // what the uploader wrote stands. The fraction still may not split the name.
        title: "1/2 Faultierdisko @ 3000Grad Festival 2023",
        channel: "lockige Ostsee",
        date: "2023-08-14",
        known: { "3000Grad Festival": { type: "event", mixes: 335 } },
        expectArtists: [ "1/2 Faultierdisko" ],
        expect: "2023 - 1/2 Faultierdisko @ 3000Grad Festival"
    },
    {
        // Reported: came out as "2026-07-25 - Brotfabrik & k²0 Open Air - Leipzig Ri0D. &
        // Jonbot" - the leftover chunks glued into an entity nobody wrote. Three rules from
        // the report: the 0 of "k²0" is a spelling, not a number that counts, so the bit may
        // not fail the event branch's "an event is a place, not a series" guard; the bit the
        // wiki backs as an ARTIST is who played there, not whatever stands first around the
        // event ("Leipzig" is a chunk of its own and must never be merged into a name); and
        // the artists an "&" joins are asked one by one, which is how "Ri0D." gets its answer
        // at all. That answer is a REDIRECT to "RiOD." - one substituted character, the wiki
        // correcting a spelling - so the target is what the title and the categories write.
        // The report expected the bare year "2026"; the title's own event date (25.07.2026)
        // is kept, as with every date a title states.
        url: "https://soundcloud.com/brotfabrikleipzig/brotfabrik-x-k-0-open-air-25",
        title: "Brotfabrik X k²0 Open Air - 25.07.2026 - Leipzig - Ri0D. & Jonbot",
        channel: "Brotfabrik Leipzig",
        date: "2026-08-01",
        known: {
            "Ri0D.": { matches: [ { title: "RiOD.", type: "artist", mixes: 2, matchedTitle: "Ri0D.", matchType: "redirect", exactCase: true } ] },
            "Brotfabrik": { type: "venue", mixes: 5 }
        },
        expectArtists: [ "RiOD.", "Jonbot" ],
        expectEntity: "Brotfabrik & k²0 Open Air",
        expectChunks: [ "Brotfabrik & k²0 Open Air", "Leipzig", "Ri0D. & Jonbot" ],
        expect: "2026-07-25 - RiOD. & Jonbot @ Brotfabrik & k²0 Open Air"
    },
    {
        // Reported: came out as "2026-08-18 - Drumcomplex - DrumcomplexEd Radio 311", an
        // entity that is no category while Category:Drumcomplexed Radio Show holds 311 mixes.
        // Two rules, both about a word that was cut where it belonged to the name:
        // - the channel "Drumcomplex" is the first eleven characters of "Drumcomplexed", and
        //   the Normal Case pass split the word there to leave the channel spelling standing,
        //   which re-cased the leftover "ed" into a word of its own (mdbTitle_standsAlone)
        // - the episode keyword "Show" is part of the series name, not a counting word, so 4c
        //   may only cut the number out of the numbered bit (mdbTitleCounterWords)
        // The uploader writes "<title> | <channel>", which is what puts the number and the
        // channel into different bits and sends the title through 4c rather than through 6b.
        // The report expected the date 2026-08-17, the Monday this weekly show airs; nothing
        // in the title says so and the upload date is what we have.
        url: "https://soundcloud.com/drumcomplex/drumcomplexed-radio-show-311",
        title: "Drumcomplexed Radio Show 311 | Drumcomplex",
        channel: "Drumcomplex",
        date: "2026-08-18",
        known: {
            "Drumcomplex": { type: "artist", mixes: 120 },
            "Drumcomplexed Radio Show": { type: "podcast", mixes: 311 }
        },
        expectArtists: [ "Drumcomplex" ],
        expectEntity: "Drumcomplexed Radio Show 311",
        expectAsked: [ "Drumcomplexed Radio Show" ],
        expect: "2026-08-18 - Drumcomplex - Drumcomplexed Radio Show 311"
    },
    {
        // Reported about the CATEGORIES, not the title: the title was right and the page was
        // filed under the event alone, while MixesDB has the venue behind the comma as a
        // category of its own - the created page carries [[Category:Far Blue]] AND
        // [[Category:Noordspace]]. A place group offers every one of its parts now
        // (mdbTitle_placeGroupNames), and which of them the page really files under is the
        // wiki's answer, asked at filing time (mdbPageCreator_entityCategoriesFor): the venue
        // answers, the city in the same group answers nothing and stays out of the categories
        // while staying in the title.
        url: "https://soundcloud.com/farblue/lord-of-the-isles-at-far-blue",
        title: "Lord Of The Isles at Far Blue @ Noordspace - 13.06.26",
        channel: "Far Blue",
        date: "2026-08-20",
        known: {
            "Lord Of The Isles": { type: "artist", mixes: 36 },
            "Far Blue": { type: "event", mixes: 1 },
            "Noordspace": { type: "venue", mixes: 1 }
        },
        expectArtists: [ "Lord Of The Isles" ],
        expectEntity: "Far Blue",
        expectEntities: [ "Far Blue", "Noordspace" ],
        expect: "2026-06-13 - Lord Of The Isles @ Far Blue, Noordspace"
    },
    {
        // Reported about the LOOKUP, not the title: the wiki was asked about "Flirt w/ Route",
        // a name that cannot exist, while Category:Route 8 - an artist with 8 mixes - was
        // never asked from the chunk side at all. Two rules:
        // - "w/" ends a CHUNK the way it ends a name in the parse (3b): the guest is a unit
        //   of the title and a candidate of their own, and the connector belongs to no name
        // - the trailing number comes off for the lookup, but the name WITH it is asked next
        //   to the reduced one unless the title said the number counts editions
        //   (mdbTitle_numberBelongsToName). Not every "<name> <number>" is a numbered series:
        //   "Route 8" and "Asa 808" are artists, "Studio 80" and "Bar 25" are venues, and the
        //   reduced form does not merely answer empty - "Studio" finds four other clubs.
        url: "https://soundcloud.com/rblmedia/flirt-w-route-8-brl-071225",
        title: "Flirt w/ Route 8 | BRL-071225",
        channel: "rbl.media",
        date: "2025-12-11",
        known: {
            "Route 8": { type: "artist", mixes: 8 }
        },
        expectArtists: [ "Flirt", "Route 8" ],
        expectChunks: [ "Flirt", "Route 8", "BRL" ],
        expectAsked: [ "Flirt", "Route 8", "BRL" ],
        expectNotAsked: [ "Flirt w/ Route" ],
        expect: "2025-12-07 - Flirt, Route 8 - BRL (Promo Mix)"
    },
    {
        // Same round, reported about the lookup again: a chunk whose names a JOINER strings
        // together scored as a series on the digits of a name, so it was sorted into the
        // entity column and the per-name split - which only runs on artist-role chunks -
        // never ran. Neither artist was asked. A b2b/&/vs/comma list is a line-up whatever
        // digits stand in it (only a series WORD still overrules it), and its number is not
        // stripped either: it belongs to the last NAME in the list, and no episode of a
        // series is written as a b2b. Both members are asked as written, "Asa 808" and not
        // "Asa" - the point of the case, which is why it states the asked names.
        title: "Asa 808 b2b Third Guy",
        channel: "Rinse FM",
        date: "2026-08-20",
        known: {
            "Asa 808": { type: "artist", mixes: 6 },
            "Third Guy": { type: "artist", mixes: 3 },
            "Rinse FM": { type: "radio", mixes: 900 }
        },
        expectArtists: [ "Asa 808", "Third Guy" ],
        expectAsked: [ "Asa 808 b2b Third Guy", "Asa 808", "Third Guy" ],
        expectNotAsked: [ "Asa" ],
        expect: "2026-08-20 - Asa 808 b2b Third Guy - Rinse FM"
    }
];
