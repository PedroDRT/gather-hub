// Gather Hub - Central de Notificações
// Popup JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status');
    const goToGatherBtn = document.getElementById('goToGatherBtn');
    const concentrationBtn = document.getElementById('concentrationBtn');
    const enableWaveCheckbox = document.getElementById('enableWave');
    const enableChatCheckbox = document.getElementById('enableChat');
    const enableCallCheckbox = document.getElementById('enableCall');
    const enableCalendarCheckbox = document.getElementById('enableCalendar');
    const calendarNotificationTimingSelect = document.getElementById('calendarNotificationTiming');
    const gatherVersionSelect = document.getElementById('gatherVersionSelect');
    const languageSelect = document.getElementById('languageSelect');
    const debugModeCheckbox = document.getElementById('debugMode');
    
    // Limpar notificações ao abrir o popup
    async function autoClear() {
        try {
            await chrome.storage.local.set({ hasNotification: false });
            
            const result = await chrome.storage.local.get(['isConcentrationMode']);
            const isConcentrationMode = result.isConcentrationMode || false;
            
            if (!isConcentrationMode) {
                chrome.action.setBadgeText({ text: '' });
            }
            
            chrome.runtime.sendMessage({ action: 'stopSound' });
        } catch (error) {
            console.error('Erro ao limpar notificações:', error);
        }
    }
    
    autoClear();
    
    // Atualizar status
    function updateStatus() {
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
            'debugMode'
        ]);

        enableWaveCheckbox.checked = result.enableWave !== false;
        enableChatCheckbox.checked = result.enableChat !== false;
        enableCallCheckbox.checked = result.enableCall !== false;
        enableCalendarCheckbox.checked = result.enableCalendar !== false;
        calendarNotificationTimingSelect.value = result.calendarNotificationTiming !== undefined ? result.calendarNotificationTiming : 5;
        debugModeCheckbox.checked = result.debugMode || false;
        gatherVersionSelect.value = result.gatherVersion || 'v1';
        languageSelect.value = result.language || 'pt-BR';
        
        const isConcentrationMode = result.isConcentrationMode || false;
        
        if (isConcentrationMode) {
            concentrationBtn.textContent = 'Finalizar Modo Concentração';
            concentrationBtn.classList.add('active');
            concentrationBtn.style.display = 'block';
        } else {
            concentrationBtn.style.display = 'none';
            concentrationBtn.classList.remove('active');
        }
    }
    
    // Botão: Ir para Gather.town
    goToGatherBtn.addEventListener('click', async () => {
        try {
            const tabs = await chrome.tabs.query({});
            const gatherTab = tabs.find(tab =>
                tab.url && (tab.url.includes('gather.town') || tab.url.includes('app.gather.town'))
            );

            if (gatherTab) {
                await chrome.tabs.update(gatherTab.id, { active: true });
                await chrome.windows.update(gatherTab.windowId, { focused: true });
                window.close();
            } else {
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
    
    // Event listeners para configurações
    enableWaveCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ enableWave: enableWaveCheckbox.checked });
    });

    enableChatCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ enableChat: enableChatCheckbox.checked });
    });

    enableCallCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ enableCall: enableCallCheckbox.checked });
    });

    enableCalendarCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ enableCalendar: enableCalendarCheckbox.checked });
    });

    calendarNotificationTimingSelect.addEventListener('change', () => {
        chrome.storage.local.set({ calendarNotificationTiming: parseInt(calendarNotificationTimingSelect.value) });
    });

    gatherVersionSelect.addEventListener('change', () => {
        chrome.storage.local.set({ gatherVersion: gatherVersionSelect.value });
    });

    debugModeCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ debugMode: debugModeCheckbox.checked });
    });
    
    languageSelect.addEventListener('change', () => {
        chrome.storage.local.set({ language: languageSelect.value });
    });
    
    // Botão de Modo Concentração
    concentrationBtn.addEventListener('click', async () => {
        try {
            const result = await chrome.storage.local.get(['isConcentrationMode']);
            const currentConcentrationMode = result.isConcentrationMode || false;
            const newConcentrationMode = !currentConcentrationMode;
            
            await chrome.storage.local.set({ isConcentrationMode: newConcentrationMode });
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

