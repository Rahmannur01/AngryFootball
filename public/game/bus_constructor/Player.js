class Player {
    static SHADER_ENABLED = false;

    constructor(scene, {
        x = 0,
        y = 0,
        type = 1,
        scale = 0.2,
        teamColor = 0xffffff,
        depth = 10,
        shaderEnabled = Player.SHADER_ENABLED
    } = {}) {
        this.scene = scene;
        this.type = type;
        this.key = `Player_${type}`;
        this.config = window.PLAYER_RAGDOLL?.players?.[this.key];
        this.common = window.PLAYER_RAGDOLL?.common;

        if (!this.config || !this.common) {
            throw new Error(`Player ragdoll data not found: ${this.key}`);
        }

        const baseScale = this.config.body.scale.x;
        if (!Number.isFinite(baseScale) || baseScale <= 0) {
            throw new Error(`Invalid body scale: ${this.key}`);
        }

        this.scaleMultiplier = scale / baseScale;
        this.collisionGroup = this.common.disableSelfCollision
            ? scene.matter.world.nextGroup(true)
            : 0;
        this.shaderEnabled = false;
        this.shaders = [];
        this.constraints = [];
        this.destroyed = false;

        this.sprite = this.createBody(x, y, depth);
        this.leftArm = this.createArm('leftArm', x, y, depth);
        this.rightArm = this.createArm('rightArm', x, y, depth);
        this.parts = [this.sprite, this.leftArm, this.rightArm];

        this.constraints.push(
            this.createShoulder('leftArm', this.leftArm),
            this.createShoulder('rightArm', this.rightArm)
        );

        this.setTeamColor(teamColor);
        this.setShaderEnabled(shaderEnabled);
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
            .setName(this.key)
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
        const collider = this.common.colliders[side];
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
            .setName(`${this.key}_${side}`)
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
                label: `${this.key}_${side}_shoulder`,
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
        if (shader) {
            shader.setTeamColor(this.teamColor);
            this.shaders.push(shader);
        }
    }

    setShaderEnabled(enabled = true) {
        enabled = Boolean(enabled);
        if (enabled === this.shaderEnabled) return this;

        this.shaderEnabled = enabled;
        this.shaders = [];

        if (enabled) {
            this.parts.forEach(part => this.applyShader(part));
        } else {
            this.parts.forEach(part => part.resetPostPipeline());
        }

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

    setTeamColor(color) {
        this.teamColor = color;
        this.shaders.forEach(shader => shader.setTeamColor(color));
        return this;
    }

    setPosition(x, y) {
        const dx = x - this.sprite.x;
        const dy = y - this.sprite.y;

        this.parts.forEach(part => part.setPosition(part.x + dx, part.y + dy));
        return this;
    }

    setX(x) {
        return this.setPosition(x, this.sprite.y);
    }

    setY(y) {
        return this.setPosition(this.sprite.x, y);
    }

    setScale(x, y = x) {
        if (x !== y) {
            throw new Error('Player ragdoll supports only uniform scaling');
        }

        const nextMultiplier = x / this.config.body.scale.x;
        const ratio = nextMultiplier / this.scaleMultiplier;
        if (!Number.isFinite(ratio) || ratio <= 0) return this;

        const centerX = this.sprite.x;
        const centerY = this.sprite.y;

        [this.leftArm, this.rightArm].forEach(arm => {
            arm.setPosition(
                centerX + (arm.x - centerX) * ratio,
                centerY + (arm.y - centerY) * ratio
            );
        });
        this.parts.forEach(part => {
            part.setScale(part.scaleX * ratio, part.scaleY * ratio);
        });
        this.constraints.forEach(constraint => {
            constraint.length *= ratio;
            constraint.pointA.x *= ratio;
            constraint.pointA.y *= ratio;
            constraint.pointB.x *= ratio;
            constraint.pointB.y *= ratio;
        });
        this.scaleMultiplier = nextMultiplier;

        return this;
    }

    setAngle(angle) {
        const delta = Phaser.Math.DegToRad(angle - this.sprite.angle);
        const centerX = this.sprite.x;
        const centerY = this.sprite.y;

        [this.leftArm, this.rightArm].forEach(arm => {
            const offsetX = arm.x - centerX;
            const offsetY = arm.y - centerY;
            arm.setPosition(
                centerX + offsetX * Math.cos(delta) - offsetY * Math.sin(delta),
                centerY + offsetX * Math.sin(delta) + offsetY * Math.cos(delta)
            );
            arm.setAngle(arm.angle + Phaser.Math.RadToDeg(delta));
        });
        this.sprite.setAngle(angle);

        return this;
    }

    setFlipX(value = true) {
        this.parts.forEach(part => part.setFlipX(value));
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
    }
}
