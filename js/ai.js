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
     * Call Perplexity API
     * @param {string} question - User question
     * @returns {Promise<Object>}
     */
    async askPerplexity(question) {
        const key = Storage.getPerplexityKey();

        // Add movie context to the question
        const systemPrompt = `Ты — помощник по фильмам и сериалам, и аниме. Отвечай кратко и по делу. 
Если спрашивают рекомендации — предлагай конкретные названия с годом выпуска.
Отвечай на русском языке.`;

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { error: errorData.error?.message || 'API Error' };
            }

            const data = await response.json();
            return {
                content: data.choices?.[0]?.message?.content || 'Нет ответа'
            };
        } catch (error) {
            console.error('Perplexity API error:', error);
            return { error: error.message };
        }
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
