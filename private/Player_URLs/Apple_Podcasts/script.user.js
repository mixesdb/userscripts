// ==UserScript==
// @name         Apple Podcasts Player URLs (private)
// @version      2026.09.01.3
// @description  Add Apple Podcasts player URLs from array to mix pages when episode numbers match the mix page title
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/Apple_Podcasts/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/Apple_Podcasts/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-MixesDB_Players_Helper_9
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/funcs.js?v-2026.09.01.3
// @match        https://www.mixesdb.com/*
// @match        https://*podcasts.apple.com/*
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// Position of the Apple Podcasts URL inside the {{Player}} template
// "first": in front of the URLs already there
// "middle": centre of the resulting list - with only one URL there it ends up second
// "last": after the URLs already there
// The URLs already in the template keep the preferred site order of ../funcs.js among themselves,
// except on a titled player, where their order is the part order and is left untouched
const addAtPosition = "last"; // first, middle or last

var episodes_arr = {
"533": "https://podcasts.apple.com/gb/podcast/mnmt-533-black-merlin/id1147084286?i=1000786340976",
"Monument Festival 2026 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2026-andy-martin/id1147084286?i=1000785432692",
"532": "https://podcasts.apple.com/gb/podcast/mnmt-532-naomi/id1147084286?i=1000784512131",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-adjust-be-s-u-n-festival-hungary/id1147084286?i=1000783886037",
"531": "https://podcasts.apple.com/gb/podcast/mnmt-531-kmyle/id1147084286?i=1000783144356",
"530": "https://podcasts.apple.com/gb/podcast/mnmt-530-salem-unsigned/id1147084286?i=1000780249499",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-sc%C3%B8pe-monument-all-nighter-oslo/id1147084286?i=1000778433900",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-cobahn-monument-all-nighter-oslo/id1147084286?i=1000778430092",
"533": "https://podcasts.apple.com/gb/podcast/mnmt-533-black-merlin/id1147084286?i=1000786340976",
"Monument Festival 2026 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2026-andy-martin/id1147084286?i=1000785432692",
"532": "https://podcasts.apple.com/gb/podcast/mnmt-532-naomi/id1147084286?i=1000784512131",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-adjust-be-s-u-n-festival-hungary/id1147084286?i=1000783886037",
"531": "https://podcasts.apple.com/gb/podcast/mnmt-531-kmyle/id1147084286?i=1000783144356",
"530": "https://podcasts.apple.com/gb/podcast/mnmt-530-salem-unsigned/id1147084286?i=1000780249499",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-sc%C3%B8pe-monument-all-nighter-oslo/id1147084286?i=1000778433900",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-cobahn-monument-all-nighter-oslo/id1147084286?i=1000778430092",
"529": "https://podcasts.apple.com/gb/podcast/mnmt-529-basic-chanel/id1147084286?i=1000777867466",
"528": "https://podcasts.apple.com/gb/podcast/mnmt-528-human-space-machine/id1147084286?i=1000777030530",
"527": "https://podcasts.apple.com/gb/podcast/mnmt-527-primal-rhapsody/id1147084286?i=1000776802343",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-customer-service-fold/id1147084286?i=1000776588235",
"526": "https://podcasts.apple.com/gb/podcast/mnmt-526-sinhwave/id1147084286?i=1000775215780",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-substance-vainqueur-present-scion-mostra/id1147084286?i=1000774720845",
"525": "https://podcasts.apple.com/gb/podcast/mnmt-525-lynne/id1147084286?i=1000774198671",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-philip-kylberg-omen-wapta-garage-noord/id1147084286?i=1000773736122",
"524": "https://podcasts.apple.com/gb/podcast/mnmt-524-slam/id1147084286?i=1000773236045",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-nils-edte-predawn-festival-stuttgart/id1147084286?i=1000772792234",
"523": "https://podcasts.apple.com/gb/podcast/mnmt-523-marco-maldarella/id1147084286?i=1000772181148",
"522": "https://podcasts.apple.com/gb/podcast/mnmt-522-phil-berg/id1147084286?i=1000771150148",
"521": "https://podcasts.apple.com/gb/podcast/mnmt-521-r%C3%A6za/id1147084286?i=1000769998509",
"520": "https://podcasts.apple.com/gb/podcast/mnmt-520-blume/id1147084286?i=1000768918787",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-blazej-malinowski-jasna-1-warsaw/id1147084286?i=1000768361435",
"519": "https://podcasts.apple.com/gb/podcast/mnmt-519-ex-hale/id1147084286?i=1000767760479",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-jin-synth-la-casita-ohm-berlin/id1147084286?i=1000767208825",
"518": "https://podcasts.apple.com/gb/podcast/mnmt-518-marius-b%C3%B8/id1147084286?i=1000766611006",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-wu-zhuoling-%E5%90%B4%E5%8D%93%E7%8E%B2/id1147084286?i=1000766017068",
"517": "https://podcasts.apple.com/gb/podcast/mnmt-517-maria-callapez/id1147084286?i=1000764971923",
"Monument Waves 009 ": "https://podcasts.apple.com/gb/podcast/monument-waves-009-aksamit/id1147084286?i=1000763790642",
"516": "https://podcasts.apple.com/gb/podcast/mnmt-516-conflation-port/id1147084286?i=1000763214374",
"Monument Festival 2025 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2025-bambi-b2b-beatrice-m/id1147084286?i=1000762698814",
"515": "https://podcasts.apple.com/gb/podcast/mnmt-515-r-d-v/id1147084286?i=1000761821398",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-alexskyspirit-flucc-vienna/id1147084286?i=1000761172676",
"514": "https://podcasts.apple.com/gb/podcast/mnmt-514-invalid-request/id1147084286?i=1000760468316",
"513": "https://podcasts.apple.com/gb/podcast/mnmt-513-decoder/id1147084286?i=1000758866100",
"512": "https://podcasts.apple.com/gb/podcast/mnmt-512-steve-duncan/id1147084286?i=1000757458168",
"511": "https://podcasts.apple.com/gb/podcast/mnmt-511-ahil/id1147084286?i=1000756130360",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-horston-fold-london/id1147084286?i=1000755534033",
"510": "https://podcasts.apple.com/gb/podcast/mnmt-510-monotone/id1147084286?i=1000754825317",
"509": "https://podcasts.apple.com/gb/podcast/mnmt-509-azu-tiwaline/id1147084286?i=1000753318253",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-moon-patrol-laut-barcelona/id1147084286?i=1000752630428",
"508": "https://podcasts.apple.com/gb/podcast/mnmt-508-vel/id1147084286?i=1000751731809",
"Monument Festival 2025 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2025-pianeti-sintetici-live/id1147084286?i=1000751358121",
"507": "https://podcasts.apple.com/gb/podcast/mnmt-507-ina-kacz/id1147084286?i=1000750479756",
"506": "https://podcasts.apple.com/gb/podcast/mnmt-506-si-oda-rua/id1147084286?i=1000749412357",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-aydin-imani-fragments-epilogue-oslo/id1147084286?i=1000749082992",
"505": "https://podcasts.apple.com/gb/podcast/mnmt-505-ireen-amnes/id1147084286?i=1000748383999",
"Monument Waves 008 ": "https://podcasts.apple.com/gb/podcast/monument-waves-008-atomic-moog-live/id1147084286?i=1000747726531",
"504": "https://podcasts.apple.com/gb/podcast/mnmt-504-nawaz/id1147084286?i=1000747188301",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-feral-spekki-webu/id1147084286?i=1000746651707",
"MNMT Recordings : Spekki Webu & Mental — The Seed, Mo": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-spekki-webu-mental-the-seed-mo-dem/id1147084286?i=1000746651576",
"503": "https://podcasts.apple.com/gb/podcast/mnmt-503-blndfld/id1147084286?i=1000746202319",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-hagva-omen-wapta-weekender-garage-noord/id1147084286?i=1000745705261",
"502": "https://podcasts.apple.com/gb/podcast/mnmt-502-adam-pits/id1147084286?i=1000745270638",
"501": "https://podcasts.apple.com/gb/podcast/mnmt-501-nesa-azadikhah/id1147084286?i=1000744250058",
"500": "https://podcasts.apple.com/gb/podcast/mnmt-500-oscar-mulero/id1147084286?i=1000743408945",
"500": "https://podcasts.apple.com/gb/podcast/mnmt-500-mary-yuzovskaya-monument-festival-2025/id1147084286?i=1000743306769",
"500": "https://podcasts.apple.com/gb/podcast/mnmt-500-deepbass/id1147084286?i=1000743300380",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-steve-bicknell-monument-at-the-villa-oslo/id1147084286?i=1000742301913",
"499": "https://podcasts.apple.com/gb/podcast/mnmt-499-ntogn-midwinter-mix/id1147084286?i=1000741797035",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-raa-r/id1147084286?i=1000741310869",
"498": "https://podcasts.apple.com/gb/podcast/mnmt-498-denise-rabe/id1147084286?i=1000740801645",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-hohe-live-otkrice-festival-montenegro/id1147084286?i=1000740308648",
"497": "https://podcasts.apple.com/gb/podcast/mnmt-497-fredrik-navigare/id1147084286?i=1000739745470",
"Monument Waves 007 ": "https://podcasts.apple.com/gb/podcast/monument-waves-007-multicast-dynamics/id1147084286?i=1000739076817",
"496": "https://podcasts.apple.com/gb/podcast/mnmt-496-tauceti/id1147084286?i=1000738662832",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-innersha/id1147084286?i=1000738490138",
"495": "https://podcasts.apple.com/gb/podcast/mnmt-495-teno/id1147084286?i=1000737644120",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-hewan-aman-kune-festival-2025/id1147084286?i=1000737042895",
"494": "https://podcasts.apple.com/gb/podcast/mnmt-494-loek-frey/id1147084286?i=1000736565795",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-shimmy-robin-monument-reunion-2025/id1147084286?i=1000736247102",
"493": "https://podcasts.apple.com/gb/podcast/mnmt-493-laura-mrls/id1147084286?i=1000735627884",
"Monument Festival 2025 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2025-doltz-live/id1147084286?i=1000734995770",
"492": "https://podcasts.apple.com/gb/podcast/mnmt-492-alexskyspirit/id1147084286?i=1000734416830",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-adjust-be/id1147084286?i=1000733674446",
"491": "https://podcasts.apple.com/gb/podcast/mnmt-491-reka-zalan/id1147084286?i=1000733098362",
"MNMT Recordings : Pjenné —  Pe": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-pjenn%C3%A9-pe-rsona-2025/id1147084286?i=1000732598085",
"490": "https://podcasts.apple.com/gb/podcast/mnmt-490-hitam/id1147084286?i=1000732115294",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-%C4%91-k-midgar-x-useless-seconds-berlin/id1147084286?i=1000731580830",
"489": "https://podcasts.apple.com/gb/podcast/mnmt-489-interstellar-funk/id1147084286?i=1000731454109",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-k-o-p-32/id1147084286?i=1000730360806",
"488": "https://podcasts.apple.com/gb/podcast/mnmt-488-andy-martin/id1147084286?i=1000729714940",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-franko-fragments-forest-rave-2025/id1147084286?i=1000729343540",
"487": "https://podcasts.apple.com/gb/podcast/mnmt-487-aeternae/id1147084286?i=1000728398704",
"MNMT Live : Feral @ The Swamp, Mo": "https://podcasts.apple.com/gb/podcast/mnmt-live-feral-the-swamp-mo-dem-festival-2025/id1147084286?i=1000727862856",
"486": "https://podcasts.apple.com/gb/podcast/mnmt-486-sciama/id1147084286?i=1000727348160",
"Monument Waves 006 ": "https://podcasts.apple.com/gb/podcast/monument-waves-006-lf58/id1147084286?i=1000727162944",
"485": "https://podcasts.apple.com/gb/podcast/mnmt-485-isabel-soto/id1147084286?i=1000726481065",
"Monument Festival 2025 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2025-ok-eg-live/id1147084286?i=1000725470292",
"484": "https://podcasts.apple.com/gb/podcast/mnmt-484-a-strange-wedding/id1147084286?i=1000724948655",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-tsuniman-refractor-2025/id1147084286?i=1000723845151",
"483": "https://podcasts.apple.com/gb/podcast/mnmt-483-jesse-g/id1147084286?i=1000722934025",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-glassz-up-to-date-festival-2025/id1147084286?i=1000722372785",
"482": "https://podcasts.apple.com/gb/podcast/mnmt-482-stevie-cox/id1147084286?i=1000721948214",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-fernie-s-u-n-festival-2025-hungary/id1147084286?i=1000721490282",
"481": "https://podcasts.apple.com/gb/podcast/mnmt-481-felix-k/id1147084286?i=1000720998568",
"480": "https://podcasts.apple.com/gb/podcast/mnmt-480-spekki-webu/id1147084286?i=1000718791057",
"Monument Waves 005 ": "https://podcasts.apple.com/gb/podcast/monument-waves-005-sybil/id1147084286?i=1000718234463",
"479": "https://podcasts.apple.com/gb/podcast/mnmt-479-gent/id1147084286?i=1000717692283",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-luce-biocym-b2b-slate-migarden-milan/id1147084286?i=1000717155277",
"478": "https://podcasts.apple.com/gb/podcast/mnmt-478-cio-dor-dada/id1147084286?i=1000716635534",
"478": "https://podcasts.apple.com/gb/podcast/mnmt-478-cio-dor-prisma-33/id1147084286?i=1000716629972",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-monday-off/id1147084286?i=1000716056092",
"477": "https://podcasts.apple.com/gb/podcast/mnmt-477-birds-ov-paradise/id1147084286?i=1000715720111",
"476": "https://podcasts.apple.com/gb/podcast/mnmt-476-joachim-spieth/id1147084286?i=1000714640871",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-acaera/id1147084286?i=1000714153300",
"475": "https://podcasts.apple.com/gb/podcast/mnmt-475-octo-a-eterna/id1147084286?i=1000713587553",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-konsudd/id1147084286?i=1000713047148",
"474": "https://podcasts.apple.com/gb/podcast/mnmt-474-simone-bauer/id1147084286?i=1000712614046",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-rea-nugget-outra-cena-lisbon/id1147084286?i=1000712085228",
"473": "https://podcasts.apple.com/gb/podcast/mnmt-473-axis-alpha/id1147084286?i=1000711428978",
"472": "https://podcasts.apple.com/gb/podcast/mnmt-472-biocym/id1147084286?i=1000710429309",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-formant-value-live-omen-wapta-weekender/id1147084286?i=1000709861625",
"471": "https://podcasts.apple.com/gb/podcast/mnmt-471-anomali/id1147084286?i=1000709384024",
"470": "https://podcasts.apple.com/gb/podcast/mnmt-470-kancheli/id1147084286?i=1000708707234",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-kia-b2b-polygonia/id1147084286?i=1000708065212",
"469": "https://podcasts.apple.com/gb/podcast/mnmt-469-means-3rd/id1147084286?i=1000706782439",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-absis-mostra-closing-2025-barcelona/id1147084286?i=1000706338856",
"468": "https://podcasts.apple.com/gb/podcast/mnmt-468-marcal/id1147084286?i=1000705696301",
"467": "https://podcasts.apple.com/gb/podcast/mnmt-467-aksamit/id1147084286?i=1000704738031",
"466": "https://podcasts.apple.com/gb/podcast/mnmt-466-menal-batti/id1147084286?i=1000703854956",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-pianeti-sintetici/id1147084286?i=1000703416315",
"465": "https://podcasts.apple.com/gb/podcast/mnmt-465-sub-accent/id1147084286?i=1000703010295",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-labyrinthine-womb-tokyo/id1147084286?i=1000695488284",
"Monument Festival 2024": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-dj-maria/id1147084286?i=1000702454383",
"464": "https://podcasts.apple.com/gb/podcast/mnmt-464-solarythm/id1147084286?i=1000702033618",
"463": "https://podcasts.apple.com/gb/podcast/mnmt-463-anders-navigare/id1147084286?i=1000701036652",
"462": "https://podcasts.apple.com/gb/podcast/mnmt-462-aerae/id1147084286?i=1000700092573",
"461": "https://podcasts.apple.com/gb/podcast/mnmt-461-einerlei/id1147084286?i=1000699018810",
"Monument Waves 004 ": "https://podcasts.apple.com/gb/podcast/monument-waves-004-jo-johnson/id1147084286?i=1000698555343",
"460": "https://podcasts.apple.com/gb/podcast/mnmt-460-mod-1/id1147084286?i=1000698100709",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-timnah/id1147084286?i=1000697310812",
"459": "https://podcasts.apple.com/gb/podcast/mnmt-459-bohdan/id1147084286?i=1000696517521",
"458": "https://podcasts.apple.com/gb/podcast/mnmt-458-remma/id1147084286?i=1000694248700",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-spectribe-salon-ambientu/id1147084286?i=1000692998024",
"457": "https://podcasts.apple.com/gb/podcast/mnmt-457-katatonic-silentio/id1147084286?i=1000691730154",
"456": "https://podcasts.apple.com/gb/podcast/mnmt-456-efdemin/id1147084286?i=1000689604958",
"455": "https://podcasts.apple.com/gb/podcast/mnmt-455-nadia-struiwigh/id1147084286?i=1000687019677",
"454": "https://podcasts.apple.com/gb/podcast/mnmt-454-severja/id1147084286?i=1000685115203",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-on-board-music/id1147084286?i=1000684652277",
"453": "https://podcasts.apple.com/gb/podcast/mnmt-453-clarisa-kimskii/id1147084286?i=1000684191760",
"Monument Festival 2024 Opening Ceremony ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-opening-ceremony-sarah-wreath-live/id1147084286?i=1000683768858",
"452": "https://podcasts.apple.com/gb/podcast/mnmt-452-chloe-lula/id1147084286?i=1000683272227",
"451": "https://podcasts.apple.com/gb/podcast/mnmt-451-developer/id1147084286?i=1000682519832",
"450": "https://podcasts.apple.com/gb/podcast/mnmt-450-luigi-tozzi/id1147084286?i=1000682225978",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-agonis-live/id1147084286?i=1000681372605",
"449": "https://podcasts.apple.com/gb/podcast/mnmt-449-ntogn-midwinter-mix/id1147084286?i=1000680928711",
"448": "https://podcasts.apple.com/gb/podcast/mnmt-448-nils-edte-live/id1147084286?i=1000680549547",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-erika/id1147084286?i=1000680104266",
"447": "https://podcasts.apple.com/gb/podcast/mnmt-447-sandrien/id1147084286?i=1000679307525",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-woody92-paral-lel-festival-2024/id1147084286?i=1000678866401",
"446": "https://podcasts.apple.com/gb/podcast/mnmt-446-ancestral-landscapes/id1147084286?i=1000678510446",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-andy-garvey-ratherlost-lofi-amsterdam/id1147084286?i=1000678123103",
"445": "https://podcasts.apple.com/gb/podcast/mnmt-445-martyn-p%C3%A4sch/id1147084286?i=1000677786098",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-marius-b%C3%B8/id1147084286?i=1000677283143",
"444": "https://podcasts.apple.com/gb/podcast/mnmt-444-dino-sabatini/id1147084286?i=1000676954392",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-hydrous-live-set-omg-oslo/id1147084286?i=1000676503437",
"443": "https://podcasts.apple.com/gb/podcast/mnmt-443-henrii-havaas/id1147084286?i=1000676045865",
"442": "https://podcasts.apple.com/gb/podcast/mnmt-442-fleika/id1147084286?i=1000675169013",
"Monument Waves 003 ": "https://podcasts.apple.com/gb/podcast/monument-waves-003-mareena/id1147084286?i=1000673828828",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-laima-adelaide-live-micro-festival/id1147084286?i=1000673421676",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-sunju-hargun/id1147084286?i=1000672982179",
"441": "https://podcasts.apple.com/gb/podcast/mnmt-441-edit-select/id1147084286?i=1000672826018",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-khoros-records/id1147084286?i=1000671860461",
"440": "https://podcasts.apple.com/gb/podcast/mnmt-440-keplrr/id1147084286?i=1000671653144",
"439": "https://podcasts.apple.com/gb/podcast/mnmt-439-kohra/id1147084286?i=1000671247311",
"Monument Festival 2024 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2024-wata-igarashi/id1147084286?i=1000670748773",
"438": "https://podcasts.apple.com/gb/podcast/mnmt-438-vi/id1147084286?i=1000670011786",
"MNMT Live : Feral  @ The Seed - Mo": "https://podcasts.apple.com/gb/podcast/mnmt-live-feral-the-seed-mo-dem-festival-2024/id1147084286?i=1000669673162",
"437": "https://podcasts.apple.com/gb/podcast/mnmt-437-blazej-malinowski/id1147084286?i=1000669270560",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-marie-pravda-archiv-teknologi-ankali/id1147084286?i=1000668851658",
"436": "https://podcasts.apple.com/gb/podcast/mnmt-436-philippa-pacho/id1147084286?i=1000668429304",
"MNMT recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-kasper-marott-moment-festival-2024-japan/id1147084286?i=1000668013334",
"435": "https://podcasts.apple.com/gb/podcast/mnmt-435-occa/id1147084286?i=1000666984274",
"434": "https://podcasts.apple.com/gb/podcast/mnmt-434-magna-pia/id1147084286?i=1000666204075",
"433": "https://podcasts.apple.com/gb/podcast/mnmt-433-mu-he/id1147084286?i=1000665605984",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-aaron-j-midgar-x-patterns-of/id1147084286?i=1000665011135",
"432": "https://podcasts.apple.com/gb/podcast/mnmt-432-kill-acid-on-space/id1147084286?i=1000664712163",
"431": "https://podcasts.apple.com/gb/podcast/mnmt-431-erika/id1147084286?i=1000664003107",
"430": "https://podcasts.apple.com/gb/podcast/mnmt-430-yuta/id1147084286?i=1000663642988",
"429": "https://podcasts.apple.com/gb/podcast/mnmt-429-zara/id1147084286?i=1000663284377",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-l-3p/id1147084286?i=1000662974434",
"428": "https://podcasts.apple.com/gb/podcast/mnmt-428-ronny-pinazza/id1147084286?i=1000662621158",
"427": "https://podcasts.apple.com/gb/podcast/mnmt-427-lds/id1147084286?i=1000662256205",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-lara-palmer-embodiment-radion-amsterdam/id1147084286?i=1000661490649",
"426": "https://podcasts.apple.com/gb/podcast/mnmt-426-nastia-reigel/id1147084286?i=1000661127299",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-sonic-wave-collective-mostra-24-barcelona/id1147084286?i=1000660771176",
"425": "https://podcasts.apple.com/gb/podcast/mnmt-425-kalumet/id1147084286?i=1000660417889",
"424": "https://podcasts.apple.com/gb/podcast/mnmt-424-kameliia/id1147084286?i=1000660013047",
"423": "https://podcasts.apple.com/gb/podcast/mnmt-423-emily-nicoll/id1147084286?i=1000659625638",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-non-series/id1147084286?i=1000659260033",
"422": "https://podcasts.apple.com/gb/podcast/mnmt-422-kia/id1147084286?i=1000658883395",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-foreign-material-part-ii/id1147084286?i=1000658008664",
"421": "https://podcasts.apple.com/gb/podcast/mnmt-421-derrick-burns/id1147084286?i=1000657272167",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-octo-%C3%A5eterna-onyro-methods-madrid/id1147084286?i=1000656883258",
"420": "https://podcasts.apple.com/gb/podcast/mnmt-420-woody92/id1147084286?i=1000656472048",
"419": "https://podcasts.apple.com/gb/podcast/mnmt-419-ao-cram/id1147084286?i=1000655758679",
"418": "https://podcasts.apple.com/gb/podcast/mnmt-418-priori/id1147084286?i=1000655384249",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-atomic-moog-gare-porto/id1147084286?i=1000655012274",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-cobahn-ratherlost-nyd-lofi-amsterdam/id1147084286?i=1000654654957",
"417": "https://podcasts.apple.com/gb/podcast/mnmt-417-feph-mr-tron/id1147084286?i=1000654293407",
"416": "https://podcasts.apple.com/gb/podcast/mnmt-416-ben-kaczor/id1147084286?i=1000653528715",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-moy-santana-markus-suckut-sungate-showcase/id1147084286?i=1000653166160",
"415": "https://podcasts.apple.com/gb/podcast/mnmt-415-adelia/id1147084286?i=1000652842684",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-space-textures/id1147084286?i=1000652451930",
"414": "https://podcasts.apple.com/gb/podcast/mnmt-414-tammo-hesselink/id1147084286?i=1000652105872",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-pianeti-sintetici-live-positive-education/id1147084286?i=1000651389800",
"413": "https://podcasts.apple.com/gb/podcast/mnmt-413-faery/id1147084286?i=1000650918724",
"412": "https://podcasts.apple.com/gb/podcast/mnmt-412-loe/id1147084286?i=1000650509941",
"411": "https://podcasts.apple.com/gb/podcast/mnmt-411-dario-duegra/id1147084286?i=1000649985063",
"410": "https://podcasts.apple.com/gb/podcast/mnmt-410-gigi-fm/id1147084286?i=1000649538799",
"409": "https://podcasts.apple.com/gb/podcast/mnmt-409-3-14/id1147084286?i=1000649154896",
"Monument Waves 002 ": "https://podcasts.apple.com/gb/podcast/monument-waves-002-asip/id1147084286?i=1000648725069",
"408": "https://podcasts.apple.com/gb/podcast/mnmt-408-g%C3%B6rkem-%C3%B6zkaynak/id1147084286?i=1000648332109",
"407": "https://podcasts.apple.com/gb/podcast/mnmt-407-polo-steffen-bennemann/id1147084286?i=1000647893672",
"Monument Records Promo Mix ": "https://podcasts.apple.com/gb/podcast/monument-records-promo-mix-d-leria/id1147084286?i=1000647347829",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-northallsen-records/id1147084286?i=1000646834246",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-souleiman-metropolis-october-2023/id1147084286?i=1000646356071",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-feral-kuudes-linja-helsinki/id1147084286?i=1000646024932",
"406": "https://podcasts.apple.com/gb/podcast/mnmt-406-medulla-oblongata/id1147084286?i=1000645565416",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-droneghost/id1147084286?i=1000644997338",
"405": "https://podcasts.apple.com/gb/podcast/mnmt-405-massa/id1147084286?i=1000644625114",
"404": "https://podcasts.apple.com/gb/podcast/mnmt-404-clarence-rise/id1147084286?i=1000643771522",
"403": "https://podcasts.apple.com/gb/podcast/mnmt-403-ndrx/id1147084286?i=1000642869750",
"Monument Records Promo Mix ": "https://podcasts.apple.com/gb/podcast/monument-records-promo-mix-sciahri/id1147084286?i=1000642451174",
"402": "https://podcasts.apple.com/gb/podcast/mnmt-402-sybil/id1147084286?i=1000642059217",
"401": "https://podcasts.apple.com/gb/podcast/mnmt-401-haruka/id1147084286?i=1000641267411",
"Monument Festival 2023 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2023-nugget/id1147084286?i=1000640659146",
"400": "https://podcasts.apple.com/gb/podcast/mnmt-400-dj-nobu/id1147084286?i=1000640211753",
"399": "https://podcasts.apple.com/gb/podcast/mnmt-399-developer-nye-mix/id1147084286?i=1000640145394",
"398": "https://podcasts.apple.com/gb/podcast/mnmt-398-ntogn-midwinter-mix/id1147084286?i=1000639293028",
"397": "https://podcasts.apple.com/gb/podcast/mnmt-397-e-l-a/id1147084286?i=1000638526004",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-neel-hybrid-paral-lel-festival-2023/id1147084286?i=1000638146523",
"396": "https://podcasts.apple.com/gb/podcast/mnmt-396-konduku/id1147084286?i=1000637769431",
"395": "https://podcasts.apple.com/gb/podcast/mnmt-395-avsluta/id1147084286?i=1000637028876",
"394": "https://podcasts.apple.com/gb/podcast/mnmt-394-toxido-mask/id1147084286?i=1000636612204",
"393": "https://podcasts.apple.com/gb/podcast/mnmt-393-vardae/id1147084286?i=1000635764583",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-jin-synth-x-mostra/id1147084286?i=1000635389068",
"392": "https://podcasts.apple.com/gb/podcast/mnmt-392-sunju-hargun/id1147084286?i=1000635003141",
"391": "https://podcasts.apple.com/gb/podcast/mnmt-391-elyan-x/id1147084286?i=1000634246051",
"390": "https://podcasts.apple.com/gb/podcast/mnmt-390-julie/id1147084286?i=1000633046762",
"389": "https://podcasts.apple.com/gb/podcast/mnmt-389-martinou/id1147084286?i=1000632666589",
"388": "https://podcasts.apple.com/gb/podcast/mnmt-388-aa-sudd/id1147084286?i=1000631847196",
"387": "https://podcasts.apple.com/gb/podcast/mnmt-387-polar-inertia/id1147084286?i=1000631066031",
"386": "https://podcasts.apple.com/gb/podcast/mnmt-386-midnight-traffic/id1147084286?i=1000630284324",
"Monument Festival 2023 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2023-nelly/id1147084286?i=1000630018045",
"385": "https://podcasts.apple.com/gb/podcast/mnmt-385-micha%C5%82-wolski-hybrid/id1147084286?i=1000629478662",
"384": "https://podcasts.apple.com/gb/podcast/mnmt-384-svreca/id1147084286?i=1000628657577",
"383": "https://podcasts.apple.com/gb/podcast/mnmt-383-acronym/id1147084286?i=1000627830568",
"Monument Festival 2023 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2023-yan-alfred-czital/id1147084286?i=1000626672807",
"382": "https://podcasts.apple.com/gb/podcast/mnmt-382-tatsuoki/id1147084286?i=1000626311563",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-akob/id1147084286?i=1000625898922",
"381": "https://podcasts.apple.com/gb/podcast/mnmt-381-adh%C3%A9mar/id1147084286?i=1000625529147",
"Monument Festival 2023": "https://podcasts.apple.com/gb/podcast/monument-festival-2023-severja/id1147084286?i=1000625104418",
"380": "https://podcasts.apple.com/gb/podcast/mnmt-380-hvl/id1147084286?i=1000624727075",
"Monument Festival 2023 ": "https://podcasts.apple.com/gb/podcast/monument-festival-2023-eric-cloutier/id1147084286?i=1000624300554",
"379": "https://podcasts.apple.com/gb/podcast/mnmt-379-cecilia-tosh/id1147084286?i=1000624121340",
"378": "https://podcasts.apple.com/gb/podcast/mnmt-378-javel/id1147084286?i=1000622933003",
"377": "https://podcasts.apple.com/gb/podcast/mnmt-377-timnah/id1147084286?i=1000621722005",
"376": "https://podcasts.apple.com/gb/podcast/mnmt-376-kairogen/id1147084286?i=1000621014548",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-absis-x-mostra/id1147084286?i=1000620749712",
"375": "https://podcasts.apple.com/gb/podcast/mnmt-375-diffused-signal/id1147084286?i=1000619512218",
"374": "https://podcasts.apple.com/gb/podcast/mnmt-374-747/id1147084286?i=1000618725324",
"373": "https://podcasts.apple.com/gb/podcast/mnmt-373-ario/id1147084286?i=1000618077207",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-%C3%B8bsidiaa-n/id1147084286?i=1000618033060",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-kangding-ray-paral-lel-festival-2022/id1147084286?i=1000616772116",
"372": "https://podcasts.apple.com/gb/podcast/mnmt-372-cobahn/id1147084286?i=1000616109290",
"371": "https://podcasts.apple.com/gb/podcast/mnmt-371-motion-symmetry/id1147084286?i=1000615278229",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-verveine-to%C3%A9-la-vall%C3%A9e-%C3%A9lectrique-2022/id1147084286?i=1000614954359",
"369": "https://podcasts.apple.com/gb/podcast/mnmt-369-evigt-m%C3%B6rker/id1147084286?i=1000613487489",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-navigare-audio/id1147084286?i=1000613205429",
"368": "https://podcasts.apple.com/gb/podcast/mnmt-368-markus-suckut/id1147084286?i=1000612593542",
"366": "https://podcasts.apple.com/gb/podcast/mnmt-366-sarah-wreath/id1147084286?i=1000609784448",
"365": "https://podcasts.apple.com/gb/podcast/mnmt-365-notte-infinita/id1147084286?i=1000608750912",
"364": "https://podcasts.apple.com/gb/podcast/mnmt-364-booz/id1147084286?i=1000607684573",
"363": "https://podcasts.apple.com/gb/podcast/mnmt-363-iwamaki/id1147084286?i=1000606567886",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-patrick-russell-x-mostra/id1147084286?i=1000605934563",
"362": "https://podcasts.apple.com/gb/podcast/mnmt-362-cicada/id1147084286?i=1000605589612",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-deepbass-orbits-glasgow-february-2023/id1147084286?i=1000604470522",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-error-etica/id1147084286?i=1000603780007",
"Monument Festival 2022": "https://podcasts.apple.com/gb/podcast/monument-festival-2022-forest-drive-west/id1147084286?i=1000603428501",
"361": "https://podcasts.apple.com/gb/podcast/mnmt-361-repart/id1147084286?i=1000602462719",
"MNMT Recordings : Laura MRLS @ Subverted, ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-laura-mrls-subverted-about-blank-berlin/id1147084286?i=1000602463888",
"360": "https://podcasts.apple.com/gb/podcast/mnmt-360-hogun/id1147084286?i=1000601619979",
"359": "https://podcasts.apple.com/gb/podcast/mnmt-359-anthony-linell/id1147084286?i=1000600013925",
"358": "https://podcasts.apple.com/gb/podcast/mnmt-358-k-e-pravda/id1147084286?i=1000599964347",
"357": "https://podcasts.apple.com/gb/podcast/mnmt-357-linny-hex/id1147084286?i=1000599964317",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-huinali-recordings/id1147084286?i=1000599964261",
"Monument Festival 2022": "https://podcasts.apple.com/gb/podcast/monument-festival-2022-vbc/id1147084286?i=1000596287883",
"356": "https://podcasts.apple.com/gb/podcast/mnmt-356-pattrn/id1147084286?i=1000595390639",
"MNMT Recordings : THNTS live @ Elements, ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-thnts-live-elements-about-blank-berlin/id1147084286?i=1000596287210",
"355": "https://podcasts.apple.com/gb/podcast/mnmt-355-blazej-malinowski/id1147084286?i=1000592826992",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-developer-nye-mix-live-tresor-2022/id1147084286?i=1000596287973",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-r%C3%B8dh%C3%A5d/id1147084286?i=1000591213261",
"354": "https://podcasts.apple.com/gb/podcast/mnmt-354-ntogn-midwinter-mix/id1147084286?i=1000590862736",
"353": "https://podcasts.apple.com/gb/podcast/mnmt-353-tangram/id1147084286?i=1000590319873",
"352": "https://podcasts.apple.com/gb/podcast/mnmt-352-vanta/id1147084286?i=1000589482966",
"351": "https://podcasts.apple.com/gb/podcast/mnmt-351-space-drum-meditation/id1147084286?i=1000587475434",
"350": "https://podcasts.apple.com/gb/podcast/mnmt-350-hoedus/id1147084286?i=1000586701273",
"349": "https://podcasts.apple.com/gb/podcast/mnmt-349-fabrizio-lapiana/id1147084286?i=1000585769761",
"348": "https://podcasts.apple.com/gb/podcast/mnmt-348-joachim-spieth/id1147084286?i=1000584899376",
"Monument Festival 2022": "https://podcasts.apple.com/gb/podcast/monument-festival-2022-dorisburg-efraim-kent-hybrid/id1147084286?i=1000596917907",
"347": "https://podcasts.apple.com/gb/podcast/mnmt-347-%C3%B8-phase/id1147084286?i=1000582505772",
"346": "https://podcasts.apple.com/gb/podcast/mnmt-346-mtrl/id1147084286?i=1000581775944",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-pfirter-culto-buenos-aires-2022/id1147084286?i=1000581036967",
"345": "https://podcasts.apple.com/gb/podcast/mnmt-345-deepbass/id1147084286?i=1000580666331",
"344": "https://podcasts.apple.com/gb/podcast/mnmt-344-octo-a-eterna/id1147084286?i=1000580288503",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-aksamit-audioriver-2022/id1147084286?i=1000578812132",
"343": "https://podcasts.apple.com/gb/podcast/mnmt-343-abstract-division/id1147084286?i=1000578008243",
"342": "https://podcasts.apple.com/gb/podcast/mnmt-342-john-plaza/id1147084286?i=1000577309648",
"341": "https://podcasts.apple.com/gb/podcast/mnmt-341-the-alchemical-theory/id1147084286?i=1000575008733",
"ΜΝΜΤ Recordings ": "https://podcasts.apple.com/gb/podcast/%CE%BC%CE%BD%CE%BC%CF%84-recordings-valentin-ginies-third-eye-festival-2022/id1147084286?i=1000574755926",
"340": "https://podcasts.apple.com/gb/podcast/mnmt-340-falling-echoes/id1147084286?i=1000571436999",
"339": "https://podcasts.apple.com/gb/podcast/mnmt-339-yogg/id1147084286?i=1000570737174",
"338": "https://podcasts.apple.com/gb/podcast/mnmt-338-aleja-sanchez-b2b-reggy-van-oers/id1147084286?i=1000569875512",
"337": "https://podcasts.apple.com/gb/podcast/mnmt-337-amotik/id1147084286?i=1000569284850",
"336": "https://podcasts.apple.com/gb/podcast/mnmt-336-mordio/id1147084286?i=1000568426628",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-eyvind-blix-live/id1147084286?i=1000596917878",
"335": "https://podcasts.apple.com/gb/podcast/mnmt-335-cau%C3%AA/id1147084286?i=1000567479025",
"334": "https://podcasts.apple.com/gb/podcast/mnmt-334-ina-kacz/id1147084286?i=1000566608066",
"332": "https://podcasts.apple.com/gb/podcast/mnmt-332-voiski/id1147084286?i=1000564936761",
"331": "https://podcasts.apple.com/gb/podcast/mnmt-331-conceptual/id1147084286?i=1000563970545",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-shoal-live/id1147084286?i=1000596917414",
"330": "https://podcasts.apple.com/gb/podcast/mnmt-330-lakej/id1147084286?i=1000561630649",
"329": "https://podcasts.apple.com/gb/podcast/mnmt-329-rena/id1147084286?i=1000559727784",
"328": "https://podcasts.apple.com/gb/podcast/mnmt-328-eliott-litrowski/id1147084286?i=1000558951224",
"327": "https://podcasts.apple.com/gb/podcast/mnmt-327-rambadu/id1147084286?i=1000558400068",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-severja/id1147084286?i=1000558044708",
"326": "https://podcasts.apple.com/gb/podcast/mnmt-326-launaea/id1147084286?i=1000557770837",
"MNMT Premiere": "https://podcasts.apple.com/gb/podcast/mnmt-premiere-kletis-decay/id1147084286?i=1000557244774",
"325": "https://podcasts.apple.com/gb/podcast/mnmt-325-plants-army-revolver/id1147084286?i=1000556781581",
"Monument x Mostra": "https://podcasts.apple.com/gb/podcast/monument-x-mostra-estrato-aurora-live/id1147084286?i=1000556019324",
"324": "https://podcasts.apple.com/gb/podcast/mnmt-324-fernie/id1147084286?i=1000555096262",
"MNMT Premiere": "https://podcasts.apple.com/gb/podcast/mnmt-premiere-moonlight-resort-spa-aromatherapy/id1147084286?i=1000554720823",
"323": "https://podcasts.apple.com/gb/podcast/mnmt-323-night-sea/id1147084286?i=1000554354513",
"322": "https://podcasts.apple.com/gb/podcast/mnmt-322-yukari-okamura/id1147084286?i=1000553287072",
"321": "https://podcasts.apple.com/gb/podcast/mnmt-321-s-pill/id1147084286?i=1000552297191",
"320": "https://podcasts.apple.com/gb/podcast/mnmt-320-lindsey-herbert/id1147084286?i=1000551405656",
"Monument x Mostra w/ !nertia": "https://podcasts.apple.com/gb/podcast/monument-x-mostra-w-nertia/id1147084286?i=1000551040265",
"319": "https://podcasts.apple.com/gb/podcast/mnmt-319-alderaan/id1147084286?i=1000549880388",
"318": "https://podcasts.apple.com/gb/podcast/mnmt-318-amulador/id1147084286?i=1000549152210",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-korpex/id1147084286?i=1000547680843",
"317": "https://podcasts.apple.com/gb/podcast/mnmt-317-developer-nye-mix/id1147084286?i=1000546578852",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-marco-shuttle/id1147084286?i=1000546028131",
"316": "https://podcasts.apple.com/gb/podcast/mnmt-316-ntogn-midwinter-mix/id1147084286?i=1000545643837",
"MNMT Records": "https://podcasts.apple.com/gb/podcast/mnmt-records-atomic-moog-chasing-blue-anthony-linell/id1147084286?i=1000543043017",
"MNMT Records": "https://podcasts.apple.com/gb/podcast/mnmt-records-atomic-moog-static-flow-rework/id1147084286?i=1000543490713",
"315": "https://podcasts.apple.com/gb/podcast/mnmt-315-stefan-vincent/id1147084286?i=1000544410863",
"314": "https://podcasts.apple.com/gb/podcast/mnmt-314-clotur/id1147084286?i=1000543718287",
"313": "https://podcasts.apple.com/gb/podcast/mnmt-313-raroh/id1147084286?i=1000543042156",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-eli-verveine/id1147084286?i=1000542464145",
"312": "https://podcasts.apple.com/gb/podcast/mnmt-312-kwartz/id1147084286?i=1000541677549",
"311": "https://podcasts.apple.com/gb/podcast/mnmt-311-patrick-russell/id1147084286?i=1000540735069",
"310": "https://podcasts.apple.com/gb/podcast/mnmt-310-joachim-spieth/id1147084286?i=1000539261354",
"MNMT Recordings : Kaspiann (Live) - @Elements x Sektgarten @ ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-kaspiann-live-elements-x-sektgarten/id1147084286?i=1000538192065",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-foreign-material/id1147084286?i=1000537828426",
"309": "https://podcasts.apple.com/gb/podcast/mnmt-309-mary-yuzovskaya/id1147084286?i=1000536371353",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-monodogue/id1147084286?i=1000535519537",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-worg/id1147084286?i=1000534791852",
"308": "https://podcasts.apple.com/gb/podcast/mnmt-308-kontinum/id1147084286?i=1000534288430",
"Monument Festival 2021": "https://podcasts.apple.com/gb/podcast/monument-festival-2021-lara-palmer/id1147084286?i=1000596917374",
"307": "https://podcasts.apple.com/gb/podcast/mnmt-307-chryslsm/id1147084286?i=1000530388794",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-arkaean-l%C4%81sya-festival-9128-live/id1147084286?i=1000530024907",
"306": "https://podcasts.apple.com/gb/podcast/mnmt-306-emily-jeanne/id1147084286?i=1000529064508",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-stian-balducci-plattform-gr%C3%A5-kjetil-jerve/id1147084286?i=1000528592607",
"305": "https://podcasts.apple.com/gb/podcast/mnmt-305-inland/id1147084286?i=1000528212309",
"304": "https://podcasts.apple.com/gb/podcast/mnmt-304-sabine-hoffmann/id1147084286?i=1000527486735",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-eric-cloutier-l%C4%81sya-festival-9128-live/id1147084286?i=1000527093510",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-klara-l%C4%81sya-festival-9128-live/id1147084286?i=1000526712032",
"303": "https://podcasts.apple.com/gb/podcast/mnmt-303-crossing-avenue/id1147084286?i=1000525851035",
"MNMT Live ": "https://podcasts.apple.com/gb/podcast/mnmt-live-polygonia/id1147084286?i=1000525412108",
"302": "https://podcasts.apple.com/gb/podcast/mnmt-302-sanna-mun/id1147084286?i=1000524929340",
"301": "https://podcasts.apple.com/gb/podcast/mnmt-301-simone-bauer/id1147084286?i=1000524055483",
"300": "https://podcasts.apple.com/gb/podcast/mnmt-300-natural-electronic-system/id1147084286?i=1000523269758",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-paula-koski-anecumene-9128-live/id1147084286?i=1000522897833",
"299": "https://podcasts.apple.com/gb/podcast/mnmt-299-jamida/id1147084286?i=1000522486964",
"298": "https://podcasts.apple.com/gb/podcast/mnmt-298-asllan/id1147084286?i=1000522062490",
"297": "https://podcasts.apple.com/gb/podcast/mnmt-297-hierarchy/id1147084286?i=1000521575214",
"MNMT Label Showcase ": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-harmony-rec/id1147084286?i=1000521083447",
"296": "https://podcasts.apple.com/gb/podcast/mnmt-296-doctrina-natura/id1147084286?i=1000520428554",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-laura-mrls-anecumene-9128-live/id1147084286?i=1000519208849",
"295": "https://podcasts.apple.com/gb/podcast/mnmt-295-brando-lupi/id1147084286?i=1000518423813",
"294": "https://podcasts.apple.com/gb/podcast/mnmt-294-utopian/id1147084286?i=1000517227506",
"293": "https://podcasts.apple.com/gb/podcast/mnmt-293-su-nuraxi/id1147084286?i=1000516923557",
"292": "https://podcasts.apple.com/gb/podcast/mnmt-292-dycide/id1147084286?i=1000516267636",
"291": "https://podcasts.apple.com/gb/podcast/mnmt-291-g%C5%82%C3%B3s/id1147084286?i=1000515381207",
"MNMT Recordings ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-samuel-anecumene-9128-live/id1147084286?i=1000514835250",
"290": "https://podcasts.apple.com/gb/podcast/mnmt-290-sciahri/id1147084286?i=1000514352490",
"289": "https://podcasts.apple.com/gb/podcast/mnmt-289-d-leria/id1147084286?i=1000513544877",
"288": "https://podcasts.apple.com/gb/podcast/mnmt-288-beyond-humans/id1147084286?i=1000512550852",
"MNMT Recordings  ": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-sam-kdc-live-anecumene-9128-live/id1147084286?i=1000511573484",
"281": "https://podcasts.apple.com/gb/podcast/mnmt-281-oxygn/id1147084286?i=1000501935070",
"278": "https://podcasts.apple.com/gb/podcast/mnmt-278-altinbas/id1147084286?i=1000499501898",
"274": "https://podcasts.apple.com/gb/podcast/mnmt-274-psyk/id1147084286?i=1000494040520",
"272": "https://podcasts.apple.com/gb/podcast/mnmt-272-kaspiann/id1147084286?i=1000491595410",
"MNMT Events": "https://podcasts.apple.com/gb/podcast/mnmt-events-feber-forest-rave/id1147084286?i=1000490462402",
"271": "https://podcasts.apple.com/gb/podcast/mnmt-271-hiver/id1147084286?i=1000490006946",
"270": "https://podcasts.apple.com/gb/podcast/mnmt-270-yukimasa/id1147084286?i=1000486697513",
"MNMT Label Showcase": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-kizen/id1147084286?i=1000486256828",
"268": "https://podcasts.apple.com/gb/podcast/mnmt-268-tsurugi/id1147084286?i=1000485172069",
"MNMT 267: re": "https://podcasts.apple.com/gb/podcast/mnmt-267-re-phill/id1147084286?i=1000483768316",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-lemna-live-contact-tokyo/id1147084286?i=1000483168045",
"266": "https://podcasts.apple.com/gb/podcast/mnmt-266-conor-og/id1147084286?i=1000482345244",
"265": "https://podcasts.apple.com/gb/podcast/mnmt-265-daniel-i/id1147084286?i=1000479589585",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-svreca-paral-lel-festival-2019/id1147084286?i=1000478620489",
"264": "https://podcasts.apple.com/gb/podcast/mnmt-264-will-oirson/id1147084286?i=1000478467460",
"263": "https://podcasts.apple.com/gb/podcast/mnmt-263-jon/id1147084286?i=1000477550538",
"261": "https://podcasts.apple.com/gb/podcast/mnmt-261-kayon/id1147084286?i=1000476466582",
"260": "https://podcasts.apple.com/gb/podcast/mnmt-260-nferee/id1147084286?i=1000476074587",
"258": "https://podcasts.apple.com/gb/podcast/mnmt-258-lara-palmer/id1147084286?i=1000474557103",
"257": "https://podcasts.apple.com/gb/podcast/mnmt-257-dj-red/id1147084286?i=1000473868008",
"256": "https://podcasts.apple.com/gb/podcast/mnmt-256-ario/id1147084286?i=1000473136803",
"255": "https://podcasts.apple.com/gb/podcast/mnmt-255-lvt/id1147084286?i=1000472397355",
"254": "https://podcasts.apple.com/gb/podcast/mnmt-254-agonis/id1147084286?i=1000471660445",
"253": "https://podcasts.apple.com/gb/podcast/mnmt-253-konduku/id1147084286?i=1000470977288",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-o-ma-rural-festival-2019/id1147084286?i=1000470630273",
"251": "https://podcasts.apple.com/gb/podcast/mnmt-251-pris/id1147084286?i=1000469582762",
"250": "https://podcasts.apple.com/gb/podcast/mnmt-250-secus/id1147084286?i=1000468880435",
"249": "https://podcasts.apple.com/gb/podcast/mnmt-249-romi/id1147084286?i=1000468220643",
"MNMT Label Showcase": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-glacial-movements/id1147084286?i=1000467893378",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-deepbass-fusion-tokyo/id1147084286?i=1000467322407",
"248": "https://podcasts.apple.com/gb/podcast/mnmt-248-holotropic/id1147084286?i=1000466852191",
"247": "https://podcasts.apple.com/gb/podcast/mnmt-247-forest-drive-west/id1147084286?i=1000466191771",
"245": "https://podcasts.apple.com/gb/podcast/mnmt-245-bmbmnd/id1147084286?i=1000464895389",
"Monument Festival 2019": "https://podcasts.apple.com/gb/podcast/monument-festival-2019-hydrangea/id1147084286?i=1000596917587",
"244": "https://podcasts.apple.com/gb/podcast/mnmt-244-javier-marimon/id1147084286?i=1000464121375",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-mary-yuzovskaya-public-records-brooklyn/id1147084286?i=1000463812269",
"243": "https://podcasts.apple.com/gb/podcast/mnmt-243-luigi-tozzi/id1147084286?i=1000463621547",
"MNMT Events": "https://podcasts.apple.com/gb/podcast/mnmt-events-lara-palmer/id1147084286?i=1000463230412",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-scav-la-vall%C3%A9e-%C3%A9lectrique-2019/id1147084286?i=1000463230411",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-dash-la-vall%C3%A9e-%C3%A9lectrique-2019/id1147084286?i=1000463336722",
"242": "https://podcasts.apple.com/gb/podcast/mnmt-242-shimoyan/id1147084286?i=1000462868903",
"MNMT Label Showcase": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-nousklaer-audio/id1147084286?i=1000462376658",
"241": "https://podcasts.apple.com/gb/podcast/mnmt-241-selik/id1147084286?i=1000463230410",
"240": "https://podcasts.apple.com/gb/podcast/mnmt-240-kannabi/id1147084286?i=1000463230413",
"239": "https://podcasts.apple.com/gb/podcast/mnmt-239-yan/id1147084286?i=1000460812342",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-muhe-fusion-nov-30th/id1147084286?i=1000460558331",
"MNMT Mix": "https://podcasts.apple.com/gb/podcast/mnmt-mix-ntogn-2019-midwinter/id1147084286?i=1000460398541",
"237": "https://podcasts.apple.com/gb/podcast/mnmt-237-polygonia/id1147084286?i=1000459410989",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-refracted-calma-00/id1147084286?i=1000459301895",
"236": "https://podcasts.apple.com/gb/podcast/mnmt-236-lavera/id1147084286?i=1000458828699",
"235": "https://podcasts.apple.com/gb/podcast/mnmt-235-yugen/id1147084286?i=1000458113806",
"234": "https://podcasts.apple.com/gb/podcast/mnmt-234-koen-hoets/id1147084286?i=1000457407836",
"Monument Festival 2019": "https://podcasts.apple.com/gb/podcast/monument-festival-2019-jane-fitz/id1147084286?i=1000456567594",
"233": "https://podcasts.apple.com/gb/podcast/mnmt-233-justine-perry/id1147084286?i=1000456164780",
"232": "https://podcasts.apple.com/gb/podcast/mnmt-232-saphileaum/id1147084286?i=1000456164781",
"MNMT Events": "https://podcasts.apple.com/gb/podcast/mnmt-events-valentino-mora/id1147084286?i=1000455375153",
"231": "https://podcasts.apple.com/gb/podcast/mnmt-231-ena/id1147084286?i=1000454869131",
"230": "https://podcasts.apple.com/gb/podcast/mnmt-230-volte-face/id1147084286?i=1000453860499",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-alcachofa-emerald-garden/id1147084286?i=1000454065938",
"228": "https://podcasts.apple.com/gb/podcast/mnmt-228-sc%C3%B8pe/id1147084286?i=1000452154729",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-gar%C3%A7on-paral-lel-festival-2019/id1147084286?i=1000451902590",
"227": "https://podcasts.apple.com/gb/podcast/mnmt-227-rafael-anton-irisarri/id1147084286?i=1000451314773",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-aaron-j-izvir-formaviva-2019/id1147084286?i=1000450874760",
"226": "https://podcasts.apple.com/gb/podcast/mnmt-226-vohkinne/id1147084286?i=1000451902591",
"Monument Festival 2019": "https://podcasts.apple.com/gb/podcast/monument-festival-2019-feral/id1147084286?i=1000449955900",
"225": "https://podcasts.apple.com/gb/podcast/mnmt-225-bas-dobbelaer/id1147084286?i=1000449628480",
"224": "https://podcasts.apple.com/gb/podcast/mnmt-224-nems-b/id1147084286?i=1000448692112",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-lindsey-herbert-batumi/id1147084286?i=1000448066767",
"223": "https://podcasts.apple.com/gb/podcast/mnmt-223-antenes/id1147084286?i=1000447513326",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-sofus-forsberg-live-radar/id1147084286?i=1000447234035",
"222": "https://podcasts.apple.com/gb/podcast/mnmt-222-forest-on-stasys/id1147084286?i=1000446965886",
"221": "https://podcasts.apple.com/gb/podcast/mnmt-221-altstadt-echo/id1147084286?i=1000446788928",
"220": "https://podcasts.apple.com/gb/podcast/mnmt-220-pool/id1147084286?i=1000445856483",
"219": "https://podcasts.apple.com/gb/podcast/mnmt-219-khlav-kalash/id1147084286?i=1000445285725",
"218": "https://podcasts.apple.com/gb/podcast/mnmt-218-unjin/id1147084286?i=1000444794263",
"MNMT Live": "https://podcasts.apple.com/gb/podcast/mnmt-live-felix-fleer/id1147084286?i=1000445121218",
"217": "https://podcasts.apple.com/gb/podcast/mnmt-217-karim/id1147084286?i=1000443769779",
"Monument Festival 2019": "https://podcasts.apple.com/gb/podcast/monument-festival-2019-samuel/id1147084286?i=1000443342501",
"MNMT Events": "https://podcasts.apple.com/gb/podcast/mnmt-events-developer/id1147084286?i=1000443342503",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-siwei-live-octa/id1147084286?i=1000442581311",
"216": "https://podcasts.apple.com/gb/podcast/mnmt-216-aksamit/id1147084286?i=1000442256043",
"215": "https://podcasts.apple.com/gb/podcast/mnmt-215-kyntral/id1147084286?i=1000443342504",
"214": "https://podcasts.apple.com/gb/podcast/mnmt-214-joachim-spieth/id1147084286?i=1000440758170",
"213": "https://podcasts.apple.com/gb/podcast/mnmt-213-thnts/id1147084286?i=1000440139043",
"212": "https://podcasts.apple.com/gb/podcast/mnmt-212-solaris/id1147084286?i=1000440139044",
"211": "https://podcasts.apple.com/gb/podcast/mnmt-211-shltr/id1147084286?i=1000438241129",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-haruka-future-terror-18-19/id1147084286?i=1000438017177",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-orion-live-moka/id1147084286?i=1000437337791",
"210": "https://podcasts.apple.com/gb/podcast/mnmt-210-ysk/id1147084286?i=1000437069376",
"209": "https://podcasts.apple.com/gb/podcast/mnmt-209-drafted/id1147084286?i=1000443342502",
"208": "https://podcasts.apple.com/gb/podcast/mnmt-208-ben-buitendijk/id1147084286?i=1000435225959",
"207": "https://podcasts.apple.com/gb/podcast/mnmt-207-acronym/id1147084286?i=1000434880070",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-svarog-live-suicide-circus-jan-11th-2019/id1147084286?i=1000434406074",
"206": "https://podcasts.apple.com/gb/podcast/mnmt-206-dino-sabatini/id1147084286?i=1000434143462",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-saphileaum-live-khidi/id1147084286?i=1000434880068",
"205": "https://podcasts.apple.com/gb/podcast/mnmt-205-robin-kampschoer/id1147084286?i=1000434412020",
"MNMT Label Showcase": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-the-bunker-ny/id1147084286?i=1000434412022",
"204": "https://podcasts.apple.com/gb/podcast/mnmt-204-laertes/id1147084286?i=1000434412021",
"MNMT Label Showcase": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-a-strangely-isolated-place/id1147084286?i=1000434412019",
"203": "https://podcasts.apple.com/gb/podcast/mnmt-203-masafumi-take/id1147084286?i=1000434880069",
"202": "https://podcasts.apple.com/gb/podcast/mnmt-202-klara/id1147084286?i=1000434039124",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-orphx-katharsis-2018/id1147084286?i=1000431121211",
"201": "https://podcasts.apple.com/gb/podcast/mnmt-201-eyvind-blix/id1147084286?i=1000434880067",
"MNMT Label Showcase": "https://podcasts.apple.com/gb/podcast/mnmt-label-showcase-midgar-records/id1147084286?i=1000430561379",
"200": "https://podcasts.apple.com/gb/podcast/mnmt-200-korpex/id1147084286?i=1000430328150",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-a-brehme-technoon-jan-20th-2019/id1147084286?i=1000430097893",
"199": "https://podcasts.apple.com/gb/podcast/mnmt-199-efraim-kent/id1147084286?i=1000429932738",
"MNMT Recordings": "https://podcasts.apple.com/gb/podcast/mnmt-recordings-vc-118a-live-onderwereld/id1147084286?i=1000429625872",
"198": "https://podcasts.apple.com/gb/podcast/mnmt-198-laura-bcr/id1147084286?i=1000429468753"
};

// replaceAndSave
function replaceAndSave( mode, url="" ) {
    logFunc( "replaceAndSave" );
    logVar( "mode", mode );

    var textarea = $("#wpTextbox1"),
        textOrig = textarea.val(),
        text = textOrig,
        textReplaced = text,
        warning = "",
        skipSave = false;

    switch( mode ) {
        case "refrenceUrls":
            log( "doing refrenceUrls" );
            // Hot hack: 1st URL pasted at the end of top row
            textReplaced = text
                .replace( /{{(Player)(http.+)\n \|(?:1=)?(http.+)\n}}/, '{{$1|mode=mirrors\n |1=$2\n |2=$3\n}}' ) // 1 URL before with hot fix
                .replace( /{{(Player.*)(http.+)\n \|(?:1=)?(http.+)\n \|(?:2=)?(http.+)\n}}/, '{{$1\n |1=$2\n |2=$3\n |3=$4\n}}' ) // 2 URLs before with hot fix
                .replace( /{{(Player.*)(http.+)\n \|(?:1=)?(http.+)\n \|(?:2=)?(http.+)\n \|(?:3=)?(http.+)\n}}/, '{{$1\n |1=$2\n |2=$3\n |3=$4\n |4=$5\n}}' ) // 3 URLs before with hot fox
                .replace( /{{(Player.*)(http.+)\n \|(?:1=)?(http.+)\n \|(?:2=)?(http.+)\n \|(?:3=)?(http.+)\n \|(?:4=)?(http.+)\n}}/, '{{$1\n |1=$2\n |2=$3\n |3=$4\n |4=$5\n |5=$6\n}}' ) // 4 URLs before with hit fix
                .replace( /{{Player\|(?:1=)?(http.+)}}(http.+)/, '{{Player|mode=mirrors\n |1=$2\n |2=$1\n}}' ) // 1 URL, 1 line
                .replace( /{{Player(http.+)\n \|(?:1=)?(http.+)\n}}/, '{{Player|mode=mirrors\n |1=$1\n |2=$2\n}}' ) // 1 URL, numbered or not
                .replace( /{{Player\|video=audio(http.+)\n \|(?:1=)?(http.+)\n}}/, '{{Player|mode=mirrors|video=audio\n |1=$1\n |2=$2\n}}' ) // 1 URL, numbered or not
                .replace( /{{(Player.*)\n \|(?:1=)?(http.+)\n \|(?:2=)?(http.+)\n}}/, '{{$1\n |1=$2\n |2=$3\n}}' ) // 2 URLs, numbered or not
                .replace( /{{(Player.*)\n \|(?:1=)?(http.+)\n \|(?:2=)?(http.+)\n \|(?:3=)?(http.+)\n}}/, '{{$1\n |1=$2\n |2=$3\n |3=$4\n}}' ) // 3 URLs, numbered or not
            ;
            break;
        case "autoAPurls":
            log( "doing autoAPurls" );
            if( textOrig.match(/podcasts\.apple\.com/) ) {
                $("#autoAPurls a").remove();
                skipSave = true;
            } else {
                logVar( "addAtPosition", addAtPosition );
                textReplaced = addApplePodcastUrlToPlayer( text, url, addAtPosition );

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /\|}\n\n== (Notes|Tracklist) ==/, '|}\n\n{{Player\n |1='+url+'\n}}\n\n== $1 ==' ); // No URL after wikitable, add new player
                }

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /(\n\n)(== (Notes|Tracklist) ==)/, '\n\n{{Player\n |1='+url+'\n}}\n\n$2' ); // No URL or wikitable, add new player before section
                }
            }
            break;
    }

    if( text.match(/{{Player.+\|t\d+=.+}}/) ) {
        warning += "t parameters found. Please renumber!";
    }

    if( textReplaced != textOrig ) {
        // replace textarea text
        textarea.val( textReplaced );
        // save
        if( warning == "" ) {
            if( !skipSave ) {
                $("#wpSave").click();
            }
        } else {
            alert( warning );
        }
    } else {
        log( "Nothing replaced." );
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On mixesdb.com
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

if( location.hostname == "www.mixesdb.com" ) {
    $(document).ready(function(){ // needed for mw.config

        /*
         * On edit
         */
        // Prepare variables to check if we're on a mix page etc.
        var wgAction = mw.config.get("wgAction"),
            wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
            wgTitle = mw.config.get("wgTitle"),
            wgPageName = mw.config.get("wgPageName");

        /* On editing */
        if( ( wgAction=="edit" || wgAction=="submit" ) && ( wgNamespaceNumber==0 || wgNamespaceNumber==4 ) && wgTitle!="Main Page" ) {
            log("editing");

            //var epId = wgTitle.replace( /^(.+ - .+ - )(?:Whitenoise|White Noise) (\d+)(, RTÉ 2FM)?( \(Best Of.+)?$/, "$2" ).trim();
            //var epId = wgTitle.replace( /^(?:.+ - .+)(?:\(|, )(DCR\d+)(?:\))$/, "$1" ).trim();
            //var epId = wgTitle.replace( /^(?:.+ - .+Transmissions )(\d+).*$/, "$1" ).trim().replace( /^(\d\d)$/, "0$1" );
            //var epId = wgTitle.replace( /^(?:.+ - .+[ (]Purified )(\d\d\d)\)?$/, "$1" ).trim();
            //var epId = wgTitle.replace( /^(?:.+ - .+[ (]We Are The Brave (?:Radio )?)(\d+)\)?$/, "$1" ).trim().replace( /^(\d\d)$/, "0$1" ).replace( /^(\d)$/, "00$1" );
            //var epId = wgTitle.replace( /^(?:.+ - .+ - )(SlothBoogie Guestmix \d+)$/, "$1" ).trim();
            //var epId = wgTitle.replace( /^(?:.+ - .+ - )Resident (\d+).*$/, "$1" ).trim();
            var epId = wgTitle.replace( /^(?:.+ - .+ - Monument )(\d+).*$/, "$1" ).trim();

            var epUrl = episodes_arr[epId];
            logVar( "epId", epId +" "+ epUrl );

            waitForKeyElements("form#editform .wikiEditor-ui-toolbar .group-insert", function(jNode) {
                var toolbar = jNode;
                toolbar.append( '<span class="left5">Players:</span>' );

                // add button 1=
                var toolNumberPlayerUrls = makeEditorButton( "refrenceUrls", "1=", "Reference URLs (if all unreferenced): |1=URL1 |2=URL2 etc." );
                toolbar.append( toolNumberPlayerUrls );

                // add button RA AP
                if( episodes_arr[epId] ) {
                    var toolNumberPlayerUrls = makeEditorButton( "autoAPurls", "AP", "Insert RA AP episode URL from array" );
                    toolbar.append( toolNumberPlayerUrls );
                }
            });
        }

        // refrenceUrls
        waitForKeyElements("#refrenceUrls a", function(jNode){
            jNode.click(function(){
                replaceAndSave( "refrenceUrls", "" );
            });
        });

        // autoAPurls
        waitForKeyElements("#autoAPurls a", function(jNode){
            // auto click if button is added
            replaceAndSave( "autoAPurls", epUrl );
        });


        /*
         * On MixesDB:Explorer
         * Add a link ot the results header to open all edit links
         */
        // Both Player URLs userscripts (Apple Podcasts and YouTube) run on MixesDB and would each
        // add their own link, resulting in a duplicate id and every edit link opening twice.
        // Whichever script gets here first wins, the other one skips creation AND the click handler.
        if( ( wgPageName == "MixesDB:Explorer/Mixes" || wgPageName == "MixesDB:Explorer/Lists" )
            && !document.getElementById( "editAllRes" ) ) {
            var editAllRes = '<a id="editAllRes" style="float:right" href="#" >Edit all results</a>';
            $("#explorerRes-wrapper .explorerRes").append( editAllRes );

            $("#editAllRes").click(function(){
                if( wgPageName == "MixesDB:Explorer/Mixes" ) {
                    var editLink = $(".explorerTitle .link-action-edit");
                }
                if( wgPageName == "MixesDB:Explorer/Lists" ) {
                    var editLink = $(".linkIconsBefore .editalot");
                }
                if( editLink ) {
                    editLink.each(function(){
                        var url = $(this).attr("href");
                        logVar ("url", url );
                        window.open( url, '_blank' );
                    });
                }
            });
        }
    });
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On podcasts.apple.com
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
if( location.hostname == "podcasts.apple.com" ) {
    /*
     * On show pages
     */
    var episodesArr = [];
    waitForKeyElements("ol[data-testid='episodes-list'] li", function( jNode ) {
        var titleLink = $(".episode-details__title-wrapper .multiline-clamp__text", jNode),
            epTitle = titleLink.text(),
            epUrl = $("a.link-action", jNode).attr("href");

        episodesArr.push({ title:epTitle, url:epUrl });

        // logging
        // building episodes_arr reuires copying from the log
        // while that the titles can be normalized to just read the episode number (or ID.001 etc.)
        // that ID must then match the mix page title (see code var epId = wgTitle.replace)
        log( "" + epTitle + " : " + epUrl + "" );
    });
}