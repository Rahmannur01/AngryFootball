const menuOverlay = document.getElementById('menu-overlay');
const rotateOverlay = document.getElementById('rotate-overlay');
const playButton = document.getElementById('play-btn');
const gameContainer = document.getElementById('game-container');
const fullscreenButton = document.getElementById('fullscreen-btn');

let lastViewportWidth = 0;
let lastViewportHeight = 0;
let viewportStabilizationFrame = null;
let viewportStabilizationUntil = 0;

// =========================================================
// SCREEN
// =========================================================

function isPortrait() {
    const { width, height } = getVisibleViewportSize();
    return height > width;
}

// =========================================================
// FULLSCREEN
// =========================================================

async function requestFullscreen() {
    const element = document.documentElement;
    const request =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen;

    if (!request) {
        return;
    }
    try {
        await request.call(
            element
        );
    }
    catch (error) {
        console.log(
            'Fullscreen недоступен:',
            error
        );
    }
}



// =========================================================
// LANDSCAPE
// =========================================================

async function lockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock(
                'landscape'
            );
        }
    }
    catch (error) {
        // Safari / iOS может
        // запрещать orientation.lock()
        console.log(
            'Landscape lock недоступен'
        );
    }
}

// =========================================================
// ORIENTATION UI
// =========================================================

function updateOrientation() {
    const isMenuOpen = menuOverlay.style.display !== 'none';

    if (!isMenuOpen && isPortrait()) {
        rotateOverlay.style.display = 'flex';
    }
    else {
        rotateOverlay.style.display = 'none';
    }
}

// =========================================================
// REFRESH PHASER
// =========================================================

function getVisibleViewportSize() {
    const viewport = window.visualViewport;

    return {
        width: Math.max(1, Math.round(viewport?.width || window.innerWidth)),
        height: Math.max(1, Math.round(viewport?.height || window.innerHeight))
    };
}

function syncViewportSize() {
    const { width, height } = getVisibleViewportSize();

    if (width === lastViewportWidth && height === lastViewportHeight) {
        return false;
    }

    lastViewportWidth = width;
    lastViewportHeight = height;

    document.documentElement.style.setProperty('--app-width', `${width}px`);
    document.documentElement.style.setProperty('--app-height', `${height}px`);

    return true;
}

function resizeGame() {
    syncViewportSize();

    if (!window.game || !window.busGameReady) return;

    const rect = gameContainer.getBoundingClientRect();
    const viewport = getVisibleViewportSize();
    const cssWidth = Math.min(rect.width, viewport.width);
    const cssHeight = Math.min(rect.height, viewport.height);
    const width = Math.max(1, Math.round(cssWidth * window.GAME_DPR));
    const height = Math.max(1, Math.round(cssHeight * window.GAME_DPR));

    if (window.game.scale.width !== width || window.game.scale.height !== height) {
        window.game.scale.resize(width, height);
    }
}

function stabilizeViewport(duration = 1800) {
    viewportStabilizationUntil = Math.max(
        viewportStabilizationUntil,
        performance.now() + duration
    );

    if (viewportStabilizationFrame !== null) return;

    function tick(now) {
        resizeGame();

        if (now < viewportStabilizationUntil) {
            viewportStabilizationFrame = requestAnimationFrame(tick);
        } else {
            viewportStabilizationFrame = null;
            resizeGame();
        }
    }

    viewportStabilizationFrame = requestAnimationFrame(tick);
}

// Fullscreen and the browser toolbar can change the viewport over several frames.
function waitForViewport() {
    return new Promise(resolve => {
        const started = performance.now();
        let changed = started;
        let previous = '';

        function check(now) {
            syncViewportSize();
            const viewport = getVisibleViewportSize();
            const size = `${viewport.width}:${viewport.height}`;
            if (size !== previous) {
                previous = size;
                changed = now;
            }
            if ((now - started >= 300 && now - changed >= 180) || now - started >= 1500) {
                resolve();
            } else {
                requestAnimationFrame(check);
            }
        }
        requestAnimationFrame(check);
    });
}


// =========================================================
// PLAY
// =========================================================

playButton.addEventListener(
    'click',
    async () => {
        playButton.disabled = true;
        playButton.textContent = 'Загрузка…';
        try {
            await requestFullscreen();
            await lockLandscape();
            updateOrientation();
            await waitForViewport();
            await window.startBusGame();
            resizeGame();
            menuOverlay.style.display = 'none';
            updateOrientation();
        } catch (error) {
            console.error('Ошибка запуска игры:', error);
            playButton.textContent = 'Ошибка загрузки — повторить';
            playButton.disabled = false;
        }
    }
);



// =========================================================
// WINDOW EVENTS
// =========================================================

let resizeTimer = null;
let resizeFrame = null;

function handleResize() {
    syncViewportSize();
    updateOrientation();
    if (resizeFrame === null) {
        resizeFrame = requestAnimationFrame(() => {
            resizeFrame = null;
            resizeGame();
        });
    }
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeGame, 200);
}



window.addEventListener(
    'resize',
    handleResize
);


window.addEventListener(
    'orientationchange',
    handleResize
);


if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
}

function updateFullscreenButton() {
    const isFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement
    );
}

fullscreenButton.onclick = async () => {
    const isFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement
    );

    try {
        if (isFullscreen) {
            const exit =
                document.exitFullscreen ||
                document.webkitExitFullscreen;

            if (exit) {
                await exit.call(document);
            }
        } else {
            await requestFullscreen();
        }
    } catch (error) {
        console.error('Ошибка переключения экрана:', error);
    }

    updateFullscreenButton();
    stabilizeViewport();
};

function handleFullscreenChange() {
    updateFullscreenButton();
    handleResize();
    stabilizeViewport();
}

document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

updateFullscreenButton();
syncViewportSize();
updateOrientation();

// =========================================================
// RESIZE OBSERVER
// =========================================================

if (
    gameContainer &&
    typeof ResizeObserver !==
    'undefined'
) {

    const resizeObserver =
        new ResizeObserver(
            handleResize
        );


    resizeObserver.observe(
        gameContainer
    );

}
