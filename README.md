# 🌐 Gather Hub

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)

**Central de notificações inteligente para Gather.town**

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [Uso](#-como-usar) • [Desenvolvimento](#-desenvolvimento)

</div>

---

## 📋 Sobre o Projeto

**Gather Hub** é uma extensão para Chrome que transforma sua experiência no Gather.town, fornecendo um sistema completo de notificações com áudios personalizados, modo concentração, histórico filtrado e interface moderna. Nunca mais perca uma interação importante!

## ✨ Funcionalidades

### 🔔 Sistema de Notificações

- **Notificações de Acenar (Wave)**
  - Receba alertas quando alguém acenar para você
  - Detecção inteligente de nomes de usuários

- **Notificações de Chat**
  - Seja avisado quando receber mensagens no chat
  - Permaneça informado mesmo fora da aba
  - O **avatar do remetente** aparece no toast do sistema
  - O texto da mensagem é exibido junto, sem botões de "Visualizar/Ignorar" e sem texto duplicado

- **Notificações de Chamada**
  - Alertas quando alguém iniciar uma chamada
  - Não perca oportunidades de conversa

- **Notificações de Calendário Google**
  - Integração com Google Calendar
  - Configure o tempo de antecedência (0-5 minutos)
  - Receba lembretes de eventos importantes

- **Sem ruído no histórico do Gather**
  - Quando você está na visualização `activity-feed/chat` (histórico de mensagens), as mensagens antigas não disparam notificações novas

### 🧘 Modo Concentração

- Silencia **todos** os tipos de notificação enquanto está ativo
- Timer configurável: **15 min, 30 min, 1 h, 2 h ou indefinido**
- Contagem regressiva visível no menu de configurações
- Badge `C` laranja no ícone da extensão indica que o modo está ligado

### 🔢 Badge de não-lidas

- Contador no ícone da extensão mostra **quantas notificações chegaram desde a última vez que você abriu o popup** (vai até `99+`)
- Reseta automaticamente ao abrir o popup
- Background vermelho para diferenciar do badge `C` (concentração)

### 🕓 Histórico de notificações

- Aba dedicada no segmented control com as **últimas 30 notificações** recebidas
- Cada item mostra avatar do remetente, nome, mensagem (quando aplicável), tipo e tempo relativo (`agora`, `5m`, `2h`, `3d`)
- **Filtros por tipo:** `Todas / Acenar / Chat / Chamada / Calendário`
- Botão para limpar o histórico inteiro

### 🎵 Sistema de Áudio Personalizado

- **5 Áudios Disponíveis:**
  - Padrão
  - Clássico
  - Suave
  - Moderno
  - Energético

- **Configuração Individual:**
  - Selecione áudio específico para cada tipo de notificação
  - Teste o áudio antes de salvar
  - **Slider de volume global** (0–100%) com preview imediato
  - Reprodução usando Offscreen API para melhor performance

### 🎨 Interface Moderna

- **Popup Centralizado:**
  - Design moderno e intuitivo
  - Navegação por abas (Notificações, Áudio, Histórico)
  - Toggles elegantes para configurações
  - Tema claro / escuro com toggle no menu

- **Welcome Page:**
  - Onboarding para novos usuários
  - Guia rápido de uso

### 🌍 Multi-idioma

- Português (Brasil) – Padrão
- Inglês (English)
- Espanhol (Español)
- Troca de idioma **em tempo real** no popup, sem reiniciar o Chrome

### ⚙️ Recursos Avançados

- **Persistência de Configurações:**
  - Todas as preferências são salvas localmente (`chrome.storage.local`)
  - Estado restaurado entre reinicializações do navegador

- **Detecção Inteligente:**
  - Extração automática de informações do usuário
  - Identificação de avatar e nome
  - Suporte a SVG e PNG no avatar com sanitização contra XSS
  - Suporte para múltiplas versões do Gather.town

- **Service Worker robusto:**
  - Estado de notificação persistido em `chrome.storage.session` para sobreviver à hibernação do worker
  - Concentração agendada via `chrome.alarms` (não depende do worker estar vivo)

## 🚀 Instalação

### Método 1: Instalação Manual (Desenvolvimento)

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/PedroDRT/gather-hub.git
   cd gather-hub
   ```

2. **Abra o Chrome e vá para:**

   ```
   chrome://extensions/
   ```

3. **Ative o Modo do Desenvolvedor** (toggle no canto superior direito)

4. **Clique em "Carregar sem compactação"**

5. **Selecione a pasta do projeto** (`gather-hub`)

6. **Pronto!** A extensão será instalada e aparecerá na barra de ferramentas

### Método 2: Chrome Web Store (Em breve)

A extensão será disponibilizada na Chrome Web Store em breve.

## 📖 Como Usar

### Configuração Inicial

1. **Acesse o Gather.town** (app.v2.gather.town)

2. **Clique no ícone da extensão** na barra de ferramentas

3. **Configure as Notificações:**
   - Ative/desative cada tipo de notificação
   - Configure o tempo de antecedência para eventos do calendário

4. **Personalize os Áudios:**
   - Navegue até a aba "Áudio"
   - Ajuste o volume global no slider
   - Selecione o áudio para cada tipo de notificação
   - Teste usando o botão de play ▶️

5. **Acompanhe o histórico:**
   - Navegue até a aba "Histórico"
   - Use os filtros para ver apenas um tipo (chats, chamadas, etc.)
   - Limpe a lista quando quiser começar do zero

6. **Ative o Modo Concentração quando precisar de foco:**
   - Abra o menu ⚙️ (ícone de engrenagem)
   - Ative o toggle de "Concentração"
   - Escolha a duração (ou deixe indefinido)

### Uso Diário

- As notificações aparecem automaticamente conforme configurado
- O contador no ícone mostra quantas chegaram desde a última visualização
- Clique na notificação do sistema para focar a aba do Gather
- Todas as configurações são salvas automaticamente

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
gather-hub/
├── assets/
│   ├── audio/          # Arquivos de áudio para notificações
│   ├── icons/          # Ícones da extensão
│   ├── images/         # Imagens e avatares
│   └── shared/         # Constantes e utilitários compartilhados
│       ├── constants.js
│       ├── utils.js
│       └── global.css
├── popup/              # Interface do popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── welcome/            # Página de boas-vindas
│   ├── welcome.html
│   ├── welcome.css
│   └── welcome.js
├── _locales/           # Traduções
│   ├── pt_BR/
│   ├── en/
│   └── es/
├── scripts/            # Scripts auxiliares (zip, bump-version)
├── background.js       # Service Worker (notificações, badge, alarms)
├── content.js          # Content Script (detecção no DOM)
├── offscreen.html      # Documento offscreen para áudio
├── offscreen.js
├── eslint.config.js    # Configuração do ESLint
├── .prettierrc.json    # Configuração do Prettier
└── manifest.json       # Manifesto da extensão
```

### Tecnologias Utilizadas

- **Chrome Extension Manifest V3**
- **JavaScript (ES6+)**
- **HTML5 & CSS3**
- **Offscreen API** (reprodução de áudio)
- **Chrome Storage API** (persistência local + sessão)
- **Chrome Notifications API**
- **Chrome Alarms API** (timer do modo concentração)
- **ESLint + Prettier** (DX)

### Requisitos

- Chrome 88+ ou Edge 88+
- Acesso ao Gather.town (app.v2.gather.town)
- Node.js 18+ (apenas para scripts de desenvolvimento)

### Scripts Disponíveis

```bash
npm run lint           # Roda o ESLint em todos os .js
npm run lint:fix       # Corrige problemas auto-fixáveis
npm run format         # Formata todos os arquivos com Prettier
npm run format:check   # Verifica formatação sem alterar
npm run zip            # Empacota a extensão em um .zip
npm run bump-version   # Versão automática baseada em commits
```

O projeto utiliza versionamento semântico automático baseado em tipos de commit:

- `feat:` → Incrementa MINOR (1.0.0 → 1.1.0)
- `fix:` → Incrementa PATCH (1.0.0 → 1.0.1)
- `chore:` → Incrementa PATCH (1.0.0 → 1.0.1)
- `BREAKING CHANGE:` → Incrementa MAJOR (1.0.0 → 2.0.0)

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abrir um Pull Request

### Padrão de Commits

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação, ponto e vírgula faltando, etc
- `refactor:` Refatoração de código
- `test:` Adição de testes
- `chore:` Manutenção

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👤 Autor

**PedroDRT**

- GitHub: [@PedroDRT](https://github.com/PedroDRT)

## 🙏 Agradecimentos

- [Gather.town](https://www.gather.town/) pela plataforma incrível
- Comunidade open source por inspirações e recursos

## 📮 Contato

Encontrou um bug? Tem uma sugestão? Abra uma [Issue](https://github.com/PedroDRT/gather-hub/issues)!

---

<div align="center">

⭐️ Se este projeto foi útil para você, considere dar uma estrela!

Made with ❤️ for the Gather.town community

</div>
