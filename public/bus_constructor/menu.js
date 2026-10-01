const menuOverlay = document.getElementById('menu-overlay');
const rotateOverlay = document.getElementById('rotate-overlay');
const playButton = document.getElementById('play-btn');
const gameContainer = document.getElementById('game-container');
const fullscreenButton = document.getElementById('fullscreen-btn');

// =========================================================
// SCREEN
// =========================================================

function isPortrait() {
    return (window.innerHeight > window.innerWidth);
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
    if (isPortrait()) {
        rotateOverlay.style.display = 'flex';
    }
    else {
        rotateOverlay.style.display = 'none';
    }
}

// =========================================================
// REFRESH PHASER
// =========================================================

function resizeGame() {
    if (!window.game || !window.busGameReady) return;

    const rect = gameContainer.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * window.GAME_DPR));
    const height = Math.max(1, Math.round(rect.height * window.GAME_DPR));

    if (window.game.scale.width !== width || window.game.scale.height !== height) {
        window.game.scale.resize(width, height);
    }
}

// Fullscreen and the browser toolbar can change the viewport over several frames.
function waitForViewport() {
    return new Promise(resolve => {
        const started = performance.now();
        let changed = started;
        let previous = '';

        function check(now) {
            const rect = gameContainer.getBoundingClientRect();
            const size = `${rect.width}:${rect.height}`;
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


document.addEventListener(
    'fullscreenchange',
    handleResize
);


document.addEventListener(
    'webkitfullscreenchange',
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
};

document.addEventListener(
    'fullscreenchange',
    updateFullscreenButton
);

document.addEventListener(
    'webkitfullscreenchange',
    updateFullscreenButton
);

updateFullscreenButton();

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
