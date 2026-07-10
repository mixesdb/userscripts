/* global log, logVar */
(function () {
    'use strict';

    const mixesdbApiUrl = 'https://www.mixesdb.com/w/api.php';
    const tracklistApiUrl = 'https://www.mixesdb.com/tools/api/api.php';
    const mixesdbEditUrl = 'https://www.mixesdb.com/w/index.php';

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

    function padNumber(number, length = 3) {
        return String(number).padStart(length, '0');
    }

    function getMonthNumber(monthName) {
        return monthNumbers[String(monthName || '').toLowerCase()] || '';
    }

    function logMessage(message) {
        if (typeof log === 'function') log(message);
    }

    function logValue(label, value) {
        if (typeof logVar === 'function') logVar(label, value);
    }

    async function fetchExistingEpisodes({ categoryTitle, titleEpisodePattern, cmcontinue = '' }) {
        const url = new URL(mixesdbApiUrl);
        url.searchParams.set('action', 'query');
        url.searchParams.set('list', 'categorymembers');
        url.searchParams.set('cmtitle', categoryTitle);
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
            .map(page => page.title.match(titleEpisodePattern))
            .filter(Boolean)
            .map(match => Number(match[1]));

        const nextContinue = data.continue && data.continue.cmcontinue;
        if (!nextContinue) return episodeNumbers;

        return episodeNumbers.concat(await fetchExistingEpisodes({ categoryTitle, titleEpisodePattern, cmcontinue: nextContinue }));
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

    function hasTracklistForApi(rawTracklist, minimumLines = 4) {
        return rawTracklist.split('\n').filter(Boolean).length >= minimumLines;
    }

    function getFeedbackTracklistStatus(feedback) {
        if (!feedback) return 'incomplete';
        if (feedback.warnings > 0 || feedback.hints > 0 || feedback.status === 'incomplete') return 'incomplete';
        return 'complete';
    }

    async function formatTracklist(rawTracklist, apiType = 'standard') {
        if (!rawTracklist || !hasTracklistForApi(rawTracklist)) {
            return { text: '<list>\n\n</list>', status: 'none', feedback: null };
        }

        logMessage('Tracklist before Tracklist Editor API:\n' + rawTracklist);

        if (typeof apiTracklist === 'function') {
            const apiResult = apiTracklist(rawTracklist, apiType);
            const formattedTracklist = apiResult.text || rawTracklist.split('\n').map(line => `# ${line}`).join('\n');
            logMessage('Tracklist after Tracklist Editor API:\n' + formattedTracklist);
            return { text: formattedTracklist, status: getFeedbackTracklistStatus(apiResult.feedback), feedback: apiResult.feedback || null };
        }

        const body = new URLSearchParams({
            query: 'tracklistEditor',
            type: apiType,
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
        logMessage('Tracklist after Tracklist Editor API:\n' + formattedTracklist);
        return { text: formattedTracklist, status: getFeedbackTracklistStatus(data.feedback), feedback: data.feedback || null };
    }

    function buildPlayerText(playerUrl) {
        return playerUrl ? `\n\n{{Player\n |${playerUrl}\n}}` : '';
    }

    function buildMixPageText({ year, artist, showCategory, genres = [], tracklistResult, playerUrl = '' }) {
        const categories = [year, artist, showCategory, ...genres, `Tracklist: ${tracklistResult.status}`]
            .filter(Boolean)
            .map(category => `[[Category:${category}]]`)
            .join('\n');

        return `== File details ==\n\n{{StandardShow1h}}${buildPlayerText(playerUrl)}\n\n== Tracklist ==\n\n${tracklistResult.text}\n\n${categories}`;
    }

    function buildMixesdbUrl(title, episodeUrl, insertText = '') {
        const url = new URL(mixesdbEditUrl);
        url.searchParams.set('title', title);

        if (insertText) {
            url.searchParams.set('action', 'edit');
            url.searchParams.set('redlink', '1');
            url.searchParams.set('insertText', insertText);
            url.searchParams.set('summary', `Create page from ${episodeUrl}`);
        }

        return url.toString();
    }

    function resolveValue(value, fallback = '') {
        return typeof value === 'function' ? value() : (value || fallback);
    }

    function updateMixesdbCreateLinkOnClick(link, options = {}) {
        if (!link || link.dataset.mdbCreateLinkTextUpdater === '1') return;

        link.dataset.mdbCreateLinkTextUpdater = '1';
        link.addEventListener('click', () => {
            const title = resolveValue(options.title || options.getTitle);
            const episodeUrl = resolveValue(options.episodeUrl || options.getEpisodeUrl, location.href);
            const insertText = resolveValue(options.insertText || options.getInsertText);

            if (!title || !insertText) return;

            link.href = buildMixesdbUrl(title, episodeUrl, insertText);
        });
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

    window.MixesDBEpisodesImporter = {
        buildMixPageText,
        buildMixesdbUrl,
        fetchExistingEpisodes,
        formatTracklist,
        getMonthNumber,
        getNodeTextWithLinebreaks,
        hasTracklistForApi,
        insertMixesdbTextFromUrl,
        updateMixesdbCreateLinkOnClick,
        logValue,
        normalizeTracklistLine,
        padNumber,
    };
}());