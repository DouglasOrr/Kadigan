import Phaser from "phaser";

export interface KeySpec {
    command: string;
    description: string;
    category: string;
    label: string;
    code?: integer;  // (if !== Phaser.Input.Keyboard.KeyCodes[label])
    hide?: boolean;  // default: false
}

export const Specs: KeySpec[] = [
    // Camera
    {category: "Camera", command: "panUp", description: "Pan UP", label: "W"},
    {category: "Camera", command: "panDown", description: "Pan DOWN", label: "S"},
    {category: "Camera", command: "panLeft", description: "Pan LEFT", label: "A"},
    {category: "Camera", command: "panRight", description: "Pan RIGHT", label: "D"},
    {category: "Camera", command: "zoomIn", description: "Zoom IN", label: "E"},
    {category: "Camera", command: "zoomOut", description: "Zoom OUT", label: "Q"},
    {category: "Camera", command: "toggleFullScreen", description: "Toggle full screen", label: "I"},

    // Control
    {category: "Control", command: "selectAll", description: "Select all ships", label: "R"},
    {category: "Control", command: "selectMultiple", description: "Hold to select multiple", label: "SHIFT"},
    {category: "Control", command: "setSpendingMax", description: "Set spending to 100%", label: "T"},
    {category: "Control", command: "setSpendingMin", description: "Set spending to 0%", label: "G"},
    {category: "Control", command: "holdProduction", description: "Hold/release ship production", label: "C"},

    // Game state
    {category: "Game", command: "togglePause", description: "Pause/unpause", label: "SPACE"},
    {category: "Game", command: "toggleOptions", description: "In-game options & help", label: "ESC"}, // special handling in main.ts

    // Dev
    {category: "dev", command: "showDebug", description: "Show debug info (JS console)", label: "O", hide: true},
];

type Key = Phaser.Input.Keyboard.Key;

export interface Keys {
    setSpendingMax?: Key;
    setSpendingMin?: Key;
    holdProduction?: Key;
    selectAll?: Key;
    selectMultiple?: Key;
    panLeft?: Key;
    panRight?: Key;
    panUp?: Key;
    panDown?: Key;
    zoomIn?: Key;
    zoomOut?: Key;
    toggleFullScreen?: Key;
    togglePause?: Key;
    toggleOptions?: Key;
    showDebug?: Key;
}

export function addKeys(keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
        filter?: (arg0: KeySpec) => boolean): Keys {
    const keys = {};
    Specs.forEach(spec => {
        if (filter === undefined || filter(spec)) {
            keys[spec.command] = keyboard.addKey(spec.code || Phaser.Input.Keyboard.KeyCodes[spec.label]);
        }
    });
    return keys;
}
