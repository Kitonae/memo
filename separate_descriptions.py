import json
import re

def separate_descriptions_from_translations():
    try:
        # Load current words
        with open('words.json', 'r', encoding='utf-8') as f:
            words = json.load(f)
        
        updated_words = []
        changes_made = []
        
        for word in words:
            updated_translations = []
            
            for translation in word['translations']:
                # Extract content in parentheses as description
                # Pattern: matches text followed by parentheses content
                match = re.match(r'^(.*?)\s*\(([^)]+)\)$', translation.strip())
                
                if match:
                    main_translation = match.group(1).strip()
                    description = match.group(2).strip()
                    
                    updated_translations.append({
                        "text": main_translation,
                        "description": description
                    })
                    
                    changes_made.append({
                        "kanji": word['kanji'],
                        "original": translation,
                        "main": main_translation,
                        "description": description
                    })
                else:
                    # No parentheses, keep as simple text
                    updated_translations.append({
                        "text": translation.strip(),
                        "description": None
                    })
            
            # Update the word structure
            updated_word = {
                "kanji": word['kanji'],
                "furigana": word['furigana'],
                "translations": updated_translations
            }
            
            updated_words.append(updated_word)
        
        # Save updated words
        with open('words.json', 'w', encoding='utf-8') as f:
            json.dump(updated_words, f, ensure_ascii=False, indent=4)
        
        print(f"Updated {len(updated_words)} words")
        print(f"Found {len(changes_made)} translations with descriptions:")
        
        for change in changes_made:
            print(f"  {change['kanji']}: '{change['original']}' → '{change['main']}' + ({change['description']})")
        
        return len(changes_made)
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 0

if __name__ == "__main__":
    changes = separate_descriptions_from_translations()
    print(f"\nTotal changes made: {changes}")
