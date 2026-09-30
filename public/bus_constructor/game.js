const BUS_KEYS = [
    'Bus_constructor_1',
    'Bus_constructor_2'
];
class BusScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'BusScene'
        });
        // Обработчики объектов из JSON по tag
        this.tagHandlers = {
            add_player_button:
                this.onAddPlayerButtonClick.bind(this),
        };
    }
    init(data) {
        this.initialBusKey = data?.busKey || BUS_KEYS[0];

        this.players = [];
        this.busManager = null;
        this.busSceneUI = new BusSceneUI();
        this.playerTypesList = [1, 2, 2, 1, 3, 4, 7, 6, 7, 6];
    }

    preload() {
        preloadAllFromJSON(
            this,
            window.SCENES_DATA
        );

        Object.entries(
            window.PLAYER_TYPES
        ).forEach(([key, data]) => {

            this.load.image(
                key,
                data.Player_img
            );

        });
    }

    create() {
        this.busSceneUI = new BusSceneUI();

        Object.values(
            window.PLAYER_TYPES
        ).forEach((data) => {

            this.busSceneUI.addPortrait(
                data.type,
                data.Player_portret
            );

        });

        this.busSceneUI.drawPortraits(
            this.playerTypesList
        );
        this.busManager =
            new BusManager(
                this,
                BUS_KEYS
            );
        this.cameraManager =
            new CameraManager(
                this,
                {
                    worldWidth: 2500,
                    worldHeight: 1080
                }
            );
        this.cameraManager.setup();
        this.loadBus(
            this.initialBusKey
        );
        document.getElementById('change-bus-btn').onclick = () => {
            this.switchNextBus();
        };
        this.scale.on('resize', () => {
            this.focusCameraOnBus();
        });
        window.busGameReady = true;
        window.dispatchEvent(new Event('busgame:ready'));
    }

    loadBus(key) {
        this.destroyPlayers();

        this.busManager.load(key);

        this.focusCameraOnBus();
    }
    switchNextBus() {
        this.destroyPlayers();
        this.busManager.loadNext();
        this.busSceneUI.reloadPortraits();
        this.focusCameraOnBus();
    }

    switchPreviousBus() {
        this.destroyPlayers();
        this.busManager.loadPrevious();
        this.busSceneUI.reloadPortraits();
    }
    randomBus() {
        this.destroyPlayers();
        this.busManager.loadRandom();
        this.busSceneUI.reloadPortraits();
    }
    focusCameraOnBus() {
        const bus = this.busManager.getObjects()?.Karkas;
        if (!bus) return;

        this.cameraManager.fitObject(bus, 60);
    }
    onAddPlayerButtonClick(buttonObj, cfg) {
        if (!buttonObj.visible || this.busSceneUI.currentPlayerType === -1) {
            return;
        }
        buttonObj.setVisible(false);
        buttonObj.disableInteractive();
        const player =
            new Player(this, {
                x: buttonObj.x,
                y: buttonObj.y,
                type: this.busSceneUI.currentPlayerType,
                scale: 0.2,
                teamColor: 0xff2020
            });
        const entry = {
            seatName: cfg.name,
            x: buttonObj.x,
            y: buttonObj.y,
            player,
            seatButton: buttonObj,
            card: this.busSceneUI.currentClickedCard
        };
        this.players.push(entry);
        player.sprite.setInteractive();
        player.sprite.on('pointerdown', () => {
            this.returnPlayer(entry);
        });
        this.busSceneUI.playerAdded();

        console.log(
            `Игрок добавлен на место "${cfg.name}" ` +
            `(${buttonObj.x}, ${buttonObj.y}). ` +
            `Всего игроков: ${this.players.length}`
        );
    }
    destroyPlayers() {
        if (!this.players) {
            return;
        }
        this.players.forEach(
            ({ player }) => {

                if (player) {
                    player.destroy();
                }

            }
        );
        this.players = [];
    }
    setTeamColor(color) {

        this.players.forEach(
            ({ player }) => {

                player.setTeamColor(color);

            }
        );
    }
    getCameraZoomMultiplier() {
        const isMobileLandscape =
            window.innerWidth < 1000 &&
            window.innerHeight < 600;

        return isMobileLandscape
            ? 0.9
            : 1.15;
    }

    returnPlayer(entry) {
        const index = this.players.indexOf(entry);

        if (index === -1) return;

        // Возвращаем портрет в его исходную карточку.
        const portrait = entry.card?.querySelector('.player-photo');

        if (portrait) {
            this.busSceneUI.drawPortrait(entry.player.type, portrait);
        }
        // Возвращаем кнопку свободного места.
        entry.seatButton.setVisible(true);
        entry.seatButton.setInteractive();
        // Убираем игрока со сцены и из списка.
        this.players.splice(index, 1);
        entry.player.destroy();
    }

    update(time, delta) {
    }
    shutdown() {
        this.destroyPlayers();
        if (this.busManager) {
            this.busManager.destroy();
        }
        if (this.cameraManager) {
            this.cameraManager.destroy();
        }
    }
}

// The same value is used by menu.js when the viewport changes.
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
            fetchJSON('/static/bus_constructor/scenes_data.json'),
            fetchJSON('/static/bus_constructor/Player_types.json')
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
