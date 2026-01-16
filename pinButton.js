function createPinButton(anchorElement) {
  const button = document.createElement('button');
  button.className = '_1qlk14h9 fix-chat-gather-utilities';
  button.type = 'button';

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentFixed = anchorElement.dataset.fixed === 'true';
    const newIsFixed = !currentFixed;
    const chatHref = anchorElement.href;
    
    chrome.storage.local.get(['fixedChats'], (result) => {
      const fixedChats = result.fixedChats || [];
      let updatedChats;
      
      if (newIsFixed) {
        if (!fixedChats.includes(chatHref)) {
          updatedChats = [...fixedChats, chatHref];
        } else {
          updatedChats = fixedChats;
        }
      } else {
        updatedChats = fixedChats.filter(href => href !== chatHref);
      }
      
      // Atualiza o storage
      chrome.storage.local.set({ fixedChats: updatedChats }, () => {
        // Aguarda o storage ser atualizado antes de reordenar
        anchorElement.dataset.fixed = newIsFixed ? 'true' : 'false';
        button.title = newIsFixed ? 'Desfixar chat' : 'Fixar chat';
        svg.setAttribute('fill', newIsFixed ? 'currentColor' : 'none');
        
        // Reordena após um pequeno delay para garantir que tudo foi atualizado
        setTimeout(() => {
          if (window.reorderFixedChats) {
            window.reorderFixedChats();
          }
        }, 50);
      });
    });
  });
  
  const isFixed = anchorElement.dataset.fixed === 'true';
  button.title = isFixed ? 'Desfixar chat' : 'Fixar chat';
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', isFixed ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.className = 'lucide lucide-pin-icon lucide-pin';
  
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M12 17v5');
  
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z');
  
  svg.appendChild(path1);
  svg.appendChild(path2);
  button.appendChild(svg);

  
  
  return button;
}
