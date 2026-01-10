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

**Gather Hub** é uma extensão para Chrome que transforma sua experiência no Gather.town, fornecendo um sistema completo de notificações com áudios personalizados e interface moderna. Nunca mais perca uma interação importante!

## ✨ Funcionalidades

### 🔔 Sistema de Notificações

- **Notificações de Acenar (Wave)**
  - Receba alertas quando alguém acenar para você
  - Detecção inteligente de nomes de usuários

- **Notificações de Chat**
  - Seja avisado quando receber mensagens no chat
  - Permaneça informado mesmo fora da aba

- **Notificações de Chamada**
  - Alertas quando alguém iniciar uma chamada
  - Não perca oportunidades de conversa

- **Notificações de Calendário Google**
  - Integração com Google Calendar
  - Configure o tempo de antecedência (0-5 minutos)
  - Receba lembretes de eventos importantes

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
  - Reprodução usando Offscreen API para melhor performance

### 🎨 Interface Moderna

- **Popup Centralizado:**
  - Design moderno e intuitivo
  - Navegação por abas (Notificações, Áudio, Bind)
  - Toggles elegantes para configurações
  - Suporte completo a temas

- **Welcome Page:**
  - Onboarding para novos usuários
  - Guia rápido de uso

### 🌍 Multi-idioma

- Português (Brasil) - Padrão
- Inglês (English)
- Espanhol (Español)

### ⚙️ Recursos Avançados

- **Persistência de Configurações:**
  - Todas as preferências são salvas localmente
  - Sincronização automática entre sessões

- **Detecção Inteligente:**
  - Extração automática de informações do usuário
  - Identificação de avatar e nome
  - Suporte para múltiplas versões do Gather.town

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
   - Selecione o áudio para cada tipo de notificação
   - Teste usando o botão de play ▶️

5. **Configure Atalhos (Bind):**
   - Navegue até a aba "Bind"
   - Configure atalhos personalizados (em desenvolvimento)

### Uso Diário

- As notificações aparecerão automaticamente conforme configurado
- Clique na notificação para focar na aba do Gather.town
- Todas as configurações são salvas automaticamente

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
gather-hub/
├── assets/
│   ├── audio/          # Arquivos de áudio para notificações
│   ├── icons/          # Ícones da extensão
│   ├── images/         # Imagens e avatares
│   └── shared/         # Utilitários compartilhados
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
├── background.js       # Service Worker
├── content.js          # Content Script
├── offscreen.js        # Offscreen Document (áudio)
└── manifest.json       # Manifesto da extensão
```

### Tecnologias Utilizadas

- **Chrome Extension Manifest V3**
- **JavaScript (ES6+)**
- **HTML5 & CSS3**
- **Offscreen API** (reprodução de áudio)
- **Chrome Storage API** (persistência)
- **Chrome Notifications API**

### Requisitos

- Chrome 88+ ou Edge 88+
- Acesso ao Gather.town (app.v2.gather.town)

### Scripts Disponíveis

```bash
# Versão automática baseada em commits
npm run bump-version
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
