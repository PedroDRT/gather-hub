function getUserInfo() {
  const userInfo = {
    name: null,
    avatar: null,
  }

  let toolbarContainer = document.querySelector('#av-toolbar-pip-container');
  
  if(!toolbarContainer) {
    toolbarContainer = document.querySelector('._2owp20p._2owp20r');
  }

  if(toolbarContainer) {
    const infoUserAvatar = toolbarContainer.querySelectorAll('img');

    if(infoUserAvatar.length > 0) {
      const img = infoUserAvatar[0];
      userInfo.avatar = img.src;
      userInfo.name = img.alt || null;
    } else {
      const svgElements = toolbarContainer.querySelectorAll('svg');
      if(svgElements.length > 0) {
        userInfo.name = svgElements[0].getAttribute('aria-label') || null;
        userInfo.avatar = svgElements[0].outerHTML;
      }
    }
  }

  return userInfo;
}

function updateUserInfo() {
  const userInfo = getUserInfo();

  if (userInfo.name || userInfo.avatar) {
    chrome.storage.local.get(['gatherUserName', 'gatherUserAvatar'], (result) => {
      const storedName = result.gatherUserName || null;
      const storedAvatar = result.gatherUserAvatar || null;
      
      const nameChanged = userInfo.name !== storedName && userInfo.name && userInfo.name !== 'Gather';
      const avatarChanged = userInfo.avatar !== storedAvatar && userInfo.avatar;
      
      if (nameChanged || avatarChanged) {
        const updateData = {};
        
        if (userInfo.name && userInfo.name !== 'Gather') {
          updateData.gatherUserName = userInfo.name;
        }
        
        if (userInfo.avatar) {
          updateData.gatherUserAvatar = userInfo.avatar;
        }
        
        if (Object.keys(updateData).length > 0) {
          chrome.storage.local.set(updateData);
        }
      }
    });
  }
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(updateUserInfo, 2000);
    });
  } else {
    setTimeout(updateUserInfo, 2000);
  }
  
  let toolbarContainer = document.querySelector('#av-toolbar-pip-container');
  
  if(!toolbarContainer) {
    toolbarContainer = document.querySelector('._2owp20p._2owp20r');
  }
  
  if (toolbarContainer) {
    const observer = new MutationObserver(() => {
      updateUserInfo();
    });
    
    observer.observe(toolbarContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'src', 'aria-label']
    });
  } else {
    const bodyObserver = new MutationObserver(() => {
      let toolbarContainer = document.querySelector('#av-toolbar-pip-container');
      
      if(!toolbarContainer) {
        toolbarContainer = document.querySelector('._2owp20p._2owp20r');
      }
      
      if (toolbarContainer) {
        updateUserInfo();
        bodyObserver.disconnect();
        const toolbarObserver = new MutationObserver(() => {
          updateUserInfo();
        });
        toolbarObserver.observe(toolbarContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['alt', 'src', 'aria-label']
        });
      }
    });
    
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: false
    });
  }
  
  setInterval(updateUserInfo, 5000);
}

init();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.action === 'getUserInfo') {
    const userInfo = getUserInfo();
    sendResponse(userInfo);
  }
  return true;
});

const notifiedCalendarEvents = new Set();

function checkTextForNotifications(textContent) {
  if(!textContent || textContent.trim().length === 0) {
    return;
  }

  let waveMatch = null;
  let userName = null;

  if (textContent.includes(' acenou para você')) {
    waveMatch = textContent.match(/(.+?)\s+acenou para você/);
  }else if (textContent.includes(' waved to you')) {
    waveMatch = textContent.match(/(.+?)\s+waved to you/);
  }else if (textContent.includes(' te saludó')) {
    waveMatch = textContent.match(/(.+?)\s+te saludó/);
  }

  if (waveMatch) {
    if (waveMatch[1]) {
      let rawName = waveMatch[1].trim();
      
      rawName = rawName.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '').trim();
      
      rawName = rawName.replace(/\d+/g, '').trim();
      
      const words = rawName.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length > 0) {
        const possibleNames = [];
        for (let i = Math.min(4, words.length); i >= 2; i--) {
          const candidate = words.slice(-i).join(' ');
          if (/^[a-zA-ZÀ-ÿ\s'-]+$/.test(candidate) && candidate.length <= 50) {
            possibleNames.push(candidate);
          }
        }
        
        userName = possibleNames.length > 0 ? possibleNames[0] : words.slice(-2).join(' ');
      } else {
        userName = rawName;
      }
      
      userName = userName.replace(/\s+/g, ' ').trim();
      
      if (userName.length > 50 || !/^[a-zA-ZÀ-ÿ\s'-]+$/.test(userName)) {
        const lastWord = words[words.length - 1];
        if (lastWord && /^[a-zA-ZÀ-ÿ'-]+$/.test(lastWord)) {
          userName = lastWord;
        }
      }
    }

    chrome.storage.local.get(['enableWave'], (result) => {
      if (result.enableWave !== false) {
        chrome.runtime.sendMessage({
          action: 'notificationDetected',
          type: 'wave',
          message: textContent,
          userName: userName
        }).catch(error => {
          console.error('[GATHER-HUB] Erro ao enviar notificação de wave:', error);
        });
      }
    });
    return;
  }

  let chatMatch = null;
  let chatUserName = null;

  if (textContent.includes(' enviou uma mensagem')) {
    chatMatch = textContent.match(/(.+?)\s+enviou uma mensagem/);
  }else if (textContent.includes(' sent a message')) {
    chatMatch = textContent.match(/(.+?)\s+sent a message/);
  }else if (textContent.includes(' envió un mensaje')) {
    chatMatch = textContent.match(/(.+?)\s+envió un mensaje/);
  }

  if (chatMatch) {
    if (chatMatch[1]) {
      let rawName = chatMatch[1].trim();
      
      rawName = rawName.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '').trim();
      
      rawName = rawName.replace(/\d+/g, '').trim();
      
      const words = rawName.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length > 0) {
        const possibleNames = [];
        for (let i = Math.min(4, words.length); i >= 2; i--) {
          const candidate = words.slice(-i).join(' ');
          if (/^[a-zA-ZÀ-ÿ\s'-]+$/.test(candidate) && candidate.length <= 50) {
            possibleNames.push(candidate);
          }
        }
        
        chatUserName = possibleNames.length > 0 ? possibleNames[0] : words.slice(-2).join(' ');
      } else {
        chatUserName = rawName;
      }
      
      chatUserName = chatUserName.replace(/\s+/g, ' ').trim();
      
      if (chatUserName.length > 50 || !/^[a-zA-ZÀ-ÿ\s'-]+$/.test(chatUserName)) {
        const lastWord = words[words.length - 1];
        if (lastWord && /^[a-zA-ZÀ-ÿ'-]+$/.test(lastWord)) {
          chatUserName = lastWord;
        }
      }
    }

    chrome.storage.local.get(['enableChat'], (result) => {
      if (result.enableChat !== false) {
        chrome.runtime.sendMessage({
          action: 'notificationDetected',
          type: 'chat',
          message: textContent,
          userName: chatUserName
        }).catch(error => {
          console.error('[GATHER-HUB] Erro ao enviar notificação de chat:', error);
        });
      }
    });
    return;
  }

  let calendarMatch = null;

    calendarMatch = textContent.match(/em (\d+) minutos?/);

    if (!calendarMatch) {
      calendarMatch = textContent.match(/in (\d+) minutes?/);
    }

    if (!calendarMatch) {
      calendarMatch = textContent.match(/en (\d+) minutos?/);
    }

    if (calendarMatch) {
      const minutesUntilEvent = parseInt(calendarMatch[1]);
  
      chrome.storage.local.get(['enableCalendar', 'calendarNotificationTiming'], (result) => {
        if (result.enableCalendar !== false) {
          const notificationTiming = result.calendarNotificationTiming !== undefined ? result.calendarNotificationTiming : 5;

          if (minutesUntilEvent === notificationTiming) {
            const eventId = `${textContent.substring(0, 50)}_${minutesUntilEvent}`;
  
            if (!notifiedCalendarEvents.has(eventId)) {
              notifiedCalendarEvents.add(eventId);
  
              setTimeout(() => {
                notifiedCalendarEvents.delete(eventId);
              }, 600000);
  
              chrome.runtime.sendMessage({
                action: 'notificationDetected',
                type: 'calendar',
                message: textContent,
                minutes: minutesUntilEvent
              }).catch(error => {
                console.error('[GATHER-HUB] Erro ao enviar notificação de calendário:', error);
              });
            }
          }
        }
      });
    }
};

function setupNotificationObserver() {
  const notificationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const textContent = node.textContent || '';
            checkTextForNotifications(textContent);
          }
        });
      }else if (mutation.type === 'characterData') {
        const parentElement = mutation.target.parentElement;
        if (parentElement) {
          const textContent = parentElement.textContent || '';
          checkTextForNotifications(textContent);
        }
      }
    }
  });

  if (document.body) {
    notificationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });
  } else {
    const checkBody = setInterval(() => {
      if (document.body) {
        clearInterval(checkBody);
        notificationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
          characterDataOldValue: true
        });
      }
    }, 100);
  }
}

setupNotificationObserver();