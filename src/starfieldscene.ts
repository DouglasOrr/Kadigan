import Phaser from "phaser";

export default class StarfieldScene extends Phaser.Scene {
    constructor() {
        super({key: "starfield"});
    }
    create(): void {
        // Render to a reasonably sized texture to avoid redrawing tiny stars every
        // single frame!
        const tex = this.add.renderTexture(0, 0, 3072, 2048).setOrigin(0.5, 0.5).setScale(3.5);
        const stars = [];
        for (let i = 0; i < 4000; ++i) {
            const d = Math.random() ** 3;
            const size = 2 * d;
            const color = <Phaser.Display.Color> Phaser.Display.Color.HSVToRGB(
                0, 0.1 * (1 - d), Math.random() * d);
            stars.push(new Phaser.GameObjects.Arc(this,
                Phaser.Math.Between(0, tex.width), Phaser.Math.Between(0, tex.height),
                size, 0, 360, false, color.color
            ));
        }
        tex.draw(stars);

        this.scene.get("game").events.on("updatecamera", this.updateCamera, this);
    }
    updateCamera(gameCamera: Phaser.Cameras.Scene2D.Camera): void {
        const camera = this.cameras.main;
        camera.zoom = 0.25 * gameCamera.zoom ** 0.1;
        // Don't use midPoint, as it may not have been computed yet
        const x = gameCamera.scrollX + gameCamera.width*.5;
        const y = gameCamera.scrollY + gameCamera.height*.5;
        camera.centerOn(x / 4, y / 4);
    }
}
