import path from 'path';

//#region root path
let rootPath = "";
let onRootPathChangeCallbacks: ((newPath: string) => void)[] = [];

export function getRootPath() {
    return rootPath;
}

export function setRootPath(newPath: string) {
    if (rootPath !== newPath) {
        rootPath = newPath;

        // Appeler tous les callbacks
        for (const cb of onRootPathChangeCallbacks) {
            cb(newPath);
        }
    }
}

// Permet à d'autres modules de réagir au changement
export function onRootPathChange(callback: (newPath: string) => void) {
    onRootPathChangeCallbacks.push(callback);
}

//#endregion
//#region config path

const configFileName = "akTool.config.json"
let configPath = "./akTool.config.json";
let onConfigPathChangeCallbacks: ((newPath: string) => void)[] = [];

export function getConfigPath() {
    return configPath;
}

function setConfigPath(newPath: string) {
    if (configPath !== newPath) {
        configPath = newPath;

        // Appeler tous les callbacks
        for (const cb of onConfigPathChangeCallbacks) {
            cb(newPath);
        }
    }
}

onRootPathChange(rootPath => setConfigPath(path.join(rootPath, configFileName)))

// Permet à d'autres modules de réagir au changement
export function onConfigPathChange(callback: (newPath: string) => void) {
    onConfigPathChangeCallbacks.push(callback);
}

//#endregion