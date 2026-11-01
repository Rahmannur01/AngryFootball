const PORTRAIT_FILES = Object.freeze({
    1: 'Player_1_portret.png',
    2: 'Player_2_portret.png',
    3: 'Player_3_portret.png',
    4: 'Player_4_portret.png',
    5: 'Player_5_portret.png',
    6: 'Player_6_portret.png',
    7: 'Player_7_portret.png'
});

const PORTRAITS_DIRECTORY = new URL('../images/portrets/', import.meta.url);

export class PlayerPortraits {
    getPortrait(characterTypeId, position) {
        if (position === 'Goalkeeper') {
            return new URL('Goalkeeper.png', PORTRAITS_DIRECTORY).href;
        }

        const portraitFile = PORTRAIT_FILES[characterTypeId];
        if (!portraitFile) return null;

        return new URL(portraitFile, PORTRAITS_DIRECTORY).href;
    }
}
