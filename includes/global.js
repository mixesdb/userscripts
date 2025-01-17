/*
 * Global constants
 */
const is_safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const d = $(document);
const url = $(location).attr('href');
const apiUrlTools = 'https://www.mixesdb.com/tools/api/api.php'; /* repeated in SoundCloud/scipt.funcs.js */
const debugFilter = '[MixesDB userscript]';
const TLbox = '<div class="Mixeswiki_WebTracklistsToCopy MixesDB_WebTracklistsToCopy" style="color:#f60; font-family:monospace,sans-serif; font-size:12px; margin-top:8px"></div><hr style="color:#ddd; margin-top:8px" /><p style="margin-top:8px; color:#f60; font-weight:bold">You still need to fix this in the <a href="https://www.mixesdb.com/tools/tracklist_editor/">Tracklist Editor</a></p>';
const msFadeSlow = 800;
const msWaitToggle = 200;

// MxesDB logo (96px height)
const mdbLogoUrl = 'data:image/jpeg;base64,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';
const mdbLogoUrl_64 = 'data:image/jpeg;base64,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';
const tidIconUrl = 'https://www.mixesdb.com/w/images/3/3c/trackid.net.png'; /* repeated in SoundCloud/scipt.funcs.js */

/*
 * Global vars
 */
var ta = '<div id="tlEditor"><textarea id="mixesdb-TLbox" class="mono" style="display:none; width:100%; margin:10px 0 0 0;"></textarea></div>';


/*
 * Log functions
 */

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
	log( "\n"+ seperator +"\n# "+ functionName +"()\n"+ seperator );
}

// log Vars
logVar( "is_safari", is_safari );


/*
 * URL funcs
 */

// urlPath
function urlPath(n) {
	return url.split('/')[n+2];
}
var domain = urlPath(0).replace(/.+\.(.+\.[a-z0-9]+)/gi, '$1'),
	subdomain = urlPath(0);

// getURLParameter
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]'+name+'=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

// makeTidSubmitUrl
function makeTidSubmitUrl( playerUrl, keywords="" ) {
    return 'https://trackid.net/submiturl?requestUrl='+encodeURIComponent( playerUrl )+'&keywords='+encodeURIComponent( keywords );
}


/*
 * Userscript helpers
 */

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

// durToSec
function durToSec( dur ) {
    var hms = dur.trim();   // your input string
    var a = hms.split(':'); // split it at the colons

    // minutes are worth 60 seconds. Hours are worth 60 minutes.
    var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);

    return seconds;
}

// convertHMS()
function convertHMS( s ) {
    var h = Math.floor(s / 3600); //Get whole hours
    s -= h * 3600;
    var m = Math.floor(s / 60); //Get remaining minutes
    s -= m * 60;
    return h + ":" + (m < 10 ? '0' + m : m) + ":" + (s < 10 ? '0' + s : s); //zero padding on minutes and seconds
}

// selectText()
function selectText( e ) {
    var t = document.getElementById(e),
		n = window.getSelection(),
		r = document.createRange();
    r.selectNodeContents(t);
	n.removeAllRanges();
	n.addRange(r)
}

// normalizeTitleForSearch
function normalizeTitleForSearch( title ) {
    return title.replace( / [-@] /g, " " ).replace( /[-().]/g, " " ).replace( /  /g, " " ).trim();
}


/* 
 * Create elements
 */

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


/*
 * Tracklist funcs
 */

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

	if( domain != "beatport.com" ) autosize(tl); // beatport.com buggy in FF

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
				 // Mixcloud bug when unicode_repl.js is included
				 //text: replaceUnicode( tl )
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
 * API related funcs
 */

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


/*
 * redirect on every url change event listener
 */
function redirectOnUrlChange( delay_ms=0 ) {
	logFunc( "redirectOnUrlChange(" );

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


/*
 * End
 */
log( "globals.js loaded" );
