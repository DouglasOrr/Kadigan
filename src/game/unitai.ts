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
export const OrbitFactor = 2;
export const OrbitThresholdFactor = 3;
export const OrbitVelocity = 20; // au/s

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
    orbitalAngle: number | undefined;
    orbitalAngularVelocity: number;
    // Instantaneous
    thrust: number;
    rotationRate: number;
}

export function step(dt: number, ship: Ship, command: Command, tmp?: Vector2): Command {
    if (tmp === undefined) {
        tmp = new Phaser.Math.Vector2();
    }
    // Choose point to steer towards
    const target = (command.type === CommandType.Patrol) ? command.destination : command.celestial.location;
    let delta = tmp.copy(target).subtract(ship.location);
    const distance = delta.length();
    if (command.type === CommandType.Patrol && distance < ArrivalThreshold) {
        randomRadialPoint(command.objective, PatrolRadius, command.destination);
        delta = tmp.copy(command.destination).subtract(ship.location);
    }
    if (command.type === CommandType.Orbit && distance < command.celestial.radius * OrbitThresholdFactor) {
        const orbitRadius = command.celestial.radius * OrbitFactor;
        if (command.orbitalAngle === undefined) {
            command.orbitalAngle = -delta.angle();
            const direction = Math.random() < 0.5 ? -1 : 1;
            command.orbitalAngularVelocity = direction * OrbitVelocity / orbitRadius;
        }
        command.orbitalAngle += dt * command.orbitalAngularVelocity;
        delta.x += orbitRadius * Math.cos(command.orbitalAngle);
        delta.y += orbitRadius * Math.sin(command.orbitalAngle);
    }
    // Steer to point
    const targetV = targetVelocity(delta, tmp);
    const targetA = targetAcceleration(dt, ship.velocity, targetV, tmp);
    command.rotationRate = rotationRate(dt, ship.rotation, targetA);
    command.thrust = thrust(ship.rotation, targetA);
    return command;
}
