window.GAME_DPR = Math.min(window.devicePixelRatio || 1, 1.5);

const ACCESS_TOKEN_STORAGE_KEY = 'angry-football.access-token';

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

async function fetchTeamPlayers() {
    let accessToken = null;

    try {
        accessToken = window.sessionStorage.getItem(
            ACCESS_TOKEN_STORAGE_KEY
        );
    } catch {
        // The request below will report that authorization is unavailable.
    }

    if (!accessToken) {
        throw new Error('Для загрузки состава требуется авторизация');
    }

    const response = await fetch('/api/team/players', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        cache: 'no-store'
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message = typeof payload?.detail === 'string'
            ? payload.detail
            : `Не удалось загрузить состав: HTTP ${response.status}`;
        throw new Error(message);
    }
    if (!Array.isArray(payload)) {
        throw new Error('Сервер вернул некорректный состав');
    }

    return payload;
}

let startPromise = null;

window.startBusGame = function () {
    if (startPromise) return startPromise;

    startPromise = (async () => {
        const [scenesData, playerRagdoll, teamPlayers] = await Promise.all([
            fetchJSON('./scenes_data.json'),
            fetchJSON('./Player_ragdoll.json'),
            fetchTeamPlayers()
        ]);
        window.SCENES_DATA = scenesData;
        window.PLAYER_RAGDOLL = playerRagdoll;
        window.USER_TEAM_PLAYERS = teamPlayers;

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
