// Здоровье физических персонажей и отображение HP.
class HealthSystem {
    constructor(scene, { onDeath = () => { } } = {}) {
        this.scene = scene;
        this.onDeath = onDeath;
        this.targets = new Map();
        this.collisionHandler = this.onCollision.bind(this);
        this.scene.matter.world.on('collisionstart', this.collisionHandler);
    }

    register(entry, maxHp = 2) {
        const body = entry.player.sprite.body;
        if (this.targets.has(body)) return;
        const bar = this.scene.add.graphics().setDepth(20);
        this.targets.set(body, { entry, hp: maxHp, maxHp, bar });
    }

    onCollision(event) {
        event.pairs.forEach(({ bodyA, bodyB }) => {
            const impactSpeed = Math.hypot(
                bodyA.velocity.x - bodyB.velocity.x,
                bodyA.velocity.y - bodyB.velocity.y
            );
            if (impactSpeed <= 0.3) return;
            this.damage(bodyA.parent || bodyA, impactSpeed);
            this.damage(bodyB.parent || bodyB, impactSpeed);
        });
    }

    damage(body, impactSpeed) {
        const data = this.targets.get(body);
        if (!data) return;
        data.hp = Math.max(0, data.hp - impactSpeed * 0.06);
        if (data.hp > 0) return;

        // Удаляем запись до уведомления, чтобы гибель обрабатывалась один раз.
        this.targets.delete(body);
        data.bar.destroy();
        this.onDeath(data.entry);
        data.entry.player.destroy();
    }

    update() {
        this.targets.forEach(({ entry, hp, maxHp, bar }) => {
            const bounds = entry.player.sprite.getBounds();
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
        this.targets.forEach(({ bar }) => bar.destroy());
        this.targets.clear();
    }
}
