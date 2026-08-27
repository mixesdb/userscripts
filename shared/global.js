/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Global constants, regExp, vars
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const is_safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const d = $(document);
const url = $(location).attr('href');

const githubPath_raw = "https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/";
const apiUrlTools = 'https://www.mixesdb.com/tools/api/api.php'; /* repeated in SoundCloud/script.funcs.js */
const apiUrl_mw = "https://www.mixesdb.com/w/api.php";
const debugFilter = "[MixesDB userscript]";
const TLbox = '<div class="Mixeswiki_WebTracklistsToCopy MixesDB_WebTracklistsToCopy" style="color:#f60; font-family:monospace,sans-serif; font-size:12px; margin-top:8px"></div><hr style="color:#ddd; margin-top:8px" /><p style="margin-top:8px; color:#f60; font-weight:bold">You still need to fix this in the <a href="https://www.mixesdb.com/tools/tracklist_editor/">Tracklist Editor</a></p>';
const msFadeSlow = 800;
const msWaitToggle = 200;

// Location qualifiers that some sources append to artist names, e.g.
// "Felipe Garcia (UY)" or "PAAX (Tulum)".
const artistLocationCountryCodes = [
    'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AUS', 'AW', 'AX', 'AZ',
    'BA', 'BB', 'BD', 'BE', 'BER', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
    'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
    'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
    'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
    'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'ITA', 'JE', 'JM', 'JO', 'JP',
    'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
    'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
    'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
    'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
    'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
    'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];
const artistLocationCityNames = ['Tulum'];

// toolkitUrls_totalTimeout
// fires additionally after playerUrlItems_timeout
// must be at least SoundCloud API response time
const toolkitUrls_totalTimeout = 750;

// Logos, image URLs
const mdbLogoUrl = 'data:image/jpeg;base64,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';
const mdbLogoUrl_64 = 'data:image/jpeg;base64,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';
const favicon_TID = 'https://www.google.com/s2/favicons?sz=64&domain=trackid.net';
const checkIcon_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOYAAADDCAMAAACh1Z0MAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAyIDc5Ljc4Yjc2MzhlNiwgMjAyNS8wMi8xMS0yMzoxNDoxNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QjU5NTVEMDMwN0MyMTFGMEI5NDVCQkIyOEU4RDRGQTEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QjU5NTVEMDQwN0MyMTFGMEI5NDVCQkIyOEU4RDRGQTEiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpCNTk1NUQwMTA3QzIxMUYwQjk0NUJCQjI4RThENEZBMSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpCNTk1NUQwMjA3QzIxMUYwQjk0NUJCQjI4RThENEZBMSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Poq9nEsAAAMAUExURXrI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';
const checkIcon = '<img class="mdb-checked-icon" src="'+checkIcon_url+'" alt="Checked">';

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
 * Trusted Types
 *
 * Only the report survives here. The policy that keeps jQuery loadable under
 * "require-trusted-types-for 'script'" has to exist before jQuery is parsed, so it lives in
 * shared/trustedTypes.js and is @require'd ahead of it - by the time global.js runs, the
 * outcome is already decided. See that file for the whole story.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

logVar( "Trusted Types", typeof getTrustedTypesStatus === "function"
        ? getTrustedTypesStatus()
        : "unguarded - this script does not @require shared/trustedTypes.js before jQuery (only matters on sites sending require-trusted-types-for)" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Artwork funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function getArtworkImageType( artworkUrl ) {
    artworkUrl = ( artworkUrl || "" ).replace(/(\r\n|\n|\r)/gm, "");

    var urlPath = artworkUrl.split(/[?#]/)[0],
        fileName = urlPath.split("/").pop(),
        imageTypeMatches = fileName.match(/\.[a-zA-Z0-9]{3,4}(?=$|[^a-zA-Z0-9])/g) || [],
        imageType = imageTypeMatches.pop();

    return imageType ? imageType.replace(".", "").toUpperCase() : "";
}

function getArtworkInfoText( artworkUrl, imageWidth, imageHeight ) {
    var imageType = getArtworkImageType( artworkUrl );
    return imageWidth +'&thinsp;x&thinsp;'+ imageHeight + ( imageType ? ' '+ imageType : '' );
}

// getArtworkAltExtensionUrl
// SoundCloud's API artwork_url always claims a .jpg extension, but the file actually stored
// for "-original" (and sometimes other sizes) can be a PNG - requesting it as .jpg then 403s.
// Swap jpg<->png so loadArtworkInfo can retry with the extension that actually exists.
function getArtworkAltExtensionUrl( artworkUrl ) {
    if( /\.jpe?g$/i.test( artworkUrl ) ) {
        return artworkUrl.replace( /\.jpe?g$/i, ".png" );
    } else if( /\.png$/i.test( artworkUrl ) ) {
        return artworkUrl.replace( /\.png$/i, ".jpg" );
    }
    return null;
}

// loadArtworkInfo
// callback( artworkInfoText, resolvedUrl ) - artworkInfoText is null/undefined if the image
// could not be loaded under any tried extension, so callers can stop showing "loading…".
function loadArtworkInfo( artworkUrl, callback, isAltAttempt ) {
    var img = new Image();
    img.onload = function() {
        callback( getArtworkInfoText( artworkUrl, this.width, this.height ), artworkUrl );
    };
    img.onerror = function() {
        var altUrl = !isAltAttempt && getArtworkAltExtensionUrl( artworkUrl );
        if( altUrl ) {
            logVar( "loadArtworkInfo: " + artworkUrl + " failed to load, retrying with", altUrl );
            loadArtworkInfo( altUrl, callback, true );
        } else {
            logVar( "loadArtworkInfo: giving up, could not load", artworkUrl );
            callback( null, artworkUrl );
        }
    };
    img.src = artworkUrl;
}

function createArtworkInfoWrapper( artworkUrl, options ) {
    options = options || {};

    var wrapper = $("<div>").addClass( "mdb-element" ); // mdb-element: taken down again on SPA navigation, see mdbCreatedSelector
    if( options.wrapperId ) wrapper.attr( "id", options.wrapperId );
    if( options.wrapperClass ) wrapper.addClass( options.wrapperClass );

    var input = $("<input>", {
        type: "text",
        value: artworkUrl
    });
    if( options.inputId ) input.attr( "id", options.inputId );
    if( options.inputClass ) input.addClass( options.inputClass );
    if( options.readonly ) input.prop( "readonly", true );

    var link = $("<a>", {
        href: artworkUrl,
        target: "_blank"
    }).text( options.loadingText || "loading…" );

    var info = $("<div>");
    if( options.infoId ) info.attr( "id", options.infoId );
    if( options.infoClass ) info.addClass( options.infoClass );
    info.append( link );

    wrapper.append( input, info );

    // small copy button right behind the URL input, in front of the width/type info
    appendMdbCopyTextButton( input, {
        ariaLabel: "Copy the artwork URL",
        buttonTitle: "Copy the artwork URL",
        copiedMessage: function() {
            return "Artwork URL copied!";
        },
        processedClass: "mdb-artwork-input-copy-processed"
    });

    loadArtworkInfo( artworkUrl, function( artworkInfo, resolvedUrl ) {
        if( artworkInfo ) {
            if( resolvedUrl !== artworkUrl ) {
                // the requested extension 403'd - point the input/link at the URL that actually loaded
                input.val( resolvedUrl );
                link.attr( "href", resolvedUrl );
            }
            link.html( artworkInfo );
        } else {
            link.text( "artwork unavailable" ).addClass( "mdb-warning" );
        }
    });

    return wrapper;
}


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

// removeParametersFromUrl
// https://soundcloud.com/maki_was_here/potatohead-april-27-2025-pm06?in=maki_was_here/sets/mixes%2526si=a737087405ee490995461959173c4f21%2526utm_source=clipboard%2526utm_medium=text%2526utm_campaign=social_sharing
// returns: https://soundcloud.com/maki_was_here/potatohead-april-27-2025-pm06
function removeParametersFromUrl( url ) {
    return url.split('?')[0];
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

// removeDotsFromUrlSlug
// https://hearthis.at/subfader/h.o.u.s.e./ → https://hearthis.at/subfader/house/
String.prototype.removeDotsFromUrlSlug = function() {

    // keep original URL string
    let url = this.toString();

    // split into parts
    let parts = url.split("/");

    // get last non-empty part (slug)
    let slug = parts.pop();
    if (slug === "") slug = parts.pop();    // handle trailing slash

    // remove all dots inside slug
    let cleanSlug = slug.replace(/\./g, "");

    // put cleaned slug back
    parts.push(cleanSlug);

    // return rebuilt URL (always with trailing slash)
    return parts.join("/") + "/";
};

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
    var keyowrds = normalizeTitleForSearch( keywords ),
        youtubeId = getYoutubeIdFromUrl( playerUrl );

    if( youtubeId && /(?:^|\.)youtube(?:-nocookie)?\.com$|(?:^|\.)youtu\.be$/i.test( new URL( playerUrl, "https://www.youtube.com" ).hostname ) ) {
        playerUrl = "https://www.youtube.com/watch?v=" + youtubeId;
    }

    // no empty &keywords= - a playlist/set submission has no keywords to send at all
    var keywordsParam = keywords ? '&keywords='+encodeURIComponent( keywords ) : '';

    return 'https://trackid.net/submiturl?requestUrl='+encodeURIComponent( playerUrl )+keywordsParam;
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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Submit a whole playlist/set to TrackId.net
 *
 * TrackId.net takes a playlist/set URL as well as a single player URL, which saves
 * submitting every player of a set by hand. Everything except "where does the link go on
 * this site" is shared here; the site scripts only pass their own anchor element.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * isSubmittableYoutubeListId
 * Not every list= names a playlist TrackId.net could fetch:
 *   RD…       YouTube's auto-generated Mix/radio. It is put together per viewer and per
 *             session, and /playlist?list=RD… is not a page at all.
 *   WL/LL/LM  Watch Later, Liked videos, Liked music - private to the signed-in account, so
 *             the submission would only ever get an empty page.
 */
function isSubmittableYoutubeListId( listId ) {
    return !/^RD/.test( listId ) && !/^(WL|LL|LM)$/.test( listId );
}

/*
 * getPlaylistPageInfo
 * Recognizes the playlist/set URL scheme of the supported sites, false for any other page:
 *   https://soundcloud.com/[channel]/sets/[set-name]
 *   https://www.mixcloud.com/[channel]/playlists/[playlist-name]/
 *   https://www.youtube.com/playlist?list=[playlist_id]
 *   https://www.youtube.com/watch?v=[video_id]&list=[playlist_id]
 * Returns:
 *   url  - the page URL reduced to what identifies the playlist and rebuilt on the canonical
 *          host, so tracking/session parameters (?si=, ?utm_*, SoundCloud's ?in=, ...) and
 *          host variants (m./music., missing www) never reach TrackId.net as different
 *          submissions of the same playlist.
 *   term - what the site itself calls it, for the link text.
 */
function getPlaylistPageInfo( pageUrl ) {
    var parsedUrl;

    try {
        parsedUrl = new URL( pageUrl || location.href );
    } catch( e ) {
        return false;
    }

    var host = parsedUrl.hostname,
        path = parsedUrl.pathname.split("/").filter(Boolean); // filter drops the empty parts leading/trailing slashes produce

    // SoundCloud sets
    if( /(^|\.)soundcloud\.com$/i.test( host ) && path[1] == "sets" && path[2] ) {
        return { url: "https://soundcloud.com/" + path[0] + "/sets/" + path[2], term: "set" };
    }

    // Mixcloud playlists - the trailing slash is part of the canonical URL there
    if( /(^|\.)mixcloud\.com$/i.test( host ) && path[1] == "playlists" && path[2] ) {
        return { url: "https://www.mixcloud.com/" + path[0] + "/playlists/" + path[2] + "/", term: "playlist" };
    }

    /*
     * YouTube playlists - "list" is not just a parameter here, it IS the page, so it stays.
     * A watch page carrying a list= plays that same playlist in the panel in its right
     * sidebar, so it identifies the playlist just as well and is reduced to the very same
     * canonical /playlist?list= URL: what goes to TrackId.net is the whole playlist, not the
     * one video that happens to be playing - and submitting it from either page is then the
     * same submission rather than two.
     */
    if( /(^|\.)youtube\.com$/i.test( host ) && ( path[0] == "playlist" || path[0] == "watch" ) ) {
        var listId = parsedUrl.searchParams.get("list");

        if( listId && isSubmittableYoutubeListId( listId ) ) {
            return { url: "https://www.youtube.com/playlist?list=" + listId, term: "playlist" };
        }
    }

    return false;
}

/*
 * makeTidPlaylistSubmitLink
 * Takes the object getPlaylistPageInfo() returned (not a URL - the caller has to have
 * checked for a playlist page anyway) and returns the link as a DOM element.
 *
 * An element, not an HTML string, because this link's main home is YouTube: handing jQuery
 * a string makes it parse the markup through innerHTML, which Trusted Types blocks there
 * (see installTrustedTypesPassthrough). Inserting a ready-made node never touches that sink,
 * so the link also appears when the default policy could not be installed.
 */
function makeTidPlaylistSubmitLink( playlistPageInfo ) {
    var link = document.createElement( "a" );

    link.href = makeTidSubmitUrl( playlistPageInfo.url );
    link.className = "mdb-tidSubmit mdb-tidSubmit-playlist";
    // target="_blank" instead of our usual _top: you keep working through the playlist page
    // itself while the submission runs in the other tab.
    link.target = "_blank";
    link.title = playlistPageInfo.url + " (opens in a new tab)";

    // favicon_TID asks Google's favicon service for 64px; drawn at 16 CSS px (see
    // global.css) that is 4x, so it stays sharp on retina/HiDPI screens.
    // alt="" on purpose: the link text right next to it already says the same thing.
    var icon = document.createElement( "img" );
    icon.className = "tidSubmit-icon";
    icon.src = favicon_TID;
    icon.alt = "";
    icon.width = 16;
    icon.height = 16;

    link.appendChild( icon );
    link.appendChild( document.createTextNode( "Submit this " + playlistPageInfo.term + " to TrackId.net" ) );

    return link;
}

/*
 * addTidPlaylistSubmitLink
 * Adds that link relative to targetNode, once per page, and does nothing at all when the
 * page is not one of the playlist/set URLs - so a site script can hand over any header
 * element it finds without checking the URL itself first.
 * position: "after" (default), "before", "append" or "prepend", relative to targetNode.
 * pageUrl: only needed where location.href is not the address bar URL (SoundCloud's webi frame).
 */
function addTidPlaylistSubmitLink( targetNode, position, pageUrl ) {
    var playlistPageInfo = getPlaylistPageInfo( pageUrl );

    if( !playlistPageInfo ) return false; // not a playlist/set page, stay quiet - runs on every page

    logFunc( "addTidPlaylistSubmitLink" );

    var target = $( targetNode );

    if( !target.length ) {
        log( "No target node to add the playlist submit link to." );
        return false;
    }

    if( $(".mdb-tidSubmit-playlist").length ) {
        log( "Playlist submit link is already on the page." );
        return false;
    }

    var wrapper = document.createElement( "div" );
    wrapper.className = "mdb-element mdb-tidSubmit-playlist-wrapper"; // mdb-element: taken down again on SPA navigation, see mdbCreatedSelector
    wrapper.appendChild( makeTidPlaylistSubmitLink( playlistPageInfo ) );

    switch( position ) {
        case "before":
            target.before( wrapper );
            break;
        case "append":
            target.append( wrapper );
            break;
        case "prepend":
            target.prepend( wrapper );
            break;
        default:
            target.after( wrapper );
    }

    logVar( "Playlist submit link added for", playlistPageInfo.url );

    return true;
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
    function isValidYoutubeId( candidateId ) {
        return typeof candidateId === "string" && /^[a-zA-Z0-9_-]{11}$/.test( candidateId );
    }

    function parseYoutubeId( candidateUrl, depth ) {
        if( !candidateUrl || depth > 2 ) return false;

        var match = candidateUrl.match( ytId_rx );
        if( match && match[1].length == 11 ) return match[1];

        var parsedUrl;
        try {
            parsedUrl = new URL( candidateUrl, "https://www.youtube.com" );
        } catch( e ) {
            return false;
        }

        var idFromParam = parsedUrl.searchParams.get( "v" );
        if( isValidYoutubeId( idFromParam ) ) return idFromParam;

        var pathParts = parsedUrl.pathname.split( "/" ).filter(Boolean),
            firstPathPart = pathParts[0],
            secondPathPart = pathParts[1] || "";

        if( parsedUrl.hostname === "youtu.be" || parsedUrl.hostname.endsWith( ".youtu.be" ) ) {
            if( isValidYoutubeId( firstPathPart ) ) return firstPathPart;
        }

        if( firstPathPart === "shorts" || firstPathPart === "live" || firstPathPart === "embed" || firstPathPart === "v" || firstPathPart === "e" ) {
            if( isValidYoutubeId( secondPathPart ) ) return secondPathPart;
        }

        if( isValidYoutubeId( firstPathPart ) ) return firstPathPart;

        var nestedCandidates = [
            parsedUrl.searchParams.get( "continue" ),
            parsedUrl.searchParams.get( "next" ),
            parsedUrl.searchParams.get( "url" ),
            parsedUrl.searchParams.get( "q" )
        ];

        for( var i = 0; i < nestedCandidates.length; ++i ) {
            var nested = nestedCandidates[i];
            if( !nested ) continue;

            var nestedId = parseYoutubeId( nested, depth + 1 );
            if( nestedId ) return nestedId;

            if( nested.indexOf( "%" ) !== -1 ) {
                try {
                    nestedId = parseYoutubeId( decodeURIComponent( nested ), depth + 1 );
                } catch( e ) {
                    nestedId = false;
                }
                if( nestedId ) return nestedId;
            }
        }

        return false;
    }

    return parseYoutubeId( url, 0 );
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
    logFunc( "loadRawCss" );
    logVar( "urlVar", urlVar );

    $.ajax({
        url: urlVar,
        dataType: "text",
        success: function(fileText) {
            // cssText will be a string containing the text of the file
            log( "loadRawCss: loaded ok (" + fileText.length + " chars): " + urlVar );

            // Plain DOM on purpose: $('head').append('<style>...</style>') routes the markup
            // through innerHTML, which Trusted Types blocks on YouTube (see
            // installTrustedTypesPassthrough). textContent is not a Trusted Types sink, so the
            // CSS lands with or without the default policy.
            var styleNode = document.createElement( "style" );
            styleNode.textContent = fileText;
            document.head.appendChild( styleNode );
        },
        error: function( jqXHR, textStatus, errorThrown ) {
            log( "loadRawCss: FAILED to load CSS (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + "): " + urlVar );
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


/*
 * isoDurationToTime()
 * Convert Period Time (PT, ISO-8601) durations to h:mm:ss
 * console.log(isoDurationToTime("PT0M7206S")); // 2:00:06
 * console.log(isoDurationToTime("PT0M7053S")); // 1:57:33
 */
function isoDurationToTime(iso) {
    // extract total seconds (S)
    var match = iso.match(/PT(?:\d+M)?(\d+)S/);
    if (!match) return "";

    var totalSeconds = parseInt(match[1], 10);

    var hours   = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    // pad with leading zeros
    return [
        hours,
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0')
    ].join(":");
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

// select on toggle
waitForKeyElements(".mdb-toggle", function( jNode ) {
    jNode.on("click", function(){
        var toggleId = $(this).attr("data-toggleid"),
            target = $("#"+toggleId);

        target.slideToggle();
        $(this).toggleClass("selected");

        setTimeout(function(){
            var selectTarget = target.hasClass("mdb-selectOnClick") ? target : target.find(".mdb-selectOnClick");
            if( selectTarget.length && selectTarget.is(":visible") ) {
                selectTarget.addClass("selected").select().focus();
            }
        }, msWaitToggle);
    });
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * File details
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// getFileDetails_wikitext
// The File details table as it goes onto a mix page. Split out of the toggle below so a caller
// that wants the wiki syntax itself - e.g. the SoundCloud script's "Create" link, which sends a
// whole page text along - does not have to scrape it back out of an HTML string.
// An unknown duration leaves the cell empty instead of dropping the table: the page needs the
// table either way and the value is typed in by hand then.
function getFileDetails_wikitext( dur_sec, bytes="" ) {
    var dur = dur_sec ? convertHMS( dur_sec ) : "",
        mb = bytes ? ( parseInt( bytes, 10 ) / 1048576 ).toFixed( 2 ) : "";

    return '{|{{NormalTableFormat}}\n! dur\n! MB\n! kbps\n|-\n| '+dur+'\n| '+mb+'\n| \n|}';
}

// getFileDetails_forToggle
function getFileDetails_forToggle( dur_sec, bytes="" ) {
    logFunc( "getFileDetails_forToggle" );

    var dur = convertHMS( dur_sec );
    logVar( "dur", dur );

    if( dur !== null ) {
       return '<div id="mdb-fileDetails" style="display:none"><textarea class="mdb-selectOnClick" rows="9">'+getFileDetails_wikitext( dur_sec, bytes )+'</textarea></div>';
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

// mdbCopyTextToClipboard
function mdbCopyTextToClipboard( text ) {
    if( navigator.clipboard && navigator.clipboard.writeText ) {
        return navigator.clipboard.writeText( text );
    }

    var textarea = $("<textarea>")
        .val( text )
        .attr( "readonly", true )
        .css({
            left: "-9999px",
            position: "fixed",
            top: "-9999px"
        })
        .appendTo( document.body );

    textarea[0].select();
    document.execCommand( "copy" );
    textarea.remove();

    return Promise.resolve();
}

// showMdbCopyTextFeedback
function showMdbCopyTextFeedback( button, message ) {
    var control = $(button).closest( ".mdb-copy-text-control" ),
        feedback = control.find( ".mdb-copy-text-feedback" ).first();

    if( !feedback.length ) {
        feedback = $("<span>")
            .addClass( "mdb-copy-text-feedback" )
            .attr( "role", "status" )
            .attr( "aria-live", "polite" )
            .appendTo( control );
    }

    clearTimeout( feedback.data( "mdb-copy-text-timeout" ) );

    feedback
        .text( message )
        .addClass( "visible" );

    feedback.data( "mdb-copy-text-timeout", setTimeout(function() {
        feedback.removeClass( "visible" ).text( "" );
    }, 2200));
}

// getMdbCopySourceText
// <input>/<textarea> hold their text in .val(), everything else (links, spans, …) in .text().
function getMdbCopySourceText( sourceNode ) {
    return $.trim( sourceNode.is( "input, textarea" ) ? sourceNode.val() : sourceNode.text() );
}

// getMdbCopyLinkUrl
// Only an absolute http(s) URL gets a real href on the copy button - see the <a> vs <button>
// note in appendMdbCopyTextButton(). An href built from arbitrary text (a page title, an
// artist name) would resolve against the current page as a relative URL and offer a link
// that goes nowhere sane, so those drag as plain text instead.
// Returns "" when the source text is not a URL.
function getMdbCopyLinkUrl( sourceNode ) {
    var text = getMdbCopySourceText( sourceNode );
    return /^https?:\/\/\S+$/i.test( text ) ? text : "";
}

// appendMdbCopyTextButton
function appendMdbCopyTextButton( source, options ) {
    var settings = $.extend({
            ariaLabel: "Copy text",
            buttonTitle: "Copy text",
            buttonText: "⧉",
            copiedMessage: function( text ) {
                return text + " copied!";
            },
            emptyMessage: "Nothing to copy.",
            failedMessage: "Copy failed.",
            // only appended for input sources, i.e. the draggable ones
            dragTitleSuffix: " - or drag it into another window",
            processedClass: "mdb-copy-text-processed",
            sourceClass: ""
        }, options || {}),
        sourceNode = $(source).first();

    if( !sourceNode.length || sourceNode.hasClass( settings.processedClass ) ) return;

    var sourceText = getMdbCopySourceText( sourceNode );
    if( !sourceText ) return;

    sourceNode.addClass( settings.processedClass + " mdb-copy-text-source" );

    if( settings.sourceClass ) {
        sourceNode.addClass( settings.sourceClass );
    }

    // Every input/textarea source gets a DRAGGABLE copy button, so its value can be pulled
    // straight into another window/app. That rules out <button>: it is a form control, and
    // Firefox refuses to start a drag on those no matter what draggable="true" says, which
    // would silently break the drag for a whole browser. An <a> drags everywhere. Sources
    // that are not inputs (a venue name, an artist name, …) keep the plain <button> - their
    // text sits in the page and can be selected and dragged directly.
    var isInputSource = sourceNode.is( "input, textarea" ),
        linkUrl = isInputSource ? getMdbCopyLinkUrl( sourceNode ) : "",
        control = $("<span>")
            .addClass( "mdb-element mdb-copy-text-control" ), // mdb-element: taken down again on SPA navigation, see mdbCreatedSelector
        button = ( isInputSource ? $("<a>") : $("<button>") )
            .attr( "aria-label", settings.ariaLabel )
            .addClass( "mdb-copy-text-button" )
            .text( settings.buttonText ),
        feedback = $("<span>")
            .addClass( "mdb-copy-text-feedback" )
            .attr( "role", "status" )
            .attr( "aria-live", "polite" );

    // copyNow
    // The copy itself, shared by the click and the keyboard handler below.
    var copyNow = function() {
        var currentText = getMdbCopySourceText( sourceNode );

        if( !currentText ) {
            showMdbCopyTextFeedback( button, settings.emptyMessage );
            return;
        }

        mdbCopyTextToClipboard( currentText ).then(function() {
            showMdbCopyTextFeedback( button, settings.copiedMessage( currentText ) );
        }).catch(function() {
            showMdbCopyTextFeedback( button, settings.failedMessage );
        });
    };

    if( isInputSource ) {
        button.attr({
            draggable: "true", // implicit for <a href>, explicit for the hrefless variant
            title: settings.buttonTitle + settings.dragTitleSuffix
        });

        if( linkUrl ) {
            // A URL additionally becomes a real link, so it drops into other windows AS a
            // link and can still be opened deliberately - see the click handler below.
            button.attr({
                href: linkUrl,
                target: "_top"
            });

            // The href has to follow the input: the artwork URL is rewritten once the real
            // extension is known, and users can edit these inputs. Sync on every interaction
            // that could act on it - mousedown/focus run before click and dragstart - plus on
            // edits, since a programmatic .val() fires no event.
            var syncLinkHref = function() {
                var currentUrl = getMdbCopyLinkUrl( sourceNode );
                if( currentUrl ) button.attr( "href", currentUrl );
            };

            sourceNode.on( "input change", syncLinkHref );
            button.on( "mousedown focus", syncLinkHref );
        } else {
            // Without an href an <a> is neither focusable nor activatable by keyboard, so
            // the <button> behaviour it replaces has to be restored by hand.
            button.attr({
                role: "button",
                tabindex: "0"
            });

            button.on( "keydown", function( event ) {
                if( event.which != 13 && event.which != 32 ) return; // Enter, Space

                event.preventDefault(); // Space would scroll the page
                copyNow();
            });
        }

        // Browsers fill the drag payload from the href before dragstart fires, and fill it
        // with nothing at all when there is no href - so write the payload ourselves, from
        // the value the input holds right now.
        button.on( "dragstart", function( event ) {
            var currentText = getMdbCopySourceText( sourceNode ),
                currentUrl = getMdbCopyLinkUrl( sourceNode ),
                dataTransfer = event.originalEvent && event.originalEvent.dataTransfer;

            if( !currentText || !dataTransfer ) return;

            // text/uri-list is what makes a drop target treat it as a link rather than as
            // text - only correct while the value really is a URL.
            if( currentUrl ) dataTransfer.setData( "text/uri-list", currentUrl );

            dataTransfer.setData( "text/plain", currentText );
        });
    } else {
        button.attr({
            title: settings.buttonTitle,
            type: "button"
        });
    }

    button.on( "click", function( event ) {
        // A plain click copies and never navigates - that stays true for every variant. Only
        // on the linked variant a modifier click is the user explicitly asking for the link
        // instead (cmd/ctrl = new tab, shift = new window), so let those through to the
        // browser; middle-click already bypasses this handler as an auxclick.
        if( linkUrl && ( event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ) ) return;

        event.preventDefault();
        event.stopPropagation();

        copyNow();
    });

    control.append( button, feedback );
    sourceNode.after( control );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist funcs moved out
 *
 * apiTracklist(), fixTLbox(), the #tlEditor feedback classes and the tracklist array helpers
 * now live in shared/tracklist_editor/funcs.js. They rely on this file, so a script has to
 * @require global.js BEFORE tracklist_editor/funcs.js - never the other way round.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


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
 * SPA navigation: onUrlChange()
 *
 * Every site we run on is a single-page app: a click swaps the page content and rewrites the
 * address bar, but there is no new document and no load event, so nothing of ours runs again.
 * The page then keeps showing the PREVIOUS mix's toolkit, tracklist and links.
 *
 * The old answer was redirectOnUrlChange(), which forced a real reload on every URL change.
 * It worked, but it threw away the one thing an SPA is good at: a white flash and a full
 * reload after every single click, on top of sites that rewrite their own URL while loading
 * (YouTube), where it could turn into a reload loop.
 *
 * onUrlChange() replaces it. It watches the address bar, waits for the site to finish putting
 * the new DOM in place, clears out what the previous page left behind, and only then re-runs
 * what the script registered. No reload, no flash.
 *
 * Usage:
 *   onUrlChange( runPage );                   // re-run runPage() on every URL change
 *   onUrlChange( runPage, { runNow: true } ); // ... and once right now, for the first page
 *   onUrlChange();                            // nothing to re-run by hand - just do the
 *                                             // cleanup and re-arm waitForKeyElements
 *
 * What belongs in the callback: everything the script does FOR THE CURRENT PAGE, written so
 * it can be called again. Anything read out of location or the DOM at load time has to move
 * in there with it - a value computed right after the IIFE's opening brace still holds the
 * FIRST page's answer after a navigation, which is the classic bug this mechanism invites.
 *
 * waitForKeyElements handlers do NOT need to be re-registered: they keep polling for the
 * lifetime of the document, and mdbResetForNewPage() below re-arms them for the new page.
 *
 * options:
 *   runNow      - also run this callback immediately (default false)
 *   settle_ms   - how long the DOM has to stay unchanged before the new page counts as
 *                 "in place" (default 250)
 *   maxWait_ms  - run anyway once the DOM has been busy this long (default 3000)
 *   getUrl      - where to read the URL from, for frames that do not own the address bar
 *                 (SoundCloud's webi frame reads the top frame's)
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * mdbCreatedSelector
 * Everything we ADD to a page is either marked with the class "mdb-element" or has an id
 * starting with "mdb"/"mixesdb", so that all of it can be found again and thrown away when
 * the site navigates. Note what is deliberately NOT in here: a "class starts with mdb-"
 * rule. We put plenty of mdb- classes on nodes of the SITE to mark them
 * (mdb-processed-toolkit, mdb-copy-text-source, ...), and removing those would tear the
 * page apart.
 */
const mdbCreatedSelector = '.mdb-element, [id^="mdb"], [id^="mixesdb"], #tlEditor, [id^="playsetList_mdbTable"]';

/*
 * mdbProcessedClassRx
 * "already handled" markers we put on the site's own nodes, e.g. mdb-processed-toolkit,
 * mdb-tl-processed, mdb-copy-text-processed, tlEditor-processed. They exist to stop a handler
 * from running twice on the SAME page, so they have to go the moment the page changes.
 */
const mdbProcessedClassRx = /^(mdb|tlEditor)[\w-]*processed[\w-]*$/i;

/*
 * mdbPageGeneration / mdbIsCurrentPage
 *
 * Which page we are on, counted up on every navigation.
 *
 * This is what a reload used to do for free: it killed every request, timer and callback that
 * was still in flight for the page being left. Nothing does that any more, so a chain started
 * on the previous mix - and these are two network round trips deep on SoundCloud - lands on
 * the NEXT one and writes the previous mix's title, player URL and tracklist into it.
 *
 * So anything asynchronous that will touch the DOM or shared state must remember which page it
 * was started for, and drop its result if that page is gone:
 *
 *     var pageGeneration = mdbPageGeneration;      // at the start of the work
 *     ...
 *     if( !mdbIsCurrentPage( pageGeneration ) ) return;   // in every callback
 */
var mdbPageGeneration = 0;

function mdbIsCurrentPage( generation ) {
    if( generation === mdbPageGeneration ) return true;

    log( "Dropping a result from page " + generation + " - we are on page " + mdbPageGeneration + " now." );
    return false;
}

// mdbUrlChange
// State of the single watcher. One per document - registering more callbacks does not add
// more listeners, more observers or more intervals.
var mdbUrlChange = {
    installed: false,
    lastUrl: "",
    callbacks: [],
    getUrl: function() { return location.href; },
    observer: null,
    settleTimer: null,
    giveUpTimer: null,
    settle_ms: 250,
    maxWait_ms: 3000
};

/*
 * mdbResetForNewPage
 * Everything the previous page left behind, in the order it has to happen.
 * Runs by itself on every URL change; exported because a script that navigates the user
 * itself may want it earlier.
 */
function mdbResetForNewPage() {
    logFunc( "mdbResetForNewPage" );

    // 0. First of all, so that everything already in flight for the previous page can see it
    // is no longer wanted - see mdbPageGeneration above.
    mdbPageGeneration++;
    logVar( "page generation", mdbPageGeneration );

    // 1. Our own elements. A site that re-renders its content containers takes most of them
    // down with it, but not the ones hanging off containers it REUSES - YouTube keeps
    // #bottom-row across videos, so the toolkit for the previous video would simply stay.
    var created = $( mdbCreatedSelector );
    logVar( "elements we added to the previous page, removing them now", created.length );
    created.remove();

    // 2. The "already handled" markers on the site's own nodes, for the same reason: on a
    // reused node the marker is still there and would lock the handler out for good.
    $("[class*='processed']").each(function() {
        var node = $(this);

        $.each( ( node.attr("class") || "" ).split( /\s+/ ), function( i, className ) {
            if( mdbProcessedClassRx.test( className ) ) node.removeClass( className );
        });
    });

    // 3. waitForKeyElements marks every node it has handed to a callback with the jQuery data
    // key "alreadyFound" and never looks at that node again. On a reused node that means the
    // handler would never fire for the new page. $("*") is the price of waitForKeyElements
    // keeping this per element without telling anyone which ones - it is one pass per
    // navigation, not per poll.
    $("*").removeData("alreadyFound");

    // 4. Shared features that keep their own state. The Page Creator is a separate @require
    // that not every script loads, hence the typeof guard rather than a plain call.
    if( typeof mdbPageCreator_resetForNewPage === "function" ) mdbPageCreator_resetForNewPage();

    log( "mdbResetForNewPage: done - handlers are armed again for the new page." );
}

// mdbUrlChange_currentUrl
function mdbUrlChange_currentUrl() {
    try {
        return mdbUrlChange.getUrl();
    } catch( e ) {
        // Reading another frame's location throws the moment that frame goes cross-origin
        return location.href;
    }
}

/*
 * mdbUrlChange_install
 * Three ways of noticing, because no single one of them is enough:
 *   - history.pushState/replaceState: how an SPA router actually navigates. They fire no
 *     event of their own, hence the wrapper.
 *   - popstate/hashchange: browser back/forward and #anchors, which the wrapper misses.
 *   - a poll: the safety net. It is the ONLY one that works when the URL changes in a
 *     different frame (SoundCloud's webi frame watches the top frame's address bar), and
 *     when the userscript manager runs us in a sandbox whose history object is not the
 *     page's - in which case the wrapper below is installed on a copy nobody calls.
 */
function mdbUrlChange_install() {
    if( mdbUrlChange.installed ) return;
    mdbUrlChange.installed = true;
    mdbUrlChange.lastUrl = mdbUrlChange_currentUrl();

    logFunc( "onUrlChange" );
    logVar( "watching for SPA navigation, starting at", mdbUrlChange.lastUrl );

    $.each( [ "pushState", "replaceState" ], function( i, method ) {
        var original = history[ method ];
        if( typeof original !== "function" ) return;

        // Defensive: the site wraps these too, and an exception thrown out of a router call
        // would break the site's navigation, not just ours.
        history[ method ] = function() {
            var result = original.apply( history, arguments );
            try { mdbUrlChange_check(); } catch( e ) {}
            return result;
        };
    });

    window.addEventListener( "popstate", mdbUrlChange_check );
    window.addEventListener( "hashchange", mdbUrlChange_check );

    setInterval( mdbUrlChange_check, 300 ); // same cadence as waitForKeyElements
}

// mdbUrlChange_check
function mdbUrlChange_check() {
    var newUrl = mdbUrlChange_currentUrl();

    if( newUrl === mdbUrlChange.lastUrl ) return;

    log( "onUrlChange: URL changed\n  from: " + mdbUrlChange.lastUrl + "\n  to:   " + newUrl );
    mdbUrlChange.lastUrl = newUrl;

    mdbUrlChange_waitForNewDom();
}

/*
 * mdbUrlChange_waitForNewDom
 * The whole point of the exercise: at the moment the URL changes the OLD DOM is still on
 * screen - that is why the old code had to reload. So watch the document instead and treat
 * the new page as ready once it has stopped changing for settle_ms.
 */
function mdbUrlChange_waitForNewDom() {
    // Already waiting: a router that pushes twice in a row (YouTube rewrites its own URL
    // while the page loads) must extend the wait, not start a second one.
    if( mdbUrlChange.giveUpTimer ) {
        mdbUrlChange_armSettleTimer();
        return;
    }

    if( typeof MutationObserver === "function" ) {
        mdbUrlChange.observer = new MutationObserver( mdbUrlChange_armSettleTimer );
        mdbUrlChange.observer.observe( document.documentElement, { childList: true, subtree: true } );
    }

    // Started right away rather than on the first mutation: the poll can notice the new URL
    // up to 300ms late, by which time the site may already be done rendering and no
    // mutation would ever arrive to start it.
    mdbUrlChange_armSettleTimer();

    // A page that never goes quiet (an autoplaying player, an endless feed) must not mean we
    // never run.
    mdbUrlChange.giveUpTimer = setTimeout(function() {
        log( "onUrlChange: DOM still busy after " + mdbUrlChange.maxWait_ms + "ms - going ahead anyway." );
        mdbUrlChange_run();
    }, mdbUrlChange.maxWait_ms );
}

// mdbUrlChange_armSettleTimer
function mdbUrlChange_armSettleTimer() {
    clearTimeout( mdbUrlChange.settleTimer );
    mdbUrlChange.settleTimer = setTimeout( mdbUrlChange_run, mdbUrlChange.settle_ms );
}

// mdbUrlChange_run
function mdbUrlChange_run() {
    clearTimeout( mdbUrlChange.settleTimer );
    clearTimeout( mdbUrlChange.giveUpTimer );
    mdbUrlChange.settleTimer = null;
    mdbUrlChange.giveUpTimer = null;

    // Before the cleanup, or our own remove() calls would look like the page still moving
    // and re-arm the settle timer forever.
    if( mdbUrlChange.observer ) {
        mdbUrlChange.observer.disconnect();
        mdbUrlChange.observer = null;
    }

    logFunc( "onUrlChange: new page is in place" );
    logVar( "URL", mdbUrlChange.lastUrl );

    mdbResetForNewPage();

    $.each( mdbUrlChange.callbacks, function( i, callback ) {
        // One callback throwing must not cost the others their turn - and a stack trace
        // naming us beats a page that silently stays empty after the second click.
        try {
            callback();
        } catch( e ) {
            log( "onUrlChange: a callback threw and was skipped: " + ( e && e.message ? e.message : e ) );
        }
    });
}

// onUrlChange
function onUrlChange( callback, options ) {
    options = options || {};

    if( typeof options.getUrl === "function" ) mdbUrlChange.getUrl = options.getUrl;
    if( options.settle_ms ) mdbUrlChange.settle_ms = options.settle_ms;
    if( options.maxWait_ms ) mdbUrlChange.maxWait_ms = options.maxWait_ms;

    if( typeof callback === "function" ) mdbUrlChange.callbacks.push( callback );

    mdbUrlChange_install();

    if( options.runNow && typeof callback === "function" ) callback();
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
