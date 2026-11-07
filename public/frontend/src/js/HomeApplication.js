import { AuthApi } from './AuthApi.js';
import { AuthSession } from './AuthSession.js';
import { ChestsApi } from './ChestsApi.js';
import { HomeController } from './HomeController.js';
import { LineupApi } from './LineupApi.js';
import { PlayerPortraits } from './PlayerPortraits.js';
import { TeamApi } from './TeamApi.js';

export class HomeApplication {
    constructor({ vue, selector = '#app' }) {
        if (!vue?.createApp) {
            throw new Error('Vue не загружен');
        }

        const basePath = window.BASE_PATH || '';

        this.vue = vue;
        this.selector = selector;
        this.controller = new HomeController({
            vue,
            authApi: new AuthApi({ baseUrl: `${basePath}/api/auth` }),
            chestsApi: new ChestsApi({ baseUrl: `${basePath}/api/chests` }),
            teamApi: new TeamApi({ baseUrl: `${basePath}/api/team` }),
            lineupApi: new LineupApi({ baseUrl: `${basePath}/api/lineup` }),
            playerPortraits: new PlayerPortraits(),
            session: new AuthSession()
        });
        this.app = null;
    }

    mount() {
        if (this.app) return this.app;

        this.app = this.vue.createApp({
            name: 'AngryFootballHome',
            setup: () => this.controller.expose(),
            mounted: () => this.controller.initialize()
        });

        this.app.mount(this.selector);
        return this.app;
    }
}
