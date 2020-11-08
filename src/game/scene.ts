import Phaser from "phaser";
import {Ship, Celestial, Orbit} from "./objects";

const DragThreshold = 10;
const PanThreshold = 30;
const PanSpeed = 0.5;
const ZoomRatio = 1.2;

type Settings = {
    pointerPan: boolean
};

export function defaultSettings(): Settings {
    return {
        pointerPan: true
    };
}

export default class GameScene extends Phaser.Scene {
    settings: Settings;
    ships: Ship[];
    celestials: Celestial[];
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
        this.ships = [];
        this.celestials = [];
        this.currentZoom = 0;

        // Control
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUpOutside, this);
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this);
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
        const planet = this.spawnCelestial(500, new Phaser.Math.Vector2(0, 0));
        this.spawnCelestial(50, {center: planet, radius: 1200, angle: 0, clockwise: true});
        this.spawnCelestial(50, {center: planet, radius: 1700, angle: Math.PI, clockwise: false});
        this.spawnShip(-20, 1000);
        this.spawnShip(0, 1030);
        this.spawnShip(20, 1000);
        this.cameras.main.centerOn(0, 700);
        this.baseZoom = 0.4;
        this.changeZoom(0);
    }
    spawnShip(x: number, y: number): void {
        const ship = new Ship(this, x, y);
        this.ships.push(ship);
        this.add.existing(ship);
        this.physics.add.existing(ship);
    }
    spawnCelestial(radius: number, location: Orbit | Phaser.Math.Vector2): Celestial {
        const celestial = new Celestial(this, radius, location);
        this.celestials.push(celestial);
        this.add.existing(celestial);
        return celestial;
    }
    update(_time: number, delta: number): void {
        this.updateCamera(delta);
        this.ships.forEach((ship) => ship.update());
        this.celestials.forEach((celestial) => celestial.update(delta/1000));
    }
    // Control
    changeZoom(delta: integer): void {
        this.currentZoom += delta;
        this.cameras.main.setZoom(this.baseZoom * Math.pow(ZoomRatio, this.currentZoom));
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
                this.ships.forEach((ship) => ship.select(false));
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
                (<Ship>obj.gameObject).select(true);
            });
            this.selectionBox.visible = false;
        }
    }
    onPointerUp(pointer: Phaser.Input.Pointer): void {
        this.onPointerUpOutside(pointer);
        if (pointer.rightButtonReleased()) {
            this.ships.forEach((ship) => {
                if (ship.selected) {
                    ship.move(pointer.worldX, pointer.worldY);
                }
            });
        }
    }
    onPointerWheel(pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number): void {
        const delta = -Math.sign(dz);
        this.changeZoom(delta);

        // Scroll the display, so that we keep the pointer world location constant during zoom
        const scale = (1 - Math.pow(ZoomRatio, -delta));
        const camera = this.cameras.main;
        camera.scrollX += scale * (pointer.worldX - camera.worldView.centerX);
        camera.scrollY += scale * (pointer.worldY - camera.worldView.centerY);
    }
}
