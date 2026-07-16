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

function addUrlToPlayer( text, url, forceVideoAudio, title ) {
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
                var items = title ? [ { url: oldUrl }, { url: url, title: title, hasTitle: true } ] : sortPlayerUrlItemsByPreferredOrder([ { url: url }, { url: oldUrl } ]),
                    forceTitles = playerUrlItemsNeedTitles( items ),
                    urls = items.map(function( item ) { return item.url; }),
                    forceNumbered = playerUrlsNeedNumberedLines( urls, [] );
                titleMissingPlayerUrlItemsAsComplete( items );
                if( options.indexOf( "mode=" ) == -1 ) {
                    options = "|mode=mirrors" + options;
                }
                header = templateStart + options;
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
            } else {
                footerLines.push( line );
            }
        });

        if( header.indexOf( "mode=" ) == -1 && urlLines.length > 0 ) {
            header = header.replace( /^{{Player/, "{{Player|mode=mirrors" );
        }

        var urls, forceNumbered;

        if( title ) {
            urls = urlLines.map( playerUrlParts );
            urls.push( { url: url, title: title, hasTitle: true } );
            titleMissingPlayerUrlItemsAsComplete( urls );
            forceNumbered = playerUrlsNeedNumberedLines( urls.map(function( item ) { return item.url; }), urlLines );

            urlLines = urls.map(function( item, index ) {
                return playerUrlLine( item.url, index + 1, forceNumbered, item.title, true );
            });
        } else {
            urls = sortPlayerUrlItemsByPreferredOrder([ { url: url } ].concat( urlLines.map( playerUrlParts ) ));
            titleMissingPlayerUrlItemsAsComplete( urls );
            forceNumbered = playerUrlsNeedNumberedLines( urls.map(function( item ) { return item.url; }), urlLines );

            urlLines = urls.map(function( item, index ) {
                return playerUrlLine( item.url, index + 1, forceNumbered, item.title, playerUrlItemsNeedTitles( urls ) );
            });
        }

        return [ header ].concat( urlLines, footerLines ).join( "\n" );
    });
}

function addApplePodcastUrlToPlayer( text, url ) {
    return addUrlToPlayer( text, url, false );
}

function addYouTubeUrlToPlayer( text, url, title ) {
    return addUrlToPlayer( text, url, true, title );
}
