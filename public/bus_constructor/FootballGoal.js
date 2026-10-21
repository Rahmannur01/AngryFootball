class FootballGoal {
    constructor(scene, {
        x = 2250,
        y = 800,
        texture = 'FootballGoal',
        scale = 0.25,
        depth = 12
    } = {}) {
        this.scene = scene;

        // Matter places a fromVerts body around the polygon's center of mass.
        // Compensate for it so the collider stays aligned with the source image.
        const textureWidth = 794;
        const textureHeight = 963;
        const colliderCenterX = 463.815976;
        const colliderCenterY = 432.779756;
        const colliderShiftLeft = 40;
        const colliderLiftY = 45;
        this.bodyOffsetX = (
            colliderCenterX - colliderShiftLeft - textureWidth * 0.62
        ) * scale;
        this.bodyOffsetY = (
            colliderCenterY - colliderLiftY - textureHeight / 2
        ) * scale;

        this.sprite = scene.matter.add.image(
            x + this.bodyOffsetX,
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
                        { x: 93.75, y: 15 },
                        { x: 160, y: 13.75 },
                        { x: 432.5, y: 247.5 },
                        { x: 741.25, y: 920 },
                        { x: 695, y: 920 },
                        { x: 406.25, y: 276.25 }
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
            .setDepth(depth)
            .setScale(scale)
            .setAngle(0)
            .setVisible(true)
            .setBlendMode(0)
            .setScrollFactor(1, 1)
            .setOrigin(
                (colliderCenterX - colliderShiftLeft) / textureWidth,
                (colliderCenterY - colliderLiftY) / textureHeight
            )
            .setFlipX(false)
            .setFlipY(false);
    }

    setPosition(x, y) {
        this.sprite.setPosition(
            x + this.bodyOffsetX,
            y + this.bodyOffsetY
        );
        return this;
    }

    destroy() {
        this.sprite.destroy();
    }
}
