const BUS_KEYS = [
    'Bus_constructor_1',
    'Bus_constructor_2',
    'Bus_constructor_3',
    'Bus_constructor_4'
];
class BusScene extends Phaser.Scene {
    static MAX_PLAYERS_COUNT = 10;

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
        const initialBusId = data?.busId ?? window.USER_BUS_ID;
        this.initialBusKey = BUS_KEYS.find(
            key => window.SCENES_DATA[key]?.id === initialBusId
        );
        if (!this.initialBusKey) {
            throw new Error(
                `Автобус с id=${initialBusId} отсутствует в scenes_data.json`
            );
        }

        this.lineup = null;
        this.busManager = null;
        this.busSceneUI = null;
        this.gameApi = new GameApi();
        this.busChangePending = false;
        this.teamPlayers = Array.isArray(window.USER_TEAM_PLAYERS)
            ? window.USER_TEAM_PLAYERS
            : [];
        this.fieldPlayers = this.teamPlayers
            .filter(player => player.position !== 'Goalkeeper')
            .filter(player => (
                Number.isInteger(player.character_type_id) &&
                player.character_type_id > 0
            ))
            .slice(0, BusScene.MAX_PLAYERS_COUNT);
        this.playerTypesList = this.fieldPlayers
            .map(player => player.character_type_id);
        this.busTest = null;
    }

    preload() {
        preloadAllFromJSON(
            this,
            window.SCENES_DATA
        );
        this.load.image('Ball', './assets/SoccerBall.png');
        this.load.image('FootballGoal', './assets/FootballGoal.png');

        const ragdoll = window.PLAYER_RAGDOLL;
        if (!ragdoll?.common || !ragdoll?.players || !ragdoll?.goalkeeper) {
            throw new Error('Player ragdoll configuration is missing');
        }

        Object.values(ragdoll.common.textures).forEach(({ key, file }) => {
            this.load.image(key, file);
        });

        Object.values(ragdoll.players).forEach(({ body }) => {
            this.load.image(body.textureKey, body.textureFile);
        });

        ['body', 'leftArm', 'rightArm'].forEach((part) => {
            const { textureKey, textureFile } = ragdoll.goalkeeper[part];
            this.load.image(textureKey, textureFile);
        });
    }

    create() {
        this.game.renderer.pipelines.addPostPipeline(
            'UniformPipeline',
            UniformPipeline
        );

        this.busSceneUI = new BusSceneUI();

        Object.values(
            window.PLAYER_RAGDOLL.players
        ).forEach((data) => {

            this.busSceneUI.addPortrait(
                data.type,
                data.portraitFile
            );

        });

        this.lineup = new LineupController(this, this.busSceneUI, {
            canEdit: () => (
                !this.busTest?.active &&
                !this.busChangePending
            ),
            maxPlayers: BusScene.MAX_PLAYERS_COUNT,
            savePlayerSlot: (footballerId, slotId) => (
                this.gameApi.setFootballerSlot(footballerId, slotId)
            ),
            saveLineupSlots: players => (
                this.gameApi.saveLineupSlots(players)
            ),
            clearPlayerSlot: footballerId => (
                this.gameApi.clearFootballerSlot(footballerId)
            )
        });
        this.busSceneUI.onCardSelected = (
            type,
            card,
            cardId,
            footballerId
        ) => {
            this.lineup.selectPlayer(type, cardId, footballerId);
        };

        this.busSceneUI.drawPlayers(
            this.fieldPlayers
        );
        this.busManager = new BusManager(
            this,
            BUS_KEYS
        );
        this.cameraManager = new CameraManager(
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
        this.lineup.restoreSavedLineup(
            this.fieldPlayers,
            this.busManager.getObjects()
        );
        this.footballGoal = new FootballGoal(this);
        this.busTest = new BusTestController(this, {
            lineup: this.lineup,
            busManager: this.busManager,
            camera: this.cameraManager,
            ui: this.busSceneUI,
            goal: this.footballGoal,
            requiredPlayers: BusScene.MAX_PLAYERS_COUNT
        });
        this.busSceneUI.setActionHandlers({
            onStartTest: () => this.startBusTest(),
            onChangeBus: () => this.switchNextBus(),
            onRandomLineup: () => this.randomizeLineup(),
            onExitTest: () => this.exitBusTest(),
            onRestartTest: () => this.restartBusTest()
        });
        this.events.once('shutdown', this.shutdown, this);

        this.busResizeHandler = () => {
            if (!this.busTest.active) this.focusCameraOnBus();
        };
        this.scale.on('resize', this.busResizeHandler);
        window.busGameReady = true;
        window.dispatchEvent(new Event('busgame:ready'));

        this.matter.world.setBounds(
            0,      // x
            0,      // y
            2500,   // ширина
            1080,   // высота
            64,     // толщина стен
            true,   // слева
            true,   // справа
            true,   // сверху
            true    // снизу
        );
    }

    loadBus(key) {
        this.lineup?.clearPlayers();

        this.busManager.load(key);

        this.focusCameraOnBus();
    }
    async switchNextBus() {
        if (
            this.busTest.active ||
            this.busChangePending ||
            this.lineup?.isBusy
        ) return false;

        const nextKey = this.busManager.getNextKey();
        const nextBusId = this.busManager.getId(nextKey);

        this.busChangePending = true;
        this.busSceneUI.setBusChangePending(true);

        try {
            await this.gameApi.saveBus(nextBusId);

            this.lineup?.clearPlayers(true);
            this.busManager.load(nextKey);
            this.focusCameraOnBus();
            return true;
        } catch (error) {
            console.error('Не удалось сменить автобус:', error);
            return false;
        } finally {
            this.busChangePending = false;
            this.busSceneUI.setBusChangePending(false);
        }
    }

    switchPreviousBus() {
        if (this.busTest.active) return;

        this.lineup?.clearPlayers();
        this.busManager.loadPrevious();
        this.busSceneUI.reloadPortraits();
    }
    randomBus() {
        if (this.busTest.active) return;

        this.lineup?.clearPlayers();
        this.busManager.loadRandom();
        this.busSceneUI.reloadPortraits();
    }
    randomizeLineup() {
        if (this.busTest.active) return false;

        return this.lineup.randomize(
            this.busManager.getObjects(),
            this.fieldPlayers
        );
    }
    focusCameraOnBus() {
        const bus = this.busManager.getObjects()?.Karkas;
        if (!bus) return;

        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const isMobileLandscape =
            width <= 1200 &&
            height <= 700 &&
            width > height;

        // На телефоне не приближаем камеру к одному каркасу:
        // над ним могут находиться уже расставленные игроки.
        const maxMultiplier = isMobileLandscape ? 1 : 2;

        this.cameraManager.fitObject(
            bus,
            60,
            maxMultiplier
        );
    }
    onAddPlayerButtonClick(buttonObj, cfg) {
        this.lineup.selectSeat(buttonObj, cfg);
    }

    setTeamColor(color) {
        this.lineup.setTeamColor(color);
    }

    setPlayerShaderEnabled(enabled) {
        this.lineup.setShaderEnabled(enabled);
    }

    getCameraZoomMultiplier() {
        const isMobileLandscape =
            window.innerWidth < 1000 &&
            window.innerHeight < 600;

        return isMobileLandscape
            ? 0.9
            : 1.15;
    }

    startBusTest() {
        return this.busTest.start();
    }

    exitBusTest() {
        return this.busTest.exit();
    }

    restartBusTest() {
        return this.busTest.restart();
    }

    update(time, delta) {
        this.busTest?.update(delta);
    }
    shutdown() {
        this.busTest?.destroy();
        this.scale.off('resize', this.busResizeHandler);
        this.footballGoal?.destroy();
        this.lineup?.destroy();
        if (this.busManager) {
            this.busManager.destroy();
        }
        if (this.cameraManager) {
            this.cameraManager.destroy();
        }
    }
}
