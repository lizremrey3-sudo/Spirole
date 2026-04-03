"""
train.py
--------
Fine-tunes Llama 3.1 8B on Spirole patient conversation data using
Unsloth + QLoRA. Saves LoRA adapters to model/adapters/.

REQUIREMENTS
------------
  pip install unsloth
  pip install datasets pyyaml

  Unsloth installs torch, transformers, trl, and peft as dependencies.

USAGE
-----
  # Full training run
  python scripts/train.py

  # Override config paths
  python scripts/train.py --model-config model/configs/base_model.yaml \
                          --lora-config model/configs/qlora.yaml

  # Quick smoke test (5 steps)
  python scripts/train.py --max-steps 5

  # Resume from checkpoint
  python scripts/train.py --resume model/adapters/checkpoint-100

WHAT THIS DOES
--------------
1. Loads Llama 3.1 8B in 4-bit via Unsloth (fast kernel + VRAM savings)
2. Applies QLoRA adapters to attention + FFN layers
3. Loads sft_data.jsonl and formats it with the Llama 3.1 chat template
4. Trains with response-only loss (only Customer turns contribute to loss)
5. Saves the LoRA adapters to model/adapters/
"""

import argparse
import json
import os
import sys
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_MODEL_CONFIG = PROJECT_ROOT / "model" / "configs" / "base_model.yaml"
DEFAULT_LORA_CONFIG = PROJECT_ROOT / "model" / "configs" / "qlora.yaml"


def load_config(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------

def load_sft_dataset(sft_path: Path, eval_split: float = 0.1):
    """
    Load sft_data.jsonl and return a Hugging Face DatasetDict with
    train/test splits. Each row has a "conversations" key in ShareGPT format.
    """
    from datasets import Dataset, DatasetDict

    examples = []
    with open(sft_path) as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))

    if not examples:
        raise ValueError(f"No training examples found in {sft_path}")

    print(f"Loaded {len(examples)} training examples from {sft_path}")

    dataset = Dataset.from_list(examples)

    # Train/eval split
    split = dataset.train_test_split(test_size=eval_split, seed=42)
    print(f"  Train: {len(split['train'])} | Eval: {len(split['test'])}")
    return split


# ---------------------------------------------------------------------------
# Main training function
# ---------------------------------------------------------------------------

def train(
    model_config: dict,
    lora_config: dict,
    max_steps_override: int | None = None,
    resume_from: str | None = None,
):
    # Lazy imports — only load unsloth/torch if actually training
    try:
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template, train_on_responses_only
    except ImportError:
        print(
            "Unsloth not installed. Run:\n"
            "  pip install unsloth\n"
            "Or see https://github.com/unslothai/unsloth for CUDA-specific install."
        )
        sys.exit(1)

    from trl import SFTTrainer, SFTConfig
    from datasets import DatasetDict

    mc = model_config
    lc = lora_config

    # ---------------------------------------------------------------------------
    # 1. Load base model
    # ---------------------------------------------------------------------------

    model_name = mc["model"]["name"]
    max_seq_length = mc["model"]["max_seq_length"]
    load_in_4bit = mc["model"]["load_in_4bit"]

    print(f"\nLoading model: {model_name}")
    print(f"  max_seq_length={max_seq_length}, 4-bit={load_in_4bit}")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=mc["model"]["dtype"],
        load_in_4bit=load_in_4bit,
    )

    # ---------------------------------------------------------------------------
    # 2. Apply QLoRA adapters
    # ---------------------------------------------------------------------------

    lora = lc["lora"]
    print(f"\nApplying LoRA: rank={lora['r']}, alpha={lora['lora_alpha']}")
    print(f"  Target modules: {lora['target_modules']}")

    model = FastLanguageModel.get_peft_model(
        model,
        r=lora["r"],
        target_modules=lora["target_modules"],
        lora_alpha=lora["lora_alpha"],
        lora_dropout=lora["lora_dropout"],
        bias=lora["bias"],
        use_gradient_checkpointing=lora["use_gradient_checkpointing"],
        random_state=lora["random_state"],
        use_rslora=lora["use_rslora"],
        loftq_config=lora["loftq_config"],
    )

    # ---------------------------------------------------------------------------
    # 3. Apply Llama 3.1 chat template
    # ---------------------------------------------------------------------------

    tokenizer = get_chat_template(tokenizer, chat_template="llama-3.1")

    def apply_template(examples):
        """Apply the chat template to a batch of ShareGPT-format examples."""
        texts = []
        for convs in examples["conversations"]:
            # Convert ShareGPT {"from": ..., "value": ...} to HF messages format
            messages = []
            for turn in convs:
                role_map = {"system": "system", "human": "user", "gpt": "assistant"}
                role = role_map.get(turn["from"], turn["from"])
                messages.append({"role": role, "content": turn["value"]})

            text = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=False,
            )
            texts.append(text)
        return {"text": texts}

    # ---------------------------------------------------------------------------
    # 4. Load and format dataset
    # ---------------------------------------------------------------------------

    sft_path = PROJECT_ROOT / mc["paths"]["sft_data"]
    if not sft_path.exists():
        print(f"\nSFT data not found at {sft_path}")
        print("Run format_transcripts.py first:\n  python scripts/format_transcripts.py")
        sys.exit(1)

    eval_split = lc["evaluation"]["eval_split"]
    dataset_split = load_sft_dataset(sft_path, eval_split=eval_split)

    print("\nFormatting dataset with Llama 3.1 chat template...")
    train_dataset = dataset_split["train"].map(
        apply_template, batched=True, remove_columns=dataset_split["train"].column_names
    )
    eval_dataset = dataset_split["test"].map(
        apply_template, batched=True, remove_columns=dataset_split["test"].column_names
    )

    # ---------------------------------------------------------------------------
    # 5. Configure trainer
    # ---------------------------------------------------------------------------

    tc = lc["training"]
    output_dir = str(PROJECT_ROOT / tc["output_dir"])
    os.makedirs(output_dir, exist_ok=True)

    max_steps = max_steps_override if max_steps_override is not None else tc["max_steps"]

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        args=SFTConfig(
            dataset_text_field="text",
            max_seq_length=max_seq_length,
            dataset_num_proc=2,
            packing=lc["training"]["packing"],
            per_device_train_batch_size=tc["per_device_train_batch_size"],
            gradient_accumulation_steps=tc["gradient_accumulation_steps"],
            warmup_steps=tc["warmup_steps"],
            max_steps=max_steps,
            learning_rate=tc["learning_rate"],
            fp16=mc["hardware"]["fp16"],
            bf16=mc["hardware"]["bf16"],
            logging_steps=tc["logging_steps"],
            optim=tc["optim"],
            weight_decay=tc["weight_decay"],
            lr_scheduler_type=tc["lr_scheduler_type"],
            seed=tc["seed"],
            output_dir=output_dir,
            save_strategy=tc["save_strategy"],
            save_steps=tc["save_steps"],
            save_total_limit=tc["save_total_limit"],
            eval_strategy="steps",
            eval_steps=lc["evaluation"]["eval_steps"],
            report_to="none",  # Set to "wandb" or "tensorboard" to enable logging
        ),
    )

    # ---------------------------------------------------------------------------
    # 6. Response-only training
    #    Loss is computed only on Customer (assistant) tokens, not Associate prompts.
    #    This is the key training signal: learn to respond like a patient.
    # ---------------------------------------------------------------------------

    if lc["training"]["train_on_responses_only"]:
        print("\nEnabling response-only training (loss on Customer turns only)")
        trainer = train_on_responses_only(
            trainer,
            instruction_part=lc["training"]["instruction_part"],
            response_part=lc["training"]["response_part"],
        )

    # ---------------------------------------------------------------------------
    # 7. Train
    # ---------------------------------------------------------------------------

    print(f"\nStarting training: {max_steps} steps")
    print(f"  Effective batch size: "
          f"{tc['per_device_train_batch_size'] * tc['gradient_accumulation_steps']}")
    print(f"  Output: {output_dir}\n")

    trainer_stats = trainer.train(resume_from_checkpoint=resume_from)

    print(f"\nTraining complete.")
    print(f"  Runtime: {trainer_stats.metrics.get('train_runtime', 0):.1f}s")
    print(f"  Final loss: {trainer_stats.metrics.get('train_loss', 0):.4f}")

    # ---------------------------------------------------------------------------
    # 8. Save final adapters
    # ---------------------------------------------------------------------------

    final_adapter_path = Path(output_dir) / "final"
    model.save_pretrained(str(final_adapter_path))
    tokenizer.save_pretrained(str(final_adapter_path))
    print(f"\nLoRA adapters saved to: {final_adapter_path}")

    return model, tokenizer


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune Llama 3.1 8B on Spirole patient conversation data."
    )
    parser.add_argument(
        "--model-config",
        type=Path,
        default=DEFAULT_MODEL_CONFIG,
        help="Path to base_model.yaml",
    )
    parser.add_argument(
        "--lora-config",
        type=Path,
        default=DEFAULT_LORA_CONFIG,
        help="Path to qlora.yaml",
    )
    parser.add_argument(
        "--max-steps",
        type=int,
        default=None,
        help="Override max_steps from config (useful for smoke tests)",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Path to a checkpoint directory to resume training from",
    )
    args = parser.parse_args()

    model_config = load_config(args.model_config)
    lora_config = load_config(args.lora_config)

    train(
        model_config=model_config,
        lora_config=lora_config,
        max_steps_override=args.max_steps,
        resume_from=args.resume,
    )


if __name__ == "__main__":
    main()
