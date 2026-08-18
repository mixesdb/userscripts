log( "/shared/page_creator/title_definitions.js loaded" );


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
 * The underscore IS a space
 *
 * MediaWiki reads "_" and " " in a page title as the same character - "Some_Mix" and
 * "Some Mix" are one page - so an underscore in a title is a space already, and writing it as
 * one loses nothing. Uploaders type them where a FILE NAME would carry them:
 *
 *     "LONE SAXON_AUGUST 26_MIX"  (channel "Lone Saxon / Nick J. Smith")
 *     WRONG: 2026-08-07 - Lone Saxon_august 26_MIX - Lone Saxon Nick J. Smith
 *     RIGHT: 2026-08-07 - Lone Saxon - August 26 Mix
 *
 * Done before ANY rule reads a word of the title, because "_" is a word character to a regex:
 * every "\b" in the parser reads "SAXON_AUGUST" as one word, so the channel name in front of
 * it is never found, no word list ever matches, and the whole title ends up in the artist.
 * The channel name is spaced the same way and for the same reason - it is compared against the
 * title, and it ends up in the title itself.
 *
 * A SPACE, not a separator. An underscore stands where a space was typed out of the way, not
 * where a "-" or a "|" would be: reading it as a separator breaks the title above into three
 * groups and the mix's own name is lost to the flattening.
 */
var mdbTitleSpaceChars = /_+/g;


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
 * The date of a live recording
 *
 * The upload date is a fair guess for what makes up most uploads: a podcast episode goes up on
 * its release day. It is never the gig date of a set that was PLAYED SOMEWHERE. Such a
 * recording goes online whenever it is ready - the weekend after, months later, sometimes years
 * later - so a title that comes out as a live recording and carries no date of its own only
 * claims the YEAR of the upload date:
 *
 *     "DJ Set @ What Happens Label Night 2026"  (channel "Alex Esser", uploaded 2026-06-28)
 *     ->  2026 - Alex Esser @ What Happens Label Night 2026
 *
 * The year there comes from the UPLOAD DATE, not from the "2026" the event writes into its own
 * name - that one stays where it stands, as part of the name.
 *
 * A year behind the place LIST is the other case. "@ Event, Venue" and "@ Venue, City" name
 * places, and a place is not named after a year - so a year trailing the list is the gig
 * year: it beats the upload year (the title is the only source that dates the gig) and it
 * leaves the title, since the date group carries it from then on:
 *
 *     "Kernel Existence - live@3000Grad Festival @Utopia 2021"  (uploaded 2021-08-10)
 *     ->  2021 - Kernel Existence @ 3000Grad Festival, Utopia
 *
 * The "," is what tells the two apart: a year glued to the ONE place name a title carries
 * ("... Label Night 2026") may be the edition's own name and stays, a year behind the comma
 * of the place list dates the recording (mdbTitle_takeRecordingYear in title_builder.js).
 *
 * The "@" is what says it, whichever rule put it there: the words of mdbTitleLiveAtWords, the
 * mdbTitleVenueConnectors, an event name (mdbTitleEventWords), a venue MixesDB knows, or an "@"
 * the uploader typed. All of them mean the same thing, so they get the same date.
 *
 * A MONTH refines that year, and only there:
 *
 *     "Live@Elsewhere Loft July"  (channel "alexander:louis", uploaded 2026-07-27)
 *     ->  2026-07 - alexander:louis @ Elsewhere Loft
 *
 * A month NAME ending a live recording's title is when it was played, and it leaves the place
 * name as it goes - "Elsewhere Loft", not "Elsewhere Loft July". Nothing looser may read a bare
 * month: outside a live recording's place name it is part of a name far more often than it is a
 * date ("Mar Monzon", "May Day"), which is why mdbTitle_findDate has no pattern for one.
 *
 * A date written in the title still wins over all of this, exactly as above - it is the only
 * source that names the mix's own day:
 *
 *     "Adriana Lopez at RAW x Monnom Black | Mar 2026"  ->  2026-03
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
 * - The VALUE is the show as MixesDB writes it, and it is used twice: as the entity spelled
 *   out in the title and - with the episode number stripped - as the category the page is
 *   filed under. The title never overrides a mapped value; see the next note.
 *
 * A name written without its spaces:
 * Uploaders glue a name into one word as readily as they space it out - "FrenzyPodcast #233"
 * for the show "Frenzy Podcast". A name is therefore matched with its INNER spaces optional
 * (mdbTitle_escapeReLooseSpaces), so the curated name is still found in the title and taken
 * out of it, and the suggestion carries the curated spelling, never the glued one. Without
 * this the mapped name is simply "not in the title", and the rule that reads a show off the
 * title ("<Show> #NNN - <Artist>") wins with the uploader's spelling - that is exactly the
 * reported "FrenzyPodcast 233". Only the spacing is loose: the whole name still has to stand
 * there, word boundaries around it and all, and it holds for a raw channel name the same way
 * it holds for a mapped one.
 */
var mdbTitleUsernameConversions = {
    "Frenzy": "Frenzy Podcast", // Not FrenzyPodcast
    "NTS Latest": "NTS Radio",
    "Resident Advisor": "RA Podcast"
};


/*
 * mdbTitleChannelSeriesConversions
 *
 * mdbTitleUsernameConversions' sibling for the show whose title only names it HALF: the word
 * in the title is generic ("DJ Mix") and the channel is what says whose it is. Keys are
 * channel names as the site's API gives them, exactly like mdbTitleUsernameConversions; the
 * value maps the words the title carries to the show MixesDB files the mix under:
 *
 *     "Dance TV": { "DJ Mix": "Dance TV DJ Mix" }
 *     ->  "DJ MIX #679 - Miss Luna" on the channel "Dance TV"
 *         becomes  2026-08-04 - Miss Luna - Dance TV DJ Mix 679
 *
 * Read as: on this channel, a title carrying "DJ Mix" is an episode of "Dance TV DJ Mix".
 * The words grow into the curated name INSIDE the title, so every rule that follows finds the
 * full name standing where the half one stood, and the channel counts as mapped to it - the
 * entity in the title and the entity category (number stripped) both come out curated.
 *
 * Why mdbTitleUsernameConversions cannot carry this: mapping "Dance TV" -> "Dance TV DJ Mix"
 * outright would stamp the show onto EVERY upload of the channel, festival sets and specials
 * included. Here the title has to say the word first - an upload without it falls through to
 * the ordinary rules untouched.
 *
 * Notes:
 * - the channel lookup is case-insensitive, so a casing slip in a key still works
 * - the words are matched in any case and with their inner spaces optional ("DJ MIX",
 *   "DJMix"), always as whole words - the same looseness a mapped channel name gets
 * - a title already carrying the FULL curated name is recognised before the bare words, so
 *   "Dance TV DJ Mix #680" does not grow a second "Dance TV" in front of itself
 * - several word entries per channel are fine; the first one found in the title wins
 */
var mdbTitleChannelSeriesConversions = {
    "Dance TV": { "DJ Mix": "Dance TV DJ Mix" }
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
 *
 * WHAT MUST NOT GO ON THE LIST, because being on it means "delete this name":
 *
 * - a CLUB or a PARTY brand, even when it also runs a label - fabric, Afterlife, Circoloco,
 *   Music On, Paradise, Verknipt, Renaissance, Dekmantel. "Some DJ (fabric)" says where the set
 *   was recorded, and MixesDB carries that as "Some DJ @ fabric". Those names belong on a venue
 *   list, where the answer is an "@" - the opposite of dropping them.
 * - a name that reads as an ARTIST first - Truncate, Soul Clap, Bedouin all release on the
 *   label they are named after, and the person is who a title behind a bracket usually means.
 * - an ordinary phrase - "Warm Up", "Elements", "Time Is Now". "(Warm Up)" behind a name is a
 *   warm-up set in nearly every title it turns up in, whoever else uses the words as a label.
 *
 * The list is compared with mdbTitle_normalizeCompare(), which folds to a-z0-9 - so case,
 * punctuation and spacing in an entry cost nothing ("R&S" matches "R & S"), and a name written
 * in a non-latin alphabet cannot be matched at all and does not belong here yet.
 *
 * Two Schallplatten entries are redundant against mdbTitleLabelWords above and are kept anyway:
 * this list is a register of labels, and a reader checking whether one is known should not have
 * to know the regex to answer it.
 */
var mdbTitleLabelWords = /\b(?:labels?|records?|recordings?|recs?|imprint|schallplatten)\b\.?/i;

/*
 * mdbTitleLabelSeparators
 *
 * How a bracket separates the several labels it credits. Uploaders reach for whatever is on the
 * keyboard, and all of these mean the same thing:
 *
 *     "(SONARA / Crosstown Rebels)"   "(SONARA, Crosstown Rebels)"   "(SONARA + Terminal M)"
 *     "(SONARA & Crosstown Rebels)"   "(SONARA; Crosstown Rebels)"   "(SONARA x Terminal M)"
 *
 * Punctuation splits with or without whitespace around it, so "SONARA/Crosstown Rebels" comes
 * apart too. The four that a NAME also contains - "-", "+", "&" and the word joiners - need
 * whitespace on both sides, which is what keeps "Mote-Evolver" and "R&S" in one piece.
 *
 * That still leaves the label whose name holds a separator with spaces and all ("Lost & Found",
 * "aufnahme + wiedergabe"), which is why mdbTitle_dropLabelBrackets tests the WHOLE bracket as
 * one name BEFORE it splits anything: only what is not a label as a whole is read as a list.
 *
 * What that does not reach is such a name standing in a list of several - "(Lost & Found /
 * Drumcode)" splits into three halves and the bracket stays. It errs the safe way (a bracket
 * kept, not a name deleted) and is rare enough to leave: taking it on means trying every way of
 * re-joining the parts, which is a lot of machinery for a bracket nobody has reported yet.
 */
var mdbTitleLabelSeparators = /\s*[,;\/|•·]+\s*|\s+[-–—+&]\s+|\s+(?:x|and|und|by)\s+/i;

var mdbTitleKnownLabels = [
    "2DIY4",
    "A State of Trance",
    "A-TON",
    "Abora",
    "AD 93",
    "All Day I Dream",
    "Amsterdam Trance",
    "Anjunabeats",
    "Anjunadeep",
    "Apollo",
    "Armada Music",
    "Armind",
    "ARTS",
    "aufnahme + wiedergabe",
    "Aus Music",
    "AVA",
    "Avian",
    "Axis",
    "Balance Music",
    "Banoffee Pies",
    "Bar 25 Music",
    "Bedrock",
    "Black Hole",
    "Blueprint",
    "Bonzai Progressive",
    "Bordello A Parigi",
    "BOYSNOIZE",
    "BPitch",
    "Bunker",
    "Butter Sessions",
    "Cajual",
    "Central Processing Unit",
    "Chapter 24",
    "Classic Music Company",
    "Clone",
    "CLR",
    "Cocktail d'Amore Music",
    "Cocoon",
    "Coldharbour",
    "Colorize",
    "Correspondant",
    "Craigie Knowes",
    "Crème Organization",
    "Crosstown Rebels",
    "Cuttin' Headz",
    "D.KO",
    "Dark Entries",
    "Deeply Rooted",
    "Defected",
    "Delsin",
    "Delusions of Grandeur",
    "Desolat",
    "DFTD",
    "Dial",
    "Dirtybird",
    "Disco Halal",
    "Disco Inferno",
    "Diynamic",
    "Drumcode",
    "Dystopian",
    "Eastenderz",
    "Elrow Music",
    "Enhanced Music",
    "Etruria Beat",
    "Falling Ethics",
    "Figure",
    "Filth on Acid",
    "Flashover",
    "Freerange",
    "Fuse London",
    "Future Sound of Egypt",
    "Get Physical Music",
    "Glitterbox",
    "Global Underground",
    "Grotesque Music",
    "Hardgroove",
    "HAYES",
    "Heist",
    "HEKATE",
    "Herrensau",
    "Hessle Audio",
    "Hive Audio",
    "Hot Creations",
    "Hottrax",
    "Houndstooth",
    "Hypercolour",
    "Iboga",
    "Ilian Tape",
    "In Trance We Trust",
    "Infuse",
    "Innervisions",
    "Interplay",
    "Intrepid Skin",
    "Kalahari Oyster Cult",
    "Kann",
    "Kanzleramt",
    "Katermukke",
    "Keinemusik",
    "Killekill",
    "Kindisch",
    "King Street Sounds",
    "Klasse Wrecks",
    "Klockworks",
    "Kneaded Pains",
    "Knee Deep In Sound",
    "Kompakt",
    "Kontra-Musik",
    "Last Night on Earth",
    "LENSKE",
    "Life and Death",
    "Live at Robert Johnson",
    "Livity Sound",
    "Lobster Theremin",
    "Local Talk",
    "Lost & Found",
    "MadTech",
    "Magik Muzik",
    "Malka Tuti",
    "MDR",
    "Metroplex",
    "microCastle",
    "Mobilee",
    "Modularz",
    "Monkeytown",
    "Monstercat Silk",
    "Moon Harbour",
    "Mord",
    "Mote-Evolver",
    "Moxy Muzik",
    "Multi Culti",
    "Mutual Rytm",
    "Nachtstrom Schallplatten",
    "Naked Lunch",
    "Nano",
    "Nervous",
    "NINETOZERO",
    "Nite Grooves",
    "Nocturnal Knights Music",
    "Northern Electronics",
    "Nous'klaer Audio",
    "Numbers",
    "Objektivity",
    "Octopus",
    "Odd One Out",
    "Optimo Music",
    "Ostgut Ton",
    "Ovum",
    "Peach Discs",
    "Perc Trax",
    "Perfecto",
    "Perlon",
    "Permanent Vacation",
    "Phantasy Sound",
    "Pinkman",
    "PIV",
    "Planet E",
    "Planet Rhythm",
    "Plus 8",
    "Poker Flat",
    "PoleGroup",
    "Pure Trance",
    "Purified",
    "R&S",
    "Razor-N-Tape",
    "Reaching Altitude",
    "Rekids",
    "Relief",
    "Repopulate Mars",
    "Rhythm Section International",
    "Rose Avenue",
    "Roush",
    "Rumors",
    "Running Back",
    "Rush Hour",
    "Salin",
    "Saved",
    "Second State",
    "Semantica",
    "Senso Sounds",
    "Shall Not Fade",
    "Shipwrec",
    "Siamese",
    "Skylax",
    "Smallville",
    "Snatch!",
    "Sneaker Social Club",
    "Sola",
    "Solid Grooves",
    "Soma",
    "SONARA",
    "Sonic Groove",
    "Sound Signature",
    "Sous Music",
    "Steel City Dance Discs",
    "Steyoyoke",
    "Stil vor Talent",
    "Strictly Rhythm",
    "Stroboscopic Artefacts",
    "Studio Barnhus",
    "Suanda Music",
    "Suara",
    "Subculture",
    "Sudbeat",
    "Sweat It Out",
    "Symbolism",
    "Systematic",
    "Talman",
    "Terminal M",
    "The Soundgarden",
    "This Never Happened",
    "Tidy",
    "Timedance",
    "Token",
    "Toolroom",
    "Toy Tonics",
    "Trapez",
    "Traum Schallplatten",
    "Tresor",
    "Truesoul",
    "Turbo",
    "UFO Inc.",
    "Uncanny Valley",
    "Underground Resistance",
    "Up The Stuss",
    "VANDIT",
    "VIVa MUSiC",
    "Voitax",
    "Watergate",
    "Who's Afraid of 138?!",
    "Whose These",
    "Wolf Music",
    "WSNWG",
    "Yoruba"
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
 * carry no such risk, so prefer them when extending the list. "w." sits in between: it can
 * collide with an initial inside a name ("Andrew W. K."), which is rare enough on a mix
 * title to take.
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
    "w.",
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
 * The ABBREVIATION is the other word. "pres." says an artist is playing as a project of theirs,
 * and MixesDB writes that project out in the title as the one act it is:
 *
 *     "2024-05-16 - Deetron Pres. Soulmate - fabric Podcast 037"
 *     "2017-10-25 - Tiefschwarz - Tiefschwarz pres. A Souvenir from…, Ibiza Global Radio"
 *
 * so "pres." is normalised (a bare "pres" gets its dot) and then left exactly where it stands.
 * The two names behind it are still filed as two artists - that page carries both
 * [[Category:Deetron]] and [[Category:Soulmate (Sam Geiser)]] - which is mdbTitleArtistSplitJoiners'
 * job, not this list's. Spelling the joiner out and abbreviating it are therefore NOT the same
 * word here, and that is the only signal there is: an uploader who typed the whole word is
 * introducing somebody, one who typed "pres." is naming a project.
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
    "pres.": [ "pres.", "pres" ],
    ",":     [ "presents", "present" ]
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
 * "pres." is here and NOT in mdbTitleArtistJoinerSpellings, which is the whole point of the two
 * lists being separate: the title keeps the phrase whole ("Deetron pres. Soulmate" - the project
 * is what played), and the categories still get both names. That is what the wiki does with it:
 * "2024-05-16 - Deetron Pres. Soulmate - fabric Podcast 037" is filed under [[Category:Deetron]]
 * AND [[Category:Soulmate (Sam Geiser)]].
 *
 * Longest entry first, so "b2b2b" is not read as "b2b" with a stray "2b" behind it.
 */
var mdbTitleArtistSplitJoiners = [
    "b2b2b", "b3b", "b2b",
    "versus", "vs.", "vs",
    "featuring", "feat.", "feat", "ft.", "ft",
    "pres.", "pres",
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
 * title - and around the "@" the blanks are optional, because punctuation is its own boundary:
 *
 *     "Live@Elsewhere Loft July"  (channel "alexander:louis")
 *     ->  2026-07 - alexander:louis @ Elsewhere Loft
 *
 * "DJ set" and "DJ mix" say the same thing as "Live" and are on the list for the same reason.
 * What they do NOT say is who played: nothing in "DJ Set @ <place>" is a name, so the words go
 * and the CHANNEL is the artist, exactly as with a title opening on "Live at".
 *
 *     "DJ Set @ What Happens Label Night 2026"  (channel "Alex Esser")
 *     WRONG: 2026-06-28 - DJ Set @ What Happens Label Night 2026
 *     RIGHT: 2026 - Alex Esser @ What Happens Label Night 2026
 *
 * The blank INSIDE a two-word entry is optional as well, and a "-", "." or "_" may stand in its
 * place: "DJmix@Docks", "DJ-Set at Docks" and "Liveset at Docks" are the same words typed the
 * way uploaders type them, and the marker has to go in all of them - it must never survive into
 * the name in front of the "@" ("Anja Schneider - DJmix @ Docks").
 *
 * A SEPARATOR may stand between the marker and the connector behind it, because a marker the
 * uploader put in brackets is a chunk of its own by the time this runs - the brackets became
 * "|" (see mdbTitle_bracketsToSeparators), and the place is then in the next chunk:
 *
 *     "Deetron pres. Soulmate [2hr Live Mix] at The Yard"  (channel "Meat Free")
 *     read as   "Deetron pres. Soulmate | 2hr Live Mix | at The Yard"
 *     ->  2026-07-25 - Deetron pres. Soulmate @ The Yard
 *
 * Longest entry first: they are tried in order and "live" would otherwise swallow the start of
 * "live set".
 *
 * A marker with NO place behind it is dropped, not kept
 *
 * The words say WHERE only when a place follows them. Standing at the end of a title they say
 * how the set was played, and MixesDB writes that nowhere - there is no group for it:
 *
 *     "Dualism Series #031 - alemiko *live"  (channel "Dualism.Berlin")
 *     WRONG: 2026-08-12 - Alemiko *Live - Dualism Series 031   (and the artist category with it)
 *     RIGHT: 2026-08-12 - Alemiko - Dualism Series 031
 *
 * "live" alone does not even settle what it looks like it settles - it may have been a live PA
 * or a DJ set - and with no venue or event named there is nothing to put behind an "@" either
 * way. So the word goes and the confidence says so: if the set really was played somewhere, the
 * venue has to be typed in by hand.
 *
 * The marker has to be SET OFF from the name for this - by a separator, by a bracket (which is a
 * "|" by the time the joiners run) or by an asterisk, which is how an uploader writes an aside.
 * A name whose last word merely happens to be one of these words keeps it: nothing in "Boiler
 * Room Live" says the word is an annotation rather than part of the name.
 */
var mdbTitleLiveAtWords = [
    "recorded live",
    "live set",
    "live mix",
    "dj set",
    "dj mix",
    "live"
];


/*
 * Only one " @ " per title
 *
 * A MixesDB title writes the joiner ONCE: everything behind it is one place group, joined
 * with "," - "@ Event, Venue", "@ Venue, City", "@ WE, Dolton Expo Center, Chicago". A player
 * title saying "@" twice names the place in two steps - the festival and where it was held -
 * so every "@" after the first becomes the "," of that group (mdbTitle_joinPlaceGroups in
 * title_builder.js):
 *
 *     "Kernel Existence - live@3000Grad Festival @Utopia 2021"  (channel "kernel existence")
 *     WRONG: 2021 - Kernel Existence @ 3000Grad Festival @ Utopia 2021
 *     RIGHT: 2021 - Kernel Existence @ 3000Grad Festival, Utopia
 *
 * A spelling rule, not a guess - both "@" were the uploader's own, only the second is written
 * the way MixesDB writes it - so it costs no confidence. The categories read the same rule
 * from the other end: the ENTITY of a live title is the FIRST place alone ("3000Grad
 * Festival"), never the joined list - the venue behind the comma is not what the page is
 * filed under (mdbTitle_titleCategories).
 *
 * The order is the answer because MixesDB writes the group from the outside in, the bigger
 * name first. An uploader who turned it around says so with an EVENT WORD, and then that part
 * is the entity wherever it stands: "Dave Huismans at Dark Skies, Horst Festival" is a stage
 * and the festival it stands on, and the page belongs under "Horst Festival", not under "Dark
 * Skies" (mdbTitle_placeGroupEntity). Only an event word overrules the order - a city or a
 * venue behind the comma says nothing about which of the two is the bigger name.
 *
 * Enforced TWICE, and the second one is the one that holds: once on the whole title before
 * the venue rules read it (3c2), and once at the single exit (mdbTitle_result) - the event
 * and venue branches compose "<artist bit> @ <place>" after 3c2, and an artist bit that
 * already carried an "@" would put a second one into the title ("Kernel Existence @ Utopia |
 * Ritter Butzke | Berlin" composes "... @ Utopia @ Ritter Butzke, Berlin", which has to come
 * out as "@ Utopia, Ritter Butzke, Berlin" - also exactly how MixesDB writes a party at a
 * venue in a city).
 *
 * The chunk split says the same thing in units: every " @ " separates, so the title above is
 * the chunks "Kernel Existence | 3000Grad Festival | Utopia" - each asked about on its own,
 * never a glued "3000Grad Festival @ Utopia". (The year is gone from the last one because
 * the date group claimed it - see "The date of a live recording" above.)
 *
 * And so does the comma standing in FRONT of an event name: "Dark Skies, Horst Festival" is
 * two names to the wiki and asks as two chunks (mdbTitle_splitEventComma). The comma joins
 * everywhere else and has to keep doing so - an artist list ("ANA, Johnny D, DJ Koze") is one
 * group of names, and a place group written the usual way round carries the event in FRONT of
 * its comma, so nothing behind it ends in an event word and the group stays one chunk. The
 * TITLE is untouched by this: the parse keeps writing the place group as the uploader's list.
 */


/*
 * "Live PA"
 *
 * The words of mdbTitleLiveAtWords say only that a set was played somewhere, and go with the
 * joiner. "Live PA" says MORE - the act performed its own tracks live, not a DJ set - and
 * that MixesDB DOES write, as "(Live PA)" behind the artist's name:
 *
 *     "Kernel Existence - Live PA @ 3000Grad Festival"
 *     ->  2021 - Kernel Existence (Live PA) @ 3000Grad Festival
 *
 * A bare "live" is never this marker: "live@3000Grad Festival" says where, not how, and the
 * word goes exactly like "Live at". Only the phrase itself counts - "Live PA", "Live P.A.",
 * "LivePA", bracketed or bare, in any case (mdbTitle_takeLivePa in title_builder.js) - and it
 * is written behind the ONE artist name. With several artists nothing is written and the
 * confidence says so: only the uploader knows whose set it was.
 *
 * The DESCRIPTION may say the phrase where the title does not, and it counts there too - but
 * only on a title that reads as a live recording (an "@"), and it costs confidence: a
 * description's "Live PA" can describe another act on the bill, so the reader is told to
 * check. On anything else - a podcast episode, a promo mix - the description's word alone
 * marks nothing.
 *
 * The artist CATEGORY stays the bare name either way: "Kernel Existence (Live PA)" is filed
 * under Kernel Existence (mdbTitle_splitArtists).
 */


/*
 * mdbTitleRecordingNoteFillers
 *
 * What may stand next to a marker word inside a chunk without that chunk stopping to be the
 * marker. An uploader writes the marker into a bracket together with a note about the recording
 * - how long it is, that it is the whole thing - and the bracket is a chunk of its own by the
 * time the joiner rules read it:
 *
 *     "Deetron pres. Soulmate [2hr Live Mix] at The Yard"
 *     ->  the chunk "2hr Live Mix" IS the "Live Mix" marker, and the "@" is put in front of
 *         "The Yard" as if the title had read "… Soulmate - Live Mix at The Yard"
 *
 * mdbTitle_reduceRecordingNotes() cuts the marker and these fillers out of a chunk and only
 * calls it a marker when NOTHING is left over. That is what keeps a name that merely contains
 * a marker word out of it: "Live Sessions 12" leaves "Sessions 12" standing and is a show, not
 * a note about the recording - and dropping it would lose the show.
 *
 * So keep this list to words that can only ever be a note. A bare number is deliberately not
 * one: it is an episode far more often than a duration ("Live Set 12"), and it only counts here
 * with a time unit behind it.
 */
var mdbTitleRecordingNoteFillers = [
    /\b\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes|std|stunden)\b/gi,
    /\b(?:full|complete|whole|recording)\b/gi
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
 * Read in three places: mdbTitle_cleanArtist drops it off the front of what is left over
 * ("... podcast by Neryn" leaves " by Neryn"), rule 5b of buildMixesdbTitle takes it as the
 * separator between an episode number and the artist behind it, and rule 5c takes it as the
 * SEPARATOR ITSELF where the uploader typed none:
 *
 *     "Guestroom 779 by Sascha Sibler"  (channel "PRIVATEPLACES Mixtapes")
 *     WRONG: 2022-06-15 - Guestroom 779 by Sascha Sibler - PRIVATEPLACES Mixtapes
 *     ->     2022-06-15 - Sascha Sibler - Guestroom 779
 *
 * Nothing marks the number there - no keyword in front of it, no "#", and the channel name is
 * nowhere in the title - so 5b never sees an episode and the whole title would go into the
 * artist slot with the channel behind it. The "by" is the only separator the uploader wrote,
 * and it also says which side is which: what stands in FRONT of it was made, who stands behind
 * it made it. That direction is the point of the rule - reading the two by their shape alone
 * puts "Somewhere 779 by Radio Kid" the wrong way round, because the NAME carries the series
 * word there.
 *
 * The front has to look like a series for this - a number or a series word
 * (mdbTitleShowSuffixWords). With no separator in the title, nothing else is left to tell the
 * preposition from the ordinary English word: "Side by Side" and "Live by the Sea" are names,
 * and splitting one of those invents an artist out of half a phrase.
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
 * "#" marks the episode number, never a part of the name
 *
 * A "#" in front of digits says outright what a bare number leaves open: these digits COUNT
 * an episode. No podcast writes a "#NN" into its own name, so the number is the border of the
 * rule above even when nothing else marks it - what stands in front is the series, what
 * stands behind the number is the artist, separator or not:
 *
 *     "Multisexual Mix #39 Vaahzer"   (channel "MULTISEX")
 *     ->  2026-08-14 - Vaahzer - Multisexual Mix 39
 *     "Familycast #048 - Zitrophren"  (channel "Techno ist Familiensache")
 *     ->  2026-08-06 - Zitrophren - Familycast 048
 *
 * The second one has no episode keyword at all - the "cast" is glued into the name where no
 * word list sees it - and the "#" alone is what reads it. Without a "#", a name standing
 * right behind the number still needs a separator or a "by" in front of it ("HATE Podcast
 * 496 Fadi Mohem" has the channel name to say where the entity ends): behind an unmarked
 * number a word is far more often part of the name ("Deep House Mix 2 Hours") than an
 * artist glued on.
 */


/*
 * The channel presenting a series
 *
 * "pres." behind the channel's own name introduces what the channel PRESENTS, and what
 * follows it decides which side is the artist:
 *
 *     "Lilly Palmer pres. Spannung Radio Show #069"           (channel "Lilly Palmer")
 *     ->  2026-08-14 - Lilly Palmer - Spannung Radio 069
 *     "Mat.Theo present UNCODED BIRTHDAY Radioshow (JUNE 26)" (channel "Mat.Theo")
 *     ->  2026-06-23 - Mat.Theo - Uncoded Birthday Radioshow
 *     "fabric presents Bonobo"                                (channel "fabric")
 *     ->  2026-04-03 - Bonobo - fabric
 *
 * A SERIES behind the "pres." is the channel's own show, so the channel is the artist and
 * the series the entity - the words keep the order they stand in, nothing is moved around
 * the number. A bare NAME behind it is a guest, so the channel is the presenter (the entity)
 * and the name the artist. What tells the two apart is the series saying it IS one: an
 * episode number (only a series is presented episode by episode), or a series word off
 * mdbTitleShowSuffixWords - a guest is a bare name, and nobody is called "... Radioshow".
 * Digits alone are NOT the word's equal there: "X presents Bonobo 2026" still reads as a
 * guest.
 *
 * The keyword that carried the number goes with it - "Radio Show #069" comes out as
 * "Radio 069", because the word stood there to introduce the number and the name in front of
 * it is what the show is called. A monthly-edition stamp behind the series name ("(JUNE 26)")
 * dates the edition the way the number counts one and goes the same way - the date group
 * already carries when the mix is from, and a date belongs in no category name.
 *
 * "presents"/"pres." is also a SEPARATOR to the chunk split (mdbTitle_traceChunks): the
 * presenter and what they present are never one name, so each side is a unit and a lookup
 * candidate of its own - "Mat.Theo" and "UNCODED BIRTHDAY Radioshow" are asked about
 * separately, never as one glued name.
 */


/*
 * A channel naming SEVERAL names
 *
 * An account is regularly named after the artist AND the person behind it, separated the way a
 * title separates anything:
 *
 *     "LONE SAXON_AUGUST 26_MIX"  (channel "Lone Saxon / Nick J. Smith")
 *     ->  2026-08-07 - Lone Saxon - August 26 Mix
 *
 * That is not one name and can never be used as one: a "/" with blanks around it reads as a
 * group separator wherever it stands, so the channel on its own makes the title four groups
 * and gets flattened - which is what the report above came out as ("- Lone Saxon Nick J.
 * Smith").
 *
 * So the names are taken apart and exactly ONE is used: the one the TITLE names, and the FIRST
 * one when the title names none of them - an account leads with the name it puts mixes out
 * under. Only a slash or a pipe with whitespace on BOTH sides splits, the same rule the
 * tracklist detector holds a slash to - without the blanks it sits inside names and addresses
 * all the time ("AC/DC"). An "&" or a "," never splits one: a duo is one act with one name.
 *
 * A channel in mdbTitleUsernameConversions is never split - that name is curated, and whatever
 * stands in it stands there on purpose.
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
 *
 * The same words are what carries an episode NUMBER wherever they stand, so mdbTitle_episodeWords()
 * is built out of this list and mdbTitleCounterWords rather than repeating them. Adding a word
 * here therefore also teaches the parser to read the number behind it, which is what settles
 * where the entity ends and the artist begins:
 *
 *     "Whose These Cast #02 by Mar Monzon"  (channel "Whose These Records")
 *     WRONG: 2026-07-30 - Whose These Records - Whose These Cast 02 by Mar Monzon
 *     RIGHT: 2026-07-30 - Mar Monzon - Whose These Cast 02
 *
 * "Cast" carries the number, so "Whose These Cast" is the podcast and the "by" behind the number
 * introduces the artist. The channel name says the same thing from the other side - a label
 * ("Records") is what a podcast is named after, not who played the mix - but it is not needed
 * for the reading and nothing here relies on it.
 *
 * A SEPARATOR between the word and its number changes nothing about that. The two belong
 * together however the uploader punctuated them:
 *
 *     "IA Podcast | 233: Fixeer & Ricardo Garduno"  (channel "Illegal Alien Records")
 *     WRONG: 2026-03-05 - IA Podcast 233: Fixeer & Ricardo Garduno
 *     RIGHT: 2026-03-05 - Fixeer & Ricardo Garduno - IA Podcast 233
 *
 * Read as three bits the title has a show, a number and an artist and no way of telling which
 * is which, so all three end up in the artist and the entity is lost. Reading the number as the
 * episode of the word in front of it puts the title back into its two halves.
 *
 * The one thing never taken that way is a YEAR: "Some Show | 2026" numbers no episode, and an
 * invented episode number is worse than a missing one. A year GLUED to the word still is one
 * ("Vol. 2026"), because there the uploader wrote the two as one thing.
 */
var mdbTitleShowSuffixWords = [
    "podcast", "radio", "radioshow", "show", "mixshow", "mix", "mixtape", "mixseries",
    "series", "sessions", "session", "cast", "fm",
    // a label's series carries the label's name: "MNMT Recordings" is a series, no artist
    "recordings"
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
 * mdbTitleStaticNamePatterns
 *
 * Names that are never sent to the category lookup, because they are the same on every mix
 * ever uploaded: a chunk that is nothing but a counting word - "Episode", "Episode 72",
 * "Part 2", "Part2", "Pt. 3" - names no artist, no show and no venue. It says WHICH episode
 * or which part this is, and MixesDB files nothing under it, so the wiki can only ever answer
 * empty. The 10-names-per-request limit is real, and the slot such a name takes is one a name
 * that can answer does not get.
 *
 * Patterns rather than words, like mdbTitleDroppedBitPatterns: each entry carries its own
 * number and its own spellings ("Part 2", "Part2", "Pt.2"), which a word list plus one shared
 * number rule cannot - "Pt" counts only with the "Part" it is short for, never on its own.
 *
 * Matched against the WHOLE name (mdbTitle_isStaticName in title_builder.js), anchored on both
 * ends, so a pattern can never eat part of a real one: "Part 2" is static, "Truancy Volume
 * 300", "Radio Episode Berlin" and "Party" are asked about as usual.
 *
 * Not the same list as mdbTitleCounterWords above, although the words overlap. There the word
 * is taken OFF a name that has more to it ("Slave To The Rhythm Episode 72" -> "Slave To The
 * Rhythm 72"); here the word IS the whole name, and what is left after taking it off is
 * nothing. A word only belongs here when a category of that name would be meaningless - never
 * one a series is named after ("Podcast", "Mix"), which is a real category on MixesDB hundreds
 * of times over.
 */
var mdbTitleStaticNamePatterns = [
    /^episode[\s.#:-]*\d*$/i,
    /^(?:part|pt)[\s.#:-]*\d*$/i
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
 * A series dated by month
 *
 * A recurring mix stamps its editions with the month instead of a number, and the stamp reads
 * exactly like the number of the rule above - the title is a series and names nobody, so the
 * channel is the one who played it. The stamp itself leaves the name: the date group is what
 * carries when the mix is from, and a channel written "Word Word" in title case is somebody's
 * NAME more often than not:
 *
 *     "E-L-E-C-T-R-O MIx August 2026"  (channel "Dirk Wiertz", uploaded 2026-08-14)
 *     ->  2026-08-14 - Dirk Wiertz - E-L-E-C-T-R-O MIx
 *
 * and the page belongs in Category:Promo Mix, which the "Mix" already says in the name, so
 * nothing is appended to the title.
 *
 * The month and year have to end the title TOGETHER, and a series word (mdbTitleShowSuffixWords)
 * has to be left standing in front of them - that is what keeps everything else out:
 * "Berghain July" names no series and stays whole, "Summer 2026 Mix" ends in the word and not
 * in the stamp, and "House Set August 2026 - Simeon Sarfati" names its artist, so 4b reads it
 * and the mix's name stays verbatim, month and all. It is also what keeps the stamp out of
 * "LONE SAXON AUGUST 26 MIX", where the month stands in the MIDDLE of the name: the mix is
 * called "August 26 Mix" and that is the whole name.
 *
 * The YEAR may be written with two digits, which is how an uploader dates a monthly edition
 * half the time ("August 26" for August 2026). Those same two digits are a DAY just as often
 * ("August 26" as the 26th), and nothing in the title tells the two apart - so the UPLOAD DATE
 * does: the digits are read as a year only when they land on the year the mix was uploaded in,
 * give or take one. "Some Mix August 12" uploaded in 2026 is not the 2012 edition of anything,
 * so it stays part of the name. A four-digit year says it itself and needs no such check.
 *
 * What has to be left in front of the stamp is a NAME, not just the word. Strip the series
 * words out of "Mix August 2026" and nothing remains - there is no series called "Mix", the
 * title simply has no name of its own, and the month is all the name there is. That one is
 * mdbTitleDatedMixWords' business, below.
 */


/*
 * mdbTitleDatedMixWords
 *
 * A title that is a MIX WORD and a date and nothing else: no name, no series, no episode -
 * somebody's monthly mix, uploaded under what amounts to a file name.
 *
 *     "Mix August 2026"     (channel "Christian Laurien")
 *     ->  2026-08-07 - Christian Laurien - August 2026 Mix
 *     "DJ Mix August 2026"  ->  ... - August 2026 DJ Mix
 *
 * Two things follow, and both are what MixesDB does with such a mix:
 *
 * - it is a Promo Mix, which the word in the name already says, so nothing is appended to the
 *   title and only the category is set
 * - the word goes BEHIND the month and year, whichever order the uploader typed them in.
 *   "August 2026 Mix" is how MixesDB writes it: the date is the name, the word says what kind
 *   of thing it is
 *
 * Nothing is dropped here, only moved - which is the difference to the monthly EDITION above.
 * There a name stands in front of the stamp and the stamp only dates it, so the stamp goes.
 * Here the stamp is the only name there is, so it stays and the word moves behind it.
 *
 * The whole name has to be nothing but the word and the date, which is what keeps every real
 * name out of it: "House Set August 2026" names a set, "E-L-E-C-T-R-O MIx August 2026" names
 * a series. Only the words a mix is generically called belong on this list - never one that a
 * series is named after ("Podcast", "Radio"), since an episode of those is not a promo mix.
 */
var mdbTitleDatedMixWords = [
    "dj mix",
    "mix"
];

/*
 * The episode number belongs to the name it stands NEXT TO
 *
 * When the channel name IS in the title and a number is too, which of the two is the series is
 * not a question about either name - it is a question about where the number sits:
 *
 *     "LIMB #9 – Yuka"                          on the channel "LIMB"
 *     ->  2026-08-07 - Yuka - LIMB 9              the number is in the CHANNEL's bit,
 *                                                 so the channel is the series
 *     "The Sound of Rome #147 - Ricky Montana"  on the channel "Ricky Montana"
 *     ->  2026-08-12 - Ricky Montana - The Sound of Rome 147
 *                                                 the number is in the OTHER bit, so that bit
 *                                                 is the series and the channel is the artist
 *
 * The two titles have the same shape, the same channel-name-plus-number ingredients and opposite
 * readings, and nothing but the position of the "#" tells them apart. Read off the order alone
 * the second comes out inside out, with the series as the artist and the person carrying the
 * episode number ("The Sound of Rome - Ricky Montana 147").
 *
 * The order of the two bits decides nothing - "Ricky Montana - The Sound of Rome #147" is the
 * same title. Only a title of EXACTLY two bits is read this way: with a third one there is more
 * than one way to pair a name with the number, which is a guess again.
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
 * mdbTitleCountries
 *
 * The countries a player title writes behind an artist to say where they are FROM, with the
 * acronym forms next to their long ones. What it recognises is a chunk that is a PLACE LIST -
 * names separated by "," or "/" with a country as the last one:
 *
 *     "DJ MIX #679 - Miss Luna ( Ibiza/ Dusseldorf, Germany)"  (channel "Dance TV")
 *     WRONG: 2026-08-04 - Miss Luna Ibiza/ Dusseldorf, Germany - DJ Mix 679
 *     RIGHT: 2026-08-04 - Miss Luna - Dance TV DJ Mix 679
 *
 * Where the artist is from is none of a mix page title's business, so the chunk goes
 * (mdbTitle_dropLocationChunks in title_builder.js) - but only from a title that is NOT a
 * live recording, i.e. carries no "@" once the joiners have run. On a live recording the
 * places next to the venue are the venue's city and country, which MixesDB DOES write
 * ("@ Ritter Butzke, Berlin"), so a live title keeps every place it names.
 *
 * A country standing ALONE never drops a chunk: "Georgia", "France" and "Japan" are artists
 * and mix names as readily as countries, and a lone name says too little. The reported shape
 * is the LIST ending in a country, and only that is matched - which is also what keeps
 * "Techno Germany Podcast 226" safe, where the country stands inside a name rather than
 * ending a place list.
 *
 * A BRACKET is the exception to both of those rules (mdbTitle_dropLocationBrackets in
 * title_builder.js, from the "MNMT Recordings : Adjust (BE) @ S.U.N Festival" report): a
 * bracket behind a name holding nothing but a country - alone or as a place list - is a
 * byline about that name, so it goes even when it is a lone code and even on a live title.
 * The one place it survives is BEHIND the "@", where the places are the venue's city and
 * country. A bracket OPENING a title is never one: it names what follows it.
 *
 * Behind the "@" a country is the PLACE GROUP's own country, and the opposite of dropping
 * applies (same report): it STAYS in the title - the event branch keeps it as the place's
 * second part ("@ S.U.N Festival, Hungary"), the way the venue branch keeps its city - but
 * it is never sent to the category lookup, because a country is never a category and the
 * 10-name request limit is real.
 *
 * Compared with mdbTitle_normalizeCompare(), which folds to a-z0-9 - so case and dots cost
 * nothing and "U.S.A.", "USA", "usa" are one entry. The dotted spellings are listed anyway:
 * this list is a register of what a title may write, and a reader checking whether a spelling
 * is covered should not have to know the compare function to answer it. Countries written in
 * a non-latin alphabet cannot be matched and do not belong here yet.
 *
 * Every country carries its SHORT forms next to the long one - the three-letter code, the
 * Olympic spelling where uploaders reach for that one instead ("GER", "NED", "SUI", "POR"),
 * and the two-letter code ("France", "FRA", "FR").
 *
 * Some of those codes are everyday English words ("CAN", "NO", "IT", "IN", "US"). They are
 * safe HERE and would not be safe on a list matched against words of the title: a name only
 * counts as a location as the LAST part of a place list ("Toronto, CAN"), never on its own,
 * so the word inside a title is never even asked about. That guard is the reason the list may
 * hold them, and the reason a lone "Georgia" still comes out as the artist it usually is.
 *
 * Two codes are deliberately NOT here. "SA" names Saudi Arabia as much as South Africa, and a
 * code that names two countries names neither. "ARE" (the UAE's three-letter code) is an
 * ordinary verb that no uploader writes as a country - "UAE" is the form they use.
 *
 * A US STATE that shares a country's code ("Boston, MA" reading as Morocco, "Los Angeles, CA"
 * as Canada) costs nothing: the chunk is location info either way, so it goes either way. The
 * list only has to be right about WHETHER a chunk names a place, never about which place.
 */
var mdbTitleCountries = [
    "Argentina", "ARG", "AR",
    "Australia", "AUS", "AU",
    "Austria", "AUT", "AT",
    "Belgium", "BEL", "BE",
    "Brazil", "BRA", "BR",
    "Bulgaria", "BGR", "BUL", "BG",
    "Canada", "CAN", "CA",
    "Chile", "CHL", "CHI", "CL",
    "China", "CHN", "CN",
    "Colombia", "COL", "CO",
    "Croatia", "HRV", "CRO", "HR",
    "Czech Republic", "Czechia", "CZE", "CZ",
    "Denmark", "DNK", "DEN", "DK",
    "Egypt", "EGY", "EG",
    "England", "ENG",
    "Estonia", "EST", "EE",
    "Finland", "FIN", "FI",
    "France", "FRA", "FR",
    "Georgia", "GEO", "GE",
    "Germany", "DEU", "GER", "DE",
    "Greece", "GRC", "GRE", "GR",
    "Hungary", "HUN", "HU",
    "India", "IND", "IN",
    "Indonesia", "IDN", "INA", "ID",
    "Iran", "IRN", "IRI", "IR",
    "Ireland", "IRL", "IE",
    "Israel", "ISR", "IL",
    "Italy", "ITA", "IT",
    "Japan", "JPN", "JP",
    "Latvia", "LVA", "LAT", "LV",
    "Lebanon", "LBN", "LIB", "LB",
    "Lithuania", "LTU", "LT",
    "Malta", "MLT", "MT",
    "Mexico", "MEX", "MX",
    "Morocco", "MAR", "MA",
    "Netherlands", "Holland", "NLD", "NED", "NL",
    "New Zealand", "NZL", "NZ",
    "Norway", "NOR", "NO",
    "Peru", "PER", "PE",
    "Philippines", "PHL", "PHI", "PH",
    "Poland", "POL", "PL",
    "Portugal", "PRT", "POR", "PT",
    "Romania", "ROU", "ROM", "RO",
    "Russia", "RUS", "RU",
    "Scotland", "SCO",
    "Serbia", "SRB", "RS",
    "Singapore", "SGP", "SIN", "SG",
    "Slovakia", "SVK", "SK",
    "Slovenia", "SVN", "SLO", "SI",
    "South Africa", "ZAF", "RSA",
    "South Korea", "KOR", "KR",
    "Spain", "ESP", "ES",
    "Sweden", "SWE", "SE",
    "Switzerland", "CHE", "SUI", "CH",
    "Thailand", "THA", "TH",
    "Tunisia", "TUN", "TN",
    "Turkey", "Türkiye", "TUR", "TR",
    "Ukraine", "UKR", "UA",
    "United Arab Emirates", "UAE", "U.A.E.", "AE",
    "United Kingdom", "UK", "U.K.", "GBR", "GB",
    "United States of America", "United States", "USA", "U.S.A.", "US", "U.S.",
    "Vietnam", "VNM", "VIE", "VN",
    "Wales", "WAL"
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
 * "SEVEN Mix 084". One mixture does NOT count as deliberate: a bit that is uniform once its
 * series words (mdbTitleShowSuffixWords) and its digit tokens are set aside is a SHOUTED name
 * with a generic word behind it - the word is typed in Normal Case by habit and says nothing
 * about the name around it:
 *
 *     "Mat.Theo present UNCODED BIRTHDAY Radioshow"  ->  "Uncoded Birthday Radioshow"
 *
 * The shouted words are re-cased, the series word keeps its typed case - which is also what
 * keeps "E-L-E-C-T-R-O MIx" whole: the "MIx" is set aside verbatim, and the dash-spelled
 * name re-cases to itself. "SEVEN Mix 084" still stays: the title spells the channel name
 * the channel's way, and that guard runs first. Two kinds of word are left alone even inside
 * a bit that is re-cased:
 * - words containing digits, which are IDs and not words: "XLR8R700", "808"
 * - words without a vowel, which cannot be words either, so they are abbreviations and keep
 *   their caps: "DSS 139" stays "DSS 139", never "Dss 139". That is what covers the acronyms
 *   not worth listing below one by one.
 * A bit that is nothing BUT a short word in caps is the fourth kind, and the one no test
 * inside the word can reach:
 *
 *     "KCE — FROM OPEN FREQUENCY 001"  (channel "From UNDRGRND Culture")
 *     WRONG: 2026-08-13 - Kce - From Open Frequency 001
 *     RIGHT: 2026-08-13 - KCE - From Open Frequency 001
 *
 * "KCE" holds a vowel, is not the channel's initials and is on no list, so every rule above
 * reads it as a shouted word - and "Kce" is nobody. Three letters standing alone as a whole
 * bit of the title are an artist's initials or a brand, never a word somebody bothered to
 * shout. The bit has to be nothing but that one word: the same three letters INSIDE a phrase
 * are an ordinary word, which is what keeps "MOLTO IN THE MIX" coming out as "Molto In The
 * Mix" and not as "Molto IN THE MIX".
 *
 * - words that spell the CHANNEL's initials, which is the third kind of acronym and the only
 *   one a vowel does not give away:
 *       "IA Podcast | 233: Fixeer & Ricardo Garduno"  on the channel "Illegal Alien Records"
 *       ->  2026-03-05 - Fixeer & Ricardo Garduno - IA Podcast 233,  never "Ia Podcast"
 *   A label shortening itself in its own podcast name is common enough that listing every such
 *   channel below would be endless, and the channel name is right there to be asked. A PREFIX
 *   of the initials counts ("IA" of "IAR"): the "Records" drops out of the podcast name as
 *   readily as it stays in. Two letters minimum, and only for a word already written in caps -
 *   otherwise a lowercase title would be shouted INTO an acronym.
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


/*
 * mdbTitleDefinitionDocs
 *
 * What the reasoning panel shows behind the round "?" next to a cleanup step: the list the
 * step worked off, one short sentence saying what it is for, and the list itself.
 *
 * A reporter who sees "Decoration removed" cannot tell whether the words went because a rule
 * says so or because the parser guessed - and a maintainer reading the report cannot tell
 * either. The "?" answers both in place: this list, these entries, and the entry that fired is
 * in there to be pointed at.
 *
 * Keys are the variable names above, and the panel prints the key as the heading - so it also
 * says WHERE to go and fix a wrong entry. Values are read live (the arrays are never
 * reassigned, only extended), so nothing here can drift out of step with the data.
 *
 * A new list in this file needs an entry here as soon as a trace step names it - see the defs
 * parameter of mdbTitle_traceStep() in title_builder.js. A list no step names needs none: the
 * panel only ever asks for what a step points at.
 */
var mdbTitleDefinitionDocs = {
    mdbTitleTypoFixes: {
        what: "Misspellings corrected before any rule reads a word. A typo in an ordinary word costs a letter; a typo in a word the parser reads (\"podcats\") costs the whole title.",
        data: mdbTitleTypoFixes
    },
    mdbTitleNoise: {
        what: "Decoration a mix page title never carries: free-download tags, premiere and exclusive markers, and the like. Taken out of the title before it is split into chunks.",
        data: mdbTitleNoise
    },
    mdbTitleDroppedBitPatterns: {
        what: "Chunks that name a piece of a recording or a corner of a festival site - a part, a day, a stage, a camp. The mix page covers the whole recording, so these never join the title.",
        data: mdbTitleDroppedBitPatterns
    },
    mdbTitleUsernameConversions: {
        what: "Channel name -> the show MixesDB files that channel's uploads under. Hand-written per channel, and the value is the spelling both the title and the category use.",
        data: mdbTitleUsernameConversions
    },
    mdbTitleChannelSeriesConversions: {
        what: "For a title that names its show only HALF: the channel plus the generic words the title uses (\"DJ Mix\") name the show together. An upload whose title carries none of the words is untouched.",
        data: mdbTitleChannelSeriesConversions
    },
    mdbTitleExtraArtistConnectors: {
        what: "Connectors behind which FURTHER artists stand. What follows one is taken out of the title and joined to the artist group with a comma.",
        data: mdbTitleExtraArtistConnectors
    },
    mdbTitleTogetherArtistJoiners: {
        what: "Words between two artists who played TOGETHER, rewritten to the \"&\" MixesDB writes.",
        data: mdbTitleTogetherArtistJoiners
    },
    mdbTitleVenueConnectors: {
        what: "Words in front of a place, rewritten to the \"@\" MixesDB writes.",
        data: mdbTitleVenueConnectors
    },
    mdbTitleLiveAtWords: {
        what: "Live and DJ-set markers. They say a set was played somewhere, which is what turns the words behind them into a venue - and a marker with no place to point at is dropped.",
        data: mdbTitleLiveAtWords
    },
    mdbTitleGuestMarkers: {
        what: "Phrases marking a guest mix. The name in front of one is the artist, and the phrase itself is no part of the title.",
        data: mdbTitleGuestMarkers
    },
    mdbTitleCountries: {
        what: "Country names and codes, for spotting what only says where an artist is from - which a mix page title never carries. A bracket behind a name goes even when it holds a lone code (\"Adjust (BE)\") and even on a live title, as long as it stands in front of the \"@\"; an unbracketed chunk only goes as a place LIST ending in a country (\"Ibiza/ Dusseldorf, Germany\"), and only on a non-live title, where the same words are not the venue's city and country.",
        data: mdbTitleCountries
    }
};
