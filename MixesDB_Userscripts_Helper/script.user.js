// ==UserScript==
// @name         MixesDB Userscripts Helper (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.08.09.3
// @description  Change the look and behaviour of the MixesDB website to enable feature usable by other MixesDB userscripts.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1293952534268084234
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/MixesDB_Userscripts_Helper/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-MixesDB_Userscripts_Helper_15
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-MixesDB_Userscripts_Helper_8
// @match        https://www.mixesdb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mixesdb.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {


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
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 12,
    scriptName = "MixesDB_Userscripts_Helper";
window.scriptName = scriptName; // toolkit.js reads this global directly

//loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


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
                            var tidLink_submit = '<a href="'+makeTidSubmitUrl( playerUrl, keywords )+'" target="_blank">Submit to TrackId.net</a>';
                            playerWrapper.append( '<div class="tidLink '+playerSite+'">'+tidLink_submit+'</div>' );
                        } else {
                            var tidLink = "",
                                trackidurl = data.mixesdbtrackid?.[0]?.trackidurl || null,
                                lastCheckedAgainstMixesDB = data.mixesdbtrackid?.[0]?.mixesdbpages?.[0]?.lastCheckedAgainstMixesDB || null;

                            logVar( "trackidurl", trackidurl );
                            logVar( "lastCheckedAgainstMixesDB", lastCheckedAgainstMixesDB );

                            if( trackidurl ) {
                                tidLink += '<a href="'+trackidurl+'">Exists on TrackId.net</a>';

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

    log( "Edit: insert - filled the edit box with the " + insertText.length + " characters from the URL." );
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