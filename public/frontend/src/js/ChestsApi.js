export class ChestsApiError extends Error {
    constructor(message, { status = 0 } = {}) {
        super(message);
        this.name = 'ChestsApiError';
        this.status = status;
    }
}

export class ChestsApi {
    constructor({ baseUrl = '/api/chests' } = {}) {
        this.baseUrl = baseUrl;
    }

    async getChests(accessToken) {
        return this.request('', {
            headers: this.createAuthHeaders(accessToken)
        });
    }

    async openStartPack(accessToken) {
        return this.request('/open-start-pack', {
            method: 'POST',
            headers: this.createAuthHeaders(accessToken)
        });
    }

    async markRevealed(accessToken, chestIds) {
        return this.request('/revealed', {
            method: 'PATCH',
            headers: {
                ...this.createAuthHeaders(accessToken),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chest_ids: chestIds })
        });
    }

    createAuthHeaders(accessToken) {
        return {
            Authorization: `Bearer ${accessToken}`
        };
    }

    async request(path, options = {}) {
        let response;

        try {
            response = await fetch(`${this.baseUrl}${path}`, options);
        } catch {
            throw new ChestsApiError('Сервер недоступен. Попробуй ещё раз.');
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = typeof payload.detail === 'string'
                ? payload.detail
                : 'Не удалось выполнить запрос к сундукам.';

            throw new ChestsApiError(message, { status: response.status });
        }

        return payload;
    }
}
