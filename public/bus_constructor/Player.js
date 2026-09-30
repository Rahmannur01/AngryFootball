class Player {

    constructor(scene, {
        x = 0,
        y = 0,
        type = 1,
        scale = 0.8,
        teamColor = 0xffffff,
        depth = 0
    }) {
        this.scene = scene;

        this.type = type;

        this.texture = `Player_${type}`;

        const physics = this.createPhysicsConfig(type);
        this.sprite = scene.matter.add.image(
            x,
            y,
            this.texture,
            null,
            physics
        );
        this.sprite.setName(
            `Player_${type}`
        );
        this.sprite.setScale(scale);
        this.sprite.setDepth(depth);
        this.sprite.setOrigin(
            0.5,
            0.5
        );
        this.sprite.setPostPipeline(
            'UniformPipeline'
        );
        this.shader =
            this.sprite.getPostPipeline(
                'UniformPipeline'
            );
        this.setTeamColor(
            teamColor
        );
    }

    createPhysicsConfig(type) {
        const key = `Player_${type}`;
        const playerData = window.PLAYER_TYPES?.[key];
        if (!playerData) {
            console.error(
                `Не найдены данные для ${key}`
            );
            throw new Error(
                `Player data not found: ${key}`
            );
        }
        const verts = playerData.vertexes;

        if (!verts || verts.length === 0) {
            console.error(
                `Не найдены vertices для ${key}`
            );

            throw new Error(
                `Player vertices not found: ${key}`
            );
        }
        return {
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
            shape: {
                type: 'fromVerts',

                verts: verts
            },

            collisionFilter: {
                group: 0,
                category: 1,
                mask: 4294967295
            }
        };
    }
    setTeamColor(color) {
        this.teamColor = color;
        if (this.shader) {
            this.shader.setTeamColor(
                color
            );
        }
        return this;
    }
    setPosition(x, y) {

        this.sprite.setPosition(
            x,
            y
        );

        return this;
    }
    setX(x) {

        this.sprite.setX(x);

        return this;
    }
    setY(y) {

        this.sprite.setY(y);

        return this;
    }
    setScale(x, y = x) {

        this.sprite.setScale(
            x,
            y
        );

        return this;
    }
    setAngle(angle) {

        this.sprite.setAngle(
            angle
        );

        return this;
    }
    setFlipX(value = true) {

        this.sprite.setFlipX(value);

        return this;
    }
    destroy() {

        this.sprite.destroy();

    }
}