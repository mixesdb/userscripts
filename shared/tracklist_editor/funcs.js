/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist Editor (TLE)
 *
 * Everything between a scraped tracklist and MixesDB wiki syntax: the Tracklist Editor API
 * (apiTracklist() / apiTracklistAsync()), the editable #tlEditor box that shows its answer
 * (fixTLbox(), which also wires the box up to grow while typing and to re-ask the API when
 * an edited box loses focus - see tlBoxBindLive()) and the array helpers the site scripts
 * build a tracklist with before handing it over.
 *
 * Split out of global.js, which still holds everything these rely on (log(), loadRawCss(),
 * apiUrlTools, the duration converters), so global.js has to be @require'd FIRST.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "shared/tracklist_editor/funcs.js: started executing" );




/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlEditorFeedbackClass
// Which colour a Tracklist Editor answer gives the box: red for a warning, orange for a hint or
// a tracklist that is merely incomplete, green only for one that is valid AND complete.
// Its own function because the feedback is not only printed once - the page creator re-asks the
// API for the tracklist the editor has since changed and has to re-colour the same box.
function tlEditorFeedbackClass( feedback ) {
    if( !feedback ) return "";

    if( feedback.warnings > 0 ) return "tlEditor-feedback-warning";
    if( feedback.hints > 0 ) return "tlEditor-feedback-hint";
    if( feedback.status == "incomplete" ) return "tlEditor-feedback-hint";

    return "tlEditor-feedback-complete";
}

// tlEditorFeedbackClasses
// All of them, for removing the previous one before the next is set.
var tlEditorFeedbackClasses = "tlEditor-feedback-warning tlEditor-feedback-hint tlEditor-feedback-complete";

// fixTLbox
// focus: the box selects itself so the tracklist can be copied straight out of it. That is the
// point of it where the user ASKED for a tracklist (TrackId.net, RA), and a nuisance where one
// merely appeared next to a player they were listening to - it takes the caret and scrolls the
// page to the box. Those callers pass false.
function fixTLbox( feedback, target, focus=true ) {
    var targetNode = target ? $(target).first() : $();
    var tls = targetNode.length
        ? ( targetNode.is("textarea") ? targetNode : targetNode.find("#mixesdb-TLbox, textarea.mixesdb-TLbox") )
        : $("#mixesdb-TLbox, textarea.mixesdb-TLbox");

    tls.each(function() {
        var tl = $(this);
        tl.html( tl.html().replace(/&(nbsp|thinsp);/g, ' ') );
        var text = "TEMPBEGINNING" + tl.val(),
            textFix = text.replace(/TEMPBEGINNING(\n)?/g,"")
                          .replace(/\n$/g,"")
                          .replace(/( )+/g, " ");
        tl.val(textFix);
        text = tl.val();
        var lines = text.split("\n"),
            count = lines.length;
        tl.attr('rows', count);

        // "mdb-tlBox-fixed", not the bare "fixed" this used to add: player sites ship
        // utility-class CSS, and on more than one of them (SoundCloud's Material layout, The Lot
        // Radio) ".fixed" means "position: fixed" - which took the textarea out of the flow and
        // laid it over the page. Nothing reads this class but us, so it is namespaced like every
        // other class we add. (TheLotRadio/script.user.js still strips the old name off; its
        // global.js is a cached older one, so leave that alone until it is bumped.)
        tl.show().addClass("mdb-tlBox-fixed");

        // what the API last saw of this box - the blur update compares against it, so a blur
        // without an edit stays quiet (no request, no grey flash)
        tl.data( "mdbTlboxKnown", tl.val() );
        tlBoxBindLive( tl );

        if( focus ) tl.select();
    });

    if( feedback != null && feedback.text ) {
        var tle = targetNode.length
            ? ( targetNode.is("#tlEditor, .tlEditor") ? targetNode : targetNode.closest("#tlEditor, .tlEditor") )
            : $("#tlEditor");
        var tl = tls.first();

        if( !tle.length && tl.length ) {
            tle = tl.closest("#tlEditor, .tlEditor");
        }

        tle.addClass("bot10");
        tl.addClass( "tlEditor-textarea" );

        tle.removeClass( tlEditorFeedbackClasses ).addClass( tlEditorFeedbackClass( feedback ) );

        // a re-run replaces the ANSWER inside the existing box rather than the box itself -
        // see tlBoxSetFeedbackHtml. Never a second box stacked under the first either way.
        tlBoxSetFeedbackHtml( tl, feedback.text );

        tlBoxShowApiCount();
    }
    loadRawCss( "https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/tracklistEditor_copy.css" );
}

/*
 * The box keeps itself in shape while it is edited - on every site, because the wiring rides
 * along in fixTLbox(), which every box that shows API feedback passes through:
 *
 * - while typing, the rows attribute follows the line count, so the box grows and shrinks
 *   with its text instead of scrolling inside itself
 * - while typing, the FEEDBACK can follow too, when the reader switched the live check ON
 *   (OFF by default - see tlBoxAutoUpdate): a debounced check (one request per typing pause,
 *   the web-standard debounce) asks the API about the text as it stands and re-colours the box
 *   and the printed feedback - but NEVER touches the text and NEVER refreshes mdbTlboxKnown.
 *   The caret is in the box (a rewrite would move it), and mdbTlboxKnown is what tells the
 *   blur update the text still needs formatting.
 * - when an EDITED box loses focus, the text goes through the Tracklist Editor API once more:
 *   the box greys out (mdb-tlBox-updating, styled in tracklistEditor_copy.css), and the answer
 *   replaces the text and re-colours the feedback - exactly as if the tracklist had arrived
 *   that way. The grey state holds at least tlBoxUpdateMinMs, however fast the API answers:
 *   a correction that lands as an invisible flash looks like it never happened.
 *
 * The marker attribute (not a jQuery .data flag) keeps a box from being bound twice: two of
 * our userscripts can share one page (TrackId.net + Tracklist Merger on trackid.net), and a
 * DOM attribute is the one flag both of them can see.
 */
var tlBoxUpdateMinMs = 400,
    tlBoxTypeDelayMs = 800; // same pause the reasoning panel's title edit waits out

// tlBoxBindLive
function tlBoxBindLive( tl ) {
    if( tl.attr( "data-mdb-tlbox-live" ) ) return;
    tl.attr( "data-mdb-tlbox-live", "1" );

    tl.on( "input", function() {
        tl.attr( "rows", String( tl.val() ).split( "\n" ).length );

        clearTimeout( tl.data( "mdbTlboxTypeTimer" ) );
        tl.data( "mdbTlboxTypeTimer", setTimeout(function() {
            tlBoxTypeUpdate( tl );
        }, tlBoxTypeDelayMs ) );
    });

    // Enter and a click into the box are both "I am done with that line" - the two moments a
    // typist pauses on purpose - so they ask straight away instead of sitting out the debounce.
    // keyup, not keydown: the newline is only in the value once the key is released.
    // Both are cheap by construction: tlBoxTypeUpdate() returns without a request when the
    // text has not changed since the last answer, which is what a bare click into the box is.
    tl.on( "keyup", function( e ) {
        if( e.which !== 13 ) return;

        tlBoxTypeUpdateNow( tl );
    });

    tl.on( "click", function() {
        tlBoxTypeUpdateNow( tl );
    });

    tl.on( "blur", function() {
        // the blur update supersedes a pending typing check - it does everything the check
        // would have done, plus the text
        clearTimeout( tl.data( "mdbTlboxTypeTimer" ) );
        tlBoxBlurUpdate( tl );
    });

    // While an input method is composing (IME, or a dead key on the way to an accented
    // character), the value on screen is half-finished and belongs to the input method, not
    // to us - rewriting it then tears the composition apart. tlBoxApplyWhileTyping() checks
    // this flag before it touches the text.
    tl.on( "compositionstart", function() {
        tl.data( "mdbTlboxComposing", true );
    });

    tl.on( "compositionend", function() {
        tl.data( "mdbTlboxComposing", false );
    });
}

// tlBoxTypeUpdateNow
// Runs the live check at once and drops the pending debounce, so the two never both fire for
// the same text.
function tlBoxTypeUpdateNow( tl ) {
    clearTimeout( tl.data( "mdbTlboxTypeTimer" ) );
    tlBoxTypeUpdate( tl );
}

// tlBoxRenderFeedback
// The feedback part of fixTLbox() alone: the colour class on the wrapper and the printed
// feedback under the box - and NOTHING about the text or mdbTlboxKnown. This is what the
// typing update is allowed to do while the caret is in the box; see the section comment.
function tlBoxRenderFeedback( tl, feedback ) {
    if( !feedback || !feedback.text ) return;

    var tle = tl.closest( "#tlEditor, .tlEditor" );

    tle.addClass( "bot10" ).removeClass( tlEditorFeedbackClasses ).addClass( tlEditorFeedbackClass( feedback ) );
    tl.addClass( "tlEditor-textarea" );

    tlBoxSetFeedbackHtml( tl, feedback.text );

    tlBoxShowApiCount();
}

/*
 * tlBoxSetFeedbackHtml
 *
 * The feedback box, put on the page without the flash that taking it out and putting a new one
 * in produced on every single typing pause.
 *
 * Two steps, both about leaving the DOM alone unless something actually changed:
 *
 *   - the SAME answer as the one on screen (which is what most typing pauses produce - the
 *     status of a tracklist does not change with every word) touches nothing at all
 *   - a different answer is swapped into the EXISTING box rather than replacing it, so the
 *     element, its position and its height survive the swap. The box then only visibly moves
 *     when the new answer really is taller or shorter than the old one, which is the one case
 *     where something has to give.
 *
 * The raw markup is remembered on the node to compare against, rather than read back off the
 * DOM: the browser rewrites attribute order and entities on parse, and our own chips are
 * children of that box - neither would ever compare equal.
 */
function tlBoxSetFeedbackHtml( tl, html ) {
    var current = tl.nextAll( "#tlEditor-feedback" ).first(),
        // The RAW answer is the comparison key, plus the switch state: the same answer is
        // shown differently with live updates on and off (see tlBoxCleanFeedbackHtml), so the
        // state has to be part of "is what is on screen still right?" - otherwise flipping the
        // switch would leave the previous rendering standing.
        key = ( tlBoxAutoUpdate() ? "live:" : "static:" ) + html;

    if( current.length && current.data( "mdbFeedbackHtml" ) === key ) return;

    var clean = tlBoxCleanFeedbackHtml( html );

    if( !current.length ) {
        tl.after( clean );
        tl.nextAll( "#tlEditor-feedback" ).first().data( "mdbFeedbackHtml", key );
        return;
    }

    // the API answers with the whole <div id="tlEditor-feedback">; what goes into the box on
    // the page is its CONTENT, so the box itself stays the node it was
    var parsed = $( "<div>" ).append( clean ).children( "#tlEditor-feedback" ).first(),
        from = current.outerHeight();

    current.html( parsed.length ? parsed.html() : clean ).data( "mdbFeedbackHtml", key );

    // Our chips are children of this box, so the swap above just took them off the page.
    // Put back here rather than by the caller: the switch re-renders the answer on a click
    // without going through tlBoxFeedback(), and that click used to end with the counter and
    // the switch itself gone from the box until the next API answer rebuilt them.
    tlBoxShowApiCount();

    tlBoxSettleFeedbackHeight( current, from );
}

/*
 * tlBoxCleanFeedbackHtml
 *
 * Takes "No changes were made." out of the answer - but ONLY while live updates are on.
 *
 * The message says "the formatter found nothing to fix in what you sent", which is what an
 * already formatted tracklist gets. Whether that is worth reading depends entirely on who
 * asked:
 *
 *   - switch OFF: the box only asks when you LEAVE it or click "Create", so the message
 *     answers an edit you finished - "nothing here needed fixing" is a real answer to that,
 *     and it stays.
 *   - switch ON: the box asks after every typing pause, so the message turns up mid-sentence,
 *     right after a keystroke, and reads as "your edit did nothing" - the opposite of what it
 *     means. There it is noise and goes.
 *
 * Its wrapper goes with it when nothing else is left in it - an empty bold line would keep the
 * gap the message used to sit in.
 */
function tlBoxCleanFeedbackHtml( html ) {
    if( !tlBoxAutoUpdate() ) return html;
    if( String( html ).indexOf( "tlEditor-feedback-noChanges" ) === -1 ) return html;

    var holder = $( "<div>" ).append( html ),
        noChanges = holder.find( "#tlEditor-feedback-noChanges" ),
        wrapper = noChanges.parent( "#tlEditor-feedback-topInfo-noList" );

    noChanges.remove();

    if( wrapper.length && $.trim( wrapper.text() ) === "" && !wrapper.children().length ) wrapper.remove();

    return holder.html();
}

/*
 * tlBoxSettleFeedbackHeight
 *
 * The answer above is swapped into the existing box, so nothing is ever removed from the page -
 * but the answers themselves are different heights ("valid and complete" is one line, "these
 * tracks seem to miss the artist names" is that line plus every track it means), and while
 * typing the box alternates between them. Left alone it snaps: small, big, small, and the whole
 * page under it jumps with it.
 *
 * So the height is animated from the old to the new one, and NOT touched at all when the two
 * are the same - which is the common case, and then nothing on the page moves. The measuring
 * waits a frame because the caller adds our chips right after us, and they are part of what is
 * being measured.
 *
 * The "animate to auto" dance is the usual one: height cannot transition to "auto", so the
 * natural height is measured once, set as a number, and released back to "auto" when the
 * transition is over.
 */
var tlBoxFeedbackResizeMs = 180;

function tlBoxSettleFeedbackHeight( box, from ) {
    // no baseline to animate from (the box was just built, or is hidden) - leave it be
    if( !from ) return;

    var raf = window.requestAnimationFrame || function( fn ) { return setTimeout( fn, 16 ); };

    raf(function() {
        if( !box.get( 0 ) || !$.contains( document.documentElement, box.get( 0 ) ) ) return;

        var to = box.css( "height", "auto" ).outerHeight();

        if( to === from ) return; // same size - the swap was invisible, keep it that way

        clearTimeout( box.data( "mdbFeedbackResizeTimer" ) );

        box.css({ height: from + "px", overflow: "hidden" });

        box.get( 0 ).offsetHeight; // reflow, so the browser has the old height to start from

        box.addClass( "mdb-tlEditor-feedback-resizing" ).css( "height", to + "px" );

        box.data( "mdbFeedbackResizeTimer", setTimeout(function() {
            box.removeClass( "mdb-tlEditor-feedback-resizing" ).css({ height: "", overflow: "" });
        }, tlBoxFeedbackResizeMs + 40 ) );
    });
}

/*
 * tlBoxTopInfoList
 *
 * The <ul id="tlEditor-feedback-topInfo"> the site scripts hang their own rows in, created when
 * the answer on screen does not carry one.
 *
 * The API only sends that list when it has something to SAY about the tracklist - incomplete,
 * a hint, a warning. "The tracklist seems valid and complete." arrives as a bare <div> instead,
 * and every row a script wants to add (TrackId.net's notice about the removed "?" tracks with
 * its Toggle, the cue format switch, the Tracklist Merger's link) then has nowhere to go and
 * silently does not appear. The better the tracklist, the fewer of our own controls - the exact
 * opposite of what they are there for.
 *
 * Created in front of the message, which is where the API's own list stands, and only when a
 * caller actually has a row for it: an empty list would still push the message down by the
 * margin tracklistEditor_copy.css gives "#tlEditor-feedback-topInfo + div".
 */
function tlBoxTopInfoList( target ) {
    var box = $();

    if( target ) {
        var scope = $(target).first();

        // fixTLbox() puts the feedback box after the textarea, so from a textarea it is a
        // SIBLING - from a wrapper (#tlEditor) it is a child
        box = scope.nextAll( "#tlEditor-feedback" ).first();

        if( !box.length ) box = scope.find( "#tlEditor-feedback" ).first();
    }

    if( !box.length ) box = $("#tlEditor-feedback").first();
    if( !box.length ) return $();

    var list = box.find( "#tlEditor-feedback-topInfo" ).first();

    if( list.length ) return list;

    list = $("<ul>").attr( "id", "tlEditor-feedback-topInfo" ).addClass( "mdb-element" );

    // the close button and the rows chip float right and belong at the top of the box; ours
    // and the API's chips are .mdb-element - what is left is the message the list goes above
    var message = box.children().not( "#tlEditor-feedback-close, #tlEditor-feedback-rows, .mdb-element" ).first();

    if( message.length ) message.before( list ); else box.append( list );

    return list;
}

/*
 * The API call counter
 *
 * Every Tracklist Editor request this page has made, printed as a chip in the feedback box
 * next to the API's own "N rows". The box asks on its own now - on every typing pause, on
 * Enter, on a click into it, on blur, on "Create" - and a number on screen is the honest way
 * to see what that actually costs, rather than trusting that the guards hold.
 *
 * Counted where the requests are made, so nothing can be missed: both apiTracklist() and
 * apiTracklistAsync() report here, whoever called them and for whatever type.
 *
 * A class, not an id: a page can hold several tracklist boxes (Player Checker lists one per
 * player), and each of their feedback boxes shows the same page-wide number.
 */
var tlApiCalls = 0;

// tlApiCountCall
function tlApiCountCall( type ) {
    tlApiCalls++;
    log( "Tracklist Editor API call #" + tlApiCalls + " (type: " + ( type || "(none)" ) + ")" );
    tlBoxShowApiCount();
}

// tlBoxShowApiCount
// Puts our two chips into every feedback box on the page - the call counter and the switch
// that decides whether the box checks while typing - or refreshes the ones already there.
// Inserted AFTER the rows chip, which puts them visually in FRONT of it: they all float right,
// so the later element sits further left. Called after every feedback render (the box is
// rebuilt from the API's HTML each time) and after every counted call.
function tlBoxShowApiCount() {
    var count = tlApiCalls + ( tlApiCalls === 1 ? " API call" : " API calls" ),
        on = tlBoxAutoUpdate();

    $("#tlEditor-feedback").each(function() {
        var feedbackBox = $(this),
            rows = feedbackBox.find( "#tlEditor-feedback-rows" ),
            countChip = feedbackBox.find( ".mdb-tlEditor-apiCalls" ),
            autoChip = feedbackBox.find( ".mdb-tlEditor-liveUpdates" );

        if( !countChip.length ) {
            countChip = $("<div>")
                .addClass( "mdb-tlEditor-apiCalls mdb-element floatR" )
                .attr( "title", "Tracklist Editor API calls made on this page.\nThe box always asks when it loses focus after an edit and on \"Create\" - and never twice about the same text." );

            if( rows.length ) rows.after( countChip ); else feedbackBox.prepend( countChip );
        }

        countChip.text( count );

        if( !autoChip.length ) {
            // A real switch, not a word that changes: the state has to be readable at a
            // glance from across the box, and a knob left/right says "off/on" without being
            // read at all. The label stays put so the chip does not change width when it is
            // flipped - a chip that resizes under the pointer invites a second, unwanted click.
            autoChip = $("<div>")
                .addClass( "mdb-tlEditor-liveUpdates mdb-element floatR hand" )
                .append(
                    $("<span>").addClass( "mdb-tlEditor-liveUpdates-label" ).text( "Live updates" ),
                    $("<span>").addClass( "mdb-tlEditor-switch" ).append(
                        $("<span>").addClass( "mdb-tlEditor-switch-knob" )
                    )
                )
                .on( "click", function() {
                    var nowOn = !tlBoxAutoUpdate();

                    tlBoxSetAutoUpdate( nowOn );
                    tlBoxShowApiCount();

                    $("textarea[data-mdb-tlbox-live]").each(function() {
                        var box = $(this);

                        // "No changes were made." belongs to one state and not to the other
                        // (see tlBoxCleanFeedbackHtml), so the answer on screen is re-rendered
                        // from the markup it was built from - no request, and the line appears
                        // or disappears with the click rather than at the next update.
                        var shown = box.nextAll( "#tlEditor-feedback" ).first().data( "mdbFeedbackHtml" );

                        if( shown ) tlBoxSetFeedbackHtml( box, String( shown ).replace( /^(live|static):/, "" ) );

                        // Switched on with something already typed: check it now rather than
                        // waiting for the next keystroke - the click asked for an answer. Costs
                        // nothing when the text is the one the feedback already describes.
                        if( nowOn ) tlBoxTypeUpdate( box );
                    });
                });

            countChip.after( autoChip );
        }

        autoChip
            .toggleClass( "mdb-tlEditor-liveUpdates-on", on )
            .attr( "title", on
                ? "Live updates are ON: after a typing pause - and at once on Enter or a click in the box - the tracklist is checked, this feedback follows it and every line except the one you are typing on is formatted.\nClick to switch off."
                : "Live updates are OFF: the box is only checked and formatted when you leave it or click \"Create\".\nClick to switch on - useful while writing a tracklist out, at one API call per typing pause." );
    });
}

// tlBoxClearFeedback
// An emptied box: whatever the feedback said, it was about text that is gone.
function tlBoxClearFeedback( tl ) {
    tl.nextAll( "#tlEditor-feedback" ).remove();
    tl.closest( "#tlEditor, .tlEditor" ).removeClass( tlEditorFeedbackClasses );
}

/*
 * The live check switch
 *
 * OFF by default, and deliberately so: checking while typing means a request per typing pause
 * and a box that judges half-written lines - a line missing its artist IS a warning until it
 * is finished, so the feedback goes red mid-line and back on the next word. Useful when
 * writing a tracklist out by hand, noise when fixing one cue in a finished one. The reader
 * decides, per site, by clicking the chip in the feedback box.
 *
 * localStorage, so the choice survives a reload: per site, since that is what localStorage is
 * (switching it on for TrackId.net leaves SoundCloud alone), and in a try/catch, since a
 * browser with storage blocked must not take the box down with it. window.mdbTlBoxAutoUpdate
 * in a site script sets the default for a site whose reader has not chosen yet.
 */
var tlBoxAutoUpdateKey = "mdb-tlBox-autoUpdate";

// tlBoxAutoUpdate
function tlBoxAutoUpdate() {
    try {
        var stored = localStorage.getItem( tlBoxAutoUpdateKey );

        if( stored !== null ) return stored === "1";
    } catch( e ) {
        log( "tlBoxAutoUpdate: localStorage is not readable (" + e.message + ") - taking the default." );
    }

    return window.mdbTlBoxAutoUpdate === true;
}

// tlBoxSetAutoUpdate
function tlBoxSetAutoUpdate( on ) {
    try {
        localStorage.setItem( tlBoxAutoUpdateKey, on ? "1" : "0" );
    } catch( e ) {
        log( "tlBoxSetAutoUpdate: could not remember the choice (" + e.message + ") - it holds for this page only." );
    }

    log( "tlBoxSetAutoUpdate: checking while typing is now " + ( on ? "ON" : "OFF" ) + "." );
}

// tlBoxTypeUpdate
// The debounced live check behind the input handler above. No grey animation - the reader is
// typing, and a box that keeps flashing under the caret is noise, not feedback.
function tlBoxTypeUpdate( tl ) {
    // read at call time, not at binding time - the switch may be flipped mid-edit
    if( !tlBoxAutoUpdate() ) return;

    var sent = tl.val();

    if( $.trim( sent ) === "" ) {
        tlBoxClearFeedback( tl );
        return;
    }

    // matches the last formatted state, or the last text already asked about - the feedback
    // on the page answers this very text, nothing to ask
    if( sent === tl.data( "mdbTlboxKnown" ) || sent === tl.data( "mdbTlboxTypeAsked" ) ) return;

    tl.data( "mdbTlboxTypeAsked", sent );

    apiTracklistAsync( sent, "standard", "", function( res ) {
        // typed on while the API was thinking - the next pause asks about the newer text
        if( tl.val() !== sent ) return;

        if( !res || !res.feedback ) {
            // forget the ask, so the next pause on the same text retries instead of
            // remembering a failure as answered
            tl.removeData( "mdbTlboxTypeAsked" );
            return;
        }

        tlBoxRenderFeedback( tl, res.feedback );

        // the formatted text, caret and all - see tlBoxApplyWhileTyping. Its answer is
        // whether the box now HOLDS that text, which is exactly what decides whether the page
        // creator may treat the tracklist as validated: if the write was skipped (composing,
        // typed on since), the blur pass still owes it the formatting.
        var applied = tlBoxApplyWhileTyping( tl, sent, res );

        if( typeof mdbPageCreator_tracklistBoxUpdated === "function" ) {
            mdbPageCreator_tracklistBoxUpdated( tl, res, applied );
        }
    });
}

/*
 * tlBoxRemapOffset
 *
 * Where a caret offset in oldText lands in newText. The standard trick input-formatting code
 * uses (and the only honest one, since the formatter rewrites exactly the characters an offset
 * is counted in): find how much of the two texts is identical at the FRONT and at the BACK,
 * and place the caret relative to whichever side it sits on.
 *
 *   before the changed part -> the offset is still valid, keep it
 *   after it                -> keep the distance to the END of the text
 *   inside it               -> the end of the changed part, which is where the words the
 *                              caret was in have gone
 *
 * "01. Artist - Title" -> "Artist - Title" with the caret at the end is the everyday case: the
 * common tail is the whole title, the caret keeps its distance to the end, and it stays where
 * the typing left it.
 */
function tlBoxRemapOffset( oldText, newText, offset ) {
    var max = Math.min( oldText.length, newText.length ),
        prefix = 0,
        suffix = 0;

    while( prefix < max && oldText.charAt( prefix ) === newText.charAt( prefix ) ) prefix++;

    // the suffix may not reach back into the prefix - the two have to stay disjoint
    var maxSuffix = Math.min( oldText.length - prefix, newText.length - prefix );

    while( suffix < maxSuffix
           && oldText.charAt( oldText.length - 1 - suffix ) === newText.charAt( newText.length - 1 - suffix ) ) suffix++;

    var mapped;

    if( offset <= prefix ) {
        mapped = offset;
    } else if( offset >= oldText.length - suffix ) {
        mapped = newText.length - ( oldText.length - offset );
    } else {
        mapped = newText.length - suffix;
    }

    return Math.max( 0, Math.min( newText.length, mapped ) );
}

/*
 * tlBoxApplyWhileTyping
 *
 * Formatting the box WHILE it is being typed in - every line of it, the one under the caret
 * included - and putting the caret back where the reader would expect it.
 *
 * The caret is mapped LINE-WISE whenever the formatter left the line count alone, which is
 * nearly always: the caret's line keeps its index, and the column is mapped inside that line
 * only (tlBoxRemapOffset). That way a line elsewhere in the tracklist losing its "01. " cannot
 * drag the caret along - the offsets of everything in front of it change, its line index does
 * not. Only when lines were merged or dropped is the whole text mapped in one go.
 *
 * After this the box holds exactly what the API returned, so mdbTlboxKnown is refreshed: the
 * blur pass has nothing left to do and stays quiet, which is one request saved per edit.
 */
function tlBoxApplyWhileTyping( tl, sent, res ) {
    var el = tl.get( 0 );

    if( !res.text ) return false;
    if( !el || typeof el.selectionStart !== "number" ) return false;

    // typed on since the request went out - this answer describes text that is gone
    if( tl.val() !== sent ) return false;

    // mid-composition (IME, dead keys for accents): replacing the value now would tear the
    // half-composed characters out from under the input method
    if( tl.data( "mdbTlboxComposing" ) ) return false;

    // The caret sits on an EMPTY line - the reader just hit Enter and is about to type the
    // next track into it. An empty line is not a track, so the formatter drops it, and
    // applying that here would delete the row out from under them the instant they opened it.
    // The feedback still updates; the text waits for the first word typed on that line.
    if( $.trim( tlBoxCaretLine( sent, el.selectionStart ) ) === "" ) return false;

    // already formatted - nothing to write, but the box DOES hold the API's own text, so the
    // blur pass can be spared the round trip and the caller may treat it as applied
    if( res.text === sent ) {
        tl.data( "mdbTlboxKnown", sent );
        return true;
    }

    var start = el.selectionStart,
        end = el.selectionEnd,
        oldLines = sent.split( "\n" ),
        newLines = res.text.split( "\n" ),
        newStart, newEnd;

    if( oldLines.length === newLines.length ) {
        newStart = tlBoxLineWiseOffset( oldLines, newLines, start );
        newEnd = ( end === start ) ? newStart : tlBoxLineWiseOffset( oldLines, newLines, end );
    } else {
        newStart = tlBoxRemapOffset( sent, res.text, start );
        newEnd = ( end === start ) ? newStart : tlBoxRemapOffset( sent, res.text, end );
    }

    tl.val( res.text );
    tl.attr( "rows", newLines.length );
    el.setSelectionRange( newStart, Math.max( newStart, newEnd ) );

    // The box now holds the API's own text: the next blur has nothing to format, and the
    // typing memo has to name THIS text rather than the one it replaced - otherwise typing the
    // stripped numbering back in would land on the old memo and be waved through unformatted.
    tl.data( "mdbTlboxKnown", res.text );
    tl.data( "mdbTlboxTypeAsked", res.text );

    log( "tlBoxApplyWhileTyping: formatted while typing, caret " + start + " -> " + newStart + "." );

    return true;
}

// tlBoxCaretLine
// The one line an offset sits on, without its newlines.
function tlBoxCaretLine( text, offset ) {
    var start = text.lastIndexOf( "\n", offset - 1 ) + 1,
        end = text.indexOf( "\n", offset );

    return text.slice( start, end === -1 ? text.length : end );
}

// tlBoxLineWiseOffset
// The caret's line keeps its index; only its column is mapped, inside that one line. Used
// whenever the formatter did not change the number of lines.
function tlBoxLineWiseOffset( oldLines, newLines, offset ) {
    var pos = 0,
        line = oldLines.length - 1,
        col = 0,
        i;

    for( i = 0; i < oldLines.length; i++ ) {
        // <= : an offset at the very end of a line belongs to that line, not to the next
        if( offset <= pos + oldLines[i].length ) {
            line = i;
            col = offset - pos;
            break;
        }

        pos += oldLines[i].length + 1; // + the "\n"
    }

    var out = 0;

    for( i = 0; i < line; i++ ) {
        out += newLines[i].length + 1;
    }

    return out + tlBoxRemapOffset( oldLines[line], newLines[line], col );
}

// tlBoxApplyResult
// Writes an API answer into a box: text, size, colour, printed feedback. Bumps the request
// sequence first, so a blur update still in flight for this box finds itself outdated and
// drops its answer instead of overwriting this newer one. The one place both appliers share -
// the blur update below and the page creator's way into its "Create" click, which must not
// outrun the box (mdbPageCreator_validateTracklist).
function tlBoxApplyResult( tl, res ) {
    if( !res || !res.text ) return false;

    tl.data( "mdbTlboxSeq", ( tl.data( "mdbTlboxSeq" ) || 0 ) + 1 );
    tl.removeClass( "mdb-tlBox-updating" );

    // The typing check's memo is about the text this is replacing. Kept, it would swallow the
    // check on a reader who edits back to that exact version, leaving the feedback of THIS
    // answer standing over text it does not describe.
    tl.removeData( "mdbTlboxTypeAsked" );

    tl.val( res.text );

    // re-sizes, re-colours, replaces the printed feedback - and refreshes mdbTlboxKnown to
    // the text as the API returned it, so the next blur stays quiet
    fixTLbox( res.feedback, tl.get( 0 ), false );

    return true;
}

// tlBoxBlurUpdate
function tlBoxBlurUpdate( tl ) {
    var sent = tl.val();

    // unchanged since the API last saw it - a blur that merely moves the focus must not
    // flash the box grey, let alone cost a request
    if( sent === tl.data( "mdbTlboxKnown" ) ) return;

    // an emptied box is not sent (the API answers an empty body with no JSON) - but the
    // emptiness is remembered, so leaving the empty box again stays quiet too
    if( $.trim( sent ) === "" ) {
        tl.data( "mdbTlboxKnown", sent );
        return;
    }

    log( "tlBoxBlurUpdate: the box was edited - asking the Tracklist Editor API." );

    // Numbered per box: with two quick edit-and-leave rounds the first answer can come home
    // while the second is still out, and it must neither apply nor end the grey state the
    // second round owns.
    var seq = ( tl.data( "mdbTlboxSeq" ) || 0 ) + 1,
        startedAt = Date.now();

    tl.data( "mdbTlboxSeq", seq );
    tl.addClass( "mdb-tlBox-updating" );

    // "standard" whatever type the site first formatted with: what sits IN a box is wiki
    // syntax already, and "standard" is the type that validates that - the same call the
    // page creator makes about this box on the way into its "Create" click.
    apiTracklistAsync( sent, "standard", "", function( res ) {
        var wait = Math.max( 0, tlBoxUpdateMinMs - ( Date.now() - startedAt ) );

        setTimeout(function() {
            // a newer request is out - leave the grey state to it and drop this answer
            if( tl.data( "mdbTlboxSeq" ) !== seq ) {
                log( "tlBoxBlurUpdate: a newer update is running - dropping this answer." );
                return;
            }

            tl.removeClass( "mdb-tlBox-updating" );

            // the box left the page while the API was thinking (SPA navigation removes it) -
            // writing into the detached node would only leak the previous page's verdict into
            // the next one's page creator state
            if( !$.contains( document.documentElement, tl.get( 0 ) ) ) {
                log( "tlBoxBlurUpdate: the box is no longer on the page - dropping the answer." );
                return;
            }

            // the box no longer shows what was sent (the reader went back in and typed, or
            // another script rewrote it) - this answer is about a text that is gone. The next
            // blur asks again.
            if( tl.val() !== sent ) {
                log( "tlBoxBlurUpdate: the box changed while the API was thinking - dropping the answer." );
                return;
            }

            // the reader is back in the box - never rewrite under the caret; mdbTlboxKnown
            // still holds the old text, so the next blur re-asks
            if( tl.is( ":focus" ) ) {
                log( "tlBoxBlurUpdate: the box is focused again - dropping the answer." );
                return;
            }

            if( !res.text ) {
                log( "tlBoxBlurUpdate: no usable answer - keeping the text as typed, the next blur retries." );
                return;
            }

            tlBoxApplyResult( tl, res );

            log( "tlBoxBlurUpdate: box updated (status " + ( res.feedback && res.feedback.status ? res.feedback.status : "(none)" ) + ")." );

            // the page creator reads this box for the page its "Create" link starts - hand it
            // the fresh verdict so the "Tracklist:" category and the reasoning panel follow.
            // typeof-guarded: most site scripts do not load page_creator.js at all.
            if( typeof mdbPageCreator_tracklistBoxUpdated === "function" ) {
                mdbPageCreator_tracklistBoxUpdated( tl, res );
            }
        }, wait );
    });
}

// apiTracklist
// allow site domain in Apache
// allow mixesdb scxripts on site
function apiTracklist( tl, type, genType ) {
    var data = { query: "tracklistEditor",
                 type: type,
                 genType: genType,
                 text: tl
               };

    tlApiCountCall( type );

    var jqXHR = $.ajax({
        type: "POST",
        url: apiUrlTools,
        data: data,
        async: false
    });

    // An empty tracklist answers with an empty body, and an API that is down answers with
    // anything but JSON - both used to throw out of here and take the caller's whole handler
    // with them. Every caller already checks res.text, so give them a res to check.
    try {
        return JSON.parse( jqXHR.responseText );
    } catch( e ) {
        log( "apiTracklist: the API did not answer with JSON (status " + jqXHR.status + "): " + e );
        return { text: "", rows: 0, feedback: null };
    }
}

// apiTracklistAsync
// The same request without freezing the page while the API thinks. apiTracklist() blocks on
// purpose - its callers need the answer before their next line - but the blur update above
// runs when the reader has already moved on to something else on the page, where a locked-up
// tab (and a grey animation that never paints because the thread is busy) is not an option.
// done() always gets a res with a .text to check, exactly like apiTracklist() returns.
function apiTracklistAsync( tl, type, genType, done ) {
    var data = { query: "tracklistEditor",
                 type: type,
                 genType: genType,
                 text: tl
               };

    tlApiCountCall( type );

    $.ajax({
        type: "POST",
        url: apiUrlTools,
        data: data
    }).done(function( response, textStatus, jqXHR ) {
        try {
            done( JSON.parse( jqXHR.responseText ) );
        } catch( e ) {
            log( "apiTracklistAsync: the API did not answer with JSON (status " + jqXHR.status + "): " + e );
            done( { text: "", rows: 0, feedback: null } );
        }
    }).fail(function( jqXHR ) {
        log( "apiTracklistAsync: the request failed (status " + jqXHR.status + ")." );
        done( { text: "", rows: 0, feedback: null } );
    });
}

/*
 * getTracklistArray
 * split text tracklist into an array
 * "from" not used yet
 */
function getTracklistArr( tl, from="", cues="" ) {
    var tlArr = [],
        rows = tl.trim().split("\n"),
        cue_sum = 0;
    //logVar( "rows", rows );

    $.each( rows, function( index, row ) {
        var cue = "",
            dur = "", /* sum up dur of before track durs */
            artistSong = "",
            label = "",
            isGap = "false";
        //logVar( "row", row );
        logVar( "index", index );

        if( row ) {
            // gap
            if( row.match( /^\s*\.{3}\s*$/g ) ) {
                isGap = "true";
            }

            // cue
            if( row.match( /^\[/g ) ) {
                var timePrefix = row.replace( /(\[)(.+)(\] .+)$/g, "$2" );

                if( cues == "track duration" ) {
                    dur = timePrefix;

                    if( index > 0 ) { // first track has no previous track dur to add (cue will be 00 or 000)
                        var index_prev = index - 1,
                        dur_previousRow = rows[index_prev].replace( /(\[)(.+)(\] .+)$/g, "$2" );

                        cue_sum = cue_sum + durToSec_MS( dur_previousRow );
                    }
                } else {
                    cue = timePrefix;
                }
            }

            // artistSong
            if( row.match( /^(\[[\d:]+\] )?.+ - .+$/g ) ) {
                artistSong = row.replace( /^(\[[\d:]+\] )?(.+ - .+)(\[.+\])?$$/, "$2" );
            }

            // label
            if( row.match( /^.+ - .+ \[.+\]$/g ) ) {
                label = row.replace( /^(.+ - .+ \[)(.+)(\])$$/, "$2" );
            }

            // trackObj
            const trackObj = {
                "id" : index + 1,
                "isGap" : isGap,
                "cue" : cue,
                "cue_sum" : cue_sum,
                "cue_sum_hms" : convertHMS( cue_sum ),
                "dur" : dur,
                "artistSong" : artistSong,
                "label" : label
            };

            tlArr.push( JSON.stringify(trackObj) );

        } else {
            log( "Failed to split tl into rows." );
        }
    });

    return tlArr;
}

/*
 * makeTracklistFromArr
 * takes the array from getTracklistArr()
 * outputs text tl, which should be passed to TLE API ("Standard")
 */
function makeTracklistFromArr( tlArr, from="", cues="" ) {
    var tl = "",
        cue_sum_lastTrack = $.parseJSON( tlArr[tlArr.length-1] ).cue_sum,
        cue_sum_lastTrack_rounded = roundSecsToCueMin( cue_sum_lastTrack );
    //logVar( "cue_sum_lastTrack_rounded", cue_sum_lastTrack_rounded )

    // build tl
    $.each( tlArr, function( index, trackArr ) {
        var track = $.parseJSON( trackArr ),
            id = track.id,
            isGap = track.isGap,
            cue = track.cue,
            cue_sum_rounded = roundSecsToCueMin( track.cue_sum ),
            cue_sum_hms = track.cue_sum_hms,
            dur = track.dur,
            artistSong = track.artistSong,
            label = track.label;

        if( from == "Apple Music" ) {
            if( cues == "track duration" ) {
                var padTo = 2;

                if(cue_sum_lastTrack_rounded > 99 ) {
                    padTo = 3;
                }

                cue = pad( cue_sum_rounded, padTo );

                // TODO check if every track has a cue (disabled tracks in album have none)

            } else {
                if ( cues == "track duration control" ) {
                    cue = cue_sum_hms;
                    label = dur;
                }
            }
        }

        // build tl
        if( cue !== "" && cues != "allTracksHaveDurs-not" ) {
            tl += "["+cue+"] ";
        }

        tl += artistSong;

        if( label !== "" ) {
            tl += " ["+label+"]";
        }

        tl += "\n";
    });

    return tl;
}

/*
 * stripCountryCodes
 * Matches: optional surrounding spaces + [( or [] + 2 or 3 uppercase letters + )] or ] + optional trailing spaces
 * Example matches: " (US) ", "[DE]", " (FR)", " [BE] "
 * https://trackid.net/audiostreams/purified-469
 * https://trackid.net/audiostreams/transmissions-606-with-francesco-parente
 */
const CC_BRACKETS = /\s*[\(\[]\s*[A-Z]{2,3}\s*[\)\]]\s*/g;
function stripCountryCodes(str) {
    return (str || '')
        .replace(CC_BRACKETS, ' ')        // replace bracket entry with a single space
        .replace(/\s{2,}/g, ' ')          // collapse multiple spaces into one
        .replace(/\s+([,.;:!?])/g, '$1')  // no space before punctuation marks
        .trim();
}

/*
 * removePointlessVersions
 */
function removePointlessVersions( t ) {
    return t
        .replace( / \((Vocal|Main|Radio|Album|Single)\s?(Version|Edit|Mix)?\)/gmi, "" );
}

/*  
 * removeDuplicateBracketedText
 * "Spirits (feat. Max Moya) [Drum Version] (Drum Version)" => "Spirits (feat. Max Moya) (Drum Version)" E.g. https://trackid.net/audiostreams/groove-podcast-451-marie-lung
 * "Spirits (feat. Max Moya) (Drum Version) [Drum Version]" => "Spirits (feat. Max Moya) (Drum Version)"
 * "Spirits (feat. Max Moya) [Drum Version] [Drum Version]" => "Spirits (feat. Max Moya) (Drum Version)"
 * "Spirits (feat. Max Moya) (Drum Version) (Drum Version)" => "Spirits (feat. Max Moya) (Drum Version)"
 * "Silver Ball (Ø [Phase] Remix)" => "Silver Ball (Ø [Phase] Remix)"
 */
function removeDuplicateBracketedText( text ) {
    //logFunc( "removeDuplicateBracketedText" );
    //logVar( "text", text );

    let regex = /([\(\[])([^()\[\]]*)([\)\]])/g;
    let matches = [];
    let match;
    while ( ( match = regex.exec( text ) ) !== null ) {
        matches.push( match );
    }

    let counts = {};
    for ( let m of matches ) {
        let content = m[ 2 ].trim();
        counts[ content ] = ( counts[ content ] || 0 ) + 1;
    }

    let result = text;
    let seen = new Set();
    for ( let i = matches.length - 1; i >= 0; i-- ) {
        let m = matches[ i ];
        let content = m[ 2 ].trim();
        if ( seen.has( content ) ) {
            result = result.slice( 0, m.index ) + result.slice( m.index + m[ 0 ].length );
        } else {
            seen.add( content );
            if ( counts[ content ] > 1 && m[ 1 ] !== '(' ) {
                result = result.slice( 0, m.index ) + '(' + content + ')' + result.slice( m.index + m[ 0 ].length );
            }
        }
    }

    return result.replace(/\s+/g, ' ').trim(); // Remove extra spaces
}

/*
 * removeDuplicatedVersionArtist
 * "Strafe & Justin Martin - Set It Off (Justin Martin Remix)" => "Strafe - Set It Off (Justin Martin Remix)"
 * https://trackid.net/audiostreams/baby-prince-robot-heart-burning-man-2025
 */
String.prototype.removeDuplicatedVersionArtist = function() {
  return this.replace(
    /^(.+?)\s*(?:&|vs\.|,)\s*([^ -]+.*?)\s*-\s*(.+\(\2[^)]*\))/i,
    '$1 - $3'
  );
};


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist array functions
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
 * make_tlArr
 */
function make_tlArr( tl ) {
    tl = tl.replace(/''/g, ""); // ''Hitam - ? [Unreleased]'' > Hitam - ? [Unreleased]
    
    var lines = tl.split('\n');
    var result = [];

    lines.forEach(function (line) {
        line = line.trim();

        // Skip empty lines
        if (line === '') return;

        // Handle "..." as gap
        if (line === "...") {
            result.push({ type: "gap" });
            return;
        }

        var row = { type: "track" };

        // Remove leading "#" or similar
        line = line.replace(/^#\s*/, '');

        // Optional cue [00] at the start
        var cueMatch = line.match(/^\[((?:\d|X|\?)+(?::(?:\d|X|\?){1,2}){0,2})\]/i);
        if (cueMatch) {
            row.cue = cueMatch[1];
            line = line.replace(/^\[((?:\d|X|\?)+(?::(?:\d|X|\?){1,2}){0,2})\]\s*/i, '');
        }

        // Add trackText
        // but remove optional label at the end
        var labelMatch = line.match(/\[(.*?)\]$/);
        if (labelMatch) {
            line = line.replace(/\s*\[.*?\]$/, '');
        }
        row.trackText = line.trim();

        // Add label
        if (labelMatch) {
            row.label = labelMatch[1];
        }

        result.push(row);
    });

    log( JSON.stringify(result) );

    return result;
}

/*
 * addCueDiffs
 */
function addCueDiffs(tl_arr) {
    var previousCue = null;

    $.each(tl_arr, function(index, item) {
        if (item.type === "track") {
            var currentCue = parseInt(item.cue);
            var diff;
            if (previousCue !== null) {
                var previousItem = tl_arr[index - 1];
                if (previousItem && previousItem.type !== "gap") {
                    diff = currentCue - parseInt(previousCue);
                    if (!isNaN(diff)) {
                        item["cue-diff-prev"] = String(diff);
                    }
                }
            }
            previousCue = item.cue;
        }
    });

    return tl_arr;
}

/*
 * tidFixFalseCues
 */
function tidMarkFalseCues(tl_arr, minGap = 3) {
  // Step 1: Mark tracks as "false" if they are placeholders ("?") and their cue gap is too small
  for (let i = 0; i < tl_arr.length; i++) {
    const currentItem = tl_arr[i];
    const nextItem = tl_arr[i + 1];

    // Check for placeholder track
    if (currentItem.type === "track" && currentItem.trackText === "?") {
      const cueDiffPrev = parseInt(currentItem["cue-diff-prev"]);
      const cueDiffNext = nextItem && nextItem["cue-diff-prev"] ? parseInt(nextItem["cue-diff-prev"]) : null;

      // If gap to previous or next item is smaller than minGap, mark as false
      if ((cueDiffPrev < minGap) || (cueDiffNext !== null && cueDiffNext < minGap)) {
        currentItem.type = "track (false)";
      }
    }
  }

  // Step 2: Calculate the new cue difference to the last valid track
  let lastValidCue = null;

  for (let i = 0; i < tl_arr.length; i++) {
    const item = tl_arr[i];

    // Only consider valid tracks
    if (item.type === "track") {
      const currentCue = parseInt(item.cue);

      // If there's a previous valid cue, calculate and store the difference
      if (lastValidCue !== null && !isNaN(currentCue)) {
        item["cue-afterCueFix"] = currentCue - lastValidCue;
      }

      // Update the last valid cue
      lastValidCue = currentCue;
    }
  }

  return tl_arr;
}

/*
 * removeAdjacentDuplicateTracks
 * Remove tracks that directly repeat the previous track
 */
function removeAdjacentDuplicateTracks(tl_arr) {
  let previousKey = null;
  const result = [];

  tl_arr.forEach(item => {
    if (item.type === "track") {
      const key = `${item.trackText}||${item.label || ""}`;
      if (key !== previousKey) {
        result.push(item);
        previousKey = key;
      }
    } else {
      previousKey = null;
      result.push(item);
    }
  });

  return result;
}

/*
 * arr_toTlText
 */
function arr_toTlText( tl_arr ) {
  return tl_arr.map(item => {
    // Ignore "track (false)" items
    if (item.type === "track (false)") {
      return null;
    }

    if (item.type && item.type.startsWith("track")) {
      let line = "";

      if (item.cue) {
        line += `[${item.cue}] `;
      }

      line += item.trackText || "";

      if (item.label) {
        line += ` [${item.label}]`;
      }

      return line;
    } else if (item.type === "gap") {
      return "...";
    }
  }).filter(line => line !== null).join("\n"); // Filter out null-values
}
