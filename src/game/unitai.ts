import Phaser from "phaser";

type Vector2 = Phaser.Math.Vector2;

export const MaxTargetVelocity = 120; // au/s
export const Acceleration = 40; // au/s/s
export const DeceleerationSafetyFactor = 1.2;
export const RotationRate = 2.0; // rad/s

export function targetVelocity(src: Vector2, dest: Vector2, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    out.copy(dest).subtract(src);
    const length = out.length();
    if (length !== 0) {
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

export function thrust(rotation: number, targetAcceleration: Vector2, out?: Vector2): Vector2 {
    if (out === undefined) {
        out = new Phaser.Math.Vector2();
    }
    // We want to allow targetAcceleration === out, so don't update out too early
    const rx = Math.cos(rotation);
    const ry = Math.sin(rotation);
    const scale = Math.max(0, rx * targetAcceleration.x + ry * targetAcceleration.y);
    return out.set(scale * rx, scale * ry);
}
