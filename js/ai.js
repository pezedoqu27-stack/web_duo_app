/**
 * Дуо — AI Assistant Module
 * Perplexity API integration for movie-related questions
 */

const AI = {
    isWidgetVisible: true,
    isChatOpen: false,

    /**
     * Initialize AI module
     */
    init() {
        this.setupWidget();
        this.setupChat();
        this.loadApiKey();
    },

    /**
     * Setup floating widget
     */
    setupWidget() {
        const widget = document.getElementById('aiWidget');
        const widgetBtn = document.getElementById('aiWidgetBtn');
        const closeBtn = document.getElementById('aiWidgetClose');

        // Toggle chat on widget click
        widgetBtn.addEventListener('click', () => {
            this.toggleChat(true);
        });

        // Hide widget completely
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideWidget();
        });

        // Show close button on hover
        widget.addEventListener('mouseenter', () => {
            closeBtn.classList.add('visible');
        });

        widget.addEventListener('mouseleave', () => {
            closeBtn.classList.remove('visible');
        });
    },

    /**
     * Setup chat interface
     */
    setupChat() {
        const chatClose = document.getElementById('aiChatClose');
        const input = document.getElementById('aiInput');
        const sendBtn = document.getElementById('aiSendBtn');
        const saveKeyBtn = document.getElementById('savePerplexityKey');

        // Close chat
        chatClose.addEventListener('click', () => {
            this.toggleChat(false);
        });

        // Send message on Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                this.sendMessage(input.value.trim());
                input.value = '';
            }
        });

        // Send button click
        sendBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                this.sendMessage(input.value.trim());
                input.value = '';
            }
        });

        // Save API key
        saveKeyBtn.addEventListener('click', () => {
            const keyInput = document.getElementById('perplexityKeyInput');
            const key = keyInput.value.trim();
            if (key) {
                this.saveApiKey(key);
                Components.showToast('API ключ сохранён', 'success');
            }
        });
    },

    /**
     * Load saved API key
     */
    loadApiKey() {
        const key = Storage.getPerplexityKey();
        if (key) {
            document.getElementById('perplexityKeyInput').value = key;
        }
    },

    /**
     * Save API key
     * @param {string} key - Perplexity API key
     */
    saveApiKey(key) {
        Storage.setPerplexityKey(key);
    },

    /**
     * Check if API key is configured
     * @returns {boolean}
     */
    hasApiKey() {
        const key = Storage.getPerplexityKey();
        return key && key.trim().length > 0;
    },

    /**
     * Toggle chat visibility
     * @param {boolean} show - Show or hide
     */
    toggleChat(show) {
        const chat = document.getElementById('aiChat');
        const widget = document.getElementById('aiWidget');

        if (show) {
            chat.classList.remove('hidden');
            widget.classList.add('hidden');
            document.getElementById('aiInput').focus();
        } else {
            chat.classList.add('hidden');
            widget.classList.remove('hidden');
        }

        this.isChatOpen = show;
    },

    /**
     * Hide widget completely
     */
    hideWidget() {
        const widget = document.getElementById('aiWidget');
        widget.classList.add('hidden');
        this.isWidgetVisible = false;

        // Show toast with option to restore
        Components.showToast('AI помощник скрыт. Обновите страницу, чтобы вернуть.');
    },

    /**
     * Send message to Perplexity API
     * @param {string} message - User message
     */
    async sendMessage(message) {
        const messagesContainer = document.getElementById('aiMessages');

        // Add user message
        this.addMessage(message, 'user');

        // Check API key
        if (!this.hasApiKey()) {
            this.addMessage('Пожалуйста, добавьте API ключ Perplexity ниже.', 'error');
            return;
        }

        // Show loading
        const loadingId = this.addMessage('Думаю...', 'loading');

        try {
            const response = await this.askPerplexity(message);

            // Remove loading
            this.removeMessage(loadingId);

            if (response.error) {
                this.addMessage(`Ошибка: ${response.error}`, 'error');
            } else {
                this.addMessage(response.content, 'assistant');
            }
        } catch (error) {
            this.removeMessage(loadingId);
            this.addMessage('Не удалось получить ответ. Проверьте API ключ.', 'error');
            console.error('AI error:', error);
        }

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    /**
     * Call Perplexity API with chat history
     * @param {string} question - User question
     * @returns {Promise<Object>}
     */
    async askPerplexity(question) {
        const key = Storage.getPerplexityKey();

        // System prompt for concise, relevant answers
        const systemPrompt = `Ты — краткий и полезный помощник по фильмам, сериалам и аниме.

ПРАВИЛА:
- Отвечай КРАТКО и ПО ДЕЛУ (макс. 2-3 предложения)
- Рекомендации: название + год + 1 предложение почему
- Не повторяй вопрос пользователя
- Формат списков: нумерация 1. 2. 3.
- Отвечай на русском
- Запоминай контекст беседы`;

        // Build messages with history
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add chat history (last 10 messages)
        const history = this.getChatHistory();
        history.slice(-10).forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current question
        messages.push({ role: 'user', content: question });

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: messages,
                    max_tokens: 400,
                    temperature: 0.5
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { error: errorData.error?.message || 'API Error' };
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || 'Нет ответа';

            // Save to history
            this.saveChatMessage('user', question);
            this.saveChatMessage('assistant', content);

            return { content: this.formatResponse(content) };
        } catch (error) {
            console.error('Perplexity API error:', error);
            return { error: error.message };
        }
    },

    /**
     * Format AI response for display
     * @param {string} text - Raw response text
     * @returns {string} - Formatted HTML
     */
    formatResponse(text) {
        // Clean up response
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>') // Code
            .replace(/\n/g, '<br>'); // Line breaks

        return formatted;
    },

    /**
     * Get chat history from storage
     * @returns {Array}
     */
    getChatHistory() {
        try {
            const history = localStorage.getItem('duo_ai_history');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Save message to chat history
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content - Message content
     */
    saveChatMessage(role, content) {
        const history = this.getChatHistory();
        history.push({
            role: role,
            content: content,
            timestamp: Date.now()
        });
        // Keep only last 50 messages
        const trimmed = history.slice(-50);
        localStorage.setItem('duo_ai_history', JSON.stringify(trimmed));
    },

    /**
     * Clear chat history
     */
    clearChatHistory() {
        localStorage.removeItem('duo_ai_history');
        const container = document.getElementById('aiMessages');
        if (container) {
            container.innerHTML = '<div class="ai-message ai-assistant">Привет! Я помогу найти фильмы или сериалы. Спрашивай! 🎬</div>';
        }
        Components.showToast('История чата очищена', 'info');
    },

    /**
     * Add message to chat
     * @param {string} text - Message text
     * @param {string} type - 'user', 'assistant', 'error', 'loading'
     * @returns {string} - Message ID
     */
    addMessage(text, type) {
        const container = document.getElementById('aiMessages');
        const id = `msg_${Date.now()}`;

        const div = document.createElement('div');
        div.id = id;
        div.className = `ai-message ai-${type}`;

        if (type === 'loading') {
            div.innerHTML = `
                <div class="ai-loading">
                    <span></span><span></span><span></span>
                </div>
            `;
        } else if (type === 'assistant') {
            // Use innerHTML for formatted responses
            div.innerHTML = text;
        } else {
            div.textContent = text;
        }

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;

        return id;
    },

    /**
     * Remove message by ID
     * @param {string} id - Message ID
     */
    removeMessage(id) {
        const msg = document.getElementById(id);
        if (msg) msg.remove();
    }
};

// Initialize AI module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure Storage is loaded
    setTimeout(() => AI.init(), 100);
});
