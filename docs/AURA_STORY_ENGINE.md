# Aura Stories — Story Engine v1

## Goal
Aura should produce consistent mobile serial-fiction chapters without depending on a single giant prompt or copying the voice of a specific existing app, author, or copyrighted work.

The v1 stack is:

1. Aura narrative profiles (server-side)
2. Continuity context from the latest chapters
3. Strong generation protocol
4. Deterministic quality scoring
5. Conditional editor pass for weak drafts
6. Curated style corpus later (RAG)
7. Fine-tuning only after enough approved Aura-owned examples exist

## What to store in the corpus
Do not upload a random pile of full novels. Store short, licensed/owned/public-domain or internally generated examples with metadata.

Recommended record:

```json
{
  "id": "romance_slowburn_001",
  "profile": "romance",
  "genre": ["Romantik", "Dram"],
  "tone": ["slow-burn", "melancholic"],
  "sceneType": "confession-near-miss",
  "pov": "third-person-limited",
  "pace": "medium",
  "dialogueLevel": "medium",
  "excerpt": "300-700 words of approved Aura-owned prose",
  "editorNotes": [
    "emotion shown through action",
    "short mobile paragraphs",
    "ending opens a concrete dilemma"
  ],
  "qualityScore": 92,
  "enabled": true,
  "version": 1
}
```

## Firestore shape for RAG phase
Use server-only reads from:

`storyStyleLibraries/{profileId}`

Suggested document:

```json
{
  "profileId": "romance",
  "version": 1,
  "examples": [
    {
      "id": "slowburn_001",
      "sceneType": "tension",
      "excerpt": "...",
      "notes": ["subtext", "controlled imagery"]
    }
  ]
}
```

Keep each profile document compact. Retrieval should select only 1-3 short examples; never inject an entire library into the prompt.

## Copyright / provenance rule
Every corpus item needs a provenance field in the ingestion source of truth. Allowed categories:

- `aura-owned`
- `commissioned-with-rights`
- `licensed`
- `public-domain`
- `synthetic-approved`

Do not ingest copied chapters from current commercial fiction apps just to imitate their wording.

## Fine-tuning trigger
Do not fine-tune v1. Consider it only after Aura has roughly 300-1000 human-approved examples with stable tags and quality ratings.

Fine-tuning becomes useful when:

- prompt + retrieval still produces unstable voice,
- approved data reflects the exact target product voice,
- evaluation metrics exist,
- regressions can be measured against a held-out test set.

## Evaluation set
Maintain a fixed set of prompts across profiles:

- romance / slow-burn
- dark romance / danger
- thriller / reveal
- mystery / clue
- fantasy / discovery
- drama / relationship conflict
- dark academia / forbidden knowledge

For every release, compare:

- continuity errors
- repeated phrases
- paragraph count
- word count
- A/B choice similarity
- cliché frequency
- human rating for hook, character voice, and readability

## Current v1 implementation
- `functions/src/story-style.ts`: Aura style profiles
- `functions/src/prompts.ts`: generation protocol
- `functions/src/story-quality.ts`: deterministic scoring
- `functions/src/story-engine.ts`: primary generation + conditional editor pass
- `functions/src/story-quality.test.ts`: basic quality regression tests

The next backend milestone is server-side retrieval from the curated `storyStyleLibraries` corpus.
