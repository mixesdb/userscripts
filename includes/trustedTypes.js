/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Trusted Types guard
 *
 * MUST be the FIRST @require of a userscript, ahead of jquery-3.7.1.min.js. Nothing else in
 * this file matters as much as that ordering, so it gets its own file instead of living in
 * global.js.
 *
 * Why: YouTube sends "require-trusted-types-for 'script'", and Firefox enforces it since v135.
 * Under that header any assignment to innerHTML throws
 *   TypeError: Element.innerHTML setter: Sink type mismatch violation blocked by CSP
 * and jQuery 3.7.1 assigns innerHTML while it is still loading - its feature detection runs
 *   div.innerHTML = "<textarea>x</textarea>";
 * at parse time (line 2, col ~35152 of the minified file). So jQuery does not merely lose
 * .html()/.append(); it dies mid-file. The userscript manager wraps the whole concatenated
 * script in an async function, which turns that throw into an "Uncaught (in promise)" and
 * silently drops every @require after jQuery plus the site script itself. Symptom: the page
 * behaves as if no userscript were installed, with not one line of ours in the console - the
 * one failure mode our startup diagnostics could not report, because they never ran.
 *
 * A policy named "default" is the escape hatch the spec provides: once it exists, the browser
 * routes every string heading for a sink through it, so jQuery and all the existing jQuery
 * code work untouched. It is installable while the page sends no "trusted-types" directive
 * restricting policy names (YouTube sends none) and while nobody has claimed the name yet.
 *
 * Only createHTML is defined: that is the sink jQuery needs. Script and script-URL sinks stay
 * blocked exactly as they are without us, so this does not open a way to run new code.
 *
 * Nothing in here may throw - a failure here costs the whole userscript, which is the very
 * thing it exists to prevent.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

(function() {

    var status;

    function installDefaultPolicy() {
        if( typeof window.trustedTypes === "undefined" ) {
            return "not needed (this browser has no Trusted Types)";
        }

        if( window.trustedTypes.defaultPolicy ) {
            return "not installed (this page already has a default policy)";
        }

        window.trustedTypes.createPolicy( "default", {
            createHTML: function( html ) { return html; }
        });

        return "default policy installed";
    }

    /*
     * The one question that actually matters: can jQuery still be parsed on this page? Asked
     * directly rather than inferred, because "createPolicy() did not throw" and "innerHTML
     * works" are not the same claim - a default policy the page already owns may reject our
     * markup, and an isolated script world could hold a policy factory of its own.
     */
    function innerHtmlWorks() {
        try {
            document.createElement( "div" ).innerHTML = "<i></i>";
            return true;
        } catch( e ) {
            return false;
        }
    }

    try {
        status = installDefaultPolicy();
    } catch( e ) {
        status = "FAILED to install the default policy (" + e.message + ")";
    }

    status += innerHtmlWorks()
              ? " - innerHTML works, jQuery will load"
              : " - innerHTML IS STILL BLOCKED: jQuery cannot load on this page and nothing below this @require will run";

    // A plain global, not a var: toolkit.js-style, so the site script and global.js can read it
    // through the manager's function wrapper.
    window.getTrustedTypesStatus = function() {
        return status;
    };

    // console.log directly - global.js and its log() are loaded after this file by definition.
    // This is deliberately the very first line a userscript prints: when it is missing from a
    // page's console, the script was never injected at all.
    console.log( "[MixesDB userscript]: Trusted Types: " + status );

})();
