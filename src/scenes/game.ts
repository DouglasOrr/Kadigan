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
        this.ship.setScale(0.5, 0.5);
        this.physics.add.existing(this.ship, false);

        this.input.on("pointerdown", (e) => {
            this.target.copy(e.position);
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
