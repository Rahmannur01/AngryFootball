class BusSceneUI {
    constructor() {
        this.playerTypesPortraitPath = {};
        this.playerTypesList = [];

        this.portraitElements = document.getElementsByClassName('player-photo');
        this.portraitElementsParent = document.getElementsByClassName('player-card');
        this.shootUsedElement = document.getElementById('shots-counter');
        this.shootUsedCounterElement = document.getElementById('shots-count');

        this.currentPlayerType = -1;
        this.currentClickedCard = null;

        // Вызывается при клике на карточку: (type, card)
        this.onCardSelected = null;

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

        this.selectShotType('normal');
    }


    addPortrait(type, path) {
        if (
            this.playerTypesPortraitPath[type]
            === undefined
        ) {
            this.playerTypesPortraitPath[type] = path;
        }
    }


    drawPortraits(types) {
        this.playerTypesList = types;

        for (let i = 0; i < this.playerTypesList.length; i++) {
            const type = this.playerTypesList[i];
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
            card.onclick = () => {
                // Если игрок уже использован
                if (!element.querySelector('img')) {
                    return;
                }
                this.currentPlayerType = type;
                this.currentClickedCard = card;
                this.clickedCard(card);
                if (this.onCardSelected) {
                    this.onCardSelected(type, card, i);
                }
            };
        }
    }

    reloadPortraits() {
        this.currentPlayerType = -1;
        this.currentClickedCard = null;
        this.clearSelection();
        this.drawPortraits(this.playerTypesList);
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
        document.getElementById('players-panel').style.display = active ? 'none' : '';
        document.getElementById('test-bus-btn').hidden = active;
        document.getElementById('change-bus-btn').hidden = active;
        document.getElementById('exit-test-btn').hidden = !active;
        document.getElementById('restart-test-btn').hidden = !active;
        this.shootUsedElement.hidden = !active;
        this.shotTypesPanel.hidden = !active;
    }

    setActiveShotTypesPanel(active, specialShotsLeft) {
        this.shotTypesPanel.classList.toggle('locked', !active);

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
        this.onCardSelected = null;
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