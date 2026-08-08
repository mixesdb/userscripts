# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Purpose
Userscripts that help contributors of the mixesdb.com (MixesDB) Wiki.

## Structure
- `<script-name-with-underscores>/` - one .user.js file per userscript, named `script.user.js`
- No shared build system; each script must work standalone when copy-pasted into a userscript manager
- Each script can has own script.css files in the same folder
- Each script can use include files for shared code, e.g. /includes/global.js. 
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

## Code Style
- Indentation: 4 spaces
- Comments: English, explain *why* not just *what*
- Prefer plain JS, but do not change existing jQuery code
- Wrap script body in an IIFE: `(function() { ... })();` right after `// ==/UserScript==`, closed at end of file. No `'use strict'` — too risky to audit every implicit global across this much legacy jQuery code; a silent bug would become a hard `ReferenceError`.
- If the script declares `scriptName`, add `window.scriptName = scriptName;` right after — `includes/toolkit.js` reads `scriptName` as a plain (non-`typeof`-guarded) global, so it must survive the IIFE.
- Use the log()/logVar()/logFunc() helpers from global.js and a `DEBUG` flag if logging is needed during development

## Testing / Verification
- No automated test suite. Manual verification steps:
  1. Load script in Tampermonkey (dev mode / local file URL)
  2. Confirm `@match` triggers only on intended pages
  3. Check browser console for errors on page load

## Common Tasks
- Adding a new script: create `scripts/<name>.user.js`, follow header template above, add entry to README.md table
- Updating a script: bump `@version`, note change in a `## Changelog` comment block at bottom of file if non-trivial
- Renaming/moving a script: update `@namespace`/`@updateURL`/`@downloadURL` if present, since users' managers track updates by these

## Things to Avoid
- Don't bundle multiple unrelated scripts into one file
- Don't use broad `@match` patterns that could break other sites
- Don't add remote `@require`/`@resource` from untrusted or unpinned sources
- Don't commit personal API keys or tokens into script files
- When solving problems on a certain userscript: When you change non-functional things like logging in shared scripts like global.js: Avoid version bumps for other userscripts (it has no effect on them when they still load the old global.js version from cache).

## Docs
@docs/**