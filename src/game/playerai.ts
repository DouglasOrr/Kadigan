import * as player from "./player";
import * as objects from "./objects";
import * as unitai from "./unitai";

export class PlayerAI {
    player: player.ActivePlayer;
    celestials: objects.Celestial[];
    opponentHome: objects.Celestial;

    constructor(player: player.ActivePlayer, celestials: objects.Celestial[]) {
        this.player = player;
        this.celestials = celestials;
        this.opponentHome = celestials.find(c => c.unit.player === unitai.PlayerId.Player);
    }
    update(ships: objects.Ship[]): void {
        ships.forEach(ship => {
            if (ship.unit.player === unitai.PlayerId.Enemy) {
                ship.commander.orbit(this.opponentHome.unit);
            }
        });
    }
}
