// ==UserScript==
// @name         Discogs (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.24.2
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Discogs/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Discogs/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Tracklist_Cue_Switcher_1_
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_Cue_Switcher/script.funcs.js?v_1
// @match        https://www.discogs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
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

var cacheVersion = 2;
var scriptName = "Discogs";
var ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
//loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* ---------------------------------------------------------
 * Helpers
 * --------------------------------------------------------- */

function norm(s){
	return (s || "")
		.replace(/\u00A0/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function cleanArtist(s){
	return norm(s)
		.replace(/\s*[–—-]+\s*$/g, "")
		.replace(/\s*\*+\s*$/g, "")
		.replace(/\s*\(\d+\)\s*$/g, "")
		.trim();
}

function cleanDurRaw(s){
	return (s || "")
		.replace(/\u00A0/g, " ")
		.replace(/\s+/g, "")
		.trim();
}

function parseDurationToSeconds(dur){
	dur = cleanDurRaw(dur);
	if (!dur){
		return 0;
	}

	var parts = dur.split(":").map(function(p){ return p.trim(); });
	if (parts.length < 2 || parts.length > 3){
		return 0;
	}

	function toInt(x){
		return /^\d+$/.test(x) ? parseInt(x, 10) : NaN;
	}

	var h = 0, m = 0, s = 0;

	if (parts.length === 2){
		m = toInt(parts[0]);
		s = toInt(parts[1]);
	}else{
		h = toInt(parts[0]);
		m = toInt(parts[1]);
		s = toInt(parts[2]);
	}

	if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)){
		return 0;
	}

	return (h * 3600) + (m * 60) + s;
}

function pad2(n){
	return String(n).padStart(2, "0");
}

function removeStrayAsterisks(wrapper){
	var spans = wrapper.querySelectorAll("table tr td span");
	spans.forEach(function(span){
		if (!span.querySelector("a")){
			return;
		}
		Array.from(span.childNodes).forEach(function(n){
			if (n.nodeType === Node.TEXT_NODE && /^\s*\*+\s*$/.test(n.nodeValue || "")){
				n.nodeValue = "";
			}
		});
	});
}

function getReleaseArtistFromHeading(){
	var h1 = document.querySelector("h1");
	if (!h1){
		return "";
	}

	var out = "";
	var stop = false;

	Array.from(h1.childNodes).forEach(function(node){
		if (stop){
			return;
		}

		if (node.nodeType === Node.ELEMENT_NODE){
			var txt = cleanArtist(node.textContent);
			if (txt){
				out += txt;
			}
			return;
		}

		if (node.nodeType !== Node.TEXT_NODE){
			return;
		}

		var raw = node.nodeValue || "";
		var parts = raw.split(/\s+[–—-]\s+/);
		out += parts[0] || "";
		if (parts.length > 1){
			stop = true;
		}
	});

	return cleanArtist(out);
}


/* ---------------------------------------------------------
 * Main builder
 * --------------------------------------------------------- */

function buildDiscogsTL(){

	// RUN ONLY ONCE
	if ($("#tlEditor").length){
		return;
	}

	var wrapper = document.querySelector("#release-tracklist");
	if (!wrapper){
		return;
	}

	removeStrayAsterisks(wrapper);

	var rows = Array.from(wrapper.querySelectorAll("table tr"));
	if (!rows.length){
		return;
	}

	var out = [];
	var cumSeconds = 0;
	var releaseArtist = getReleaseArtistFromHeading();

	rows.forEach(function(tr, idx){

		var tds = Array.from(tr.querySelectorAll("td"));
		if (tds.length < 2){
			return;
		}

		var durStr = cleanDurRaw(tds[tds.length - 1].textContent);
		var durSec = parseDurationToSeconds(durStr);
		var title  = norm(tds[tds.length - 2].textContent);

		var artistParts = [];

		for (var i = 1; i <= tds.length - 3; i++){

			var cell = tds[i];
			var links = cell.querySelectorAll("a");

			if (links.length){
				links.forEach(function(a){
					var name = cleanArtist(a.textContent);
					if (name){
						artistParts.push(name);
					}
				});
				continue;
			}

			var txt = norm(cell.textContent);
			if (!txt || txt === "–" || txt === "-" || txt === "—"){
				continue;
			}

			txt = cleanArtist(txt);
			if (txt){
				artistParts.push(txt);
			}
		}

		var artist = artistParts.join(" / ").trim();
		if (!artist && releaseArtist){
			artist = releaseArtist;
		}
		if (!artist && !title){
			return;
		}

		var stampSec = cumSeconds;					// start time of THIS track
        out.push("[" + pad2(Math.floor(stampSec / 60)) + "] " + artist + " - " + title);
        cumSeconds += durSec;						// then advance for next track
	});

	var tl = out.join("\n").trim();
	if (!tl){
		return;
	}
    log("tl before API:\n" + tl);

	var res   = apiTracklist(tl, "standard");
	var tlApi = res.text;

	if (!tlApi){
		return;
	}
    log( 'tlApi:\n' + tlApi );

	// Inject ONCE
	wrapper.insertAdjacentHTML("beforebegin", ta);

	$("#mixesdb-TLbox")
		.css("position","inherit")
		.val(tlApi)
		.show();

	fixTLbox(res.feedback);
}


/* ---------------------------------------------------------
 * Wait for Discogs React render
 * --------------------------------------------------------- */

waitForKeyElements("#release-tracklist table", function(){
	buildDiscogsTL();
});
