const BUS_KEYS = [
    'Bus_constructor_1',
    'Bus_constructor_2'
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

        this.players = [];
        this.busManager = null;
        this.busSceneUI = new BusSceneUI();
        this.playerTypesList = [1, 2, 2, 1, 3, 4, 7, 6, 7, 6];
        this.ball = null;
    }

    preload() {
        preloadAllFromJSON(
            this,
            window.SCENES_DATA
        );
        this.load.image(
            'Ball',
            '/static/bus_constructor/assets/SoccerBall.png'
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

        this.scale.on('resize', () => {
            if (!this.ball) {
                this.focusCameraOnBus();
            }
        });
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
        this.destroyPlayers();

        this.busManager.load(key);

        this.focusCameraOnBus();
    }
    switchNextBus() {
        if (this.ball) return;

        this.destroyPlayers();
        this.busManager.loadNext();
        this.busSceneUI.reloadPortraits();
        this.focusCameraOnBus();
    }

    switchPreviousBus() {
        if (this.ball) return;

        this.destroyPlayers();
        this.busManager.loadPrevious();
        this.busSceneUI.reloadPortraits();
    }
    randomBus() {
        if (this.ball) return;

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
        if (this.ball) return;

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

    startBusTest() {
        // Повторное нажатие не создаёт второй мяч.
        if (this.ball || this.players.length < BusScene.MAX_PLAYERS_COUNT) return;

        this.testPlayersSnapshot = this.players.map((entry) => ({
            seatName: entry.seatName,
            type: entry.player.type,
            card: entry.card
        }));

        // Скрываем панель игроков.
        document.getElementById('players-panel').style.display = 'none';

        // Скрываем кнопки свободных мест и отключаем нажатия.
        Object.values(this.busManager.getObjects() || {}).forEach((obj) => {
            if (obj.tag === 'add_player_button') {
                obj.setVisible(false);
                obj.disableInteractive();
            }
        });

        // Очищаем выбранную карточку.
        this.busSceneUI.clearSelection();

        this.ball = new Ball(this, {
            x: 350,
            y: 900
        });

        this.cameraManager.stopFollow();
        this.cameraManager.setZoomMultiplier(1, true);
        this.cameraManager.focusOnObject(this.ball.sprite);
        this.cameraManager.follow(this.ball.sprite);
        this.setupBallControls();
        this.setupParticles();
        this.setupPlayerHealth();

        document.getElementById('test-bus-btn').hidden = true;
        document.getElementById('change-bus-btn').hidden = true;
        document.getElementById('exit-test-btn').hidden = false;
        document.getElementById('restart-test-btn').hidden = false;
    }

    exitBusTest() {
        if (!this.ball) return;

        // Отключаем управление тестом.
        this.input.off('pointerdown', this.ballPointerDown);
        this.input.off('pointermove', this.ballPointerMove);
        this.input.off('pointerup', this.ballPointerUp);

        this.startPoint = null;
        this.isAiming = false;

        if (this.playerCollisionHandler) {
            this.matter.world.off(
                'collisionstart',
                this.playerCollisionHandler
            );
        }

        // Убираем полоски здоровья и эффекты.
        this.playerHealthMap?.forEach(({ bar }) => bar.destroy());
        this.playerHealthMap?.clear();

        this.aimGraphics?.destroy();
        this.aimGraphics = null;

        this.hitEmitter?.destroy();
        this.hitEmitter = null;

        // Останавливаем камеру перед удалением мяча.
        this.cameraManager.stopFollow();

        // Отменяем незавершённый зум прицеливания.
        if (this.cameraManager.zoomTween) {
            this.cameraManager.zoomTween.stop();
            this.cameraManager.zoomTween = null;
        }

        this.ball.destroy();
        this.ball = null;

        // Восстанавливаем каркас и карточки.
        const key = this.busManager.getCurrentKey();

        document.getElementById('players-panel').style.display = '';

        this.loadBus(key);
        this.busSceneUI.reloadPortraits();

        const objects = this.busManager.getObjects();

        for (const saved of this.testPlayersSnapshot || []) {
            const seatButton = objects[saved.seatName];

            if (!seatButton) continue;

            // Временно выбираем исходную карточку игрока.
            this.busSceneUI.currentPlayerType = saved.type;
            this.busSceneUI.currentClickedCard = saved.card;

            // Используем существующую логику размещения.
            this.onAddPlayerButtonClick(seatButton, {
                name: saved.seatName
            });
        }

        this.busSceneUI.clearSelection();
        this.testPlayersSnapshot = null;

        // Возвращаем кнопки настройки.
        document.getElementById('test-bus-btn').hidden = false;
        document.getElementById('change-bus-btn').hidden = false;
        document.getElementById('exit-test-btn').hidden = true;
        document.getElementById('restart-test-btn').hidden = true;
    }

    setupBallControls() {
        this.startPoint = null;
        this.isAiming = false;

        this.aimGraphics = this.add.graphics();
        this.aimGraphics.setDepth(100);

        this.ballPointerDown = (pointer) => {
            if (!this.ball) return;
            if (this.ball.isMoving || !this.ball.isReady) return;
            if (this.ball.hasBeenShot) return;

            this.startPoint = {
                x: pointer.worldX,
                y: pointer.worldY
            };

            this.isAiming = true;

            this.cameraManager.smoothZoom(1.7);
        };

        this.input.on('pointerdown', this.ballPointerDown);

        this.ballPointerMove = (pointer) => {
            if (!this.startPoint || this.ball.isMoving) return;

            const angle = Phaser.Math.Angle.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            const dragDistance = Phaser.Math.Distance.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            this.drawAimDots(angle, dragDistance);
        };

        this.ballPointerUp = (pointer) => {
            if (!this.startPoint || this.ball.isMoving) return;

            const dragDistance = Phaser.Math.Distance.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            const angle = Phaser.Math.Angle.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            const maxDrag = 150;
            const power = Phaser.Math.Clamp(
                dragDistance / maxDrag,
                0,
                1
            );

            this.ball.shoot(angle, power);

            this.aimGraphics.clear();
            this.startPoint = null;
            this.isAiming = false;

            this.cameraManager.resetZoom();
        };
        this.input.on('pointermove', this.ballPointerMove);
        this.input.on('pointerup', this.ballPointerUp);
    }

    restartBusTest() {
        if (!this.ball) return;

        this.exitBusTest();
        this.startBusTest();
    }

    drawAimDots(angle, dragDistance) {
        this.aimGraphics.clear();

        const ball = this.ball.sprite;
        const dotCount = 20;
        const spacing = 20;
        const maxDrag = 100;

        const power = Phaser.Math.Clamp(
            dragDistance / maxDrag,
            0,
            1
        );

        this.aimGraphics.fillStyle(0xffffff, 0.5);
        this.aimGraphics.fillCircle(ball.x, ball.y, 6);

        for (let i = 1; i <= dotCount; i++) {
            if (i > dotCount * power) break;

            const distance = i * spacing;

            const dotX = ball.x + Math.cos(angle) * distance;
            const dotY =
                ball.y +
                Math.sin(angle) * distance +
                0.05 * i * i;

            const t = i / dotCount;

            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(0, 255, 0),
                new Phaser.Display.Color(255, 0, 0),
                1,
                t
            );

            this.aimGraphics.fillStyle(color.color, 0.8);

            const radius = Phaser.Math.Linear(5, 2, t);

            this.aimGraphics.fillCircle(dotX, dotY, radius);
        }
    }

    setupPlayerHealth() {
        this.playerHealthMap = new Map();

        this.players.forEach((entry) => {
            const sprite = entry.player.sprite;
            const bar = this.add.graphics().setDepth(20);

            this.playerHealthMap.set(sprite.body, {
                entry,
                hp: 2,
                maxHp: 2,
                bar
            });
        });

        this.playerCollisionHandler = (event) => {
            event.pairs.forEach(({ bodyA, bodyB }) => {
                const impactSpeed = Math.hypot(
                    bodyA.velocity.x - bodyB.velocity.x,
                    bodyA.velocity.y - bodyB.velocity.y
                );

                if (impactSpeed <= 0.3) return;

                // parent позволяет работать и с составными телами.
                this.damagePlayer(bodyA.parent || bodyA, impactSpeed);
                this.damagePlayer(bodyB.parent || bodyB, impactSpeed);
            });
        };

        this.matter.world.on(
            'collisionstart',
            this.playerCollisionHandler
        );

        this.events.once('shutdown', () => {
            this.matter.world.off(
                'collisionstart',
                this.playerCollisionHandler
            );

            this.playerHealthMap.forEach(({ bar }) => bar.destroy());
            this.playerHealthMap.clear();
        });

        this.drawPlayerHealthBars();
    }

    damagePlayer(body, impactSpeed) {
        const data = this.playerHealthMap.get(body);

        if (!data) return;

        data.hp = Math.max(0, data.hp - impactSpeed * 0.06);

        if (data.hp > 0) return;

        const sprite = data.entry.player.sprite;
        this.spawnHitParticles(
            sprite.x,
            sprite.y,
            0xff0000,
            100
        );

        this.cameraManager.shake(200, 0.02);

        data.bar.destroy();
        this.playerHealthMap.delete(body);

        const index = this.players.indexOf(data.entry);

        if (index !== -1) {
            this.players.splice(index, 1);
        }

        data.entry.player.destroy();
    }

    drawPlayerHealthBars() {
        if (!this.playerHealthMap) return;

        this.playerHealthMap.forEach(({ entry, hp, maxHp, bar }) => {
            const sprite = entry.player.sprite;
            const bounds = sprite.getBounds();

            const width = 40;
            const height = 6;

            const x = bounds.centerX - width / 2;
            const y = bounds.top - 15;

            bar.clear();

            bar.fillStyle(0x000000, 0.6);
            bar.fillRect(x, y, width, height);

            const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
            const color = ratio > 0.5 ? 0x00ff00 : 0xffaa00;

            bar.fillStyle(color, 1);
            bar.fillRect(x, y, width * ratio, height);
        });
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
        this.ball?.update(delta);
        this.drawPlayerHealthBars();
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
