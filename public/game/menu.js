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

let orientationSettleTimer = null;
let isGamePaused = false;

function applyOrientationState() {
    if (isPortrait()) {
        rotateOverlay.style.display = 'flex';
        if (!isGamePaused && typeof game !== 'undefined') {
            game.scene.pause('scene_JGRZhYTj');
            isGamePaused = true;
        }
    } else {
        rotateOverlay.style.display = 'none';
        if (isGamePaused && typeof game !== 'undefined') {
            game.scene.resume('scene_JGRZhYTj');
            isGamePaused = false;
        }
    }
}

function handleOrientationSettle() {
    clearTimeout(orientationSettleTimer);
    orientationSettleTimer = setTimeout(() => {
        if (typeof game !== 'undefined' && game.scale) {
            game.scale.refresh(); // пересчитывает canvas после того, как браузер домерил UI после поворота
        }
        applyOrientationState();
    }, 300);
}

window.addEventListener('resize', handleOrientationSettle);
window.addEventListener('orientationchange', handleOrientationSettle);

// Выход/вход в fullscreen (например, через кнопку "E" в игре) меняет
// реальную видимую высоту (появляется/скрывается адресная строка),
// но не всегда надёжно вызывает 'resize' сам по себе - слушаем отдельно.
document.addEventListener('fullscreenchange', handleOrientationSettle);
document.addEventListener('webkitfullscreenchange', handleOrientationSettle);
document.addEventListener('mozfullscreenchange', handleOrientationSettle);
document.addEventListener('MSFullscreenChange', handleOrientationSettle);

// Подстраховка: на некоторых мобильных браузерах появление/скрытие
// адресной строки меняет только CSS (100dvh), не вызывая ни resize,
// ни orientationchange, ни fullscreenchange. ResizeObserver ловит
// изменение реального размера контейнера в любом случае.
const gameContainerEl = document.getElementById('game-container');
if (gameContainerEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(handleOrientationSettle).observe(gameContainerEl);
}

playBtn.addEventListener('click', async () => {
    playBtn.style.display = 'none';
    loadingText.style.display = 'block';

    await requestFullscreen();
    await requestLandscapeLock();

    setTimeout(() => {
        menuOverlay.style.display = 'none';
        applyOrientationState();

        // Подстраховка: на некоторых мобильных браузерах первый замер
        // размера контейнера бывает неточным (адресная строка ещё
        // не устоялась). Форсируем пересчёт через короткую паузу.
        if (typeof game !== 'undefined' && game.scale) {
            setTimeout(() => game.scale.refresh(), 400);
        }
    }, MENU_LOADING_DELAY_MS);
});

const restartButton = document.getElementById('restart-button');
const fullscreenButton = document.getElementById('fullscreen-button');

restartButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const scene = game.scene.getScene('scene_JGRZhYTj');

    if (scene && scene.scene.isActive()) {
        scene.scene.restart();
    }
});

fullscreenButton.addEventListener('pointerdown', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    fullscreenButton.blur();

    const el = document.documentElement;

    const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );

    try {
        if (isFullscreen) {
            const exit =
                document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.mozCancelFullScreen ||
                document.msExitFullscreen;

            if (exit) {
                await exit.call(document);
            }

            return;
        }

        const request =
            el.requestFullscreen ||
            el.webkitRequestFullscreen ||
            el.mozRequestFullScreen ||
            el.msRequestFullscreen;

        if (request) {
            await request.call(el);
        }

    } catch (e) {
        console.log('Fullscreen error:', e);
    }
});