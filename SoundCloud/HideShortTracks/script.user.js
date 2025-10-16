// ==UserScript==
// @name         SoundCloud: Hide short tracks (Beta) (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.10.16.12
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/HideShortTracks/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/HideShortTracks/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @match        https://soundcloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
// @run-at       document-idle
// ==/UserScript==


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Copied stuff from global.js
 * do not require aditionally (when normal SoundCloud userscript is active) > then e.g. API nd file details toggle gets buggy
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

const githubPath_raw = "https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/";

function loadRawCss( urlVar ) {
  $.ajax({
    url: urlVar,
    dataType: "text",
    success: function(fileText) {
      // cssText will be a string containing the text of the file
      $('head').append( '<style>'+fileText+'</style>' );
    }
  });
}
function urlPath(n) {
    return $(location).attr('href').split('/')[n+2];
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 24,
  scriptName = "SoundCloud/HideShortTracks";

//loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

if( urlPath(2) !== "sets" ) {
    (() => {
        // ---------- Config ----------
        const DEFAULT_MIN       = 20;                 // default minutes
        const MIN_MINUTES       = 3;
        const MAX_MINUTES       = 180;

        const FAV_STEPS         = [1, 5, 10, 20, 50, 100, 250, 500, 1000];
        const FAV_STEP_MAX      = FAV_STEPS.length - 1;
        const DEFAULT_FAVS      = 1;

        const PAGE_RESOLVE_CAP  = 40;
        const REQ_INTERVAL_MS   = 1500;
        const CACHE_TTL         = 10 * 365 * 24 * 3600 * 1e3;  // 10 years
        const NEG_TTL           = 7 * 24 * 3600 * 1e3;         // 7 days

        const UI_ID             = 'sc-hide-short-ui-wrap';
        const CHECKED_CLASS     = 'sc-checked';
        const ATTR_TOO_SHORT    = 'data-sc-too-short';
        const ATTR_TOO_FEW_F    = 'data-sc-too-few-favs';

        const LS_CACHE          = 'sc_hide_short_cache_v6';
        const LS_SETT           = 'sc_hide_short_settings_v5';

        // ---------- State ----------
        const STATE = {
            thresholdMin: DEFAULT_MIN,
            thresholdFavs: DEFAULT_FAVS,
            favsEnabled: false,
            clientId: null,
            cache: loadCache(),                // { url: { ms:number|null, t:ts, neg?:true } }
            resolvesDone: 0,
            lastReq: 0,
            inflight: new Map(),               // url -> Promise<number|null>
            pausedUntil: 0,
            io: null
        };

        // ---------- Utils ----------
        const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
        const now = () => Date.now();
        const clampMin = m => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(parseInt(m, 10) || DEFAULT_MIN)));
        const enabled = () => document.documentElement.classList.contains('sc-hide-short-active');
        const thresholdMs = () => STATE.thresholdMin * 60 * 1000;
        const norm = u => {
            try { const x = new URL(u, location.origin); return x.origin + x.pathname.replace(/\/+$/, ''); }
            catch { return (u || '').split('#')[0].split('?')[0]; }
        };
        const computeEnabled = (cbMain, cbFavs) => !!(cbMain?.checked || cbFavs?.checked);

        function loadCache() {
            try {
                const obj = JSON.parse(localStorage.getItem(LS_CACHE) || '{}');
                const t = now();
                for (const k in obj) {
                    const e = obj[k]; if (!e) { delete obj[k]; continue; }
                    const ttl = e.neg ? NEG_TTL : CACHE_TTL;
                    if (e.t && t - e.t > ttl) delete obj[k];
                }
                return obj;
            } catch { return {}; }
        }
        function saveCache() {
            try { localStorage.setItem(LS_CACHE, JSON.stringify(STATE.cache)); } catch {}
        }

        function loadSettings() {
            try {
                const s = JSON.parse(localStorage.getItem(LS_SETT) || 'null');
                if (!s) return null;
                return {
                    enabled: !!s.enabled,
                    min: clampMin(s.min ?? DEFAULT_MIN),
                    minFavs: Number.isFinite(s.minFavs) ? s.minFavs : DEFAULT_FAVS,
                    favsEnabled: !!s.favsEnabled
                };
            } catch { return null; }
        }
        function saveSettings(enabledVal, min, minFavs, favsEnabledVal) {
            try {
                localStorage.setItem(LS_SETT, JSON.stringify({
                    enabled: !!enabledVal,
                    min: clampMin(min),
                    minFavs,
                    favsEnabled: !!favsEnabledVal
                }));
            } catch {}
        }

        // ---------- UI ----------
        function buildUI() {
            let wrap = document.getElementById(UI_ID);
            if (wrap) return wrap;

            wrap = document.createElement('div');
            wrap.id = UI_ID;
            wrap.innerHTML = `
            <div id="mdb-streamActions-filter"><span class="mdb-darkorange">Filter:</span><!--
         --><span class="mdb-streamActions-group"><!--
         --><label><!--
         --><input id="sc-hide-short-checkbox" type="checkbox"><!--
         --><span>Durations ≥<span id="sc-hide-short-val" class="value">${DEFAULT_MIN}</span></span><!--
         --></label><!--

         --><input id="sc-hide-short-slider" type="range" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1"><!--

         --></span><!--
         --><span class="mdb-streamActions-group"><!--
         --><label><!--
         --><input id="sc-favs-checkbox" type="checkbox"><!--
         --><span>Favorites ≥<span id="sc-min-favs-val" class="value">${DEFAULT_FAVS}</span></span><!--
         --></label><!--

         --><input id="sc-min-favs-slider" type="range" min="0" max="${FAV_STEP_MAX}" step="1"><!--

         --><span class="visually-hidden"><!--
                --><input id="sc-hide-short-minutes" type="number" maxlength="3" min="1"><!--
         --></span></span></div>
        `;
            wireUI(wrap);
            return wrap;
        }

        function wireUI(root) {
            const cbMain    = root.querySelector('#sc-hide-short-checkbox');
            const slDur     = root.querySelector('#sc-hide-short-slider');
            const cbFavs    = root.querySelector('#sc-favs-checkbox');
            const slFavs    = root.querySelector('#sc-min-favs-slider');
            const minI      = root.querySelector('#sc-hide-short-minutes');
            const valDur    = root.querySelector('#sc-hide-short-val');
            const valFavs   = root.querySelector('#sc-min-favs-val');

            const saved = loadSettings();
            STATE.thresholdMin   = saved ? saved.min : DEFAULT_MIN;
            STATE.thresholdFavs  = saved ? saved.minFavs : DEFAULT_FAVS;
            STATE.favsEnabled    = saved ? !!saved.favsEnabled : false;

            // duration init
            minI.value          = String(STATE.thresholdMin);
            slDur.value         = String(STATE.thresholdMin);
            valDur.textContent  = String(STATE.thresholdMin);

            // favorites init (map saved numeric → slider index)
            const initFavIndex = Math.max(0, FAV_STEPS.findIndex(v => v >= STATE.thresholdFavs));
            slFavs.value       = String(initFavIndex);
            valFavs.textContent= String(STATE.thresholdFavs);

            cbMain.checked      = !!(saved && saved.enabled);
            cbFavs.checked      = STATE.favsEnabled;

            document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
            saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

            let t;
            const debouncedReset = () => {
                clearTimeout(t);
                t = setTimeout(() => resetAll(), 120);   // fast feedback while dragging
            };

            // Duration slider: auto-enable ONLY duration checkbox; live re-eval while dragging
            slDur.addEventListener('input', () => {
                STATE.thresholdMin = clampMin(slDur.value || DEFAULT_MIN);
                valDur.textContent = String(STATE.thresholdMin);
                minI.value = String(STATE.thresholdMin);

                if (!cbMain.checked) cbMain.checked = true;
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

                if (computeEnabled(cbMain, cbFavs)) debouncedReset();
            });
            slDur.addEventListener('change', () => {
                if (!cbMain.checked) cbMain.checked = true;
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
                clearTimeout(t);
                resetAll();
            });

            const favValueFromSlider = slider => {
                const idx = Math.max(0, Math.min(FAV_STEP_MAX, Math.round(parseInt(slider.value, 10) || 0)));
                return FAV_STEPS[idx];
            };

            // Favorites slider: auto-enable ONLY favorites checkbox; live re-eval while dragging
            slFavs.addEventListener('input', () => {
                STATE.thresholdFavs = favValueFromSlider(slFavs);
                valFavs.textContent = String(STATE.thresholdFavs);

                if (!cbFavs.checked) {
                    cbFavs.checked = true;
                    STATE.favsEnabled = true;
                }
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

                if (computeEnabled(cbMain, cbFavs)) debouncedReset();
            });
            slFavs.addEventListener('change', () => {
                STATE.thresholdFavs = favValueFromSlider(slFavs);
                valFavs.textContent = String(STATE.thresholdFavs);

                if (!cbFavs.checked) {
                    cbFavs.checked = true;
                    STATE.favsEnabled = true;
                }
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
                clearTimeout(t);
                resetAll();
            });

            // Hidden number input (compat)
            minI.addEventListener('change', () => {
                STATE.thresholdMin = clampMin(minI.value || DEFAULT_MIN);
                slDur.value = String(STATE.thresholdMin);
                valDur.textContent = String(STATE.thresholdMin);

                if (!cbMain.checked) cbMain.checked = true;
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);

                clearTimeout(t);
                resetAll();
            });

            // Main enable/disable
            cbMain.addEventListener('change', () => {
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
                clearTimeout(t);
                resetAll();
            });

            // Favorites enable/disable
            cbFavs.addEventListener('change', () => {
                STATE.favsEnabled = cbFavs.checked;
                document.documentElement.classList.toggle('sc-hide-short-active', computeEnabled(cbMain, cbFavs));
                saveSettings(computeEnabled(cbMain, cbFavs), STATE.thresholdMin, STATE.thresholdFavs, cbFavs.checked);
                clearTimeout(t);
                if (computeEnabled(cbMain, cbFavs)) resetAll();
            });
        }

        function mountUI() {
            // ONLY attach via waitForKeyElements
            /* global waitForKeyElements */
            waitForKeyElements('#mdb-streamActions', ($c) => {
                const node = $c instanceof Element ? $c : $c[0];
                if (!node) return;
                if (node.querySelector('#' + UI_ID)) return; // already mounted
                const el = buildUI();
                node.appendChild(el);
                refreshVisible();
            });
        }

        // ---------- Card discovery / helpers ----------
        function getCards(root = document) {
            return Array.from(new Set([
                ...root.querySelectorAll('article[aria-label="Track"]:not(.' + CHECKED_CLASS + ')'),
                ...root.querySelectorAll('article[data-testid*="track"]:not(.' + CHECKED_CLASS + ')'),
                ...root.querySelectorAll('.lazyLoadingList__item article:not(.' + CHECKED_CLASS + ')'),
                ...root.querySelectorAll('li.soundList__item:not(.' + CHECKED_CLASS + ')'),
                ...root.querySelectorAll('.searchItem:not(.' + CHECKED_CLASS + ')')
            ]));
        }
        function getAllTrackCards(root = document) {
            return Array.from(new Set([
                ...root.querySelectorAll('article[aria-label="Track"]'),
                ...root.querySelectorAll('article[data-testid*="track"]'),
                ...root.querySelectorAll('.lazyLoadingList__item article'),
                ...root.querySelectorAll('li.soundList__item'),
                ...root.querySelectorAll('.searchItem')
            ]));
        }
        function asCard(el) {
            return el.closest('article, li.soundList__item, .lazyLoadingList__item, .searchItem, .soundList__item') || el;
        }
        function getCardUrl(card) {
            for (const a of qsa('a[href]', card)) {
                const href = a.getAttribute('href') || a.href || '';
                if (!href) continue;
                if (/^https?:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(href) || /^\/[^/]+\/[^/]+/.test(href)) {
                    return norm(href.startsWith('http') ? href : location.origin + href);
                }
            }
            return null;
        }

        // Favorites count (from like button label only)
        function getFavoritesCount(card) {
            const likeBtn = card.querySelector('button.sc-button-like, .sc-button-like[aria-label="Like"]');
            const labelEl = likeBtn?.querySelector('.sc-button-label');
            if (labelEl) {
                const n = parseInt((labelEl.textContent || '').replace(/[^\d]/g, ''), 10);
                if (Number.isFinite(n)) return n;
            }
            if (likeBtn) {
                const n2 = parseInt((likeBtn.textContent || '').replace(/[^\d]/g, ''), 10);
                if (Number.isFinite(n2)) return n2;
            }
            const anyLike = card.querySelectorAll('.sc-button-like');
            for (const b of anyLike) {
                const t = (b.querySelector('.sc-button-label')?.textContent || b.textContent || '').trim();
                const num = parseInt(t.replace(/[^\d]/g, ''), 10);
                if (Number.isFinite(num)) return num;
            }
            return 0;
        }

        // ---------- Network hooks (sniff client_id + harvest JSON durations) ----------
        function installNetworkHooks() {
            const of = window.fetch;
            window.fetch = async function(input, init) {
                try {
                    const urlStr = typeof input === 'string' ? input : (input?.url || '');
                    if (urlStr) {
                        const u = new URL(urlStr, location.origin);
                        const cid = u.searchParams.get('client_id');
                        if (cid && !STATE.clientId) STATE.clientId = cid;
                    }
                } catch {}
                const resp = await of.apply(this, arguments);
                try {
                    const ct = resp.headers.get('content-type') || '';
                    if (ct.includes('application/json')) resp.clone().json().then(harvestFromJson).catch(() => {});
                } catch {}
                return resp;
            };

            const oo = XMLHttpRequest.prototype.open;
            const os = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url) {
                try {
                    const u = new URL(url, location.origin);
                    const cid = u.searchParams.get('client_id');
                    if (cid && !STATE.clientId) STATE.clientId = cid;
                } catch {}
                return oo.apply(this, arguments);
            };
            XMLHttpRequest.prototype.send = function() {
                this.addEventListener('load', function() {
                    try {
                        const ct = this.getResponseHeader && this.getResponseHeader('content-type') || '';
                        if (ct.includes('application/json')) {
                            const txt = this.responseText;
                            if (txt && txt.length < 10_000_000) {
                                try { harvestFromJson(JSON.parse(txt)); } catch {}
                            }
                        }
                    } catch {}
                });
                return os.apply(this, arguments);
            };
        }

        function harvestFromJson(obj) {
            const seen = new Set();
            const walk = v => {
                if (!v || typeof v !== 'object' || seen.has(v)) return;
                seen.add(v);
                if (Array.isArray(v)) { v.forEach(walk); return; }
                const url = v.permalink_url || v.uri || v.permalink;
                const dur = v.duration;
                if (url && typeof dur === 'number') {
                    const key = norm(url);
                    if (!STATE.cache[key]) STATE.cache[key] = { ms: dur, t: now() };
                }
                for (const k in v) { const x = v[k]; if (x && typeof x === 'object') walk(x); }
            };
            walk(obj);
            saveCache();
        }

        async function ensureClientId() {
            if (STATE.clientId) return STATE.clientId;
            for (const s of document.scripts) {
                const txt = s.textContent || '';
                const m = txt.match(/client_id:"([A-Za-z0-9]+)"/) || txt.match(/clientId\s*:\s*"([A-Za-z0-9]+)"/);
                if (m) { STATE.clientId = m[1]; break; }
            }
            return STATE.clientId || null;
        }

        // ---------- Resolve duration ----------
        async function resolveViaWidget(url) {
            try {
                const ep = `https://api-widget.soundcloud.com/resolve?url=${encodeURIComponent(url)}`;
                const r = await fetch(ep, { credentials: 'omit' });
                if (!r.ok) return null;
                const data = await r.json();
                if (Number.isFinite(data?.duration)) return data.duration;
                if (Number.isFinite(data?.track?.duration)) return data.track.duration;
                if (Array.isArray(data?.tracks) && Number.isFinite(data.tracks[0]?.duration)) return data.tracks[0].duration;
                return null;
            } catch { return null; }
        }
        async function resolveViaApi(url) {
            const cid = (await ensureClientId()) || STATE.clientId;
            if (!cid) return null;
            const ep = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${cid}`;
            const r = await fetch(ep, { credentials: 'omit' });
            if (r.status === 429) {
                STATE.pausedUntil = now() + 30000; // cooldown
                return null;
            }
            if (!r.ok) return null;
            const data = await r.json();
            return Number.isFinite(data?.duration) ? data.duration : null;
        }
        async function getDuration(url) {
            const c = STATE.cache[url];
            if (c) { if (c.ms != null) return c.ms; if (c.neg) return null; }

            if (STATE.resolvesDone >= PAGE_RESOLVE_CAP) return null;
            if (now() < STATE.pausedUntil) return null;

            if (STATE.inflight.has(url)) return STATE.inflight.get(url);

            const p = (async () => {
                const wait = Math.max(0, STATE.lastReq + REQ_INTERVAL_MS - now());
                if (wait) await new Promise(r => setTimeout(r, wait));
                STATE.lastReq = now();

                let ms = await resolveViaWidget(url);
                if (ms == null) ms = await resolveViaApi(url);

                if (ms != null) {
                    STATE.resolvesDone++;
                    STATE.cache[url] = { ms, t: now() };
                } else {
                    STATE.cache[url] = { ms: null, t: now(), neg: true };
                }
                saveCache();
                return STATE.cache[url].ms; // may be null
            })();

            STATE.inflight.set(url, p);
            try { return await p; }
            finally { STATE.inflight.delete(url); }
        }

        // ---------- Evaluate ----------
        async function evaluateCard(card) {
            if (!enabled() || card.classList.contains(CHECKED_CLASS)) return;

            const r = card.getBoundingClientRect();
            if (!(r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight))) return;

            if (card.dataset.scProcessing === '1') return;
            card.dataset.scProcessing = '1';

            try {
                const url = getCardUrl(card);
                if (!url) return;

                const node = asCard(card);

                // Favorites — immediate and independent
                let tooFewFavs = false;
                if (STATE.favsEnabled) {
                    const favs = getFavoritesCount(card);
                    tooFewFavs = favs < STATE.thresholdFavs;
                    if (tooFewFavs) node.setAttribute(ATTR_TOO_FEW_F, '1'); else node.removeAttribute(ATTR_TOO_FEW_F);
                } else {
                    node.removeAttribute(ATTR_TOO_FEW_F);
                }
                if (tooFewFavs) {
                    card.classList.add(CHECKED_CLASS);
                    return;
                }

                // Duration — cache → resolve
                let ms = STATE.cache[url]?.ms ?? null;
                const isNeg = !!STATE.cache[url]?.neg;
                if (ms == null && !isNeg) {
                    ms = await getDuration(url);  // may be null
                }
                const haveStableDuration = (ms != null) || !!STATE.cache[url]?.neg;
                if (!haveStableDuration) {
                    setTimeout(() => { evaluateCard(card); }, 1600);
                    return;
                }

                const tooShort = (ms != null) && (ms < thresholdMs()); // keep ≥ threshold
                if (tooShort) node.setAttribute(ATTR_TOO_SHORT, '1'); else node.removeAttribute(ATTR_TOO_SHORT);

                card.classList.add(CHECKED_CLASS);
            } finally {
                card.dataset.scProcessing = '';
            }
        }

        // ---------- Orchestration ----------
        let rafPending = false;
        function refreshVisible() {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                getCards().forEach(c => { evaluateCard(c); });
            });
        }

        function attachIO() {
            if (STATE.io) return;
            STATE.io = new IntersectionObserver((entries) => {
                if (!enabled()) return;
                for (const e of entries) {
                    if (e.isIntersecting && !e.target.classList.contains(CHECKED_CLASS)) evaluateCard(e.target);
                }
            }, { root: null, rootMargin: '150px', threshold: 0.01 });
            getCards().forEach(c => STATE.io.observe(c));
        }

        function observeDOM() {
            const mo = new MutationObserver(() => refreshVisible());
            mo.observe(document.body || document.documentElement, { childList: true, subtree: true });

            // SPA route changes
            let last = location.href;
            setInterval(() => {
                if (location.href !== last) {
                    last = location.href;
                    STATE.resolvesDone = 0;
                    STATE.pausedUntil = 0;
                    STATE.inflight.clear();
                    resetAll();
                }
            }, 600);
        }

        function resetAll() {
            getAllTrackCards().forEach(c => {
                c.classList.remove(CHECKED_CLASS);
                const node = asCard(c);
                node.removeAttribute(ATTR_TOO_SHORT);
                node.removeAttribute(ATTR_TOO_FEW_F);
                node.style.display = '';
            });
            if (STATE.io) { try { STATE.io.disconnect(); } catch {} }
            STATE.io = null;
            attachIO();
            refreshVisible();
        }

        // ---------- Boot ----------
        installNetworkHooks();
        mountUI();
        attachIO();
        observeDOM();
        refreshVisible();
    })();
}