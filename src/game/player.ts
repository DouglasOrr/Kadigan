import Phaser from "phaser";
import * as economy from "./economy";
import * as objects from "./objects";
import * as unitai from "./unitai";

const StartingShips = 3;

export class Player {
    id: unitai.PlayerId;
    home: objects.Celestial;
    account: economy.Account;
    ships: Phaser.GameObjects.Group;

    constructor(id: integer, home: objects.Celestial, ships: Phaser.GameObjects.Group) {
        this.id = id;
        this.home = home;
        this.account = new economy.Account();
        this.ships = ships;
        for (let i = 0; i < StartingShips; ++i) {
            this.home.spawn(this.ships);
        }
    }
    // Called once per second to generate income & spawn ships
    updateEconomy(): void {
        const newShips = this.account.update();
        for (let i = 0; i < newShips; ++i) {
            this.home.spawn(this.ships);
        }
    }
}
