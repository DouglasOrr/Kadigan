import Phaser from "phaser";
import * as unitai from "./unitai";

const ShipScale = 0.5;
const GravityPerRadius = 0.05;  // (au/s)/au

export class Ship extends Phaser.GameObjects.Sprite {
    unit: unitai.Ship;
    commander: unitai.Commander;
    selected: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, celestials: Celestial[]) {
        super(scene, x, y, "ship");
        scene.physics.add.existing(this);
        this.setScale(ShipScale, ShipScale);
        const body = <Phaser.Physics.Arcade.Body>this.body;
        this.unit = {
            position: body.position,
            velocity: body.velocity,
            rotation: Phaser.Math.DEG_TO_RAD * body.rotation
        }
        this.commander = new unitai.Commander(this.unit, celestials.map(c => c.unit));
        this.selected = false;
        this.commander.patrol(x, y);
    }
    select(selected: boolean): void {
        this.setTint(selected ? 0xffff00 : 0xffffff);
        this.selected = selected;
    }
    update(dt: number, celestials: Celestial[]): void {
        const body = <Phaser.Physics.Arcade.Body>this.body;
        this.unit.rotation = Phaser.Math.DEG_TO_RAD * body.rotation;

        // Controller
        this.commander.step(dt);

        // Update from controller
        body.angularVelocity = Phaser.Math.RAD_TO_DEG * this.commander.rotationRate;
        body.acceleration.set(
            this.commander.thrust * Math.cos(this.unit.rotation),
            this.commander.thrust * Math.sin(this.unit.rotation)
        );

        // Update acceleration due to gravity
        celestials.forEach((celestial) => {
            const distance = Phaser.Math.Distance.Between(body.x, body.y, celestial.x, celestial.y);
            const gravity = (
                ((GravityPerRadius * celestial.unit.radius) ** 2)
                / Math.max(distance, celestial.unit.radius)
            );
            body.acceleration.x += (celestial.x - body.x) * gravity / distance;
            body.acceleration.y += (celestial.y - body.y) * gravity / distance;
        });
    }
}

export class ShipCommandLine extends Phaser.GameObjects.Line {
    ship?: Ship;

    constructor(scene: Phaser.Scene) {
        super(scene);
        this.setOrigin(0, 0);
        this.isStroked = true;
        this.strokeAlpha = 0.5;
        this.setShip();
    }
    setShip(ship?: Ship): void {
        this.setActive(ship !== undefined);
        this.setVisible(ship !== undefined);
        this.ship = ship;
    }
    update(): void {
        if (this.ship !== undefined && this.ship.active && this.ship.selected) {
            const type = this.ship.commander.commandType;
            if (type === unitai.CommandType.Patrol) {
                const dest = this.ship.commander.destination;
                this.setTo(this.ship.x, this.ship.y, dest.x, dest.y);
                this.strokeColor = 0xffffff;
            }
            if (type == unitai.CommandType.Orbit) {
                const dest = this.ship.commander.celestial;
                this.setTo(this.ship.x, this.ship.y, dest.position.x, dest.position.y);
                this.strokeColor = 0x00ff00;
            }
        } else {
            this.setShip();
        }
    }
}

export interface Orbit {
    center: Celestial,
    radius: number,
    angle: number,
    clockwise: boolean
}

export class Celestial extends Phaser.GameObjects.Container {
    unit: unitai.Celestial;
    orbit: Orbit;
    gravity: number;

    constructor(scene: Phaser.Scene,
                radius: number,
                location: Orbit | Phaser.Math.Vector2,
                player: number) {
        super(scene);
        if (player < 2) {
            const color = [0x0000ff, 0xff0000][player];
            this.add(new Phaser.GameObjects.Arc(scene, 0, 0, radius + 10, 0, 360, false, color, 0.6));
        }
        this.add(new Phaser.GameObjects.Arc(scene, 0, 0, radius, 0, 360, false, 0x888888));

        this.unit = {
            position: new Phaser.Math.Vector2(),
            velocity: new Phaser.Math.Vector2(),
            radius: radius,
            player: player,
        };
        if (location instanceof Phaser.Math.Vector2) {
            this.orbit = null;
            this.setPosition(location.x, location.y);
            // Constant {position, velocity}
            this.unit.position.copy(location);
            this.unit.velocity.reset();
        } else {
            this.orbit = {...location};
            this.update(0); // Set {this.x, this.y}
        }
    }
    update(dt: number): void {
        if (this.orbit !== null) {
            const direction = (1 - 2 * +this.orbit.clockwise);
            const angularSpeed = direction * GravityPerRadius * this.orbit.center.unit.radius / this.orbit.radius;
            this.orbit.angle += angularSpeed * dt;
            const rcos = this.orbit.radius * Math.cos(this.orbit.angle);
            const rsin = this.orbit.radius * Math.sin(this.orbit.angle);
            this.x = this.orbit.center.x + rcos;
            this.y = this.orbit.center.y + rsin;
            this.unit.position.set(this.x, this.y);
            this.unit.velocity.set(-angularSpeed * rsin, angularSpeed * rcos);
        }
    }
}
