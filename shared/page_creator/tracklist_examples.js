/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Examples for the Page Creator's tracklist detector
 *
 * Real player descriptions, as the site's API hands them over, next to the tracklist that has to
 * come out of them. Run them with:
 *
 *     deno run --allow-read shared/page_creator/tracklist_examples_test.js
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
    },
    {
        // Unnumbered, and track 13 is mistyped "Kate Bush -Running Up That Hill" - no space behind the dash. A line that is not a candidate ENDS the run, so this one typo used to cut the list in two and hand back the longer half (the last 18 tracks) as if it were the whole thing.
        url: "https://soundcloud.com/tanzmarke/mit-dir-festival-2024-muhle",
        text: "Mein Beitrag zum MIT DIR Festival 2024. 1000 Dank für die Einladung.\n\nTracklist\n\nKROCODEAL - Terr (Original Mix)\nRiver Red - Otherside (Cuprite & Amir Telem Remix)\nFred Ventura - Dancing Alone (A.P. Mono 1984 Remix)\nKimshies - The Hours (Original Mix)\nCoxenberg - Focus (Leo Sagrado Remix)\nAFFKT - Corcho (Kimshies Remix)\nK2W0 - Ain't no Sunshine (SAQIB Remix)\nNUAH - Smalltalk (Atric Remix)\nKaufmann - In Control (Original Mix)\nPavel Petrov & Rafael Cerato - Intelligence (Extended Mix)\nSian & David LeSal - Black T-Shirt (Original Mix)\nBOHO - Eigelstein (Kiko Remix)\nKate Bush -Running Up That Hill (Notre Dame Edit)\nI Promised Mom - Nobody Knows (Original Mix)\nGnarls Barkley - Crazy (DEFLEE, Panic Chase)\npizzaaftersex - Flow (Far&High Edit)\nDelara Ja - Skylight (Original Mix)\nZakmina - Running Amore (Original Mix)\nG.Pal, Alexandros Djkevingr, Gabriel Di Pasqua - Medusa (Anatolian Sessions Remix)\nCloz - Deeper (Gueva Remix)\nPavel Petrov - Wir Brauchen Bass (Original Mix)\nBlack Accord - Drinks House (Original Mix)\nR.E.M - Losing My Religion (Tal Fussman Remix)\nVitalic ft. Vimala - You Are Not Alone (Extended Version)\nGregor Tresher ft. Sven Väth - Flashback (Pavel Petrov Remix)\nRodg & Veljko Jovic - Neonatic (Original Mix)\nEran Hersh, Dmitry KO - Relax (Original Mix)\nSabii - Memories of my soul (Instrumental mix)\nFedele - Your Eyes (Original Mix)\nFelix E feat. Solveig Eger - Meine Katze (Original Mix)\nKimshies - Cowboys Don't Cry (Original Mix)",
        expect: {
            lines: 31,
            first: "KROCODEAL - Terr (Original Mix)",
            last:  "Kimshies - Cowboys Don't Cry (Original Mix)"
        }
    },
    {
        // Artist and title split by a SLASH on every line, so nothing in the block read as a track
        // and no tracklist was found at all. Names its whole `text` because the rewriting is the
        // point: tracks 5 and 6 carry a dash BEHIND the slash, which is part of their title and
        // has to stay one, and the "music.beepd.co/card/anjaschneider" line above the block is
        // what a one-sided slash rule would have swallowed.
        url: "https://soundcloud.com/anjaschneider/clubroom-431-with-anja",
        text: "Hi my dear friends! Its time for another Club Room Mix. Enjoy Club Room Mix #426!\n\nAnja Schneider Clubroom Mix - No. 431\nmusic.beepd.co/card/anjaschneider\n\nTracklist\n\nAckermann / Pure\nJoe Milli / The Less You Know\nJewel Kid / In the dance\nCharles Meyer / Stickin Round\ntraKKman / Jack 2 The Groove - Sound Factory Bar mix \nKevin Saunderson / Inner City Pennies From Heaven - Roland Leesker Remix\nHilit Kolet / Yessir (Anja Schneider Remix)\nYNNY / Take 5\nFu Dog, Sides / Mzanbouncy \nNick Nolan / Say Baby\nMischa Daniels / Take Me higher (Maga Remix)\nBr!NK / Deep turn Around\n\n\nAnd please follow my Anja Schneider Backstage Podcast available on all platforms:\nlnk.to/clubroombackstagepodcast\nwww.youtube.com/@AnjaSchneiderMusic",
        expect: {
            lines: 12,
            text: "Ackermann - Pure\nJoe Milli - The Less You Know\nJewel Kid - In the dance\nCharles Meyer - Stickin Round\ntraKKman - Jack 2 The Groove - Sound Factory Bar mix\nKevin Saunderson - Inner City Pennies From Heaven - Roland Leesker Remix\nHilit Kolet - Yessir (Anja Schneider Remix)\nYNNY - Take 5\nFu Dog, Sides - Mzanbouncy\nNick Nolan - Say Baby\nMischa Daniels - Take Me higher (Maga Remix)\nBr!NK - Deep turn Around"
        }
    },
    {
        // Numbered "N " throughout except tracks 12 and 13, which the uploader typed as "12 - " and
        // "13 - ". Detection was never the problem here - the API's was: it strips the numbering
        // the block agrees on and leaves the two odd lines alone, so they arrive as tracks called
        // "12 - Wassu & Haums" and "13 - Juju". This is the case that guards mdbTracklist_evenIndexes(),
        // so it names its whole `text` - the two lines it is about are in the MIDDLE of the block,
        // where the usual first/last assertions cannot see them.
        // Reported as the block alone, without the URL of the mix it came from.
        what: "mixed \"N \" and \"N - \" numbering in one block",
        text: "1 Aykut Bilir - Humans (Original Mix) Mousike Records\n2 Kaob - Atua (Mula remix) Mousike Records\n3 Massrali - Reeds (Original Mix) Electronical Reeds\n4 Adam Ten, DvirNuns - Comusa (Original Mix) Life And Death\n5 Pryda - Rakfunk (Original Mix) Pryda Recordings\n6 Nash La Musica - Kali (Original Mix) Be Adult Roots\n7 Traffic Report - Airfield\n8 Andfølk - Drift (Original Mix) Caramel Records\n9 Massuma - Mermaid (Original Mix) Places & Spaces\n10 Peter Makto - Naked Soul (Original Mix) HMWL\n11 Dino Lenny - I've Learned That (Jonathan Kaspar Remix) Crosstown Rebels\n12 - Wassu & Haums - Blue Meadow HMWL\n13 - Juju - Souvenirs\n14 JUNO (DE) - Last Dance (Original Mix) Magnifik Music\n15 Rhye, Adam Ten - 3 Days Later (Extended) Higher Ground\n16 CVALM & Ikerfoxx - Often (Extended Mix) ABRACADABRA\n17 Emmanuel Jal, Desiree - Macho (Extended) Ninja Tune\n18 Tahos - DLDL - Soon on HMWL",
        expect: {
            lines: 18,
            text: "1 Aykut Bilir - Humans (Original Mix) Mousike Records\n2 Kaob - Atua (Mula remix) Mousike Records\n3 Massrali - Reeds (Original Mix) Electronical Reeds\n4 Adam Ten, DvirNuns - Comusa (Original Mix) Life And Death\n5 Pryda - Rakfunk (Original Mix) Pryda Recordings\n6 Nash La Musica - Kali (Original Mix) Be Adult Roots\n7 Traffic Report - Airfield\n8 Andfølk - Drift (Original Mix) Caramel Records\n9 Massuma - Mermaid (Original Mix) Places & Spaces\n10 Peter Makto - Naked Soul (Original Mix) HMWL\n11 Dino Lenny - I've Learned That (Jonathan Kaspar Remix) Crosstown Rebels\n12 Wassu & Haums - Blue Meadow HMWL\n13 Juju - Souvenirs\n14 JUNO (DE) - Last Dance (Original Mix) Magnifik Music\n15 Rhye, Adam Ten - 3 Days Later (Extended) Higher Ground\n16 CVALM & Ikerfoxx - Often (Extended Mix) ABRACADABRA\n17 Emmanuel Jal, Desiree - Macho (Extended) Ninja Tune\n18 Tahos - DLDL - Soon on HMWL"
        }
    },
    {
        // Artist and title split by an EN dash on every line but track 10. Detection was never the
        // problem - the Tracklist Editor API's was: it reads the hyphen and the em dash and takes
        // an en dash line for one nameless track, so the box came back orange with "These tracks
        // seem to miss the artist names" listing all of them. Names its whole `text` because the
        // rewriting is the point, and track 10 is the control: a line already written with " - "
        // must come through untouched.
        url: "https://soundcloud.com/whose-these-records/whose-these-cast-02-by-mar-1",
        text: "Bringing \"Whose These Cast\" #02 by @marmonzon\n\nThe series continous with an exclusive mix from argentinian talent @marmonzon who brings an hour of her selection straight from her record bag.\n\nHer selections are rooted in raw house, with strong influences from the 90s and early 2000s, working across both vinyl and digital formats.\n\nShe is currently focused on developing her sound as a producer, working across analog instruments and digital production.\n\nThe second of many exclusive mixes to drop in the coming months!\n\nTracklist: \n\n1. Arion – Squaa\n2. Ranerro & Manuel Correa – Valley of Deaths\n3. 10AM – Good Times\n4. Rossiter – Shabba\n5. Spceboi – The Business\n6. Traumer – Do Not Resist\n7. Toomy Disco – The Deeva\n8. Rossiter – Do It Again!\n9. Matichap – Straight On\n10. Jorge Savoretti & Mai Iachetti - Dunhan\n11. Elias Tabares – Listen To Frank\n12. Sisto – Under Pressure",
        expect: {
            lines: 12,
            text: "1. Arion - Squaa\n2. Ranerro & Manuel Correa - Valley of Deaths\n3. 10AM - Good Times\n4. Rossiter - Shabba\n5. Spceboi - The Business\n6. Traumer - Do Not Resist\n7. Toomy Disco - The Deeva\n8. Rossiter - Do It Again!\n9. Matichap - Straight On\n10. Jorge Savoretti & Mai Iachetti - Dunhan\n11. Elias Tabares - Listen To Frank\n12. Sisto - Under Pressure"
        }
    },
    {
        // A link line under EVERY track, and nearly all of them bare, without the http:// a
        // scheme test would see ("cicutanetlabel.com/release-019/", two of them just
        // "cicutanetlabel.com"). Each one used to END the run, tearing the tracklist into 30
        // runs of one line - they have to vanish instead. The numbering is also written
        // "01.Lifeblood" with no space behind the dot, so no line reads as numbered and it is
        // the " - " lines alone that carry the run.
        url: "https://soundcloud.com/monument-podcast/monument-25-drugstore",
        text: "Drugstore(@drugstore) project began at the beginning of 2009, as union of members of the spanish collective Bayona Music, as a way to express the musical interests of their components. Their goal was to create diverse music with respect to many styles in the electronic music spectrum. Another goal was to publish music for free on licensed Creative Commons netlabels.\r\n\r\nDuring the year 2010, the goal has remained the same, hold and gain respect within the netlabel world and try on the other hand be publishing in labels for payment. Today, the 2 objectives have been met, and Monument is happy to present their work. \r\n\r\nDrugstore music have been supported, reviewed and played by DJs and producers of the electronic music scene from all over the world. Including Dosem (ES), Nuke (ES), Exium (ES), Bas Mooy (NE), A.Paul (PT) or DVNT (UK), among others.\r\n\r\nCheers!\r\n\r\nMonument on Facebook:\r\nhttps://www.facebook.com/MonuMnt?ref=hl\r\n\r\nDrugstore on Facebook:\r\nhttps://www.facebook.com/pages/Drugstore/166765006349?ref=mf\r\n\r\nTracklist:\r\n01.Lifeblood - Gravitational Force Of Destiny [CICUTA NETLABEL 019]\r\ncicutanetlabel.com/release-019/\r\n02.DubReverb - Fiordos [CICUTA NETLABEL 024]\r\ncicutanetlabel.com/release-024/\r\n03.Revy - No Pressure [ZIMMER RECORDS 100]\r\nklaradot.com/www/zimmer-records/?p=1710\r\n04.Lifeblood - The Code [CICUTA NETLABEL 019]\r\ncicutanetlabel.com/release-019/\r\n05.Groof - Darkest Hour [KIDNAPPING 011]\r\nwww.kidnapping-nl.com/es/releases.php\r\n06.Aktiverant - Sudden Drop [CICUTA NETLABEL 023]\r\ncicutanetlabel.com/release-023/\r\n07.JoyB - Rubik's Geometry [CICUTA NETLABEL 024]\r\ncicutanetlabel.com/release-024/\r\n08.Lifeblood - Legacy [CICUTA NETLABEL 019]\r\ncicutanetlabel.com/release-019/\r\n09.Isolate & Spigl - Mode Two [CICUTA NETLABEL 020]\r\ncicutanetlabel.com/release-020/\r\n10.Mono.xID - Kevlar [HEAVEN TO HELL SP005]\r\nwww.beatport.com/track/kevlar-original-mix/4740361\r\n11.Hadji - Retreat (Drugstore Remix) [CICUTA NETLABEL soon]\r\ncicutanetlabel.com\r\n12.Isolate & Spigl - Mode Three (RFS Remix) [CICUTA NETLABEL 020]\r\ncicutanetlabel.com/release-020/\r\n13.Hoth System - Data Spine [CICUTA NETLABEL soon]\r\ncicutanetlabel.com\r\n14.David Reina - Serious Behaviour (Alexander D`aniel Aditional B) [KIDNAPPING 006]\r\nwww.kidnapping-nl.com/es/releases.php\r\n15.Exploit - Utopia [MUTEX RECORDINGS LP001]\r\nwww.beatport.com/label/mutex-recordings/15003\r\n16.Aktiverant - The Unreasonable Lock [CICUTA NETLABEL 023]\r\ncicutanetlabel.com/release-023/\r\n17.Drugstore - Sekhem [CICUTA NETLABEL 024]\r\ncicutanetlabel.com/release-024/\r\n18.Vsk - XXL [CICUTA NETLABEL 024]\r\ncicutanetlabel.com/release-024/\r\n19.David Reina - Rotor [KIDNAPPING 006]\r\nwww.kidnapping-nl.com/es/releases.php\r\n20.David Meiser - Know Your Roots [DARKFLOOR SOUND 003]\r\ndarkfloorsound.co.uk/releases/drkflr003/\r\n21.Christian Wunsch - Alpha Particle [POLE GROUP 019]\r\nwww.redeyerecords.co.uk/vinyl/48545-P…oup-part-i-va\r\n22.Willem B - Wide5 [CICUTA NETLABEL 025]\r\ncicutanetlabel.com/release-025/\r\n23.David Meiser - Inner Fight (Drugstore Remix) [CICUTA NETLABEL 022]\r\ncicutanetlabel.com/release-022/\r\n24.Reeko - Recharger [POLE GROUP 019]\r\nwww.redeyerecords.co.uk/vinyl/48545-P…oup-part-i-va\r\n25.Sawf - Trivoli [POLE GROUP 019]\r\nwww.redeyerecords.co.uk/vinyl/48545-P…oup-part-i-va\r\n26.Adam Kelly - Find A Way Out [KIDNAPPING 011]\r\nwww.kidnapping-nl.com/es/releases.php\r\n27.David Meiser - Technology Is Back [KIDNAPPING 010]\r\nwww.kidnapping-nl.com/es/releases.php\r\n28.Structural Form - Anhilator [KIDNAPPING 008]\r\nwww.kidnapping-nl.com/es/releases.php\r\n29.David Meiser - DNA (The Outlier Remix) [CICUTA NETLABEL 022]\r\ncicutanetlabel.com/release-022/\r\n30.Structural From - 333 (Pussyshaver Replant B) [KIDNAPPING 008]\r\nwww.kidnapping-nl.com/es/releases.php",
        expect: {
            lines: 30,
            first: "01.Lifeblood - Gravitational Force Of Destiny [CICUTA NETLABEL 019]",
            last:  "30.Structural From - 333 (Pussyshaver Replant B) [KIDNAPPING 008]"
        }
    },
    {
        // TWO tracklists, each under a headline - a resident's hour and a guest mix. Both used to
        // be detected and the second silently dropped; MixesDB writes this as chapters
        // (Help:Tracklists#Chapters), so both are taken, each under its ";Chapter" line. Names
        // its whole `text` because the chapter lines ARE the point: the headlines stripped down
        // to the name ("First Hour - Ollie Blackmore:" -> "Ollie Blackmore", "Guest Mix -
        // Natasha Kitty Katt" -> "Natasha Kitty Katt"), and `lines` counts the tracks alone.
        url: "https://soundcloud.com/soulheavenrecords/soul-heaven-presents-004-natasha-kitty-katt",
        text: "Back again with our 4th episode of Soul Heaven Presents with special guest DJ Natasha Kitty Katt.\n\nWe are excited to showcase Natasha's mix having recently joined the Soul Heaven DJ roster!\n\nOllie Blackmore hosts the show, the first hour with deep soulful cuts.\n\n*** Tracklisting ***\n\nFirst Hour - Ollie Blackmore:\n\n01. Soul Slayerz Feat Karina Nistal - Call Me (Vocal Mix)\n02. Mark De Clive-Lowe - Worth The Wait (Mark De Clive-Lowe Remix)\n03. Jimpster - Silent Stars\n04. Sir LSG, Clara Hill - Circles (Sir LSG Main Mix)\n05. Alan De Laniere, Tribalizer - Believe Me (Tribalizer Mix)\n06. Inaky Garcia, Moon Rocket - Dum Dum (Moon Rocket Organ Rmx)\n07. Souldynamic, Miranda Nicole - For Love (Original Mix)\n08. Reelsou - Get Myself Together (Mr. V Remix)\n09. AFRICAN WOMAN (YASS REVIVAL MIX)\n10. Kiko Navarro ft HanLe - Right On (Extended Version)\n\nGuest Mix - Natasha Kitty Katt\n\n01. Twisted Katt - Natasha Kitty Katt & Twisted Soul Collective\n02. Acid Indie Club - Funky Jaws\n03. Beat The Street - Sharon Redd\n04. Roll The Dice - Misiu\n05. Keep Fighting - The Popular People's Front\n06. Birthday of Blackness - Cazz Ear & Natasha Kitty Katt\n07. Summertime (TZ Remix) - Judy Hipps\n08. Music People - Moodymann\n09. Cosmic Bitch - Natasha Kitty Katt\n10. Cat Lady - Fouk",
        expect: {
            lines: 20,
            text: ";Ollie Blackmore\n01. Soul Slayerz Feat Karina Nistal - Call Me (Vocal Mix)\n02. Mark De Clive-Lowe - Worth The Wait (Mark De Clive-Lowe Remix)\n03. Jimpster - Silent Stars\n04. Sir LSG, Clara Hill - Circles (Sir LSG Main Mix)\n05. Alan De Laniere, Tribalizer - Believe Me (Tribalizer Mix)\n06. Inaky Garcia, Moon Rocket - Dum Dum (Moon Rocket Organ Rmx)\n07. Souldynamic, Miranda Nicole - For Love (Original Mix)\n08. Reelsou - Get Myself Together (Mr. V Remix)\n09. AFRICAN WOMAN (YASS REVIVAL MIX)\n10. Kiko Navarro ft HanLe - Right On (Extended Version)\n\n;Natasha Kitty Katt\n01. Twisted Katt - Natasha Kitty Katt & Twisted Soul Collective\n02. Acid Indie Club - Funky Jaws\n03. Beat The Street - Sharon Redd\n04. Roll The Dice - Misiu\n05. Keep Fighting - The Popular People's Front\n06. Birthday of Blackness - Cazz Ear & Natasha Kitty Katt\n07. Summertime (TZ Remix) - Judy Hipps\n08. Music People - Moodymann\n09. Cosmic Bitch - Natasha Kitty Katt\n10. Cat Lady - Fouk"
        }
    },
    {
        // A list bulleted with "- " instead of numbered. The Tracklist Editor API reads a leading
        // hyphen as "this line continues the one above": all 32 tracks arrived as ONE row, which
        // at that length comes back empty with "No tracklist received." - the box stayed shut and
        // clicking the "Tracklist" headline looked like a dead link.
        url: "https://soundcloud.com/frida_carlos/frida_carlos_3000grad_festival_3026_schiff_ahoi",
        text: "This might have been my favourite festival sunrise yet!\nThank you to everyone who came by and stayed even after realising, that I was not the name on the timetable. As I jumped in kind of last minute, I did not have time to dig for new music, which is why this set is more of a wild mixture of my latest sets, just mixed differently.\nIt was lovely to see, that even broken cables and stubborn needles could not stop us from having a great time!\nTo be fair, this is not the actual live-recording from the festival, because I forgot to bring a recorder, but I really enjoyed the selection and still wanted to share it. :)Tracklist:\n- Eddie Richards - Someday\n- Preesh - Timeworn\n- Per Hammer & Malin Genie - Disposer\n- Aron - Delaware\n- Barac - Superlate Check In\n- Zlene, Mathias Hinds - Trumpetsvamp\n- stbr - From The Past To The Present\n- Tommy Vicari Jnr - Dreams (Paolo Rocco Deep Mix)\n- Beiger - Lost Casanova\n- Zenk - Day Of Reckoning\n- Gudj - Steady Mind\n- remus - Skyfall\n- Mirko Loko - Evolyon (Livio & Roby Remix)\n- stbr, Davy - Reservoir\n- Nibaaldo - Me encuentro en cualquier parte\n- Interstellar Beats - Trigger Happy\n- Frida Carlos - Frog (unreleased)\n- Silat Beksi - Iteration\n- Mikhu, Lorik - WVKD\n- Beiger - Reflections\n- stbr, Davy - Talk To Me\n- Sublee - The Road Runner\n- Nicolas Duvoisin & Borgò - White Box (Johnny D Remix)\n- Arapu - First New Dance\n- Frida Carlos - Broken Glass (unreleased)\n- DJ Tennis, Pillowtalk - The Outcast (Frida Carlos Edit) (unreleased)\n- Aron - magnetic\n- Huerta - Amaso\n- Ohm Hourani, Do Mi - Bursting Light (Sublee)\n- Frida Carlos - Termination (unreleased)\n- UnknownArtist - Food (Edit) (unreleased)\n- NTFO - Synopsis",
        expect: {
            lines: 32,
            first: "Eddie Richards - Someday",
            last:  "NTFO - Synopsis"
        }
    },
    {
        // Artist and title split by a dash with NO spaces around it, and two credits the uploader
        // wrapped onto a line of their own ("Oliver Koletzki," / "Niko Schwind, ...") sitting in
        // the middle of the block. Nothing here is a track line to the first pass, and the two
        // wrapped lines cut what is left into three - which used to come out as no tracklist at
        // all. Guards the second pass and the comma join together.
        url: "https://soundcloud.com/ri0d/ri0d-3000-grad-festival-3025-rummelplatz",
        text: "3025 -samstag nacht auf´m Rummelplatz <3\n\nMiret-Sabio Espejo (Original Mix)\nMiret-Polvo Dorado (Original Mix)\nTakeshi's Cashew, Surv-Akihi (Surv Remix)\nNicola Cruz-Tzantza (Original Mix)\nSlow Nomaden-Boho (Original Mix)\nUmoja-La Piragua (Original Mix)\nOliver Koletzki,\nNiko Schwind, Sidartha Siliceo-Satinka (Kermesse Remix)\nZuma Dionys-Isha (Original Mix)\nZuma Dionys-Suba Nesu (Original Mix)\nDele Sosimi, Lokkhi Terra, \nFrancesco Chiocci-Afro Sambroso (Rampa Version)\nQuim Manuel O Espirito Santo-Eme Lelu (Adam Port Edit)\nMassimo Lippoli-Dougne Te Soye (Original Mix)\nStylo, Space Motion-Madan (Original Mix)\nKino Todo-Yasmin (Original Mix)\nKino Todo-Goa Kids (Original Mix)\nMollono.Bass, The Advocate-Astra (Mollono.Bass Remix)\nRobin Sukroso, Elias Dore-Cloudflare (Original Mix)\nRauschhaus-Patara Soil (Original Mix)\nPablo Fierro-Camaleon (Original Mix)\nSoul of Zoo-Horizon (Original Mix)",
        expect: {
            lines: 20,
            first: "Miret - Sabio Espejo (Original Mix)",
            last:  "Soul of Zoo - Horizon (Original Mix)"
        }
    },
    {
        // A U+2028 LINE SEPARATOR sitting between the "8." and the track, invisible in the
        // description and in every editor the uploader would have seen it in. Nothing in the
        // index regex's [ \t] steps over one, so the numbering strip stopped in front of it and
        // the separator rode into the wiki text as a stray blank ("#  T-Puse - ..."). This is
        // the case that guards the Unicode-space sweep in mdbTracklist_normalize(), so it names
        // its whole `text`: the line it is about is in the MIDDLE of the block.
        url: "https://soundcloud.com/sattlord/12-faultierdisko-3000grad-festival-2023",
        text: "Dieses Jahr nur die halbe Faultierdisko auf dem @3000-grad Festival!\nBegleitung @ener-music musste sich kurzfristig abmelden, sodass ich Freitagabend alleine gespielt habe. Das ließ sich dann in der Kommunikation jedoch nicht mehr ändern :D Danke Daggi für die Inspiration zum Intro! :*\n\nVielen Dank an alle fleißigen Tänzer:innen an diesem bezaubernd schönen Ort! Tausend Herzen an 3000Grad das ich wieder dabei sein durfte!\n\nEs war mir eine Freude!\n\nEure Locke <3\n\nTracklist:\n1. @sailorandi - Turn Around (Âme Remix)\n2. @Nhiimusic - Branches\n3. @drparnassus - Locomotiva\n4. @guylalibertedj & @soulofzoo - Into Your Tribe (@justemmaoffical Sunset Remix)\n5. Beyoncé - Purehoney (@pullichomba Edit)\n6. One-T - The Magic Key (@seniorcitizen_wav Remix)\n7. Queen - Radio Ga Ga (@djshai-t Revisit Mix)\n8. \u2028@tpusemusic - Syd´s Night (@theoddness Remix)\n9. Britney Spears - Gimme More (@joe-carl Remix)\n10. Blur - Tender (@reyneke Reinterpretation)\n11. Deichkind - Remmidemmi (@air_horse_one Remix)\n12. Missy Elliot - Lose Control (@jan_sml Crunked & Wired Edit)\n13. @matijasound & The Ghost Of Z - Vichy Check\n14. Lana Del Rey - Born to Die (@deepandi Edit)\n15. The Alan Parsons Project - Eye in the Sky (@mauditemachine Remix)\n16. Karat - Der blaue Planet (@dj-jauche Rework)\n17. Kate Bush - Running up that Hill (@notredamemusic Edit)\n18. Friedemann - Das Sammeln von Licht (@harrotriptrap Remix)\n\nDanke für eure Musik <3",
        expect: {
            lines: 18,
            text: "1. @sailorandi - Turn Around (Âme Remix)\n2. @Nhiimusic - Branches\n3. @drparnassus - Locomotiva\n4. @guylalibertedj & @soulofzoo - Into Your Tribe (@justemmaoffical Sunset Remix)\n5. Beyoncé - Purehoney (@pullichomba Edit)\n6. One-T - The Magic Key (@seniorcitizen_wav Remix)\n7. Queen - Radio Ga Ga (@djshai-t Revisit Mix)\n8. @tpusemusic - Syd´s Night (@theoddness Remix)\n9. Britney Spears - Gimme More (@joe-carl Remix)\n10. Blur - Tender (@reyneke Reinterpretation)\n11. Deichkind - Remmidemmi (@air_horse_one Remix)\n12. Missy Elliot - Lose Control (@jan_sml Crunked & Wired Edit)\n13. @matijasound & The Ghost Of Z - Vichy Check\n14. Lana Del Rey - Born to Die (@deepandi Edit)\n15. The Alan Parsons Project - Eye in the Sky (@mauditemachine Remix)\n16. Karat - Der blaue Planet (@dj-jauche Rework)\n17. Kate Bush - Running up that Hill (@notredamemusic Edit)\n18. Friedemann - Das Sammeln von Licht (@harrotriptrap Remix)"
        }
    }
];

// Comment tracklists. A SoundCloud comment is a single line, so what MARKS the tracks - the
// numbering or the cues - is the only thing left to split on. See the header of
// tracklist_detector.js.
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
        // Cues instead of numbering, and everything that comes with them - from the report on
        // horstartsandmusicfestival/dave-huismans-at-dark-skies. The whole text is asserted
        // because the split is only half of what this case is about: the "(00)" markers become
        // MixesDB cues, the spaceless "Gerd-Echo Jammz" gets its separator spaced out on the
        // second pass, and the writer's own "?" and "…" come off the named tracks while the
        // three that ARE a "?" keep theirs.
        what: "a tracklist posted as one comment, marked with cues",
        comments: [
            "(00)Gerd-Echo Jammz? (02)ID? (05)Tikkle-Bubbles (Club Mix) (07)Frits Wentink-Filthboi69 (11)Armando-The Future (Bonus Track) (14)51 Days-Trracktion (19)I:Cube-Session 2 (Live) (22)Louie Vega-Deep Burnt (Feature Axel Tosca ) (30)Ian Pooley-Calypso Theme (33)Peven Everrett-Put Your BaCK iNTO iT (39) DJ Q-Delirious (42)? (45)Detachments-Circles (Dutch Hero) (49)? (53) Novalima-Yo Voy (Seiji Remix) (56)INVT-Acid Guaracha (62)Will Hofbauer-? (64)Point Blank-Frug (66)Yaleesa Hall -First Cullen (72)gyrofield-Bolete (77) Fabrice Lig-Fusion (81)Kyle Hall-Sarabi (85)Dario ZenKER-Round Ritmo (87)DJ Firmeza-Inenso (92)Jeff Mills-Gamma Player? (95)k.Alexi-Black Mystery…"
        ],
        expect: {
            lines: 26,
            text: "[00] Gerd - Echo Jammz\n[02] ID?\n[05] Tikkle - Bubbles (Club Mix)\n[07] Frits Wentink - Filthboi69\n[11] Armando - The Future (Bonus Track)\n[14] 51 Days - Trracktion\n[19] I:Cube - Session 2 (Live)\n[22] Louie Vega - Deep Burnt (Feature Axel Tosca )\n[30] Ian Pooley - Calypso Theme\n[33] Peven Everrett - Put Your BaCK iNTO iT\n[39] DJ Q - Delirious\n[42] ?\n[45] Detachments - Circles (Dutch Hero)\n[49] ?\n[53] Novalima - Yo Voy (Seiji Remix)\n[56] INVT - Acid Guaracha\n[62] Will Hofbauer - ?\n[64] Point Blank - Frug\n[66] Yaleesa Hall - First Cullen\n[72] gyrofield - Bolete\n[77] Fabrice Lig - Fusion\n[81] Kyle Hall - Sarabi\n[85] Dario ZenKER - Round Ritmo\n[87] DJ Firmeza - Inenso\n[92] Jeff Mills - Gamma Player\n[95] k.Alexi - Black Mystery"
        }
    },
    {
        // Bare clock times as the marker, the other shape a cue list is written in.
        what: "a comment tracklist marked with clock times",
        comments: [
            "0:00 Baldo - Wanna Be 5:12 Chaos In The CBD - Multiverse 11:40 Mall Grab - Sun Ra 19:05 Ross From Friends - Talk To Me 26:30 DJ Boring - Winona 33:15 Palms Trax - Equation 41:02 Hodge - Ruby"
        ],
        expect: {
            lines: 7,
            first: "[0:00] Baldo - Wanna Be",
            last:  "[41:02] Hodge - Ruby"
        }
    },
    {
        // Six cues that only ever go up, and not one track between them - which is what the
        // "half the lines have to read Artist - Title" bar is for. Ascending markers alone must
        // never be enough.
        what: "a comment naming times but no tracks",
        comments: [
            "so good! the bit at (12) is my favourite, then (30), (44), (56), (61) and (78) - what a set"
        ],
        expect: null
    },
    {
        // A title that really does end in a question mark, in a block that never writes "?" for
        // an unknown artist or title. Nothing may be taken off it.
        what: "a comment tracklist whose title ends in a question mark",
        comments: [
            "1. Robin S - Show Me Love 2. Haddaway - What Is Love? 3. Snap! - Rhythm Is A Dancer 4. Corona - The Rhythm Of The Night 5. Culture Beat - Mr. Vain 6. 2 Unlimited - No Limit"
        ],
        expect: {
            lines: 6,
            first: "1. Robin S - Show Me Love",
            last:  "6. 2 Unlimited - No Limit"
        }
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
