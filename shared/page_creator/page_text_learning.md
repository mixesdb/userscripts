# Plan: learning the page text from sibling mix pages

**Status: planned, not built.** Waiting on the same lookup as everything else - see
`mixesdb_api_request.md`. This file is the design so it does not have to be re-derived.

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
  & gcmsort=timestamp & gcmdir=desc & gcmlimit=8
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
