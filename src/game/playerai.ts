import Phaser from "phaser";
import * as player from "./player";
import * as objects from "./objects";
import * as unitai from "./unitai";

// State is a simple priority order of commands to follow
interface State {
    patrol: Phaser.Math.Vector2 | undefined;
    orbit: unitai.Celestial | undefined;
}

export class PlayerAI {
    player: player.ActivePlayer;
    celestials: objects.Celestial[];
    opponentHome: objects.Celestial;
    state: State;

    constructor(player: player.ActivePlayer, celestials: objects.Celestial[]) {
        this.player = player;
        this.celestials = celestials;
        this.opponentHome = celestials.find(c => c.unit.player === unitai.PlayerId.Player);
        this.state = {
            patrol: undefined,
            orbit: this.opponentHome.unit,
        };
    }
    objectivePosition(): Phaser.Math.Vector2 {
        // Reverse priority order - highest level objective first
        if (this.state.orbit !== undefined) {
            return this.state.orbit.position;
        }
        return this.state.patrol;
    }
    update(myShips: objects.Ship[], otherShips: objects.Ship[]): void {
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
}
