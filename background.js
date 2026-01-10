// Variáveis globais
let hasNotification = false;
let offscreenCreated = false;
let gatherTabs = new Set();

chrome.runtime.onInstalled.addListener((details) => {

  chrome.storage.local.set({
    enableWave: true,
    enableChat: true,
    enableCall: true,
    enableCalendar: true,
    calendarNotificationTiming: 5,
    isConcentrationMode: false,
    waveAudio: 'gather-notificator-audio.mp3',
    chatAudio: 'gather-notificator-audio.mp3',
    callAudio: 'gather-notificator-audio.mp3',
    calendarAudio: 'gather-notificator-audio.mp3',
  });


  if (details.reason === "install" || details.reason === 'update' ) {
    chrome.tabs.query({ url: "*://app.v2.gather.town/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.reload(tab.id);
      });
    });

    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome/welcome.html")
    });
  }
});

// Rastreia abas do Gather
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('app.v2.gather.town')) {
    gatherTabs.add(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  gatherTabs.delete(tabId);
});

// Quando uma aba do Gather fica ativa, limpa notificações
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes('app.v2.gather.town')) {
      if (hasNotification) {
        hasNotification = false;
        updateBadge();
        stopNotificationSound();
        chrome.storage.local.set({ hasNotification: false });
      }
    }
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao verificar aba ativa:', error);
  }
});

// Atualiza badge do ícone
function updateBadge() {
  chrome.storage.local.get(['isConcentrationMode'], (result) => {
    const isConcentrationMode = result.isConcentrationMode || false;
    
    if (isConcentrationMode) {
      chrome.action.setBadgeText({ text: 'C' });
      chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
    } else if (hasNotification) {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

// Cria offscreen document para reprodução de áudio
async function createOffscreen() {
  // Verifica se já existe
  if (chrome.offscreen && chrome.offscreen.hasDocument) {
    const exists = await chrome.offscreen.hasDocument();
    if (exists) {
      offscreenCreated = true;
      return;
    }
  }

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Reproduzir som de notificação quando wave, chat ou calendário são detectados'
    });
    offscreenCreated = true;
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao criar offscreen document:', error);
    offscreenCreated = false;
  }
}

// Reproduz som de notificação
async function playNotificationSound(notificationType = 'wave') {
  try {
    await createOffscreen();
    
    // Obtém o áudio configurado para este tipo
    chrome.storage.local.get([`${notificationType}Audio`], (result) => {
      const audioFile = result[`${notificationType}Audio`] || 'gather-notificator-audio.mp3';
      
      chrome.runtime.sendMessage({
        action: 'playSound',
        notificationType: notificationType,
        audioFile: audioFile
      }).catch(error => {
        console.error('[GATHER-HUB] Erro ao reproduzir som:', error);
      });
    });
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao reproduzir som de notificação:', error);
  }
}

// Para o som de notificação
async function stopNotificationSound() {
  try {
    if (offscreenCreated) {
      chrome.runtime.sendMessage({ action: 'stopSound' }).catch(error => {
        console.error('[GATHER-HUB] Erro ao parar som:', error);
      });
    }
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao parar som de notificação:', error);
  }
}

// Processa notificações detectadas
function handleNotification(data) {
  const { type, message, userName, minutes } = data;

  chrome.storage.local.get([
    'enableWave', 
    'enableChat', 
    'enableCalendar', 
    'isConcentrationMode'
  ], (result) => {
    // Verifica se está em modo concentração
    if (result.isConcentrationMode) {
      return;
    }

    // Verifica se o tipo de notificação está habilitado
    let isEnabled = false;
    let title = '';
    let notificationMessage = '';

    switch (type) {
      case 'wave':
        isEnabled = result.enableWave !== false;
        const waveTitle = chrome.i18n.getMessage('waveNotificationTitle');
        const waveMsg = chrome.i18n.getMessage('waveNotificationMessage');
        const someoneWave = chrome.i18n.getMessage('someone');
        title = waveTitle;
        notificationMessage = userName ? `${userName} ${waveMsg}` : `${someoneWave} ${waveMsg}`;
        break;
      
      case 'chat':
        isEnabled = result.enableChat !== false;
        const chatTitle = chrome.i18n.getMessage('chatNotificationTitle');
        const chatMsg = chrome.i18n.getMessage('chatNotificationMessage');
        const someoneChat = chrome.i18n.getMessage('someone');
        title = chatTitle;
        notificationMessage = userName ? `${userName} ${chatMsg}` : `${someoneChat} ${chatMsg}`;
        break;
      
      case 'calendar':
        isEnabled = result.enableCalendar !== false;
        title = chrome.i18n.getMessage('calendarNotificationTitle');
        const calendarMsg = chrome.i18n.getMessage('calendarNotificationMessage');
        if (minutes) {
          notificationMessage = calendarMsg.replace('{minutes}', minutes.toString());
        } else {
          notificationMessage = calendarMsg.replace('{minutes}', '0');
        }
        break;
      
      default:
        return;
    }

    if (!isEnabled) {
      return;
    }

    // Cria notificação do Chrome
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
      title: title,
      message: notificationMessage
    });

    // Atualiza estado
    hasNotification = true;
    updateBadge();
    playNotificationSound(type);
    chrome.storage.local.set({ hasNotification: true });
  });
}

// Handler de clique na notificação
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Procura aba do Gather
    const tabs = await chrome.tabs.query({});
    const gatherTab = tabs.find(tab => 
      tab.url && tab.url.includes('app.v2.gather.town')
    );
    
    if (gatherTab) {
      await chrome.tabs.update(gatherTab.id, { active: true });
      await chrome.windows.update(gatherTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({
        url: 'https://app.v2.gather.town/',
        active: true
      });
    }
    
    // Limpa notificação
    chrome.notifications.clear(notificationId);
    hasNotification = false;
    updateBadge();
    stopNotificationSound();
    chrome.storage.local.set({ hasNotification: false });
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao lidar com clique na notificação:', error);
  }
});

// Recebe mensagens do content script e outros
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'notificationDetected') {
    handleNotification(message);
    sendResponse({ success: true });
  } else if (message.action === 'clearNotificationOnClick') {
    hasNotification = false;
    updateBadge();
    stopNotificationSound();
    chrome.storage.local.set({ hasNotification: false });
    sendResponse({ success: true });
  }
  return true;
});

// Restaura estado na inicialização
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['hasNotification'], (result) => {
    hasNotification = result.hasNotification || false;
    updateBadge();
  });
});