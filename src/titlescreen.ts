import Phaser from "phaser";
import * as game from "./game/scene";
import * as playerai from "./game/playerai";

function getScript() {
    const hour = new Date().getHours();
    const greeting = `Good ${hour < 12 ? "morning" : (hour < 19 ? "afternoon" : "evening")}.`
    return [
        greeting,
        "It's the year <insert_future_date>.",
        "After the <apocalyptic_event>, humankind must fight the forces of <enemy> for survival in a lonely galaxy.",
        "You are <protagonist>, <rank> of strike force \\u03b5, sent to <mission>.",
        "[Add engaging conceit to set up / excuse unrealistic 2D RTS gameplay.]",
    ];
}

// [Dev utility] support loading a scene immediately using the
// query string "scene=NAME&..."
function switchToScene(scene: Phaser.Scene, params: URLSearchParams) {
    const config = {
        target: params.get("scene"),
        data: undefined,
        duration: 0,
    };
    if (config.target === "game") {
        const settings = {...game.DEFAULT_SETTINGS};
        if (params.has("pointerpan")) {
            settings.pointerPan = {true: true, false: false}[params.get("pointerpan")];
        }
        if (params.has("fog")) {
            settings.fog = {true: true, false: false}[params.get("fog")];
        }
        if (params.has("debugai")) {
            settings.debugAi = {true: true, false: false}[params.get("debugai")];
        }
        if (params.has("aidifficulty")) {
            settings.aidifficulty = {
                easy: playerai.Difficulty.Easy,
                medium: playerai.Difficulty.Medium,
                hard: playerai.Difficulty.Hard
            }[params.get("aidifficulty")];
        }
        config.data = settings;

    } else if (config.target === "end") {
        const winner = params.has("winner") ? parseInt(params.get("winner")) : 0;
        config.data = {winner: winner};

    } else if (config.target in {starfield: 0, shadertest: 0, launch: 0, ingameoptions: 0}) {
        // No options

    } else {
        console.warn(`Unknown scene ${config.target}`);
    }
    scene.scene.transition(config);
}

// Types through a predetermined message
class Typist {
    scene: Phaser.Scene;
    text: Phaser.GameObjects.Text;
    message: string[];
    onComplete: () => void;
    character: integer;
    line: integer;
    timer: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, text: Phaser.GameObjects.Text, message: string[],
            onComplete: () => void) {
        this.scene = scene;
        this.text = text;
        this.message = message;
        this.onComplete = onComplete;
        this.character = 0;
        this.line = 0;
        this.timer = scene.time.addEvent({
            callback: this.tick,
            callbackScope: this,
            delay: 50,
            loop: true,
        });
    }
    tick() {
        if (this.line < this.message.length) {
            const line = this.message[this.line];
            this.character += 1;
            if (this.character <= line.length) {
                // Type
                this.text.setText(line.substr(0, this.character) + " ");
            } else if (this.character <= line.length + 40) {
                // Blink & wait
                this.text.setText(line + ((this.character/4) % 2 < 1 ? "_" : " "));
            } else {
                // Next line
                this.line += 1;
                this.character = 0;
            }
        } else {
            // Fade out
            this.scene.tweens.add({
                targets: this.text,
                alpha: {from: 1, to: 0},
                duration: 3000,
                ease: "Power0",
                onComplete: this.onComplete,
            });
            this.timer.remove();
        }
    }
    click() {
        if (this.line < this.message.length) {
            const line = this.message[this.line];
            if (this.character < line.length) {
                this.character = line.length;
            } else {
                this.line += 1;
                this.character = 0;
            }
            this.tick();
        }
        if (this.line >= this.message.length) {
            this.onComplete();
            this.timer.remove();
        }
    }
}

export default class TitleScreen extends Phaser.Scene {
    text: Phaser.GameObjects.Text;
    skipText: Phaser.GameObjects.Text;
    typing: Phaser.Time.TimerEvent;
    typist: Typist;

    constructor() {
        super("title");
    }
    create(): void {
        const params = new URLSearchParams(window.location.search);
        if (params.has("scene")) {
            switchToScene(this, params);
            return;
        }
        if (params.get("skiptitle") === "true") {
            this.transitionToLaunch();
            return;
        }

        const camera = this.cameras.main;
        this.text = this.add.text(camera.displayWidth/2, camera.displayHeight/2, "")
            .setOrigin(0, 0)
            .setFontSize(20)
            .setLineSpacing(6)
            .setAlpha(1);
        this.skipText = this.add.text(camera.displayWidth - 10, 10, "Skip")
            .setInteractive()
            .setOrigin(1, 0)
            .setFontSize(14)
            .setColor("#999");
        this.skipText.on("pointerover", () => this.skipText.setFontStyle("bold").setColor("#fff"), this.skipText);
        this.skipText.on("pointerout", () => this.skipText.setFontStyle("normal").setColor("#999"), this.skipText);
        this.skipText.on("pointerup", this.transitionToLaunch, this);
        this.updateSize();

        this.typist = new Typist(this, this.text, getScript(), this.transitionToLaunch.bind(this));
        this.input.on("pointerdown", this.typist.click, this.typist);
        this.scale.on("resize", this.updateSize, this);
    }
    transitionToLaunch(): void {
        this.scene.transition({
            target: "launch",
            duration: 0,
        });
    }
    updateSize(): void {
        const camera = this.cameras.main;
        // This isn't great - seems like the listener is still attached even after the scene dies...
        if (camera !== undefined) {
            const w = Math.min(camera.displayWidth*0.75, 800);
            this.text.setPosition(camera.displayWidth/2 - w/2, camera.displayHeight/2 - 40)
                .setWordWrapWidth(w);
            this.skipText.setPosition(camera.displayWidth - 10, 10);
        }
    }
}
