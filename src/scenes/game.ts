import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
    target: Phaser.Math.Vector2;
    ship: Phaser.GameObjects.Sprite;

    constructor() {
        super("game");
        this.target = new Phaser.Math.Vector2();
        this.target.set(undefined, undefined);
    }
    preload(): void {
        this.load.image("ship", "/assets/ship0.png");
    }
    create(): void {
        this.ship = this.add.sprite(100, 200, "ship");
        this.ship.setScale(0.25, 0.25);
        this.physics.add.existing(this.ship, false);

        this.input.on("pointerdown", (pointer) => {
            if (pointer.leftButtonDown()) {
                this.ship.setData("selected", false);
                this.ship.setTint(0xffffff);
            }
            if (pointer.rightButtonDown() && this.ship.getData("selected")) {
                this.target.copy(pointer.position);
            }
        });

        this.ship.setInteractive().on("pointerdown", (pointer, _x, _y, event) => {
            if (pointer.leftButtonDown()) {
                this.ship.setData("selected", true);
                this.ship.setTint(0xffff00);
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
