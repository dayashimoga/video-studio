/* ==============================================
   QuickUtils Core JS Library v2.3
   Shared utilities for all interactive projects
   Updated: 2026-04-14 - Limit Resolved Full Deploy
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

  // ── Network App Launcher ──
  const NETWORK_SITES = [
    { category: 'Directory', emoji: '📂', name: 'API Status Directory', url: 'https://apistatus.quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'Boilerplates Directory', url: 'https://boilerplates.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Boring Website', url: 'https://quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'Cheatsheets Directory', url: 'https://cheatsheets.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Daily Facts', url: 'https://facts.quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'Datasets Directory', url: 'https://datasets.quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'Jobs Directory', url: 'https://jobs.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Market Digest', url: 'https://market.quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'Open Source Directory', url: 'https://opensource.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Price Comparator', url: 'https://prices.quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'Prompts Directory', url: 'https://prompts.quickutils.top' },
    { category: 'Directory', emoji: '📂', name: 'API Directory', url: 'https://directory.quickutils.top/' },
    { category: 'Directory', emoji: '📂', name: 'Tools Directory', url: 'https://tools.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Typing Speed Test', url: 'https://typing.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'Regex Playground', url: 'https://regex.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Pomodoro Focus Timer', url: 'https://focus.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Data Converter', url: 'https://convert.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Budget Tracker', url: 'https://budget.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Habit Tracker', url: 'https://habits.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'CSS Gradient Studio', url: 'https://gradients.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Ambient Sound Mixer', url: 'https://ambient.quickutils.top' },
    { category: 'Science & Education', emoji: '🔬', name: 'Interactive Periodic Table', url: 'https://elements.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Pixel Art Editor', url: 'https://pixelart.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Music Maker', url: 'https://music.quickutils.top' },
    { category: 'Science & Education', emoji: '🔬', name: 'Chemistry Lab', url: 'https://chemistry.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'Algorithm Visualizer', url: 'https://algorithms.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'Code Arena', url: 'https://code.quickutils.top' },
    { category: 'Entertainment', emoji: '🎮', name: 'Quiz Master', url: 'https://quiz.quickutils.top' },
    { category: 'Entertainment', emoji: '🎮', name: 'Life Simulator', url: 'https://life.quickutils.top' },
    { category: 'Entertainment', emoji: '🎮', name: 'Collaborative Whiteboard', url: 'https://whiteboard.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Chart Maker', url: 'https://charts.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'CSS Battle', url: 'https://cssbattle.quickutils.top' },
    { category: 'Entertainment', emoji: '🎮', name: 'Retro Games', url: 'https://games.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Unit Converter', url: 'https://units.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Circuit Designer', url: 'https://circuits.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Color Palette Generator', url: 'https://colors.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'Markdown Editor', url: 'https://markdown.quickutils.top' },
    { category: 'Science & Education', emoji: '🔬', name: 'Physics Sandbox', url: 'https://physics.quickutils.top' },
    { category: 'Science & Education', emoji: '🔬', name: 'Math Grapher', url: 'https://grapher.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'JSON Explorer', url: 'https://json.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'Cron Builder', url: 'https://cron.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Emoji Kitchen', url: 'https://emoji.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'ASCII Art Studio', url: 'https://ascii.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Password Fortress', url: 'https://passwords.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Text Toolkit', url: 'https://text.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'QR Studio', url: 'https://qr.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Country Explorer', url: 'https://countries.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Coloring Books', url: 'https://coloring.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'SVG Editor', url: 'https://svg.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Network Tools', url: 'https://nettools.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Meal Planner', url: 'https://meals.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Invoice Generator', url: 'https://invoices.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Resume Builder', url: 'https://resume.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Mind Map', url: 'https://mindmap.quickutils.top' },
    { category: 'Science & Education', emoji: '🔬', name: 'Solar System Explorer', url: 'https://solar.quickutils.top' },
    { category: 'Science & Education', emoji: '🔬', name: 'DNA Lab', url: 'https://dna.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Video Studio', url: 'https://video.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Loan Calculator', url: 'https://loan.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'IP Lookup', url: 'https://ip.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Image Converter', url: 'https://image.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'Habit Streak', url: 'https://streak.quickutils.top' },
    { category: 'Entertainment', emoji: '🎮', name: 'Font Playground', url: 'https://fonts.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Flashcard Maker', url: 'https://flashcards.quickutils.top' },
    { category: 'Developer Tools', emoji: '💻', name: 'Code Diff', url: 'https://diff.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Sound Board', url: 'https://sounds.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'Drawing Board', url: 'https://draw.quickutils.top' },
    { category: 'Productivity', emoji: '✅', name: 'World Clock', url: 'https://clock.quickutils.top' },
    { category: 'Utilities', emoji: '🛠️', name: 'Space Mission Control', url: 'https://spacemission.quickutils.top' },
    { category: 'Creative Studio', emoji: '🎨', name: 'PDF Studio', url: 'https://pdfstudio.quickutils.top' },
    { category: 'Productivity', emoji: '🎤', name: 'Subtitle Generator', url: 'https://subtitlegenerator.quickutils.top' },
    { category: 'Productivity', emoji: '📈', name: 'FIRE Simulator', url: 'https://firesimulator.quickutils.top' },
    { category: 'Creative Studio', emoji: '🏠', name: '3D Room Planner', url: 'https://roomplanner.quickutils.top' },
    { category: 'Productivity', emoji: '🏋️', name: 'Workout Architect', url: 'https://workoutarchitect.quickutils.top' },
    { category: 'Creative Studio', emoji: '🌍', name: 'World Builder', url: 'https://worldbuilder.quickutils.top' },
    { category: 'Productivity', emoji: '🌱', name: 'Garden Planner', url: 'https://gardenplanner.quickutils.top' },
    { category: 'Entertainment', emoji: '🎵', name: 'Beat Maker', url: 'https://beatmaker.quickutils.top' },
    { category: 'Productivity', emoji: '✈️', name: 'Travel Builder', url: 'https://travelbuilder.quickutils.top' },
    { category: 'Science & Education', emoji: '🗣️', name: 'Language Playground', url: 'https://languageplayground.quickutils.top' },
    { category: 'Productivity', emoji: '🧘', name: 'Meditation Journey', url: 'https://meditationjourney.quickutils.top' },
  ];

  function initNetworkLauncher() {
    let launcherOverlay = null;

    // Create the FAB Button
    const fabButton = document.createElement('button');
    fabButton.className = 'qu-launcher-fab';
    fabButton.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    fabButton.setAttribute('aria-label', 'Explore Network');
    document.body.appendChild(fabButton);

    // Grouping sites by category
    const grouped = {};
    NETWORK_SITES.forEach(site => {
        if (!grouped[site.category]) grouped[site.category] = [];
        grouped[site.category].push(site);
    });

    let htmlContent = `<div class="qu-launcher-overlay hidden" id="quNetworkLauncher">
      <div class="qu-launcher-modal">
        <div class="qu-launcher-header">
           <h2>Explore QuickUtils</h2>
           <button class="qu-launcher-close" aria-label="Close">&times;</button>
        </div>
        <div class="qu-launcher-search">
           <input type="text" id="quLauncherSearch" placeholder="Search ${NETWORK_SITES.length} free tools..." autocomplete="off"/>
        </div>
        <div class="qu-launcher-content">`;
    
    Object.keys(grouped).forEach(cat => {
        htmlContent += `<div class="qu-launcher-category" data-cat="${cat}">
           <h3>${cat}</h3>
           <div class="qu-launcher-grid">`;
        grouped[cat].forEach(site => {
            htmlContent += `<a href="${site.url}" target="_blank" rel="noopener" class="qu-launcher-item" data-name="${site.name.toLowerCase()}">
                <span class="emoji">${site.emoji}</span>
                <span class="name">${site.name}</span>
            </a>`;
        });
        htmlContent += `</div></div>`;
    });

    htmlContent += `</div></div></div>`;

    // Append to body effectively
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlContent;
    document.body.appendChild(wrapper.firstElementChild);

    launcherOverlay = document.getElementById('quNetworkLauncher');
    const closeBtn = launcherOverlay.querySelector('.qu-launcher-close');
    const searchInput = document.getElementById('quLauncherSearch');
    const items = launcherOverlay.querySelectorAll('.qu-launcher-item');
    const categoriesDivs = launcherOverlay.querySelectorAll('.qu-launcher-category');

    function toggleLauncher() {
        if (launcherOverlay.classList.contains('hidden')) {
            launcherOverlay.classList.remove('hidden');
            setTimeout(() => launcherOverlay.classList.add('visible'), 10);
            setTimeout(() => searchInput.focus(), 300);
        } else {
             launcherOverlay.classList.remove('visible');
             setTimeout(() => launcherOverlay.classList.add('hidden'), 300);
             searchInput.value = '';
             searchInput.dispatchEvent(new Event('input'));
        }
    }

    fabButton.addEventListener('click', toggleLauncher);
    closeBtn.addEventListener('click', toggleLauncher);
    
    // Close on backdrop click
    launcherOverlay.addEventListener('click', (e) => {
        if (e.target === launcherOverlay) toggleLauncher();
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !launcherOverlay.classList.contains('hidden')) toggleLauncher();
    });

    // Smart Search
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        items.forEach(item => {
            const name = item.dataset.name;
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
        // Hide empty categories
        categoriesDivs.forEach(catDiv => {
            const visibleItems = catDiv.querySelectorAll('.qu-launcher-item[style="display: flex;"], .qu-launcher-item:not([style*="none"])');
            catDiv.style.display = visibleItems.length === 0 && query !== '' ? 'none' : 'block';
        });
    });
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
    if (opts.discover !== false) initNetworkLauncher();
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
    initAnalytics, initKofi, initNetworkLauncher,
    registerShortcuts, initKeyboardShortcuts,
    UndoStack, init, NETWORK_SITES,
    unlockAchievement, initSessionTimer, initStreak, checkAchievements
  };
})();

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QU;
}
