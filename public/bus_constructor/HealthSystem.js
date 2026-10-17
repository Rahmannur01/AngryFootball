const DESTRUCTIBLE_PROFILES = Object.freeze({
    destructible_barrel: Object.freeze({
        material: 'barrel',
        maxHp: 1.7
    }),
    destructible_wood: Object.freeze({
        material: 'wood',
        maxHp: 2.5
    }),
    destructible_stone: Object.freeze({
        material: 'stone',
        maxHp: 3.5
    })
});

// Здоровье всех физических целей и отображение HP персонажей.
class HealthSystem {
    static MIN_IMPACT_SPEED = 0.3;
    static DAMAGE_PER_SPEED = 0.06;

    constructor(scene, {
        onDeath = () => { },
        onDamage = () => { },
        onDestructibleDestroyed = ({ object }) => object.destroy()
    } = {}) {
        this.scene = scene;
        this.onDeath = onDeath;
        this.onDamage = onDamage;
        this.onDestructibleDestroyed = onDestructibleDestroyed;
        this.targets = new Map();
        this.collisionHandler = this.onCollision.bind(this);
        this.scene.matter.world.on('collisionstart', this.collisionHandler);
    }

    getRootBody(body) {
        return body?.parent || body;
    }

    registerCharacter(entry, maxHp = 2) {
        const bodies = entry.player.getBodies?.() || [entry.player.sprite.body];

        return this.registerTarget({
            bodies,
            kind: 'character',
            entry,
            maxHp,
            showHealthBar: true
        });
    }

    registerDestructibles(objects) {
        let registeredCount = 0;

        Object.entries(objects || {}).forEach(([name, object]) => {
            const profile = DESTRUCTIBLE_PROFILES[object?.tag];
            if (!profile || !object.body) return;

            const registered = this.registerTarget({
                body: object.body,
                kind: 'destructible',
                name,
                object,
                profile,
                maxHp: profile.maxHp,
                showHealthBar: false
            });

            if (registered) registeredCount += 1;
        });

        return registeredCount;
    }

    registerTarget({
        body = null,
        bodies = null,
        kind,
        entry = null,
        name = null,
        object = null,
        profile = null,
        maxHp,
        showHealthBar = false
    }) {
        const rootBodies = [...new Set((bodies || [body])
            .map(item => this.getRootBody(item))
            .filter(Boolean))];
        if (rootBodies.length === 0 ||
            rootBodies.some(item => this.targets.has(item)) ||
            maxHp <= 0) {
            return false;
        }

        const bar = showHealthBar
            ? this.scene.add.graphics().setDepth(20)
            : null;

        const target = {
            kind,
            entry,
            name,
            object,
            profile,
            hp: maxHp,
            maxHp,
            bar,
            bodies: new Set(rootBodies)
        };

        rootBodies.forEach(rootBody => this.targets.set(rootBody, target));

        return true;
    }

    unregisterTarget(target) {
        target.bodies.forEach(body => this.targets.delete(body));
        target.bar?.destroy();
    }

    onCollision(event) {
        const processedPairs = new Set();
        const strongestImpacts = new Map();

        event.pairs.forEach(({ bodyA, bodyB, collision }) => {
            const rootBodyA = this.getRootBody(bodyA);
            const rootBodyB = this.getRootBody(bodyB);
            if (!rootBodyA || !rootBodyB || rootBodyA === rootBodyB) return;

            // Составные Matter-тела могут создать несколько пар для одного удара.
            const pairKey = rootBodyA.id < rootBodyB.id
                ? `${rootBodyA.id}:${rootBodyB.id}`
                : `${rootBodyB.id}:${rootBodyA.id}`;
            if (processedPairs.has(pairKey)) return;
            processedPairs.add(pairKey);

            const impactSpeed = Math.hypot(
                rootBodyA.velocity.x - rootBodyB.velocity.x,
                rootBodyA.velocity.y - rootBodyB.velocity.y
            );
            if (impactSpeed <= HealthSystem.MIN_IMPACT_SPEED) return;

            const impactPoint = collision?.supports?.[0] || null;
            [rootBodyA, rootBodyB].forEach(body => {
                const target = this.targets.get(body);
                const previous = strongestImpacts.get(target);
                if (!target || previous?.impactSpeed >= impactSpeed) return;

                strongestImpacts.set(target, { body, impactSpeed, impactPoint });
            });
        });

        strongestImpacts.forEach(({ body, impactSpeed, impactPoint }) => {
            this.applyImpactDamage(body, impactSpeed, impactPoint);
        });
    }

    applyImpactDamage(body, impactSpeed, impactPoint = null) {
        return this.applyDamage(
            body,
            impactSpeed * HealthSystem.DAMAGE_PER_SPEED,
            impactPoint
        );
    }

    applyDamage(body, amount, impactPoint = null) {
        const rootBody = this.getRootBody(body);
        const target = this.targets.get(rootBody);
        if (!target || !Number.isFinite(amount) || amount <= 0) return false;

        target.hp = Math.max(0, target.hp - amount);
        if (target.hp > 0) {
            this.onDamage(target, amount, impactPoint);
            return true;
        }

        // Удаляем все части цели до callback, чтобы она уничтожилась один раз.
        this.unregisterTarget(target);

        if (target.kind === 'character') {
            this.onDeath(target.entry);
            target.entry.player.destroy();
        } else {
            this.onDestructibleDestroyed(target);
        }

        return true;
    }

    update() {
        new Set(this.targets.values()).forEach(({ entry, hp, maxHp, bar }) => {
            if (!bar || !entry) return;

            const bounds = entry.player.getBounds?.() ||
                entry.player.sprite.getBounds();
            const width = 40;
            const height = 6;
            const x = bounds.centerX - width / 2;
            const y = bounds.top - 15;
            const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
            const color = ratio > 0.5 ? 0x00ff00 : 0xffaa00;

            bar.clear();
            bar.fillStyle(0x000000, 0.6);
            bar.fillRect(x, y, width, height);
            bar.fillStyle(color, 1);
            bar.fillRect(x, y, width * ratio, height);
        });
    }

    destroy() {
        this.scene.matter.world.off('collisionstart', this.collisionHandler);
        new Set(this.targets.values()).forEach(({ bar }) => bar?.destroy());
        this.targets.clear();
    }
}
