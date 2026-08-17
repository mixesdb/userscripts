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
 * repeats the middle group of expect. expectEntity is its sibling for the ENTITY category,
 * worth writing down where reading it off the title is the point - a live title's first
 * place, say.
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
        expect: "2026-08-05 - Solma - DSS 139"
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
        // what the wiki answered: the channel is an Artist, "Elsewhere Loft" is no category at
        // all (its club "Elsewhere" is one, but that is not the name in the title)
        known: { "alexander:louis": "artist" },
        expect: "2026-07 - alexander:louis @ Elsewhere Loft"
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
        expect: "2026-08-04 - Miss Luna - Dance TV DJ Mix 679"
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
        title: "Some DJ - Live at Berghain (Part 2)",
        channel: "Some Label",
        date: "2026-08-07",
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
    }
];
