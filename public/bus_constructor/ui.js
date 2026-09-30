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

        for (
            let i = 0;
            i < this.playerTypesList.length;
            i++
        ) {
            const type =
                this.playerTypesList[i];

            const element =
                this.portraitElements[i];


            if (!element) {
                break;
            }


            this.drawPortrait(
                type,
                element
            );


            const card =
                element.closest('.player-card');


            if (!card) {
                continue;
            }


            card.onclick = () => {

                // Если игрок уже использован
                if (!element.querySelector('img')) {
                    return;
                }


                this.currentPlayerType =
                    type;

                this.currentClickedCard =
                    card;


                this.clickedCard(card);
            };
        }
    }

    reloadPortraits(){
        this.currentPlayerType = -1;
        this.currentClickedCard = null;
        this.drawPortraits(this.playerTypesList);
        this.clearSelection();
    }


    drawPortrait(type, element) {
        const path =
            this.playerTypesPortraitPath[type];


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

        for (
            let i = 0;
            i < this.portraitElementsParent.length;
            i++
        ) {

            this.portraitElementsParent[i]
                .classList.remove('selected');
        }


        selectedCard.classList.add(
            'selected'
        );
    }


    playerAdded() {

        if (!this.currentClickedCard) {
            return;
        }


        this.currentClickedCard.classList.remove('selected');
        const portrait =
            this.currentClickedCard.querySelector(
                '.player-photo'
            );
        if (portrait) {
            portrait.innerHTML = '';
        }
        this.currentPlayerType = -1;
        this.currentClickedCard = null;
    }
    playerReturned(type) {

        const index =
            this.playerTypesList.indexOf(type);


        if (index === -1) {
            return;
        }


        const element =
            this.portraitElements[index];


        this.drawPortrait(
            type,
            element
        );
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