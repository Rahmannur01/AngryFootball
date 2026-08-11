// [scene: MenuScene]
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this._isStarting = false;
    }

    create() {
        const { width, height } = this.scale;

        // Фоновый цвет
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Заголовок
        this.add.text(width / 2, height * 0.2, '⚽ FOOTBALL', {
            fontSize: '64px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.28, 'Puzzle', {
            fontSize: '32px',
            fill: '#8888ff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // КНОПКА "ИГРАТЬ" - делаем её крупнее для мобильных
        const btnX = width / 2;
        const btnY = height * 0.55;
        const btnWidth = Math.min(300, width * 0.7);
        const btnHeight = Math.min(100, height * 0.12);

        // Фон кнопки
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4a6fa5, 1);
        btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 20);
        btnBg.lineStyle(4, 0x88bbff, 0.6);
        btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 20);

        // Текст кнопки
        const fontSize = Math.min(36, width * 0.06);
        const btnText = this.add.text(btnX, btnY, '▶ ИГРАТЬ', {
            fontSize: fontSize + 'px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // ИНТЕРАКТИВНАЯ ЗОНА - увеличена для мобильных
        const hitZone = this.add.zone(btnX, btnY, btnWidth * 1.3, btnHeight * 1.3)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Эффекты при наведении (для десктопа)
        hitZone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x5a7fb5, 1);
            btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 20);
            btnBg.lineStyle(4, 0xaaccff, 0.8);
            btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 20);
            btnText.setScale(1.05);
        });

        hitZone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x4a6fa5, 1);
            btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 20);
            btnBg.lineStyle(4, 0x88bbff, 0.6);
            btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 20);
            btnText.setScale(1);
        });

        hitZone.on('pointerdown', (pointer) => {
            console.log('Button clicked!');
            this.startGame();
        });

        hitZone.on('touchstart', (pointer) => {
            console.log('Touch detected!');
            this.startGame();
        });

        // Клавиатура (для десктопа)
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());

        // Декоративные мячи
        this.createDecorations(width, height);

        // Проверяем поддержку Fullscreen
        this.checkFullscreenSupport();

        // Добавляем подсказку для мобильных
        if (this.isMobile()) {
            this.add.text(width / 2, height * 0.8, '👆 Нажмите для запуска', {
                fontSize: '20px',
                fill: '#666688',
                fontFamily: 'Arial',
                fontStyle: 'italic'
            }).setOrigin(0.5);
        }
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    checkFullscreenSupport() {
        // Проверяем нативный Fullscreen API
        this.fullscreenSupported = !!(document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled);

        // Дополнительная проверка для мобильных
        if (this.isMobile()) {
            console.log('📱 Mobile device detected');
            // На мобильных часто fullscreen работает иначе
            this.fullscreenSupported = true;
        }

        console.log('Fullscreen supported:', this.fullscreenSupported);
    }

    createDecorations(width, height) {
        const ballPositions = [
            { x: width * 0.1, y: height * 0.7, size: 30, speed: 0.3 },
            { x: width * 0.9, y: height * 0.8, size: 25, speed: 0.4 },
            { x: width * 0.85, y: height * 0.2, size: 20, speed: 0.5 },
            { x: width * 0.15, y: height * 0.4, size: 35, speed: 0.2 },
        ];

        this.decorBalls = [];
        ballPositions.forEach((pos, index) => {
            const ball = this.add.circle(pos.x, pos.y, pos.size, 0xffffff, 0.15)
                .setStrokeStyle(2, 0x88bbff, 0.3);

            this.add.circle(pos.x, pos.y, pos.size * 0.7, 0x88bbff, 0.1)
                .setStrokeStyle(1, 0x88bbff, 0.2);

            this.decorBalls.push({
                obj: ball,
                x: pos.x,
                y: pos.y,
                size: pos.size,
                speed: pos.speed,
                phase: index * 1.2
            });
        });

        this.decorTime = 0;
    }

    update(time, delta) {
        if (!this.decorBalls) return;

        this.decorTime += delta / 1000;

        this.decorBalls.forEach((ball) => {
            const offset = Math.sin(this.decorTime * ball.speed + ball.phase) * 20;
            ball.obj.setY(ball.y + offset);
            const rotation = this.decorTime * ball.speed * 0.5 + ball.phase;
            ball.obj.setRotation(rotation);
        });
    }

    startGame() {
        if (this._isStarting) return;
        this._isStarting = true;

        console.log('Starting game...');

        this.lockOrientation();

        this.requestFullscreenAndStart();
    }

    requestFullscreenAndStart() {
        // Получаем элемент для fullscreen
        const canvas = this.game.canvas;
        const container = document.getElementById('game-container');
        const target = canvas || container || document.documentElement;

        // Проверяем, уже в fullscreen
        if (this.isFullscreen()) {
            console.log('Already in fullscreen');
            this.launchGame();
            return;
        }

        // Пробуем войти в fullscreen
        this.enterFullscreen(target);
    }

    enterFullscreen(element) {
        // Получаем метод fullscreen
        const methods = [
            'requestFullscreen',
            'webkitRequestFullscreen',
            'mozRequestFullScreen',
            'msRequestFullscreen'
        ];

        let method = null;
        for (const m of methods) {
            if (element[m]) {
                method = m;
                break;
            }
        }

        if (!method) {
            console.warn('No fullscreen method found, starting game anyway');
            this.launchGame();
            return;
        }

        console.log('Using fullscreen method:', method);

        try {
            const result = element[method]();

            if (result && typeof result.then === 'function') {
                result.then(() => {
                    console.log('Fullscreen activated');
                    this.launchGame();
                }).catch((err) => {
                    console.warn('Fullscreen denied:', err);
                    this.launchGame();
                });
            } else {
                // Синхронный вызов - ждём немного
                console.log('Fullscreen called synchronously');
                setTimeout(() => {
                    this.launchGame();
                }, 300);
            }
        } catch (error) {
            console.warn('Fullscreen error:', error);
            this.launchGame();
        }
    }

    isFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
    }

    launchGame() {
        console.log('🎮 Launching game scene...');
        // Запускаем игру
        this.scene.start('scene_JGRZhYTj');
    }

    lockOrientation() {
        try {
            // Пробуем заблокировать ориентацию
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape')
                    .then(() => {
                        console.log('Orientation locked to landscape');
                    })
                    .catch((err) => {
                        console.warn('Orientation lock failed:', err);
                        // Пробуем CSS-метод
                        this.applyOrientationStyles();
                    });
            } else {
                // Используем CSS метод
                this.applyOrientationStyles();
            }
        } catch (e) {
            console.warn('Orientation API not available');
            this.applyOrientationStyles();
        }
    }

    applyOrientationStyles() {
        const container = document.getElementById('game-container');
        if (!container) return;

        const isPortrait = window.innerHeight > window.innerWidth;

        if (isPortrait) {
            console.log('🔄 Applying CSS rotation for portrait mode');
            container.style.transform = 'rotate(90deg)';
            container.style.transformOrigin = 'center center';
            container.style.width = '100vh';
            container.style.height = '100vw';
            container.style.position = 'absolute';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%) rotate(90deg)';
        } else {
            container.style.transform = 'none';
            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.position = 'static';
        }
    }
}