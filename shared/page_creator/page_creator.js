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
 *         channelTrust: "low",                       // optional - see below
 *         createdAt:   "2026-08-06T10:00:00Z",       // upload date, any Date-parsable form
 *         releaseDate: "",                           // optional, beats createdAt when set
 *         durationMs:  4321000,                      // optional, gates the 20 min minimum
 *         playerUrl:   "https://...",                // optional, goes into {{Player}}
 *         channelUrl:  "https://...",                // optional, the uploader's channel URL
 *         artworkUrl:  "https://...",                // optional, for MixesDB's upload form
 *         description: "01. Artist - Title [Label]", // optional, see below
 *         purchaseUrl: "https://...",                // optional, the "Buy" / download link
 *         sourceLabel: "SC",                         // optional, names the site in the report
 *         target:      "#mdb-trackHeader-headline",  // where the row goes
 *         placement:   "after"                       // after|before|append|prepend
 *     });
 *
 * channelTrust says how much the channel NAME is worth without confirmation. On SoundCloud
 * the account is the artist or the series most of the time, so the title builder may fall
 * back to it where the title names nobody - that is the default. On YouTube (and the other
 * planned players: Mixcloud, hearthis.at) the channel is at least as often a broadcaster or
 * re-uploader whose name has nothing to do with who played, so those sites pass "low": the
 * fallbacks then demand backing - the channel standing in the title, a curated map entry, or
 * the wiki knowing the name - and an unbacked channel is dropped from the suggestion (or,
 * where an episode number needs a name to hang on, kept with the doubt charged to the
 * confidence score). See mdbTitle_channelTrusted in title_builder.js.
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
 * description and purchaseUrl are also the two texts the "== Notes ==" section's link is
 * looked for in - see mdbPageCreator_notesSources(). purchaseUrl is whatever the site calls
 * its "Buy" / "Free download" field (SoundCloud's purchase_url); it is never written to the
 * page as itself, it is only searched, because on a podcast that field is where the episode's
 * own page is linked.
 *
 * channelUrl is the uploader's own page on the site (SoundCloud's user.permalink_url), read
 * off the site's API like the channel name - never derived from playerUrl in here, since how
 * a site's URLs nest is site knowledge. Only the channel-link check reads it: a sibling page
 * of the entity's category whose wikitext links this URL is direct evidence the category
 * really is this channel's series (mdbPageCreator_channelLinkFinding). A site that hands
 * none over simply skips that check.
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
 * A site whose script may follow a redirect hands that ability over as a function:
 *
 *     followRedirect: function( url, done ) { ... done( targetUrl || "" ); }
 *
 * Only the "== Notes ==" section asks for it, and only where the series' pages link an
 * episode page while the description holds a SHORTENED link to it instead ("Go to
 * bit.ly/BRCPod ..."). It cannot live in here: no fetch() can read such a redirect (a
 * shortener's 301 sends no Access-Control-Allow-Origin), so it takes GM_xmlhttpRequest, which
 * is a grant of the site script. A site that passes nothing simply never resolves one, and
 * the section is written empty - which is what it does today.
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
    // the uploader's channel page URL (the channelUrl option), "" where the site hands none
    // over - see the header comment; read only by mdbPageCreator_channelLinkFinding()
    mdbPageCreator_channelUrl = "",
    mdbPageCreator_durationMs = 0,
    mdbPageCreator_artworkUrl = "",
    // The two places the "== Notes ==" section's link is looked for (signal D). The
    // description is where the series' link usually stands in prose; purchaseUrl is
    // SoundCloud's "Buy/Free download" field, which is ONE url an uploader set on purpose and
    // is therefore filled on tracks whose description says nothing at all. Groove Podcast puts
    // the same bit.ly in both. See mdbPageCreator_notesSources().
    // Not the tracklist's copy of the description - that one has had @handles resolved in it.
    mdbPageCreator_description = "",
    mdbPageCreator_purchaseUrl = "",
    // The site script's "follow one redirect" helper (the followRedirect option), or null
    // where the site hands none over. Only the Notes section uses it, and only for a shortened
    // link - see mdbPageCreator_notesEnsureResolved(). Kept as an option rather than called
    // directly because following a redirect needs GM_xmlhttpRequest, which is a grant of the
    // SITE script; nothing in here may depend on one.
    mdbPageCreator_followRedirect = null,
    // What that resolve is doing for THIS track: the shortened URL already asked about, the
    // answer, and whether the answer is in (so the panel can tell "still following" from
    // "followed, and it leads somewhere else"). Per track, so reset on every navigation.
    mdbPageCreator_notesAsked = "",
    mdbPageCreator_notesAskedFrom = "",
    mdbPageCreator_notesResolved = "",
    mdbPageCreator_notesResolveDone = false,
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
    // the same, for the bar's "Hints:" row - see mdbPageCreator_logHintCats()
    mdbPageCreator_hintCatsLogged = "",
    // The switchable readings the build decided against (suggestion.alternatives, built in
    // mdbTitle_result) - facts like "the (Live PA) marker is a toggle", not finished titles.
    // The bar's "Switch title:" line derives the offered title from the CURRENT field text,
    // so the chips survive edits and the recent-pages refinement. Empty on most titles, and
    // always empty under a stale cached title_builder.js, which sends no alternatives field.
    mdbPageCreator_alternatives = [],
    // ... and the last logged set of offered titles, quieted like mdbPageCreator_hintsLogged
    mdbPageCreator_altsLogged = "",
    // The similar category the prefix round wrote INTO the suggestion - { text, name }, null
    // on every other title: text is the name the title wrote and the wiki denied, name the
    // category whose own name starts with it (mdbPageCreator_applySimilarEntity). Kept because
    // the walk that FOUND it cannot find it a second time: once the promoted name stands in the
    // title, that name is a category, so it is no longer one of the denied names the prefix
    // round asks about and the chip offering the way back would vanish with it.
    mdbPageCreator_similarPromoted = null,
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
    // which category chip's recent-mixes list is open in the hints bar, keyed by the
    // normalized category name - kept across re-renders for the same reason as the "?" blocks:
    // the bar rebuilds on every keystroke and on every lookup answer, and a list opened to
    // check for a duplicate must not close under the reader. At most ONE key is ever true:
    // the toggle empties this on every click (mdbPageCreator_usedCatMixes). A map all the
    // same, because the render asks it chip by chip.
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

    // The MixesDB modal (shared/mixesdb_modal/funcs.js) loads its CSS lazily - started here,
    // where a row is about to exist and its chips can open one, so the very first open is
    // already styled. typeof-guarded: the row must keep working where a site script does not
    // @require the modal file.
    if( typeof mdbModal_ensureCss === "function" ) mdbModal_ensureCss();

    var o = options || {},
        playerTitle = o.title || "",
        channel = o.channel || "",
        // "low" on sites where the channel name is often unrelated to the mix (YouTube and
        // the other planned players) - the title builder then refuses to fall back to the
        // channel as artist/entity without backing. Omitted = the SoundCloud default.
        channelTrust = o.channelTrust || "",
        createdAt = o.createdAt || "",
        releaseDate = o.releaseDate || "",
        // Read by the title builder's label test, for the labels the tracklist credits
        // ("Artist - Title [Label]") - see mdbTitleKnownLabels in title_definitions.js - and
        // by the Notes section's link search (mdbPageCreator_recentNotesUrl). The tracklist
        // itself is a second call, mdbPageCreator_addTracklist().
        description = o.description || "";

    mdbPageCreator_playerUrl = o.playerUrl || "";
    mdbPageCreator_channelUrl = o.channelUrl || "";
    mdbPageCreator_artworkUrl = o.artworkUrl || "";
    mdbPageCreator_description = description;
    mdbPageCreator_purchaseUrl = o.purchaseUrl || "";

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
    if( o.followRedirect ) mdbPageCreator_followRedirect = o.followRedirect;

    logVar( "mdbPageCreator_add: title", playerTitle );
    logVar( "mdbPageCreator_add: channel", channel );
    logVar( "mdbPageCreator_add: createdAt", createdAt );
    logVar( "mdbPageCreator_add: target", typeof mdbPageCreator_target === "string" ? mdbPageCreator_target : "(node)" );
    logVar( "mdbPageCreator_add: placement", mdbPageCreator_placement );

    var first = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, mdbTitle_categoryCache, description, channelTrust ),
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

        var second = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, known, description, channelTrust );

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

        // ... and the names the exact lookup just answered EMPTY about get their prefix
        // round, for the bar's "Similar:" row (mdbPageCreator_prefixEnsure - a settle path,
        // like the recent fetch above)
        mdbPageCreator_prefixEnsure( mdbPageCreator_title );

        mdbPageCreator_render();

        // The last question, and the only one that asks about no name: which MixesDB category
        // page LINKS this channel's URL (mdbPageCreator_channelCatEnsure). Fired after
        // everything above and with a tail of its own - it is one more request, and a channel
        // whose name the wiki knows never gets that far anyway.
        mdbPageCreator_channelCatEnsure( second.title, function( changed ) {
            if( !changed || !mdbIsCurrentPage( pageGeneration ) ) return;

            var input = $("#mdb-pageCreator-title");

            // an answer arriving after the editor has typed is a suggestion about a title that
            // no longer exists - the same fence the recent-pages refinement stands behind
            if( input.length && input.data( "mdb-edited" ) ) {
                log( "mdbPageCreator_add: the channel URL knew better, but the title was edited - not rewritten." );
                return;
            }

            // The whole parse once more, from the player title: the channel is mapped to the
            // show now (mdbTitle_channelUrlShows), which is a thing step 2 reads - patching the
            // finished title would have to redo everything that follows from it.
            var third = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, mdbTitle_categoryCache, description, channelTrust );

            if( third.title !== second.title ) {
                logVar( "mdbPageCreator_add: the channel's URL knew better", second.title + "  ->  " + third.title );
            }

            // section 4 of the panel is "what the lookups changed", and this IS one of them
            mdbPageCreator_titlePostLookup = third.title;

            mdbPageCreator_setTitle( third, o.durationMs );

            // the new entity has its own sibling pages - the third title stage runs again for it
            mdbPageCreator_applyRecentToSuggestion();
            mdbPageCreator_prefixEnsure( mdbPageCreator_title );

            mdbPageCreator_render();
        });
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

    // the entity CATEGORY (episode number stripped) is the only spelling worth asking about -
    // same reduction the edit round makes - and every name the slot offers, not only the picked
    // one: whether the venue behind the comma is filed too is what its answer decides
    // (mdbPageCreator_entityLookupNames)
    var entityNames = mdbPageCreator_entityLookupNames( title, read );

    for( i = 0; i < entityNames.length; i++ ) {
        parsed.push( { name: entityNames[i], role: "entity" } );
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
               // says who opened the form, the way the toolkit's EDIT link says "toolkit".
               // The Helper reads it to show the preview right away - see its "Edit: show the
               // preview right away" section - so it has to stand in front of "insert", where
               // it is still readable in the address bar.
               "&from=PageCreator" +
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
// empty shape they have on every mix page - unless the site suggests them, or the entity's own
// recent pages settled one and MixesDB confirms that name is a style
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
// - the "== Notes ==" section: where the series' pages carry one, the new page gets it too,
//   empty, above the tracklist - and with the episode's own page URL already in it where the
//   description held one on the host those Notes link to (mdbPageCreator_recentNotesUrl).
// - the {{Player}} itself: where the series publishes every episode on two platforms, its
//   pages write {{Player|mode=mirrors}} with a line per platform, and the new page gets that
//   shape with this player's URL on the line its host stands on and the other one empty
//   (mdbPageCreator_playerWikitext).
function mdbPageCreator_pageText( title ) {
    var info = mdbPageCreator_recentAnalysisFor( title ),
        findings = ( info.entry && info.entry.status === "done" ) ? info.entry.text : null,
        lead = "",
        notes = "",
        body = mdbPageCreator_recentBodyChoice( findings );

    if( findings && findings.image && findings.image.value === "same" ) {
        lead = "[[File:" + mdbPageCreator_fileNameForTitle( title ) + "." + ( findings.imageExt || "jpg" ) + "|right|360px]]\n\n";
    }

    // An empty line where no URL was found: the heading is the point, not the link. A section
    // that is already there gets filled far more often than one the editor has to type first.
    if( findings && findings.notes && findings.notes.value === "notes" ) {
        notes = "== Notes ==\n\n" + mdbPageCreator_recentNotesUrl( findings ) + "\n\n";
    }

    return lead +
           "== File details ==\n\n" +
           ( body ? "{{" + body + "}}" : mdbPageCreator_fileDetails() ) + "\n\n" +
           mdbPageCreator_playerWikitext( findings ) + "\n\n" +
           notes +
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
// names means another one - "See Bastian b2b Afin" is two categories), and the entity - two of
// them where a place group names an event AND a venue MixesDB has a category of each
// (mdbPageCreator_entityCategoriesFor). Then the styles, from whoever can answer what the mix
// sounds like: a site that SUGGESTS styles (the stylesBox option, TrackId.net) reads them off
// the mix itself and wins; where there is no such box, a style at least 90% of the entity's
// recent pages carry is written
// (mdbPageCreator_recentLearnedCategories) - and where neither answers, two blank rows stand
// there, because a guess is worse than a blank the editor cannot miss. Behind a style that WAS
// written stands one blank row, not two: it is the spare a second style is typed into, and one
// line too many is deleted faster than a missing one is added. The "Tracklist:" filing is
// whatever the Tracklist Editor API last said about the box - "none" when there is no tracklist
// at all.
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
        // a country never files as an artist (mdbPageCreator_countryNoCategory) - the name
        // may stay in the TITLE, but no category line and no chip is written off it
        if( mdbPageCreator_countryNoCategory( read.artists[i], [ "artist" ] ) ) continue;

        entries.push( mdbPageCreator_categoryEntry( read.artists[i], "artist" ) );
    }

    // One line per entity the title files the page under - usually one, two where its place
    // group names an event AND a venue the wiki has both of (mdbPageCreator_entityCategoriesFor)
    var entityCategories = mdbPageCreator_entityCategoriesFor( title, read );

    for( i = 0; i < entityCategories.length; i++ ) {
        // "Promo Mix" is ours, not a name the wiki could spell differently
        var entityEntry = entityCategories[i].name === "Promo Mix"
                ? { name: entityCategories[i].name, role: "promo" }
                : mdbPageCreator_categoryEntry( entityCategories[i].name, "entity" );

        // whether the TITLE numbers this entity - a series does, a place does not. Carried on
        // the entry so the chip can say where the wiki's answer and the title disagree
        // (mdbPageCreator_usedCategory): "Undercurrent 5" filed into the Amsterdam venue's
        // category is a name collision, and the chip is the only place a reader sees it.
        if( entityEntry.role === "entity" && mdbPageCreator_entityIsNumbered( entityCategories[i].entity ) ) {
            entityEntry.numbered = true;
        }

        // a name the parse did NOT pick, filed because the wiki has it too. The sentence comes
        // with it, since the pick's sentence is about the other name and repeating it there
        // would be the panel telling a story the parse never told
        // (mdbPageCreator_reasoningCategoryRow).
        if( !entityCategories[i].primary ) {
            entityEntry.alsoNamed = true;
            entityEntry.why = entityCategories[i].why;
        }

        // a country never files as the entity either - same rule as the artists above
        if( entityEntry.role === "entity" &&
            mdbPageCreator_countryNoCategory( entityEntry.name, null ) ) continue;

        entries.push( entityEntry );
    }

    var styles = mdbPageCreator_styleCategories();

    if( styles.length ) {
        // the site's own style suggestions (stylesBox option), read at click time - read off
        // THIS mix, so they beat anything learned from the siblings
        for( i = 0; i < styles.length; i++ ) {
            entries.push( { name: styles[i], role: "style" } );
        }
    } else {
        // What the entity's recent sibling pages agree on, where MixesDB itself files that
        // name under Category:Style (page_text_learning.md, signal C): a series whose ten
        // newest pages all carry [[Category:Techno]] is a techno series, and its new page is
        // filed there rather than left to be added by hand. Whatever cleared the same vote
        // without being a style stays out - a venue whose MixesDB pages are all from one
        // festival votes for the festival, and that is a filing only the editor can make. It
        // is reported as the bar's "Hints:" row and in section 7 instead
        // (mdbPageCreator_recentHintCategories).
        var split = mdbPageCreator_recentLearnedCategories( title ),
            written = 0,
            blanks;

        for( i = 0; i < split.styles.length; i++ ) {
            // a name the page already carries as its artist or its entity is no second
            // category - it would be written twice
            if( mdbPageCreator_entriesCarry( entries, split.styles[i].name ) ) continue;

            entries.push( {
                name: split.styles[i].name,
                role: "style",
                learned: true,
                count: split.styles[i].count,
                n: split.styles[i].n,
                catTitle: split.styles[i].catTitle
            } );

            written++;
        }

        // The blank rows are a convenience, not a shape - deleting a line is faster than
        // adding one, so a blank stands exactly where a style may still be typed in:
        // - nothing learned: the two blanks every mix page starts with
        // - a style written and SOME sibling pages carry further styles (Tech House on 1 of
        //   Amplify Series' 10): one blank - this mix may be such a page
        // - a style written and the siblings use nothing else: no blank at all
        blanks = written ? ( split.otherStyles.length ? 1 : 0 ) : 2;

        for( i = 0; i < blanks; i++ ) {
            entries.push( { name: "", role: "style" } );
        }
    }

    entries.push( { name: "Tracklist: " + mdbPageCreator_tracklistFiling(), role: "tracklist" } );

    return entries;
}

// mdbPageCreator_entriesCarry
// Is this name already one of the page's categories? Compared the way every other name is
// (mdbTitle_normalizeCompare), since the sibling pages write their own spelling of it.
function mdbPageCreator_entriesCarry( entries, name ) {
    var key = mdbTitle_normalizeCompare( name ),
        i;

    if( !key ) return false;

    for( i = 0; i < entries.length; i++ ) {
        if( entries[i].name && mdbTitle_normalizeCompare( entries[i].name ) === key ) return true;
    }

    return false;
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
// chip's tooltip names it and the editor decides. One exception, the same one the title's
// canonicalization makes: a redirect the name itself hit, whose target is the same name up to
// one substituted character ("Ri0D." -> "RiOD."), is the wiki correcting a spelling - and the
// target is the category that really holds the mixes (mdbTitle_oneCharApart).
function mdbPageCreator_categoryEntry( name, role ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        match = mdbTitle_knownMatch( cache, name, role === "artist" ? [ "artist" ] : null );

    if( !match || !match.title || match.title === name ) return { name: name, role: role };

    var nameKey = mdbTitle_normalizeCompare( name ),
        titleKey = mdbTitle_normalizeCompare( match.title );

    if( titleKey !== nameKey ) {
        var viaRedirect = match.matchedTitle && mdbTitle_normalizeCompare( match.matchedTitle ) === nameKey;

        if( !viaRedirect || !mdbTitle_oneCharApart( titleKey, nameKey ) ) {
            return { name: name, role: role };
        }
    }

    return { name: match.title, titleName: name, role: role };
}

// mdbPageCreator_countryNoCategory
// Whether a name is a COUNTRY the wiki does not answer for in the given role - a name that
// must never become a category line or a chip. MixesDB writes countries into titles (behind
// an event: "@ S.U.N Festival, Hungary") and files nothing under them, so a country in a
// category slot is always a misread - and creating [[Category:Georgia]] off one would found
// the very category the wiki refuses to have. The single exception is the wiki's own answer:
// an act really called like the place answers as an artist, and that answer may keep it.
function mdbPageCreator_countryNoCategory( name, types ) {
    if( typeof mdbTitle_isCountry !== "function" || !mdbTitle_isCountry( name ) ) return false;

    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {};

    return !mdbTitle_knownMatch( cache, name, types );
}

// mdbPageCreator_entityCategoryFor
// The category the finished TITLE files the page under besides the year and the artists - what
// the page text writes and what the report names, so both answer the same way.
//
// Help:Add_a_new_mix_page - a self-released mix is filed under Promo Mix, and what stands in the
// entity slot there is the mix's OWN name, which is no category at all: "1975 - Bob Marley & The
// Wailers - Secret Santana Tapes (Promo Mix)" is filed under the two artists and Promo Mix, never
// under "Secret Santana Tapes". The flag covers the titles that leave the suffix off because the
// name already says it ("Summer 2026 Mix") - those file under Promo Mix all the same, and the
// hints bar's "Used categories" is where the created page says so.
function mdbPageCreator_entityCategoryFor( title, entity ) {
    if( mdbPageCreator_promoCategory || /\(Promo Mix\)\s*$/.test( title ) ) return "Promo Mix";

    return mdbPageCreator_entityCategory( entity );
}

// mdbPageCreator_entityCategory
// MixesDB files every episode of a series under the series itself: "HATE Podcast 173" and
// "Trommel.038" are both [[Category:HATE Podcast]] / [[Category:Trommel]], and an event keeps
// its name without the edition ("Sunwaves 31" -> Sunwaves). The bracketed tail a title can
// carry - "(RA.971)", "(Promo Mix)" - is never part of a category name either.
//
// The number stays where the wiki has ANSWERED for the name as it stands: not every
// "<name> <number>" counts editions - "Route 8" is an artist and the digits are part of the
// name, so cutting them would file the page under "Route", a category MixesDB does not have,
// next to the one it does. Same shape as the room reduction below: only a real answer may
// overrule the written name, and without one the cut runs as before.
//
// A slot holding nothing but a generic series word files the page under NOTHING: there is no
// Category:Podcast and no Category:Mix to put a mix page in - the word names a show only
// together with a name (mdbTitle_isBareSeriesName). The builder grows the channel name in
// front of such a word, so a suggestion never arrives here with one; an EDITED title can, and
// a category of that name would be the one thing a category line may never be.
function mdbPageCreator_entityCategory( entity ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        name = String( entity || "" ).replace( /\s*\([^()]*\)\s*$/, "" ).trim();

    if( !( /[\s.]+\d+$/.test( name ) && mdbTitle_knownAs( cache, name ) ) ) {
        name = name.replace( /[\s.]+\d+$/, "" ).trim();
    }

    if( typeof mdbTitle_isBareSeriesName === "function" && mdbTitle_isBareSeriesName( name ) ) {
        log( "mdbPageCreator_entityCategory: \"" + name + "\" is a generic series word, so the page files under no series" );
        return "";
    }

    return mdbPageCreator_venueOfRoom( name );
}

// mdbPageCreator_venueOfRoom
// "Elsewhere Loft" -> "Elsewhere": a room inside a venue is filed under the venue. The title
// builder already writes the suggestion that way (mdbTitle_reducePlaceGroup), so this is for
// the title that carries the room ANYWAY - the "Switch title" chip clicked back, or an editor
// who typed the room in on purpose because MixesDB does write it ("@ Elsewhere Rooftop, NYC").
// The page belongs in Category:Elsewhere either way, and a category spelled after the room is
// the empty category next to the real one that a category line must never be.
//
// Same two conditions the builder's reduction has, asked of the same lookup cache: the name
// itself is no category at all, and the base IS one, as a venue or an event. Without an answer
// for either - the lookup has not run, or failed - nothing is reduced and the name stands.
function mdbPageCreator_venueOfRoom( name ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        room = name ? mdbTitle_venueSpaceBase( name ) : null;

    if( !room || mdbTitle_knownAs( cache, name ) ) return name;

    var venue = mdbTitle_knownMatch( cache, room.base, [ "venue", "event" ] );

    return ( venue && venue.title ) ? venue.title : name;
}

// mdbPageCreator_placeQualified
// MixesDB's disambiguation bracket for one name of the title's place group, picked by the
// group's own city: "As You Like It" is two categories - the Frankfurt one and the San
// Francisco one - and a title that names Frankfurt means the first. Returns the match (whose
// .title carries the bracket) or null.
//
// The TITLE never writes the bracket, which is why this is asked here and not read off the
// name: MixesDB writes "@ As You Like It, Frankfurt" and files the page under
// "As You Like It (Frankfurt)". Read off the finished title so an EDITED one is answered by
// its own words, the same way every other reading in here is.
//
// Nothing is picked where no word of the group stands in a bracket - "Utopia" answers
// "Utopia (Event)", "Utopia (Las Vegas)" and "Utopia (Turku)" for a title naming Berlin, and
// all three are the wiki offering ITS Utopia. See "A qualified category and the city that
// picks it" in title_definitions.js.
function mdbPageCreator_placeQualified( name, title ) {
    if( typeof mdbTitle_qualifiedPlaceMatch !== "function" ) return null;

    var bits = String( title || "" ).split( mdbTitle_bitSplitRe() ),
        atParts = String( bits[1] || "" ).split( /\s+@\s+/ );

    if( atParts.length < 2 ) return null;

    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {};

    return mdbTitle_qualifiedPlaceMatch( cache, name, mdbTitle_placeGroupCityWords( atParts[1] ) );
}

// mdbPageCreator_entityCategoriesFor
// EVERY category the title's entity slot files the page under, in title order, as
// { name, entity, primary, why }: the category name, the name in the title it was read off,
// whether it is the one the parse picked - and, for the ones it did not, the sentence the
// reasoning panel prints instead of the pick's.
//
// A place group can name two things that both have a category, and MixesDB files such a page
// under both: "2026-05-23 - Dosem @ Anjunadeep, Ritter Butzke, Berlin" carries
// [[Category:Anjunadeep]] AND [[Category:Ritter Butzke]] - the party and the club - while the
// city carries none. Position in the group decides none of that: a city the title builder
// knows as one is not among the offered names at all (mdbTitleCities), and for every other
// name it is the wiki that answers (mdbPageCreator_placeMatch).
//
// The PICKED name is written whether or not the wiki has it: a venue new to MixesDB gets its
// category created together with the page, and the entity filing is the one a mix page must
// never be missing. Every FURTHER name has to be a category that really exists - a second one
// invented out of a word in the group would be exactly the empty category next to the real one
// that a category line must never be.
function mdbPageCreator_entityCategoriesFor( title, read ) {
    var primary = mdbPageCreator_entityCategoryFor( title, read.entity );

    if( !primary ) return [];

    // a self-released mix files under the bucket alone - what stands in the entity slot is the
    // mix's own name, and a name next to it is no filing either
    if( primary === "Promo Mix" ) return [ { name: primary, entity: read.entity || "", primary: true } ];

    // the wiki's disambiguation bracket, where the place group's own city picks one of several
    // same-named categories: the title says "As You Like It", the page joins
    // [[Category:As You Like It (Frankfurt)]]
    var primaryQual = mdbPageCreator_placeQualified( primary, title );

    if( primaryQual ) primary = primaryQual.match.title;

    var names = ( read.entities && read.entities.length ) ? read.entities : ( read.entity ? [ read.entity ] : [] ),
        primaryKey = mdbTitle_normalizeCompare( primary ),
        out = [],
        i, cat, qual, match;

    for( i = 0; i < names.length; i++ ) {
        cat = mdbPageCreator_entityCategory( names[i] );

        if( !cat ) continue;

        qual = mdbPageCreator_placeQualified( cat, title );

        if( qual ) cat = qual.match.title;

        if( mdbPageCreator_entriesCarry( out, cat ) ) continue;

        if( mdbTitle_normalizeCompare( cat ) === primaryKey ) {
            out.push( { name: cat, entity: names[i], primary: true } );
            continue;
        }

        // the bracket the group picked IS the answer - asking again under the bracketed name
        // would find nothing, since that name was never the one sent
        match = qual ? qual.match : mdbPageCreator_placeMatch( cat );

        if( !match ) continue;

        out.push( {
            name: cat,
            entity: names[i],
            primary: false,
            why: "the place group names it next to \"" + primary + "\", and MixesDB has it as a " +
                 match.type + " - a title naming both is filed under both"
        } );
    }

    // the picked name even where the group's own parts came to nothing
    if( !mdbPageCreator_entriesCarry( out, primary ) ) {
        out.unshift( { name: primary, entity: read.entity || "", primary: true } );
    }

    return out;
}

// mdbPageCreator_placeMatch
// Does MixesDB really have a category of this name, as a venue or an event? The question a
// name of the place group has to answer before the page is filed under it BESIDES the picked
// one - and the only thing that tells the club behind the comma from the city behind it:
// "Ritter Butzke" answers, "Berlin" does not, and neither does a party the wiki has never
// heard of. Returns the match, whose type is what the reasoning panel names.
//
// The answer has to be about THIS name, not about one it merely resembles: "Utopia" matched to
// "Utopia (Event)" is the wiki offering ITS Utopia, which is not the Berlin one the title means
// (the lookup's qualifier rule, mixesdb_api_request.md). The same rule the canonicalization
// holds to, with the same single exception - a redirect from the name itself whose target is
// that name up to one substituted character ("Ri0D." -> "RiOD.") is the wiki correcting a
// spelling, and the target is the category that holds the mixes.
function mdbPageCreator_placeMatch( name ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        // a name already carrying its bracket was never asked about under that spelling - the
        // answer sits under the bare name it was sent as (mdbTitle_bracketedMatch)
        match = ( typeof mdbTitle_bracketedMatch === "function" && mdbTitle_bracketedMatch( cache, name, [ "venue", "event" ] ) ) ||
                mdbTitle_knownMatch( cache, name, [ "venue", "event" ] ),
        key = mdbTitle_normalizeCompare( name ),
        titleKey = match ? mdbTitle_normalizeCompare( match.title || "" ) : "";

    if( !key || !titleKey ) return null;
    if( titleKey === key ) return match;

    var viaRedirect = match.matchedTitle && mdbTitle_normalizeCompare( match.matchedTitle ) === key;

    return ( viaRedirect && mdbTitle_oneCharApart( titleKey, key ) ) ? match : null;
}

// mdbPageCreator_entityLookupNames
// Which names of the title's entity slot a lookup round asks the wiki about: the category
// spelling of every name the slot OFFERS (mdbTitle_titleCategories' entities), not only of the
// one that got picked - whether a second one is filed too is precisely what the answer decides.
// A known city is not among them - the builder took it out of the offered names, since
// MixesDB has no category for a city and the request may carry ten names (mdbTitleCities). One
// the list does not carry is asked like the rest, and there "no category of this name" IS the
// answer that keeps it out, the only way left to tell it from the venue standing next to it.
//
// For a promo the category is our own bucket, so what the wiki is asked about is the name in
// the slot itself - a name it may well know as something else.
function mdbPageCreator_entityLookupNames( title, read ) {
    var promo = mdbPageCreator_entityCategoryFor( title, read.entity ) === "Promo Mix",
        names = ( read.entities && read.entities.length ) ? read.entities : ( read.entity ? [ read.entity ] : [] ),
        out = [],
        keys = [],
        i, name, key, full;

    for( i = 0; i < names.length; i++ ) {
        name = promo ? names[i] : mdbPageCreator_entityCategory( names[i] );
        key = mdbTitle_normalizeCompare( name );

        if( !key || keys.indexOf( key ) !== -1 ) continue;

        keys.push( key );
        out.push( name );

        // ... and the name WITH its trailing number when that number may be part of it
        // ("Route 8"), the same second question the chunk candidates ask
        // (mdbTitle_numberBelongsToName): the reduction above is what an answer for this form
        // stops, so without asking it the answer can never come. typeof-guarded like the
        // notes below - a cached title_builder.js from before this may not have the helper.
        if( !promo && typeof mdbTitle_numberBelongsToName === "function" &&
            mdbTitle_numberBelongsToName( names[i] ) ) {
            full = mdbTitle_normalizeCompare( names[i] );

            if( full && keys.indexOf( full ) === -1 ) {
                keys.push( full );
                out.push( names[i] );
            }
        }
    }

    return out;
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
    mdbPageCreator_alternatives = ( suggestion && suggestion.alternatives ) || [];
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

    mdbPageCreator_renderHints( wrapper );
    mdbPageCreator_fillReport( wrapper );
    // the trace and the lookup log just changed with the refined suggestion - redraw right
    // away, no debounce: nothing here waits on typing
    mdbPageCreator_renderReasoning( wrapper );
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
            .attr( "title", "Everything needed to report this title as wrongly suggested, ready to paste - fill in the \"Mistakes / learnings\" and \"Expected\" blocks.\nAbove the box, the reasoning panel shows how the suggestion was built, in the order it ran: the title chunks, the first parse, the MixesDB lookups, the second parse with the answers, the format read off the entity's recent pages, the categories, the page text learned from those same pages, and the similar categories behind the names MixesDB denied." )
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

        wrapper.append( create );
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
 * Three lines so far. "Used categories" (row_enrichment.md, additions 1 and 2): every category
 * the page text writes, in the order it writes them, each as a chip. The artist and entity
 * names are the ones answered by the wiki: green means MixesDB has that category - with its
 * mix count, and the category's recent mix pages behind it where the lookup brought them -
 * red means it has not: a new name, or the name is spelled differently there, and the red
 * name searches MixesDB (the loupe behind it says so), which is the fastest way to tell those
 * two apart. On a desktop-wide window the chips' MixesDB links open in a modal on the page
 * (mdbModal_open, shared/mixesdb_modal/funcs.js) rather than a tab. The year, the styles, "Promo Mix" and
 * the "Tracklist:" filing are grey chips without link or count - nothing about them is a
 * spelling anyone could have got wrong, but the page gets them and the line says so.
 *
 * "Hints" under it: what the entity's recent sibling pages have in common and the page does
 * NOT get - the winners of that vote MixesDB does not file under Category:Style, since the
 * styles among them are written and stand on the line above. Same chips, and behind each one a
 * note saying which pages it came off ("Amsterdam Dance Event - all 10 of Undercurrent's newest
 * pages carry it"). Its own row rather than another chip style on the line above, because "the
 * page gets this" and "these pages happen to share this" are different claims and only the
 * first is a filing: a venue whose MixesDB pages are all festival sets votes for the festival,
 * and only the editor can tell whether this mix belongs there.
 * See mdbPageCreator_recentHintCategories.
 *
 * "Switch title" under those: the readings the build decided AGAINST - a guessed "(Live PA)", an
 * assumed "(Promo Mix)", a dropped "Part 2" - each as the full title it would make, one click
 * to swap it with the field (mdbPageCreator_switchTitleHint below).
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

    var title = $.trim( wrapper.find( "#mdb-pageCreator-title" ).val() ),
        usedCats = mdbPageCreator_usedCategoriesHint( title ),
        // directly under them: what MixesDB has that STARTS like a red name - the prefix
        // answers (mdbPageCreator_similarCategoriesHint); null while nothing is red or
        // nothing came back
        similarCats = mdbPageCreator_similarCategoriesHint( title ),
        // under the categories the page GETS: what the entity's sibling pages have in common
        // and the page does not get (mdbPageCreator_hintCategoriesHint)
        hintCats = mdbPageCreator_hintCategoriesHint( title ),
        switchTitle = mdbPageCreator_switchTitleHint( title ),
        // Built into a detached box FIRST and only swapped in where it really differs. The bar
        // re-renders on every keystroke, on every lookup answer and on the title field's own
        // "change" - and on nearly all of those the content is the same one it already shows.
        //
        // Replacing it anyway broke the first click on a chip's "N mixes" after a title edit,
        // which is the click the toggle exists for: the mousedown takes the focus OUT of the
        // title field, the field fires "change" because it was typed in, that lands here, and
        // by the time the mouse comes up the element it went down on has been thrown away - so
        // the browser dispatches no click at all. The reader saw the bar blink and nothing
        // open; only a second click, with the field already blurred and no "change" left to
        // fire, worked. Measured on SoundCloud 2026-08-19: the node was gone 120ms after the
        // mousedown.
        //
        // (The "Switch title:" chips lean on the same guard from the other side: they DERIVE
        // from the field text, so the blur-fired "change" right under a click re-renders them
        // with the value the last keystroke already rendered - identical markup, nodes kept,
        // click alive.)
        //
        // Comparing the MARKUP rather than a hand-kept signature of what went into it: the two
        // cannot drift apart, and anything a future hint adds to the bar is covered by it.
        fresh = $("<div>");

    if( usedCats ) fresh.append( usedCats );
    if( similarCats ) fresh.append( similarCats );
    if( hintCats ) fresh.append( hintCats );
    if( switchTitle ) fresh.append( switchTitle );

    // Not .toggle(): the bar is filled while the wrapper is still DETACHED on the first render,
    // where jQuery has no computed display to restore and guesses one. Clearing the inline
    // property lets the stylesheet's "display: flex" stand, whatever the wrapper's state.
    // Read off the FRESH content and set on every pass, so the bar an unchanged render leaves
    // untouched is still hidden when it has nothing to say.
    bar.css( "display", fresh.children().length ? "" : "none" );

    if( bar.html() !== fresh.html() ) bar.empty().append( fresh.children() );
}

// mdbPageCreator_usedCategoriesHint
// "Used categories: 2026, Dave Huismans, Horst Festival (Search), House, Tracklist: partly" -
// EVERY category the page text writes, in the order it writes them
// (mdbPageCreator_categoryEntries), so the line answers the question its label asks: which
// categories does the created page end up in?
//
// Two kinds of chip. The artist and the entity name are the ones the wiki could spell
// differently, so they carry the verdict colours, the category link and the mix count. The
// year, the styles, "Promo Mix" and the "Tracklist:" filing are nobody's spelling - the year
// category always exists, a style is the editor's call, the site's or the one the siblings
// settled, the last two are ours - so they are plain grey chips: no link, no count, nothing to
// look up. They used to be left out entirely, which read as if the page did not get them at all
// - "Promo Mix" missing from "Used categories" while the page text writes it was the report
// (2026-08-19). A style learned off the entity's recent pages is grey like the rest of them:
// only its tooltip differs, saying which pages it came off
// (mdbPageCreator_plainCategoryNote) - it is a category the page gets, which is exactly what
// every other chip on this row is.
//
// The line still needs an artist or an entity to appear at all: a title that names neither has
// nothing worth saying here, and a bar holding only the year and "Tracklist: none" would be
// noise on every row.
function mdbPageCreator_usedCategoriesHint( title ) {
    var entries = mdbPageCreator_categoryEntries( title ),
        wanted = [],
        named = false,
        i;

    for( i = 0; i < entries.length; i++ ) {
        // the empty style slots are shape, not categories - the page text writes them as the
        // two blank rows an editor fills in, and there is no name to show
        if( !entries[i].name ) continue;

        wanted.push( entries[i] );

        if( entries[i].role === "artist" || entries[i].role === "entity" ) named = true;
    }

    if( !named ) {
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

        var fit = mdbPageCreator_categoryFit( wanted[i], state, title );

        chips.append( mdbPageCreator_usedCategory( wanted[i], state, title ) );
        logged.push( wanted[i].name + " [" + wanted[i].role + ": " + state.verdict +
                     ( fit ? ", fit " + fit.percent + "%" : "" ) + "]" );
    }

    mdbPageCreator_logHints( logged.join( " | " ) );

    return hint;
}

// mdbPageCreator_hintCategoriesHint
// "Hints: Amsterdam Dance Event (all 10 of Undercurrent's newest pages carry it)" - the second
// row of the bar, under "Used categories:".
//
// What it is NOT is a category of the created page: everything on the row above goes on the
// page, everything on this one is something the entity's sibling pages have in common that the
// page does not get - because MixesDB does not file that name under Category:Style, which is
// the one thing that lets such a winner be written (mdbPageCreator_recentLearnedCategories).
// Two rows rather than one chip style, because that difference is the whole point - a hint the
// reader may act on, never a filing made for them.
//
// The note behind each chip says which pages it was read off, so the row answers "where does
// this come from?" without a hover: the reported case ("Amsterdam Dance Event" on a podcast
// episode) was right there in the categories with nothing on screen explaining it.
function mdbPageCreator_hintCategoriesHint( title ) {
    var entries = mdbPageCreator_recentHintCategories( title ),
        i;

    if( !entries.length ) return null;

    var chips = $("<span>").addClass( "mdb-pageCreator-hint-items" ),
        hint = $("<span>")
            .attr( "id", "mdb-pageCreator-hintCats" )
            .append(
                $("<span>").addClass( "mdb-pageCreator-hint-label" ).text( "Hints:" ),
                chips
            ),
        logged = [];

    for( i = 0; i < entries.length; i++ ) {
        var note = mdbPageCreator_recentHintNote( entries[i] );

        chips.append(
            $("<span>").addClass( "mdb-pageCreator-hintCat" ).append(
                // "known" without asking anyone: the category demonstrably exists - the name
                // was read out of the wikitext of ten pages filed under it - so it is the
                // wiki's own spelling and it links straight to the category page. No mix
                // count is passed, because nobody counted: the chip is the link and the note.
                mdbPageCreator_usedCategory( entries[i], { verdict: "known", match: { title: entries[i].name } } ),
                $("<span>").addClass( "mdb-pageCreator-hintCat-note" ).text( note )
            )
        );

        logged.push( entries[i].name + " (" + note + ")" );
    }

    mdbPageCreator_logHintCats( logged.join( " | " ) );

    return hint;
}

// mdbPageCreator_logHintCats
// Logged the once it changes, like the used categories above - the bar re-renders on every
// keystroke and the answer is the same one all the way through.
function mdbPageCreator_logHintCats( summary ) {
    if( summary === mdbPageCreator_hintCatsLogged ) return;

    mdbPageCreator_hintCatsLogged = summary;

    logVar( "mdbPageCreator hints: shared categories", summary );
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
// above can never tell two different stories about the same name. One of five verdicts:
//
// - known     MixesDB has the category; .match carries its own spelling, type and mix count
// - otherRole MixesDB has the category, but not in the role the page would file it as -
//             "Dommune" standing as the page's ARTIST while the wiki knows it as a venue.
//             .match carries what it IS. Never folded into "missing": in a wiki red means
//             "no such page", and a reader following a red "Dommune" to its search found
//             Category:Dommune standing right there (reported 2026-08-20). The mismatch is
//             not about the category existing - it says the title's roles are probably wrong.
// - missing   MixesDB was asked and has no such category under any type
// - unknown   MixesDB has not been asked (yet) - no answer either way
// - plain     not a name the wiki is asked about at all - the year, a style, "Promo Mix", the
//             "Tracklist:" filing. There is no verdict to have about these, only the fact that
//             the page gets them.
//
// Read the same way the reasoning panel's category rows read it, off the same cache, so the
// two can never contradict each other: an artist has to be known AS an artist, an entity as
// anything at all ("fabric" is a venue, and that answers the entity slot).
function mdbPageCreator_usedCategoryState( entry ) {
    if( entry.role !== "artist" && entry.role !== "entity" ) return { verdict: "plain", match: null };

    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        types = entry.role === "artist" ? [ "artist" ] : null,
        // a category name carrying a disambiguation bracket was asked about WITHOUT it - the
        // wiki's qualifier rule is what answered, and the answer sits under the bare name. Read
        // the same way here, or a category the page really joins reads as one MixesDB does not
        // have: a red chip on a category standing right there.
        match = ( typeof mdbTitle_bracketedMatch === "function" && mdbTitle_bracketedMatch( cache, entry.name, types ) ) ||
                mdbTitle_knownMatch( cache, entry.name, types );

    if( match ) return { verdict: "known", match: match };

    // the category exists under another type - only the artist slot can land here, the
    // entity slot already accepts any type above
    var other = ( typeof mdbTitle_bracketedMatch === "function" && mdbTitle_bracketedMatch( cache, entry.name, null ) ) ||
                mdbTitle_knownMatch( cache, entry.name, null );

    if( other ) return { verdict: "otherRole", match: other };

    return { verdict: mdbPageCreator_categoryUnanswered( entry.name ) ? "unknown" : "missing", match: null };
}

/*
 * Similar categories - the prefix round behind a name the wiki denied
 *
 * A denied name says MixesDB has no category of it, and that is where a second spelling or a
 * longer form hides: the wiki may file the series as "Deep Space Series Podcast" while the
 * title says "Deep Space Series". mdbnames' prefix mode (match=prefix, live 2026-08-16,
 * row_enrichment.md §1) answers with every typed category STARTING with the name, so once
 * the exact lookup has answered empty those names are asked once more that way - all of
 * them in ONE request - and what comes back renders as a "Similar:" row of yellow chips
 * directly under "Used categories": neither green (the page does not get them) nor red
 * (nobody denied them), a look to take, not a verdict.
 *
 * TWO sources of names, and both mean "asked, and the wiki said no": the bar's red chips,
 * and the names the TITLE writes that never became a chip at all. The second half was added
 * 2026-08-20 on a report the first half could not answer - "NTS - Sacred Pools - Toshiki
 * Ohta - August 2026 (No Voice Over)" files under Promo Mix, so its bar carries the year,
 * the artist and "Promo Mix" and nothing else: the mix's own name stands in no category
 * slot, the "NTS" the lookup had just denied was asked by nobody, and the wiki's NTS Radio -
 * which starts exactly like it - stayed invisible.
 *
 * HINTS ONLY, by decision (2026-08-20): the answers stay in their own cache and never reach
 * mdbTitle_categoryCache - with prefix matches in there the builder would read "Dekmantel"
 * as a podcast (Dekmantel São Paulo Podcast is one) and the exact-match discipline would be
 * undone from the server side (row_enrichment.md: "The row uses prefix mode. The title
 * builder NEVER does"). No similarity score either: the used-cat chips carry a REAL fit
 * score, and a number on these would read as one.
 *
 * Gentle thresholds for a start, named here so they are one edit away: at most
 * mdbPageCreator_prefixMaxPerName chips per red name, matches under
 * mdbPageCreator_prefixMinMixes mixes dropped (the API ranks by mix count already).
 */
var mdbPageCreator_prefixCache = {},
    mdbPageCreator_prefixMaxPerName = 3,
    mdbPageCreator_prefixMinMixes = 2,
    // the row's last logged content, quieted like mdbPageCreator_hintsLogged
    mdbPageCreator_similarLogged = "";

// mdbPageCreator_nameWords
// A name as its lower-cased words, everything else dropped - the unit
// mdbPageCreator_titleWritesName compares in.
function mdbPageCreator_nameWords( text ) {
    var parts = String( text || "" ).toLowerCase().split( /[^a-z0-9]+/ ),
        out = [],
        i;

    for( i = 0; i < parts.length; i++ ) {
        if( parts[i] ) out.push( parts[i] );
    }

    return out;
}

// mdbPageCreator_titleWritesName
// Does the title write this name, as whole words standing next to each other? The fence around
// the second half of the prefix round: a name the wiki denied is only worth a "Similar:" chip
// while the title still carries it - a channel the parse threw away is no filing anyone is
// about to make, and hinting at categories for it would be the bar talking about another mix.
//
// Word-wise rather than on the normalized keys, which have no spaces left in them
// (mdbTitle_normalizeCompare strips everything but letters and digits): "nts" sits inside
// "toshikiohtants" there, and every short name would find itself somewhere. The wiki's prefix
// mode matches at word granularity too (row_enrichment.md §1), so both ends of this round agree
// about where a name begins.
function mdbPageCreator_titleWritesName( title, name ) {
    var hay = mdbPageCreator_nameWords( title ),
        needle = mdbPageCreator_nameWords( name ),
        i, j, hit;

    if( !needle.length || needle.length > hay.length ) return false;

    for( i = 0; i + needle.length <= hay.length; i++ ) {
        hit = true;

        for( j = 0; j < needle.length; j++ ) {
            if( hay[ i + j ] !== needle[j] ) { hit = false; break; }
        }

        if( hit ) return true;
    }

    return false;
}

// mdbPageCreator_nameStartsName
// Do the words of one name OPEN the other? "HATE" opens "HATE Podcast", "Deep Space" opens
// "Deep Space Series", "NTS" opens neither "Toshiki Ohta" nor "Promo Mix". Word-wise like
// mdbPageCreator_titleWritesName, and for the same reason.
function mdbPageCreator_nameStartsName( name, other ) {
    var a = mdbPageCreator_nameWords( name ),
        b = mdbPageCreator_nameWords( other ),
        i;

    if( !a.length || a.length > b.length ) return false;

    for( i = 0; i < a.length; i++ ) {
        if( a[i] !== b[i] ) return false;
    }

    return true;
}

// mdbPageCreator_editionNumbers
// The digits the FINISHED title counts this edition with - "251" out of "Trommel 251", "5" out
// of "Undercurrent 5", "1051" out of "RA Podcast (RA.1051)". Read off the ENTITY slot, the one
// place a MixesDB title writes an episode number - the same two shapes
// mdbPageCreator_entityIsNumbered asks that slot about - and off the finished title rather than
// off what the parse had in mind, like every other reading in here: an edited title numbers its
// edition itself.
function mdbPageCreator_editionNumbers( title ) {
    var read = mdbTitle_titleCategories( title ),
        names = ( read.entities && read.entities.length ) ? read.entities : ( read.entity ? [ read.entity ] : [] ),
        out = [],
        i, name, m;

    for( i = 0; i < names.length; i++ ) {
        name = String( names[i] || "" ).trim();

        // the digits behind a separator ("Trommel 251", "Trommel.251"), or the bracketed
        // episode ID at the end ("RA Podcast (RA.1051)"). A slot that is nothing BUT digits
        // matches neither: nothing there is being counted, the number IS the name.
        m = name.match( /[\s.](\d{1,5})$/ ) || name.match( /\(\D*(\d{1,5})\)$/ );

        if( m && out.indexOf( m[1] ) === -1 ) out.push( m[1] );
    }

    return out;
}

// mdbPageCreator_isEditionNumber
// Is this name nothing but the number the title already counts this edition with? Such a name
// is never asked for SIMILAR categories: the prefix round would ask what MixesDB has that
// starts with "251", and every answer to that is another series' episode - two numbers starting
// alike is no name resemblance at all. The exact round asks it and is right to (a bare-number
// chunk is a candidate like any other, and that answer is about this very name); only the
// looser question has nothing to find.
//
// The digits test comes first, so the title is parsed only for the rare name that is one.
function mdbPageCreator_isEditionNumber( title, name ) {
    var text = String( name || "" ).trim(),
        numbers, i;

    if( !/^\d{1,5}$/.test( text ) ) return false;

    numbers = mdbPageCreator_editionNumbers( title );

    for( i = 0; i < numbers.length; i++ ) {
        // "084" and "84" count the same edition: the padding is how the series writes its
        // number (mdbTitle_findEpisode keeps it exactly as the title has it), not another one
        if( parseInt( numbers[i], 10 ) === parseInt( text, 10 ) ) return true;
    }

    return false;
}

// mdbPageCreator_prefixMissingNames
// The names of this title the exact lookup answered EMPTY about, in the order the request
// should ask them. Two rounds, and the row renders off this same list, so the two can never
// disagree about which names are being asked:
//
// 1. the bar's red chips - artist/entity entries read off the same entries and the same state
//    the chips render from
// 2. the names the TITLE writes that are no chip at all: the mix's own name on a promo, a
//    show word the parse glued into it, anything the lookup asked about and the bar has no
//    slot for. Denied here means denied as ANYTHING - these names stand in no category slot,
//    so there is no role to hold the answer against - and the lookup LOG is the source, being
//    this page's asked names in their original spelling. A name that was never really asked
//    (dropped over the 10-name limit) or whose request died is not one the wiki denied, and a
//    chip saying "MixesDB has no category ..." about it would be a lie.
//
//    ... and a name that is nothing but the number the title counts this edition with stays
//    out of BOTH rounds: "251" behind "Trommel 251" is the episode number the build already
//    decided on, and what MixesDB has that STARTS with it can only be another series' episode
//    (mdbPageCreator_isEditionNumber).
//
//    ... and a name that OPENS one the bar already carries stays out: "HATE" next to a chip
//    reading "HATE Podcast" would only ask a looser question about a filing the bar has
//    already settled, and the family around a name the wiki KNOWS is a whole addition of its
//    own that is not built (row_enrichment.md §1, the Dekmantel case). Where the longer name
//    is red it is being asked in this very request, and every answer the shorter one could
//    add would sit under the same three-chip cap.
//
// skipped, where a caller hands one over, collects what was refused as { name, why }: the
// panel's section 8 prints those names too, since a denied name leaving the round without a
// word is what that section exists to prevent. The request path passes nothing and simply
// never asks them.
function mdbPageCreator_prefixMissingNames( title, skipped ) {
    var entries = mdbPageCreator_categoryEntries( title ),
        // the one sentence the panel gets about a refused name, wherever it was refused
        editionWhy = "not asked - it is the number the title counts this edition with, and a category whose name merely starts with it is another series' episode",
        log = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        out = [],
        seen = {},
        i, j, entry, key, opensBarName;

    for( i = 0; i < entries.length; i++ ) {
        entry = entries[i];

        if( !entry.name || ( entry.role !== "artist" && entry.role !== "entity" ) ) continue;
        if( mdbPageCreator_usedCategoryState( entry ).verdict !== "missing" ) continue;

        key = mdbTitle_normalizeCompare( entry.name );

        if( !key || seen[key] ) continue;

        seen[key] = true;

        if( mdbPageCreator_isEditionNumber( title, entry.name ) ) {
            if( skipped ) skipped.push( { name: entry.name, why: editionWhy } );
            continue;
        }

        out.push( entry.name );
    }

    for( i = 0; i < log.length; i++ ) {
        key = log[i].key;

        if( !key || seen[key] ) continue;
        if( log[i].pending || log[i].failed || log[i].skipped ) continue;
        if( mdbTitle_knownMatch( cache, log[i].name, null ) ) continue;
        if( !mdbPageCreator_titleWritesName( title, log[i].name ) ) continue;

        for( j = 0, opensBarName = false; j < entries.length; j++ ) {
            if( entries[j].name && mdbPageCreator_nameStartsName( log[i].name, entries[j].name ) ) {
                opensBarName = true;
                break;
            }
        }

        if( opensBarName ) continue;

        seen[key] = true;

        if( mdbPageCreator_isEditionNumber( title, log[i].name ) ) {
            if( skipped ) skipped.push( { name: log[i].name, why: editionWhy } );
            continue;
        }

        out.push( log[i].name );
    }

    return out;
}

// mdbPageCreator_prefixEnsure
// Starts the one prefix request for this title's denied names, where none ran yet. Called from
// the two settle paths (the suggestion's lookup callback and the debounced edit path) like
// mdbPageCreator_recentEnsureFor - never from a render. A name already asked is not asked
// again, failed included: the row is a hint, not something worth retrying for.
function mdbPageCreator_prefixEnsure( title ) {
    var names = mdbPageCreator_prefixMissingNames( title ),
        wanted = [],
        i, key;

    for( i = 0; i < names.length; i++ ) {
        key = mdbTitle_normalizeCompare( names[i] );

        if( mdbPageCreator_prefixCache[key] ) continue;

        mdbPageCreator_prefixCache[key] = { status: "pending", matches: [] };
        wanted.push( names[i] );
    }

    // the module takes 10 names per request, the exact round's limit (mixesdb_api_request.md
    // §4) - and the names come in the order mdbPageCreator_prefixMissingNames ranks them, the
    // bar's own chips first, so what falls off is the least likely to matter. The seeds of the
    // dropped ones come back out: pre-seeding them as asked would answer for them forever,
    // while a later call - the next keystroke's - can still get to them.
    if( wanted.length > 10 ) {
        logVar( "mdbPageCreator_prefixEnsure: over the 10-name limit, dropping", wanted.slice( 10 ).join( " | " ) );

        for( i = 10; i < wanted.length; i++ ) {
            delete mdbPageCreator_prefixCache[ mdbTitle_normalizeCompare( wanted[i] ) ];
        }

        wanted = wanted.slice( 0, 10 );
    }

    if( !wanted.length ) return;

    logVar( "mdbPageCreator_prefixEnsure: asking prefix matches for", wanted.join( " | " ) );

    var apiData = {
            action: "mdbnames",
            format: "json",
            formatversion: 2,
            origin: "*",
            names: wanted.join( "|" ),
            match: "prefix"
        },
        apiCall = mdbPageCreator_noteApiCall( "prefix", "",
                      "categories whose names START like the name" + ( wanted.length === 1 ? "" : "s" ) +
                      " MixesDB has no category of (" + wanted.join( ", " ) + ") - the \"Similar:\" row",
                      apiData );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: apiData,
        success: function( data ) {
            apiCall.status = "done";

            var rows = ( data && data.mdbnames ) || [],
                i, key;

            // every asked name settles, answered or not - an empty answer IS an answer
            for( i = 0; i < wanted.length; i++ ) {
                mdbPageCreator_prefixCache[ mdbTitle_normalizeCompare( wanted[i] ) ].status = "done";
            }

            for( i = 0; i < rows.length; i++ ) {
                key = mdbTitle_normalizeCompare( String( rows[i].name || "" ) );

                if( key && mdbPageCreator_prefixCache[key] ) {
                    mdbPageCreator_prefixCache[key].matches = rows[i].matches || [];
                }
            }

            // looked up again rather than closed over, like every other late answer
            var row = $("#mdb-pageCreator");

            // The answers are in, so the one thing they can decide is decided before anything
            // renders: a lone similar category goes into the suggestion and the denied name
            // becomes the chip back (mdbPageCreator_applySimilarEntity). The recent-pages stage
            // follows it, because the promoted name is a category with pages and their titles
            // are what the episode number's spelling comes from - the same order the lookup
            // callback uses for the build's own entity.
            var before = mdbPageCreator_title;

            mdbPageCreator_applySimilarEntity();

            if( mdbPageCreator_title !== before ) {
                // The promoted name is a category that HAS pages, and their titles are where
                // the episode number's spelling comes from - half the reason the existing
                // category is worth writing. Same order the lookup callback uses for the
                // build's own entity.
                mdbPageCreator_applyRecentToSuggestion();
                // ... and a new SUGGESTION only reaches the field through the full render; the
                // bar alone would leave the old title standing over the new chips
                mdbPageCreator_render();
            } else {
                // nothing decided - the cheap path this round has always taken
                mdbPageCreator_renderHints( row );
            }

            // the report's "Similar lookups" block quotes these answers, so it follows them
            // too - without this an open box keeps saying "looking for similar names …" for a
            // request that has long since answered (no-op on a closed box and on a written-in one)
            mdbPageCreator_fillReport( row );
            mdbPageCreator_renderReasoning( row );
        },
        error: function( xhr, status ) {
            apiCall.status = "failed";
            log( "mdbPageCreator_prefixEnsure FAILED (" + status + ") for " + wanted.join( " | " ) );

            for( var i = 0; i < wanted.length; i++ ) {
                mdbPageCreator_prefixCache[ mdbTitle_normalizeCompare( wanted[i] ) ].status = "failed";
            }

            // the failure is a line in the box as much as in the panel - same two surfaces
            var row = $("#mdb-pageCreator");

            mdbPageCreator_fillReport( row );
            mdbPageCreator_renderReasoning( row );
        }
    });
}

// mdbPageCreator_prefixDecisions
// EVERY prefix answer of this title's denied names, each with the verdict the "Similar:" row
// gives it: shown, or not shown and why. ONE walk decides for both surfaces - the row renders
// the survivors, the panel's section 8 renders the whole list with the reasons - so the two
// can never disagree about which answer made the row. The filters run in the row's order,
// the cap first: it used to be the loop's own condition, so an answer arriving after the cap
// was full was never looked at and claims no dedupe key.
//
// Walks mdbPageCreator_prefixMissingNames, the list the REQUEST was built from, rather than the
// bar's entries a second time: half of those names are on no chip (the promo case in the
// section comment above), and a walk reading a different list than the request could only ever
// judge less than was asked for. A name with nothing cached - the request has not settled, or
// it fell off the 10-name limit - carries its status and no decisions, and one the round
// REFUSED to ask (status "skipped") carries its reason instead.
function mdbPageCreator_prefixDecisions( title ) {
    var entries = mdbPageCreator_categoryEntries( title ),
        skipped = [],
        names = mdbPageCreator_prefixMissingNames( title, skipped ),
        taken = {},
        out = [],
        i, j, name, cached, rec, match, shown, matchKey, mixes, why;

    // everything on the bar is off limits for the chips, whatever its verdict. true marks a
    // bar name, a STRING the denied name whose chip claimed the key first - the two "why not"
    // sentences are different facts.
    for( i = 0; i < entries.length; i++ ) {
        if( entries[i].name ) taken[ mdbTitle_normalizeCompare( entries[i].name ) ] = true;
    }

    for( i = 0; i < names.length; i++ ) {
        name = names[i];
        cached = mdbPageCreator_prefixCache[ mdbTitle_normalizeCompare( name ) ];

        rec = {
            name: name,
            status: cached ? cached.status : "unasked",
            matches: ( cached && cached.matches ) ? cached.matches : [],
            decisions: []
        };
        out.push( rec );

        if( rec.status !== "done" ) continue;

        shown = 0;

        for( j = 0; j < rec.matches.length; j++ ) {
            match = rec.matches[j];
            mixes = ( typeof match.mixes === "number" ) ? match.mixes : 0;
            matchKey = mdbTitle_normalizeCompare( String( match.title || "" ) );
            why = "";

            if( shown >= mdbPageCreator_prefixMaxPerName ) {
                why = "the row caps at " + mdbPageCreator_prefixMaxPerName + " chips per name, and they were taken";
            } else if( String( match.matchType || "" ) !== "prefix" || !match.title ) {
                // an exact or redirect answer would have answered the exact round already,
                // and a qualified one turns that chip green over there
                why = match.title
                    ? "a \"" + String( match.matchType || "?" ) + "\" answer, not a prefix one - the exact round is where it counts"
                    : "the answer names no category";
            } else if( mixes < mdbPageCreator_prefixMinMixes ) {
                why = "only " + mixes + " mix" + ( mixes === 1 ? "" : "es" ) + " - under the row's minimum of " + mdbPageCreator_prefixMinMixes;
            } else if( !matchKey || taken[matchKey] === true ) {
                why = "already a chip on the bar - a similar that IS a used category would say nothing";
            } else if( taken[matchKey] ) {
                why = "already shown as a similar of \"" + taken[matchKey] + "\"";
            } else {
                taken[matchKey] = name;
                shown++;
            }

            rec.decisions.push( { index: j, mixes: mixes, shown: !why, why: why } );
        }
    }

    // ... and the names the round refused to ask about at all, behind the asked ones: they
    // carry no answers and no verdicts, only the reason. The row never sees them - it renders
    // shown decisions and these have none - and the request never carried them either.
    for( i = 0; i < skipped.length; i++ ) {
        out.push( { name: skipped[i].name, status: "skipped", why: skipped[i].why, matches: [], decisions: [] } );
    }

    return out;
}

// mdbPageCreator_similarEntityFacts
// The "Switch title" facts the PREFIX round produces: the entity name the title writes and the
// wiki denied, next to a category whose own name starts with it. One fact per offer, in the
// shape mdbTitle_result's alternatives have ({ kind: "entityName", text, name }), so the bar,
// the toggle and the chip treat them like any other reading the build decided against.
//
// Why this exists: the exact round answered "no category of this name" for "Dirtybird Radio",
// the prefix round found "Dirtybird Radio Show" (a show with 9 mixes) - and that answer used to
// reach the "Similar:" row and nothing else. The name MixesDB HAS has to be one click from the
// title, and where it is written into the title the name that was denied has to be one click
// back: a category that exists is what a page can file under, and a name that does not is not
// suddenly right for being what the uploader typed.
//
// Two sources, and only one of them can answer at a time:
// - a promotion that already happened (mdbPageCreator_similarPromoted). The walk below cannot
//   find it again - the promoted name IS a category, so it is no longer one of the denied names
//   the prefix round asks about - and the chip has to survive that, in both directions
// - otherwise the round's own SHOWN answers, the very chips the "Similar:" row renders
//   (mdbPageCreator_prefixDecisions, the one walk both surfaces read), filed under the title's
//   ENTITY entries. Artists are left out on purpose: a category whose name merely starts like a
//   person's is usually another person ("Ben" -> "Ben Klock"), while a series written in full is
//   the same series. A promo title asks nothing here either - its entity entry is the
//   "Promo Mix" bucket, which is a category, so it never reaches the prefix round at all
function mdbPageCreator_similarEntityFacts( title ) {
    if( !title ) return [];

    if( mdbPageCreator_similarPromoted ) {
        return [ mdbPageCreator_similarEntityFact( mdbPageCreator_similarPromoted.text,
                                                   mdbPageCreator_similarPromoted.name,
                                                   mdbPageCreator_similarPromoted.about ) ];
    }

    var entries = mdbPageCreator_categoryEntries( title ),
        entities = {},
        decisions,
        facts = [],
        i, j, rec, match;

    for( i = 0; i < entries.length; i++ ) {
        if( entries[i].role === "entity" && entries[i].name ) {
            entities[ mdbTitle_normalizeCompare( entries[i].name ) ] = entries[i].name;
        }
    }

    decisions = mdbPageCreator_prefixDecisions( title );

    for( i = 0; i < decisions.length; i++ ) {
        rec = decisions[i];

        if( !entities[ mdbTitle_normalizeCompare( rec.name ) ] ) continue;

        for( j = 0; j < rec.decisions.length; j++ ) {
            if( !rec.decisions[j].shown ) continue;

            match = rec.matches[ rec.decisions[j].index ];

            if( !match || !match.title ) continue;

            // the same note the "Similar:" row writes behind its chip, off the same walk - the
            // two surfaces say one thing about one answer
            facts.push( mdbPageCreator_similarEntityFact( rec.name, match.title,
                String( match.type || "category" ) + ", " + rec.decisions[j].mixes +
                " mix" + ( rec.decisions[j].mixes === 1 ? "" : "es" ) ) );
        }
    }

    return facts;
}

// mdbPageCreator_similarEntityFact
// One such fact, with the sentence that has to read right in BOTH directions - the chip is a
// toggle, and which of the two names is in the title decides which way it points.
// about is the "show, 9 mixes" the "Similar:" row writes behind its chip, carried rather than
// re-derived: once the name is promoted, the answer it came from is no longer in the round's
// reach (see mdbPageCreator_similarEntityFacts), and the sentence must not quietly lose the
// two facts that make the offer weigh anything.
function mdbPageCreator_similarEntityFact( written, category, about ) {
    return {
        kind: "entityName",
        text: written,
        name: category,
        about: about,
        reason: "MixesDB has no category \"" + written + "\", and \"" + category + "\" is one whose name starts with it" +
                ( about ? " (" + about + ")" : "" ) + ". A category that exists is what the page can file under, so it is" +
                " the one worth the title. Where this really is a series of its own, the title keeps the name as written" +
                " and the page opens a category under it."
    };
}

// mdbPageCreator_applySimilarEntity
// The prefix round's settle path, the mirror of mdbPageCreator_applyRecentToSuggestion: where
// the round found exactly ONE similar category for the title's entity, that name goes into the
// SUGGESTION and the name the wiki denied becomes the chip offering the way back.
//
// Only the suggestion, never an edited field - the same fence every late answer stands behind.
// And only where there is exactly one offer: with two or three the row cannot tell which series
// this is, picking the first would be a guess dressed as an answer, and the chips already put
// every one of them one click away. That is the floor this step never goes under - the similar
// category is ALWAYS reachable as an alternative title, whether or not it was written.
//
// Callers render, and call mdbPageCreator_applyRecentToSuggestion() after it: the promoted name
// is a category that HAS pages, and their titles are what the episode number's spelling is
// learned from - which is the whole reason the existing category is worth writing.
function mdbPageCreator_applySimilarEntity() {
    if( !mdbPageCreator_title || mdbPageCreator_similarPromoted ) return;

    var facts = mdbPageCreator_similarEntityFacts( mdbPageCreator_title );

    if( facts.length !== 1 ) {
        if( facts.length ) {
            logVar( "mdbPageCreator_applySimilarEntity: " + facts.length + " similar categories for \"" + facts[0].text + "\"",
                    "none written into the title - all of them offered as \"Switch title\" chips" );
        }
        return;
    }

    var input = $("#mdb-pageCreator-title"),
        toggled = mdbPageCreator_altToggle( mdbPageCreator_title, facts[0] );

    // the toggle writes the name the title does NOT carry; a title already carrying the
    // category has nothing to promote
    if( !toggled || !toggled.adding || toggled.title === mdbPageCreator_title ) return;

    if( input.length && input.data( "mdb-edited" ) ) {
        log( "mdbPageCreator_applySimilarEntity: MixesDB has \"" + facts[0].name + "\", but the title was edited - not rewritten." );
        return;
    }

    logVar( "mdbPageCreator_applySimilarEntity: MixesDB has a category starting with this name",
            mdbPageCreator_title + "  ->  " + toggled.title );

    mdbPageCreator_similarPromoted = { text: facts[0].text, name: facts[0].name, about: facts[0].about };
    mdbPageCreator_title = toggled.title;
}

// mdbPageCreator_similarCategoriesHint
// The "Similar:" row - the prefix answers rendered under "Used categories". Only the
// survivors of mdbPageCreator_prefixDecisions render; which answer was dropped and why is
// that walk's call, shared with the panel's section 8. Each chip links the category and its
// note says what it is - the type and the count are facts, where a similarity number would
// only dress the resemblance up as one.
function mdbPageCreator_similarCategoriesHint( title ) {
    var decisions = mdbPageCreator_prefixDecisions( title ),
        chips = $("<span>").addClass( "mdb-pageCreator-hint-items" ),
        logged = [],
        any = false,
        i, j, rec, match, mixes, note;

    for( i = 0; i < decisions.length; i++ ) {
        rec = decisions[i];

        for( j = 0; j < rec.decisions.length; j++ ) {
            if( !rec.decisions[j].shown ) continue;

            match = rec.matches[ rec.decisions[j].index ];
            mixes = rec.decisions[j].mixes;
            any = true;

            note = String( match.type || "category" ) + ", " + mixes + " mix" + ( mixes === 1 ? "" : "es" );

            // the chip and its note side by side, like the "Hints:" row's pairs - the note
            // outside the pill, or the border would take it in
            chips.append(
                $("<span>").addClass( "mdb-pageCreator-hintCat" ).append(
                    $("<span>").addClass( "mdb-pageCreator-usedCat mdb-pageCreator-usedCat-similar" ).append(
                        $("<a>")
                            .attr( "href", mdbPageCreator_categoryUrl( match.title ) )
                            .attr( "target", "_blank" )
                            .attr( "title", "MixesDB has no category \"" + rec.name + "\", but this name starts the same" +
                                            " - opens [[Category:" + match.title + "]] (" + note + ")." +
                                            "\nOnly the NAME is similar: whether it is this page's is yours to judge." )
                            .text( match.title )
                    ),
                    $("<span>").addClass( "mdb-pageCreator-hintCat-note" ).text( "(" + note + ")" )
                )
            );

            logged.push( match.title + " (" + note + ", starts like \"" + rec.name + "\")" );
        }
    }

    if( !any ) return null;

    if( logged.join( " | " ) !== mdbPageCreator_similarLogged ) {
        mdbPageCreator_similarLogged = logged.join( " | " );
        logVar( "mdbPageCreator hints: similar categories", mdbPageCreator_similarLogged );
    }

    return $("<span>")
        .attr( "id", "mdb-pageCreator-similarCats" )
        .append(
            $("<span>").addClass( "mdb-pageCreator-hint-label" ).text( "Similar:" ),
            chips
        );
}

// mdbPageCreator_plainCategoryNote
// The tooltip of a plain chip - why this one is grey while the name next to it is a link. Each
// role says what decided the category, since that is what the reader is really asking when a
// chip does not answer to a click.
function mdbPageCreator_plainCategoryNote( entry ) {
    if( entry.role === "year" ) return "The year of the mix date - every year category exists on MixesDB.";
    if( entry.role === "promo" ) return "A self-released mix is filed under Promo Mix - our own filing, not a name read off the title.\nWhere the title above does not carry \"(Promo Mix)\" itself, that is because its name already says it (\"Mix\", \"Vol.\", ...).";
    if( entry.role === "tracklist" ) return "How the tracklist is filed - the Tracklist Editor API's answer about the box, not a name to look up.";
    if( entry.role === "style" ) {
        // a style the siblings settled is a filing the editor did not make, so the tooltip is
        // where it says who did and off what pages (mdbPageCreator_recentHintNote)
        return entry.learned
            ? "A style category read off the entity's recent pages: " + mdbPageCreator_recentHintNote( entry ) +
              ", and MixesDB files this name under Category:" + mdbPageCreator_styleParent +
              ".\nDelete the line on the created page where this mix is something else."
            : "A style category - the editor's call, not a name read off the title.";
    }

    return "This category goes on the page as it stands - nothing to look up on MixesDB.";
}

// mdbPageCreator_categoryFit
// How strongly this category is THIS PAGE's - { percent, reasons }, or null where there is
// nothing to score (no wiki answer at all, or a chip that is no name to look up).
//
// A DIFFERENT question from the reasoning panel's section 3, which is why it is a different
// number. There the question is "is the wiki's answer about this NAME right" - and by that
// measure "Undercurrent" scores 95%: the category is spelled exactly so and holds 28 mixes.
// Here the reader is asking "will the page be filed right", and the same answer is worth far
// less, because the wiki's Undercurrent is an Amsterdam venue while the title numbers its
// entity. So section 3's score is the BASE and the fit signals come off it.
//
// What it still cannot say - and the tooltip says so rather than letting the number imply it -
// is whether the parse picked the right WORDS. "Leon" is a real artist category with 69 mixes
// and a wrong reading of "Leon Row x Shimon", and nothing on this side can tell.
function mdbPageCreator_categoryFit( entry, state, title ) {
    if( typeof mdbTitle_matchConfidence !== "function" || typeof mdbTitle_confidence !== "function" ) return null;
    if( !state || state.verdict !== "known" || !state.match ) return null;

    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        key = mdbTitle_normalizeCompare( entry.name ),
        cached = Object.prototype.hasOwnProperty.call( cache, key ) ? cache[ key ] : null,
        list = ( cached && cached.matches && cached.matches.length ) ? cached.matches : [ state.match ],
        index = list.indexOf( state.match ),
        base = mdbTitle_matchConfidence( entry.name, list, index === -1 ? 0 : index, false ),
        conf = mdbTitle_confidence(),
        type = String( state.match.type || "" ),
        i;

    // section 3's verdict, carried over whole - its reasons are this score's reasons too
    conf.score = base.percent;

    for( i = 0; i < base.reasons.length; i++ ) conf.reasons.push( base.reasons[i] );

    // 1) the title's shape and the wiki's type say different things. A series numbers its
    // editions and a place does not, so this is two things sharing a name - the single
    // strongest "wrong category" signal there is, and the one the reported mix turned on.
    if( entry.numbered && /^(venue|event)$/.test( type ) ) {
        conf.drop( 45, "the title numbers this entity, so it is a series - while MixesDB knows this name as a " +
                       type + ", which numbers no editions" );
    }

    // 2) the category stopped being written long before this mix. Read off the same analysis
    // the recent-pages sections use (mdbPageCreator_recentAnalysisFor - it starts no fetch, so
    // a render stays free of side effects) and only for the entity, which is the only chip
    // that HAS sibling pages.
    var backing = [];

    if( entry.role === "entity" && title ) {
        var info = mdbPageCreator_recentAnalysisFor( title );

        if( info.stale && mdbTitle_normalizeCompare( info.catTitle ) === key ) {
            conf.drop( Math.min( 30, 10 + ( info.stale - mdbPageCreator_recentMaxAgeYears ) * 3 ),
                "the newest page in this category is " + info.stale + " years older than this mix - it may have" +
                " stopped being used, or not be this mix's at all" );
        }

        // 3) ... and the one signal that RAISES it: the category's own pages link this mix's
        // channel, which no name collision can fake. Worth +15 against doubts like "a single
        // word the wiki barely knows"; the clamp in percent() keeps the ceiling at 95, and
        // absence adds no doubt (see mdbPageCreator_channelLinkFinding). Reported 2026-08-20
        // on "DSS 140 | Space Drum Meditation".
        var linked = ( !info.skip && info.entry && mdbTitle_normalizeCompare( info.catTitle ) === key )
                ? mdbPageCreator_channelLinkFinding( info.entry )
                : null;

        if( linked && linked.count ) {
            conf.score += 15;
            backing.push( linked.count + " of the category's " + linked.n + " newest pages link this mix's channel (" +
                          linked.url + ") - the pages themselves say whose series this is" );
        }
    }

    return { percent: conf.percent(), reasons: conf.reasons, backing: backing };
}

// mdbPageCreator_categoryFitScore
// The fit as a badge behind the chip, coloured by the row score's bands. The tooltip carries
// the reasons - a bare number next to a category says nothing a reader can check - and closes
// with what the number does NOT cover, so a high one cannot be read as "this is right".
function mdbPageCreator_categoryFitScore( entry, state, title ) {
    var fit = mdbPageCreator_categoryFit( entry, state, title );

    if( !fit ) return null;

    var intro = "Confidence that [[Category:" + entry.name + "]] is the right category for this page.",
        caveat = "\n\nIt weighs the wiki's answer and how well it fits this page - never whether the title" +
                 " picked the right words. A category can score high and still be the wrong reading.",
        // the channel-link confirmation - the one positive signal, so it gets its own line
        // instead of standing among the doubts (a stale cached page_creator.js sends no
        // backing field, hence the guard)
        backs = ( fit.backing && fit.backing.length )
            ? "\n\nWhat backs it:\n- " + fit.backing.join( "\n- " )
            : "";

    return $("<span>")
        .addClass( "mdb-pageCreator-catFit mdb-pageCreator-score-" + mdbPageCreator_confidenceBand( fit.percent ) )
        .attr( "title", ( fit.reasons.length
            ? intro + "\n\nWhat lowered it:\n- " + fit.reasons.join( "\n- " )
            : intro + "\nThe wiki has this exact name, and nothing about this page argues against it." ) + backs + caveat )
        .text( fit.percent + "%" );
}

// mdbPageCreator_usedCategory
// One category name as a chip - the reasoning panel's chip look, coloured by the verdict:
//
// - known    green, linked to the category page, with its mix count behind it (a toggle for
//            the category's recent mix pages where the lookup brought them - see
//            mdbPageCreator_usedCatMixes). The link carries the WIKI's spelling, which is the
//            page that really exists; where that differs from what the title writes, the
//            tooltip says so, since that difference is a refinement worth making.
// - otherRole yellow like the "Similar:" chips, linked to the category page: the category
//            EXISTS - red would say it does not - but the wiki knows the name as something
//            the page's filing does not say ("Dommune" the venue as the page's artist). A
//            look to take, not a verdict: what is probably wrong is the title's roles, and
//            the tooltip says so.
// - missing  red, and the name IS the search link, the flat loupe behind it saying so - there
//            is no category page to open, and the search is the point: a red name is either
//            new or misspelled, and only a look at what MixesDB does have under that name
//            tells which.
// - unknown  grey. Never red: a name nobody asked about is not a name the wiki denied.
// - plain    muted grey, no link, no count - the year, the styles, "Promo Mix", the
//            "Tracklist:" filing. They are on the page like the others, but there is no wiki
//            answer behind them, and a link would promise one.
function mdbPageCreator_usedCategory( entry, state, title ) {
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

        // The title numbers this entity, so it is a series - and the wiki knows the name as a
        // place, which numbers no editions. The category exists, which is why the chip is
        // green, but it is probably not THIS one's: two different things share the name.
        if( entry.numbered && /^(venue|event)$/.test( String( state.match.type || "" ) ) ) {
            note += "\n\nThe title numbers this entity, so it is a series - but MixesDB knows \"" + spelled +
                    "\" as a " + state.match.type + ", which numbers no editions. Check that this is really the" +
                    " same thing before creating: the page would join that " + state.match.type + "'s category.";
        }

        out.addClass( "mdb-pageCreator-usedCat-known" ).append(
            $("<a>")
                // _blank, not the usual _top: looking a category up is a side trip taken
                // while judging the title on THIS page, and the row has to still be here
                // afterwards (same case as the toolkit's EDIT/HIST links). On a desktop-wide
                // window the modal intercepts the plain left click instead - see the
                // delegated handler above mdbPageCreator_hintLinkOnScreen - and this href is
                // what every other click keeps.
                .attr( "href", mdbPageCreator_categoryUrl( spelled ) )
                .attr( "target", "_blank" )
                .attr( "title", "MixesDB has this category - opens [[Category:" + spelled + "]]." + note )
                .text( entry.name )
        );

        // how well this answer fits THIS page, behind the count. Only on the page's own
        // categories: the "Hints:" row passes no title, and a hint is not a filing to be
        // confident about. Handed INTO the count's call instead of being appended after it,
        // so the folded-out mix pages stay the chip's last child - see
        // mdbPageCreator_usedCatMixes.
        mdbPageCreator_usedCatMixes( out, entry, state.match,
            title ? mdbPageCreator_categoryFitScore( entry, state, title ) : null );

        return out;
    }

    if( state.verdict === "otherRole" ) {
        var otherSpelled = state.match.title || entry.name,
            otherType = String( state.match.type || "category" );

        out.addClass( "mdb-pageCreator-usedCat-otherRole" ).append(
            $("<a>")
                .attr( "href", mdbPageCreator_categoryUrl( otherSpelled ) )
                .attr( "target", "_blank" )
                .attr( "title", "MixesDB has this category, but knows \"" + otherSpelled + "\" as a " + otherType +
                       " - not as an artist, which is how this page would file it. The roles in the title above are" +
                       " probably the wrong way round - check them before creating. Opens [[Category:" + otherSpelled + "]]." )
                .text( entry.name )
        );

        // the count toggle a green chip carries, no fit score: the fit would rate the answer
        // as a filing in this role, which is exactly what the chip is doubting
        mdbPageCreator_usedCatMixes( out, entry, state.match, null );

        return out;
    }

    if( state.verdict === "plain" ) {
        // no link and no count on purpose: there is no wiki answer behind these names, and a
        // link would promise one. Grey says exactly that - the page gets the category, and
        // that is the whole of it.
        return out.addClass( "mdb-pageCreator-usedCat-plain" ).append(
            $("<span>")
                .attr( "title", mdbPageCreator_plainCategoryNote( entry ) )
                .text( entry.name )
        );
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
// under the name, in a box attached below the chip - the list stays the chip's CHILD, only
// page_creator.css hangs it out of the line, so an open chip keeps its exact size and the
// chips behind it stay put: the fastest "does this page already exist?" look there is
// (row_enrichment.md §2). The toggle is offered whether or not the pages are on hand yet.
// The lookup answer usually brings them (mdbnames ships "recent" for every type since
// 2026-08-19), but a name typed into the title field can be answered before its pages are,
// and a count that reacts to nothing until they land is a count the reader clicks at twice.
// Where they are missing the click opens the chip on a waiter and starts the one request
// that fetches them (mdbPageCreator_usedCatFetchRecent), so the first click always does
// something. (The dead first click REPORTED on 2026-08-19 was a different fault, in the
// bar's rebuild - see mdbPageCreator_renderHints.)
// Only a category the wiki counts no mixes in keeps a plain count - there is nothing to fold
// out. The open one survives the bar's re-renders - see mdbPageCreator_openUsedCatRecent -
// and there is only ever one: opening a chip folds the others shut (the click handler below).
// A bucket category (mdbPageCreator_bucketCategories) gets neither the count nor the toggle:
// its pages are unrelated mixes, so "recently filed there" answers nothing about this one.
// The fit badge (mdbPageCreator_categoryFitScore) is handed in rather than appended by the
// caller once this returns: the folded-out list is a BLOCK, so a badge added after it sat
// under the last mix page instead of behind the count as soon as a chip was toggled open,
// and the score is about the category, not about the pages under it (reported 2026-08-19).
function mdbPageCreator_usedCatMixes( chip, entry, match, fit ) {
    // every way out of here still owes the chip its badge - a category that offers no count
    // at all is still a category the fit has an answer about
    function addFit() {
        if( fit ) chip.append( fit );
    }

    if( typeof match.mixes !== "number" ) { addFit(); return; }
    if( mdbPageCreator_isBucketCategory( match.title || entry.name ) ) { addFit(); return; }

    var text = match.mixes + ( match.mixes === 1 ? " mix" : " mixes" ),
        key = mdbTitle_normalizeCompare( match.title || entry.name ),
        recent = mdbPageCreator_usedCatRecent( match ),
        list = $("<span>").addClass( "mdb-pageCreator-usedCat-recent" ),
        i;

    // an empty category has nothing to fold out - the count stays the plain side note it was
    // before the toggle existed
    if( !match.mixes ) {
        chip.append( $("<span>").addClass( "mdb-pageCreator-usedCat-mixes" ).text( text ) );
        addFit();
        return;
    }

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

    // the list's word while it has no links: being fetched, failed, or genuinely empty. The
    // waiter is the usual one - the click below starts the fetch and re-renders, and the
    // render lands here with recentPending set.
    if( !recent.length ) {
        var note = $("<span>").addClass( "mdb-pageCreator-usedCat-recent-note" );

        if( match.recentFailed ) {
            note.text( "the lookup failed - open the category itself" );
        } else if( match.recentFetched ) {
            note.text( "no mix pages in this category yet" );
        } else {
            note.addClass( "mdb-pageCreator-usedCat-recent-waiting" ).text( "looking the pages up …" );
        }

        list.append( note );
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

                // ONE list at a time: opening this chip folds every other one shut. A second
                // open list broke the line the chips stand in - each list is as wide as its
                // longest mix title and as tall as ten of them, so the chips that shared a
                // line with an open one hung beside it in mid-air ("2026" next to one list,
                // "Tracklist: none" next to the next). Reported 2026-08-19. The state is
                // emptied rather than the one key flipped, so a later render (a keystroke in
                // the title field rebuilds the bar) cannot bring a closed one back.
                mdbPageCreator_openUsedCatRecent = {};

                if( nowOpen ) mdbPageCreator_openUsedCatRecent[ key ] = true;

                // the chips on screen follow that without waiting for a render: closing the
                // others is what the reader clicked for, and a render is only started below
                // where the pages still have to be fetched
                chip.closest( "#mdb-pageCreator-hints" )
                    .find( ".mdb-pageCreator-usedCat-open" )
                    .removeClass( "mdb-pageCreator-usedCat-open" );

                chip.toggleClass( "mdb-pageCreator-usedCat-open", nowOpen );

                if( !nowOpen ) return;

                // No pages yet: THIS click is what asks for them, and the chip stands open on
                // its waiter meanwhile. Re-rendered right away so the waiter is on screen
                // before the answer is, and again by the fetch when the links arrive.
                if( !recent.length && !match.recentPending && !match.recentFailed && !match.recentFetched ) {
                    mdbPageCreator_usedCatFetchRecent( match, entry.name );
                    mdbPageCreator_renderHints( $("#mdb-pageCreator") );
                }
            })
    );

    // behind the count and BEFORE the list, in this order: the list is the only block in the
    // chip, so everything that belongs on the chip's first line has to be in front of it
    addFit();

    chip.append( list );
}

// mdbPageCreator_noteApiCall
// mdbTitle_noteApiCall with the stale-cache guard every cross-file read in here carries: a
// userscript manager still holding an old title_builder.js has no call log, and a page fetch
// must not die of a missing PANEL feature. The stand-in record swallows the status writes the
// handlers make, so the caller needs no second branch.
function mdbPageCreator_noteApiCall( kind, subject, what, data ) {
    return ( typeof mdbTitle_noteApiCall === "function" )
        ? mdbTitle_noteApiCall( kind, subject, what, data )
        : { status: "" };
}

// mdbPageCreator_usedCatFetchRecent
// The recent mix pages of a category whose lookup answer brought none - the one request behind
// a chip clicked before its pages were on hand. One list=categorymembers call,
// cmsort=sortkey&cmdir=desc: mix page titles start with their date, so sortkey order is date
// order, and it follows an editor's manual sortkey where one files a page under its broadcast
// date (row_enrichment.md §2). Stored exactly as it comes, newest first, like every other
// "recent" - the chip is the one place that flips it for reading.
// The titles are written onto the MATCH object in mdbTitle_categoryCache, so the answer
// survives every re-render - and, like the cache, the page's navigations.
function mdbPageCreator_usedCatFetchRecent( match, fallbackName ) {
    var catTitle = match.title || fallbackName || "";

    if( !catTitle ) return;

    // no chip ever offers the toggle for a bucket category (mdbPageCreator_usedCatMixes), so
    // this is the safety net behind that: never spend a request on pages that are no siblings
    if( mdbPageCreator_isBucketCategory( catTitle ) ) {
        log( "mdbPageCreator_usedCatFetchRecent: \"" + catTitle + "\" is a bucket category - not fetched." );
        return;
    }

    logVar( "mdbPageCreator_usedCatFetchRecent", catTitle );

    match.recentPending = true;

    // recorded before it goes out, so the reasoning panel's section 3 can offer this exact URL
    // as an "API call" link next to the chip's category (mdbTitle_noteApiCall)
    var apiData = {
            action: "query",
            format: "json",
            formatversion: 2,
            origin: "*",
            list: "categorymembers",
            cmtitle: "Category:" + catTitle,
            cmnamespace: 0, // without it the answer is half File: pages
            cmsort: "sortkey",
            cmdir: "desc",
            cmlimit: 10
        },
        apiCall = mdbPageCreator_noteApiCall( "hintRecent", catTitle,
                      "the 10 newest pages of Category:" + catTitle + ", asked when its chip was folded open",
                      apiData );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: apiData,
        success: function( data ) {
            apiCall.status = "done";

            var members = ( data && data.query && data.query.categorymembers ) || [],
                titles = [],
                i;

            for( i = 0; i < members.length; i++ ) {
                if( members[i].title ) titles.push( members[i].title );
            }

            match.recentPending = false;
            // The flag rather than the array: an empty answer IS an answer, and without it
            // every further click would ask again for the nothing it already knows about.
            match.recentFetched = true;
            match.recent = titles;

            logVar( "mdbPageCreator_usedCatFetchRecent: " + catTitle, titles.length + " pages" );

            mdbPageCreator_renderHints( $("#mdb-pageCreator") );
        },
        error: function( xhr, status ) {
            apiCall.status = "failed";
            log( "mdbPageCreator_usedCatFetchRecent FAILED (" + status + ") for " + catTitle );
            match.recentPending = false;
            match.recentFailed = true;
            mdbPageCreator_renderHints( $("#mdb-pageCreator") );
        }
    });
}

// mdbPageCreator_usedCatRecent
// The recent mix pages of one lookup match, ready for the chip: the API's order FLIPPED, and
// nothing else done to them.
//
// Every source stores them newest first (cmsort=sortkey&cmdir=desc - the sortkey is the
// title's date, until an editor sets one by hand, and then that one). A MixesDB category page
// lists the same pages the other way round, oldest at the top, and that is the order the
// reader comparing the two has in their eye - so the chip turns the list round: oldest first,
// the newest page at its bottom.
//
// A flip, never a sort: re-sorting the titles here would throw the sortkey away -
// "2023-09-18 - Dan Andrei @ Sunwaves 31, Romania (Trommel.220)" carries the sortkey
// 2025-05-30, its release date, and belongs among the 2025 episodes rather than at the bottom
// of the list (mixesdb_api_request.md §6). Reversing keeps every page exactly where the wiki
// files it.
//
// The lookup's own "recent" is sorted that way too since 2026-08-19 - it arrived in
// cl_timestamp order until then, which is why this rule had to be written down at all
// (mixesdb_api_request.md §6). mdbPageCreator_recentFetch still writes the entity's list back:
// the same pages in the same order, plus the wikitext it read for the refinement.
function mdbPageCreator_usedCatRecent( match ) {
    return ( match && match.recent && match.recent.length ) ? match.recent.slice().reverse() : [];
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

// mdbPageCreator_switchTitleHint
// "Switch title: <alternative>" - the readings the build decided AGAINST
// (mdbPageCreator_alternatives, built in mdbTitle_result), each as the full title it would
// make, one per line under the categories. Clicking one swaps it with the title above, and
// because every chip is a TOGGLE derived from the current field text, the same slot then
// offers the way back - replaced in place, nothing re-orders under the click.
function mdbPageCreator_switchTitleHint( title ) {
    // ... plus the readings the PREFIX round decided (mdbPageCreator_similarEntityFacts).
    // Derived on every render rather than stored with the build's own: they answer about the
    // name the FIELD currently carries, and mdbPageCreator_setTitle - which the channel-URL
    // round calls a second time - replaces the stored list wholesale.
    var facts = mdbPageCreator_alternatives.concat( mdbPageCreator_similarEntityFacts( title ) );

    if( !title || !facts.length ) return null;

    var chips = $("<span>").addClass( "mdb-pageCreator-hint-items" ),
        hint = $("<span>")
            .attr( "id", "mdb-pageCreator-switchTitle" )
            .append(
                $("<span>").addClass( "mdb-pageCreator-hint-label" ).text( "Switch title:" ),
                chips
            ),
        offered = [],
        i;

    for( i = 0; i < facts.length; i++ ) {
        var fact = facts[i],
            toggled = mdbPageCreator_altToggle( title, fact );

        // a toggle that changes nothing (or has nothing to work on) offers no reading -
        // e.g. the reader edited the very marker out of recognition
        if( !toggled || !toggled.title || toggled.title === title ) continue;

        // ... and two facts that arrive at the same title offer it once: the promoted similar
        // category is a fact of its own AND, until the promotion is clicked away, findable by
        // the round's own walk
        if( offered.indexOf( toggled.title ) !== -1 ) continue;

        chips.append( mdbPageCreator_titleAltChip( fact, toggled ) );
        offered.push( toggled.title );
    }

    if( !offered.length ) return null;

    // logged the once they change, like the category verdicts - the bar re-renders on every
    // keystroke, and these DERIVE from the keystrokes
    if( offered.join( " | " ) !== mdbPageCreator_altsLogged ) {
        mdbPageCreator_altsLogged = offered.join( " | " );
        logVar( "mdbPageCreator hints: switch title", mdbPageCreator_altsLogged );
    }

    return hint;
}

// mdbPageCreator_titleAltChip
// One alternative reading as a chip: the full title it would switch to, grey on purpose - a
// chip here is a candidate, not a verdict, and the panel's chip rule (state, never type)
// holds in the bar too. The tooltip carries WHY the build decided the other way, which is the
// half the title alone cannot say.
function mdbPageCreator_titleAltChip( fact, toggled ) {
    return $("<span>").addClass( "mdb-pageCreator-titleAlt" ).append(
        // an <a> without href like the "N mixes" toggle: it navigates nowhere, and the
        // modal's delegated handler only watches links with one
        $("<a>")
            .attr( "title", fact.reason + "\n\nClick to switch the title above to this one" +
                   " - the slot then offers the current title back, so nothing is lost." )
            .text( toggled.title )
            .on( "click", function() {
                mdbPageCreator_applyAlternative( fact );
            })
    );
}

// mdbPageCreator_altToggle
// One alternative FACT applied to a title: { title, adding } - the toggled text, and whether
// the toggle ADDED its marker or took it out. A toggle over the CURRENT text on purpose,
// never a stored string: the field is edited and refined under the bar's feet, and a chip
// showing yesterday's spelling would quietly undo those corrections on the click.
function mdbPageCreator_altToggle( title, fact ) {
    title = String( title || "" );

    if( !title || !fact ) return null;

    var re, at, groups;

    if( fact.kind === "livePa" ) {
        re = /\s*\(\s*live\s*p\.?\s*a\.?\s*\)/i;

        if( re.test( title ) ) {
            return { title: title.replace( re, "" ).replace( /\s+/g, " " ).trim(), adding: false };
        }

        // behind the artist's name, the way mdbTitle_result writes it: in front of a live
        // title's " @ ", else at the end of the artist group, else - nothing to read groups
        // off - at the end
        at = title.indexOf( " @ " );

        if( at !== -1 ) {
            return { title: title.slice( 0, at ) + " (Live PA)" + title.slice( at ), adding: true };
        }

        groups = title.split( " - " );

        if( groups.length >= 2 ) {
            groups[1] += " (Live PA)";
            return { title: groups.join( " - " ), adding: true };
        }

        return { title: title + " (Live PA)", adding: true };
    }

    if( fact.kind === "promoMix" ) {
        re = /\s*\(\s*promo\s*mix\s*\)/i;

        if( re.test( title ) ) {
            return { title: title.replace( re, "" ).replace( /\s+/g, " " ).trim(), adding: false };
        }

        return { title: title + " (Promo Mix)", adding: true };
    }

    // The room inside the venue the build took off the place group ("@ Elsewhere Loft" ->
    // "@ Elsewhere"). Toggled on the PLACE the fact names, not on the end of the title: the
    // group can carry a city behind the venue, and the word belongs behind the venue itself.
    // The filing does not move with it - mdbPageCreator_entityCategory reduces the name again
    // off the lookup cache, so both readings file the page under the venue.
    if( fact.kind === "placeWord" && fact.text && fact.place ) {
        var placeRe = new RegExp( "(@\\s*" + mdbTitle_escapeRe( fact.place ) + ")(\\s+" +
                                  mdbTitle_escapeRe( fact.text ) + ")\\b", "i" );

        if( placeRe.test( title ) ) {
            return { title: title.replace( placeRe, "$1" ), adding: false };
        }

        placeRe = new RegExp( "(@\\s*" + mdbTitle_escapeRe( fact.place ) + ")(?![\\w])", "i" );

        if( placeRe.test( title ) ) {
            return { title: title.replace( placeRe, "$1 " + fact.text ), adding: true };
        }

        return null;
    }

    // The part the build cut off the END of the place group ("@ Sisyphos, Berlin, Dampfer" ->
    // "@ Sisyphos, Berlin"). Toggled on the PLACE the fact names, and it writes the words back
    // in FRONT of it - a group closes with its town, so the only spot MixesDB has for a floor,
    // a stage or the night's own name is ahead of the venue ("@ Dampfer, Sisyphos, Berlin").
    // The filing does not move with it: the page is filed under the group's first place, and
    // mdbPageCreator_entityCategoriesFor asks the wiki about the added name like any other.
    if( fact.kind === "placeTail" && fact.text && fact.place ) {
        var tailRe = new RegExp( "(@\\s*)" + mdbTitle_escapeRe( fact.text ) + "\\s*,\\s*(" +
                                 mdbTitle_escapeRe( fact.place ) + ")", "i" );

        if( tailRe.test( title ) ) {
            return { title: title.replace( tailRe, "$1$2" ), adding: false };
        }

        tailRe = new RegExp( "(@\\s*)(" + mdbTitle_escapeRe( fact.place ) + ")(?![\\w])", "i" );

        if( tailRe.test( title ) ) {
            return { title: title.replace( tailRe, "$1" + fact.text + ", $2" ), adding: true };
        }

        return null;
    }

    // The credit the build took off the act's name ("Kode9" <-> "Kode9 For Maharishi").
    // Toggled on the ACT the fact names, not on a fixed slot: the name stands in the artist
    // group, which can carry an "@" and a place behind it. Unlike the room word the FILING
    // moves with it - a page's artist category is read off the title - which is exactly what
    // this chip is for where the words are part of the name after all ("Dance For Life").
    if( fact.kind === "nameCredit" && fact.text && fact.act ) {
        var creditRe = new RegExp( "(" + mdbTitle_escapeRe( fact.act ) + ")(\\s+" +
                                   mdbTitle_escapeRe( fact.text ) + ")(?![\\w])", "i" );

        if( creditRe.test( title ) ) {
            return { title: title.replace( creditRe, "$1" ), adding: false };
        }

        creditRe = new RegExp( "(" + mdbTitle_escapeRe( fact.act ) + ")(?![\\w])", "i" );

        if( creditRe.test( title ) ) {
            return { title: title.replace( creditRe, "$1 " + fact.text ), adding: true };
        }

        return null;
    }

    // The show name a curated channel rule wrote over the title's own words ("Rhythm Prism
    // Radio 085" <-> "Rhythm Prism 085"). The build writes the name MixesDB HAS, because that is
    // the category the page files under; the chip offers the words the title really carried,
    // which were the closer candidate. Toggled on the NAME the fact carries, wherever it stands -
    // the entity slot can carry an episode number and a "(Promo Mix)" behind it, and the name
    // itself is the only fixed point. The filing moves with it, like the name-credit chip's:
    // mdbPageCreator_entityCategoryFor reads the entity out of the title.
    // The LONGER of the two names is tried first, whichever it is: the curated show can contain
    // the title's words ("Rhythm Prism Radio" holds "Rhythm Prism") and the words can contain the
    // show ("Juno Daily - In The Mix" holds "Juno Daily"), so testing the shorter one first would
    // match inside the longer and write the name twice.
    // Matched the way the curated rule matches its own keys (mdbTitle_escapeReLooseSeparators):
    // the same name is written with a dash, an en dash, a colon or nothing at all, and a chip
    // that only finds the punctuation the key happens to carry would offer nothing at all.
    if( fact.kind === "entityName" && fact.text && fact.name ) {
        var swaps = fact.name.length >= fact.text.length
                ? [ { from: fact.name, to: fact.text, adding: false },
                    { from: fact.text, to: fact.name, adding: true } ]
                : [ { from: fact.text, to: fact.name, adding: true },
                    { from: fact.name, to: fact.text, adding: false } ],
            swapRe,
            sw;

        for( sw = 0; sw < swaps.length; sw++ ) {
            swapRe = new RegExp( "(^|[^\\w])" + mdbTitle_escapeReLooseSeparators( swaps[sw].from ) + "(?![\\w])", "i" );

            if( swapRe.test( title ) ) {
                return { title: title.replace( swapRe, "$1" + swaps[sw].to ), adding: swaps[sw].adding };
            }
        }

        return null;
    }

    // The month stamp the monthly naming replaced ("August Promo Mix" <-> "August 2026 (Promo
    // Mix)"). Toggled on the entity slot the fact names, at the END of the title, which is
    // where the entity stands on a title that has one. The filing does not move - both
    // readings are a Promo Mix, and the bracketed one says so in the title itself.
    if( fact.kind === "monthName" && fact.text && fact.stamp ) {
        var stampRe = new RegExp( "\\s*[-\u2013]\\s*" + mdbTitle_escapeRe( fact.stamp ) +
                                  "\\s*\\(\\s*promo\\s*mix\\s*\\)\\s*$", "i" );

        if( stampRe.test( title ) ) {
            return { title: title.replace( stampRe, " - " + fact.text ), adding: false };
        }

        var namedRe = new RegExp( "\\s*[-\u2013]\\s*" + mdbTitle_escapeRe( fact.text ) + "\\s*$", "i" );

        if( namedRe.test( title ) ) {
            return { title: title.replace( namedRe, " - " + fact.stamp + " (Promo Mix)" ), adding: true };
        }

        return null;
    }

    // The slot of the night the place group was read with ("@ Obstgarten Closing, Rote
    // Dichte" -> "@ Rote Dichte"). Toggled on the EVENT the fact names, the way the room word
    // is toggled on the venue: the group can carry more behind the event, and the slot belongs
    // in front of it. The filing does not move with it - mdbTitle_placeGroupEntity steps over
    // a slot part, so both readings file the page under the event.
    if( fact.kind === "slotPart" && fact.text && fact.place ) {
        var slotRe = new RegExp( "(@\\s*)" + mdbTitle_escapeRe( fact.text ) + "\\s*,\\s*(" +
                                 mdbTitle_escapeRe( fact.place ) + ")", "i" );

        if( slotRe.test( title ) ) {
            return { title: title.replace( slotRe, "$1$2" ), adding: false };
        }

        slotRe = new RegExp( "(@\\s*)(" + mdbTitle_escapeRe( fact.place ) + ")(?![\\w])", "i" );

        if( slotRe.test( title ) ) {
            return { title: title.replace( slotRe, "$1" + fact.text + ", $2" ), adding: true };
        }

        return null;
    }

    // The live reading of a title that wrote an "@" in front of a "#"-numbered episode
    // ("2026 - Colossio - Melodic Therapy 217" <-> "2026 - Colossio @ Melodic Therapy 217,
    // Mexico"). Toggled on the ENTITY group the fact names, at the end of the title, which is
    // where that name stands in either reading - and the country goes with it, since a live
    // title carries it behind the place and a series title does not carry it at all. The
    // filing does not move: a place group is filed under its place, a country is never a
    // category, so both readings put the page under the same name.
    if( fact.kind === "liveAt" && fact.place ) {
        var placeTail = mdbTitle_escapeRe( fact.place ) +
                        ( fact.city ? "(?:\\s*,\\s*" + mdbTitle_escapeRe( fact.city ) + ")?" : "" ),
            liveRe = new RegExp( "\\s+@\\s*" + placeTail + "\\s*$", "i" );

        if( liveRe.test( title ) ) {
            return { title: title.replace( liveRe, " - " + fact.place ), adding: false };
        }

        var showRe = new RegExp( "\\s*[-\u2013]\\s*" + mdbTitle_escapeRe( fact.place ) + "\\s*$", "i" );

        if( showRe.test( title ) ) {
            return {
                title: title.replace( showRe, " @ " + fact.place + ( fact.city ? ", " + fact.city : "" ) ),
                adding: true
            };
        }

        return null;
    }

    // No "Part N" toggle, and none for anything else step 1c dropped: the parts of one
    // recording share ONE mix page, so appending the marker would start a duplicate rather
    // than offer a reading. The builder emits no such fact - see "Never offered back" in
    // mdbTitleDroppedBitPatterns (title_definitions.js).
    return null;
}

// mdbPageCreator_applyAlternative
// The chip's click: the field takes the toggled title and everything reading the field
// follows, exactly as if it had been typed - which is also what the swap counts as. Marking
// it edited is what keeps the next refresh and the recent-pages refinement from putting the
// suggestion back over a reading the editor chose on purpose.
function mdbPageCreator_applyAlternative( fact ) {
    var input = $("#mdb-pageCreator-title"),
        current = $.trim( input.val() ),
        toggled = mdbPageCreator_altToggle( current, fact );

    if( !input.length || !toggled || !toggled.title || toggled.title === current ) return;

    logVar( "mdbPageCreator_applyAlternative", current + "  ->  " + toggled.title );

    // The promo marker IS the filing: mdbPageCreator_entityCategoryFor reads the flag OR the
    // title's own "(Promo Mix)", so switching to the show reading has to clear the flag or
    // the page would file under Promo Mix either way - and switching to the promo reading
    // sets it, so the page text and the hints bar's "Used categories" tell the same story.
    if( fact.kind === "promoMix" ) {
        mdbPageCreator_promoCategory = toggled.adding;
    }

    input.data( "mdb-edited", true );
    // the input's own "change" handler resizes the field, re-renders the bar (where this
    // chip's slot now offers the way back), refills the report and queues the category
    // lookup - the same path a typed correction takes
    input.val( toggled.title ).trigger( "change" );
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The channel's URL - the lookup that asks about no NAME at all
 *
 * Every lookup above asks the wiki about names: the exact round (mdbTitle_lookupCategories),
 * the prefix round behind the names it denied (mdbPageCreator_prefixEnsure). Both are blind to
 * the channel whose name on the site is not the name on MixesDB - and there is nothing to spell
 * right in between:
 *
 *     SoundCloud channel  "EG en Español"      soundcloud.com/egesp
 *     MixesDB category    "Electronic Groove en Español Podcast"   (podcast, 90 mixes)
 *
 * The exact round answers empty, the prefix round answers empty ("EG en Español" starts no
 * category), and the 90 pages of the series sit there filed under a name no rule could reach.
 *
 * The wiki holds the connection all the same, as a LINK: a series' category page carries the
 * channel's URL in its text ("https://soundcloud.com/egesp" is the whole body of
 * Category:Electronic Groove en Español Podcast). So the last question worth asking is not
 * about a name at all - it is "which category page links this channel?", and MediaWiki answers
 * it with one request: list=exturlusage, namespace 14, the API behind Special:LinkSearch.
 *
 * What the answer is worth - and what it is not:
 *
 * - It is evidence about the CHANNEL and about nothing else. A category linking this channel
 *   is the wiki saying whose category it is; it does not say that THIS upload is an episode of
 *   it. So the finding hardens the channel name and stops there: it becomes the runtime twin
 *   of an mdbTitleUsernameConversions entry (mdbTitle_channelUrlShows in title_builder.js),
 *   the same "this channel's uploads are filed under that show" a maintainer would write by
 *   hand - never a name written into the title from somewhere else.
 * - And it is only written where THIS title backs it (mdbPageCreator_channelCatSupport): the
 *   title writing the name, a denied candidate opening it, the id its pages number their
 *   episodes with standing in the title. Without support the finding is reported and changes
 *   nothing - a channel can host a series and still upload a festival set.
 *
 * Two requests when it fires, and only when the names left something open: one exturlusage,
 * and the ordinary name lookup for what came back - the category has to arrive with its type,
 * its mix count and its recent pages like every other answer, and a category MixesDB gives no
 * type is not applied at all (a typeless category is not an artist and not a series).
 *
 * Cached per CHANNEL, not per page: the answer is about the channel, and the reader walking
 * ten tracks of the same one costs one request. The support test is re-run per title, since
 * that half is a question about the upload.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// What the channel-URL round found, keyed by the channel URL's needle (host + path, see
// mdbPageCreator_channelUrlNeedle): { status: "pending"|"done"|"failed", needle,
// cats: [ { title, url } ] (namespace 14, prefix bleed filtered out) }. Never reset - see the
// section comment; what did NOT happen for the current title is mdbPageCreator_channelCatSkip.
var mdbPageCreator_channelCatCache = {},
    // How many linking category pages are fetched. A channel is linked from one category, two
    // where an artist has both an artist and a show category (Deep Space Helsinki has); ten is
    // room for the odd case and still a list a reader can look at.
    mdbPageCreator_channelCatLimit = 10,
    // Why the round did not fire for THIS title, or "" - the panel says so rather than leaving
    // its block empty, since "not asked" and "asked, nothing found" are different answers.
    mdbPageCreator_channelCatSkip = "";

// mdbPageCreator_channelUrlNeedle
// The channel URL reduced to what NAMES the channel: "https://www.soundcloud.com/egesp/" ->
// "soundcloud.com/egesp". Scheme, "www."/"m.", a query, a fragment and a trailing slash all
// come off - they are how a URL is written, not which channel it points at.
// "" where there is nothing to compare: no channel URL handed over, or a URL without a path -
// a bare host would match every category whose pages embed anything from that site.
function mdbPageCreator_channelUrlNeedle( url ) {
    var needle = String( url || mdbPageCreator_channelUrl || "" ).toLowerCase()
            .replace( /^https?:\/\//, "" )
            .replace( /^(?:www|m)\./, "" )
            .replace( /[?#].*$/, "" )
            .replace( /\/+$/, "" );

    return needle.indexOf( "/" ) === -1 ? "" : needle;
}

// mdbPageCreator_channelUrlIsChannel
// Is this URL the channel itself (or a page of it), rather than one that merely STARTS like it?
// The fence around the API's answer: LinkSearch matches the path as a prefix, so a query for
// "soundcloud.com/deep-space" answers with deep-space-helsinki and deep-space-series alike.
// A URL part has to end where the needle does - "/", "?" or "#", or the string.
function mdbPageCreator_channelUrlIsChannel( url, needle ) {
    var got = String( url || "" ).toLowerCase()
            .replace( /^https?:\/\//, "" )
            .replace( /^(?:www|m)\./, "" )
            .replace( /\/+$/, "" );

    if( !needle || !got ) return false;
    if( got === needle ) return true;

    return got.indexOf( needle ) === 0 && "/?#".indexOf( got.charAt( needle.length ) ) !== -1;
}

// mdbPageCreator_channelCatWanted
// Whether this title still has a question the channel's URL could answer: a category the wiki
// KNOWS in the artist slot and one in the entity slot leave none - the mix has a name for who
// played and a name for what it is part of, both of them the wiki's own.
//
// Deliberately not "nothing was found at all": the common miss is the half one. "EGE.090 Adonis
// Rivera" resolves the artist perfectly and leaves the series to the raw channel name, which is
// exactly the case this round exists for.
function mdbPageCreator_channelCatWanted( title ) {
    var entries = mdbPageCreator_categoryEntries( title ),
        artist = false,
        entity = false,
        i;

    for( i = 0; i < entries.length; i++ ) {
        if( entries[i].role !== "artist" && entries[i].role !== "entity" ) continue;
        if( mdbPageCreator_usedCategoryState( entries[i] ).verdict !== "known" ) continue;

        if( entries[i].role === "artist" ) artist = true;
        else entity = true;
    }

    return !( artist && entity );
}

// mdbPageCreator_titleEpisodeIds
// The episode-id letters a text writes: "EGE" out of "EGE.090", "DSS" out of "DSS 140",
// "RA" out of "RA.971". Caps and at least two letters, and a number has to follow them - that
// shape is an id and nothing else, which is what keeps an ordinary word of a SHOUTED title
// from reading as one.
function mdbPageCreator_titleEpisodeIds( text ) {
    var re = /\b([A-Z]{2,})[\s.#-]*\d{1,5}\b/g,
        out = [],
        found;

    while( ( found = re.exec( String( text || "" ) ) ) !== null ) {
        if( out.indexOf( found[1] ) === -1 ) out.push( found[1] );
    }

    return out;
}

// mdbPageCreator_channelCatSupport
// What in THIS upload backs the found category - the comparison the finding is written on the
// strength of, one sentence per signal, empty where nothing backs it. The category page
// linking the channel says whose category it is; these say that this upload belongs in it.
//
// Compared against both titles, the player's and the suggestion's: the suggestion carries the
// channel name and the cleaned words, the player title carries what the uploader really wrote
// (the id "EGE.090" survives in both, a "Free Download" tag only in one).
//
// The signals, strongest first:
// 1. the title WRITES the category name - nothing to infer at all
// 2. the category's own pages number their episodes with an id this title carries
//    (mdbTitle_seriesIdPrefix off the recent titles the name lookup brought along)
// 3. that id spells the category's initials - the same evidence one step weaker, for a series
//    whose MixesDB pages do not write the id (a category filled from another platform)
// 4. the channel name opens the category name, or the other way round ("HATE" / "HATE Podcast")
// 5. a name the wiki DENIED opens it - the denied candidate and the category are the same
//    series under two spellings ("Deep Space" / "Deep Space Series")
function mdbPageCreator_channelCatSupport( catTitle, match, title ) {
    var player = mdbPageCreator_sourceTitle || "",
        channel = mdbPageCreator_sourceChannel || "",
        cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        log = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        ids = mdbPageCreator_titleEpisodeIds( player ).concat( mdbPageCreator_titleEpisodeIds( title ) ),
        out = [],
        i;

    // 1) the title writes it
    if( mdbPageCreator_titleWritesName( player, catTitle ) || mdbPageCreator_titleWritesName( title, catTitle ) ) {
        out.push( "the title writes \"" + catTitle + "\"" );
    }

    // 2) its pages number their episodes with an id this title carries
    var scheme = ( typeof mdbTitle_seriesIdPrefix === "function" ) ? mdbTitle_seriesIdPrefix( match ) : "";

    for( i = 0; scheme && i < ids.length; i++ ) {
        if( ids[i].toUpperCase() === scheme.toUpperCase() ) {
            out.push( "its pages number their episodes \"" + scheme + " <n>\", the id this title carries" );
            break;
        }
    }

    // 3) ... or the id spells its initials. A PREFIX counts, the way it does for the channel's
    // own initials (mdbTitle_isChannelInitials): "EGE" for "Electronic Groove en Español
    // Podcast" drops the "Podcast" the series does not abbreviate.
    var initials = ( typeof mdbTitle_initialsOf === "function" ) ? mdbTitle_initialsOf( catTitle ) : "";

    for( i = 0; initials.length > 1 && i < ids.length; i++ ) {
        if( ids[i].length > 1 && initials.indexOf( ids[i].toUpperCase() ) === 0 ) {
            out.push( "\"" + ids[i] + "\" in the title spells the category's initials (" + initials + ")" );
            break;
        }
    }

    // 4) the channel name and the category name open each other
    if( channel && ( mdbPageCreator_nameStartsName( channel, catTitle ) || mdbPageCreator_nameStartsName( catTitle, channel ) ) ) {
        out.push( "the channel name \"" + channel + "\" and the category name open each other" );
    }

    // 5) a name the wiki denied is the same series spelled otherwise
    for( i = 0; i < log.length; i++ ) {
        if( log[i].pending || log[i].failed || log[i].skipped ) continue;
        if( mdbTitle_knownMatch( cache, log[i].name, null ) ) continue;
        if( !mdbPageCreator_nameStartsName( log[i].name, catTitle ) ) continue;

        out.push( "\"" + log[i].name + "\", which MixesDB has no category of, opens it" );
        break;
    }

    return out;
}

// mdbPageCreator_channelCatFinding
// The round's verdict for THIS title: { cat, match, support, show } or null. cat is the
// category whose page links the channel, match the wiki's answer about it (type, mix count,
// recent pages), support the sentences that back it and show the name the parse is handed -
// "" for an ARTIST category, which says the channel is a person, not a series.
//
// Of several linking categories the best BACKED one wins, and only when it is backed better
// than the rest: a channel with an artist AND a show category (Deep Space Helsinki has both)
// is exactly where the title has to pick, and where it says nothing about either, nothing
// picks - `ambiguous` marks that and the apply stops at it. A mix count is no argument here:
// which of a channel's two categories THIS upload belongs in is not decided by which of them
// is fuller. It only orders two answers the title backs equally, so the panel names one.
// A category MixesDB answers nothing about is never picked - see the section comment.
function mdbPageCreator_channelCatFinding( entry, title ) {
    var cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        entityTypes = ( typeof mdbTitle_entityTypes !== "undefined" && mdbTitle_entityTypes ) ? mdbTitle_entityTypes : [],
        typed = [],
        i;

    if( !entry || entry.status !== "done" ) return null;

    for( i = 0; i < entry.cats.length; i++ ) {
        var cat = entry.cats[i],
            match = mdbTitle_knownMatch( cache, cat.title, null );

        if( !match || !match.type ) continue;

        typed.push( {
            cat: cat,
            match: match,
            support: mdbPageCreator_channelCatSupport( cat.title, match, title ),
            // "" says the channel is a PERSON, not a series - no show name is grown from an
            // artist category, whatever backs it
            show: entityTypes.indexOf( String( match.type ) ) === -1 ? "" : ( match.title || cat.title )
        } );
    }

    if( !typed.length ) return null;

    typed.sort( function( a, b ) {
        return ( b.support.length - a.support.length ) || ( ( b.match.mixes || 0 ) - ( a.match.mixes || 0 ) );
    } );

    typed[0].ambiguous = typed.length > 1 && typed[1].support.length === typed[0].support.length;
    typed[0].others = typed.slice( 1 );

    return typed[0];
}

// mdbPageCreator_channelCatApply
// Writes the finding where the parse reads it (mdbTitle_channelUrlShows) and says whether the
// suggestion has to be built again. Only a SUPPORTED finding of a series type is written: an
// artist category names no show, and an unsupported one is a fact about the channel that this
// upload gives no reason to act on.
function mdbPageCreator_channelCatApply( entry, title ) {
    var found = mdbPageCreator_channelCatFinding( entry, title ),
        key = ( typeof mdbTitle_normalizeCompare === "function" ) ? mdbTitle_normalizeCompare( mdbPageCreator_sourceChannel ) : "";

    if( !found ) return false;

    // the panel's chips: the name came out of a URL, not out of the title - without a role and
    // an origin it reads as invented, like every other asked name (mdbPageCreator_reasoningOrigin)
    if( typeof mdbTitle_noteCandidateSource === "function" ) {
        mdbTitle_noteCandidateSource( found.cat.title, "channel URL" );
    }
    if( typeof mdbTitle_noteCandidateRole === "function" ) {
        mdbTitle_noteCandidateRole( found.cat.title, found.show ? "entity" : "artist" );
    }

    if( !found.show || !found.support.length || found.ambiguous || !key ) return false;
    if( typeof mdbTitle_channelUrlShows === "undefined" ) return false;

    var was = mdbTitle_channelUrlShows[key];

    mdbTitle_channelUrlShows[key] = {
        show: found.show,
        type: found.match.type,
        mixes: found.match.mixes,
        url: entry.needle,
        catTitle: found.cat.title
    };

    logVar( "mdbPageCreator_channelCatApply: " + mdbPageCreator_sourceChannel + " ->", found.show +
            " (" + found.match.type + ", linked from " + entry.needle + ")" );

    // nothing to rebuild when the map already said this - the second track of the same channel
    return !was || was.show !== found.show;
}

// mdbPageCreator_channelCatEnsure
// Fires the round for this title where it has anything to answer, and calls back with whether
// the suggestion has to be built again. Always calls back, synchronously where nothing is
// asked - a dead request means the parse carries on with what the names said, which is what it
// did before this existed.
//
// Called from the suggestion's lookup callback only, and after its own tail: this is one more
// request and nothing else may wait for it. Not from the edit path either - a typed title is
// the editor's reading, and the channel has not changed with it.
function mdbPageCreator_channelCatEnsure( title, done ) {
    var finish = function( changed ) { if( done ) done( !!changed ); },
        needle = mdbPageCreator_channelUrlNeedle();

    mdbPageCreator_channelCatSkip = "";

    if( !needle ) {
        mdbPageCreator_channelCatSkip = "not asked - this site hands no channel URL over";
        return finish( false );
    }

    // no suggestion to harden: the track is under the 20 min minimum, or nothing could be read
    // off its title at all
    if( !title ) {
        mdbPageCreator_channelCatSkip = "not asked - there is no suggested title to back a finding";
        return finish( false );
    }

    if( !mdbPageCreator_channelCatWanted( title ) ) {
        mdbPageCreator_channelCatSkip = "not asked - the wiki answered for both slots, so the URL has nothing left to add";
        return finish( false );
    }

    var entry = mdbPageCreator_channelCatCache[needle];

    // A channel this tab already asked about: the ANSWER stands, the support does not - it is
    // a question about the upload, and the next track of the same channel asks it anew.
    if( entry ) {
        return finish( entry.status === "done" ? mdbPageCreator_channelCatApply( entry, title ) : false );
    }

    entry = mdbPageCreator_channelCatCache[needle] = { status: "pending", needle: needle, cats: [] };

    var apiData = {
            action: "query",
            format: "json",
            formatversion: 2,
            origin: "*",
            list: "exturlusage",
            // the leading "*." takes the subdomains with it and the bare host too, which is how
            // Special:LinkSearch reads a target; without it a page writing "m.soundcloud.com/..."
            // is invisible
            euquery: "*." + needle,
            eunamespace: 14, // Category
            eulimit: mdbPageCreator_channelCatLimit,
            euprop: "title|url"
        },
        apiCall = mdbPageCreator_noteApiCall( "channelCat", "",
                      "which MixesDB category pages link this mix's channel (" + needle + ") - " +
                      "the question no name could answer",
                      apiData );

    logVar( "mdbPageCreator_channelCatEnsure: asking which category links", needle );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: apiData,
        success: function( data ) {
            apiCall.status = "done";

            var rows = ( data && data.query && data.query.exturlusage ) || [],
                names = [],
                seen = {},
                i, name, key;

            for( i = 0; i < rows.length; i++ ) {
                // the prefix bleed: "soundcloud.com/deep-space" answers with deep-space-helsinki
                if( !mdbPageCreator_channelUrlIsChannel( rows[i].url, needle ) ) continue;

                name = String( rows[i].title || "" ).replace( /^Category:/, "" ).trim();
                key = mdbTitle_normalizeCompare( name );

                if( !name || !key || seen[key] ) continue;

                seen[key] = true;
                entry.cats.push( { title: name, url: String( rows[i].url || "" ) } );
                names.push( name );
            }

            entry.status = "done";

            logVar( "mdbPageCreator_channelCatEnsure: " + needle + " is linked from",
                    names.length ? names.join( " | " ) : "(no category page)" );

            if( !names.length ) {
                mdbPageCreator_renderReasoning( $("#mdb-pageCreator") );
                return finish( false );
            }

            // What those categories ARE: the ordinary name lookup, so the found name arrives
            // with its type, its mix count and its recent pages like every other answer - and
            // lands in the same cache, where the chips and the entity slot read it.
            mdbTitle_lookupCategories( names, function() {
                finish( mdbPageCreator_channelCatApply( entry, title ) );
            });
        },
        error: function( xhr, status ) {
            apiCall.status = "failed";
            entry.status = "failed";
            log( "mdbPageCreator_channelCatEnsure FAILED (" + status + ") for " + needle +
                 " - carrying on with what the names said." );
            mdbPageCreator_renderReasoning( $("#mdb-pageCreator") );
            finish( false );
        }
    });
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
 * - the PAGE TEXT: the artwork line, the file details body, the "== Notes ==" section and the
 *   style categories (mdbPageCreator_pageText / _categoryEntries), reasoning panel section 7
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
        // stale/proven/staleKept are filled at the age gate at the bottom: by how many years
        // the category lags, why it was kept anyway, and the lag it was kept with
        info = { entity: read.entity || "", catName: "", catTitle: "", match: null, isPlace: false, entry: null, skip: "",
                 stale: 0, proven: "", staleKept: 0 },
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
        // The disambiguation bracket the title's own place group picks, before anything else:
        // "As You Like It" answers with the Frankfurt category and the San Francisco one, and
        // the plain read below would take whichever the server ranked first - the pages read
        // as this mix's siblings would then be another continent's club nights.
        qualified = mdbPageCreator_placeQualified( catName, title ),
        // the entity reading first: "fabric" the venue is the entity even where "Fabric" the
        // artist answers too - only a name the wiki knows as NOTHING else falls to the artist
        // match, which is then a skip
        match = ( qualified && qualified.match ) ||
                mdbTitle_knownMatch( cache, catName, [ "podcast", "show", "radio", "internet radio", "internetradio", "venue", "event", "recordlabel", "record label" ] ) ||
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

    // A numbered entity is a SERIES, and the wiki knowing that name as a place is then a
    // collision, not a home. Reported on the DEEP & HAZY mix (2026-08-19): the title reads
    // "Undercurrent 5" - episode 5 of something - while MixesDB's Undercurrent is an
    // Amsterdam venue, so the pages read as this mix's siblings were club nights of another
    // Undercurrent altogether. Nobody numbers the editions of a venue.
    if( info.isPlace && mdbPageCreator_entityIsNumbered( info.entity ) ) {
        info.skip = "numbered-place";
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

    // ... and the pages have to be from anywhere near this mix's time. Reported on the
    // DEEP & HAZY / Undercurrent mix (2026-08-19): its title reads "Undercurrent 5" as a
    // series, MixesDB has a VENUE of that name, and that category's newest page is from 2015.
    // Eleven years of nothing say two things at once - the category may not be this mix's at
    // all, and even if it is, a convention nobody has written since 2015 is no convention for
    // a 2026 upload. Everything downstream rests on "these are this mix's siblings", so the
    // gate belongs here, where that claim is made, and not on each of the things learned.
    info.stale = mdbPageCreator_recentStaleBy( info, read.year );

    // ... unless the pages PROVE the category is this mix's after all
    // (mdbPageCreator_recentProvenOwn): the gate doubts whose category this is as much as
    // how current it is, and evidence answering the first makes dropping it for the second
    // wrong. The proof is kept for the panel, which has to say why pages this old were read.
    if( info.stale ) {
        info.proven = mdbPageCreator_recentProvenOwn( info, read );

        if( info.proven ) {
            logVar( "mdbPageCreator_recentAnalysisFor: dormant category kept, proven this mix's",
                    info.catTitle + " - " + info.proven );
            info.staleKept = info.stale;
            info.stale = 0;
        }
    }

    if( info.stale ) {
        // the entry goes with the verdict: every reader of info.entry then finds nothing,
        // whether or not it thought to ask about skip, and the two sections report the reason
        // off info.skip, which they check first
        info.skip = "stale";
        info.entry = null;
    }

    return info;
}

// mdbPageCreator_entityIsNumbered
// Does the title's entity slot carry an EPISODE number - "Undercurrent 5", "Trommel.251",
// "RA Podcast (RA.1051)"? Only a series numbers its editions. Our own markers are gone by the
// time this is asked (mdbTitle_dropMarkers in mdbTitle_titleCategories), so a bracket still
// standing at the end is an episode ID and nothing else.
function mdbPageCreator_entityIsNumbered( entity ) {
    var name = String( entity || "" ).trim();

    return !!name && ( /\([^()]*\)$/.test( name ) || /[\s.]\d{1,5}$/.test( name ) );
}

// mdbPageCreator_recentPageLimit
// How many of a category's newest pages are fetched and voted on. The one place the number
// lives: the request asks for it twice (generator + list), the "API call" line names it, and
// the panel's "Read:" line tells "the 10 newest pages of" a big category from "all 4 pages of"
// a small one by comparing against it.
var mdbPageCreator_recentPageLimit = 10;

// mdbPageCreator_recentMaxAgeYears
// How far the newest page of a category may lag behind the mix before its pages stop being
// evidence about it. Three years: a series that has not had a page written in three years is
// dormant, and a dormant category next to a fresh upload is as likely to be a name collision
// as a home. Only THIS direction is a problem - siblings NEWER than the mix are the normal
// case for an old recording someone is adding today, and they are the pages worth copying.
var mdbPageCreator_recentMaxAgeYears = 3;

// mdbPageCreator_recentStaleBy
// By how many years the category's newest page lags behind the mix, or 0 while it is within
// mdbPageCreator_recentMaxAgeYears (or while there is nothing to compare yet). The date is
// read off the newest page's TITLE, which is where a MixesDB mix page carries it, and the
// pages arrive newest first (mdbPageCreator_recentFetch sorts by sortkey, and a sortkey is
// that date).
function mdbPageCreator_recentStaleBy( info, mixYear ) {
    var entry = info.entry,
        year = parseInt( mixYear, 10 );

    if( !entry || entry.status !== "done" || !entry.titles.length || !year ) return 0;

    var newest = parseInt( String( entry.titles[0] ).slice( 0, 4 ), 10 );

    if( !newest ) return 0;

    var gap = year - newest;

    return gap > mdbPageCreator_recentMaxAgeYears ? gap : 0;
}

// mdbPageCreator_recentProvenOwn
// Why this category is PROVEN to be this mix's, or "" where nothing proves it. What lifts
// the age gate below: `stale` doubts two things at once - "a convention nobody has written
// in years is no convention for this upload" and "this category may not even be this mix's"
// - and a category that answers the second with evidence has no business being dropped for
// the first. Reported 2026-08-20 on "DSS 140 | Space Drum Meditation": Category:Deep Space
// Series' newest page is from 2016 and the mix is episode 140 of the same series on the same
// channel, so the ten-year gap says the wiki stopped keeping up, not that the pages are
// somebody else's. How a series titles its pages does not go stale.
//
// Two proofs, both off pages already fetched:
// 1. their titles carry the very episode id this title does ("Deep Space Series (DSS 012)"
//    against a title numbering "DSS 140") - available on every site, since it compares the
//    title against the wiki
// 2. their wikitext links this mix's channel (mdbPageCreator_channelLinkFinding), which
//    needs the site to have handed a channelUrl over
//
// Neither proof is about the CONVENTIONS being current - they say whose category this is.
// That is the doubt worth answering: a series whose MixesDB pages stopped in 2016 still
// titles episode 140 the way it titled episode 012, and where the two disagree the 90% vote
// is what decides anyway.
function mdbPageCreator_recentProvenOwn( info, read ) {
    var entry = info.entry;

    if( !entry || entry.status !== "done" || !entry.titles.length ) return "";

    // 1) the pages write the episode id this title carries
    var bracket = /\(([^()]*)\)\s*$/.exec( String( read.entity || "" ) ),
        acro = bracket ? /^([A-Za-z]{2,})[\s.#-]*\d{1,5}$/.exec( mdbTitle_trimSeparators( bracket[1] ) ) : null,
        scheme = acro ? mdbTitle_seriesIdPrefix( { title: info.catTitle, recent: entry.titles } ) : "";

    if( scheme && scheme.toUpperCase() === acro[1].toUpperCase() ) {
        return "its pages are titled \"" + info.catTitle + " (" + scheme + " <n>)\", the very episode id this title carries";
    }

    // 2) ... or they link this mix's channel
    var linked = mdbPageCreator_channelLinkFinding( entry );

    if( linked && linked.count ) {
        return linked.count + " of its " + linked.n + " pages link this mix's channel (" + linked.url + ")";
    }

    return "";
}

// mdbPageCreator_channelLinkFinding
// How many of the entity category's fetched sibling pages link THIS mix's channel - the URL
// evidence that the category really is this channel's series. Category:Deep Space Series'
// pages all embed soundcloud.com/deep-space-series/... players, so the channel URL standing
// in their wikitext ties the category to the channel more directly than any name can
// (reported 2026-08-20 on "DSS 140 | Space Drum Meditation", where a lone "DSS" and the
// channel's own category competed for the filing). Presence is the only signal: pages
// WITHOUT the URL prove nothing - older pages, other platforms, a series that moved hosts -
// so nothing anywhere charges for absence.
//
// Computed fresh per call, never baked into the category's cached findings: the cache
// survives navigations, and the next mix resolving the same category belongs to a different
// channel. Ten indexOf runs over ~10 wikitexts cost nothing.
//
// Returns { url, count, n } or null where nothing can be compared: no channelUrl handed
// over, no pages fetched, or a channel URL without a path - a bare host would "confirm"
// every category whose pages embed anything from that site.
function mdbPageCreator_channelLinkFinding( entry ) {
    if( !mdbPageCreator_channelUrl || !entry || entry.status !== "done" || !entry.pages.length ) return null;

    // reduced to the part that NAMES the channel - "soundcloud.com/deep-space-series" - by the
    // same function the channel-URL round asks the wiki with, so the two can never disagree
    // about which URL this channel is
    var needle = mdbPageCreator_channelUrlNeedle();

    if( !needle ) return null;

    // The needle has to sit at URL boundaries in the text: preceded by the scheme's slash (or
    // a "www." the sibling wrote), and ended where a URL part ends - so a track URL of the
    // channel ("...deep-space-series/solma") counts and "...deep-space-series-2" does not.
    var re = new RegExp( "(?:^|[\\s\\/.\"'=|<>(\\[{])" + mdbTitle_escapeRe( needle ) + "(?=[\\/?#\"'|\\s<>\\]})]|$)", "i" ),
        count = 0,
        i;

    for( i = 0; i < entry.pages.length; i++ ) {
        if( re.test( String( entry.pages[i].text || "" ) ) ) count++;
    }

    return { url: needle, count: count, n: entry.pages.length };
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

    // A category opened a second time answers out of the cache and runs no fetch at all, so
    // the style question is asked here too. Idempotent - a name already answered about is not
    // asked again (mdbPageCreator_styleCatEnsure).
    if( info.entry.status === "done" ) mdbPageCreator_styleCatEnsure( info.entry.text, info.catTitle );

    // The one place a title is known to have settled on a category, which is what the Notes
    // resolve waits for - the fetch's settle path reaches here through
    // mdbPageCreator_applyRecentToSuggestion(), the debounced edit path calls this directly,
    // and a series opened a second time (cache hit, no settle at all) still comes past.
    // Idempotent: everything is gated and a URL already asked about is not asked twice.
    mdbPageCreator_notesEnsureResolved();

    return info;
}

// mdbPageCreator_recentFetch
// The one request behind everything learned: the ~10 newest pages of the category WITH their
// wikitext. generator=categorymembers with gcmsort=sortkey&gcmdir=desc - a mix page title
// starts with its date, so the sortkey IS the date, and it honours an editor's manual sortkey
// on top. NEVER gcmsort=timestamp, which sorts by when a page was (re)filed into the category
// and floats every re-saved old page to the top (see CLAUDE.md and mixesdb_api_request.md §6).
// The same category rides along as a plain list=categorymembers, which is what carries that
// order into the answer - see the data block below.
function mdbPageCreator_recentFetch( catTitle, key ) {
    logVar( "mdbPageCreator_recentFetch", catTitle );

    // recorded before it goes out, so sections 5 and 7 can offer this exact URL as an
    // "API call" link - they are read off nothing else (mdbTitle_noteApiCall)
    var apiData = {
            action: "query",
            format: "json",
            formatversion: 2,
            origin: "*",
            generator: "categorymembers",
            gcmtitle: "Category:" + catTitle,
            gcmnamespace: 0, // without it the answer is half File: pages
            gcmsort: "sortkey",
            gcmdir: "desc",
            gcmlimit: mdbPageCreator_recentPageLimit,
            prop: "revisions",
            rvprop: "content",
            rvslots: "main",
            // The SAME category once more as a plain list, in the same request: the
            // generator's sortkey order does not survive the response (query.pages comes
            // back in pageid order, and there is no index to restore it from), while
            // query.categorymembers IS that order. Rebuilding it from the titles instead
            // would mis-file every page whose editor set a sortkey by hand. Costs no
            // round trip and ~1 KB - see the success handler.
            list: "categorymembers",
            cmtitle: "Category:" + catTitle,
            cmnamespace: 0,
            cmsort: "sortkey",
            cmdir: "desc",
            cmlimit: mdbPageCreator_recentPageLimit
        },
        apiCall = mdbPageCreator_noteApiCall( "recent", catTitle,
                      "the " + mdbPageCreator_recentPageLimit + " newest pages of Category:" + catTitle + " with their wikitext",
                      apiData );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: apiData,
        success: function( data ) {
            apiCall.status = "done";

            var entry = mdbPageCreator_recentAnalysisCache[ key ],
                pages = ( data && data.query && data.query.pages ) || [],
                ordered = ( data && data.query && data.query.categorymembers ) || [],
                texts = {},
                got = [],
                i, rev, slot;

            for( i = 0; i < pages.length; i++ ) {
                if( !pages[i].title ) continue;

                rev = ( pages[i].revisions && pages[i].revisions[0] ) || null;
                slot = rev && rev.slots && rev.slots.main ? rev.slots.main : null;

                texts[ pages[i].title ] = String( ( slot && slot.content ) || "" );
            }

            // the list module's answer is the sortkey order - the wikitext is filed into it,
            // and nothing here re-sorts anything. Both modules asked for the same 10 pages of
            // the same category, so the titles line up.
            for( i = 0; i < ordered.length; i++ ) {
                if( !ordered[i].title || !( ordered[i].title in texts ) ) continue;

                got.push( { title: ordered[i].title, text: texts[ ordered[i].title ] } );
            }

            // no list module in the answer, or not one title matched: the pages are still
            // there, so show them in the one order the response does carry rather than
            // nothing at all - newest first is what everything downstream expects
            if( !got.length ) {
                for( i = 0; i < pages.length; i++ ) {
                    if( pages[i].title ) got.push( { title: pages[i].title, text: texts[ pages[i].title ] } );
                }

                got.sort( function( a, b ) { return a.title < b.title ? 1 : a.title > b.title ? -1 : 0; } );
            }

            entry.status = "done";
            entry.pages = got;
            // Does the category hold MORE than the 10 asked for? The answer carries a
            // "continue" exactly then - both modules asked the same category with the same
            // limit - and without it these pages are the whole category, which is what the
            // "Read:" line says instead of "the 4 newest pages" (reported 2026-08-20: that
            // reads like 6 pages were skipped, when Category:(Extended Mix) simply has 4).
            entry.more = !!( data && data.continue );
            entry.titles = got.map( function( p ) { return p.title; } );
            entry.text = mdbPageCreator_recentPageTextFindings( catTitle, got );

            logVar( "mdbPageCreator_recentFetch: " + catTitle, entry.titles.length + " pages, newest \"" + ( entry.titles[0] || "-" ) + "\"" );

            // a category the pages agree on is only written where MixesDB calls it a style -
            // the second request, fired the moment there is a name to ask about, long before
            // anyone clicks "Create" (mdbPageCreator_styleCatEnsure)
            mdbPageCreator_styleCatEnsure( entry.text, catTitle );

            // the hints bar's list for this category rides along - the same pages in the same
            // order the lookup answer carries, kept in one place so the chip and the refinement
            // can never quote two different "recent" lists
            var match = ( typeof mdbTitle_categoryCache !== "undefined" )
                ? mdbTitle_knownMatch( mdbTitle_categoryCache, catTitle, null )
                : null;

            if( match && match.title === catTitle ) {
                match.recent = entry.titles.slice();
                // ... and with it whatever the chip's own fetch left behind: this answer is
                // the newer one, so a chip still waiting on that request (or given up on it)
                // heals on the next render (mdbPageCreator_usedCatMixes)
                match.recentPending = false;
                match.recentFailed = false;
                match.recentFetched = true;
            }

            mdbPageCreator_recentSettled();
        },
        error: function( xhr, status ) {
            apiCall.status = "failed";
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

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Is this shared category a STYLE?
 *
 * The categories the entity's recent pages agree on (signal C) are two different things
 * wearing one shape. "Techno" on all 10 of Category:Amplify Series' newest pages is what the
 * series sounds like, and the created page belongs in it. "Amsterdam Dance Event" on all 10 of
 * Category:Undercurrent's is what those pages happen to have in common - the venue's MixesDB
 * pages are sets from four ADE editions - and writing it onto an unrelated episode is a wrong
 * filing made for the editor.
 *
 * Nothing in the vote can tell those apart, so it is not guessed: MixesDB is asked. Its style
 * categories are the ones filed under Category:Style, and one prop=categories call with
 * clcategories=Category:Style answers yes/no per name in ~200 bytes (verified 2026-08-20:
 * Techno, Deep House, Tech House, Acid Techno, Drum & Bass -> yes; Amsterdam Dance Event
 * carries Category:Event; "Melodic Techno" does not exist on MixesDB at all).
 *
 * A name that comes back yes is WRITTEN into the page's style lines; everything else stays the
 * hint it has been since 2026-08-19. This replaced an earlier attempt that asked mdbnames and
 * wrote whatever it did NOT know (page_text_learning.md) - that inferred a style from an empty
 * answer, where this one has the wiki say what the name is.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// The parent category MixesDB files its style categories under.
var mdbPageCreator_styleParent = "Style";

// Every member of Category:Style, fetched 2026-08-20 (111 names, one call, no continuation).
// Baked in because the vocabulary is essentially static - style categories are added rarely and
// never renamed - so the usual case costs no request at all: only a learned name NOT on this
// list still asks the API, which is what catches a style added after this snapshot.
var mdbPageCreator_knownStyles = [
    "2 Step", "Acid", "Acid House", "Acid Techno", "Afro House", "Afrobeat", "Amapiano",
    "Ambient", "Balearic", "Ballroom", "Bass", "Bassline", "Big Beat", "Bigroom", "Boogie",
    "Booty", "Breakbeat", "Breakbeat Hardcore", "Breakcore", "Breaks", "Broken Beat",
    "Chill Out", "Chiptune", "Classical", "Club Music", "Dancehall", "Darkwave", "Deep House",
    "Deep Tech House", "Deep Techno", "Detroit Techno", "Disco", "Downtempo", "Drum & Bass",
    "Dub", "Dub Techno", "Dubstep", "EBM", "Electro", "Electro Pop", "Electro Swing",
    "Electronica (Synthesizer)", "Euro House", "Experimental", "Freestyle", "Funk",
    "Future Jazz", "Future Rave", "Ghetto", "Goa Trance", "Gospel", "Gqom", "Grime",
    "Halftime", "Happy Hardcore", "Hard House", "Hard Techno", "Hard Trance", "Hardcore",
    "Hardcore Techno", "Hardstyle", "Hip Hop", "Hip House", "House", "House (Old School)",
    "Hyper Pop", "IDM", "Indie Dance", "Industrial", "Italodance", "Jazz", "Juke", "Jungle",
    "Latin", "Leftfield", "Library Music", "Lo-Fi House", "Lovers Rock", "Minimal", "New Beat",
    "Noise", "Northern Soul", "Pop", "Prog Rock", "Progressive", "Progressive House",
    "Progressive Trance", "Psychedelic", "Psytrance", "R&B", "Rare Groove", "Rave", "Reggae",
    "Rhythmic Noise", "Rock", "Soul", "Soundtrack", "Synth Pop", "Synthwave", "Tech House",
    "Techno", "Trance", "Trap", "Tribal", "Trip Hop", "Turntablism", "UK Funky", "UK Garage",
    "Various", "Vocal House", "World Music"
];

// ... as a lookup, exact spelling - the wiki is case-sensitive, so "techno" is not "Techno"
var mdbPageCreator_knownStyleSet = {};

(function() {
    for( var i = 0; i < mdbPageCreator_knownStyles.length; i++ ) {
        mdbPageCreator_knownStyleSet[ mdbPageCreator_knownStyles[i] ] = true;
    }
})();

// What MixesDB answered about a shared category, keyed by the name exactly as the sibling
// pages write it - the wiki is case-sensitive, so "Techno" and "techno" are two categories and
// must not share an answer: { status: "pending"|"done"|"failed", isStyle: bool }.
// Never reset, like mdbPageCreator_recentAnalysisCache: what Category:Techno IS does not change
// from one player page to the next, and styles repeat across entities, so the second series
// voting for Techno costs no request at all.
var mdbPageCreator_styleCatCache = {};

// mdbPageCreator_styleCatVerdict
// "yes" | "no" | "" (nobody asked, the answer is still out, or the request died). Only "yes"
// writes a category onto the page, so every other state falls back to the hint.
function mdbPageCreator_styleCatVerdict( name ) {
    // the baked-in Category:Style membership answers most names without anyone being asked
    if( mdbPageCreator_knownStyleSet[ name ] ) return "yes";

    var entry = Object.prototype.hasOwnProperty.call( mdbPageCreator_styleCatCache, name )
            ? mdbPageCreator_styleCatCache[ name ]
            : null;

    if( !entry || entry.status !== "done" ) return "";

    return entry.isStyle ? "yes" : "no";
}

// mdbPageCreator_styleCatEnsure
// Asks about every learned name there is no answer about yet. Called where the findings are
// born (the fetch's success handler) and where a category answers out of the cache without a
// fetch (mdbPageCreator_recentEnsureFor) - never from a render, which stays free of side
// effects. Idempotent: a name already in the cache is not asked again.
function mdbPageCreator_styleCatEnsure( findings, catTitle ) {
    var learned = ( findings && findings.styles && findings.styles.learned ) || [],
        ask = [],
        i, name;

    // the vote produces at most four names (mdbPageCreator_recentPageTextFindings); the cap is
    // the safety net, since a titles= list is one request whatever is in it
    for( i = 0; i < learned.length && ask.length < 10; i++ ) {
        name = learned[i].name;

        // a name on the baked-in style list needs no request - only an unknown one might be a
        // style added to the wiki after the snapshot
        if( !name || mdbPageCreator_knownStyleSet[ name ] ) continue;
        if( Object.prototype.hasOwnProperty.call( mdbPageCreator_styleCatCache, name ) ) continue;

        mdbPageCreator_styleCatCache[ name ] = { status: "pending", isStyle: false };
        ask.push( name );
    }

    if( ask.length ) mdbPageCreator_styleCatFetch( ask, catTitle );
}

// mdbPageCreator_styleCatFetch
// The one request behind a written style line: prop=categories over the learned names, narrowed
// to the single parent that answers the question (clcategories). A name MixesDB files under
// Category:Style comes back carrying it, a name it does not comes back without a categories
// array at all, and a category that does not exist comes back "missing" - all three are the
// same yes/no here.
function mdbPageCreator_styleCatFetch( names, catTitle ) {
    logVar( "mdbPageCreator_styleCatFetch", names.join( ", " ) );

    var titles = [],
        i;

    for( i = 0; i < names.length; i++ ) titles.push( "Category:" + names[i] );

    // recorded before it goes out, so reasoning section 7 can offer this exact URL as an
    // "API call" link next to the verdict it is read off (mdbTitle_noteApiCall)
    var apiData = {
            action: "query",
            format: "json",
            formatversion: 2,
            origin: "*",
            prop: "categories",
            clcategories: "Category:" + mdbPageCreator_styleParent,
            cllimit: "max",
            titles: titles.join( "|" )
        },
        apiCall = mdbPageCreator_noteApiCall( "style", catTitle,
                      "whether MixesDB files " + names.join( ", " ) + " under Category:" + mdbPageCreator_styleParent,
                      apiData );

    $.ajax({
        url: mdbTitle_categoryApiUrl,
        type: "get",
        dataType: "json",
        data: apiData,
        success: function( data ) {
            apiCall.status = "done";

            var pages = ( data && data.query && data.query.pages ) || [],
                answered = {},
                logged = [],
                i, title;

            // MediaWiki answers about the NORMALIZED title ("Category:Deep_House" comes back as
            // "Category:Deep House"), and a name read out of wikitext may carry the underscores
            for( i = 0; i < pages.length; i++ ) {
                title = String( pages[i].title || "" ).replace( /^Category:/, "" ).replace( /_/g, " " ).trim();

                if( title ) answered[ title ] = !!( pages[i].categories && pages[i].categories.length );
            }

            for( i = 0; i < names.length; i++ ) {
                var isStyle = !!answered[ names[i].replace( /_/g, " " ).trim() ];

                mdbPageCreator_styleCatCache[ names[i] ] = { status: "done", isStyle: isStyle };

                logged.push( names[i] + ": " + ( isStyle ? "style - written onto the page" : "no style - stays a hint" ) );
            }

            logVar( "mdbPageCreator_styleCatFetch: " + catTitle, logged.join( " | " ) );

            mdbPageCreator_render();
        },
        error: function( xhr, status ) {
            apiCall.status = "failed";
            log( "mdbPageCreator_styleCatFetch FAILED (" + status + ") for " + names.join( ", " ) );

            // a name nobody could answer about is not a style line: the page keeps its empty
            // rows and the finding stays the hint it was
            for( var i = 0; i < names.length; i++ ) {
                mdbPageCreator_styleCatCache[ names[i] ] = { status: "failed", isStyle: false };
            }

            mdbPageCreator_render();
        }
    });
}

// mdbPageCreator_recentLearnedCategories
// The categories the entity's recent sibling pages agree on, split by what MixesDB says they
// ARE - the one place that split is made, so the page text, the bar and the panel can never
// tell three stories about the same name:
// - styles: known style categories, so they go ONTO the page (at most two - a vote is a
//   heuristic)
// - hints:  everything else that cleared the vote, the names still being asked about among
//   them. Reported under the row and written nowhere (mdbPageCreator_recentHintCategories)
// - otherStyles: styles some pages carried WITHOUT clearing the vote (Tech House on 1 of
//   Amplify Series' 10). They are not written - but they are why a blank style row is left
//   behind the written ones: this mix may be one of the pages that carry a second style. A
//   series whose pages use only the written style leaves no blank behind it.
function mdbPageCreator_recentLearnedCategories( title ) {
    var info = mdbPageCreator_recentAnalysisFor( title ),
        findings = ( !info.skip && info.entry && info.entry.status === "done" ) ? info.entry.text : null,
        learned = ( findings && findings.styles && findings.styles.learned ) || [],
        tally = ( findings && findings.styles && findings.styles.tally ) || [],
        out = { styles: [], hints: [], otherStyles: [] },
        written = {},
        i, entry;

    for( i = 0; i < learned.length; i++ ) {
        entry = {
            name: learned[i].name,
            count: learned[i].count,
            n: learned[i].n,
            catTitle: info.catTitle || info.catName || ""
        };

        if( mdbPageCreator_styleCatVerdict( entry.name ) === "yes" ) {
            entry.role = "style";
            entry.learned = true;

            if( out.styles.length < 2 ) {
                out.styles.push( entry );
                written[ entry.name ] = true;
            }
        } else {
            entry.role = "hint";

            if( out.hints.length < 2 ) out.hints.push( entry );
        }
    }

    for( i = 0; i < tally.length; i++ ) {
        if( written[ tally[i].name ] ) continue;
        if( mdbPageCreator_styleCatVerdict( tally[i].name ) !== "yes" ) continue;

        out.otherStyles.push( { name: tally[i].name, count: tally[i].count, n: tally[i].n } );
    }

    return out;
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

// mdbPageCreator_recentHintCategories
// The half of the vote that is NOT written: what the entity's recent sibling pages agree on
// and MixesDB does not file under Category:Style. For the hints bar's "Hints:" row and the
// reasoning panel - never for the page itself.
//
// The vote measures what those pages have in COMMON, which is not the same question as what
// the music is, and Category:Undercurrent shows both halves of that at once: its 10 newest
// pages carry Techno 5, House 3 and Tech House 2, while "Amsterdam Dance Event" stands on all
// 10. The pages are all sets from an ADE edition; the venue is not a festival, its MixesDB
// pages are just a festival's. So a winner the wiki does not call a style is REPORTED and
// never written: a chip with a note saying which pages it came off, which is information an
// editor can act on, next to a "Create" that files nothing on the strength of it.
//
// The styles among the winners take the other exit - onto the page
// (mdbPageCreator_recentLearnedCategories).
function mdbPageCreator_recentHintCategories( title ) {
    return mdbPageCreator_recentLearnedCategories( title ).hints;
}

// mdbPageCreator_recentHintNote
// The sentence behind a hint chip: which pages it was read off. Short on purpose - it stands
// in a row of the bar, not in the panel, and the full vote is section 7's job.
function mdbPageCreator_recentHintNote( entry ) {
    var whose = entry.catTitle ? entry.catTitle + "'s" : "the entity's";

    return entry.count === entry.n
        ? "all " + entry.n + " of " + whose + " newest pages carry it"
        : entry.count + " of " + whose + " " + entry.n + " newest pages carry it";
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

// mdbPageCreator_playerWikitext
// The {{Player}} the new page carries. A player page can only ever hand over the ONE URL it
// is, so what the siblings decide here is the SHAPE (page_text_learning.md, signal E): a
// series that publishes every episode on two platforms writes {{Player|mode=mirrors}} with a
// line per platform, and the created page gets that shape with the mirror line EMPTY, for the
// editor to paste the second URL into.
//
// MixesDB answers an empty mirror line with "No value for one of the players!" instead of a
// player, so the page cannot be saved unnoticed with a slot still open - the loud version of
// the blank style rows, and on a series whose every page carries the mirror that is the right
// kind of loud. Where the siblings use the plain one-URL form, or agree on nothing, the shape
// is the one every created page had before.
function mdbPageCreator_playerWikitext( findings ) {
    var mirrors = findings && findings.player && findings.player.value === "mirrors",
        slots = [ mdbPageCreator_playerUrl ],
        i;

    if( mirrors ) {
        slots = [];

        for( i = 0; i < ( findings.playerSlots || 2 ); i++ ) slots.push( "" );

        slots[ mdbPageCreator_playerSlot( findings ) ] = mdbPageCreator_playerUrl;
    }

    return mdbPageCreator_playerTemplate( mirrors ? "|mode=mirrors" : "", slots );
}

// mdbPageCreator_playerSlot
// WHICH line this player's URL goes on, as an index into the mirror slots. The platforms sit
// in a fixed order on a series' pages - Category:RA Podcast opens with the Apple Podcasts link
// and has SoundCloud second on all 10 of its newest pages - so a SoundCloud URL written into
// line 1 there would leave one page of the series out of order. Only a slot that EVERY mirror
// page fills with this host counts: below that the URL stays on line 1, which is where it
// stood before any of this.
function mdbPageCreator_playerSlot( findings ) {
    var hosts = ( findings && findings.playerHosts ) || [],
        host = mdbPageCreator_urlHost( mdbPageCreator_playerUrl ),
        i;

    if( !host ) return 0;

    for( i = 0; i < hosts.length; i++ ) {
        if( hosts[i] && hosts[i] === host ) return i;
    }

    return 0;
}

// mdbPageCreator_playerTemplate
// The template as MixesDB writes it: the head, then one " |URL" line per slot.
//
// A URL holding a "=" has to be written as "|1=URL". MediaWiki reads everything in front of
// the "=" as a parameter NAME otherwise, and the page ends up with a player whose URL is the
// literal "{{{1}}}" (verified against the live parser on 2026-08-19; Category:RA Podcast
// writes all of its Apple Podcasts links numbered for exactly this reason). Numbering is
// all-or-nothing: an unnumbered line following a numbered one is parameter 1 again and
// overwrites it, which the same test showed as the "No value for one of the players!" box.
function mdbPageCreator_playerTemplate( head, slots ) {
    var numbered = false,
        out = "{{Player" + head + "\n",
        i;

    for( i = 0; i < slots.length; i++ ) {
        if( String( slots[i] ).indexOf( "=" ) > -1 ) numbered = true;
    }

    for( i = 0; i < slots.length; i++ ) {
        out += " |" + ( numbered ? ( i + 1 ) + "=" : "" ) + slots[i] + "\n";
    }

    return out + "}}";
}

// mdbPageCreator_notesBody
// The text under a page's "== Notes ==" heading, or null where the page has no such section.
// Read to the next section heading; a "=== Sub ===" under Notes stays part of it, and the
// category block at the foot of the page ends it where Notes is the last section.
function mdbPageCreator_notesBody( text ) {
    var t = String( text || "" ),
        // \r tolerated: $ under /m sits before the \n, and a page saved with CRLF would keep
        // the heading from matching at all
        head = /^[ \t]*==[ \t]*Notes[ \t]*==[ \t\r]*$/im.exec( t );

    if( !head ) return null;

    var rest = t.slice( head.index + head[0].length ),
        end = /^[ \t]*==[^=]|^\[\[[ \t]*Category[ \t]*:/m.exec( rest );

    return end ? rest.slice( 0, end.index ) : rest;
}

// mdbPageCreator_urlHost
// The host of a wikitext URL, as everything here compares hosts: lower case, no scheme and no
// leading "www." - so a series that writes "https://www.liebrand.nl/…" on one page and
// "https://liebrand.nl/…" on the next votes for one and the same host.
function mdbPageCreator_urlHost( url ) {
    var m = /^https?:\/\/(?:www\.)?([^\/?#\s]+)/i.exec( String( url || "" ) );

    return m ? m[1].toLowerCase() : "";
}

// mdbPageCreator_notesUrlRe
// A URL as it stands in a DESCRIPTION, where the wikitext rules do not apply: the scheme and
// the "www." are optional, because uploaders write "groove.de/2026/08/12/…" as readily as the
// full thing. Deliberately loose - it can match a "feat.Somebody" too, and that costs nothing:
// only a match on the host the siblings actually link is ever looked at.
var mdbPageCreator_notesUrlRe = /(?:https?:\/\/)?(?:www\.)?([a-z0-9][-a-z0-9]*(?:\.[-a-z0-9]{2,})+)(\/[^\s<>\]"')]*)?/gi;

// mdbPageCreator_notesUrlMinPath
// How much has to follow the host before a link in the description counts as THIS mix's page.
// A bare "groove.de/" is the magazine's front page and stands in half its descriptions, while
// an episode page is "groove.de/2026/08/12/groove-podcast-513-danny-daze/" - long by
// construction, since the slug carries the date and the episode's name. Ten characters is the
// first cut at that line and the number to move when a series is found that writes shorter
// ones (a "/p/12345" would sit just under it).
var mdbPageCreator_notesUrlMinPath = 10;

// mdbPageCreator_notesShorteners
// Link shorteners worth following for the Notes section. Only true redirectors belong here -
// a linktr.ee or a smarturl.it is a landing page with many links on it, so following one
// answers with itself and costs a request for nothing. Kept in step with the @connect lines
// of the site script that hands over followRedirect: a host missing there costs the reader a
// permission dialog, a host missing here is never followed at all. Meant to grow from reports.
var mdbPageCreator_notesShorteners = [ "bit.ly", "tinyurl.com", "t.co", "ow.ly", "buff.ly",
                                       "rb.gy", "is.gd", "cutt.ly", "shorturl.at" ];

// mdbPageCreator_notesUrlIn
// The first URL in a text that stands on host and carries enough path to be an episode page,
// or "". The one rule the Notes link is decided by, so it is asked of BOTH texts it can come
// from: the description, and whatever a shortener resolved to. On the second that makes it the
// validation - a shortener pointing anywhere but the host the siblings link answers "" here
// and nothing is written.
function mdbPageCreator_notesUrlIn( text, host ) {
    var m;

    if( !text || !host ) return "";

    // a global regex keeps lastIndex between calls - and this one is called on every render
    mdbPageCreator_notesUrlRe.lastIndex = 0;

    while( ( m = mdbPageCreator_notesUrlRe.exec( String( text ) ) ) ) {
        if( m[1].toLowerCase() !== host ) continue;

        // running text glues the sentence's own punctuation onto the URL
        var path = String( m[2] || "" ).replace( /[.,;:!?)\]]+$/, "" );

        if( path.length < mdbPageCreator_notesUrlMinPath ) continue;

        // the host as the text writes it (scheme and "www." included), so only the scheme is
        // ever added
        var written = m[0].slice( 0, m[0].length - String( m[2] || "" ).length );

        return ( /^https?:\/\//i.test( written ) ? "" : "https://" ) + written + path;
    }

    return "";
}

// mdbPageCreator_notesSources
// The texts the Notes link is looked for in, in search order, each with the name the reasoning
// panel calls it by. The description is the prose one; the "Buy" / "Free download" field is one
// URL the uploader set deliberately, so it is filled on plenty of tracks whose description
// names nothing - on SoundCloud it is purchase_url, and every Groove Podcast episode has its
// bit.ly in it. Both are searched by the same rule and both can hold a shortened link.
function mdbPageCreator_notesSources() {
    return [
        { from: "the description", text: mdbPageCreator_description },
        { from: "the player's buy/download link", text: mdbPageCreator_purchaseUrl }
    ];
}

// mdbPageCreator_notesFind
// The first source naming a page on host, as { url, from }, or null. What the panel needs on
// top of the URL is WHICH source it came out of - "the description says nothing but the buy
// link does" is the kind of thing a reader has to be able to see.
function mdbPageCreator_notesFind( host ) {
    var sources = mdbPageCreator_notesSources(),
        i, url;

    for( i = 0; i < sources.length; i++ ) {
        url = mdbPageCreator_notesUrlIn( sources[i].text, host );

        if( url ) return { url: url, from: sources[i].from };
    }

    return null;
}

// mdbPageCreator_notesShortenerFind
// The first shortened link in any source, normalized to https, as { url, from } or null. What
// mdbPageCreator_notesEnsureResolved() offers the site's followRedirect - never written
// anywhere itself: a bit.ly address on a mix page rots the day the shortener does.
function mdbPageCreator_notesShortenerFind() {
    var sources = mdbPageCreator_notesSources(),
        i, m;

    for( i = 0; i < sources.length; i++ ) {
        mdbPageCreator_notesUrlRe.lastIndex = 0;

        while( ( m = mdbPageCreator_notesUrlRe.exec( String( sources[i].text || "" ) ) ) ) {
            var host = m[1].toLowerCase();

            if( mdbPageCreator_notesShorteners.indexOf( host ) === -1 ) continue;

            var path = String( m[2] || "" ).replace( /[.,;:!?)\]]+$/, "" );

            // "bit.ly/" with nothing behind it is not a link to anywhere
            if( path.length < 2 ) continue;

            // https regardless of how it was written - SoundCloud's purchase_url field holds
            // these as plain http, and the shorteners all answer on https
            return { url: "https://" + host + path, from: sources[i].from };
        }
    }

    return null;
}

// mdbPageCreator_notesEnsureResolved
// Follows a shortened link where that is the only way to the episode's page. Called from
// mdbPageCreator_recentEnsureFor() and nowhere else - a settle path, never a render, since it
// starts a request.
//
// Four gates before anything is requested, so the usual track costs nothing: the site has to
// have handed over a resolver, the series has to link a host at all, no source may already
// name that host outright, and one of them has to hold a shortened link. On the tracks that
// pass, that is one HEAD request per player page.
function mdbPageCreator_notesEnsureResolved() {
    if( typeof mdbPageCreator_followRedirect !== "function" ) return;

    var info = mdbPageCreator_recentAnalysisFor( mdbPageCreator_title ),
        findings = ( info.entry && info.entry.status === "done" ) ? info.entry.text : null,
        host = ( findings && findings.notesHost && findings.notesHost.value ) || "";

    if( !host || host === "none" ) return;
    if( mdbPageCreator_notesFind( host ) ) return;

    var short = mdbPageCreator_notesShortenerFind();

    if( !short || short.url === mdbPageCreator_notesAsked ) return;

    // the four move together: an answer still standing while a DIFFERENT link is being
    // followed would be read as that link's
    mdbPageCreator_notesAsked = short.url;
    mdbPageCreator_notesAskedFrom = short.from;
    mdbPageCreator_notesResolved = "";
    mdbPageCreator_notesResolveDone = false;

    logVar( "mdbPageCreator_notesEnsureResolved: following", short.url + " from " + short.from + " (looking for " + host + ")" );

    // Unlike mdbPageCreator_recentSettled this one DOES need the page generation: the answer is
    // written into per-track state, so one landing after the reader moved on would put the
    // previous track's link into the next track's Notes.
    var pageGeneration = mdbPageGeneration;

    mdbPageCreator_followRedirect( short.url, function( target ) {
        if( !mdbIsCurrentPage( pageGeneration ) ) return;

        mdbPageCreator_notesResolved = String( target || "" );
        mdbPageCreator_notesResolveDone = true;

        logVar( "mdbPageCreator_notesEnsureResolved: followed", short.url + " -> " + ( mdbPageCreator_notesResolved || "(nothing)" ) );

        mdbPageCreator_render();
    });
}

// mdbPageCreator_recentNotesUrl
// The URL the new page's "== Notes ==" section starts with, or "" for an empty line. The
// siblings say WHICH host to look for - "the episode's own page on groove.de" is knowledge
// only their Notes sections carry - and the sources are searched for a link on it.
//
// Never a guess: a URL is written only where one really leads to that host, either because a
// source names it or because a shortened link in one resolved there
// (mdbPageCreator_notesEnsureResolved). Groove Podcast is the case that needs the second half:
// its descriptions write "Go to bit.ly/BRCPod for track list" and its purchase_url field holds
// that same bit.ly, which is a 301 to the groove.de page that belongs in Notes.
function mdbPageCreator_recentNotesUrl( findings ) {
    var host = ( findings && findings.notesHost && findings.notesHost.value ) || "";

    if( !host || host === "none" ) return "";

    var found = mdbPageCreator_notesFind( host );

    return found ? found.url : mdbPageCreator_notesUrlIn( mdbPageCreator_notesResolved, host );
}

// mdbPageCreator_titleIsLiveRecording
// Does this MixesDB page title read as a set recorded somewhere - "... - Artist @ Venue, City
// (Series 12)"? The "@" in the artist bit is the whole test, the same one
// mdbTitle_titleCategories makes when it takes the entity from behind the joiner.
function mdbPageCreator_titleIsLiveRecording( title ) {
    var bits = String( title || "" ).split( mdbTitle_bitSplitRe() );

    return /\s+@\s+/.test( bits[1] || "" );
}

// mdbPageCreator_fileNameForTitle
// The file name a page title becomes once it is uploaded. MediaWiki refuses a handful of
// characters in a file name - $wgIllegalFileChars (":", "/", "\\") plus the ones no title may
// carry at all ("#<>[]|{}") - and its uploader replaces every one of them with a "-", so
// "2017-09-21 - Mohr/Sula - Transmittal Tapes 6" is filed as
// "2017-09-21 - Mohr-Sula - Transmittal Tapes 6.jpg".
//
// Both ends of the artwork question need this. The vote below asks whether a page's artwork is
// named after the page, and compared against the raw title that one "/" read as "named after
// something else" - 6 of 7 is not 90%, and Transmittal Tapes lost the artwork line all seven of
// its pages carry (reported 2026-08-27). The [[File:]] line a new page is given has the same
// problem from the other side: written with the raw title it would point at a name the uploader
// can never create.
function mdbPageCreator_fileNameForTitle( title ) {
    return String( title || "" )
               .replace( /_/g, " " )
               .replace( /[:\/\\#<>\[\]|{}]/g, "-" )
               .trim();
}

// mdbPageCreator_recentImageVote
// The lead artwork vote over one category's siblings: { vote, ext, skipped }, where vote is
// mdbPageCreator_imageVerdict's verdict and skipped counts the pages left out of it.
//
// A live recording filed in a SERIES category is a page of another kind. The artwork belongs
// to whatever the page records - the podcast for an episode, the event for a set played there
// - so such a page opens with the event's flyer, named after the event and shared with every
// other set of that night. It cannot say what an episode page starts with, and it must not
// out-vote the pages that can: Groove Podcast's 10 newest pages hold two of them
// ("2026-05-02 - Chris Liebing @ Watergate Open Air, SAGE, Berlin (Groove Podcast 510,
// 2026-07-15)"), 8 of 10 is not 90%, and the series lost the artwork line every one of its
// episodes carries (reported 2026-08-19). page_text_learning.md called these the exception the
// convention is stated against - this is where they stop voting on it.
//
// Where the WHOLE sample is live recordings the category is a venue or an event and those
// pages ARE its pages, so the vote runs over all of them again: "named after something else"
// is the answer they legitimately give, and a new page there can predict that name no better.
function mdbPageCreator_recentImageVote( reads ) {
    var votes = [],
        exts = [],
        skipped = 0,
        png = 0,
        i;

    for( i = 0; i < reads.length; i++ ) {
        if( reads[i].live ) {
            skipped++;
            continue;
        }

        votes.push( reads[i].vote );

        if( reads[i].ext ) exts.push( reads[i].ext );
    }

    // fewer than three pages decide nothing anyway (mdbPageCreator_recentConsensus), so a
    // sample that is all live recordings is read whole rather than not at all
    if( votes.length < 3 && skipped ) {
        votes = [];
        exts = [];
        skipped = 0;

        for( i = 0; i < reads.length; i++ ) {
            votes.push( reads[i].vote );

            if( reads[i].ext ) exts.push( reads[i].ext );
        }
    }

    for( i = 0; i < exts.length; i++ ) {
        if( exts[i] === "png" ) png++;
    }

    return {
        vote: mdbPageCreator_imageVerdict( votes ),
        // the majority extension among the lead artworks; a tie stays .jpg, the wiki's
        // uploader rewrites a wrong one anyway (page_text_learning.md)
        ext: png * 2 > exts.length ? "png" : "jpg",
        skipped: skipped
    };
}

// mdbPageCreator_imageVerdict
// The artwork consensus, with one fallback the other learned signals do not get: where the
// sample splits between "same" and "other" but NOT ONE page is without an artwork, "same" wins
// on a plain majority instead of abstaining (marked weak for the reasoning panel).
//
// Abstaining is the wrong answer to that split. It writes the first page of the series that has
// no artwork line at all, while every sibling has one - a mistake nothing on the page hints at
// later. The other direction is cheap: a name the editor has to correct is a red link sitting
// right where the image belongs, and MixesDB's inline uploader rewrites that line anyway.
//
// It stays narrow on purpose. A single "none" vote kills it - a series that sometimes goes
// without an artwork is exactly the case the 90% bar is there for. And "same" has to be the
// most common answer: a venue's or an event's pages name their artwork after the event, "other"
// leads there, and no new page can predict that name.
function mdbPageCreator_imageVerdict( votes ) {
    var vote = mdbPageCreator_recentConsensus( votes ),
        same = 0,
        other = 0,
        i;

    if( vote ) return vote;

    // mdbPageCreator_recentConsensus' own floor - below it nothing is a convention
    if( votes.length < 3 ) return null;

    for( i = 0; i < votes.length; i++ ) {
        if( votes[i] === "same" ) same++;
        else if( votes[i] === "other" ) other++;
        else return null; // a page without an artwork - the 90% bar keeps its say
    }

    if( same <= other ) return null;

    return { value: "same", count: same, n: votes.length, recentOnly: false, weak: true };
}

// mdbPageCreator_playerRead
// The FIRST {{Player}} of a page's wikitext, as { vote, hosts }:
// - "mirrors" - the two-platform shape, the only one a new page can be given
// - "plain"   - one URL, no mode: what every created page writes today
// - "other"   - a mode we do not copy. mode=multi is the parts-of-one-show player
//               (Category:Beats In Space), whose lines need a t1=/t2= title each - nothing a
//               page with one URL can be started as
// - "none"    - no player on the page at all
// hosts is the host per URL line, in the order the template lists them.
//
// Numbered parameters ("|2=https://...") land in their own slot: RA Podcast writes every one
// of its links that way. Named parameters that are not a slot are skipped - video=audio, t1=,
// h= say how the players are SHOWN, not which ones they are. Unnumbered lines are counted the
// way MediaWiki counts them, later definitions overwriting earlier ones of the same number.
function mdbPageCreator_playerRead( text ) {
    var m = /\{\{\s*Player\b([^{}]*)\}\}/i.exec( String( text || "" ) ),
        slots = {},
        hosts = [],
        mode = "",
        pos = 0,
        parts, chunk, named, keys, i;

    if( !m ) return { vote: "none", hosts: [] };

    parts = m[1].split( "|" );

    // parts[0] is whatever stands between "Player" and the first "|" - never a parameter
    for( i = 1; i < parts.length; i++ ) {
        chunk = $.trim( parts[i] );
        named = /^([A-Za-z0-9_]+)\s*=\s*([\s\S]*)$/.exec( chunk );

        if( named && /^\d+$/.test( named[1] ) ) {
            slots[ named[1] ] = $.trim( named[2] );
        } else if( named ) {
            if( named[1].toLowerCase() === "mode" ) mode = named[2].toLowerCase();
        } else if( chunk ) {
            pos++;
            slots[ pos ] = chunk;
        }
    }

    keys = [];

    for( i in slots ) {
        if( Object.prototype.hasOwnProperty.call( slots, i ) && /^https?:\/\//i.test( slots[i] ) ) keys.push( parseInt( i, 10 ) );
    }

    keys.sort( function( a, b ) { return a - b; } );

    for( i = 0; i < keys.length; i++ ) hosts.push( mdbPageCreator_urlHost( slots[ keys[i] ] ) );

    return {
        vote: mode === "mirrors" ? "mirrors" : ( mode ? "other" : ( hosts.length ? "plain" : "none" ) ),
        hosts: hosts
    };
}

// mdbPageCreator_recentPlayerSlots
// The shape of this series' mirrors player: { count, hosts }, read off the mirror pages alone.
// The 90% vote has already decided that this IS a mirrors series - what is left is how many
// lines such a player has (the majority, and never fewer than two: a mirrors player with one
// URL is the broken state, not a shape) and which platform stands on each of them.
//
// A host is carried only where EVERY page of that shape has it in that slot. It is the one
// finding here that MOVES this player's URL off line 1 (mdbPageCreator_playerSlot), so a
// series that is not of one mind about its order leaves the URL where it always went.
function mdbPageCreator_recentPlayerSlots( reads ) {
    var counts = {},
        best = 0,
        hosts = [],
        host, i, j, n;

    for( i = 0; i < reads.length; i++ ) {
        n = reads[i].hosts.length;
        counts[n] = ( counts[n] || 0 ) + 1;

        if( !best || counts[n] > counts[best] ) best = n;
    }

    if( best < 2 ) best = 2;

    for( j = 0; j < best; j++ ) {
        host = null;

        for( i = 0; i < reads.length; i++ ) {
            // a page with a different number of lines says nothing about THIS slot
            if( reads[i].hosts.length !== best ) continue;

            if( host === null ) host = reads[i].hosts[j];
            else if( host !== reads[i].hosts[j] ) host = "";
        }

        hosts.push( host || "" );
    }

    return { count: best, hosts: hosts };
}

// mdbPageCreator_recentPageTextFindings
// What the fetched pages' WIKITEXT agrees on - computed once at fetch time, since unlike the
// title findings nothing here depends on the current title. One signal per bullet below, each
// a consensus or an abstain (page_text_learning.md says why their thresholds are one and the
// same 90% now):
// - image:  does the page open with an artwork named after the page itself? ("same" vs
//           "other"/"none" - a venue's artwork is named after the venue, which no new page
//           can predict). imageExt is the extension those artworks actually use, and the
//           vote itself is mdbPageCreator_recentImageVote, which is where the live
//           recordings among the siblings are left out of it.
// - body:   {{StandardShow*}} vs the dur/MB/kbps table ("none" can win the vote, but wins
//           nothing - mdbPageCreator_recentBodyChoice only acts on a template)
// - notes:  does the page carry a "== Notes ==" section, and which HOST do those sections
//           link? Two votes: the section is written empty where the first one carries, and
//           the host is what mdbPageCreator_recentNotesUrl looks for in the player's own
//           texts (mdbPageCreator_notesSources)
// - player: {{Player|mode=mirrors}} vs the plain one-URL player (mdbPageCreator_playerRead).
//           Only "mirrors" writes anything; how many lines such a player has and which
//           platform stands on each is mdbPageCreator_recentPlayerSlots, off the mirror pages
// - styles: every category that is not the year, the entity, an artist of that page's title,
//           Promo Mix or a "Tracklist:" filing - per name a yes/no vote across the pages,
//           learned at the same 90%. What is a STYLE among the winners is not decided here:
//           MixesDB is asked (mdbPageCreator_styleCatFetch), and only a name it files under
//           Category:Style reaches the page's style lines
function mdbPageCreator_recentPageTextFindings( catTitle, pages ) {
    var n = pages.length,
        imageReads = [],
        bodyVotes = [],
        notesVotes = [],
        notesHostVotes = [],
        notesUrls = [],
        playerVotes = [],
        playerMirrorReads = [],
        styleVotes = {},
        styleNames = {},
        styleTally = {},
        catKey = mdbTitle_normalizeCompare( catTitle ),
        i, j, text, m;

    for( i = 0; i < n; i++ ) {
        text = pages[i].text;

        // the FIRST image is the lead artwork - the 180px tracklist screenshots further down
        // are the editor's later additions. Read per page as { vote, ext, live }; what the
        // sample as a whole makes of it is mdbPageCreator_recentImageVote's job.
        m = /\[\[\s*(?:File|Image)\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/i.exec( text );

        var live = mdbPageCreator_titleIsLiveRecording( pages[i].title );

        if( !m ) {
            imageReads.push( { vote: "none", ext: "", live: live } );
        } else {
            var fname = m[1].replace( /_/g, " " ).trim(),
                extMatch = /\.([A-Za-z0-9]+)$/.exec( fname ),
                stem = extMatch ? fname.slice( 0, fname.length - extMatch[0].length ) : fname;

            if( stem.toLowerCase() === mdbPageCreator_fileNameForTitle( pages[i].title ).toLowerCase() ) {
                imageReads.push( { vote: "same", ext: extMatch && extMatch[1].toLowerCase() === "png" ? "png" : "jpg", live: live } );
            } else {
                imageReads.push( { vote: "other", ext: "", live: live } );
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

        // The Notes section, voted on twice: that it EXISTS, and which host it links. The two
        // are separate questions - Essential Mix pages carry a Notes section holding nothing
        // but "Episode #1671", so the section is the convention there and no host is.
        var notesBody = mdbPageCreator_notesBody( text ),
            notesUrl = notesBody ? /https?:\/\/[^\s\]|<>}]+/i.exec( notesBody ) : null,
            notesHost = notesUrl ? mdbPageCreator_urlHost( notesUrl[0] ) : "";

        notesVotes.push( notesBody === null ? "none" : "notes" );
        notesHostVotes.push( notesHost || "none" );
        notesUrls.push( notesUrl ? notesUrl[0] : "" );

        // the player's shape. Live recordings vote here like every other page: a set the
        // series broadcast is published on the same platforms as its episodes (Groove
        // Podcast's two @-titled pages carry the same SoundCloud + Mixcloud pair as the other
        // eight), so unlike the artwork this is not a question they answer differently.
        var player = mdbPageCreator_playerRead( text );

        playerVotes.push( player.vote );

        if( player.vote === "mirrors" ) playerMirrorReads.push( player );

        // the page's own title says which categories describe the PAGE rather than the music
        var own = mdbTitle_titleCategories( pages[i].title ),
            skip = {},
            catRe = /\[\[\s*Category\s*:\s*([^\]|]+)/g,
            seenHere = {},
            cm, name, key;

        // every name the sibling's own title files it under, not only the picked one: the
        // event a venue's page names next to the venue is that page's second entity category,
        // and counted as a style the venue's regular party would win the vote
        var ownEntities = ( own.entities && own.entities.length ) ? own.entities : [ own.entity ];

        skip[ catKey ] = true;
        skip[ mdbTitle_normalizeCompare( "Promo Mix" ) ] = true;

        for( j = 0; j < ownEntities.length; j++ ) {
            skip[ mdbTitle_normalizeCompare( ownEntities[j] ) ] = true;
        }

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

    var image = mdbPageCreator_recentImageVote( imageReads ),
        body = mdbPageCreator_recentConsensus( bodyVotes ),
        player = mdbPageCreator_recentConsensus( playerVotes ),
        playerShape = mdbPageCreator_recentPlayerSlots( playerMirrorReads ),
        notes = mdbPageCreator_recentConsensus( notesVotes ),
        notesHost = mdbPageCreator_recentConsensus( notesHostVotes ),
        // One real link off the winning host, for the reasoning panel to show what the
        // description is searched for. A link long enough to pass mdbPageCreator_notesUrlMinPath
        // is preferred over the newest one: RA Podcast's newest page links the bare
        // "https://ra.co/podcast/", and an example of the thing we would NOT accept teaches
        // the reader the wrong shape. The plain newest stands in where there is no such link.
        notesSample = "",
        learned = [],
        tally = [],
        key;

    if( notesHost && notesHost.value !== "none" ) {
        for( i = 0; i < n; i++ ) {
            if( !notesUrls[i] || mdbPageCreator_urlHost( notesUrls[i] ) !== notesHost.value ) continue;

            var samplePath = notesUrls[i].replace( /^https?:\/\/(?:www\.)?[^\/?#]+/i, "" );

            if( !notesSample ) notesSample = notesUrls[i];

            if( samplePath.length >= mdbPageCreator_notesUrlMinPath ) {
                notesSample = notesUrls[i];
                break;
            }
        }
    }

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
        image: image.vote,
        imageExt: image.ext,
        imageSkipped: image.skipped,
        body: body,
        notes: notes,
        notesHost: notesHost,
        notesSample: notesSample,
        player: player,
        playerSlots: playerShape.count,
        playerHosts: playerShape.hosts,
        // four rather than the two style lines the page has: the split into styles and hints
        // happens after this (mdbPageCreator_recentLearnedCategories), and a venue whose pages
        // share two event categories would otherwise cut the style standing behind them
        styles: { learned: learned.slice( 0, 4 ), tally: tally }
    };
}


/*
 * The MixesDB modal moved to its own shared feature - shared/mixesdb_modal/funcs.js
 * (mdbModal_open and friends, CSS loaded by that file) - because the toolkit's usage links
 * open it now too, on sites that load no page creator at all. What stays here is the page
 * creator's OWN use of it:
 *
 * - the delegated click that turns a plain left click on a "Used categories" / "Similar:"
 *   link into a modal open on a desktop-wide window
 * - the walk provider that hands the modal the bar's links in the order the line reads -
 *   the arrow keys walk exactly what is on screen (mdbPageCreator_hintLinkOnScreen)
 *
 * Everything about the overlay itself - the frames it keeps, the arrow keys, Esc, which
 * document it mounts in - lives over there. Every touch of the modal file is typeof-guarded:
 * the row has to degrade to plain links where a script does not @require the modal file.
 */

// mdbPageCreator_hintLinkOnScreen
// Is this bar link one the reader can see? Every link IS in the DOM - a chip's recent mix
// pages are built with the chip and only folded away by the open class - so the question is
// answered by STRUCTURE, not by :visible: the bar's first render happens while the row is
// still detached, where nothing computes as visible at all. Everything the modal does - the
// walk, the counter, the neighbours it loads ahead - comes through the provider below, so
// all of it agrees on the same set.
function mdbPageCreator_hintLinkOnScreen( link ) {
    var inRecent = $(link).closest( ".mdb-pageCreator-usedCat-recent" );

    return !inRecent.length || inRecent.closest( ".mdb-pageCreator-usedCat" ).hasClass( "mdb-pageCreator-usedCat-open" );
}

// The page creator's contribution to the modal's arrow-key walk: both category rows, in one
// combined selector because that returns document order, which is the order the bar reads
// (the chips left to right, and inside a chip its own name before the mix pages folded out
// under it) - the "Similar:" chips serve the same five-second look as the used categories.
// Pushed into the plain-array global rather than through a register function so the @require
// order of this file and the modal file cannot matter.
window.mdbModal_linkProviders = window.mdbModal_linkProviders || [];
window.mdbModal_linkProviders.push( function() {
    return $("#mdb-pageCreator-usedCats a[href], #mdb-pageCreator-similarCats a[href]").filter( function() {
        return mdbPageCreator_hintLinkOnScreen( this );
    }).get();
});

// Bound once, on the document, so it survives every rebuild of the bar; the width is tested
// INSIDE the handler because the window resizes. Only links WITH an href: the "N mixes"
// toggle is an <a> without one.
$(document).on( "click", "#mdb-pageCreator-usedCats a[href], #mdb-pageCreator-similarCats a[href]", function( e ) {
    if( typeof mdbModal_open !== "function" ) return;
    if( e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.which !== 1 ) return;
    if( $(window).width() < mdbModal_minWidth ) return;

    e.preventDefault();
    mdbModal_open( this.href );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The report box
 *
 * "Report" behind the score opens a textarea under the row, holding the case as it is written
 * when a wrong title is reported - as Markdown, in five headed blocks:
 *
 *   ## Created                  the values the site handed over and what the suggestion made of
 *                               them - URL, title, channel, date, title, score, categories
 *   ## Lookups                  what MixesDB was asked and what came back, split into the
 *                               "Artists:" and "Entities:" the panel's section 3 shows
 *   ## Similar lookups          the looser round behind the names that answered empty up there -
 *                               the panel's section 8 as text, every answer under the name it
 *                               was found for, with the "Similar:" row's verdict
 *   ## Mistakes / learnings     two empty bullets: what went wrong, in the reporter's own
 *                               words - a case usually has two reasons, not one
 *   ## Expected                 the title, the alternative title and the categories it SHOULD
 *                               have produced
 *
 * Markdown because of where it goes: pasted on Discord the headings render, and the maintainer's
 * case files quote one block at a time.
 *
 * It exists because the report, not the fix, was the slow part: the player title is on screen,
 * but the channel name is the site API's username and not the name in the URL ("discoanon" ->
 * "Discoholics Anonymous"), and the upload date is nowhere near the player either. Both had to be
 * asked back for, one round trip per report. Everything in the box is already in this file.
 *
 * "Expected" is the point of it - it is the answer only the reporter has - which is why anything
 * typed into the box stops it from ever being refilled.
 *
 * Above the box sits the reasoning panel - its own section further down - which explains how
 * the suggestion was built, so the "Mistakes / learnings" block can name the step that went wrong.
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
// scrollbar in it is pure friction - and grows as the "Mistakes / learnings" and "Expected" lines
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
// The report as Markdown, in four headed blocks - "Created", "Lookups", "Mistakes / learnings",
// "Expected" - because that is how it is read once it is pasted: Discord renders the headings,
// and the maintainer's case files quote the blocks one at a time.
//
// The categories are read off the TITLE, not off what the parser had in mind - the same way the
// created page reads them - so a title corrected in the field reports the categories it would
// really be filed under.
//
// Every line that is left for the reporter to fill in keeps ONE blank behind its colon: it is
// where the cursor goes, and a line ending in ":" makes the writer type the space first.
function mdbPageCreator_reportText( title ) {
    var read = mdbTitle_titleCategories( title ),
        // one line per artist, since every joiner between two names is another category ("See
        // Bastian b2b Afin" is two). A title with none still gets the empty line, so the shape
        // of the report never changes.
        artists = read.artists.length ? read.artists : [ "" ],
        label = mdbPageCreator_sourceLabel || window.scriptName || "Player",
        lines = [],
        i;

    lines.push( "## Created" );
    lines.push( "" );

    // First line of the block, because it is the one thing that lets a report be looked at again
    // - and the player URL rather than location.href: the site hands over the clean page URL
    // there, while location.href carries tracking parameters and, inside a framed layout, is not
    // even this track's URL.
    lines.push( "* " + label + " URL: " + mdbPageCreator_playerUrl );
    lines.push( "* " + label + " title: " + mdbPageCreator_sourceTitle );
    lines.push( "* Channel name: " + mdbPageCreator_sourceChannel );
    lines.push( "* " + label + " date: " + mdbPageCreator_reportDay( mdbPageCreator_sourceDate ) );
    lines.push( "* Created title: " + title );
    lines.push( "* Confidence score: " + mdbPageCreator_confidencePercent + "%" );

    for( i = 0; i < artists.length; i++ ) {
        lines.push( "* Artist category: " + artists[i] );
    }

    // one line per entity category, like the artists above: a live title whose place group
    // names an event at a venue files the page under both where MixesDB has both of them. A
    // title with no entity at all still gets the empty line, so the shape never changes.
    var entityCategories = mdbPageCreator_entityCategoriesFor( title, read );

    if( !entityCategories.length ) lines.push( "* Entity category: " );

    for( i = 0; i < entityCategories.length; i++ ) {
        lines.push( "* Entity category: " + entityCategories[i].name );
    }

    // What the wiki was asked and what it answered - the reasoning panel's section 3 as text.
    // It is in the report because it is the half of a case nobody can reconstruct afterwards:
    // the categories above say what the title was filed under, these lines say what MixesDB
    // knew at the time, and a suggestion is wrong for one of the two reasons ("the wiki had
    // nothing" vs "the wiki had it and the parse picked the other name").
    lines.push( "" );
    lines.push( "## Lookups" );
    lines.push( "" );
    lines.push( "Artists:" );
    lines = lines.concat( mdbPageCreator_reportLookups( "artist" ) );
    lines.push( "" );
    lines.push( "Entities:" );
    lines = lines.concat( mdbPageCreator_reportLookups( "entity" ) );

    // The round that asks about no name: which category page links the channel's URL. In the
    // report because it is the one answer a reporter cannot reconstruct from the title at all -
    // it says whether the wiki knows this channel under a name nobody could have guessed.
    lines.push( "" );
    lines.push( "Channel URL:" );
    lines = lines.concat( mdbPageCreator_reportChannelCat( title ) );

    // The looser round behind the names the block above came back EMPTY about - the panel's
    // section 8 as text. It answers what "no category of this name" leaves open: the wiki can
    // still hold that name inside a longer one ("103" -> "103 Club"), which is the difference
    // between "MixesDB does not know this" and "MixesDB knows it, spelled otherwise" - and the
    // second one is where an expected title usually comes from. Nothing here changed the
    // suggestion, so it stands as its own block rather than inside "Lookups": those lines are
    // what the title was built on, these are what was merely offered next to it.
    lines.push( "" );
    lines.push( "## Similar lookups" );
    lines.push( "" );
    lines = lines.concat( mdbPageCreator_reportSimilar( title ) );

    // Two empty bullets rather than blank lines: a wrong title is rarely wrong for one reason -
    // the panel above numbers the steps, and a case usually names the one that misread the
    // title AND the rule that should have caught it. The second bullet standing there is what
    // gets it written; an empty block asked for one paragraph and got one sentence.
    lines.push( "" );
    lines.push( "## Mistakes / learnings" );
    lines.push( "" );
    lines.push( "* " );
    lines.push( "* " );

    lines.push( "" );
    lines.push( "## Expected" );
    lines.push( "" );
    lines.push( "* Expected title: " );
    // A SECOND title that would also be right - the reading the suggestion should have offered
    // as a "Switch title" chip, or the one only the reporter can know ("Elsewhere Loft" is the
    // rooftop of that club). Empty on most reports, and empty is fine: it says there is one
    // right answer. Kept next to "Expected title" because the two are read together - the
    // expected one is what the build has to produce, this one is what it may also offer.
    lines.push( "* Expected alternative title: " );
    lines.push( "* Expected artist category: " );
    lines.push( "* Expected entity category: " );

    return lines.join( "\n" );
}

// mdbPageCreator_reportLookups
// The "Artists:" / "Entities:" block: every name the wiki was asked about in that role, with
// what came back. Filed into the two roles by mdbPageCreator_lookupRoleColumns(), which is what
// the reasoning panel's section 3 sorts its two columns by - a report that grouped them
// differently would not match the panel the reporter is looking at while writing it.
function mdbPageCreator_reportLookups( role ) {
    var log = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        cache = ( typeof mdbTitle_categoryCache !== "undefined" && mdbTitle_categoryCache ) ? mdbTitle_categoryCache : {},
        // typeof-guarded like everything else read out of title_builder.js: a stale cached copy
        // must cost the report a line, not the box
        trace = ( typeof mdbTitle_trace !== "undefined" ) ? mdbTitle_trace : null,
        lines = [],
        i;

    for( i = 0; i < log.length; i++ ) {
        var entry = log[i],
            cached = Object.prototype.hasOwnProperty.call( cache, entry.key ) ? cache[entry.key] : "",
            matches = ( cached && cached.matches ) ? cached.matches : [];

        if( !mdbPageCreator_lookupRoleColumns( entry, matches )[ role ] ) continue;

        // the asked name in quotes: it can carry the comma, the arrow and the "%" the answer
        // behind it is built from, and only the quotes say where the name ends
        lines.push( "* \"" + entry.name + "\" -> " + mdbPageCreator_reportAnswer(
            entry, matches, mdbPageCreator_lookupOverruledBy( trace, entry.key ) ) );
    }

    // in the panel's own words, so the two say the same thing about an empty role
    if( !lines.length ) lines.push( "* no candidates of this role in this title" );

    return lines;
}

// mdbPageCreator_reportAnswer
// Everything the wiki said about ONE asked name, on the one line the report gives it: each answer
// as "type, N mixes, NN%", several joined with " | ". The wiki's own spelling goes in front where
// it differs from the name asked ("aka aka" -> "AKA AKA") and is left out where it does not - it
// would only repeat the name the line already opens with.
//
// A name with no answer prints the request's status in the same words the panel's section 3 uses,
// so the two can be read next to each other.
function mdbPageCreator_reportAnswer( entry, matches, overruledBy ) {
    var parts = [],
        m;

    for( m = 0; m < matches.length; m++ ) {
        var match = matches[m],
            bits = [];

        // Compared lower-cased rather than normalized: a name the wiki merely CASES differently
        // ("aka aka" -> "AKA AKA") would only repeat the line's own opening, but one it SPACES
        // differently ("EG AFTER" -> "EGAFTER") is the answer of the spelling-variant round
        // (mdbTitle_lookupVariants) - and that spelling is the whole reason the answer exists.
        if( match.title && match.title.toLowerCase() !== String( entry.name || "" ).toLowerCase() ) bits.push( match.title );

        bits.push( String( match.type || "?" ) );

        if( typeof match.mixes === "number" ) {
            bits.push( match.mixes + ( match.mixes === 1 ? " mix" : " mixes" ) );
        }

        // the same score the panel badges the answer with - the whole answer list is passed,
        // since a score depends on how many OTHER things the wiki knows the name as
        if( typeof mdbTitle_matchConfidence === "function" ) {
            bits.push( mdbTitle_matchConfidence( entry.name, matches, m, !!overruledBy ).percent + "%" );
        }

        parts.push( bits.join( ", " ) );
    }

    if( !parts.length ) {
        parts.push( entry.pending ? "looking it up …"
                  : entry.skipped ? "not asked - over the 10-name request limit"
                  : entry.failed  ? "lookup failed"
                  : "no category of this name" );

        // ... and in the same breath the other spellings that were asked after the "no"
        // (mdbTitle_lookupVariants), so a report never suggests trying what has been tried
        if( !entry.pending && !entry.skipped && entry.variants && entry.variants.length ) {
            parts.push( "also asked as \"" + entry.variants.join( "\" / \"" ) + "\"" );
        }
    }

    // A curated channel mapping outranks whatever the wiki knows under the bare words. Without
    // this, an answer like "show, 369 mixes, 95%" reads like the row the title should have used.
    if( overruledBy ) {
        parts.push( "overruled - on this channel these words name \"" + overruledBy + "\" (curated channel rule)" );
    }

    return parts.join( " | " );
}

// mdbPageCreator_reportChannelCat
// The channel-URL round as report lines - the panel's block in section 3 in text, so a
// reporter pasting the report hands over the same answer they are looking at.
function mdbPageCreator_reportChannelCat( title ) {
    var needle = mdbPageCreator_channelUrlNeedle(),
        entry = needle ? mdbPageCreator_channelCatCache[needle] : null;

    if( !needle ) return [ "* (this site hands no channel URL over)" ];
    if( !entry ) return [ "* " + needle + " -> " + ( mdbPageCreator_channelCatSkip || "not asked" ) ];
    if( entry.status === "pending" ) return [ "* " + needle + " -> still asking" ];
    if( entry.status === "failed" ) return [ "* " + needle + " -> the request failed" ];
    if( !entry.cats.length ) return [ "* " + needle + " -> no MixesDB category page links it" ];

    var found = mdbPageCreator_channelCatFinding( entry, title ),
        lines = [],
        i;

    for( i = 0; i < entry.cats.length; i++ ) {
        lines.push( "* " + needle + " is linked from Category:" + entry.cats[i].title );
    }

    if( !found ) lines.push( "* not used: MixesDB files no type under that name" );
    else if( !found.show ) lines.push( "* not used as a show: \"" + found.cat.title + "\" is an artist category" );
    else if( !found.support.length ) lines.push( "* not used: nothing in this title backs \"" + found.cat.title + "\"" );
    else if( found.ambiguous ) lines.push( "* not used: this title backs several of them equally" );
    else lines.push( "* used: the channel's uploads are filed under \"" + found.cat.title + "\" - backed by " + found.support.join( ", and " ) );

    return lines;
}

// mdbPageCreator_reportSimilar
// The "Similar lookups" block: the prefix round behind every name the exact lookup denied,
// written as the panel's section 8 shows it - the asked name, and under it one line per answer
// with the verdict the bar's "Similar:" row gave it.
//
// Read off mdbPageCreator_prefixDecisions(), the same walk the row and section 8 render from,
// so a report can never claim a chip was shown that the reporter did not see. Two levels
// because the answers belong TO the asked name: a flat list would lose which name "103 Club"
// was found for, and that pairing is the whole point of the block. The name's own line carries
// the COUNT of them ("-> 1 result:"), so the two kinds of first-level line - the ones with
// answers under them and the ones whose answer is the line itself - read as two kinds.
//
// The asked name is quoted like the "Lookups" block's - a name can carry the comma and the
// arrow its line is built from - while the category the wiki answered with is not: it opens
// its line, where nothing can be read into it.
//
// A name that was never ASKED is no line here at all (2026-08-23), unlike in the panel: a
// report is what MixesDB was asked the looser way and what came back, and a "not asked" bullet
// gives the reader a name to wonder about and no answer to weigh. Both kinds go - the ones the
// round refuses (a bare edition number) and the ones that fell off the 10-name limit. The
// reasoning panel is where the reason belongs, and it still prints it.
function mdbPageCreator_reportSimilar( title ) {
    var decisions = mdbPageCreator_prefixDecisions( title ),
        lines = [],
        i, j, rec, d, match, bits;

    // in the panel's own words, so the two say the same thing about a title with nothing denied
    if( !decisions.length ) return [ "* no denied names - nothing to look for similar categories to" ];

    for( i = 0; i < decisions.length; i++ ) {
        rec = decisions[i];

        // never asked, so nothing to report about it - see the block comment above
        if( rec.status === "skipped" || rec.status === "unasked" ) continue;

        // No answer at all: the request's status stands behind the arrow, in section 8's
        // wording. "no category starts like this name either" is the one that matters - it
        // says the wiki has nothing under the name in any spelling, which is what makes a
        // report about it a rule case rather than a lookup case.
        if( !rec.decisions.length ) {
            lines.push( "* \"" + rec.name + "\" -> " + (
                  rec.status === "pending" ? "looking for similar names …"
                : rec.status === "failed"  ? "the request failed - not retried, the row is only a hint"
                : "no category starts like this name either" ) );
            continue;
        }

        // How many answers came back, the arrow's whole content: the lines under it are those
        // answers, and an arrow with nothing behind it read like a name that got none - the one
        // thing the block right below it says about a name that really got none. The count is
        // every answer, shown and dropped alike, which is exactly what is listed underneath.
        lines.push( "* \"" + rec.name + "\" -> " + rec.decisions.length +
                    ( rec.decisions.length === 1 ? " result:" : " results:" ) );

        for( j = 0; j < rec.decisions.length; j++ ) {
            d = rec.decisions[j];
            match = rec.matches[ d.index ];
            bits = [ String( match.title || "?" ), String( match.type || "?" ) ];

            bits.push( d.mixes + ( d.mixes === 1 ? " mix" : " mixes" ) );

            // section 3's score, as the panel badges it here too - a prefix answer is charged
            // for the asked name being only the START of the category's, which is why these
            // percentages read low next to the "Lookups" block's
            if( typeof mdbTitle_matchConfidence === "function" ) {
                bits.push( mdbTitle_matchConfidence( rec.name, rec.matches, d.index, false ).percent + "%" );
            }

            // and what the row did with it, in the walk's own sentence: a dropped answer says
            // which threshold dropped it, which is half of what a report about a missing hint
            // is about
            bits.push( d.shown ? "shown on the \"Similar:\" row" : "not shown - " + d.why );

            lines.push( "** " + bits.join( ", " ) );
        }
    }

    // every denied name of this page was one the round does not ask - the block still says a
    // word, or the heading would stand over nothing and read like a bug
    if( !lines.length ) return [ "* no name of this page was asked the looser way" ];

    return lines;
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
 * the order the build really ran - 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8.
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
 *   (8) the SIMILAR categories: the prefix round behind the bar's "Similar:" row, every
 *       answer with its score and the row's verdict - shown, or dropped and why
 *
 * 2, 4 and 5 are the title-shaping stages - 2 and 4 ONE stage run twice on either side of the
 * lookup, 5 the format read off the wiki's own pages - said by their shared
 * accent, the copy button's orange, against the grey of the raw-material sections 1/3, the
 * green of 6, the citrus of 7 (the same recent pages, about the PAGE rather than the
 * title) and the "Similar:" chips' own yellow of 8. The chips are coloured the same way, by
 * STATE and not by type: grey while
 * a name or title is only a candidate, red for what was ignored, green for what ends up used.
 *
 * The sources are title_builder.js's plain-data globals (mdbTitle_trace, mdbTitle_lookupLog,
 * mdbTitle_categoryCache, mdbTitle_candidateSources) plus mdbPageCreator_tracePreLookup - the
 * first pass's trace, which only this file can keep, since the parser cannot tell its own
 * passes apart - plus the title as it stands in the field. Sections 1-4 describe the PLAYER
 * title and only change when the suggestion is rebuilt; 5, 6, 7 and 8 follow every edit of the
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
            // (mdbTitle_categoryCandidates). Every name the slot offers is asked, not only the
            // picked one: an edited title that writes the venue behind the event is where the
            // second entity category comes from (mdbPageCreator_entityLookupNames).
            entityNames = mdbPageCreator_entityLookupNames( title, read );

        names = names.concat( entityNames );

        // an edited title says the roles outright - its artists are artist candidates, its
        // entity the entity one - so section 3 files the fresh chips into the right column.
        // typeof-guarded: a stale cached title_builder.js knows no roles.
        if( typeof mdbTitle_noteCandidateRole === "function" ) {
            for( var n = 0; n < read.artists.length; n++ ) {
                mdbTitle_noteCandidateRole( read.artists[n], "artist" );
            }
            for( var e = 0; e < entityNames.length; e++ ) {
                mdbTitle_noteCandidateRole( entityNames[e], "entity" );
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

            // ... and its red names their prefix round, for the "Similar:" row - a name
            // already asked costs nothing (mdbPageCreator_prefixEnsure)
            mdbPageCreator_prefixEnsure( $.trim( $("#mdb-pageCreator-title").val() ) );

            // looked up again rather than closed over: seconds have passed, and on these
            // sites the row of the moment is the one to draw into
            var row = $("#mdb-pageCreator");

            mdbPageCreator_renderHints( row );
            // the report quotes these answers in its "Lookups" block, so it follows them too
            // - a no-op on a closed box and on one the reporter has written in
            mdbPageCreator_fillReport( row );
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
// chipClass is appended to every chip of the row and may name more than one class: a chip that
// carries a whole TITLE (sections 2, 4, 5) gets .mdb-pageCreator-chip-title for the title
// field's corner radius on top of whatever colour class the section asks for.
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

            // ... and the other spellings asked after that "no" (mdbTitle_lookupVariants):
            // without this the panel shows one question where two were asked
            if( entry.variants && entry.variants.length ) {
                result.append( mdbPageCreator_reasoningNote(
                    "also asked as \"" + entry.variants.join( "\" / \"" ) + "\"", "muted" ) );
            }
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
// shows, which needs no explaining. The ones that do: the channel (asked though it stands
// nowhere in the title), a channel that names several, a curated show name, a chunk the
// candidate reduced (the trailing episode number comes off, since a series category never
// carries one) and the same chunk asked WITH its number next to it (an artist name may end in
// digits), one of the names a long chunk strings together with a little word
// ("Timboletti im Chapeau Club"), a place behind the "@" without the word naming a room inside
// it ("Elsewhere Loft" -> "Elsewhere"), and a name the first parse read out of its chunk (the chunk
// itself carries more than the name, so the chunk side could never ask it). A name typed into
// the title field afterwards says so too, so it is not read as something the player title
// contained.
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
        case "channel URL":
            text = "found by URL, not by name: this category's page links the channel this mix was uploaded on";
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
                text = "from the chunk \"" + source.chunk + "\" - a series category carries no episode number";
            }
            break;
        case "number kept":
            text = "the chunk as it stands, asked next to the same name without its trailing number - " +
                   "not every \"<name> <number>\" counts episodes, an artist name can end in digits " +
                   "(\"Route 8\", \"Asa 808\"), and only MixesDB can tell the two apart";
            break;
        case "place base":
            text = "the place \"" + source.chunk + "\" without the word naming a room inside it - " +
                   "MixesDB files a set played in the loft of a club under the club";
            break;
        case "line-up base":
            text = "the act \"" + source.chunk + "\" without the fraction in front of it - " +
                   "the fraction says how much of the act was on stage, and MixesDB files the page under the act";
            break;
        case "credit base":
            text = "the act \"" + source.chunk + "\" names in front of its \"for\" - the words behind it " +
                   "say who the mix was made FOR, which is no part of the act's name";
            break;
        case "name head":
            text = "\"" + source.chunk + "\" shortened by a word from the right - a name of several words " +
                   "MixesDB has never heard of usually carries one it knows at its front, and this is the " +
                   "last thing the request asks";
            break;
        case "chunk part":
            text = "one of the names the chunk \"" + source.chunk + "\" strings together - the chunk is asked " +
                   "about as a whole too, but a chain of names can only answer empty";
            break;
        case "group member":
            text = "one of the artists the chunk \"" + source.chunk + "\" joins - the group is asked about " +
                   "as a whole too, but MixesDB files each artist on their own";
            break;
    }

    return text ? mdbPageCreator_reasoningNote( text, "muted" ) : null;
}

// mdbPageCreator_lookupRoleColumns
// Which of the two candidate roles an asked name belongs to - { artist: bool, entity: bool }.
// The reasoning panel's section 3 files its two columns by it and the report box's "Lookups"
// block its two lists, so the two always group the same names the same way.
//
// The ROLE the title's shape gave the name before the lookup fired decides
// (mdbTitle_candidateRoles); a name without one - the extra lookups an edited title fires -
// belongs to both. An ANSWER of the other type pulls the name into that role as well: the wiki
// also knowing "MONUMENT" as an artist is worth seeing where the parse reads it as the series.
function mdbPageCreator_lookupRoleColumns( entry, matches ) {
    // typeof-guarded like the trace - a stale cached title_builder.js without roles files every
    // name under both
    var roles = ( typeof mdbTitle_candidateRoles !== "undefined" && mdbTitle_candidateRoles ) ? mdbTitle_candidateRoles : {},
        // The recorded role is a STRING - "artist" | "entity". Reading .artist off the string was
        // the bug that dropped every answerless candidate from the panel: a string has neither
        // property, so a name the wiki answered empty for ("MNMT Recordings", asked as the
        // entity) landed in no column at all.
        roleName = roles[ entry.key ] || "",
        out = { artist: roleName !== "entity", entity: roleName !== "artist" },
        m;

    for( m = 0; m < ( matches || [] ).length; m++ ) {
        if( String( matches[m].type || "" ) === "artist" ) out.artist = true;
        else out.entity = true;
    }

    return out;
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
        // a second entity was picked by nobody - it is filed because the wiki has that name
        // too, and it brings the sentence saying so (mdbPageCreator_entityCategoriesFor). The
        // pick's sentence is about the OTHER name and would read here as if this one had been
        // decided by the parse.
        why = entry.why ||
              ( ( picks && ( entry.role === "artist" || entry.role === "entity" ) ) ? picks[ entry.role ] : "" ),
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
                .text( ( entry.alsoNamed ? "filed as a second entity: " : "picked as the " + entry.role + ": " ) + why )
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
            // three different answers to "where does this style come from?": the siblings, the
            // site's own suggestion box, or nobody - and the row says which
            if( entry.learned ) {
                note.append( mdbPageCreator_reasoningNote(
                    "learned from the entity's recent pages - " + mdbPageCreator_recentHintNote( entry ) +
                    ", and MixesDB files it under Category:" + mdbPageCreator_styleParent,
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
        case "numbered-place":
            return "the title numbers this entity (\"" + info.entity + "\"), so it is a series - while MixesDB knows \"" +
                   info.catTitle + "\" as a " + String( ( info.match && info.match.type ) || "place" ) +
                   ", which numbers no editions. Two different things of one name, so its pages say nothing about this mix";
        case "stale":
            return "the newest page in Category:" + info.catTitle + " is " + info.stale +
                   " years older than this mix - nothing there is a convention for it, and a category" +
                   " nobody has written in that long may not even be this mix's";
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
function mdbPageCreator_reasoningRecentCount( c, whole ) {
    // "newest" only where pages were left behind: in a category of four, "4 of the 4 newest
    // pages" reads as if six had been skipped (reported 2026-08-20)
    var pages = whole ? " pages" : " newest pages";

    if( c.recentOnly ) return "all " + c.n + " newest pages (the older ones disagree - newer pages win)";

    // a unanimous sample is "all of them", never "N of the N"
    if( c.count === c.n ) return c.n === 1 ? "the only page" : "all " + c.n + pages;

    return c.count + " of the " + c.n + pages;
}

// mdbPageCreator_recentWholeCategory
// Are the fetched pages the WHOLE category? Fewer than the limit asked for, with the API
// offering no continuation, means nothing was left behind - and then the panel says "all 4
// pages" rather than talking about the "newest" ones, which implies a cut that never happened.
function mdbPageCreator_recentWholeCategory( info ) {
    var entry = info && info.entry;

    return !!( entry && entry.pages && entry.pages.length < mdbPageCreator_recentPageLimit && !entry.more );
}

// mdbPageCreator_reasoningRecentRead
// The "Read:" line both sections open with: which pages the findings are read off.
function mdbPageCreator_reasoningRecentRead( info ) {
    var n = info.entry.pages.length,
        read = mdbPageCreator_recentWholeCategory( info )
            ? ( n === 1 ? "the only page of" : "all " + n + " pages of" )
            : "the " + n + " newest pages of";

    var line = $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
        $("<span>").text( "Read:" ),
        $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( read ),
        $("<a>")
            .addClass( "mdb-pageCreator-known" )
            .attr( "href", mdbPageCreator_categoryUrl( info.catTitle ) )
            .attr( "target", "_blank" )
            .attr( "title", "Open [[Category:" + info.catTitle + "]] on MixesDB" )
            // the bare name, like every other category link in the panel - the "Category:"
            // prefix belongs in the wikitext lines section 6 prints, not on a link
            .text( info.catTitle )
    );

    // A category the age gate would have dropped says why it was read anyway - without it a
    // reader who knows the gate sees pages a decade older than the mix being copied from,
    // with nothing on screen saying that was a decision (mdbPageCreator_recentProvenOwn).
    if( info.staleKept ) {
        line.append(
            $("<span>").addClass( "mdb-pageCreator-reasoning-hint" )
                .text( "- newest page " + info.staleKept + " years older than this mix, read all the same: " + info.proven )
        );
    }

    return line;
}

// mdbPageCreator_reasoningChannelCat
// Section 3's last block: what the channel's URL answered - the round that asks about no name
// (mdbPageCreator_channelCatEnsure). One line saying which category page links the channel,
// what MixesDB files it as, and what in THIS title backs it, or the sentence saying why the
// round did not fire. An empty jQuery set on a site that hands no channel URL over at all -
// there the round is not a step that was skipped, it is a step that does not exist.
function mdbPageCreator_reasoningChannelCat( title ) {
    var needle = mdbPageCreator_channelUrlNeedle(),
        entry = needle ? mdbPageCreator_channelCatCache[needle] : null,
        row = $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
            $("<span>").text( "Channel URL:" )
        );

    if( !needle ) return $();

    row.append( $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-channel" ).text( needle ) );

    // asked about nothing: the names had already answered for both slots
    if( !entry ) {
        return row.append( mdbPageCreator_reasoningNote(
            mdbPageCreator_channelCatSkip || "not asked", "muted" ) );
    }

    if( entry.status === "pending" ) {
        return row.append( mdbPageCreator_reasoningNote( "asking which category page links it …", "muted" ) );
    }

    if( entry.status === "failed" ) {
        return row.append( mdbPageCreator_reasoningNote( "the request failed - the parse carried on with what the names said", "warn" ) );
    }

    if( !entry.cats.length ) {
        return row.append( mdbPageCreator_reasoningNote( "no MixesDB category page links it", "muted" ) );
    }

    var found = mdbPageCreator_channelCatFinding( entry, title ),
        list = $("<div>").addClass( "mdb-pageCreator-reasoning-chips" ),
        i;

    // every linking category, the picked one first in the sentence below
    for( i = 0; i < entry.cats.length; i++ ) {
        list.append(
            $("<a>")
                .addClass( "mdb-pageCreator-chip mdb-pageCreator-known" )
                .attr( "href", mdbPageCreator_categoryUrl( entry.cats[i].title ) )
                .attr( "target", "_blank" )
                .attr( "title", "Open [[Category:" + entry.cats[i].title + "]] on MixesDB" )
                .text( entry.cats[i].title )
        );
    }

    row.append( list );

    if( !found ) {
        return row.append( mdbPageCreator_reasoningNote(
            "MixesDB files no type under that name, so nothing was read off it - a category that is neither an artist nor a series says nothing about this upload", "muted" ) );
    }

    var what = found.match.type + ( typeof found.match.mixes === "number" ? ", " + found.match.mixes + " mixes" : "" );

    if( !found.show ) {
        return row.append( mdbPageCreator_reasoningNote(
            "\"" + found.cat.title + "\" (" + what + ") - an artist category, so the channel is a person and no show name was grown from it", "muted" ) );
    }

    if( !found.support.length ) {
        return row.append( mdbPageCreator_reasoningNote(
            "\"" + found.cat.title + "\" (" + what + ") - but nothing in this title backs it, so the suggestion was left alone: a channel can host a series and still upload something else", "muted" ) );
    }

    if( found.ambiguous ) {
        return row.append( mdbPageCreator_reasoningNote(
            "several of them are backed by this title just as well as \"" + found.cat.title + "\" (" + what + ") is - which of the channel's categories THIS upload belongs in, only the title can say, and it does not", "muted" ) );
    }

    return row.append( mdbPageCreator_reasoningNote(
        "the channel's uploads are filed under \"" + found.cat.title + "\" (" + what + ") - backed by " +
        found.support.join( ", and " ), "good" ) );
}

// mdbPageCreator_reasoningApiCalls
// The "API call" rows of a section: one per api.php request whose answer that section is read
// off, each opening the exact URL the script asked (mdbTitle_apiCallLog). Reported numbers are
// the wiki's own, and where one of them is wrong - Category:Amplify Series answers "1 mix"
// next to 29 pages - the raw answer is what a bug report to the maintainer is written from,
// so it should not have to be reassembled by hand from the console.
// _blank like every other look-it-up link in the panel: the reader is judging THIS page and
// comes back to it.
// Nothing is rendered where no call stands for this page - an answer served out of the cache
// of a track opened earlier was not asked for again, and a link claiming otherwise would be
// the one thing this row must not be.
function mdbPageCreator_reasoningApiCalls( kind, subject ) {
    var calls = ( typeof mdbTitle_apiCalls === "function" ) ? mdbTitle_apiCalls( kind, subject ) : [],
        rows = [],
        i, state;

    for( i = 0; i < calls.length; i++ ) {
        state = calls[i].status === "pending" ? " - still waiting for the answer"
              : calls[i].status === "failed"  ? " - the request failed"
              : "";

        rows.push(
            $("<div>").addClass( "mdb-pageCreator-reasoning-aside" ).append(
                $("<a>")
                    .addClass( "mdb-pageCreator-reasoning-apiCall" )
                    .attr( "href", calls[i].url )
                    .attr( "target", "_blank" )
                    .attr( "title", "Open this request's raw answer on mixesdb.com" )
                    .text( "API call" ),
                $("<span>").addClass( "mdb-pageCreator-reasoning-hint" ).text( calls[i].what + state )
            )
        );
    }

    return rows;
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
            whole = mdbPageCreator_recentWholeCategory( info ),
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
                         detail: "\"" + f.written.value + "\" - " + mdbPageCreator_reasoningRecentCount( f.written, whole ) } );
        } else {
            rows.push( { label: "Name as written",
                         detail: "no 90% agreement (the name stands in " + f.matched + " of " + f.n + " titles)" } );
        }

        if( !info.isPlace ) {
            if( f.format && f.format.none ) {
                rows.push( { label: "Episode number",
                             detail: "none - " + mdbPageCreator_reasoningRecentCount( f.format, whole ) + " write the bare name" } );
            } else if( f.format ) {
                rows.push( { label: "Episode format",
                             detail: "\"" + f.format.display + "\" - " + mdbPageCreator_reasoningRecentCount( f.format, whole ) +
                                     ( f.format.pad ? " - N zero-padded to " + f.format.pad + " digits" : "" ) } );
            } else {
                rows.push( { label: "Episode format", detail: "no 90% agreement - the title stays as built" } );
            }
        } else {
            if( f.city ) {
                rows.push( { label: "City behind the place",
                             detail: "\"" + f.city.value + "\" - " + mdbPageCreator_reasoningRecentCount( f.city, whole ) } );
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
            mdbPageCreator_reasoningChips( [ finalTitle ], "mdb-pageCreator-chip-kept mdb-pageCreator-chip-title" )
        );
    }

    // the request the whole section is read off - also in the states above, where it is what
    // says whether the pages are still on their way or were never asked for
    if( info.catTitle ) s.append( mdbPageCreator_reasoningApiCalls( "recent", info.catTitle ) );

    return s;
}

// mdbPageCreator_reasoningNotesLink
// Section 7's second Notes line: what happened when this description was searched for a link on
// the host the siblings' Notes use. Five outcomes, and they are worth telling apart - an empty
// Notes section can mean the description said nothing, that a shortened link leads somewhere
// else, or only that this userscript manager cannot follow one, and the reader has to know
// which before deciding whether the line is theirs to fill.
function mdbPageCreator_reasoningNotesLink( host ) {
    var found = mdbPageCreator_notesFind( host );

    if( found ) return found.from + " names one, so the section starts with it: " + found.url;

    var short = mdbPageCreator_notesShortenerFind();

    if( !short ) return "neither the description nor the buy/download link names that host, so the section stays empty";

    var shortName = short.from + "'s " + short.url.replace( /^https?:\/\//i, "" );

    if( typeof mdbPageCreator_followRedirect !== "function" ) {
        return shortName + " is a shortened link and this script cannot follow one, so the section stays empty";
    }

    if( !mdbPageCreator_notesResolveDone ) return "following " + shortName + " …";

    var resolved = mdbPageCreator_notesUrlIn( mdbPageCreator_notesResolved, host );

    if( resolved ) return shortName + " leads there, so the section starts with it: " + resolved;

    return shortName + " does not lead to " + host +
           ( mdbPageCreator_notesResolved ? " (" + mdbPageCreator_notesResolved + ")" : " (nothing came back)" ) +
           ", so the section stays empty";
}

// mdbPageCreator_reasoningRecentText
// Section 7, "Page text analysis of recent mixes": what the same pages' WIKITEXT settles about
// the page the "Create" link writes - the lead artwork line, the file details body, the shape
// of the {{Player}}, the Notes section, the styles.
// Rendered from the stored per-category findings (mdbPageCreator_recentPageTextFindings); the
// duration cross-check runs here too, so the section says the same thing the page text does.
function mdbPageCreator_reasoningRecentText( title ) {
    var s = mdbPageCreator_reasoningSection( "7", "Page text analysis of recent mixes",
            "the same pages' wikitext: what a page of this series starts as. Read at the same 90% bar; whatever clears no bar keeps today's default page text. \"Tracklist:\" is never read off siblings - it describes this page's own tracklist" ),
        info = mdbPageCreator_recentAnalysisFor( title ),
        state = mdbPageCreator_reasoningRecentState( info );

    if( state ) {
        s.append( mdbPageCreator_reasoningNote( state, "muted" ) );

        if( info.catTitle ) s.append( mdbPageCreator_reasoningApiCalls( "recent", info.catTitle ) );

        return s;
    }

    var f = info.entry.text,
        whole = mdbPageCreator_recentWholeCategory( info ),
        rows = [],
        i;

    s.append( mdbPageCreator_reasoningRecentRead( info ) );

    // Whether these pages really are this channel's - the URL evidence, in front of the
    // conventions read off them, since it is about the "siblings" claim they all rest on.
    // Only where the site handed a channelUrl over; only presence says anything
    // (mdbPageCreator_channelLinkFinding).
    var linked = mdbPageCreator_channelLinkFinding( info.entry );

    if( linked ) {
        rows.push( { label: "Channel link",
                     detail: linked.count
                         ? linked.count + " of the " + linked.n + " pages link this mix's channel (" + linked.url +
                           ") -> the pages themselves say this is the channel's category; the entity chip's score counts it too"
                         : "none of the " + linked.n + " pages link this mix's channel (" + linked.url +
                           ") - says nothing either way: older pages and other platforms are common" } );
    }

    // The lead artwork line. Where live recordings were left out of the vote
    // (mdbPageCreator_recentImageVote) the row says so: without it the count reads like the
    // whole sample, and "8 of the 8 newest pages" next to a "Read: the 10 newest pages" line
    // above it looks like a miscount rather than the deliberate omission it is.
    var skipped = f.imageSkipped || 0,
        imgAside = skipped
            ? ( skipped === 1
                ? " (1 live recording left out - its artwork is the event's flyer, named after the event)"
                : " (" + skipped + " live recordings left out - their artwork is the event's flyer, named after the event)" )
            : "";

    if( f.image && f.image.value === "same" ) {
        rows.push( { label: "Lead artwork",
                     detail: mdbPageCreator_reasoningRecentCount( f.image, whole ) + " open with an artwork named after the page itself (." + f.imageExt + ")" +
                             // the majority verdict (mdbPageCreator_imageVerdict): says why the
                             // line is written although the count is under the usual 90%
                             ( f.image.weak
                                 ? ", the rest name theirs after something else - but not one of them is without an artwork -> "
                                 : " -> " ) +
                             "the page text starts with [[File:<title>." + f.imageExt + "|right|360px]]" + imgAside } );
    } else if( f.image && f.image.value === "none" ) {
        rows.push( { label: "Lead artwork",
                     detail: mdbPageCreator_reasoningRecentCount( f.image, whole ) + " carry no artwork -> no image line" + imgAside } );
    } else if( f.image ) {
        rows.push( { label: "Lead artwork",
                     detail: mdbPageCreator_reasoningRecentCount( f.image, whole ) + " name their artwork after something else (nothing a new page could predict) -> no image line" + imgAside } );
    } else {
        rows.push( { label: "Lead artwork", detail: "no 90% agreement -> no image line" + imgAside } );
    }

    // the file details body
    var chosen = mdbPageCreator_recentBodyChoice( f ),
        durText = mdbPageCreator_durationMs ? convertHMS( Math.floor( mdbPageCreator_durationMs / 1000 ) ) : "";

    if( f.body && /^StandardShow/.test( String( f.body.value || "" ) ) ) {
        if( chosen ) {
            rows.push( { label: "File details",
                         detail: mdbPageCreator_reasoningRecentCount( f.body, whole ) + " use {{" + f.body.value + "}} -> written instead of the dur table" +
                                 ( durText ? " (this file's " + durText + " fits)" : "" ) } );
        } else {
            rows.push( { label: "File details",
                         detail: mdbPageCreator_reasoningRecentCount( f.body, whole ) + " use {{" + f.body.value + "}}, but this file's " + ( durText || "unknown duration" ) +
                                 " is too far off its stated length -> the dur table stays (the category may be a misread)" } );
        }
    } else if( f.body && f.body.value === "table" ) {
        rows.push( { label: "File details",
                     detail: mdbPageCreator_reasoningRecentCount( f.body, whole ) + " use the dur/MB/kbps table -> kept" } );
    } else {
        rows.push( { label: "File details", detail: "no 90% agreement -> the dur table stays" } );
    }

    // The {{Player}}. Only the mirrors shape is ever copied, and the line for the second
    // platform is written empty - the row says so, because a reader who does not expect that
    // line would read MixesDB's "No value for one of the players!" as a bug of ours.
    if( f.player && f.player.value === "mirrors" ) {
        var slotNo = mdbPageCreator_playerSlot( f ) + 1,
            order = [],
            h;

        for( h = 0; h < ( f.playerHosts || [] ).length; h++ ) order.push( f.playerHosts[h] || "?" );

        rows.push( { label: "Player",
                     detail: mdbPageCreator_reasoningRecentCount( f.player, whole ) + " use {{Player|mode=mirrors}} with " + ( f.playerSlots || 2 ) + " URLs" +
                             ( order.length ? " (" + order.join( " > " ) + ")" : "" ) + " -> written that way, this URL on line " + slotNo +
                             " and the other line empty for the mirror. MixesDB shows \"No value for one of the players!\" until it is filled in or removed" } );
    } else if( f.player && f.player.value === "plain" ) {
        rows.push( { label: "Player",
                     detail: mdbPageCreator_reasoningRecentCount( f.player, whole ) + " use a plain {{Player}} with one URL -> {{Player}} with single URL stays" } );
    } else if( f.player && f.player.value === "none" ) {
        rows.push( { label: "Player",
                     detail: mdbPageCreator_reasoningRecentCount( f.player, whole ) + " carry no player at all -> {{Player}} with single URL stays" } );
    } else if( f.player ) {
        rows.push( { label: "Player",
                     detail: mdbPageCreator_reasoningRecentCount( f.player, whole ) + " use a {{Player}} mode that needs a title per line (mode=multi), which a page with one URL cannot start as -> {{Player}} with single URL stays" } );
    } else {
        rows.push( { label: "Player", detail: "no 90% agreement -> {{Player}} with single URL stays" } );
    }

    // The Notes section and, separately, the host its links point at. Only a series that has
    // both gets a prefilled line, and only when the description really carries such a link -
    // the second row is where a reader sees which of the two was missing.
    if( f.notes && f.notes.value === "notes" ) {
        rows.push( { label: "Notes section",
                     detail: mdbPageCreator_reasoningRecentCount( f.notes, whole ) + " carry a \"== Notes ==\" section -> written above the tracklist, for the editor to fill" } );

        if( f.notesHost && f.notesHost.value !== "none" ) {
            rows.push( { label: "Notes link",
                         detail: mdbPageCreator_reasoningRecentCount( f.notesHost, whole ) + " link to " + f.notesHost.value +
                                 ( f.notesSample ? " (e.g. " + f.notesSample + ")" : "" ) + " -> " +
                                 mdbPageCreator_reasoningNotesLink( f.notesHost.value ) } );
        } else {
            rows.push( { label: "Notes link",
                         detail: "no 90% agreement on a host those sections link -> nothing to look for in the description, the section stays empty" } );
        }
    } else {
        rows.push( { label: "Notes section", detail: "no 90% agreement -> no Notes section" } );
    }

    // What the pages agree on, and what that name IS - the vote alone answers what these pages
    // have in common, which is not what the mix sounds like: a venue whose MixesDB pages are
    // all from one festival votes for the festival. So a winner is written only where it is a
    // style category, and every other one stays a hint under the row
    // (mdbPageCreator_styleCatVerdict / mdbPageCreator_recentHintCategories).
    var wroteStyle = false;

    for( i = 0; i < f.styles.learned.length; i++ ) {
        var verdict = mdbPageCreator_styleCatVerdict( f.styles.learned[i].name );

        if( verdict === "yes" ) wroteStyle = true;

        rows.push( { label: "Shared styles",
                     detail: "\"" + f.styles.learned[i].name + "\" on " + mdbPageCreator_reasoningRecentCount( f.styles.learned[i], whole ) +
                             ( verdict === "yes"
                                 ? " -> written into the page's style lines"
                                 : verdict === "no"
                                     ? " - no style category -> shown as a hint under the row, the style lines stay empty for the editor"
                                     : " - not a known style, asking MixesDB -> a hint under the row until that answer is in" ) } );
    }

    // ... and why there is (not) a blank style row behind the written ones: single pages
    // carrying a further style are the reason a spare line is worth keeping
    if( wroteStyle ) {
        var others = mdbPageCreator_recentLearnedCategories( title ).otherStyles,
            othersText = "",
            j;

        for( j = 0; j < others.length && j < 3; j++ ) {
            othersText += ( othersText ? ", " : "" ) + "\"" + others[j].name + "\" on " + others[j].count;
        }

        rows.push( { label: "Other styles",
                     detail: othersText
                         ? othersText + " of the " + f.n + " pages -> one style line left empty, this mix may carry one too"
                         : "the pages use no style beyond the written one -> no empty style line" } );
    }

    if( !f.styles.learned.length ) {
        var tally = "";

        for( i = 0; i < f.styles.tally.length && i < 3; i++ ) {
            tally += ( tally ? ", " : "" ) + f.styles.tally[i].name + " " + f.styles.tally[i].count + "/" + f.styles.tally[i].n;
        }

        rows.push( { label: "Shared styles",
                     detail: ( tally ? "nothing stands on 90% of the pages (" + tally + ")" : "the pages share no categories beyond this one" ) +
                             " -> no style to write and nothing to hint at" } );
    }

    s.append( mdbPageCreator_reasoningSteps( rows ) );

    // the same request as section 5 - one call carries the titles and the wikitext both - and,
    // where a shared category had to be classified, the one that asked what that name is
    if( info.catTitle ) {
        s.append( mdbPageCreator_reasoningApiCalls( "recent", info.catTitle ) );
        s.append( mdbPageCreator_reasoningApiCalls( "style", info.catTitle ) );
    }

    return s;
}

// mdbPageCreator_reasoningSimilar
// Section 8, "Similar categories on MixesDB": the prefix round behind the bar's "Similar:"
// row, with EVERY answer the request brought back - the row shows only the survivors, and
// which answer was dropped for which threshold was invisible before this section. One walk
// (mdbPageCreator_prefixDecisions) decides for both surfaces, so the two cannot disagree
// about what was shown. The % is section 3's score (mdbTitle_matchConfidence), which charges
// a prefix answer for the asked name being only the START of the category's - the built-in
// doubt that makes these hints rather than filings.
function mdbPageCreator_reasoningSimilar( title ) {
    var s = mdbPageCreator_reasoningSection( "8", "Similar categories on MixesDB",
            "the looser round behind the bar's \"Similar:\" row: every name the exact lookups of 3 DENIED is asked once more for categories whose names merely START like it. Every answer is listed - shown on the row, or dropped with the reason. Hints only: nothing here changes the title or the filing. The % is the same score as in 3, and starts low on purpose: the wiki has no category of the asked name itself" ),
        decisions = mdbPageCreator_prefixDecisions( title ),
        rows, i, j, rec, d, result;

    if( !decisions.length ) {
        // no early return: a prefix request already fired for this page (a title edited all
        // green afterwards) still closes the section as its "API call" row
        s.append( $("<div>").addClass( "mdb-pageCreator-reasoning-empty" )
            .text( "No denied names - nothing to look for similar categories to." ) );
    }

    rows = $("<div>").addClass( "mdb-pageCreator-reasoning-lookupCol-rows" );

    for( i = 0; i < decisions.length; i++ ) {
        rec = decisions[i];
        result = $("<span>").addClass( "mdb-pageCreator-reasoning-lookup-result" );

        for( j = 0; j < rec.decisions.length; j++ ) {
            d = rec.decisions[j];

            // one answer per line: the match as section 3 prints one - link, type, count,
            // score - then the row's verdict about it
            result.append(
                $("<span>").addClass( "mdb-pageCreator-reasoning-similar-answer" ).append(
                    mdbPageCreator_reasoningMatch( rec.name, rec.matches, d.index, false ),
                    d.shown
                        ? mdbPageCreator_reasoningNote( "shown on the \"Similar:\" row", "good" )
                        : mdbPageCreator_reasoningNote( "not shown - " + d.why, "muted" )
                )
            );
        }

        if( !rec.decisions.length ) {
            if( rec.status === "pending" )      result.append( mdbPageCreator_reasoningNote( "looking for similar names …", "info" ) );
            else if( rec.status === "failed" )  result.append( mdbPageCreator_reasoningNote( "the request failed - not retried, the row is only a hint", "bad" ) );
            else if( rec.status === "skipped" ) result.append( mdbPageCreator_reasoningNote( rec.why, "muted" ) );
            else if( rec.status === "unasked" ) result.append( mdbPageCreator_reasoningNote( "not asked yet - over the 10-name request limit", "muted" ) );
            else                                result.append( mdbPageCreator_reasoningNote( "no category starts like this name either", "muted" ) );
        }

        // red chip like section 3's: these are exactly the names that did not become a
        // category, re-asked the looser way
        rows.append(
            $("<div>").addClass( "mdb-pageCreator-reasoning-lookup" ).append(
                $("<span>").addClass( "mdb-pageCreator-chip mdb-pageCreator-chip-notCat" ).text( rec.name ),
                result
            )
        );
    }

    if( decisions.length ) s.append( rows );

    // the prefix request itself - moved here from section 3 (2026-08-20): its answers render
    // in THIS section and on the bar's row, never in 3, and an "API call" link belongs where
    // its answer is read
    s.append( mdbPageCreator_reasoningApiCalls( "prefix" ) );

    return s;
}

// mdbPageCreator_reasoningReady
// Whether the panel has everything it wants to show: the loading skeleton is gone (the page's
// pieces are on screen) and no name lookup is still in flight. Rendered before that, the panel
// would show half-answered lookups and categories that flip a moment later.
function mdbPageCreator_reasoningReady() {
    if( $("#mdb-skeleton").length ) return false;

    var lookupLog = ( typeof mdbTitle_lookupLog !== "undefined" && mdbTitle_lookupLog ) ? mdbTitle_lookupLog : [],
        // the channel-URL round is a request of its own and answers into section 3 as well -
        // a panel rendered while it is in flight shows a title the next second replaces
        needle = mdbPageCreator_channelUrlNeedle(),
        channelCat = needle ? mdbPageCreator_channelCatCache[needle] : null,
        i;

    if( channelCat && channelCat.status === "pending" ) return false;

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
                mdbPageCreator_reasoningChips( [ mdbPageCreator_titlePreLookup ], "mdb-pageCreator-chip-title" )
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
        // where each name came from (mdbTitle_candidateSources) - the channel stands in no
        // chunk, and a chunk is asked without its episode number, so a chip that quotes
        // neither section 1 nor section 2 reads as invented without this
        var sources = ( typeof mdbTitle_candidateSources !== "undefined" && mdbTitle_candidateSources ) ? mdbTitle_candidateSources : {},
            lookups = $("<div>").addClass( "mdb-pageCreator-reasoning-lookups" ),
            artistCol = mdbPageCreator_reasoningLookupColumn( "Artist category candidates" ),
            entityCol = mdbPageCreator_reasoningLookupColumn( "Entity category candidates" );

        for( i = 0; i < lookupLog.length; i++ ) {
            var entry = lookupLog[i],
                cached = Object.prototype.hasOwnProperty.call( cache, entry.key ) ? cache[entry.key] : "",
                matches = ( cached && cached.matches ) ? cached.matches : [],
                // read before the matches are rendered: it is part of what each answer is worth,
                // not only a line under them
                overruledBy = mdbPageCreator_lookupOverruledBy( trace, entry.key ),
                // the chips sit in the column of what they were asked FOR, not merely of what
                // came back - shared with the report box's two lists, see the function
                columns = mdbPageCreator_lookupRoleColumns( entry, matches ),
                isCat = !!catKeys[ entry.key ];

            // no role argument: the COLUMN is the role, and passing one shifted isCat and
            // overruledBy a slot along - which painted every chip green ("artist" is truthy)
            // and put the boolean into the overruled note
            if( columns.artist ) {
                mdbPageCreator_reasoningLookupRow( artistCol, entry, matches, isCat, overruledBy, sources[ entry.key ] );
            }
            if( columns.entity ) {
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

    // The lookup request itself, and the per-chip page fetches the hints bar fired off its
    // answers: the mix counts and types this whole section prints are the wiki's, so the row
    // that lets the reader read them in the raw belongs where they are shown. The prefix
    // request is NOT here: nothing in this section reads its answers - section 8 does.
    // The round that asks about no name at all, and only where the names left something open
    s3.append( mdbPageCreator_reasoningChannelCat( title ) );

    s3.append( mdbPageCreator_reasoningApiCalls( "mdbnames" ) );
    s3.append( mdbPageCreator_reasoningApiCalls( "channelCat" ) );
    s3.append( mdbPageCreator_reasoningApiCalls( "hintRecent" ) );

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
                mdbPageCreator_reasoningChips( [ mdbPageCreator_titlePostLookup ], "mdb-pageCreator-chip-title" )
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

    // ... and, under them, what the entity's sibling pages have in common and the page does
    // NOT get - the same hints the bar's "Hints:" row shows, as plain lines: the panel is
    // reading, not a place to click a category open. A style among those winners is not here:
    // it is one of the category rows above, where its note says it was learned. Reported on the
    // DEEP & HAZY mix, where "Amsterdam Dance Event" stood among the categories with nothing on
    // screen saying where it came from.
    var hints = mdbPageCreator_recentHintCategories( title );

    if( hints.length ) {
        var hintBox = $("<div>").addClass( "mdb-pageCreator-reasoning-cathints" ).append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-aside" )
                    .text( "Not written, only hinted at - the entity's recent pages share these:" )
            );

        for( i = 0; i < hints.length; i++ ) {
            hintBox.append(
                $("<div>").addClass( "mdb-pageCreator-reasoning-cathint" )
                    .text( hints[i].name + " - " + mdbPageCreator_recentHintNote( hints[i] ) )
            );
        }

        cats.append( hintBox );
    }

    s6.append( cats );
    panel.append( s6 );

    // 7) the recent-pages PAGE TEXT analysis - what the same pages' wikitext settles about
    // the page the "Create" link writes. It is about the page, no longer about the title
    panel.append( mdbPageCreator_reasoningRecentText( title ) );

    // 8) the prefix round behind the bar's "Similar:" row - every answer with the row's
    // verdict, the dropped ones included. Last: it decides nothing about the title or the
    // page, it only points at categories a denied name may have meant
    panel.append( mdbPageCreator_reasoningSimilar( title ) );
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
    mdbPageCreator_tracklistDecided = false,
    // Warnings a SITE script has about the tracklist it handed over - things the Tracklist
    // Editor API cannot know, because they happened to the text BEFORE it ever saw it.
    // SoundCloud's resolved channel handles are the case this was built for: the box shows
    // artist names the uploader never typed, so it has to say so rather than let them pass
    // for the uploader's own spelling. Each entry is a ready HTML string.
    mdbPageCreator_tracklistNotices = [],
    // the API's answer as it arrived, before mdbPageCreator_feedbackWithNotices() folded the
    // notices in - see mdbPageCreator_setTracklistFeedback()
    mdbPageCreator_tracklistFeedbackRaw = null;

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

    // Before anything else: an open modal frames a page of the mix being LEFT. The shared
    // cleanup cannot be relied on for it - the overlay hangs in the top document wherever the
    // site frames its pages (mdbModal_doc in shared/mixesdb_modal/funcs.js), and that cleanup
    // only clears the document this script runs in. typeof-guarded like every other touch of
    // the modal file.
    if( typeof mdbModal_close === "function" ) mdbModal_close();

    mdbPageCreator_title = "";
    mdbPageCreator_confidencePercent = 0;
    mdbPageCreator_confidenceReasons = [];
    mdbPageCreator_promoCategory = false;
    mdbPageCreator_playerUrl = "";
    mdbPageCreator_channelUrl = "";
    mdbPageCreator_durationMs = 0;
    mdbPageCreator_artworkUrl = "";
    mdbPageCreator_description = "";
    mdbPageCreator_purchaseUrl = "";
    // the resolve is about THIS track's sources - the resolver itself is the site's and stays
    // (mdbPageCreator_add is not called again on every render)
    mdbPageCreator_notesAsked = "";
    mdbPageCreator_notesAskedFrom = "";
    mdbPageCreator_notesResolved = "";
    mdbPageCreator_notesResolveDone = false;
    mdbPageCreator_sourceTitle = "";
    mdbPageCreator_sourceChannel = "";
    mdbPageCreator_sourceDate = "";
    mdbPageCreator_sourceLabel = "";
    mdbPageCreator_reportOpen = false;
    mdbPageCreator_hintsLogged = "";
    mdbPageCreator_hintCatsLogged = "";
    // the channel-URL round's ANSWERS stay (mdbPageCreator_channelCatCache, keyed by channel);
    // only why it did not fire is about the mix being left
    mdbPageCreator_channelCatSkip = "";
    // the prefix CACHE stays, like the category cache - an answer about a name does not
    // change from page to page; only the log quieter is per page
    mdbPageCreator_similarLogged = "";
    mdbPageCreator_alternatives = [];
    mdbPageCreator_altsLogged = "";
    mdbPageCreator_similarPromoted = null;
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
    // the api.php requests of the previous mix - the answers they brought stay in the caches,
    // but no link may claim a request was made for THIS page when it was not
    if( typeof mdbTitle_apiCallLog !== "undefined" ) mdbTitle_apiCallLog = [];
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
    mdbPageCreator_tracklistNotices = [];
    mdbPageCreator_tracklistFeedbackRaw = null;

    // Kept on purpose: mdbPageCreator_target / _tracklistTarget / _tracklistBoxSite /
    // _stylesBoxSite are selector strings naming where on THIS SITE the row and the boxes
    // live, which does not change from one mix to the next, and the site script's next
    // mdbPageCreator_add() may well omit them.
}

// mdbPageCreator_addTracklistNotice
// A site script's own warning about the tracklist it is about to hand over (or just handed
// over): SoundCloud calls this when it replaced @channel-handles in the text with the names
// those channels carry. The box prints it alongside the Tracklist Editor API's own feedback
// and goes into warning mode for it - see mdbPageCreator_feedbackWithNotices().
//
// Callable before OR after the box exists. Before is the normal case (the site resolves, then
// hands the text over), but the comments path resolves inside loadComments(), so a notice
// landing on an already built box must still show - which is what the re-render below is for.
function mdbPageCreator_addTracklistNotice( html ) {
    if( !html ) return;
    if( mdbPageCreator_tracklistNotices.indexOf( html ) > -1 ) return; // a re-render, not a second notice

    logFunc( "mdbPageCreator_addTracklistNotice" );

    mdbPageCreator_tracklistNotices.push( html );

    if( !mdbPageCreator_tracklistFeedbackRaw ) return; // nothing formatted yet - it gets folded in then

    // the API is NOT asked again: its answer has not changed, only what we print alongside it
    mdbPageCreator_setTracklistFeedback( mdbPageCreator_tracklistFeedbackRaw );

    var box = $( mdbPageCreator_tracklistBoxSite || mdbPageCreator_tracklistBoxSelector ).first();

    // typeof-guarded like every stale-cache seam: a page_creator.js ahead of its cached
    // tracklist_editor/funcs.js must not break the box over a notice it cannot print
    if( box.length && typeof tlBoxRenderFeedback === "function" ) {
        tlBoxRenderFeedback( box, mdbPageCreator_tracklistFeedback );
    }
}

// mdbPageCreator_setTracklistFeedback
// Every place that takes a feedback object from the API goes through here, so the notices are
// folded in exactly once and the RAW answer is kept for the next fold - decorating an already
// decorated answer would print the notice twice.
//
// The status is taken from the RAW answer on purpose. A notice says where the text came from,
// not whether it is complete, and mdbPageCreator_tracklistFiling() reads the status: a
// resolved handle must not change which "Tracklist:" category the created page gets.
function mdbPageCreator_setTracklistFeedback( feedback ) {
    mdbPageCreator_tracklistFeedbackRaw = feedback || null;
    mdbPageCreator_tracklistFeedback = mdbPageCreator_feedbackWithNotices( feedback );
    mdbPageCreator_tracklistStatus = ( feedback && feedback.status ) || "";
}

// mdbPageCreator_feedbackWithNotices
// The API's feedback with our own rows in it. A copy - the answer object itself is left alone,
// so the next fold starts where the first one did.
//
// The rows are counted as WARNINGS, which is what tlEditorFeedbackClass() colours the box by:
// an artist name the uploader never typed is exactly the thing that must not be saved
// unlooked-at, so it carries the weight of an API warning rather than that of a quiet hint.
function mdbPageCreator_feedbackWithNotices( feedback ) {
    if( !mdbPageCreator_tracklistNotices.length ) return feedback;
    if( !feedback || !feedback.text ) return feedback;

    var rows = "";

    $.each( mdbPageCreator_tracklistNotices, function( i, html ) {
        rows += "<li>" + html + "</li>";
    });

    // No styling of its own: "#tlEditor-feedback ul" in tracklistEditor_copy.css already
    // styles the API's own lists, and a notice that looks like one of them is the point - it
    // is feedback about the same tracklist, from a step the API was not part of.
    var list = '<ul class="mdb-tlEditor-notices">' + rows + "</ul>",
        holder = $( "<div>" ).append( feedback.text ),
        box = holder.children( "#tlEditor-feedback" ).first(),
        warnings = ( parseInt( feedback.warnings, 10 ) || 0 ) + mdbPageCreator_tracklistNotices.length;

    // The answer is normally the whole <div id="tlEditor-feedback">. If it ever is not, the
    // notice still has to be seen, so it goes behind whatever did arrive.
    if( !box.length ) {
        return $.extend( {}, feedback, { text: feedback.text + list, warnings: warnings } );
    }

    // BELOW everything the API said, never above it. The box is read for one answer - is this
    // tracklist complete, and what is wrong with it - and a notice of ours in front of that
    // answer pushes it out of the way. Ours is the footnote to it, so it reads like one.
    // The floated chip row (#tlEditor-feedback-rows) is unaffected either way: it floats out
    // of the flow wherever in the box it sits.
    box.append( list );

    return $.extend( {}, feedback, { text: holder.html(), warnings: warnings } );
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
    mdbPageCreator_setTracklistFeedback( res.feedback || null );

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
    mdbPageCreator_setTracklistFeedback( res.feedback );

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

        mdbPageCreator_setTracklistFeedback( res.feedback );

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
 *       rows:       [ "head", "dates", "pageCreator", "buttons", "player", "toolkit" ],
 *                                           // any subset, in order; default [ "toolkit" ]
 *       height:     300,                    // px, optional - the heights in
 *                                           // page_creator.css are the default
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
// (embed-sized block), "pageCreator" (the page creator row's own box) and "toolkit" (the
// toolkit's own box, which also absorbs the skeleton's leftover height). The two features
// are SEPARATE boxes on purpose - one merged grey block misread as one thing arriving where
// the page really gets two.
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
            case "pageCreator":
                html += '<div class="mdb-skeleton-block mdb-skeleton-pageCreator">' + bars(3) + '</div>';
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

    // resolved once so the closing log line can NAME the stand-ins - the skeleton is on
    // screen for a second or two, and which boxes it composed must be readable afterwards
    var rows = options.rows || [ "toolkit" ];

    // Read at call time, not load time: the option lives in the site script, whose body
    // runs after this @require'd file.
    mdbSkeleton_active = window.mdbSkeleton_enabled !== false;

    if( mdbSkeleton_active ) {
        // Appended, not prepended, so a container whose first child carries layout duties
        // (SC's floated #mdb-sc-trackHead) keeps it. While loading the siblings are
        // display:none anyway, and the reveal removes the skeleton in the same step it
        // shows them.
        wrapper.append( mdbSkeleton_html( rows ) ).addClass( "mdb-skeleton-loading" );

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

    log( "mdbSkeleton_show: " + ( mdbSkeleton_active ? "skeleton up" : "timing only" ) + " on \"" + mdbSkeleton_target + "\" (rows: " + rows.join( ", " ) + "), waiting for the toolkit verdict" + ( mdbSkeleton_extraReady ? " + extraReady()" : "" ) + " (settle " + mdbSkeleton_settleMs + "ms, cap " + mdbSkeleton_maxMs + "ms)." );
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
