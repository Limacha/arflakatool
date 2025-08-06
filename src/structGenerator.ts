import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { logChannel, log } from './log';
import { getConfigContent, getConfigPath, getRootPath } from './config'
import { validate } from './validation';
import { exampleMap } from './creatorExampleFile';
import { escapeSpecialChars, isDir, standarPath } from './function';

/**
 * type du fichier config
 */
export interface StructureConfig {
    excludeFolders?: string[];
    excludeExtensions?: string[];
    excludeFiles?: string[];
    excludeName?: string[];
    excludeCode?: {
        folders?: string[];
        extensions?: string[];
        files?: string[];
        name?: string[];
    };
}

// export function isStructureConfig(obj: any): obj is StructureConfig {
//     return obj && (
//         'excludeFolders' in obj ||
//         'excludeExtensions' in obj ||
//         'excludeFiles' in obj ||
//         'excludeNamePatterns' in obj
//     );
// }



/**
 * charge la config de la structure
 * @returns le filtre sous format StructureConfig
 */
async function loadConfig(): Promise<StructureConfig> {

    //verifie le type des entrees
    const config: StructureConfig = validate(getConfigContent()?.StructureConfig, exampleMap["StructureConfig"]);
    normalizeConfigPaths(config);
    if (config &&
        config.excludeFolders === null &&
        config.excludeExtensions === null &&
        config.excludeFiles === null &&
        config.excludeName === null && (
            (
                config.excludeCode != null &&
                config.excludeCode.folders === null &&
                config.excludeCode.extensions === null &&
                config.excludeCode.files === null &&
                config.excludeCode.name === null
            ) ||
            config.excludeCode === null
        )
    ) {

        vscode.window.showWarningMessage(`Fichier de config '${getConfigPath()}' invalide.`);
    }
    return config;
}

function normalizeConfigPaths(config: StructureConfig): void {
    const normalizeArray = (arr?: string[] | null): string[] =>
        Array.isArray(arr) ? arr.map(s => standarPath(s)) : arr ?? [];

    config.excludeFolders = normalizeArray(config.excludeFolders);
    config.excludeExtensions = normalizeArray(config.excludeExtensions);
    config.excludeFiles = normalizeArray(config.excludeFiles);
    config.excludeName = normalizeArray(config.excludeName);

    if (config.excludeCode) {
        config.excludeCode.folders = normalizeArray(config.excludeCode.folders);
        config.excludeCode.extensions = normalizeArray(config.excludeCode.extensions);
        config.excludeCode.files = normalizeArray(config.excludeCode.files);
        config.excludeCode.name = normalizeArray(config.excludeCode.name);
    }
    //log(config);
}

/**
 * verifier si le patern est dans le nom du fichier
 * @param filename - nom du fichier
 * @param pattern - le patern a verifier
 * @returns si le patern est dedans ou pas
 */
function matchesPattern(filename: string, pattern: string): boolean {
    // *text*
    if (pattern.startsWith("*") && pattern.endsWith("*") && pattern.split("*").length === 3) {
        const inner = pattern.slice(1, -1);
        return filename.includes(inner);
    }

    // *text
    if (pattern.startsWith("*") && !pattern.endsWith("*")) {
        const suffix = pattern.slice(1);
        return filename.endsWith(suffix);
    }

    // text*
    if (!pattern.startsWith("*") && pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return filename.startsWith(prefix);
    }

    //si quelque part
    if (pattern.includes("*")) {
        const parts = pattern.split("*");
        // logChannel(parts.toString());
        // log(parts.toString());
        let startIndex = 0;

        // Si le pattern ne commence pas par *, vérifier le préfixe
        if (parts[0] !== "") {
            if (!filename.startsWith(parts[0])) return false;
            startIndex = parts[0].length;
        }

        // Si le pattern ne finit pas par *, vérifier le suffixe
        if (parts[parts.length - 1] !== "") {
            const suffix = parts[parts.length - 1];
            if (!filename.endsWith(suffix)) return false;
        }

        // Chercher les morceaux intermédiaires dans l'ordre
        for (let i = 1; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part === "") continue; // plusieurs * consécutifs

            const index = filename.indexOf(part, startIndex);
            if (index === -1) return false;
            startIndex = index + part.length;
        }

        return true;
    }

    //si nom exact
    return filename === pattern;
}


/**
 * verifie si l'element est a exclure
 * @param fullPath - chemin vers le fichier/dossier
 * @param rootPath - la racine
 * @param config - la config de se qu'il faut exclure
 * @returns si exclu ou pas
 */
function isExcludFromStruct(fullPath: string, rootPath: string, config: StructureConfig): boolean {
    const relativePath = path.relative(rootPath, fullPath); //chemin relatif
    const ext = path.extname(fullPath); //extantion du fichier
    const baseName = path.basename(fullPath); //le nom du fichier
    //log("-----", relativePath, ext, baseName, "-----");

    if (isDir(fullPath)) {
        //si des dossier son exclu
        if (config.excludeFolders) {
            if (config.excludeFolders.includes(relativePath)) {
                return true;
            }
        }
        return false;
    }

    if (!baseName.includes(".")) {
        return false;
    }

    //si le fichier est exclu
    if (config.excludeFiles) {
        if (config.excludeFiles.includes(relativePath)) {
            return true;
        }
    }

    //si l'extention est exlu
    if (config.excludeExtensions) {
        if (config.excludeExtensions.includes(ext)) {
            return true;
        }
    }

    //si le patern est dedans
    if (config.excludeName) {
        //pour tout les paterns
        for (const pattern of config.excludeName) {
            //verifie si dedans
            if (matchesPattern(baseName, pattern)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * verifie si l'element est a exclure
 * @param relativePath - chemin relatif a la racine
 * @param config - la config de se qu'il faut exclure
 * @returns si exclu ou pas
 */
function isExcludFromCode(fullPath: string, rootPath: string, config: StructureConfig): boolean {
    const relativePath = path.relative(rootPath, fullPath);
    const ext = path.extname(fullPath); //extantion du fichier
    const dirParts = relativePath.split(path.sep); //chaque directory
    const baseName = path.basename(fullPath); //le nom du fichier

    if (isDir(fullPath)) {
        return true;
    }

    //si des dossier son exclu
    if (config.excludeCode?.folders) {
        //! car sur pas null
        if (dirParts.some(folder => config.excludeFolders!.includes(folder))) {
            return true;
        }
    }

    if (!baseName.includes(".")) {
        return false;
    }

    //si l'extention est exlu
    if (config.excludeCode?.extensions) {
        if (config.excludeCode.extensions.includes(ext)) {
            return true;
        }
    }

    //si le fichier est exclu
    if (config.excludeCode?.files) {
        if (config.excludeCode.files.includes(relativePath)) {
            return true;
        }
    }

    //si le patern est dedans
    if (config.excludeCode?.name) {
        //pour tout les paterns
        for (const pattern of config.excludeCode.name) {
            //verifie si dedans
            if (matchesPattern(baseName, pattern)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * lit le contenu d'un fichier
 * @param filePath - le chemin du fichier a lire
 * @returns le contenu
 */
async function readFileContent(filePath: string): Promise<string> {
    try {
        return await fs.promises.readFile(filePath, 'utf8');
    } catch {
        return '';
    }
}

/**
 * genere une ligne formater pour la structure du project
 * @param filePath - le chemin du fichier
 * @param root - la racine du project
 * @param withComment - si on ajoute les commentaires
 * @returns une ligne avec les indentations et le nom du fichier
 */
function formatTreeLine(filePath: string, root: string): string {
    const relative = path.relative(root, filePath); //chemin depuis la racine
    const parts = relative.split(path.sep); //separe chaque partie du chemin
    const indent = '│   '.repeat(parts.length - 1); //indentation
    const fileName = parts[parts.length - 1]; //nom du fichier

    return `${indent}├${(isDir(filePath)) ? "D" : "F"}─ ${fileName}`;
}

/**
 * fait une liste de tout les fichier trouver dans le dossier
 * @param dir - le chemin du dossier dans le quel verifier
 * @param allFiles - une liste de tout les fichier déja trouver
 * @returns une liste de tout les fichier trouver dans le dossier et sous-dossier
 */
async function walk(dir: string, rootPath: string, config: StructureConfig, allFiles: string[] = []): Promise<string[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true }); //retourne tout les elemants dans le dossier
    var dirs: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(entry.parentPath, entry.name); //fait le chemin complet de l'element
        //verifie si il est exclu ou pas
        if (!isExcludFromStruct(fullPath, rootPath, config)) {
            if (entry.isDirectory()) {
                dirs.push(fullPath)
            } else {
                allFiles.push(fullPath); //ajoute le fichier a la liste
            }
        }
    }
    //refait pour les sous dossier
    while (dirs.length != 0) {
        //log("dirs", dirs);
        allFiles.push(dirs[0])
        await walk(dirs[0], rootPath, config, allFiles); //refait un parcour
        dirs.shift(); //retire le dossier de la liste
    }
    return allFiles;
}

export async function generateStructure(mode: string) {
    const config = await loadConfig();
    const files = await walk(getRootPath(), getRootPath(), config); //liste de tout les fichiers valides
    const outputLines: string[] = []; //contient le contenu du fichier final ligne par ligne
    const separateFiles: string[] = []; //contenu dans un fichier separer
    /*for (const file of files) {
        outputLines.push(file); //ajoute la ligne
    }*/
    outputLines.push('=== Structure du projet ===\n');

    for (const file of files) {
        const line = formatTreeLine(file, getRootPath()); //cree un ligne formater
        outputLines.push(line); //ajoute la ligne
    }

    outputLines.push('\n');

    //log(files);

    if (mode.includes('code') || mode.includes('Code')) {
        for (const file of files) {
            const relativePath = path.relative(getRootPath(), file);
            if (!isExcludFromCode(file, getRootPath(), config)) {
                const content = await readFileContent(file); //le contenu du fichier
                const title =
                    "///////////////////////////\n" +
                    `// ${relativePath}\n` +
                    "///////////////////////////"; //le titre du fichier

                const block = `${title}\n${content}\n`; //un block avec le titre et le contenu

                if (mode.includes('meme fichier') || mode.includes('un fichier')) {
                    outputLines.push(block); //ajoute le block au fichier
                } else {
                    separateFiles.push(block); //ajoute le block dans un fichier separer
                }
            }
        }
    }

    const uri = vscode.Uri.file(path.join(getRootPath(), 'project_structure.txt'));
    await fs.promises.writeFile(uri.fsPath, outputLines.join('\n'), 'utf8');

    if (separateFiles.length != 0) {
        const filepath = vscode.Uri.file(path.join(getRootPath(), 'project_code.txt'));
        await fs.promises.writeFile(filepath.fsPath, separateFiles.join('\n'), 'utf8');
    }

    vscode.window.showInformationMessage("Structure du projet générée !");
}