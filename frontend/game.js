/* Stock prediction game — predict UP or DOWN, track your score.
   Rounds come from the backend market engine when live, otherwise from the
   demo dataset. */

window.Game = (() => {
  const U = window.UI;

  const state = {
    score: 500,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
    current: null,
    revealed: false,
  };

  async function startRound() {
    const exclude = state.current ? [state.current.symbol] : [];
    const { data: round } = await window.API.gameRound(exclude);
    state.current = round;
    state.revealed = false;
  }

  function predict(direction) {
    if (state.revealed || !state.current) return;
    state.revealed = true;

    const actual = state.current.changePct >= 0 ? 'up' : 'down';
    const correct = direction === actual;
    const wager = 100;

    if (correct) {
      state.wins += 1;
      state.streak += 1;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      const bonus = Math.min(state.streak, 5) * 10;
      state.score += wager + bonus;
    } else {
      state.losses += 1;
      state.streak = 0;
      state.score -= wager;
    }

    state.history.unshift({
      symbol: state.current.symbol,
      predicted: direction,
      actual,
      correct,
      price: state.current.endPrice,
      changePct: state.current.changePct,
    });

    if (state.history.length > 20) state.history.length = 20;
  }

  function render() {
    const s = state.current;
    const changeDir = s.changePct >= 0 ? 'up' : 'down';
    const changeSign = s.changePct >= 0 ? '+' : '';

    const streakDots = [];
    const recent = state.history.slice(0, 10);
    for (let i = recent.length - 1; i >= 0; i--) {
      streakDots.push(
        `<span class="game-streak-dot ${recent[i].correct ? 'streak-win' : 'streak-lose'}"></span>`,
      );
    }

    const historyHtml =
      state.history.length > 0
        ? state.history
            .map(
              (h) => `
            <div class="game-history-item">
              <span class="game-history-symbol">${U.esc(h.symbol)}</span>
              <span class="game-history-pred ${h.predicted === 'up' ? 'up-pred' : 'down-pred'}">${h.predicted === 'up' ? '▲ UP' : '▼ DOWN'}</span>
              <span class="game-history-result ${h.correct ? 'win' : 'lose'}">${h.correct ? '✓' : '✗'} ${h.changePct >= 0 ? '+' : ''}${U.fmtNum(h.changePct)}%</span>
            </div>`,
            )
            .join('')
        : '<div class="game-empty">No rounds yet — make your first prediction!</div>';

    const resultHtml = state.revealed
      ? (() => {
          const correct = state.history[0]?.correct;
          const wager = 100;
          const bonus = correct ? Math.min(state.streak, 5) * 10 : 0;
          return `
            <div class="game-result ${correct ? 'win' : 'lose'}">
              <div class="game-result-text">${correct ? 'Correct!' : 'Wrong!'}</div>
              <div class="game-result-sub">
                ${U.esc(s.symbol)} moved ${s.changePct >= 0 ? 'up' : 'down'} ${changeSign}${U.fmtNum(s.changePct)}%
                — ${correct ? '+' : '-'}${wager}${bonus ? ` + ${bonus} streak bonus` : ''} pts
              </div>
            </div>
            <div class="game-next-btn">
              <button class="btn btn-primary btn-block">Next stock →</button>
            </div>`;
        })()
      : '';

    return `
      <div class="page">
        <div class="game-hero">
          <div class="hero-badge"><span class="hero-badge-dot"></span> prediction game</div>
          <h1>Guess the move</h1>
          <p>Predict whether the stock will go UP or DOWN. Start with 500 pts — win or lose 100 per round.</p>
        </div>

        <div class="game-board">
          <div class="game-stock-card">
            <div class="game-stock-symbol">${U.esc(s.symbol)}</div>
            <div class="game-stock-name">${U.esc(s.companyName)} · ${U.esc(s.sector)}</div>

            <div class="game-price">₹${U.fmtNum(s.startPrice)}</div>
            <div class="game-change ${changeDir}">
              ${state.revealed ? `${changeSign}${U.fmtNum(s.changePct)}% → ₹${U.fmtNum(s.endPrice)}` : 'What happens next?'}
            </div>

            <div class="game-actions">
              <button class="game-btn game-btn-up" ${state.revealed ? 'disabled' : ''}>▲ Up</button>
              <button class="game-btn game-btn-down" ${state.revealed ? 'disabled' : ''}>▼ Down</button>
            </div>

            ${resultHtml}
          </div>

          <div class="game-sidebar">
            <div class="game-stat-card">
              <div class="game-stat-label">Score</div>
              <div class="game-stat-value" style="color:${state.score >= 500 ? 'var(--green)' : state.score < 500 ? 'var(--red)' : 'var(--text)'}">${state.score}</div>
              ${streakDots.length ? `<div class="game-streak">${streakDots.join('')}</div>` : ''}
            </div>
            <div class="game-stat-card">
              <div class="game-stat-label">Record</div>
              <div class="game-stat-value">${state.wins}W / ${state.losses}L</div>
            </div>
            <div class="game-stat-card">
              <div class="game-stat-label">Best streak</div>
              <div class="game-stat-value" style="color:var(--accent)">${state.bestStreak}</div>
            </div>
            <div class="game-stat-card">
              <div class="game-stat-label">Recent</div>
              <div class="game-history">${historyHtml}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  return {
    async init() {
      await startRound();
      return render();
    },
    predict(dir) {
      predict(dir);
      return render();
    },
    async next() {
      await startRound();
      return render();
    },
  };
})();
