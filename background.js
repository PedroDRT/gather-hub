import './assets/shared/constants.js';
import './assets/shared/utils.js';

const { DEFAULT_SETTINGS, NOTIFICATION_TYPES, HOST, CONCENTRATION_ALARM } = globalThis.GH;
const { logger } = globalThis.GH_UTILS;

// Session-only state - survives until the service worker is unloaded.
// We always read/write through chrome.storage.session so the service worker
// can hibernate and be revived without losing state.
const SESSION_KEYS = {
  hasNotification: 'hasNotification',
  offscreenReady: 'offscreenReady',
};

let offscreenPromise = null;

chrome.runtime.onInstalled.addListener(async (details) => {
  await chrome.storage.local.set(DEFAULT_SETTINGS);

  if (details.reason === 'install' || details.reason === 'update') {
    try {
      const tabs = await chrome.tabs.query({ url: `*://${HOST}/*` });
      await Promise.all(tabs.map((tab) => chrome.tabs.reload(tab.id)));
    } catch (error) {
      logger.warn('Could not reload Gather tabs:', error);
    }

    if (details.reason === 'install') {
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url || !tab.url.includes(HOST)) return;
    const { [SESSION_KEYS.hasNotification]: hasNotification } =
      await chrome.storage.session.get(SESSION_KEYS.hasNotification);
    if (hasNotification) {
      await clearNotificationState();
    }
  } catch (error) {
    logger.error('Error inspecting active tab:', error);
  }
});

async function getHasNotification() {
  const { [SESSION_KEYS.hasNotification]: value } =
    await chrome.storage.session.get(SESSION_KEYS.hasNotification);
  return Boolean(value);
}

async function setHasNotification(value) {
  await chrome.storage.session.set({ [SESSION_KEYS.hasNotification]: Boolean(value) });
  await chrome.storage.local.set({ hasNotification: Boolean(value) });
}

async function updateBadge() {
  const { isConcentrationMode } = await chrome.storage.local.get('isConcentrationMode');
  const hasNotification = await getHasNotification();

  if (isConcentrationMode) {
    chrome.action.setBadgeText({ text: 'C' });
    chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
  } else if (hasNotification) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

async function clearNotificationState() {
  await setHasNotification(false);
  await updateBadge();
  await stopNotificationSound();
}

async function ensureOffscreen() {
  if (chrome.offscreen?.hasDocument && (await chrome.offscreen.hasDocument())) {
    return;
  }

  if (offscreenPromise) {
    try {
      await offscreenPromise;
      return;
    } catch {
      offscreenPromise = null;
    }
  }

  offscreenPromise = (async () => {
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play notification sounds for wave/chat/call/calendar events.',
      });
    } catch (error) {
      const msg = error?.message ?? '';
      if (!/already exists|single offscreen/i.test(msg)) {
        offscreenPromise = null;
        throw error;
      }
    }
  })();

  return offscreenPromise;
}

async function playNotificationSound(notificationType) {
  if (!NOTIFICATION_TYPES.includes(notificationType)) {
    logger.warn('Unknown notification type:', notificationType);
    return;
  }
  try {
    await ensureOffscreen();
    const key = `${notificationType}Audio`;
    const result = await chrome.storage.local.get([key, 'notificationVolume']);
    const audioFile = result[key] || globalThis.GH.DEFAULT_AUDIO;
    const volume = clampVolume(result.notificationVolume);

    const payload = { action: 'playSound', notificationType, audioFile, volume };

    try {
      await chrome.runtime.sendMessage(payload);
    } catch (error) {
      const msg = error?.message ?? '';
      if (msg.includes('Receiving end does not exist')) {
        logger.warn('Offscreen not responding, recreating and retrying...');
        offscreenPromise = null;
        await ensureOffscreen();
        await chrome.runtime.sendMessage(payload);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Failed to play notification sound:', error);
  }
}

function clampVolume(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.7;
  return Math.min(1, Math.max(0, num));
}

async function stopNotificationSound() {
  if (!chrome.offscreen?.hasDocument || !(await chrome.offscreen.hasDocument())) {
    return;
  }
  try {
    await chrome.runtime.sendMessage({ action: 'stopSound' });
  } catch (error) {
    const msg = error?.message ?? '';
    if (!msg.includes('Receiving end does not exist')) {
      logger.error('Failed to stop notification sound:', error);
    }
  }
}

function buildNotificationMessage(type, { userName, minutes }) {
  const someone = chrome.i18n.getMessage('someone') || 'Someone';
  switch (type) {
    case 'wave': {
      const title = chrome.i18n.getMessage('waveNotificationTitle');
      const body = chrome.i18n.getMessage('waveNotificationMessage');
      return { title, message: `${userName || someone} ${body}` };
    }
    case 'chat': {
      const title = chrome.i18n.getMessage('chatNotificationTitle');
      const body = chrome.i18n.getMessage('chatNotificationMessage');
      return { title, message: `${userName || someone} ${body}` };
    }
    case 'call': {
      const title = chrome.i18n.getMessage('callNotificationTitle') || 'Call';
      const body =
        chrome.i18n.getMessage('callNotificationMessage') || 'is calling you';
      return { title, message: `${userName || someone} ${body}` };
    }
    case 'calendar': {
      const title = chrome.i18n.getMessage('calendarNotificationTitle');
      const template = chrome.i18n.getMessage('calendarNotificationMessage');
      const message = template.replace('{minutes}', String(minutes ?? 0));
      return { title, message };
    }
    default:
      return null;
  }
}

async function handleNotification({ type, userName, minutes }) {
  const settings = await chrome.storage.local.get([
    'enableWave',
    'enableChat',
    'enableCall',
    'enableCalendar',
    'isConcentrationMode',
  ]);

  if (settings.isConcentrationMode) return;

  const enabledKey = `enable${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  if (settings[enabledKey] === false) return;

  const built = buildNotificationMessage(type, { userName, minutes });
  if (!built) return;

  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
      title: built.title,
      message: built.message,
    });
  } catch (error) {
    logger.error('Failed to create notification:', error);
  }

  await setHasNotification(true);
  await updateBadge();
  playNotificationSound(type);
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    const tabs = await chrome.tabs.query({ url: `*://${HOST}/*` });
    const gatherTab = tabs[0];

    if (gatherTab) {
      await chrome.tabs.update(gatherTab.id, { active: true });
      await chrome.windows.update(gatherTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: `https://${HOST}/`, active: true });
    }

    chrome.notifications.clear(notificationId);
    await clearNotificationState();
  } catch (error) {
    logger.error('Failed to handle notification click:', error);
  }
});

async function setConcentrationMode({ enabled, durationMinutes }) {
  // Always clear any previous alarm before applying the new state.
  await chrome.alarms.clear(CONCENTRATION_ALARM);

  if (enabled) {
    const minutes = Number(durationMinutes) || 0;
    const until = minutes > 0 ? Date.now() + minutes * 60 * 1000 : null;
    await chrome.storage.local.set({
      isConcentrationMode: true,
      concentrationModeUntil: until,
      concentrationModeDuration: minutes,
    });
    if (until) {
      await chrome.alarms.create(CONCENTRATION_ALARM, { when: until });
    }
  } else {
    await chrome.storage.local.set({
      isConcentrationMode: false,
      concentrationModeUntil: null,
      concentrationModeDuration: 0,
    });
  }
  await updateBadge();
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CONCENTRATION_ALARM) return;
  logger.info('Concentration timer expired - disabling.');
  await setConcentrationMode({ enabled: false });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.action) {
    case 'setConcentrationMode':
      setConcentrationMode(message)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error?.message }));
      return true;

    case 'notificationDetected':
      handleNotification(message)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          logger.error('handleNotification failed:', error);
          sendResponse({ success: false, error: error?.message });
        });
      return true; // async response

    case 'clearNotificationOnClick':
      clearNotificationState()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error?.message }));
      return true;

    case 'offscreenReady':
      chrome.storage.session.set({ [SESSION_KEYS.offscreenReady]: true });
      sendResponse({ success: true });
      return false;

    case 'updateBadge':
      updateBadge()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error?.message }));
      return true;

    default:
      return false;
  }
});

chrome.runtime.onStartup.addListener(async () => {
  // Restore badge state from persistent storage on browser restart.
  const { hasNotification, isConcentrationMode, concentrationModeUntil } =
    await chrome.storage.local.get([
      'hasNotification',
      'isConcentrationMode',
      'concentrationModeUntil',
    ]);
  await chrome.storage.session.set({
    [SESSION_KEYS.hasNotification]: Boolean(hasNotification),
  });

  // The browser may have been closed past the concentration timer.
  if (isConcentrationMode && concentrationModeUntil && concentrationModeUntil <= Date.now()) {
    await setConcentrationMode({ enabled: false });
  } else {
    await updateBadge();
  }
});
