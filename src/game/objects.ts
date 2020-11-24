import Phaser from "phaser";
import * as unitai from "./unitai";

type Body = Phaser.Physics.Arcade.Body;

// General
const ShipScale = 0.5;
const PlayerColors = [0x8888ff, 0xff8888, 0xffffff];
const GravityPerRadius = 0.05;  // (au/s)/au
const ConquerTime = 30; // s
const ConquerDefenders = 5; // i.e. conquering happens when this many friendlies are around

// Weapons
const LazerRecharge = 1.0; // s
const LazerDamage = 1/20; // (20 shots to kill)
export const LazerRange = 400; // au
const LazerTime = 0.1; // s

// Visibility
const ShipVisionRange = 700;
const CelestialVisionRange = 1000;

export class Ship extends Phaser.GameObjects.Sprite {
    unit: unitai.Ship;
    selected: boolean;
    health: number;
    charge: number;
    visibleToPlayer: boolean;
    visibleToEnemy: boolean;
    commander: unitai.Commander;
    vision: Phaser.GameObjects.Arc;
    celestials: Celestial[];

    constructor(scene: Phaser.Scene, celestials: Celestial[]) {
        super(scene, 0, 0, "ship");
        scene.physics.add.existing(this);
        this.setScale(ShipScale, ShipScale);
        // Set dummy initial state
        this.unit = {
            position: undefined,
            velocity: undefined,
            rotation: undefined,
            player: undefined
        };
        this.selected = undefined;
        this.health = undefined;
        this.charge = undefined;
        this.commander = new unitai.Commander(this.unit, celestials.map(c => c.unit));
        this.vision = new Phaser.GameObjects.Arc(scene, 0, 0, ShipVisionRange, 0, 360, false, 0x000000);
        this.celestials = celestials;
        // Make sure we're initially inactive (need to call setup())
        this.kill();
    }
    setup(x: number, y: number, rotation: number, player: unitai.PlayerId): void {
        // Set core state
        const body = <Body>this.body;
        this.unit.position = body.position;
        this.unit.velocity = body.velocity;
        this.unit.rotation = Phaser.Math.DEG_TO_RAD * body.rotation;
        this.unit.player = player;
        this.selected = false;
        this.health = 1;
        this.charge = 0;
        // Enable: see kill()
        this.active = true;
        this.visible = true;
        body.enable = true;
        // Set initial state
        body.reset(x, y);
        body.rotation = Phaser.Math.RAD_TO_DEG * rotation;
        this.commander.patrol(x, y);
        this.updateTint();
        if (player !== unitai.PlayerId.Player) {
            this.setDepth(-2);
        }
    }
    kill(): void {
        const body = (<Body>this.body);
        // Even though we'll be disabled, we can still participate in hit tests,
        // so set a default position
        body.reset(0, 0);
        // Disable: see setup()
        this.active = false;
        this.visible = false;
        body.enable = false;
    }
    select(selected: boolean): void {
        this.selected = selected;
        this.updateTint();
    }
    updateTint(): void {
        this.setTint(this.selected ? 0xffff00 : PlayerColors[this.unit.player]);
    }
    update(dt: number, lazerLines: Phaser.GameObjects.Group, fog: boolean): void {
        const body = <Body>this.body;
        this.unit.rotation = Phaser.Math.DEG_TO_RAD * body.rotation;

        // Controller
        this.commander.step(dt);

        // Physics from controller
        body.angularVelocity = Phaser.Math.RAD_TO_DEG * this.commander.rotationRate;
        body.acceleration.set(
            this.commander.thrust * Math.cos(this.unit.rotation),
            this.commander.thrust * Math.sin(this.unit.rotation)
        );

        // Physics from gravity
        this.celestials.forEach((celestial) => {
            const distance = Phaser.Math.Distance.Between(body.x, body.y, celestial.x, celestial.y);
            const gravity = (
                ((GravityPerRadius * celestial.unit.radius) ** 2)
                / Math.max(distance, celestial.unit.radius)
            );
            body.acceleration.x += (celestial.x - body.x) * gravity / distance;
            body.acceleration.y += (celestial.y - body.y) * gravity / distance;
        });

        // Weapon
        this.charge += dt;
        if (this.charge >= LazerRecharge) {
            this.fireWeapon(lazerLines);
        }

        // Visibility
        this.updateVisible();
        this.visible = !fog || this.visibleToPlayer;
    }
    updateVisible(): void {
        this.visibleToPlayer = (this.unit.player === unitai.PlayerId.Player);
        this.visibleToEnemy = (this.unit.player === unitai.PlayerId.Enemy);
        for (let i = 0; i < this.celestials.length; ++i) {
            const celestial = this.celestials[i];
            const threshold = celestial.unit.radius + CelestialVisionRange;
            if (celestial.unit.position.distanceSq(this.unit.position) < threshold * threshold) {
                this.visibleToPlayer = this.visibleToPlayer || (celestial.unit.player === unitai.PlayerId.Player);
                this.visibleToEnemy = this.visibleToEnemy || (celestial.unit.player === unitai.PlayerId.Enemy);
            }
        }
        // Rough check using overlapRect (exact check follows)
        const candidates = <Body[]>this.scene.physics.overlapRect(
            this.x - ShipVisionRange, this.y - ShipVisionRange, 2 * ShipVisionRange, 2 * ShipVisionRange
        );
        for (let i = 0; i < candidates.length; ++i) {
            if (candidates[i].enable) {
                const ship = <Ship>candidates[i].gameObject;
                if (ship.unit.position.distanceSq(this.unit.position) < ShipVisionRange * ShipVisionRange) {
                    this.visibleToPlayer = this.visibleToPlayer || (ship.unit.player === unitai.PlayerId.Player);
                    this.visibleToEnemy = this.visibleToEnemy || (ship.unit.player === unitai.PlayerId.Enemy);
                }
            }
        }
    }
    fireWeapon(lazerLines: Phaser.GameObjects.Group): void {
        let closestEnemy: Ship = undefined;
        let closestDistanceSq: number = LazerRange * LazerRange;
        // Rough check using overlapRect (exact check follows)
        const candidates = <Body[]>this.scene.physics.overlapRect(
            this.x - LazerRange, this.y - LazerRange, 2 * LazerRange, 2 * LazerRange
        );
        candidates.forEach(body => {
            if (body.enable) {
                // We only put ships in the physics system
                const ship = <Ship>body.gameObject;
                if (ship.unit.player !== this.unit.player) {
                    const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
                        this.unit.position, ship.unit.position);
                    if (distanceSq < closestDistanceSq) {
                        closestDistanceSq = distanceSq;
                        closestEnemy = ship;
                    }
                }
            }
        });
        if (closestEnemy !== undefined) {
            (<ShipLazerLine>lazerLines.get()).set(this, closestEnemy);
            closestEnemy.health -= LazerDamage;
            if (closestEnemy.health <= 0) {
                this.scene.events.emit("shipdestroyed", closestEnemy, this);
                closestEnemy.kill();
            }
            this.charge = 0;
        }
    }
}

export class ShipCommandLine extends Phaser.GameObjects.Line {
    ship?: Ship;

    constructor(scene: Phaser.Scene) {
        super(scene);
        this.setOrigin(0, 0);
        this.isStroked = true;
        this.strokeAlpha = 0.5;
        this.unset();
    }
    unset(): void {
        this.active = false;
        this.visible = false;
        this.ship = undefined;
    }
    set(ship: Ship): void {
        this.active = true;
        this.visible = true;
        this.ship = ship;
        this.update();
    }
    update(): void {
        if (this.ship !== undefined && this.ship.active && this.ship.selected) {
            const type = this.ship.commander.commandType;
            if (type === unitai.CommandType.Patrol) {
                const dest = this.ship.commander.destination;
                this.setTo(this.ship.x, this.ship.y, dest.x, dest.y);
                this.strokeColor = 0xffffff;
            }
            if (type == unitai.CommandType.Orbit) {
                const dest = this.ship.commander.celestial;
                this.setTo(this.ship.x, this.ship.y, dest.position.x, dest.position.y);
                this.strokeColor = 0x00ff00;
            }
        } else {
            this.unset();
        }
    }
}

export class ShipLazerLine extends Phaser.GameObjects.Line {
    src?: Ship;
    dest?: Ship;
    lifetime?: number;

    constructor(scene: Phaser.Scene) {
        super(scene);
        this.setOrigin(0, 0);
        this.isStroked = true;
        this.strokeColor = 0xff0000;
        this.lineWidth = 2;
        this.unset();
    }
    unset(): void {
        this.active = false;
        this.visible = false;
        this.src = undefined;
        this.dest = undefined;
        this.lifetime = undefined;
    }
    set(src: Ship, dest: Ship): void {
        this.active = true;
        this.visible = true;
        this.src = src;
        this.dest = dest;
        this.lifetime = LazerTime;
        this.update(0);
    }
    update(dt: number): void {
        this.lifetime -= dt;
        if (this.src !== undefined && this.src.active && this.dest.active && 0 <= this.lifetime) {
            this.setTo(this.src.x, this.src.y, this.dest.x, this.dest.y);
        } else {
            this.unset();
        }
    }
}

export interface Orbit {
    center: Celestial,
    radius: number,
    angle: number,
    clockwise: boolean
}

export class Celestial extends Phaser.GameObjects.Container {
    unit: unitai.Celestial;
    orbit: Orbit;
    spawnCount: number;
    ships: Phaser.GameObjects.Group;
    conquered: number;
    conquerArc: Phaser.GameObjects.Arc | undefined;
    vision: Phaser.GameObjects.Arc;

    constructor(scene: Phaser.Scene,
                radius: number,
                location: Orbit | Phaser.Math.Vector2,
                player: unitai.PlayerId,
                spawnCount: number,
                ships: Phaser.GameObjects.Group) {
        super(scene);
        this.ships = ships;
        this.spawnCount = spawnCount;

        if (player !== unitai.PlayerId.None) {
            const color = PlayerColors[player];
            this.add(new Phaser.GameObjects.Arc(scene, 0, 0, radius + 10, 0, 360, false, color, 0.6));
        }
        this.add(new Phaser.GameObjects.Arc(scene, 0, 0, radius, 0, 360, false, 0x888888));
        if (player === unitai.PlayerId.Player || player === unitai.PlayerId.Enemy) {
            const enemyColor = PlayerColors[1-player];
            this.conquerArc = new Phaser.GameObjects.Arc(scene, 0, 0, radius, 0, 360, false, enemyColor);
            this.conquerArc.visible = false;
            this.add(this.conquerArc);
        }

        this.unit = {
            position: new Phaser.Math.Vector2(),
            velocity: new Phaser.Math.Vector2(),
            radius: radius,
            player: player,
        };
        this.conquered = 0;
        this.vision = new Phaser.GameObjects.Arc(scene,
            0, 0, radius + CelestialVisionRange, 0, 360, false, 0x000000);
        if (location instanceof Phaser.Math.Vector2) {
            this.orbit = undefined;
            this.setPosition(location.x, location.y);
            // Constant {position, velocity}
            this.unit.position.copy(location);
            this.unit.velocity.reset();
        } else {
            this.orbit = {...location};
            this.updateOrbit(0); // Set {this.x, this.y}
        }
    }
    angularSpeed(): number {
        const direction = (1 - 2 * +this.orbit.clockwise);
        return direction * GravityPerRadius * this.orbit.center.unit.radius / this.orbit.radius;
    }
    futurePosition(dt: number, out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
        const angle = this.orbit.angle + dt * this.angularSpeed();
        const rcos = this.orbit.radius * Math.cos(angle);
        const rsin = this.orbit.radius * Math.sin(angle);
        const x = this.orbit.center.x + rcos;
        const y = this.orbit.center.y + rsin;
        return out.set(x, y);
    }
    updateOrbit(dt: number): void {
        const angularSpeed = this.angularSpeed();
        this.orbit.angle += angularSpeed * dt;
        const rcos = this.orbit.radius * Math.cos(this.orbit.angle);
        const rsin = this.orbit.radius * Math.sin(this.orbit.angle);
        this.x = this.orbit.center.x + rcos;
        this.y = this.orbit.center.y + rsin;
        this.unit.position.set(this.x, this.y);
        this.unit.velocity.set(-angularSpeed * rsin, angularSpeed * rcos);
    }
    update(dt: number): void {
        // Orbiting
        if (this.orbit !== undefined) {
            this.updateOrbit(dt);
        }
        // Conquering
        if (this.unit.player === unitai.PlayerId.Player || this.unit.player === unitai.PlayerId.Enemy) {
            if (this.isBeingConquered()) {
                this.updateConquered(dt);
            } else if (this.conquered > 0) {
                this.updateConquered(-dt);
            }
        }
    }
    updateConquered(delta: number): void {
        this.conquered = Phaser.Math.Clamp(this.conquered + delta, 0, ConquerTime);
        this.conquerArc.visible = this.conquered > 0;
        this.conquerArc.radius = this.unit.radius * Math.sqrt(this.conquered / ConquerTime);
        if (this.conquered === ConquerTime) {
            this.scene.scene.transition({
                "target": "end",
                "data": {winner: this.unit.player === unitai.PlayerId.Enemy ? 1 : -1},
                "duration": 0
            });
            this.scene.scene.setActive(false);
        }
    }
    isBeingConquered(): boolean {
        const bodies = this.scene.physics.overlapCirc(
            this.x, this.y, unitai.orbitalRadius(this.unit) + unitai.OrbitThresholdOffset
        );
        let nFriendly = 0;
        for (let i = 0; i < bodies.length; ++i) {
            const ship = <Ship>bodies[i].gameObject;
            nFriendly += +(ship.unit.player === this.unit.player);
            if (nFriendly >= ConquerDefenders) {
                return false;
            }
        }
        return bodies.length > 2 * nFriendly;
    }
    spawn(): void {
        const a = Phaser.Math.PI2 * (Math.random() - .5);
        const r = unitai.orbitalRadius(this.unit);
        const x = this.x + r * Math.cos(a);
        const y = this.y + r * Math.sin(a);
        const ship = <Ship>this.ships.get();
        // Initially face outwards
        ship.setup(x, y, a, this.unit.player);
        ship.commander.orbit(this.unit);
        // Slight hack - we know we're already in orbit, but don't want to randomly sample a
        // new position, so set the orbital angle manually
        ship.commander.orbitalAngle = a;
    }
}
