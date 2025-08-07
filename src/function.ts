import * as fs from 'fs';
import * as fsPromise from 'fs/promises';
import * as path from 'path';
import { getRootPath } from './config';
import { error, log } from './log';

/**
 * enlave tout les caractere speciale ex: '\n' -> "\\n"
 * @param str la chaine de caractere
 * @returns un chane sans caractere special
 */
export function escapeSpecialChars(str: string): string {
    return str.replace(/[\0-\x1F\'""]/g, (c) => {
        switch (c) {
            case '\0': return '\\0';
            case '\n': return '\\n';
            case '\r': return '\\r';
            case '\t': return '\\t';
            case '\b': return '\\b';
            case '\f': return '\\f';
            case '\v': return '\\v';
            case '\'': return '\\\'';
            case '\"': return '\\"';
            default: {
                // Pour les autres caractères de contrôle (codes < 32) non listés
                const code = c.charCodeAt(0);
                if (code < 32) {
                    return '\\x' + code.toString(16).padStart(2, '0');
                }
                return c;
            }
        }
    });
}

/**
 * stantardise un chemin fournit
 * @param path le chemin a standardiser
 * @returns path\\file
 */
export function standarPath(path: string) {
    return escapeSpecialChars(path).replace(/\//g, '\\');
}

/**
 * verifier si le chemin fournit donne sur un dossier
 * @param chemin le chemin a verifier
 * @returns si le chemin donne sur un dossier
 */
export function isDir(chemin: string): boolean {
    try {
        const stat = fs.statSync(chemin);
        return stat.isDirectory();
    } catch (err) {
        // Le chemin n'existe pas ou une erreur s'est produite
        return false;
    }
}


/**
 * verifie si le chemin fournit existe
 * @param filePath chemin
 * @returns si il existe ou pas
 */
export async function pathExists(filePath: string): Promise<boolean> {
    try {
        if (!path.isAbsolute(filePath)) if (getRootPath() != "") filePath = path.join(getRootPath(), filePath);
        // Vérifie si le fichier/dossier est accessible
        await fsPromise.access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * lit le contenu d'un fichier
 * @param path le chemin du fichier
 * @returns le contenu
 */
export function readFileContent(path: string): string {
    try {
        const configContent = fs.readFileSync(path, 'utf-8');
        return configContent;
    } catch {
        error(`Fichier '${path}' introuvable.`);
        return ""; //renvoie aucun filter
    }
}

/**
 * cree un dossier
 * @param dirPath le chemin du dossier
 */
export async function createDir(dirPath: string): Promise<void> {
    const resolvedPath = path.resolve(dirPath);
    await fsPromise.mkdir(resolvedPath, { recursive: true });
}

/**
 * cree un fichier
 * @param filePath le chemin du fichier
 * @param content le contenu du fichier
 */
export async function createFile(filePath: string, content: string = ''): Promise<void> {
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);

    // S'assurer que le dossier existe
    await fsPromise.mkdir(dir, { recursive: true });

    // Créer le fichier avec le contenu
    await fsPromise.writeFile(resolvedPath, content, { encoding: 'utf-8' });
}

/**
 * vide compltement un dossier
 * @param dirPath le chemin vers le dossier a vider
 * @returns la promesse de le vider
 */
export async function clearDirectory(dirPath: string): Promise<void> {
    try {
        const resolvedPath = path.resolve(dirPath);

        // Vérifie si le dossier existe
        if (!(await pathExists(dirPath)) && !(await isDir(dirPath))) {
            return;
        }

        // Lire les fichiers et dossiers à l'intérieur
        const files = await fsPromise.readdir(resolvedPath);

        // Supprimer chaque élément à l'intérieur
        for (const file of files) {
            const fullPath = path.join(resolvedPath, file);
            const fileStat = await fsPromise.stat(fullPath);

            if (fileStat.isDirectory()) {
                // Supprimer récursivement le sous-dossier
                await fsPromise.rm(fullPath, { recursive: true, force: true });
            } else {
                await fsPromise.unlink(fullPath);
            }
        }
    } catch (err: any) {
        //error(err)
        throw err;
    }
}

/**
 * cree un chemin complet a partir du workspace[0] ou c:\\
 * @param filePath le chemin relatif
 * @returns le chemin complet
 */
export function createFullPath(filePath: string) {
    if (!path.isAbsolute(filePath)) filePath = (getRootPath() != "") ? path.join(getRootPath(), filePath) : "c:\\" + filePath;
    return filePath;
}

/**
 * formate le nombre de byte pour avoir la valeur en B/KB/MB
 * @param bytes le nombre de byte
 * @returns le nombre de bytes formater (B/KB/MB)
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
};