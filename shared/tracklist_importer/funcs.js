/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist Importer (beta) – the DOM half
 *
 * Carries a tracklist a player-site userscript found (TLE-formatted, sitting in the shared
 * tracklist box) over to the MixesDB mix page the toolkit's player search matched. Two sides,
 * both living in this one file because the SAME userscript runs on both domains:
 *
 * On the player site (TrackId.net first):
 *   - when the toolkit says the player is used on MixesDB AND the page has a filled tracklist
 *     box, the mix page's wikitext is fetched and its "== Tracklist ==" section decides the
 *     mode: no tracklist yet -> "Insert", existing tracklist -> "Merge", a tracklist the
 *     candidate cannot add anything to -> no link at all
 *   - an Insert/Merge link goes into the toolkit's action links in front of EDIT, and a
 *     "Report" link behind it opens a paste-ready Discord report of the whole case
 *   - the link opens the mix page's edit form; the candidate travels in the URL HASH
 *     (#mdbTlImporterTl=...), which no server ever sees, so its length cannot break the request
 *
 * On mixesdb.com (the edit form the link opened):
 *   - insert: the candidate goes into the empty Tracklist section – inside <list> when it has
 *     gaps, replacing the tag when every track is numbered "# "
 *   - merge: the page's tracklist is the original, the candidate enriches it (merge_core.js),
 *     the result is TLE-formatted and written back
 *   - the "Tracklist:" category and the indicator icons under the box follow the verdict
 *   - "Show changes" is clicked for the user, so the next thing on screen is MediaWiki's own
 *     diff; Save/Preview are disabled up to that click so nothing can be saved unseen
 *   - between that diff and the edit box a three-column review block shows the Original (what
 *     the merge changed highlighted), the Merged result in an editable Tracklist Editor box
 *     with an Apply button, and the Candidate (what the merge used highlighted) – kept across
 *     "Show changes"/"Show preview" via sessionStorage, and dropped when that compare came
 *     back as "(No difference)"
 *
 * Requires (load order): global.js, tracklist_editor/funcs.js (apiTracklist), merge_core.js.
 * The toolkit must be on the page for the player-site side – the links go into ITS output.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

log( "shared/tracklist_importer/funcs.js: started executing" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Shared bits
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_boxSelector
// The candidate tracklist box. Every site using the shared tracklist box qualifies; a site
// whose box is called differently sets window.mdbTlImporter_candidateBox before this loads.
function tlImporter_boxSelector() {
    return window.mdbTlImporter_candidateBox || "textarea.mixesdb-TLbox";
}

// tlImporter_candidateText
function tlImporter_candidateText() {
    return $.trim( $( tlImporter_boxSelector() ).first().val() || "" );
}

// tlImporter_loadCss
// Lazy, like the tracklist box's CSS: only pages that actually show importer UI fetch it. The
// cache param mirrors tlBoxCssCacheParam() in tracklist_editor/funcs.js, so a CSS change ships
// with the site script's cacheVersion bump.
var tlImporter_cssLoaded = false;

function tlImporter_loadCss() {
    if( tlImporter_cssLoaded || typeof loadRawCss !== "function" ) return;
    tlImporter_cssLoaded = true;

    var name = typeof scriptName !== "undefined" ? scriptName : "",
        version = typeof cacheVersion !== "undefined" ? cacheVersion : "",
        param = ( name !== "" || version !== "" )
            ? "?v-" + name + ( name !== "" && version !== "" ? "_" : "" ) + version
            : "";

    loadRawCss( githubPath_raw + "shared/tracklist_importer/tracklist_importer.css" + param );
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Player-site side: the Insert/Merge and Report links in the toolkit
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// tlImporter_fetchPageText
// The mix page's current wikitext, via the MediaWiki API the toolkit already talks to. The
// classic revisions shape and the slots one are both read, so a MediaWiki update cannot
// silently turn every answer into "".
function tlImporter_fetchPageText( pageId, done ) {
    var apiQueryUrl = apiUrl_mw + "?action=query&format=json&prop=revisions&rvprop=content&pageids=" + pageId;

    logVar( "tlImporter apiQueryUrl", apiQueryUrl );

    $.ajax({
        url: apiQueryUrl,
        type: "get",
        dataType: "json",
        async: true,
        success: function( data ) {
            var pages = data && data.query && data.query.pages ? data.query.pages : null,
                page = pages ? pages[ pageId ] : null,
                rev = page && page.revisions ? page.revisions[0] : null,
                text = "";

            if( rev ) {
                if( typeof rev["*"] === "string" ) {
                    text = rev["*"];
                } else if( rev.slots && rev.slots.main ) {
                    text = rev.slots.main["*"] || rev.slots.main.content || "";
                }
            }

            done( text );
        },
        error: function( jqXHR, textStatus, errorThrown ) {
            log( "tlImporter: FAILED to fetch the mix page text (" + textStatus + ": " + errorThrown + ", status " + jqXHR.status + ")" );
            done( "" );
        }
    });
}

// The links, one wrapper at a time. Registered once at the top level; the handler returns true
// (= not handled, keep polling) until the page also has a filled candidate box, because a
// toolkit link without a tracklist to carry would only ever insert nothing.
if( typeof visitDomain !== "undefined" && visitDomain != "mixesdb.com" ) {
    waitForKeyElements( "#mdb-toolkit .mdb-mixesdbLink-actionLinks-wrapper:not(.mdb-processed-tlImporter)", function( jNode ) {
        if( tlImporter_candidateText() === "" ) return true;

        jNode.addClass( "mdb-processed-tlImporter" );

        var editLink = jNode.children( "a.mdb-mixesdbLink.edit" ).first(),
            editHref = editLink.attr( "href" ) || "",
            pageId = ( editHref.match( /[?&]curid=(\d+)/ ) || [] )[1];

        if( !editLink.length || !pageId ) {
            log( "tlImporter: no EDIT link / no curid in it - no import link." );
            return;
        }

        // Two async steps deep on an SPA: drop the answer when the user has clicked on.
        var pageGeneration = typeof mdbPageGeneration !== "undefined" ? mdbPageGeneration : null;

        tlImporter_fetchPageText( pageId, function( pageText ) {
            if( pageGeneration !== null && typeof mdbIsCurrentPage === "function" && !mdbIsCurrentPage( pageGeneration ) ) return;
            if( !jNode.closest( "body" ).length ) return; // the toolkit was rebuilt meanwhile

            if( !pageText ) {
                log( "tlImporter: empty page text - no import link." );
                return;
            }

            var read = tlImporter_extractTracklist( pageText );

            if( !read.hasSection ) {
                log( "tlImporter: the mix page has no == Tracklist == section - no import link." );
                return;
            }

            // Chapters (";Name" rows) need their own merge logic - not yet
            if( read.hasTracks && /^\s*;/m.test( read.tlText ) ) {
                log( "tlImporter: the mix page tracklist has chapters - merging those is not supported yet." );
                return;
            }

            var mode = read.hasTracks ? "merge" : "insert";

            // A merge that would change nothing is not worth a link: following it would only
            // open the edit form on MediaWiki's "(No difference)". The merge itself is the
            // answer - pure JS, no network - and the candidate is re-read from the box here,
            // because the page text fetch above was async.
            if( mode == "merge" && !tlImporter_merge( read.tlText, tlImporter_candidateText() ).changed ) {
                log( "tlImporter: the mix page tracklist already holds everything this candidate could add - no import link." );
                return;
            }

            tlImporter_loadCss();

            var importLink = $( '<a class="mdb-element mdb-mixesdbLink mdb-tlImporter-link"></a>' )
                .attr( "href", editHref ) // placeholder - the real href is built at click time
                .attr( "target", "_blank" )
                .attr( "data-mdb-importmode", mode )
                .attr( "title", mode == "merge"
                    ? "Merge this tracklist into the tracklist the MixesDB page already has.\nOpens the edit form with the merge applied and shows the changes."
                    : "Insert this tracklist into the MixesDB page, which has none yet.\nOpens the edit form with the tracklist filled in and shows the changes." )
                .text( mode == "merge" ? "Merge" : "Insert" );

            var reportLink = $( '<a class="mdb-element mdb-mixesdbLink mdb-tlImporter-report" href="#"></a>' )
                .attr( "title", "Open a paste-ready report of this import (original + candidate) for Discord." )
                .data( "mdb-mode", mode )
                .data( "mdb-original", read.tlText )
                .data( "mdb-mixpageurl", "https://www.mixesdb.com/w/?curid=" + pageId )
                .text( "Report" );

            // the divider (styled in global.css) groups our two links apart from EDIT/HIST -
            // its twin between HIST and the integrated checkbox comes with the toolkit markup
            editLink.before( importLink, reportLink, $( '<span class="mdb-element mdb-toolkit-actionDivider"></span>' ) );

            log( "tlImporter: added " + ( mode == "merge" ? "Merge" : "Insert" ) + " link for page " + pageId );
        });
    });
}

// The import link's href, built at click time: the EDIT link next to it may have gained its
// &siteHasTl=... by now, and the box may have been edited since the link was added. mousedown
// covers middle clicks, click covers keyboard activation - both just rewrite the href before
// the browser follows it.
$(document).on( "mousedown click", "a.mdb-tlImporter-link", function() {
    var link = $(this),
        mode = link.attr( "data-mdb-importmode" ),
        editHref = link.parent().children( "a.mdb-mixesdbLink.edit" ).first().attr( "href" ) || "",
        candidate = tlImporter_candidateText();

    if( !editHref || !candidate ) return;

    // The candidate rides in the HASH: fragments never reach the server, so a long tracklist
    // cannot blow the request line the way a query parameter could.
    this.href = editHref + "&mdbTlImporter=" + mode + "#mdbTlImporterTl=" + encodeURIComponent( candidate );
});

/*
 * The Report box: the whole case as one paste-able Markdown block, like the page creator's
 * "Report" - what the mix page has, what the site found, what the merge would make of it, and
 * the empty lines only the reporter can fill. Anything typed into it stops the refill.
 */

// tlImporter_growReport
function tlImporter_growReport( box ) {
    box.attr( "rows", String( box.val() || "" ).split( "\n" ).length + 1 );
}

// tlImporter_reportText
function tlImporter_reportText( link ) {
    var mode = link.data( "mdb-mode" ) || "",
        original = link.data( "mdb-original" ) || "",
        mixPageUrl = link.data( "mdb-mixpageurl" ) || "",
        candidate = tlImporter_candidateText(),
        fence = "```",
        lines = [];

    lines.push( "## Tracklist Importer" );
    lines.push( "" );
    lines.push( "* Page URL: " + location.href );
    lines.push( "* Mix page: " + mixPageUrl );
    lines.push( "* Mode: " + mode );

    if( mode == "merge" ) {
        lines.push( "" );
        lines.push( "## Original" );
        lines.push( "" );
        lines.push( fence );
        lines.push( original );
        lines.push( fence );
    }

    lines.push( "" );
    lines.push( "## Candidate" );
    lines.push( "" );
    lines.push( fence );
    lines.push( candidate );
    lines.push( fence );

    if( mode == "merge" && original && candidate ) {
        var res = tlImporter_merge( original, candidate );

        lines.push( "" );
        lines.push( "## Merged (raw, before Tracklist Editor formatting)" );
        lines.push( "" );
        lines.push( fence );
        lines.push( res.mergedText );
        lines.push( fence );
    }

    lines.push( "" );
    lines.push( "## Mistakes / learnings" );
    lines.push( "" );
    lines.push( "* " );
    lines.push( "* " );

    lines.push( "" );
    lines.push( "## Expected" );
    lines.push( "" );
    lines.push( "* " );

    return lines.join( "\n" );
}

$(document).on( "click", "a.mdb-tlImporter-report", function( e ) {
    e.preventDefault();

    var link = $(this),
        box = $( "#mdb-tlImporter-report-box" );

    if( box.length && box.is( ":visible" ) ) {
        box.hide();
        return;
    }

    if( !box.length ) {
        box = $( '<textarea id="mdb-tlImporter-report-box" class="mono" spellcheck="false"></textarea>' );

        // only a REAL keystroke marks the box as the reporter's - .val() below must not count
        box.on( "input", function() {
            box.data( "mdb-edited", true );
            tlImporter_growReport( box );
        });

        $( "#mdb-toolkit" ).after( box );
    }

    box.show();

    if( !box.data( "mdb-edited" ) ) {
        box.val( tlImporter_reportText( link ) );
    }

    tlImporter_growReport( box );
});


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * MixesDB side: the edit form the Insert/Merge link opened
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlImporter_storageKey = "mdb-tlImporter-diff",
    tlImporter_storageMaxAgeMs = 60 * 60 * 1000; // an hour-old diff belongs to another edit

// tlImporter_articleId
function tlImporter_articleId() {
    if( typeof mw !== "undefined" && mw.config && mw.config.get( "wgArticleId" ) ) {
        return String( mw.config.get( "wgArticleId" ) );
    }

    return String( getURLParameter( "curid" ) || "" );
}

// tlImporter_candidateFromHash
function tlImporter_candidateFromHash() {
    var m = String( location.hash || "" ).match( /[#&]mdbTlImporterTl=([^&]+)/ );

    if( !m ) return "";

    try {
        return decodeURIComponent( m[1] );
    } catch( e ) {
        log( "tlImporter: the hash could not be decoded (" + e.message + ")" );
        return "";
    }
}

// tlImporter_storeDiff
// sessionStorage, because "Show changes" and "Show preview" POST the form: the URL that
// carried our parameters is gone afterwards, and the review block has to survive that.
// data carries everything the block renders: mode, unchanged, items (candidate rows),
// originalItems (original rows), mergedTl (the Merged box's text), status and feedback (the
// TLE answer for it). The version stamp keeps a payload from an older script generation from
// reaching the new renderer.
var tlImporter_storageVersion = 2;

function tlImporter_storeDiff( data ) {
    try {
        data.v = tlImporter_storageVersion;
        data.articleId = tlImporter_articleId();
        data.t = Date.now();

        // the TLE call counter travels with the block: the chip says "calls made on this
        // page", but the answer on screen was paid for on the edit page - a POST later, "0 API
        // calls" next to visible feedback would be a lie
        data.apiCalls = typeof tlApiCalls !== "undefined" ? tlApiCalls : 0;

        sessionStorage.setItem( tlImporter_storageKey, JSON.stringify( data ) );
    } catch( e ) {
        log( "tlImporter: could not store the review block (" + e.message + ") - it will not survive Show changes." );
    }
}

// tlImporter_readStoredDiff
function tlImporter_readStoredDiff() {
    try {
        var stored = JSON.parse( sessionStorage.getItem( tlImporter_storageKey ) || "null" );

        if( stored && stored.v !== tlImporter_storageVersion ) {
            tlImporter_clearStoredDiff();
            return null;
        }

        return stored;
    } catch( e ) {
        return null;
    }
}

// tlImporter_clearStoredDiff
function tlImporter_clearStoredDiff() {
    try {
        sessionStorage.removeItem( tlImporter_storageKey );
    } catch( e ) { /* nothing to clear then */ }
}

// tlImporter_renderPre
// One review column's <pre>: rows built from serialized items, each part (cue / text / label)
// asked past partClass( item, part ), which answers a highlight class or "" for plain text.
// Blanks were dropped by the parser and "..." gaps never carry text, so neither is ever
// highlighted.
function tlImporter_renderPre( items, partClass ) {
    var pre = $( '<pre class="mdb-tlImporter-pre"></pre>' );

    ( items || [] ).forEach(function( item, i ) {
        if( i > 0 ) pre.append( document.createTextNode( "\n" ) );

        if( item.type !== "track" ) {
            pre.append( document.createTextNode( "..." ) );
            return;
        }

        function part( text, className, trailingSpace ) {
            if( !text ) return;

            if( className ) {
                pre.append( $( "<span></span>" ).addClass( className ).text( text ) );
            } else {
                pre.append( document.createTextNode( text ) );
            }

            if( trailingSpace ) pre.append( document.createTextNode( " " ) );
        }

        part( item.cue ? "[" + item.cue + "]" : "", partClass( item, "cue" ), true );
        part( item.text, partClass( item, "text" ), !!item.label );
        part( item.label ? "[" + item.label + "]" : "", partClass( item, "label" ), false );
    });

    return pre;
}

// tlImporter_flattenFeedbackList
// MixesDB's own affiliate/search decorator (ext.mixesdb.global) treats EVERY <li> under
// #mw-content-text as a potential track row on ns-0 edit/submit pages - the TLE feedback's
// <ul id="tlEditor-feedback-topInfo"> inside our review block included. It then rewrites the
// row via .html().replace(/<br>[^+]/,''), a regex that eats the "<" of whatever tag follows
// the <br> (the reported smashed "code>#"), and appends its fa-search wrapper. So inside the
// block the list is flattened to plain divs the moment it appears: nothing matches "ul li"
// any more and the site engine has nothing to grab. The li classes ride along on the rows.
function tlImporter_flattenFeedbackList( scope ) {
    var list = $( scope ).find( "ul#tlEditor-feedback-topInfo" ).first();

    if( !list.length ) return;

    var rows = $( '<div id="tlEditor-feedback-topInfo" class="mdb-element mdb-tlImporter-feedback-rows"></div>' );

    list.children( "li" ).each(function() {
        rows.append(
            $( '<div class="mdb-tlImporter-feedback-row"></div>' )
                .addClass( this.className )
                .append( $( this ).contents() )
        );
    });

    list.replaceWith( rows );
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * The column widths of the review block
 *
 * Three equal thirds are a starting point, not an answer: which of the columns needs the
 * room depends on the merge in front of the reader. A long original with short candidate
 * lines wants a wide Original, hand-salvaging in the Merged box wants that one wide.
 *
 * So the two gaps between the columns are grab bars: drag to move the border between the two
 * columns next to it, double-click to give all three the same width again. The result is kept
 * per browser, since the block is built fresh on every edit form and re-dragging it every time
 * would defeat the point.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlImporter_colSizesKey = "mdb-tlImporter-colSizes",
    tlImporter_colSizesDefault = [ 1, 1, 1 ],
    // no column may be dragged narrower than this, in px - below it the box shows single
    // words per line and the handle can no longer be grabbed back out
    tlImporter_colMinPx = 120;

// tlImporter_readColSizes
// The stored three-number ratio, or the equal thirds. A browser with storage blocked must not
// take the block down with it, hence the try/catch - same as the live-update switch.
function tlImporter_readColSizes() {
    try {
        var stored = JSON.parse( localStorage.getItem( tlImporter_colSizesKey ) || "null" );

        if( stored && stored.length === 3 && stored.every(function( n ) { return typeof n === "number" && isFinite( n ) && n > 0; }) ) {
            return stored;
        }
    } catch( e ) {}

    return tlImporter_colSizesDefault.slice();
}

// tlImporter_writeColSizes
function tlImporter_writeColSizes( sizes ) {
    try {
        localStorage.setItem( tlImporter_colSizesKey, JSON.stringify( sizes ) );
    } catch( e ) {}
}

// tlImporter_applyColSizes
// The three ratios as the grid's own template, the two handle columns fixed between them. The
// fr unit is proportional, so feeding it pixel numbers straight from the drag lands the
// columns on exactly those pixels.
function tlImporter_applyColSizes( cols, sizes ) {
    cols.css( "grid-template-columns",
        "minmax(0, " + sizes[0] + "fr) auto minmax(0, " + sizes[1] + "fr) auto minmax(0, " + sizes[2] + "fr)" );
}

// tlImporter_addColResizers
// The two grab bars, and the dragging behind them. Sizes are read off the LIVE pixel widths at
// mousedown rather than from the stored ratio: the reader may have resized the window since,
// and the ratio says nothing about how wide a third of it is now.
function tlImporter_addColResizers( cols ) {
    var columns = cols.children( ".mdb-tlImporter-col" );

    if( columns.length !== 3 ) return;

    tlImporter_applyColSizes( cols, tlImporter_readColSizes() );

    columns.eq( 0 ).add( columns.eq( 1 ) ).each(function( i ) {
        var handle = $( '<div class="mdb-tlImporter-col-resizer mdb-element" role="separator" aria-orientation="vertical"></div>' )
            .attr( "title", "Drag to change the width of the two columns next to it.\nDouble-click for three equal columns again." )
            .attr( "data-mdb-resizer", i );

        $(this).after( handle );
    });

    cols.on( "mousedown", ".mdb-tlImporter-col-resizer", function( event ) {
        var index = parseInt( $(this).attr( "data-mdb-resizer" ), 10 ),
            live = cols.children( ".mdb-tlImporter-col" ),
            startX = event.pageX,
            // the widths as they are on screen right now, in px - the two the handle sits
            // between are the ones that move, the third one keeps what it has
            widths = live.map(function() { return $(this).outerWidth(); }).get();

        // the browser's own text selection would otherwise select its way across the columns
        // while the pointer is down
        event.preventDefault();
        $( "body" ).addClass( "mdb-tlImporter-resizing" );

        function onMove( moveEvent ) {
            var delta = moveEvent.pageX - startX,
                a = widths[ index ] + delta,
                b = widths[ index + 1 ] - delta;

            // clamped as a pair: what one column may not give up, the other may not take
            if( a < tlImporter_colMinPx ) {
                b -= tlImporter_colMinPx - a;
                a = tlImporter_colMinPx;
            }

            if( b < tlImporter_colMinPx ) {
                a -= tlImporter_colMinPx - b;
                b = tlImporter_colMinPx;
            }

            if( a < tlImporter_colMinPx || b < tlImporter_colMinPx ) return; // no room left at all

            var sizes = widths.slice();

            sizes[ index ] = a;
            sizes[ index + 1 ] = b;

            tlImporter_applyColSizes( cols, sizes );
        }

        function onUp() {
            $( document ).off( "mousemove", onMove ).off( "mouseup", onUp );
            $( "body" ).removeClass( "mdb-tlImporter-resizing" );

            var sizes = cols.children( ".mdb-tlImporter-col" ).map(function() { return $(this).outerWidth(); }).get();

            if( sizes.length === 3 ) {
                tlImporter_writeColSizes( sizes );
                log( "tlImporter: column widths stored (" + sizes.join( " / " ) + " px)." );
            }
        }

        $( document ).on( "mousemove", onMove ).on( "mouseup", onUp );
    });

    // back to three equal columns - the way out of any drag that went wrong
    cols.on( "dblclick", ".mdb-tlImporter-col-resizer", function() {
        tlImporter_applyColSizes( cols, tlImporter_colSizesDefault );
        tlImporter_writeColSizes( tlImporter_colSizesDefault );
        log( "tlImporter: column widths reset to equal thirds." );
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Full width for the review block
 *
 * MediaWiki's content column is the width of an article, and three tracklists side by side
 * are not an article. The button in the block's top left corner takes the block out of that
 * column: it keeps its place in the page flow but reaches to both edges of the window, over
 * whatever the skin has parked left of the content (sidebar, tools). Click again to give it
 * back. Like the column widths, the choice is kept per browser.
 *
 * A negative left margin plus a stated width rather than "position: fixed": the block stays
 * where it is in the reading order, the edit form below it does not jump up under it, and
 * nothing has to be measured again while scrolling.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlImporter_wideKey = "mdb-tlImporter-wide",
    // the air left between the block and the window edges when it is wide
    tlImporter_widePad = 8;

// tlImporter_wideIcon
// Two arrows: pointing outward while the block is in its column (click to stretch), inward
// while it is stretched (click to give the width back). Drawn here rather than asked for by
// class name - Font Awesome is on MixesDB, but these two shapes are not in it as one glyph.
function tlImporter_wideIcon( wide ) {
    var arrows = wide
        ? '<path d="M2 3 L6.5 8 L2 13" /><path d="M14 3 L9.5 8 L14 13" />'
        : '<path d="M6.5 3 L2 8 L6.5 13" /><path d="M9.5 3 L14 8 L9.5 13" />';

    return '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" '
        + 'stroke-linecap="round" stroke-linejoin="round">' + arrows + '</svg>';
}

// tlImporter_readWide
function tlImporter_readWide() {
    try {
        return localStorage.getItem( tlImporter_wideKey ) === "1";
    } catch( e ) {
        return false;
    }
}

// tlImporter_writeWide
function tlImporter_writeWide( wide ) {
    try {
        localStorage.setItem( tlImporter_wideKey, wide ? "1" : "0" );
    } catch( e ) {}
}

// tlImporter_applyWide
// Measured, not calculated: how far the block's left edge stands from the window edge is the
// skin's business and changes with the window, the sidebar and the user's preferences. The
// inline styles are cleared first so the measuring sees the block in its column - reading the
// offset of an already-stretched block would move it further left on every call.
function tlImporter_applyWide( wrap, wide ) {
    wrap = $(wrap).first();

    if( !wrap.length ) return;

    wrap.css({ marginLeft: "", width: "" }).toggleClass( "mdb-tlImporter-wide", !!wide );

    var button = wrap.find( ".mdb-tlImporter-wide-toggle" ).first();

    button
        .html( tlImporter_wideIcon( wide ) )
        .attr( "title", wide
            ? "Back into the page's content column."
            : "Stretch this block over the full window width, across the sidebar." );

    if( !wide ) return;

    var left = wrap.get( 0 ).getBoundingClientRect().left,
        // clientWidth, not innerWidth: the scrollbar is not room the block may use
        pageWidth = document.documentElement.clientWidth;

    wrap.css({
        marginLeft: -( left - tlImporter_widePad ) + "px",
        width: ( pageWidth - 2 * tlImporter_widePad ) + "px"
    });
}

// tlImporter_addWideToggle
// The button, its click and the one thing that can invalidate the measuring afterwards: a
// resized window. Re-measured on a timer, so a drag of the window edge does not run this on
// every pixel.
function tlImporter_addWideToggle( wrap ) {
    var button = $( '<button type="button" class="mdb-tlImporter-wide-toggle mdb-element hand"></button>' );

    wrap.prepend( button );

    button.on( "click", function() {
        var wide = !wrap.hasClass( "mdb-tlImporter-wide" );

        tlImporter_applyWide( wrap, wide );
        tlImporter_writeWide( wide );
        log( "tlImporter: review block " + ( wide ? "stretched to the window width." : "back in the content column." ) );
    });

    var resizeTimer;

    $( window ).on( "resize.mdbTlImporterWide", function() {
        if( !wrap.hasClass( "mdb-tlImporter-wide" ) ) return;

        clearTimeout( resizeTimer );
        resizeTimer = setTimeout(function() {
            // gone with an SPA-style cleanup or a reload: nothing left to re-measure
            if( !$.contains( document.documentElement, wrap.get( 0 ) ) ) {
                $( window ).off( "resize.mdbTlImporterWide" );
                return;
            }

            tlImporter_applyWide( wrap, true );
        }, 150 );
    });
}


// tlImporter_renderDiffView
// The review block: three columns above the wiki edit box (and below MediaWiki's own diff,
// which sits above the form on action=submit) -
//   Original  – the page's tracklist before the merge, the parts the merge changed highlighted
//   Merged    – the shared Tracklist Editor box holding the applied result, editable for final
//               fixes, with the TLE feedback (live updates, API calls, rows, state icons)
//               under it and the Apply button that writes the box back into the page text
//   Candidate – the tracklist the player site found, the parts the merge took highlighted
function tlImporter_renderDiffView( data ) {
    if( !data || !data.items || !data.items.length ) return;
    if( $( "#mdb-tlImporter-diff" ).length ) return;

    var wrap = $( '<div id="mdb-tlImporter-diff" class="mdb-element"></div>' ),
        cols = $( '<div class="mdb-tlImporter-cols"></div>' );

    function col( name, helpText ) {
        var column = $( '<div class="mdb-tlImporter-col"></div>' );

        // the head and the help line are cut with an ellipsis when the column is too narrow
        // (see the CSS) - so both carry their own text as a title, and the tooltip gives back
        // whatever the cut took away
        column.append( $( '<div class="mdb-tlImporter-col-head"></div>' ).attr( "title", name ).text( name ) );
        column.append( $( '<div class="mdb-tlImporter-col-help"></div>' ).attr( "title", helpText ).text( helpText ) );

        return column;
    }

    // Original
    cols.append(
        col( "Original", "The tracklist the page had before the merge. Highlighted parts were changed." )
            .append( tlImporter_renderPre( data.originalItems, function( item, p ) {
                return item.changed && item.changed[ p ] === true ? "mdb-tlImporter-changed" : "";
            }) )
    );

    // Merged: the shared Tracklist Editor box (same ids as on the player sites, nothing on the
    // wiki edit page carries them), so fixTLbox() brings the feedback box and its chips along
    var tlWrapper = $( '<div id="tlEditor" class="tlEditor"></div>' ),
        textarea = $( '<textarea id="mixesdb-TLbox" class="mixesdb-TLbox mono" spellcheck="false"></textarea>' ),
        applyWrap = $( '<div class="mdb-tlImporter-apply-wrap"></div>' );

    textarea.val( data.mergedTl || "" );
    tlWrapper.append( textarea );

    // the OOUI classes dress the button like the wiki's own Save/Preview/Diff buttons - their
    // styles are on the edit page anyway, and a foreign-looking button next to them reads as
    // not belonging to the form
    applyWrap.append(
        $( '<button id="mdb-tlImporter-apply" class="hand oo-ui-inputWidget-input oo-ui-buttonElement-button" type="button">Apply</button>' )
            .attr( "title", "Replace the page's tracklist with this box's text, as it stands, and update the \"Tracklist:\" category and its icons.\nThe Tracklist Editor is asked once for the verdict on the way - the text itself is not changed." )
    );

    cols.append(
        col( "Merged", "The result as applied to the page. Edit final fixes here, then Apply." )
            .append( tlWrapper, applyWrap )
    );

    // Candidate: green what the merge took over, orange what it could not place - gaps and
    // "?" blanks never carry a salvage flag (see tlImporter_candidateUse), so they stay plain
    cols.append(
        col( "Candidate", "The tracklist the player site found. Green parts were used by the merge, orange parts were not." )
            .append( tlImporter_renderPre( data.items, function( item, p ) {
                if( item.used && item.used[ p ] === true ) return "mdb-tlImporter-used";
                if( item.use && item.use[ p ] === false ) return "mdb-tlImporter-unused";
                return "";
            }) )
    );

    // the two grab bars between the columns, plus the widths the reader last dragged
    tlImporter_addColResizers( cols );

    // the full-width toggle in the top left corner, before the columns so it is the block's
    // first element - it is positioned into the corner, but keyboard order should match
    tlImporter_addWideToggle( wrap );

    wrap.append( cols );

    // above the wiki edit box, below MediaWiki's diff. The diff container can sit outside or
    // inside form#editform depending on the MediaWiki version and the "preview on top"
    // preference, so the block goes right AFTER the diff wherever the diff stands above the
    // box - and right before the form (or the box itself) on pages without one.
    var textbox = $( "#wpTextbox1" ).first(),
        diffBox = $( "#wikiDiff" ).first();

    if( !diffBox.length ) diffBox = $( "table.diff" ).first();

    if( diffBox.length && textbox.length &&
        ( diffBox[0].compareDocumentPosition( textbox[0] ) & Node.DOCUMENT_POSITION_FOLLOWING ) ) {
        diffBox.after( wrap );
    } else {
        var anchor = $( "#editform" ).first();

        if( !anchor.length ) anchor = textbox;
        if( !anchor.length ) return;

        anchor.before( wrap );
    }

    // only now, with the block on the page, can its distance to the window's left edge be
    // measured - the stored choice is applied from here, not at build time
    tlImporter_applyWide( wrap, tlImporter_readWide() );

    // the TLE call counter the block carried over (see tlImporter_storeDiff) is restored
    // BEFORE the chips render - the feedback on screen was paid for on the edit page, and "0
    // API calls" next to it would be a lie. Never lowered: this page may have asked already.
    if( typeof tlApiCalls !== "undefined" && ( data.apiCalls || 0 ) > tlApiCalls ) {
        tlApiCalls = data.apiCalls;
    }

    // The feedback box re-renders itself on live updates, blur formats and the Live updates
    // toggle - paths that live in tracklist_editor/funcs.js with no hook for us - so the
    // list flattening (see tlImporter_flattenFeedbackList) watches the wrapper instead of
    // being called from every render site. Microtask timing wins the race by construction:
    // the observer fires before the site's decorator (timeouts, ajax callbacks) can run.
    if( window.MutationObserver ) {
        new MutationObserver(function() {
            tlImporter_flattenFeedbackList( tlWrapper );
        }).observe( tlWrapper.get( 0 ), { childList: true, subtree: true } );
    }

    // the box wiring: size to the text, bind the live updates, print the stored TLE feedback
    // with its chips - and never steal the focus on a page the reader came to for the diff
    fixTLbox( data.feedback && data.feedback.text ? data.feedback : null, tlWrapper.get( 0 ), false );

    // once directly, without waiting for the observer's microtask
    tlImporter_flattenFeedbackList( tlWrapper );

    // One shared height for the three columns: the tallest list's ROW COUNT decides - logical
    // rows only, soft line wrapping deliberately ignored. The textarea gets it as its rows
    // attribute (after fixTLbox() sized it to its own text), the pres as a min-height in
    // line-height units (1.5em per row, matching their CSS), so the three boxes line up.
    var maxRows = Math.max(
        data.originalItems ? data.originalItems.length : 0,
        data.items.length,
        String( textarea.val() || "" ).split( "\n" ).length
    );

    textarea.attr( "rows", maxRows );
    wrap.find( "pre.mdb-tlImporter-pre" ).css( "min-height", ( maxRows * 1.5 ) + "em" );

    log( "tlImporter: review block rendered (" + ( data.originalItems ? data.originalItems.length : 0 ) + " original rows, "
        + data.items.length + " candidate rows, " + maxRows + " shared rows, TLE status: " + ( data.status || "(none)" ) + ")." );
}

// The Apply button in the Merged column: the box's current text replaces the page's
// tracklist VERBATIM - what the reader sees in the box is what lands in the wiki edit box.
// The one synchronous TLE call is only asked for its verdict: the "Tracklist:" category and
// the icons follow it, the text does not. The box is marked known and its update sequence
// bumped, so the blur update the click itself triggered (focus leaves the box on mousedown)
// cannot reformat the box afterwards either.
$(document).on( "click", "#mdb-tlImporter-apply", function() {
    var button = $(this),
        tl = $( "#mdb-tlImporter-diff textarea.mixesdb-TLbox" ).first(),
        textbox = $( "#wpTextbox1" ).first(),
        text = $.trim( tl.val() || "" );

    if( !tl.length || !textbox.length || !text ) {
        log( "tlImporter: nothing to apply." );
        return;
    }

    var res = apiTracklist( text, "standard" ),
        status = res.feedback && res.feedback.status ? res.feedback.status : "";

    tl.data( "mdbTlboxSeq", ( tl.data( "mdbTlboxSeq" ) || 0 ) + 1 );
    tl.removeClass( "mdb-tlBox-updating" );
    tl.data( "mdbTlboxKnown", tl.val() );

    // the fresh verdict goes on screen (colour, message, chips) - tlBoxRenderFeedback never
    // touches the text
    if( res.feedback && res.feedback.text ) tlBoxRenderFeedback( tl, res.feedback );

    var newPage = tlImporter_setTracklist( textbox.val(), tlImporter_tracklistWikitext( text ) );

    if( newPage === null ) {
        log( "tlImporter: could not place the tracklist into the page text - the page has no == Tracklist == section." );
        return;
    }

    newPage = tlImporter_updateTlCategory( newPage, status );

    textbox.val( newPage );
    tlImporter_lightTlButtons( newPage );

    // the stored block follows the applied state, so the next "Show changes" reopens it with
    // THIS text in the box
    var stored = tlImporter_readStoredDiff();

    if( stored ) {
        stored.mergedTl = text;
        stored.status = status;
        if( res.feedback ) stored.feedback = res.feedback;
        tlImporter_storeDiff( stored );
    }

    // a short confirmation on the button itself - the change landed in the box below the fold
    button.text( "Applied" );
    setTimeout(function() { button.text( "Apply" ); }, 1500 );

    log( "tlImporter: applied the Merged box (TLE status: " + ( status || "(none)" ) + ")." );
});

// tlImporter_lightTlButtons
// The three indicator icons under the edit box, lit from what the TEXT now says - the same
// reading MixesDB Userscripts Helper syncs by, so the two can never disagree.
function tlImporter_lightTlButtons( pageText ) {
    // a.button-after is what the toolkit's siteHasTl block and MUH light today; the
    // .editorButton-tl class is swept along in case the wiki's markup carries that name too
    var buttons = $( "#afterTextbox1 a.button-after, #afterTextbox1 .editorButton-tl" );

    if( !buttons.length ) return;

    var m = pageText.match( /\[\[Category:Tracklist: ?(complete|incomplete|none)(?:\|[^\]]*)?\]\]/i ),
        filing = m ? m[1].toLowerCase() : "";

    if( !filing ) return;

    buttons.removeClass( "op1" );
    $( filing == "complete" ? "a#button-after-TLc" : filing == "incomplete" ? "a#button-after-TLi" : "a#button-after-TLn" ).addClass( "op1" );
}

// tlImporter_runEditPage
// The import itself, on the action=edit page the link opened.
function tlImporter_runEditPage() {
    if( getURLParameter( "action" ) != "edit" ) return;

    var linkMode = getURLParameter( "mdbTlImporter" );

    if( !linkMode ) return;

    logFunc( "tlImporter_runEditPage" );

    var candidate = tlImporter_candidateFromHash();

    if( !candidate ) {
        log( "tlImporter: no candidate tracklist in the URL hash - nothing to import." );
        return;
    }

    var textbox = $( "#wpTextbox1" );

    if( !textbox.length ) {
        log( "tlImporter: no #wpTextbox1 on this page. (Not logged in, or the page is protected?)" );
        return;
    }

    tlImporter_loadCss();

    var pageText = textbox.val(),
        read = tlImporter_extractTracklist( pageText );

    if( !read.hasSection ) {
        log( "tlImporter: the page has no == Tracklist == section - leaving it alone." );
        return;
    }

    // The LIVE page decides the mode, not the link's label: the page can have gained a
    // tracklist between the link being built and being clicked.
    var mode = read.hasTracks ? "merge" : "insert";

    if( mode != linkMode ) {
        log( "tlImporter: the link said \"" + linkMode + "\" but the page says \"" + mode + "\" - going with the page." );
    }

    var finalTl = "",
        status = "",
        diffItems = null,
        originalItems = null,
        feedback = null,
        changed = true;

    if( mode == "insert" ) {
        // The candidate is TLE-formatted already, and its verdict travelled along as
        // &siteHasTl=... on the EDIT href the link was built from - only when that is missing
        // is the API asked once.
        finalTl = candidate;
        status = getURLParameter( "siteHasTl" ) || "";

        if( !status ) {
            var resIns = apiTracklist( candidate, "standard" );

            if( resIns.text ) finalTl = resIns.text;
            status = resIns.feedback && resIns.feedback.status ? resIns.feedback.status : "";
        }
    } else {
        if( /^\s*;/m.test( read.tlText ) ) {
            log( "tlImporter: the page tracklist has chapters - merging those is not supported yet." );
            return;
        }

        var mergeRes = tlImporter_merge( read.tlText, candidate );

        diffItems = mergeRes.diffItems;
        originalItems = mergeRes.originalItems;
        changed = mergeRes.changed;

        if( changed ) {
            // The raw merge result goes through the TLE API once: it decides the "#" numbering
            // (and with it the <list> question) and hands back the verdict for the category.
            var resMerge = apiTracklist( mergeRes.mergedText, "standard" );

            finalTl = resMerge.text || mergeRes.mergedText;
            status = resMerge.feedback && resMerge.feedback.status ? resMerge.feedback.status : "";
            feedback = resMerge.feedback || null;
        } else {
            log( "tlImporter: the merge took nothing from the candidate - the page text stays as it is." );
        }
    }

    if( changed && finalTl ) {
        var newPage = tlImporter_setTracklist( pageText, tlImporter_tracklistWikitext( finalTl ) );

        if( newPage === null ) {
            log( "tlImporter: could not place the tracklist into the page text - leaving it alone." );
            return;
        }

        newPage = tlImporter_updateTlCategory( newPage, status );

        textbox.val( newPage );
        textbox.scrollTop( 0 );
        if( textbox[0].setSelectionRange ) textbox[0].setSelectionRange( 0, 0 );

        tlImporter_lightTlButtons( newPage );

        log( "tlImporter: " + mode + " done (TLE status: " + ( status || "(none)" ) + ")." );
    }

    // The review block's data survives the form POSTs behind "Show changes"/"Show preview".
    var viewData = null;

    if( diffItems ) {
        viewData = {
            mode: mode,
            unchanged: !changed,
            items: diffItems,
            originalItems: originalItems,
            mergedTl: changed ? finalTl : read.tlText,
            status: status,
            feedback: feedback
        };

        tlImporter_storeDiff( viewData );
    }

    if( !changed ) {
        // Nothing to show changes OF - the block itself says so, right away.
        tlImporter_renderDiffView( viewData );
        return;
    }

    // "Show changes" is the review the whole flow is built around, so it is clicked for the
    // user - and up to that click Save/Preview are locked, so a blocked click cannot leave a
    // form where unreviewed changes could be saved blind. The page behind the click has both
    // buttons back.
    var diffBtn = $( "#wpDiff, [name='wpDiff']" ).first();

    if( diffBtn.length ) {
        $( "#wpSave, [name='wpSave'], #wpPreview, [name='wpPreview']" )
            .prop( "disabled", true )
            .addClass( "mdb-tlImporter-locked" )
            .attr( "title", 'Check the imported tracklist first - "Show changes" opens the diff.' );

        // a timeout of 0 lands behind every other ready handler of this tick (the toolkit's
        // siteHasTl block among them), like the helper script's auto preview
        setTimeout(function() {
            // the element's own click, so the browser submits the form WITH this button
            diffBtn[0].click();
        }, 0 );
    } else {
        log( "tlImporter: no \"Show changes\" button found - showing the review block instead." );
        tlImporter_renderDiffView( viewData );
    }
}

// tlImporter_diffIsEmpty
// Did MediaWiki's "Show changes" come back with an unchanged page? True only when a diff was
// actually rendered AND it holds no change - "Show preview" renders no diff at all, and there
// the candidate view is still wanted.
function tlImporter_diffIsEmpty() {
    // MediaWiki wraps its own "(No difference)" message in .mw-diff-empty
    if( $( ".mw-diff-empty" ).length ) return true;

    var diff = $( "table.diff" ).first();

    if( !diff.length ) return false;

    // fallback for a skin that renders the diff table without that message: a diff that
    // changes something always has an added or a deleted line in it
    return diff.find( ".diff-addedline, .diff-deletedline" ).length === 0;
}

// tlImporter_renderStoredDiff
// The review block on the pages the form buttons lead to (action=submit) - and the cleanup of
// a stored block that no longer belongs to anything.
function tlImporter_renderStoredDiff() {
    var stored = tlImporter_readStoredDiff();

    if( !stored ) return;

    var action = getURLParameter( "action" ),
        sameArticle = stored.articleId && stored.articleId === tlImporter_articleId();

    // a plain edit form opened later has nothing to do with the import any more
    if( action == "edit" && !getURLParameter( "mdbTlImporter" ) ) {
        if( sameArticle ) tlImporter_clearStoredDiff();
        return;
    }

    if( action != "submit" || !sameArticle ) return;

    if( Date.now() - stored.t > tlImporter_storageMaxAgeMs ) {
        tlImporter_clearStoredDiff();
        return;
    }

    if( !$( "#wpTextbox1" ).length ) return;

    // The fallback behind the link-side check: when MediaWiki's own compare says the page text
    // does not change, the review block has nothing left to say - it would only repeat what
    // the edit box already holds. Clearing it also keeps it away from a "Show preview" after.
    if( tlImporter_diffIsEmpty() ) {
        log( "tlImporter: the compare shows no difference - dropping the review block." );
        tlImporter_clearStoredDiff();
        return;
    }

    tlImporter_loadCss();
    tlImporter_renderDiffView( stored );
}

d.ready(function() {
    if( typeof domain === "undefined" || domain != "mixesdb.com" ) return;

    tlImporter_runEditPage();
    tlImporter_renderStoredDiff();
});

log( "tracklist_importer/funcs.js loaded" );
