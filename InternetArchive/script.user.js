// ==UserScript==
// @name         Internet Archive (by MixesDB) (BETA)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.01.05.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/InternetArchive/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-InternetArchive_3
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/toolkit.js?v-InternetArchive_1
// @require      https://cdn.jsdelivr.net/npm/sorttable@1.0.2/sorttable.js
// @include      http*archive.org/details/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=archive.org
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 7,
    scriptName = "InternetArchive";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * playsetLists
 * https://archive.org/details/Clubnight2011
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var playsetList_wrapper = $("#theatre-ia-wrap");

if( playsetList_wrapper.length ) {
    var playsetList_item = $('div[itemprop="hasPart"]', playsetList_wrapper);

    /*
     * Prepare mdb table
     */
    var playsetList_mdbTable_html = '<section id="playsetList_mdbTable_wrapper">';
    playsetList_mdbTable_html    +=   '<table id="playsetList_mdbTable" class="mdb-element sortable">';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" class="mdb-center" title="Sortable">#</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" title="Sortable">Name</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" title="Sortable">Detail</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" title="Sortable">Dur</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" class="sorttable_nosort">DL</th>';
    playsetList_mdbTable_html    +=     '<th id="playsetList_mdbTable-name" class="sorttable_nosort">MixesDB usage</th>';
    playsetList_mdbTable_html    +=   '</table>';
    playsetList_mdbTable_html    += '</section>';

    playsetList_wrapper.after( playsetList_mdbTable_html );

    var playsetList_mdbTable_wrapper = $( "#playsetList_mdbTable_wrapper" ),
        playsetList_mdbTable = $( "#playsetList_mdbTable" ),
        playsetList_apiLink = $( '<div id="playsetList_apiLink" class="mdb-center"></div>' );

    playsetList_mdbTable.before( playsetList_apiLink );

    function setApiLink( identifier ) {
        if ( !identifier ) return false;

        var currentIdentifier = playsetList_apiLink.data( "identifier" );

        if ( currentIdentifier === identifier ) return true;

        playsetList_apiLink.data( "identifier", identifier );
        playsetList_apiLink.html( '<a href="https://archive.org/metadata/' + identifier + '" target="_blank">API</a>' );

        return true;
    }

    function setApiUnavailable() {
        if ( playsetList_apiLink.find( "a" ).length ) return;

        playsetList_apiLink.text( "API link unavailable" );
    }

    function getIdentifierFromPath() {
        try {
            var pathParts = window.location.pathname.split( "/" ).filter( Boolean ),
                detailsIndex = pathParts.indexOf( "details" );

            if ( detailsIndex !== -1 && pathParts.length > detailsIndex + 1 ) {
                return decodeURIComponent( pathParts[ detailsIndex + 1 ] );
            }

            if ( pathParts.length ) return decodeURIComponent( pathParts[0] );
        } catch ( error ) {
            console.error( "InternetArchive: Failed to derive identifier from path", error );
        }

        return "";
    }

    setApiLink( getIdentifierFromPath() );

    // each playsetList item
    var i = 0;
    playsetList_item.each(function(){
        i++;

        /*
         * Extract values
         */
        var item_name = $('meta[itemprop="name"]', this).attr("content"); // Clubnight 2011.01.01
        var item_dur = $('meta[itemprop="duration"]', this).attr("content"); // PT0M7206S
        var item_url = $('link[itemprop="associatedMedia"]', this).first().attr("href"); // https://archive.org/download/Clubnight2011/Clubnight%202011.01.01%20-%20Motorcitysoul.ogg
        var item_detailUrl = $('meta[itemprop="url"]', this).attr("content")
                        || $('link[itemprop="url"]', this).attr("href")
                        || "";

        /*
         * Work with the values
         */
        // Name
        var episode = item_name;

        // detail
        var filename = decodeURIComponent(
                           item_url.split("/").pop() // get last part after "/"
                           .replace(/\.[^/.]+$/, "")       // remove extension
                       );
        var episode_detail = filename.replace( item_name + " - ", "" ); // Motorcitysoul

        // dur
        var dur = isoDurationToTime( item_dur ); // 2:00:06

        // download links
        var urls = [];
        $("link[itemprop='associatedMedia']", this).each(function() {
            var url = $(this).attr("href");
            if (url) urls.push(url);
        });
        // If we have mp3 and ogg → remove ogg(s)
        var hasMp3 = urls.some(u => u.toLowerCase().endsWith(".mp3"));
        if (hasMp3) {
            urls = urls.filter(u => !u.toLowerCase().endsWith(".ogg"));
        }
        // Build download links
        var formats = urls.map(function(url) {
            var ext = url.split(".").pop().toLowerCase();
            return '<a href="' + url + '" class="mdb-tooltip" data-tooltip="'+filename+'.'+ext+'">' + ext + '</a>';
        });
        var download_links = formats.join(' <span class="mdb-grey">|</span> ');
        var first_download_url = urls[0] ? new URL( urls[0], window.location.origin ).href : "";
        var details_url = item_detailUrl ? new URL( item_detailUrl, window.location.origin ).href : "";

        /*
         * Add row to table
         */
        var episode_row = '<tr';
        episode_row    +=    ( first_download_url ? ' data-download-url="' + first_download_url + '"' : "" );
        episode_row    +=    ( details_url ? ' data-details-url="' + details_url + '"' : "" );
        episode_row    +=    '>';
        episode_row    +=    '<td class="mdb-right">'+i+'</td>';
        episode_row    +=    '<td>'+episode+'</td>';
        episode_row    +=    '<td>'+episode_detail+'</td>';
        episode_row    +=    '<td>'+dur+'</td>';
        episode_row    +=    '<td>'+download_links+'</td>';
        episode_row    +=    '<td class="playsetList_mdbTable-mixesdb">'+( first_download_url ? "Checking…" : "No download URL" )+'</td>';
        episode_row    += '</tr>';


        playsetList_mdbTable.append( episode_row );
    });

    /*
     * Metadata JS
     */
    waitForKeyElements( "input.js-ia-metadata", function( jNode ) {
        var arrString = jNode.attr("value");
        var apiIdentifier = "";

        try {
            var arr = JSON.parse( arrString );

            if ( Array.isArray( arr ) && arr.length ) {
                var arrItemWithMetadata = arr.find( function( item ) {
                    return item && item.metadata && item.metadata.identifier;
                } );

                apiIdentifier = arrItemWithMetadata?.metadata?.identifier
                || arr.find( function( item ) { return item && item.identifier; } )?.identifier
                || "";
            } else if ( arr && typeof arr === "object" ) {
                apiIdentifier = arr.metadata?.identifier || arr.identifier || "";
            }
        } catch ( error ) {
            console.error( "InternetArchive: Failed to parse metadata", error );
        }

        logVar( "arr", arrString );

        if ( apiIdentifier ) {
            setApiLink( apiIdentifier );
        } else {
            setApiUnavailable();
        }
    });

    var playsetList_hasRows = playsetList_mdbTable.find( "tr" ).length > 0,
        playsetList_hasSlug = playsetList_mdbTable.find( "tr[data-download-url]" ).length > 0;

    if ( !playsetList_hasRows || !playsetList_hasSlug ) {
        playsetList_mdbTable.remove();
        playsetList_mdbTable_wrapper.append( '<div id="playsetList_mdbTable-empty" class="mdb-center">No URLs for MixesDB usage check found</div>' );
    } else {
        /*
         * MixesDB usage
         */
        var mixesdbApiUrl = "https://www.mixesdb.com/w/api.php";

        function buildMixesdbSearchPath( downloadUrl ) {
            try {
                var urlObj = new URL( downloadUrl, window.location.origin ),
                    pathParts = urlObj.pathname.split( "/" ),
                    downloadIndex = pathParts.indexOf( "download" );

                if ( downloadIndex !== -1 && pathParts.length > downloadIndex + 2 ) {
                    var identifier = pathParts[ downloadIndex + 1 ],
                        filenamePart = pathParts.slice( downloadIndex + 2 ).join( "/" );

                    return "/" + identifier + "/" + filenamePart;
                        filenamePart = pathParts.slice( downloadIndex + 2 ).join( "/" ),
                        encodedFilename = encodeURIComponent( filenamePart );

                    return "/" + identifier + "/" + encodedFilename;
                }
            } catch ( error ) {
                console.error( "InternetArchive: Failed to build MixesDB search path", error );
            }

            return downloadUrl;
        }

        playsetList_mdbTable.find( "tr" ).each(function() {
            var row = $( this ),
                downloadUrl = row.data( "download-url" ),
                mixesdbSearchPath = downloadUrl ? buildMixesdbSearchPath( downloadUrl ) : "",
                mixesdbCell = $( ".playsetList_mdbTable-mixesdb", row );

            if ( !mixesdbCell.length ) return;

            if ( !downloadUrl ) {
                mixesdbCell.text( "No download URL" );
                return;
            }

            var mixesdbApiParams = {
                action: "query",
                list: "search",
                srprop: "timestamp",
                format: "json",
                origin: "*",
                srsearch: 'insource:"' + mixesdbSearchPath.replace(/(["\\])/g, "\\$1") + '"'
            };

            $.ajax({
                dataType: "json",
                url: mixesdbApiUrl,
                data: mixesdbApiParams,
                success: function( data ) {
                    var searchResults = data?.query?.search;

                    if ( Array.isArray( searchResults ) && searchResults.length ) {
                        var firstResult = searchResults[0],
                            pageTitle = firstResult?.title || "MixesDB",
                            pageId = firstResult?.pageid,
                            pageUrl = pageId ? "https://www.mixesdb.com/w/index.php?curid=" + pageId : "https://www.mixesdb.com/w/" + encodeURIComponent( pageTitle.replace( / /g, "_" ) );

                        mixesdbCell.html( '<a href="' + pageUrl + '" target="_blank">' + pageTitle + '</a>' );
                    } else {
                        var mixesdbApiSearchUrl = mixesdbApiUrl + "?" + $.param( mixesdbApiParams );

                        mixesdbCell.html( '<a href="' + mixesdbApiSearchUrl + '" target="_blank">Slug not used</a>' );
                    }
                },
                error: function() {
                    mixesdbCell.text( "MixesDB check failed" );
                }
            });
        });
    }
}
