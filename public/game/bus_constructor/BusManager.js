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
        return this.load(this.getNextKey());
    }

    getNextKey() {
        const currentIndex =
            this.busKeys.indexOf(this.currentKey);

        const nextIndex =
            (currentIndex + 1) % this.busKeys.length;

        return this.busKeys[nextIndex];
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

    getCurrentId() {
        return this.getId(this.currentKey);
    }

    getId(key) {
        const busId = window.SCENES_DATA[key]?.id;
        return Number.isInteger(busId) ? busId : null;
    }

    getObjects() {
        return this.currentObjects;
    }

    removeObject(name) {
        const object = this.currentObjects?.[name];
        if (!object) return false;

        delete this.currentObjects[name];
        if (this.scene[name] === object) this.scene[name] = null;
        object.destroy();
        return true;
    }

    destroy() {
        this.destroyCurrent();
    }
}
