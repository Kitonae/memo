# Japanese SRS App Features

## Core Features

### 1. Spaced Repetition System (SRS)
- **WaniKani-style levels**: Apprentice 1-4, Guru 1-2, Master, Enlightened, Burned
- **Automatic scheduling**: Words reappear based on your performance
- **Progress tracking**: Individual word progress saved to `user_data.json`

### 2. Multiple Study Modes
- **Review Mode**: Standard SRS reviews that affect your progress
- **Debug Mode**: Practice without affecting SRS timing (button in top-right)
- **Browse Mode**: View all vocabulary with current SRS levels

### 3. Translation System
- **Multiple valid answers**: Many words accept several correct translations
- **Contextual descriptions**: Parenthetical information provides context but isn't required
  - Example: "I (male)" - answering just "I" is correct
  - Descriptions help distinguish usage (formal/casual, male/female, etc.)

### 4. User Interface
- **Dashboard**: Shows review counts and statistics
- **Review Interface**: Clean, focused study environment
- **Browse View**: Searchable vocabulary list with SRS levels
- **Progress Indicators**: Visual feedback on answer correctness

## Technical Details

### Data Structure
- `words.json`: 93 Japanese words with furigana and translations
- `user_data.json`: Individual progress tracking
- Translation format supports both simple strings and objects with descriptions

### Application Architecture
- **Electron Desktop App**: Cross-platform compatibility
- **Node.js Backend**: File operations and SRS logic
- **Vanilla JavaScript Frontend**: Fast, lightweight UI
- **JSON Data Storage**: Simple, readable format

## Usage Tips

1. **Starting Out**: All words begin as "New" and need initial review
2. **Debug Mode**: Use the "Debug" button to practice without affecting timing
3. **Multiple Answers**: Try different translations - many words have several correct answers
4. **Context Clues**: Pay attention to descriptions in parentheses for usage context
5. **Consistency**: Regular daily reviews are most effective for retention

## Data Migration

The app includes scripts to convert CSV data to the proper JSON format:
- `convert_csv.py`: Convert basic CSV to JSON
- `separate_descriptions.py`: Extract contextual descriptions from translations

## Future Enhancements

- Audio pronunciation support
- Kanji stroke order practice
- Custom vocabulary import
- Statistics and progress analytics
- Deck management for different topics
