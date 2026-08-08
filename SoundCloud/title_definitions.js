log( "/SoundCloud/title_definitions.js loaded" );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Definitions for the MixesDB mix page title suggestion
 *
 * The suggestion itself is built in buildMixesdbTitle() (SoundCloud/script.funcs.js) and
 * offered as an editable input below the track headline. Everything in this file is plain
 * data meant to be extended by hand - no logic, so it can be edited without reading the
 * parser.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */


/*
 * The three groups
 *
 * A MixesDB mix page title is made of exactly THREE groups, separated by " - ":
 *
 *     YYYY-MM-DD - Artist - Entity
 *
 * Everything read out of a SoundCloud title has to end up inside one of them. A 4th group is
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
 *   They belong INTO the artist group - see scExtraArtistConnectors below.
 *
 * - The entity split in half at the word before its number:
 *       "SEVEN Mix 084 - Theo Scuera"    (channel "SEVEN")
 *       WRONG: 2026-07-13 - SEVEN - Mix 084 - Theo Scuera (Promo Mix)
 *       RIGHT: 2026-07-13 - Theo Scuera - SEVEN Mix 084
 *   "SEVEN Mix" is the entity, see scShowSuffixWords. Two perfect groups in the wrong order
 *   is the easy case - do not take them apart, swap them.
 *
 * - The number written ONTO the entity, cut off as a stray ".251":
 *       "Trommel.251 - Arno"    (channel "trommel")
 *       WRONG: 2026-08-06 - trommel - .251 - Arno (Promo Mix)
 *       RIGHT: 2026-08-06 - Arno - trommel.251
 *   The channel name confirms the entity, and the channel's spelling is the one used.
 *
 * A suggestion that still comes out with more than three groups takes a big confidence hit,
 * because it means part of the SoundCloud title was not understood.
 */


/*
 * Group 1: the date
 *
 * Two sources may be used, the SoundCloud title and the upload/release date.
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
 * A month or a year on its own ("August 2026", "1998") is NOT read as a date: it is part of
 * the mix's name, and we already have an exact upload date to fall back to.
 */


/*
 * scUsernameConversions
 *
 * SoundCloud channel/profile name (API field "username") -> the show/podcast entity a
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
 * - A channel that is NOT listed here falls back to its raw SoundCloud name, so the common
 *   case of an unmapped show still produces something usable.
 */
var scUsernameConversions = {
    "NTS Latest": "NTS Radio",
    "Resident Advisor": "RA Podcast"
};


/*
 * scTitleNoise
 *
 * Patterns removed from the SoundCloud title before it is parsed. Only for decoration that
 * is never part of a MixesDB title - keep this list conservative, since anything matched
 * here is silently dropped from the artist name.
 */
var scTitleNoise = [
    /\[\s*free\s*(?:download|dl)?\s*\]/gi,
    /\(\s*free\s*(?:download|dl)?\s*\)/gi,
    /\*+\s*free\s*(?:download|dl)?\s*\*+/gi,
    /\bfree\s*(?:download|dl)\b/gi,
    /\[\s*(?:premiere|exclusive)\s*\]/gi,
    /\(\s*(?:premiere|exclusive)\s*\)/gi
];


/*
 * scExtraArtistConnectors
 *
 * Words that introduce FURTHER artists, e.g. "Slowciety w/ Asa 808". Everything from the
 * connector up to the next separator is taken out of the title and appended to the artist
 * group with scExtraArtistJoiner - it is never a group of its own.
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
 */
var scExtraArtistConnectors = [
    "w/",
    "with"
];


/*
 * scExtraArtistJoiner
 *
 * How the extra artists are joined onto the first one. Help:Add_a_new_mix_page reserves " & "
 * for artists who played TOGETHER (b2b) - "w/" says nothing about that, and playing after one
 * another is the normal case, so "," is what we assume. The suggestion says so in its
 * confidence reasons, since only the recording itself can settle it.
 */
var scExtraArtistJoiner = ", ";


/*
 * The number is the border between entity and artist
 *
 * A SoundCloud title does not need a separator to be readable. The EPISODE NUMBER marks where
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
 * curated lists (scUsernameConversions, scShowSuffixWords), because a bare word next to the
 * channel name is far more often the artist.
 */


/*
 * scShowSuffixWords
 *
 * Words that turn a bare channel name into the show name MixesDB uses, when the SoundCloud
 * title spells it out. The channel name alone is not the entity if the title says otherwise:
 *
 *     channel "HATE"  + "HATE Podcast 496 - Fadi Mohem"  ->  entity "HATE Podcast", no. 496
 *     channel "SEVEN" + "SEVEN Mix 084 - Theo Scuera"    ->  entity "SEVEN Mix", no. 084
 *
 * "SEVEN Mix" is what the second one is about: the word in front of the number belongs to the
 * entity, it is never split off into a group of its own ("SEVEN - Mix 084 - Theo Scuera"),
 * and what is left over after it is the artist.
 *
 * Only used for channels WITHOUT an entry in scUsernameConversions - a mapped name is the
 * curated one and must not be extended behind the editor's back.
 */
var scShowSuffixWords = [
    "podcast", "radio", "radioshow", "show", "mixshow", "mix", "mixtape", "mixseries",
    "series", "sessions", "session", "cast", "fm"
];


/*
 * scNormalCaseKeepUpper / scNormalCaseKeepLower
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
 * reads exactly like a shouted one, so it gets re-cased as well. Nothing in a SoundCloud title
 * tells the two apart - the suggestion is editable for that reason.
 *
 * scNormalCaseKeepUpper: words that stay in caps, i.e. acronyms rather than words.
 * scNormalCaseKeepLower: small words that stay lowercase inside a title, but not as its first
 * word ("NO SIGNAL FROM THE VOID" -> "No Signal from the Void").
 */
var scNormalCaseKeepUpper = [
    "DJ", "MC", "NTS", "RA", "BBC", "FM", "AM", "EP", "LP", "VA", "UK", "USA", "EU", "NYC", "ADE"
];

var scNormalCaseKeepLower = [
    "a", "an", "and", "at", "b2b", "by", "for", "from", "in", "of", "on", "or", "the", "to",
    "vs", "with"
];
