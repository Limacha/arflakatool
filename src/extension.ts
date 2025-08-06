import * as vscode from 'vscode';
import { generateStructure } from './structGenerator';
import { exampleMap, createExampleFile } from './creatorExampleFile';
import { outputChannel, logChannel, log } from './log';
import { getRootPath, setRootPath } from './config';
import { copySaveAndEdit } from './copySaveAndEdit';
import { generateWorkspaceFromStructure } from './generateWorkspace';
import { pathExists } from './function';

export function activate(context: vscode.ExtensionContext) {
    verifWorkspace();
    logChannel("Extension akTool activée!");
    log("Extension akTool activée!");

    const generateStruct = vscode.commands.registerCommand('akTool.createstruct', async () => {
        log('akTool.createstruct');
        if (!verifWorkspace()) {
            vscode.window.showErrorMessage("Aucun dossier ouvert.");
            return;
        }

        const option = await vscode.window.showQuickPick([
            'Code dans le meme fichier',
            'Code dans un autre fichier',
            'Structure seule'
        ], {
            placeHolder: 'Choisissez une option'
        });

        if (!option) return;

        generateStructure(option);
    });
    context.subscriptions.push(generateStruct);

    const generateWorkspaceFromStruct = vscode.commands.registerCommand('akTool.generateWrokspace', async () => {
        log('akTool.generateWrokspace');
        const options = await vscode.window.showQuickPick([
            "code", "structure", "from", "to", "2 files"
        ], {
            placeHolder: 'Choisissez les parametres',
            canPickMany: true
        });

        if (!options || options.length === 0) return;

        let from: string | undefined = getRootPath() + "\\project_structure.txt";
        let fromCode: string | undefined = getRootPath() + "\\project_code.txt";
        let to: string | undefined = getRootPath();
        log(from, fromCode, to);
        if (options.includes("from")) {
            if (options.includes("2 files")) {
                do {
                    from = await vscode.window.showInputBox({
                        prompt: 'Chemin vers le fichier contenant la structure',
                        placeHolder: 'path',
                        ignoreFocusOut: true,
                    });
                } while (!from);
                do {
                    fromCode = await vscode.window.showInputBox({
                        prompt: 'Chemin vers le fichier contenant le code',
                        placeHolder: 'path',
                        ignoreFocusOut: true,
                    });
                } while (!fromCode);
            }
            else {

                do {
                    from = await vscode.window.showInputBox({
                        prompt: 'Chemin vers le fichier contenant la structure',
                        placeHolder: 'path',
                        ignoreFocusOut: true,
                    });
                } while (!from);
            }
        }
        if (options.includes("to")) {
            do {
                to = await vscode.window.showInputBox({
                    prompt: 'Chemin vers le dossier ou sera genere le contenu',
                    placeHolder: 'path',
                    ignoreFocusOut: true,
                });
            } while (!to);
        }

        generateWorkspaceFromStructure(from, to, options.includes("structure"), options.includes("code"), (options.includes("2 files")) ? fromCode : "");
    });
    context.subscriptions.push(generateWorkspaceFromStruct);

    // Commande pour créer le fichier JSON exemple
    const createJsonFile = vscode.commands.registerCommand('akTool.createExample', async () => {
        log('akTool.createExample');
        if (!verifWorkspace()) {
            vscode.window.showErrorMessage("Aucun dossier ouvert.");
            return;
        }

        const exampleTypes: string[] = Object.keys(exampleMap);

        const options = await vscode.window.showQuickPick(exampleTypes, {
            placeHolder: 'Choisissez les examples',
            canPickMany: true
        });
        createExampleFile(options || []);
    });
    context.subscriptions.push(createJsonFile);

    vscode.workspace.onDidSaveTextDocument(document => {
        log('onDidSaveTextDocument', document);
        if (!verifWorkspace()) {
            vscode.window.showErrorMessage("Aucun dossier ouvert.");
            return;
        }
        copySaveAndEdit(document);
    });

    vscode.workspace.onDidChangeWorkspaceFolders(event => {
        log('onDidChangeWorkspaceFolders', event);
        if (event.added.length > 0) {
            log(`📁 Dossier(s) ajouté(s) : ${event.added.map(f => f.name).join(', ')}`);
        }

        if (event.removed.length > 0) {
            log(`❌ Dossier(s) supprimé(s) : ${event.removed.map(f => f.name).join(', ')}`);
        }

        verifWorkspace();
    });
}

export function deactivate() {
    outputChannel.appendLine("Extension désactivée.");
    outputChannel.dispose();
}



/**
 * verifier si on se trouve dans un workspace
 * @returns si dans un workspace
 */
function verifWorkspace(): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        setRootPath("");
        return false;
    }
    setRootPath(workspaceFolders[0].uri.fsPath);
    return true;
}