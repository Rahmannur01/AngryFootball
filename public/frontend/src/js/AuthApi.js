export class AuthApiError extends Error {
    constructor(message, { status = 0, fieldErrors = {} } = {}) {
        super(message);
        this.name = 'AuthApiError';
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

export class AuthApi {
    constructor({ baseUrl = '/api/auth' } = {}) {
        this.baseUrl = baseUrl;
    }

    async submit(mode, credentials) {
        return mode === 'login'
            ? this.login(credentials)
            : this.register(credentials);
    }

    async login({ identifier, password }) {
        const body = new URLSearchParams({
            username: identifier,
            password
        });

        return this.request('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        });
    }

    async register({ username, email, password, passwordConfirmation }) {
        return this.request('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                password_repeat: passwordConfirmation
            })
        });
    }

    async getProfile(accessToken) {
        return this.request('/profile', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    }

    async request(path, options = {}) {
        let response;

        try {
            response = await fetch(`${this.baseUrl}${path}`, options);
        } catch {
            throw new AuthApiError('Сервер недоступен. Попробуй ещё раз.');
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw this.createError(response.status, payload.detail);
        }

        return payload;
    }

    createError(status, detail) {
        if (Array.isArray(detail)) {
            const fieldErrors = {};

            for (const issue of detail) {
                const backendField = issue.loc?.at(-1);
                const field = ['password_repeat', 'body'].includes(backendField)
                    ? 'passwordConfirmation'
                    : backendField;

                if (field) {
                    fieldErrors[field] = String(issue.msg || 'Некорректное значение.')
                        .replace(/^Value error,\s*/i, '');
                }
            }

            return new AuthApiError(
                'Проверь введённые данные.',
                { status, fieldErrors }
            );
        }

        return new AuthApiError(
            typeof detail === 'string' ? detail : 'Не удалось выполнить запрос.',
            { status }
        );
    }
}
