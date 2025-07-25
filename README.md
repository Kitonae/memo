# Japanese SRS - Electron App

A modern desktop application for learning Japanese vocabulary using the Spaced Repetition System (SRS).

## Features

- **Smart Dashboard**: View your learning progress and statistics with next review timing
- **Randomized Reviews**: Review cards are shuffled for better learning retention
- **SRS-Based Scheduling**: Intelligent spaced repetition system for optimal learning
- **Multiple Translations**: Words with multiple valid meanings are supported
- **Practice Mode**: Practice without affecting SRS progress
- **Word Dictionary**: Browse and search through your vocabulary
- **Progress Tracking**: Track your learning across different SRS stages
- **Keyboard Shortcuts**: Efficient review with keyboard shortcuts
- **Next Review Timer**: See exactly when your next review batch will be available

## SRS Stages

1. 🌱 **Apprentice 1-4**: Items you're actively learning
2. 🎓 **Guru 1-2**: Items you're getting comfortable with
3. 👑 **Master**: Items you know well
4. ✨ **Enlightened**: Items you've mastered
5. 🔥 **Burned**: Items permanently learned

## Review Schedule

- **New**: Immediately available for first-time study
- **Apprentice 1**: 4 hours
- **Apprentice 2**: 8 hours
- **Apprentice 3**: 1 day
- **Apprentice 4**: 2 days
- **Guru 1**: 1 week
- **Guru 2**: 2 weeks
- **Master**: 4 weeks
- **Enlightened**: 16 weeks
- **Burned**: No more reviews needed

## Review Experience

- **Randomized Order**: Review cards are shuffled each session to prevent pattern memorization
- **Smart Timing**: Dashboard shows when your next review batch becomes available
- **Progressive Learning**: New words are introduced gradually based on your current workload

## Keyboard Shortcuts (Review Mode)

- **Spacebar**: Focus answer input or show answer
- **Enter**: Submit your typed answer
- **1**: Mark incorrect (when answer is visible)
- **2**: Mark correct (when answer is visible)
- **Arrow Left/Right**: Mark incorrect/correct (when answer is visible)
- **Escape**: Return to dashboard

## Getting Started

### Desktop Version (Electron)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. Build for distribution:
   ```bash
   npm run build
   ```

### Web Version

The application also includes a web version that can be accessed directly in your browser:

1. Navigate to the `web/` directory
2. Open `index.html` in your browser
3. Your progress is automatically saved locally using browser storage

## Data Format

The application now supports multiple valid translations with contextual descriptions:

```json
{
    "kanji": "僕",
    "furigana": "boku", 
    "translations": [
        {
            "text": "I",
            "description": "male"
        }
    ]
}
```

**Translation Validation**: Only the main `text` is used for answer validation. Descriptions in parentheses provide context but are not required for correct answers.

**Display Format**: Descriptions are shown as `I (male)` but answering just "I" is sufficient for a correct response.

## Project Structure

### Desktop App (Electron)
- `src/main.js` - Electron main process
- `src/preload.js` - Preload script for secure IPC
- `src/index.html` - Main application UI
- `src/styles.css` - Application styling
- `src/app.js` - Frontend JavaScript logic

### Web App
- `web/index.html` - Web version UI
- `web/styles.css` - Web-specific styling
- `web/app.js` - Web application logic
- `web/data.js` - Vocabulary data for web version

### Shared Data
- `words.json` - Japanese vocabulary database
- `user_data.json` - User progress and SRS data (desktop only)

## Data Migration

This application is ported from the original Python version and maintains compatibility with existing user data. Your `user_data.json` and `words.json` files will work seamlessly with the new Electron interface.

## Development

The application uses modern web technologies within Electron:
- Vanilla JavaScript (no frameworks for simplicity)
- CSS Grid and Flexbox for responsive layout
- IPC (Inter-Process Communication) for secure data handling (desktop version)
- File-based JSON storage for desktop, localStorage for web
- Fisher-Yates shuffle algorithm for randomized reviews
- Real-time next review calculations

## Recent Improvements

- **Randomized Review Cards**: Each review session now shuffles cards to prevent memorization patterns
- **Next Review Timer**: Dashboard displays exactly when your next review batch will be available
- **Enhanced UI**: Improved visual feedback and animations
- **Dual Platform**: Both desktop (Electron) and web versions available

## Contributing

Feel free to contribute improvements, new features, or bug fixes!
