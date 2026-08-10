/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Runs title_examples.js against buildMixesdbTitle()
 *
 *     deno run --allow-read includes/page_creator/title_examples_test.js
 *
 * Prints, per example, what the suggestion makes of it TODAY next to what it should be, so
 * the current behaviour is never written down anywhere and never goes stale.
 *
 * Deno, not node: node is not installed on the machine this was written on, and deno needs no
 * package.json, no install and no build step - which keeps the repo's "no build system" rule.
 *
 * The parser files are plain scripts meant for a browser, so they are read as text and
 * evaluated together, the same way a userscript manager stacks its @require files.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const dir = new URL( ".", import.meta.url ).pathname;

// the log helpers global.js would provide in the browser
const stubs = "var log=function(){},logVar=function(){},logFunc=function(){},$=function(){return{}};";

const source = [ "title_definitions.js", "title_builder.js", "title_examples.js" ]
    .map( file => Deno.readTextFileSync( dir + file ) )
    .join( "\n" );

const [ buildMixesdbTitle, mdbTitle_normalizeCompare, mdbTitleExamples ] =
    ( 0, eval )( stubs + "\n" + source + "\n;[ buildMixesdbTitle, mdbTitle_normalizeCompare, mdbTitleExamples ]" );

let failed = 0;

for( const example of mdbTitleExamples ) {
    // A case's "known" stands in for the MixesDB category lookup, which runs over the network
    // in the browser: name -> "artist" | "venue" | "other", exactly what the API answered when
    // the case was added. Without it the examples could not test anything the wiki knows.
    const known = {};
    for( const name in ( example.known || {} ) ) {
        known[ mdbTitle_normalizeCompare( name ) ] = example.known[name];
    }

    // createdAt, releaseDate - the same two the track page passes in
    const got = buildMixesdbTitle( example.title, example.channel, example.date, "", known ),
          ok = got.title === example.expect;

    if( !ok ) failed++;

    console.log(
        ( ok ? "  ok  " : "FAIL  " ) +
        String( got.confidence + "%" ).padStart( 4 ) + "  " +
        JSON.stringify( example.title ) +
        "\n              " + ( ok ? "" : "got      " ) + JSON.stringify( got.title ) +
        ( ok ? "" : "\n              expected " + JSON.stringify( example.expect ) )
    );
}

console.log(
    "\n" + mdbTitleExamples.length + " examples, " +
    ( failed ? failed + " FAILING" : "all pass" )
);

if( failed ) Deno.exit( 1 );
