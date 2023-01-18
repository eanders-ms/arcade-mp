//% color="#207a77"
//% icon="\uf0c0"
//% block="Multiplayer"
namespace mp {
// groups='["Player", "Sprites", "Controller", "Info", "Utility"]'
    const MAX_PLAYERS = 4;

    export enum PlayerSlot {
        //% block="player 1"
        One = 1,
        //% block="player 2"
        Two = 2,
        //% block="player 3"
        Three = 3,
        //% block="player 4"
        Four = 4
    }

    export enum MultiplayerButton {
        //% block="A"
        A,
        //% block="B"
        B,
        //% block="up"
        Up,
        //% block="right"
        Right,
        //% block="down"
        Down,
        //% block="left"
        Left
    }

    class ButtonHandler {
        constructor(public button: MultiplayerButton, public event: ControllerButtonEvent, public handler: (player: Player) => void) {
        }
    }

    class ScoreHandler {
        constructor(public target: number, public handler: (player: Player) => void) {
        }
    }

    /**
     * A player in the game
     */
    //% block="Player"
    export class Player {
        _sprite: Sprite;
        _state: number[];
        _index: number;
        _data: any;

        get data(): any {
            if (!this._data) this._data = {};
            return this._data;
        }

        constructor(index: number) {
            this._index = index;
        }

        //% group="Properties" blockSetVariable="myPlayer"
        //% blockCombine block="index"
        get index(): number {
            return this._index;
        }

        //% group="Properties" blockSetVariable="myPlayer"
        //% blockCombine block="slot"
        get slot(): number {
            return this._index + 1;
        }

        //% blockId=mp_getPlayerSprite
        getSprite(): Sprite {
            return this._sprite;
        }

        setSprite(spr: Sprite) {
            this._sprite = spr;
        }

        getState(key: number): number {
            if (key === MultiplayerState.Score) {
                return this._getInfo().score();
            }
            if (key === MultiplayerState.Lives) {
                return this._getInfo().life();
            }
            return this._getState(key);
        }

        setState(key: number, val: number) {
            if (key === MultiplayerState.Score) {
                this._getInfo().setScore(val);
            }
            if (key === MultiplayerState.Lives) {
                this._getInfo().setLife(val);
            }
            this._setState(key, val);
        }

        _setState(key: number, val: number) {
            this._ensureState(key);
            if (this._state.length > key)
                this._state[key] = val;
        }

        _getState(key: number): number {
            this._ensureState(key);
            return (this._state.length > key) ? this._state[key] : 0;
        }

        _ensureState(key: number) {
            if (!this._state) this._state = [];
            if (key < 0 || key > 255) return;
            while (this._state.length < key) this._state.push(0);
        }

        _getInfo(): info.PlayerInfo {
            switch (this._index) {
                case 0: return info.player1;
                case 1: return info.player2;
                case 2: return info.player3;
                case 3: return info.player4;
                default: return undefined;
            }
        }
    }

    //% blockId=mp_getPlayerBySlot
    //% block="$slot"
    export function getPlayerBySlot(slot: PlayerSlot): Player {
        const index = slot - 1;
        if (index < 0 || index >= MAX_PLAYERS) return undefined;
        return _mpstate().players[index];
    }

    class MPState {
        players: Player[];
        indicatorsVisible: boolean;

        constructor() {
            this.players = [];
            for (let i = 0; i < MAX_PLAYERS; ++i)
                this.players.push(new Player(i));
            this.indicatorsVisible = false;
        }
    }

    let stateStack: MPState[];

    function init() {
        if (stateStack) return;
        stateStack = [new MPState()];
        game.addScenePushHandler(() => {
            stateStack.push(new MPState());
        });
        game.addScenePopHandler(() => {
            stateStack.pop();
            if (stateStack.length === 0) stateStack.push(new MPState());
        });
    }

    export function _mpstate() {
        init();
        return stateStack[stateStack.length - 1];
    }
}
