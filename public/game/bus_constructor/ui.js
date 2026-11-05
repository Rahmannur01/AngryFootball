const GAME_POSITION_LABELS = Object.freeze({
    Goalkeeper: { full: 'Вратарь', short: 'ВРТ' },
    Defender: { full: 'Защитник', short: 'ЗАЩ' },
    Midfielder: { full: 'Полузащитник', short: 'ПЗ' },
    Attacker: { full: 'Нападающий', short: 'НАП' }
});

const SURNAME_PARTICLES = new Set([
    'аль', 'бен', 'бин', 'ван', 'да', 'де', 'делла', 'ден', 'дер',
    'ди', 'дос', 'ду', 'ибн', 'ла', 'ле', 'мак', 'фон', 'эль'
]);

function getPlayerSurname(fullName) {
    const nameParts = String(fullName || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (nameParts.length <= 1) return nameParts[0] || 'Игрок';

    if (nameParts[0].endsWith('.')) {
        return nameParts.slice(1).join(' ');
    }

    let surnameStart = nameParts.length - 1;
    for (let index = 1; index < nameParts.length - 1; index += 1) {
        if (SURNAME_PARTICLES.has(nameParts[index].toLowerCase())) {
            surnameStart = index;
            break;
        }
    }

    return nameParts.slice(surnameStart).join(' ');
}

class BusSceneUI {
    constructor() {
        this.playerTypesPortraitPath = {};
        this.playersList = [];
        this.playerTypesList = [];

        this.portraitElements = document.getElementsByClassName('player-photo');
        this.portraitElementsParent = document.getElementsByClassName('player-card');
        this.playersPanel = document.getElementById('players-panel');
        this.testBusButton = document.getElementById('test-bus-btn');
        this.changeBusButton = document.getElementById('change-bus-btn');
        this.randomLineupButton = document.getElementById('random-lineup-btn');
        this.exitTestButton = document.getElementById('exit-test-btn');
        this.restartTestButton = document.getElementById('restart-test-btn');
        this.shootUsedElement = document.getElementById('shots-counter');
        this.shootUsedCounterElement = document.getElementById('shots-count');

        this.currentPlayerType = -1;
        this.currentClickedCard = null;

        // Вызывается при клике: (type, card, cardId, footballerId)
        this.onCardSelected = null;
        this.actionHandlers = {};

        this.shotTypesPanel = document.getElementById('shot-types-panel');
        this.shotTypeButtons = this.shotTypesPanel.querySelectorAll('.shot-type-btn');
        this.bombCountElement = document.getElementById("bomb-count");
        this.boostCountElement = document.getElementById("boost-count");

        this.selectedShotType = 'normal';

        this.shotTypeButtons.forEach(button => {
            button.onclick = () => {
                this.selectShotType(button.dataset.shotType);
            };
        });

        this.testBusButton.onclick = () => this.actionHandlers.onStartTest?.();
        this.changeBusButton.onclick = () => this.actionHandlers.onChangeBus?.();
        this.randomLineupButton.onclick = () => this.actionHandlers.onRandomLineup?.();
        this.exitTestButton.onclick = () => this.actionHandlers.onExitTest?.();
        this.restartTestButton.onclick = () => this.actionHandlers.onRestartTest?.();

        this.selectShotType('normal');
    }

    setActionHandlers(handlers) {
        this.actionHandlers = { ...handlers };
    }

    setBusChangePending(pending) {
        this.changeBusButton.disabled = pending;
        this.randomLineupButton.disabled = pending;
        this.changeBusButton.textContent = pending
            ? 'Сохранение…'
            : 'Сменить каркас';
    }

    setRandomLineupPending(pending) {
        this.randomLineupButton.disabled = pending;
        this.changeBusButton.disabled = pending;
        this.randomLineupButton.textContent = pending
            ? 'Сохранение…'
            : 'Случайный состав';
    }


    addPortrait(type, path) {
        if (
            this.playerTypesPortraitPath[type]
            === undefined
        ) {
            this.playerTypesPortraitPath[type] = path;
        }
    }


    drawPlayers(players) {
        this.playersList = Array.isArray(players) ? players : [];
        this.playerTypesList = this.playersList.map(
            player => player.character_type_id
        );

        for (let i = 0; i < this.playersList.length; i++) {
            const player = this.playersList[i];
            const type = player.character_type_id;
            const element = this.portraitElements[i];
            if (!element) {
                break;
            }
            this.drawPortrait(
                type,
                element
            );
            const card = element.closest('.player-card');
            if (!card) {
                continue;
            }
            this.drawPlayerDetails(player, card);
            card.onclick = () => {
                // Если игрок уже использован
                if (!element.querySelector('img')) {
                    return;
                }
                this.currentPlayerType = type;
                this.currentClickedCard = card;
                this.clickedCard(card);
                if (this.onCardSelected) {
                    this.onCardSelected(type, card, i, player.id);
                }
            };
        }
    }

    drawPlayerDetails(player, card) {
        let details = card.querySelector('.player-card__details');

        if (!details) {
            details = document.createElement('div');
            details.className = 'player-card__details';
            details.innerHTML = `
                <strong class="player-card__name"></strong>
                <span class="player-card__position"></span>
            `;
            card.append(details);
        }

        const name = player.name_ru || player.name_en || 'Игрок';
        const surname = getPlayerSurname(name);
        const positionLabels = GAME_POSITION_LABELS[player.position];
        const fullPosition = positionLabels?.full
            || player.position
            || 'Без позиции';
        const shortPosition = positionLabels?.short || fullPosition;

        details.querySelector('.player-card__name').textContent = surname;
        details.querySelector('.player-card__position').textContent = shortPosition;
        card.title = `${name} · ${fullPosition}`;
        card.setAttribute('aria-label', `${name}, ${fullPosition}`);
    }

    reloadPortraits() {
        this.currentPlayerType = -1;
        this.currentClickedCard = null;
        this.clearSelection();
        this.drawPlayers(this.playersList);
    }


    drawPortrait(type, element) {
        const path = this.playerTypesPortraitPath[type];
        if (!element || !path) {
            return;
        }
        element.innerHTML = `
            <img
                src="${path}"
                alt="Player ${type}"
            >
        `;
    }

    clickedCard(selectedCard) {
        for (let i = 0; i < this.portraitElementsParent.length; i++) {
            this.portraitElementsParent[i].classList.remove('selected');
        }
        selectedCard.classList.add(
            'selected'
        );
    }


    markCardUsed(cardId) {
        const portrait = this.portraitElements[cardId];
        if (portrait) portrait.innerHTML = '';
        this.clearSelection();
    }

    restoreCard(cardId, type) {
        this.drawPortrait(type, this.portraitElements[cardId]);
    }

    setTestMode(active) {
        this.playersPanel.style.display = active ? 'none' : '';
        this.testBusButton.hidden = active;
        this.changeBusButton.hidden = active;
        this.randomLineupButton.hidden = active;
        this.exitTestButton.hidden = !active;
        this.restartTestButton.hidden = !active;
        this.shootUsedElement.hidden = !active;
        this.shotTypesPanel.hidden = !active;
    }

    setActiveShotTypesPanel(active, specialShotsLeft) {
        this.shotTypesPanel.classList.toggle('locked', !active);
        this.shotTypesPanel.setAttribute('aria-disabled', String(!active));

        this.shotTypeButtons.forEach(button => {
            const type = button.dataset.shotType;
            const available =
                type === 'normal' || specialShotsLeft[type] > 0;

            button.disabled = !active || !available;
        });

        if (
            active &&
            this.selectedShotType !== 'normal' &&
            specialShotsLeft[this.selectedShotType] <= 0
        ) {
            this.selectShotType('normal');
        }
    }

    updateSpecialShotCount(specialShotsLeft) {
        this.bombCountElement.textContent = specialShotsLeft.bomb;
        this.boostCountElement.textContent = specialShotsLeft.boost;
    }

    setShootCount(count) {
        this.shootUsedCounterElement.textContent = `${count}`;
    }

    selectShotType(type) {
        const selectedButton = [...this.shotTypeButtons].find(
            button => button.dataset.shotType === type
        );

        if (!selectedButton || selectedButton.disabled) return;

        this.selectedShotType = type;

        this.shotTypeButtons.forEach(button => {
            const selected = button === selectedButton;

            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    }

    getSelectedShotType() {
        return this.selectedShotType;
    }

    destroy() {
        this.clearSelection();
        for (const element of this.portraitElements) {
            const card = element.closest('.player-card');
            if (card) card.onclick = null;
        }
        this.shotTypeButtons.forEach(button => {
            button.onclick = null;
        });
        for (const button of [
            this.testBusButton,
            this.changeBusButton,
            this.randomLineupButton,
            this.exitTestButton,
            this.restartTestButton
        ]) {
            button.onclick = null;
        }
        this.onCardSelected = null;
        this.actionHandlers = {};
    }

    getSelectedPlayerType() {
        return this.currentPlayerType;
    }
    clearSelection() {
        if (this.currentClickedCard) {
            this.currentClickedCard
                .classList.remove(
                    'selected'
                );
        }
        this.currentPlayerType = -1;
        this.currentClickedCard = null;
    }
}
