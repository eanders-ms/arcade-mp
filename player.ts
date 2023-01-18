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

    export enum PlayerProperty {
        //% block="index"
        Index = 1,
        //% block="slot"
        Slot = 2
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

    class ControllerEventHandler {
        constructor(public event: ControllerEvent, public handler: (player: Player) => void) {
        }
    }

    class ScoreHandler {
        constructor(public target: number, public handler: (player: Player) => void) {
        }
    }

    /**
     * A player in the game
     */
    export class Player {
        _sprite: Sprite;
        _state: number[];
        _index: number;
        _data: any;

        constructor(index: number) {
            this._index = index;
        }

        get index(): number {
            return this._index;
        }

        get slot(): number {
            return this._index + 1;
        }

        get data(): any {
            if (!this._data) this._data = {};
            return this._data;
        }

        getProperty(prop: PlayerProperty): number {
            switch (prop) {
                case PlayerProperty.Index: return this.index;
                case PlayerProperty.Slot: return this.slot;
                default: return 0;
            }
        }

        getSprite(): Sprite {
            return this._sprite;
        }

        setSprite(spr: Sprite) {
            this._sprite = spr;
        }

        moveWithButtons(vx?: number, vy?: number) {
            this._getController().moveSprite(this.getSprite(), vx, vy);
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

        _getController(): controller.Controller {
            switch (this._index) {
                case 0: return controller.player1;
                case 1: return controller.player2;
                case 2: return controller.player3;
                case 3: return controller.player4;
            }
            return undefined;
        }
    }

    class MPState {
        players: Player[];
        buttonHandlers: ButtonHandler[];
        controllerEventHandlers: ControllerEventHandler[];
        scoreHandlers: ScoreHandler[];
        lifeZeroHandler: (player: Player) => void;
        indicatorsVisible: boolean;
        indicatorRenderable: scene.Renderable;

        constructor() {
            this.players = [];
            for (let i = 0; i < MAX_PLAYERS; ++i)
                this.players.push(new Player(i));
            this.buttonHandlers = [];
            this.controllerEventHandlers = [];
            this.scoreHandlers = [];
            this.indicatorsVisible = false;
        }

        onButtonEvent(button: MultiplayerButton, event: ControllerButtonEvent, handler: (player: Player) => void) {
            const existing = this.getButtonHandler(button, event);

            if (existing) {
                existing.handler = handler;
                return;
            }

            this.buttonHandlers.push(new ButtonHandler(button, event, handler));

            for (const player of this.players) {
                getButton(player._getController(), button).onEvent(event, () => {
                    this.getButtonHandler(button, event).handler(player);
                })
            }
        }

        onControllerEvent(event: ControllerEvent, handler: (player: Player) => void) {
            const existing = this.getControllerEventHandler(event);

            if (existing) {
                existing.handler = handler;
                return;
            }

            this.controllerEventHandlers.push(new ControllerEventHandler(event, handler));

            for (const player of this.players) {
                player._getController().onEvent(event, () => {
                    this.getControllerEventHandler(event).handler(player);
                })
            }
        }

        onReachedScore(score: number, handler: (player: Player) => void) {
            const existing = this.getScoreHandler(score);

            if (existing) {
                existing.handler = handler;
                return;
            }

            this.scoreHandlers.push(new ScoreHandler(score, handler));

            for (const player of this.players) {
                player._getInfo().onScore(score, () => {
                    this.getScoreHandler(score).handler(player);
                })
            }
        }

        onLifeZero(handler: (player: Player) => void) {
            if (!this.lifeZeroHandler) {
                for (const player of this.players) {
                    player._getInfo().onLifeZero(() => {
                        this.lifeZeroHandler(player);
                    })
                }
            }
            this.lifeZeroHandler = handler;
        }

        setPlayerIndicatorsVisible(visible: boolean) {
            this.indicatorsVisible = visible;

            if (visible && !this.indicatorRenderable) {
                this.indicatorRenderable = scene.createRenderable(99, (target, camera) => {
                    if (this.indicatorsVisible) this.drawIndicators(target, camera);
                })
            }
        }

        getButtonHandler(button: MultiplayerButton, event: ControllerButtonEvent) {
            for (const handler of this.buttonHandlers) {
                if (handler.button === button && handler.event === event) return handler;
            }
            return undefined;
        }

        getControllerEventHandler(event: ControllerEvent) {
            for (const handler of this.controllerEventHandlers) {
                if (handler.event === event) return handler;
            }
            return undefined;
        }


        getScoreHandler(score: number) {
            for (const handler of this.scoreHandlers) {
                if (handler.target === score) return handler;
            }
            return undefined;
        }

        drawIndicators(target: Image, camera: scene.Camera) {
            for (const player of this.players) {
                const sprite = player.getSprite();

                if (!sprite || sprite.flags & (sprites.Flag.Destroyed | sprites.Flag.Invisible)) {
                    continue;
                }

                let top = Fx.toInt(sprite._hitbox.top)
                let bottom = Fx.toInt(sprite._hitbox.bottom)
                let left = Fx.toInt(sprite._hitbox.left)
                let right = Fx.toInt(sprite._hitbox.right)

                if (!(sprite.flags & sprites.Flag.RelativeToCamera)) {
                    top -= camera.drawOffsetY;
                    bottom -= camera.drawOffsetY;
                    left -= camera.drawOffsetX;
                    right -= camera.drawOffsetX;
                }

                if (left < 0) {
                    const indicator = _indicatorForPlayer(player.slot, CollisionDirection.Right);
                    target.drawTransparentImage(
                        indicator,
                        Math.max(right + 2, 0),
                        Math.min(
                            Math.max(
                                (top + ((bottom - top) >> 1) - (indicator.height >> 1)),
                                0
                            ),
                            screen.height - indicator.height
                        )
                    )
                }
                else if (right > 160) {
                    const indicator = _indicatorForPlayer(player.slot, CollisionDirection.Left);
                    target.drawTransparentImage(
                        indicator,
                        Math.min(left - indicator.width - 2, screen.width - indicator.width),
                        Math.min(
                            Math.max(
                                (top + ((bottom - top) >> 1) - (indicator.height >> 1)),
                                0
                            ),
                            screen.height - indicator.height
                        )
                    )
                }
                else if (top < 18) {
                    const indicator = _indicatorForPlayer(player.slot, CollisionDirection.Bottom);
                    target.drawTransparentImage(
                        indicator,
                        (left + ((right - left) >> 1) - (indicator.width >> 1)),
                        Math.max(bottom + 2, 0)
                    )
                }
                else {
                    const indicator = _indicatorForPlayer(player.slot, CollisionDirection.Top);
                    target.drawTransparentImage(
                        indicator,
                        (left + ((right - left) >> 1) - (indicator.width >> 1)),
                        Math.min(top - indicator.height - 2, screen.height - indicator.height)
                    )
                }
            }
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

    function getButton(ctrl: controller.Controller, button: MultiplayerButton) {
        switch (button) {
            case MultiplayerButton.A: return ctrl.A;
            case MultiplayerButton.B: return ctrl.B;
            case MultiplayerButton.Up: return ctrl.up;
            case MultiplayerButton.Right: return ctrl.right;
            case MultiplayerButton.Down: return ctrl.down;
            case MultiplayerButton.Left: return ctrl.left;
        }
    }

    //% blockId=mp_getPlayerSprite
    //% block="$player sprite"
    //% player.shadow=mp_getPlayerBySlot
    //% group=Sprites
    //% weight=100
    //% blockGap=8
    //% parts="multiplayer"
    export function getPlayerSprite(player: Player): Sprite {
        return player.getSprite();
    }

    //% blockId=mp_setPlayerSprite
    //% block="set $player sprite to $sprite"
    //% player.shadow=mp_getPlayerBySlot
    //% sprite.shadow=spritescreate
    //% group=Sprites
    //% weight=100
    //% blockGap=8
    //% parts="multiplayer"
    export function setPlayerSprite(player: Player, sprite: Sprite) {
        player.setSprite(sprite);
    }

    //% blockId=mp_moveWithButtons
    //% block="move $player with buttons||vx $vx vy $vy"
    //% player.shadow=mp_getPlayerBySlot
    //% vx.defl=100
    //% vy.defl=100
    //% vx.shadow="spriteSpeedPicker"
    //% vy.shadow="spriteSpeedPicker"
    //% expandableArgumentMode="toggle"
    //% inlineInputMode=inline
    //% group=Controller
    //% weight=100
    //% blockGap=8
    //% parts="multiplayer"
    export function moveWithButtons(player: Player, vx?: number, vy?: number) {
        player.moveWithButtons(vx, vy);
    }

    //% blockId=mp_onButtonEvent
    //% block="on $button button $event for $player"
    //% draggableParameters=reporter
    //% group=Controller
    //% weight=90
    //% blockGap=8
    //% parts="multiplayer"
    export function onButtonEvent(button: MultiplayerButton, event: ControllerButtonEvent, handler: (player: Player) => void) {
        _mpstate().onButtonEvent(button, event, handler);
    }

    //% blockId=mp_isButtonPressed
    //% block="is $player $button button pressed"
    //% player.shadow=mp_getPlayerBySlot
    //% group=Controller
    //% weight=80
    //% blockGap=8
    //% parts="multiplayer"
    export function isButtonPressed(player: Player, button: MultiplayerButton): boolean {
        return getButton(player._getController(), button).isPressed();
    }

    //% blockId=mp_onControllerEvent
    //% block="on $player $event"
    //% draggableParameters=reporter
    //% group=Controller
    //% weight=70
    //% blockGap=8
    //% parts="multiplayer"
    export function onControllerEvent(event: ControllerEvent, handler: (player: Player) => void) {
        _mpstate().onControllerEvent(event, handler);
    }

    //% blockId=mp_getPlayerState
    //% block="$player $state"
    //% player.shadow=mp_getPlayerBySlot
    //% state.shadow=mp_multiplayerstate
    //% group=Info
    //% weight=100
    //% blockGap=8
    //% parts="multiplayer"
    export function getPlayerState(player: Player, state: number): number {
        return player.getState(state);
    }

    //% blockId=mp_setPlayerState
    //% block="set $player $state to $value"
    //% player.shadow=mp_getPlayerBySlot
    //% state.shadow=mp_multiplayerstate
    //% group=Info
    //% weight=90
    //% blockGap=8
    //% parts="multiplayer"
    export function setPlayerState(player: Player, state: number, value: number) {
        player.setState(state, value);
    }

    //% blockId=mp_changePlayerStateBy
    //% block="change $player $state by $delta"
    //% player.shadow=mp_getPlayerBySlot
    //% state.shadow=mp_multiplayerstate
    //% deltaValue.defl=1
    //% group=Info
    //% weight=80
    //% blockGap=8
    //% parts="multiplayer"
    export function changePlayerStateBy(player: Player, state: number, delta: number) {
        player.setState(state, player.getState(state) + delta);
    }

    //% blockId=mp_getPlayerProperty
    //% block="$player $prop"
    //% player.shadow=mp_getPlayerBySlot
    //% group=Info
    //% weight=100
    //% blockGap=8
    //% parts="multiplayer"
    export function getPlayerProperty(player: Player, prop: PlayerProperty): number {
        return player.getProperty(prop);
    }

    //% blockId=mp_onScore
    //% block="on score $score for $player"
    //% score.defl=100
    //% draggableParameters=reporter
    //% group=Info
    //% weight=70
    //% blockGap=8
    //% parts="multiplayer"
    export function onScore(score: number, handler: (player: Player) => void) {
        _mpstate().onReachedScore(score, handler);
    }

    //% blockId=mp_onLifeZero
    //% block="on life zero for $player"
    //% draggableParameters=reporter
    //% group=Info
    //% weight=60
    //% blockGap=8
    //% parts="multiplayer"
    export function onLifeZero(handler: (player: Player) => void) {
        _mpstate().onLifeZero(handler);
    }

    //% blockId=mp_getPlayerBySlot
    //% block="$slot"
    //% group=Utility
    //% weight=80
    //% blockGap=8
    //% parts="multiplayer"
    export function getPlayerBySlot(slot: PlayerSlot): Player {
        const index = slot - 1;
        return getPlayerByIndex(index);
    }

    //% blockId=mp_getPlayerByIndex
    //% block="player from index $index"
    //% index.shadow=variables_get
    //% index.defl=index
    //% group=Utility
    //% weight=80
    //% blockGap=8
    //% parts="multiplayer"
    export function getPlayerByIndex(index: number): Player {
        if (index < 0 || index >= MAX_PLAYERS) return undefined;
        return _mpstate().players[index];
    }

    //% blockId=mp_getPlayerBySprite
    //% block="$sprite player"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% group=Sprites
    //% weight=90
    //% blockGap=8
    //% parts="multiplayer"
    export function getPlayerBySprite(sprite: Sprite): Player {
        for (const player of _mpstate().players) {
            if (player.getSprite() === sprite) return player;
        }
        return undefined;
    }

    //% blockId=mp_setPlayerIndicatorsVisible
    //% block="set player indicators $visible"
    //% visible.shadow=toggleOnOff
    //% visible.defl=true
    //% group=Utility
    //% weight=100
    //% blockGap=8
    //% parts="multiplayer"
    export function setPlayerIndicatorsVisible(visible: boolean) {
        _mpstate().setPlayerIndicatorsVisible(visible);
    }
}

