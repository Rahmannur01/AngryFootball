const MATERIAL_PARTICLE_PROFILES = Object.freeze({
    barrel: Object.freeze({
        debrisTints: [0x315f7d, 0x607d8b, 0xa9bdc8],
        dustTint: 0x8196a3,
        impactDebris: 6,
        impactDust: 4,
        destructionDebris: 18,
        destructionDust: 10
    }),
    wood: Object.freeze({
        debrisTints: [0x6f3519, 0xa96832, 0xe0a15b],
        dustTint: 0xc58a4c,
        impactDebris: 8,
        impactDust: 4,
        destructionDebris: 24,
        destructionDust: 12
    }),
    stone: Object.freeze({
        debrisTints: [0x55585c, 0x8d8d8d, 0xc2c2c2],
        dustTint: 0xa8a8a8,
        impactDebris: 6,
        impactDust: 7,
        destructionDebris: 16,
        destructionDust: 22
    })
});

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

        if (!this.scene.textures.exists('particle_shard')) {
            const graphics = this.scene.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(1, 2, 10, 4);
            graphics.generateTexture('particle_shard', 12, 8);
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

        this.impactEmitter = this.scene.add.particles(
            0,
            0,
            'particle_shard',
            {
                speed: { min: 80, max: 220 },
                angle: { min: 0, max: 360 },
                rotate: { min: 0, max: 360 },
                scale: { start: 1, end: 0.15 },
                alpha: { start: 1, end: 0 },
                gravityY: 300,
                lifespan: { min: 300, max: 520 },
                quantity: 5,
                emitting: false
            }
        );

        this.impactEmitter.setDepth(17);

        this.impactDustEmitter = this.scene.add.particles(
            0,
            0,
            'particle_dot',
            {
                speed: { min: 35, max: 100 },
                angle: { min: 180, max: 360 },
                scale: { start: 1.15, end: 2.4 },
                alpha: { start: 0.75, end: 0 },
                gravityY: -30,
                lifespan: { min: 350, max: 600 },
                emitting: false
            }
        );

        this.impactDustEmitter.setDepth(16);

        this.destructionDebrisEmitter = this.scene.add.particles(
            0,
            0,
            'particle_shard',
            {
                speed: { min: 120, max: 340 },
                angle: { min: 0, max: 360 },
                rotate: { min: 0, max: 360 },
                scale: { start: 1.1, end: 0.2 },
                alpha: { start: 1, end: 0 },
                gravityY: 500,
                lifespan: { min: 450, max: 900 },
                emitting: false
            }
        );

        this.destructionDebrisEmitter.setDepth(16);

        this.destructionDustEmitter = this.scene.add.particles(
            0,
            0,
            'particle_dot',
            {
                speed: { min: 50, max: 180 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.2, end: 2.8 },
                alpha: { start: 0.7, end: 0 },
                lifespan: { min: 400, max: 750 },
                emitting: false
            }
        );

        this.destructionDustEmitter.setDepth(15);

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

    explodeTinted(emitter, tints, count, x, y) {
        const palette = Array.isArray(tints) ? tints : [tints];
        const baseCount = Math.floor(count / palette.length);
        const remainder = count % palette.length;

        palette.forEach((tint, index) => {
            const tintCount = baseCount + (index < remainder ? 1 : 0);
            if (tintCount <= 0) return;

            emitter.setParticleTint(tint);
            emitter.explode(tintCount, x, y);
        });
    }

    spawnMaterialImpact(x, y, material, intensity = 0.25) {
        const profile = MATERIAL_PARTICLE_PROFILES[material];
        if (!profile) return;

        const scale = Phaser.Math.Clamp(intensity, 0.25, 1);
        const debrisCount = Math.max(
            2,
            Math.round(profile.impactDebris * (0.6 + scale * 0.6))
        );
        const dustCount = Math.max(
            1,
            Math.round(profile.impactDust * (0.6 + scale * 0.5))
        );

        this.explodeTinted(
            this.impactEmitter,
            profile.debrisTints,
            debrisCount,
            x,
            y
        );
        this.impactDustEmitter.setParticleTint(profile.dustTint);
        this.impactDustEmitter.explode(dustCount, x, y);
    }

    spawnMaterialDestruction(x, y, material) {
        const profile = MATERIAL_PARTICLE_PROFILES[material];
        if (!profile) return;

        this.explodeTinted(
            this.destructionDebrisEmitter,
            profile.debrisTints,
            profile.destructionDebris,
            x,
            y
        );
        this.destructionDustEmitter.setParticleTint(profile.dustTint);
        this.destructionDustEmitter.explode(
            profile.destructionDust,
            x,
            y
        );
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

        this.impactEmitter?.destroy();
        this.impactEmitter = null;

        this.impactDustEmitter?.destroy();
        this.impactDustEmitter = null;

        this.destructionDebrisEmitter?.destroy();
        this.destructionDebrisEmitter = null;

        this.destructionDustEmitter?.destroy();
        this.destructionDustEmitter = null;

        this.explosionEmitter?.destroy();
        this.explosionEmitter = null;

        this.explosionSparksEmitter?.destroy();
        this.explosionSparksEmitter = null;

        this.stopBoostParticles();
        this.boostEmitter.destroy();
        this.boostEmitter = null;
    }
}
