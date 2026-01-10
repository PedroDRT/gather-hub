let audioPlayer = null;
let currentAudio = null;

console.log('[GATHER-HUB] Offscreen document carregado');

chrome.runtime.sendMessage({ action: 'offscreenReady' }).catch((error) => {
  console.log('[GATHER-HUB] Falha ao enviar mensagem de pronto:', error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[GATHER-HUB] Mensagem recebida:', message);

  if (message.action === 'playSound') {
    playNotificationSound(message.notificationType || 'wave', message.audioFile);
    sendResponse({ success: true });
  } else if (message.action === 'stopSound') {
    stopNotificationSound();
    sendResponse({ success: true });
  }
  
  return true;
});

function playNotificationSound(notificationType = 'wave', audioFile = 'gather-notificator-audio.mp3') {
  try {
    stopNotificationSound();

    const audioPath = chrome.runtime.getURL(`assets/audio/${audioFile}`);
    
    currentAudio = new Audio(audioPath);
    currentAudio.volume = 0.7;
    
    currentAudio.play().catch(error => {
      console.error('[GATHER-HUB] Erro ao reproduzir áudio:', error);
    });

    currentAudio.addEventListener('ended', () => {
      currentAudio = null;
    });

    console.log('[GATHER-HUB] Som de notificação reproduzido:', notificationType, audioFile);
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao reproduzir som de notificação:', error);
  }
}

function stopNotificationSound() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    if (audioPlayer) {
      clearInterval(audioPlayer);
      audioPlayer = null;
    }

    console.log('[GATHER-HUB] Som de notificação parado');
  } catch (error) {
    console.error('[GATHER-HUB] Erro ao parar som de notificação:', error);
  }
}