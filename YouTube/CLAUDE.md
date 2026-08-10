# CLAUDE.md

Script name alias in prompts: `YT`

## Essential: Trusted Types / TrustedHTML

youtube.com sends `require-trusted-types-for 'script'`. Under that header **every** assignment
to `innerHTML` throws instead of writing markup:

```
TypeError: Element.innerHTML setter: Sink type mismatch violation blocked by CSP   (Firefox)
Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML'
assignment.                                                                        (Chrome)
```

This is not a "one feature does not appear" problem, it takes down **the entire userscript**:
jQuery 3.7.1 assigns `innerHTML` while it is still being parsed (feature detection runs
`div.innerHTML = "<textarea>x</textarea>"`, line 2 col ~35152 of the minified file). The
userscript manager wraps the whole concatenated script in an async function, so that throw
surfaces only as an `Uncaught (in promise)` naming jQuery - and silently drops every `@require`
after jQuery plus the site script itself. The page then looks exactly as if no userscript were
installed, with **not one line of ours in the console**, so the startup diagnostics in
`script.user.js` cannot report it either: they never run.

The fix is `includes/trustedTypes.js`, which installs a pass-through Trusted Types `default`
policy. Rules:

- It **must stay the first `@require`, ahead of `jquery-3.7.1.min.js`**. The policy has to
  exist before jQuery is parsed; loading it from `global.js` or the script body is too late.
- Its first console line is `[MixesDB userscript]: Trusted Types: ...`. On a youtube.com page
  it must read `default policy installed - innerHTML works, jQuery will load`. If that line is
  missing entirely, the script was never injected. If it says `innerHTML IS STILL BLOCKED`,
  nothing below that `@require` is running and nothing else in the log is worth reading.
- It works because YouTube sends no `trusted-types` directive restricting policy names. If
  Google ever adds one, `createPolicy` fails and the whole approach needs replacing - the log
  line above says so explicitly rather than leaving another silent dead script.
- Only `createHTML` is defined in the policy. Never add `createScript`/`createScriptURL`.

Applies to **Chrome as well as Firefox** - Trusted Types is a Chrome-first feature, so any
Chromium-based userscript host hits this first and harder.

Belt and braces for our own new code: build DOM nodes (`createElement`/`textContent`/
`appendChild`) instead of HTML strings where it is cheap to do so - `loadRawCss` and
`addTidPlaylistSubmitLink` in `global.js` already do. Those paths keep working even if the
policy cannot be installed. Existing jQuery HTML-string code is fine as long as the policy is
in place; do not rewrite it wholesale.

## Testing / Verification
`includes/trustedTypes.js` is loaded from `raw.githubusercontent.com/.../main/`, so it has to be
pushed **before** re-saving the userscript in the manager - otherwise that `@require` 404s.
