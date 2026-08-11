// [scene:scene_JGRZhYTj]
class scene_JGRZhYTj extends Phaser.Scene {
    constructor() {
        super({ key: 'scene_JGRZhYTj' });
        this.speed = 40;
        this.startPoint = null;
        this.aimGraphics = null;

        this.isMoving = false;
    }


    init() {
        // [start-init]

        // [end-init]
    }

    preload() {
        // [start-preload]
        this.load.image('Ball', './assets/SoccerBall.png');
        this.load.image('BusBottom', './assets/platformIndustrial_031.png');
        this.load.image('Wheel', './assets/platformIndustrial_067.png');
        this.load.image('Obstacle_1', './assets/platformIndustrial_106.png');
        this.load.image('Obstacle_2', './assets/platformIndustrial_047.png');
        this.load.image('Enemy_1', './assets/38.png');
        this.load.image('Enemy_2', './assets/36.png');
        this.load.image('Background', './assets/Background.png');
        this.load.image('Goal', './assets/FootballGoal.png');
        // [end-preload]
    }

    create() {
        // [start-create]

        this.screenWidth = 2000;
        this.screenHeight = 1080;

        this.ballStartPos = { x: 300, y: 500 };
        this.ballIsPushed = false;
        this.Ball = this.matter.add.image(this.ballStartPos.x, this.ballStartPos.y, 'Ball', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0.7,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "circle",
                "width": 32,
                "height": 32,
                "radius": 51,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Ball.setName('Ball');
        this.Ball.setAlpha(1);
        this.Ball.setDepth(0);
        this.Ball.setScale(0.65, 0.65);
        this.Ball.setAngle(0);
        this.Ball.setVisible(true);
        this.Ball.setBlendMode(0);
        this.Ball.setScrollFactor(1, 1);
        this.Ball.setInteractive();
        this.Ball.setOrigin(0.5, 0.5);
        this.Ball.setFlipX(false);
        this.Ball.setFlipY(false);

        const Bodies = Phaser.Physics.Matter.Matter.Bodies;
        const Body = Phaser.Physics.Matter.Matter.Body;

        const busCenterX = 1248;
        const busCenterY = 890;

        this.busInitialX = busCenterX;
        this.busInitialY = busCenterY;

        // офсеты BusBottom спрайтов относительно центра автобуса (BusBottom_3)
        this.busBottomOffsets = [
            { x: 962, y: 890 },  // BusBottom_1
            { x: 1104, y: 890 },  // BusBottom_2
            { x: 1248, y: 890 },  // BusBottom_3 (центр)
            { x: 1390, y: 890 },  // BusBottom_4
            { x: 1534, y: 890 },  // BusBottom_5
        ];

        const busParts = [
            Bodies.rectangle(busCenterX - 286, busCenterY, 140, 75, { label: 'BusBottom_1' }),
            Bodies.rectangle(busCenterX - 144, busCenterY, 140, 75, { label: 'BusBottom_2' }),
            Bodies.rectangle(busCenterX, busCenterY, 140, 75, { label: 'BusBottom_3' }),
            Bodies.rectangle(busCenterX + 142, busCenterY, 140, 75, { label: 'BusBottom_4' }),
            Bodies.rectangle(busCenterX + 286, busCenterY, 140, 75, { label: 'BusBottom_5' }),
        ];

        const busBody = Body.create({
            parts: busParts,
            isStatic: true
        });

        Body.setPosition(busBody, { x: busCenterX, y: busCenterY });

        this.Bus = this.matter.add.gameObject(
            this.add.image(busCenterX, busCenterY, 'BusBottom').setVisible(false),
            busBody
        );
        this.Bus.setName('Bus');

        this.busBottomSprites = [
            this.add.image(962, 890, 'BusBottom').setScale(2, 1),
            this.add.image(1104, 890, 'BusBottom').setScale(2, 1),
            this.add.image(1248, 890, 'BusBottom').setScale(2, 1),
            this.add.image(1390, 890, 'BusBottom').setScale(2, 1),
            this.add.image(1534, 890, 'BusBottom').setScale(2, 1),
        ];

        this.wheelOffsets = [
            { x: 1391, y: 930 },  // Wheel_1
            { x: 1103, y: 930 },  // Wheel_2
        ];

        this.wheelSprites = [
            this.add.image(busCenterX + 143, busCenterY + 40, 'Wheel'),
            this.add.image(busCenterX - 145, busCenterY + 40, 'Wheel'),
        ];

        this.Obstacle_1 = this.matter.add.image(961, 745, 'Obstacle_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_1.setName('Obstacle_1');
        this.Obstacle_1.setAlpha(1);
        this.Obstacle_1.setDepth(0);
        this.Obstacle_1.setScale(1, 1);
        this.Obstacle_1.setAngle(0);
        this.Obstacle_1.setVisible(true);
        this.Obstacle_1.setBlendMode(0);
        this.Obstacle_1.setScrollFactor(1, 1);
        this.Obstacle_1.setInteractive();
        this.Obstacle_1.setOrigin(0.5, 0.5);
        this.Obstacle_1.setFlipX(false);
        this.Obstacle_1.setFlipY(false);

        this.Obstacle_2 = this.matter.add.image(961, 816, 'Obstacle_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_2.setName('Obstacle_2');
        this.Obstacle_2.setAlpha(1);
        this.Obstacle_2.setDepth(0);
        this.Obstacle_2.setScale(1, 1);
        this.Obstacle_2.setAngle(0);
        this.Obstacle_2.setVisible(true);
        this.Obstacle_2.setBlendMode(0);
        this.Obstacle_2.setScrollFactor(1, 1);
        this.Obstacle_2.setInteractive();
        this.Obstacle_2.setOrigin(0.5, 0.5);
        this.Obstacle_2.setFlipX(false);
        this.Obstacle_2.setFlipY(false);

        this.Obstacle_3 = this.matter.add.image(964, 673, 'Obstacle_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_3.setName('Obstacle_3');
        this.Obstacle_3.setAlpha(1);
        this.Obstacle_3.setDepth(0);
        this.Obstacle_3.setScale(1, 1);
        this.Obstacle_3.setAngle(0);
        this.Obstacle_3.setVisible(true);
        this.Obstacle_3.setBlendMode(0);
        this.Obstacle_3.setScrollFactor(1, 1);
        this.Obstacle_3.setInteractive();
        this.Obstacle_3.setOrigin(0.5, 0.5);
        this.Obstacle_3.setFlipX(false);
        this.Obstacle_3.setFlipY(false);

        this.Obstacle_4 = this.matter.add.image(1248, 745, 'Obstacle_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_4.setName('Obstacle_4');
        this.Obstacle_4.setAlpha(1);
        this.Obstacle_4.setDepth(0);
        this.Obstacle_4.setScale(1, 1);
        this.Obstacle_4.setAngle(0);
        this.Obstacle_4.setVisible(true);
        this.Obstacle_4.setBlendMode(0);
        this.Obstacle_4.setScrollFactor(1, 1);
        this.Obstacle_4.setInteractive();
        this.Obstacle_4.setOrigin(0.5, 0.5);
        this.Obstacle_4.setFlipX(false);
        this.Obstacle_4.setFlipY(false);

        this.Obstacle_5 = this.matter.add.image(1248, 814, 'Obstacle_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_5.setName('Obstacle_5');
        this.Obstacle_5.setAlpha(1);
        this.Obstacle_5.setDepth(0);
        this.Obstacle_5.setScale(1, 1);
        this.Obstacle_5.setAngle(0);
        this.Obstacle_5.setVisible(true);
        this.Obstacle_5.setBlendMode(0);
        this.Obstacle_5.setScrollFactor(1, 1);
        this.Obstacle_5.setInteractive();
        this.Obstacle_5.setOrigin(0.5, 0.5);
        this.Obstacle_5.setFlipX(false);
        this.Obstacle_5.setFlipY(false);

        this.Obstacle_6 = this.matter.add.image(1248, 675, 'Obstacle_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_6.setName('Obstacle_6');
        this.Obstacle_6.setAlpha(1);
        this.Obstacle_6.setDepth(0);
        this.Obstacle_6.setScale(1, 1);
        this.Obstacle_6.setAngle(0);
        this.Obstacle_6.setVisible(true);
        this.Obstacle_6.setBlendMode(0);
        this.Obstacle_6.setScrollFactor(1, 1);
        this.Obstacle_6.setInteractive();
        this.Obstacle_6.setOrigin(0.5, 0.5);
        this.Obstacle_6.setFlipX(false);
        this.Obstacle_6.setFlipY(false);

        this.Obstacle_7 = this.matter.add.image(1534, 817, 'Obstacle_2', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 65,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Obstacle_7.setName('Obstacle_7');
        this.Obstacle_7.setAlpha(1);
        this.Obstacle_7.setDepth(0);
        this.Obstacle_7.setScale(1, 1);
        this.Obstacle_7.setAngle(0);
        this.Obstacle_7.setVisible(true);
        this.Obstacle_7.setBlendMode(0);
        this.Obstacle_7.setScrollFactor(1, 1);
        this.Obstacle_7.setInteractive();
        this.Obstacle_7.setOrigin(0.5, 0.5);
        this.Obstacle_7.setFlipX(false);
        this.Obstacle_7.setFlipY(false);


        this.Enemy = this.matter.add.image(1393, 788, 'Enemy_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 67,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Enemy.setName('Enemy');
        this.Enemy.setAlpha(1);
        this.Enemy.setDepth(0);
        this.Enemy.setScale(2, 2);
        this.Enemy.setAngle(0);
        this.Enemy.setVisible(true);
        this.Enemy.setBlendMode(0);
        this.Enemy.setScrollFactor(1, 1);
        this.Enemy.setInteractive();
        this.Enemy.setOrigin(0.6, 0.55);
        this.Enemy.setFlipX(true);
        this.Enemy.setFlipY(false);

        this.Enemy_2 = this.matter.add.image(1106, 788, 'Enemy_1', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 50,
                "height": 67,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Enemy_2.setName('Enemy_2');
        this.Enemy_2.setAlpha(1);
        this.Enemy_2.setDepth(0);
        this.Enemy_2.setScale(2, 2);
        this.Enemy_2.setAngle(0);
        this.Enemy_2.setVisible(true);
        this.Enemy_2.setBlendMode(0);
        this.Enemy_2.setScrollFactor(1, 1);
        this.Enemy_2.setInteractive();
        this.Enemy_2.setOrigin(0.6, 0.55);
        this.Enemy_2.setFlipX(true);
        this.Enemy_2.setFlipY(false);

        this.Enemy_3 = this.matter.add.image(1532, 719, 'Enemy_2', null, {
            "isStatic": false,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 35,
                "height": 60,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.Enemy_3.setName('Enemy_3');
        this.Enemy_3.setAlpha(1);
        this.Enemy_3.setDepth(0);
        this.Enemy_3.setScale(2, 2);
        this.Enemy_3.setAngle(0);
        this.Enemy_3.setVisible(true);
        this.Enemy_3.setBlendMode(0);
        this.Enemy_3.setScrollFactor(1, 1);
        this.Enemy_3.setInteractive();
        this.Enemy_3.setOrigin(0.5, 0.53);
        this.Enemy_3.setFlipX(false);
        this.Enemy_3.setFlipY(false);

        this.Background = this.add.image(1000, 530, 'Background');
        this.Background.setName('Background');
        this.Background.setAlpha(1);
        this.Background.setDepth(-1);
        this.Background.setScale(1.2, 1.5);
        this.Background.setAngle(0);
        this.Background.setVisible(true);
        this.Background.setBlendMode(0);
        this.Background.setScrollFactor(1, 1);
        this.Background.setInteractive();
        this.Background.setOrigin(0.5, 0.5);
        this.Background.setFlipX(false);
        this.Background.setFlipY(false);

        this.BottomObstacle = this.matter.add.image(1000, 1020, 'default', null, {
            "isStatic": true,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 32,
                "height": 32,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.BottomObstacle.setName('BottomObstacle');
        this.BottomObstacle.setAlpha(1);
        this.BottomObstacle.setDepth(0);
        this.BottomObstacle.setScale(65, 3.5);
        this.BottomObstacle.setAngle(0);
        this.BottomObstacle.setVisible(false);
        this.BottomObstacle.setBlendMode(0);
        this.BottomObstacle.setScrollFactor(1, 1);
        this.BottomObstacle.setInteractive();
        this.BottomObstacle.setOrigin(0.5, 0.5);
        this.BottomObstacle.setFlipX(false);
        this.BottomObstacle.setFlipY(false);

        this.FootballGoal = this.matter.add.image(1930, 806, 'Goal', null, {
            "isStatic": true,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": false,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 100,
                "height": 900,
                "radius": 16,
                "sides": 5,
                "slope": 0.5,
                "verts": []
            },
            "collisionFilter": {
                "group": 0,
                "category": 1,
                "mask": 4294967295
            }
        });
        this.FootballGoal.setName('FootballGoal');
        this.FootballGoal.setAlpha(1);
        this.FootballGoal.setDepth(0);
        this.FootballGoal.setScale(0.3, 0.3);
        this.FootballGoal.setAngle(0);
        this.FootballGoal.setVisible(true);
        this.FootballGoal.setBlendMode(0);
        this.FootballGoal.setScrollFactor(1, 1);
        this.FootballGoal.setInteractive();
        this.FootballGoal.setOrigin(0.37, 0.5);
        this.FootballGoal.setFlipX(true);
        this.FootballGoal.setFlipY(false);
        this.matter.world.setBounds();

        this.matter.world.setBounds();

        // графика для отображения прицела (точек направления)
        this.aimGraphics = this.add.graphics();
        this.aimGraphics.setDepth(10);

        this.input.on("pointerdown", (pointer) => {
            if (this.isMoving) return;

            this.startPoint = { x: pointer.x, y: pointer.y };
        });
        this.input.on("pointermove", (pointer) => {
            if (!this.startPoint || this.isMoving) return;

            const angle = Phaser.Math.Angle.Between(
                pointer.x, pointer.y,
                this.startPoint.x, this.startPoint.y
            );

            const dragDistance = Phaser.Math.Distance.Between(
                pointer.x, pointer.y,
                this.startPoint.x, this.startPoint.y
            );

            this.drawAimDots(angle, dragDistance);
        });
        this.input.on("pointerup", (pointer) => {
            if (!this.startPoint || this.isMoving) return;

            // Вычисляем расстояние перетаскивания
            const dragDistance = Phaser.Math.Distance.Between(
                pointer.x, pointer.y,
                this.startPoint.x, this.startPoint.y
            );

            const angle = Phaser.Math.Angle.Between(
                pointer.x, pointer.y,
                this.startPoint.x, this.startPoint.y
            );

            // Динамическая скорость (чем больше перетаскивание, тем сильнее удар)
            const maxDrag = 300; // Максимальное расстояние для полной силы
            const power = Phaser.Math.Clamp(dragDistance / maxDrag, 0, 1); // 0-1
            const finalSpeed = this.speed * power; // Динамическая скорость!

            this.Ball.setVelocity(
                Math.cos(angle) * finalSpeed,
                Math.sin(angle) * finalSpeed
            );
            const spinPower = finalSpeed * 0.01; // коэффициент
            this.Ball.setAngularVelocity(spinPower);

            this.aimGraphics.clear();
            this.startPoint = null;

            this.ballIsPushed = true;
        });

        this.setupBusMovement(busCenterX, 1534, 0.5);
        this.attachRidersToBus();
        this.setupRiderHealth();
        this.setupCollisionDetach();
        this.setupParticles();

        this.setupFullscreenButton();

        // [end-create]
    }

    update(time, delta) {
        // [start-update]

        const vx = this.Ball.body.velocity.x;
        const vy = this.Ball.body.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);

        this.isMoving = speed > 0.05;

        if (this.isMoving === false && this.ballIsPushed === true) {
            this.Ball.setPosition(this.ballStartPos.x, this.ballStartPos.y);
            this.ballIsPushed = false;
        }

        this.moveBus();
        this.syncBusVisuals();
        this.drawAllHealthBars();

        // [end-update]
    }

    syncBusVisuals() {
        const dx = this.Bus.x - this.busInitialX;
        const dy = this.Bus.y - this.busInitialY;

        this.busBottomSprites.forEach((sprite, i) => {
            sprite.x = this.busBottomOffsets[i].x + dx;
            sprite.y = this.busBottomOffsets[i].y + dy;
        });

        this.wheelSprites.forEach((sprite, i) => {
            sprite.x = this.wheelOffsets[i].x + dx;
            sprite.y = this.wheelOffsets[i].y + dy;
        });
    }
    moveBus() {
        const Body = Phaser.Physics.Matter.Matter.Body;

        let newX = this.Bus.x + this.busMoveSpeed * this.busMoveDirection;

        // разворот у границ
        if (newX >= this.busMoveX2) {
            newX = this.busMoveX2;
            this.busMoveDirection = -1;
            this.reverseWheels();
        } else if (newX <= this.busMoveX1) {
            newX = this.busMoveX1;
            this.busMoveDirection = 1;
            this.reverseWheels();
        }

        Body.setPosition(this.Bus.body, { x: newX, y: this.Bus.y });
    }
    setupBusMovement(x1, x2, speed) {
        this.busMoveX1 = x1;
        this.busMoveX2 = x2;
        this.busMoveSpeed = speed;
        this.busMoveDirection = 1; // 1 = едем к x2, -1 = едем к x1

        this.wheelTweens = [];

        this.wheelSprites.forEach((wheel) => {
            const tween = this.tweens.add({
                targets: wheel,
                angle: 360,              // вращаем на 360 градусов
                duration: 7000,          // за 2 секунды
                repeat: -1,              // бесконечно
                ease: 'Linear'           // равномерное вращение
            });
            this.wheelTweens.push(tween);
        });
    }
    reverseWheels() {
        this.wheelTweens.forEach((tween, index) => {
            // Останавливаем текущий твин
            tween.stop();

            // Создаём новый с противоположным направлением
            const wheel = this.wheelSprites[index];
            const currentAngle = wheel.angle;

            // Новый твин - вращение в обратную сторону
            const newTween = this.tweens.add({
                targets: wheel,
                angle: currentAngle - 360, // вращаем в обратную сторону
                duration: 7000,
                repeat: -1,
                ease: 'Linear'
            });

            // Заменяем старый твин новым
            this.wheelTweens[index] = newTween;
        });
    }

    attachRidersToBus() {
        const busCenterX = this.busInitialX; // 1248
        const busCenterY = this.busInitialY; // 890

        // список объектов, которые едут на автобусе + их стартовые позиции
        const riders = [
            { obj: this.Obstacle_1, x: 961, y: 745 },
            { obj: this.Obstacle_2, x: 961, y: 816 },
            { obj: this.Obstacle_3, x: 961, y: 673 },
            { obj: this.Obstacle_4, x: 1248, y: 745 },
            { obj: this.Obstacle_5, x: 1248, y: 814 },
            { obj: this.Obstacle_6, x: 1248, y: 675 },
            { obj: this.Obstacle_7, x: 1534, y: 817 },
            { obj: this.Enemy, x: 1393, y: 788 },
            { obj: this.Enemy_2, x: 1106, y: 788 },
            { obj: this.Enemy_3, x: 1532, y: 719 },
        ];

        this.riderConstraintMap = new Map();   // body -> constraint
        this.riderBodyToObjectMap = new Map(); // body -> gameObject

        riders.forEach(({ obj, x, y }) => {
            const constraint = this.matter.add.constraint(this.Bus.body, obj.body, 0, 0.04, {
                pointA: { x: x - busCenterX, y: y - busCenterY },
                pointB: { x: 0, y: 0 },
                damping: 0.15
            });
            this.riderConstraintMap.set(obj.body, constraint);
            this.riderBodyToObjectMap.set(obj.body, obj);
        });
    }

    setupCollisionDetach() {
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                const bodies = [bodyA, bodyB];

                const hitByBall = bodies.includes(this.Ball.body);

                if (hitByBall) {
                    const otherBody = bodies.find(b => b !== this.Ball.body);
                    this.detachAndLaunch(otherBody, this.Ball.body);

                    if (bodyA.gameObject == this.Ball && bodyB.gameObject == this.FootballGoal) {
                        this.spawnHitParticles(this.screenWidth / 2, this.screenHeight / 2, 0x48ff54, 1000);
                        this.Ball.setVelocity(0, 0);
                        this.Ball.setAngularVelocity(0, 0);
                        this.Ball.setPosition(this.ballStartPos.x, this.ballStartPos.y);
                        this.ballIsPushed = false;
                    }

                    // return
                }

                // столкновение между двумя обычными riders (не мяч)
                const relVelX = bodyA.velocity.x - bodyB.velocity.x;
                const relVelY = bodyA.velocity.y - bodyB.velocity.y;
                const impactSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);

                if (impactSpeed > 0.3) {
                    // оба тела могли уже двигаться свободно (одно отцеплено, другое ещё нет)
                    if (this.riderConstraintMap.has(bodyA)) {
                        this.detachAndLaunch(bodyA, bodyB);
                        this.handleHit(bodyA);
                    }
                    if (this.riderConstraintMap.has(bodyB)) {
                        this.detachAndLaunch(bodyB, bodyA);
                    }
                    this.handleHit(bodyA, bodyB, impactSpeed);
                    this.handleHit(bodyB, bodyA, impactSpeed);
                }
            });
        });
    }

    handleHit(body, sourceBody, impactSpeed) {
        const healthData = this.riderHealthMap.get(body);

        if (healthData) {
            healthData.hp -= impactSpeed * 0.07;

            if (healthData.hp > 0) {
                this.drawAllHealthBars();
                return;
            }

            const gameObj = this.riderBodyToObjectMap.get(body);
            this.spawnHitParticles(body.position.x, body.position.y, 0xff0000, 100);

            const constraint = this.riderConstraintMap.get(body);
            if (constraint) {
                this.matter.world.removeConstraint(constraint);
                this.riderConstraintMap.delete(body);
            }

            healthData.bar.destroy();
            this.riderHealthMap.delete(body);
            this.removeRider(gameObj, body);
        }


    }
    removeRider(gameObj, body) {
        this.matter.world.remove(body);
        gameObj.destroy();

        this.riderBodyToObjectMap.delete(body);
        this.riderConstraintMap.delete(body);
        this.riderHealthMap.delete(body);
    }
    setupParticles() {
        // генерируем маленькую белую точку как текстуру для частиц
        const particleGfx = this.make.graphics({ x: 0, y: 0, add: false });
        particleGfx.fillStyle(0xffffff, 1);
        particleGfx.fillCircle(4, 4, 4);
        particleGfx.generateTexture('particle_dot', 8, 8);
        particleGfx.destroy();

        // emitter для эффекта попадания
        this.hitEmitter = this.add.particles(0, 0, 'particle_dot', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            quantity: 10,
            emitting: false
        });
        this.hitEmitter.setDepth(15);
    }

    spawnHitParticles(x, y, color = 0xffffff, count = 10) {
        this.hitEmitter.setParticleTint(color);
        this.hitEmitter.explode(count, x, y);
    }

    detachAndLaunch(body, sourceBody) {
        const constraint = this.riderConstraintMap.get(body);
        if (!constraint) return; // уже отцеплен

        const gameObj = this.riderBodyToObjectMap.get(body);
        if (!gameObj) return;

        this.matter.world.removeConstraint(constraint);
        this.riderConstraintMap.delete(body);
        gameObj.setIgnoreGravity(false);

        const Body = Phaser.Physics.Matter.Matter.Body;

        const dirX = body.position.x - sourceBody.position.x;
        const horizontalKick = Math.sign(dirX) * 2; // толчок в сторону от источника удара
        const upwardKick = -3; // отрицательный Y = вверх в Phaser-координатах

        Body.setVelocity(body, {
            x: horizontalKick,
            y: upwardKick
        });

    }

    // рисует пунктирный прицел из точек от мяча в направлении будущего удара
    drawAimDots(angle, dragDistance) {
        this.aimGraphics.clear();

        const dotCount = 20;
        const spacing = 20;
        const maxDrag = 300;
        const power = Phaser.Math.Clamp(dragDistance / maxDrag, 0, 1);

        // Центр мяча
        this.aimGraphics.fillStyle(0xffffff, 0.5);
        this.aimGraphics.fillCircle(this.Ball.x, this.Ball.y, 6);

        // Точки прицела (меняют цвет от зеленого к красному)
        for (let i = 1; i <= dotCount; i++) {
            if (i > dotCount * power) break;

            const dist = i * spacing;
            const dotX = this.Ball.x + Math.cos(angle) * dist;
            const dotY = this.Ball.y + Math.sin(angle) * dist + 0.05 * (i * i);

            // Цвет от зеленого к красному
            const t = i / dotCount;
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(0, 255, 0),
                new Phaser.Display.Color(255, 0, 0),
                1, t
            );

            this.aimGraphics.fillStyle(color.color, 0.8);
            const radius = Phaser.Math.Linear(5, 2, t);
            this.aimGraphics.fillCircle(dotX, dotY, radius);
        }
    }

    setupRiderHealth() {
        const maxHp = 2; // сколько ударов выдерживает защитник

        this.riderHealthMap = new Map(); // body -> { hp, maxHp, bar }
        this.allEnemyes = [this.Enemy, this.Enemy_2, this.Enemy_3];

        this.allEnemyes.forEach(gameObj => {
            const bar = this.add.graphics();
            bar.setDepth(20);

            this.riderHealthMap.set(gameObj.body, { hp: maxHp, maxHp, bar });
        });

        this.drawAllHealthBars();
    }

    drawAllHealthBars() {
        this.riderHealthMap.forEach((data, body) => {
            const gameObj = this.riderBodyToObjectMap.get(body);
            if (!gameObj) return;

            this.drawHealthBar(gameObj, data);
        });
    }

    drawHealthBar(gameObj, data) {
        const { bar, hp, maxHp } = data;
        bar.clear();

        const width = 40;
        const height = 6;
        const x = gameObj.x - width / 2;
        const y = gameObj.y - gameObj.displayHeight / 2 - 15; // над объектом

        // фон полоски
        bar.fillStyle(0x000000, 0.6);
        bar.fillRect(x, y, width, height);

        // заполнение по HP
        const ratio = hp / maxHp;
        const color = ratio > 0.5 ? 0x00ff00 : (ratio > 0 ? 0xffaa00 : 0xff0000);
        bar.fillStyle(color, 1);
        bar.fillRect(x, y, width * ratio, height);
    }
    setupFullscreenButton() {
        const btnSize = 40;
        const padding = 15;
        const x = this.scale.width - btnSize - padding;
        const y = padding;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x000000, 0.5);
        btnBg.fillRoundedRect(x, y, btnSize, btnSize, 8);
        btnBg.setDepth(100);
        btnBg.setScrollFactor(0);

        const icon = this.add.graphics();
        icon.lineStyle(2, 0xffffff, 1);
        const iconPad = 8;
        icon.strokeRect(x + iconPad, y + iconPad, btnSize - iconPad * 2, btnSize - iconPad * 2);
        icon.setDepth(101);
        icon.setScrollFactor(0);

        const hitZone = this.add.zone(x, y, btnSize, btnSize)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0);
        hitZone.setDepth(102);

        hitZone.on('pointerdown', () => {
            this.toggleFullscreen();
        });

        hitZone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x000000, 0.8);
            btnBg.fillRoundedRect(x, y, btnSize, btnSize, 8);
        });
        hitZone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x000000, 0.5);
            btnBg.fillRoundedRect(x, y, btnSize, btnSize, 8);
        });
    }

    toggleFullscreen() {
        if (this.scale.isFullscreen) {
            this.scale.stopFullscreen();
        } else {
            this.scale.startFullscreen();
        }
    }
}
// [end-scene]

const config = {
    "type": 0,
    "backgroundColor": "#ffa348",
    "transparent": false,
    "antialias": true,
    "disableContextMenu": true,
    "scale": {
        "mode": 3,
        "autoCenter": 1,
        "width": 2000,
        "height": 1080
    },
    "input": {
        "keyboard": true,
        "mouse": true,
        "touch": true,
        "gamepad": false,
        "activePointers": 1
    },
    "audio": {
        "noAudio": false,
        "disableWebAudio": false
    },
    "pixelArt": false,
    "physics": {
        "default": "matter",
        "matter": {
            "gravity": {
                "x": 0,
                "y": 1
            },
            "debug": false,
            "enableSleeping": false
        }
    },
    "scene": [scene_JGRZhYTj]
};

const game = new Phaser.Game(config);