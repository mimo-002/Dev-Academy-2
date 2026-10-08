/* =========================================================
   BODA ACADEMY — CINEMATIC ANIMATION ENGINE
   Pure vanilla JS. No dependencies. Respects reduced-motion.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = document.documentElement;
  const COLORS = ['#58a6ff', '#79c0ff', '#3fb950', '#fb8500', '#a371f7', '#f778ba', '#ffd60a'];

  let lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
  addEventListener('pointerdown', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; }, { passive: true });

  /* ---------------------------------------------------------
     1. SPLASH
     --------------------------------------------------------- */
  const splash = $('#cinema-splash');
  let rainRAF = 0, splashRunning = false, splashToken = 0;

  function buildTitle() {
    const t = $('.cs-title');
    if (!t) return;
    const text = 'BODA ACADEMY';
    t.setAttribute('data-text', text);
    t.innerHTML = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = ch === ' ' ? 'l sp' : 'l';
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      t.appendChild(s);
    });
  }

  function startRain() {
    const c = $('#cs-rain');
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const glyphs = ['{', '}', '<', '>', '/', ';', '=>', '()', '[]', 'fun', 'val', 'var', 'void', 'class', 'async', 'await', 'Widget', 'build', 'print', 'if', '0', '1'];
    let w, h, cols;
    function size() {
      w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
      const colW = (mobile ? 26 : 34) * dpr;
      cols = Array.from({ length: Math.ceil(w / colW) }, (_, i) => ({
        x: i * colW + colW / 2, y: -Math.random() * h, v: (0.8 + Math.random() * 2.2) * dpr,
        g: glyphs[(Math.random() * glyphs.length) | 0], t: 0,
      }));
    }
    size();
    addEventListener('resize', size);
    const fs = 14 * dpr;
    function frame() {
      ctx.fillStyle = 'rgba(5,8,13,0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fs}px "Fira Code", monospace`;
      ctx.textAlign = 'center';
      for (const col of cols) {
        col.y += col.v;
        if (++col.t % 14 === 0) col.g = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillStyle = '#d6ecff';
        ctx.fillText(col.g, col.x, col.y);
        ctx.fillStyle = 'rgba(88,166,255,.55)';
        ctx.fillText(glyphs[(col.t * 7) % glyphs.length], col.x, col.y - fs * 1.2);
        if (col.y > h + 60 * dpr) { col.y = -Math.random() * 200 * dpr; col.v = (0.8 + Math.random() * 2.2) * dpr; }
      }
      rainRAF = requestAnimationFrame(frame);
    }
    cancelAnimationFrame(rainRAF);
    frame();
  }

  async function type(el, html, speed = 24, token) {
    const plain = html.replace(/<[^>]+>/g, '');
    const caret = document.createElement('span');
    caret.className = 'cs-caret';
    for (let i = 1; i <= plain.length; i++) {
      if (token !== splashToken) return;
      el.textContent = plain.slice(0, i);
      el.appendChild(caret);
      await sleep(speed + Math.random() * 18);
    }
    el.innerHTML = html;
    el.appendChild(caret);
  }

  async function runTerminal(token) {
    const lines = $$('.cs-term .ln');
    const script = [
      '<span class="pr">$</span> flutter create boda_academy',
      '<b>✔</b> Compiling <em>15</em> lessons · 3 tracks',
      '<b>⚡</b> Hot reload ready — <b>0.4s</b>',
    ];
    await sleep(2150);
    for (let i = 0; i < script.length; i++) {
      if (token !== splashToken) return;
      lines.forEach((l) => { const c = $('.cs-caret', l); if (c) c.remove(); });
      await type(lines[i], script[i], i === 0 ? 30 : 16, token);
      await sleep(120);
    }
    lines.forEach((l) => { const c = $('.cs-caret', l); if (c && l !== lines[2]) c.remove(); });
  }

  function runProgress(token, duration) {
    const bar = $('.cs-bar i'), pct = $('.cs-pct');
    const start = performance.now() + 1400;
    return new Promise((resolve) => {
      (function tick(now) {
        if (token !== splashToken) return resolve();
        const p = Math.min(Math.max((now - start) / duration, 0), 1);
        const e = 1 - Math.pow(1 - p, 2.2);
        bar.style.transform = `scaleX(${e})`;
        pct.textContent = Math.round(e * 100) + '%';
        p < 1 ? requestAnimationFrame(tick) : resolve();
      })(performance.now());
    });
  }

  async function playSplash() {
    if (!splash || splashRunning) return;
    splashRunning = true;
    const token = ++splashToken;
    root.classList.remove('cinema-ready');
    root.classList.add('cinema-on');
    // reset
    splash.classList.remove('cs-gone', 'cs-exit', 'cs-leaving');
    const clone = splash.cloneNode(true);       // restart CSS animations cleanly
    splash.replaceWith(clone);
    splashRef = clone;
    buildTitle();
    wireSkip();
    $('.cs-bar i', clone).style.transform = 'scaleX(0)';
    startRain();
    const term = runTerminal(token);
    await Promise.race([runProgress(token, 3100), new Promise((r) => (skipResolve = r))]);
    await endSplash(token);
    await term;
  }

  let splashRef = splash, skipResolve = null;
  function wireSkip() {
    const b = $('.cs-skip', splashRef);
    if (b) b.addEventListener('click', () => skipResolve && skipResolve(), { once: true });
    addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { skipResolve && skipResolve(); removeEventListener('keydown', esc); }
    });
  }

  async function endSplash(token) {
    const el = splashRef;
    if (token !== splashToken) return;
    el.classList.add('cs-leaving');
    await sleep(520);
    el.classList.add('cs-exit');
    root.classList.add('cinema-ready');
    root.classList.remove('cinema-on');
    heroEnter();
    await sleep(1000);
    el.classList.add('cs-gone');
    cancelAnimationFrame(rainRAF);
    splashRunning = false;
  }

  /* ---------------------------------------------------------
     2. HERO STAGE (phone + orbits + code cards + stats)
     --------------------------------------------------------- */
  function buildHero() {
    const intro = $('#intro');
    if (!intro || $('.hero-stage')) return;
    const header = $('.section-header', intro);

    const orbit = (cls, slots) => `<div class="hs-orbit ${cls}">${slots.map(([a, c, g, label]) =>
      `<div class="hs-slot" style="--a:${a}deg"><div class="hs-badge ${c}" style="--a:${a}deg">${g}${label ? `<small>${label}</small>` : ''}</div></div>`).join('')}</div>`;

    const stage = document.createElement('div');
    stage.className = 'hero-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="hs-glow"></div>
      ${orbit('hs-o1', [[0, 'f', 'F', 'Flutter'], [180, 'd', 'D', 'Dart']])}
      ${orbit('hs-o2', [[90, 'k', 'K', 'Kotlin'], [270, 'g', '⚡', 'Hot Reload']])}
      ${orbit('hs-o3', [[40, 'o', '{ }', 'API'], [160, 'p', '◆', 'Widgets'], [300, 'g', '✓', 'Tests']])}
      <div class="hs-card hs-c1"><span class="in"><span class="c">// main.dart</span>
<span class="k">void</span> <span class="f">main</span>() {
  <span class="f">runApp</span>(<span class="k">const</span> <span class="t">BodaApp</span>());
}</span></div>
      <div class="hs-card hs-c2"><span class="in"><span class="k">class</span> <span class="t">Lesson</span> <span class="k">extends</span> <span class="t">StatelessWidget</span> {
  <span class="t">Widget</span> <span class="f">build</span>(ctx) =&gt;
    <span class="t">Text</span>(<span class="s">'مرحباً 👋'</span>);
}</span></div>
      <div class="hs-card hs-c3 hs-hot-toast"><span class="in hs-hot"><i></i><span>Hot reload <span class="hs-ok">✓ 0.4s</span></span></span></div>
      <div class="hs-phone">
        <div class="hs-notch"></div>
        <div class="hs-screen">
          <div class="hs-appbar"><span>BODA ACADEMY</span><i></i></div>
          <div class="hs-ring">
            <svg viewBox="0 0 100 100"><defs><linearGradient id="hsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#58a6ff"/><stop offset=".6" stop-color="#a371f7"/><stop offset="1" stop-color="#3fb950"/></linearGradient></defs>
              <circle class="bg" cx="50" cy="50" r="44"/><circle class="arc hs-arc-anim" cx="50" cy="50" r="44" pathLength="100"/></svg>
            <div class="hs-pct"><span id="hs-num">0</span><small>%</small></div>
          </div>
          <div class="hs-sub">PROGRESS</div>
          <div class="hs-rows">
            <div class="hs-row f" style="--k:0"><span class="ic">F</span><span class="tx"><b style="width:78%"></b><s></s></span><span class="ck">✓</span></div>
            <div class="hs-row k" style="--k:1"><span class="ic">K</span><span class="tx"><b style="width:64%"></b><s></s></span><span class="ck">✓</span></div>
            <div class="hs-row d" style="--k:2"><span class="ic">D</span><span class="tx"><b style="width:86%"></b><s></s></span><span class="ck">✓</span></div>
          </div>
          <div class="hs-fab">+</div>
        </div>
      </div>
      <div class="hs-shadow"></div>`;
    header.insertAdjacentElement('afterend', stage);

    const stats = document.createElement('div');
    stats.className = 'hero-stats';
    const data = [[3, 'مسارات تعليمية', 'var(--cx-blue)'], [15, 'درساً تفصيلياً', 'var(--cx-green)'], [4, 'مراحل تقييم', 'var(--cx-orange)'], [1, 'شهادة معتمدة', 'var(--cx-purple)']];
    stats.innerHTML = data.map(([n, l, c], k) => `<div class="hero-stat" style="--k:${k};--c:${c}"><span class="n" data-n="${n}">0</span><span class="l">${l}</span></div>`).join('');
    stage.insertAdjacentElement('afterend', stats);

    // mouse parallax
    if (!coarse) {
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        stage.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        stage.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      stage.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
    }

    // phone progress counter synced to the 9s CSS cycle
    const num = $('#hs-num', stage);
    const cycle = 9000;
    (function loop(now) {
      const p = (now % cycle) / cycle;
      let v = 0;
      if (p < 0.55) v = 78 * (1 - Math.pow(1 - p / 0.55, 3));
      else if (p < 0.88) v = 78;
      else v = 78 * (1 - (p - 0.88) / 0.12);
      num.textContent = Math.round(v);
      requestAnimationFrame(loop);
    })(performance.now());

    // stats count-up when visible
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add('in');
      const n = $('.n', e.target), to = +n.dataset.n, t0 = performance.now(), dur = 1400;
      (function up(now) {
        const p = Math.min((now - t0) / dur, 1);
        n.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(up);
      })(t0);
    }), { threshold: 0.4 });
    $$('.hero-stat', stats).forEach((s) => io.observe(s));
  }

  function heroEnter() { /* hero entrance is pure CSS, triggered by html.cinema-ready */ }

  /* ---------------------------------------------------------
     3. NETWORK BACKGROUND + SPOTLIGHT + SCROLL PROGRESS
     --------------------------------------------------------- */
  function initAmbient() {
    const net = document.createElement('canvas');
    net.id = 'cx-net';
    const spot = document.createElement('div'); spot.id = 'cx-spot';
    const prog = document.createElement('div'); prog.id = 'cx-progress';
    document.body.prepend(net, spot);
    document.body.appendChild(prog);

    const ctx = net.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, pts = [];
    const mouse = { x: -9999, y: -9999 };
    function size() {
      w = net.width = innerWidth * dpr; h = net.height = innerHeight * dpr;
      const n = mobile ? 34 : Math.min(80, Math.round(innerWidth / 18));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35 * dpr, vy: (Math.random() - 0.5) * 0.35 * dpr,
        r: (1 + Math.random() * 1.6) * dpr, c: Math.random() < 0.15 ? '163,113,247' : Math.random() < 0.25 ? '63,185,80' : '88,166,255',
      }));
    }
    size(); addEventListener('resize', size);
    addEventListener('pointermove', (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; spot.style.setProperty('--sx', e.clientX + 'px'); spot.style.setProperty('--sy', e.clientY + 'px'); }, { passive: true });
    addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    const link = 150 * dpr, mlink = 200 * dpr;
    let running = true;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) draw(); });
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        const dxm = a.x - mouse.x, dym = a.y - mouse.y, dm = Math.hypot(dxm, dym);
        if (dm < mlink) { a.x += (dxm / dm) * 0.6 * dpr * -1; a.y += (dym / dm) * 0.6 * dpr * -1; }
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283);
        ctx.fillStyle = `rgba(${a.c},.75)`; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) { ctx.strokeStyle = `rgba(${a.c},${(1 - d / link) * 0.22})`; ctx.lineWidth = dpr * 0.8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        if (dm < mlink) { ctx.strokeStyle = `rgba(121,192,255,${(1 - dm / mlink) * 0.5})`; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      requestAnimationFrame(draw);
    }
    draw();

    let ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        prog.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
        ticking = false;
      });
    }
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------------------------------------------------------
     4. CARD TILT
     --------------------------------------------------------- */
  function initTilt() {
    if (coarse) return;
    const sel = '.path-list li, .assessment-btn, .hero-stat, .footer-section';
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest(sel);
      $$('.tilt-3d').forEach((o) => { if (o !== el) { o.style.transform = ''; o.classList.remove('tilt-3d'); } });
      if (!el || el.classList.contains('hero-stat') && !el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('tilt-3d');
      el.style.transform = `perspective(700px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-4px)`;
    }, { passive: true });
  }

  /* ---------------------------------------------------------
     5. CONFETTI (code glyphs + shapes) & TOAST
     --------------------------------------------------------- */
  let cc, cctx, parts = [], confRAF = 0;
  function ensureConfetti() {
    if (cc) return;
    cc = document.createElement('canvas'); cc.id = 'cx-confetti'; document.body.appendChild(cc);
    cctx = cc.getContext('2d');
    const fit = () => { cc.width = innerWidth * devicePixelRatio; cc.height = innerHeight * devicePixelRatio; };
    fit(); addEventListener('resize', fit);
  }
  function burst(x, y, n = 90, power = 1) {
    if (reduce) return;
    ensureConfetti();
    const d = devicePixelRatio, glyphs = ['{ }', '</>', ';', '=>', '()', '✓', '★'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (4 + Math.random() * 11) * power * d;
      const kind = Math.random();
      parts.push({
        x: x * d, y: y * d, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6 * d, g: 0.22 * d, drag: 0.985,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, life: 0, max: 110 + Math.random() * 70,
        c: COLORS[(Math.random() * COLORS.length) | 0], size: (5 + Math.random() * 7) * d,
        k: kind < 0.2 ? 'g' : kind < 0.6 ? 'r' : 'c', t: glyphs[(Math.random() * glyphs.length) | 0],
      });
    }
    if (!confRAF) { let last = performance.now(); confRAF = requestAnimationFrame(function step(now) {
      const dt = Math.min((now - last) / 16.67, 2.5); last = now;
      cctx.clearRect(0, 0, cc.width, cc.height);
      parts = parts.filter((p) => p.life < p.max);
      for (const p of parts) {
        p.life += dt; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const al = Math.max(0, 1 - Math.max(0, p.life - p.max * 0.6) / (p.max * 0.4));
        cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot); cctx.globalAlpha = al; cctx.fillStyle = p.c;
        if (p.k === 'r') cctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.k === 'c') { cctx.beginPath(); cctx.arc(0, 0, p.size / 2.4, 0, 6.283); cctx.fill(); }
        else { cctx.font = `700 ${p.size * 2.1}px "Fira Code", monospace`; cctx.textAlign = 'center'; cctx.shadowColor = p.c; cctx.shadowBlur = 10; cctx.fillText(p.t, 0, 0); }
        cctx.restore();
      }
      if (parts.length) confRAF = requestAnimationFrame(step); else { confRAF = 0; cctx.clearRect(0, 0, cc.width, cc.height); }
    }); }
  }
  function fireworks() {
    const W = innerWidth, H = innerHeight;
    [[.2, .35], [.8, .3], [.5, .22], [.32, .55], [.68, .5]].forEach(([fx, fy], i) =>
      setTimeout(() => burst(W * fx, H * fy, 110, 1.15), i * 260));
  }
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'cx-toast'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = `<span class="ic">✓</span><span>${msg}</span>`;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------------------------------------------------------
     6. LESSON TRANSITIONS (wrap existing globals, non-destructive)
     --------------------------------------------------------- */
  function wordSplit(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="cx-word" style="--w:${i}">${w}</span>`).join(' ');
  }
  function resetSplit(el) { if (el.dataset.split) { el.textContent = $$('.cx-word', el).map((s) => s.textContent).join(' '); delete el.dataset.split; } }

  function wipe() {
    if (reduce) return;
    let w = $('#cx-wipe'); if (!w) { w = document.createElement('div'); w.id = 'cx-wipe'; document.body.appendChild(w); }
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  }

  function wrapGlobals() {
    const wrap = (name, fn) => { const o = window[name]; if (typeof o === 'function') window[name] = function () { return fn(o, this, arguments); }; };

    wrap('showLesson', (o, t, a) => {
      const before = $$('.lesson').find((l) => l.style.display === 'block');
      const r = o.apply(t, a);
      const el = document.getElementById(a[0]);
      if (el && el.style.display === 'block' && el !== before) {
        wipe();
        el.classList.remove('cx-enter'); void el.offsetWidth; el.classList.add('cx-enter');
        $$('.learning-objectives li', el).forEach((li, i) => li.style.setProperty('--li', i));
        const h2 = $('.lesson-header h2', el);
        if (h2) { resetSplit(h2); wordSplit(h2); }
      }
      return r;
    });

    wrap('completeLessonContent', (o, t, a) => {
      const alreadyDone = typeof lessonStates !== 'undefined' && lessonStates[a[0]] === 'completed';
      if (!alreadyDone) { burst(lastPointer.x, lastPointer.y, 80); toast('أحسنت! تم إكمال الدرس'); }
      return o.apply(t, a);
    });

    wrap('transitionSectionState', (o, t, a) => {
      const ok = o.apply(t, a);
      if (ok && a[1] === 'passQuiz') { fireworks(); toast('تهانينا! أنهيت المسار بنجاح'); }
      else if (ok && a[1] === 'passJudge') { burst(innerWidth / 2, innerHeight / 2, 100, 1.1); toast('كود صحيح! انتقل للاختبار'); }
      return ok;
    });

    wrap('checkFinalAssessment', (o, t, a) => {
      const r = o.apply(t, a);
      if ($('#assessment-panel .result-pass')) { setTimeout(fireworks, 200); setTimeout(fireworks, 1500); }
      return r;
    });

    wrap('goBackHome', (o, t, a) => { const r = o.apply(t, a); wipe(); return r; });
  }

  /* ---------------------------------------------------------
     7. Replay button + boot
     --------------------------------------------------------- */
  function addReplay() {
    const b = document.createElement('button');
    b.id = 'cx-replay'; b.type = 'button'; b.setAttribute('aria-label', 'إعادة تشغيل العرض الافتتاحي');
    b.innerHTML = '<i>▶</i><span>Replay intro</span>';
    b.addEventListener('click', () => { window.scrollTo(0, 0); playSplash(); });
    document.body.appendChild(b);
  }

  function seen() { try { return sessionStorage.getItem('boda-intro') === '1'; } catch (e) { return false; } }
  function mark() { try { sessionStorage.setItem('boda-intro', '1'); } catch (e) {} }

  function boot() {
    buildHero();
    initAmbient();
    initTilt();
    wrapGlobals();
    addReplay();
    if (reduce || seen() || !splash) {
      if (splash) splash.classList.add('cs-gone');
      root.classList.remove('cinema-on');
      root.classList.add('cinema-ready');
      heroEnter();
    } else {
      mark();
      playSplash();
    }
  }

  window.BodaCinema = { replay: playSplash, burst, fireworks, toast };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
