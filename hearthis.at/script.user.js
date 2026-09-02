// ==UserScript==
// @name         hearthis.at (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.09.02.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/hearthis.at/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/youtube_funcs.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-hearthis.at_15
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/mixesdb_modal/funcs.js?v-hearthis.at_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-hearthis.at_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/toolkit/funcs.js?v-hearthis.at_37
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_definitions.js?v_57
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_builder.js?v_89
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/tracklist_detector.js?v_15
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/page_creator.js?v_125
// @include      http*hearthis.at*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hearthis.at
// @noframes
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var cacheVersion = 27,
    scriptName = "hearthis.at";
window.scriptName = scriptName; // toolkit.js reads this global directly
window.cacheVersion = cacheVersion; // same reason: the @require'd shared files cache-bust their own CSS with it

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + "shared/page_creator/page_creator.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * On player pages
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * MixesDB Page Creator (shared/page_creator/), above the toolkit. Everything site-specific is
 * read off the hearthis.at API here and handed over - the creator itself never looks at a
 * hearthis.at page. The API only answers under the canonical detail URL
 * (api-v2.hearthis.at/<user>/<permalink>/) - the numeric short URL has no endpoint - so a page
 * whose canonical URL could not be read gets no row.
 * channelTrust "low": a hearthis.at account is a broadcaster or re-uploader at least as often
 * as it is the artist or the series, so the title builder must not fall back to its name
 * without backing - see mdbPageCreator_add()'s header comment in page_creator.js.
 * target is a selector string on purpose: the row waits for the toolkit's usage verdict, so
 * #mdb-toolkit exists by the time it renders, and the string is looked up fresh every render.
 */
function addHearthisPageCreator( pageUrl, pageUrl_short ) {
    logFunc( "addHearthisPageCreator" );

    if( isHearthisIdUrl( pageUrl ) ) {
        log( "addHearthisPageCreator: only the numeric URL is known - the API cannot answer it, no Page Creator row." );
        return;
    }

    var apiUrl = pageUrl.replace( /^https?:\/\/(www\.)?hearthis\.at\//, "https://api-v2.hearthis.at/" ),
        // the answer is a round trip - drop it if the reader has clicked on to another track
        // meanwhile (see mdbPageGeneration in global.js)
        pageGeneration = mdbPageGeneration;

    logVar( "addHearthisPageCreator: apiUrl", apiUrl );

    $.get( apiUrl, function( t ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        if( !t || !t.title ) {
            log( "addHearthisPageCreator: the API answered without a title - no Page Creator row." );
            return;
        }

        // the API writes seconds as a string
        var dur_ms = ( parseInt( t.duration, 10 ) || 0 ) * 1000;

        // MixesDB does not take recordings under 20 min - skipping here also saves the
        // creator's MixesDB lookups. An unknown duration passes: better a row the wiki
        // refuses later than none on a mix whose duration the API left out.
        if( dur_ms && dur_ms < mdbPageCreator_minDurationMs ) {
            log( "Track is under the " + ( mdbPageCreator_minDurationMs / 60000 ) + " min MixesDB minimum - no Page Creator row and no tracklist box." );
            return;
        }

        // "YYYY-MM-DD" cut out of the API's local-time strings - see formatHearthisDate() in
        // global.js for why the timestamp is not parsed
        var createdAt = formatHearthisDate( t );

        mdbPageCreator_add({
            title:        t.title,
            channel:      ( t.user && t.user.username ) ? t.user.username : "",
            // see the function comment - accounts here are often not who played
            channelTrust: "low",
            createdAt:    createdAt,
            durationMs:   dur_ms,
            // the numeric short URL - the form MixesDB embeds (see README.md)
            playerUrl:    pageUrl_short,
            channelUrl:   ( t.user && t.user.permalink_url ) ? t.user.permalink_url : "",
            // w800 is the largest size the thumbnailer really holds - asking bigger only upscales
            artworkUrl:   t.artwork_url_retina || t.artwork_url || "",
            // The TITLE builder reads the labels a description tracklist credits out of this
            // ("Artist - Title [Label]") - the tracklist box is the separate call below.
            description:  t.description || "",
            // what the "Report" box calls this site ("HT title:", "HT date:")
            sourceLabel:  "HT",
            target:       "#mdb-toolkit",
            placement:    "before"
        });

        // The tracklist the uploader wrote into the description, as an editable box below the
        // toolkit that rides along into the created page. The detector answers an empty
        // description with "nothing found" like any other, so this is not gated.
        mdbPageCreator_addTracklist({
            description:  t.description || "",
            target:       "#mdb-toolkit",
            placement:    "after"
        });
    }, "json" );
}

/*
 * Everything below reads the page out of the <meta> tags and the DOM, so it all has to run
 * again once hearthis has swapped in another track - see onUrlChange() in global.js.
 */
function runHearthisPage() {
    var pageUrl_meta = $('meta[property="og:url"]').attr("content"), // e.g. https://hearthis.at/andrei-mor/01-cultureshockandgrafix-radio1sessentialmix-sat-01-18-2025-talion/">
        pageId_meta = $('meta[property="hearthis:embed:id"]').attr("content"), // e.g. 11703627
        titleText = $('meta[property="og:title"]').attr("content") || document.title.replace(/\s*\|\s*HearThis.*$/i, ""), // e.g. Culture Shock &amp; Grafix - Radio 1's Essential Mix 2025-01-18
        toolkitTarget = $("section.track-detail-header"),
        pageUrl = pageUrl_meta || removeParametersFromUrl( location.href ),
        pageId = pageId_meta;

    if( !pageId && isHearthisIdUrl(pageUrl) ) {
        pageId = pageUrl.split("/")[3];
    }

    logVar( "pageUrl", pageUrl );
    logVar( "pageId", pageId );
    logVar( "toolkitTarget.length", toolkitTarget.length );

    if( urlPath(2) && toolkitTarget.length == 1 && pageUrl != "" && pageId != "" ) {
        logFunc( "On player pages" );

        var pageUrl_short = 'https://hearthis.at/'+pageId+'/';

        // Pass the canonical detail URL so toolkit.js can search both detail and short/embed variants
        getToolkit( pageUrl, "playerUrl", "detail page", toolkitTarget, "after", titleText, "", 2, pageUrl_short );

        // The Page Creator row is gated behind this toolkit's usage verdict - (re)arm the poll.
        mdbPageCreator_watchToolkit();

        // The row's data is its own API round trip - whichever of the two lands last puts
        // the row on the page.
        addHearthisPageCreator( pageUrl, pageUrl_short );
    }
}

onUrlChange( runHearthisPage, { runNow: true } );

})();

/* ## Changelog
 * 2026.09.02.1  Page Creator (page_creator.js v_125, CSS): a dropdown behind "Create" for the
 *               file details body - the dur table with this file's duration, {{StandardShow1h}}
 *               or {{StandardShow2h}} (plus the siblings' own template where it is another one).
 *               Shown only where the entity's recent pages could not decide it: no known show
 *               category, a vote under the 90% bar, a template this file's duration contradicts,
 *               a failed fetch or too few pages. Opens on what the page text writes anyway; a
 *               pick rides into the created page and is named in the reasoning panel.
 * 2026.08.28.1  MixesDB Page Creator on track pages (shared/page_creator/, new @requires): the
 *               suggested page title, the confidence score and the "Create" link above the
 *               toolkit, plus the tracklist an uploader wrote into the description as an
 *               editable box below it that rides along into the created page. Data comes from
 *               api-v2.hearthis.at under the canonical detail URL (title, uploader, upload
 *               date, duration, artwork, description); the player URL handed over is the
 *               numeric short URL, the form MixesDB embeds. channelTrust "low" tells the title
 *               builder not to fall back to the account name without backing - hearthis.at
 *               accounts are often broadcasters or re-uploaders, not who played. Only for
 *               tracks of mix length (20 min gate).
 */
