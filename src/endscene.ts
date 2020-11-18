import Phaser from "phaser";

export default class EndScene extends Phaser.Scene {
    constructor() {
        super("end");
    }
    create(data: {winner: number}): void {
        let message = "Draw.";
        if (data.winner === 1) {
            message = "Victory.";
        }
        if (data.winner === -1) {
            message = "Defeat.";
        }

        const camera = this.cameras.main;
        this.add.rectangle(0, 0, camera.width, camera.height, 0x000000, 0.5).setOrigin(0, 0);
        this.add.text(camera.width/2, camera.height/2, message).setOrigin(0.5, 0.5).setFontSize(40);
    }
}
