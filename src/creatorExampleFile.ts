import * as vscode from 'vscode';
import * as fs from 'fs';
import { StructureConfig } from './structGenerator';

export async function createExampleFile(configPath: string) {



    const example: StructureConfig = {
        excludeFolders: ["example"],
        excludeExtensions: [".txt"],
        excludeFiles: ["example.txt"],
        excludeNamePatterns: ["*amp*", "exam*", "*mple*", "example"]
    };

    try {
        fs.writeFileSync(configPath, JSON.stringify(example, null, 2), 'utf-8');
        vscode.window.showInformationMessage(`Fichier ${configPath} créé.`);
        const doc = await vscode.workspace.openTextDocument(configPath);
        vscode.window.showTextDocument(doc);
    } catch (e: any) {
        vscode.window.showErrorMessage("Erreur écriture du fichier : " + e.message);
    }
}