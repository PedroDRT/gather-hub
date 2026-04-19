// Constants shared across background, content scripts, popup and offscreen.
// Exposes a single global object `GH` (works in service workers, content scripts and pages).
(function () {
  const DEFAULT_AUDIO = 'gather-notificator-audio.mp3';

  const GH = {
    DEFAULT_AUDIO,

    AVAILABLE_AUDIOS: [
      { value: 'gather-notificator-audio.mp3', i18nKey: 'audioDefault' },
      { value: 'gather-notificator-audio2.wav', i18nKey: 'audioClassic' },
      { value: 'gather-notificator-audio3.mp3', i18nKey: 'audioSoft' },
      { value: 'gather-notificator-audio4.mp3', i18nKey: 'audioModern' },
      { value: 'gather-notificator-audio5.mp3', i18nKey: 'audioEnergetic' },
    ],

    NOTIFICATION_TYPES: ['wave', 'chat', 'call', 'calendar'],

    DEFAULT_SETTINGS: {
      enableWave: true,
      enableChat: true,
      enableCall: true,
      enableCalendar: true,
      calendarNotificationTiming: 5,
      isConcentrationMode: false,
      waveAudio: DEFAULT_AUDIO,
      chatAudio: DEFAULT_AUDIO,
      callAudio: DEFAULT_AUDIO,
      calendarAudio: DEFAULT_AUDIO,
      notificationVolume: 0.7,
    },

    // Patterns used to detect Gather notifications across supported locales.
    // Each entry captures the user name in group 1 (when applicable).
    NOTIFICATION_PATTERNS: {
      wave: [
        /(.+?)\s+acenou para você/i,
        /(.+?)\s+waved to you/i,
        /(.+?)\s+te saludó/i,
      ],
      chat: [
        /(.+?)\s+enviou uma mensagem/i,
        /(.+?)\s+sent a message/i,
        /(.+?)\s+envió un mensaje/i,
      ],
      // Heuristic patterns - adjust if Gather changes its UI copy.
      call: [
        /(.+?)\s+iniciou uma chamada/i,
        /(.+?)\s+started a call/i,
        /(.+?)\s+inició una llamada/i,
        /(.+?)\s+está te chamando/i,
        /(.+?)\s+is calling you/i,
        /(.+?)\s+te está llamando/i,
      ],
      calendar: [
        /em (\d+) minutos?/i,
        /in (\d+) minutes?/i,
        /en (\d+) minutos?/i,
      ],
    },

    SUPPORTED_LANGUAGES: ['pt_BR', 'en', 'es'],

    // Duration options (minutes) for the concentration mode timer.
    // 0 means "indefinite" - stays on until the user disables it manually.
    CONCENTRATION_DURATIONS: [
      { minutes: 0, i18nKey: 'concentrationDurationIndefinite' },
      { minutes: 15, i18nKey: 'concentrationDuration15' },
      { minutes: 30, i18nKey: 'concentrationDuration30' },
      { minutes: 60, i18nKey: 'concentrationDuration60' },
      { minutes: 120, i18nKey: 'concentrationDuration120' },
    ],

    CONCENTRATION_ALARM: 'gh-concentration-end',

    DEDUP_TTL_MS: 5 * 60 * 1000,
    CALENDAR_DEDUP_TTL_MS: 10 * 60 * 1000,
    DEDUP_MAX_SIZE: 200,

    HOST: 'app.v2.gather.town',

    NOTIFICATION_HISTORY_KEY: 'notificationHistory',
    NOTIFICATION_HISTORY_MAX: 30,
  };

  if (typeof globalThis !== 'undefined') globalThis.GH = GH;
})();
