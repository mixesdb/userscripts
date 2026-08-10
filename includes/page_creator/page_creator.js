log( "/includes/page_creator/page_creator.js loaded" );


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
 *         target:      "#mdb-trackHeader-headline",  // where the row goes
 *         placement:   "after"                       // after|before|append|prepend
 *     });
 *
 *     mdbPageCreator_watchToolkit();  // whenever the toolkit is (re)built
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
 * page_creator.css styles the row. All three are @require'd/loaded next to this one.
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
    // where the row goes - see the note on selector strings in the header comment
    mdbPageCreator_target = null,
    mdbPageCreator_placement = "after",
    mdbPageCreator_toolkitVerdict = null,
    mdbPageCreator_toolkitPoll = null;

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
        releaseDate = o.releaseDate || "";

    mdbPageCreator_playerUrl = o.playerUrl || "";
    mdbPageCreator_artworkUrl = o.artworkUrl || "";

    // Kept even when this call brings none, so a second call that only refreshes the data does
    // not lose the placement the first one set.
    if( o.target ) mdbPageCreator_target = o.target;
    if( o.placement ) mdbPageCreator_placement = o.placement;

    logVar( "mdbPageCreator_add: title", playerTitle );
    logVar( "mdbPageCreator_add: channel", channel );
    logVar( "mdbPageCreator_add: createdAt", createdAt );
    logVar( "mdbPageCreator_add: target", typeof mdbPageCreator_target === "string" ? mdbPageCreator_target : "(node)" );
    logVar( "mdbPageCreator_add: placement", mdbPageCreator_placement );

    var first = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, mdbTitle_categoryCache );

    mdbPageCreator_setTitle( first, o.durationMs );

    mdbTitle_lookupCategories( mdbTitle_categoryCandidates( playerTitle, channel ), function( known ) {
        var second = buildMixesdbTitle( playerTitle, channel, createdAt, releaseDate, known );

        if( second.title !== first.title ) {
            logVar( "mdbPageCreator_add: MixesDB knew better", first.title + "  ->  " + second.title );
        }

        mdbPageCreator_setTitle( second, o.durationMs );
    });
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
// filled in: the file details, the player, and the categories the title itself spells out.
// The tracklist and the styles are the editor's work and are left as the empty shapes they have
// on every mix page, so nothing here has to be undone before it can be finished.
function mdbPageCreator_pageText( title ) {
    return "== File details ==\n\n" +
           mdbPageCreator_fileDetails() + "\n\n" +
           "{{Player\n |" + mdbPageCreator_playerUrl + "\n}}\n\n" +
           "== Tracklist ==\n\n" +
           "<list>\n\n</list>\n\n" +
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

// mdbPageCreator_pageCategories
// Read out of the title in the input, not out of what the parser had in mind: the input is
// editable, and a corrected title has to take its categories with it.
//
// "Date - Artist - Entity" gives the year, one category per artist, and the entity. The two
// empty slots are the styles - nothing on a player page says what a mix sounds like, and a
// guess there is worse than a blank the editor cannot miss. "Tracklist: none" is what a page
// without a tracklist is filed as; the wiki's own editor swaps it once one is added.
function mdbPageCreator_pageCategories( title ) {
    var bits = String( title || "" ).split( mdbTitle_bitSplitRe() ),
        year = ( String( title || "" ).match( /^\s*(\d{4})/ ) || [ "", "" ] )[1],
        artistField = bits[1] || "",
        entity = bits[2] || "",
        cats = [],
        i;

    if( year ) cats.push( year );

    // A live recording has no third bit: what stands behind the "@" is the entity there. The
    // city behind the venue is not a category of its own - "... @ Wire Club, Leeds" is filed
    // under Wire Club alone - so only the part in front of the comma is taken.
    var atParts = artistField.split( /\s+@\s+/ );

    if( atParts.length > 1 ) {
        artistField = atParts[0];

        if( !entity ) {
            entity = atParts.slice( 1 ).join( " @ " ).split( "," )[0];
        }
    }

    // the separators MixesDB writes between artists - "," for one after another, "&" for
    // together - both mean one category each
    var artists = artistField.split( /\s*(?:,|&)\s*/ );

    for( i = 0; i < artists.length; i++ ) {
        // no episode stripping on an artist: "Asa 808" is a name, and the number belongs to it
        var artist = $.trim( artists[i].replace( /\s*\(Promo Mix\)\s*$/, "" ) );

        if( artist ) cats.push( artist );
    }

    // Help:Add_a_new_mix_page - a self-released mix is filed under Promo Mix, and what stands in
    // the entity slot there is the mix's OWN name, which is no category at all: "1975 - Bob
    // Marley & The Wailers - Secret Santana Tapes (Promo Mix)" is filed under the two artists
    // and Promo Mix, never under "Secret Santana Tapes". The flag covers the titles that leave
    // the suffix off because the name already says it (see mdbPageCreator_syncPromoNote).
    var isPromoMix = mdbPageCreator_promoCategory || /\(Promo Mix\)\s*$/.test( title ),
        entityCategory = isPromoMix ? "Promo Mix" : mdbPageCreator_entityCategory( entity );

    if( entityCategory ) cats.push( entityCategory );

    cats.push( "", "" ); // styles - the editor's call
    cats.push( "Tracklist: none" );

    var out = "";

    for( i = 0; i < cats.length; i++ ) {
        out += "[[Category:" + cats[i] + "]]\n";
    }

    return out;
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

// mdbPageCreator_refresh
// Second thoughts from the MixesDB lookup, put into a row that is already on screen. Anything
// typed into the input wins: a refined guess is still a guess, and the editor's own text is
// the one thing here that is not.
function mdbPageCreator_refresh( wrapper ) {
    logFunc( "mdbPageCreator_refresh" );

    var input = wrapper.find( "#mdb-pageCreator-title" );

    if( input.length && !input.data( "mdb-edited" ) && input.val() !== mdbPageCreator_title ) {
        input.val( mdbPageCreator_title )
             .attr( "size", Math.max( 20, mdbPageCreator_title.length ) )
             .trigger( "change" ); // keeps the "Create" href in step with the new title
    }

    wrapper.find( "#mdb-pageCreator-score" )
        .attr( "class", "mdb-pageCreator-score-" + mdbPageCreator_confidenceBand( mdbPageCreator_confidencePercent ) )
        .attr( "title", mdbPageCreator_confidenceTitle() )
        .text( mdbPageCreator_confidencePercent + "%" );

    mdbPageCreator_syncPromoNote( wrapper );
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
    // visible without a horizontal scroll. Floored, an empty-looking 1-char box is useless.
    input.attr( "size", Math.max( 20, mdbPageCreator_title.length ) );

    // input first, so appendMdbCopyTextButton() has a parent to insert the button into - it
    // uses .after(), which is a no-op on a detached node.
    // Order: input, copy, confidence (score over beta), then "Create" - or "used" in its place.
    wrapper.append( input );

    appendMdbCopyTextButton( input, {
        ariaLabel: "Copy the suggested MixesDB page title",
        buttonTitle: "Copy the suggested MixesDB page title",
        copiedMessage: function() {
            return "Page title copied!";
        },
        processedClass: "mdb-pageCreator-copy-processed"
    });

    // "beta" belongs under the score, and a plain <br> cannot do that here: the row is a flex
    // container, where a <br> becomes a flex item of its own instead of breaking the line.
    // A small column wrapper stacks the two and keeps them as one item in the row.
    var confidence = $("<span>")
            .attr( "id", "mdb-pageCreator-confidence" )
            .append( score, beta );

    wrapper.append( confidence );

    if( isUsed ) {
        // No "Create" link for a used player: the mix HAS a page, and the link would open the
        // edit form of a second one. The toolkit right below links to the existing page - that
        // is what the suggestion is to be compared against. The marker keeps the debug row from
        // ever passing as the normal "not on MixesDB yet" one.
        wrapper.addClass( "mdb-pageCreator-used" )
               .append( $("<span>")
                   .attr( "id", "mdb-pageCreator-usedNote" )
                   .attr( "title", "This player is already used on MixesDB - see the toolkit below.\nThe row is only shown because the debug setting mdbPageCreator_showForUsedPlayers is on at the top of script.user.js. No \"Create\" link, since that would start a duplicate page." )
                   .text( "Exists" ) );
    } else {
        // _blank, not the usual _top: the point of this link is to fill in the MixesDB form
        // while still reading duration/artwork URL/API data off this player page - the same
        // "keep working on the source page" case as the toolkit's EDIT/HIST links.
        var create = $("<a>")
                .attr( "id", "mdb-pageCreator-create" )
                .attr( "target", "_blank" )
                .attr( "title", "Create this mix page on MixesDB - opens its edit form, filled with the file details, the player and the categories the title gives away" )
                .text( "Create" );

        mdbPageCreator_syncCreateHref( input, create );
        input.on( "input change", function() {
            mdbPageCreator_syncCreateHref( input, create );
        });

        // The page text is more than the title: the file details table lands in the DOM a
        // moment after this row is built, and nothing about that fires an input event. So the
        // href is refreshed once more on the way into the click - mousedown covers left,
        // middle and cmd/ctrl-click alike, focus covers reaching the link by keyboard.
        create.on( "mousedown focus", function() {
            mdbPageCreator_syncCreateHref( input, create );
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
