import Phaser from "phaser";
import * as objects from "./objects";
import * as unitai from "./unitai";

export function preload(loader: Phaser.Loader.LoaderPlugin): void {
    loader.audio("lazer_low", "assets/lazer_low.mp3");
    loader.audio("lazer_mid", "assets/lazer_mid.mp3");
    loader.audio("lazer_high", "assets/lazer_high.mp3");
    loader.audio("pop", "assets/pop0.mp3");
    loader.audio("bleep", "assets/bleep0.mp3");
    loader.audio("music0", "assets/music0.mp3");
    loader.audio("music1", "assets/music1.mp3");
    loader.audio("music2", "assets/music2.mp3");
}

export class Sounds {
    scene: Phaser.Scene;
    throttles: Float32Array;
    enabled: boolean;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.throttles = new Float32Array(9).fill(0);
        this.enabled = true;
        scene.events.on("playercommand", this.onCommand, this);
        scene.events.on("lazerfired", this.onLazerFired, this);
        scene.events.on("shipdestroyed", this.onShipDestoyed, this);
    }
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    onLazerFired(src: objects.Ship, dest: objects.Ship): void {
        if (!this.enabled) { return; }
        const camera = this.scene.cameras.main;
        const isPlayer = src.unit.player === unitai.PlayerId.Player;
        const isDestPlayer = dest.unit.player === unitai.PlayerId.Player;
        const isEnemy = src.unit.player === unitai.PlayerId.Enemy;
        const isOnScreen = camera.worldView.contains(src.x, src.y);

        let soundIndex: integer;
        let sound: string;
        let volume = 1;
        let baseDelay = 100;

        // Axis 1 - unit type
        if (isPlayer) {
            soundIndex = 0;
            sound = "lazer_high";
        } else if (isEnemy) {
            soundIndex = 3;
            sound = "lazer_low";
        } else {
            soundIndex = 6;
            sound = "lazer_mid";
            volume = 0.7;
        }

        // Axis 2 - location
        if (isOnScreen) {
            // Onscreen - loud / zoom-dependent
            soundIndex += 0;
            volume *= Phaser.Math.Clamp(camera.zoom, 0.2, 1);
        } else if (isPlayer || isDestPlayer) {
            // Global player - quiet
            soundIndex += 1;
            volume *= 0.3;
        } else if (isEnemy) {
            // Offscreen enemy - faint, infrequent
            soundIndex += 2;
            volume *= 0.15;
            baseDelay = 400;
        } else {
            // Offscreen neutrals - no sound
            return;
        }

        // Throttle these noises, otherwise they become overwhelming/irritating
        if (this.throttles[soundIndex] < this.scene.time.now) {
            this.scene.sound.play(sound, {
                detune: Phaser.Math.Between(-200, 200),
                volume: 1.0 * volume,
            });
            this.throttles[soundIndex] = this.scene.time.now +
                Phaser.Math.Between(baseDelay/2, 3*baseDelay/2);
        }
    }
    onShipDestoyed(killer: objects.Ship, victim: objects.Ship): void {
        if (!this.enabled) { return; }
        const camera = this.scene.cameras.main;
        if (camera.worldView.contains(victim.x, victim.y)) {
            this.scene.sound.play("pop", {
                volume: 0.5 * Phaser.Math.Clamp(camera.zoom, 0.2, 1)
            });
        }
    }
    onCommand(): void {
        if (!this.enabled) { return; }
        this.scene.sound.play("bleep", {volume: 0.1});
    }
}

// Helper to loop through music & balance volume of different tracks
export class Playlist {
    items: {track: Phaser.Sound.BaseSound, volume: number}[];
    currentIndex: integer;

    constructor(scene: Phaser.Scene) {
        this.items = [
            {track: scene.sound.add("music0"), volume: 0.5},
            {track: scene.sound.add("music1"), volume: 0.7},
            {track: scene.sound.add("music2"), volume: 0.7},
        ];
        this.items.forEach(item => {
            item.track.on("complete", this.onTrackComplete, this);
        });
        this.currentIndex = 0;
        // For testing
        // scene.input.on("pointerdown", () => {
        //     this.items[this.currentIndex].track.stop();
        //     this.onTrackComplete();
        // }, this);
    }
    play(): void {
        const item = this.items[this.currentIndex];
        item.track.play({volume: item.volume});
    }
    setPlaying(playing: boolean): void {
        const item = this.items[this.currentIndex];
        if (playing) {
            item.track.resume();
        } else {
            item.track.pause();
        }
    }
    onTrackComplete(): void {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.play();
    }
}
