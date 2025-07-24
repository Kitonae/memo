const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

// Enable live reload for development
if (process.argv.includes('--dev')) {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
            hardResetMethod: 'exit'
        });
    } catch (e) {
        console.log('electron-reload not available');
    }
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '..', 'assets', 'icon.png'), // Add icon if available
        titleBarStyle: 'default',
        show: false // Don't show until ready-to-show
    });

    // Load the web application
    const webPath = path.join(__dirname, '..', 'web', 'index.html');
    mainWindow.loadFile(webPath);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus window on creation
        if (process.platform === 'darwin') {
            mainWindow.focus();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Development tools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Reset Progress',
                    click: async () => {
                        const { dialog } = require('electron');
                        const result = await dialog.showMessageBox(mainWindow, {
                            type: 'warning',
                            buttons: ['Cancel', 'Reset'],
                            defaultId: 0,
                            message: 'Reset all progress?',
                            detail: 'This will delete all your learning progress. This action cannot be undone.'
                        });
                        
                        if (result.response === 1) {
                            mainWindow.webContents.send('reset-progress');
                        }
                    }
                },
                { type: 'separator' },
                {
                    role: 'quit'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Study',
            submenu: [
                {
                    label: 'Start Review',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.send('start-review');
                    }
                },
                {
                    label: 'Practice Mode',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.send('start-practice');
                    }
                },
                {
                    label: 'Browse Dictionary',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => {
                        mainWindow.webContents.send('show-dictionary');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Japanese SRS',
                    click: async () => {
                        const { dialog } = require('electron');
                        await dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Japanese SRS',
                            message: 'Japanese SRS v1.0.0',
                            detail: 'A spaced repetition system for learning Japanese vocabulary.\n\nFeatures:\n• Spaced repetition algorithm\n• Progress tracking\n• Practice mode\n• Dictionary browsing'
                        });
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });

        // Window menu
        template[4].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
    createWindow();
    createMenu();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until explicitly quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// IPC handlers for data persistence
ipcMain.handle('get-user-data', async () => {
    try {
        const userDataPath = path.join(__dirname, '..', 'user_data.json');
        const data = await fs.readFile(userDataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { words: {}, stats: {} };
    }
});

ipcMain.handle('save-user-data', async (event, data) => {
    try {
        const userDataPath = path.join(__dirname, '..', 'user_data.json');
        await fs.writeFile(userDataPath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Failed to save user data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-vocabulary-data', async () => {
    try {
        const vocabPath = path.join(__dirname, '..', 'words.json');
        const data = await fs.readFile(vocabPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load vocabulary data:', error);
        return [];
    }
});

// Handle app updates and notifications
ipcMain.handle('show-notification', async (event, title, body) => {
    const { Notification } = require('electron');
    
    if (Notification.isSupported()) {
        new Notification({
            title,
            body
        }).show();
    }
});

// Export for testing
module.exports = { createWindow, createMenu };
