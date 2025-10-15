// ==UserScript==
// @name         SoundCloud: Hide short tracks (Beta) (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.10.15.6
// @description  Change the look and behaviour of certain DJ culture related websites to help contributing to MixesDB, e.g. add copy-paste ready tracklists in wiki syntax.
// @homepageURL  https://www.mixesdb.com/w/Help:MixesDB_userscripts
// @supportURL   https://discord.com/channels/1258107262833262603/1261652394799005858
// @updateURL    https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/SoundCloud/HideShortTracks/script.user.js
// @downloadURL  https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/SoundCloud/HideShortTracks/script.user.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/jquery-3.7.1.min.js
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/mixesdb/userscripts/refs/heads/main/includes/global.js?v-SoundCloud_33
// @match        https://soundcloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
// @run-at       document-idle
// ==/UserScript==

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 * global.js URL needs to be changed manually
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 4,
    scriptName = "SoundCloud/HideShortTracks";

//loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// ==UserScript==
// @name         SC: Hide short tracks (20m) — streamActions + fallback
// @description  Hide tracks shorter than X minutes on SoundCloud profile pages. UI prefers #mdb-streamActions, else falls back to header after 500ms.
// @match        https://soundcloud.com/*
// @run-at       document-idle
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// ==/UserScript==

// ==UserScript==
// @name         SC: Hide short tracks (20m) — full + streamActions + centered fallback (no CSS)
// @match        https://soundcloud.com/*
// @run-at       document-idle
// @require      https://cdn.rawgit.com/mixesdb/userscripts/refs/heads/main/includes/waitForKeyElements.js
// ==/UserScript==

(() => {
  // ---------- settings & cache ----------
  const DEFAULT_MIN = 20;                  // minutes
  const PAGE_RESOLVE_CAP = 40;             // max resolve calls per page
  const REQ_INTERVAL_MS = 1500;            // spacing between resolves
  const CACHE_TTL = 7 * 24 * 3600 * 1e3;   // 7d positive cache
  const NEG_TTL   = 10 * 60 * 1000;        // 10m negative cache
  const LS_CACHE  = 'sc_hide_short_cache_v6';
  const LS_SETTINGS = 'sc_hide_short_settings_v1';
  const UI_ID = 'sc-hide-short-ui-wrap';

  const STATE = {
    thresholdMin: DEFAULT_MIN,
    clientId: null,
    cache: loadCache(),        // { url: { ms:number|null, t:ts, neg?:true } }
    resolvesDone: 0,
    lastReq: 0,
    inflight: false,
    pausedUntil: 0,
    io: null,
    pendingCards: new WeakSet(),
  };

  // ---------- tiny utils ----------
  const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const norm = u=>{ try{ const x=new URL(u, location.origin); return x.origin+x.pathname.replace(/\/+$/,''); } catch{ return (u||'').split('#')[0].split('?')[0]; } };
  const msToMMSS = ms=>{ if(ms==null) return '—:——'; const s=(ms/1000)|0, m=(s/60)|0; return `${m}:${String(s%60).padStart(2,'0')}`; };
  const now = ()=>Date.now();
  const isEnabled = () => document.documentElement.classList.contains('sc-hide-short-active');

  function saveCache(){ try{ localStorage.setItem(LS_CACHE, JSON.stringify(STATE.cache)); }catch{} }
  function loadCache(){
    try{
      const raw = localStorage.getItem(LS_CACHE);
      const obj = raw ? JSON.parse(raw) : {};
      const t = now();
      for (const k in obj) {
        const e = obj[k];
        if (!e) { delete obj[k]; continue; }
        const ttl = e.neg ? NEG_TTL : CACHE_TTL;
        if (e.t && t - e.t > ttl) delete obj[k];
      }
      return obj;
    } catch { return {}; }
  }
  function loadSettings(){
    try{
      const raw = localStorage.getItem(LS_SETTINGS);
      const s = raw ? JSON.parse(raw) : null;
      if (!s) return null;
      if (typeof s.enabled !== 'boolean') return null;
      if (!Number.isFinite(s.min) || s.min < 1) return null;
      return s;
    }catch{ return null; }
  }
  function saveSettings(enabled, min){
    try{ localStorage.setItem(LS_SETTINGS, JSON.stringify({ enabled, min })); }catch{}
  }

  // ---------- hydration + JSON harvest + CID sniff ----------
  function harvestHydration(){
    const h = window.__sc_hydration;
    if (!Array.isArray(h)) return;
    let added=0;
    for (const blk of h){
      const coll = Array.isArray(blk?.data?.collection) ? blk.data.collection
                : Array.isArray(blk?.data?.tracks) ? blk.data.tracks
                : blk?.data?.track ? [blk.data.track] : null;
      if (!coll) continue;
      for (const t of coll){
        const url = norm(t?.permalink_url || t?.uri || t?.permalink);
        const ms  = Number.isFinite(t?.duration) ? t.duration : null;
        if (url && ms!=null && !STATE.cache[url]) { STATE.cache[url] = { ms, t: now() }; added++; }
      }
    }
    if (added) saveCache();
  }
  function harvestFromJson(obj){
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
    if (isEnabled()) refreshVisible();
  }
  function installNetworkHooks(){
    const of = window.fetch;
    window.fetch = async function(input, init){
      try{
        const urlStr = typeof input==='string' ? input : (input?.url || '');
        if (urlStr){
          const u = new URL(urlStr, location.origin);
          const cid = u.searchParams.get('client_id');
          if (cid && !STATE.clientId) STATE.clientId = cid;
        }
      }catch{}
      const resp = await of.apply(this, arguments);
      try {
        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) resp.clone().json().then(harvestFromJson).catch(()=>{});
      } catch {}
      return resp;
    };
    const oo = XMLHttpRequest.prototype.open;
    const os = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url){
      try{
        const u = new URL(url, location.origin);
        const cid = u.searchParams.get('client_id');
        if (cid && !STATE.clientId) STATE.clientId = cid;
      }catch{}
      return oo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(){
      this.addEventListener('load', function(){
        try{
          const ct = this.getResponseHeader && this.getResponseHeader('content-type') || '';
          if (ct.includes('application/json')) {
            const txt = this.responseText;
            if (txt && txt.length < 10_000_000) {
              try { harvestFromJson(JSON.parse(txt)); } catch {}
            }
          }
        }catch{}
      });
      return os.apply(this, arguments);
    };
  }
  async function ensureClientId(){
    if (STATE.clientId) return STATE.clientId;
    for (const s of document.scripts){
      const txt = s.textContent || '';
      const m = txt.match(/client_id:"([A-Za-z0-9]+)"/) || txt.match(/clientId\s*:\s*"([A-Za-z0-9]+)"/);
      if (m){ STATE.clientId = m[1]; break; }
    }
    return STATE.clientId || null;
  }

  // ---------- UI (no inline CSS; you load it separately) ----------
  function buildUI() {
    const existing = document.getElementById(UI_ID);
    if (existing) return existing;
    const wrap = document.createElement('div');
    wrap.id = UI_ID;
    wrap.innerHTML = `
      <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
        <input id="sc-hide-short-checkbox" type="checkbox">
        <span>Hide short</span>
      </label>
      <label style="display:inline-flex;align-items:center;gap:6px;">
        <span>&lt;</span>
        <input id="sc-hide-short-minutes" type="number" maxlength="3" min="1">
        <span>min</span>
      </label>
      <span id="sc-hide-short-hint" class="sc-hide-short-hint"></span>
    `;
    wireUI(wrap);
    return wrap;
  }
  function wireUI(root) {
    const cb  = root.querySelector('#sc-hide-short-checkbox');
    const min = root.querySelector('#sc-hide-short-minutes');

    const saved = loadSettings();
    STATE.thresholdMin = saved ? Math.max(1, parseInt(saved.min, 10)) : DEFAULT_MIN;
    min.value = String(STATE.thresholdMin);
    cb.checked = !!(saved && saved.enabled);
    document.documentElement.classList.toggle('sc-hide-short-active', cb.checked);

    cb.addEventListener('change', () => {
      STATE.thresholdMin = Math.max(1, parseInt(min.value || '1', 10));
      document.documentElement.classList.toggle('sc-hide-short-active', cb.checked);
      saveSettings(cb.checked, STATE.thresholdMin);
      refreshVisible();
      updateHint();
    });
    min.addEventListener('change', () => {
      STATE.thresholdMin = Math.max(1, parseInt(min.value || '1', 10));
      saveSettings(cb.checked, STATE.thresholdMin);
      if (cb.checked) refreshVisible();
      updateHint();
    });
    updateHint();
  }

  // ---------- mounting (preferred #mdb-streamActions; fallback after header) ----------
  function mountInto(container) {
    if (!container) return;
    const el = document.getElementById(UI_ID) || buildUI();
    if (el.parentElement !== container) container.appendChild(el);
  }
  function insertAfterHeaderInner() {
    const hdrInner = document.querySelector('#app header .header__inner');
    if (!hdrInner) return false;
    const el = document.getElementById(UI_ID) || buildUI();
    hdrInner.insertAdjacentElement('afterend', el); // sibling to header__inner
    document.body.classList.add('sc-hideShortTracks-fallback'); // <-- per your request
    return true;
  }
  function initMounting() {
    // fallback after 500ms if #mdb-streamActions not there yet
    setTimeout(() => {
      if (!document.getElementById(UI_ID) && !document.querySelector('#mdb-streamActions')) {
        insertAfterHeaderInner();
      }
    }, 500);
    // preferred mount via waitForKeyElements (move UI if needed)
    /* global waitForKeyElements */
    waitForKeyElements('#mdb-streamActions', ($c) => {
      const node = $c instanceof Element ? $c : $c[0];
      if (node) {
        mountInto(node);
        document.body.classList.remove('sc-hideShortTracks-fallback');
      }
    });
  }

  function updateHint(){
    const el = document.getElementById('sc-hide-short-hint');
    if (!el) return;
    const paused = STATE.pausedUntil && now() < STATE.pausedUntil;
    const capped = STATE.resolvesDone >= PAGE_RESOLVE_CAP;
    el.textContent =
      `cache:${Object.keys(STATE.cache).length} • resolves:${STATE.resolvesDone}/${PAGE_RESOLVE_CAP}` +
      (paused ? ' • paused' : '') +
      (capped ? ' • cap reached' : '') +
      (STATE.clientId ? ' • cid:✓' : '');
  }

  // ---------- cards & evaluation ----------
  function getTrackCards(root=document){
    return Array.from(new Set([
      ...qsa('article[aria-label="Track"]', root),
      ...qsa('article[data-testid*="track"]', root),
      ...qsa('.lazyLoadingList__item article', root),
      ...qsa('li.soundList__item', root),
    ]));
  }
  function getCardUrl(card){
    for (const a of qsa('a[href]', card)){
      const href = a.getAttribute('href') || a.href || '';
      if (!href) continue;
      if (/^https?:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(href) || /^\/[^/]+\/[^/]+/.test(href)){
        return norm(href.startsWith('http') ? href : location.origin + href);
      }
    }
    return null;
  }
  function getTitle(card, url){
    const t =
      card.querySelector('[itemprop="name"]')?.textContent ||
      card.querySelector('[data-testid*="trackTitle"]')?.textContent ||
      card.querySelector('a[title][href*="/"]')?.getAttribute('title') || '';
    if (t) return t.trim().replace(/\s+/g,' ');
    if (!url) return '(untitled)';
    try{ return decodeURIComponent(url.split('/').pop()); }catch{ return url.split('/').pop(); }
  }
  function thresholdMs(){ return STATE.thresholdMin * 60 * 1000; }
  function isVisible(el){
    const r = el.getBoundingClientRect();
    const h = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > 0 && r.top < h;
  }
  function scheduleRecheck(card, delay=1600){
    setTimeout(()=>{ if (isVisible(card)) evaluateCard(card); }, delay);
  }

  async function resolveViaWidget(url){
    try{
      const ep = `https://api-widget.soundcloud.com/resolve?url=${encodeURIComponent(url)}`;
      const r = await fetch(ep, { credentials: 'omit' });
      if (!r.ok) return null;
      const data = await r.json();
      if (Number.isFinite(data?.duration)) return data.duration;
      if (Number.isFinite(data?.track?.duration)) return data.track.duration;
      if (Array.isArray(data?.tracks) && Number.isFinite(data.tracks[0]?.duration)) return data.tracks[0].duration;
      return null;
    }catch{ return null; }
  }
  async function resolveViaApi(url){
    const cid = (await ensureClientId()) || STATE.clientId;
    if (!cid) return null;
    const ep = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${cid}`;
    const r = await fetch(ep, { credentials: 'omit' });
    if (r.status === 429){
      STATE.pausedUntil = now() + 30000; // 30s
      updateHint();
      return null;
    }
    if (!r.ok) return null;
    const data = await r.json();
    return Number.isFinite(data?.duration) ? data.duration : null;
  }
  async function resolveOnce(url){
    if (!url) return null;
    const cached = STATE.cache[url];
    if (cached) {
      if (cached.ms != null) return cached.ms;
      if (cached.neg) return null;
    }
    if (STATE.resolvesDone >= PAGE_RESOLVE_CAP) return null;
    if (now() < STATE.pausedUntil) return null;
    if (STATE.inflight) return null;

    STATE.inflight = true;
    const wait = Math.max(0, STATE.lastReq + REQ_INTERVAL_MS - now());
    await new Promise(r=>setTimeout(r, wait));
    STATE.lastReq = now();

    let ms = null;
    try {
      ms = await resolveViaWidget(url);
      if (ms == null) ms = await resolveViaApi(url);

      if (ms != null) {
        STATE.resolvesDone++;
        STATE.cache[url] = { ms, t: now() };
      } else {
        STATE.cache[url] = { ms: null, t: now(), neg: true };
      }
      saveCache();
      updateHint();
      return ms;
    } catch { return null; }
    finally { STATE.inflight = false; }
  }

  async function evaluateCard(card){
    if (!isEnabled() || !isVisible(card)) return;

    const url = getCardUrl(card);
    if (!url) return;

    let ms = STATE.cache[url]?.ms ?? null;
    const canRetry = !STATE.cache[url]?.neg;

    if (ms == null && canRetry && !STATE.pendingCards.has(card)){
      STATE.pendingCards.add(card);
      const got = await resolveOnce(url);
      STATE.pendingCards.delete(card);
      if (got == null) scheduleRecheck(card); else ms = got;
    }

    const title = getTitle(card, url);
    const mmss = msToMMSS(ms);
    const hide = ms != null && ms < thresholdMs();
    if (hide) card.setAttribute('data-sc-too-short','1');
    else card.removeAttribute('data-sc-too-short');

    console.log(`[SC hide short] ${title} — ${mmss}${ms!=null?` (${ms}ms)`:''} ${hide?'→ HIDE':'→ keep'}`);
  }

  // ---------- processing & observers ----------
  let rafPending = false;
  function refreshVisible(){
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      getTrackCards().forEach(c => { if (isVisible(c)) evaluateCard(c); });
    });
  }
  function attachIO(){
    if (STATE.io) return;
    STATE.io = new IntersectionObserver((entries)=>{
      if (!isEnabled()) return;
      for (const e of entries) if (e.isIntersecting) evaluateCard(e.target);
    }, { root:null, rootMargin:'120px', threshold:0.01 });
    getTrackCards().forEach(c => STATE.io.observe(c));
  }
  function observeDOM(){
    const debounce = ((t)=>fn=>{ clearTimeout(t.id); t.id=setTimeout(fn,120); })({id:0});
    const mo = new MutationObserver(() => debounce(() => { attachIO(); refreshVisible(); }));
    mo.observe(document.body || document.documentElement, { childList:true, subtree:true });

    // SPA route changes
    let last = location.href;
    setInterval(() => {
      if (location.href !== last) {
        last = location.href;
        STATE.resolvesDone = 0;
        STATE.pausedUntil = 0;
        if (isEnabled()) refreshVisible();
        updateHint();
      }
    }, 600);
  }

  // ---------- boot ----------
  harvestHydration();
  installNetworkHooks();
  initMounting();              // ⟵ fallback-in-500ms + waitForKeyElements(#mdb-streamActions)
  attachIO();
  observeDOM();
})();
