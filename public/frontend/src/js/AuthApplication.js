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
    }

    async mount() {
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

        this.vue.createApp({
            name: 'AngryFootballAuth',
            setup: () => controller.expose(),
            mounted: () => controller.initialize()
        }).mount(this.selector);
    }
}
