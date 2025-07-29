(function ($) {
    "use strict";

    jQuery(document).ready(function ($) {

        // preloader
        "use strict";
        var counter = 0;
        var c = 0;
        var i = setInterval(function () {
            $(".preloader .counter").html(c + "%");
            $(".preloader .counter").css({
                "opacity": 1,
            });

            counter++;
            c++;
            if (counter == 101) {
                clearInterval(i);
                setTimeout(function () {
                    $('.preloader').addClass('preloader-deactivate');
                    setTimeout(function () {
                        $('.preloader').addClass('preloader-remove');
                    }, 500);
                }, 500);

            }
        }, 10);

        // sidebar-toggle
        $(".sidebar-toggle-btn").on("click", function () {
            $(".sidebar-menu").toggleClass("active");
        });

    });

}(jQuery));

// ====================================================================
//          CÓDIGO NOVO PARA A LÓGICA DO CHAT E TRANSIÇÃO
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- IMPORTANTE: SUBSTITUA PELAS SUAS URLs REAIS DO N8N ---
    const INTERVIEWER_WEBHOOK_URL = 'URL_DO_WEBHOOK_DO_FLUXO_A';
    const TEST_AGENT_WEBHOOK_URL = 'URL_DO_WEBHOOK_DO_FLUXO_B';
    // -----------------------------------------------------------------

    // Gera um ID de usuário simples para a sessão. Em um site real,
    // você usaria o ID do usuário que fez login.
    const userId = 'user_' + new Date().getTime();

    // Referências aos elementos do HTML que adicionamos e modificamos
    const interviewerScreen = document.getElementById('interviewer-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const testAgentScreen = document.getElementById('test-agent-screen');

    const interviewerForm = document.getElementById('interviewer-form');
    const interviewerInput = document.getElementById('interviewer-input');
    const interviewerMessages = document.getElementById('interviewer-messages');

    const testAgentForm = document.getElementById('test-agent-form');
    const testAgentInput = document.getElementById('test-agent-input');
    const testAgentMessages = document.getElementById('test-agent-messages');
    
    // Verifica se todos os elementos necessários existem antes de continuar
    if (!interviewerForm || !testAgentForm) {
        console.log("Elementos do chat não encontrados. O script não será executado.");
        return;
    }

    // Função para adicionar mensagens na tela de chat
    function addMessageToChat(message, sender, chatArea) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.textContent = message;
        chatArea.appendChild(messageElement);
        chatArea.scrollTop = chatArea.scrollHeight; // Rola para a mensagem mais recente
    }

    // Função genérica para enviar dados para o n8n via fetch
    async function sendMessageToN8N(webhookUrl, userMessage) {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    prompt: userMessage,
                }),
            });
            if (!response.ok) {
                throw new Error(`Erro na rede: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Falha ao comunicar com o n8n:', error);
            // Retorna uma mensagem de erro amigável para o usuário
            return { reply: 'Desculpe, estou com problemas para me conectar. Tente novamente mais tarde.' };
        }
    }

    // Lida com o envio de mensagem do formulário do Entrevistador
    interviewerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = interviewerInput.value.trim();
        if (!userMessage) return;

        addMessageToChat(userMessage, 'user', interviewerMessages);
        interviewerInput.value = '';
        interviewerInput.focus();

        // Envia a mensagem para o Fluxo A
        const aiResponse = await sendMessageToN8N(INTERVIEWER_WEBHOOK_URL, userMessage);
        
        addMessageToChat(aiResponse.reply, 'ai', interviewerMessages);

        // Verifica se o n8n enviou o sinal para trocar de tela
        if (aiResponse.status === 'BRIEFING_COMPLETE') {
            switchToLoadingScreen();
        }
    });

    // Lida com o envio de mensagem do formulário do Agente de Teste
    testAgentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = testAgentInput.value.trim();
        if (!userMessage) return;

        addMessageToChat(userMessage, 'user', testAgentMessages);
        testAgentInput.value = '';
        testAgentInput.focus();

        // Envia a mensagem para o Fluxo B
        const aiResponse = await sendMessageToN8N(TEST_AGENT_WEBHOOK_URL, userMessage);
        addMessageToChat(aiResponse.reply, 'ai', testAgentMessages);
    });

    // Função para gerenciar a troca de telas
    function switchToLoadingScreen() {
        setTimeout(() => {
            interviewerScreen.classList.add('hidden');
            loadingScreen.classList.remove('hidden');
            // Simula o tempo de "construção" do agente
            simulateAgentBuilding();
        }, 500); // pequeno delay para o usuário ver a última mensagem antes da transição
    }

    function simulateAgentBuilding() {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            testAgentScreen.classList.remove('hidden');
        }, 5000); // 5 segundos de "loading". Ajuste conforme desejar.
    }

    // Mensagem inicial do Entrevistador para começar a conversa
    addMessageToChat('Olá! Sou o assistente de IA que vai te ajudar a criar seu próprio agente. Para começarmos, qual o nome do seu projeto?', 'ai', interviewerMessages);
});