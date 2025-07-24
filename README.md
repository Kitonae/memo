# Japanese SRS - Electron App

A modern desktop application for learning Japanese vocabulary using the Spaced Repetition System (SRS).

## Features

- **Dashboard**: View your learning progress and statistics
- **Review System**: Study words with SRS-based scheduling
- **Multiple Translations**: Words with multiple valid meanings are supported
- **Practice Mode**: Practice without affecting SRS progress
- **Word Dictionary**: Browse and search through your vocabulary
- **Progress Tracking**: Track your learning across different SRS stages
- **Keyboard Shortcuts**: Efficient review with keyboard shortcuts

## SRS Stages

1. 🌱 **Apprentice 1-4**: Items you're actively learning
2. 🎓 **Guru 1-2**: Items you're getting comfortable with
3. 👑 **Master**: Items you know well
4. ✨ **Enlightened**: Items you've mastered
5. 🔥 **Burned**: Items permanently learned

## Review Schedule

- **Apprentice 1**: 4 hours
- **Apprentice 2**: 8 hours
- **Apprentice 3**: 1 day
- **Apprentice 4**: 2 days
- **Guru 1**: 1 week
- **Guru 2**: 2 weeks
- **Master**: 4 weeks
- **Enlightened**: 16 weeks
- **Burned**: No more reviews needed

## Keyboard Shortcuts (Review Mode)

- **Spacebar**: Show answer
- **1**: Mark incorrect
- **2**: Mark correct
- **Escape**: Return to dashboard

## Getting Started

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

- `src/main.js` - Electron main process
- `src/preload.js` - Preload script for secure IPC
- `src/index.html` - Main application UI
- `src/styles.css` - Application styling
- `src/app.js` - Frontend JavaScript logic
- `words.json` - Japanese vocabulary database
- `user_data.json` - User progress and SRS data

## Data Migration

This application is ported from the original Python version and maintains compatibility with existing user data. Your `user_data.json` and `words.json` files will work seamlessly with the new Electron interface.

## Development

The application uses modern web technologies within Electron:
- Vanilla JavaScript (no frameworks for simplicity)
- CSS Grid and Flexbox for responsive layout
- IPC (Inter-Process Communication) for secure data handling
- File-based JSON storage for simplicity

## Contributing

Feel free to contribute improvements, new features, or bug fixes!
