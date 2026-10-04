class Goalkeeper {
    constructor(scene, {
        x,
        y,
        texture = 'Goalkeeper',
        vertexes = null,
        scale = 0.2,
        teamColor = 0xffffff,
        depth = 10
    }) {
        this.scene = scene;

        const physics = {
            isStatic: false,
            friction: 0.1,
            restitution: 0,
            frictionStatic: 0.5,
            density: 0.001,
            isSensor: false,
            slop: 0.05,
            ignoreGravity: false,
            frictionAir: 0.01,
            sleepThreshold: 60,

            collisionFilter: {
                group: 0,
                category: 1,
                mask: 0xffffffff
            }
        };

        if (vertexes?.length) {
            physics.shape = {
                type: 'fromVerts',
                verts: vertexes
            };
        }

        this.sprite = scene.matter.add.image(
            x,
            y,
            texture,
            null,
            physics
        );

        this.sprite
            .setName('Goalkeeper')
            .setScale(scale)
            .setDepth(depth)
            .setOrigin(0.5, 0.5)
            .setPostPipeline('UniformPipeline');

        this.shader = this.sprite.getPostPipeline('UniformPipeline');

        this.setTeamColor(teamColor);
    }

    setTeamColor(color) {
        this.teamColor = color;
        this.shader?.setTeamColor(color);
        return this;
    }

    setPosition(x, y) {
        this.sprite.setPosition(x, y);
        return this;
    }

    destroy() {
        this.sprite.destroy();
    }
}