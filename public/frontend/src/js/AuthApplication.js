import { AuthApi } from './AuthApi.js';
import { AuthController } from './AuthController.js';
import { AuthSession } from './AuthSession.js';
import { AuthValidator } from './AuthValidator.js';

export class AuthApplication {
    constructor({ vue, selector = '#app' }) {
        if (!vue?.createApp) {
            throw new Error('Библиотека Vue не загружена.');
        }

        this.vue = vue;
        this.selector = selector;
        this.config = {
            google_client_id: '',
            telegram_bot_username: '',
            dev_mode: true
        };
    }

    async loadConfig() {
        try {
            const basePath = window.BASE_PATH || '';
            const response = await fetch(`${basePath}/api/config`);
            if (!response.ok) {
                throw new Error(`Config request failed: HTTP ${response.status}`);
            }
            this.config = {
                ...this.config,
                ...await response.json()
            };
        } catch (error) {
            console.error('Failed to load config:', error);
        }

        window.GOOGLE_CLIENT_ID = this.config.google_client_id;
        window.TELEGRAM_BOT_USERNAME = this.config.telegram_bot_username;
        window.DEV_MODE = this.config.dev_mode;
    }

    async mount() {
        await this.loadConfig();

        const basePath = window.BASE_PATH || '';
        const validator = new AuthValidator();
        const api = new AuthApi({ baseUrl: `${basePath}/api/auth` });
        const session = new AuthSession();

        const controller = new AuthController({
            vue: this.vue,
            validator,
            api,
            session
        });

        // Telegram calls this global callback from the widget iframe.
        // Register it before the widget script can be added to the page.
        window.onTelegramAuth = async (user) => {
            try {
                const data = await api.loginWithTelegram(user);
                session.setToken(data.access_token);
                window.location.href = './home.html';
            } catch (error) {
                console.error('Telegram OAuth error:', error);
                alert('Не удалось войти через Telegram');
            }
        };

        this.vue.createApp({
            name: 'AngryFootballAuth',
            setup: () => controller.expose(),
            mounted: async () => {
                await controller.initialize();
                // The form (and the Telegram container) is rendered only
                // after the session check changes isCheckingSession.
                await this.vue.nextTick();
                this.installTelegramWidget();
            }
        }).mount(this.selector);
    }

    installTelegramWidget() {
        const container = document.getElementById('telegram-login-container');
        const username = this.config.telegram_bot_username;
        if (this.config.dev_mode || !username || !container) return;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.dataset.telegramLogin = username;
        script.dataset.size = 'large';
        script.dataset.onauth = 'onTelegramAuth(user)';
        script.dataset.requestAccess = 'write';
        container.replaceChildren(script);
    }
}
