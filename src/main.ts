import Phaser from "phaser"
import TitleScreen from "./titlescene"
import GameScene from "./game/scene"
import StarfieldScene from "./starfieldscene"
import HudScene from "./game/hudscene"
import EndScene from "./endscene"
import LaunchScreen from "./launchscreen"

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.RESIZE,
    },
    scene: [
        TitleScreen,
        LaunchScreen,
        GameScene,
        StarfieldScene,
        HudScene,
        EndScene,
    ],
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 0 }
        }
    },
    disableContextMenu: true,
};

declare global {
    interface Window { game: Phaser.Game; }
}
window.game = new Phaser.Game(config);
