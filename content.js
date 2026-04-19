(function () {
  const { NOTIFICATION_PATTERNS, DEDUP_TTL_MS, CALENDAR_DEDUP_TTL_MS, DEDUP_MAX_SIZE } =
    globalThis.GH;
  const { logger, debounce, createDedupSet, extractMatch, cleanUserName } =
    globalThis.GH_UTILS;

  const TOOLBAR_SELECTORS = ['#av-toolbar-pip-container', '._2owp20p._2owp20r'];
  const USER_INFO_REFRESH_LIMIT = 6; // ~30s of polling at 5s intervals
  const USER_INFO_POLL_MS = 5000;
  const NOTIFICATION_DEBOUNCE_MS = 50;

  const dedup = {
    wave: createDedupSet({ ttl: DEDUP_TTL_MS, max: DEDUP_MAX_SIZE }),
    chat: createDedupSet({ ttl: DEDUP_TTL_MS, max: DEDUP_MAX_SIZE }),
    call: createDedupSet({ ttl: DEDUP_TTL_MS, max: DEDUP_MAX_SIZE }),
    calendar: createDedupSet({ ttl: CALENDAR_DEDUP_TTL_MS, max: DEDUP_MAX_SIZE }),
  };

  let userInfoPollTimer = null;
  let userInfoPolls = 0;

  function getToolbar() {
    for (const selector of TOOLBAR_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function readUserInfo() {
    const info = { name: null, avatar: null };
    const toolbar = getToolbar();
    if (!toolbar) return info;

    const img = toolbar.querySelector('img');
    if (img) {
      info.avatar = img.src || null;
      info.name = img.alt || null;
      return info;
    }
    const svg = toolbar.querySelector('svg');
    if (svg) {
      info.name = svg.getAttribute('aria-label') || null;
      info.avatar = svg.outerHTML;
    }
    return info;
  }

  async function syncUserInfo() {
    const info = readUserInfo();
    if (!info.name && !info.avatar) return false;

    try {
      const stored = await chrome.storage.local.get(['gatherUserName', 'gatherUserAvatar']);
      const update = {};

      const validName = info.name && info.name !== 'Gather' ? info.name : null;
      if (validName && validName !== stored.gatherUserName) update.gatherUserName = validName;
      if (info.avatar && info.avatar !== stored.gatherUserAvatar) {
        update.gatherUserAvatar = info.avatar;
      }
      if (Object.keys(update).length > 0) {
        await chrome.storage.local.set(update);
      }
      return Boolean(validName && info.avatar);
    } catch (error) {
      logger.error('Failed to sync user info:', error);
      return false;
    }
  }

  function startUserInfoPolling() {
    if (userInfoPollTimer) return;
    userInfoPollTimer = setInterval(async () => {
      userInfoPolls += 1;
      const complete = await syncUserInfo();
      if (complete || userInfoPolls >= USER_INFO_REFRESH_LIMIT) {
        clearInterval(userInfoPollTimer);
        userInfoPollTimer = null;
      }
    }, USER_INFO_POLL_MS);
  }

  function watchToolbar(toolbar) {
    const debounced = debounce(syncUserInfo, 200);
    const observer = new MutationObserver(debounced);
    observer.observe(toolbar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'src', 'aria-label'],
    });
  }

  function init() {
    const run = () => setTimeout(syncUserInfo, 2000);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }

    const toolbar = getToolbar();
    if (toolbar) {
      watchToolbar(toolbar);
    } else if (document.body) {
      const bodyObserver = new MutationObserver(() => {
        const found = getToolbar();
        if (found) {
          syncUserInfo();
          bodyObserver.disconnect();
          watchToolbar(found);
        }
      });
      bodyObserver.observe(document.body, { childList: true, subtree: false });
    }

    startUserInfoPolling();
  }

  // Send a detection event to the background, with dedup per message id.
  function dispatchNotification(type, payload) {
    chrome.runtime
      .sendMessage({ action: 'notificationDetected', type, ...payload })
      .catch((error) => {
        logger.error(`Failed to dispatch ${type} notification:`, error);
      });
  }

  // Skip wave notifications when the user is already looking at the chat panel.
  function shouldIgnoreWaveNotification() {
    return (
      document.visibilityState === 'visible' &&
      window.location.pathname.includes('/chat/')
    );
  }

  async function isEnabled(key) {
    const result = await chrome.storage.local.get(key);
    return result[key] !== false;
  }

  async function handleWave(text, match) {
    if (!(await isEnabled('enableWave'))) return;
    if (shouldIgnoreWaveNotification()) return;
    const userName = cleanUserName(match[1]) || null;
    const id = `${userName || 'unknown'}_${text.substring(0, 100)}`;
    if (dedup.wave.has(id)) return;
    dedup.wave.add(id);
    dispatchNotification('wave', { message: text, userName });
  }

  async function handleChat(text, match) {
    if (!(await isEnabled('enableChat'))) return;
    const userName = cleanUserName(match[1]) || null;
    const id = `${userName || 'unknown'}_${text.substring(0, 100)}`;
    if (dedup.chat.has(id)) return;
    dedup.chat.add(id);
    dispatchNotification('chat', { message: text, userName });
  }

  async function handleCall(text, match) {
    if (!(await isEnabled('enableCall'))) return;
    const userName = cleanUserName(match[1]) || null;
    const id = `${userName || 'unknown'}_${text.substring(0, 100)}`;
    if (dedup.call.has(id)) return;
    dedup.call.add(id);
    dispatchNotification('call', { message: text, userName });
  }

  async function handleCalendar(text, match) {
    if (!(await isEnabled('enableCalendar'))) return;
    const result = await chrome.storage.local.get('calendarNotificationTiming');
    const target = result.calendarNotificationTiming ?? 5;
    const minutes = parseInt(match[1], 10);
    if (Number.isNaN(minutes) || minutes !== target) return;
    const id = `${text.substring(0, 50)}_${minutes}`;
    if (dedup.calendar.has(id)) return;
    dedup.calendar.add(id);
    dispatchNotification('calendar', { message: text, minutes });
  }

  function checkText(text) {
    if (!text || text.trim().length === 0) return;

    const wave = extractMatch(text, NOTIFICATION_PATTERNS.wave);
    if (wave) return handleWave(text, wave);

    const chat = extractMatch(text, NOTIFICATION_PATTERNS.chat);
    if (chat) return handleChat(text, chat);

    const call = extractMatch(text, NOTIFICATION_PATTERNS.call);
    if (call) return handleCall(text, call);

    const calendar = extractMatch(text, NOTIFICATION_PATTERNS.calendar);
    if (calendar) return handleCalendar(text, calendar);
  }

  // Throttle bursts of mutations into a single scan per frame.
  const pendingTexts = new Set();
  const flushTexts = debounce(() => {
    for (const text of pendingTexts) checkText(text);
    pendingTexts.clear();
  }, NOTIFICATION_DEBOUNCE_MS);

  function queueText(text) {
    if (text && text.trim().length > 0) {
      pendingTexts.add(text);
      flushTexts();
    }
  }

  function setupNotificationObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              queueText(node.textContent || '');
            }
          }
        } else if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent) queueText(parent.textContent || '');
        }
      }
    });

    const observe = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    };

    if (document.body) {
      observe();
    } else {
      const wait = setInterval(() => {
        if (document.body) {
          clearInterval(wait);
          observe();
        }
      }, 100);
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === 'getUserInfo') {
      sendResponse(readUserInfo());
      return false;
    }
    return false;
  });

  init();
  setupNotificationObserver();
})();
