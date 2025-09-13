import * as vscode from 'vscode';
import { readFile } from 'fs/promises';
import * as path from 'path';

export async function openBitHexEditor(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'bitHexEditor',
        'Bit & Hex Editor',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
        }
    );

    const uris = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Ouvrir pour éditeur bit/hex' });
    if (!uris || uris.length === 0) {
        panel.webview.html = await getHtml(panel, context, '');
        return;
    }

    const fileUri = uris[0];
    const data = await vscode.workspace.fs.readFile(fileUri);
    const b64 = Buffer.from(data).toString('base64');

    panel.webview.html = await getHtml(panel, context, b64);

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'save') {
            await saveToUri(fileUri, msg.data);
        } else if (msg.command === 'save-as') {
            const uri = await vscode.window.showSaveDialog({ saveLabel: 'Enregistrer sous' });
            if (uri) await saveToUri(uri, msg.data);
        }
    });
}

export async function getHtml(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, base64: string) {
    const srcPath = vscode.Uri.joinPath(context.extensionUri, 'src');
    const viewPath = vscode.Uri.joinPath(srcPath, 'webView');
    const hewEditPath = vscode.Uri.joinPath(viewPath, 'hexEditor');
    const indexPath = vscode.Uri.joinPath(hewEditPath, 'hexEditor.html');
    let html = await readFile(indexPath.fsPath, 'utf8');

    // Remplace les chemins locaux par des URIs de Webview
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(hewEditPath, 'hexEditor.js'));
    const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(hewEditPath, 'hexEditor.css'));

    const bytes = Buffer.from(base64, 'base64'); // revient au buffer d'origine
    const hexArray = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0')
    );

    html = html
        .replace('${scriptUri}', scriptUri.toString())
        .replace('${styleUri}', styleUri.toString())
        .replace('${hex}', hexArray.join(' '));

    return html;
}

async function saveToUri(uri: vscode.Uri, b64: string) {
    const buffer = Buffer.from(b64, 'base64');
    try {
        await vscode.workspace.fs.writeFile(uri, buffer);
        vscode.window.showInformationMessage('Fichier enregistré: ' + uri.fsPath);
    } catch (e) {
        vscode.window.showErrorMessage('Erreur lors de l\'écriture du fichier: ' + String(e));
    }
}