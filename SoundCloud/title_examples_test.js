/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Runs SoundCloud/title_examples.js against buildMixesdbTitle()
 *
 *     deno run --allow-read SoundCloud/title_examples_test.js
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

const source = [ "title_definitions.js", "script.funcs.js", "title_examples.js" ]
    .map( file => Deno.readTextFileSync( dir + file ) )
    .join( "\n" );

const [ buildMixesdbTitle, scTitleExamples ] =
    ( 0, eval )( stubs + "\n" + source + "\n;[ buildMixesdbTitle, scTitleExamples ]" );

let failed = 0;

for( const example of scTitleExamples ) {
    // createdAt, releaseDate - the same two the track page passes in
    const got = buildMixesdbTitle( example.title, example.channel, example.date, "" ),
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
    "\n" + scTitleExamples.length + " examples, " +
    ( failed ? failed + " FAILING" : "all pass" )
);

if( failed ) Deno.exit( 1 );
