import Phaser from "phaser";

// Central resource is unit [j] - the "jam"
export const CapitalDelay = 10;  // s
export const ShipCost = 8;  // j
export const NeutralReward = 4; // j
export const MinIncome = 1; // j/s
export const MaxIncome = 4; // j/s
export function capitalToIncome(capital: number, bonus: number): number {
    const base = MinIncome + (MaxIncome - MinIncome) * (1 - Math.pow(2, -capital/180));
    return bonus * base;
}
export function breakEvenTime(capital: number, bonus: number): number {
    return CapitalDelay + 1 / (capitalToIncome(capital + 1, bonus) - capitalToIncome(capital, bonus));
}

export class Account {
    // Controls
    spending: number;  // - (proportion of income to spend on production)
    hold: boolean;  // (if true don't produce ships, just accrue production balance)

    // Attibutes (do not modify outside class)
    bonus: number;  // - (multiplier for income)
    capital: number;  // j (total realized investment)
    production: number;  // j (current production account balance)
    investments: number[];  // [j]

    constructor(bonus: number) {
        this.spending = 0.5;
        this.hold = false;
        this.bonus = bonus;
        this.capital = 0;
        this.production = 0;
        this.investments = [0];
    }
    addIncome(income: number): void {
        const spending = Phaser.Math.Clamp(this.spending, 0, 1);
        this.production += spending * income;
        this.investments[this.investments.length - 1] += (1 - spending) * income;
    }
    update(): integer {
        if (this.investments.length === CapitalDelay) {
            this.capital += this.investments.shift();
        }
        this.investments.push(0);
        this.addIncome(capitalToIncome(this.capital, this.bonus));

        if (this.hold) {
            return 0;
        }
        const ships = Math.floor(this.production / ShipCost);
        this.production -= ships * ShipCost;
        return ships;
    }
    creditNeutralKill(): void {
        this.addIncome(NeutralReward);
    }
    // Capital plus current "queued" investment
    futureCapital(): number {
        return this.capital + this.investments.reduce((x, y) => x + y, 0);
    }
}
