import Phaser from "phaser";

export default class EndScene extends Phaser.Scene {
    constructor() {
        super("end");
    }
    create(data: {winner: number}): void {
        let outcome = "Draw.";
        let outcomeFadeDuration = 1000;
        if (data.winner === 1) {
            outcome = "Victory.";
            outcomeFadeDuration = 500;
        }
        if (data.winner === -1) {
            outcome = "Defeat.";
            outcomeFadeDuration = 3000;
        }
        const camera = this.cameras.main;
        const bg = this.add.rectangle(0, 0, camera.width, camera.height, 0x000000, 0.5)
            .setAlpha(0).setOrigin(0, 0);
        const text = this.add.text(camera.width/2, camera.height/4, outcome)
            .setAlpha(0).setOrigin(0.5, 0.5).setFontSize(40);

        this.tweens.timeline()
            .add({
                targets: bg,
                alpha: {from: 0, to: 1},
                duration: 2000,
                ease: "Power1",
            })
            .add({
                targets: text,
                alpha: {from: 0, to: 1},
                duration: outcomeFadeDuration,
                ease: "Power2",
            })
            .play();
    }
}
