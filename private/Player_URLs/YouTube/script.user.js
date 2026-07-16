// ==UserScript==
// @name         YouTube Player URLs (private)
// @version      2026.07.16.2
// @description  Add YouTube player URLs from array to mix pages when episode numbers match the mix page title
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-YouTube_Player_URLs_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/funcs.js?v-2026.07.16.1
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// Add the YouTube URL with this title text; to unset use =""
const addAsTitle = "";

// Regex string for matching episode numbers in MixesDB page titles
var epId_regex = /^.*\bTransitions (\d+)\b.*$/;
//var epId_regex = /^.*\bDCR(\d+)\b.*$/;

// Embedding manually is OK, since the sh script is run locally anyways
// Saves the commit
var episodes_arr = {
    "993": "https://youtu.be/BdO75V4-K4Q",
    "994": "https://youtu.be/IJjRkLJ7hCY",
    "995": "https://youtu.be/zIKBD72ilQs",
    "996": "https://youtu.be/QwpBVc4YQuo",
    "997": "https://youtu.be/E3dZg8B5hE8",
    "998": "https://youtu.be/NkOrtRZ2DxE",
    "999": "https://youtu.be/cEWzGAOA-M0",
    "1000": "https://youtu.be/6WZ9xf1pUKI",
    "1001": "https://youtu.be/v7AIbUVkYmM",
    "1002": "https://youtu.be/AOI4tYPY50Y",
    "1003": "https://youtu.be/jiNpYdb7vfU",
    "1004": "https://youtu.be/c1TuF5fVub8",
    "1005": "https://youtu.be/4jVf6oM9dxI",
    "1006": "https://youtu.be/3g8_HftTc7A",
    "1007": "https://youtu.be/gdkCnmf_c6g",
    "1008": "https://youtu.be/M-pU4xMzoGA",
    "1009": "https://youtu.be/BiJyDteIGyk",
    "1010": "https://youtu.be/DxI7lEQOa7M",
    "1011": "https://youtu.be/JnBjMoZP8fk",
    "1012": "https://youtu.be/cmNUngHCtNI",
    "1013": "https://youtu.be/wWT5AD2qz7k",
    "1014": "https://youtu.be/aEo6jh_kvak",
    "1015": "https://youtu.be/njnispdAd2A",
    "1016": "https://youtu.be/IceRam_54w0",
    "1017": "https://youtu.be/SGW-ogjk_zc",
    "1018": "https://youtu.be/sBeHkC3b7kE",
    "1019": "https://youtu.be/7X-JL3d0g_c",
    "1020": "https://youtu.be/Eevtpqu4_eM",
    "1021": "https://youtu.be/yMwDrlB94KU",
    "1022": "https://youtu.be/7zlJtI8s4rk",
    "1023": "https://youtu.be/IbvNV-R0kI0",
    "1024": "https://youtu.be/jYSosDJnXyQ",
    "1025": "https://youtu.be/qhqPXjDv9Vg",
    "1026": "https://youtu.be/iSGK0rLwG44",
    "1027": "https://youtu.be/vNkBt6_ow-0",
    "1028": "https://youtu.be/HMRwKCS4xw0",
    "1029": "https://youtu.be/f9cEkY9b4w0",
    "1030": "https://youtu.be/O3Ir-V2Vzhk",
    "1031": "https://youtu.be/4WeZAn97OGw",
    "1032": "https://youtu.be/5DZe-GL6HsU",
    "1033": "https://youtu.be/doUcf0QG0i0",
    "1034": "https://youtu.be/L8PDEHYl5ks",
    "1035": "https://youtu.be/0_lIVF80M9A",
    "1036": "https://youtu.be/htw9vGv1Yk4",
    "1037": "https://youtu.be/Xbo-JfMXnPM",
    "1038": "https://youtu.be/xpx9cNqgKrE",
    "1039": "https://youtu.be/s8H8pH-DiXA",
    "1040": "https://youtu.be/PpvrfZBo82g",
    "1041": "https://youtu.be/5S4mYi9r32U",
    "1042": "https://youtu.be/68InVqEkHDU",
    "1043": "https://youtu.be/I4NlVMWWSqU",
    "1044": "https://youtu.be/EUacfDY0VB8",
    "1045": "https://youtu.be/y53ktwShu1k",
    "1046": "https://youtu.be/JI-uEQ4hXMc",
    "1047": "https://youtu.be/j2WeS0uyx08",
    "1048": "https://youtu.be/3TgQISJWxgE",
    "1049": "https://youtu.be/QMRk-G-fveM",
    "1050": "https://youtu.be/fU7bB8s6zaU",
    "1051": "https://youtu.be/gH4TLUElWDg",
    "1052": "https://youtu.be/n9UXqSx_lS8",
    "1053": "https://youtu.be/6wwnOcFqXbA",
    "1054": "https://youtu.be/OzMHSWDxuG8",
    "1055": "https://youtu.be/kRLvUeqgCYI",
    "1056": "https://youtu.be/7mktt9M63wY",
    "1057": "https://youtu.be/850oxv-Bby4",
    "1058": "https://youtu.be/Kr61V5yYdS0",
    "1059": "https://youtu.be/3xmg96LZyPY",
    "1060": "https://youtu.be/hfAHMdhpMuo",
    "1061": "https://youtu.be/t5h9mRoggRk",
    "1062": "https://youtu.be/84gIL56DvBA",
    "1063": "https://youtu.be/Fnz0Z6UPtok",
    "1064": "https://youtu.be/026cvbKJboQ",
    "1065": "https://youtu.be/PTjwNIwOh0I",
    "1066": "https://youtu.be/89k-pbQgwIM",
    "1067": "https://youtu.be/mn11M3lDFlk",
    "1068": "https://youtu.be/dgk0V7nd2Do",
    "1069": "https://youtu.be/481X8m8nSDc",
    "1070": "https://youtu.be/XMHYmwYaJlY",
    "1071": "https://youtu.be/V2BymHqYT4Y",
    "1072": "https://youtu.be/Yu5IcSK2SHg",
    "1073": "https://youtu.be/r2bUhKiM9lg",
    "1074": "https://youtu.be/4u5U5rZCEJs",
    "1075": "https://youtu.be/Zg7JMf7MUh0",
    "1076": "https://youtu.be/P5zYAn-wSIk",
    "1077": "https://youtu.be/MbzMfVluSlQ",
    "1078": "https://youtu.be/n-lQ1YkPvbI",
    "1079": "https://youtu.be/g--xQ8h06N0",
    "1080": "https://youtu.be/Y3UZNMGNPkY",
    "1081": "https://youtu.be/iszXssTEQa8",
    "1082": "https://youtu.be/WlQeaP22vL4",
    "1083": "https://youtu.be/06GQsEBDRy4",
    "1084": "https://youtu.be/yycJNqUqMmo",
    "1085": "https://youtu.be/jB30g-G9Ysc",
    "1086": "https://youtu.be/labW4wxBXzs",
    "1087": "https://youtu.be/KrrNM1Iz2GE",
    "1088": "https://youtu.be/XXIG47exv54",
    "1089": "https://youtu.be/gLRj7ovxhZU",
    "1090": "https://youtu.be/HBayb_VN8EY",
    "1091": "https://youtu.be/n9lKk4wtO8M",
    "1092": "https://youtu.be/mZrVpE08t68",
    "1093": "https://youtu.be/acfIjJgMCNU",
    "1094": "https://youtu.be/bCyzjOhGXz8",
    "1095": "https://youtu.be/ztGt8TarFiM",
    "1096": "https://youtu.be/YpKl40a3dAw",
    "1097": "https://youtu.be/6Q-ZHXigz3s",
    "1098": "https://youtu.be/ajQMQKBmLGI",
    "1099": "https://youtu.be/Nl12fy_MGMU",
    "1100": "https://youtu.be/QNbPOMONcvQ",
    "1101": "https://youtu.be/2JlK58_NixU",
    "1102": "https://youtu.be/_sM252BdNa8",
    "1103": "https://youtu.be/PAWdQBbbCsc",
    "1104": "https://youtu.be/oN-AxDki6bA",
    "1105": "https://youtu.be/q_2c0Fkb8Ys",
    "1106": "https://youtu.be/GceUY20t1x8",
    "1107": "https://youtu.be/1Pjdd0YtrTU",
    "1108": "https://youtu.be/6e_pv5W60a8",
    "1109": "https://youtu.be/OdxgFeTCEaA",
    "1110": "https://youtu.be/JCL6g9MiRUU",
    "1111": "https://youtu.be/y2HUm91NJyU",
    "1112": "https://youtu.be/FUNAlANfZiY",
    "1113": "https://youtu.be/Oo5C8BF99SU",
    "1115": "https://youtu.be/U1qjNThc5_I",
    "1116": "https://youtu.be/HaIWzEknTqA",
    "1117": "https://youtu.be/anoSYWMzhxI",
    "1118": "https://youtu.be/gtchGTfL89E",
    "1119": "https://youtu.be/Lxsn1hBjArk",
    "1120": "https://youtu.be/Iyr0HQDJHQY",
    "1121": "https://youtu.be/SzzSg5XxRO0",
    "1122": "https://youtu.be/usKCdTRbGGU",
    "1123": "https://youtu.be/CFy5Ustk0Dw",
    "1124": "https://youtu.be/OG4vgR4moew",
    "1125": "https://youtu.be/EgDFWu6b2Aw",
    "1126": "https://youtu.be/Po7Pus771UA",
    "1127": "https://youtu.be/2TcoICioKpM",
    "Best of 2025 Extended Mix": "https://youtu.be/MCawbfTj3JY",
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
                textReplaced = addYouTubeUrlToPlayer( text, url, addAsTitle );

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /\|}\n\n== (Notes|Tracklist) ==/, '|}\n\n' + newPlayerTemplate( url, true, addAsTitle ) + '\n\n== $1 ==' ); // No URL after wikitable, add new player
                }

                if( textReplaced == text ) {
                    textReplaced = text
                        .replace( /(\n\n)(== (Notes|Tracklist) ==)/, '\n\n' + newPlayerTemplate( url, true, addAsTitle ) + '\n\n$2' ); // No URL or wikitable, add new player before section
                }
            }
            break;
    }

    if( !addAsTitle && text.match(/{{Player.+\|t\d*=.+}}/) ) {
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
            var epId = wgTitle.replace( epId_regex, "$1" ).trim();

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