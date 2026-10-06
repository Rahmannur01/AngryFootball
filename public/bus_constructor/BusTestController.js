// Жизненный цикл теста. Эффекты пока подключаются через сцену.
class BusTestController {
    constructor(scene, { lineup, busManager, camera, ui, goal, requiredPlayers = 10 }) {
        this.scene = scene;
        this.lineup = lineup;
        this.busManager = busManager;
        this.camera = camera;
        this.ui = ui;
        this.goal = goal;
        this.requiredPlayers = requiredPlayers;
        this.active = false;
        this.ball = null;
        this.ballControls = null;
        this.health = null;
        this.goalkeeper = null;
        this.snapshot = null;
    }

    start() {
        if (this.active || this.lineup.count < this.requiredPlayers) return false;
        this.snapshot = this.lineup.snapshot();
        this.active = true;

        try {
            this.ui.setTestMode(true);
            Object.values(this.busManager.getObjects() || {}).forEach(obj => {
                if (obj.tag === 'add_player_button') {
                    obj.setVisible(false);
                    obj.disableInteractive();
                }
            });
            this.ui.clearSelection();
            this.lineup.clearSeatSelection();

            this.ball = new Ball(this.scene, { x: 350, y: 900 });
            this.goalkeeper = new Goalkeeper(this.scene, {
                x: this.goal.sprite.x - 170,
                y: 830,
                scale: 0.2,
                teamColor: 0xb066de
            });

            this.camera.stopFollow();
            this.camera.setZoomMultiplier(1, true);
            this.camera.focusOnObject(this.ball.sprite);
            this.camera.follow(this.ball.sprite);
            this.ballControls = new BallInputController(this.scene, this.ball, {
                onRelease: () => this.camera.resetZoom()
            });
            this.scene.setupParticles();
            this.health = new HealthSystem(this.scene, {
                onDeath: (entry) => this.onCharacterDeath(entry)
            });
            this.lineup.getPlayers().forEach(entry => this.health.register(entry));
            this.health.register({ player: this.goalkeeper, isGoalkeeper: true });
            this.health.update();
            return true;
        } catch (error) {
            this.exit();
            throw error;
        }
    }

    exit() {
        if (!this.active) return false;
        const saved = this.snapshot || [];
        const key = this.busManager.getCurrentKey();
        this.clearResources();
        this.active = false;
        this.snapshot = null;

        this.ui.setTestMode(false);
        this.scene.loadBus(key);
        this.ui.reloadPortraits();
        this.lineup.restore(saved, this.busManager.getObjects());
        this.ui.clearSelection();
        return true;
    }

    restart() {
        if (!this.active) return false;
        this.exit();
        return this.start();
    }

    update(delta) {
        this.ball?.update(delta);
        this.health?.update();
    }

    onCharacterDeath(entry) {
        const sprite = entry.player.sprite;
        this.scene.spawnHitParticles(sprite.x, sprite.y, 0xff0000, 100);
        if (entry.isGoalkeeper) {
            this.goalkeeper = null;
        } else {
            this.lineup.removeDestroyedPlayer(entry);
        }
    }

    clearResources() {
        this.health?.destroy();
        this.health = null;
        this.ballControls?.destroy();
        this.ballControls = null;
        this.scene.clearTestSystems();
        this.camera.stopFollow();
        if (this.camera.zoomTween) {
            this.camera.zoomTween.stop();
            this.camera.zoomTween = null;
        }
        this.goalkeeper?.destroy();
        this.goalkeeper = null;
        this.ball?.destroy();
        this.ball = null;
    }

    destroy() {
        if (this.active) this.clearResources();
        this.active = false;
        this.snapshot = null;
    }
}
