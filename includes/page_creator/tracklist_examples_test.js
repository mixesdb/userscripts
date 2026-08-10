/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Runs tracklist_examples.js against the tracklist detector
 *
 *     deno run --allow-read includes/page_creator/tracklist_examples_test.js
 *
 * Same shape and same reasoning as title_examples_test.js next door: deno because node is not
 * installed here and it needs no install step, and the detector is read as text and evaluated,
 * the way a userscript manager stacks its @require files.
 *
 * The detector is pure text in, text out - no DOM, no network - which is the only reason this
 * can run outside a browser at all. Keep it that way.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const dir = new URL( ".", import.meta.url ).pathname;

// the log helpers global.js would provide in the browser
const stubs = "var log=function(){},logVar=function(){},logFunc=function(){};";

const source = [ "tracklist_detector.js", "tracklist_examples.js" ]
    .map( file => Deno.readTextFileSync( dir + file ) )
    .join( "\n" );

const [ mdbTracklist_detectInText, mdbTracklist_detectInComments, mdbTracklistExamples, mdbTracklistCommentExamples ] =
    ( 0, eval )( stubs + "\n" + source +
                 "\n;[ mdbTracklist_detectInText, mdbTracklist_detectInComments, mdbTracklistExamples, mdbTracklistCommentExamples ]" );

let failed = 0;

// check
// Both suites assert the same three things about a found block - its length and its two edges -
// so they are compared in one place.
function check( label, found, expect ) {
    const lines = found ? found.text.split( "\n" ) : [],
          got = found ? { lines: found.lines, first: lines[0], last: lines[ lines.length - 1 ] } : null;

    const ok = expect === null
        ? found === null
        : !!found && got.lines === expect.lines && got.first === expect.first && got.last === expect.last;

    if( !ok ) failed++;

    console.log(
        ( ok ? "  ok  " : "FAIL  " ) +
        String( expect === null ? "none" : expect.lines + " tracks" ).padStart( 9 ) + "  " + label
    );

    if( !ok ) {
        console.log( "              got      " + JSON.stringify( got ) );
        console.log( "              expected " + JSON.stringify( expect ) );
    }
}

console.log( "Descriptions\n" );

for( const example of mdbTracklistExamples ) {
    check( example.url, mdbTracklist_detectInText( example.text ), example.expect );
}

console.log( "\nComments\n" );

for( const example of mdbTracklistCommentExamples ) {
    check( example.what, mdbTracklist_detectInComments( example.comments ), example.expect );
}

const total = mdbTracklistExamples.length + mdbTracklistCommentExamples.length;

console.log( "\n" + total + " examples, " + ( failed ? failed + " FAILING" : "all pass" ) );

if( failed ) Deno.exit( 1 );
