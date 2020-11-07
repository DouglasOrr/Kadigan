import Phaser from "phaser";

enum ShipState {
    Idle,
    Moving
}
const MoveFinishThreshold = 1.0;
const ShipSpeed = 50.0;
const DragThreshold = 10;
const ShipScale = 0.5;

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
    move(target: Phaser.Math.Vector2) {
        this.state = ShipState.Moving;
        this.target.copy(target);
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

    constructor() {
        super("game");
        this.ships = [];
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(): void {
        // Control
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onpointerdown, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onpointermove, this);
        this.input.on(Phaser.Input.Events.POINTER_UP, this.onpointerup, this);
        this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onpointerup, this);
        this.keySelectMultiple = this.input.keyboard.addKey("SHIFT");
        this.selectionBox = this.add.rectangle(60, 30, 1, 1, 0x8888ff, 0.25);

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
    update(): void {
        this.ships.forEach((ship) => ship.update());
    }
    // Control
    onpointerdown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            if (!this.keySelectMultiple.isDown) {
                this.ships.forEach((ship) => ship.select(false));
            }
            this.selectionBox.x = pointer.x;
            this.selectionBox.y = pointer.y;
            this.selectionBox.width = 0;
            this.selectionBox.height = 0;
            this.selectionBox.visible = true;
        }
    }
    onpointermove(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            this.selectionBox.width = pointer.x - this.selectionBox.x;
            this.selectionBox.height = pointer.y - this.selectionBox.y;
        }
    }
    onpointerup(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonReleased()) {
            const selectionWidth = Math.abs(pointer.x - this.selectionBox.x);
            const selectionHeight = Math.abs(pointer.y - this.selectionBox.y);
            const isBox = DragThreshold < selectionWidth || DragThreshold < selectionHeight;
            const selected = (this.selectionBox.visible && isBox)
                ? this.physics.overlapRect(
                    Math.min(pointer.x, this.selectionBox.x),
                    Math.min(pointer.y, this.selectionBox.y),
                    selectionWidth, selectionHeight
                ) : this.physics.overlapCirc(pointer.position.x, pointer.position.y, 0);
            selected.forEach((obj) => {
                (<Ship>obj.gameObject).select(true);
            });
            this.selectionBox.visible = false;
        }
        const inBounds = Phaser.Geom.Rectangle.Contains(
            this.physics.world.bounds, pointer.x, pointer.y
        );
        if (pointer.rightButtonReleased() && inBounds) {
            this.ships.forEach((ship) => {
                if (ship.selected) {
                    ship.move(pointer.position);
                }
            });
        }
    }
}
