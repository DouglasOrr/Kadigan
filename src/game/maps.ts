import Phaser from "phaser";
import * as objects from "./objects";
import * as unitai from "./unitai";

export interface Map {
    bounds: Phaser.Geom.Rectangle;
    celestials: objects.Celestial[];
}

export function originalDemo(scene: Phaser.Scene, ships: Phaser.GameObjects.Group): Map {
    const planet = new objects.Celestial(scene, 500,
        new Phaser.Math.Vector2(0, 0),
        unitai.PlayerId.None, 0, ships);
    const playerMoon = new objects.Celestial(scene, 50,
        {center: planet, radius: 1200, angle: Math.PI/2, clockwise: true},
        unitai.PlayerId.Player, 3, ships);
    const enemyMoon = new objects.Celestial(scene, 50,
        {center: planet, radius: 1700, angle: -Math.PI/2, clockwise: false},
        unitai.PlayerId.Enemy, 3, ships);
    return {
        bounds: new Phaser.Geom.Rectangle(-2000, -2000, 4000, 4000),
        celestials: [planet, playerMoon, enemyMoon],
    };
}

function twoPlanetsPart(scene: Phaser.Scene, hand: number, player: unitai.PlayerId,
        ships: Phaser.GameObjects.Group): objects.Celestial[] {
    function angle(a) {
        if (0 < hand) { return Math.PI - a; }
        return a;
    }

    const planet = new objects.Celestial(scene, 400,
        new Phaser.Math.Vector2(hand * 1500, 0),
        unitai.PlayerId.None, 0, ships);

    const playerMoon = new objects.Celestial(scene, 50,
        {center: planet, radius: 1200, angle: angle(Math.PI), clockwise: hand < 0},
        player, 3, ships);

    const innerMoon0 = new objects.Celestial(scene, 42,
        {center: planet, radius: 600, angle: angle(0.6), clockwise: !playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral, 6, ships);

    const innerMoon1 = new objects.Celestial(scene, 60,
        {center: planet, radius: 600, angle: angle(-1.7), clockwise: !playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral, 15, ships);

    const innerMoon2 = new objects.Celestial(scene, 57,
        {center: planet, radius: 850, angle: angle(1.3), clockwise: playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral, 10, ships);

    const outerMoon0 = new objects.Celestial(scene, 25,
        {center: planet, radius: 1400, angle: angle(-1.0), clockwise: playerMoon.orbit.clockwise},
        unitai.PlayerId.Neutral, 4, ships);

    return [planet, playerMoon, innerMoon0, innerMoon1, innerMoon2, outerMoon0];
}

export function twoPlanetsDemo(scene: Phaser.Scene, ships: Phaser.GameObjects.Group): Map {
    const celestials = [];
    celestials.push(...twoPlanetsPart(scene, -1, unitai.PlayerId.Player, ships));
    celestials.push(...twoPlanetsPart(scene, +1, unitai.PlayerId.Enemy, ships));
    return {
        bounds: new Phaser.Geom.Rectangle(-3000, -2000, 6000, 4000),
        celestials: celestials,
    };
}

export function aiTestDemo(scene: Phaser.Scene, ships: Phaser.GameObjects.Group): Map {
    const player = new objects.Celestial(scene, 50,
        new Phaser.Math.Vector2(-1000, 0), unitai.PlayerId.Player, 10, ships);
    const enemy = new objects.Celestial(scene, 50,
        new Phaser.Math.Vector2(1000, 0), unitai.PlayerId.Enemy, 10, ships);
    return {
        bounds: new Phaser.Geom.Rectangle(-2000, -2000, 4000, 4000),
        celestials: [player, enemy],
    };
}

// List

export const MapList = [
    {name: "Standard", key: "std", generator: twoPlanetsDemo},
    {name: "Head to Head", key: "h2h", generator: aiTestDemo},
    {name: "Single planet", key: "one", generator: originalDemo},
];

export function create(key: string, scene: Phaser.Scene, ships: Phaser.GameObjects.Group): Map {
    const map = MapList.find(item => item.key === key);
    return map.generator(scene, ships);
}
