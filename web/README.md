# Japanese SRS - Web Version

A web-based Japanese Spaced Repetition System (SRS) that can be hosted on GitHub Pages.

## 🌐 Live Demo

**[Try it here: https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/web/](https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/web/)**

## Features

### ✅ Full SRS System
- **WaniKani-style levels**: Apprentice 1-4, Guru 1-2, Master, Enlightened, Burned
- **Automatic scheduling**: Words reappear based on your performance
- **Progress tracking**: Saved locally in your browser using localStorage

### ✅ Multiple Study Modes
- **Review Mode**: Standard SRS reviews that affect your progress
- **Debug Mode**: Practice without affecting SRS timing
- **Browse Mode**: View all vocabulary with current SRS levels

### ✅ Enhanced Input System
- **Type to answer**: Enter your translation and press Enter for instant validation
- **Immediate feedback**: Get ✓ Correct or ✗ Incorrect feedback with explanations
- **Multiple valid answers**: Accepts any correct translation
- **Contextual descriptions**: Shows usage context (formal/casual, male/female, etc.)

### ✅ Modern Web Interface
- **Responsive design**: Works on desktop, tablet, and mobile
- **Keyboard shortcuts**: Space to focus input, 1/2 for final decisions
- **Visual progress tracking**: Progress bars and statistics
- **Search functionality**: Find words in browse mode

## Data Storage

This web version uses **localStorage** to save your progress locally in your browser:
- ✅ **No server required** - works entirely offline after loading
- ✅ **Private data** - your progress stays on your device
- ⚠️ **Browser-specific** - progress won't sync between different browsers/devices
- ⚠️ **Clearing browser data** will reset your progress

## Hosting on GitHub Pages

### 1. Fork or Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Enable GitHub Pages
1. Go to your repository settings
2. Scroll to "Pages" section
3. Select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

### 3. Access Your App
Your app will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/web/`

## Local Development

To test locally, simply open `index.html` in a modern web browser, or serve it using a local server:

```bash
# Using Python
cd web
python -m http.server 8000

# Using Node.js
npx serve .

# Then visit http://localhost:8000
```

## File Structure

```
web/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling
├── app.js             # Web app logic (localStorage-based)
├── data.js            # Embedded vocabulary data
└── README.md          # This file
```

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Focus answer input |
| `Enter` | Submit typed answer |
| `1` | Mark as incorrect |
| `2` | Mark as correct |
| `Escape` | Return to dashboard |

## Data Format

The vocabulary includes 93 Japanese words with:
- **Kanji**: The Japanese character(s)
- **Furigana**: Reading in hiragana
- **Translations**: Multiple valid English translations
- **Descriptions**: Context like "(male)", "(casual)", "(formal)"

Example:
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

## Differences from Desktop Version

| Feature | Desktop (Electron) | Web Version |
|---------|-------------------|-------------|
| Data Storage | JSON files | localStorage |
| Offline Usage | ✅ Full | ✅ After first load |
| Cross-device Sync | ❌ | ❌ |
| Auto-updates | ✅ | Manual |
| File Import | ✅ | ❌ |

## Contributing

The web version shares the same vocabulary data and core logic as the desktop Electron app. To contribute:

1. Make changes to vocabulary in `words.json`
2. Run conversion script to update web data: `node -e "console.log('const VOCABULARY_DATA = ' + JSON.stringify(require('./words.json'), null, 2) + ';')" > web/data.js`
3. Test in both desktop and web versions

## License

Same as the main project - open source for educational use.
