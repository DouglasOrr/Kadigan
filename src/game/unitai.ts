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
export const DeceleerationSafetyFactor = 1.2;
export const RotationRate = 2.0; // rad/s
export const ArrivalThreshold = 5; // au
export const PatrolRadius = 50; // au

export function targetVelocity(src: Vector2, dest: Vector2, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    out.copy(dest).subtract(src);
    const length = out.length();
    if (length < ArrivalThreshold) {
        out.reset();
    } else {
        // Min stopping distance is sqrt(2 * a * s)
        const speed = Math.min(
            ((2 * Acceleration * length) ** .5) / DeceleerationSafetyFactor,
            MaxTargetVelocity
        );
        out.scale(speed / length);
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
    if (difference == 0) {
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
    location: Vector2;
    radius: number;
    player: number;
}

export interface Ship {
    location: Vector2;
    velocity: Vector2;
    rotation: number;
}

export enum CommandType {
    Patrol,
    Orbit
}

export interface Command {
    // Persistent
    type: CommandType;
    objective: Phaser.Math.Vector2;
    destination: Phaser.Math.Vector2;
    celestial: Celestial | undefined;
    // Instantaneous
    thrust: number;
    rotationRate: number;
}

export function step(dt: number, ship: Ship, command: Command, tmp?: Vector2): Command {
    if (tmp === undefined) {
        tmp = new Phaser.Math.Vector2();
    }
    if (command.type === CommandType.Patrol) {
        targetVelocity(ship.location, command.destination, tmp);
        // If we've arrived, sample a random point within a circle of the objective
        if (tmp.length() === 0) {
            randomRadialPoint(command.objective, PatrolRadius, command.destination);
        }
        targetAcceleration(dt, ship.velocity, tmp, tmp);
        command.rotationRate = rotationRate(dt, ship.rotation, tmp);
        command.thrust = thrust(ship.rotation, tmp);

    } else if (command.type == CommandType.Orbit) {
        targetVelocity(ship.location, command.celestial.location, tmp);
        targetAcceleration(dt, ship.velocity, tmp, tmp);
        command.rotationRate = rotationRate(dt, ship.rotation, tmp);
        command.thrust = thrust(ship.rotation, tmp);

    } else {
        console.error(`unexpected command type ${command.type}`);
    }
    return command;
}
