import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { logChannel, log } from './log';
import { getConfigPath } from './config'

/**
 * type du fichier config
 */
export interface StructureConfig {
    excludeFolders?: string[];
    excludeExtensions?: string[];
    excludeFiles?: string[];
    excludeNamePatterns?: string[];
}

/**
 * 
 * @param rootPath - 
 * @returns le filtre sous format StructureConfig
 */
async function loadConfig(rootPath: string): Promise<StructureConfig> {
    try {
        const data = await fs.promises.readFile(getConfigPath(), 'utf8'); //essaye de lire le fichier
        const parsed = JSON.parse(data); //transorme en un object
        const parsedStruct = parsed.structGenerator; //transorme en un object

        //verifie le type des entrees
        const config: StructureConfig = {
            excludeFolders: Array.isArray(parsedStruct.excludeFolders) ? parsedStruct.excludeFolders : [],
            excludeExtensions: Array.isArray(parsedStruct.excludeExtensions) ? parsedStruct.excludeExtensions : [],
            excludeFiles: Array.isArray(parsedStruct.excludeFiles) ? parsedStruct.excludeFiles : [],
            excludeNamePatterns: Array.isArray(parsedStruct.excludeNamePatterns) ? parsedStruct.excludeNamePatterns : [],
        };
        log(getConfigPath());
        log(config);

        return config;
    } catch {
        vscode.window.showWarningMessage(`Fichier de config '${getConfigPath()}' invalide.`);
        return {}; //renvoie aucun filter
    }
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
function isExcluded(fullPath: string, rootPath: string, config: StructureConfig): boolean {
    const relativePath = path.relative(rootPath, fullPath); //chemin relatif du fichier
    const ext = path.extname(fullPath); //extantion du fichier
    const dirParts = relativePath.split(path.sep); //chaque directory
    const baseName = path.basename(fullPath); //le nom du fichier

    //si des dossier son exclu
    if (config.excludeFolders) {
        //! car sur pas null
        if (dirParts.some(folder => config.excludeFolders!.includes(folder))) {
            return true;
        }
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
    if (config.excludeNamePatterns) {
        //pour tout les paterns
        for (const pattern of config.excludeNamePatterns) {
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

    return `${indent}├── ${fileName}`;
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
        const fullPath = path.join(dir, entry.name); //fait le chemin complet de l'element
        if (!isExcluded(fullPath, rootPath, config)) {
            if (entry.isDirectory()) {
                dirs.push(fullPath)
            } else {
                allFiles.push(fullPath); //ajoute le fichier a la liste
            }
        }
    }
    while (dirs.length != 0) {
        allFiles.push(dirs[0])
        await walk(dirs[0], rootPath, config, allFiles); //refait un parcour
        dirs.shift(); //retire le dossier de la liste
    }
    return allFiles;
}

export async function generateStructure(rootPath: string, mode: string) {
    const config = await loadConfig(rootPath);
    const files = await walk(rootPath, rootPath, config); //liste de tout les fichiers
    const outputLines: string[] = []; //contient le contenu du fichier final ligne par ligne
    const separateFiles: string[] = []; //contenu dans un fichier separer
    /*for (const file of files) {
        outputLines.push(file); //ajoute la ligne
    }*/
    outputLines.push('=== Structure du projet ===\n');

    for (const file of files) {
        const line = formatTreeLine(file, rootPath); //cree un ligne formater
        outputLines.push(line); //ajoute la ligne
    }

    outputLines.push('\n');

    for (const file of files) {
        if (mode.includes('code') || mode.includes('Code')) {
            const content = await readFileContent(file); //le contenu du fichier
            const title =
                "///////////////////////////\n" +
                `// ${path.relative(rootPath, file)}\n` +
                "///////////////////////////\n"; //le titre du fichier

            const block = `${title}\n${content}\n`; //un block avec le titre et le contenu

            if (mode.includes('meme fichier') || mode.includes('un fichier')) {
                outputLines.push(block); //ajoute le block au fichier
            } else {
                separateFiles.push(block); //ajoute le block dans un fichier separer
            }
        }
    }

    const uri = vscode.Uri.file(path.join(rootPath, 'project_structure.txt'));
    await fs.promises.writeFile(uri.fsPath, outputLines.join('\n'), 'utf8');

    if (separateFiles.length != 0) {
        const filepath = vscode.Uri.file(path.join(rootPath, 'project_code.txt'));
        await fs.promises.writeFile(filepath.fsPath, separateFiles.join('\n'), 'utf8');
    }

    vscode.window.showInformationMessage("Structure du projet générée !");
}
