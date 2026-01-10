document.addEventListener('DOMContentLoaded', async () => {
  // User Info
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

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
            userAvatar.src = 'assets/images/avatar-gather-hub.png';
          }
        } else {
          userAvatar.src = stored.gatherUserAvatar;
          userAvatar.onerror = () => {
            userAvatar.src = 'assets/images/avatar-gather-hub.png';
          };
        }
      } else {
        userAvatar.src = 'assets/images/avatar-gather-hub.png';
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

  switchContentSection('notifications');

  populateAudioSelects();
  applyI18n();
  loadUserInfo();
  loadSettings();

  autoClear();
});
