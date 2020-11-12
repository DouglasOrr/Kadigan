import Phaser from "phaser";
import * as unitai from "./unitai";

const ShipScale = 0.5;
const GravityPerRadius = 0.05;  // (au/s)/au

export class Ship extends Phaser.GameObjects.Sprite {
    selected: boolean;
    command: unitai.Command;
    _ship?: unitai.Ship;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, "ship");
        this.setScale(ShipScale, ShipScale);
        this.selected = false;
        this.command = {
            type: unitai.CommandType.Patrol,
            objective: new Phaser.Math.Vector2(),
            destination: new Phaser.Math.Vector2(),
            celetial: undefined,
            thrust: 0,
            rotationRate: 0
        };
        this.commandPatrol(x, y);
    }
    commandPatrol(x: number, y: number): void {
        this.command.type = unitai.CommandType.Patrol;
        this.command.objective.set(x, y);
        this.command.destination.set(x, y);
    }
    select(selected: boolean): void {
        this.setTint(selected ? 0xffff00 : 0xffffff);
        this.selected = selected;
    }
    update(dt: number, celestials: Celestial[]): void {
        const body = <Phaser.Physics.Arcade.Body>this.body;
        if (this._ship === undefined) {
            this._ship = {
                position: body.position,
                velocity: body.velocity,
                rotation: Phaser.Math.DEG_TO_RAD * body.rotation
            };
        } else {
            this._ship.position = body.position;
            this._ship.velocity = body.velocity;
            this._ship.rotation = Phaser.Math.DEG_TO_RAD * body.rotation;
        }

        // Controller
        unitai.step(dt, this._ship, this.command, body.acceleration);

        // Update from controller
        body.angularVelocity = Phaser.Math.RAD_TO_DEG * this.command.rotationRate;
        body.acceleration.set(
            this.command.thrust * Math.cos(this._ship.rotation),
            this.command.thrust * Math.sin(this._ship.rotation)
        );

        // Update acceleration due to gravity
        celestials.forEach((celestial) => {
            const distance = Phaser.Math.Distance.Between(body.x, body.y, celestial.x, celestial.y);
            const gravity = (
                ((GravityPerRadius * celestial.radius) ** 2)
                / Math.max(distance, celestial.radius)
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
        this.strokeColor = 0xffffff;
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
            if (this.ship.command.type === unitai.CommandType.Patrol) {
                const dest = this.ship.command.destination;
                this.setTo(this.ship.x, this.ship.y, dest.x, dest.y);
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

export class Celestial extends Phaser.GameObjects.Container implements unitai.Celestial {
    radius: number;
    orbit: Orbit;
    gravity: number;
    player: number;

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
        this.radius = radius;
        if (location instanceof Phaser.Math.Vector2) {
            this.orbit = null;
            this.setPosition(location.x, location.y);
        } else {
            this.orbit = {...location};
            this.updatePosition();
        }
        this.player = player
    }
    updatePosition(): void {
        if (this.orbit !== null) {
            this.x = this.orbit.center.x + this.orbit.radius * Math.sin(this.orbit.angle);
            this.y = this.orbit.center.y + this.orbit.radius * Math.cos(this.orbit.angle);
        }
    }
    update(dt: number): void {
        if (this.orbit !== null) {
            const angularSpeed = GravityPerRadius * this.orbit.center.radius / this.orbit.radius;
            this.orbit.angle += (1 - 2 * +this.orbit.clockwise) * dt * angularSpeed;
            this.updatePosition();
        }
    }
}
