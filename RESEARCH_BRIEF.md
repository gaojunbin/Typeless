# Typeless Research and Planning Brief

Date: 2026-09-17
Status: Research, proposal assessment, and complete first-version implementation are authorized. The user requested autonomous progress while asleep, without further questions.

## Objective

Design an AI-enhanced dictation application that reproduces the important Typeless workflows, including toggle-to-talk using Fn, automatic transcript cleanup, personalization, and memory.

## Required capabilities

- Xiaomi MiMo ASR as the initial speech recognition provider, with a documented default base URL and a user-configured API key.
- Extensible ASR provider adapters, without assuming all providers implement OpenAI transcription endpoints.
- Configurable OpenAI-compatible text processing: user-supplied base URL, API key, and model identifier.
- First Fn tap starts recording; the next Fn tap stops it and begins transcription and cleanup.
- Preserve user meaning while removing filler words and handling self-corrections.
- User-visible, controllable personalization and memory.

## Working boundaries

- All project work and artifacts stay under this directory.
- Documentation and repository content use English; user-facing progress and delivery summaries use Chinese.
- Research public sources. Project-local build dependencies and implementation are now in scope. Do not use undisclosed credentials, purchase products, or change system settings. Keep caches and build artifacts inside the project.
- Clearly separate verified vendor documentation, independent experience reports, design proposals, and facts requiring hands-on validation.
- Launch macOS and Windows together, as explicitly confirmed by the user. Neither desktop platform is deferred to a later release.

## Independent work packages

1. Product research: official Typeless features, detailed workflows, onboarding, personalization, privacy, limitations, pricing/platform context, and independent user experience evidence. Output: `docs/research/typeless-product.md`.
2. Provider research: exact current MiMo ASR protocol, endpoint, model identifier, audio constraints, errors, limits, pricing/data policies if verifiable, and extensible ASR plus OpenAI-compatible text API design. Output: `docs/research/providers.md`.
3. Desktop architecture: macOS and Windows shortcut feasibility, permissions, audio capture, safe insertion across apps, UI states, memory design, stack comparison, technical risks, acceptance criteria, and synchronized delivery phases. Output: `docs/research/desktop-architecture.md`.

## Evidence and quality bar

Every external claim needs a direct source URL and an access date. Prefer primary sources, and use only primary sources for technical implementation claims. Do not fabricate testing results, undocumented provider support, or future implementation certainty. Flag contradictory claims and unresolved questions explicitly.

The final integrated proposal must connect research findings to product scope, architecture, provider contracts, state transitions, configuration, data lifecycle, privacy controls, delivery milestones, measurable acceptance, risks, and the user's original requirements.
