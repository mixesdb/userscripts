/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Runs title_examples.js against buildMixesdbTitle()
 *
 *     deno run --allow-read shared/page_creator/title_examples_test.js
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

const [ buildMixesdbTitle, mdbTitle_normalizeCompare, mdbTitle_titleCategories, mdbTitle_titleChunks, mdbTitleExamples ] =
    ( 0, eval )( stubs + "\n" + source + "\n;[ buildMixesdbTitle, mdbTitle_normalizeCompare, mdbTitle_titleCategories, mdbTitle_titleChunks, mdbTitleExamples ]" );

let failed = 0;

for( const example of mdbTitleExamples ) {
    // A case's "known" stands in for the MixesDB category lookup, which runs over the network
    // in the browser - exactly what the API answered when the case was added. Three spellings
    // per name, from terse to verbatim:
    //     "Daniel Bortz": "artist"                          type only
    //     "Trommel":      { type: "podcast", mixes: 29 }    one match with details
    //     "fabric":       { matches: [ ... ] }              the raw mdbnames matches array
    // The KEY doubles as the wiki's canonical spelling (write it the way the wiki does), which
    // is what the canonicalization in mdbTitle_result rewrites the title with.
    const known = {};
    for( const name in ( example.known || {} ) ) {
        const value = example.known[name];

        known[ mdbTitle_normalizeCompare( name ) ] =
            typeof value === "string"
                ? { matches: [ { title: name, type: value, mixes: 1, exactCase: true } ] }
                : ( value.matches
                    ? value
                    : { matches: [ { title: name, mixes: 1, exactCase: true, ...value } ] } );
    }

    // createdAt, releaseDate - the same two the track page passes in. description is optional
    // and only matters to the label test (mdbTitleKnownLabels), which reads the labels the
    // tracklist credits out of it.
    const got = buildMixesdbTitle( example.title, example.channel, example.date, "", known, example.description || "" ),
          titleOk = got.title === example.expect;

    // A case may also state the artist categories the page has to be filed under - one per
    // artist, which is what a joiner between two names decides. Read off the built title, the
    // same way the "Create" link reads it off the (editable) input. expectEntity guards the
    // entity category the same way - a live title is filed under its FIRST place alone.
    const categories = mdbTitle_titleCategories( got.title ),
          artists = categories.artists,
          artistsOk = !example.expectArtists ||
                      artists.join( " | " ) === example.expectArtists.join( " | " ),
          entityOk = !( "expectEntity" in example ) ||
                     categories.entity === example.expectEntity;

    // And the chunks of the SHARED split (mdbTitle_titleChunks) - the units the report panel
    // shows and the lookup candidates come from. What a case states here is what may be ASKED
    // about: a label credit or a place list must not show up as a chunk.
    const chunks = example.expectChunks
              ? mdbTitle_titleChunks( example.title, example.channel, example.description || "", example.date ).chunks
              : null,
          chunksOk = !example.expectChunks ||
                     chunks.join( " | " ) === example.expectChunks.join( " | " );

    if( !titleOk || !artistsOk || !entityOk || !chunksOk ) failed++;

    console.log(
        ( titleOk && artistsOk && entityOk && chunksOk ? "  ok  " : "FAIL  " ) +
        String( got.confidence + "%" ).padStart( 4 ) + "  " +
        JSON.stringify( example.title ) +
        "\n              " + ( titleOk ? "" : "got      " ) + JSON.stringify( got.title ) +
        ( titleOk ? "" : "\n              expected " + JSON.stringify( example.expect ) ) +
        ( example.expectArtists
            ? "\n              " + ( artistsOk ? "" : "got      " ) + "categories " + JSON.stringify( artists ) +
              ( artistsOk ? "" : "\n              expected   categories " + JSON.stringify( example.expectArtists ) )
            : "" ) +
        ( "expectEntity" in example
            ? "\n              " + ( entityOk ? "" : "got      " ) + "entity " + JSON.stringify( categories.entity ) +
              ( entityOk ? "" : "\n              expected   entity " + JSON.stringify( example.expectEntity ) )
            : "" ) +
        ( example.expectChunks
            ? "\n              " + ( chunksOk ? "" : "got      " ) + "chunks " + JSON.stringify( chunks ) +
              ( chunksOk ? "" : "\n              expected   chunks " + JSON.stringify( example.expectChunks ) )
            : "" )
    );
}

console.log(
    "\n" + mdbTitleExamples.length + " examples, " +
    ( failed ? failed + " FAILING" : "all pass" )
);

if( failed ) Deno.exit( 1 );
