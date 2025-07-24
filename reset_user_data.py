import json
from datetime import datetime

def reset_user_data():
    # Load all words
    with open('words.json', 'r', encoding='utf-8') as f:
        all_words = json.load(f)
    
    # Create fresh user data with all words ready for review
    user_data = []
    now = datetime.now()
    
    for word in all_words:
        user_data.append({
            "kanji": word['kanji'],
            "stage": "Apprentice 1",
            "next_review": now.isoformat()  # Make all words available for review now
        })
    
    # Save the reset user data
    with open('user_data.json', 'w', encoding='utf-8') as f:
        json.dump(user_data, f, ensure_ascii=False, indent=4)
    
    print(f"Reset user data with {len(user_data)} words, all ready for review!")
    print("Updated to support multiple translations format")

if __name__ == "__main__":
    reset_user_data()
