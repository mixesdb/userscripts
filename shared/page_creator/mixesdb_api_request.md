# API request to the MixesDB maintainer

**What we would like:** one API call that takes a list of names and answers, for each, *does
MixesDB have a category of that name, and what kind of thing is it* – matched
**case-insensitively**.

Everything below is the reasoning and the exact contract. Sections 4 to 6 are the parts that need
implementing; the rest is context and can be skimmed. The table at the end of section 3 shows how
small the gap actually is – one capability, everything else already exists.

Measurements in this document were taken against the live API on 2026-08-10, MediaWiki 1.44.0.

---

## 1. Who is asking and what for

The MixesDB page creator is a shared component of the userscripts that MixesDB contributors run
on SoundCloud, Mixcloud, YouTube, RA and others (`shared/page_creator/`). Next to the player
it shows a suggested mix page title and a "Create" link that opens the new page prefilled.

The suggestion has to turn a player title plus a channel name into the three groups a MixesDB
title has:

```
YYYY-MM-DD - Artist - Entity
```

Deciding which part of a player title is the **artist** and which is the **entity** – and
whether the entity is a podcast, a show, a venue (`@`) or an event – is not something the shape
of a title can settle. Two real examples:

| Player title | Channel | Only the wiki can say |
| --- | --- | --- |
| `Vintage Vinyl Session 004` | `Daniel Bortz` | `Daniel Bortz` is an **Artist**, so the channel is the person and the whole title is their series |
| `Zenaari Mix 028 - Azim Fathi` | `BASSIANI` | `Bassiani` is a **Venue** but `Zenaari Mix` is a **Podcast** – so the podcast is the entity, not the club |

MixesDB already holds exactly this knowledge in its category names, and it is the only place
that holds it. We do not want to copy tens of thousands of artist and podcast names into the
userscript – hence asking the API.

The lookup already exists in a limited form (`mdbTitle_lookupCategories()` in
`title_builder.js`) using `action=query&prop=categories&titles=Category:X|Category:Y`. It works,
it is one request per track, and it is polite. The problem is section 3.

## 2. The category vocabulary we read

Verified direct-parent categories and their sizes:

| Category | Subcategories |
| --- | --- |
| `Category:Artist` | 57,462 |
| `Category:Venue` | 10,610 |
| `Category:Podcast` | 4,895 |
| `Category:Show` | 4,294 |
| `Category:Event` | 4,058 |
| `Category:Radio` | 824 |
| `Category:Internet Radio` | 585 |
| `Category:Record Label` | 227 |

`Category:Club`, `Category:Festival`, `Category:Collective` and `Category:Mix Series` exist but
have 0 subcategories, so nothing is filed under them – please correct us if one of those (or
another we missed) is the intended home for something.

Two observations that shaped the contract below, both worth a sanity check from your side:

- **The main type is always a *direct* parent.** Every sample we took has it sitting next to the
  non-type parents rather than further up: `Category:Essential Mix` → `[BBC Radio 1, Show]`,
  `Category:RA Podcast` → `[Podcast, Resident Advisor]`, `Category:Autonomic (Show)` →
  `[Rinse FM, Show]`. No ancestor walk seems necessary.
- **Some categories carry no type at all.** `Category:Panorama Bar` and `Category:Truancy Volume`
  have no parent categories and 0 mixes. These must come back as "no answer", not as a match –
  see section 5.

## 3. Why core MediaWiki cannot answer this

**MixesDB is case-sensitive.** `meta=siteinfo` reports `"case": "case-sensitive"`
(`$wgCapitalLinks = false`), so unlike most wikis even the first letter is significant:

```
Category:trommel   → missing        Category:Trommel  → Podcast (29 mixes)
Category:BASSIANI  → missing        Category:Bassiani → Venue   (39 mixes)
Category:shimon    → missing        Category:Shimon   → Artist  (43 mixes)
```

Player titles are written in whatever case the uploader felt like – `FADI MOHEM`, `trommel`,
`MOLTO IN THE MIX` – so a verbatim `titles=` lookup misses a large share of tracks. That is a
bug on our side today, and we cannot fix it on our side without help, because:

| What we tested | Case-insensitive? | Batched? | Verdict |
| --- | --- | --- | --- |
| `prop=categories&titles=…` | ❌ exact match only | ✅ 50 per call | misses most real inputs |
| `list=prefixsearch` | ✅ | ❌ one term per call | 6–10 calls per track |
| `list=search&srsearch=intitle:"…"` | ✅ | ❌ `OR` between `intitle:` clauses returns 0 hits | 6–10 calls per track |
| `list=search&srwhat=nearmatch` | – | ❌ | returns nothing in ns 14 |
| plain-phrase `"a" OR "b"` | ✅ | ✅ | searches page *text*, returns noise – unusable |

So MediaWiki offers case-insensitive lookup **or** batching, never both.

The workaround available to us without any change on your side is to guess casing variants and
put them all in one `titles=` call – `Category:fadi mohem|Category:Fadi Mohem|Category:FADI
MOHEM|…`. Tested on 10 real candidates it expands to 36 titles, stays inside the 50-title
anonymous limit, costs 3.6 KB, and resolved 9 of 10. It works, but it is guesswork: it triples
the payload, and it silently fails on any spelling we did not guess (`Category:ASA 808` is only
found because we happened to try the all-caps variant).

### Summary: what already works and what does not

To be clear about how small the actual gap is – everything we want from the API is available
today **except one thing**:

| What we need | Available today? | How |
| --- | --- | --- |
| Type (Artist / Podcast / Venue / …) | ✅ | `prop=categories` – the type is always a direct parent |
| Mix count per category | ✅ | `prop=categoryinfo` – **same call**, no extra cost |
| Canonical wiki spelling | ✅ | the found page's `title` |
| Category redirects resolved | ✅ | `redirects=1` (`Dekmantel` → `Dekmantel Festival`) |
| Both `fabric` and `Fabric` returned separately | ✅ | ask both casings explicitly |
| Recent mix titles of a category (section 6) | ✅ | `list=categorymembers` – but one category per call |
| Match `Autonomic` → `Autonomic (Show)` | ⚠️ | `list=prefixsearch` finds it, but one name per call |
| **Case-insensitive lookup of N names in ONE call** | ❌ | **no route exists** |

So what we are asking for is essentially today's `prop=categories|categoryinfo` batch call with a
**case-insensitive title index in front of it**. That is the whole delta – the length of this
document is context, not scope.

## 4. What we would like added

One module, e.g. `action=mdbnames`:

```
GET /w/api.php
    ?action=mdbnames
    &format=json
    &names=Fadi Mohem|HATE Podcast|trommel|fabric|Autonomic
```

- `names` – pipe-separated, same convention as `titles`. **A limit of 10 is enough**; please cap
  it there rather than higher. Measured over the 47 player titles in our test set, our candidate
  rules produce a median of 3 names and a maximum of 8 – a title that wanted more than 10 would
  mean our own parse went wrong, and we would rather find out through an error than have you
  serve the mistake.
- Namespace is fixed to 14 (Category); no parameter needed.

Response:

```json
{
  "mdbnames": {
    "Fadi Mohem":   [ { "title": "Fadi Mohem",   "type": "artist",  "mixes": 15,  "exactCase": false } ],
    "HATE Podcast": [ { "title": "HATE Podcast", "type": "podcast", "mixes": 498, "exactCase": true,
                        "recent": [ "2026-08-02 - Kameliia - HATE Podcast 498",
                                    "2026-07-26 - Paula Koski - HATE Podcast 497",
                                    "2026-07-19 - Fadi Mohem - HATE Podcast 496" ] } ],
    "trommel":      [ { "title": "Trommel",      "type": "podcast", "mixes": 29,  "exactCase": false,
                        "recent": [ "2025-12-12 - Idriss D - Trommel.234",
                                    "2025-10-31 - Cinthie - Trommel.231",
                                    "2025-10-17 - OCB - Trommel.230" ] } ],
    "fabric":       [ { "title": "fabric",       "type": "venue",   "mixes": 395, "exactCase": true  },
                      { "title": "Fabric",       "type": "artist",  "mixes": 2,   "exactCase": false } ],
    "Autonomic":    []
  }
}
```

Per field:

- **`title`** – the canonical category title, in the wiki's own spelling. We use this verbatim in
  the suggested page title, so `trommel` in a SoundCloud title becomes `Trommel` in the
  suggestion. Today we only learn this when we happen to guess the right casing, and otherwise
  fall back to guessing capitalisation with a heuristic – the wiki simply knows.
- **`type`** – one of `artist`, `podcast`, `show`, `venue`, `event`, `radio`, `internetradio`,
  `recordlabel`. Derived from the direct parent categories in section 2.
- **`mixes`** – the category's page count (what `prop=categoryinfo` returns). See section 5 for
  why we need it.
- **`exactCase`** – `true` when the input matched the canonical title byte-for-byte.
- **`recent`** – *optional, see section 6.* The titles of the N most recently added mix pages
  (ns 0) in that category, newest first, for non-artist types only. This is the one field that is
  a genuine addition rather than a rearrangement of what `prop=categories` already returns, and
  the one we would understand being dropped – we can fetch it ourselves at one extra call per
  entity.

**Returning *all* matches per name, rather than picking one, is the important part.** `fabric`
(the London club, a Venue) and `Fabric` (an Artist) are different entities that only case tells
apart, and which one is meant depends on the rest of the player title – context that lives on
our side. Please do not collapse them.

An empty array means "MixesDB has no usable category of that name", which is a perfectly good
answer for us.

## 5. Matching semantics we are asking for

1. **Case-insensitive** match on the full title. This is the whole point of the request.
2. **Ignore a trailing disambiguation qualifier.** `Category:Autonomic (Show)` is the real
   category with 20 mixes, while `Category:Autonomic` exists empty with no parents. A player
   title says "Autonomic", never "Autonomic (Show)", so a name should also match a category whose
   title is `<name> (<anything>)`. If that turns out to be expensive or ambiguous, we can live
   without it – everything else matters more.
3. **Follow category redirects** and report the target. `redirects=1` already does this on
   `prop=categories` (`Category:Dekmantel` → `Category:Dekmantel Festival`), so hopefully it is
   free here too.
4. **Skip categories with no type**, i.e. return no entry rather than one with a null type.
   `Category:Truancy Volume` (0 mixes, no parents) currently comes back from `prop=categories` as
   a page that exists, which reads to us as a confirmed hit and actively misleads the parser.
   Nice-to-have: we can also filter these out ourselves if `type` is absent.
5. Whitespace collapsed and trimmed; diacritic folding is welcome but not required.

**Why `mixes` matters.** With 57,462 artist categories, almost every common word is a legitimate
artist on MixesDB, and a fragment of a real name will often resolve to the wrong thing:

```
Daniel  → Artist, 1 mix        vs   Daniel Bortz → Artist, 71 mixes
Asa     → Artist, 1 mix        vs   ASA 808      → Artist,  9 mixes
Truancy → Artist, 1 mix        vs   HATE Podcast → Podcast, 498 mixes
Black   → Venue,  1 mix
Mitch   → Artist, 1 mix
```

The page count is not decisive on its own – `Leon` is a real artist with 69 mixes and still the
wrong reading of "Leon Row x Shimon", which is why we prefer the longest match first. But it is
what separates a real hit from a near-empty coincidence in everything else, and it feeds the
confidence score we show under the suggestion.

To be clear, this one costs you nothing new: `prop=categories|categoryinfo` already returns the
type and the count together in a single call today. We are only asking that the new endpoint keep
doing so.

## 6. The `recent` field: letting existing pages dictate the format

Once a name resolves to a **non-artist** category, MixesDB already contains the answer to the
hardest remaining question – *how is a mix page in this series actually named?* We would like to
read the last few page titles in that category and copy their format instead of guessing it.

We can do this today with one extra call per entity:

```
list=categorymembers & cmtitle=Category:Trommel & cmnamespace=0
                     & cmsort=timestamp & cmdir=desc & cmlimit=8
```

`cmnamespace=0` is important – without it the response is half `File:` pages. Eight titles cost
790 bytes. The reason we mention it here at all is that `cmtitle` takes exactly **one** category
per call, so folding these titles into the `mdbnames` response as `recent` would keep the whole
lookup at a single request.

Why it is worth it – every one of these is something our parser currently has to guess, and gets
wrong often enough to be reported:

| Category | Recent page titles | What it settles |
| --- | --- | --- |
| `HATE Podcast` | `2026-08-02 - Kameliia - HATE Podcast 498` | plain number, no padding |
| `Zenaari Mix` | `2026-06-04 - Chris SSG - Zenaari Mix 025` | zero-padded to 3 digits |
| `Trommel` | `2025-12-12 - Idriss D - Trommel.234` | `.` separator **and** padding **and** the capital `T` |
| `RA Podcast` | `2026-08-07 - Mietze Conte - RA Podcast (RA.1051)` | a format no heuristic would ever invent |
| `Essential Mix` | `2026-08-08 - Max Styler - Essential Mix` | no episode number at all |
| `Ritter Butzke` | `2025-09-27 - audiosport @ SommerSafari, Ritter Butzke, Berlin` | the city, for free |
| `Landjuweel Festival` | `2018-07-24 - Palo Santo b2b Jorge Madera @ Landjuweel Festival, Amsterdam` | the city, for free |

The city is a genuine bonus we had not expected: for a venue or an event we currently take it
from whatever chunk of the player title sits behind the place, which is frequently just absent.
Sibling pages have it every time.

**Recent, not all** – deliberately. `Category:Slave To The Rhythm` shows why:

```
2025-07-05 - Joe T. Vannelli - Slave To The Rhythm 716      ← recent
2013-03-02 - Joe T Vannelli - Slave To The Rhythm Ep.393    ← older, different format
```

The naming convention changed over the years, so the newest handful is the reliable sample and a
full listing would actively mislead. `cmlimit=5`–`10` is the right size; there is no need for
pagination and we would never ask for more.

## 7. What stays on our side

So there is no doubt about the boundary: we are **not** asking you to parse titles. Candidate
generation (splitting the player title, stripping trailing episode numbers, handling `@`, `x`,
`w/`, `presents`), inferring the format from the `recent` titles, ranking the answers, and
assembling the final page title all stay in the userscript, where the test suite for it lives.
The endpoint stays a pure name → type lookup that happens to hand us a few sample titles.

## 8. Load

Roughly 10 userscript users, one call per opened track page, cached for the life of the page.
We currently make **1** request per track. With `recent` included we stay at 1; without it we
go to 2–3 (one lookup, plus one `categorymembers` call per matched non-artist entity, of which
there is normally one). Happy to add a `User-Agent`/`maxage` or anything else that makes this
easier to see and rate-limit on your side.

## 9. Implementation notes, offered from the outside

You know the install and we do not – everything here is an observation from the public API, not a
recommendation about your code. It is written down only because the shape of the ask is easy to
overestimate.

**Nothing existing has to change.** This is a new `action=` module on the same `api.php`, next to
`query` and `parse` – not a new endpoint, not a new service, and not a modification of an
existing module. Same URL, same CORS, auth, rate limiting and caching. `action=query` keeps
behaving exactly as it does today, so no existing consumer can be affected by it. In practice one
`ApiBase` subclass and a registration line:

```json
"APIModules": { "mdbnames": "MediaWiki\\Extension\\MixesDB\\ApiMdbNames" }
```

dropped into an existing MixesDB extension if there is one.

**The case-insensitive match is the only part with a real decision in it.** `page_title` is
compared as binary, so a plain `WHERE LOWER(page_title) IN (…)` cannot use an index and would
scan – which is presumably why nothing in the core API offers this.

The observation that may save the work: **`list=prefixsearch` on this wiki already matches
case-insensitively.** `pssearch=daniel bortz` returns `Category:Daniel Bortz`, and
`pssearch=trommel` returns `Category:Trommel`, on a wiki whose `siteinfo` reports
`case-sensitive`. So an indexed case-folded lookup already exists somewhere in the stack. If that
path can be called in-process once per name – at most 10, filtered afterwards to exact
case-insensitive equality, since prefix search also returns longer titles – then the module is
mostly a join onto the category and `categoryinfo` data you already return, with no new index and
no new table.

For what it is worth, that path is case-insensitive but **not** typo-tolerant (`danel bortz`
returns nothing), which reads more like a plain prefix strategy than a completion suggester –
but you will know which of the two it actually is.

## 10. If this is not possible

We will ship the casing-variant workaround from section 3 and fetch the section 6 titles with
plain `categorymembers` calls. That lands at 2–3 requests per track and works well enough, so
nothing is blocked – the custom endpoint is simply the correct version of it, without the casing
guesswork and at one request instead of three.

Anything in sections 4 to 6 can be dropped or renamed to suit how MixesDB is actually built, and
section 9 ignored entirely if it is off the mark.
**Case-insensitive matching is the one thing we cannot build ourselves**, and the canonical
spelling is the one that most improves the result. The `recent` titles are a convenience – very
valuable to us, but we can get them without you.
