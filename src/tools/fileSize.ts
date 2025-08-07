import * as vscode from 'vscode';
import * as fs from 'fs';
import { formatBytes } from '../function';

export let fileSizeStatusBar: vscode.StatusBarItem = createFileSizeStatusBar();

function createFileSizeStatusBar(): vscode.StatusBarItem {
    const config = vscode.workspace.getConfiguration();
    const position = config.get<'left' | 'right'>('fileSizeStatusBar.alignment', 'right');
    const priority = config.get<number>('fileSizeStatusBar.priority', 100);

    const alignment = position === 'left'
        ? vscode.StatusBarAlignment.Left
        : vscode.StatusBarAlignment.Right;

    const item = vscode.window.createStatusBarItem(alignment, priority);
    item.show();
    return item;
}

export function updateFileSizeStatutBar() {
    fileSizeStatusBar = createFileSizeStatusBar();
}


export function updateFileSize(document: vscode.TextDocument) {
    const filePath = document.uri.fsPath;

    fs.stat(filePath, (err, stats) => {
        if (err) {
            fileSizeStatusBar.hide();
            return;
        }

        const sizeInBytes = stats.size;
        const sizeText = formatBytes(sizeInBytes);
        fileSizeStatusBar.text = `${sizeText}`; //$(file) logo de fichier
        fileSizeStatusBar.show();
    });
}