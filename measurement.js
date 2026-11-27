(function (root) {
  'use strict';
  const prefix = 'charlie-storefront-measurement-v1:';
  const inactivity = 30 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  const visitorLifetime = 90 * day;
  const productPattern = /^[a-zA-Z0-9_-]{1,64}$/;
  const visitorPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const allowedSources = ['direct_unknown','search','social','campaign','other'];
  const allowedDevices = ['phone','desktop','other'];
  const safeHosts = {
    search: ['google.com', 'google.co.il', 'bing.com', 'duckduckgo.com'],
    social: ['facebook.com', 'instagram.com', 'tiktok.com', 'whatsapp.com', 'wa.me'],
  };
  function sourceFor(href, referrer) {
    const location = new URL(href);
    const medium = location.searchParams.get('utm_medium')?.toLowerCase();
    if (['cpc','email','paid_social','campaign'].includes(medium)) return 'campaign';
    try {
      const ref = new URL(referrer);
      if (ref.origin === location.origin) return 'direct_unknown';
      for (const [group, hosts] of Object.entries(safeHosts)) {
        if (hosts.some(host => ref.hostname === host || ref.hostname.endsWith('.' + host))) return group;
      }
      return 'other';
    } catch { return 'direct_unknown'; }
  }

  function create(options) {
    const { endpoint, storage, send, uuid, now, source, device, gpc } = options;
    const read = key => { try { return storage.getItem(prefix + key); } catch { return null; } };
    const write = (key, value) => {
      try {
        if (value === null) storage.removeItem(prefix + key);
        else storage.setItem(prefix + key, value);
        return true;
      } catch { return false; }
    };
    let consentOverride;
    let staffOverride;
    const consent = () => consentOverride ?? read('consent');
    const internal = () => staffOverride ?? (read('staff') === 'true');
    let queue = [];
    let active = null;
    let retryTimer;
    let observer;
    let cards;
    let visible = new Map();
    let visitViews = new Set();
    let visitStamp;
    const permitted = () => Boolean(endpoint) && !gpc() && !internal() && consent() === 'yes';

    function clearTracking() {
      write('visitor', null);
      write('visit', null);
      queue = [];
      active?.abort();
      active = null;
      clearTimeout(retryTimer);
      retryTimer = undefined;
      visitViews = new Set();
      visitStamp = undefined;
    }
    function pauseObservation() {
      observer?.disconnect();
      observer = undefined;
      for (const timer of visible.values()) clearTimeout(timer);
      visible = new Map();
    }
    function applyPreference() {
      if (!permitted()) {
        clearTracking();
        pauseObservation();
      } else {
        track('visit_start');
        observeCards();
      }
    }
    function setConsent(yes) {
      const choice = yes ? 'yes' : 'no';
      consentOverride = write('consent', choice) ? undefined : 'no';
      applyPreference();
    }
    function setStaff(yes) {
      staffOverride = write('staff', yes ? 'true' : null) ? undefined : true;
      applyPreference();
    }


    function enqueue(kind, visitorId, meta, fields = {}) {
      if (queue.length >= 32) return;
      const event = { eventId: uuid(), visitorId, kind, source: meta.source, device: meta.device, consent: true, ...fields };
      queue.push({ event, attempts: 0 });
    }
    function track(kind, value) {
      if (!permitted()) return;
      if ((kind === 'product_view' || kind === 'add_to_cart') && (typeof value !== 'string' || !productPattern.test(value))) return;
      if (kind === 'whatsapp_click' && !['cart','direct'].includes(value)) return;
      if (!['visit_start','product_view','add_to_cart','whatsapp_click'].includes(kind)) return;
      const time = now();
      let visitor;
      try { visitor = JSON.parse(read('visitor')); } catch {  }
      if (!visitorPattern.test(visitor?.id ?? '') || !Number.isFinite(visitor?.createdAt) ||
          time < visitor.createdAt || time - visitor.createdAt >= visitorLifetime) {
        clearTracking();
        visitor = { id: uuid(), createdAt: time };
        if (!write('visitor', JSON.stringify(visitor))) return;
      }
      const visitorId = visitor.id;
      let meta;
      try { meta = JSON.parse(read('visit')); } catch {  }
      if (!meta || !Number.isFinite(meta.started) || !Number.isFinite(meta.last) ||
          !allowedSources.includes(meta.source) || !allowedDevices.includes(meta.device) ||
          time < meta.last || time - meta.last >= inactivity || time - meta.started >= day) {
        meta = { started: time, last: time, source: allowedSources.includes(source) ? source : 'direct_unknown',
          device: allowedDevices.includes(device) ? device : 'other' };
        if (!write('visit', JSON.stringify(meta))) return;
        enqueue('visit_start', visitorId, meta);
      } else if (kind !== 'visit_start') {
        meta.last = time;
        write('visit', JSON.stringify(meta));
      }
      if (visitStamp !== meta.started) { visitViews = new Set(); visitStamp = meta.started; }
      if (kind === 'product_view' && visitViews.has(value)) return;
      if (kind === 'product_view') visitViews.add(value);
      if (kind !== 'visit_start') {
        const fields = kind === 'whatsapp_click' ? { route: value } : { productId: value };
        enqueue(kind, visitorId, meta, fields);
      }
      void drain();
    }

    async function drain() {
      if (active || retryTimer || !permitted()) return;
      const job = queue[0];
      if (!job) return;
      let visitor;
      try { visitor = JSON.parse(read('visitor')); } catch {  }
      if (visitor?.id !== job.event.visitorId || !Number.isFinite(visitor.createdAt) ||
          now() < visitor.createdAt || now() - visitor.createdAt >= visitorLifetime) {
        queue = [];
        return;
      }
      const controller = new AbortController();
      active = controller;
      let delay = 0;
      try {
        job.attempts++;
        const response = await send(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(job.event), keepalive: true, credentials: 'omit',
          redirect: 'error', referrerPolicy: 'no-referrer',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]),
        });
        const retryAfter = response.headers.get('Retry-After');
        if (job.attempts < 2 && response.status === 429 && retryAfter && /^[1-9][0-9]?$/.test(retryAfter)) {
          delay = Math.min(60, Number(retryAfter)) * 1000;
        }
      } catch {  }
      finally {
        if (active === controller) {
          active = null;
          if (!delay) queue.shift();
          if (delay && permitted()) retryTimer = setTimeout(() => { retryTimer = undefined; void drain(); }, delay);
          else if (permitted()) void drain();
        }
      }
    }

    function observeCards() {
      pauseObservation();
      const doc = options.document;
      if (!cards || !permitted() || !doc || doc.visibilityState === 'hidden' || !options.Observe) return;
      observer = new options.Observe(entries => {
        if (doc.visibilityState === 'hidden' || !permitted()) return;
        for (const entry of entries) {
          const card = entry.target;
          if (!entry.isIntersecting || entry.intersectionRatio < .5) {
            clearTimeout(visible.get(card));
            visible.delete(card);
          } else if (!visible.has(card)) {
            visible.set(card, setTimeout(() => {
              if (card.isConnected && visible.has(card) && doc.visibilityState !== 'hidden') track('product_view', card.dataset.analyticsProduct);
            }, 1000));
          }
        }
      }, { threshold: .5 });
      cards.querySelectorAll('[data-analytics-product]').forEach(card => observer.observe(card));
    }
    if (!permitted()) clearTracking();
    else track('visit_start');
    options.document?.addEventListener('visibilitychange', observeCards);
    options.onStorage?.(event => {
      if (event.key === null || event.key === prefix + 'consent' || event.key === prefix + 'staff') applyPreference();
    });
    return { track, setConsent, setStaff, state: () => ({ consent: consent(), staff: internal(), gpc: gpc() }),
      renderCards: element => { cards = element; observeCards(); } };
  }

  function mount(endpoint) {
    let storage;
    try { storage = root.localStorage; } catch { storage = { getItem: () => null, setItem() { throw Error('Storage unavailable'); }, removeItem() {} }; }
    const measurement = create({
      endpoint, storage, send: (...args) => root.fetch(...args),
      uuid: () => root.crypto.randomUUID(), now: Date.now,
      source: sourceFor(root.location.href, root.document.referrer),
      device: root.matchMedia('(max-width: 767px) and (pointer: coarse)').matches ? 'phone'
        : root.matchMedia('(pointer: fine)').matches ? 'desktop' : 'other',
      gpc: () => root.navigator.globalPrivacyControl === true,
      document: root.document, Observe: root.IntersectionObserver,
      onStorage: callback => root.addEventListener('storage', callback),
    });
    const box = root.document.querySelector('#measurementPreferences');
    const open = root.document.querySelector('#measurementOpen');
    const status = box.querySelector('[role=status]');
    const staff = box.querySelector('input');
    const hide = () => { box.hidden = true; open.setAttribute('aria-expanded', 'false'); };
    let copy;
    function sync() {
      if (!copy) return;
      const state = measurement.state();
      staff.checked = state.staff;
      box.querySelector('[data-metrics-deny]').textContent = state.consent === 'yes' ? copy.withdraw : copy.deny;
      box.querySelector('[data-metrics-allow]').disabled = state.gpc;
      status.textContent = state.gpc ? copy.gpc : state.staff ? copy.internal :
        state.consent === 'yes' ? copy.yes : state.consent === 'no' ? copy.no : copy.pending;
    }
    function localize(labels, language) {
      copy = labels;
      box.lang = open.lang = language;
      box.dir = open.dir = language === 'he' ? 'rtl' : 'ltr';
      open.textContent = box.querySelector('#measurementTitle').textContent = labels.prefs;
      box.querySelector('#measurementNotice').textContent = labels.notice + ' ' + labels.choice;
      box.querySelector('[data-metrics-details]').textContent = labels.details;
      box.querySelector('a[href*="privacy"]').textContent = labels.privacy;
      box.querySelector('[data-metrics-staff]').textContent = labels.staff;
      box.querySelector('[data-metrics-allow]').textContent = labels.allow;
      sync();
    }
    open.hidden = false;
    box.hidden = measurement.state().consent !== null || measurement.state().gpc;
    open.setAttribute('aria-expanded', String(!box.hidden));
    open.onclick = () => {
      box.hidden = !box.hidden;
      open.setAttribute('aria-expanded', String(!box.hidden));
      if (!box.hidden) box.focus();
    };
    box.querySelector('[data-metrics-allow]').onclick = () => { measurement.setConsent(true); sync(); hide(); open.focus(); };
    box.querySelector('[data-metrics-deny]').onclick = () => { measurement.setConsent(false); sync(); hide(); open.focus(); };
    staff.onchange = () => { measurement.setStaff(staff.checked); sync(); };
    root.addEventListener('storage', sync);
    return { ...measurement, localize };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { create, sourceFor, prefix };
  else root.CharlieMeasurement = { mount };
})(typeof window === 'undefined' ? globalThis : window);
