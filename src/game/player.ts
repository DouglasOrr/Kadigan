import Phaser from "phaser";
import * as economy from "./economy";
import * as objects from "./objects";
import * as unitai from "./unitai";

export interface Player {
    // Called once per second to generate income & spawn ships
    updateEconomy(): void;
}

export class ActivePlayer implements Player {
    id: unitai.PlayerId;
    home: objects.Celestial;
    account: economy.Account;

    constructor(scene: Phaser.Scene, id: integer, home: objects.Celestial, bonus: number) {
        this.id = id;
        this.home = home;
        this.account = new economy.Account(bonus);
        for (let i = 0; i < this.home.spawnCount; ++i) {
            this.home.spawn();
        }
        scene.events.on("shipdestroyed", (killer: objects.Ship, victim: objects.Ship) => {
            if (killer.unit.player === id &&
                victim.unit.player === unitai.PlayerId.Neutral) {
                this.account.creditNeutralKill();
            }
        });
    }
    updateEconomy(): void {
        const newShips = this.account.update();
        for (let i = 0; i < newShips; ++i) {
            this.home.spawn();
        }
    }
}

export class NeutralPlayer {
    scene: Phaser.Scene;
    celestial: objects.Celestial;
    respawn: integer | undefined;

    constructor(scene: Phaser.Scene, celestial: objects.Celestial) {
        this.scene = scene;
        this.celestial = celestial;
        this.spawn();
    }
    spawn(): void {
        this.respawn = undefined;
        for (let i = 0; i < this.celestial.spawnCount; ++i) {
            this.celestial.spawn();
        }
    }
    updateEconomy(): void {
        if (this.respawn !== undefined) {
            this.respawn -= 1;
            if (this.respawn === 0) {
                this.spawn();
            }
        } else {
            // Do we need to start the respawn timer?
            const hasNeutral = this.scene.physics.overlapCirc(
                this.celestial.x, this.celestial.y,
                unitai.orbitalRadius(this.celestial.unit) + unitai.OrbitThresholdOffset
            ).some(body => {
                const ship = <objects.Ship>body.gameObject;
                return ship.unit.player === unitai.PlayerId.Neutral;
            });
            if (!hasNeutral) {
                this.respawn = Phaser.Math.Between(90, 120);
            }
        }
    }
}
