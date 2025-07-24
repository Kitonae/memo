class JapaneseSRSApp {
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

    async loadInitialData() {
        try {
            [this.stats, this.allWords] = await Promise.all([
                window.electronAPI.getStats(),
                window.electronAPI.getAllWords()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        this.currentView = viewName;

        // Load view-specific data
        if (viewName === 'dashboard') {
            this.renderDashboard();
        } else if (viewName === 'browse') {
            this.renderBrowse();
        } else if (viewName === 'debug') {
            this.renderDebug();
        }
    }

    async renderDashboard() {
        try {
            this.stats = await window.electronAPI.getStats();
            
            // Update review count
            document.getElementById('review-count').textContent = this.stats.reviewCount || 0;
            document.getElementById('total-words').textContent = this.stats.totalWords || 0;

            // Enable/disable review button
            const startReviewBtn = document.getElementById('start-review');
            if (this.stats.reviewCount > 0) {
                startReviewBtn.disabled = false;
                startReviewBtn.textContent = 'Start Reviewing';
            } else {
                startReviewBtn.disabled = true;
                startReviewBtn.textContent = 'No Reviews Available';
            }

            // Update progress bars
            this.updateProgressBars();
        } catch (error) {
            console.error('Error rendering dashboard:', error);
        }
    }

    updateProgressBars() {
        const totalWords = this.stats.totalWords || 1;
        
        const stages = [
            { name: 'apprentice', stages: ['Apprentice 1', 'Apprentice 2', 'Apprentice 3', 'Apprentice 4'] },
            { name: 'guru', stages: ['Guru 1', 'Guru 2'] },
            { name: 'master', stages: ['Master'] },
            { name: 'enlightened', stages: ['Enlightened'] },
            { name: 'burned', stages: ['Burned'] }
        ];

        stages.forEach(({ name, stages: stageList }) => {
            const count = stageList.reduce((sum, stage) => sum + (this.stats[stage] || 0), 0);
            const percentage = totalWords > 0 ? (count / totalWords) * 100 : 0;
            
            document.getElementById(`${name}-count`).textContent = count;
            document.getElementById(`${name}-progress`).style.width = `${percentage}%`;
        });
    }

    async startReview() {
        try {
            this.reviewWords = await window.electronAPI.getReviewWords();
            
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
            const result = await window.electronAPI.checkTranslation(word.kanji, userAnswer);
            
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
            await window.electronAPI.updateWord(word.kanji, correct, false); // false = not debug mode
            
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

    renderBrowse() {
        this.filterWords('');
    }

    filterWords(searchTerm) {
        const wordGrid = document.getElementById('word-grid');
        const filteredWords = this.allWords.filter(word => {
            // Search in kanji and furigana
            if (word.kanji.toLowerCase().includes(searchTerm.toLowerCase()) ||
                word.furigana.toLowerCase().includes(searchTerm.toLowerCase())) {
                return true;
            }
            
            // Search in translations (both text and full display)
            if (word.translation && word.translation.toLowerCase().includes(searchTerm.toLowerCase())) {
                return true;
            }
            
            // Search in individual translation texts
            if (word.translations) {
                return word.translations.some(t => {
                    if (typeof t === 'object' && t.text) {
                        return t.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
                    }
                    return t.toLowerCase().includes(searchTerm.toLowerCase());
                });
            }
            
            return false;
        });

        wordGrid.innerHTML = filteredWords.map(word => {
            let translationHtml;
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
                
                translationHtml = `
                    <div class="translation-options">
                        ${translationOptions}
                    </div>
                `;
            } else {
                translationHtml = `<div class="translation">${word.translation}</div>`;
            }
            
            return `
                <div class="word-card">
                    <div class="kanji">${word.kanji}</div>
                    <div class="furigana">${word.furigana}</div>
                    ${translationHtml}
                </div>
            `;
        }).join('');
    }

    // Debug Mode Methods
    renderDebug() {
        // Reset debug state when entering debug view
        document.getElementById('debug-card').style.display = 'none';
        document.getElementById('debug-complete').style.display = 'none';
        this.isDebugMode = false;
    }

    async startDebugSession() {
        try {
            const count = parseInt(document.getElementById('debug-count').value);
            this.debugWords = await window.electronAPI.getDebugWords(count);
            
            if (this.debugWords.length === 0) {
                return;
            }

            this.currentDebugIndex = 0;
            this.isDebugMode = true;
            this.showCurrentDebugWord();
            
            // Show the debug card
            document.getElementById('debug-card').style.display = 'flex';
            document.getElementById('debug-complete').style.display = 'none';
        } catch (error) {
            console.error('Error starting debug session:', error);
        }
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
            const result = await window.electronAPI.checkTranslation(word.kanji, userAnswer);
            
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
            await window.electronAPI.updateWord(word.kanji, correct, true);
            
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JapaneseSRSApp();
});
