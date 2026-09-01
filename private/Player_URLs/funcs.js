/* Shared helpers for private Player URL userscripts. */

// Edit this list to control URL order inside {{Player|mode=mirrors}}.
// Entries may be labels from playerSiteMatchers or URL host fragments.
var preferredPlayerSiteOrder = [
    "Apple Podcasts",
    "SoundCloud",
    "hearthis.at",
    "YouTube",
    "Mixcloud"
];

var playerSiteMatchers = {
    "Apple Podcasts": [ "podcasts.apple.com" ],
    "SoundCloud": [ "soundcloud.com" ],
    "hearthis.at": [ "hearthis.at" ],
    "YouTube": [ "youtube.com", "youtu.be" ],
    "Mixcloud": [ "mixcloud.com" ]
};

function playerSiteOrderIndex( url ) {
    var normalizedUrl = ( url || "" ).toLowerCase();

    for( var i = 0; i < preferredPlayerSiteOrder.length; i++ ) {
        var orderEntry = preferredPlayerSiteOrder[i],
            matchers = playerSiteMatchers[orderEntry] || [ orderEntry ];

        for( var j = 0; j < matchers.length; j++ ) {
            if( normalizedUrl.indexOf( String( matchers[j] ).toLowerCase() ) != -1 ) {
                return i;
            }
        }
    }

    return preferredPlayerSiteOrder.length;
}

function sortPlayerUrlItemsByPreferredOrder( items ) {
    return items
        .map(function( item, index ) {
            return { url: item.url, title: item.title || "", index: index, order: playerSiteOrderIndex( item.url ) };
        })
        .sort(function( a, b ) {
            if( a.order != b.order ) {
                return a.order - b.order;
            }
            return a.index - b.index;
        });
}

function sortPlayerUrlsByPreferredOrder( urls ) {
    return sortPlayerUrlItemsByPreferredOrder( urls.map(function( url ) {
        return { url: url };
    })).map(function( item ) {
        return item.url;
    });
}

function makeEditorButton( idName, buttonText, info ) {
    var button = document.createElement( "span" ),
        linkWrapper = document.createElement( "a" ),
        icon = document.createElement( "span" ),
        label = document.createElement( "span" );

    button.className = "tool oo-ui-widget oo-ui-widget-enabled oo-ui-toggleWidget oo-ui-toggleWidget-off oo-ui-buttonElement oo-ui-buttonElement-frameless oo-ui-iconElement oo-ui-toggleButtonWidget";
    button.id = idName;

    linkWrapper.className = "oo-ui-buttonElement-button";
    linkWrapper.title = info;
    linkWrapper.accessKey = "y";

    icon.className = "fa fa-lg fa-nothing has-label";

    label.className = "oo-ui-labelElement-label";
    label.textContent = buttonText;

    linkWrapper.append( icon, label );
    button.append( linkWrapper );

    return button;
}

function playerHeaderWithMode( header, mode ) {
    if( header.indexOf( "mode=" ) == -1 ) {
        return header.replace( /^{{Player/, "{{Player|mode=" + mode );
    }

    return header.replace( /\|mode=[^|\n}]+/, "|mode=" + mode );
}

function playerHeaderWithVideoAudio( header ) {
    if( header.indexOf( "video=" ) == -1 ) {
        header = header.replace( /^{{Player((?:\|mode=[^|\n}]+)?)/, "{{Player$1|video=audio" );
    }
    return header;
}

function playerTitleParam( title, number, forceNumberedTitle ) {
    if( !title ) {
        return "";
    }
    return "|t" + ( forceNumberedTitle || number > 1 ? number : "" ) + "=" + title;
}

function playerUrlLine( url, number, forceNumbered, title, forceNumberedTitle ) {
    return " |" + ( forceNumbered || url.indexOf( "=" ) != -1 ? number + "=" : "" ) + url + playerTitleParam( title, number, forceNumberedTitle );
}

function playerUrlParts( line ) {
    var match = line.match( /^ \|(?:\d+=)?(https?:\/\/.*?)(?:\|t(\d*)=(.*))?$/ );
    return match ? { url: match[1], title: match[3] || "", hasTitle: typeof match[2] != "undefined" } : null;
}

function playerUrlValue( line ) {
    var parts = playerUrlParts( line );
    return parts ? parts.url : "";
}

function playerUrlLineIsNumbered( line ) {
    return /^ \|\d+=https?:\/\//.test( line );
}

function playerUrlsNeedNumberedLines( urls, urlLines ) {
    return urls.some(function( thisUrl ) {
        return thisUrl.indexOf( "=" ) != -1;
    }) || ( urlLines || [] ).some( playerUrlLineIsNumbered );
}

function newPlayerTemplate( url, forceVideoAudio, title ) {
    return "{{Player" + ( forceVideoAudio ? "|video=audio" : "" ) + "\n" + playerUrlLine( url, 1, false, title ) + "\n}}";
}

function playerUrlItemsNeedTitles( items ) {
    return items.some(function( item ) {
        return item.title || item.hasTitle;
    });
}

function titleMissingPlayerUrlItemsAsComplete( items ) {
    if( playerUrlItemsNeedTitles( items ) ) {
        items.forEach(function( item ) {
            if( !item.title && !item.hasTitle ) {
                item.title = "Complete";
            }
        });
    }

    return items;
}

function nextPlayerTitleNumber( urlLines ) {
    var highestNumber = 0;

    urlLines.forEach(function( line ) {
        var match = line.match( /\|t(\d*)=/ );
        if( match ) {
            highestNumber = Math.max( highestNumber, match[1] ? parseInt( match[1], 10 ) : 1 );
        }
    });

    return highestNumber + 1;
}

// Puts the added URL among the ones already in the template, at the position the calling
// userscript asks for ("first", "middle" or "last" - the addAtPosition option at its top).
// sortExisting reorders the URLs that are already there by the preferred site order; it is off
// for titled players, where the existing order is the part order and must survive untouched.
function placePlayerUrlItem( newItem, existingItems, position, sortExisting ) {
    var items = sortExisting ? sortPlayerUrlItemsByPreferredOrder( existingItems ) : existingItems.slice(),
        insertIndex;

    if( position == "last" ) {
        insertIndex = items.length;
    } else if( position == "middle" ) {
        // Centre of the resulting list. With only one URL there is no centre, so Math.round()
        // leaning to the back half puts the added URL second, i.e. last.
        insertIndex = Math.round( items.length / 2 );
    } else {
        insertIndex = 0;
    }

    return items.slice( 0, insertIndex ).concat( [ newItem ], items.slice( insertIndex ) );
}

// position: where the added URL lands - "first", "middle" or "last", see placePlayerUrlItem().
function addUrlToPlayer( text, url, forceVideoAudio, title, position ) {
    return text.replace( /{{Player[^}]*}}/, function( player ) {
        var lines = player.split( "\n" ),
            header = lines.shift(),
            urlLines = [],
            footerLines = [];

        if( forceVideoAudio ) {
            header = playerHeaderWithVideoAudio( header );
        }

        if( lines.length == 0 ) {
            return header.replace( /^(\{\{Player)([^}]*)\|(?:1=)?(https?:\/\/.+)\}\}$/, function( match, templateStart, options, oldUrl ) {
                var items = title ? placePlayerUrlItem( { url: url, title: title, hasTitle: true }, [ { url: oldUrl } ], position, false )
                        : placePlayerUrlItem( { url: url, title: "" }, [ { url: oldUrl } ], position, true ),
                    forceTitles = playerUrlItemsNeedTitles( items ),
                    urls = items.map(function( item ) { return item.url; }),
                    forceNumbered = playerUrlsNeedNumberedLines( urls, [] );
                titleMissingPlayerUrlItemsAsComplete( items );
                if( title ) {
                    header = playerHeaderWithMode( templateStart + options, "multi" );
                } else {
                    if( options.indexOf( "mode=" ) == -1 ) {
                        options = "|mode=mirrors" + options;
                    }
                    header = templateStart + options;
                }
                if( forceVideoAudio ) {
                    header = playerHeaderWithVideoAudio( header );
                }
                return header + "\n" + items.map(function( item, index ) {
                    return playerUrlLine( item.url, index + 1, forceNumbered, item.title, forceTitles );
                }).join( "\n" ) + "\n}}";
            });
        }

        lines.forEach(function( line ) {
            if( playerUrlValue( line ) ) {
                urlLines.push( line );
            } else if( /^\s*\|\s*(?:\d+=)?\s*$/.test( line ) ) {
                // An empty URL line is the Page Creator's placeholder for a mirror nobody has
                // filled in yet (shared/page_creator, signal E) - and the URL being added here
                // IS that mirror, so the line is dropped rather than carried to the end of the
                // template. Left standing it would be parameter 1 again once the lines are
                // numbered, and overwrite the first player.
            } else {
                footerLines.push( line );
            }
        });

        if( title && urlLines.length > 0 ) {
            header = playerHeaderWithMode( header, "multi" );
        } else if( header.indexOf( "mode=" ) == -1 && urlLines.length > 0 ) {
            header = playerHeaderWithMode( header, "mirrors" );
        }

        var urls, forceNumbered;

        if( title ) {
            urls = placePlayerUrlItem( { url: url, title: title, hasTitle: true }, urlLines.map( playerUrlParts ), position, false );
            titleMissingPlayerUrlItemsAsComplete( urls );
            forceNumbered = playerUrlsNeedNumberedLines( urls.map(function( item ) { return item.url; }), urlLines );

            urlLines = urls.map(function( item, index ) {
                return playerUrlLine( item.url, index + 1, forceNumbered, item.title, true );
            });
        } else {
            // Only the added URL is pinned by the position option; the URLs already in the
            // template keep the preferred site order among themselves.
            urls = placePlayerUrlItem( { url: url, title: "" }, urlLines.map( playerUrlParts ), position, true );
            titleMissingPlayerUrlItemsAsComplete( urls );
            forceNumbered = playerUrlsNeedNumberedLines( urls.map(function( item ) { return item.url; }), urlLines );

            urlLines = urls.map(function( item, index ) {
                return playerUrlLine( item.url, index + 1, forceNumbered, item.title, playerUrlItemsNeedTitles( urls ) );
            });
        }

        return [ header ].concat( urlLines, footerLines ).join( "\n" );
    });
}

function addApplePodcastUrlToPlayer( text, url, position ) {
    return addUrlToPlayer( text, url, false, "", position );
}

function addYouTubeUrlToPlayer( text, url, title, position ) {
    return addUrlToPlayer( text, url, true, title, position );
}
