// ==UserScript==
// @name         1001 Tracklists (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.01.11.2
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/1001_Tracklists/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-1001_Tracklists_2
// @include      http*1001tracklists.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1001tracklists.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var dev = 0,
    cacheVersion = 1,
    scriptName = "1001_Tracklists",
    repo = ( dev == 1 ) ? "Subfader" : "mixesdb",
    pathRaw = "https://raw.githubusercontent.com/" + repo + "/userscripts/refs/heads/main/";

loadRawCss( pathRaw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function thousandoneTl() {
    run1001 = false;

    $(".adRow").remove();
	// remove hidden elements that appear in text
	$(".tlUserInfo").remove();
	$(".tgHid").remove();

    var t = $("#tlTab");
    if(t.length > 0 ) {
        var tl = "",
            li = $("#tlTab > div"),
            len = li.length,
            rows = len;

        li.each(function() {

            // track
            if( $(this).attr("data-trno") != "" ) {
                var track = "",
                    song = $("div .trackValue",this).text().trim(),
                    label = $("div[itemprop='tracks'] .trackLabel",this).text().trim().toLowerCase(),
                    dur = $("div[data-mode='hours']",this).text().trim();

                if( dur != "" ) track = "["+dur+"] ";
                track += song;
                if( label != "" ) track += " ["+label+"]";

                //xc( track );
                if( track != "" && track != " " )  {
                    tl += track + "\n";
                }
            }

            // chapter
            // https://www.1001tracklists.com/tracklist/y3gt5lt/dominik-koislmeyer-jetique-energy-extravadance-charts-2021-08-28.html
            if( $(".fRow",this).length === 1 ) {
                var chapter = $(".fRow a",this).text().trim();
                if( chapter != "" ) tl += ";" + chapter + "\n";
            }

            // song chapter
            var span = $("span",this);
            if( span.attr("id") && span.attr("id").replace(/.+_(headtext_column)$/g, "$1") == "headtext_column" ) {
                var intro = span.text().trim().replace(/:$/g,"");
                if( intro != "" ) tl += "''" + intro + ":'' ";
            }
        });

        xc( tl );

        // fixes
		var tl = tl.replace('&thinsp;', ' ')
                   .replace(' (ID Remix) (ID Remix)', ' (ID Remix)')
                   .replace(/;(.+)\n\n;(.+)/g, ';$1 - $2')
                   .replace(/undefined - undefined/gi, '?');

        // dur fixes
		if( /\[\d+:\d+]/.test(tl) ) {
			tl = tl.replace( /\[(\d)] /, "[0$1:00] " )
			       .replace( /\[(\d+)] /, "[$1:00] " );
		}
		if( /\[\d\d:\d\d]/.test(tl) && /\[1:\d\d:\d\d]/.test(tl) ) {
			tl = tl.replace( /\[(\d\d:\d\d)] /gm, "[0:$1] " );
			tl = tl.replace( /\[(\d:\d\d)] /gm, "[0:0$1] " );
		}

		var res = apiTracklist( tl, "thousandoneTl" ),
			tlApi = res.text,
			feedback = res.feedback;

		if( tlApi ) {
			t.prepend( ta );
            $("#mixesdb-TLbox").css("position","inherit").append( tlApi );
		    fixTLbox( res.feedback );
		}
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Run funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
if( urlPath(1) == "tracklist") {
    waitForKeyElements("#tlTab .trackValue", function( jNode ) {
        if(run1001) thousandoneTl();
    });
}