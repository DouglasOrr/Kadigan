import Phaser from "phaser";
import * as objects from "./objects";
import * as player from "./player";
import * as unitai from "./unitai";
import * as maps from "./maps";

const DragThreshold = 10;
const PanThreshold = 30;
const PanSpeed = 500;   // au/s (at zoom=1)
const WheelZoom = 1.2;
const ZoomSpeed = 10;   // /s
const MinDisplayWidth = 500;   // au
const MaxDisplayWidth = 10000;  // au
const FogTextureDownscale = 2;

interface Settings {
    pointerPan: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    pointerPan: true
};

export default class GameScene extends Phaser.Scene {
    settings: Settings;
    paused: boolean;

    map: maps.Map;
    ships: Phaser.GameObjects.Group;
    players: player.Player[];
    commandLines: Phaser.GameObjects.Group;
    lazerLines: Phaser.GameObjects.Group;
    fog: Phaser.GameObjects.RenderTexture;

    selectionBox: Phaser.GameObjects.Rectangle;
    panStartPosition: Phaser.Math.Vector2;
    panStartScroll: Phaser.Math.Vector2;
    keys: {
        selectMultiple: Phaser.Input.Keyboard.Key,
        panLeft: Phaser.Input.Keyboard.Key,
        panRight: Phaser.Input.Keyboard.Key,
        panUp: Phaser.Input.Keyboard.Key,
        panDown: Phaser.Input.Keyboard.Key,
        zoomIn: Phaser.Input.Keyboard.Key,
        zoomOut: Phaser.Input.Keyboard.Key
    };

    constructor() {
        super("game");
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(data: Settings): void {
        this.settings = data;
        this.paused = false;

        // Control
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUpOutside, this);
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this);

        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on("down", () => this.scale.toggleFullscreen(), this);
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O).on("down", this.showDebug, this);
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", this.togglePause, this);
        this.keys = {
            selectMultiple: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
            zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            panLeft: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            panRight: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            panUp: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            panDown: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        };
        this.selectionBox = this.add.rectangle(60, 30, 1, 1, 0x8888ff, 0.25)
            .setVisible(false);
        this.panStartPosition = new Phaser.Math.Vector2();
        this.panStartScroll = new Phaser.Math.Vector2();

        // Map
        this.map = maps.originalDemo(this);
        this.map.celestials.forEach(c => { this.add.existing(c); });
        const playerMoon = this.map.celestials.find(c => c.unit.player === unitai.PlayerId.Player);
        const enemyMoon = this.map.celestials.find(c => c.unit.player === unitai.PlayerId.Enemy);
        this.cameras.main.centerOn(playerMoon.x, playerMoon.y);
        this.cameras.main.zoom = 0.4;

        // Objects
        this.ships = this.add.group({classType: () => new objects.Ship(this, this.map.celestials)});
        this.players = [
            new player.Player(unitai.PlayerId.Player, playerMoon, this.ships),
            new player.Player(unitai.PlayerId.Enemy, enemyMoon, this.ships),
        ];
        this.commandLines = this.add.group({classType: objects.ShipCommandLine});
        this.lazerLines = this.add.group({classType: objects.ShipLazerLine});

        // Fog of war
        const camera = this.cameras.main;
        this.fog = this.add.renderTexture(
            0, 0, camera.width / FogTextureDownscale, camera.height / FogTextureDownscale
        ).setOrigin(0.5, 0.5).setDepth(-1).setAlpha(0.6);

        // Wire up events
        this.scene.manager.start("starfield").sendToBack("starfield");
        this.scene.manager.start("hud", {player: this.players[unitai.PlayerId.Player]});
        this.game.events.on("prerender", this.preRender, this);
        this.scale.on("resize", () => {
            const camera = this.cameras.main;
            this.fog.resize(camera.width / FogTextureDownscale, camera.height / FogTextureDownscale);
        }, this);
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.paused) {
                    this.players.forEach(player => player.updateEconomy());
                }
            },
            callbackScope: this,
            loop: true,
        });
        this.events.emit("updatecamera", this.cameras.main);
    }
    // Main loop
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
            if (obj.unit.player === unitai.PlayerId.Player) {
                visions.push(obj.vision.setPosition(obj.x, obj.y));
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
    update(_time: number, delta: number): void {
        const dt = delta / 1000;
        this.updateCamera(dt);
        if (!this.paused) {
            this.map.celestials.forEach((celestial) => {
                celestial.update(dt);
            });
            this.ships.children.iterate((ship: objects.Ship) => {
                if (ship.active) {
                    ship.update(dt, this.map.celestials, this.lazerLines);
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
    togglePause(): void {
        this.paused = !this.paused;
        if (this.paused) {
            this.physics.pause();
        } else {
            this.physics.resume();
        }
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
        const left = this.keys.panLeft.isDown || (
            this.settings.pointerPan && px < camera.x + PanThreshold);
        const right = this.keys.panRight.isDown || (
            this.settings.pointerPan && px > camera.x + camera.width - PanThreshold);
        const panX = (+right - +left)
        camera.scrollX = Phaser.Math.Clamp(
            camera.scrollX + delta * panX,
            this.map.bounds.left - camera.width*0.5,
            this.map.bounds.right - camera.width*0.5,
        );

        const py = this.input.activePointer.y;
        const up = this.keys.panUp.isDown || (
            this.settings.pointerPan && py < camera.y + PanThreshold);
        const down = this.keys.panDown.isDown || (
            this.settings.pointerPan && py > camera.y + camera.height - PanThreshold);
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
}
