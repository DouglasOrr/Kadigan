import Phaser from "phaser";

export interface KeySpec {
    command: string;
    description: string;
    label: string;
    code?: integer;  // (if !== Phaser.Input.Keyboard.KeyCodes[label])
    hide?: boolean;  // default: false
}

export const Specs: KeySpec[] = [
    // Commands
    {command: "setSpendingMax", description: "Set spending to 100%", label: "T"},
    {command: "setSpendingMin", description: "Set spending to 0%", label: "G"},
    {command: "holdProduction", description: "Hold/release ship production", label: "C"},
    {command: "selectAll", description: "Select all ships", label: "R"},
    {command: "selectMultiple", description: "Hold while clicking to select multiple", label: "SHIFT"},

    // Camera
    {command: "zoomIn", description: "Zoom IN", label: "E"},
    {command: "zoomOut", description: "Zoom OUT", label: "Q"},
    {command: "panUp", description: "Pan UP", label: "W"},
    {command: "panDown", description: "Pan DOWN", label: "S"},
    {command: "panLeft", description: "Pan LEFT", label: "A"},
    {command: "panRight", description: "Pan RIGHT", label: "D"},
    {command: "toggleFullScreen", description: "Toggle full screen", label: "L"},

    // Game state
    {command: "togglePause", description: "Pause/unpause", label: "SPACE"},
    {command: "toggleOptions", description: "In-game options & help", label: "ESC"},

    // Dev
    {command: "showDebug", description: "Show debug info (JS console)", label: "O", hide: true},
];

type Key = Phaser.Input.Keyboard.Key;

export interface Keys {
    setSpendingMax: Key;
    setSpendingMin: Key;
    holdProduction: Key;
    selectAll: Key;
    selectMultiple: Key;
    panLeft: Key;
    panRight: Key;
    panUp: Key;
    panDown: Key;
    zoomIn: Key;
    zoomOut: Key;
    toggleFullScreen: Key;
    togglePause: Key;
    toggleOptions: Key;
    showDebug: Key;
}

export function addKeys(keyboard: Phaser.Input.Keyboard.KeyboardPlugin): Keys {
    const keys = {};
    Specs.forEach(spec => {
        keys[spec.command] = keyboard.addKey(spec.code || Phaser.Input.Keyboard.KeyCodes[spec.label]);
    });
    return <Keys>keys;
}
