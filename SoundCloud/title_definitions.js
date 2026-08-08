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
