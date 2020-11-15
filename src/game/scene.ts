import Phaser from "phaser";
import * as objects from "./objects";

const DragThreshold = 10;
const PanThreshold = 30;
const PanSpeed = 1.0;
const ZoomRatio = 1.2;
const MinZoom = -6;
const MaxZoom = 6;

interface Settings {
    pointerPan: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    pointerPan: true
};

export default class GameScene extends Phaser.Scene {
    settings: Settings;
    paused: boolean;

    celestials: objects.Celestial[];
    ships: Phaser.GameObjects.Group;
    commandLines: Phaser.GameObjects.Group;
    lazerLines: Phaser.GameObjects.Group;

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
    bounds: Phaser.Geom.Rectangle;
    baseZoom: number;
    currentZoom: integer;

    constructor() {
        super("game");
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(data: Settings): void {
        this.settings = data;
        this.paused = false;

        this.celestials = [];
        this.ships = this.add.group({classType: () => new objects.Ship(this, this.celestials)});
        this.commandLines = this.add.group({classType: objects.ShipCommandLine});
        this.lazerLines = this.add.group({classType: objects.ShipLazerLine});

        // Control
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUpOutside, this);
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this);
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", this.togglePause, this);
        this.keys = {
            selectMultiple: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
            zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
            zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N),
            panLeft: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            panRight: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            panUp: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            panDown: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        };
        this.selectionBox = this.add.rectangle(60, 30, 1, 1, 0x8888ff, 0.25);
        this.panStartPosition = new Phaser.Math.Vector2();
        this.panStartScroll = new Phaser.Math.Vector2();

        // Demo scene
        const planet = this.spawnCelestial(500, new Phaser.Math.Vector2(0, 0), 2);
        const playerMoon = this.spawnCelestial(50, {
            center: planet, radius: 1200, angle: Math.PI/2, clockwise: true}, 0);
        const enemyMoon = this.spawnCelestial(50, {
            center: planet, radius: 1700, angle: -Math.PI/2, clockwise: false}, 1);
        for (let i = 0; i < 20; ++i) {
            playerMoon.spawn(this.ships);
        }
        for (let i = 0; i < 10; ++i) {
            enemyMoon.spawn(this.ships);
        }

        // Camera
        this.bounds = new Phaser.Geom.Rectangle(-2000, -2000, 4000, 4000);
        this.cameras.main.setBounds(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
        this.cameras.main.centerOn(0, 700);
        this.currentZoom = 0;
        this.baseZoom = 0.4;
        this.changeZoom(0);
    }
    spawnCelestial(radius: number, location: objects.Orbit | Phaser.Math.Vector2, player: number): objects.Celestial {
        const celestial = new objects.Celestial(this, radius, location, player);
        this.celestials.push(celestial);
        this.add.existing(celestial);
        return celestial;
    }
    update(_time: number, delta: number): void {
        this.updateCamera(delta);
        const dt = delta / 1000;
        if (!this.paused) {
            this.celestials.forEach((celestial) => { celestial.update(dt); });
            this.ships.children.iterate((ship: objects.Ship) => {
                if (ship.active) {
                    ship.update(dt, this.celestials, this.lazerLines);
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
    changeZoom(delta: integer): void {
        if (MinZoom <= this.currentZoom + delta && this.currentZoom + delta <= MaxZoom) {
            const camera = this.cameras.main;
            this.currentZoom += delta;
            camera.setZoom(this.baseZoom * Math.pow(ZoomRatio, this.currentZoom));
            camera.x = Math.max(0, (camera.width - camera.zoom * this.bounds.width)/2);
            camera.y = Math.max(0, (camera.height - camera.zoom * this.bounds.height)/2);
        }
    }
    updateCamera(delta: number): void {
        const camera = this.cameras.main;
        const px = this.input.activePointer.x;
        if (this.keys.panLeft.isDown ||
            (this.settings.pointerPan && px < camera.x + PanThreshold)) {
            camera.scrollX -= PanSpeed * delta;
        }
        if (this.keys.panRight.isDown ||
            (this.settings.pointerPan && px > camera.x + camera.width - PanThreshold)) {
            camera.scrollX += PanSpeed * delta;
        }
        const py = this.input.activePointer.y;
        if (this.keys.panUp.isDown ||
            (this.settings.pointerPan && py < camera.y + PanThreshold)) {
            camera.scrollY -= PanSpeed * delta;
        }
        if (this.keys.panDown.isDown ||
            (this.settings.pointerPan && py > camera.y + camera.height - PanThreshold)) {
            camera.scrollY += PanSpeed * delta;
        }
        if (this.keys.zoomIn.isDown) {
            this.changeZoom(1);
        }
        if (this.keys.zoomOut.isDown) {
            this.changeZoom(-1);
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
                if (ship.active && ship.unit.player == 0) {
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
            const selectedCelstial = this.celestials.find((c) =>
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
        this.changeZoom(-Math.sign(dz));

        // Scroll the display, so that we keep the pointer world location constant during zoom
        const scale = 1 - originalZoom / camera.zoom;
        const dx = (camera.x / camera.zoom - originalX / originalZoom);
        const dy = (camera.y / camera.zoom - originalY / originalZoom);
        camera.scrollX += dx + scale * (pointer.worldX - camera.worldView.centerX);
        camera.scrollY += dy + scale * (pointer.worldY - camera.worldView.centerY);
    }
}
