// Ввод и прицел. Физика и выполнение удара остаются в Ball.
class BallInputController {
    static MAX_DRAG = 150;
    constructor(scene, ball, { onRelease = () => { } } = {}) {
        this.input = scene.input;
        this.ball = ball;
        this.onRelease = onRelease;
        this.startPoint = null;
        this.isAiming = false;

        this.aimGraphics = scene.add.graphics();
        this.aimGraphics.setDepth(100);

        this.ballPointerDown = (pointer) => {
            if (!this.ball) return;
            if (this.ball.isMoving || !this.ball.isReady) return;
            if (this.ball.hasBeenShot) return;

            this.startPoint = {
                x: pointer.worldX,
                y: pointer.worldY
            };

            this.isAiming = true;

        };

        this.input.on('pointerdown', this.ballPointerDown);

        this.ballPointerMove = (pointer) => {
            if (!this.startPoint || this.ball.isMoving) return;

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
            if (!this.startPoint || this.ball.isMoving) return;

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

            this.ball.shoot(angle, power);

            this.aimGraphics.clear();
            this.startPoint = null;
            this.isAiming = false;

            this.onRelease();
        };
        this.input.on('pointermove', this.ballPointerMove);
        this.input.on('pointerup', this.ballPointerUp);
    }

    drawAimDots(angle, dragDistance) {
        this.aimGraphics.clear();

        const ball = this.ball.sprite;
        const dotCount = 20;
        const spacing = 20;

        const power = Phaser.Math.Clamp(
            dragDistance / BallInputController.MAX_DRAG,
            0,
            1
        );

        this.aimGraphics.fillStyle(0xffffff, 0.5);
        this.aimGraphics.fillCircle(ball.x, ball.y, 6);

        for (let i = 1; i <= dotCount; i++) {
            if (i > dotCount * power) break;

            const distance = i * spacing;

            const dotX = ball.x + Math.cos(angle) * distance;
            const dotY =
                ball.y +
                Math.sin(angle) * distance +
                0.05 * i * i;

            const t = i / dotCount;

            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(0, 255, 0),
                new Phaser.Display.Color(255, 0, 0),
                1,
                t
            );

            this.aimGraphics.fillStyle(color.color, 0.8);

            const radius = Phaser.Math.Linear(5, 2, t);

            this.aimGraphics.fillCircle(dotX, dotY, radius);
        }
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
