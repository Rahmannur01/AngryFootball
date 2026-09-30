class CameraManager {

    constructor(scene, {
        worldWidth = 2500,
        worldHeight = 1080,

        followLerpX = 0.08,

        zoomDuration = 300,

        zoomMultiplier = 1
    } = {}) {

        this.scene = scene;

        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.followLerpX = followLerpX;

        this.zoomDuration = zoomDuration;

        // Дополнительный zoom поверх baseZoom
        this.zoomMultiplier = zoomMultiplier;

        this.camera = scene.cameras.main;

        this.baseZoom = 1;

        this.zoomTween = null;

        this.initialized = false;

        this.followTarget = null;

        // Точка, на которую смотрит камера
        this.focusPoint = null;

        this._resizeHandler =
            this.onResize.bind(this);
    }


    // =====================================================
    // SETUP
    // =====================================================

    setup() {

        const scene = this.scene;

        this.camera.setSize(
            scene.scale.width,
            scene.scale.height
        );

        this.camera.setBounds(
            0,
            0,
            this.worldWidth,
            this.worldHeight
        );

        this.updateBaseZoom();

        scene.scale.on(
            'resize',
            this._resizeHandler
        );

        return this;
    }


    // =====================================================
    // FOCUS
    // =====================================================

    focusOn(
        x,
        y,
        offsetX = 0,
        offsetY = 0
    ) {

        this.focusPoint = {
            x: x + offsetX,
            y: y + offsetY
        };

        this.camera.centerOn(
            this.focusPoint.x,
            this.focusPoint.y
        );

        return this;
    }


    focusOnObject(
        object,
        offsetX = 0,
        offsetY = 0
    ) {

        if (!object) {
            return this;
        }

        return this.focusOn(
            object.x,
            object.y,
            offsetX,
            offsetY
        );
    }


    refocus() {

        if (!this.focusPoint) {
            return this;
        }

        this.camera.centerOn(
            this.focusPoint.x,
            this.focusPoint.y
        );

        return this;
    }

    fitObject(object, padding = 40, maxMultiplier = 2, margin = 0.6, minMultiplier = 1) {
        if (!object) return this;

        const b = object.getBounds();
        const viewW = this.scene.scale.width;
        const viewH = this.scene.scale.height;

        // ширина панели справа в пикселях канваса
        const panel = document.getElementById('players-panel');
        const ratio = viewW / window.innerWidth;
        const rightInset = panel
            ? Math.max(0, (window.innerWidth - panel.getBoundingClientRect().left) * ratio)
            : 0;

        const fitZoom = Math.min(
            (viewW - rightInset) / (b.width + padding * 2),
            viewH / (b.height + padding * 2)
        ) * margin;

        const multiplier = Phaser.Math.Clamp(
            fitZoom / this.baseZoom,
            minMultiplier,
            maxMultiplier
        );

        this.setZoomMultiplier(multiplier, true);

        const zoom = this.camera.zoom;
        this.focusOn(b.centerX + (rightInset / 2) / zoom, b.centerY);

        return this;
    }

    // =====================================================
    // FOLLOW
    // =====================================================

    follow(target) {

        if (!target) {
            return this;
        }

        this.followTarget = target;

        this.focusPoint = null;

        this.camera.startFollow(
            target,
            true,
            this.followLerpX,
            0
        );

        return this;
    }


    stopFollow() {

        this.camera.stopFollow();

        this.followTarget = null;

        return this;
    }


    // =====================================================
    // BASE ZOOM
    // =====================================================

    updateBaseZoom() {

        const viewportWidth =
            this.scene.scale.width;

        const viewportHeight =
            this.scene.scale.height;


        let zoom =
            viewportHeight /
            this.worldHeight;


        const visibleWorldWidth =
            viewportWidth / zoom;


        if (
            visibleWorldWidth >
            this.worldWidth
        ) {

            zoom =
                viewportWidth /
                this.worldWidth;
        }


        this.baseZoom = zoom;


        if (!this.initialized) {

            this.camera.setZoom(
                this.baseZoom *
                this.zoomMultiplier
            );

            this.initialized = true;
        }


        this.updateBounds(
            this.camera.zoom
        );


        return this.baseZoom;
    }


    // =====================================================
    // BOUNDS
    // =====================================================

    updateBounds(
        zoom = this.camera.zoom
    ) {

        const viewportHeight =
            this.scene.scale.height;


        const visibleWorldHeight =
            viewportHeight / zoom;


        const scrollY =
            this.worldHeight -
            visibleWorldHeight;


        this.camera.setBounds(
            0,
            scrollY,
            this.worldWidth,
            visibleWorldHeight
        );
    }


    // =====================================================
    // SET ZOOM
    // =====================================================

    setZoomMultiplier(
        multiplier,
        instant = false
    ) {

        this.zoomMultiplier =
            multiplier;


        if (instant) {

            const zoom =
                this.baseZoom *
                this.zoomMultiplier;

            this.camera.setZoom(
                zoom
            );

            this.updateBounds(
                zoom
            );

            this.refocus();

            return this;
        }


        this.smoothZoom(
            multiplier
        );

        return this;
    }


    // =====================================================
    // SMOOTH ZOOM
    // =====================================================

    smoothZoom(
        multiplier = 1,
        duration = this.zoomDuration
    ) {

        if (
            !this.camera.zoom ||
            this.camera.zoom === 0
        ) {
            return this;
        }


        this.zoomMultiplier =
            multiplier;


        if (this.zoomTween) {

            this.zoomTween.stop();

            this.zoomTween = null;
        }


        const startZoom =
            this.camera.zoom;


        const targetZoom =
            this.baseZoom *
            multiplier;


        if (
            Math.abs(
                startZoom -
                targetZoom
            ) < 0.001
        ) {

            this.refocus();

            return this;
        }


        const zoomState = {
            value: startZoom
        };


        this.zoomTween =
            this.scene.tweens.add({

                targets: zoomState,

                value: targetZoom,

                duration,

                ease:
                    'Cubic.easeInOut',


                onUpdate: () => {

                    this.camera.setZoom(
                        zoomState.value
                    );

                    this.updateBounds(
                        zoomState.value
                    );

                    this.refocus();
                },


                onComplete: () => {

                    this.zoomTween = null;

                    this.refocus();
                }
            });


        return this;
    }


    resetZoom(
        duration = this.zoomDuration
    ) {

        return this.smoothZoom(
            1,
            duration
        );
    }


    // =====================================================
    // SHAKE
    // =====================================================

    shake(
        duration = 200,
        intensity = 0.02
    ) {

        this.camera.shake(
            duration,
            intensity
        );

        return this;
    }


    // =====================================================
    // RESIZE
    // =====================================================

    onResize(gameSize) {

        this.camera.setSize(
            gameSize.width,
            gameSize.height
        );


        if (this.zoomTween) {

            this.zoomTween.stop();

            this.zoomTween = null;
        }


        this.updateBaseZoom();


        const zoom =this.baseZoom * this.zoomMultiplier;
        this.camera.setZoom(
            zoom
        );
        this.updateBounds(
            zoom
        );
        this.refocus();
    }
    // =====================================================
    // DESTROY
    // =====================================================
    destroy() {
        this.scene.scale.off(
            'resize',
            this._resizeHandler
        );
        if (this.zoomTween) {
            this.zoomTween.stop();
            this.zoomTween = null;
        }
        this.stopFollow();
    }
}