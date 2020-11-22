import Phaser from "phaser";
import * as objects from "./objects";
import * as unitai from "./unitai";

export interface Map {
    bounds: Phaser.Geom.Rectangle;
    celestials: objects.Celestial[];
}

export function originalDemo(scene: Phaser.Scene): Map {
    const planet = new objects.Celestial(scene, 500, new Phaser.Math.Vector2(0, 0), 2);
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
