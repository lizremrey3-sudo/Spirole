"""
Spirole Fine-Tuning Script
QLoRA on Llama 3 8B — fits in 8GB VRAM
Trains on roleplay + coaching data from Bubble session logs
"""

import json
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

# ── Config ────────────────────────────────────────────────────────────────────
BASE_MODEL   = "meta-llama/Meta-Llama-3-8B-Instruct"
ROLEPLAY_DATA = "datasets/cleaned/roleplay_training.jsonl"
COACHING_DATA = "datasets/cleaned/coaching_training.jsonl"
OUTPUT_DIR   = "model/spirole-llama3-qlora"
MAX_SEQ_LEN  = 512

SYSTEM_ROLEPLAY = (
    "You are an AI playing the role of a patient or customer in an optical retail setting. "
    "Respond naturally as a customer would — ask questions, express concerns, react to the "
    "associate's responses. Stay in character throughout the conversation."
)

SYSTEM_COACHING = (
    "You are Spirole Coach, an expert leadership coach for optical retail practice managers. "
    "Use a Socratic approach — ask thoughtful questions, help managers discover insights "
    "themselves rather than giving direct answers. Be warm, professional, and encouraging."
)

# ── Load Data ─────────────────────────────────────────────────────────────────
def load_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]

def format_example(example):
    system = SYSTEM_COACHING if example["type"] == "coaching" else SYSTEM_ROLEPLAY
    return {
        "text": (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n{system}"
            f"<|eot_id|><|start_header_id|>user<|end_header_id|>\n{example['instruction']}"
            f"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n{example['response']}"
            f"<|eot_id|>"
        )
    }

print("Loading training data...")
roleplay = load_jsonl(ROLEPLAY_DATA)
coaching = load_jsonl(COACHING_DATA)
all_examples = roleplay + coaching
print(f"Total examples: {len(all_examples)} ({len(roleplay)} roleplay, {len(coaching)} coaching)")

dataset = Dataset.from_list([format_example(e) for e in all_examples])
dataset = dataset.train_test_split(test_size=0.1, seed=42)
print(f"Train: {len(dataset['train'])} | Eval: {len(dataset['test'])}")

# ── Load Model (4-bit QLoRA) ───────────────────────────────────────────────────
print("Loading model in 4-bit...")
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    quantization_config=bnb_config,
    device_map="auto",
)
model = prepare_model_for_kbit_training(model)

# ── LoRA Config ────────────────────────────────────────────────────────────────
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ── Training ───────────────────────────────────────────────────────────────────
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=10,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
    args=training_args,
)

print("Starting training...")
trainer.train()

print(f"Saving model to {OUTPUT_DIR}...")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print("Done!")
