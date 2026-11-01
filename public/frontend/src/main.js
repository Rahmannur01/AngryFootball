import { AuthApplication } from './js/AuthApplication.js';

const application = new AuthApplication({
    vue: window.Vue,
    selector: '#app'
});

application.mount();
