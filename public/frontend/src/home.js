import { HomeApplication } from './js/HomeApplication.js';

const application = new HomeApplication({
    vue: window.Vue,
    selector: '#app'
});

application.mount();
