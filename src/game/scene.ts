import Phaser from "phaser";
import * as objects from "./objects";
import * as player from "./player";
import * as unitai from "./unitai";
import * as playerai from "./playerai";
import * as maps from "./maps";
import * as sound from "./sound";
import * as keys from "./keys";
import HudScene from "./hudscene";

const DragThreshold = 10;
const PanThreshold = 30;
const PanSpeed = 500;  // au/s (at zoom=1)
const WheelZoom = 1.2;
const ZoomSpeed = 10;  // /s
const MinDisplayWidth = 500;  // au
const MaxDisplayWidth = 10000;  // au
const FogTextureDownscale = 2;

export interface Settings {
    // General settings
    map: string;
    aidifficulty: playerai.Difficulty;
    aibonus: number;
    pointerPan: boolean;
    // Dev settings
    fog: boolean;
    debugAi: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    map: maps.MapList[0].name,
    aidifficulty: playerai.Difficulty.Medium,
    aibonus: 1,
    pointerPan: false,
    fog: true,
    debugAi: false,
};

export function parseSettings(settings: Settings, params: URLSearchParams): void {
    if (params.has("map")) {
        settings.map = params.get("map");
    }
    if (params.has("aidifficulty")) {
        settings.aidifficulty = {
            easy: playerai.Difficulty.Easy,
            medium: playerai.Difficulty.Medium,
            hard: playerai.Difficulty.Hard
        }[params.get("aidifficulty")];
    }
    if (params.has("aibonus")) {
        settings.aibonus = parseFloat(params.get("aibonus"));
    }
    if (params.has("pointerpan")) {
        settings.pointerPan = {true: true, false: false}[params.get("pointerpan")];
    }
    if (params.has("fog")) {
        settings.fog = {true: true, false: false}[params.get("fog")];
    }
    if (params.has("debugai")) {
        settings.debugAi = {true: true, false: false}[params.get("debugai")];
    }
}

export default class GameScene extends Phaser.Scene {
    settings: Settings;
    paused: boolean;
    gameTime: integer;

    map: maps.Map;
    ships: Phaser.GameObjects.Group;
    players: player.Player[];
    enemyAi: playerai.PlayerAI;
    commandLines: Phaser.GameObjects.Group;
    lazerLines: Phaser.GameObjects.Group;
    fog: Phaser.GameObjects.RenderTexture;

    playlist: sound.Playlist;
    sounds: sound.Sounds;

    selectionBox: Phaser.GameObjects.Rectangle;
    panStartPosition: Phaser.Math.Vector2;
    panStartScroll: Phaser.Math.Vector2;
    hudDeadZoneWidth: number;
    hudDeadZoneHeight: number;
    keys: keys.Keys;

    constructor() {
        super("game");
    }
    preload(): void {
        this.load.spritesheet("ship", "/assets/ship0.png", {frameWidth: 64});
        this.load.image("glow", "/assets/glow0.png");
        this.load.glsl("radial", "/assets/radial.frag");
        sound.preload(this.load);
    }
    create(data: Settings): void {
        this.settings = data;
        this.paused = false;
        this.gameTime = 0;

        // Custom pipeline
        const shader = <Phaser.Display.BaseShader>this.cache.shader.get("radial");
        const pipeline = new Phaser.Renderer.WebGL.Pipelines.TextureTintPipeline({
            game: this.game,
            renderer: this.game.renderer,
            fragShader: shader.fragmentSrc,
        });
        const renderer = <Phaser.Renderer.WebGL.WebGLRenderer>this.game.renderer;
        renderer.addPipeline("radial", pipeline);

        // Control
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUpOutside, this);
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this);

        this.keys = keys.addKeys(this.input.keyboard);
        this.keys.setSpendingMax.on("down", () => this.events.emit("setplayerspending", 1.), this);
        this.keys.setSpendingMin.on("down", () => this.events.emit("setplayerspending", 0.), this);
        this.keys.holdProduction.on("down", () => this.events.emit("toggleplayerholdproduction"), this);
        this.keys.toggleFullScreen.on("down", () => this.scale.toggleFullscreen(), this);
        this.keys.togglePause.on("down", this.togglePause, this);
        this.keys.showDebug.on("down", this.showDebug, this);

        this.selectionBox = this.add.rectangle(60, 30, 1, 1, 0x8888ff, 0.25)
            .setVisible(false);
        this.panStartPosition = new Phaser.Math.Vector2();
        this.panStartScroll = new Phaser.Math.Vector2();

        // Sound & effects
        this.playlist = new sound.Playlist(this)
        this.playlist.play();
        this.sounds = new sound.Sounds(this);
        this.events.on("lazerfired", (src: objects.Ship, dest: objects.Ship) => {
            (<objects.ShipLazerLine>this.lazerLines.get()).set(src, dest);
        }, this);

        // Map
        this.ships = this.add.group({classType: () => new objects.Ship(this, this.map.celestials)});
        this.map = maps.create(this.settings.map, this, this.ships);
        // this.map = maps.aiTestDemo(this, this.ships);
        this.map.celestials.forEach(c => {this.add.existing(c);});
        const playerMoon = this.map.celestials.find(c => c.unit.player === unitai.PlayerId.Player);
        const enemyMoon = this.map.celestials.find(c => c.unit.player === unitai.PlayerId.Enemy);
        const neutralMoons = this.map.celestials.filter(c => c.unit.player === unitai.PlayerId.Neutral);

        // Objects
        this.players = [
            new player.ActivePlayer(this, unitai.PlayerId.Player, playerMoon, 1),
            new player.ActivePlayer(this, unitai.PlayerId.Enemy, enemyMoon, this.settings.aibonus),
            ...neutralMoons.map(c => new player.NeutralPlayer(this, c)),
        ];
        this.enemyAi = new playerai.PlayerAI(
            this, <player.ActivePlayer>this.players[1], this.map.celestials,
            this.settings.aidifficulty, this.settings.debugAi);
        this.commandLines = this.add.group({classType: objects.ShipCommandLine});
        this.lazerLines = this.add.group({classType: objects.ShipLazerLine});

        // Camera
        const camera = this.cameras.main;
        camera.centerOn(playerMoon.x, playerMoon.y);
        camera.zoom = 0.4;
        this.fog = this.add.renderTexture(
            0, 0, camera.width / FogTextureDownscale, camera.height / FogTextureDownscale
        ).setOrigin(0.5, 0.5).setDepth(objects.Depth.Fog).setAlpha(0.6);

        // Start child scenes
        this.scene.manager.start("starfield", this).sendToBack("starfield");
        this.scene.manager.start("hud", {player: this.players[unitai.PlayerId.Player]});

        this.hudDeadZoneWidth = 0;
        this.hudDeadZoneHeight = 0;
        this.scene.manager.getScene("hud").events.on("create", (scene: HudScene) => {
            // HUD is fixed size (at time of writing)
            this.hudDeadZoneWidth = scene.hud.width;
            this.hudDeadZoneHeight = scene.hud.height;
        }, this);

        // Wire up events
        this.game.events.on("prerender", this.preRender, this);
        this.scale.on("resize", () => {
            const camera = this.cameras.main;
            this.fog.resize(camera.width / FogTextureDownscale, camera.height / FogTextureDownscale);
        }, this);
        this.time.addEvent({
            delay: 1000,
            callback: this.tickEconomy,
            callbackScope: this,
            loop: true,
        });
        this.time.addEvent({
            delay: 200,
            callback: this.tickAi,
            callbackScope: this,
            loop: true,
        });
        this.events.on("setplayerspending", this.setPlayerSpending, this);
        this.events.on("toggleplayerholdproduction", this.togglePlayerHoldProduction, this);
        this.events.on("conquercelestial", this.onConquerCelestial, this);
        this.events.on("togglemusic", this.playlist.setPlaying, this.playlist);
        this.events.on("togglesounds", this.sounds.setEnabled, this.sounds);
        this.events.on("togglepointerpan", (value: boolean) => this.settings.pointerPan = value, this);
        this.events.emit("updatecamera", this.cameras.main);
        this.events.emit("tickeconomy", this.gameTime);
    }
    // Main loop
    tickEconomy(): void {
        this.players.forEach(player => player.updateEconomy());
        this.gameTime += 1;
        this.events.emit("tickeconomy", this.gameTime);
    }
    tickAi(): void {
        const aiShips = [];
        const visibleShips = [];
        this.ships.children.iterate((ship: objects.Ship) => {
            if (ship.active) {
                if (ship.unit.player === unitai.PlayerId.Enemy) {
                    aiShips.push(ship);
                } else if (ship.visibleToEnemy) {
                    visibleShips.push(ship);
                }
            }
        });
        this.enemyAi.update(this.gameTime, aiShips, visibleShips);
    }
    preRender(): void {
        const camera = this.cameras.main;
        this.fog.setPosition(
            camera.scrollX + camera.width*.5, camera.scrollY + camera.height*.5
        ).setScale(camera.displayWidth / this.fog.width);
        this.fog.camera.setScroll(
            camera.scrollX + (camera.width - this.fog.camera.width) * 0.5,
            camera.scrollY + (camera.height - this.fog.camera.height) * 0.5,
        ).setZoom(camera.zoom * this.fog.camera.width / camera.width);

        const visions = [];
        this.ships.children.iterate((obj: objects.Ship) => {
            if (obj.visible) {
                // Sync background position sync here too (for efficiency), since `preRender
                // is the right place to do this
                obj.syncBackgroundPosition();
                if (obj.unit.player === unitai.PlayerId.Player) {
                    visions.push(obj.vision.setPosition(obj.x, obj.y));
                }
            }
        });
        this.map.celestials.forEach(celestial => {
            if (celestial.unit.player === unitai.PlayerId.Player) {
                visions.push(celestial.vision.setPosition(celestial.x, celestial.y));
            }
        });

        this.fog.fill(0x202020, 1, 0, 0,
            this.fog.width * FogTextureDownscale, this.fog.height * FogTextureDownscale);
        this.fog.erase(visions);
    }
    update(_time: number, delta: number): void {
        const dt = delta / 1000;
        this.updateCamera(dt);
        if (this.keys.selectAll.isDown) {
            this.selectAll();
        }
        if (!this.paused) {
            this.map.celestials.forEach((celestial) => {
                celestial.update(dt);
            });
            this.ships.children.iterate((ship: objects.Ship) => {
                if (ship.active) {
                    ship.update(dt, this.settings.fog);
                }
            });
            this.commandLines.children.iterate((line: objects.ShipCommandLine) => {
                if (line.active) {
                    line.update();
                }
            });
            this.lazerLines.children.iterate((line: objects.ShipLazerLine) => {
                if (line.active) {
                    line.update(dt);
                }
            });
        }
    }
    // Control
    setPlayerSpending(value: number): void {
        const player = <player.ActivePlayer>this.players[unitai.PlayerId.Player];
        player.account.spending = Phaser.Math.Clamp(value, 0, 1);
        this.events.emit("playerspendingchanged", player.account.spending);
    }
    togglePlayerHoldProduction(): void {
        const player = <player.ActivePlayer>this.players[unitai.PlayerId.Player];
        player.account.hold = !player.account.hold;
        this.events.emit("playerholdproductionchanged", player.account.hold);
    }
    togglePause(): void {
        // We don't want to use scene.pause() because we still want a bit of interaction,
        // camera movement, etc.
        this.paused = !this.paused;
        if (this.paused) {
            this.physics.pause();
            this.time.paused = true;
        } else {
            this.physics.resume();
            this.time.paused = false;
        }
    }
    onConquerCelestial(winner: unitai.PlayerId): void {
        this.scene.manager.start("end", {winner: winner === unitai.PlayerId.Player ? 1 : -1});
        this.scene.setActive(false);
    }
    changeZoom(delta: number): void {
        const camera = this.cameras.main;
        camera.setZoom(Phaser.Math.Clamp(camera.zoom * delta,
            camera.width / MaxDisplayWidth, camera.width / MinDisplayWidth));
    }
    updateCamera(dt: number): void {
        const camera = this.cameras.main;
        const delta = PanSpeed * dt / camera.zoom;

        const px = this.input.activePointer.x;
        const py = this.input.activePointer.y;

        const pointerPan = this.settings.pointerPan &&
            !((px > camera.x + camera.width - this.hudDeadZoneWidth)
              && (py > camera.y + camera.height - this.hudDeadZoneHeight));

        const left = this.keys.panLeft.isDown || (pointerPan && px < camera.x + PanThreshold);
        const right = this.keys.panRight.isDown || (pointerPan && px > camera.x + camera.width - PanThreshold);
        const panX = (+right - +left)
        camera.scrollX = Phaser.Math.Clamp(
            camera.scrollX + delta * panX,
            this.map.bounds.left - camera.width*0.5,
            this.map.bounds.right - camera.width*0.5,
        );

        const up = this.keys.panUp.isDown || (pointerPan && py < camera.y + PanThreshold);
        const down = this.keys.panDown.isDown || (pointerPan && py > camera.y + camera.height - PanThreshold);
        const panY = (+down - +up);
        camera.scrollY = Phaser.Math.Clamp(
            camera.scrollY + delta * panY,
            this.map.bounds.top - camera.height*0.5,
            this.map.bounds.bottom - camera.height*0.5,
        );

        const zoom = +this.keys.zoomIn.isDown - +this.keys.zoomOut.isDown;
        if (zoom !== 0) {
            this.changeZoom(ZoomSpeed ** (dt * zoom));
        }

        if (panX !== 0 || panY !== 0 || zoom !== 0) {
            this.events.emit("updatecamera", this.cameras.main);
        }
    }
    selectAll(): void {
        this.commandLines.children.iterate((line: objects.ShipCommandLine) => {
            line.unset();
        })
        this.ships.children.iterate((ship: objects.Ship) => {
            if (ship.unit.player === unitai.PlayerId.Player) {
                ship.select(true);
                (<objects.ShipCommandLine>this.commandLines.get()).set(ship);
            }
        });
    }
    onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            if (!this.keys.selectMultiple.isDown) {
                this.ships.children.iterate((ship: objects.Ship) => {
                    if (ship.active) {
                        ship.select(false);
                    }
                });
                this.commandLines.children.iterate((line: objects.ShipCommandLine) => {
                    if (line.active) {
                        line.unset();
                    }
                });
            }
            this.selectionBox.x = pointer.worldX;
            this.selectionBox.y = pointer.worldY;
            this.selectionBox.width = 0;
            this.selectionBox.height = 0;
            this.selectionBox.visible = true;
        }
        if (pointer.middleButtonDown()) {
            this.panStartPosition.set(pointer.x, pointer.y);
            this.panStartScroll.set(this.cameras.main.scrollX, this.cameras.main.scrollY);
        }
    }
    onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            this.selectionBox.width = pointer.worldX - this.selectionBox.x;
            this.selectionBox.height = pointer.worldY - this.selectionBox.y;
        }
        if (pointer.middleButtonDown()) {
            const camera = this.cameras.main;
            camera.setScroll(
                this.panStartScroll.x - (pointer.x - this.panStartPosition.x) / camera.zoom,
                this.panStartScroll.y - (pointer.y - this.panStartPosition.y) / camera.zoom
            );
        }
    }
    onPointerUpOutside(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonReleased()) {
            const selectionWidth = Math.abs(pointer.worldX - this.selectionBox.x);
            const selectionHeight = Math.abs(pointer.worldY - this.selectionBox.y);
            const isBox = DragThreshold < selectionWidth || DragThreshold < selectionHeight;
            const selected = (this.selectionBox.visible && isBox)
                ? this.physics.overlapRect(
                    Math.min(pointer.worldX, this.selectionBox.x),
                    Math.min(pointer.worldY, this.selectionBox.y),
                    selectionWidth, selectionHeight
                ) : this.physics.overlapCirc(pointer.worldX, pointer.worldY, 0);
            selected.forEach((obj) => {
                const ship = <objects.Ship>obj.gameObject;
                if (ship.active && ship.unit.player === unitai.PlayerId.Player) {
                    ship.select(true);
                    (<objects.ShipCommandLine>this.commandLines.get()).set(ship);
                }
            });
            this.selectionBox.visible = false;
        }
    }
    onPointerUp(pointer: Phaser.Input.Pointer): void {
        this.onPointerUpOutside(pointer);
        if (pointer.rightButtonReleased()) {
            const selectedCelstial = this.map.celestials.find((c) =>
                Phaser.Math.Distance.Between(c.x, c.y, pointer.worldX, pointer.worldY) < c.unit.radius
            );
            this.ships.children.iterate((ship: objects.Ship) => {
                if (ship.active && ship.selected) {
                    if (selectedCelstial !== undefined) {
                        ship.commander.orbit(selectedCelstial.unit);
                    } else {
                        ship.commander.patrol(pointer.worldX, pointer.worldY);
                    }
                }
            });
            this.events.emit("playercommand");
        }
    }
    onPointerWheel(pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number): void {
        const camera = this.cameras.main;
        const originalZoom = camera.zoom;
        const originalX = camera.x;
        const originalY = camera.y;
        this.changeZoom(WheelZoom ** -Math.sign(dz));

        // Scroll the display, so that we keep the pointer world location constant during zoom
        const scale = 1 - originalZoom / camera.zoom;
        const dx = (camera.x / camera.zoom - originalX / originalZoom);
        const dy = (camera.y / camera.zoom - originalY / originalZoom);
        camera.scrollX += dx + scale * (pointer.worldX - camera.worldView.centerX);
        camera.scrollY += dy + scale * (pointer.worldY - camera.worldView.centerY);

        this.events.emit("updatecamera", camera);
    }
    // Dev
    showDebug(): void {
        const camera = this.cameras.main;
        console.log({
            fps: this.game.loop.actualFps,
            camera: {
                zoom: camera.zoom,
                center: {x: camera.centerX, y: camera.centerY},
            },
        });
    }
}
