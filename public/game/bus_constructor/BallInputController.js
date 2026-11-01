// Ввод и прицел. Физика и выполнение удара остаются в Ball.
class BallInputController {
    static MAX_DRAG = 210;
    static AIM_DOT_COUNT = 12;
    static AIM_DOT_SPACING = 22;

    constructor(scene, ball, {
        onRelease = () => { },
        onShot = () => { },
        onAbilityAction = () => { }
    } = {}) {
        this.input = scene.input;
        this.ball = ball;
        this.onRelease = onRelease;
        this.startPoint = null;
        this.isAiming = false;

        this.onShot = onShot;
        this.onAbilityAction = onAbilityAction;
        this.isGameFinished = false;

        this.aimGraphics = scene.add.graphics();
        this.aimGraphics.setDepth(100);

        this.ballPointerDown = (pointer) => {
            if (!this.ball) return;

            if (this.ball.hasBeenShot && !this.isAbilityUsed){
                this.onAbilityAction();
                return;
            }
            if(this.isGameFinished) return;

            if(this.ball.isMoving || !this.ball.isReady){
                return;
            }

            this.startPoint = {
                x: pointer.worldX,
                y: pointer.worldY
            };

            this.isAiming = true;

        };

        this.input.on('pointerdown', this.ballPointerDown);

        this.ballPointerMove = (pointer) => {
            if (!this.startPoint || this.ball.isMoving || this.isGameFinished) return;

            const angle = Phaser.Math.Angle.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            const dragDistance = Phaser.Math.Distance.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            this.drawAimDots(angle, dragDistance);
        };

        this.ballPointerUp = (pointer) => {
            if (!this.startPoint || this.ball.isMoving || this.isGameFinished) return;

            const dragDistance = Phaser.Math.Distance.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            const angle = Phaser.Math.Angle.Between(
                pointer.worldX,
                pointer.worldY,
                this.startPoint.x,
                this.startPoint.y
            );

            const power = Phaser.Math.Clamp(
                dragDistance / BallInputController.MAX_DRAG,
                0,
                1
            );

            if(this.ball.shoot(angle, power)){
                this.onShot();
            }

            this.clearAim();
            this.startPoint = null;
            this.isAiming = false;

            this.onRelease();
        };
        this.input.on('pointermove', this.ballPointerMove);
        this.input.on('pointerup', this.ballPointerUp);
    }

    drawAimDots(angle, dragDistance) {
        this.clearAim();

        const ball = this.ball.sprite;
        const visualScale = this.getAimVisualScale();
        const power = Phaser.Math.Clamp(
            dragDistance / BallInputController.MAX_DRAG,
            0,
            1
        );
        const ballRadius = Math.max(
            ball.displayWidth,
            ball.displayHeight
        ) * 0.5;

        this.drawPowerRing(
            ball.x,
            ball.y,
            ballRadius + 12 * visualScale,
            power,
            visualScale
        );

        const visibleDotCount = Math.ceil(
            BallInputController.AIM_DOT_COUNT * power
        );
        for (let i = 1; i <= visibleDotCount; i++) {
            const distance =
                ballRadius +
                16 +
                (i - 1) * BallInputController.AIM_DOT_SPACING;

            const dotX = ball.x + Math.cos(angle) * distance;
            const dotY =
                ball.y +
                Math.sin(angle) * distance +
                0.05 * i * i;
            const progress = i / BallInputController.AIM_DOT_COUNT;
            const alpha = Phaser.Math.Linear(0.95, 0.35, progress);
            const radius = Phaser.Math.Linear(5, 2.75, progress) * visualScale;
            const outlineWidth = 1.75 * visualScale;

            this.aimGraphics.fillStyle(0x000000, alpha * 0.48);
            this.aimGraphics.fillCircle(dotX, dotY, radius + outlineWidth);

            this.aimGraphics.fillStyle(0xffffff, alpha);
            this.aimGraphics.fillCircle(dotX, dotY, radius);
        }
    }

    getAimVisualScale() {
        const cameraZoom = this.ball?.scene?.cameras?.main?.zoom || 1;
        return Phaser.Math.Clamp(1 / cameraZoom, 1, 3);
    }

    drawPowerRing(x, y, radius, power, visualScale = 1) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * power;

        this.aimGraphics.lineStyle(4 * visualScale, 0x000000, 0.45);
        this.aimGraphics.strokeCircle(x, y, radius);
        this.aimGraphics.lineStyle(2 * visualScale, 0xffffff, 0.35);
        this.aimGraphics.strokeCircle(x, y, radius);

        if (power <= 0) return;

        this.aimGraphics.lineStyle(4 * visualScale, 0xffffff, 0.9);
        this.aimGraphics.beginPath();
        this.aimGraphics.arc(x, y, radius, startAngle, endAngle);
        this.aimGraphics.strokePath();
    }

    clearAim() {
        this.aimGraphics?.clear();
    }

    setGameFinished(isFinished){
        this.isGameFinished = isFinished;
    }

    destroy() {
        this.input.off('pointerdown', this.ballPointerDown);
        this.input.off('pointermove', this.ballPointerMove);
        this.input.off('pointerup', this.ballPointerUp);
        this.startPoint = null;
        this.isAiming = false;
        this.aimGraphics?.destroy();
        this.aimGraphics = null;
    }
}
