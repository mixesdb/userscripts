# Plan: learning the page text from sibling mix pages

> **BUILT 2026-08-18** as roadmap step 4, in `page_creator.js`: `mdbPageCreator_recentFetch()`
> (the generator call below, cached per category in `mdbPageCreator_recentAnalysisCache`),
> `mdbPageCreator_recentPageTextFindings()` (signals A-C), `mdbPageCreator_recentTitleFindings()`
> (the episode format / spelling / city read off the same pages' TITLES, applied to the
> suggestion by `mdbPageCreator_applyRecentToSuggestion()`), rendered as reasoning panel
> sections 5 and 7. This file stays as the design rationale. **Deltas against the plan below,
> all decided 2026-08-18:**
>
> - **One threshold instead of two: every signal needs 90%** ("Leite Regeln ab wenn 90% der
>   Seiten die Anforderungen erfüllen"), not 75/75/90 - AND the unanimous newest 5 override a
>   disagreeing sample ("Neuere Seiten haben Vorrang"): a 7/8 whose dissenter is the OLDEST
>   page still fires, one whose dissent sits among the newest 5 abstains. That keeps most of
>   what 75% caught (the plan's 6/8 image cases pass when the two odd pages are old or the
>   newest run is clean) while a genuinely split category still abstains.
> - **The extension IS voted on** (majority among the same-named lead artworks, tie -> `.jpg`),
>   against the "always .jpg" section below - the example the feature was asked with names a
>   `.png`, and the inline uploader's rewrite makes a wrong vote as free as a wrong constant.
> - **The literal final title instead of `{{subst:PAGENAME}}`** in the `[[File:]]` line - the
>   image line is built from the (editable) title field at click time like the categories, so
>   a corrected title still takes the image name with it, and the inline uploader can match
>   the referenced name while the page is still unsaved.
> - **Bucket categories are skipped outright** (`mdbPageCreator_bucketCategories` - "Promo
>   Mix"): their pages are no siblings, so neither the analyses nor the hints bar's "N mixes"
>   toggle touch them.
> - **A `{{StandardShow*}}` verdict is dropped at use when the player duration is off its
>   stated length by more than ±30%** - written as the table then, not only noted, since a far-off
>   duration is a hint the category was misread.
>
> **Delta added 2026-08-19: the call carries a second module.** The generator answers in pageid
> order - `gcmsort=sortkey` decides WHICH 10 pages come back, not the order they come back in,
> and the response has no index to restore it from. So the same category rides along as a plain
> `list=categorymembers & cmsort=sortkey & cmdir=desc & cmlimit=10` in the SAME request, and
> `query.categorymembers` is the order the wikitext is filed into. It replaces the title sort
> that stood here before, which mis-filed every page with a manual sortkey (`Trommel.220`,
> dated 2023-09-18 in its title and filed at 2025-05-30) - and those pages are exactly the ones
> the "newest 5 override" leans on.

> **Delta added 2026-08-19: two gates in front of everything below.** The whole file rests on
> "the pages in this category are this mix's siblings", and on the reported DEEP & HAZY mix
> neither half of that held. `mdbPageCreator_recentAnalysisFor()` now refuses the analysis
> outright when the TITLE numbers its entity ("Undercurrent 5") while the wiki knows the name
> as a venue or an event - a series numbers its editions, a place does not, so they are two
> things of one name - and when the category's newest page is more than three years older than
> the mix (`mdbPageCreator_recentMaxAgeYears`): Undercurrent's newest page is from 2015 and the
> mix from 2026. Only that direction; siblings newer than the mix are the normal case for an
> old recording added today. Sections 5 and 7 name whichever gate bit.
>
> **Delta added 2026-08-19: signal C writes nothing. It is a HINT.** The vote below measures
> what a category's recent pages have in COMMON, and that is not the same question as what a
> mix sounds like. Category:Undercurrent answers both at once: its 10 newest pages carry
> Techno 5, House 3 and Tech House 2 - no style reaches 90% - while `Amsterdam Dance Event`
> stands on all 10, because the venue's MixesDB pages are sets from four ADE editions
> (2012, 2013, 2015). Written onto an unrelated podcast episode, that is a wrong filing made
> for the editor.
>
> So the 90% vote stays exactly as specified below and its RESULT changed hands: the created
> page keeps its two empty style rows, and what cleared the bar is shown as a chip in the
> row's "Hints:" line and at the end of reasoning section 6, each with a note saying which
> pages it came off (`mdbPageCreator_recentHintCategories()`). The site's own style box
> (TrackId.net) is untouched - those styles are read off THIS mix and are still written.
>
> A first attempt asked `mdbnames` whether the learned name is a name (it answers empty about
> `Techno`/`House`/`Deep House`, with a type about `Amsterdam Dance Event`) and wrote the rest.
> Rejected as too clever: it costs a request, needs a three-state filter, and still files a
> page on a guess. The script cannot tell a style from a coincidence, so it says what it saw.

> **Delta added 2026-08-19: signal B is read off the EPISODE pages only.** The live recordings
> among a series' recent pages no longer vote on the lead artwork
> (`mdbPageCreator_recentImageVote()`, `mdbPageCreator_titleIsLiveRecording()`): the artwork
> belongs to whatever the page records - the podcast for an episode, the event for a set played
> there - so a `... @ Watergate Open Air, SAGE, Berlin (Groove Podcast 510, 2026-07-15)` page
> opens with the event's flyer, named after the event and shared with every other set of that
> night. It cannot say what an episode page starts with. Reported on Groove Podcast 514: two of
> that category's 10 newest pages are such recordings, 8 of 10 is not 90%, and the series lost
> the artwork line every one of its episodes carries. With them left out the vote reads 8 of 8.
> The section below already named them "the exception the convention is stated against" and
> priced it into the 75% threshold the deltas above replaced with 90% - at 90% the exception
> has to be taken out of the sample instead. `RA Podcast` (also 2 of 10) fires the same way now;
> `Essential Mix`, `Trommel` and `HATE Podcast` go from 9/10 to 9/9, and the venue and event
> categories are untouched (`Ritter Butzke`, `fabric`, `Boiler Room`, `Dekmantel Festival` -
> measured against the live API on 2026-08-19). Where the WHOLE sample is live recordings the
> category IS a venue or an event, those pages are its pages, and the vote runs over all of
> them again - "named after something else" is the answer they legitimately give. Only signal
> B: a live recording's `{{StandardShow*}}` and its styles say as much about the series as any
> other page's.

> **Signal D added 2026-08-19: the `== Notes ==` section.** Not in the plan below, and the one
> signal whose value is the EMPTY line it writes. A series that documents each episode on its
> own site puts that link in a Notes section above the tracklist - `Groove Podcast` 10 of 10
> (`https://groove.de/2026/08/12/groove-podcast-513-danny-daze/`), `RA Podcast` 10 of 10
> (`https://ra.co/podcast/1071`) - and a created page without the heading is a page where that
> link is quietly never added. So the heading is written with a blank line under it wherever
> 90% of the siblings carry one, and the editor fills it: `mdbPageCreator_notesBody()` reads
> the section per page, `mdbPageCreator_recentPageTextFindings()` votes on it like every other
> signal, and `mdbPageCreator_pageText()` puts it between the `{{Player}}` and `== Tracklist ==`,
> where the siblings have it.
>
> **A second, separate vote on the HOST those sections link**, and it is only a search key.
> `mdbPageCreator_recentNotesUrl()` looks through the player page's description for a link on
> that host and writes it verbatim; nothing is ever constructed from the title, because a slug
> is not derivable and a wrong link in Notes is worse than the empty line. It has to clear
> `mdbPageCreator_notesUrlMinPath` (10) characters of path: `groove.de/` alone is the
> magazine's front page and stands in half the descriptions, while an episode page carries the
> date and the name in its slug. Scheme and `www.` are optional on the description side -
> uploaders write `groove.de/2026/...` as readily as the full URL - and both sides compare
> www-less and lower case.
>
> The two votes are separate because the wiki answers them separately: `Essential Mix` pages
> carry a Notes section holding nothing but `Episode #1671`, so the section is its convention
> and no host is - it gets the empty heading and no search. Measured against the live API on
> 2026-08-19: section YES on `Groove Podcast` 10/10, `RA Podcast` 10/10, `Essential Mix` 10/10;
> NO on `HATE Podcast`, `Trommel`, `Ritter Butzke`, `Boiler Room` (0/10) and `Dekmantel
> Festival` (1/10); `In The Mix` abstains at 4/10, which is right - four of its pages link
> `liebrand.nl` and six do not, and the wiki itself is undecided there.
>
> Groove Podcast is the case the empty line was written for: its Notes all link `groove.de`,
> while its own SoundCloud descriptions link a `bit.ly` shortener instead ("Go to bit.ly/DazePod
> for track list and short interview"), so the direct search finds nothing.

> **Delta added 2026-08-19, same day: the shortener IS followed, on SoundCloud.** The paragraph
> above used to end "following the shortener is not our business" - and it is, because
> `bit.ly/BRCPod` is a plain 301 to
> `https://groove.de/2026/08/19/groove-podcast-514-black-rave-culture/`, which is the exact line
> that belongs in that page's Notes. Every Groove episode is written this way, so refusing the
> redirect meant refusing the feature on the one series that motivated it.
>
> **It cannot be done with `$.ajax`.** Verified against bit.ly with an `Origin:
> https://soundcloud.com` header on 2026-08-19: the 301 carries no `Access-Control-Allow-Origin`,
> so a cors request is blocked before the redirect is followed and a no-cors one comes back
> opaque with `finalUrl` unreadable. It takes `GM_xmlhttpRequest`, which is a grant of the SITE
> script - so `page_creator.js` never calls one. The ability is handed in as an option,
> `mdbPageCreator_add({ followRedirect: fn })`, and a site that passes none simply keeps the
> empty section. Only SoundCloud passes one (`scFollowRedirect()` in its `script.funcs.js`);
> TrackId.net deliberately does not, because it ships with no `@grant` line at all and adding
> one would move it into Tampermonkey's sandbox for this.
>
> `method: "HEAD"`, `redirect: "manual"`, `anonymous: true`. Manual because the `Location`
> header is the whole answer: the target is never fetched, so no page view is counted on
> groove.de and `@connect` stays a list of shortener hosts - Tampermonkey checks redirect
> TARGETS against `@connect` too, and the target is by definition not known in advance. A
> manager that ignores the option follows anyway and answers `finalUrl`, which is read as the
> fallback. Anonymous because a redirector has no business seeing the reader's cookies.
>
> **The answer is a candidate, not a result.** It goes through `mdbPageCreator_notesUrlIn()` -
> the same host-and-path-length rule the description is searched with - so a shortener pointing
> anywhere but the host the siblings link writes nothing. That is what makes following a
> stranger's redirect safe: it is not trusted, it is checked against what the wiki already said.
>
> Four gates before a request is made at all (`mdbPageCreator_notesEnsureResolved()`): a
> resolver was handed over, the series links a host, the description does not already name that
> host, and it holds a link on a KNOWN shortener (`mdbPageCreator_notesShorteners` - true
> redirectors only; a `linktr.ee` is a landing page with many links and would answer with
> itself). On the tracks that pass all four it is one HEAD per player page; on everything else
> it is nothing. It runs from the settle paths, never from a render - and unlike
> `mdbPageCreator_recentSettled()` it does carry the page generation, since the answer is
> per-track state and a late one would land on the next mix.

The page creator writes the wikitext a new mix page starts as (`mdbPageCreator_pageText()` in
`page_creator.js`). Today that text is the same shape for every page. But MixesDB already
contains the right shape: the other episodes of the same show sitting in the entity's category.
Once a candidate resolves to a non-artist category we can read the most recent of those and copy
what they agree on.

Measurements below were taken against the live API on 2026-08-10, 8 most recent pages per
category.

## Where it plugs in

The category lookup already tells us the entity's category. One further call fetches the recent
siblings **with their wikitext**:

```
generator=categorymembers & gcmtitle=Category:<entity> & gcmnamespace=0
  & gcmsort=sortkey & gcmdir=desc & gcmlimit=8
  & prop=revisions & rvprop=content & rvslots=main & origin=*
```

5 pages of `Category:Trommel` cost 4.9 KB, so 8 is comfortable. This is the same call that gives
us the recent *titles* for the episode-number format, so learning the page text costs nothing on
top of what section 6 of `mixesdb_api_request.md` already plans for.

Note `origin=*` and `api.php`: `index.php?action=raw` returns the wikitext too, but sends no
`Access-Control-Allow-Origin`, so it is blocked cross-origin. The site scripts use `$.ajax` and
are not granted `GM_xmlhttpRequest`.

## The method: consensus, or abstain

Every signal is decided the same way, and the rule matters more than the individual signals:

1. Parse the same feature out of each of the N recent siblings.
2. Take the most common answer, and use it only if it clears the signal's threshold.
3. Otherwise write what we write today.

Never take a feature from a single page. Recent pages only - conventions change, and a full
listing would average the current house style together with a decade of older ones.

Two thresholds, because the signals are not equally stable:

| Signal | Threshold | Why |
| --- | --- | --- |
| A - file details body | 75% | a house style; near-unanimous wherever it exists at all |
| B - leading image | 75% | same, and the pages that dissent are a known exception (live recordings) |
| C - style categories | **90%** | styles genuinely vary per mix; only a genre-locked series clears this |

Neither number is arbitrary: each is the one that abstains in exactly the cases where the wiki
itself is undecided. 75% on styles would have written `House` onto `Essential Mix` pages, where
it is only right 70% of the time.

## Signal A: the file details body

Some series do not use the dur/MB/kbps table at all - they use a `{{StandardShow<length>}}`
template, which states the show's standard length instead of this file's. Where that is the
house style, the SoundCloud duration must **not** be written into the page.

Detect per sibling:

- `{{StandardShowNh}}` / `{{StandardShow90min}}` / … → that template name.
  The full family is `StandardShow30min`, `1h`, `90min`, `2h`, `3h`, `4h`, `?h`.
- `{|{{NormalTableFormat}}` with the dur/MB/kbps header → `table`.
- neither → `none`, which never wins a vote, it only fails to support one.

Measured:

| Category | Type | Result |
| --- | --- | --- |
| `Essential Mix` | Show | `StandardShow2h` 8/8 |
| `Autonomic (Show)` | Show | `StandardShow2h` 8/8 |
| `Slave To The Rhythm` | Show | `StandardShow1h` 7/7 |
| `Techno Germany Podcast` | Podcast | `StandardShow1h` 7/8 |
| `HATE Podcast`, `Trommel`, `RA Podcast`, `Zenaari Mix`, `Deep Space Series` | Podcast | `table` 8/8 |
| `Ritter Butzke`, `Boiler Room`, `Dekmantel Festival` | Venue / Event | `table` 8/8 |
| `In The Mix` | Show | `StandardShow1h` 5/8 → **abstain** |
| `fabric` | Venue | `table` 5/8 → **abstain** |

So it is close to unanimous wherever there is a convention at all, and the two categories that
fall under 75% are genuinely mixed on the wiki. Shows lean to the template and podcasts and
venues to the table, but the type is only a tendency - `Techno Germany Podcast` is a Podcast that
uses `StandardShow1h`. **Read it per category, do not infer it from the type.**

When a `StandardShow*` wins, `mdbPageCreator_fileDetails()` is skipped entirely and the template
is written in its place. The track duration we read off the site is then only a cross-check: if
it is off the template's stated length by more than ~30%, that is a hint we matched the wrong
series, and it belongs in the confidence reasons rather than overriding the choice.

## Signal B: the leading image

Mix pages open with an artwork line above `== File details ==`. The creator writes no image line
at all today, so this is a gap, not a change.

Detect per sibling: the **first** `[[File:…]]`/`[[Image:…]]` on the page, compared to the page
title with `_` read as a space, case-insensitively, and with the extension stripped.

- stem equals the page title → `same`
- a `[[File:…]]` that is named after something else → `other`
- no image at all → `none`

Measured:

| Category | Type | Result |
| --- | --- | --- |
| `Deep Space Series`, `Zenaari Mix`, `Techno Germany Podcast` | Podcast | `same` 8/8 @360px |
| `HATE Podcast` | Podcast | `same` 7/8 @360px |
| `Trommel`, `RA Podcast` | Podcast | `same` 6/8 @360px |
| `Essential Mix` | Show | `same` 6/8 @360px |
| `Ritter Butzke`, `Dekmantel Festival` | Venue / Event | `other` 8/8 |
| `Boiler Room` | Event | `other` 7/8 |
| `Slave To The Rhythm`, `In The Mix`, `Autonomic (Show)` | Show | `none` 8/8 |

When `same` wins, write as the first line of the page:

```
[[File:{{subst:PAGENAME}}.jpg|right|360px]]
```

`{{subst:PAGENAME}}` rather than the title string, so a title corrected in the input before
saving takes the image name with it - the same reason `mdbPageCreator_pageCategories()` reads the
input rather than the parse.

The `same` counts that sit at 6/8 are not disagreement about the convention: the two odd pages
are live recordings whose title carries a venue and a bracketed show reference
(`2026-06-09 - East End Dubs @ Eastenderz, Hï Ibiza (Essential Mix, 2026-06-27)`), so their
artwork is named after the broadcast rather than the page. They are the exception the convention
is stated against, which is why the threshold sits at 75% and not higher.

`other` and `none` both mean **write no image line** - the venue case names its artwork after the
venue and the date, which is not something we can construct, and inventing a `[[File:]]` that
will never be uploaded is worse than leaving the line out.

Only the *first* image is ever considered. The extra 180px images on `Essential Mix` pages
(`_BBC`, `_TL_1`, `_TL_2`) are tracklist screenshots the editor adds afterwards.

### The extension is always `.jpg`

Not a guess and not a majority vote: **MixesDB's inline uploader (in the edit preview) rewrites
the extension in the page text when a PNG is uploaded against a referenced `.jpg`.** So the
extension we write is not a claim about the file, it is a placeholder the wiki corrects by
itself.

That makes the extension of the sibling images irrelevant - do not read it, do not vote on it.
Which is just as well, because it is not consistent anyway (`Zenaari Mix` is png 5 / jpg 3,
`Techno Germany Podcast` jpg 4 / png 4): it records whatever each editor happened to upload.

## Signal C: the style categories, at 90% or not at all

The creator leaves two blank `[[Category:]]` lines for the editor to fill with styles. A series
that only ever plays one thing can fill the first one - but styles vary far more than the other
signals, so this needs a **much higher bar than 75%: at least 90% of the recent siblings**, i.e.
9 of 10. Below that, both lines stay blank.

A style here is any category on a sibling that is not the year, the entity itself, an artist
named in that page's title, `Promo Mix`, or a `Tracklist:` filing.

Measured over the 10 most recent siblings:

| Category | Styles found | 90% rule fills |
| --- | --- | --- |
| `HATE Podcast` | Techno 100%, Deep Techno 40% | **Techno** |
| `Essential Mix` | House 70%, Tech House 40% | nothing |
| `Boiler Room` | House 60%, Bass 30%, Disco 30% | nothing |
| `Zenaari Mix` | Experimental 60%, Ambient 50% | nothing |
| `Deep Space Series` | Techno 62%, Dub Techno 37% | nothing |
| `Trommel` | House 50%, Techno 30%, Minimal 30% | nothing |
| `RA Podcast` | House 50%, Techno 50% | nothing |
| `Ritter Butzke` | Deep House 50%, Tech House 40% | nothing |
| `Techno Germany Podcast` | Hard Techno 40% | nothing |

So it fires on 1 of 9 - which is the point. A genre-locked series like `HATE Podcast` gets its
one certain style, and everything else keeps the blanks that the editor cannot miss. A 75%
threshold here would have written `House` onto `Essential Mix` pages and been wrong a third of
the time.

Only styles that clear the bar are written, and never more than the two blank lines allow. If
one style clears it, the second line stays empty.

## What must NOT be learned

**`[[Category:Tracklist: incomplete]]`.** It appears on nearly every sibling, but only because
those pages have a partial tracklist. The filing describes the page's own tracklist, not the
series, so it is never read off the siblings - not even now that the creator does fill a
tracklist in (`tracklist_detector.js`, added after this file was written). It is decided by what
MixesDB's Tracklist Editor API says about the tracklist actually being written: `none` when
there is none, its own `complete` when it says so, `incomplete` for everything else. See the
"The tracklist" section of `CLAUDE.md`.

A signal being consistent across siblings does not make it transferable - ask what it describes
first. That is the difference between this and Signal C: a style describes the music, which a
series can genuinely fix; the tracklist filing describes the page.

## The resulting page text

Today, for every page:

```
== File details ==

{|{{NormalTableFormat}}
! dur
…
{{Player
 |<url>
}}

== Tracklist ==

<list>

</list>

[[Category:…]]
```

After, for a `Category:HATE Podcast` page - the one measured category where all three signals
have something to say (image `same` 7/8, and `Techno` at 100%; the body stays a table there):

```
[[File:{{subst:PAGENAME}}.jpg|right|360px]]

== File details ==

{|{{NormalTableFormat}}
! dur
…

{{Player
 |<url>
}}

== Tracklist ==

<list>

</list>

[[Category:2026]]
[[Category:<artist>]]
[[Category:HATE Podcast]]
[[Category:Techno]]
[[Category:]]
[[Category:Tracklist: none]]
```

(The `<list>` and the `Tracklist: none` are the empty case. Where the description held a
tracklist, both are filled by the detector instead - that is orthogonal to everything measured
here.)

For `Category:Essential Mix` the body becomes `{{StandardShow2h}}` instead of the table and both
style lines stay blank. For `Category:Ritter Butzke` nothing fires at all and the output is
exactly today's - no image line, the table, two blank styles.

Every signal degrades to current behaviour, so a category we have never seen, an empty category,
or a failed request all cost nothing.

## Surfacing it

Each learned signal is a line in the "Create" link's existing confidence reasons, phrased as
what was observed rather than what was decided - "7 of the last 8 pages in Category:Essential Mix
use {{StandardShow2h}}". A contributor who disagrees needs to see what it was read off, and
these are exactly the reports that make the next rule.

## Testing

`title_examples.js` covers titles, not page text, and should stay that way. This needs its own
fixture set: recorded sibling wikitext per category (a few real pages, trimmed) plus the page
text it should produce. Record the fixtures from the live API with a small script rather than
writing them by hand, the same way `known` will be recorded for the category lookup - the point
of the whole feature is that the wiki is the authority, so hand-written fixtures would test our
imagination instead.
