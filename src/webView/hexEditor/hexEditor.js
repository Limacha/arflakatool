const vscode = acquireVsCodeApi();

// Récupération des textarea dans le DOM
const binaryArea = document.getElementById("binary"); // colonne binaire
const hexArea = document.getElementById("hex");       // colonne hex
const asciiArea = document.getElementById("ascii");   // colonne ASCII

const binaryColumn = document.getElementById("binaryColumn");
const hexColumn = document.getElementById("hexColumn");
const asciiColumn = document.getElementById("asciiColumn");

const toggleBinary = document.getElementById("toggleBinary");
const toggleHex = document.getElementById("toggleHex");
const toggleAscii = document.getElementById("toggleAscii");


// ---------------------------------------------
// Fonctions de conversion
// ---------------------------------------------

// Convertit une ligne de texte ASCII en binaire (chaque caractère devient 8 bits)
function asciiLineToBinary(line) {
    return line
        .split('') // découpe la ligne en caractères individuels
        .map(c => c.charCodeAt(0)            // récupère le code ASCII de chaque caractère
            .toString(2)             // convertit le code en binaire
            .padStart(8, '0'))       // remplit à 8 bits (ex: 'A' → '01000001')
        .join(' ');                          // sépare chaque octet par un espace
}

// Convertit une ligne ASCII en hexadécimal (chaque caractère → 2 chiffres hex)
function asciiLineToHex(line) {
    return line
        .split('')
        .map(c => c.charCodeAt(0)
            .toString(16)           // convertit le code en hex
            .padStart(2, '0'))      // toujours 2 caractères (ex: 'A' → '41')
        .join(' ');                          // sépare chaque octet par un espace
}

// Convertit une ligne binaire en ASCII
function binaryLineToAscii(line) {
    return line
        .split(' ')                            // sépare les octets (8 bits)
        .map(b => String.fromCharCode(parseInt(b, 2))) // parse binaire → nombre → caractère
        .join('');                             // assemble tous les caractères
}

// Convertit une ligne hex en ASCII
function hexLineToAscii(line) {
    return line
        .split(' ')                            // sépare les octets hex
        .map(h => String.fromCharCode(parseInt(h, 16))) // parse hex → nombre → caractère
        .join('');                             // assemble les caractères
}

// ---------------------------------------------
// Fonction pour envoyer les données à l'extension
// ---------------------------------------------
function sendUpdate(text) {
    const buffer = new TextEncoder().encode(text);
    const b64 = btoa(String.fromCharCode(...buffer));
    vscode.postMessage({
        command: 'update',
        data: b64
    });
}

// ---------------------------------------------
// Fonctions de mise à jour des colonnes
// ---------------------------------------------

function updateFromAscii() {
    const text = asciiArea.value;
    const lines = [text]; // ici chaque zone est un bloc de texte
    const binaryLines = lines.map(asciiLineToBinary);
    const hexLines = lines.map(asciiLineToHex);

    binaryArea.value = binaryLines.join(' ');
    hexArea.value = hexLines.join(' ');

    autoResizeAll();
    return text;
}

function updateFromBinary() {
    const text = binaryArea.value;
    const ascii = binaryLineToAscii(text);
    const hex = asciiLineToHex(ascii);

    asciiArea.value = ascii;
    hexArea.value = hex;

    autoResizeAll();
    return ascii;
}

function updateFromHex() {
    const text = hexArea.value;
    const ascii = hexLineToAscii(text);
    const binary = asciiLineToBinary(ascii);

    asciiArea.value = ascii;
    binaryArea.value = binary;

    autoResizeAll();
    return ascii;
}

// ---------------------------------------------
// Fonction pour auto-resize
// ---------------------------------------------
function autoResizeAll() {
    document.querySelectorAll('textarea').forEach(t => { // pour chaque textarea
        t.style.height = 'auto';             // reset la hauteur pour recalculer
        t.style.height = t.scrollHeight + 'px'; // ajuste la hauteur pour le contenu
    });
}

// ---------------------------------------------
// Événements pour la saisie
// ---------------------------------------------
asciiArea.addEventListener('input', () => sendUpdate(updateFromAscii()));   // mise à jour dès qu'on tape dans ASCII
binaryArea.addEventListener('input', () => sendUpdate(updateFromBinary())); // mise à jour dès qu'on tape dans binaire
hexArea.addEventListener('input', () => sendUpdate(updateFromHex()));       // mise à jour dès qu'on tape dans hex

// ---------------------------------------------
// Gestion de l'affichage avec les checkboxes
// ---------------------------------------------
toggleBinary.addEventListener("change", () => {
    binaryColumn.style.display = toggleBinary.checked ? "flex" : "none";
});
toggleHex.addEventListener("change", () => {
    hexColumn.style.display = toggleHex.checked ? "flex" : "none";
});
toggleAscii.addEventListener("change", () => {
    asciiColumn.style.display = toggleAscii.checked ? "flex" : "none";
});

// ---------------------------------------------
// Initialisation
// ---------------------------------------------
autoResizeAll(); // ajuste la hauteur au chargement si du contenu est déjà présent
updateFromHex();