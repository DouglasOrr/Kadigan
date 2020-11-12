import Phaser from "phaser";
import * as unitai from "./unitai";

function v(x?: number | Phaser.Math.Vector2, y?: number) {
    return new Phaser.Math.Vector2(x, y);
}

function a(x: number) {
    return new Phaser.Math.Vector2(Math.cos(x), Math.sin(x));
}

function str(v: Phaser.Math.Vector2) {
    return `(${v.x}, ${v.y})`;
}

declare global {
    namespace jest {  // eslint-disable-line @typescript-eslint/no-namespace
        interface Matchers<R> {
            toBeCloseToVector(expected: Phaser.Math.Vector2, tolerance?: number): R;
        }
    }
}

expect.extend({
    toBeCloseToVector(received: Phaser.Math.Vector2, expected: Phaser.Math.Vector2, tolerance?: number) {
        if (tolerance === undefined) {
            tolerance = 1e-3;
        }
        const distance = Phaser.Math.Distance.BetweenPoints(received, expected);
        const pass = distance < tolerance;
        return {
            pass: pass,
            message: () =>
                `expected ${str(received)} ${pass ? "not to" : "to"} be close to ${str(expected)},`
                + ` distance ${distance}, tolerance ${tolerance}`
        };
    }
});

test("randomRadialPoint", () => {
    for (let i = 0; i < 10; ++i) {
        const centre = v(100, 200);
        const point = unitai.randomRadialPoint(centre, 8);
        expect(Phaser.Math.Distance.BetweenPoints(centre, point)).toBeLessThanOrEqual(8);
    }
});

test("targetVelocity, destination reached", () => {
    const target = unitai.targetVelocity(v(10, 20), v(10, 20));
    expect(target).toStrictEqual(v(0, 0));
});

test("targetVelocity, max speed far from destination", () => {
    // Destination is [1000 au] away - should be far enough to saturate
    const target = unitai.targetVelocity(v(10, 20), v(10, 1020));
    expect(target).toBeCloseToVector(v(0, unitai.MaxTargetVelocity));
});

test("targetVelocity, low speed close to destination", () => {
    // Destination is [5 au] away - should be close enough not to saturate
    const target = unitai.targetVelocity(v(10, 20), v(7, 24));
    expect(target.length()).toBeCloseTo(Math.sqrt(10 * unitai.Acceleration) / unitai.DeceleerationSafetyFactor);
    expect(v(target).normalize()).toBeCloseToVector(v(-3, 4).normalize());
});

test("targetAcceleration, velocity reached", () => {
    const target = unitai.targetAcceleration(0.2, v(10, 20), v(10, 20));
    expect(target).toStrictEqual(v(0, 0));
});

test("targetAcceleration, unclipped", () => {
    const target = unitai.targetAcceleration(0.2, v(10, 20), v(9, 20));
    expect(target).toBeCloseToVector(v(-5, 0));
});

test("targetAcceleration, clipped", () => {
    const target = unitai.targetAcceleration(0.01, v(10, 20), v(0, 20));
    expect(target).toBeCloseToVector(v(-unitai.Acceleration, 0));
});

test("rotationRate, unclipped", () => {
    expect(unitai.rotationRate(0.1, 0, v(1, 0))).toStrictEqual(0);
    expect(unitai.rotationRate(0.1, -Math.PI, v(-1, 0))).toStrictEqual(0);
    expect(unitai.rotationRate(0.1, 0.02 - Math.PI, a(Math.PI - 0.01))).toBeCloseTo(-0.3);
    expect(unitai.rotationRate(0.1, Math.PI - 0.02, a(0.01 - Math.PI))).toBeCloseTo(0.3);
});

test("rotationRate, clipped", () => {
    expect(unitai.rotationRate(0.1, 0, v(0, 1))).toStrictEqual(unitai.RotationRate);
    expect(unitai.rotationRate(0.1, 0, v(0, -1))).toStrictEqual(-unitai.RotationRate);
});

test("thrust", () => {
    expect(unitai.thrust(0, v(10, 0))).toBeCloseTo(10);
    expect(unitai.thrust(0, v(-10, 0))).toBeCloseTo(0);
    expect(unitai.thrust(Math.PI/2, v(-3, 2))).toBeCloseTo(2);
});
