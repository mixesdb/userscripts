/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Tracklist Importer (beta) – the DOM half
 *
 * Carries a tracklist a player-site userscript found (TLE-formatted, sitting in the shared
 * tracklist box) over to the MixesDB mix page the toolkit's player search matched. Two sides,
 * both living in this one file because the SAME userscript runs on both domains:
 *
 * On the player site (TrackId.net and 1001 Tracklists so far):
 *   - when the toolkit says the player is used on MixesDB AND the page has a filled tracklist
 *     box, the mix page's wikitext is fetched and its "== Tracklist ==" section decides the
 *     mode: no tracklist yet -> "Insert", existing tracklist -> "Merge", a tracklist split
 *     into chapters -> "Chaptered" (the review block without a merge, for the hand-merge), a
 *     tracklist the candidate cannot add anything to -> no link at all
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
 *   - chaptered: nothing is written and nothing is clicked - the review block opens with the
 *     page's tracklist, an empty Merged box and the candidate, and the merge is done by hand
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

// tlImporter_noMergeVerdicts
// Every reason the importer stops before it can offer an Insert/Merge link. Each one gets a
// note in the link's place and a Report link behind it - an action row that just stays empty
// is indistinguishable from a broken userscript, and the reader is left guessing.
//
//   text    what stands in the row
//   title   the tooltip behind it, which carries the actual reason
//   report  how the Report names the verdict
//   merged  whether a merge ran at all - only then may the Report show a merge result
//   link    the one verdict that is a LINK rather than a note (chapters) - it keeps the Report
//           from calling itself "no link" about a row that has one
var tlImporter_noMergeVerdicts = {
    identical: {
        text: "Identical",
        title: "This tracklist and the tracklist of the MixesDB page are the same list - nothing to merge.\nMarked as integrated for you.",
        report: "identical (marked as integrated)",
        merged: true
    },
    contained: {
        text: "Nothing to add",
        title: "The MixesDB page's tracklist already holds everything this tracklist could add - nothing to merge.",
        report: "nothing to add",
        merged: true
    },
    // The one entry that is NOT a note any more: a chaptered page gets a LINK carrying this
    // text and title (see the link builder below), because the hand-merge on the edit page is
    // still worth opening. The report half is unchanged - and `merged: false` still keeps the
    // Report from inventing a merge result nobody was shown.
    chapters: {
        text: "Chaptered",
        title: "The MixesDB page's tracklist is split into chapters (one per set).\nMerging into one of them is not supported yet - this opens the edit form with the page's tracklist and this one side by side, to merge by hand.",
        report: "the mix page tracklist has chapters - a link without a merge",
        merged: false,
        link: true
    },
    // The candidate's twin: on 1001tracklists the FOUND tracklist can itself carry ";Name"
    // chapter rows (multi-set pages), which the merge would swallow as track rows. Same
    // hand-merge link as `chapters` - only the wording says which side the chapters are on.
    // A page that is chaptered too reads `chapters`, the page side outranking this one.
    chaptersCandidate: {
        text: "Chaptered",
        title: "This tracklist is split into chapters (one per set).\nMerging a chaptered tracklist is not supported yet - this opens the edit form with the page's tracklist and this one side by side, to merge by hand.",
        report: "the found tracklist has chapters - a link without a merge",
        merged: false,
        link: true
    },
    noSection: {
        text: "No Tracklist section",
        title: "The MixesDB page has no \"== Tracklist ==\" section - there is nothing to insert into.",
        report: "the mix page has no Tracklist section",
        merged: false
    },
    noPageText: {
        text: "Page unreadable",
        title: "The MixesDB page's text could not be read just now - reload the page to try again.",
        report: "the mix page text could not be read",
        merged: false
    }
};

// tlImporter_makeReportLink
// The Report link. Built here rather than inline, because BOTH outcomes carry one: the
// Insert/Merge link and the "nothing to merge" note. A verdict that turns out to be wrong is
// exactly what needs reporting, so the case without a link must not be the case without a
// report either.
function tlImporter_makeReportLink( mode, originalText, pageId, verdict ) {
    return $( '<a class="mdb-element mdb-mixesdbLink mdb-tlImporter-report" href="#"></a>' )
        .attr( "title", "Open a paste-ready report of this import (original + candidate) for Discord." )
        .data( "mdb-mode", mode )
        .data( "mdb-original", originalText )
        .data( "mdb-mixpageurl", "https://www.mixesdb.com/w/?curid=" + pageId )
        .data( "mdb-verdict", verdict || "" )
        .text( "Report" );
}

// tlImporter_addNoMergeNote
// What stands where the Insert/Merge link would be, for every verdict of the table above.
// "Identical" is the only one that also acts: it is the certain case (tlImporter_sameTracklists
// in merge_core.js), so the toolkit's "TID tracklist is integrated" checkbox is ticked from it.
function tlImporter_addNoMergeNote( wrapper, editLink, verdict, reportLink ) {
    var reading = tlImporter_noMergeVerdicts[ verdict ];

    if( !reading ) return;

    var note = $( '<span class="mdb-element mdb-tlImporter-note"></span>' )
        .attr( "title", reading.title )
        .text( reading.text );

    if( verdict == "identical" ) note.addClass( "mdb-tlImporter-note-identical" );

    // same shape and same divider as the link row: [note Report] | [EDIT HIST]
    editLink.before( note, reportLink, $( '<span class="mdb-element mdb-toolkit-actionDivider"></span>' ) );

    if( verdict == "identical" ) tlImporter_tickIntegrated( wrapper, note );
}

// How long the "Identical" note announces itself before the checkbox is actually ticked. The
// tick is done FOR the reader and it POSTs - so it must not happen behind their back: the note
// fades to green, and the click lands a beat after it got there. Long enough to be seen, short
// enough not to be a wait. Paired with the mdb-tlImporter-noteTick animation in the CSS, which
// is the fade itself - change the one, change the other.
var tlImporter_tickDelayMs = 1000;

// tlImporter_tickIntegrated
// Ticks the toolkit's "TID tracklist is integrated" checkbox of THIS usage row, by clicking
// it: the saving belongs to the site script's own handler (TrackId.net/script.user.js), and a
// silently set property would not reach it.
//
// It has to wait for that handler's own answer first. The checkbox arrives hidden and is only
// shown once the check request came home - and that answer may be "already integrated", which
// replaces the input with the check mark, or "no such player", which replaces the whole
// wrapper with a sentence. So: poll for a VISIBLE input, stop as soon as the input is gone,
// and give up after ~15s (every site but TrackId.net never shows the wrapper at all).
function tlImporter_tickIntegrated( wrapper, note ) {
    var tries = 0,
        timer = setInterval(function() {
            var box = wrapper.find( "input.mdbTrackidCheck" );

            if( ++tries > 50 || !box.length || !wrapper.closest( "body" ).length ) {
                clearInterval( timer );
                return;
            }

            if( !box.is( ":visible" ) ) return; // the check request has not answered yet

            clearInterval( timer );

            if( box.prop( "checked" ) ) return;

            log( "tlImporter: the two tracklists are identical - ticking the integrated checkbox in " + tlImporter_tickDelayMs + "ms." );

            note.addClass( "mdb-tlImporter-note-ticking" );

            setTimeout(function() {
                note.removeClass( "mdb-tlImporter-note-ticking" );

                // the reader had those seconds to tick it themselves - or to navigate on
                if( !box.closest( "body" ).length || box.prop( "checked" ) ) {
                    log( "tlImporter: the integrated checkbox was handled meanwhile - not ticking it." );
                    return;
                }

                box[0].click(); // native, so the site script's own click handler does the saving

                note.addClass( "mdb-tlImporter-note-ticked" );
            }, tlImporter_tickDelayMs );
        }, 300 );
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

        // the one stop that stays silent: without the EDIT link there is nothing to hang a
        // note on, and without the page id nothing to report about
        if( !editLink.length || !pageId ) {
            log( "tlImporter: no EDIT link / no curid in it - no import link." );
            return;
        }

        // Every other stop says why, in the link's place, with the Report link behind it -
        // see tlImporter_noMergeVerdicts.
        function noLink( verdict, mode, originalText ) {
            log( "tlImporter: no import link for page " + pageId + " - " + tlImporter_noMergeVerdicts[ verdict ].report + "." );

            tlImporter_loadCss();
            tlImporter_addNoMergeNote( jNode, editLink, verdict,
                tlImporter_makeReportLink( mode, originalText, pageId, verdict ) );
        }

        // Two async steps deep on an SPA: drop the answer when the user has clicked on.
        var pageGeneration = typeof mdbPageGeneration !== "undefined" ? mdbPageGeneration : null;

        tlImporter_fetchPageText( pageId, function( pageText ) {
            if( pageGeneration !== null && typeof mdbIsCurrentPage === "function" && !mdbIsCurrentPage( pageGeneration ) ) return;
            if( !jNode.closest( "body" ).length ) return; // the toolkit was rebuilt meanwhile

            if( !pageText ) {
                noLink( "noPageText", "", "" );
                return;
            }

            var read = tlImporter_extractTracklist( pageText );

            if( !read.hasSection ) {
                noLink( "noSection", "", "" );
                return;
            }

            var mode = read.hasTracks ? "merge" : "insert",
                // Chapters (";Name" rows) have no merge logic yet - but they DO have a link:
                // it opens the edit form with the page's tracklist and the candidate side by
                // side, so the merge can be done by hand there (tlImporter_runEditPage writes
                // nothing into the page for it). Detected again on the edit page from the LIVE
                // text, so the mode in the URL stays plain "merge". BOTH sides are tested: on
                // 1001tracklists the CANDIDATE can be the chaptered one (multi-set pages), and
                // a merge would swallow its ";Name" rows as track rows. Inserting a chaptered
                // candidate into an empty section stays a plain Insert - verbatim is exactly
                // right there.
                pageChapters = mode == "merge" && /^\s*;/m.test( read.tlText ),
                candidateChapters = mode == "merge" && /^\s*;/m.test( tlImporter_candidateText() ),
                chaptered = pageChapters || candidateChapters,
                // the page side outranks the candidate side in the wording - see the table
                chapterVerdict = pageChapters ? "chapters" : "chaptersCandidate";

            // A merge that would change nothing is not worth a link: following it would only
            // open the edit form on MediaWiki's "(No difference)". The merge itself is the
            // answer - pure JS, no network - and the candidate is re-read from the box here,
            // because the page text fetch above was async. A note takes the link's place, so
            // the row does not read as "the importer never ran" - see tlImporter_addNoMergeNote.
            var mergeTry = ( mode == "merge" && !chaptered ) ? tlImporter_merge( read.tlText, tlImporter_candidateText() ) : null;

            if( mergeTry && !mergeTry.changed ) {
                noLink( mergeTry.identical ? "identical" : "contained", mode, read.tlText );
                return;
            }

            tlImporter_loadCss();

            // the chaptered link keeps the verdict as its label and tooltip - it is not an
            // import, it is the way to the hand-merge, and the row must not promise a Merge
            // that never runs
            var importLink = $( '<a class="mdb-element mdb-mixesdbLink mdb-tlImporter-link"></a>' )
                .attr( "href", editHref ) // placeholder - the real href is built at click time
                .attr( "target", "_blank" )
                .attr( "data-mdb-importmode", mode )
                .attr( "title", chaptered
                    ? tlImporter_noMergeVerdicts[ chapterVerdict ].title
                    : mode == "merge"
                        ? "Merge this tracklist into the tracklist the MixesDB page already has.\nOpens the edit form with the merge applied and shows the changes."
                        : "Insert this tracklist into the MixesDB page, which has none yet.\nOpens the edit form with the tracklist filled in and shows the changes." )
                .text( chaptered
                    ? tlImporter_noMergeVerdicts[ chapterVerdict ].text
                    : mode == "merge" ? "Merge" : "Insert" );

            if( chaptered ) importLink.addClass( "mdb-tlImporter-link-chapters" );

            var reportLink = tlImporter_makeReportLink( mode, read.tlText, pageId, chaptered ? chapterVerdict : "" );

            // the divider (styled in global.css) groups our two links apart from EDIT/HIST -
            // its twin between HIST and the integrated checkbox comes with the toolkit markup
            editLink.before( importLink, reportLink, $( '<span class="mdb-element mdb-toolkit-actionDivider"></span>' ) );

            log( "tlImporter: added " + ( chaptered ? "Chaptered" : mode == "merge" ? "Merge" : "Insert" ) + " link for page " + pageId
                + ( chaptered ? " (the " + ( pageChapters ? "page tracklist" : "found tracklist" ) + " has chapters - no merge, the link opens the hand-merge)" : "" ) );
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
        reading = tlImporter_noMergeVerdicts[ link.data( "mdb-verdict" ) ] || null,
        candidate = tlImporter_candidateText(),
        fence = "```",
        lines = [];

    lines.push( "## Tracklist Importer" );
    lines.push( "" );
    lines.push( "* Page URL: " + location.href );
    lines.push( "* Mix page: " + mixPageUrl );

    if( mode ) lines.push( "* Mode: " + mode );

    // only the outcomes with a verdict carry one - it IS the thing being reported there
    if( reading ) lines.push( "* Verdict: " + ( reading.link ? "" : "no link, " ) + reading.report );

    if( original ) {
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

    // only where a merge actually ran: on a chaptered or unreadable page it never did, and
    // running it here would invent a result nobody was ever shown
    if( mode == "merge" && original && candidate && ( !reading || reading.merged ) ) {
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
    lines.push( fence );
    lines.push( "" );
    lines.push( fence );

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

// Whether THIS userscript instance won the claim for the mixesdb.com side - see the d.ready
// block at the bottom. False on the player sites (each has one script, nothing to claim) and
// in every instance that lost, whose delegated handlers must sit still: the elements they
// serve were rendered by the winner, and two sandboxes answering one Apply press would run
// the apply twice.
var tlImporter_ownsEditPage = false;

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
// TLE answer for it) - plus chapters for the no-merge reading of the block. The version stamp
// keeps a payload from an older script generation from reaching the new renderer.
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
 * Three equal thirds are a starting point, not an answer: which of the columns needs the room
 * depends on the merge in front of the reader. A long original with short candidate lines wants
 * a wide Original, hand-salvaging in the Merged box wants that one wide.
 *
 * So the two gaps between the columns are grab bars: drag to move the border between the two
 * columns next to it, double-click to give all three the same width again.
 *
 * Deliberately NOT remembered: every merge is its own case, and a block that opens with the
 * widths of the page before it starts by lying about this one. The reset is the page load.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlImporter_colSizesDefault = [ 1, 1, 1 ],
    // no column may be dragged narrower than this, in px - below it the box shows single
    // words per line and the handle can no longer be grabbed back out
    tlImporter_colMinPx = 120;

// tlImporter_applyColSizes
// The three ratios as the grid's own template, the two handle columns fixed between them. The
// fr unit is proportional, so feeding it pixel numbers straight from the drag lands the
// columns on exactly those pixels.
function tlImporter_applyColSizes( cols, sizes ) {
    cols.css( "grid-template-columns",
        "minmax(0, " + sizes[0] + "fr) auto minmax(0, " + sizes[1] + "fr) auto minmax(0, " + sizes[2] + "fr)" );
}

/*
 * tlImporter_alignResizers
 *
 * The rail drawn on a grab bar covers the BOXES it sits between, nothing else. The bar itself
 * spans the whole column - it has to, or the drag would only work next to the text - but a line
 * running past the headings at the top and past the feedback box and Apply button at the bottom
 * draws a border through the block where there is none.
 *
 * Measured rather than stated: the two heading lines are one line each until a skin's font says
 * otherwise, and the boxes' height is the merge's row count. The numbers go to the CSS as
 * custom properties on each bar, so the rail stays one ::before with no extra elements.
 *
 * Re-run whenever the geometry can have changed: after the block is on the page, after a drag
 * (a narrower column wraps its lines and grows), after the widen toggle and on a window resize.
 */
function tlImporter_alignResizers( cols ) {
    if( !cols || !cols.length ) return;

    var raf = window.requestAnimationFrame || function( fn ) { return setTimeout( fn, 16 ); };

    // next frame, never straight away: called from a render the browser has not laid out yet,
    // getBoundingClientRect() answers about the layout BEFORE it - once seen as a rail running
    // down the whole page, measured while the stylesheet was still on its way
    raf(function() {
        var node = cols.get( 0 ),
            box = cols.find( ".mdb-tlImporter-col" ).first().find( "pre.mdb-tlImporter-pre" ).first();

        if( !node || !box.length || !$.contains( document.documentElement, node ) ) return;

        var colsRect = node.getBoundingClientRect(),
            rect = box.get( 0 ).getBoundingClientRect(),
            top = Math.round( rect.top - colsRect.top ),
            height = Math.round( rect.height );

        // a measurement that cannot be true is dropped rather than drawn: the rail lives inside
        // the block, so it starts at or after the block's top and ends at or before its bottom
        if( height <= 0 || top < 0 || top + height > Math.round( colsRect.height ) + 1 ) return;

        cols.children( ".mdb-tlImporter-col-resizer" ).css({
            "--mdb-rail-top": top + "px",
            "--mdb-rail-height": height + "px"
        });
    });
}

// tlImporter_addColResizers
// The two grab bars, and the dragging behind them. Sizes are read off the LIVE pixel widths at
// mousedown: the reader may have resized the window since the block was built, and a ratio says
// nothing about how wide a third of it is now.
function tlImporter_addColResizers( cols ) {
    var columns = cols.children( ".mdb-tlImporter-col" );

    if( columns.length !== 3 ) return;

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

            // narrower columns wrap more lines and grow taller - the rails follow the boxes
            tlImporter_alignResizers( cols );
        }

        $( document ).on( "mousemove", onMove ).on( "mouseup", onUp );
    });

    // back to three equal columns - the way out of any drag that went wrong
    cols.on( "dblclick", ".mdb-tlImporter-col-resizer", function() {
        tlImporter_applyColSizes( cols, tlImporter_colSizesDefault );
        tlImporter_alignResizers( cols );
        log( "tlImporter: column widths reset to equal thirds." );
    });
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Full width for the review block
 *
 * MediaWiki's content column is the width of an article, and three tracklists side by side
 * are not an article. The button in the block's top left corner takes the block out of that
 * column - to the LEFT only: it grows over whatever the skin has parked there (sidebar,
 * tools) and keeps its right edge exactly where the content column ends. The room is on the
 * left, so that is the only side that moves; a block reaching past the article's right edge as
 * well would only make the page look broken. Click again to give the width back. Unlike the
 * column widths, this one IS kept per browser: it says how wide the reader's window is, which
 * is the same answer on the next mix page - the widths say something about one merge only.
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

    // width/height as ATTRIBUTES, not left to the CSS: this file arrives through @require and
    // the stylesheet through loadRawCss(), so the two can be a cache generation apart - and an
    // <svg> with nothing but a viewBox collapses to nothing, which is an empty button
    return '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" '
        + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + arrows + '</svg>';
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

    var cols = wrap.find( ".mdb-tlImporter-cols" ).first();

    var button = wrap.find( ".mdb-tlImporter-wide-toggle" ).first();

    button
        .html( tlImporter_wideIcon( wide ) )
        .attr( "title", wide
            ? "Back into the page's content column."
            : "Stretch this block to the left, over the sidebar." );

    if( !wide ) {
        tlImporter_alignResizers( cols );
        return;
    }

    var rect = wrap.get( 0 ).getBoundingClientRect(),
        // how much room there is between the block and the window's left edge - all of it is
        // taken, minus the bit of air, and the right edge is left alone
        gain = rect.left - tlImporter_widePad;

    if( gain <= 0 ) return; // nothing to win: the block already starts at the window edge

    wrap.css({
        marginLeft: -gain + "px",
        width: ( rect.width + gain ) + "px"
    });

    // wider columns hold more per line, so the boxes shrink - the rails follow them
    tlImporter_alignResizers( cols );
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
        log( "tlImporter: review block " + ( wide ? "stretched to the left window edge." : "back in the content column." ) );
    });

    var resizeTimer;

    $( window ).on( "resize.mdbTlImporterWide", function() {
        clearTimeout( resizeTimer );
        resizeTimer = setTimeout(function() {
            // gone with an SPA-style cleanup or a reload: nothing left to re-measure
            if( !$.contains( document.documentElement, wrap.get( 0 ) ) ) {
                $( window ).off( "resize.mdbTlImporterWide" );
                return;
            }

            // a stretched block is measured against the new window; either way the boxes have
            // a new height now and the grab bars' rails have to match it again
            if( wrap.hasClass( "mdb-tlImporter-wide" ) ) tlImporter_applyWide( wrap, true );
            else tlImporter_alignResizers( wrap.find( ".mdb-tlImporter-cols" ).first() );
        }, 150 );
    });
}


// tlImporter_alignToggles
// Center the two corner toggles on the fieldset's border line - the line the legend sits on.
// The stylesheet's top: -22px is right for the anchor Chromium gives absolutely positioned
// children of a fieldset (the content box, BELOW the legend), but that anchor is not
// interoperable - engines have used the border box too - so the value is checked against the
// legend's real center, which IS the border line by construction, and nudged by the measured
// difference. Idempotent: a second run measures an offset of ~0 and changes nothing, which is
// why the down toggle (added later, when the site's editor section arrives) can simply call
// it again. Skipped while the button is not absolutely positioned yet: the CSS arrives
// through loadRawCss() and measuring a still-in-flow button would turn the nudge into noise.
function tlImporter_alignToggles( wrap ) {
    var legend = wrap.children( "legend" ).get( 0 );

    if( !legend ) return;

    var box = legend.getBoundingClientRect(),
        lineY = box.top + box.height / 2;

    wrap.children( ".mdb-tlImporter-wide-toggle, .mdb-tlImporter-down-toggle" ).each(function() {
        if( window.getComputedStyle( this ).position !== "absolute" ) return;

        var b = this.getBoundingClientRect(),
            off = lineY - ( b.top + b.height / 2 );

        // below one pixel is rendering noise; a real anchor difference is several
        if( Math.abs( off ) > 1 ) {
            $( this ).css( "top", ( parseFloat( $( this ).css( "top" ) ) || 0 ) + off + "px" );
        }
    });
}


// tlImporter_placeDiffBlock
// The block's home position: above the wiki edit box, below MediaWiki's diff. The diff
// container can sit outside or inside form#editform depending on the MediaWiki version and
// the "preview on top" preference, so the block goes right AFTER the diff wherever the diff
// stands above the box - and right before the form (or the box itself) on pages without one.
// Its own function because the down toggle below moves the block away and has to be able to
// put it back exactly where the render would have.
function tlImporter_placeDiffBlock( wrap ) {
    var textbox = $( "#wpTextbox1" ).first(),
        diffBox = $( "#wikiDiff" ).first();

    if( !diffBox.length ) diffBox = $( "table.diff" ).first();

    if( diffBox.length && textbox.length &&
        ( diffBox[0].compareDocumentPosition( textbox[0] ) & Node.DOCUMENT_POSITION_FOLLOWING ) ) {
        diffBox.after( wrap );
        return true;
    }

    var anchor = $( "#editform" ).first();

    if( !anchor.length ) anchor = textbox;
    if( !anchor.length ) return false;

    anchor.before( wrap );
    return true;
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Down to the page's own Tracklist Editor
 *
 * The Merged column is a small Tracklist Editor box, and for real hand work the page has a
 * better one: the site's own full editor section further down the form, with its menu, its
 * find/replace and its undo. The arrow button in the block's top right corner - the twin of
 * the widen toggle in the left one - moves the whole block DOWN, directly above that section
 * (#editToolsBar-TLeditor): the Merged box's text goes into the real #tlEditor-textarea, the
 * now-empty Merged column is hidden, and Original and Candidate stay side by side above the
 * editor - so the merge is read up there and edited down here, the way tracklists were always
 * edited on this form.
 *
 * Below the editor's own action row (#tlEditor-formActions) the block adds what the Merged
 * column had under its box: the Live updates switch and the Apply button. No tracklist state
 * icons - the Merged box shows none either (toolkit_tlStateButtons() skips mixesdb.com
 * entirely): the real ones under the edit box are on this very page, and a second row of
 * them would say the same thing twice.
 *
 * The arrow points up while the block is down; clicking it moves everything back - the text
 * returns to the Merged box exactly as it stands, so toggling never loses an edit. Down is
 * the DEFAULT: a browser that never clicked the arrow gets the full editor as soon as its
 * section arrives. A click is remembered per browser like the widen toggle - either answer,
 * staying up included, is the same answer on the next mix page too.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var tlImporter_downKey = "mdb-tlImporter-down",
    tlImporter_downObserver = null,
    tlImporter_downPollTimer = null,
    tlImporter_downPollMs = 500;

// tlImporter_downIcon
// Two chevrons pointing down while the block is up (click to move it down to the site's
// editor), up while it is down (click to bring it back). Drawn like tlImporter_wideIcon, and
// the width/height attributes are there for the same reason - see that function.
function tlImporter_downIcon( down ) {
    var arrows = down
        ? '<path d="M3 8 L8 3.5 L13 8" /><path d="M3 12.5 L8 8 L13 12.5" />'
        : '<path d="M3 3.5 L8 8 L13 3.5" /><path d="M3 8 L8 12.5 L13 8" />';

    return '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" '
        + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + arrows + '</svg>';
}

// tlImporter_readDown
// No stored value means down - the full editor is the default. Only a clicked toggle writes
// the key (tlImporter_writeDown), so "0" is a real choice - the reader moved the block back
// up once - and keeps winning over the default.
function tlImporter_readDown() {
    try {
        var stored = localStorage.getItem( tlImporter_downKey );

        return stored === null ? true : stored === "1";
    } catch( e ) {
        // storage blocked: nothing can be remembered, so the default (down) applies
        return true;
    }
}

// tlImporter_writeDown
function tlImporter_writeDown( down ) {
    try {
        localStorage.setItem( tlImporter_downKey, down ? "1" : "0" );
    } catch( e ) {}
}

// tlImporter_siteEditor
// The three pieces of the site's own Tracklist Editor section the down state hangs on to.
// All or nothing: they are rendered by mixesdb.com's editor module, so any of them can be
// missing while that module is still loading - or for good, when it changed.
function tlImporter_siteEditor() {
    var bar = $( "#editToolsBar-TLeditor" ).first(),
        box = tlImporter_downBox(),
        actions = $( "#tlEditor-formActions" ).first();

    if( !bar.length || !box.length || !actions.length ) return null;

    return { bar: bar, box: box, actions: actions };
}

// tlImporter_downLiveChip
// The same Live updates switch the feedback boxes carry (tlBoxShowApiCount in
// tracklist_editor/funcs.js), standing alone in the row below #tlEditor-formActions. Same
// classes, so the chip CSS dresses it; same click behaviour, so the one stored choice flips
// every switch on the page together.
function tlImporter_downLiveChip() {
    return $( "<div>" )
        .addClass( "mdb-tlEditor-liveUpdates mdb-element hand" )
        .append(
            $( "<span>" ).addClass( "mdb-tlEditor-liveUpdates-label" ).text( "Live updates" ),
            $( "<span>" ).addClass( "mdb-tlEditor-switch" ).append(
                $( "<span>" ).addClass( "mdb-tlEditor-switch-knob" )
            )
        )
        .on( "click", function() {
            var nowOn = !tlBoxAutoUpdate();

            tlBoxSetAutoUpdate( nowOn );

            // the switches inside the feedback boxes follow the stored choice
            tlBoxShowApiCount();

            // the same catch-up the feedback-box switch does: re-render the shown answers
            // ("No changes were made." belongs to one state and not the other), and check
            // what is already typed when the click switched ON - it asked for an answer
            $( "textarea[data-mdb-tlbox-live]" ).each(function() {
                var box = $( this ),
                    shown = box.nextAll( "#tlEditor-feedback" ).first().data( "mdbFeedbackHtml" );

                if( shown ) tlBoxSetFeedbackHtml( box, String( shown ).replace( /^(live|static):/, "" ) );

                if( nowOn ) tlBoxTypeUpdate( box );
            });
        });
}

// tlImporter_syncDownLive
// The standalone switch is not inside a feedback box, so tlBoxShowApiCount() never refreshes
// it - this does, from the same stored choice. The document-level click below catches the
// switches in the feedback boxes flipping that choice, so the two can never show different
// states. Runs AFTER the clicked switch's own handler by construction: the handler is bound
// on the element, this one on the document the click bubbles up to.
function tlImporter_syncDownLive() {
    var on = tlBoxAutoUpdate();

    $( "#mdb-tlImporter-downActions .mdb-tlEditor-liveUpdates" )
        .toggleClass( "mdb-tlEditor-liveUpdates-on", on )
        .attr( "title", on
            ? "Live updates are ON: after a typing pause the tracklist is checked, the feedback follows it and every line except the one being typed on is formatted.\nClick to switch off."
            : "Live updates are OFF: the box is only checked and formatted when you leave it.\nClick to switch on." );
}

$(document).on( "click", ".mdb-tlEditor-liveUpdates", function() {
    // only the instance that claimed the page answers; on the player sites the flag is false
    // too, and rightly - the down chip this syncs exists only on the edit form
    if( !tlImporter_ownsEditPage ) return;

    tlImporter_syncDownLive();
});

// tlImporter_downBox
// The site's own editor box, looked up fresh on every single call and never kept: it belongs
// to mixesdb.com's editor module, which may rebuild it, and a held reference would read a
// dead node. Everything down here goes through this one lookup, so the text a click applies
// and the text its wake state was decided from can never be two different textareas.
function tlImporter_downBox() {
    return $( "#tlEditor-textarea" ).first();
}

// tlImporter_refreshDownApply
// The down Apply button's wake/sleep - and deliberately NOT the comparison against what was
// last applied that the Merged column's button uses (tlImporter_watchApplyButton).
//
// Down here the text is changed by the site's OWN editor tools, and none of them fires an
// input event: the menu buttons and find/replace write el.value straight out, the dropdown
// and the format buttons only when their API answer comes home, half a second or more after
// the click. A wake state read from a polled snapshot is therefore always a little behind
// what is on screen, and being behind has exactly the two shapes that were reported: the
// button is still asleep when it is clicked and does NOTHING, or it is awake from an earlier
// edit and applies the text that stood there before the tool ran - the unchanged merge.
//
// So the button asks nothing about the content any more. It is awake whenever the box holds
// text, and WHAT it applies is read out of the box at click time (see the handler below).
// The price is that it no longer says "nothing to apply" after an apply; re-applying the same
// text is a no-op, where a button that would not react to a click is a bug report.
function tlImporter_refreshDownApply() {
    var button = $( "#mdb-tlImporter-apply-down" );

    if( !button.length ) return;

    var box = tlImporter_downBox(),
        ready = !!box.length && $.trim( box.val() || "" ) !== "";

    button
        .prop( "disabled", !ready )
        .toggleClass( "mdb-tlImporter-locked", !ready )
        .attr( "title", ready
            ? "Replace the page's tracklist with the editor's text as it stands right now, and update the \"Tracklist:\" category and its icons.\nThe Tracklist Editor is asked once for the verdict on the way - the text itself is not changed."
            : "Nothing to apply: the editor's box is empty." );
}

// Typing is the fast path: delegated on the document, so it still fires when the site's
// editor module replaces its textarea. The poll in tlImporter_addDownActions is the half no
// event can cover - the editor's own tools (menu buttons, undo, find/replace) set the value
// programmatically, and a programmatic write fires no input event. Both only decide empty or
// not now, so neither of them can be the reason a click does nothing.
$(document).on( "input.mdbTlImporterDown", "#tlEditor-textarea", function() {
    // only the instance that claimed the page answers - see tlImporter_ownsEditPage
    if( !tlImporter_ownsEditPage ) return;

    tlImporter_refreshDownApply();
});

// tlImporter_addDownActions
// The row below the editor's #tlEditor-formActions: the Apply button and the Live updates
// switch - what the Merged column has under its box. No tracklist state icons here either:
// the real ones under the edit box are on this very page, and toolkit_tlStateButtons() skips
// every feedback box on mixesdb.com anyway, the review block's included.
function tlImporter_addDownActions( ed ) {
    if( $( "#mdb-tlImporter-downActions" ).length ) return;

    var row = $( '<div id="mdb-tlImporter-downActions" class="mdb-element"></div>' ),
        applyButton = $( '<button id="mdb-tlImporter-apply-down" class="hand oo-ui-inputWidget-input oo-ui-buttonElement-button" type="button">Apply</button>' );

    row.append( applyButton, tlImporter_downLiveChip() );
    ed.actions.after( row );

    tlImporter_refreshDownApply();

    // the poll behind the delegated input handler above - every value change wakes or sleeps
    // the button within half a second, however it was made. Cleared on the way up
    // (tlImporter_applyDown), and clears itself should the row leave the page another way.
    if( tlImporter_downPollTimer ) clearInterval( tlImporter_downPollTimer );

    tlImporter_downPollTimer = setInterval(function() {
        if( !$.contains( document.documentElement, row.get( 0 ) ) ) {
            clearInterval( tlImporter_downPollTimer );
            tlImporter_downPollTimer = null;
            return;
        }

        tlImporter_refreshDownApply();
    }, tlImporter_downPollMs );

    tlImporter_syncDownLive();
}

// tlImporter_applyDown
// The move itself, in either direction. The text always travels with the block - down it
// goes from the Merged box into the site's editor, up it comes back exactly as it stands, so
// toggling never loses an edit. mdbTlboxKnown travels along, so the blur update stays as
// quiet or as eager as it was in the box the text came from.
function tlImporter_applyDown( wrap, down ) {
    wrap = $( wrap ).first();

    var ed = tlImporter_siteEditor();

    if( !wrap.length || !ed ) return;

    var midBox = wrap.find( "textarea.mixesdb-TLbox" ).first(),
        button = wrap.find( ".mdb-tlImporter-down-toggle" ).first();

    if( !midBox.length ) return;

    button
        .html( tlImporter_downIcon( down ) )
        .attr( "title", down
            ? "Move the review back up above the edit box, with the Merged column between Original and Candidate."
            : "Move the review down to the page's own Tracklist Editor: the Merged text goes into the editor itself, Original and Candidate stay side by side above it." );

    if( down ) {
        var text = midBox.val() || "";

        // the CSS hides the Merged column and both grab bars behind the class; the body
        // class scopes the down-only page rules (#editform's air, the feedback close)
        wrap.addClass( "mdb-tlImporter-down" );
        $( "body" ).addClass( "mdb-tlImporter-down" );

        // Park the hidden Merged column's feedback box id while the block stands ABOVE the
        // site's editor section. mixesdb.com's own module clears "the" feedback box with a
        // bare $('#tlEditor-feedback') - getElementById, the FIRST match in the document -
        // before appending its answer under its textarea. With our hidden box first in
        // document order, every editor button press ("Standard", Cap, undo ...) removed OURS
        // and left the box under the textarea standing, so the answers stacked up as doubles
        // (reported: "Standard" with no changes showed two feedback boxes). Parked, the first
        // match IS the box under the site's textarea, and the site's remove-then-append stays
        // the swap it was meant to be. The box itself stays put, content and all - only the
        // id travels, and it comes back on the way up.
        var parked = wrap.find( "#tlEditor-feedback" ).attr( "id", "mdb-tlImporter-feedback-parked" );

        if( parked.length ) log( "tlImporter: parked the Merged column's feedback box id for the down state." );

        // Directly below the wiki's own Save/Preview row: the block first, the whole editor
        // section (ed.bar wraps the site's fieldset) moved up right after it - both jump
        // over the toolbar rows and the TrackId box that normally stand between the buttons
        // and the editor. A hidden marker keeps the editor's home spot, so the way up is an
        // exact restore. .editButtons is the last child of .editOptions, so "after
        // .editOptions" IS directly below the buttons.
        var buttons = $( ".editButtons" ).first(),
            anchor = buttons.closest( ".editOptions" );

        if( !anchor.length ) anchor = buttons;

        if( anchor.length ) {
            if( !$( "#mdb-tlImporter-tleHome" ).length ) {
                ed.bar.before( $( '<span id="mdb-tlImporter-tleHome" class="mdb-element" style="display:none"></span>' ) );
            }

            anchor.after( wrap );
            wrap.after( ed.bar );
        } else {
            // no buttons row to stand under - above the editor is still the right place
            ed.bar.before( wrap );
        }

        // the text into the real editor. The known state travels first, so an unedited text
        // is not re-asked on the first blur; the live machinery is bound before the value
        // lands, so the native input event below already reaches it (rows, debounce) - and
        // reaches the site's own module, whose box this is.
        ed.box.data( "mdbTlboxKnown", midBox.data( "mdbTlboxKnown" ) );
        tlBoxBindLive( ed.box );
        ed.box.val( text );
        ed.box.get( 0 ).dispatchEvent( new Event( "input", { bubbles: true } ) );

        midBox.val( "" );

        tlImporter_addDownActions( ed );

        // the li-smashing decorator (see tlImporter_flattenFeedbackList) does not care whose
        // feedback box it wrecks - watch the editor's textarea wrapper while our live and
        // apply renders can put one there
        if( window.MutationObserver && !tlImporter_downObserver ) {
            var host = ed.box.parent().get( 0 );

            if( host ) {
                tlImporter_downObserver = new MutationObserver(function() {
                    tlImporter_flattenFeedbackList( ed.box.parent() );
                });
                tlImporter_downObserver.observe( host, { childList: true, subtree: true } );
            }
        }
    } else {
        var backText = ed.box.val() || "";

        // the parked feedback box gets its real id back with the block - see the down branch
        wrap.find( "#mdb-tlImporter-feedback-parked" ).attr( "id", "tlEditor-feedback" );

        if( tlImporter_downObserver ) {
            tlImporter_downObserver.disconnect();
            tlImporter_downObserver = null;
        }

        if( tlImporter_downPollTimer ) {
            clearInterval( tlImporter_downPollTimer );
            tlImporter_downPollTimer = null;
        }

        // the row goes, its button and switch with it; the live binding on the site's box
        // stays, and stays quiet: the box keeps its text and its known state, so nothing
        // fires until the reader really edits down there again
        $( "#mdb-tlImporter-downActions" ).remove();

        // the text back into the Merged box, the known state with it; the input trigger
        // re-sizes the box and wakes its Apply watcher
        midBox.data( "mdbTlboxKnown", ed.box.data( "mdbTlboxKnown" ) );
        midBox.val( backText );
        midBox.trigger( "input" );

        // the editor section back to its home spot, marked on the way down
        var home = $( "#mdb-tlImporter-tleHome" );

        if( home.length ) {
            home.after( ed.bar );
            home.remove();
        }

        wrap.removeClass( "mdb-tlImporter-down" );
        $( "body" ).removeClass( "mdb-tlImporter-down" );
        tlImporter_placeDiffBlock( wrap );
    }

    // the block stands somewhere new either way: the stretch is measured from the position,
    // so it is taken again (applyWide re-measures from scratch), and the rails follow
    tlImporter_applyWide( wrap, wrap.hasClass( "mdb-tlImporter-wide" ) );

    log( "tlImporter: review block moved " + ( down ? "down to the site's Tracklist Editor." : "back up above the edit box." ) );
}

// tlImporter_addDownToggle
// The arrow button in the top right corner of the block - the upper right of the Candidate
// column - mirroring the widen toggle in the left one. Only added once the site's own editor
// section is on the page: without a #editToolsBar-TLeditor there is nowhere to move to.
function tlImporter_addDownToggle( wrap ) {
    if( wrap.find( ".mdb-tlImporter-down-toggle" ).length ) return;

    var button = $( '<button type="button" class="mdb-tlImporter-down-toggle mdb-element hand"></button>' )
        .html( tlImporter_downIcon( false ) )
        .attr( "title", "Move the review down to the page's own Tracklist Editor: the Merged text goes into the editor itself, Original and Candidate stay side by side above it." );

    // after the widen toggle, so tabbing walks the two corners left to right
    var wide = wrap.children( ".mdb-tlImporter-wide-toggle" ).first();

    if( wide.length ) wide.after( button ); else wrap.prepend( button );

    // the button arrives long after tlImporter_renderDiffView aligned the widen toggle, so it
    // brings its own centering - a no-op for any toggle already on the line
    tlImporter_alignToggles( wrap );

    button.on( "click", function() {
        var down = !wrap.hasClass( "mdb-tlImporter-down" );

        tlImporter_applyDown( wrap, down );
        tlImporter_writeDown( down );

        // follow the block to where it just went - the toggle is a jump across most of the
        // page, and staying behind leaves the reader looking at the hole it left. Only here,
        // on the click: the remembered state applied at render time must not steal the
        // scroll position from the diff the page opened on.
        var node = wrap.get( 0 );

        if( node ) {
            window.scrollTo({
                top: node.getBoundingClientRect().top + window.pageYOffset - 60,
                behavior: "smooth"
            });
        }
    });
}


/*
 * tlImporter_watchApplyButton
 *
 * The Apply button follows the Merged box: enabled while the box says something else than the
 * page already got, disabled while the two are the same.
 *
 * The baseline is the text the block was built with - the merge result the importer wrote into
 * the wiki edit box before the diff was shown. Comparing against it rather than counting
 * keystrokes means a reader who types something and takes it back finds the button asleep
 * again, and it covers the Tracklist Editor's own re-formatting as well: that is a change to
 * the box like any other, and it IS worth applying.
 *
 * "input" is the event that covers all of it - typing, paste, undo, and the programmatic
 * value changes tracklist_editor/funcs.js triggers after a format.
 */

// what was last applied to the page - the baseline the MERGED column's Apply button sleeps
// against, and the one a newly built one starts from. Later applies reach a button already on
// the page through the mdbApplied event. The DOWN button deliberately does not consult it at
// all - see tlImporter_refreshDownApply.
var tlImporter_applyBaseline = "";

function tlImporter_watchApplyButton( textarea, button, baseline ) {
    function refresh() {
        // trimmed on both sides: a trailing newline the box picked up somewhere is not an edit
        // worth waking the button for, and what Apply writes to the page is trimmed as well
        var changed = $.trim( textarea.val() || "" ) !== $.trim( baseline || "" );

        button
            .prop( "disabled", !changed )
            .toggleClass( "mdb-tlImporter-locked", !changed )
            .attr( "title", changed
                ? "Replace the page's tracklist with this box's text, as it stands, and update the \"Tracklist:\" category and its icons.\nThe Tracklist Editor is asked once for the verdict on the way - the text itself is not changed."
                // an EMPTY baseline is the chaptered case, where nothing was merged and the
                // box is the reader's blank workbench - "the box holds what the merge wrote"
                // would be a sentence about a merge that never ran
                : $.trim( baseline || "" ) === ""
                    ? "Nothing to apply: the box is empty.\nMerge the candidate into the page's tracklist here and the button wakes up."
                    : "Nothing to apply: the box holds exactly what the merge already wrote into the page.\nEdit the box - or let the Tracklist Editor format it - and the button wakes up." );
    }

    // the baseline moves with a successful apply: what was just written to the page is the new
    // "same as the page", so the button sleeps again until the next edit
    button.on( "mdbApplied", function( event, appliedText ) {
        baseline = appliedText;
        refresh();
    });

    textarea.on( "input.mdbTlImporterApply", refresh );

    refresh();
}


// tlImporter_renderDiffView
// The review block: three columns above the wiki edit box (and below MediaWiki's own diff,
// which sits above the form on action=submit) -
//   Original  – the page's tracklist before the merge, the parts the merge changed highlighted
//   Merged    – the shared Tracklist Editor box holding the applied result, editable for final
//               fixes, with the TLE feedback (live updates, API calls, rows, state icons)
//               under it and the Apply button that writes the box back into the page text
//   Candidate – the tracklist the player site found, the parts the merge took highlighted
//
// data.chapters is the no-merge reading of the same block (a chaptered original): nothing was
// merged, so both texts stand there VERBATIM (tlImporter_rawItems) with nothing highlighted,
// the Merged box opens EMPTY as the reader's workbench, and the texts say so instead of talking
// about a merge that never ran.
function tlImporter_renderDiffView( data ) {
    if( !data || !data.items || !data.items.length ) return;
    if( $( "#mdb-tlImporter-diff" ).length ) return;

    var chapters = !!data.chapters,
        // which side carries the ";Name" rows - stored blocks from before chaptersFrom
        // existed carry nothing, and those were always the page side
        chaptersFromCandidate = chapters && data.chaptersFrom == "candidate";

    // a FIELDSET, not a div: the edit form is a column of fieldsets (the site's own
    // "Tracklist editor" among them), and the block reads as one of them, with its name on
    // the border. min-width: 0 in the CSS undoes the fieldset's min-content quirk, or the
    // three columns could not shrink.
    var wrap = $( '<fieldset id="mdb-tlImporter-diff" class="mdb-element"></fieldset>' ),
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
        col( "Original", chapters
            ? ( chaptersFromCandidate
                ? "The tracklist the page has, exactly as it stands. Nothing was merged into it."
                : "The tracklist the page has, exactly as it stands - chapters included. Nothing was merged into it." )
            : "The tracklist the page had before the merge. Highlighted parts were changed." )
            .append( tlImporter_renderPre( data.originalItems, function( item, p ) {
                return item.changed && item.changed[ p ] === true ? "mdb-tlImporter-changed" : "";
            }) )
    );

    // Merged: the shared Tracklist Editor box - CLASS only, never id="tlEditor". The id is
    // free on the player sites, but mixesdb.com's own editor module (ext.mixesdb.editor)
    // renders its own #tlEditor inside the edit form and addresses it as $('#tlEditor') -
    // which jQuery resolves to the FIRST such id in the document. This block sits ABOVE the
    // form, so a duplicate id here caught the site's feedback classes and the site's own
    // feedback box stayed white. The shared TLE code never needs the id when a target is
    // passed: fixTLbox() and every closest() match ".tlEditor" too (Player_Checker and
    // radioeins already ride on the class alone), so the box loses nothing.
    var tlWrapper = $( '<div class="tlEditor"></div>' ),
        textarea = $( '<textarea id="mixesdb-TLbox" class="mixesdb-TLbox mono" spellcheck="false"></textarea>' ),
        applyWrap = $( '<div class="mdb-tlImporter-apply-wrap"></div>' );

    textarea.val( data.mergedTl || "" );

    // the chaptered case arrives with an empty box on purpose - a placeholder is what tells
    // the reader that, and it disappears the moment they start writing
    if( chapters ) {
        textarea.attr( "placeholder", ( chaptersFromCandidate ? "Chaptered tracklist" : "Chaptered page" )
            + " - nothing was merged. Build the tracklist for the whole section here (chapters included), then Apply." );
    }

    tlWrapper.append( textarea );

    // the OOUI classes dress the button like the wiki's own Save/Preview/Diff buttons - their
    // styles are on the edit page anyway, and a foreign-looking button next to them reads as
    // not belonging to the form.
    //
    // Dead on arrival, on purpose: what the box holds at this moment is what the importer
    // already wrote into the page, so applying it would replace the tracklist with itself -
    // an edit that changes nothing, another TLE call, and a button that looks like a step of
    // the workflow when it is not. It wakes up as soon as the text differs from what was
    // applied - by hand or through the Tracklist Editor's own formatting - and goes back to
    // sleep if the reader undoes their change. In the chaptered case the box starts EMPTY, so
    // the very same rule keeps it asleep until the reader has written something.
    var applyButton = $( '<button id="mdb-tlImporter-apply" class="hand oo-ui-inputWidget-input oo-ui-buttonElement-button" type="button">Apply</button>' );

    applyWrap.append( applyButton );
    tlImporter_applyBaseline = data.mergedTl || "";
    tlImporter_watchApplyButton( textarea, applyButton, tlImporter_applyBaseline );

    cols.append(
        col( "Merged", chapters
            ? ( chaptersFromCandidate
                ? "Empty: chaptered tracklists are not merged. Merge by hand here, then Apply - it replaces the whole Tracklist section."
                : "Empty: chaptered pages are not merged. Merge by hand here, then Apply - it replaces the whole Tracklist section." )
            : "The result as applied to the page. Edit final fixes here, then Apply." )
            // named so the down state (tlImporter_applyDown) can hide exactly this column
            .addClass( "mdb-tlImporter-col-merged" )
            .append( tlWrapper, applyWrap )
    );

    // Candidate: green what the merge took over, orange what it could not place - gaps and
    // "?" blanks never carry a salvage flag (see tlImporter_candidateUse), so they stay plain
    cols.append(
        col( "Candidate", chapters
            ? ( chaptersFromCandidate
                ? "The tracklist the player site found, exactly as it stands - chapters included. Nothing is highlighted - no merge ran on this page."
                : "The tracklist the player site found, exactly as it stands. Nothing is highlighted - no merge ran on this page." )
            : "The tracklist the player site found. Green parts were used by the merge, orange parts were not." )
            .append( tlImporter_renderPre( data.items, function( item, p ) {
                if( item.used && item.used[ p ] === true ) return "mdb-tlImporter-used";
                if( item.use && item.use[ p ] === false ) return "mdb-tlImporter-unused";
                return "";
            }) )
    );

    // the two grab bars between the columns, plus the widths the reader last dragged
    tlImporter_addColResizers( cols );

    // the widen toggle. First element after the legend, so tabbing reaches it before the
    // columns - the CSS lifts it out of the flow into the top left corner, over the block's
    // own padding, where it costs neither a line nor a column's width
    tlImporter_addWideToggle( wrap );

    // prepended AFTER the toggle so it stays the fieldset's first child - the legend is what
    // names the block on its border, like the site's own "Tracklist editor" fieldset
    wrap.prepend( chapters
        ? ( chaptersFromCandidate
            ? "<legend><strong>Diff</strong> – chaptered tracklist, nothing was merged</legend>"
            : "<legend><strong>Diff</strong> – chaptered page, nothing was merged</legend>" )
        : "<legend><strong>Diff</strong></legend>" );

    wrap.append( cols );

    if( !tlImporter_placeDiffBlock( wrap ) ) return;

    // only now, with the block on the page, can its distance to the window's left edge be
    // measured - the stored choice is applied from here, not at build time
    tlImporter_applyWide( wrap, tlImporter_readWide() );

    // and only now can the corner toggles be centered on the border line - see the function
    tlImporter_alignToggles( wrap );

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

    // the boxes have their final height only now - the grab bars' rails are drawn to match it
    tlImporter_alignResizers( cols );

    log( "tlImporter: review block rendered (" + ( data.originalItems ? data.originalItems.length : 0 ) + " original rows, "
        + data.items.length + " candidate rows, " + maxRows + " shared rows, TLE status: " + ( data.status || "(none)" ) + ")." );

    // The down toggle waits for the site's own Tracklist Editor section: mixesdb.com renders
    // it through a ResourceLoader module, so it is usually not on the page yet while this
    // block is built. No section, no button - there is nowhere to move to without one. The
    // remembered choice is applied only here, for the same reason: it needs the target.
    function tlImporter_downToggleWhenReady() {
        if( !tlImporter_siteEditor() ) return true; // the rest of the section is still coming

        var block = $( "#mdb-tlImporter-diff" ).first();

        if( !block.length ) return;

        tlImporter_addDownToggle( block );

        if( tlImporter_readDown() && !block.hasClass( "mdb-tlImporter-down" ) ) {
            tlImporter_applyDown( block, true );
        }
    }

    if( typeof waitForKeyElements === "function" ) {
        waitForKeyElements( "#tlEditor-textarea", tlImporter_downToggleWhenReady );
    } else {
        tlImporter_downToggleWhenReady();
    }
}

// tlImporter_clickBox
// Which textarea a click on an Apply button is about: the site's editor box for the down
// button - looked up fresh, see tlImporter_downBox - the Merged box for the other.
function tlImporter_clickBox( id ) {
    return id === "mdb-tlImporter-apply-down"
        ? tlImporter_downBox()
        : $( "#mdb-tlImporter-diff textarea.mixesdb-TLbox" ).first();
}

// tlImporter_applyPress
// One press on an Apply button - the Merged column's, or its twin below #tlEditor-formActions
// while the block is down (tlImporter_addDownActions): the box's current text replaces the
// page's tracklist VERBATIM - what the reader sees in the box is what lands in the wiki edit
// box. The one synchronous TLE call is only asked for its verdict: the "Tracklist:" category
// and the icons follow it, the text does not. The box is marked known and its update sequence
// bumped, so the blur update the press itself triggered (focus leaves the box on mousedown)
// cannot reformat the box afterwards either.
//
// A press can land while the site's OWN editor is mid-request: teApi() marks the box
// "waitingForApi" while one of its buttons is out asking, and writes the answer into the box
// when it comes home - up to a second and a half later. The text on screen during it is the
// one about to be replaced, so it must not be applied - and the press must not be swallowed
// either: the button says "One moment", the box is watched until the class comes off, and the
// settled text is applied then, exactly as if the press had come after the answer. Bounded:
// the site clears the class in a done handler with no fail behind it, so a failed request
// leaves it standing for ever - after ~8s the wait gives up and applies the text as it
// stands, that being the settled text in every way that request is still able to matter.
function tlImporter_applyPress( buttonEl ) {
    var button = $( buttonEl ),
        id = buttonEl.id,
        tl = tlImporter_clickBox( id );

    if( !tl.length ) {
        log( "tlImporter: nothing to apply." );
        return;
    }

    // one wait per button - a second press while the first is still waiting must not stack
    if( button.data( "mdbTlImporterWaiting" ) ) return;

    if( tl.hasClass( "waitingForApi" ) ) {
        log( "tlImporter: the site's editor is still waiting for its own API answer - applying as soon as it lands." );

        button.data( "mdbTlImporterWaiting", true ).text( "One moment" );

        var tries = 0,
            timer = setInterval(function() {
                // fresh lookup per tick - the module may rebuild its textarea
                var box = tlImporter_clickBox( id ),
                    settled = box.length && !box.hasClass( "waitingForApi" ),
                    gaveUp = ++tries >= 40;

                if( !settled && !gaveUp ) return;

                clearInterval( timer );
                button.removeData( "mdbTlImporterWaiting" ).text( "Apply" );

                if( gaveUp && !settled ) {
                    log( "tlImporter: the site's editor never reported its answer - applying the text as it stands." );
                }

                tlImporter_applyNow( button, box );
            }, 200 );

        return;
    }

    tlImporter_applyNow( button, tl );
}

// The Apply buttons act on MOUSEDOWN, and that is the fix for a first press that "did
// nothing", reported after Cap in the down state. The real gesture is mousedown -> blur of
// the previously focused element -> mouseup -> click, and click only fires when down and up
// land on the same spot. After one of the site editor's own API buttons the box sits there
// focused (its answer ends in .select().focus()) with text our machinery has not seen - so
// the mousedown's blur fires tlBoxBlurUpdate: an API call is counted, chips render into the
// feedback box, the white-out goes on, and that synchronous work can move everything under
// the box, the Apply button included, between mousedown and mouseup. The click then never
// fires: the first press only ran the blur round trip (the "animation"), the second press -
// box no longer focused, nothing shifts - worked. Acting on the press ends the dependence on
// where the mouseup lands. And it undercuts the blur entirely: the handler runs BEFORE the
// browser blurs the box, and tlImporter_applyNow refreshes mdbTlboxKnown, so the blur that
// follows finds text == known and stays quiet - no stray API call, no white-out, the box
// keeps looking exactly as the editor's button left it.
$(document).on( "mousedown", "#mdb-tlImporter-apply, #mdb-tlImporter-apply-down", function( e ) {
    // only the instance that claimed the page answers - see tlImporter_ownsEditPage
    if( !tlImporter_ownsEditPage ) return;

    // left button only - a right-click opens the context menu and must not apply
    if( e.which !== 1 ) return;

    // and no focus change out of the press either: the browser's default here is what
    // focuses SOMETHING - the button, or the editor's find field - and an apply should
    // leave the focus alone entirely. tlImporter_applyNow blurs the active element at the
    // end, so after an apply nothing is focused at all.
    e.preventDefault();

    var button = $( this );

    // the click of this same gesture arrives after the mouseup - it must not apply again.
    // Time-bound rather than cleared on click: a press that is dragged off the button before
    // release produces no click at all, and the flag must not then eat a later keyboard one.
    button.data( "mdbTlImporterPressed", true );
    setTimeout(function() { button.removeData( "mdbTlImporterPressed" ); }, 600 );

    tlImporter_applyPress( this );
});

// Keyboard activation (Enter, Space) fires click with no mousedown in front of it - the
// press flag above is what keeps a mouse gesture from applying twice through this handler.
$(document).on( "click", "#mdb-tlImporter-apply, #mdb-tlImporter-apply-down", function() {
    // only the instance that claimed the page answers - see tlImporter_ownsEditPage
    if( !tlImporter_ownsEditPage ) return;

    var button = $( this );

    if( button.data( "mdbTlImporterPressed" ) ) {
        button.removeData( "mdbTlImporterPressed" );
        return;
    }

    tlImporter_applyPress( this );
});

// tlImporter_applyNow
// The apply itself, out of the click handler so the wait above can run it when the site's
// answer has landed. Reads the box HERE, at apply time - what lands in the page is the text
// on screen in this moment, never the one some watcher looked at earlier.
function tlImporter_applyNow( button, tl ) {
    var textbox = $( "#wpTextbox1" ).first(),
        text = $.trim( tl.val() || "" );

    if( !tl.length || !textbox.length || !text ) {
        log( "tlImporter: nothing to apply." );
        return;
    }

    log( "tlImporter: applying the box as it stands - " + text.split( "\n" ).length + " lines, " + text.length + " characters." );

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

    // the box now holds what the page holds, so the Merged button goes back to sleep through
    // mdbApplied (tlImporter_watchApplyButton). The down button stays awake on purpose: it
    // sleeps on an empty box and on nothing else, and applying the same text again changes
    // nothing - see tlImporter_refreshDownApply, which is called here for its title.
    tlImporter_applyBaseline = text;
    $( "#mdb-tlImporter-apply" ).trigger( "mdbApplied", [ text ] );
    tlImporter_refreshDownApply();

    // Nothing stays focused after an apply - not the box the editor's answer focused, not
    // whatever the browser picked. Quiet by construction: mdbTlboxKnown was refreshed above,
    // so blurring the box here cannot start a blur update.
    if( document.activeElement && document.activeElement !== document.body
        && document.activeElement.blur ) {
        document.activeElement.blur();
    }

    // The down button sits a whole editor below the wiki textbox the apply just wrote into -
    // bring the result on screen. The Merged column's button already stands beside it, and a
    // reader salvaging candidate parts up there must not be yanked away on every apply.
    if( button.attr( "id" ) === "mdb-tlImporter-apply-down" ) {
        var tbNode = textbox.get( 0 );

        if( tbNode && tbNode.getBoundingClientRect ) {
            window.scrollTo({
                top: tbNode.getBoundingClientRect().top + window.pageYOffset - 60,
                behavior: "smooth"
            });
        }
    }

    log( "tlImporter: applied the Merged box (TLE status: " + ( status || "(none)" ) + ")." );
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

    // Chapters (";Name" rows, one chapter per set) on EITHER side - the page's tracklist, or
    // the candidate (1001tracklists' multi-set pages): no merge logic for them yet, so
    // NOTHING is written - not into the page text, not into the Merged box - and "Show
    // changes" is not clicked either, because there is no change to show. What the reader
    // does get is the reason they came for: the page's tracklist and the candidate side by
    // side, to merge by hand in the Merged box and Apply from there. Stored like every other
    // review block, so it survives the form POSTs behind the wiki's own buttons.
    var pageChapters = mode == "merge" && /^\s*;/m.test( read.tlText ),
        candidateChapters = mode == "merge" && /^\s*;/m.test( candidate );

    if( pageChapters || candidateChapters ) {
        log( "tlImporter: the " + ( pageChapters ? "page tracklist" : "found tracklist" ) + " has chapters - no merge, showing the original and the candidate for the hand-merge." );

        var chapterView = {
            mode: mode,
            chapters: true,
            // which side the ";Name" rows are on - only the wording of the review block reads
            // it, and a stored block from before this field existed means "page"
            chaptersFrom: pageChapters ? "page" : "candidate",
            unchanged: true,
            // VERBATIM, both of them (tlImporter_rawItems): no merge ran, so there is nothing
            // to flag parts of - and running the two texts through the parser would show the
            // reader a tidied-up list ("#" numbering, '' italics and blank lines gone) that
            // neither the page nor the player site actually holds
            items: tlImporter_rawItems( candidate ),
            originalItems: tlImporter_rawItems( read.tlText ),
            mergedTl: "",
            status: "",
            feedback: null
        };

        tlImporter_storeDiff( chapterView );
        tlImporter_renderDiffView( chapterView );
        return;
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
    //
    // Not in the chaptered case: nothing was written there, so an empty compare is the NORMAL
    // state of that page, and the block is the reader's material for the hand-merge - dropping
    // it on the first "Show changes" would throw the candidate away for good.
    if( !stored.chapters && tlImporter_diffIsEmpty() ) {
        log( "tlImporter: the compare shows no difference - dropping the review block." );
        tlImporter_clearStoredDiff();
        return;
    }

    tlImporter_loadCss();
    tlImporter_renderDiffView( stored );
}

d.ready(function() {
    if( typeof domain === "undefined" || domain != "mixesdb.com" ) return;

    // ONE instance only. Several userscripts carry this file onto mixesdb.com/w/* (TrackId.net
    // and 1001 Tracklists so far), each in its own sandbox - unguarded, every one of them
    // would apply the merge, click "Show changes" and answer every Apply press once more.
    // The DOM is the one thing they share, so the first ready handler claims the page with a
    // marker attribute and the rest stand down; ready handlers run one after the other on the
    // main thread, so the synchronous check-and-set cannot race. The delegated handlers below
    // (Apply, the down state's sync) check the same flag at event time, because they were
    // bound long before this claim could run.
    var claimed = document.documentElement.getAttribute( "data-mdb-tlimporter-owner" );

    if( claimed ) {
        log( "tlImporter: \"" + claimed + "\" already handles this page - standing down." );
        return;
    }

    document.documentElement.setAttribute( "data-mdb-tlimporter-owner",
        typeof scriptName !== "undefined" ? scriptName : "unknown script" );
    tlImporter_ownsEditPage = true;

    tlImporter_runEditPage();
    tlImporter_renderStoredDiff();
});

log( "tracklist_importer/funcs.js loaded" );
