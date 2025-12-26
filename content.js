// Content script para buscar informações do usuário do Gather

// Função para buscar informações do usuário APENAS do toolbar
function getUserInfo() {
  const userInfo = {
    name: null,
    avatar: null
  };
  
  // BUSCAR APENAS no container do toolbar (ID fixo, sempre presente)
  const toolbarContainer = document.querySelector('#av-toolbar-pip-container');
  if (!toolbarContainer) {
    return userInfo; // Se não existe, retorna vazio
  }
  
  // Buscar todas as imagens dentro do toolbar
  const images = toolbarContainer.querySelectorAll('img');
  
  for (const img of images) {
    const src = img.src || img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    
    // Verificar se é uma imagem de perfil do Gather (URL do S3)
    if (src.includes('gather-town-photo-profiles') && src.includes('s3')) {
      // Esta é a imagem do avatar
      userInfo.avatar = src;
      
      // Se a imagem tem um alt válido (não é temporário, não é pré-visualização, não é "Gather")
      if (alt && 
          alt.trim() && 
          alt.trim() !== 'Gather' &&
          !alt.includes('Temporário') && 
          !alt.includes('Pré-visualização') &&
          !alt.includes('Avatar Temporário') &&
          !alt.includes('Visualização') &&
          alt.length < 100 &&
          alt.length > 0) {
        userInfo.name = alt.trim();
      }
    }
  }
  
  return userInfo;
}

// Buscar informações do usuário periodicamente e salvar no storage
function updateUserInfo() {
  const userInfo = getUserInfo();
  
  // Só atualizar se encontrou informações válidas
  if (userInfo.name || userInfo.avatar) {
    chrome.storage.local.get(['gatherUserName', 'gatherUserAvatar'], (result) => {
      const storedName = result.gatherUserName || null;
      const storedAvatar = result.gatherUserAvatar || null;
      
      // Só atualizar se mudou E se não for "Gather" (valor padrão/errado)
      const nameChanged = userInfo.name !== storedName && userInfo.name && userInfo.name !== 'Gather';
      const avatarChanged = userInfo.avatar !== storedAvatar && userInfo.avatar;
      
      if (nameChanged || avatarChanged) {
        const updateData = {};
        
        // Só atualizar nome se for válido e não for "Gather"
        if (userInfo.name && userInfo.name !== 'Gather') {
          updateData.gatherUserName = userInfo.name;
        }
        
        // Só atualizar avatar se for válido
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

// Função para inicializar
function init() {
  // Buscar informações quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(updateUserInfo, 2000);
    });
  } else {
    setTimeout(updateUserInfo, 2000);
  }
  
  // Observar APENAS mudanças no container do toolbar
  const toolbarContainer = document.querySelector('#av-toolbar-pip-container');
  if (toolbarContainer) {
    const observer = new MutationObserver(() => {
      updateUserInfo();
    });
    
    observer.observe(toolbarContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['alt', 'src']
    });
  } else {
    // Se o toolbar não existe ainda, observar o body apenas para quando ele aparecer
    const bodyObserver = new MutationObserver(() => {
      const toolbarContainer = document.querySelector('#av-toolbar-pip-container');
      if (toolbarContainer) {
        updateUserInfo();
        // Parar de observar o body e começar a observar o toolbar
        bodyObserver.disconnect();
        const toolbarObserver = new MutationObserver(() => {
          updateUserInfo();
        });
        toolbarObserver.observe(toolbarContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['alt', 'src']
        });
      }
    });
    
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: false // Apenas filhos diretos para performance
    });
  }
  
  // Atualizar periodicamente (a cada 5 segundos) como fallback
  setInterval(updateUserInfo, 5000);
}

// Inicializar
init();

// Escutar mensagens do popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getUserInfo') {
    const userInfo = getUserInfo();
    sendResponse(userInfo);
  }
  return true; // Mantém o canal aberto para resposta assíncrona
});
