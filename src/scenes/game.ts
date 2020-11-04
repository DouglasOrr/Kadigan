import Phaser from "phaser";

class Ship extends Phaser.GameObjects.Sprite {
    selected: boolean;

    constructor(scene, x, y) {
        super(scene, x, y, "ship");
        this.setScale(0.25, 0.25);
        this.selected = false;
    }
    select(selected: boolean) {
        this.setTint(selected ? 0xffff00 : 0xffffff);
        this.selected = selected;
    }
}

export default class GameScene extends Phaser.Scene {
    target: Phaser.Math.Vector2;
    ship: Ship;

    constructor() {
        super("game");
        this.target = new Phaser.Math.Vector2();
        this.target.set(undefined, undefined);
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(): void {
        this.ship = new Ship(this, 100, 200);
        this.add.existing(this.ship);
        this.physics.add.existing(this.ship, false);

        this.input.on("pointerdown", (pointer) => {
            if (pointer.leftButtonDown()) {
                this.ship.select(false);
            }
            if (pointer.rightButtonDown() && this.ship.selected) {
                this.target.copy(pointer.position);
            }
        });

        this.ship.setInteractive().on("pointerdown", (pointer, _x, _y, event) => {
            if (pointer.leftButtonDown()) {
                this.ship.select(true);
                event.stopPropagation();
            }
        });
    }
    update(): void {
        if (this.target.x !== undefined) {
            const body = <Phaser.Physics.Arcade.Body>this.ship.body;
            const offset = this.target.clone().subtract(body.center);
            if (offset.length() < 1) {
                this.target.set(undefined, undefined);
                body.velocity.reset();
            } else {
                const velocity = offset.normalize().scale(50);
                body.velocity.copy(velocity);
            }
        }
    }
}
