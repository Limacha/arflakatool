import * as vscode from 'vscode';
import * as fs from 'fs';
import { log, warn, error } from './log';
import { getConfigPath } from './config';
import { StructureConfig } from './structGenerator';
import { CopyRule } from './copySaveAndEdit';


/* #region example */
const exampleStructureConfig: StructureConfig = {
    excludeFolders: ['example'],
    excludeExtensions: ['.txt'],
    excludeFiles: ['example.txt'],
    excludeNamePatterns: ['*amp*', 'exam*', '*m**e*', 'example'],
};

const exampleCopyRule: CopyRule[] =
    [
        {
            source: 'script.js',
            destination: 'copie/script_copy.js',
            injection: '// injected text',
            position: 'start',
        },
        {
            source: 'script.txt',
            destination: 'copie/script_copy.js',
            injection: '// injected text',
            position: 'end',
        }
    ];

export const exampleMap: Record<string, any> = {
    StructureConfig: exampleStructureConfig,
    CopyRule: exampleCopyRule,
    // ajouter d'autres exemples ici si besoin
};
/* #endregion */

export async function createExampleFile(types: string[]) {

    // Objet final, une seule entrée par type (nom de type => objet)
    const example: Record<string, any> = {};

    types.forEach((typeName) => {
        //si le type a un example
        if (exampleMap[typeName]) {
            //ajoute l'example
            example[typeName] = exampleMap[typeName];
        } else {
            warn(`Aucun exemple trouvé pour le type "${typeName}"`);
        }
    });


    try {
        const path = getConfigPath();
        fs.writeFileSync(path, JSON.stringify(example, null, 2), 'utf-8');
        vscode.window.showInformationMessage(`Fichier ${path} créé.`);

        //ouvre le document
        const doc = await vscode.workspace.openTextDocument(path);
        vscode.window.showTextDocument(doc);

    } catch (e: any) {
        vscode.window.showErrorMessage("Erreur écriture du fichier : " + e.message);
    }
}