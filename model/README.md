# Spirole Fine-Tuned Patient Model

This directory contains configuration, adapters, and exports for a
fine-tuned version of Llama 3.1 8B trained to simulate realistic patients
in Spirole training scenarios.

## What this model does

In the Spirole roleplay pipeline, a language model plays the **patient or
customer** — not the associate. The associate (the learner) drives the
conversation. The model responds as a realistic person: briefly, naturally,
without coaching, and without breaking character.

This fine-tuned model is intended to eventually replace the Claude API call
in the Bubble roleplay pipeline. The base Claude model works well but is
expensive per-session and requires API access. A locally hosted fine-tuned
Llama model running via a lightweight inference server gives the same
conversational behavior at a fraction of the cost per session.

## Fine-tuning approach

**Base model:** Llama 3.1 8B Instruct (via Unsloth)  
**Method:** QLoRA — 4-bit quantized base weights + low-rank adapter layers  
**Hardware:** NVIDIA RTX 5050 (8GB GDDR7)  
**Training objective:** Response-only SFT — loss is computed only on patient
turns, not associate turns. The model learns to respond like a patient, not
to predict associate behavior.

### Why QLoRA

Fine-tuning the full 8B model requires ~80GB of GPU memory. QLoRA reduces
this to ~6GB by keeping the base weights frozen and quantized while training
small adapter matrices. The adapters (saved in `adapters/`) are typically
2–20MB, not 16GB. At inference, the adapters are merged back into the
quantized base weights.

### LoRA configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Rank (`r`) | 16 | Expressive enough for conversational style without overfitting on small data |
| Alpha | 32 | 2× rank — standard scaling |
| Target modules | q, k, v, o projections + gate/up/down FFN | Covers both attention style and vocabulary generation |
| Quantization | 4-bit (NF4) | Fits comfortably in 8GB VRAM with room for activations |
| Optimizer | AdamW 8-bit | Reduces optimizer memory ~4× vs full-precision Adam |
| Gradient checkpointing | Unsloth | Cuts activation memory ~30%, Unsloth's custom CUDA kernel |

## Data format

### Input transcripts

Transcripts go in `datasets/transcripts/`. Two formats are supported:

**Plain text (`.txt`)**
```
Associate: Hello, I'm going to be taking your retinal images today.
Customer: Okay.
Associate: Have you had this type of imaging done before?
Customer: No, I don't think so.
```

Add an optional companion file `<name>.scores.json` with evaluation scores:
```json
{
  "objective_completion": 7,
  "empathy": 6,
  "product_knowledge": 8,
  "communication_clarity": 7,
  "confidence": 8,
  "total_score": 36
}
```

**JSON (`.json`)** — preferred for structured sessions from the Bubble app:
```json
{
  "scenario_id": "optomap_guidance_neutral_patient_001",
  "transcript": [
    {"role": "Associate", "text": "Hello, I'm going to be taking your retinal images today."},
    {"role": "Customer", "text": "Okay."}
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
```

The `scenario_id` links to an existing scenario file in
`engines/roleplay/scenarios/` which provides the system prompt context
(patient persona, emotional state, background, hidden facts).

### Formatted training data (generated)

Running `format_transcripts.py` produces:

**`datasets/training/sft_data.jsonl`** — ShareGPT format, one example per line:
```json
{
  "conversations": [
    {"from": "system", "value": "You are acting as a realistic patient...\n\nActive scenario:\n..."},
    {"from": "human", "value": "Hello, I'm going to be taking your retinal images today."},
    {"from": "gpt", "value": "Okay."},
    {"from": "human", "value": "Have you had this done before?"},
    {"from": "gpt", "value": "No, I don't think so."}
  ],
  "metadata": {
    "scenario_id": "optomap_guidance_neutral_patient_001",
    "source_file": "session_001.json",
    "total_score": 36
  }
}
```

**`datasets/training/rlhf_pairs.jsonl`** — DPO/preference pairs (optional):
```json
{
  "prompt": [{"from": "system", "value": "..."}, {"from": "human", "value": "..."}],
  "chosen": "Okay.",
  "rejected": "Hmm, well let me think, I guess I'm not sure what this machine does exactly.",
  "scenario_id": "optomap_guidance_neutral_patient_001",
  "chosen_score": 42,
  "rejected_score": 18
}
```

RLHF pairs are built by pairing the highest- and lowest-scoring sessions
on the same scenario. They are not used in the current SFT run but are
saved for a future DPO pass.

## Usage

### Step 1 — Install dependencies

```bash
pip install unsloth datasets pyyaml

# For CUDA 12.1 (RTX 5050):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### Step 2 — Add transcripts

Drop `.txt` or `.json` transcript files into `datasets/transcripts/`.

### Step 3 — Format data

```bash
python scripts/format_transcripts.py
# With RLHF pairs:
python scripts/format_transcripts.py --rlhf
# Only include high-quality sessions:
python scripts/format_transcripts.py --min-score 30
```

### Step 4 — Train

```bash
# Full run (200 steps by default, adjust max_steps in qlora.yaml)
python scripts/train.py

# Smoke test (5 steps to confirm everything loads)
python scripts/train.py --max-steps 5
```

Adapters are saved to `model/adapters/final/` when training completes.
Intermediate checkpoints are saved every 50 steps.

### Step 5 — Evaluate

```bash
# Run a scripted evaluation conversation
python scripts/evaluate.py

# Compare fine-tuned vs base model side-by-side
python scripts/evaluate.py --compare-base

# Evaluate across all built-in test scenarios
python scripts/evaluate.py --all-scenarios
```

## Directory structure

```
model/
  configs/
    base_model.yaml     — Model selection, paths, hardware settings
    qlora.yaml          — QLoRA hyperparameters and training config
  adapters/             — LoRA adapter weights (written by train.py)
    final/              — Best checkpoint after full training run
    checkpoint-N/       — Intermediate checkpoints saved every 50 steps
  exports/              — Merged full-precision model (optional export)
  README.md             — This file

scripts/
  format_transcripts.py — Converts raw transcripts to SFT training data
  train.py              — QLoRA fine-tuning via Unsloth
  evaluate.py           — Runs scripted eval conversations + character checks

datasets/
  transcripts/          — Raw session transcripts (.txt or .json)
  training/
    sft_data.jsonl      — Formatted SFT examples (generated)
    rlhf_pairs.jsonl    — Preference pairs for DPO (generated, optional)
```

## Replacing the Claude API in Bubble

The current Bubble pipeline makes a Claude API call on each patient turn,
passing the roleplay system prompt + scenario + conversation history.

Once the fine-tuned model is ready, replace that call with a local
inference endpoint:

1. **Export** the merged model:
   ```python
   model.save_pretrained_merged("model/exports/spirole-patient-v1", tokenizer)
   ```

2. **Serve** it with `llama.cpp` (GGUF) or `vLLM`:
   ```bash
   # GGUF (low-memory, runs on RTX 5050)
   python -m llama_cpp.server --model model/exports/spirole-patient-v1.gguf --port 8080
   ```

3. **Update Bubble** to POST to `http://localhost:8080/v1/chat/completions`
   using the same OpenAI-compatible format Claude's API uses. The only
   change needed in Bubble is the endpoint URL and model name.

The system prompt structure stays identical — the fine-tuned model was
trained on the same prompt format Bubble already sends to Claude.

## Notes on data volume

QLoRA fine-tuning on conversational style works well with relatively few
examples. Rough guidance:

| Examples | Expected outcome |
|----------|-----------------|
| 20–50 | Style transfer begins; model sounds more patient-like |
| 100–200 | Reliable character consistency across most scenarios |
| 500+ | Strong generalization to new scenarios |

Early runs with small data (20–50 sessions) are still useful for validating
the pipeline and confirming the model can stay in character. Increase
`max_steps` in `qlora.yaml` as more transcripts are added.
