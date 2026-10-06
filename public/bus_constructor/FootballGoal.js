class FootballGoal {
    constructor(scene, {
        x = 2300,
        y = 790,
        texture = 'FootballGoal',
        scale = 0.25
    } = {}) {
        this.scene = scene;

        this.sprite = scene.matter.add.image(
            x,
            y,
            texture,
            null,
            {
                isStatic: true,
                isSensor: false,
                friction: 0.1,
                restitution: 0,
                frictionStatic: 0.5,
                density: 0.001,
                slop: 0.05,
                ignoreGravity: false,
                frictionAir: 0.01,
                sleepThreshold: 60,

                shape: {
                    type: 'fromVerts',
                    verts: [
                        { x: 92.1875, y: 7.8125 },
                        { x: 167.1875, y: 14.0625 },
                        { x: 428.125, y: 246.875 },
                        { x: 550, y: 489.0625 },
                        { x: 751.5625, y: 918.75 },
                        { x: 689.0625, y: 915.625 },
                        { x: 401.5625, y: 275 }
                    ]
                },

                collisionFilter: {
                    group: 0,
                    category: 1,
                    mask: 0xffffffff
                }
            }
        );

        this.sprite
            .setName('FootballGoal')
            .setAlpha(1)
            .setDepth(15)
            .setScale(scale)
            .setAngle(0)
            .setVisible(true)
            .setBlendMode(0)
            .setScrollFactor(1, 1)
            .setOrigin(0.62, 0.5)
            .setFlipX(false)
            .setFlipY(false);
    }

    setPosition(x, y) {
        this.sprite.setPosition(x, y);
        return this;
    }

    destroy() {
        this.sprite.destroy();
    }
}