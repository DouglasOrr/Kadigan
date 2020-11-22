import Phaser from "phaser";
import * as objects from "./objects";
import * as unitai from "./unitai";

export interface Map {
    bounds: Phaser.Geom.Rectangle;
    celestials: objects.Celestial[];
}

export function originalDemo(scene: Phaser.Scene): Map {
    const planet = new objects.Celestial(scene, 500,
        new Phaser.Math.Vector2(0, 0),
        unitai.PlayerId.None);
    const playerMoon = new objects.Celestial(scene, 50,
        {center: planet, radius: 1200, angle: Math.PI/2, clockwise: true},
        unitai.PlayerId.Player);
    const enemyMoon = new objects.Celestial(scene, 50,
        {center: planet, radius: 1700, angle: -Math.PI/2, clockwise: false},
        unitai.PlayerId.Enemy);
    return {
        bounds: new Phaser.Geom.Rectangle(-2000, -2000, 4000, 4000),
        celestials: [planet, playerMoon, enemyMoon],
    };
}

function twoPlanetsPart(scene: Phaser.Scene, hand: number, player: unitai.PlayerId): objects.Celestial[] {
    function angle(a) {
        if (0 < hand) { return Math.PI - a; }
        return a;
    }

    const planet = new objects.Celestial(scene, 400,
        new Phaser.Math.Vector2(hand * 1500, 0),
        unitai.PlayerId.None);

    const playerMoon = new objects.Celestial(scene, 50,
        {center: planet, radius: 1200, angle: angle(Math.PI), clockwise: hand < 0},
        player);

    const innerMoon0 = new objects.Celestial(scene, 42,
        {center: planet, radius: 600, angle: angle(0.6), clockwise: !playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral);

    const innerMoon1 = new objects.Celestial(scene, 60,
        {center: planet, radius: 600, angle: angle(-1.7), clockwise: !playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral);

    const innerMoon2 = new objects.Celestial(scene, 57,
        {center: planet, radius: 850, angle: angle(1.3), clockwise: playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral);

    const outerMoon0 = new objects.Celestial(scene, 25,
        {center: planet, radius: 1400, angle: angle(-1.0), clockwise: playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral);

    return [planet, playerMoon, innerMoon0, innerMoon1, innerMoon2, outerMoon0];
}

export function twoPlanetsDemo(scene: Phaser.Scene): Map {
    const celestials = [];
    celestials.push(...twoPlanetsPart(scene, -1, unitai.PlayerId.Player));
    celestials.push(...twoPlanetsPart(scene, +1, unitai.PlayerId.Enemy));
    return {
        bounds: new Phaser.Geom.Rectangle(-3000, -2000, 6000, 4000),
        celestials: celestials,
    };
}
