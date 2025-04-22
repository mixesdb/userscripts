/*
 * escapeRegExp
 * Escape stzrings for RegExp http://stackoverflow.com/questions/2593637
 */
function escapeRegExp(string) {
    if (typeof string != "undefined") {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
}


// removeVersionWords
function removeVersionWords( t ) {
    return t
            .replace( / (Original( Mix)?( Remastered)?|remix(?: \d+)?|rmx|rx|mixx?|version|vocal|Encore|Edit(?:!ion)?|Re-?Edit|Re-?work|Re-?Touch|Re-?model|Re-?Rub|Re-?vision|Re-?construction|Re-?make|Bemix|ori?gi?nal|orig|remaster(ed)?|process(?:ed)?|reshaped?|reconstruct.{,3}|(?:Re)?definition(?:!\sRec)|Perspective|interpretation|Translation|redo|re-?beef|re-?ruff|re-?prise|ReTop|Instr(?:\.)?umental(?: Version)?|acc?app?(?:ella)?|Dub Mix|Dub[a-z]{,6}mental|M[au]sh(?: )?Up)/gmi, " " )
            .trim();
}

// normalizeYoutubeTitle
function normalizeYoutubeTitle( t, tCheck ) {
    var rx1 = new RegExp( "[A-Z]{2,6}[-: ]*[0-9]+(?: | - | \/+ )(" +escapeRegExp(tCheck)+ ")", "g");

    if( typeof(t) == "undefined" ) return false;

    var t = removeVersionWords( t.trim() );

    return t
            .replace( /_/g, " " )
            .replace( /  /g, " " )
            .replace( "[", " [" )
            .replace( "[", " [" )
            .replace( "&amp;", "" )
            .replace( "&#39;", "" )
            .replace( "'", "" )
            .replace(/^"(.+)" (.+)/, "$1 - $2")
            .replace(/^"(.+[A-Za-z])"-([A-Za-z].+)/, "$1 - $2")
            .replace( /[. ](wmv|mp4|avi)/gi, "" )
            .replace( /\(\d+\s*kbps\)$/gi, "" )
            .replace( / (\[|\()Full Album(]|\))/i, " NOMATCH" )
            .replace( / \[(.+)] \((.+)\)$/gmi, " ($1) [$2]") /* [These Sounds Fall Into My Mind] (Official Video) */
            .replace( /\) [A-Z]{3,5}[ -\/]+\d+/g, ")" ) // (V) CAT
            .replace( /(?:\(|\[)*[A-H][0-9]+(\.|\)|])+ /g, "" ) // B1. A -T
            .replace( /^\(HD\) /i, "" ) // (HD) A - T
            .replace( /\{(.+)\}/g, "($1)" )
            .replace( /(\(|\[) /, "$1" )
            .replace( / Original( Version| Mix)?$/gi, "" ) // A - T Original
            .replace( / \((The Bunker (New York|NY)|PAMPA|Studio Barnhus|Robsoul|Numbers|House Please\.)(?:.+|)\)/, "" ) // (L)
            .replace( / - (Drumcode|Truesoul) - (DC|TRUE)\d+$/, "" ) // - L  - C
            .replace( /^(.+ - .+) - (Drumcode - DC\d+|Unknown To The Unknown)/gi, "$1" )
            .replace( /^Monaberry #\d+ \/ /i, "" ) // LC A - T
            .replace(/ \[((?!\[).)+\] \[[A-Z0-9-]{3,11}\]/g,"") // A - T [Label] [CAT]
            .replace( / (\)|])/, "$1" )
            .replace( / - Greatest Hits? - (.+)/i, " - $1" )
            .replace( /\) (19|20)[0-9]{2}$/i, ")" ) // A - T (V) YYYY
            .replace( /(.+ - .+) \(((?!\)).)+ (EP|Album|LP)\)/gi,"$1") // A - T (Z EP)
            .replace( / (Audio|Premiere|Teaser|H[QD]|(?:720|1080|1440|2160)(?: )?p?|4K|(Un)?Official|Full(?: Length)?|Forthcoming|Promo|With|Out Now!*)$/gmi, "") // A - T HD 720p
            .replace( /(.+) [\[\({](Audio|Premiere|Teaser|H[QD]|(?:720|1080|1440|2160)(?: )?p?|4K|(Un)?Official|Full|Forthcoming|Promo|With|Out Now!*)[: ]?(Lyrics?)?( )?(Video|Audio|Track|Song|Clip|Snippet|Premiere|Teaser|Lyrics|Version|Mix|Visualiser)?[}\)\]].*$/gmi, "$1") // A - T (Audio|HD|HQ|Official...) > insensitive
            .replace( /(.+)\[Audio]$/i, "$1" )
            .replace( /^DT:Premiere \| /gmi, "")
            .replace( /^(Premiere|Teaser|Forthcoming|Promo|Full):( )?/gmi, "")
            .replace( /\s\[(TECHNO|TECH(?: |-)HOUSE|HOUSE)]\s*$/gi, "" ) // A - T [TECH HOUSE]
            .replace( /((?:(?!-).)+) \| ((?:(?!-).)+) \| ((?:(?!-).)+) (Recordings|Records|Music)$/g, "$1 - $2" ) // A | T | L |
            .replace( "--", "-" ) // A -- T
            .replace( "- ", " - " ) // A- T
            .replace( " -", " - " ) // A -T
            .replace(/ ^(.+) - ((?:(?! - ).)+) - (.+)$/g, "$1 - $3") // A - 01 - T
            .replace( /  /g, " " )
            .replace( / - [A-H][0-9]+ (.+)/gi, " - $1" ) // A - B2 T
            .replace( /^(TECHNO|TECH(?: |-)HOUSE|HOUSE): /gi, "" ) // [TECH HOUSE]: A - T
            .replace( /^\[\d{4}] (.+ - .+)/g, "$1" ) // [YYYY] A - T
            .replace( /^(.+ - .+) \(\d{4}\)$/g, "$1" ) // A - T (YYYY)
            .replace( /^((?:(?! - ).)+) \(Aka (?:(?! - ).)+\) - /i, "$1 - " ) // A (Aka A2) - T
            .replace( /[A-Z]{1,6}[-: ]*[0-9]+[-: ]+(((?! - ).)+ - ((?! - ).)+)( - .+)*/g, "$1" ) // CAT - A - T - Foo
            .replace( /^((?:(?!\|).)+) \| ((?:(?!\|).)+)$/g, "$1 - $2" ) // A | T
            .replace( /( )+/g, " " )
            .replace( / \((origi?nal|radio|main radio).*\)$/gi, ' ')
            .replace( / HD$/g, ' ') /* case sensitive */
            .replace( /(^.+) presents? ((?! - ).)+ - (.+$)/gi, "$1 - $3" ) // A1 & A2 present A3 - T
            .replace( /(.+ - .+) \[.+].*$/g, "$1" ) // A - T [Foo]
            .replace( /(.+) - (.+) \|.+\|.*$/g, "$1 - $2" ) // A - T |Foo|
            .replace( /(.+ - .+) \([A-Z]{2,6}[-: \/]*[0-9]+\).*$/g, "$1") // A - T (CAT) > sensitive
            .replace( /(.+ - .+) [A-Z]{2,6}[-: \/]*[0-9]+$/g, "$1") // A - T CAT > sensitive
            .replace( /^((?:(?!,| - ).)+), ((?:(?!,| - ).)+)$/g, "$1 - $2" ) // A, T
            .replace( /(((?! - ).)+ - ((?! - ).)+) - .+$/g, "$1" ) // A - T - Foo
            .replace( rx1, "$1" ) // A - T - Foo
            .replace( /((?:(?! - ).)+) (?:- )?['"‘’`´]((?:(?! - ).)+)['"‘’`´]/g, "$1 - $2" ) // A ‘T’ | A - ‘T’ > 
            .replace( /(.+) - (.+) (?:\(|\[)(Ft|Feat\.|Featuring?)\.? (((?!\().)+)(?:\)|])/i, "$1 $3 $4 - $2 " ) // A - T (Ft. A2) | A - T Ft. A2 > A & A2 - T
            .replace( /(.+) - ((?:(?!\().)+) \((.+ (?:remix|mix|version|edit)) (?:Ft|Feat|Featuring?)\.? (.+)\)/gi, "$1 Feat. $4 - $2 ($3)" ) // A - T (V Feat.)
            .replace( /(.+) - (.+) (?:Ft|Feat|Featuring?)\.? (((?!\().)+)/i, "$1 & $3 - $2 " ) // A - T Ft. A2 | A - T Ft. A2 > A & A2 - T
            //.replace(/^(.{2,}) (?:Ft\.|Feat\.|vs|Pres\.) (?:(?! - )..)+ - (.+)/gi, "$1 - $2") /* Remove A Feat. AX */
            .replace( /( -)*$/g, "" )
            .replace( /( )+/g, " " )
            .replace( "Akkord ", "Δkkord " )
            .replace(/ (&|x|and|\+|vs\.?) /gi, " ")
            .trim()
           ;
}