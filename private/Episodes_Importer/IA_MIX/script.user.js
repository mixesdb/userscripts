// ==UserScript==
// @name         IA MIX (private)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2026.07.21.2
// @description  Add MixesDB creation links to Inverted Audio IA MIX episodes.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/IA_MIX/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/IA_MIX/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-IA_MIX_1
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/funcs.js?v-2026.07.20.13
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Player_URLs/funcs.js?v-2026.07.20.13
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/IA_MIX/player_episodes.js?v-2026.07.20.13
// @include      https://inverted-audio.com/mix*
// @include      https://www.mixesdb.com/w/index.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=inverted-audio.com
// @noframes
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

var cacheVersion = 1,
    scriptName = "IA_MIX";

loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );

(function () {
    'use strict';

    const importer = window.MixesDBEpisodesImporter;
    if (!importer) {
        console.error('MixesDBEpisodesImporter dependency is not available.');
        return;
    }

    const sourceHost = 'inverted-audio.com';
    let playerEpisodes = window.MixesDBIaMixPlayerEpisodes || {};
    const mixesdbHost = 'www.mixesdb.com';
    const config = {
        categoryTitle: 'Category:IA_MIX',
        titleEpisodePattern: /IA MIX\s+(\d{1,4})\b/i,
        showCategory: 'IA MIX',
        storageKey: 'mdbIaMixRemoveExistingEpisodes',
        visitedLinksStorageKey: 'mdbIaMixVisitedEpisodeLinks',
        tleApiType: 'standard',
        selectors: {
            listContainer: '#post-load',
            episodeWrapper: '#post-load article.type-mix, article.type-mix',
            episodeHeading: '.entry-title',
            episodeLink: '.entry-title a[href], .entry-img a[href]',
            description: '.entry-content',
            nextPage: 'nav.posts-navigation a.next[href]',
            postedOn: '.posted-on',
            postedOnTime: '.posted-on time.entry-date.published[datetime], .posted-on time[datetime]',
        },
        classNames: {
            link: 'mdb-ia-mix-link',
            closeButton: 'mdb-ia-mix-close-button',
            toggle: 'mdb-ia-mix-remove-existing-toggle',
            hidden: 'mdb-ia-mix-existing-episode-hidden',
            copiedWrapper: 'mdb-ia-mix-copied-wrapper',
            autoLoadMoreWaiter: 'mdb-ia-mix-auto-load-more-waiter',
        },
        autoLoadMoreDelay: 700,
    };

    let existingEpisodes = new Set();
    let visitedEpisodeLinks = new Set();
    let removeExistingEpisodes = false;
    let autoLoadMoreTimer = null;
    let autoLoadMoreInProgress = false;
    let lastAutoLoadVisibleMissingCount = 0;

    function logStep(step, details = '') {
        importer.logValue(`IA MIX importer: ${step}`, typeof details === 'object' ? JSON.stringify(details) : details);
    }

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
        const match = String(title || '').match(/IA MIX\s+(\d{1,4})\s+(.+)/i);
        if (!match) return null;

        return {
            episodeNumber: Number(match[1]),
            artist: match[2].trim(),
        };
    }

    function normalizeDate(dateText) {
        const isoMatch = String(dateText || '').match(/\b(\d{4})-(\d{2})-(\d{2})(?=\b|T)/);
        if (isoMatch) return isoMatch[0];

        const longDateMatch = String(dateText || '').match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
        if (!longDateMatch) return '';

        const month = importer.getMonthNumber(longDateMatch[1]);
        if (!month) return '';

        return `${longDateMatch[3]}-${month}-${String(longDateMatch[2]).padStart(2, '0')}`;
    }

    function extractDateFromDocument(doc, episodeUrl = '') {
        const postedOn = doc.querySelector('.posted-on');
        const candidates = [
            { source: '.posted-on time.entry-date.published[datetime]', value: postedOn?.querySelector('time.entry-date.published[datetime]')?.getAttribute('datetime') },
            { source: '.posted-on time[datetime]', value: postedOn?.querySelector('time[datetime]')?.getAttribute('datetime') },
            { source: '.posted-on text', value: postedOn?.textContent },
            { source: 'time[datetime]', value: doc.querySelector('time[datetime]')?.getAttribute('datetime') },
            { source: 'meta[property="article:published_time"]', value: doc.querySelector('meta[property="article:published_time"]')?.content },
            { source: 'meta[name="date"]', value: doc.querySelector('meta[name="date"]')?.content },
            { source: '.entry-date, .entry-meta text', value: doc.querySelector('.entry-date, .entry-meta')?.textContent },
        ];
        const normalizedCandidates = candidates.map(candidate => ({
            source: candidate.source,
            value: String(candidate.value || '').trim(),
            normalized: normalizeDate(candidate.value),
        }));
        const selected = normalizedCandidates.find(candidate => candidate.normalized);
        logStep('date extraction candidates', { episodeUrl, candidates: normalizedCandidates, selected: selected || null });

        return selected?.normalized || '';
    }

    function getTracklistHeadingParagraph(doc) {
        return Array.from(doc.querySelectorAll(`${config.selectors.description} p`))
            .find(paragraph => paragraph.textContent.trim().replace(/\s+/g, ' ').toUpperCase() === 'TRACKLIST');
    }

    function extractRawTracklistFromDocument(doc, episodeUrl = '') {
        const tracklistHeading = getTracklistHeadingParagraph(doc);
        const tracklistParagraph = tracklistHeading?.nextElementSibling;
        if (!tracklistParagraph || tracklistParagraph.tagName !== 'P') {
            logStep('detail tracklist paragraph not found', { episodeUrl, hasTracklistHeading: Boolean(tracklistHeading) });
            return '';
        }

        const rawTracklist = importer.getNodeTextWithLinebreaks(tracklistParagraph)
            .split('\n')
            .map(importer.normalizeTracklistLine)
            .filter(Boolean)
            .join('\n');
        logStep('detail tracklist extracted', { episodeUrl, lines: rawTracklist.split('\n').filter(Boolean).length, rawTracklist });
        return rawTracklist;
    }

    async function formatTracklistForEpisode(rawTracklist, episodeUrl = '') {
        try {
            const tracklist = await importer.formatTracklist(rawTracklist, config.tleApiType);
            logStep('formatTracklist success', { episodeUrl, status: tracklist.status, textLength: tracklist.text?.length || 0, hasFeedback: Boolean(tracklist.feedback) });
            return tracklist;
        } catch (error) {
            logStep('formatTracklist failed', { episodeUrl, error: error.message || error });
            const fallbackTracklist = importer.hasTracklistForApi(rawTracklist)
                ? rawTracklist.split('\n').filter(Boolean).map(line => `# ${line}`).join('\n')
                : '<list>\n\n</list>';
            return {
                text: fallbackTracklist,
                status: importer.hasTracklistForApi(rawTracklist) ? 'incomplete' : 'none',
                feedback: null,
            };
        }
    }

    async function fetchEpisodeDetails(episodeUrl) {
        const response = await fetch(episodeUrl, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Episode page responded with ${response.status}`);

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const rawTracklist = extractRawTracklistFromDocument(doc, episodeUrl);
        return {
            date: extractDateFromDocument(doc, episodeUrl),
            playerUrl: doc.querySelector('iframe[src*="soundcloud.com"], iframe[src*="mixcloud.com"], iframe[src*="hearthis.at"], audio[src], audio source[src]')?.src || '',
            tracklist: await formatTracklistForEpisode(rawTracklist, episodeUrl),
        };
    }

    function buildMixesdbTitle(episode) {
        const prefix = episode.date ? `${episode.date} - ` : '';
        return `${prefix}${episode.artist} - IA MIX ${importer.padNumber(episode.episodeNumber)}`;
    }

    function normalizePlayerEpisodeEntry(entry) {
        return typeof entry === 'object' && entry !== null ? entry.url : entry;
    }

    function getPlayerUrlsForEpisode(episode, fetchedPlayerUrl = '') {
        const episodeKey = String(episode.episodeNumber);
        const configuredPlayerUrls = [
            normalizePlayerEpisodeEntry(playerEpisodes.applePodcasts?.[episodeKey]),
            normalizePlayerEpisodeEntry(playerEpisodes.mixcloud?.[episodeKey]),
            normalizePlayerEpisodeEntry(playerEpisodes.soundcloud?.[episodeKey]),
        ].filter(Boolean);
        const playerUrls = configuredPlayerUrls.length ? configuredPlayerUrls : [fetchedPlayerUrl].filter(Boolean);
        const uniquePlayerUrls = Array.from(new Set(playerUrls));

        return typeof sortPlayerUrlsByPreferredOrder === 'function'
            ? sortPlayerUrlsByPreferredOrder(uniquePlayerUrls)
            : uniquePlayerUrls;
    }

    function getMixcloudUrlForEpisode(episode, fetchedPlayerUrl = '') {
        const episodeKey = String(episode.episodeNumber);
        const configuredMixcloudUrl = normalizePlayerEpisodeEntry(playerEpisodes.mixcloud?.[episodeKey]);
        if (configuredMixcloudUrl) return configuredMixcloudUrl;

        return String(fetchedPlayerUrl || '').includes('mixcloud.com') ? fetchedPlayerUrl : '';
    }

    function getEpisodeDurationSeconds(episode) {
        const episodeKey = String(episode.episodeNumber);
        const entries = [
            playerEpisodes.applePodcasts?.[episodeKey],
            playerEpisodes.mixcloud?.[episodeKey],
            playerEpisodes.soundcloud?.[episodeKey],
        ];
        const duration = entries
            .map(entry => Number(entry?.duration))
            .find(candidate => Number.isFinite(candidate) && candidate > 0);

        return duration || null;
    }

    function formatDuration(seconds) {
        const totalSeconds = Math.round(seconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const remainingSeconds = totalSeconds % 60;

        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    function buildFileDetailsText(episode) {
        const durationSeconds = getEpisodeDurationSeconds(episode);
        const duration = durationSeconds ? formatDuration(durationSeconds) : '';

        return `{|{{NormalTableFormat}}\n! dur\n! MB\n! kbps\n|-\n| ${duration}\n| \n| \n|}`;
    }

    function buildPlayerText(playerUrls) {
        if (!playerUrls.length) return '';

        const playerLines = playerUrls.map((playerUrl, index) => {
            const prefix = playerUrls.length > 1 || playerUrl.includes('=') ? `${index + 1}=` : '';
            return ` |${prefix}${playerUrl}`;
        });
        if (playerUrls.length > 1) {
            return `\n\n{{Player|mode=mirrors\n${playerLines.join('\n')}\n}}`;
        }

        return `\n\n{{Player\n${playerLines.join('\n')}\n}}`;
    }

    function buildImageReference(episode) {
        return `[[File:${buildMixesdbTitle(episode)}.jpg|right|360px]]`;
    }

    function buildEpisodePageText(episode, episodeUrl = '', fetchedPlayerUrl = '', tracklistResult = { text: '<list>\n\n</list>', status: 'none' }) {
        const categories = [
            ...[episode.date ? episode.date.slice(0, 4) : '', episode.artist, config.showCategory]
                .filter(Boolean)
                .map(category => `[[Category:${category}]]`),
            '[[Category:]]',
            `[[Category:Tracklist: ${tracklistResult.status}]]`,
        ].join('\n');
        const imageReference = buildImageReference(episode);
        const imageText = imageReference ? `${imageReference}\n\n` : '';

        const notesText = episodeUrl ? `\n\n== Notes ==\n\n${episodeUrl}` : '';

        return `${imageText}== File details ==\n\n${buildFileDetailsText(episode)}${buildPlayerText(getPlayerUrlsForEpisode(episode, fetchedPlayerUrl))}${notesText}\n\n== Tracklist ==\n\n${tracklistResult.text}\n\n${categories}`;
    }

    function setCreateLinkHref(link, episode, episodeUrl, fetchedPlayerUrl = '', tracklistResult) {
        link.href = importer.buildMixesdbUrl(buildMixesdbTitle(episode), episodeUrl, buildEpisodePageText(episode, episodeUrl, fetchedPlayerUrl, tracklistResult));
    }

    function bindCreateLinkRefreshOnClick(link, episode, episodeUrl) {
        if (link.dataset.mdbIaMixCreateLinkRefresh === '1') return;

        link.dataset.mdbIaMixCreateLinkRefresh = '1';
        link.addEventListener('click', () => {
            if (existingEpisodes.has(episode.episodeNumber)) return;
            setCreateLinkHref(link, episode, episodeUrl, link.dataset.playerUrl || '', link.mdbIaMixTracklistResult);
            logStep('refreshed create link on click', {
                episodeNumber: episode.episodeNumber,
                episodeUrl,
                title: buildMixesdbTitle(episode),
                date: episode.date || '',
                playerUrl: link.dataset.playerUrl || '',
                tracklistStatus: link.mdbIaMixTracklistResult?.status || 'none',
            });
        }, { capture: true });
    }

    async function updateMixesdbLink(link, episode, wrapper) {
        const episodeUrl = link.dataset.episodeUrl || location.href;
        const isExisting = existingEpisodes.has(episode.episodeNumber);

        link.className = `${config.classNames.link} ${isExisting ? 'is-existing' : 'is-pending'}`;
        link.textContent = isExisting ? 'See on MixesDB' : `Checking IA MIX ${importer.padNumber(episode.episodeNumber)}`;
        setLinkVisitedState(link);
        bindCreateLinkRefreshOnClick(link, episode, episodeUrl);

        try {
            const details = await fetchEpisodeDetails(episodeUrl);
            episode.date = details.date || episode.date;
            link.dataset.playerUrl = details.playerUrl || '';
            link.mdbIaMixTracklistResult = details.tracklist;
            logStep('fetched episode details', { episodeNumber: episode.episodeNumber, episodeUrl, date: details.date, playerUrl: details.playerUrl, tracklistStatus: details.tracklist?.status || 'none' });
            if (isExisting) {
                link.href = importer.buildMixesdbUrl(buildMixesdbTitle(episode), episodeUrl);
            } else {
                setCreateLinkHref(link, episode, episodeUrl, details.playerUrl, details.tracklist);
            }
        } catch (error) {
            logStep('failed to fetch episode details', { episodeUrl, error: error.message || error });
            if (isExisting) {
                link.href = importer.buildMixesdbUrl(buildMixesdbTitle(episode), episodeUrl);
            } else {
                setCreateLinkHref(link, episode, episodeUrl);
            }
        }

        link.className = `${config.classNames.link} ${isExisting ? 'is-existing' : 'is-missing'}`;
        link.textContent = isExisting ? 'See on MixesDB' : 'Copy to MixesDB';
        link.title = buildMixesdbTitle(episode);
        setLinkVisitedState(link);
    }

    function setEpisodeVisibility(wrapper, episode) {
        wrapper.classList.toggle(config.classNames.hidden, removeExistingEpisodes && existingEpisodes.has(episode.episodeNumber));
    }

    function updateEpisodeVisibility() {
        document.querySelectorAll(`${config.selectors.episodeWrapper}[data-mdb-episode-number]`).forEach(wrapper => {
            setEpisodeVisibility(wrapper, { episodeNumber: Number(wrapper.dataset.mdbEpisodeNumber) });
        });
        scheduleAutoLoadMoreWhenNoNewEpisodes();
    }

    function getVisibleMissingEpisodeCount() {
        return Array.from(document.querySelectorAll(`${config.selectors.episodeWrapper}[data-mdb-episode-number]`))
            .filter(wrapper => !wrapper.classList.contains(config.classNames.hidden))
            .filter(wrapper => !existingEpisodes.has(Number(wrapper.dataset.mdbEpisodeNumber)))
            .length;
    }

    function getNextPageLink() {
        return document.querySelector(config.selectors.nextPage);
    }

    function setAutoLoadMoreFeedback(isLoading) {
        const nextPage = getNextPageLink();
        if (!nextPage) return;

        let waiter = nextPage.parentElement?.querySelector(`.${config.classNames.autoLoadMoreWaiter}`);
        if (!isLoading) {
            waiter?.remove();
            return;
        }

        if (!waiter) {
            waiter = document.createElement('span');
            waiter.className = config.classNames.autoLoadMoreWaiter;
            nextPage.insertAdjacentElement('afterend', waiter);
        }
        waiter.textContent = ' Loading hidden episodes…';
    }

    function scheduleAutoLoadMoreWhenNoNewEpisodes() {
        clearTimeout(autoLoadMoreTimer);
        if (!removeExistingEpisodes || autoLoadMoreInProgress) return;

        autoLoadMoreTimer = setTimeout(autoLoadMoreWhenNoNewEpisodes, config.autoLoadMoreDelay);
    }

    function autoLoadMoreWhenNoNewEpisodes() {
        const nextPage = getNextPageLink();
        if (!removeExistingEpisodes || autoLoadMoreInProgress || !nextPage) return;

        const visibleMissingCount = getVisibleMissingEpisodeCount();
        if (visibleMissingCount > 0 || visibleMissingCount > lastAutoLoadVisibleMissingCount) {
            lastAutoLoadVisibleMissingCount = visibleMissingCount;
            return;
        }

        autoLoadMoreInProgress = true;
        setAutoLoadMoreFeedback(true);
        nextPage.click();
        setTimeout(() => {
            autoLoadMoreInProgress = false;
            setAutoLoadMoreFeedback(false);
            scheduleAutoLoadMoreWhenNoNewEpisodes();
        }, config.autoLoadMoreDelay);
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
            lastAutoLoadVisibleMissingCount = getVisibleMissingEpisodeCount();
            updateEpisodeVisibility();
        });

        toggleWrapper.append(checkbox, document.createTextNode('Hide episodes that exist on MixesDB'));
        return toggleWrapper;
    }

    function addRemoveExistingToggle() {
        if (document.querySelector(`.${config.classNames.toggle}`)) return;

        const listContainer = document.querySelector(config.selectors.listContainer) || document.body;
        listContainer.insertAdjacentElement('beforebegin', createRemoveExistingToggle());
    }

    function getEpisodeUrl(wrapper) {
        const episodeLink = wrapper.querySelector(config.selectors.episodeLink)
            || wrapper.querySelector('a[rel=\"bookmark\"][href*=\"/mix/\"], a[href*=\"/mix/\"]');
        return episodeLink ? episodeLink.href : location.href;
    }

    function hydrateEpisodeDateFromWrapper(episode, wrapper) {
        if (episode.date) return false;

        const postedOn = wrapper.querySelector(config.selectors.postedOn);
        const datetime = postedOn?.querySelector(config.selectors.postedOnTime)?.getAttribute('datetime');
        episode.date = normalizeDate(datetime) || normalizeDate(postedOn?.textContent);
        return Boolean(episode.date);
    }

    function updateLinkDateFromPostedOn(link, episode, wrapper, postedOn) {
        if (episode.date) return;

        const datetime = postedOn.querySelector(config.selectors.postedOnTime)?.getAttribute('datetime');
        const date = normalizeDate(datetime) || normalizeDate(postedOn.textContent);
        if (!date) return;

        episode.date = date;
        setCreateLinkHref(link, episode, link.dataset.episodeUrl || location.href, link.dataset.playerUrl || '');
        link.title = buildMixesdbTitle(episode);
        logStep('hydrated detail page date from .posted-on', {
            episodeNumber: episode.episodeNumber,
            episodeUrl: link.dataset.episodeUrl || location.href,
            date,
        });
    }

    function waitForPostedOnDate(link, episode, wrapper) {
        if (episode.date || typeof waitForKeyElements !== 'function') return;

        const selector = `${config.selectors.episodeWrapper}[data-mdb-episode-number="${episode.episodeNumber}"] ${config.selectors.postedOn}`;
        waitForKeyElements(selector, jNode => {
            updateLinkDateFromPostedOn(link, episode, wrapper, jNode[0]);
            return !episode.date;
        }, true);
    }

    function createMixesdbLink(heading, episode, wrapper) {
        hydrateEpisodeDateFromWrapper(episode, wrapper);
        const episodeUrl = getEpisodeUrl(wrapper);
        const link = document.createElement('a');

        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.dataset.episodeNumber = String(episode.episodeNumber);
        link.dataset.episodeUrl = episodeUrl;
        link.href = link.dataset.episodeUrl;
        link.addEventListener('click', () => {
            const mixcloudUrl = getMixcloudUrlForEpisode(episode, link.dataset.playerUrl || '');
            markLinkVisited(link);
            wrapper.classList.add(config.classNames.copiedWrapper);
            if (!existingEpisodes.has(episode.episodeNumber) && mixcloudUrl) {
                window.open(mixcloudUrl, '_blank', 'noopener,noreferrer');
                logStep('opened Mixcloud URL on copy click', {
                    episodeNumber: episode.episodeNumber,
                    episodeUrl,
                    mixcloudUrl,
                });
            }
        });
        updateMixesdbLink(link, episode, wrapper);
        waitForPostedOnDate(link, episode, wrapper);

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
            button.closest('article')?.remove();
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
            ${config.selectors.episodeWrapper}[data-mdb-episode-number] { position: relative; }
            .${config.classNames.closeButton} {
                align-items: center; background: #00000080; border: 1px solid #ffffff80; border-radius: 50%;
                color: #fff; cursor: pointer; display: flex; font-size: 1.25rem; font-weight: 700; height: 1.7rem;
                justify-content: center; line-height: 1; padding: 0; position: absolute; right: 0.6rem; top: 0.6rem; width: 1.7rem; z-index: 2;
            }
            .${config.classNames.closeButton}:hover, .${config.classNames.closeButton}:focus { background: #ff6600; border-color: #ff6600; outline: none; }
            .${config.classNames.link} { display: inline-block; margin: 0.35em 0 0.75em; padding: 0.25em 0.6em; border-radius: 4px; font-size: 0.85rem; font-weight: 700; line-height: 1.4; text-decoration: none; }
            .${config.classNames.link}.is-visited { opacity: .62 !important; }
            .${config.classNames.link}.is-existing { background: #2ea70060; color: #fff !important; border: 1px solid #4d9f4d; }
            .${config.classNames.link}.is-missing, .${config.classNames.link}.is-pending { background: #ff660050; border: 1px solid #f60; color: #fff !important; }
            .${config.classNames.toggle} { display: block; margin: 0 0 1rem; padding: 0.6em 0.8em; border: 1px solid #4d9f4d; border-radius: 4px; background: #2ea70030; color: #fff; font-size: 0.95rem; font-weight: 700; line-height: 1.4; }
            .${config.classNames.toggle} input { margin-right: 0.35em; vertical-align: middle; }
            .${config.classNames.hidden} { display: none !important; }
            .${config.classNames.autoLoadMoreWaiter} { display: inline-block; margin-left: 0.5rem; color: #fff; font-size: 0.85rem; font-weight: 700; }
        `;
        document.head.appendChild(style);
    }

    function addEpisodeLinks() {
        document.querySelectorAll(config.selectors.episodeWrapper).forEach(wrapper => {
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
        scheduleAutoLoadMoreWhenNoNewEpisodes();
    }

    async function loadPlayerEpisodes() {
        if (Object.keys(playerEpisodes).length) return;

        const url = 'https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/private/Episodes_Importer/IA_MIX/player_episodes.js?fresh=' + Date.now();
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`player_episodes.js responded with ${response.status}`);
        const code = await response.text();
        (0, eval)(code);
        playerEpisodes = window.MixesDBIaMixPlayerEpisodes || {};
    }

    function startEpisodeObserver() {
        const observer = new MutationObserver(addEpisodeLinks);
        observer.observe(document.body, { childList: true, subtree: true });
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
    loadPlayerEpisodes()
        .catch(error => importer.logValue('Failed to load fresh IA MIX player episodes', error.message || error))
        .then(() => importer.fetchExistingEpisodes(config))
        .then(episodeNumbers => {
            existingEpisodes = new Set(episodeNumbers);
            addRemoveExistingToggle();
            addEpisodeLinks();
            startEpisodeObserver();
        })
        .catch(error => {
            importer.logValue('Failed to load existing IA MIX episodes from MixesDB', error.message || error);
            addEpisodeLinks();
            startEpisodeObserver();
        });
}());
