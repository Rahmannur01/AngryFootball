class ParticleEffects {
    constructor(scene) {
        this.scene = scene;
        this.hitEmitter = null;

        this.setupParticles();
    }

    setupParticles() {
        if (this.hitEmitter) return;

        if (!this.scene.textures.exists('particle_dot')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle_dot', 8, 8);
            graphics.destroy();
        }

        this.hitEmitter = this.scene.add.particles(
            0,
            0,
            'particle_dot',
            {
                speed: { min: 100, max: 300 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0 },
                lifespan: 400,
                quantity: 10,
                emitting: false
            }
        );

        this.hitEmitter.setDepth(15);

        // Крупная вспышка.
        this.explosionEmitter = this.scene.add.particles(
            0, 0, 'particle_dot',
            {
                speed: { min: 80, max: 260 },
                angle: { min: 0, max: 360 },
                scale: { start: 5, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: { min: 180, max: 350 },
                tint: [0xffffff, 0xffe066, 0xffa329],
                blendMode: Phaser.BlendModes.ADD,
                emitting: false
            }
        );

        this.explosionEmitter.setDepth(25);

        // Быстрые искры, которые падают вниз.
        this.explosionSparksEmitter = this.scene.add.particles(
            0, 0, 'particle_dot',
            {
                speed: { min: 250, max: 650 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.4, end: 0 },
                alpha: { start: 1, end: 0 },
                gravityY: 400,
                lifespan: { min: 350, max: 700 },
                tint: [0xffe066, 0xffa329, 0xff5a1f],
                blendMode: Phaser.BlendModes.ADD,
                emitting: false
            }
        );

        this.explosionSparksEmitter.setDepth(26);

        this.boostEmitter = this.scene.add.particles(
            0, 0, 'particle_dot',
            {
                speed: { min: 10, max: 40 },
                angle: { min: 0, max: 360 },
                frequency: 15,
                quantity: 2,
                scale: { start: 1.6, end: 0 },
                alpha: { start: 0.9, end: 0 },
                lifespan: { min: 150, max: 300 },
                tint: [0xffffff, 0x66e0ff, 0x2299ff, 0x3355ff],
                blendMode: Phaser.BlendModes.ADD,
                emitting: false
            }
        );

        this.boostEmitter.setDepth(14);
        this.boostTimer = null;
    }

    spawnExplosionParticles(x, y) {
        this.explosionEmitter.explode(25, x, y);
        this.explosionSparksEmitter.explode(45, x, y);
    }

    spawnHitParticles(x, y, color = 0xffffff, count = 10) {
        this.hitEmitter.setParticleTint(color);
        this.hitEmitter.explode(count, x, y);
    }

    spawnBoostParticles(sprite, duration = 450) {
        this.stopBoostParticles();

        this.boostEmitter.startFollow(sprite);
        this.boostEmitter.start();

        this.boostTimer = this.scene.time.delayedCall(duration, () => {
            this.stopBoostParticles();
        });
    }

    stopBoostParticles() {
        this.boostTimer?.remove();
        this.boostTimer = null;

        this.boostEmitter.stop();
        this.boostEmitter.stopFollow();
    }

    destroy() {
        this.hitEmitter?.destroy();
        this.hitEmitter = null;

        this.explosionEmitter?.destroy();
        this.explosionEmitter = null;

        this.explosionSparksEmitter?.destroy();
        this.explosionSparksEmitter = null;

        this.stopBoostParticles();
        this.boostEmitter.destroy();
        this.boostEmitter = null;
    }
}