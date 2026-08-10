/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Examples for the page creator's tracklist detector
 *
 * Real player descriptions, as the site's API hands them over, next to the tracklist that has to
 * come out of them. Run them with:
 *
 *     deno run --allow-read includes/page_creator/tracklist_examples_test.js
 *
 * The text is the WHOLE description on purpose - prose, links, headings and all. What the
 * detector has to get right is not "does this line look like a track" but where the tracklist
 * starts and stops, and that question does not exist in a trimmed fixture.
 *
 * Only the length and the two edges of the block are asserted. Everything in between follows
 * from them: a block that starts and ends on the right line and has the right number of lines
 * cannot have taken a different stretch of the text.
 *
 * The comment above each case names what it guards. A case that fails is telling you which of
 * those the change broke - the rules themselves live in tracklist_detector.js.
 *
 * expect: null means the description holds no tracklist and none may be invented. That case is
 * as important as the others: a wrong tracklist on a new mix page is worse than no tracklist.
 *
 * This file is NOT @required by any script.user.js - it is test data, not something to ship to
 * every player page.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var mdbTracklistExamples = [

    {
        // Padded numbers, a "Tracklist:" heading and a blank line above the block.
        url: "https://soundcloud.com/lx-f/mixing-diaries-041",
        text: "Tracklist:\n\n01. Matt Lange - Thirteen\n02. Furkan Alper, Ozan Yazgan - Hear Me\n03. Moritz Hofbauer - Desert Rose\n04. Hollt, Lake Avalon - Anomia\n05. Stil & Bense - Soft Core (Abstraal Remix)\n06. Dropboxx, Jaen Paniagua - Psychological (Strinner Remix)\n07. Baset - Oceana (Monarke & SEVN Remix)\n08. Horisone - Make Sense\n09. Max Freegrant, Miss Monique - Stranger Things\n10. Agustin Pietrocola - I Tried\n11. Matan Caspi - Crystal Ball\n12. Redspace - I Work In Cash\n13. Marc DePulse, Anthony Cole - Gungis\n14. Stratoverb - Satisfied\n15. MARIA Die RUHE, RAESA - We Share\n16. ANUQRAM - Sirocco\n17. Cosmic Gate, Pretty Pink - Bloom\n18. Jerome Isma-Ae - Encounter (Extended Discotheque Mix)\n\n2026\n\nmy diary of electronic music",
        expect: {
            lines: 18,
            first: "01. Matt Lange - Thirteen",
            last:  "18. Jerome Isma-Ae - Encounter (Extended Discotheque Mix)"
        }
    },
    {
        // Three paragraphs of promo above it, one of them a 1001Tracklists link - a URL line must never join a run.
        url: "https://soundcloud.com/moltorecordings/molto-in-the-mix-guest-of-6",
        text: "MOLTO IN THE MIX is the weekly podcast by Molto Recordings, bringing you the finest selectors and hottest talents from the international electronic music scene.\nThis week special guest buyArt 🎧\n\nFollow buyArt: https://www.instagram.com/buyart_music\n\nTracklist available on 1001Tracklists: https://1001.tl/1lx248ut\n\n1. Noir & Haze, Solomun - Around (Akami private Edit)\n2. PEZNT, Mr. V - The Preacher (N.W.N. Remix)\n3. ATFC - Strong 2 Survive (Dario D'Attis Remix)\n4. Lorenzo Spano, TWOEF - Baby Take Me Home\n5. Harry Romero - Don’t You Want Some More \n6. ReLight Orchestra - For Your Love (The Cube Guys Remix)\n7. buyArt, Silk Frequency - I've Got Everything (Set Me Free) \n8. Emanuel Satie - Give It All\n9. Demuir - Ain't No Stoppin'\n10. Nick Curly, Joëlla Jackson - Attention\n11. Matteo Dentone - Happy\n12. Piem, SLM - Activated\n13. Celeda, Jesus Fernandez, Karl8 & Andrea Monta - The Underground\n14. CASSIMM - LOVE DESIRE\n15. Robbie Groove, Alex Ferrarini, Francesco Capodaglio - In My House!\n16. Ben Kim ft. A.D.O.R. - Reload The Renegade Master\n17. buyArt, Silk Frequency - Feel It (Kyle Owen Remix)\n18. ESSE (US) - Make My Day\n19. Funky Green Dogs - Fired Up! (Malóne Morez Remix)\n20. Inner City - Good Life\n21. Disclosure - Tondo",
        expect: {
            lines: 21,
            first: "1. Noir & Haze, Solomun - Around (Akami private Edit)",
            last:  "21. Disclosure - Tondo"
        }
    },
    {
        // "N - Artist - Title": the number is separated by the same dash as the artist.
        url: "https://soundcloud.com/pesheto/hernan-cattaneo-resident-3",
        text: "1 - Gonzalo Sacc - You & Me\n2 - Fran Garay & Diego R - Closed Feelings\n3 - MD Sound - Another Life\n4 - Artic White - Rosea (D-Nox & Kamilo Sanclemente Remix)\n5 - Steve Bug & Youandme - I Hear You (Julieta Kühnle Remix)\n6 - Michael Bennett - Clandestine (DJ Ruby Remix)\n7 - Kevin Di Serna & Cruz Vittor - Dimension Dreams\n8 - Kostya Outta - Feel It\n9 - CANCCI - The Treasure Inside (Baunder Remix)\n10 - Hernan Cattaneo & Cass - Cut Across The Axis\n\nhttps://podcast.hernancattaneo.com/",
        expect: {
            lines: 10,
            first: "1 - Gonzalo Sacc - You & Me",
            last:  "10 - Hernan Cattaneo & Cass - Cut Across The Axis"
        }
    },
    {
        // Labels in brackets behind the title, and a bare www. line above that is no URL to a regex looking for http.
        url: "https://soundcloud.com/musicmichon/michon-presents-134533968",
        text: "Listen to Polyptych Stories on DI.FM every Thursday at 5 PM (CET):\nwww.di.fm/shows/feelings-field\n\nTracklist:\n1. Maxim Lany, Samer Soltan - This Groove (Original Mix) [Sanctuary Music]\n2. Ambrosia - Viridian (Flanerr Remix) [Stellar Fountain]\n3. Atlantis - Fiji (Yeadon Extended Mix) [Anjunabeats]\n4. TOBAK, Patrick Ruprecht - Mournful Cadence (Extended Mix) [Perspectives Digital]\n5. Doriaan - Enigma (Zstimer Remix) [Polyptych Limited White]\n6. Mattim - Locked In (Original Mix) [District Rec]\n7. Dave Seaman - Nightfalls (Dilby Remix) [Selador]\n8. Oppaacha - False Escape (Extended Mix) [Bar 25 Music]\n9. MSW Collective - Fade (Extended Mix) [Journey of the Soul]\n10. NTO (FR), Mont Rouge - I Cared For You (Tim Engelhardt Extended Remix) [All Night Long]\n11. Ezequiel Arias - Sin Control (Extended Mix) [Anjunadeep]\n12. Nordfold - Collide (Extended Mix) [Anjunadeep]\n13. sentir, Flo le Fortis, Guaved - Feel So Good (Extended Mix) [Paraiso]\n\nEnjoy Listening.\n\n\nLanding - fanlink.tv/michonsocials\nSoundcloud - @musicmichon\nFacebook - www.facebook.com/MichonOfficial\nInstagram - www.instagram.com/thisismichon\nSpotify - open.spotify.com/artist/28JptvvxvdFtGNY6NZpJTv\nBeatport - www.beatport.com/artist/michon/572550",
        expect: {
            lines: 13,
            first: "1. Maxim Lany, Samer Soltan - This Groove (Original Mix) [Sanctuary Music]",
            last:  "13. sentir, Flo le Fortis, Guaved - Feel So Good (Extended Mix) [Paraiso]"
        }
    },
    {
        // Cues behind the number, unnamed "ID" tracks, and - the point of this case - a "6 Decks - 2 Mixers" line right above the block that reads as a numbered track 6.
        url: "https://soundcloud.com/hardtimesrecordsuk/hard-times-masters-at-work-1st",
        text: "We have to go all the way back to the beginning… when a few friends, armed with nothing more than a small bank loan and a big dream, set off on an incredible journey.\n\nWith no experience, and a club tucked away in a small town, it was a miracle we survived the first month. So when we reached our first birthday on the 6th August 1994, we celebrated in style…\n\nThat night, Masters At Work made their first appearance at Hard Times - bringing with them 6 decks, 2 mixers, and delivering a set that, even today, remains unrivalled.\n\nNo computers. No USB sticks. Just pure mixing skill and an ear for music beyond natural. Working together in their own unique way, they created something truly unforgettable.\n\nThroughout our history there have been a few very rare, can’t-miss special events. Our first birthday was one of them… and when Masters At Work return to play The Box at MOS, it will be another.\n\nWe were lucky enough to record that legendary first birthday set, and as a taste of what to expect on Sat May 23rd at the Ministry of Sound, we proudly present…\n\nHard Times 1st Birthday\nMasters At Work\n6 Decks - 2 Mixers\n\n01. [000] Hardrive - No Cure\n02. [003] Jark Prongo - Helios w M People - Moving On Up (Sanchez Dub)\n03. [006] ID You're So Special If You Just Believe\n04. [008] Cassio The Cassmaster Getting Hot (The Newark Brick City Mix)\n05. [012] Willie Ninja - Hot (Why? Because I'm Hot Mix)\n06. [018] ID\n07. [022] House Of Gypsies - Sume Sigh Say\n08. [026] Dogma Featuring The Afro-Cuban Rhythms - Mas Suave (Afro-Cuban Conga Mix)\n09. [029] Ralph Falcon & Dorothy Mann - The Sound\n10. [036] Todd Terry - Jumpin' (Tee's Unreleased Mix) w George Kranz Din Daa Daa - (Acapella)\n11. [040] Mars Plastic - Find A Way (Acapella)\n12. [044] St Etienne - Only Love Can Break Your Heart (MAW Dub)\n13. [049] Jamiroquai - Emergency On Planet Earth (Masters At Work Rican Dub)\n14. [053] Black Science Orchestra - New Jersey Deep\n15. [059] Masters At Work - Voices (Second Course)\n16. [069] Chez Damier - Can You Feel It\n17. [074] Full Swing - Freestyle Groove\n18. [076] Edward's World - Soul Roots (Piano House Mix)\n19. [085] ID Come On\n20. [088] Ultra Nate - Never Forget\n21. [092] Todd Terry - Rain (Unreleased Project)\n22. [097] Sun Sun Sun - Curious\n23. [100] Hardrive - Deep Inside - (Acapella)\n24. [105] MAW Presents People Underground - My Love\n25. [111] ID Chuck Roberts - My House (Acapella)\n26. [114] Barbara Tucker - I Get Lifted (Duck Beats)",
        expect: {
            lines: 26,
            first: "01. [000] Hardrive - No Cure",
            last:  "26. [114] Barbara Tucker - I Get Lifted (Duck Beats)"
        }
    },
    {
        // No numbering at all, and prose both above AND below the block, the paragraph below ending in a URL.
        url: "https://soundcloud.com/slothboogie/slothboogie-guestmix-281-fred-everything",
        text: "This week, we've got something special for the headz... to celebrate the forthcoming release of his EP 'L'art De La Retenue EP' (on Kerri Chandler's seminal label, Madhouse) Fred Everything has lovingly crafted a tribute mix to one of his personal heroes. \n\n\"Ahead of the release of my EP L’Art De La Retenu on Kerri’s label Madhouse, I thought It would be great to pay my respects to the man himself with a mix of some of my favourite production of his. I wanted to showcase his wide range of influences and various periods with lesser known tracks as well as fully fledged classics. Originals, Remixes, Dubs, Edits, Collaborations…\n\nI did the mix in one take, armed with a pile of records and a digital playlist. I also did a special Edit of his Dub Disco classic Ladbroke Grove, especially for this occasion.\n\nThanks to SlothBoogie for the opportunity, Simon at Madhouse for the support and of course Kerri Chandler for years of inspiration.\n\nThis mix is dedicated to the memory of my good friend Philippe Larochelle who introduced me to a lot of the music included in this mix.\"\n\nTracklist:\nKerri Chandler - Stop Wasting My Time [K7]\nKerri Chandler - Ladbroke Grove (Fred Everything Re-Fix) [Large]\nAfro Elements - Lagos Jump (Alto Dub) [Ibadan]\nKerri Chandler - Sunday Sunlight [Apollonia]\nRootstrax - Harlequin (Kerri Chandler Unreleased Edit) [Deeply Rooted House]\nMakam - You Might Lose It (Kerri Chandler Deep Mix) [White]\nKerri Chandler - On The Run [Freetown]\nDonna Gilles - Rub-A-Dub-Dub (Organized Mix) [Downtown 161]\nKerri Chandler - Harder Gets Higher [King Street]\nKerri Chandler - What About Us [Large]\nKerri Chandler - Sunset [Nite Grooves]\nDreamer G - I Got That Feeling [Madhouse]\nKerri Chandler & Jerome Sydenham - Esperito Du Tempo (Babatunji’s Dub) [Ibadan]\nCesaria Evora - Nho Antone Escaderode (Kerri Chandler Main Mix) [Lusafrica]\nKerri Chandler - Grass Cutter (Kaoz Afro Drum) [King Street]\nKerri Chandler - Moving In [Downtown 161]\nRisk Sound System - The Sound Is Yours (Kerri Chandler Remix) [Legato]\nKerri Chandler - The Machine [Max Trax]\nKerri Chandler feat Arnold Jarvis & Fonda Rae - You’re The Best (Don’t Let Go) [Freetown]\nKerri Chandler - Track 1 [Shelter]\nKerri Chandler - Track 1 (Jazz Mix) [Max Trax]\n\nCop Fred's new EP on vinyl and digital later this month:\nhttps://www.juno.co.uk/products/fred-everything-lart-de-la-retenue-ep/819634-01/\n\nArtist: @fredeverything",
        expect: {
            lines: 21,
            first: "Kerri Chandler - Stop Wasting My Time [K7]",
            last:  "Kerri Chandler - Track 1 (Jazz Mix) [Max Trax]"
        }
    },
    {
        // No numbering, and a "Harry Wolfman | Sly Contrast EP | Dirt Crew Recordings" line above.
        url: "https://soundcloud.com/dirt-crew/dirtcast-138-harry-wolfman",
        text: "Harry Wolfman is back with a new EP on Dirt Crew Recordings, and this wonderful soothing mix to celebrate the release, Enjoy :)\nhttps://soundcloud.com/harrywolfman\n\nHarry Wolfman | Sly Contrast EP | Dirt Crew Recordings\nVinyl / Download / Stream : https://ffm.to/dirt130\n\nTrack List:\nWilliam Basinski & Lawr - Mono No Aware\nHarry Wolfman - A21z\nI-f - The Wanderer\nScrappy - Freeze (Limelight Mix)\nSoulphiction - Ballin’\nEOD - Aspect\nHarry Wolfman - Sly Contrast\nSkee Mask - Rev8617\nRian Treanor - Obstacle 3\nLondon Modular Alliance - Cherenkov Light\nAntigone - Dance\nJ. Albert - Joy Of Rebirth\nChevel - B4 GB\nPolski Złoty - Palmbeach\nDatassette - When I’m Gone (w Mücha)",
        expect: {
            lines: 15,
            first: "William Basinski & Lawr - Mono No Aware",
            last:  "Datassette - When I’m Gone (w Mücha)"
        }
    },
    {
        // No numbering, trailing spaces on some lines, and "Spooky - J - Pfer" carrying two dashes.
        url: "https://soundcloud.com/dkmntl/dekmantel-podcast-292-kate-miller",
        text: "It was local word of mouth that elevated Australian @katemiller from local to international notoriety. Her ability to fluidly jump genres and eras always leaves dance floors in a spin, and after emerging in Melbourne she followed the music to Berlin when she eventually became resident at the Oscillate party at ://about blank. Those sets allowed her the freedom to explore and pick up a fan base, and now she is someone who tells long and winding stories, with selections and feelings that define her sets more than tempo or technicality.\n\nThe 90 minute session Kate lays down for us is perfectly warm and rhythmic. It's united by rubbery kicks and deep, warm sub bass, but ever changing kick patterns and synths that range from absorbing and ambient to dark and paranoid always keep things moving. It is the sound of a DJ who is always in control, a masterclass in tension and release that means you're always on the edge, excited for what is to come.\n\nTracklist: \nFFT - Forward\nUlla - Leaves and Wish\nD. Tiffany - 4leaf\nDJ Sacom - Wisdom\nDJ Python - ooophi \nToma Kami - Unreleased\nITOA - Top Deck\nSpooky - J - Pfer\nYOUTH - Diamonds\nFacta - 4C Loop\nCop Envy - Diving Board\nMr. Mitch - Need More Fashion Friends\nSP:MC - Vintage\nLow End Activist - 19STR8BK\nSepehr - Unfold Your Myth\nKush Jones - Pre-Club Workout (feat. DJ Swisha & James Bangura)\nJames Bangura - Broken Mind\nJana Rush - Midline Shift\nDJ Fulltono - Melt into the Floor\nRaime - Ripli\nSNKLS - Isandula\nFlore - Uncoded Language \nFFT - Fask\nToma Kami - Unreleased\nEl Trick - Ko ko dak dak\nJ. Majik - Hold You\nexael - Composure\nKate Miller - Parker Street",
        expect: {
            lines: 28,
            first: "FFT - Forward",
            last:  "Kate Miller - Parker Street"
        }
    },
    {
        // No numbering, labels written behind the title without brackets, and a first track carrying two dashes.
        url: "https://soundcloud.com/mitdirfestival/dj-lion-mit-dir-festival-2018",
        text: "www.mit-dir-festival.de\n\nTracklist:\n\nDj Lion - Mit Dir Intro - Camisra - Let Me Show You / Alta Moda\nPatrick Milaa - Chasing (Original Mix) Patent Skillz\nDj Lion - Tasmanian Devil (Original Mix) Gem Records\nDj Lion - Lollapalooza (Original Mix) Gem Records\nPatrick Milaa - London (Dj Lion Berlin Remix) Patent Skillz\nDj Lion - Minimum Maximum (Original Mix) Harthouse\nGabe - Sour Bubble (Dj Lion Spicy Remix) Patent Skillz\nDj Lion - Mightery (Original Mix) Harthouse\nPatrick Milaa - MM2 (Original Mix) Demo\nPatrick Milaa - Throwback (Original Mix) Patent Skillz\nDavid Granha - Chrome (Original Mix) Sincopat\nAsh Roy & Calm Chor - New Toys (Dj Lion & Tomy Wahl Remix) Soupherb Records \nMaksim Dark - Super Pulse (Original Mix) Authentisch\nTHNK - Neverland (Extended Mix) Armada)\nDj Lion - Dream Come True (Original Mix) Patent Skillz\nDj Lion - Lovejitter (Original Mix) Harthouse\nMetodi Hristov, Artslaves - Flip Trip (Dj Lion Remix) Set About\nKaiser Souzai - Plastic Dreams (Dj Lion Remix) Patent Skillz\nDJ Lion, Luigi Rocca - Repeat Repeat (Original Mix) 303 Lovers\nDj Lion - Stormphony (Original Mix) Set About\nDj Lion, Tomy Wahl - Kiss The Ground (Original Mix) Patent Skillz\nDj Lion, Tomy Wahl - Pulsasia (Original Mix) Patent Skillz\nDj Lion, ROTH ft. BONDI - The Lion (Original Mix) Patent Skillz\nStefano Pini - 2067 (Dj Lion Remix) Harthouse",
        expect: {
            lines: 24,
            first: "Dj Lion - Mit Dir Intro - Camisra - Let Me Show You / Alta Moda",
            last:  "Stefano Pini - 2067 (Dj Lion Remix) Harthouse"
        }
    },
    {
        // No tracklist in the description at all - it is in a comment, and only unnumbered, which nothing can split back into tracks. Must stay null.
        url: "https://soundcloud.com/resident-advisor/ra-1051-mietze-conte",
        text: "An antidote to the summertime banger, with an hour of breezy ambient from the Vienna artist.\n\nWhen we picture the summertime banger, we picture high energy. But with record-breaking heatwaves from South Korea to the South of France, a different soundtrack makes sense.\n\nCue RA.1051. Across an hour of woozy lo-fi electronics—many his own productions—Mietze Conte offers the alternative, inspired, as he puts it below, by \"the fresh cool cleansing breeze\" after a storm.\n\nAt his most energetic, the Vienna artist appeals to fans of Live From Earth or 1tbsp—eurodance meets hyperpop with a DIY smirk. At his most contemplative, he drifts toward the ambient reverie of Otto Benson and Dylan Henner. What ties it together is playfulness: songs under two minutes, hand-drawn covers, music that's deeply serious and deeply unserious at once.\n\nHere he goes wide without raising the temperature, from Green-House to Nala Sinephro to Terekke's dub-hazed loops. Step into his world and find some much-needed shade.\n\nFind the tracklist and Q&A at ra.co/podcast/1070 \n@mietzeconte\n \n",
        expect: null
    },
    {
        // Labels written behind the title with the SAME " - " the artist is separated by, so every line carries two dashes and none of them is the one that matters. Also a bare "TRACKLIST" heading (no colon) and a "Thanks for listening!" line right under the block.
        url: "https://soundcloud.com/deep-space-helsinki/july_2026",
        text: "29th July 2026 episode with Juho Kusti\n\nTRACKLIST\n1. Forest On Stasys - Third Eye Dome - Orientation Records\n2. Onyr - Shama - Linderluft\n3. Ben Behrendt - History Of The World - Analogue Audio Archive\n4. Peralta - Regression - Forbidden Sessions\n5. HOV - Delayed Emanations - The Gods Planet\n6. Vladw - Hishi - Navigare Audio \n7. DSNGDMANN - Non-Figurative - Sintetics\n8. EMZOO - Omniverse 1.4 - Unspace\n9. Translate - Glass Ionomer - Analogue Audio Archive\n10. Vladw - Drya (Luigi Tozzi Remix) - SubSensory\n11. Forest On Stasys - Reptile Genetics - Delsin\n12. Johno - Squeeze Until you Can - Ucker Records\n13. Local Analyst - Skull Crack - SubSensory\n14. radd - Coworkers - Float Records\n15. Rutechno - Lucid Drift - Echoic Depths Records\n16. eaien - Encounter - Vertebrate\n17. Antidote MT - Esplora L’Infinita - Humanoid Gods\n18. Hugo Rolan -  Conducta Artificial - Analogue Audio Archive\n19. Translate - Nerv - Phyr Records\n20. Border One - Spectral Tension - Token\n21. Justine Perry - Blue Signal - Ostgut Ton\n22. OCHERii - Music Is Satan - Periphery Music\n23. MarekSPolzki - Self Destruction - Humanoid Gods\n24. Biorc - Gradiente - Warm Up Recordings\n25. David Reina - Side Glance - Illegal Alien\n26. Ottagone - Ottagone 036 - Will & Ink\n27. eaien - Marble - Vertebrate\n28. Lewis Fautzi - Paranoid Signals - Faut Section\n29. Paula Koski - Maeve - Ostgut Ton\n30. David Reina - Sinag - Illegal Alien\n31. Phase Fatale - Guts - Dekmantel\n\nThanks for listening!",
        expect: {
            lines: 31,
            first: "1. Forest On Stasys - Third Eye Dome - Orientation Records",
            last:  "31. Phase Fatale - Guts - Dekmantel"
        }
    },
    {
        // Every track is its own paragraph, so the description holds a blank line between each pair of them - and the cue is written BEHIND the track, on two lines with a chapter name hung off the cue. Guards both the blank-line bridging and the tidying, and the expected edges are what the tidying makes of them.
        url: "https://soundcloud.com/sultanshepard/dialekt-radio-339",
        text: "1. Dusky - Bindweed 00:00:40\n\n2. Lane 8 & PARIS - Purple Pepper 00:04:46\n\n3. Madraas - Mosaic 00:09:37\n\n4. Christian Smith - Mileage Run (Dmitry Molosh Remix) 00:15:29\n\n5. Teho - Day By Day 00:22:08\n\n6. Adriatique & GENESI - Closer 00:27:15\n\n7. Eelke Kleijn - Hold On 00:33:16\n\n8. M.O.S. - Skywalkers 00:38:08- DIALEKT TRACK OF THE WEEK\n\n9. PARIS - Flourish (Just Her Remix) 00:43:04\n\n10. Coccolino Deep - Time 00:47:17\n\n11. Jon Gurd & Reset Robot - Found You 00:52:09\n\n12. Dennis Ferrer & Jerome Sydenham - Sandcastles (Martijn Ten Velden & Mark Knight Mix) 00:56:00- CLASSIC OF THE WEEK",
        expect: {
            lines: 12,
            first: "1. [00:00:40] Dusky - Bindweed",
            last:  "12. [00:56:00] '''CLASSIC OF THE WEEK:''' Dennis Ferrer & Jerome Sydenham - Sandcastles (Martijn Ten Velden & Mark Knight Mix)"
        }
    }
];

// Comment tracklists. A SoundCloud comment is a single line, so numbering is the only thing
// left to split on - see the header of tracklist_detector.js.
var mdbTracklistCommentExamples = [
    {
        // The real thing: one comment holding the whole tracklist, numbered right through.
        what: "a numbered tracklist posted as one comment",
        comments: [
            "great set!",
            "1. Baldo - Wanna Be 2. Chaos In The CBD - Multiverse 3. Mall Grab - Sun Ra 4. Ross From Friends - Talk To Me You'll Understand 5. DJ Boring - Winona 6. Palms Trax - Equation 7. Hodge - Ruby",
            "@user thanks!"
        ],
        expect: {
            lines: 7,
            first: "1. Baldo - Wanna Be",
            last:  "7. Hodge - Ruby"
        }
    },
    {
        // The kind of comment this must never fall for: a single track ID, which is what the
        // overwhelming majority of comments naming an "Artist - Title" are.
        what: "single track IDs",
        comments: [
            "25:00 is Skee Mask - Rev8617",
            "the one at 42 min? Objekt - Ganzfeld",
            "3. is Peverelist - Roll With The Punches",
            "ID @ 1:02:30 anyone?"
        ],
        expect: null
    },
    {
        // Unnumbered, exactly like the RA.1051 comment in the description examples above. There
        // is no way back from "Artist - Title Artist - Title" to single tracks, so it is left
        // alone rather than guessed at.
        what: "an unnumbered tracklist run together in one line",
        comments: [
            "Mietze Conte - soni Mietze Conte - MOP Mietze Conte - keee Ann Annie - Moons Apart Fools - Limba Green House - Peperomia Seedling Haruhisa Tanaka - Sprout"
        ],
        expect: null
    },
    {
        // Numbers that do not start at 1 and do not count up are a conversation, not a tracklist.
        what: "numbers that are not a tracklist's numbering",
        comments: [
            "top 3 for me: 5. Ellen Allien - Alles Sehen 12. Answer Code Request - Cimmerian 30. Efdemin - Track 4, rest was filler"
        ],
        expect: null
    }
];
