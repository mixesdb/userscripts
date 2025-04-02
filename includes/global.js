/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Global constants, regExp, vars
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const is_safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const d = $(document);
const url = $(location).attr('href');
const apiUrlTools = 'https://www.mixesdb.com/tools/api/api.php'; /* repeated in SoundCloud/script.funcs.js */
const apiUrl_mw = "https://www.mixesdb.com/w/api.php";
const debugFilter = '[MixesDB userscript]';
const TLbox = '<div class="Mixeswiki_WebTracklistsToCopy MixesDB_WebTracklistsToCopy" style="color:#f60; font-family:monospace,sans-serif; font-size:12px; margin-top:8px"></div><hr style="color:#ddd; margin-top:8px" /><p style="margin-top:8px; color:#f60; font-weight:bold">You still need to fix this in the <a href="https://www.mixesdb.com/tools/tracklist_editor/">Tracklist Editor</a></p>';
const msFadeSlow = 800;
const msWaitToggle = 200;

// toolkitUrls_totalTimeout
// fires additionally after playerUrlItems_timeout
// must be at least SoundCloud API response time
const toolkitUrls_totalTimeout = 750;

// Logos, image URLs
const mdbLogoUrl = 'data:image/jpeg;base64,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';
const mdbLogoUrl_64 = 'data:image/jpeg;base64,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';
const favicon_TID = 'https://www.google.com/s2/favicons?sz=64&domain=trackid.net';
const checkIcon = '<img class="mdb-checked-icon" src="data:image/png;base64,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" alt="Checked">';

// regExp (repeated in toolkit.js)
const regExp_numbers = /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/; // https://stackoverflow.com/questions/1272696

// vars
var ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mdb-tlBox mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';

// visitDomain 
const visitDomain = location.hostname
          .replace("www.", "")
          .replace( /(.+\.)?ra\.co/, "ra.co" )
      ;
const domain_cssSafe = makeCssSafe( visitDomain );
logVar( "visitDomain / domain_cssSafe", visitDomain + " / " + domain_cssSafe );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Log functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// log
function log( text ) {
	console.log( debugFilter + ": " + text );
}

// logVar
function logVar( variable, string ) {
	if( string !== null ) {
		log( variable + ": " + string );
	} else {
		log( variable + " empty" );
	}
}

// logFunc
function logFunc( functionName ) {
	var seperator = "####################################";
	log( "\n"+ seperator +"\n# "+ functionName +"\n"+ seperator );
}

// logArr
function logArr( name, arr ) {
    log( name + ":\n" );

    $.each( arr, function( index, obj ) {
        log( obj );
    });
}

// log Vars
//logVar( "is_safari", is_safari );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * URL funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// add website domain to body class for global.css
$("body").addClass( domain_cssSafe );

// urlPath
function urlPath(n) {
    return $(location).attr('href').split('/')[n+2];
}

// urlPath_noParams
function urlPath_noParams(n) {
    var output = "";

    if( urlPath(n) ) {
        output = urlPath(n).replace( /\?.+$/, "" );
    }

    return output;
}

var domain = urlPath(0).replace(/.+\.(.+\.[a-z0-9]+)/gi, '$1'),
	subdomain = urlPath(0);

// getURLParameter
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]'+name+'=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

// getDomain_fromUrlStr
// example.com
function getDomain_fromUrlStr( urlString ) {
    var urlParts = urlString.split('/'); // Split the URL by '/'
    if( urlParts.length > 2 ) {
        return urlParts[2].replace("www.",""); // The hostname is the third part
    }
}

// normalizePlayerUrl
// removes https and www prefixes and optional characters at the end like "/"
function normalizePlayerUrl( playerUrl ) {
    return playerUrl.trim()
        .replace( /^(https?:\/\/)(.+)$/, "$2" )
        .replace( "www.", "" )
        .replace( /^(.+)\/$/, "$1" )
    ;
}

// urlIsTidSubmitCompatible
function urlIsTidSubmitCompatible( thisUrl ) {
    logFunc( "urlIsTidSubmitCompatible" );
    logVar( "thisUrl", thisUrl );

    if( thisUrl ) {
        var thisUrl_domain = getDomain_fromUrlStr( thisUrl ).replace("www.", "");

        switch( thisUrl_domain ) {
            case "hearthis.at":
                return true;
                break;
            case "mixcloud.com":
                return true;
                break;
            case "soundcloud.com":
                return true;
                break;
            case "youtube.com":
                return true;
                break;
            case "youtu.be":
                return true;
                break;
            default:
                return false;
        }
    } else {
        return false;
    }
}

// makeTidSubmitUrl
function makeTidSubmitUrl( playerUrl, keywords="" ) {
	var keyowrds = normalizeTitleForSearch( keywords );
    return 'https://trackid.net/submiturl?requestUrl='+encodeURIComponent( playerUrl )+'&keywords='+encodeURIComponent( keywords );
}

// makeTidSubmitLink
function makeTidSubmitLink( thisUrl, keywords="", linkText_mode="text" ) {
    var keyowrds = normalizeTitleForSearch( keywords ),
        tidUrl = makeTidSubmitUrl( thisUrl, keywords ),
        text = "Submit this player URL to TrackId.net",
        linkText = text;

    if( linkText_mode == "link-icon" ) {
        linkText = '<img class="tidSubmit-icon" src="'+favicon_TID+'" alt="'+text+'" style="max-height:1.2em;">';
    }

    var tidLink = '<a href="'+tidUrl+'"class="mdb-tidSubmit" target="_blank" >'+linkText+'</a>',
        tidLinkOut = tidLink;

    return tidLinkOut;
}

/*
 * getYoutubeIdFromUrl
 * returns 11 character ID
 * Most regExp fail on IDs starting with v
 */

// https://gist.github.com/afeld/1254889
const ytId_rx = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/* TESTING
var ytId_testUrls = [
    "https://www.youtube.com/watch?v=c_EF-aqiThA",
    "https://youtu.be/afK00BvvtaM",
    "https://youtu.be/vfK00BvvtaM?si=ro2ppYwwOjch9Eew",
    "https://www.youtube-nocookie.com/embed/vfK00BvvtaM?start=0&origin=https%3A%2F%2Fwww.1001tracklists.com&playsinline=1&enablejsapi=1&widgetid=2"
];


var i, match;
for (i = 0; i < ytId_testUrls.length; ++i) {
    match = ytId_testUrls[i].match(  ytId_rx );
    console.log( match[1] );
}
*/

function getYoutubeIdFromUrl(url){
    var match = url.match( ytId_rx );

    return ( match && match[1].length == 11 ) ? match[1] : false;
}

/*
 * isHearthisIdUrl
 * takes any URL
 */
function isHearthisIdUrl(url) {
    return /.*hearthis\.at.+/.test(url) && regExp_numbers.test(url.split("/")[3]);
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Embed funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Embed hearthis.at
 */
// embed_hearthis_fromId
function embed_hearthis_fromId( playerUrl, hearthisId, wrapper, insertType="append" ) {
    var embed = '<div class="mdb-player-audiostream" data-playerurl="'+playerUrl+'">';

    embed += '<iframe scrolling="no" width="100%" height="150" id="hearthis_at_track_'+hearthisId+'" src="https://app.hearthis.at/embed/'+hearthisId+'/transparent_black/?hcolor=&color=&style=2&block_size=2&block_space=1&background=1&waveform=0&cover=0&autoplay=0&css=" frameborder="0" allowtransparency allow="autoplay"></iframe>';
    embed += '</div>';

    // add output
    switch( insertType ) {
        case "before":
            wrapper.before( embed );
            break;
        case "prepend":
            wrapper.prepend( embed );
            break;
        case "append":
            wrapper.append( embed );
            break;
        case "after":
            wrapper.after( embed );
            break;
    }
}

// embed_hearthis_fromAnyUrl
function embed_hearthis_fromAnyUrl( playerUrl, wrapper, insertType="append" ) {
    var playerUrl_firstPath = playerUrl.split("/")[3];

    // https://hearthis.at/11715760/
    if( regExp_numbers.test( playerUrl_firstPath ) ) {
        embed_hearthis_fromId( playerUrl, playerUrl.split("/")[3], wrapper, insertType );

    } else {
        // https://hearthis.at/andrei-mor/01-djgigola-radio1sessentialmix-sat-01-25-2025-talion/
        $.ajax({
            url: playerUrl,
            success: function() {
                var matches_id = arguments[0].match( /(?:^.+<meta property="hearthis:embed:id" content=")(\d+)(".+$)/m ),
                    hearthisId = matches_id[1];

                if( regExp_numbers.test( hearthisId ) ) {
                    embed_hearthis_fromId( playerUrl, hearthisId, wrapper, insertType );
                }
            }
        });
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Array funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// array_unique
// return an array with no duplicates
function array_unique( arrayWithDuplicates ) {
    var uniqueArray = arrayWithDuplicates.filter(function(item, index) {
        return arrayWithDuplicates.indexOf(item) === index;
    });

    return uniqueArray;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Userscript helpers
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/* 
 * loadRawCss
 * GitHub delivers either the wrong MIME type for CSS fiels, so they can't be parsed in strict_mode
 * or deliveres outdated caches files:
 * https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.css   < Up to date, but Wrong MIME type. Wonn't be parsed in strict_mode
 * https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/TrackId.net/script.css              < Redirects to:
 * https://cdn.jsdelivr.net/gh/mixesdb/userscripts@refs/heads/main/TrackId.net/script.css         < Outdated for 2 hours
 * https://cdn.jsdelivr.net/gh/mixesdb/userscripts@latest/TrackId.net/script.css                  < same
 * https://cdn.jsdelivr.net/gh/mixesdb/userscripts/TrackId.net/script.css                         < same
 * 
 * Hence the only way to receive the latest commited version and have it parsed
 * is by loading the content of the raw.githubusercontent.com CSS file
 * and embed the CSS text in a scripttag
 */
function loadRawCss( urlVar ) {
    $.ajax({
        url: urlVar,
        dataType: "text",
        success: function(fileText) {
            // cssText will be a string containing the text of the file
            $('head').append( '<style>'+fileText+'</style>' );
        }
    });
}

// makeCssSafe
function makeCssSafe( text ) {
	return text
	           .replace("1001tracklists.com", "thousandandonetracklists.com")
	           .replace("www.","")
	           .replace(/\./, "-")
           ;
}

// mdbTooltip
function mdbTooltip( text, tooltip ) {
    return '<span class="mdb-tooltip" data-tooltip="'+tooltip+'">'+text+'</span>';
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Normalizing funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// normalizeTitleForSearch
function normalizeTitleForSearch( text ) {
    logFunc( "normalizeTitleForSearch" );

    if( text ) {
        logVar( "text", text );

        var textOut = text.replace(/[|-]/g, " ")
            .replace( / [-@] /g, " " )
            .replace( /[-().]/g, " " )
            .replace( /  /g, " " )
            .replace(/(#|\[|]|\(|\)|\.|\*| I )/g, " ")
            .replace(/ (Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)( |-|$)/g, " ")
            .replace(/\s+/g, " ")
            .replace(/(\/)/g, " ")
            .replace(/ (on) /g, " ")
            .replace(/RA (\d)/g, "RA.$1")
            .replace( /^Andrei Mor - /, "" )
            .replace("Radio 1's", "")
            .trim();

        logVar( "textOut", textOut );

        return textOut;
    }
}

// normalizeStreamingServiceTracks
function normalizeStreamingServiceTracks( text ) {
	// [] to ()
	// https://music.apple.com/de/album/foo/1647160327
	var textOut = text
		.replace( /\[/g, "(" )
		.replace( /\]/g, ")" )
	;
	
    // Pointless versions
    var textOut = textOut
        .replace( " (Mixed)", "" )
    ;
	
    /*
     * IDs for live mixes, e.g. on Apple Music
     * https://music.apple.com/us/album/foo/1500933343
     * https://music.apple.com/us/album/foo/1787060099
     */
    textOut = textOut
        .replace( /ID\d+( \(from.+\))?/g, "ID" )
        .replace( "ID / ID", "ID" ) // fix for above
        .replace( /\s+/g, " " )
    ;

    return textOut;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Duration and time converting funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// durToSec
function durToSec( dur ) {
    var hms = dur.trim();
    var a = hms.split(':');

    // minutes are worth 60 seconds. Hours are worth 60 minutes.
    var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);

    return seconds;
}

// convertHMS()
function convertHMS( s ) {
    var h = Math.floor(s / 3600); // Get whole hours
    s -= h * 3600;
    var m = Math.floor(s / 60); // Get remaining minutes
    s -= m * 60;
    return h + ":" + (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s); //zero padding on minutes and seconds
}

// durToSec_MS
// durToSec_MS("3:18") returns 198
function durToSec_MS( dur ) {
    var hms = dur.trim();   // your input string
    var a = hms.split(':'); // split it at the colons
    var seconds = (+a[0]) * 60 + (+a[1]); // min x 60 + sec

    return seconds;
}

// roundSecsToCueMin
function roundSecsToCueMin( sec ) {
    return ( sec / 60 ).toFixed();
}

// padCueMin( 0, padTo );
function pad(str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Selecting text
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// selectText()
function selectText( e ) {
    var t = document.getElementById(e),
		n = window.getSelection(),
		r = document.createRange();
    r.selectNodeContents(t);
	n.removeAllRanges();
	n.addRange(r)
}

// mdb-select-onClick
waitForKeyElements(".mdb-selectOnClick", function( jNode ) {
    jNode.click(function(){
        log( "click" );
        $(this).addClass("selected").select().focus();

        var tagName = $(this).prop("tagName");
        //log( tagName );
        if( tagName == 'DATE' || tagName == "H1" || tagName == "SPAN" || tagName == "PRE" ) {
            selectText( $(this).attr("id") );
        }
    });
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * File details
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// getFileDetails_forToggle
function getFileDetails_forToggle( dur_sec, bytes="" ) {
    logFunc( "getFileDetails_forToggle" );

    var dur = convertHMS( dur_sec );
    logVar( "dur", dur );

    if( dur !== null ) {
       return '<div id="mdb-fileDetails" style="display:none"><textarea class="mdb-selectOnClick" rows="9">{|{{NormalTableFormat-Bytes}}\n! dur\n! bytes\n! kbps\n|-\n| '+dur+'\n| '+bytes+'\n| \n|}</textarea></div>';
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Create elements
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// create_input
function create_input( text, className, id ) {
	return '<input class="mdb-element input '+ className +'" id="'+id+'" name="'+id+'" value="'+text+'" />';
}

// create_note
function create_note( text, className ) {
	return '<span class="mdb-element note '+ className +'">'+text+'</span>';
}

// create_button
function create_button( text, className, type ) {
	return '<button type="'+type+'" class="mdb-element button '+ className +'">'+text+'</button>';
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Autosize 3.0.15
// http://www.jacklmoore.com/autosize
!function(e,t){if("function"==typeof define&&define.amd)define(["exports","module"],t);else if("undefined"!=typeof exports&&"undefined"!=typeof module)t(exports,module);else{var n={exports:{}};t(n.exports,n),e.autosize=n.exports}}(this,function(e,t){"use strict";function n(e){function t(){var t=window.getComputedStyle(e,null);p=t.overflowY,"vertical"===t.resize?e.style.resize="none":"both"===t.resize&&(e.style.resize="horizontal"),c="content-box"===t.boxSizing?-(parseFloat(t.paddingTop)+parseFloat(t.paddingBottom)):parseFloat(t.borderTopWidth)+parseFloat(t.borderBottomWidth),isNaN(c)&&(c=0),i()}function n(t){var n=e.style.width;e.style.width="0px",e.offsetWidth,e.style.width=n,p=t,f&&(e.style.overflowY=t),o()}function o(){var t=window.pageYOffset,n=document.body.scrollTop,o=e.style.height;e.style.height="auto";var i=e.scrollHeight+c;return 0===e.scrollHeight?void(e.style.height=o):(e.style.height=i+"px",v=e.clientWidth,document.documentElement.scrollTop=t,void(document.body.scrollTop=n))}function i(){var t=e.style.height;o();var i=window.getComputedStyle(e,null);if(i.height!==e.style.height?"visible"!==p&&n("visible"):"hidden"!==p&&n("hidden"),t!==e.style.height){var r=d("autosize:resized");e.dispatchEvent(r)}}var s=void 0===arguments[1]?{}:arguments[1],a=s.setOverflowX,l=void 0===a?!0:a,u=s.setOverflowY,f=void 0===u?!0:u;if(e&&e.nodeName&&"TEXTAREA"===e.nodeName&&!r.has(e)){var c=null,p=null,v=e.clientWidth,h=function(){e.clientWidth!==v&&i()},y=function(t){window.removeEventListener("resize",h,!1),e.removeEventListener("input",i,!1),e.removeEventListener("keyup",i,!1),e.removeEventListener("autosize:destroy",y,!1),e.removeEventListener("autosize:update",i,!1),r["delete"](e),Object.keys(t).forEach(function(n){e.style[n]=t[n]})}.bind(e,{height:e.style.height,resize:e.style.resize,overflowY:e.style.overflowY,overflowX:e.style.overflowX,wordWrap:e.style.wordWrap});e.addEventListener("autosize:destroy",y,!1),"onpropertychange"in e&&"oninput"in e&&e.addEventListener("keyup",i,!1),window.addEventListener("resize",h,!1),e.addEventListener("input",i,!1),e.addEventListener("autosize:update",i,!1),r.add(e),l&&(e.style.overflowX="hidden",e.style.wordWrap="break-word"),t()}}function o(e){if(e&&e.nodeName&&"TEXTAREA"===e.nodeName){var t=d("autosize:destroy");e.dispatchEvent(t)}}function i(e){if(e&&e.nodeName&&"TEXTAREA"===e.nodeName){var t=d("autosize:update");e.dispatchEvent(t)}}var r="function"==typeof Set?new Set:function(){var e=[];return{has:function(t){return Boolean(e.indexOf(t)>-1)},add:function(t){e.push(t)},"delete":function(t){e.splice(e.indexOf(t),1)}}}(),d=function(e){return new Event(e)};try{new Event("test")}catch(s){d=function(e){var t=document.createEvent("Event");return t.initEvent(e,!0,!1),t}}var a=null;"undefined"==typeof window||"function"!=typeof window.getComputedStyle?(a=function(e){return e},a.destroy=function(e){return e},a.update=function(e){return e}):(a=function(e,t){return e&&Array.prototype.forEach.call(e.length?e:[e],function(e){return n(e,t)}),e},a.destroy=function(e){return e&&Array.prototype.forEach.call(e.length?e:[e],o),e},a.update=function(e){return e&&Array.prototype.forEach.call(e.length?e:[e],i),e}),t.exports=a});

// fixTLbox
function fixTLbox( feedback ) {
	var tl = $("#mixesdb-TLbox");
	tl.html( tl.html().replace(/&(nbsp|thinsp);/g, ' ') );
	var text = "TEMPBEGINNING" + tl.val(),
		textFix = text.replace(/TEMPBEGINNING(\n)?/g,"")
	                  .replace(/\n$/g,"")
					  .replace(/( )+/g, " ");
	tl.val(textFix);
	var text = tl.val(),
		lines = text.split("\n"),
		count = lines.length;
	tl.attr('rows', count);

	autosize(tl); // beatport.com buggy in FF

	if( feedback != null && feedback.text ) {
		var tle = $("#tlEditor");
		tle.addClass("bot10");
		tl.attr( "id", "mixesdb-TLbox tlEditor-textarea" );

		if( feedback.warnings > 0 ) {
			tle.addClass( "tlEditor-feedback-warning" );
		} else {
			if( feedback.hints > 0 ) {
				tle.addClass( "tlEditor-feedback-hint" );
			} else {
				if( feedback.status == "incomplete" ) {
					tle.addClass( "tlEditor-feedback-hint" );
				} else {
					tle.addClass( "tlEditor-feedback-complete" );
				}
			}
		}
		tl.after( feedback.text );
	}
	loadRawCss( "https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/tracklistEditor_copy.css" );
		
	tl.show().select().addClass("fixed");
}

// apiTracklist
// allow site domain in Apache
// allow mixesdb scxripts on site
function apiTracklist( tl, type, genType ) {
	var data = { query: "tracklistEditor",
				 type: type,
				 genType: genType,
				 text: tl
			   };

	var jqXHR = $.ajax({
		type: "POST",
		url: apiUrlTools,
		data: data,
		async: false
	});

	var res = JSON.parse(jqXHR.responseText);

	return res;
}

/*
 * getTracklistArray
 * split text tracklist into an array
 * "from" not used yet
 */
function getTracklistArr( tl, from="", cues="" ) {
    var tlArr = [],
        rows = tl.trim().split("\n"),
        cue_sum = 0;
    //logVar( "rows", rows );

    $.each( rows, function( index, row ) {
        var cue = "",
            dur = "", /* sum up dur of before track durs */
            artistSong = "",
            label = "",
            isGap = "false";
        //logVar( "row", row );
        logVar( "index", index );

        if( row ) {
            // gap
            if( row.match( /^\s*\.{3}\s*$/g ) ) {
                isGap = "true";
            }

            // cue
            if( row.match( /^\[/g ) ) {
                var timePrefix = row.replace( /(\[)(.+)(\] .+)$/g, "$2" );

                if( cues == "track duration" ) {
                    dur = timePrefix;

                    if( index > 0 ) { // first track has no previous track dur to add (cue will be 00 or 000)
                        var index_prev = index - 1,
                        dur_previousRow = rows[index_prev].replace( /(\[)(.+)(\] .+)$/g, "$2" );

                        cue_sum = cue_sum + durToSec_MS( dur_previousRow );
                    }
                } else {
                    cue = timePrefix;
                }
            }

            // artistSong
            if( row.match( /^(\[[\d:]+\] )?.+ - .+$/g ) ) {
                artistSong = row.replace( /^(\[[\d:]+\] )?(.+ - .+)(\[.+\])?$$/, "$2" );
            }

            // label
            if( row.match( /^.+ - .+ \[.+\]$/g ) ) {
                label = row.replace( /^(.+ - .+ \[)(.+)(\])$$/, "$2" );
            }

            // trackObj
            const trackObj = {
                "id" : index + 1,
                "isGap" : isGap,
                "cue" : cue,
                "cue_sum" : cue_sum,
                "cue_sum_hms" : convertHMS( cue_sum ),
                "dur" : dur,
                "artistSong" : artistSong,
                "label" : label
            };

            tlArr.push( JSON.stringify(trackObj) );

        } else {
            log( "Failed to split tl into rows." );
        }
    });

    return tlArr;
}

/*
 * makeTracklistFromArr
 * takes the array from getTracklistArr()
 * outputs text tl, which should be passed to TLE API ("Standard")
 */
function makeTracklistFromArr( tlArr, from="", cues="" ) {
    var tl = "",
        cue_sum_lastTrack = $.parseJSON( tlArr[tlArr.length-1] ).cue_sum,
        cue_sum_lastTrack_rounded = roundSecsToCueMin( cue_sum_lastTrack );
    //logVar( "cue_sum_lastTrack_rounded", cue_sum_lastTrack_rounded )

    // build tl
    $.each( tlArr, function( index, trackArr ) {
        var track = $.parseJSON( trackArr ),
            id = track.id,
            isGap = track.isGap,
            cue = track.cue,
            cue_sum_rounded = roundSecsToCueMin( track.cue_sum ),
            cue_sum_hms = track.cue_sum_hms,
            dur = track.dur,
            artistSong = track.artistSong,
            label = track.label;

        if( from == "Apple Music" ) {
            if( cues == "track duration" ) {
                var padTo = 2;

                if(cue_sum_lastTrack_rounded > 99 ) {
                    padTo = 3;
                }

                cue = pad( cue_sum_rounded, padTo );

                // TODO check if every track has a cue (disabled tracks in album have none)

            } else {
                if ( cues == "track duration control" ) {
                    cue = cue_sum_hms;
                    label = dur;
                }
            }
        }

        // build tl
        if( cue !== "" && cues != "allTracksHaveDurs-not" ) {
            tl += "["+cue+"] ";
        }

        tl += artistSong;

        if( label !== "" ) {
            tl += " ["+label+"]";
        }

        tl += "\n";
    });

    return tl;
}

/*  
 * removeDuplicateBracketedText
 * Input  "[0:59:03] Sebo K - Spirits (feat. Max Moya) [Drum Version] (Drum Version)"
 * Input  "[0:59:03] Sebo K - Spirits (feat. Max Moya) (Drum Version) [Drum Version]"
 * Result "[0:59:03] Sebo K - Spirits (feat. Max Moya) (Drum Version)"
 * E.g. https://trackid.net/audiostreams/groove-podcast-451-marie-lung
 */
function removeDuplicateBracketedText( text ) {
    //logFunc( "removeDuplicateBracketedText" );
    //logVar( "text", text );

    let unique = new Set();
    let result = text.replace(/([\(\[])(.*?)([\)\]])/g, (match, open, content, close) => {
        let normalizedContent = content.trim();
        if (unique.has(normalizedContent)) {
            return ''; // Remove duplicate entries
        }
        unique.add(normalizedContent);
        return `(${normalizedContent})`; // Prefer round brackets
    });

    return result.replace(/\s+/g, ' ').trim(); // Remove extra spaces
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * API related funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// linkify
function linkify( inputText ) {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}

// textify
function textify( text ) {
    return text
        .replace( /({\n|\n})/gm, "" )
        .replace( /^\t{1}/gm, "" )
        .replace( /"user": \t/, '"user":\n' )
        .replace( /("|,|null,?)/g, '' )
        .replace( /\\n/g, '<br />' )
    ;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Redirect on every url change event listener
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function redirectOnUrlChange( delay_ms=0 ) {
	logFunc( "redirectOnUrlChange" );

    window.setTimeout(function(){
        // event listener
        var pushState = history.pushState;
        var replaceState = history.replaceState;
        history.pushState = function() {
            pushState.apply(history, arguments);
            window.dispatchEvent(new Event('pushstate'));
            window.dispatchEvent(new Event('locationchange'));
        };
        history.replaceState = function() {
            replaceState.apply(history, arguments);
            window.dispatchEvent(new Event('replacestate'));
            window.dispatchEvent(new Event('locationchange'));
        };
        window.addEventListener('popstate', function() {
            window.dispatchEvent(new Event('locationchange'))
        });

        // redirect
        window.addEventListener('locationchange', function(){
        	log( "URL change!" )
            var newUrl = location.href;
            log( 'onlocationchange event occurred > redirecting to ' + newUrl );
            window.location.replace( newUrl );
        });
    }, delay_ms );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Time converting and timezone funcs
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// convertUTCDateToLocalDate
// var localDate_iso = convertUTCDateToLocalDate( new Date( '2025-02-12T09:03:17Z' ) ).toLocaleString( "sv-SE" );
function convertUTCDateToLocalDate(date) {
    return new Date( date.getTime() ); 
}

/* 
 * Timeago
 * is a jQuery plugin that makes it easy to support automatically updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 * http://timeago.yarp.com/
 * @version 1.6.7 @requires jQuery >=1.5.0 <4.0 @author Ryan McGeary @license MIT License - http://www.opensource.org/licenses/mit-license.php
 * Copyright (c) 2008-2019, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && typeof module.exports === 'object') {
    factory(require('jquery'));
  } else {
    // Browser globals
    factory(jQuery);
  }
}(function ($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else if (typeof timestamp === "number") {
      return inWords(new Date(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowPast: true,
      allowFuture: false,
      localeTitle: false,
      cutoff: 0,
      autoDispose: true,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        inPast: "any moment now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },

    inWords: function(distanceMillis) {
      if (!this.settings.allowPast && ! this.settings.allowFuture) {
          throw 'timeago allowPast and allowFuture settings can not both be set to false.';
      }

      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      if (!this.settings.allowPast && distanceMillis >= 0) {
        return this.settings.strings.inPast;
      }

      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;

      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }

      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
        seconds < 90 && substitute($l.minute, 1) ||
        minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
        minutes < 90 && substitute($l.hour, 1) ||
        hours < 24 && substitute($l.hours, Math.round(hours)) ||
        hours < 42 && substitute($l.day, 1) ||
        days < 30 && substitute($l.days, Math.round(days)) ||
        days < 45 && substitute($l.month, 1) ||
        days < 365 && substitute($l.months, Math.round(days / 30)) ||
        years < 1.5 && substitute($l.year, 1) ||
        substitute($l.years, Math.round(years));

      var separator = $l.wordSeparator || "";
      if ($l.wordSeparator === undefined) { separator = " "; }
      return $.trim([prefix, words, suffix].join(separator));
    },

    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d+/,""); // remove milliseconds
      s = s.replace(/-/,"/").replace(/-/,"/");
      s = s.replace(/T/," ").replace(/Z/," UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2"); // -04:00 -> -0400
      s = s.replace(/([\+\-]\d\d)$/," $100"); // +09 -> +0900
      return new Date(s);
    },
    datetime: function(elem) {
      var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    },
    isTime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
    }
  });

  // functions that can be called via $(el).timeago('action')
  // init is default when no action is given
  // functions are called with context of a single element
  var functions = {
    init: function() {
      functions.dispose.call(this);
      var refresh_el = $.proxy(refresh, this);
      refresh_el();
      var $s = $t.settings;
      if ($s.refreshMillis > 0) {
        this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
      }
    },
    update: function(timestamp) {
      var date = (timestamp instanceof Date) ? timestamp : $t.parse(timestamp);
      $(this).data('timeago', { datetime: date });
      if ($t.settings.localeTitle) {
        $(this).attr("title", date.toLocaleString());
      }
      refresh.apply(this);
    },
    updateFromDOM: function() {
      $(this).data('timeago', { datetime: $t.parse( $t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title") ) });
      refresh.apply(this);
    },
    dispose: function () {
      if (this._timeagoInterval) {
        window.clearInterval(this._timeagoInterval);
        this._timeagoInterval = null;
      }
    }
  };

  $.fn.timeago = function(action, options) {
    var fn = action ? functions[action] : functions.init;
    if (!fn) {
      throw new Error("Unknown function name '"+ action +"' for timeago");
    }
    // each over objects here and call the requested function
    this.each(function() {
      fn.call(this, options);
    });
    return this;
  };

  function refresh() {
    var $s = $t.settings;

    //check if it's still visible
    if ($s.autoDispose && !$.contains(document.documentElement,this)) {
      //stop if it has been removed
      $(this).timeago("dispose");
      return this;
    }

    var data = prepareData(this);

    if (!isNaN(data.datetime)) {
      if ( $s.cutoff === 0 || Math.abs(distance(data.datetime)) < $s.cutoff) {
        $(this).text(inWords(data.datetime));
      } else {
        if ($(this).attr('title').length > 0) {
            $(this).text($(this).attr('title'));
        }
      }
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if ($t.settings.localeTitle) {
        element.attr("title", element.data('timeago').datetime.toLocaleString());
      } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}));
/* END Timeago */


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * End
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "globals.js loaded" );
