/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Runs importer_examples.js against the Tracklist Importer merge core
 *
 *     deno run --allow-read shared/tracklist_importer/importer_examples_test.js
 *
 * Same shape and same reasoning as page_creator's example runners: deno because node is not
 * installed here and it needs no install step, and merge_core.js is read as text and evaluated,
 * the way a userscript manager stacks its @require files.
 *
 * merge_core.js is pure text in, text out – no DOM, no network – which is the only reason this
 * can run outside a browser at all. Keep it that way.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const dir = new URL( ".", import.meta.url ).pathname;

// the log helpers global.js would provide in the browser
const stubs = "var log=function(){},logVar=function(){},logFunc=function(){};";

const source = [ "merge_core.js", "importer_examples.js" ]
    .map( file => Deno.readTextFileSync( dir + file ) )
    .join( "\n" );

const [ tlImporter_merge, tlImporter_extractTracklist, tlImporter_tracklistWikitext,
        tlImporter_setTracklist, tlImporterExamples_merge, tlImporterExamples_pageText ] =
    ( 0, eval )( stubs + "\n" + source +
                 "\n;[ tlImporter_merge, tlImporter_extractTracklist, tlImporter_tracklistWikitext," +
                 " tlImporter_setTracklist, tlImporterExamples_merge, tlImporterExamples_pageText ]" );

let failed = 0;

function report( ok, label, got, expected ) {
    if( !ok ) failed++;

    console.log( ( ok ? "  ok  " : "FAIL  " ) + label );

    if( !ok ) {
        console.log( "        got      " + JSON.stringify( got ) );
        console.log( "        expected " + JSON.stringify( expected ) );
    }
}

// unusedLines
// The 1-based candidate row numbers whose given part came out unused, read off diffItems.
function unusedLines( diffItems, part ) {
    const out = [];

    diffItems.forEach( ( item, i ) => {
        if( item.type === "track" && item.use && item.use[part] === false ) out.push( i + 1 );
    });

    return out;
}

console.log( "\nMerge examples\n" );

for( const c of tlImporterExamples_merge ) {
    // durationSec is the mix runtime the player site knew - only the cases that state one
    const res = tlImporter_merge( c.original, c.candidate, { durationSec: c.durationSec } );

    report( res.mergedText === c.expect, c.name + " [merged text]", res.mergedText, c.expect );
    report( res.changed === c.changed, c.name + " [changed flag]", res.changed, c.changed );

    // only cases that state one - identical is the strict reading of a no-change merge
    if( typeof c.identical === "boolean" ) {
        report( res.identical === c.identical, c.name + " [identical flag]", res.identical, c.identical );
    }

    if( c.unused ) {
        for( const part of [ "cues", "texts", "labels" ] ) {
            const key = part.replace( /s$/, "" ),
                  got = unusedLines( res.diffItems, key === "cue" ? "cue" : key === "text" ? "text" : "label" );

            report( JSON.stringify( got ) === JSON.stringify( c.unused[part] ),
                    c.name + " [unused " + part + "]", got, c.unused[part] );
        }
    }
}

console.log( "\nPage text examples\n" );

for( const c of tlImporterExamples_pageText ) {
    const read = tlImporter_extractTracklist( c.pageText );

    report( read.hasTracks === c.hasTracks, c.name + " [hasTracks]", read.hasTracks, c.hasTracks );

    if( typeof c.extracted === "string" ) {
        report( read.tlText === c.extracted, c.name + " [extracted]", read.tlText, c.extracted );
    }

    const written = tlImporter_setTracklist( c.pageText, tlImporter_tracklistWikitext( c.tl ) );

    report( written === c.expect, c.name + " [page text]", written, c.expect );
}

console.log( "" );

if( failed ) {
    console.log( failed + " check(s) FAILED" );
    Deno.exit( 1 );
} else {
    console.log( "all checks passed" );
}
