// ==UserScript==
// @name         MixesDB Userscripts Helper (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.21.5
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-MixesDB_Userscripts_Helper_17
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-MixesDB_Userscripts_Helper_13
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 16,
    scriptName = "MixesDB_Userscripts_Helper";
window.scriptName = scriptName; // toolkit.js reads this global directly
window.cacheVersion = cacheVersion; // same reason: the @require'd shared files cache-bust their own CSS with it

//loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * User settings
 * You need to set these on each update, but updates happen rarely for this script
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * Clean cloned page text
 * https://discord.com/channels/1258107262833262603/1435226936996794418/1435226936996794418
 */
const cleanClonedText = 1; // default: 1

/*
 * Apple Music settings
 */
// Apple Music links: force to open in browser?
// Keep 0 to use open the Music app
// Set 1 to open as normal browser tab on beta.music.apple.com (recommended)
const appleMusic_linksOpenInBrowser = 1; // default: 0

// Your Apple Music counry code, e.g. "de"
// All country codes: https://www.hiresedition.com/apple-music-country-codes.html
const appleMusic_countryCode_switch = "de"; // default: ""

/*
 * TrackId.net settings
 */
// Submit player URLs to the TID request form
// * On Explorer mix results add an icon to the title bar
// * On mix pages add TID links to every player ("Exists" or "Submit")
// Set 0 to disable
const trackIdnet_addLinks = 1; // default: 1

/*
 * Apple Podcasts settings
 */
// Add search icons for Apple Podcasts to mix page title icons and Explorer mix results
// Set 0 to disable
const applePodcasts_addSearchIcons = 1; // default: 1


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Basic functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
// getKeywordsFromTitle
function getKeywordsFromTitle( titleWrapper ) {
    return normalizeTitleForSearch( titleWrapper.text() );
}

// function getKeywordsFromTitle_Customized_AP
// Customize keywords for more precise results
function getKeywordsFromTitle_Customized_AP( titleWrapper ) {
    var title = titleWrapper.text(),
        keywords = getKeywordsFromTitle( titleWrapper );

    if( title.match(/Resident Advisor \(RA\.\d+\)/) ) {
        keywords = title.replace( /^.+ - (.+) - Resident Advisor \((RA\.\d+)\)/g, "$2 $1");
    }

    return keywords;
}

// get applePodcastsSearchLink
function getApplePodcastsSearchLink( className, keywords ) {
    var applePodcastsSearchUrl = "https://podcasts.apple.com/us/search?term="+encodeURIComponent( keywords );

    // mak eicon link
    // max-height to avoid flashing original icon size (script.css loads later)
    var iconLink = '<a class="'+className+' applePodcastsSearch" href="'+applePodcastsSearchUrl+'" title="Search \''+keywords+'\’ in Apple Podcasts" target="_blank"><img src="https://www.mixesdb.com/w/images/a/ad/Apple_Podcasts_logo.svg" style="max-height:18px" alt="Apple Podcasts icon"/></a>';

    return iconLink;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Mix page title icons and Explorer title icons fpr
 ** TrackId.net request submission
 ** Apple Podcasts search
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
logFunc( "Quicker Submit Request" );

d.ready(function(){ // needed for mw.config

    // Prepare variables to check if we're on a mix page etc.
    var actionView =  $("body").hasClass("action-view") ? true : false,
        wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
        wgTitle = mw.config.get("wgTitle"),
        wgPageName = mw.config.get("wgPageName");

    /*
     * On mix pages and MixesDB:Explorer/Mixes
     * Also allow on page edit (preview)
     */
    if( trackIdnet_addLinks
        && ( wgNamespaceNumber==0 && wgTitle!="Main Page" )
        || ( wgNamespaceNumber==4 && wgPageName=="MixesDB:Explorer/Mixes" )
      ) {
        log( "Criteria for mix page matched." );

        /*
         * TrackId.net submit link under each player
         */
        $(".playerWrapper[data-playersite]").each(function(){
            var playerWrapper = $(this),
                playerTidCompatible = playerWrapper.attr("data-tidcompatibleplayersite"),
                playerUrl = playerWrapper.attr("data-playerurl"),
                playerSite = makeCssSafe( playerWrapper.attr("data-playersite") ),
                keywords = "";

            logVar( "playerSite", playerSite );
            logVar( "playerUrl", playerUrl );

            // Remove URL paramteres from e.g. SoundCloud and Mixcloud
            if( playerSite != "YouTube" ) {
                playerUrl = removeParametersFromUrl( playerWrapper.attr("data-playerurl") );
            } else {
                playerUrl = playerUrl.replace( "www.youtu.be", "youtu.be" );
            }

            if( playerSite == "hearthis-at" ) {
                playerUrl = playerUrl.replace( "hearthis.audio", "hearthis.at" );
            }

            // if mix page
            if( wgNamespaceNumber==0 && wgTitle!="Main Page" ) {
                keywords = getKeywordsFromTitle( $("h1#firstHeading") )
            }

            // if Explorer/Mixes
            if( wgNamespaceNumber==4 && wgPageName=="MixesDB:Explorer/Mixes" ) {
                var explorerResult = playerWrapper.closest(".explorerResult"),
                    explorerResult_title = $(".playerLink", explorerResult).attr("title");
                keywords = normalizeTitleForSearch( explorerResult_title );
            }

            if( playerTidCompatible == "true" ) {

                // check usage
                var apiQueryUrl_check = apiUrl_mw;
                apiQueryUrl_check += "?action=mixesdbtrackid";
                apiQueryUrl_check += "&format=json";
                apiQueryUrl_check += "&url=" + playerUrl;

                logVar( "apiQueryUrl_check", apiQueryUrl_check );

                $.ajax({
                    url: apiQueryUrl_check,
                    type: 'get', /* GET on checking */
                    dataType: 'json',
                    async: true,
                    success: function(data) {
                        // avoid undefined error
                        if( ( data.error && data.error.code == "notfound" )  ) {
                            // no result
                            var tidLink_submit = '<a href="'+makeTidSubmitUrl( playerUrl, keywords )+'" target="_blank"><img class="tidSubmit-icon fixedWidth" src="'+favicon_TID+'" alt="TrackId.net" style="max-height:1.2em;"> Submit to TrackId.net</a>';
                            playerWrapper.append( '<div class="tidLink '+playerSite+'">'+tidLink_submit+'</div>' );
                        } else {
                            var tidLink = "",
                                trackidurl = data.mixesdbtrackid?.[0]?.trackidurl || null,
                                lastCheckedAgainstMixesDB = data.mixesdbtrackid?.[0]?.mixesdbpages?.[0]?.lastCheckedAgainstMixesDB || null;

                            logVar( "trackidurl", trackidurl );
                            logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                            if( trackidurl ) {
                                tidLink += '<a href="'+trackidurl+'"><img class="tidSubmit-icon fixedWidth" src="'+favicon_TID+'" alt="TrackId.net" style="max-height:1.2em;"> Exists on TrackId.net</a>';

                                if( lastCheckedAgainstMixesDB ) {
                                    tidLink += ' <span id="mdbTrackidCheck-wrapper" class="integrated" style="max-height:15px">'+checkIcon+'integrated</span>';
                                    tidLink += ' ' + toolkit_tidLastCheckedText( lastCheckedAgainstMixesDB );
                                } else {
                                    tidLink += ' (not integrated yet)';
                                }
                            }

                            if( tidLink != "" ) {
                                playerWrapper.append( '<div class="tidLink '+playerSite+' grey">'+tidLink+'</div>' );
                            }
                        }
                    }
                }); // END ajax
            } else {
                log( "NOT playerTidCompatible: " + playerUrl );
            }
        });
    }

    /*
     * On mix pages and Category pages
     */
    if( ( wgNamespaceNumber==0 && wgTitle!="Main Page" )
        || wgNamespaceNumber==14
      ) {
        // Apple Podcasts search link icon
        if( applePodcasts_addSearchIcons ) {
            if( actionView ) {
                var titleWrapper = $("#firstHeading .mw-page-title-main");
            } else {
                var titleWrapper = $("#firstHeading #firstHeadingTitle");
            }

            if( wgNamespaceNumber==14 ) {
                var keywords = wgTitle; // on Category
            } else {
                var keywords = getKeywordsFromTitle_Customized_AP( titleWrapper );
            }

            if( keywords ) var applePodcastsSearchLink = getApplePodcastsSearchLink( "pageIcon", keywords );
            if( applePodcastsSearchLink ) $("#pageIcons").prepend( applePodcastsSearchLink );
        } else {
            log( "applePodcasts_addSearchIcons diabled." );
        }

    }

    /*
     * On MixesDB:Explorer/Mixes
     */
    if( wgNamespaceNumber==4 && wgPageName=="MixesDB:Explorer/Mixes" ) {
        log( "Criteria for MixesDB:Explorer/Mixes matched." );

        // Apple Podcasts search link icon
        if( applePodcasts_addSearchIcons ) {
            $(".explorerTitle").each(function(){
                var wrapper = this,
                    keywords = getKeywordsFromTitle_Customized_AP( $(".explorerTitleLink", wrapper) ),
                    applePodcastsSearchLink = getApplePodcastsSearchLink( "explorerTitleIcon", keywords );

                if( applePodcastsSearchLink ) $(".greylinks", wrapper).append( applePodcastsSearchLink );
            });
        } else {
            log( "applePodcasts_addSearchIcons diabled." );
        }
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Change Apple Music links on tracks
 * Force link to open in browser instead of the Music app
 * Change URL to Apple Music Beta and custom country code
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

waitForKeyElements(".aff-iconlink.AppleMusic:not(.processed-userscript)", waitAppleMusicLinks);
waitForKeyElements(".aff-details-toprow-iTunesTitle a:not(.processed-userscript)", waitAppleMusicLinks);

function waitAppleMusicLinks(jNode) {
    jNode.addClass("processed-userscript");

    // https://music.apple.com/us/album/lunch/1739659134?i=1739659140&uo=4&app=music&at=1000l5EX
    // https://music.apple.com/de/search?at=1000l5EX&term=Floating%20Points%20Fast%20Foward
    // https://music.apple.com/search?term=Plant%2043%20Emerald%20Shift
    var item_url = jNode.attr("href");

    // force link to open in browser
    logVar( "appleMusic_linksOpenInBrowser", appleMusic_linksOpenInBrowser );
    if( appleMusic_linksOpenInBrowser == 1 ) {
        // remove URL parameter app=music
        // album links have the app parameter by default, search links do not
        item_url = item_url.replace( "&app=music", "&app=browser" );

        // switch to beta (necessary to bypass Music app)
        item_url = item_url.replace( "music.apple.com", "beta.music.apple.com" );
    }

    // override country code
    logVar( "appleMusic_countryCode_switch", appleMusic_countryCode_switch );

    if( appleMusic_countryCode_switch != "" ) {
        item_url = item_url.replace( /music.apple.com\/..\//g, "music.apple.com/"+appleMusic_countryCode_switch+"/" )
                           .replace( "apple.com/search", "apple.com/"+appleMusic_countryCode_switch+"/search" )
                           ;
    }

    // prepare url for switch
    if( appleMusic_linksOpenInBrowser == 1 || appleMusic_countryCode_switch != "" ) {
        jNode.attr( 'href', item_url );
    }

    // ensure link opens in new tab
    if( appleMusic_linksOpenInBrowser == 1 ) {
        jNode.click(function(e) {
            var url_open = item_url;
            log("click: " + url_open );
            e.preventDefault();
            window.open( url_open );
        });
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edit: If page is cloned, remove URLs and tracklist, fix year cat
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// ── String prototype helpers ──────────────────────────────────────────────────
// Note: only define if not already present.

if (!String.prototype.replaceFileLine) {
    // Replace a single [[File:...]] line with [[File:wgTitle.<ext>|...]],
    // preserving jpg|jpeg|png|webp (case-insensitive) and keeping following line intact.
    String.prototype.replaceFileLine = function (wgTitle) {
        return this.replace(
            /^\s*\[\[File:[^\]\|]+?(\.(?:jpe?g|jpeg|png|webp))([^\]]*)\]\]$/im,
            function (_m, ext, rest) {
                const extension = ext || '.jpg';
                return `[[File:${wgTitle}${extension}${rest}]]`;
            }
        );
    };
}

if (!String.prototype.cleanPlayerUrls) {
    // Remove only URL tokens inside {{Player ...}} while preserving pipes and line breaks.
    String.prototype.cleanPlayerUrls = function () {
        return this.replace(/\{\{Player([\s\S]*?)\}\}/g, function (match, inner) {
            const cleaned = inner.replace(/(\|[ \t]*)https?:\/\/[^\|\}\n]+/g, '$1');
            return `{{Player${cleaned}}}`;
        });
    };
}

if (!String.prototype.clearTracklist) {
    // Replace anything between "== Tracklist ==" and the next "[[Category:" with an empty <list>.
    String.prototype.clearTracklist = function () {
        return this.replace(
            /== Tracklist ==\n\n[\s\S]*?\n\n\[\[Category:/,
            '== Tracklist ==\n\n<list>\n\n</list>\n\n[[Category:'
        );
    };
}

if (!String.prototype.clearFileDetails) {
    // Empty every value cell of the File details table (dur, MB, kbps, ...).
    // A clone describes a different file, so it must not inherit the source mix's data.
    String.prototype.clearFileDetails = function () {
        return this.replace(
            /==\s*File details\s*==\s*\n\{\|[\s\S]*?\n\|\}/,
            function (table) {
                // Only lines starting with a single "|" hold values. "|-", "|}" and "|+" are
                // table syntax and "!" lines are headers, so all of those stay untouched.
                return table.replace(/^\|(?![-}+])([^\r\n]*)/gm, function (_line, cells) {
                    // keep the cell count of inline rows ("| a || b") intact
                    return "|" + cells.split("||").map(() => " ").join("||");
                });
            }
        );
    };
}

if (!String.prototype.removeUrlsInNotes) {
    // Remove bare URL tokens in Notes, keep all line breaks/templates intact.
    String.prototype.removeUrlsInNotes = function () {
        return this.replace(
            /(==\s*Notes\s*==[\s\S]*?)(https?:\/\/\S+)([\s\S]*?==\s*Tracklist\s*==)/,
            function (_m, before, _url, after) {
                return before + after;
            }
        );
    };
}

if (!String.prototype.updateCategoryYear) {
    // Replace [[Category:YYYY]] with the year extracted from wgTitle (first 4 digits).
    String.prototype.updateCategoryYear = function (wgTitle) {
        const m = (wgTitle || '').match(/^(\d{4})/);
        if (!m) return this.toString();
        const year = m[1];
        return this.replace(/\[\[Category:\d{4}\]\]/, `[[Category:${year}]]`);
    };
}

if (!String.prototype.updateArtistCategory) {
    // Replace the 2nd category with artist(s) from wgTitle.
    // If multiple artists joined by "," or "&", insert multiple categories in that slot.
    String.prototype.updateArtistCategory = function (wgTitle) {
        const m = (wgTitle || '').match(/^\s*\d{4}-\d{2}-\d{2}\s*-\s*(.+?)\s*-\s*/);
        if (!m) return this.toString();
        const artistField = m[1];
        const artists = artistField
        .split(/\s*(?:,|&)\s*/g)
        .map(s => s.trim())
        .filter(Boolean);

        let idx = 0;
        return this.replace(/\[\[Category:[^\]]+\]\]/g, function (cat) {
            idx++;
            if (idx === 2 && artists.length) {
                return artists.map(a => `[[Category:${a}]]`).join('\n');
            }
            return cat;
        });
    };
}

// ── Usage in your ready handler ───────────────────────────────────────────────
// Example wiring (unchanged logic, just using chained prototype methods):

d.ready(function () { // needs mw.config
    const preload = getURLParameter("preload") || "";
    logVar("preload", preload);

    const wgTitle = mw.config.get("wgTitle") || "";

    if (cleanClonedText &&
        getURLParameter("action") == "edit" &&
        preload &&
        !/^Template:/i.test(preload)) {

        log("Edit with preload: " + preload);

        const textbox = $("#wpTextbox1");

        const text_clean = textbox.val()
        .replaceFileLine(wgTitle)
        .clearFileDetails()
        .clearTracklist()
        .cleanPlayerUrls()
        .removeUrlsInNotes()
        .updateCategoryYear(wgTitle)
        .updateArtistCategory(wgTitle);

        textbox.val(text_clean);
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edit: Move AI formatting review below form buttons
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

d.ready(function () { // needs mw.config
    if( mw.config.get('wgNamespaceNumber') == 0
        && ( getURLParameter("action") == "edit" || getURLParameter("action") == "submit" )
    ) {
        // move section
        waitForKeyElements(".editOptions", function(jNode){
            $("#mixesdb-edit-format-review").insertAfter(jNode);
        });

        // also move button and remove help text (only advanced users use this userscript)
        $("#mixesdb-edit-format-review-trigger")
            .insertBefore("label.mixesdb-edit-format-review-opt-in");
        $(".mixesdb-edit-format-review-help").hide();
    }
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edit: insert a page text handed over in the URL
 *
 * Lets another userscript open a mix page ready to finish instead of ready to type, e.g. the
 * SoundCloud script's "Create" link next to its title suggestion, which knows the duration,
 * the player URL and most of the categories before the page exists:
 *     https://www.mixesdb.com/w/index.php?title=2019-03-07 - Slowciety, Asa 808 - Rinse France Show&action=edit&insert=<page text>
 *
 * Only ever fills an EMPTY edit box. The parameter says what a page could START as, which is
 * worth nothing against text that is already there - an existing page, a preload, or a form
 * the user came back to. Nothing is saved here either way: what opens is the normal edit form,
 * for the user to check and submit.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

d.ready(function () {

    if( getURLParameter("action") != "edit" ) return;

    var insertText = getURLParameter("insert");

    if( !insertText ) return;

    logFunc( "Edit: insert" );

    var textbox = $("#wpTextbox1");

    if( !textbox.length ) {
        log( "Edit: insert - no #wpTextbox1 on this page, so there is nothing to fill. " +
             "(Not logged in, or the page is protected?)" );
        return;
    }

    if( $.trim( textbox.val() ) !== "" ) {
        log( "Edit: insert - the edit box already has text in it - leaving it alone." );
        return;
    }

    textbox.val( insertText );

    // Filling .val() leaves the cursor at the end of the text, which drags the textarea's
    // scroll position down with it - the user lands on the last line instead of the top of
    // what they're about to review. Reset both explicitly.
    textbox.scrollTop( 0 );
    textbox[0].setSelectionRange( 0, 0 );

    log( "Edit: insert - filled the edit box with the " + insertText.length + " characters from the URL." );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edit: show the preview right away
 *
 * A page text that arrived ready-made (the page creator's "Create" link, see the "insert"
 * section above) is read, not written: the first thing to do with it is look at the page it
 * makes - the players, the artwork's red file link, the tracklist. MediaWiki has no URL
 * parameter for that, the preview is a POST of the edit form, so this clicks the form's own
 * Preview button.
 *
 * Only for &from=PageCreator, which the page creator's link carries and nothing else does -
 * the toolkit's EDIT link says "toolkit" in the same parameter and opens an EXISTING page to
 * change one line, where a preview would only be a page load in the way.
 *
 * The preview POST goes to action=submit and carries no query string of its own, so the
 * parameters that brought us here are gone afterwards and nothing can loop through this a
 * second time on its own. The marker below covers whatever else lands on this URL again in the
 * same tab: the auto preview fires at most once per page, and a form reached a second time is
 * left as it is. sessionStorage for it, like the img1url section: one tab, one page.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var autoPreview_storageKey = "mdb-helper-autoPreviewed";

// autoPreview_wasDone
// True once this tab has previewed this page by itself. Unreadable storage counts as done:
// previewing again by itself is worse than not previewing at all.
function autoPreview_wasDone() {
    try {
        return sessionStorage.getItem( autoPreview_storageKey ) === mw.config.get("wgPageName");
    } catch( e ) {
        log( "Edit: auto preview - storage cannot be read (" + e.message + ") - not previewing." );
        return true;
    }
}

d.ready(function () { // needs mw.config

    if( getURLParameter("from") != "PageCreator" ) return;
    if( getURLParameter("action") != "edit" ) return;

    logFunc( "Edit: auto preview" );

    var textbox = $("#wpTextbox1"),
        // MediaWiki's own id; the name is the fallback, in case the skin ever renders the
        // button without it - nothing else on a MixesDB page is called wpPreview
        preview = $("#wpPreview, [name='wpPreview']").first();

    if( !textbox.length || !preview.length ) {
        log( "Edit: auto preview - no edit form to preview. #wpTextbox1: " + textbox.length +
             ", Preview button: " + preview.length + ". (Not logged in, or the page is protected?)" );
        return;
    }

    // Registered after the "insert" handler above, so this sees the filled box. Empty means
    // the fill did not happen (text was already there, or the URL carried none) - and an empty
    // page previews to nothing worth looking at.
    if( $.trim( textbox.val() ) === "" ) {
        log( "Edit: auto preview - the edit box is empty - leaving the form alone." );
        return;
    }

    if( autoPreview_wasDone() ) {
        log( "Edit: auto preview - this tab already previewed this page - leaving the form alone." );
        return;
    }

    try {
        sessionStorage.setItem( autoPreview_storageKey, mw.config.get("wgPageName") );
    } catch( e ) {
        log( "Edit: auto preview - could not remember the preview: " + e.message );
    }

    log( "Edit: auto preview - clicking Preview." );

    // Last, not now: the sections below this one are ready handlers too (the img1url one, whose
    // whole job is to put the artwork URL into sessionStorage BEFORE the preview navigates
    // away), and they all run in this same tick. A timeout of 0 lands behind every one of them.
    setTimeout(function() {
        // the element's own click, not jQuery's: it is what makes the browser submit the form
        // WITH this button as the submitter - the difference between a preview and a save
        preview[0].click();
    }, 0);
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edit: light the "Tracklist:" indicator matching the edit box
 *
 * Under the edit box sit three indicator buttons for the tracklist filing (#afterTextbox1,
 * inside .textareaBottomInfo): TLn = none, TLi = incomplete, TLc = complete. Each holds a
 * dimmed icon that lights up when the button carries the .op1 class - but nothing on the site
 * lights them from the TEXT in the box, so a page text that arrived filled in (the "insert"
 * section above - the page creator's "Create" link) showed three dark icons however clearly
 * it said [[Category:Tracklist: ...]].
 *
 * So this owns the lighting: the button matching the category the text actually carries is
 * lit, the other two are not, and no category in the text means none lit. Tracked two ways,
 * because two kinds of change reach the box: the input events cover typing, and the interval
 * covers every .val() a script sets - the insert fill above, TrackId.net's siteHasTl category
 * swap (toolkit/funcs.js), a paste by another helper - which fires no event at all. The
 * interval is cheap: one string compare per second, and only on pages that have the edit box.
 *
 * No fight with TrackId.net's siteHasTl block, which also sets .op1: it rewrites the category
 * in the text first, so re-deriving from the text agrees with it - whichever of the two runs
 * last says the same thing.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlButtons_lastSyncedText = null;

function syncTracklistButtons() {
    var textbox = $("#wpTextbox1"),
        buttons = $("#button-after-TLn, #button-after-TLi, #button-after-TLc");

    // the button row is the MixesWiki extension's and can render after us - as long as it is
    // not complete, nothing is marked synced, so the interval simply tries again
    if( !textbox.length || buttons.length < 3 ) return;

    var text = textbox.val() || "";

    if( text === tlButtons_lastSyncedText ) return;

    tlButtons_lastSyncedText = text;

    // sortkey tolerated ([[Category:Tracklist: none|...]]), space after the colon optional -
    // the first Tracklist category in the text decides
    var m = text.match( /\[\[Category:Tracklist: ?(complete|incomplete|none)(?:\|[^\]]*)?\]\]/i ),
        filing = m ? m[1].toLowerCase() : "";

    buttons.removeClass( "op1" );

    if( filing ) {
        buttons.filter( filing == "complete" ? "#button-after-TLc"
                      : filing == "incomplete" ? "#button-after-TLi"
                      : "#button-after-TLn" ).addClass( "op1" );
    }

    log( "syncTracklistButtons: " + ( filing ? "\"" + filing + "\" lit" : "no [[Category:Tracklist: ...]] in the text - none lit" ) );
}

d.ready(function () {
    if( !$("#wpTextbox1").length ) return;

    logFunc( "Edit: track the Tracklist indicator buttons" );

    // registered after the "insert" section's ready handler, so the first sync already sees
    // the filled box
    $("#wpTextbox1").on( "input change", syncTracklistButtons );
    setInterval( syncTracklistButtons, 1000 );

    syncTracklistButtons();
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Edit: remember an image URL handed over in the URL
 *
 * Companion to the "insert" section above: a userscript that knows where the mix's artwork
 * lives can name it in the same link, e.g. the SoundCloud script's "Create" link:
 *     ...&action=edit&insert=<page text>&img1url=https://i1.sndcdn.com/artworks-....-original.jpg
 *
 * Nothing is written into the page text for it. Whether a mix page gets a picture is the
 * editor's decision, and MixesDB's own inline upload form is where it happens: write the
 * [[File:...]] line, hit Preview, and the red file link grows an upload form whose "Source
 * URL" field is exactly what the remembered URL is for. Filling that field is all this does -
 * the upload itself stays a deliberate click on MixesDB's own Upload button.
 *
 * Why remember it at all: Preview POSTs the form, so by the time the upload form exists the
 * query string that carried the URL is long gone. sessionStorage, not localStorage, and with
 * an age limit on top: the URL belongs to one tab working on one page, and a leftover from
 * yesterday pointing at the wrong artwork would be worse than no help at all. It is kept (not
 * consumed) while it is valid, so a second and third preview still find it.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var imgUrl_storageKey = "mdb-helper-img1url",
    imgUrl_maxAgeMs = 6 * 60 * 60 * 1000; // long enough for a page left open over lunch

// imgUrl_remember
function imgUrl_remember( url ) {
    try {
        sessionStorage.setItem( imgUrl_storageKey, JSON.stringify({
            url: url,
            page: mw.config.get("wgPageName"),
            savedAt: Date.now()
        }));
        log( "Edit: img1url - remembered for this tab: " + url );
    } catch( e ) {
        // private mode / storage full - the field just stays empty, nothing breaks
        log( "Edit: img1url - could not be remembered: " + e.message );
    }
}

// imgUrl_remembered
// "" whenever there is the slightest doubt: another page, too old, or unreadable storage.
function imgUrl_remembered() {
    var raw, stored;

    try {
        raw = sessionStorage.getItem( imgUrl_storageKey );
    } catch( e ) {
        return "";
    }

    if( !raw ) return "";

    try {
        stored = JSON.parse( raw );
    } catch( e ) {
        return "";
    }

    if( !stored || !stored.url ) return "";

    if( stored.page !== mw.config.get("wgPageName") ) {
        log( "Edit: img1url - the remembered URL belongs to " + stored.page + ", not to this page - ignoring it." );
        return "";
    }

    if( Date.now() - stored.savedAt > imgUrl_maxAgeMs ) {
        log( "Edit: img1url - the remembered URL is older than " + ( imgUrl_maxAgeMs / 3600000 ) + "h - forgetting it." );
        try { sessionStorage.removeItem( imgUrl_storageKey ); } catch( e ) {}
        return "";
    }

    return stored.url;
}

d.ready(function () { // needs mw.config

    var imgUrl = getURLParameter("img1url");

    if( imgUrl ) imgUrl_remember( imgUrl );
});

// The upload form is built by MixesDB's own ext.mixesdb.inline-upload once a [[File:...]] in
// the page text renders as a red link - so it turns up on Preview, long after page load, and
// only when the editor asked for a picture. waitForKeyElements is what catches that.
waitForKeyElements( 'form.ajaxUpload-Form input[name="ajaxUpload-URL"]', function( jNode ) {

    // Only the first one: a mix page's first image is its artwork, and that is the one the URL
    // was handed over for. Anything below it (tracklist shots, ...) is another picture entirely.
    if( $('form.ajaxUpload-Form input[name="ajaxUpload-URL"]').index( jNode ) !== 0 ) return;

    if( $.trim( jNode.val() ) !== "" ) {
        log( "Edit: img1url - the Source URL field already has a value - leaving it alone." );
        return;
    }

    var imgUrl = imgUrl_remembered();

    if( !imgUrl ) return;

    logFunc( "Edit: img1url fill" );

    // "input" is not cosmetic here: MixesDB's own handler on that field hangs off it, and it is
    // what upgrades a SoundCloud artwork URL to the biggest size that loads and corrects the
    // upload's file extension. Setting .val() alone would skip all of that.
    jNode.val( imgUrl ).trigger("input").trigger("change");

    log( "Edit: img1url - filled the Source URL field with " + imgUrl );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Add a new mix: prefill the title from the URL
 *
 * Lets other userscripts hand a ready-made page title over to the form:
 *     https://www.mixesdb.com/w/MixesDB:Add_a_new_mix?title=2026-04-03 - Ruf Dug - NTS Radio
 *
 * (The SoundCloud script's "Create" link used to come in here. It now goes straight to the
 * edit form of the new page instead - see the "insert" section above - because it has a whole
 * page text to hand over, not only a title.)
 *
 * Two things make this more than a one-liner:
 *
 * 1. form#addANewMix has NO input#title in the light DOM. The field is <add-a-mix-input>, a
 *    form-associated custom element that keeps its <input id="title"> in an OPEN shadow root,
 *    which CSS/jQuery selectors cannot cross - $("form#addANewMix input#title") finds nothing.
 *    So we go through element.shadowRoot. Setting the value takes BOTH steps below, and the
 *    second one is not optional - verified against the live page:
 *      - setAttribute("value", ...) runs the element's attributeChangedCallback ("value" is
 *        one of its observedAttributes) and fills the input the user SEES, but it leaves the
 *        form value alone: new FormData(form).get("title") is still null afterwards.
 *      - only writing the shadow input and firing a real "input" event runs the element's own
 *        handleInput(), which is what reports the value to the form via ElementInternals.
 *    Skipping the event would submit an EMPTY title from a field that looks correctly filled.
 *
 * 2. The element is defined by the ResourceLoader module ext.mixesdb.add-a-new-mix, which
 *    loads async and can take seconds. waitForKeyElements() is no help (it is blind to shadow
 *    DOM and the element exists in the DOM long before it upgrades), so this polls for the
 *    shadow input itself.
 *
 * MediaWiki does not mind the "title" parameter on the /w/ path - wgPageName stays
 * MixesDB:Add_a_new_mix and the parameter survives in location.search.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

d.ready(function () { // needs mw.config

    if( mw.config.get("wgPageName") != "MixesDB:Add_a_new_mix" ) return;

    var prefillTitle = getURLParameter("title");

    if( !prefillTitle ) {
        log( "Add a new mix: no title parameter - nothing to prefill." );
        return;
    }

    logFunc( "Add a new mix: prefill" );
    logVar( "prefillTitle", prefillTitle );

    var tries = 0,
        maxTries = 100, // 100 * 100ms = 10s, the module is slow on a cold cache
        poll = setInterval(function() {
            var el = document.querySelector("form#addANewMix add-a-mix-input"),
                shadowInput = ( el && el.shadowRoot ) ? el.shadowRoot.querySelector("input#title") : null;

            if( !shadowInput ) {
                if( ++tries >= maxTries ) {
                    clearInterval( poll );
                    log( "Add a new mix: gave up waiting for add-a-mix-input to upgrade after " + maxTries + " tries. " +
                         "Element in DOM: " + !!el + ", custom element defined: " + !!customElements.get("add-a-mix-input") );
                }
                return;
            }

            clearInterval( poll );

            // don't overwrite something the user already typed (e.g. after a back navigation)
            if( $.trim( shadowInput.value ) !== "" ) {
                log( "Add a new mix: field is not empty - leaving it alone." );
                return;
            }

            // the element's own public API first ("value" is an observedAttribute) ...
            el.setAttribute( "value", prefillTitle );

            // ... then the same path a typing user takes, so handleInput() syncs the value the
            // form actually submits. Harmless if the attribute already did the job.
            shadowInput.value = prefillTitle;
            shadowInput.dispatchEvent( new Event( "input", { bubbles: true, composed: true } ) );
            shadowInput.dispatchEvent( new Event( "change", { bubbles: true, composed: true } ) );

            // hand the form over ready to type in: focused (so the field shows its focus outline)
            // with the caret behind the prefilled title, not selecting it - the prefill is meant
            // to be edited, and a select-all would make the next keystroke wipe it.
            shadowInput.focus();
            try {
                shadowInput.setSelectionRange( shadowInput.value.length, shadowInput.value.length );
            } catch( e ) {
                // setSelectionRange throws on input types that don't support selection; harmless here
                log( "Add a new mix: could not place the caret: " + e.message );
            }

            log( "Add a new mix: title prefilled after " + tries + " polls." );
        }, 100);
});

})();