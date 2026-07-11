// ==UserScript==
// @name         Hernan Cattaneo Resident (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.07.11.1
// @description  Add MixesDB creation links to Hernan Cattaneo Resident podcast episodes.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/Episodes_Importer/Hernan_Cattaneo_Resident/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Episodes_Importer/Hernan_Cattaneo_Resident/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-Hernan_Cattaneo_Resident_19
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/Episodes_Importer/funcs.js?v-2026.07.10.19
// @include      https://podcast.hernancattaneo.com*
// @include      https://www.mixesdb.com/w/index.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hernancattaneo.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var cacheVersion = 20,
    scriptName = "Hernan_Cattaneo_Resident";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );


/* global fixTLbox */
(function () {
    'use strict';

    const importer = window.MixesDBEpisodesImporter;
    if (!importer) {
        console.error('MixesDBEpisodesImporter dependency is not available.');
        return;
    }
    const sourceHost = 'podcast.hernancattaneo.com';
    const mixesdbHost = 'www.mixesdb.com';
    const config = {
        categoryTitle: 'Category:Resident_(Show)',
        titleEpisodePattern: /Resident\s+(\d{3})\b/i,
        artist: 'Hernan Cattaneo',
        showCategory: 'Resident (Show)',
        genres: ['Progressive House'],
        storageKey: 'mdbResidentRemoveExistingEpisodes',
        visitedLinksStorageKey: 'mdbResidentVisitedEpisodeLinks',
        tleApiType: 'commaArtists',
        selectors: {
            listContainer: '.container.list-container',
            episodeWrapper: '.container.list-container .list',
            episodeHeading: 'h2.card-title.e-title',
            description: 'p.e-description, .episode-description > p',
            player: 'a[href*=".mp3"], audio[src*=".mp3"], audio source[src*=".mp3"]',
        },
        classNames: {
            link: 'mdb-resident-link',
            closeButton: 'mdb-resident-close-button',
            toggle: 'mdb-resident-remove-existing-toggle',
            hidden: 'mdb-resident-existing-episode-hidden',
            apiFeedback: 'mdb-resident-tle-feedback',
            apiTracklist: 'mdb-resident-tle-tracklist',
            copyWaiter: 'mdb-resident-copy-waiter',
        },
        manualExistingEpisodes: [
            714, 715, 716,
            659, 660, 661, 662, 663, 664, 610, 609, 608, 607, 600,
            346,
        ],
    };

    let existingEpisodes = new Set(config.manualExistingEpisodes);
    let visitedEpisodeLinks = new Set();
    let removeExistingEpisodes = false;

    function loadVisitedEpisodeLinks() {
        try {
            visitedEpisodeLinks = new Set(JSON.parse(localStorage.getItem(config.visitedLinksStorageKey) || '[]'));
        } catch (error) {
            visitedEpisodeLinks = new Set();
        }
    }

    function saveVisitedEpisodeLinks() {
        localStorage.setItem(config.visitedLinksStorageKey, JSON.stringify(Array.from(visitedEpisodeLinks)));
    }

    function setLinkVisitedState(link) {
        link.classList.toggle('is-visited', visitedEpisodeLinks.has(link.dataset.episodeNumber));
    }

    function markLinkVisited(link) {
        visitedEpisodeLinks.add(link.dataset.episodeNumber);
        saveVisitedEpisodeLinks();
        setLinkVisitedState(link);
    }

    function parseEpisodeTitle(title) {
        const slashTitleMatch = title.match(/Resident\s*\/\s*Episode\s*(\d+)\s*\/\s*([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/i);
        if (slashTitleMatch) {
            const episodeNumber = Number(slashTitleMatch[1]);
            const month = importer.getMonthNumber(slashTitleMatch[2]);
            if (!month || !episodeNumber) return null;

            return {
                episodeNumber,
                date: `${slashTitleMatch[4]}-${month}-${String(slashTitleMatch[3]).padStart(2, '0')}`,
                year: slashTitleMatch[4],
            };
        }

        const podcastTitleMatch = title.match(/^(\d+)\s+Hernan\s+Cattaneo\s+podcast\s+-\s+(\d{4})-(\d{2})-(\d{2})\b/i);
        if (podcastTitleMatch) {
            const episodeNumber = Number(podcastTitleMatch[1]);
            if (!episodeNumber) return null;

            return {
                episodeNumber,
                date: `${podcastTitleMatch[2]}-${podcastTitleMatch[3]}-${podcastTitleMatch[4]}`,
                year: podcastTitleMatch[2],
            };
        }

        return null;
    }

    function buildMixesdbTitle(episode) {
        return `${episode.date} - ${config.artist} - Resident ${importer.padNumber(episode.episodeNumber)}`;
    }

    function getFirstDescriptionParagraph(description) {
        const firstChildParagraph = Array.from(description.children)
            .find(child => child.matches('p'));
        if (firstChildParagraph) return firstChildParagraph;

        return description.matches('p.e-description')
            && !importer.getNodeTextWithLinebreaks(description).trim()
            && description.nextElementSibling
            && description.nextElementSibling.matches('p')
            ? description.nextElementSibling
            : null;
    }


    function getTracklistSourceNode(wrapper) {
        const description = wrapper.querySelector(config.selectors.description);
        if (!description) return null;
        return getFirstDescriptionParagraph(description) || description;
    }

    function fixRawTracklistLine(line) {
        return line.replace(/^(.*?\S\s+-\s+)ID$/i, '$1?');
    }

    function lowercaseTracklistLineArtist(line) {
        const artistTitleSeparator = /\s+-\s+/;
        const separatorMatch = line.match(artistTitleSeparator);
        if (!separatorMatch || separatorMatch.index === undefined) return line;

        const artist = line.slice(0, separatorMatch.index);
        const title = line.slice(separatorMatch.index + separatorMatch[0].length);
        if (!artist.trim() || !title.trim()) return line;

        return `${artist.toLowerCase()}${separatorMatch[0]}${title}`;
    }

    function renderTracklistApiFeedback(wrapper, tracklistResult, options = {}) {
        const source = getTracklistSourceNode(wrapper);
        if (!source) return;

        let editor = wrapper.querySelector(`.${config.classNames.apiFeedback}`);
        const tlApi = tracklistResult && tracklistResult.text;
        const feedback = tracklistResult && tracklistResult.feedback;

        if (!tlApi || !feedback) {
            editor?.remove();
            return;
        }

        if (!editor) {
            editor = document.createElement('div');
            editor.className = `tlEditor ${config.classNames.apiFeedback}`;
            editor.innerHTML = `<textarea id="mixesdb-TLbox" class="mixesdb-TLbox ${config.classNames.apiTracklist}"></textarea>`;
            source.insertAdjacentElement('afterend', editor);
        }

        editor.className = `tlEditor ${config.classNames.apiFeedback}`;
        editor.querySelectorAll('#tlEditor-feedback, #tlEditor-feedback-topInfo, #tlEditor-feedback-topInfo-noList').forEach(node => node.remove());
        editor.querySelector('textarea').value = tlApi;

        if (typeof fixTLbox === 'function') {
            const feedbackForDisplay = options.hideNoChangesFeedback
                ? getFeedbackWithoutNoChangesMessage(feedback)
                : feedback;
            fixTLbox(feedbackForDisplay, editor);
        }
    }

    function getFeedbackWithoutNoChangesMessage(feedback) {
        if (!feedback || !feedback.text || !feedback.text.includes('No changes were made.')) return feedback;

        return {
            ...feedback,
            text: feedback.text.replace(/<[^>]*>[^<]*No changes were made\.[\s\S]*?<\/[^>]+>/i, '').replace(/No changes were made\./g, '').trim(),
        };
    }

    function extractRawTracklist(wrapper) {
        const description = wrapper.querySelector(config.selectors.description);
        if (!description) return '';

        const source = getTracklistSourceNode(wrapper);
        return importer.getNodeTextWithLinebreaks(source)
            .split('\n')
            .map(importer.normalizeTracklistLine)
            .filter(Boolean)
            .map(fixRawTracklistLine)
            .map(lowercaseTracklistLineArtist)
            .join('\n');
    }

    function isValidPlayerUrl(playerUrl) {
        if (!playerUrl) return false;

        try {
            const url = new URL(playerUrl, location.href);
            const host = url.hostname.toLowerCase();
            return ['http:', 'https:'].includes(url.protocol)
                && url.pathname.toLowerCase().endsWith('.mp3')
                && host !== 'url-del-episodio.mp3';
        } catch (error) {
            return false;
        }
    }

    function getPlayerCandidateUrl(player) {
        return player.href
            || player.src
            || player.getAttribute('href')
            || player.getAttribute('src')
            || '';
    }

    function extractPlayerUrl(wrapper) {
        const players = Array.from(wrapper.querySelectorAll(config.selectors.player));
        const validPlayerUrl = players
            .map(getPlayerCandidateUrl)
            .find(isValidPlayerUrl);

        return validPlayerUrl ? new URL(validPlayerUrl, location.href).toString() : '';
    }

    function buildEpisodePageText(episode, tracklistResult, playerUrl = '') {
        return importer.buildMixPageText({
            year: episode.year,
            artist: config.artist,
            showCategory: config.showCategory,
            genres: config.genres,
            tracklistResult,
            playerUrl,
        });
    }

    function getEditorTracklist(wrapper, fallbackTracklist) {
        return wrapper.querySelector(`.${config.classNames.apiTracklist}`)?.value || fallbackTracklist;
    }

    function showCreateLinkWaiter(link) {
        const waiter = document.createElement('waiter');
        waiter.className = config.classNames.copyWaiter;
        waiter.textContent = '…';
        link.hidden = true;
        link.setAttribute('aria-busy', 'true');
        link.insertAdjacentElement('afterend', waiter);
        return waiter;
    }

    function hideCreateLinkWaiter(link, waiter) {
        waiter?.remove();
        link.hidden = false;
        link.removeAttribute('aria-busy');
    }

    function waitBeforeOpeningCreateLink() {
        return new Promise(resolve => setTimeout(resolve, 1200));
    }

    async function getTracklistForCreate(wrapper, fallbackTracklist, fallbackStatus) {
        const editorTracklist = getEditorTracklist(wrapper, fallbackTracklist);

        if (!editorTracklist || editorTracklist === fallbackTracklist) {
            return {
                tracklist: {
                    text: fallbackTracklist,
                    status: fallbackStatus,
                },
                refreshedFeedback: false,
            };
        }

        try {
            const updatedTracklist = await importer.formatTracklist(editorTracklist, config.tleApiType);
            renderTracklistApiFeedback(wrapper, updatedTracklist, { hideNoChangesFeedback: true });
            return {
                tracklist: updatedTracklist,
                refreshedFeedback: Boolean(updatedTracklist.feedback),
            };
        } catch (error) {
            importer.logValue('Failed to refresh Resident tracklist feedback for MixesDB', error.message || error);
            return {
                tracklist: {
                    text: editorTracklist,
                    status: fallbackStatus,
                },
                refreshedFeedback: false,
            };
        }
    }

    function setCreateLinkHref(link, title, episodeUrl, insertText) {
        link.href = importer.buildMixesdbUrl(title, episodeUrl, insertText);
    }

    function updateCreateLinkOnClick(link, title, episodeUrl, episode, wrapper, fallbackTracklist, fallbackStatus) {
        if (link.dataset.mdbResidentCreateLinkTextUpdater === '1') return;

        link.dataset.mdbResidentCreateLinkTextUpdater = '1';
        link.addEventListener('click', async event => {
            event.preventDefault();
            markLinkVisited(link);
            const waiter = showCreateLinkWaiter(link);
            try {
                const { tracklist, refreshedFeedback } = await getTracklistForCreate(wrapper, fallbackTracklist, fallbackStatus);
                const insertText = buildEpisodePageText(episode, tracklist, extractPlayerUrl(wrapper));
                setCreateLinkHref(link, title, episodeUrl, insertText);
                if (refreshedFeedback) {
                    await waitBeforeOpeningCreateLink();
                }
                window.open(link.href, link.target || '_blank', 'noopener,noreferrer');
            } finally {
                hideCreateLinkWaiter(link, waiter);
            }
        });
    }

    function setLinkPending(link, episode) {
        link.className = `${config.classNames.link} is-pending`;
        link.removeAttribute('href');
        link.textContent = `Checking episode ${importer.padNumber(episode.episodeNumber)}`;
    }

    function getDownloadLink(wrapper) {
        return Array.from(wrapper.querySelectorAll('a[href*=".mp3"]'))
            .find(link => isValidPlayerUrl(link.href || link.getAttribute('href')));
    }

    function getDedicatedCopyLinkParagraph(link) {
        const currentParagraph = link.closest('p');
        if (currentParagraph && currentParagraph.children.length === 1 && currentParagraph.textContent.trim() === link.textContent.trim()) {
            return currentParagraph;
        }

        const paragraph = document.createElement('p');
        paragraph.append(link);
        return paragraph;
    }

    function placeCopyLink(link, wrapper) {
        const apiFeedback = wrapper.querySelector(`.${config.classNames.apiFeedback}`);
        const downloadLink = getDownloadLink(wrapper);
        const paragraph = getDedicatedCopyLinkParagraph(link);

        if (apiFeedback) {
            apiFeedback.insertAdjacentElement('afterend', paragraph);
            return;
        }

        if (downloadLink) {
            const downloadParagraph = downloadLink.closest('p');
            (downloadParagraph || downloadLink).insertAdjacentElement('beforebegin', paragraph);
        }
    }

    async function updateMixesdbLink(link, episode, wrapper) {
        const isExisting = existingEpisodes.has(episode.episodeNumber);
        const title = buildMixesdbTitle(episode);
        const episodeUrl = link.dataset.episodeUrl || location.href;

        link.className = `${config.classNames.link} ${isExisting ? 'is-existing' : 'is-missing'}`;
        link.title = title;
        setLinkVisitedState(link);

        if (isExisting) {
            link.href = importer.buildMixesdbUrl(title, episodeUrl);
            link.textContent = 'See on MixesDB';
            return;
        }

        setLinkPending(link, episode);
        const rawTracklist = extractRawTracklist(wrapper);
        try {
            const tracklist = await importer.formatTracklist(rawTracklist, config.tleApiType);
            renderTracklistApiFeedback(wrapper, tracklist);
            setCreateLinkHref(link, title, episodeUrl, buildEpisodePageText(episode, tracklist, extractPlayerUrl(wrapper)));
            updateCreateLinkOnClick(link, title, episodeUrl, episode, wrapper, tracklist.text, tracklist.status);
        } catch (error) {
            importer.logValue('Failed to format Resident tracklist for MixesDB', error.message || error);
            const fallbackTracklist = importer.hasTracklistForApi(rawTracklist)
                ? rawTracklist.split('\n').filter(Boolean).map(line => `# ${line}`).join('\n')
                : '<list>\n\n</list>';
            const fallbackStatus = importer.hasTracklistForApi(rawTracklist) ? 'incomplete' : 'none';
            renderTracklistApiFeedback(wrapper, { feedback: null });
            setCreateLinkHref(link, title, episodeUrl, buildEpisodePageText(episode, { text: fallbackTracklist, status: fallbackStatus }, extractPlayerUrl(wrapper)));
            updateCreateLinkOnClick(link, title, episodeUrl, episode, wrapper, fallbackTracklist, fallbackStatus);
        }
        link.className = `${config.classNames.link} is-missing`;
        link.textContent = 'Copy to MixesDB';
        placeCopyLink(link, wrapper);
        setLinkVisitedState(link);
    }

    function setEpisodeVisibility(wrapper, episode) {
        wrapper.classList.toggle(config.classNames.hidden, removeExistingEpisodes && existingEpisodes.has(episode.episodeNumber));
    }

    function updateEpisodeVisibility() {
        document.querySelectorAll(`${config.selectors.episodeWrapper}[data-mdb-episode-number]`).forEach(wrapper => {
            setEpisodeVisibility(wrapper, { episodeNumber: Number(wrapper.dataset.mdbEpisodeNumber) });
        });
    }

    function createRemoveExistingToggle() {
        const toggleWrapper = document.createElement('label');
        toggleWrapper.className = config.classNames.toggle;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = removeExistingEpisodes;
        checkbox.addEventListener('change', () => {
            removeExistingEpisodes = checkbox.checked;
            localStorage.setItem(config.storageKey, removeExistingEpisodes ? 'true' : 'false');
            updateEpisodeVisibility();
        });

        toggleWrapper.append(checkbox, document.createTextNode('Hide episodes that exist on MixesDB'));
        return toggleWrapper;
    }

    function addRemoveExistingToggle() {
        if (document.querySelector(`.${config.classNames.toggle}`)) return;

        const listContainer = document.querySelector(config.selectors.listContainer) || document.body;
        listContainer.insertAdjacentElement('afterbegin', createRemoveExistingToggle());
    }

    function createMixesdbLink(heading, episode, wrapper) {
        const episodeLink = heading.querySelector('a') || heading.closest('a');
        const link = document.createElement('a');

        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.dataset.episodeNumber = String(episode.episodeNumber);
        link.dataset.episodeUrl = episodeLink ? episodeLink.href : location.href;
        link.addEventListener('click', () => markLinkVisited(link));
        updateMixesdbLink(link, episode, wrapper);

        return link;
    }

    function createEpisodeCloseButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = config.classNames.closeButton;
        button.setAttribute('aria-label', 'Hide this episode');
        button.title = 'Hide this episode';
        button.textContent = '×';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            button.closest('.list')?.remove();
        });
        return button;
    }

    function addEpisodeCloseButton(wrapper) {
        if (wrapper.querySelector(`:scope > .${config.classNames.closeButton}`)) return;
        wrapper.append(createEpisodeCloseButton());
    }

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            ${config.selectors.episodeWrapper}[data-mdb-episode-number] {
                position: relative;
            }
            .${config.classNames.closeButton} {
                align-items: center;
                background: #00000080;
                border: 1px solid #ffffff80;
                border-radius: 50%;
                color: #fff;
                cursor: pointer;
                display: flex;
                font-size: 1.25rem;
                font-weight: 700;
                height: 1.7rem;
                justify-content: center;
                line-height: 1;
                padding: 0;
                position: absolute;
                right: 0.6rem;
                top: 0.6rem;
                width: 1.7rem;
                z-index: 2;
            }
            .${config.classNames.closeButton}:hover,
            .${config.classNames.closeButton}:focus {
                background: #ff6600;
                border-color: #ff6600;
                outline: none;
            }
            .${config.classNames.link} {
                display: inline-block;
                margin: 0.25em 0 0.75em;
                padding: 0.25em 0.6em;
                border-radius: 4px;
                font-size: 0.85rem;
                font-weight: 700;
                line-height: 1.4;
                text-decoration: none;
            }
            .${config.classNames.link}.is-visited {
                opacity: .62 !important;
            }
            .${config.classNames.link}.is-existing {
                background: #2ea70060;
                color: #fff !important;
                border: 1px solid #4d9f4d;
            }
            .mdb-resident-tle-feedback + .${config.classNames.link} {
                margin-top: -0.75em;
            }
            .${config.classNames.toggle} {
                display: block;
                margin: 0 0 1rem;
                padding: 0.6em 0.8em;
                border: 1px solid #4d9f4d;
                border-radius: 4px;
                background: #2ea70030;
                color: #fff;
                font-size: 0.95rem;
                font-weight: 700;
                line-height: 1.4;
            }
            .${config.classNames.toggle} input {
                margin-right: 0.35em;
                vertical-align: middle;
            }
            .${config.classNames.hidden} {
                display: none !important;
            }
            .${config.classNames.link}.is-missing,
            .${config.classNames.link}.is-pending {
                background: #ff660050;
                border: 1px solid #f60;
                color: #ffffff !important;
            }

            .${config.classNames.apiFeedback} {
                margin: 0.6rem 0 1rem;
            }
            .${config.classNames.apiFeedback} .${config.classNames.apiTracklist} {
                box-sizing: border-box;
                min-height: 8rem;
                width: 100%;
            }
            .${config.classNames.copyWaiter} {
                display: inline-block;
                margin: 0.25em 0 0.75em 0.5em;
                padding: 0.25em 0.6em;
                color: #fff;
                font-size: 0.85rem;
                font-weight: 700;
                line-height: 1.4;
            }
            /* Hide donation banner block */
            .e-description table {
                display: none;
            }

            /* tracklist textarea */
            .tlEditor textarea {
                font-family: monospace;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    function removeDonationContent(wrapper) {
        const description = wrapper.querySelector('.episode-description');
        if (!description) return;

        const walker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
        let markerNode = null;
        while ((markerNode = walker.nextNode())) {
            if (/Help me support/i.test(markerNode.textContent)) break;
        }
        if (!markerNode) return;

        const firstDonationNode = markerNode.parentElement?.closest('p, a') || markerNode.parentElement;
        if (!firstDonationNode) return;

        let node = firstDonationNode;
        while (node) {
            const nextNode = node.nextSibling;
            node.remove();
            node = nextNode;
        }
    }

    function removeEmptyEpisodeParagraphs(wrapper) {
        wrapper.querySelectorAll('p').forEach(paragraph => {
            const text = paragraph.textContent.replace(/\u00a0/g, ' ').trim();
            if (!text && !paragraph.querySelector('img, audio, video, iframe, embed, object, input, textarea, select, button, a[href]')) {
                paragraph.remove();
            }
        });
    }

    function addEpisodeLinks() {
        document.querySelectorAll(config.selectors.episodeWrapper).forEach(wrapper => {
            removeDonationContent(wrapper);
            removeEmptyEpisodeParagraphs(wrapper);

            const heading = wrapper.querySelector(config.selectors.episodeHeading);
            if (!heading || heading.dataset.mdbImporterProcessed === 'true') return;

            const episode = parseEpisodeTitle(heading.textContent.trim());
            if (!episode) return;

            wrapper.dataset.mdbEpisodeNumber = String(episode.episodeNumber);
            addEpisodeCloseButton(wrapper);
            heading.dataset.mdbImporterProcessed = 'true';
            heading.insertAdjacentElement('afterend', createMixesdbLink(heading, episode, wrapper));
            setEpisodeVisibility(wrapper, episode);
        });
    }

    function startEpisodeObserver() {
        const observer = new MutationObserver(addEpisodeLinks);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function logExistingEpisodes() {
        importer.logValue(`Existing ${config.artist} ${config.showCategory} MixesDB episodes`, Array.from(existingEpisodes).sort((a, b) => a - b).join(', '));
    }

    if (location.hostname === mixesdbHost) {
        importer.insertMixesdbTextFromUrl();
        return;
    }

    if (location.hostname !== sourceHost) return;

    removeExistingEpisodes = localStorage.getItem(config.storageKey) === 'true';
    loadVisitedEpisodeLinks();
    addStyles();
    addRemoveExistingToggle();
    importer.fetchExistingEpisodes(config)
        .then(episodeNumbers => {
            existingEpisodes = new Set([...episodeNumbers, ...config.manualExistingEpisodes]);
            logExistingEpisodes();
            addRemoveExistingToggle();
            addEpisodeLinks();
            startEpisodeObserver();
        })
        .catch(error => {
            importer.logValue('Failed to load existing Resident episodes from MixesDB', error.message || error);
            logExistingEpisodes();
            addEpisodeLinks();
            startEpisodeObserver();
        });
}());