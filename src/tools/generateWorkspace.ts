import * as fs from 'fs';
import { relative } from 'path';
import * as vscode from 'vscode';
import { logChannel, log, warn, error } from '../log';
import { getRootPath } from '../config';
import { clearDirectory, createDir, createFile, escapeSpecialChars, pathExists, readFileContent, standarPath, createFullPath } from '../function';

export async function generateWorkspaceFromStructure(from: string, to: string, structure: boolean, code: boolean, fromCode: string = "") {
    let struct: string[] = [];
    let files: Map<string, string> = new Map;
    let allTask: number = 0;

    from = createFullPath(standarPath(from));
    if (fromCode != "") fromCode = createFullPath(standarPath(fromCode));
    to = createFullPath(standarPath(to));

    if (!await pathExists(from)) {
        vscode.window.showErrorMessage(`le chemin from n'existe pas: ${from}`)
        return;
    }

    if (fromCode != "" && !await pathExists(fromCode)) {
        vscode.window.showErrorMessage(`le chemin fromCode n'existe pas: ${fromCode}`)
        return;
    }

    if (!await pathExists(to)) {
        vscode.window.showErrorMessage(`le chemin to n'existe pas: ${to}`)
        return;
    }

    if (structure) {
        struct = readFileContent(from).split("\n").filter(ligne => { return (ligne.startsWith("├") || ligne.startsWith("│")) && ligne.split("├").length === 2 });
        log(struct);
        allTask += struct.length;
    }

    if (code) {
        const content: string[] = readFileContent((fromCode != "") ? fromCode : from).split("///////////////////////////\n");
        for (let index = 1; index < content.length - 1; index += 2) {
            //log(`i=${index} m=${content.length + 1}`);
            files.set(content[index].slice(3, -1), content[index + 1]);
        }
        log(files);
        allTask += files.size;
    }
    //log(allTask);
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "generation en cours...",
        cancellable: false
    }, (progress) => {
        let lastProgress: number = 0;
        let taskDone: number = 0;
        let notice: boolean = true;

        /**
         * definit la valeur de la barre de chargement
         * @param value valeur de chargement de 0-100
         * @param message message qui sera afficher a la place de x%
         */
        const report = (value: number = lastProgress, message: string = "") => {
            const increment = value - lastProgress;
            progress.report({ increment, message: (message != "") ? message : `${value}%` });
            lastProgress = value;
        };
        /*return new Promise<void>((resolve) => {
            let i = 0;
            let interval = setInterval(() => {
                i += 10;
                progress.report({ increment: 10, message: `${i}%` });

                if (i >= 100) {
                    clearInterval(interval);
                    resolve();
                }
            }, 300); // incrémente toutes les 300ms
        });*/
        return new Promise<void>(async (resolve) => {
            try {
                let previusDir = to;
                let elemMarker = 0;
                let previusElemMarker = 0;
                for (let iLigne = 0; iLigne < struct.length; iLigne++) {
                    const ligne = struct[iLigne];

                    //verification et adaptation du chemin
                    if (ligne.charAt(ligne.indexOf("├") + 1) === "D") {
                        elemMarker = ligne.indexOf("├");
                        if (elemMarker === 0) { previusDir = to; }//si debut alors fichier a la racine
                        else if (elemMarker === previusElemMarker) { previusDir = previusDir.slice(undefined, previusDir.lastIndexOf("\\")); } //si meme niveau alors suprime le dernier dir
                        else if (elemMarker < previusElemMarker) { //si inferieur supprime la differance de sous dossier
                            const subNum = ligne.split("│").length;
                            const previusSubNum = struct[iLigne - 1].split("│").length;
                            for (let iSup = 0; iSup < previusSubNum - subNum; iSup++) {
                                previusDir = previusDir.slice(undefined, previusDir.lastIndexOf("\\"));
                            }
                        }
                        previusElemMarker = elemMarker;
                    }

                    //creez le chemin de l'element actuel
                    let path = previusDir + "\\" + ligne.slice(ligne.indexOf("├") + 4);
                    report(undefined, path);
                    log(path);
                    if (ligne.charAt(ligne.indexOf("├") + 1) === "D") {
                        previusDir = path;
                        if (notice && await pathExists(path)) {
                            const answer = await vscode.window.showQuickPick(["confirmer", "annuller", "pour tous"], { placeHolder: `le contenu du dossier ${path} sera suprimer`, canPickMany: true });
                            if (answer?.includes("annuller")) {
                                if (answer?.includes("pour tous")) {
                                    resolve();
                                    return;
                                } else {
                                    continue;
                                }
                            }
                            else if (answer?.includes("confirmer") && answer.includes("pour tous")) {
                                notice = false;
                            }
                        }
                        await clearDirectory(path);
                        await createDir(path);
                    }
                    else {
                        if (notice && await pathExists(path)) {
                            const answer = await vscode.window.showQuickPick(["confirmer", "annuller", "pour tous"], { placeHolder: `le contenu du fichier ${path} sera suprimer`, canPickMany: true });
                            if (answer?.includes("annuller")) {
                                if (answer?.includes("pour tous")) {
                                    resolve();
                                    return;
                                } else {
                                    continue;
                                }
                            }
                            else if (answer?.includes("confirmer") && answer.includes("pour tous")) {
                                notice = false;
                            }
                        }
                        let content: string | undefined = "";
                        if (code) {
                            const relativePath = relative(to, path);
                            log(relativePath, files.has(relativePath));
                            if (files.has(relativePath)) {
                                content = files.get(relativePath);
                            }
                        }
                        await createFile(path, content);
                    }
                    taskDone++;
                    report(taskDone / allTask * 100, "V " + path);
                }

                resolve();
            } catch (err) {
                resolve();
                vscode.window.showErrorMessage("une erreur est survenu: " + err);
                error(err);
            }
        })
    }).then(() => {
        vscode.window.showInformationMessage("structure generer");
    });
}