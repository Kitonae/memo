const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class SRS {
    constructor() {
        this.STAGES = {
            "Apprentice 1": 4 * 60 * 60 * 1000, // 4 hours in ms
            "Apprentice 2": 8 * 60 * 60 * 1000, // 8 hours in ms
            "Apprentice 3": 24 * 60 * 60 * 1000, // 1 day in ms
            "Apprentice 4": 2 * 24 * 60 * 60 * 1000, // 2 days in ms
            "Guru 1": 7 * 24 * 60 * 60 * 1000, // 1 week in ms
            "Guru 2": 14 * 24 * 60 * 60 * 1000, // 2 weeks in ms
            "Master": 28 * 24 * 60 * 60 * 1000, // 4 weeks in ms
            "Enlightened": 112 * 24 * 60 * 60 * 1000, // 16 weeks in ms
            "Burned": null
        };
        this.STAGE_ORDER = Object.keys(this.STAGES);
        this.userDataFile = path.join(__dirname, '..', 'user_data.json');
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.userDataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveData(data) {
        await fs.writeFile(this.userDataFile, JSON.stringify(data, null, 4));
    }

    async getReviewWords() {
        const words = await this.loadWords();
        const userData = await this.loadData();
        const now = new Date();
        const reviewWords = [];
        
        const userKanji = new Set(userData.map(word => word.kanji));

        // Add new words to user data
        for (const word of words) {
            if (!userKanji.has(word.kanji)) {
                userData.push({
                    kanji: word.kanji,
                    stage: "Apprentice 1",
                    next_review: new Date(now.getTime() + this.STAGES["Apprentice 1"]).toISOString()
                });
                userKanji.add(word.kanji);
            }
        }

        await this.saveData(userData);

        // Get words due for review
        for (const wordData of userData) {
            if (wordData.stage === "Burned") continue;
            if (new Date(wordData.next_review) <= now) {
                const word = words.find(w => w.kanji === wordData.kanji);
                if (word) {
                    // Format translations for display
                    const formattedTranslations = word.translations.map(t => {
                        if (typeof t === 'object' && t.text) {
                            return t.description ? `${t.text} (${t.description})` : t.text;
                        }
                        return t;
                    });
                    
                    reviewWords.push({
                        ...word,
                        translation: formattedTranslations.join(', '),
                        translations: word.translations,
                        stage: wordData.stage,
                        next_review: wordData.next_review
                    });
                }
            }
        }

        return reviewWords;
    }

    async updateWord(kanji, correct) {
        const userData = await this.loadData();
        
        for (const wordData of userData) {
            if (wordData.kanji === kanji) {
                const currentStageIndex = this.STAGE_ORDER.indexOf(wordData.stage);
                
                if (correct) {
                    if (currentStageIndex < this.STAGE_ORDER.length - 1) {
                        const newStage = this.STAGE_ORDER[currentStageIndex + 1];
                        wordData.stage = newStage;
                        const interval = this.STAGES[newStage];
                        if (interval) {
                            wordData.next_review = new Date(Date.now() + interval).toISOString();
                        } else {
                            delete wordData.next_review;
                        }
                    }
                } else {
                    const demotionCount = currentStageIndex > this.STAGE_ORDER.indexOf("Guru 1") ? 2 : 1;
                    const newStageIndex = Math.max(0, currentStageIndex - demotionCount);
                    const newStage = this.STAGE_ORDER[newStageIndex];
                    wordData.stage = newStage;
                    wordData.next_review = new Date(Date.now() + this.STAGES[newStage]).toISOString();
                }
                
                await this.saveData(userData);
                return;
            }
        }
    }

    async loadWords() {
        try {
            const data = await fs.readFile(path.join(__dirname, '..', 'words.json'), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading words:', error);
            return [];
        }
    }

    async getStats() {
        const userData = await this.loadData();
        const stats = {};
        
        for (const stage of this.STAGE_ORDER) {
            stats[stage] = userData.filter(word => word.stage === stage).length;
        }
        
        const now = new Date();
        const reviewCount = userData.filter(word => 
            word.stage !== "Burned" && 
            word.next_review && 
            new Date(word.next_review) <= now
        ).length;
        
        stats.reviewCount = reviewCount;
        stats.totalWords = userData.length;
        
        return stats;
    }
}

const srs = new SRS();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional
        titleBarStyle: 'default',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Optional: Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

// IPC handlers
ipcMain.handle('get-review-words', async () => {
    return await srs.getReviewWords();
});

ipcMain.handle('update-word', async (event, kanji, correct, debugMode = false) => {
    if (!debugMode) {
        await srs.updateWord(kanji, correct);
    }
    return { success: true, debugMode };
});

ipcMain.handle('get-stats', async () => {
    return await srs.getStats();
});

ipcMain.handle('get-all-words', async () => {
    const words = await srs.loadWords();
    // Format for compatibility with existing UI
    return words.map(word => {
        const formattedTranslations = word.translations.map(t => {
            if (typeof t === 'object' && t.text) {
                return t.description ? `${t.text} (${t.description})` : t.text;
            }
            return t;
        });
        
        return {
            ...word,
            translation: formattedTranslations.join(', '),
            translations: word.translations
        };
    });
});

ipcMain.handle('check-translation', async (event, kanji, userAnswer) => {
    const words = await srs.loadWords();
    const word = words.find(w => w.kanji === kanji);
    
    if (!word) return { valid: false, matches: [] };
    
    const userAnswerLower = userAnswer.toLowerCase().trim();
    const matches = [];
    const allTranslations = [];
    
    // Check each translation object
    for (const translation of word.translations) {
        let translationText;
        let displayText;
        
        if (typeof translation === 'object' && translation.text) {
            translationText = translation.text;
            displayText = translation.description ? `${translation.text} (${translation.description})` : translation.text;
        } else {
            translationText = translation;
            displayText = translation;
        }
        
        allTranslations.push(displayText);
        
        // Only check against the main text, not the description
        const translationLower = translationText.toLowerCase().trim();
        
        if (translationLower === userAnswerLower ||
            translationLower.includes(userAnswerLower) ||
            userAnswerLower.includes(translationLower)) {
            matches.push(displayText);
        }
    }
    
    return {
        valid: matches.length > 0,
        matches: matches,
        allTranslations: allTranslations
    };
});

ipcMain.handle('get-debug-words', async (event, count = 10) => {
    const words = await srs.loadWords();
    // Shuffle and return a subset for debug mode
    const shuffled = words.sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, count);
    
    // Format for compatibility with existing UI
    return selectedWords.map(word => {
        const formattedTranslations = word.translations.map(t => {
            if (typeof t === 'object' && t.text) {
                return t.description ? `${t.text} (${t.description})` : t.text;
            }
            return t;
        });
        
        return {
            ...word,
            translation: formattedTranslations.join(', '),
            translations: word.translations
        };
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
