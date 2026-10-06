class LineupController {
    constructor(scene, ui, { canEdit = () => true, maxPlayers = 10 } = {}) {
        this.scene = scene;
        this.ui = ui;
        this.canEdit = canEdit;
        this.maxPlayers = maxPlayers;
        this.players = [];
        this.selectedSeat = null;
    }

    get count() {
        return this.players.length;
    }

    getPlayers() {
        return [...this.players];
    }

    selectSeat(buttonObj, cfg) {
        if (!this.canEdit() || !buttonObj.visible) return;
        if (this.selectedSeat?.buttonObj === buttonObj) {
            this.clearSeatSelection();
            return;
        }
        this.clearSeatSelection();
        const baseAlpha = buttonObj.alpha;
        const tween = this.scene.tweens.add({
            targets: buttonObj,
            alpha: baseAlpha * 0.4,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
        this.selectedSeat = { buttonObj, cfg, baseAlpha, tween };
    }

    clearSeatSelection() {
        const seat = this.selectedSeat;
        if (!seat) return;
        seat.tween.stop();
        if (seat.buttonObj.scene) seat.buttonObj.setAlpha(seat.baseAlpha);
        this.selectedSeat = null;
    }

    placeSelectedPlayer(type, cardId) {
        const seat = this.selectedSeat;
        if (!this.canEdit() || !seat) {
            this.ui.clearSelection();
            return false;
        }
        const entry = this.placePlayer(seat.buttonObj, seat.cfg.name, type, cardId);
        if (!entry) {
            this.ui.clearSelection();
            return false;
        }
        this.clearSeatSelection();
        return true;
    }

    placePlayer(seatButton, seatName, type, cardId) {
        if (this.count >= this.maxPlayers ||
            this.players.some(entry => entry.seatName === seatName || entry.cardId === cardId)) {
            return null;
        }
        const player = new Player(this.scene, {
            x: seatButton.x,
            y: seatButton.y,
            type,
            scale: 0.2,
            teamColor: 0xffffff
        });
        const entry = { seatName, cardId, type, player, seatButton };
        this.players.push(entry);
        seatButton.setVisible(false);
        seatButton.disableInteractive();
        player.sprite.setInteractive();
        player.sprite.on('pointerdown', () => this.returnPlayer(entry));
        this.ui.markCardUsed(cardId);
        return entry;
    }

    returnPlayer(entry) {
        if (!this.canEdit()) return;
        const index = this.players.indexOf(entry);
        if (index === -1) return;
        this.ui.restoreCard(entry.cardId, entry.type);
        entry.seatButton.setVisible(true);
        entry.seatButton.setInteractive();
        this.players.splice(index, 1);
        entry.player.destroy();
    }

    // Здоровье и эффекты остаются в сцене до следующего этапа разделения.
    removeDestroyedPlayer(entry) {
        const index = this.players.indexOf(entry);
        if (index !== -1) this.players.splice(index, 1);
    }

    snapshot() {
        return this.players.map(({ seatName, cardId, type }) => ({ seatName, cardId, type }));
    }

    // Вызывается сценой после загрузки каркаса и обновления карточек.
    restore(snapshot, objects) {
        for (const saved of snapshot) {
            const seatButton = objects[saved.seatName];
            if (seatButton) this.placePlayer(seatButton, saved.seatName, saved.type, saved.cardId);
        }
    }

    setTeamColor(color) {
        this.players.forEach(({ player }) => player.setTeamColor(color));
    }

    clearPlayers() {
        this.clearSeatSelection();
        this.players.forEach(({ player }) => player.destroy());
        this.players = [];
    }

    destroy() {
        this.clearPlayers();
        this.ui.destroy();
    }
}
