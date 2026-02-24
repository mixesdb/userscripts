// ==UserScript==
// @name         Discogs (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.02.24.19
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
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discogs.com
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
var ta = '<div id="tlEditor"><textarea id="mixesdb-fileDetails" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

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

function isLikelyDuration(s){
	s = cleanDurRaw(s);
	return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(s);
}

function formatDurationHMMSS(totalSeconds){
	totalSeconds = Math.max(0, parseInt(totalSeconds, 10) || 0);
	var h = Math.floor(totalSeconds / 3600);
	var m = Math.floor((totalSeconds % 3600) / 60);
	var s = totalSeconds % 60;
	return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function getCanonicalDiscogsUrl(){
	var path = window.location.pathname || "";
	path = path.replace(/^\/[a-z]{2}(?=\/)/i, "");
	if (!path.startsWith("/")){
		path = "/" + path;
	}
	return window.location.origin + path;
}

function isCdReleaseFormat(){
	var metaRows = Array.from(document.querySelectorAll("tr"));
	for (var i = 0; i < metaRows.length; i++){
		var row = metaRows[i];
		var th = row.querySelector("th h2");
		if (!th){
			continue;
		}

		var label = norm(th.textContent).replace(/:$/, "").toLowerCase();
		if (label !== "format"){
			continue;
		}

		var td = row.querySelector("td");
		if (!td){
			return false;
		}

		return /\bcd\b/i.test(norm(td.textContent));
	}

	return false;
}

function buildFileDetailsAndNotes(rows, shouldInferPartChapters, isCdFormat){
	var chapters = [];
	var currentChapter = null;
	var emittedPartChapters = {};
	var allTracksHaveDuration = true;
	var hasTracks = false;

	rows.forEach(function(tr){
		var tds = Array.from(tr.querySelectorAll("td"));
		if (tds.length < 2){
			return;
		}

		var trackPos = norm(tds[0] ? tds[0].textContent : "") || norm(tr.getAttribute("data-track-position") || "");
		var titleCell = getTrackTitleCell(tr, tds, false);
		var title = getTrackTitleFromCell(titleCell);
		var isChapterRow = tr.classList.contains("heading_mkZNt")
			|| tr.classList.contains("heading_Yx9y2")
			|| Array.from(tr.classList).some(function(c){ return /^heading_/.test(c); })
			|| (!tr.hasAttribute("data-track-position") && !trackPos && title);

		if (isChapterRow && title){
			currentChapter = { name: title, seconds: 0 };
			chapters.push(currentChapter);
			return;
		}

		if (shouldInferPartChapters){
			var disc = getDiscFromTrackPos(trackPos);
			if (disc && !emittedPartChapters[disc]){
				currentChapter = { name: (isCdFormat ? "CD " : "Part ") + disc, seconds: 0 };
				chapters.push(currentChapter);
				emittedPartChapters[disc] = true;
			}
		}

		var lastCellTxt = norm(tds[tds.length - 1].textContent);
		var hasDuration = isLikelyDuration(lastCellTxt);
		hasTracks = true;

		if (!hasDuration){
			allTracksHaveDuration = false;
			return;
		}

		if (!currentChapter){
			currentChapter = { name: "", seconds: 0 };
			chapters.push(currentChapter);
		}

		currentChapter.seconds += parseDurationToSeconds(lastCellTxt);
	});

	var notesBlock = "== Notes ==\n\n" + getCanonicalDiscogsUrl();

	if (!hasTracks || !allTracksHaveDuration){
		return notesBlock;
	}

	var hasNamedChapters = chapters.some(function(ch){ return !!ch.name; });
	var totalSeconds = chapters.reduce(function(sum, ch){ return sum + ch.seconds; }, 0);
	var lines = [
		"== File details ==",
		"",
		"{|{{NormalTableFormat}}"
	];

	if (hasNamedChapters){
		lines.push(shouldInferPartChapters && isCdFormat ? "! CD" : "! Pt.");
	}
	lines.push("! dur", "! MB", "! kbps", "|-");

	if (hasNamedChapters){
		chapters.forEach(function(ch, idx){
			lines.push("| " + (idx + 1), "| " + formatDurationHMMSS(ch.seconds), "| ", "| ");
			if (idx < chapters.length - 1){
				lines.push("|-");
			}
		});
		lines.push("|-", "| ", "| " + formatDurationHMMSS(totalSeconds), "| ", "| ");
	}else{
		lines.push("| " + formatDurationHMMSS(totalSeconds), "| ", "| ");
	}

	lines.push("|}", "", notesBlock);
	return lines.join("\n");
}

function getTimestampPadWidth(rows, shouldInferPartChapters){
	var cumSeconds = 0;
	var chapterStartSeconds = 0;
	var hasUnknownDurationFromHere = false;
	var maxKnownMinuteStamp = 0;
	var emittedPartChapters = {};

	rows.forEach(function(tr){
		if (hasUnknownDurationFromHere){
			return;
		}

		var tds = Array.from(tr.querySelectorAll("td"));
		if (tds.length < 2){
			return;
		}

		var trackPos = norm(tds[0] ? tds[0].textContent : "") || norm(tr.getAttribute("data-track-position") || "");
		var titleCell = getTrackTitleCell(tr, tds, false);
		var title = getTrackTitleFromCell(titleCell);
		var isChapterRow = tr.classList.contains("heading_mkZNt")
			|| tr.classList.contains("heading_Yx9y2")
			|| Array.from(tr.classList).some(function(c){ return /^heading_/.test(c); })
			|| (!tr.hasAttribute("data-track-position") && !trackPos && title);

		if (shouldInferPartChapters){
			var disc = getDiscFromTrackPos(trackPos);
			if (disc && !emittedPartChapters[disc]){
				emittedPartChapters[disc] = true;
				chapterStartSeconds = cumSeconds;
			}
		}

		if (isChapterRow && title){
			chapterStartSeconds = cumSeconds;
			return;
		}

		var lastCellTxt = norm(tds[tds.length - 1].textContent);
		var hasDuration = isLikelyDuration(lastCellTxt);

		if (!hasDuration){
			hasUnknownDurationFromHere = true;
			return;
		}

		maxKnownMinuteStamp = Math.max(maxKnownMinuteStamp, Math.floor((cumSeconds - chapterStartSeconds) / 60));
		cumSeconds += parseDurationToSeconds(lastCellTxt);
	});

	return maxKnownMinuteStamp >= 100 ? 3 : 2;
}

function getDiscFromTrackPos(pos){
	var m = norm(pos).match(/^(\d+)\s*[-–—]\s*\d+[A-Za-z]?$/);
	return m ? m[1] : "";
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

function getTrackTitleFromCell(titleCell){
	if (!titleCell){
		return "";
	}

	var explicitTrackTitle = titleCell.querySelector("span.trackTitle_loyWF");
	if (explicitTrackTitle){
		return norm(explicitTrackTitle.textContent);
	}

	var clone = titleCell.cloneNode(true);
	clone.querySelectorAll(".trackCredits_f3JDq, .measure_JB5_t, .credits_vzBtg").forEach(function(el){
		el.remove();
	});

	return norm(clone.textContent);
}

function getTrackTitleCell(tr, tds, hasDuration){
	var titleCell = tr.querySelector("td.trackTitle_loyWF")
		|| tr.querySelector("td[class*='trackTitle']")
		|| null;

	if (titleCell){
		return titleCell;
	}

	return hasDuration ? tds[tds.length - 2] : tds[tds.length - 1];
}

function getArtistFromCell(cell){
	if (!cell){
		return "";
	}

	var out = "";

	Array.from(cell.childNodes).forEach(function(node){
		if (node.nodeType === Node.ELEMENT_NODE){
			if (node.matches("a") || node.querySelector("a")){
				var link = node.matches("a") ? node : node.querySelector("a");
				var linkName = cleanArtist(link.textContent).replace(/\s*\(\d+\)\s*/g, "").trim();
				if (linkName){
					out += linkName;
				}
				return;
			}

			var elText = norm(node.textContent);
			if (!elText || elText === "–" || elText === "-" || elText === "—"){
				return;
			}
			out += " " + elText + " ";
			return;
		}

		if (node.nodeType === Node.TEXT_NODE){
			var txt = norm(node.nodeValue || "");
			if (!txt || txt === "–" || txt === "-" || txt === "—"){
				return;
			}
			out += " " + txt + " ";
		}
	});

	return cleanArtist(norm(out));
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
	var hasUnknownDurationFromHere = false;
	var releaseArtist = getReleaseArtistFromHeading();
	var hasExplicitChapterRows = rows.some(function(tr){
		var tds = Array.from(tr.querySelectorAll("td"));
		var trackPos = norm(tds[0] ? tds[0].textContent : "");
		var titleCell = getTrackTitleCell(tr, tds, false);
		var title = getTrackTitleFromCell(titleCell);
		return tr.classList.contains("heading_mkZNt")
			|| tr.classList.contains("heading_Yx9y2")
			|| Array.from(tr.classList).some(function(c){ return /^heading_/.test(c); })
			|| (!tr.hasAttribute("data-track-position") && !trackPos && title);
	});
	var inferredDiscs = [];
	rows.forEach(function(tr){
		var tds = Array.from(tr.querySelectorAll("td"));
		if (!tds.length){
			return;
		}
		var trackPos = norm(tds[0] ? tds[0].textContent : "") || norm(tr.getAttribute("data-track-position") || "");
		var disc = getDiscFromTrackPos(trackPos);
		if (disc && inferredDiscs.indexOf(disc) === -1){
			inferredDiscs.push(disc);
		}
	});
	var shouldInferPartChapters = !hasExplicitChapterRows && inferredDiscs.length > 1;
	var isCdFormat = isCdReleaseFormat();
	var stampPadWidth = getTimestampPadWidth(rows, shouldInferPartChapters);
	var emittedPartChapters = {};
	var chapterStartSeconds = 0;
	var hasAnyDuration = rows.some(function(tr){
		var tds = Array.from(tr.querySelectorAll("td"));
		if (!tds.length){
			return false;
		}
		return isLikelyDuration(norm(tds[tds.length - 1].textContent));
	});
	var chapterStamp = "";
	var fileDetailsAndNotes = buildFileDetailsAndNotes(rows, shouldInferPartChapters, isCdFormat);

	rows.forEach(function(tr, idx){

		var tds = Array.from(tr.querySelectorAll("td"));
		if (tds.length < 2){
			return;
		}

		var artistCells = Array.from(tr.querySelectorAll("td.artist_VsG56, td[class*='artist_']"));

		var lastCellTxt = norm(tds[tds.length - 1].textContent);
		var hasDuration = isLikelyDuration(lastCellTxt);

		var titleCell = getTrackTitleCell(tr, tds, hasDuration);

		if (!artistCells.length){
			var artistEnd = hasDuration ? tds.length - 2 : tds.length - 1;
			artistCells = tds.slice(1, artistEnd);
		}

		var durStr = hasDuration ? cleanDurRaw(lastCellTxt) : "";
		var durSec = parseDurationToSeconds(durStr);
		var title  = getTrackTitleFromCell(titleCell);
		var trackPos = norm(tds[0] ? tds[0].textContent : "") || norm(tr.getAttribute("data-track-position") || "");

		var isChapterRow = tr.classList.contains("heading_mkZNt")
			|| tr.classList.contains("heading_Yx9y2")
			|| Array.from(tr.classList).some(function(c){ return /^heading_/.test(c); })
			|| (!tr.hasAttribute("data-track-position") && !trackPos && title);

		if (isChapterRow && title){
			chapterStartSeconds = cumSeconds;
			if (out.length && out[out.length - 1] !== ""){
				out.push("");
			}
			out.push(chapterStamp + ";" + title);
			return;
		}

		var isMissingDurationOnThisTrack = !hasDuration;

		if (shouldInferPartChapters){
			var disc = getDiscFromTrackPos(trackPos);
			if (disc && !emittedPartChapters[disc]){
				if (out.length && out[out.length - 1] !== ""){
					out.push("");
				}
				out.push(chapterStamp + ";" + (isCdFormat ? "CD " : "Part ") + disc);
				emittedPartChapters[disc] = true;
				chapterStartSeconds = cumSeconds;
			}
		}

		var artistParts = [];

		for (var i = 0; i < artistCells.length; i++){

			var cell = artistCells[i];
			var txt = getArtistFromCell(cell);
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

		var stamp = "";
		if (hasAnyDuration){
			stamp = hasUnknownDurationFromHere
				? "[??]"
				: "[" + String(Math.floor((cumSeconds - chapterStartSeconds) / 60)).padStart(stampPadWidth, "0") + "]";
		}

		out.push((stamp ? (stamp + " ") : "") + artist + " - " + title);

		if (!hasUnknownDurationFromHere){
			cumSeconds += durSec;
		}

		if (isMissingDurationOnThisTrack){
			hasUnknownDurationFromHere = true;
		}
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

	$("#mixesdb-fileDetails")
		.css("position","inherit")
		.attr("rows", Math.max(1, fileDetailsAndNotes.split("\n").length))
		.val(fileDetailsAndNotes)
		.show();

	fixTLbox(res.feedback);
}


/* ---------------------------------------------------------
 * Wait for Discogs React render
 * --------------------------------------------------------- */

var discogsBuildTLTimer = null;
var discogsTLBuilt = false;

function scheduleDiscogsTLBuild(){
	if (discogsTLBuilt){
		return;
	}

	clearTimeout(discogsBuildTLTimer);
	discogsBuildTLTimer = setTimeout(function(){
		if (discogsTLBuilt){
			return;
		}

		buildDiscogsTL();
		discogsTLBuilt = $("#tlEditor").length > 0;
	}, 350);
}

waitForKeyElements("#release-tracklist table", function(){
	scheduleDiscogsTLBuild();
});
