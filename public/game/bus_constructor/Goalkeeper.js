class Goalkeeper {
    constructor(scene, {
        x,
        y,
        scale = 0.15,
        teamColor = 0xffffff,
        depth = 9
    } = {}) {
        this.scene = scene;
        this.config = window.PLAYER_RAGDOLL?.goalkeeper;
        this.common = window.PLAYER_RAGDOLL?.common;

        if (!this.config || !this.common) {
            throw new Error('Goalkeeper ragdoll configuration is missing');
        }

        const baseScale = this.config.body.scale.x;
        if (!Number.isFinite(baseScale) || baseScale <= 0) {
            throw new Error('Invalid goalkeeper body scale');
        }

        this.scaleMultiplier = scale / baseScale;
        this.collisionGroup = this.common.disableSelfCollision
            ? scene.matter.world.nextGroup(true)
            : 0;
        this.teamColor = teamColor;
        this.constraints = [];
        this.shaders = [];
        this.destroyed = false;

        this.sprite = this.createBody(x, y, depth);
        this.leftArm = this.createArm('leftArm', x, y, depth);
        this.rightArm = this.createArm('rightArm', x, y, depth);
        this.parts = [this.sprite, this.leftArm, this.rightArm];

        this.constraints.push(
            this.createShoulder('leftArm', this.leftArm),
            this.createShoulder('rightArm', this.rightArm)
        );

        this.parts.forEach(part => this.applyShader(part));
        this.shader = this.shaders[0] || null;
        this.setTeamColor(teamColor);
    }

    createPhysicsConfig(shape) {
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
            shape,
            collisionFilter: {
                group: this.collisionGroup,
                category: 1,
                mask: 0xffffffff
            }
        };
    }

    createBody(x, y, depth) {
        const bodyConfig = this.config.body;
        const sprite = this.scene.matter.add.image(
            x,
            y,
            bodyConfig.textureKey,
            null,
            this.createPhysicsConfig({
                type: 'fromVerts',
                verts: bodyConfig.vertices
            })
        );

        sprite
            .setName('Goalkeeper')
            .setOrigin(this.common.origin.x, this.common.origin.y)
            .setScale(
                bodyConfig.scale.x * this.scaleMultiplier,
                bodyConfig.scale.y * this.scaleMultiplier
            )
            .setDepth(depth)
            .setCollisionGroup(this.collisionGroup);

        return sprite;
    }

    createArm(side, bodyX, bodyY, depth) {
        const armConfig = this.config[side];
        const collider = armConfig.collider;
        const offset = this.scalePoint(armConfig.centerOffset);
        const sprite = this.scene.matter.add.image(
            bodyX + offset.x,
            bodyY + offset.y,
            armConfig.textureKey,
            null,
            this.createPhysicsConfig({
                type: collider.type,
                width: collider.width,
                height: collider.height
            })
        );

        sprite
            .setName(`Goalkeeper_${side}`)
            .setOrigin(this.common.origin.x, this.common.origin.y)
            .setScale(
                armConfig.scale.x * this.scaleMultiplier,
                armConfig.scale.y * this.scaleMultiplier
            )
            .setAngle(armConfig.angle)
            .setDepth(depth + armConfig.depthOffset)
            .setCollisionGroup(this.collisionGroup);

        sprite.body.dealsImpactDamage = false;

        return sprite;
    }

    createShoulder(side, arm) {
        const armConfig = this.config[side];
        const joint = this.common.joint;

        return this.scene.matter.add.constraint(
            this.sprite.body,
            arm.body,
            joint.length * this.scaleMultiplier,
            joint.stiffness,
            {
                label: `Goalkeeper_${side}_shoulder`,
                pointA: this.scalePoint(armConfig.bodyAnchor),
                pointB: this.scalePoint(armConfig.armAnchor),
                damping: joint.damping
            }
        );
    }

    scalePoint(point) {
        return {
            x: point.x * this.scaleMultiplier,
            y: point.y * this.scaleMultiplier
        };
    }

    applyShader(part) {
        part.setPostPipeline('UniformPipeline');
        const shader = part.getPostPipeline('UniformPipeline');
        if (shader) this.shaders.push(shader);
    }

    setTeamColor(color) {
        this.teamColor = color;
        this.shaders.forEach(shader => shader.setTeamColor(color));
        return this;
    }

    getSprites() {
        return [...this.parts];
    }

    getBodies() {
        return this.parts
            .map(part => part?.body)
            .filter(Boolean);
    }

    getBounds() {
        const bounds = this.parts
            .filter(part => part?.scene)
            .map(part => part.getBounds());

        if (bounds.length === 0) {
            return new Phaser.Geom.Rectangle();
        }

        const left = Math.min(...bounds.map(rect => rect.left));
        const top = Math.min(...bounds.map(rect => rect.top));
        const right = Math.max(...bounds.map(rect => rect.right));
        const bottom = Math.max(...bounds.map(rect => rect.bottom));

        return new Phaser.Geom.Rectangle(left, top, right - left, bottom - top);
    }

    setPosition(x, y) {
        const dx = x - this.sprite.x;
        const dy = y - this.sprite.y;

        this.parts.forEach(part => part.setPosition(part.x + dx, part.y + dy));
        return this;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;

        this.constraints.forEach(constraint => {
            this.scene.matter.world.removeConstraint(constraint);
        });
        this.constraints = [];
        this.parts.forEach(part => part?.destroy());
        this.parts = [];
        this.shaders = [];
        this.shader = null;
    }
}
