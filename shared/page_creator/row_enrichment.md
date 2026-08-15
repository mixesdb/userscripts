# Plan: enriching the page creator row against duplicates

**Status: planned, not built.** Same gate as everything else - the category lookup from
`mixesdb_api_request.md` - except the mirror-URL check, which needs nothing and is marked so.
Measurements below were taken against the live API on 2026-08-15.

## The problem: the player URL is the only thing checked

The toolkit decides "is this mix on MixesDB?" with `action=mixesdb_player_search`, which matches
by keywords taken off the **player URL** (`mixesdbPlayerUsage_keywords()` in
`shared/toolkit/funcs.js`). That is the right first check, and the trap: a mix page whose player
is a different upload of the same recording - another SoundCloud account, another site, or a
mirror URL parked in an HTML comment in the page source - answers "not used yet", and the row
then cheerfully offers to create the duplicate.

It is not hypothetical. During these measurements the check `Vintage Vinyl Session 004` came back
as: page `2026-08-09 - Daniel Bortz - Vintage Vinyl Session 004 (Promo Mix)` **already exists**.
Anyone opening that track behind a URL the page does not carry gets a Create link for it today.

Users are advised to double-check the artist and entity category before creating - so the row
should do that check for them, with the same category knowledge the title suggestion is already
getting. Nothing below blocks creation; every addition is information next to the Create link,
because a legitimate new page can look similar to an existing one (a weekly show, a residency).

## The four additions

### 1. Links to the found categories

Every candidate the lookup resolves is rendered as a link:

```
https://www.mixesdb.com/w/Category:<canonical title>
```

(`/w/`, not `/db/` - the `/db/` form answers 301 to `/w/`.) Label it with the canonical spelling
and the type and count the lookup returned: `Trommel (Podcast, 29)`. This is the "double-check
the category" advice turned into one click, and it costs zero extra requests - it is the
lookup's own response.

### 2. Sibling titles: the two most recent, and around the mix date

Under each matched category (the artist's and the entity's - not every candidate), show:

- the 2 most recent mix pages in it, and
- up to 3 whose date sits around the date the new title will carry.

A user who sees `2026-08-09 - Daniel Bortz - Vintage Vinyl Session 004 (Promo Mix)` listed under
the artist category does not create it again.

**How to fetch - the sortkey trick.** Mix page titles start with the date, so lexical order is
date order, and `list=categorymembers` can walk it:

```
cmsort=sortkey & cmdir=desc                          -> newest first (verified)
cmsort=sortkey & cmstartsortkeyprefix=<YYYY-MM>      -> jump to a date window (verified)
```

Better than title order, in fact: an editor who files a page under a different broadcast date
sets a sortkey (`[[Category:HATE Podcast|2026-07-07]]`), and the listing follows it - the page
`2025-02-21 - Regis @ ... (HATE Podcast 494, 2026-07-07)` sorts at 2026-07, which is exactly
where a duplicate of that *broadcast* would be looked for.

Call plan per category, exploiting that a new upload is usually fresh:

- mix date within ~60 days of today: **one** `desc` call, limit 10 - the top of the list is both
  "most recent" and "around the date".
- older mix date: the `desc` call plus one `cmstartsortkeyprefix` call for the window.

For the entity category the recent titles are already in hand - the page-text learning call
(`page_text_learning.md`) fetches the 8 most recent siblings - so this adds nothing there. Only
the artist category and the old-mix window cost a call.

### 3. The sanity check on the built title

Two layers, both verified, both in **one combined request** - `action=query` merges a `titles=`
existence check and a `list=search` into a single call:

- **Exact**: `titles=<built title>` → exists / missing. Sharp but literal-minded: one character
  of casing off and it misses. Once the lookup writes canonical spellings into the title
  (decided earlier), this check sharpens with it, since both sides then come from the wiki.
- **Vague net**: `srsearch=intitle:"<artist>" intitle:"<year>"`. `intitle:` terms AND together
  and match case-insensitively (verified: `intitle:"Kameliia" intitle:2026` → 2 hits, the real
  page first). Reported as "similar pages", never as "exists".

Vague results are expected and fine - the check's job is to put the near-misses in front of the
user, not to adjudicate them.

### 4. The mirror-URL check - **needs no endpoint, could ship now**

CirrusSearch indexes the raw wikitext, **HTML comments included**. A phrase search for the
track's URL slug finds a page that carries it only as a commented-out mirror:

```
insource:"hate_music/kameliia-hate-podcast-498"   -> 1 hit, the exact page
```

Verified that comments really are reached: the page `2012-04-20 - Steve Aoki - Aoki's House 032`
is findable by a URL that exists on it only inside `<!-- ... -->`.

This is the direct answer to the mirror trap, it belongs in the **toolkit's** player search
(second layer behind `mixesdb_player_search`, e.g. fired when the first layer comes back empty),
and it is deliberately NOT gated on the category endpoint. Search the slug (`<account>/<track>`),
not the full URL - protocol and `www.` vary across mirrors written by hand.

It also folds into the addition-3 request: `action=query` takes `titles=`, and `srsearch` can
carry the insource clause, so existence + mirror check are one call.

## Request budget per track page

| # | Call | Cost |
| --- | --- | --- |
| 1 | category lookup (`mdbnames`, or the casing-variant batch) | exists in plan |
| 2 | entity siblings with wikitext (page-text learning + recent titles) | exists in plan |
| 3 | exact title + `intitle` net + `insource` mirror check, combined | new, 1 call |
| 4 | artist category sortkey listing | new, 1 call |
| 5 | date-window call, only when the mix date is old | new, 0-1 call |

4-5 calls, inside the 2-5 budget set for the feature, all cached for the life of the page.
Call 3 only fires once a title is actually built; re-running it on every keystroke of the
editable title would be rude - on blur / before Create is enough.

## Presentation

The row already carries confidence reasons; these results join them as information, not as
gatekeeping:

- Category links sit with the suggestion, always.
- Sibling titles are a small expandable list per category - titles only, linked.
- The checks escalate the row's tone, they never disable the Create link:
  - exact hit → the strongest warning the row has: "A page with this title exists", linked.
  - `insource` hit → "This player URL appears on <title>" - the mirror trap caught, worth the
    same weight as an exact hit because it is one.
  - `intitle` hits → a quiet "similar pages" list the user can glance over.

Wrong warnings must stay cheap: a residency or weekly show legitimately produces near-identical
titles, which is why every hit is shown as a link to judge rather than a verdict.

## What this does NOT change

The `mixesdb_player_search` first layer stays as is - it is precise, cheap, and right for the
common case. Nothing here writes into the wiki, and nothing blocks the Create link. Every check
degrades to silence: a failed request, an empty category, an unmatched candidate all just mean
the row shows what it shows today.
