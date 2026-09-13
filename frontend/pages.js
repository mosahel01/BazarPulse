/* Page renderers. Each page returns an HTML string after fetching data. */

window.Pages = (() => {
  const U = window.UI;
  const API = window.API;

  /* ── shared partials ── */

  const stockChip = (symbol) =>
    `<a class="chip" href="#/stock/${U.esc(symbol)}">${U.esc(symbol)}</a>`;

  const directionBadge = (direction) =>
    `<span class="badge dir-badge ${U.directionClass(direction)}">${U.esc(direction)}</span>`;

  const statusBadge = (status) => `<span class="badge status-badge">${U.esc(status)}</span>`;

  const postCard = (p) => `
    <article class="feed-card">
      <div class="score-col">
        <button class="vote-btn" onclick="PageActions.vote('${U.esc(p.id)}',1)" title="Upvote">▲</button>
        <div class="score">${U.score(p)}</div>
        <button class="vote-btn" onclick="PageActions.vote('${U.esc(p.id)}',-1)" title="Downvote">▼</button>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="#/post/${U.esc(p.id)}">${U.esc(p.title)}</a></h3>
        <p class="card-excerpt">${U.esc(p.body)}</p>
        <div class="card-meta">
          <span class="author">@${U.esc(p.author)}</span>
          ${stockChip(p.stockSymbol)}
          <span class="muted">${U.timeAgo(p.createdAt)}</span>
          <span class="muted">💬 ${p.comments ?? 0}</span>
        </div>
      </div>
    </article>`;

  const sectionHeader = (icon, title) => `
    <div class="section-header">
      <div class="section-icon">${icon}</div>
      <div class="section-title">${U.esc(title)}</div>
    </div>`;

  /* ── Market overview ── */

  async function market() {
    const { data: indices } = await API.getIndices();
    const { data: stocks } = await API.getStocks();
    const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
    const gainers = sorted.slice(0, 3);
    const losers = [...sorted].reverse().slice(0, 3);

    return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> market pulse</div>
          <h1>Markets at a glance</h1>
          <p>Indices and quotes come from the built-in market engine — deterministic per-day values, generated in-process.</p>
        </div>

        <div class="ticker" id="ticker">
          ${indices
            .map(
              (i) => `
                <div class="ticker-item">
                  <span class="ticker-name">${U.esc(i.name)}</span>
                  <span class="ticker-value">${U.fmtNum(i.value)}</span>
                  <span class="ticker-change ${U.changeClass(i.changePct)}">${i.changePct >= 0 ? '+' : ''}${U.fmtNum(i.changePct)}%</span>
                </div>`,
            )
            .join('')}
        </div>

        <div class="split-grid">
          <div class="panel">
            ${sectionHeader('📈', 'Top gainers')}
            ${gainers.map(moverRow).join('')}
          </div>
          <div class="panel">
            ${sectionHeader('📉', 'Top losers')}
            ${losers.map(moverRow).join('')}
          </div>
        </div>
      </div>`;
  }

  const moverRow = (s) => `
    <a class="mover-row" href="#/stock/${U.esc(s.symbol)}">
      <div>
        <div class="mover-name">${U.esc(s.companyName)}</div>
        <span class="chip">${U.esc(s.symbol)}</span>
      </div>
      <div class="mover-quote">
        <div>₹${U.fmtNum(s.price)}</div>
        <div class="${U.changeClass(s.changePct)}">${s.changePct >= 0 ? '+' : ''}${U.fmtNum(s.changePct)}%</div>
      </div>
    </a>`;

  /* ── Feed ── */

  async function feed(state) {
    const { data: stockList } = await API.getStocks();
    const { data: posts } = await API.getFeed(state.stock);
    const symbols = [...new Set(stockList.map((s) => s.symbol))];
    const ranked = [...posts].sort((a, b) => {
      const scoreA = U.score(a);
      const scoreB = U.score(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const visible = state.sort === 'top' ? ranked : posts;
    const stockFilter = state.stock ? `<span class="chip">${U.esc(state.stock)}</span>` : '';

    return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> community feed</div>
          <h1>What the community is discussing</h1>
          <p>Posts about stocks across sectors — ranked by engineering, not by hype.</p>
        </div>

        <div class="toolbar">
          <div class="tabs" role="tablist">
            <button class="tab ${state.sort !== 'top' ? 'active' : ''}" data-tab="latest">Latest</button>
            <button class="tab ${state.sort === 'top' ? 'active' : ''}" data-tab="top">Trending</button>
          </div>
          <div class="chip-row">
            <a class="chip ${!state.stock ? 'chip-active' : ''}" href="#/feed">All</a>
            ${symbols
              .map(
                (s) =>
                  `<a class="chip ${state.stock === s ? 'chip-active' : ''}" href="#/feed/${U.esc(s)}">${U.esc(s)}</a>`,
              )
              .join('')}
          </div>
        </div>

        <div id="feed-list">
          ${state.stock ? `<div class="feed-filter-note">Showing posts for ${stockFilter}</div>` : ''}
          ${visible.length ? visible.map(postCard).join('') : '<div class="empty-state">No posts yet — be the first to discuss.</div>'}
        </div>
      </div>`;
  }

  /* ── Stocks ── */

  async function stocks(query = '') {
    const { data: list } = await API.getStocks(query);

    return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> universe</div>
          <h1>Stocks</h1>
          <p>Browse the seeded universe of listed companies.</p>
        </div>

        <div class="search-bar">
          <input id="stock-search" class="input" type="search" placeholder="Search symbol, name, or sector…" value="${U.esc(query)}" />
        </div>

        <div class="panel table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Company</th>
                <th>Sector</th>
                <th class="num">Price</th>
                <th class="num">Change</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${list
                .map(
                  (s) => `
                    <tr>
                      <td><a class="chip" href="#/stock/${U.esc(s.symbol)}">${U.esc(s.symbol)}</a></td>
                      <td class="co-name">${U.esc(s.companyName)}</td>
                      <td><span class="muted">${U.esc(s.sector)}</span></td>
                      <td class="num">₹${U.fmtNum(s.price)}</td>
                      <td class="num ${U.changeClass(s.changePct)}">${s.changePct >= 0 ? '+' : ''}${U.fmtNum(s.changePct)}%</td>
                      <td class="num"><a class="btn btn-ghost btn-sm" href="#/stock/${U.esc(s.symbol)}">View →</a></td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>
          ${list.length === 0 ? '<div class="empty-state">No matches for that search.</div>' : ''}
        </div>
      </div>`;
  }

  /* ── Stock detail ── */

  async function stock(symbol) {
    const { data: s } = await API.getStock(symbol);
    if (!s)
      return `
        <div class="page">
          <div class="empty-state">Stock ${U.esc(symbol)} not found. <a href="#/stocks">Browse stocks</a></div>
        </div>`;

    const { data: posts } = await API.getFeed(symbol);
    const { data: ideas } = await API.getIdeas(symbol);

    return `
      <div class="page">
        <a class="back-link" href="#/stocks">← All stocks</a>

        <div class="stock-hero panel">
          <div class="stock-head">
            <div>
              <div class="stock-symbol">${U.esc(s.symbol)}</div>
              <div class="stock-name">${U.esc(s.companyName)}</div>
              <div class="stock-tags">
                <span class="badge">${U.esc(s.exchange)}</span>
                <span class="badge">${U.esc(s.sector)}</span>
              </div>
            </div>
            <div class="stock-quote">
              <div class="stock-price">₹${U.fmtNum(s.price)}</div>
              <div class="stock-change ${U.changeClass(s.changePct)}">
                ${s.changePct >= 0 ? '+' : ''}${U.fmtNum(s.changePct)}% &nbsp;·&nbsp; ${s.change >= 0 ? '+' : ''}${U.fmtNum(s.change)}
              </div>
            </div>
          </div>
          <p class="stock-desc">${U.esc(s.description || '')}</p>
        </div>

        <div class="tabs section-tabs" role="tablist">
          <button class="tab active" data-tab="posts">Posts (${posts.length})</button>
          <button class="tab" data-tab="ideas">Trading ideas (${ideas.length})</button>
        </div>

        <div id="stock-posts">
          ${posts.length ? posts.map(postCard).join('') : '<div class="empty-state">Be the first to start a discussion on this stock.</div>'}
        </div>

        <div id="stock-ideas" hidden>
          <div class="idea-grid">
            ${
              ideas.length
                ? ideas
                    .map(
                      (i) => `
                      <div class="idea-card">
                        <div class="idea-head">
                          <span class="author">@${U.esc(i.author)}</span>
                          ${directionBadge(i.direction)}
                          ${statusBadge(i.status)}
                        </div>
                        <div class="idea-prices">
                          <div><span class="muted">Entry</span><div>₹${U.fmtNum(i.entryPrice)}</div></div>
                          <div><span class="muted">Target</span><div class="up">₹${U.fmtNum(i.targetPrice)}</div></div>
                          <div><span class="muted">Stop</span><div class="down">₹${U.fmtNum(i.stopLossPrice)}</div></div>
                        </div>
                        <p class="idea-thesis">${U.esc(i.thesis)}</p>
                      </div>`,
                    )
                    .join('')
                : '<div class="empty-state">No trading ideas for this stock yet.</div>'
            }
          </div>
        </div>
      </div>`;
  }

  /* ── Post detail ── */

  async function post(postId) {
    const { data: p } = await API.getPost(postId);
    if (!p)
      return `
        <div class="page">
          <div class="empty-state">Post not found. <a href="#/feed">Back to feed</a></div>
        </div>`;

    const { data: comments } = await API.getComments(postId);

    return `
      <div class="page">
        <a class="back-link" href="${p.stockSymbol ? '#/feed/' + U.esc(p.stockSymbol) : '#/feed'}">← Back to feed</a>

        <article class="post-card panel">
          <div class="card-meta">
            <span class="author">@${U.esc(p.author)}</span>
            ${stockChip(p.stockSymbol)}
            <span class="muted">${U.timeAgo(p.createdAt)}</span>
          </div>
          <h1 class="post-title">${U.esc(p.title)}</h1>
          <p class="post-body">${U.esc(p.body)}</p>
          <div class="vote-bar">
            <button class="vote-btn vote-btn-lg" onclick="PageActions.vote('${U.esc(p.id)}',1)">▲ Upvote</button>
            <span class="score score-lg">${U.score(p)}</span>
            <button class="vote-btn vote-btn-lg" onclick="PageActions.vote('${U.esc(p.id)}',-1)">▼ Downvote</button>
            <span class="muted">· ${p.comments ?? 0} comments</span>
          </div>
        </article>

        <div class="section">
          ${sectionHeader('💬', 'Comments')}
          <div id="comments">
            ${
              comments.length
                ? comments
                    .map(
                      (c) => `
                      <div class="comment">
                        <div class="comment-head"><span class="author">@${U.esc(c.author)}</span><span class="muted">${U.timeAgo(c.createdAt)}</span></div>
                        <p class="comment-body">${U.esc(c.body)}</p>
                      </div>`,
                    )
                    .join('')
                : '<div class="empty-state">No comments yet.</div>'
            }
          </div>
          <form class="comment-form" id="comment-form" data-post="${U.esc(p.id)}">
            ${API.mode() !== 'live'
              ? '<input class="input" name="author" placeholder="Your username" required />'
              : ''}
            <div class="comment-form-row">
              <input class="input" name="body" placeholder="Add a comment…" required />
              <button class="btn btn-primary" type="submit">Post</button>
            </div>
          </form>
        </div>
        <div class="disclaimer-note">${API.mode() === 'demo' ? 'Demo mode — votes and comments are applied to local sample data.' : ''}</div>
      </div>`;
  }

  /* ── Watchlists ── */

  async function watchlists() {
    const { data: lists } = await API.getWatchlists();
    const { data: allStocks } = await API.getStocks();

    return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> watchlists</div>
          <h1>Watchlists</h1>
          <p>Track the names you care about.</p>
        </div>

        <form class="watchlist-form" id="watchlist-form">
          <input class="input" name="name" placeholder="New watchlist name…" required />
          <button class="btn btn-primary" type="submit">Create</button>
        </form>

        <div class="wl-grid">
          ${lists
            .map(
              (wl) => `
                <div class="panel wl-card">
                  <div class="wl-head">
                    <div class="section-title">${U.esc(wl.name)}</div>
                    <span class="muted">${wl.stocks.length} stocks</span>
                  </div>
                  <div class="chip-row">
                    ${wl.stocks
                      .map(
                        (sym) => `<a class="chip" href="#/stock/${U.esc(sym)}">${U.esc(sym)}</a>`,
                      )
                      .join('')}
                    ${wl.stocks.length === 0 ? '<span class="muted">Empty — add a stock below.</span>' : ''}
                  </div>
                  <form class="wl-add-form" data-wl="${U.esc(wl.id)}">
                    <select class="input" name="symbol">
                      ${allStocks
                        .filter((s) => !wl.stocks.includes(s.symbol))
                        .map(
                          (s) =>
                            `<option value="${U.esc(s.symbol)}">${U.esc(s.symbol)} — ${U.esc(s.companyName)}</option>`,
                        )
                        .join('')}
                    </select>
                    <button class="btn btn-ghost btn-sm" type="submit">Add</button>
                  </form>
                </div>`,
            )
            .join('')}
        </div>
        <div class="disclaimer-note">${API.mode() === 'demo' ? 'Demo mode — watchlists are saved to local sample data.' : ''}</div>
      </div>`;
  }

  /* ── Trading ideas ── */

  async function ideas(stockSymbol = '') {
    const { data: list } = await API.getIdeas(stockSymbol);

    return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> trading ideas</div>
          <h1>Trading ideas</h1>
          <p>Structured, user-submitted ideas. Application data — <strong>not financial advice</strong>, and never a guarantee of outcomes.</p>
        </div>

        <div class="idea-grid">
          ${list
            .map(
              (i) => `
                <div class="idea-card">
                  <div class="idea-head">
                    <span class="author">@${U.esc(i.author)}</span>
                    ${directionBadge(i.direction)}
                    ${statusBadge(i.status)}
                  </div>
                  <div class="idea-stock">${stockChip(i.stockSymbol)}</div>
                  <div class="idea-prices">
                    <div><span class="muted">Entry</span><div>₹${U.fmtNum(i.entryPrice)}</div></div>
                    <div><span class="muted">Target</span><div class="up">₹${U.fmtNum(i.targetPrice)}</div></div>
                    <div><span class="muted">Stop</span><div class="down">₹${U.fmtNum(i.stopLossPrice)}</div></div>
                  </div>
                  <p class="idea-thesis">${U.esc(i.thesis)}</p>
                </div>`,
            )
            .join('')}
        </div>
        <div class="disclaimer-note">${API.mode() === 'demo' ? 'Demo mode — sample ideas only.' : ''}</div>
      </div>`;
  }

  /* ── Auth ── */

  async function auth() {
    const currentUser = window.UIState.currentUser;

    if (currentUser) {
      return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> authentication</div>
          <h1>@${U.esc(currentUser.username)}</h1>
          <p>Signed in${currentUser.email ? ` as ${U.esc(currentUser.email)}` : ''}. Accounts are stored in the database and protected by JWT sessions.</p>
        </div>
        <div class="auth-wrap">
          <div class="panel auth-card">
            <div class="account-row"><div class="section-icon">👤</div><div><div class="account-name">${U.esc(currentUser.username)}</div><div class="muted">${currentUser.role ? `Role: ${currentUser.role}` : 'Demo session'}</div></div></div>
            <button class="btn btn-primary btn-block" type="button" id="logout-btn">Sign out</button>
            <div id="auth-msg" class="auth-msg"></div>
          </div>
        </div>
      </div>`;
    }

    let providers = { data: { google: null } };
    try {
      providers = await window.API.authProviders();
    } catch {
      /* providers unknown — Google button hidden */
    }
    const googleClientId = providers?.data?.google?.clientId ?? null;

    return `
      <div class="page">
        <div class="hero compact">
          <div class="hero-badge"><span class="hero-badge-dot"></span> authentication</div>
          <h1>Welcome back</h1>
          <p>Register or sign in with your password — or use your Google account. Sessions are stored in the database and protected by JWT.</p>
        </div>
        <div class="auth-wrap">
          <div class="panel auth-card">
            <div class="tabs" role="tablist">
              <button class="tab active" data-auth-tab="login">Login</button>
              <button class="tab" data-auth-tab="register">Register</button>
            </div>

            <form id="login-form" class="auth-form">
              <label class="field"><span>Email or username</span><input class="input" name="identifier" required autocomplete="username" /></label>
              <label class="field"><span>Password</span><input class="input" type="password" name="password" required autocomplete="current-password" /></label>
              <button class="btn btn-primary btn-block" type="submit">Sign in</button>
            </form>

            <form id="register-form" class="auth-form" hidden>
              <label class="field"><span>Username</span><input class="input" name="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9_-]+" title="Letters, numbers, _ and - only" required autocomplete="username" /></label>
              <label class="field"><span>Email</span><input class="input" type="email" name="email" required autocomplete="email" /></label>
              <label class="field"><span>Password (min. 8 characters)</span><input class="input" type="password" name="password" minlength="8" maxlength="128" required autocomplete="new-password" /></label>
              <button class="btn btn-primary btn-block" type="submit">Create account</button>
            </form>

            ${
              googleClientId
                ? `<div class="google-wrap">
                    <div id="google-button" class="google-btn"></div>
                    <span id="google-client-id" class="visually-hidden">${U.esc(googleClientId)}</span>
                    <div class="or-divider">or</div>
                  </div>`
                : ''
            }

            <div id="auth-msg" class="auth-msg"></div>
          </div>
        </div>
      </div>`;
  }

  /* ── Dashboard ── */

  async function dashboard() {
    const { data: indices } = await API.getIndices();
    const { data: posts } = await API.getFeed();
    const latest = posts.slice(0, 3);

    return `
      <div class="page">
        <div class="hero">
          <div class="hero-badge"><span class="hero-badge-dot"></span> ${API.mode() === 'demo' ? 'demo data — backend modules rolling out' : 'live API connected'}</div>
          <h1>MarketPulse</h1>
          <p>A stock-community platform: discussion, structured trading ideas, watchlists, voting, and lightweight moderation. Backend-first — this UI demonstrates the API.</p>
        </div>

        <div class="ticker" id="ticker">
          ${indices
            .map(
              (i) => `
                <div class="ticker-item">
                  <span class="ticker-name">${U.esc(i.name)}</span>
                  <span class="ticker-value">${U.fmtNum(i.value)}</span>
                  <span class="ticker-change ${U.changeClass(i.changePct)}">${i.changePct >= 0 ? '+' : ''}${U.fmtNum(i.changePct)}%</span>
                </div>`,
            )
            .join('')}
        </div>

        <div class="stats">
          <div class="stat-card" onclick="location.hash='#/stocks'">
            <div class="stat-label">Stocks</div>
            <div class="stat-value accent">${(await API.getStocks()).data.length}</div>
            <div class="stat-desc">Seeded universe</div>
          </div>
          <div class="stat-card" onclick="location.hash='#/ideas'">
            <div class="stat-label">Trading ideas</div>
            <div class="stat-value purple">${(await API.getIdeas()).data.length}</div>
            <div class="stat-desc">Structured ideas</div>
          </div>
          <div class="stat-card" onclick="location.hash='#/watchlists'">
            <div class="stat-label">Watchlists</div>
            <div class="stat-value amber">${(await API.getWatchlists()).data.length}</div>
            <div class="stat-desc">Your lists</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Data mode</div>
            <div class="stat-value ${API.mode() === 'live' ? 'green' : 'amber'}" style="font-size:1rem;text-transform:uppercase;letter-spacing:.04em">${API.mode()}</div>
            <div class="stat-desc">${API.mode() === 'live' ? 'Real REST API' : 'Sample data fallback'}</div>
          </div>
        </div>

        <div class="section">
          ${sectionHeader('🔥', 'Latest discussions')}
          ${latest.length ? latest.map(postCard).join('') : '<div class="empty-state">No posts yet.</div>'}
          <div style="margin-top:1rem"><a class="btn btn-ghost" href="#/feed">View full feed →</a></div>
        </div>

        <div class="split-grid">
          <a class="panel quick-link" href="#/game">
            <div class="section-icon">🎮</div>
            <div class="section-title">Prediction game</div>
            <div class="muted">Guess UP or DOWN, earn points.</div>
          </a>
          <a class="panel quick-link" href="#/stocks">
            <div class="section-icon">🏛️</div>
            <div class="section-title">Stocks universe</div>
            <div class="muted">Search symbols, sectors, movers.</div>
          </a>
          <a class="panel quick-link" href="#/watchlists">
            <div class="section-icon">📋</div>
            <div class="section-title">Watchlists</div>
            <div class="muted">Organize the names you track.</div>
          </a>
          <a class="panel quick-link" href="#/ideas">
            <div class="section-icon">🎯</div>
            <div class="section-title">Trading ideas</div>
            <div class="muted">Structured entry / target / stop.</div>
          </a>
          <a class="panel quick-link" href="#/market">
            <div class="section-icon">🌐</div>
            <div class="section-title">Market overview</div>
            <div class="muted">Indices and movers at a glance.</div>
          </a>
        </div>
      </div>`;
  }

  return { market, feed, stocks, stock, post, watchlists, ideas, auth, dashboard };
})();

/* ── In-demo interactions (vote, comment, watchlist). In live mode these call the REST API. ── */

window.PageActions = (() => {
  const DEMO = window.DemoData;
  const reroute = () => window.App.router();

  function toast(message, isError = true) {
    let el = document.getElementById('action-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'action-toast';
      el.style.cssText =
        'position:fixed;left:50%;bottom:1.25rem;transform:translateX(-50%);padding:.65rem 1rem;border-radius:8px;font-size:.85rem;z-index:1000;max-width:min(92vw,480px);box-shadow:0 8px 24px rgba(0,0,0,.25);' +
        (isError
          ? 'background:var(--red,#e5484d);color:#fff;'
          : 'background:var(--green,#30a46c);color:#fff;');
    }
    el.textContent = message;
    if (!el.isConnected) document.body.appendChild(el);
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.remove(), 3200);
  }

  async function requireLiveAction(action, args) {
    if (window.UIState.mode !== 'live') return;
    try {
      await action(...args);
      reroute();
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        toast('Please sign in to do that.');
      } else {
        toast(err?.message || 'That action failed.');
      }
    }
  }

  return {
    vote(postId, value) {
      if (window.UIState.mode === 'live') {
        requireLiveAction(window.API.vote, [postId, value]);
        return;
      }
      const post = DEMO.posts.find((p) => p.id === postId);
      if (!post) return;
      if (post.userVote === value) {
        post[value === 1 ? 'upvotes' : 'downvotes'] -= 1;
        delete post.userVote;
      } else {
        if (post.userVote) post[post.userVote === 1 ? 'upvotes' : 'downvotes'] -= 1;
        post.userVote = value;
        post[value === 1 ? 'upvotes' : 'downvotes'] += 1;
      }
      reroute();
    },

    addComment(postId, author, body) {
      if (window.UIState.mode === 'live') {
        requireLiveAction(window.API.addComment, [postId, body]);
        return;
      }
      DEMO.comments.push({
        id: 'c' + Date.now(),
        postId,
        author: author || 'anonymous',
        body,
        createdAt: new Date().toISOString(),
      });
      const post = DEMO.posts.find((p) => p.id === postId);
      if (post) post.comments += 1;
      reroute();
    },

    createWatchlist(name) {
      if (window.UIState.mode === 'live') {
        requireLiveAction(window.API.createWatchlist, [name]);
        return;
      }
      DEMO.watchlists.push({ id: 'w' + Date.now(), name, stocks: [] });
      reroute();
    },

    addWatchStock(wlId, symbol) {
      if (window.UIState.mode === 'live') {
        requireLiveAction(window.API.addWatchStock, [wlId, symbol]);
        return;
      }
      const wl = DEMO.watchlists.find((w) => w.id === wlId);
      if (wl && !wl.stocks.includes(symbol)) wl.stocks.push(symbol);
      reroute();
    },

    logout() {
      localStorage.removeItem('marketpulse_demo_user');
      window.UIState.currentUser = null;
      window.App.refreshNav();
    },
  };
})();
