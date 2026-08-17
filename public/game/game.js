// [scene:scene_JGRZhYTj]
class scene_JGRZhYTj extends Phaser.Scene {
    // Размер игрового мира
    static WORLD_WIDTH = 2500;
    static WORLD_HEIGHT = 1080;

    // Пол (невидимый collision-объект под ногами)
    static FLOOR_Y = 1020;
    static FLOOR_SCALE_X = 100;
    static FLOOR_SCALE_Y = 3.5;

    // Фон
    static BACKGROUND_CENTER_Y = 560;
    static BACKGROUND_SCALE_X = 1.2;
    static BACKGROUND_SCALE_Y = 1.5;

    // Футбольные ворота (стоят у правого края мира)
    static GOAL_X = 1930;
    static GOAL_Y = 860;

    static CAMERA_FOLLOW_LERP_X = 0.08;
    static CAMERA_MIN_ZOOM = 1;
    static CAMERA_MAX_ZOOM = 4;
    static CAMERA_SHAKE_DURATION = 200;
    static CAMERA_SHAKE_INTESITY = 0.02;
    static CAMERA_SHAKE_MIN_IMPACT_SPEED = 10;

    static CAMERA_AIM_ZOOM = 1.7; // Зум при прицеливании
    static CAMERA_ZOOM_DURATION = 300; // Длительность анимации зума в мс
    static CAMERA_SLOW_MOTION_ZOOM = 1.5;
    static CAMERA_SLOW_MOTION_ZOOM_DURATION = 900;

    static SLOW_MOTION_DURATION = 700;
    static SLOW_MOTION_SCALE = 0.2;
    static SLOW_MOTION_TRANSITION_IN = 200;
    static SLOW_MOTION_TRANSITION_OUT = 200;

    static STILL_THRESHOLD = 0.05;
    static STILL_DURATION_MS = 300;

    constructor() {
        super({ key: 'scene_JGRZhYTj' });
        this.speed = 35;
        this.startPoint = null;
        this.aimGraphics = null;

        this.isMoving = false;
        this.isCameraShaked = false;
        this.isAiming = false;

        this.zoomTween = null;
        this.cameraInitialized = false;

        this.isSlowMotion = false;
        this.slowMoScale = 1;
        this.slowMoTween = null;

        this.ballReady = false;
        this._ballStillTimer = 0;
        this.readyIndicator = null;
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
        this.load.image('Background', './assets/Background_1.png');
        this.load.image('Goal', './assets/FootballGoal.png');
        // [end-preload]
    }

    create() {
        // [start-create]

        // Мир всегда фиксированного размера
        // Под реальный экран подстраивается не мир, а камера
        this.screenWidth = scene_JGRZhYTj.WORLD_WIDTH;
        this.screenHeight = scene_JGRZhYTj.WORLD_HEIGHT;

        this.ballStartPos = { x: 350, y: 900 };
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

        // Фон и все игровые объекты живут в мире фиксированного размера
        // (WORLD_WIDTH x WORLD_HEIGHT) = под экран подстраивается камера, а не мир.
        this.Background = this.add.image(scene_JGRZhYTj.WORLD_WIDTH / 2, scene_JGRZhYTj.BACKGROUND_CENTER_Y, 'Background');
        this.Background.setName('Background');
        this.Background.setAlpha(1);
        this.Background.setDepth(-1);
        this.Background.setScale(scene_JGRZhYTj.BACKGROUND_SCALE_X, scene_JGRZhYTj.BACKGROUND_SCALE_Y);
        this.Background.setAngle(0);
        this.Background.setVisible(true);
        this.Background.setBlendMode(0);
        this.Background.setScrollFactor(1, 1);
        this.Background.setInteractive();
        this.Background.setOrigin(0.5, 0.5);
        this.Background.setFlipX(false);
        this.Background.setFlipY(false);

        // Запасная копия только для области за боковыми краями мира на очень
        // широких экранах
        this.BackgroundEdgeFill = this.add.image(
            scene_JGRZhYTj.WORLD_WIDTH / 2,
            scene_JGRZhYTj.BACKGROUND_CENTER_Y,
        );
        this.BackgroundEdgeFill.setDepth(-2);
        this.BackgroundEdgeFill.setVisible(false);
        this.BackgroundEdgeFill.setOrigin(0.5, 0.5);

        this.BottomObstacle = this.matter.add.image(scene_JGRZhYTj.WORLD_WIDTH / 2, scene_JGRZhYTj.FLOOR_Y, 'default', null, {
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
        this.BottomObstacle.setScale(scene_JGRZhYTj.FLOOR_SCALE_X, scene_JGRZhYTj.FLOOR_SCALE_Y);
        this.BottomObstacle.setAngle(0);
        this.BottomObstacle.setVisible(false);
        this.BottomObstacle.setBlendMode(0);
        this.BottomObstacle.setScrollFactor(1, 1);
        this.BottomObstacle.setInteractive();
        this.BottomObstacle.setOrigin(0.5, 0.5);
        this.BottomObstacle.setFlipX(false);
        this.BottomObstacle.setFlipY(false);

        this.FootballGoal = this.matter.add.image(scene_JGRZhYTj.GOAL_X, scene_JGRZhYTj.GOAL_Y, 'Goal', null, {
            "isStatic": true,
            "friction": 0.1,
            "restitution": 0,
            "frictionStatic": 0.5,
            "density": 0.001,
            "isSensor": true,
            "slop": 0.05,
            "ignoreGravity": false,
            "frictionAir": 0.01,
            "damping": 0,
            "angularDamping": 0,
            "sleepThreshold": 60,
            "shape": {
                "type": "rectangle",
                "width": 100,
                "height": 730,
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
        this.FootballGoal.setScale(0.2, 0.2);
        this.FootballGoal.setAngle(0);
        this.FootballGoal.setVisible(true);
        this.FootballGoal.setBlendMode(0);
        this.FootballGoal.setScrollFactor(1, 1);
        this.FootballGoal.setInteractive();
        this.FootballGoal.setOrigin(0.45, 0.5);
        this.FootballGoal.setFlipX(true);
        this.FootballGoal.setFlipY(false);

        this.FootballGoalObstacle = this.matter.add.image(1990, 884, 'default', null, {
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
        this.FootballGoalObstacle.setName('FootballGoalObstacle');
        this.FootballGoalObstacle.setAlpha(1);
        this.FootballGoalObstacle.setDepth(0);
        this.FootballGoalObstacle.setScale(0.5, 6);
        this.FootballGoalObstacle.setAngle(-23);
        this.FootballGoalObstacle.setVisible(false);
        this.FootballGoalObstacle.setBlendMode(0);
        this.FootballGoalObstacle.setScrollFactor(1, 1);
        this.FootballGoalObstacle.setInteractive();
        this.FootballGoalObstacle.setOrigin(0.5, 0.5);
        this.FootballGoalObstacle.setFlipX(false);
        this.FootballGoalObstacle.setFlipY(false);

        this.FootballGoalObstacle_1 = this.matter.add.image(1940, 800, 'default', null, {
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
        this.FootballGoalObstacle_1.setName('FootballGoalObstacle_1');
        this.FootballGoalObstacle_1.setAlpha(1);
        this.FootballGoalObstacle_1.setDepth(0);
        this.FootballGoalObstacle_1.setScale(0.5, 2.5);
        this.FootballGoalObstacle_1.setAngle(-49);
        this.FootballGoalObstacle_1.setVisible(false);
        this.FootballGoalObstacle_1.setBlendMode(0);
        this.FootballGoalObstacle_1.setScrollFactor(1, 1);
        this.FootballGoalObstacle_1.setInteractive();
        this.FootballGoalObstacle_1.setOrigin(0.5, 0.5);
        this.FootballGoalObstacle_1.setFlipX(false);
        this.FootballGoalObstacle_1.setFlipY(false);
        this.matter.world.setBounds();

        this.matter.world.setBounds(0, 0, scene_JGRZhYTj.WORLD_WIDTH, scene_JGRZhYTj.WORLD_HEIGHT);

        this.setupCamera();

        // графика для отображения прицела
        this.aimGraphics = this.add.graphics();
        this.aimGraphics.setDepth(10);

        this.readyIndicator = this.add.graphics();
        this.readyIndicator.setDepth(9);

        this.input.on("pointerdown", (pointer) => {
            if (this.isMoving || !this.ballReady) return;

            this.startPoint = { x: pointer.worldX, y: pointer.worldY };
            this.isAiming = true;

            //this.smoothZoom(scene_JGRZhYTj.CAMERA_AIM_ZOOM)
        });
        this.input.on("pointermove", (pointer) => {
            if (!this.startPoint || this.isMoving) return;

            const angle = Phaser.Math.Angle.Between(
                pointer.worldX, pointer.worldY,
                this.startPoint.x, this.startPoint.y
            );

            const dragDistance = Phaser.Math.Distance.Between(
                pointer.worldX, pointer.worldY,
                this.startPoint.x, this.startPoint.y
            );

            this.drawAimDots(angle, dragDistance);
        });
        this.input.on("pointerup", (pointer) => {
            if (!this.startPoint || this.isMoving) return;

            // Вычисляем расстояние перетаскивания
            const dragDistance = Phaser.Math.Distance.Between(
                pointer.worldX, pointer.worldY,
                this.startPoint.x, this.startPoint.y
            );

            const angle = Phaser.Math.Angle.Between(
                pointer.worldX, pointer.worldY,
                this.startPoint.x, this.startPoint.y
            );

            // Динамическая скорость (чем больше перетаскивание, тем сильнее удар)
            const maxDrag = 150; // Максимальное расстояние для полной силы
            const power = Phaser.Math.Clamp(dragDistance / maxDrag, 0, 1); // 0-1
            const finalSpeed = this.speed * power;

            this.Ball.setVelocity(
                Math.cos(angle) * finalSpeed,
                Math.sin(angle) * finalSpeed
            );
            const spinPower = finalSpeed * 0.01; // коэффициент
            this.Ball.setAngularVelocity(spinPower);

            this.aimGraphics.clear();
            this.startPoint = null;

            this.isAiming = false;

            this.ballIsPushed = true;

            //this.smoothZoom(1);
        });

        this._resizeHandler = (gameSize) => {
            this.cameras.main.setSize(gameSize.width, gameSize.height);

            // Если есть активный твин, останавливаем
            if (this.zoomTween) {
                this.zoomTween.stop();
                this.zoomTween = null;
            }

            // Если мы в режиме прицеливания, отменяем его
            if (this.isAiming) {
                this.isAiming = false;
                this.startPoint = null;
                this.aimGraphics.clear();
            }

            // Пересчитываем базовый зум
            this.updateCameraZoom();

            // Применяем базовый зум мгновенно
            const baseZoom = this.baseZoom;
            this.cameras.main.setZoom(baseZoom);

            // Обновляем границы
            const viewportWidth = gameSize.width;
            const viewportHeight = gameSize.height;
            const visibleWorldHeight = viewportHeight / baseZoom;
            const scrollY = scene_JGRZhYTj.WORLD_HEIGHT - visibleWorldHeight;
            this.cameras.main.setBounds(0, scrollY, scene_JGRZhYTj.WORLD_WIDTH, visibleWorldHeight);

            // Обновляем запасной фон
            if (this.BackgroundEdgeFill) {
                this.BackgroundEdgeFill.setVisible(true);
                this.BackgroundEdgeFill.setTexture('Background');
                this.BackgroundEdgeFill.setDisplaySize(scene_JGRZhYTj.WORLD_WIDTH, visibleWorldHeight);
                this.BackgroundEdgeFill.setPosition(
                    scene_JGRZhYTj.WORLD_WIDTH / 2,
                    scrollY + visibleWorldHeight / 2
                );
            }
        };

        this._collisionHandler = (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                const bodies = [bodyA, bodyB];

                const hitByBall = bodies.includes(this.Ball.body);
                const isEnemy = false;

                const relVelX = bodyA.velocity.x - bodyB.velocity.x;
                const relVelY = bodyA.velocity.y - bodyB.velocity.y;
                const impactSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);

                if (hitByBall) {
                    if (this.isMoving && this.ballIsPushed && impactSpeed > scene_JGRZhYTj.CAMERA_SHAKE_MIN_IMPACT_SPEED && !this.isCameraShaked) {
                        this.startSlowMotionWithZoom();
                        this.cameras.main.shake(scene_JGRZhYTj.CAMERA_SHAKE_DURATION, scene_JGRZhYTj.CAMERA_SHAKE_INTESITY);
                        this.isCameraShaked = true;
                    }

                    if (bodyA.gameObject == this.Ball && bodyB.gameObject == this.FootballGoal && this.Ball.body.position.x <= this.FootballGoal.body.position.x) { //GOOOOOOL
                        //this.spawnHitParticles(this.screenWidth / 2, this.screenHeight / 2, 0x48ff54, 1000);
                        this.cameras.main.shake(scene_JGRZhYTj.CAMERA_SHAKE_DURATION, scene_JGRZhYTj.CAMERA_SHAKE_INTESITY);
                        this.startSlowMotionWithZoom();
                    }
                }

                if (impactSpeed > 0.3) {
                    this.handleHit(bodyA, bodyB, impactSpeed);
                    this.handleHit(bodyB, bodyA, impactSpeed);
                }
            });
        };

        this.scale.on('resize', this._resizeHandler);
        this.events.on('shutdown', this.onSceneShutdown, this);

        this.attachRidersToBus();
        this.setupRiderHealth();
        this.setupCollisionDetach();
        this.setupParticles();

        this.setUpBus(1400, this.busInitialY); // busY

        this.setSlowMotion(1);

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
            this.isCameraShaked = false;

            this.ballReady = false;
            this._ballStillTimer = 0;
        }
        
        if (speed <= scene_JGRZhYTj.STILL_THRESHOLD) {
            this._ballStillTimer += delta;
        } else {
            this._ballStillTimer = 0;
            this.ballReady = false;
        }

        if (this._ballStillTimer >= scene_JGRZhYTj.STILL_DURATION_MS) {
            this.ballReady = true;
        }

        // визуальный индикатор готовности
        this.readyIndicator.clear();
        if (!this.ballReady && !this.isMoving) {
            this.Ball.setAlpha(0.5);
            this.readyIndicator.lineStyle(3, 0xffffff, 0.6);
            this.readyIndicator.strokeCircle(this.Ball.x, this.Ball.y, 40 + Math.sin(time / 150) * 5);
        } else {
            this.Ball.setAlpha(1);
        }

        this.drawAllHealthBars();

        if (this.isAiming && this.zoomTween === null) {
            // Если мы в режиме прицеливания и нет активного твина то приближаем
            this.smoothZoom(scene_JGRZhYTj.CAMERA_AIM_ZOOM);
        } else if (!this.isAiming && !this.isSlowMotion && this.zoomTween === null && this.cameraInitialized) {
            // Если мы НЕ в режиме прицеливания и нет активного твина то возвращаем зум
            // Проверяем, что текущий зум отличается от базового
            const currentZoom = this.cameras.main.zoom;
            const baseZoom = this.baseZoom || 1;
            if (Math.abs(currentZoom - baseZoom) > 0.01) {
                this.smoothZoom(1);
            }
        }

        const physicsScale = this.slowMoScale ?? 1; // 1 = обычная скорость
        this.matter.world.step(delta * physicsScale);

        // [end-update]
    }

    onSceneShutdown() {
        this.scale.off('resize', this._resizeHandler);
        if (this.matter && this.matter.world) {
            this.matter.world.off('collisionstart', this._collisionHandler);
        }

        if (this._slowMoTimeout) {
            clearTimeout(this._slowMoTimeout);
            this._slowMoTimeout = null;
        }
        if (this.slowMoTween) {
            this.slowMoTween.stop();
            this.slowMoTween = null;
        }

        if (this.zoomTween) {
            this.zoomTween.stop();
            this.zoomTween = null;
        }

        this.time.timeScale = 1;
        this.tweens.timeScale = 1;
        this.slowMoScale = 1;
        this.isSlowMotion = false;
        this.isAiming = false;
        this.startPoint = null;
        this.cameraInitialized = false;
        this.ballReady = false;
        this._ballStillTimer = 0;
        this.readyIndicator = null;
    }
    cancelAiming() {
        if (!this.isAiming) return;

        this.isAiming = false;
        this.startPoint = null;
        this.aimGraphics.clear();

        if (this.zoomTween) {
            this.zoomTween.stop();
            this.zoomTween = null;
        }
        this.smoothZoom(1);
    }

    attachRidersToBus() {
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

        this.riderDesignOffsets = new Map();   // body -> текущая "домашняя" позиция на автобусе
        this.riderBodyToObjectMap = new Map(); // body -> gameObject

        riders.forEach(({ obj, x, y }) => {
            this.riderDesignOffsets.set(obj.body, { x, y });
            this.riderBodyToObjectMap.set(obj.body, obj);
        });
    }

    setUpBus(x, y) {
        const Body = Phaser.Physics.Matter.Matter.Body;

        const dx = x - this.busInitialX;
        const dy = y - this.busInitialY;

        // Физическое тело автобуса (каркас, статика)
        Body.setPosition(this.Bus.body, { x, y });

        // Визуальные секции
        this.busBottomOffsets.forEach((offset, i) => {
            offset.x += dx;
            offset.y += dy;
            this.busBottomSprites[i].setPosition(offset.x, offset.y);
        });

        // Колёса (только визуал, без физики)
        this.wheelOffsets.forEach((offset, i) => {
            offset.x += dx;
            offset.y += dy;
            this.wheelSprites[i].setPosition(offset.x, offset.y);
        });

        // Райдеры/враги = обычные физические тела, переставляем их
        // "домашние" позиции и сами тела на новое место одним разом.
        this.riderDesignOffsets.forEach((offset, body) => {
            offset.x += dx;
            offset.y += dy;

            Body.setPosition(body, { x: offset.x, y: offset.y });
        });

        this.busInitialX = x;
        this.busInitialY = y;
    }

    setupCollisionDetach() {
        this.matter.world.on('collisionstart', this._collisionHandler);
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

            this.cameras.main.shake(scene_JGRZhYTj.CAMERA_SHAKE_DURATION, scene_JGRZhYTj.CAMERA_SHAKE_INTESITY);

            healthData.bar.destroy();
            this.riderHealthMap.delete(body);
            this.removeRider(gameObj, body);
        }
    }
    removeRider(gameObj, body) {
        this.matter.world.remove(body);
        gameObj.destroy();

        this.riderBodyToObjectMap.delete(body);
        this.riderDesignOffsets.delete(body);
        this.riderHealthMap.delete(body);
    }
    setupParticles() {
        const particleGfx = this.make.graphics({ x: 0, y: 0, add: false });
        particleGfx.fillStyle(0xffffff, 1);
        particleGfx.fillCircle(4, 4, 4);
        particleGfx.generateTexture('particle_dot', 8, 8);
        particleGfx.destroy();

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

    // рисует пунктирный прицел из точек от мяча в направлении будущего удара
    drawAimDots(angle, dragDistance) {
        this.aimGraphics.clear();

        const dotCount = 20;
        const spacing = 20;
        const maxDrag = 100;
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
        const maxHp = 2;

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

    // Мир фиксированного размера (WORLD_WIDTH x WORLD_HEIGHT) виден через камеру,
    // которая масштабируется под реальную высоту экрана, так высота всегда
    // заполнена без полос и без обрезки, а по ширине камера скроллит вслед за мячом.
    setupCamera() {
        const camera = this.cameras.main;

        camera.setSize(this.scale.width, this.scale.height);

        camera.setBounds(
            0,
            0,
            scene_JGRZhYTj.WORLD_WIDTH,
            scene_JGRZhYTj.WORLD_HEIGHT
        );

        this.updateCameraZoom();

        // Следим за мячом ТОЛЬКО по X.
        camera.startFollow(
            this.Ball,
            true,
            scene_JGRZhYTj.CAMERA_FOLLOW_LERP_X,
            0
        );
    }

    smoothZoom(targetZoom, duration = scene_JGRZhYTj.CAMERA_ZOOM_DURATION) {
        // Если камера еще не инициализирована
        if (!this.cameras.main.zoom || this.cameras.main.zoom === 0) {
            return;
        }

        // Если уже есть активный твин
        if (this.zoomTween) {
            this.zoomTween.stop();
            this.zoomTween = null;
        }

        const camera = this.cameras.main;
        const startZoom = camera.zoom;
        const baseZoom = this.baseZoom || 1;
        const targetZoomAbsolute = targetZoom * baseZoom;

        // Если целевой зум совпадает с текущим
        if (Math.abs(startZoom - targetZoomAbsolute) < 0.001) {
            return;
        }

        // Создаем твин для плавного изменения зума
        this.zoomTween = this.tweens.add({
            targets: { value: startZoom },
            value: targetZoomAbsolute,
            duration: duration,
            ease: 'Cubic.easeInOut',
            onUpdate: (tween) => {
                const currentZoom = tween.targets[0].value;
                camera.setZoom(currentZoom);

                // Обновляем границы камеры
                const viewportWidth = this.scale.width;
                const viewportHeight = this.scale.height;
                const visibleWorldHeight = viewportHeight / currentZoom;
                const scrollY = scene_JGRZhYTj.WORLD_HEIGHT - visibleWorldHeight;

                camera.setBounds(0, scrollY, scene_JGRZhYTj.WORLD_WIDTH, visibleWorldHeight);

                // Обновляем запасной фон
                if (this.BackgroundEdgeFill) {
                    this.BackgroundEdgeFill.setVisible(true);
                    this.BackgroundEdgeFill.setTexture('Background');
                    this.BackgroundEdgeFill.setDisplaySize(scene_JGRZhYTj.WORLD_WIDTH, visibleWorldHeight);
                    this.BackgroundEdgeFill.setPosition(
                        scene_JGRZhYTj.WORLD_WIDTH / 2,
                        scrollY + visibleWorldHeight / 2
                    );
                }
            },
            onComplete: () => {
                this.zoomTween = null;
            }
        });
    }
    setSlowMotion(scale, duration = 150) {
        if (this.slowMoTween) {
            this.slowMoTween.stop();
            this.slowMoTween = null;
        }

        this.slowMoTween = this.tweens.add({
            targets: this,
            slowMoScale: scale,
            duration: duration,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.slowMoTween = null;
            }
        });
    }

    updateCameraZoom() {
        const camera = this.cameras.main;

        const worldWidth = scene_JGRZhYTj.WORLD_WIDTH;
        const worldHeight = scene_JGRZhYTj.WORLD_HEIGHT;

        const viewportWidth = this.scale.width;
        const viewportHeight = this.scale.height;

        // Базовый зум: вся высота мира видна.
        let zoom = viewportHeight / worldHeight;
        const visibleWorldWidth = viewportWidth / zoom;

        if (visibleWorldWidth > worldWidth) {
            zoom = viewportWidth / worldWidth;
        }

        this.baseZoom = zoom;

        // Устанавливаем начальный зум ТОЛЬКО если камера еще не инициализирована
        if (!this.cameraInitialized) {
            camera.setZoom(zoom);
            this.cameraInitialized = true;

            // обновляем границы для начального состояния
            const viewportHeightNow = this.scale.height;
            const visibleWorldHeight = viewportHeightNow / zoom;
            const scrollY = scene_JGRZhYTj.WORLD_HEIGHT - visibleWorldHeight;
            camera.setBounds(0, scrollY, scene_JGRZhYTj.WORLD_WIDTH, visibleWorldHeight);

            // Обновляем запасной фон
            if (this.BackgroundEdgeFill) {
                this.BackgroundEdgeFill.setVisible(true);
                this.BackgroundEdgeFill.setTexture('Background');
                this.BackgroundEdgeFill.setDisplaySize(scene_JGRZhYTj.WORLD_WIDTH, visibleWorldHeight);
                this.BackgroundEdgeFill.setPosition(
                    scene_JGRZhYTj.WORLD_WIDTH / 2,
                    scrollY + visibleWorldHeight / 2
                );
            }
        }
    }

    startSlowMotionWithZoom() {
        if (this.isSlowMotion == true) return;

        this.smoothZoom(scene_JGRZhYTj.CAMERA_SLOW_MOTION_ZOOM, scene_JGRZhYTj.CAMERA_SLOW_MOTION_ZOOM_DURATION);
        this.setSlowMotion(scene_JGRZhYTj.SLOW_MOTION_SCALE, scene_JGRZhYTj.SLOW_MOTION_TRANSITION_IN);
        this.isSlowMotion = true;

        this._slowMoTimeout = setTimeout(() => {
            this.isSlowMotion = false;
            this.setSlowMotion(1, scene_JGRZhYTj.SLOW_MOTION_TRANSITION_OUT);
            this.smoothZoom(1, scene_JGRZhYTj.CAMERA_SLOW_MOTION_ZOOM_DURATION);
            this._slowMoTimeout = null;
        }, scene_JGRZhYTj.SLOW_MOTION_DURATION);
    }
}
// [end-scene]

const config = {
    "type": 0,
    "parent": "game-container",
    "backgroundColor": "#000000",
    "transparent": false,
    "antialias": true,
    "disableContextMenu": true,
    "scale": {
        "mode": 5,
        "autoCenter": 1,
        "width": scene_JGRZhYTj.WORLD_WIDTH,
        "height": scene_JGRZhYTj.WORLD_HEIGHT
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
            "enableSleeping": false,
            "autoUpdate": false,
        }
    },
    "scene": [scene_JGRZhYTj]
};

const game = new Phaser.Game(config);