(() => {
  const {
    AVAILABLE_AUDIOS,
    DEFAULT_AUDIO,
    SUPPORTED_LANGUAGES,
    NOTIFICATION_TYPES,
    CONCENTRATION_DURATIONS,
    NOTIFICATION_HISTORY_KEY,
  } = globalThis.GH;
  const { logger, safeParseSvg } = globalThis.GH_UTILS;

  const FALLBACK_AVATAR = '../assets/icons/icon128.png';
  const I18N_STORAGE_KEY = 'selectedLanguage';

  // Local i18n dictionary loaded at runtime so the user can switch language
  // without restarting Chrome. Falls back to chrome.i18n.getMessage if a key
  // is not in the active dictionary.
  let dictionary = {};

  function t(key, substitutions = {}) {
    let message = dictionary[key];
    if (message === undefined) message = chrome.i18n.getMessage(key);
    if (!message) return '';
    return Object.entries(substitutions).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      message
    );
  }

  function resolveLanguage(lang) {
    if (!lang) return 'pt_BR';
    if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
    const prefix = lang.split(/[-_]/)[0].toLowerCase();
    const match = SUPPORTED_LANGUAGES.find((supported) =>
      supported.toLowerCase().startsWith(prefix)
    );
    return match || 'pt_BR';
  }

  async function loadLocale(lang) {
    const safeLang = resolveLanguage(lang);
    try {
      const url = chrome.runtime.getURL(`_locales/${safeLang}/messages.json`);
      const res = await fetch(url);
      const data = await res.json();
      dictionary = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v.message])
      );
      await chrome.storage.local.set({ [I18N_STORAGE_KEY]: safeLang });
    } catch (error) {
      logger.error('Failed to load locale', lang, error);
      dictionary = {};
    }
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = t(el.dataset.i18n);
      if (value) el.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-text]').forEach((el) => {
      const value = t(el.dataset.i18nText);
      if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = t(el.dataset.i18nAria);
      if (value) el.setAttribute('aria-label', value);
    });

    const timingSelect = document.getElementById('calendarNotificationTiming');
    if (timingSelect) {
      timingSelect.querySelectorAll('option').forEach((option) => {
        const value = parseInt(option.value, 10);
        const word = value === 1 ? t('minute') : t('minutes');
        option.textContent = `${value} ${word}`.trim();
      });
    }
  }

  function populateAudioSelects() {
    const selects = NOTIFICATION_TYPES.map((type) =>
      document.getElementById(`${type}AudioSelect`)
    );
    selects.forEach((select) => {
      if (!select) return;
      const previous = select.value;
      select.innerHTML = '';
      AVAILABLE_AUDIOS.forEach(({ value, i18nKey }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = t(i18nKey) || value;
        select.appendChild(option);
      });
      if (previous) select.value = previous;
    });
  }

  async function loadUserInfo() {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    if (!userAvatar || !userName) return;

    try {
      const stored = await chrome.storage.local.get(['gatherUserName', 'gatherUserAvatar']);

      userName.textContent = stored.gatherUserName
        ? `${t('hello')}, ${stored.gatherUserName}`
        : t('extensionName') || 'Gather Hub';

      const avatar = stored.gatherUserAvatar;
      if (!avatar) {
        userAvatar.src = FALLBACK_AVATAR;
        return;
      }

      if (avatar.trim().toLowerCase().startsWith('<svg')) {
        const svgEl = safeParseSvg(avatar);
        if (svgEl) {
          svgEl.id = 'user-avatar';
          const parent = userAvatar.parentElement;
          if (parent) parent.replaceChild(svgEl, userAvatar);
        } else {
          userAvatar.src = FALLBACK_AVATAR;
        }
        return;
      }

      userAvatar.src = avatar;
      userAvatar.onerror = () => {
        userAvatar.src = FALLBACK_AVATAR;
      };
    } catch (error) {
      logger.error('Failed to load user info:', error);
    }
  }

  function bindStorageInputs(bindings) {
    bindings.forEach(({ id, key, prop, parse }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const raw = el[prop];
        const value = parse ? parse(raw) : raw;
        chrome.storage.local.set({ [key]: value });
      });
    });
  }

  async function loadSettings() {
    const keys = [
      'enableWave',
      'enableChat',
      'enableCall',
      'enableCalendar',
      'calendarNotificationTiming',
      'waveAudio',
      'chatAudio',
      'callAudio',
      'calendarAudio',
      'notificationVolume',
    ];
    const result = await chrome.storage.local.get(keys);

    const checkboxes = ['enableWave', 'enableChat', 'enableCall', 'enableCalendar'];
    checkboxes.forEach((key) => {
      const el = document.getElementById(key);
      if (el) el.checked = result[key] !== false;
    });

    const timing = document.getElementById('calendarNotificationTiming');
    if (timing) {
      timing.value = String(result.calendarNotificationTiming ?? 5);
    }

    const calendarBox = document.getElementById('enableCalendar');
    const calendarTimingContainer = document.getElementById('calendarTimingContainer');
    if (calendarBox && calendarTimingContainer) {
      calendarTimingContainer.style.display = calendarBox.checked ? 'flex' : 'none';
    }

    NOTIFICATION_TYPES.forEach((type) => {
      const sel = document.getElementById(`${type}AudioSelect`);
      if (sel) sel.value = result[`${type}Audio`] || DEFAULT_AUDIO;
    });

    const volume =
      typeof result.notificationVolume === 'number' ? result.notificationVolume : 0.7;
    setVolumeUI(Math.min(1, Math.max(0, volume)));
  }

  async function autoClear() {
    try {
      const notifications = await chrome.notifications.getAll();
      await Promise.all(
        Object.keys(notifications).map((id) => chrome.notifications.clear(id))
      );
      chrome.action.setBadgeText({ text: '' });
      await chrome.runtime.sendMessage({ action: 'clearNotificationOnClick' });
    } catch (error) {
      const msg = error?.message ?? '';
      if (!msg.includes('Receiving end does not exist')) {
        logger.warn('autoClear partial failure:', error);
      }
    }
  }

  function setupTabs() {
    const segmentButtons = document.querySelectorAll('.segment-button');
    const sections = {
      notifications: document.querySelector('.content-body-notifications'),
      audio: document.querySelector('.content-body-audio'),
      history: document.querySelector('.content-body-history'),
      bind: document.querySelector('.content-body-profile'),
    };

    function switchSection(value) {
      segmentButtons.forEach((btn) => btn.classList.remove('active'));
      const active = document.querySelector(`.segment-button[data-value="${value}"]`);
      if (active) active.classList.add('active');
      Object.values(sections).forEach((el) => {
        if (el) el.style.display = 'none';
      });
      const target = sections[value];
      if (target) target.style.display = value === 'notifications' ? 'block' : 'block';
    }

    segmentButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');
        if (value) switchSection(value);
      });
    });

    switchSection('notifications');
  }

  function getCurrentVolume() {
    const slider = document.getElementById('notificationVolumeSlider');
    if (!slider) return 0.7;
    const num = Number(slider.value);
    if (!Number.isFinite(num)) return 0.7;
    return Math.min(1, Math.max(0, num / 100));
  }

  function playPreview(file) {
    if (!file) return;
    const audio = new Audio(chrome.runtime.getURL(`assets/audio/${file}`));
    audio.volume = getCurrentVolume();
    audio.play().catch((error) => logger.error('Preview play failed:', error));
  }

  function setupAudioPreview() {
    document.querySelectorAll('.audio-play-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-audio');
        if (!type) return;
        const select = document.getElementById(`${type}AudioSelect`);
        playPreview(select?.value);
      });
    });
  }

  function setVolumeUI(value) {
    const slider = document.getElementById('notificationVolumeSlider');
    const label = document.getElementById('notificationVolumeValue');
    if (!slider || !label) return;
    const pct = Math.round(value * 100);
    slider.value = String(pct);
    label.textContent = `${pct}%`;
  }

  let volumePreviewTimer = null;
  function setupVolumeSlider() {
    const slider = document.getElementById('notificationVolumeSlider');
    const label = document.getElementById('notificationVolumeValue');
    if (!slider || !label) return;

    slider.addEventListener('input', () => {
      label.textContent = `${slider.value}%`;
    });

    slider.addEventListener('change', () => {
      const volume = getCurrentVolume();
      chrome.storage.local.set({ notificationVolume: volume });
      clearTimeout(volumePreviewTimer);
      volumePreviewTimer = setTimeout(() => {
        playPreview(DEFAULT_AUDIO);
      }, 120);
    });
  }

  function setupSettingsMenu() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const languageSelect = document.getElementById('languageSelect');
    if (!settingsBtn || !settingsMenu) return;

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = settingsMenu.style.display !== 'none';
      settingsMenu.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
        settingsMenu.style.display = 'none';
      }
    });

    // Prevent the menu from closing when interacting with the language picker.
    settingsMenu.addEventListener('click', (e) => e.stopPropagation());

    if (languageSelect) {
      languageSelect.addEventListener('change', async (e) => {
        const lang = e.target.value;
        if (!lang) return;
        await loadLocale(lang);
        applyI18n();
        populateAudioSelects();
        populateConcentrationDurations();
        await Promise.all([loadUserInfo(), loadConcentrationState()]);
      });
    }
  }

  function syncLanguageSelect(lang) {
    const select = document.getElementById('languageSelect');
    if (select) select.value = lang;
  }

  let countdownInterval = null;

  function formatRemaining(ms) {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function populateConcentrationDurations() {
    const select = document.getElementById('concentrationDurationSelect');
    if (!select) return;
    select.innerHTML = '';
    CONCENTRATION_DURATIONS.forEach(({ minutes, i18nKey }) => {
      const option = document.createElement('option');
      option.value = String(minutes);
      option.textContent = t(i18nKey) || (minutes === 0 ? '∞' : `${minutes} min`);
      select.appendChild(option);
    });
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function renderConcentrationState({ enabled, until, durationMinutes }) {
    const toggle = document.getElementById('concentrationToggle');
    const durationItem = document.getElementById('concentrationDurationItem');
    const durationSelect = document.getElementById('concentrationDurationSelect');
    const countdownItem = document.getElementById('concentrationCountdownItem');
    const countdownEl = document.getElementById('concentrationCountdown');

    if (toggle) toggle.checked = Boolean(enabled);
    if (durationSelect) durationSelect.value = String(durationMinutes ?? 0);

    stopCountdown();

    if (!enabled) {
      if (durationItem) durationItem.style.display = 'flex';
      if (durationSelect) durationSelect.disabled = false;
      if (countdownItem) countdownItem.style.display = 'none';
      return;
    }

    if (durationSelect) durationSelect.disabled = true;

    if (until) {
      if (countdownItem) countdownItem.style.display = 'flex';
      const tick = () => {
        const remaining = until - Date.now();
        if (remaining <= 0) {
          stopCountdown();
          loadConcentrationState();
          return;
        }
        if (countdownEl) countdownEl.textContent = formatRemaining(remaining);
      };
      tick();
      countdownInterval = setInterval(tick, 1000);
    } else {
      if (countdownItem) countdownItem.style.display = 'flex';
      if (countdownEl) countdownEl.textContent = t('concentrationIndefiniteShort') || '∞';
    }
  }

  async function loadConcentrationState() {
    const stored = await chrome.storage.local.get([
      'isConcentrationMode',
      'concentrationModeUntil',
      'concentrationModeDuration',
    ]);
    renderConcentrationState({
      enabled: stored.isConcentrationMode === true,
      until: stored.concentrationModeUntil || null,
      durationMinutes: stored.concentrationModeDuration ?? 0,
    });
  }

  function setupConcentrationControls() {
    const toggle = document.getElementById('concentrationToggle');
    const durationSelect = document.getElementById('concentrationDurationSelect');

    if (toggle) {
      toggle.addEventListener('change', async () => {
        const minutes = parseInt(durationSelect?.value ?? '0', 10) || 0;
        try {
          await chrome.runtime.sendMessage({
            action: 'setConcentrationMode',
            enabled: toggle.checked,
            durationMinutes: minutes,
          });
        } catch (error) {
          logger.error('Failed to update concentration mode:', error);
        }
        await loadConcentrationState();
      });
    }

    if (durationSelect) {
      durationSelect.addEventListener('change', async () => {
        if (!toggle?.checked) return;
        const minutes = parseInt(durationSelect.value, 10) || 0;
        try {
          await chrome.runtime.sendMessage({
            action: 'setConcentrationMode',
            enabled: true,
            durationMinutes: minutes,
          });
        } catch (error) {
          logger.error('Failed to update concentration duration:', error);
        }
        await loadConcentrationState();
      });
    }
  }

  function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    if (!themeToggle || !themeIcon) return;

    const moonPath =
      '<path d="M320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C388.8 576 451.3 548.8 497.3 504.6C504.6 497.6 506.7 486.7 502.6 477.5C498.5 468.3 488.9 462.6 478.8 463.4C473.9 463.8 469 464 464 464C362.4 464 280 381.6 280 280C280 207.9 321.5 145.4 382.1 115.2C391.2 110.7 396.4 100.9 395.2 90.8C394 80.7 386.6 72.5 376.7 70.3C358.4 66.2 339.4 64 320 64z"/>';
    const sunPath =
      '<path d="M210.2 53.9C217.6 50.8 226 51.7 232.7 56.1L320.5 114.3L408.3 56.1C415 51.7 423.4 50.9 430.8 53.9C438.2 56.9 443.4 63.5 445 71.3L465.9 174.5L569.1 195.4C576.9 197 583.5 202.4 586.5 209.7C589.5 217 588.7 225.5 584.3 232.2L526.1 320L584.3 407.8C588.7 414.5 589.5 422.9 586.5 430.3C583.5 437.7 576.9 443.1 569.1 444.6L465.8 465.4L445 568.7C443.4 576.5 438 583.1 430.7 586.1C423.4 589.1 414.9 588.3 408.2 583.9L320.4 525.7L232.6 583.9C225.9 588.3 217.5 589.1 210.1 586.1C202.7 583.1 197.3 576.5 195.8 568.7L175 465.4L71.7 444.5C63.9 442.9 57.3 437.5 54.3 430.2C51.3 422.9 52.1 414.4 56.5 407.7L114.7 320L56.5 232.2C52.1 225.5 51.3 217.1 54.3 209.7C57.3 202.3 63.9 196.9 71.7 195.4L175 174.6L195.9 71.3C197.5 63.5 202.9 56.9 210.2 53.9zM239.6 320C239.6 275.6 275.6 239.6 320 239.6C364.4 239.6 400.4 275.6 400.4 320C400.4 364.4 364.4 400.4 320 400.4C275.6 400.4 239.6 364.4 239.6 320zM448.4 320C448.4 249.1 390.9 191.6 320 191.6C249.1 191.6 191.6 249.1 191.6 320C191.6 390.9 249.1 448.4 320 448.4C390.9 448.4 448.4 390.9 448.4 320z"/>';

    function apply(isDark) {
      document.body.classList.toggle('dark-theme', isDark);
      themeIcon.innerHTML = isDark ? moonPath : sunPath;
    }

    chrome.storage.local.get('theme').then(({ theme }) => {
      const isDark = theme === 'dark';
      themeToggle.checked = isDark;
      apply(isDark);
    });

    themeToggle.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      apply(isDark);
      chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    });
  }

  function setupCalendarToggle() {
    const checkbox = document.getElementById('enableCalendar');
    const container = document.getElementById('calendarTimingContainer');
    if (!checkbox || !container) return;
    checkbox.addEventListener('change', () => {
      container.style.display = checkbox.checked ? 'flex' : 'none';
    });
  }

  // Notification history -----------------------------------------------
  const HISTORY_TYPE_ICONS = {
    wave: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M256 64C238.3 64 224 78.3 224 96L224 320C224 337.7 238.3 352 256 352C273.7 352 288 337.7 288 320L288 96C288 78.3 273.7 64 256 64zM352 64C334.3 64 320 78.3 320 96L320 320C320 337.7 334.3 352 352 352C369.7 352 384 337.7 384 320L384 96C384 78.3 369.7 64 352 64zM160 192C142.3 192 128 206.3 128 224L128 384C128 490 214 576 320 576C426 576 512 490 512 384L512 224C512 206.3 497.7 192 480 192C462.3 192 448 206.3 448 224L448 320C448 337.7 433.7 352 416 352C398.3 352 384 337.7 384 320L384 96"/></svg>',
    chat: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M88.1 112C74.7 112 64 122.7 64 136L64 446.4C64 463.6 77.9 477.5 95.1 477.5L189.1 477.5L189.1 549.4C189.1 564.5 207.4 572 218 561.4L302 477.5L544.9 477.5C562.1 477.5 576 463.6 576 446.4L576 136C576 122.7 565.3 112 552 112L88.1 112z"/></svg>',
    call: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M168.1 96.6C162.5 83.1 147.7 75.7 133.6 79.5L37.6 105.7C24.7 109.2 15.7 121 15.8 134.4C15.8 379.4 214.3 578 459.3 578C472.7 578 484.5 569 488 556.1L514.2 460.1C518 446 510.6 431.2 497.1 425.6L392.4 381.9C380.4 376.9 366.4 380.4 358.2 390.5L314.1 444.4C237.3 408.1 175.3 346.1 139 269.3L192.9 225.2C203 217 206.5 203 201.5 191L168.1 96.6z"/></svg>',
    calendar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M192 64C209.7 64 224 78.3 224 96L224 128L416 128L416 96C416 78.3 430.3 64 448 64C465.7 64 480 78.3 480 96L480 128L512 128C547.3 128 576 156.7 576 192L576 240L64 240L64 192C64 156.7 92.7 128 128 128L160 128L160 96C160 78.3 174.3 64 192 64zM64 288L576 288L576 512C576 547.3 547.3 576 512 576L128 576C92.7 576 64 547.3 64 512L64 288z"/></svg>',
  };

  function formatRelativeTime(timestamp) {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 5) return t('historyJustNow') || 'agora';
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d`;
  }

  function buildHistoryAvatar(entry) {
    const wrap = document.createElement('div');
    const type = entry.type || 'wave';
    wrap.className = `history-item-avatar history-icon-${type}`;

    if (entry.avatar && /^https?:/i.test(entry.avatar)) {
      const img = document.createElement('img');
      img.className = 'history-item-avatar-img';
      img.src = entry.avatar;
      img.alt = entry.userName || '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        wrap.innerHTML = HISTORY_TYPE_ICONS[type] || HISTORY_TYPE_ICONS.wave;
      });
      wrap.appendChild(img);

      const badge = document.createElement('span');
      badge.className = `history-item-badge history-icon-${type}`;
      badge.innerHTML = HISTORY_TYPE_ICONS[type] || HISTORY_TYPE_ICONS.wave;
      wrap.appendChild(badge);
    } else {
      wrap.classList.add('history-item-avatar--icon');
      wrap.innerHTML = HISTORY_TYPE_ICONS[type] || HISTORY_TYPE_ICONS.wave;
    }
    return wrap;
  }

  function renderHistory(list) {
    const container = document.getElementById('historyList');
    const empty = document.getElementById('historyEmpty');
    if (!container || !empty) return;

    container.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      empty.style.display = 'block';
      container.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    container.style.display = 'block';

    list.forEach((entry) => {
      if (!entry) return;
      const item = document.createElement('div');
      item.className = 'history-item';

      const avatar = buildHistoryAvatar(entry);

      const body = document.createElement('div');
      body.className = 'history-item-body';

      const title = document.createElement('div');
      title.className = 'history-item-title';
      title.textContent = entry.userName || entry.title || t('someone') || '—';

      const message = document.createElement('div');
      message.className = 'history-item-message';
      message.textContent = entry.messageBody || entry.message || '';

      body.appendChild(title);
      if (message.textContent) body.appendChild(message);

      const time = document.createElement('div');
      time.className = 'history-item-time';
      time.textContent = formatRelativeTime(entry.createdAt || Date.now());

      item.appendChild(avatar);
      item.appendChild(body);
      item.appendChild(time);
      container.appendChild(item);
    });
  }

  async function loadHistory() {
    const stored = await chrome.storage.local.get(NOTIFICATION_HISTORY_KEY);
    renderHistory(stored[NOTIFICATION_HISTORY_KEY] || []);
  }

  function setupHistory() {
    const clearBtn = document.getElementById('historyClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        try {
          await chrome.runtime.sendMessage({ action: 'clearNotificationHistory' });
        } catch (error) {
          logger.warn('Clear history fallback:', error);
          await chrome.storage.local.set({ [NOTIFICATION_HISTORY_KEY]: [] });
        }
      });
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[NOTIFICATION_HISTORY_KEY]) {
        renderHistory(changes[NOTIFICATION_HISTORY_KEY].newValue || []);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const stored = await chrome.storage.local.get(I18N_STORAGE_KEY);
    const initialLang = resolveLanguage(
      stored[I18N_STORAGE_KEY] || chrome.i18n.getUILanguage()
    );
    await loadLocale(initialLang);

    setupTabs();
    populateAudioSelects();
    applyI18n();
    syncLanguageSelect(initialLang);

    bindStorageInputs([
      { id: 'enableWave', key: 'enableWave', prop: 'checked' },
      { id: 'enableChat', key: 'enableChat', prop: 'checked' },
      { id: 'enableCall', key: 'enableCall', prop: 'checked' },
      { id: 'enableCalendar', key: 'enableCalendar', prop: 'checked' },
      {
        id: 'calendarNotificationTiming',
        key: 'calendarNotificationTiming',
        prop: 'value',
        parse: (v) => parseInt(v, 10),
      },
      { id: 'waveAudioSelect', key: 'waveAudio', prop: 'value' },
      { id: 'chatAudioSelect', key: 'chatAudio', prop: 'value' },
      { id: 'callAudioSelect', key: 'callAudio', prop: 'value' },
      { id: 'calendarAudioSelect', key: 'calendarAudio', prop: 'value' },
    ]);

    setupCalendarToggle();
    setupAudioPreview();
    setupVolumeSlider();
    setupSettingsMenu();
    setupTheme();
    setupHistory();

    populateConcentrationDurations();
    setupConcentrationControls();

    await Promise.all([
      loadUserInfo(),
      loadSettings(),
      loadConcentrationState(),
      loadHistory(),
    ]);
    await autoClear();

    window.addEventListener('beforeunload', stopCountdown);
  });
})();
