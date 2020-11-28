import Phaser from "phaser";
import * as player from "./player";
import * as objects from "./objects";
import * as unitai from "./unitai";
import * as economy from "./economy";

export enum Difficulty {
    Easy,
    Medium,
    Hard,
}

// Fast forward into the future & try to discover the time of closest approach
function getClosestApproachTime(src: objects.Celestial, dest: objects.Celestial,
    interval: number, limit: number) {
    if ((src.orbit !== undefined && src.orbit.center.orbit !== undefined) ||
        (dest.orbit !== undefined && dest.orbit.center.orbit !== undefined)) {
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

function closest(center: Phaser.Math.Vector2, ships: objects.Ship[], out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    let closest: objects.Ship;
    let closestDistanceSq = Infinity;
    for (let i = 0; i < ships.length; ++i) {
        const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
            center, ships[i].unit.position);
        if (distanceSq < closestDistanceSq) {
            closest = ships[i];
            closestDistanceSq = distanceSq;
        }
    }
    return out.copy(closest.unit.position);
}

function countInRadius(center: Phaser.Math.Vector2, radius: number, ships: objects.Ship[]): integer {
    let count = 0;
    for (let i = 0; i < ships.length; ++i) {
        const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
            center, ships[i].unit.position);
        count += +(distanceSq < radius * radius);
    }
    return count;
}

function meanInRadius(center: Phaser.Math.Vector2, radius: number, ships: objects.Ship[],
    out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    let x = 0;
    let y = 0;
    let count = 0;
    for (let i = 0; i < ships.length; ++i) {
        const distanceSq = Phaser.Math.Distance.BetweenPointsSquared(
            center, ships[i].unit.position);
        if (distanceSq < radius * radius) {
            count += 1;
            x += ships[i].unit.position.x;
            y += ships[i].unit.position.y;
        }
    }
    return out.set(x / count, y / count);
}

function getPointAtDistance(position: Phaser.Math.Vector2, target: Phaser.Math.Vector2,
    targetDistance: number, out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const currentDistance = Phaser.Math.Distance.BetweenPoints(position, target);
    return out.copy(target)
        .subtract(position)
        .scale((currentDistance - targetDistance) / currentDistance)
        .add(position);
}

enum PlanType {
    Wait,
    Invade,
}

interface Plan {
    type: PlanType;
    time?: integer;
    target?: objects.Celestial;
}

enum ActionType {
    Move,
    Group,
    Attack,
    Retreat,
}

interface Action {
    type: ActionType,
    patrol: Phaser.Math.Vector2,
    orbit: objects.Celestial,
}

export class PlayerAI {
    scene: Phaser.Scene;
    player: player.ActivePlayer;
    celestials: objects.Celestial[];
    opponentHome: objects.Celestial;
    plan: Plan;
    action: Action;
    debug: boolean;

    constructor(scene: Phaser.Scene, player: player.ActivePlayer, celestials: objects.Celestial[],
        debug: boolean) {
        this.scene = scene;
        this.player = player;
        this.celestials = celestials;
        this.opponentHome = celestials.find(c => c.unit.player === unitai.PlayerId.Player);
        this.plan = {type: PlanType.Wait, time: 0, target: undefined};
        this.action = {
            type: ActionType.Move,
            patrol: new Phaser.Math.Vector2,
            orbit: this.player.home,
        }
        this.debug = debug;
        this.replan(0);
    }
    updateDebug(time: integer): void {
        let planStr: string;
        if (this.plan.type === PlanType.Wait) {
            planStr = `Wait(${(this.plan.time - time).toFixed(0)}s)`
        } else {
            planStr = `Invade(${unitai.PlayerId[this.plan.target.unit.player]})`
        }
        let actionStr: string;
        if (this.action.type === ActionType.Move) {
            actionStr = `Move(${unitai.PlayerId[this.action.orbit.unit.player]})`
        } else {
            const v = this.action.patrol;
            actionStr = `${ActionType[this.action.type]}(${v.x.toFixed(0)}, ${v.y.toFixed(0)})`
        }
        const spending = 100 * this.player.account.spending;
        const breakEven = economy.breakEvenTime(this.player.account.futureCapital());
        this.scene.events.emit("aidebugtext", [
            planStr,
            `prod: ${spending.toFixed(0)}% (${breakEven.toFixed(0)}s)`,
            actionStr,
        ]);
    }
    replan(time: integer): void {
        this.plan.type = PlanType.Wait;
        // TODO - plan for neutrals too
        const approachTime = getClosestApproachTime(this.player.home, this.opponentHome, 30, 300);
        this.plan.time = time + Math.max(60, approachTime);
        this.plan.target = this.opponentHome;
    }
    updatePlan(time: integer): void {
        if (this.plan.type === PlanType.Wait && this.plan.time < time) {
            this.plan.type = PlanType.Invade;
            this.plan.time = time + 120;
        }
        // TODO - use "outnumbered" rather than "timeout" to swap out of "Invade"
        if (this.plan.type === PlanType.Invade && this.plan.time < time) {
            this.replan(time);
        }
    }
    updateEconomy(time: integer): void {
        if (this.plan.type === PlanType.Wait) {
            const timeToInvade = this.plan.time - time;
            const breakEven = economy.breakEvenTime(this.player.account.futureCapital());
            this.player.account.spending = breakEven < timeToInvade ? 0 : 1;
        } else {
            // Invade => keep producing ships!
            this.player.account.spending = 1;
        }
    }
    objective(): objects.Celestial {
        if (this.plan.type === PlanType.Wait) {
            return this.player.home;
        }
        return this.plan.target;
    }
    updateShipCommand(friendlies: objects.Ship[], enemies: objects.Ship[]): void {
        if (friendlies.length === 0) {
            return; // No ships to command
        }

        // Elect a leader - who has the most friendly ships within radius
        let leader: objects.Ship;
        let leaderCount = -1;
        for (let i = 0; i < friendlies.length; ++i) {
            const count = countInRadius(friendlies[i].unit.position, 150, friendlies);
            if (count > leaderCount) {
                leader = friendlies[i];
                leaderCount = count;
            }
        }
        // Debugging utility
        // myShips.forEach(ship => ship.select(false));
        // leader.select(true);

        const NearbyThreshold = objects.ShipVisionRange + 200;
        const nearbyEnemies = countInRadius(leader.unit.position, NearbyThreshold, enemies);
        const nearbyFriendlies = countInRadius(leader.unit.position, NearbyThreshold, friendlies);

        // RETREAT
        if (nearbyFriendlies * 1.5 < nearbyEnemies) {
            this.action.type = ActionType.Retreat;
            const enemyCenter = meanInRadius(
                leader.unit.position, NearbyThreshold, enemies, this.action.patrol);
            this.action.patrol = getPointAtDistance(
                leader.unit.position, enemyCenter, objects.LazerRange * 1.2, enemyCenter);
            return;
        }

        // ATTACK
        if (3 <= nearbyEnemies) {
            this.action.type = ActionType.Attack;
            const closestEnemy = closest(leader.unit.position, enemies, this.action.patrol);
            this.action.patrol = getPointAtDistance(
                leader.unit.position, closestEnemy, objects.LazerRange * 0.8, closestEnemy);
            return;
        }

        // GROUP
        const grouped = 0.75 <= leaderCount / friendlies.length;
        const objective = this.objective();
        const distanceToObjective = Phaser.Math.Distance.BetweenPoints(
            leader.unit.position, objective);
        if (this.action.type === ActionType.Group && !grouped) {
            // Already grouping - keep the current group command
            return;
        }
        if (this.action.type !== ActionType.Group && !grouped && 600 < distanceToObjective) {
            // Start grouping
            this.action.type = ActionType.Group;
            this.action.patrol.copy(objective.unit.position)
                .subtract(leader.unit.position)
                .scale(300/distanceToObjective)
                .add(leader.unit.position);
            return;
        }

        // MOVE
        this.action.type = ActionType.Move;
        this.action.orbit = objective;
    }
    update(time: integer, friendlies: objects.Ship[], enemies: objects.Ship[]): void {
        this.updatePlan(time);
        this.updateEconomy(time);
        this.updateShipCommand(friendlies, enemies);
        if (this.debug) {
            this.updateDebug(time);
        }
        // Execute the chosen command
        friendlies.forEach(ship => {
            if (this.action.type === ActionType.Move) {
                ship.commander.orbit(this.action.orbit.unit);
            } else {
                ship.commander.patrol(this.action.patrol.x, this.action.patrol.y);
            }
        });
    }
}
