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
 *     mode: no tracklist yet -> "Insert", existing tracklist -> "Merge"
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
 *   - below the edit box a diff view shows the candidate with everything the merge did NOT
 *     use highlighted – kept across "Show changes"/"Show preview" via sessionStorage
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

            editLink.before( importLink, reportLink );

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
// carried our parameters is gone afterwards, and the diff view has to survive that.
function tlImporter_storeDiff( diffItems, mode, unchanged ) {
    try {
        sessionStorage.setItem( tlImporter_storageKey, JSON.stringify({
            articleId: tlImporter_articleId(),
            mode: mode,
            unchanged: !!unchanged,
            t: Date.now(),
            items: diffItems
        }) );
    } catch( e ) {
        log( "tlImporter: could not store the diff view (" + e.message + ") - it will not survive Show changes." );
    }
}

// tlImporter_readStoredDiff
function tlImporter_readStoredDiff() {
    try {
        return JSON.parse( sessionStorage.getItem( tlImporter_storageKey ) || "null" );
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

// tlImporter_renderDiffView
// The candidate under the edit box, with everything the merge did NOT use highlighted - and
// nothing else: blanks were dropped by the parser and gaps never carry salvageable text, so
// neither is ever highlighted.
function tlImporter_renderDiffView( items, unchanged ) {
    if( !items || !items.length ) return;
    if( $( "#mdb-tlImporter-diff" ).length ) return;

    var wrap = $( '<div id="mdb-tlImporter-diff" class="mdb-element"></div>' ),
        head = $( '<div class="mdb-tlImporter-diff-head"></div>' ),
        pre = $( '<pre class="mdb-tlImporter-diff-pre"></pre>' );

    head.append( $( "<strong></strong>" ).text( "Tracklist Importer: the candidate tracklist" ) );
    head.append( $( '<span class="mdb-tlImporter-diff-legend"></span>' ).text(
        unchanged
            ? " – the merge took nothing from it, the page text was left unchanged."
            : " – highlighted parts were NOT used by the merge; salvage them by hand if they are worth it."
    ) );

    items.forEach(function( item, i ) {
        if( i > 0 ) pre.append( document.createTextNode( "\n" ) );

        if( item.type !== "track" ) {
            pre.append( document.createTextNode( "..." ) );
            return;
        }

        var use = item.use || {};

        function part( text, used, trailingSpace ) {
            if( !text ) return;

            if( used ) {
                pre.append( document.createTextNode( text ) );
            } else {
                pre.append( $( '<span class="mdb-tlImporter-unused"></span>' ).text( text ) );
            }

            if( trailingSpace ) pre.append( document.createTextNode( " " ) );
        }

        part( item.cue ? "[" + item.cue + "]" : "", use.cue !== false, true );
        part( item.text, use.text !== false, !!item.label );
        part( item.label ? "[" + item.label + "]" : "", use.label !== false, false );
    });

    wrap.append( head, pre );

    // below the edit box: behind the indicator row when the extension rendered one, right
    // behind the textarea otherwise
    var anchor = $( ".textareaBottomInfo" ).first();

    if( !anchor.length ) anchor = $( "#wpTextbox1" ).first();
    if( !anchor.length ) return;

    anchor.after( wrap );
}

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
        changed = mergeRes.changed;

        if( changed ) {
            // The raw merge result goes through the TLE API once: it decides the "#" numbering
            // (and with it the <list> question) and hands back the verdict for the category.
            var resMerge = apiTracklist( mergeRes.mergedText, "standard" );

            finalTl = resMerge.text || mergeRes.mergedText;
            status = resMerge.feedback && resMerge.feedback.status ? resMerge.feedback.status : "";
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

    // The diff view data survives the form POSTs behind "Show changes"/"Show preview".
    if( diffItems ) tlImporter_storeDiff( diffItems, mode, !changed );

    if( !changed ) {
        // Nothing to show changes OF - the view itself says so, right away.
        tlImporter_renderDiffView( diffItems, true );
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
        log( "tlImporter: no \"Show changes\" button found - showing the candidate view instead." );
        tlImporter_renderDiffView( diffItems, false );
    }
}

// tlImporter_renderStoredDiff
// The diff view on the pages the form buttons lead to (action=submit) - and the cleanup of a
// stored view that no longer belongs to anything.
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

    tlImporter_loadCss();
    tlImporter_renderDiffView( stored.items, stored.unchanged );
}

d.ready(function() {
    if( typeof domain === "undefined" || domain != "mixesdb.com" ) return;

    tlImporter_runEditPage();
    tlImporter_renderStoredDiff();
});

log( "tracklist_importer/funcs.js loaded" );
