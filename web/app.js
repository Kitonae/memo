class WebJapaneseSRSApp {
    constructor() {
        this.currentView = 'dashboard';
        this.reviewWords = [];
        this.currentReviewIndex = 0;
        this.allWords = [];
        this.stats = {};
        this.isAnswerVisible = false;
        
        // Debug mode properties
        this.debugWords = [];
        this.currentDebugIndex = 0;
        this.isDebugMode = false;
        
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
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.renderDashboard();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Dashboard buttons
        document.getElementById('start-review').addEventListener('click', () => {
            this.startReview();
        });

        // Review buttons
        document.getElementById('back-to-dashboard').addEventListener('click', () => {
            this.switchView('dashboard');
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

        // Debug mode buttons
        document.getElementById('debug-back-to-dashboard').addEventListener('click', () => {
            this.switchView('dashboard');
        });

        document.getElementById('start-debug').addEventListener('click', () => {
            this.startDebugSession();
        });

        document.querySelector('#debug-show-answer .show-answer-btn').addEventListener('click', () => {
            this.showDebugAnswer();
        });

        document.getElementById('debug-correct-btn').addEventListener('click', () => {
            this.submitDebugAnswer(true);
        });

        document.getElementById('debug-incorrect-btn').addEventListener('click', () => {
            this.submitDebugAnswer(false);
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

        document.getElementById('debug-answer-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.validateDebugAnswer();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
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
                        this.switchView('dashboard');
                        break;
                }
            } else if (this.currentView === 'debug' && !isTyping) {
                switch(e.key) {
                    case ' ':
                        e.preventDefault();
                        if (!this.isAnswerVisible) {
                            document.getElementById('debug-answer-input').focus();
                        }
                        break;
                    case '1':
                        if (this.isAnswerVisible) {
                            this.submitDebugAnswer(false);
                        }
                        break;
                    case '2':
                        if (this.isAnswerVisible) {
                            this.submitDebugAnswer(true);
                        }
                        break;
                    case 'Escape':
                        this.switchView('dashboard');
                        break;
                }
            }
        });
    }

    // Local Storage methods (replacing Electron file operations)
    getUserData() {
        const data = localStorage.getItem('japanese-srs-userdata');
        return data ? JSON.parse(data) : [];
    }

    setUserData(data) {
        localStorage.setItem('japanese-srs-userdata', JSON.stringify(data));
    }

    getWords() {
        return VOCABULARY_DATA; // From data.js
    }

    async loadInitialData() {
        this.allWords = this.getWords();
        await this.updateStats();
    }

    async getReviewWords() {
        const words = this.getWords();
        const userData = this.getUserData();
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

        this.setUserData(userData);

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

    async updateWord(kanji, correct, debugMode = false) {
        if (debugMode) return { success: true, debugMode: true };
        
        const userData = this.getUserData();
        
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
                
                this.setUserData(userData);
                return { success: true, debugMode: false };
            }
        }
    }

    async updateStats() {
        const userData = this.getUserData();
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

    switchView(viewName) {
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
            this.renderDashboard();
        } else if (viewName === 'browse') {
            this.renderBrowse();
        }
    }

    async renderDashboard() {
        await this.updateStats();
        
        // Update review count and button state
        document.getElementById('review-count').textContent = this.stats.reviewCount;
        document.getElementById('total-words').textContent = this.stats.totalWords;
        
        const startReviewBtn = document.getElementById('start-review');
        if (this.stats.reviewCount > 0) {
            startReviewBtn.disabled = false;
            startReviewBtn.textContent = 'Start Reviewing';
        } else {
            startReviewBtn.disabled = true;
            startReviewBtn.textContent = 'No Reviews Available';
        }

        // Update progress bars
        const totalWords = this.stats.totalWords || 1; // Prevent division by zero
        
        // Apprentice (combine all apprentice levels)
        const apprenticeCount = (this.stats["Apprentice 1"] || 0) + 
                               (this.stats["Apprentice 2"] || 0) + 
                               (this.stats["Apprentice 3"] || 0) + 
                               (this.stats["Apprentice 4"] || 0);
        document.getElementById('apprentice-count').textContent = apprenticeCount;
        document.getElementById('apprentice-progress').style.width = `${(apprenticeCount / totalWords) * 100}%`;

        // Guru (combine both guru levels)
        const guruCount = (this.stats["Guru 1"] || 0) + (this.stats["Guru 2"] || 0);
        document.getElementById('guru-count').textContent = guruCount;
        document.getElementById('guru-progress').style.width = `${(guruCount / totalWords) * 100}%`;

        // Master
        const masterCount = this.stats["Master"] || 0;
        document.getElementById('master-count').textContent = masterCount;
        document.getElementById('master-progress').style.width = `${(masterCount / totalWords) * 100}%`;

        // Enlightened
        const enlightenedCount = this.stats["Enlightened"] || 0;
        document.getElementById('enlightened-count').textContent = enlightenedCount;
        document.getElementById('enlightened-progress').style.width = `${(enlightenedCount / totalWords) * 100}%`;

        // Burned
        const burnedCount = this.stats["Burned"] || 0;
        document.getElementById('burned-count').textContent = burnedCount;
        document.getElementById('burned-progress').style.width = `${(burnedCount / totalWords) * 100}%`;
    }

    async startReview() {
        try {
            this.reviewWords = await this.getReviewWords();
            
            if (this.reviewWords.length === 0) {
                return;
            }

            this.currentReviewIndex = 0;
            this.switchView('review');
            this.showCurrentReviewWord();
        } catch (error) {
            console.error('Error starting review:', error);
        }
    }

    showCurrentReviewWord() {
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
            setTimeout(() => {
                this.showCurrentReviewWord();
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
        setTimeout(() => {
            document.getElementById('review-card').style.display = 'flex';
            document.getElementById('no-reviews').style.display = 'none';
            this.switchView('dashboard');
        }, 3000);
    }

    async startDebugSession() {
        try {
            const count = parseInt(document.getElementById('debug-count').value);
            this.debugWords = await this.getDebugWords(count);
            this.currentDebugIndex = 0;
            this.isDebugMode = true;
            
            document.getElementById('debug-card').style.display = 'flex';
            document.getElementById('debug-complete').style.display = 'none';
            this.showCurrentDebugWord();
        } catch (error) {
            console.error('Error starting debug session:', error);
        }
    }

    async getDebugWords(count = 10) {
        const words = this.getWords();
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
    }

    showCurrentDebugWord() {
        if (this.currentDebugIndex >= this.debugWords.length) {
            this.completeDebugSession();
            return;
        }

        const word = this.debugWords[this.currentDebugIndex];
        this.isAnswerVisible = false;

        // Update progress
        document.getElementById('debug-progress').textContent = 
            `${this.currentDebugIndex + 1} / ${this.debugWords.length}`;

        // Show word
        document.getElementById('debug-kanji').textContent = word.kanji;
        document.getElementById('debug-furigana').textContent = word.furigana;
        
        // Handle multiple translations with descriptions
        const translationElement = document.getElementById('debug-translation');
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
        document.getElementById('debug-furigana').style.display = 'none';
        document.getElementById('debug-translation').style.display = 'none';
        document.getElementById('debug-actions').style.display = 'none';
        document.getElementById('debug-validation-result').style.display = 'none';
        
        // Show answer input and fallback button
        document.getElementById('debug-answer-input-container').style.display = 'flex';
        document.getElementById('debug-answer-input').value = '';
        document.getElementById('debug-answer-input').focus();
        
        // Show a "Show Answer" button as fallback
        document.getElementById('debug-show-answer').style.display = 'block';
    }

    showDebugAnswer() {
        this.isAnswerVisible = true;
        
        // Show answer elements
        document.getElementById('debug-furigana').style.display = 'block';
        document.getElementById('debug-translation').style.display = 'block';
        document.getElementById('debug-actions').style.display = 'flex';
        
        // Hide show answer button and input
        document.getElementById('debug-show-answer').style.display = 'none';
        document.getElementById('debug-answer-input-container').style.display = 'none';
    }

    async validateDebugAnswer() {
        const input = document.getElementById('debug-answer-input');
        const userAnswer = input.value.trim();
        
        if (!userAnswer) return;
        
        try {
            const word = this.debugWords[this.currentDebugIndex];
            const result = await this.checkTranslation(word.kanji, userAnswer);
            
            this.displayDebugValidationResult(result, userAnswer);
            
            // Hide input container
            document.getElementById('debug-answer-input-container').style.display = 'none';
            
            // Show furigana and translation
            document.getElementById('debug-furigana').style.display = 'block';
            document.getElementById('debug-translation').style.display = 'block';
            
            // Show review actions for final decision
            document.getElementById('debug-actions').style.display = 'flex';
            
            this.isAnswerVisible = true;
            
        } catch (error) {
            console.error('Error validating debug answer:', error);
        }
    }

    displayDebugValidationResult(result, userAnswer) {
        const validationResult = document.getElementById('debug-validation-result');
        const validationMessage = document.getElementById('debug-validation-message');
        const correctAnswers = document.getElementById('debug-correct-answers');
        
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

    async submitDebugAnswer(correct) {
        try {
            const word = this.debugWords[this.currentDebugIndex];
            // Call with debug mode = true, so SRS progress is not affected
            await this.updateWord(word.kanji, correct, true);
            
            this.currentDebugIndex++;
            
            // Small delay for UX
            setTimeout(() => {
                this.showCurrentDebugWord();
            }, 300);
        } catch (error) {
            console.error('Error submitting debug answer:', error);
        }
    }

    completeDebugSession() {
        // Show completion message
        document.getElementById('debug-card').style.display = 'none';
        document.getElementById('debug-complete').style.display = 'block';
        this.isDebugMode = false;
        
        // Auto-hide completion message after 3 seconds
        setTimeout(() => {
            document.getElementById('debug-complete').style.display = 'none';
        }, 3000);
    }

    renderBrowse() {
        const wordGrid = document.getElementById('word-grid');
        const userData = this.getUserData();
        const userProgressMap = new Map(userData.map(word => [word.kanji, word]));

        wordGrid.innerHTML = this.allWords.map(word => {
            const userProgress = userProgressMap.get(word.kanji);
            const stage = userProgress ? userProgress.stage : 'New';
            const stageClass = stage.toLowerCase().replace(' ', '-');
            
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
                    <div class="word-stage ${stageClass}">${stage}</div>
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebJapaneseSRSApp();
});
