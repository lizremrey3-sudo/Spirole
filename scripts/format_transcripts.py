"""
format_transcripts.py
---------------------
Converts raw Spirole session transcripts into training data for fine-tuning.

INPUT
-----
Transcript files in datasets/transcripts/
Each file is either:
  - A plain .txt file with alternating lines:
      Associate: Hello, I'll be helping you today.
      Customer: Okay.
      Associate: Have you had this done before?
      Customer: No, I don't think so.

  - A .json file with keys:
      {
        "scenario_id": "optomap_guidance_neutral_patient_001",
        "transcript": [
          {"role": "Associate", "text": "..."},
          {"role": "Customer", "text": "..."}
        ],
        "scores": {
          "objective_completion": 7,
          "empathy": 6,
          "product_knowledge": 8,
          "communication_clarity": 7,
          "confidence": 8,
          "total_score": 36
        }
      }

The scenario_id is used to look up the corresponding scenario file in
engines/roleplay/scenarios/ to pull the system prompt context.

OUTPUT
------
datasets/training/sft_data.jsonl
  One JSON object per line in ShareGPT format:
  {
    "conversations": [
      {"from": "system", "value": "<roleplay system prompt + scenario summary>"},
      {"from": "human", "value": "<Associate turn>"},
      {"from": "gpt", "value": "<Customer turn>"},
      ...
    ],
    "metadata": {
      "scenario_id": "...",
      "total_score": 36,
      "source_file": "..."
    }
  }

datasets/training/rlhf_pairs.jsonl  (optional, requires --rlhf flag)
  Chosen/rejected pairs for DPO/RLHF later. Pairs sessions on the same
  scenario where one scores higher than the other:
  {
    "prompt": [system + all turns up to the Customer response],
    "chosen": "<high-scoring Customer response>",
    "rejected": "<low-scoring Customer response>",
    "scenario_id": "...",
    "chosen_score": 38,
    "rejected_score": 21
  }

USAGE
-----
  python scripts/format_transcripts.py
  python scripts/format_transcripts.py --rlhf
  python scripts/format_transcripts.py --transcripts path/to/transcripts/ --output datasets/training/
  python scripts/format_transcripts.py --min-score 25  # Only include sessions scoring >= 25/50
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path


# ---------------------------------------------------------------------------
# Paths (relative to project root)
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
TRANSCRIPTS_DIR = PROJECT_ROOT / "datasets" / "transcripts"
SCENARIOS_DIR = PROJECT_ROOT / "engines" / "roleplay" / "scenarios"
SYSTEM_PROMPT_FILE = PROJECT_ROOT / "engines" / "roleplay" / "system_prompt.txt"
OUTPUT_DIR = PROJECT_ROOT / "datasets" / "training"

SCORE_FIELDS = [
    "objective_completion",
    "empathy",
    "product_knowledge",
    "communication_clarity",
    "confidence",
]


# ---------------------------------------------------------------------------
# Load the base roleplay system prompt
# ---------------------------------------------------------------------------

def load_system_prompt() -> str:
    """Load the base roleplay system prompt from engines/roleplay/system_prompt.txt."""
    if not SYSTEM_PROMPT_FILE.exists():
        raise FileNotFoundError(f"System prompt not found: {SYSTEM_PROMPT_FILE}")
    return SYSTEM_PROMPT_FILE.read_text().strip()


def load_scenario_context(scenario_id: str) -> str:
    """
    Load scenario-specific context to append to the system prompt.
    Returns a condensed summary of who the patient is and what their situation is.
    Falls back gracefully if no scenario file exists.
    """
    scenario_file = SCENARIOS_DIR / f"{scenario_id}.json"
    if not scenario_file.exists():
        return ""

    try:
        with open(scenario_file) as f:
            scenario = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  Warning: could not parse scenario file {scenario_file.name} ({e}) — using base prompt only", file=sys.stderr)
        return ""

    lines = []

    title = scenario.get("title", "")
    if title:
        lines.append(f"Scenario: {title}")

    persona = scenario.get("persona", {})
    if persona:
        age = persona.get("age_range", "")
        emotional = persona.get("emotional_state", "")
        style = persona.get("communication_style", "")
        if age:
            lines.append(f"Patient age: {age}")
        if emotional:
            lines.append(f"Emotional state: {emotional}")
        if style:
            lines.append(f"Communication style: {style}")

    background = scenario.get("background", {})
    concern = background.get("chief_concern", "")
    if concern:
        lines.append(f"Patient situation: {concern}")

    opening = scenario.get("patient_opening_line", "")
    if opening:
        lines.append(f'Your opening line: "{opening}"')

    hidden = scenario.get("hidden_facts", [])
    if hidden:
        lines.append("Behavioral notes:")
        for fact in hidden:
            lines.append(f"  - {fact}")

    if not lines:
        return ""

    return "\n\nActive scenario:\n" + "\n".join(lines)


def build_system_prompt(base_prompt: str, scenario_id: str) -> str:
    """Combine base system prompt with scenario-specific context."""
    context = load_scenario_context(scenario_id)
    return base_prompt + context


# ---------------------------------------------------------------------------
# Transcript parsers
# ---------------------------------------------------------------------------

def parse_txt_transcript(text: str) -> list[dict]:
    """
    Parse a plain-text transcript with lines like:
      Associate: Hello, I'll be helping you today.
      Customer: Okay.

    Returns a list of {"role": "Associate"|"Customer", "text": "..."} dicts.
    Handles multi-line turns by accumulating lines until the next role prefix.
    """
    turns = []
    current_role = None
    current_lines = []

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Match "Associate:" or "Customer:" at the start of a line
        match = re.match(r"^(Associate|Customer):\s*(.*)", line, re.IGNORECASE)
        if match:
            # Flush the previous turn
            if current_role is not None and current_lines:
                turns.append({
                    "role": current_role,
                    "text": " ".join(current_lines).strip()
                })
            current_role = match.group(1).capitalize()
            current_lines = [match.group(2)] if match.group(2) else []
        else:
            # Continuation of the current turn
            if current_role is not None:
                current_lines.append(line)

    # Flush the last turn
    if current_role is not None and current_lines:
        turns.append({
            "role": current_role,
            "text": " ".join(current_lines).strip()
        })

    return turns


def parse_json_transcript(data: dict) -> tuple[list[dict], dict, str]:
    """
    Parse a .json transcript file.
    Returns (turns, scores, scenario_id).
    """
    turns = data.get("transcript", [])
    scores = data.get("scores", {})
    scenario_id = data.get("scenario_id", "unknown")
    return turns, scores, scenario_id


def load_transcript_file(path: Path) -> tuple[list[dict], dict, str]:
    """
    Load a transcript file (.txt or .json).
    Returns (turns, scores, scenario_id).
    scores may be empty if the file is a plain .txt.
    scenario_id is inferred from filename if not in JSON.
    """
    scenario_id = path.stem  # filename without extension as fallback

    if path.suffix == ".json":
        with open(path) as f:
            data = json.load(f)
        turns, scores, sid = parse_json_transcript(data)
        if sid != "unknown":
            scenario_id = sid
        return turns, scores, scenario_id

    elif path.suffix == ".txt":
        text = path.read_text()
        turns = parse_txt_transcript(text)
        # Look for a companion .scores.json file
        scores_file = path.with_suffix(".scores.json")
        scores = {}
        if scores_file.exists():
            with open(scores_file) as f:
                scores = json.load(f)
        return turns, scores, scenario_id

    else:
        raise ValueError(f"Unsupported transcript format: {path.suffix}")


# ---------------------------------------------------------------------------
# SFT formatter
# ---------------------------------------------------------------------------

def turns_to_sharegpt(
    turns: list[dict],
    system_prompt: str,
) -> list[dict]:
    """
    Convert a list of {"role": "Associate"|"Customer", "text": "..."} turns
    into ShareGPT conversation format.

    The model is trained to be the Customer (patient), so:
      Associate → "human"
      Customer  → "gpt"

    The system prompt is always the first message.
    """
    conversations = [{"from": "system", "value": system_prompt}]

    for turn in turns:
        role = turn["role"].capitalize()
        text = turn["text"].strip()
        if not text:
            continue

        if role == "Associate":
            conversations.append({"from": "human", "value": text})
        elif role == "Customer":
            conversations.append({"from": "gpt", "value": text})
        else:
            # Unknown role — skip
            print(f"  Warning: unknown role '{role}', skipping turn", file=sys.stderr)

    return conversations


def compute_total_score(scores: dict) -> int:
    """Sum the five scored dimensions. Returns 0 if scores are missing."""
    return sum(scores.get(f, 0) for f in SCORE_FIELDS)


def format_sft_example(
    turns: list[dict],
    scores: dict,
    scenario_id: str,
    source_file: str,
    base_system_prompt: str,
) -> dict | None:
    """
    Build one SFT training example in ShareGPT format.
    Returns None if the transcript is too short to be useful (<2 turns).
    """
    if len(turns) < 2:
        return None

    system_prompt = build_system_prompt(base_system_prompt, scenario_id)
    conversations = turns_to_sharegpt(turns, system_prompt)

    # Must have at least one gpt turn to train on
    gpt_turns = [c for c in conversations if c["from"] == "gpt"]
    if not gpt_turns:
        return None

    total_score = scores.get("total_score") or compute_total_score(scores)

    return {
        "conversations": conversations,
        "metadata": {
            "scenario_id": scenario_id,
            "source_file": source_file,
            "total_score": total_score,
            "scores": scores,
        }
    }


# ---------------------------------------------------------------------------
# RLHF pair builder
# ---------------------------------------------------------------------------

def build_rlhf_pairs(
    examples: list[dict],
    score_gap: int = 10,
) -> list[dict]:
    """
    Build chosen/rejected pairs for DPO/RLHF training.

    Strategy:
    - Group examples by scenario_id
    - Within each group, pair the highest-scoring session with the
      lowest-scoring session (if score gap >= score_gap threshold)
    - Extract turn-by-turn pairs: for each Customer turn, the chosen
      response comes from the high-scoring session and the rejected
      response comes from the low-scoring session at the same turn index

    score_gap: minimum difference in total_score to form a pair (default 10/50)
    """
    pairs = []

    # Group by scenario
    by_scenario = defaultdict(list)
    for ex in examples:
        sid = ex["metadata"]["scenario_id"]
        by_scenario[sid].append(ex)

    for scenario_id, group in by_scenario.items():
        if len(group) < 2:
            continue

        # Sort by total score descending
        group.sort(key=lambda x: x["metadata"]["total_score"], reverse=True)
        best = group[0]
        worst = group[-1]

        best_score = best["metadata"]["total_score"]
        worst_score = worst["metadata"]["total_score"]

        if best_score - worst_score < score_gap:
            continue  # Not enough contrast for a useful preference pair

        # Extract Customer (gpt) turns from each session
        best_gpt = [c for c in best["conversations"] if c["from"] == "gpt"]
        worst_gpt = [c for c in worst["conversations"] if c["from"] == "gpt"]

        # Pair turn-by-turn (up to the shorter session's length)
        system_msg = next(
            (c["value"] for c in best["conversations"] if c["from"] == "system"),
            ""
        )

        # Build the prompt context up to each Customer turn
        best_turns = best["conversations"]
        for i, (chosen_turn, rejected_turn) in enumerate(
            zip(best_gpt, worst_gpt)
        ):
            # Find the position of this gpt turn in the full conversation
            gpt_positions = [
                idx for idx, c in enumerate(best_turns) if c["from"] == "gpt"
            ]
            if i >= len(gpt_positions):
                break
            pos = gpt_positions[i]

            # Prompt = everything before this gpt turn
            prompt_turns = best_turns[:pos]

            pairs.append({
                "prompt": prompt_turns,
                "chosen": chosen_turn["value"],
                "rejected": rejected_turn["value"],
                "scenario_id": scenario_id,
                "chosen_score": best_score,
                "rejected_score": worst_score,
                "turn_index": i,
            })

    return pairs


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Format Spirole transcripts into fine-tuning data."
    )
    parser.add_argument(
        "--transcripts",
        type=Path,
        default=TRANSCRIPTS_DIR,
        help="Directory containing transcript files (.txt or .json)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_DIR,
        help="Directory to write formatted training data",
    )
    parser.add_argument(
        "--rlhf",
        action="store_true",
        help="Also generate RLHF preference pairs (requires multiple sessions per scenario)",
    )
    parser.add_argument(
        "--min-score",
        type=int,
        default=0,
        help="Exclude sessions with total_score below this threshold (0-50)",
    )
    parser.add_argument(
        "--rlhf-gap",
        type=int,
        default=10,
        help="Minimum score gap between chosen/rejected pairs for RLHF (default 10)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse transcripts and print stats without writing files",
    )
    args = parser.parse_args()

    # Validate inputs
    if not args.transcripts.exists():
        print(f"Transcripts directory not found: {args.transcripts}")
        print("Create it and add .txt or .json transcript files to get started.")
        sys.exit(0)

    transcript_files = list(args.transcripts.glob("*.txt")) + list(
        args.transcripts.glob("*.json")
    )

    if not transcript_files:
        print(f"No .txt or .json transcript files found in {args.transcripts}")
        sys.exit(0)

    print(f"Found {len(transcript_files)} transcript file(s)")

    # Load base system prompt
    base_system_prompt = load_system_prompt()

    # Process each transcript
    examples = []
    skipped = 0

    for path in sorted(transcript_files):
        try:
            turns, scores, scenario_id = load_transcript_file(path)
        except Exception as e:
            print(f"  Error loading {path.name}: {e}", file=sys.stderr)
            skipped += 1
            continue

        example = format_sft_example(
            turns=turns,
            scores=scores,
            scenario_id=scenario_id,
            source_file=path.name,
            base_system_prompt=base_system_prompt,
        )

        if example is None:
            print(f"  Skipping {path.name}: too short or no Customer turns")
            skipped += 1
            continue

        total_score = example["metadata"]["total_score"]
        if total_score < args.min_score:
            print(f"  Skipping {path.name}: score {total_score} < min {args.min_score}")
            skipped += 1
            continue

        examples.append(example)
        n_turns = len([c for c in example["conversations"] if c["from"] in ("human", "gpt")])
        print(f"  OK: {path.name} | scenario={scenario_id} | turns={n_turns} | score={total_score}")

    print(f"\n{len(examples)} examples formatted, {skipped} skipped")

    if args.dry_run:
        print("\nDry run — no files written.")
        return

    if not examples:
        print("Nothing to write.")
        return

    # Write SFT data
    args.output.mkdir(parents=True, exist_ok=True)
    sft_path = args.output / "sft_data.jsonl"
    with open(sft_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
    print(f"SFT data written to: {sft_path}")

    # Write RLHF pairs
    if args.rlhf:
        pairs = build_rlhf_pairs(examples, score_gap=args.rlhf_gap)
        if pairs:
            rlhf_path = args.output / "rlhf_pairs.jsonl"
            with open(rlhf_path, "w") as f:
                for pair in pairs:
                    f.write(json.dumps(pair) + "\n")
            print(f"RLHF pairs written to: {rlhf_path} ({len(pairs)} pairs)")
        else:
            print(
                f"No RLHF pairs generated. "
                f"Need multiple sessions per scenario with score gap >= {args.rlhf_gap}."
            )

    # Summary stats
    scores = [ex["metadata"]["total_score"] for ex in examples]
    if scores:
        print(f"\nScore distribution:")
        print(f"  Min:  {min(scores)}")
        print(f"  Max:  {max(scores)}")
        print(f"  Mean: {sum(scores) / len(scores):.1f}")


if __name__ == "__main__":
    main()
