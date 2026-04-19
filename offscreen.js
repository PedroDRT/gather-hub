const { logger } = globalThis.GH_UTILS;

let currentAudio = null;

logger.info('Offscreen document loaded');

chrome.runtime.sendMessage({ action: 'offscreenReady' }).catch((error) => {
  // The background may not be listening at startup; ignore that single case.
  if (!/Receiving end does not exist/i.test(error?.message ?? '')) {
    logger.warn('Failed to announce offscreen readiness:', error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.action) {
    case 'playSound':
      playNotificationSound(
        message.notificationType || 'wave',
        message.audioFile,
        message.volume
      );
      sendResponse({ success: true });
      return false;
    case 'stopSound':
      stopNotificationSound();
      sendResponse({ success: true });
      return false;
    default:
      return false;
  }
});

function clampVolume(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.7;
  return Math.min(1, Math.max(0, num));
}

function playNotificationSound(notificationType, audioFile = 'gather-notificator-audio.mp3', volume) {
  try {
    stopNotificationSound();

    const audioPath = chrome.runtime.getURL(`assets/audio/${audioFile}`);
    const audio = new Audio(audioPath);
    audio.volume = clampVolume(volume);

    audio.addEventListener('error', (e) => {
      logger.error('Audio error:', notificationType, audioFile, e);
    });
    audio.addEventListener('ended', () => {
      if (currentAudio === audio) currentAudio = null;
    });

    currentAudio = audio;
    audio.play().catch((error) => {
      logger.error('Audio.play() rejected for', notificationType, audioFile, error);
      if (currentAudio === audio) currentAudio = null;
    });

    logger.debug('Playing notification sound:', notificationType, audioFile);
  } catch (error) {
    logger.error('Unexpected error in playNotificationSound:', error);
  }
}

function stopNotificationSound() {
  if (!currentAudio) return;
  try {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  } catch (error) {
    logger.warn('Error stopping audio:', error);
  } finally {
    currentAudio = null;
  }
}
