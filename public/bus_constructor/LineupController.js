class LineupController {
    constructor(scene, ui, { canEdit = () => true, maxPlayers = 10 } = {}) {
        this.scene = scene;
        this.ui = ui;
        this.canEdit = canEdit;
        this.maxPlayers = maxPlayers;
        this.players = [];
        this.selectedSeat = null;
        this.selectedPlayer = null;
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

        this.placePendingSelection();
    }

    clearSeatSelection() {
        const seat = this.selectedSeat;
        if (!seat) return;
        seat.tween.stop();
        if (seat.buttonObj.scene) seat.buttonObj.setAlpha(seat.baseAlpha);
        this.selectedSeat = null;
    }

    selectPlayer(type, cardId) {
        if (!this.canEdit() || this.count >= this.maxPlayers) {
            this.ui.clearSelection();
            this.selectedPlayer = null;
            return false;
        }

        this.selectedPlayer = { type, cardId };
        return this.placePendingSelection();
    }

    placePendingSelection() {
        const seat = this.selectedSeat;
        const selectedPlayer = this.selectedPlayer;

        if (!seat || !selectedPlayer) return false;

        const entry = this.placePlayer(
            seat.buttonObj,
            seat.cfg.name,
            selectedPlayer.type,
            selectedPlayer.cardId
        );

        if (!entry) {
            this.ui.clearSelection();
            this.selectedPlayer = null;
            return false;
        }

        this.clearSeatSelection();
        this.selectedPlayer = null;
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
        player.getSprites().forEach(sprite => {
            sprite.setInteractive();
            sprite.on('pointerdown', () => this.returnPlayer(entry));
        });
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

    setPlayersSleepThreshold(val = 60) {
        const Sleeping = Phaser.Physics.Matter.Matter.Sleeping;

        this.players.forEach(({ player }) => {
            player.getBodies().forEach(body => {
                body.sleepThreshold = val;
                Sleeping.set(body, false);
            });
        });
    }

    setTeamColor(color) {
        this.players.forEach(({ player }) => player.setTeamColor(color));
    }

    setShaderEnabled(enabled) {
        this.players.forEach(({ player }) => player.setShaderEnabled(enabled));
    }

    randomize(objects, playerTypes) {
        if (!this.canEdit()) return false;

        this.clearPlayers();
        this.ui.reloadPortraits();

        const seats = Object.entries(objects || {})
            .filter(([, obj]) => obj?.tag === 'add_player_button');
        const cards = (playerTypes || [])
            .map((type, cardId) => ({ type, cardId }));

        Phaser.Utils.Array.Shuffle(seats);
        Phaser.Utils.Array.Shuffle(cards);

        const playerCount = Math.min(
            seats.length,
            cards.length,
            this.maxPlayers
        );

        for (let i = 0; i < playerCount; i++) {
            const [seatName, seatButton] = seats[i];
            const { type, cardId } = cards[i];

            this.placePlayer(seatButton, seatName, type, cardId);
        }

        return playerCount > 0;
    }

    clearPlayers() {
        this.clearSeatSelection();
        this.selectedPlayer = null;
        this.ui.clearSelection();
        this.players.forEach(({ player, seatButton }) => {
            if (seatButton?.scene) {
                seatButton.setVisible(true);
                seatButton.setInteractive();
            }
            player.destroy();
        });
        this.players = [];
    }

    destroy() {
        this.clearPlayers();
        this.ui.destroy();
    }
}
