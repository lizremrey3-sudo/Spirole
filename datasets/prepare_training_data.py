import csv
import json
from collections import defaultdict

INPUT = '/mnt/user-data/uploads/export_All-SessionMessages_2026-04-05_06-36-02.csv'
OUTPUT_ROLEPLAY = '/home/claude/roleplay_training.jsonl'
OUTPUT_COACH = '/home/claude/coaching_training.jsonl'

def is_english(text):
    """Simple heuristic — skip if too many non-ASCII chars"""
    non_ascii = sum(1 for c in text if ord(c) > 127)
    return non_ascii / max(len(text), 1) < 0.1

def is_junk(text):
    """Skip very short or test messages"""
    t = text.strip().lower()
    return len(t) < 5 or t in ['hi', 'hello', 'jo', 'hey', 'test', 'ok', 'yes', 'no']

# Load and group by session
sessions = defaultdict(list)
with open(INPUT) as f:
    reader = csv.DictReader(f)
    for row in reader:
        content = row['content'].strip()
        role = row['role'].strip()
        session = row['session'].strip()
        if content and role and session and is_english(content):
            sessions[session].append({'role': role, 'content': content})

# Separate roleplay vs coaching sessions
roleplay_examples = []
coaching_examples = []

for sid, messages in sessions.items():
    roles_in_session = set(m['role'] for m in messages)
    
    # Coaching session
    if 'Coach' in roles_in_session:
        pairs = []
        for i in range(len(messages) - 1):
            if messages[i]['role'] == 'user' and messages[i+1]['role'] == 'Coach':
                if not is_junk(messages[i]['content']):
                    pairs.append({
                        'instruction': messages[i]['content'],
                        'response': messages[i+1]['content'],
                        'type': 'coaching'
                    })
        coaching_examples.extend(pairs)

    # Roleplay session (user=associate, assistant=patient)
    elif 'user' in roles_in_session and 'assistant' in roles_in_session:
        # Build full conversation turns
        turns = []
        for i in range(len(messages) - 1):
            if messages[i]['role'] == 'user' and messages[i+1]['role'] == 'assistant':
                if not is_junk(messages[i]['content']):
                    turns.append({
                        'instruction': messages[i]['content'],
                        'response': messages[i+1]['content'],
                        'type': 'roleplay'
                    })
        roleplay_examples.extend(turns)

# Write outputs
with open(OUTPUT_ROLEPLAY, 'w') as f:
    for ex in roleplay_examples:
        f.write(json.dumps(ex) + '\n')

with open(OUTPUT_COACH, 'w') as f:
    for ex in coaching_examples:
        f.write(json.dumps(ex) + '\n')

print(f'Roleplay examples: {len(roleplay_examples)}')
print(f'Coaching examples: {len(coaching_examples)}')
print(f'\nSample roleplay:')
if roleplay_examples:
    ex = roleplay_examples[0]
    print(f"  USER: {ex['instruction'][:100]}")
    print(f"  ASSISTANT: {ex['response'][:100]}")
print(f'\nSample coaching:')
if coaching_examples:
    ex = coaching_examples[0]
    print(f"  USER: {ex['instruction'][:100]}")
    print(f"  COACH: {ex['response'][:100]}")
