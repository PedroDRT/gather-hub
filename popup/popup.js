document.addEventListener('DOMContentLoaded', async () => {
  // User Info
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  // Settings Menu
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.getElementById('settingsMenu');
  const languageItem = document.getElementById('languageItem');
  const languageSubmenu = document.getElementById('languageSubmenu');
  const themeItem = document.getElementById('themeItem');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Notifications - Checkboxes
  const enableWaveCheckbox = document.getElementById('enableWave');
  const enableChatCheckbox = document.getElementById('enableChat');
  const enableCallCheckbox = document.getElementById('enableCall');
  const enableCalendarCheckbox = document.getElementById('enableCalendar');
  const calendarNotificationTimingSelect = document.getElementById('calendarNotificationTiming');
  const calendarTimingContainer = document.getElementById('calendarTimingContainer');

  // Content - Settings, Audio, Profile
  const segmentButtons = document.querySelectorAll('.segment-button');
  const contentNotifications = document.querySelector('.content-body-notifications');
  const contentAudio = document.querySelector('.content-body-audio');
  const contentProfile = document.querySelector('.content-body-profile');

  // Audio Settings
  const waveAudioSelect = document.getElementById('waveAudioSelect');
  const chatAudioSelect = document.getElementById('chatAudioSelect');
  const callAudioSelect = document.getElementById('callAudioSelect');
  const calendarAudioSelect = document.getElementById('calendarAudioSelect');
  const audioPlayButtons = document.querySelectorAll('.audio-play-btn');

  // List of available audios
  const availableAudios = [
    { value: 'gather-notificator-audio.mp3', i18nKey: 'audioDefault' },
    { value: 'gather-notificator-audio2.wav', i18nKey: 'audioClassic' },
    { value: 'gather-notificator-audio3.mp3', i18nKey: 'audioSoft' },
    { value: 'gather-notificator-audio4.mp3', i18nKey: 'audioModern' },
    { value: 'gather-notificator-audio5.mp3', i18nKey: 'audioEnergetic' }
  ];

  async function loadUserInfo() {
    try {
      const stored = await chrome.storage.local.get(['gatherUserName', 'gatherUserAvatar']);
      
      if (stored.gatherUserName) {
        userName.textContent = chrome.i18n.getMessage('hello') + ', ' + stored.gatherUserName;
      } else {
        userName.textContent = chrome.i18n.getMessage('extensionName');
      }
      
      if (stored.gatherUserAvatar) {
        if (stored.gatherUserAvatar.trim().startsWith('<svg') || stored.gatherUserAvatar.trim().startsWith('<SVG')) {
          const parent = userAvatar.parentElement;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = stored.gatherUserAvatar;
          const svgElement = tempDiv.firstElementChild;
          if (svgElement) {
            parent.replaceChild(svgElement, userAvatar);
          } else {
            userAvatar.src = '../assets/icons/icon128.png';
          }
        } else {
          userAvatar.src = stored.gatherUserAvatar;
          userAvatar.onerror = () => {
            userAvatar.src = '../assets/icons/icon128.png';
          };
        }
      } else {
        userAvatar.src = '../assets/icons/icon128.png';
      }
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
    }
  }

  async function loadSettings() {
    const result = await chrome.storage.local.get([
        'enableWave', 
        'enableChat', 
        'enableCall', 
        'enableCalendar', 
        'calendarNotificationTiming', 
        'isConcentrationMode',
        'waveAudio',
        'chatAudio',
        'callAudio',
        'calendarAudio'
    ]);

    if (enableWaveCheckbox) {
        enableWaveCheckbox.checked = result.enableWave !== false;
    }
    if (enableChatCheckbox) {
        enableChatCheckbox.checked = result.enableChat !== false;
    }
    if (enableCallCheckbox) {
        enableCallCheckbox.checked = result.enableCall !== false;
    }
    if (enableCalendarCheckbox) {
        enableCalendarCheckbox.checked = result.enableCalendar !== false;
    }
    if (calendarNotificationTimingSelect) {
        calendarNotificationTimingSelect.value = result.calendarNotificationTiming !== undefined ? result.calendarNotificationTiming : 5;
    }
    
    if (calendarTimingContainer && enableCalendarCheckbox) {
        calendarTimingContainer.style.display = enableCalendarCheckbox.checked ? 'flex' : 'none';
    }

    if (waveAudioSelect) {
        waveAudioSelect.value = result.waveAudio || 'gather-notificator-audio.mp3';
    }
    if (chatAudioSelect) {
        chatAudioSelect.value = result.chatAudio || 'gather-notificator-audio.mp3';
    }
    if (callAudioSelect) {
        callAudioSelect.value = result.callAudio || 'gather-notificator-audio.mp3';
    }
    if (calendarAudioSelect) {
        calendarAudioSelect.value = result.calendarAudio || 'gather-notificator-audio.mp3';
    }
  }

  async function autoClear() {
    try {
      const notifications = await chrome.notifications.getAll();
      for (const notificationId in notifications) {
        chrome.notifications.clear(notificationId);
      }

      chrome.runtime.sendMessage({ action: 'stopSound' }).catch(error => {
        console.error('Erro ao parar som:', error);
      });

      chrome.action.setBadgeText({ text: '' });

      await chrome.storage.local.set({ hasNotification: false });

      chrome.runtime.sendMessage({ 
        action: 'clearNotificationOnClick' 
      }).catch(error => {
        console.error('Erro ao limpar notificação:', error);
      });
    } catch (error) {
      console.error('Erro ao limpar dados automaticamente:', error);
    }
  }

  function applyI18n() {
    // Notifications - Wave
    const waveLabel = document.querySelector('#enableWave').closest('.notifications-item').querySelector('.setting-label');
    const waveDescription = document.querySelector('#enableWave').closest('.notifications-item').querySelector('.setting-description');
    if (waveLabel) waveLabel.innerHTML = chrome.i18n.getMessage('notificationsWaveLabel');
    if (waveDescription) waveDescription.innerHTML = chrome.i18n.getMessage('notificationsWaveDescription');

    // Notifications - Chat
    const chatLabel = document.querySelector('#enableChat').closest('.notifications-item').querySelector('.setting-label');
    const chatDescription = document.querySelector('#enableChat').closest('.notifications-item').querySelector('.setting-description');
    if (chatLabel) chatLabel.innerHTML = chrome.i18n.getMessage('notificationsChatLabel');
    if (chatDescription) chatDescription.innerHTML = chrome.i18n.getMessage('notificationsChatDescription');

    // Notifications - Call
    const callLabel = document.querySelector('#enableCall').closest('.notifications-item').querySelector('.setting-label');
    const callDescription = document.querySelector('#enableCall').closest('.notifications-item').querySelector('.setting-description');
    if (callLabel) callLabel.innerHTML = chrome.i18n.getMessage('notificationsCallLabel');
    if (callDescription) callDescription.innerHTML = chrome.i18n.getMessage('notificationsCallDescription');

    // Notifications - Calendar
    const calendarLabel = document.querySelector('#enableCalendar').closest('.notifications-item').querySelector('.setting-label');
    const calendarDescription = document.querySelector('#enableCalendar').closest('.notifications-item').querySelector('.setting-description');
    if (calendarLabel) calendarLabel.innerHTML = chrome.i18n.getMessage('notificationsCalendarLabel');
    if (calendarDescription) calendarDescription.innerHTML = chrome.i18n.getMessage('notificationsCalendarDescription');

    // Calendar - Advance Time
    const timingLabel = document.querySelector('#calendarTimingContainer .notifications-label');
    const timingDescription = document.querySelector('#calendarTimingContainer .notifications-description');
    if (timingLabel) timingLabel.textContent = chrome.i18n.getMessage('calendarTimingLabel');
    if (timingDescription) timingDescription.textContent = chrome.i18n.getMessage('calendarTimingDescription');

    // Calendar - Time Select Options
    const timingSelect = document.getElementById('calendarNotificationTiming');
    if (timingSelect) {
      const options = timingSelect.querySelectorAll('option');
      options.forEach((option, index) => {
        const value = parseInt(option.value);
        if (value === 0) {
          option.textContent = `0 ${chrome.i18n.getMessage('minutes')}`;
        } else if (value === 1) {
          option.textContent = `1 ${chrome.i18n.getMessage('minute')}`;
        } else {
          option.textContent = `${value} ${chrome.i18n.getMessage('minutes')}`;
        }
      });
    }

    // Navigation Menu
    const navNotificationsBtn = document.querySelector('.segment-button[data-value="notifications"]');
    const navAudioBtn = document.querySelector('.segment-button[data-value="audio"]');
    const navBindBtn = document.querySelector('.segment-button[data-value="bind"]');
    const navNotifications = navNotificationsBtn?.querySelector('span');
    const navAudio = navAudioBtn?.querySelector('span');
    const navBind = navBindBtn?.querySelector('span');
    if (navNotifications) navNotifications.textContent = chrome.i18n.getMessage('navNotifications');
    if (navAudio) navAudio.textContent = chrome.i18n.getMessage('navAudio');
    if (navBind) navBind.textContent = chrome.i18n.getMessage('navBind');
    if (navNotificationsBtn) navNotificationsBtn.setAttribute('aria-label', chrome.i18n.getMessage('navNotifications'));
    if (navAudioBtn) navAudioBtn.setAttribute('aria-label', chrome.i18n.getMessage('navAudio'));
    if (navBindBtn) navBindBtn.setAttribute('aria-label', chrome.i18n.getMessage('navBind'));

    // Audio Section - Wave
    const audioWaveLabel = document.querySelector('#waveAudioSelect').closest('.audio-setting-item').querySelector('.setting-label');
    const audioWaveDescription = document.querySelector('#waveAudioSelect').closest('.audio-setting-item').querySelector('.setting-description');
    const audioWavePlayBtn = document.querySelector('#waveAudioSelect').closest('.audio-setting-item').querySelector('.audio-play-btn');
    if (audioWaveLabel) audioWaveLabel.innerHTML = chrome.i18n.getMessage('audioWaveLabel');
    if (audioWaveDescription) audioWaveDescription.textContent = chrome.i18n.getMessage('audioWaveDescription');
    if (audioWavePlayBtn) audioWavePlayBtn.setAttribute('aria-label', chrome.i18n.getMessage('testAudio'));

    // Audio Section - Chat
    const audioChatLabel = document.querySelector('#chatAudioSelect').closest('.audio-setting-item').querySelector('.setting-label');
    const audioChatDescription = document.querySelector('#chatAudioSelect').closest('.audio-setting-item').querySelector('.setting-description');
    const audioChatPlayBtn = document.querySelector('#chatAudioSelect').closest('.audio-setting-item').querySelector('.audio-play-btn');
    if (audioChatLabel) audioChatLabel.innerHTML = chrome.i18n.getMessage('audioChatLabel');
    if (audioChatDescription) audioChatDescription.textContent = chrome.i18n.getMessage('audioChatDescription');
    if (audioChatPlayBtn) audioChatPlayBtn.setAttribute('aria-label', chrome.i18n.getMessage('testAudio'));

    // Audio Section - Call
    const audioCallLabel = document.querySelector('#callAudioSelect').closest('.audio-setting-item').querySelector('.setting-label');
    const audioCallDescription = document.querySelector('#callAudioSelect').closest('.audio-setting-item').querySelector('.setting-description');
    const audioCallPlayBtn = document.querySelector('#callAudioSelect').closest('.audio-setting-item').querySelector('.audio-play-btn');
    if (audioCallLabel) audioCallLabel.innerHTML = chrome.i18n.getMessage('audioCallLabel');
    if (audioCallDescription) audioCallDescription.textContent = chrome.i18n.getMessage('audioCallDescription');
    if (audioCallPlayBtn) audioCallPlayBtn.setAttribute('aria-label', chrome.i18n.getMessage('testAudio'));

    // Audio Section - Calendar
    const audioCalendarLabel = document.querySelector('#calendarAudioSelect').closest('.audio-setting-item').querySelector('.setting-label');
    const audioCalendarDescription = document.querySelector('#calendarAudioSelect').closest('.audio-setting-item').querySelector('.setting-description');
    const audioCalendarPlayBtn = document.querySelector('#calendarAudioSelect').closest('.audio-setting-item').querySelector('.audio-play-btn');
    if (audioCalendarLabel) audioCalendarLabel.innerHTML = chrome.i18n.getMessage('audioCalendarLabel');
    if (audioCalendarDescription) audioCalendarDescription.textContent = chrome.i18n.getMessage('audioCalendarDescription');
    if (audioCalendarPlayBtn) audioCalendarPlayBtn.setAttribute('aria-label', chrome.i18n.getMessage('testAudio'));
  }

  function switchContentSection(activeValue) {
    segmentButtons.forEach(button => {
      button.classList.remove('active');
    });

    const activeButton = document.querySelector(`.segment-button[data-value="${activeValue}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    if (contentNotifications) contentNotifications.style.display = 'none';
    if (contentAudio) contentAudio.style.display = 'none';
    if (contentProfile) contentProfile.style.display = 'none';

    switch(activeValue) {
      case 'notifications':
        if (contentNotifications) contentNotifications.style.display = 'block';
        break;
      case 'audio':
        if (contentAudio) contentAudio.style.display = 'block';
        break;
      case 'bind':
        if (contentProfile) contentProfile.style.display = 'block';
        break;
    }
  }

  segmentButtons.forEach(button => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-value');
      if (value) {
        switchContentSection(value);
      }
    });
  });

  function populateAudioSelects() {
    const audioSelects = [waveAudioSelect, chatAudioSelect, callAudioSelect, calendarAudioSelect];
    
    audioSelects.forEach(select => {
      if (select) {
        select.innerHTML = '';
        
        availableAudios.forEach(audio => {
          const option = document.createElement('option');
          option.value = audio.value;
          option.textContent = chrome.i18n.getMessage(audio.i18nKey);
          select.appendChild(option);
        });
      }
    });
  }

  function playAudio(audioType) {
    let selectElement;
    
    switch(audioType) {
      case 'wave':
        selectElement = waveAudioSelect;
        break;
      case 'chat':
        selectElement = chatAudioSelect;
        break;
      case 'call':
        selectElement = callAudioSelect;
        break;
      case 'calendar':
        selectElement = calendarAudioSelect;
        break;
      default:
        return;
    }

    if (selectElement && selectElement.value) {
      const audioPath = chrome.runtime.getURL(`assets/audio/${selectElement.value}`);
      const audio = new Audio(audioPath);
      audio.play().catch(error => {
        console.error('Erro ao reproduzir áudio:', error);
      });
    }
  }

  audioPlayButtons.forEach(button => {
    button.addEventListener('click', () => {
      const audioType = button.getAttribute('data-audio');
      if (audioType) {
        playAudio(audioType);
      }
    });
  });

  if (enableWaveCheckbox) {
    enableWaveCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ enableWave: enableWaveCheckbox.checked });
    });
  }

  if (enableChatCheckbox) {
      enableChatCheckbox.addEventListener('change', () => {
          chrome.storage.local.set({ enableChat: enableChatCheckbox.checked });
      });
  }

  if (enableCallCheckbox) {
      enableCallCheckbox.addEventListener('change', () => {
          chrome.storage.local.set({ enableCall: enableCallCheckbox.checked });
      });
  }

  if (enableCalendarCheckbox) {
      enableCalendarCheckbox.addEventListener('change', () => {
          const isEnabled = enableCalendarCheckbox.checked;
          chrome.storage.local.set({ enableCalendar: isEnabled });

          calendarTimingContainer.style.display = isEnabled ? 'flex' : 'none';
      });
  }

  if (calendarNotificationTimingSelect) {
      calendarNotificationTimingSelect.addEventListener('change', () => {
          chrome.storage.local.set({ calendarNotificationTiming: parseInt(calendarNotificationTimingSelect.value) });
      });
  }

  if (waveAudioSelect) {
    waveAudioSelect.addEventListener('change', () => {
      chrome.storage.local.set({ waveAudio: waveAudioSelect.value });
    });
  }

  if (chatAudioSelect) {
    chatAudioSelect.addEventListener('change', () => {
      chrome.storage.local.set({ chatAudio: chatAudioSelect.value });
    });
  }

  if (callAudioSelect) {
    callAudioSelect.addEventListener('change', () => {
      chrome.storage.local.set({ callAudio: callAudioSelect.value });
    });
  }

  if (calendarAudioSelect) {
    calendarAudioSelect.addEventListener('change', () => {
      chrome.storage.local.set({ calendarAudio: calendarAudioSelect.value });
    });
  }

  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = settingsMenu.style.display !== 'none';
      settingsMenu.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        languageSubmenu.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
        settingsMenu.style.display = 'none';
        languageSubmenu.style.display = 'none';
      }
    });
  }

  if (languageItem && languageSubmenu) {
    languageItem.addEventListener('click', (e) => {
      e.stopPropagation();
      if (languageSubmenu.contains(e.target)) {
        return;
      }
      const isVisible = languageSubmenu.style.display !== 'none';
      languageSubmenu.style.display = isVisible ? 'none' : 'block';
    });

    languageSubmenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  function applyTheme(isDark) {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  function updateThemeIcon(isDark) {
    if (isDark) {
      themeIcon.innerHTML = '<path d="M320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C388.8 576 451.3 548.8 497.3 504.6C504.6 497.6 506.7 486.7 502.6 477.5C498.5 468.3 488.9 462.6 478.8 463.4C473.9 463.8 469 464 464 464C362.4 464 280 381.6 280 280C280 207.9 321.5 145.4 382.1 115.2C391.2 110.7 396.4 100.9 395.2 90.8C394 80.7 386.6 72.5 376.7 70.3C358.4 66.2 339.4 64 320 64z"/>';
    } else {
      themeIcon.innerHTML = '<path d="M210.2 53.9C217.6 50.8 226 51.7 232.7 56.1L320.5 114.3L408.3 56.1C415 51.7 423.4 50.9 430.8 53.9C438.2 56.9 443.4 63.5 445 71.3L465.9 174.5L569.1 195.4C576.9 197 583.5 202.4 586.5 209.7C589.5 217 588.7 225.5 584.3 232.2L526.1 320L584.3 407.8C588.7 414.5 589.5 422.9 586.5 430.3C583.5 437.7 576.9 443.1 569.1 444.6L465.8 465.4L445 568.7C443.4 576.5 438 583.1 430.7 586.1C423.4 589.1 414.9 588.3 408.2 583.9L320.4 525.7L232.6 583.9C225.9 588.3 217.5 589.1 210.1 586.1C202.7 583.1 197.3 576.5 195.8 568.7L175 465.4L71.7 444.5C63.9 442.9 57.3 437.5 54.3 430.2C51.3 422.9 52.1 414.4 56.5 407.7L114.7 320L56.5 232.2C52.1 225.5 51.3 217.1 54.3 209.7C57.3 202.3 63.9 196.9 71.7 195.4L175 174.6L195.9 71.3C197.5 63.5 202.9 56.9 210.2 53.9zM239.6 320C239.6 275.6 275.6 239.6 320 239.6C364.4 239.6 400.4 275.6 400.4 320C400.4 364.4 364.4 400.4 320 400.4C275.6 400.4 239.6 364.4 239.6 320zM448.4 320C448.4 249.1 390.9 191.6 320 191.6C249.1 191.6 191.6 249.1 191.6 320C191.6 390.9 249.1 448.4 320 448.4C390.9 448.4 448.4 390.9 448.4 320z"/>';
    }
  }

  if (themeToggle && themeIcon) {
    const savedTheme = await chrome.storage.local.get(['theme']);
    const isDarkTheme = savedTheme.theme === 'dark';
    themeToggle.checked = isDarkTheme;
    applyTheme(isDarkTheme);
    updateThemeIcon(isDarkTheme);

    themeToggle.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      applyTheme(isDark);
      updateThemeIcon(isDark);
      chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    });
  }

  switchContentSection('notifications');

  populateAudioSelects();
  applyI18n();
  loadUserInfo();
  loadSettings();

  autoClear();
});