class LineupController {
    constructor(scene, ui, {
        canEdit = () => true,
        maxPlayers = 10,
        savePlayerSlot = async () => {},
        saveLineupSlots = async () => {},
        clearPlayerSlot = async () => {}
    } = {}) {
        this.scene = scene;
        this.ui = ui;
        this.canEdit = canEdit;
        this.maxPlayers = maxPlayers;
        this.savePlayerSlot = savePlayerSlot;
        this.saveLineupSlots = saveLineupSlots;
        this.clearPlayerSlot = clearPlayerSlot;
        this.players = [];
        this.selectedSeat = null;
        this.selectedPlayer = null;
        this.placementPending = false;
    }

    get count() {
        return this.players.length;
    }

    get isBusy() {
        return this.placementPending;
    }

    getPlayers() {
        return [...this.players];
    }

    selectSeat(buttonObj, cfg) {
        if (
            !this.canEdit() ||
            this.placementPending ||
            !buttonObj.visible
        ) return false;
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

        return this.placePendingSelection();
    }

    clearSeatSelection() {
        const seat = this.selectedSeat;
        if (!seat) return;
        seat.tween.stop();
        if (seat.buttonObj.scene) seat.buttonObj.setAlpha(seat.baseAlpha);
        this.selectedSeat = null;
    }

    selectPlayer(type, cardId, footballerId) {
        if (
            !this.canEdit() ||
            this.placementPending ||
            this.count >= this.maxPlayers
        ) {
            this.ui.clearSelection();
            this.selectedPlayer = null;
            return false;
        }

        this.selectedPlayer = { type, cardId, footballerId };
        return this.placePendingSelection();
    }

    async placePendingSelection() {
        const seat = this.selectedSeat;
        const selectedPlayer = this.selectedPlayer;

        if (!seat || !selectedPlayer || this.placementPending) return false;

        const placement = {
            seatButton: seat.buttonObj,
            seatName: seat.cfg.name,
            slotId: seat.cfg.slotId,
            type: selectedPlayer.type,
            cardId: selectedPlayer.cardId,
            footballerId: selectedPlayer.footballerId
        };

        if (!this.canPlacePlayer(placement)) {
            this.ui.clearSelection();
            this.selectedPlayer = null;
            return false;
        }

        this.placementPending = true;
        try {
            await this.savePlayerSlot(
                placement.footballerId,
                placement.slotId
            );
            const entry = this.placePlayer(placement);
            if (!entry) return false;

            this.clearSeatSelection();
            this.selectedPlayer = null;
            return true;
        } catch (error) {
            console.error('Не удалось сохранить место футболиста:', error);
            return false;
        } finally {
            this.placementPending = false;
        }
    }

    canPlacePlayer({ seatName, slotId, cardId, footballerId }) {
        if (this.count >= this.maxPlayers ||
            !Number.isInteger(slotId) ||
            !Number.isInteger(footballerId) ||
            this.players.some(entry => (
                entry.seatName === seatName ||
                entry.slotId === slotId ||
                entry.cardId === cardId ||
                entry.footballerId === footballerId
            ))) return false;

        return true;
    }

    placePlayer(placement) {
        if (!this.canPlacePlayer(placement)) return null;

        const {
            seatButton,
            seatName,
            slotId,
            type,
            cardId,
            footballerId
        } = placement;
        const player = new Player(this.scene, {
            x: seatButton.x,
            y: seatButton.y,
            type,
            scale: 0.2,
            teamColor: 0xffffff
        });
        const entry = {
            seatName,
            slotId,
            cardId,
            footballerId,
            type,
            player,
            seatButton
        };
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

    async returnPlayer(entry) {
        if (!this.canEdit() || this.placementPending) return false;
        const index = this.players.indexOf(entry);
        if (index === -1) return false;

        this.placementPending = true;
        try {
            await this.clearPlayerSlot(entry.footballerId);
            this.ui.restoreCard(entry.cardId, entry.type);
            entry.seatButton.setVisible(true);
            entry.seatButton.setInteractive();
            this.players.splice(index, 1);
            entry.player.destroy();
            return true;
        } catch (error) {
            console.error('Не удалось убрать футболиста:', error);
            return false;
        } finally {
            this.placementPending = false;
        }
    }

    // Здоровье и эффекты остаются в сцене до следующего этапа разделения.
    removeDestroyedPlayer(entry) {
        const index = this.players.indexOf(entry);
        if (index !== -1) this.players.splice(index, 1);
    }

    snapshot() {
        return this.players.map(({
            seatName,
            slotId,
            cardId,
            footballerId,
            type
        }) => ({ seatName, slotId, cardId, footballerId, type }));
    }

    // Вызывается сценой после загрузки каркаса и обновления карточек.
    restore(snapshot, objects) {
        for (const saved of snapshot) {
            const seatButton = objects[saved.seatName];
            if (seatButton) {
                this.placePlayer({
                    seatButton,
                    seatName: saved.seatName,
                    slotId: saved.slotId,
                    type: saved.type,
                    cardId: saved.cardId,
                    footballerId: saved.footballerId
                });
            }
        }
    }

    restoreSavedLineup(footballers, objects) {
        const seatsBySlotId = new Map(
            Object.entries(objects || {})
                .filter(([, object]) => (
                    object?.tag === 'add_player_button' &&
                    Number.isInteger(object.slotId)
                ))
                .map(([seatName, seatButton]) => [
                    seatButton.slotId,
                    { seatName, seatButton }
                ])
        );
        const placements = (footballers || [])
            .map((footballer, cardId) => ({ footballer, cardId }))
            .filter(({ footballer }) => footballer.slot_id !== null)
            .map(({ footballer, cardId }) => {
                const seat = seatsBySlotId.get(footballer.slot_id);
                if (!seat) {
                    throw new Error(
                        `Место slotId=${footballer.slot_id} отсутствует ` +
                        'в выбранном автобусе'
                    );
                }

                return {
                    ...seat,
                    slotId: footballer.slot_id,
                    type: footballer.character_type_id,
                    cardId,
                    footballerId: footballer.id
                };
            });

        if (placements.length > this.maxPlayers) {
            throw new Error('Сохранено слишком много игроков в автобусе');
        }

        for (const placement of placements) {
            if (!this.placePlayer(placement)) {
                throw new Error('Не удалось восстановить расстановку игроков');
            }
        }

        return placements.length;
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

    async randomize(objects, footballers) {
        if (!this.canEdit() || this.placementPending) return false;

        const seats = Object.entries(objects || {})
            .filter(([, obj]) => obj?.tag === 'add_player_button');
        const cards = (footballers || [])
            .map((footballer, cardId) => ({
                type: footballer.character_type_id,
                cardId,
                footballerId: footballer.id
            }));

        Phaser.Utils.Array.Shuffle(seats);
        Phaser.Utils.Array.Shuffle(cards);

        const playerCount = Math.min(
            seats.length,
            cards.length,
            this.maxPlayers
        );
        if (playerCount === 0) return false;

        const placements = [];

        for (let i = 0; i < playerCount; i++) {
            const [seatName, seatButton] = seats[i];
            const { type, cardId, footballerId } = cards[i];

            placements.push({
                seatButton,
                seatName,
                slotId: seatButton.slotId,
                type,
                cardId,
                footballerId
            });
        }

        const requestPlayers = placements.map(({
            footballerId,
            slotId
        }) => ({
            footballer_id: footballerId,
            slot_id: slotId
        }));

        this.placementPending = true;
        this.ui.setRandomLineupPending(true);
        try {
            await this.saveLineupSlots(requestPlayers);

            this.clearPlayers();
            this.ui.reloadPortraits();
            placements.forEach(placement => this.placePlayer(placement));
            return true;
        } catch (error) {
            console.error('Не удалось сохранить случайный состав:', error);
            return false;
        } finally {
            this.placementPending = false;
            this.ui.setRandomLineupPending(false);
        }
    }

    clearPlayers(reloadPortraits = false) {
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
        if (reloadPortraits) this.ui.reloadPortraits();
    }

    destroy() {
        this.clearPlayers();
        this.ui.destroy();
    }
}
