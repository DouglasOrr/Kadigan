import Phaser from "phaser"
import TitleScreen from "./titlescreen"
import GameScene from "./game/scene"
import HudScene from "./game/hudscene"
import StarfieldScene from "./starfieldscene"
import ShaderTestScreen from "./shadertestscreen"
import * as settingsscenes from "./settingsscenes"
import * as unitai from "./game/unitai"

const Config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.RESIZE,
    },
    scene: [
        // Main
        TitleScreen,
        settingsscenes.LaunchScreen,
        GameScene,
        // Overlays
        StarfieldScene,
        HudScene,
        settingsscenes.InGameOptionsScene,
        settingsscenes.EndScene,
        // Other
        ShaderTestScreen,
    ],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 0 },
        },
    },
    disableContextMenu: true,
};

class Game extends Phaser.Game {
    constructor() {
        super(Config);
    }
    win(): void {
        const gameScene = window.game.scene.getScene("game");
        gameScene.events.emit("conquercelestial", unitai.PlayerId.Player);
    }
    lose(): void {
        const gameScene = window.game.scene.getScene("game");
        gameScene.events.emit("conquercelestial", unitai.PlayerId.Enemy);
    }
}

declare global {
    interface Window { game: Game; }
}
window.game = new Game();
window.addEventListener("keydown", event => {
    // This is a bit hacky - it's easy to run into race conditions
    // doing this in the individual scenes (due to lifecycle issues)
    if (event.code === "Escape") {
        const gameScene = window.game.scene.getScene("game");
        const endScene = window.game.scene.getScene("end");
        if (endScene.scene.isActive()) {
            // Do nothing
        } else if (gameScene.scene.isActive()) {
            window.game.scene.pause("hud");
            window.game.scene.pause("game");
            window.game.scene.run("ingameoptions");
        } else {
            window.game.scene.resume("hud");
            window.game.scene.resume("game");
            window.game.scene.sleep("ingameoptions");
        }
    }
});
