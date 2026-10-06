window.GAME_DPR = Math.min(window.devicePixelRatio || 1, 1.5);

function getGameSize() {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    return {
        width: Math.max(1, Math.round(rect.width * window.GAME_DPR)),
        height: Math.max(1, Math.round(rect.height * window.GAME_DPR))
    };
}

function createGameConfig() {
    const { width, height } = getGameSize();
    return {
        type: Phaser.AUTO,
        parent: 'game-container',
        backgroundColor: '#000000',
        width,
        height,
        scale: {
            mode: Phaser.Scale.NONE,
            zoom: 1 / window.GAME_DPR
        },
        physics: {
            default: 'matter',
            matter: {
                gravity: { x: 0, y: 1 },
                debug: false,
                enableSleeping: true,
                positionIterations: 10,
                velocityIterations: 8
            }
        },
        scene: [BusScene]
    };
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
}

let startPromise = null;

window.startBusGame = function () {
    if (startPromise) return startPromise;

    startPromise = (async () => {
        const [scenesData, playerTypes] = await Promise.all([
            fetchJSON('./scenes_data.json'),
            fetchJSON('./Player_types.json')
        ]);
        window.SCENES_DATA = scenesData;
        window.PLAYER_TYPES = playerTypes;

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('busgame:ready', onReady);
                reject(new Error('Сцена не загрузилась вовремя'));
            }, 30000);
            function onReady() {
                clearTimeout(timeout);
                resolve();
            }
            window.addEventListener('busgame:ready', onReady, { once: true });

            try {
                window.game = new Phaser.Game(createGameConfig());
                window.game.renderer.pipelines.addPostPipeline(
                    'UniformPipeline', UniformPipeline
                );
            } catch (error) {
                clearTimeout(timeout);
                window.removeEventListener('busgame:ready', onReady);
                reject(error);
            }
        });
        return window.game;
    })().catch(error => {
        if (window.game) {
            window.game.destroy(true);
            window.game = null;
        }
        window.busGameReady = false;
        startPromise = null;
        throw error;
    });

    return startPromise;
};