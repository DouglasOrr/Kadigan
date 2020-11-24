import Phaser from "phaser";
import * as player from "./player";
import * as objects from "./objects";
import * as unitai from "./unitai";
import * as economy from "./economy";

// Fast forward into the future & try to discover the time of closest approach
function getClosestApproachTime(src: objects.Celestial, dest: objects.Celestial,
    interval: number, limit: number) {
    if (src.orbit.center.orbit !== undefined || dest.orbit.center.orbit !== undefined) {
        console.warn("Cannot forecast 'double orbits'");
        return limit;
    }
    let closestDistanceSq = Phaser.Math.Distance.BetweenPointsSquared(src.unit.position, dest.unit.position);
    let closestTime = 0;
    const srcPos = new Phaser.Math.Vector2();
    const destPos = new Phaser.Math.Vector2();
    for (let t = interval; t <= limit; t += interval) {
        const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
            src.futurePosition(t, srcPos), dest.futurePosition(t, destPos));
        if (distanceSq < closestDistanceSq) {
            closestTime = t;
            closestDistanceSq = distanceSq;
        }
    }
    return closestTime;
}

// State is a priority order of commands to follow
interface State {
    patrol: Phaser.Math.Vector2 | undefined;
    orbit: unitai.Celestial | undefined;
}

export class PlayerAI {
    player: player.ActivePlayer;
    celestials: objects.Celestial[];
    opponentHome: objects.Celestial;
    state: State;
    nextAttackTime: integer;
    debugText?: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, player: player.ActivePlayer, celestials: objects.Celestial[],
        debug: boolean) {
        if (debug) {
            const hud = scene.scene.manager.getScene("hud");
            this.debugText = hud.add.text(hud.cameras.main.width - 10, 10, "<debug>", {
                fontSize: 13,
            }).setOrigin(1, 0);
        }

        this.player = player;
        this.celestials = celestials;
        this.opponentHome = celestials.find(c => c.unit.player === unitai.PlayerId.Player);
        this.state = {
            patrol: undefined,
            orbit: this.player.home.unit,
        };
        this.nextAttackTime = 0;
    }
    updateDebug(time: integer): void {
        let currentCommand = "none";
        if (this.state.patrol !== undefined) {
            currentCommand = `patrol(${this.state.patrol.x.toFixed(0)}, ${this.state.patrol.y.toFixed(0)})`
        } else if (this.state.orbit !== undefined) {
            const owner = unitai.PlayerId[this.state.orbit.player];
            currentCommand = `orbit(${owner})`
        }
        const spending = 100 * this.player.account.spending;
        const nextAttack = (this.nextAttackTime - time);
        const breakEven = economy.breakEvenTime(this.player.account.futureCapital());
        this.debugText.setText([
            currentCommand,
            `prod: ${spending.toFixed(0)}%`,
            `next: ${nextAttack}s`,
            `even: ${breakEven.toFixed(0)}s`,
        ]);
    }
    objectivePosition(): Phaser.Math.Vector2 {
        // Reverse priority order - highest level objective first
        if (this.state.orbit !== undefined) {
            return this.state.orbit.position;
        }
        return this.state.patrol;
    }
    updatePlan(time: integer): void {
        if (this.nextAttackTime <= time) {
            // TODO - work out what to do?
            this.nextAttackTime = getClosestApproachTime(this.player.home, this.opponentHome, 30, 300);
        }
        if (time < this.nextAttackTime) {
            this.state.orbit = this.player.home.unit;
        } else {
            this.state.orbit = this.opponentHome.unit;
        }
    }
    updateEconomy(time: integer): void {
        const timeToAttack = this.nextAttackTime - time;
        const breakEven = economy.breakEvenTime(this.player.account.futureCapital());
        this.player.account.spending = breakEven < timeToAttack ? 0 : 1;
    }
    updateShipCommand(myShips: objects.Ship[], otherShips: objects.Ship[]): void {
        if (myShips.length === 0) {
            return; // No ships to command
        }

        // Elect a leader - who has the most friendly ships within radius
        let leader: objects.Ship;
        let nearbyCount = -1;
        for (let i = 0; i < myShips.length; ++i) {
            const position = myShips[i].unit.position;
            let count = 0;
            for (let j = 0; j < i; ++j) {
                const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
                    position, myShips[j].unit.position);
                count += +(distanceSq < 150 * 150);
            }
            if (count > nearbyCount) {
                leader = myShips[i];
                nearbyCount = count;
            }
        }

        // Debugging utility
        // myShips.forEach(ship => ship.select(false));
        // leader.select(true);

        // Have we finished grouping up?
        const grouped = 0.75 <= nearbyCount / myShips.length;
        if (this.state.patrol !== undefined && grouped) {
            this.state.patrol = undefined;
        }

        // Do we need to group up?
        const objectivePosition = this.objectivePosition();
        const distanceToObjective = Phaser.Math.Distance.BetweenPoints(
            leader.unit.position, objectivePosition);
        if (600 < distanceToObjective && this.state.patrol === undefined && !grouped) {
            this.state.patrol = new Phaser.Math.Vector2(objectivePosition)
                .subtract(leader.unit.position)
                .scale(300/distanceToObjective)
                .add(leader.unit.position);
        }

        // Do we need to cluster for an attack?
        if (this.state.patrol === undefined && 3 <= otherShips.length) {
            let closestOther: objects.Ship;
            let closestDistanceSq = Infinity;
            for (let i = 0; i < otherShips.length; ++i) {
                const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
                    leader.unit.position, otherShips[i].unit.position);
                if (distanceSq < closestDistanceSq) {
                    closestDistanceSq = distanceSq;
                    closestOther = otherShips[i];
                }
            }
            const closestDistance = Math.sqrt(closestDistanceSq);
            this.state.patrol = new Phaser.Math.Vector2(closestOther.unit.position)
                .subtract(leader.unit.position)
                .scale((closestDistance - objects.LazerRange * 0.8) / closestDistance)
                .add(leader.unit.position);
        }

        // Execute the chosen command
        myShips.forEach(ship => {
            if (this.state.patrol !== undefined) {
                ship.commander.patrol(this.state.patrol.x, this.state.patrol.y);
            } else if (this.state.orbit !== undefined) {
                ship.commander.orbit(this.state.orbit);
            }
        });
    }
    update(time: integer, myShips: objects.Ship[], otherShips: objects.Ship[]): void {
        this.updatePlan(time);
        this.updateEconomy(time);
        this.updateShipCommand(myShips, otherShips);
        if (this.debugText !== undefined) {
            this.updateDebug(time);
        }
    }
}
