function createObjectsFromJSON(scene, sceneData) {
    const created = {};

    (sceneData.objects || []).forEach((cfg) => {
        let obj;

        if (cfg.type === 'image') {
            obj = scene.add.image(cfg.x, cfg.y, cfg.texture);
        } else if (cfg.type === 'matterImage') {
            obj = scene.matter.add.image(cfg.x, cfg.y, cfg.texture, null, cfg.physics || {});
        } else {
            console.warn('Неизвестный тип объекта:', cfg.type);
            return;
        }

        if (cfg.setName !== undefined) obj.setName(cfg.setName);
        if (cfg.alpha !== undefined) obj.setAlpha(cfg.alpha);
        if (cfg.depth !== undefined) obj.setDepth(cfg.depth);
        if (cfg.scale !== undefined) {
            Array.isArray(cfg.scale) ? obj.setScale(...cfg.scale) : obj.setScale(cfg.scale);
        }
        if (cfg.angle !== undefined) obj.setAngle(cfg.angle);
        if (cfg.visible !== undefined) obj.setVisible(cfg.visible);
        if (cfg.blendMode !== undefined) obj.setBlendMode(cfg.blendMode);
        if (cfg.scrollFactor !== undefined) {
            Array.isArray(cfg.scrollFactor) ? obj.setScrollFactor(...cfg.scrollFactor) : obj.setScrollFactor(cfg.scrollFactor);
        }
        if (cfg.interactive) obj.setInteractive();
        if (cfg.origin !== undefined) {
            Array.isArray(cfg.origin) ? obj.setOrigin(...cfg.origin) : obj.setOrigin(cfg.origin);
        }
        if (cfg.flipX !== undefined) obj.setFlipX(cfg.flipX);
        if (cfg.flipY !== undefined) obj.setFlipY(cfg.flipY);

        if (cfg.tag !== undefined) {
            obj.tag = cfg.tag;
            if (cfg.interactive && scene.tagHandlers && scene.tagHandlers[cfg.tag]) {
                obj.on('pointerdown', (pointer) => scene.tagHandlers[cfg.tag](obj, cfg, pointer));
            }
        }

        scene[cfg.name] = obj;
        created[cfg.name] = obj;
    });

    return created;
}

function preloadFromJSON(scene, sceneData) {
    (sceneData.preload || []).forEach((asset) => {
        scene.load.image(asset.key, asset.file);
    });
}

function preloadAllFromJSON(scene, scenesData) {
    const loadedKeys = new Set();
    Object.values(scenesData).forEach((sceneData) => {
        (sceneData.preload || []).forEach((asset) => {
            if (!loadedKeys.has(asset.key)) {
                loadedKeys.add(asset.key);
                scene.load.image(asset.key, asset.file);
            }
        });
    });
}