import Phaser from "phaser";

// Central resource is unit [j] - the "jam"
export const CapitalDelay = 10;  // s
export const ShipCost = 10;  // j
export const MinIncome = 1;
export const MaxIncome = 4;
export function capitalToIncome(capital: number): number {
    return MinIncome + (MaxIncome - MinIncome) * (1 - Math.pow(2, -capital/100));
}

export class Account {
    // Controls
    spending: number;  // - (proportion of income to spend on production)
    hold: boolean;  // (if true don't produce ships, just accrue production balance)

    // Attibutes (do not modify outside class)
    capital: number;  // j (total realized investment)
    production: number;  // j (current production account balance)
    _investments: number[];  // [j]

    constructor() {
        this.spending = 0.5;
        this.hold = false;
        this.capital = 0;
        this.production = 0;
        this._investments = [];
    }
    update(): integer {
        if (this._investments.length === CapitalDelay) {
            this.capital += this._investments.shift();
        }
        const income = capitalToIncome(this.capital);
        const spending = Phaser.Math.Clamp(this.spending, 0, 1);
        this.production += spending * income;
        this._investments.push((1 - spending) * income);

        if (this.hold) {
            return 0;
        }
        const ships = Math.floor(this.production / ShipCost);
        this.production -= ships * ShipCost;
        return ships;
    }
}
