export class LineupApiError extends Error {
    constructor(message, { status = 0 } = {}) {
        super(message);
        this.name = 'LineupApiError';
        this.status = status;
    }
}

export class LineupApi {
    constructor({ baseUrl = '/api/lineup' } = {}) {
        this.baseUrl = baseUrl;
    }

    async getSummary(accessToken) {
        let response;

        try {
            response = await fetch(`${this.baseUrl}/summary`, {
                cache: 'no-store',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
        } catch {
            throw new LineupApiError('Сервер недоступен. Попробуй ещё раз.');
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = typeof payload.detail === 'string'
                ? payload.detail
                : 'Не удалось загрузить готовность автобуса.';

            throw new LineupApiError(message, { status: response.status });
        }

        return this.validateSummary(payload);
    }

    validateSummary(payload) {
        const isValid = Number.isInteger(payload?.bus_id)
            && payload.bus_id > 0
            && Number.isInteger(payload?.placed_players)
            && payload.placed_players >= 0
            && Number.isInteger(payload?.required_players)
            && payload.required_players > 0
            && payload.placed_players <= payload.required_players
            && typeof payload?.is_ready === 'boolean';

        if (!isValid) {
            throw new LineupApiError(
                'Сервер вернул некорректную готовность автобуса.'
            );
        }

        return payload;
    }
}
