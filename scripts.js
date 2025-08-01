/* ARQUIVO: scripts.js (VERSÃO COM MEMÓRIA DE CHAT E LOGIN INTELIGENTE) */

// Executa o código quando o conteúdo da página estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DO MENU HAMBÚRGUER (SÓ PARA O INDEX.HTML) ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mainNav = document.getElementById('main-nav');

    if(hamburgerBtn && mainNav) {
        hamburgerBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // ================================================================
    // --- NOVA LÓGICA DE LOGIN INTELIGENTE ---
    // ================================================================
    if (window.netlifyIdentity) {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
          loginBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Impede a ação padrão do link '#'
            const user = netlifyIdentity.currentUser();
            
            if (user) {
              // Se o usuário já estiver logado, redireciona direto para o dashboard
              window.location.href = '/dashboard/';
            } else {
              // Se não estiver logado, abre a janela de login
              // e guarda a informação para redirecionar após o sucesso.
              sessionStorage.setItem('redirectAfterLogin', '/dashboard/');
              netlifyIdentity.open('login');
            }
          });
        }
    }


    // ================================================================
    // --- LÓGICA DO CHAT FLUTUANTE (AGORA COM MEMÓRIA PERSISTENTE) ---
    // ================================================================
    const fab = document.getElementById('nast-ia-fab');
    const chatWindow = document.getElementById('nast-ia-chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatLog = document.getElementById('chat-log');

    const N8N_WEBHOOK_URL = 'https://webhook.oresultador.com.br/webhook/Nah';

    // --- LÓGICA DE SESSÃO E HISTÓRICO ---

    // 1. Gera ou recupera um ID de sessão único para toda a navegação do usuário
    let sessionId = sessionStorage.getItem('nastiaSessionId');
    if (!sessionId) {
        sessionId = Date.now().toString() + Math.random().toString(36).substring(2);
        sessionStorage.setItem('nastiaSessionId', sessionId);
    }

    // 2. Função para carregar o histórico do chat
    function carregarHistorico() {
        const history = JSON.parse(sessionStorage.getItem('nastiaChatHistory'));
        if (history && chatLog) {
            chatLog.innerHTML = ''; // Limpa a mensagem inicial
            history.forEach(item => {
                appendMessage(item.message, item.sender, false); // O 'false' impede que ele se salve de novo
            });
        }
    }

    // 3. Função para salvar o histórico no navegador
    function salvarHistorico(message, sender) {
        let history = JSON.parse(sessionStorage.getItem('nastiaChatHistory')) || [];
        history.push({ message, sender });
        sessionStorage.setItem('nastiaChatHistory', JSON.stringify(history));
    }
    
    // --- FIM DA LÓGICA DE SESSÃO ---


    if (fab && chatWindow && closeChatBtn && chatForm) {
        
        // Carrega o histórico assim que a página é aberta
        carregarHistorico();

        fab.addEventListener('click', () => {
            chatWindow.style.display = 'flex';
        });

        closeChatBtn.addEventListener('click', () => {
            chatWindow.style.display = 'none';
        });

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userMessage = chatInput.value.trim();
            if (!userMessage) return;

            appendMessage(userMessage, 'user');
            chatInput.value = '';

            try {
                const typingIndicator = appendMessage('Digitando...', 'bot typing-indicator');
                
                // ATUALIZADO: Enviando o ID de sessão persistente
                const response = await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userMessage, sessionId: sessionId }),
                });
                
                chatLog.removeChild(typingIndicator);
                if (!response.ok) { throw new Error('A resposta da rede não foi boa.'); }
                const data = await response.json();
                
                const botMessage = data.reply || data.message || 'Desculpe, não consegui processar sua pergunta.';
                appendMessage(botMessage, 'bot');

            } catch (error) {
                const typingIndicator = document.querySelector('.typing-indicator');
                if(typingIndicator) chatLog.removeChild(typingIndicator);
                console.error('Erro ao contatar a IA:', error);
                appendMessage('Ops! Parece que estou com um problema de conexão. Tente novamente mais tarde.', 'bot');
            }
        });
    }
});

// Função appendMessage agora tem um parâmetro extra para controlar o salvamento
function appendMessage(message, sender, salvar = true) {
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) return; 
    const messageElement = document.createElement('div');
    const senderClasses = sender.split(' '); 
    messageElement.classList.add('chat-message', ...senderClasses);
    messageElement.textContent = message;
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight;
    
    // Salva a mensagem no histórico apenas se 'salvar' for true
    if (salvar) {
        // Encontra a função no escopo global para salvar o histórico
        const globalScope = (typeof window !== 'undefined' ? window : this);
        if (globalScope.salvarHistorico) {
            globalScope.salvarHistorico(message, sender);
        }
    }
    
    return messageElement;
}

// Adiciona a função de salvar ao escopo global para ser acessível
(typeof window !== 'undefined' ? window : this).salvarHistorico = function(message, sender) {
    let history = JSON.parse(sessionStorage.getItem('nastiaChatHistory')) || [];
    // Evita salvar a mensagem "Digitando..."
    if(sender.includes('typing-indicator')) return;
    history.push({ message, sender });
    sessionStorage.setItem('nastiaChatHistory', JSON.stringify(history));
};

// Lógica para esconder o header ao abrir o widget de login
if (window.netlifyIdentity) {
  netlifyIdentity.on('open', () => {
    // Encontra o cabeçalho que estiver na página (seja o principal ou o minimalista)
    const header = document.querySelector('.main-header') || document.querySelector('.header-minimalista');
    if (header) {
      header.classList.add('header-escondido');
    }
  });

  netlifyIdentity.on('close', () => {
    // Mostra o cabeçalho novamente quando o widget fecha
    const header = document.querySelector('.main-header') || document.querySelector('.header-minimalista');
    if (header) {
      header.classList.remove('header-escondido');
    }
  });
}

// Lógica de redirecionamento inteligente após o login
if (window.netlifyIdentity) {
  netlifyIdentity.on('login', () => {
    const redirectTo = sessionStorage.getItem('redirectAfterLogin');
    if (redirectTo) {
      // Remove o "bilhete" para não ser usado novamente
      sessionStorage.removeItem('redirectAfterLogin');
      // Redireciona para o local guardado
      window.location.href = redirectTo;
    }
  });
}