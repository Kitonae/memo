#!/usr/bin/env python3
"""
Convert N5 vocabulary from TSV format to JSON format and merge with existing vocabulary.
"""

import json
import re
from typing import List, Dict, Any

def parse_n5_vocab(file_path: str) -> List[Dict[str, Any]]:
    """Parse the N5 vocabulary TSV file and convert to our JSON format."""
    vocab_entries = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Skip the header line
    for line in lines[1:]:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        # Split by tab
        parts = line.split('\t')
        if len(parts) < 5:
            continue
            
        # Extract fields
        index = parts[0]
        kana = parts[1]
        kanji = parts[2] if parts[2] else kana  # Use kana if no kanji
        word_type = parts[3]
        definitions = parts[4]
        
        # Skip if no real content
        if not kana or not definitions:
            continue
            
        # Parse definitions - split by comma and clean up
        definition_list = [d.strip() for d in definitions.split(',')]
        
        # Create translations array
        translations = []
        for definition in definition_list:
            # Remove type annotations like (hon), (hum), etc.
            clean_def = re.sub(r'\([^)]*\)', '', definition).strip()
            if clean_def:
                # Check if original had annotations
                annotation_match = re.search(r'\(([^)]*)\)', definition)
                description = annotation_match.group(1) if annotation_match else None
                
                translations.append({
                    "text": clean_def,
                    "description": description
                })
        
        # Skip entries without valid translations
        if not translations:
            continue
            
        # Create vocabulary entry
        vocab_entry = {
            "kanji": kanji,
            "furigana": kana,
            "translations": translations
        }
        
        vocab_entries.append(vocab_entry)
    
    return vocab_entries

def load_existing_vocab(file_path: str) -> List[Dict[str, Any]]:
    """Load existing vocabulary from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def merge_vocabulary(existing: List[Dict[str, Any]], new: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge new vocabulary with existing, avoiding duplicates."""
    # Create a set of existing kanji for quick lookup
    existing_kanji = {entry['kanji'] for entry in existing}
    
    # Add new entries that don't already exist
    merged = existing.copy()
    added_count = 0
    
    for new_entry in new:
        if new_entry['kanji'] not in existing_kanji:
            merged.append(new_entry)
            existing_kanji.add(new_entry['kanji'])
            added_count += 1
    
    print(f"Added {added_count} new vocabulary entries")
    print(f"Total vocabulary entries: {len(merged)}")
    
    return merged

def save_json_vocab(vocab: List[Dict[str, Any]], file_path: str):
    """Save vocabulary to JSON file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

def generate_web_data(vocab: List[Dict[str, Any]], file_path: str):
    """Generate the web data.js file."""
    from datetime import datetime
    
    content = f"""// Auto-generated from words.json
// Generated: {datetime.utcnow().isoformat()}Z
// Words: {len(vocab)}

const VOCABULARY_DATA = {json.dumps(vocab, ensure_ascii=False, indent=2)};

// For Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = VOCABULARY_DATA;
}}
"""
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    # File paths
    n5_file = 'n5_vocab.txt'
    words_json = 'words.json'
    web_data_js = 'web/data.js'
    
    print("Converting N5 vocabulary...")
    
    # Parse N5 vocabulary
    n5_vocab = parse_n5_vocab(n5_file)
    print(f"Parsed {len(n5_vocab)} entries from N5 vocabulary")
    
    # Load existing vocabulary
    existing_vocab = load_existing_vocab(words_json)
    print(f"Loaded {len(existing_vocab)} existing vocabulary entries")
    
    # Merge vocabularies
    merged_vocab = merge_vocabulary(existing_vocab, n5_vocab)
    
    # Save updated vocabulary
    save_json_vocab(merged_vocab, words_json)
    print(f"Saved updated vocabulary to {words_json}")
    
    # Generate web data file
    generate_web_data(merged_vocab, web_data_js)
    print(f"Generated web data file at {web_data_js}")
    
    print("\nVocabulary update complete!")

if __name__ == '__main__':
    main()
