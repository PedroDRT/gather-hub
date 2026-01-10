document.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.getElementById('getStartedBtn');
    const skipBtn = document.getElementById('skipBtn');

    chrome.storage.local.get(['welcomeShown'], (result) => {
        if (result.welcomeShown) {
        }
    });

    getStartedBtn.addEventListener('click', () => {
        chrome.storage.local.set({ welcomeShown: true }, () => {
            openExtensionPopup();
        });
    });

    skipBtn.addEventListener('click', () => {
        chrome.storage.local.set({ welcomeShown: true }, () => {
            window.close();
        });
    });

    function openExtensionPopup() {
        chrome.tabs.query({ url: '*://app.v2.gather.town/*' }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                chrome.windows.update(tabs[0].windowId, { focused: true });
            } else {
                chrome.tabs.create({
                    url: 'https://app.v2.gather.town/app/',
                    active: true
                });
            }
            
            setTimeout(() => {
                window.close();
            }, 500);
        });
    }

    animateElements();
});

function animateElements() {
    const featureCards = document.querySelectorAll('.feature-card');
    const stepItems = document.querySelectorAll('.step-item');

    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });

    stepItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 600 + (index * 100));
    });
}
