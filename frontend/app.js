'use strict';

/* ─── Router ─── */

window.App = (() => {
  const app = document.getElementById('app');
  const navLinks = [
    { hash: '#/', label: 'Dashboard' },
    { hash: '#/feed', label: 'Feed' },
    { hash: '#/stocks', label: 'Stocks' },
    { hash: '#/ideas', label: 'Ideas' },
    { hash: '#/watchlists', label: 'Watchlists' },
    { hash: '#/market', label: 'Market' },
    { hash: '#/game', label: 'Game' },
  ];

  function parseHash() {
    const raw = window.location.hash.slice(1) || '/';
    const parts = raw.split('/').filter(Boolean);
    return { raw, parts };
  }

  function renderNav() {
    const links = document.getElementById('nav-links');
    const user = window.UIState.currentUser;
    const navItems = [
      ...navLinks,
      user ? { hash: '#/auth', label: `@${user.username}` } : { hash: '#/auth', label: 'Sign in' },
    ];
    links.innerHTML = navItems
      .map((n) => `<a href="${n.hash}" class="nav-link">${window.UI.esc(n.label)}</a>`)
      .join('');

    document.querySelectorAll('.nav-link').forEach((a) => {
      const href = a.getAttribute('href');
      const active = window.location.hash === href;
      a.classList.toggle('active', active);
    });
  }

  async function router() {
    const { parts } = parseHash();
    const slug = decodeURIComponent(parts[0] || '');
    const arg = decodeURIComponent(parts[1] || '');

    renderNav();

    let html;
    try {
      if (slug === 'feed')
        html = await window.Pages.feed({ sort: window.feedSort ?? 'latest', stock: arg });
      else if (slug === 'stocks') html = await window.Pages.stocks(arg);
      else if (slug === 'stock') html = await window.Pages.stock(arg.toUpperCase());
      else if (slug === 'post') html = await window.Pages.post(arg);
      else if (slug === 'ideas') html = await window.Pages.ideas();
      else if (slug === 'watchlists') html = await window.Pages.watchlists();
      else if (slug === 'market') html = await window.Pages.market();
      else if (slug === 'auth') html = await window.Pages.auth();
      else if (slug === 'game') {
        html = window.Game.init();
        setTimeout(() => bindGameEvents(), 0);
      }
      else if (slug === 'api') html = apiIntro();
      else if (slug === 'about') html = aboutPage();
      else html = await window.Pages.dashboard();
    } catch (err) {
      html = `<div class="page"><div class="empty-state">Something went wrong: ${window.UI.esc(String(err?.message ?? err))}</div></div>`;
    }

    app.innerHTML = html;
    bindPageEvents();
    window.scrollTo({ top: 0 });
  }

  /* ── Page interactivity (delegated) ── */

  async function _googleReady(clientId) {
    const el = document.getElementById('google-button');
    return new Promise((resolve) => {
      const tryRender = () => {
        if (typeof window.google !== 'undefined' && window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: GsiCredentialHandler,
          });
          try {
            window.google.accounts.id.renderButton(el, {
              theme: 'outline',
              size: 'large',
              shape: 'rectangular',
              width: '100%',
            });
          } catch {
            /* render already failed — Google UI will surface it */
          }
          resolve();
        } else if (Date.now() - window.googleButtonStartedAt < 8000) {
          setTimeout(tryRender, 200);
        } else {
          resolve();
        }
      };
      tryRender();
    });
  }

  async function handleGoogleCredential(response) {
    try {
      const result = await window.API.googleSignIn(response.credential);
      await finishAuth(result);
    } catch (err) {
      showAuthError(err);
    }
  }

  const GsiCredentialHandler = handleGoogleCredential;

  function setAuthMessage(message) {
    const msg = document.getElementById('auth-msg');
    if (msg) {
      msg.textContent = message === '' ? '' : message;
    }
  }

  function showAuthError(err) {
    const detailMessages = (err?.details || []).map((d) => d.message).filter(Boolean);
    const message = [err?.message, ...detailMessages].filter(Boolean).join(' ');
    setAuthMessage(message || 'Something went wrong. Please try again.');
  }

  function setButtonBusy(button, busy) {
    if (button) button.disabled = busy;
  }

  async function finishAuth(result) {
    window.API.setToken(result.data.token);
    window.UIState.currentUser = result.data.user;
    await window.App.refreshNav();
    window.location.hash = '#/';
  }

  function bindPageEvents() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.tab;
        if (mode === 'top' || mode === 'latest') {
          window.feedSort = mode;
          router();
        }
        if (mode === 'posts' || mode === 'ideas') {
          const parent = tab.closest('.section-tabs');
          if (!parent) return;
          parent.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
          document.getElementById('stock-posts').hidden = mode === 'ideas';
          document.getElementById('stock-ideas').hidden = mode === 'posts';
        }
      });
    });

    const search = document.getElementById('stock-search');
    if (search) {
      let timer;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          window.location.hash = `#/stocks/${encodeURIComponent(search.value.trim())}`;
        }, 350);
      });
    }

    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(commentForm);
        window.PageActions.addComment(
          commentForm.dataset.post,
          fd.get('author'),
          (fd.get('body') || '').trim(),
        );
      });
    }

    const wlForm = document.getElementById('watchlist-form');
    if (wlForm) {
      wlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(wlForm);
        window.PageActions.createWatchlist(String(fd.get('name') || '').trim());
      });
    }

    document.querySelectorAll('.wl-add-form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        window.PageActions.addWatchStock(form.dataset.wl, fd.get('symbol'));
      });
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(loginForm);
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        setAuthMessage('');
        setButtonBusy(submitBtn, true);
        try {
          const result = await window.API.login({
            username: String(fd.get('identifier') || ''),
            password: String(fd.get('password') || ''),
          });
          await finishAuth(result);
        } catch (err) {
          showAuthError(err);
        } finally {
          setButtonBusy(submitBtn, false);
        }
      });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(registerForm);
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        setAuthMessage('');
        setButtonBusy(submitBtn, true);
        try {
          const result = await window.API.register({
            username: String(fd.get('username') || ''),
            email: String(fd.get('email') || ''),
            password: String(fd.get('password') || ''),
          });
          await finishAuth(result);
        } catch (err) {
          showAuthError(err);
        } finally {
          setButtonBusy(submitBtn, false);
        }
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.API.logout();
        refreshNav();
        window.location.hash = '#/auth';
      });
    }

    const googleClientIdEl = document.getElementById('google-client-id');
    if (googleClientIdEl) {
      window.googleButtonStartedAt = Date.now();
      void _googleReady(googleClientIdEl.textContent.trim());
    }

    document.querySelectorAll('.tab[data-auth-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const isLogin = tab.dataset.authTab === 'login';
        document.getElementById('login-form').hidden = !isLogin;
        document.getElementById('register-form').hidden = isLogin;
        tab
          .closest('.tabs')
          .querySelectorAll('.tab')
          .forEach((t) => t.classList.toggle('active', t === tab));
      });
    });
  }

  function bindGameEvents() {
    document.querySelectorAll('.game-btn-up, .game-btn-down').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.classList.contains('game-btn-up') ? 'up' : 'down';
        const result = window.Game.predict(dir);
        app.innerHTML = result;
        bindGameEvents();
      });
    });
    const nextBtn = document.querySelector('.game-next-btn .btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const result = window.Game.next();
        app.innerHTML = result;
        bindGameEvents();
      });
    }
  }

  function refreshNav() {
    renderNav();
    router();
  }

  /* ── Static pages ── */

  const apiIntro = () => `
    <div class="page">
      <div class="hero compact">
        <div class="hero-badge"><span class="hero-badge-dot"></span> API &mdash; versioned under <code>/api/v1</code></div>
        <h1>Explore the API</h1>
        <p>Every route is validated with Zod and documented via OpenAPI.</p>
      </div>
      <div class="section">
        <div class="endpoints-card">
          ${[
            ['GET', '/health', 'Liveness probe'],
            ['GET', '/health/ready', 'Readiness probe'],
            ['POST', '/api/v1/auth/register', 'Create account'],
            ['POST', '/api/v1/auth/login', 'Sign in'],
            ['GET', '/api/v1/auth/me', 'Current user'],
            ['GET', '/api/v1/stocks', 'List stocks'],
            ['POST', '/api/v1/posts', 'Create post'],
            ['GET', '/api/v1/feed', 'Community feed'],
            ['POST', '/api/v1/reports', 'Report content'],
            ['GET', '/docs', 'Swagger UI'],
          ]
            .map(
              ([method, path, desc]) => `
                <div class="endpoint-row">
                  <span class="method ${method.toLowerCase()}">${method}</span>
                  <span class="endpoint-path">${path}</span>
                  <span class="endpoint-desc">${desc}</span>
                </div>`,
            )
            .join('')}
        </div>
      </div>
    </div>`;

  const aboutPage = () => `
    <div class="page">
      <div class="hero compact">
        <div class="hero-badge"><span class="hero-badge-dot"></span> about the project</div>
        <h1>Why this exists</h1>
        <p>A compact but real backend: relational modeling with database constraints, auth &amp; authorization, validation, pagination, feed ranking, moderation, testing, and containerized deployment.</p>
      </div>
      <div class="section">
        <div class="section-header"><div class="section-icon">🧱</div><div class="section-title">Architecture</div></div>
        <div class="tech-grid">
          <div class="tech-card"><div class="tech-name">Modular monolith</div><div class="tech-role">One process, clear module boundaries</div></div>
          <div class="tech-card"><div class="tech-name">Service layer</div><div class="tech-role">Business rules stay out of route handlers</div></div>
          <div class="tech-card"><div class="tech-name">DB constraints</div><div class="tech-role">Invariants enforced in SQLite, not just code</div></div>
          <div class="tech-card"><div class="tech-name">Strict TS</div><div class="tech-role">No <code>any</code> escape hatches</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-header"><div class="section-icon">⚠️</div><div class="section-title">Disclaimer</div></div>
        <p style="color:var(--text-secondary);font-size:0.9rem;max-width:680px;line-height:1.7">
          All content on this platform is user-generated or demo data for engineering purposes. Nothing here is financial advice, and no assertion is made that any market opinion is correct or profitable.
        </p>
      </div>
    </div>`;

  /* ── Live status ── */

  async function pollStatus() {
    try {
      const res = await fetch('/health');
      const ready = await fetch('/health/ready');
      const badge = document.getElementById('status-badge');
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');
      if (badge && dot && text) {
        const isUp = res.ok && ready.ok;
        badge.style.color = isUp ? 'var(--green)' : 'var(--amber)';
        dot.style.background = isUp ? 'var(--green)' : 'var(--amber)';
        text.textContent = isUp ? 'Backend online' : 'Starting…';
      }
    } catch {
      const text = document.getElementById('status-text');
      if (text) text.textContent = 'Offline';
    }
  }

  return { router, refreshNav, parseHash, pollStatus };
})();

/* ─── Theme: automatic / light / dark ─── */

window.Theme = (() => {
  const KEY = 'marketpulse_theme';
  const darkMq = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  const ICONS = { auto: '◐', light: '☀', dark: '☾' };
  const LABELS = { auto: 'Automatic', light: 'Light', dark: 'Dark' };

  const readPref = () => {
    try {
      return localStorage.getItem(KEY) || 'auto';
    } catch {
      return 'auto';
    }
  };

  const savePref = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage unavailable — theme stays for this session */
    }
  };

  const effective = () => {
    const pref = readPref();
    if (pref !== 'auto') return pref;
    return darkMq?.matches ? 'dark' : 'light';
  };

  function apply(animate) {
    const pref = readPref();
    const root = document.documentElement;
    const value = effective();
    if (root) {
      if (animate) root.classList.add('theme-anim');
      root.dataset.theme = pref;
      root.style.colorScheme = value;
      if (animate) setTimeout(() => root.classList.remove('theme-anim'), 250);
    }
    document.querySelectorAll('.theme-choice').forEach((el) => {
      el.setAttribute('aria-checked', String(el.dataset.themeChoice === pref));
    });
    const btn = document.getElementById('theme-btn');
    if (btn) btn.setAttribute('aria-label', `Theme: ${LABELS[pref]}`);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = ICONS[value];
    const label = document.getElementById('theme-label');
    if (label) label.textContent = LABELS[pref];
  }

  function init() {
    apply(false);

    const btn = document.getElementById('theme-btn');
    const menu = document.getElementById('theme-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', String(!menu.hidden));
    });

    menu.querySelectorAll('.theme-choice').forEach((choice) => {
      choice.addEventListener('click', () => {
        savePref(choice.dataset.themeChoice);
        apply(true);
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      });
    });

    document.addEventListener('click', () => {
      if (!menu.hidden) {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });

    darkMq?.addEventListener?.('change', () => {
      if (readPref() === 'auto') apply(true);
    });
  }

  return { init, apply, effective };
})();

/* ─── Boot ─── */

window.Theme.init();

window.addEventListener('hashchange', () => window.App.router());

window.addEventListener('modechange', (e) => {
  const text = document.getElementById('mode-badge');
  if (text) {
    text.textContent = e.detail === 'live' ? 'live' : 'demo';
    text.classList.toggle('live', e.detail === 'live');
  }
});

window.App.router();

window.App.pollStatus();
setInterval(window.App.pollStatus, 5000);

(async function restoreSession() {
  if (!window.API.getToken()) {
    return;
  }
  try {
    const result = await window.API.me();
    window.UIState.currentUser = result.data.user;
    window.App.refreshNav();
  } catch {
    window.API.logout();
    window.App.refreshNav();
  }
})();
