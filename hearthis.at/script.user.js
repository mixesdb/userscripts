// ==UserScript==
// @name         hearthis.at (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.09.04.2
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
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_definitions.js?v_58
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/title_builder.js?v_92
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/tracklist_detector.js?v_15
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/page_creator/page_creator.js?v_132
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

// MixesDB Page Creator: normally the row is only offered for players that are NOT on MixesDB
// yet - for a used player there is nothing to create. With this on, the row is shown for used
// players too, marked "used" and without the "Create" link (which would only start a duplicate
// page). On window because page_creator.js is a @require and cannot see this IIFE's scope.
window.mdbPageCreator_showForUsedPlayers = false; // Off like on SoundCloud and TrackId.net: the big PC block on a used player only gets in the way


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
 * 2026.09.04.2  Page Creator (title_builder.js v_92, page_creator.js v_132): a title carrying a character
 *               MixesDB cannot have in a page name no longer blinds the whole wiki lookup. Reported on
 *               "Hecklastig #009 >< Monokyma": the chunk "Hecklastig 009 >< Monokyma" went into the
 *               request as it stood, the mdbnames module refuses an invalid name for the WHOLE request, and
 *               the row read that refusal as "no category of this name" about every name in it - so
 *               Category:Monokyma and Category:Hecklastig were both painted red although they exist, and the
 *               "Similar:" row was left offering the very categories the page should have been filed under.
 *               "#<>[]|{}" is rewritten to a space before a name is asked about now, and a request that
 *               comes back refused says "lookup failed" on its chips instead of denying them.
 * 2026.09.04.1  Page Creator (title_definitions.js v_58, title_builder.js v_91, page_creator.js
 *               v_130), four things off one report: "True Techno 111 - Pan-Pot" on the channel
 *               "True Underground (ONE / True Techno Podcast)" came out as "2026-09-03 - True
 *               Techno 111 Pan-Pot - True Underground". A channel name listing its names in a
 *               BRACKET is taken apart now - split on the slash alone it left the fragment "True
 *               Techno Podcast)", and the wiki's "no category of this name" about that fragment
 *               was cached as the answer about Category:True Techno Podcast, the category these
 *               episodes are filed under. The trailing-number strip no longer reads a counting
 *               word out of the middle of a word: "True Techno 111" was asked about as "True
 *               Tech", so the one name that opens that category was never asked. A show whose
 *               name ends in "Podcast"/"Radio"/... is found in a title that writes it WITHOUT
 *               that word, the episode number in its place, instead of the whole title becoming
 *               the artist and its two halves being glued into one name. And of several category
 *               pages linking one channel, the one THIS title backs wins: the signals are weighed
 *               now rather than counted, so a name read off the title outranks the channel name
 *               merely opening the category name.
 * 2026.09.02.6  Page Creator (title_builder.js v_90, page_creator.js v_129): the upload date is cut
 *               down to the plain day before anything reads it - Mixcloud dates a show with a
 *               full timestamp, and "2026-08-07T17:33:30Z" stood in the suggested title as it
 *               came. And an "&" now reads as the word "and" wherever a name is compared, so
 *               "Terrence Parker & Friends Radio Show 131" is filed under the wiki's spelling
 *               "Terrence Parker And Friends Radio Show" - a name the wiki denies with the "&"
 *               is asked in that spelling too, and a numbered edition is respelled off its
 *               series name.
 * 2026.09.02.5  The debug setting mdbPageCreator_showForUsedPlayers now sits at the top of this
 *               script too (off, like everywhere): flipping it to true shows the Page Creator row
 *               on players that already have a MixesDB page - marked "used" and without the
 *               "Create" link. Until now only SoundCloud and TrackId.net carried the switch.
 * 2026.09.02.4  Page Creator (page_creator.js v_128): the file details dropdown counts a show
 *               word anywhere in the suggested title or the player's own title, not only in the
 *               entity slot - "Vamos Music Radio Show - Guest Mix Tovio" had the show parsed as
 *               the artist and got none.
 * 2026.09.02.3  Page Creator (page_creator.js v_127): the file details dropdown also for a show
 *               the wiki has no category for yet, when the name's own words say it is one ("Low
 *               Orbit Radio Show") - its first page is where there is nothing to read.
 * 2026.09.02.2  Page Creator (page_creator.js v_126): the file details dropdown only for a show,
 *               podcast or radio category the wiki knows - never for Promo Mix, an artist, a
 *               venue or an unknown name - and the table entry reads as the bare duration
 *               ("1:02:33").
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
