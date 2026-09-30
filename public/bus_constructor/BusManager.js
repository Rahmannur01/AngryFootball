class BusManager {
    constructor(scene, busKeys) {
        this.scene = scene;
        this.busKeys = busKeys;

        this.currentKey = busKeys[0];
        this.currentObjects = null;
    }

    load(key) {
        this.destroyCurrent();

        this.currentKey = key;

        this.currentObjects = createObjectsFromJSON(
            this.scene,
            window.SCENES_DATA[key]
        );

        return this.currentObjects;
    }

    loadNext() {
        const currentIndex =
            this.busKeys.indexOf(this.currentKey);

        const nextIndex =
            (currentIndex + 1) % this.busKeys.length;

        const nextKey =
            this.busKeys[nextIndex];

        return this.load(nextKey);
    }

    loadPrevious() {
        const currentIndex =
            this.busKeys.indexOf(this.currentKey);

        const previousIndex =
            (currentIndex - 1 + this.busKeys.length)
            % this.busKeys.length;

        const previousKey =
            this.busKeys[previousIndex];

        return this.load(previousKey);
    }

    loadRandom() {
        if (this.busKeys.length <= 1) {
            return this.load(this.busKeys[0]);
        }

        let randomKey;

        do {
            randomKey =
                Phaser.Utils.Array.GetRandom(this.busKeys);
        }
        while (randomKey === this.currentKey);

        return this.load(randomKey);
    }

    destroyCurrent() {
        if (!this.currentObjects) {
            return;
        }

        Object.values(this.currentObjects)
            .forEach((obj) => {
                if (obj && obj.destroy) {
                    obj.destroy();
                }
            });

        this.currentObjects = null;
    }

    getCurrentKey() {
        return this.currentKey;
    }

    getObjects() {
        return this.currentObjects;
    }

    destroy() {
        this.destroyCurrent();
    }
}