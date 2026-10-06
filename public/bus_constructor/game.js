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
        this.initialBusKey = data?.busKey || BUS_KEYS[0];

        this.lineup = null;
        this.busManager = null;
        this.busSceneUI = null;
        this.playerTypesList = [1, 2, 2, 1, 3, 4, 7, 6, 7, 6];
        this.busTest = null;
    }

    preload() {
        preloadAllFromJSON(
            this,
            window.SCENES_DATA
        );
        this.load.image('Ball', './assets/SoccerBall.png');
        this.load.image('FootballGoal', './assets/FootballGoal.png');
        this.load.image('Goalkeeper', './assets/Goalkeeper.png');

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

        this.lineup = new LineupController(this, this.busSceneUI, {
            canEdit: () => !this.busTest?.active,
            maxPlayers: BusScene.MAX_PLAYERS_COUNT
        });
        this.busSceneUI.onCardSelected = (type, card, cardId) => {
            this.lineup.placeSelectedPlayer(type, cardId);
        };

        this.busSceneUI.drawPortraits(
            this.playerTypesList
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
        this.footballGoal = new FootballGoal(this);
        this.footballGoal.sprite.setDepth(10);
        this.busTest = new BusTestController(this, {
            lineup: this.lineup,
            busManager: this.busManager,
            camera: this.cameraManager,
            ui: this.busSceneUI,
            goal: this.footballGoal,
            requiredPlayers: BusScene.MAX_PLAYERS_COUNT
        });
        this.events.once('shutdown', this.shutdown, this);

        document.getElementById('test-bus-btn').onclick = () => {
            this.startBusTest();
        };
        document.getElementById('change-bus-btn').onclick = () => {
            this.switchNextBus();
        };
        document.getElementById('exit-test-btn').onclick = () => {
            this.exitBusTest();
        };
        document.getElementById('restart-test-btn').onclick = () => {
            this.restartBusTest();
        };

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
    switchNextBus() {
        if (this.busTest.active) return;

        this.lineup?.clearPlayers();
        this.busManager.loadNext();
        this.busSceneUI.reloadPortraits();
        this.focusCameraOnBus();
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
    focusCameraOnBus() {
        const bus = this.busManager.getObjects()?.Karkas;
        if (!bus) return;

        this.cameraManager.fitObject(bus, 60);
    }
    onAddPlayerButtonClick(buttonObj, cfg) {
        this.lineup.selectSeat(buttonObj, cfg);
    }

    setTeamColor(color) {
        this.lineup.setTeamColor(color);
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

    // Эффекты пока остаются в сцене.
    clearTestSystems() {
        this.hitEmitter?.destroy();
        this.hitEmitter = null;
    }

    restartBusTest() {
        return this.busTest.restart();
    }

    setupParticles() {
        if (!this.textures.exists('particle_dot')) {
            const graphics = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle_dot', 8, 8);
            graphics.destroy();
        }

        this.hitEmitter = this.add.particles(0, 0, 'particle_dot', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            quantity: 10,
            emitting: false
        });

        this.hitEmitter.setDepth(15);
    }

    spawnHitParticles(x, y, color = 0xffffff, count = 10) {
        this.hitEmitter.setParticleTint(color);
        this.hitEmitter.explode(count, x, y);
    }

    update(time, delta) {
        this.busTest?.update(delta);
    }
    shutdown() {
        this.busTest?.destroy();
        this.scale.off('resize', this.busResizeHandler);
        for (const id of ['test-bus-btn', 'change-bus-btn', 'exit-test-btn', 'restart-test-btn']) {
            const button = document.getElementById(id);
            if (button) button.onclick = null;
        }
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
