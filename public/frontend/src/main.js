import { AuthApplication } from './js/AuthApplication.js';

const application = new AuthApplication({
    vue: window.Vue,
    selector: '#app'
});

application.mount().catch((error) => {
    console.error('Failed to start authentication application:', error);
});
