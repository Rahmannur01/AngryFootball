const MENU_LOADING_DELAY_MS = 3500;

const menuOverlay = document.getElementById('menu-overlay');
const rotateOverlay = document.getElementById('rotate-overlay');
const playBtn = document.getElementById('play-btn');
const loadingText = document.getElementById('loading-text');

function isPortrait() {
    return window.innerHeight > window.innerWidth;
}

async function requestFullscreen() {
    const el = document.documentElement;
    const request =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;

    if (!request) return;

    try {
        await request.call(el);
    } catch (e) {
        // Fullscreen может быть отклонён/не поддерживаться
    }
}

async function requestLandscapeLock() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (e) {
        // Лок не поддерживается (iOS Safari) или отклонён браузером
    }
}

function showRotateOverlayIfNeeded() {
    if (isPortrait()) {
        rotateOverlay.style.display = 'flex';

        const checkOrientation = () => {
            if (!isPortrait()) {
                rotateOverlay.style.display = 'none';
                window.removeEventListener('resize', checkOrientation);
                window.removeEventListener('orientationchange', checkOrientation);
            }
        };
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
    }
}

playBtn.addEventListener('click', async () => {
    playBtn.style.display = 'none';
    loadingText.style.display = 'block';

    await requestFullscreen();
    await requestLandscapeLock();

    setTimeout(() => {
        menuOverlay.style.display = 'none';
        showRotateOverlayIfNeeded();
    }, MENU_LOADING_DELAY_MS);
});