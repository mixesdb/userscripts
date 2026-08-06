# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Purpose
Userscripts that help contributors of the mixesdb.com (MixesDB) Wiki.

## Structure
- `<script-name-with-underscores>/` - one .user.js file per userscript, named `script.user.js`
- No shared build system; each script must work standalone when copy-pasted into a userscript manager
- Each script can has own script.css files in the same folder
- Each script can use include files for shared code, e.g. /includes/global.js

## Userscript Header Conventions
Every script must start with a complete `==UserScript==` metadata block:
- `@name` - short, descriptive, in English
- `@namespace` - use `https://github.com/<user>/<repo>`
- `@version` - semver, bump on every functional change
- `@description` - one line, English
- `@match` / `@include` - as narrow as possible, never `*://*/*` unless truly required
- `@grant` - list only what's actually used, default to `none` if no GM_* API is needed
- `@author` - keep consistent across scripts

## Code Style
- Indentation: tabs (equivalent to 4 spaces)
- Comments: English, explain *why* not just *what*
- Prefer plain JS, but do not change existing jQuery code
- Wrap script body in an IIFE: `(function() { 'use strict'; ... })();`
- No console.log left in production code — use a `DEBUG` flag if logging is needed during development

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

## Docs
@docs/**