// Electron-compatible Japanese SRS App
class ElectronJapaneseSRSApp {
    constructor() {
        this.currentView = 'dashboard';
        this.reviewWords = [];
        this.currentReviewIndex = 0;
        this.allWords = [];
        this.userData = { words: {}, stats: {} };
        this.isAnswerVisible = false;
        
        // Practice mode properties
        this.practiceWords = [];
        this.currentPracticeIndex = 0;
        this.isPracticeMode = false;
        
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
        console.log('Initializing Electron Japanese SRS App...');
        
        try {
            this.setupEventListeners();
            await this.loadInitialData();
            await this.renderDashboard();
            console.log('App initialized successfully');
            
            // Set up Electron-specific menu handlers
            this.setupElectronMenuHandlers();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showNotification('Failed to initialize app', 'error');
        }
    }

    setupElectronMenuHandlers() {
        if (window.electronAPI) {
            // Handle menu-triggered actions
            window.electronAPI.onStartReview(() => {
                this.startReview();
            });
            
            window.electronAPI.onStartPractice(() => {
                this.startPracticeSession();
            });
            
            window.electronAPI.onShowDictionary(() => {
                this.switchView('browse');
            });
            
            window.electronAPI.onResetProgress(async () => {
                this.userData = { words: {}, stats: {} };
                await this.saveUserData();
                await this.renderDashboard();
                this.showNotification('Progress reset successfully', 'success');
            });
        }
    }

    async loadInitialData() {
        console.log('Loading initial data...');
        
        try {
            // Load vocabulary data using Electron API
            if (window.electronAPI) {
                this.allWords = await window.electronAPI.getVocabularyData();
                this.userData = await window.electronAPI.getUserData();
            } else {
                // Fallback for web environment
                this.allWords = VOCABULARY_DATA || [];
                this.userData = this.createDefaultUserData();
            }
            
            console.log(`Loaded ${this.allWords.length} vocabulary words`);
            console.log('User data loaded:', this.userData);
            
            // Initialize user data for new words
            this.initializeUserData();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.allWords = [];
            this.userData = this.createDefaultUserData();
        }
    }

    createDefaultUserData() {
        return {
            words: {},
            stats: {
                totalReviews: 0,
                correctAnswers: 0,
                streakDays: 0,
                lastReviewDate: null
            }
        };
    }

    initializeUserData() {
        // Ensure user data structure exists
        if (!this.userData.words) this.userData.words = {};
        if (!this.userData.stats) this.userData.stats = {
            totalReviews: 0,
            correctAnswers: 0,
            streakDays: 0,
            lastReviewDate: null
        };

        // Initialize new words
        this.allWords.forEach(word => {
            if (!this.userData.words[word.kanji]) {
                this.userData.words[word.kanji] = {
                    stage: "Apprentice 1",
                    nextReview: new Date().getTime(),
                    correctCount: 0,
                    incorrectCount: 0,
                    lastReviewed: null,
                    createdAt: new Date().getTime()
                };
            }
        });
    }

    async saveUserData() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.saveUserData(this.userData);
                if (!result.success) {
                    console.error('Failed to save user data:', result.error);
                }
            } else {
                // Fallback for web environment
                localStorage.setItem('japanese-srs-userdata', JSON.stringify(this.userData));
            }
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const view = e.target.dataset.view;
                await this.switchView(view);
            });
        });

        // Dashboard buttons
        document.getElementById('start-review').addEventListener('click', () => {
            this.startReview();
        });

        // Review buttons
        document.getElementById('back-to-dashboard').addEventListener('click', async () => {
            await this.switchView('dashboard');
        });

        document.querySelector('.show-answer-btn').addEventListener('click', () => {
            this.showAnswer();
        });

        document.getElementById('correct-btn').addEventListener('click', () => {
            this.submitAnswer(true);
        });

        document.getElementById('incorrect-btn').addEventListener('click', () => {
            this.submitAnswer(false);
        });

        // Practice mode buttons
        document.getElementById('practice-back-to-dashboard').addEventListener('click', async () => {
            await this.switchView('dashboard');
        });

        document.getElementById('start-practice').addEventListener('click', () => {
            this.startPracticeSession();
        });

        document.querySelector('#practice-show-answer .show-answer-btn').addEventListener('click', () => {
            this.showPracticeAnswer();
        });

        document.getElementById('practice-correct-btn').addEventListener('click', () => {
            this.submitPracticeAnswer(true);
        });

        document.getElementById('practice-incorrect-btn').addEventListener('click', () => {
            this.submitPracticeAnswer(false);
        });

        // Browse search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterWords(e.target.value);
        });

        // Answer input event handlers
        document.getElementById('answer-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.validateAnswer();
            }
        });

        document.getElementById('practice-answer-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.validatePracticeAnswer();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', async (e) => {
            // Only handle shortcuts if not typing in an input field
            const isTyping = e.target.tagName === 'INPUT';
            
            if (this.currentView === 'review' && !isTyping) {
                switch(e.key) {
                    case ' ':
                        e.preventDefault();
                        if (!this.isAnswerVisible) {
                            document.getElementById('answer-input').focus();
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
                        if (!this.isAnswerVisible) {
                            document.getElementById('practice-answer-input').focus();
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
    }

    async switchView(view) {
        console.log(`Switching to view: ${view}`);
        
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Show target view
        document.getElementById(`${view}-view`).classList.add('active');
        
        // Update current view
        this.currentView = view;
        
        // Load view-specific content
        switch(view) {
            case 'dashboard':
                await this.renderDashboard();
                break;
            case 'review':
                this.loadReviewData();
                break;
            case 'practice':
                this.loadPracticeData();
                break;
            case 'browse':
                await this.renderBrowse();
                break;
        }
    }

    async renderDashboard() {
        console.log('Rendering dashboard...');
        
        try {
            const stats = this.calculateStats();
            console.log('Dashboard stats:', stats);
            
            // Update statistics
            document.getElementById('total-words').textContent = stats.totalWords;
            document.getElementById('words-due').textContent = stats.wordsDue;
            document.getElementById('words-today').textContent = stats.reviewsToday;
            document.getElementById('accuracy').textContent = `${stats.accuracy}%`;

            // Update stage breakdown
            this.renderStageBreakdown(stats.stageBreakdown);
            
        } catch (error) {
            console.error('Error rendering dashboard:', error);
        }
    }

    calculateStats() {
        const now = new Date().getTime();
        const today = new Date().toDateString();
        
        const stats = {
            totalWords: this.allWords.length,
            wordsDue: 0,
            reviewsToday: 0,
            accuracy: 0,
            stageBreakdown: {}
        };

        // Initialize stage breakdown
        this.STAGE_ORDER.forEach(stage => {
            stats.stageBreakdown[stage] = 0;
        });

        // Count words in each stage and due for review
        this.allWords.forEach(word => {
            const wordData = this.userData.words[word.kanji];
            if (wordData) {
                const stage = wordData.stage;
                stats.stageBreakdown[stage]++;
                
                // Check if due for review
                if (wordData.nextReview <= now) {
                    stats.wordsDue++;
                }
                
                // Check if reviewed today
                if (wordData.lastReviewed) {
                    const reviewDate = new Date(wordData.lastReviewed).toDateString();
                    if (reviewDate === today) {
                        stats.reviewsToday++;
                    }
                }
            }
        });

        // Calculate accuracy
        const totalReviews = this.userData.stats.totalReviews || 0;
        const correctReviews = this.userData.stats.correctAnswers || 0;
        if (totalReviews > 0) {
            stats.accuracy = Math.round((correctReviews / totalReviews) * 100);
        }

        return stats;
    }

    renderStageBreakdown(stageBreakdown) {
        const container = document.getElementById('stage-breakdown');
        if (!container) {
            console.error('Stage breakdown container not found');
            return;
        }
        
        container.innerHTML = '';
        
        this.STAGE_ORDER.forEach(stage => {
            const count = stageBreakdown[stage] || 0;
            const emoji = this.STAGE_EMOJIS[stage];
            
            const item = document.createElement('div');
            item.className = 'stage-item';
            item.innerHTML = `
                <span class="stage-emoji">${emoji}</span>
                <span class="stage-name">${stage}</span>
                <span class="stage-count">${count}</span>
            `;
            container.appendChild(item);
        });
    }

    getWordsForReview() {
        const now = new Date().getTime();
        return this.allWords.filter(word => {
            const wordData = this.userData.words[word.kanji];
            return wordData && wordData.nextReview <= now;
        });
    }

    startReview() {
        console.log('Starting review session...');
        
        this.reviewWords = this.getWordsForReview();
        console.log(`Found ${this.reviewWords.length} words for review`);
        
        if (this.reviewWords.length === 0) {
            this.showNotification('No words due for review!', 'info');
            return;
        }
        
        // Shuffle the review words
        this.reviewWords = this.shuffleArray(this.reviewWords);
        this.currentReviewIndex = 0;
        this.switchView('review');
    }

    startPracticeSession() {
        console.log('Starting practice session...');
        
        // For practice, use all words or a random subset
        this.practiceWords = this.shuffleArray([...this.allWords]).slice(0, 20);
        this.currentPracticeIndex = 0;
        this.isPracticeMode = true;
        this.switchView('practice');
    }

    loadReviewData() {
        if (this.reviewWords.length === 0) {
            this.switchView('dashboard');
            return;
        }
        
        const currentWord = this.reviewWords[this.currentReviewIndex];
        const progress = `${this.currentReviewIndex + 1} / ${this.reviewWords.length}`;
        
        document.getElementById('review-progress').textContent = progress;
        document.getElementById('review-kanji').textContent = currentWord.kanji;
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
        
        // Hide answer elements
        document.getElementById('show-answer').style.display = 'block';
        document.getElementById('answer-section').style.display = 'none';
        this.isAnswerVisible = false;
    }

    loadPracticeData() {
        if (this.practiceWords.length === 0) {
            this.switchView('dashboard');
            return;
        }
        
        const currentWord = this.practiceWords[this.currentPracticeIndex];
        const progress = `${this.currentPracticeIndex + 1} / ${this.practiceWords.length}`;
        
        document.getElementById('practice-progress').textContent = progress;
        document.getElementById('practice-kanji').textContent = currentWord.kanji;
        document.getElementById('practice-answer-input').value = '';
        document.getElementById('practice-answer-input').focus();
        
        // Hide answer elements
        document.getElementById('practice-show-answer').style.display = 'block';
        document.getElementById('practice-answer-section').style.display = 'none';
        this.isAnswerVisible = false;
    }

    validateAnswer() {
        const userAnswer = document.getElementById('answer-input').value.trim();
        if (userAnswer) {
            this.showAnswer();
        }
    }

    validatePracticeAnswer() {
        const userAnswer = document.getElementById('practice-answer-input').value.trim();
        if (userAnswer) {
            this.showPracticeAnswer();
        }
    }

    showAnswer() {
        const currentWord = this.reviewWords[this.currentReviewIndex];
        const userAnswer = document.getElementById('answer-input').value.trim();
        
        document.getElementById('correct-answer').textContent = currentWord.english;
        document.getElementById('user-answer').textContent = userAnswer || '(no answer)';
        
        // Check if answer is correct
        const isCorrect = this.isAnswerCorrect(userAnswer, currentWord.english);
        document.getElementById('user-answer').className = isCorrect ? 'correct' : 'incorrect';
        
        document.getElementById('show-answer').style.display = 'none';
        document.getElementById('answer-section').style.display = 'block';
        this.isAnswerVisible = true;
    }

    showPracticeAnswer() {
        const currentWord = this.practiceWords[this.currentPracticeIndex];
        const userAnswer = document.getElementById('practice-answer-input').value.trim();
        
        document.getElementById('practice-correct-answer').textContent = currentWord.english;
        document.getElementById('practice-user-answer').textContent = userAnswer || '(no answer)';
        
        // Check if answer is correct
        const isCorrect = this.isAnswerCorrect(userAnswer, currentWord.english);
        document.getElementById('practice-user-answer').className = isCorrect ? 'correct' : 'incorrect';
        
        document.getElementById('practice-show-answer').style.display = 'none';
        document.getElementById('practice-answer-section').style.display = 'block';
        this.isAnswerVisible = true;
    }

    isAnswerCorrect(userAnswer, correctAnswer) {
        if (!userAnswer || !correctAnswer) return false;
        
        const normalize = (str) => str.toLowerCase().trim();
        const normalizedUser = normalize(userAnswer);
        const normalizedCorrect = normalize(correctAnswer);
        
        // Check for exact match or if it's in comma-separated alternatives
        const alternatives = normalizedCorrect.split(',').map(alt => alt.trim());
        return alternatives.some(alt => alt === normalizedUser);
    }

    async submitAnswer(isCorrect) {
        const currentWord = this.reviewWords[this.currentReviewIndex];
        await this.updateWordProgress(currentWord.kanji, isCorrect);
        
        this.currentReviewIndex++;
        
        if (this.currentReviewIndex >= this.reviewWords.length) {
            // Review session complete
            this.showNotification('Review session completed!', 'success');
            await this.switchView('dashboard');
        } else {
            this.loadReviewData();
        }
    }

    async submitPracticeAnswer(isCorrect) {
        // In practice mode, we don't update progress
        this.currentPracticeIndex++;
        
        if (this.currentPracticeIndex >= this.practiceWords.length) {
            // Practice session complete
            this.showNotification('Practice session completed!', 'success');
            await this.switchView('dashboard');
        } else {
            this.loadPracticeData();
        }
    }

    async updateWordProgress(kanji, isCorrect) {
        const wordData = this.userData.words[kanji];
        if (!wordData) return;
        
        const now = new Date().getTime();
        wordData.lastReviewed = now;
        
        // Update stats
        this.userData.stats.totalReviews = (this.userData.stats.totalReviews || 0) + 1;
        if (isCorrect) {
            this.userData.stats.correctAnswers = (this.userData.stats.correctAnswers || 0) + 1;
            wordData.correctCount++;
        } else {
            wordData.incorrectCount++;
        }
        
        // Update SRS stage
        if (isCorrect) {
            this.promoteWord(wordData);
        } else {
            this.demoteWord(wordData);
        }
        
        // Calculate next review time
        this.calculateNextReview(wordData);
        
        // Save data
        await this.saveUserData();
    }

    promoteWord(wordData) {
        const currentIndex = this.STAGE_ORDER.indexOf(wordData.stage);
        if (currentIndex < this.STAGE_ORDER.length - 1) {
            wordData.stage = this.STAGE_ORDER[currentIndex + 1];
        }
    }

    demoteWord(wordData) {
        const currentIndex = this.STAGE_ORDER.indexOf(wordData.stage);
        if (currentIndex > 0) {
            wordData.stage = this.STAGE_ORDER[Math.max(0, currentIndex - 2)];
        }
    }

    calculateNextReview(wordData) {
        const now = new Date().getTime();
        const interval = this.STAGES[wordData.stage];
        
        if (interval === null) {
            // Burned items don't come up for review
            wordData.nextReview = null;
        } else {
            wordData.nextReview = now + interval;
        }
    }

    async renderBrowse() {
        console.log('Rendering browse view...');
        
        try {
            const container = document.getElementById('word-list');
            if (!container) {
                console.error('Word list container not found');
                return;
            }
            
            container.innerHTML = '';
            
            this.allWords.forEach(word => {
                const wordData = this.userData.words[word.kanji];
                const stage = wordData ? wordData.stage : 'Apprentice 1';
                const emoji = this.STAGE_EMOJIS[stage];
                
                const item = document.createElement('div');
                item.className = 'word-item';
                item.innerHTML = `
                    <div class="word-kanji">${word.kanji}</div>
                    <div class="word-reading">${word.hiragana}</div>
                    <div class="word-english">${word.english}</div>
                    <div class="word-stage">
                        <span class="stage-emoji">${emoji}</span>
                        ${stage}
                    </div>
                `;
                container.appendChild(item);
            });
            
            console.log(`Rendered ${this.allWords.length} words in browse view`);
            
        } catch (error) {
            console.error('Error rendering browse view:', error);
        }
    }

    filterWords(searchTerm) {
        const items = document.querySelectorAll('.word-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const kanji = item.querySelector('.word-kanji').textContent.toLowerCase();
            const reading = item.querySelector('.word-reading').textContent.toLowerCase();
            const english = item.querySelector('.word-english').textContent.toLowerCase();
            
            const matches = kanji.includes(term) || 
                           reading.includes(term) || 
                           english.includes(term);
            
            item.style.display = matches ? 'block' : 'none';
        });
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    showNotification(message, type = 'info') {
        console.log(`Notification (${type}): ${message}`);
        
        // Use Electron notification if available
        if (window.electronAPI) {
            window.electronAPI.showNotification('Japanese SRS', message);
        }
        
        // Also show in-app notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Electron Japanese SRS App...');
    window.app = new ElectronJapaneseSRSApp();
});

// Handle Electron specific events
if (window.electronAPI) {
    console.log('Electron API detected, running in Electron environment');
    console.log('Platform:', window.electronAPI.platform);
    console.log('Versions:', window.electronAPI.versions);
}
