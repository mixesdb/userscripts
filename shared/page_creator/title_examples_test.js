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

const [ buildMixesdbTitle, mdbTitle_normalizeCompare, mdbTitle_titleCategories, mdbTitle_titleChunks, mdbTitle_categoryCandidates, mdbTitle_channelUrlShows, mdbTitleExamples ] =
    ( 0, eval )( stubs + "\n" + source + "\n;[ buildMixesdbTitle, mdbTitle_normalizeCompare, mdbTitle_titleCategories, mdbTitle_titleChunks, mdbTitle_categoryCandidates, mdbTitle_channelUrlShows, mdbTitleExamples ]" );

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

    // A case's "channelUrlShow" stands in for the channel-URL round, which runs over the
    // network in the browser too: the page creator asks which MixesDB category page links the
    // channel (mdbPageCreator_channelCatEnsure in page_creator.js, not loaded here) and writes
    // the answer into mdbTitle_channelUrlShows, where the parse reads it like a curated
    // mdbTitleUsernameConversions entry. Cleared before every case, so one case's channel
    // cannot answer for the next one's.
    for( const key in mdbTitle_channelUrlShows ) delete mdbTitle_channelUrlShows[key];

    if( example.channelUrlShow ) {
        mdbTitle_channelUrlShows[ mdbTitle_normalizeCompare( example.channel ) ] = {
            show: example.channelUrlShow,
            type: "podcast",
            url: "",
            catTitle: example.channelUrlShow
        };
    }

    // createdAt, releaseDate - the same two the track page passes in. description is optional
    // and only matters to the label test (mdbTitleKnownLabels), which reads the labels the
    // tracklist credits out of it.
    const got = buildMixesdbTitle( example.title, example.channel, example.date, "", known, example.description || "" ),
          titleOk = got.title === example.expect;

    // A case may also state the artist categories the page has to be filed under - one per
    // artist, which is what a joiner between two names decides. Read off the built title, the
    // same way the "Create" link reads it off the (editable) input. expectEntity guards the
    // name the title FILES the page under, expectEntities every name its entity slot offers as
    // a category, in title order ("@ Far Blue, Noordspace" offers both). Which of the offered
    // ones the created page really carries is not decided here but asked of the wiki at filing
    // time (mdbPageCreator_entityCategoriesFor in page_creator.js, which this runner does not
    // load). A city is the exception that never gets that far: a name on mdbTitleCities is out
    // of the offered list before the wiki is asked anything, so "@ Ritter Butzke, Berlin"
    // offers the club alone.
    const categories = mdbTitle_titleCategories( got.title ),
          artists = categories.artists,
          artistsOk = !example.expectArtists ||
                      artists.join( " | " ) === example.expectArtists.join( " | " ),
          entityOk = !( "expectEntity" in example ) ||
                     categories.entity === example.expectEntity,
          entitiesOk = !example.expectEntities ||
                       categories.entities.join( " | " ) === example.expectEntities.join( " | " ),
          // Whether the page files under Category:Promo Mix - the one filing that is NOT read
          // off the title, since a name that already says it ("... Vol 4", "Summer 2026 Mix")
          // carries no " (Promo Mix)" marker. Without this a report about exactly that filing
          // has nothing to guard: title, artists and entity all come out unchanged.
          promoOk = !( "expectPromoCategory" in example ) ||
                    !!got.promoCategory === !!example.expectPromoCategory;

    // And the chunks of the SHARED split (mdbTitle_titleChunks) - the units the report panel
    // shows and the lookup candidates come from. What a case states here is what may be ASKED
    // about: a label credit or a place list must not show up as a chunk.
    const chunks = example.expectChunks
              ? mdbTitle_titleChunks( example.title, example.channel, example.description || "", example.date ).chunks
              : null,
          chunksOk = !example.expectChunks ||
                     chunks.join( " | " ) === example.expectChunks.join( " | " );

    // And the names the lookup ASKS the wiki about (mdbTitle_categoryCandidates) - the same
    // list the second pass and the panel's section 3 are built from. expectAsked names what
    // must be in it, expectNotAsked what may never be: a name a curated rule has already
    // answered for costs a request out of the 10 and can only answer wrong.
    const asked = ( example.expectAsked || example.expectNotAsked )
              ? mdbTitle_categoryCandidates( example.title, example.channel, example.description || "", example.date )
              : null,
          askedOk = ( !example.expectAsked ||
                      example.expectAsked.every( name => asked.some( a => mdbTitle_normalizeCompare( a ) === mdbTitle_normalizeCompare( name ) ) ) ) &&
                    ( !example.expectNotAsked ||
                      example.expectNotAsked.every( name => !asked.some( a => mdbTitle_normalizeCompare( a ) === mdbTitle_normalizeCompare( name ) ) ) );

    // A case may state the switchable readings the build has to OFFER - the hints bar's
    // "Switch title:" chips - as the fact kinds that must be present ("livePa", "promoMix",
    // "placeWord"), and expectNoAlternatives as the kinds it may never offer. Presence and
    // absence rather than the exact list, because a title can legitimately gain a chip a case
    // was not written about; what a case guards is its own reading. The reason texts are
    // wording, not behaviour, and are not compared.
    const altKinds = ( got.alternatives || [] ).map( a => a.kind ),
          altsOk = ( !example.expectAlternatives ||
                     example.expectAlternatives.every( kind => altKinds.indexOf( kind ) !== -1 ) ) &&
                   ( !example.expectNoAlternatives ||
                     example.expectNoAlternatives.every( kind => altKinds.indexOf( kind ) === -1 ) );

    if( !titleOk || !artistsOk || !entityOk || !entitiesOk || !promoOk || !chunksOk || !askedOk || !altsOk ) failed++;

    console.log(
        ( titleOk && artistsOk && entityOk && entitiesOk && promoOk && chunksOk && askedOk && altsOk ? "  ok  " : "FAIL  " ) +
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
        ( example.expectEntities
            ? "\n              " + ( entitiesOk ? "" : "got      " ) + "entities " + JSON.stringify( categories.entities ) +
              ( entitiesOk ? "" : "\n              expected   entities " + JSON.stringify( example.expectEntities ) )
            : "" ) +
        ( "expectPromoCategory" in example
            ? "\n              " + ( promoOk ? "" : "got      " ) + "promo category " + JSON.stringify( !!got.promoCategory ) +
              ( promoOk ? "" : "\n              expected   promo category " + JSON.stringify( !!example.expectPromoCategory ) )
            : "" ) +
        ( example.expectChunks
            ? "\n              " + ( chunksOk ? "" : "got      " ) + "chunks " + JSON.stringify( chunks ) +
              ( chunksOk ? "" : "\n              expected   chunks " + JSON.stringify( example.expectChunks ) )
            : "" ) +
        ( example.expectAsked || example.expectNotAsked
            ? "\n              " + ( askedOk ? "" : "got      " ) + "asked " + JSON.stringify( asked ) +
              ( askedOk ? "" : "\n              expected   asked " + JSON.stringify( example.expectAsked || [] ) +
                              ( example.expectNotAsked ? ", never " + JSON.stringify( example.expectNotAsked ) : "" ) )
            : "" ) +
        ( example.expectAlternatives || example.expectNoAlternatives
            ? "\n              " + ( altsOk ? "" : "got      " ) + "alternatives " + JSON.stringify( altKinds ) +
              ( altsOk ? "" : "\n              expected   alternatives " + JSON.stringify( example.expectAlternatives || [] ) +
                              ( example.expectNoAlternatives ? ", never " + JSON.stringify( example.expectNoAlternatives ) : "" ) )
            : "" )
    );
}

console.log(
    "\n" + mdbTitleExamples.length + " examples, " +
    ( failed ? failed + " FAILING" : "all pass" )
);

if( failed ) Deno.exit( 1 );
