// ==UserScript==
// @name         Apple Podcasts Player URLs (private)
// @version      2026.07.10.4
// @description  Add Apple Podcasts player URLs from array to mix pages when episode numbers match the mix page title
// @updateURL    https://raw.githubusercontent.com/Subfader/Private-userscripts/refs/heads/main/Apple_Podcasts_Player_URLs/user.script.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-MixesDB_Players_Helper_7
// @match        https://www.mixesdb.com/*
// @match        https://*podcasts.apple.com/*
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

var episodes_arr = {
"791": "https://podcasts.apple.com/de/podcast/resident-episode-791-july-04-2026/id387385712?i=1000775499928",
"790": "https://podcasts.apple.com/de/podcast/resident-episode-790-june-27-2026/id387385712?i=1000774528286",
"789": "https://podcasts.apple.com/de/podcast/resident-episode-789-june-20-2026/id387385712?i=1000773581713",
"788": "https://podcasts.apple.com/de/podcast/resident-episode-788-june-13-2026/id387385712?i=1000772595935",
"787": "https://podcasts.apple.com/de/podcast/resident-episode-787-june-06-2026/id387385712?i=1000771519663",
"786": "https://podcasts.apple.com/de/podcast/resident-episode-786-may-30-2026/id387385712?i=1000770396800",
"785": "https://podcasts.apple.com/de/podcast/resident-episode-785-may-23-2026/id387385712?i=1000769304877",
"784": "https://podcasts.apple.com/de/podcast/resident-episode-784-may-16-2026/id387385712?i=1000768222483",
"783": "https://podcasts.apple.com/de/podcast/resident-episode-783-may-09-2026/id387385712?i=1000767022370",
"782": "https://podcasts.apple.com/de/podcast/resident-episode-782-may-02-2026/id387385712?i=1000765855559",
"781": "https://podcasts.apple.com/de/podcast/resident-episode-781-apr-25-2026/id387385712?i=1000763634747",
"780": "https://podcasts.apple.com/de/podcast/resident-episode-780-apr-18-2026/id387385712?i=1000762214314",
"779": "https://podcasts.apple.com/de/podcast/resident-episode-779-apr-11-2026/id387385712?i=1000760903890",
"778": "https://podcasts.apple.com/de/podcast/resident-episode-778-apr-04-2026/id387385712?i=1000759348417",
"777": "https://podcasts.apple.com/de/podcast/resident-episode-777-mar-28-2026/id387385712?i=1000757998009",
"776": "https://podcasts.apple.com/de/podcast/resident-episode-776-mar-21-2026/id387385712?i=1000756552063",
"775": "https://podcasts.apple.com/de/podcast/resident-episode-775-mar-14-2026/id387385712?i=1000755360887",
"774": "https://podcasts.apple.com/de/podcast/resident-episode-774-mar-07-2026/id387385712?i=1000753846314",
"773": "https://podcasts.apple.com/de/podcast/resident-episode-773-feb-28-2026/id387385712?i=1000752257578",
"772": "https://podcasts.apple.com/de/podcast/resident-episode-772-feb-21-2026/id387385712?i=1000750850417",
"771": "https://podcasts.apple.com/de/podcast/resident-episode-771-feb-14-2026/id387385712?i=1000749799820",
"770": "https://podcasts.apple.com/de/podcast/resident-episode-770-feb-07-2026/id387385712?i=1000748731486",
"769": "https://podcasts.apple.com/de/podcast/resident-episode-769-jan-31-2026/id387385712?i=1000747536426",
"768": "https://podcasts.apple.com/de/podcast/resident-episode-768-jan-24-2026/id387385712?i=1000746536190",
"767": "https://podcasts.apple.com/de/podcast/resident-episode-767-jan-17-2026/id387385712?i=1000745593618",
"766": "https://podcasts.apple.com/de/podcast/resident-episode-766-jan-10-2026/id387385712?i=1000744656007",
"765": "https://podcasts.apple.com/de/podcast/resident-episode-765-jan-03-2026/id387385712?i=1000743669724",
"764": "https://podcasts.apple.com/de/podcast/resident-episode-764-dec-27-2025/id387385712?i=1000742919495",
"763": "https://podcasts.apple.com/de/podcast/resident-episode-763-dec-20-2025/id387385712?i=1000742168159",
"762": "https://podcasts.apple.com/de/podcast/resident-episode-762-dec-13-2025/id387385712?i=1000741197931",
"761": "https://podcasts.apple.com/de/podcast/resident-episode-761-dec-06-2025/id387385712?i=1000740047437",
"760": "https://podcasts.apple.com/de/podcast/resident-episode-760-nov-29-2025/id387385712?i=1000738952225",
"759": "https://podcasts.apple.com/de/podcast/resident-episode-759-nov-22-2025/id387385712?i=1000737965235",
"758": "https://podcasts.apple.com/de/podcast/resident-episode-758-nov-15-2025/id387385712?i=1000736929280",
"757": "https://podcasts.apple.com/de/podcast/resident-episode-757-nov-08-2025/id387385712?i=1000735928397",
"756": "https://podcasts.apple.com/de/podcast/resident-episode-756-nov-01-2025/id387385712?i=1000734771024",
"755": "https://podcasts.apple.com/de/podcast/resident-episode-755-oct-25-2025/id387385712?i=1000733525334",
"754": "https://podcasts.apple.com/de/podcast/resident-episode-754-oct-18-2025/id387385712?i=1000732493278",
"753": "https://podcasts.apple.com/de/podcast/resident-episode-753-oct-11-2025/id387385712?i=1000731405274",
"752": "https://podcasts.apple.com/de/podcast/resident-episode-752-oct-04-2025/id387385712?i=1000730163875",
"751": "https://podcasts.apple.com/de/podcast/resident-episode-751-sep-27-2025/id387385712?i=1000728781352",
"750": "https://podcasts.apple.com/de/podcast/resident-episode-750-sep-20-3025/id387385712?i=1000727701153",
"749": "https://podcasts.apple.com/de/podcast/resident-episode-749-sep-13-2025/id387385712?i=1000726724894",
"748": "https://podcasts.apple.com/de/podcast/resident-episode-748-sep-06-2025/id387385712?i=1000725352802",
"747": "https://podcasts.apple.com/de/podcast/resident-episode-747-aug-30-2025/id387385712?i=1000724230134",
"746": "https://podcasts.apple.com/de/podcast/resident-episode-746-aug-23-2025/id387385712?i=1000723280631",
"745": "https://podcasts.apple.com/de/podcast/resident-episode-745-aug-16-2025/id387385712?i=1000722262642",
"744": "https://podcasts.apple.com/de/podcast/resident-episode-744-aug-09-2025/id387385712?i=1000721354244",
"743": "https://podcasts.apple.com/de/podcast/resident-episode-743-aug-02-2025/id387385712?i=1000720466487",
"742": "https://podcasts.apple.com/de/podcast/resident-episode-742-jul-26-2025/id387385712?i=1000719253400",
"741": "https://podcasts.apple.com/de/podcast/resident-episode-741-jul-19-2025/id387385712?i=1000718128668",
"740": "https://podcasts.apple.com/de/podcast/resident-episode-740-jul-12-2025/id387385712?i=1000717019376",
"739": "https://podcasts.apple.com/de/podcast/resident-episode-739-jul-05-2025/id387385712?i=1000715953878",
"738": "https://podcasts.apple.com/de/podcast/resident-episode-738-jun-28-2025/id387385712?i=1000714984712",
"737": "https://podcasts.apple.com/de/podcast/resident-episode-737-jun-21-2025/id387385712?i=1000714021795",
"736": "https://podcasts.apple.com/de/podcast/resident-episode-736-jun-14-2025/id387385712?i=1000712934383",
"735": "https://podcasts.apple.com/de/podcast/resident-episode-735-jun-07-2025/id387385712?i=1000711974653",
"734": "https://podcasts.apple.com/de/podcast/resident-episode-734-may-31-2025/id387385712?i=1000710722037",
"733": "https://podcasts.apple.com/de/podcast/resident-episode-733-may-24-2025/id387385712?i=1000709764432",
"732": "https://podcasts.apple.com/de/podcast/resident-episode-732-may-17-2025/id387385712?i=1000708866493",
"731": "https://podcasts.apple.com/de/podcast/resident-episode-731-may-10-2025/id387385712?i=1000707968657",
"730": "https://podcasts.apple.com/de/podcast/resident-episode-730-may-03-2025/id387385712?i=1000706114970",
"729": "https://podcasts.apple.com/de/podcast/resident-episode-729-apr-26-2025/id387385712?i=1000705099093",
"728": "https://podcasts.apple.com/de/podcast/resident-episode-728-apr-19-2025/id387385712?i=1000704174113",
"727": "https://podcasts.apple.com/de/podcast/resident-episode-727-apr-12-2025/id387385712?i=1000703327858",
"726": "https://podcasts.apple.com/de/podcast/resident-episode-726-apr-05-2025/id387385712?i=1000702356454",
"725": "https://podcasts.apple.com/de/podcast/resident-episode-725-mar-29-2025/id387385712?i=1000701421800",
"724": "https://podcasts.apple.com/de/podcast/resident-episode-724-mar-22-2025/id387385712?i=1000700445939",
"723": "https://podcasts.apple.com/de/podcast/resident-episode-723-mar-15-2025/id387385712?i=1000699349797",
"722": "https://podcasts.apple.com/de/podcast/resident-episode-722-mar-08-2025/id387385712?i=1000698440511",
"721": "https://podcasts.apple.com/de/podcast/resident-episode-721-mar-01-2025/id387385712?i=1000697106314",
"720": "https://podcasts.apple.com/de/podcast/resident-episode-720-feb-22-2025/id387385712?i=1000695211717",
"719": "https://podcasts.apple.com/de/podcast/resident-episode-719-feb-15-2025/id387385712?i=1000692697413",
"718": "https://podcasts.apple.com/de/podcast/resident-episode-718-feb-08-2025/id387385712?i=1000690500360",
"717": "https://podcasts.apple.com/de/podcast/resident-episode-717-feb-01-2025/id387385712?i=1000688104349",
"716": "https://podcasts.apple.com/de/podcast/resident-episode-716-jan-25-2025/id387385712?i=1000685480996",
"715": "https://podcasts.apple.com/de/podcast/resident-episode-715-jan-18-2025/id387385712?i=1000684548362",
"714": "https://podcasts.apple.com/de/podcast/resident-episode-714-jan-11-2025/id387385712?i=1000683635989",
"713": "https://podcasts.apple.com/de/podcast/resident-episode-713-jan-04-2025/id387385712?i=1000682716989",
"712": "https://podcasts.apple.com/de/podcast/resident-episode-712-dec-28-2024/id387385712?i=1000682002150",
"711": "https://podcasts.apple.com/de/podcast/resident-episode-711-dec-21-2024/id387385712?i=1000681280040",
"710": "https://podcasts.apple.com/de/podcast/resident-episode-710-dec-14-2024/id387385712?i=1000680406768",
"709": "https://podcasts.apple.com/de/podcast/resident-episode-709-dec-07-2024/id387385712?i=1000679625242",
"708": "https://podcasts.apple.com/de/podcast/resident-episode-708-nov-30-2024/id387385712?i=1000678763995",
"707": "https://podcasts.apple.com/de/podcast/resident-episode-707-nov-23-2024/id387385712?i=1000678048033",
"706": "https://podcasts.apple.com/de/podcast/resident-episode-706-nov-16-2024/id387385712?i=1000677207699",
"705": "https://podcasts.apple.com/de/podcast/resident-episode-705-nov-09-2024/id387385712?i=1000676347231",
"704": "https://podcasts.apple.com/de/podcast/resident-episode-704-nov-02-2024/id387385712?i=1000675489209",
"703": "https://podcasts.apple.com/de/podcast/resident-episode-703-oct-26-2024/id387385712?i=1000674591738",
"702": "https://podcasts.apple.com/de/podcast/resident-episode-702-oct-19-2024/id387385712?i=1000673720281",
"701": "https://podcasts.apple.com/de/podcast/resident-episode-701-oct-12-2024/id387385712?i=1000672862645",
"700": "https://podcasts.apple.com/de/podcast/resident-episode-700-oct-05-2024/id387385712?i=1000671902648",
"699": "https://podcasts.apple.com/de/podcast/resident-episode-699-sep-28-2024/id387385712?i=1000671153158",
"698": "https://podcasts.apple.com/de/podcast/resident-episode-698-sep-21-2024/id387385712?i=1000670283469",
"697": "https://podcasts.apple.com/de/podcast/resident-episode-697-sep-14-2024/id387385712?i=1000669579396",
"696": "https://podcasts.apple.com/de/podcast/resident-episode-696-sep-07-2024/id387385712?i=1000668757142",
"695": "https://podcasts.apple.com/de/podcast/resident-episode-695-aug-31-2024/id387385712?i=1000667943229",
"694": "https://podcasts.apple.com/de/podcast/resident-episode-694-aug-24-2024/id387385712?i=1000666507097",
"693": "https://podcasts.apple.com/de/podcast/resident-episode-693-aug-17-2024/id387385712?i=1000665755890",
"692": "https://podcasts.apple.com/de/podcast/resident-episode-692-aug-10-2024/id387385712?i=1000664930206",
"691": "https://podcasts.apple.com/de/podcast/resident-episode-691-aug-03-2024/id387385712?i=1000664261597",
"690": "https://podcasts.apple.com/de/podcast/resident-episode-690-jul-27-2024/id387385712?i=1000663560623",
"689": "https://podcasts.apple.com/de/podcast/resident-episode-689-jul-20-2024/id387385712?i=1000662864193",
"688": "https://podcasts.apple.com/de/podcast/resident-episode-688-jul-13-2024/id387385712?i=1000662150352",
"687": "https://podcasts.apple.com/de/podcast/resident-episode-687-jul-06-2024/id387385712?i=1000661421455",
"686": "https://podcasts.apple.com/de/podcast/resident-episode-686-jun-29-2024/id387385712?i=1000660673866",
"685": "https://podcasts.apple.com/de/podcast/resident-episode-685-jun-22-2024/id387385712?i=1000659937525",
"684": "https://podcasts.apple.com/de/podcast/resident-episode-684-jun-15-2024/id387385712?i=1000659149991",
"683": "https://podcasts.apple.com/de/podcast/resident-episode-683-jun-08-2024/id387385712?i=1000658305963",
"682": "https://podcasts.apple.com/de/podcast/resident-episode-682-jun-01-2024/id387385712?i=1000657545554",
"681": "https://podcasts.apple.com/de/podcast/resident-episode-681-may-25-2024/id387385712?i=1000656777276",
"680": "https://podcasts.apple.com/de/podcast/680-hernan-cattaneo-podcast-2024-05-18/id387385712?i=1000656035949",
"679": "https://podcasts.apple.com/de/podcast/resident-episode-679-may-11-2024/id387385712?i=1000655297659",
"678": "https://podcasts.apple.com/de/podcast/resident-episode-678-may-04-2024/id387385712?i=1000654559699",
"677": "https://podcasts.apple.com/de/podcast/resident-episode-677-apr-27-2024/id387385712?i=1000653802212",
"676": "https://podcasts.apple.com/de/podcast/resident-episode-676-apr-20-2024/id387385712?i=1000653092892",
"675": "https://podcasts.apple.com/de/podcast/resident-episode-675-apr-13-2024/id387385712?i=1000652373839",
"674": "https://podcasts.apple.com/de/podcast/resident-episode-674-apr-06-2024/id387385712?i=1000651660426",
"673": "https://podcasts.apple.com/de/podcast/resident-episode-673-mar-30-2024/id387385712?i=1000650969131",
"672": "https://podcasts.apple.com/de/podcast/resident-episode-672-mar-23-2024/id387385712?i=1000650240308",
"671": "https://podcasts.apple.com/de/podcast/resident-episode-671-mar-16-2024/id387385712?i=1000649452446",
"670": "https://podcasts.apple.com/de/podcast/resident-episode-670-mar-09-2024/id387385712?i=1000648625517",
"669": "https://podcasts.apple.com/de/podcast/resident-episode-669-mar-02-2024/id387385712?i=1000647805681",
"668": "https://podcasts.apple.com/de/podcast/resident-episode-668-feb-24-2024/id387385712?i=1000646741713",
"667": "https://podcasts.apple.com/de/podcast/resident-episode-667-feb-17-2024/id387385712?i=1000645735352",
"666": "https://podcasts.apple.com/de/podcast/resident-episode-666-feb-10-2024/id387385712?i=1000644910105",
"665": "https://podcasts.apple.com/de/podcast/resident-episode-665-feb-03-2024/id387385712?i=1000644080248",
"664": "https://podcasts.apple.com/de/podcast/resident-episode-664-jan-27-2024/id387385712?i=1000643236002",
"663": "https://podcasts.apple.com/de/podcast/resident-episode-663-jan-20-2024/id387385712?i=1000642359948",
"662": "https://podcasts.apple.com/de/podcast/resident-episode-662-jan-13-2024/id387385712?i=1000641573452",
"661": "https://podcasts.apple.com/de/podcast/resident-episode-661-jan-06-2024/id387385712?i=1000640783966",
"660": "https://podcasts.apple.com/de/podcast/resident-episode-660-dec-30-2023/id387385712?i=1000640133171",
"659": "https://podcasts.apple.com/de/podcast/resident-episode-659-dec-23-2023/id387385712?i=1000639568864",
"658": "https://podcasts.apple.com/de/podcast/resident-episode-658-dec-16-2023/id387385712?i=1000638820879",
"657": "https://podcasts.apple.com/de/podcast/resident-episode-657-dec-09-2023/id387385712?i=1000638067171",
"656": "https://podcasts.apple.com/de/podcast/resident-episode-656-dec-02-2023/id387385712?i=1000637309851",
"655": "https://podcasts.apple.com/de/podcast/resident-episode-655-nov-25-2023/id387385712?i=1000636527879",
"654": "https://podcasts.apple.com/de/podcast/resident-episode-654-nov-18-2023/id387385712?i=1000635307988",
"653": "https://podcasts.apple.com/de/podcast/resident-episode-653-nov-11-2023/id387385712?i=1000634507122",
"652": "https://podcasts.apple.com/de/podcast/resident-episode-652-nov-04-2023/id387385712?i=1000633721342",
"651": "https://podcasts.apple.com/de/podcast/resident-episode-651-oct-28-2023/id387385712?i=1000632965125",
"650": "https://podcasts.apple.com/de/podcast/resident-episode-650-oct-21-2023/id387385712?i=1000632160425",
"649": "https://podcasts.apple.com/de/podcast/resident-episode-649-oct-14-2023/id387385712?i=1000631341803",
"648": "https://podcasts.apple.com/de/podcast/resident-episode-648-oct-07-2023/id387385712?i=1000630575881",
"647": "https://podcasts.apple.com/de/podcast/resident-episode-647-sep-30-2023/id387385712?i=1000629781664",
"646": "https://podcasts.apple.com/de/podcast/resident-episode-646-sep-23-2023/id387385712?i=1000628954465",
"645": "https://podcasts.apple.com/de/podcast/resident-episode-645-sep-16-2023/id387385712?i=1000628131558",
"644": "https://podcasts.apple.com/de/podcast/resident-episode-644-sep-09-2023/id387385712?i=1000627344651",
"643": "https://podcasts.apple.com/de/podcast/resident-episode-643-sep-02-2023/id387385712?i=1000626583005",
"642": "https://podcasts.apple.com/de/podcast/resident-episode-642-aug-26-2023/id387385712?i=1000625815878",
"641": "https://podcasts.apple.com/de/podcast/resident-episode-641-aug-19-2023/id387385712?i=1000625011081",
"640": "https://podcasts.apple.com/de/podcast/resident-episode-640-aug-12-2023/id387385712?i=1000624280984",
"639": "https://podcasts.apple.com/de/podcast/resident-episode-639-aug-05-2023/id387385712?i=1000623563750",
"638": "https://podcasts.apple.com/de/podcast/resident-episode-638-jul-29-2023/id387385712?i=1000622800090",
"637": "https://podcasts.apple.com/de/podcast/resident-episode-637-jul-22-2023/id387385712?i=1000622022746",
"636": "https://podcasts.apple.com/de/podcast/resident-episode-636-jul-15-2023/id387385712?i=1000621276505",
"635": "https://podcasts.apple.com/de/podcast/resident-episode-635-jul-08-2023/id387385712?i=1000620282840",
"634": "https://podcasts.apple.com/de/podcast/resident-episode-634-jul-01-2023/id387385712?i=1000619009440",
"633": "https://podcasts.apple.com/de/podcast/resident-episode-633-jun-24-2023/id387385712?i=1000618223193",
"632": "https://podcasts.apple.com/de/podcast/resident-episode-632-jun-17-2023/id387385712?i=1000617418849",
"631": "https://podcasts.apple.com/de/podcast/resident-episode-631-jun-10-2023/id387385712?i=1000616468344",
"630": "https://podcasts.apple.com/de/podcast/resident-episode-630-jun-03-2023/id387385712?i=1000615575031",
"629": "https://podcasts.apple.com/de/podcast/resident-episode-629-may-27-2023/id387385712?i=1000614738412",
"628": "https://podcasts.apple.com/de/podcast/resident-episode-628-may-20-2023/id387385712?i=1000613838041",
"627": "https://podcasts.apple.com/de/podcast/resident-episode-627-may-13-2023/id387385712?i=1000612937159",
"626": "https://podcasts.apple.com/de/podcast/resident-episode-626-may-06-2023/id387385712?i=1000612023820",
"625": "https://podcasts.apple.com/de/podcast/resident-episode-625-apr-29-2023/id387385712?i=1000611167300",
"624": "https://podcasts.apple.com/de/podcast/resident-episode-624-apr-22-2023/id387385712?i=1000610249974",
"623": "https://podcasts.apple.com/de/podcast/resident-episode-623-apr-15-2023/id387385712?i=1000609125681",
"622": "https://podcasts.apple.com/de/podcast/resident-episode-622-apr-08-2023/id387385712?i=1000608035372",
"621": "https://podcasts.apple.com/de/podcast/resident-episode-621-apr-01-2023/id387385712?i=1000606943424",
"620": "https://podcasts.apple.com/de/podcast/resident-episode-620-mar-25-2023/id387385712?i=1000605916704",
"619": "https://podcasts.apple.com/de/podcast/resident-episode-619-mar-18-2023/id387385712?i=1000604803280",
"618": "https://podcasts.apple.com/de/podcast/resident-episode-618-mar-11-2023/id387385712?i=1000603765731",
"617": "https://podcasts.apple.com/de/podcast/resident-episode-617-mar-04-2023/id387385712?i=1000602801725",
"616": "https://podcasts.apple.com/de/podcast/resident-episode-616-feb-25-2023/id387385712?i=1000601612672",
"615": "https://podcasts.apple.com/de/podcast/resident-episode-615-feb-18-2023/id387385712?i=1000600367866",
"614": "https://podcasts.apple.com/de/podcast/resident-episode-614-feb-11-2023/id387385712?i=1000599183334",
"613": "https://podcasts.apple.com/de/podcast/resident-episode-613-feb-04-2023/id387385712?i=1000598032530",
"612": "https://podcasts.apple.com/de/podcast/resident-episode-612-jan-28-2023/id387385712?i=1000597093775",
"611": "https://podcasts.apple.com/de/podcast/resident-episode-611-jan-21-2023/id387385712?i=1000595912246",
"610": "https://podcasts.apple.com/de/podcast/resident-episode-610-jan-14-2023/id387385712?i=1000594469442",
"609": "https://podcasts.apple.com/de/podcast/resident-episode-609-jan-07-2023/id387385712?i=1000593015844",
"608": "https://podcasts.apple.com/de/podcast/resident-episode-608-dec-31-2022/id387385712?i=1000591803248",
"607": "https://podcasts.apple.com/de/podcast/resident-episode-607-dec-24-2022/id387385712?i=1000591224931",
"606": "https://podcasts.apple.com/de/podcast/resident-episode-606-dec-17-2022/id387385712?i=1000590512717",
"605": "https://podcasts.apple.com/de/podcast/resident-episode-605-dec-10-2022/id387385712?i=1000589729568",
"604": "https://podcasts.apple.com/de/podcast/resident-episode-604-dec-03-2022/id387385712?i=1000588657051",
"603": "https://podcasts.apple.com/de/podcast/resident-episode-603-nov-26-2022/id387385712?i=1000587589952",
"602": "https://podcasts.apple.com/de/podcast/resident-episode-602-nov-19-2022/id387385712?i=1000586836705",
"601": "https://podcasts.apple.com/de/podcast/resident-episode-601-nov-12-2022/id387385712?i=1000585987468",
"600": "https://podcasts.apple.com/de/podcast/resident-episode-600-nov-05-2022/id387385712?i=1000585206701",
"599": "https://podcasts.apple.com/de/podcast/resident-episode-599-oct-29-2022/id387385712?i=1000584372194",
"598": "https://podcasts.apple.com/de/podcast/resident-episode-598-oct-22-2022/id387385712?i=1000583567411",
"597": "https://podcasts.apple.com/de/podcast/resident-episode-597-oct-15-2022/id387385712?i=1000582774194",
"596": "https://podcasts.apple.com/de/podcast/resident-episode-596-oct-08-2022/id387385712?i=1000582033685",
"595": "https://podcasts.apple.com/de/podcast/resident-episode-595-oct-01-2022/id387385712?i=1000581275346",
"594": "https://podcasts.apple.com/de/podcast/resident-episode-594-sep-24-2022/id387385712?i=1000580543309",
"593": "https://podcasts.apple.com/de/podcast/resident-episode-593-sep-17-2022/id387385712?i=1000579812349",
"592": "https://podcasts.apple.com/de/podcast/resident-episode-592-sep-10-2022/id387385712?i=1000579075534",
"591": "https://podcasts.apple.com/de/podcast/resident-episode-591-sep-03-2022/id387385712?i=1000578300137",
"590": "https://podcasts.apple.com/de/podcast/resident-episode-590-aug-27-2022/id387385712?i=1000577554922",
"589": "https://podcasts.apple.com/de/podcast/resident-episode-589-aug-20-2022/id387385712?i=1000576725407",
"588": "https://podcasts.apple.com/de/podcast/resident-episode-588-aug-13-2022/id387385712?i=1000576010010",
"587": "https://podcasts.apple.com/de/podcast/resident-episode-587-aug-06-2022/id387385712?i=1000575253900",
"586": "https://podcasts.apple.com/de/podcast/resident-episode-586-jul-30-2022/id387385712?i=1000574508794",
"585": "https://podcasts.apple.com/de/podcast/resident-episode-585-jul-23-2022/id387385712?i=1000570971901",
"584": "https://podcasts.apple.com/de/podcast/resident-episode-584-jul-16-2022/id387385712?i=1000570167687",
"583": "https://podcasts.apple.com/de/podcast/resident-episode-583-jul-09-2022/id387385712?i=1000569403275",
"582": "https://podcasts.apple.com/de/podcast/resident-episode-582-jul-02-2022/id387385712?i=1000568612311",
"581": "https://podcasts.apple.com/de/podcast/resident-episode-581-jun-25-2022/id387385712?i=1000567726804",
"580": "https://podcasts.apple.com/de/podcast/resident-episode-580-jun-18-2022/id387385712?i=1000567019904",
"579": "https://podcasts.apple.com/de/podcast/resident-episode-579-jun-11-2022/id387385712?i=1000566115742",
"578": "https://podcasts.apple.com/de/podcast/resident-episode-578-jun-04-2022/id387385712?i=1000565249816",
"577": "https://podcasts.apple.com/de/podcast/resident-episode-577-may-28-2022/id387385712?i=1000564373723",
"576": "https://podcasts.apple.com/de/podcast/resident-episode-576-may-21-2022/id387385712?i=1000563098249",
"575": "https://podcasts.apple.com/de/podcast/resident-episode-575-may-14-2022/id387385712?i=1000561411081",
"574": "https://podcasts.apple.com/de/podcast/resident-episode-574-may-07-2022/id387385712?i=1000559946366",
"573": "https://podcasts.apple.com/de/podcast/resident-episode-573-apr-30-2022/id387385712?i=1000559225031",
"572": "https://podcasts.apple.com/de/podcast/resident-episode-572-apr-23-2022/id387385712?i=1000558495525",
"571": "https://podcasts.apple.com/de/podcast/resident-episode-571-apr-16-2022/id387385712?i=1000557817013",
"570": "https://podcasts.apple.com/de/podcast/resident-episode-570-apr-09-2022/id387385712?i=1000557101755",
"569": "https://podcasts.apple.com/de/podcast/resident-episode-569-apr-02-2022/id387385712?i=1000556066959",
"568": "https://podcasts.apple.com/de/podcast/resident-episode-568-mar-26-2022/id387385712?i=1000555344537",
"567": "https://podcasts.apple.com/de/podcast/resident-episode-567-mar-19-2022/id387385712?i=1000554600802",
"566": "https://podcasts.apple.com/de/podcast/resident-episode-566-mar-12-2022/id387385712?i=1000553830789",
"565": "https://podcasts.apple.com/de/podcast/resident-episode-565-mar-05-2022/id387385712?i=1000553053392",
"564": "https://podcasts.apple.com/de/podcast/resident-episode-564-feb-26-2022/id387385712?i=1000552333496",
"563": "https://podcasts.apple.com/de/podcast/resident-episode-563-feb-19-2022/id387385712?i=1000551649332",
"562": "https://podcasts.apple.com/de/podcast/resident-episode-562-feb-12-2022/id387385712?i=1000550920677",
"561": "https://podcasts.apple.com/de/podcast/resident-episode-561-feb-05-2022/id387385712?i=1000550189175",
"560": "https://podcasts.apple.com/de/podcast/resident-episode-560-jan-29-2022/id387385712?i=1000549409004",
"559": "https://podcasts.apple.com/de/podcast/resident-episode-559-jan-22-2022/id387385712?i=1000548705178",
"558": "https://podcasts.apple.com/de/podcast/resident-episode-558-jan-15-2022/id387385712?i=1000548002672",
"557": "https://podcasts.apple.com/de/podcast/resident-episode-557-jan-08-2022/id387385712?i=1000547312785",
"556": "https://podcasts.apple.com/de/podcast/resident-episode-556-jan-01-2022/id387385712?i=1000546687318",
"555": "https://podcasts.apple.com/de/podcast/resident-episode-555-dec-25-2021/id387385712?i=1000546124341",
"554": "https://podcasts.apple.com/de/podcast/resident-episode-554-dec-18-2021/id387385712?i=1000545399167",
"553": "https://podcasts.apple.com/de/podcast/resident-episode-553-dec-11-2021/id387385712?i=1000544695493",
"552": "https://podcasts.apple.com/de/podcast/resident-episode-552-dec-04-2021/id387385712?i=1000543979424",
"551": "https://podcasts.apple.com/de/podcast/resident-episode-551-nov-27-2021/id387385712?i=1000543253976",
"550": "https://podcasts.apple.com/de/podcast/resident-episode-550-nov-20-2021/id387385712?i=1000542590713",
"549": "https://podcasts.apple.com/de/podcast/resident-episode-549-nov-13-2021/id387385712?i=1000541722960",
"548": "https://podcasts.apple.com/de/podcast/resident-episode-548-nov-06-2021/id387385712?i=1000540999747",
"547": "https://podcasts.apple.com/de/podcast/resident-episode-547-oct-30-2021/id387385712?i=1000540258838",
"546": "https://podcasts.apple.com/de/podcast/resident-episode-546-oct-23-2021/id387385712?i=1000539517957",
"545": "https://podcasts.apple.com/de/podcast/resident-episode-545-oct-16-2021/id387385712?i=1000538808642",
"544": "https://podcasts.apple.com/de/podcast/resident-episode-544-oct-09-2021/id387385712?i=1000538094294",
"543": "https://podcasts.apple.com/de/podcast/resident-episode-543-oct-02-2021/id387385712?i=1000537360711",
"542": "https://podcasts.apple.com/de/podcast/resident-episode-542-sep-25-2021/id387385712?i=1000536626484",
"541": "https://podcasts.apple.com/de/podcast/resident-episode-541-sep-18-2021/id387385712?i=1000535890980",
"540": "https://podcasts.apple.com/de/podcast/resident-episode-540-sep-11-2021/id387385712?i=1000535049449",
"539": "https://podcasts.apple.com/de/podcast/resident-episode-539-sep-04-2021/id387385712?i=1000534339276",
"538": "https://podcasts.apple.com/de/podcast/resident-episode-538-ago-28-2021/id387385712?i=1000533427718",
"537": "https://podcasts.apple.com/de/podcast/resident-episode-537-ago-21-2021/id387385712?i=1000532702845",
"536": "https://podcasts.apple.com/de/podcast/resident-episode-536-ago-14-2021/id387385712?i=1000532041259",
"535": "https://podcasts.apple.com/de/podcast/resident-episode-535-ago-07-2021/id387385712?i=1000531360211",
"534": "https://podcasts.apple.com/de/podcast/resident-episode-534-jul-31-2021/id387385712?i=1000530634203",
"533": "https://podcasts.apple.com/de/podcast/resident-episode-533-jul-24-2021/id387385712?i=1000529936052",
"532": "https://podcasts.apple.com/de/podcast/resident-episode-532-jul-17-2021/id387385712?i=1000529206782",
"531": "https://podcasts.apple.com/de/podcast/resident-episode-531-jul-10-2021/id387385712?i=1000528497635",
"530": "https://podcasts.apple.com/de/podcast/resident-episode-530-jul-03-2021/id387385712?i=1000527764681",
"529": "https://podcasts.apple.com/de/podcast/resident-episode-529-jun-26-2021/id387385712?i=1000526993231",
"528": "https://podcasts.apple.com/de/podcast/resident-episode-528-jun-19-2021/id387385712?i=1000526151524",
"527": "https://podcasts.apple.com/de/podcast/resident-episode-527-jun-12-2021/id387385712?i=1000525315413",
"526": "https://podcasts.apple.com/de/podcast/resident-episode-526-jun-05-2021/id387385712?i=1000524373504",
"525": "https://podcasts.apple.com/de/podcast/resident-episode-525-may-29-2021/id387385712?i=1000523535038",
"524": "https://podcasts.apple.com/de/podcast/resident-episode-524-may-22-2021/id387385712?i=1000522794005",
"523": "https://podcasts.apple.com/de/podcast/resident-episode-523-may-15-2021/id387385712?i=1000521883016",
"522": "https://podcasts.apple.com/de/podcast/resident-episode-522-may-08-2021/id387385712?i=1000520902283",
"521": "https://podcasts.apple.com/de/podcast/resident-episode-521-may-01-2021/id387385712?i=1000519676916",
"520": "https://podcasts.apple.com/de/podcast/resident-episode-520-apr-24-2021/id387385712?i=1000518504802",
"519": "https://podcasts.apple.com/de/podcast/resident-episode-519-apr-17-2021/id387385712?i=1000517589524",
"518": "https://podcasts.apple.com/de/podcast/resident-episode-518-apr-10-2021/id387385712?i=1000516627057",
"517": "https://podcasts.apple.com/de/podcast/resident-episode-517-apr-03-2021/id387385712?i=1000515670885",
"516": "https://podcasts.apple.com/de/podcast/resident-episode-516-mar-27-2021/id387385712?i=1000514700833",
"515": "https://podcasts.apple.com/de/podcast/resident-episode-515-mar-13-2021/id387385712?i=1000513818660",
"514": "https://podcasts.apple.com/de/podcast/resident-episode-514-mar-13-2021/id387385712?i=1000512886379",
"513": "https://podcasts.apple.com/de/podcast/resident-episode-513-mar-06-2021/id387385712?i=1000511927012",
"512": "https://podcasts.apple.com/de/podcast/resident-episode-512-feb-27-2021/id387385712?i=1000510974024",
"511": "https://podcasts.apple.com/de/podcast/resident-episode-511-feb-20-2021/id387385712?i=1000510005524",
"510": "https://podcasts.apple.com/de/podcast/resident-episode-510-feb-13-2021/id387385712?i=1000508930552",
"509": "https://podcasts.apple.com/de/podcast/resident-episode-509-feb-06-2021/id387385712?i=1000508035647",
"508": "https://podcasts.apple.com/de/podcast/resident-episode-508-jan-30-2021/id387385712?i=1000507144564",
"507": "https://podcasts.apple.com/de/podcast/resident-episode-507-jan-23-2021/id387385712?i=1000506341867",
"506": "https://podcasts.apple.com/de/podcast/resident-episode-506-jan-16-2021/id387385712?i=1000505524533",
"505": "https://podcasts.apple.com/de/podcast/resident-episode-505-jan-07-2021/id387385712?i=1000504846165",
"504": "https://podcasts.apple.com/de/podcast/resident-episode-504-jan-02-2021/id387385712?i=1000504166809",
"503": "https://podcasts.apple.com/de/podcast/resident-episode-503-dec-26-2020/id387385712?i=1000503589310",
"502": "https://podcasts.apple.com/de/podcast/resident-episode-502-sunsetstream-eclipse-edition-dec/id387385712?i=1000502967387",
"501": "https://podcasts.apple.com/de/podcast/resident-episode-501-dec-12-2020/id387385712?i=1000502214555",
"500": "https://podcasts.apple.com/de/podcast/resident-episode-500-dec-05-2020/id387385712?i=1000501474077",
"499": "https://podcasts.apple.com/de/podcast/resident-episode-499-nov-28-2020/id387385712?i=1000500656269",
"498": "https://podcasts.apple.com/de/podcast/resident-episode-498-nov-21-2020/id387385712?i=1000499765945",
"497": "https://podcasts.apple.com/de/podcast/resident-episode-497-nov-14-2020/id387385712?i=1000498648839",
"496": "https://podcasts.apple.com/de/podcast/resident-episode-496-nov-07-2020/id387385712?i=1000497628902",
"495": "https://podcasts.apple.com/de/podcast/resident-episode-495-oct-31-2020/id387385712?i=1000496785912",
"494": "https://podcasts.apple.com/de/podcast/resident-episode-494-oct-24-2020/id387385712?i=1000495971492",
"493": "https://podcasts.apple.com/de/podcast/resident-episode-493-oct-17-2020/id387385712?i=1000495139851",
"492": "https://podcasts.apple.com/de/podcast/resident-episode-492-oct-10-2020/id387385712?i=1000494318469",
"491": "https://podcasts.apple.com/de/podcast/resident-episode-491-oct-03-2020/id387385712?i=1000493504968",
"490": "https://podcasts.apple.com/de/podcast/resident-episode-490-sep-26-2020/id387385712?i=1000492669595",
"489": "https://podcasts.apple.com/de/podcast/resident-episode-489-sep-19-2020/id387385712?i=1000491851263",
"488": "https://podcasts.apple.com/de/podcast/resident-episode-488-sep-12-2020/id387385712?i=1000491068728",
"487": "https://podcasts.apple.com/de/podcast/resident-episode-487-sep-05-2020/id387385712?i=1000490229443",
"486": "https://podcasts.apple.com/de/podcast/resident-episode-486-aug-29-2020/id387385712?i=1000489531004",
"485": "https://podcasts.apple.com/de/podcast/resident-episode-485-aug-22-2020/id387385712?i=1000488903598",
"484": "https://podcasts.apple.com/de/podcast/resident-episode-484-aug-15-2020/id387385712?i=1000488260529",
"483": "https://podcasts.apple.com/de/podcast/resident-episode-483-aug-08-2020/id387385712?i=1000487559269",
"482": "https://podcasts.apple.com/de/podcast/resident-episode-482-aug-01-2020/id387385712?i=1000486845938",
"481": "https://podcasts.apple.com/de/podcast/resident-episode-481-jul-25-2020/id387385712?i=1000486146760",
"480": "https://podcasts.apple.com/de/podcast/resident-episode-480-jul-18-2020/id387385712?i=1000485399892",
"479": "https://podcasts.apple.com/de/podcast/resident-episode-479-jul-11-2020/id387385712?i=1000484382995",
"478": "https://podcasts.apple.com/de/podcast/resident-episode-478-jul-04-2020/id387385712?i=1000482645516",
"477": "https://podcasts.apple.com/de/podcast/resident-episode-477-jun-27-2020/id387385712?i=1000479975086",
"476": "https://podcasts.apple.com/de/podcast/resident-episode-476-jun-20-2020/id387385712?i=1000478897884",
"475": "https://podcasts.apple.com/de/podcast/resident-episode-475-jun-13-2020/id387385712?i=1000477899058",
"474": "https://podcasts.apple.com/de/podcast/resident-episode-474-jun-06-2020/id387385712?i=1000477054352",
"473": "https://podcasts.apple.com/de/podcast/resident-episode-473-may-30-2020/id387385712?i=1000476309238",
"472": "https://podcasts.apple.com/de/podcast/resident-episode-472-may-23-2020/id387385712?i=1000475554492",
"471": "https://podcasts.apple.com/de/podcast/resident-episode-471-may-16-2020/id387385712?i=1000474856927",
"470": "https://podcasts.apple.com/de/podcast/resident-episode-470-may-09-2020/id387385712?i=1000474125845",
"469": "https://podcasts.apple.com/de/podcast/resident-episode-469-may-02-2020/id387385712?i=1000473409672",
"468": "https://podcasts.apple.com/de/podcast/resident-episode-468-apr-25-2020/id387385712?i=1000472665235",
"467": "https://podcasts.apple.com/de/podcast/resident-episode-467-apr-18-2020/id387385712?i=1000471927410",
"466": "https://podcasts.apple.com/de/podcast/resident-episode-466-apr-11-2020/id387385712?i=1000471218788",
"465": "https://podcasts.apple.com/de/podcast/resident-episode-465-apr-04-2020/id387385712?i=1000470537811",
"464": "https://podcasts.apple.com/de/podcast/resident-episode-464-mar-28-2020/id387385712?i=1000469847289",
"463": "https://podcasts.apple.com/de/podcast/resident-episode-463-mar-21-2020/id387385712?i=1000469119605",
"462": "https://podcasts.apple.com/de/podcast/resident-episode-462-mar-14-2020/id387385712?i=1000468441589",
"461": "https://podcasts.apple.com/de/podcast/resident-episode-461-mar-07-2020/id387385712?i=1000467763732",
"460": "https://podcasts.apple.com/de/podcast/resident-episode-460-feb-29-2020/id387385712?i=1000467101823",
"459": "https://podcasts.apple.com/de/podcast/resident-episode-459-feb-22-2020/id387385712?i=1000466404295",
"458": "https://podcasts.apple.com/de/podcast/resident-episode-458-feb-15-2020/id387385712?i=1000465732896",
"457": "https://podcasts.apple.com/de/podcast/resident-episode-457-feb-08-2020/id387385712?i=1000465041405",
"456": "https://podcasts.apple.com/de/podcast/resident-episode-456-feb-01-2020/id387385712?i=1000464360992",
"455": "https://podcasts.apple.com/de/podcast/resident-episode-455-jan-25-2020/id387385712?i=1000463681941",
"454": "https://podcasts.apple.com/de/podcast/resident-episode-454-jan-18-2020/id387385712?i=1000463034191",
"453": "https://podcasts.apple.com/de/podcast/resident-episode-453-jan-11-2020/id387385712?i=1000462242608",
"452": "https://podcasts.apple.com/de/podcast/resident-episode-452-jan-04-2020/id387385712?i=1000461584683",
"451": "https://podcasts.apple.com/de/podcast/resident-episode-451-dec-28-2019/id387385712?i=1000461016778",
"450": "https://podcasts.apple.com/de/podcast/resident-episode-450-dec-21-2019/id387385712?i=1000460438516",
"449": "https://podcasts.apple.com/de/podcast/resident-episode-449-dec-14-2019/id387385712?i=1000459635432",
"448": "https://podcasts.apple.com/de/podcast/resident-episode-448-dec-07-2019/id387385712?i=1000458975381",
"447": "https://podcasts.apple.com/de/podcast/resident-episode-447-nov-30-2019/id387385712?i=1000458315318",
"446": "https://podcasts.apple.com/de/podcast/resident-episode-446-nov-23-2019/id387385712?i=1000457690298",
"445": "https://podcasts.apple.com/de/podcast/resident-episode-445-nov-16-2019/id387385712?i=1000457017436",
"444": "https://podcasts.apple.com/de/podcast/resident-episode-444-nov-09-2019/id387385712?i=1000456354989",
"443": "https://podcasts.apple.com/de/podcast/resident-episode-443-nov-02-2019/id387385712?i=1000455794039",
"442": "https://podcasts.apple.com/de/podcast/resident-episode-442-oct-26-2019/id387385712?i=1000455095120",
"441": "https://podcasts.apple.com/de/podcast/resident-episode-441-oct-19-2019/id387385712?i=1000454158077",
"440": "https://podcasts.apple.com/de/podcast/resident-episode-440-oct-12-2019/id387385712?i=1000453302051",
"439": "https://podcasts.apple.com/de/podcast/resident-episode-439-oct-05-2019/id387385712?i=1000452491741",
"438": "https://podcasts.apple.com/de/podcast/resident-episode-438-sep-28-2019/id387385712?i=1000451616761",
"437": "https://podcasts.apple.com/de/podcast/resident-episode-437-sep-21-2019/id387385712?i=1000450671031",
"436": "https://podcasts.apple.com/de/podcast/resident-episode-436-sep-14-2019/id387385712?i=1000449826514",
"435": "https://podcasts.apple.com/de/podcast/resident-episode-435-sep-07-2019/id387385712?i=1000448973455",
"434": "https://podcasts.apple.com/de/podcast/resident-episode-434-aug-31-2019/id387385712?i=1000448276821",
"433": "https://podcasts.apple.com/de/podcast/resident-episode-433-aug-24-2019/id387385712?i=1000447732624",
"432": "https://podcasts.apple.com/de/podcast/resident-episode-432-aug-17-2019/id387385712?i=1000447147687",
"431": "https://podcasts.apple.com/de/podcast/resident-episode-431-aug-10-2019/id387385712?i=1000446620258",
"430": "https://podcasts.apple.com/de/podcast/resident-episode-430-aug-03-2019/id387385712?i=1000446080570",
"429": "https://podcasts.apple.com/de/podcast/resident-episode-429-jul-27-2019/id387385712?i=1000445470600",
"428": "https://podcasts.apple.com/de/podcast/resident-episode-428-jul-20-2019/id387385712?i=1000444948560",
"427": "https://podcasts.apple.com/de/podcast/resident-episode-427-jul-13-2019/id387385712?i=1000444407203",
"426": "https://podcasts.apple.com/de/podcast/resident-episode-426-jul-06-2019/id387385712?i=1000443829468",
"425": "https://podcasts.apple.com/de/podcast/resident-episode-425-jun-29-2019/id387385712?i=1000443204981",
"424": "https://podcasts.apple.com/de/podcast/resident-episode-424-jun-22-2019/id387385712?i=1000442428876",
"423": "https://podcasts.apple.com/de/podcast/resident-episode-423-jun-15-2019/id387385712?i=1000441656471",
"422": "https://podcasts.apple.com/de/podcast/resident-episode-422-jun-08-2019/id387385712?i=1000440960083",
"421": "https://podcasts.apple.com/de/podcast/resident-episode-421-jun-01-2019/id387385712?i=1000440337754",
"420": "https://podcasts.apple.com/de/podcast/resident-episode-420-may-25-2019/id387385712?i=1000439345369",
"419": "https://podcasts.apple.com/de/podcast/resident-episode-419-may-18-2019/id387385712?i=1000438767933",
"418": "https://podcasts.apple.com/de/podcast/resident-episode-418-may-11-2019/id387385712?i=1000437862439",
"417": "https://podcasts.apple.com/de/podcast/resident-episode-417-may-04-2019/id387385712?i=1000437235139",
"416": "https://podcasts.apple.com/de/podcast/resident-episode-416-apr-27-2019/id387385712?i=1000436702014",
"415": "https://podcasts.apple.com/de/podcast/resident-episode-415-apr-20-2019/id387385712?i=1000435845091",
"414": "https://podcasts.apple.com/de/podcast/resident-episode-414-apr-13-2019/id387385712?i=1000434871197",
"413": "https://podcasts.apple.com/de/podcast/resident-episode-413-apr-06-2019/id387385712?i=1000434321841",
"412": "https://podcasts.apple.com/de/podcast/resident-episode-412-mar-30-2019/id387385712?i=1000433806390",
"411": "https://podcasts.apple.com/de/podcast/resident-episode-411-mar-23-2019/id387385712?i=1000433118579",
"410": "https://podcasts.apple.com/de/podcast/resident-episode-410-mar-16-2019/id387385712?i=1000432020072",
"409": "https://podcasts.apple.com/de/podcast/resident-episode-409-mar-09-2019/id387385712?i=1000431454230",
"408": "https://podcasts.apple.com/de/podcast/resident-episode-408-mar-02-2019/id387385712?i=1000430960660",
"407": "https://podcasts.apple.com/de/podcast/resident-episode-407-feb-23-2019/id387385712?i=1000430490874",
"406": "https://podcasts.apple.com/de/podcast/resident-episode-406-feb-16-2019/id387385712?i=1000430023911",
"405": "https://podcasts.apple.com/de/podcast/resident-episode-405-feb-09-2019/id387385712?i=1000429550000",
"404": "https://podcasts.apple.com/de/podcast/resident-episode-404-feb-02-2019/id387385712?i=1000429059901",
"403": "https://podcasts.apple.com/de/podcast/resident-episode-403-jan-26-2019/id387385712?i=1000428538866",
"402": "https://podcasts.apple.com/de/podcast/resident-episode-402-jan-19-2019/id387385712?i=1000428018821",
"401": "https://podcasts.apple.com/de/podcast/resident-episode-401-jan-12-2019/id387385712?i=1000427539831",
"400": "https://podcasts.apple.com/de/podcast/resident-episode-400-jan-05-2019/id387385712?i=1000427090381",
"399": "https://podcasts.apple.com/de/podcast/resident-episode-399-dec-29-2018/id387385712?i=1000426702845",
"398": "https://podcasts.apple.com/de/podcast/resident-episode-398-dec-22-2018/id387385712?i=1000426358543",
"397": "https://podcasts.apple.com/de/podcast/resident-episode-397-dec-15-2018/id387385712?i=1000425880802",
"396": "https://podcasts.apple.com/de/podcast/resident-episode-396-dec-08-2018/id387385712?i=1000425427309",
"395": "https://podcasts.apple.com/de/podcast/resident-episode-395-dec-01-2018/id387385712?i=1000424952240",
"394": "https://podcasts.apple.com/de/podcast/resident-episode-394-nov-24-2018/id387385712?i=1000424501216",
"393": "https://podcasts.apple.com/de/podcast/resident-episode-393-nov-17-2018/id387385712?i=1000424063665",
"392": "https://podcasts.apple.com/de/podcast/resident-episode-392-nov-10-2018/id387385712?i=1000423606629",
"391": "https://podcasts.apple.com/de/podcast/resident-episode-391-nov-03-2018/id387385712?i=1000423161823",
"390": "https://podcasts.apple.com/de/podcast/resident-episode-390-oct-27-2018/id387385712?i=1000422713171",
"389": "https://podcasts.apple.com/de/podcast/resident-episode-389-oct-20-2018/id387385712?i=1000422259480",
"388": "https://podcasts.apple.com/de/podcast/resident-episode-388-oct-13-2018/id387385712?i=1000421772763",
"387": "https://podcasts.apple.com/de/podcast/resident-episode-387-oct-06-2018/id387385712?i=1000421253776",
"386": "https://podcasts.apple.com/de/podcast/resident-episode-386-sep-29-2018/id387385712?i=1000420736142",
"385": "https://podcasts.apple.com/de/podcast/resident-episode-385-sep-22-2018/id387385712?i=1000420269295",
"384": "https://podcasts.apple.com/de/podcast/resident-episode-384-sep-15-2018/id387385712?i=1000419854826",
"383": "https://podcasts.apple.com/de/podcast/resident-episode-383-sep-09-2018/id387385712?i=1000419388520",
"382": "https://podcasts.apple.com/de/podcast/resident-episode-382-sep-01-2018/id387385712?i=1000418989133",
"381": "https://podcasts.apple.com/de/podcast/resident-episode-381-aug-25-2018/id387385712?i=1000418515345",
"380": "https://podcasts.apple.com/de/podcast/resident-episode-380-aug-18-2018/id387385712?i=1000418116868",
"379": "https://podcasts.apple.com/de/podcast/resident-episode-379-aug-11-2018/id387385712?i=1000417661655",
"378": "https://podcasts.apple.com/de/podcast/resident-episode-378-aug-04-2018/id387385712?i=1000417223227",
"377": "https://podcasts.apple.com/de/podcast/resident-episode-377-jul-28-2018/id387385712?i=1000416803945",
"376": "https://podcasts.apple.com/de/podcast/resident-episode-376-jul-21-2018/id387385712?i=1000416342379",
"375": "https://podcasts.apple.com/de/podcast/resident-episode-375-jul-14-2018/id387385712?i=1000415851440",
"374": "https://podcasts.apple.com/de/podcast/resident-episode-374-jul-07-2018/id387385712?i=1000415409144",
"373": "https://podcasts.apple.com/de/podcast/resident-episode-373-jun-30-2018/id387385712?i=1000414995450",
"372": "https://podcasts.apple.com/de/podcast/resident-episode-372-jun-23-2018/id387385712?i=1000414501468",
"371": "https://podcasts.apple.com/de/podcast/resident-episode-371-jun-16-2018/id387385712?i=1000413958786",
"370": "https://podcasts.apple.com/de/podcast/resident-episode-370-jun-09-2018/id387385712?i=1000413379994",
"369": "https://podcasts.apple.com/de/podcast/resident-episode-369-jun-02-2018/id387385712?i=1000412898617",
"368": "https://podcasts.apple.com/de/podcast/resident-episode-368-may-26-2018/id387385712?i=1000412350262",
"367": "https://podcasts.apple.com/de/podcast/resident-episode-367-may-19-2018/id387385712?i=1000411913125",
"366": "https://podcasts.apple.com/de/podcast/resident-episode-366-may-12-2018/id387385712?i=1000411270181",
"365": "https://podcasts.apple.com/de/podcast/resident-episode-365-may-05-2018/id387385712?i=1000410781012",
"364": "https://podcasts.apple.com/de/podcast/resident-episode-364-apr-28-2018/id387385712?i=1000410170212",
"363": "https://podcasts.apple.com/de/podcast/resident-episode-363-apr-21-2018/id387385712?i=1000409512427",
"362": "https://podcasts.apple.com/de/podcast/resident-episode-362-apr-14-2018/id387385712?i=1000408915354",
"361": "https://podcasts.apple.com/de/podcast/resident-episode-361-apr-07-2018/id387385712?i=1000408407092",
"360": "https://podcasts.apple.com/de/podcast/resident-episode-360-mar-31-2018/id387385712?i=1000407908804",
"359": "https://podcasts.apple.com/de/podcast/resident-episode-359-mar-24-2018/id387385712?i=1000407399514",
"358": "https://podcasts.apple.com/de/podcast/resident-episode-358-mar-17-2018/id387385712?i=1000406674922",
"357": "https://podcasts.apple.com/de/podcast/resident-episode-357-mar-10-2018/id387385712?i=1000405817750",
"356": "https://podcasts.apple.com/de/podcast/resident-episode-356-mar-03-2018/id387385712?i=1000404720658",
"355": "https://podcasts.apple.com/de/podcast/resident-episode-355-feb-24-2018/id387385712?i=1000403647162",
"354": "https://podcasts.apple.com/de/podcast/resident-episode-354-feb-17-2018/id387385712?i=1000402768137",
"353": "https://podcasts.apple.com/de/podcast/resident-episode-353-feb-10-2018/id387385712?i=1000401959092",
"352": "https://podcasts.apple.com/de/podcast/resident-episode-352-feb-03-2018/id387385712?i=1000401403436",
"351": "https://podcasts.apple.com/de/podcast/resident-episode-351-jan-27-2018/id387385712?i=1000400856785",
"350": "https://podcasts.apple.com/de/podcast/resident-episode-350-jan-20-2018/id387385712?i=1000400321685",
"349": "https://podcasts.apple.com/de/podcast/resident-episode-349-jan-13-2018/id387385712?i=1000399789622",
"348": "https://podcasts.apple.com/de/podcast/resident-episode-348-jan-06-2018/id387385712?i=1000399240933",
"347": "https://podcasts.apple.com/de/podcast/resident-episode-347-dec-30-2017/id387385712?i=1000398757239",
"346": "https://podcasts.apple.com/de/podcast/resident-episode-346-xmas-special-dec-23-2017/id387385712?i=1000398218412",
"345": "https://podcasts.apple.com/de/podcast/resident-episode-345-dec-16-2017/id387385712?i=1000397541373",
"344": "https://podcasts.apple.com/de/podcast/resident-episode-344-dec-09-2017/id387385712?i=1000396918060",
"343": "https://podcasts.apple.com/de/podcast/resident-episode-343-dec-02-2017/id387385712?i=1000395544567",
"342": "https://podcasts.apple.com/de/podcast/resident-episode-342-nov-25-2017/id387385712?i=1000395259421",
"341": "https://podcasts.apple.com/de/podcast/resident-episode-341-nov-18-2017/id387385712?i=1000394982517",
"340": "https://podcasts.apple.com/de/podcast/resident-episode-340-nov-11-2017/id387385712?i=1000394692395",
"339": "https://podcasts.apple.com/de/podcast/resident-episode-339-nov-04-2017/id387385712?i=1000394418059",
"338": "https://podcasts.apple.com/de/podcast/resident-episode-338-oct-28-2017/id387385712?i=1000394130721",
"337": "https://podcasts.apple.com/de/podcast/resident-episode-337-oct-21-2017/id387385712?i=1000393829417",
"336": "https://podcasts.apple.com/de/podcast/resident-episode-336-oct-14-2017/id387385712?i=1000393527799",
"335": "https://podcasts.apple.com/de/podcast/resident-episode-335-oct-07-2017/id387385712?i=1000393196265",
"334": "https://podcasts.apple.com/de/podcast/resident-episode-334-sep-30-2017/id387385712?i=1000392920394",
"333": "https://podcasts.apple.com/de/podcast/resident-episode-333-sep-23-2017/id387385712?i=1000392627182",
"332": "https://podcasts.apple.com/de/podcast/resident-episode-332-sep-16-2017/id387385712?i=1000392334908",
"331": "https://podcasts.apple.com/de/podcast/resident-episode-331-sep-09-2017/id387385712?i=1000392046959",
"330": "https://podcasts.apple.com/de/podcast/resident-episode-330-sep-02-2017/id387385712?i=1000391772444",
"329": "https://podcasts.apple.com/de/podcast/resident-episode-329-aug-26-2017/id387385712?i=1000391498686",
"328": "https://podcasts.apple.com/de/podcast/resident-episode-328-aug-19-2017/id387385712?i=1000391238118",
"327": "https://podcasts.apple.com/de/podcast/resident-episode-327-aug-12-2017/id387385712?i=1000390971232",
"326": "https://podcasts.apple.com/de/podcast/resident-episode-326-aug-05-2017/id387385712?i=1000390704426",
"325": "https://podcasts.apple.com/de/podcast/resident-episode-325-jul-29-2017/id387385712?i=1000390449943",
"324": "https://podcasts.apple.com/de/podcast/resident-episode-324-jul-22-2017/id387385712?i=1000390194385",
"323": "https://podcasts.apple.com/de/podcast/resident-episode-323-jul-15-2017/id387385712?i=1000389934441",
"322": "https://podcasts.apple.com/de/podcast/resident-episode-322-jul-08-2017/id387385712?i=1000389677410",
"321": "https://podcasts.apple.com/de/podcast/resident-episode-321-jul-01-2017/id387385712?i=1000389430984",
"320": "https://podcasts.apple.com/de/podcast/resident-episode-320-jun-24-2017/id387385712?i=1000389052361",
"319": "https://podcasts.apple.com/de/podcast/resident-episode-319-jun-17-2017/id387385712?i=1000386676871",
"318": "https://podcasts.apple.com/de/podcast/resident-episode-318-jun-10-2017/id387385712?i=1000386390949",
"317": "https://podcasts.apple.com/de/podcast/resident-episode-317-jun-03-2017/id387385712?i=1000386130053",
"316": "https://podcasts.apple.com/de/podcast/resident-episode-316-may-27-2017/id387385712?i=1000385885273",
"315": "https://podcasts.apple.com/de/podcast/resident-episode-315-may-20-2017/id387385712?i=1000385642450",
"314": "https://podcasts.apple.com/de/podcast/resident-episode-314-may-13-2017/id387385712?i=1000385408987",
"313": "https://podcasts.apple.com/de/podcast/resident-episode-313-may-06-2017/id387385712?i=1000385175006",
"312": "https://podcasts.apple.com/de/podcast/resident-episode-312-apr-29-2017/id387385712?i=1000384922325",
"311": "https://podcasts.apple.com/de/podcast/resident-episode-311-apr-22-2017/id387385712?i=1000384679163",
"310": "https://podcasts.apple.com/de/podcast/resident-episode-310-apr-15-2017/id387385712?i=1000384433861",
"309": "https://podcasts.apple.com/de/podcast/resident-episode-309-apr-08-2017/id387385712?i=1000384168008",
"308": "https://podcasts.apple.com/de/podcast/resident-episode-308-apr-01-2017/id387385712?i=1000383491175",
"307": "https://podcasts.apple.com/de/podcast/resident-episode-307-mar-25-2017/id387385712?i=1000383128777",
"306": "https://podcasts.apple.com/de/podcast/resident-episode-306-mar-18-2017/id387385712?i=1000382804883",
"305": "https://podcasts.apple.com/de/podcast/resident-episode-305-mar-11-2017/id387385712?i=1000382507339",
"304": "https://podcasts.apple.com/de/podcast/resident-episode-304-mar-04-2017/id387385712?i=1000382198287",
"303": "https://podcasts.apple.com/de/podcast/resident-episode-303-feb-25-2017/id387385712?i=1000381894429",
"302": "https://podcasts.apple.com/de/podcast/resident-episode-302-feb-18-2017/id387385712?i=1000381390301",
"301": "https://podcasts.apple.com/de/podcast/resident-episode-301-feb-11-2017/id387385712?i=1000381100449",
"300": "https://podcasts.apple.com/de/podcast/resident-episode-300-feb-04-2017-balance-sudbeat-exclusive/id387385712?i=1000380832971",
"299": "https://podcasts.apple.com/de/podcast/resident-episode-299-jan-28-2017/id387385712?i=1000380544819",
"298": "https://podcasts.apple.com/de/podcast/resident-episode-298-jan-21-2017/id387385712?i=1000380271040",
"297": "https://podcasts.apple.com/de/podcast/resident-episode-297-jan-14-2017/id387385712?i=1000379998844",
"296": "https://podcasts.apple.com/de/podcast/resident-episode-296-jan-07-2017/id387385712?i=1000379728601",
"295": "https://podcasts.apple.com/de/podcast/resident-episode-295-dec-31-2016/id387385712?i=1000379497471",
"294": "https://podcasts.apple.com/de/podcast/resident-episode-294-dec-24-2016-christmas-special/id387385712?i=1000379318300",
"293": "https://podcasts.apple.com/de/podcast/resident-episode-293-dec-17-2016/id387385712?i=1000379085686",
"292": "https://podcasts.apple.com/de/podcast/resident-episode-292-dec-10-2016/id387385712?i=1000378820670",
"291": "https://podcasts.apple.com/de/podcast/resident-episode-291-dec-03-2016/id387385712?i=1000378558809",
"290": "https://podcasts.apple.com/de/podcast/resident-episode-290-nov-26-2016/id387385712?i=1000378303851",
"289": "https://podcasts.apple.com/de/podcast/resident-episode-289-nov-19-2016/id387385712?i=1000378092454",
"288": "https://podcasts.apple.com/de/podcast/resident-episode-288-nov-12-2016/id387385712?i=1000377782022",
"287": "https://podcasts.apple.com/de/podcast/resident-episode-287-nov-05-2016/id387385712?i=1000377538538",
"286": "https://podcasts.apple.com/de/podcast/resident-episode-286-oct-29-2016/id387385712?i=1000377286368",
"285": "https://podcasts.apple.com/de/podcast/resident-episode-285-oct-22-2016/id387385712?i=1000377032431",
"284": "https://podcasts.apple.com/de/podcast/resident-episode-284-oct-15-2016/id387385712?i=1000376734463",
"283": "https://podcasts.apple.com/de/podcast/resident-episode-283-oct-08-2016/id387385712?i=1000376409140",
"282": "https://podcasts.apple.com/de/podcast/resident-episode-282-oct-01-2016/id387385712?i=1000376095846",
"281": "https://podcasts.apple.com/de/podcast/resident-episode-281-sep-24-2016/id387385712?i=1000375770720",
"280": "https://podcasts.apple.com/de/podcast/resident-episode-280-sep-17-2016/id387385712?i=1000375439577",
"279": "https://podcasts.apple.com/de/podcast/resident-episode-279-sep-10-2016/id387385712?i=1000375167268",
"278": "https://podcasts.apple.com/de/podcast/resident-episode-278-sep-03-2016/id387385712?i=1000374901967",
"277": "https://podcasts.apple.com/de/podcast/resident-episode-277-aug-27-2016/id387385712?i=1000374702296",
"276": "https://podcasts.apple.com/de/podcast/resident-episode-276-aug-20-2016/id387385712?i=1000374397897",
"275": "https://podcasts.apple.com/de/podcast/resident-episode-275-aug-13-2016/id387385712?i=1000374127216",
"274": "https://podcasts.apple.com/de/podcast/resident-episode-274-aug-06-2016/id387385712?i=1000373839800",
"273": "https://podcasts.apple.com/de/podcast/resident-episode-273-jul-30-2016/id387385712?i=1000373504295",
"272": "https://podcasts.apple.com/de/podcast/resident-episode-272-jul-23-2016/id387385712?i=1000373027466",
"271": "https://podcasts.apple.com/de/podcast/resident-episode-271-jul-16-2016/id387385712?i=1000372636988",
"270": "https://podcasts.apple.com/de/podcast/resident-episode-270-jul-09-2016/id387385712?i=1000372237831",
"269": "https://podcasts.apple.com/de/podcast/resident-episode-269-jul-02-2016/id387385712?i=1000371844540",
"268": "https://podcasts.apple.com/de/podcast/resident-episode-268-jun-25-2016/id387385712?i=1000371435101",
"267": "https://podcasts.apple.com/de/podcast/resident-episode-267-jun-18-2016/id387385712?i=1000370998412",
"266": "https://podcasts.apple.com/de/podcast/resident-episode-266-jun-11-2016/id387385712?i=1000370546352",
"265": "https://podcasts.apple.com/de/podcast/resident-episode-265-jun-04-2016/id387385712?i=1000370072432",
"264": "https://podcasts.apple.com/de/podcast/resident-episode-264-may-28-2016/id387385712?i=1000369602259",
"263": "https://podcasts.apple.com/de/podcast/resident-episode-263-may-21-2016/id387385712?i=1000369148338",
"262": "https://podcasts.apple.com/de/podcast/resident-episode-262-may-14-2016/id387385712?i=1000368735985",
"261": "https://podcasts.apple.com/de/podcast/resident-episode-261-may-07-2016/id387385712?i=1000368262583",
"260": "https://podcasts.apple.com/de/podcast/resident-episode-260-apr-30-2016/id387385712?i=1000367845777",
"259": "https://podcasts.apple.com/de/podcast/resident-episode-259-apr-23-2016/id387385712?i=1000367424013",
"258": "https://podcasts.apple.com/de/podcast/resident-episode-258-apr-16-2016/id387385712?i=1000366984014",
"257": "https://podcasts.apple.com/de/podcast/resident-episode-257-apr-09-2016/id387385712?i=1000366549831",
"256": "https://podcasts.apple.com/de/podcast/resident-episode-256-apr-02-2016/id387385712?i=1000366100754",
"255": "https://podcasts.apple.com/de/podcast/resident-episode-255-mar-26-2016/id387385712?i=1000365659475",
"254": "https://podcasts.apple.com/de/podcast/resident-episode-254-mar-19-2016/id387385712?i=1000365137979",
"253": "https://podcasts.apple.com/de/podcast/resident-episode-253-mar-13-2016/id387385712?i=1000364713581",
"252": "https://podcasts.apple.com/de/podcast/resident-episode-252-mar-05-2016/id387385712?i=1000364324717",
"251": "https://podcasts.apple.com/de/podcast/resident-episode-251-feb-27-2016/id387385712?i=1000363857801",
"250": "https://podcasts.apple.com/de/podcast/resident-episode-250-feb-20-2016/id387385712?i=1000363374025",
"249": "https://podcasts.apple.com/de/podcast/resident-episode-249-feb-13-2016/id387385712?i=1000362924454",
"248": "https://podcasts.apple.com/de/podcast/resident-episode-248-feb-06-2016/id387385712?i=1000362355780",
"247": "https://podcasts.apple.com/de/podcast/resident-episode-247-jan-30-2016/id387385712?i=1000361678063",
"246": "https://podcasts.apple.com/de/podcast/resident-episode-246-jan-23-2016/id387385712?i=1000361259597",
"245": "https://podcasts.apple.com/de/podcast/resident-episode-245-jan-16-2016/id387385712?i=1000360836760",
"244": "https://podcasts.apple.com/de/podcast/resident-episode-244-jan-09-2016/id387385712?i=1000360426495",
"243": "https://podcasts.apple.com/de/podcast/resident-episode-243-jan-02-2016/id387385712?i=1000360010852",
"242": "https://podcasts.apple.com/de/podcast/resident-episode-242-dec-26-2015/id387385712?i=1000359673176",
"241": "https://podcasts.apple.com/de/podcast/resident-episode-241-dec-19-2015/id387385712?i=1000359309384",
"240": "https://podcasts.apple.com/de/podcast/resident-episode-240-dec-12-2015/id387385712?i=1000358873005",
"239": "https://podcasts.apple.com/de/podcast/resident-episode-239-dec-05-2015/id387385712?i=1000358454140",
"238": "https://podcasts.apple.com/de/podcast/resident-episode-238-nov-28-2015/id387385712?i=1000358015092",
"237": "https://podcasts.apple.com/de/podcast/resident-episode-237-nov-21-2015/id387385712?i=1000357615496",
"236": "https://podcasts.apple.com/de/podcast/resident-episode-236-nov-14-2015/id387385712?i=1000357187941",
"233": "https://podcasts.apple.com/de/podcast/resident-episode-233-oct-24-2015/id387385712?i=1000355464325",
"231": "https://podcasts.apple.com/de/podcast/resident-episode-231-oct-10-2015/id387385712?i=1000354598654",
"230": "https://podcasts.apple.com/de/podcast/resident-episode-230-oct-03-2015/id387385712?i=1000353975191",
"229": "https://podcasts.apple.com/de/podcast/resident-episode-229-sep-26-2015/id387385712?i=1000353341084",
"228": "https://podcasts.apple.com/de/podcast/resident-episode-228-sep-19-2015/id387385712?i=1000352686910",
"227": "https://podcasts.apple.com/de/podcast/resident-episode-227-sep-12-2015/id387385712?i=1000352083307",
"226": "https://podcasts.apple.com/de/podcast/resident-episode-226-sep-05-2015/id387385712?i=1000351561525",
"225": "https://podcasts.apple.com/de/podcast/resident-episode-225-aug-29-2015/id387385712?i=1000350913218",
"224": "https://podcasts.apple.com/de/podcast/resident-episode-224-aug-22-2015/id387385712?i=1000350342118",
"223": "https://podcasts.apple.com/de/podcast/resident-episode-223-aug-15-2015/id387385712?i=1000349758460",
"222": "https://podcasts.apple.com/de/podcast/resident-episode-222-aug-08-2015/id387385712?i=1000349145837",
"221": "https://podcasts.apple.com/de/podcast/resident-episode-221-aug-01-2015/id387385712?i=1000348565443",
"220": "https://podcasts.apple.com/de/podcast/resident-episode-220-jul-25-2015/id387385712?i=1000347997422",
"219": "https://podcasts.apple.com/de/podcast/resident-episode-219-jul-18-2015/id387385712?i=1000347496011",
"218": "https://podcasts.apple.com/de/podcast/resident-episode-218-jul-11-2015/id387385712?i=1000347016190",
"217": "https://podcasts.apple.com/de/podcast/resident-episode-217-jul-04-2015/id387385712?i=1000346440132",
"216": "https://podcasts.apple.com/de/podcast/resident-episode-216-jun-27-2015/id387385712?i=1000345880354",
"215": "https://podcasts.apple.com/de/podcast/resident-episode-215-jun-20-2015/id387385712?i=1000345306372",
"214": "https://podcasts.apple.com/de/podcast/resident-episode-214-jun-13-2015/id387385712?i=1000344742989",
"213": "https://podcasts.apple.com/de/podcast/resident-episode-213-jun-06-2015/id387385712?i=1000344177999",
"212": "https://podcasts.apple.com/de/podcast/resident-episode-212-may-30-2015/id387385712?i=1000343603369",
"211": "https://podcasts.apple.com/de/podcast/resident-episode-211-may-23-2015/id387385712?i=1000343016112",
"210": "https://podcasts.apple.com/de/podcast/resident-episode-210-may-16-2015/id387385712?i=1000342415502",
"209": "https://podcasts.apple.com/de/podcast/resident-episode-209-may-09-2015/id387385712?i=1000341822926",
"208": "https://podcasts.apple.com/de/podcast/resident-episode-208-may-02-2015/id387385712?i=1000341292593",
"207": "https://podcasts.apple.com/de/podcast/resident-episode-207-april-25-2015/id387385712?i=1000340779343",
"206": "https://podcasts.apple.com/de/podcast/resident-episode-206-april-18-2015/id387385712?i=1000340293596",
"205": "https://podcasts.apple.com/de/podcast/resident-episode-205-april-11-2015/id387385712?i=1000339807535",
"204": "https://podcasts.apple.com/de/podcast/resident-episode-204-april-04-2015/id387385712?i=1000339258332",
"203": "https://podcasts.apple.com/de/podcast/resident-episode-203-march-28-2015/id387385712?i=1000338696855",
"202": "https://podcasts.apple.com/de/podcast/resident-episode-202-march-21-2015/id387385712?i=1000338187686",
"201": "https://podcasts.apple.com/de/podcast/resident-episode-201-march-14-2015/id387385712?i=1000337679218",
"200": "https://podcasts.apple.com/de/podcast/resident-episode-200-march-07-2015/id387385712?i=1000337175347",
"199": "https://podcasts.apple.com/de/podcast/resident-episode-199-february-28-2015/id387385712?i=1000336658213",
"198": "https://podcasts.apple.com/de/podcast/resident-episode-198-february-21-2015/id387385712?i=1000336081130",
"197": "https://podcasts.apple.com/de/podcast/resident-episode-197-february-14-2015/id387385712?i=1000335575395",
"196": "https://podcasts.apple.com/de/podcast/resident-episode-196-february-07-2015/id387385712?i=1000335575396",
"195": "https://podcasts.apple.com/de/podcast/resident-episode-195-january-31-2015/id387385712?i=1000334560899",
"194": "https://podcasts.apple.com/de/podcast/resident-episode-194-january-24-2015/id387385712?i=1000334022126",
"193": "https://podcasts.apple.com/de/podcast/resident-episode-193-january-17-2015/id387385712?i=1000332528185",
"192": "https://podcasts.apple.com/de/podcast/resident-episode-192-january-10-2015/id387385712?i=1000331077719",
"191": "https://podcasts.apple.com/de/podcast/resident-episode-191-january-03-2015/id387385712?i=1000329653491",
"190": "https://podcasts.apple.com/de/podcast/resident-episode-190-december-27-2014/id387385712?i=1000328271096",
"189": "https://podcasts.apple.com/de/podcast/resident-episode-189-december-20-2014/id387385712?i=1000327880180",
"188": "https://podcasts.apple.com/de/podcast/resident-episode-188-december-13-2014/id387385712?i=1000327358040",
"187": "https://podcasts.apple.com/de/podcast/resident-episode-187-december-06-2014/id387385712?i=1000326889667",
"186": "https://podcasts.apple.com/de/podcast/resident-episode-186-november-29-2014/id387385712?i=1000326355978",
"185": "https://podcasts.apple.com/de/podcast/resident-episode-185-november-22-2014/id387385712?i=1000325898272",
"184": "https://podcasts.apple.com/de/podcast/resident-episode-184-november-15-2014/id387385712?i=1000325525513",
"183": "https://podcasts.apple.com/de/podcast/resident-episode-183-november-08-2014/id387385712?i=1000323869115",
"182": "https://podcasts.apple.com/de/podcast/resident-episode-182-november-01-2014/id387385712?i=1000321780172",
"181": "https://podcasts.apple.com/de/podcast/resident-episode-181-october-25-2014/id387385712?i=1000320568130",
"180": "https://podcasts.apple.com/de/podcast/resident-episode-180-october-18-2014/id387385712?i=1000320229004",
"179": "https://podcasts.apple.com/de/podcast/resident-episode-179-october-11-2014/id387385712?i=1000319986737",
"178": "https://podcasts.apple.com/de/podcast/resident-episode-178-october-4-2014/id387385712?i=1000319746725",
"177": "https://podcasts.apple.com/de/podcast/resident-episode-177-september-27-2014/id387385712?i=1000319484145",
"176": "https://podcasts.apple.com/de/podcast/resident-episode-176-september-20-2014/id387385712?i=1000319195986",
"175": "https://podcasts.apple.com/de/podcast/resident-episode-175-september-13-2014/id387385712?i=1000318919843",
"174": "https://podcasts.apple.com/de/podcast/resident-episode-174-september-6-2014/id387385712?i=1000318628099",
"173": "https://podcasts.apple.com/de/podcast/resident-episode-173-august-30-2014/id387385712?i=1000318446369",
"172": "https://podcasts.apple.com/de/podcast/resident-episode-172-august-23-2014/id387385712?i=1000318091943",
"171": "https://podcasts.apple.com/de/podcast/resident-episode-171-august-16-2014/id387385712?i=1000317787389",
"170": "https://podcasts.apple.com/de/podcast/resident-episode-170-august-09-2014/id387385712?i=1000422564421",
"169": "https://podcasts.apple.com/de/podcast/resident-episode-169-august-02-2014/id387385712?i=1000422564420",
"168": "https://podcasts.apple.com/de/podcast/resident-episode-168-july-26-2014/id387385712?i=1000664915942",
"167": "https://podcasts.apple.com/de/podcast/resident-episode-167-july-19-2014/id387385712?i=1000664915996",
"166": "https://podcasts.apple.com/de/podcast/resident-episode-166-july-12-2014/id387385712?i=1000664915845",
"165": "https://podcasts.apple.com/de/podcast/resident-episode-165-july-05-2014/id387385712?i=1000664915854",
"164": "https://podcasts.apple.com/de/podcast/resident-episode-164-june-28-2014/id387385712?i=1000664915907",
"163": "https://podcasts.apple.com/de/podcast/resident-episode-163-june-21-2014/id387385712?i=1000664915906",
"162": "https://podcasts.apple.com/de/podcast/resident-episode-162-june-14-2014/id387385712?i=1000664915888",
"161": "https://podcasts.apple.com/de/podcast/resident-episode-161-june-07-2014/id387385712?i=1000664916072",
"160": "https://podcasts.apple.com/de/podcast/resident-episode-160-may-31-2014/id387385712?i=1000664916049",
"159": "https://podcasts.apple.com/de/podcast/resident-episode-159-may-24-2014/id387385712?i=1000664915943",
"158": "https://podcasts.apple.com/de/podcast/resident-episode-158-may-17-2014/id387385712?i=1000664915908",
"157": "https://podcasts.apple.com/de/podcast/resident-episode-157-may-10-2014/id387385712?i=1000664915965",
"156": "https://podcasts.apple.com/de/podcast/resident-episode-156-may-03-2014/id387385712?i=1000664915999",
"155": "https://podcasts.apple.com/de/podcast/resident-episode-155-april-26-2014/id387385712?i=1000664915998",
"154": "https://podcasts.apple.com/de/podcast/resident-episode-154-april-19-2014/id387385712?i=1000664915997",
"153": "https://podcasts.apple.com/de/podcast/resident-episode-153-april-12-2014/id387385712?i=1000664916073",
"152": "https://podcasts.apple.com/de/podcast/resident-episode-152-april-05-2014/id387385712?i=1000664915966",
"151": "https://podcasts.apple.com/de/podcast/resident-episode-151-march-29-2014/id387385712?i=1000664916000",
"150": "https://podcasts.apple.com/de/podcast/resident-episode-150-march-22-2014/id387385712?i=1000664915967",
"149": "https://podcasts.apple.com/de/podcast/resident-episode-149-march-15-2014/id387385712?i=1000664915968",
"148": "https://podcasts.apple.com/de/podcast/resident-episode-148-march-08-2014/id387385712?i=1000664915889",
"147": "https://podcasts.apple.com/de/podcast/resident-episode-147-march-01-2014/id387385712?i=1000664915909",
"146": "https://podcasts.apple.com/de/podcast/resident-episode-146-february-22-2014/id387385712?i=1000664915846",
"145": "https://podcasts.apple.com/de/podcast/resident-episode-145-february-15-2014/id387385712?i=1000664916001",
"144": "https://podcasts.apple.com/de/podcast/resident-episode-144-february-08-2014/id387385712?i=1000664915910",
"143": "https://podcasts.apple.com/de/podcast/resident-episode-143-february-01-2014/id387385712?i=1000664915945",
"142": "https://podcasts.apple.com/de/podcast/resident-episode-142-january-25-2014/id387385712?i=1000664915971",
"141": "https://podcasts.apple.com/de/podcast/resident-episode-141-january-18-2014/id387385712?i=1000664916017",
"140": "https://podcasts.apple.com/de/podcast/resident-episode-140-january-11-2014/id387385712?i=1000664916101",
"139": "https://podcasts.apple.com/de/podcast/resident-episode-139-january-04-2014/id387385712?i=1000664915969",
"138": "https://podcasts.apple.com/de/podcast/resident-episode-138-december-28-2013/id387385712?i=1000664915847",
"137": "https://podcasts.apple.com/de/podcast/resident-episode-137-december-21-2013/id387385712?i=1000664916050",
"136": "https://podcasts.apple.com/de/podcast/resident-episode-136-december-14-2013/id387385712?i=1000664915946",
"135": "https://podcasts.apple.com/de/podcast/resident-episode-135-december-07-2013/id387385712?i=1000664916018",
"134": "https://podcasts.apple.com/de/podcast/resident-episode-134-november-30-2013/id387385712?i=1000664915848",
"133": "https://podcasts.apple.com/de/podcast/resident-episode-133-november-23-2013/id387385712?i=1000664916053",
"132": "https://podcasts.apple.com/de/podcast/resident-episode-132-november-16-2013/id387385712?i=1000664915849",
"131": "https://podcasts.apple.com/de/podcast/resident-episode-131-november-09-2013/id387385712?i=1000664915947",
"130": "https://podcasts.apple.com/de/podcast/resident-episode-130-november-02-2013/id387385712?i=1000664916100",
"129": "https://podcasts.apple.com/de/podcast/resident-episode-129-october-26-2013/id387385712?i=1000664915948",
"128": "https://podcasts.apple.com/de/podcast/resident-episode-128-october-19-2013/id387385712?i=1000664915851",
"127": "https://podcasts.apple.com/de/podcast/resident-episode-127-october-12-2013/id387385712?i=1000664915970",
"126": "https://podcasts.apple.com/de/podcast/resident-episode-126-october-05-2013/id387385712?i=1000664916130",
"125": "https://podcasts.apple.com/de/podcast/resident-episode-125-september-28-2013/id387385712?i=1000664916051",
"124": "https://podcasts.apple.com/de/podcast/resident-episode-124-september-21-2013/id387385712?i=1000664915850",
"123": "https://podcasts.apple.com/de/podcast/resident-episode-123-september-14-2013/id387385712?i=1000664915949",
"122": "https://podcasts.apple.com/de/podcast/resident-episode-122-september-07-2013/id387385712?i=1000664915852",
"121": "https://podcasts.apple.com/de/podcast/resident-episode-121-august-31-2013/id387385712?i=1000664916002",
"120": "https://podcasts.apple.com/de/podcast/resident-episode-120-august-24-2013/id387385712?i=1000664916102",
"119": "https://podcasts.apple.com/de/podcast/resident-episode-119-august-17-2013/id387385712?i=1000664916019",
"118": "https://podcasts.apple.com/de/podcast/resident-episode-118-august-10-2013/id387385712?i=1000664916131",
"117": "https://podcasts.apple.com/de/podcast/resident-episode-117-august-03-2013/id387385712?i=1000664916052",
"116": "https://podcasts.apple.com/de/podcast/resident-episode-116-july-27-2013/id387385712?i=1000664916103",
"115": "https://podcasts.apple.com/de/podcast/resident-episode-115-july-20-2013/id387385712?i=1000664915853",
"114": "https://podcasts.apple.com/de/podcast/resident-episode-114-july-13-2013/id387385712?i=1000664916132",
"113": "https://podcasts.apple.com/de/podcast/resident-episode-113-july-06-2013/id387385712?i=1000664916074",
"112": "https://podcasts.apple.com/de/podcast/resident-episode-112-june-29-2013/id387385712?i=1000664916076",
"111": "https://podcasts.apple.com/de/podcast/resident-episode-111-june-22-2013/id387385712?i=1000664916077",
"110": "https://podcasts.apple.com/de/podcast/resident-episode-110-june-15-2013/id387385712?i=1000664916075",
"109": "https://podcasts.apple.com/de/podcast/resident-episode-109-june-08-2013/id387385712?i=1000664915915",
"108": "https://podcasts.apple.com/de/podcast/resident-episode-108-june-01-2013/id387385712?i=1000664915855",
"107": "https://podcasts.apple.com/de/podcast/resident-episode-107-may-25-2013/id387385712?i=1000664916104",
"106": "https://podcasts.apple.com/de/podcast/resident-episode-106-may-18-2013/id387385712?i=1000664916054",
"105": "https://podcasts.apple.com/de/podcast/resident-episode-105-may-11-2013/id387385712?i=1000664916003",
"104": "https://podcasts.apple.com/de/podcast/resident-episode-104-may-04-2013/id387385712?i=1000664916137",
"103": "https://podcasts.apple.com/de/podcast/resident-episode-103-april-27-2013/id387385712?i=1000664915972",
"102": "https://podcasts.apple.com/de/podcast/resident-episode-102-april-20-2013/id387385712?i=1000664915911",
"101": "https://podcasts.apple.com/de/podcast/resident-episode-101-april-13-2013/id387385712?i=1000664916106",
"100": "https://podcasts.apple.com/de/podcast/resident-episode-100-april-06-2013/id387385712?i=1000664916138",
"099": "https://podcasts.apple.com/de/podcast/resident-episode-099-march-30-2013/id387385712?i=1000664916020",
"098": "https://podcasts.apple.com/de/podcast/resident-episode-098-march-23-2013/id387385712?i=1000664915912",
"097": "https://podcasts.apple.com/de/podcast/resident-episode-097-march-16-2013/id387385712?i=1000664916004",
"096": "https://podcasts.apple.com/de/podcast/resident-episode-096-march-09-2013/id387385712?i=1000664915856",
"095": "https://podcasts.apple.com/de/podcast/resident-episode-095-march-02-2013/id387385712?i=1000664915913",
"094": "https://podcasts.apple.com/de/podcast/resident-episode-094-february-23-2013/id387385712?i=1000664915857",
"093": "https://podcasts.apple.com/de/podcast/resident-episode-093-february-16-2013/id387385712?i=1000664916133",
"092": "https://podcasts.apple.com/de/podcast/resident-episode-092-february-09-2013/id387385712?i=1000664915858",
"091": "https://podcasts.apple.com/de/podcast/resident-episode-091-february-02-2013/id387385712?i=1000664916078",
"090": "https://podcasts.apple.com/de/podcast/resident-episode-090-january-26-2013/id387385712?i=1000664916134",
"089": "https://podcasts.apple.com/de/podcast/resident-episode-089-january-19-2013/id387385712?i=1000664915859",
"088": "https://podcasts.apple.com/de/podcast/resident-episode-088-january-12-2013/id387385712?i=1000664916005",
"087": "https://podcasts.apple.com/de/podcast/resident-episode-087-january-05-2013/id387385712?i=1000664915914",
"086": "https://podcasts.apple.com/de/podcast/resident-episode-086-december-29-2012/id387385712?i=1000664916161",
"085": "https://podcasts.apple.com/de/podcast/resident-episode-085-december-22-2012/id387385712?i=1000664916105",
"084": "https://podcasts.apple.com/de/podcast/resident-episode-084-december-15-2012/id387385712?i=1000664916021",
"083": "https://podcasts.apple.com/de/podcast/resident-episode-083-december-08-2012/id387385712?i=1000664916135",
"082": "https://podcasts.apple.com/de/podcast/resident-episode-082-december-01-2012/id387385712?i=1000664916160",
"081": "https://podcasts.apple.com/de/podcast/resident-episode-081-november-24-2012/id387385712?i=1000664916136",
"080": "https://podcasts.apple.com/de/podcast/resident-episode-080-november-17-2012/id387385712?i=1000664916079",
"079": "https://podcasts.apple.com/de/podcast/resident-episode-079-november-10-2012/id387385712?i=1000664916080",
"078": "https://podcasts.apple.com/de/podcast/resident-episode-078-november-03-2012/id387385712?i=1000664916006",
"077": "https://podcasts.apple.com/de/podcast/resident-episode-077-october-27-2012/id387385712?i=1000664916055",
"076": "https://podcasts.apple.com/de/podcast/resident-episode-076-october-20-2012/id387385712?i=1000664915973",
"075": "https://podcasts.apple.com/de/podcast/resident-episode-075-october-13-2012/id387385712?i=1000664915916",
"074": "https://podcasts.apple.com/de/podcast/resident-episode-074-october-06-2012/id387385712?i=1000664916139",
"073": "https://podcasts.apple.com/de/podcast/resident-episode-073-september-29-2012/id387385712?i=1000664916022",
"072": "https://podcasts.apple.com/de/podcast/resident-episode-072-september-22-2012/id387385712?i=1000664916107",
"071": "https://podcasts.apple.com/de/podcast/resident-episode-071-september-15-2012/id387385712?i=1000664916008",
"070": "https://podcasts.apple.com/de/podcast/resident-episode-070-september-08-2012/id387385712?i=1000664916007",
"069": "https://podcasts.apple.com/de/podcast/resident-episode-069-september-01-2012/id387385712?i=1000664915974",
"068": "https://podcasts.apple.com/de/podcast/resident-episode-068-august-25-2012/id387385712?i=1000664916009",
"067": "https://podcasts.apple.com/de/podcast/resident-episode-067-august-18-2012/id387385712?i=1000664916163",
"066": "https://podcasts.apple.com/de/podcast/resident-episode-066-august-11-2012/id387385712?i=1000664916140",
"065": "https://podcasts.apple.com/de/podcast/resident-episode-065-august-04-2012/id387385712?i=1000664915975",
"064": "https://podcasts.apple.com/de/podcast/resident-episode-064-july-28-2012/id387385712?i=1000664916057",
"063": "https://podcasts.apple.com/de/podcast/resident-episode-063-july-21-2012/id387385712?i=1000664916056",
"062": "https://podcasts.apple.com/de/podcast/resident-episode-062-july-14-2012/id387385712?i=1000664916108",
"061": "https://podcasts.apple.com/de/podcast/resident-episode-061-july-07-2012/id387385712?i=1000664916141",
"060": "https://podcasts.apple.com/de/podcast/resident-episode-060-june-30-2012/id387385712?i=1000664916081",
"059": "https://podcasts.apple.com/de/podcast/resident-episode-059-june-23-2012/id387385712?i=1000664915976",
"058": "https://podcasts.apple.com/de/podcast/resident-episode-058-june-16-2012/id387385712?i=1000664916162",
"057": "https://podcasts.apple.com/de/podcast/resident-episode-057-june-09-2012/id387385712?i=1000664916190",
"056": "https://podcasts.apple.com/de/podcast/resident-episode-056-june-02-2012/id387385712?i=1000664915978",
"055": "https://podcasts.apple.com/de/podcast/resident-episode-055-may-26-2012/id387385712?i=1000664916023",
"054": "https://podcasts.apple.com/de/podcast/resident-episode-054-may-19-2012/id387385712?i=1000664916165",
"053": "https://podcasts.apple.com/de/podcast/resident-episode-053-may-12-2012/id387385712?i=1000664916166",
"052": "https://podcasts.apple.com/de/podcast/resident-episode-052-may-05-2012/id387385712?i=1000664916164",
"051": "https://podcasts.apple.com/de/podcast/resident-episode-051-april-28-2012/id387385712?i=1000664915977",
"050": "https://podcasts.apple.com/de/podcast/resident-episode-050-april-21-2012/id387385712?i=1000664916167",
"049": "https://podcasts.apple.com/de/podcast/resident-episode-049-april-14-2012/id387385712?i=1000664916191",
"048": "https://podcasts.apple.com/de/podcast/resident-episode-048-april-7-2012/id387385712?i=1000664916142",
"047": "https://podcasts.apple.com/de/podcast/resident-episode-047-march-31-2013/id387385712?i=1000664916143",
"046": "https://podcasts.apple.com/de/podcast/resident-episode-046-march-24-2012/id387385712?i=1000664915979",
"045": "https://podcasts.apple.com/de/podcast/resident-episode-045-march-17-2012/id387385712?i=1000664916168",
"044": "https://podcasts.apple.com/de/podcast/resident-episode-044-march-10-2012/id387385712?i=1000664916144",
"043": "https://podcasts.apple.com/de/podcast/resident-episode-043-march-03-2012/id387385712?i=1000664915917",
"042": "https://podcasts.apple.com/de/podcast/resident-episode-042-february-25-2012/id387385712?i=1000664916170",
"041": "https://podcasts.apple.com/de/podcast/resident-episode-041-february-18-2012/id387385712?i=1000664916192",
"040": "https://podcasts.apple.com/de/podcast/resident-episode-040-february-11-2012/id387385712?i=1000664916082",
"039": "https://podcasts.apple.com/de/podcast/resident-episode-039-february-04-2012/id387385712?i=1000664916169",
"038": "https://podcasts.apple.com/de/podcast/resident-episode-038-january-28-2012/id387385712?i=1000664916222",
"037": "https://podcasts.apple.com/de/podcast/resident-episode-037-january-21-2012/id387385712?i=1000664916058",
"036": "https://podcasts.apple.com/de/podcast/resident-episode-036-january-14-2012/id387385712?i=1000664916111",
"035": "https://podcasts.apple.com/de/podcast/resident-episode-035-january-07-2012/id387385712?i=1000664916220",
"034": "https://podcasts.apple.com/de/podcast/resident-episode-034-december-31-2011/id387385712?i=1000664916171",
"033": "https://podcasts.apple.com/de/podcast/resident-episode-033-december-24-2011/id387385712?i=1000664916109",
"032": "https://podcasts.apple.com/de/podcast/resident-episode-032-december-17-2011/id387385712?i=1000664916221",
"031": "https://podcasts.apple.com/de/podcast/resident-episode-031-december-10-2011/id387385712?i=1000664916110",
"030": "https://podcasts.apple.com/de/podcast/resident-episode-030-december-3-2011/id387385712?i=1000664916146",
"029": "https://podcasts.apple.com/de/podcast/resident-episode-029-november-26-2011/id387385712?i=1000664916251",
"028": "https://podcasts.apple.com/de/podcast/resident-episode-028-november-19-2011/id387385712?i=1000664916223",
"027": "https://podcasts.apple.com/de/podcast/resident-episode-027-november-05-2011/id387385712?i=1000664916112",
"026": "https://podcasts.apple.com/de/podcast/resident-episode-026-october-29-2011/id387385712?i=1000664916113",
"025": "https://podcasts.apple.com/de/podcast/resident-episode-025-october-22-2011/id387385712?i=1000664916145",
"024": "https://podcasts.apple.com/de/podcast/resident-episode-024-october-15-2011/id387385712?i=1000664916059",
"023": "https://podcasts.apple.com/de/podcast/resident-episode-023-october-08-2011/id387385712?i=1000664915918",
"022": "https://podcasts.apple.com/de/podcast/resident-episode-022-october-01-2011/id387385712?i=1000664915919",
"021": "https://podcasts.apple.com/de/podcast/resident-episode-021-september-24-2011/id387385712?i=1000664916172",
"020": "https://podcasts.apple.com/de/podcast/resident-episode-020-september-17-2011/id387385712?i=1000664916250",
"019": "https://podcasts.apple.com/de/podcast/resident-episode-019-september-10-2011/id387385712?i=1000664916173",
"018": "https://podcasts.apple.com/de/podcast/resident-episode-018-september-03-2011/id387385712?i=1000664916024",
"017": "https://podcasts.apple.com/de/podcast/resident-episode-017-august-27-2011/id387385712?i=1000664916193",
"016": "https://podcasts.apple.com/de/podcast/resident-episode-016-august-20-2011/id387385712?i=1000664916083",
"015": "https://podcasts.apple.com/de/podcast/resident-episode-015-august-13-2011/id387385712?i=1000664916114",
"014": "https://podcasts.apple.com/de/podcast/resident-episode-014-august-06-2011/id387385712?i=1000664916224",
"013": "https://podcasts.apple.com/de/podcast/resident-episode-013-july-30-2011/id387385712?i=1000664916174",
"012": "https://podcasts.apple.com/de/podcast/resident-episode-012-july-23-2011/id387385712?i=1000664916225",
"011": "https://podcasts.apple.com/de/podcast/resident-episode-011-july-16-2011/id387385712?i=1000664916115",
"010": "https://podcasts.apple.com/de/podcast/resident-episode-010-july-09-2011/id387385712?i=1000664916175",
"009": "https://podcasts.apple.com/de/podcast/resident-episode-009-july-02-2011/id387385712?i=1000664916176",
"008": "https://podcasts.apple.com/de/podcast/resident-episode-008-june-25-2011/id387385712?i=1000664916194",
"007": "https://podcasts.apple.com/de/podcast/resident-episode-007-june-18-2011/id387385712?i=1000664916060",
"006": "https://podcasts.apple.com/de/podcast/resident-episode-006-june-11-2011/id387385712?i=1000664916177",
"005": "https://podcasts.apple.com/de/podcast/resident-episode-005-june-04-2011/id387385712?i=1000664916025",
"004": "https://podcasts.apple.com/de/podcast/resident-episode-004-may-28th-2011/id387385712?i=1000664916252",
"003": "https://podcasts.apple.com/de/podcast/resident-episode-003-may-21st-2011/id387385712?i=1000664916084",
"002.2": "https://podcasts.apple.com/de/podcast/resident-episode-002-2-may-14th-2011/id387385712?i=1000664916178",
"002.1": "https://podcasts.apple.com/de/podcast/resident-episode-002-1-may-14th-2011/id387385712?i=1000664916253",
"001.2": "https://podcasts.apple.com/de/podcast/resident-episode-001-2-may-7th-2011/id387385712?i=1000664916226",
"001.1": "https://podcasts.apple.com/de/podcast/resident-episode-001-1-may-7th-2011/id387385712?i=1000664916085"
};

// addEditorButton
function makeEditorButton( idName, buttonText, info ) {
    var spanClass = "tool oo-ui-widget oo-ui-widget-enabled oo-ui-toggleWidget oo-ui-toggleWidget-off oo-ui-buttonElement oo-ui-buttonElement-frameless oo-ui-iconElement oo-ui-toggleButtonWidget",
        linkWrapper = '<a class="oo-ui-buttonElement-button" title="'+info+'" accesskey="y"><span class="fa fa-lg fa-nothing has-label"></span><span class="oo-ui-labelElement-label">'+buttonText+'</span></a>',
        button = '<span class="'+spanClass+'" id="'+idName+'">'+linkWrapper+'</span>';
    return button;
}

function addApplePodcastUrlToPlayer( text, url ) {
    return text.replace( /{{Player[^}]*}}/, function( player ) {
        var lines = player.split( "\n" ),
            header = lines.shift();

        if( lines.length == 0 ) {
            return header.replace( /^(\{\{Player)([^}]*)\|(?:1=)?(https?:\/\/.+)\}\}$/, function( match, templateStart, options, oldUrl ) {
                if( options.indexOf( "mode=" ) == -1 ) {
                    options = "|mode=mirrors" + options;
                }
                return templateStart + options + "\n |1=" + url + "\n |2=" + oldUrl + "\n}}";
            });
        }

        if( header.indexOf( "mode=" ) == -1 && lines.length > 1 ) {
            header = header.replace( /^{{Player/, "{{Player|mode=mirrors" );
        }

        var nextPlayerNumber = 2;
        lines = lines.map(function( line ) {
            return line
                .replace( /^( \|)(\d+)(=https?:\/\/.+)$/, function( match, prefix, number, rest ) {
                    var newNumber = parseInt( number, 10 ) + 1;
                    nextPlayerNumber = Math.max( nextPlayerNumber, newNumber + 1 );
                    return prefix + newNumber + rest;
                })
                .replace( /^( \|)(https?:\/\/.+)$/, function( match, prefix, rest ) {
                    return prefix + ( nextPlayerNumber++ ) + "=" + rest;
                });
        });

        lines.unshift( " |1="+url );
        lines.unshift( header );
        return lines.join( "\n" );
    });
}

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
                textReplaced = addApplePodcastUrlToPlayer( text, url );

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
            var epId = wgTitle.replace( /^(?:.+ - .+ - )Resident (\d+).*$/, "$1" ).trim();

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
        if( wgPageName == "MixesDB:Explorer/Mixes" || wgPageName == "MixesDB:Explorer/Lists" ) {
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
