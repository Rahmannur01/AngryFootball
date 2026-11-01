import { AuthApi } from './AuthApi.js';
import { AuthController } from './AuthController.js';
import { AuthSession } from './AuthSession.js';
import { AuthValidator } from './AuthValidator.js';

export class AuthApplication {
    constructor({ vue, selector = '#app' }) {
        if (!vue?.createApp) {
            throw new Error('Vue не загружен');
        }

        this.vue = vue;
        this.selector = selector;
        this.session = new AuthSession();
        this.controller = new AuthController({
            vue,
            validator: new AuthValidator(),
            api: new AuthApi(),
            session: this.session
        });
        this.app = null;
    }

    mount() {
        if (this.app) return this.app;

        this.app = this.vue.createApp({
            name: 'AngryFootballAuth',
            setup: () => this.controller.expose(),
            mounted: () => this.controller.initialize()
        });

        this.app.mount(this.selector);
        return this.app;
    }
}
