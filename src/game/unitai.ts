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

// Settings

// General
export const MaxTargetVelocity = 120; // au/s       // max speed to travel towards target
export const Acceleration = 40; // au/s/s           // max ship acceleration
export const RotationRate = 2.0; // rad/s           // max ship rotation rate
export const AccelerationThreshold = 5; // au/s/s   // min acceleration to act upon
export const DeceleerationSafetyFactor = 1.5;       // multiple of ideal stopping distance
export const CollisionThreshold = 50; // au   // should be < OrbitRadiusOffset

// Patrol
export const PatrolArrivalThreshold = 40; // au
export const PatrolRadius = 100; // au

// Orbit
export const OrbitRadiusFactor = 1.2;
export const OrbitRadiusOffset = 60; // au
export const OrbitThresholdOffset = 80; // au
export const OrbitVelocity = 30; // au/s

// Logic

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
    player: number;
}

export function targetVelocity(delta: Vector2, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    const length = delta.length();
    if (length !== 0) {
        // Max stopping speed is sqrt(2 * a * s)
        const speed = Math.min(
            Math.sqrt(2 * Acceleration * length) / DeceleerationSafetyFactor,
            MaxTargetVelocity
        );
        out.copy(delta).scale(speed / length);
    }
    return out;
}

export function avoidCollisions(position: Vector2, velocity: Vector2, celestials: Celestial[],
    tmp0?: Vector2, tmp1?: Vector2, out?: Vector2): Vector2 {
    if (tmp0 === undefined) {
        tmp0 = new Phaser.Math.Vector2();
    }
    if (tmp1 === undefined) {
        tmp1 = new Phaser.Math.Vector2();
    }
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    // Assume we're only ever going to crash into one celestial at a time - so can just avoid
    // the first one that seems looks like a problem
    for (let i = 0; i < celestials.length; ++i) {
        // This segment of code finds the distance-to-collision with a circle of radius r
        //  - d is displacement "from ship to celestial center"
        //  - v is velocity "of ship relative to celestial" (assumed constant until collision)
        const celestial = celestials[i];
        const r = celestial.radius + CollisionThreshold;
        const r2 = r * r;
        const d = tmp0.copy(celestial.position).subtract(position);
        const d2 = d.lengthSq();
        if (d2 < r2) {
            // We're within the radius; this is bad, we just want to get out ASAP!
            return out.copy(d).scale(-MaxTargetVelocity / Math.sqrt(d2));
        }
        const v = tmp1.copy(velocity).subtract(celestial.velocity);
        const v2 = v.lengthSq();
        const vm = Math.sqrt(v2);
        // Use the cosine rule & quadratic formula to find the distance along v to collision
        const dCosTheta = d.dot(v) / vm;
        const collisionDistance = dCosTheta - Math.sqrt(dCosTheta * dCosTheta + r2 - d2);
        // Use the "stopping distance" with a safefy factor (DeceleerationSafetyFactor) to
        // determine if we need to take action
        if (0 <= collisionDistance &&
            collisionDistance < 0.5 * v2 * (DeceleerationSafetyFactor ** 2) / Acceleration) {
            // We need to change direction to avoid a collision
            // Cross product to determine which way to go (based on current velocity)
            const handedNess = Math.sign(d.x * v.y - d.y * v.x);
            // Rotate the d vector to find the "minimal miss", with the velocity magnitude from v
            const dsina = handedNess * r;
            const dcosa = Math.sqrt(d2 - dsina * dsina);
            return out.set(d.x * dcosa - d.y * dsina, d.x * dsina + d.y * dcosa).scale(vm / d2);
        }
    }
    return out.copy(velocity);
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
    return Math.sign(difference) * Math.min(RotationRate, Math.abs(difference) / dt);
}

export function thrust(rotation: number, targetAcceleration: Vector2): number {
    const rx = Math.cos(rotation);
    const ry = Math.sin(rotation);
    return Math.max(0, rx * targetAcceleration.x + ry * targetAcceleration.y);
}

export function orbitalRadius(celestial: Celestial): number {
    return celestial.radius * OrbitRadiusFactor + OrbitRadiusOffset;
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
    _tmp2: Phaser.Math.Vector2;

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
        this._tmp2 = new Phaser.Math.Vector2();
    }

    orbit(celestial: Celestial): void {
        const updateAngle = (
            this.commandType !== CommandType.Orbit ||
            this.celestial !== celestial
        );
        this.commandType = CommandType.Orbit;
        this.celestial = celestial;
        if (updateAngle) {
            this.orbitalAngle = undefined;
        }
    }

    patrol(x: number, y: number): void {
        // Don't change the current destination if the command is being re-issued
        // (this prevents repeated "bunching")
        const updateDestination = (
            this.commandType !== CommandType.Patrol ||
            this.destination === undefined ||
            PatrolRadius <= Phaser.Math.Distance.Between(x, y, this.destination.x, this.destination.y)
        );
        this.commandType = CommandType.Patrol;
        this.objective.set(x, y);
        if (updateDestination) {
            this.destination.set(x, y);
        }
    }

    step(dt: number): void {
        // Choose point to steer towards
        const target = (this.commandType === CommandType.Patrol)
            ? this.destination : this.celestial.position;
        const delta = this._tmp0.copy(target).subtract(this.ship.position);
        const destVelocity = this._tmp1.reset();
        const distance = delta.length();

        if (this.commandType == CommandType.Patrol) {
            if (distance < PatrolArrivalThreshold) {
                randomRadialPoint(this.objective, PatrolRadius, this.destination);
                delta.copy(this.destination).subtract(this.ship.position);
            }

        } else if (this.commandType == CommandType.Orbit) {
            const orbitRadius = orbitalRadius(this.celestial);
            if (distance < orbitRadius + OrbitThresholdOffset) {
                if (this.orbitalAngle === undefined) {
                    // A fresh approach - choose a random starting angle
                    // (this helps to spread out incoming ships more evenly than "closest angle")
                    this.orbitalAngle = Phaser.Math.PI2 * (Math.random() - .5);
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
                // Aim for a point on orbit, not the center, so we don't overshoot
                delta.scale((distance - orbitRadius) / distance);
            }

        } else {
            console.error(`Unexpected command type ${this.commandType}`);
        }

        // Steer to point
        const destV = targetVelocity(delta, this._tmp0).add(destVelocity);
        const targetV = avoidCollisions(this.ship.position, destV, this.celestials,
            this._tmp1, this._tmp2, this._tmp0);
        const targetA = targetAcceleration(dt, this.ship.velocity, targetV, this._tmp0);
        if (AccelerationThreshold <= targetA.length()) {
            this.rotationRate = rotationRate(dt, this.ship.rotation, targetA);
            this.thrust = thrust(this.ship.rotation, targetA);
        } else {
            this.rotationRate = 0;
            this.thrust = 0;
        }
    }
}
