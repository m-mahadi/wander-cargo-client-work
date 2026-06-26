gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

/* ============ Smooth scroll (Lenis) wired into GSAP ============ */
const lenis = new Lenis({ duration: 0.85, smoothWheel: true, wheelMultiplier: 1.1 });
window.lenis = lenis; // exposed for tooling/debug
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

/* progress bar + nav state */
const nav = document.getElementById('nav');
const bar = document.getElementById('progress');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const getAnchorOffset = () => {
  const cssOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset'));
  return Number.isFinite(cssOffset) ? cssOffset : 80;
};
const easeOutExpo = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
lenis.on('scroll', ({ scroll, limit }) => {
  bar.style.width = (limit ? (scroll / limit) * 100 : 0) + '%';
  nav.classList.toggle('scrolled', scroll > 40);
});

let anchorScrolling = false;
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    e.preventDefault();
    history.pushState(null, '', `#${id}`);
    anchorScrolling = true;
    lenis.scrollTo(target, {
      offset: -getAnchorOffset(),
      duration: 0.95,
      easing: easeOutExpo,
    });
    window.setTimeout(() => { anchorScrolling = false; }, 1100);
  });
});

/* ============ Panel pager: one smooth move per wheel gesture ============ */
const panelSelector = [
  '.hero',
  '.origin',
  '.world',
  '.services',
  '.why',
  '.about',
  '.gallery',
  '.coverage',
  '.cta-band',
  '.contact',
].join(',');

let panelPaging = false;
let wheelIntent = 0;
let wheelResetTimer;

const canUsePanelPager = () => !reduceMotion.matches && window.innerWidth >= 760;
const getPanels = () => gsap.utils.toArray(panelSelector)
  .filter((panel) => getComputedStyle(panel).display !== 'none');

const getPanelY = (panel) => Math.max(0, panel.getBoundingClientRect().top + window.scrollY - getAnchorOffset());

const getCurrentPanelIndex = (panels) => {
  const currentY = window.scrollY;
  let currentIndex = 0;
  let closestDistance = Infinity;

  panels.forEach((panel, index) => {
    const distance = Math.abs(getPanelY(panel) - currentY);
    if (distance < closestDistance) {
      closestDistance = distance;
      currentIndex = index;
    }
  });

  return currentIndex;
};

const pageToPanel = (index) => {
  const panels = getPanels();
  if (!panels.length) return;

  const targetIndex = gsap.utils.clamp(0, panels.length - 1, index);
  const targetY = getPanelY(panels[targetIndex]);
  if (Math.abs(window.scrollY - targetY) < 3) return;

  panelPaging = true;
  lenis.scrollTo(targetY, {
    duration: 0.95,
    easing: easeOutExpo,
  });
  window.setTimeout(() => { panelPaging = false; }, 1050);
};

const pageByGesture = (direction) => {
  const panels = getPanels();
  if (!panels.length || panelPaging) return;

  pageToPanel(getCurrentPanelIndex(panels) + direction);
};

window.addEventListener('wheel', (e) => {
  if (!canUsePanelPager() || anchorScrolling || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

  if (panelPaging) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }

  const direction = e.deltaY > 0 ? 1 : -1;
  const panels = getPanels();
  if (!panels.length) return;

  const currentIndex = getCurrentPanelIndex(panels);
  const currentPanelY = getPanelY(panels[currentIndex]);
  if (Math.abs(window.scrollY - currentPanelY) > 18) return;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= panels.length) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  wheelIntent += e.deltaY;
  window.clearTimeout(wheelResetTimer);
  wheelResetTimer = window.setTimeout(() => { wheelIntent = 0; }, 180);

  if (Math.abs(wheelIntent) < 18) return;
  wheelIntent = 0;
  pageToPanel(targetIndex);
}, { passive: false, capture: true });

window.addEventListener('load', () => {
  ScrollTrigger.refresh();
});

/* ============ Hero photo (swaps in when img/hero-ship.jpg exists) ============ */
(function () {
  const test = new Image();
  test.onload = () => {
    const bg = document.querySelector('.hero-bg');
    bg.style.setProperty('--hero-photo', "url('img/hero-ship.jpg')");
    bg.classList.add('has-photo');
  };
  test.src = 'img/hero-ship.jpg';
})();

/* ============ Hero load reveal ============ */
gsap.timeline({ delay: 0.15 })
  .from('.hero-title .line > span', { yPercent: 115, duration: 1.1, stagger: 0.1, ease: 'power4.out' })
  .from('.hero .kicker', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.2)
  .from('.hero-sub', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.7')
  .from('.hero-cta', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
  .from('.manifest', { opacity: 0, duration: 1 }, '-=0.6');

/* ============ World routes animation (centerpiece) ============ */
(function () {
  const layer = document.getElementById('routeLayer');
  if (!layer) return;
  const NS = 'http://www.w3.org/2000/svg';
  // coordinates in the world map's 1010x666 viewBox (tuned to the map)
  // China shipping hubs (origins) — east-coast cities, on the map's 1010x666 viewBox.
  const hubs = [
    { x: 814, y: 362 },   // Shanghai
    { x: 817, y: 369 },   // Ningbo
    { x: 809, y: 373 },   // Yiwu
    { x: 796, y: 394 },   // Shenzhen
  ];
  const origin = { x: 808, y: 374 };                 // hub cluster (arcs fan from here)
  // Destinations — country centres read straight from the map geometry
  const dests = [
    { x: 728, y: 395 },              // Bangladesh
    { x: 707, y: 400 },              // India
    { x: 806, y: 470 },              // Indonesia / SE Asia
    { x: 856, y: 545 },              // Australia
    { x: 626, y: 393 },              // UAE / Gulf
    { x: 574, y: 344 },              // Turkey
    { x: 561, y: 385 },              // Egypt / N. Africa
    { x: 499, y: 437 },              // Nigeria / W. Africa
    { x: 551, y: 545 },              // South Africa
    { x: 510, y: 333 },              // Italy
    { x: 504, y: 295 },              // Germany
    { x: 466, y: 274 },              // United Kingdom
    { x: 322, y: 506 },              // Brazil
    { x: 296, y: 587 },              // Argentina
    { x: 208, y: 322 },              // USA
    { x: 248, y: 236 },              // Canada
  ];

  const mk = (name, attrs) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const arcPath = (o, d) => {
    const mx = (o.x + d.x) / 2, my = (o.y + d.y) / 2;
    const lift = Math.hypot(d.x - o.x, d.y - o.y) * 0.32 + 14;
    return `M ${o.x} ${o.y} Q ${mx} ${my - lift} ${d.x} ${d.y}`;
  };

  const arcs = [], pins = [], flows = [];
  dests.forEach((d, i) => {
    const cls = d.main ? '' : ' dim';
    const hub = hubs[i % hubs.length];               // spread lanes across all 4 hubs, one dest per hub
    const p = mk('path', { d: arcPath(hub, d), class: 'route-arc' + cls, 'stroke-width': d.main ? 2.4 : 1.3 });
    layer.appendChild(p); arcs.push(p);
    const pin = mk('circle', { cx: d.x, cy: d.y, r: d.main ? 6 : 4.5, class: 'route-pin' + cls });
    layer.appendChild(pin); pins.push(pin);
    const flow = mk('circle', { r: d.main ? 4 : 3, class: 'route-flow', opacity: d.main ? 1 : 0.85 });
    layer.appendChild(flow); flows.push({ node: flow, path: p, main: d.main, i });
  });
  hubs.forEach((h) => { layer.appendChild(mk('circle', { cx: h.x, cy: h.y, r: 4.5, class: 'route-pin' })); });
  const ring = mk('circle', { cx: origin.x, cy: origin.y, r: 6, class: 'route-ring', 'stroke-width': 2 });
  layer.appendChild(ring);

  // prep draw-in
  arcs.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });

  // reveal on enter (no pin — works on every screen)
  ScrollTrigger.create({
    trigger: '.world', start: 'top 72%', once: true,
    onEnter: () => {
      gsap.to(arcs, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.12 });
      gsap.from(pins, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)', stagger: 0.12, delay: 0.5 });
      gsap.utils.toArray('.world-stats strong').forEach((s) => {
        gsap.to({ v: 0 }, { v: +s.dataset.count, duration: 1.6, ease: 'power2.out',
          onUpdate() { s.textContent = Math.round(this.targets()[0].v).toLocaleString('en-US'); } });
      });
    },
  });

  // continuous flow pulses travelling each lane
  flows.forEach((f) => {
    gsap.to(f.node, {
      duration: f.main ? 3.2 : 4 + (f.i % 3), repeat: -1, ease: 'none', delay: f.i * 0.45,
      motionPath: { path: f.path, align: f.path, alignOrigin: [0.5, 0.5] },
    });
  });

  // origin pulse (map stays still)
  gsap.fromTo(ring, { attr: { r: 6 }, opacity: 0.9 }, { attr: { r: 24 }, opacity: 0, duration: 1.9, repeat: -1, ease: 'power1.out' });
})();

/* ============ Reveal-on-scroll ============ */
gsap.utils.toArray('.reveal').forEach((el) => {
  gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' } });
});

/* ============ Quote form → WhatsApp ============ */
const WHATSAPP = '8615356985576';
document.getElementById('quoteForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const v = (id) => (f[id].value || '—').trim();
  const msg =
    `*New quote request — Wander Cargo*%0A` +
    `Name: ${encodeURIComponent(v('name'))}%0A` +
    `Mode: ${encodeURIComponent(v('mode'))}%0A` +
    `Pickup (China): ${encodeURIComponent(v('origin'))}%0A` +
    `Destination: ${encodeURIComponent(v('dest'))}%0A` +
    `Cargo/volume: ${encodeURIComponent(v('cargo'))}%0A` +
    `Notes: ${encodeURIComponent(v('notes'))}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank', 'noopener');
});
