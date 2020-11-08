import Phaser from "phaser";

const ShipScale = 0.5;
const MoveFinishThreshold = 1.0;
const ShipSpeed = 100.0; // au/s
const GravityPerRadius = 0.05;  // (au/s)/au

enum ShipState {
    Idle,
    Moving
}

export class Ship extends Phaser.GameObjects.Sprite {
    state: ShipState;
    target: Phaser.Math.Vector2;
    selected: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "ship");
        this.setScale(ShipScale, ShipScale);
        this.state = ShipState.Idle;
        this.target = new Phaser.Math.Vector2();
        this.selected = false;
    }
    select(selected: boolean): void {
        this.setTint(selected ? 0xffff00 : 0xffffff);
        this.selected = selected;
    }
    move(x: number, y: number): void {
        this.state = ShipState.Moving;
        this.target.set(x, y);
    }
    update(): void {
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

export type Orbit = {
    center: Celestial,
    radius: number,
    angle: number,
    clockwise: boolean
};

export class Celestial extends Phaser.GameObjects.Arc {
    orbit: Orbit;
    gravity: number;

    constructor(scene: Phaser.Scene,
                radius: number,
                location: Orbit | Phaser.Math.Vector2) {
        super(scene, 0, 0, radius, 0, 360, false, 0x888888);
        if (location instanceof Phaser.Math.Vector2) {
            this.orbit = null;
            this.setPosition(location.x, location.y);
        } else {
            this.orbit = {...location};
            this.updatePosition();
        }
    }
    updatePosition(): void {
        if (this.orbit !== null) {
            this.x = this.orbit.center.x + this.orbit.radius * Math.sin(this.orbit.angle);
            this.y = this.orbit.center.y + this.orbit.radius * Math.cos(this.orbit.angle);
        }
    }
    update(delta: number): void {
        if (this.orbit !== null) {
            const angularSpeed = GravityPerRadius * this.orbit.center.radius / this.orbit.radius;
            this.orbit.angle += (1 - 2 * +this.orbit.clockwise) * delta * angularSpeed;
            this.updatePosition();
        }
    }
}
