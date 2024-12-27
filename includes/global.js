/*
 * Global var definitions
 */
const d = $(document);
const url = $(location).attr('href');
const apiUrlTools = 'https://www.mixesdb.com/tools/api/api.php';
const debugFilter = '[MixesDB userscript]';
const TLbox = '<div class="Mixeswiki_WebTracklistsToCopy MixesDB_WebTracklistsToCopy" style="color:#f60; font-family:monospace,sans-serif; font-size:12px; margin-top:8px"></div><hr style="color:#ddd; margin-top:8px" /><p style="margin-top:8px; color:#f60; font-weight:bold">You still need to fix this in the <a href="https://www.mixesdb.com/tools/tracklist_editor/">Tracklist Editor</a></p>';

// MxesDB logo (96px height)
const mdbLogoUrl = 'data:image/png;base64,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';
const mdbLogoUrl_64 = 'data:image/png;base64,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';

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
 * redirect on every url change event listener
 */
function redirectOnUrlChange( delay_ms=0 ) {
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
