import * as vscode from 'vscode';

const prefix = "--akTool--> "

export const outputChannel = vscode.window.createOutputChannel("akTool");

export function logChannel(...messages: string[]) {
    for (const msg of messages) {
        outputChannel.append(prefix);
        outputChannel.appendLine(msg);
    }
    outputChannel.show(true);
}

export function log(...messages: any[]) {
    for (const msg of messages) {
        console.log(prefix, msg);
    }
}

export function warn(...messages: any[]) {
    for (const msg of messages) {
        console.warn(prefix, msg);
    }
}

export function error(...messages: any[]) {
    for (const msg of messages) {
        console.error(prefix, msg);
    }
}
