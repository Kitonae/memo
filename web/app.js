// Cloud Storage Manager using GitHub Gists
class CloudStorageManager {
    constructor() {
        this.gistId = localStorage.getItem('japanese-srs-gist-id');
        this.githubToken = localStorage.getItem('japanese-srs-github-token');
        this.isConfigured = false;
        this.checkConfiguration();
    }

    checkConfiguration() {
        this.isConfigured = !!(this.gistId && this.githubToken);
        return this.isConfigured;
    }

    async configure(githubToken, gistId = null) {
        this.githubToken = githubToken;
        localStorage.setItem('japanese-srs-github-token', githubToken);
        
        if (gistId) {
            this.gistId = gistId;
            localStorage.setItem('japanese-srs-gist-id', gistId);
        } else {
            // Create new gist
            try {
                const newGist = await this.createGist();
                this.gistId = newGist.id;
                localStorage.setItem('japanese-srs-gist-id', this.gistId);
            } catch (error) {
                throw new Error(`Failed to create gist: ${error.message}`);
            }
        }
        
        this.isConfigured = true;
        return { gistId: this.gistId, success: true };
    }

    async createGist() {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'Japanese SRS - User Progress Data',
                public: false,
                files: {
                    'user_data.json': {
                        content: JSON.stringify([], null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async saveData(userData) {
        if (!this.isConfigured) {
            throw new Error('Cloud storage not configured');
        }

        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'user_data.json': {
                        content: JSON.stringify({
                            version: '1.0',
                            lastUpdated: new Date().toISOString(),
                            data: userData
                        }, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save to cloud: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async loadData() {
        if (!this.isConfigured) {
            return null;
        }

        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            headers: {
                'Authorization': `token ${this.githubToken}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load from cloud: ${response.status} ${response.statusText}`);
        }

        const gist = await response.json();
        const fileContent = gist.files['user_data.json']?.content;
        
        if (!fileContent) {
            return [];
        }

        try {
            const parsed = JSON.parse(fileContent);
            return parsed.data || parsed; // Support both new and legacy formats
        } catch (error) {
            console.error('Error parsing cloud data:', error);
            return [];
        }
    }

    disconnect() {
        localStorage.removeItem('japanese-srs-gist-id');
        localStorage.removeItem('japanese-srs-github-token');
        this.gistId = null;
        this.githubToken = null;
        this.isConfigured = false;
    }

    getGistUrl() {
        return this.gistId ? `https://gist.github.com/${this.gistId}` : null;
    }
}

class WebJapaneseSRSApp {
    constructor() {
        this.currentView = 'dashboard';
        this.reviewWords = [];
        this.currentReviewIndex = 0;
        this.allWords = [];
        this.stats = {};
        this.isAnswerVisible = false;
        
        // Practice mode properties
        this.practiceWords = [];
        this.currentPracticeIndex = 0;
        this.isPracticeMode = false;
        
        // Storage managers
        this.cloudStorage = new CloudStorageManager();
        this.useCloudStorage = false;
        
        // SRS configuration
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
        
        // Stage emojis for visual representation
        this.STAGE_EMOJIS = {
            "Apprentice 1": "🌱",
            "Apprentice 2": "🌱", 
            "Apprentice 3": "🌱",
            "Apprentice 4": "🌱",
            "Guru 1": "🎓",
            "Guru 2": "🎓", 
            "Master": "👑",
            "Enlightened": "✨",
            "Burned": "🔥"
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        await this.renderDashboard();
    }

    setupEventListeners() {
        // Navigation
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const view = e.target.dataset.view;
                await this.switchView(view);
            });
        });

        // Dashboard buttons
        const startReviewBtn = document.getElementById('start-review');
        if (startReviewBtn) {
            startReviewBtn.addEventListener('click', () => {
                this.startReview();
            });
        }

        // Review buttons
        const backToDashboardBtn = document.getElementById('back-to-dashboard');
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', async () => {
                await this.switchView('dashboard');
            });
        }

        const showAnswerBtn = document.querySelector('.show-answer-btn');
        if (showAnswerBtn) {
            showAnswerBtn.addEventListener('click', () => {
                this.showAnswer();
            });
        }

        const correctBtn = document.getElementById('correct-btn');
        if (correctBtn) {
            correctBtn.addEventListener('click', () => {
                this.submitAnswer(true);
            });
        }

        const incorrectBtn = document.getElementById('incorrect-btn');
        if (incorrectBtn) {
            incorrectBtn.addEventListener('click', () => {
                this.submitAnswer(false);
            });
        }

        // Practice mode buttons
        const practiceBackBtn = document.getElementById('practice-back-to-dashboard');
        if (practiceBackBtn) {
            practiceBackBtn.addEventListener('click', async () => {
                await this.switchView('dashboard');
            });
        }

        const startPracticeBtn = document.getElementById('start-practice');
        if (startPracticeBtn) {
            startPracticeBtn.addEventListener('click', () => {
                this.startPracticeSession();
            });
        }

        const practiceShowAnswerBtn = document.querySelector('#practice-show-answer .show-answer-btn');
        if (practiceShowAnswerBtn) {
            practiceShowAnswerBtn.addEventListener('click', () => {
                this.showPracticeAnswer();
            });
        }

        const practiceCorrectBtn = document.getElementById('practice-correct-btn');
        if (practiceCorrectBtn) {
            practiceCorrectBtn.addEventListener('click', () => {
                this.submitPracticeAnswer(true);
            });
        }

        const practiceIncorrectBtn = document.getElementById('practice-incorrect-btn');
        if (practiceIncorrectBtn) {
            practiceIncorrectBtn.addEventListener('click', () => {
                this.submitPracticeAnswer(false);
            });
        }

        // Browse search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterWords(e.target.value);
            });
        }

        // Answer input event handlers
        const answerInput = document.getElementById('answer-input');
        if (answerInput) {
            answerInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.validateAnswer();
                }
            });
        }

        const practiceAnswerInput = document.getElementById('practice-answer-input');
        if (practiceAnswerInput) {
            practiceAnswerInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.validatePracticeAnswer();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', async (e) => {
            // Only handle shortcuts if not typing in an input field
            const isTyping = e.target.tagName === 'INPUT';
            
            if (this.currentView === 'review' && !isTyping) {
                switch(e.key) {
                    case ' ':
                        e.preventDefault();
                        const reviewAnswerInput = document.getElementById('answer-input');
                        if (!this.isAnswerVisible && reviewAnswerInput) {
                            reviewAnswerInput.focus();
                        }
                        break;
                    case '1':
                        if (this.isAnswerVisible) {
                            this.submitAnswer(false);
                        }
                        break;
                    case '2':
                        if (this.isAnswerVisible) {
                            this.submitAnswer(true);
                        }
                        break;
                    case 'Escape':
                        await this.switchView('dashboard');
                        break;
                }
            } else if (this.currentView === 'practice' && !isTyping) {
                switch(e.key) {
                    case ' ':
                        e.preventDefault();
                        const practiceInput = document.getElementById('practice-answer-input');
                        if (!this.isAnswerVisible && practiceInput) {
                            practiceInput.focus();
                        }
                        break;
                    case '1':
                        if (this.isAnswerVisible) {
                            this.submitPracticeAnswer(false);
                        }
                        break;
                    case '2':
                        if (this.isAnswerVisible) {
                            this.submitPracticeAnswer(true);
                        }
                        break;
                    case 'Escape':
                        await this.switchView('dashboard');
                        break;
                }
            }
        });

        // Cloud storage UI handlers
        this.setupCloudStorageUI();
    }

    setupCloudStorageUI() {
        // Setup modal handlers
        const setupModal = document.getElementById('cloud-setup-modal');
        const importModal = document.getElementById('import-export-modal');
        
        // Setup cloud storage button
        const setupCloudBtn = document.getElementById('setup-cloud');
        if (setupCloudBtn && setupModal) {
            setupCloudBtn.addEventListener('click', () => {
                setupModal.classList.add('show');
            });
        }

        // Import/Export button
        const importExportBtn = document.getElementById('importExportBtn');
        if (importExportBtn) {
            importExportBtn.addEventListener('click', () => {
                this.showImportExportModal();
            });
        }

        // Modal close buttons
        const modalCloseBtns = document.querySelectorAll('.modal-close');
        modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Click outside to close modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });

        // Setup form submission
        const setupForm = document.getElementById('setupForm');
        if (setupForm) {
            setupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCloudSetup();
            });
        }

        // Import/Export actions
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }

        const importDataBtn = document.getElementById('importDataBtn');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                this.importUserData();
            });
        }

        // Clear local data
        const clearLocalBtn = document.getElementById('clearLocalBtn');
        if (clearLocalBtn) {
            clearLocalBtn.addEventListener('click', () => {
                if (confirm('This will delete all your local progress. Are you sure?')) {
                    localStorage.removeItem('japanese-srs-userdata');
                    this.userData = this.createDefaultUserData();
                    this.showNotification('Local data cleared', 'info');
                    this.renderDashboard();
                }
            });
        }

        // Sync cloud data
        const syncCloudBtn = document.getElementById('syncCloudBtn');
        if (syncCloudBtn) {
            syncCloudBtn.addEventListener('click', () => {
                this.syncCloudData();
            });
        }
    }

    async handleCloudSetup() {
        const form = document.getElementById('setupForm');
        const formData = new FormData(form);
        const setupType = formData.get('setupType');
        const token = formData.get('githubToken');
        const gistId = formData.get('existingGistId');
        
        const statusDiv = document.getElementById('setupStatus');
        statusDiv.style.display = 'none';

        try {
            if (setupType === 'new') {
                // Create new cloud storage
                const result = await this.cloudStorage.initialize(token);
                if (result.success) {
                    statusDiv.textContent = `Cloud storage created! Gist ID: ${result.gistId}`;
                    statusDiv.className = 'setup-status success';
                    statusDiv.style.display = 'block';
                    
                    // Upload current data
                    await this.setUserData(this.userData);
                    this.showNotification('Cloud storage setup complete!', 'success');
                    
                    // Close modal after delay
                    setTimeout(() => {
                        document.getElementById('cloudSetupModal').classList.remove('show');
                    }, 2000);
                } else {
                    throw new Error(result.error);
                }
            } else if (setupType === 'existing') {
                // Connect to existing storage
                const result = await this.cloudStorage.initialize(token, gistId);
                if (result.success) {
                    // Load existing data
                    const cloudData = await this.getUserData();
                    if (cloudData && Object.keys(cloudData.words || {}).length > 0) {
                        // Merge with local data (ask user what to do)
                        const useCloud = confirm('Found existing cloud data. Use cloud data and replace local progress?');
                        if (useCloud) {
                            this.userData = cloudData;
                            await this.setUserData(this.userData);
                            this.renderDashboard();
                        }
                    }
                    
                    statusDiv.textContent = 'Successfully connected to existing cloud storage!';
                    statusDiv.className = 'setup-status success';
                    statusDiv.style.display = 'block';
                    
                    this.showNotification('Connected to cloud storage!', 'success');
                    
                    setTimeout(() => {
                        document.getElementById('cloudSetupModal').classList.remove('show');
                    }, 2000);
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.className = 'setup-status error';
            statusDiv.style.display = 'block';
        }
    }

    showImportExportModal() {
        const modal = document.getElementById('importExportModal');
        const exportTextarea = document.getElementById('exportData');
        
        // Pre-fill export data
        exportTextarea.value = JSON.stringify(this.userData, null, 2);
        
        modal.classList.add('show');
    }

    exportUserData() {
        const data = JSON.stringify(this.userData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'japanese-srs-data.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    importUserData() {
        const importData = document.getElementById('importData').value.trim();
        if (!importData) {
            this.showNotification('Please paste data to import', 'warning');
            return;
        }

        try {
            const data = JSON.parse(importData);
            
            // Validate data structure
            if (!data.words || !data.stats) {
                throw new Error('Invalid data format');
            }

            const mergeType = document.querySelector('input[name="importType"]:checked').value;
            
            if (mergeType === 'replace') {
                this.userData = data;
            } else {
                // Merge data
                Object.keys(data.words).forEach(wordId => {
                    this.userData.words[wordId] = data.words[wordId];
                });
                
                // Merge stats
                this.userData.stats.totalAnswered += data.stats.totalAnswered || 0;
                this.userData.stats.correctAnswers += data.stats.correctAnswers || 0;
            }

            this.setUserData(this.userData);
            this.renderDashboard();
            
            document.getElementById('importExportModal').classList.remove('show');
            this.showNotification('Data imported successfully!', 'success');
        } catch (error) {
            this.showNotification('Invalid JSON data', 'error');
        }
    }

    async syncCloudData() {
        if (!this.cloudStorage.isConfigured) {
            this.showNotification('Cloud storage not setup', 'warning');
            return;
        }

        try {
            // Save current data to cloud
            await this.setUserData(this.userData);
            this.showNotification('Data synced to cloud!', 'success');
        } catch (error) {
            this.showNotification('Sync failed: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Unified storage methods (local + cloud)
    async getUserData() {
        try {
            if (this.useCloudStorage && this.cloudStorage.isConfigured) {
                const cloudData = await this.cloudStorage.loadData();
                if (cloudData) {
                    // Also save to local storage as backup
                    localStorage.setItem('japanese-srs-userdata', JSON.stringify(cloudData));
                    return cloudData;
                }
            }
        } catch (error) {
            console.error('Cloud storage error, falling back to local:', error);
            this.showNotification('Cloud sync failed, using local data', 'warning');
        }
        
        // Fallback to local storage
        const data = localStorage.getItem('japanese-srs-userdata');
        return data ? JSON.parse(data) : { words: {}, stats: {} };
    }

    async setUserData(data) {
        // Always save to local storage
        localStorage.setItem('japanese-srs-userdata', JSON.stringify(data));
        
        // Try to save to cloud if configured
        if (this.useCloudStorage && this.cloudStorage.isConfigured) {
            try {
                await this.cloudStorage.saveData(data);
                this.showNotification('Progress synced to cloud', 'success');
            } catch (error) {
                console.error('Cloud save failed:', error);
                this.showNotification('Cloud sync failed, saved locally', 'warning');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    getWords() {
        if (typeof VOCABULARY_DATA === 'undefined') {
            console.error('VOCABULARY_DATA is not defined! Check if data.js is loaded properly.');
            return [];
        }
        return VOCABULARY_DATA; // From data.js
    }

    async loadInitialData() {
        this.allWords = this.getWords();
        await this.updateStats();
    }

    async getReviewWords() {
        const words = this.getWords();
        const userData = await this.getUserData();
        const userWordsMap = userData.words || {};
        const now = new Date();
        const reviewWords = [];
        
        const userKanji = new Set(Object.keys(userWordsMap));

        // Add new words to user data
        for (const word of words) {
            if (!userKanji.has(word.kanji)) {
                userWordsMap[word.kanji] = {
                    kanji: word.kanji,
                    stage: "Apprentice 1",
                    next_review: new Date(now.getTime() + this.STAGES["Apprentice 1"]).toISOString()
                };
                userKanji.add(word.kanji);
            }
        }

        await this.setUserData({ words: userWordsMap, stats: userData.stats || {} });

        // Get words due for review
        for (const [kanji, wordData] of Object.entries(userWordsMap)) {
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

    async updateWord(kanji, correct, practiceMode = false) {
        if (practiceMode) return { success: true, practiceMode: true };
        
        const userData = await this.getUserData();
        const userWordsMap = userData.words || {};
        
        if (userWordsMap[kanji]) {
            const wordData = userWordsMap[kanji];
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
            
            await this.setUserData({ words: userWordsMap, stats: userData.stats || {} });
            return { success: true, practiceMode: false };
        }
        
        return { success: false, error: 'Word not found' };
    }

    async updateStats() {
        const userData = await this.getUserData();
        const userWordsArray = Object.values(userData.words || {});
        
        const stats = {};
        
        for (const stage of this.STAGE_ORDER) {
            stats[stage] = userWordsArray.filter(word => word.stage === stage).length;
        }
        
        const now = new Date();
        const reviewCount = userWordsArray.filter(word => 
            word.stage !== "Burned" && 
            word.next_review && 
            new Date(word.next_review) <= now
        ).length;
        
        stats.reviewCount = reviewCount;
        stats.totalWords = this.allWords.length;
        
        this.stats = stats;
        
        return stats;
    }

    async checkTranslation(kanji, userAnswer) {
        const words = this.getWords();
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
    }

    async switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        this.currentView = viewName;

        // Load view-specific content
        if (viewName === 'dashboard') {
            await this.renderDashboard();
        } else if (viewName === 'browse') {
            await this.renderBrowse();
        }
    }

    async renderDashboard() {
        await this.updateStats();
        
        // Update review count and button state
        const reviewCountEl = document.getElementById('review-count');
        const totalWordsEl = document.getElementById('total-words');
        
        if (reviewCountEl) {
            reviewCountEl.textContent = this.stats.reviewCount;
        }
        
        if (totalWordsEl) {
            totalWordsEl.textContent = this.stats.totalWords;
        }
        
        const startReviewBtn = document.getElementById('start-review');
        if (startReviewBtn) {
            if (this.stats.reviewCount > 0) {
                startReviewBtn.disabled = false;
                startReviewBtn.textContent = 'Start Reviewing';
            } else {
                startReviewBtn.disabled = true;
                startReviewBtn.textContent = 'No Reviews Available';
            }
            addDebug('9. Updated start review button');
        }

        // Update progress bars
        const totalWords = this.stats.totalWords || 1; // Prevent division by zero
        
        // Apprentice (combine all apprentice levels)
        const apprenticeCount = (this.stats["Apprentice 1"] || 0) + 
                               (this.stats["Apprentice 2"] || 0) + 
                               (this.stats["Apprentice 3"] || 0) + 
                               (this.stats["Apprentice 4"] || 0);
        const apprenticeEl = document.getElementById('apprentice-count');
        if (apprenticeEl) {
            apprenticeEl.textContent = apprenticeCount;
        }
        const apprenticeProgressEl = document.getElementById('apprentice-progress');
        if (apprenticeProgressEl) {
            apprenticeProgressEl.style.width = `${(apprenticeCount / totalWords) * 100}%`;
        }

        // Guru (combine both guru levels)
        const guruCount = (this.stats["Guru 1"] || 0) + (this.stats["Guru 2"] || 0);
        const guruEl = document.getElementById('guru-count');
        if (guruEl) {
            guruEl.textContent = guruCount;
        }
        const guruProgressEl = document.getElementById('guru-progress');
        if (guruProgressEl) {
            guruProgressEl.style.width = `${(guruCount / totalWords) * 100}%`;
        }

        // Master
        const masterCount = this.stats["Master"] || 0;
        const masterEl = document.getElementById('master-count');
        if (masterEl) {
            masterEl.textContent = masterCount;
        }
        const masterProgressEl = document.getElementById('master-progress');
        if (masterProgressEl) {
            masterProgressEl.style.width = `${(masterCount / totalWords) * 100}%`;
        }

        // Enlightened
        const enlightenedCount = this.stats["Enlightened"] || 0;
        const enlightenedEl = document.getElementById('enlightened-count');
        if (enlightenedEl) {
            enlightenedEl.textContent = enlightenedCount;
        }
        const enlightenedProgressEl = document.getElementById('enlightened-progress');
        if (enlightenedProgressEl) {
            enlightenedProgressEl.style.width = `${(enlightenedCount / totalWords) * 100}%`;
        }

        // Burned
        const burnedCount = this.stats["Burned"] || 0;
        const burnedEl = document.getElementById('burned-count');
        if (burnedEl) {
            burnedEl.textContent = burnedCount;
        }
        const burnedProgressEl = document.getElementById('burned-progress');
        if (burnedProgressEl) {
            burnedProgressEl.style.width = `${(burnedCount / totalWords) * 100}%`;
        }
        
        addDebug('10. Completed renderDashboard');
    }

    async startReview() {
        try {
            this.reviewWords = await this.getReviewWords();
            
            if (this.reviewWords.length === 0) {
                return;
            }

            this.currentReviewIndex = 0;
            await this.switchView('review');
            await this.showCurrentReviewWord();
        } catch (error) {
            console.error('Error starting review:', error);
        }
    }

    async showCurrentReviewWord() {
        if (this.currentReviewIndex >= this.reviewWords.length) {
            this.completeReview();
            return;
        }

        const word = this.reviewWords[this.currentReviewIndex];
        this.isAnswerVisible = false;

        // Update progress
        document.getElementById('review-progress').textContent = 
            `${this.currentReviewIndex + 1} / ${this.reviewWords.length}`;

        // Show word
        document.getElementById('current-kanji').textContent = word.kanji;
        document.getElementById('current-furigana').textContent = word.furigana;
        
        // Show current stage with emoji
        const userData = await this.getUserData();
        const wordProgress = userData.words[word.kanji];
        const currentStage = wordProgress ? wordProgress.stage : 'Apprentice 1';
        document.getElementById('current-stage').textContent = this.getStageDisplayText(currentStage);
        
        // Handle multiple translations with descriptions
        const translationElement = document.getElementById('current-translation');
        if (word.translations && word.translations.length > 0) {
            const translationOptions = word.translations.map(t => {
                if (typeof t === 'object' && t.text) {
                    return `
                        <span class="translation-option">
                            <span class="translation-text">${t.text}</span>
                            ${t.description ? `<span class="translation-description">(${t.description})</span>` : ''}
                        </span>
                    `;
                } else {
                    return `<span class="translation-option"><span class="translation-text">${t}</span></span>`;
                }
            }).join('');
            
            translationElement.innerHTML = `
                <div class="translation-options">
                    ${translationOptions}
                </div>
            `;
        } else {
            translationElement.textContent = word.translation;
        }

        // Hide answer elements
        document.getElementById('current-furigana').style.display = 'none';
        document.getElementById('current-translation').style.display = 'none';
        document.getElementById('review-actions').style.display = 'none';
        document.getElementById('validation-result').style.display = 'none';
        
        // Show answer input and fallback button
        document.getElementById('answer-input-container').style.display = 'flex';
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
        
        // Show a "Show Answer" button as fallback
        document.getElementById('show-answer').style.display = 'block';
    }

    showAnswer() {
        this.isAnswerVisible = true;
        
        // Show answer elements
        document.getElementById('current-furigana').style.display = 'block';
        document.getElementById('current-translation').style.display = 'block';
        document.getElementById('review-actions').style.display = 'flex';
        
        // Hide show answer button and input
        document.getElementById('show-answer').style.display = 'none';
        document.getElementById('answer-input-container').style.display = 'none';
    }

    async validateAnswer() {
        const input = document.getElementById('answer-input');
        const userAnswer = input.value.trim();
        
        if (!userAnswer) return;
        
        try {
            const word = this.reviewWords[this.currentReviewIndex];
            const result = await this.checkTranslation(word.kanji, userAnswer);
            
            this.displayValidationResult(result, userAnswer);
            
            // Hide input container
            document.getElementById('answer-input-container').style.display = 'none';
            
            // Show furigana and translation
            document.getElementById('current-furigana').style.display = 'block';
            document.getElementById('current-translation').style.display = 'block';
            
            // Show review actions for final decision
            document.getElementById('review-actions').style.display = 'flex';
            
            this.isAnswerVisible = true;
            
        } catch (error) {
            console.error('Error validating answer:', error);
        }
    }

    displayValidationResult(result, userAnswer) {
        const validationResult = document.getElementById('validation-result');
        const validationMessage = document.getElementById('validation-message');
        const correctAnswers = document.getElementById('correct-answers');
        
        validationResult.style.display = 'block';
        validationResult.className = 'validation-result ' + (result.valid ? 'correct' : 'incorrect');
        
        if (result.valid) {
            validationMessage.textContent = `✓ Correct! "${userAnswer}" is accepted.`;
            if (result.matches.length > 0) {
                correctAnswers.innerHTML = `<strong>Your answer matches:</strong> ${result.matches.join(', ')}`;
            }
        } else {
            validationMessage.textContent = `✗ Not quite right. "${userAnswer}" is not accepted.`;
            correctAnswers.innerHTML = `<strong>Correct answers:</strong> ${result.allTranslations.join(', ')}`;
        }
    }

    async submitAnswer(correct) {
        try {
            const word = this.reviewWords[this.currentReviewIndex];
            await this.updateWord(word.kanji, correct, false); // false = not debug mode
            
            this.currentReviewIndex++;
            
            // Small delay for UX
            setTimeout(async () => {
                await this.showCurrentReviewWord();
            }, 300);
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    }

    completeReview() {
        // Show completion message
        document.getElementById('review-card').style.display = 'none';
        document.getElementById('no-reviews').style.display = 'block';
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(async () => {
            document.getElementById('review-card').style.display = 'flex';
            document.getElementById('no-reviews').style.display = 'none';
            await this.switchView('dashboard');
        }, 3000);
    }

    async startPracticeSession() {
        try {
            const count = parseInt(document.getElementById('practice-count').value);
            this.practiceWords = await this.getPracticeWords(count);
            this.currentPracticeIndex = 0;
            this.isPracticeMode = true;
            
            document.getElementById('practice-card').style.display = 'flex';
            document.getElementById('practice-complete').style.display = 'none';
            await this.showCurrentPracticeWord();
        } catch (error) {
            console.error('Error starting practice session:', error);
        }
    }

    async getPracticeWords(count = 10) {
        const words = this.getWords();
        // Shuffle and return a subset for practice mode
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
    }

    async showCurrentPracticeWord() {
        if (this.currentPracticeIndex >= this.practiceWords.length) {
            this.completePracticeSession();
            return;
        }

        const word = this.practiceWords[this.currentPracticeIndex];
        this.isAnswerVisible = false;

        // Update progress
        document.getElementById('practice-progress').textContent = 
            `${this.currentPracticeIndex + 1} / ${this.practiceWords.length}`;

        // Show word
        document.getElementById('practice-kanji').textContent = word.kanji;
        document.getElementById('practice-furigana').textContent = word.furigana;
        
        // Show current stage with emoji
        const userData = await this.getUserData();
        const wordProgress = userData.words[word.kanji];
        const currentStage = wordProgress ? wordProgress.stage : 'Apprentice 1';
        document.getElementById('practice-stage').textContent = this.getStageDisplayText(currentStage);
        
        // Handle multiple translations with descriptions
        const translationElement = document.getElementById('practice-translation');
        if (word.translations && word.translations.length > 0) {
            const translationOptions = word.translations.map(t => {
                if (typeof t === 'object' && t.text) {
                    return `
                        <span class="translation-option">
                            <span class="translation-text">${t.text}</span>
                            ${t.description ? `<span class="translation-description">(${t.description})</span>` : ''}
                        </span>
                    `;
                } else {
                    return `<span class="translation-option"><span class="translation-text">${t}</span></span>`;
                }
            }).join('');
            
            translationElement.innerHTML = `
                <div class="translation-options">
                    ${translationOptions}
                </div>
            `;
        } else {
            translationElement.textContent = word.translation;
        }

        // Hide answer elements
        document.getElementById('practice-furigana').style.display = 'none';
        document.getElementById('practice-translation').style.display = 'none';
        document.getElementById('practice-actions').style.display = 'none';
        document.getElementById('practice-validation-result').style.display = 'none';
        
        // Show answer input and fallback button
        document.getElementById('practice-answer-input-container').style.display = 'flex';
        document.getElementById('practice-answer-input').value = '';
        document.getElementById('practice-answer-input').focus();
        
        // Show a "Show Answer" button as fallback
        document.getElementById('practice-show-answer').style.display = 'block';
    }

    showPracticeAnswer() {
        this.isAnswerVisible = true;
        
        // Show answer elements
        document.getElementById('practice-furigana').style.display = 'block';
        document.getElementById('practice-translation').style.display = 'block';
        document.getElementById('practice-actions').style.display = 'flex';
        
        // Hide show answer button and input
        document.getElementById('practice-show-answer').style.display = 'none';
        document.getElementById('practice-answer-input-container').style.display = 'none';
    }

    async validatePracticeAnswer() {
        const input = document.getElementById('practice-answer-input');
        const userAnswer = input.value.trim();
        
        if (!userAnswer) return;
        
        try {
            const word = this.practiceWords[this.currentPracticeIndex];
            const result = await this.checkTranslation(word.kanji, userAnswer);
            
            this.displayPracticeValidationResult(result, userAnswer);
            
            // Hide input container
            document.getElementById('practice-answer-input-container').style.display = 'none';
            
            // Show furigana and translation
            document.getElementById('practice-furigana').style.display = 'block';
            document.getElementById('practice-translation').style.display = 'block';
            
            // Show review actions for final decision
            document.getElementById('practice-actions').style.display = 'flex';
            
            this.isAnswerVisible = true;
            
        } catch (error) {
            console.error('Error validating practice answer:', error);
        }
    }

    displayPracticeValidationResult(result, userAnswer) {
        const validationResult = document.getElementById('practice-validation-result');
        const validationMessage = document.getElementById('practice-validation-message');
        const correctAnswers = document.getElementById('practice-correct-answers');
        
        validationResult.style.display = 'block';
        validationResult.className = 'validation-result ' + (result.valid ? 'correct' : 'incorrect');
        
        if (result.valid) {
            validationMessage.textContent = `✓ Correct! "${userAnswer}" is accepted.`;
            if (result.matches.length > 0) {
                correctAnswers.innerHTML = `<strong>Your answer matches:</strong> ${result.matches.join(', ')}`;
            }
        } else {
            validationMessage.textContent = `✗ Not quite right. "${userAnswer}" is not accepted.`;
            correctAnswers.innerHTML = `<strong>Correct answers:</strong> ${result.allTranslations.join(', ')}`;
        }
    }

    async submitPracticeAnswer(correct) {
        try {
            const word = this.practiceWords[this.currentPracticeIndex];
            // Call with practice mode = true, so SRS progress is not affected
            await this.updateWord(word.kanji, correct, true);
            
            this.currentPracticeIndex++;
            
            // Small delay for UX
            setTimeout(async () => {
                await this.showCurrentPracticeWord();
            }, 300);
        } catch (error) {
            console.error('Error submitting practice answer:', error);
        }
    }

    completePracticeSession() {
        // Show completion message
        document.getElementById('practice-card').style.display = 'none';
        document.getElementById('practice-complete').style.display = 'block';
        this.isPracticeMode = false;
        
        // Auto-hide completion message after 3 seconds
        setTimeout(() => {
            document.getElementById('debug-complete').style.display = 'none';
        }, 3000);
    }

    async renderBrowse() {
        const wordGrid = document.getElementById('word-grid');
        if (!wordGrid) {
            console.error('word-grid element not found');
            return;
        }
        
        const userData = await this.getUserData();
        const userProgressMap = new Map(Object.entries(userData.words || {}));

        wordGrid.innerHTML = this.allWords.map(word => {
            const userProgress = userProgressMap.get(word.kanji);
            const stage = userProgress ? userProgress.stage : 'New';
            const stageClass = stage.toLowerCase().replace(' ', '-');
            const stageDisplay = stage === 'New' ? '⭐ New' : this.getStageDisplayText(stage);
            
            // Format translations
            const formattedTranslations = word.translations.map(t => {
                if (typeof t === 'object' && t.text) {
                    return t.description ? `${t.text} (${t.description})` : t.text;
                }
                return t;
            });
            
            return `
                <div class="word-card">
                    <div class="word-info">
                        <div class="word-kanji">${word.kanji}</div>
                        <div class="word-furigana">${word.furigana}</div>
                        <div class="word-translation">${formattedTranslations.join(', ')}</div>
                    </div>
                    <div class="word-stage ${stageClass}">${stageDisplay}</div>
                </div>
            `;
        }).join('');
    }

    filterWords(searchTerm) {
        const wordCards = document.querySelectorAll('.word-card');
        const term = searchTerm.toLowerCase();

        wordCards.forEach(card => {
            const kanji = card.querySelector('.word-kanji').textContent.toLowerCase();
            const furigana = card.querySelector('.word-furigana').textContent.toLowerCase();
            const translation = card.querySelector('.word-translation').textContent.toLowerCase();

            const matches = kanji.includes(term) || furigana.includes(term) || translation.includes(term);
            card.style.display = matches ? 'block' : 'none';
        });
    }
    
    // Helper method to get stage display text with emoji
    getStageDisplayText(stage) {
        const emoji = this.STAGE_EMOJIS[stage] || "";
        return `${emoji} ${stage}`;
    }
    
    // Helper method to get just the emoji for a stage
    getStageEmoji(stage) {
        return this.STAGE_EMOJIS[stage] || "";
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WebJapaneseSRSApp();
});
