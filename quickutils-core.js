/* ==============================================
   QuickUtils Core JS Library v2
   Shared utilities for all interactive projects
   ============================================== */
'use strict';

const QU = (() => {
  // ── DOM Helpers ──
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // ── Utilities ──
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function generateId(prefix = 'qu') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function debounce(fn, ms = 250) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn.apply(null, args), ms); };
  }

  function throttle(fn, ms = 100) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(null, args); }
    };
  }

  function formatNumber(n) {
    return new Intl.NumberFormat().format(n);
  }

  function formatMoney(n, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ── State Persistence ──
  function saveState(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch { return false; }
  }

  function loadState(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  // ── Theme System ──
  function initTheme(btnSelector = '#themeBtn') {
    const btn = $(btnSelector);
    const saved = localStorage.getItem('qu_theme');
    if (saved) {
      document.documentElement.dataset.theme = saved;
      if (btn) btn.textContent = saved === 'light' ? '☀️' : '🌙';
    }
    if (btn) {
      btn.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.dataset.theme === 'dark';
        html.dataset.theme = isDark ? 'light' : 'dark';
        btn.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('qu_theme', html.dataset.theme);
      });
    }
  }

  // ── Toast Notifications ──
  let toastContainer = null;

  function showToast(msg, type = 'info', duration = 3000) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'qu-toast-container';
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `qu-toast qu-toast-${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, duration);
  }

  // ── Clipboard ──
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
      return true;
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard!', 'success');
      return true;
    }
  }

  // ── Analytics ──
  function initAnalytics(gaId) {
    if (!gaId || typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', gaId);
  }

  // ── Ko-fi Widget ──
  function initKofi(username = 'dayatin') {
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.onload = () => {
      if (window.kofiWidgetOverlay) {
        window.kofiWidgetOverlay.draw(username, {
          type: 'floating-chat',
          'floating-chat.donateButton.text': 'Support Us',
          'floating-chat.donateButton.background-color': '#ff5e5b',
          'floating-chat.donateButton.text-color': '#fff'
        });
      }
    };
    document.body.appendChild(script);
  }

  // ── Discover More Widget ──
  const NETWORK_SITES = [
    { emoji: '⌨️', name: 'Typing Test', url: 'https://typing.quickutils.top' },
    { emoji: '🎨', name: 'Pixel Art', url: 'https://pixelart.quickutils.top' },
    { emoji: '🎵', name: 'Music Maker', url: 'https://music.quickutils.top' },
    { emoji: '🍅', name: 'Focus Timer', url: 'https://focus.quickutils.top' },
    { emoji: '💰', name: 'Budget Tracker', url: 'https://budget.quickutils.top' },
    { emoji: '✅', name: 'Habit Tracker', url: 'https://habits.quickutils.top' },
    { emoji: '🌈', name: 'Gradient Studio', url: 'https://gradients.quickutils.top' },
    { emoji: '🔤', name: 'Regex Playground', url: 'https://regex.quickutils.top' },
    { emoji: '⚗️', name: 'Periodic Table', url: 'https://elements.quickutils.top' },
    { emoji: '🌧️', name: 'Ambient Mixer', url: 'https://ambient.quickutils.top' },
    { emoji: '🔄', name: 'Data Converter', url: 'https://convert.quickutils.top' },
    { emoji: '📊', name: 'Chart Maker', url: 'https://charts.quickutils.top' },
    { emoji: '🧪', name: 'Chemistry Lab', url: 'https://chemistry.quickutils.top' },
    { emoji: '🏆', name: 'Quiz Master', url: 'https://quiz.quickutils.top' },
    { emoji: '💻', name: 'Code Arena', url: 'https://code.quickutils.top' },
    { emoji: '🧬', name: 'Life Simulator', url: 'https://life.quickutils.top' },
    { emoji: '🎮', name: 'Retro Games', url: 'https://games.quickutils.top' },
    { emoji: '📐', name: 'Unit Converter', url: 'https://units.quickutils.top' },
    { emoji: '🖌️', name: 'Whiteboard', url: 'https://whiteboard.quickutils.top' },
    { emoji: '🎯', name: 'CSS Battle', url: 'https://cssbattle.quickutils.top' },
    { emoji: '📈', name: 'Algorithm Viz', url: 'https://algorithms.quickutils.top' },
    { emoji: '⚡', name: 'Circuit Designer', url: 'https://circuits.quickutils.top' },
    { emoji: '🎨', name: 'Color Palette', url: 'https://colors.quickutils.top' },
    { emoji: '📝', name: 'Markdown Editor', url: 'https://markdown.quickutils.top' },
    { emoji: '🔬', name: 'Physics Sandbox', url: 'https://physics.quickutils.top' },
    { emoji: '📉', name: 'Math Grapher', url: 'https://grapher.quickutils.top' },
    { emoji: '🔍', name: 'JSON Explorer', url: 'https://json.quickutils.top' },
    { emoji: '🕐', name: 'Cron Builder', url: 'https://cron.quickutils.top' },
    { emoji: '😄', name: 'Emoji Kitchen', url: 'https://emoji.quickutils.top' },
    { emoji: '✏️', name: 'ASCII Art', url: 'https://ascii.quickutils.top' },
    { emoji: '🔐', name: 'Password Fortress', url: 'https://passwords.quickutils.top' },
  ];

  function initDiscoverBar(currentUrl) {
    // Filter out current site and pick 3 random
    const others = NETWORK_SITES.filter(s => !currentUrl.includes(new URL(s.url).hostname));
    const picks = [];
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) picks.push(shuffled[i]);

    const bar = document.createElement('div');
    bar.className = 'qu-discover-bar';
    bar.innerHTML = `
      <span class="discover-label">Discover More →</span>
      ${picks.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.emoji} ${s.name}</a>`).join('')}
      <button class="qu-discover-close" aria-label="Close">✕</button>
    `;
    document.body.appendChild(bar);

    // Show after 15 seconds
    setTimeout(() => bar.classList.add('visible'), 15000);
    bar.querySelector('.qu-discover-close').addEventListener('click', () => bar.classList.remove('visible'));
  }

  // ── Keyboard Shortcuts ──
  let shortcutsMap = {};

  function registerShortcuts(shortcuts) {
    shortcutsMap = { ...shortcutsMap, ...shortcuts };
    // Build overlay
    let overlay = $('.qu-shortcuts-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'qu-shortcuts-overlay';
      overlay.innerHTML = `<div class="qu-shortcuts-card">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <div class="qu-shortcuts-list"></div>
        <p style="margin-top:1rem;font-size:0.75rem;color:var(--text-muted)">Press <kbd>?</kbd> to toggle</p>
      </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
    }
    const list = overlay.querySelector('.qu-shortcuts-list');
    list.innerHTML = Object.entries(shortcutsMap).map(([key, desc]) =>
      `<div class="qu-shortcut-row"><span>${desc}</span><kbd>${key}</kbd></div>`
    ).join('');
  }

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '?') {
        e.preventDefault();
        const overlay = $('.qu-shortcuts-overlay');
        if (overlay) overlay.classList.toggle('active');
      }
    });
  }

  // ── Undo/Redo Stack ──
  class UndoStack {
    constructor(maxSize = 50) {
      this.stack = [];
      this.pointer = -1;
      this.maxSize = maxSize;
    }
    push(state) {
      // Remove any forward states
      this.stack = this.stack.slice(0, this.pointer + 1);
      this.stack.push(JSON.parse(JSON.stringify(state)));
      if (this.stack.length > this.maxSize) this.stack.shift();
      else this.pointer++;
    }
    undo() {
      if (this.pointer <= 0) return null;
      this.pointer--;
      return JSON.parse(JSON.stringify(this.stack[this.pointer]));
    }
    redo() {
      if (this.pointer >= this.stack.length - 1) return null;
      this.pointer++;
      return JSON.parse(JSON.stringify(this.stack[this.pointer]));
    }
    canUndo() { return this.pointer > 0; }
    canRedo() { return this.pointer < this.stack.length - 1; }
  }

  // ── Session Timer ──
  let sessionStart = Date.now();
  function initSessionTimer() {
    const badge = document.createElement('div');
    badge.className = 'qu-session-badge';
    badge.style.cssText = 'position:fixed;bottom:70px;right:16px;background:var(--glass-bg,rgba(30,30,40,0.8));backdrop-filter:blur(8px);border:1px solid var(--glass-border,rgba(255,255,255,0.08));padding:4px 10px;border-radius:999px;font-size:0.7rem;color:var(--text-muted,#6b6b80);z-index:100;opacity:0;transition:opacity 0.5s;font-family:var(--font-mono,monospace);';
    document.body.appendChild(badge);
    // Show after 30 seconds
    setTimeout(() => { badge.style.opacity = '1'; }, 30000);
    setInterval(() => {
      const secs = Math.floor((Date.now() - sessionStart) / 1000);
      const mins = Math.floor(secs / 60);
      badge.textContent = mins > 0 ? `⏱ ${mins}m ${secs%60}s` : `⏱ ${secs}s`;
    }, 1000);
  }

  // ── Streak Counter ──
  function initStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('qu_last_visit');
    let streak = parseInt(localStorage.getItem('qu_streak') || '0');
    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      streak = (lastVisit === yesterday) ? streak + 1 : 1;
      localStorage.setItem('qu_streak', streak);
      localStorage.setItem('qu_last_visit', today);
      if (streak > 1) {
        setTimeout(() => showToast(`🔥 ${streak}-day streak! Keep it up!`, 'info', 4000), 2000);
      }
    }
    return streak;
  }

  // ── Achievement System ──
  const ACHIEVEMENTS = {
    first_visit: { icon: '🌟', name: 'First Steps', desc: 'Visit for the first time' },
    explorer: { icon: '🧭', name: 'Explorer', desc: 'Visit 5 different tools' },
    dedicated: { icon: '💪', name: 'Dedicated', desc: 'Spend 5 minutes on a tool' },
    streak_3: { icon: '🔥', name: 'On Fire', desc: '3-day visit streak' },
    streak_7: { icon: '⚡', name: 'Unstoppable', desc: '7-day visit streak' },
    night_owl: { icon: '🦉', name: 'Night Owl', desc: 'Use a tool after midnight' },
  };

  function unlockAchievement(key) {
    const unlocked = JSON.parse(localStorage.getItem('qu_achievements') || '{}');
    if (unlocked[key]) return;
    const ach = ACHIEVEMENTS[key];
    if (!ach) return;
    unlocked[key] = Date.now();
    localStorage.setItem('qu_achievements', JSON.stringify(unlocked));
    showToast(`${ach.icon} Achievement: ${ach.name}!`, 'success', 5000);
  }

  function checkAchievements() {
    // First visit
    if (!localStorage.getItem('qu_first_visit')) {
      localStorage.setItem('qu_first_visit', '1');
      unlockAchievement('first_visit');
    }
    // Explorer
    const visited = JSON.parse(localStorage.getItem('qu_visited_sites') || '[]');
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host && !visited.includes(host)) {
      visited.push(host);
      localStorage.setItem('qu_visited_sites', JSON.stringify(visited));
    }
    if (visited.length >= 5) unlockAchievement('explorer');
    // Streak
    const streak = parseInt(localStorage.getItem('qu_streak') || '0');
    if (streak >= 3) unlockAchievement('streak_3');
    if (streak >= 7) unlockAchievement('streak_7');
    // Night owl
    if (new Date().getHours() >= 0 && new Date().getHours() < 5) unlockAchievement('night_owl');
    // Dedicated (5 min timer)
    setTimeout(() => unlockAchievement('dedicated'), 300000);
  }

  // ── Init Everything ──
  function init(opts = {}) {
    initTheme(opts.themeBtn || '#themeBtn');
    if (opts.gaId) initAnalytics(opts.gaId);
    if (opts.kofi !== false) initKofi(opts.kofiUser || 'dayatin');
    if (opts.discover !== false) initDiscoverBar(window.location.href);
    initKeyboardShortcuts();
    registerShortcuts({ '?': 'Show keyboard shortcuts' });
    initSessionTimer();
    initStreak();
    checkAchievements();
  }

  return {
    $, $$, escapeHtml, generateId, debounce, throttle,
    formatNumber, formatMoney, clamp,
    saveState, loadState,
    initTheme, showToast, copyToClipboard,
    initAnalytics, initKofi, initDiscoverBar,
    registerShortcuts, initKeyboardShortcuts,
    UndoStack, init, NETWORK_SITES,
    unlockAchievement, initSessionTimer, initStreak, checkAchievements
  };
})();

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QU;
}
