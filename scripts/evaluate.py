"""
evaluate.py
-----------
Runs a sample conversation through the fine-tuned Spirole patient model
and compares its output style to the expected patient behavior.

This is a qualitative + lightweight quantitative evaluation — not a
full benchmark. The goal is to confirm:
  1. The model stays in character as the patient
  2. Responses are appropriately brief and conversational
  3. The model doesn't coach, explain, or break character
  4. Response style matches the scenario's emotional tone

USAGE
-----
  # Evaluate the final saved adapter
  python scripts/evaluate.py

  # Use a specific checkpoint
  python scripts/evaluate.py --adapter model/adapters/checkpoint-100

  # Evaluate against a specific scenario
  python scripts/evaluate.py --scenario optomap_guidance_neutral_patient_001

  # Compare fine-tuned vs base model side-by-side
  python scripts/evaluate.py --compare-base

  # Run all built-in test conversations
  python scripts/evaluate.py --all-scenarios

OUTPUT
------
Prints the conversation to stdout. Each response is tagged with
character check flags:
  [OK]     — response looks appropriate
  [WARN]   — potential issue detected (too long, coaching detected, etc.)
"""

import argparse
import json
import sys
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_ADAPTER = PROJECT_ROOT / "model" / "adapters" / "final"
DEFAULT_MODEL_CONFIG = PROJECT_ROOT / "model" / "configs" / "base_model.yaml"
SCENARIOS_DIR = PROJECT_ROOT / "engines" / "roleplay" / "scenarios"
SYSTEM_PROMPT_FILE = PROJECT_ROOT / "engines" / "roleplay" / "system_prompt.txt"


# ---------------------------------------------------------------------------
# Built-in test conversations
# These mirror realistic Associate inputs the model will encounter.
# ---------------------------------------------------------------------------

TEST_CONVERSATIONS = {
    "optomap_guidance_neutral_patient_001": [
        "Hi there, I'm going to be taking your retinal images today.",
        "Have you had this type of imaging done before?",
        "Great. I'm going to have you look into this camera here. Can you put your chin on the rest and your forehead against the bar?",
        "Perfect. Now I need you to look straight at the green dot you see inside.",
        "Okay, I'm going to take the image now — try to keep your eye wide open.",
        "Actually I'm going to need to take that one again — can you open your eye a little wider?",
    ],
    "blurry_progressives": [
        "Hi, what's going on with your glasses today?",
        "And when did you pick these up?",
        "Have you worn progressives before?",
        "The blurriness — is it when you're reading or looking far away?",
        "Let me take a look at how they're sitting on your face.",
    ],
    "upset_bill_patient": [
        "Hi, I see you have a concern about your bill?",
        "I understand that's frustrating. Can you tell me which charge you're looking at?",
        "That charge is for the medical exam — that's billed separately from the vision exam.",
        "I know that's not what you were expecting. Let me pull up your insurance breakdown.",
    ],
}

# What we're checking for in patient responses
CHARACTER_CHECKS = {
    "coaching_phrases": [
        "you should", "you need to", "make sure you", "remember to",
        "the correct way", "what you did", "try to", "i would recommend",
        "as a technician", "you're doing great", "good job",
    ],
    "breaking_character": [
        "as an ai", "as a language model", "i'm playing", "in this scenario",
        "the scenario says", "according to my instructions",
    ],
    "overly_long": 80,  # Flag responses longer than 80 words
}


# ---------------------------------------------------------------------------
# Response quality checks
# ---------------------------------------------------------------------------

def check_response(response: str) -> list[str]:
    """Return a list of warnings for a patient response."""
    warnings = []
    response_lower = response.lower()

    for phrase in CHARACTER_CHECKS["coaching_phrases"]:
        if phrase in response_lower:
            warnings.append(f"possible coaching language: '{phrase}'")

    for phrase in CHARACTER_CHECKS["breaking_character"]:
        if phrase in response_lower:
            warnings.append(f"possible character break: '{phrase}'")

    word_count = len(response.split())
    if word_count > CHARACTER_CHECKS["overly_long"]:
        warnings.append(f"response too long ({word_count} words — patient should be brief)")

    if response.strip().endswith("?") and response.count("?") > 1:
        warnings.append("patient asking multiple questions (unusual)")

    return warnings


# ---------------------------------------------------------------------------
# Load model
# ---------------------------------------------------------------------------

def load_model(adapter_path: Path, model_config: dict):
    """Load the fine-tuned model from LoRA adapters."""
    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
    except ImportError:
        print("Unsloth not installed. Run: pip install unsloth")
        sys.exit(1)

    mc = model_config
    model_name = mc["model"]["name"]
    max_seq_length = mc["model"]["max_seq_length"]

    if adapter_path.exists():
        print(f"Loading fine-tuned model from: {adapter_path}")
        load_target = str(adapter_path)
    else:
        print(f"No adapter found at {adapter_path} — loading base model only")
        load_target = model_name

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=load_target,
        max_seq_length=max_seq_length,
        dtype=mc["model"]["dtype"],
        load_in_4bit=mc["model"]["load_in_4bit"],
    )
    FastLanguageModel.for_inference(model)
    tokenizer = get_chat_template(tokenizer, chat_template="llama-3.1")

    return model, tokenizer


def load_base_model(model_config: dict):
    """Load the base model (no fine-tuning) for comparison."""
    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
    except ImportError:
        print("Unsloth not installed.")
        sys.exit(1)

    mc = model_config
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=mc["model"]["name"],
        max_seq_length=mc["model"]["max_seq_length"],
        dtype=mc["model"]["dtype"],
        load_in_4bit=mc["model"]["load_in_4bit"],
    )
    FastLanguageModel.for_inference(model)
    tokenizer = get_chat_template(tokenizer, chat_template="llama-3.1")
    return model, tokenizer


# ---------------------------------------------------------------------------
# System prompt helpers
# ---------------------------------------------------------------------------

def load_system_prompt_with_scenario(scenario_id: str) -> str:
    base = SYSTEM_PROMPT_FILE.read_text().strip()
    scenario_file = SCENARIOS_DIR / f"{scenario_id}.json"
    if not scenario_file.exists():
        return base

    with open(scenario_file) as f:
        scenario = json.load(f)

    lines = [f"Scenario: {scenario.get('title', scenario_id)}"]
    persona = scenario.get("persona", {})
    if persona.get("emotional_state"):
        lines.append(f"Patient emotional state: {persona['emotional_state']}")
    if persona.get("communication_style"):
        lines.append(f"Communication style: {persona['communication_style']}")

    bg = scenario.get("background", {})
    if bg.get("chief_concern"):
        lines.append(f"Patient situation: {bg['chief_concern']}")

    opening = scenario.get("patient_opening_line", "")
    if opening:
        lines.append(f'Your opening line: "{opening}"')

    return base + "\n\nActive scenario:\n" + "\n".join(lines)


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def generate_response(
    model,
    tokenizer,
    messages: list[dict],
    max_new_tokens: int = 150,
) -> str:
    """Generate the next patient response given conversation history."""
    import torch

    input_ids = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(model.device)

    with torch.no_grad():
        output_ids = model.generate(
            input_ids,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.1,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode only the newly generated tokens
    new_tokens = output_ids[0][input_ids.shape[-1]:]
    response = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return response


# ---------------------------------------------------------------------------
# Run evaluation conversation
# ---------------------------------------------------------------------------

def run_conversation(
    model,
    tokenizer,
    scenario_id: str,
    associate_turns: list[str],
    label: str = "Fine-tuned",
) -> list[dict]:
    """
    Run a scripted evaluation conversation.
    Returns list of {"associate": ..., "patient": ..., "warnings": [...]} dicts.
    """
    system_prompt = load_system_prompt_with_scenario(scenario_id)
    messages = [{"role": "system", "content": system_prompt}]
    results = []

    print(f"\n{'='*60}")
    print(f"  Scenario: {scenario_id}")
    print(f"  Model: {label}")
    print(f"{'='*60}")

    for associate_turn in associate_turns:
        messages.append({"role": "user", "content": associate_turn})

        print(f"\nAssociate: {associate_turn}")

        response = generate_response(model, tokenizer, messages)
        warnings = check_response(response)

        status = "[WARN]" if warnings else "[OK]"
        print(f"Patient {status}: {response}")

        if warnings:
            for w in warnings:
                print(f"  ⚠️  {w}")

        # Add patient response to conversation history
        messages.append({"role": "assistant", "content": response})

        results.append({
            "associate": associate_turn,
            "patient": response,
            "warnings": warnings,
        })

    return results


# ---------------------------------------------------------------------------
# Summary stats
# ---------------------------------------------------------------------------

def print_summary(results: list[dict], label: str):
    total = len(results)
    warned = sum(1 for r in results if r["warnings"])
    avg_words = sum(len(r["patient"].split()) for r in results) / max(total, 1)

    print(f"\n{'='*60}")
    print(f"Summary ({label})")
    print(f"  Turns: {total}")
    print(f"  With warnings: {warned}/{total}")
    print(f"  Avg response length: {avg_words:.1f} words")
    print(f"  (Target: <20 words for a cooperative neutral patient)")
    print(f"{'='*60}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate fine-tuned Spirole patient model."
    )
    parser.add_argument(
        "--adapter",
        type=Path,
        default=DEFAULT_ADAPTER,
        help="Path to LoRA adapter directory (default: model/adapters/final)",
    )
    parser.add_argument(
        "--model-config",
        type=Path,
        default=DEFAULT_MODEL_CONFIG,
    )
    parser.add_argument(
        "--scenario",
        type=str,
        default="optomap_guidance_neutral_patient_001",
        help="Scenario ID to evaluate against",
    )
    parser.add_argument(
        "--compare-base",
        action="store_true",
        help="Also run the base model (no fine-tuning) for comparison",
    )
    parser.add_argument(
        "--all-scenarios",
        action="store_true",
        help="Run all built-in test conversations",
    )
    args = parser.parse_args()

    with open(args.model_config) as f:
        model_config = yaml.safe_load(f)

    # ---------------------------------------------------------------------------
    # Load fine-tuned model
    # ---------------------------------------------------------------------------

    ft_model, ft_tokenizer = load_model(args.adapter, model_config)

    # ---------------------------------------------------------------------------
    # Determine which scenarios to run
    # ---------------------------------------------------------------------------

    if args.all_scenarios:
        scenario_ids = list(TEST_CONVERSATIONS.keys())
    else:
        scenario_ids = [args.scenario]

    # ---------------------------------------------------------------------------
    # Load base model for comparison (optional)
    # ---------------------------------------------------------------------------

    base_model = base_tokenizer = None
    if args.compare_base:
        print("\nLoading base model for comparison...")
        base_model, base_tokenizer = load_base_model(model_config)

    # ---------------------------------------------------------------------------
    # Run evaluations
    # ---------------------------------------------------------------------------

    all_results = {}

    for scenario_id in scenario_ids:
        if scenario_id not in TEST_CONVERSATIONS:
            print(f"No test conversation defined for scenario: {scenario_id}")
            continue

        associate_turns = TEST_CONVERSATIONS[scenario_id]

        ft_results = run_conversation(
            ft_model, ft_tokenizer,
            scenario_id=scenario_id,
            associate_turns=associate_turns,
            label="Fine-tuned",
        )
        print_summary(ft_results, "Fine-tuned")

        if base_model is not None:
            base_results = run_conversation(
                base_model, base_tokenizer,
                scenario_id=scenario_id,
                associate_turns=associate_turns,
                label="Base (no fine-tuning)",
            )
            print_summary(base_results, "Base (no fine-tuning)")

            # Side-by-side diff
            print(f"\n{'='*60}")
            print("Turn-by-turn comparison:")
            for i, (ft, base) in enumerate(zip(ft_results, base_results)):
                print(f"\nTurn {i+1}:")
                print(f"  Associate: {ft['associate']}")
                print(f"  Fine-tuned: {ft['patient']}")
                print(f"  Base:       {base['patient']}")

        all_results[scenario_id] = ft_results

    # ---------------------------------------------------------------------------
    # Overall stats
    # ---------------------------------------------------------------------------

    total_turns = sum(len(r) for r in all_results.values())
    total_warned = sum(
        sum(1 for t in r if t["warnings"])
        for r in all_results.values()
    )
    print(f"\n{'='*60}")
    print(f"Overall evaluation: {total_turns} turns across {len(all_results)} scenario(s)")
    print(f"Turns with warnings: {total_warned}/{total_turns}")

    if total_warned == 0:
        print("All responses passed character checks.")
    else:
        print("Review warnings above — these indicate potential training issues.")


if __name__ == "__main__":
    main()
