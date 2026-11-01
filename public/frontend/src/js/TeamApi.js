export class TeamApiError extends Error {
    constructor(message, { status = 0 } = {}) {
        super(message);
        this.name = 'TeamApiError';
        this.status = status;
    }
}

export class TeamApi {
    constructor({ baseUrl = '/api/team' } = {}) {
        this.baseUrl = baseUrl;
    }

    async getPlayers(accessToken) {
        const players = await this.request('/players', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!Array.isArray(players)) {
            throw new TeamApiError('Сервер вернул некорректный состав.');
        }

        return players;
    }

    async request(path, options = {}) {
        let response;

        try {
            response = await fetch(`${this.baseUrl}${path}`, options);
        } catch {
            throw new TeamApiError('Сервер недоступен. Попробуй ещё раз.');
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = typeof payload.detail === 'string'
                ? payload.detail
                : 'Не удалось загрузить команду.';

            throw new TeamApiError(message, { status: response.status });
        }

        return payload;
    }
}
