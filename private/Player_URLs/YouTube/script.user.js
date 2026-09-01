// ==UserScript==
// @name         YouTube Player URLs (private)
// @version      2026.09.01.2
// @description  Add YouTube player URLs from array to mix pages when episode numbers match the mix page title
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/YouTube/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-YouTube_Player_URLs_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/funcs.js?v-2026.09.01.3
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// Add the YouTube URL with this title text; to unset use =""
const addAsTitle = "";

// Position of the YouTube URL inside the {{Player}} template
// "first": in front of the URLs already there
// "middle": centre of the resulting list - with only one URL there it ends up second
// "last": after the URLs already there
// The URLs already in the template keep the preferred site order of ../funcs.js among themselves,
// except on a titled player, where their order is the part order and is left untouched
const addAtPosition = "last"; // first, middle or last

// Regex string for matching episode numbers in MixesDB page titles
//var epId_regex = /^.*\bDCR(\d+)\b.*$/;
//var epId_regex = /^.*\bTransmissions (\d+)\b.*$/;
var epId_regex = /^.*\bMonument (?:Podcast )?(\d+)\b.*$/;

// Embedding manually is OK, since the sh script is run locally anyways
var episodes_arr = {
    "427": "https://youtu.be/L_eCAroY9io",
    "428": "https://youtu.be/Vt6hhWIrqKU",
    "429": "https://youtu.be/P-_fHqGXVXg",
    "430": "https://youtu.be/Mo6so4HyaE0",
    "431": "https://youtu.be/GPXtkOCoQ3U",
    "432": "https://youtu.be/MrKCEbW5Tt4",
    "433": "https://youtu.be/sgJq4NWBx1c",
    "434": "https://youtu.be/vzkt6cDjDFs",
    "435": "https://youtu.be/zUkRdaLrBb0",
    "436": "https://youtu.be/2bN9XM482_c",
    "437": "https://youtu.be/0vNGmgXJL8Y",
    "438": "https://youtu.be/rGzLTBHttOM",
    "439": "https://youtu.be/vIB9Qt8wWyI",
    "440": "https://youtu.be/afLlqnJ61SY",
    "441": "https://youtu.be/-8kgjzecvqg",
    "442": "https://youtu.be/W5t97SjKdjQ",
    "443": "https://youtu.be/dKpvp_MjDXc",
    "444": "https://youtu.be/tNcK8V1Ny0c",
    "445": "https://youtu.be/2PqchFodlPE",
    "446": "https://youtu.be/aGf8dMrSOhE",
    "447": "https://youtu.be/zinW4kyy7kA",
    "448": "https://youtu.be/VJhWNNK2oh8",
    "449": "https://youtu.be/rkXuB7gbRSQ",
    "450": "https://youtu.be/XObnxW96W_c",
    "451": "https://youtu.be/x8pTc0ioPTE",
    "452": "https://youtu.be/FIqAasah3qU",
    "453": "https://youtu.be/0kRdYBx02Bk",
    "454": "https://youtu.be/TkQyk0PQzg4",
    "455": "https://youtu.be/XPMbCVLjULc",
    "456": "https://youtu.be/GZu_sP6ty3M",
    "457": "https://youtu.be/QW_OJU6SEFs",
    "458": "https://youtu.be/CcP1tKjnshc",
    "459": "https://youtu.be/p_MavprTE8A",
    "460": "https://youtu.be/shXAvayPOzY",
    "461": "https://youtu.be/9mN7mk2fuxs",
    "462": "https://youtu.be/uBaXAAHS13g",
    "463": "https://youtu.be/7PyDwWKIpeI",
    "464": "https://youtu.be/HvNP4Phh6tY",
    "465": "https://youtu.be/mYLmE9PxQYg",
    "466": "https://youtu.be/jx9sRoZcbdQ",
    "467": "https://youtu.be/Lmc6FnY0T74",
    "468": "https://youtu.be/Vhpky_Eu7Pk",
    "469": "https://youtu.be/Apf0m_9YSi4",
    "470": "https://youtu.be/PrI1yVl--Oo",
    "471": "https://youtu.be/WH7q3ZN1CXo",
    "472": "https://youtu.be/uehfzYQQNeo",
    "473": "https://youtu.be/gKHkmBmy_Ks",
    "474": "https://youtu.be/DZCKoIZa9Co",
    "475": "https://youtu.be/lfVE1nL5jnk",
    "476": "https://youtu.be/5aOxzXsedfQ",
    "477": "https://youtu.be/U-ZfvgJH-30",
    "478": "https://youtu.be/A0vzWxUO5TA",
    "478": "https://youtu.be/JCxqgAhaJj4",
    "479": "https://youtu.be/BNtAWc-vLX4",
    "480": "https://youtu.be/p4NWPk9B20I",
    "481": "https://youtu.be/m7nnyJ1K3JA",
    "482": "https://youtu.be/Uevcwu2GLMs",
    "483": "https://youtu.be/-6G1TNBxp08",
    "484": "https://youtu.be/Qxfr7h-PzdA",
    "485": "https://youtu.be/LH0RNHxukJs",
    "486": "https://youtu.be/jHOE86EMHvA",
    "487": "https://youtu.be/1IFJive9Bvc",
    "488": "https://youtu.be/G0o-l5G0M4s",
    "489": "https://youtu.be/9RshF2jpgLo",
    "490": "https://youtu.be/CFZ0TtEbofU",
    "491": "https://youtu.be/iAodr4mipf0",
    "492": "https://youtu.be/TOIuoWmEqxo",
    "493": "https://youtu.be/2-lUv1_A_KU",
    "494": "https://youtu.be/a23hasz0yk8",
    "495": "https://youtu.be/Z9APq63an58",
    "496": "https://youtu.be/CYW3qAtbiSg",
    "497": "https://youtu.be/usOf_0SOPl8",
    "498": "https://youtu.be/twi0ZP1ZWew",
    "499": "https://youtu.be/iFrwlymvtTM",
    "500": "https://youtu.be/acwCbVzHnRM",
    "500": "https://youtu.be/3Hkalon06bY",
    "500": "https://youtu.be/o2tiLxanOd0",
    "501": "https://youtu.be/UO8_-B-383w",
    "502": "https://youtu.be/rYf6PT5sc4g",
    "503": "https://youtu.be/KYJ_71uYXZU",
    "504": "https://youtu.be/rWY84XAconE",
    "505": "https://youtu.be/myDhdoV3ZkM",
    "506": "https://youtu.be/AvZTXsiFHMM",
    "507": "https://youtu.be/ifuvscQYyg8",
    "508": "https://youtu.be/NSYx0vWcvH0",
    "509": "https://youtu.be/vwzfL0qE6F8",
    "510": "https://youtu.be/ZZdrFPWPoqk",
    "511": "https://youtu.be/r7lpVr9wvUs",
    "512": "https://youtu.be/kfb7w5XK92s",
    "513": "https://youtu.be/k1HPxafVOrY",
    "514": "https://youtu.be/yp7EtzyXorQ",
    "515": "https://youtu.be/x3ZimXjmAyk",
    "516": "https://youtu.be/uiwKpt-LPgQ",
    "517": "https://youtu.be/XCcT0u0-OCo",
    "518": "https://youtu.be/hxAGktN9mT0",
    "519": "https://youtu.be/BEM4gOV5CdI",
    "520": "https://youtu.be/cbPnVYVl_nQ",
    "521": "https://youtu.be/1BY53FzrZEA",
    "522": "https://youtu.be/rY1vaQfkhf8",
    "523": "https://youtu.be/3rxrvDzpSQI",
    "524": "https://youtu.be/RwwQ1up05o8",
    "525": "https://youtu.be/8qK-6SSJpm8",
    "526": "https://youtu.be/17O4yglckDs",
    "527": "https://youtu.be/ZAJGYoV7bqg",
    "528": "https://youtu.be/o3ErAuDGwdE",
    "529": "https://youtu.be/EXzLMVBYvMw",
    "530": "https://youtu.be/qelGjLdz9tw",
    "531": "https://youtu.be/4kR_JUwOxgo",
    "532": "https://youtu.be/-3JaadCUnGY",
    "533": "https://youtu.be/TuaZ4crjMl0",
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
                logVar( "addAtPosition", addAtPosition );
                textReplaced = addYouTubeUrlToPlayer( text, url, addAsTitle, addAtPosition );

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
        // Both Player URLs userscripts (YouTube and Apple Podcasts) run on MixesDB and would each
        // add their own link, resulting in a duplicate id and every edit link opening twice.
        // Whichever script gets here first wins, the other one skips creation AND the click handler.
        if( ( wgPageName == "MixesDB:Explorer/Mixes" || wgPageName == "MixesDB:Explorer/Lists" )
            && !document.getElementById( "editAllRes" ) ) {
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