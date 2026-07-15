// ==UserScript==
// @name         YouTube Player URLs (private)
// @version      2026.07.14.8
// @description  Add YouTube player URLs from array to mix pages when episode numbers match the mix page title
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-YouTube_Player_URLs_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/funcs.js?v-2026.07.14.1
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// Embedding manually is OK, since teh sh script is run locally anyways
// Saves teh commit
var episodes_arr = {
    "132": "https://youtu.be/hWl4-ndTynM",
    "133": "https://youtu.be/xdqfB9JQs_8",
    "134": "https://youtu.be/StLKguqYeC0",
    "135": "https://youtu.be/SWkd3ns288U",
    "136": "https://youtu.be/Fk0GoTV0-KA",
    "137": "https://youtu.be/vhgRRsX_zP8",
    "138": "https://youtu.be/hm7X8Fpf59Y",
    "139": "https://youtu.be/Jj49VcrM9js",
    "140": "https://youtu.be/0RZivmf7K34",
    "141": "https://youtu.be/h9l8uQ-fBPo",
    "142": "https://youtu.be/sqzhdvW6PeU",
    "143": "https://youtu.be/UUKnEFDx16k",
    "144": "https://youtu.be/4G754vf0Ds8",
    "145": "https://youtu.be/V121QBryGwg",
    "146": "https://youtu.be/_5MgCULldJc",
    "147": "https://youtu.be/gBnZcFmgJ_4",
    "148": "https://youtu.be/bOomc22rCEc",
    "149": "https://youtu.be/z7Oe8Kl-yeg",
    "150": "https://youtu.be/IUxG4pAfGAw",
    "151": "https://youtu.be/LK568n6C1v0",
    "152": "https://youtu.be/7x85eMECujs",
    "153": "https://youtu.be/Xxs3nUavW-Y",
    "154": "https://youtu.be/L47OxGbNt8w",
    "155": "https://youtu.be/t-jcepKvf0g",
    "156": "https://youtu.be/4HY2ihXPqCM",
    "157": "https://youtu.be/GJvasx6hkxw",
    "158": "https://youtu.be/jL5h1lOCPA4",
    "159": "https://youtu.be/y5pFeZWVWhk",
    "160": "https://youtu.be/cISEmFeMqSU",
    "161": "https://youtu.be/P-ZaE0vjWKo",
    "162": "https://youtu.be/w7bs7hV6Hhs",
    "164": "https://youtu.be/ALYidnl7U8s",
    "165": "https://youtu.be/hDmPTHOtXj8",
    "166": "https://youtu.be/d7IHet1lloU",
    "167": "https://youtu.be/78HiYpWhHE0",
    "168": "https://youtu.be/3gTOrUoG-kU",
    "169": "https://youtu.be/fgta_BR0jB0",
    "170": "https://youtu.be/72zXYXCeKu0",
    "171": "https://youtu.be/0I-aOMfT2cI",
    "172": "https://youtu.be/rA1H2iOGXF4",
    "173": "https://youtu.be/YRcFcrSBQMI",
    "174": "https://youtu.be/HyvvUZe8qlU",
    "175": "https://youtu.be/U2os_V8QJJw",
    "176": "https://youtu.be/ZW22IfYzXhE",
    "177": "https://youtu.be/SMijjvT7M-A",
    "178": "https://youtu.be/sjKXGHgwQDo",
    "179": "https://youtu.be/RhOoG1eeXXI",
    "180": "https://youtu.be/HPNxa3AtjaA",
    "181": "https://youtu.be/0yE7LgJeCLo",
    "182": "https://youtu.be/KIlJ7gKWIyo",
    "183": "https://youtu.be/9VRzrcTYts4",
    "184": "https://youtu.be/wB1sKNhGR1E",
    "185": "https://youtu.be/8ihNfzfA02Y",
    "186": "https://youtu.be/x8w2G3cYaVw",
    "187": "https://youtu.be/iTYKNc1dcgc",
    "188": "https://youtu.be/vIMkKrD9mg0",
    "189": "https://youtu.be/ER20Z4NT7JI",
    "190": "https://youtu.be/CI9adDwNxFM",
    "191": "https://youtu.be/Ajtacne_xCk",
    "192": "https://youtu.be/tyPGE6QZQ9U",
    "193": "https://youtu.be/XkQZDtPnpuI",
    "194": "https://youtu.be/DvZW9XALEj4",
    "195": "https://youtu.be/Gvpz4gpcYvA",
    "196": "https://youtu.be/WcVvNitSYzk",
    "197": "https://youtu.be/z_3FIEefAU8",
    "198": "https://youtu.be/lrUnulgppoM",
    "199": "https://youtu.be/ZPuNyf3MQEM",
    "200": "https://youtu.be/NvtpbByOuhs",
    "201": "https://youtu.be/jH0ml-UfvOw",
    "202": "https://youtu.be/aPmeb85cP3I",
    "203": "https://youtu.be/rYy-THAnq_U",
    "204": "https://youtu.be/0RxQBHhmezQ",
    "205": "https://youtu.be/JPzo66hfszc",
    "206": "https://youtu.be/qkgKDwALz88",
    "207": "https://youtu.be/QGCZA9M3odo",
    "208": "https://youtu.be/ypq0vdVhHqo",
    "209": "https://youtu.be/DPK2l28giC8",
    "210": "https://youtu.be/9PMHujSdSJs",
    "211": "https://youtu.be/k5SfOvG6Q64",
    "212": "https://youtu.be/AW0YQRGi4qI",
    "213": "https://youtu.be/6N6yZfj2oLs",
    "214": "https://youtu.be/fSiPMFM71gc",
    "215": "https://youtu.be/qQnp_hLOfxQ",
    "216": "https://youtu.be/YDN5gjPva8U",
    "217": "https://youtu.be/BYrHXoaaBuU",
    "218": "https://youtu.be/w8e7_R4EJiE",
    "219": "https://youtu.be/6DDkidQXitI",
    "220": "https://youtu.be/E268GZDS7Ds",
    "221": "https://youtu.be/K0F12CrUVO8",
    "222": "https://youtu.be/ktLYsPBggJk",
    "223": "https://youtu.be/mfQE8KxPv_4",
    "224": "https://youtu.be/pShkqUXa-E4",
    "225": "https://youtu.be/tpy63BQrsMk",
    "226": "https://youtu.be/FWXCnViS1Mg",
    "227": "https://youtu.be/hR4K5lQnqT0",
    "228": "https://youtu.be/BTxLLhp7SCs",
    "229": "https://youtu.be/EN5MAKek3u4",
    "230": "https://youtu.be/3iNMc2jYivI",
    "231": "https://youtu.be/50ZqYe6RbiM",
    "232": "https://youtu.be/kv1tX7qDar0",
    "233": "https://youtu.be/2TacBc7RcDc",
    "234": "https://youtu.be/eNyeTmTRwSA",
    "235": "https://youtu.be/w7HdO3fXx_4",
    "236": "https://youtu.be/JoEnwXzxT1g",
    "237": "https://youtu.be/DYR5vxVKNkg",
    "238": "https://youtu.be/1ejEw7leoig",
    "239": "https://youtu.be/oLQVqSomFFo",
    "240": "https://youtu.be/mmOhnJx71w8",
    "241": "https://youtu.be/yIk1HxGZItA",
    "242": "https://youtu.be/ONS-VzDYR1U",
    "243": "https://youtu.be/kK6lzVMdatY",
    "244": "https://youtu.be/-aHfz4CX7Mo",
    "245": "https://youtu.be/8BRKUEWfRBE",
    "246": "https://youtu.be/LpCqTbmiZ6c",
    "247": "https://youtu.be/8nndcQpjhqE",
    "248": "https://youtu.be/prjAnjC1nXA",
    "249": "https://youtu.be/MO9jgsyjbj0",
    "250": "https://youtu.be/-u1uAndyXbg",
    "251": "https://youtu.be/3TkG1d9QTi8",
    "252": "https://youtu.be/fnR1WflDeV8",
    "253": "https://youtu.be/HS8sXjiU3N0",
    "254": "https://youtu.be/FooXgfKC_Ek",
    "255": "https://youtu.be/PLU8x_fuSbs",
    "256": "https://youtu.be/14o9TzhyMgg",
    "257": "https://youtu.be/78JnhX4AoSA",
    "258": "https://youtu.be/K8Dkpo4XL6c",
    "259": "https://youtu.be/DBdJfix3RoE",
    "260": "https://youtu.be/BXVBxnBO0Gg",
    "261": "https://youtu.be/BkO_hvtGcto",
    "262": "https://youtu.be/xuaEmDRouvc",
    "263": "https://youtu.be/yxdN7i0mcaI",
    "264": "https://youtu.be/KKYEKkCH8oo",
    "265": "https://youtu.be/6d8rzYoFyuA",
    "266": "https://youtu.be/Uk20L4pJO70",
    "267": "https://youtu.be/g47B4T158yw",
    "268": "https://youtu.be/q_zszYFQSIU",
    "269": "https://youtu.be/lTGzGGJ-Kv8",
    "270": "https://youtu.be/GIvdKjea9LU",
    "271": "https://youtu.be/sxyf9svYM8U",
    "272": "https://youtu.be/4gEr_UcKDkE",
    "273": "https://youtu.be/zHo010AzsYk",
    "274": "https://youtu.be/tWvy1UhFWmM",
    "275": "https://youtu.be/FWbipLJjZI0",
    "276": "https://youtu.be/3eSq1FI3UUQ",
    "277": "https://youtu.be/Vcojn2rWbNA",
    "278": "https://youtu.be/4zi2JlUoypM",
    "279": "https://youtu.be/3gR15wUdd5k",
    "280": "https://youtu.be/1_tcXSXypxM",
    "281": "https://youtu.be/T5os2HCzi80",
    "282": "https://youtu.be/kRNfbbUMW2Y",
    "283": "https://youtu.be/l8h1wypNOyY",
    "284": "https://youtu.be/hdWfMDtImro",
    "285": "https://youtu.be/4NdRBGid3vU",
    "286": "https://youtu.be/KPzy1w5w8is",
    "287": "https://youtu.be/Vk2h0oGo1DE",
    "288": "https://youtu.be/wIdQLArMr3c",
    "289": "https://youtu.be/n_PxpYYHci4",
    "290": "https://youtu.be/RGqxUnjKzkw",
    "291": "https://youtu.be/LFnL3cm4iPI",
    "292": "https://youtu.be/kiBIaUxsziI",
    "293": "https://youtu.be/K6ygVKLuj38",
    "294": "https://youtu.be/pqeRjM9RKQc",
    "295": "https://youtu.be/oO0SdvQos_A",
    "296": "https://youtu.be/L3iPT8q9r3E",
    "297": "https://youtu.be/tFTnYvVytrU",
    "298": "https://youtu.be/pc92r0Tlakk",
    "299": "https://youtu.be/DILmqKTvexU",
    "300": "https://youtu.be/edT5Nhwaldo",
    "301": "https://youtu.be/5zQNHM9P08I",
    "302": "https://youtu.be/C6QPUJkiAm4",
    "303": "https://youtu.be/6-tWvZNw-KM",
    "304": "https://youtu.be/SivK9ENCnQo",
    "305": "https://youtu.be/1ZN3qR3SahQ",
    "306": "https://youtu.be/BNJEG_eArmQ",
    "307": "https://youtu.be/6LnP4gV1hkY",
    "308": "https://youtu.be/ecc3wEAHgE4",
    "309": "https://youtu.be/KG-T10oIwMw",
    "310": "https://youtu.be/2pr9iOjQ8vo",
    "311": "https://youtu.be/hNGmNLU2G_0",
    "312": "https://youtu.be/9Ul_dwmNDTE",
    "313": "https://youtu.be/uNySovl7e7g",
    "314": "https://youtu.be/StwwW4xDi4w",
    "315": "https://youtu.be/YnUWCct6HQE",
    "316": "https://youtu.be/GhA4Cib1_vc",
    "317": "https://youtu.be/CREDi_dyKIA",
    "318": "https://youtu.be/DrUpzKbnz0o",
    "319": "https://youtu.be/mm06nTEN5MA",
    "320": "https://youtu.be/yMKG-q73Gtg",
    "321": "https://youtu.be/-2aRHcMnIbE",
    "322": "https://youtu.be/gH03M0gLfcY",
    "323": "https://youtu.be/AcNH7cirXB4",
    "324": "https://youtu.be/2_qMADFJ93w",
    "325": "https://youtu.be/r53w5N0tVj8",
    "326": "https://youtu.be/vi015c5Bu8s",
    "327": "https://youtu.be/IKCnjCJc4T4",
    "328": "https://youtu.be/FQpDZI6dLn8",
    "329": "https://youtu.be/xTkePuB8RfU",
    "330": "https://youtu.be/H0Q57pA5BAU",
    "331": "https://youtu.be/R93h7KT5Uys",
    "332": "https://youtu.be/_cVj5sOBKYE",
    "333": "https://youtu.be/aEm9CDV2L20",
    "334": "https://youtu.be/vG1eTxOvEfM",
    "335": "https://youtu.be/JDHR6wtBs5E",
    "336": "https://youtu.be/kqEbsI8knVk",
    "337": "https://youtu.be/EciokwdskZ4",
    "338": "https://youtu.be/qFHJkmVnwjc",
    "339": "https://youtu.be/WEfx7dezr6Q",
    "340": "https://youtu.be/QEsq4UTEVIA",
    "341": "https://youtu.be/240tOjacs4o",
    "342": "https://youtu.be/buEFai78zYo",
    "343": "https://youtu.be/KJjoYHHQwpU",
    "344": "https://youtu.be/otH7_fHRdAA",
    "345": "https://youtu.be/19pe9AXJcsc",
    "346": "https://youtu.be/qahg3LXw2e4",
    "347": "https://youtu.be/wmitTonWumA",
    "348": "https://youtu.be/CV9RgiB2iDg",
    "349": "https://youtu.be/PYOVOWSKPC0",
    "350": "https://youtu.be/hbL4xgDyTIs",
    "351": "https://youtu.be/pBpb_7Jl2p4",
    "352": "https://youtu.be/FZWzFgDqD0o",
    "353": "https://youtu.be/Eubo3SgePIs",
    "354": "https://youtu.be/hWkEpVo4-TY",
    "355": "https://youtu.be/k1CDQqIyFcs",
    "356": "https://youtu.be/spffJyp3oSA",
    "357": "https://youtu.be/SrkSm98shxo",
    "358": "https://youtu.be/BdbrNOp-z98",
    "359": "https://youtu.be/Aa9S-nLCZnU",
    "360": "https://youtu.be/g3g4W5poStg",
    "361": "https://youtu.be/ZjGXv7GV508",
    "362": "https://youtu.be/sSoWcvnqfGo",
    "363": "https://youtu.be/XH9JigQ6vJ4",
    "364": "https://youtu.be/YZN75pJDGZc",
    "365": "https://youtu.be/mBT5hycCfxk",
    "366": "https://youtu.be/b8NR7COZnm0",
    "367": "https://youtu.be/CyuxoaywE-A",
    "368": "https://youtu.be/cDNp42j9jV8",
    "369": "https://youtu.be/BlheB5gr9Jw",
    "370": "https://youtu.be/WEFhBer4NQQ",
    "371": "https://youtu.be/jPSXmyV-lDM",
    "372": "https://youtu.be/kUe_Q693gM0",
    "373": "https://youtu.be/q4Mk2GIq8MU",
    "374": "https://youtu.be/jLpD7W8VUmM",
    "375": "https://youtu.be/U4w1iCY1_CQ",
    "376": "https://youtu.be/puF95uXu0BQ",
    "377": "https://youtu.be/_-tUG3P4lVM",
    "378": "https://youtu.be/i_ZL7u3uKw8",
    "379": "https://youtu.be/b4nk_qPyrS8",
    "380": "https://youtu.be/O6GCstNYg4U",
    "381": "https://youtu.be/2QjekSZoe9g",
    "382": "https://youtu.be/FjkjdWNZfaI",
    "383": "https://youtu.be/Ckod2DgDLEI",
    "384": "https://youtu.be/2mlj5qymA34",
    "385": "https://youtu.be/Wgd5rIfRy-Y",
    "386": "https://youtu.be/l1mX-oMb7NI",
    "387": "https://youtu.be/MN4BcLcexh0",
    "388": "https://youtu.be/XQPqoxpMBPM",
    "389": "https://youtu.be/-yUdigqe0vg",
    "390": "https://youtu.be/u7zhnAVDctc",
    "390": "https://youtu.be/u7zhnAVDctc",
    "391": "https://youtu.be/1QOSH6DlOZk",
    "392": "https://youtu.be/y8luvEMdPK0",
    "393": "https://youtu.be/aTZKpepeYug",
    "394": "https://youtu.be/hGu00XnIWT0",
    "395": "https://youtu.be/jNC9bfFB3Tw",
    "396": "https://youtu.be/8_XWVSrJnCU",
    "397": "https://youtu.be/1RbR2_NIk4s",
    "398": "https://youtu.be/JTsjfO-H8tw",
    "399": "https://youtu.be/jpusSQNHC1Q",
    "400": "https://youtu.be/z4x3AF128XY",
    "401": "https://youtu.be/8jIryrN4cA8",
    "402": "https://youtu.be/mgvUdH8wbpQ",
    "403": "https://youtu.be/d1-ZcZXCvOw",
    "404": "https://youtu.be/qom1i29JITo",
    "405": "https://youtu.be/N4_bXgxU5XE",
    "406": "https://youtu.be/mcPbgWBS6b0",
    "406": "https://youtu.be/mcPbgWBS6b0",
    "407": "https://youtu.be/wu0iLeGwveM",
    "408": "https://youtu.be/U3_7ZqD2tXE",
    "408": "https://youtu.be/U3_7ZqD2tXE",
    "409": "https://youtu.be/2lnjQPAkhs4",
    "410": "https://youtu.be/YDprxQBfW9M",
    "411": "https://youtu.be/VlLUEaQTrYU",
    "412": "https://youtu.be/Fbw91fV35QQ",
    "413": "https://youtu.be/ansyqPvYp3U",
    "414": "https://youtu.be/won-oEspv4M",
    "415": "https://youtu.be/KVCv03mVzrs",
    "416": "https://youtu.be/AjuWdlDTLKs",
    "417": "https://youtu.be/Mq0-NvWV5f4",
    "418": "https://youtu.be/m--4mt4vAus",
    "419": "https://youtu.be/JZEfB_UTi14",
    "420": "https://youtu.be/STmnFz5sc0I",
    "421": "https://youtu.be/IHxIcdvVoi0",
    "422": "https://youtu.be/ZswRmhuGilw",
    "423": "https://youtu.be/7Dw0sLI5h8c",
    "424": "https://youtu.be/mn8tCjaSAiY",
    "425": "https://youtu.be/R4mzQxPYCtU",
    "426": "https://youtu.be/_Cw89tm2Bws",
    "427": "https://youtu.be/_APn6dluVMs",
    "428": "https://youtu.be/DU9t70Pgc9s",
    "429": "https://youtu.be/OgHueYztrD8",
    "430": "https://youtu.be/lLg4sUPTxLY",
    "431": "https://youtu.be/MT0cpgZZCqQ",
    "432": "https://youtu.be/F4rgo3bM0lA",
    "433": "https://youtu.be/SgDEBBmY94g",
    "434": "https://youtu.be/JG0nn-00qiE",
    "435": "https://youtu.be/8xMNcwtOYTg",
    "436": "https://youtu.be/aztd5hQNMbE",
    "437": "https://youtu.be/Y7m3NTvvu_0",
    "438": "https://youtu.be/wx2Qq3jNjF8",
    "439": "https://youtu.be/LhNfKz0L6Tg",
    "440": "https://youtu.be/e0aaaGA5A-A",
    "441": "https://youtu.be/d-gM2cU8cOw",
    "442": "https://youtu.be/gv6dXWqf_PE",
    "443": "https://youtu.be/O2NovCxD3hY",
    "444": "https://youtu.be/24HWt52M5r4",
    "445": "https://youtu.be/ENKCe37Wmhc",
    "446": "https://youtu.be/2LjIgVhVK-E",
    "447": "https://youtu.be/znYhXKpf9to",
    "448": "https://youtu.be/an5ZHDMeJkg",
    "449": "https://youtu.be/ksUQnuXWf3Q",
    "450": "https://youtu.be/Bc2MK8SOEWM",
    "451": "https://youtu.be/JgWgUPirfwE",
    "452": "https://youtu.be/CEpZXAAuDS4",
    "453": "https://youtu.be/jhQwR0fakyo",
    "454": "https://youtu.be/o5cU8VcPkV0",
    "455": "https://youtu.be/7DuJhN1t6yA",
    "456": "https://youtu.be/uy6WsJBKoDM",
    "457": "https://youtu.be/azDdr0Yet3s",
    "458": "https://youtu.be/F19bO7euVGQ",
    "459": "https://youtu.be/78XE9ujmF3w",
    "460": "https://youtu.be/Mw13xn-mzB8",
    "461": "https://youtu.be/FI7T2CItFtQ",
    "462": "https://youtu.be/KM2ctd3Js9c",
    "463": "https://youtu.be/vXcv55bQWaM",
    "464": "https://youtu.be/hfpdmAGkeeA",
    "465": "https://youtu.be/_NuleP23fLM",
    "466": "https://youtu.be/O7TGa6pYOWQ",
    "467": "https://youtu.be/2SXlVvrR9Hk",
    "468": "https://youtu.be/14iElQn-I0M",
    "469": "https://youtu.be/V48PjR1Xfnc",
    "470": "https://youtu.be/M8uH5w-o9jU",
    "471": "https://youtu.be/IGgn22LE84w",
    "472": "https://youtu.be/H9M5NiWwujw",
    "473": "https://youtu.be/bON9KvWGnwM",
    "474": "https://youtu.be/dejNMY93ZbM",
    "475": "https://youtu.be/yVwdPKNtuDI",
    "476": "https://youtu.be/RrqUOkzTJJo",
    "477": "https://youtu.be/vxReeodUGvw",
    "478": "https://youtu.be/kTkopud5Q7g",
    "479": "https://youtu.be/5BKNYX97LRk",
    "480": "https://youtu.be/KSxpyfpj9LA",
    "481": "https://youtu.be/0iH5rs54Qjg",
    "482": "https://youtu.be/xO5OLeCpH2o",
    "483": "https://youtu.be/8itPaKfv3i8",
    "484": "https://youtu.be/3SiMewTJJNE",
    "485": "https://youtu.be/p5cYKbd41Gs",
    "486": "https://youtu.be/45AyrzB6LN8",
    "487": "https://youtu.be/sOUw9lhZMX4",
    "488": "https://youtu.be/YZqNspgLH_M",
    "489": "https://youtu.be/bDdkLpyZc3s",
    "490": "https://youtu.be/iULF2ARjPt4",
    "491": "https://youtu.be/TmRmHRJM8Yg",
    "492": "https://youtu.be/4wP-xPIOIs8",
    "493": "https://youtu.be/iDOZcXjAZ1k",
    "494": "https://youtu.be/okAI7w7QFTI",
    "495": "https://youtu.be/DXB8R64CpAI",
    "496": "https://youtu.be/TX8Fda_FSDc",
    "497": "https://youtu.be/O6642KTsPDM",
    "498": "https://youtu.be/CTdF_-B7yQQ",
    "499": "https://youtu.be/-dv06UJVDmg",
    "500": "https://youtu.be/dD2EAyefoH0",
    "501": "https://youtu.be/j43hHw0CLXU",
    "502": "https://youtu.be/iADYG_kVn5A",
    "503": "https://youtu.be/Gwrad5YVd2c",
    "504": "https://youtu.be/QHqcBcTGc-4",
    "505": "https://youtu.be/gpsjF7PQup4",
    "506": "https://youtu.be/-XUzmKAgzZE",
    "507": "https://youtu.be/4FRMEPIjylQ",
    "508": "https://youtu.be/bHh2poh9jVg",
    "509": "https://youtu.be/mp1Cm9qmoG8",
    "510": "https://youtu.be/Ym9aV9HcfoA",
    "511": "https://youtu.be/5Ix6UfWmJRA",
    "512": "https://youtu.be/bZuRsBGGIB0",
    "513": "https://youtu.be/AIAe-hgzv2w",
    "514": "https://youtu.be/RBbHkVltfbA",
    "515": "https://youtu.be/M2NvHA_gV2s",
    "516": "https://youtu.be/8zYWRevSm_I",
    "517": "https://youtu.be/13zDkPz9_us",
    "518": "https://youtu.be/ivU1YYDyANM",
    "519": "https://youtu.be/_gB9lpmi4AA",
    "520": "https://youtu.be/-7eeLd9kNgY",
    "521": "https://youtu.be/lSWQabSuZI8",
    "522": "https://youtu.be/LmuRlP07z0Q",
    "523": "https://youtu.be/uxyLcpLw7eQ",
    "524": "https://youtu.be/x3NyeY2jicI",
    "525": "https://youtu.be/lzueJnwJQ3U",
    "526": "https://youtu.be/JbxNlWXjU-g",
    "527": "https://youtu.be/rsmjfv-3oJE",
    "528": "https://youtu.be/aI5gwTr-7ag",
    "529": "https://youtu.be/45NVleHBIKI",
    "530": "https://youtu.be/BeAd-TZspJ8",
    "531": "https://youtu.be/zXml7n2rLWo",
    "532": "https://youtu.be/ih_MJWvUWXI",
    "533": "https://youtu.be/TICERpS6yq8",
    "534": "https://youtu.be/erGrib-iW2A",
    "535": "https://youtu.be/eHSHmNG9djg",
    "536": "https://youtu.be/Y8JymcaoTWE",
    "537": "https://youtu.be/oeIcc2r7iRE",
    "538": "https://youtu.be/0WXPA35-RpQ",
    "539": "https://youtu.be/0zWQBqQB90g",
    "540": "https://youtu.be/5lkLK4WvndY",
    "541": "https://youtu.be/vkZ0sYvI9ec",
    "542": "https://youtu.be/hFP4xuTwsxU",
    "543": "https://youtu.be/lR82kEziGyI",
    "544": "https://youtu.be/QP3XEQut3tU",
    "545": "https://youtu.be/xd1U4h9anHI",
    "546": "https://youtu.be/KKei52mPPn0",
    "547": "https://youtu.be/v27UlED_xd4",
    "548": "https://youtu.be/UsHF918Zpvs",
    "549": "https://youtu.be/ithfxvibhQ4",
    "550": "https://youtu.be/PirU6PCMyGA",
    "551": "https://youtu.be/9hEOPaiO34I",
    "552": "https://youtu.be/vbedyE0YThI",
    "553": "https://youtu.be/LaNZLhRUqvo",
    "554": "https://youtu.be/1XKfigf9B-8",
    "555": "https://youtu.be/saU9LlKnfUQ",
    "556": "https://youtu.be/BZmAyxU2_KY",
    "557": "https://youtu.be/fDqROY_g6Yo",
    "558": "https://youtu.be/NJnUvqL8vKI",
    "560": "https://youtu.be/yxHPC6h1dNE",
    "561": "https://youtu.be/mDoAqmbUqck",
    "562": "https://youtu.be/AYQtEC953VA",
    "563": "https://youtu.be/Ei8LukLVuh0",
    "564": "https://youtu.be/vxp-W0i1Sqs",
    "565": "https://youtu.be/m8bjORyrdRs",
    "566": "https://youtu.be/uCNOiI1yOgQ",
    "567": "https://youtu.be/bLRrSOMkK88",
    "568": "https://youtu.be/8-AR2jTCOo4",
    "569": "https://youtu.be/OkULP7YMlrA",
    "570": "https://youtu.be/ChpkrNzlvJM",
    "571": "https://youtu.be/TjGqU9Uwrjg",
    "572": "https://youtu.be/-qWtDYn28dk",
    "573": "https://youtu.be/uB89OOJLV-c",
    "574": "https://youtu.be/nAFvBJmIc5E",
    "575": "https://youtu.be/yp6GwsSeeBA",
    "576": "https://youtu.be/lm_Vir3TlQQ",
    "577": "https://youtu.be/m4NjjafIDZQ",
    "578": "https://youtu.be/ClrIxpTXjw0",
    "579": "https://youtu.be/h8QakbkbcFA",
    "580": "https://youtu.be/yx-z3BW9vJk",
    "581": "https://youtu.be/1aRiyEmWJac",
    "582": "https://youtu.be/hmKm3ZEPaZM",
    "583": "https://youtu.be/-jLatnxpIbs",
    "584": "https://youtu.be/sd1b2aaVFBI",
    "585": "https://youtu.be/ARUJKvpen2I",
    "586": "https://youtu.be/N3-t3vtTDJs",
    "587": "https://youtu.be/IgHN24TOH2w",
    "588": "https://youtu.be/fvvoix9Td64",
    "589": "https://youtu.be/BPuNmekfXnc",
    "590": "https://youtu.be/rgYWooqDJ6s",
    "591": "https://youtu.be/grHmycvX50w",
    "592": "https://youtu.be/gKTgadShCCg",
    "593": "https://youtu.be/lKgITNHBtYc",
    "594": "https://youtu.be/EtQlze5SrSQ",
    "595": "https://youtu.be/n-6DsKbmma0",
    "596": "https://youtu.be/MaIGHwP7Wq8",
    "598": "https://youtu.be/Pj_UNuq1Vks",
    "599": "https://youtu.be/kFSZL8GFSts",
    "600": "https://youtu.be/VsLHyGi0Q_8",
    "601": "https://youtu.be/Vb_u0lHclKk",
    "602": "https://youtu.be/Uleaymr7W0o",
    "603": "https://youtu.be/ilcFbsIZO7w",
    "604": "https://youtu.be/yP9MXrs7FqQ",
    "605": "https://youtu.be/sbUp6lu_wA8",
    "606": "https://youtu.be/391-bZWyiFU",
    "607": "https://youtu.be/EV5IoCnt8H0",
    "608": "https://youtu.be/2xEQCAixO9s",
    "609": "https://youtu.be/ZvIv0J6wkaY",
    "610": "https://youtu.be/u2mb4VWjXjA",
    "611": "https://youtu.be/H-X_isN_JC0",
    "612": "https://youtu.be/xjLJ9PHxo44",
    "613": "https://youtu.be/m-Yl62RObyY",
    "614": "https://youtu.be/pma49F4T0oc",
    "615": "https://youtu.be/Gk3ZX8rpXrQ",
    "616": "https://youtu.be/APHKDSSvriw",
    "617": "https://youtu.be/AbKgB0TcTUU",
    "618": "https://youtu.be/iuayxth4n6E",
    "619": "https://youtu.be/4u04BVVDCbQ",
    "620": "https://youtu.be/8uIVLrwSGuQ",
    "621": "https://youtu.be/fVMmcZEK918",
    "622": "https://youtu.be/Md0NjWjrK8g",
    "623": "https://youtu.be/B_S1E8KcccQ",
    "624": "https://youtu.be/djl6xF4Tq3g",
    "625": "https://youtu.be/C72AhEgjSrg",
    "626": "https://youtu.be/K7qfuSJDpqI",
    "627": "https://youtu.be/M8MumUQoBBA",
    "628": "https://youtu.be/GdIUJxAnUxo",
    "629": "https://youtu.be/SLgtxB8Z5PM",
    "630": "https://youtu.be/L4qfa3EJq2o",
    "631": "https://youtu.be/WvNajCFmqFg",
    "632": "https://youtu.be/VuK6SLgAKi0",
    "633": "https://youtu.be/E87DkclfbTM",
    "634": "https://youtu.be/TT98khRPW6g",
    "635": "https://youtu.be/xmGL29DjzDc",
    "636": "https://youtu.be/VfWtP5a-PcQ",
    "637": "https://youtu.be/kM8TwnOFcSU",
    "638": "https://youtu.be/E60AkSFQ9KU",
    "639": "https://youtu.be/ioXcayG3daU",
    "640": "https://youtu.be/M5dYnv0igKg",
    "641": "https://youtu.be/_9o0CAMa1GM",
    "642": "https://youtu.be/yWJRGOXxQX0",
    "643": "https://youtu.be/cXVWxTOmGPc",
    "644": "https://youtu.be/-2GM4foCH2Y",
    "645": "https://youtu.be/Bv9MpWhlmDE",
    "646": "https://youtu.be/WTWY3PkmT94",
    "647": "https://youtu.be/tam1zlyY9DU",
    "648": "https://youtu.be/LYVIPGEYfqQ",
    "649": "https://youtu.be/fkDYSbrIXNY",
    "650": "https://youtu.be/qyc4ad4bM2E",
    "651": "https://youtu.be/8iss9xKYjkg",
    "652": "https://youtu.be/6UY0ANLOQsg",
    "653": "https://youtu.be/iJTiN7a8RTA",
    "654": "https://youtu.be/aeqKkjDnwoo",
    "655": "https://youtu.be/KHpZYvpNup0",
    "656": "https://youtu.be/AoK1_H737hU",
    "657": "https://youtu.be/sf6A4uzNi-A",
    "658": "https://youtu.be/_CoFLrnIytE",
    "659": "https://youtu.be/7WVV5-ZnOVo",
    "660": "https://youtu.be/acZ-Oy6plzI",
    "661": "https://youtu.be/OxCf9MdmWJk",
    "662": "https://youtu.be/Sfg7zcEXRkQ",
    "664": "https://youtu.be/d9f1ZQSjIt8",
    "665": "https://youtu.be/xGkIlrgCQ74",
    "666": "https://youtu.be/tsEcc2dBLDw",
    "667": "https://youtu.be/WWbffRYWxsc",
    "668": "https://youtu.be/cYxWMpXdRw8",
    "669": "https://youtu.be/t8_uQ4RG9qU",
    "670": "https://youtu.be/vsJDAswyDRQ",
    "671": "https://youtu.be/bEf-_dVpEHg",
    "672": "https://youtu.be/IVJAfn2T7MM",
    "673": "https://youtu.be/WH0ugdb0W9Y",
    "674": "https://youtu.be/TinBpFxSnt4",
    "675": "https://youtu.be/c2XPciBHXFY",
    "676": "https://youtu.be/wUzmbT48hmw",
    "677": "https://youtu.be/VMMSi0AePjg",
    "678": "https://youtu.be/WL5M3LebLkc",
    "679": "https://youtu.be/sRbPhRzbeJU",
    "680": "https://youtu.be/AeJ44ce9yEw",
    "681": "https://youtu.be/fb6bWblXxlA",
    "682": "https://youtu.be/GpcUQinju3w",
    "683": "https://youtu.be/kBuC1_okvyA",
    "684": "https://youtu.be/jkiB-yvu8Oc",
    "685": "https://youtu.be/L-v_5Y36E1g",
    "686": "https://youtu.be/cLDWg2iTbxY",
    "687": "https://youtu.be/aZu-fQX7eQ4",
    "688": "https://youtu.be/C9B3X7sph3M",
    "689": "https://youtu.be/WswXPJOOSsc",
    "690": "https://youtu.be/zx9mboZ1uzk",
    "691": "https://youtu.be/KFpvMpzLLEE",
    "692": "https://youtu.be/JrUBVNcpgEk",
    "693": "https://youtu.be/-NrxH-0ZX5c",
    "694": "https://youtu.be/AQHv3J1zEAo",
    "695": "https://youtu.be/OYeSjgqnLeE",
    "696": "https://youtu.be/wyI5rsFrtyw",
    "697": "https://youtu.be/zERQ7BusGe8",
    "698": "https://youtu.be/LIrkrD_kEsM",
    "699": "https://youtu.be/8WE71ovR1vc",
    "700": "https://youtu.be/uKNjlMZvWiQ",
    "701": "https://youtu.be/Q5jZucmXqkQ",
    "702": "https://youtu.be/fMYwV4weT3I",
    "703": "https://youtu.be/0Da3uciv0kc",
    "704": "https://youtu.be/YY1u-AkQ7lA",
    "705": "https://youtu.be/Z5wCOlnhTuU",
    "706": "https://youtu.be/vThPDdAY4oo",
    "707": "https://youtu.be/mjHHtCjhHEY",
    "708": "https://youtu.be/oOShIZhmFOw",
    "709": "https://youtu.be/gDm2b3jjCcU",
    "710": "https://youtu.be/XZEPYiGJHa4",
    "711": "https://youtu.be/QB95PD-N2ks",
    "712": "https://youtu.be/yadMgNabtOM",
    "713": "https://youtu.be/-srZYka5-AY",
    "714": "https://youtu.be/QIxgiFiBrIw",
    "715": "https://youtu.be/GzLMHACN-ag",
    "716": "https://youtu.be/SGmH-eVYjAw",
    "717": "https://youtu.be/Bd4RoCX5I7E",
    "718": "https://youtu.be/mNtSoCtURxA",
    "719": "https://youtu.be/6ee-japj-oM",
    "720": "https://youtu.be/PCA1Wri0y_g",
    "721": "https://youtu.be/x6KN3voN2iM",
    "722": "https://youtu.be/I20RC3Q3Qvw",
    "723": "https://youtu.be/EY1kuGrQuJk",
    "724": "https://youtu.be/hrDoXPvgziA",
    "725": "https://youtu.be/98YfZc_lNK4",
    "726": "https://youtu.be/Z9NMGc4g6xU",
    "727": "https://youtu.be/52Mml-1258U",
    "728": "https://youtu.be/QmNcjtZeZFg",
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
        case "autoYTurls":
            log( "doing autoYTurls" );
            if( textOrig.match(/(?:youtube\.com|youtu\.be)/) ) {
                $("#autoYTurls a").remove();
                skipSave = true;
            } else {
                textReplaced = addYouTubeUrlToPlayer( text, url );

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /\|}\n\n== (Notes|Tracklist) ==/, '|}\n\n' + newPlayerTemplate( url, true ) + '\n\n== $1 ==' ); // No URL after wikitable, add new player
                }

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /(\n\n)(== (Notes|Tracklist) ==)/, '\n\n' + newPlayerTemplate( url, true ) + '\n\n$2' ); // No URL or wikitable, add new player before section
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
            // Regex to match mix page titles
            var epId = wgTitle.replace( /^.*\bTronic Podcast (\d+)\b.*$/, "$1" ).trim();

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