/* Shared helpers for private Player URL userscripts. */

// Edit this list to control URL order inside {{Player|mode=mirrors}}.
// Entries may be labels from playerSiteMatchers or URL host fragments.
var preferredPlayerSiteOrder = [
    "Apple Podcasts",
    "SoundCloud",
    "YouTube",
    "Mixcloud"
];

var playerSiteMatchers = {
    "Apple Podcasts": [ "podcasts.apple.com" ],
    "SoundCloud": [ "soundcloud.com" ],
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

function sortPlayerUrlsByPreferredOrder( urls ) {
    return urls
        .map(function( url, index ) {
            return { url: url, index: index, order: playerSiteOrderIndex( url ) };
        })
        .sort(function( a, b ) {
            if( a.order != b.order ) {
                return a.order - b.order;
            }
            return a.index - b.index;
        })
        .map(function( item ) {
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

function playerUrlLine( url, number ) {
    return " |" + ( url.indexOf( "=" ) == -1 ? "" : number + "=" ) + url;
}

function playerUrlValue( line ) {
    var match = line.match( /^ \|(?:\d+=)?(https?:\/\/.+)$/ );
    return match ? match[1] : "";
}

function newPlayerTemplate( url, forceVideoAudio ) {
    return "{{Player" + ( forceVideoAudio ? "|video=audio" : "" ) + "\n" + playerUrlLine( url, 1 ) + "\n}}";
}

function addUrlToPlayer( text, url, forceVideoAudio ) {
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
                var urls = sortPlayerUrlsByPreferredOrder([ url, oldUrl ]);
                if( options.indexOf( "mode=" ) == -1 ) {
                    options = "|mode=mirrors" + options;
                }
                header = templateStart + options;
                if( forceVideoAudio ) {
                    header = playerHeaderWithVideoAudio( header );
                }
                return header + "\n" + urls.map(function( thisUrl, index ) {
                    return playerUrlLine( thisUrl, index + 1 );
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

        urlLines = sortPlayerUrlsByPreferredOrder([ url ].concat( urlLines.map( playerUrlValue ) )).map(function( thisUrl, index ) {
            return playerUrlLine( thisUrl, index + 1 );
        });

        return [ header ].concat( urlLines, footerLines ).join( "\n" );
    });
}

function addApplePodcastUrlToPlayer( text, url ) {
    return addUrlToPlayer( text, url, false );
}

function addYouTubeUrlToPlayer( text, url ) {
    return addUrlToPlayer( text, url, true );
}
