log( "/shared/mixesdb_modal/funcs.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The MixesDB modal
 *
 * A MixesDB page framed in an overlay ON the page the reader is working on - for the
 * five-second look ("is this the right category?", "does this page already exist?") that is
 * not worth a tab. Grown out of the Page Creator's "Used categories" chips and moved here
 * because the toolkit's usage links open it too, on sites that load no Page Creator at all.
 *
 * Three things open it:
 *
 * - the Page Creator's category chips intercept the plain left click on a desktop-wide
 *   window (their own delegated handler in page_creator.js)
 * - the eye icon the toolkit renders behind a "used" mix page link - built by
 *   mdbModal_eyeLink() below, clicks handled down here
 * - the same eye behind the TrackId.net links under the players on mixesdb.com
 *   (TrackId.net/script.user.js), which is the one place where the framed page is NOT a
 *   MixesDB page: on the wiki itself a MixesDB page in a popup would be pointless, and the
 *   look worth having is the one at TrackId.net. Nothing in here is about MixesDB other than
 *   the name - the framed URL is whatever the opener hands over, and the header's way out is
 *   named after the site it leads to (mdbModal_extLabel).
 *
 * Everything that ASKS for a tab still gets one: cmd/ctrl/shift/alt and middle clicks fall
 * through to the links' own href/target (they stay real links), and so does a narrow window,
 * where the framed page would be smaller than a tab. MixesDB sends no X-Frame-Options and no
 * site's CSP forbids the frame (verified 2026-08-18); the header's "Open on MixesDB" link is
 * the way out where a quick look turns into real reading.
 *
 * Once it is open the arrow keys walk the page's MixesDB links: left/right frames the
 * previous/next link that is on screen right now. Which links those are is the FEATURES'
 * knowledge, not this file's - each one pushes a provider function into the plain-array
 * global window.mdbModal_linkProviders (created by whichever file gets there first, so the
 * @require order of this file and its callers cannot matter), and mdbModal_links() merges
 * what they return into one document-ordered line. The header counts the steps ("3 / 12")
 * and carries the same two arrows as buttons. The walk is a RING: one step past the last
 * link is the first one again, and one step back from the first is the last (mdbModal_step).
 *
 * What makes a step fast is that the pages STAY: every page visited keeps its own iframe,
 * hidden behind the one on screen, and the two neighbours of the page being read load into
 * theirs while it is read (mdbModal_frame). A step is then a visibility swap on a document
 * that is already parsed - nothing is fetched, nothing is rendered again, and going back
 * through the walk costs nothing at all.
 *
 * This replaced <link rel="prefetch">, which measured useless here: MixesDB answers every
 * page with "Cache-Control: private, must-revalidate, max-age=0", so prefetched bytes may not
 * be reused without asking the server again - and the wait is the ASKING (~0.7-0.9s of server
 * render on an uncached wiki), not the transfer. Prefetching a page whose bytes have to be
 * revalidated buys nothing and costs MixesDB the render.
 *
 * The overlay does not necessarily belong to the document this file runs in: where the site
 * renders its pages into a same-origin frame - SoundCloud has done exactly that since the
 * ~Aug 2026 redesign - it is hung into the TOP document instead (mdbModal_doc).
 * position:fixed is fixed to the FRAME's viewport, so an overlay built down here dimmed and
 * blurred the framed page and stopped at its edge: the site's own menu bar stood above it
 * sharp and clickable, which read as the modal being a part of the page rather than something
 * lying on top of the window. Same reasoning as the "_top" on every link we add.
 *
 * The CSS (mixesdb_modal.css) is loaded by THIS file, lazily - see mdbModal_ensureCss().
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var mdbModal_minWidth = 1024,
    // How many loaded MixesDB pages the open modal keeps alive at once. Enough for a page,
    // its two neighbours and a few steps of history behind them; every one of them is a full
    // document with its own layout, so this is the memory the feature is allowed to hold.
    mdbModal_frameMax = 7,
    // The frames the modal is holding, most recently shown FIRST: { url: ..., node: <iframe> }.
    // A list rather than the DOM's own order, because moving an iframe in the DOM reloads it -
    // the nodes are appended once and never touched again, and recency lives here.
    mdbModal_frames = [],
    // the URL the modal frames right now - where the arrow keys count from. Not an index:
    // see mdbModal_index.
    mdbModal_url = null,
    // The open overlay, kept as a NODE: it may hang in another document than the one this
    // script runs in (mdbModal_doc), where $("#mdb-modal") - which only ever searches this
    // one - finds nothing.
    mdbModal_node = null,
    // whether mdbModal_ensureCss() already fired - one fetch per page, however often asked
    mdbModal_cssRequested = false;

// How much of the box has to stay inside the window when it is dragged out of it, in px.
// The point of dragging is being able to push the modal aside to read what is under it, so it
// is allowed far out - but never so far that the header it is grabbed by is gone, which would
// leave no way of pulling it back.
var mdbModal_dragKeep = 140,
    // Where the box sits relative to its centred place, in px - a transform, not a position,
    // so the flex centring stays the resting state and 0/0 is always "as opened". Kept per
    // modal: mdbModal_close() puts it back to 0.
    mdbModal_dragX = 0,
    mdbModal_dragY = 0,
    // the running drag, or null - see mdbModal_dragStart for what it holds
    mdbModal_drag = null,
    // until when a click on the backdrop is ignored, as a timestamp. A drag whose pointer is
    // released over the backdrop can end in a click on the OVERLAY - which closes the modal -
    // wherever setPointerCapture() was not available to retarget the gesture onto the header.
    mdbModal_dragUntil = 0;

// The walk's link providers - one function per feature that has MixesDB links worth walking
// (the Page Creator's chip rows, the toolkit's usage links), each returning its CURRENT
// links as an array of nodes. A plain global array rather than a register function so the
// @require order cannot matter: whoever runs first creates it, everybody else appends.
window.mdbModal_linkProviders = window.mdbModal_linkProviders || [];

/*
 * mdbModal_cssCacheParam
 * The "?v-<script>_<n>" every other CSS file we load carries, built like
 * tlBoxCssCacheParam() in tracklist_editor/funcs.js and for the same reason: without it this
 * file's CSS reaches the browser on its OWN schedule, and a pushed CSS change turns up next
 * to a cached older JS. Both globals are read through typeof - a site script that declares
 * neither still gets the bare URL.
 */
function mdbModal_cssCacheParam() {
    var name = typeof scriptName !== "undefined" ? scriptName : "",
        version = typeof cacheVersion !== "undefined" ? cacheVersion : "";

    if( name === "" && version === "" ) return "";

    return "?v-" + name + ( name !== "" && version !== "" ? "_" : "" ) + version;
}

/*
 * mdbModal_ensureCss
 * Loads mixesdb_modal.css into the document this script runs in, once. Lazy on purpose,
 * like the tracklist editor's own CSS: an @require'd file runs before the site scripts'
 * frame opt-outs, so loading at file load time would fetch CSS into every foreign frame
 * SoundCloud embeds. Called where the modal becomes POSSIBLE - the eye icon being built,
 * the Page Creator's row being added - so the very first open is already styled, and again
 * from mdbModal_open() as the safety net.
 */
function mdbModal_ensureCss() {
    if( mdbModal_cssRequested ) return;

    mdbModal_cssRequested = true;

    loadRawCss( "https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/mixesdb_modal/mixesdb_modal.css" + mdbModal_cssCacheParam() );
}

/*
 * mdbModal_eyeLink
 * The opener a feature renders next to a MixesDB link: a small mono blue eye that frames the
 * page in the modal on a plain left click. Returned as an HTML string because the toolkit
 * builds its rows as strings. It is a REAL link to the same page - target="_blank" like the
 * Page Creator's chips, since the look it serves is a side trip taken while working on THIS
 * page - so every modifier click, the context menu and a narrow window (where the delegated
 * handler below stands aside) all behave like any other link.
 *
 * extraClass is for a caller whose surroundings need one on the eye itself: the TrackId.net
 * links on mixesdb.com sit inside a .playerWrapper, where MediaWiki:Common.css stretches
 * every element to width:100% unless it carries "fixedWidth".
 */
function mdbModal_eyeLink( url, extraClass ) {
    // the CSS styles the eye itself, so it is needed the moment one is rendered
    mdbModal_ensureCss();

    return '<a href="' + url + '" class="mdb-modalEye' + ( extraClass ? ' ' + extraClass : '' ) + '" target="_blank" title="Preview this page in a popup right here - every other click opens it as usual">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' +
        '</a>';
}

// The eye's click. Bound once, on the document, so it survives every rebuild of the rows the
// eyes sit in; the width is tested INSIDE the handler because the window resizes. Below the
// width the eye stays the plain link it is.
$(document).on( "click", "a.mdb-modalEye[href]", function( e ) {
    if( e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.which !== 1 ) return;
    if( $(window).width() < mdbModal_minWidth ) return;

    e.preventDefault();
    mdbModal_open( this.href );
});

// mdbModal_doc
// The document the overlay is hung into: the TOP one wherever it can be reached, this one
// everywhere else. A same-origin frame is the case this exists for - see the section comment.
// Reading a property of a cross-origin top document throws, and a page of ours framed on some
// other site is none of our business anyway: the local document is the answer there.
function mdbModal_doc() {
    if( window.top === window.self ) return document;

    try {
        if( window.top.document.body ) return window.top.document;
    } catch( e ) {
        logVar( "mdbModal_doc", "top document not reachable (" + e + ") - staying in this frame" );
    }

    return document;
}

// mdbModal_cssText
// The stylesheet of ours that carries the modal's rules, as text, in whichever document is
// asked - "" where that document has none.
// Found by what it CONTAINS rather than by a marker attribute loadRawCss() would have to put
// on it: mixesdb_modal.css is the only stylesheet on the page that names the modal, and
// asking for the rules themselves keeps this working with whatever cached global.js the
// user's manager still holds.
function mdbModal_cssText( doc ) {
    var css = "";

    $( doc ).find( "style" ).each(function() {
        if( this.textContent.indexOf( "#mdb-modal" ) > -1 ) css = this.textContent;
    });

    return css;
}

// mdbModal_css
// Makes sure the modal's rules exist in the document it is about to be hung in. loadRawCss()
// (global.js) puts every stylesheet into the document the script RUNS in, and a rule in the
// frame's head says nothing about a node in the top one - the modal would open up there as a
// stack of unstyled divs.
//
// Usually nothing to do: a site script that runs in the frame runs in the top document as
// well (SoundCloud does) and has loaded the file there itself. The copy is for the case where
// it has not - and it copies mixesdb_modal.css whole, which changes nothing about the site's
// page: every rule in that file needs one of our own ids or classes to fire.
//
// false where the file is nowhere to be found yet - the caller then stays in this frame,
// which is styled either way.
function mdbModal_css( doc ) {
    var css, style;

    if( doc === document ) return true;                 // where we already are
    if( mdbModal_cssText( doc ) ) return true;          // the site script got there first

    css = mdbModal_cssText( document );

    if( !css ) return false;

    // built in the TARGET document - and filled by textContent rather than innerHTML, like
    // loadRawCss() itself, so Trusted Types has nothing to block. The id marks it as ours for
    // the shared navigation cleanup, which may take it down again; the next open re-copies it.
    style = doc.createElement( "style" );
    style.id = "mdb-modal-css";
    style.textContent = css;
    doc.head.appendChild( style );

    logVar( "mdbModal_css: mixesdb_modal.css copied into the top document, chars", css.length );

    return true;
}

// mdbModal_mount
// Where the next overlay goes: the top document where it is reachable AND our CSS could be
// put there, this document otherwise. Both answers are a working modal - what differs is only
// how far the blur reaches.
function mdbModal_mount() {
    var doc = mdbModal_doc();

    if( doc !== document && !mdbModal_css( doc ) ) {
        log( "mdbModal_mount: our CSS is not on the page yet - opening in this frame instead of the top document." );
        return document;
    }

    return doc;
}

// mdbModal_overlay
// The open overlay, or nothing. Asked of the kept node and its isConnected rather than by id:
// the overlay may be in the top document, which $("#...") cannot see - and it can go without
// mdbModal_close() ever running (the shared navigation cleanup removes .mdb-element /
// [id^="mdb"] wholesale), which "is it still on a page?" has to keep catching.
function mdbModal_overlay() {
    return $( mdbModal_node && mdbModal_node.isConnected ? mdbModal_node : [] );
}

// mdbModal_open
// One modal at a time - opening replaces whatever is up. The overlay is class mdb-element, so
// the shared navigation cleanup (onUrlChange in global.js) takes it down with the rest of our
// elements wherever it hangs in this document; where it hangs in the top one, the Page
// Creator's reset for a new page is what closes it (mdbPageCreator_resetForNewPage).
// The frame and the header's link are filled by mdbModal_show, which is also what every
// arrow key runs afterwards - opening is just the first step of the walk.
function mdbModal_open( url ) {
    logVar( "mdbModal_open", url );

    // the safety net for an opener that skipped the render-time ensure
    mdbModal_ensureCss();

    mdbModal_close();

    var doc = mdbModal_mount();

    logVar( "mdbModal_open mounts in", doc === document ? "this document" : "the top document" );

    // Two userscripts of ours run on mixesdb.com/w/* (TrackId.net and 1001 Tracklists), each
    // in its own sandbox with its own copy of this file - so ONE click on an eye reaches two
    // delegated handlers and used to build two overlays, one behind the other, each loading
    // the framed page again. They share the DOM though, so the overlay that is already there
    // is what tells them apart: mdbModal_close() above has just taken OURS off the page, and
    // anything still answering to the id belongs to the other instance, which got here first.
    // It is a complete modal with its own keys and its own close - the second instance has
    // nothing to add and stands down.
    if( $( doc ).find( "#mdb-modal" ).length ) {
        log( "mdbModal_open: another userscript instance already has a modal open on this page - standing down." );
        return;
    }

    var overlay = $("<div>")
        .attr( "id", "mdb-modal" )
        .addClass( "mdb-element" )
        .on( "click", function( e ) {
            // the click a just-finished drag can leave behind is not a click beside the box
            if( Date.now() < mdbModal_dragUntil ) return;

            // the dark backdrop closes, the box does not - e.target tells them apart
            if( e.target === this ) mdbModal_close();
        });

    overlay.append(
        // tabindex so the box itself can hold the focus: the framed page is cross-origin, and
        // a focused iframe eats the arrow keys before the document ever sees them
        $("<div>").addClass( "mdb-modal-box" ).attr( "tabindex", "-1" ).append(
            // no page name in the header: the framed page carries its own headline, and the
            // arrows are the only thing up here that cannot be read off the page itself
            $("<div>").addClass( "mdb-modal-head" ).append(
                // an empty side that grows exactly like the one holding the buttons - the
                // pair is what centres the arrows on the HEADER instead of on the space
                // left over next to them
                $("<span>").addClass( "mdb-modal-side" ),
                mdbModal_nav(),
                $("<span>").addClass( "mdb-modal-side mdb-modal-side-end" ).append(
                    // no text yet: what this link is called depends on the page framed at
                    // the moment, which mdbModal_show knows (mdbModal_extLabel)
                    $("<a>")
                        .addClass( "mdb-modal-ext" )
                        .attr( "target", "_blank" )
                        .attr( "title", "Open this page as its own tab" ),
                    $("<button>")
                        .addClass( "mdb-modal-close" )
                        .attr( "type", "button" )
                        .attr( "title", "Close (Esc)" )
                        .text( "×" )
                        .on( "click", mdbModal_close )
                )
            ),
            // the stack every visited page keeps its own frame in - one on top, the rest
            // loaded and waiting behind it (mdbModal_frame)
            $("<div>").addClass( "mdb-modal-frames" )
        )
    );

    mdbModal_node = overlay[0];

    // appending into another document adopts the node on the way in - the frames are only
    // created once it is there, so no iframe is ever moved between documents (which reloads it)
    $( doc.body ).append( overlay );

    // the header doubles as the box's handle - see mdbModal_dragStart
    mdbModal_dragBind( overlay );

    mdbModal_show( url );
    mdbModal_bindKeys();
}

/*
 * Dragging the box by its header
 *
 * The modal covers the middle of the window, which is usually exactly where the thing it was
 * opened FROM sits - a category chip, the toolkit's row, the tracklist under it. Being able to
 * shove the box aside and compare the two is why this exists, so the box may be pushed far out
 * of the window; only mdbModal_dragKeep px of it and the whole height of its header have to
 * stay reachable, or there would be nothing left to pull it back by.
 *
 * The first actual movement also clears the backdrop (class mdb-modal-undimmed, the fade is in
 * the CSS): the reader is dragging the box away from something, and a blur over that something
 * defeats the drag. It stays cleared for the rest of the modal's life - going dark again the
 * moment the box is dropped would undo the look the drag was for.
 *
 * Pointer events, not mouse events, and captured on the header: the box is filled with a
 * cross-origin iframe, which eats every mouse event the moment the pointer crosses into it -
 * a drag would end wherever the frame begins. setPointerCapture() keeps the whole gesture on
 * the header no matter what it travels over; where it is not available the document takes the
 * move/up pair instead. The frames are additionally made pointer-transparent while a drag runs
 * (class mdb-modal-dragging), which also keeps the framed page from selecting its own text.
 */

// mdbModal_dragBind
// Hangs the gesture on the header of an overlay that is already on the page. Native
// addEventListener rather than jQuery: the overlay may live in the TOP document, and the
// pointer event's own properties (pointerId above all) are wanted untouched.
function mdbModal_dragBind( overlay ) {
    var head = overlay.find( ".mdb-modal-head" )[0];

    if( !head ) return;

    head.addEventListener( "pointerdown", mdbModal_dragStart );
}

// mdbModal_dragStart
// Begins a drag - unless the header was grabbed by one of the controls sitting in it (the two
// arrows, the close button, "Open on MixesDB"), which stay clickable.
//
// Everything the move needs is measured ONCE, here: the box's untransformed place in the
// window (its current rect minus the offset it already carries) and its size. Re-measuring per
// move would read a rect that already contains the offset being computed from it.
function mdbModal_dragStart( e ) {
    var head = e.currentTarget,
        box = head.parentNode,
        rect, target;

    // only the primary button, and never the controls in the header
    if( e.button !== 0 ) return;
    if( $(e.target).closest( "button, a" ).length ) return;

    rect = box.getBoundingClientRect();

    mdbModal_drag = {
        box: box,
        head: head,
        pointer: e.pointerId,
        // where the pointer started, in the window the overlay hangs in
        fromX: e.clientX,
        fromY: e.clientY,
        // and where the box stood when it was grabbed
        startX: mdbModal_dragX,
        startY: mdbModal_dragY,
        // the box without any offset - what the clamp counts from
        left: rect.left - mdbModal_dragX,
        top: rect.top - mdbModal_dragY,
        width: rect.width,
        headHeight: head.getBoundingClientRect().height,
        moved: false
    };

    // keeps the header's text from being selected while the box is dragged - which also takes
    // the focus the click would have moved, so the box is focused by hand: a reader who has
    // clicked into the framed page gets the arrow keys back by grabbing the header, and that
    // has to keep working while the header is also the drag handle.
    e.preventDefault();
    box.focus();

    target = head;

    try {
        head.setPointerCapture( e.pointerId );
    } catch( err ) {
        logVar( "mdbModal_dragStart: no pointer capture (" + err + ") - listening on the document instead" );
        target = head.ownerDocument;
    }

    mdbModal_drag.target = target;

    target.addEventListener( "pointermove", mdbModal_dragMove );
    target.addEventListener( "pointerup", mdbModal_dragEnd );
    target.addEventListener( "pointercancel", mdbModal_dragEnd );
}

// mdbModal_dragMove
// One step of the gesture: the offset the pointer has travelled, clamped to what has to stay
// on screen, written onto the box.
function mdbModal_dragMove( e ) {
    var d = mdbModal_drag,
        win, keep, x, y;

    if( !d || e.pointerId !== d.pointer ) return;

    win = d.box.ownerDocument.defaultView;

    x = d.startX + ( e.clientX - d.fromX );
    y = d.startY + ( e.clientY - d.fromY );

    // a box narrower than the margin we want to keep may not be clamped to more than itself
    keep = Math.min( mdbModal_dragKeep, d.width );

    // horizontally: keep px of the box stay inside either edge
    x = Math.min( x, win.innerWidth - keep - d.left );
    x = Math.max( x, keep - d.width - d.left );

    // vertically: the header may not leave the window on either side - above the top edge it
    // could not be grabbed again, below the bottom one it could not be seen
    y = Math.min( y, win.innerHeight - d.headHeight - d.top );
    y = Math.max( y, -d.top );

    mdbModal_dragX = x;
    mdbModal_dragY = y;

    // the first real movement is what clears the backdrop and takes the frames out of the
    // pointer's way - a plain click on the header changes nothing
    if( !d.moved ) {
        d.moved = true;

        mdbModal_overlay().addClass( "mdb-modal-dragging mdb-modal-undimmed" );

        logVar( "mdbModal_dragMove: drag started, backdrop cleared for", mdbModal_url );
    }

    mdbModal_dragApply();
}

// mdbModal_dragEnd
// Drops the box where it is: the offset stays, only the listeners go. The cleared backdrop
// stays cleared as well - see the section comment.
function mdbModal_dragEnd( e ) {
    var d = mdbModal_drag;

    if( !d || ( e && e.pointerId !== d.pointer ) ) return;

    d.target.removeEventListener( "pointermove", mdbModal_dragMove );
    d.target.removeEventListener( "pointerup", mdbModal_dragEnd );
    d.target.removeEventListener( "pointercancel", mdbModal_dragEnd );

    try {
        d.head.releasePointerCapture( d.pointer );
    } catch( err ) {}

    mdbModal_overlay().removeClass( "mdb-modal-dragging" );

    // the click that follows this pointerup - see mdbModal_dragUntil
    if( d.moved ) mdbModal_dragUntil = Date.now() + 300;

    mdbModal_drag = null;
}

// mdbModal_dragApply
// The offset onto the box. A transform, so nothing about the modal's layout is touched: the
// overlay keeps centring the box, and 0/0 is the place it was opened in.
function mdbModal_dragApply() {
    var box = mdbModal_overlay().find( ".mdb-modal-box" )[0];

    if( !box ) return;

    box.style.transform = mdbModal_dragX || mdbModal_dragY ? "translate(" + mdbModal_dragX + "px, " + mdbModal_dragY + "px)" : "";
}

// mdbModal_bindKeys / mdbModal_unbindKeys
// The modal's keys, bound natively on the WINDOW and in the CAPTURE phase - not with jQuery,
// which can only bind the bubbling phase.
//
// Both parts are needed against the site under the overlay. SoundCloud's player listens for
// the same two arrow keys on the document and seeks the playing track with them, so a track
// playing under the modal jumped 15 seconds per step. A bubbling handler cannot help there,
// whatever it calls: by the time the event has travelled down to the target and back up to
// us, the site's own listener has already run. window + capture puts us at the very first
// stop of the event's path, ahead of every listener the site can have registered, and
// stopImmediatePropagation() then keeps the key ours.
//
// keyup and keypress are swallowed as well, without doing anything themselves: a site that
// acts on the release rather than the press would otherwise still get its half of the key.
function mdbModal_bindKeys() {
    mdbModal_keyWindows().forEach( function( win ) {
        win.addEventListener( "keydown", mdbModal_keys, true );
        win.addEventListener( "keyup", mdbModal_keys, true );
        win.addEventListener( "keypress", mdbModal_keys, true );
    });
}

function mdbModal_unbindKeys() {
    mdbModal_keyWindows().forEach( function( win ) {
        win.removeEventListener( "keydown", mdbModal_keys, true );
        win.removeEventListener( "keyup", mdbModal_keys, true );
        win.removeEventListener( "keypress", mdbModal_keys, true );
    });
}

// mdbModal_keyWindows
// The windows the modal's keys are listened for in: this one, plus the overlay's own where
// that is the top document. Both are needed while the overlay hangs up there: the box takes
// the focus on every open and every step (mdbModal_show), so the keys are then delivered to
// the TOP window - but anything still focused down here (a title field, the link that was
// clicked) keeps sending them to this one. A key event never crosses a frame boundary, so
// nothing is ever handled twice.
//
// Bound and unbound off the same list, which is why it is read from the overlay's node rather
// than decided again: mdbModal_close() unbinds BEFORE it drops the node.
function mdbModal_keyWindows() {
    var doc = mdbModal_node ? mdbModal_node.ownerDocument : document,
        other = doc.defaultView,
        wins = [ window ];

    if( other && other !== window ) wins.push( other );

    return wins;
}

// mdbModal_keys
// Escape closes, left/right step, and every one of those keys is taken off the page entirely
// while the modal is up. A named function rather than a closure, so unbinding can hand the
// listener back the same reference the binding used.
function mdbModal_keys( e ) {
    // The overlay can go without mdbModal_close() ever running: it is class mdb-element, and
    // the shared navigation cleanup (onUrlChange in global.js) removes those wholesale on the
    // next page. Closing here is what keeps a listener that swallows the arrow keys from
    // outliving the modal it was swallowing them for - and it also drops the frames the
    // removed overlay was holding.
    if( !mdbModal_overlay().length ) {
        mdbModal_close();
        return;
    }

    if( e.key === "Escape" ) {
        mdbModal_swallow( e );

        if( e.type === "keydown" ) mdbModal_close();

        return;
    }

    if( e.key !== "ArrowLeft" && e.key !== "ArrowRight" ) return;

    // no modifier: cmd/alt + left is the browser's own Back on the page behind us
    if( e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ) return;

    mdbModal_swallow( e );

    // the press is the step; the release and the keypress are only kept off the site
    if( e.type !== "keydown" ) return;

    mdbModal_step( e.key === "ArrowRight" ? 1 : -1 );
}

// mdbModal_swallow
// preventDefault() alone only answers the BROWSER - the page behind the overlay scrolling
// sideways. The site's own listeners are stopped by the two propagation calls, and by both of
// them: stopPropagation() ends the trip down the tree, stopImmediatePropagation() also skips
// whatever else is registered on the window next to us.
function mdbModal_swallow( e ) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
}

// mdbModal_frame
// The iframe holding one URL, made on first ask and kept afterwards. This is the whole reason
// a step is instant: the page is not fetched again, not parsed again and not laid out again -
// it is still there, one visibility swap away.
//
// "front" says which end of the recency list the frame goes on. The page being SHOWN goes to
// the front; a neighbour loaded ahead goes right behind it, so the frames thrown away when
// the list is full are the ones the reader has walked furthest from - never the page on
// screen, and never the two it can step to next.
//
// The iframe is created with its src and never pointed anywhere else: assigning src to a
// frame that already loaded something pushes an entry onto the TOP page's session history, so
// five steps would bury the site's own Back button five clicks deep. A fresh iframe's first
// load replaces instead of pushing.
function mdbModal_frame( url, front ) {
    var frames = mdbModal_overlay().find( ".mdb-modal-frames" ),
        entry = mdbModal_frameEntry( url ),
        at;

    if( !frames.length ) return null;

    if( entry ) {
        // already loaded (or loading) - only its place in the recency list can change
        at = mdbModal_frames.indexOf( entry );

        mdbModal_frames.splice( at, 1 );
    } else {
        logVar( "mdbModal_frame builds", url );

        entry = {
            url: url,
            node: $("<iframe>").addClass( "mdb-modal-frame" ).attr( "src", url )[0]
        };

        frames.append( entry.node );
    }

    mdbModal_frames.splice( front ? 0 : 1, 0, entry );

    mdbModal_frameTrim();

    return entry;
}

// mdbModal_frameEntry
// The list entry for a URL, or nothing. Compared as strings, like everything else about the
// walk (see mdbModal_index).
function mdbModal_frameEntry( url ) {
    var i;

    for( i = 0; i < mdbModal_frames.length; i++ ) {
        if( mdbModal_frames[i].url === url ) return mdbModal_frames[i];
    }

    return null;
}

// mdbModal_frameTrim
// Drops the least recently wanted frames once the modal holds more than it is allowed to.
// Taken off the END of the list, which is where the pages the reader has walked away from
// sit; removing the node is what frees the document behind it.
function mdbModal_frameTrim() {
    var gone;

    while( mdbModal_frames.length > mdbModal_frameMax ) {
        gone = mdbModal_frames.pop();

        logVar( "mdbModal_frameTrim drops", gone.url );

        $(gone.node).remove();
    }
}

// mdbModal_frameNeighbours
// The page before and the page after the one on screen, loading into their own hidden frames
// while it is being read. Two pages, not twelve: a step goes to one of these two, and the
// step after it asks for the next pair - so MixesDB is only ever rendering what the reader is
// one key away from, instead of the whole line the moment the modal opens.
//
// The ring means there is always a pair, even on the first and the last link.
function mdbModal_frameNeighbours() {
    var links = mdbModal_links(),
        at = mdbModal_index( links );

    if( at < 0 || links.length < 2 ) return;

    mdbModal_frame( links[ mdbModal_wrap( at + 1, links.length ) ].href, false );

    if( links.length < 3 ) return;

    mdbModal_frame( links[ mdbModal_wrap( at - 1, links.length ) ].href, false );
}

// mdbModal_wrap
// One position on the ring: -1 is the last link, length is the first again.
function mdbModal_wrap( at, length ) {
    return ( ( at % length ) + length ) % length;
}

// mdbModal_nav
// The two arrows and the "3 / 12" between them, built once with the header and rewritten by
// every step (mdbModal_count). They are also what says the keys exist at all - an overlay
// that answers a key nobody knows about is a feature nobody finds.
function mdbModal_nav() {
    function step( dir, sign, what ) {
        return $("<button>")
            .addClass( "mdb-modal-step" )
            .attr( "type", "button" )
            .attr( "data-mdb-dir", String( dir ) )
            // not "MixesDB link": on mixesdb.com the walk steps through the TrackId.net
            // links under the players
            .attr( "title", "The " + what + " link on the page (" + sign + ") - the walk goes round" )
            .text( sign )
            .on( "click", function() {
                mdbModal_step( dir );
            });
    }

    return $("<span>").addClass( "mdb-modal-nav" ).append(
        step( -1, "←", "previous" ),
        $("<span>").addClass( "mdb-modal-count" ),
        step( 1, "→", "next" )
    );
}

// mdbModal_show
// Brings one page to the front of the modal that is already up - its way-out link in the
// header, the counter and its frame.
//
// Nothing is torn down here. The frame of the page stepped away from stays loaded behind the
// new one (mdbModal_frame), which is what makes a step back as immediate as a step on: only
// the "-on" class moves.
function mdbModal_show( url ) {
    var overlay = mdbModal_overlay(),
        box = overlay.find( ".mdb-modal-box" ),
        entry;

    if( !overlay.length ) return;

    logVar( "mdbModal_show", url );

    mdbModal_url = url;

    overlay.find( "a.mdb-modal-ext" ).attr( "href", url ).text( mdbModal_extLabel( url ) );

    entry = mdbModal_frame( url, true );

    overlay.find( ".mdb-modal-frame" ).removeClass( "mdb-modal-frame-on" );

    if( entry ) $(entry.node).addClass( "mdb-modal-frame-on" );

    mdbModal_count();

    // the two pages a key is away, loading while this one is read
    mdbModal_frameNeighbours();

    // back onto the box after every step, and after the click that opened the modal: whatever
    // had the focus before (a title field, the link that was clicked) would otherwise keep
    // answering the arrow keys
    box.trigger( "focus" );
}

// mdbModal_extLabel
// What the header's way-out link is called for the page framed right now. It used to say
// "Open on MixesDB" for good, which turned into a lie the moment something other than a
// MixesDB page was framed - the TrackId.net links under the players on mixesdb.com do
// exactly that. Named after the SITE rather than after the link, because that is the whole
// information: the reader knows which page is in front of them, not where a plain "Open"
// would take them. Anything we have no name for is called by its host, and a URL that does
// not parse still gets a working link with a neutral label.
function mdbModal_extLabel( url ) {
    var host;

    try {
        host = new URL( url, window.location.href ).hostname.replace( /^www\./, "" );
    } catch( e ) {
        return "Open the page";
    }

    if( host.indexOf( "mixesdb.com" ) > -1 ) return "Open on MixesDB";
    if( host.indexOf( "trackid.net" ) > -1 ) return "Open on TrackId.net";

    return "Open on " + host;
}

// mdbModal_links
// The links the arrows walk: everything the registered providers return, merged into one
// list in DOCUMENT order - which is the order the page reads, so on a page carrying both the
// Page Creator's chips and the toolkit's usage links the walk does not jump between areas.
// Read fresh on every step rather than kept from the open: the rows rebuild constantly (a
// title edit, a lookup answering, a chip toggled), and a stored list would step to links
// that are no longer on the page.
function mdbModal_links() {
    var providers = window.mdbModal_linkProviders || [],
        links = [],
        list, i, j;

    for( i = 0; i < providers.length; i++ ) {
        try {
            list = providers[i]() || [];
        } catch( err ) {
            logVar( "mdbModal_links: a provider threw", err );
            list = [];
        }

        for( j = 0; j < list.length; j++ ) {
            if( links.indexOf( list[j] ) < 0 ) links.push( list[j] );
        }
    }

    links.sort( function( a, b ) {
        if( a === b ) return 0;

        return ( a.compareDocumentPosition( b ) & Node.DOCUMENT_POSITION_FOLLOWING ) ? -1 : 1;
    });

    return links;
}

// mdbModal_index
// Where the framed page sits in that list - found by URL, not remembered as an index, for the
// same reason the list is not kept: a rebuild between two keys, or a chip folded open while
// the modal is up, moves every link's position. -1 where the framed page is not on the page
// any more (its chip was closed, the title was edited into other categories); the step then
// does nothing rather than jumping somewhere the reader never came from.
function mdbModal_index( links ) {
    var i;

    for( i = 0; i < links.length; i++ ) {
        if( links[i].href === mdbModal_url ) return i;
    }

    return -1;
}

// mdbModal_step
// One link further, on a RING: one step past the last link lands on the first (12 / 12 -> 1 /
// 12) and one step back from the first lands on the last. A line with two dead ends made the
// reader walk all the way back to reach a link that was one key the other way.
function mdbModal_step( dir ) {
    var links = mdbModal_links(),
        at = mdbModal_index( links );

    if( at < 0 || !links.length ) return;

    // links[next].href, not the attribute: the URL is what the next step looks the position
    // up by, so it has to be the same absolute string the DOM reports.
    mdbModal_show( links[ mdbModal_wrap( at + dir, links.length ) ].href );
}

// mdbModal_count
// "3 / 12" plus the two arrows' disabled look. Empty where the framed page is not on the
// page any more - a position among links it is not one of would be a lie.
//
// On the ring both arrows always lead somewhere, so the greyed-out look is left for exactly
// that case: the page on screen is not in the walk any more (its chip was closed, the title
// was edited into other categories) and there is no position to step from.
function mdbModal_count() {
    var overlay = mdbModal_overlay(),
        links = mdbModal_links(),
        at = mdbModal_index( links );

    overlay.find( ".mdb-modal-count" ).text( at < 0 ? "" : ( at + 1 ) + " / " + links.length );

    overlay.find( ".mdb-modal-step" ).toggleClass( "mdb-modal-step-off", at < 0 );
}

// mdbModal_close
// Removal is the whole close: the overlay goes and every frame it was holding goes with it,
// which is what frees the loaded documents. The list has to be emptied by hand though - it
// would otherwise hand the next open a set of detached nodes it thinks are loaded pages.
//
// Emptying it here also covers the close nobody calls: the overlay is class mdb-element, so
// the shared navigation cleanup (onUrlChange in global.js) can remove it on its own - but the
// next open runs mdbModal_close() first, and that is this.
//
// That cleanup only reaches the document THIS script runs in, though, and the overlay may
// hang in the top one (mdbModal_doc) - which is why the Page Creator's own reset for a new
// page calls this too (mdbPageCreator_resetForNewPage).
function mdbModal_close() {
    mdbModal_dragEnd();
    mdbModal_unbindKeys();
    mdbModal_overlay().remove();
    mdbModal_node = null;
    mdbModal_frames = [];
    mdbModal_url = null;

    // the next modal opens centred again - the offset belongs to the box that is now gone
    mdbModal_dragX = 0;
    mdbModal_dragY = 0;
}
