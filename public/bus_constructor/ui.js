class BusSceneUI {
    constructor() {
        this.playerTypesPortraitPath = {};
        this.playerTypesList = [];

        this.portraitElements =
            document.getElementsByClassName('player-photo');

        this.portraitElementsParent =
            document.getElementsByClassName('player-card');

        this.currentPlayerType = -1;
        this.currentClickedCard = null;

        // Вызывается при клике на карточку: (type, card)
        this.onCardSelected = null;
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
    }

    destroy() {
        this.clearSelection();
        for (const element of this.portraitElements) {
            const card = element.closest('.player-card');
            if (card) card.onclick = null;
        }
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