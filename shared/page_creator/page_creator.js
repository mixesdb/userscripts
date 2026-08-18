log( "/shared/page_creator/page_creator.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 *
 * MixesDB page creator (beta)
 *
 * The row a site script puts next to a player: an editable, suggested MixesDB mix page title,
 * a confidence score, and a "Create" link that opens the new page's edit form already filled
 * with the file details, the {{Player}} and the categories the title gives away.
 *
 * Named after the "Create" link, not after the title: the title is only the first of the
 * things this hands over to the wiki.
 *
 *
 * Using it from a site script
 * ---------------------------
 * Everything the row needs comes in through ONE call. Three values are the substance of it -
 * the player title, the channel/uploader name and the upload date - and every site that shows
 * a player has those three. The rest is optional and only makes the created page richer.
 *
 *     mdbPageCreator_add({
 *         title:       "Trommel.251 - Arno",         // required - the player title
 *         channel:     "trommel",                    // channel/uploader/profile name
 *         createdAt:   "2026-08-06T10:00:00Z",       // upload date, any Date-parsable form
 *         releaseDate: "",                           // optional, beats createdAt when set
 *         durationMs:  4321000,                      // optional, gates the 20 min minimum
 *         playerUrl:   "https://...",                // optional, goes into {{Player}}
 *         artworkUrl:  "https://...",                // optional, for MixesDB's upload form
 *         description: "01. Artist - Title [Label]", // optional, see below
 *         sourceLabel: "SC",                         // optional, names the site in the report
 *         target:      "#mdb-trackHeader-headline",  // where the row goes
 *         placement:   "after"                       // after|before|append|prepend
 *     });
 *
 * sourceLabel is what the "Report" box calls the site the values were read off ("SC title:",
 * "SC date:"). It is the site's own short name as it is used when a title is reported, which
 * is not always the script name - hence an option rather than a look at window.scriptName,
 * which is only the fallback.
 *
 * description is handed over here as well as to mdbPageCreator_addTracklist() below, and for a
 * different reason: the TITLE builder reads the labels the tracklist credits ("Artist - Title
 * [Label]"), so it can tell a label in brackets behind an artist from a second artist. See
 * mdbTitleKnownLabels in title_definitions.js.
 *
 *     mdbPageCreator_watchToolkit();  // whenever the toolkit is (re)built
 *
 * A site whose player pages carry a description hands that over too, in a second call - it puts
 * the tracklist the uploader wrote into an editable box and onto the created page. See the
 * "Tracklist" section at the bottom of this file:
 *
 *     mdbPageCreator_addTracklist({
 *         description:  "01. Artist - Title\n02. ...",
 *         loadComments: function( done ) { ... },   // optional
 *         target:       "#mdb-toggle-target",
 *         placement:    "after"
 *     });
 *
 * A site that builds a tracklist box of its OWN (TrackId.net renders the identified tracks into
 * one) does not call mdbPageCreator_addTracklist() at all - it names that box in
 * mdbPageCreator_add() instead:
 *
 *     tracklistBox: "#tlEditor #mixesdb-TLbox"      // optional - the site's own tracklist box
 *
 * The "Create" link then reads the page's tracklist out of that box, exactly as it would read
 * the creator's own: whatever is in it at click time goes onto the page, and the Tracklist
 * Editor API's verdict about that text decides the "Tracklist:" category.
 *
 * A site that suggests STYLE categories of its own (TrackId.net's "Style suggestions" box)
 * names that box the same way:
 *
 *     stylesBox: "#mixesdb-TIDstyles"               // optional - "[[Category:...]]" lines
 *
 * Its "[[Category:...]]" lines fill the style slots of the created page's category block,
 * which otherwise stay the two empty rows the editor fills by hand. Read at click time too,
 * so corrections typed into the box ride along.
 *
 * target is best given as a SELECTOR STRING: these sites re-render under the script's feet,
 * and a string is looked up again on every render, where a captured jQuery object would be a
 * detached node by then. A jQuery object or a DOM element is accepted too.
 *
 * Two async sources have to meet before the row can be added: the site's own data (which
 * brings title/channel/date, usually from an API call) and the toolkit (which decides whether
 * the mix is on MixesDB already). Both just store their piece and call mdbPageCreator_render()
 * - whichever finishes last puts the row on the page. So the order of the two calls above does
 * not matter, and mdbPageCreator_watchToolkit() may be called again on every re-render.
 *
 * The site script keeps everything site-specific on its side: reading the values off its page
 * or API, and any URL fixing they need (SoundCloud's "-original" artwork URL, say).
 *
 * Files: title_builder.js builds the title, title_definitions.js holds the word lists it uses,
 * tracklist_detector.js finds the tracklist in a description, page_creator.css styles the row.
 * All of them are @require'd/loaded next to this one.
 *
 *
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var mdbPageCreator_title = "",
    mdbPageCreator_confidencePercent = 0,
    mdbPageCreator_confidenceReasons = [],
    mdbPageCreator_promoCategory = false,
    // what the "Create" link sends along besides the title - handed in through
    // mdbPageCreator_add() rather than read off the DOM, since only the site script knows
    // where its page keeps them
    mdbPageCreator_playerUrl = "",
    mdbPageCreator_durationMs = 0,
    mdbPageCreator_artworkUrl = "",
    // What the site handed over, kept as it came in - the "Report" box quotes it back
    // unchanged, since a report is only worth anything if it names the INPUT the suggestion was
    // built from. Nothing else reads these.
    mdbPageCreator_sourceTitle = "",
    mdbPageCreator_sourceChannel = "",
    mdbPageCreator_sourceDate = "",
    mdbPageCreator_sourceLabel = "",
    // whether the report box is open. Not sticky the way the tracklist box is: it is opened for
    // one title, and a refined suggestion refills it rather than the reader reopening it.
    mdbPageCreator_reportOpen = false,
    // the hints bar's last logged verdicts - see mdbPageCreator_logHints(). Only there to keep
    // the log quiet: the bar re-renders on every keystroke, its content usually unchanged.
    mdbPageCreator_hintsLogged = "",
    // the debounce behind the title-edit category refresh - the hints bar's "Used categories"
    // line and the reasoning panel's section 6. See mdbPageCreator_queueCategoryUpdate()
    mdbPageCreator_categoryTimer = null,
    // the poll behind the panel's own loading state - see mdbPageCreator_watchReasoningReady()
    mdbPageCreator_reasoningReadyPoll = null,
    // The trace of the FIRST build - the one that ran before the wiki was asked, section 2 of
    // the panel. mdbTitle_trace itself always holds the LAST run, which is the lookup-informed
    // one, so without this the panel could only show the cleanup as it looked in hindsight.
    // A reference is enough: the second pass builds a new trace object rather than adding to
    // this one. Which build is the first is orchestration knowledge, so it is kept here and
    // not in title_builder.js - the parser cannot tell its passes apart.
    mdbPageCreator_tracePreLookup = null,
    // What the two passes MADE of the title. The trace alone cannot answer that: the branches
    // the wiki's answers open - the venue reading above all - write no cleanup step, so a run
    // that turns "kernel existence - Ritter Butzke Berlin (Promo Mix)" into
    // "Kernel Existence @ Ritter Butzke, Berlin" has an empty step diff, and section 4 would
    // report that nothing had happened. These two say what did.
    mdbPageCreator_titlePreLookup = "",
    mdbPageCreator_titlePostLookup = "",
    // which of the cleanup steps' "?" definition blocks the reader opened, keyed by the lists
    // shown in it. The panel is otherwise stateless and rebuilt whole; this one thing is kept
    // because the rebuild is what a title EDIT triggers, and a rule list opened to compare the
    // title against would close on the first keystroke.
    mdbPageCreator_openDefinitions = {},
    // which category chips' recent-mixes lists are open in the hints bar, keyed by the
    // normalized category name - kept across re-renders for the same reason as the "?" blocks:
    // the bar rebuilds on every keystroke and on every lookup answer, and a list opened to
    // check for a duplicate must not close under the reader.
    mdbPageCreator_openUsedCatRecent = {},
    // What the recent-pages TITLE analysis did to this page's suggestion - the reasoning
    // panel's "Title analysis of recent mixes" section reads these. Pre/post around the
    // refinement (mdbPageCreator_applyRecentToSuggestion), plus the step rows it wrote.
    // Per page, unlike mdbPageCreator_recentAnalysisCache: what was learned about a CATEGORY
    // survives a navigation, what was done to THIS title does not.
    mdbPageCreator_titlePreRecent = "",
    mdbPageCreator_titlePostRecent = "",
    mdbPageCreator_recentTitleChanges = [],
    // where the row goes - see the note on selector strings in the header comment
    mdbPageCreator_target = null,
    mdbPageCreator_placement = "after",
    mdbPageCreator_toolkitVerdict = null,
    mdbPageCreator_toolkitPoll = null,
    // the tracklist box (see the "Tracklist" section at the bottom of this file)
    mdbPageCreator_tracklistTarget = null,
    // a tracklist box the SITE built (TrackId.net's identified tracks): a selector string handed
    // in through mdbPageCreator_add({ tracklistBox }). When set, the "Create" link reads the
    // page's tracklist out of that box instead of the creator's own.
    mdbPageCreator_tracklistBoxSite = "",
    // a style-suggestions box the SITE built (TrackId.net's "Style suggestions"): a selector
    // string handed in through mdbPageCreator_add({ stylesBox }). Its "[[Category:...]]" lines
    // fill the style slots of the created page, which otherwise stay the two empty rows.
    mdbPageCreator_stylesBoxSite = "",
    mdbPageCreator_tracklistPlacement = "after",
    mdbPageCreator_tracklistSource = "",
    mdbPageCreator_tracklistFormatted = "",
    mdbPageCreator_tracklistLive = "",
    mdbPageCreator_tracklistStatus = "",
    mdbPageCreator_tracklistValidated = null,
    mdbPageCreator_tracklistChecked = false,
    mdbPageCreator_tracklistPoll = null;

// mdbPageCreator_add
// The entry point a site script calls. Builds the suggestion TWICE: once straight away off the
// title alone, so there is something on screen without waiting for a network round trip, and
// once more when MixesDB has said what it knows about the names in it. The second pass is what
// turns a channel into an artist and a bit of the title into an "@ venue".
function mdbPageCreator_add( options ) {
    logFunc( "mdbPageCreator_add" );

    var o = options || {},
        playerTitle = o.title || "",
        channel = o.channel || "",
        createdAt = o.createdAt || "",
        releaseDate = o.releaseDate || "",
        // Only the title builder's label test reads this, for the labels the tracklist credits
        // ("Artist - Title [Label]") - see mdbTitleKnownLabels in title_definitions.js. The
        // tracklist itself is a second call, mdbPageCreator_addTracklist().
        description = o.description || "";

    mdbPageCreator_playerUrl = o.playerUrl || "";
    mdbPageCreator_artworkUrl = o.artworkUrl || "";

    // for the "Report" box - the release date beats the upload date here for the same reason it
    // does in the title itself
    mdbPageCreator_sourceTitle = playerTitle;
    mdbPageCreator_sourceChannel = channel;
    mdbPageCreator_sourceDate = releaseDate || createdAt;
    mdbPageCreator_sourceLabel = o.sourceLabel || "";

    // Kept even when this call brings none, so a second call that only refreshes the data does
    // not lose the placement the first one set.
    if( o.target ) mdbPageCreator_target = o.target;
    if( o.placement ) mdbPageCreator_placement = o.placement;
    if( o.tracklistBox ) mdbPageCreator_tracklistBoxSite = o.tracklistBox;
    if( o.stylesBox ) mdbPageCreator_stylesBoxSite = o.stylesBox;

    logVar( "mdbPageCreator_add: title", playerTitle );
    logVar( "mdbPageCreator_add: channel", channel );
    logVar( "mdbPageCreator_add: createdAt", createdAt );
    logVar( "mdbPageCreator_add: target", typeof mdbPageCreator_target === "string" ? mdbPageCreator_target : "(node)" );
    logVar( "mdbPageCreator_add: placement", mdbPageCreator_placement );

    var first = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, mdbTitle_categoryCache, description ),
        // The MixesDB lookup below is a request, and on a site that navigates without loading
        // a document its answer can arrive after the reader has moved to the next mix - where
        // it would replace that mix's title with a refined guess about the previous one.
        pageGeneration = mdbPageGeneration;

    // kept before the lookup can inform anything - see mdbPageCreator_tracePreLookup
    mdbPageCreator_tracePreLookup = ( typeof mdbTitle_trace !== "undefined" ) ? mdbTitle_trace : null;
    mdbPageCreator_titlePreLookup = first.title;
    mdbPageCreator_titlePostLookup = "";

    mdbPageCreator_setTitle( first, o.durationMs );

    // the upload date goes along for the chunk split's date cut - see mdbTitle_titleChunks.
    // The first pass's own names ride along as candidates: a parse can unglue a name no chunk
    // carries - "RA.971 DJ MARIA." is ONE chunk (the episode id is no separator), so the chunk
    // side asks a name that cannot exist while the artist inside it is never asked. Asked in
    // the same request, the wiki's answer reaches the SECOND pass, whose exit writes the
    // category's own spelling into the title ("DJ Maria." -> "DJ MARIA.") - category names
    // are the last word on spelling.
    var candidates = mdbPageCreator_addParsedNames(
            mdbTitle_categoryCandidates( playerTitle, channel, description, createdAt || releaseDate ),
            first.title );

    mdbTitle_lookupCategories( candidates, function( known ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        var second = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, known, description );

        // section 4 of the reasoning panel is this difference, so it is kept, not only logged
        mdbPageCreator_titlePostLookup = second.title;

        if( second.title !== first.title ) {
            logVar( "mdbPageCreator_add: MixesDB knew better", first.title + "  ->  " + second.title );
        }

        mdbPageCreator_setTitle( second, o.durationMs );

        // The third title stage: the newest pages of the entity's own category. Their titles
        // are the series' real format, so once they are on hand the suggestion is refined to
        // match them; the first call also STARTS their fetch, whose settle path re-applies.
        mdbPageCreator_applyRecentToSuggestion();
        mdbPageCreator_render();
    });
}

// mdbPageCreator_addParsedNames
// The first pass's own names, appended to the lookup candidates: the artists and the entity
// category of the title it built - the same reading mdbPageCreator_queueCategoryUpdate takes
// off the field after an edit. On the usual title the chunk candidates already cover them, so
// this adds nothing (deduped normalized); it exists for the name only the PARSE can see:
// "RA.971 DJ MARIA." is one chunk, and the artist inside it has no candidate of its own until
// the parse has taken the episode id off. Appended LAST, so an over-full list drops these
// first - the chunk candidates are the ones the second pass's branches depend on. Only a
// genuinely new name notes a role and an origin; a name the chunks already ask keeps its
// first source (mdbTitle_noteCandidateSource is first-write-wins anyway).
function mdbPageCreator_addParsedNames( names, title ) {
    if( !title || typeof mdbTitle_titleCategories !== "function" ) return names;

    var read = mdbTitle_titleCategories( title ),
        parsed = [],
        i, j;

    for( i = 0; i < read.artists.length; i++ ) {
        parsed.push( { name: read.artists[i], role: "artist" } );
    }

    if( read.entity ) {
        // the entity CATEGORY (episode number stripped) is the only spelling worth asking
        // about - same reduction the edit round makes. For a promo the "category" is the
        // Promo Mix bucket, so the entity's own name is what the wiki is asked about.
        var entityCategory = mdbPageCreator_entityCategoryFor( title, read.entity );

        parsed.push( {
            name: entityCategory && entityCategory !== "Promo Mix" ? entityCategory : read.entity,
            role: "entity"
        } );
    }

    for( i = 0; i < parsed.length; i++ ) {
        var key = mdbTitle_normalizeCompare( parsed[i].name ),
            have = false;

        if( !key ) continue;

        for( j = 0; j < names.length; j++ ) {
            if( mdbTitle_normalizeCompare( names[j] ) === key ) { have = true; break; }
        }

        if( have ) continue;

        // typeof-guarded like the edit round's notes: a stale cached title_builder.js may
        // know neither roles nor sources yet
        if( typeof mdbTitle_noteCandidateRole === "function" ) {
            mdbTitle_noteCandidateRole( parsed[i].name, parsed[i].role );
        }
        if( typeof mdbTitle_noteCandidateSource === "function" ) {
            mdbTitle_noteCandidateSource( parsed[i].name, "first parse" );
        }

        logVar( "mdbPageCreator_addParsedNames: asking the first parse's name", parsed[i].name );
        names.push( parsed[i].name );
    }

    return names;
}

// mdbPageCreator_showForUsed
// The "Debug settings" block at the top of the site's script.user.js sets the flag. Read
// through a helper (and off window - this file is a @require and cannot see the userscript's
// IIFE scope), so a cached script.user.js from before the setting existed just means "off"
// instead of a ReferenceError.
function mdbPageCreator_showForUsed() {
    return window.mdbPageCreator_showForUsedPlayers === true;
}

// mdbPageCreator_resolveTarget
// A selector string is looked up on every render on purpose: these pages re-render under the
// script's feet, and the node a string names after a re-render is the new one, where a jQuery
// object captured when the data came in would be the detached old one.
function mdbPageCreator_resolveTarget() {
    var t = mdbPageCreator_target;

    if( !t ) return $();
    if( typeof t === "string" ) return $( t );

    return $( t );
}

// mdbPageCreator_place
// The same placement vocabulary getToolkit() takes, so a site script does not have to remember
// two of them. Unknown values fall back to "after", which is where the row belongs on every
// site so far (right below the headline).
function mdbPageCreator_place( wrapper, target ) {
    switch( mdbPageCreator_placement ) {
        case "before":  target.before( wrapper ); break;
        case "append":  target.append( wrapper ); break;
        case "prepend": target.prepend( wrapper ); break;
        default:        target.after( wrapper );
    }
}

// The "Create" link target: the edit form of the new page itself, not the "Add a new mix" form
// that only takes a title. Everything the site page already knows about the mix rides along in
// the "insert" parameter - MixesDB_Userscripts_Helper puts it into the edit box, see its
// "Edit: insert a page text handed over in the URL" section.
var mdbPageCreator_editUrl = "https://www.mixesdb.com/w/index.php";

// mdbPageCreator_syncCreateHref
// The input is editable, so the link has to carry whatever is in it AT CLICK TIME. Kept in a
// real href (rather than built in a click handler) so cmd/ctrl/middle-click still open a tab.
function mdbPageCreator_syncCreateHref( input, link ) {
    var title = $.trim( input.val() ),
        artwork = mdbPageCreator_artwork(),
        href = mdbPageCreator_editUrl +
               "?title=" + encodeURIComponent( title ) +
               "&action=edit" +
               "&insert=" + encodeURIComponent( mdbPageCreator_pageText( title ) );

    // Not part of the page text: whether the mix page gets a picture at all is the editor's
    // decision, and they make it over there by writing the [[File:...]] line themselves. The
    // URL only rides along so that, once they have, MixesDB's upload form knows where the
    // picture is - see the Helper's "Edit: remember an image URL" section.
    if( artwork ) {
        href += "&img1url=" + encodeURIComponent( artwork );
    }

    link.attr( "href", href );
}

// mdbPageCreator_createAfterTracklistUpdate
// The plain left click on "Create" (and the Enter path, whose programmatic click lands in the
// same handler): when the box was edited, its update is SHOWN before the tab opens. The old
// synchronous ask could never be seen - the request blocked the paint, and the moment it
// returned the new tab took the screen - which on TrackId.net left the impression nothing had
// happened at all. So the navigation waits, in two halves of tlBoxUpdateMinMs each: the box
// greys out for the first (scrolled into view if it sits below the fold, the API asked
// within), then the answer lands in it and stays on screen for the second - and only then the
// edit form opens, off an href that by then carries the formatted tracklist. Both halves,
// because a tab that opens the moment the grey ends steals the screen before the result was
// ever visible - seen once as "box goes white, stalls, tab opens".
//
// Bumping the box's request sequence BEFORE sending outdates a blur update already in flight
// for the same edit (the click straight out of the textarea starts one in the very same
// breath) - its answer then drops itself instead of applying twice.
var mdbPageCreator_createPending = false;

function mdbPageCreator_createAfterTracklistUpdate( input, create ) {
    // an update is already on its way to opening the form - a second click (double-clickers
    // exist) must not start a second one and end in two tabs
    if( mdbPageCreator_createPending ) {
        log( "mdbPageCreator_createAfterTracklistUpdate: already updating - ignoring the second click." );
        return;
    }

    var tl = mdbPageCreator_tracklistText(),
        box = $( mdbPageCreator_tracklistBoxSite || mdbPageCreator_tracklistBoxSelector ).first(),
        needsUpdate = tl && tl !== mdbPageCreator_tracklistValidated && box.length
                      && typeof apiTracklistAsync === "function" && typeof tlBoxApplyResult === "function";

    if( !needsUpdate ) {
        // nothing to show (or a stale cached funcs.js without the async pieces) - the
        // synchronous safety net still files the right category, then straight out
        mdbPageCreator_validateTracklist();
        mdbPageCreator_syncCreateHref( input, create );
        mdbPageCreator_openCreate( create );
        return;
    }

    logFunc( "mdbPageCreator_createAfterTracklistUpdate" );

    mdbPageCreator_createPending = true;

    box.data( "mdbTlboxSeq", ( box.data( "mdbTlboxSeq" ) || 0 ) + 1 );
    box.addClass( "mdb-tlBox-updating" );

    // "nearest" scrolls only when the box is actually out of view - a visible box stays put
    if( box[0].scrollIntoView ) box[0].scrollIntoView({ behavior: "smooth", block: "nearest" });

    var startedAt = Date.now(),
        pageGeneration = mdbPageGeneration;

    apiTracklistAsync( tl, "standard", "", function( res ) {
        var wait = Math.max( 0, tlBoxUpdateMinMs - ( Date.now() - startedAt ) );

        setTimeout(function() {
            box.removeClass( "mdb-tlBox-updating" );

            // the reader navigated on while the box was grey - a create form about the
            // previous page must not pop up over the next one
            if( !mdbIsCurrentPage( pageGeneration ) ) {
                mdbPageCreator_createPending = false;
                log( "mdbPageCreator_createAfterTracklistUpdate: the page changed while updating - not opening the edit form." );
                return;
            }

            if( res && res.text && res.feedback && tlBoxApplyResult( box, res ) ) {
                // the same bookkeeping the blur update hands over - live and validated text,
                // feedback, status, the reasoning panel's category row
                mdbPageCreator_tracklistBoxUpdated( box, res );
            } else {
                log( "mdbPageCreator_createAfterTracklistUpdate: no usable answer - creating with the text as typed." );
            }

            mdbPageCreator_syncCreateHref( input, create );

            // The second half of the moment: the fade back and the APPLIED answer get the
            // same minimum on screen the grey state had. Opening the tab in the same tick
            // cut the animation in half - the box went grey, stalled, and the screen was
            // gone before the result ever showed. createPending stays up until the open,
            // so a click landing in this window cannot start a second tab.
            setTimeout(function() {
                mdbPageCreator_createPending = false;

                if( !mdbIsCurrentPage( pageGeneration ) ) return;

                mdbPageCreator_openCreate( create );
            }, tlBoxUpdateMinMs );
        }, wait );
    });
}

// mdbPageCreator_openCreate
// The deferred navigation of the intercepted click. Still inside the click's transient
// activation - the wait above is well under the ~5s browsers grant - so this opens as a
// normal user-initiated tab, like the href would have. A blocker that disagrees gets the
// same page in this tab rather than a dead click.
function mdbPageCreator_openCreate( create ) {
    var href = create.attr( "href" );

    if( !href ) return;

    var w = window.open( href, "_blank" );

    if( !w ) {
        log( "mdbPageCreator_openCreate: the new tab was blocked - opening in this tab instead." );
        window.location.assign( href );
    }
}

// mdbPageCreator_artwork
// The artwork URL to hand over. #mdb-artwork-input is the shared convention across the site
// scripts for "the artwork URL that has actually been tried against the server" - what loaded
// is not always the URL that was asked for - so it beats the one handed in with the data. It
// is filled in asynchronously and does not exist on every layout, hence the fallback.
function mdbPageCreator_artwork() {
    var fromPage = $.trim( $("#mdb-artwork-input").val() || "" );

    return fromPage || mdbPageCreator_artworkUrl;
}

// mdbPageCreator_pageText
// The wikitext a new mix page starts as. Only what the site page can actually answer for is
// filled in: the file details, the player, the tracklist the description gave away and the
// categories the title itself spells out. The styles are the editor's work and are left as the
// empty shape they have on every mix page - unless the entity's own recent pages settled them
// (mdbPageCreator_categoryEntries). Two more things those pages decide (page_text_learning.md,
// rendered in the reasoning panel's "Page text analysis of recent mixes" section):
//
// - the leading artwork line, written with the LITERAL title (read off the field like the
//   categories, so a corrected title takes the image name with it). The extension is the one
//   the siblings use - a wrong guess costs nothing, MixesDB's inline uploader rewrites the
//   extension in the page text when the uploaded file differs.
// - the file details body: where the series uses a {{StandardShow*}} template, the table (and
//   with it this file's duration) must not be written - the template states the show's
//   standard length instead.
function mdbPageCreator_pageText( title ) {
    var info = mdbPageCreator_recentAnalysisFor( title ),
        findings = ( info.entry && info.entry.status === "done" ) ? info.entry.text : null,
        lead = "",
        body = mdbPageCreator_recentBodyChoice( findings );

    if( findings && findings.image && findings.image.value === "same" ) {
        lead = "[[File:" + title + "." + ( findings.imageExt || "jpg" ) + "|right|360px]]\n\n";
    }

    return lead +
           "== File details ==\n\n" +
           ( body ? "{{" + body + "}}" : mdbPageCreator_fileDetails() ) + "\n\n" +
           "{{Player\n |" + mdbPageCreator_playerUrl + "\n}}\n\n" +
           "== Tracklist ==\n\n" +
           mdbPageCreator_tracklistWikitext() + "\n\n" +
           mdbPageCreator_pageCategories( title );
}

// mdbPageCreator_fileDetails
// #mdb-fileDetails already holds the table in wiki syntax - it is what the duration button
// copies out, on every site script that has one - so the page text takes it from there rather
// than building a second version of it, and picks up MB/kbps the day those are read off the
// file. It usually lands in the DOM a moment after the suggestion does, so for the window in
// between the duration that came in with the data stands in for it.
function mdbPageCreator_fileDetails() {
    var fromPage = $.trim( $("#mdb-fileDetails textarea").val() || "" );

    if( fromPage ) return fromPage;

    return getFileDetails_wikitext( mdbPageCreator_durationMs ? Math.floor( mdbPageCreator_durationMs / 1000 ) : 0 );
}

// mdbPageCreator_styleCategories
// The styles of the created page, read out of a style-suggestions box the site script built
// (the stylesBox option) - one "[[Category:House]]" per line, as TrackId.net writes them. Read
// at click time like the tracklist box, so whatever the editor left in the box is what the page
// gets; a bare name typed in by hand counts too. No box, or nothing in it, means no styles -
// the category block then keeps its two empty rows.
function mdbPageCreator_styleCategories() {
    if( !mdbPageCreator_stylesBoxSite ) return [];

    var text = $.trim( $( mdbPageCreator_stylesBoxSite ).first().val() || "" ),
        out = [],
        lines, i, name;

    if( !text ) return out;

    lines = text.split( "\n" );

    for( i = 0; i < lines.length; i++ ) {
        name = $.trim( lines[i] ).replace( /^\[\[Category:(.+?)\]\]$/, "$1" );

        if( name && out.indexOf( name ) === -1 ) out.push( name );
    }

    return out;
}

// mdbPageCreator_pageCategories
// Read out of the title in the input, not out of what the parser had in mind: the input is
// editable, and a corrected title has to take its categories with it. Reading it is
// mdbTitle_titleCategories() in title_builder.js - parsing a title is its job, and the examples
// suite tests it there. What is decided HERE is what the page, not the title, says: whether the
// mix is a promo mix, and how its tracklist is filed.
//
// "Date - Artist - Entity" gives the year, one category per artist (every joiner between two
// names means another one - "See Bastian b2b Afin" is two categories), and the entity. The two
// empty slots are the styles - nothing on a player page says what a mix sounds like, and a
// guess there is worse than a blank the editor cannot miss. The exception is a site that
// SUGGESTS styles (the stylesBox option, TrackId.net): those are read off the mix itself, so
// they fill the slots instead. The "Tracklist:" filing is whatever the Tracklist Editor API
// last said about the box - "none" when there is no tracklist at all.
function mdbPageCreator_pageCategories( title ) {
    var entries = mdbPageCreator_categoryEntries( title ),
        out = "",
        i;

    for( i = 0; i < entries.length; i++ ) {
        out += "[[Category:" + entries[i].name + "]]\n";
    }

    return out;
}

// mdbPageCreator_categoryEntries
// The category lines as data, each with the ROLE it plays on the page - what
// mdbPageCreator_pageCategories() writes and what the reasoning panel annotates, so both
// always name the same categories.
function mdbPageCreator_categoryEntries( title ) {
    var read = mdbTitle_titleCategories( title ),
        entries = [],
        i;

    if( read.year ) entries.push( { name: read.year, role: "year" } );

    for( i = 0; i < read.artists.length; i++ ) {
        entries.push( mdbPageCreator_categoryEntry( read.artists[i], "artist" ) );
    }

    var entityCategory = mdbPageCreator_entityCategoryFor( title, read.entity );

    if( entityCategory ) {
        // "Promo Mix" is ours, not a name the wiki could spell differently
        entries.push( entityCategory === "Promo Mix"
            ? { name: entityCategory, role: "promo" }
            : mdbPageCreator_categoryEntry( entityCategory, "entity" ) );
    }

    var styles = mdbPageCreator_styleCategories();

    if( styles.length ) {
        // the site's own style suggestions (stylesBox option), read at click time - read off
        // THIS mix, so they beat anything learned from the siblings
        for( i = 0; i < styles.length; i++ ) {
            entries.push( { name: styles[i], role: "style" } );
        }
    } else {
        // Styles are the editor's call - two empty rows - unless the entity's recent sibling
        // pages agree on one at 90% (page_text_learning.md, signal C): only a genre-locked
        // series clears that bar, and its style is the one guess that is not a guess. Never
        // more than the two lines the shape has anyway; what is not learned stays blank.
        var learned = mdbPageCreator_recentLearnedStyles( title );

        for( i = 0; i < learned.length && i < 2; i++ ) {
            entries.push( { name: learned[i].name, role: "style", source: "recent",
                            count: learned[i].count, n: learned[i].n } );
        }
        for( i = learned.length; i < 2; i++ ) {
            entries.push( { name: "", role: "style" } );
        }
    }

    entries.push( { name: "Tracklist: " + mdbPageCreator_tracklistFiling(), role: "tracklist" } );

    return entries;
}

// mdbPageCreator_categoryEntry
// One artist or entity category, in the WIKI's spelling wherever the lookup answered about the
// name: the title says "DJ Maria.", the wiki files 8 mixes under "DJ MARIA.", and the page text
// has to write [[Category:DJ MARIA.]] - a category spelled our way is a second, empty category
// next to the real one, which is the one thing a category line must never be. name is what goes
// on the page and on screen from here on; titleName is kept where the two differ, because the
// TITLE is then still worth correcting and the chip's tooltip is where that is said.
//
// Asked by ROLE, the same way the hints bar reads its verdict: an artist has to be known AS an
// artist, so "fabric" the venue can never respell "Fabric" the artist.
//
// Only a RESPELLING is taken - same name, different case or punctuation. A match whose name
// really differs ("Truancy Volume" -> "Truancy Volumes") is knowledge, not a spelling, and the
// rule that keeps it out of the title (title_builder.js, the single exit) holds here too: the
// chip's tooltip names it and the editor decides.
function mdbPageCreator_categoryEntry( name, role ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        match = mdbTitle_knownMatch( cache, name, role === "artist" ? [ "artist" ] : null );

    if( !match || !match.title || match.title === name ) return { name: name, role: role };

    if( mdbTitle_normalizeCompare( match.title ) !== mdbTitle_normalizeCompare( name ) ) {
        return { name: name, role: role };
    }

    return { name: match.title, titleName: name, role: role };
}

// mdbPageCreator_entityCategoryFor
// The category the finished TITLE files the page under besides the year and the artists - what
// the page text writes and what the report names, so both answer the same way.
//
// Help:Add_a_new_mix_page - a self-released mix is filed under Promo Mix, and what stands in the
// entity slot there is the mix's OWN name, which is no category at all: "1975 - Bob Marley & The
// Wailers - Secret Santana Tapes (Promo Mix)" is filed under the two artists and Promo Mix, never
// under "Secret Santana Tapes". The flag covers the titles that leave the suffix off because the
// name already says it (see mdbPageCreator_syncPromoNote).
function mdbPageCreator_entityCategoryFor( title, entity ) {
    if( mdbPageCreator_promoCategory || /\(Promo Mix\)\s*$/.test( title ) ) return "Promo Mix";

    return mdbPageCreator_entityCategory( entity );
}

// mdbPageCreator_entityCategory
// MixesDB files every episode of a series under the series itself: "HATE Podcast 173" and
// "Trommel.038" are both [[Category:HATE Podcast]] / [[Category:Trommel]], and an event keeps
// its name without the edition ("Sunwaves 31" -> Sunwaves). The bracketed tail a title can
// carry - "(RA.971)", "(Promo Mix)" - is never part of a category name either.
function mdbPageCreator_entityCategory( entity ) {
    return String( entity || "" )
        .replace( /\s*\([^()]*\)\s*$/, "" )
        .replace( /[\s.]+\d+$/, "" )
        .trim();
}

// mdbPageCreator_bucketCategories
// Entity categories that COLLECT mixes rather than name a series: "Promo Mix" holds every
// self-released mix there is, so its member pages have nothing in common with each other or
// with the mix being created. For a category on this list:
// - the hints bar's chip gets no "N mixes" toggle and its recent pages are never fetched
// - the recent-pages analyses skip it entirely: neither the title format nor the page text
//   can be learned from pages that are no siblings of this mix
// Extend by hand when another filing bucket turns up; compared case-/punctuation-insensitively
// (mdbPageCreator_isBucketCategory).
var mdbPageCreator_bucketCategories = [ "Promo Mix" ];

// mdbPageCreator_isBucketCategory
function mdbPageCreator_isBucketCategory( name ) {
    var key = mdbTitle_normalizeCompare( name ),
        i;

    if( !key ) return false;

    for( i = 0; i < mdbPageCreator_bucketCategories.length; i++ ) {
        if( mdbTitle_normalizeCompare( mdbPageCreator_bucketCategories[i] ) === key ) return true;
    }

    return false;
}

// Help:File_Details#Minimum_duration - MixesDB does not take recordings under 20 minutes, so
// there is no page to create for a shorter track and no point offering a title for one.
var mdbPageCreator_minDurationMs = 20 * 60 * 1000;

// mdbPageCreator_setTitle
// Takes the { title, confidence, reasons } object from buildMixesdbTitle(), plus the track
// duration in ms (the same value #mdb-fileInfo shows).
function mdbPageCreator_setTitle( suggestion, durationMs ) {
    // kept for the page text behind the "Create" link, in case it is built before
    // #mdb-fileDetails exists - see mdbPageCreator_fileDetails()
    mdbPageCreator_durationMs = durationMs || 0;

    // only skip on a duration we actually know: a missing/zero value means the site gave us
    // nothing, and dropping the suggestion over that would be worse than offering it
    if( durationMs && durationMs < mdbPageCreator_minDurationMs ) {
        log( "mdbPageCreator_setTitle: track is " + Math.round( durationMs / 1000 ) + "s, under the " +
             ( mdbPageCreator_minDurationMs / 60000 ) + " min MixesDB minimum - no title suggested." );
        mdbPageCreator_title = "";
        return;
    }

    mdbPageCreator_title = ( suggestion && suggestion.title ) || "";
    mdbPageCreator_confidencePercent = ( suggestion && suggestion.confidence ) || 0;
    mdbPageCreator_confidenceReasons = ( suggestion && suggestion.reasons ) || [];
    mdbPageCreator_promoCategory = !!( suggestion && suggestion.promoCategory );
    mdbPageCreator_render();
}

// mdbPageCreator_watchToolkit
// The row is only useful for mixes that are NOT on MixesDB yet, so it waits for the toolkit's
// verdict instead of showing up right away. (The debug setting
// mdbPageCreator_showForUsedPlayers takes the used ones too - it still waits for the verdict,
// it just does not throw them away.)
//
// Call this again every time the toolkit is (re)built: a re-render wipes the wrapper the
// toolkit lives in, so an earlier poll and its verdict are stale by then.
//
// Polling, not waitForKeyElements, on purpose: waitForKeyElements stores its "alreadyFound"
// flag in ONE jQuery data key per ELEMENT, and toolkit.js already watches these very <li>s -
// a second watcher on them would starve whichever of the two runs second (see CLAUDE.md).
function mdbPageCreator_watchToolkit() {
    logFunc( "mdbPageCreator_watchToolkit" );

    if( mdbPageCreator_toolkitPoll ) {
        clearInterval( mdbPageCreator_toolkitPoll );
        mdbPageCreator_toolkitPoll = null;
    }
    mdbPageCreator_toolkitVerdict = null;

    var tries = 0,
        maxTries = 100; // 100 * 300ms = 30s

    mdbPageCreator_toolkitPoll = setInterval(function() {
        // .filled is what carries the answer: both <li>s are created empty and only the one
        // matching the MixesDB API result gets filled (the other is dropped in the cleanup)
        var used = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used.filled").length,
            unused = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.unused.filled").length;

        if( used ) {
            log( "mdbPageCreator_watchToolkit: this player is already used on MixesDB - " +
                 ( mdbPageCreator_showForUsed()
                   ? "showing the row anyway (debug setting mdbPageCreator_showForUsedPlayers)."
                   : "no page to create." ) );
            mdbPageCreator_toolkitVerdict = "used";
        } else if( unused ) {
            log( "mdbPageCreator_watchToolkit: not on MixesDB yet - offering a page title." );
            mdbPageCreator_toolkitVerdict = "unused";
        } else if( ++tries < maxTries ) {
            return;
        } else {
            log( "mdbPageCreator_watchToolkit: gave up waiting for the toolkit verdict after " + maxTries + " tries." );
        }

        clearInterval( mdbPageCreator_toolkitPoll );
        mdbPageCreator_toolkitPoll = null;

        mdbPageCreator_render();
    }, 300);
}

// mdbPageCreator_growTitleInput
// The input's width IS its size attribute (monospace font + content-box, page_creator.css), so
// this keeps it as wide as what is in it - called on every keystroke and on every programmatic
// .val(). It follows the text in BOTH directions: a field that stays at the width of a title
// that was deleted leaves an empty stretch next to the row's buttons. The CSS max-width caps
// the growth, so a long title never pushes those buttons off screen.
function mdbPageCreator_growTitleInput( input ) {
    var current = parseInt( input.attr( "size" ), 10 ) || 0,
        // 1 is the floor, not a nicer-looking minimum: size="0" is invalid and browsers fall
        // back to their default width (~20 characters), which is the opposite of shrinking.
        wanted = Math.max( 1, input.val().length );

    if( wanted !== current ) {
        // The width in ch on top of size: size alone is only the browser's estimate and pads
        // the field wider than the text even in monospace, where N ch IS N characters. The size
        // attribute stays as the fallback for when the inline style loses (or CSS is off).
        input.attr( "size", wanted ).css( "width", wanted + "ch" );
    }
}

// mdbPageCreator_refresh
// Second thoughts from the MixesDB lookup, put into a row that is already on screen. Anything
// typed into the input wins: a refined guess is still a guess, and the editor's own text is
// the one thing here that is not.
function mdbPageCreator_refresh( wrapper ) {
    logFunc( "mdbPageCreator_refresh" );

    var input = wrapper.find( "#mdb-pageCreator-title" );

    if( input.length && !input.data( "mdb-edited" ) && input.val() !== mdbPageCreator_title ) {
        // no size handling here: the "change" handler grows the input to the new title
        input.val( mdbPageCreator_title )
             .trigger( "change" ); // keeps the "Create" href in step with the new title
    }

    wrapper.find( "#mdb-pageCreator-score" )
        .attr( "class", "mdb-pageCreator-score-" + mdbPageCreator_confidenceBand( mdbPageCreator_confidencePercent ) )
        .attr( "title", mdbPageCreator_confidenceTitle() )
        .text( mdbPageCreator_confidencePercent + "%" );

    mdbPageCreator_syncPromoNote( wrapper );
    mdbPageCreator_renderHints( wrapper );
    mdbPageCreator_fillReport( wrapper );
    // the trace and the lookup log just changed with the refined suggestion - redraw right
    // away, no debounce: nothing here waits on typing
    mdbPageCreator_renderReasoning( wrapper );
}

// mdbPageCreator_syncPromoNote
// Help:Add_a_new_mix_page puts a self-released mix into Category:Promo Mix. Where the title
// itself already says so (" (Promo Mix)") there is nothing to add; where the name carries the
// word anyway ("Summer 2026 Mix") the suffix is left off, and THEN the category still has to
// be named somewhere - here, under the "Create" link.
function mdbPageCreator_syncPromoNote( wrapper ) {
    var note = wrapper.find( "#mdb-pageCreator-promoCategory" ),
        wanted = mdbPageCreator_promoCategory && mdbPageCreator_title.indexOf( "(Promo Mix)" ) === -1;

    if( !wanted ) {
        note.remove();
        return;
    }

    if( !note.length ) {
        wrapper.find( "#mdb-pageCreator-createColumn" ).append(
            $("<span>")
                .attr( "id", "mdb-pageCreator-promoCategory" )
                .attr( "title", "A self-released mix - the page belongs in Category:Promo Mix, and the \"Create\" link already writes that category into it.\nThe title itself does not say so because its name already does (\"Mix\", \"Vol.\", ...)." )
                .text( "Category:Promo Mix" )
        );
    }
}

// mdbPageCreator_render
// Puts the row on the page, or refreshes the one that is already there. Called by whichever of
// the two async sources finishes last, and again on every later refresh.
function mdbPageCreator_render() {
    // A used player normally has no row at all - the debug setting is the only way it gets one,
    // and it still waits for a verdict (null = the toolkit has not answered yet).
    var isUsed = ( mdbPageCreator_toolkitVerdict === "used" );

    if( mdbPageCreator_toolkitVerdict !== "unused" && !( isUsed && mdbPageCreator_showForUsed() ) ) return;
    if( !mdbPageCreator_title ) return;

    var target = mdbPageCreator_resolveTarget();
    if( !target.length ) return;

    // The row is built once and refreshed after that: the MixesDB lookup lands a moment after
    // the first suggestion is on screen, and rebuilding the whole row would take the input
    // (and anything typed into it) away under the editor's hands.
    var existing = $("#mdb-pageCreator");
    if( existing.length ) {
        mdbPageCreator_refresh( existing );
        return;
    }

    logFunc( "mdbPageCreator_render" );
    logVar( "mdbPageCreator_render: toolkit verdict", mdbPageCreator_toolkitVerdict );

    // No .mono class here on purpose: global.css sets ".mono { font-size: 12px !important }",
    // which no ID selector can beat. The monospace font comes from #mdb-pageCreator-title.
    var wrapper = $("<div>").attr( "id", "mdb-pageCreator" ),
        input = $("<input>", {
            type: "text",
            id: "mdb-pageCreator-title",
            spellcheck: "false",
            autocomplete: "off",
            // MediaWiki's page title limit. Strictly 255 BYTES, so a title heavy on umlauts
            // could still overrun it serverside - but the edit form it would overrun says so
            // itself, and counting UTF-8 bytes per keystroke is not worth that edge.
            maxlength: "255",
            title: "Suggested MixesDB mix page title - editable, please check it before using it"
        }),
        // how much of the title was read off the source vs. inferred - the tooltip names
        // every guess that cost points, so it says WHAT to check, not just that something is off
        score = $("<span>")
            .attr( "id", "mdb-pageCreator-score" )
            .addClass( "mdb-pageCreator-score-" + mdbPageCreator_confidenceBand( mdbPageCreator_confidencePercent ) )
            .attr( "title", mdbPageCreator_confidenceTitle() )
            .text( mdbPageCreator_confidencePercent + "%" ),
        beta = $("<span>")
            .attr( "id", "mdb-pageCreator-beta" )
            .attr( "title", "Guessed from the player title, date and channel name - it can be wrong. See Help:Add a new mix page." )
            .text( "BETA" );

    // .val() instead of a value attribute so the title text is never parsed as HTML
    input.val( mdbPageCreator_title );

    // monospace, so size is the character count of the suggestion - the whole title stays
    // visible without a horizontal scroll
    mdbPageCreator_growTitleInput( input );

    // input first, so appendMdbCopyTextButton() has a parent to insert the button into - it
    // uses .after(), which is a no-op on a detached node.
    // Order: input, copy, confidence (score over beta), "Report", then "Create" - or "used" in
    // its place. The report box itself is built on the first click and lands behind all of them.
    wrapper.append( input );

    appendMdbCopyTextButton( input, {
        ariaLabel: "Copy the suggested MixesDB page title",
        buttonTitle: "Copy the suggested MixesDB page title",
        copiedMessage: function() {
            return "Page title copied!";
        },
        processedClass: "mdb-pageCreator-copy-processed"
    });

    // "Report": the whole case as one paste-able block - what the site gave, what came out of it,
    // and the empty lines for what SHOULD have come out. Reported titles become cases in
    // title_examples.js, and every report that had to be asked back for the channel name or the
    // upload date cost a round trip - the channel name especially, which is the API's username
    // and is not the name in the URL. So the box hands all of it over at once.
    // Shown for a used player too: that debug row exists to compare the suggestion against the
    // page that already has it, which is exactly when something worth reporting turns up.
    var report = $("<a>")
            .attr( "id", "mdb-pageCreator-report" )
            .attr( "title", "Everything needed to report this title as wrongly suggested, ready to paste - fill in the \"Mistake / learning\" and \"Expected\" lines.\nAbove the box, the reasoning panel shows how the suggestion was built, in the order it ran: the title chunks, the first parse, the MixesDB lookups, the second parse with the answers, the format read off the entity's recent pages, the categories, and the page text learned from those same pages." )
            .text( "Report" );

    report.on( "click", function() {
        mdbPageCreator_toggleReport( wrapper );
    });

    // Two lines, and a plain <br> cannot make them here: the row is a grid, where a <br>
    // becomes a grid item of its own instead of breaking the line. So a column wrapper
    // stacks them and keeps the lot as ONE item in the row - the score with "BETA" behind it on
    // top, "Report" underneath.
    var confidence = $("<span>")
            .attr( "id", "mdb-pageCreator-confidence" )
            .append(
                $("<span>").attr( "id", "mdb-pageCreator-scoreLine" ).append( score, beta ),
                report
            );

    wrapper.append( confidence );

    // The report quotes the title that is in the field, so a correction typed above lands in it
    // - unless the box has been written in by then, see mdbPageCreator_fillReport().
    // The resize first: typing and refreshes alike land here, so the field follows its text.
    input.on( "input change", function() {
        mdbPageCreator_growTitleInput( input );
        // the categories are read off the field, so they follow every keystroke - into the
        // grey "not answered" state until the debounced lookup below has asked about the
        // names now in the title
        mdbPageCreator_renderHints( wrapper );
        mdbPageCreator_fillReport( wrapper );
        // the categories follow the title too - the bar above and the panel's section 6 - but
        // debounced: they are read off the field, and a corrected name may need a lookup the
        // cache has not seen
        mdbPageCreator_queueCategoryUpdate();
    });

    if( isUsed ) {
        // No "Create" link for a used player: the mix HAS a page, and the link would open the
        // edit form of a second one. "Exists" links to that page instead - the toolkit has
        // found it by the time this runs, because the "used" verdict this branch hangs on is
        // read off the toolkit's filled <li>, the very one holding the link. First link on
        // purpose where a player is used on several pages: the toolkit below lists them all.
        // The marker keeps the debug row from ever passing as the normal "not on MixesDB yet"
        // one. Span fallback so the note survives a toolkit markup change.
        var usedHref = $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.used.filled a.mdb-mixesdbLink.mixPage").first().attr( "href" ),
            usedNote = $( usedHref ? "<a>" : "<span>" )
                .attr( "id", "mdb-pageCreator-usedNote" )
                .attr( "title", "This player is already used on MixesDB - opens the mix page the toolkit found.\nThe row is only shown because the debug setting mdbPageCreator_showForUsedPlayers is on at the top of script.user.js. No \"Create\" link, since that would start a duplicate page." )
                .text( "Exists" );

        if( usedHref ) {
            // _top like every same-tab link we add: inside SoundCloud's preloaded iframe a
            // target-less link would swap the frame, not the page (see CLAUDE.md, Links We Add)
            usedNote.attr( "href", usedHref ).attr( "target", "_top" );
        }

        wrapper.addClass( "mdb-pageCreator-used" ).append( usedNote );
    } else {
        // _blank, not the usual _top: the point of this link is to fill in the MixesDB form
        // while still reading duration/artwork URL/API data off this player page - the same
        // "keep working on the source page" case as the toolkit's EDIT/HIST links.
        var create = $("<a>")
                .attr( "id", "mdb-pageCreator-create" )
                .attr( "target", "_blank" )
                .attr( "title", "Create this mix page on MixesDB - opens its edit form, filled with the file details, the player, the tracklist box below and the categories the title gives away" )
                .text( "Create" );

        mdbPageCreator_syncCreateHref( input, create );
        input.on( "input change", function() {
            mdbPageCreator_syncCreateHref( input, create );
        });

        // The page text is more than the title: the file details table lands in the DOM a
        // moment after this row is built, and nothing about that fires an input event. So the
        // href is refreshed once more on the way in. Two ways in, two treatments:
        //
        // - middle, right and cmd/ctrl/shift-clicks NAVIGATE NATIVELY off the href, so it has
        //   to be correct before the browser reads it - this mousedown keeps the synchronous
        //   validation for exactly them
        // - a PLAIN left press does nothing here: its click is intercepted below and the
        //   update is shown before the tab opens, which only works if this handler has not
        //   already consumed the change invisibly
        create.on( "mousedown", function( e ) {
            if( e.which === 1 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey ) return;

            mdbPageCreator_validateTracklist();
            mdbPageCreator_syncCreateHref( input, create );
        });

        // The plain left click (keyboard activation of the link and the Enter path's
        // programmatic click land here too): the navigation is held back until the box's
        // update has been SEEN - see mdbPageCreator_createAfterTracklistUpdate.
        create.on( "click", function( e ) {
            if( e.which !== 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ) return;

            e.preventDefault();
            mdbPageCreator_createAfterTracklistUpdate( input, create );
        });

        // Enter in the title field is "I am done with the title" - that is the whole reason
        // the field is there, so it starts the page rather than doing nothing. preventDefault
        // because SoundCloud renders our row inside its own forms in places, where Enter would
        // submit one.
        input.on( "keydown", function( e ) {
            if( e.which !== 13 ) return;

            e.preventDefault();
            logFunc( "mdbPageCreator: Enter in the title field -> Create" );

            // the DOM node, not .trigger(): the native click runs the click handler above,
            // which is the same "show the update, then open" path a real click takes
            create[0].click();
        });

        // Only a REAL keystroke marks the input as the editor's. A refresh sets .val() and
        // fires "change" itself, which must not count as editing.
        input.on( "input", function() {
            input.data( "mdb-edited", true );
        });

        // A column, so the promo category note can sit under the link the way "BETA" sits
        // under the score
        wrapper.append( $("<span>").attr( "id", "mdb-pageCreator-createColumn" ).append( create ) );
        mdbPageCreator_syncPromoNote( wrapper );
    }

    // Last, so it forms the second line of the row - and before the report box and the
    // reasoning panel are ever built, which is what keeps it above them.
    mdbPageCreator_renderHints( wrapper );

    // The bar names the categories of the FINISHED title, and those are not always the names
    // the build asked about: an artist field with a joiner ("See Bastian b2b Afin") is one
    // chunk to the lookup and two categories to the page. So the row asks about its own names
    // once - cache-aware, so on the usual row where the build already covered them this costs
    // no request at all, and without it those names could only ever stand grey.
    mdbPageCreator_queueCategoryUpdate();

    mdbPageCreator_place( wrapper, target );
}

// mdbPageCreator_confidenceBand
// Drives the colour. The thresholds are about what the reader should DO: green = read off the
// source, amber = one guess worth checking, red = the title was largely inferred.
function mdbPageCreator_confidenceBand( percent ) {
    if( percent >= 80 ) return "high";
    if( percent >= 55 ) return "mid";
    return "low";
}

// mdbPageCreator_confidenceTitle
function mdbPageCreator_confidenceTitle() {
    var intro = "Confidence that this title needs no changes.";

    if( !mdbPageCreator_confidenceReasons.length ) {
        return intro + "\nEverything was read straight off the player title, date and channel.";
    }

    return intro + "\n\nWhat lowered it:\n- " + mdbPageCreator_confidenceReasons.join( "\n- " );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The hints bar
 *
 * A second line under the row (#mdb-pageCreator-hints), holding what the title itself cannot
 * say: refinements to make before creating, and hints about what the created page would be.
 * Always visible, unlike the report box - these are for the editor who is about to click
 * "Create", not for the one reporting a wrong suggestion.
 *
 * One item so far, "Used categories" (row_enrichment.md, additions 1 and 2): the artist and
 * entity categories the page text writes, each a chip answered by the wiki. Green means
 * MixesDB has that category - with its mix count, and the category's recent mix pages behind
 * it where the lookup brought them - red means it has not: a new name, or the name is spelled
 * differently there, and the red name searches MixesDB (the loupe behind it says so), which
 * is the fastest way to tell those two apart. On a desktop-wide window the chips' MixesDB
 * links open in a modal on the page (mdbPageCreator_modalOpen below) rather than a tab.
 *
 * Everything here is rebuilt whole on every render and reads the title out of the FIELD, the
 * same way the page text does: a corrected title has to take its categories with it.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// mdbPageCreator_renderHints
// Fills the bar, creating it on first use. Hidden while it has nothing to say, so a row whose
// title names neither an artist nor an entity keeps the height it has today.
function mdbPageCreator_renderHints( wrapper ) {
    // the row can be gone by the time a lookup answers - the reader clicked on to the next mix
    if( !wrapper.length ) return;

    var bar = wrapper.find( "#mdb-pageCreator-hints" );

    if( !bar.length ) {
        // Built with the row rather than on demand: it is not a panel someone opens, it is
        // part of what the row says. Appended before the report box and the reasoning panel
        // ever exist, and document order is vertical order in this grid, so it stays above
        // both without either of them having to know about it.
        bar = $("<div>").attr( "id", "mdb-pageCreator-hints" );
        wrapper.append( bar );
    }

    bar.empty();

    var title = $.trim( wrapper.find( "#mdb-pageCreator-title" ).val() ),
        usedCats = mdbPageCreator_usedCategoriesHint( title );

    if( usedCats ) bar.append( usedCats );

    // Not .toggle(): the bar is filled while the wrapper is still DETACHED on the first render,
    // where jQuery has no computed display to restore and guesses one. Clearing the inline
    // property lets the stylesheet's "display: flex" stand, whatever the wrapper's state.
    bar.css( "display", bar.children().length ? "" : "none" );

    mdbPageCreator_prefetchHintLinks( bar );
}

// mdbPageCreator_usedCategoriesHint
// "Used categories: Dave Huismans, Horst Festival (Search)" - the artist and entity categories
// of the page text, each in the colour of the wiki's answer about it.
//
// Only those two roles: the year category always exists, the styles are the editor's own call
// and the "Tracklist:" filing is the API's - none of them is a name anyone could have spelled
// wrong, which is the whole question this line answers. "Promo Mix" is left out for the same
// reason, and is already named under the "Create" link (mdbPageCreator_syncPromoNote).
function mdbPageCreator_usedCategoriesHint( title ) {
    var entries = mdbPageCreator_categoryEntries( title ),
        wanted = [],
        i;

    for( i = 0; i < entries.length; i++ ) {
        if( entries[i].name && ( entries[i].role === "artist" || entries[i].role === "entity" ) ) {
            wanted.push( entries[i] );
        }
    }

    if( !wanted.length ) {
        mdbPageCreator_logHints( "(no artist or entity category)" );
        return null;
    }

    // The chips sit in a column of their OWN, next to the label rather than after it: an open
    // chip is as tall as its list, so the chips wrap, and wrapped rows used to start under the
    // label while the first row started behind it. The label's fixed width (page_creator.css)
    // is the left edge they all share.
    var chips = $("<span>").addClass( "mdb-pageCreator-hint-items" ),
        hint = $("<span>")
            .attr( "id", "mdb-pageCreator-usedCats" )
            .append(
                $("<span>").addClass( "mdb-pageCreator-hint-label" ).text( "Used categories:" ),
                chips
            ),
        logged = [];

    // no separators between the entries: each is a bordered chip, and the bar's flex gap
    // (page_creator.css) is the spacing
    for( i = 0; i < wanted.length; i++ ) {
        var state = mdbPageCreator_usedCategoryState( wanted[i] );

        chips.append( mdbPageCreator_usedCategory( wanted[i], state ) );
        logged.push( wanted[i].name + " [" + wanted[i].role + ": " + state.verdict + "]" );
    }

    mdbPageCreator_logHints( logged.join( " | " ) );

    return hint;
}

// mdbPageCreator_logHints
// The bar's verdicts, logged the once they change. Straight logging would put a line in the
// console for every keystroke in the title field, where the answer is the same one all the way
// through - and the line worth seeing is the one where a name turns green or red.
function mdbPageCreator_logHints( summary ) {
    if( summary === mdbPageCreator_hintsLogged ) return;

    mdbPageCreator_hintsLogged = summary;

    logVar( "mdbPageCreator hints: used categories", summary );
}

// mdbPageCreator_usedCategoryState
// What the wiki says about one category name, as data - so the markup below and the log line
// above can never tell two different stories about the same name. One of three verdicts:
//
// - known    MixesDB has the category; .match carries its own spelling, type and mix count
// - missing  MixesDB was asked and has no such category
// - unknown  MixesDB has not been asked (yet) - no answer either way
//
// Read the same way the reasoning panel's category rows read it, off the same cache, so the
// two can never contradict each other: an artist has to be known AS an artist, an entity as
// anything at all ("fabric" is a venue, and that answers the entity slot).
function mdbPageCreator_usedCategoryState( entry ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        match = mdbTitle_knownMatch( cache, entry.name, entry.role === "artist" ? [ "artist" ] : null );

    if( match ) return { verdict: "known", match: match };

    return { verdict: mdbPageCreator_categoryUnanswered( entry.name ) ? "unknown" : "missing", match: null };
}

// mdbPageCreator_usedCategory
// One category name as a chip - the reasoning panel's chip look, coloured by the verdict:
//
// - known    green, linked to the category page, with its mix count behind it (a toggle for
//            the category's recent mix pages where the lookup brought them - see
//            mdbPageCreator_usedCatMixes). The link carries the WIKI's spelling, which is the
//            page that really exists; where that differs from what the title writes, the
//            tooltip says so, since that difference is a refinement worth making.
// - missing  red, and the name IS the search link, the flat loupe behind it saying so - there
//            is no category page to open, and the search is the point: a red name is either
//            new or misspelled, and only a look at what MixesDB does have under that name
//            tells which.
// - unknown  grey. Never red: a name nobody asked about is not a name the wiki denied.
function mdbPageCreator_usedCategory( entry, state ) {
    var out = $("<span>").addClass( "mdb-pageCreator-usedCat" );

    if( state.verdict === "known" ) {
        // entry.name is the wiki's spelling already (mdbPageCreator_categoryEntry), so the
        // note is about the TITLE, not about the category: titleName is set exactly where the
        // two differ. The second branch is the name the canonicalizer refused to take - a
        // match that is not merely a respelling, where MixesDB's own name is the news.
        var spelled = state.match.title || entry.name,
            note = entry.titleName
                ? "\nThe title above spells it \"" + entry.titleName + "\" - worth correcting there too."
                : ( spelled !== entry.name
                    ? "\nMixesDB spells it \"" + spelled + "\" - worth correcting the title above."
                    : "" );

        out.addClass( "mdb-pageCreator-usedCat-known" ).append(
            $("<a>")
                // _blank, not the usual _top: looking a category up is a side trip taken
                // while judging the title on THIS page, and the row has to still be here
                // afterwards (same case as the toolkit's EDIT/HIST links). On a desktop-wide
                // window the modal intercepts the plain left click instead - see
                // mdbPageCreator_modalOpen - and this href is what every other click keeps.
                .attr( "href", mdbPageCreator_categoryUrl( spelled ) )
                .attr( "target", "_blank" )
                .attr( "data-mdb-modal-label", "Category: " + spelled )
                .attr( "title", "MixesDB has this category - opens [[Category:" + spelled + "]]." + note )
                .text( entry.name )
        );

        mdbPageCreator_usedCatMixes( out, entry, state.match );

        return out;
    }

    if( state.verdict === "unknown" ) {
        return out.addClass( "mdb-pageCreator-usedCat-unknown" ).append(
            $("<span>")
                .attr( "title", "Not looked up on MixesDB (yet) - no answer either way about this category." )
                .text( entry.name )
        );
    }

    return out.addClass( "mdb-pageCreator-usedCat-missing" ).append(
        $("<a>")
            .attr( "href", mdbPageCreator_searchUrl( entry.name ) )
            .attr( "target", "_blank" )
            .attr( "data-mdb-modal-label", "MixesDB search: " + entry.name )
            .attr( "title", "MixesDB has no " + ( entry.role === "artist" ? "artist " : "" ) + "category of this name - a new name, or spelled differently there. Search MixesDB for it to tell those two apart." )
            .text( entry.name )
            .append( mdbPageCreator_usedCatLoupe() )
    );
}

// mdbPageCreator_usedCatLoupe
// The flat loupe behind a red name - what marks the name as the search link, since there is
// no category page the colour could promise. Built through createElementNS: jQuery's HTML
// parsing would hand an <svg> string to innerHTML, which is exactly what a Trusted Types
// policy is there to refuse. stroke="currentColor" keeps it in whatever red the link wears.
function mdbPageCreator_usedCatLoupe() {
    var ns = "http://www.w3.org/2000/svg",
        svg = document.createElementNS( ns, "svg" ),
        glass = document.createElementNS( ns, "circle" ),
        handle = document.createElementNS( ns, "line" );

    svg.setAttribute( "class", "mdb-pageCreator-usedCat-loupe" );
    svg.setAttribute( "viewBox", "0 0 24 24" );
    svg.setAttribute( "aria-hidden", "true" );

    glass.setAttribute( "cx", "10.5" );
    glass.setAttribute( "cy", "10.5" );
    glass.setAttribute( "r", "6.5" );
    glass.setAttribute( "fill", "none" );
    glass.setAttribute( "stroke", "currentColor" );
    glass.setAttribute( "stroke-width", "2.2" );

    handle.setAttribute( "x1", "15.4" );
    handle.setAttribute( "y1", "15.4" );
    handle.setAttribute( "x2", "21" );
    handle.setAttribute( "y2", "21" );
    handle.setAttribute( "stroke", "currentColor" );
    handle.setAttribute( "stroke-width", "2.2" );
    handle.setAttribute( "stroke-linecap", "round" );

    svg.appendChild( glass );
    svg.appendChild( handle );

    return $( svg );
}

// mdbPageCreator_usedCatMixes
// The "N mixes" behind a confirmed name - the same count the reasoning panel writes behind
// its matches, and ALWAYS the toggle for the category's recent mix pages, which fold out
// under the name, inside the chip: the fastest "does this page already exist?" look there is
// (row_enrichment.md §2). Non-artist categories bring the pages with the lookup answer;
// an artist category's are fetched the first time its chip opens
// (mdbPageCreator_usedCatFetchRecent) - the server ships "recent" for non-artist types only.
// Open ones survive the bar's re-renders - see mdbPageCreator_openUsedCatRecent.
// A bucket category (mdbPageCreator_bucketCategories) gets neither the count nor the toggle:
// its pages are unrelated mixes, so "recently filed there" answers nothing about this one.
function mdbPageCreator_usedCatMixes( chip, entry, match ) {
    if( typeof match.mixes !== "number" ) return;
    if( mdbPageCreator_isBucketCategory( match.title || entry.name ) ) return;

    var text = match.mixes + ( match.mixes === 1 ? " mix" : " mixes" ),
        key = mdbTitle_normalizeCompare( match.title || entry.name ),
        recent = mdbPageCreator_usedCatRecent( match ),
        list = $("<span>").addClass( "mdb-pageCreator-usedCat-recent" ),
        i;

    for( i = 0; i < recent.length; i++ ) {
        list.append(
            $("<a>")
                // _blank as the fallback for the same reason as the category link above -
                // the modal takes the plain left click on desktop
                .attr( "href", mdbPageCreator_pageUrl( recent[i] ) )
                .attr( "target", "_blank" )
                .attr( "title", "Open this mix page on MixesDB" )
                .text( recent[i] )
        );
    }

    // the list's word while it has no links: being fetched, failed, or genuinely empty. An
    // un-asked artist category shows nothing - its first open starts the fetch, and the
    // re-render lands here again with recentPending set.
    if( !recent.length ) {
        var note = "";

        if( match.recentPending )     note = "looking the pages up …";
        else if( match.recentFailed ) note = "the lookup failed - open the category itself";
        else if( match.recent )       note = "no mix pages in this category yet";

        if( note ) list.append( $("<span>").addClass( "mdb-pageCreator-usedCat-recent-note" ).text( note ) );
    }

    chip.toggleClass( "mdb-pageCreator-usedCat-open", mdbPageCreator_openUsedCatRecent[ key ] === true );

    chip.append(
        // an <a> without href on purpose: it navigates nowhere, and the modal's delegated
        // handler only watches links WITH one
        $("<a>")
            .addClass( "mdb-pageCreator-usedCat-mixes" )
            .attr( "title", "Show the mix pages most recently filed in this category" )
            .text( text )
            .on( "click", function() {
                var nowOpen = !chip.hasClass( "mdb-pageCreator-usedCat-open" );

                mdbPageCreator_openUsedCatRecent[ key ] = nowOpen;
                chip.toggleClass( "mdb-pageCreator-usedCat-open", nowOpen );

                if( !nowOpen ) return;

                if( !match.recent && !match.recentPending && !match.recentFailed ) {
                    mdbPageCreator_usedCatFetchRecent( match );
                    // re-render at once: this chip comes back open, now saying "looking
                    // the pages up …" - the fetch's own re-render brings the links
                    mdbPageCreator_renderHints( $("#mdb-pageCreator") );
                    return;
                }

                // pages already on hand - warm the cache for the ones now on screen
                mdbPageCreator_prefetchHintLinks( chip );
            }),
        list
    );
}

// mdbPageCreator_usedCatFetchRecent
// The recent mix pages of a category whose lookup answer brought none - in practice the
// artist categories. One list=categorymembers call, cmsort=sortkey&cmdir=desc: mix page
// titles start with their date, so sortkey order is date order, and it follows an editor's
// manual sortkey where one files a page under its broadcast date (row_enrichment.md §2).
// The titles are written onto the MATCH object in mdbTitle_categoryCache, so the answer
// survives every re-render - and, like the cache, the page's navigations.
function mdbPageCreator_usedCatFetchRecent( match ) {
    // no chip ever offers the toggle for a bucket category (mdbPageCreator_usedCatMixes), so
    // this is the safety net behind that: never spend a request on pages that are no siblings
    if( mdbPageCreator_isBucketCategory( match.title ) ) {
        log( "mdbPageCreator_usedCatFetchRecent: \"" + match.title + "\" is a bucket category - not fetched." );
        return;
    }

    logVar( "mdbPageCreator_usedCatFetchRecent", match.title );

    match.recentPending = true;

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: {
            action: "query",
            format: "json",
            formatversion: 2,
            origin: "*",
            list: "categorymembers",
            cmtitle: "Category:" + match.title,
            cmnamespace: 0, // without it the answer is half File: pages
            cmsort: "sortkey",
            cmdir: "desc",
            cmlimit: 10
        },
        success: function( data ) {
            var members = ( data && data.query && data.query.categorymembers ) || [],
                titles = [],
                i;

            for( i = 0; i < members.length; i++ ) {
                if( members[i].title ) titles.push( members[i].title );
            }

            match.recentPending = false;
            match.recent = titles;
            mdbPageCreator_renderHints( $("#mdb-pageCreator") );
        },
        error: function( xhr, status ) {
            log( "mdbPageCreator_usedCatFetchRecent FAILED (" + status + ") for " + match.title );
            match.recentPending = false;
            match.recentFailed = true;
            mdbPageCreator_renderHints( $("#mdb-pageCreator") );
        }
    });
}

// mdbPageCreator_usedCatRecent
// The recent mix pages of one lookup match, newest first. The server walks cl_timestamp -
// when a page was last (re)categorized, not the mix date - so its order is close to random.
// Mix page titles START with their date, so a lexical sort IS date order.
function mdbPageCreator_usedCatRecent( match ) {
    var recent = ( match && match.recent && match.recent.length ) ? match.recent.slice() : [];

    recent.sort();
    recent.reverse();

    return recent;
}

// mdbPageCreator_categoryUnanswered
// Whether the wiki still owes an answer about this name - its request is in flight, or it was
// never asked at all. Read off the lookup log, which records the ASKING; the cache alone
// cannot tell "asked and unknown" from "never asked", and only the first of those is a red name.
//
// This is also what keeps the bar from flashing red through every keystroke: a half-typed name
// has never been asked, so it stands grey until mdbPageCreator_queueCategoryUpdate() has asked
// about it. A name that HAS a settled answer keeps its colour meanwhile - it was asked, the
// answer has not changed, and greying it out again on every keystroke would only flicker.
function mdbPageCreator_categoryUnanswered( name ) {
    var log = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        key = mdbTitle_normalizeCompare( name ),
        i;

    for( i = 0; i < log.length; i++ ) {
        if( log[i].key === key ) return !!log[i].pending;
    }

    return true; // never asked - see the "unknown" state above
}

// mdbPageCreator_searchUrl
// A MixesDB search for a name. Deliberately NOT makeMixesdbSearchUrl() from the toolkit: that
// one normalizes a MIX TITLE for searching - it takes out brackets, dots and month names, which
// is right for "Trommel.038 (Promo Mix)" and wrong for a category name, where "Trommel.038"
// IS the term. A category name needs nothing done to it.
function mdbPageCreator_searchUrl( name ) {
    return mdbPageCreator_editUrl + "?title=&search=" + encodeURIComponent( name );
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Recent sibling analysis
 *
 * Roadmap step 4 (design and measurements in page_text_learning.md): once the title resolves
 * to an entity category, the newest mix pages IN that category are the series' house style -
 * how its titles write the episode number, whether its pages open with an artwork line, a
 * {{StandardShow*}} template or the dur table, and the styles a genre-locked series always
 * carries. One request fetches those pages WITH their wikitext (generator=categorymembers +
 * prop=revisions), cached per category for the life of the tab like the name lookup's cache.
 *
 * The method is consensus or abstain: a rule only counts when 90% of the fetched pages agree.
 * Newer pages take precedence twice over - only the ~10 newest are fetched at all
 * (conventions change: Slave To The Rhythm renamed its episodes from "Ep.393" to "716"), and
 * when the whole sample disagrees but the 5 newest agree among themselves, that unanimous
 * newest run IS the current convention and wins (mdbPageCreator_recentConsensus). Everything
 * that clears no bar degrades to today's behaviour, so an unknown category, an empty one or a
 * failed request all cost nothing.
 *
 * Bucket categories (mdbPageCreator_bucketCategories - "Promo Mix") are skipped outright:
 * their pages are unrelated mixes, and a "convention" read off them would be noise.
 *
 * What it feeds:
 * - the SUGGESTION: mdbPageCreator_applyRecentToSuggestion() rewrites the entity part of the
 *   title to the siblings' format ("Trommel 251" -> "Trommel.251"), reasoning panel section 5
 * - the PAGE TEXT: the artwork line, the file details body and the style categories
 *   (mdbPageCreator_pageText / _categoryEntries), reasoning panel section 7
 * - the hints bar: the fetched titles replace a match's server-side "recent" list, which is
 *   timestamp-sorted on the server and misses the newest pages (see CLAUDE.md)
 *
 * `Tracklist:` is NEVER learned here - it describes the page's own tracklist, which the
 * Tracklist Editor API decides. page_text_learning.md says why.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// what was fetched and learned per entity category, keyed by the normalized category title:
// { status: "pending"|"done"|"failed", catTitle, pages: [{title, text}] (newest first),
//   titles: [...], text: <page text findings> }. Never reset: what Category:Trommel's pages
// agree on does not change from one player page to the next.
var mdbPageCreator_recentAnalysisCache = {};

// mdbPageCreator_recentConsensus
// The one vote counter every learned signal runs through. values is one vote per sibling page,
// NEWEST FIRST. Returns { value, count, n, recentOnly } or null:
// - fewer than 3 pages decide nothing (a convention needs witnesses)
// - the most common value wins when at least 90% of the pages carry it (ceil - 7 of 8 is not
//   90%, 8 of 8 is)
// - otherwise the 5 newest pages win when they are unanimous: the sample disagreeing while
//   the newest run agrees is what a changed convention looks like, and newer pages take
//   precedence (recentOnly marks such a verdict for the reasoning panel)
function mdbPageCreator_recentConsensus( values ) {
    var n = values.length,
        counts = {},
        top = null,
        i;

    if( n < 3 ) return null;

    for( i = 0; i < n; i++ ) {
        counts[ values[i] ] = ( counts[ values[i] ] || 0 ) + 1;

        if( top === null || counts[ values[i] ] > counts[ top ] ) top = values[i];
    }

    if( counts[ top ] >= Math.ceil( n * 0.9 ) ) {
        return { value: top, count: counts[ top ], n: n, recentOnly: false };
    }

    if( n > 5 ) {
        for( i = 1; i < 5; i++ ) {
            if( values[i] !== values[0] ) return null;
        }

        return { value: values[0], count: 5, n: 5, recentOnly: true };
    }

    return null;
}

// mdbPageCreator_recentAnalysisFor
// What the recent-pages analyses know about one title's ENTITY, resolved fresh off the title
// every time (the field is editable, and an edited entity is a different category). Returns
// { entity, catName, catTitle, match, isPlace, entry, skip }:
// - skip names the reason nothing can be learned ("no-entity" | "bucket" | "pending-lookup" |
//   "unknown" | "artist" | "empty"), "" when analysis is possible
// - entry is the category's cache entry when one exists (fetched or in flight) - resolving
//   never STARTS a fetch, that is mdbPageCreator_recentEnsureFor()
function mdbPageCreator_recentAnalysisFor( title ) {
    var read = mdbTitle_titleCategories( title ),
        info = { entity: read.entity || "", catName: "", catTitle: "", match: null, isPlace: false, entry: null, skip: "" },
        catName = mdbPageCreator_entityCategoryFor( title, read.entity );

    if( !info.entity || !catName ) {
        info.skip = "no-entity";
        return info;
    }

    info.catName = catName;

    if( mdbPageCreator_isBucketCategory( catName ) ) {
        info.catTitle = catName;
        info.skip = "bucket";
        return info;
    }

    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        // the entity reading first: "fabric" the venue is the entity even where "Fabric" the
        // artist answers too - only a name the wiki knows as NOTHING else falls to the artist
        // match, which is then a skip
        match = mdbTitle_knownMatch( cache, catName, [ "podcast", "show", "radio", "internet radio", "internetradio", "venue", "event", "recordlabel", "record label" ] ) ||
                mdbTitle_knownMatch( cache, catName, null );

    if( !match ) {
        info.skip = mdbPageCreator_categoryUnanswered( catName ) ? "pending-lookup" : "unknown";
        return info;
    }

    info.match = match;
    info.catTitle = match.title || catName;
    info.isPlace = /^(venue|event)$/.test( String( match.type || "" ) );

    if( String( match.type || "" ) === "artist" ) {
        // an artist category holds that artist's sets of every kind - there is no series
        // format in it, and the page text signals would average club nights with podcasts
        info.skip = "artist";
        return info;
    }

    if( mdbPageCreator_isBucketCategory( info.catTitle ) ) {
        info.skip = "bucket";
        return info;
    }

    if( !match.mixes ) {
        info.skip = "empty";
        return info;
    }

    info.entry = mdbPageCreator_recentAnalysisCache[ mdbTitle_normalizeCompare( info.catTitle ) ] || null;

    return info;
}

// mdbPageCreator_recentEnsureFor
// Resolves like mdbPageCreator_recentAnalysisFor and STARTS the category's page fetch where
// none ran yet. Called wherever a title settles: the suggestion's lookup callback and the
// debounced edit path - never from a render, which must stay free of side effects.
function mdbPageCreator_recentEnsureFor( title ) {
    var info = mdbPageCreator_recentAnalysisFor( title );

    if( info.skip || !info.catTitle ) return info;

    var key = mdbTitle_normalizeCompare( info.catTitle );

    if( !mdbPageCreator_recentAnalysisCache[ key ] ) {
        mdbPageCreator_recentAnalysisCache[ key ] = {
            status: "pending",
            catTitle: info.catTitle,
            titles: [],
            pages: [],
            text: null
        };

        mdbPageCreator_recentFetch( info.catTitle, key );
    }

    info.entry = mdbPageCreator_recentAnalysisCache[ key ];

    return info;
}

// mdbPageCreator_recentFetch
// The one request behind everything learned: the ~10 newest pages of the category WITH their
// wikitext. generator=categorymembers with gcmsort=sortkey&gcmdir=desc - a mix page title
// starts with its date, so the sortkey IS the date, and it honours an editor's manual sortkey
// on top. NEVER gcmsort=timestamp, which sorts by when a page was (re)filed into the category
// and floats every re-saved old page to the top (see CLAUDE.md and mixesdb_api_request.md §6).
function mdbPageCreator_recentFetch( catTitle, key ) {
    logVar( "mdbPageCreator_recentFetch", catTitle );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: {
            action: "query",
            format: "json",
            formatversion: 2,
            origin: "*",
            generator: "categorymembers",
            gcmtitle: "Category:" + catTitle,
            gcmnamespace: 0, // without it the answer is half File: pages
            gcmsort: "sortkey",
            gcmdir: "desc",
            gcmlimit: 10,
            prop: "revisions",
            rvprop: "content",
            rvslots: "main"
        },
        success: function( data ) {
            var entry = mdbPageCreator_recentAnalysisCache[ key ],
                pages = ( data && data.query && data.query.pages ) || [],
                got = [],
                i, rev, slot;

            for( i = 0; i < pages.length; i++ ) {
                if( !pages[i].title ) continue;

                rev = ( pages[i].revisions && pages[i].revisions[0] ) || null;
                slot = rev && rev.slots && rev.slots.main ? rev.slots.main : null;

                got.push( { title: pages[i].title, text: String( ( slot && slot.content ) || "" ) } );
            }

            // the generator returns its pages unordered - titles start with the date, so a
            // lexical sort IS date order, newest first (same trick as mdbPageCreator_usedCatRecent)
            got.sort( function( a, b ) { return a.title < b.title ? 1 : a.title > b.title ? -1 : 0; } );

            entry.status = "done";
            entry.pages = got;
            entry.titles = got.map( function( p ) { return p.title; } );
            entry.text = mdbPageCreator_recentPageTextFindings( catTitle, got );

            logVar( "mdbPageCreator_recentFetch: " + catTitle, entry.titles.length + " pages" );

            // the hints bar's list for this category rides along: sortkey order really holds
            // the newest pages, which the lookup answer's own timestamp-sorted "recent" misses
            var match = ( typeof mdbTitle_categoryCache !== "undefined" )
                ? mdbTitle_knownMatch( mdbTitle_categoryCache, catTitle, null )
                : null;

            if( match && match.title === catTitle ) {
                match.recent = entry.titles.slice();
                match.recentPending = false;
                match.recentFailed = false;
            }

            mdbPageCreator_recentSettled();
        },
        error: function( xhr, status ) {
            log( "mdbPageCreator_recentFetch FAILED (" + status + ") for " + catTitle );

            mdbPageCreator_recentAnalysisCache[ key ].status = "failed";

            mdbPageCreator_recentSettled();
        }
    });
}

// mdbPageCreator_recentSettled
// The one settle path for success and failure. No page-generation bookkeeping on purpose: the
// refinement resolves the CURRENT title's entity itself, so an answer landing after the reader
// navigated on refines nothing (the categories differ), and the render is a no-op without a row.
function mdbPageCreator_recentSettled() {
    mdbPageCreator_applyRecentToSuggestion();
    mdbPageCreator_render();
}

// mdbPageCreator_recentNameVariants
// The spellings under which the entity may stand in a sibling title, most canonical first: the
// wiki's category title, the redirect that found it, and the name OUR title writes - each
// without a "(...)" qualifier ("Autonomic (Show)" stands in titles as "Autonomic"). The
// variants matter: Category:Truancy Volumes files pages titled "... Truancy Volume 291", so
// the category title alone would match nothing.
function mdbPageCreator_recentNameVariants( info ) {
    var raw = [ info.catTitle, ( info.match && info.match.matchedTitle ) || "", info.catName ],
        seen = {},
        names = [],
        i, bare, key;

    for( i = 0; i < raw.length; i++ ) {
        bare = String( raw[i] || "" ).replace( /\s*\([^()]*\)\s*$/, "" ).trim();
        key = mdbTitle_normalizeCompare( bare );

        if( !key || seen[ key ] ) continue;

        seen[ key ] = true;
        names.push( bare );
    }

    return names;
}

// mdbPageCreator_recentEntitySuffix
// Classifies what one sibling title writes BEHIND the entity name - the episode format vote.
// Exactly one digit run counts (".234", " 498", " (RA.1051)", " Episode 72", "" for none);
// anything else is "(other)", which supports no rule but keeps standing in the denominator -
// a live recording's "(Essential Mix, 2026-06-27)" tail is exactly the exception the 90% bar
// is measured against. The key doubles as the vote value; pre/N/post is how it is applied and
// shown, with the digits kept for the padding question.
function mdbPageCreator_recentEntitySuffix( suffix ) {
    suffix = String( suffix || "" ).replace( /\s+$/, "" );

    if( !suffix ) return { key: "", pre: "", post: "", digits: "" };

    // an entity tail is short - anything longer is a second half of the title, not a format
    if( suffix.length > 20 ) return { key: "(other)" };

    // the divider between pre and post is a literal NUL, like mdbPageCreator_reasoningStepKey:
    // the pre is usually itself a space, so any printable divider could collide with real text
    var m = /^([^0-9]*)(\d+)([^0-9]*)$/.exec( suffix );

    if( !m ) return { key: "(other)" };

    return { key: m[1] + " " + m[3], pre: m[1], post: m[3], digits: m[2] };
}

// mdbPageCreator_recentTitleFindings
// How the newest pages of the category write their titles: the name's spelling as the titles
// write it, the episode number format behind it (a series), or the city behind the place (a
// venue/event). Computed off the cached titles at every use rather than stored - it depends on
// the name variants of the CURRENT title, and ten regex runs cost nothing.
// Returns { n, matched, written, format, city }:
// - written  consensus over the matched name text ("RA Podcast" on every page)
// - format   { pre, post, none, pad, count, n, recentOnly, display } or null - the winning
//            suffix template; pad > 0 means the digits are zero-padded to that width
// - city     consensus over the ", City" behind a place, or null
function mdbPageCreator_recentTitleFindings( info ) {
    var titles = ( info.entry && info.entry.titles ) || [],
        names = mdbPageCreator_recentNameVariants( info ),
        writtenVotes = [],
        formatVotes = [],
        cityVotes = [],
        digitsByKey = {},
        out = { n: titles.length, matched: 0, written: null, format: null, city: null },
        i, j, rest, m, re, suffix;

    for( i = 0; i < titles.length; i++ ) {
        // our own markers never join a format - a sibling that happens to be a promo mix
        // still writes the series name and number the series' way
        rest = mdbTitle_dropMarkers( titles[i] ).replace( /^\s*\d{4}(?:-\d{2}){0,2}\s*-\s*/, "" );
        m = null;

        for( j = 0; j < names.length && !m; j++ ) {
            // loose inner spaces ("FrenzyPodcast"), never glued into a longer word on either
            // side - the same guards the parser's name matching uses
            re = new RegExp( "(^|[^0-9A-Za-z])(" + mdbTitle_escapeReLooseSpaces( names[j] ) + ")(?![0-9A-Za-z])", "i" );
            m = re.exec( rest );
        }

        if( !m ) {
            // the page does not write the name at all - it counts AGAINST every rule, since a
            // convention 90% of pages carry has to be visible on 90% of pages
            writtenVotes.push( "(no match)" );
            formatVotes.push( "(no match)" );
            cityVotes.push( "(no match)" );
            continue;
        }

        out.matched++;
        writtenVotes.push( m[2] );

        var after = rest.slice( m.index + m[0].length );

        if( info.isPlace ) {
            // "@ Ritter Butzke, Berlin" - the city is whatever one comma puts behind the place
            var cm = /^,\s*([^,()@]+?)\s*$/.exec( after.replace( /\s+$/, "" ) );

            cityVotes.push( cm ? cm[1] : ( after.replace( /\s+$/, "" ) === "" ? "(none)" : "(other)" ) );
        } else {
            suffix = mdbPageCreator_recentEntitySuffix( after );
            formatVotes.push( suffix.key );

            if( suffix.digits ) {
                ( digitsByKey[ suffix.key ] = digitsByKey[ suffix.key ] || [] ).push( suffix.digits );
            }
        }
    }

    var written = mdbPageCreator_recentConsensus( writtenVotes );

    if( written && written.value !== "(no match)" ) out.written = written;

    if( info.isPlace ) {
        var city = mdbPageCreator_recentConsensus( cityVotes );

        if( city && city.value !== "(none)" && city.value !== "(other)" && city.value !== "(no match)" ) {
            out.city = city;
        }

        return out;
    }

    var format = mdbPageCreator_recentConsensus( formatVotes );

    if( !format || format.value === "(other)" || format.value === "(no match)" ) return out;

    if( format.value === "" ) {
        out.format = { none: true, pre: "", post: "", pad: 0,
                       count: format.count, n: format.n, recentOnly: format.recentOnly,
                       display: "no episode number" };
        return out;
    }

    var parts = format.value.split( " " ),
        digits = digitsByKey[ format.value ] || [],
        pad = 0,
        zeroLed = false;

    for( i = 0; i < digits.length; i++ ) {
        if( /^0\d/.test( digits[i] ) ) zeroLed = true;
        if( digits[i].length !== digits[0].length ) { zeroLed = false; break; }
    }

    // zero-padding is only a convention when every number has the same width AND at least one
    // really leads with a zero - "251", "250", "249" are three digits by coincidence
    if( zeroLed ) pad = digits[0].length;

    out.format = { none: false, pre: parts[0], post: parts[1] || "", pad: pad,
                   count: format.count, n: format.n, recentOnly: format.recentOnly,
                   display: parts[0] + "N" + ( parts[1] || "" ) };

    return out;
}

// mdbPageCreator_padNumber
// A number written to the width the siblings pad to - from the bare value, so a source's own
// "07" and a convention of three digits meet at "007", and no padding means "7".
function mdbPageCreator_padNumber( digits, width ) {
    var s = String( digits ).replace( /^0+(?=\d)/, "" );

    while( s.length < width ) s = "0" + s;

    return s;
}

// mdbPageCreator_refineTitleFromRecent
// The title with its entity part rewritten to the recent pages' format, plus the step rows
// saying what changed and why. Never invents: a spelling is only adopted where it is a
// RESPELLING of the name our title already has (the categoryEntry rule - a really different
// name is knowledge, not a spelling), an episode format only where the source gave a number
// (or the convention is to carry none), the city only where the place stands last with none.
// The rewritten entity has to file under the same category it was resolved by, or everything
// is dropped - a format that changes the category was a misread, never a refinement.
function mdbPageCreator_refineTitleFromRecent( title, info ) {
    var out = { title: title, changes: [] },
        f = mdbPageCreator_recentTitleFindings( info ),
        groups = String( title || "" ).split( " - " );

    if( info.isPlace ) {
        // "YYYY-MM-DD - Artist @ Venue" - the city the siblings agree on, appended only where
        // the place group ends bare: what the source page put behind the venue stays its own
        if( f.city && groups.length === 2 && groups[1].indexOf( " @ " ) !== -1 ) {
            var names = mdbPageCreator_recentNameVariants( info ),
                endsWith = false,
                i;

            for( i = 0; i < names.length && !endsWith; i++ ) {
                endsWith = new RegExp( "(^|[^0-9A-Za-z])" + mdbTitle_escapeReLooseSpaces( names[i] ) + "\\s*$", "i" ).test( groups[1] );
            }

            if( endsWith ) {
                out.title = title + ", " + f.city.value;
                out.changes.push( {
                    label: "City from the recent pages",
                    detail: title + " -> " + out.title
                } );
            }
        }

        return out;
    }

    if( groups.length !== 3 ) return out;

    var entityGroup = groups[2],
        base = mdbPageCreator_entityCategory( entityGroup ),
        digitsMatch = /(\d+)\s*\)?\s*$/.exec( entityGroup ),
        ourDigits = digitsMatch ? digitsMatch[1] : "",
        newBase = base,
        newEntity = "";

    if( !base ) return out;

    // the spelling the titles agree on - only ever name-for-name (case, blanks, punctuation)
    if( f.written && f.written.value !== base &&
        mdbTitle_normalizeCompare( f.written.value ) === mdbTitle_normalizeCompare( base ) ) {
        newBase = f.written.value;
    }

    if( f.format ) {
        if( f.format.none ) {
            newEntity = newBase;
        } else if( ourDigits ) {
            newEntity = newBase + f.format.pre + mdbPageCreator_padNumber( ourDigits, f.format.pad ) + f.format.post;
        } else {
            // the series numbers its episodes but the source title gave none - a number is
            // nothing to invent, so only the spelling may still apply below
            newEntity = "";
        }
    }

    if( !newEntity && newBase !== base ) {
        // no format verdict (or none appliable): respell the name inside the entity as it
        // stands, keeping whatever tail it has
        newEntity = entityGroup.replace(
            new RegExp( "(^|[^0-9A-Za-z])" + mdbTitle_escapeReLooseSpaces( base ) + "(?![0-9A-Za-z])", "i" ),
            function( whole, lead ) { return lead + newBase; }
        );
    }

    if( !newEntity || newEntity === entityGroup ) return out;

    // the safety net: the refined entity must still file under the resolved category
    if( mdbTitle_normalizeCompare( mdbPageCreator_entityCategory( newEntity ) ) !== mdbTitle_normalizeCompare( base ) ) {
        log( "mdbPageCreator_refineTitleFromRecent: \"" + newEntity + "\" would change the category - dropped." );
        return out;
    }

    var label = "Name as the recent pages write it";

    if( f.format && ourDigits ) {
        label = f.format.none ? "No episode number on the recent pages"
                              : "Episode format from the recent pages";
    }

    out.title = groups[0] + " - " + groups[1] + " - " + newEntity;
    out.changes.push( { label: label, detail: entityGroup + " -> " + newEntity } );

    return out;
}

// mdbPageCreator_applyRecentToSuggestion
// The third title stage, after the two builds: the SUGGESTION rewritten to the entity's own
// recent format. Only ever the suggestion - a title the reader edited is theirs, the analysis
// then still renders in the panel but rewrites nothing. Resolves the current suggestion's
// entity itself, so the fetch's settle path can call it blind (an answer landing after a
// navigation finds a different entity and applies nothing). Callers render.
function mdbPageCreator_applyRecentToSuggestion() {
    if( !mdbPageCreator_title ) return;

    var info = mdbPageCreator_recentEnsureFor( mdbPageCreator_title );

    mdbPageCreator_titlePreRecent = mdbPageCreator_title;
    mdbPageCreator_titlePostRecent = "";
    mdbPageCreator_recentTitleChanges = [];

    if( info.skip || !info.entry || info.entry.status !== "done" ) return;

    var refined = mdbPageCreator_refineTitleFromRecent( mdbPageCreator_title, info );

    mdbPageCreator_titlePostRecent = refined.title;
    mdbPageCreator_recentTitleChanges = refined.changes;

    if( refined.title === mdbPageCreator_title ) return;

    var input = $("#mdb-pageCreator-title");

    if( input.length && input.data( "mdb-edited" ) ) {
        log( "mdbPageCreator_applyRecentToSuggestion: the title was edited - not rewritten." );
        return;
    }

    logVar( "mdbPageCreator_applyRecentToSuggestion: the recent pages knew better",
            mdbPageCreator_title + "  ->  " + refined.title );

    mdbPageCreator_title = refined.title;
}

// mdbPageCreator_recentLearnedStyles
// The style categories the entity's recent pages settled for one title, or [] - what
// mdbPageCreator_categoryEntries() fills the style slots with when the site suggested none.
function mdbPageCreator_recentLearnedStyles( title ) {
    var info = mdbPageCreator_recentAnalysisFor( title ),
        findings = ( info.entry && info.entry.status === "done" ) ? info.entry.text : null;

    return ( findings && findings.styles && findings.styles.learned ) || [];
}

// mdbPageCreator_recentBodyChoice
// The file details body the findings pick: a {{StandardShow*}} template name, or null for
// today's dur table. The template only stands where the player duration ROUGHLY fits its
// stated length (±30%) - a 40 minute file on a 2h show is a hint the category was misread,
// and then the table with the real duration is the safer page. An unknown duration trusts
// the siblings: the template says more than a table with an empty dur cell would.
function mdbPageCreator_recentBodyChoice( findings ) {
    var body = findings && findings.body;

    if( !body || !/^StandardShow/.test( String( body.value || "" ) ) ) return null;

    var minutes = {
            StandardShow30min: 30,
            StandardShow1h: 60,
            StandardShow90min: 90,
            StandardShow2h: 120,
            StandardShow3h: 180,
            StandardShow4h: 240
        }[ body.value ];

    if( minutes && mdbPageCreator_durationMs ) {
        var ratio = mdbPageCreator_durationMs / ( minutes * 60000 );

        if( ratio < 0.7 || ratio > 1.3 ) return null;
    }

    return body.value;
}

// mdbPageCreator_recentPageTextFindings
// What the fetched pages' WIKITEXT agrees on - computed once at fetch time, since unlike the
// title findings nothing here depends on the current title. Three signals, each consensus or
// abstain (page_text_learning.md says why their thresholds are one and the same 90% now):
// - image:  does the page open with an artwork named after the page itself? ("same" vs
//           "other"/"none" - a venue's artwork is named after the venue, which no new page
//           can predict). imageExt is the extension those artworks actually use.
// - body:   {{StandardShow*}} vs the dur/MB/kbps table ("none" can win the vote, but wins
//           nothing - mdbPageCreator_recentBodyChoice only acts on a template)
// - styles: every category that is not the year, the entity, an artist of that page's title,
//           Promo Mix or a "Tracklist:" filing - per style a yes/no vote across the pages,
//           learned at the same 90%, at most two (the shape has two style lines)
function mdbPageCreator_recentPageTextFindings( catTitle, pages ) {
    var n = pages.length,
        imageVotes = [],
        exts = [],
        bodyVotes = [],
        styleVotes = {},
        styleNames = {},
        styleTally = {},
        catKey = mdbTitle_normalizeCompare( catTitle ),
        i, j, text, m;

    for( i = 0; i < n; i++ ) {
        text = pages[i].text;

        // the FIRST image is the lead artwork - the 180px tracklist screenshots further down
        // are the editor's later additions
        m = /\[\[\s*(?:File|Image)\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/i.exec( text );

        if( !m ) {
            imageVotes.push( "none" );
        } else {
            var fname = m[1].replace( /_/g, " " ).trim(),
                extMatch = /\.([A-Za-z0-9]+)$/.exec( fname ),
                stem = extMatch ? fname.slice( 0, fname.length - extMatch[0].length ) : fname;

            if( stem.toLowerCase() === pages[i].title.replace( /_/g, " " ).trim().toLowerCase() ) {
                imageVotes.push( "same" );
                exts.push( extMatch && extMatch[1].toLowerCase() === "png" ? "png" : "jpg" );
            } else {
                imageVotes.push( "other" );
            }
        }

        m = /\{\{\s*(StandardShow[^}|]*?)\s*\}\}/.exec( text );

        if( m ) {
            bodyVotes.push( m[1] );
        } else if( /\{\|\s*\{\{\s*NormalTableFormat\s*\}\}/.test( text ) || /^\s*!\s*dur\b/m.test( text ) ) {
            bodyVotes.push( "table" );
        } else {
            bodyVotes.push( "none" );
        }

        // the page's own title says which categories describe the PAGE rather than the music
        var own = mdbTitle_titleCategories( pages[i].title ),
            skip = {},
            catRe = /\[\[\s*Category\s*:\s*([^\]|]+)/g,
            seenHere = {},
            cm, name, key;

        skip[ catKey ] = true;
        skip[ mdbTitle_normalizeCompare( own.entity ) ] = true;
        skip[ mdbTitle_normalizeCompare( "Promo Mix" ) ] = true;

        for( j = 0; j < own.artists.length; j++ ) {
            skip[ mdbTitle_normalizeCompare( own.artists[j] ) ] = true;
        }

        while( ( cm = catRe.exec( text ) ) ) {
            name = cm[1].trim();
            key = mdbTitle_normalizeCompare( name );

            if( !key || seenHere[ key ] ) continue;
            if( skip[ key ] || /^\d{4}$/.test( name ) || /^Tracklist\s*:/i.test( name ) ) continue;

            seenHere[ key ] = true;

            if( !styleVotes[ key ] ) {
                styleVotes[ key ] = [];
                styleNames[ key ] = name;
                styleTally[ key ] = 0;

                // pages already counted voted "no" on a style first seen now
                for( j = 0; j < i; j++ ) styleVotes[ key ].push( "no" );
            }

            styleTally[ key ]++;
        }

        for( key in styleVotes ) {
            if( !Object.prototype.hasOwnProperty.call( styleVotes, key ) ) continue;

            if( styleVotes[ key ].length === i ) styleVotes[ key ].push( seenHere[ key ] ? "yes" : "no" );
        }
    }

    var image = mdbPageCreator_recentConsensus( imageVotes ),
        body = mdbPageCreator_recentConsensus( bodyVotes ),
        ext = "jpg",
        png = 0,
        learned = [],
        tally = [],
        key;

    for( i = 0; i < exts.length; i++ ) {
        if( exts[i] === "png" ) png++;
    }

    // the majority extension among the lead artworks; a tie stays .jpg, the wiki's uploader
    // rewrites a wrong one anyway (page_text_learning.md)
    if( png * 2 > exts.length ) ext = "png";

    for( key in styleVotes ) {
        if( !Object.prototype.hasOwnProperty.call( styleVotes, key ) ) continue;

        tally.push( { name: styleNames[ key ], count: styleTally[ key ], n: n } );

        var vote = mdbPageCreator_recentConsensus( styleVotes[ key ] );

        if( vote && vote.value === "yes" ) {
            learned.push( { name: styleNames[ key ], count: vote.count, n: vote.n, recentOnly: vote.recentOnly } );
        }
    }

    learned.sort( function( a, b ) { return b.count - a.count; } );
    tally.sort( function( a, b ) { return b.count - a.count; } );

    return {
        n: n,
        image: image,
        imageExt: ext,
        body: body,
        styles: { learned: learned.slice( 0, 2 ), tally: tally }
    };
}


/*
 * The MixesDB modal: on a desktop-wide window, a plain left click on any MixesDB link in the
 * "Used categories" chips opens the page in an overlay ON this page instead of a tab - the
 * reader is mid-judgement on a title, and "is this the right category?" or "does this page
 * already exist?" is a five-second look, not a tab worth keeping. Everything that ASKS for a
 * tab still gets one: cmd/ctrl/shift/alt and middle clicks fall through to the links' own
 * href/target (they stay real links), and so does a narrow window, where the framed page
 * would be smaller than a tab. MixesDB sends no X-Frame-Options and neither site's CSP
 * forbids the frame (verified 2026-08-18), and the header's "Open on MixesDB" link is the
 * way out where a quick look turns into real reading.
 */
var mdbPageCreator_modalMinWidth = 1024,
    // every MixesDB page already prefetched, by URL - the bar rebuilds constantly and the
    // browser must not be told twice. Never reset: the prefetched bytes do not expire with
    // a navigation any more than the category cache does.
    mdbPageCreator_prefetched = {};

// mdbPageCreator_prefetchHintLinks
// Warms the browser's cache for the MixesDB pages the bar's links can reach RIGHT NOW - the
// category pages, a red name's search, an open chip's recent mix pages - so the modal paints
// at once instead of loading on the click. Only on a modal-wide window, and not as stinginess:
// the prefetch cache is partitioned by the top-level site, so what these warm is OUR iframe -
// a tab opened on a narrow window would not touch it. A closed chip's list is skipped by
// STRUCTURE, not :visible - the first render fills the bar while the row is still detached,
// where nothing computes as visible - and prefetched later, by the toggle that opens it.
function mdbPageCreator_prefetchHintLinks( scope ) {
    if( $(window).width() < mdbPageCreator_modalMinWidth ) return;

    scope.find( "a[href]" ).each( function() {
        var inRecent = $(this).closest( ".mdb-pageCreator-usedCat-recent" );

        if( inRecent.length && !inRecent.closest( ".mdb-pageCreator-usedCat" ).hasClass( "mdb-pageCreator-usedCat-open" ) ) return;

        mdbPageCreator_prefetch( this.href );
    });
}

// mdbPageCreator_prefetch
// One <link rel="prefetch"> per page, appended to the head and left there - removing it can
// cancel the fetch. No "as": a plain prefetch is what browsers reuse for a navigation, and
// the modal's iframe navigates.
function mdbPageCreator_prefetch( url ) {
    if( !url || mdbPageCreator_prefetched[ url ] ) return;

    mdbPageCreator_prefetched[ url ] = true;

    $("<link>").attr( "rel", "prefetch" ).attr( "href", url ).appendTo( "head" );
}

// Bound once, on the document, so it survives every rebuild of the bar; the width is tested
// INSIDE the handler because the window resizes. Only links WITH an href: the "N mixes"
// toggle is an <a> without one.
$(document).on( "click", "#mdb-pageCreator-usedCats a[href]", function( e ) {
    if( e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.which !== 1 ) return;
    if( $(window).width() < mdbPageCreator_modalMinWidth ) return;

    e.preventDefault();
    mdbPageCreator_modalOpen( this.href, $(this).attr( "data-mdb-modal-label" ) || $(this).text() );
});

// mdbPageCreator_modalOpen
// One modal at a time - opening replaces whatever is up. The overlay is class mdb-element,
// so the shared navigation cleanup (onUrlChange in global.js) takes it down with the row.
function mdbPageCreator_modalOpen( url, label ) {
    logVar( "mdbPageCreator_modalOpen", url );

    mdbPageCreator_modalClose();

    var overlay = $("<div>")
        .attr( "id", "mdb-pageCreator-modal" )
        .addClass( "mdb-element" )
        .on( "click", function( e ) {
            // the dark backdrop closes, the box does not - e.target tells them apart
            if( e.target === this ) mdbPageCreator_modalClose();
        });

    overlay.append(
        $("<div>").addClass( "mdb-pageCreator-modal-box" ).append(
            $("<div>").addClass( "mdb-pageCreator-modal-head" ).append(
                $("<span>").addClass( "mdb-pageCreator-modal-title" ).text( label ),
                $("<a>")
                    .addClass( "mdb-pageCreator-modal-ext" )
                    .attr( "href", url )
                    .attr( "target", "_blank" )
                    .attr( "title", "Open this page as its own tab" )
                    .text( "Open on MixesDB" ),
                $("<button>")
                    .addClass( "mdb-pageCreator-modal-close" )
                    .attr( "type", "button" )
                    .attr( "title", "Close (Esc)" )
                    .text( "×" )
                    .on( "click", mdbPageCreator_modalClose )
            ),
            $("<iframe>").addClass( "mdb-pageCreator-modal-frame" ).attr( "src", url )
        )
    );

    $("body").append( overlay );

    $(document).on( "keydown.mdbPageCreatorModal", function( e ) {
        if( e.key === "Escape" ) mdbPageCreator_modalClose();
    });
}

// mdbPageCreator_modalClose
// Removal is the whole close - the modal keeps no state. The namespaced Esc handler goes
// with it, so a page with no modal up listens for nothing.
function mdbPageCreator_modalClose() {
    $(document).off( "keydown.mdbPageCreatorModal" );
    $("#mdb-pageCreator-modal").remove();
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The report box
 *
 * "Report" behind the score opens a textarea under the row, holding the case as it is written
 * when a wrong title is reported: the three values the site handed over, what the suggestion made
 * of them, and empty lines for the title and categories it SHOULD have produced.
 *
 * It exists because the report, not the fix, was the slow part: the player title is on screen,
 * but the channel name is the site API's username and not the name in the URL ("discoanon" ->
 * "Discoholics Anonymous"), and the upload date is nowhere near the player either. Both had to be
 * asked back for, one round trip per report. Everything in the box is already in this file.
 *
 * The two empty "Expected" blocks are the point of it - they are the answer only the reporter has
 * - which is why anything typed into the box stops it from ever being refilled.
 *
 * Above the box sits the reasoning panel - its own section further down - which explains how
 * the suggestion was built, so the "Mistake / learning" line can name the step that went wrong.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// mdbPageCreator_toggleReport
// Built on the first click rather than with the row: most rows are never reported, and the box is
// the one part of this that costs layout.
function mdbPageCreator_toggleReport( wrapper ) {
    logFunc( "mdbPageCreator_toggleReport" );

    var box = wrapper.find( "#mdb-pageCreator-report-box" );

    mdbPageCreator_reportOpen = !mdbPageCreator_reportOpen;

    if( !mdbPageCreator_reportOpen ) {
        box.hide();
        wrapper.find( "#mdb-pageCreator-reasoning" ).hide();
        return;
    }

    if( !box.length ) {
        box = $("<textarea>")
            .attr( "id", "mdb-pageCreator-report-box" )
            .attr( "spellcheck", "false" );

        // Only a REAL keystroke marks the box as the reporter's - the fill below sets .val()
        // itself and must not count as writing in it.
        box.on( "input", function() {
            box.data( "mdb-edited", true );
            mdbPageCreator_growReport( box );
        });

        // At the end of the row, which is where it stays: the wrapper is a grid and both the
        // panel and the box span all its columns, so each forms a full-width line of its own
        // under everything else (see page_creator.css). The reasoning panel goes in FIRST -
        // document order is vertical order here - so it sits above the textarea.
        wrapper.append( $("<div>").attr( "id", "mdb-pageCreator-reasoning" ), box );
    }

    box.show();
    wrapper.find( "#mdb-pageCreator-reasoning" ).show();
    mdbPageCreator_fillReport( wrapper );
    mdbPageCreator_renderReasoning( wrapper );

    // The current title's names may not all be in the cache yet (the box can be opened before
    // the lookup answered, and a corrected title names new ones) - the same delayed, cache-aware
    // lookup a title edit gets.
    mdbPageCreator_queueCategoryUpdate();

    // After show(): a hidden textarea measures 0, so the first grow has to happen once the box
    // is on the page. fillReport() grows it too, but it does nothing on a box already written in.
    mdbPageCreator_growReport( box );
}

// mdbPageCreator_growReport
// The box is exactly as tall as its text - it is read as a whole and copied as a whole, so a
// scrollbar in it is pure friction - and grows as the "Mistake / learning" and "Expected" lines
// are typed.
//
// Measured rather than counted from the newlines: a long player title wraps, and a wrapped line
// takes a row on screen without being one in the text. Height reset to "auto" first, or
// scrollHeight would only ever report the height the box already has and the box could never
// shrink again.
function mdbPageCreator_growReport( box ) {
    var el = box[0];

    if( !el ) return;

    el.style.height = "auto";

    // scrollHeight is the CONTENT box, and page_creator.css sets border-box sizing, so the
    // borders have to be added back on top - otherwise the box is 2px short and scrolls by
    // exactly that. offsetHeight - clientHeight IS those borders, whatever they are set to.
    el.style.height = ( el.scrollHeight + el.offsetHeight - el.clientHeight ) + "px";
}

// mdbPageCreator_fillReport
// Rewritten whenever the title changes - by the MixesDB lookup's second thoughts or by the
// reporter correcting the field - but never over anything typed into the box: losing a written
// "Expected title" to a keystroke in the field above is the one thing this must not do.
function mdbPageCreator_fillReport( wrapper ) {
    var box = wrapper.find( "#mdb-pageCreator-report-box" );

    if( !box.length || !mdbPageCreator_reportOpen || box.data( "mdb-edited" ) ) return;

    box.val( mdbPageCreator_reportText( $.trim( wrapper.find( "#mdb-pageCreator-title" ).val() ) ) );

    // a refined suggestion can wrap where the first one did not
    mdbPageCreator_growReport( box );
}

// mdbPageCreator_reportText
// The categories are read off the TITLE, not off what the parser had in mind - the same way the
// created page reads them - so a title corrected in the field reports the categories it would
// really be filed under.
function mdbPageCreator_reportText( title ) {
    var read = mdbTitle_titleCategories( title ),
        // one line per artist, since every joiner between two names is another category ("See
        // Bastian b2b Afin" is two). A title with none still gets the empty line, so the shape
        // of the report never changes.
        artists = read.artists.length ? read.artists : [ "" ],
        label = mdbPageCreator_sourceLabel || window.scriptName || "Player",
        lines = [],
        i;

    // First line, because it is the one thing that lets a report be looked at again - and the
    // player URL rather than location.href: the site hands over the clean page URL there, while
    // location.href carries tracking parameters and, inside a framed layout, is not even this
    // track's URL.
    lines.push( "-> " + label + " URL: " + mdbPageCreator_playerUrl );
    lines.push( "-> " + label + " title: " + mdbPageCreator_sourceTitle );
    lines.push( "–> Channel name: " + mdbPageCreator_sourceChannel );
    lines.push( "-> " + label + " date: " + mdbPageCreator_reportDay( mdbPageCreator_sourceDate ) );
    lines.push( "-> Created title: " + title );
    lines.push( "–> Confidence score: " + mdbPageCreator_confidencePercent + "%" );

    for( i = 0; i < artists.length; i++ ) {
        lines.push( "–> Artist category: " + artists[i] );
    }

    lines.push( "–> Entity category: " + mdbPageCreator_entityCategoryFor( title, read.entity ) );
    lines.push( "-> Mistake / learning: " );
    lines.push( "-> Expected title: " );
    lines.push( "–> Expected artist category: " );
    lines.push( "–> Expected entity category: " );

    return lines.join( "\n" );
}

// mdbPageCreator_reportDay
// The upload/release date as the plain YYYY-MM-DD a report is written in. The sites hand it over
// in whatever their API returns ("2026-08-12T10:00:00Z", "2026/08/12 10:00:00 +0000"), so an ISO
// day is taken as it stands and Date reads the rest. UTC on the way out, not local: these are
// UTC timestamps, and a local reading moves the day for anyone east or west of it.
function mdbPageCreator_reportDay( date ) {
    var text = String( date || "" ).trim(),
        iso = /^(\d{4}-\d{2}-\d{2})/.exec( text );

    if( iso ) return iso[1];
    if( !text ) return "";

    var parsed = new Date( text );

    // An unparsable date is handed over as it came in rather than dropped - the report is read
    // by a person, and the raw string still says more than an empty line.
    return isNaN( parsed.getTime() ) ? text : parsed.toISOString().slice( 0, 10 );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The reasoning panel
 *
 * Opens with the report box, above it: the sections that say how the suggestion was built, in
 * the order the build really ran - 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7.
 *
 *   (1) the chunks the player title split into - the lookup's raw material
 *   (2) what the FIRST parse fixed and removed, before the wiki was asked anything, closing
 *       with the title it built as one grey chip - a candidate until the answers are in
 *   (3) the one lookup request - built from the chunks of 1 plus the channel, and NOT from
 *       the cleaned title of 2, which is why its names are not that title's words
 *   (4) the SECOND parse: the same cleanup re-run with the answers in hand, listing only
 *       what they changed and closing with its title as one chip, still grey - one title
 *       stage remains
 *   (5) the recent-pages TITLE analysis: what the entity category's newest pages settled
 *       about the format and what that rewrote, closing with the final title as one green
 *       chip - the run the title on screen comes from
 *   (6) the categories the created page would be filed under, each annotated with what the
 *       lookup cache says about it - exactly the check a reporter otherwise runs by hand
 *   (7) the recent-pages PAGE TEXT analysis: what the same pages' wikitext settles about the
 *       page the "Create" link writes - lead artwork, file details body, styles
 *
 * 2, 4 and 5 are the title-shaping stages - 2 and 4 ONE stage run twice on either side of the
 * lookup, 5 the format read off the wiki's own pages - said by their shared
 * accent, the copy button's orange, against the grey of the raw-material sections 1/3, the
 * green of 6 and the citrus of 7 (the same recent pages, about the PAGE rather than the
 * title). The chips are coloured the same way, by STATE and not by type: grey while
 * a name or title is only a candidate, red for what was ignored, green for what ends up used.
 *
 * The sources are title_builder.js's plain-data globals (mdbTitle_trace, mdbTitle_lookupLog,
 * mdbTitle_categoryCache, mdbTitle_candidateSources) plus mdbPageCreator_tracePreLookup - the
 * first pass's trace, which only this file can keep, since the parser cannot tell its own
 * passes apart - plus the title as it stands in the field. Sections 1-4 describe the PLAYER
 * title and only change when the suggestion is rebuilt; 5, 6 and 7 follow every edit of the
 * field - debounced, because a corrected name may need a lookup of its own and firing one per
 * keystroke would spam the wiki.
 *
 * Display only, rebuilt whole on every render. The one thing it remembers is which of the
 * cleanup steps' "?" rule lists the reader opened (mdbPageCreator_openDefinitions) - the
 * rebuild is what a title EDIT triggers, and a list opened to compare the title against would
 * close on the first keystroke.
 * Everything is written with .text(), never with HTML strings - player titles are hostile
 * free text.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// mdbPageCreator_queueCategoryUpdate
// A title edit changes the categories - the hints bar's "Used categories" line and the panel's
// section 6 alike - and can name someone the cache has never heard of, so the re-render waits
// out the typing and only then asks the wiki about the names of the CURRENT title (one
// cache-aware request at most; unchanged names cost none).
//
// Fired whether or not the report box is open, unlike before the hints bar existed: the bar is
// always on screen, and a green/red verdict that only updates for reporters would be a verdict
// about the title as it was first suggested. (The panel's own render still bails when the box
// is closed - there is nothing on screen to draw into.) A name this has not asked about yet
// stands grey in the bar meanwhile, never red - see mdbPageCreator_categoryUnanswered().
var mdbPageCreator_categoryDelayMs = 800;

function mdbPageCreator_queueCategoryUpdate() {
    if( mdbPageCreator_categoryTimer ) clearTimeout( mdbPageCreator_categoryTimer );

    // the answer may arrive after the reader clicked on to the next mix - see mdbPageGeneration
    var pageGeneration = mdbPageGeneration;

    mdbPageCreator_categoryTimer = setTimeout(function() {
        mdbPageCreator_categoryTimer = null;

        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        var wrapper = $("#mdb-pageCreator"),
            title = $.trim( wrapper.find( "#mdb-pageCreator-title" ).val() ),
            read = mdbTitle_titleCategories( title ),
            names = read.artists.slice(),
            // The category section annotates the entity CATEGORY (episode number stripped),
            // and that spelling is the only one worth asking about: the entity WITH its
            // number ("HATE Podcast 496") is never a category name and could only answer
            // empty - the same reduction the first-round candidates make
            // (mdbTitle_categoryCandidates).
            entityCategory = mdbPageCreator_entityCategoryFor( title, read.entity );

        if( read.entity ) {
            names.push( entityCategory && entityCategory !== "Promo Mix" ? entityCategory : read.entity );
        }

        // an edited title says the roles outright - its artists are artist candidates, its
        // entity the entity one - so section 3 files the fresh chips into the right column.
        // typeof-guarded: a stale cached title_builder.js knows no roles.
        if( typeof mdbTitle_noteCandidateRole === "function" ) {
            for( var n = 0; n < read.artists.length; n++ ) {
                mdbTitle_noteCandidateRole( read.artists[n], "artist" );
            }
            if( read.entity ) {
                mdbTitle_noteCandidateRole( names[ names.length - 1 ], "entity" );
            }
        }

        // ... and where they come from, so section 3 does not show them as names out of
        // nowhere: these were read off the FIELD, not off the player title's chunks
        if( typeof mdbTitle_noteCandidateSource === "function" ) {
            for( var s = 0; s < names.length; s++ ) {
                mdbTitle_noteCandidateSource( names[s], "title field" );
            }
        }

        logVar( "mdbPageCreator_queueCategoryUpdate: looking up", names.join( " | " ) || "(nothing)" );

        mdbTitle_lookupCategories( names, function() {
            if( !mdbIsCurrentPage( pageGeneration ) ) return;

            // an edited title may name a different series - the two recent-pages sections
            // and the page text read that category's pages, so start their fetch here (the
            // settle path re-renders; an already-fetched category costs nothing)
            mdbPageCreator_recentEnsureFor( $.trim( $("#mdb-pageCreator-title").val() ) );

            // looked up again rather than closed over: seconds have passed, and on these
            // sites the row of the moment is the one to draw into
            var row = $("#mdb-pageCreator");

            mdbPageCreator_renderHints( row );
            mdbPageCreator_renderReasoning( row );
        });
    }, mdbPageCreator_categoryDelayMs );
}

// mdbPageCreator_reasoningSection
// A numbered section: the count bubble, the heading, and a grey hint that says in passing what
// the section is read off.
function mdbPageCreator_reasoningSection( no, title, hint ) {
    var head = $("<div>").addClass( "mdb-pageCreator-reasoning-head" ).append(
            $("<span>").addClass( "mdb-pageCreator-reasoning-no" ).text( no ),
            $("<span>").addClass( "mdb-pageCreator-reasoning-title" ).text( title )
        );

    if( hint ) head.append( $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( hint ) );

    // the numbered class carries the section's accent colour (bubble + left bar) in the CSS
    return $("<div>")
        .addClass( "mdb-pageCreator-reasoning-section mdb-pageCreator-reasoning-section-" + no )
        .append( head );
}

// mdbPageCreator_reasoningChips
function mdbPageCreator_reasoningChips( names, chipClass ) {
    var row = $("<div>").addClass( "mdb-pageCreator-reasoning-chips" ),
        i;

    for( i = 0; i < names.length; i++ ) {
        row.append(
            $("<span>")
                .addClass( "mdb-pageCreator-chip" + ( chipClass ? " " + chipClass : "" ) )
                .text( names[i] )
        );
    }

    return row;
}

// mdbPageCreator_reasoningRemoved
// The "Removed:" side line of the chunk section: the names the shared split took out for one
// reason ("label" | "location"), struck through, with the reason spelled out behind them.
// An empty jQuery object when the trace has none of this reason (or none at all - a stale
// cached title_builder.js from before chunksRemoved existed), so the append is a no-op.
function mdbPageCreator_reasoningRemoved( removed, reason, why ) {
    var names = [],
        i;

    for( i = 0; removed && i < removed.length; i++ ) {
        if( removed[i].reason === reason ) names.push( removed[i].text );
    }

    if( !names.length ) return $();

    var aside = $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
            $("<span>").text( "Removed:" )
        );

    for( i = 0; i < names.length; i++ ) {
        aside.append(
            $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-removed" ).text( names[i] )
        );
    }

    return aside.append( $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( why ) );
}

// mdbPageCreator_reasoningTypeBadge
// One class per broad kind rather than per server type, so the CSS does not have to name every
// type the module may ever answer with - unknown ones fall into the grey "other".
function mdbPageCreator_reasoningTypeBadge( type ) {
    var kind = /podcast|show|radio/.test( type ) ? "series"
             : type === "venue"  ? "venue"
             : type === "event"  ? "event"
             : type === "artist" ? "artist"
             : "other";

    return $("<span>")
        .addClass( "mdb-pageCreator-typeBadge mdb-pageCreator-typeBadge-" + kind )
        .text( type );
}

// mdbPageCreator_matchScore
// The confidence badge behind one answer, coloured by the same bands as the row's title score.
// typeof-guarded like everything else the panel reads out of title_builder.js: a stale cached
// copy from before this existed must cost the reader a badge, not the report box.
function mdbPageCreator_matchScore( name, matches, index, overruled ) {
    if( typeof mdbTitle_matchConfidence !== "function" ) return null;

    var conf = mdbTitle_matchConfidence( name, matches, index, overruled ),
        intro = "How strongly this answer backs \"" + name + "\".";

    return $("<span>")
        .addClass( "mdb-pageCreator-matchScore mdb-pageCreator-score-" + mdbPageCreator_confidenceBand( conf.percent ) )
        .attr( "title", conf.reasons.length
            ? intro + "\n\nWhat lowered it:\n- " + conf.reasons.join( "\n- " )
            : intro + "\nThe wiki has this exact name and its category is well filled." )
        .text( conf.percent + "%" );
}

// mdbPageCreator_pageUrl
// The MixesDB page of any wiki title - a mix page out of a lookup answer's "recent" list, or
// a category with its namespace already in front. The article path is /w/<page>, so the title
// only has to be spelled the way MediaWiki spells one in a URL: spaces as underscores, the
// rest percent-escaped. A ":" is put back after encoding - where one stands in a title it is
// a namespace separator, not data.
function mdbPageCreator_pageUrl( title ) {
    var name = String( title || "" ).replace( / /g, "_" );

    // A "/" in the name cannot ride in the path at all - the escaped slash is refused by the
    // server before MediaWiki ever sees it - so those few titles take the query form instead.
    // Mix pages carry one more often than category names: "... (Spectrum Radio 115/116)".
    if( name.indexOf( "/" ) !== -1 ) {
        return mdbPageCreator_editUrl + "?title=" + encodeURIComponent( name );
    }

    return "https://www.mixesdb.com/w/" + encodeURIComponent( name ).replace( /%3A/gi, ":" );
}

// mdbPageCreator_categoryUrl
// The MixesDB page of a category the lookup answered with. The API answers with bare names,
// but a "Category:" that did slip through is stripped rather than doubled.
function mdbPageCreator_categoryUrl( title ) {
    return mdbPageCreator_pageUrl( "Category:" + String( title || "" ).replace( /^\s*Category:\s*/i, "" ) );
}

// mdbPageCreator_reasoningMatch
// One server match as "Name [type] N mixes NN%" - the spelling is the wiki's own, which is half
// of what makes the lookup worth showing. The whole answer list is passed rather than the one
// match: the score of an answer depends on how many OTHER things the wiki knows the name as.
// The name links to its category page - _blank, not the usual _top, because looking a name up
// is a side trip: the reader is in the middle of judging a title on THIS page and comes back
// to it (same case as the toolkit's EDIT/HIST links). An answer without a title stays a plain
// span - there is nothing to open.
function mdbPageCreator_reasoningMatch( name, matches, index, overruled ) {
    var match = matches[index],
        known = match.title
            ? $("<a>")
                .attr( "href", mdbPageCreator_categoryUrl( match.title ) )
                .attr( "target", "_blank" )
                .attr( "title", "Open [[Category:" + match.title + "]] on MixesDB" )
                .text( match.title )
            : $("<span>").text( "?" ),
        out = $("<span>").addClass( "mdb-pageCreator-reasoning-match" ).append(
            known.addClass( "mdb-pageCreator-known" ),
            mdbPageCreator_reasoningTypeBadge( String( match.type || "?" ) )
        );

    if( typeof match.mixes === "number" ) {
        out.append(
            $("<span>").addClass( "mdb-pageCreator-reasoning-mixes" )
                .text( match.mixes + ( match.mixes === 1 ? " mix" : " mixes" ) )
        );
    }

    return out.append( mdbPageCreator_matchScore( name, matches, index, overruled ) );
}

// mdbPageCreator_reasoningLookupColumn
// One of section 3's two candidate columns: the heading and the chip/answer grid under it.
// count says whether any row landed here - an empty column gets a muted line instead.
function mdbPageCreator_reasoningLookupColumn( heading ) {
    var rows = $("<div>").addClass( "mdb-pageCreator-reasoning-lookupCol-rows" ),
        col = $("<div>").addClass( "mdb-pageCreator-reasoning-lookupCol" ).append(
            $("<span>").addClass( "mdb-pageCreator-reasoning-lookup-colHead" ).text( heading ),
            rows
        );

    return { col: col, rows: rows, count: 0 };
}

// mdbPageCreator_reasoningLookupRow
// One asked name in its ONE candidate column: the chip, and EVERYTHING the wiki says about
// the name, whatever the type - the badge tells an artist answer from a podcast one, which
// is how "asked as the series, known as an artist too" stays visible without the chip
// showing up twice. No answer at all shows the request's status note instead.
//
// source is where the name came from (mdbTitle_candidateSources) and is printed whenever the
// name is not simply a chunk as section 1 shows it: this section's names are built from the
// chunks, not copied from them, and a reader who cannot see that reads the difference as the
// panel contradicting itself.
function mdbPageCreator_reasoningLookupRow( column, entry, matches, isCat, overruledBy, source ) {
    var result = $("<span>").addClass( "mdb-pageCreator-reasoning-lookup-result" ),
        m;

    for( m = 0; m < matches.length; m++ ) {
        result.append( mdbPageCreator_reasoningMatch( entry.name, matches, m, !!overruledBy ) );
    }

    if( !matches.length ) {
        if( entry.pending ) {
            result.append( mdbPageCreator_reasoningNote( "looking it up …", "info" ) );
        } else if( entry.skipped ) {
            result.append( mdbPageCreator_reasoningNote( "not asked - over the 10-name request limit", "muted" ) );
        } else if( entry.failed ) {
            result.append( mdbPageCreator_reasoningNote( "lookup failed", "bad" ) );
        } else {
            // the normal outcome for most title bits, so muted rather than a warning -
            // section 5 is where an unknown name matters
            result.append( mdbPageCreator_reasoningNote( "no category of this name", "muted" ) );
        }
    }

    // A curated channel mapping outranks whatever the wiki knows under the bare words -
    // without this line, an answer like "DJ Mix, show, 369 mixes" reads like the row the
    // title should have used. Muted: the red chip already carries the verdict.
    if( overruledBy ) {
        result.append( mdbPageCreator_reasoningNote(
            "overruled - on this channel these words name \"" + overruledBy + "\" (curated channel rule, section 2)", "muted" ) );
    }

    // A third grid item, not a line inside the answers: it spans both tracks (see the CSS), so
    // saying where a name came from costs the name and its answers no width. Squeezed into the
    // answer column it pushed long ones off the panel.
    var origin = mdbPageCreator_reasoningOrigin( entry.name, source ),
        row = $("<div>").addClass( "mdb-pageCreator-reasoning-lookup" ).append(
            $("<span>")
                .addClass( "mdb-pageCreator-chip " + ( isCat
                    ? "mdb-pageCreator-chip-kept"
                    : "mdb-pageCreator-chip-notCat" ) )
                .text( entry.name ),
            result
        );

    if( origin ) {
        row.append( $("<div>").addClass( "mdb-pageCreator-reasoning-lookup-origin" ).append( origin ) );
    }

    column.count++;
    column.rows.append( row );
}

// mdbPageCreator_reasoningOrigin
// Where an asked name came from, as a note - or nothing when the name IS the chunk section 1
// shows, which needs no explaining. The five that do: the channel (asked though it stands
// nowhere in the title), a channel that names several, a curated show name, a chunk the
// candidate reduced (the trailing episode number comes off, since a category name never
// carries one), and a name the first parse read out of its chunk (the chunk itself carries
// more than the name, so the chunk side could never ask it). A name typed into the title
// field afterwards says so too, so it is not read as something the player title contained.
function mdbPageCreator_reasoningOrigin( name, source ) {
    if( !source || !source.origin ) return null;

    var text = "";

    switch( source.origin ) {
        case "channel":
            // no claim about the title: a channel handle can also BE one of its chunks, in
            // the channel's own spelling ("thelotradio" for the chunk "The Lot Radio")
            text = "the channel this mix was uploaded on - asked as the series the mixes belong to";
            break;
        case "channel name":
            text = "one of the names the channel carries";
            break;
        case "curated show":
            text = "the show this channel is curated to in title_definitions.js";
            break;
        case "title field":
            text = "read off the title in the field, not off the player title";
            break;
        case "first parse":
            text = "a name the first parse read out of the title - its chunk carries more than the name, so only the parse could ask about it";
            break;
        case "chunk":
            // only worth a line when the two differ - otherwise the chip already says it
            if( source.chunk && mdbTitle_normalizeCompare( source.chunk ) !== mdbTitle_normalizeCompare( name ) ) {
                text = "from the chunk \"" + source.chunk + "\" - a category name carries no episode number";
            }
            break;
    }

    return text ? mdbPageCreator_reasoningNote( text, "muted" ) : null;
}

// mdbPageCreator_lookupOverruledBy
// The show a curated channel rule reads this name as on THIS channel, or "". A mapping outranks
// whatever the wiki knows under the bare words, so both the note and the score have to see it.
function mdbPageCreator_lookupOverruledBy( trace, key ) {
    if( !trace || !trace.steps ) return "";

    for( var st = 0; st < trace.steps.length; st++ ) {
        var mp = trace.steps[st].mapping;

        if( mp && mp.words && mp.to && mdbTitle_normalizeCompare( mp.words ) === key ) return mp.to;
    }

    return "";
}

// mdbPageCreator_reasoningNote
// tone: "good" (the wiki confirms it), "info" (worth knowing), "warn" (check this before
// creating), "bad" (the request itself died), "muted" (a plain fact). The colour IS the
// message, so the tone is picked per statement at the call site, not per section.
function mdbPageCreator_reasoningNote( text, tone ) {
    return $("<span>")
        .addClass( "mdb-pageCreator-reasoning-note mdb-pageCreator-note-" + ( tone || "muted" ) )
        .text( text );
}

// mdbPageCreator_reasoningDetail
// The step detail with its " -> " rendered as a coloured arrow, so before and after are told
// apart at a glance. Split on the exact spaced " -> " the trace writes - an arrow a title
// itself carries is glued to its words and stays text.
function mdbPageCreator_reasoningDetail( detail ) {
    var span = $("<span>").addClass( "mdb-pageCreator-reasoning-step-detail" ),
        parts = String( detail || "" ).split( " -> " ),
        i;

    for( i = 0; i < parts.length; i++ ) {
        if( i ) span.append( $("<span>").addClass( "mdb-pageCreator-reasoning-arrow" ).text( "→" ) );

        span.append( document.createTextNode( parts[i] ) );
    }

    return span;
}

// mdbPageCreator_definitionLiteral
// A definition list as the JS it is written as in title_definitions.js: regexes as regexes
// (JSON.stringify writes them as "{}"), strings quoted, one entry per line. Printed rather
// than described, because a rule is only checkable in its own spelling - a reporter compares
// the entry against the title in front of them.
// A short object stays on one line ({ wrong: /\bpodcats\b/gi, right: "podcast" }): broken over
// five lines it reads as five facts, and mdbTitleTypoFixes is 3 entries.
function mdbPageCreator_definitionLiteral( value, indent ) {
    if( value instanceof RegExp ) return String( value );
    if( typeof value !== "object" || value === null ) return JSON.stringify( value );

    var pad = new Array( ( indent || 0 ) + 1 ).join( "    " ),
        inner = pad + "    ",
        isArray = Object.prototype.toString.call( value ) === "[object Array]",
        parts = [],
        flat = [],
        k, i, text;

    if( isArray ) {
        for( i = 0; i < value.length; i++ ) {
            text = mdbPageCreator_definitionLiteral( value[i], ( indent || 0 ) + 1 );
            parts.push( inner + text );
            flat.push( text );
        }
    } else {
        for( k in value ) {
            if( !Object.prototype.hasOwnProperty.call( value, k ) ) continue;

            // quoted the way the file writes it: a plain identifier bare ("wrong:"), a name
            // with blanks in quotes ("Dance TV":) - the block is there to be compared with
            // title_definitions.js line for line
            text = ( /^[A-Za-z_$][\w$]*$/.test( k ) ? k : JSON.stringify( k ) ) + ": " +
                   mdbPageCreator_definitionLiteral( value[k], ( indent || 0 ) + 1 );
            parts.push( inner + text );
            flat.push( text );
        }
    }

    if( !parts.length ) return isArray ? "[]" : "{}";

    var oneLine = ( isArray ? "[ " : "{ " ) + flat.join( ", " ) + ( isArray ? " ]" : " }" );

    if( indent && oneLine.length <= 72 && oneLine.indexOf( "\n" ) === -1 ) return oneLine;

    return ( isArray ? "[\n" : "{\n" ) + parts.join( ",\n" ) + "\n" + pad + ( isArray ? "]" : "}" );
}

// mdbPageCreator_reasoningDefinitions
// The block behind a step's "?": per list its variable name (which says where to go and fix a
// wrong entry), the one-liner from mdbTitleDefinitionDocs and the list itself in a <pre>.
// Hidden unless the reader opened it - see mdbPageCreator_openDefinitions.
function mdbPageCreator_reasoningDefinitions( defs ) {
    var docs = ( typeof mdbTitleDefinitionDocs !== "undefined" && mdbTitleDefinitionDocs ) ? mdbTitleDefinitionDocs : {},
        box = $("<div>").addClass( "mdb-pageCreator-reasoning-defs" ),
        shown = 0,
        i, doc;

    for( i = 0; i < defs.length; i++ ) {
        doc = Object.prototype.hasOwnProperty.call( docs, defs[i] ) ? docs[defs[i]] : null;

        if( !doc ) continue;

        box.append(
            $("<div>").addClass( "mdb-pageCreator-reasoning-defs-name" ).text( defs[i] ),
            $("<div>").addClass( "mdb-pageCreator-reasoning-defs-what" ).text( doc.what || "" ),
            $("<pre>").addClass( "mdb-pageCreator-reasoning-defs-pre" )
                .text( mdbPageCreator_definitionLiteral( doc.data, 0 ) )
        );

        shown++;
    }

    return shown ? box : $();
}

// mdbPageCreator_reasoningStepDetail
// The detail of one cleanup step. A channel -> show mapping (step.mapping, see
// mdbTitle_traceStep) renders as chips - the channel in the blue of the chunk section's
// channel chip, the show it became in green - with the title's own words quoted in front
// when they took part ("DJ MIX" on the channel [Dance TV] -> [Dance TV DJ Mix]). Everything
// else is the plain before -> after text.
function mdbPageCreator_reasoningStepDetail( step ) {
    var mapping = step.mapping;

    if( !mapping || !mapping.from || !mapping.to ) {
        return mdbPageCreator_reasoningDetail( step.detail );
    }

    var span = $("<span>").addClass( "mdb-pageCreator-reasoning-step-detail" );

    if( mapping.words ) {
        span.append( document.createTextNode( "\"" + mapping.words + "\" on the channel " ) );
    }

    return span.append(
        $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-channel" ).text( mapping.from ),
        $("<span>").addClass( "mdb-pageCreator-reasoning-arrow" ).text( "→" ),
        $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-kept" ).text( mapping.to )
    );
}

// mdbPageCreator_reasoningStepKey
// What makes two steps of two different runs the same step. The parse runs TWICE - once
// before the wiki is asked and once with its answers - and sections 2/4 are that difference,
// so "same step" has to be decided somewhere central. Label plus detail: a step that did the
// same thing to the same text IS the same step, whichever run wrote it.
function mdbPageCreator_reasoningStepKey( step ) {
    return String( step.label || "" ) + " " + String( step.detail || "" );
}

// mdbPageCreator_reasoningSteps
// The rendered list of cleanup steps, or an empty jQuery set when there are none. Shared by
// the two cleanup sections (2 before the lookup, 4 what its answers changed), so a step
// looks the same wherever it ran.
function mdbPageCreator_reasoningSteps( steps ) {
    if( !steps || !steps.length ) return $();

    var list = $("<div>").addClass( "mdb-pageCreator-reasoning-steps" ),
        i;

    for( i = 0; i < steps.length; i++ ) {
        var step = steps[i],
            label = $("<span>").addClass( "mdb-pageCreator-reasoning-step-label" ).text( step.label ),
            row = $("<div>").addClass( "mdb-pageCreator-reasoning-step" ),
            // a step that worked off a title_definitions.js list (step.defs) offers it
            // behind a "?"; one that decided on its own has nothing to show
            defs = step.defs ? mdbPageCreator_reasoningDefinitions( step.defs ) : $();

        if( defs.length ) {
            // the open ones survive a re-render (a title edit rebuilds the panel, and a
            // list the reader opened to compare against must not close under them) -
            // keyed by the lists themselves, so the same rule stays open on any step
            var defsKey = step.defs.join( "|" ),
                open = mdbPageCreator_openDefinitions[ defsKey ] === true;

            defs.toggle( open );

            label.append(
                $("<span>")
                    .addClass( "mdb-pageCreator-reasoning-defs-toggle" + ( open ? " mdb-pageCreator-defs-open" : "" ) )
                    .attr( "title", "Show the rule list this step worked off: " + step.defs.join( ", " ) )
                    .text( "?" )
                    .on( "click", function( key, panel ) {
                        return function() {
                            var nowOpen = !panel.is( ":visible" );

                            mdbPageCreator_openDefinitions[ key ] = nowOpen;
                            $(this).toggleClass( "mdb-pageCreator-defs-open", nowOpen );
                            panel.toggle( nowOpen );
                        };
                    }( defsKey, defs ) )
            );
        }

        // the panel is a third child of a display:contents row, spanning both grid
        // columns (see page_creator.css) - a nested wrapper would break the alignment
        // every other row shares
        list.append( row.append( label, mdbPageCreator_reasoningStepDetail( step ), defs ) );
    }

    return list;
}

// mdbPageCreator_reasoningStepsAdded
// The steps of "after" that "before" does not have, in order. Counted, not just looked up:
// the same step can legitimately run twice in one title, and a set would swallow the second.
function mdbPageCreator_reasoningStepsAdded( before, after ) {
    var seen = {},
        out = [],
        i, key;

    for( i = 0; before && i < before.length; i++ ) {
        key = mdbPageCreator_reasoningStepKey( before[i] );
        seen[key] = ( seen[key] || 0 ) + 1;
    }

    for( i = 0; after && i < after.length; i++ ) {
        key = mdbPageCreator_reasoningStepKey( after[i] );

        if( seen[key] ) seen[key]--;
        else out.push( after[i] );
    }

    return out;
}

// mdbPageCreator_reasoningCategoryMatch
// A category row's match rendered through mdbPageCreator_reasoningMatch, which scores per
// ANSWER and therefore needs the name's whole answer list and the match's place in it. Fixes
// the panel dying after section 3 on any page whose artist or entity IS a known category -
// the row used to hand the bare match to a function that had long grown the richer signature.
function mdbPageCreator_reasoningCategoryMatch( cache, name, match ) {
    var key = mdbTitle_normalizeCompare( name ),
        cached = Object.prototype.hasOwnProperty.call( cache, key ) ? cache[key] : "",
        matches = ( cached && cached.matches ) ? cached.matches : [ match ],
        index = matches.indexOf( match );

    // a fixture-style plain type string synthesizes its match, which sits in no list
    if( index === -1 ) { matches = [ match ]; index = 0; }

    return mdbPageCreator_reasoningMatch( name, matches, index, false );
}

// mdbPageCreator_reasoningCategoryRow
// One "[[Category:...]]" line with WHY this name got this slot, and then what is known about it:
// an artist the wiki has is confirmed with its mix count, one it does not have is flagged as
// possibly new or misspelled.
// The "why" leads, because it is the question the panel used to leave open - "Adjust @ S.U.N
// Festival" files a festival the wiki has never heard of as the entity while the channel MONUMENT
// is a podcast with 425 mixes, and nothing on screen said that the "@" is what decided it. The
// sentence comes from the branch that decided (mdbTitle_trace.picks, written in mdbTitle_result),
// never re-derived here: a panel that reasons on its own can disagree with the parse, and then it
// is the reporter who is misled. picks is one sentence per ROLE - the artist rows of a title
// naming several artists were all picked by the same rule.
function mdbPageCreator_reasoningCategoryRow( entry, cache, picks ) {
    var row = $("<div>").addClass( "mdb-pageCreator-reasoning-cat" ),
        note = $("<span>").addClass( "mdb-pageCreator-reasoning-cat-note" ),
        why = ( picks && ( entry.role === "artist" || entry.role === "entity" ) ) ? picks[ entry.role ] : "",
        match;

    row.append(
        $("<span>")
            .addClass( "mdb-pageCreator-reasoning-cat-name" + ( entry.name ? "" : " mdb-pageCreator-reasoning-cat-empty" ) )
            .text( "[[Category:" + entry.name + "]]" )
    );

    if( why && entry.name ) {
        note.append(
            $("<span>")
                .addClass( "mdb-pageCreator-reasoning-cat-why" )
                .text( "picked as the " + entry.role + ": " + why )
        );
    }

    switch( entry.role ) {
        case "year":
            note.append( mdbPageCreator_reasoningNote( "the year of the date group", "muted" ) );
            break;

        case "artist":
            match = mdbTitle_knownMatch( cache, entry.name, [ "artist" ] );

            if( match ) {
                note.append( mdbPageCreator_reasoningCategoryMatch( cache, entry.name, match ) );

                // a match whose spelling differs is knowledge worth a look, not a rewrite
                if( match.title && match.title !== entry.name ) {
                    note.append( mdbPageCreator_reasoningNote( "the wiki spells it \"" + match.title + "\"", "info" ) );
                }
            } else {
                note.append( mdbPageCreator_reasoningNote( "no artist category of this name yet - a new name, or misspelled", "muted" ) );
            }
            break;

        case "entity":
            match = mdbTitle_knownMatch( cache, entry.name, null );

            if( match ) {
                note.append( mdbPageCreator_reasoningCategoryMatch( cache, entry.name, match ) );

                if( match.title && match.title !== entry.name ) {
                    note.append( mdbPageCreator_reasoningNote( "the wiki spells it \"" + match.title + "\"", "info" ) );
                }
            } else {
                note.append( mdbPageCreator_reasoningNote( "no category of this name yet", "muted" ) );
            }
            break;

        case "promo":
            note.append( mdbPageCreator_reasoningNote( "self-released, so no entity category - see Help:Add a new mix page", "info" ) );
            break;

        case "style":
            if( entry.name && entry.source === "recent" ) {
                // learned from the entity's recent sibling pages (section 7), not from this mix
                note.append( mdbPageCreator_reasoningNote(
                    "style carried by " + entry.count + " of the " + entry.n + " newest pages in the entity's category",
                    "info"
                ) );
            } else {
                note.append( mdbPageCreator_reasoningNote(
                    entry.name ? "style suggested by this site" : "style - left empty, that call is the editor's",
                    "muted"
                ) );
            }
            break;

        case "tracklist":
            note.append( mdbPageCreator_reasoningNote( "what the Tracklist Editor feedback last said about the tracklist box", "muted" ) );
            break;
    }

    row.append( note );

    return row;
}

// mdbPageCreator_reasoningRecentState
// The sentence both recent-pages sections (5 and 7) open with while there is nothing to show -
// one function, so the two can never tell different stories about the same state. "" when the
// findings are ready to render.
function mdbPageCreator_reasoningRecentState( info ) {
    switch( info.skip ) {
        case "no-entity":
            return "the title names no entity category - no series whose pages could teach anything";
        case "bucket":
            return "Category:" + ( info.catTitle || info.catName ) + " collects unrelated mixes (mdbPageCreator_bucketCategories) - its pages are no siblings of this mix, so nothing is read off them";
        case "pending-lookup":
            return "waiting for the category lookup's answer about \"" + info.catName + "\" …";
        case "unknown":
            return "MixesDB has no category \"" + info.catName + "\" (yet) - no pages to read";
        case "artist":
            return "\"" + info.catName + "\" is only known as an artist - an artist's pages are sets of every kind, not a series with one format";
        case "empty":
            return "Category:" + info.catTitle + " holds no mix pages yet";
    }

    if( !info.entry ) return "the category's pages have not been asked for yet";
    if( info.entry.status === "pending" ) return "reading the newest pages of Category:" + info.catTitle + " …";
    if( info.entry.status === "failed" ) return "the page fetch failed - nothing is learned and the page text stays the default";

    if( info.entry.pages.length < 3 ) {
        return "only " + info.entry.pages.length + " page" + ( info.entry.pages.length === 1 ? "" : "s" ) +
               " in Category:" + info.catTitle + " - too few to call anything a convention";
    }

    return "";
}

// mdbPageCreator_reasoningRecentCount
// How many pages carry a verdict, phrased the way the reader should weigh it: a plain
// "9 of the 10 newest pages", or the unanimous newest run that overruled a disagreeing sample
// (mdbPageCreator_recentConsensus's recentOnly).
function mdbPageCreator_reasoningRecentCount( c ) {
    return c.recentOnly
        ? "all " + c.n + " newest pages (the older ones disagree - newer pages win)"
        : c.count + " of the " + c.n + " newest pages";
}

// mdbPageCreator_reasoningRecentRead
// The "Read:" line both sections open with: which pages the findings are read off.
function mdbPageCreator_reasoningRecentRead( info ) {
    return $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
        $("<span>").text( "Read:" ),
        $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( "the " + info.entry.pages.length + " newest pages of" ),
        $("<a>")
            .addClass( "mdb-pageCreator-known" )
            .attr( "href", mdbPageCreator_categoryUrl( info.catTitle ) )
            .attr( "target", "_blank" )
            .attr( "data-mdb-modal-label", "Category: " + info.catTitle )
            .attr( "title", "Open [[Category:" + info.catTitle + "]] on MixesDB" )
            .text( "Category:" + info.catTitle )
    );
}

// mdbPageCreator_reasoningRecentTitle
// Section 5, "Title analysis of recent mixes": how the entity's own newest pages write their
// titles, and what that did to the suggestion. The third and last title stage - which is why
// the green "Final title:" chip closes THIS section now and no longer 4 - so it shares the
// title stages' orange accent. Findings first as they were read, then what was applied.
function mdbPageCreator_reasoningRecentTitle( title ) {
    var s = mdbPageCreator_reasoningSection( "5", "Title analysis of recent mixes",
            "the newest pages of the entity's own category, newest first: how this series really writes its titles. A rule needs 90% of the pages behind it - or all of the 5 newest, where the older ones disagree (a changed convention). It rewrites only the SUGGESTION, never an edited title" ),
        info = mdbPageCreator_recentAnalysisFor( title ),
        state = mdbPageCreator_reasoningRecentState( info ),
        input = $("#mdb-pageCreator-title"),
        edited = !!( input.length && input.data( "mdb-edited" ) );

    if( state ) {
        s.append( mdbPageCreator_reasoningNote( state, "muted" ) );
    } else {
        var f = mdbPageCreator_recentTitleFindings( info ),
            rows = [],
            // The applied-change rows concern the SUGGESTION. Once the field was edited they
            // may be about another entity entirely (the findings follow the field, the changes
            // do not), so they only render while the field still holds what was applied.
            showChanges = !edited || title === mdbPageCreator_titlePostRecent,
            i;

        s.append( mdbPageCreator_reasoningRecentRead( info ) );

        // what was applied leads, like section 4's "The suggestion changed" - it is the headline
        for( i = 0; showChanges && i < mdbPageCreator_recentTitleChanges.length; i++ ) {
            rows.push( mdbPageCreator_recentTitleChanges[i] );
        }

        if( f.written ) {
            rows.push( { label: "Name as written",
                         detail: "\"" + f.written.value + "\" - " + mdbPageCreator_reasoningRecentCount( f.written ) } );
        } else {
            rows.push( { label: "Name as written",
                         detail: "no 90% agreement (the name stands in " + f.matched + " of " + f.n + " titles)" } );
        }

        if( !info.isPlace ) {
            if( f.format && f.format.none ) {
                rows.push( { label: "Episode number",
                             detail: "none - " + mdbPageCreator_reasoningRecentCount( f.format ) + " write the bare name" } );
            } else if( f.format ) {
                rows.push( { label: "Episode format",
                             detail: "\"" + f.format.display + "\" - " + mdbPageCreator_reasoningRecentCount( f.format ) +
                                     ( f.format.pad ? " - N zero-padded to " + f.format.pad + " digits" : "" ) } );
            } else {
                rows.push( { label: "Episode format", detail: "no 90% agreement - the title stays as built" } );
            }
        } else {
            if( f.city ) {
                rows.push( { label: "City behind the place",
                             detail: "\"" + f.city.value + "\" - " + mdbPageCreator_reasoningRecentCount( f.city ) } );
            } else {
                rows.push( { label: "City behind the place", detail: "no 90% agreement - nothing appended" } );
            }
        }

        s.append( mdbPageCreator_reasoningSteps( rows ) );

        if( !mdbPageCreator_recentTitleChanges.length ) {
            s.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                    mdbPageCreator_reasoningNote( "the suggestion already matches what the recent pages agree on", "muted" )
                )
            );
        } else if( edited && mdbPageCreator_titlePostRecent && title !== mdbPageCreator_titlePostRecent ) {
            s.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                    mdbPageCreator_reasoningNote( "the title above was edited by hand - the analysis is shown, nothing was rewritten", "muted" )
                )
            );
        }
    }

    // The title whole and GREEN: every stage that shapes it has run. The field above may carry
    // the reader's correction - that corrected title IS the final one, so the chip follows the
    // field, not the frozen suggestion.
    var finalTitle = title || mdbPageCreator_titlePostRecent || mdbPageCreator_titlePostLookup;

    if( finalTitle ) {
        s.append(
            $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).text( "Final title:" ),
            mdbPageCreator_reasoningChips( [ finalTitle ], "mdb-pageCreator-chip-kept" )
        );
    }

    return s;
}

// mdbPageCreator_reasoningRecentText
// Section 7, "Page text analysis of recent mixes": what the same pages' WIKITEXT settles about
// the page the "Create" link writes - the lead artwork line, the file details body, the styles.
// Rendered from the stored per-category findings (mdbPageCreator_recentPageTextFindings); the
// duration cross-check runs here too, so the section says the same thing the page text does.
function mdbPageCreator_reasoningRecentText( title ) {
    var s = mdbPageCreator_reasoningSection( "7", "Page text analysis of recent mixes",
            "the same pages' wikitext: what a page of this series starts as. Read at the same 90% bar; whatever clears no bar keeps today's default page text. \"Tracklist:\" is never read off siblings - it describes this page's own tracklist" ),
        info = mdbPageCreator_recentAnalysisFor( title ),
        state = mdbPageCreator_reasoningRecentState( info );

    if( state ) {
        s.append( mdbPageCreator_reasoningNote( state, "muted" ) );
        return s;
    }

    var f = info.entry.text,
        rows = [],
        i;

    s.append( mdbPageCreator_reasoningRecentRead( info ) );

    // the lead artwork line
    if( f.image && f.image.value === "same" ) {
        rows.push( { label: "Lead artwork",
                     detail: mdbPageCreator_reasoningRecentCount( f.image ) + " open with an artwork named after the page itself (." + f.imageExt + ") -> " +
                             "the page text starts with [[File:<title>." + f.imageExt + "|right|360px]]" } );
    } else if( f.image && f.image.value === "none" ) {
        rows.push( { label: "Lead artwork",
                     detail: mdbPageCreator_reasoningRecentCount( f.image ) + " carry no artwork - no image line" } );
    } else if( f.image ) {
        rows.push( { label: "Lead artwork",
                     detail: mdbPageCreator_reasoningRecentCount( f.image ) + " name their artwork after something else - nothing a new page could predict, no image line" } );
    } else {
        rows.push( { label: "Lead artwork", detail: "no 90% agreement - no image line" } );
    }

    // the file details body
    var chosen = mdbPageCreator_recentBodyChoice( f ),
        durText = mdbPageCreator_durationMs ? convertHMS( Math.floor( mdbPageCreator_durationMs / 1000 ) ) : "";

    if( f.body && /^StandardShow/.test( String( f.body.value || "" ) ) ) {
        if( chosen ) {
            rows.push( { label: "File details",
                         detail: mdbPageCreator_reasoningRecentCount( f.body ) + " use {{" + f.body.value + "}} -> written instead of the dur table" +
                                 ( durText ? " (this file's " + durText + " fits)" : "" ) } );
        } else {
            rows.push( { label: "File details",
                         detail: mdbPageCreator_reasoningRecentCount( f.body ) + " use {{" + f.body.value + "}}, but this file's " + ( durText || "unknown duration" ) +
                                 " is too far off its stated length - the dur table stays (the category may be a misread)" } );
        }
    } else if( f.body && f.body.value === "table" ) {
        rows.push( { label: "File details",
                     detail: mdbPageCreator_reasoningRecentCount( f.body ) + " use the dur/MB/kbps table - kept" } );
    } else {
        rows.push( { label: "File details", detail: "no 90% agreement - the dur table stays" } );
    }

    // the styles
    if( f.styles.learned.length ) {
        for( i = 0; i < f.styles.learned.length; i++ ) {
            rows.push( { label: "Style",
                         detail: "\"" + f.styles.learned[i].name + "\" on " + mdbPageCreator_reasoningRecentCount( f.styles.learned[i] ) +
                                 " -> fills a style line" } );
        }
    } else {
        var tally = "";

        for( i = 0; i < f.styles.tally.length && i < 3; i++ ) {
            tally += ( tally ? ", " : "" ) + f.styles.tally[i].name + " " + f.styles.tally[i].count + "/" + f.styles.tally[i].n;
        }

        rows.push( { label: "Styles",
                     detail: ( tally ? "no style stands on 90% of the pages (" + tally + ")" : "the pages carry no style categories at all" ) +
                             " - the two style lines stay empty" } );
    }

    s.append( mdbPageCreator_reasoningSteps( rows ) );

    return s;
}

// mdbPageCreator_reasoningReady
// Whether the panel has everything it wants to show: the loading skeleton is gone (the page's
// pieces are on screen) and no name lookup is still in flight. Rendered before that, the panel
// would show half-answered lookups and categories that flip a moment later.
function mdbPageCreator_reasoningReady() {
    if( $("#mdb-skeleton").length ) return false;

    var lookupLog = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        i;

    for( i = 0; i < lookupLog.length; i++ ) {
        if( lookupLog[i].pending ) return false;
    }

    return true;
}

// mdbPageCreator_reasoningSkeleton
// The panel's own loading state: four grey stand-in rows shaped like the numbered sections,
// pulsing with the page skeleton's keyframes. Shown when "Report" is clicked before every
// answer is in, and swapped for the real content in one step.
function mdbPageCreator_reasoningSkeleton() {
    var box = $("<div>").addClass( "mdb-pageCreator-reasoning-skeleton" ),
        widths = [ 60, 45, 70, 50, 55, 40 ], // % - varied like real section content, not a uniform block
        i;

    for( i = 0; i < widths.length; i++ ) {
        box.append(
            $("<div>").addClass( "mdb-pageCreator-reasoning-skeleton-row" ).append(
                $("<span>").addClass( "mdb-pageCreator-reasoning-skeleton-bubble" ),
                $("<span>").addClass( "mdb-pageCreator-reasoning-skeleton-bar" ).css( "width", widths[i] + "%" )
            )
        );
    }

    return box;
}

// mdbPageCreator_watchReasoningReady
// Polls until the panel's sources are ready, then renders for real. The usual wait is well
// under a second (one lookup answer); the cap is for a request that never comes back - then
// whatever is known by now is shown rather than pulsing forever, hence the force flag.
function mdbPageCreator_watchReasoningReady() {
    if( mdbPageCreator_reasoningReadyPoll ) return; // already waiting for this very thing

    var tries = 0,
        maxTries = 40; // 40 * 300ms = 12s

    mdbPageCreator_reasoningReadyPoll = setInterval(function() {
        // panel closed or gone (navigation) - nothing to wait for anymore
        if( !mdbPageCreator_reportOpen || !$("#mdb-pageCreator-reasoning").length ) {
            clearInterval( mdbPageCreator_reasoningReadyPoll );
            mdbPageCreator_reasoningReadyPoll = null;
            return;
        }

        if( !mdbPageCreator_reasoningReady() && ++tries < maxTries ) return;

        clearInterval( mdbPageCreator_reasoningReadyPoll );
        mdbPageCreator_reasoningReadyPoll = null;

        if( tries >= maxTries ) log( "mdbPageCreator_watchReasoningReady: gave up waiting after " + maxTries + " tries - showing what is known." );

        mdbPageCreator_renderReasoning( $("#mdb-pageCreator"), true );
    }, 300);
}

// mdbPageCreator_renderReasoning
// Builds the whole panel from the current state of its sources. Cheap enough to run whole on
// every refresh, and stateless on purpose - see the section header. force skips the readiness
// gate: the watch's cap uses it to show what is known rather than pulsing forever.
function mdbPageCreator_renderReasoning( wrapper, force ) {
    var panel = wrapper.find( "#mdb-pageCreator-reasoning" );

    if( !panel.length || !mdbPageCreator_reportOpen ) return;

    // Not everything is on the page yet - hold the space with the panel's skeleton and come
    // back. Every settle path re-renders (the refresh after the lookup answer, the debounced
    // edit path), the poll is only the safety net behind them.
    if( !force && !mdbPageCreator_reasoningReady() ) {
        log( "mdbPageCreator_renderReasoning: lookups still in flight (or the page skeleton is up) - showing the panel skeleton." );
        panel.empty().append( mdbPageCreator_reasoningSkeleton() );
        mdbPageCreator_watchReasoningReady();
        return;
    }

    // content is about to render - a safety-net poll still ticking would only re-render it
    if( mdbPageCreator_reasoningReadyPoll ) {
        clearInterval( mdbPageCreator_reasoningReadyPoll );
        mdbPageCreator_reasoningReadyPoll = null;
    }

    logFunc( "mdbPageCreator_renderReasoning" );

    // typeof-guarded: the panel must never break the report box, and a stale cached
    // title_builder.js from before the trace existed would otherwise do exactly that
    var trace = ( typeof mdbTitle_trace !== "undefined" ) ? mdbTitle_trace : null,
        lookupLog = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        title = $.trim( wrapper.find( "#mdb-pageCreator-title" ).val() ),
        i;

    panel.empty();

    // 1) the chunks the player title split into
    var s1 = mdbPageCreator_reasoningSection( "1", "Title chunks for category lookup", "the units of the parse - split at separators, brackets and a series' \"by\". The lookups of 3 are built from these, not from the cleaned title of 2" );

    if( trace ) {
        s1.append(
            mdbPageCreator_reasoningChips( trace.chunks ),
            // what the split removed outright (trace.chunksRemoved, see mdbTitle_titleChunks):
            // shown struck through, so a reporter sees the label credit or the place list was
            // dropped on purpose - and that its names were never looked up
            mdbPageCreator_reasoningRemoved( trace.chunksRemoved, "label",
                "label credit - known label names never join the title and are not looked up" ),
            mdbPageCreator_reasoningRemoved( trace.chunksRemoved, "location",
                "location info - says where the artist is from, which the title never carries; not looked up" ),
            $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                $("<span>").text( "Channel:" ),
                $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-channel" ).text( trace.channel || "(none)" )
            )
        );
    } else {
        s1.append( $("<div>").addClass( "mdb-pageCreator-reasoning-empty" ).text( "No build trace - reload the page once, please." ) );
    }

    panel.append( s1 );

    // 2) the cleanup as it ran BEFORE the wiki was asked - the first pass's trace. The panel
    // used to show the second pass's here, one section above the lookups that fed it, which
    // read as a pipeline that runs in an order it never ran in.
    var preTrace = mdbPageCreator_tracePreLookup || trace,
        s2 = mdbPageCreator_reasoningSection( "2", "Title fixed and cleaned", "the first parse, before the wiki was asked anything: typos, decoration, credits and the date, taken out of the player title - and the curated channel → show rules when one applied. \"?\" shows the rule list a step worked off" );

    if( preTrace ) {
        var preSteps = mdbPageCreator_reasoningSteps( preTrace.steps );

        if( preSteps.length ) s2.append( preSteps );
        else s2.append( $("<div>").addClass( "mdb-pageCreator-reasoning-empty" ).text( "Nothing had to be fixed or removed." ) );

        // What this pass built, as ONE chip - the whole title, never re-split into chunks
        // (showing the units is section 1's job, and a second splitter here could disagree
        // with it). Grey like section 1's chips: chips are coloured by STATE, and before the
        // wiki has answered this title is only a candidate - it stands green (final) in 4.
        if( mdbPageCreator_titlePreLookup ) {
            s2.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).text( "Title candidate:" ),
                mdbPageCreator_reasoningChips( [ mdbPageCreator_titlePreLookup ] )
            );
        }
    }

    panel.append( s2 );

    // 3) the MixesDB lookups. The categories of section 6 are computed here already: the
    // asked-name chips answer that section by colour - green when the name ended up a
    // category of the new page, red when it did not.
    var s3 = mdbPageCreator_reasoningSection( "3", "Category candidate lookups on MixesDB", "one request, fired off the CHUNKS of 1 (plus the channel and the names the first parse read out of them) - not off the cleaned title of 2. Sorted by the role the title's shape gives each name BEFORE the wiki answers - who could be the artist, what could be the entity - each with what the wiki's own category names say. Green chips became categories of 6, red ones did not. The % behind an answer is how strongly it backs the name; hover it for what lowered it" ),
        entries = mdbPageCreator_categoryEntries( title ),
        catKeys = {};

    for( i = 0; i < entries.length; i++ ) {
        if( entries[i].name ) catKeys[ mdbTitle_normalizeCompare( entries[i].name ) ] = true;
    }

    if( lookupLog.length ) {
        // The candidate ROLES are decided from the title's shape before the lookup fires
        // (mdbTitle_candidateRoles): the chips sit in the column of what they were asked
        // FOR, not merely of what came back. typeof-guarded like the trace - a stale cached
        // title_builder.js without roles files every chip in both columns.
        var roles = ( typeof mdbTitle_candidateRoles !== "undefined" && mdbTitle_candidateRoles ) ? mdbTitle_candidateRoles : {},
            // where each name came from (mdbTitle_candidateSources) - the channel stands in no
            // chunk, and a chunk is asked without its episode number, so a chip that quotes
            // neither section 1 nor section 2 reads as invented without this
            sources = ( typeof mdbTitle_candidateSources !== "undefined" && mdbTitle_candidateSources ) ? mdbTitle_candidateSources : {},
            lookups = $("<div>").addClass( "mdb-pageCreator-reasoning-lookups" ),
            artistCol = mdbPageCreator_reasoningLookupColumn( "Artist category candidates" ),
            entityCol = mdbPageCreator_reasoningLookupColumn( "Entity category candidates" ),
            m;

        for( i = 0; i < lookupLog.length; i++ ) {
            var entry = lookupLog[i],
                cached = Object.prototype.hasOwnProperty.call( cache, entry.key ) ? cache[entry.key] : "",
                matches = ( cached && cached.matches ) ? cached.matches : [],
                // read before the matches are rendered: it is part of what each answer is worth,
                // not only a line under them
                overruledBy = mdbPageCreator_lookupOverruledBy( trace, entry.key ),
                // The recorded role is a STRING - "artist" | "entity" - and a name without one
                // (an edited title's extra lookups) files in both columns. Reading .artist off
                // the string was the bug that dropped every answerless candidate from the
                // panel: a string has neither property, so a name the wiki answered empty for
                // ("MNMT Recordings", asked as the entity) rendered in no column at all.
                roleName = roles[ entry.key ] || "",
                askArtist = roleName !== "entity",
                askEntity = roleName !== "artist",
                isCat = !!catKeys[ entry.key ],
                hasArtistAnswer = false,
                hasEntityAnswer = false;

            // an answer of a type the shape did not expect still pulls the chip into that
            // column: the wiki also knowing "MONUMENT" as an artist is worth seeing even
            // where the parse reads the name as the series
            for( m = 0; m < matches.length; m++ ) {
                if( String( matches[m].type || "" ) === "artist" ) { hasArtistAnswer = true; }
                else { hasEntityAnswer = true; }
            }

            // no role argument: the COLUMN is the role, and passing one shifted isCat and
            // overruledBy a slot along - which painted every chip green ("artist" is truthy)
            // and put the boolean into the overruled note
            if( askArtist || hasArtistAnswer ) {
                mdbPageCreator_reasoningLookupRow( artistCol, entry, matches, isCat, overruledBy, sources[ entry.key ] );
            }
            if( askEntity || hasEntityAnswer ) {
                mdbPageCreator_reasoningLookupRow( entityCol, entry, matches, isCat, overruledBy, sources[ entry.key ] );
            }
        }

        if( !artistCol.count ) artistCol.col.append( mdbPageCreator_reasoningNote( "no candidates of this role in this title", "muted" ) );
        if( !entityCol.count ) entityCol.col.append( mdbPageCreator_reasoningNote( "no candidates of this role in this title", "muted" ) );

        s3.append( lookups.append( artistCol.col, entityCol.col ) );
    } else {
        s3.append( $("<div>").addClass( "mdb-pageCreator-reasoning-empty" ).text( "No names were looked up." ) );
    }

    // the other half of "why is this name here / that chunk not?": chunks section 1 shows
    // and this section deliberately never asked about
    var notAsked = ( typeof mdbTitle_chunksNotAsked !== "undefined" && mdbTitle_chunksNotAsked ) ? mdbTitle_chunksNotAsked : [];

    for( i = 0; i < notAsked.length; i++ ) {
        s3.append(
            $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                $("<span>").text( "Not asked:" ),
                $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-removed" ).text( notAsked[i].text ),
                $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( notAsked[i].why )
            )
        );
    }

    panel.append( s3 );

    // 4) the SECOND parse - the same cleanup re-run with the answers of 3 in hand. The same
    // stage as 2, run again (the parse is a loop, not a line: 1 -> 2 -> 3 -> 4 -> 5 with the
    // wiki asked between the two builds), which is what the sections' shared accent says.
    var s4 = mdbPageCreator_reasoningSection( "4", "Title refined after lookup learnings", "the same cleanup once more, now knowing what MixesDB has. Only what the answers CHANGED is listed; everything else ran exactly as in 2. One stage remains: 5 may still refine the format" );

    if( trace && mdbPageCreator_tracePreLookup && trace !== mdbPageCreator_tracePreLookup ) {
        var added = mdbPageCreator_reasoningStepsAdded( preTrace.steps, trace.steps ),
            gone = mdbPageCreator_reasoningStepsAdded( trace.steps, preTrace.steps ),
            titleChanged = mdbPageCreator_titlePostLookup &&
                           mdbPageCreator_titlePostLookup !== mdbPageCreator_titlePreLookup,
            // What the answers did to the SUGGESTION, written as a step of its own and put
            // FIRST - it is the headline of this section, and on most titles the only thing
            // in it: the branches the answers open write no cleanup step (the venue reading
            // composes "A @ Venue, City" at the exit), so the diff below is empty while
            // everything visible changed. One list, so it renders in one grid with the rest
            // and the two columns line up.
            rows = added.slice();

        if( titleChanged ) {
            rows.unshift( {
                label: "The suggestion changed",
                detail: mdbPageCreator_titlePreLookup + " -> " + mdbPageCreator_titlePostLookup
            } );
        }

        var addedRows = mdbPageCreator_reasoningSteps( rows );

        if( addedRows.length ) s4.append( addedRows );

        if( titleChanged ) {
            s4.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                    mdbPageCreator_reasoningNote( "why this name and not that one is the \"picked as …\" line of each category in 6", "muted" )
                )
            );
        }

        // a step the answers made STOP happening is the same news the other way round - the
        // venue branch turning a title live is what drops its place-list removal, and a
        // reader comparing 2 with the title on screen would otherwise miss it
        for( i = 0; i < gone.length; i++ ) {
            s4.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                    $("<span>").text( "No longer done:" ),
                    $("<span>").addClass( "mdb-pageCreator-reasoning-step-label" ).text( gone[i].label ),
                    $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( "the wiki's answers took this title down another branch" )
                )
            );
        }

        // added/gone, not addedRows: the suggestion row above is not a cleanup step, and
        // counting it would swallow the one line that says the cleanup itself ran the same
        if( !added.length && !gone.length ) {
            s4.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                    mdbPageCreator_reasoningNote( titleChanged
                        ? "no cleanup step ran differently - the answers changed which name got which slot, not what was taken out of the title"
                        : "the answers changed nothing - the suggestion is the one 2 built, and what they confirmed is in 6", "muted" )
                )
            );
        }

        // The title this build made, still as a grey CANDIDATE chip: one title stage remains
        // (the recent-pages analysis of 5), and the green "Final title:" chip closes THAT
        // section now - two "final" chips would contradict each other.
        if( mdbPageCreator_titlePostLookup ) {
            s4.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).text( "Title after lookup:" ),
                mdbPageCreator_reasoningChips( [ mdbPageCreator_titlePostLookup ] )
            );
        }
    } else {
        // before the answer is in (and after a title edit, which re-renders without rebuilding)
        s4.append( mdbPageCreator_reasoningNote( "the second parse has not run yet - the title on screen is the one 2 built", "muted" ) );
    }

    panel.append( s4 );

    // 5) the recent-pages TITLE analysis - the third title stage, sharing 2/4's orange accent:
    // what the entity's own newest pages settled about the format, and the final title
    panel.append( mdbPageCreator_reasoningRecentTitle( title ) );

    // 6) the categories of the created page - read off the CURRENT title (the same entries
    // section 3's chip colours were computed from), like the page text
    var s6 = mdbPageCreator_reasoningSection( "6", "Categories for the mix page", "read off the title above" ),
        cats = $("<div>").addClass( "mdb-pageCreator-reasoning-cats" );

    // typeof-guarded like the rest of the trace: a stale cached title_builder.js without picks
    // must cost the reader the "why" line, not the section
    var picks = ( trace && trace.picks ) ? trace.picks : null;

    for( i = 0; i < entries.length; i++ ) {
        cats.append( mdbPageCreator_reasoningCategoryRow( entries[i], cache, picks ) );
    }

    s6.append( cats );
    panel.append( s6 );

    // 7) the recent-pages PAGE TEXT analysis - what the same pages' wikitext settles about
    // the page the "Create" link writes. Last: it is about the page, no longer about the title
    panel.append( mdbPageCreator_reasoningRecentText( title ) );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist
 *
 * Uploaders write the tracklist into the description, and it was being retyped by hand into
 * every mix page created from one. tracklist_detector.js finds it in that description (or, when
 * there is none there, in a comment), MixesDB's Tracklist Editor API turns it into wiki syntax,
 * and it lands in an editable box next to the player - the same #tlEditor box TrackId.net and RA
 * use, so it looks and behaves like the tracklist boxes contributors already know.
 *
 * What is in that box at the moment "Create" is clicked is what goes onto the page - not what
 * was detected. The box is there to be corrected, and a tracklist nobody checked is exactly the
 * kind that needs to be.
 *
 * An edited box re-formats itself when the editor LEAVES it: the shared blur update in
 * ../tracklist_editor/funcs.js (tlBoxBlurUpdate) sends the text through the API again, writes
 * the answer back and hands the verdict to this file (mdbPageCreator_tracklistBoxUpdated), so
 * the "Tracklist:" category and the reasoning panel follow the edit while it is still on
 * screen.
 *
 * The way into the click is the safety net behind it, for the text no blur got to finish:
 * "Create" clicked straight out of the textarea fires BEFORE the box's blur ever runs, and
 * Enter in the title field fires with the caret nowhere near the box. It does the same work
 * the blur update does - the answer's TEXT lands in the box and on the page, the FEEDBACK
 * decides the colour and the "Tracklist:" category - and rewriting here is as safe as on
 * blur, for the same reason: clicking "Create" says the typing is done.
 *
 * Two ways in, because the update must also be SEEN:
 * - a PLAIN left click (and Enter) is intercepted and the navigation HELD BACK: the box greys
 *   out for the shared minimum, scrolled into view if it sits below the fold, and the edit
 *   form only opens once the answer is in the box (mdbPageCreator_createAfterTracklistUpdate).
 *   A synchronous ask could never be seen - it blocks the paint, and the moment it returned
 *   the new tab took the screen.
 * - middle, right and cmd/ctrl/shift-clicks navigate natively off the href, so for them the
 *   ask stays synchronous at mousedown (mdbPageCreator_validateTracklist) - and their flash
 *   after the fact IS visible, since these clicks leave the page on screen.
 *
 *
 * Detected, formatted, shown - three steps, not one
 * -------------------------------------------------
 * Detecting costs nothing (it is a regex over text we already have); formatting costs a request
 * to the Tracklist Editor API. So the second step waits for a reason:
 *
 *   - the mix is NOT on MixesDB yet -> format straight away. The whole point is the "Create"
 *     link, and it has to carry the tracklist the moment it is clicked.
 *   - the mix IS on MixesDB already -> only the headline is put on the page, and the API is not
 *     asked at all until someone clicks it. Nothing on such a page needs the tracklist by
 *     itself; it is there to be compared with the one the wiki has, which is a decision only the
 *     reader makes. Most of these clicks never happen, and every one that does not is a request
 *     saved.
 *
 * Either way the headline toggles the box after that, and the toggle never asks the API twice.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// the box, wherever the site script put it - looked up by selector for the same reason the row's
// target is (these pages re-render, a captured node would be the detached old one)
var mdbPageCreator_tracklistBoxSelector = "#mdb-pageCreator-tracklist #mixesdb-TLbox",
    mdbPageCreator_tracklistFeedback = null,
    // what the detector found, before the API has seen it - the raw lines out of the description
    mdbPageCreator_tracklistDetected = null,
    // whether the box is shown. Starts open for a mix that has no MixesDB page yet, closed for
    // one that has - see the header.
    mdbPageCreator_tracklistOpen = false,
    // whether that decision has been made. Once it has, a re-render must not remake it: the
    // toolkit verdict is reset to null on every rebuild, and the editor may have closed a box we
    // would otherwise force back open (and would have to wait for a verdict to do it).
    mdbPageCreator_tracklistDecided = false;

/*
 * mdbPageCreator_resetForNewPage
 * Called by mdbResetForNewPage() in global.js whenever the site navigates without loading a
 * document (see onUrlChange() there). Everything above is deliberately STICKY against a
 * re-render - a detected tracklist survives it, and so does the reader's decision about
 * whether the box is open. A navigation is the one event where that stickiness is wrong:
 * without this, the next mix would open showing the previous one's tracklist.
 *
 * The row and the box themselves are removed by global.js - only the bookkeeping is here.
 */
function mdbPageCreator_resetForNewPage() {
    logFunc( "mdbPageCreator_resetForNewPage" );

    mdbPageCreator_title = "";
    mdbPageCreator_confidencePercent = 0;
    mdbPageCreator_confidenceReasons = [];
    mdbPageCreator_promoCategory = false;
    mdbPageCreator_playerUrl = "";
    mdbPageCreator_durationMs = 0;
    mdbPageCreator_artworkUrl = "";
    mdbPageCreator_sourceTitle = "";
    mdbPageCreator_sourceChannel = "";
    mdbPageCreator_sourceDate = "";
    mdbPageCreator_sourceLabel = "";
    mdbPageCreator_reportOpen = false;
    mdbPageCreator_hintsLogged = "";
    mdbPageCreator_openDefinitions = {};
    mdbPageCreator_openUsedCatRecent = {};

    // The polls are the reason this cannot just null the values: each is an interval still
    // asking about the mix the reader has already left.
    if( mdbPageCreator_toolkitPoll ) clearInterval( mdbPageCreator_toolkitPoll );
    if( mdbPageCreator_tracklistPoll ) clearInterval( mdbPageCreator_tracklistPoll );
    if( mdbPageCreator_categoryTimer ) clearTimeout( mdbPageCreator_categoryTimer );
    if( mdbPageCreator_reasoningReadyPoll ) clearInterval( mdbPageCreator_reasoningReadyPoll );
    mdbPageCreator_toolkitPoll = null;
    mdbPageCreator_tracklistPoll = null;
    mdbPageCreator_categoryTimer = null;
    mdbPageCreator_reasoningReadyPoll = null;
    mdbPageCreator_toolkitVerdict = null;

    // The reasoning panel's sources (title_builder.js, @require'd before this file): the trace
    // describes the previous mix's build, and the lookup log lists names asked FOR that mix.
    // The CACHE is deliberately kept - an answer about a name does not change from page to
    // page. The candidate roles go with the log: the same name can play a different role in
    // the next mix's title. typeof-guarded - a stale cached title_builder.js has no roles.
    mdbTitle_trace = null;
    mdbPageCreator_tracePreLookup = null;
    mdbPageCreator_titlePreLookup = "";
    mdbPageCreator_titlePostLookup = "";
    // the recent-pages refinement is about the previous mix's title - what was LEARNED about
    // its category stays, in mdbPageCreator_recentAnalysisCache
    mdbPageCreator_titlePreRecent = "";
    mdbPageCreator_titlePostRecent = "";
    mdbPageCreator_recentTitleChanges = [];
    mdbTitle_lookupLog = [];
    if( typeof mdbTitle_candidateRoles !== "undefined" ) mdbTitle_candidateRoles = {};
    if( typeof mdbTitle_candidateSources !== "undefined" ) mdbTitle_candidateSources = {};
    if( typeof mdbTitle_chunksNotAsked !== "undefined" ) mdbTitle_chunksNotAsked = [];

    mdbPageCreator_tracklistFeedback = null;
    mdbPageCreator_tracklistDetected = null;
    mdbPageCreator_tracklistOpen = false;
    mdbPageCreator_tracklistDecided = false;
    mdbPageCreator_tracklistSource = "";
    mdbPageCreator_tracklistFormatted = "";
    mdbPageCreator_tracklistLive = "";
    mdbPageCreator_tracklistStatus = "";
    mdbPageCreator_tracklistValidated = null;
    mdbPageCreator_tracklistChecked = false;

    // Kept on purpose: mdbPageCreator_target / _tracklistTarget / _tracklistBoxSite /
    // _stylesBoxSite are selector strings naming where on THIS SITE the row and the boxes
    // live, which does not change from one mix to the next, and the site script's next
    // mdbPageCreator_add() may well omit them.
}

// mdbPageCreator_addTracklist
// The second entry point a site script calls, next to mdbPageCreator_add():
//
//     mdbPageCreator_addTracklist({
//         description:  track.description,       // the description text, as the site's API gives it
//         loadComments: function( done ) { ... }, // optional, see below
//         target:       "#mdb-toggle-target",     // where the box goes - above the description
//         placement:    "after"                   // after|before|append|prepend
//     });
//
// loadComments is only ever called when the description held no tracklist, and it is called with
// a callback that takes an array of comment BODIES (plain strings). Fetching them is the site
// script's job - it owns the API token and knows the endpoint - deciding whether they are worth
// fetching is this file's.
function mdbPageCreator_addTracklist( options ) {
    logFunc( "mdbPageCreator_addTracklist" );

    var o = options || {};

    if( o.target ) mdbPageCreator_tracklistTarget = o.target;
    if( o.placement ) mdbPageCreator_tracklistPlacement = o.placement;

    // A site that re-renders under us calls this again after every rebuild. Nothing is detected
    // or asked of the API a second time then - the headline is simply put back, and with it the
    // box, holding whatever the editor had typed into it before the re-render took it away.
    if( mdbPageCreator_tracklistDetected ) {
        log( "mdbPageCreator_addTracklist: tracklist already known - re-rendering only." );
        mdbPageCreator_renderTracklist();
        return;
    }

    // Looked once, found nothing. Without this a page that re-renders often would ask the site
    // for its comments again on every single rebuild - one request each, for an answer that
    // cannot have changed.
    if( mdbPageCreator_tracklistChecked ) return;
    mdbPageCreator_tracklistChecked = true;

    var found = mdbTracklist_detectInText( o.description );

    if( found ) {
        mdbPageCreator_useTracklist( found, "description" );
        return;
    }

    if( typeof o.loadComments !== "function" ) {
        log( "mdbPageCreator_addTracklist: nothing in the description and this site cannot read comments." );
        return;
    }

    log( "mdbPageCreator_addTracklist: nothing in the description - asking the site for the comments." );

    // Another request whose answer can outlive the page it was asked for - these are the
    // PREVIOUS mix's comments once the reader has clicked on. See mdbPageGeneration in global.js.
    var pageGeneration = mdbPageGeneration;

    o.loadComments(function( comments ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        var fromComments = mdbTracklist_detectInComments( comments );

        if( fromComments ) mdbPageCreator_useTracklist( fromComments, "comments" );
    });
}

// mdbPageCreator_useTracklist
// What the detector found, kept as it stands. The API is NOT asked here - see the header on why
// that waits.
function mdbPageCreator_useTracklist( found, source ) {
    logVar( "mdbPageCreator_useTracklist: source", source );
    log( "mdbPageCreator_useTracklist: " + found.lines + " lines detected:\n" + found.text );

    mdbPageCreator_tracklistDetected = found;
    mdbPageCreator_tracklistSource = source;

    mdbPageCreator_renderTracklist();
}

// mdbPageCreator_formatTracklist
// The detected lines through the Tracklist Editor API: "standard" is the same conversion the
// wiki's own editor runs, so what lands in the box is already wiki syntax and already judged
// complete or not. Asked once - a second call finds the answer already here and returns it.
function mdbPageCreator_formatTracklist() {
    if( mdbPageCreator_tracklistFormatted ) return true;
    if( !mdbPageCreator_tracklistDetected ) return false;

    logFunc( "mdbPageCreator_formatTracklist" );

    var res = apiTracklist( mdbPageCreator_tracklistDetected.text, "standard" );

    if( !res || !res.text ) {
        log( "mdbPageCreator_formatTracklist: the Tracklist Editor API returned nothing - no box." );
        return false;
    }

    mdbPageCreator_tracklistFormatted = res.text;
    mdbPageCreator_tracklistLive = res.text;
    mdbPageCreator_tracklistValidated = res.text;
    mdbPageCreator_tracklistFeedback = res.feedback || null;
    mdbPageCreator_tracklistStatus = ( res.feedback && res.feedback.status ) || "";

    logVar( "mdbPageCreator_formatTracklist: status", mdbPageCreator_tracklistStatus || "(neither)" );

    return true;
}

// mdbPageCreator_tracklistTargetNode
// .first(): a site whose layout renders the target twice (SoundCloud ships a hidden responsive
// duplicate of its track header) would otherwise get a box next to each of them.
function mdbPageCreator_tracklistTargetNode() {
    return mdbPageCreator_tracklistTarget ? $( mdbPageCreator_tracklistTarget ).first() : $();
}

// mdbPageCreator_waitForTracklist
// Two things have to be there before the headline can go up: the node it hangs off (the toolkit,
// on every site so far, which is a MixesDB API call away) and the toolkit's VERDICT, since that
// is what decides whether the API is asked now or on a click. Polling rather than
// waitForKeyElements for the same reason mdbPageCreator_watchToolkit() polls: toolkit.js already
// watches those nodes, and waitForKeyElements keeps a single "alreadyFound" flag per element, so
// a second watcher on them would starve whichever of the two runs second.
function mdbPageCreator_waitForTracklist() {
    if( mdbPageCreator_tracklistPoll ) return; // already waiting for this very thing

    var tries = 0,
        maxTries = 100; // 100 * 300ms = 30s

    mdbPageCreator_tracklistPoll = setInterval(function() {
        var there = mdbPageCreator_tracklistTargetNode().length,
            answered = ( mdbPageCreator_tracklistDecided || mdbPageCreator_toolkitVerdict !== null );

        if( !( there && answered ) && ++tries < maxTries ) return;

        clearInterval( mdbPageCreator_tracklistPoll );
        mdbPageCreator_tracklistPoll = null;

        if( there ) {
            // A verdict that never came is treated as "no page yet": the costly mistake is the
            // other one - a "Create" link that starts a page without the tracklist we had.
            if( !answered ) log( "mdbPageCreator_waitForTracklist: no toolkit verdict after " + maxTries + " tries - going ahead as if the mix had no page yet." );
            mdbPageCreator_renderTracklist();
        } else {
            log( "mdbPageCreator_waitForTracklist: gave up waiting for \"" +
                 mdbPageCreator_tracklistTarget + "\" after " + maxTries + " tries - no tracklist box." );
        }
    }, 300);
}

// mdbPageCreator_renderTracklist
// Puts the headline on the page, and the box under it if it is to be open. Not gated behind the
// toolkit verdict the way the row is - a tracklist next to a player is worth having whether or
// not the mix already has a page - but the verdict does decide whether it starts open.
function mdbPageCreator_renderTracklist() {
    if( !mdbPageCreator_tracklistDetected ) return;
    if( $("#mdb-pageCreator-tracklist").length ) return; // still on the page

    var target = mdbPageCreator_tracklistTargetNode();

    if( !target.length || !( mdbPageCreator_tracklistDecided || mdbPageCreator_toolkitVerdict !== null ) ) {
        log( "mdbPageCreator_renderTracklist: waiting for \"" + mdbPageCreator_tracklistTarget + "\" and the toolkit verdict." );
        mdbPageCreator_waitForTracklist();
        return;
    }

    logFunc( "mdbPageCreator_renderTracklist" );

    // The mix has no page yet -> the box is what the "Create" link will carry, so it is opened
    // (and formatted) right away. It has one -> the headline alone, until someone asks.
    // Once only: after a re-render this keeps whatever state the box was in.
    if( !mdbPageCreator_tracklistDecided ) {
        mdbPageCreator_tracklistDecided = true;
        mdbPageCreator_tracklistOpen = ( mdbPageCreator_toolkitVerdict !== "used" );

        logVar( "mdbPageCreator_renderTracklist: toolkit verdict", mdbPageCreator_toolkitVerdict || "(none)" );
        logVar( "mdbPageCreator_renderTracklist: opening the box right away", mdbPageCreator_tracklistOpen );
    }

    var wrapper = $("<div>").attr( "id", "mdb-pageCreator-tracklist" );

    wrapper.append( mdbPageCreator_tracklistHeadline() );

    switch( mdbPageCreator_tracklistPlacement ) {
        case "before":  target.before( wrapper ); break;
        case "append":  target.append( wrapper ); break;
        case "prepend": target.prepend( wrapper ); break;
        default:        target.after( wrapper );
    }

    if( mdbPageCreator_tracklistOpen ) mdbPageCreator_buildTracklistBox( wrapper );

    mdbPageCreator_syncTracklistOpenClass();
}

// mdbPageCreator_tracklistHeadline
// "Tracklist (from description)": the word is a <strong> and the toggle, the bracket is an <abbr>
// carrying the explanation. Two elements rather than one because they do two different things -
// a tooltip on the word would fight the click, and a click on the explanation means nothing.
function mdbPageCreator_tracklistHeadline() {
    var fromComments = ( mdbPageCreator_tracklistSource == "comments" ),
        word = $("<strong>")
            .addClass( "mdb-highlight hand" )
            .text( "Tracklist" ),
        where = $("<abbr>")
            .text( fromComments ? "from a comment" : "from description" )
            .attr( "title", fromComments
                ? "Found in a comment under this track, because the description had none, and formatted by MixesDB's Tracklist Editor.\nGoes into the page the \"Create\" link starts - please check it here first."
                : "Found in this track's description and formatted by MixesDB's Tracklist Editor.\nGoes into the page the \"Create\" link starts - please check it here first." );

    word.on( "click", function() {
        mdbPageCreator_toggleTracklist();
    });

    return $("<div>")
        .attr( "id", "mdb-pageCreator-tracklist-headline" )
        .addClass( "mdb-grey" )
        .append( word, " ", where );
}

// mdbPageCreator_toggleTracklist
// The click on the word. The first one on a mix that already has a MixesDB page is also the one
// that pays for the API call; every one after that only shows and hides what is already there.
function mdbPageCreator_toggleTracklist() {
    var wrapper = $("#mdb-pageCreator-tracklist");

    if( !wrapper.length ) return;

    mdbPageCreator_tracklistOpen = !mdbPageCreator_tracklistOpen;
    logVar( "mdbPageCreator_toggleTracklist: open", mdbPageCreator_tracklistOpen );

    if( mdbPageCreator_tracklistOpen ) {
        if( wrapper.find("#tlEditor").length ) {
            wrapper.find("#tlEditor").show();
        } else {
            mdbPageCreator_buildTracklistBox( wrapper );
        }
    } else {
        wrapper.find("#tlEditor").hide();
    }

    mdbPageCreator_syncTracklistOpenClass();
}

// mdbPageCreator_syncTracklistOpenClass
// Drives the caret in page_creator.css. A class rather than a second element, so the headline
// stays the two things it says it is.
function mdbPageCreator_syncTracklistOpenClass() {
    $("#mdb-pageCreator-tracklist").toggleClass( "mdb-pageCreator-tracklist-open", mdbPageCreator_tracklistOpen );
}

// mdbPageCreator_buildTracklistBox
// The box itself: formats if that has not happened yet, then puts the textarea and the feedback
// under the headline. After a re-render it is rebuilt from the values already here - the API is
// never asked a second time for the same tracklist.
function mdbPageCreator_buildTracklistBox( wrapper ) {
    if( !mdbPageCreator_formatTracklist() ) {
        mdbPageCreator_tracklistOpen = false;
        return;
    }

    logFunc( "mdbPageCreator_buildTracklistBox" );

    wrapper.append( $( ta ) );

    var box = wrapper.find("#mixesdb-TLbox").val( mdbPageCreator_tracklistLive );

    // false: the box must NOT select itself here. Everywhere else a tracklist box appears
    // because the user asked for one and wants to copy it; this one appears on its own next to a
    // track they are listening to, and taking the caret and scrolling the page to it would be a
    // nuisance rather than a service.
    fixTLbox( mdbPageCreator_tracklistFeedback, wrapper, false );

    // the live value, so a re-render can put the editor's own version back rather than the
    // detected one - and so the "Create" link has something to read before the box is rebuilt
    box.on( "input change", function() {
        mdbPageCreator_tracklistLive = box.val();
    });
}

// mdbPageCreator_tracklistText
// What is in the box right now. Falls back to the last value seen, for the moment between a
// re-render wiping the box and mdbPageCreator_renderTracklist() putting it back.
// A site that named its own box (tracklistBox option) is read instead of the creator's - for
// such a site the fallback is simply empty, since the box's lifecycle is not ours.
function mdbPageCreator_tracklistText() {
    var box = $( mdbPageCreator_tracklistBoxSite || mdbPageCreator_tracklistBoxSelector );

    if( box.length ) return $.trim( box.val() || "" );

    return $.trim( mdbPageCreator_tracklistLive || "" );
}

// mdbPageCreator_validateTracklist
// Asks the API what it makes of the box AS IT STANDS - the SYNCHRONOUS way into "Create",
// for the paths that navigate natively off the href and cannot wait for a callback: middle,
// right and cmd/ctrl/shift-clicks (their mousedown), plus the fallback of the intercepted
// click when there is no box or no async pieces. The plain left click takes
// mdbPageCreator_createAfterTracklistUpdate instead, which shows the update before opening.
//
// Since 2026-08-17 this path takes the API's TEXT too, exactly like the blur update: the
// click says the typing is done, and the page must not open with a rawer tracklist than the
// box would have shown a moment later. The request blocks until the answer is in the box -
// these callers read the href right after - and the box flashes its updating state briefly
// AFTER the fact, since the blocked thread could not have painted it during the request;
// for these clicks the page stays on screen, so the flash is actually seen.
function mdbPageCreator_validateTracklist() {
    var tl = mdbPageCreator_tracklistText();

    if( !tl ) {
        mdbPageCreator_tracklistStatus = "";
        return;
    }

    if( tl === mdbPageCreator_tracklistValidated ) return; // unchanged since the last answer

    logFunc( "mdbPageCreator_validateTracklist" );

    var res = apiTracklist( tl, "standard" );

    if( !res || !res.feedback ) {
        log( "mdbPageCreator_validateTracklist: no feedback from the API - keeping the last one." );
        return;
    }

    // The box the "Create" link reads - the site's own when one was named, the creator's
    // otherwise. typeof-guarded like every stale-cache seam: a page_creator.js ahead of its
    // cached tracklist_editor/funcs.js must fall back to the feedback-only path, not break
    // the click.
    var box = $( mdbPageCreator_tracklistBoxSite || mdbPageCreator_tracklistBoxSelector ).first();

    if( box.length && typeof tlBoxApplyResult === "function" && tlBoxApplyResult( box, res ) ) {
        log( "mdbPageCreator_validateTracklist: the API's text is in the box - the page carries it formatted." );

        // announce the rewrite the way the blur update announces its own
        box.addClass( "mdb-tlBox-updating" );
        setTimeout(function() {
            box.removeClass( "mdb-tlBox-updating" );
        }, tlBoxUpdateMinMs );

        // the same bookkeeping the blur update hands over: live and validated text, feedback,
        // status - and the reasoning panel's category row
        mdbPageCreator_tracklistBoxUpdated( box, res );
        return;
    }

    // No box on the page (a re-render just took it), or no usable text in the answer: keep
    // the text as it stands, take the feedback - the click still files the right category.
    mdbPageCreator_tracklistValidated = tl;
    mdbPageCreator_tracklistFeedback = res.feedback;
    mdbPageCreator_tracklistStatus = res.feedback.status || "";

    logVar( "mdbPageCreator_validateTracklist: status", mdbPageCreator_tracklistStatus || "(neither)" );

    // re-colours the box and replaces the printed feedback, and leaves the text alone -
    // the site's own box when one was named, the creator's otherwise
    fixTLbox( mdbPageCreator_tracklistFeedback, mdbPageCreator_tracklistBoxSite || "#mdb-pageCreator-tracklist", false );

    mdbPageCreator_tracklistLive = mdbPageCreator_tracklistText();
}

// mdbPageCreator_tracklistBoxUpdated
// Called by the shared box updates in ../tracklist_editor/funcs.js after the API answered
// about a box: the blur update and the "Create" click, which wrote the answer's TEXT into the
// box, and the live check while typing, which only re-coloured it. Only the boxes the "Create"
// link reads concern the creator: its own, or the one the site named (tracklistBox option) -
// a box some other feature put on the page is none of its business.
//
// applied (default true) is that difference. The FEEDBACK is taken either way - it is what
// files the "Tracklist:" category, and a category that follows the typing is the point of the
// live check. The text is only marked validated when it was actually applied: while typing,
// the box still holds unformatted text that the blur or the click owes a formatting pass, and
// marking it validated would skip exactly that pass.
//
// The reasoning panel is re-rendered because its section 6 files that category: the render is
// the whole stateless panel, but with the title untouched sections 1-3 come out unchanged -
// what the reader sees change is the category row. Deliberately NOT
// mdbPageCreator_queueCategoryUpdate(), which is the title-edit path and would fire a name
// lookup the tracklist cannot have changed.
function mdbPageCreator_tracklistBoxUpdated( box, res, applied ) {
    var isOwn = box.closest( "#mdb-pageCreator-tracklist" ).length > 0,
        isSite = mdbPageCreator_tracklistBoxSite && box.is( mdbPageCreator_tracklistBoxSite );

    if( !isOwn && !isSite ) return;

    logFunc( "mdbPageCreator_tracklistBoxUpdated" );

    // the creator's own box: keep the live value in step, so a re-render puts the updated
    // text back (the updates set .val(), which fires no input event)
    if( isOwn ) mdbPageCreator_tracklistLive = box.val();

    if( res.feedback ) {
        // only the text the API actually rewrote counts as validated - see above
        if( applied !== false ) mdbPageCreator_tracklistValidated = $.trim( box.val() || "" );

        mdbPageCreator_tracklistFeedback = res.feedback;
        mdbPageCreator_tracklistStatus = res.feedback.status || "";

        logVar( "mdbPageCreator_tracklistBoxUpdated: status", mdbPageCreator_tracklistStatus || "(neither)" );
    }

    // no-op unless the report box is open and the panel is on the page
    mdbPageCreator_renderReasoning( $("#mdb-pageCreator") );
}

// mdbPageCreator_tracklistFiling
// The "Tracklist:" category of the page being created. Only the API's own "complete" earns
// Tracklist: complete - a tracklist it had a warning or a hint about, or one it called
// incomplete, is filed as incomplete, which is the value that costs nothing if it is wrong.
function mdbPageCreator_tracklistFiling() {
    if( !mdbPageCreator_tracklistText() ) return "none";

    return mdbPageCreator_tracklistStatus == "complete" ? "complete" : "incomplete";
}

// mdbPageCreator_tracklistWikitext
// MixesDB writes a tracklist either as a "#" numbered list - one line per track, every track
// named - or as plain lines inside <list> tags, which is what a tracklist with "?" tracks and
// "..." gaps needs, since a gap is no list item. The Tracklist Editor already decided which of
// the two this is; the "#" in its answer are that decision, so they are what is read here rather
// than the status.
function mdbPageCreator_tracklistWikitext() {
    var tl = mdbPageCreator_tracklistText();

    if( !tl ) return "<list>\n\n</list>";

    var lines = tl.split("\n"),
        i;

    for( i = 0; i < lines.length; i++ ) {
        var line = $.trim( lines[i] );

        if( line && line.indexOf("#") !== 0 ) return "<list>\n" + tl + "\n</list>";
    }

    return tl;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Loading skeleton
 *
 * A site's MixesDB additions build up asynchronously and each piece used to pop in on its
 * own - the toolkit once the MixesDB search answers, the page creator row once the verdict
 * is read, buttons/dates/tracklist box after their own API answers. mdbSkeleton_show()
 * covers that build-up with pulsing grey stand-ins (the .mdb-skeleton-loading class in
 * page_creator.css hides every other child of the covered container while it is up) and
 * mdbSkeleton_reveal() swaps skeleton and content in ONE step, so the area goes straight
 * from placeholder to complete.
 *
 * Nothing in here looks at a specific site. The site script names its container and its
 * stand-in rows:
 *
 *   mdbSkeleton_show({
 *       target:     "#mdb-sc-trackExtras",  // selector string of the container to cover -
 *                                           // ALL its other children are display:none'd,
 *                                           // so it must be a container the script owns
 *       rows:       [ "head", "dates", "buttons", "player", "toolkit" ], // any subset, in
 *                                           // order; default [ "toolkit" ]
 *       height:     300,                    // px, optional - default is the 230px in
 *                                           // page_creator.css
 *       keep:       ".mdb-player-audiostream", // optional - direct children matching this
 *                                           // stay visible while loading (and are skipped
 *                                           // by the reveal fade): an embedded player that
 *                                           // should show straight away, say. They must
 *                                           // already be in the container when show() runs
 *       extraReady: function() { ... }      // optional site condition on top of the
 *                                           // toolkit verdict (e.g. "my buttons are in")
 *   });
 *
 * Revealed when the toolkit verdict is in the DOM (the same li.filled selector
 * mdbPageCreator_watchToolkit() polls), extraReady() - if given - returns true, and nothing
 * has changed inside the container for mdbSkeleton_settleMs. A site that decided against
 * loading the toolkit at all on this page calls mdbSkeleton_noToolkit(), which stands in
 * for the verdict. The settle window is what lets
 * the page creator row and a tracklist box (which follow the verdict within a
 * waitForKeyElements poll or two) slip in before the swap. mdbSkeleton_maxMs caps the whole
 * wait: after that, whatever has arrived is shown as-is.
 *
 * SPA navigation and a site wiping the container both simply remove skeleton and container
 * together; the site script calls mdbSkeleton_show() again when it recreates the container,
 * which is why it starts by clearing the previous run's timers.
 *
 * window.mdbSkeleton_enabled (site script debug settings, default true) turns the covering
 * off: the pieces then pop in one by one as they used to, but the readiness watch still
 * runs and the time until everything has loaded is logged with the SAME wording in both
 * modes, so they can be compared log against log.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var mdbSkeleton_checkTimer = null,
    mdbSkeleton_capTimer = null,
    mdbSkeleton_observer = null,
    mdbSkeleton_lastMutation = 0,
    mdbSkeleton_startedAt = 0,
    mdbSkeleton_active = false,
    mdbSkeleton_target = "",
    mdbSkeleton_extraReady = null,
    mdbSkeleton_toolkitSkipped = false;

var mdbSkeleton_settleMs = 600,
    mdbSkeleton_maxMs = 6000;

// mdbSkeleton_noToolkit
// A site script that decided NOT to load the toolkit at all for this page says so here
// (SoundCloud skips it - and its MixesDB usage check - for tracks under MixesDB's 20 min
// minimum), otherwise the reveal would sit out the whole max wait for a verdict that is
// never coming. mdbSkeleton_show() resets it: a fresh container expects a toolkit again
// until the site script says otherwise for that one too.
function mdbSkeleton_noToolkit() {
    log( "mdbSkeleton_noToolkit: not waiting for a toolkit verdict on this page." );
    mdbSkeleton_toolkitSkipped = true;
}

// mdbSkeleton_html
// The stand-in rows, composed from the row names the site passed. The shapes and sizes live
// in page_creator.css; the sites share one vocabulary so the skeleton looks the same
// everywhere: "head" (headline + artwork bar), "dates", "buttons" (pill row), "player"
// (embed-sized block) and "toolkit" (the block that also absorbs the box's leftover height).
function mdbSkeleton_html( rows ) {
    function bars( n ) {
        var out = "", i;
        for( i = 0; i < n; i++ ) {
            out += '<div class="mdb-skeleton-bar"></div>';
        }
        return out;
    }

    var html = '<div id="mdb-skeleton">',
        i;

    for( i = 0; i < rows.length; i++ ) {
        switch( rows[i] ) {
            case "head":
                html += '<div class="mdb-skeleton-head">'
                      +     '<div class="mdb-skeleton-bar mdb-skeleton-headline"></div>'
                      +     '<div class="mdb-skeleton-bar mdb-skeleton-artwork"></div>'
                      + '</div>';
                break;
            case "dates":
                html += '<div class="mdb-skeleton-row mdb-skeleton-dates">' + bars(3) + '</div>';
                break;
            case "buttons":
                html += '<div class="mdb-skeleton-row mdb-skeleton-buttons">' + bars(3) + '</div>';
                break;
            case "player":
                html += '<div class="mdb-skeleton-bar mdb-skeleton-player"></div>';
                break;
            case "toolkit":
                html += '<div class="mdb-skeleton-block mdb-skeleton-toolkit">' + bars(2) + '</div>';
                break;
        }
    }

    return html + '</div>';
}

// mdbSkeleton_show
function mdbSkeleton_show( options ) {
    logFunc( "mdbSkeleton_show" );

    var wrapper = $( options.target );

    if( wrapper.length === 0 ) {
        log( "mdbSkeleton_show: \"" + options.target + "\" not found - nothing to cover." );
        return;
    }

    // A previous skeleton's timers may still be running (the site wiped the container
    // mid-load and recreated it) - they would reveal the new skeleton on the old clock.
    mdbSkeleton_stop();
    $("#mdb-skeleton").remove();

    mdbSkeleton_target = options.target;
    mdbSkeleton_extraReady = options.extraReady || null;
    mdbSkeleton_toolkitSkipped = false; // see mdbSkeleton_noToolkit()

    // Read at call time, not load time: the option lives in the site script, whose body
    // runs after this @require'd file.
    mdbSkeleton_active = window.mdbSkeleton_enabled !== false;

    if( mdbSkeleton_active ) {
        // Appended, not prepended, so a container whose first child carries layout duties
        // (SC's floated #mdb-sc-trackHead) keeps it. While loading the siblings are
        // display:none anyway, and the reveal removes the skeleton in the same step it
        // shows them.
        wrapper.append( mdbSkeleton_html( options.rows || [ "toolkit" ] ) ).addClass( "mdb-skeleton-loading" );

        // Marked rather than matched in the CSS, so the stylesheet stays static. Same
        // synchronous step as the class above - no frame ever paints them hidden.
        if( options.keep ) {
            wrapper.children( options.keep ).addClass( "mdb-skeleton-keep" );
        }

        if( options.height ) {
            $("#mdb-skeleton").css( "height", options.height + "px" );
        }
    } else {
        log( "mdbSkeleton_show: skeleton disabled (window.mdbSkeleton_enabled) - pieces pop in as they arrive, the load is only timed." );
    }

    mdbSkeleton_startedAt = Date.now();
    mdbSkeleton_lastMutation = mdbSkeleton_startedAt;

    // attributes:true because the toolkit verdict arrives as a class flip (.filled) on an
    // already-present li, not as a new node - it has to count as activity too.
    mdbSkeleton_observer = new MutationObserver(function() {
        mdbSkeleton_lastMutation = Date.now();
    });
    mdbSkeleton_observer.observe( wrapper.get(0), { childList: true, subtree: true, attributes: true, characterData: true } );

    mdbSkeleton_checkTimer = setInterval( mdbSkeleton_check, 150 );
    mdbSkeleton_capTimer = setTimeout(function() {
        mdbSkeleton_reveal( "max wait of " + mdbSkeleton_maxMs + "ms reached - not everything arrived" );
    }, mdbSkeleton_maxMs );

    log( "mdbSkeleton_show: " + ( mdbSkeleton_active ? "skeleton up" : "timing only" ) + " on \"" + mdbSkeleton_target + "\", waiting for the toolkit verdict" + ( mdbSkeleton_extraReady ? " + extraReady()" : "" ) + " (settle " + mdbSkeleton_settleMs + "ms, cap " + mdbSkeleton_maxMs + "ms)." );
}

// mdbSkeleton_check
function mdbSkeleton_check() {
    var wrapper = $( mdbSkeleton_target );

    // SPA navigation or the site's own re-render removed the container (and the skeleton
    // with it) - stop quietly, the site script starts a fresh skeleton when it recreates
    // the container. In timing-only mode there is no skeleton node to check.
    if( wrapper.length === 0 || ( mdbSkeleton_active && $("#mdb-skeleton").length === 0 ) ) {
        log( "mdbSkeleton_check: container or skeleton gone - stopping timers." );
        mdbSkeleton_stop();
        return;
    }

    // the exact selector mdbPageCreator_watchToolkit() polls for the verdict - unless the
    // site script said there will be no toolkit on this page (mdbSkeleton_noToolkit)
    var toolkitDone = mdbSkeleton_toolkitSkipped || $("#mdb-toolkit > ul > li.mdb-toolkit-usageLink.filled").length !== 0,
        extraDone = mdbSkeleton_extraReady ? mdbSkeleton_extraReady() : true,
        quietFor = Date.now() - mdbSkeleton_lastMutation;

    if( toolkitDone && extraDone && quietFor >= mdbSkeleton_settleMs ) {
        mdbSkeleton_reveal( "toolkit verdict" + ( mdbSkeleton_extraReady ? " + extraReady()" : "" ) + " present, container quiet for " + quietFor + "ms" );
    }
}

// mdbSkeleton_stop
function mdbSkeleton_stop() {
    if( mdbSkeleton_checkTimer ) { clearInterval( mdbSkeleton_checkTimer ); mdbSkeleton_checkTimer = null; }
    if( mdbSkeleton_capTimer )   { clearTimeout( mdbSkeleton_capTimer );    mdbSkeleton_capTimer = null; }
    if( mdbSkeleton_observer )   { mdbSkeleton_observer.disconnect();       mdbSkeleton_observer = null; }
}

// mdbSkeleton_reveal
function mdbSkeleton_reveal( reason ) {
    logFunc( "mdbSkeleton_reveal" );

    // The line the two modes are compared by - identical wording with and without skeleton.
    log( "mdbSkeleton_reveal: everything loaded " + ( Date.now() - mdbSkeleton_startedAt ) + "ms after the container was created (" + ( mdbSkeleton_active ? "skeleton shown" : "skeleton disabled, timing only" ) + "). Reason: " + reason + "." );

    mdbSkeleton_stop();

    // Timing-only mode: nothing to swap, the pieces are already on the page.
    if( !mdbSkeleton_active ) {
        return;
    }

    // Class off and skeleton out in the same synchronous step - no frame ever paints the
    // placeholder and the real content together. mdb-skeleton-revealed fades the children in.
    $( mdbSkeleton_target ).removeClass( "mdb-skeleton-loading" ).addClass( "mdb-skeleton-revealed" );
    $("#mdb-skeleton").remove();
}
