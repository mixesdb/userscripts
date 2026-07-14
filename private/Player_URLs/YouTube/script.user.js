// ==UserScript==
// @name         YouTube Player URLs (private)
// @version      2026.07.14.2
// @description  Add YouTube player URLs from array to mix pages when episode numbers match the mix page title
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-YouTube_Player_URLs_1
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// Embedded so the private GitHub raw URL does not need an expiring access token.
var episodes_arr = {
    "601": "https://youtu.be/1hR0CIi6OFc",
    "602": "https://youtu.be/Ue9YQ03CwHI",
    "603": "https://youtu.be/sU0IzHA2xCs",
    "600": "https://youtu.be/uxN2ltKX3n8",
    "599": "https://youtu.be/6oi4zbtMtGs",
    "598": "https://youtu.be/FpjfRBcpt6c",
    "593": "https://youtu.be/OnQ8VWwPOO0",
    "592": "https://youtu.be/ru_mZzMCN6c",
    "591": "https://youtu.be/-1A7w-1IdWY",
    "590": "https://youtu.be/HMHjneGo740",
    "589": "https://youtu.be/1gPG2i_wIO0",
    "588": "https://youtu.be/BUY5oPZMLkk",
    "585": "https://youtu.be/74KLx6tgqmo",
    "584": "https://youtu.be/kuGkobTyGL0",
    "001": "https://youtu.be/RVWsfJJLDxs",
    "002": "https://youtu.be/eSsYYgtKeYw",
    "004": "https://youtu.be/zuEVrlu22i0",
    "005": "https://youtu.be/X9SiTt6W_OU",
    "006": "https://youtu.be/mbbkBK7Ui4w",
    "007": "https://youtu.be/dNdhMfUupes",
    "008": "https://youtu.be/nv2RAUkW7Q0",
    "009": "https://youtu.be/SXOyMhgMtb0",
    "010": "https://youtu.be/jCMNP6xcDr0",
    "011": "https://youtu.be/PYcFm3OXvjE",
    "012": "https://youtu.be/V4nCcw95lp0",
    "013": "https://youtu.be/wZIm_osMxf0",
    "014": "https://youtu.be/F6hKV_cULZE",
    "015": "https://youtu.be/gxdpB_ygRvc",
    "016": "https://youtu.be/ZIz-xIimToQ",
    "017": "https://youtu.be/mqHuaW5h0fI",
    "018": "https://youtu.be/TsjQOhc5k7s",
    "019": "https://youtu.be/qVya61v-wM4",
    "020": "https://youtu.be/YfkU5cimErs",
    "021": "https://youtu.be/WTlTjyLNOeY",
    "022": "https://youtu.be/wwexEM8lico",
    "023": "https://youtu.be/3DNBcs1KjFM",
    "024": "https://youtu.be/b84qfCl5xw0",
    "025": "https://youtu.be/jET7w9gPmT8",
    "026": "https://youtu.be/6gBsj0YpPng",
    "027": "https://youtu.be/tzGu-e4ij44",
    "028": "https://youtu.be/3QBF6UbvaTM",
    "029": "https://youtu.be/YXlMkvO62w8",
    "030": "https://youtu.be/TwLNmDN0G0E",
    "031": "https://youtu.be/CYUHSdxswFY",
    "032": "https://youtu.be/Q46c5C5O9nc",
    "033": "https://youtu.be/NQdbc_AuBXI",
    "034": "https://youtu.be/Q6kTZUgiQ-w",
    "035": "https://youtu.be/rRiqVPgz2pE",
    "036": "https://youtu.be/nz722EoEX7M",
    "037": "https://youtu.be/VxH0qFnRNnw",
    "038": "https://youtu.be/aKHmW5JplOY",
    "039": "https://youtu.be/JjjCYZM4-DY",
    "040": "https://youtu.be/u7a5L1j7bkw",
    "041": "https://youtu.be/7xDm9bUGdOE",
    "043": "https://youtu.be/5jDcIP8P7Cw",
    "044": "https://youtu.be/K5Dqe_fGk8Y",
    "045": "https://youtu.be/NP0PfS9qp1I",
    "046": "https://youtu.be/dH45kuOf-y0",
    "047": "https://youtu.be/k43wee2jxtU",
    "048": "https://youtu.be/qGvArBWFKj4",
    "050": "https://youtu.be/tGbHciqliA4",
    "051": "https://youtu.be/11sCfHKXe78",
    "052": "https://youtu.be/fPt4kFCk2zk",
    "053": "https://youtu.be/DKr1Brw_5oc",
    "054": "https://youtu.be/nNKAZO-vTqE",
    "055": "https://youtu.be/IJhbzloCb6E",
    "056": "https://youtu.be/-J-tI1JEjYg",
    "057": "https://youtu.be/NgxPHAHss_w",
    "058": "https://youtu.be/5onvhDO1pfA",
    "060": "https://youtu.be/3DzYpZiXmCo",
    "061": "https://youtu.be/j7p9oRq7uy0",
    "062": "https://youtu.be/-3Oo9fwEjlY",
    "063": "https://youtu.be/SknQvklzgoY",
    "064": "https://youtu.be/-f_K7xiSH6Q",
    "065": "https://youtu.be/Bep97nPmQ4I",
    "066": "https://youtu.be/3UTIfenmZZ8",
    "067": "https://youtu.be/fQqLsHJsII0",
    "068": "https://youtu.be/--_1tetxYx0",
    "069": "https://youtu.be/RAXl0V9jHN0",
    "070": "https://youtu.be/XdiJcUvKjtM",
    "071": "https://youtu.be/hTbIpSs5ss8",
    "072": "https://youtu.be/CA6wL0-TPls",
    "073": "https://youtu.be/FOKFjJXlQ5M",
    "074": "https://youtu.be/du2_RLKG9kg",
    "075": "https://youtu.be/fCUbefbPr30",
    "076": "https://youtu.be/eWXFjaA5opM",
    "077": "https://youtu.be/redDWQcYzNo",
    "078": "https://youtu.be/9IJSbClwzu8",
    "079": "https://youtu.be/ciTp6C0h7ls",
    "080": "https://youtu.be/GBysefHAEtQ",
    "081": "https://youtu.be/_oprpNiRky8",
    "082": "https://youtu.be/A6cMYLOJki0",
    "083": "https://youtu.be/mQcE27CB-xs",
    "084": "https://youtu.be/xPZRgP2n4Pw",
    "085": "https://youtu.be/IHo-Alo_T6s",
    "086": "https://youtu.be/vOGOEVhlE1U",
    "087": "https://youtu.be/6Uy-FxsEH5o",
    "088": "https://youtu.be/Z8nr32u_eJU",
    "089": "https://youtu.be/WzhI6936IHE",
    "090": "https://youtu.be/lFhZfL7HMv0",
    "091": "https://youtu.be/Iozv2RSLQwo",
    "092": "https://youtu.be/vdH62AXwF-U",
    "094": "https://youtu.be/nj9oNI2R2Xg",
    "095": "https://youtu.be/5S1Uy1sza4w",
    "096": "https://youtu.be/7sagDIcLidQ",
    "098": "https://youtu.be/VojgSTMusIk",
    "099": "https://youtu.be/RcqaArhvWJg",
    "100": "https://youtu.be/gaj3gRh5jIg",
    "101": "https://youtu.be/-bMyQSIGze0",
    "102": "https://youtu.be/3fsVz5C1-PY",
    "104": "https://youtu.be/FjYUjwwZ3po",
    "105": "https://youtu.be/_zZlC7JRe9U",
    "106": "https://youtu.be/Lx2u8YhRdkI",
    "108": "https://youtu.be/Dh8Lbz_m0yM",
    "109": "https://youtu.be/PY_FCrEEbAY",
    "110": "https://youtu.be/nFKRjtUd8vc",
    "111": "https://youtu.be/6-atVN3_WaU",
    "112": "https://youtu.be/tX_xWhbW-J8",
    "113": "https://youtu.be/-W_Qisdutfs",
    "114": "https://youtu.be/vyvSNiwrYiU",
    "115": "https://youtu.be/ANwJWjJDWqg",
    "116": "https://youtu.be/h8nUv3ZXGbg",
    "117": "https://youtu.be/WFSdW6IiiVA",
    "119": "https://youtu.be/rkss5JVqpDI",
    "120": "https://youtu.be/mBdvZCa755g",
    "118": "https://youtu.be/V3-WxVF989M",
    "121": "https://youtu.be/MF4ahoPkvk4",
    "122": "https://youtu.be/OF_547F0-Vs",
    "123": "https://youtu.be/tRP8qhLA_oA",
    "124": "https://youtu.be/ZLk5cGs1gbg",
    "125": "https://youtu.be/SENxDH0Y-8w",
    "127": "https://youtu.be/mtBA4_d8tZs",
    "128": "https://youtu.be/mELh-BX1lYw",
    "129": "https://youtu.be/iWOiSoxwsfM",
    "130": "https://youtu.be/fdoNkZuDQ38",
    "131": "https://youtu.be/QQmGG9JJV1E",
    "132": "https://youtu.be/ElLQlxxbYPA",
    "133": "https://youtu.be/PaToSlRimAc",
    "135": "https://youtu.be/yat4KWPLXUI",
    "136": "https://youtu.be/RQK8Z2_068c",
    "137": "https://youtu.be/-RQZ2qtx9So",
    "138": "https://youtu.be/eQTVz-x4c5Q",
    "140": "https://youtu.be/g1vLHyFaJYg",
    "141": "https://youtu.be/fy7WbNZJuzg",
    "142": "https://youtu.be/OemDvBIkq28",
    "143": "https://youtu.be/nkFGZTiUJsw",
    "144": "https://youtu.be/CyxFlS0KjbA",
    "145": "https://youtu.be/MNHP_1VZuXI",
    "146": "https://youtu.be/6pIdyIQFQsk",
    "147": "https://youtu.be/Bm7n80UcY5w",
    "139": "https://youtu.be/ltATrjBBlvY",
    "148": "https://youtu.be/He6bfT8CmZ0",
    "149": "https://youtu.be/HmP_tR2hO70",
    "150": "https://youtu.be/wwyS1V-ThsE",
    "151": "https://youtu.be/OV-wVp6nUHQ",
    "152": "https://youtu.be/9eotrU13jl0",
    "153": "https://youtu.be/vCrRis9csmE",
    "154": "https://youtu.be/0JNaswVRRIo",
    "155": "https://youtu.be/Ox5Z7vMxvug",
    "156": "https://youtu.be/peot13wraQg",
    "157": "https://youtu.be/DqofK-mt-tw",
    "158": "https://youtu.be/O0sADNokFUE",
    "159": "https://youtu.be/pjpcTSicQDc",
    "160": "https://youtu.be/Xr2U4o5loJ0",
    "161": "https://youtu.be/5-DR1K3IZPg",
    "162": "https://youtu.be/5lPzNttyH8o",
    "163": "https://youtu.be/Abvth2kfuNY",
    "164": "https://youtu.be/kv6pIoMxhu4",
    "165": "https://youtu.be/xCIEqRPVCIg",
    "166": "https://youtu.be/kkKa-L58LOE",
    "167": "https://youtu.be/P321q2NWZQ8",
    "168": "https://youtu.be/dNMXtQ3hQJM",
    "169": "https://youtu.be/zy58LeMnkH0",
    "170": "https://youtu.be/7oBNYSEfSPg",
    "171": "https://youtu.be/kR67NZmGakk",
    "172": "https://youtu.be/ourvRAcNUAI",
    "173": "https://youtu.be/McjDctSrrgs",
    "174": "https://youtu.be/FijXTBYWOSo",
    "175": "https://youtu.be/AI37h9f-IE8",
    "176": "https://youtu.be/iMizXcMj9G4",
    "177": "https://youtu.be/PaG9IqG3rLE",
    "178": "https://youtu.be/w6Qc6NmhZEI",
    "179": "https://youtu.be/QNTYTzsT0uc",
    "180": "https://youtu.be/Kl0iwCb8ENU",
    "181": "https://youtu.be/wODBo7LyDFk",
    "182": "https://youtu.be/kzFWZzthPjQ",
    "183": "https://youtu.be/aYh3jwUoD5I",
    "184": "https://youtu.be/0SueX0en7QQ",
    "186": "https://youtu.be/16AfJbPZPE0",
    "187": "https://youtu.be/qxNrDxxf7jQ",
    "188": "https://youtu.be/_BJ7nsI5yaY",
    "189": "https://youtu.be/P6lQdOCQVGI",
    "190": "https://youtu.be/gW4uj7lS_-w",
    "191": "https://youtu.be/ic90KVnkaZk",
    "192": "https://youtu.be/cfVw2plogjI",
    "193": "https://youtu.be/WegyoMvQtnE",
    "194": "https://youtu.be/c_lL7rE2iOc",
    "195": "https://youtu.be/NAorL8XWq0o",
    "196": "https://youtu.be/Wcy0siIR-2A",
    "197": "https://youtu.be/GgihXSzcbyY",
    "198": "https://youtu.be/jiaVOhQfFsM",
    "199": "https://youtu.be/JxbbGlYktNQ",
    "200": "https://youtu.be/YSH3nNC_FNw",
    "201": "https://youtu.be/ekWXDLrQjJg",
    "202": "https://youtu.be/rO56rz-AkK8",
    "203": "https://youtu.be/d29nTwmF7J0",
    "204": "https://youtu.be/FPZmvR4gJ2Q",
    "205": "https://youtu.be/7JkZXzUGX9Y",
    "206": "https://youtu.be/NwuL4GswgcY",
    "207": "https://youtu.be/yvpWYxB3SvI",
    "208": "https://youtu.be/ScerBDq3GFY",
    "209": "https://youtu.be/57kAsOQ75gw",
    "210": "https://youtu.be/HaV0yFsvaRc",
    "211": "https://youtu.be/QEkwHbwKZEw",
    "212": "https://youtu.be/Td1jI35LbHA",
    "213": "https://youtu.be/kxjEc57Ab3o",
    "214": "https://youtu.be/6uIGPL4y4yo",
    "215": "https://youtu.be/eKpjCGZUFag",
    "216": "https://youtu.be/sfAupchydbM",
    "217": "https://youtu.be/eDvz096f1Xk",
    "218": "https://youtu.be/kDUI8mtQDhM",
    "219": "https://youtu.be/BnicpgrGF7A",
    "220": "https://youtu.be/NTuMVVcrLHo",
    "221": "https://youtu.be/9N3iyiyPXns",
    "222": "https://youtu.be/8BT4oqrnt2s",
    "223": "https://youtu.be/6q9L4ormDUU",
    "224": "https://youtu.be/Xu3tm6nTBFQ",
    "225": "https://youtu.be/A037w51fvRc",
    "226": "https://youtu.be/ukmvdmqOgeU",
    "227": "https://youtu.be/3pPe5U7V8-Q",
    "228": "https://youtu.be/caO12XUHt4Y",
    "229": "https://youtu.be/WS-d-Fc1X3s",
    "230": "https://youtu.be/EjgAxC13Lp0",
    "231": "https://youtu.be/jz8pnT_pcrc",
    "232": "https://youtu.be/iKkj8K4wynI",
    "233": "https://youtu.be/wFjQmRTVmPc",
    "234": "https://youtu.be/R9rrKsCMIo0",
    "235": "https://youtu.be/VbhXiRYrLNM",
    "236": "https://youtu.be/75os2l8n_a0",
    "237": "https://youtu.be/6EEQNdX8Txc",
    "238": "https://youtu.be/d1Ig-44r9rw",
    "239": "https://youtu.be/F_-XLUhOOSE",
    "240": "https://youtu.be/9D4e-8IC_hc",
    "241": "https://youtu.be/xtPxsOUz_Xk",
    "242": "https://youtu.be/ofa5vu3NgWI",
    "243": "https://youtu.be/6aJWykkcAAQ",
    "244": "https://youtu.be/vbQC2Aa7EAU",
    "246": "https://youtu.be/1GbdaZEZZhg",
    "247": "https://youtu.be/dT2FU9g8ZHA",
    "249": "https://youtu.be/IjEP_M3MBes",
    "250": "https://youtu.be/iJ0UlHEcJfw",
    "251": "https://youtu.be/00ZtoA-__Ls",
    "252": "https://youtu.be/YnjJVvpPhXg",
    "253": "https://youtu.be/IgwjpdLp9JQ",
    "255": "https://youtu.be/RCdXwfeeo7c",
    "256": "https://youtu.be/2ck9GvBzl50",
    "257": "https://youtu.be/QcuvS9WAJzc",
    "258": "https://youtu.be/2Yzauk810pY",
    "260": "https://youtu.be/KiChPG6jGfk",
    "261": "https://youtu.be/f_IL5Webq5A",
    "262": "https://youtu.be/b3NznaSpPo8",
    "263": "https://youtu.be/PJ_hwrwKnyY",
    "264": "https://youtu.be/bwsN0PfU2M4",
    "265": "https://youtu.be/Rtn440krrjM",
    "266": "https://youtu.be/0ilkMF80zic",
    "267": "https://youtu.be/tjm5H-7Tzqo",
    "268": "https://youtu.be/vt3lpGkiHuY",
    "269": "https://youtu.be/BLL7e-lSmoI",
    "270": "https://youtu.be/t7e6yflR5UQ",
    "271": "https://youtu.be/Ds2pcfuDfm4",
    "272": "https://youtu.be/yBsY8DY7EdM",
    "273": "https://youtu.be/MRTFSsaZ3rg",
    "274": "https://youtu.be/x5N_HwbkeqM",
    "275": "https://youtu.be/MSp7gj8j0GE",
    "277": "https://youtu.be/6deghFbpNqs",
    "278": "https://youtu.be/HM5mgBrZWN8",
    "279": "https://youtu.be/bONFrCqQ8zQ",
    "280": "https://youtu.be/wkRAJZvsxqM",
    "281": "https://youtu.be/tWMMk6IjO2Y",
    "282": "https://youtu.be/RyPWf834Leg",
    "283": "https://youtu.be/0rjjEeWRRjc",
    "284": "https://youtu.be/Q9XaHgyXhpM",
    "285": "https://youtu.be/fpufVLvfo5s",
    "286": "https://youtu.be/3HUji6C4AXY",
    "287": "https://youtu.be/qzcLVRqP6HA",
    "288": "https://youtu.be/aeR-ajzdoNo",
    "289": "https://youtu.be/vYx4WKE8ioQ",
    "290": "https://youtu.be/5W_5_I_kT2Q",
    "291": "https://youtu.be/XimNg4qcIrc",
    "292": "https://youtu.be/Mr1ISQIeDms",
    "293": "https://youtu.be/nYtiQws5r0Y",
    "294": "https://youtu.be/GojAozt3ZmU",
    "295": "https://youtu.be/66cMy28AHfQ",
    "296": "https://youtu.be/ZEdi7WrU15k",
    "297": "https://youtu.be/8aBA0I1RJAY",
    "298": "https://youtu.be/3eoGXJD901Y",
    "299": "https://youtu.be/pKZuOn8OnfI",
    "300": "https://youtu.be/-NxBYWfzVSE",
    "301": "https://youtu.be/_0nSImOyj-I",
    "302": "https://youtu.be/RwdQcDppL-I",
    "303": "https://youtu.be/XZqqBLNUJC8",
    "304": "https://youtu.be/QI326nhY7S4",
    "305": "https://youtu.be/5SUPT4hBkd4",
    "306": "https://youtu.be/bWWFw9YVkMo",
    "307": "https://youtu.be/LfRS2TJBm6o",
    "308": "https://youtu.be/2tR_c0YCiVk",
    "309": "https://youtu.be/GEcHbmacEnE",
    "310": "https://youtu.be/vWUjK4LHLiA",
    "311": "https://youtu.be/_2PSdci0aZ8",
    "312": "https://youtu.be/8dnm68CgTrY",
    "313": "https://youtu.be/g1xliS2fU7w",
    "314": "https://youtu.be/lpMzMe5t6Nk",
    "315": "https://youtu.be/DD5soDBWLQw",
    "316": "https://youtu.be/rzMm0tzU_7c",
    "317": "https://youtu.be/Tc5ywiiwJKs",
    "318": "https://youtu.be/Elij7mwj-Us",
    "319": "https://youtu.be/8NdGO12THDM",
    "320": "https://youtu.be/sIh0pariFWM",
    "321": "https://youtu.be/G8dE1drPi1E",
    "322": "https://youtu.be/grx6juzgYGI",
    "323": "https://youtu.be/ZF8qZC7gIkM",
    "324": "https://youtu.be/gAfXPDVtslQ",
    "325": "https://youtu.be/V002AvKxV7g",
    "326": "https://youtu.be/BIVJFdhcKc0",
    "327": "https://youtu.be/BSY5gWoFkM4",
    "328": "https://youtu.be/9MKJbv8t_r4",
    "329": "https://youtu.be/5wgS4yQJxu0",
    "330": "https://youtu.be/K1VOzu-BCSs",
    "331": "https://youtu.be/ljeD3LjEKjY",
    "333": "https://youtu.be/GvhAWGxbazE",
    "334": "https://youtu.be/f8QVhQNfYPs",
    "335": "https://youtu.be/w_iK0q1f-ts",
    "336": "https://youtu.be/StoORYyCk64",
    "337": "https://youtu.be/7m0qT2nMXAA",
    "338": "https://youtu.be/yekGTrVDVJc",
    "339": "https://youtu.be/Y3S48zoVm8k",
    "340": "https://youtu.be/MhcbuJX8aIo",
    "341": "https://youtu.be/8_zErzQ7B8w",
    "342": "https://youtu.be/IQO_uFNGYw4",
    "343": "https://youtu.be/RkuclP1o6Gs",
    "344": "https://youtu.be/xcRRBDYsyw4",
    "345": "https://youtu.be/_SivVAN1Smk",
    "346": "https://youtu.be/geMKEJAYmwk",
    "347": "https://youtu.be/JWc0aaR8U0k",
    "348": "https://youtu.be/NBIZUDAUdwk",
    "349": "https://youtu.be/AykI9CYJu2M",
    "350": "https://youtu.be/YuMwmmX6d7U",
    "351": "https://youtu.be/Un-lrIWQBS8",
    "353": "https://youtu.be/mXlYAG2RXoE",
    "354": "https://youtu.be/18sIFcGDKkU",
    "355": "https://youtu.be/pdxOIhRkNag",
    "356": "https://youtu.be/5Xjrjg9PnEI",
    "357": "https://youtu.be/_ShGjYCb1jc",
    "358": "https://youtu.be/k5FtftMqcfI",
    "359": "https://youtu.be/9Rl76XmkoT4",
    "360": "https://youtu.be/fsGRo9YXGcI",
    "361": "https://youtu.be/-jGDkMY1vwo",
    "362": "https://youtu.be/1JfENacDeOo",
    "363": "https://youtu.be/LAFpAeTqZs0",
    "364": "https://youtu.be/5vXWVw08Wog",
    "365": "https://youtu.be/Y0Q60vd6X6U",
    "366": "https://youtu.be/nfwxW4ekG4I",
    "367": "https://youtu.be/OpO6aQA97ZA",
    "368": "https://youtu.be/18szjZN-LS8",
    "369": "https://youtu.be/tuYP5z8TayI",
    "371": "https://youtu.be/_CI517Ja2mw",
    "372": "https://youtu.be/LgUi_JLlB58",
    "373": "https://youtu.be/ufouaD8Akk8",
    "374": "https://youtu.be/s79mzwQJ_u4",
    "375": "https://youtu.be/a5Kk8YJpu3s",
    "376": "https://youtu.be/IDnCEXHZ1qY",
    "377": "https://youtu.be/Z4y3bFB8Eqg",
    "378": "https://youtu.be/2QeyPsLHb-A",
    "379": "https://youtu.be/EhGa_66G6Fg",
    "380": "https://youtu.be/i4iopDFmll0",
    "381": "https://youtu.be/hm7JCn7IZoE",
    "382": "https://youtu.be/v2xG6-8Za58",
    "383": "https://youtu.be/cFfXUEGg6po",
    "384": "https://youtu.be/w3H7A2ZaB8Y",
    "385": "https://youtu.be/srFN4dpgUck",
    "386": "https://youtu.be/Rz1l1D0DHPs",
    "387": "https://youtu.be/yyYzysL9W5g",
    "388": "https://youtu.be/R_djirY5eFM",
    "389": "https://youtu.be/bt2aHhvH2VA",
    "390": "https://youtu.be/HXjgSktOxFQ",
    "391": "https://youtu.be/c5MpRabp-bA",
    "292": "https://youtu.be/41sy3RzjQKI",
    "393": "https://youtu.be/G-hv00FK9D8",
    "394": "https://youtu.be/1C0sYpJLs8k",
    "395": "https://youtu.be/u26Ubzn66M0",
    "396": "https://youtu.be/I4iwYu6D0kQ",
    "397": "https://youtu.be/zhJ_8Xm5G7M",
    "398": "https://youtu.be/lFjEOUWmUwQ",
    "400": "https://youtu.be/rHBnelg_06Q",
    "401": "https://youtu.be/D45xicJI4Pk",
    "402": "https://youtu.be/8vH4ImSUUCI",
    "403": "https://youtu.be/0A7We_IarME",
    "404": "https://youtu.be/JK0LBuG9yPU",
    "405": "https://youtu.be/VOAzqVvgXWg",
    "407": "https://youtu.be/EWLO3nvZKB8",
    "408": "https://youtu.be/2ShKhjRpHlk",
    "409": "https://youtu.be/J4_pNQXqVMg",
    "410": "https://youtu.be/9N7xn1cqKNw",
    "411": "https://youtu.be/AvEIUR1kwYs",
    "412": "https://youtu.be/mdAIGHP6XFM",
    "413": "https://youtu.be/_OhTRbX47FU",
    "414": "https://youtu.be/glvM7SDpJ-Q",
    "415": "https://youtu.be/W18pI_wXQEQ",
    "417": "https://youtu.be/hpjOqlBjxcQ",
    "418": "https://youtu.be/wMdkNKxQjjQ",
    "419": "https://youtu.be/BPC0e-GCo3Q",
    "420": "https://youtu.be/ZaXT_SPs-OI",
    "421": "https://youtu.be/CprQJ1NGMAo",
    "422": "https://youtu.be/A48NKuqqheQ",
    "423": "https://youtu.be/sFdqAnsu-20",
    "424": "https://youtu.be/bPMt0dkvZpw",
    "425": "https://youtu.be/dm_gPAQmsrE",
    "426": "https://youtu.be/_2Mv4D73r7E",
    "427": "https://youtu.be/UTB6a5JVTFk",
    "428": "https://youtu.be/Ti7vWkLbszY",
    "429": "https://youtu.be/7mdxQNB4gKE",
    "430": "https://youtu.be/q-hsRupgHoQ",
    "431": "https://youtu.be/OuV7rqI6UIE",
    "432": "https://youtu.be/m5Cr6D7Eo_s",
    "433": "https://youtu.be/qw4As2JYAMk",
    "434": "https://youtu.be/YxeWVzrhPco",
    "435": "https://youtu.be/Jf0n-IcJQEQ",
    "437": "https://youtu.be/T5hsBXHcEnk",
    "438": "https://youtu.be/YdOULFiRtKQ",
    "439": "https://youtu.be/Fg02kMBx7og",
    "440": "https://youtu.be/LoJhhg9fcr0",
    "441": "https://youtu.be/-vSdikGjFJM",
    "442": "https://youtu.be/tL1RxZ9p6aM",
    "443": "https://youtu.be/XtuqFOT3JDs",
    "444": "https://youtu.be/j-TFiC22iGc",
    "445": "https://youtu.be/4_aBQgvdJaU",
    "446": "https://youtu.be/RQu4oj6yreA",
    "447": "https://youtu.be/eSh0H8s_JK0",
    "448": "https://youtu.be/cSOtyb21eU4",
    "449": "https://youtu.be/jhgWJI2YUWc",
    "450": "https://youtu.be/ZMtuv3IOyjo",
    "451": "https://youtu.be/Y-RxtOa1YMw",
    "452": "https://youtu.be/yUUyuEiohVs",
    "453": "https://youtu.be/r5YnGyKyFiI",
    "454": "https://youtu.be/APStZsQQLkQ",
    "455": "https://youtu.be/Z2apDRQj_Dk",
    "456": "https://youtu.be/JRsrd5PgaMY",
    "457": "https://youtu.be/JtIH2aAHjkQ",
    "458": "https://youtu.be/mEkwcSachQk",
    "459": "https://youtu.be/dIR6G6fpY60",
    "460": "https://youtu.be/xaOvtWpgCwg",
    "461": "https://youtu.be/6mq7hz2Q0QI",
    "462": "https://youtu.be/iesV4g0029E",
    "463": "https://youtu.be/EpYOHm2zQr8",
    "464": "https://youtu.be/ExhQzV1Ix58",
    "465": "https://youtu.be/YPf_4GYTccw",
    "466": "https://youtu.be/wVVm-R9gFM8",
    "467": "https://youtu.be/kv5-iRK8mcw",
    "468": "https://youtu.be/UPxGPs8D2vQ",
    "469": "https://youtu.be/RSHtehUmbyQ",
    "470": "https://youtu.be/yIiyhdsJ6wY",
    "471": "https://youtu.be/Hd0cFrU3Nsk",
    "472": "https://youtu.be/4IXdZvyiLBc",
    "473": "https://youtu.be/kQBUR5UA75A",
    "474": "https://youtu.be/k-pUviZyscM",
    "475": "https://youtu.be/2uIzYpli1aE",
    "476": "https://youtu.be/HC6EWuBJVXE",
    "477": "https://youtu.be/ipMDuJv4KEI",
    "478": "https://youtu.be/kn8tXFzfiGA",
    "479": "https://youtu.be/Hliic8-tWWU",
    "480": "https://youtu.be/8ppMNZYulRU",
    "481": "https://youtu.be/mHi5I8ceMiM",
    "482": "https://youtu.be/99eqyXA8Qe0",
    "483": "https://youtu.be/rROW5f5_uEQ",
    "484": "https://youtu.be/jqSPN2HeSu0",
    "485": "https://youtu.be/olwSHVKOoHc",
    "486": "https://youtu.be/mP8hUBDdJwc",
    "487": "https://youtu.be/P2IdvjTXz_I",
    "489": "https://youtu.be/JnyOidws8W4",
    "490": "https://youtu.be/yrcDCEa9iAw",
    "491": "https://youtu.be/sPhV7gUIGxo",
    "492": "https://youtu.be/IJmOg0kgHJc",
    "493": "https://youtu.be/KF128_GXMVg",
    "494": "https://youtu.be/BU0ayUodoeg",
    "495": "https://youtu.be/nfKLkKWbjFE",
    "496": "https://youtu.be/RpMTLkzN_Dc",
    "497": "https://youtu.be/6SEhZ-i5k-g",
    "498": "https://youtu.be/LDXEXoPRLNY",
    "499": "https://youtu.be/wgSodrTEF54",
    "500": "https://youtu.be/upk1_yLMYWQ",
    "501": "https://youtu.be/bYqFUyquvfc",
    "502": "https://youtu.be/ZEQCPDPIh3s",
    "503": "https://youtu.be/2a_Cuaw2CG4",
    "504": "https://youtu.be/6pyJ8m-nyOo",
    "505": "https://youtu.be/n-Bw0k_MmIw",
    "506": "https://youtu.be/YfKzXzhSELc",
    "507": "https://youtu.be/GSvLpAS3WSo",
    "508": "https://youtu.be/5hvH4iI06AQ",
    "509": "https://youtu.be/UeiYATQjb4s",
    "510": "https://youtu.be/l2V4hXkD4io",
    "511": "https://youtu.be/wpoJ2nO-SD4",
    "512": "https://youtu.be/6djUM0Q7tzQ",
    "513": "https://youtu.be/GGlSu_G86mc",
    "514": "https://youtu.be/lHtc2m1a4Ec",
    "515": "https://youtu.be/NxtYcIvy79s",
    "516": "https://youtu.be/wcneq9Hp-SY",
    "517": "https://youtu.be/VS07hz9RB8Q",
    "518": "https://youtu.be/xbuu-33oraE",
    "519": "https://youtu.be/u82CvzPjo5g",
    "520": "https://youtu.be/iBqWi1iRUB8",
    "521": "https://youtu.be/eg93M-hm88Y",
    "523": "https://youtu.be/YhRJD-IEzbk",
    "522": "https://youtu.be/spww652ub7g",
    "524": "https://youtu.be/ertfqyyIXvU",
    "525": "https://youtu.be/R_VGDz8vAR4",
    "526": "https://youtu.be/8p6fOEGOAqo",
    "527": "https://youtu.be/gr9aeW2WuwI",
    "528": "https://youtu.be/rilnei-AI2g",
    "529": "https://youtu.be/4Y9AQVSQ_Yc",
    "530": "https://youtu.be/yeeBTq0ohcM",
    "531": "https://youtu.be/uVuTdP1XgXE",
    "532": "https://youtu.be/gveriLrRj10",
    "533": "https://youtu.be/lb-6v6ibYb4",
    "534": "https://youtu.be/IFAF6unNfAo",
    "535": "https://youtu.be/hWwVM4ijWC8",
    "536": "https://youtu.be/l_5BQcP2BgU",
    "537": "https://youtu.be/Fr2QBc93Peo",
    "538": "https://youtu.be/zlx71x_BPdc",
    "539": "https://youtu.be/Abb1TRROU8w",
    "540": "https://youtu.be/1CddkC7mZig",
    "541": "https://youtu.be/O-FFvSz29-s",
    "542": "https://youtu.be/Ss8RFcqPFt4",
    "543": "https://youtu.be/go8owalfpaA",
    "544": "https://youtu.be/s7lpOFV_e0Q",
    "545": "https://youtu.be/Q7R-SNYgLms",
    "546": "https://youtu.be/pYVUj6BoYJ8",
    "547": "https://youtu.be/ftthgPjtns4",
    "548": "https://youtu.be/oAh3FtpR4r0",
    "549": "https://youtu.be/vXA5LJEam3M",
    "550": "https://youtu.be/Lxj-o9iysfA",
    "551": "https://youtu.be/4QGaRKU5puc",
    "552": "https://youtu.be/Yp_KdCNvkPU",
    "553": "https://youtu.be/zUGnSpjoPgw",
    "554": "https://youtu.be/U-0RIirj2nI",
    "555": "https://youtu.be/a6jbGDSpfC4",
    "556": "https://youtu.be/aX8hiAQG_ps",
    "557": "https://youtu.be/h_LaWNiOIog",
    "588": "https://youtu.be/bs_HcXZ7Zq4",
    "559": "https://youtu.be/bJueKo4tNJY",
    "560": "https://youtu.be/15HufCvf8aY",
    "561": "https://youtu.be/N6lGeGM682w",
    "562": "https://youtu.be/wUSjNpteSis",
    "563": "https://youtu.be/2PQOOxZJJ4w",
    "564": "https://youtu.be/c0fCTH06YeE",
    "565": "https://youtu.be/2Dp39iLcuwg",
    "566": "https://youtu.be/TP49zbaquIs",
    "568": "https://youtu.be/M6HRiEFUsGM",
    "569": "https://youtu.be/jEPOPqvTn5g",
    "570": "https://youtu.be/pp79C6_GT7A",
    "571": "https://youtu.be/x4cMM2kGG2I",
    "572": "https://youtu.be/sZU4j1AEf-s",
    "573": "https://youtu.be/i7qkYGZR8nY",
    "574": "https://youtu.be/yDkbS7S09IY",
    "575": "https://youtu.be/rop6ABzeLvw",
    "576": "https://youtu.be/mD5B1PBnLwU",
    "577": "https://youtu.be/FQeer7Swgig",
    "578": "https://youtu.be/Xn5jCocJ_qY",
    "579": "https://youtu.be/bRBu-hZpT8U",
    "580": "https://youtu.be/NX7avMqR65o",
    "581": "https://youtu.be/sLDRjDDR3Bw",
    "582": "https://youtu.be/Yt9uMuUMzqM",
    "583": "https://youtu.be/OspwEFXQLrs",
    "584": "https://youtu.be/kuGkobTyGL0",
    "585": "https://youtu.be/74KLx6tgqmo",
    "586": "https://youtu.be/18L_ozIhA3Q",
};


// addEditorButton
function makeEditorButton( idName, buttonText, info ) {
    var button = document.createElement( "span" ),
        linkWrapper = document.createElement( "a" ),
        icon = document.createElement( "span" ),
        label = document.createElement( "span" );

    button.className = "tool oo-ui-widget oo-ui-widget-enabled oo-ui-toggleWidget oo-ui-toggleWidget-off oo-ui-buttonElement oo-ui-buttonElement-frameless oo-ui-iconElement oo-ui-toggleButtonWidget";
    button.id = idName;

    linkWrapper.className = "oo-ui-buttonElement-button";
    linkWrapper.title = info;
    linkWrapper.accessKey = "y";

    icon.className = "fa fa-lg fa-nothing has-label";

    label.className = "oo-ui-labelElement-label";
    label.textContent = buttonText;

    linkWrapper.append( icon, label );
    button.append( linkWrapper );

    return button;
}

function playerHeaderWithVideoAudio( header ) {
    if( header.indexOf( "video=" ) == -1 ) {
        header = header.replace( /^{{Player((?:\|mode=[^|\n}]+)?)/, "{{Player$1|video=audio" );
    }
    return header;
}

function playerUrlLine( url, number ) {
    return " |" + ( url.indexOf( "=" ) == -1 ? "" : number + "=" ) + url;
}

function playerUrlValue( line ) {
    var match = line.match( /^ \|(?:\d+=)?(https?:\/\/.+)$/ );
    return match ? match[1] : "";
}

function newPlayerTemplate( url ) {
    return "{{Player|video=audio\n" + playerUrlLine( url, 1 ) + "\n}}";
}

function addYouTubeUrlToPlayer( text, url ) {
    return text.replace( /{{Player[^}]*}}/, function( player ) {
        var lines = player.split( "\n" ),
            header = playerHeaderWithVideoAudio( lines.shift() ),
            urlLines = [],
            footerLines = [];

        if( lines.length == 0 ) {
            return header.replace( /^(\{\{Player)([^}]*)\|(?:1=)?(https?:\/\/.+)\}\}$/, function( match, templateStart, options, oldUrl ) {
                var urls = [ url, oldUrl ];
                if( options.indexOf( "mode=" ) == -1 ) {
                    options = "|mode=mirrors" + options;
                }
                header = playerHeaderWithVideoAudio( templateStart + options );
                return header + "\n" + urls.map(function( thisUrl, index ) {
                    return playerUrlLine( thisUrl, index + 1 );
                }).join( "\n" ) + "\n}}";
            });
        }

        lines.forEach(function( line ) {
            if( playerUrlValue( line ) ) {
                urlLines.push( line );
            } else {
                footerLines.push( line );
            }
        });

        if( header.indexOf( "mode=" ) == -1 && urlLines.length > 0 ) {
            header = header.replace( /^{{Player/, "{{Player|mode=mirrors" );
        }
        header = playerHeaderWithVideoAudio( header );

        urlLines = [ url ].concat( urlLines.map( playerUrlValue ) ).map(function( thisUrl, index ) {
            return playerUrlLine( thisUrl, index + 1 );
        });

        return [ header ].concat( urlLines, footerLines ).join( "\n" );
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
        case "autoYTurls":
            log( "doing autoYTurls" );
            if( textOrig.match(/(?:youtube\.com|youtu\.be)/) ) {
                $("#autoYTurls a").remove();
                skipSave = true;
            } else {
                textReplaced = addYouTubeUrlToPlayer( text, url );

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /\|}\n\n== (Notes|Tracklist) ==/, '|}\n\n' + newPlayerTemplate( url ) + '\n\n== $1 ==' ); // No URL after wikitable, add new player
                }

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /(\n\n)(== (Notes|Tracklist) ==)/, '\n\n' + newPlayerTemplate( url ) + '\n\n$2' ); // No URL or wikitable, add new player before section
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
            var epId = wgTitle.replace( /^(?:.+ - .+ - )Invite's Choice (\d+).*$/, "$1" ).trim();

            var epUrl = episodes_arr[epId];
            logVar( "epId", epId +" "+ epUrl );

            waitForKeyElements("form#editform .wikiEditor-ui-toolbar .group-insert", function(jNode) {
                var toolbar = jNode;
                var playersLabel = document.createElement( "span" );
                playersLabel.className = "left5";
                playersLabel.textContent = "Players:";
                toolbar.append( playersLabel );

                // add button 1=
                var toolNumberPlayerUrls = makeEditorButton( "refrenceUrls", "1=", "Reference URLs (if all unreferenced): |1=URL1 |2=URL2 etc." );
                toolbar.append( toolNumberPlayerUrls );

                // add button YT
                if( episodes_arr[epId] ) {
                    var toolNumberPlayerUrls = makeEditorButton( "autoYTurls", "YT", "Insert YouTube episode URL from array" );
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

        // autoYTurls
        waitForKeyElements("#autoYTurls a", function(jNode){
            // auto click if button is added
            replaceAndSave( "autoYTurls", epUrl );
        });


        /*
         * On MixesDB:Explorer
         * Add a link ot the results header to open all edit links
         */
        if( wgPageName == "MixesDB:Explorer/Mixes" || wgPageName == "MixesDB:Explorer/Lists" ) {
            var editAllRes = document.createElement( "a" );
            editAllRes.id = "editAllRes";
            editAllRes.style.cssFloat = "right";
            editAllRes.href = "#";
            editAllRes.textContent = "Edit all results";
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