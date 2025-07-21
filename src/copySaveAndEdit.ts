import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getRootPath, getConfigPath } from './config';

interface CopyRule {
    source: string; // nom du fichier à surveiller (ex: "script.js")
    destination: string; // chemin relatif de destination (ex: "copie/script_copy.js")
    injection: string; // texte à injecter
    position: 'start' | 'end'; // position de l'injection
}

export function copySaveAndEdit(document: vscode.TextDocument) {
    if (!fs.existsSync(getConfigPath())) {
        console.log('Fichier de config "copyonsaveandedit" non trouvé.');
        return;
    }

    let rules: CopyRule[];
    try {
        const configContent = fs.readFileSync(getConfigPath(), 'utf-8');
        rules = JSON.parse(configContent);
    } catch (err) {
        vscode.window.showErrorMessage('Erreur en lisant le fichier de config : ' + err);
        return;
    }

    const fileName = path.relative(getRootPath(), document.uri.fsPath).replace(/\\/g, '/');

    const matchingRules = rules.filter(rule => rule.source === fileName);

    if (matchingRules.length === 0) return;

    const originalContent = document.getText();

    matchingRules.forEach(rule => {
        const newContent =
            rule.position === 'start'
                ? rule.injection + '\n' + originalContent
                : originalContent + '\n' + rule.injection;

        const destPath = path.join(getRootPath(), rule.destination);
        const destDir = path.dirname(destPath);

        // Crée le dossier s'il n'existe pas
        try {
            fs.mkdirSync(destDir, { recursive: true });
        } catch (mkdirErr) {
            vscode.window.showErrorMessage(`Erreur création du dossier ${destDir} : ${mkdirErr}`);
            return;
        }

        fs.writeFile(destPath, newContent, err => {
            if (err) {
                vscode.window.showErrorMessage(`Erreur écriture ${rule.destination} : ${err.message}`);
            } else {
                vscode.window.showInformationMessage(`Copié ${rule.source} → ${rule.destination}`);
            }
        });
    });
}