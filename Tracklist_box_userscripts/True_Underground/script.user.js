// ==UserScript==
// @name         True Underground (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.09.04.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_box_userscripts/True_Underground/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Tracklist_box_userscripts/True_Underground/script.user.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/jquery-3.7.1.min.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/global.js?v-True_Underground_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/funcs.js?v-True_Underground_1
// @match        https://www.trueunderground.one/*
// @match        https://trueunderground.one/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trueunderground.one
// @noframes
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 1,
    scriptName = "True_Underground";
window.scriptName = scriptName; // toolkit.js reads this global directly
window.cacheVersion = cacheVersion; // same reason: the @require'd shared files cache-bust their own CSS with it

loadRawCss( githubPath_raw + "shared/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + "Tracklist_box_userscripts/" + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Right click, copying and text selection
 *
 * The site ships a "protection" script (hmwp) that registers contextmenu, copy, cut, paste,
 * selectstart and drag listeners on document and calls preventDefault() in each of them, plus
 * a keydown listener that swallows the shortcuts behind them (cmd/ctrl+C, cmd/ctrl+S,
 * cmd/ctrl+U, F12 and the devtools combos). Left alone, that makes the tracklist box below
 * pointless - a box you can neither select in nor copy out of.
 *
 * Those listeners cannot be removed (anonymous functions in the page's own world), but they
 * can be starved: a CAPTURING listener on window runs before anything registered on document,
 * and stopImmediatePropagation() there means the event never reaches theirs. The browser then
 * does its default - opens the menu, copies the selection - because nobody called
 * preventDefault(). Nothing of ours listens to these event types (the box binds input, keyup,
 * click and blur on its textarea), so nothing of ours is starved along with them.
 *
 * keydown is the exception: starving every keydown would take the site's own keyboard handling
 * down too, so only the combinations the site swallows are cut off. Every other key passes
 * through untouched.
 *
 * The "user-select: none" the site puts on every element is CSS and is answered in script.css.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tuFreedEvents = [ "contextmenu", "copy", "cut", "paste", "selectstart", "dragstart" ];

tuFreedEvents.forEach(function( type ) {
    window.addEventListener( type, function( e ) {
        e.stopImmediatePropagation();
    }, true );
});

window.addEventListener( "keydown", function( e ) {
    var mod = e.ctrlKey || e.metaKey,
        key = e.key ? e.key.toUpperCase() : "";

    if( e.key === "F12"
        || ( mod && e.shiftKey && ( key === "C" || key === "I" || key === "J" || key === "K" ) )
        || ( mod && !e.shiftKey && ( key === "C" || key === "S" || key === "U" ) )
    ) {
        e.stopImmediatePropagation();
    }
}, true );

log( "Right click, copying and text selection re-enabled (" + tuFreedEvents.join(", ") + " + keydown combos)" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist box
 *
 * A mix page that publishes its tracklist does so as plain post content: a heading ending in
 * "Tracklist" ("Ilona Maras True Techno 105 Tracklist"), then ONE paragraph with one track per
 * line, separated by <br>, numbered by hand:
 *
 *     1. Ben Sims – Snapshot 99 (ANNE Remix V1) [Hardgroove]<br />
 *     2. Sola Contagio – Mutatio 02 (Original Mix) [Ketra Records]<br />
 *
 * Only a few episodes carry one at all (True Techno 105 was the first at the time of writing),
 * so on most pages there is simply nothing to find - which is logged, not an error.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tuTextLines
// The lines of a block the way the reader sees them: a <br> ends a line, a list item or a
// nested paragraph is a line of its own, everything else just contributes its text. Walks the
// nodes instead of re-parsing innerHTML through jQuery, which would EVALUATE a stray <script>
// inside a post paragraph - the site embeds Instagram exactly that way.
function tuTextLines( block ) {
    var lines = [],
        current = "";

    function flush() {
        var line = current
            .replace(/\u00A0/g, " ") // normalise all spaces to regular ASCII spaces
            .replace(/\s+/g, " ")
            .trim();

        if( line !== "" ) {
            lines.push( line );
        }

        current = "";
    }

    function walk( node ) {
        $(node).contents().each(function(){
            if( this.nodeType === 3 ) {
                current += this.nodeValue;
                return;
            }

            if( this.nodeType !== 1 ) {
                return; // comments and the like
            }

            var tag = this.tagName.toLowerCase();

            if( tag === "br" ) {
                flush();
            } else if( tag === "script" || tag === "style" ) {
                return;
            } else if( tag === "li" || tag === "p" || tag === "div" ) {
                flush();
                walk( this );
                flush();
            } else {
                walk( this );
            }
        });
    }

    walk( block );
    flush();

    return lines;
}

// tuIsTrackLine
// "1. Artist – Title [Label]": hand-numbered AND carrying a separator. The fallback below
// scans every post paragraph with this, so numbering alone would turn any "Top 10" article
// into a tracklist box.
function tuIsTrackLine( line ) {
    return /^\d{1,3}[.)]\s+.+\s[-\u2013\u2014]\s.+/.test( line );
}

// tuFindTracklistBlock
// The block holding the tracks: the element after a heading that mentions the tracklist, the
// heading's own paragraph when it is a bold "Tracklist:" line inside it, or - with no heading
// at all - the first post paragraph that reads like a numbered tracklist.
function tuFindTracklistBlock( content ) {
    var block = $();

    content.find("h1, h2, h3, h4, h5, h6, p > strong, p > b").each(function(){
        if( !/tracklist/i.test( $(this).text() ) ) {
            return;
        }

        var heading = $(this).is("strong, b") ? $(this).parent() : $(this),
            next = heading.next();

        log( "tracklist heading: " + heading.text().trim() );

        // "<p><strong>Tracklist:</strong><br>1. ..." - the tracks share the heading's paragraph
        if( heading.is("p") && tuTextLines( heading ).length > 1 ) {
            block = heading;
            return false;
        }

        if( next.is("p, ol, ul") && tuTextLines( next ).length > 0 ) {
            block = next;
            return false;
        }
    });

    if( block.length ) {
        return block;
    }

    content.find("p, ol, ul").each(function(){
        var lines = tuTextLines( this ),
            trackLines = lines.filter( tuIsTrackLine );

        if( lines.length >= 3 && trackLines.length >= lines.length * 0.8 ) {
            log( "no tracklist heading, but a paragraph that reads like a tracklist (" + trackLines.length + "/" + lines.length + " track lines)" );
            block = $(this);
            return false;
        }
    });

    return block;
}

// tuBuildTracklist
function tuBuildTracklist( contentNode ) {
    var content = $(contentNode);

    if( content.hasClass("mdb-processed-tracklist") ) {
        return;
    }
    content.addClass("mdb-processed-tracklist");

    var block = tuFindTracklistBlock( content );

    if( !block.length ) {
        log( "No tracklist on this page" );
        return;
    }

    var lines = tuTextLines( block )
        .filter(function( line ){
            // a bold "Tracklist:" line that shares the paragraph with the tracks
            return !/^tracklist:?$/i.test( line );
        })
        .map(function( line ){
            // the API strips the hand-typed numbering itself, this only keeps the log readable
            return line.replace(/^\d{1,3}[.)]\s*/, "");
        })
        .filter(function( line ){
            return line !== "";
        });

    if( lines.length === 0 ) {
        log( "Tracklist block found but no lines in it" );
        return;
    }

    var tlRaw = lines.map(function( line ){
        return "# " + line;
    }).join("\n");
    log( "tl before API:\n" + tlRaw );

    var res = apiTracklist( tlRaw, "standard" ),
        tlApi = (res && res.text) ? res.text : tlRaw,
        feedback = (res && res.feedback) ? res.feedback : "",
        tlEditor = $('<div class="mdb-element tlEditor mdb-trueunderground-tracklist"></div>'),
        tlTextarea = $('<textarea class="mono mixesdb-TLbox" wrap="off" style="display:none; width:100%; margin:10px 0 0 0; white-space:pre; overflow-x:auto; resize:vertical;"></textarea>');

    tlTextarea
        .attr("rows", Math.max(lines.length, 8))
        .val( tlApi )
        .show();

    tlEditor.append( tlTextarea );

    // above the site's own list, i.e. right under its "... Tracklist" heading
    block.before( tlEditor );

    // false: the box does not select itself. The tracklist sits at the end of a long article,
    // and a box that grabs the caret on load would scroll the reader away from the player.
    fixTLbox( feedback, tlEditor, false );
}

waitForKeyElements(".post-content, .entry-content", function( jNode ) {
    tuBuildTracklist( jNode );
});

})();
