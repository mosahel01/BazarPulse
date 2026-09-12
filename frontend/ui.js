/* Shared rendering helpers. */

window.UI = (() => {
  const esc = (value) => {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  };

  const fmtNum = (value) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value ?? 0);

  const timeAgo = (iso) => {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const directionClass = (direction) => {
    const map = { BULLISH: 'dir-bull', BEARISH: 'dir-bear', NEUTRAL: 'dir-neutral' };
    return map[direction] ?? 'dir-neutral';
  };

  const changeClass = (pct) => (pct >= 0 ? 'up' : 'down');

  const score = (p) => (p.upvotes ?? 0) - (p.downvotes ?? 0);

  return { esc, fmtNum, timeAgo, directionClass, changeClass, score };
})();
