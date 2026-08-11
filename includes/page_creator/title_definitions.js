log( "/includes/page_creator/title_definitions.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Definitions for the MixesDB page creator's title suggestion
 *
 * The suggestion itself is built in buildMixesdbTitle() (title_builder.js) and offered as an
 * editable input by page_creator.js. Everything in this file is plain data meant to be
 * extended by hand - no logic, so it can be edited without reading the parser.
 *
 * Shared by every site script that has a player title, a channel name and a date. The word
 * lists are site-agnostic (they are English/German title vocabulary), so a rule learned from
 * one site applies to all of them. The one list keyed by site data is
 * mdbTitleUsernameConversions, whose keys are channel names - add them per site, they cannot
 * collide in practice because the same channel name on two sites means the same show.
 *
 * The examples in the comments below are SoundCloud titles because that is the site the rules
 * were learned on first - they are examples, not a restriction.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/*
 * The three groups
 *
 * A MixesDB mix page title is made of exactly THREE groups, separated by " - ":
 *
 *     YYYY-MM-DD - Artist - Entity
 *
 * Everything read out of a player title has to end up inside one of them. A 4th group is
 * always a parsing mistake, never a richer title. Every way one has appeared so far, and all
 * of them are a NUMBER or a NAME that was cut loose from the group it belongs to:
 *
 * - An episode NUMBER given its own group:
 *       "Planet Melis - Techno Germany Podcast 226"
 *       WRONG: 2026-08-06 - Planet Melis - 226 - Techno Germany Podcast
 *       RIGHT: 2026-08-06 - Planet Melis - Techno Germany Podcast 226
 *   Artist and entity were both already there, so there was nothing to solve: the number
 *   belongs BEHIND the entity it numbers (see mdbTitle_assemble). A number is something to
 *   watch out for, but it is never a group of its own.
 *
 * - Further artists given their own group:
 *       "Rinse France Show - Slowciety w/ Asa 808 - 07/03/2019"
 *       WRONG: 2019-03-07 - Slowciety - Rinse France Show - w/ Asa 808
 *       RIGHT: 2019-03-07 - Slowciety, Asa 808 - Rinse France Show
 *   They belong INTO the artist group - see mdbTitleExtraArtistConnectors below.
 *
 * - The entity split in half at the word before its number:
 *       "SEVEN Mix 084 - Theo Scuera"    (channel "SEVEN")
 *       WRONG: 2026-07-13 - SEVEN - Mix 084 - Theo Scuera (Promo Mix)
 *       RIGHT: 2026-07-13 - Theo Scuera - SEVEN Mix 084
 *   "SEVEN Mix" is the entity, see mdbTitleShowSuffixWords. Two perfect groups in the wrong order
 *   is the easy case - do not take them apart, swap them.
 *
 * - The channel name added although the title already carried both groups:
 *       "MOLTO IN THE MIX - Guest of the Week: buyArt"   (channel "Molto Recordings Group")
 *       WRONG: 2026-07-24 - MOLTO IN THE MIX - Guest of the Week: buyArt - Molto Recordings Group
 *       RIGHT: 2026-07-24 - buyArt - Molto In The Mix
 *   Nothing was missing, so nothing had to be filled in. A channel name that is neither
 *   mapped nor found in the title is a guess, and a guess never earns a fourth group.
 *
 * - The number written ONTO the entity, cut off as a stray ".251":
 *       "Trommel.251 - Arno"    (channel "trommel")
 *       WRONG: 2026-08-06 - trommel - .251 - Arno (Promo Mix)
 *       RIGHT: 2026-08-06 - Arno - trommel.251
 *   The channel name confirms the entity, and the channel's spelling is the one used.
 *
 * A suggestion that still comes out with more than three groups takes a big confidence hit,
 * because it means part of the player title was not understood.
 */


/*
 * Characters a wiki title cannot hold
 *
 * MixesDB is a MediaWiki, and a page title may not contain # < > [ ] | { }. They are replaced
 * by a space, so the words on either side survive: "RAUSCH#6" -> "RAUSCH 6".
 *
 * "|" is worth a word of its own: player titles use it as a separator all the time, and it
 * turning up in a suggestion never means "this title has a pipe in it" - it means a bit of the
 * title was not split up and not understood. It is replaced anyway, but the parse is what has
 * to be fixed when one appears.
 *
 * The SQUARE brackets are the exception, and mdbTitle_wikiSafe() handles them before this list
 * is applied: a bracket a title still carries at that point is holding something ("[Live]",
 * "[Part 2]"), so it becomes the ROUND bracket a wiki title may hold, never a space. Dropping
 * a bracket pair takes a word with it, which is a decision - and the rules that make those
 * (mdbTitleNoise, mdbTitleDroppedBitPatterns, mdbTitleKnownLabels) have all run by then.
 *
 *     "[selected] podcast 064 w/ STRAUSS."  (channel "[selected]")
 *     WRONG: 2026-08-11 - Strauss. - Podcast 064
 *     RIGHT: 2026-08-11 - Strauss. - (selected) Podcast 064
 *
 * The brackets are what the show is called there, and losing them loses the name. A square
 * bracket becomes a round one - it is never simply removed.
 */
var mdbTitleWikiIllegalChars = /[#<>\[\]|{}]+/g;


/*
 * mdbTitleApostropheChars
 *
 * The apostrophe variants an uploader's keyboard produces, all written as the plain "'" that
 * MixesDB uses:
 *
 *     "MIT DIR `23 Warm Up Session"  ->  "MIT DIR '23 Warm Up Session"
 *
 * A page title spelled with a backtick or a typographic quote is a different page from the
 * same title spelled plainly, so this is not cosmetics: it decides whether an editor finds
 * the page again. Only apostrophe-SHAPED characters belong here - quotation marks (" “ ”) are
 * a different character with a different job and are left alone.
 */
var mdbTitleApostropheChars = /[`´‘’‚‛ʻʼ′]/g;


/*
 * The spelling every group is held to
 *
 * mdbTitle_tidy() in title_builder.js runs over the artist and the entity at the single exit of
 * buildMixesdbTitle(), so it holds whichever branch built them, and over nothing else. These are
 * MixesDB spelling conventions, not parsing - they never change WHAT a group says, only how it
 * is written, which is why they can be applied blindly to a group nobody understood:
 *
 * - apostrophe variants become "'"                    (mdbTitleApostropheChars)
 * - "[...]" becomes "(...)"                           (mdbTitle_wikiSafe, see above)
 * - no space behind "(" or in front of ")"            "( Live )"     -> "(Live)"
 * - no space in front of ","                          "Tonino , DJ"  -> "Tonino, DJ"
 * - a run of spaces becomes one, and the title is trimmed
 *
 * What is NOT in that list, and must not be added to it: dropping brackets. A bracket that is
 * still standing at the exit is holding a word, and a word is not something a cleanup step gets
 * to decide about - mdbTitleNoise and mdbTitleDroppedBitPatterns are where a chunk is dropped,
 * both of them off a list that says which chunks, and both long before this.
 */


/*
 * Brackets are a chunk of their own
 *
 * "(...)", "[...]" and "{...}" separate a title exactly the way a "|" does - a player title
 * puts an aside in brackets and the next thing in a new chunk, and which of the two an uploader
 * reaches for says nothing about the content:
 *
 *     "Anja Schneider - Live at Docklands (Smirnoff Sound Collective Camp)"
 *     is read as "Anja Schneider | Live at Docklands | Smirnoff Sound Collective Camp"
 *
 * So they are rewritten to "|" before anything else looks at the title, and every rule that
 * splits a title into chunks gets the bracketed one for free, without knowing about brackets.
 * The chunk then lives or dies by the same rules as any other: here the last one names a camp,
 * which mdbTitleDroppedBitPatterns drops, and the title comes out as
 * "2016-07-14 - Anja Schneider @ Docklands".
 *
 * Decoration in brackets is gone by then - mdbTitleNoise runs first, and so does the label
 * credit of mdbTitleKnownLabels below.
 *
 * The one bracket that is NOT a chunk of its own is the one OPENING the title with the CHANNEL
 * NAME. There the brackets are how the brand writes itself and the words behind them are the
 * rest of the same name: "[selected] podcast 064" is one show, not a "[selected]" standing next
 * to a "podcast 064". It keeps its place and its brackets become round ones (mdbTitle_wikiSafe).
 *
 * Only at the head of the title. A bracket at the END is an aside about what stands in front of
 * it, and stays one however it reads - "Tooker (SONARA)" credits Tooker's label even when it is
 * SONARA uploading it.
 */


/*
 * mdbTitlePromoMixImpliedWords
 *
 * " (Promo Mix)" is written behind a title to say the name in front of it is NOT a podcast or
 * radio show. A name that already carries one of these words says so by itself, so the suffix
 * would only repeat it:
 *
 *     "Brisboys - Summer 2026 Mix"  ->  2026-08-07 - Brisboys - Summer 2026 Mix
 *                                       and NOT "... Summer 2026 Mix (Promo Mix)"
 *
 * The mix is still a promo mix - the suggestion says so under the "Create" link instead, as
 * the category to put the page in.
 */
var mdbTitlePromoMixImpliedWords = [
    "mix", "mixtape", "volume", "vol"
];


/*
 * Group 1: the date
 *
 * Two sources may be used, the player title and the upload/release date.
 *
 * - A date written in the title ALWAYS wins, including when the upload date is the earlier of
 *   the two. The two legitimately differ - radio shows get uploaded days later, old sets years
 *   later - and the title is the only one of the two that names the mix's own date.
 * - When the digits in the title read several ways ("07/03/2019" as 7 March or 3 July,
 *   "030426" as DDMMYY/MMDDYY/YYMMDD), the upload date decides between those readings: the one
 *   closest to it wins, and on a tie the earlier one does, since a mix is normally recorded
 *   before it is uploaded.
 * - No date in the title at all -> the upload date, which is a guess and says so in the
 *   confidence reasons.
 *
 * A month and year make a date ONLY as a group of their own. A part of the date that is not
 * known is LEFT OFF, never padded: "2026-03", and "2026" if even the month is missing - not
 * "2026-03-XX" or "2026-XX-XX".
 *     "Adriana Lopez at RAW x Monnom Black | Mar 2026"  ->  2026-03
 *     "House Set August 2026 - Simeon Sarfati"          ->  the upload date; "August 2026" is
 *                                                           part of the mix's NAME, not a date
 * A year on its own ("1998") is still never read as a date, for the same reason - it is part
 * of a name far more often than it is the year of the mix, and there is an exact upload date
 * to fall back to. The "YYYY" spelling above is what to use if that ever changes.
 */


/*
 * mdbTitleUsernameConversions
 *
 * Channel/profile name (SoundCloud API field "username") -> the show/podcast entity a
 * MixesDB mix page title uses for it. The channel name is the only reliable hint we have,
 * since the track title itself often carries just the artist and an episode number.
 *
 * "NTS Latest": "NTS Radio"  ->  "2026-04-03 - Ruf Dug - NTS Radio"
 *
 * Notes:
 * - The lookup is case-insensitive, so a casing slip in a key still works.
 * - Map a channel to an EMPTY STRING when it is not a show at all (e.g. an artist uploading
 *   their own club recordings) - the title then ends after the artist:
 *       "Some Artist": ""      ->  "2026-04-03 - Some Artist"
 * - A channel that is NOT listed here falls back to its raw channel name, so the common
 *   case of an unmapped show still produces something usable.
 */
var mdbTitleUsernameConversions = {
    "NTS Latest": "NTS Radio",
    "Resident Advisor": "RA Podcast"
};


/*
 * mdbTitleTypoFixes
 *
 * Misspellings corrected before the title is parsed at all, i.e. before any rule reads a word
 * of it. A typo in an ordinary word costs a letter; a typo in a word the PARSER reads costs
 * the whole title:
 *
 *     "Phono music club podcats by Neryn"  (channel "PHONO Music Club")
 *     WRONG: 2026-08-10 - PHONO Music Club - podcats by Neryn (Promo Mix)
 *     RIGHT: 2026-08-10 - Neryn - PHONO Music Club Podcast
 *
 * "podcats" is not in mdbTitleShowSuffixWords, so the channel name never grew into
 * "PHONO Music Club Podcast", and everything after that followed from it.
 *
 * Only for words that can be nothing BUT a typo of a word the parser reads - never for a
 * spelling somebody may have meant. The case of what was typed is kept ("PODCATS" comes back as
 * "PODCAST", not as "Podcast"): which case a bit of the title is in is a question
 * mdbTitle_toNormalCase answers later, off the bit as a whole, and this must not answer it early.
 */
var mdbTitleTypoFixes = [
    { wrong: /\bpodcats\b/gi, right: "podcast" },
    { wrong: /\bpodast\b/gi,  right: "podcast" },
    { wrong: /\bpocast\b/gi,  right: "podcast" }
];


/*
 * mdbTitleLabelWords / mdbTitleKnownLabels
 *
 * What an uploader puts in brackets behind an artist is usually the LABEL or the crew that
 * artist is on, and a MixesDB mix page title does not carry it:
 *
 *     "HMWL Podcast 439: Tooker (SONARA / Crosstown Rebels)"
 *     WRONG: 2026-08-05 - Tooker SONARA Crosstown Rebels - HMWL Podcast 439
 *     RIGHT: 2026-08-05 - Tooker - HMWL Podcast 439
 *
 * Nothing in the SHAPE of "(SONARA / Crosstown Rebels)" says that - it reads exactly like a
 * bracket holding a second artist - so the names in it are tested against three things in turn,
 * cheapest first (mdbTitle_isLabelName in title_builder.js):
 *
 * 1. mdbTitleLabelWords - the word a label writes into its own name ("Records", "Recordings",
 *    "Rec.", "Label"). One of those and there is nothing left to ask.
 * 2. mdbTitleKnownLabels - the labels and event organisers reported so far, by name. Kept
 *    ALPHABETICAL so it stays readable as it grows, and extended by hand from reports.
 * 3. the labels this mix's own TRACKLIST credits, which is where a label is written out in
 *    full: "Artist - Title [Label]" and "Artist - Title [Label - Cat#]". A name the uploader
 *    credits behind a track is a label whether or not any list here knows it - which is what
 *    makes this work for the label nobody has reported yet. The site script hands the
 *    description over; a site that has none simply stops after step 2.
 *
 * EVERY name in the bracket has to pass for the bracket to be dropped. "(SONARA / Crosstown
 * Rebels)" only goes because both do - a bracket holding one label and one unknown word is far
 * more likely to be something we have not understood than a label credit, and a wrong drop
 * takes a name out of the title for good.
 */
var mdbTitleLabelWords = /\b(?:labels?|records?|recordings?|recs?|imprint|schallplatten)\b\.?/i;

var mdbTitleKnownLabels = [
    "Crosstown Rebels",
    "SONARA",
    "Tresor"
];


/*
 * mdbTitleNoise
 *
 * Patterns removed from the player title before it is parsed. Only for decoration that
 * is never part of a MixesDB title - keep this list conservative, since anything matched
 * here is silently dropped from the artist name.
 */
var mdbTitleNoise = [
    /\[\s*free\s*(?:download|dl)?\s*\]/gi,
    /\(\s*free\s*(?:download|dl)?\s*\)/gi,
    /\*+\s*free\s*(?:download|dl)?\s*\*+/gi,
    /\bfree\s*(?:download|dl)\b/gi,
    /\[\s*(?:premiere|exclusive)\s*\]/gi,
    /\(\s*(?:premiere|exclusive)\s*\)/gi
];


/*
 * mdbTitleExtraArtistConnectors
 *
 * Words that introduce FURTHER artists, e.g. "Slowciety w/ Asa 808". Everything from the
 * connector up to the next separator is taken out of the title and appended to the artist
 * group with mdbTitleExtraArtistJoiner - it is never a group of its own.
 *
 * What stands in FRONT of the connector decides whether there is a first artist at all:
 *
 *     "Rinse France Show - Slowciety w/ Asa 808"   ->  artist "Slowciety, Asa 808"
 *     "Yoyaku Instore Sessions with TONTON & TATA" ->  artist "Tonton & Tata"
 *
 * The first names an artist, the second a series ("Sessions"), and only the first one joins
 * the artist group. A channel name at the start of a series title is part of that title and
 * is NOT an artist - "yoyaku" does not belong in front of "Tonton & Tata" just because the
 * mix was uploaded by it. A bit is read as a series by the same test the title's own split
 * uses: a series word beats a bare number beats nothing.
 *
 * Deliberately NOT listed here:
 * - "presents" / "pres." - the name in front of it is the PRESENTER (the show), not a second
 *   artist: "fabric presents Bonobo".
 * - "feat." / "ft." - on a mix that is a guest on one track, not someone who played the set.
 *
 * Careful: a connector is matched anywhere in the title, so an ordinary English word misfires
 * on an ordinary phrase - "Live with Love - Some Artist" reads as the artists "Live, Love".
 * "with" is in the list because it is the far more common case on a mix title, but it is the
 * one entry worth removing if that turns out to be the wrong trade. Shorthands like "w/"
 * carry no such risk, so prefer them when extending the list.
 *
 * One shape is known to misfire and is ruled out: a connector with the series NUMBER behind it
 * stands INSIDE a name and introduces nobody.
 *
 *     "From Paris With Hope Vol.14"  ->  the whole title is the mix name, there is no "Hope"
 *                                        who played it
 *
 * The number is what settles it. A name behind the connector is an artist as usual, digits in
 * it or not - "Slowciety w/ Asa 808" still names Asa 808 - because only an episode KEYWORD
 * ("Vol.14", "Episode 72") says the series name goes on past the connector.
 *
 * And only when what stands in FRONT of the connector is not a series already: in
 * "Some Show w/ DJ Koze Vol.3" the number belongs to the show in front, and DJ Koze is its
 * guest like anybody else behind a "w/".
 */
var mdbTitleExtraArtistConnectors = [
    "w/",
    "with"
];


/*
 * mdbTitleExtraArtistJoiner
 *
 * How the extra artists are joined onto the first one. Help:Add_a_new_mix_page reserves " & "
 * for artists who played TOGETHER (b2b) - "w/" says nothing about that, and playing after one
 * another is the normal case, so "," is what we assume. The suggestion says so in its
 * confidence reasons, since only the recording itself can settle it.
 */
var mdbTitleExtraArtistJoiner = ", ";


/*
 * mdbTitleTogetherArtistJoiners
 *
 * Words that join artists who played TOGETHER, and are replaced by the " & " that
 * Help:Add_a_new_mix_page uses for exactly that: "Surgeon x Erika" -> "Surgeon & Erika".
 * Matched in either case ("x" and "X"), and only inside the artist group - an "x" between two
 * brands in a venue name ("RAW x Monnom Black") is a collaboration of promoters, not of DJs.
 *
 * "b2b" is NOT here: MixesDB writes it out ("Ruf Dug b2b Daniel John Willis"), so it stays.
 */
var mdbTitleTogetherArtistJoiners = [
    "x"
];


/*
 * mdbTitleArtistJoinerSpellings
 *
 * How MixesDB SPELLS a joiner between two artists -> every way it turns up in a player title.
 * Whatever stands on the right is rewritten to the key on the left, in any case:
 *
 *     "See Bastian B2B Afin"  ->  "See Bastian b2b Afin"
 *     "Surgeon VS. Regis"     ->  "Surgeon vs Regis"
 *     "Surgeon versus Regis"  ->  "Surgeon vs Regis"
 *
 * "b3b" is nobody's spelling - three artists back to back are "b2b2b" - so it is read as a
 * mistyped "b2b" rather than carried into the title.
 *
 * "presents" becomes the "," of mdbTitleExtraArtistJoiner, exactly like the "with" it reads as
 * by then:
 *
 *     "Some Podcast 12 - Foo presents Bar"  ->  "... - Foo, Bar - Some Podcast 12"
 *
 * That is the LEFTOVER case, and the only one that reaches this: a presenter whose name the
 * parser could place is already the entity by now ("fabric presents Bonobo" on the channel
 * "fabric" -> "Bonobo - fabric", see buildMixesdbTitle 4b). What is left is a "presents" sitting
 * inside a finished artist group with nowhere for the presenter to go, and two names filed as
 * two artists beat one category holding the whole phrase.
 *
 * Applied to the ARTIST group only, and never to the entity: an entity is a name, and a mix
 * called "Techno versus House" is not two artists playing against each other.
 *
 * A joiner needs whitespace on both sides to be one, which is what keeps the "vs" of a name out
 * of it. Variants are tried longest first, so "b2b2b" is never read as "b2b" with a stray "2b"
 * behind it. A joiner written as punctuation swallows the space in front of it, so it comes out
 * as "Foo, Bar" and not "Foo , Bar".
 */
var mdbTitleArtistJoinerSpellings = {
    "b2b2b": [ "b2b2b" ],
    "b2b":   [ "b2b", "b3b" ],
    "vs":    [ "vs", "vs.", "versus" ],
    ",":     [ "presents", "present", "pres.", "pres" ]
};


/*
 * mdbTitleArtistSplitJoiners
 *
 * What separates two ARTISTS inside the artist group - i.e. every way a MixesDB title can say
 * "more than one person played this". The page creator files one [[Category:<name>]] per artist
 * off this list, so a joiner missing from it costs a category:
 *
 *     "2023-08-02 - See Bastian b2b Afin - ..."
 *     ->  [[Category:See Bastian]] [[Category:Afin]], never [[Category:See Bastian b2b Afin]]
 *
 * The "," (one after another) and the "&" (together) are what the builder itself writes; the
 * word joiners are here because the title is EDITABLE - what the reader corrected it to has to
 * be filed the same way, and they type "b2b", "vs" and "feat." rather than the builder's
 * spelling.
 *
 * A word joiner needs whitespace on both sides, which is what keeps the "x" in "Maxxi
 * Soundsystem" out of it - see mdbTitle_splitArtists(). The "," does not, and it is the one
 * entry that can also stand inside a name, which is a trade MixesDB makes as well.
 *
 * Longest entry first, so "b2b2b" is not read as "b2b" with a stray "2b" behind it.
 */
var mdbTitleArtistSplitJoiners = [
    "b2b2b", "b3b", "b2b",
    "versus", "vs.", "vs",
    "featuring", "feat.", "feat", "ft.", "ft",
    "&", "x"
];


/*
 * mdbTitleVenueConnectors
 *
 * Words that put a VENUE or EVENT behind the artist, replaced by the "@" joiner of
 * Help:Add_a_new_mix_page#Joiners:_Live_/_@_/_-
 *
 *     "Adriana Lopez at RAW x Monnom Black"  ->  "Adriana Lopez @ Monnom Black"
 *
 * Careful: "at" is an ordinary English word, so it misfires on an ordinary phrase the same way
 * "with" does in mdbTitleExtraArtistConnectors. It is here because a mix title naming a place is far
 * more common than one using "at" as a preposition, but it is the entry to remove first if
 * that turns out wrong. Two words have to stand in front of it for that reason, which is what
 * keeps "Look at Me" a mix name - see mdbTitleLiveAtWords for the case that overrules the count.
 */
var mdbTitleVenueConnectors = [
    "at"
];


/*
 * mdbTitleLiveAtWords
 *
 * "Live at <place>" says outright what the rest of the parser can only guess at: this was
 * RECORDED SOMEWHERE, at an event, a club or a radio station. So it is an "@", however few
 * words stand in front of it - one name is enough, and the two-word count that keeps ordinary
 * English out of mdbTitleVenueConnectors does not apply:
 *
 *     "Anja Schneider - Live at Docklands"  ->  "2016-07-14 - Anja Schneider @ Docklands"
 *
 * The separator in front goes with it: the artist and the place they played at are ONE group
 * ("Anja Schneider @ Docklands"), never two. The word "Live" itself is dropped - MixesDB says
 * that with the joiner alone, see Help:Add_a_new_mix_page#Joiners:_Live_/_@_/_-
 *
 * "at" and "@" both count as the connector behind the word, so "Live @ Docklands" is the same
 * title. Longest entry first: they are tried in order and "live" would otherwise swallow the
 * start of "live set".
 */
var mdbTitleLiveAtWords = [
    "recorded live",
    "live set",
    "live"
];


/*
 * mdbTitleGuestMarkers
 *
 * Phrases that mark the guest artist, so the words next to them are a name and not part of
 * the show. Matched in any case, and read in both directions - a ":" or a "by" behind the
 * phrase means the guest is named AFTER it, otherwise in FRONT of it:
 *
 *     "Hot To The Touch 321 | RAW-ARTES GUEST MIX"
 *     ->  2026-08-05 - Raw-Artes - Hot To The Touch 321
 *     "MOLTO IN THE MIX - Guest of the Week: buyArt"
 *     ->  2026-07-24 - buyArt - Molto In The Mix
 *
 * Without this, a bit ending in "Mix" looks like a series of its own and the show and the
 * artist swap places. The phrase itself is dropped: MixesDB has no "Guest Mix" in a title,
 * the guest simply IS the artist.
 */
/*
 * "by" says a NAME follows
 *
 * The word behind a show name is the artist, with or without a separator in between:
 *
 *     "Phono music club podcast by Neryn"  ->  2026-08-10 - Neryn - PHONO Music Club Podcast
 *     "Some Podcast 12 by Someone"         ->  2026-08-05 - Someone - Some Podcast 12
 *
 * Which "by" counts is decided by its CASE, because the word is also an ordinary English one:
 *
 * - written lowercase, it is the preposition and a name follows it
 * - written "BY" inside a bit that is SHOUTED throughout, it is the same word - caps say
 *   nothing there, everything around it is in caps too
 * - written "By" inside a bit that is not, it is a word of the NAME ("Stand By Me"), and
 *   nothing follows it
 *
 * Read in two places: mdbTitle_cleanArtist drops it off the front of what is left over
 * ("... podcast by Neryn" leaves " by Neryn"), and rule 5b of buildMixesdbTitle takes it as the
 * separator between an episode number and the artist behind it.
 */
var mdbTitleGuestMarkers = [
    "guest mix",
    "guestmix",
    "guest set",
    "guest podcast",
    "guest show",
    "guest of the week"
];


/*
 * The number is the border between entity and artist
 *
 * A player title does not need a separator to be readable. The EPISODE NUMBER marks where
 * the entity ends, so whatever follows it is the artist, even when only a space stands there:
 *
 *     "EG AFTER.188 Matt Hauser"        (channel "EG")
 *     -> 2026-08-05 - Matt Hauser - EG AFTER.188
 *     "HATE Podcast 496 Fadi Mohem"     (channel "HATE")
 *     -> 2026-04-03 - Fadi Mohem - HATE Podcast 496
 *
 * The other way round is the same rule: with nothing behind the number, the entity ends the
 * title and the artist is in front of it ("Planet Melis - Techno Germany Podcast 226").
 *
 * This is also what tells a series name from an artist name without knowing either: a word
 * carrying a number belongs to the entity. "AFTER" is only recognisable as part of the show
 * because ".188" hangs on it - on its own it would read as the start of the artist name.
 *
 * A word may only join the entity this way together with its number. Anything else needs the
 * curated lists (mdbTitleUsernameConversions, mdbTitleShowSuffixWords), because a bare word next to the
 * channel name is far more often the artist.
 */


/*
 * Which spelling of the channel name to use
 *
 * The channel name is normally the better source: it is the brand's own account name, which
 * is why "Trommel.251" on the channel "trommel" comes out as "trommel.251" and not
 * "Trommel.251". Lowercase branding is a real style and is kept.
 *
 * The one exception is a channel name in ALL CAPS. Caps are a typing habit, exactly as in a
 * shouted title, so they say nothing about how the name is spelled - if the title spells it
 * differently, the title wins:
 *
 *     channel "DIRTYBIRD" + "Dirtybird Radio 540 - Mitch Dodge"
 *     ->  2026-08-07 - Mitch Dodge - Dirtybird Radio 540
 *
 * A channel whose title spells it the same way is unaffected, which is why "SEVEN Mix 084"
 * and "HATE Podcast 496" keep their caps.
 *
 * The mirror of that rule is what keeps the channel's spelling out of Normal Case: a bit of the
 * title spelling the channel name EXACTLY the way the channel does is two independent sources
 * agreeing on it, so it is the real spelling and mdbTitle_toNormalCase leaves it alone:
 *
 *     "[selected] podcast 064 w/ STRAUSS."  (channel "[selected]")
 *     ->  "(selected) Podcast 064", never "(Selected) Podcast 064"
 *
 * Exact case, nothing looser. A title writing "Yoyaku" for the channel "yoyaku" confirms
 * nothing - it is one of the two spellings, not both - and there the ordinary rules decide,
 * which is what keeps "Yoyaku Instore Sessions" out of this.
 */


/*
 * mdbTitleShowSuffixWords
 *
 * Words that turn a bare channel name into the show name MixesDB uses, when the player
 * title spells it out. The channel name alone is not the entity if the title says otherwise:
 *
 *     channel "HATE"  + "HATE Podcast 496 - Fadi Mohem"  ->  entity "HATE Podcast", no. 496
 *     channel "SEVEN" + "SEVEN Mix 084 - Theo Scuera"    ->  entity "SEVEN Mix", no. 084
 *
 * "SEVEN Mix" is what the second one is about: the word in front of the number belongs to the
 * entity, it is never split off into a group of its own ("SEVEN - Mix 084 - Theo Scuera"),
 * and what is left over after it is the artist.
 *
 * Only used for channels WITHOUT an entry in mdbTitleUsernameConversions - a mapped name is the
 * curated one and must not be extended behind the editor's back.
 */
var mdbTitleShowSuffixWords = [
    "podcast", "radio", "radioshow", "show", "mixshow", "mix", "mixtape", "mixseries",
    "series", "sessions", "session", "cast", "fm"
];


/*
 * mdbTitleCounterWords
 *
 * Words that only COUNT an episode and are no part of the show's name, so they drop out of the
 * entity once the number is taken off the title:
 *
 *     "Joe T Vannelli - Slave To The Rhythm Episode 72"
 *     ->  2026-08-05 - Joe T Vannelli - Slave To The Rhythm 72
 *         and NOT "... - Slave To The Rhythm Episode 72"
 *
 * The words deliberately NOT listed are the ones a series takes into its own name, which is why
 * "Truancy Volume 300: Sunju Hargun" keeps its "Volume" and comes out as "Truancy Volume 300",
 * and "Festival Mix 12 - Some DJ" keeps its "Mix". Nothing in a title tells the two apart - it
 * is how the series is written on MixesDB, so this is a curated list and can only be one.
 */
var mdbTitleCounterWords = [
    "episode", "ep", "no", "nr", "nos", "part", "pt", "chapter", "folge"
];


/*
 * A numbered series is the ENTITY, never the artist
 *
 * A series numbers its episodes and a person does not number themselves, so a title that is
 * nothing but a name with a number on it names no artist at all:
 *
 *     "Mixing-Diaries 041"          on the channel "LX-F"    ->  2026-08-08 - LX-F - Mixing-Diaries 041
 *     "From Paris With Hope Vol.14" on the channel "ZÆINO"   ->  2026-08-02 - ZÆINO - From Paris ...
 *
 * The channel is then the one who played it. Read off the order alone this comes out backwards,
 * with the series as the artist and the person as the show ("Mixing-Diaries 041 - LX-F").
 *
 * Two things have to hold before the channel is promoted like that, because it overrides the
 * usual reading of a title completely:
 *
 * - the channel name is NOT in the title. If it were, 4b/5b already know what it is.
 * - the channel does not look like a series ITSELF - no number, no word from mdbTitleShowSuffixWords.
 *   A channel called "Some Podcast" is the show whatever the title looks like, and promoting it
 *   to artist would only swap one wrong reading for another.
 */

/*
 * What MixesDB is asked about every title
 *
 * The shape of a player title runs out of answers quickly, and the wiki has the rest. One
 * API request per track asks whether the channel name and each bit of the title exist as a
 * Category, and what they are:
 *
 *     Category:Daniel Bortz  -> Category:Artist
 *     Category:Ritter Butzke -> Category:Venue
 *     Category:Brisboys      -> missing
 *
 * Two things follow from that, and neither can be read off a title alone:
 *
 * - The CHANNEL is a known artist and the title never names them: then the person is the
 *   artist and the whole title is what they called it.
 *       "Vintage Vinyl Session 004" on the channel "Daniel Bortz"
 *       ->  2026-08-09 - Daniel Bortz - Vintage Vinyl Session 004
 *   By shape alone this comes out backwards, with the series as the artist.
 *
 * - A BIT of the title is a known venue: then this was played there rather than made for a
 *   feed, so it is an "@", and the bit behind the venue is the city.
 *       "Tonino & Lanka | Ritter Butzke | Berlin" on the channel "Tonino"
 *       ->  2026-07-20 - Tonino & Lanka @ Ritter Butzke, Berlin
 *
 * The lookup is asynchronous, so the suggestion is built twice: once off the title alone, so
 * something is on screen at once, and again when the answer arrives. Anything typed into the
 * input by then is left alone. A failed request costs nothing but the wiki's help.
 */


/*
 * Live recordings at an event
 *
 * A festival title is not built like a podcast title. It lists things, bit by bit, and most of
 * them are not part of a MixesDB title at all:
 *
 *     "Leon Row x Shimon | Landjuweel Festival 2026 | Part 2 | Bon Bon Vivant Stage"
 *     ->  2026 - Leon Row & Shimon @ Landjuweel Festival
 *
 * - the bit naming an event (mdbTitleEventWords) is the VENUE, so it joins the artist with "@" and
 *   there is no third group - the same shape as "Adriana Lopez @ Monnom Black"
 * - the first bit that is not the event names the artists
 * - the YEAR is taken off the event name and used as the date (see below)
 * - "Part 2", stage names and the like are dropped (mdbTitleDroppedBitPatterns) - they say where in
 *   a recording or where on a site something was played, which a mix page title does not
 *
 * The DATE of a festival gig is the one thing the upload date cannot give: a set played at a
 * festival is uploaded whenever the recording is ready, days or months later. So when the
 * title names no day, only the YEAR it does name is claimed - "2026", not "2026-08-07".
 * A precise date written in the title still wins, and the event's year is then only used to
 * check it: the two disagreeing means one of them was misread.
 */
var mdbTitleEventWords = [
    "festival", "fest", "open air", "openair", "weekender"
];


/*
 * mdbTitleDroppedBitPatterns
 *
 * Chunks that never make it into a MixesDB title. Matched against a WHOLE chunk, so they
 * cannot eat part of a name, and applied to every title rather than only to one read as an
 * event: what they name - which part of a recording, which stage, which side event - is none
 * of a mix page title's business wherever it turns up. Bracketed chunks included, since those
 * are chunks like any other by then:
 *
 *     "Anja Schneider - Live at Docklands (Smirnoff Sound Collective Camp)"
 *     ->  the camp goes, "2016-07-14 - Anja Schneider @ Docklands" stays
 *
 * A camp is a festival's own side programme, named after its sponsor as often as not, so it
 * belongs with the stages rather than with the venue the set was played at.
 *
 * Never applied to the LAST chunk standing: a title made of nothing but these would come out
 * empty, and something wrong beats nothing.
 */
var mdbTitleDroppedBitPatterns = [
    /^part\s*\.?\s*\d+$/i,
    /^pt\s*\.?\s*\d+$/i,
    /^day\s*\d+$/i,
    /\bstage$/i,
    /\bfloor$/i,
    /\bcamp$/i
];


/*
 * mdbTitleNormalCaseKeepUpper / mdbTitleNormalCaseKeepLower
 *
 * MixesDB writes titles in Normal Case, so a bit read out of the title that is SHOUTED in
 * caps (or typed all in lowercase) is re-cased:
 *     "NINA ØDB - NO SIGNAL"  ->  "2026-06-14 - Nina ØDB - No Signal (Promo Mix)"
 * (the artist there is spelled by the channel name, only "NO SIGNAL" came from the title).
 *
 * Only bits that are cased UNIFORMLY are touched. Anything mixing upper and lower case is a
 * deliberate spelling and stays verbatim: "Nina ØDB", "UηκηΘωN", "Hit the Breaks", and so is
 * "SEVEN Mix 084". Two kinds of word are left alone even inside a bit that is re-cased:
 * - words containing digits, which are IDs and not words: "XLR8R700", "808"
 * - words without a vowel, which cannot be words either, so they are abbreviations and keep
 *   their caps: "DSS 139" stays "DSS 139", never "Dss 139". That is what covers the acronyms
 *   not worth listing below one by one.
 *
 * The catch, and why re-casing costs confidence: an artist really spelled in caps ("DJ MARIA.")
 * reads exactly like a shouted one, so it gets re-cased as well. Nothing in a player title
 * tells the two apart - the suggestion is editable for that reason.
 *
 * mdbTitleNormalCaseKeepUpper: words that stay in caps, i.e. acronyms rather than words.
 * mdbTitleNormalCaseKeepLower: small words that stay lowercase inside a title, but not as its first
 *   word. EMPTY on purpose: MixesDB capitalises every word, so "MOLTO IN THE MIX" becomes
 *   "Molto In The Mix" and not "Molto in the Mix". The mechanism is kept because it is one
 *   list entry away if a word ever does need to stay down.
 */
var mdbTitleNormalCaseKeepUpper = [
    "DJ", "MC", "NTS", "RA", "BBC", "FM", "AM", "EP", "LP", "VA", "UK", "USA", "EU", "NYC", "ADE"
];

var mdbTitleNormalCaseKeepLower = [];
