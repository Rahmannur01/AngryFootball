class FootballGoal {
    constructor(scene, {
        x = 2250,
        y = 790,
        texture = 'FootballGoal',
        scale = 0.25
    } = {}) {
        this.scene = scene;

        // Matter places a fromVerts body around the polygon's center of mass.
        // Compensate for it so the collider stays aligned with the source image.
        const textureHeight = 963;
        const colliderCenterY = 439.94;
        this.bodyOffsetY = (colliderCenterY - textureHeight / 2) * scale;

        this.sprite = scene.matter.add.image(
            x,
            y + this.bodyOffsetY,
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
                        { x: 145, y: 4 },
                        { x: 166, y: 12 },
                        { x: 428, y: 244 },
                        { x: 544, y: 480 },
                        { x: 735, y: 901 },
                        { x: 681, y: 891 },
                        { x: 416, y: 286 },
                        { x: 397, y: 271 },
                        { x: 159, y: 62 }
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
            .setOrigin(0.62, colliderCenterY / textureHeight)
            .setFlipX(false)
            .setFlipY(false);
    }

    setPosition(x, y) {
        this.sprite.setPosition(x, y + this.bodyOffsetY);
        return this;
    }

    destroy() {
        this.sprite.destroy();
    }
}
