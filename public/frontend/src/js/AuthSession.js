export class AuthSession {
    constructor({ storage = null, key = 'angry-football.access-token' } = {}) {
        this.storage = storage;
        this.key = key;
        this.memoryToken = null;

        if (!this.storage) {
            try {
                this.storage = window.sessionStorage;
            } catch {
                this.storage = null;
            }
        }
    }

    getToken() {
        try {
            return this.storage?.getItem(this.key) || this.memoryToken;
        } catch {
            return this.memoryToken;
        }
    }

    setToken(token) {
        this.memoryToken = token;

        try {
            this.storage?.setItem(this.key, token);
        } catch {
            // Keep the in-memory token when browser storage is blocked.
        }
    }

    clear() {
        this.memoryToken = null;

        try {
            this.storage?.removeItem(this.key);
        } catch {
            // The in-memory token has already been cleared.
        }
    }
}
