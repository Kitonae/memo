const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getReviewWords: () => ipcRenderer.invoke('get-review-words'),
    updateWord: (kanji, correct, debugMode = false) => ipcRenderer.invoke('update-word', kanji, correct, debugMode),
    getStats: () => ipcRenderer.invoke('get-stats'),
    getAllWords: () => ipcRenderer.invoke('get-all-words'),
    getDebugWords: (count) => ipcRenderer.invoke('get-debug-words', count),
    checkTranslation: (kanji, userAnswer) => ipcRenderer.invoke('check-translation', kanji, userAnswer)
});
