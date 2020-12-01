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

// Generator

class RejectionError extends Error {
    rejectionError: boolean;
    constructor() {
        super("Sample rejection");
        this.rejectionError = true;
    }
}

function rejectionSample<T>(sample: () => T, attempts: integer): T {
    for (let i = 0; i < attempts - 1; ++i) {
        try {
            return sample();
        } catch (error) {
            if (error.rejectionError !== true) {
                throw error;
            }
        }
    }
    // Final attempt - don't catch a RejectionError this time
    return sample();
}

interface PGMoon {
    radius: number;
    orbit: number;
    angle: number;
    clockwise: boolean;
    player: unitai.PlayerId;
    ships: integer;
}

interface PGPlanet {
    radius: number;
    moons: PGMoon[];
}

interface PGTemplate {
    planets: PGPlanet[];
    scale: number;
}

type Random = Phaser.Math.RandomDataGenerator;

function generateRadius(rng: Random): number {
    // This is mildly biased towards small moons, due to rejection sampling,
    // but that's OK!
    return rng.realInRange(20, 80);
}

function generateShipCount(rng: Random, radius: number): integer {
    if (radius <= 35) { return rng.between(3, 5);
    } if (radius <= 50) { return rng.between(5, 10);
    } if (radius <= 65) { return rng.between(9, 14);
    } return rng.between(12, 24);
}

function generatePlanet(rng: Random, scale: number, minMoons: integer): PGPlanet {
    const planetRadius = scale / rng.realInRange(3, 8);
    const minOrbit = unitai.orbitalRadius(planetRadius);
    const moons = [];
    function generateMoon(): PGMoon {
        const radius = generateRadius(rng);
        const ships = generateShipCount(rng, radius);
        const buffer = unitai.orbitalRadius(radius) + 100;
        const orbit = rng.realInRange(minOrbit + buffer, scale - buffer);
        if (orbit < minOrbit + buffer || orbit > scale - buffer ||
            moons.find((moon: PGMoon) => {
                return Math.abs(moon.orbit - orbit) < (buffer + unitai.orbitalRadius(moon.radius));
            })) {
            throw new RejectionError();
        }
        return {
            radius: radius,
            orbit: orbit,
            angle: Phaser.Math.DEG_TO_RAD * rng.angle(),
            clockwise: rng.realInRange(0, 1) < 0.5,
            player: unitai.PlayerId.Neutral,
            ships: ships,
        };
    }
    // Add required moons (if these fail, the whole generatePlanet() is rejected)
    for (let i = 0; i < minMoons; ++i) {
        moons.push(rejectionSample(generateMoon, 100));
    }
    // Add optional moons
    try {
        for (let i = 0; i < 6; ++i) {
            moons.push(rejectionSample(generateMoon, 25));
        }
    } catch (error) {
        if (error.rejectionError !== true) {
            throw error;
        }
        // Don't generate any more moons, if a sample is persistently rejected
    }
    return {radius: planetRadius, moons: moons};
}

function flipPlanet(planet: PGPlanet): PGPlanet {
    return {
        radius: planet.radius,
        moons: planet.moons.map(moon => {
            let player = unitai.getOpponent(moon.player);
            if (player === undefined) {
                player = moon.player;
            }
            return {
                radius: moon.radius,
                orbit: moon.orbit,
                angle: Math.PI - moon.angle,
                clockwise: !moon.clockwise,
                player: player,
                ships: moon.ships,
            };
        }),
    }
}

function setPlayerMoon(rng: Random, planet: PGPlanet, player: unitai.PlayerId) {
    const moon = rng.pick(planet.moons.filter(x => x.player === unitai.PlayerId.Neutral));
    moon.ships = 3;
    moon.player = player;
}

function generateTemplate(rng: Random): PGTemplate {
    const nPlanets = rng.between(1, 4);
    const scale = rng.realInRange(500, 3000);

    const planets: PGPlanet[] = [];
    if (nPlanets === 1) {
        planets.push(generatePlanet(rng, scale, 2));
        setPlayerMoon(rng, planets[0], unitai.PlayerId.Player);
        setPlayerMoon(rng, planets[0], unitai.PlayerId.Enemy);
    } else {
        for (let i = 0; i < nPlanets - 1; ++i) {
            planets.push(generatePlanet(rng, scale, 1));
        }
        setPlayerMoon(rng, planets[0], unitai.PlayerId.Player);
        // Enemy planet is a mirror image of Player planet (must be at index 1, for layout)
        planets.splice(1, 0, flipPlanet(planets[0]));
    }
    return {planets: planets, scale: scale};
}

function convertToMap(spec: PGTemplate, scene: Phaser.Scene, ships: Phaser.GameObjects.Group): Map {
    let delta = spec.scale;
    if (3 <= spec.planets.length) {
        // Incoming scale parameter is the max safe radius - which is the hypotenuse of the x, y
        // displacements generated here
        delta *= Math.SQRT2;
    }
    const celestials = [];
    spec.planets.forEach((planet, index) => {
        // Lay out in a rotated square, centered on (0, 0)
        let x: number;
        if (spec.planets.length === 1) { x = 0;
        } else if (index === 0) { x = -delta;
        } else if (index === 1) { x = +delta;
        } else if (index <= 3) { x = 0;
        }
        let y: number;
        if (index <= 1) { y = 0;
        } else if (index === 2) { y = -delta;
        } else if (index === 3) { y = +delta;
        }
        const cPlanet = new objects.Celestial(scene, planet.radius, new Phaser.Math.Vector2(x, y),
            unitai.PlayerId.None, 0, ships);
        celestials.push(cPlanet);
        planet.moons.forEach(moon => {
            celestials.push(new objects.Celestial(scene, moon.radius, {
                center: cPlanet,
                radius: moon.orbit,
                angle: moon.angle,
                clockwise: moon.clockwise,
            }, moon.player, moon.ships, ships));
        });
    });
    const width = delta * 2 * (1 + +(2 <= spec.planets.length));
    const height = delta * 2 * (1 + +(3 <= spec.planets.length));
    return {
        bounds: new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
        celestials: celestials,
    };
}

export function randomMap(scene: Phaser.Scene, ships: Phaser.GameObjects.Group, seed: string): Map {
    const rng = new Phaser.Math.RandomDataGenerator([seed]);
    try {
        const template = rejectionSample(() => generateTemplate(rng), 5);
        return convertToMap(template, scene, ships);
    } catch (error) {
        // Fall back to a standard map
        return twoPlanetsDemo(scene, ships);
    }
}

// List

export const MapList = [
    {name: "Random", key: "rand", generator: randomMap},
    {name: "Standard", key: "std", generator: twoPlanetsDemo},
    {name: "Head to Head", key: "h2h", generator: aiTestDemo},
    {name: "One planet", key: "one", generator: originalDemo},
];

export function create(key: string, scene: Phaser.Scene, ships: Phaser.GameObjects.Group, seed: string): Map {
    const map = MapList.find(item => item.key === key);
    return map.generator(scene, ships, seed);
}
