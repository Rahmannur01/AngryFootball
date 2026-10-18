// Жизненный цикл теста. Эффекты пока подключаются через сцену.
class BusTestController {
    static MAX_SHOT_COUNT = 3;
    static MAX_BOMB_SHOT = 3;
    static MAX_BOOST_SHOT = 3;

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
        this.particles = null;
        this.snapshot = null;
        this.allDynamicObjects = null;
        this.isShotAbilityUsed = false;
        this.shotUsed = BusTestController.MAX_SHOT_COUNT;

        this.specialShotsLeft = {
            boost: BusTestController.MAX_BOOST_SHOT,
            bomb: BusTestController.MAX_BOMB_SHOT
        };
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
                x: this.goal.sprite.x - 150,
                y: 846,
                scale: 0.17,
                teamColor: 0xb066de
            });

            this.camera.stopFollow();
            this.camera.setZoomMultiplier(1, true);
            this.camera.focusOnObject(this.ball.sprite);
            this.camera.follow(this.ball.sprite);

            this.ballControls = new BallInputController(this.scene, this.ball, {
                onRelease: () => this.camera.resetZoom(),
                onShot: this.onShotAction.bind(this),
                onAbilityAction: this.onAbilityAction.bind(this)
            });

            this.particles = new ParticleEffects(this.scene);
            this.health = new HealthSystem(this.scene, {
                onDeath: (entry) => this.onCharacterDeath(entry),
                onDamage:
                    (target, damage, point) =>
                        this.onTargetDamaged(target, damage, point),
                onDestructibleDestroyed:
                    (target) => this.onDestructibleDestroyed(target)
            });
            this.lineup.getPlayers()
                .forEach(entry => this.health.registerCharacter(entry));
            this.lineup.setPlayersSleepThreshold();
            this.health.registerCharacter({
                player: this.goalkeeper,
                isGoalkeeper: true
            });
            this.health.registerDestructibles(
                this.busManager.getObjects()
            );
            this.health.update();

            this.isShotAbilityUsed = false;

            this.shotUsed = BusTestController.MAX_SHOT_COUNT;
            this.specialShotsLeft = {
                boost: BusTestController.MAX_BOOST_SHOT,
                bomb: BusTestController.MAX_BOMB_SHOT
            };
            this.ui.setActiveShotTypesPanel(true, this.specialShotsLeft);
            this.ui.setShootCount(this.shotUsed);
            this.ui.updateSpecialShotCount(this.specialShotsLeft);

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

        this.shotUsed = BusTestController.MAX_SHOT_COUNT;
        this.specialShotsLeft = {
            boost: BusTestController.MAX_BOOST_SHOT,
            bomb: BusTestController.MAX_BOMB_SHOT
        };
        this.ui.setShootCount(this.shotUsed);
        this.ui.setActiveShotTypesPanel(true, this.specialShotsLeft);
        this.ui.updateSpecialShotCount(this.specialShotsLeft);

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

        if (!this.ball?.hasBeenShot) {
            this.settleTimer = 0;
            return;
        }

        if (this.isAnyObjectMoving()) {
            this.settleTimer = 0;
            return;
        }

        this.settleTimer += delta;

        if (this.settleTimer >= 500) {
            this.resetBall();
            this.settleTimer = 0;
        }
    }

    getAllDynamicBodies(isPlayersIn = false) {
        const busBodies = Object.values(
            this.busManager.getObjects() || {}
        ).map(obj => obj.body);

        const playerBodies = isPlayersIn
            ? this.lineup.getPlayers().flatMap(entry => entry.player.getBodies())
            : [];
        const goalkeeperBodies = isPlayersIn
            ? this.goalkeeper?.getBodies?.() || []
            : [];

        return [
            ...busBodies,
            ...playerBodies,
            ...goalkeeperBodies,
            this.ball?.sprite.body,
        ].filter(body =>
            body && !body.isStatic && !body.isSensor
        );
    }

    onAbilityAction() {
        if (!this.ball?.hasBeenShot || this.isShotAbilityUsed) return;
        if (this.currentShotType !== 'bomb' ||
            this.specialShotsLeft.bomb <= 0) return;

        const used = this.explode();
        if (used) {
            this.ball.deactivate();
            this.specialShotsLeft.bomb -= 1;
            this.isShotAbilityUsed = true;
        }
        this.ui.updateSpecialShotCount(this.specialShotsLeft);
    }

    activateBoost() {
        if (this.currentShotType !== 'boost' ||
            this.specialShotsLeft.boost <= 0) return false;

        const used = this.ball.boost();
        if (!used) return false;

        this.particles.spawnBoostParticles(this.ball.sprite);
        this.specialShotsLeft.boost -= 1;
        this.isShotAbilityUsed = true;
        this.ui.updateSpecialShotCount(this.specialShotsLeft);

        return true;
    }

    explode(power = 0.37, radius = 300) {
        if (!this.ball?.hasBeenShot || power <= 0 || radius <= 0) {
            return false;
        }

        const { Body, Sleeping } = Phaser.Physics.Matter.Matter;
        const ballBody = this.ball.sprite.body;
        const center = { ...ballBody.position };

        for (const body of this.getAllDynamicBodies(true)) {
            if (body === ballBody) continue;

            const dx = body.position.x - center.x;
            const dy = body.position.y - center.y;
            const distance = Math.hypot(dx, dy);

            if (distance >= radius) continue;

            const strength = power * (1 - distance / radius);

            // При совпадении центров толкаем вверх.
            const directionX = distance > 0 ? dx / distance : 0;
            const directionY = distance > 0 ? dy / distance : -1;

            Sleeping.set(body, false);

            Body.applyForce(body, body.position, {
                x: directionX * strength,
                y: directionY * strength
            });
        }

        this.particles.spawnExplosionParticles(center.x, center.y);
        // Новое движение отменяет накопленное ожидание остановки.
        this.settleTimer = 0;

        return true;
    }

    resetBall() {
        this.particles.stopBoostParticles();
        this.ball.reset();
        this.isShotAbilityUsed = false;

        if (this.shotUsed <= 0) {
            this.finishShotAttempts();
            return;
        }

        this.ui.setActiveShotTypesPanel(
            true,
            this.specialShotsLeft
        );
    }

    onCharacterDeath(entry) {
        const sprite = entry.player.sprite;
        this.particles.spawnHitParticles(
            sprite.x,
            sprite.y,
            0xff0000,
            40
        );
        if (entry.isGoalkeeper) {
            this.goalkeeper = null;
        } else {
            this.lineup.removeDestroyedPlayer(entry);
        }
    }

    onTargetDamaged(target, damage, impactPoint) {
        if (target.kind !== 'destructible' || damage < 0.05) return;

        const x = impactPoint?.x ?? target.object.x;
        const y = impactPoint?.y ?? target.object.y;

        this.particles.spawnMaterialImpact(
            x,
            y,
            target.profile.material,
            damage / target.maxHp
        );
    }

    onDestructibleDestroyed({ name, object, profile }) {
        this.particles.spawnMaterialDestruction(
            object.x,
            object.y,
            profile.material
        );
        this.busManager.removeObject(name);
        this.wakeBodiesAfterDestruction();
        this.settleTimer = 0;
    }

    wakeBodiesAfterDestruction() {
        const { Sleeping } = Phaser.Physics.Matter.Matter;

        this.getAllDynamicBodies(true).forEach(body => {
            Sleeping.set(body.parent || body, false);
        });
    }

    onShotAction() {
        if (this.shotUsed <= 0) return;

        this.currentShotType = this.ui.getSelectedShotType();
        this.ui.setActiveShotTypesPanel(false, this.specialShotsLeft);
        this.isShotAbilityUsed = false;

        this.activateBoost();

        this.shotUsed = Math.max(0, this.shotUsed - 1);
        this.ui.setShootCount(this.shotUsed);
    }

    finishShotAttempts() {
        this.shotUsed = 0;
        this.specialShotsLeft = {
            boost: 0,
            bomb: 0
        };

        this.ui.setShootCount(this.shotUsed);
        this.ui.updateSpecialShotCount(this.specialShotsLeft);
        this.ui.setActiveShotTypesPanel(false, this.specialShotsLeft);
        this.ballControls?.setGameFinished(true);
    }

    clearResources() {
        this.health?.destroy();
        this.health = null;
        this.ballControls?.destroy();
        this.ballControls = null;
        this.particles?.destroy();
        this.particles = null;
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

    isAnyObjectMoving(speedThreshold = 0.05, angularThreshold = 0.01) {
        return this.getAllDynamicBodies().some(body => {
            if (body.isSleeping) return false;

            const speed = Math.hypot(
                body.velocity.x,
                body.velocity.y
            );

            return speed > speedThreshold || Math.abs(body.angularVelocity) > angularThreshold;
        });
    }

    destroy() {
        if (this.active) this.clearResources();
        this.active = false;
        this.snapshot = null;
    }
}
