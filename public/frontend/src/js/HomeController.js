const POSITION_LABELS = {
    Goalkeeper: {
        label: 'Вратарь',
        short: 'ВРТ'
    },
    Defender: {
        label: 'Защитник',
        short: 'ЗАЩ'
    },
    Midfielder: {
        label: 'Полузащитник',
        short: 'ПЗ'
    },
    Attacker: {
        label: 'Нападающий',
        short: 'НАП'
    }
};

const IDENTITY_REVEAL_DELAY = 1000;
const PHOTO_LOAD_TIMEOUT = 5000;

export class HomeController {
    constructor({
        vue,
        authApi,
        chestsApi,
        session,
        location = window.location
    }) {
        this.vue = vue;
        this.authApi = authApi;
        this.chestsApi = chestsApi;
        this.session = session;
        this.location = location;
        this.revealTimerId = null;
        this.photoTimerId = null;
        this.state = vue.reactive({
            isLoading: true,
            isProfileMenuOpen: false,
            user: null,
            chests: [],
            roster: [],
            notice: {
                type: '',
                text: ''
            },
            chest: {
                isOpening: false,
                isOpen: false,
                isComplete: false,
                pendingCount: 0
            },
            reveal: {
                isVisible: false,
                isSaving: false,
                isDelayElapsed: false,
                isIdentityVisible: false,
                isPhotoReady: false,
                index: 0,
                players: [],
                error: ''
            }
        });
    }

    get displayName() {
        return this.state.user?.username || 'Игрок';
    }

    get visiblePlayers() {
        return this.state.roster.slice(0, 5);
    }

    get emptySquadSlots() {
        return Math.max(0, 5 - this.visiblePlayers.length);
    }

    get squadStatus() {
        if (this.state.roster.length === 0) return 'Открой стартовый набор';
        if (this.state.roster.length < 11) return 'Получены не все игроки';
        return 'Стартовая команда готова';
    }

    get chestTitle() {
        if (this.state.chest.isComplete) return 'Награды получены';
        if (this.state.chest.isOpen) return 'Продолжить открытие';
        return 'Стартовые сундуки';
    }

    get chestDescription() {
        if (this.state.chest.isComplete) {
            return 'Все футболисты стартового набора уже были показаны.';
        }
        if (this.state.chest.isOpen) {
            return 'Покажи оставшихся футболистов стартового набора.';
        }
        return 'Открой 11 сундуков и получи первую команду футболистов.';
    }

    get chestButtonLabel() {
        if (this.state.chest.isOpening) return 'Открываем…';
        if (this.state.chest.isComplete) return 'Получено';
        if (this.state.chest.isOpen) return 'Показать игроков';
        return 'Открыть 11 сундуков';
    }

    get chestStatusLabel() {
        if (this.state.chest.isComplete) return 'Все награды просмотрены';
        if (this.state.chest.pendingCount > 0) {
            return `Осталось показать: ${this.state.chest.pendingCount}`;
        }
        return 'Готово к открытию';
    }

    get currentReward() {
        return this.state.reveal.players[this.state.reveal.index] || null;
    }

    get rewardButtonLabel() {
        if (!this.state.reveal.isIdentityVisible) return 'Раскрываем…';
        if (this.state.reveal.isSaving) return 'Сохраняем…';

        const isLast = this.state.reveal.index
            === this.state.reveal.players.length - 1;
        return isLast ? 'Забрать игрока' : 'Следующий игрок';
    }

    async initialize() {
        const token = this.session.getToken();

        if (!token) {
            this.goToAuth();
            return;
        }

        try {
            this.state.user = await this.authApi.getProfile(token);
            await this.refreshChests(token);
        } catch (error) {
            if (this.handleUnauthorized(error)) return;

            this.showNotice(
                'error',
                error.message || 'Не удалось загрузить главную страницу.'
            );
        } finally {
            this.state.isLoading = false;
        }
    }

    async refreshChests(token = this.session.getToken()) {
        const response = await this.chestsApi.getChests(token);
        this.applyChestState(response.chests || []);
    }

    applyChestState(chests) {
        this.state.chests = chests;
        this.state.chest.isOpen = chests.some(
            (chest) => chest.status === 'opened'
        );
        this.state.chest.pendingCount = chests.filter(
            (chest) => chest.status === 'opened' && !chest.revealed_at
        ).length;
        this.state.chest.isComplete = chests.length > 0 && chests.every(
            (chest) => chest.status === 'opened' && Boolean(chest.revealed_at)
        );
    }

    mergeChestState(updatedChests) {
        const chestsById = new Map(
            this.state.chests.map((chest) => [chest.id, chest])
        );

        for (const chest of updatedChests) {
            chestsById.set(chest.id, chest);
        }

        this.applyChestState(
            [...chestsById.values()].sort((left, right) => left.id - right.id)
        );
    }

    toggleProfileMenu() {
        this.state.isProfileMenuOpen = !this.state.isProfileMenuOpen;
    }

    logout() {
        this.session.clear();
        this.goToAuth();
    }

    async openChest() {
        if (this.state.chest.isOpening || this.state.chest.isComplete) return;

        const token = this.session.getToken();
        this.state.chest.isOpening = true;
        this.showNotice('', '');

        try {
            const response = await this.chestsApi.openStartPack(token);
            const rewards = Array.isArray(response.rewards)
                ? response.rewards
                : [];

            if (rewards.length === 0) {
                await this.refreshChests(token);
                this.showNotice('info', 'Новых футболистов для показа нет.');
                return;
            }

            await this.showChestPlayers(rewards);
        } catch (error) {
            if (this.handleUnauthorized(error)) return;

            this.showNotice(
                'error',
                error.message || 'Не удалось открыть стартовые сундуки.'
            );
        } finally {
            this.state.chest.isOpening = false;
        }
    }

    async showChestPlayers(rewards) {
        const players = rewards.map(
            (reward) => this.normalizeReward(reward)
        );
        const rewardChestIds = new Set(
            players.map((player) => player.chestId)
        );
        const openedAt = new Date().toISOString();

        this.applyChestState(
            this.state.chests.map((chest) => rewardChestIds.has(chest.id)
                ? {
                    ...chest,
                    status: 'opened',
                    opened_at: chest.opened_at || openedAt,
                    revealed_at: chest.revealed_at || null
                }
                : chest)
        );

        this.state.reveal.players = players;
        this.state.reveal.index = 0;
        this.state.reveal.error = '';
        this.state.reveal.isVisible = players.length > 0;

        await this.vue.nextTick();
        this.prepareCurrentRewardReveal();
    }

    prepareCurrentRewardReveal() {
        this.clearRevealTimer();

        const player = this.currentReward;
        if (!player) return;

        this.state.reveal.isIdentityVisible = false;
        this.state.reveal.isDelayElapsed = false;
        this.state.reveal.isPhotoReady = !player.photo || player.imageFailed;
        this.preloadNextRewardPhoto();

        const delay = this.prefersReducedMotion()
            ? 0
            : IDENTITY_REVEAL_DELAY;
        this.revealTimerId = globalThis.setTimeout(() => {
            this.state.reveal.isDelayElapsed = true;
            this.revealTimerId = null;
            this.revealCurrentIdentity();
        }, delay);

        if (!this.state.reveal.isPhotoReady) {
            this.photoTimerId = globalThis.setTimeout(() => {
                player.imageFailed = true;
                this.state.reveal.isPhotoReady = true;
                this.photoTimerId = null;
                this.revealCurrentIdentity();
            }, PHOTO_LOAD_TIMEOUT);
        }
    }

    preloadNextRewardPhoto() {
        const nextPlayer = this.state.reveal.players[
            this.state.reveal.index + 1
        ];
        const ImageConstructor = globalThis.Image;

        if (!nextPlayer?.photo || typeof ImageConstructor !== 'function') {
            return;
        }

        const image = new ImageConstructor();
        image.decoding = 'async';
        image.src = nextPlayer.photo;
    }

    prefersReducedMotion() {
        return typeof globalThis.matchMedia === 'function'
            && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    clearRevealTimer() {
        if (this.revealTimerId !== null) {
            globalThis.clearTimeout(this.revealTimerId);
            this.revealTimerId = null;
        }

        if (this.photoTimerId !== null) {
            globalThis.clearTimeout(this.photoTimerId);
            this.photoTimerId = null;
        }
    }

    revealCurrentIdentity() {
        if (
            this.state.reveal.isDelayElapsed
            && this.state.reveal.isPhotoReady
        ) {
            this.state.reveal.isIdentityVisible = true;
        }
    }

    async showNextReward() {
        if (
            this.state.reveal.isSaving
            || !this.state.reveal.isIdentityVisible
        ) return;

        const player = this.currentReward;
        if (!player) return;

        const token = this.session.getToken();
        this.state.reveal.isSaving = true;
        this.state.reveal.error = '';

        try {
            const revealed = await this.chestsApi.markRevealed(
                token,
                [player.chestId]
            );
            this.mergeChestState(revealed.chests || []);
            this.addPlayerToRoster(player);

            const nextIndex = this.state.reveal.index + 1;
            if (nextIndex < this.state.reveal.players.length) {
                this.state.reveal.index = nextIndex;
                await this.vue.nextTick();
                this.prepareCurrentRewardReveal();
                return;
            }

            const receivedCount = this.state.reveal.players.length;
            this.clearRevealTimer();
            this.state.reveal.isVisible = false;
            this.showNotice(
                'success',
                `Получено футболистов: ${receivedCount}.`
            );
        } catch (error) {
            if (this.handleUnauthorized(error)) return;

            this.state.reveal.error = error.message
                || 'Не удалось сохранить просмотр игрока.';
        } finally {
            this.state.reveal.isSaving = false;
        }
    }

    addPlayerToRoster(player) {
        const playerExists = this.state.roster.some(
            (rosterPlayer) => rosterPlayer.chestId === player.chestId
        );

        if (!playerExists) {
            this.state.roster.push(player);
        }
    }

    closeRewardReveal() {
        if (this.state.reveal.isSaving) return;

        this.clearRevealTimer();
        this.state.reveal.isVisible = false;
        this.state.reveal.error = '';
        this.showNotice(
            'info',
            'Открытие приостановлено. Его можно продолжить позже.'
        );
    }

    normalizeReward(reward) {
        const footballer = reward.footballer || {};
        const position = POSITION_LABELS[footballer.position] || {
            label: footballer.position || 'Позиция не указана',
            short: '—'
        };
        const name = footballer.name_ru || footballer.name_en || 'Футболист';
        const photo = typeof footballer.photo === 'string'
            ? footballer.photo.trim()
            : '';

        return {
            chestId: reward.chest_id,
            id: footballer.id,
            name,
            position: position.label,
            shortPosition: position.short,
            number: footballer.number ?? '—',
            photo: photo || null,
            imageFailed: false,
            initials: this.createInitials(name)
        };
    }

    createInitials(name) {
        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || 'AF';
    }

    handlePlayerImageError(player) {
        player.imageFailed = true;

        if (player.chestId === this.currentReward?.chestId) {
            if (this.photoTimerId !== null) {
                globalThis.clearTimeout(this.photoTimerId);
                this.photoTimerId = null;
            }
            this.state.reveal.isPhotoReady = true;
            this.revealCurrentIdentity();
        }
    }

    handleRewardImageLoad(player) {
        if (player.chestId !== this.currentReward?.chestId) return;

        if (this.photoTimerId !== null) {
            globalThis.clearTimeout(this.photoTimerId);
            this.photoTimerId = null;
        }
        this.state.reveal.isPhotoReady = true;
        this.revealCurrentIdentity();
    }

    handleUnauthorized(error) {
        if (error.status !== 401) return false;

        this.session.clear();
        this.goToAuth();
        return true;
    }

    showNotice(type, text) {
        this.state.notice = { type, text };
    }

    goToAuth() {
        this.location.assign('./index.html');
    }

    expose() {
        return {
            state: this.state,
            displayName: this.vue.computed(() => this.displayName),
            visiblePlayers: this.vue.computed(() => this.visiblePlayers),
            emptySquadSlots: this.vue.computed(() => this.emptySquadSlots),
            squadStatus: this.vue.computed(() => this.squadStatus),
            chestTitle: this.vue.computed(() => this.chestTitle),
            chestDescription: this.vue.computed(() => this.chestDescription),
            chestButtonLabel: this.vue.computed(() => this.chestButtonLabel),
            chestStatusLabel: this.vue.computed(() => this.chestStatusLabel),
            currentReward: this.vue.computed(() => this.currentReward),
            rewardButtonLabel: this.vue.computed(() => this.rewardButtonLabel),
            toggleProfileMenu: this.toggleProfileMenu.bind(this),
            logout: this.logout.bind(this),
            openChest: this.openChest.bind(this),
            showNextReward: this.showNextReward.bind(this),
            closeRewardReveal: this.closeRewardReveal.bind(this),
            handlePlayerImageError: this.handlePlayerImageError.bind(this),
            handleRewardImageLoad: this.handleRewardImageLoad.bind(this)
        };
    }
}
