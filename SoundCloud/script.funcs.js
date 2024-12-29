/*
 * artwork funcs
 */
function append_artwork( artwork_url ) {
    // also change for upload form [?]
    var thumbURL = artwork_url.replace(/-(t\d\d\d?x\d\d\d?|crop|large|badge|small|tiny|mini|original)/g, "-t500x500"),
        origUrl = thumbURL.replace("-t500x500", "-original"),
        artworkURL = thumbURL;
    
    if( $("#mdb-artwork-wrapper").length === 0 ) {
        $(".listenArtworkWrapper").replaceWith('<div id="mdb-artwork-wrapper"></div>');
        var imgWrapper = $("#mdb-artwork-wrapper");
        
        imgWrapper.append('<div id="mdb-artwork-input-wrapper"><input id="mdb-artwork-input" class="selectOnClick"  type="text" value="'+origUrl+'" /></div>');

        $("<img>", {
            src: origUrl,
            load: function() {
                imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');
            }, error: function() {
                // check if original is PNG
                origUrl = origUrl.replace(".jpg",".png");
                $("<img>", {
                    src: origUrl,
                    load: function() {
                        imgWrapper.prepend('<a class="mdb-artwork-img" href="'+origUrl+'" target="_blank"><img id="mdb-artwork-img" src="'+origUrl+'" /></a>');
                    },
                    error: function() {
                        // no original PNG, return 500x500 jpg
                        imgWrapper.prepend('<a class="mdb-artwork-img" href="'+thumbURL+'" target="_blank"><img id="mdb-artwork-img" src="'+thumbURL+'" /></a>');
                    }
                })
            }
        });
    }
}