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

const IDENTITY_REVEAL_DELAY = 350;
const PHOTO_LOAD_TIMEOUT = 5000;
const START_PACK_SIZE = 11;
const ROSTER_GROUPS = [
    { key: 'Goalkeeper', title: 'Вратари' },
    { key: 'Defender', title: 'Защитники' },
    { key: 'Midfielder', title: 'Полузащитники' },
    { key: 'Attacker', title: 'Нападающие' }
];

export class HomeController {
    constructor({
        vue,
        authApi,
        chestsApi,
        teamApi,
        playerPortraits,
        session,
        location = window.location
    }) {
        this.vue = vue;
        this.authApi = authApi;
        this.chestsApi = chestsApi;
        this.teamApi = teamApi;
        this.playerPortraits = playerPortraits;
        this.session = session;
        this.location = location;
        this.revealTimerId = null;
        this.photoTimerId = null;
        this.state = vue.reactive({
            isLoading: true,
            isProfileMenuOpen: false,
            isRosterVisible: false,
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
        return this.state.roster.slice(0, 4);
    }

    get emptyPreviewSlots() {
        return Math.max(0, 4 - this.visiblePlayers.length);
    }

    get additionalPlayersCount() {
        return Math.max(0, this.state.roster.length - 4);
    }

    get additionalPlayersLabel() {
        const count = this.additionalPlayersCount;
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastDigit === 1 && lastTwoDigits !== 11) {
            return 'игрок';
        }

        if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
            return 'игрока';
        }

        return 'игроков';
    }

    get rosterGroups() {
        return ROSTER_GROUPS.map((group) => ({
            ...group,
            players: this.state.roster.filter(
                (player) => player.positionKey === group.key
            )
        }));
    }

    get squadStatus() {
        if (this.state.roster.length === 0) return 'Открой стартовый набор';
        if (this.state.roster.length < 11) return 'Получены не все игроки';
        return 'Стартовая команда готова';
    }

    isChestReceived(chestNumber) {
        const chest = this.state.chests[chestNumber - 1];
        return Boolean(chest?.revealed_at);
    }

    get chestButtonLabel() {
        if (this.state.chest.isOpening) return 'Открываем…';
        if (this.state.chest.isComplete) return 'Получено';
        if (this.state.chest.isOpen) return 'Показать игроков';
        return 'Открыть 11 сундуков';
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
            await Promise.all([
                this.refreshChests(token),
                this.refreshTeam(token)
            ]);
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

    async refreshTeam(token = this.session.getToken()) {
        const footballers = await this.teamApi.getPlayers(token);
        this.state.roster = footballers.map(
            (footballer) => this.normalizeFootballer(footballer)
        );
    }

    applyChestState(chests) {
        const orderedChests = [...chests].sort(
            (left, right) => left.id - right.id
        );

        this.state.chests = orderedChests;
        this.state.chest.isOpen = orderedChests.some(
            (chest) => chest.status === 'opened'
        );
        this.state.chest.pendingCount = orderedChests.filter(
            (chest) => chest.status === 'opened' && !chest.revealed_at
        ).length;
        this.state.chest.isComplete = orderedChests.length === START_PACK_SIZE
            && orderedChests.every(
                (chest) => chest.status === 'opened'
                    && Boolean(chest.revealed_at)
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

    openRoster() {
        this.state.isProfileMenuOpen = false;
        this.state.isRosterVisible = true;
    }

    closeRoster() {
        this.state.isRosterVisible = false;
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
        this.state.reveal.isPhotoReady = !player.portrait || player.imageFailed;
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

        if (!nextPlayer?.portrait || typeof ImageConstructor !== 'function') {
            return;
        }

        const image = new ImageConstructor();
        image.decoding = 'async';
        image.src = nextPlayer.portrait;
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
        if (this.state.reveal.isDelayElapsed) {
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
            (rosterPlayer) => rosterPlayer.id === player.id
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
        return {
            ...this.normalizeFootballer(
                footballer,
                reward.character_type_id
            ),
            chestId: reward.chest_id
        };
    }

    normalizeFootballer(
        footballer,
        characterTypeId = footballer.character_type_id
    ) {
        const position = POSITION_LABELS[footballer.position] || {
            label: footballer.position || 'Позиция не указана',
            short: '—'
        };
        const name = footballer.name_ru || footballer.name_en || 'Футболист';
        const portrait = this.playerPortraits.getPortrait(
            characterTypeId,
            footballer.position
        );

        return {
            id: footballer.id,
            name,
            characterTypeId: characterTypeId ?? null,
            positionKey: footballer.position,
            position: position.label,
            shortPosition: position.short,
            number: footballer.number ?? '—',
            portrait,
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

        if (
            player.chestId !== undefined
            && player.chestId === this.currentReward?.chestId
        ) {
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
            emptyPreviewSlots: this.vue.computed(() => this.emptyPreviewSlots),
            additionalPlayersCount: this.vue.computed(() => this.additionalPlayersCount),
            additionalPlayersLabel: this.vue.computed(() => this.additionalPlayersLabel),
            rosterGroups: this.vue.computed(() => this.rosterGroups),
            squadStatus: this.vue.computed(() => this.squadStatus),
            isChestReceived: this.isChestReceived.bind(this),
            chestButtonLabel: this.vue.computed(() => this.chestButtonLabel),
            currentReward: this.vue.computed(() => this.currentReward),
            rewardButtonLabel: this.vue.computed(() => this.rewardButtonLabel),
            toggleProfileMenu: this.toggleProfileMenu.bind(this),
            openRoster: this.openRoster.bind(this),
            closeRoster: this.closeRoster.bind(this),
            logout: this.logout.bind(this),
            openChest: this.openChest.bind(this),
            showNextReward: this.showNextReward.bind(this),
            closeRewardReveal: this.closeRewardReveal.bind(this),
            handlePlayerImageError: this.handlePlayerImageError.bind(this),
            handleRewardImageLoad: this.handleRewardImageLoad.bind(this)
        };
    }
}
