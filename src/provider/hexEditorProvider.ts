import * as vscode from 'vscode';
import { getHtml } from "../tools/hexEditor";

export class HexEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) { }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    // Convertir contenu fichier en base64
    const b64 = Buffer.from(document.getText(), 'binary').toString('base64');
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = await getHtml(webviewPanel, this.context, b64);
    // --- Réception des messages venant du webview ---
    webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'update') {
        try {
          const buffer = Buffer.from(msg.data, 'base64');

          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(0, 0, document.lineCount, 0);
          edit.replace(document.uri, fullRange, buffer.toString('binary'));

          await vscode.workspace.applyEdit(edit);
        } catch (err) {
          vscode.window.showErrorMessage("Erreur lors de la mise à jour en direct : " + (err as Error).message);
        }
      }

      if (msg.command === 'save') {
        try {
          // 1. Convertir depuis base64 en Buffer
          const buffer = Buffer.from(msg.data, 'base64');

          // 2. Appliquer l'édition sur le document
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            0,
            0,
            document.lineCount,
            0
          );
          edit.replace(document.uri, fullRange, buffer.toString('binary'));

          await vscode.workspace.applyEdit(edit);

          // 3. Sauvegarder le document
          await document.save();

          vscode.window.showInformationMessage("Fichier sauvegardé !");
        } catch (err) {
          vscode.window.showErrorMessage("Erreur lors de la sauvegarde : " + (err as Error).message);
        }
      }
    });
  }
}
