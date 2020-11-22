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
        unitai.PlayerId.Neutral);
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

export function twoPlanetsDemo(scene: Phaser.Scene): Map {
    const left = new objects.Celestial(scene, 400,
        new Phaser.Math.Vector2(-1500, 0), unitai.PlayerId.Neutral);
    const right = new objects.Celestial(scene, 400,
        new Phaser.Math.Vector2(1500, 0), unitai.PlayerId.Neutral);
    const leftMoon = new objects.Celestial(scene, 50,
        {center: left, radius: 1200, angle: -Math.PI, clockwise: true},
        unitai.PlayerId.Player);
    const rightMoon = new objects.Celestial(scene, 50,
        {center: right, radius: 1200, angle: 0, clockwise: false},
        unitai.PlayerId.Enemy);
    return {
        bounds: new Phaser.Geom.Rectangle(-3000, -2000, 6000, 4000),
        celestials: [left, right, leftMoon, rightMoon],
    };
}
