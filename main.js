const { app, BrowserWindow } = require('electron');
const path = require('path');

// Corrige l'erreur de Sandbox spécifique à Linux (SIGTRAP / chrome-sandbox)
app.commandLine.appendSwitch('no-sandbox');

function createWindow() {
    // Crée la fenêtre principale du navigateur
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,    // Recommandé pour la sécurité
            contextIsolation: true,    // Protège l'application des scripts malveillants
        }
    });

    // MASQUE LA BARRE DE MENU (File, Edit, View...)
    win.setMenuBarVisibility(false);
    // Alternative si vous voulez la supprimer complètement :
    // win.removeMenu();

    // Charge le fichier index.html situé à la racine du projet
    win.loadFile(path.join(__dirname, 'index.html'));
}

// Cette méthode est appelée quand Electron a fini de s'initialiser
app.whenReady().then(() => {
    createWindow();

    // Sur macOS, recrée une fenêtre si l'application est activée alors qu'aucune n'est ouverte
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quitte l'application quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
