// ==UserScript==
// @name         YouTube Player URLs (private)
// @version      2026.07.14.4
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
    "474": "https://youtu.be/-eQenB-EZhA",
    "460": "https://youtu.be/HnGxdU-RQBE",
    "459": "https://youtu.be/t_dIPsG2kkw",
    "458": "https://youtu.be/UMQBgjM6VvM",
    "457": "https://youtu.be/aIcVly6qdhY",
    "316": "https://youtu.be/r7Uk14WeUSs",
    "317": "https://youtu.be/2Szi30-KUMI",
    "318": "https://youtu.be/YQB1C8MKRho",
    "319": "https://youtu.be/lxU0bukaUVU",
    "320": "https://youtu.be/fdKOW6XQpZc",
    "321": "https://youtu.be/DjqjQSfDFSU",
    "322": "https://youtu.be/MeDn1A5pjhQ",
    "323": "https://youtu.be/UMRSmljXTj0",
    "324": "https://youtu.be/cM-HVmpZozc",
    "325": "https://youtu.be/tzsCH1XFcpI",
    "326": "https://youtu.be/0IcBJYMJpK8",
    "327": "https://youtu.be/_306zmWKS2U",
    "328": "https://youtu.be/76x-LGMu_Vc",
    "329": "https://youtu.be/x_hPFAYML5Q",
    "330": "https://youtu.be/-Dzm7Go15NU",
    "331": "https://youtu.be/Ky-5hTuYFVM",
    "332": "https://youtu.be/C21nDtdXR7Y",
    "333": "https://youtu.be/OEeHojG8GpU",
    "334": "https://youtu.be/zt4E7qTarqo",
    "335": "https://youtu.be/7duUahUTfPo",
    "336": "https://youtu.be/NXhcu0s6v-w",
    "337": "https://youtu.be/EtZF26uIvlw",
    "338": "https://youtu.be/o4I4CBqSGAk",
    "339": "https://youtu.be/mMeWxdgmCQ8",
    "340": "https://youtu.be/K3DXnHgOQdM",
    "341": "https://youtu.be/F3y_1fnbkis",
    "342": "https://youtu.be/gQPP1pL4VH8",
    "344": "https://youtu.be/Ht5rqrL9f34",
    "345": "https://youtu.be/l5X0-c66QW0",
    "343": "https://youtu.be/svIZNnRpWm0",
    "347": "https://youtu.be/ua1IzYrxZ7w",
    "346": "https://youtu.be/CFKiRo-G9tc",
    "348": "https://youtu.be/dNsAszG-T3g",
    "349": "https://youtu.be/GSHJec7ehFE",
    "350": "https://youtu.be/Lld5oJHjM3M",
    "351": "https://youtu.be/NGEbEd8zhc8",
    "352": "https://youtu.be/Ia9tCIuIWQs",
    "353": "https://youtu.be/JXRRzmKWYoQ",
    "354": "https://youtu.be/V8C33kByj2M",
    "355": "https://youtu.be/nihg7VZScnQ",
    "356": "https://youtu.be/_VL5GSA2ZGc",
    "357": "https://youtu.be/-ha-qjXzGRc",
    "357": "https://youtu.be/LPHCFbvp7Hk",
    "358": "https://youtu.be/sTGV4uZu8CU",
    "359": "https://youtu.be/A1_wTmwmaLQ",
    "360": "https://youtu.be/UMM3Yom0qkg",
    "362": "https://youtu.be/7UfF7y6HRb0",
    "363": "https://youtu.be/q528yrEML-Q",
    "364": "https://youtu.be/XDQBxPQdxwY",
    "365": "https://youtu.be/EgxcMxoRkG0",
    "366": "https://youtu.be/2q1SnnpWkTE",
    "367": "https://youtu.be/YgKUR88i1io",
    "368": "https://youtu.be/n6QSjjRlOQk",
    "369": "https://youtu.be/ENvQrIGGVuE",
    "370": "https://youtu.be/HiAs6CROIj4",
    "371": "https://youtu.be/RN6kMeUDHF0",
    "372": "https://youtu.be/AH6PBlbCpww",
    "373": "https://youtu.be/nEmMK79sozo",
    "374": "https://youtu.be/37yITKg7_GQ",
    "375": "https://youtu.be/e_VF6ifa280",
    "376": "https://youtu.be/xpWaPSOPTvM",
    "377": "https://youtu.be/jK070fLbTSw",
    "378": "https://youtu.be/M9ej_YOgTTc",
    "379": "https://youtu.be/SzC9e_569kg",
    "380": "https://youtu.be/ZcoynS5rwtY",
    "381": "https://youtu.be/NbQGsjMay3c",
    "382": "https://youtu.be/KkSXIaAI5Tw",
    "383": "https://youtu.be/W1grXg6zF3Y",
    "384": "https://youtu.be/H-GyxbhasjE",
    "385": "https://youtu.be/u5jWCF-yanQ",
    "386": "https://youtu.be/BaFL39JrYYc",
    "387": "https://youtu.be/br_8tY0ML4E",
    "388": "https://youtu.be/JWI8lUOc8c8",
    "389": "https://youtu.be/IjuwtOLHrCA",
    "390": "https://youtu.be/jnBAt5e65Mk",
    "391": "https://youtu.be/XSxU3Gzmt_U",
    "392": "https://youtu.be/0IjFTghfZiY",
    "393": "https://youtu.be/IOSsGEtAXac",
    "394": "https://youtu.be/kfVhB9dFmCo",
    "395": "https://youtu.be/es0X31xxKHA",
    "396": "https://youtu.be/WAszrSQ4LdA",
    "397": "https://youtu.be/kvmzb2XrrA8",
    "398": "https://youtu.be/yCp5UdYw2iU",
    "399": "https://youtu.be/MIDX4PqvW2U",
    "400": "https://youtu.be/wJDRbQ7h_dU",
    "401": "https://youtu.be/6ZIbnxBwUnw",
    "402": "https://youtu.be/i76v-DiYJ9c",
    "403": "https://youtu.be/KpOQ-scXqNk",
    "404": "https://youtu.be/KM3vSSN7-nQ",
    "405": "https://youtu.be/yoRu_uDxOv8",
    "406": "https://youtu.be/7thHcsPfhjc",
    "407": "https://youtu.be/Gf014XVMRdM",
    "408": "https://youtu.be/-08SUaHO9JM",
    "409": "https://youtu.be/DhaJiJNIrKo",
    "410": "https://youtu.be/05O29oooPrM",
    "411": "https://youtu.be/JM_11xYROQY",
    "412": "https://youtu.be/r7XX2SYtZCg",
    "413": "https://youtu.be/FzxuwvAnK6I",
    "414": "https://youtu.be/k470Z77MjFU",
    "415": "https://youtu.be/kXuxIVjgZTo",
    "416": "https://youtu.be/B8AhRntSEb8",
    "417": "https://youtu.be/3byr1J5Ba7g",
    "419": "https://youtu.be/UO8FLdT5_VA",
    "420": "https://youtu.be/uQoXl5Ni6Ek",
    "421": "https://youtu.be/OcMfY1agIe8",
    "423": "https://youtu.be/CILt0Unv41Q",
    "424": "https://youtu.be/15S2spLi2CU",
    "427": "https://youtu.be/juNSjD1Z9F8",
    "428": "https://youtu.be/KhCYXuPRy60",
    "418": "https://youtu.be/ZvbrmGCtfDs",
    "422": "https://youtu.be/1Ol4XrKxGo4",
    "425": "https://youtu.be/PDUAh-c8_yo",
    "426": "https://youtu.be/aRn0BVINmq4",
    "429": "https://youtu.be/bS2dneTpy6c",
    "430": "https://youtu.be/x_F08xOi-Ok",
    "431": "https://youtu.be/RYtzEL3yVaU",
    "432": "https://youtu.be/yaZgB8kpSYs",
    "433": "https://youtu.be/ofcc0ik9_1A",
    "434": "https://youtu.be/yaD72_9N1iY",
    "435": "https://youtu.be/N77XiG9_W_A",
    "436": "https://youtu.be/eXSGOvHGrYQ",
    "438": "https://youtu.be/y2V5kNm_Xfs",
    "438": "https://youtu.be/eZOzL5bXVK0",
    "439": "https://youtu.be/sMt6381nbno",
    "440": "https://youtu.be/z75tUSFS0FU",
    "441": "https://youtu.be/3Hl5H9DJC5A",
    "442": "https://youtu.be/n0XSPhKWv1k",
    "443": "https://youtu.be/cXtmih4nTvM",
    "444": "https://youtu.be/HjtKfyixe00",
    "445": "https://youtu.be/jmoaNI_uP1o",
    "446": "https://youtu.be/giXSKBIsSIU",
    "447": "https://youtu.be/c_6ZNFfgcxE",
    "448": "https://youtu.be/aBafDi4Mo_s",
    "449": "https://youtu.be/Vdeayz7Dn2w",
    "450": "https://youtu.be/pPh-Fe-WSbY",
    "451": "https://youtu.be/KE9m8E5wEr8",
    "452": "https://youtu.be/Rlyn5OT3100",
    "453": "https://youtu.be/orajqosicKk",
    "454": "https://youtu.be/_tFDwTtOC2U",
    "455": "https://youtu.be/Tgdp7Qqnho4",
    "456": "https://youtu.be/UbqweYnyt9E",
    "462": "https://youtu.be/xfoypW5zvO8",
    "461": "https://youtu.be/BQGZSu4-xZk",
    "463": "https://youtu.be/VQnt1vi4tso",
    "465": "https://youtu.be/7fxq6hu1aho",
    "464": "https://youtu.be/-bXW5merFIo",
    "466": "https://youtu.be/oZIg70LIgIk",
    "467": "https://youtu.be/iF0I1NLXwxs",
    "468": "https://youtu.be/b0iPKmfe5rM",
    "469": "https://youtu.be/eMV8G0NTkc4",
    "470": "https://youtu.be/Hn1NEFxe4UE",
    "471": "https://youtu.be/Sp2ZK4YrRHo",
    "472": "https://youtu.be/nzu2ig_5Dtg",
    "473": "https://youtu.be/4oXT2GxRonc",
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