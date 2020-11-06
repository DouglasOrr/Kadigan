import Phaser from "phaser";

enum ShipState {
    Idle,
    Moving
}
const MoveFinishThreshold = 1.0;
const ShipSpeed = 50.0;

class Ship extends Phaser.GameObjects.Sprite {
    state: ShipState;
    target: Phaser.Math.Vector2;
    selected: boolean;

    constructor(scene, x, y) {
        super(scene, x, y, "ship");
        this.setScale(0.25, 0.25);
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
    ships: Array<Ship>;
    selectMultiple: Phaser.Input.Keyboard.Key;

    constructor() {
        super("game");
        this.ships = [];
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(): void {
        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onpointerdown, this);
        this.selectMultiple = this.input.keyboard.addKey("SHIFT");

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
    onpointerdown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            const selected = this.physics.overlapCirc(pointer.position.x, pointer.position.y, 0);
            if (!this.selectMultiple.isDown) {
                this.ships.forEach((ship) => ship.select(false));
            }
            if (selected.length) {
                const ship = <Ship>selected[0].gameObject;
                ship.select(true);
            }
        }
        if (pointer.rightButtonDown()) {
            this.ships.forEach((ship) => {
                if (ship.selected) {
                    ship.move(pointer.position);
                }
            });
        }
    }
    update(): void {
        this.ships.forEach((ship) => ship.update());
    }
}
