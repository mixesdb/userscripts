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

        // a re-run replaces the previous answer instead of stacking a second box under the first
        tl.nextAll("#tlEditor-feedback").remove();
        tl.after( feedback.text );
    }
    loadRawCss( "https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/shared/tracklist_editor/tracklistEditor_copy.css" );
}

/*
 * The box keeps itself in shape while it is edited - on every site, because the wiring rides
 * along in fixTLbox(), which every box that shows API feedback passes through:
 *
 * - while typing, the rows attribute follows the line count, so the box grows and shrinks
 *   with its text instead of scrolling inside itself
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
var tlBoxUpdateMinMs = 400;

// tlBoxBindLive
function tlBoxBindLive( tl ) {
    if( tl.attr( "data-mdb-tlbox-live" ) ) return;
    tl.attr( "data-mdb-tlbox-live", "1" );

    tl.on( "input", function() {
        tl.attr( "rows", String( tl.val() ).split( "\n" ).length );
    });

    tl.on( "blur", function() {
        tlBoxBlurUpdate( tl );
    });
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

            tl.val( res.text );

            // re-sizes, re-colours, replaces the printed feedback - and refreshes
            // mdbTlboxKnown to the text as the API returned it
            fixTLbox( res.feedback, tl.get( 0 ), false );

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
