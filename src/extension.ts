import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { generateStructure } from './structGenerator';
import { exampleMap, createExampleFile } from './creatorExampleFile';
import { outputChannel, logChannel, log } from './log';
import { getRootPath, setRootPath } from './config';
import { copySaveAndEdit } from './copySaveAndEdit';

export function activate(context: vscode.ExtensionContext) {
    logChannel("Extension akTool activée!");
    log("Extension akTool activée!");

    const generateStruct = vscode.commands.registerCommand('akTool.createstruct', async () => {
        if (!verifWorkspace()) return;

        const option = await vscode.window.showQuickPick([
            'Code dans le meme fichier',
            'Code dans un autre fichier',
            'Structure seule'
        ], {
            placeHolder: 'Choisissez une option'
        });

        if (!option) return;

        generateStructure(getRootPath(), option);
    });
    context.subscriptions.push(generateStruct);

    // Commande pour créer le fichier JSON exemple
    const createJsonFile = vscode.commands.registerCommand('akTool.createExample', async () => {
        if (!verifWorkspace()) return;

        const exampleTypes: string[] = Object.keys(exampleMap);

        const options = await vscode.window.showQuickPick(exampleTypes, {
            placeHolder: 'Choisissez les examples',
            canPickMany: true
        });
        createExampleFile(options || []);
    });
    context.subscriptions.push(createJsonFile);

    vscode.workspace.onDidSaveTextDocument(document => {
        if (!verifWorkspace()) return;
        copySaveAndEdit(document);
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
function verifWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("Aucun dossier ouvert.");
        return false;
    }
    setRootPath(workspaceFolders[0].uri.fsPath);
    return true;
}