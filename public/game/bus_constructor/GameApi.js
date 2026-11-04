class GameApi {
    static ACCESS_TOKEN_STORAGE_KEY = 'angry-football.access-token';

    getAccessToken() {
        let accessToken = null;

        try {
            accessToken = window.sessionStorage.getItem(
                GameApi.ACCESS_TOKEN_STORAGE_KEY
            );
        } catch {
            // The request method below will report missing authorization.
        }

        if (!accessToken) {
            throw new Error('Для сохранения автобуса требуется авторизация');
        }

        return accessToken;
    }

    async request(path, options = {}) {
        const response = await fetch(path, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.getAccessToken()}`,
                ...options.headers
            }
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            const message = typeof payload?.detail === 'string'
                ? payload.detail
                : `Ошибка запроса: HTTP ${response.status}`;
            throw new Error(message);
        }

        return payload;
    }

    validateUserBus(payload) {
        if (!Number.isInteger(payload?.bus_id) || payload.bus_id <= 0) {
            throw new Error('Сервер вернул некорректный автобус');
        }

        return payload;
    }

    validateInitialLineup(payload) {
        this.validateUserBus(payload);

        if (!Array.isArray(payload?.players)) {
            throw new Error('Сервер вернул некорректный список игроков');
        }

        const occupiedSlots = new Set();
        for (const player of payload.players) {
            if (!Number.isInteger(player?.id) || player.id <= 0) {
                throw new Error('Сервер вернул некорректного футболиста');
            }
            if (
                player.character_type_id !== null &&
                (!Number.isInteger(player.character_type_id) ||
                    player.character_type_id <= 0)
            ) {
                throw new Error('Сервер вернул некорректный тип игрока');
            }
            if (
                player.slot_id !== null &&
                (!Number.isInteger(player.slot_id) ||
                    player.slot_id <= 0)
            ) {
                throw new Error('Сервер вернул некорректное место игрока');
            }
            if (player.slot_id !== null) {
                if (occupiedSlots.has(player.slot_id)) {
                    throw new Error('Сервер вернул повторяющиеся места');
                }
                occupiedSlots.add(player.slot_id);
            }
        }

        return payload;
    }

    async getInitialLineup() {
        const payload = await this.request('/api/lineup', {
            cache: 'no-store'
        });
        return this.validateInitialLineup(payload);
    }

    async getBus() {
        const payload = await this.request('/api/lineup/bus', {
            cache: 'no-store'
        });
        return this.validateUserBus(payload);
    }

    async saveBus(busId) {
        if (!Number.isInteger(busId) || busId <= 0) {
            throw new TypeError('Некорректный идентификатор автобуса');
        }

        const payload = await this.request('/api/lineup/bus', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bus_id: busId })
        });
        this.validateUserBus(payload);

        if (payload?.bus_id !== busId) {
            throw new Error('Сервер вернул другой идентификатор автобуса');
        }

        return payload;
    }

    async setFootballerSlot(footballerId, slotId) {
        if (!Number.isInteger(footballerId) || footballerId <= 0) {
            throw new TypeError('Некорректный идентификатор футболиста');
        }
        if (!Number.isInteger(slotId) || slotId <= 0) {
            throw new TypeError('Некорректный идентификатор места');
        }

        const payload = await this.request(
            `/api/lineup/players/${footballerId}/slot`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ slot_id: slotId })
            }
        );

        if (
            payload?.footballer_id !== footballerId ||
            payload?.slot_id !== slotId
        ) {
            throw new Error('Сервер вернул другое место футболиста');
        }

        return payload;
    }

    async clearFootballerSlot(footballerId) {
        if (!Number.isInteger(footballerId) || footballerId <= 0) {
            throw new TypeError('Некорректный идентификатор футболиста');
        }

        await this.request(
            `/api/lineup/players/${footballerId}/slot`,
            { method: 'DELETE' }
        );
    }

    async saveLineupSlots(players) {
        if (!Array.isArray(players)) {
            throw new TypeError('Расстановка должна быть массивом');
        }

        const payload = await this.request('/api/lineup/slots', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ players })
        });

        if (!Array.isArray(payload?.players)) {
            throw new Error('Сервер вернул некорректную расстановку');
        }

        const savedSlots = new Map(
            payload.players.map(player => [
                player.footballer_id,
                player.slot_id
            ])
        );
        const responseMatches =
            savedSlots.size === players.length &&
            players.every(player => (
                savedSlots.get(player.footballer_id) === player.slot_id
            ));

        if (!responseMatches) {
            throw new Error('Сервер сохранил другую расстановку');
        }

        return payload;
    }
}

window.GameApi = GameApi;
