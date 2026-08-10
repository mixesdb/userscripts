# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Purpose
Userscripts that help contributors of the mixesdb.com (MixesDB) Wiki.

## Structure
- `<script-name-with-underscores>/` - one .user.js file per userscript, named `script.user.js`
- No shared build system; each script must work standalone when copy-pasted into a userscript manager
- Each script can has own script.css files in the same folder
- Each script can use include files for shared code, e.g. /includes/global.js. 
- Shared code that is a whole feature rather than a helper gets its own subfolder under
  `/includes/`, with its own CSS and its own CLAUDE.md - see `/includes/page_creator/`
- If an includes script changes, update the version number in its @require URL of each userscript (and the @version of each userscript)

## Userscript Header Conventions
Every script must start with a complete `==UserScript==` metadata block:
- `@name` - short, descriptive, in English
- `@namespace` - use `https://github.com/<user>/<repo>`
- `@version` - YYYY.MM.DD.N, bump on every functional change. `N` starts at `1` on each new calendar date (not a running total across dates) and increments for further changes that same date - so the first change on a new day is `.1`, not a continuation of the previous day's last `N`. At the end of a task, always tell me which version you bumped to.
- `@description` - one line, English
- `@match` / `@include` - as narrow as possible, never `*://*/*` unless truly required
- `@require` - Update version paramters in other script URLs of they got changes
- `@grant` - list only what's actually used, default to `none` if no GM_* API is needed
- `@author` - keep consistent across scripts

## Links We Add
- Open in the **same tab by default** - leave the new-tab decision to the user (cmd/ctrl/middle-click). Don't reach for `target="_blank"` just because a link leads off-site.
- Always set an **explicit `target`** on generated links, and default it to `_top`, not `_self`/nothing. Some pages render our HTML inside a nested browsing context (e.g. SoundCloud's `iframe#__WEBI_IFRAME_PRELOADED__` since the ~Aug 2026 redesign), where a target-less link replaces the frame instead of the page: the address bar keeps the old URL, the page can't be bookmarked or shared, and once that frame goes cross-origin the userscript loses access to it. `_top` leaves the frame while staying in the same tab, and is identical to `_self` on unframed pages, so it is always safe.
- `target="_blank"` only where the user is expected to keep working on the source page while the link is open (e.g. the toolkit's EDIT/HIST links).

## Code Style
- Indentation: 4 spaces
- Comments: English, explain *why* not just *what*
- Prefer plain JS, but do not change existing jQuery code
- Wrap script body in an IIFE: `(function() { ... })();` right after `// ==/UserScript==`, closed at end of file. No `'use strict'` — too risky to audit every implicit global across this much legacy jQuery code; a silent bug would become a hard `ReferenceError`.
- If the script declares `scriptName`, add `window.scriptName = scriptName;` right after — `includes/toolkit.js` reads `scriptName` as a plain (non-`typeof`-guarded) global, so it must survive the IIFE.
- Use the log()/logVar()/logFunc() helpers from global.js and a `DEBUG` flag if logging is needed during development

## Testing / Verification
- No automated test suite, with one exception: the MixesDB page creator's title suggestion has
  `includes/page_creator/title_examples.js` (reported titles + what they should produce) and a
  deno runner. See `includes/page_creator/CLAUDE.md`. Use deno, not node - node is not
  installed here.
- Manual verification steps:
  1. Load script in Tampermonkey (dev mode / local file URL)
  2. Confirm `@match` triggers only on intended pages
  3. Check browser console for errors on page load

## Common Tasks
- Adding a new script: create `scripts/<name>.user.js`, follow header template above, add entry to README.md table
- Updating a script: bump `@version`, note change in a `## Changelog` comment block at bottom of file if non-trivial
- Adding new features to a userscript or shared script: Log debugging diagnostics for crucial steps from the beginning not just when bugs occur
- Renaming/moving a script: update `@namespace`/`@updateURL`/`@downloadURL` if present, since users' managers track updates by these

## Things to Avoid
- Don't bundle multiple unrelated scripts into one file
- Don't use broad `@match` patterns that could break other sites
- Don't add remote `@require`/`@resource` from untrusted or unpinned sources
- Don't commit personal API keys or tokens into script files
- When solving problems on a certain userscript: When you change non-functional things like logging in shared scripts like global.js: Avoid version bumps for other userscripts (it has no effect on them when they still load the old global.js version from cache).

## Discord Summary
- Don't write one unprompted. I decide when a session is done and then type `/discord`, which returns the paste-ready summary of the whole session's fix (no headline). The format rules live in that skill, not here.

## Docs
@docs/**