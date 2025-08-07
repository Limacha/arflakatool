import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getRootPath, getConfigPath, getConfigContent } from '../config';
import { validate } from '../validation';
import { log } from '../log';
import { exampleMap } from './creatorExampleFile';

export interface CopyRule {
    source: string; // nom du fichier à surveiller (ex: "script.js")
    destination: string; // chemin relatif de destination (ex: "copie/script_copy.js")
    injection: {
        text: string; // texte à injecter
        position: number; // position de l'injection
    }[];
}

// export function isCopyRule(obj: any): obj is CopyRule {
//     return obj &&
//         typeof obj.source === 'string' &&
//         typeof obj.destination === 'string' &&
//         typeof obj.injection === 'string' &&
//         (obj.position === 'start' || obj.position === 'end');
// }

/**
 * 
 * @returns le filtre sous format StructureConfig
 */
async function loadConfig(): Promise<CopyRule[]> {

    //verifie le type des entrees
    const config: CopyRule[] = validate(getConfigContent()?.CopyRule, exampleMap["CopyRule"]);
    log(getConfigPath());
    log(config);
    return config;
}

export async function copySaveAndEdit(document: vscode.TextDocument) {

    let rules: CopyRule[] = await loadConfig();

    if (rules === null || rules?.length === 0) {
        vscode.window.showWarningMessage(`Fichier de config '${getConfigPath()}' invalide.`);
    }

    const filePath = path.relative(getRootPath(), document.uri.fsPath).replace(/\\/g, '/');

    const matchingRules = rules.filter(rule => rule.source === filePath);

    if (matchingRules.length === 0) return;

    const originalContent = document.getText().split('\n');

    matchingRules.forEach(rule => {
        var newContent = originalContent.slice();

        //injecte tout les elements
        rule.injection.forEach(injection => {
            const position = Math.round(injection.position); //arondit pour pas avoir de float
            //enfonction de si on part de la fin ou du debut
            if (position < 0) {
                //eviter d'ajouter en -5
                if (newContent.length + 1 + position >= 0) {
                    newContent.splice(newContent.length + 1 + position, 0, injection.text);
                }
                else {
                    newContent.splice(0, 0, injection.text);
                }
            }
            else if (position > 0) {
                newContent.splice(position - 1, 0, injection.text);
            }
        });

        const destPath = path.join(getRootPath(), rule.destination); //chemin du fichier
        const destDir = path.dirname(destPath); //chemin du dossier

        // Crée le dossier s'il n'existe pas
        try {
            fs.mkdirSync(destDir, { recursive: true });
        } catch (mkdirErr) {
            vscode.window.showErrorMessage(`Erreur création du dossier ${destDir} : ${mkdirErr}`);
            return;
        }

        //ecrit dans le fichier
        fs.writeFile(destPath, newContent.join("\n"), err => {
            if (err) {
                vscode.window.showErrorMessage(`Erreur écriture ${rule.destination} : ${err.message}`);
            } else {
                vscode.window.showInformationMessage(`Copié ${rule.source} → ${rule.destination}`);
            }
        });
    });
}