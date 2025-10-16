// ==UserScript==
// @name         SoundCloud: Hide short tracks (Beta) (by MixesDB)
// @author       User:Martin@MixesDB (Subfader@GitHub)
// @version      2025.10.16.1
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


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Load @ressource files with variables
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var cacheVersion = 13,
	scriptName = "SoundCloud/HideShortTracks";

//loadRawCss( githubPath_raw + "includes/global.css?v-" + scriptName + "_" + cacheVersion );
loadRawCss( githubPath_raw + scriptName + "/script.css?v-" + cacheVersion );

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Main
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

(() => {
	// ---------- Config ----------
	const DEFAULT_MIN = 20;                  // minutes
	const MAX_MINUTES = 180;                 // upper bound for slider/setting
	const PAGE_RESOLVE_CAP = 40;             // max resolve calls per SPA page
	const REQ_INTERVAL_MS = 1500;            // spacing between resolve calls
	const CACHE_TTL  = 7 * 24 * 3600 * 1e3;  // 7d positive cache
	const NEG_TTL    = 10 * 60 * 1000;       // 10m negative cache
	const LS_CACHE   = 'sc_hide_short_cache_v6';
	const LS_SETT    = 'sc_hide_short_settings_v1';
	const UI_ID      = 'sc-hide-short-ui-wrap';
	const CHECKED_CLASS = 'sc-checked';
	const TOO_SHORT_ATTR = 'data-sc-too-short';

	// ---------- State ----------
	const STATE = {
			thresholdMin: DEFAULT_MIN,
			clientId: null,
		cache: loadCache(),           // { url: { ms:number|null, t:ts, neg?:true } }
		resolvesDone: 0,
		lastReq: 0,
		inflight: new Map(),          // url -> Promise<number|null>
		pausedUntil: 0,
		io: null,
	};

	  // ---------- Utils ----------
	const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));
	const now = ()=>Date.now();
	const isEnabled = ()=>document.documentElement.classList.contains('sc-hide-short-active');
	const norm = u=>{ try{ const x=new URL(u, location.origin); return x.origin+x.pathname.replace(/\/+$/,''); } catch{ return (u||'').split('#')[0].split('?')[0]; } };
	const msToMMSS = ms=>{ if(ms==null) return '—:——'; const s=(ms/1000)|0, m=(s/60)|0; return `${m}:${String(s%60).padStart(2,'0')}`; };
	const thresholdMs = ()=>STATE.thresholdMin * 60 * 1000;
	const clampMin = m => Math.min(MAX_MINUTES, Math.max(20, Math.round(parseInt(m,10) || DEFAULT_MIN)));

	function saveCache(){ try{ localStorage.setItem(LS_CACHE, JSON.stringify(STATE.cache)); }catch{} }
	function loadCache(){
		try{
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
	function loadSettings(){
		try{
			const s = JSON.parse(localStorage.getItem(LS_SETT) || 'null');
			if (!s || typeof s.enabled !== 'boolean') return null;
			return { enabled: !!s.enabled, min: clampMin(s.min) };
		}catch{ return null; }
	}
	function saveSettings(enabled, min){
		try{ localStorage.setItem(LS_SETT, JSON.stringify({ enabled, min: clampMin(min) })); }catch{}
	}

	  // ---------- UI (linear slider 20–180 + live text) ----------
	function buildUI() {
		let wrap = document.getElementById(UI_ID);
		if (wrap) return wrap;

		wrap = document.createElement('div');
		wrap.id = UI_ID;
		wrap.innerHTML = `
		  <label>
			<input id="sc-hide-short-checkbox" type="checkbox">
			<span>Hide short tracks &lt;<span id="sc-hide-short-val">20</span></span>
		  </label>

		  <input id="sc-hide-short-slider" type="range" min="20" max="${MAX_MINUTES}" step="1" style="width:120px">

		  <!-- keep original numeric input, hidden but present -->
		  <span style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
			<input id="sc-hide-short-minutes" type="number" maxlength="3" min="1">
		  </span>

		  <span id="sc-hide-short-hint" class="sc-hide-short-hint"></span>
		`;
		wireUI(wrap);
		return wrap;
	}

	function setMinutesDisplay(m, cb, slider, minInput, valText){
		m = clampMin(m);
		STATE.thresholdMin = m;
		valText.textContent = String(m);
		minInput.value = String(m);
		if (slider.value !== String(m)) slider.value = String(m);
		saveSettings(cb.checked, m);
	}

	function getAllTrackCards(root=document){
		return Array.from(new Set([
			...root.querySelectorAll('article[aria-label="Track"]'),
			...root.querySelectorAll('article[data-testid*="track"]'),
			...root.querySelectorAll('li.soundList__item'),
			...root.querySelectorAll('.lazyLoadingList__item article'),
			...root.querySelectorAll('.searchItem'),
		]));
	}

	function asCard(el){
		return el.closest('article, li.soundList__item, .lazyLoadingList__item, .searchItem, .soundList__item') || el;
	}

	function wireUI(root){
		const cb   = root.querySelector('#sc-hide-short-checkbox');
		const sl   = root.querySelector('#sc-hide-short-slider');
		const minI = root.querySelector('#sc-hide-short-minutes');
		const valT = root.querySelector('#sc-hide-short-val');

		const saved = loadSettings();
		setMinutesDisplay(saved ? saved.min : DEFAULT_MIN, {checked: !!(saved && saved.enabled)}, sl, minI, valT);
		cb.checked = !!(saved && saved.enabled);
		document.documentElement.classList.toggle('sc-hide-short-active', cb.checked);

			// Debounce reset to avoid hammering while dragging
		let t;
		const debouncedReset = () => {
			clearTimeout(t);
			t = setTimeout(() => {
				resetAll();
				updateHint?.();
			}, 150);
		};

			// Slider: live preview while dragging, debounced reset
		sl.addEventListener('input', () => {
			setMinutesDisplay(sl.value, cb, sl, minI, valT);
			if (cb.checked) debouncedReset();
		});

			// Slider: final immediate reset on release
		sl.addEventListener('change', () => {
			setMinutesDisplay(sl.value, cb, sl, minI, valT);
			if (cb.checked) { clearTimeout(t); resetAll(); }
			updateHint?.();
		});

			// Number input: immediate reset
		minI.addEventListener('change', () => {
			setMinutesDisplay(minI.value, cb, sl, minI, valT);
			if (cb.checked) { clearTimeout(t); resetAll(); }
			updateHint?.();
		});

			// Enable/disable: always reset so hidden items unhide when turning off
		cb.addEventListener('change', () => {
			document.documentElement.classList.toggle('sc-hide-short-active', cb.checked);
			saveSettings(cb.checked, STATE.thresholdMin);
			clearTimeout(t);
			resetAll();
			updateHint?.();
		});

		updateHint?.();
	}

	function mountUI(){
		// fallback after 500ms
		setTimeout(()=>{
			if(!document.getElementById(UI_ID) && !document.querySelector('#mdb-streamActions')){
				const hdr = document.querySelector('#app header .header__inner');
				if(hdr){
					const el = document.getElementById(UI_ID) || buildUI();
					hdr.insertAdjacentElement('afterend', el);
					document.body.classList.add('sc-hideShortTracks-fallback');
				}
			}
		}, 500);

		// preferred mount
		/* global waitForKeyElements */
		waitForKeyElements('#mdb-streamActions', ($c) => {
			const node = $c instanceof Element ? $c : $c[0];
			if (node) {
				const el = document.getElementById(UI_ID) || buildUI();
				node.appendChild(el);
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

	  // ---------- Track discovery ----------
	function getCards(root=document){
		return Array.from(new Set([
			...qsa('article[aria-label="Track"]:not(.'+CHECKED_CLASS+')', root),
			...qsa('article[data-testid*="track"]:not(.'+CHECKED_CLASS+')', root),
			...qsa('.lazyLoadingList__item article:not(.'+CHECKED_CLASS+')', root),
			...qsa('li.soundList__item:not(.'+CHECKED_CLASS+')', root),
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
		return (t && t.trim()) || (url ? decodeURIComponent(url.split('/').pop()||'') : '(untitled)');
	}
	function isInView(el){
		const r=el.getBoundingClientRect();
		return r.bottom>0 && r.top<(window.innerHeight||document.documentElement.clientHeight);
	}

	  // ---------- Client ID sniff + JSON harvest ----------
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

	  // ---------- Stable duration resolve (in-flight dedupe) ----------
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
		  STATE.pausedUntil = now() + 30000; // 30s cooldown
		  updateHint();
		  return null;
		}
		if (!r.ok) return null;
		const data = await r.json();
		return Number.isFinite(data?.duration) ? data.duration : null;
	}

	async function getDuration(url){
		const c = STATE.cache[url];
		if (c) { if (c.ms != null) return c.ms; if (c.neg) return null; }

		if (STATE.resolvesDone >= PAGE_RESOLVE_CAP) return null;
		if (now() < STATE.pausedUntil) return null;

		if (STATE.inflight.has(url)) return STATE.inflight.get(url);

		const p = (async () => {
			const wait = Math.max(0, STATE.lastReq + REQ_INTERVAL_MS - now());
			if (wait) await new Promise(r=>setTimeout(r, wait));
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
			updateHint();
		  return STATE.cache[url].ms; // may be null
		})();

		STATE.inflight.set(url, p);
		try { return await p; }
		finally { STATE.inflight.delete(url); }
	}

	  // ---------- Evaluation (mark .sc-checked only after stable result) ----------
	async function evaluateCard(card){
		if (!isEnabled() || card.classList.contains(CHECKED_CLASS)) return;
		if (!isInView(card)) return;

		if (card.dataset.scProcessing === '1') return;
		card.dataset.scProcessing = '1';

		const url = getCardUrl(card);
		if (!url) { card.dataset.scProcessing = ''; return; }

		let ms = STATE.cache[url]?.ms ?? null;
		if (ms == null && !STATE.cache[url]?.neg) {
		  ms = await getDuration(url); // null if negative-cached or capped/cooldown
		}

		const haveStable = (ms != null) || !!STATE.cache[url]?.neg;

		if (haveStable) {
			const hide = (ms != null) && (ms < thresholdMs());
			if (hide) card.setAttribute(TOO_SHORT_ATTR,'1'); else card.removeAttribute(TOO_SHORT_ATTR);

			const title = getTitle(card, url);
			console.log(`[SC hide short] ${title} — ${msToMMSS(ms)}${ms!=null?` (${ms}ms)`:''} ${hide?'→ HIDE':'→ keep'}`);

			card.classList.add(CHECKED_CLASS);
		} else {
			setTimeout(() => { evaluateCard(card); }, 1600);
		}

		card.dataset.scProcessing = '';
	}

	  // ---------- Process orchestration ----------
	let rafPending=false;
	function refreshVisible(){
		if(rafPending) return;
		rafPending = true;
		requestAnimationFrame(()=>{
			rafPending = false;
			getCards().forEach(c => { if (isInView(c)) evaluateCard(c); });
		});
	}

	function attachIO(){
		if (STATE.io) return;
		STATE.io = new IntersectionObserver((entries)=>{
			if (!isEnabled()) return;
			for (const e of entries) {
				if (e.isIntersecting && !e.target.classList.contains(CHECKED_CLASS)) evaluateCard(e.target);
			}
		}, { root:null, rootMargin:'150px', threshold:0.01 });
		getCards().forEach(c => STATE.io.observe(c));
	}

	function observeDOM(){
		const mo=new MutationObserver(()=>refreshVisible());
		mo.observe(document.body || document.documentElement, { childList:true, subtree:true });

		// SPA route changes
		let last = location.href;
		setInterval(() => {
			if (location.href !== last) {
				last = location.href;
				STATE.resolvesDone = 0;
				STATE.pausedUntil = 0;
				STATE.inflight.clear();
				resetAll();
				updateHint();
			}
		}, 600);
	}

	function resetAll(){
		getAllTrackCards().forEach(c => {
			c.classList.remove('sc-checked');
			const node = asCard(c);
			node.removeAttribute('data-sc-too-short');
			node.style.display = '';
		});
		if (STATE.io) { try { STATE.io.disconnect(); } catch {} }
		STATE.io = null;
		attachIO();
		refreshVisible();
	}


	  // ---------- Hydration seed (cheap) ----------
	function harvestHydration(){
		const h = window.__sc_hydration;
		if (!Array.isArray(h)) return;
		let added = 0;
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

	// ---------- Boot ----------
	harvestHydration();
	installNetworkHooks();
	mountUI();
	attachIO();
	observeDOM();
	refreshVisible();
})();