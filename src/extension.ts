import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { generateStructure } from './structGenerator';
import { createExampleFile } from './creatorExampleFile';
import { outputChannel, logChannel, log } from './log';
import { getRootPath, setRootPath } from './config';

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

    // Commande pour créer le fichier JSON exemple
    const createJsonFile = vscode.commands.registerCommand('akTool.createExample', async () => {
        if (!verifWorkspace()) return;

    });
    context.subscriptions.push(createJsonFile);
    context.subscriptions.push(generateStruct);
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