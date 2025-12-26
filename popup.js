document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status');
    const goToGatherBtn = document.getElementById('goToGatherBtn');
    const concentrationBtn = document.getElementById('concentrationBtn');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const settingsMenuBtn = document.getElementById('settingsMenuBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const enableWaveCheckbox = document.getElementById('enableWave');
    const enableChatCheckbox = document.getElementById('enableChat');
    const enableCallCheckbox = document.getElementById('enableCall');
    const enableCalendarCheckbox = document.getElementById('enableCalendar');
    const calendarNotificationTimingSelect = document.getElementById('calendarNotificationTiming');
    const gatherVersionSelect = document.getElementById('gatherVersionSelect');
    const languageSelect = document.getElementById('languageSelect');
    const debugModeCheckbox = document.getElementById('debugMode');
    
    // Audio selects
    const waveAudioSelect = document.getElementById('waveAudioSelect');
    const chatAudioSelect = document.getElementById('chatAudioSelect');
    const callAudioSelect = document.getElementById('callAudioSelect');
    const calendarAudioSelect = document.getElementById('calendarAudioSelect');
    const audioPlayButtons = document.querySelectorAll('.audio-play-btn');
    
    // Controle segmentado
    const segmentButtons = document.querySelectorAll('.segment-button');
    const contentSettings = document.querySelector('.content-body-settings');
    const contentAudio = document.querySelector('.content-body-audio');
    const contentProfile = document.querySelector('.content-body-profile');
    
    // Função para mostrar o conteúdo correspondente
    const showContent = (value) => {
        // Esconder todos os conteúdos
        if (contentSettings) contentSettings.style.display = 'none';
        if (contentAudio) contentAudio.style.display = 'none';
        if (contentProfile) contentProfile.style.display = 'none';
        
        // Mostrar o conteúdo correspondente
        switch(value) {
            case 'settings':
                if (contentSettings) contentSettings.style.display = 'block';
                break;
            case 'audio':
                if (contentAudio) contentAudio.style.display = 'block';
                break;
            case 'profile':
                if (contentProfile) contentProfile.style.display = 'block';
                break;
        }
    };
    
    const handleSegmentClick = (event) => {
        const clickedButton = event.currentTarget;
        const value = clickedButton.getAttribute('data-value');
        
        // Remover classe active de todos os botões
        segmentButtons.forEach(btn => btn.classList.remove('active'));
        
        // Adicionar classe active ao botão clicado
        clickedButton.classList.add('active');
        
        // Mostrar conteúdo correspondente
        showContent(value);
        
        // Salvar seleção no storage
        chrome.storage.local.set({ selectedSegment: value });
    };
    
    // Adicionar event listeners aos botões
    segmentButtons.forEach(button => {
        button.addEventListener('click', handleSegmentClick);
        
        // Suporte para teclado
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSegmentClick(e);
            }
        });
    });
    
    // Carregar seleção salva
    chrome.storage.local.get(['selectedSegment'], (result) => {
        const selectedValue = result.selectedSegment || 'settings';
        const selectedButton = document.querySelector(`.segment-button[data-value="${selectedValue}"]`);
        if (selectedButton) {
            segmentButtons.forEach(btn => btn.classList.remove('active'));
            selectedButton.classList.add('active');
            showContent(selectedValue);
        }
    });
    
    // Carregar informações do usuário do Gather
    async function loadUserInfo() {
        try {
            // Primeiro, tentar carregar do storage (mais rápido)
            const stored = await chrome.storage.local.get(['gatherUserName', 'gatherUserAvatar']);
            
            if (stored.gatherUserName && userName) {
                userName.textContent = `Olá, ${stored.gatherUserName}`;
            }
            
            if (stored.gatherUserAvatar && userAvatar) {
                userAvatar.src = stored.gatherUserAvatar;
            }
            
            // Depois, tentar buscar atualizações da aba do Gather
            const tabs = await chrome.tabs.query({});
            const gatherTab = tabs.find(tab =>
                tab.url && (tab.url.includes('gather.town') || tab.url.includes('app.gather.town'))
            );
            
            if (gatherTab) {
                try {
                    // Tentar enviar mensagem para o content script
                    chrome.tabs.sendMessage(gatherTab.id, { action: 'getUserInfo' }, (response) => {
                        if (chrome.runtime.lastError) {
                            // Content script ainda não está pronto, as informações serão atualizadas quando estiver
                            console.log('Content script não está pronto ainda');
                        } else if (response) {
                            // Atualizar com resposta do content script
                            if (response.name || response.avatar) {
                                chrome.storage.local.set({
                                    gatherUserName: response.name,
                                    gatherUserAvatar: response.avatar
                                });
                                
                                if (response.name && userName) {
                                    userName.textContent = `Olá, ${response.name}`;
                                }
                                if (response.avatar && userAvatar) {
                                    userAvatar.src = response.avatar;
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.log('Não foi possível buscar informações do usuário:', error);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar informações do usuário:', error);
        }
    }
    
    // Carregar informações do usuário
    if (userAvatar && userName) {
        loadUserInfo();
        
        // Escutar mudanças no storage para atualizar em tempo real
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.gatherUserName && userName) {
                    userName.textContent = `Olá, ${changes.gatherUserName.newValue || 'Gather Hub'}`;
                }
                if (changes.gatherUserAvatar && userAvatar) {
                    userAvatar.src = changes.gatherUserAvatar.newValue || 'assets/images/avatar-gather-hub.png';
                }
            }
        });
    }
    
    // Menu de configurações
    if (settingsMenuBtn && settingsMenu) {
        // Toggle do menu
        settingsMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = settingsMenu.style.display === 'block';
            settingsMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (settingsMenu && settingsMenuBtn && 
                !settingsMenu.contains(e.target) && !settingsMenuBtn.contains(e.target)) {
                settingsMenu.style.display = 'none';
            }
        });
        
        // Ações do menu
        const menuItems = settingsMenu.querySelectorAll('.settings-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                
                switch(action) {
                    case 'language':
                        // Abrir seção de linguagem
                        console.log('Abrir configurações de linguagem');
                        // Aqui você pode adicionar lógica para mostrar configurações de linguagem
                        break;
                    case 'theme':
                        // Abrir seção de tema
                        console.log('Abrir configurações de tema');
                        // Aqui você pode adicionar lógica para mostrar configurações de tema
                        break;
                }
                
                if (settingsMenu) {
                    settingsMenu.style.display = 'none';
                }
            });
        });
    }
    
    // Limpar notificações ao abrir o popup
    async function autoClear() {
        try {
            // Limpar notificações
            chrome.storage.local.set({ hasNotification: false });
            
            // Verificar se está em modo concentração
            const result = await chrome.storage.local.get(['isConcentrationMode']);
            const isConcentrationMode = result.isConcentrationMode || false;
            
            if (!isConcentrationMode && chrome.action) {
                chrome.action.setBadgeText({ text: '' });
            }
            
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'stopSound' }).catch(() => {
                    // Ignorar erro se não houver listener
                });
            }
        } catch (error) {
            console.error('Erro ao limpar notificações:', error);
        }
    }
    
    autoClear();
    
    // Atualizar status
    function updateStatus() {
        if (!statusDiv) return;
        
        chrome.storage.local.get(['hasNotification', 'isConcentrationMode'], (result) => {
            const hasNotification = result.hasNotification || false;
            const isConcentrationMode = result.isConcentrationMode || false;
            
            if (isConcentrationMode) {
                statusDiv.style.display = 'block';
                statusDiv.className = 'status concentration-mode';
                statusDiv.textContent = 'Modo Concentração Ativo';
            } else if (hasNotification) {
                statusDiv.style.display = 'block';
                statusDiv.className = 'status has-notification';
                statusDiv.textContent = 'Nova Notificação Disponível';
            } else {
                statusDiv.style.display = 'none';
            }
        });
    }
    
    // Carregar configurações
    async function loadSettings() {
        const result = await chrome.storage.local.get([
            'enableWave', 
            'enableChat', 
            'enableCall', 
            'enableCalendar', 
            'calendarNotificationTiming', 
            'gatherVersion', 
            'isConcentrationMode', 
            'language', 
            'debugMode',
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
        
        // Mostrar/esconder o select de timing do calendário baseado no estado salvo
        const calendarTimingContainer = document.getElementById('calendarTimingContainer');
        if (calendarTimingContainer && enableCalendarCheckbox) {
            calendarTimingContainer.style.display = enableCalendarCheckbox.checked ? 'flex' : 'none';
        }
        if (debugModeCheckbox) {
            debugModeCheckbox.checked = result.debugMode || false;
        }
        if (gatherVersionSelect) {
            gatherVersionSelect.value = result.gatherVersion || 'v1';
        }
        if (languageSelect) {
            languageSelect.value = result.language || 'pt-BR';
        }
        
        // Carregar configurações de áudio
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
        
        const isConcentrationMode = result.isConcentrationMode || false;
        
        if (concentrationBtn) {
            if (isConcentrationMode) {
                concentrationBtn.textContent = 'Finalizar Modo Concentração';
                concentrationBtn.classList.add('active');
                concentrationBtn.style.display = 'block';
            } else {
                concentrationBtn.style.display = 'none';
                concentrationBtn.classList.remove('active');
            }
        }
    }
    
    // Botão: Ir para Gather.town
    if (goToGatherBtn) {
        goToGatherBtn.addEventListener('click', async () => {
            try {
                if (typeof chrome === 'undefined' || !chrome.tabs) {
                    console.error('Chrome tabs API não está disponível');
                    return;
                }
                
                const tabs = await chrome.tabs.query({});
                const gatherTab = tabs.find(tab =>
                    tab.url && (tab.url.includes('gather.town') || tab.url.includes('app.gather.town'))
                );

                if (gatherTab) {
                    await chrome.tabs.update(gatherTab.id, { active: true });
                    await chrome.windows.update(gatherTab.windowId, { focused: true });
                    window.close();
                } else {
                    // Gather.town tab não encontrado, abrir nova aba
                    const result = await chrome.storage.local.get(['gatherVersion']);
                    const gatherVersion = result.gatherVersion || 'v1';
                const gatherUrl = gatherVersion === 'v2' ? 'https://app.v2.gather.town/app/' : 'https://app.gather.town/';

                await chrome.tabs.create({
                    url: gatherUrl,
                    active: true
                });

                window.close();
            }
            } catch (error) {
                console.error('Erro ao focar aba do Gather:', error);
                alert('Erro ao abrir Gather.town');
            }
        });
    }
    
    // Event listeners para configurações
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
            
            // Mostrar/esconder o select de timing do calendário
            const calendarTimingContainer = document.getElementById('calendarTimingContainer');
            if (calendarTimingContainer) {
                calendarTimingContainer.style.display = isEnabled ? 'flex' : 'none';
            }
        });
    }

    if (calendarNotificationTimingSelect) {
        calendarNotificationTimingSelect.addEventListener('change', () => {
            chrome.storage.local.set({ calendarNotificationTiming: parseInt(calendarNotificationTimingSelect.value) });
        });
    }

    if (gatherVersionSelect) {
        gatherVersionSelect.addEventListener('change', () => {
            chrome.storage.local.set({ gatherVersion: gatherVersionSelect.value });
        });
    }

    if (debugModeCheckbox) {
        debugModeCheckbox.addEventListener('change', () => {
            chrome.storage.local.set({ debugMode: debugModeCheckbox.checked });
        });
    }
    
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            chrome.storage.local.set({ language: languageSelect.value });
        });
    }
    
    // Event listeners para selects de áudio
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
    
    // Event listeners para botões de play de áudio
    if (audioPlayButtons && audioPlayButtons.length > 0) {
        audioPlayButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    const audioType = button.getAttribute('data-audio');
                    let audioSelect;
                    
                    switch(audioType) {
                        case 'wave':
                            audioSelect = waveAudioSelect;
                            break;
                        case 'chat':
                            audioSelect = chatAudioSelect;
                            break;
                        case 'call':
                            audioSelect = callAudioSelect;
                            break;
                        case 'calendar':
                            audioSelect = calendarAudioSelect;
                            break;
                    }
                    
                    if (audioSelect) {
                        const audioFile = audioSelect.value;
                        const audio = new Audio(`assets/audio/${audioFile}`);
                        audio.play().catch(error => {
                            console.error('Erro ao tocar áudio:', error);
                        });
                    }
                });
            }
        });
    }
    
    // Botão de Modo Concentração
    if (concentrationBtn) {
        concentrationBtn.addEventListener('click', async () => {
            try {
                const result = await chrome.storage.local.get(['isConcentrationMode']);
                const currentConcentrationMode = result.isConcentrationMode || false;
                const newConcentrationMode = !currentConcentrationMode;
                
                // Alternar modo concentração
                chrome.storage.local.set({ isConcentrationMode: newConcentrationMode });
            chrome.runtime.sendMessage({ action: 'toggleConcentrationMode', isConcentrationMode: newConcentrationMode });
            
            if (newConcentrationMode) {
                const tabs = await chrome.tabs.query({});
                const gatherTab = tabs.find(tab => 
                    tab.url && (tab.url.includes('gather.town') || tab.url.includes('app.gather.town'))
                );
                
                if (gatherTab) {
                    await chrome.tabs.update(gatherTab.id, { active: true });
                    await chrome.windows.update(gatherTab.windowId, { focused: true });
                }
                
                concentrationBtn.textContent = 'Finalizar Modo Concentração';
                concentrationBtn.classList.add('active');
            } else {
                const tabs = await chrome.tabs.query({});
                const gatherTab = tabs.find(tab => 
                    tab.url && (tab.url.includes('gather.town') || tab.url.includes('app.gather.town'))
                );
                
                if (gatherTab) {
                    await chrome.tabs.update(gatherTab.id, { active: true });
                    await chrome.windows.update(gatherTab.windowId, { focused: true });
                }
                
                concentrationBtn.style.display = 'none';
                concentrationBtn.classList.remove('active');
            }
            
            updateStatus();
            
                setTimeout(() => {
                    window.close();
                }, 100);
            } catch (error) {
                console.error('Erro ao alternar modo concentração:', error);
                alert('Erro ao alterar modo concentração');
            }
        });
    }
    
    // Inicializar
    updateStatus();
    await loadSettings();
    
    // Monitorar mudanças no storage
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local') {
            if (changes.hasNotification || changes.isConcentrationMode) {
                updateStatus();
            }
            if (changes.isConcentrationMode) {
                await loadSettings();
            }
        }
    });
});