class Ball {
    constructor(scene, {
        x = 350,
        y = 900,
        texture = 'Ball',
        scale = 0.65,
        maxSpeed = 35,
        stillThreshold = 0.05,
        stillDuration = 300
    } = {}) {
        this.scene = scene;
        this.startPosition = { x, y };

        this.maxSpeed = maxSpeed;
        this.stillThreshold = stillThreshold;
        this.stillDuration = stillDuration;

        this.isMoving = false;
        this.isReady = false;
        this.hasBeenShot = false;
        this.stillTimer = 0;

        this.sprite = scene.matter.add.image(x, y, texture, null, {
            friction: 0.1,
            frictionStatic: 0.5,
            restitution: 0.7,
            density: 0.001,
            frictionAir: 0.01,
            shape: {
                type: 'circle',
                radius: 51
            }
        });

        this.sprite.setName('Ball');
        this.sprite.setScale(scale);
    }

    getSpeed() {
        const { x, y } = this.sprite.body.velocity;

        return Math.hypot(x, y);
    }

    shoot(angle, power = 1) {
        if (!this.isReady || this.hasBeenShot) {
            return false;
        }

        const speed = this.maxSpeed * Phaser.Math.Clamp(power, 0, 1);

        if (speed === 0) {
            return false;
        }

        this.sprite.setAwake();
        this.sprite.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
        this.sprite.setAngularVelocity(speed * 0.01);

        this.hasBeenShot = true;
        this.isReady = false;
        this.isMoving = true;
        this.stillTimer = 0;

        return true;
    }

    reset() {
        this.sprite.setAwake();
        this.sprite.setPosition(
            this.startPosition.x,
            this.startPosition.y
        );
        this.sprite.setVelocity(0, 0);
        this.sprite.setAngularVelocity(0);
        this.sprite.setAngle(0);

        this.hasBeenShot = false;
        this.isReady = false;
        this.isMoving = false;
        this.stillTimer = 0;

        return this;
    }

    update(delta) {
        this.isMoving = this.getSpeed() > this.stillThreshold;

        if (this.isMoving) {
            this.stillTimer = 0;
            this.isReady = false;
            return;
        }

        this.stillTimer += delta;

        if (this.stillTimer < this.stillDuration) {
            return;
        }

        if (this.hasBeenShot) {
            this.reset();
        } else {
            this.isReady = true;
        }
    }

    destroy() {
        this.sprite.destroy();
    }
}