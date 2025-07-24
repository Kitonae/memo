import json
import re

def update_words_with_multiple_translations():
    # Load current words
    with open('words.json', 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    updated_words = []
    changes_made = []
    
    for word in words:
        translation = word['translation']
        
        # Check if translation contains multiple options separated by '/' or ','
        if '/' in translation or ',' in translation:
            # Split by both '/' and ',' and clean up
            translations = re.split(r'[/,]', translation)
            translations = [t.strip() for t in translations if t.strip()]
            
            # Remove duplicates while preserving order
            unique_translations = []
            for t in translations:
                if t not in unique_translations:
                    unique_translations.append(t)
            
            # Update the word structure
            updated_word = {
                "kanji": word['kanji'],
                "furigana": word['furigana'],
                "translations": unique_translations  # Changed from 'translation' to 'translations' (array)
            }
            
            changes_made.append({
                "kanji": word['kanji'],
                "original": translation,
                "new": unique_translations
            })
        else:
            # Keep single translation as array for consistency
            updated_word = {
                "kanji": word['kanji'],
                "furigana": word['furigana'],
                "translations": [translation]  # Single translation as array
            }
        
        updated_words.append(updated_word)
    
    # Save updated words
    with open('words.json', 'w', encoding='utf-8') as f:
        json.dump(updated_words, f, ensure_ascii=False, indent=4)
    
    print(f"Updated {len(updated_words)} words")
    print(f"Found {len(changes_made)} words with multiple translations:")
    
    for change in changes_made:
        print(f"  {change['kanji']}: '{change['original']}' → {change['new']}")
    
    return len(changes_made)

if __name__ == "__main__":
    changes = update_words_with_multiple_translations()
    print(f"\nTotal changes made: {changes}")
