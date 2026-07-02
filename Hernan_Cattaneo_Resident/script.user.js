// ==UserScript==
// @name         Hernan Cattaneo Resident (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.07.02.7
// @description  Add MixesDB creation links to Hernan Cattaneo Resident podcast episodes.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Hernan_Cattaneo_Resident/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Hernan_Cattaneo_Resident/script.user.js
// @include      https://podcast.hernancattaneo.com*
// @include      https://www.mixesdb.com/w/index.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hernancattaneo.com
// @noframes
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const mixesdbApiUrl = 'https://www.mixesdb.com/w/api.php';
    const tracklistApiUrl = 'https://www.mixesdb.com/tools/api/api.php';
    const residentCategory = 'Category:Resident_(Show)';
    const sourceHost = 'podcast.hernancattaneo.com';
    const mixesdbHost = 'www.mixesdb.com';
    let existingEpisodes = new Set();
    const debugFilter = '[MixesDB userscript]';
    const monthNumbers = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', sept: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12',
    };

    const padEpisode = episodeNumber => String(episodeNumber).padStart(3, '0');

    function log(text) {
        console.log(`${debugFilter}: ${text}`);
    }

    function logVar(variable, string) {
        if (string !== null && string !== undefined && string !== '') {
            log(`${variable}: ${string}`);
        } else {
            log(`${variable} empty`);
        }
    }

    function parseEpisodeTitle(title) {
        const match = title.match(/Resident\s*\/\s*Episode\s*(\d+)\s*\/\s*([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/i);
        if (!match) return null;

        const episodeNumber = Number(match[1]);
        const month = monthNumbers[match[2].toLowerCase()];
        if (!month || !episodeNumber) return null;

        return {
            episodeNumber,
            date: `${match[4]}-${month}-${String(match[3]).padStart(2, '0')}`,
            year: match[4],
        };
    }

    function buildMixesdbTitle(episode) {
        return `${episode.date} - Hernan Cattaneo - Resident ${padEpisode(episode.episodeNumber)}, Delta FM`;
    }

    function logExistingEpisodes() {
        logVar('Existing Hernan Cattaneo Resident MixesDB episodes', Array.from(existingEpisodes).sort((a, b) => a - b).join(', '));
    }

    async function fetchExistingEpisodes(cmcontinue = '') {
        const url = new URL(mixesdbApiUrl);
        url.searchParams.set('action', 'query');
        url.searchParams.set('list', 'categorymembers');
        url.searchParams.set('cmtitle', residentCategory);
        url.searchParams.set('cmlimit', '500');
        url.searchParams.set('format', 'json');
        url.searchParams.set('origin', '*');

        if (cmcontinue) {
            url.searchParams.set('cmcontinue', cmcontinue);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`MixesDB API responded with ${response.status}`);
        }

        const data = await response.json();
        const episodeNumbers = data.query.categorymembers
            .map(page => page.title.match(/Resident\s+(\d{3})\b/i))
            .filter(Boolean)
            .map(match => Number(match[1]));

        const nextContinue = data.continue && data.continue.cmcontinue;
        if (!nextContinue) return episodeNumbers;

        return episodeNumbers.concat(await fetchExistingEpisodes(nextContinue));
    }

    function normalizeTracklistLine(line) {
        return line
            .replace(/^\s*\d+\s*-\s*/, '')
            .replace(/\s+/g, ' ')
            .replace(/\s*\/\s*$/, '')
            .trim();
    }

    function getNodeTextWithLinebreaks(node) {
        return Array.from(node.childNodes)
            .map(child => {
                if (child.nodeName === 'BR') return '\n';
                if (child.nodeType === Node.TEXT_NODE) return child.textContent;
                return getNodeTextWithLinebreaks(child);
            })
            .join('');
    }

    function getFirstDescriptionParagraph(description) {
        const firstChildParagraph = Array.from(description.children)
            .find(child => child.matches('p'));
        if (firstChildParagraph) return firstChildParagraph;

        const browserParsedFirstParagraph = description.matches('p.e-description')
            && !getNodeTextWithLinebreaks(description).trim()
            && description.nextElementSibling
            && description.nextElementSibling.matches('p')
            ? description.nextElementSibling
            : null;
        return browserParsedFirstParagraph || null;
    }

    function extractRawTracklist(wrapper) {
        const description = wrapper.querySelector('p.e-description, .episode-description > p');
        if (!description) return '';

        const source = getFirstDescriptionParagraph(description) || description;
        return getNodeTextWithLinebreaks(source)
            .split('\n')
            .map(normalizeTracklistLine)
            .filter(Boolean)
            .join('\n');
    }

    function hasTracklistForApi(rawTracklist) {
        return rawTracklist.split('\n').filter(Boolean).length > 1;
    }

    function getFeedbackTracklistStatus(feedback) {
        if (!feedback) return 'incomplete';
        if (feedback.warnings > 0 || feedback.hints > 0 || feedback.status === 'incomplete') return 'incomplete';
        return 'complete';
    }

    function extractPlayerUrl(wrapper) {
        const player = wrapper.querySelector('a[href*=".mp3"], audio[src*=".mp3"], audio source[src*=".mp3"]');
        return player ? (player.href || player.src || '') : '';
    }

    async function formatTracklist(rawTracklist) {
        if (!rawTracklist || !hasTracklistForApi(rawTracklist)) {
            return { text: '<list>\n\n</list>', status: 'none' };
        }

        logVar('Tracklist before Tracklist Editor API:\n', rawTracklist);

        const body = new URLSearchParams({
            query: 'tracklistEditor',
            type: 'standard',
            text: rawTracklist,
        });

        const response = await fetch(tracklistApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body,
        });

        if (!response.ok) {
            throw new Error(`MixesDB Tracklist API responded with ${response.status}`);
        }

        const data = await response.json();
        const formattedTracklist = data.text || rawTracklist.split('\n').map(line => `# ${line}`).join('\n');
        logVar('Tracklist after Tracklist Editor API:\n', formattedTracklist);
        return { text: formattedTracklist, status: getFeedbackTracklistStatus(data.feedback) };
    }

    function buildPlayerText(playerUrl) {
        return playerUrl ? `\n\n{{Player\n |${playerUrl}\n}}` : '';
    }

    function buildMixPageText(episode, tracklistResult, playerUrl = '') {
        return `== File details ==\n\n{{StandardShow1h}}${buildPlayerText(playerUrl)}\n\n== Tracklist ==\n\n${tracklistResult.text}\n\n[[Category:${episode.year}]]\n[[Category:Hernan Cattaneo]]\n[[Category:Resident (Show)]]\n[[Category:Progressive House]]\n[[Category:Tracklist: ${tracklistResult.status}]]`;
    }

    function buildMixesdbUrl(title, episodeUrl, insertText = '') {
        const url = new URL('https://www.mixesdb.com/w/index.php');
        url.searchParams.set('title', title);

        if (insertText) {
            url.searchParams.set('action', 'edit');
            url.searchParams.set('redlink', '1');
            url.searchParams.set('insertText', insertText);
            url.searchParams.set('summary', `Create page from ${episodeUrl}`);
        }

        return url.toString();
    }

    function setLinkPending(link, episode) {
        link.className = 'mdb-resident-link is-pending';
        link.removeAttribute('href');
        link.textContent = `Preparing MixesDB copy link: ${padEpisode(episode.episodeNumber)}`;
    }

    async function updateMixesdbLink(link, episode, wrapper) {
        const isExisting = existingEpisodes.has(episode.episodeNumber);
        const title = buildMixesdbTitle(episode);
        const episodeUrl = link.dataset.episodeUrl || location.href;

        link.className = `mdb-resident-link ${isExisting ? 'is-existing' : 'is-missing'}`;
        link.title = title;

        if (isExisting) {
            link.href = buildMixesdbUrl(title, episodeUrl);
            link.textContent = 'See on MixesDB';
            return;
        }

        setLinkPending(link, episode);
        try {
            const tracklist = await formatTracklist(extractRawTracklist(wrapper));
            link.href = buildMixesdbUrl(title, episodeUrl, buildMixPageText(episode, tracklist, extractPlayerUrl(wrapper)));
            link.className = 'mdb-resident-link is-missing';
            link.textContent = 'Copy to MixesDB';
        } catch (error) {
            logVar('Failed to format Resident tracklist for MixesDB', error.message || error);
            const rawTracklist = extractRawTracklist(wrapper);
            const fallbackTracklist = hasTracklistForApi(rawTracklist)
                ? rawTracklist.split('\n').filter(Boolean).map(line => `# ${line}`).join('\n')
                : '<list>\n\n</list>';
            const fallbackStatus = hasTracklistForApi(rawTracklist) ? 'incomplete' : 'none';
            link.href = buildMixesdbUrl(title, episodeUrl, buildMixPageText(episode, { text: fallbackTracklist, status: fallbackStatus }, extractPlayerUrl(wrapper)));
            link.className = 'mdb-resident-link is-missing';
            link.textContent = 'Copy to MixesDB';
        }
    }

    function createMixesdbLink(heading, episode, wrapper) {
        const episodeLink = heading.querySelector('a') || heading.closest('a');
        const link = document.createElement('a');

        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.dataset.episodeNumber = String(episode.episodeNumber);
        link.dataset.episodeUrl = episodeLink ? episodeLink.href : location.href;
        updateMixesdbLink(link, episode, wrapper);

        return link;
    }

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mdb-resident-link {
                display: inline-block;
                margin: 0.35em 0 0.75em;
                padding: 0.25em 0.6em;
                border-radius: 4px;
                font-size: 0.85rem;
                font-weight: 700;
                line-height: 1.4;
                text-decoration: none;
            }
            .mdb-resident-link.is-existing {
                background: #2ea70060;
                color: #fff !important;
                border: 1px solid #4d9f4d;
            }
            .mdb-resident-link.is-missing,
            .mdb-resident-link.is-pending {
                background: #ff660050;
                border: 1px solid #f60;
                color: #ffffff !important;
            }
        `;
        document.head.appendChild(style);
    }

    function addEpisodeLinks() {
        document.querySelectorAll('.container.list-container .list').forEach(wrapper => {
            const heading = wrapper.querySelector('h2.card-title.e-title');
            if (!heading || heading.dataset.mdbResidentProcessed === 'true') return;

            const episode = parseEpisodeTitle(heading.textContent.trim());
            if (!episode) return;

            heading.dataset.mdbResidentProcessed = 'true';
            heading.insertAdjacentElement('afterend', createMixesdbLink(heading, episode, wrapper));
        });
    }

    function startEpisodeObserver() {
        const observer = new MutationObserver(addEpisodeLinks);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function insertMixesdbTextFromUrl() {
        const params = new URLSearchParams(location.search);
        const action = params.get('action');
        const insertText = params.get('insertText');
        if (!insertText || (action !== 'edit' && action !== 'submit')) return;

        const insertTextWhenReady = () => {
            const textbox = document.querySelector('textarea#wpTextbox1');
            if (!textbox) return false;
            textbox.value = insertText;
            textbox.dispatchEvent(new Event('input', { bubbles: true }));
            textbox.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        };

        if (insertTextWhenReady()) return;

        const observer = new MutationObserver(() => {
            if (insertTextWhenReady()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (location.hostname === mixesdbHost) {
        insertMixesdbTextFromUrl();
        return;
    }

    if (location.hostname !== sourceHost) return;

    addStyles();
    fetchExistingEpisodes()
        .then(episodeNumbers => {
            existingEpisodes = new Set(episodeNumbers);
            logExistingEpisodes();
            addEpisodeLinks();
            startEpisodeObserver();
        })
        .catch(error => {
            logVar('Failed to load existing Resident episodes from MixesDB', error.message || error);
            logExistingEpisodes();
            addEpisodeLinks();
            startEpisodeObserver();
        });
}());
