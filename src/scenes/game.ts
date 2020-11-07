import Phaser from "phaser";

enum ShipState {
    Idle,
    Moving
}
const MoveFinishThreshold = 1.0;
const ShipSpeed = 50.0;
const DragThreshold = 10;
const ShipScale = 0.5;
const ZoomRatio = 1.2;

class Ship extends Phaser.GameObjects.Sprite {
    state: ShipState;
    target: Phaser.Math.Vector2;
    selected: boolean;

    constructor(scene, x, y) {
        super(scene, x, y, "ship");
        this.setScale(ShipScale, ShipScale);
        this.state = ShipState.Idle;
        this.target = new Phaser.Math.Vector2();
        this.selected = false;
    }
    select(selected: boolean) {
        this.setTint(selected ? 0xffff00 : 0xffffff);
        this.selected = selected;
    }
    move(x: number, y: number) {
        this.state = ShipState.Moving;
        this.target.set(x, y);
    }
    update() {
        if (this.state == ShipState.Moving) {
            const body = <Phaser.Physics.Arcade.Body>this.body;
            body.velocity.copy(this.target).subtract(body.center);
            if (body.velocity.length() < MoveFinishThreshold) {
                this.state = ShipState.Idle;
                body.velocity.reset();
            } else {
                body.velocity.normalize().scale(ShipSpeed);
            }
        }
    }
}

export default class GameScene extends Phaser.Scene {
    ships: Ship[];
    keySelectMultiple: Phaser.Input.Keyboard.Key;
    selectionBox: Phaser.GameObjects.Rectangle;
    cameraKeyControls: Phaser.Cameras.Controls.SmoothedKeyControl;
    currentZoom: integer

    constructor() {
        super("game");
        this.ships = [];
        this.currentZoom = 0;
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(): void {
        // Control
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUpOutside, this);
        this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onPointerWheel, this);
        this.keySelectMultiple = this.input.keyboard.addKey("SHIFT");
        this.selectionBox = this.add.rectangle(60, 30, 1, 1, 0x8888ff, 0.25);

        const cursors = this.input.keyboard.createCursorKeys();
        this.cameraKeyControls = new Phaser.Cameras.Controls.SmoothedKeyControl({
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            acceleration: 0.06,
            drag: 0.0005,
            maxSpeed: 1.0
        });

        // Demo scene
        this.spawn(100, 200);
        this.spawn(300, 300);
        this.spawn(200, 400);
    }
    spawn(x: number, y: number): void {
        const ship = new Ship(this, x, y);
        this.ships.push(ship);
        this.add.existing(ship);
        this.physics.add.existing(ship);
    }
    update(_time: number, delta: number): void {
        this.ships.forEach((ship) => ship.update());
        this.cameraKeyControls.update(delta);
    }
    // Control
    onPointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            if (!this.keySelectMultiple.isDown) {
                this.ships.forEach((ship) => ship.select(false));
            }
            this.selectionBox.x = pointer.worldX;
            this.selectionBox.y = pointer.worldY;
            this.selectionBox.width = 0;
            this.selectionBox.height = 0;
            this.selectionBox.visible = true;
        }
    }
    onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            this.selectionBox.width = pointer.worldX - this.selectionBox.x;
            this.selectionBox.height = pointer.worldY - this.selectionBox.y;
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
        const camera = this.cameras.main;
        const delta = -Math.sign(dz);
        this.currentZoom += delta;
        camera.setZoom(Math.pow(ZoomRatio, this.currentZoom));

        // Scroll the display, so that we keep the pointer world location constant during zoom
        const scale = (1 - Math.pow(ZoomRatio, -delta));
        camera.scrollX += scale * (pointer.worldX - camera.worldView.centerX);
        camera.scrollY += scale * (pointer.worldY - camera.worldView.centerY);
    }
}
