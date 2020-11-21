import * as economy from "./economy";

test("capitalToIncome basic properties", () => {
    expect(economy.capitalToIncome(0)).toBeCloseTo(1);

    const gap0 = economy.capitalToIncome(2) - economy.capitalToIncome(0);
    const gap5 = economy.capitalToIncome(7) - economy.capitalToIncome(5);
    expect(gap5).toBeGreaterThan(0);
    expect(gap5).toBeLessThan(gap0);

    expect(economy.capitalToIncome(10)).not.toBeCloseTo(economy.capitalToIncome(11));
    expect(economy.capitalToIncome(10000)).toBeCloseTo(economy.capitalToIncome(10001));
});

test("Account, simple schedules", () => {
    const eco = new economy.Account();
    eco.spending = 1.0;
    let totalShips = 0;
    for (let i = 0; i < 5 * economy.ShipCost; ++i) {
        totalShips += eco.update();
    }
    expect(totalShips).toBe(5);

    eco.spending = 0.0;
    for (let i = 0; i < 5 * economy.ShipCost; ++i) {
        totalShips += eco.update();
    }
    expect(totalShips).toBe(5);  // no ships being produced - everything is invested

    eco.spending = 1.0;
    for (let i = 0; i < 5 * economy.ShipCost; ++i) {
        totalShips += eco.update();
    }
    expect(totalShips).toBeGreaterThan(10); // production should have increased
});

test("Account, hold", () => {
    const eco = new economy.Account();
    eco.spending = 1.0;
    eco.hold = true;
    let totalShips = 0;
    for (let i = 0; i < 5 * economy.ShipCost; ++i) {
        totalShips += eco.update();
    }
    expect(totalShips).toBe(0);
    eco.hold = false;
    expect(eco.update()).toBe(5);
});
