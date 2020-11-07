import Phaser from "phaser";

test("equality", () => {
    expect(123).toBe(123);
});

test("phaser maths", () => {
    const v0 = new Phaser.Math.Vector2(2, 3);
    v0.add(new Phaser.Math.Vector2(10, 20));
    expect(v0).toStrictEqual(new Phaser.Math.Vector2(12, 23));
});
