import Phaser from "phaser";

// Helpers

type Vector2 = Phaser.Math.Vector2;

export function randomRadialPoint(center: Vector2, radius: number, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    const r = radius * Math.sqrt(Math.random());
    const a = Phaser.Math.PI2 * Math.random();
    out.x = center.x + r * Math.cos(a);
    out.y = center.y + r * Math.sin(a);
    return out;
}

// Logic

export const MaxTargetVelocity = 120; // au/s
export const Acceleration = 40; // au/s/s
export const DeceleerationSafetyFactor = 2;//1.2;
export const RotationRate = 2.0; // rad/s
export const ArrivalThreshold = 5; // au
export const PatrolRadius = 50; // au
export const OrbitRadiusFactor = 1.2;
export const OrbitRadiusOffset = 60; // au
export const OrbitThresholdOffset = 120; // au
export const OrbitVelocity = 30; // au/s

export function targetVelocity(delta: Vector2, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    const length = delta.length();
    if (length !== 0) {
        // Min stopping distance is sqrt(2 * a * s)
        const speed = Math.min(
            ((2 * Acceleration * length) ** .5) / DeceleerationSafetyFactor,
            MaxTargetVelocity
        );
        out.copy(delta).scale(speed / length);
    }
    return out;
}

export function targetAcceleration(dt: number, velocity: Vector2, targetVelocity: Vector2, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    out.copy(targetVelocity).subtract(velocity);
    const length = out.length();
    if (length !== 0) {
        const acceleration = Math.min(length / dt, Acceleration);
        out.scale(acceleration / length);
    }
    return out;
}

export function rotationRate(dt: number, rotation: number, targetAcceleration: Vector2): number {
    const wrap = targetAcceleration.angle() - rotation;
    const difference = wrap - Phaser.Math.PI2 * Math.floor((wrap + Math.PI) / Phaser.Math.PI2);
    if (difference === 0) {
        return difference;
    }
    return Math.sign(difference) * Math.min(RotationRate, Math.abs(difference) / dt);
}

export function thrust(rotation: number, targetAcceleration: Vector2): number {
    const rx = Math.cos(rotation);
    const ry = Math.sin(rotation);
    return Math.max(0, rx * targetAcceleration.x + ry * targetAcceleration.y);
}

// High level logic

export interface Celestial {
    position: Vector2;
    velocity: Vector2;
    radius: number;
    player: number;
}

export interface Ship {
    position: Vector2;
    velocity: Vector2;
    rotation: number;
}

export enum CommandType {
    Patrol,
    Orbit
}

export class Commander {
    // Inputs
    ship: Ship;
    celestials: Celestial[];

    // Command
    commandType: CommandType;
    objective: Phaser.Math.Vector2;
    destination: Phaser.Math.Vector2;
    celestial: Celestial | undefined;
    orbitalAngle: number | undefined;

    // Actions
    thrust: number;
    rotationRate: number;

    // Internal
    _tmp0: Phaser.Math.Vector2;
    _tmp1: Phaser.Math.Vector2;

    constructor(ship: Ship, celestials: Celestial[]) {
        this.ship = ship;
        this.celestials = celestials;
        this.commandType = CommandType.Patrol;
        this.objective = new Phaser.Math.Vector2();
        this.destination = new Phaser.Math.Vector2();
        this.celestial = undefined;
        this.orbitalAngle = undefined;
        this.thrust = 0;
        this.rotationRate = 0;
        this._tmp0 = new Phaser.Math.Vector2();
        this._tmp1 = new Phaser.Math.Vector2();
    }

    orbit(celestial: Celestial): void {
        this.commandType = CommandType.Orbit;
        this.celestial = celestial;
        this.orbitalAngle = undefined;
    }

    patrol(x: number, y: number): void {
        this.commandType = CommandType.Patrol;
        this.objective.set(x, y);
        this.destination.set(x, y);
    }

    step(dt: number): void {
        // Choose point to steer towards
        const target = (this.commandType === CommandType.Patrol)
            ? this.destination : this.celestial.position;
        const delta = this._tmp0.copy(target).subtract(this.ship.position);
        const destVelocity = this._tmp1.reset();
        const distance = delta.length();

        if (this.commandType == CommandType.Patrol) {
            if (distance < ArrivalThreshold) {
                randomRadialPoint(this.objective, PatrolRadius, this.destination);
                delta.copy(this.destination).subtract(this.ship.position);
            }

        } else if (this.commandType == CommandType.Orbit) {
            const orbitRadius = this.celestial.radius * OrbitRadiusFactor + OrbitRadiusOffset;
            if (distance < orbitRadius + OrbitThresholdOffset) {
                if (this.orbitalAngle === undefined) {
                    // First approach - set up the orbit
                    this.orbitalAngle = delta.angle() - Math.PI;
                }
                // Set a target on the current orbit
                this.orbitalAngle += dt * OrbitVelocity / orbitRadius;
                const cosa = Math.cos(this.orbitalAngle);
                const sina = Math.sin(this.orbitalAngle);
                delta.x += orbitRadius * cosa;
                delta.y += orbitRadius * sina;
                destVelocity.set(
                    this.celestial.velocity.x + OrbitVelocity * -sina,
                    this.celestial.velocity.y + OrbitVelocity * cosa
                );
            } else {
                // Aim for a point on orbit, not the center, so we don't overshoot!
                delta.scale((distance - orbitRadius) / distance);
            }

        } else {
            console.error(`Unexpected command type ${this.commandType}`);
        }

        // Steer to point
        const targetV = targetVelocity(delta, this._tmp0).add(destVelocity);
        const targetA = targetAcceleration(dt, this.ship.velocity, targetV, this._tmp0);
        this.rotationRate = rotationRate(dt, this.ship.rotation, targetA);
        this.thrust = thrust(this.ship.rotation, targetA);
    }
}
