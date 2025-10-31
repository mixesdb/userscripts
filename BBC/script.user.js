// ==UserScript==
// @name         BBC (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.10.21.1
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/BBC/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/BBC/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-BBC_3
// @include      http*bbc.co.uk*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bbc.co.uk
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
var cacheVersion = 1,
    scriptName = "BBC";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function mainFX() {
    var ep = $(".prog-layout.programmes-page"),
        ul = $("ul.segments-list__items"),
        rows = $("li", ul).length,
    tl = "";

    if(rows > 0 ) {
    if( $("#tlEditor").length === 0 ) $(ep).prepend('<div id="tlEditor" class="fs75p"></div>' );

      $("> li, > li ul li", ul).each(function(){

          /* Chapters */
          if( $(this).hasClass('segments-list__item--group') ) {
              var chapter = $("> h3", this).text().trim();
              //log("C: " + chapter);
              tl += "\n;" + chapter + "\n";
          }

          // Track items */
          if( $(this).hasClass('segments-list__item--music') ) {
              /* Build artist */
              //var artist = $('.segment__track span.artist', this).text();
              //artist can be 2 span.artist joined by " and " > bbc.co.uk/programmes/b03dshct
              var artist = "Unknown",
                  artistItem = $('.segment__track h3 span.artist, .segment__track h4 span.artist', this),
                  artistCount = artistItem.length;
              if( artistCount == 1 ) {
                  var artist = artistItem.text().trim();
              }
              if( artistCount > 1 ) {
                  var artist = "";
                  artistItem.each(function(){
                      artist += $(this).text() + " & ";
                  });
                  var artist = artist.trim().replace(/ &$/g, "");
              }
              var artist = artist.replace(/\[Unknown]/gi, "Unknown");

              /* Build title */
              //fix span.title "Artist - Title" like > bbc.co.uk/programmes/b03f4lgk
              //var titleRx = new RegExp(artist + " - ", "g");
              //var title = title.replace(titleRx, '');
              var title = $('.segment__track p.no-margin', this).text().replace(/\s+/gm," ").trim();


              /* Build label */
              var label = $('abbr[title="Record Label"]', this).text().trim().replace(/^Unknown$/gi, "").replace(/\.\s*$/, "");
              /*
              log("A: " + artist);
              log("T: " + title);
              log("L: " + label);
              log("---------------------------------------------------------------");
              */

              /* Build tracklist */
              if(artist && title)  tl += "# " + artist + " - " + title;
              if(label) tl += " ["+ label +"]";
              if(artist && title)  tl += "\n";

              /* End of Chapter? */
              // Check if current li is last in nested ul group
              if( $(this).is(':last-child') ) {
                  if( $(this).parent("ul").hasClass('segments-list__group-items') ) {
                      tl += "\n;Chapter\n";
                  }
              }
          }
      });
    }

  // API
  if( $("#mixesdb-TLbox").length === 0 ) {
      log( "tl before API:\n" + tl );
      var res = apiTracklist( tl, "standard" ),
          tlApi = res.text,
          feedback = res.feedback;

    if( tlApi ) {
      $("#tlEditor").append('<textarea id="mixesdb-TLbox" class="mono" style="width:100%; margin:10px 0 0 0;">'+tlApi+'</textarea>');
      fixTLbox( res.feedback );
    }
  }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Run funcs
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
waitForKeyElements("ul.segments-list__items", mainWait);
function mainWait(jNode) {
    mainFX();
}