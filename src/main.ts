import Phaser from "phaser"
import TitleScreen from "./titlescreen"
import LaunchScreen from "./launchscreen"
import GameScene from "./game/scene"
import HudScene from "./game/hudscene"
import StarfieldScene from "./starfieldscene"
import EndScene from "./endscene"
import ShaderTestScreen from "./shadertestscreen";
import InGameOptionsScene from "./ingameoptionsscene"

const config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    scale: {
        mode: Phaser.Scale.RESIZE,
    },
    scene: [
        // Main
        TitleScreen,
        LaunchScreen,
        GameScene,
        // Overlays
        StarfieldScene,
        HudScene,
        InGameOptionsScene,
        EndScene,
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

declare global {
    interface Window { game: Phaser.Game; }
}
window.game = new Phaser.Game(config);
