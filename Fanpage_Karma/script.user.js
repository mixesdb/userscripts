// ==UserScript==
// @name         Fanpage Karma
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.07.20.1
// @description  Improve readability on app.fanpagekarma.com.
// @match        *://app.fanpagekarma.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=fanpagekarma.com
// @noframes
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

GM_addStyle( `
    .container-fluid.js-engage-parent .js-listview-card-container,
    .ticketDetails-subject-text,
    .ticketDetails-chat-text {
        font-size: 1.2em !important;
    }

    .listitem-row {
        height: inherit !important;
    }

    .listitem-reply-text.singleLine {
        white-space: inherit !important;
        line-height: 1.4em;
    }

    .listitem-contentPreview {
        max-height: inherit !important;
    }

    /* Container */
    .listview-card {
        border: 3px solid var(--accent-success-A500);
        border-radius: 0.5rem;
        margin-bottom: 15px;
    }

    .listview-card .listitem-checkbox-container {
        margin-bottom: 0;
    }

    /* Ausgangspost */
    .listitem-stackedHeader {
        opacity: 0.6;
    }

    /* DMs, Mentions */
    .listview-cardContainer:has(.listitem-ticketType.directMessage),
    .listview-cardContainer:has(.listitem-ticketType.mention) {
        opacity: 0.33;
    }

    .listitem-stackedHeader:hover,
    .listview-cardContainer:has(.listitem-ticketType.directMessage):hover,
    .listview-cardContainer:has(.listitem-ticketType.mention):hover {
        opacity: 1;
    }

    /* hover action icons */
    a.actionLike {
        display: none !important;
    }
` );
