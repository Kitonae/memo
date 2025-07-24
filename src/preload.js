const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Data persistence
    getUserData: () => ipcRenderer.invoke('get-user-data'),
    saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
    getVocabularyData: () => ipcRenderer.invoke('get-vocabulary-data'),
    
    // Legacy methods (for backward compatibility)
    getReviewWords: () => ipcRenderer.invoke('get-review-words'),
    updateWord: (kanji, correct, debugMode = false) => ipcRenderer.invoke('update-word', kanji, correct, debugMode),
    getStats: () => ipcRenderer.invoke('get-stats'),
    getAllWords: () => ipcRenderer.invoke('get-all-words'),
    getDebugWords: (count) => ipcRenderer.invoke('get-debug-words', count),
    checkTranslation: (kanji, userAnswer) => ipcRenderer.invoke('check-translation', kanji, userAnswer),
    
    // Notifications
    showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
    
    // Menu-triggered actions
    onStartReview: (callback) => ipcRenderer.on('start-review', callback),
    onStartPractice: (callback) => ipcRenderer.on('start-practice', callback),
    onShowDictionary: (callback) => ipcRenderer.on('show-dictionary', callback),
    onResetProgress: (callback) => ipcRenderer.on('reset-progress', callback),
    
    // Cleanup listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Platform info
    platform: process.platform,
    
    // Version info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});
