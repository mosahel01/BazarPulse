/* API client — tries the real MarketPulse REST API first, and transparently
   falls back to DemoData while backend modules are still being built.
   Authentication endpoints are always real (no demo fallback). */

window.UIState = { mode: 'demo', currentUser: null };

window.API = (() => {
  const DEMO = window.DemoData;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const TOKEN_KEY = 'marketpulse_token';

  function setMode(mode) {
    if (window.UIState.mode !== mode) {
      window.UIState.mode = mode;
      window.dispatchEvent(new CustomEvent('modechange', { detail: mode }));
    }
  }

  function getToken() {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* storage unavailable — token stays in memory only */
    }
  }

  async function apiErrorFrom(res) {
    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const message = body?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = body?.error?.code;
    err.details = body?.error?.details;
    return err;
  }

  function authHeaders() {
    const headers = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function request(path, demoFn) {
    try {
      const res = await fetch(`/api/v1${path}`, { headers: authHeaders() });
      if (res.ok) {
        setMode('live');
        return res.json();
      }
    } catch {
      /* network error -> fall through to demo */
    }
    setMode('demo');
    return demoFn();
  }

  async function postRequest(path, body, demoFn) {
    try {
      const res = await fetch(`/api/v1${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Accept: 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(body ?? {}),
      });
      if (res.ok) {
        setMode('live');
        return res.json();
      }
    } catch {
      /* network error -> fall through to demo */
    }
    setMode('demo');
    return demoFn();
  }

  async function authRequest(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api/v1${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        Accept: 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      throw await apiErrorFrom(res);
    }
    setMode('live');
    return res.json();
  }

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  return {
    mode: () => window.UIState.mode,
    getToken,
    setToken,

    register: (body) => authRequest('/auth/register', { method: 'POST', body }),
    login: (body) => authRequest('/auth/login', { method: 'POST', body }),
    googleSignIn: (idToken) => authRequest('/auth/google', { method: 'POST', body: { idToken } }),
    me: () => authRequest('/auth/me'),
    logout: () => {
      setToken(null);
      window.UIState.currentUser = null;
    },

    authProviders: async () => {
      try {
        const res = await fetch('/api/v1/auth/providers', {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          setMode('live');
          return res.json();
        }
      } catch {
        /* backend unreachable */
      }
      return { data: { google: null } };
    },

    getIndices: () =>
      request('/market/indices', async () => {
        await delay(120);
        return { data: clone(DEMO.indices) };
      }),

    getStocks: (query = '') =>
      request(`/stocks?search=${encodeURIComponent(query)}`, async () => {
        await delay(120);
        let list = clone(DEMO.stocks);
        if (query) {
          const q = query.toLowerCase();
          list = list.filter(
            (s) =>
              s.symbol.toLowerCase().includes(q) ||
              s.companyName.toLowerCase().includes(q) ||
              s.sector.toLowerCase().includes(q),
          );
        }
        return { data: list };
      }),

    getStock: (symbol) =>
      request(`/stocks/${encodeURIComponent(symbol)}`, async () => {
        await delay(120);
        const stock = clone(DEMO.stocks).find((s) => s.symbol === symbol) ?? null;
        return { data: stock };
      }),

    getFeed: (stock = '') =>
      request(`/feed${stock ? `?stock=${encodeURIComponent(stock)}` : ''}`, async () => {
        await delay(120);
        const list = clone(DEMO.posts)
          .filter((p) => p.status === 'ACTIVE')
          .filter((p) => (stock ? p.stockSymbol === stock : true))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return { data: list };
      }),

    getIdeas: (stock = '') =>
      request(`/ideas${stock ? `?stock=${encodeURIComponent(stock)}` : ''}`, async () => {
        await delay(120);
        const list = clone(DEMO.ideas).filter((i) => (stock ? i.stockSymbol === stock : true));
        return { data: list };
      }),

    getPost: (id) =>
      request(`/posts/${encodeURIComponent(id)}`, async () => {
        await delay(120);
        return { data: clone(DEMO.posts).find((p) => p.id === id) ?? null };
      }),

    getComments: (postId) =>
      request(`/posts/${encodeURIComponent(postId)}/comments`, async () => {
        await delay(120);
        return { data: clone(DEMO.comments).filter((c) => c.postId === postId) };
      }),

    getWatchlists: () =>
      request('/watchlists', async () => {
        await delay(120);
        return { data: clone(DEMO.watchlists) };
      }),

    gameRound: (exclude = []) =>
      postRequest('/market/game/round', { exclude }, async () => {
        await delay(120);
        const pool = clone(DEMO.stocks).filter((s) => !exclude.includes(s.symbol));
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const drift = (Math.random() - 0.45) * pick.price * 0.04;
        const endPrice = Math.round((pick.price + drift) * 100) / 100;
        const change = Math.round((endPrice - pick.price) * 100) / 100;
        const changePct = Math.round((change / pick.price) * 10000) / 100;
        return {
          data: {
            symbol: pick.symbol,
            companyName: pick.companyName,
            sector: pick.sector,
            startPrice: pick.price,
            endPrice,
            change,
            changePct,
          },
        };
      }),

    /* ── authenticated write actions (live mode only) ── */

    createPost: (body) => authRequest('/posts', { method: 'POST', body }),
    vote: (postId, value) =>
      authRequest(`/posts/${encodeURIComponent(postId)}/vote`, { method: 'PUT', body: { value } }),
    removeVote: (postId) => authRequest(`/posts/${encodeURIComponent(postId)}/vote`, { method: 'DELETE' }),
    addComment: (postId, body) =>
      authRequest(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: { body } }),
    createWatchlist: (name) => authRequest('/watchlists', { method: 'POST', body: { name } }),
    addWatchStock: (watchlistId, symbol) =>
      authRequest(`/watchlists/${encodeURIComponent(watchlistId)}/stocks`, {
        method: 'POST',
        body: { symbol },
      }),
  };
})();
